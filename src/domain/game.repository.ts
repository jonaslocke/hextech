import type { Game } from "./game";

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(gameId: string): Promise<Game | null>;
  findByIds(gameIds: string[]): Promise<Game[]>;
}
