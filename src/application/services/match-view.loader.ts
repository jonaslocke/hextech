import type { GameRepository } from "../../domain/game.repository";
import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { toMatchView, type MatchView } from "../match.view";

export class MatchViewLoader {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {}

  async getMatch(matchId: string): Promise<Match> {
    if (!matchId) {
      throw new ValidationError("Match id is required.");
    }

    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError("Match not found.");
    }

    return match;
  }

  async getCurrentGameOrThrow(match: Match) {
    const currentGameId = match.currentGameId;

    if (!currentGameId) {
      throw new ValidationError("Match has no active game.");
    }

    const game = await this.gameRepository.findById(currentGameId);

    if (!game) {
      throw new NotFoundError("Current game not found.");
    }

    return game;
  }

  async build(match: Match): Promise<MatchView> {
    const orderedGames = await this.gameRepository.findByIds(match.gameIds);
    return toMatchView(match, orderedGames);
  }
}
