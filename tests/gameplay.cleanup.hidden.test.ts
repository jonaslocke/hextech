import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ValidationError } from "../src/shared/errors.js";
import { createEmptyGameplayRuntime } from "../src/domain/gameplay.js";
import { cleanupHiddenCardsAfterControlChange } from "../src/domain/gameplay.cleanup.js";

describe("Hidden cleanup after control change", () => {
  test("removes hidden card to owner's trash when battlefield is no longer controlled by card controller", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    const result = cleanupHiddenCardsAfterControlChange(gameplay, {
      battlefieldControllerById: { bf_1: "p2" },
      cardControllerById: { card_hidden_001: "p1" },
      cardOwnerById: { card_hidden_001: "p1" },
    });

    assert.deepEqual(result.gameplay.zones.shared.facedownByBattlefield.bf_1, []);
    assert.deepEqual(result.gameplay.zones.players.p1!.trash, ["card_hidden_001"]);
    assert.deepEqual(result.removed, [
      {
        cardId: "card_hidden_001",
        battlefieldId: "bf_1",
        controllerId: "p1",
        ownerId: "p1",
      },
    ]);
  });

  test("keeps hidden card when battlefield controller still matches card controller", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    const result = cleanupHiddenCardsAfterControlChange(gameplay, {
      battlefieldControllerById: { bf_1: "p1" },
      cardControllerById: { card_hidden_001: "p1" },
      cardOwnerById: { card_hidden_001: "p1" },
    });

    assert.deepEqual(result.gameplay.zones.shared.facedownByBattlefield.bf_1, [
      "card_hidden_001",
    ]);
    assert.deepEqual(result.gameplay.zones.players.p1!.trash, []);
    assert.deepEqual(result.removed, []);
  });

  test("moves hidden card to owner trash even when owner differs from controller", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    const result = cleanupHiddenCardsAfterControlChange(gameplay, {
      battlefieldControllerById: { bf_1: "p2" },
      cardControllerById: { card_hidden_001: "p1" },
      cardOwnerById: { card_hidden_001: "p2" },
    });

    assert.deepEqual(result.gameplay.zones.shared.facedownByBattlefield.bf_1, []);
    assert.deepEqual(result.gameplay.zones.players.p1!.trash, []);
    assert.deepEqual(result.gameplay.zones.players.p2!.trash, ["card_hidden_001"]);
    assert.deepEqual(result.removed, [
      {
        cardId: "card_hidden_001",
        battlefieldId: "bf_1",
        controllerId: "p1",
        ownerId: "p2",
      },
    ]);
  });

  test("throws when hidden card controller mapping is missing", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    assert.throws(
      () =>
        cleanupHiddenCardsAfterControlChange(gameplay, {
          battlefieldControllerById: { bf_1: "p2" },
          cardControllerById: {},
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Card controller mapping is required for hidden cleanup.",
    );
  });
});
