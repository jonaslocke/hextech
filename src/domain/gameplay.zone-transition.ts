import { ValidationError } from "../shared/errors";
import type { GameplayRuntime, PlayerZoneBuckets } from "./gameplay";
import {
  collectGameplayZoneInvariantViolations,
  resolveHiddenCapacityForBattlefield,
} from "./gameplay";

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

  const next = structuredClone(gameplay);
  const sourceBucket = resolveZoneBucket(next, input.source, false);
  const destinationBucket = resolveZoneBucket(next, input.destination, true);
  const sourceIndex = sourceBucket.findIndex((currentCardId) => currentCardId === cardId);

  if (sourceIndex < 0) {
    throw new ValidationError("Card is not present in the source zone.");
  }

  enforceDestinationRules(next, input);

  sourceBucket.splice(sourceIndex, 1);
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
): void {
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

  const destinationBucket = resolveZoneBucket(gameplay, destination, true);
  const maxHiddenCapacity = resolveHiddenCapacityForBattlefield(gameplay, battlefieldId);
  if (destinationBucket.length + 1 > maxHiddenCapacity) {
    throw new ValidationError(
      `Facedown zone capacity exceeded for battlefield (max: ${maxHiddenCapacity}).`,
    );
  }
}

function resolveZoneBucket(
  gameplay: GameplayRuntime,
  zoneRef: GameplayZoneRef,
  allowCreateFacedown: boolean,
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
        if (!allowCreateFacedown) {
          throw new ValidationError("Facedown zone for battlefield does not exist.");
        }

        gameplay.zones.shared.facedownByBattlefield[battlefieldId] = [];
        return gameplay.zones.shared.facedownByBattlefield[battlefieldId]!;
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
