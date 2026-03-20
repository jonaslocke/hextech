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

describe("Zone change API cutover contract", () => {
  test("deprecated debug mutator endpoints are not available", async () => {
    const deprecatedPaths = [
      "/api/matches/match_unknown/debug/zones/place",
      "/api/matches/match_unknown/debug/zones/move",
      "/api/matches/match_unknown/debug/zones/cleanup-hidden",
      "/api/matches/match_unknown/debug/zones/reveal-game-end",
      "/api/matches/match_unknown/debug/zones/rules",
    ];

    for (const path of deprecatedPaths) {
      const response = await request(app).post(path).send({});
      assert.equal(response.status, 404, `Expected 404 for deprecated endpoint ${path}`);
    }
  });

  test("rejects card type override mismatch for known runtime card ids", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });

    const runeCardId = deriveRuntimeCardId(ready, "p1", "rune_deck", 1);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: runeCardId,
        cardControllerId: "p1",
        cardType: "spell",
        source: { kind: "player_zone", playerId: "p1", zone: "runeDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.match(response.body.error.message, /Card type mismatch/);
  });

  test("uses server-resolved card type when payload cardType is omitted", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });

    const runeCardId = deriveRuntimeCardId(ready, "p1", "rune_deck", 1);

    const blocked = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: runeCardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "runeDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
      });

    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.error.code, "VALIDATION_ERROR");

    const mainCardId = deriveRuntimeCardId(ready, "p1", "main_deck", 2);

    const allowed = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/change`)
      .send({
        cardId: mainCardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
        destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
      });

    assert.equal(allowed.status, 201);

    const events = allowed.body.data.currentGame.gameplay.events;
    assert.ok(Array.isArray(events));
    assert.equal(events[events.length - 1]?.type, "zone_changed");
    assert.equal(events[events.length - 1]?.details?.cardId, mainCardId);
  });
});
