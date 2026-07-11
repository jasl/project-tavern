# Project Instructions

## Mission and current phase

This repository is for a solo tavern-management, relationship-sim, and text-adventure game. The current milestone is a maintained, production-grade React + TypeScript game runtime and Story authoring harness whose first loaded Story is a non-canonical seven-day Demo. Gameplay modules, formulas, and balance are provisional; `@project-tavern/base`, `@project-tavern/ui`, Story loading, tests, diagnostics, and code quality are durable. Do not start Unity work or scaled formal content production until the PoC gate in `docs/poc/poc-charter.md` is passed.

## Sources of truth

Read these before changing behavior:

1. `docs/superpowers/specs/2026-07-10-react-game-harness-design.md` — authoritative package, Base/UI, Module/Story, Loader/Host, Hotfix, save/debug, build, test, and asset boundaries.
2. `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md` — field-level v1 catalog for Base envelopes and the concrete Demo Module/Story ABI; tavern-specific types in this file do not belong in Base.
3. `docs/superpowers/specs/2026-07-11-repository-licensing-design.md` — authoritative MIT/PolyForm/CC scope, third-party material, trademark, and contribution boundaries.
4. `docs/superpowers/specs/2026-07-12-aigc-asset-archive-design.md` — authoritative AIGC source directory, optional prompt/model archive, manual runtime promotion, and technical Asset Pack digest boundaries.
5. `docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md` — mandatory first-Goal phase order, checkpoints, stop lines, verification surface, and Definition of Done; follow its linked phase plans during execution.
6. `docs/poc/poc-charter.md` — first Story scope and acceptance gates.
7. `docs/poc/simulation-rules.md` — seven-day state transitions and settlement semantics.
8. `docs/poc/balance-v0.md` — tunable seven-day values and formulas.
9. `docs/poc/content-and-playtest.md` — fixed seven-day scenario and strategy matrix.
10. `docs/poc/reference-strategies.md` — deterministic reference inputs.
11. `docs/design/game-design-baseline.md` — long-term product direction.
12. `docs/art/first-web-visual-pack.md` — provisional Web visual language, stable runtime Asset IDs, safe zones, source illustrations, and acceptance.

Authority is domain-specific: the Harness design governs technical architecture; the Contract Catalog freezes its field-level ABI; the licensing design governs copyright, package metadata, third-party admission, and release notices; the PoC documents govern the seven-day gameplay and numbers inside those interfaces; the visual-pack document governs provisional Web art direction and asset contracts. The roadmap governs execution order and evidence but cannot override those specifications. Record intentional changes in the relevant authoritative document in the same change as the code.

## Scope constraints

- Keep the PoC to one non-canonical seven-day week.
- No backend, accounts, network runtime, analytics service, or runtime LLM.
- No real-time exploration, combat, equipment, minigames, scheduling sandbox, free-form decoration, formal 3D, character creator, public Mod manager/sandbox, or adult content. The bootstrap-only trusted Hotfix PatchSurface is in scope.
- The heroine is the only relationship focus. The helper is a background automation tool, not a story route.
- Use only the minimal Auras listed by the PoC spec. Do not build a general rules language or arbitrary callback registry.
- Do not add features merely because the long-term design mentions them.
- A small coherent web visual pack is allowed; final-scale art/audio production is not.
- Image Gen UI mockups are design references only. Runtime controls, text, HUD, focus states, and small symbols remain code-native; commercial screenshots and `references/` are never generation inputs.

## Architecture constraints

- `@project-tavern/base` owns the generic Snapshot/session/transaction/persistence machinery and must not import React, DOM, concrete gameplay modules, renderer types, or a concrete Story. Browser storage is supplied through a Host/runtime adapter.
- `apps/web` is a generic MIT Loader/WebHost/mount library and never imports a Story. Each Story owns its Player/Developer application roots, depends on the public Web mount surface, and passes its `StoryEntry` explicitly before Session creation.
- UI sends typed commands/persistence operations and renders immutable Runtime ViewModels/projections. It never imports or receives `GameSnapshot`/`GameState`; transient `DomainFact` values are consumed by Runtime projection/diagnostics, not exposed as a second UI state API.
- Each Story statically composes a typed `GameProfile` from public `@project-tavern/modules` entries before Session creation. Modules own exact state paths; the Demo v1 profile has no direct Module-to-Module read edges, and only its single `CommandCoordinator` combines public read ports with owner-scoped proposal/apply capabilities. Other Stories may declare an explicit acyclic public-port DAG. Do not add, remove, or replace Modules after `ResolvedStory` is frozen.
- `EventId` is Scheduler-only. Player-invoked StoryAction, Facility opportunity, and WorldAction entries use stable `ActionId` values and typed commands; never add a no-op Event merely to reuse an Action name.
- Randomness must use the serializable project PRNG. Never use `Math.random()` in simulation code.
- Save plain versioned data and stable IDs, never component instances or rule functions. Ordinary load requires matching Story ID/revision, state-contract revision/digest, engine digest, and resolved simulation digest. Story/presentation digests, engine version, and appBuildId are diagnostic. A managed Hotfix may explicitly adopt an older simulation digest only when the state contract is unchanged and full validation passes; adoption creates a new replay anchor.
- Story content and balance use validated IR/data. A Story may also contain Scene/UI code and named synchronous deterministic rule implementations, but Scene code never writes Snapshot. Bootstrap Hotfix code is the only official executable replacement seam.
- Keep content effects to a small, code-owned discriminated union. No `eval`, reflection, arbitrary expressions, script strings, or content-node callbacks.
- Story rules receive deep-readonly inputs and Base RNG capabilities and return validated effect intents; official rules must not mutate state or read UI/storage/network/time globals. The runtime validates results even though arbitrary third-party JavaScript cannot be sandboxed by this contract.
- Story exposes separate typed Simulation (`rule | value`) and Presentation (`value | text | asset`) Patch Surfaces. Managed Hotfixes execute deterministically after Story definition and before Session creation, are tracked by actual import-closure digest, and require explicit `supersedes` on collisions. Revoke/freeze surfaces before Session creation. Bypassing the PatchSurface is unsupported and receives no compatibility or replay guarantee.
- Save adoption is authorized only by an exact resolved simulation-PatchSet declaration (`from → to` plus state-contract revision/digest), never by one Hotfix in isolation. Presentation-only patches do not affect adoption.
- Player UI uses the central stage and in-stage overlays. Left/right sidebars are developer-only, toggleable surfaces.
- Story runtime and `./development` are separate package exports. Player builds must not import or bundle fixtures, developer notes, DeveloperApplicationPort, or mutating DevTools.
- Save/Quick Save use IndexedDB through the persistence facade. Diagnostics remain outside `GameState`.
- Invalid commands return structured rejection reasons without partially mutating state.
- `GameSnapshot` is authoritative; bounded `CommandLog` and emitted `DomainFact` values are diagnostic/non-authoritative and must never be reapplied as state.
- One EngineSession FIFO serializes every authoritative operation: Game dispatch, validated Save load/import (including explicit resolved-PatchSet adoption), lifecycle create/restart, replayable DebugCommand, and fixture anchor. Entry marks the Session busy synchronously; no Runtime service or UI may receive a direct Snapshot setter. Every successful replacement atomically establishes a new replay base and clears the old CommandLog.
- Replayable gameplay DebugCommand semantics and validation live with the selected Modules/Profile and enter `simulationDigest`; admitted committed and faulted attempts both enter CommandLog, while validation failures never do. `debug.fixture.load` resolves only active-Story fixtures and establishes an anchor rather than a replayable log entry.
- AIGC source archives live under `art-source/aigc/<source>/**`; organization below the source is free, prompt/model naming is optional, and no verifier scans archive metadata or pairing. Selected images are manually copied into `packages/assets/**` or a Story asset directory; only the promoted runtime manifest and exact bytes enter the technical Asset Pack digest. `art-source/aigc/**` and `references/` never enter Player/Pages artifacts.

## Licensing constraints

- Copyright holder is `Jun Jiang (jasl)`. The whole repository must not be described as MIT or as an open-source game: only the generic Engine areas are MIT; game-specific software and original content are source-available for noncommercial use.
- `packages/base`, `packages/ui`, and game-neutral `apps/web` code are MIT and must not import or embed PolyForm/CC game-specific implementations, IDs, rules, narrative, branding, or assets.
- `packages/modules`, Story software, Hotfixes, fixtures, and game-specific tests use `PolyForm-Noncommercial-1.0.0`. Original narrative, localization, art, audio, and project design documents use `CC-BY-NC-SA-4.0` except where a third-party record says otherwise.
- npm dependencies retain their own terms but are governed operationally by exact manifests and the frozen lockfile, not by per-package copyright extraction, license-file scanning, `THIRD_PARTY_NOTICES.md` inventory, or build admission gates.
- Third-party source, binary, font, media, data, or other material intentionally copied into Git belongs under `vendor/**`. That directory remains under each item's own license, contract, notice, or public-domain status and is outside the project MIT/PolyForm/CC grants. Repository automation does not scan or adjudicate `vendor/**` licensing.
- `references/` is outside every project license and must remain ignored, untracked, unread by production/test/generation code, and absent from every artifact.
- Package `license` metadata must match `LICENSE.md`: single-license packages use the exact SPDX ID; mixed packages use `SEE LICENSE IN LICENSE.md`.
- Restricted PolyForm/CC areas do not accept external contributions before the approved CLA or copyright-assignment gate. MIT Engine contributions are inbound=outbound MIT.
- Project legal files and package `license` metadata are maintained by direct review, without repository-wide hash, existence, metadata, screenshot-sidecar, dependency, AIGC, or `vendor/**` licensing gates.

## Quality and workflow

- Treat Harness code as production code. Prefer TDD for simulation rules: failing focused test, minimal implementation, focused pass, then broader verification.
- Maintain deterministic golden-week tests for named strategies.
- Any balance change must update the expected strategy results or explain why the invariant remains unchanged.
- Keep files focused and interfaces explicit. Enforce import boundaries and cycles in CI. Avoid a global mutable store, generic event bus, ECS, CQRS, or event sourcing for this PoC.
- Use Node.js >=22.12.0 and pnpm >=11.0.0 with a frozen lockfile. `pnpm verify` is the full non-interactive local/CI verification entrypoint once scaffolded.
- The current stable TypeScript 7 `tsc` is authoritative and must be pinned when the workspace is scaffolded. Tooling compatibility may not downgrade formal project typechecking or make project code depend on the legacy Compiler API.
- `engine.version` comes only from Application-owned build metadata and never enters engine/simulation roots.
- Tracked persistence fixtures are provenance-bound. Any engine, state-contract, or simulation digest input change must explicitly regenerate and review fixture diffs through the eventual dedicated command; ordinary tests and CI only verify and never rewrite tracked baselines.
- Use Chinese for player-facing/design prose and English for identifiers unless a document states otherwise.

## Reference-code boundary

`references/` is local-only and ignored by Git. Every item must be recorded in `docs/research/reference-register.md`; a root license never proves that every bundled tool, translation, image, or add-on has identical terms. Reference material may be inspected for general ideas such as time ownership, save metadata, debugging tools, and content organization, but its code, story text, assets, schemas, constants, and distinctive data structures must not be copied or adapted into this repository.

This is an independent-reimplementation and contamination-control policy, not a personnel-isolated clean-room process. Implementation must be derived from this project's own `docs/poc/` specifications and tests. Production source, build scripts, tests, fixtures, and code generation must never import, scan, copy, bundle, or otherwise depend on `references/`. Research notes are non-normative and must not be used as implementation templates.

## Generated and local files

Do not commit dependency folders, build output, coverage, local saves, diagnostics, generated exports, secrets, reference repositories, IDE-local state, or Unity-generated folders. Extend `.gitignore` when new tooling introduces additional generated files.
