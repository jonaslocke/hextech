import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MatchFactory } from "../src/domain/match.factory.js";
import { InMemoryMatchRepository } from "../src/infrastructure/repositories/in-memory-match.repository.js";

describe("Match tracking", () => {
  test("Match repository persists games list and score updates", async () => {
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
    const match = MatchFactory.create({
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
});
