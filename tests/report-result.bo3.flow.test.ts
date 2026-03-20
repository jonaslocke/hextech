import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, setupMatchToReady } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Report result best-of-3 flow", () => {
  test("game1 result advances to game2 setup and picks loser as chooser", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.decksByPlayer, undefined);
    assert.equal(response.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(response.body.data.status, "setup_pending");
    assert.deepEqual(response.body.data.score, { p1: 1, p2: 0 });
    assert.equal(response.body.data.currentGame.number, 2);
    assert.equal(response.body.data.currentGame.status, "setup_pending");
    assert.deepEqual(response.body.data.currentGame.chosenChampionByPlayer, {});
    assert.deepEqual(response.body.data.currentGame.selectedBattlefieldsByPlayer, {});
    assert.equal(response.body.data.currentGame.startingPlayerId, null);
    assert.equal(response.body.data.startingPlayerChooserId, "p2");
  });

  test("second win finishes best-of-3 match", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });
    assert.equal(first.status, 201);

    const game2Ready = await setupMatchToReady(app, ready.id, "best-of-3", {
      battlefieldByPlayer: {
        p1: "Grove of the God-Willow",
        p2: "The Dreaming Tree",
      },
    });
    assert.equal(game2Ready.status, "ready");

    const second = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });

    assert.equal(second.status, 201);
    assert.equal(second.body.data.decksByPlayer, undefined);
    assert.equal(second.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(second.body.data.status, "finished");
    assert.equal(second.body.data.winnerPlayerId, "p1");
    assert.deepEqual(second.body.data.score, { p1: 2, p2: 0 });
    assert.equal(second.body.data.completedGames.length, 2);
  });

  test("rejects reporting another result while next game setup is pending", async () => {
    const created = await createMatch(app, "best-of-3");
    const ready = await setupMatchToReady(app, created.id, "best-of-3");

    const first = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });
    assert.equal(first.status, 201);

    const response = await request(app)
      .post(`/api/matches/${ready.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});

