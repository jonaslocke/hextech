import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Report result best-of-1 flow", () => {
  test("single reported win finishes game and match", async () => {
    const created = await createMatch(app, "best-of-1");
    const ready = await setupMatchToReady(app, created.id, "best-of-1");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.decksByPlayer, undefined);
    assert.equal(response.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(response.body.data.status, "finished");
    assert.equal(response.body.data.winnerPlayerId, "p1");
    assert.deepEqual(response.body.data.score, { p1: 1, p2: 0 });
    assert.equal(response.body.data.completedGames.length, 1);
    assert.equal(response.body.data.currentGame.winnerPlayerId, "p1");
  });

  test("rejects reporting another result once match is finished", async () => {
    const created = await createMatch(app, "best-of-1");
    const ready = await setupMatchToReady(app, created.id, "best-of-1");

    const first = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1",
      });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1",
      });
    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects reporting a result before setup is complete", async () => {
    const created = await createMatch(app, "best-of-1");

    const response = await request(app)
      .post(`/api/matches/${created.id}/games`)
      .send({
        winnerPlayerId: "p1",
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
