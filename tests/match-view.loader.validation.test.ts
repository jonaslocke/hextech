import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MatchViewLoader } from "../src/application/services/match-view.loader.js";
import { MatchFactory } from "../src/domain/match.factory.js";
import { InMemoryGameRepository } from "../src/infrastructure/repositories/in-memory-game.repository.js";
import { InMemoryMatchRepository } from "../src/infrastructure/repositories/in-memory-match.repository.js";
import { validDeckList } from "./helpers/match-test-helpers.js";

describe("MatchViewLoader validation", () => {
  test("rejects empty match id", async () => {
    const matchRepository = new InMemoryMatchRepository();
    const gameRepository = new InMemoryGameRepository();
    const loader = new MatchViewLoader(matchRepository, gameRepository);

    await assert.rejects(async () => loader.getMatch(""), (error: any) => {
      assert.equal(error?.code, "VALIDATION_ERROR");
      return true;
    });
  });

  test("throws not found when currentGameId is set but game does not exist", async () => {
    const matchRepository = new InMemoryMatchRepository();
    const gameRepository = new InMemoryGameRepository();
    const loader = new MatchViewLoader(matchRepository, gameRepository);

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
    match.currentGameId = "game_missing";

    await assert.rejects(
      async () => loader.getCurrentGameOrThrow(match),
      (error: any) => {
        assert.equal(error?.code, "NOT_FOUND");
        return true;
      },
    );
  });

  test("throws validation error when match has no current game", async () => {
    const matchRepository = new InMemoryMatchRepository();
    const gameRepository = new InMemoryGameRepository();
    const loader = new MatchViewLoader(matchRepository, gameRepository);

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

    await assert.rejects(
      async () => loader.getCurrentGameOrThrow(match),
      (error: any) => {
        assert.equal(error?.code, "VALIDATION_ERROR");
        return true;
      },
    );
  });
});

