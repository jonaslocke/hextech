import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ValidationError } from "../src/shared/errors.js";
import {
  createEmptyGameplayRuntime,
  type GameplayRuntime,
} from "../src/domain/gameplay.js";
import {
  CARD_TYPES,
  ZONE_POLICY_LIST,
  type CardType,
  type ZonePolicyId,
} from "../src/domain/zone-policy.js";
import {
  moveCardBetweenZones,
  type GameplayZoneRef,
} from "../src/domain/gameplay.zone-transition.js";

describe("Zone change policy matrix", () => {
  for (const policy of ZONE_POLICY_LIST) {
    for (const cardType of CARD_TYPES) {
      const shouldAllow =
        policy.allowedCardTypes.includes(cardType) &&
        !policy.prohibitedCardTypes.includes(cardType);

      test(`${policy.id}: ${cardType} ${shouldAllow ? "allowed" : "blocked"}`, () => {
        const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
        const destination = toDestinationZoneRef(policy.id, cardType);
        const source = toSourceZoneRef(destination);
        const cardId = `${policy.id}:${cardType}:001`;

        pushCardToZone(gameplay, source, cardId);

        if (shouldAllow) {
          const next = moveCardBetweenZones(gameplay, {
            cardId,
            cardControllerId: "p1",
            cardType,
            source,
            destination,
          });

          assert.ok(resolveZoneBucket(next, destination).includes(cardId));
          assert.ok(!resolveZoneBucket(next, source).includes(cardId));
          return;
        }

        assert.throws(
          () =>
            moveCardBetweenZones(gameplay, {
              cardId,
              cardControllerId: "p1",
              cardType,
              source,
              destination,
            }),
          (error: unknown) => {
            if (!(error instanceof ValidationError)) {
              return false;
            }

            return (
              error.message.includes("cannot be placed") ||
              error.message.includes("is not allowed")
            );
          },
        );
      });
    }
  }

  test("champion_zone capacity: blocks second unit", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.championZone.push("champion_001");
    gameplay.zones.players.p1!.hand.push("unit_002");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "unit_002",
          cardControllerId: "p1",
          cardType: "unit",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "player_zone", playerId: "p1", zone: "championZone" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message ===
          'Zone capacity exceeded for "champion_zone" (constraint: total_cards, max: 1).',
    );
  });

  test("legend_zone capacity: blocks second legend", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.players.p1!.legendZone.push("legend_001");
    gameplay.zones.players.p1!.hand.push("legend_002");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "legend_002",
          cardControllerId: "p1",
          cardType: "legend",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "player_zone", playerId: "p1", zone: "legendZone" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message ===
          'Zone capacity exceeded for "legend_zone" (constraint: total_cards, max: 1).',
    );
  });

  test("facedown movement: blocks when capacity is full", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.push("bf_1");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["hidden_001"];
    gameplay.zones.players.p1!.hand.push("hidden_002");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "hidden_002",
          cardControllerId: "p1",
          cardType: "unit",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "facedown", battlefieldId: "bf_1" },
          battlefieldControllerById: { bf_1: "p1" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Facedown zone capacity exceeded for battlefield (max: 1).",
    );
  });

  test("facedown movement: allows override hidden capacity", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.ruleParameters.hiddenCapacityByBattlefield.bf_1 = 2;
    gameplay.zones.shared.battlefield.push("bf_1");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = ["hidden_001"];
    gameplay.zones.players.p1!.hand.push("hidden_002");

    const next = moveCardBetweenZones(gameplay, {
      cardId: "hidden_002",
      cardControllerId: "p1",
      cardType: "unit",
      source: { kind: "player_zone", playerId: "p1", zone: "hand" },
      destination: { kind: "facedown", battlefieldId: "bf_1" },
      battlefieldControllerById: { bf_1: "p1" },
    });

    assert.deepEqual(next.zones.shared.facedownByBattlefield.bf_1, [
      "hidden_001",
      "hidden_002",
    ]);
  });

  test("facedown movement: blocks non-controller", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.push("bf_1");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = [];
    gameplay.zones.players.p1!.hand.push("hidden_001");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "hidden_001",
          cardControllerId: "p1",
          cardType: "unit",
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

  test("facedown movement: blocks prohibited rune type", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    gameplay.zones.shared.battlefield.push("bf_1");
    gameplay.zones.shared.facedownByBattlefield.bf_1 = [];
    gameplay.zones.players.p1!.hand.push("hidden_rune_001");

    assert.throws(
      () =>
        moveCardBetweenZones(gameplay, {
          cardId: "hidden_rune_001",
          cardControllerId: "p1",
          cardType: "rune",
          source: { kind: "player_zone", playerId: "p1", zone: "hand" },
          destination: { kind: "facedown", battlefieldId: "bf_1" },
          battlefieldControllerById: { bf_1: "p1" },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === 'Card type "rune" cannot be placed in zone "battlefield".',
    );
  });
});

function toDestinationZoneRef(
  zonePolicyId: ZonePolicyId,
  cardType: CardType,
): GameplayZoneRef {
  switch (zonePolicyId) {
    case "main_deck":
      return { kind: "player_zone", playerId: "p1", zone: "mainDeck" };
    case "rune_deck":
      return { kind: "player_zone", playerId: "p1", zone: "runeDeck" };
    case "hand":
      return { kind: "player_zone", playerId: "p1", zone: "hand" };
    case "champion_zone":
      return { kind: "player_zone", playerId: "p1", zone: "championZone" };
    case "legend_zone":
      return { kind: "player_zone", playerId: "p1", zone: "legendZone" };
    case "base":
      if (cardType === "rune") {
        return { kind: "base_runes", playerId: "p1" };
      }
      return { kind: "base_cards", playerId: "p1" };
    case "battlefield":
      return { kind: "battlefield" };
    case "chain":
      return { kind: "chain" };
    case "trash":
      return { kind: "player_zone", playerId: "p1", zone: "trash" };
    case "banishment":
      return { kind: "player_zone", playerId: "p1", zone: "banishment" };
  }
}

function toSourceZoneRef(destination: GameplayZoneRef): GameplayZoneRef {
  if (destination.kind === "player_zone" && destination.zone === "hand") {
    return { kind: "player_zone", playerId: "p1", zone: "trash" };
  }

  return { kind: "player_zone", playerId: "p1", zone: "hand" };
}

function pushCardToZone(
  gameplay: GameplayRuntime,
  zoneRef: GameplayZoneRef,
  cardId: string,
): void {
  resolveZoneBucket(gameplay, zoneRef).push(cardId);
}

function resolveZoneBucket(
  gameplay: GameplayRuntime,
  zoneRef: GameplayZoneRef,
): string[] {
  switch (zoneRef.kind) {
    case "player_zone":
      return gameplay.zones.players[zoneRef.playerId]![zoneRef.zone];
    case "base_cards":
      return gameplay.zones.players[zoneRef.playerId]!.base.cards;
    case "base_runes":
      return gameplay.zones.players[zoneRef.playerId]!.base.runes;
    case "battlefield":
      return gameplay.zones.shared.battlefield;
    case "chain":
      return gameplay.zones.shared.chain;
    case "facedown": {
      const current = gameplay.zones.shared.facedownByBattlefield[zoneRef.battlefieldId];
      if (!current) {
        throw new Error("Missing facedown bucket for battlefield in test setup.");
      }
      return current;
    }
  }
}
