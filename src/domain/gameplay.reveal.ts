import { ValidationError } from "../shared/errors";
import { appendGameplayEvent, type GameplayRuntime } from "./gameplay";

export interface RevealFacedownCardsOnGameEndInput {
  cardOwnerById: Record<string, string>;
}

export interface RevealFacedownCardsOnGameEndResult {
  gameplay: GameplayRuntime;
  revealedCardIds: string[];
}

export function revealFacedownCardsOnGameEnd(
  gameplay: GameplayRuntime,
  input: RevealFacedownCardsOnGameEndInput,
): RevealFacedownCardsOnGameEndResult {
  let next = structuredClone(gameplay);
  const revealedCardIds: string[] = [];

  for (const [battlefieldId, cardIds] of Object.entries(
    next.zones.shared.facedownByBattlefield,
  )) {
    for (const cardId of cardIds) {
      const ownerId = input.cardOwnerById[cardId]?.trim();
      if (!ownerId) {
        throw new ValidationError("Card owner mapping is required for game-end reveal.");
      }

      if (!next.zones.players[ownerId]) {
        throw new ValidationError("Card owner is not part of this gameplay state.");
      }

      next = appendGameplayEvent(next, {
        type: "facedown_card_revealed",
        details: {
          reason: "game_end",
          cardId,
          battlefieldId,
          revealedByPlayerId: ownerId,
        },
      });
      revealedCardIds.push(cardId);
    }
  }

  return {
    gameplay: next,
    revealedCardIds,
  };
}
