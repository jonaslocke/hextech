import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";
import type { CreateMatchRequestDto } from "../dto/create-match.dto";
import { MatchFactory } from "../../domain/match.factory";

export class CreateMatchService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: CreateMatchRequestDto): Promise<Match> {
    const match = MatchFactory.create({
      format: input.format,
      players: input.players,
    });

    await this.matchRepository.save(match);

    return match;
  }
}
