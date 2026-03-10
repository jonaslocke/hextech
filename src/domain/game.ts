export type GameStatus =
  | "setup_pending"
  | "ready"
  | "finished";

export interface Game {
  id: string;
  matchId: string;
  number: number;
  status: GameStatus;
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
