import { ValidationError } from "../shared/errors";
import type {
  GameplayPolicyModifier,
  GameplayRuntime,
  PlayerZoneBuckets,
} from "./gameplay";
import {
  type CardStateTag,
  type CardType,
  type CapacityModifier,
  type ZoneCapacityCheckInput,
  type ZonePolicyId,
  resolveZoneCapacityOverflow,
  resolveZonePolicyById,
  isCardTypeAllowedByPolicy,
  isCardTypeProhibitedByPolicy,
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
  battlefieldControllerById?: Record<string, string | null>;
}

export interface PlaceCardIntoZoneInput {
  cardId: string;
  destination: GameplayZoneRef;
  cardControllerId: string;
  cardType?: CardType;
  battlefieldControllerById?: Record<string, string | null>;
}

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
  ensureFacedownSlotForBattlefield(next, input.destination, cardId, input.cardType);

  return next;
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
    source: input.destination,
    destination: input.destination,
    ...(input.cardType ? { cardType: input.cardType } : {}),
    ...(input.battlefieldControllerById
      ? { battlefieldControllerById: input.battlefieldControllerById }
      : {}),
  };

  enforceDestinationRules(next, destinationRulesInput, destinationBucket);

  destinationBucket.push(cardId);
  ensureFacedownSlotForBattlefield(next, input.destination, cardId, input.cardType);

  return next;
}

function enforceDestinationRules(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
  destinationBucket: string[],
): void {
  enforceZonePolicyForDestination(gameplay, input, destinationBucket);

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
}

function enforceZonePolicyForDestination(
  gameplay: GameplayRuntime,
  input: MoveCardBetweenZonesInput,
  destinationBucket: string[],
): void {
  const zonePolicyId = toZonePolicyId(input.destination);
  const zonePolicy = resolveZonePolicyById(zonePolicyId);

  if (!zonePolicy) {
    throw new ValidationError(`Missing zone policy for destination "${zonePolicyId}".`);
  }

  const stateTags = resolveStateTagsForDestination(input.destination);

  if (input.cardType) {
    if (isCardTypeProhibitedByPolicy(zonePolicy, input.cardType)) {
      throw new ValidationError(
        `Card type "${input.cardType}" cannot be placed in zone "${zonePolicyId}".`,
      );
    }

    if (!isCardTypeAllowedByPolicy(zonePolicy, input.cardType)) {
      throw new ValidationError(
        `Card type "${input.cardType}" is not allowed in zone "${zonePolicyId}".`,
      );
    }
  }

  const overflowCheckInput: ZoneCapacityCheckInput = {
    stateTags,
    nextCount: destinationBucket.length + 1,
    isConstraintInScope: (constraint) =>
      !(constraint.scope === "per_location" && input.destination.kind !== "facedown"),
    resolveModifiers: (constraint) =>
      resolveCapacityModifiersForConstraint(
        gameplay,
        zonePolicyId,
        input.destination,
        constraint.id,
      ),
    ...(input.cardType !== undefined ? { cardType: input.cardType } : {}),
  };

  const overflow = resolveZoneCapacityOverflow(zonePolicy, overflowCheckInput);

  if (overflow) {
    throw new ValidationError(
      `Zone capacity exceeded for "${zonePolicyId}" (constraint: ${overflow.constraintId}, max: ${overflow.max}).`,
    );
  }
}

function resolveCapacityModifiersForConstraint(
  gameplay: GameplayRuntime,
  zonePolicyId: ZonePolicyId,
  destination: GameplayZoneRef,
  constraintId: string,
): CapacityModifier[] {
  const locationKey = resolveLocationKey(destination);
  const resolved: CapacityModifier[] = [];

  for (const entry of gameplay.policyModifiers) {
    if (!isApplicableCapacityPolicyModifier(
      entry,
      zonePolicyId,
      constraintId,
      locationKey,
    )) {
      continue;
    }

    resolved.push(entry.modifier);
  }

  return resolved;
}

function isApplicableCapacityPolicyModifier(
  entry: GameplayPolicyModifier,
  zonePolicyId: ZonePolicyId,
  constraintId: string,
  locationKey: string | null,
): boolean {
  if (entry.kind !== "capacity") {
    return false;
  }

  if (entry.zonePolicyId !== zonePolicyId || entry.constraintId !== constraintId) {
    return false;
  }

  if (!entry.locationKey) {
    return true;
  }

  return entry.locationKey === locationKey;
}

function resolveLocationKey(destination: GameplayZoneRef): string | null {
  if (destination.kind !== "facedown") {
    return null;
  }

  const battlefieldId = destination.battlefieldId.trim();
  if (!battlefieldId) {
    throw new ValidationError("Battlefield id is required for facedown zone movement.");
  }

  return battlefieldId;
}

function resolveStateTagsForDestination(zoneRef: GameplayZoneRef): CardStateTag[] {
  if (zoneRef.kind === "facedown") {
    return ["hidden"];
  }

  return [];
}

function ensureFacedownSlotForBattlefield(
  gameplay: GameplayRuntime,
  destination: GameplayZoneRef,
  cardId: string,
  cardType: CardType | undefined,
): void {
  if (destination.kind !== "battlefield") {
    return;
  }

  const normalizedCardId = cardId.trim();
  const isBattlefieldCard =
    cardType === "battlefield" || normalizedCardId.startsWith("setup:battlefield:");

  if (!isBattlefieldCard) {
    return;
  }

  if (!gameplay.zones.shared.battlefield.hiddenCardsByBattlefield[normalizedCardId]) {
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield[normalizedCardId] = [];
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
      return gameplay.zones.shared.battlefield.cards;
    case "chain":
      return gameplay.zones.shared.chain;
    case "facedown": {
      const battlefieldId = zoneRef.battlefieldId.trim();
      if (!battlefieldId) {
        throw new ValidationError("Battlefield id is required for facedown zones.");
      }

      const current = gameplay.zones.shared.battlefield.hiddenCardsByBattlefield[battlefieldId];
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

  if (gameplay.zones.shared.battlefield.cards.includes(cardId)) {
    return true;
  }
  if (gameplay.zones.shared.chain.includes(cardId)) {
    return true;
  }

  for (const cards of Object.values(gameplay.zones.shared.battlefield.hiddenCardsByBattlefield)) {
    if (cards.includes(cardId)) {
      return true;
    }
  }

  return false;
}
