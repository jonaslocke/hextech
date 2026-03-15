export const CARD_TYPES = [
  "unit",
  "spell",
  "gear",
  "rune",
  "battlefield",
  "legend",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const CARD_STATE_TAGS = ["hidden"] as const;

export type CardStateTag = (typeof CARD_STATE_TAGS)[number];

export const ZONE_POLICY_IDS = [
  "main_deck",
  "rune_deck",
  "hand",
  "champion_zone",
  "legend_zone",
  "base",
  "battlefield",
  "chain",
  "trash",
  "banishment",
] as const;

export type ZonePolicyId = (typeof ZONE_POLICY_IDS)[number];

export type ZoneVisibility = "public" | "private_owner" | "secret";

export type CapacityScope = "zone" | "per_location";

export const RULE_PARAMETER_IDS = ["hiddenCapacityByBattlefield"] as const;

export type RuleParameterId = (typeof RULE_PARAMETER_IDS)[number];

export const CAPACITY_MODIFIER_TARGETS = ["min", "max"] as const;

export type CapacityModifierTarget = (typeof CAPACITY_MODIFIER_TARGETS)[number];

export const CAPACITY_MODIFIER_OPERATIONS = ["set", "add"] as const;

export type CapacityModifierOperation = (typeof CAPACITY_MODIFIER_OPERATIONS)[number];

export interface CapacityBounds {
  min: number;
  max: number | null;
}

interface RuleParameterModifierSpec {
  source: "rule_parameter";
  parameter: RuleParameterId;
  target: CapacityModifierTarget;
  operation: "set";
  priority: number;
}

interface CardEffectModifierSpec {
  source: "card_effect";
  target: CapacityModifierTarget;
  operation: CapacityModifierOperation;
  priority: number;
}

export type CapacityModifierSpec = RuleParameterModifierSpec | CardEffectModifierSpec;

export interface ZoneCapacityConstraint {
  id: string;
  scope: CapacityScope;
  defaultBounds: CapacityBounds;
  appliesToCardTypes?: readonly CardType[];
  appliesToStateTags?: readonly CardStateTag[];
  modifierChain: readonly CapacityModifierSpec[];
}

export interface ZonePolicy {
  id: ZonePolicyId;
  allowedCardTypes: readonly CardType[];
  prohibitedCardTypes: readonly CardType[];
  visibility: ZoneVisibility;
  capacityConstraints: readonly ZoneCapacityConstraint[];
}

export const ZONE_POLICY_LIST: readonly ZonePolicy[] = [
  {
    id: "main_deck",
    allowedCardTypes: ["unit", "spell", "gear"],
    prohibitedCardTypes: ["rune", "battlefield", "legend"],
    visibility: "secret",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "rune_deck",
    allowedCardTypes: ["rune"],
    prohibitedCardTypes: ["unit", "spell", "gear", "battlefield", "legend"],
    visibility: "secret",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "hand",
    allowedCardTypes: ["unit", "spell", "gear"],
    prohibitedCardTypes: ["rune", "battlefield", "legend"],
    visibility: "private_owner",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "champion_zone",
    allowedCardTypes: ["unit"],
    prohibitedCardTypes: ["spell", "gear", "rune", "battlefield", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: 1,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "legend_zone",
    allowedCardTypes: ["legend"],
    prohibitedCardTypes: ["unit", "spell", "gear", "rune", "battlefield"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 1,
          max: 1,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "base",
    allowedCardTypes: ["unit", "gear", "rune"],
    prohibitedCardTypes: ["spell", "battlefield", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
      {
        id: "unit_occupancy",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        appliesToCardTypes: ["unit"],
        modifierChain: [
          {
            source: "card_effect",
            target: "max",
            operation: "set",
            priority: 200,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "add",
            priority: 300,
          },
        ],
      },
      {
        id: "gear_occupancy",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        appliesToCardTypes: ["gear"],
        modifierChain: [
          {
            source: "card_effect",
            target: "max",
            operation: "set",
            priority: 200,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "add",
            priority: 300,
          },
        ],
      },
      {
        id: "rune_occupancy",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        appliesToCardTypes: ["rune"],
        modifierChain: [
          {
            source: "card_effect",
            target: "max",
            operation: "set",
            priority: 200,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "add",
            priority: 300,
          },
        ],
      },
    ],
  },
  {
    id: "battlefield",
    allowedCardTypes: ["battlefield", "unit"],
    prohibitedCardTypes: ["rune", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "battlefield_card_slot",
        scope: "per_location",
        defaultBounds: {
          min: 1,
          max: 1,
        },
        appliesToCardTypes: ["battlefield"],
        modifierChain: [],
      },
      {
        id: "hidden_slot",
        scope: "per_location",
        defaultBounds: {
          min: 0,
          max: 1,
        },
        appliesToStateTags: ["hidden"],
        modifierChain: [
          {
            source: "rule_parameter",
            parameter: "hiddenCapacityByBattlefield",
            target: "max",
            operation: "set",
            priority: 100,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "set",
            priority: 200,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "add",
            priority: 300,
          },
        ],
      },
      {
        id: "unit_occupancy",
        scope: "per_location",
        defaultBounds: {
          min: 0,
          max: null,
        },
        appliesToCardTypes: ["unit"],
        modifierChain: [
          {
            source: "card_effect",
            target: "max",
            operation: "set",
            priority: 200,
          },
          {
            source: "card_effect",
            target: "max",
            operation: "add",
            priority: 300,
          },
        ],
      },
    ],
  },
  {
    id: "chain",
    allowedCardTypes: ["unit", "spell", "gear"],
    prohibitedCardTypes: ["rune", "battlefield", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "trash",
    allowedCardTypes: ["unit", "spell", "gear", "rune"],
    prohibitedCardTypes: ["battlefield", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
  {
    id: "banishment",
    allowedCardTypes: ["unit", "spell", "gear"],
    prohibitedCardTypes: ["rune", "battlefield", "legend"],
    visibility: "public",
    capacityConstraints: [
      {
        id: "total_cards",
        scope: "zone",
        defaultBounds: {
          min: 0,
          max: null,
        },
        modifierChain: [],
      },
    ],
  },
];

export const GAMEPLAY_GLOBAL_ZONE_INVARIANTS = [
  "A card instance can exist in exactly one zone at a time.",
] as const;

interface BaseCapacityModifier {
  sourceId: string;
  target: CapacityModifierTarget;
  operation: CapacityModifierOperation;
  value: number;
  priority?: number;
}

interface RuleParameterCapacityModifier extends BaseCapacityModifier {
  source: "rule_parameter";
  parameter: RuleParameterId;
  operation: "set";
}

interface CardEffectCapacityModifier extends BaseCapacityModifier {
  source: "card_effect";
}

export type CapacityModifier = RuleParameterCapacityModifier | CardEffectCapacityModifier;

interface ResolvedModifier {
  modifier: CapacityModifier;
  priority: number;
}

export function resolveConstraintBounds(
  constraint: ZoneCapacityConstraint,
  modifiers: readonly CapacityModifier[],
): CapacityBounds {
  const next: CapacityBounds = {
    min: constraint.defaultBounds.min,
    max: constraint.defaultBounds.max,
  };

  const allowedModifiers = resolveAllowedModifiers(constraint, modifiers);
  for (const entry of allowedModifiers) {
    applyModifier(next, entry.modifier);
  }

  return next;
}

function resolveAllowedModifiers(
  constraint: ZoneCapacityConstraint,
  modifiers: readonly CapacityModifier[],
): ResolvedModifier[] {
  const resolved: ResolvedModifier[] = [];

  for (const modifier of modifiers) {
    const matchingSpec = constraint.modifierChain.find((spec) =>
      isModifierAllowedBySpec(modifier, spec),
    );
    if (!matchingSpec) {
      continue;
    }

    resolved.push({
      modifier,
      priority: modifier.priority ?? matchingSpec.priority,
    });
  }

  resolved.sort((left, right) => left.priority - right.priority);
  return resolved;
}

function isModifierAllowedBySpec(
  modifier: CapacityModifier,
  spec: CapacityModifierSpec,
): boolean {
  if (modifier.source !== spec.source) {
    return false;
  }

  if (modifier.target !== spec.target || modifier.operation !== spec.operation) {
    return false;
  }

  if (modifier.source === "rule_parameter" && spec.source === "rule_parameter") {
    return modifier.parameter === spec.parameter;
  }

  return true;
}

function applyModifier(bounds: CapacityBounds, modifier: CapacityModifier): void {
  if (modifier.target === "min") {
    bounds.min = applyBoundOperation(bounds.min, modifier.operation, modifier.value);
    return;
  }

  if (bounds.max === null) {
    if (modifier.operation === "set") {
      bounds.max = modifier.value;
    }
    return;
  }

  bounds.max = applyBoundOperation(bounds.max, modifier.operation, modifier.value);
}

function applyBoundOperation(
  current: number,
  operation: CapacityModifierOperation,
  value: number,
): number {
  if (operation === "set") {
    return value;
  }

  return current + value;
}
