import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ValidationError } from "../src/shared/errors.js";
import { createEmptyGameplayRuntime } from "../src/domain/gameplay.js";
import { revealFacedownCardsOnGameEnd } from "../src/domain/gameplay.reveal.js";

describe("Gameplay facedown reveal handling", () => {
  test("emits reveal events for all facedown cards when game ends", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];
    gameplay.zones.shared.facedownByBattlefield.bf_2 = ["card_hidden_002"];

    const result = revealFacedownCardsOnGameEnd(gameplay, {
      cardOwnerById: {
        card_hidden_001: "p1",
        card_hidden_002: "p2",
      },
    });

    assert.deepEqual(result.revealedCardIds, ["card_hidden_001", "card_hidden_002"]);
    assert.equal(result.gameplay.events.length, 2);
    assert.deepEqual(result.gameplay.events[0]?.details, {
      reason: "game_end",
      cardId: "card_hidden_001",
      battlefieldId: "bf_1",
      revealedByPlayerId: "p1",
    });
    assert.deepEqual(result.gameplay.events[1]?.details, {
      reason: "game_end",
      cardId: "card_hidden_002",
      battlefieldId: "bf_2",
      revealedByPlayerId: "p2",
    });
  });

  test("throws when owner mapping is missing for a facedown card", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    assert.throws(
      () =>
        revealFacedownCardsOnGameEnd(gameplay, {
          cardOwnerById: {},
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Card owner mapping is required for game-end reveal.",
    );
  });
});
