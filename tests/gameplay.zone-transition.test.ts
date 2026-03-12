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
    gameplay.zones.players.p1!.hand.push("card_002");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_001"];

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
        error.message === "Facedown zone capacity exceeded for battlefield (max: 1).",
    );
  });

  test("allows facedown movement when capacity override allows the card", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.ruleParameters.hiddenCapacityByBattlefield.bf_1 = 2;
    gameplay.zones.players.p1!.hand.push("card_002");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["card_001"];

    const next = moveCardBetweenZones(gameplay, {
      cardId: "card_002",
      cardControllerId: "p1",
      source: { kind: "player_zone", playerId: "p1", zone: "hand" },
      destination: { kind: "facedown", battlefieldId: "bf_1" },
      battlefieldControllerById: { bf_1: "p1" },
    });

    assert.deepEqual(next.zones.shared.facedownByBattlefield.bf_1, [
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
});
