import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

export type TestMatchFormat = "best-of-1" | "best-of-3";
export type TestPlayerId = "p1" | "p2";

interface SetupMatchToReadyOptions {
  startingPlayerId?: TestPlayerId;
  battlefieldByPlayer?: Record<TestPlayerId, string>;
}

export const validDeckList = `Legend:
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
1 Sona, Harmonious
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

export async function createMatch(
  app: Express,
  format: TestMatchFormat = "best-of-3",
) {
  const response = await request(app)
    .post("/api/matches")
    .send({
      format,
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
      decksByPlayer: {
        p1: validDeckList,
        p2: validDeckList,
      },
    });

  assert.equal(response.status, 201);
  return response.body.data;
}

export async function setupMatchToReady(
  app: Express,
  matchId: string,
  format: TestMatchFormat,
  options: SetupMatchToReadyOptions = {},
) {
  const { startingPlayerId, battlefieldByPlayer } = options;

  const championP1 = await request(app)
    .post(`/api/matches/${matchId}/setup/champion`)
    .send({ playerId: "p1" });
  assert.equal(championP1.status, 201);

  const championP2 = await request(app)
    .post(`/api/matches/${matchId}/setup/champion`)
    .send({ playerId: "p2" });
  assert.equal(championP2.status, 201);

  if (format === "best-of-1") {
    const battlefieldP1 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p1" });
    assert.equal(battlefieldP1.status, 201);

    const battlefieldP2 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p2" });
    assert.equal(battlefieldP2.status, 201);
  } else {
    const p1Battlefield =
      battlefieldByPlayer?.p1 ?? "Fortified Position";
    const p2Battlefield =
      battlefieldByPlayer?.p2 ?? "Grove of the God-Willow";

    const battlefieldP1 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p1", battlefield: p1Battlefield });
    assert.equal(battlefieldP1.status, 201);

    const battlefieldP2 = await request(app)
      .post(`/api/matches/${matchId}/setup/battlefield`)
      .send({ playerId: "p2", battlefield: p2Battlefield });
    assert.equal(battlefieldP2.status, 201);
  }

  const fetched = await request(app).get(`/api/matches/${matchId}`);
  assert.equal(fetched.status, 200);
  const chooserId = fetched.body.data.startingPlayerChooserId as TestPlayerId;

  const startingPlayer = await request(app)
    .post(`/api/matches/${matchId}/setup/starting-player`)
    .send({
      playerId: chooserId,
      startingPlayerId: startingPlayerId ?? chooserId,
    });

  assert.equal(startingPlayer.status, 201);
  assert.equal(startingPlayer.body.data.status, "ready");

  return startingPlayer.body.data;
}
