# Postman Setup Flow: Create Match -> `ready` (+ Deck Secrecy Checks)

This guide shows the exact HTTP requests to move a match from creation to `ready`
and verify deck secrecy behavior introduced in the latest implementation:
- Decks are stored under server authority.
- Decks are not exposed in public match responses.

## 1. Preconditions

1. Start the API server:

```bash
npm start
```

2. Create a Postman environment with:
- `base_url` = `http://localhost:3000/api`
- `match_id` = (empty)
- `chooser_id` = (empty)

3. Optional (recommended): open Postman Console so you can inspect full response JSON.

## 2. Optional: Validate Deck First

`POST {{base_url}}/decks/validate`

```json
{
  "deckList": "Legend:\n1 Ahri, Nine-Tailed Fox\n\nChampion:\n1 Ahri, Inquisitive\n\nMainDeck:\n3 Defy\n3 En Garde\n3 Stalwart Poro\n3 Discipline\n3 Stupefy\n3 Ravenbloom Student\n3 Sprite Mother\n3 Thousand-Tailed Watcher\n2 Charm\n2 Clockwork Keeper\n2 Rune Prison\n2 Tasty Faefolk\n2 Retreat\n1 Find Your Center\n2 Wind Wall\n2 Sona, Harmonious\n1 Ahri, Alluring\n\nBattlefields:\n1 Fortified Position\n1 Grove of the God-Willow\n1 The Dreaming Tree\n\nRunes:\n7 Calm Rune\n5 Mind Rune\n\nSideboard:\n1 Rune Prison\n1 Wind Wall\n1 Blitzcrank, Impassive\n1 Riptide Rex\n1 Retreat\n1 Singularity\n1 Unchecked Power\n1 Fox-Fire"
}
```

Expected:
- `data.isValid = true`

## 3. Create Match (`setup_pending`)

`POST {{base_url}}/matches`

```json
{
  "format": "best-of-3",
  "players": [
    { "id": "p1", "displayName": "Alice" },
    { "id": "p2", "displayName": "Bob" }
  ],
  "decksByPlayer": {
    "p1": "Legend:\n1 Ahri, Nine-Tailed Fox\n\nChampion:\n1 Ahri, Inquisitive\n\nMainDeck:\n3 Defy\n3 En Garde\n3 Stalwart Poro\n3 Discipline\n3 Stupefy\n3 Ravenbloom Student\n3 Sprite Mother\n3 Thousand-Tailed Watcher\n2 Charm\n2 Clockwork Keeper\n2 Rune Prison\n2 Tasty Faefolk\n2 Retreat\n1 Find Your Center\n2 Wind Wall\n2 Sona, Harmonious\n1 Ahri, Alluring\n\nBattlefields:\n1 Fortified Position\n1 Grove of the God-Willow\n1 The Dreaming Tree\n\nRunes:\n7 Calm Rune\n5 Mind Rune\n\nSideboard:\n1 Rune Prison\n1 Wind Wall\n1 Blitzcrank, Impassive\n1 Riptide Rex\n1 Retreat\n1 Singularity\n1 Unchecked Power\n1 Fox-Fire",
    "p2": "Legend:\n1 Ahri, Nine-Tailed Fox\n\nChampion:\n1 Ahri, Inquisitive\n\nMainDeck:\n3 Defy\n3 En Garde\n3 Stalwart Poro\n3 Discipline\n3 Stupefy\n3 Ravenbloom Student\n3 Sprite Mother\n3 Thousand-Tailed Watcher\n2 Charm\n2 Clockwork Keeper\n2 Rune Prison\n2 Tasty Faefolk\n2 Retreat\n1 Find Your Center\n2 Wind Wall\n2 Sona, Harmonious\n1 Ahri, Alluring\n\nBattlefields:\n1 Fortified Position\n1 Grove of the God-Willow\n1 The Dreaming Tree\n\nRunes:\n7 Calm Rune\n5 Mind Rune\n\nSideboard:\n1 Rune Prison\n1 Wind Wall\n1 Blitzcrank, Impassive\n1 Riptide Rex\n1 Retreat\n1 Singularity\n1 Unchecked Power\n1 Fox-Fire"
  }
}
```

Expected:
- `data.status = "setup_pending"`
- `data.currentGame.startingPlayerId = null`
- `data.startingPlayerChooserId` is `"p1"` or `"p2"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

Save:
- `data.id` -> `match_id`
- `data.startingPlayerChooserId` -> `chooser_id`

## 4. Select Chosen Champion (p1)

`POST {{base_url}}/matches/{{match_id}}/setup/champion`

```json
{
  "playerId": "p1"
}
```

Expected:
- `data.currentGame.chosenChampionByPlayer.p1 = "Ahri, Inquisitive"`
- `data.status` still `setup_pending`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 5. Select Chosen Champion (p2)

`POST {{base_url}}/matches/{{match_id}}/setup/champion`

```json
{
  "playerId": "p2"
}
```

Expected:
- `data.currentGame.chosenChampionByPlayer.p2 = "Ahri, Inquisitive"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 6. Select Battlefield (p1)

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p1",
  "battlefield": "Fortified Position"
}
```

Expected:
- `data.currentGame.selectedBattlefieldsByPlayer.p1 = "Fortified Position"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 7. Select Battlefield (p2)

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p2",
  "battlefield": "Grove of the God-Willow"
}
```

Expected:
- `data.currentGame.selectedBattlefieldsByPlayer.p2 = "Grove of the God-Willow"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 8. Select Starting Player (only chooser can do this)

Use the `chooser_id` value from step 3.

`POST {{base_url}}/matches/{{match_id}}/setup/starting-player`

```json
{
  "playerId": "{{chooser_id}}",
  "startingPlayerId": "p1"
}
```

Expected:
- `data.currentGame.startingPlayerId = "p1"`
- `data.status = "ready"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 9. Verify Final Match State

`GET {{base_url}}/matches/{{match_id}}`

Expected:
- `data.status = "ready"`
- `data.currentGame.chosenChampionByPlayer.p1` and `data.currentGame.chosenChampionByPlayer.p2` are filled
- `data.currentGame.selectedBattlefieldsByPlayer.p1` and `data.currentGame.selectedBattlefieldsByPlayer.p2` are filled
- `data.currentGame.startingPlayerId` is filled
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 10. (Best-of-3) Report Game 1 Result and Verify Secrecy

`POST {{base_url}}/matches/{{match_id}}/games`

```json
{
  "gameId": "postman_bo3_game_001",
  "winnerPlayerId": "p1"
}
```

Expected:
- `data.status = "setup_pending"`
- `data.currentGame.number = 2`
- `data.currentGame.status = "setup_pending"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

Save:
- `data.startingPlayerChooserId` -> `chooser_id` (for game 2 setup)

## 11. (Best-of-3) Setup Game 2: Select Chosen Champion (p1)

`POST {{base_url}}/matches/{{match_id}}/setup/champion`

```json
{
  "playerId": "p1"
}
```

## 12. (Best-of-3) Setup Game 2: Select Chosen Champion (p2)

`POST {{base_url}}/matches/{{match_id}}/setup/champion`

```json
{
  "playerId": "p2"
}
```

## 13. (Best-of-3) Setup Game 2: Select Battlefield (p1)

Use one of p1's remaining battlefields not used in game 1.

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p1",
  "battlefield": "Grove of the God-Willow"
}
```

## 14. (Best-of-3) Setup Game 2: Select Battlefield (p2)

Use one of p2's remaining battlefields not used in game 1.

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p2",
  "battlefield": "The Dreaming Tree"
}
```

## 15. (Best-of-3) Setup Game 2: Select Starting Player

Use `chooser_id` saved from step 10.

`POST {{base_url}}/matches/{{match_id}}/setup/starting-player`

```json
{
  "playerId": "{{chooser_id}}",
  "startingPlayerId": "p2"
}
```

Expected:
- `data.status = "ready"`
- `data.currentGame.number = 2`
- `data.currentGame.status = "ready"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

## 16. (Best-of-3) Report Game 2 Result and Verify Secrecy

`POST {{base_url}}/matches/{{match_id}}/games`

```json
{
  "gameId": "postman_bo3_game_002",
  "winnerPlayerId": "p1"
}
```

Expected:
- `data.status = "finished"`
- `data.winnerPlayerId = "p1"`
- `data.decksByPlayer` is absent / undefined
- `data.currentGame.deckStateByPlayer` is absent / undefined

---

## Notes

- Do not send `selectedBattlefieldsByPlayer` in `POST /matches`; it is rejected.
- Do not send `nextGameSelectedBattlefieldsByPlayer` in `POST /matches/{id}/games`; game setup always happens through `/setup/*`.
- Setup intents are one-shot per player per setup step.
- For `best-of-1`, use the same `/setup/battlefield` endpoint, but battlefield is randomly resolved by the server.
- Internal deck tracking is authoritative and not visible in public API responses.
- To verify internal tracking exists, run the test suite and confirm this subtest passes:
  `game factory builds per-player runtime deck state from deck registrations`.
