# Postman Manual Smoke: Zone Engine (Ready Game Assumed)

This guide manually validates the zone capabilities implemented in PR1-PR5 using HTTP requests.

Rules source: `docs/rules/Riftbound Core Rules v1.2.txt`

## Scope Covered

- Setup hydration into gameplay zones
- Facedown occupancy enforcement (default capacity = 1)
- Hidden-capacity override per battlefield
- Facedown -> private-zone reveal event
- Hidden cleanup on battlefield control loss
- Game-end reveal events for facedown cards

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

## 1) Read Current Ready Game and Capture Battlefield ID

`GET {{base_url}}/matches/{{match_id}}`

Checks:
- `data.currentGame.status = "ready"`
- `data.currentGame.gameplay.zones.players.p1.mainDeck.length = 40`
- `data.currentGame.gameplay.zones.players.p1.runeDeck.length = 12`
- `data.currentGame.gameplay.zones.shared.battlefield.length = 2`

Pick p1 battlefield id from:
- `data.currentGame.gameplay.zones.shared.battlefield`
- it usually contains `setup:battlefield:p1:...`

Save that id as `p1_battlefield_id`.

## 2) Place First Hidden Card (should pass)

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

## 3) Place Second Hidden Card Without Override (should fail)

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

## 4) Override Hidden Capacity to 2 (should pass)

`POST {{base_url}}/matches/{{match_id}}/debug/zones/rules`

```json
{
  "hiddenCapacityByBattlefield": { "{{p1_battlefield_id}}": 2 }
}
```

Checks:
- HTTP `201`
- `...ruleParameters.hiddenCapacityByBattlefield["{{p1_battlefield_id}}"] = 2`

## 5) Place Second Hidden Card Again (should pass now)

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

## 6) Move Hidden Card to Hand (must emit reveal event)

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

## 7) Cleanup Hidden on Control Loss

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

## 8) Place New Hidden Card for Game-End Reveal

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

## 9) Reveal Facedown Cards on Game End

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

Automated smoke test aligned to this document:

- `tests/zones.debug.smoke.e2e.test.ts`
