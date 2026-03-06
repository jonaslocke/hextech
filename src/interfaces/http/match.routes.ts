import { Router } from "express";
import { MatchController } from "./match.controller";
import { CreateMatchService } from "../../application/services/create-match.service";
import { GetMatchService } from "../../application/services/get-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { InMemoryMatchRepository } from "../../infrastructure/repositories/in-memory-match.repository";

const router = Router();

const matchRepository = new InMemoryMatchRepository();
const createMatchService = new CreateMatchService(matchRepository);
const getMatchService = new GetMatchService(matchRepository);
const recordGameResultService = new RecordGameResultService(matchRepository);
const matchController = new MatchController(
  createMatchService,
  getMatchService,
  recordGameResultService,
);

router.post("/matches", matchController.create);
router.get("/matches/:id", matchController.getById);
router.post("/matches/:id/games", matchController.recordGame);

export { router as matchRoutes };
