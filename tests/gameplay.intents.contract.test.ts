import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Gameplay intent API cutover contract", () => {
  test("gameplay intent endpoint is not available", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3", { startingPlayerId: "p1" });

    const response = await request(app)
      .post(`/api/matches/${ready.id}/gameplay/intents`)
      .send({
        actorPlayerId: "p1",
        intent: { type: "DRAW_CARD", payload: {} },
      });

    assert.equal(response.status, 404);
  });
});
