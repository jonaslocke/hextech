# Riftbound Simulator --- Phase 1 Backlog (Kanban Ready)

## Goal

Deliver a **server‑authoritative core game engine** capable of running a
full match loop using **vanilla / blank cards**.

The engine must support:

-   authoritative game state
-   setup and turn order
-   phase progression
-   timing states (neutral/showdown, open/closed)
-   priority and focus passing
-   movement and battlefield contesting
-   showdown lifecycle
-   combat lifecycle
-   cleanup and end‑of‑turn processing
-   event history

This backlog is organized as **Epics → Features → User Stories**.

Stories describe **WHAT must exist**, not implementation details.

------------------------------------------------------------------------

# EPIC 1 --- Core Match and Game Foundations

## Feature 1.1 --- Match lifecycle

### US-1.1.1

As a player\
I want a match to be created with a defined format and participants\
So that the game starts from a valid competitive structure

### US-1.1.2

As a player\
I want a match to track the games belonging to it and the score between
players\
So that the overall winner of the match can be determined

### US-1.1.3

As a player\
I want the match to know when it has ended\
So that no further games or actions can occur once a winner is
determined

------------------------------------------------------------------------

## Feature 1.2 --- Game lifecycle

### US-1.2.1

As a player\
I want a game to begin from a valid setup state\
So that both players start with the required game objects and turn order

### US-1.2.2

As a player\
I want each game to maintain its own state independently from other
games in the match\
So that progress and outcomes remain accurate

### US-1.2.3

As a player\
I want the game to determine when it has ended\
So that the winner can be recorded and the match can advance correctly

------------------------------------------------------------------------

## Feature 1.3 --- Authoritative game state

### US-1.3.1

As a player\
I want the server to be the authoritative source of the game state\
So that all players share the same valid game view

### US-1.3.2

As a player\
I want actions to be accepted only when they are valid in the current
game state\
So that illegal plays cannot affect the match

### US-1.3.3

As a player\
I want accepted actions to update the authoritative game state\
So that gameplay progresses consistently for all players

------------------------------------------------------------------------

# EPIC 2 --- Player Setup, Zones, and Game Objects

## Feature 2.1 --- Player identity

### US-2.1.1

As a player\
I want each participant to have a unique identity and seat in turn
order\
So that actions and outcomes can be attributed correctly

### US-2.1.2

As a player\
I want each player to begin with the objects required to participate in
the game\
So that the game begins from a legal starting state

------------------------------------------------------------------------

## Feature 2.2 --- Zones and card locations

### US-2.2.1

As a player\
I want the game to recognize all core card locations\
So that cards always exist in a valid place

### US-2.2.2

As a player\
I want cards to move between locations according to gameplay events\
So that the board state reflects the current situation

### US-2.2.3

As a player\
I want hidden and visible areas to be distinguished correctly\
So that information is revealed only when the rules allow it

------------------------------------------------------------------------

## Feature 2.3 --- Battlefield structure

### US-2.3.1

As a player\
I want the game to establish battlefields used during the game\
So that units have valid locations to contest

### US-2.3.2

As a player\
I want battlefield control and contesting to be tracked\
So that scoring and conflicts can be resolved

------------------------------------------------------------------------

## Feature 2.4 --- Phase 1 validation cards

### US-2.4.1

As a product team\
I want the engine to operate with blank or vanilla cards\
So that the rules engine can be validated before implementing card
abilities

### US-2.4.2

As a product team\
I want these validation cards to respect the baseline rules of the game\
So that the engine can be tested under realistic gameplay flow

------------------------------------------------------------------------

# EPIC 3 --- Turn Structure and Timing

## Feature 3.1 --- Turn ownership

### US-3.1.1

As a player\
I want the game to know whose turn it is\
So that actions are validated correctly

### US-3.1.2

As a player\
I want turn ownership to transfer only at the correct end‑of‑turn point\
So that the turn sequence remains valid

------------------------------------------------------------------------

## Feature 3.2 --- Phase progression

### US-3.2.1

As a player\
I want each turn to progress through the defined phases and steps\
So that gameplay follows the official sequence

### US-3.2.2

As a player\
I want the current phase and step to be represented in the game state\
So that legal actions can be determined from timing

### US-3.2.3

As a player\
I want a phase to end only when its rules conditions are satisfied\
So that timing windows are respected

------------------------------------------------------------------------

## Feature 3.3 --- Timing states

### US-3.3.1

As a player\
I want the game to distinguish between neutral and showdown timing\
So that the correct actions become available

### US-3.3.2

As a player\
I want the game to distinguish between open and closed timing\
So that response windows are enforced

### US-3.3.3

As a player\
I want timing state transitions to occur automatically\
So that legality always reflects the current situation

------------------------------------------------------------------------

# EPIC 4 --- Priority and Focus

## Feature 4.1 --- Priority control

### US-4.1.1

As a player\
I want the game to know which player has priority\
So that discretionary actions are validated correctly

### US-4.1.2

As a player\
I want priority to pass according to the rules of the current timing
state\
So that turn flow remains correct

### US-4.1.3

As a player\
I want the game to prevent actions when no player has priority\
So that invalid actions cannot occur

------------------------------------------------------------------------

## Feature 4.2 --- Focus during showdowns

### US-4.2.1

As a player\
I want the game to know which player has focus during a showdown\
So that showdown actions are assigned correctly

### US-4.2.2

As a player\
I want focus to pass between players during a showdown\
So that both players receive their action opportunities

### US-4.2.3

As a player\
I want focus and priority interactions to remain consistent\
So that showdown play remains valid

------------------------------------------------------------------------

# EPIC 5 --- Movement and Battlefield Contesting

## Feature 5.1 --- Unit movement

### US-5.1.1

As a player\
I want units to move only when movement is valid\
So that battlefield state remains legal

### US-5.1.2

As a player\
I want movement to update battlefield presence\
So that conflicts and control are evaluated correctly

------------------------------------------------------------------------

## Feature 5.2 --- Battlefield contesting

### US-5.2.1

As a player\
I want the game to detect when a battlefield becomes contested\
So that conflict resolution begins

### US-5.2.2

As a player\
I want contested and uncontrolled battlefields to be distinguished\
So that the correct showdown flow begins

------------------------------------------------------------------------

## Feature 5.3 --- Showdown entry

### US-5.3.1

As a player\
I want a showdown to open when the rules require it\
So that action windows occur correctly

### US-5.3.2

As a player\
I want the game to track when a showdown is active and when it ends\
So that timing states transition correctly

------------------------------------------------------------------------

# EPIC 6 --- Chain and Action Resolution

## Feature 6.1 --- Chain presence

### US-6.1.1

As a player\
I want the game to know when a chain exists\
So that the game enters the correct timing state

### US-6.1.2

As a player\
I want the game to detect when no more items can be added to the chain\
So that resolution begins

------------------------------------------------------------------------

## Feature 6.2 --- Chain resolution

### US-6.2.1

As a player\
I want chain items to resolve in the correct order\
So that outcomes match the rules

### US-6.2.2

As a player\
I want resolved items to leave the chain and enter their post‑resolution
state\
So that the game state remains accurate

### US-6.2.3

As a player\
I want the chain to resolve completely before returning to the next
timing state\
So that gameplay continues correctly

------------------------------------------------------------------------

# EPIC 7 --- Combat Lifecycle

## Feature 7.1 --- Combat initiation

### US-7.1.1

As a player\
I want combat to begin when opposing units share a battlefield\
So that conflicts resolve correctly

### US-7.1.2

As a player\
I want the game to identify the participants of a combat\
So that actions are limited to the correct players

------------------------------------------------------------------------

## Feature 7.2 --- Combat state tracking

### US-7.2.1

As a player\
I want combat to be represented explicitly in the game state\
So that combat‑specific rules can apply

### US-7.2.2

As a player\
I want combat to include its required showdown window\
So that both players may act before resolution

------------------------------------------------------------------------

## Feature 7.3 --- Combat completion

### US-7.3.1

As a player\
I want combat to end only after its required steps and outcomes\
So that battlefield state remains correct

### US-7.3.2

As a player\
I want the game to transition to the correct next state after combat
ends\
So that turn progression continues

------------------------------------------------------------------------

# EPIC 8 --- Cleanup and End of Turn

## Feature 8.1 --- Cleanup execution

### US-8.1.1

As a player\
I want cleanup to occur whenever the rules require it\
So that invalid states are corrected

### US-8.1.2

As a player\
I want lethal damage and other mandatory state corrections applied
during cleanup\
So that the board remains valid

### US-8.1.3

As a player\
I want temporary combat statuses removed during cleanup\
So that future actions use correct unit state

------------------------------------------------------------------------

## Feature 8.2 --- End of turn expiration

### US-8.2.1

As a player\
I want turn‑limited effects and damage to expire at the correct time\
So that the next turn begins from a valid state

### US-8.2.2

As a player\
I want rune pools and resources to clear correctly at the end of the
turn\
So that resources do not carry over incorrectly

### US-8.2.3

As a player\
I want expiration processing to repeat if required by the rules\
So that all effects resolve before the next turn begins

------------------------------------------------------------------------

# EPIC 9 --- Game History and Phase 1 Validation

## Feature 9.1 --- Action history

### US-9.1.1

As a player\
I want accepted game actions to be recorded in chronological order\
So that the game can be reconstructed

### US-9.1.2

As a product team\
I want rejected actions to be distinguishable from accepted ones\
So that invalid attempts can be diagnosed

------------------------------------------------------------------------

## Feature 9.2 --- Game observability

### US-9.2.1

As a player\
I want the current phase, timing state, priority holder, and active
conflicts to be visible\
So that the gameplay context is clear

### US-9.2.2

As a product team\
I want key state transitions to be identifiable from the event history\
So that engine behavior can be validated

------------------------------------------------------------------------

## Feature 9.3 --- Phase 1 scenario coverage

### US-9.3.1

As a product team\
I want the Phase 1 engine to support validation of setup, turn flow,
movement, showdown, combat, cleanup, and turn transitions\
So that the core gameplay loop is proven

### US-9.3.2

As a product team\
I want Phase 1 to be validated with realistic rule‑driven scenarios\
So that later phases can build on a trusted rules foundation
