import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GameFactory } from "../src/domain/game.factory.js";
import { validDeckList } from "./helpers/match-test-helpers.js";

describe("Gameplay runtime shape", () => {
  test("initializes empty zone buckets for each registered player", () => {
    const game = GameFactory.create({
      matchId: "match_test",
      number: 1,
      deckRegistrationsByPlayer: {
        p1: validDeckList,
        p2: validDeckList,
      },
    });

    assert.equal(game.gameplay.schemaVersion, 1);
    assert.deepEqual(game.gameplay.events, []);
    assert.deepEqual(game.gameplay.zones.shared, {
      battlefield: [],
      chain: [],
      facedownByBattlefield: {},
    });
    assert.deepEqual(game.gameplay.kernel, {
      phase: "setup",
      timing: "closed",
      turn: {
        number: 0,
        activePlayerId: null,
      },
      priority: {
        playerId: null,
        passCount: 0,
      },
      chain: {
        state: "idle",
        depth: 0,
      },
      execution: {
        nextIntentSequence: 1,
        lastAppliedIntentSequence: 0,
        lastAppliedIntentType: null,
        lastAppliedActorPlayerId: null,
      },
    });
    assert.deepEqual(game.gameplay.ruleParameters, {
      defaultHiddenCapacityPerBattlefield: 1,
      hiddenCapacityByBattlefield: {},
    });

    assert.deepEqual(game.gameplay.zones.players.p1, {
      mainDeck: [],
      hand: [],
      trash: [],
      banishment: [],
      runeDeck: [],
      championZone: [],
      legendZone: [],
      base: {
        cards: [],
        runes: [],
      },
    });

    assert.deepEqual(game.gameplay.zones.players.p2, {
      mainDeck: [],
      hand: [],
      trash: [],
      banishment: [],
      runeDeck: [],
      championZone: [],
      legendZone: [],
      base: {
        cards: [],
        runes: [],
      },
    });
  });

  test("is JSON-serializable as a plain object shape", () => {
    const game = GameFactory.create({
      matchId: "match_test",
      number: 1,
      deckRegistrationsByPlayer: {
        p1: validDeckList,
      },
    });
    const serialized = JSON.parse(JSON.stringify(game));

    assert.equal(serialized.gameplay.schemaVersion, 1);
    assert.deepEqual(serialized.gameplay.zones.players.p1.base, {
      cards: [],
      runes: [],
    });
    assert.equal(serialized.gameplay.kernel.phase, "setup");
    assert.equal(serialized.gameplay.kernel.execution.nextIntentSequence, 1);
    assert.equal(serialized.gameplay.ruleParameters.defaultHiddenCapacityPerBattlefield, 1);
    assert.deepEqual(serialized.gameplay.events, []);
  });
});
