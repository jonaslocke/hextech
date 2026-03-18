import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import type { MatchView } from "../match.view";
import { MatchViewLoader } from "./match-view.loader";

export class GetMatchService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async execute(matchId: string, viewerPlayerId: string | null = null): Promise<MatchView> {
    const match = await this.matchViewLoader.getMatch(matchId);
    return this.matchViewLoader.build(match, { viewerPlayerId });
  }
}
