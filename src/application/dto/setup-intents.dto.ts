export interface SelectChosenChampionIntentRequestDto {
  matchId: string;
  playerId: string;
  deckList?: string;
}

export interface SelectBattlefieldIntentRequestDto {
  matchId: string;
  playerId: string;
  battlefield?: string;
}

export interface SelectStartingPlayerIntentRequestDto {
  matchId: string;
  playerId: string;
  startingPlayerId: string;
}
