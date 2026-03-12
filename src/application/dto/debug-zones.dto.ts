import type { GameplayZoneRef } from "../../domain/gameplay.zone-transition";

export interface DebugPlaceCardRequestDto {
  matchId: string;
  cardId: string;
  cardControllerId: string;
  destination: GameplayZoneRef;
  battlefieldControllerById?: Record<string, string | null>;
}

export interface DebugMoveCardRequestDto {
  matchId: string;
  cardId: string;
  cardControllerId: string;
  cardOwnerId?: string;
  source: GameplayZoneRef;
  destination: GameplayZoneRef;
  battlefieldControllerById?: Record<string, string | null>;
}

export interface DebugCleanupHiddenRequestDto {
  matchId: string;
  battlefieldControllerById: Record<string, string | null>;
  cardControllerById: Record<string, string>;
  cardOwnerById?: Record<string, string>;
}

export interface DebugRevealGameEndRequestDto {
  matchId: string;
  cardOwnerById: Record<string, string>;
}

export interface DebugUpdateZoneRulesRequestDto {
  matchId: string;
  defaultHiddenCapacityPerBattlefield?: number;
  hiddenCapacityByBattlefield?: Record<string, number>;
}
