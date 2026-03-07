import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

const baseDeck = (battlefields: string[]) => `Legend:
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
${battlefields.map((battlefield) => `1 ${battlefield}`).join("\n")}

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

const deckWithoutBattlefields = `Legend:
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

describe("Match setup", () => {
  test("US-1.1.1 creates a match with format and participants", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 201);
    const match = response.body.data;
    const playerIds = match.players.map((player: { id: string }) => player.id);

    assert.equal(match.format, "best-of-3");
    assert.equal(match.status, "ready");
    assert.deepEqual(playerIds.sort(), ["p1", "p2"]);
    assert.ok(["p1", "p2"].includes(match.startingPlayerId));
    assert.deepEqual(match.score, { p1: 0, p2: 0 });
    assert.deepEqual(match.games, []);
    assert.ok(match.decksByPlayer?.p1?.includes("Battlefields:"));
    assert.ok(match.decksByPlayer?.p2?.includes("Battlefields:"));
    assert.deepEqual(match.battlefieldsByPlayer.p1, [
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);
    assert.deepEqual(match.battlefieldsByPlayer.p2, [
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);
    assert.deepEqual(match.selectedBattlefieldsByPlayer, {
      p1: "Fortified Position",
      p2: "Grove of the God-Willow",
    });
    assert.deepEqual(match.battlefieldsUsedByPlayer, {
      p1: ["Fortified Position"],
      p2: ["Grove of the God-Willow"],
    });
  });

  test("creates best-of-1 match selecting random battlefields for each player", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-1",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
      });

    assert.equal(response.status, 201);
    const match = response.body.data;
    const validBattlefields = new Set([
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);

    assert.ok(validBattlefields.has(match.selectedBattlefieldsByPlayer.p1));
    assert.ok(validBattlefields.has(match.selectedBattlefieldsByPlayer.p2));
    assert.deepEqual(match.battlefieldsUsedByPlayer.p1, [
      match.selectedBattlefieldsByPlayer.p1,
    ]);
    assert.deepEqual(match.battlefieldsUsedByPlayer.p2, [
      match.selectedBattlefieldsByPlayer.p2,
    ]);
  });

  test("rejects decks without battlefields section", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: deckWithoutBattlefields,
          p2: deckWithoutBattlefields,
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects decks without exactly three battlefields", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck(["Fortified Position", "Grove of the God-Willow"]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects decks with duplicate battlefields", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck([
            "Fortified Position",
            "The Dreaming Tree",
            "The Dreaming Tree",
          ]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
        selectedBattlefieldsByPlayer: {
          p1: "Fortified Position",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects best-of-3 without selected battlefields", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("rejects best-of-3 selections not in roster", async () => {
    const response = await request(app)
      .post("/api/matches")
      .send({
        format: "best-of-3",
        players: [
          { id: "p1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        decksByPlayer: {
          p1: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
          p2: baseDeck([
            "Fortified Position",
            "Grove of the God-Willow",
            "The Dreaming Tree",
          ]),
        },
        selectedBattlefieldsByPlayer: {
          p1: "Shadow Isles",
          p2: "Grove of the God-Willow",
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });
});
