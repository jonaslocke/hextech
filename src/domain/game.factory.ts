import { randomUUID } from "node:crypto";
import type { Game } from "./game";

interface CreateGameParams {
  matchId: string;
  number: number;
  chosenChampionByPlayer?: Record<string, string>;
  selectedBattlefieldsByPlayer?: Record<string, string>;
  startingPlayerId?: string | null;
  status?: Game["status"];
}

export class GameFactory {
  static create(params: CreateGameParams): Game {
    const now = new Date().toISOString();

    return {
      id: `game_${randomUUID()}`,
      matchId: params.matchId,
      number: params.number,
      status: params.status ?? "setup_pending",
      chosenChampionByPlayer: { ...(params.chosenChampionByPlayer ?? {}) },
      selectedBattlefieldsByPlayer: { ...(params.selectedBattlefieldsByPlayer ?? {}) },
      startingPlayerId: params.startingPlayerId ?? null,
      winnerPlayerId: null,
      reportedGameId: null,
      resultReportedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }
}
