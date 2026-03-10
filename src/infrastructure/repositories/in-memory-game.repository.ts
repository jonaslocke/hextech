import type { Game } from "../../domain/game";
import type { GameRepository } from "../../domain/game.repository";

export class InMemoryGameRepository implements GameRepository {
  private readonly store = new Map<string, Game>();

  async save(game: Game): Promise<void> {
    this.store.set(game.id, game);
  }

  async findById(gameId: string): Promise<Game | null> {
    return this.store.get(gameId) ?? null;
  }

  async findByIds(gameIds: string[]): Promise<Game[]> {
    return gameIds
      .map((gameId) => this.store.get(gameId))
      .filter((game): game is Game => !!game);
  }
}
