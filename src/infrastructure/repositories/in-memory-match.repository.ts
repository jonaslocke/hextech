import type { Match } from "../../domain/match";
import type { MatchRepository } from "../../domain/match.repository";

export class InMemoryMatchRepository implements MatchRepository {
  private readonly store = new Map<string, Match>();

  async save(match: Match): Promise<void> {
    this.store.set(match.id, match);
  }

  async findById(matchId: string): Promise<Match | null> {
    return this.store.get(matchId) ?? null;
  }
}
