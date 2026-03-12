import { randomUUID } from "node:crypto";
import type { Game } from "./game";
import { DeckValidator } from "./deck.validator";
import { createEmptyGameplayRuntime } from "./gameplay";

interface CreateGameParams {
  matchId: string;
  number: number;
  deckRegistrationsByPlayer?: Record<string, string>;
  chosenChampionByPlayer?: Record<string, string>;
  selectedBattlefieldsByPlayer?: Record<string, string>;
  startingPlayerId?: string | null;
  status?: Game["status"];
}

export class GameFactory {
  static create(params: CreateGameParams): Game {
    const now = new Date().toISOString();
    const deckStateByPlayer: Game["deckStateByPlayer"] = {};

    for (const [playerId, deckList] of Object.entries(
      params.deckRegistrationsByPlayer ?? {},
    )) {
      deckStateByPlayer[playerId] = DeckValidator.buildRuntimeDeckSnapshot(
        deckList,
        playerId,
      );
    }
    const gameplay = createEmptyGameplayRuntime(Object.keys(deckStateByPlayer));

    return {
      id: `game_${randomUUID()}`,
      matchId: params.matchId,
      number: params.number,
      status: params.status ?? "setup_pending",
      gameplay,
      deckStateByPlayer,
      chosenChampionByPlayer: { ...(params.chosenChampionByPlayer ?? {}) },
      selectedBattlefieldsByPlayer: { ...(params.selectedBattlefieldsByPlayer ?? {}) },
      startingPlayerId: params.startingPlayerId ?? null,
      winnerPlayerId: null,
      resultReportedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }
}
