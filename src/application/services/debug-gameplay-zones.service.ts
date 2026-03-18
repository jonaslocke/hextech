import { ValidationError } from "../../shared/errors";
import type {
  DebugZoneChangeRequestDto,
} from "../dto/debug-zones.dto";
import type { Game } from "../../domain/game";
import type { MatchView } from "../match.view";
import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import type { CardType } from "../../domain/zone-policy";
import { MatchViewLoader } from "./match-view.loader";
import { moveCardBetweenZones } from "../../domain/gameplay.zone-transition";

export class DebugGameplayZonesService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async applyZoneChange(input: DebugZoneChangeRequestDto): Promise<MatchView> {
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
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) {
      return cardTypeInput;
    }

    const resolvedFromRuntime = this.resolveRuntimeCardTypeForKnownCard(
      game,
      normalizedCardId,
    );
    if (resolvedFromRuntime) {
      if (cardTypeInput && cardTypeInput !== resolvedFromRuntime) {
        throw new ValidationError(
          `Card type mismatch for "${normalizedCardId}". Expected "${resolvedFromRuntime}" from server state.`,
        );
      }
      return resolvedFromRuntime;
    }

    return cardTypeInput;
  }

  private resolveRuntimeCardTypeForKnownCard(
    game: Game,
    normalizedCardId: string,
  ): CardType | undefined {
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
