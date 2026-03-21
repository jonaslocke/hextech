import { Router } from "express";
import { MatchController } from "./match.controller";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { SubmitSetupIntentService } from "../../application/services/submit-setup-intent.service";
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
const matchController = new MatchController(
  createMatchService,
  getMatchService,
  recordGameResultService,
  submitSetupIntentService,
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

export { router as matchRoutes };
