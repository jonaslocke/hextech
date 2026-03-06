import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

async function createMatch(format: "best-of-1" | "best-of-3" = "best-of-3") {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format,
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
    });

  assert.equal(response.status, 201);
  return response.body.data;
}

test("POST /api/matches/:id/games records a game and updates score", async () => {
  const match = await createMatch();

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.data.games, ["game_001"]);
  assert.deepEqual(response.body.data.score, { p1: 1, p2: 0 });
});

test("POST /api/matches/:id/games finishes best-of-1 after one win", async () => {
  const match = await createMatch("best-of-1");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.status, "finished");
});

test("POST /api/matches/:id/games keeps best-of-3 running after one win", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 201);
  assert.notEqual(response.body.data.status, "finished");
});

test("POST /api/matches/:id/games finishes best-of-3 after two wins", async () => {
  const match = await createMatch("best-of-3");

  const first = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(first.status, 201);

  const second = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_002",
      winnerPlayerId: "p1",
    });

  assert.equal(second.status, 201);
  assert.equal(second.body.data.status, "finished");
});

test("POST /api/matches/:id/games assigns currentGameId when next game starts", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.data.currentGameId);
  assert.notEqual(response.body.data.currentGameId, "game_001");
});

test("POST /api/matches/:id/games rejects unknown match id", async () => {
  const response = await request(app)
    .post("/api/matches/match_missing/games")
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 404);
  assert.equal(response.body?.error?.code, "NOT_FOUND");
});

test("POST /api/matches/:id/games rejects winner not in match", async () => {
  const match = await createMatch();

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p3",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});
