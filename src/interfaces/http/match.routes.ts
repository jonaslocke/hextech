import { Router } from "express";
import { MatchController } from "./match.controller";
import { CreateMatchService } from "../../application/services/create-match.service";
import { RecordGameResultService } from "../../application/services/record-game-result.service";
import { InMemoryMatchRepository } from "../../infrastructure/repositories/in-memory-match.repository";

const router = Router();

const matchRepository = new InMemoryMatchRepository();
const createMatchService = new CreateMatchService(matchRepository);
const recordGameResultService = new RecordGameResultService(matchRepository);
const matchController = new MatchController(
  createMatchService,
  recordGameResultService,
);

router.post("/matches", matchController.create);
router.post("/matches/:id/games", matchController.recordGame);

export { router as matchRoutes };
