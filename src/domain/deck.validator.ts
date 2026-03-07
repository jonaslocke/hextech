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
    const extracted = DeckValidator.extractBattlefields(raw);
    const battlefields = extracted.battlefields;

    if (extracted.invalidEntries > 0) {
      reasons.push("Deck must list a battlefield name for each battlefield entry.");
    }

    if (battlefields.length === 0) {
      reasons.push("Deck must include a Battlefields section.");
      return { isValid: false, reasons, battlefields: [] };
    }

    const validatedBattlefields = DeckValidator.validateBattlefields(
      battlefields,
      reasons,
    );

    return {
      isValid: reasons.length === 0,
      reasons,
      battlefields: validatedBattlefields,
    };
  }

  private static extractBattlefields(deckList: string): {
    battlefields: string[];
    invalidEntries: number;
  } {
    const lines = deckList.split(/\r?\n/);
    const battlefields: string[] = [];
    let inBattlefieldsSection = false;
    let invalidEntries = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        if (inBattlefieldsSection) {
          break;
        }
        continue;
      }

      if (/^[A-Za-z].*:\s*$/.test(line)) {
        if (line.toLowerCase() === "battlefields:") {
          inBattlefieldsSection = true;
          continue;
        }

        if (inBattlefieldsSection) {
          break;
        }
      }

      if (!inBattlefieldsSection) {
        continue;
      }

      const match = line.match(/^(\d+)\s+(.+)$/);

      if (!match) {
        invalidEntries += 1;
        continue;
      }

      const name = match[2]?.trim() ?? "";

      if (!name) {
        invalidEntries += 1;
        continue;
      }

      battlefields.push(name);
    }

    return { battlefields, invalidEntries };
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
