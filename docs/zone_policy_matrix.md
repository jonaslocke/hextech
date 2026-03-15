# Zone Policy Matrix (PR1)

This document is the source-of-truth for zone policy assumptions approved for implementation.

Rules source policy: only `Riftbound Core Rules v1.2` is canonical.

## Matrix

| Zone | Allowed card types | Prohibited card types | Capacity | Visibility |
|---|---|---|---|---|
| `main_deck` | `unit`, `spell`, `gear` | `rune`, `battlefield`, `legend` | `0..N` | `secret` |
| `rune_deck` | `rune` | `unit`, `spell`, `gear`, `battlefield`, `legend` | `0..N` | `secret` |
| `hand` | `unit`, `spell`, `gear` | `rune`, `battlefield`, `legend` | `0..N` | `private(owner)` |
| `champion_zone` | `unit` (chosen champion only) | all other types | `0..1` | `public` |
| `legend_zone` | `legend` | all other types | exactly `1` | `public` |
| `base` | `unit`, `gear`, `rune` | `spell`, `battlefield`, `legend` | `0..N` | `public` |
| `battlefield` | `battlefield`, `unit` | `rune`, `legend` | per battlefield: battlefield card `=1`, hidden cards `0..1` default (override allowed), units `0..N` | `public` (hidden cards private to controller) |
| `chain` (no abilities yet) | `unit`, `spell`, `gear` while being played | `rune`, `battlefield`, `legend` | `0..N` | `public` |
| `trash` | `unit`, `spell`, `gear`, `rune` | `battlefield`, `legend` | `0..N` | `public` |
| `banishment` | `unit`, `spell`, `gear` | `rune`, `battlefield`, `legend` | `0..N` | `public` |

Global invariant:
- A card instance can exist in exactly one zone at a time.

## Generic Constraint Model (Future-Proof)

Capacity is represented as:
- `defaultBounds` (hard default value)
- `modifierChain[]` (typed, ordered modifier contract)

Each applied modifier is typed, traceable, and ordered:
- `source = rule_parameter` (example: `hiddenCapacityByBattlefield`)
- `source = card_effect`
- `sourceId = <card/effect/rule instance id>`
- `target = min | max`
- `operation = set | add`
- optional `priority` override (otherwise the chain's default priority applies)

This gives deterministic behavior: start at default, then apply allowed modifiers in priority order.

Example:
- "Only one unit per base" is represented by applying a card-effect modifier:
  - `source = card_effect`
  - `sourceId = card:command_post#effect_1`
  - `target = max`
  - `operation = set`
  - `value = 1`

No new TypeScript shape is needed for this kind of future rule.

## PR2 Dependency: `resolveCardType` without Card DB

There is no card database yet, so `resolveCardType` in PR2 should use a local runtime catalog + manifest approach.

Planned approach:
1. Build `cardCatalog` at setup hydration:
- `cardId -> { name, ownerId, source, type }`

2. Resolve type deterministically:
- `setup:battlefield:*` -> `battlefield`
- `setup:legend:*` -> `legend`
- `source === rune_deck` -> `rune`
- `source === main_deck` -> resolve by `name` in local manifest (for example `docs/card_types.v1.json`)

3. If main deck card is missing in manifest:
- classify as `unknown_main_deck`
- reject type-sensitive zone changes with explicit validation error

This preserves deterministic behavior now and allows swapping to a real card DB later without changing the `resolveCardType` interface.
