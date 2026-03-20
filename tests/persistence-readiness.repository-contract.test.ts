import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { GameFactory } from "../src/domain/game.factory.js";
import { MatchFactory } from "../src/domain/match.factory.js";
import { InMemoryGameRepository } from "../src/infrastructure/repositories/in-memory-game.repository.js";
import { InMemoryMatchRepository } from "../src/infrastructure/repositories/in-memory-match.repository.js";
import { createMatch, setupMatchToReady, validDeckList } from "./helpers/match-test-helpers.js";

const app = createApp();

describe("Persistence readiness repository contracts", () => {
  test("match repository round-trips aggregate state", async () => {
    const match = MatchFactory.create({
      format: "best-of-3",
      players: [
        { id: "p1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
      decksByPlayer: {
        p1: validDeckList,
        p2: validDeckList,
      },
    });
    match.gameIds.push("game_001");
    match.version = 7;

    const repo = new InMemoryMatchRepository();
    await repo.save(match);

    const loaded = await repo.findById(match.id);
    assert.ok(loaded);
    assert.equal(loaded?.id, match.id);
    assert.deepEqual(loaded?.gameIds, ["game_001"]);
    assert.equal(loaded?.version, 7);
  });

  test("game repository findByIds preserves input order and ignores missing ids", async () => {
    const repo = new InMemoryGameRepository();
    const game1 = GameFactory.create({ matchId: "m1", number: 1 });
    const game2 = GameFactory.create({ matchId: "m1", number: 2 });

    assert.deepEqual(game1.gameplay.zones.players, {});
    assert.deepEqual(game1.gameplay.events, []);

    await repo.save(game1);
    await repo.save(game2);

    const ordered = await repo.findByIds([game2.id, "missing", game1.id]);
    assert.equal(ordered.length, 2);
    assert.equal(ordered[0]?.id, game2.id);
    assert.equal(ordered[1]?.id, game1.id);
  });

  test("game factory builds per-player runtime deck state from deck registrations", () => {
    const game = GameFactory.create({
      matchId: "m1",
      number: 1,
      deckRegistrationsByPlayer: {
        p1: validDeckList,
        p2: validDeckList,
      },
    });

    assert.equal(Object.keys(game.deckStateByPlayer).length, 2);
    assert.equal(game.deckStateByPlayer.p1?.mainLibrary.length, 40);
    assert.ok(game.deckStateByPlayer.p1?.chosenChampionCardId);
    assert.ok(
      game.deckStateByPlayer.p1?.mainLibrary.some(
        (card) => card.id === game.deckStateByPlayer.p1?.chosenChampionCardId,
      ),
    );
    assert.equal(game.deckStateByPlayer.p1?.runeLibrary.length, 12);
    assert.equal(game.deckStateByPlayer.p1?.hand.length, 0);
    assert.equal(game.deckStateByPlayer.p1?.trash.length, 0);
    assert.ok(game.deckStateByPlayer.p1?.registrationRef);
  });

  test("versions increment through setup and result reporting writes", async () => {
    const created = await createMatch(app, "best-of-1");
    assert.equal(created.version, 1);
    assert.equal(created.currentGame.version, 1);

    const ready = await setupMatchToReady(app, created.id, "best-of-1");
    assert.ok(ready.version > 1);
    assert.ok(ready.currentGame.version > 1);

    const reported = await request(app)
      .post(`/api/matches/${created.id}/games`)
      .send({
        winnerPlayerId: "p1", actorPlayerId: "p1",
      });
    assert.equal(reported.status, 201);
    assert.ok(reported.body.data.version > ready.version);
    assert.ok(reported.body.data.currentGame.version > ready.currentGame.version);
  });
});

