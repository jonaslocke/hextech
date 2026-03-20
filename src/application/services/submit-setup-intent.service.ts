import type {
  SelectBattlefieldIntentRequestDto,
  SelectChosenChampionIntentRequestDto,
  SelectStartingPlayerIntentRequestDto,
} from "../dto/setup-intents.dto";
import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import { MatchSetup } from "../../domain/match.setup";
import type { MatchView } from "../match.view";
import { MatchViewLoader } from "./match-view.loader";

export class SubmitSetupIntentService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async selectChosenChampion(
    input: SelectChosenChampionIntentRequestDto,
  ): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.matchViewLoader.getCurrentGameOrThrow(match);
    const updated = MatchSetup.applySelectChosenChampionIntent(match, game, {
      playerId: input.playerId,
      deckList: input.deckList,
    });

    await this.gameRepository.save(updated.game);
    await this.matchRepository.save(updated.match);
    return this.matchViewLoader.build(updated.match, { viewerPlayerId: input.playerId });
  }

  async selectBattlefield(
    input: SelectBattlefieldIntentRequestDto,
  ): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.matchViewLoader.getCurrentGameOrThrow(match);
    const intent =
      input.battlefield === undefined
        ? { playerId: input.playerId }
        : { playerId: input.playerId, battlefield: input.battlefield };
    const updated = MatchSetup.applySelectBattlefieldIntent(match, game, {
      ...intent,
    });

    await this.gameRepository.save(updated.game);
    await this.matchRepository.save(updated.match);
    return this.matchViewLoader.build(updated.match, { viewerPlayerId: input.playerId });
  }

  async selectStartingPlayer(
    input: SelectStartingPlayerIntentRequestDto,
  ): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(input.matchId);
    const game = await this.matchViewLoader.getCurrentGameOrThrow(match);
    const updated = MatchSetup.applySelectStartingPlayerIntent(match, game, {
      playerId: input.playerId,
      startingPlayerId: input.startingPlayerId,
    });

    await this.gameRepository.save(updated.game);
    await this.matchRepository.save(updated.match);
    return this.matchViewLoader.build(updated.match, { viewerPlayerId: input.playerId });
  }
}
