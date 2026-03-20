import {
  DeckValidator,
  type DeckValidationViolation,
} from "../../domain/deck.validator";

export interface ValidateDeckResult {
  isValid: boolean;
  reasons: string[];
  violations: DeckValidationViolation[];
  battlefields: string[];
}

export class ValidateDeckService {
  execute(deckList: unknown): ValidateDeckResult {
    const result = DeckValidator.validateWithReasons(
      typeof deckList === "string" ? deckList : "",
    );

    return {
      isValid: result.isValid,
      reasons: result.reasons,
      violations: result.violations,
      battlefields: result.battlefields,
    };
  }
}
