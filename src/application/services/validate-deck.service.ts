import { DeckValidator } from "../../domain/deck.validator";

export interface ValidateDeckResult {
  isValid: boolean;
  reasons: string[];
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
      battlefields: result.battlefields,
    };
  }
}
