import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Battlefield history across games", () => {
  test("rejects reusing a battlefield in best-of-3", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
        nextGameSelectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "The Dreaming Tree",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("tracks used battlefields by player as games progress", async () => {
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
    assert.deepEqual(first.body.data.battlefieldsUsedByPlayer, {
      p1: ["Fortified Position", "Grove of the God-Willow"],
      p2: ["Grove of the God-Willow", "The Dreaming Tree"],
    });
  });
});
