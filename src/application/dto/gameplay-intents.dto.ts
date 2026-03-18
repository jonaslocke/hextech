import type { DebugZoneChangeRequestDto } from "./debug-zones.dto";

export type GameplayIntentType = "ZONE_CHANGE";

export interface ZoneChangeGameplayIntent {
  type: "ZONE_CHANGE";
  expectedSequence?: number;
  payload: Omit<DebugZoneChangeRequestDto, "matchId">;
}

export type GameplayIntentRequest = ZoneChangeGameplayIntent;

export interface SubmitGameplayIntentRequestDto {
  matchId: string;
  actorPlayerId: string;
  intent: GameplayIntentRequest;
}
