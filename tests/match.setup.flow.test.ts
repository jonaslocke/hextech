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

describe("Match setup flow (beginning -> ready)", () => {
  test("completes setup to ready with happy and unhappy paths for each decision", async () => {
    const created = await request(app)
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

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "setup_pending");

    const matchId = created.body.data.id as string;
    const chooserId = created.body.data.startingPlayerChooserId as "p1" | "p2";
    const nonChooserId = chooserId === "p1" ? "p2" : "p1";

    // Champion decision: unhappy path (invalid player)
    const championUnhappy = await request(app)
      .post(`/api/matches/${matchId}/setup/champion`)
      .send({ playerId: "p3" });

    assert.equal(championUnhappy.status, 400);
    assert.equal(championUnhappy.body?.error?.code, "VALIDATION_ERROR");

    // Champion decision: happy path
    const championP1 = await request(app)
      .post(`/api/matches/${matchId}/setup/champion`)
      .send({ playerId: "p1" });
    assert.equal(championP1.status, 201);
    assert.equal(championP1.body.data.chosenChampionByPlayer.p1, "Ahri, Inquisitive");

    const championP2 = await request(app)
      .post(`/api/matches/${matchId}/setup/champion`)
      .send({ playerId: "p2" });
    assert.equal(championP2.status, 201);
    assert.equal(championP2.body.data.chosenChampionByPlayer.p2, "Ahri, Inquisitive");

    // Battlefield decision: unhappy path (selection not in roster)
    const battlefieldUnhappy = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Shadow Isles" });

    assert.equal(battlefieldUnhappy.status, 400);
    assert.equal(battlefieldUnhappy.body?.error?.code, "VALIDATION_ERROR");

    // Battlefield decision: happy path
    const battlefieldP1 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: "Fortified Position" });
    assert.equal(battlefieldP1.status, 201);
    assert.equal(
      battlefieldP1.body.data.selectedBattlefieldsByPlayer.p1,
      "Fortified Position",
    );

    const battlefieldP2 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p2", battlefield: "Grove of the God-Willow" });
    assert.equal(battlefieldP2.status, 201);
    assert.equal(
      battlefieldP2.body.data.selectedBattlefieldsByPlayer.p2,
      "Grove of the God-Willow",
    );

    // Starting player decision: unhappy path (non-chooser attempts to pick)
    const startingPlayerUnhappy = await request(app)
      .post(`/api/matches/${matchId}/setup/starting-player`)
      .send({ playerId: nonChooserId, startingPlayerId: nonChooserId });

    assert.equal(startingPlayerUnhappy.status, 400);
    assert.equal(startingPlayerUnhappy.body?.error?.code, "VALIDATION_ERROR");

    // Starting player decision: happy path (chooser selects)
    const startingPlayerHappy = await request(app)
      .post(`/api/matches/${matchId}/setup/starting-player`)
      .send({ playerId: chooserId, startingPlayerId: "p1" });

    assert.equal(startingPlayerHappy.status, 201);
    assert.equal(startingPlayerHappy.body.data.startingPlayerId, "p1");
    assert.equal(startingPlayerHappy.body.data.status, "ready");
    assert.equal(startingPlayerHappy.body.data.currentGameNumber, 1);
  });
});
