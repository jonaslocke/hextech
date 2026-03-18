import type {
  SubmitGameplayIntentRequestDto,
  ZoneChangeGameplayIntent,
} from "../dto/gameplay-intents.dto";
import type { DebugZoneChangeRequestDto } from "../dto/debug-zones.dto";
import type { MatchRepository } from "../../domain/match.repository";
import type { GameRepository } from "../../domain/game.repository";
import { MatchViewLoader } from "./match-view.loader";
import type { MatchView } from "../match.view";
import { ValidationError } from "../../shared/errors";
import { DebugGameplayZonesService } from "./debug-gameplay-zones.service";

export class SubmitGameplayIntentService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
    private readonly debugGameplayZonesService: DebugGameplayZonesService,
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

    if (input.intent.type !== "ZONE_CHANGE") {
      throw new ValidationError(`Unsupported gameplay intent type "${input.intent.type}".`);
    }

    return this.executeZoneChangeIntent(input.matchId, actorPlayerId, input.intent);
  }

  private async executeZoneChangeIntent(
    matchId: string,
    actorPlayerId: string,
    intent: ZoneChangeGameplayIntent,
  ): Promise<MatchView> {
    const cardControllerId = intent.payload.cardControllerId?.trim();
    if (!cardControllerId) {
      throw new ValidationError("cardControllerId is required for ZONE_CHANGE intent.");
    }

    if (cardControllerId !== actorPlayerId) {
      throw new ValidationError(
        "Actor must match cardControllerId for ZONE_CHANGE intent in this phase.",
      );
    }

    const request: DebugZoneChangeRequestDto = {
      matchId,
      cardId: intent.payload.cardId,
      cardControllerId: intent.payload.cardControllerId,
      source: intent.payload.source,
      destination: intent.payload.destination,
    };

    if (intent.payload.cardType !== undefined) {
      request.cardType = intent.payload.cardType;
    }
    if (intent.payload.cardOwnerId !== undefined) {
      request.cardOwnerId = intent.payload.cardOwnerId;
    }
    if (intent.payload.battlefieldControllerById !== undefined) {
      request.battlefieldControllerById = intent.payload.battlefieldControllerById;
    }

    return this.debugGameplayZonesService.applyZoneChange(request);
  }
}
