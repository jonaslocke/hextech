# Riftbound Simulator — Phase 6 Backlog (Effects Framework)
_Last Updated: 2026-03-06_

## Epic
**Extensible Effects and Rule Modifiers Framework**

Enable cards and battlefields to modify rules dynamically.

---

## Feature 6.1 — Effect Registry
Centralize effect logic.

### User Stories
- **US6.1.1**: As the server, I must register effect handlers.
- **US6.1.2**: As the engine, I must map card abilities to effect handlers.
- **US6.1.3**: As the system, I must execute effect handlers during resolution.

---

## Feature 6.2 — Runtime Parameter Modifiers
Support dynamic rule changes.

### User Stories
- **US6.2.1**: As the engine, I must allow battlefields to modify facedown capacity.
- **US6.2.2**: As the engine, I must allow effects to modify victory score target.
- **US6.2.3**: As the system, I must log all rule modifier changes.

---

## Feature 6.3 — Layer Processing
Ensure rule interactions remain deterministic.

### User Stories
- **US6.3.1**: As the engine, I must evaluate rule modifiers in deterministic order.
- **US6.3.2**: As the engine, I must handle dependency ordering between effects.
- **US6.3.3**: As the system, I must maintain timestamps for effect resolution.