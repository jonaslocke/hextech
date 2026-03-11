export type GameStatus =
  | "setup_pending"
  | "ready"
  | "finished";

export type DeckCardSource = "main_deck" | "rune_deck";

export interface DeckCardInstance {
  id: string;
  name: string;
  source: DeckCardSource;
}

export interface GamePlayerDeckState {
  registrationRef: string;
  mainLibrary: DeckCardInstance[];
  runeLibrary: DeckCardInstance[];
  hand: DeckCardInstance[];
  trash: DeckCardInstance[];
}

export interface Game {
  id: string;
  matchId: string;
  number: number;
  status: GameStatus;
  deckStateByPlayer: Record<string, GamePlayerDeckState>;
  chosenChampionByPlayer: Record<string, string>;
  selectedBattlefieldsByPlayer: Record<string, string>;
  startingPlayerId: string | null;
  winnerPlayerId: string | null;
  reportedGameId: string | null;
  resultReportedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
