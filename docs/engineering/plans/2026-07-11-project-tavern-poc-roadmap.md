# Project Tavern First PoC Execution Roadmap Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Starting from the verified Phase 1 foundation and a completed local materialization preflight, migrate the runtime to the approved Phase 2+ architecture, build a minimal independent E2E Story and a complete seven-day PoC Story, then deliver persistence, diagnostics, semantic automation, accessible UI, and one reproducible platform-neutral PoC Web artifact for later human review or independent distribution work.

**Architecture:** `@sillymaker/base`, `@sillymaker/ui`, shared assets, and the generic Web Host remain game-neutral. `game/stories/e2e` owns minimal fixture GameplayModules; `game/stories/poc` owns all tavern GameplayModules, Rules, Resolvers, GameCommandExecutor, GameQueries, content, presentation and tooling. Every Story resolves to one `ResolvedGame`, creates one static `GameSimulation`, creates GameSession instances through one unified application lifecycle with at most one active Session per application, exposes normal play through `SemanticGamePort`, and produces one Artifact per Host; Debug, Cheat and Automation are runtime capabilities rather than build flavors.

**Tech Stack:** Node.js >=22.12.0 with a recorded exact local version, pnpm 11.11.0, TypeScript 7.0.2, React 19.2.7, Vite 8.1.4, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, IndexedDB/idb 8.0.3, Playwright 1.61.1, CSS Modules, and host-local visual regression bound to a recorded environment fingerprint.

## Global Constraints

- Phase 1 completed at `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2`; it was re-verified on 2026-07-12 with frozen install, `pnpm verify`, Chromium/WebKit, reproducible release, clean diff and clean worktree.
- [`2026-07-12-game-runtime-design.md`](../specs/2026-07-12-game-runtime-design.md) is authoritative for Phase 2+ terminology, ownership, capabilities, SemanticGamePort, Input and Artifact boundaries.
- [`2026-07-12-local-engineering-delivery-boundaries-design.md`](../specs/2026-07-12-local-engineering-delivery-boundaries-design.md) is authoritative for the separate predecessor asset track, pre-Goal materialization, unattended local engineering, agent baseline review, final human review, resume behavior and deferred remote distribution.
- [`2026-07-12-scene-interaction-character-presentation-design.md`](../specs/2026-07-12-scene-interaction-character-presentation-design.md) is authoritative for StageScene/variant, Character/HitMap/Interaction, orthogonal content-flag filtering, RuntimePresentation and the one-way authoritative publication boundary.
- Before every phase, re-read live `AGENTS.md`, the Phase 2+ specification, the Contract Catalog, the phase plan, package exports, scripts, routes, `git status` and the previous checkpoint evidence.
- Do not introduce public tavern GameplayModules, Sandbox/Demo Stories, or Player/Developer build flavors; the active files below define the only implementation path.
- Do not preserve compatibility aliases for `GameProfile`, `CommandCoordinator`, `ResolvedStory`, `EngineSession`, Sandbox/Demo Story packages or Player/Developer build scripts. No external release depends on them.
- `game/stories/e2e` and `game/stories/poc` are the only current Stories. Do not pre-create Sandbox, Demo, Full, `game/stories/common`, Electron, public npm packages or a public Mod manager.
- PoC Gameplay belongs to `game/stories/poc`; E2E fixture Gameplay belongs to `game/stories/e2e`; Base/UI/Web cannot import either Story.
- Simulation is snapshot-authoritative and command-driven. GameCommandExecutor owns candidate commit/RNG/sequence; GameQueries are a separate read-only responsibility.
- [`2026-07-15-typed-state-store-v2-design.md`](../specs/2026-07-15-typed-state-store-v2-design.md) records the approved Post-Goal typed StateStore direction. Phase 2–6 keep the v1 Snapshot/transaction/Query/Save ABI; no partial Store, Prisma/SQL dependency, live IndexedDB state, or migration enters this Goal.
- One GameSession FIFO owns every authoritative operation. UI, tooling, Automation and Hotfix never receive a Snapshot setter or Owner capability.
- SemanticGamePort exposes only player-visible information and legal actions. Automation does not receive DebugTools and legal Automation never modifies RunIntegrity.
- Debug/Cheat/Automation default to disabled. Successful rule-bypassing mutations persist RunIntegrity; read-only tooling and structurally invalid, `validation_failed`, or faulted debug operations do not.
- Every `Story × Host` has one Artifact. Tooling may be present and lazily loaded in that Artifact; bundle absence is not a security mechanism.
- The first Goal covers only local engineering delivery and a feedback-ready PoC Artifact. Asset generation/approval runs first in its independent track; human playtesting runs only after this Goal; CI, hosting and remote smoke are deferred to a separate future distribution task.
- Every behavior task uses TDD: focused failing test, an expected failure matching the named test and stable diagnostic code, minimal implementation, focused pass, phase gate, current `pnpm verify`, exact staged-diff review and the task commit.
- Verification never rewrites tracked fixtures, golden files, screenshots or lockfiles. Writers stay explicit and outside `pnpm verify`.
- Technical fixtures/golden/screenshots are reviewed by the execution agent under the delivery-boundaries evidence contract; this is not asset approval and introduces no human pause.
- No mainline task creates `.github/workflows/**`, calls a remote API, publishes, pushes, deploys, checks hosting credentials or changes repository settings.

---

## Independent Tracks and Required Order

The overall project order is:

1. **Predecessor asset-preparation track (outside the Goal):** follow [`docs/art/first-web-visual-pack.md`](../../art/first-web-visual-pack.md); commit the always-present, possibly empty `approvedPocAssetPacksV1` handoff plus its technical test before Phase 0. Only owner-approved runtime files are inputs, and incomplete slots retain fallback.
2. **Automated local materialization (before creating the Goal):** execute [`Phase 0 — Goal Materialization`](2026-07-12-project-tavern-00-goal-materialization.md) and require its checkpoint to pass.
3. **One unattended local engineering Goal:** execute Phase 2–6 below in order.
4. **Final human review (outside the Goal):** execute [`Final Human Review`](2026-07-12-project-tavern-final-human-review.md) only after the engineering Definition of Done passes.
5. **Remote distribution:** deferred to [`Remote Distribution — Deferred Scope`](2026-07-12-project-tavern-remote-distribution-deferred.md); it has no place in the current Goal.

## Mainline Plan Set and Required Order

1. [`Phase 2 — Runtime Alignment & Minimal E2E Story`](2026-07-11-project-tavern-02-modules-e2e-story.md)
2. [`Phase 3 — Persistence, Capabilities, Replay & Diagnostics`](2026-07-11-project-tavern-03-persistence-diagnostics.md)
3. [`Phase 4A — PoC Gameplay & GameSimulation`](2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)
4. [`Phase 4B — Seven-day PoC Story & Golden Week`](2026-07-11-project-tavern-04b-poc-story-golden.md)
5. [`Phase 5A — UI Runtime Foundations`](2026-07-12-project-tavern-05a-ui-runtime-foundations.md)
6. [`Phase 5B — StageScene, Character & Story Presentation`](2026-07-12-project-tavern-05b-stage-character-story-presentation.md)
7. [`Phase 5C — Tooling, Automation & Acceptance`](2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)
8. [`Phase 6 — Reproducible Local PoC Artifact`](2026-07-11-project-tavern-06-local-artifact.md)

The order is mandatory. Phase 4A and 4B share one Phase 4 checkpoint but are separate plans so concrete Gameplay implementation does not obscure content and balance work. Phase 5A/5B/5C form one cumulative Phase 5 checkpoint: neutral UI/runtime foundations first, Story presentation second, and tooling/full acceptance last. A phase may add a failing contract for its immediate successor, but cannot implement around an unaccepted earlier public interface.

## Goal Entry Point

The canonical Phase 0 and Phase 2–6 objectives, live-state discovery and recovery algorithm exist only in [`../GOAL.md`](../GOAL.md). Do not copy or fork another Goal prompt into this roadmap or a phase plan. The main Goal remains active across Phase 2–6; phase completion is a checkpoint, not Goal completion.

## Target Public Command Surface

Phase 2–6 progressively establish the target command names. A missing future command before its owning phase is not a defect. The list below is the final stable local operator surface (phase-local focused test commands and checkpoint aggregates may exist in addition). Every verification command must execute real checks and remain read-only unless explicitly described as a writer.

```text
pnpm format:check            Prettier conformance
pnpm verify:materialization  offline external-input/browser/host attestation
pnpm lint                    type-aware Oxlint policy
pnpm typecheck               authoritative whole-workspace TypeScript 7 check
pnpm verify:boundaries       package/facet/import and references exclusion
pnpm verify:cycles           production import graph cycles
pnpm verify:public-exports   exact Base public ABI inventory
pnpm verify:stories          E2E/PoC Story contracts and resolved closure
pnpm verify:runtime-fixtures provenance-bound Save/Debug runtime fixtures
pnpm verify:fixtures         read-only E2E and PoC Save/Debug fixture verification
pnpm verify:golden           read-only E2E and PoC golden verification
pnpm verify:determinism      fixed E2E deterministic corpus
pnpm --filter @project-tavern/story-poc verify:commands  read-only PoC reference commands
pnpm verify:balance          PoC 1..1000-seed thresholds
pnpm verify:assets           runtime manifest paths, media bytes, hashes and dimensions
pnpm verify:semantic         SemanticGamePort and DOM/action parity
pnpm verify:ui               RTL, responsive, Input and accessibility checks
pnpm verify:ui-visual        read-only host-local fingerprint and pixel comparison
pnpm verify:bundle           E2E/PoC source and emitted-byte checks
pnpm verify:artifact         PoC manifest, nested base and smoke
pnpm verify:release          clean double-build and release/runbook checks
pnpm verify:docs             documentation links, execution manifest and plan contract
pnpm test:unit               all unit suites
pnpm test:contract           Base/Story contract suites
pnpm test:property           fast-check invariants and determinism
pnpm test:e2e:smoke          short Chromium browser integration
pnpm test:e2e:full           Chromium and WebKit nonvisual integration
pnpm build:e2e               E2E Web Artifact
pnpm build:poc               PoC Web Artifact
pnpm verify                  complete nonpublishing local gate
```

The following remain explicit side-effecting operator commands and are never called by verification:

```text
pnpm regenerate:fixtures
pnpm update:materialization-lock
pnpm update:golden
pnpm --filter @project-tavern/story-poc update:commands
pnpm --filter @project-tavern/story-poc update:golden
pnpm --filter @project-tavern/story-poc update:fixtures
pnpm update:ui-snapshots
pnpm prepare:goal
pnpm release:prepare
```

## Checkpoints

### R1: Complete pre-Goal local materialization

**Plan:** [`2026-07-12-project-tavern-00-goal-materialization.md`](2026-07-12-project-tavern-00-goal-materialization.md)

- [ ] Record the exact materialization base SHA, clean non-detached branch, Phase 1 ancestor, Git identity, Node/pnpm versions and availability of final fixed ports 4173/41731/41732.
- [ ] Install every exact Phase 2–6 dependency into its final owning manifest and freeze the lockfile before the long Goal.
- [ ] Materialize the host pnpm store, exact Chromium/WebKit revisions and local font files; prove later verification can run without registry or browser-download access.
- [ ] Run the current baseline verification and write the materialization checkpoint before creating the long Goal.

Stop before Phase 2 if any required external input is unavailable. No implementation task may compensate by adding a new registry lookup later.

### R2: Complete Phase 2 — runtime alignment and minimal E2E

**Plan:** [`2026-07-11-project-tavern-02-modules-e2e-story.md`](2026-07-11-project-tavern-02-modules-e2e-story.md)

**Consumes:** the verified foundation implementation at the Phase 2 base commit.

**Produces:** breaking public ABI migration, complete ResolvedGame and GameSession contracts, neutral StageScene/Character/HitMap/Interaction/content-preference contracts, the final E2E/PoC directory layout, one E2E Web application, the invariant that each eventual Story/Host has only one application root, unified GameApplication contracts, atomic SemanticPublication/SemanticGamePort, Story-local E2E fixture GameplayModules and a deterministic semantic runner.

- [ ] Execute Phase 2A migration tasks first; no new gameplay may use old Profile/Coordinator contracts.
- [ ] Execute Phase 2B fixture Gameplay, Narrative/workflow, Hotfix and semantic automation tasks.
- [ ] Run Phase 2 Acceptance exactly and record public-export diff, Story identities, build roots, deterministic vectors and clean status.

Stop if any old public alias remains, ResolvedGame drops SceneGraph, Executor owns Queries, E2E imports PoC, or build output still varies by Player/Developer flavor.

### R3: Complete Phase 3 — persistence, capabilities and diagnostics

**Plan:** [`2026-07-11-project-tavern-03-persistence-diagnostics.md`](2026-07-11-project-tavern-03-persistence-diagnostics.md)

**Consumes:** accepted GameSession, E2E SemanticGamePort and one-application Story roots.

**Produces:** IndexedDB store, slots/lease/CAS, strict compatibility, CommandLog/replay, RuntimeCapabilities, DebugTools, RunIntegrity, DebugBundle, same-root HMR invalidation and provenance-bound fixtures.

- [ ] Execute persistence and Session tasks through the single FIFO.
- [ ] Prove capability-disabled rejection, legal Automation integrity neutrality and successful Cheat/anchor integrity persistence.
- [ ] Run hostile import, replay, multi-tab, HMR and fixture acceptance; record digests and clean status.

Stop if tooling gains a second mutation queue, Automation reaches DebugTools, capability state enters simulation identity, or RunIntegrity can disappear after Save/Load/replay.

### R4A: Complete Phase 4A — PoC Gameplay and GameSimulation

**Plan:** [`2026-07-11-project-tavern-04a-poc-gameplay-simulation.md`](2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)

**Consumes:** accepted generic runtime and `docs/poc/` rules.

**Produces:** Story-local PoC contracts, GameplayModules, Rules, Resolvers, effect routing, PocGameCommandExecutor, PocGameQueries, projectors and createPocGameSimulation.

- [ ] Implement owner-local slices and tests before cross-owner execution.
- [ ] Prove preview/execute parity, rollback, invariants and deterministic query/view projection.
- [ ] Run the Phase 4A gate and record module owner/dependency table, property evidence and clean status.

Stop if PoC Gameplay enters Base/UI/Web, a GameplayModule writes another owner, or a Rule reads Host/UI/time globals.

### R4B: Complete Phase 4B — seven-day PoC and golden evidence

**Plan:** [`2026-07-11-project-tavern-04b-poc-story-golden.md`](2026-07-11-project-tavern-04b-poc-story-golden.md)

**Consumes:** accepted PocGameSimulation and existing seven-day design documents.

**Produces:** PoC Story identity/data/content/Narrative/PatchSurfaces, exact StageScene/variant/rig/HitMap/Interaction catalog, an empty-flag/zero-requirement content policy, one atomic GameView/NarrativeView/action Semantic publication path, six reference strategies, reviewed golden artifacts, 1..1000 seed metrics and persistence/tooling fixtures.

- [ ] Implement D1–D7 content and Story composition without changing E2E.
- [ ] Review every explicit generated baseline diff before commit.
- [ ] Run fixed-strategy, golden, balance, Save fixture and complete Phase 4 Acceptance; record reproduction seeds and clean status.

Stop if content adds arbitrary callbacks/expressions, golden verification writes files, or one strategy silently dominates all outcomes.

### R5A: Complete Phase 5A — neutral UI runtime foundations

**Plan:** [`2026-07-12-project-tavern-05a-ui-runtime-foundations.md`](2026-07-12-project-tavern-05a-ui-runtime-foundations.md)

**Consumes:** atomic SemanticGamePort publications, resolved text/assets and Phase 3 player-safe ports.

**Produces:** exact-AssetId loading, atomic React bridge, neutral renderer registry, Input/Pointer adapters, fixed seven-layer Stage, semantic primitives, Overlay/VN/System hosts, persistence/recovery surfaces and a read-only Phase 5A gate.

- [ ] Implement exact asset demand and the atomic publication bridge before any Story renderer.
- [ ] Implement Input ownership and the fixed Stage without geometry, HitMap or PoC semantics.
- [ ] Prove generic blocking/persistence/recovery surfaces and the cumulative Phase 5A gate.

Stop if UI rebuilds action availability, coarse preloading returns, browser input becomes a Gameplay command, or a Story-specific renderer enters UI/Web.

### R5B: Complete Phase 5B — StageScene, Character and Story presentation

**Plan:** [`2026-07-12-project-tavern-05b-stage-character-story-presentation.md`](2026-07-12-project-tavern-05b-stage-character-story-presentation.md)

**Consumes:** accepted Phase 5A foundations, frozen E2E/PoC presentation catalogs and atomic Semantic publications.

**Produces:** RuntimePresentationStore, StageScene/variant and hybrid Character renderers, HitMap/Interaction controller, Story-scoped content preference, neutral E2E fixture, and the complete E2E/PoC Web roots.

- [ ] Project one immutable RuntimePresentation publication without rereading Queries.
- [ ] Prove Pointer/semantic controls converge on typed activation and exact existing actions.
- [ ] Prove independent content flags and Story presets change presentation/assets only, while the PoC registers no restricted flags and every requirement remains zero.

Stop if GameSimulation imports presentation IDs, a projector creates a second Gameplay gate, an invalid dynamic join mutates Session, or Phase 5 adds PoC Gameplay.

### R5C: Complete Phase 5C — tooling, automation and full acceptance

**Plan:** [`2026-07-12-project-tavern-05c-tooling-automation-acceptance.md`](2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)

**Consumes:** complete Story Web roots, RuntimeCapabilities, DebugTools, player Semantic ports and accessible DOM surfaces.

**Produces:** same-Artifact DevDock/Cheat/Story tooling, bounded Debug UI context, versioned Automation/browser facade, DOM/Port parity, full accessibility/browser/visual checks and the cumulative Phase 5 gate.

- [ ] Keep DevDock and tooling lazy/capability-gated inside the existing root.
- [ ] Expose normal play to Automation without Snapshot, hidden state or DebugTools.
- [ ] Run keyboard, touch, zoom, reduced-motion, axe, Chromium/WebKit and visual acceptance.

Stop if tooling creates another Artifact/Session, Automation can cheat, semantic and DOM availability diverge, or coordinate-only operation becomes required.

### R6: Complete Phase 6 — reproducible local PoC Artifact

**Plan:** [`2026-07-11-project-tavern-06-local-artifact.md`](2026-07-11-project-tavern-06-local-artifact.md)

**Consumes:** complete E2E and PoC Web applications.

**Produces:** closed `{ story, host }` builder, `dist/e2e` and `dist/poc`, deterministic manifests, nested-base smoke, complete local verification orchestration and local runbooks.

- [ ] Build and inspect both Story Artifacts; release-process only PoC.
- [ ] Prove two clean PoC builds are byte-identical and the final manifest identifies their exact local inputs.
- [ ] Run local full/release verification and record source SHA, manifest digest, browser matrix and clean status.

Stop if a flavor dimension reappears, artifact verification treats absence of tooling as security, any `.github/workflows/**` file is created, or a local command requires hosting credentials/network publication.

## Final Definition of Done

The engineering Goal is complete only when all of the following are true:

- Phase 2–6 plans and every checkpoint acceptance pass on one reviewed commit chain;
- workspace contains only Base, UI, Assets, Web, E2E Story and PoC Story;
- Base exposes only the revised ABI and remains free of PoC semantics;
- E2E and PoC are independently resolvable and buildable;
- E2E covers module dependencies, transactions, Narrative, Hotfix, Save, Replay and Semantic automation without importing PoC;
- PoC runs the complete seven-day week through GameSession and SemanticGamePort;
- each authoritative token creates one Queries-backed atomic GameView/NarrativeView/action publication, and one RuntimePresentationStore joins only that publication, the resolved catalog, content preference, and UI session state;
- StageScene/variant, Character/HitMap/Interaction and GameSymbol remain presentation concerns; GameSimulation/GameView contain no renderer, StageScene, asset, coordinate or Host preference authority;
- Auto/Quick/Manual Save, strict import, State Dump, DebugBundle and replay work with RunIntegrity;
- Debug/Cheat/Automation default off and can be enabled in the same PoC Artifact;
- Pointer supports mouse/touch, semantic DOM supports keyboard/readers, and DOM/Port action semantics agree;
- the PoC registers no restricted content flags and ships only zero-requirement presentation, one heroine figure target and existing Gameplay actions; content preference changes presentation/assets only;
- code-native fallback assets provide a complete experience without approving archived AIGC candidates;
- `dist/poc` is reproducible, nested-base-safe, platform-neutral and is the same artifact exercised by local prebuilt smoke;
- all fast tests, Chromium/WebKit, accessibility, artifact, docs and release gates pass without modifying tracked baselines;
- final worktree status and any deliberately retained user changes are explicitly reported;
- no `.github/workflows/**`, remote deployment adapter, asset approval or subjective playtest result belongs to the engineering Goal;
- final human review and remote distribution consume the recorded Artifact only through their separate plans.
