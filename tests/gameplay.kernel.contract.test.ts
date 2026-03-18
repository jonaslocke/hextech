import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  activateGameplayKernelForReadyState,
  commitDeterministicIntent,
  createEmptyGameplayRuntime,
} from "../src/domain/gameplay.js";
import { moveCardBetweenZones } from "../src/domain/gameplay.zone-transition.js";

describe("Gameplay kernel foundations", () => {
  test("activates ready kernel with turn, timing, and priority scaffolding", () => {
    const gameplay = createEmptyGameplayRuntime(["p1", "p2"]);
    const ready = activateGameplayKernelForReadyState(gameplay, "p2");

    assert.equal(ready.kernel.phase, "neutral");
    assert.equal(ready.kernel.timing, "open");
    assert.equal(ready.kernel.turn.number, 1);
    assert.equal(ready.kernel.turn.activePlayerId, "p2");
    assert.equal(ready.kernel.priority.playerId, "p2");
    assert.equal(ready.kernel.chain.state, "idle");
    assert.equal(ready.kernel.chain.depth, 0);
  });

  test("keeps chain scaffold state synced with chain zone depth", () => {
    const gameplay = createEmptyGameplayRuntime(["p1"]);
    gameplay.zones.players.p1!.hand.push("card_001");

    const opened = moveCardBetweenZones(gameplay, {
      cardId: "card_001",
      cardControllerId: "p1",
      cardType: "spell",
      source: { kind: "player_zone", playerId: "p1", zone: "hand" },
      destination: { kind: "chain" },
    });

    assert.equal(opened.kernel.chain.state, "open");
    assert.equal(opened.kernel.chain.depth, 1);

    const closed = moveCardBetweenZones(opened, {
      cardId: "card_001",
      cardControllerId: "p1",
      cardType: "spell",
      source: { kind: "chain" },
      destination: { kind: "player_zone", playerId: "p1", zone: "trash" },
    });

    assert.equal(closed.kernel.chain.state, "idle");
    assert.equal(closed.kernel.chain.depth, 0);
  });

  test("commits deterministic intent sequence and envelope event", () => {
    const gameplay = createEmptyGameplayRuntime(["p1"]);

    const committed = commitDeterministicIntent(gameplay, {
      intentType: "ZONE_CHANGE",
      actorPlayerId: "p1",
    });

    assert.equal(committed.kernel.execution.nextIntentSequence, 2);
    assert.equal(committed.kernel.execution.lastAppliedIntentSequence, 1);
    assert.equal(committed.kernel.execution.lastAppliedIntentType, "ZONE_CHANGE");
    assert.equal(committed.kernel.execution.lastAppliedActorPlayerId, "p1");

    const event = committed.events[committed.events.length - 1];
    assert.equal(event?.type, "intent_resolved");
    assert.equal(event?.details?.sequence, "1");
    assert.equal(event?.details?.intentType, "ZONE_CHANGE");
    assert.equal(event?.details?.actorPlayerId, "p1");
  });
});
