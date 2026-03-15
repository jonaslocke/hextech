import { ValidationError } from "../../shared/errors";
import type {
  DebugCleanupHiddenRequestDto,
  DebugMoveCardRequestDto,
  DebugPlaceCardRequestDto,
  DebugRevealGameEndRequestDto,
  DebugUpdateZoneRulesRequestDto,
} from "../dto/debug-zones.dto";
import type { Game } from "../../domain/game";
import type { MatchView } from "../match.view";
import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import type { CardType } from "../../domain/zone-policy";
import { MatchViewLoader } from "./match-view.loader";
import { placeCardIntoZone, moveCardBetweenZones } from "../../domain/gameplay.zone-transition";
import { cleanupHiddenCardsAfterControlChange } from "../../domain/gameplay.cleanup";
import { revealFacedownCardsOnGameEnd } from "../../domain/gameplay.reveal";
import { collectGameplayZoneInvariantViolations } from "../../domain/gameplay";

export class DebugGameplayZonesService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async placeCard(input: DebugPlaceCardRequestDto): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.getReadyCurrentGame(match.id);
    const resolvedCardType = this.resolveCardTypeForGameplayCard(
      game,
      input.cardId,
      input.cardType,
    );

    const placeInput = {
      cardId: input.cardId,
      cardControllerId: input.cardControllerId,
      ...(resolvedCardType ? { cardType: resolvedCardType } : {}),
      destination: input.destination,
      ...(input.battlefieldControllerById
        ? { battlefieldControllerById: input.battlefieldControllerById }
        : {}),
    };

    const nextGameplay = placeCardIntoZone(game.gameplay, placeInput);

    await this.saveUpdatedGame(game, nextGameplay);
    return this.matchViewLoader.build(match);
  }

  async moveCard(input: DebugMoveCardRequestDto): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.getReadyCurrentGame(match.id);
    const resolvedCardType = this.resolveCardTypeForGameplayCard(
      game,
      input.cardId,
      input.cardType,
    );

    const moveInput = {
      cardId: input.cardId,
      cardControllerId: input.cardControllerId,
      ...(resolvedCardType ? { cardType: resolvedCardType } : {}),
      source: input.source,
      destination: input.destination,
      ...(input.cardOwnerId ? { cardOwnerId: input.cardOwnerId } : {}),
      ...(input.battlefieldControllerById
        ? { battlefieldControllerById: input.battlefieldControllerById }
        : {}),
    };

    const nextGameplay = moveCardBetweenZones(game.gameplay, moveInput);

    await this.saveUpdatedGame(game, nextGameplay);
    return this.matchViewLoader.build(match);
  }

  async cleanupHiddenCards(input: DebugCleanupHiddenRequestDto): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.getReadyCurrentGame(match.id);

    const cleanupInput = {
      battlefieldControllerById: input.battlefieldControllerById,
      cardControllerById: input.cardControllerById,
      ...(input.cardOwnerById ? { cardOwnerById: input.cardOwnerById } : {}),
    };

    const result = cleanupHiddenCardsAfterControlChange(game.gameplay, cleanupInput);

    await this.saveUpdatedGame(game, result.gameplay);
    return this.matchViewLoader.build(match);
  }

  async revealFacedownCardsOnGameEnd(
    input: DebugRevealGameEndRequestDto,
  ): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.getReadyCurrentGame(match.id);

    const result = revealFacedownCardsOnGameEnd(game.gameplay, {
      cardOwnerById: input.cardOwnerById,
    });

    await this.saveUpdatedGame(game, result.gameplay);
    return this.matchViewLoader.build(match);
  }

  async updateZoneRules(input: DebugUpdateZoneRulesRequestDto): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.getReadyCurrentGame(match.id);

    const nextGameplay = {
      ...game.gameplay,
      ruleParameters: {
        defaultHiddenCapacityPerBattlefield:
          input.defaultHiddenCapacityPerBattlefield ??
          game.gameplay.ruleParameters.defaultHiddenCapacityPerBattlefield,
        hiddenCapacityByBattlefield:
          input.hiddenCapacityByBattlefield ??
          game.gameplay.ruleParameters.hiddenCapacityByBattlefield,
      },
    };

    const violations = collectGameplayZoneInvariantViolations(nextGameplay);
    if (violations.length > 0) {
      throw new ValidationError(violations[0]?.message ?? "Gameplay zone state invalid.");
    }

    await this.saveUpdatedGame(game, nextGameplay);
    return this.matchViewLoader.build(match);
  }

  private async getReadyCurrentGame(matchId: string): Promise<Game> {
    const match = await this.matchViewLoader.getMatch(matchId);
    const game = await this.matchViewLoader.getCurrentGameOrThrow(match);

    if (game.status !== "ready") {
      throw new ValidationError("Current game must be in ready status for zone debug actions.");
    }

    return game;
  }

  private async saveUpdatedGame(game: Game, gameplay: Game["gameplay"]): Promise<void> {
    const updated: Game = {
      ...game,
      gameplay,
      updatedAt: new Date().toISOString(),
      version: game.version + 1,
    };

    await this.gameRepository.save(updated);
  }

  private resolveCardTypeForGameplayCard(
    game: Game,
    cardId: string,
    cardTypeInput: CardType | undefined,
  ): CardType | undefined {
    if (cardTypeInput) {
      return cardTypeInput;
    }

    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) {
      return undefined;
    }

    if (normalizedCardId.startsWith("setup:legend:")) {
      return "legend";
    }

    if (normalizedCardId.startsWith("setup:battlefield:")) {
      return "battlefield";
    }

    for (const deckState of Object.values(game.deckStateByPlayer)) {
      const allKnownCards = [
        ...deckState.mainLibrary,
        ...deckState.runeLibrary,
        ...deckState.hand,
        ...deckState.trash,
      ];

      for (const card of allKnownCards) {
        if (card.id === normalizedCardId) {
          return card.cardType;
        }
      }
    }

    return undefined;
  }
}
