import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  collectGameplayZoneInvariantViolations,
  createEmptyGameplayRuntime,
  type GameplayRuntime,
} from "../src/domain/gameplay.js";

describe("Gameplay facedown zone invariants", () => {
  test("accepts empty facedown slots map", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    const violations = collectGameplayZoneInvariantViolations(gameplay);

    assert.deepEqual(violations, []);
  });

  test("accepts one hidden card per battlefield", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_hidden_001"];

    const violations = collectGameplayZoneInvariantViolations(gameplay);

    assert.deepEqual(violations, []);
  });

  test("rejects two hidden cards in the same battlefield by default capacity", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]) as unknown as GameplayRuntime;
    gameplay.zones.shared.facedownByBattlefield = {
      bf_1: ["card_hidden_001", "card_hidden_002"],
    };

    const violations = collectGameplayZoneInvariantViolations(gameplay);

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.code, "facedown_zone_capacity_exceeded");
    assert.equal(violations[0]?.battlefieldId, "bf_1");
  });

  test("accepts two hidden cards when battlefield hidden capacity is overridden to 2", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.ruleParameters.hiddenCapacityByBattlefield.bf_1 = 2;
    gameplay.zones.shared.facedownByBattlefield.bf_1 = [
      "card_hidden_001",
      "card_hidden_002",
    ];

    const violations = collectGameplayZoneInvariantViolations(gameplay);

    assert.deepEqual(violations, []);
  });

  test("rejects invalid slot values", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]) as unknown as GameplayRuntime;
    (
      gameplay as unknown as {
        zones: { shared: { facedownByBattlefield: Record<string, unknown> } };
      }
    ).zones.shared.facedownByBattlefield = {
      bf_1: [""],
      bf_2: "card_hidden_003",
    };

    const violations = collectGameplayZoneInvariantViolations(gameplay);
    const codes = violations.map((violation) => violation.code);

    assert.deepEqual(codes, ["facedown_zone_invalid_slot", "facedown_zone_invalid_slot"]);
  });

  test("rejects invalid hidden capacity overrides", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.ruleParameters.defaultHiddenCapacityPerBattlefield = 0;
    gameplay.ruleParameters.hiddenCapacityByBattlefield.bf_1 = -1;

    const violations = collectGameplayZoneInvariantViolations(gameplay);
    const codes = violations
      .filter((violation) => violation.code === "facedown_zone_invalid_hidden_capacity")
      .map((violation) => violation.code);

    assert.equal(codes.length, 2);
  });
});
