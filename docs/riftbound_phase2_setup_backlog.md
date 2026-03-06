# Riftbound Simulator — Phase 2 Backlog (Setup System)
_Last Updated: 2026-03-06_

## Epic
**Setup System Implementation**

Enable the server to initialize a game from provided deck inputs, perform shuffles and draws, handle mulligan decisions, and enforce battlefield selection rules for Best-of-Three matches while logging all outcomes.

---

## Feature 2.1 — Deck Input Loader
Allow the server to start a game using predefined decklists.

### User Stories
- **US2.1.1**: As the server, I must load decklists from input references so a game can be initialized.
- **US2.1.2**: As the server, I must create card instances for each card in the deck so they can move through zones.
- **US2.1.3**: As the system, I must register rune decks separately from main decks so their rules can be applied.

---

## Feature 2.2 — Shuffle & Draw Logging
Ensure all hidden outcomes are logged explicitly.

### User Stories
- **US2.2.1**: As the server, I must shuffle a player's deck and log the resulting order in private payload.
- **US2.2.2**: As the server, I must log card draws including the private card identities.
- **US2.2.3**: As the system, I must reveal only card counts publicly while hiding identities from opponents.

---

## Feature 2.3 — Mulligan Procedure
Allow players to perform mulligans during setup.

### User Stories
- **US2.3.1**: As the server, I must record mulligan decisions in the event log.
- **US2.3.2**: As the server, I must recycle set-aside cards into the deck according to rules.
- **US2.3.3**: As the system, I must ensure mulligan steps occur in the correct order.

---

## Feature 2.4 — Battlefield Selection (Bo3)
Enforce match constraints for battlefield selection.

### User Stories
- **US2.4.1**: As a player, I must select one battlefield from my roster to start a game.
- **US2.4.2**: As the server, I must reject battlefield selections already used earlier in the match.
- **US2.4.3**: As the server, I must log battlefield selections as match events.