import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

test("POST /api/matches creates a match with defined format and participants", async () => {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format: "best-of-1",
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
    });

  assert.equal(response.status, 201);
  assert.ok(response.body?.data?.id);
  assert.equal(response.body.data.format, "best-of-1");
  assert.equal(response.body.data.status, "waiting");
  assert.equal(response.body.data.players.length, 2);
  assert.deepEqual(response.body.data.score, { p1: 0, p2: 0 });
});

test("POST /api/matches initializes games list and score tracking", async () => {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format: "best-of-3",
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
    });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.data.games, []);
  assert.deepEqual(response.body.data.score, { p1: 0, p2: 0 });
});

test("POST /api/matches rejects invalid format", async () => {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format: "best-of-5",
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});

test("POST /api/matches rejects missing or incorrect player count", async () => {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format: "best-of-1",
      players: [{ id: "p1", displayName: "Alice" }],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});
