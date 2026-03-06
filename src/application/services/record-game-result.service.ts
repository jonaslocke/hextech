import { randomUUID } from "node:crypto";
import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import type { RecordGameResultRequestDto } from "../dto/record-game.dto";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class RecordGameResultService {
  constructor(private readonly matchRepository: MatchRepository) {}

  private getRequiredWins(format: Match["format"]): number {
    switch (format) {
      case "best-of-1":
        return 1;
      case "best-of-3":
        return 2;
      default:
        return 1;
    }
  }

  async execute(input: RecordGameResultRequestDto): Promise<Match> {
    const { matchId, gameId, winnerPlayerId } = input;

    if (!matchId) {
      throw new ValidationError("Match id is required.");
    }

    if (!gameId) {
      throw new ValidationError("Game id is required.");
    }

    if (!winnerPlayerId) {
      throw new ValidationError("Winner player id is required.");
    }

    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError("Match not found.");
    }

    if (match.status === "finished" || match.winnerPlayerId) {
      throw new ValidationError("Match is already finished.");
    }

    if (match.games.includes(gameId)) {
      throw new ValidationError("Game has already been recorded.");
    }

    const hasWinner = match.players.some(
      (player) => player.id === winnerPlayerId,
    );

    if (!hasWinner) {
      throw new ValidationError("Winner must be one of the match players.");
    }

    const updatedScore = {
      ...match.score,
      [winnerPlayerId]: (match.score[winnerPlayerId] ?? 0) + 1,
    };

    const requiredWins = this.getRequiredWins(match.format);
    const winnerScore = updatedScore[winnerPlayerId] ?? 0;
    const isMatchFinished = winnerScore >= requiredWins;

    const nextGameId = isMatchFinished
      ? null
      : `game_${randomUUID()}`;

    const updatedMatch: Match = {
      ...match,
      games: [...match.games, gameId],
      score: updatedScore,
      status: isMatchFinished ? "finished" : "in_progress",
      winnerPlayerId: isMatchFinished ? winnerPlayerId : null,
      currentGameId: nextGameId,
      updatedAt: new Date().toISOString(),
    };

    await this.matchRepository.save(updatedMatch);

    return updatedMatch;
  }
}
