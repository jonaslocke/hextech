# Postman Manual Smoke: Engine Architecture-Correct Flow

This smoke flow validates the current architecture and capabilities:
- match setup + ready transition
- player-view match projection (`viewerPlayerId` must be a match player)
- gameplay intent guard (`ZONE_CHANGE` is not a gameplay intent)
- zone engine action path (`/debug/zones/change`)
- result reporting lifecycle

Rules baseline: **Riftbound Core Rules v1.2**.

## 1. Preconditions

1. Start API:

```bash
npm start
```

2. Set Postman environment:
- `base_url` = `http://localhost:3000/api`
- `match_id` = (empty)
- `chooser_id` = (empty)
- `p1_main_002` = (empty)
- `p1_main_003` = (empty)
- `p2_main_002` = (empty)
- `p1_rune_001` = (empty)

3. Deck source:
- `docs/ahri.dec.txt`

## 2. Core Setup + Player Read

### 2.1 Create + setup

Run these requests in order:
1. `POST /matches`
2. `POST /matches/{{match_id}}/setup/champion` with `p1`
3. `POST /matches/{{match_id}}/setup/champion` with `p2`
4. `POST /matches/{{match_id}}/setup/battlefield` with p1 battlefield
5. `POST /matches/{{match_id}}/setup/battlefield` with p2 battlefield
6. `POST /matches/{{match_id}}/setup/starting-player`

Expected after step 6:
- `data.status = "ready"`
- `data.currentGame.status = "ready"`

Save:
- `match_id`
- `chooser_id`
- `data.currentGame.gameplay.zones.players.p1.championZone[0]` and p2 champion id

### 2.2 Derive hidden-zone card ids for tests

From champion id format:

`<registration_ref>:<player_id>:main_deck:001`

Derive:
- `p1_main_002` = `<registration_ref_of_p1>:p1:main_deck:002`
- `p1_main_003` = `<registration_ref_of_p1>:p1:main_deck:003`
- `p2_main_002` = `<registration_ref_of_p2>:p2:main_deck:002`
- `p1_rune_001` = `<registration_ref_of_p1>:p1:rune_deck:001`

### 2.3 Match read access and projection

1. `GET /matches/{{match_id}}?viewerPlayerId=p1` -> expect `200`
2. `GET /matches/{{match_id}}?viewerPlayerId=p2` -> expect `200`
3. `GET /matches/{{match_id}}` -> expect `400` with `viewerPlayerId` required

## 3. Gameplay Intent Guard (Architecture)

### 3.1 Reject `ZONE_CHANGE` as intent

`POST /matches/{{match_id}}/gameplay/intents`

```json
{
  "actorPlayerId": "p1",
  "intent": {
    "type": "ZONE_CHANGE",
    "payload": {
      "cardId": "{{p1_main_002}}",
      "cardControllerId": "p1",
      "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
      "destination": { "kind": "player_zone", "playerId": "p1", "zone": "hand" }
    }
  }
}
```

Expected:
- `400`
- message contains `ZONE_CHANGE is an engine action, not a gameplay intent`

### 3.2 Reject unsupported intent type

Use `DRAW_CARD` (or any unsupported high-level intent) and expect `400` unsupported.

## 4. Zone Engine Smoke (`/debug/zones/change`)

### 4.1 Allowed move

`POST /matches/{{match_id}}/debug/zones/change`

```json
{
  "cardId": "{{p1_rune_001}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "runeDeck" },
  "destination": { "kind": "base_runes", "playerId": "p1" }
}
```

Expected: `201`

### 4.2 Blocked move

Try rune -> chain:

```json
{
  "cardId": "{{p1_main_003}}",
  "cardControllerId": "p1",
  "cardType": "rune",
  "source": { "kind": "player_zone", "playerId": "p1", "zone": "mainDeck" },
  "destination": { "kind": "chain" }
}
```

Expected: `400`

## 5. Report Result Lifecycle

### 5.1 Report game

`POST /matches/{{match_id}}/games`

```json
{
  "winnerPlayerId": "p1",
  "actorPlayerId": "p1"
}
```

Expected:
- `201`
- `data.status = "setup_pending"`
- `data.currentGame.status = "setup_pending"`
- best-of-3 advances to next game setup

### 5.2 Verify state

`GET /matches/{{match_id}}?viewerPlayerId=p1`

Expected:
- still `setup_pending`
- next setup can begin

## 6. Pass Criteria

Smoke passes when:
1. setup reaches `ready`
2. match read requires `viewerPlayerId` and rejects missing viewer
3. `ZONE_CHANGE` is rejected as intent
4. debug zone engine allows one legal move and blocks one illegal move
5. result reporting transitions match lifecycle correctly
