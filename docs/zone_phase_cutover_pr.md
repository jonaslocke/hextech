# Zone Phase Cutover PR (PR5.1)

Goal: finish this phase with a clean cut where post-setup zone mutations are executed only through one canonical `ZONE_CHANGE` path.

Rules source policy: only `Riftbound Core Rules v1.2` is canonical.

## Why PR5.1 is needed

Current code has multiple mutation surfaces and split semantics:

1. Duplicate mutation entrypoints:
- setup intents (`/setup/*`) for setup state
- debug zone mutators (`/debug/zones/place`, `/change`, `/cleanup-hidden`, `/reveal-game-end`, `/rules`)
- direct internal primitives (`placeCardIntoZone`, `moveCardBetweenZones`)

2. Split event behavior:
- `facedown_card_revealed` is emitted from dedicated branches
- no single canonical zone-change event envelope for all successful transitions

3. Card type authority split:
- debug services currently accept payload `cardType` as authoritative when provided
- known runtime cards should be server-resolved instead

If left as-is, zone behavior can diverge based on endpoint/path used.

## PR5.1 Scope

1. Single mutation contract for this phase:
- Introduce/keep one action contract: `ZONE_CHANGE`
- All non-setup zone changes route through that one action path

2. Deprecate duplicated debug mutators:
- remove or hard-deprecate:
  - `POST /matches/:id/debug/zones/place`
  - `POST /matches/:id/debug/zones/cleanup-hidden`
  - `POST /matches/:id/debug/zones/reveal-game-end`
  - `POST /matches/:id/debug/zones/rules`
- keep one temporary manual/testing mutation endpoint only if needed, mapped internally to `ZONE_CHANGE`

3. Strict card type authority:
- for known gameplay card ids: derive type from server runtime/catalog
- reject conflicting client-provided `cardType`
- allow explicit `cardType` only for synthetic unknown test ids (if still required)

4. Event unification:
- append canonical zone-change event for each successful `ZONE_CHANGE`
- keep specialized reveal events only as additional derived events when applicable

5. Manual and tests cutover:
- update manual flow/docs to call the canonical mutation path
- remove coverage that depends on deprecated debug-only mutators
- add tests that assert deprecated routes are rejected/absent

## Exit Criteria

- Exactly one post-setup zone mutation API path is active (`ZONE_CHANGE`).
- Deprecated debug mutators are no longer usable.
- Known-card type cannot be overridden by request payload.
- Zone transitions are observable through a consistent event envelope.
- Manual docs and automated tests validate only the new path.


