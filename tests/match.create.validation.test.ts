import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { validDeckList } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Match creation validation", () => {
  test("rejects selectedBattlefieldsByPlayer during creation", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: validDeckList,
          p2: validDeckList,
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects creating a match with less than 2 players", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [{ id: "p1", displayName: "Alice" }],
        decksByPlayer: {
          p1: validDeckList,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects creating a match with duplicate player ids", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p1", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: validDeckList,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects creating a match without decksByPlayer", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects creating a match when one player's deck is missing", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: validDeckList,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
