import type { SubmitGameplayIntentRequestDto } from "../dto/gameplay-intents.dto";
import type { MatchRepository } from "../../domain/match.repository";
import type { GameRepository } from "../../domain/game.repository";
import { MatchViewLoader } from "./match-view.loader";
import type { MatchView } from "../match.view";
import { ValidationError } from "../../shared/errors";

export class SubmitGameplayIntentService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async execute(input: SubmitGameplayIntentRequestDto): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.matchViewLoader.getCurrentGameOrThrow(match);

    const actorPlayerId = input.actorPlayerId?.trim();
    if (!actorPlayerId) {
      throw new ValidationError("actorPlayerId is required.");
    }

    const isActorInMatch = match.players.some((player) => player.id === actorPlayerId);
    if (!isActorInMatch) {
      throw new ValidationError("Actor must be one of the match players.");
    }

    if (game.status !== "ready") {
      throw new ValidationError("Current game must be in ready status for gameplay intents.");
    }

    if (!input.intent || typeof input.intent !== "object") {
      throw new ValidationError("Intent payload is required.");
    }

    if (input.intent.type === "ZONE_CHANGE") {
      throw new ValidationError(
        "ZONE_CHANGE is an engine action, not a gameplay intent. Use a high-level intent that resolves into actions.",
      );
    }

    throw new ValidationError(
      `Unsupported gameplay intent type "${input.intent.type}". No production gameplay intents are implemented yet.`,
    );
  }
}
