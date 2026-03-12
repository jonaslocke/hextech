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
| `Completed` | Hidden cleanup enforcement | Added cleanup routine to remove hidden cards when battlefield control no longer matches controller, moving cards to owner trash. |
| `Completed` | Facedown reveal on non-public move | Added reveal event emission when facedown cards move to private/secret zones. |
| `Completed` | Facedown reveal on game end | Added reveal event emission for all facedown cards when game end reveal is invoked. |
| `Completed` | Gameplay event appending | Added event append helper and event detail payload support for zone/reveal workflows. |
| `Completed` | Manual zone testing API | Added debug endpoints for manual Postman-like validation of zone behaviors (`place`, `move`, `cleanup-hidden`, `reveal-game-end`, `rules`). |
| `Completed` | Manual zone smoke document | Added manual testing document for ready-game zone validation flow. |
| `Completed` | Automated zone smoke test | Added end-to-end smoke test that mirrors the manual zone testing flow. |
| `Pending` | Deterministic RNG policy | Add seeded RNG (derived from game identity) for all randomness in gameplay engine paths. |
| `Pending` | Gameplay intent API (non-debug) | Add production gameplay intent endpoint/service for in-game actions. |
| `Pending` | Turn kernel | Implement turn ownership, turn number, and phase progression states. |
| `Pending` | Timing states | Implement neutral/showdown + open/closed timing state model and transitions. |
| `Pending` | Priority/focus engine | Implement priority and focus ownership/passing rules for legal action windows. |
| `Pending` | Minimal zone actions | Implement no-ability actions on top of zone primitives: draw, channel, play-to-chain baseline, kill-to-trash, banish. |
| `Pending` | Chain baseline lifecycle | Implement no-ability chain presence/closure/resolution scaffolding for future effect integration. |
| `Pending` | Gameplay projection fields | Add stable read projection for `turn`, `phase`, `timing`, `priority`, and event summary from runtime state. |
| `Pending` | Combat/showdown skeleton | Implement no-ability movement, contested detection, showdown/combat lifecycle scaffolding. |

## Notes For Next Work Session

- Keep all rule decisions anchored to v1.2 only.
- Preserve Golden Rule extensibility: avoid hardcoding constraints that cards may override later.
- For new gameplay behavior, prefer extending the existing zone primitives instead of direct state mutations.
