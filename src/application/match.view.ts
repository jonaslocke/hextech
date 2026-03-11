import type { Game } from "../domain/game";
import type { Match } from "../domain/match";

type PublicMatch = Omit<Match, "decksByPlayer">;
type PublicGame = Omit<Game, "deckStateByPlayer">;

export interface MatchView extends PublicMatch {
  currentGame: PublicGame | null;
  completedGames: PublicGame[];
  currentGameNumber: number;
}

function toPublicGame(game: Game): PublicGame {
  const { deckStateByPlayer: _deckStateByPlayer, ...publicGame } = game;
  return publicGame;
}

export function toMatchView(match: Match, orderedGames: Game[]): MatchView {
  const orderedPublicGames = orderedGames.map(toPublicGame);
  const gamesById = new Map(orderedPublicGames.map((game) => [game.id, game]));
  const currentGame = match.currentGameId
    ? (gamesById.get(match.currentGameId) ?? null)
    : null;
  const completedGames = orderedPublicGames.filter((game) => game.status === "finished");
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
