export type MatchFormat = "best-of-1" | "best-of-3";
export type MatchStatus = "waiting" | "ready" | "in_progress" | "finished";

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
  startingPlayerId: string;
  decksByPlayer: Record<string, string>;
  battlefieldsByPlayer: Record<string, string[]>;
  selectedBattlefieldsByPlayer: Record<string, string>;
  battlefieldsUsedByPlayer: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  currentGameId: string | null;
  winnerPlayerId: string | null;
}
