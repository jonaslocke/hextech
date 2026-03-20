import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Battlefield history across games", () => {
  test("rejects reusing a battlefield in next game setup for best-of-3", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const reported = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });
    assert.equal(reported.status, 201);

    await request(app).post(`/api/matches/${ready.id}/setup/champion`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${ready.id}/setup/champion`).send({ playerId: "p2" });

    const response = await request(app)
      .post(`/api/matches/${ready.id}/setup/battlefield`)
      .send({
        playerId: "p1",
        battlefield: "Fortified Position",
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
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });

    assert.equal(first.status, 201);
    assert.deepEqual(first.body.data.battlefieldPoolByPlayer, {
      p1: [
        { name: "Fortified Position", used: true },
        { name: "Grove of the God-Willow", used: false },
        { name: "The Dreaming Tree", used: false },
      ],
      p2: [
        { name: "Fortified Position", used: false },
        { name: "Grove of the God-Willow", used: true },
        { name: "The Dreaming Tree", used: false },
      ],
    });
  });
});

