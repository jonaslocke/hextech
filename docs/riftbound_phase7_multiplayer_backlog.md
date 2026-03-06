# Riftbound Simulator — Phase 7 Backlog (Multiplayer Integration)
_Last Updated: 2026-03-06_

## Epic
**Direct Connect Multiplayer Gameplay**

Enable multiple clients to interact with a shared match state.

---

## Feature 7.1 — Intent Networking
Transmit player intents to the server.

### User Stories
- **US7.1.1**: As a client, I must send intents to the server.
- **US7.1.2**: As the server, I must validate intents before applying them.
- **US7.1.3**: As the system, I must broadcast resulting events.

---

## Feature 7.2 — Event Streaming
Deliver events to clients in real time.

### User Stories
- **US7.2.1**: As the server, I must stream events via SSE or WebSocket.
- **US7.2.2**: As the client, I must consume events and update UI.
- **US7.2.3**: As the system, I must support reconnect from a given event index.

---

## Feature 7.3 — Reconnection Handling
Allow players to reconnect safely.

### User Stories
- **US7.3.1**: As the server, I must allow clients to request missed events.
- **US7.3.2**: As the client, I must rebuild state after reconnection.
- **US7.3.3**: As the system, I must ensure replay consistency.