import type { Request, Response, NextFunction } from "express";
import { ValidateDeckService } from "../../application/services/validate-deck.service";

export class DeckController {
  constructor(private readonly validateDeckService: ValidateDeckService) {}

  validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.validateDeckService.execute(req.body?.deckList);

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
