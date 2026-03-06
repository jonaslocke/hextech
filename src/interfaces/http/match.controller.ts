import type { Request, Response, NextFunction } from "express";
import { CreateMatchService } from "../../application/services/create-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";

export class MatchController {
  constructor(
    private readonly createMatchService: CreateMatchService,
    private readonly recordGameResultService: RecordGameResultService,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await this.createMatchService.execute(req.body);

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };

  recordGame = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await this.recordGameResultService.execute({
        matchId: req.params.id,
        gameId: req.body?.gameId,
        winnerPlayerId: req.body?.winnerPlayerId,
      });

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };
}
