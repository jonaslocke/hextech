import type { GameRepository } from "../../domain/game.repository";
import type { MatchRepository } from "../../domain/match.repository";
import type { CreateMatchRequestDto } from "../dto/create-match.dto";
import { GameFactory } from "../../domain/game.factory";
import { MatchFactory } from "../../domain/match.factory";
import { ValidationError } from "../../shared/errors";
import { MatchViewLoader } from "./match-view.loader";
import type { MatchView } from "../match.view";

export class CreateMatchService {
  private readonly matchViewLoader: MatchViewLoader;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameRepository: GameRepository,
  ) {
    this.matchViewLoader = new MatchViewLoader(matchRepository, gameRepository);
  }

  async execute(input: CreateMatchRequestDto): Promise<MatchView> {
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
    const initialGame = GameFactory.create({
      matchId: match.id,
      number: 1,
      status: "setup_pending",
    });
    const initializedMatch = {
      ...match,
      gameIds: [initialGame.id],
      currentGameId: initialGame.id,
    };

    await this.gameRepository.save(initialGame);
    await this.matchRepository.save(initializedMatch);

    return this.matchViewLoader.build(initializedMatch);
  }
}
