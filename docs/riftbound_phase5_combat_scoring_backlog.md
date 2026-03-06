# Riftbound Simulator — Phase 5 Backlog (Combat & Scoring)
_Last Updated: 2026-03-06_

## Epic
**Combat Resolution and Victory Conditions**

Implement combat mechanics, scoring, and win conditions.

---

## Feature 5.1 — Combat Engine
Resolve conflicts between opposing units.

### User Stories
- **US5.1.1**: As the server, I must initiate combat when opposing units occupy a battlefield.
- **US5.1.2**: As the server, I must calculate damage assignment following combat rules.
- **US5.1.3**: As the system, I must resolve combat outcomes and apply destruction or recall.

---

## Feature 5.2 — Battlefield Control
Track battlefield ownership.

### User Stories
- **US5.2.1**: As the server, I must update battlefield control when defenders are removed.
- **US5.2.2**: As the system, I must log battlefield control changes.
- **US5.2.3**: As the engine, I must update contested status.

---

## Feature 5.3 — Scoring System
Allow players to gain points.

### User Stories
- **US5.3.1**: As the server, I must award points for holding battlefields.
- **US5.3.2**: As the server, I must support scoring from card effects.
- **US5.3.3**: As the system, I must evaluate victory conditions when scores change.