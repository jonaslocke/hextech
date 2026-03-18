import { ValidationError } from "../shared/errors";
import type { Game } from "./game";
import type { Match } from "./match";
import {
  activateGameplayKernelForReadyState,
  createEmptyGameplayRuntime,
  type GameplayRuntime,
} from "./gameplay";
import { placeCardIntoZone } from "./gameplay.zone-transition";

export function hydrateGameplayForReadySetup(match: Match, game: Game): GameplayRuntime {
  const startingPlayerId = game.startingPlayerId?.trim();
  if (!startingPlayerId) {
    throw new ValidationError("Starting player is required for setup hydration.");
  }

  const playerIds = match.players.map((player) => player.id);
  let gameplay = createEmptyGameplayRuntime(playerIds);

  for (const playerId of playerIds) {
    const deckState = game.deckStateByPlayer[playerId];
    if (!deckState) {
      throw new ValidationError("Deck state is required for setup hydration.");
    }

    const chosenChampionName = game.chosenChampionByPlayer[playerId]?.trim();
    if (!chosenChampionName) {
      throw new ValidationError("Chosen champion is required for setup hydration.");
    }

    const chosenChampionCardId = deckState.chosenChampionCardId?.trim();
    if (!chosenChampionCardId) {
      throw new ValidationError("Chosen champion card id is required for setup hydration.");
    }

    const chosenChampionCard = deckState.mainLibrary.find(
      (card) => card.id === chosenChampionCardId,
    );
    if (!chosenChampionCard) {
      throw new ValidationError("Chosen champion card instance is required for setup hydration.");
    }

    if (chosenChampionCard.name.trim() !== chosenChampionName) {
      throw new ValidationError("Chosen champion card instance does not match selected champion.");
    }

    for (const card of deckState.mainLibrary) {
      if (card.id === chosenChampionCardId) {
        continue;
      }

      gameplay = placeCardIntoZone(gameplay, {
        cardId: card.id,
        cardControllerId: playerId,
        cardType: card.cardType,
        destination: { kind: "player_zone", playerId, zone: "mainDeck" },
      });
    }

    for (const card of deckState.runeLibrary) {
      gameplay = placeCardIntoZone(gameplay, {
        cardId: card.id,
        cardControllerId: playerId,
        cardType: card.cardType,
        destination: { kind: "player_zone", playerId, zone: "runeDeck" },
      });
    }

    gameplay = placeCardIntoZone(gameplay, {
      cardId: chosenChampionCardId,
      cardControllerId: playerId,
      cardType: chosenChampionCard.cardType,
      destination: { kind: "player_zone", playerId, zone: "championZone" },
    });

    gameplay = placeCardIntoZone(gameplay, {
      cardId: buildSetupObjectId("legend", playerId, deckState.registrationRef),
      cardControllerId: playerId,
      cardType: "legend",
      destination: { kind: "player_zone", playerId, zone: "legendZone" },
    });

    const selectedBattlefieldName = game.selectedBattlefieldsByPlayer[playerId]?.trim();
    if (!selectedBattlefieldName) {
      throw new ValidationError("Selected battlefield is required for setup hydration.");
    }

    const battlefieldId = buildSetupObjectId(
      "battlefield",
      playerId,
      selectedBattlefieldName,
    );

    gameplay = placeCardIntoZone(gameplay, {
      cardId: battlefieldId,
      cardControllerId: playerId,
      cardType: "battlefield",
      destination: { kind: "battlefield" },
    });

    if (!gameplay.zones.shared.facedownByBattlefield[battlefieldId]) {
      gameplay.zones.shared.facedownByBattlefield[battlefieldId] = [];
    }
  }

  return activateGameplayKernelForReadyState(gameplay, startingPlayerId);
}

function buildSetupObjectId(
  objectType: "legend" | "battlefield",
  playerId: string,
  sourceValue: string,
): string {
  return [
    "setup",
    objectType,
    slugify(playerId),
    slugify(sourceValue),
  ].join(":");
}

function slugify(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const trimmed = normalized.replace(/^_+|_+$/g, "");
  return trimmed || "value";
}
