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

async function createMatch(format: "best-of-1" | "best-of-3" = "best-of-3") {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format,
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
  return response.body.data;
}

describe("Match setup", () => {
  test("creates a setup_pending match without setup decisions resolved", async () => {
    const match = await createMatch("best-of-3");

    assert.equal(match.format, "best-of-3");
    assert.equal(match.status, "setup_pending");
    assert.equal(match.startingPlayerId, null);
    assert.ok(["p1", "p2"].includes(match.startingPlayerChooserId));
    assert.deepEqual(match.selectedBattlefieldsByPlayer, {});
    assert.deepEqual(match.chosenChampionByPlayer, {});
    assert.deepEqual(match.battlefieldsUsedByPlayer, { p1: [], p2: [] });
  });

  test("rejects selected battlefields at creation", async () => {
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

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
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
      });

    assert.equal(response.status, 400);
    assert.equal(response.body?.error?.code, "VALIDATION_ERROR");
  });

  test("selects champion from decklist and rejects repeated intent", async () => {
    const match = await createMatch("best-of-3");

    const first = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });

    assert.equal(first.status, 201);
    assert.equal(first.body.data.chosenChampionByPlayer.p1, "Ahri, Inquisitive");

    const second = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });

    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("best-of-3 battlefield intent validates roster and one-shot behavior", async () => {
    const match = await createMatch("best-of-3");

    const invalid = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Shadow Isles" });

    assert.equal(invalid.status, 400);
    assert.equal(invalid.body?.error?.code, "VALIDATION_ERROR");

    const first = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });

    assert.equal(first.status, 201);
    assert.equal(first.body.data.selectedBattlefieldsByPlayer.p1, "Fortified Position");

    const second = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Grove of the God-Willow" });

    assert.equal(second.status, 400);
    assert.equal(second.body?.error?.code, "VALIDATION_ERROR");
  });

  test("best-of-1 battlefield intent randomizes selection from player roster", async () => {
    const match = await createMatch("best-of-1");
    const validBattlefields = new Set([
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);

    const response = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });

    assert.equal(response.status, 201);
    assert.ok(validBattlefields.has(response.body.data.selectedBattlefieldsByPlayer.p1));
  });

  test("only chooser can select starting player and setup completes to ready", async () => {
    const match = await createMatch("best-of-3");
    const chooserId = match.startingPlayerChooserId as "p1" | "p2";
    const nonChooserId = chooserId === "p1" ? "p2" : "p1";

    const championP1 = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p1" });
    assert.equal(championP1.status, 201);

    const championP2 = await request(app)
      .post(`/api/matches/${match.id}/setup/champion`)
      .send({ playerId: "p2" });
    assert.equal(championP2.status, 201);

    const battlefieldP1 = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });
    assert.equal(battlefieldP1.status, 201);

    const battlefieldP2 = await request(app)
      .post(`/api/matches/${match.id}/setup/battlefield`)
      .send({ playerId: "p2", battlefield: "Grove of the God-Willow" });
    assert.equal(battlefieldP2.status, 201);

    const denied = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: nonChooserId, startingPlayerId: nonChooserId });

    assert.equal(denied.status, 400);
    assert.equal(denied.body?.error?.code, "VALIDATION_ERROR");

    const accepted = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: "p1" });

    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.startingPlayerId, "p1");
    assert.equal(accepted.body.data.status, "ready");

    const repeated = await request(app)
      .post(`/api/matches/${match.id}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: "p2" });

    assert.equal(repeated.status, 400);
    assert.equal(repeated.body?.error?.code, "VALIDATION_ERROR");
  });
});
