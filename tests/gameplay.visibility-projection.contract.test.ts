import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createMatch,
  deriveRuntimeCardId,
  setupMatchToReady,
} from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Gameplay visibility projection contract", () => {
  test("requires viewerPlayerId for match read", async () => {
    const created = await createMatch(app, "best-of-3");

    const response = await request(app).get(`/api/matches/${created.id}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(response.body.error.message, "viewerPlayerId query parameter is required.");
  });

  test("shows private_owner hand only to owning player viewer", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });

    const readyAsP2 = await request(app).get(`/api/matches/${ready.id}?viewerPlayerId=p2`);
    assert.equal(readyAsP2.status, 200);

    const p1CardId = deriveRuntimeCardId(ready, "p1", "main_deck", 2);
    const p2CardId = deriveRuntimeCardId(readyAsP2.body.data, "p2", "main_deck", 2);

    const p1Move = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: p1CardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
      });
    assert.equal(p1Move.status, 201);

    const p2Move = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: p2CardId,
        cardControllerId: "p2",
        source: { kind: "player_zone", playerId: "p2", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p2", zone: "hand" },
      });
    assert.equal(p2Move.status, 201);

    const p1View = await request(app).get(`/api/matches/${ready.id}?viewerPlayerId=p1`);
    assert.equal(p1View.status, 200);

    const p2View = await request(app).get(`/api/matches/${ready.id}?viewerPlayerId=p2`);
    assert.equal(p2View.status, 200);

    const p1ZonesFromP1View = p1View.body.data.currentGame.gameplay.zones.players.p1;
    const p2ZonesFromP1View = p1View.body.data.currentGame.gameplay.zones.players.p2;
    assert.ok(p1ZonesFromP1View.hand.includes(p1CardId));
    assert.deepEqual(p2ZonesFromP1View.hand, ["hidden_card"]);

    const p1ZonesFromP2View = p2View.body.data.currentGame.gameplay.zones.players.p1;
    const p2ZonesFromP2View = p2View.body.data.currentGame.gameplay.zones.players.p2;
    assert.deepEqual(p1ZonesFromP2View.hand, ["hidden_card"]);
    assert.ok(p2ZonesFromP2View.hand.includes(p2CardId));
  });
});
