import type { Match } from "./match";

export interface MatchRepository {
  save(match: Match): Promise<void>;
  findById(matchId: string): Promise<Match | null>;
}
