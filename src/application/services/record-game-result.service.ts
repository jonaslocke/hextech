import type { Game } from "../../domain/game";
import { GameFactory } from "../../domain/game.factory";
import type { GameRepository } from "../../domain/game.repository";
import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import type { RecordGameResultRequestDto } from "../dto/record-game.dto";
import { ValidationError } from "../../shared/errors";
import { MatchViewLoader } from "./match-view.loader";
import type { MatchView } from "../match.view";

export class RecordGameResultService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

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

  private getMaxGames(format: Match["format"]): number {
    switch (format) {
      case "best-of-1":
        return 1;
      case "best-of-3":
        return 3;
      default:
        return 1;
    }
  }

  async execute(input: RecordGameResultRequestDto): Promise<MatchView> {
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

    const match = await this.matchViewLoader.getMatch(matchId);
    const currentGame = await this.matchViewLoader.getCurrentGameOrThrow(match);

    if (match.status === "setup_pending" || currentGame.status === "setup_pending") {
      throw new ValidationError("Match setup is pending.");
    }

    if (match.status === "finished" || match.winnerPlayerId) {
      throw new ValidationError("Match is already finished.");
    }

    if (match.games.includes(gameId)) {
      throw new ValidationError("Game has already been recorded.");
    }

    const hasWinner = match.players.some((player) => player.id === winnerPlayerId);

    if (!hasWinner) {
      throw new ValidationError("Winner must be one of the match players.");
    }

    const updatedScore = {
      ...match.score,
      [winnerPlayerId]: (match.score[winnerPlayerId] ?? 0) + 1,
    };
    const requiredWins = this.getRequiredWins(match.format);
    const maxGames = this.getMaxGames(match.format);
    const isMatchFinished = (updatedScore[winnerPlayerId] ?? 0) >= requiredWins;

    if (!isMatchFinished && currentGame.number + 1 > maxGames) {
      throw new ValidationError("Cannot start another game in this match.");
    }

    const finishedGame: Game = {
      ...currentGame,
      status: "finished",
      winnerPlayerId,
      reportedGameId: gameId,
      resultReportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: currentGame.version + 1,
    };

    let nextBattlefieldPoolByPlayer = this.withCurrentGameSelectionsEnsuredInPool(
      match,
      finishedGame,
    );

    let nextGame: Game | null = null;
    let nextStartingPlayerChooserId = match.startingPlayerChooserId;

    if (!isMatchFinished) {
      const nextGameNumber = finishedGame.number + 1;

      nextGame = GameFactory.create({
        matchId: match.id,
        number: nextGameNumber,
        status: "setup_pending",
        deckRegistrationsByPlayer: match.decksByPlayer,
      });
      nextStartingPlayerChooserId = this.resolveNextStartingPlayerChooser(
        match,
        winnerPlayerId,
      );
    }

    const updatedMatch: Match = {
      ...match,
      games: [...match.games, gameId],
      gameIds: nextGame ? [...match.gameIds, nextGame.id] : [...match.gameIds],
      currentGameId: nextGame ? nextGame.id : finishedGame.id,
      score: updatedScore,
      status: isMatchFinished ? "finished" : "setup_pending",
      winnerPlayerId: isMatchFinished ? winnerPlayerId : null,
      startingPlayerChooserId: nextStartingPlayerChooserId,
      battlefieldPoolByPlayer: nextBattlefieldPoolByPlayer,
      updatedAt: new Date().toISOString(),
      version: match.version + 1,
    };

    await this.gameRepository.save(finishedGame);
    if (nextGame) {
      await this.gameRepository.save(nextGame);
    }
    await this.matchRepository.save(updatedMatch);

    return this.matchViewLoader.build(updatedMatch);
  }

  private resolveNextStartingPlayerChooser(
    match: Match,
    winnerPlayerId: string,
  ): string {
    const loser = match.players.find((player) => player.id !== winnerPlayerId);
    if (!loser) {
      throw new ValidationError("Unable to resolve next starting player chooser.");
    }

    return loser.id;
  }

  private withCurrentGameSelectionsEnsuredInPool(
    match: Match,
    game: Game,
  ): Match["battlefieldPoolByPlayer"] {
    const playerIds = match.players.map((player) => player.id);
    const nextPool = { ...match.battlefieldPoolByPlayer };

    for (const playerId of playerIds) {
      const selected = game.selectedBattlefieldsByPlayer[playerId];
      if (!selected) {
        continue;
      }

      const selectedKey = selected.toLowerCase();
      nextPool[playerId] = (nextPool[playerId] ?? []).map((entry) =>
        entry.name.toLowerCase() !== selectedKey
          ? entry
          : {
              ...entry,
              used: true,
            },
      );
    }

    return nextPool;
  }
}
