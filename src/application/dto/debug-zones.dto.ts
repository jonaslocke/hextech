import type { GameplayZoneRef } from "../../domain/gameplay.zone-transition";
import type { CardType } from "../../domain/zone-policy";

export interface DebugZoneChangeRequestDto {
  matchId: string;
  cardId: string;
  cardControllerId: string;
  cardType?: CardType;
  cardOwnerId?: string;
  source: GameplayZoneRef;
  destination: GameplayZoneRef;
  battlefieldControllerById?: Record<string, string | null>;
}
