import { DeckValidator } from "./deck.validator";
import type { Game } from "./game";
import { hydrateGameplayForReadySetup } from "./gameplay.setup-hydration";
import type { Match } from "./match";
import { ValidationError } from "../shared/errors";

interface SelectChosenChampionIntent {
  playerId: string;
  deckList?: string;
}

interface SelectBattlefieldIntent {
  playerId: string;
  battlefield?: string;
}

interface SelectStartingPlayerIntent {
  playerId: string;
  startingPlayerId: string;
}

interface SetupTransitionResult {
  match: Match;
  game: Game;
}

export class MatchSetup {
  static applySelectChosenChampionIntent(
    match: Match,
    game: Game,
    intent: SelectChosenChampionIntent,
  ): SetupTransitionResult {
    MatchSetup.assertSetupPending(match, game);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (game.chosenChampionByPlayer[playerId]) {
      throw new ValidationError(
        "Chosen champion setup intent can only be sent once per player.",
      );
    }

    const registeredDeckList = match.decksByPlayer[playerId] ?? "";
    const deckList = MatchSetup.normalizeOptionalDeckList(intent.deckList);

    let chosenChampion: string;
    let nextDeckStateByPlayer: Game["deckStateByPlayer"] | undefined;

    if (deckList !== undefined) {
      if (match.format !== "best-of-3") {
        throw new ValidationError(
          "Setup deck reconfiguration is only allowed for best-of-3 matches.",
        );
      }
      if (game.number <= 1) {
        throw new ValidationError(
          "Setup deck reconfiguration is only allowed from game 2 onward in best-of-3 matches.",
        );
      }

      const reconfiguredDeck = DeckValidator.validateSetupDeckReconfiguration(
        registeredDeckList,
        deckList,
      );
      chosenChampion = reconfiguredDeck.chosenChampion;
      nextDeckStateByPlayer = {
        ...game.deckStateByPlayer,
        [playerId]: DeckValidator.buildRuntimeDeckSnapshot(reconfiguredDeck.raw, playerId),
      };
    } else {
      chosenChampion = MatchSetup.resolveDeckChampion(registeredDeckList);
    }

    return MatchSetup.withSetupProgress(match, game, {
      chosenChampionByPlayer: {
        ...game.chosenChampionByPlayer,
        [playerId]: chosenChampion,
      },
      ...(nextDeckStateByPlayer ? { deckStateByPlayer: nextDeckStateByPlayer } : {}),
    });
  }

  static applySelectBattlefieldIntent(
    match: Match,
    game: Game,
    intent: SelectBattlefieldIntent,
  ): SetupTransitionResult {
    MatchSetup.assertSetupPending(match, game);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (game.selectedBattlefieldsByPlayer[playerId]) {
      throw new ValidationError(
        "Battlefield setup intent can only be sent once per player.",
      );
    }

    const playerPool = match.battlefieldPoolByPlayer[playerId] ?? [];
    const playerBattlefields = playerPool.map((entry) => entry.name);

    if (playerPool.length !== 3) {
      throw new ValidationError("Each player must provide exactly 3 battlefields.");
    }

    let selectedBattlefield: string;

    if (match.format === "best-of-1") {
      const randomIndex = Math.floor(Math.random() * playerBattlefields.length);
      selectedBattlefield = playerBattlefields[randomIndex]!;
    } else {
      const requestedBattlefield = intent.battlefield?.trim() ?? "";

      if (!requestedBattlefield) {
        throw new ValidationError(
          "Battlefield is required for best-of-3 setup intent.",
        );
      }

      if (!playerBattlefields.includes(requestedBattlefield)) {
        throw new ValidationError(
          "Selected battlefield must be one of the provided battlefields.",
        );
      }

      selectedBattlefield = requestedBattlefield;
    }

    const selectedPoolEntry = playerPool.find(
      (entry) => entry.name.toLowerCase() === selectedBattlefield.toLowerCase(),
    );

    if (selectedPoolEntry?.used) {
      throw new ValidationError(
        "Battlefield has already been selected in this match.",
      );
    }

    const updatedBattlefieldPoolByPlayer = {
      ...match.battlefieldPoolByPlayer,
      [playerId]: playerPool.map((entry) =>
        entry.name.toLowerCase() !== selectedBattlefield.toLowerCase()
          ? entry
          : {
              ...entry,
              used: true,
            },
      ),
    };

    return MatchSetup.withSetupProgress(match, game, {
      selectedBattlefieldsByPlayer: {
        ...game.selectedBattlefieldsByPlayer,
        [playerId]: selectedBattlefield,
      },
      battlefieldPoolByPlayer: updatedBattlefieldPoolByPlayer,
    });
  }

  static applySelectStartingPlayerIntent(
    match: Match,
    game: Game,
    intent: SelectStartingPlayerIntent,
  ): SetupTransitionResult {
    MatchSetup.assertSetupPending(match, game);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (playerId !== match.startingPlayerChooserId) {
      throw new ValidationError(
        "Only the designated setup chooser can select the starting player.",
      );
    }

    if (game.startingPlayerId) {
      throw new ValidationError("Starting player setup intent can only be sent once.");
    }

    const startingPlayerId = MatchSetup.assertMatchPlayer(
      match,
      intent.startingPlayerId,
    );

    return MatchSetup.withSetupProgress(match, game, {
      startingPlayerId,
    });
  }

  private static withSetupProgress(
    match: Match,
    game: Game,
    patch: {
      chosenChampionByPlayer?: Record<string, string>;
      selectedBattlefieldsByPlayer?: Record<string, string>;
      startingPlayerId?: string;
      deckStateByPlayer?: Game["deckStateByPlayer"];
      battlefieldPoolByPlayer?: Match["battlefieldPoolByPlayer"];
    },
  ): SetupTransitionResult {
    const updatedGame: Game = {
      ...game,
      ...(patch.chosenChampionByPlayer
        ? { chosenChampionByPlayer: patch.chosenChampionByPlayer }
        : {}),
      ...(patch.selectedBattlefieldsByPlayer
        ? { selectedBattlefieldsByPlayer: patch.selectedBattlefieldsByPlayer }
        : {}),
      ...(patch.startingPlayerId ? { startingPlayerId: patch.startingPlayerId } : {}),
      ...(patch.deckStateByPlayer ? { deckStateByPlayer: patch.deckStateByPlayer } : {}),
      updatedAt: new Date().toISOString(),
      version: game.version + 1,
    };

    const updatedMatch: Match = {
      ...match,
      ...(patch.battlefieldPoolByPlayer
        ? { battlefieldPoolByPlayer: patch.battlefieldPoolByPlayer }
        : {}),
      updatedAt: new Date().toISOString(),
      version: match.version + 1,
    };

    if (MatchSetup.isSetupComplete(updatedGame, updatedMatch.players.map((p) => p.id))) {
      updatedGame.status = "ready";
      updatedGame.gameplay = hydrateGameplayForReadySetup(updatedMatch, updatedGame);
      updatedMatch.status = "ready";
    }

    return {
      match: updatedMatch,
      game: updatedGame,
    };
  }

  private static isSetupComplete(game: Game, playerIds: string[]): boolean {
    const allPlayersSelectedChampion = playerIds.every(
      (playerId) => !!game.chosenChampionByPlayer[playerId],
    );
    const allPlayersSelectedBattlefield = playerIds.every(
      (playerId) => !!game.selectedBattlefieldsByPlayer[playerId],
    );

    return (
      allPlayersSelectedChampion &&
      allPlayersSelectedBattlefield &&
      !!game.startingPlayerId
    );
  }

  private static assertSetupPending(match: Match, game: Game): void {
    if (match.status !== "setup_pending" || game.status !== "setup_pending") {
      throw new ValidationError("Match setup is not pending.");
    }
  }

  private static assertMatchPlayer(match: Match, playerId: string): string {
    const normalizedPlayerId = playerId?.trim();

    if (!normalizedPlayerId) {
      throw new ValidationError("Player id is required.");
    }

    const isPlayerInMatch = match.players.some(
      (player) => player.id === normalizedPlayerId,
    );

    if (!isPlayerInMatch) {
      throw new ValidationError("Player must be one of the match players.");
    }

    return normalizedPlayerId;
  }

  private static resolveDeckChampion(deckList: string): string {
    const validatedDeck = DeckValidator.validate(deckList);
    return validatedDeck.chosenChampion;
  }

  private static normalizeOptionalDeckList(deckList: unknown): string | undefined {
    if (deckList === undefined) {
      return undefined;
    }

    if (typeof deckList !== "string") {
      throw new ValidationError("Deck list must be a string.");
    }

    const normalized = deckList.trim();
    if (!normalized) {
      throw new ValidationError("Deck list must be provided.");
    }

    return normalized;
  }
}
