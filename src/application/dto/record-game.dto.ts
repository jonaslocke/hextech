export interface RecordGameResultRequestDto {
  matchId: string;
  gameId: string;
  winnerPlayerId: string;
  nextGameSelectedBattlefieldsByPlayer?: Record<string, string>;
}
