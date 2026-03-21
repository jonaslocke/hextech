# In-Game Logic (No Card Abilities) - Capability Tracker

Rules source policy: **Only `Riftbound Core Rules v1.2` is canonical**.

Scope policy: implement the core engine without card ability logic for now, while keeping architecture compatible with future Golden Rule overrides.

## Capability List

| Status | Capability | Description |
|---|---|---|
| `Completed` | Canonical zone vocabulary | Established canonical zone model for gameplay runtime (`main_deck`, `hand`, `trash`, `banishment`, `rune_deck`, `legend_zone`, `champion_zone`, `base`, `battlefield`, `chain`, `facedown`). |
| `Completed` | Zone privacy mapping | Added explicit zone privacy metadata (`public`/`private`/`secret`) aligned to v1.2 terminology. |
| `Completed` | Gameplay runtime skeleton | Added `gameplay` runtime structure to `Game` with player/shared zone buckets and event list. |
| `Completed` | Base buckets split | Modeled base as separate buckets (`base.cards`, `base.runes`) for practical handling without breaking rules semantics. |
| `Completed` | Hidden capacity parameterization | Implemented default hidden capacity (`1`) and per-battlefield capacity overrides for Golden Rule compatibility. |
| `Completed` | Zone invariant validation | Added invariant checks for facedown zone shape, capacity, and hidden-capacity parameter validity. |
| `Completed` | Zone placement primitive | Added `placeCardIntoZone(...)` with legality checks and duplicate-card prevention. |
| `Completed` | Zone movement primitive | Added `moveCardBetweenZones(...)` with legality checks (source presence, base ownership, facedown controller/capacity rules). |
| `Completed` | Setup hydration into zones | On setup completion (`ready`), hydrate decks/champion/legend/battlefields/facedown slots into gameplay zones. |
| `Deferred` | Hidden cleanup enforcement | Removed from active zone-cutover runtime to keep one slim mutation surface; can be reintroduced behind intent kernel later. |
| `Completed` | Facedown reveal on non-public move | Added reveal event emission when facedown cards move to private/secret zones. |
| `Deferred` | Facedown reveal on game end | Removed from active zone-cutover runtime; game-end reveal can return in later intent/kernel phases. |
| `Completed` | Gameplay event appending | Added event append helper and event detail payload support for zone/reveal workflows. |
| `Completed` | Automated zone-change contract tests | Added contract tests for core zone transition behavior. |
| `Completed` | Zone policy matrix contract (PR1) | Added canonical zone policy model in `src/domain/zone-policy.ts` with typed capacities, typed modifier chains, and source-traceable runtime modifiers. |
| `Completed` | Zone policy contract tests and spec doc (PR1) | Added dedicated contract tests and source-of-truth matrix in `tests/zone-policy.contract.test.ts` and `docs/zone_policy_matrix.md`. |
| `Completed` | PR5.1 zone-cutover: unified zone transition primitives | Removed duplicated post-setup mutation surfaces and standardized zone transitions on domain primitives. |
| `Completed` | PR5.1 zone-cutover: event semantics unification | Zone transitions now append canonical `zone_changed` events, with reveal events as derived additions when needed. |
| `Completed` | PR5.1 zone-cutover: strict card-type authority | Known gameplay card ids now resolve type from server runtime/catalog and reject conflicting payload overrides. |
| `Pending` | Deterministic RNG policy | Add seeded RNG (derived from game identity) and route all gameplay randomness through intent execution paths. |
| `Pending` | Turn kernel | Implement turn ownership, turn number, and phase progression states, enforced through intent gates rather than direct zone debug mutations. |
| `Pending` | Timing states | Implement neutral/showdown + open/closed timing state model and transition checks in intent validation/resolution. |
| `Pending` | Priority/focus engine | Implement priority and focus ownership/passing rules as legal action windows for accepted intents. |
| `Pending` | Minimal zone actions | Implement no-ability actions (draw, channel, play-to-chain baseline, kill-to-trash, banish) as explicit intents that use existing zone primitives internally. |
| `Pending` | Chain baseline lifecycle | Implement no-ability chain presence/closure/resolution scaffolding driven by play/pass intents and deterministic resolution order. |
| `Pending` | Gameplay projection fields | Add stable read projection (`turn`, `phase`, `timing`, `priority`, event summary) sourced from the intent-driven runtime state. |
| `Pending` | Combat/showdown skeleton | Implement no-ability movement, contested detection, showdown/combat lifecycle scaffolding as intent-driven state transitions. |

## Notes For Next Work Session

- Keep all rule decisions anchored to v1.2 only.
- Preserve Golden Rule extensibility: avoid hardcoding constraints that cards may override later.

