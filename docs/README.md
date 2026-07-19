# Project documentation

Active documentation describes the code and decisions maintained after the first PoC Goal. Update it alongside implementation changes; do not use old milestone plans as hidden authority.

## SillyMaker engine

- [Architecture](engine/architecture.md) — packages, ownership, data flow, runtime, persistence, and extension boundaries.
- [Features](engine/features.md) — implemented authoring, runtime, UI, Web, diagnostics, and tooling capabilities.
- [Development](engine/development.md) — setup, repository layout, testing policy, and maintenance workflow.
- [Story authoring](engine/story-authoring.md) — composing a Story from gameplay and presentation facets.
- [Build and release](engine/build-and-release.md) — development server, Player build, local Artifact, and smoke verification.
- [Typed StateStore proposal](engine/proposals/typed-state-store.md) — a non-binding option for the next state-management design.

## Project Tavern

- [Gameplay redesign status](game/README.md) — current product intent and what is deliberately open for redesign.

New game-design documents should be added under `docs/game/` and linked from that page. The implementation is the best description of current behavior until a replacement design is accepted.

## Durable policies and research

- [Licensing](policies/licensing.md)
- [Assets, AIGC, third-party material, and local references](policies/assets-and-references.md)
- [Reference register](research/reference-register.md)
- [Existing reference-study notes](research/degrees-of-lewdity-notes.md)

Root legal files remain controlling when a summary conflicts with them.

## Historical material

The [first PoC Goal archive](archive/2026-07-first-poc-goal/README.md) contains the former Goal, plans, specifications, runbooks, PoC rules, balance documents, and design baselines. It is intentionally non-authoritative and is not part of normal development navigation.
