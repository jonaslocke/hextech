import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DeckValidator } from "../src/domain/deck.validator.js";
import { ValidationError } from "../src/shared/errors.js";
import { validDeckList } from "./helpers/match-test-helpers.js";

describe("Runtime deck catalog enrichment", () => {
  test("enriches runtime deck cards with public code and card type", () => {
    const snapshot = DeckValidator.buildRuntimeDeckSnapshot(validDeckList, "p1");

    assert.equal(snapshot.mainLibrary.length, 40);
    assert.equal(snapshot.runeLibrary.length, 12);

    const chosenChampion = snapshot.mainLibrary.find(
      (card) => card.id === snapshot.chosenChampionCardId,
    );

    assert.ok(chosenChampion);
    assert.equal(chosenChampion?.name, "Ahri, Inquisitive");
    assert.equal(chosenChampion?.cardType, "unit");
    assert.ok(chosenChampion?.publicCode.length);

    assert.ok(
      snapshot.mainLibrary.every(
        (card) => card.publicCode.length > 0 && card.cardType !== "rune",
      ),
    );

    assert.ok(snapshot.runeLibrary.every((card) => card.cardType === "rune"));
  });

  test("rejects unknown cards when building runtime snapshot", () => {
    const invalidDeck = validDeckList.replace("3 Defy", "3 Card That Does Not Exist");

    assert.throws(
      () => DeckValidator.buildRuntimeDeckSnapshot(invalidDeck, "p1"),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === 'Card "Card That Does Not Exist" was not found in card catalog.',
    );
  });
});


