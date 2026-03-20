# Match Setup (Implemented Behavior)

This document describes match setup exactly as implemented in code.

## Scope

Setup is the phase where both players:

1. confirm chosen champion (optionally with deck reconfiguration in best-of-3 from game 2 onward),
2. select one battlefield for the current game,
3. choose the starting player (by the designated chooser only).

When setup is complete, match/game status moves from `setup_pending` to `ready`, and gameplay zones are hydrated.

## Creation Preconditions

`POST /api/matches`

- Requires `format` (`best-of-1` or `best-of-3`), exactly 2 players, and `decksByPlayer`.
- Rejects `selectedBattlefieldsByPlayer` at creation.
- Each player deck is validated by `DeckValidator`.
- Each player battlefield pool is built from the deck battlefields (exactly 3), all initialized with `used: false`.
- `startingPlayerChooserId` is randomly chosen between match players.
- Initial game is created with status `setup_pending`.

## Setup Endpoints

All setup endpoints require the match current game to be `setup_pending` and match status to be `setup_pending`.

### 1) Select Chosen Champion

`POST /api/matches/:id/setup/champion`

Payload:

```json
{
  "playerId": "p1",
  "deckList": "Legend:\n...\n"
}
```

Behavior:

- `playerId` must be one of match players.
- Can be sent only once per player.
- If `deckList` is not provided, champion value is resolved from the player's registered deck (`DeckValidator.validate(...).chosenChampion`).
- `deckList` reconfiguration is allowed only for `best-of-3` from game 2 onward (`currentGame.number >= 2`).
- Reconfiguration may only swap cards among `Champion`, `MainDeck`, and `Sideboard`.
- `Legend`, `Runes`, and `Battlefields` sections must remain exactly the same as registered.
- Reconfigured deck must still pass deck validation rules.

Reconfiguration policy examples:

- Game 1 (`best-of-3`) + `deckList`:
  - Rejected with `400 VALIDATION_ERROR`
  - Message: `Setup deck reconfiguration is only allowed from game 2 onward in best-of-3 matches.`
- Game 2+ (`best-of-3`) + valid `deckList`:
  - Accepted with `201`
  - `chosenChampionByPlayer[playerId]` reflects the reconfigured `Champion` slot.

### 2) Select Battlefield

`POST /api/matches/:id/setup/battlefield`

Payload (best-of-3):

```json
{
  "playerId": "p1",
  "battlefield": "Fortified Position"
}
```

Behavior:

- `playerId` must be one of match players.
- Can be sent only once per player.
- Player must have exactly 3 battlefields in pool.
- Selected battlefield cannot be already `used` in this match for that player.

Format policy:

- `best-of-1`: battlefield is selected randomly from player roster. Incoming `battlefield` value is not used.
- `best-of-3`: `battlefield` is required and must be one of that player's registered battlefields.

### 3) Select Starting Player

`POST /api/matches/:id/setup/starting-player`

Payload:

```json
{
  "playerId": "p1",
  "startingPlayerId": "p1"
}
```

Behavior:

- `playerId` must be one of match players.
- Only `startingPlayerChooserId` may send this intent.
- Can be sent only once per game setup.
- `startingPlayerId` must be one of match players.

## Setup Completion Condition

Setup completes when, for both players:

- `chosenChampionByPlayer[playerId]` is present,
- `selectedBattlefieldsByPlayer[playerId]` is present,
- and `startingPlayerId` is set.

At that point:

- `game.status` becomes `ready`,
- `match.status` becomes `ready`,
- `game.gameplay` is rebuilt via setup hydration.

## Ready-State Hydration

When setup becomes ready, cards/objects are placed into gameplay zones:

- Each player's main library except chosen champion -> `players.<id>.mainDeck`
- Each player's rune library -> `players.<id>.runeDeck`
- Chosen champion card instance -> `players.<id>.championZone`
- Generated legend setup object -> `players.<id>.legendZone`
- Generated selected battlefield setup object -> `shared.battlefield`
- `shared.facedownByBattlefield[battlefieldId]` is initialized as empty array
- Kernel is activated with chosen `startingPlayerId`

Expected counts with current deck shape:

- `mainDeck`: 39 cards per player (chosen champion excluded)
- `runeDeck`: 12 cards per player
- `championZone`: 1 card per player
- `legendZone`: 1 object per player
- `shared.battlefield`: 2 objects (one per player)

## Response Shape and Visibility

Setup endpoints return a `MatchView` projected for the acting player (`viewerPlayerId = intent.playerId`).

- `decksByPlayer` is not exposed in responses.
- `currentGame.deckStateByPlayer` is not exposed in responses.
- Gameplay zone visibility projection follows zone policy and viewer ownership.

For reads:

- `GET /api/matches/:id` currently requires `viewerPlayerId` query parameter.
- `viewerPlayerId` must be one of match players.

## Setup Error Conditions (Implemented)

Typical setup validation errors (`400 VALIDATION_ERROR`):

- Match setup is not pending.
- Player id missing.
- Player not in match.
- Repeated one-shot intent (champion, battlefield, starting-player).
- Deck reconfiguration sent in `best-of-1`.
- Deck reconfiguration sent during game 1 setup.
- Reconfigured deck changes immutable sections (`Legend`, `Runes`, `Battlefields`).
- Reconfigured deck introduces/removes cards outside Champion/MainDeck/Sideboard swap pool.
- Battlefield missing/invalid for best-of-3.
- Battlefield already used by that player in this match.
- Starting player selected by non-chooser.
- Starting player id not in match.

If match does not exist: `404 NOT_FOUND`.
