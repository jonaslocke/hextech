import { DeckValidator } from "./deck.validator";
import type { Match } from "./match";
import { ValidationError } from "../shared/errors";

interface SelectChosenChampionIntent {
  playerId: string;
}

interface SelectBattlefieldIntent {
  playerId: string;
  battlefield?: string;
}

interface SelectStartingPlayerIntent {
  playerId: string;
  startingPlayerId: string;
}

export class MatchSetup {
  static applySelectChosenChampionIntent(
    match: Match,
    intent: SelectChosenChampionIntent,
  ): Match {
    MatchSetup.assertSetupPending(match);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (match.chosenChampionByPlayer[playerId]) {
      throw new ValidationError(
        "Chosen champion setup intent can only be sent once per player.",
      );
    }

    const chosenChampion = MatchSetup.resolveDeckChampion(
      match.decksByPlayer[playerId] ?? "",
    );

    return MatchSetup.withSetupProgress(match, {
      chosenChampionByPlayer: {
        ...match.chosenChampionByPlayer,
        [playerId]: chosenChampion,
      },
    });
  }

  static applySelectBattlefieldIntent(
    match: Match,
    intent: SelectBattlefieldIntent,
  ): Match {
    MatchSetup.assertSetupPending(match);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (match.selectedBattlefieldsByPlayer[playerId]) {
      throw new ValidationError(
        "Battlefield setup intent can only be sent once per player.",
      );
    }

    const playerBattlefields = match.battlefieldsByPlayer[playerId] ?? [];

    if (playerBattlefields.length !== 3) {
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

    const usedBattlefields = match.battlefieldsUsedByPlayer[playerId] ?? [];

    if (
      usedBattlefields.some(
        (battlefield) =>
          battlefield.toLowerCase() === selectedBattlefield.toLowerCase(),
      )
    ) {
      throw new ValidationError(
        "Battlefield has already been selected in this match.",
      );
    }

    return MatchSetup.withSetupProgress(match, {
      selectedBattlefieldsByPlayer: {
        ...match.selectedBattlefieldsByPlayer,
        [playerId]: selectedBattlefield,
      },
      battlefieldsUsedByPlayer: {
        ...match.battlefieldsUsedByPlayer,
        [playerId]: [...usedBattlefields, selectedBattlefield],
      },
    });
  }

  static applySelectStartingPlayerIntent(
    match: Match,
    intent: SelectStartingPlayerIntent,
  ): Match {
    MatchSetup.assertSetupPending(match);

    const playerId = MatchSetup.assertMatchPlayer(match, intent.playerId);

    if (playerId !== match.startingPlayerChooserId) {
      throw new ValidationError(
        "Only the designated setup chooser can select the starting player.",
      );
    }

    if (match.startingPlayerId) {
      throw new ValidationError("Starting player setup intent can only be sent once.");
    }

    const startingPlayerId = MatchSetup.assertMatchPlayer(
      match,
      intent.startingPlayerId,
    );

    return MatchSetup.withSetupProgress(match, {
      startingPlayerId,
    });
  }

  private static withSetupProgress(match: Match, patch: Partial<Match>): Match {
    const updatedMatch: Match = {
      ...match,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    if (MatchSetup.isSetupComplete(updatedMatch)) {
      updatedMatch.status = "ready";
    }

    return updatedMatch;
  }

  private static isSetupComplete(match: Match): boolean {
    const playerIds = match.players.map((player) => player.id);

    const allPlayersSelectedChampion = playerIds.every(
      (playerId) => !!match.chosenChampionByPlayer[playerId],
    );
    const allPlayersSelectedBattlefield = playerIds.every(
      (playerId) => !!match.selectedBattlefieldsByPlayer[playerId],
    );

    return (
      allPlayersSelectedChampion &&
      allPlayersSelectedBattlefield &&
      !!match.startingPlayerId
    );
  }

  private static assertSetupPending(match: Match): void {
    if (match.status !== "setup_pending") {
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
}
