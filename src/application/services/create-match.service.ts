import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import type { CreateMatchRequestDto } from "../dto/create-match.dto";
import { MatchFactory } from "../../domain/match.factory";
import { ValidationError } from "../../shared/errors";

export class CreateMatchService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: CreateMatchRequestDto): Promise<Match> {
    if (
      input &&
      typeof input === "object" &&
      Object.prototype.hasOwnProperty.call(
        input as unknown as Record<string, unknown>,
        "selectedBattlefieldsByPlayer",
      )
    ) {
      throw new ValidationError(
        "selectedBattlefieldsByPlayer is not accepted during match creation.",
      );
    }

    const match = MatchFactory.create({
      format: input.format,
      players: input.players,
      decksByPlayer: input.decksByPlayer,
    });

    await this.matchRepository.save(match);

    return match;
  }
}
