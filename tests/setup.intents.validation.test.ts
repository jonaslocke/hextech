import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Setup intents validation matrix", () => {
  test("returns not found when setup intent targets an unknown match", async () => {
    const response = await request(app)
      .post("/api/matches/match_does_not_exist/setup/champion")
      .send({ playerId: "p1" });

    assert.equal(response.status, 404);
    assert.equal(response.body?.error?.code, "NOT_FOUND");
  });

  test("rejects champion intent without playerId", async () => {
    const match = await createMatch(app, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects champion intent for player outside the match", async () => {
    const match = await createMatch(app, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p3" });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects repeated battlefield intent for the same player", async () => {
    const match = await createMatch(app, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Grove of the God-Willow" });

    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects repeated starting player intent before setup completes", async () => {
    const match = await createMatch(app, "best-of-3");
    const chooserId = match.startingPlayerChooserId as "p1" | "p2";

    const first = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: chooserId });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.status, "setup_pending");

    const second = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: chooserId });

    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects starting player intent when startingPlayerId is not a match player", async () => {
    const match = await createMatch(app, "best-of-3");
    const chooserId = match.startingPlayerChooserId as "p1" | "p2";

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: "p3" });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});

