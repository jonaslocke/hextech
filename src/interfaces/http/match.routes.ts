import { Router } from "express";
import { MatchController } from "./match.controller";
import { CreateMatchService } from "../../application/services/create-match.service";
import { InMemoryMatchRepository } from "../../infrastructure/repositories/in-memory-match.repository";

const router = Router();

const matchRepository = new InMemoryMatchRepository();
const createMatchService = new CreateMatchService(matchRepository);
const matchController = new MatchController(createMatchService);

router.post("/matches", matchController.create);

export { router as matchRoutes };
