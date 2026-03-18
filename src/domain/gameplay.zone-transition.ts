import { ValidationError } from "../shared/errors";
import type {
  CanonicalCardZone,
  GameplayRuntime,
  PlayerZoneBuckets,
  ZonePrivacy,
} from "./gameplay";
import {
  appendGameplayEvent,
  collectGameplayZoneInvariantViolations,
  resolveHiddenCapacityForBattlefield,
  ZONE_PRIVACY_BY_ZONE,
} from "./gameplay";
import {
  resolveConstraintBounds,
  type CardType,
  type ZonePolicy,
  type ZonePolicyId,
  ZONE_POLICY_LIST,
} from "./zone-policy";

type PlayerScopedZone = Exclude<keyof PlayerZoneBuckets, "base">;

export type GameplayZoneRef =
  | { kind: "player_zone"; playerId: string; zone: PlayerScopedZone }
  | { kind: "base_cards"; playerId: string }
  | { kind: "base_runes"; playerId: string }
  | { kind: "battlefield" }
  | { kind: "chain" }
  | { kind: "facedown"; battlefieldId: string };

export interface MoveCardBetweenZonesInput {
  cardId: string;
  source: GameplayZoneRef;
  destination: GameplayZoneRef;
  cardControllerId: string;
  cardType?: CardType;
  cardOwnerId?: string;
  battlefieldControllerById?: Record<string, string | null>;
}

export interface PlaceCardIntoZoneInput {
  cardId: string;
  destination: GameplayZoneRef;
  cardControllerId: string;
  cardType?: CardType;
  battlefieldControllerById?: Record<string, string | null>;
}

const ZONE_POLICY_BY_ID = new Map<ZonePolicyId, ZonePolicy>(
  ZONE_POLICY_LIST.map((policy) => [policy.id, policy]),
);

export function moveCardBetweenZones(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
): GameplayRuntime {
  const cardId = input.cardId.trim();
  const cardControllerId = input.cardControllerId.trim();

  if (!cardId) {
    throw new ValidationError("Card id is required for zone movement.");
  }

  if (!cardControllerId) {
    throw new ValidationError("Card controller id is required for zone movement.");
  }

  if (describeZoneRef(input.source) === describeZoneRef(input.destination)) {
    throw new ValidationError("Source and destination zones must be different.");
  }

  let next = structuredClone(gameplay);
  const sourceBucket = resolveZoneBucket(next, input.source);
  const destinationBucket = resolveZoneBucket(next, input.destination);
  const sourceIndex = sourceBucket.findIndex((currentCardId) => currentCardId === cardId);

  if (sourceIndex < 0) {
    throw new ValidationError("Card is not present in the source zone.");
  }

  enforceDestinationRules(next, input, destinationBucket);

  sourceBucket.splice(sourceIndex, 1);
  destinationBucket.push(cardId);
  next = syncKernelScaffoldingAfterZoneChange(next);
  next = appendZoneChangedEvent(next, input);
  next = appendRevealEventForFacedownToNonPublicMove(next, input);

  const invariantViolations = collectGameplayZoneInvariantViolations(next);
  if (invariantViolations.length > 0) {
    throw new ValidationError(invariantViolations[0]?.message ?? "Gameplay zone state invalid.");
  }

  return next;
}

function syncKernelScaffoldingAfterZoneChange(gameplay: GameplayRuntime): GameplayRuntime {
  const chainDepth = gameplay.zones.shared.chain.length;
  const chainState = chainDepth > 0 ? "open" : "idle";

  return {
    ...gameplay,
    kernel: {
      ...gameplay.kernel,
      chain: {
        ...gameplay.kernel.chain,
        state: chainState,
        depth: chainDepth,
      },
    },
  };
}

export function placeCardIntoZone(
  gameplay: GameplayRuntime,
  input: PlaceCardIntoZoneInput,
): GameplayRuntime {
  const cardId = input.cardId.trim();
  const cardControllerId = input.cardControllerId.trim();

  if (!cardId) {
    throw new ValidationError("Card id is required for zone placement.");
  }

  if (!cardControllerId) {
    throw new ValidationError("Card controller id is required for zone placement.");
  }

  const next = structuredClone(gameplay);

  if (isCardPresentInGameplay(next, cardId)) {
    throw new ValidationError("Card is already present in gameplay zones.");
  }

  const destinationBucket = resolveZoneBucket(next, input.destination);
  const destinationRulesInput: MoveCardBetweenZonesInput = {
    cardId,
    cardControllerId,
    ...(input.cardType ? { cardType: input.cardType } : {}),
    source: input.destination,
    destination: input.destination,
  };
  if (input.battlefieldControllerById) {
    destinationRulesInput.battlefieldControllerById =
      input.battlefieldControllerById;
  }
  enforceDestinationRules(next, destinationRulesInput, destinationBucket);

  destinationBucket.push(cardId);

  const invariantViolations = collectGameplayZoneInvariantViolations(next);
  if (invariantViolations.length > 0) {
    throw new ValidationError(invariantViolations[0]?.message ?? "Gameplay zone state invalid.");
  }

  return next;
}

function enforceDestinationRules(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
  destinationBucket: string[],
): void {
  enforceZonePolicyForDestination(input, destinationBucket);

  const { destination, cardControllerId } = input;

  if (
    (destination.kind === "base_cards" || destination.kind === "base_runes") &&
    destination.playerId !== cardControllerId
  ) {
    throw new ValidationError(
      "Cards or runes cannot be placed in another player's base.",
    );
  }

  if (destination.kind !== "facedown") {
    return;
  }

  const battlefieldId = destination.battlefieldId.trim();
  if (!battlefieldId) {
    throw new ValidationError("Battlefield id is required for facedown zone movement.");
  }

  const battlefieldControllerById = input.battlefieldControllerById;
  if (!battlefieldControllerById) {
    throw new ValidationError(
      "Battlefield controller map is required for facedown zone movement.",
    );
  }

  const battlefieldControllerId = battlefieldControllerById[battlefieldId] ?? null;
  if (battlefieldControllerId !== cardControllerId) {
    throw new ValidationError(
      "Only the controller of a battlefield may place or keep cards in its facedown zone.",
    );
  }

  const maxHiddenCapacity = resolveHiddenCapacityForBattlefield(gameplay, battlefieldId);
  if (destinationBucket.length + 1 > maxHiddenCapacity) {
    throw new ValidationError(
      `Facedown zone capacity exceeded for battlefield (max: ${maxHiddenCapacity}).`,
    );
  }
}

function enforceZonePolicyForDestination(
  input: MoveCardBetweenZonesInput,
  destinationBucket: string[],
): void {
  const zonePolicyId = toZonePolicyId(input.destination);
  const zonePolicy = ZONE_POLICY_BY_ID.get(zonePolicyId);

  if (!zonePolicy) {
    throw new ValidationError(`Missing zone policy for destination "${zonePolicyId}".`);
  }

  if (input.cardType) {
    if (zonePolicy.prohibitedCardTypes.includes(input.cardType)) {
      throw new ValidationError(
        `Card type "${input.cardType}" cannot be placed in zone "${zonePolicyId}".`,
      );
    }

    if (!zonePolicy.allowedCardTypes.includes(input.cardType)) {
      throw new ValidationError(
        `Card type "${input.cardType}" is not allowed in zone "${zonePolicyId}".`,
      );
    }
  }

  for (const constraint of zonePolicy.capacityConstraints) {
    if (constraint.scope !== "zone") {
      continue;
    }

    if (constraint.appliesToCardTypes || constraint.appliesToStateTags) {
      continue;
    }

    const bounds = resolveConstraintBounds(constraint, []);
    if (bounds.max === null) {
      continue;
    }

    if (destinationBucket.length + 1 > bounds.max) {
      throw new ValidationError(
        `Zone capacity exceeded for "${zonePolicyId}" (constraint: ${constraint.id}, max: ${bounds.max}).`,
      );
    }
  }
}

function resolveZoneBucket(
  gameplay: GameplayRuntime,
  zoneRef: GameplayZoneRef,
): string[] {
  switch (zoneRef.kind) {
    case "player_zone": {
      const playerZones = gameplay.zones.players[zoneRef.playerId];
      if (!playerZones) {
        throw new ValidationError("Player zone owner is not part of this gameplay state.");
      }

      return playerZones[zoneRef.zone];
    }
    case "base_cards": {
      const playerZones = gameplay.zones.players[zoneRef.playerId];
      if (!playerZones) {
        throw new ValidationError("Base owner is not part of this gameplay state.");
      }

      return playerZones.base.cards;
    }
    case "base_runes": {
      const playerZones = gameplay.zones.players[zoneRef.playerId];
      if (!playerZones) {
        throw new ValidationError("Base owner is not part of this gameplay state.");
      }

      return playerZones.base.runes;
    }
    case "battlefield":
      return gameplay.zones.shared.battlefield;
    case "chain":
      return gameplay.zones.shared.chain;
    case "facedown": {
      const battlefieldId = zoneRef.battlefieldId.trim();
      if (!battlefieldId) {
        throw new ValidationError("Battlefield id is required for facedown zones.");
      }

      const current = gameplay.zones.shared.facedownByBattlefield[battlefieldId];
      if (!current) {
        throw new ValidationError("Facedown zone for battlefield does not exist.");
      }

      return current;
    }
  }
}

function describeZoneRef(zoneRef: GameplayZoneRef): string {
  switch (zoneRef.kind) {
    case "player_zone":
      return `${zoneRef.kind}:${zoneRef.playerId}:${zoneRef.zone}`;
    case "base_cards":
    case "base_runes":
      return `${zoneRef.kind}:${zoneRef.playerId}`;
    case "battlefield":
    case "chain":
      return zoneRef.kind;
    case "facedown":
      return `${zoneRef.kind}:${zoneRef.battlefieldId}`;
  }
}

function appendRevealEventForFacedownToNonPublicMove(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
): GameplayRuntime {
  if (input.source.kind !== "facedown") {
    return gameplay;
  }

  const destinationPrivacy = resolveZoneRefPrivacy(input.destination);
  if (destinationPrivacy === "public") {
    return gameplay;
  }

  const rawOwnerId = input.cardOwnerId?.trim() ?? input.cardControllerId.trim();
  if (!rawOwnerId) {
    throw new ValidationError("Card owner id is required for facedown reveal events.");
  }

  if (!gameplay.zones.players[rawOwnerId]) {
    throw new ValidationError("Card owner is not part of this gameplay state.");
  }

  return appendGameplayEvent(gameplay, {
    type: "facedown_card_revealed",
    details: {
      reason: "move_to_non_public_zone",
      cardId: input.cardId.trim(),
      battlefieldId: input.source.battlefieldId,
      destination: describeZoneRef(input.destination),
      revealedByPlayerId: rawOwnerId,
    },
  });
}

function appendZoneChangedEvent(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
): GameplayRuntime {
  const details: Record<string, string> = {
    cardId: input.cardId.trim(),
    cardControllerId: input.cardControllerId.trim(),
    source: describeZoneRef(input.source),
    destination: describeZoneRef(input.destination),
  };

  if (input.cardType) {
    details.cardType = input.cardType;
  }

  if (input.cardOwnerId?.trim()) {
    details.cardOwnerId = input.cardOwnerId.trim();
  }

  return appendGameplayEvent(gameplay, {
    type: "zone_changed",
    details,
  });
}

function resolveZoneRefPrivacy(zoneRef: GameplayZoneRef): ZonePrivacy {
  const canonicalZone = toCanonicalZone(zoneRef);
  return ZONE_PRIVACY_BY_ZONE[canonicalZone];
}

function toZonePolicyId(zoneRef: GameplayZoneRef): ZonePolicyId {
  switch (zoneRef.kind) {
    case "player_zone":
      switch (zoneRef.zone) {
        case "mainDeck":
          return "main_deck";
        case "hand":
          return "hand";
        case "trash":
          return "trash";
        case "banishment":
          return "banishment";
        case "runeDeck":
          return "rune_deck";
        case "championZone":
          return "champion_zone";
        case "legendZone":
          return "legend_zone";
      }
    case "base_cards":
    case "base_runes":
      return "base";
    case "battlefield":
    case "facedown":
      return "battlefield";
    case "chain":
      return "chain";
  }
}

function toCanonicalZone(zoneRef: GameplayZoneRef): CanonicalCardZone {
  switch (zoneRef.kind) {
    case "player_zone":
      switch (zoneRef.zone) {
        case "mainDeck":
          return "main_deck";
        case "hand":
          return "hand";
        case "trash":
          return "trash";
        case "banishment":
          return "banishment";
        case "runeDeck":
          return "rune_deck";
        case "legendZone":
          return "legend_zone";
        case "championZone":
          return "champion_zone";
      }
    case "base_cards":
    case "base_runes":
      return "base";
    case "battlefield":
      return "battlefield";
    case "chain":
      return "chain";
    case "facedown":
      return "facedown";
  }
}

function isCardPresentInGameplay(gameplay: GameplayRuntime, cardId: string): boolean {
  for (const playerZones of Object.values(gameplay.zones.players)) {
    if (playerZones.mainDeck.includes(cardId)) {
      return true;
    }
    if (playerZones.hand.includes(cardId)) {
      return true;
    }
    if (playerZones.trash.includes(cardId)) {
      return true;
    }
    if (playerZones.banishment.includes(cardId)) {
      return true;
    }
    if (playerZones.runeDeck.includes(cardId)) {
      return true;
    }
    if (playerZones.championZone.includes(cardId)) {
      return true;
    }
    if (playerZones.legendZone.includes(cardId)) {
      return true;
    }
    if (playerZones.base.cards.includes(cardId)) {
      return true;
    }
    if (playerZones.base.runes.includes(cardId)) {
      return true;
    }
  }

  if (gameplay.zones.shared.battlefield.includes(cardId)) {
    return true;
  }
  if (gameplay.zones.shared.chain.includes(cardId)) {
    return true;
  }

  for (const cards of Object.values(gameplay.zones.shared.facedownByBattlefield)) {
    if (cards.includes(cardId)) {
      return true;
    }
  }

  return false;
}
