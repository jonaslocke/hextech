import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Zone debug smoke flow", () => {
  test("covers hydration, facedown capacity, override, cleanup, and reveal", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      battlefieldByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
    });

    assert.equal(ready.currentGame.status, "ready");
    assert.equal(ready.currentGame.gameplay.zones.players.p1.mainDeck.length, 40);
    assert.equal(ready.currentGame.gameplay.zones.players.p1.runeDeck.length, 12);
    assert.equal(ready.currentGame.gameplay.zones.shared.battlefield.length, 2);

    const p1BattlefieldId = ready.currentGame.gameplay.zones.shared.battlefield.find(
      (id: string) => id.includes("setup:battlefield:p1:"),
    );
    assert.ok(p1BattlefieldId);

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
