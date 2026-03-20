# Postman Manual Smoke: Engine Flow (No Gameplay Intent API)

This smoke flow validates current capabilities:
- match creation + setup to `ready`
- match read access control (`viewerPlayerId` required and must be match player)
- zone engine action path (`/debug/zones/change`)
- result reporting and BO3 lifecycle transition

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

## 2. Core Setup + Match Read

Run in order:
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
- `data.currentGame.gameplay.zones.players.p1.championZone[0]`
- `data.currentGame.gameplay.zones.players.p2.championZone[0]`

## 3. Derive Runtime Card IDs

From champion id format:

`<registration_ref>:<player_id>:main_deck:001`

Derive:
- `p1_main_002` = `<registration_ref_of_p1>:p1:main_deck:002`
- `p1_main_003` = `<registration_ref_of_p1>:p1:main_deck:003`
- `p2_main_002` = `<registration_ref_of_p2>:p2:main_deck:002`
- `p1_rune_001` = `<registration_ref_of_p1>:p1:rune_deck:001`

## 4. Match Read Access + Visibility

1. `GET /matches/{{match_id}}?viewerPlayerId=p1` -> expect `200`
2. `GET /matches/{{match_id}}?viewerPlayerId=p2` -> expect `200`
3. `GET /matches/{{match_id}}` -> expect `400` with `viewerPlayerId` required

Optional cutover check:
- `POST /matches/{{match_id}}/gameplay/intents` -> expect `404` (endpoint removed)

## 5. Zone Engine Smoke (`/debug/zones/change`)

### 5.1 Allowed move

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

### 5.2 Blocked move

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

## 6. Report Result Lifecycle

### 6.1 Report game

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

### 6.2 Verify

`GET /matches/{{match_id}}?viewerPlayerId=p1`

Expected:
- returns `setup_pending`
- next game setup can start

## 7. Pass Criteria

Smoke passes when:
1. setup reaches `ready`
2. match read enforces player viewer
3. zone debug change allows legal movement and blocks illegal movement
4. result reporting transitions match lifecycle correctly
