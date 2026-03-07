import { randomUUID } from "node:crypto";
import type { Match, MatchFormat, PlayerRef } from "./match";
import { DeckValidator } from "./deck.validator";
import { ValidationError } from "../shared/errors";

interface CreateMatchParams {
  format: MatchFormat;
  players: PlayerRef[];
  decksByPlayer: Record<string, string>;
  selectedBattlefieldsByPlayer?: Record<string, string>;
}

export class MatchFactory {
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
      const validatedDeck = DeckValidator.validate(deckList);

      normalizedDecksByPlayer[playerId] = validatedDeck.raw;
      normalizedBattlefieldsByPlayer[playerId] = validatedDeck.battlefields;
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
