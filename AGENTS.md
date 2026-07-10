# Project Instructions

## Mission and current phase

This repository is for a solo tavern-management, relationship-sim, and text-adventure game. The current milestone is a maintained, production-grade React + TypeScript game-development harness whose first loaded Story is a non-canonical seven-day PoC. Gameplay and balance are provisional; architecture, tests, diagnostics, content contracts, and code quality are durable. Do not start Unity work or scaled formal content production until the PoC gate in `docs/poc/poc-charter.md` is passed.

## Sources of truth

Read these before changing behavior:

1. `docs/superpowers/specs/2026-07-10-react-game-harness-design.md` — authoritative Harness, StoryPackage, UI, save/debug, build, test, and asset boundaries.
2. `docs/poc/poc-charter.md` — first Story scope and acceptance gates.
3. `docs/poc/simulation-rules.md` — seven-day state transitions and settlement semantics.
4. `docs/poc/balance-v0.md` — tunable seven-day values and formulas.
5. `docs/poc/content-and-playtest.md` — fixed seven-day scenario and strategy matrix.
6. `docs/poc/reference-strategies.md` — deterministic reference inputs.
7. `docs/design/game-design-baseline.md` — long-term product direction.
8. `docs/art/first-web-visual-pack.md` — provisional Web visual language, Image Gen asset IDs, safe zones, provenance, and acceptance.

Authority is domain-specific: the Harness design governs technical architecture; the PoC documents govern the seven-day gameplay and numbers inside those interfaces; the visual-pack document governs provisional Web art direction and asset contracts. Record intentional changes in the relevant authoritative document in the same change as the code.

## Scope constraints

- Keep the PoC to one non-canonical seven-day week.
- No backend, accounts, network runtime, analytics service, or runtime LLM.
- No real-time exploration, combat, equipment, minigames, scheduling sandbox, free-form decoration, formal 3D, character creator, Mod SDK, or adult content.
- The heroine is the only relationship focus. The helper is a background automation tool, not a story route.
- Use only the minimal Auras listed by the PoC spec. Do not build a general rules language or arbitrary callback registry.
- Do not add features merely because the long-term design mentions them.
- A small coherent web visual pack is allowed; final-scale art/audio production is not.
- Image Gen UI mockups are design references only. Runtime controls, text, HUD, focus states, and small symbols remain code-native; commercial screenshots and `references/` are never generation inputs.

## Architecture constraints

- The simulation core owns all saveable state and must not import React, DOM, browser storage, renderer types, or a concrete Story.
- UI sends typed commands and renders returned state/facts; it must not mutate `GameState` directly.
- One command dispatcher and one phase-advance path own state transitions.
- Randomness must use the serializable project PRNG. Never use `Math.random()` in simulation code.
- Save plain versioned data and stable IDs, never component instances or rule functions.
- Story content and balance are inert, validated IR/data. Executable Story code is allowed only in the `rules` facet and only by implementing named engine-owned, synchronous, deterministic interfaces.
- Keep content effects to a small, code-owned discriminated union. No `eval`, reflection, arbitrary expressions, script strings, or content-node callbacks.
- Story rules receive deep-readonly inputs and engine RNG capabilities and return validated effect intents; they must not mutate state or call UI/storage/network/time globals.
- Player UI uses the central stage and in-stage overlays. Left/right sidebars are developer-only, toggleable surfaces.
- Save/Quick Save use IndexedDB through the persistence facade. Diagnostics remain outside `GameState`.
- Invalid commands return structured rejection reasons without partially mutating state.

## Quality and workflow

- Treat Harness code as production code. Prefer TDD for simulation rules: failing focused test, minimal implementation, focused pass, then broader verification.
- Maintain deterministic golden-week tests for named strategies.
- Any balance change must update the expected strategy results or explain why the invariant remains unchanged.
- Keep files focused and interfaces explicit. Enforce import boundaries and cycles in CI. Avoid a global mutable store, generic event bus, ECS, CQRS, or event sourcing for this PoC.
- Use pnpm with a frozen lockfile and the repository's pinned Node version. `pnpm verify` is the full non-interactive local/CI verification entrypoint once scaffolded.
- Use Chinese for player-facing/design prose and English for identifiers unless a document states otherwise.

## Reference-code boundary

`references/` is local-only and ignored by Git. Every item must be recorded in `docs/research/reference-register.md`; a root license never proves that every bundled tool, translation, image, or add-on has identical terms. Reference material may be inspected for general ideas such as time ownership, save metadata, debugging tools, and content organization, but its code, story text, assets, schemas, constants, and distinctive data structures must not be copied or adapted into this repository.

This is an independent-reimplementation and contamination-control policy, not a personnel-isolated clean-room process. Implementation must be derived from this project's own `docs/poc/` specifications and tests. Production source, build scripts, tests, fixtures, and code generation must never import, scan, copy, bundle, or otherwise depend on `references/`. Research notes are non-normative and must not be used as implementation templates.

## Generated and local files

Do not commit dependency folders, build output, coverage, local saves, diagnostics, generated exports, secrets, reference repositories, IDE-local state, or Unity-generated folders. Extend `.gitignore` when new tooling introduces additional generated files.
