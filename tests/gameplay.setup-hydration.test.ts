import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ValidationError } from "../src/shared/errors.js";
import { GameFactory } from "../src/domain/game.factory.js";
import { MatchFactory } from "../src/domain/match.factory.js";
import { hydrateGameplayForReadySetup } from "../src/domain/gameplay.setup-hydration.js";
import { validDeckList } from "./helpers/match-test-helpers.js";

describe("Gameplay setup hydration", () => {
  test("hydrates setup-ready game objects into gameplay zones", () => {
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

    const game = GameFactory.create({
      matchId: match.id,
      number: 1,
      deckRegistrationsByPlayer: match.decksByPlayer,
      chosenChampionByPlayer: {
        p1: "Ahri, Inquisitive",
        p2: "Ahri, Inquisitive",
      },
      selectedBattlefieldsByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
      status: "ready",
    });

    const hydrated = hydrateGameplayForReadySetup(match, game);

    assert.equal(hydrated.zones.players.p1?.mainDeck.length, 40);
    assert.equal(hydrated.zones.players.p2?.mainDeck.length, 40);
    assert.equal(hydrated.zones.players.p1?.runeDeck.length, 12);
    assert.equal(hydrated.zones.players.p2?.runeDeck.length, 12);
    assert.equal(hydrated.zones.players.p1?.championZone.length, 1);
    assert.equal(hydrated.zones.players.p2?.championZone.length, 1);
    assert.equal(hydrated.zones.players.p1?.legendZone.length, 1);
    assert.equal(hydrated.zones.players.p2?.legendZone.length, 1);
    assert.equal(hydrated.zones.shared.battlefield.length, 2);
    assert.equal(Object.keys(hydrated.zones.shared.facedownByBattlefield).length, 2);
  });

  test("throws when setup is incomplete for hydration", () => {
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

    const game = GameFactory.create({
      matchId: match.id,
      number: 1,
      deckRegistrationsByPlayer: match.decksByPlayer,
      selectedBattlefieldsByPlayer: {
        p1: "Fortified Position",
        p2: "Grove of the God-Willow",
      },
      startingPlayerId: "p1",
      status: "setup_pending",
    });

    assert.throws(
      () => hydrateGameplayForReadySetup(match, game),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Chosen champion is required for setup hydration.",
    );
  });
});
