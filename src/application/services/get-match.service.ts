import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import type { MatchView } from "../match.view";
import { ValidationError } from "../../shared/errors";
import { MatchViewLoader } from "./match-view.loader";

export class GetMatchService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async execute(matchId: string, viewerPlayerId: string): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(matchId);
    const normalizedViewerPlayerId = viewerPlayerId.trim();
    if (!normalizedViewerPlayerId) {
      throw new ValidationError("viewerPlayerId is required.");
    }

    const isViewerInMatch = match.players.some((player) => player.id === normalizedViewerPlayerId);
    if (!isViewerInMatch) {
      throw new ValidationError("viewerPlayerId must be one of the match players.");
    }

    return this.matchViewLoader.build(match, { viewerPlayerId: normalizedViewerPlayerId });
  }
}
