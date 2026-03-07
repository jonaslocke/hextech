import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

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
2 Wind Wall
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

describe("Match creation", () => {
  test("US-1.1.1 creates a match with defined format and participants", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-1",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: deckList,
          p2: deckList,
        },
      });

    assert.equal(response.status, 201);
    assert.ok(response.body?.data?.id);
    assert.equal(response.body.data.format, "best-of-1");
    assert.equal(response.body.data.status, "setup_pending");
    assert.equal(response.body.data.players.length, 2);
    assert.deepEqual(response.body.data.score, { p1: 0, p2: 0 });
    assert.equal(response.body.data.currentGameNumber, 1);
    assert.equal(response.body.data.startingPlayerId, null);
    assert.ok(["p1", "p2"].includes(response.body.data.startingPlayerChooserId));
  });

  test("US-1.1.2 initializes games list and score tracking", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: deckList,
          p2: deckList,
        },
      });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data.games, []);
    assert.deepEqual(response.body.data.score, { p1: 0, p2: 0 });
  });

  test("POST /api/matches rejects invalid format", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-5",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: deckList,
          p2: deckList,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("POST /api/matches rejects missing or incorrect player count", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-1",
        players: [{ id: "p1", displayName: "Alice" }],
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("POST /api/matches rejects selected battlefields during match creation", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: deckList,
          p2: deckList,
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
