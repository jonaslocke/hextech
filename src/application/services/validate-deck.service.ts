import { DeckValidator } from "../../domain/deck.validator";

export interface ValidateDeckResult {
  isValid: boolean;
  reasons: string[];
  battlefields: string[];
}

export class ValidateDeckService {
  execute(deckList: unknown): ValidateDeckResult {
    return DeckValidator.validateWithReasons(
      typeof deckList === "string" ? deckList : "",
    );
  }
}
