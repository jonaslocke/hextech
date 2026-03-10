import type { Game } from "../domain/game";
import type { Match } from "../domain/match";

type PublicMatch = Omit<Match, "decksByPlayer">;

export interface MatchView extends PublicMatch {
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
  const { decksByPlayer: _decksByPlayer, ...publicMatch } = match;

  return {
    ...publicMatch,
    currentGame,
    completedGames,
    currentGameNumber,
  };
}
