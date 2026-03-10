import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("API smoke end-to-end", () => {
  test("best-of-1 happy path", async () => {
    const created = await createMatch(app, "best-of-1");
    const ready = await setupMatchToReady(app, created.id, "best-of-1");

    const reported = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "smoke_bo1_001",
        winnerPlayerId: "p1",
      });

    assert.equal(reported.status, 201);
    assert.equal(reported.body.data.decksByPlayer, undefined);
    assert.equal(reported.body.data.status, "finished");
    assert.equal(reported.body.data.winnerPlayerId, "p1");
  });

  test("best-of-3 happy path", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "smoke_bo3_001",
        winnerPlayerId: "p1",
        nextGameSelectedBattlefieldsByPlayer: {
          p1: "Grove of the God-Willow",
          p2: "The Dreaming Tree",
        },
      });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.status, "in_progress");

    const second = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "smoke_bo3_002",
        winnerPlayerId: "p1",
      });
    assert.equal(second.status, 201);
    assert.equal(second.body.data.decksByPlayer, undefined);
    assert.equal(second.body.data.status, "finished");
    assert.equal(second.body.data.winnerPlayerId, "p1");
  });
});
