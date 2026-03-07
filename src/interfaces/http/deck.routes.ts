import { Router } from "express";
import { DeckController } from "./deck.controller";
import { ValidateDeckService } from "../../application/services/validate-deck.service";

const router = Router();

const validateDeckService = new ValidateDeckService();
const deckController = new DeckController(validateDeckService);

router.post("/decks/validate", deckController.validate);

export { router as deckRoutes };
