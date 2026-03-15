import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Zone debug policy enforcement", () => {
  test("rejects moving a rune card from rune deck to chain", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      battlefieldByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
    });

    const runeCardId = ready.currentGame.gameplay.zones.players.p1.runeDeck[0];
    assert.ok(runeCardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/debug/zones/move`)
      .send({
        cardId: runeCardId,
        cardControllerId: "p1",
        source: { kind: "player_zone", playerId: "p1", zone: "runeDeck" },
        destination: { kind: "chain" },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
    assert.equal(
      response.body?.error?.message,
      'Card type "rune" cannot be placed in zone "chain".',
    );
  });
});
