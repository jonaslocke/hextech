import type { Game } from "../domain/game";
import type { Match } from "../domain/match";

export interface MatchView extends Match {
  currentGame: Game | null;
  completedGames: Game[];
  currentGameNumber: number;
}

export function toMatchView(match: Match, orderedGames: Game[]): MatchView {
  const gamesById = new Map(orderedGames.map((game) => [game.id, game]));
  const currentGame = match.currentGameId
    ? (gamesById.get(match.currentGameId) ?? null)
    : null;
  const completedGames = orderedGames.filter((game) => game.status === "finished");
  const currentGameNumber = currentGame
    ? currentGame.number
    : completedGames.length > 0
      ? completedGames[completedGames.length - 1]!.number
      : 1;

  return {
    ...match,
    currentGame,
    completedGames,
    currentGameNumber,
  };
}
