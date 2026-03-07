import assert from "node:assert/strict";
import test from "node:test";
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
1 Wind Wall
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
1 Wind Wall
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
1 Wind Wall
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
