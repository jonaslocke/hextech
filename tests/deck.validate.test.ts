import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

const baseLegendEntries = ["1 Ahri, Nine-Tailed Fox"];
const baseChampionEntries = ["1 Ahri, Inquisitive"];
const baseMainDeckEntries = [
  "3 Defy",
  "3 En Garde",
  "3 Stalwart Poro",
  "3 Discipline",
  "3 Stupefy",
  "3 Ravenbloom Student",
  "3 Sprite Mother",
  "3 Thousand-Tailed Watcher",
  "2 Charm",
  "2 Clockwork Keeper",
  "2 Rune Prison",
  "2 Tasty Faefolk",
  "2 Retreat",
  "1 Find Your Center",
  "2 Wind Wall",
  "2 Sona, Harmonious",
  "1 Ahri, Alluring",
];
const baseBattlefieldEntries = [
  "1 Fortified Position",
  "1 Grove of the God-Willow",
  "1 The Dreaming Tree",
];
const baseRuneEntries = ["7 Calm Rune", "5 Mind Rune"];
const baseSideboardEntries = [
  "1 Rune Prison",
  "1 Wind Wall",
  "1 Blitzcrank, Impassive",
  "1 Riptide Rex",
  "1 Retreat",
  "1 Singularity",
  "1 Unchecked Power",
  "1 Fox-Fire",
];

interface DeckSections {
  legendEntries?: string[] | null;
  championEntries?: string[] | null;
  mainDeckEntries?: string[] | null;
  battlefieldEntries?: string[] | null;
  runeEntries?: string[] | null;
  sideboardEntries?: string[] | null;
}

const buildDeckList = (sections: DeckSections = {}): string => {
  const lines: string[] = [];
  const resolve = <T>(value: T | undefined, fallback: T): T =>
    value === undefined ? fallback : value;

  const appendSection = (name: string, entries: string[] | null | undefined): void => {
    if (entries === null) {
      return;
    }

    lines.push(`${name}:`);

    for (const entry of entries ?? []) {
      lines.push(entry);
    }

    lines.push("");
  };

  appendSection("Legend", resolve(sections.legendEntries, baseLegendEntries));
  appendSection("Champion", resolve(sections.championEntries, baseChampionEntries));
  appendSection("MainDeck", resolve(sections.mainDeckEntries, baseMainDeckEntries));
  appendSection(
    "Battlefields",
    resolve(sections.battlefieldEntries, baseBattlefieldEntries),
  );
  appendSection("Runes", resolve(sections.runeEntries, baseRuneEntries));
  appendSection("Sideboard", resolve(sections.sideboardEntries, baseSideboardEntries));

  return lines.join("\n").trim();
};

const validateDeck = async (deckList: string | undefined) =>
  request(app).post("/api/decks/validate").send({ deckList });

const hasViolationMessage = (
  response: request.Response,
  message: string,
): boolean =>
  Array.isArray(response.body?.data?.violations) &&
  response.body.data.violations.some(
    (violation: { message?: string }) => violation.message === message,
  );

describe("Deck validation (Core Rules 101 - Deck Construction)", () => {
  test("101/103 - accepts a legal deck list baseline", async () => {
    const response = await validateDeck(buildDeckList());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
    assert.deepEqual(response.body.data.reasons, []);
    assert.deepEqual(response.body.data.violations, []);
    assert.deepEqual(response.body.data.battlefields, [
      "Fortified Position",
      "Grove of the God-Willow",
      "The Dreaming Tree",
    ]);
  });

  test("103.1 - requires exactly 1 Champion Legend", async () => {
    const response = await validateDeck(
      buildDeckList({
        legendEntries: ["2 Ahri, Nine-Tailed Fox"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Champion Legend.",
      ),
    );
  });

  test("103.1 - rejects missing Champion Legend section", async () => {
    const response = await validateDeck(
      buildDeckList({
        legendEntries: null,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Champion Legend.",
      ),
    );
  });

  test("103.2 - requires exactly 1 Chosen Champion Unit", async () => {
    const response = await validateDeck(
      buildDeckList({
        championEntries: ["2 Ahri, Inquisitive"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Chosen Champion Unit.",
      ),
    );
  });

  test("103.2 - rejects missing Chosen Champion section", async () => {
    const response = await validateDeck(
      buildDeckList({
        championEntries: null,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 1 Chosen Champion Unit.",
      ),
    );
  });

  test("103.2 - requires Main Deck section", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: null,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes("Deck must include a Main Deck section."),
    );
  });

  test("103.2 - requires Main Deck size of at least 40 cards (including chosen champion)", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: [
          "3 Defy",
          "3 En Garde",
          "3 Stalwart Poro",
          "3 Discipline",
          "3 Stupefy",
          "3 Ravenbloom Student",
          "3 Sprite Mother",
          "3 Thousand-Tailed Watcher",
          "2 Charm",
          "2 Clockwork Keeper",
          "2 Rune Prison",
          "2 Tasty Faefolk",
          "2 Retreat",
          "1 Find Your Center",
          "1 Wind Wall",
          "1 Sona, Harmonious",
          "1 Ahri, Alluring",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck must include at least 40 cards.",
      ),
    );
  });

  test("103.2 - accepts 39 Main Deck cards when chosen champion brings total to 40", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: [
          "3 Defy",
          "3 En Garde",
          "3 Stalwart Poro",
          "3 Discipline",
          "3 Stupefy",
          "3 Ravenbloom Student",
          "3 Sprite Mother",
          "3 Thousand-Tailed Watcher",
          "2 Charm",
          "2 Clockwork Keeper",
          "2 Rune Prison",
          "2 Tasty Faefolk",
          "2 Retreat",
          "1 Find Your Center",
          "2 Wind Wall",
          "1 Sona, Harmonious",
          "1 Ahri, Alluring",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
    assert.deepEqual(response.body.data.reasons, []);
  });

  test("103.2.b - enforces 1..3 copies per Main Deck entry", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: baseMainDeckEntries.map((entry) =>
          entry === "2 Wind Wall" ? "4 Wind Wall" : entry,
        ),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck card copies must be between 1 and 3.",
      ),
    );
  });

  test("103.2.b + addition - requires unique card names per Main Deck section", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: baseMainDeckEntries.map((entry) =>
          entry === "3 En Garde" ? "3 Defy" : entry,
        ),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Main Deck must not list the same card more than once.",
      ),
    );
  });

  test("103.2.b.1 - copy cap includes Chosen Champion", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: [
          "3 Ahri, Inquisitive",
          "3 Defy",
          "3 En Garde",
          "3 Stalwart Poro",
          "3 Discipline",
          "3 Stupefy",
          "3 Ravenbloom Student",
          "3 Sprite Mother",
          "3 Thousand-Tailed Watcher",
          "2 Charm",
          "2 Clockwork Keeper",
          "2 Rune Prison",
          "2 Tasty Faefolk",
          "2 Retreat",
          "1 Find Your Center",
          "2 Wind Wall",
          "2 Sona, Harmonious",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion, Main Deck, and Sideboard combined must not include more than 3 copies of the same card.",
      ),
    );
  });

  test("103.2.c - chosen champion and main deck obey domain identity", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: baseMainDeckEntries.map((entry) =>
          entry === "3 Defy" ? "3 Noxus Hopeful" : entry,
        ),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion and Main Deck cards must match Champion Legend domain identity.",
      ),
    );
  });

  test("103.2.a.2 - chosen champion must be a champion unit with matching champion tag", async () => {
    const response = await validateDeck(
      buildDeckList({
        championEntries: ["1 Jax, Unmatched"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion must share a champion tag with Champion Legend.",
      ),
    );
  });

  test("103.2.a.2 / 103.2.d.3 - chosen champion cannot be a signature unit", async () => {
    const response = await validateDeck(
      buildDeckList({
        championEntries: ["1 Tibbers"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion must reference a champion unit.",
      ),
    );
  });

  test("103.3 - requires Rune Deck section", async () => {
    const response = await validateDeck(
      buildDeckList({
        runeEntries: null,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes("Deck must include a Rune Deck section."),
    );
  });

  test("103.3.a - requires exactly 12 Rune cards", async () => {
    const response = await validateDeck(
      buildDeckList({
        runeEntries: ["6 Calm Rune", "5 Mind Rune"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Rune Deck must include exactly 12 cards.",
      ),
    );
  });

  test("103.3.a.1 - rune deck obeys domain identity", async () => {
    const response = await validateDeck(
      buildDeckList({
        runeEntries: ["7 Calm Rune", "5 Fury Rune"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Rune Deck cards must match Champion Legend domain identity.",
      ),
    );
  });

  test("103.4 - requires Battlefields section", async () => {
    const response = await validateDeck(
      buildDeckList({
        battlefieldEntries: null,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes("Deck must include a Battlefields section."),
    );
  });

  test("103.4 (mode profile) - requires exactly 3 Battlefields", async () => {
    const response = await validateDeck(
      buildDeckList({
        battlefieldEntries: ["1 Fortified Position", "1 Grove of the God-Willow"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must include exactly 3 battlefields.",
      ),
    );
  });

  test("103.4 (mode profile) - rejects duplicate Battlefields", async () => {
    const response = await validateDeck(
      buildDeckList({
        battlefieldEntries: [
          "1 Fortified Position",
          "1 The Dreaming Tree",
          "1 The Dreaming Tree",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must not include duplicate battlefields.",
      ),
    );
  });

  test("103.4 - rejects Battlefields entries without names", async () => {
    const response = await validateDeck(
      buildDeckList({
        battlefieldEntries: ["1", "1 Grove of the God-Willow", "1 The Dreaming Tree"],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck must list a battlefield name for each battlefield entry.",
      ),
    );
  });

  test("103.2.d.1 - total signature cards cannot exceed 3", async () => {
    const response = await validateDeck(
      buildDeckList({
        sideboardEntries: [
          "1 Fox-Fire",
          "1 Counter Strike",
          "1 Noxian Guillotine",
          "1 Stormbringer",
          "1 Wind Wall",
          "1 Retreat",
          "1 Singularity",
          "1 Rune Prison",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Deck may include at most 3 total Signature cards.",
      ),
    );
  });

  test("103.2.d.2 - all signature cards must match champion legend tag", async () => {
    const response = await validateDeck(
      buildDeckList({
        sideboardEntries: [
          "1 Counter Strike",
          "1 Wind Wall",
          "1 Blitzcrank, Impassive",
          "1 Riptide Rex",
          "1 Retreat",
          "1 Singularity",
          "1 Unchecked Power",
          "1 Rune Prison",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "All Signature cards must share the Champion Legend tag.",
      ),
    );
    assert.ok(
      hasViolationMessage(
        response,
        "All Signature cards must share the Champion Legend tag.",
      ),
    );
  });

  test("addition - requires unique card names per Sideboard section", async () => {
    const response = await validateDeck(
      buildDeckList({
        sideboardEntries: [
          "1 Rune Prison",
          "1 Wind Wall",
          "1 Blitzcrank, Impassive",
          "1 Riptide Rex",
          "1 Retreat",
          "1 Singularity",
          "1 Unchecked Power",
          "1 Wind Wall",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Sideboard must not list the same card more than once.",
      ),
    );
  });

  test("addition - copy cap applies across Chosen Champion, Main Deck, and Sideboard", async () => {
    const response = await validateDeck(
      buildDeckList({
        sideboardEntries: [
          "1 Defy",
          "1 Wind Wall",
          "1 Blitzcrank, Impassive",
          "1 Riptide Rex",
          "1 Retreat",
          "1 Singularity",
          "1 Unchecked Power",
          "1 Fox-Fire",
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        "Chosen Champion, Main Deck, and Sideboard combined must not include more than 3 copies of the same card.",
      ),
    );
  });

  test("rejects unknown cards using card catalog", async () => {
    const response = await validateDeck(
      buildDeckList({
        mainDeckEntries: baseMainDeckEntries.map((entry) =>
          entry === "3 Defy" ? "3 Not A Real Card" : entry,
        ),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(
      response.body.data.reasons.includes(
        'Card "Not A Real Card" was not found in card catalog.',
      ),
    );
  });

  test("accepts provided Draven deck list", async () => {
    const deckList = readFileSync(path.join(process.cwd(), "docs", "draven.dec.txt"), "utf8");

    const response = await validateDeck(deckList);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
  });

  test("accepts provided Jax deck list", async () => {
    const deckList = readFileSync(path.join(process.cwd(), "docs", "jax.dec.txt"), "utf8");

    const response = await validateDeck(deckList);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
  });

  test("accepts provided Irelia deck list", async () => {
    const deckList = readFileSync(path.join(process.cwd(), "docs", "irelia.dec.txt"), "utf8");

    const response = await validateDeck(deckList);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, true);
  });

  test("handles missing deck list payload", async () => {
    const response = await validateDeck(undefined);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isValid, false);
    assert.ok(response.body.data.reasons.includes("Deck must be provided."));
    assert.ok(hasViolationMessage(response, "Deck must be provided."));
  });
});
