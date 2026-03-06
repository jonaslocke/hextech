import { randomUUID } from "node:crypto";
import type { Match, MatchFormat, PlayerRef } from "./match";
import { ValidationError } from "../shared/errors";

interface CreateMatchParams {
  format: MatchFormat;
  players: PlayerRef[];
}

export class MatchFactory {
  static create(params: CreateMatchParams): Match {
    const { format, players } = params;

    if (!format) {
      throw new ValidationError("Match format is required.");
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

    const now = new Date().toISOString();

    return {
      id: `match_${randomUUID()}`,
      format,
      status: "waiting",
      players: [playerA, playerB],
      score: {
        [playerA.id]: 0,
        [playerB.id]: 0,
      },
      createdAt: now,
      updatedAt: now,
      currentGameId: null,
      winnerPlayerId: null,
    };
  }
}
