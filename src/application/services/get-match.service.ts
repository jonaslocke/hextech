import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class GetMatchService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string): Promise<Match> {
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
