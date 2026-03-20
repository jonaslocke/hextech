import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import type { CardType } from "./zone-policy";

type CatalogClassificationType =
  | "Unit"
  | "Spell"
  | "Gear"
  | "Rune"
  | "Battlefield"
  | "Legend";

interface CardMetadataRaw {
  clean_name?: unknown;
  alternate_art?: unknown;
  overnumbered?: unknown;
  signature?: unknown;
}

interface SetCardRaw {
  id?: unknown;
  name?: unknown;
  public_code?: unknown;
  collector_number?: unknown;
  classification?: {
    type?: unknown;
    supertype?: unknown;
    domain?: unknown;
  };
  metadata?: CardMetadataRaw;
  tags?: unknown;
  set?: {
    set_id?: unknown;
  };
}

interface CatalogPrintMetadata {
  cleanName: string;
  alternateArt: boolean;
  overnumbered: boolean;
  signature: boolean;
}

export interface ResolvedCatalogCard {
  id: string;
  name: string;
  publicCode: string;
  collectorNumber: number | null;
  setId: string;
  cardType: CardType;
  classificationType: CatalogClassificationType;
  supertype: string | null;
  domains: readonly string[];
  tags: readonly string[];
  isChampionUnit: boolean;
  isSignature: boolean;
  metadata: CatalogPrintMetadata;
}

interface CardCatalogIndex {
  cards: readonly ResolvedCatalogCard[];
  byPublicCode: Map<string, ResolvedCatalogCard>;
  canonicalByName: Map<string, ResolvedCatalogCard>;
}

let cachedCatalogIndex: CardCatalogIndex | null = null;

export function resolveCatalogCardByName(
  cardName: string,
): ResolvedCatalogCard | null {
  const lookupKey = normalizeLookupKey(cardName);

  if (!lookupKey) {
    return null;
  }

  return getCardCatalogIndex().canonicalByName.get(lookupKey) ?? null;
}

export function resolveCatalogCardByPublicCode(
  publicCode: string,
): ResolvedCatalogCard | null {
  const lookupKey = normalizeLookupKey(publicCode);

  if (!lookupKey) {
    return null;
  }

  return getCardCatalogIndex().byPublicCode.get(lookupKey) ?? null;
}

export function resolveCardType(cardName: string): CardType | null {
  return resolveCatalogCardByName(cardName)?.cardType ?? null;
}

export function listCatalogCardsByExactName(
  cardName: string,
): readonly ResolvedCatalogCard[] {
  const lookupKey = normalizeLookupKey(cardName);

  if (!lookupKey) {
    return [];
  }

  const cards = getCardCatalogIndex().cards.filter(
    (card) => normalizeLookupKey(card.name) === lookupKey,
  );

  return cards;
}

function getCardCatalogIndex(): CardCatalogIndex {
  if (cachedCatalogIndex) {
    return cachedCatalogIndex;
  }

  cachedCatalogIndex = buildCardCatalogIndex();
  return cachedCatalogIndex;
}

function buildCardCatalogIndex(): CardCatalogIndex {
  const setsDirectory = path.join(process.cwd(), "data", "sets");
  const setFiles = readdirSync(setsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(setsDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const cards: ResolvedCatalogCard[] = [];
  const byPublicCode = new Map<string, ResolvedCatalogCard>();
  const cardsByNameLookup = new Map<string, ResolvedCatalogCard[]>();

  for (const filePath of setFiles) {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error(`Set catalog file must contain an array: ${filePath}`);
    }

    for (const rawEntry of parsed) {
      const card = parseCatalogCard(rawEntry as SetCardRaw, filePath);
      cards.push(card);

      byPublicCode.set(normalizeLookupKey(card.publicCode), card);
      addLookupCandidate(cardsByNameLookup, card.name, card);
      addLookupCandidate(cardsByNameLookup, card.metadata.cleanName, card);
      addLegendAliasLookupCandidates(cardsByNameLookup, card);
    }
  }

  const canonicalByName = new Map<string, ResolvedCatalogCard>();
  for (const [lookupKey, candidates] of cardsByNameLookup.entries()) {
    const canonical = selectCanonicalPrint(candidates);
    canonicalByName.set(lookupKey, canonical);
  }

  return {
    cards,
    byPublicCode,
    canonicalByName,
  };
}

function addLookupCandidate(
  cardsByLookup: Map<string, ResolvedCatalogCard[]>,
  lookupValue: string,
  card: ResolvedCatalogCard,
): void {
  const lookupKey = normalizeLookupKey(lookupValue);

  if (!lookupKey) {
    return;
  }

  const current = cardsByLookup.get(lookupKey);
  if (current) {
    current.push(card);
    return;
  }

  cardsByLookup.set(lookupKey, [card]);
}

function addLegendAliasLookupCandidates(
  cardsByLookup: Map<string, ResolvedCatalogCard[]>,
  card: ResolvedCatalogCard,
): void {
  if (card.classificationType !== "Legend") {
    return;
  }

  const cardNameLookup = normalizeLookupKey(card.name);

  for (const tag of card.tags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      continue;
    }

    if (cardNameLookup.startsWith(`${normalizeLookupKey(trimmedTag)},`)) {
      continue;
    }

    addLookupCandidate(cardsByLookup, `${trimmedTag}, ${card.name}`, card);
    addLookupCandidate(cardsByLookup, `${trimmedTag}, ${card.metadata.cleanName}`, card);
  }
}

function selectCanonicalPrint(
  candidates: readonly ResolvedCatalogCard[],
): ResolvedCatalogCard {
  if (candidates.length === 0) {
    throw new Error("Catalog canonicalization requires at least one candidate.");
  }

  const sorted = [...candidates].sort((left, right) => {
    const leftPenalty = getMetadataPenalty(left.metadata);
    const rightPenalty = getMetadataPenalty(right.metadata);
    if (leftPenalty !== rightPenalty) {
      return leftPenalty - rightPenalty;
    }

    const setComparison = left.setId.localeCompare(right.setId);
    if (setComparison !== 0) {
      return setComparison;
    }

    const leftCollector = left.collectorNumber ?? Number.MAX_SAFE_INTEGER;
    const rightCollector = right.collectorNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftCollector !== rightCollector) {
      return leftCollector - rightCollector;
    }

    return left.publicCode.localeCompare(right.publicCode);
  });

  return sorted[0]!;
}

function getMetadataPenalty(metadata: CatalogPrintMetadata): number {
  let penalty = 0;
  if (metadata.alternateArt) {
    penalty += 1;
  }
  if (metadata.overnumbered) {
    penalty += 1;
  }
  if (metadata.signature) {
    penalty += 1;
  }
  return penalty;
}

function parseCatalogCard(raw: SetCardRaw, filePath: string): ResolvedCatalogCard {
  const name = asNonEmptyString(raw.name);
  const publicCode = asNonEmptyString(raw.public_code);
  const id = asNonEmptyString(raw.id);
  const setId = asNonEmptyString(raw.set?.set_id);
  const classificationType = asClassificationType(raw.classification?.type, filePath, name);
  const cardType = mapClassificationTypeToCardType(classificationType);
  const supertype = asOptionalNonEmptyString(raw.classification?.supertype);
  const domains = asStringArray(raw.classification?.domain);
  const tags = asStringArray(raw.tags);
  const metadata = raw.metadata ?? {};
  const cleanName = asOptionalNonEmptyString(metadata.clean_name) ?? name;
  const collectorNumber = asCollectorNumber(raw.collector_number);

  const normalizedSupertype = supertype?.toLowerCase() ?? "";

  return {
    id,
    name,
    publicCode,
    collectorNumber,
    setId,
    cardType,
    classificationType,
    supertype,
    domains,
    tags,
    isChampionUnit: classificationType === "Unit" && normalizedSupertype === "champion",
    isSignature: normalizedSupertype === "signature",
    metadata: {
      cleanName,
      alternateArt: Boolean(metadata.alternate_art),
      overnumbered: Boolean(metadata.overnumbered),
      signature: Boolean(metadata.signature),
    },
  };
}

function asClassificationType(
  value: unknown,
  filePath: string,
  cardName: string,
): CatalogClassificationType {
  if (
    value === "Unit" ||
    value === "Spell" ||
    value === "Gear" ||
    value === "Rune" ||
    value === "Battlefield" ||
    value === "Legend"
  ) {
    return value;
  }

  throw new Error(
    `Unsupported card classification type in ${filePath} for "${cardName}": ${String(value)}`,
  );
}

function mapClassificationTypeToCardType(
  classificationType: CatalogClassificationType,
): CardType {
  switch (classificationType) {
    case "Unit":
      return "unit";
    case "Spell":
      return "spell";
    case "Gear":
      return "gear";
    case "Rune":
      return "rune";
    case "Battlefield":
      return "battlefield";
    case "Legend":
      return "legend";
  }
}

function asCollectorNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function asOptionalNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function asNonEmptyString(value: unknown): string {
  const normalized = asOptionalNonEmptyString(value);

  if (!normalized) {
    throw new Error("Card catalog entry contains a required empty string field.");
  }

  return normalized;
}

function normalizeLookupKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
