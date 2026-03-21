# Turn Order Kernel Plan (Strict 1v1, Showdown Deferred)

## Summary
- Current implemented baseline: setup flow, setup hydration into gameplay zones, zone movement policy engine (domain primitives), kernel scaffold (`phase/timing/turn/priority/chain/execution`) and event appending.
- Canonical rules anchor for this plan: v1.2 turn order + turn loop + state model + priority/focus + phase flow + cleanup staging (`115`, `304-317`, `310-313`, `322.13-322.14`, `462.7`, `463.7`).
- Chosen direction: strict 1v1, detailed turn phases, explicit intent-driven control, showdown/combat staged but not opened/resolved yet.

## Implementation Changes
- **Kernel/state model**
  - Replace coarse gameplay phase with explicit turn phases:
    - `setup`
    - `start_awaken`
    - `start_beginning`
    - `start_channel`
    - `start_draw`
    - `action`
    - `end_ending`
    - `end_expiration`
    - `end_cleanup`
  - Extend turn state for strict 1v1 ordering:
    - `turn.number`
    - `turn.activePlayerId`
    - `turn.order` (fixed 2-player sequence derived from setup `startingPlayerId`)
    - `turn.activeOrderIndex`
  - Keep timing `open/closed` and chain scaffold as-is; for this milestone, timing is derived from chain presence and no showdown-open state is entered.
  - Add first-turn metadata for mode rule `462.7/463.7`:
    - track whether each player has completed their first channel step
    - during second player’s first `start_channel`, mark +1 channel bonus in event metadata (no full resource engine mutation yet).
  - Add deferred structured-window placeholders:
    - `stagedShowdowns: []`
    - `stagedCombats: []`
    - feature gate `showdownResolutionEnabled = false` (hard off in this phase).

- **Turn intent reducer (explicit control)**
  - Introduce gameplay intents:
    - `ADVANCE_STEP` (single legal phase transition; not valid during `action`)
    - `END_ACTION` (only valid in `action`, transitions to `end_ending`)
  - Validation rules:
    - actor must be current `turn.activePlayerId`
    - match/game must be gameplay-ready (not setup_pending/finished)
    - no phase advancement while chain is non-empty (`closed` state block)
    - if deferred staged windows exist and gate is off, block advancement with explicit validation error (prevents silent rules violation).
  - Transition rules (deterministic, one step per intent):
    - `start_awaken -> start_beginning -> start_channel -> start_draw -> action`
    - `action --END_ACTION--> end_ending -> end_expiration -> end_cleanup`
    - `end_cleanup -> next turn start_awaken` (rotate active player by `turn.order`, increment `turn.number`).
  - Priority behavior in this phase:
    - `action` + open chain: priority = active player
    - all other phases: priority = null
    - pass/focus engine remains deferred.

- **Application/API surface**
  - Add new endpoint: `POST /api/matches/:id/gameplay/intents`
  - Request DTO:
    - `actorPlayerId`
    - `intentType` (`ADVANCE_STEP` | `END_ACTION`)
  - Response: same `MatchView` projection pattern as existing setup endpoints (`viewerPlayerId = actorPlayerId`).
  - On first successful gameplay intent, transition `match.status` from `ready` to `in_progress`.
  - No external zone-mutation endpoint in this milestone; zone mutations remain internal domain primitives.

- **Events and observability**
  - Append deterministic envelope (`intent_resolved`) for each accepted gameplay intent.
  - Add explicit lifecycle events:
    - `phase_advanced`
    - `turn_advanced`
    - `channel_step_opened` (with computed channel amount, including second-player first-turn +1 marker)
    - `showdown_staged` / `combat_staged` reserved hooks (only if staged lists become populated).

## Public API / Type Changes
- `GameplayPhase` becomes detailed phase enum listed above.
- `GameplayTurnState` adds turn order fields (`order`, `activeOrderIndex`).
- New gameplay-intent DTO and route:
  - `POST /api/matches/:id/gameplay/intents`
  - intent union: `ADVANCE_STEP | END_ACTION`.

## Test Plan
- **Domain reducer tests**
  - legal full-turn progression across all detailed phases
  - illegal actor rejected
  - `ADVANCE_STEP` rejected in `action`; `END_ACTION` rejected outside `action`
  - chain-nonempty advancement rejection
  - turn rotation correctness (`p1 -> p2 -> p1`) and turn number increments
  - second player first-channel bonus marker emitted once.
- **API contract tests**
  - endpoint success path returns projected match view
  - status transition `ready -> in_progress` on first gameplay intent
  - validation errors mapped to `400 VALIDATION_ERROR`.
- **Regression tests**
  - existing setup flow + hydration tests unchanged
  - existing zone-change tests unchanged
  - record-result flow still valid after `in_progress` status introduction.

## Assumptions and Defaults
- Strict 1v1 only in this iteration; no teammate/FFA relevance rules implemented.
- Showdown/combat opening/resolution intentionally excluded; only staged placeholders/gates are introduced.
- No card ability logic; no full chain/focus resolution engine yet.
- Channel/draw resource/card mutations remain separate future intents; this milestone provides phase/turn control kernel only.
- The workspace does not currently contain the additional docs from your open-tab list; plan is based on available repo sources plus v1.2 rules text.
