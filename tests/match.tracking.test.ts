import assert from "node:assert/strict";
import test from "node:test";
import { MatchFactory } from "../src/domain/match.factory.js";
import { InMemoryMatchRepository } from "../src/infrastructure/repositories/in-memory-match.repository.js";

test("Match repository persists games list and score updates", async () => {
  const match = MatchFactory.create({
    format: "best-of-3",
    players: [
      { id: "p1", displayName: "Alice" },
      { id: "p2", displayName: "Bob" },
    ],
  });

  const [playerA, playerB] = match.players;

  match.games.push("game_001");
  match.score[playerA.id] = 1;
  match.score[playerB.id] = 0;

  const repository = new InMemoryMatchRepository();
  await repository.save(match);

  const stored = await repository.findById(match.id);

  assert.ok(stored);
  assert.deepEqual(stored?.games, ["game_001"]);
  assert.deepEqual(stored?.score, { [playerA.id]: 1, [playerB.id]: 0 });
});
