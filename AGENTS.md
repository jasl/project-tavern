# Project Instructions

## Mission and current phase

This repository is for a solo tavern-management, relationship-sim, and text-adventure game. The current milestone is a maintained, production-grade React + TypeScript game-development harness whose first loaded Story is a non-canonical seven-day PoC. Gameplay and balance are provisional; architecture, tests, diagnostics, content contracts, and code quality are durable. Do not start Unity work or scaled formal content production until the PoC gate in `docs/poc/poc-charter.md` is passed.

## Sources of truth

Read these before changing behavior:

1. `docs/superpowers/specs/2026-07-10-react-game-harness-design.md` — authoritative Harness, StoryPackage, UI, save/debug, build, test, and asset boundaries.
2. `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md` — field-level v1 ABI for Snapshot, commands, DomainFacts, rules, Story data, Save, DebugBundle, and strict import.
3. `docs/poc/poc-charter.md` — first Story scope and acceptance gates.
4. `docs/poc/simulation-rules.md` — seven-day state transitions and settlement semantics.
5. `docs/poc/balance-v0.md` — tunable seven-day values and formulas.
6. `docs/poc/content-and-playtest.md` — fixed seven-day scenario and strategy matrix.
7. `docs/poc/reference-strategies.md` — deterministic reference inputs.
8. `docs/design/game-design-baseline.md` — long-term product direction.
9. `docs/art/first-web-visual-pack.md` — provisional Web visual language, Image Gen asset IDs, safe zones, provenance, and acceptance.

Authority is domain-specific: the Harness design governs technical architecture; the Contract Catalog freezes its field-level ABI; the PoC documents govern the seven-day gameplay and numbers inside those interfaces; the visual-pack document governs provisional Web art direction and asset contracts. Record intentional changes in the relevant authoritative document in the same change as the code.

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
- UI sends typed commands/persistence operations and renders immutable Runtime ViewModels/projections. It never imports or receives `GameSnapshot`/`GameState`; transient `DomainFact` values are consumed by Runtime projection/diagnostics, not exposed as a second UI state API.
- A neutral build-time `GameProfile` statically composes named modules. Modules own exact state paths; v1 has no direct Module-to-Module read edges, and only the single `CommandCoordinator` combines public read ports with owner-scoped proposal/apply capabilities. `calendar.advance_phase` is the sole time command, but it is not a second cross-module orchestrator. Do not add runtime module registration, callbacks, or dynamic Profile selection.
- `EventId` is Scheduler-only. Player-invoked StoryAction, Facility opportunity, and WorldAction entries use stable `ActionId` values and typed commands; never add a no-op Event merely to reuse an Action name.
- Randomness must use the serializable project PRNG. Never use `Math.random()` in simulation code.
- Save plain versioned data and stable IDs, never component instances or rule functions. Ordinary Save/Quick/Auto/Manual load requires exact `(story.id, story.revision, story.digest, engine.digest)` compatibility; `engine.version` and `appBuildId` are display/diagnostic only. Only Developer DebugBundle tools may perform clearly labeled best-effort inspection/replay, never write it back as a compatible Save.
- Story content and balance are inert, validated IR/data. Executable Story code is allowed only in the `rules` facet and only by implementing named engine-owned, synchronous, deterministic interfaces.
- Keep content effects to a small, code-owned discriminated union. No `eval`, reflection, arbitrary expressions, script strings, or content-node callbacks.
- Story rules receive deep-readonly inputs and engine RNG capabilities and return validated effect intents; they must not mutate state or call UI/storage/network/time globals.
- Player UI uses the central stage and in-stage overlays. Left/right sidebars are developer-only, toggleable surfaces.
- Save/Quick Save use IndexedDB through the persistence facade. Diagnostics remain outside `GameState`.
- Invalid commands return structured rejection reasons without partially mutating state.
- `GameSnapshot` is authoritative; bounded `CommandLog` and emitted `DomainFact` values are diagnostic/non-authoritative and must never be reapplied as state.
- One EngineSession FIFO serializes every authoritative operation: Game dispatch, exact Save load/import, start/restart, replayable DebugCommand, and fixture anchor. Entry marks the Session busy synchronously; no Runtime service or UI may receive a direct Snapshot setter. Every successful replacement atomically establishes a new replay base and clears the old CommandLog.
- Replayable DebugCommand semantics and validation live in `src/engine/debug/` and enter `engineDigest`; admitted committed and faulted attempts both enter CommandLog, while validation failures never do. `debug.fixture.load` resolves only active-Story fixtures and establishes an anchor rather than a replayable log entry.
- Asset provenance is strict-schema data. Only project-owned archived candidates are eligible for reviewed image-input reuse; non-empty `inputAssets` require an approved `inputUseReview`. Commercial material and `references/` remain categorically forbidden as generation inputs.

## Quality and workflow

- Treat Harness code as production code. Prefer TDD for simulation rules: failing focused test, minimal implementation, focused pass, then broader verification.
- Maintain deterministic golden-week tests for named strategies.
- Any balance change must update the expected strategy results or explain why the invariant remains unchanged.
- Keep files focused and interfaces explicit. Enforce import boundaries and cycles in CI. Avoid a global mutable store, generic event bus, ECS, CQRS, or event sourcing for this PoC.
- Use pnpm with a frozen lockfile and the repository's pinned Node version. `pnpm verify` is the full non-interactive local/CI verification entrypoint once scaffolded.
- TypeScript 7.0.2 `tsc` is authoritative. The package named `typescript` is intentionally the official TS6 compatibility API for `typescript-eslint`; do not “simplify” the aliases, run `tsc6` as project typecheck, or import the Compiler API from project code.
- `engine.version` comes only from Application-owned build metadata and never enters the Engine root. Run `pnpm toolchain:verify` after toolchain changes.
- Tracked persistence fixtures are provenance-bound. Any Story or Engine digest input change must explicitly run `pnpm fixtures:persistence:generate`, review all fixture diffs, then run the read-only `pnpm fixtures:persistence:verify`; ordinary tests and CI never regenerate them.
- Use Chinese for player-facing/design prose and English for identifiers unless a document states otherwise.

## Reference-code boundary

`references/` is local-only and ignored by Git. Every item must be recorded in `docs/research/reference-register.md`; a root license never proves that every bundled tool, translation, image, or add-on has identical terms. Reference material may be inspected for general ideas such as time ownership, save metadata, debugging tools, and content organization, but its code, story text, assets, schemas, constants, and distinctive data structures must not be copied or adapted into this repository.

This is an independent-reimplementation and contamination-control policy, not a personnel-isolated clean-room process. Implementation must be derived from this project's own `docs/poc/` specifications and tests. Production source, build scripts, tests, fixtures, and code generation must never import, scan, copy, bundle, or otherwise depend on `references/`. Research notes are non-normative and must not be used as implementation templates.

## Generated and local files

Do not commit dependency folders, build output, coverage, local saves, diagnostics, generated exports, secrets, reference repositories, IDE-local state, or Unity-generated folders. Extend `.gitignore` when new tooling introduces additional generated files.
