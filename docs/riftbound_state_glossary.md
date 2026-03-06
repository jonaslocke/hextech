# Riftbound Engine --- State Glossary

This document defines the canonical state objects used by the engine.
All state must be serializable.

------------------------------------------------------------------------

# Match

Represents a best-of series between players.

Fields:

matchId\
players\
games\
score\
winner

------------------------------------------------------------------------

# Game

Represents one game inside a match.

Fields:

gameId\
players\
turnNumber\
turnPlayerId\
phase\
step\
timingState\
battlefields\
chain\
showdown\
combat\
winner

------------------------------------------------------------------------

# Player

Represents a participant in a game.

Fields:

playerId\
legend\
championUnit\
deck\
runeDeck\
hand\
trash\
runePool\
base\
controlledBattlefields

------------------------------------------------------------------------

# Zones

Zones represent card locations.

Zones include:

Deck\
Hand\
Trash\
RuneDeck\
RunePool\
Battlefield\
ChampionZone\
Base

------------------------------------------------------------------------

# Turn

Represents the current turn.

Fields:

turnNumber\
activePlayer\
phase\
step

------------------------------------------------------------------------

# Phase

Phases include:

Channel Phase\
Action Phase\
Combat Phase\
End Phase

------------------------------------------------------------------------

# Timing State

Defines when actions may occur.

States:

Neutral Open\
Neutral Closed\
Showdown Open\
Showdown Closed

------------------------------------------------------------------------

# Priority

Priority indicates permission to perform discretionary actions.

Fields:

playerId

------------------------------------------------------------------------

# Focus

Focus indicates permission to act during a showdown.

Fields:

playerId

------------------------------------------------------------------------

# Chain

Represents the resolution stack.

Fields:

items\
controller

------------------------------------------------------------------------

# Showdown

Represents a pending battlefield conflict.

Fields:

battlefieldId\
participants\
state

------------------------------------------------------------------------

# Combat

Represents active combat resolution.

Fields:

battlefieldId\
attackers\
defenders\
damageAssignments

------------------------------------------------------------------------

# Battlefield

Represents a location where units may fight.

Fields:

battlefieldId\
controller\
units

------------------------------------------------------------------------

# Unit

Represents a unit permanent.

Fields:

cardId\
controller\
location\
might\
damage\
status

------------------------------------------------------------------------

# Rune Pool

Represents available resources for a player.

Fields:

runes
