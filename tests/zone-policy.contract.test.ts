import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CARD_STATE_TAGS,
  CARD_TYPES,
  GAMEPLAY_GLOBAL_ZONE_INVARIANTS,
  RULE_PARAMETER_IDS,
  ZONE_POLICY_IDS,
  ZONE_POLICY_LIST,
  resolveConstraintBounds,
} from "../src/domain/zone-policy.js";

describe("Zone policy contract", () => {
  const policyById = Object.fromEntries(
    ZONE_POLICY_LIST.map((policy) => [policy.id, policy]),
  );

  test("defines canonical vocabularies", () => {
    assert.deepEqual(CARD_TYPES, [
      "unit",
      "spell",
      "gear",
      "rune",
      "battlefield",
      "legend",
    ]);

    assert.deepEqual(CARD_STATE_TAGS, ["hidden"]);
    assert.deepEqual(RULE_PARAMETER_IDS, ["hiddenCapacityByBattlefield"]);
  });

  test("defines approved zone policy ids", () => {
    assert.deepEqual(ZONE_POLICY_IDS, [
      "main_deck",
      "rune_deck",
      "hand",
      "champion_zone",
      "legend_zone",
      "base",
      "battlefield",
      "chain",
      "trash",
      "banishment",
    ]);

    assert.deepEqual(
      ZONE_POLICY_LIST.map((policy) => policy.id),
      ZONE_POLICY_IDS,
    );
  });

  test("keeps matrix restrictions for allowed/prohibited types and visibility", () => {
    assert.deepEqual(policyById.main_deck.allowedCardTypes, ["unit", "spell", "gear"]);
    assert.deepEqual(policyById.main_deck.prohibitedCardTypes, [
      "rune",
      "battlefield",
      "legend",
    ]);
    assert.equal(policyById.main_deck.visibility, "secret");

    assert.deepEqual(policyById.rune_deck.allowedCardTypes, ["rune"]);
    assert.equal(policyById.rune_deck.visibility, "secret");

    assert.deepEqual(policyById.hand.allowedCardTypes, ["unit", "spell", "gear"]);
    assert.equal(policyById.hand.visibility, "private_owner");

    assert.deepEqual(policyById.champion_zone.allowedCardTypes, ["unit"]);
    assert.equal(policyById.champion_zone.visibility, "public");

    assert.deepEqual(policyById.legend_zone.allowedCardTypes, ["legend"]);
    assert.equal(policyById.legend_zone.visibility, "public");

    assert.deepEqual(policyById.base.allowedCardTypes, ["unit", "gear", "rune"]);
    assert.deepEqual(policyById.base.prohibitedCardTypes, [
      "spell",
      "battlefield",
      "legend",
    ]);

    assert.deepEqual(policyById.battlefield.allowedCardTypes, ["battlefield", "unit"]);
    assert.deepEqual(policyById.battlefield.prohibitedCardTypes, ["rune", "legend"]);

    assert.deepEqual(policyById.chain.allowedCardTypes, ["unit", "spell", "gear"]);
    assert.deepEqual(policyById.chain.prohibitedCardTypes, [
      "rune",
      "battlefield",
      "legend",
    ]);

    assert.deepEqual(policyById.trash.allowedCardTypes, ["unit", "spell", "gear", "rune"]);
    assert.deepEqual(policyById.trash.prohibitedCardTypes, ["battlefield", "legend"]);

    assert.deepEqual(policyById.banishment.allowedCardTypes, ["unit", "spell", "gear"]);
    assert.deepEqual(policyById.banishment.prohibitedCardTypes, [
      "rune",
      "battlefield",
      "legend",
    ]);
  });

  test("models capacities with typed default bounds and typed modifier chain", () => {
    const battlefieldConstraints = policyById.battlefield.capacityConstraints;

    assert.deepEqual(
      battlefieldConstraints.find((rule) => rule.id === "battlefield_card_slot"),
      {
        id: "battlefield_card_slot",
        scope: "per_location",
        defaultBounds: {
          min: 1,
          max: 1,
        },
        appliesToCardTypes: ["battlefield"],
        modifierChain: [],
      },
    );

    assert.deepEqual(battlefieldConstraints.find((rule) => rule.id === "hidden_slot"), {
      id: "hidden_slot",
      scope: "per_location",
      defaultBounds: {
        min: 0,
        max: 1,
      },
      appliesToStateTags: ["hidden"],
      modifierChain: [
        {
          source: "rule_parameter",
          parameter: "hiddenCapacityByBattlefield",
          target: "max",
          operation: "set",
          priority: 100,
        },
        {
          source: "card_effect",
          target: "max",
          operation: "set",
          priority: 200,
        },
        {
          source: "card_effect",
          target: "max",
          operation: "add",
          priority: 300,
        },
      ],
    });
  });

  test("resolves capacity bounds from default value plus modifier chain", () => {
    const hiddenConstraint = policyById.battlefield.capacityConstraints.find(
      (rule) => rule.id === "hidden_slot",
    );

    assert.ok(hiddenConstraint);

    const defaultBounds = resolveConstraintBounds(hiddenConstraint, []);
    assert.deepEqual(defaultBounds, { min: 0, max: 1 });

    const withRuleAndEffect = resolveConstraintBounds(hiddenConstraint, [
      {
        source: "rule_parameter",
        sourceId: "game_rule:hiddenCapacityByBattlefield:setup:battlefield:p1:fortified_position",
        parameter: "hiddenCapacityByBattlefield",
        target: "max",
        operation: "set",
        value: 2,
      },
      {
        source: "card_effect",
        sourceId: "card:warded_field#effect_1",
        target: "max",
        operation: "add",
        value: 1,
      },
    ]);

    assert.deepEqual(withRuleAndEffect, { min: 0, max: 3 });

    const withSetThenAdd = resolveConstraintBounds(hiddenConstraint, [
      {
        source: "card_effect",
        sourceId: "card:warded_field#effect_2",
        target: "max",
        operation: "add",
        value: 1,
      },
      {
        source: "card_effect",
        sourceId: "card:warded_field#effect_3",
        target: "max",
        operation: "set",
        value: 1,
      },
    ]);

    assert.deepEqual(withSetThenAdd, { min: 0, max: 2 });
  });

  test("supports future rules like only one unit per base via max set modifier", () => {
    const baseUnitConstraint = policyById.base.capacityConstraints.find(
      (rule) => rule.id === "unit_occupancy",
    );

    assert.ok(baseUnitConstraint);

    const oneUnitPerBase = resolveConstraintBounds(baseUnitConstraint, [
      {
        source: "card_effect",
        sourceId: "card:command_post#effect_1",
        target: "max",
        operation: "set",
        value: 1,
      },
    ]);

    assert.deepEqual(oneUnitPerBase, { min: 0, max: 1 });
  });

  test("defines global zone invariant contract", () => {
    assert.deepEqual(GAMEPLAY_GLOBAL_ZONE_INVARIANTS, [
      "A card instance can exist in exactly one zone at a time.",
    ]);
  });
});
