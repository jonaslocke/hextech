# Postman Zone Movement Flow: Policy + Capacity Validation (`/debug/zones/change`)

This guide documents manual Postman testing for zone movement policy enforcement.
It is intentionally focused on `ZONE_CHANGE` behavior through:

- `POST /api/matches/{matchId}/debug/zones/change`

It validates:
- Allowed/prohibited card types per destination zone
- Zone capacity checks (champion zone, facedown hidden slot)
- Ownership/controller constraints (base ownership, facedown controller)

## 1. Preconditions

1. Start the API server:

```bash
npm start
```

2. Create a Postman environment:
- `base_url` = `http://localhost:3000/api`
- `match_id` = (empty)
- `chooser_id` = (empty)
- `p1_battlefield_id` = (empty)
- `p2_battlefield_id` = (empty)
- `card_main_01` .. `card_main_20` = (empty)
- `card_rune_01`, `card_rune_02` = (empty)
- `card_champion_01`, `card_legend_01` = (empty)

3. Run the setup flow first so the match is `ready`:
- Use [postman_match_setup_flow.md](/c:/wplace/hextech/docs/postman_match_setup_flow.md)
- Save `match_id` and `chooser_id` from setup responses.

4. Open Postman Console (recommended) to inspect full response payloads.

## 2. Zone Reference (`kind`) in Move Payloads

`source` and `destination` are zone references. `kind` tells the engine which zone family is targeted:

- `player_zone`: one of `mainDeck`, `runeDeck`, `hand`, `trash`, `banishment`, `championZone`, `legendZone`
- `base_cards`: player's base card lane (unit/gear)
- `base_runes`: player's base rune lane (runes)
- `battlefield`: shared battlefield zone
- `chain`: shared chain zone
- `facedown`: hidden bucket tied to one battlefield id

## 3. Capture Runtime Card IDs From a Ready Match

`GET {{base_url}}/matches/{{match_id}}`

Extract and save:

- `p1_battlefield_id` = first id containing `setup:battlefield:p1:`
- `p2_battlefield_id` = first id containing `setup:battlefield:p2:`
- `card_main_01..20` = first 20 entries in `data.currentGame.gameplay.zones.players.p1.mainDeck`
- `card_rune_01`, `card_rune_02` = first 2 entries in `...players.p1.runeDeck`
- `card_champion_01` = first entry in `...players.p1.championZone`
- `card_legend_01` = first entry in `...players.p1.legendZone`

Expected:
- HTTP `200`
- `data.currentGame.status = "ready"`
- `data.currentGame.gameplay.zones.shared.battlefield.length = 2`

## 4. Policy Movement Cases

All requests below:

`POST {{base_url}}/matches/{{match_id}}/debug/zones/change`

### 4.1 rune -> mainDeck (blocked)

```json
{
  "cardId": "{{card_rune_01}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" }
}
```

Expected: HTTP `400`

### 4.2 spell -> mainDeck (allowed)

```json
{
  "cardId": "{{card_rune_01}}",
  "cardControllerId": "p1",
  "cardType": "spell",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" }
}
```

Expected: HTTP `201`

### 4.3 rune -> runeDeck (allowed)

```json
{
  "cardId": "{{card_main_01}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" }
}
```

Expected: HTTP `201`

### 4.4 unit -> runeDeck (blocked)

```json
{
  "cardId": "{{card_main_02}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" }
}
```

Expected: HTTP `400`

### 4.5 unit -> hand (allowed)

```json
{
  "cardId": "{{card_main_03}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "hand" }
}
```

Expected: HTTP `201`

### 4.6 rune -> hand (blocked)

```json
{
  "cardId": "{{card_main_04}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "hand" }
}
```

Expected: HTTP `400`

### 4.7 chosen champion: championZone -> base_cards (allowed)

```json
{
  "cardId": "{{card_champion_01}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "championZone" },
  "destination": { "kind": "base_cards", "playerId": "p1" }
}
```

Expected: HTTP `201`

### 4.8 chosen champion: base_cards -> championZone (blocked by normal means)

```json
{
  "cardId": "{{card_champion_01}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "base_cards", "playerId": "p1" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "championZone" }
}
```

Expected: HTTP `400`

### 4.9 regular unit -> championZone (blocked)

```json
{
  "cardId": "{{card_main_05}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "championZone" }
}
```

Expected: HTTP `400`

### 4.10 spell -> championZone (blocked)

```json
{
  "cardId": "{{card_main_06}}",
  "cardControllerId": "p1",
  "cardType": "spell",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "championZone" }
}
```

Expected: HTTP `400`

### 4.11 legendZone -> hand (blocked)

```json
{
  "cardId": "{{card_legend_01}}",
  "cardControllerId": "p1",
  "cardType": "legend",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "legendZone" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "hand" }
}
```

Expected: HTTP `400`

### 4.12 unit -> legendZone (blocked)

```json
{
  "cardId": "{{card_main_08}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "legendZone" }
}
```

Expected: HTTP `400`

### 4.13 unit -> base_cards (allowed)

```json
{
  "cardId": "{{card_main_09}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "base_cards", "playerId": "p1" }
}
```

Expected: HTTP `201`

### 4.14 rune -> base_runes (allowed)

```json
{
  "cardId": "{{card_rune_02}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" },
  "destination": { "kind": "base_runes", "playerId": "p1" }
}
```

Expected: HTTP `201`

### 4.15 spell -> base_cards (blocked)

```json
{
  "cardId": "{{card_main_10}}",
  "cardControllerId": "p1",
  "cardType": "spell",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "base_cards", "playerId": "p1" }
}
```

Expected: HTTP `400`

### 4.16 unit -> opponent base_cards (blocked)

```json
{
  "cardId": "{{card_main_11}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "base_cards", "playerId": "p2" }
}
```

Expected: HTTP `400`

### 4.17 unit -> battlefield (allowed)

```json
{
  "cardId": "{{card_main_12}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "battlefield" }
}
```

Expected: HTTP `201`

### 4.18 rune -> battlefield (blocked)

```json
{
  "cardId": "{{card_main_13}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "battlefield" }
}
```

Expected: HTTP `400`

### 4.19 spell -> chain (allowed)

```json
{
  "cardId": "{{card_main_16}}",
  "cardControllerId": "p1",
  "cardType": "spell",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "chain" }
}
```

Expected: HTTP `201`

### 4.20 rune -> chain (blocked)

```json
{
  "cardId": "{{card_main_17}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "chain" }
}
```

Expected: HTTP `400`

### 4.21 rune -> trash (allowed)

```json
{
  "cardId": "{{card_main_20}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "trash" }
}
```

Expected: HTTP `201`

### 4.22 gear -> banishment (allowed)

```json
{
  "cardId": "{{card_main_18}}",
  "cardControllerId": "p1",
  "cardType": "gear",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "banishment" }
}
```

Expected: HTTP `201`

### 4.23 rune -> banishment (blocked)

```json
{
  "cardId": "{{card_main_19}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "player_zone", "playerId": "p1", "zone": "banishment" }
}
```

Expected: HTTP `400`

### 4.24 battlefield -> facedown (allowed)

```json
{
  "cardId": "{{p1_battlefield_id}}",
  "cardControllerId": "p1",
  "cardType": "battlefield",
  "source": { "kind": "battlefield" },
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Expected: HTTP `201`

### 4.25 second card -> facedown same battlefield (capacity blocked)

```json
{
  "cardId": "{{card_main_14}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p1" }
}
```

Expected: HTTP `400`

### 4.26 wrong facedown controller map (blocked)

```json
{
  "cardId": "{{card_main_15}}",
  "cardControllerId": "p1",
  "cardType": "unit",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "facedown", "battlefieldId": "{{p1_battlefield_id}}" },
  "battlefieldControllerById": { "{{p1_battlefield_id}}": "p2" }
}
```

Expected: HTTP `400`

## 5. Validation Checklist

Pass criteria:
- Every "allowed" case returns HTTP `201`
- Every "blocked" case returns HTTP `400`
- Champion zone blocks second unit
- Facedown blocks second card for same battlefield with default hidden capacity
- Base ownership and facedown controller constraints are enforced

## Notes

- This flow is intentionally debug-focused and validates zone policy execution only.
- `cardType` in payload controls policy path for the move request.
- For production action resolution, card typing should come from authoritative runtime/card catalog data.
- Rules v1.2 references for champion-zone behavior:
  - [Riftbound Core Rules v1.2.txt:132](/c:/wplace/hextech/docs/rules/Riftbound Core Rules v1.2.txt:132)
  - [Riftbound Core Rules v1.2.txt:134](/c:/wplace/hextech/docs/rules/Riftbound Core Rules v1.2.txt:134)
  - [Riftbound Core Rules v1.2.txt:1190](/c:/wplace/hextech/docs/rules/Riftbound Core Rules v1.2.txt:1190)

