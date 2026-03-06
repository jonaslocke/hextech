# Riftbound Simulator — Phase 3 Backlog (Core Actions & Cleanup)
_Last Updated: 2026-03-06_

## Epic
**Core Actions and Cleanup Loop**

Implement fundamental gameplay actions and the cleanup engine responsible for triggering combat and resolving board state.

---

## Feature 3.1 — Basic Actions
Support fundamental gameplay actions.

### User Stories
- **US3.1.1**: As a player, I want to move a unit between locations if the rules permit.
- **US3.1.2**: As a player, I want to hide a card at a battlefield I control.
- **US3.1.3**: As the server, I must validate that actions occur during valid timing windows.

---

## Feature 3.2 — Action Logging
Ensure all actions are represented as events.

### User Stories
- **US3.2.1**: As the server, I must log each zone movement event.
- **US3.2.2**: As the server, I must log hidden card placement events.
- **US3.2.3**: As the system, I must ensure events remain ordered and immutable.

---

## Feature 3.3 — Cleanup Engine
Cleanup must run after relevant actions to evaluate board state.

### User Stories
- **US3.3.1**: As the server, I must detect lethal damage and destroy affected objects.
- **US3.3.2**: As the server, I must remove hidden cards when control conditions are no longer satisfied.
- **US3.3.3**: As the server, I must determine if combat or showdown should begin after cleanup.