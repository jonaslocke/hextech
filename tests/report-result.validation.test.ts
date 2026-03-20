import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Report result validation matrix", () => {
  test("rejects reporting without winnerPlayerId", async () => {
    const created = await createMatch(app, "best-of-1");
    const ready = await setupMatchToReady(app, created.id, "best-of-1");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects winner outside match players", async () => {
    const created = await createMatch(app, "best-of-1");
    const ready = await setupMatchToReady(app, created.id, "best-of-1");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({ winnerPlayerId: "p3", actorPlayerId: "p1" });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("returns not found when reporting result for unknown match", async () => {
    const response = await request(app)
      .post("/api/matches/match_does_not_exist/games")
      .send({ winnerPlayerId: "p1", actorPlayerId: "p1" });

    assert.equal(response.status, 404);
    assert.equal(response.body?.error?.code, "NOT_FOUND");
  });
});


