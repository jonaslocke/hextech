import { randomUUID } from "node:crypto";
import type { Match, MatchFormat, PlayerRef } from "./match";
import { ValidationError } from "../shared/errors";

interface CreateMatchParams {
  format: MatchFormat;
  players: PlayerRef[];
  decksByPlayer: Record<string, string>;
  selectedBattlefieldsByPlayer?: Record<string, string>;
}

export class MatchFactory {
  private static extractBattlefields(deckList: string): string[] {
    const lines = deckList.split(/\r?\n/);
    const battlefields: string[] = [];
    let inBattlefieldsSection = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        if (inBattlefieldsSection) {
          break;
        }
        continue;
      }

      if (/^[A-Za-z].*:\s*$/.test(line)) {
        if (line.toLowerCase() === "battlefields:") {
          inBattlefieldsSection = true;
          continue;
        }

        if (inBattlefieldsSection) {
          break;
        }
      }

      if (!inBattlefieldsSection) {
        continue;
      }

      const name = line.replace(/^\d+\s+/, "").trim();

      if (name) {
        battlefields.push(name);
      }
    }

    return battlefields;
  }

  private static validateBattlefields(battlefields: string[]): string[] {
    if (battlefields.length !== 3) {
      throw new ValidationError("Each player must provide exactly 3 battlefields.");
    }

    const normalized = battlefields.map((battlefield) => battlefield.trim());
    const seen = new Set<string>();

    for (const battlefield of normalized) {
      const key = battlefield.toLowerCase();

      if (seen.has(key)) {
        throw new ValidationError("Battlefield roster must not include duplicates.");
      }

      seen.add(key);
    }

    return normalized;
  }

  static create(params: CreateMatchParams): Match {
    const { format, players, decksByPlayer, selectedBattlefieldsByPlayer } = params;

    const validFormats: MatchFormat[] = ["best-of-1", "best-of-3"];

    if (!format || !validFormats.includes(format)) {
      throw new ValidationError("Match format is invalid.");
    }

    if (!Array.isArray(players) || players.length !== 2) {
      throw new ValidationError("A match must have exactly 2 players.");
    }

    const [playerA, playerB] = players;

    if (!playerA?.id || !playerA?.displayName) {
      throw new ValidationError("Player A is invalid.");
    }

    if (!playerB?.id || !playerB?.displayName) {
      throw new ValidationError("Player B is invalid.");
    }

    if (playerA.id === playerB.id) {
      throw new ValidationError("Players must be different.");
    }

    if (!decksByPlayer || typeof decksByPlayer !== "object") {
      throw new ValidationError("Decks are required.");
    }

    const playerIds = players.map((player) => player.id);
    const normalizedDecksByPlayer: Record<string, string> = {};
    const normalizedBattlefieldsByPlayer: Record<string, string[]> = {};

    for (const playerId of playerIds) {
      const deckList = decksByPlayer[playerId];

      if (typeof deckList !== "string" || deckList.trim().length === 0) {
        throw new ValidationError("Each player must provide a deck list.");
      }

      const battlefields = MatchFactory.extractBattlefields(deckList);

      if (battlefields.length === 0) {
        throw new ValidationError("Deck list must include a Battlefields section.");
      }

      normalizedDecksByPlayer[playerId] = deckList.trim();
      normalizedBattlefieldsByPlayer[playerId] =
        MatchFactory.validateBattlefields(battlefields);
    }

    const resolvedBattlefieldsByPlayer: Record<string, string> = {};
    const battlefieldsUsedByPlayer: Record<string, string[]> = {};

    if (format === "best-of-1") {
      for (const playerId of playerIds) {
        const pool = normalizedBattlefieldsByPlayer[playerId];
        if (!pool || pool.length === 0) {
          throw new ValidationError("Each player must provide exactly 3 battlefields.");
        }
        const randomIndex = Math.floor(Math.random() * pool.length);
        resolvedBattlefieldsByPlayer[playerId] = pool[randomIndex]!;
        battlefieldsUsedByPlayer[playerId] = [resolvedBattlefieldsByPlayer[playerId]!];
      }
    } else {
      if (!selectedBattlefieldsByPlayer) {
        throw new ValidationError(
          "Selected battlefields are required for best-of-3.",
        );
      }

      for (const playerId of playerIds) {
        const selection = selectedBattlefieldsByPlayer[playerId];
        const pool = normalizedBattlefieldsByPlayer[playerId];
        if (!pool || pool.length === 0) {
          throw new ValidationError("Each player must provide exactly 3 battlefields.");
        }

        if (!selection) {
          throw new ValidationError(
            "Each player must select a battlefield for best-of-3.",
          );
        }

        if (!pool.includes(selection)) {
          throw new ValidationError(
            "Selected battlefield must be one of the provided battlefields.",
          );
        }

        resolvedBattlefieldsByPlayer[playerId] = selection;
        battlefieldsUsedByPlayer[playerId] = [selection];
      }
    }

    const startingPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)]!;

    const now = new Date().toISOString();

    return {
      id: `match_${randomUUID()}`,
      format,
      status: "ready",
      players: [playerA, playerB],
      games: [],
      score: {
        [playerA.id]: 0,
        [playerB.id]: 0,
      },
      startingPlayerId,
      decksByPlayer: normalizedDecksByPlayer,
      battlefieldsByPlayer: normalizedBattlefieldsByPlayer,
      selectedBattlefieldsByPlayer: resolvedBattlefieldsByPlayer,
      battlefieldsUsedByPlayer,
      createdAt: now,
      updatedAt: now,
      currentGameId: null,
      winnerPlayerId: null,
    };
  }
}
