import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Gameplay intents API contract", () => {
  test("rejects ZONE_CHANGE as gameplay intent", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId: "any_card",
            cardControllerId: "p1",
            source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
            destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
          },
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(
      response.body.error.message,
      "ZONE_CHANGE is an engine action, not a gameplay intent. Use a high-level intent that resolves into actions.",
    );
  });

  test("rejects unsupported gameplay intent type", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "DRAW_CARD",
          payload: {},
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.match(response.body.error.message, /Unsupported gameplay intent type/);
  });

  test("rejects gameplay intent when actor is not in match", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "unknown_player",
        intent: {
          type: "DRAW_CARD",
          payload: {},
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(response.body.error.message, "Actor must be one of the match players.");
  });

  test("rejects gameplay intents when current game is not ready", async () => {
    const created = await createMatch(app, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${created.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "DRAW_CARD",
          payload: {},
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(
      response.body.error.message,
      "Current game must be in ready status for gameplay intents.",
    );
  });
});
