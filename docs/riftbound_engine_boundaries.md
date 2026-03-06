# Riftbound Engine --- Engine Boundaries

This document defines the separation of responsibilities between:

1.  Game Engine
2.  Match Server
3.  Card Runtime
4.  Web Client

Maintaining this separation is critical for correctness and
maintainability.

------------------------------------------------------------------------

# 1. Game Engine

The engine is the authoritative implementation of the rules.

The engine must be:

-   deterministic
-   replayable
-   pure logic
-   independent of transport and UI

## Engine Responsibilities

Game lifecycle:

-   game setup
-   mulligan
-   turn order

Turn controller:

-   phase progression
-   step transitions

Timing states:

-   neutral open
-   neutral closed
-   showdown open
-   showdown closed

Priority system:

-   determine who may act
-   determine relevant players

Focus system:

-   grant focus during showdowns

Movement:

-   validate unit moves
-   detect battlefield contesting

Showdown lifecycle:

-   open showdown
-   pass focus
-   resolve chain

Combat:

-   determine attackers
-   determine defenders
-   resolve combat damage

Cleanup:

-   lethal damage checks
-   unit destruction
-   effect expiration

State-based effects:

-   detect illegal states
-   enforce rule corrections

------------------------------------------------------------------------

# 2. Match Server

The server orchestrates matches and persists logs.

Responsibilities:

-   player sessions
-   match creation
-   best-of-three structure
-   WebSocket communication
-   persistence
-   reconnection

The server must not implement rules. It only calls the engine.

------------------------------------------------------------------------

# 3. Card Runtime

Card runtime interprets card text.

Responsibilities:

-   ability definitions
-   keyword handling
-   targeting
-   triggered abilities
-   effect resolution

Card logic may override rules through the Golden Rule.

------------------------------------------------------------------------

# 4. Web Client

The client is only responsible for:

-   rendering state
-   sending player intent
-   animating outcomes

The client must never:

-   determine legality
-   resolve combat
-   resolve effects
-   mutate authoritative state

------------------------------------------------------------------------

# 5. Event Log

All matches must generate an ordered event log.

This allows:

-   replay
-   debugging
-   spectator mode
-   desync detection

The event log must allow reconstruction of the game state.
