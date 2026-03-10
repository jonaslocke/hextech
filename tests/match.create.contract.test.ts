import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, validDeckList } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Match creation contract", () => {
  test("creates an initial game and links it through currentGameId", async () => {
    const match = await createMatch(app, "best-of-3");

    assert.equal(match.status, "setup_pending");
    assert.equal(match.version, 1);
    assert.ok(match.currentGameId);
    assert.equal(match.gameIds.length, 1);
    assert.equal(match.currentGame.id, match.currentGameId);
    assert.equal(match.currentGame.matchId, match.id);
    assert.equal(match.currentGame.number, 1);
    assert.equal(match.currentGame.version, 1);
    assert.deepEqual(match.games, []);
    assert.deepEqual(match.completedGames, []);
    assert.deepEqual(match.score, { p1: 0, p2: 0 });
  });

  test("rejects invalid format", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-5",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: validDeckList,
          p2: validDeckList,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
