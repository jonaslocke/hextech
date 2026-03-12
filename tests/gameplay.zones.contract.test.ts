import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CANONICAL_CARD_ZONES,
  ZONE_PRIVACY_BY_ZONE,
} from "../src/domain/gameplay.js";

describe("Gameplay zones contract", () => {
  test("defines canonical card zones using v1.2 vocabulary", () => {
    assert.deepEqual(CANONICAL_CARD_ZONES, [
      "main_deck",
      "hand",
      "trash",
      "banishment",
      "rune_deck",
      "legend_zone",
      "champion_zone",
      "base",
      "battlefield",
      "chain",
      "facedown",
    ]);
  });

  test("assigns privacy metadata for each canonical zone", () => {
    assert.equal(ZONE_PRIVACY_BY_ZONE.main_deck, "secret");
    assert.equal(ZONE_PRIVACY_BY_ZONE.rune_deck, "secret");
    assert.equal(ZONE_PRIVACY_BY_ZONE.hand, "private");
    assert.equal(ZONE_PRIVACY_BY_ZONE.facedown, "private");

    assert.equal(ZONE_PRIVACY_BY_ZONE.trash, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.banishment, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.legend_zone, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.champion_zone, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.base, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.battlefield, "public");
    assert.equal(ZONE_PRIVACY_BY_ZONE.chain, "public");
  });
});
