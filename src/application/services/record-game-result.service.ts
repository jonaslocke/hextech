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
    const { matchId, gameId, winnerPlayerId, nextGameSelectedBattlefieldsByPlayer } =
      input;

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

    if (match.status === "setup_pending") {
      throw new ValidationError("Match setup is pending.");
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

    let resolvedSelectedBattlefieldsByPlayer = match.selectedBattlefieldsByPlayer;
    let resolvedBattlefieldsUsedByPlayer = match.battlefieldsUsedByPlayer ?? {};

    if (!isMatchFinished && match.format === "best-of-3") {
      if (!nextGameSelectedBattlefieldsByPlayer) {
        throw new ValidationError(
          "Next game battlefields are required for best-of-3.",
        );
      }

      const playerIds = match.players.map((player) => player.id);
      const nextSelections: Record<string, string> = {};
      const nextUsed: Record<string, string[]> = { ...resolvedBattlefieldsUsedByPlayer };

      for (const playerId of playerIds) {
        const selection = nextGameSelectedBattlefieldsByPlayer[playerId];
        const pool = match.battlefieldsByPlayer[playerId] ?? [];
        const used = nextUsed[playerId] ?? [];

        if (!selection) {
          throw new ValidationError(
            "Each player must select a battlefield for the next game.",
          );
        }

        if (!pool.includes(selection)) {
          throw new ValidationError(
            "Selected battlefield must be one of the provided battlefields.",
          );
        }

        if (used.some((battlefield) => battlefield.toLowerCase() === selection.toLowerCase())) {
          throw new ValidationError(
            "Battlefield has already been selected in this match.",
          );
        }

        nextSelections[playerId] = selection;
        nextUsed[playerId] = [...used, selection];
      }

      resolvedSelectedBattlefieldsByPlayer = nextSelections;
      resolvedBattlefieldsUsedByPlayer = nextUsed;
    }

    const updatedMatch: Match = {
      ...match,
      games: [...match.games, gameId],
      score: updatedScore,
      status: isMatchFinished ? "finished" : "in_progress",
      winnerPlayerId: isMatchFinished ? winnerPlayerId : null,
      currentGameId: nextGameId,
      selectedBattlefieldsByPlayer: resolvedSelectedBattlefieldsByPlayer,
      battlefieldsUsedByPlayer: resolvedBattlefieldsUsedByPlayer,
      updatedAt: new Date().toISOString(),
    };

    await this.matchRepository.save(updatedMatch);

    return updatedMatch;
  }
}
