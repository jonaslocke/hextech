import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Gameplay visibility projection contract", () => {
  test("hides secret and private_owner card identities for spectator match view", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });
    const movedCardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    assert.ok(movedCardId);

    const moveResponse = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: movedCardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
      });
    assert.equal(moveResponse.status, 201);

    const spectatorView = await request(app).get(`/api/matches/${ready.id}`);
    assert.equal(spectatorView.status, 200);

    const spectatorZones = spectatorView.body.data.currentGame.gameplay.zones.players.p1;
    assert.deepEqual(spectatorZones.hand, ["hidden_card"]);
    assert.ok(spectatorZones.mainDeck.every((cardId: string) => cardId === "hidden_card"));
    assert.ok(!spectatorZones.mainDeck.includes(movedCardId));

    const publicChampion = spectatorZones.championZone[0] ?? null;
    assert.equal(publicChampion, ready.currentGame.gameplay.zones.players.p1.championZone[0]);

    const events = spectatorView.body.data.currentGame.gameplay.events;
    assert.equal(events[events.length - 1]?.details?.cardId, "hidden_card");
  });

  test("shows private_owner hand only to owning viewer", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });

    const p1CardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    const p2CardId = ready.currentGame.gameplay.zones.players.p2.mainDeck[0] ?? null;
    assert.ok(p1CardId);
    assert.ok(p2CardId);

    await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: p1CardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
      });

    await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: p2CardId,
        cardControllerId: "p2",
        source: { kind: "player_zone", playerId: "p2", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p2", zone: "hand" },
      });

    const p1View = await request(app).get(`/api/matches/${ready.id}?viewerPlayerId=p1`);
    assert.equal(p1View.status, 200);

    const p1Zones = p1View.body.data.currentGame.gameplay.zones.players.p1;
    const p2Zones = p1View.body.data.currentGame.gameplay.zones.players.p2;
    assert.ok(p1Zones.hand.includes(p1CardId));
    assert.deepEqual(p2Zones.hand, ["hidden_card"]);
    assert.ok(p1Zones.mainDeck.every((cardId: string) => cardId === "hidden_card"));
  });

  test("projects gameplay intent response with actor viewer visibility", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });
    const cardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    assert.ok(cardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId,
            cardControllerId: "p1",
            source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
            destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
          },
        },
      });

    assert.equal(response.status, 201);

    const zones = response.body.data.currentGame.gameplay.zones.players.p1;
    assert.ok(zones.hand.includes(cardId));
    assert.ok(zones.mainDeck.every((entry: string) => entry === "hidden_card"));

    const events = response.body.data.currentGame.gameplay.events;
    assert.equal(events[events.length - 2]?.details?.cardId, cardId);
    assert.equal(events[events.length - 1]?.type, "intent_resolved");
  });
});
