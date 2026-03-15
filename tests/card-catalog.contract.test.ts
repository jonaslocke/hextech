import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  listCatalogCardsByExactName,
  resolveCardType,
  resolveCatalogCardByName,
  resolveCatalogCardByPublicCode,
} from "../src/domain/card-catalog.js";

describe("Card catalog contract", () => {
  test("resolves a known card by name with mapped zone-policy card type", () => {
    const card = resolveCatalogCardByName("Defy");

    assert.ok(card);
    assert.equal(card?.name, "Defy");
    assert.equal(card?.cardType, "spell");
    assert.ok(card?.publicCode.length);
  });

  test("resolves by public code", () => {
    const fromName = resolveCatalogCardByName("Fortified Position");
    assert.ok(fromName);

    const fromPublicCode = resolveCatalogCardByPublicCode(fromName.publicCode);
    assert.ok(fromPublicCode);
    assert.equal(fromPublicCode?.publicCode, fromName.publicCode);
    assert.equal(fromPublicCode?.cardType, "battlefield");
  });

  test("selects canonical print for duplicate names using default metadata flags", () => {
    const candidates = listCatalogCardsByExactName("Irelia, Fervent");
    assert.ok(candidates.length > 1);

    const defaults = candidates.filter(
      (card) =>
        !card.metadata.alternateArt &&
        !card.metadata.overnumbered &&
        !card.metadata.signature,
    );
    assert.equal(defaults.length, 1);

    const resolved = resolveCatalogCardByName("Irelia, Fervent");
    assert.ok(resolved);
    assert.equal(resolved?.publicCode, defaults[0]?.publicCode);

    const cleanNameResolved = resolveCatalogCardByName("Irelia Fervent");
    assert.ok(cleanNameResolved);
    assert.equal(cleanNameResolved?.publicCode, defaults[0]?.publicCode);
  });

  test("returns null for unknown cards and card type lookups", () => {
    assert.equal(resolveCatalogCardByName("Card That Does Not Exist"), null);
    assert.equal(resolveCardType("Card That Does Not Exist"), null);
  });
});
