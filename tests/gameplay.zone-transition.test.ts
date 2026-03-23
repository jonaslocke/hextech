import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ValidationError } from "../src/shared/errors.js";
import { createEmptyGameplayRuntime } from "../src/domain/gameplay.js";
import {
  moveCardBetweenZones,
  placeCardIntoZone,
} from "../src/domain/gameplay.zone-transition.js";

describe("Gameplay zone transition primitive", () => {
  test("moves a card between player zones", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.hand.push("card_001");

    const next = moveCardBetweenZones(gameplay, {
      cardId: "card_001",
      cardControllerId: "p1",
      source: { kind: "player_zone", playerId: "p1", zone: "hand" },
      destination: { kind: "player_zone", playerId: "p1", zone: "trash" },
    });

    assert.deepEqual(next.zones.players.p1!.hand, []);
    assert.deepEqual(next.zones.players.p1!.trash, ["card_001"]);
    assert.equal(next.events.length, 1);
    assert.equal(next.events[0]?.type, "zone_changed");
    assert.deepEqual(next.events[0]?.details, {
      cardId: "card_001",
      cardControllerId: "p1",
      source: "player_zone:p1:hand",
      destination: "player_zone:p1:trash",
    });
  });

  test("rejects moving a card missing from source zone", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "card_001",
          cardControllerId: "p1",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "player_zone", playerId: "p1", zone: "trash" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Card is not present in the source zone.",
    );
  });

  test("rejects moving cards into another player's base", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.hand.push("card_001");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "card_001",
          cardControllerId: "p1",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "base_cards", playerId: "p2" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Cards or runes cannot be placed in another player's base.",
    );
  });

  test("rejects facedown movement when battlefield is not controlled by card controller", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.cards.push("bf_1");
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1 = [];
    gameplay.zones.players.p1!.hand.push("card_001");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "card_001",
          cardControllerId: "p1",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "facedown", battlefieldId: "bf_1" },
          battlefieldControllerById: { bf_1: "p2" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message ===
          "Only the controller of a battlefield may place or keep cards in its facedown zone.",
    );
  });

  test("rejects facedown movement when destination capacity would be exceeded", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.cards.push("bf_1");
    gameplay.zones.players.p1!.hand.push("card_002");
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1 = ["card_001"];

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "card_002",
          cardControllerId: "p1",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "facedown", battlefieldId: "bf_1" },
          battlefieldControllerById: { bf_1: "p1" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === 'Zone capacity exceeded for "battlefield" (constraint: hidden_slot, max: 1).',
    );
  });

  test("allows facedown movement when capacity override allows the card", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.cards.push("bf_1");
    gameplay.policyModifiers.push({
      kind: "capacity",
      zonePolicyId: "battlefield",
      constraintId: "hidden_slot",
      locationKey: "bf_1",
      modifier: {
        source: "rule_parameter",
        sourceId: "game_rule:hiddenCapacityByBattlefield:bf_1",
        parameter: "hiddenCapacityByBattlefield",
        target: "max",
        operation: "set",
        value: 2,
      },
    });
    gameplay.zones.players.p1!.hand.push("card_002");
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1 = ["card_001"];

    const next = moveCardBetweenZones(gameplay, {
      cardId: "card_002",
      cardControllerId: "p1",
      source: { kind: "player_zone", playerId: "p1", zone: "hand" },
      destination: { kind: "facedown", battlefieldId: "bf_1" },
      battlefieldControllerById: { bf_1: "p1" },
    });

    assert.deepEqual(next.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1, [
      "card_001",
      "card_002",
    ]);
    assert.deepEqual(next.zones.players.p1!.hand, []);
  });

  test("places card into a destination zone", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);

    const next = placeCardIntoZone(gameplay, {
      cardId: "card_001",
      cardControllerId: "p1",
      destination: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
    });

    assert.deepEqual(next.zones.players.p1!.mainDeck, ["card_001"]);
  });

  test("rejects placing duplicate card ids in gameplay zones", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.mainDeck.push("card_001");

    assert.throws(
      () =>
        placeCardIntoZone(gameplay, {
          cardId: "card_001",
          cardControllerId: "p1",
          destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Card is already present in gameplay zones.",
    );
  });

  test("emits reveal event when moving facedown card to private zone", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.cards.push("bf_1");
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1 = ["card_hidden_001"];

    const next = moveCardBetweenZones(gameplay, {
      cardId: "card_hidden_001",
      cardControllerId: "p1",
      cardOwnerId: "p2",
      source: { kind: "facedown", battlefieldId: "bf_1" },
      destination: { kind: "player_zone", playerId: "p2", zone: "hand" },
    });

    assert.deepEqual(next.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1, []);
    assert.deepEqual(next.zones.players.p2!.hand, ["card_hidden_001"]);
    assert.equal(next.events.length, 2);
    assert.equal(next.events[0]?.type, "zone_changed");
    assert.deepEqual(next.events[0]?.details, {
      cardId: "card_hidden_001",
      cardControllerId: "p1",
      cardOwnerId: "p2",
      source: "facedown:bf_1",
      destination: "player_zone:p2:hand",
    });
    assert.equal(next.events[1]?.type, "facedown_card_revealed");
    assert.deepEqual(next.events[1]?.details, {
      reason: "move_to_non_public_zone",
      cardId: "card_hidden_001",
      battlefieldId: "bf_1",
      destination: "player_zone:p2:hand",
      revealedByPlayerId: "p2",
    });
  });

  test("does not emit reveal event when moving facedown card to public zone", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.cards.push("bf_1");
    gameplay.zones.shared.battlefield.hiddenCardsByBattlefield.bf_1 = ["card_hidden_001"];

    const next = moveCardBetweenZones(gameplay, {
      cardId: "card_hidden_001",
      cardControllerId: "p1",
      cardOwnerId: "p1",
      source: { kind: "facedown", battlefieldId: "bf_1" },
      destination: { kind: "player_zone", playerId: "p1", zone: "trash" },
    });

    assert.deepEqual(next.zones.players.p1!.trash, ["card_hidden_001"]);
    assert.equal(next.events.length, 1);
    assert.equal(next.events[0]?.type, "zone_changed");
  });

  test("rejects facedown placement for unknown battlefield id", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);

    assert.throws(
      () =>
        placeCardIntoZone(gameplay, {
          cardId: "card_hidden_001",
          cardControllerId: "p1",
          destination: { kind: "facedown", battlefieldId: "unknown_bf" },
          battlefieldControllerById: { unknown_bf: "p1" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Facedown zone for battlefield does not exist.",
    );
  });
  test("rejects prohibited card type for destination zone policy", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);

    assert.throws(
      () =>
        placeCardIntoZone(gameplay, {
          cardId: "card_rune_001",
          cardControllerId: "p1",
          cardType: "rune",
          destination: { kind: "chain" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === 'Card type "rune" cannot be placed in zone "chain".',
    );
  });

  test("rejects zone policy capacity overflow for champion zone", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.championZone.push("champion_001");

    assert.throws(
      () =>
        placeCardIntoZone(gameplay, {
          cardId: "unit_001",
          cardControllerId: "p1",
          cardType: "unit",
          destination: { kind: "player_zone", playerId: "p1", zone: "championZone" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message ===
          'Zone capacity exceeded for "champion_zone" (constraint: total_cards, max: 1).',
    );
  });
});


