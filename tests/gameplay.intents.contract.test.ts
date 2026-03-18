import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Gameplay intents API contract", () => {
  test("accepts ZONE_CHANGE intent through production gameplay endpoint", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });
    const cardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    assert.ok(cardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId,
            cardControllerId: "p1",
            source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
            destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
          },
        },
      });

    assert.equal(response.status, 201);
    const hand = response.body.data.currentGame.gameplay.zones.players.p1.hand;
    assert.ok(Array.isArray(hand));
    assert.ok(hand.includes(cardId));
    const events = response.body.data.currentGame.gameplay.events;
    assert.equal(events[events.length - 2]?.type, "zone_changed");
    assert.equal(events[events.length - 1]?.type, "intent_resolved");
    assert.equal(events[events.length - 1]?.details?.sequence, "1");
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

  test("rejects gameplay intent when actor does not match card controller", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });
    const cardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    assert.ok(cardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId,
            cardControllerId: "p2",
            source: { kind: "player_zone", playerId: "p1", zone: "mainDeck" },
            destination: { kind: "player_zone", playerId: "p1", zone: "hand" },
          },
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(
      response.body.error.message,
      "Actor must match cardControllerId for ZONE_CHANGE intent in this phase.",
    );
  });

  test("rejects gameplay intents when current game is not ready", async () => {
    const created = await createMatch(app, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${created.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId: "synthetic_card",
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
      "Current game must be in ready status for gameplay intents.",
    );
  });

  test("rejects gameplay intent when actor is not the priority player", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });
    const cardId = ready.currentGame.gameplay.zones.players.p2.mainDeck[0] ?? null;
    assert.ok(cardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p2",
        intent: {
          type: "ZONE_CHANGE",
          payload: {
            cardId,
            cardControllerId: "p2",
            source: { kind: "player_zone", playerId: "p2", zone: "mainDeck" },
            destination: { kind: "player_zone", playerId: "p2", zone: "hand" },
          },
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(
      response.body.error.message,
      "Only the priority player can submit gameplay intents.",
    );
  });

  test("rejects gameplay intent when expected sequence mismatches kernel state", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", {
      startingPlayerId: "p1",
    });
    const cardId = ready.currentGame.gameplay.zones.players.p1.mainDeck[0] ?? null;
    assert.ok(cardId);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: {
          type: "ZONE_CHANGE",
          expectedSequence: 2,
          payload: {
            cardId,
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
      "Intent sequence mismatch. Expected 1, received 2.",
    );
  });
});
