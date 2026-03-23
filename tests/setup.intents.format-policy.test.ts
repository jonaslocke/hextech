import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMatch, validDeckList } from "./helpers/match-test-helpers.js";

const app = createApp();

const reconfigurableDeckList = validDeckList.replace(
  "1 Fox-Fire",
  "1 Ahri, Alluring",
);

const reconfiguredDeckList = reconfigurableDeckList
  .replace("Champion:\n1 Ahri, Inquisitive", "Champion:\n1 Ahri, Alluring")
  .replace("1 Ahri, Alluring\n\nBattlefields:", "1 Ahri, Inquisitive\n\nBattlefields:");

async function createBestOf3MatchWithReconfigurableDeck() {
  const created = await request(app)
    .post("/api/matches")
    .send({
      format: "best-of-3",
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
      decksByPlayer: {
        p1: reconfigurableDeckList,
        p2: reconfigurableDeckList,
      },
    });

  assert.equal(created.status, 201);
  return created.body.data as { id: string; startingPlayerChooserId: "p1" | "p2" };
}

async function advanceBestOf3ToGame2Setup(matchId: string, chooserId: "p1" | "p2") {
  const championP1 = await request(app)
    .post(`/api/matches/${matchId}/setup/champion`)
    .send({ playerId: "p1" });
  assert.equal(championP1.status, 201);

  const championP2 = await request(app)
    .post(`/api/matches/${matchId}/setup/champion`)
    .send({ playerId: "p2" });
  assert.equal(championP2.status, 201);

  const battlefieldP1 = await request(app)
    .post(`/api/matches/${matchId}/setup/battlefield`)
    .send({ playerId: "p1", battlefield: "Fortified Position" });
  assert.equal(battlefieldP1.status, 201);

  const battlefieldP2 = await request(app)
    .post(`/api/matches/${matchId}/setup/battlefield`)
    .send({ playerId: "p2", battlefield: "Grove of the God-Willow" });
  assert.equal(battlefieldP2.status, 201);

  const ready = await request(app)
    .post(`/api/matches/${matchId}/setup/starting-player`)
    .send({ playerId: chooserId, startingPlayerId: "p1" });
  assert.equal(ready.status, 201);
  assert.equal(ready.body.data.status, "ready");

  const reported = await request(app)
    .post(`/api/matches/${matchId}/games`)
    .send({ winnerPlayerId: "p1", actorPlayerId: "p1" });
  assert.equal(reported.status, 201);
  assert.equal(reported.body.data.status, "setup_pending");
  assert.equal(reported.body.data.currentGame.number, 2);
}

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

  test("best-of-3 game 1 rejects deck reconfiguration during chosen champion setup", async () => {
    const match = await createBestOf3MatchWithReconfigurableDeck();

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1", deckList: reconfiguredDeckList });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("best-of-3 game 2 accepts deck reconfiguration during chosen champion setup", async () => {
    const match = await createBestOf3MatchWithReconfigurableDeck();
    await advanceBestOf3ToGame2Setup(match.id, match.startingPlayerChooserId);

    const configured = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1", deckList: reconfiguredDeckList });

    assert.equal(configured.status, 201);
    assert.equal(
      configured.body.data.currentGame.chosenChampionByPlayer.p1,
      "Ahri, Alluring",
    );
  });

  test("best-of-1 rejects deck reconfiguration during chosen champion setup", async () => {
    const match = await createMatch(app, "best-of-1");

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1", deckList: reconfiguredDeckList });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("best-of-3 rejects reconfiguration that changes rune section in game 2", async () => {
    const match = await createBestOf3MatchWithReconfigurableDeck();
    await advanceBestOf3ToGame2Setup(match.id, match.startingPlayerChooserId);

    const invalidDeck = reconfiguredDeckList.replace(
      "7 Calm Rune\n5 Mind Rune",
      "6 Calm Rune\n6 Mind Rune",
    );

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1", deckList: invalidDeck });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
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
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p1.mainDeck.length, 39);
    assert.equal(ready.body.data.currentGame.gameplay.zones.players.p2.mainDeck.length, 39);
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
    assert.equal(ready.body.data.currentGame.gameplay.zones.shared.battlefield.cards.length, 2);
    const facedownBattlefieldSlots = Object.values(
      ready.body.data.currentGame.gameplay.zones.shared.battlefield.hiddenCardsByBattlefield,
    );
    assert.equal(facedownBattlefieldSlots.length, 2);
    assert.ok(facedownBattlefieldSlots.every((cards: string[]) => cards.length === 0));
  });
});
