import type {
  SelectBattlefieldIntentRequestDto,
  SelectChosenChampionIntentRequestDto,
  SelectStartingPlayerIntentRequestDto,
} from "../dto/setup-intents.dto";
import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import { MatchSetup } from "../../domain/match.setup";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class SubmitSetupIntentService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async selectChosenChampion(
    input: SelectChosenChampionIntentRequestDto,
  ): Promise<Match> {
    const match = await this.getMatch(input.matchId);
    const updated = MatchSetup.applySelectChosenChampionIntent(match, {
      playerId: input.playerId,
    });

    await this.matchRepository.save(updated);
    return updated;
  }

  async selectBattlefield(
    input: SelectBattlefieldIntentRequestDto,
  ): Promise<Match> {
    const match = await this.getMatch(input.matchId);
    const intent =
      input.battlefield === undefined
        ? { playerId: input.playerId }
        : { playerId: input.playerId, battlefield: input.battlefield };
    const updated = MatchSetup.applySelectBattlefieldIntent(match, {
      ...intent,
    });

    await this.matchRepository.save(updated);
    return updated;
  }

  async selectStartingPlayer(
    input: SelectStartingPlayerIntentRequestDto,
  ): Promise<Match> {
    const match = await this.getMatch(input.matchId);
    const updated = MatchSetup.applySelectStartingPlayerIntent(match, {
      playerId: input.playerId,
      startingPlayerId: input.startingPlayerId,
    });

    await this.matchRepository.save(updated);
    return updated;
  }

  private async getMatch(matchId: string): Promise<Match> {
    if (!matchId) {
      throw new ValidationError("Match id is required.");
    }

    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError("Match not found.");
    }

    return match;
  }
}
