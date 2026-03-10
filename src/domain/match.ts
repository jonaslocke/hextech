export type MatchFormat = "best-of-1" | "best-of-3";
export type MatchStatus = "setup_pending" | "ready" | "in_progress" | "finished";

export interface PlayerRef {
  id: string;
  displayName: string;
}

export interface MatchScore {
  [playerId: string]: number;
}

export interface BattlefieldRosterEntry {
  name: string;
  usedInGameNumbers: number[];
}

export interface Match {
  id: string;
  format: MatchFormat;
  status: MatchStatus;
  players: [PlayerRef, PlayerRef];
  games: string[];
  gameIds: string[];
  currentGameId: string | null;
  score: MatchScore;
  startingPlayerChooserId: string;
  decksByPlayer: Record<string, string>;
  battlefieldRosterByPlayer: Record<string, BattlefieldRosterEntry[]>;
  battlefieldsUsedByPlayer: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  winnerPlayerId: string | null;
  version: number;
}
