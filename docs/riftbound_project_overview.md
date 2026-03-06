
# Riftbound Simulator – Project Overview (Agent-Oriented Documentation)

## 1. Project Purpose

This project aims to build a **server‑authoritative simulator engine** for the *Riftbound Trading Card Game*.

The goal is **not to build a full game client**, but instead to implement a **deterministic, rules‑correct simulation engine** capable of executing Riftbound matches programmatically.

The simulator will:

- Execute Riftbound matches according to the official rules.
- Maintain a canonical game state.
- Receive player intents.
- Validate those intents against the rules.
- Apply the resulting state transitions.
- Produce a complete match log.

This engine will serve as the **foundation for multiple future use cases**, including:

- Multiplayer clients
- AI agents
- Match replay systems
- Deck testing tools
- Game state debugging
- Automated rules validation


---

# 2. Core Design Philosophy

The system follows a **server‑authoritative architecture**.

Key principles:

1. **The server owns the game state**
2. **Clients never modify state directly**
3. **Clients only send player intentions**
4. **The engine validates and executes actions**
5. **Every action generates an event**
6. **Every event updates the canonical state**
7. **All actions are logged**

This guarantees:

- deterministic gameplay
- reproducible matches
- replay capability
- multiplayer integrity


---

# 3. What We Are Building

The project builds **four main capabilities**.

## 3.1 Game State Engine

A deterministic simulation engine that maintains the full state of a Riftbound game.

Responsibilities:

- maintain all zones
- maintain turn order
- manage phases
- track card states
- resolve abilities
- resolve spells
- manage combat / showdown resolution
- enforce rules


## 3.2 Intent Processing System

Players do **not send actions**.

Players send **intents**.

Example intents:

- PlayCard
- ActivateAbility
- Attack
- PassPriority
- Mulligan
- SelectTarget

The engine must:

1. validate the intent
2. verify legality
3. transform the intent into game events
4. apply those events to the state


## 3.3 Event System

All state changes occur through **events**.

Examples:

- CardPlayed
- DamageApplied
- UnitDestroyed
- RuneChanneled
- PhaseAdvanced

Events:

- mutate the state
- are appended to the match log
- allow deterministic replay


## 3.4 Match Log

Every match generates a **complete chronological log**.

This enables:

- match replay
- debugging
- multiplayer synchronization
- analytics
- AI training


---

# 4. Scope of Phase 1

Phase 1 focuses on building the **minimal playable engine**.

Objectives:

1. Implement the core game state structure
2. Implement turn progression
3. Implement zones
4. Implement card play
5. implement damage resolution
6. implement basic combat/showdown
7. implement event logging
8. support deterministic match replay


Phase 1 does **NOT include**:

- UI implementation
- networking
- matchmaking
- persistence database
- deck builders
- AI players


---

# 5. Game Model Foundations

The simulator must model core Riftbound concepts defined in the rules.

A Riftbound game consists of:

- Players
- Decks
- Champion Legend
- Battlefields
- Main Deck
- Rune Deck

Players bring:

- 1 Champion Legend
- 1 Main Deck (≥40 cards)
- 1 Rune Deck (12 runes)
- Battlefields

These elements form the **initial state of the game**.

The official rules specify that Riftbound is a trading card game where players provide their own cards and decks to compete against opponents.


---

# 6. Game Objects

The engine must represent **Game Objects**.

Examples include:

- Cards
- Runes
- Units
- Legends
- Battlefields
- Tokens
- Abilities
- Effects
- Buffs

Game Objects are entities capable of producing **Game Effects** or enabling **Game Actions**.

The simulation engine must support these objects and their interactions.


---

# 7. Zones

Cards exist within **zones**.

Examples:

- Deck
- Hand
- Board
- Trash
- Rune Pool
- Champion Zone
- Battlefield Zone

The engine must enforce zone transitions and visibility rules.


---

# 8. Turn System

The engine must support:

- Turn order
- Phases
- Priority windows
- Open / Closed game states

Gameplay proceeds through repeating turns until the victory condition is met.


---

# 9. Determinism Requirement

The engine must produce **deterministic outcomes**.

This means:

- identical inputs produce identical matches
- RNG must be seeded
- every action must be logged


This property enables:

- replay
- debugging
- AI simulation
- tournament integrity


---

# 10. Match Replay

Because all actions are logged, the engine must support:

```
initial_state + event_log → deterministic replay
```

This allows reconstruction of any match from its log.


---

# 11. Separation of Concerns

The project strictly separates:

| Layer | Responsibility |
|------|----------------|
| Engine | Game rules and state |
| API | Communication |
| Client | Rendering |
| AI | Decision making |

The **engine must never depend on UI or networking**.


---

# 12. Future Extensions

After Phase 1, the simulator can support:

- multiplayer servers
- spectator systems
- replay viewers
- deck testing
- AI agents
- tournament systems


---

# 13. Summary

This project builds a **deterministic Riftbound simulation engine** that:

- enforces official game rules
- processes player intents
- mutates game state through events
- logs every action
- supports replay and multiplayer foundations


The engine is the **core infrastructure** upon which all Riftbound digital tooling can be built.
