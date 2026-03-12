import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Setup intents format policy", () => {
  test("best-of-1 picks battlefield from player roster", async () => {
    const match = await createMatch(app, "best-of-1");
    const validBattlefields = new Set([
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);

    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p2" });

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.decksByPlayer, undefined);
    assert.equal(response.body.data.currentGame.deckStateByPlayer, undefined);
    assert.ok(
      validBattlefields.has(response.body.data.currentGame.selectedBattlefieldsByPlayer.p1),
    );
  });

  test("best-of-3 requires explicit battlefield selection from roster", async () => {
    const match = await createMatch(app, "best-of-3");

    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p1" });
    await request(app).post(`/api/matches/${match.id}/setup/champion`).send({ playerId: "p2" });

    const missing = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1" });
    assert.equal(missing.status, 400);
    assert.equal(missing.body?.error?.code, "VALIDATION_ERROR");

    const invalid = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Shadow Isles" });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body?.error?.code, "VALIDATION_ERROR");

    const valid = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });
    assert.equal(valid.status, 201);
    assert.equal(valid.body.data.decksByPlayer, undefined);
    assert.equal(valid.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(
      valid.body.data.currentGame.selectedBattlefieldsByPlayer.p1,
      "Fortified Position",
    );
  });

  test("setup completion transitions match and game to ready", async () => {
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

    const ready = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: "p1" });

    assert.equal(ready.status, 201);
    assert.equal(ready.body.data.decksByPlayer, undefined);
    assert.equal(ready.body.data.currentGame.deckStateByPlayer, undefined);
    assert.equal(ready.body.data.status, "ready");
    assert.equal(ready.body.data.currentGame.status, "ready");
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p1.mainDeck.length, 40);
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p2.mainDeck.length, 40);
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p1.runeDeck.length, 12);
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p2.runeDeck.length, 12);
    assert.equal(
      ready.body.data.currentGame.gameplay.zones.players.p1.championZone.length,
      1,
    );
    assert.equal(
      ready.body.data.currentGame.gameplay.zones.players.p2.championZone.length,
      1,
    );
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p1.legendZone.length, 1);
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p2.legendZone.length, 1);
    assert.equal(ready.body.data.currentGame.gameplay.zones.shared.battlefield.length, 2);
    const facedownBattlefieldSlots = Object.values(
      ready.body.data.currentGame.gameplay.zones.shared.facedownByBattlefield,
    );
    assert.equal(facedownBattlefieldSlots.length, 2);
    assert.ok(facedownBattlefieldSlots.every((cards: string[]) => cards.length === 0));
  });
});
