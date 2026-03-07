export type MatchFormat = "best-of-1" | "best-of-3";
export type MatchStatus = "setup_pending" | "ready" | "in_progress" | "finished";

export interface PlayerRef {
  id: string;
  displayName: string;
}

export interface MatchScore {
  [playerId: string]: number;
}

export interface Match {
  id: string;
  format: MatchFormat;
  status: MatchStatus;
  players: [PlayerRef, PlayerRef];
  games: string[];
  score: MatchScore;
  startingPlayerChooserId: string;
  startingPlayerId: string | null;
  decksByPlayer: Record<string, string>;
  chosenChampionByPlayer: Record<string, string>;
  battlefieldsByPlayer: Record<string, string[]>;
  selectedBattlefieldsByPlayer: Record<string, string>;
  battlefieldsUsedByPlayer: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  currentGameId: string | null;
  winnerPlayerId: string | null;
}
