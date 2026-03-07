import { ValidationError } from "../shared/errors";

export interface ValidatedDeck {
  raw: string;
  battlefields: string[];
}

export interface DeckValidationResult {
  isValid: boolean;
  reasons: string[];
  battlefields: string[];
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

export class DeckValidator {
  static validate(deckList: string): ValidatedDeck {
    const result = DeckValidator.validateWithReasons(deckList);

    if (!result.isValid) {
      throw new ValidationError(result.reasons[0] ?? "Deck list is invalid.");
    }

    return {
      raw: deckList.trim(),
      battlefields: result.battlefields,
    };
  }

  static validateWithReasons(deckList: string): DeckValidationResult {
    const reasons: string[] = [];

    if (typeof deckList !== "string" || deckList.trim().length === 0) {
      reasons.push("Deck must be provided.");
      return { isValid: false, reasons, battlefields: [] };
    }

    const raw = deckList.trim();
    const sections = DeckValidator.extractSections(raw);

    DeckValidator.validateSingletonSection(
      sections.legend,
      "Legend",
      "Champion Legend",
      reasons,
    );
    DeckValidator.validateSingletonSection(
      sections.champion,
      "Champion",
      "Chosen Champion Unit",
      reasons,
    );
    DeckValidator.validateMainDeckSection(sections.mainDeck, reasons);
    DeckValidator.validateRuneDeckSection(sections.runeDeck, reasons);
    DeckValidator.validateSideboardSection(sections.sideboard, reasons);
    DeckValidator.validateCombinedCopyLimit(
      sections.champion,
      sections.mainDeck,
      sections.sideboard,
      reasons,
    );

    const battlefieldsSection = sections.battlefields;

    if (!battlefieldsSection || battlefieldsSection.entries.length === 0) {
      reasons.push("Deck must include a Battlefields section.");
      return { isValid: false, reasons, battlefields: [] };
    }

    if (battlefieldsSection.invalidEntries > 0) {
      reasons.push("Deck must list a battlefield name for each battlefield entry.");
    }

    const validatedBattlefields = DeckValidator.validateBattlefields(
      battlefieldsSection.entries.map((entry) => entry.name),
      reasons,
    );

    return {
      isValid: reasons.length === 0,
      reasons,
      battlefields: validatedBattlefields,
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

    const total = section.entries.reduce((sum, entry) => sum + entry.quantity, 0);

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
}
