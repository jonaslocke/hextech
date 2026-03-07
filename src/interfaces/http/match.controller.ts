import type { Request, Response, NextFunction } from "express";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { SubmitSetupIntentService } from "../../application/services/submit-setup-intent.service";

export class MatchController {
  constructor(
    private readonly createMatchService: CreateMatchService,
    private readonly getMatchService: GetMatchService,
    private readonly recordGameResultService: RecordGameResultService,
    private readonly submitSetupIntentService: SubmitSetupIntentService,
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

  selectChosenChampion = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.submitSetupIntentService.selectChosenChampion({
        matchId: matchId ?? "",
        playerId: req.body?.playerId,
      });

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };

  selectBattlefield = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.submitSetupIntentService.selectBattlefield({
        matchId: matchId ?? "",
        playerId: req.body?.playerId,
        battlefield: req.body?.battlefield,
      });

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };

  selectStartingPlayer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.submitSetupIntentService.selectStartingPlayer({
        matchId: matchId ?? "",
        playerId: req.body?.playerId,
        startingPlayerId: req.body?.startingPlayerId,
      });

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };
}
