import { ValidationError } from "../shared/errors";
import { moveCardBetweenZones } from "./gameplay.zone-transition";
import type { GameplayRuntime } from "./gameplay";

export interface HiddenCardCleanupInput {
  battlefieldControllerById: Record<string, string | null>;
  cardControllerById: Record<string, string>;
  cardOwnerById?: Record<string, string>;
}

export interface HiddenCardCleanupRemoval {
  cardId: string;
  battlefieldId: string;
  controllerId: string;
  ownerId: string;
}

export interface HiddenCardCleanupResult {
  gameplay: GameplayRuntime;
  removed: HiddenCardCleanupRemoval[];
}

export function cleanupHiddenCardsAfterControlChange(
  gameplay: GameplayRuntime,
  input: HiddenCardCleanupInput,
): HiddenCardCleanupResult {
  let next = structuredClone(gameplay);
  const removed: HiddenCardCleanupRemoval[] = [];

  for (const [battlefieldId, facedownCards] of Object.entries(
    next.zones.shared.facedownByBattlefield,
  )) {
    for (const cardId of [...facedownCards]) {
      const controllerId = input.cardControllerById[cardId]?.trim();
      if (!controllerId) {
        throw new ValidationError(
          "Card controller mapping is required for hidden cleanup.",
        );
      }

      const ownerId = (input.cardOwnerById?.[cardId] ?? controllerId)?.trim();
      if (!ownerId) {
        throw new ValidationError("Card owner mapping is required for hidden cleanup.");
      }

      if (!next.zones.players[ownerId]) {
        throw new ValidationError("Card owner is not part of this gameplay state.");
      }

      const battlefieldControllerId = input.battlefieldControllerById[battlefieldId] ?? null;

      if (battlefieldControllerId === controllerId) {
        continue;
      }

      next = moveCardBetweenZones(next, {
        cardId,
        cardControllerId: controllerId,
        source: { kind: "facedown", battlefieldId },
        destination: { kind: "player_zone", playerId: ownerId, zone: "trash" },
      });

      removed.push({
        cardId,
        battlefieldId,
        controllerId,
        ownerId,
      });
    }
  }

  return {
    gameplay: next,
    removed,
  };
}
