import type { Request, Response, NextFunction } from "express";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { SubmitSetupIntentService } from "../../application/services/submit-setup-intent.service";
import { DebugGameplayZonesService } from "../../application/services/debug-gameplay-zones.service";

export class MatchController {
  constructor(
    private readonly createMatchService: CreateMatchService,
    private readonly getMatchService: GetMatchService,
    private readonly recordGameResultService: RecordGameResultService,
    private readonly submitSetupIntentService: SubmitSetupIntentService,
    private readonly debugGameplayZonesService: DebugGameplayZonesService,
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
        winnerPlayerId: req.body?.winnerPlayerId,
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

  debugPlaceZoneCard = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.debugGameplayZonesService.placeCard({
        matchId: matchId ?? "",
        cardId: req.body?.cardId,
        cardControllerId: req.body?.cardControllerId,
        destination: req.body?.destination,
        battlefieldControllerById: req.body?.battlefieldControllerById,
      });

      return res.status(201).json({ data: match });
    } catch (error) {
      next(error);
    }
  };

  debugMoveZoneCard = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.debugGameplayZonesService.moveCard({
        matchId: matchId ?? "",
        cardId: req.body?.cardId,
        cardControllerId: req.body?.cardControllerId,
        cardOwnerId: req.body?.cardOwnerId,
        source: req.body?.source,
        destination: req.body?.destination,
        battlefieldControllerById: req.body?.battlefieldControllerById,
      });

      return res.status(201).json({ data: match });
    } catch (error) {
      next(error);
    }
  };

  debugCleanupHidden = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.debugGameplayZonesService.cleanupHiddenCards({
        matchId: matchId ?? "",
        battlefieldControllerById: req.body?.battlefieldControllerById,
        cardControllerById: req.body?.cardControllerById,
        cardOwnerById: req.body?.cardOwnerById,
      });

      return res.status(201).json({ data: match });
    } catch (error) {
      next(error);
    }
  };

  debugRevealGameEnd = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.debugGameplayZonesService.revealFacedownCardsOnGameEnd({
        matchId: matchId ?? "",
        cardOwnerById: req.body?.cardOwnerById,
      });

      return res.status(201).json({ data: match });
    } catch (error) {
      next(error);
    }
  };

  debugUpdateZoneRules = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const matchId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const match = await this.debugGameplayZonesService.updateZoneRules({
        matchId: matchId ?? "",
        defaultHiddenCapacityPerBattlefield:
          req.body?.defaultHiddenCapacityPerBattlefield,
        hiddenCapacityByBattlefield: req.body?.hiddenCapacityByBattlefield,
      });

      return res.status(201).json({ data: match });
    } catch (error) {
      next(error);
    }
  };
}
