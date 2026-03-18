import { Router } from "express";
import { MatchController } from "./match.controller";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { SubmitSetupIntentService } from "../../application/services/submit-setup-intent.service";
import { DebugGameplayZonesService } from "../../application/services/debug-gameplay-zones.service";
import { SubmitGameplayIntentService } from "../../application/services/submit-gameplay-intent.service";
import { InMemoryGameRepository } from "../../infrastructure/repositories/in-memory-game.repository";
import { InMemoryMatchRepository } from "../../infrastructure/repositories/in-memory-match.repository";

const router = Router();

const matchRepository = new InMemoryMatchRepository();
const gameRepository = new InMemoryGameRepository();
const createMatchService = new CreateMatchService(matchRepository, gameRepository);
const getMatchService = new GetMatchService(matchRepository, gameRepository);
const recordGameResultService = new RecordGameResultService(
  matchRepository,
  gameRepository,
);
const submitSetupIntentService = new SubmitSetupIntentService(
  matchRepository,
  gameRepository,
);
const debugGameplayZonesService = new DebugGameplayZonesService(
  matchRepository,
  gameRepository,
);
const submitGameplayIntentService = new SubmitGameplayIntentService(
  matchRepository,
  gameRepository,
  debugGameplayZonesService,
);
const matchController = new MatchController(
  createMatchService,
  getMatchService,
  recordGameResultService,
  submitSetupIntentService,
  debugGameplayZonesService,
  submitGameplayIntentService,
);

router.post("/matches", matchController.create);
router.get("/matches/:id", matchController.getById);
router.post("/matches/:id/setup/champion", matchController.selectChosenChampion);
router.post("/matches/:id/setup/battlefield", matchController.selectBattlefield);
router.post(
  "/matches/:id/setup/starting-player",
  matchController.selectStartingPlayer,
);
router.post("/matches/:id/games", matchController.recordGame);
router.post("/matches/:id/gameplay/intents", matchController.submitGameplayIntent);
router.post("/matches/:id/debug/zones/change", matchController.debugZoneChangeCard);

export { router as matchRoutes };
