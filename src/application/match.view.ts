import type { Game } from "../domain/game";
import type { GameplayRuntime, PlayerZoneBuckets } from "../domain/gameplay";
import type { Match } from "../domain/match";
import {
  ZONE_POLICY_LIST,
  type ZonePolicyId,
  type ZoneVisibility,
} from "../domain/zone-policy";

type PublicMatch = Omit<Match, "decksByPlayer">;
type PublicGame = Omit<Game, "deckStateByPlayer">;

export interface MatchView extends PublicMatch {
  currentGame: PublicGame | null;
  completedGames: PublicGame[];
  currentGameNumber: number;
}

export interface MatchViewProjectionOptions {
  viewerPlayerId?: string;
}

const HIDDEN_CARD_TOKEN = "hidden_card";

const ZONE_VISIBILITY_BY_POLICY_ID = new Map(
  ZONE_POLICY_LIST.map((policy) => [policy.id, policy.visibility]),
);

const PLAYER_ZONE_VISIBILITY_BY_BUCKET: Record<keyof PlayerZoneBuckets, ZoneVisibility> = {
  mainDeck: getZoneVisibilityByPolicyId("main_deck"),
  hand: getZoneVisibilityByPolicyId("hand"),
  trash: getZoneVisibilityByPolicyId("trash"),
  banishment: getZoneVisibilityByPolicyId("banishment"),
  runeDeck: getZoneVisibilityByPolicyId("rune_deck"),
  championZone: getZoneVisibilityByPolicyId("champion_zone"),
  legendZone: getZoneVisibilityByPolicyId("legend_zone"),
  base: getZoneVisibilityByPolicyId("base"),
};

function getZoneVisibilityByPolicyId(policyId: ZonePolicyId): ZoneVisibility {
  const visibility = ZONE_VISIBILITY_BY_POLICY_ID.get(policyId);
  if (!visibility) {
    throw new Error(`Missing zone visibility policy for "${policyId}".`);
  }

  return visibility;
}

function toPublicGame(game: Game, viewerPlayerId: string | undefined): PublicGame {
  const { deckStateByPlayer: _deckStateByPlayer, ...publicGame } = game;

  if (viewerPlayerId === undefined) {
    return publicGame;
  }

  const projectedGameplay = projectGameplayForViewer(publicGame.gameplay, viewerPlayerId);

  return {
    ...publicGame,
    gameplay: projectedGameplay,
  };
}

function projectGameplayForViewer(
  gameplay: GameplayRuntime,
  viewerPlayerId: string,
): GameplayRuntime {
  const players: GameplayRuntime["zones"]["players"] = {};

  for (const [playerId, zones] of Object.entries(gameplay.zones.players)) {
    const isOwner = viewerPlayerId === playerId;
    players[playerId] = {
      mainDeck: projectCardsByVisibility(
        zones.mainDeck,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.mainDeck,
        isOwner,
      ),
      hand: projectCardsByVisibility(
        zones.hand,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.hand,
        isOwner,
      ),
      trash: projectCardsByVisibility(
        zones.trash,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.trash,
        isOwner,
      ),
      banishment: projectCardsByVisibility(
        zones.banishment,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.banishment,
        isOwner,
      ),
      runeDeck: projectCardsByVisibility(
        zones.runeDeck,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.runeDeck,
        isOwner,
      ),
      championZone: projectCardsByVisibility(
        zones.championZone,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.championZone,
        isOwner,
      ),
      legendZone: projectCardsByVisibility(
        zones.legendZone,
        PLAYER_ZONE_VISIBILITY_BY_BUCKET.legendZone,
        isOwner,
      ),
      base: {
        cards: projectCardsByVisibility(
          zones.base.cards,
          PLAYER_ZONE_VISIBILITY_BY_BUCKET.base,
          isOwner,
        ),
        runes: projectCardsByVisibility(
          zones.base.runes,
          PLAYER_ZONE_VISIBILITY_BY_BUCKET.base,
          isOwner,
        ),
      },
    };
  }

  const hiddenCardsByBattlefield = Object.fromEntries(
    Object.entries(gameplay.zones.shared.battlefield.hiddenCardsByBattlefield).map(
      ([battlefieldId, cardIds]) => {
        const controllerId = resolveBattlefieldControllerId(battlefieldId);
        const isController = controllerId !== null && controllerId === viewerPlayerId;

        return [battlefieldId, isController ? [...cardIds] : hideCardIds(cardIds)];
      },
    ),
  );

  return {
    ...gameplay,
    zones: {
      players,
      shared: {
        battlefield: {
          cards: [...gameplay.zones.shared.battlefield.cards],
          hiddenCardsByBattlefield,
        },
        chain: [...gameplay.zones.shared.chain],
      },
    },
    policyModifiers: gameplay.policyModifiers.map((entry) => ({
      ...entry,
      modifier: {
        ...entry.modifier,
      },
    })),
  };
}

function resolveBattlefieldControllerId(battlefieldId: string): string | null {
  const chunks = battlefieldId.split(":");
  if (chunks.length >= 4 && chunks[0] === "setup" && chunks[1] === "battlefield") {
    const playerId = chunks[2]?.trim() ?? "";
    return playerId.length > 0 ? playerId : null;
  }

  return null;
}

function projectCardsByVisibility(
  cardIds: string[],
  visibility: ZoneVisibility,
  isOwner: boolean,
): string[] {
  if (visibility === "public") {
    return [...cardIds];
  }

  if (visibility === "private_owner" && isOwner) {
    return [...cardIds];
  }

  return hideCardIds(cardIds);
}

function hideCardIds(cardIds: string[]): string[] {
  return cardIds.map(() => HIDDEN_CARD_TOKEN);
}

export function normalizeViewerPlayerId(input: unknown): string | undefined {
  if (Array.isArray(input)) {
    return normalizeViewerPlayerId(input[0]);
  }

  if (typeof input !== "string") {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toMatchView(
  match: Match,
  orderedGames: Game[],
  options: MatchViewProjectionOptions = {},
): MatchView {
  const orderedPublicGames = orderedGames.map((game) =>
    toPublicGame(game, options.viewerPlayerId),
  );
  const gamesById = new Map(orderedPublicGames.map((game) => [game.id, game]));
  const currentGame = match.currentGameId
    ? (gamesById.get(match.currentGameId) ?? null)
    : null;
  const completedGames = orderedPublicGames.filter((game) => game.status === "finished");
  const currentGameNumber = currentGame
    ? currentGame.number
    : completedGames.length > 0
      ? completedGames[completedGames.length - 1]!.number
      : 1;
  const { decksByPlayer: _decksByPlayer, ...publicMatch } = match;

  return {
    ...publicMatch,
    currentGame,
    completedGames,
    currentGameNumber,
  };
}

