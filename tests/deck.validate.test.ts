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

const deckWithoutBattlefields = `Legend:
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

const deckWithTwoLegends = deckList.replace(
  "1 Ahri, Nine-Tailed Fox",
  "2 Ahri, Nine-Tailed Fox",
);

const deckWithTwoChampions = deckList.replace(
  "Champion:\n1 Ahri, Inquisitive",
  "Champion:\n2 Ahri, Inquisitive",
);

const deckWithThirtyNineMainDeckCards = deckList.replace(
  "2 Wind Wall",
  "1 Wind Wall",
);

const deckWithoutRunes = deckList.replace(
  "Runes:\n7 Calm Rune\n5 Mind Rune\n\n",
  "",
);

const deckWithElevenRunes = deckList.replace("5 Mind Rune", "4 Mind Rune");
const deckWithFourCopiesInMainDeck = deckList.replace("2 Wind Wall", "4 Wind Wall");
const deckWithSplitCopiesAboveThree = deckList.replace(
  "3 En Garde",
  "3 Defy",
);
const deckWithDuplicateSideboardCard = deckList.replace(
  "1 Fox-Fire",
  "1 Wind Wall",
);
const deckWithFourCombinedCopies = deckList.replace("1 Fox-Fire", "1 Defy");

describe("Deck validation", () => {
  test("POST /api/decks/validate returns valid result for a legal deck", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
    assert.deepEqual(response.body.data.reasons, []);
    assert.deepEqual(response.body.data.battlefields, [
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);
  });

  test("POST /api/decks/validate returns reasons for invalid deck", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithoutBattlefields });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(response.body.data.reasons.length > 0);
  });

  test("POST /api/decks/validate handles missing deck list", async () => {
    const response = await request(app).post("/api/decks/validate").send({});

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(response.body.data.reasons.length > 0);
  });

  test("POST /api/decks/validate rejects battlefields without names", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({
        deckList: `Legend:
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
1
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
1 Fox-Fire`,
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(response.body.data.reasons.length > 0);
  });

  test("POST /api/decks/validate rejects legend count different from 1", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithTwoLegends });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Champion Legend.",
      ),
    );
  });

  test("POST /api/decks/validate rejects champion count different from 1", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithTwoChampions });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Chosen Champion Unit.",
      ),
    );
  });

  test("POST /api/decks/validate rejects main deck smaller than 40 cards", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithThirtyNineMainDeckCards });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck must include at least 40 cards.",
      ),
    );
  });

  test("POST /api/decks/validate rejects missing rune deck section", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithoutRunes });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes("Deck must include a Rune Deck section."),
    );
  });

  test("POST /api/decks/validate rejects rune deck not equal to 12 cards", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithElevenRunes });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Rune Deck must include exactly 12 cards.",
      ),
    );
  });

  test("POST /api/decks/validate rejects main deck entries above 3 copies", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithFourCopiesInMainDeck });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck card copies must be between 1 and 3.",
      ),
    );
  });

  test("POST /api/decks/validate rejects duplicate main deck card entries", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithSplitCopiesAboveThree });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck must not list the same card more than once.",
      ),
    );
  });

  test("POST /api/decks/validate rejects duplicate sideboard card entries", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithDuplicateSideboardCard });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Sideboard must not list the same card more than once.",
      ),
    );
  });

  test("POST /api/decks/validate rejects more than 3 combined copies across champion, main deck, and sideboard", async () => {
    const response = await request(app)
      .post("/api/decks/validate")
      .send({ deckList: deckWithFourCombinedCopies });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion, Main Deck, and Sideboard combined must not include more than 3 copies of the same card.",
      ),
    );
  });
});
