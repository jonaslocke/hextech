import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Report result best-of-3 flow", () => {
  test("game1 result advances to game2 and preserves setup continuity", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
        nextGameSelectedBattlefieldsByPlayer: {
          p1: "Grove of the God-Willow",
          p2: "The Dreaming Tree",
        },
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "in_progress");
    assert.deepEqual(response.body.data.score, { p1: 1, p2: 0 });
    assert.equal(response.body.data.currentGame.number, 2);
    assert.equal(response.body.data.currentGame.status, "ready");
    assert.deepEqual(response.body.data.currentGame.chosenChampionByPlayer, {
      p1: "Ahri, Inquisitive",
      p2: "Ahri, Inquisitive",
    });
  });

  test("second win finishes best-of-3 match", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
        nextGameSelectedBattlefieldsByPlayer: {
          p1: "Grove of the God-Willow",
          p2: "The Dreaming Tree",
        },
      });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_002",
        winnerPlayerId: "p1",
      });

    assert.equal(second.status, 201);
    assert.equal(second.body.data.status, "finished");
    assert.equal(second.body.data.winnerPlayerId, "p1");
    assert.deepEqual(second.body.data.score, { p1: 2, p2: 0 });
    assert.equal(second.body.data.completedGames.length, 2);
  });

  test("requires next game battlefields while match is still running", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
