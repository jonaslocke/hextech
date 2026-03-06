# Riftbound Engine --- Rules Index

Source: Riftbound Core Rules (2025-06-02)

This document maps rule sections from the official rules into engine
domains. The goal is to determine where each rule belongs in the
simulator architecture.

------------------------------------------------------------------------

# 1. Core Rules Hierarchy

## Golden Rule

Card text overrides rules text.

Engine implication: - Rules are default behavior - Card abilities
override rule handlers

## Silver Rule

Card terminology must follow rule definitions.

Engine implication: - Card logic must use the canonical rules
vocabulary.

------------------------------------------------------------------------

# 2. Game Concepts

Defines the primary structural objects of the game.

Core entities:

-   Player
-   Game
-   Match
-   Deck
-   Rune Deck
-   Champion
-   Battlefields

Engine modules affected:

-   Game setup
-   Deck validation
-   Zone management
-   Resource system

------------------------------------------------------------------------

# 3. Deck Construction

Requirements include:

-   1 Champion Legend
-   1 Chosen Champion Unit
-   Main Deck ≥ 40 cards
-   Rune Deck
-   Battlefields (mode dependent)

Engine modules affected:

-   Deck validator
-   Match creation
-   Game setup

------------------------------------------------------------------------

# 4. Zones

Zones include:

-   Deck
-   Hand
-   Trash
-   Rune Deck
-   Rune Pool
-   Battlefield
-   Champion Zone
-   Base

Engine modules affected:

-   State model
-   Card movement system
-   Visibility rules

------------------------------------------------------------------------

# 5. Turn Structure

Each turn consists of phases and steps.

Major components:

1.  Channel Phase
2.  Action Phase
3.  Combat Phase
4.  End Phase

Engine modules affected:

-   Turn state machine
-   Resource system
-   Priority handling

------------------------------------------------------------------------

# 6. Game States

The rules define four timing states:

Neutral Open\
Neutral Closed\
Showdown Open\
Showdown Closed

Engine modules affected:

-   Priority
-   Focus
-   Chain creation
-   Showdown handling

------------------------------------------------------------------------

# 7. Priority and Focus

Priority: permission to take discretionary actions.

Focus: permission to act during a showdown.

Important property:

A player with focus also has priority.

Engine modules affected:

-   Turn controller
-   Action validation
-   Player sequencing

------------------------------------------------------------------------

# 8. Chain

The chain resolves actions in LIFO order.

Lifecycle:

1.  Add item
2.  Players receive priority
3.  Players pass
4.  Resolve item
5.  Repeat

Engine modules affected:

-   Ability resolution
-   Trigger system
-   Reaction system

------------------------------------------------------------------------

# 9. Movement

Units may perform a Standard Move.

Movement may:

-   Contest battlefields
-   Trigger showdown
-   Trigger combat

Engine modules affected:

-   Battlefield system
-   Unit controller

------------------------------------------------------------------------

# 10. Showdown

Occurs when:

-   A player moves into an empty battlefield
-   Combat is about to begin

Engine modules affected:

-   Focus engine
-   Chain lifecycle

------------------------------------------------------------------------

# 11. Combat

Combat includes:

-   Attacker/Defender determination
-   Damage resolution
-   Cleanup

Engine modules affected:

-   Combat engine
-   Unit lifecycle

------------------------------------------------------------------------

# 12. Cleanup

Cleanup occurs after:

-   Chain resolution
-   Combat
-   Movement
-   End step

Engine modules affected:

-   State-based checks
-   Lethal damage
-   Trigger validation

------------------------------------------------------------------------

# 13. Resources and Runes

Rune system manages resources.

Rules include:

-   Channeling
-   Rune pool
-   Burn out

Engine modules affected:

-   Resource engine

------------------------------------------------------------------------

# 14. Card Types

Types defined:

-   Unit
-   Gear
-   Spell
-   Rune
-   Battlefield
-   Legend

Engine modules affected:

-   Card runtime
-   Play pipeline

------------------------------------------------------------------------

# 15. Win Conditions

Defined through battlefield control and game progression.

Engine modules affected:

-   Game end detection
-   Match scoring
