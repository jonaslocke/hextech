import type { Request, Response, NextFunction } from "express";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";

export class MatchController {
  constructor(
    private readonly createMatchService: CreateMatchService,
    private readonly getMatchService: GetMatchService,
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
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.recordGameResultService.execute({
        matchId: matchId ?? "",
        gameId: req.body?.gameId,
        winnerPlayerId: req.body?.winnerPlayerId,
        nextGameSelectedBattlefieldsByPlayer:
          req.body?.nextGameSelectedBattlefieldsByPlayer,
      });

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.getMatchService.execute(matchId ?? "");

      return res.status(200).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };
}
