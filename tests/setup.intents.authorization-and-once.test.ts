import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Setup intents authorization and one-shot", () => {
  test("rejects repeated champion intent for same player", async () => {
    const match = await createMatch(app, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });
    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("allows only chooser to select starting player", async () => {
    const match = await createMatch(app, "best-of-3");

    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p2" });
    await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });
    await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p2", battlefield: "Grove of the God-Willow" });

    const chooserId = match.startingPlayerChooserId as "p1" | "p2";
    const nonChooserId = chooserId === "p1" ? "p2" : "p1";

    const denied = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: nonChooserId, startingPlayerId: nonChooserId });
    assert.equal(denied.status, 400);
    assert.equal(denied.body?.error?.code, "VALIDATION_ERROR");

    const accepted = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: chooserId });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.decksByPlayer, undefined);
    assert.equal(accepted.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(accepted.body.data.currentGame.startingPlayerId, chooserId);
  });

  test("rejects setup intents once match is no longer setup_pending", async () => {
    const match = await createMatch(app, "best-of-1");

    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p2" });
    await request(app).post(`/api/matches/${match.id}/setup/battlefield`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${match.id}/setup/battlefield`).send({ playerId: "p2" });
    const chooserId = match.startingPlayerChooserId as "p1" | "p2";
    await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: chooserId });

    const result = await request(app)
      .post(`/api/matches/${match.id}/games`)
      .send({
        gameId: "game_report_001",
        winnerPlayerId: "p1",
      });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.status, "finished");

    const afterFinished = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });
    assert.equal(afterFinished.status, 400);
    assert.equal(afterFinished.body?.error?.code, "VALIDATION_ERROR");
  });
});
