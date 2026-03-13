import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Zone debug smoke flow", () => {
  test("covers hydration and core zone operations", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      battlefieldByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
    });

    const gameplay = ready.currentGame.gameplay;
    assert.equal(ready.currentGame.status, "ready");
    assert.equal(gameplay.zones.players.p1.mainDeck.length, 39);
    assert.equal(gameplay.zones.players.p2.mainDeck.length, 39);
    assert.equal(
      gameplay.zones.players.p1.mainDeck.length +
        gameplay.zones.players.p1.championZone.length,
      40,
    );
    assert.equal(
      gameplay.zones.players.p2.mainDeck.length +
        gameplay.zones.players.p2.championZone.length,
      40,
    );
    assert.equal(gameplay.zones.players.p1.runeDeck.length, 12);
    assert.equal(gameplay.zones.players.p2.runeDeck.length, 12);
    assert.equal(gameplay.zones.players.p1.championZone.length, 1);
    assert.equal(gameplay.zones.players.p2.championZone.length, 1);
    const p1ChampionCardId = gameplay.zones.players.p1.championZone[0];
    const p2ChampionCardId = gameplay.zones.players.p2.championZone[0];
    assert.ok(p1ChampionCardId);
    assert.ok(p2ChampionCardId);
    assert.ok(!gameplay.zones.players.p1.mainDeck.includes(p1ChampionCardId));
    assert.ok(!gameplay.zones.players.p2.mainDeck.includes(p2ChampionCardId));
    assert.equal(gameplay.zones.players.p1.legendZone.length, 1);
    assert.equal(gameplay.zones.players.p2.legendZone.length, 1);
    assert.equal(gameplay.zones.shared.battlefield.length, 2);
    assert.deepEqual(
      Object.keys(gameplay.zones.shared.facedownByBattlefield).sort(),
      [...gameplay.zones.shared.battlefield].sort(),
    );

    const placeUnitOnBattlefield = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_unit_001",
        cardControllerId: "p1",
        destination: { kind: "battlefield" },
      });
    assert.equal(placeUnitOnBattlefield.status, 201);
    assert.ok(
      placeUnitOnBattlefield.body.data.currentGame.gameplay.zones.shared.battlefield.includes(
        "manual_unit_001",
      ),
    );

    const placeDuplicateCard = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_unit_001",
        cardControllerId: "p1",
        destination: { kind: "chain" },
      });
    assert.equal(placeDuplicateCard.status, 400);
    assert.equal(placeDuplicateCard.body?.error?.code, "VALIDATION_ERROR");

    const moveUnitToOwnBase = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/move`)
      .send({
        cardId: "manual_unit_001",
        cardControllerId: "p1",
        source: { kind: "battlefield" },
        destination: { kind: "base_cards", playerId: "p1" },
      });
    assert.equal(moveUnitToOwnBase.status, 201);
    assert.ok(
      moveUnitToOwnBase.body.data.currentGame.gameplay.zones.players.p1.base.cards.includes(
        "manual_unit_001",
      ),
    );

    const placeRuneInOwnBase = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_rune_001",
        cardControllerId: "p1",
        destination: { kind: "base_runes", playerId: "p1" },
      });
    assert.equal(placeRuneInOwnBase.status, 201);
    assert.ok(
      placeRuneInOwnBase.body.data.currentGame.gameplay.zones.players.p1.base.runes.includes(
        "manual_rune_001",
      ),
    );

    const placeCardInOpponentBase = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_unit_002",
        cardControllerId: "p1",
        destination: { kind: "base_cards", playerId: "p2" },
      });
    assert.equal(placeCardInOpponentBase.status, 400);
    assert.equal(placeCardInOpponentBase.body?.error?.code, "VALIDATION_ERROR");

    const placeRuneInOpponentBase = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_rune_002",
        cardControllerId: "p1",
        destination: { kind: "base_runes", playerId: "p2" },
      });
    assert.equal(placeRuneInOpponentBase.status, 400);
    assert.equal(placeRuneInOpponentBase.body?.error?.code, "VALIDATION_ERROR");

    const placeCardInUnknownPlayerZone = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_spell_001",
        cardControllerId: "p1",
        destination: { kind: "player_zone", playerId: "ghost", zone: "hand" },
      });
    assert.equal(placeCardInUnknownPlayerZone.status, 400);
    assert.equal(placeCardInUnknownPlayerZone.body?.error?.code, "VALIDATION_ERROR");

    const placeCardInChain = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_spell_002",
        cardControllerId: "p1",
        destination: { kind: "chain" },
      });
    assert.equal(placeCardInChain.status, 201);
    assert.ok(
      placeCardInChain.body.data.currentGame.gameplay.zones.shared.chain.includes(
        "manual_spell_002",
      ),
    );

    const moveCardToSameZone = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/move`)
      .send({
        cardId: "manual_spell_002",
        cardControllerId: "p1",
        source: { kind: "chain" },
        destination: { kind: "chain" },
      });
    assert.equal(moveCardToSameZone.status, 400);
    assert.equal(moveCardToSameZone.body?.error?.code, "VALIDATION_ERROR");

    const moveMissingSourceCard = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/move`)
      .send({
        cardId: "manual_missing_001",
        cardControllerId: "p1",
        source: { kind: "battlefield" },
        destination: { kind: "player_zone", playerId: "p1", zone: "trash" },
      });
    assert.equal(moveMissingSourceCard.status, 400);
    assert.equal(moveMissingSourceCard.body?.error?.code, "VALIDATION_ERROR");
  });

  test("covers facedown capacity, cleanup, and reveal rules", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      battlefieldByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
    });

    assert.equal(ready.currentGame.status, "ready");
    assert.equal(ready.currentGame.gameplay.zones.shared.battlefield.length, 2);

    const p1BattlefieldId = ready.currentGame.gameplay.zones.shared.battlefield.find(
      (id: string) => id.includes("setup:battlefield:p1:"),
    );
    assert.ok(p1BattlefieldId);

    const unresolvedPlaceholderBattlefieldId = "{{p1_battlefield_id}}";
    const placeWithUnknownBattlefieldId = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_unknown_001",
        cardControllerId: "p1",
        destination: {
          kind: "facedown",
          battlefieldId: unresolvedPlaceholderBattlefieldId,
        },
        battlefieldControllerById: { [unresolvedPlaceholderBattlefieldId]: "p1" },
      });
    assert.equal(placeWithUnknownBattlefieldId.status, 400);
    assert.equal(placeWithUnknownBattlefieldId.body?.error?.code, "VALIDATION_ERROR");

    const overrideUnknownBattlefieldId = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/rules`)
      .send({
        hiddenCapacityByBattlefield: { [unresolvedPlaceholderBattlefieldId]: 2 },
      });
    assert.equal(overrideUnknownBattlefieldId.status, 400);
    assert.equal(overrideUnknownBattlefieldId.body?.error?.code, "VALIDATION_ERROR");

    const placeWithoutBattlefieldControllerMap = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_missing_map_001",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
      });
    assert.equal(placeWithoutBattlefieldControllerMap.status, 400);
    assert.equal(
      placeWithoutBattlefieldControllerMap.body?.error?.code,
      "VALIDATION_ERROR",
    );

    const placeWithWrongBattlefieldController = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_wrong_controller_001",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
        battlefieldControllerById: { [p1BattlefieldId!]: "p2" },
      });
    assert.equal(placeWithWrongBattlefieldController.status, 400);
    assert.equal(
      placeWithWrongBattlefieldController.body?.error?.code,
      "VALIDATION_ERROR",
    );

    const placeFirst = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_001",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
        battlefieldControllerById: { [p1BattlefieldId!]: "p1" },
      });
    assert.equal(placeFirst.status, 201);
    assert.deepEqual(
      placeFirst.body.data.currentGame.gameplay.zones.shared.facedownByBattlefield[
        p1BattlefieldId!
      ],
      ["manual_hidden_001"],
    );

    const placeSecondDenied = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_002",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
        battlefieldControllerById: { [p1BattlefieldId!]: "p1" },
      });
    assert.equal(placeSecondDenied.status, 400);
    assert.equal(placeSecondDenied.body?.error?.code, "VALIDATION_ERROR");

    const updateCapacity = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/rules`)
      .send({
        hiddenCapacityByBattlefield: { [p1BattlefieldId!]: 2 },
      });
    assert.equal(updateCapacity.status, 201);
    assert.equal(
      updateCapacity.body.data.currentGame.gameplay.ruleParameters.hiddenCapacityByBattlefield[
        p1BattlefieldId!
      ],
      2,
    );

    const placeSecondAllowed = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_002",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
        battlefieldControllerById: { [p1BattlefieldId!]: "p1" },
      });
    assert.equal(placeSecondAllowed.status, 201);
    assert.deepEqual(
      placeSecondAllowed.body.data.currentGame.gameplay.zones.shared.facedownByBattlefield[
        p1BattlefieldId!
      ],
      ["manual_hidden_001", "manual_hidden_002"],
    );

    // Synthetic debug probe for rule 408.4 reveal behavior when moving to a non-public zone.
    const moveToHand = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/move`)
      .send({
        cardId: "manual_hidden_002",
        cardControllerId: "p1",
        cardOwnerId: "p1",
        source: { kind: "facedown", battlefieldId: p1BattlefieldId },
        destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
      });
    assert.equal(moveToHand.status, 201);
    assert.ok(
      moveToHand.body.data.currentGame.gameplay.zones.players.p1.hand.includes(
        "manual_hidden_002",
      ),
    );
    const moveRevealEvent =
      moveToHand.body.data.currentGame.gameplay.events[
        moveToHand.body.data.currentGame.gameplay.events.length - 1
      ];
    assert.equal(moveRevealEvent.type, "facedown_card_revealed");
    assert.equal(moveRevealEvent.details.reason, "move_to_non_public_zone");

    const cleanupHidden = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/cleanup-hidden`)
      .send({
        battlefieldControllerById: { [p1BattlefieldId!]: "p2" },
        cardControllerById: { manual_hidden_001: "p1" },
        cardOwnerById: { manual_hidden_001: "p1" },
      });
    assert.equal(cleanupHidden.status, 201);
    assert.ok(
      cleanupHidden.body.data.currentGame.gameplay.zones.players.p1.trash.includes(
        "manual_hidden_001",
      ),
    );
    assert.deepEqual(
      cleanupHidden.body.data.currentGame.gameplay.zones.shared.facedownByBattlefield[
        p1BattlefieldId!
      ],
      [],
    );

    const placeGameEndCard = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/place`)
      .send({
        cardId: "manual_hidden_003",
        cardControllerId: "p1",
        destination: { kind: "facedown", battlefieldId: p1BattlefieldId },
        battlefieldControllerById: { [p1BattlefieldId!]: "p1" },
      });
    assert.equal(placeGameEndCard.status, 201);

    const revealGameEnd = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/reveal-game-end`)
      .send({
        cardOwnerById: { manual_hidden_003: "p1" },
      });
    assert.equal(revealGameEnd.status, 201);
    const revealGameEndEvent =
      revealGameEnd.body.data.currentGame.gameplay.events[
        revealGameEnd.body.data.currentGame.gameplay.events.length - 1
      ];
    assert.equal(revealGameEndEvent.type, "facedown_card_revealed");
    assert.equal(revealGameEndEvent.details.reason, "game_end");
    assert.equal(revealGameEndEvent.details.cardId, "manual_hidden_003");
  });
});
