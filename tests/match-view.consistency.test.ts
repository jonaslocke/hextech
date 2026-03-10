import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Match view consistency", () => {
  test("keeps game linkage and score projection consistent", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const reported = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
        nextGameSelectedBattlefieldsByPlayer: {
          p1: "Grove of the God-Willow",
          p2: "The Dreaming Tree",
        },
      });
    assert.equal(reported.status, 201);

    const response = await request(app).get(`/api/matches/${ready.id}`);
    assert.equal(response.status, 200);
    const match = response.body.data;

    assert.ok(match.currentGameId);
    assert.ok(match.gameIds.includes(match.currentGameId));
    assert.equal(match.currentGame.id, match.currentGameId);
    assert.equal(match.currentGameNumber, match.currentGame.number);
    assert.ok(Array.isArray(match.completedGames));

    const projectedScore = { p1: 0, p2: 0 };
    for (const game of match.completedGames) {
      if (game.winnerPlayerId && projectedScore[game.winnerPlayerId] !== undefined) {
        projectedScore[game.winnerPlayerId] += 1;
      }
    }
    assert.deepEqual(match.score, projectedScore);
  });
});
