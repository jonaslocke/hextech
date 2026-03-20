export type GameplayIntentType = string;

export interface GameplayIntentRequest {
  type: GameplayIntentType;
  expectedSequence?: number;
  payload?: Record<string, unknown>;
}

export interface SubmitGameplayIntentRequestDto {
  matchId: string;
  actorPlayerId: string;
  intent: GameplayIntentRequest;
}
