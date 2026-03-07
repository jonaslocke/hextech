import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

async function createMatch(format: "best-of-1" | "best-of-3" = "best-of-3") {
  const deckList = `Legend:
1 Ahri, Nine-Tailed Fox

Champion:
1 Ahri, Inquisitive

MainDeck:
3 Defy
3 En Garde
3 Stalwart Poro
3 Discipline
3 Stupefy
3 Ravenbloom Student
3 Sprite Mother
3 Thousand-Tailed Watcher
2 Charm
2 Clockwork Keeper
2 Rune Prison
2 Tasty Faefolk
2 Retreat
1 Find Your Center
1 Wind Wall
2 Sona, Harmonious
1 Ahri, Alluring

Battlefields:
1 Fortified Position
1 Grove of the God-Willow
1 The Dreaming Tree

Runes:
7 Calm Rune
5 Mind Rune

Sideboard:
1 Rune Prison
1 Wind Wall
1 Blitzcrank, Impassive
1 Riptide Rex
1 Retreat
1 Singularity
1 Unchecked Power
1 Fox-Fire`;
  const response = await request(app)
    .post("/api/matches")
    .send({
      format,
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
      decksByPlayer: {
        p1: deckList,
        p2: deckList,
      },
      selectedBattlefieldsByPlayer:
        format === "best-of-3"
          ? { p1: "Fortified Position", p2: "Grove of the God-Willow" }
          : undefined,
    });

  assert.equal(response.status, 201);
  return response.body.data;
}

test("US-1.1.2 records a game and updates score", async () => {
  const match = await createMatch();

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
      nextGameSelectedBattlefieldsByPlayer: {
        p1: "Grove of the God-Willow",
        p2: "The Dreaming Tree",
      },
    });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.data.games, ["game_001"]);
  assert.deepEqual(response.body.data.score, { p1: 1, p2: 0 });
});

test("POST /api/matches/:id/games finishes best-of-1 after one win", async () => {
  const match = await createMatch("best-of-1");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.status, "finished");
});

test("POST /api/matches/:id/games keeps best-of-3 running after one win", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
      nextGameSelectedBattlefieldsByPlayer: {
        p1: "Grove of the God-Willow",
        p2: "The Dreaming Tree",
      },
    });

  assert.equal(response.status, 201);
  assert.notEqual(response.body.data.status, "finished");
});

test("POST /api/matches/:id/games finishes best-of-3 after two wins", async () => {
  const match = await createMatch("best-of-3");

  const first = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
      nextGameSelectedBattlefieldsByPlayer: {
        p1: "Grove of the God-Willow",
        p2: "The Dreaming Tree",
      },
    });

  assert.equal(first.status, 201);

  const second = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_002",
      winnerPlayerId: "p1",
    });

  assert.equal(second.status, 201);
  assert.equal(second.body.data.status, "finished");
});

test("POST /api/matches/:id/games assigns currentGameId when next game starts", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
      nextGameSelectedBattlefieldsByPlayer: {
        p1: "Grove of the God-Willow",
        p2: "The Dreaming Tree",
      },
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.data.currentGameId);
  assert.notEqual(response.body.data.currentGameId, "game_001");
});

test("POST /api/matches/:id/games rejects unknown match id", async () => {
  const response = await request(app)
    .post("/api/matches/match_missing/games")
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 404);
  assert.equal(response.body?.error?.code, "NOT_FOUND");
});

test("POST /api/matches/:id/games rejects winner not in match", async () => {
  const match = await createMatch();

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p3",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});

test("POST /api/matches/:id/games rejects missing next game battlefields for best-of-3", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});

test("POST /api/matches/:id/games rejects reusing a battlefield in best-of-3", async () => {
  const match = await createMatch("best-of-3");

  const response = await request(app)
    .post(`/api/matches/${match.id}/games`)
    .send({
      gameId: "game_001",
      winnerPlayerId: "p1",
      nextGameSelectedBattlefieldsByPlayer: {
        p1: "Fortified Position",
        p2: "The Dreaming Tree",
      },
    });

  assert.equal(response.status, 400);
  assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
});
