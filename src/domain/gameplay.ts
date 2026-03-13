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
  battlefield: string[];
  chain: string[];
  facedownByBattlefield: Record<string, string[]>;
}

export interface GameplayRuleParameters {
  defaultHiddenCapacityPerBattlefield: number;
  hiddenCapacityByBattlefield: Record<string, number>;
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
  ruleParameters: GameplayRuleParameters;
  events: GameplayEvent[];
}

interface AppendGameplayEventInput {
  type: string;
  details?: Record<string, string>;
}

export interface GameplayZoneInvariantViolation {
  code:
    | "facedown_zone_capacity_exceeded"
    | "facedown_zone_invalid_slot"
    | "facedown_zone_invalid_battlefield_id"
    | "facedown_zone_invalid_hidden_capacity";
  battlefieldId: string;
  message: string;
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
        battlefield: [],
        chain: [],
        facedownByBattlefield: {},
      },
    },
    ruleParameters: {
      defaultHiddenCapacityPerBattlefield: 1,
      hiddenCapacityByBattlefield: {},
    },
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

export function resolveHiddenCapacityForBattlefield(
  gameplay: GameplayRuntime,
  battlefieldId: string,
): number {
  const trimmedBattlefieldId = battlefieldId.trim();
  const defaultCapacity = gameplay.ruleParameters.defaultHiddenCapacityPerBattlefield;
  const overriddenCapacity =
    gameplay.ruleParameters.hiddenCapacityByBattlefield[trimmedBattlefieldId];

  if (
    typeof overriddenCapacity === "number" &&
    Number.isInteger(overriddenCapacity) &&
    overriddenCapacity >= 1
  ) {
    return overriddenCapacity;
  }

  return defaultCapacity;
}

export function collectGameplayZoneInvariantViolations(
  gameplay: GameplayRuntime,
): GameplayZoneInvariantViolation[] {
  const violations: GameplayZoneInvariantViolation[] = [];
  const defaultCapacity = gameplay.ruleParameters.defaultHiddenCapacityPerBattlefield;
  const battlefieldIds = new Set(
    gameplay.zones.shared.battlefield
      .map((battlefieldId) => battlefieldId.trim())
      .filter((battlefieldId) => battlefieldId.length > 0),
  );

  if (!Number.isInteger(defaultCapacity) || defaultCapacity < 1) {
    violations.push({
      code: "facedown_zone_invalid_hidden_capacity",
      battlefieldId: "",
      message: "Default hidden capacity per battlefield must be a positive integer.",
    });
  }

  for (const [battlefieldId, capacity] of Object.entries(
    gameplay.ruleParameters.hiddenCapacityByBattlefield,
  )) {
    const trimmedBattlefieldId = battlefieldId.trim();
    if (!trimmedBattlefieldId || !battlefieldIds.has(trimmedBattlefieldId)) {
      violations.push({
        code: "facedown_zone_invalid_battlefield_id",
        battlefieldId,
        message: "Hidden capacity override must reference an existing battlefield id.",
      });
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      violations.push({
        code: "facedown_zone_invalid_hidden_capacity",
        battlefieldId,
        message: "Hidden capacity override must be a positive integer.",
      });
    }
  }

  const facedownByBattlefield = gameplay.zones.shared.facedownByBattlefield as unknown;

  if (
    !facedownByBattlefield ||
    typeof facedownByBattlefield !== "object" ||
    Array.isArray(facedownByBattlefield)
  ) {
    return violations;
  }

  for (const [battlefieldId, slotValue] of Object.entries(
    facedownByBattlefield as Record<string, unknown>,
  )) {
    const trimmedBattlefieldId = battlefieldId.trim();

    if (!trimmedBattlefieldId) {
      violations.push({
        code: "facedown_zone_invalid_battlefield_id",
        battlefieldId,
        message: "Facedown zone key must be a non-empty battlefield id.",
      });
      continue;
    }

    if (!battlefieldIds.has(trimmedBattlefieldId)) {
      violations.push({
        code: "facedown_zone_invalid_battlefield_id",
        battlefieldId,
        message: "Facedown zone key must reference an existing battlefield id.",
      });
      continue;
    }

    if (Array.isArray(slotValue)) {
      if (slotValue.some((cardId) => typeof cardId !== "string" || !cardId.trim())) {
        violations.push({
          code: "facedown_zone_invalid_slot",
          battlefieldId,
          message:
            "Facedown zone must only contain non-empty card id strings when occupied.",
        });
        continue;
      }

      const maxAllowed = resolveHiddenCapacityForBattlefield(gameplay, battlefieldId);

      if (slotValue.length > maxAllowed) {
        violations.push({
          code: "facedown_zone_capacity_exceeded",
          battlefieldId,
          message: `Facedown zone capacity exceeded for battlefield (max: ${maxAllowed}).`,
        });
      }
      continue;
    }

    if (slotValue === null) {
      violations.push({
        code: "facedown_zone_invalid_slot",
        battlefieldId,
        message: "Facedown zone must be represented as an array of card ids.",
      });
      continue;
    }

    violations.push({
      code: "facedown_zone_invalid_slot",
      battlefieldId,
      message: "Facedown slot must be null or a single card id.",
    });
  }

  return violations;
}
