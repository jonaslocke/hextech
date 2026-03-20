import { createHash } from "node:crypto";
import {
  resolveCatalogCardByName,
  type ResolvedCatalogCard,
} from "./card-catalog";
import type { CardType } from "./zone-policy";
import { ValidationError } from "../shared/errors";

export interface ValidatedDeck {
  raw: string;
  chosenChampion: string;
  battlefields: string[];
}

export interface DeckValidationResult {
  isValid: boolean;
  reasons: string[];
  violations: DeckValidationViolation[];
  chosenChampion: string | null;
  battlefields: string[];
}

export interface DeckValidationViolation {
  code: string;
  message: string;
  rule?: string;
}

export interface RuntimeDeckCardInstance {
  id: string;
  name: string;
  publicCode: string;
  cardType: CardType;
  source: "main_deck" | "rune_deck";
}

export interface RuntimeDeckSnapshot {
  registrationRef: string;
  mainLibrary: RuntimeDeckCardInstance[];
  chosenChampionCardId: string;
  runeLibrary: RuntimeDeckCardInstance[];
  hand: RuntimeDeckCardInstance[];
  trash: RuntimeDeckCardInstance[];
}

interface DeckEntry {
  quantity: number;
  name: string;
}

interface DeckSection {
  entries: DeckEntry[];
  invalidEntries: number;
}

interface ParsedDeckSections {
  legend?: DeckSection;
  champion?: DeckSection;
  mainDeck?: DeckSection;
  runeDeck?: DeckSection;
  battlefields?: DeckSection;
  sideboard?: DeckSection;
}

interface ResolvedSectionEntry {
  entry: DeckEntry;
  card: ResolvedCatalogCard | null;
}

interface ResolvedDeckSections {
  legend: ResolvedSectionEntry[];
  champion: ResolvedSectionEntry[];
  mainDeck: ResolvedSectionEntry[];
  runeDeck: ResolvedSectionEntry[];
  battlefields: ResolvedSectionEntry[];
  sideboard: ResolvedSectionEntry[];
}

type DeckValidationRuleId =
  | "legend_singleton"
  | "champion_singleton"
  | "main_deck_section"
  | "rune_deck_section"
  | "sideboard_section"
  | "combined_copy_limit"
  | "resolve_catalog_entries"
  | "catalog_card_types"
  | "champion_tag_constraint"
  | "domain_identity_constraint"
  | "signature_constraint"
  | "battlefields_section";

interface DeckValidationRuleContext {
  sections: ParsedDeckSections;
  chosenChampion: string | null;
  reasons: string[];
  resolved: ResolvedDeckSections | null;
  validatedBattlefields: string[];
  stop: boolean;
}

interface DeckValidationRuleDefinition {
  id: DeckValidationRuleId;
  run: (context: DeckValidationRuleContext) => void;
}

export class DeckValidator {
  private static readonly RULE_SWITCHES: Readonly<Record<DeckValidationRuleId, boolean>> = {
    legend_singleton: true,
    champion_singleton: true,
    main_deck_section: true,
    rune_deck_section: true,
    sideboard_section: true,
    combined_copy_limit: true,
    resolve_catalog_entries: true,
    catalog_card_types: true,
    champion_tag_constraint: true,
    domain_identity_constraint: true,
    signature_constraint: true,
    battlefields_section: true,
  };

  private static readonly RULE_PIPELINE: ReadonlyArray<DeckValidationRuleDefinition> = [
    {
      id: "legend_singleton",
      run: (context) =>
        DeckValidator.validateSingletonSection(
          context.sections.legend,
          "Legend",
          "Champion Legend",
          context.reasons,
        ),
    },
    {
      id: "champion_singleton",
      run: (context) =>
        DeckValidator.validateSingletonSection(
          context.sections.champion,
          "Champion",
          "Chosen Champion Unit",
          context.reasons,
        ),
    },
    {
      id: "main_deck_section",
      run: (context) =>
        DeckValidator.validateMainDeckSection(
          context.sections.mainDeck,
          context.sections.champion,
          context.reasons,
        ),
    },
    {
      id: "rune_deck_section",
      run: (context) =>
        DeckValidator.validateRuneDeckSection(context.sections.runeDeck, context.reasons),
    },
    {
      id: "sideboard_section",
      run: (context) =>
        DeckValidator.validateSideboardSection(context.sections.sideboard, context.reasons),
    },
    {
      id: "combined_copy_limit",
      run: (context) =>
        DeckValidator.validateCombinedCopyLimit(
          context.sections.champion,
          context.sections.mainDeck,
          context.sections.sideboard,
          context.reasons,
        ),
    },
    {
      id: "resolve_catalog_entries",
      run: (context) => {
        context.resolved = DeckValidator.resolveCatalogEntries(context.sections, context.reasons);
      },
    },
    {
      id: "catalog_card_types",
      run: (context) => {
        if (!context.resolved) {
          return;
        }
        DeckValidator.validateCatalogCardTypes(context.resolved, context.reasons);
      },
    },
    {
      id: "champion_tag_constraint",
      run: (context) => {
        if (!context.resolved) {
          return;
        }
        DeckValidator.validateChosenChampionTagConstraint(context.resolved, context.reasons);
      },
    },
    {
      id: "domain_identity_constraint",
      run: (context) => {
        if (!context.resolved) {
          return;
        }
        DeckValidator.validateDomainIdentityConstraints(context.resolved, context.reasons);
      },
    },
    {
      id: "signature_constraint",
      run: (context) => {
        if (!context.resolved) {
          return;
        }
        DeckValidator.validateSignatureConstraints(context.resolved, context.reasons);
      },
    },
    {
      id: "battlefields_section",
      run: (context) => DeckValidator.validateBattlefieldsSection(context),
    },
  ];

  static validate(deckList: string): ValidatedDeck {
    const result = DeckValidator.validateWithReasons(deckList);

    if (!result.isValid) {
      throw new ValidationError(result.reasons[0] ?? "Deck list is invalid.");
    }

    return {
      raw: deckList.trim(),
      chosenChampion: result.chosenChampion ?? "",
      battlefields: result.battlefields,
    };
  }

  static validateWithReasons(deckList: string): DeckValidationResult {
    const reasons: string[] = [];

    if (typeof deckList !== "string" || deckList.trim().length === 0) {
      reasons.push("Deck must be provided.");
      return {
        isValid: false,
        reasons,
        violations: DeckValidator.buildViolations(reasons),
        chosenChampion: null,
        battlefields: [],
      };
    }

    const raw = deckList.trim();
    const sections = DeckValidator.extractSections(raw);
    const context: DeckValidationRuleContext = {
      sections,
      chosenChampion: DeckValidator.resolveChosenChampionName(sections.champion),
      reasons,
      resolved: null,
      validatedBattlefields:
        sections.battlefields?.entries.map((entry) => entry.name.trim()) ?? [],
      stop: false,
    };

    DeckValidator.runValidationRules(context);

    return {
      isValid: reasons.length === 0,
      reasons,
      violations: DeckValidator.buildViolations(reasons),
      chosenChampion: context.chosenChampion,
      battlefields: context.validatedBattlefields,
    };
  }

  static validateSetupDeckReconfiguration(
    registeredDeckList: string,
    reconfiguredDeckList: string,
  ): ValidatedDeck {
    const registeredDeck = DeckValidator.validate(registeredDeckList);
    const reconfiguredDeck = DeckValidator.validate(reconfiguredDeckList);

    const registeredSections = DeckValidator.extractSections(registeredDeck.raw);
    const reconfiguredSections = DeckValidator.extractSections(reconfiguredDeck.raw);

    DeckValidator.assertSectionUnchanged(
      "Legend",
      registeredSections.legend,
      reconfiguredSections.legend,
    );
    DeckValidator.assertSectionUnchanged(
      "Runes",
      registeredSections.runeDeck,
      reconfiguredSections.runeDeck,
    );
    DeckValidator.assertSectionUnchanged(
      "Battlefields",
      registeredSections.battlefields,
      reconfiguredSections.battlefields,
    );

    const registeredConfigurablePool = DeckValidator.buildCardsPool([
      registeredSections.champion,
      registeredSections.mainDeck,
      registeredSections.sideboard,
    ]);
    const reconfiguredPool = DeckValidator.buildCardsPool([
      reconfiguredSections.champion,
      reconfiguredSections.mainDeck,
      reconfiguredSections.sideboard,
    ]);

    if (!DeckValidator.areCardsPoolsEqual(registeredConfigurablePool, reconfiguredPool)) {
      throw new ValidationError(
        "Setup deck reconfiguration can only swap cards among Chosen Champion, Main Deck, and Sideboard.",
      );
    }

    return reconfiguredDeck;
  }

  private static runValidationRules(context: DeckValidationRuleContext): void {
    for (const rule of DeckValidator.RULE_PIPELINE) {
      if (!DeckValidator.RULE_SWITCHES[rule.id]) {
        continue;
      }

      rule.run(context);

      if (context.stop) {
        return;
      }
    }
  }

  private static validateBattlefieldsSection(
    context: DeckValidationRuleContext,
  ): void {
    const battlefieldsSection = context.sections.battlefields;

    if (!battlefieldsSection || battlefieldsSection.entries.length === 0) {
      context.reasons.push("Deck must include a Battlefields section.");
      context.validatedBattlefields = [];
      context.stop = true;
      return;
    }

    if (battlefieldsSection.invalidEntries > 0) {
      context.reasons.push("Deck must list a battlefield name for each battlefield entry.");
    }

    context.validatedBattlefields = DeckValidator.validateBattlefields(
      battlefieldsSection.entries.map((entry) => entry.name),
      context.reasons,
    );
  }

  private static buildViolations(
    reasons: string[],
  ): DeckValidationViolation[] {
    return reasons.map((message) => DeckValidator.toViolation(message));
  }

  private static toViolation(message: string): DeckValidationViolation {
    const mapped = DeckValidator.REASON_VIOLATION_MAP.find((entry) =>
      entry.pattern.test(message),
    );

    if (mapped) {
      return {
        code: mapped.code,
        message,
        ...(mapped.rule ? { rule: mapped.rule } : {}),
      };
    }

    return {
      code: DeckValidator.toViolationCode(message),
      message,
    };
  }

  private static toViolationCode(message: string): string {
    const normalized = message
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return normalized.length > 0 ? normalized : "DECK_VALIDATION_ERROR";
  }

  private static readonly REASON_VIOLATION_MAP: ReadonlyArray<{
    pattern: RegExp;
    code: string;
    rule?: string;
  }> = [
    { pattern: /^Deck must be provided\.$/, code: "DECK_REQUIRED" },
    {
      pattern: /^Deck must include exactly 1 Champion Legend\.$/,
      code: "LEGEND_COUNT_INVALID",
      rule: "103.1",
    },
    {
      pattern: /^Deck must include exactly 1 Chosen Champion Unit\.$/,
      code: "CHAMPION_COUNT_INVALID",
      rule: "103.2",
    },
    {
      pattern: /^[A-Za-z ]+ section must use "<count> <card name>" entries\.$/,
      code: "SECTION_ENTRY_FORMAT_INVALID",
    },
    {
      pattern: /^Deck must include a Main Deck section\.$/,
      code: "MAIN_DECK_SECTION_REQUIRED",
      rule: "103.2",
    },
    {
      pattern: /^Main Deck card copies must be between 1 and 3\.$/,
      code: "MAIN_DECK_COPY_COUNT_INVALID",
      rule: "103.2.b",
    },
    {
      pattern: /^Main Deck must not list the same card more than once\.$/,
      code: "MAIN_DECK_DUPLICATE_CARD",
    },
    {
      pattern: /^Main Deck must include at least 40 cards\.$/,
      code: "MAIN_DECK_SIZE_INVALID",
      rule: "103.2",
    },
    {
      pattern: /^Deck must include a Rune Deck section\.$/,
      code: "RUNE_DECK_SECTION_REQUIRED",
      rule: "103.3",
    },
    {
      pattern: /^Rune Deck section must use "<count> <card name>" entries\.$/,
      code: "RUNE_DECK_ENTRY_FORMAT_INVALID",
    },
    {
      pattern: /^Rune Deck must include exactly 12 cards\.$/,
      code: "RUNE_DECK_SIZE_INVALID",
      rule: "103.3.a",
    },
    {
      pattern: /^Sideboard section must use "<count> <card name>" entries\.$/,
      code: "SIDEBOARD_ENTRY_FORMAT_INVALID",
    },
    {
      pattern: /^Sideboard must not list the same card more than once\.$/,
      code: "SIDEBOARD_DUPLICATE_CARD",
    },
    {
      pattern:
        /^Chosen Champion, Main Deck, and Sideboard combined must not include more than 3 copies of the same card\.$/,
      code: "COMBINED_COPY_LIMIT_EXCEEDED",
      rule: "103.2.b.1",
    },
    {
      pattern: /^Card ".+" was not found in card catalog\.$/,
      code: "CARD_NOT_FOUND",
    },
    {
      pattern: /^Champion Legend must reference a legend card\.$/,
      code: "LEGEND_TYPE_INVALID",
    },
    {
      pattern: /^Chosen Champion must reference a champion unit\.$/,
      code: "CHAMPION_TYPE_INVALID",
      rule: "103.2.a.2",
    },
    {
      pattern: /^Main Deck can only contain unit, spell, or gear cards\.$/,
      code: "MAIN_DECK_CARD_TYPE_INVALID",
    },
    {
      pattern: /^Rune Deck can only contain rune cards\.$/,
      code: "RUNE_DECK_CARD_TYPE_INVALID",
    },
    {
      pattern: /^Battlefields section can only contain battlefield cards\.$/,
      code: "BATTLEFIELD_CARD_TYPE_INVALID",
    },
    {
      pattern: /^Chosen Champion must share a champion tag with Champion Legend\.$/,
      code: "CHAMPION_TAG_MISMATCH",
      rule: "103.2.a.2",
    },
    {
      pattern:
        /^Chosen Champion and Main Deck cards must match Champion Legend domain identity\.$/,
      code: "MAIN_DECK_DOMAIN_IDENTITY_MISMATCH",
      rule: "103.2.c",
    },
    {
      pattern: /^Rune Deck cards must match Champion Legend domain identity\.$/,
      code: "RUNE_DECK_DOMAIN_IDENTITY_MISMATCH",
      rule: "103.3.a.1",
    },
    {
      pattern: /^Battlefields must match Champion Legend domain identity when applicable\.$/,
      code: "BATTLEFIELD_DOMAIN_IDENTITY_MISMATCH",
    },
    {
      pattern: /^Deck must include a Battlefields section\.$/,
      code: "BATTLEFIELDS_SECTION_REQUIRED",
      rule: "103.4",
    },
    {
      pattern: /^Deck must list a battlefield name for each battlefield entry\.$/,
      code: "BATTLEFIELD_NAME_REQUIRED",
    },
    {
      pattern: /^Deck may include at most 3 total Signature cards\.$/,
      code: "SIGNATURE_COPY_LIMIT_EXCEEDED",
      rule: "103.2.d.1",
    },
    {
      pattern: /^All Signature cards must share the Champion Legend tag\.$/,
      code: "SIGNATURE_TAG_MISMATCH",
      rule: "103.2.d.2",
    },
    {
      pattern: /^Deck must include exactly 3 battlefields\.$/,
      code: "BATTLEFIELD_COUNT_INVALID",
    },
    {
      pattern: /^Deck must not include duplicate battlefields\.$/,
      code: "BATTLEFIELD_DUPLICATE",
    },
  ];

  static buildRuntimeDeckSnapshot(
    deckList: string,
    playerId: string,
  ): RuntimeDeckSnapshot {
    const normalizedPlayerId = playerId?.trim();

    if (!normalizedPlayerId) {
      throw new ValidationError("Player id is required to build deck state.");
    }

    const validatedDeck = DeckValidator.validate(deckList);
    const sections = DeckValidator.extractSections(validatedDeck.raw);
    const registrationRef = createHash("sha256")
      .update(validatedDeck.raw)
      .digest("hex")
      .slice(0, 16);

    const championEntry = DeckValidator.resolveChosenChampionEntry(sections.champion);
    if (!championEntry) {
      throw new ValidationError("Chosen champion entry is required to build deck state.");
    }

    const mainLibrary = DeckValidator.expandEntriesToInstances(
      [championEntry, ...(sections.mainDeck?.entries ?? [])],
      normalizedPlayerId,
      "main_deck",
      registrationRef,
    );
    const chosenChampionCardId = mainLibrary[0]?.id ?? "";
    if (!chosenChampionCardId) {
      throw new ValidationError("Chosen champion card instance is required to build deck state.");
    }
    const runeLibrary = DeckValidator.expandEntriesToInstances(
      sections.runeDeck?.entries ?? [],
      normalizedPlayerId,
      "rune_deck",
      registrationRef,
    );

    return {
      registrationRef,
      mainLibrary,
      chosenChampionCardId,
      runeLibrary,
      hand: [],
      trash: [],
    };
  }

  private static extractSections(deckList: string): ParsedDeckSections {
    const lines = deckList.split(/\r?\n/);
    const sections: ParsedDeckSections = {};
    let currentSection: keyof ParsedDeckSections | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const headerMatch = line.match(/^([A-Za-z][A-Za-z ]*):\s*$/);

      if (headerMatch) {
        currentSection = DeckValidator.normalizeSectionName(headerMatch[1] ?? "");
        continue;
      }

      if (!currentSection) {
        continue;
      }

      const section = DeckValidator.getOrCreateSection(sections, currentSection);
      const match = line.match(/^(\d+)\s+(.+)$/);

      if (!match) {
        section.invalidEntries += 1;
        continue;
      }

      const quantity = Number(match[1]);
      const name = match[2]?.trim() ?? "";

      if (!Number.isFinite(quantity) || quantity <= 0 || !name) {
        section.invalidEntries += 1;
        continue;
      }

      section.entries.push({ quantity, name });
    }

    return sections;
  }

  private static normalizeSectionName(
    sectionName: string,
  ): keyof ParsedDeckSections | null {
    const normalized = sectionName.toLowerCase().replace(/\s+/g, "");

    if (normalized === "legend") {
      return "legend";
    }

    if (normalized === "champion") {
      return "champion";
    }

    if (normalized === "maindeck") {
      return "mainDeck";
    }

    if (normalized === "runes" || normalized === "runedeck") {
      return "runeDeck";
    }

    if (normalized === "battlefields") {
      return "battlefields";
    }

    if (normalized === "sideboard") {
      return "sideboard";
    }

    return null;
  }

  private static getOrCreateSection(
    sections: ParsedDeckSections,
    sectionName: keyof ParsedDeckSections,
  ): DeckSection {
    const existing = sections[sectionName];

    if (existing) {
      return existing;
    }

    const created: DeckSection = { entries: [], invalidEntries: 0 };
    sections[sectionName] = created;

    return created;
  }

  private static validateSingletonSection(
    section: DeckSection | undefined,
    sectionName: string,
    cardRole: string,
    reasons: string[],
  ): void {
    if (!section || section.entries.length === 0) {
      reasons.push(`Deck must include exactly 1 ${cardRole}.`);
      return;
    }

    if (section.invalidEntries > 0) {
      reasons.push(`${sectionName} section must use "<count> <card name>" entries.`);
    }

    const total = section.entries.reduce((sum, entry) => sum + entry.quantity, 0);

    if (total !== 1) {
      reasons.push(`Deck must include exactly 1 ${cardRole}.`);
    }
  }

  private static validateMainDeckSection(
    section: DeckSection | undefined,
    championSection: DeckSection | undefined,
    reasons: string[],
  ): void {
    if (!section || section.entries.length === 0) {
      reasons.push("Deck must include a Main Deck section.");
      return;
    }

    if (section.invalidEntries > 0) {
      reasons.push('Main Deck section must use "<count> <card name>" entries.');
    }

    let hasOutOfRangeCopyCount = false;
    const seenCards = new Set<string>();
    let hasDuplicateCardEntries = false;

    for (const entry of section.entries) {
      if (entry.quantity < 1 || entry.quantity > 3) {
        hasOutOfRangeCopyCount = true;
      }

      const key = entry.name.trim().toLowerCase();
      if (seenCards.has(key)) {
        hasDuplicateCardEntries = true;
      } else {
        seenCards.add(key);
      }
    }

    if (hasOutOfRangeCopyCount) {
      reasons.push("Main Deck card copies must be between 1 and 3.");
    }

    if (hasDuplicateCardEntries) {
      reasons.push("Main Deck must not list the same card more than once.");
    }

    const mainDeckTotal = section.entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const championTotal = championSection?.entries.reduce(
      (sum, entry) => sum + entry.quantity,
      0,
    ) ?? 0;
    const total = mainDeckTotal + championTotal;

    if (total < 40) {
      reasons.push("Main Deck must include at least 40 cards.");
    }
  }

  private static validateRuneDeckSection(
    section: DeckSection | undefined,
    reasons: string[],
  ): void {
    if (!section || section.entries.length === 0) {
      reasons.push("Deck must include a Rune Deck section.");
      return;
    }

    if (section.invalidEntries > 0) {
      reasons.push('Rune Deck section must use "<count> <card name>" entries.');
    }

    const total = section.entries.reduce((sum, entry) => sum + entry.quantity, 0);

    if (total !== 12) {
      reasons.push("Rune Deck must include exactly 12 cards.");
    }
  }

  private static validateSideboardSection(
    section: DeckSection | undefined,
    reasons: string[],
  ): void {
    if (!section) {
      return;
    }

    if (section.invalidEntries > 0) {
      reasons.push('Sideboard section must use "<count> <card name>" entries.');
    }

    const seenCards = new Set<string>();
    let hasDuplicateCardEntries = false;

    for (const entry of section.entries) {
      const key = entry.name.trim().toLowerCase();

      if (seenCards.has(key)) {
        hasDuplicateCardEntries = true;
        break;
      }

      seenCards.add(key);
    }

    if (hasDuplicateCardEntries) {
      reasons.push("Sideboard must not list the same card more than once.");
    }
  }

  private static validateCombinedCopyLimit(
    champion: DeckSection | undefined,
    mainDeck: DeckSection | undefined,
    sideboard: DeckSection | undefined,
    reasons: string[],
  ): void {
    const copiesByCard = new Map<string, number>();

    const addEntries = (section: DeckSection | undefined): void => {
      if (!section) {
        return;
      }

      for (const entry of section.entries) {
        const key = entry.name.trim().toLowerCase();
        const updated = (copiesByCard.get(key) ?? 0) + entry.quantity;
        copiesByCard.set(key, updated);
      }
    };

    addEntries(champion);
    addEntries(mainDeck);
    addEntries(sideboard);

    for (const totalCopies of copiesByCard.values()) {
      if (totalCopies > 3) {
        reasons.push(
          "Chosen Champion, Main Deck, and Sideboard combined must not include more than 3 copies of the same card.",
        );
        break;
      }
    }
  }

  private static resolveCatalogEntries(
    sections: ParsedDeckSections,
    reasons: string[],
  ): ResolvedDeckSections {
    const unknownNames = new Set<string>();

    const resolveSection = (section: DeckSection | undefined): ResolvedSectionEntry[] => {
      if (!section) {
        return [];
      }

      const resolved: ResolvedSectionEntry[] = [];
      for (const entry of section.entries) {
        const card = resolveCatalogCardByName(entry.name);
        if (!card) {
          unknownNames.add(entry.name.trim());
        }

        resolved.push({ entry, card });
      }

      return resolved;
    };

    const resolvedSections: ResolvedDeckSections = {
      legend: resolveSection(sections.legend),
      champion: resolveSection(sections.champion),
      mainDeck: resolveSection(sections.mainDeck),
      runeDeck: resolveSection(sections.runeDeck),
      battlefields: resolveSection(sections.battlefields),
      sideboard: resolveSection(sections.sideboard),
    };

    for (const unknownName of unknownNames) {
      if (!unknownName) {
        continue;
      }

      reasons.push(`Card "${unknownName}" was not found in card catalog.`);
    }

    return resolvedSections;
  }

  private static validateCatalogCardTypes(
    resolved: ResolvedDeckSections,
    reasons: string[],
  ): void {
    if (resolved.legend.some((item) => item.card && item.card.cardType !== "legend")) {
      reasons.push("Champion Legend must reference a legend card.");
    }

    if (
      resolved.champion.some(
        (item) =>
          item.card &&
          !(item.card.cardType === "unit" && item.card.isChampionUnit),
      )
    ) {
      reasons.push("Chosen Champion must reference a champion unit.");
    }

    if (
      resolved.mainDeck.some(
        (item) =>
          item.card &&
          !(
            item.card.cardType === "unit" ||
            item.card.cardType === "spell" ||
            item.card.cardType === "gear"
          ),
      )
    ) {
      reasons.push("Main Deck can only contain unit, spell, or gear cards.");
    }

    if (resolved.runeDeck.some((item) => item.card && item.card.cardType !== "rune")) {
      reasons.push("Rune Deck can only contain rune cards.");
    }

    if (
      resolved.battlefields.some(
        (item) => item.card && item.card.cardType !== "battlefield",
      )
    ) {
      reasons.push("Battlefields section can only contain battlefield cards.");
    }
  }

  private static validateChosenChampionTagConstraint(
    resolved: ResolvedDeckSections,
    reasons: string[],
  ): void {
    const legendCard = DeckValidator.resolveSingletonCard(resolved.legend);
    const championCard = DeckValidator.resolveSingletonCard(resolved.champion);

    if (!legendCard || !championCard) {
      return;
    }

    const legendTags = new Set(
      legendCard.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    );
    const championTags = championCard.tags
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    if (legendTags.size === 0 || championTags.length === 0) {
      reasons.push("Chosen Champion must share a champion tag with Champion Legend.");
      return;
    }

    const matchesTag = championTags.some((tag) => legendTags.has(tag));
    if (!matchesTag) {
      reasons.push("Chosen Champion must share a champion tag with Champion Legend.");
    }
  }

  private static validateDomainIdentityConstraints(
    resolved: ResolvedDeckSections,
    reasons: string[],
  ): void {
    const legendCard = DeckValidator.resolveSingletonCard(resolved.legend);
    if (!legendCard) {
      return;
    }

    const legendDomains = new Set(
      legendCard.domains
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain && domain !== "colorless"),
    );

    const hasMainDeckDomainMismatch = [
      ...resolved.champion,
      ...resolved.mainDeck,
    ].some(
      (item) => item.card && !DeckValidator.isCardWithinDomainIdentity(item.card, legendDomains),
    );

    if (hasMainDeckDomainMismatch) {
      reasons.push("Chosen Champion and Main Deck cards must match Champion Legend domain identity.");
    }

    const hasRuneDeckDomainMismatch = resolved.runeDeck.some(
      (item) => item.card && !DeckValidator.isCardWithinDomainIdentity(item.card, legendDomains),
    );

    if (hasRuneDeckDomainMismatch) {
      reasons.push("Rune Deck cards must match Champion Legend domain identity.");
    }

    const hasBattlefieldDomainMismatch = resolved.battlefields.some(
      (item) =>
        item.card &&
        !DeckValidator.isCardWithinDomainIdentity(item.card, legendDomains) &&
        !DeckValidator.isDomainNotApplicable(item.card),
    );

    if (hasBattlefieldDomainMismatch) {
      reasons.push("Battlefields must match Champion Legend domain identity when applicable.");
    }
  }

  private static validateSignatureConstraints(
    resolved: ResolvedDeckSections,
    reasons: string[],
  ): void {
    const legendCard = DeckValidator.resolveSingletonCard(resolved.legend);
    const legendTags = new Set(
      (legendCard?.tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    );

    const signatureEntries = [
      ...resolved.champion,
      ...resolved.mainDeck,
      ...resolved.sideboard,
    ].filter((item) => item.card?.isSignature === true);

    const totalSignatureCopies = signatureEntries.reduce(
      (sum, item) => sum + item.entry.quantity,
      0,
    );

    if (totalSignatureCopies > 3) {
      reasons.push("Deck may include at most 3 total Signature cards.");
    }

    if (signatureEntries.length === 0 || legendTags.size === 0) {
      return;
    }

    const hasSignatureTagMismatch = signatureEntries.some((item) => {
      const cardTags = item.card?.tags ?? [];
      const normalizedCardTags = cardTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      return !normalizedCardTags.some((tag) => legendTags.has(tag));
    });

    if (hasSignatureTagMismatch) {
      reasons.push("All Signature cards must share the Champion Legend tag.");
    }
  }

  private static resolveSingletonCard(
    entries: ResolvedSectionEntry[],
  ): ResolvedCatalogCard | null {
    if (entries.length !== 1) {
      return null;
    }

    return entries[0]?.card ?? null;
  }

  private static isCardWithinDomainIdentity(
    card: ResolvedCatalogCard,
    legendDomains: ReadonlySet<string>,
  ): boolean {
    const cardDomains = card.domains
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    if (cardDomains.length === 0) {
      return true;
    }

    if (cardDomains.every((domain) => domain === "colorless")) {
      return true;
    }

    return cardDomains.every((domain) => legendDomains.has(domain));
  }

  private static isDomainNotApplicable(card: ResolvedCatalogCard): boolean {
    const cardDomains = card.domains
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    return cardDomains.length > 0 && cardDomains.every((domain) => domain === "colorless");
  }

  private static validateBattlefields(
    battlefields: string[],
    reasons: string[],
  ): string[] {
    if (battlefields.length !== 3) {
      reasons.push("Deck must include exactly 3 battlefields.");
    }

    const normalized = battlefields.map((battlefield) => battlefield.trim());
    const seen = new Set<string>();

    for (const battlefield of normalized) {
      const key = battlefield.toLowerCase();

      if (seen.has(key)) {
        reasons.push("Deck must not include duplicate battlefields.");
        break;
      }

      seen.add(key);
    }

    return normalized;
  }

  private static assertSectionUnchanged(
    sectionName: string,
    registeredSection: DeckSection | undefined,
    reconfiguredSection: DeckSection | undefined,
  ): void {
    const registeredPool = DeckValidator.buildCardsPool([registeredSection]);
    const reconfiguredPool = DeckValidator.buildCardsPool([reconfiguredSection]);

    if (!DeckValidator.areCardsPoolsEqual(registeredPool, reconfiguredPool)) {
      throw new ValidationError(
        `${sectionName} section cannot be changed during setup deck reconfiguration.`,
      );
    }
  }

  private static buildCardsPool(sections: ReadonlyArray<DeckSection | undefined>): Map<string, number> {
    const pool = new Map<string, number>();

    for (const section of sections) {
      if (!section) {
        continue;
      }

      for (const entry of section.entries) {
        const key = entry.name.trim().toLowerCase();
        const total = (pool.get(key) ?? 0) + entry.quantity;
        pool.set(key, total);
      }
    }

    return pool;
  }

  private static areCardsPoolsEqual(
    left: ReadonlyMap<string, number>,
    right: ReadonlyMap<string, number>,
  ): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const [cardName, leftCount] of left.entries()) {
      if ((right.get(cardName) ?? 0) !== leftCount) {
        return false;
      }
    }

    return true;
  }

  private static expandEntriesToInstances(
    entries: DeckEntry[],
    playerId: string,
    source: RuntimeDeckCardInstance["source"],
    registrationRef: string,
  ): RuntimeDeckCardInstance[] {
    const expanded: RuntimeDeckCardInstance[] = [];
    let sequence = 1;

    for (const entry of entries) {
      const resolvedCard = resolveCatalogCardByName(entry.name);
      if (!resolvedCard) {
        throw new ValidationError(
          `Card "${entry.name}" was not found in local set data.`,
        );
      }

      for (let copy = 0; copy < entry.quantity; copy += 1) {
        expanded.push({
          id: `${registrationRef}:${playerId}:${source}:${String(sequence).padStart(3, "0")}`,
          name: entry.name,
          publicCode: resolvedCard.publicCode,
          cardType: resolvedCard.cardType,
          source,
        });
        sequence += 1;
      }
    }

    return expanded;
  }

  private static resolveChosenChampionName(
    section: DeckSection | undefined,
  ): string | null {
    const entry = DeckValidator.resolveChosenChampionEntry(section);
    if (!entry) {
      return null;
    }

    return entry.name.trim() || null;
  }

  private static resolveChosenChampionEntry(
    section: DeckSection | undefined,
  ): DeckEntry | null {
    if (!section || section.entries.length !== 1) {
      return null;
    }

    const [entry] = section.entries;

    if (!entry || entry.quantity !== 1) {
      return null;
    }

    return entry;
  }
}
