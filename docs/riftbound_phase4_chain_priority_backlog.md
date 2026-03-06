# Riftbound Simulator — Phase 4 Backlog (Chain, Priority & Focus)
_Last Updated: 2026-03-06_

## Epic
**Chain Resolution and Player Interaction System**

Implement the chain system, priority handling, and focus mechanics necessary for interactive gameplay.

---

## Feature 4.1 — Chain System
Enable card plays and abilities to resolve using the chain.

### User Stories
- **US4.1.1**: As the server, I must create a chain when an ability or card is played.
- **US4.1.2**: As the server, I must add items to the chain in LIFO order.
- **US4.1.3**: As the server, I must resolve chain items sequentially.

---

## Feature 4.2 — Priority System
Ensure players take turns responding.

### User Stories
- **US4.2.1**: As the server, I must grant priority to the correct player after actions.
- **US4.2.2**: As a player, I must be able to pass priority.
- **US4.2.3**: As the system, I must detect when both players pass to close the chain.

---

## Feature 4.3 — Focus System
Handle showdown interactions.

### User Stories
- **US4.3.1**: As the server, I must assign focus when a showdown begins.
- **US4.3.2**: As a player, I must be able to pass focus.
- **US4.3.3**: As the system, I must determine when a showdown ends.