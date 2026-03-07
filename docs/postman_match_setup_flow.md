# Postman Setup Flow: Create Match -> `ready`

This guide shows the exact HTTP requests to move a match from creation to `ready`.

## 1. Preconditions

1. Start the API server:

```bash
npm start
```

2. Create a Postman environment with:
- `base_url` = `http://localhost:3000/api`
- `match_id` = (empty)
- `chooser_id` = (empty)

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
- `data.startingPlayerId = null`
- `data.startingPlayerChooserId` is `"p1"` or `"p2"`

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
- `data.chosenChampionByPlayer.p1 = "Ahri, Inquisitive"`
- `data.status` still `setup_pending`

## 5. Select Chosen Champion (p2)

`POST {{base_url}}/matches/{{match_id}}/setup/champion`

```json
{
  "playerId": "p2"
}
```

Expected:
- `data.chosenChampionByPlayer.p2 = "Ahri, Inquisitive"`

## 6. Select Battlefield (p1)

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p1",
  "battlefield": "Fortified Position"
}
```

Expected:
- `data.selectedBattlefieldsByPlayer.p1 = "Fortified Position"`

## 7. Select Battlefield (p2)

`POST {{base_url}}/matches/{{match_id}}/setup/battlefield`

```json
{
  "playerId": "p2",
  "battlefield": "Grove of the God-Willow"
}
```

Expected:
- `data.selectedBattlefieldsByPlayer.p2 = "Grove of the God-Willow"`

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
- `data.startingPlayerId = "p1"`
- `data.status = "ready"`

## 9. Verify Final Match State

`GET {{base_url}}/matches/{{match_id}}`

Expected:
- `data.status = "ready"`
- `data.chosenChampionByPlayer.p1` and `data.chosenChampionByPlayer.p2` are filled
- `data.selectedBattlefieldsByPlayer.p1` and `data.selectedBattlefieldsByPlayer.p2` are filled
- `data.startingPlayerId` is filled

---

## Notes

- Do not send `selectedBattlefieldsByPlayer` in `POST /matches`; it is rejected.
- Setup intents are one-shot per player per setup step.
- For `best-of-1`, use the same `/setup/battlefield` endpoint, but battlefield is randomly resolved by the server.
