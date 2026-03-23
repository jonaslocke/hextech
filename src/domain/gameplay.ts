import type { CapacityModifier, ZonePolicyId } from "./zone-policy";

export const CANONICAL_CARD_ZONES = [
  "main_deck",
  "hand",
  "trash",
  "banishment",
  "rune_deck",
  "legend_zone",
  "champion_zone",
  "base",
  "battlefield",
  "chain",
  "facedown",
] as const;

export type CanonicalCardZone = (typeof CANONICAL_CARD_ZONES)[number];

export type ZonePrivacy = "public" | "private" | "secret";

export const ZONE_PRIVACY_BY_ZONE: Record<CanonicalCardZone, ZonePrivacy> = {
  main_deck: "secret",
  hand: "private",
  trash: "public",
  banishment: "public",
  rune_deck: "secret",
  legend_zone: "public",
  champion_zone: "public",
  base: "public",
  battlefield: "public",
  chain: "public",
  facedown: "private",
};

export interface BaseZoneBuckets {
  cards: string[];
  runes: string[];
}

export interface PlayerZoneBuckets {
  mainDeck: string[];
  hand: string[];
  trash: string[];
  banishment: string[];
  runeDeck: string[];
  championZone: string[];
  legendZone: string[];
  base: BaseZoneBuckets;
}

export interface SharedZoneBuckets {
  battlefield: {
    cards: string[];
    hiddenCardsByBattlefield: Record<string, string[]>;
  };
  chain: string[];
}

export interface GameplayPolicyModifier {
  kind: "capacity";
  zonePolicyId: ZonePolicyId;
  constraintId: string;
  locationKey?: string;
  modifier: CapacityModifier;
}

export interface GameplayZoneState {
  players: Record<string, PlayerZoneBuckets>;
  shared: SharedZoneBuckets;
}

export interface GameplayEvent {
  id: string;
  type: string;
  createdAt: string;
  details?: Record<string, string>;
}

export interface GameplayRuntime {
  schemaVersion: 1;
  zones: GameplayZoneState;
  policyModifiers: GameplayPolicyModifier[];
  events: GameplayEvent[];
}

interface AppendGameplayEventInput {
  type: string;
  details?: Record<string, string>;
}

function createEmptyPlayerZones(): PlayerZoneBuckets {
  return {
    mainDeck: [],
    hand: [],
    trash: [],
    banishment: [],
    runeDeck: [],
    championZone: [],
    legendZone: [],
    base: {
      cards: [],
      runes: [],
    },
  };
}

export function createEmptyGameplayRuntime(playerIds: string[]): GameplayRuntime {
  const normalizedPlayerIds = [...new Set(playerIds.map((id) => id.trim()))].filter(
    (id) => id.length > 0,
  );
  const players: GameplayZoneState["players"] = {};

  for (const playerId of normalizedPlayerIds) {
    players[playerId] = createEmptyPlayerZones();
  }

  return {
    schemaVersion: 1,
    zones: {
      players,
      shared: {
        battlefield: {
          cards: [],
          hiddenCardsByBattlefield: {},
        },
        chain: [],
      },
    },
    policyModifiers: [],
    events: [],
  };
}

export function appendGameplayEvent(
  gameplay: GameplayRuntime,
  input: AppendGameplayEventInput,
): GameplayRuntime {
  const sequence = gameplay.events.length + 1;
  const event: GameplayEvent = {
    id: `evt_${String(sequence).padStart(6, "0")}`,
    type: input.type,
    createdAt: `event_seq_${sequence}`,
    ...(input.details ? { details: input.details } : {}),
  };

  return {
    ...gameplay,
    events: [...gameplay.events, event],
  };
}
