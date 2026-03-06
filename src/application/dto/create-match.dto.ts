import type { MatchFormat } from "../../domain/match";

export interface CreateMatchRequestDto {
  format: MatchFormat;
  players: Array<{
    id: string;
    displayName: string;
  }>;
}
