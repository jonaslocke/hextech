# Postman Manual Smoke: Zone Engine (Ready Game Assumed)

This guide validates the debug zone engine endpoints used to manually probe gameplay zone behavior.

Rules source: `docs/rules/Riftbound Core Rules v1.2.txt`

## Scope Covered

- Setup hydration into gameplay zones
- Core zone placement/movement guardrails
- Facedown battlefield-id integrity and occupancy rules
- Hidden-capacity override behavior
- Hidden reveal, cleanup, and game-end reveal events

## Preconditions

1. API is running:

```bash
npm start
```

2. You already have a match in `ready` state.

3. Postman environment variables:
- `base_url`: `http://localhost:3000/api`
- `match_id`: ready match id
- `p1_battlefield_id`: empty (filled in step 1)
- `p2_battlefield_id`: empty (filled in step 1)

## 1) Read Current Ready Game and Capture Battlefield IDs

`GET {{base_url}}/matches/{{match_id}}`

Checks:
- `data.currentGame.status = "ready"`
- `data.currentGame.gameplay.zones.players.p1.mainDeck.length = 39`
- `data.currentGame.gameplay.zones.players.p2.mainDeck.length = 39`
- `data.currentGame.gameplay.zones.players.p1.runeDeck.length = 12`
- `data.currentGame.gameplay.zones.players.p2.runeDeck.length = 12`
- `data.currentGame.gameplay.zones.players.p1.championZone.length = 1`
- `data.currentGame.gameplay.zones.players.p2.championZone.length = 1`
- `data.currentGame.gameplay.zones.shared.battlefield.length = 2`
- `Object.keys(...facedownByBattlefield)` matches the battlefield ids in `...shared.battlefield`

Pick battlefield ids from `data.currentGame.gameplay.zones.shared.battlefield`:
- p1 id usually contains `setup:battlefield:p1:...`
- p2 id usually contains `setup:battlefield:p2:...`

Save them as `p1_battlefield_id` and `p2_battlefield_id`.

## Flow A: Core Zone Actions

## 2) Place Unit in Battlefield Zone (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_unit_001",
  "cardControllerId": "p1",
  "destination": { "kind": "battlefield" }
}
```

Checks:
- HTTP `201`
- `manual_unit_001` present in `...zones.shared.battlefield`

## 3) Place Same Card Again (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_unit_001",
  "cardControllerId": "p1",
  "destination": { "kind": "chain" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`

## 4) Move Unit Battlefield -> Own Base (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/move`

```json
{
  "cardId": "manual_unit_001",
  "cardControllerId": "p1",
  "source": { "kind": "battlefield" },
  "destination": { "kind": "base_cards", "playerId": "p1" }
}
```

Checks:
- HTTP `201`
- `manual_unit_001` present in `...zones.players.p1.base.cards`

## 5) Place Card in Opponent Base (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_unit_002",
  "cardControllerId": "p1",
  "destination": { "kind": "base_cards", "playerId": "p2" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`

## 6) Place Card in Unknown Player Zone (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_spell_001",
  "cardControllerId": "p1",
  "destination": { "kind": "player_zone", "playerId": "ghost", "zone": "hand" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`

## 7) Place Card in Chain Zone (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_spell_002",
  "cardControllerId": "p1",
  "destination": { "kind": "chain" }
}
```

Checks:
- HTTP `201`
- `manual_spell_002` present in `...zones.shared.chain`

## 8) Move Missing Card from Source (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/move`

```json
{
  "cardId": "manual_missing_001",
  "cardControllerId": "p1",
  "source": { "kind": "battlefield" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "trash" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`

## Flow B: Hidden / Facedown Rules

## 9) Place Hidden with Unresolved Battlefield Variable (should fail)

Use the unresolved literal string below on purpose:

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_hidden_unknown_001",
  "cardControllerId": "p1",
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`
- No fake battlefield key created in `...facedownByBattlefield`

## 10) Override Hidden Capacity with Unresolved Battlefield Variable (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/rules`

```json
{
  "hiddenCapacityByBattlefield": { "{{p1_battlefield_id}}": 2 }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`
- No fake key created in `...ruleParameters.hiddenCapacityByBattlefield`

## 11) Place First Hidden with Real Battlefield ID (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_hidden_001",
  "cardControllerId": "p1",
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Checks:
- HTTP `201`
- `...facedownByBattlefield["{{p1_battlefield_id}}"] = ["manual_hidden_001"]`

## 12) Place Second Hidden Without Override (should fail)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_hidden_002",
  "cardControllerId": "p1",
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Checks:
- HTTP `400`
- `error.code = "VALIDATION_ERROR"`

## 13) Override Hidden Capacity to 2 (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/rules`

```json
{
  "hiddenCapacityByBattlefield": { "{{p1_battlefield_id}}": 2 }
}
```

Checks:
- HTTP `201`
- `...ruleParameters.hiddenCapacityByBattlefield["{{p1_battlefield_id}}"] = 2`

## 14) Place Second Hidden Again (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_hidden_002",
  "cardControllerId": "p1",
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Checks:
- HTTP `201`
- `...facedownByBattlefield["{{p1_battlefield_id}}"] = ["manual_hidden_001", "manual_hidden_002"]`

## 15) Synthetic Reveal Probe: Move Hidden -> Hand (should pass and reveal)

This is a debug probe for rule `408.4` (reveal when a facedown card moves to a private/secret zone). It is not a full gameplay legality test.

`POST {{base_url}}/matches/{{match_id}}/debug/zones/move`

```json
{
  "cardId": "manual_hidden_002",
  "cardControllerId": "p1",
  "cardOwnerId": "p1",
  "source": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "hand" }
}
```

Checks:
- HTTP `201`
- `manual_hidden_002` present in `p1.hand`
- latest event:
  - `type = "facedown_card_revealed"`
  - `details.reason = "move_to_non_public_zone"`
  - `details.cardId = "manual_hidden_002"`

## 16) Cleanup Hidden on Control Loss

`POST {{base_url}}/matches/{{match_id}}/debug/zones/cleanup-hidden`

```json
{
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p2" },
  "cardControllerById": { "manual_hidden_001": "p1" },
  "cardOwnerById": { "manual_hidden_001": "p1" }
}
```

Checks:
- HTTP `201`
- `manual_hidden_001` removed from facedown list
- `manual_hidden_001` present in `p1.trash`

## 17) Place New Hidden Card for Game-End Reveal

`POST {{base_url}}/matches/{{match_id}}/debug/zones/place`

```json
{
  "cardId": "manual_hidden_003",
  "cardControllerId": "p1",
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Checks:
- HTTP `201`

## 18) Reveal Facedown Cards on Game End

`POST {{base_url}}/matches/{{match_id}}/debug/zones/reveal-game-end`

```json
{
  "cardOwnerById": { "manual_hidden_003": "p1" }
}
```

Checks:
- HTTP `201`
- latest event:
  - `type = "facedown_card_revealed"`
  - `details.reason = "game_end"`
  - `details.cardId = "manual_hidden_003"`

---

## Automated Match

Automated smoke tests aligned to this document:

- `tests/zones.debug.smoke.e2e.test.ts`
