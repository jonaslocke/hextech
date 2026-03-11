import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Get match contract", () => {
  test("returns match by id", async () => {
    const created = await createMatch(app, "best-of-3");

    const response = await request(app).get(`/api/matches/${created.id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, created.id);
    assert.equal(response.body.data.decksByPlayer, undefined);
    assert.equal(response.body.data.currentGame.deckStateByPlayer, undefined);
  });

  test("returns not found for unknown match id", async () => {
    const response = await request(app).get("/api/matches/match_does_not_exist");

    assert.equal(response.status, 404);
    assert.equal(response.body?.error?.code, "NOT_FOUND");
  });
});
