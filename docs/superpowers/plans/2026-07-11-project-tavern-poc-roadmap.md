# Project Tavern First PoC Execution Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Starting from the verified Phase 1 foundation, migrate the runtime to the approved Phase 2+ architecture, build a minimal independent E2E Story and a complete seven-day PoC Story, then deliver persistence, diagnostics, semantic automation, accessible UI, and one reproducible deploy-ready PoC Web artifact.

**Architecture:** `@project-tavern/base`, `@project-tavern/ui`, shared assets, and the generic Web Host remain game-neutral. `stories/e2e` owns minimal fixture GameplayModules; `stories/poc` owns all tavern GameplayModules, Rules, Resolvers, GameCommandExecutor, GameQueries, content, presentation and tooling. Every Story resolves to one `ResolvedGame`, creates one static `GameSimulation`, creates GameSession instances through one unified application lifecycle with at most one active Session per application, exposes normal play through `SemanticGamePort`, and produces one Artifact per Host; Debug, Cheat and Automation are runtime capabilities rather than build flavors.

**Tech Stack:** Node.js >=22.12.0, pnpm >=11.0.0, TypeScript 7.0.2, React 19.2.7, Vite 8.1.4, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, IndexedDB/idb 8.0.3, Playwright 1.61.1, CSS Modules, GitHub Pages.

## Global Constraints

- Phase 1 completed at `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2`; it was re-verified on 2026-07-12 with frozen install, `pnpm verify`, Chromium/WebKit, reproducible release, clean diff and clean worktree.
- [`2026-07-12-post-phase1-game-runtime-design.md`](../specs/2026-07-12-post-phase1-game-runtime-design.md) is authoritative for Phase 2+ terminology, ownership, capabilities, SemanticGamePort, Input and Artifact boundaries.
- Before every phase, re-read live `AGENTS.md`, the Phase 2+ specification, the Contract Catalog header/mapping, the phase plan, package exports, scripts, routes, `git status` and the previous checkpoint evidence.
- Do not execute the former public-Modules/Demo/Player-Developer phase plans from repository history. The active files linked below replace them.
- Do not preserve compatibility aliases for `GameProfile`, `CommandCoordinator`, `ResolvedStory`, `EngineSession`, Sandbox/Demo Story packages or Player/Developer build scripts. No external release depends on them.
- `stories/e2e` and `stories/poc` are the only current Stories. Do not pre-create Sandbox, Demo, Full, `stories/common`, Electron, public npm packages or a public Mod manager.
- PoC Gameplay belongs to `stories/poc`; E2E fixture Gameplay belongs to `stories/e2e`; Base/UI/Web cannot import either Story.
- Simulation is snapshot-authoritative and command-driven. GameCommandExecutor owns candidate commit/RNG/sequence; GameQueries are a separate read-only responsibility.
- One GameSession FIFO owns every authoritative operation. UI, tooling, Automation and Hotfix never receive a Snapshot setter or Owner capability.
- SemanticGamePort exposes only player-visible information and legal actions. Automation does not receive DebugTools and legal Automation never modifies RunIntegrity.
- Debug/Cheat/Automation default to disabled. Successful rule-bypassing mutations persist RunIntegrity; read-only tooling and structurally invalid, `validation_failed`, or faulted debug operations do not.
- Every `Story × Host` has one Artifact. Tooling may be present and lazily loaded in that Artifact; bundle absence is not a security mechanism.
- The first Goal covers local engineering delivery and a feedback-ready PoC Artifact. It does not approve art, declare the game fun, pass human playtesting, deploy remotely, start Unity or authorize adult content.
- Every behavior task uses TDD: focused failing test, observed expected failure, minimal implementation, focused pass, phase gate, current `pnpm verify`, staged-diff review and the task commit.
- Verification never rewrites tracked fixtures, golden files, screenshots or lockfiles. Writers stay explicit and outside `pnpm verify`.
- Do not publish, push, deploy or change remote repository settings without explicit user authority.

---

## Plan Set and Required Order

1. [`Phase 1 — Foundation & Walking Skeleton (completed historical record)`](2026-07-11-project-tavern-01-foundation-walking-skeleton.md)
2. [`Phase 2 — Runtime Alignment & Minimal E2E Story`](2026-07-11-project-tavern-02-modules-e2e-story.md)
3. [`Phase 3 — Persistence, Capabilities, Replay & Diagnostics`](2026-07-11-project-tavern-03-persistence-diagnostics.md)
4. [`Phase 4A — PoC Gameplay & GameSimulation`](2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)
5. [`Phase 4B — Seven-day PoC Story & Golden Week`](2026-07-11-project-tavern-04b-poc-story-golden.md)
6. [`Phase 5 — UI, Input, Assets, Accessibility & Automation`](2026-07-11-project-tavern-05-ui-assets-accessibility.md)
7. [`Phase 6 — Reproducible PoC Release & Pages`](2026-07-11-project-tavern-06-release-pages.md)

The order is mandatory. Phase 4A and 4B share one Phase 4 checkpoint but are separate plans so concrete Gameplay implementation does not obscure content and balance work. A phase may add a failing contract for its immediate successor, but cannot implement around an unaccepted earlier public interface.

## Recommended Goal Objective

When the user explicitly asks to resume execution, update or create the active Goal with this objective and no inferred token budget:

> 从已完成并验证的 Project Tavern Phase 1 基线出发，严格按 `docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md` 的修订阶段顺序，先迁移 ResolvedGame/GameSimulation/GameSession、E2E/PoC Story 布局、统一 Application 和单 Artifact，再完成最小 E2E、持久化/重放/诊断、七日 PoC Gameplay 与内容、SemanticGamePort、Input、可访问 UI 和可复现 PoC Web 制品；使全部自动化验收通过并交付可供人工试玩的版本，不自行批准素材、部署远端或宣告主观试玩通过。

The Goal remains active across Phase 2–6. Phase completion is a checkpoint, not Goal completion.

## Target Public Command Surface

Phase 2 removes the Phase 1 build-flavor scripts and establishes the target names. The list below is the stable operator/CI surface (phase-local focused test commands and checkpoint aggregates may exist in addition). Every verification command must execute real checks and remain read-only unless explicitly described as a writer.

```text
pnpm format:check            Prettier conformance
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
pnpm verify:assets           runtime manifests, bytes, digests and budgets
pnpm verify:semantic         SemanticGamePort and DOM/action parity
pnpm verify:ui               RTL, responsive, Input and accessibility checks
pnpm verify:bundle           E2E/PoC source and emitted-byte checks
pnpm verify:artifact         PoC manifest, nested base and smoke
pnpm verify:release          clean double-build and release/runbook checks
pnpm verify:workflows        pinned Action/workflow structure
pnpm docs:links              documentation inventory and links
pnpm test:unit               all unit suites
pnpm test:contract           Base/Story contract suites
pnpm test:property           fast-check invariants and determinism
pnpm test:e2e:smoke          short Chromium browser integration
pnpm test:e2e:full           Chromium and WebKit integration
pnpm build:e2e               E2E Web Artifact
pnpm build:poc               PoC Web Artifact
pnpm verify                  complete nonpublishing local/CI gate
```

The following remain explicit side-effecting operator commands and are never called by verification:

```text
pnpm regenerate:fixtures
pnpm update:golden
pnpm --filter @project-tavern/story-poc update:commands
pnpm --filter @project-tavern/story-poc update:golden
pnpm --filter @project-tavern/story-poc update:fixtures
pnpm update:screenshots
pnpm release:prepare
```

## Checkpoints

### R0: Confirm the Phase 1 baseline

Status: completed on 2026-07-12.

Evidence:

- Branch `main`, HEAD `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2`;
- frozen install passed with Node `v26.5.0` and pnpm `11.11.0`;
- `pnpm verify` passed: 31 unit, 14 contract, 2 property and 22 script tests, builds and Chromium smoke;
- Chromium/WebKit full suite reported 5 passed and the existing visual-policy case skipped;
- `pnpm verify:release` reported reproducible clean Player baseline builds;
- structural checks and final worktree were clean.

### R1: Preserve Phase 1 as an execution record

**Plan:** [`2026-07-11-project-tavern-01-foundation-walking-skeleton.md`](2026-07-11-project-tavern-01-foundation-walking-skeleton.md)

- [x] Phase 1 tasks executed and committed.
- [x] Phase 1 Acceptance executed against the as-built contracts.
- [x] Historical plan annotated; no completed task is rewritten to pretend it used future terminology.

### R2: Complete Phase 2 — runtime alignment and minimal E2E

**Plan:** [`2026-07-11-project-tavern-02-modules-e2e-story.md`](2026-07-11-project-tavern-02-modules-e2e-story.md)

**Consumes:** verified Phase 1 Base/UI/Web/Sandbox implementation.

**Produces:** breaking public ABI migration, complete ResolvedGame and GameSession contracts, the final E2E/PoC directory layout, one E2E Web application, the invariant that each eventual Story/Host has only one application root, unified GameApplication/Semantic contracts, Story-local E2E fixture GameplayModules and a deterministic SemanticGamePort runner.

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

**Produces:** PoC Story identity/data/content/Narrative/SceneGraph/PatchSurfaces, six reference strategies, reviewed golden artifacts, 1..1000 seed metrics and persistence/tooling fixtures.

- [ ] Implement D1–D7 content and Story composition without changing E2E.
- [ ] Review every explicit generated baseline diff before commit.
- [ ] Run fixed-strategy, golden, balance, Save fixture and complete Phase 4 Acceptance; record reproduction seeds and clean status.

Stop if content adds arbitrary callbacks/expressions, golden verification writes files, or one strategy silently dominates all outcomes.

### R5: Complete Phase 5 — UI, Input, assets and automation

**Plan:** [`2026-07-11-project-tavern-05-ui-assets-accessibility.md`](2026-07-11-project-tavern-05-ui-assets-accessibility.md)

**Consumes:** complete PoC projections, SemanticGamePort and runtime capabilities.

**Produces:** generic Shell/Stage/VN/Overlay/Input/DevDock framework, PoC-owned HUD/Scenes, Pointer mouse/touch support, runtime tooling toggles, versioned Automation Bridge, governed fallback assets and accessible PoC/E2E Web flows.

- [ ] Implement generic semantic UI and Input before PoC renderers.
- [ ] Prove DOM/action availability parity and no double dispatch from Pointer/click synthesis.
- [ ] Run responsive, keyboard, touch, reduced-motion, accessibility, capability and two-Story browser acceptance.

Stop if ordinary controls require coordinates, Automation sees hidden state or DebugTools, UI writes Snapshot, or DevDock requires another Artifact.

### R6: Complete Phase 6 — reproducible PoC release

**Plan:** [`2026-07-11-project-tavern-06-release-pages.md`](2026-07-11-project-tavern-06-release-pages.md)

**Consumes:** complete E2E and PoC Web applications.

**Produces:** closed `{ story, host }` builder, `dist/e2e` and `dist/poc`, deterministic manifests, nested-base smoke, complete verification orchestration, immutable-SHA CI, same-artifact Pages workflow and runbooks.

- [ ] Build and inspect both Story Artifacts; release-process only PoC.
- [ ] Prove two clean PoC builds are byte-identical and Pages never rebuilds uploaded bytes.
- [ ] Run local full/release verification and record source SHA, manifest digest, browser matrix and clean status.

Stop if a flavor dimension reappears, Pages rebuilds, artifact verification treats absence of tooling as security, or remote deployment is attempted without authority.

## Final Definition of Done

The engineering Goal is complete only when all of the following are true:

- Phase 2–6 plans and every checkpoint acceptance pass on one reviewed commit chain;
- workspace contains only Base, UI, Assets, Web, E2E Story and PoC Story;
- Base exposes only the revised ABI and remains free of PoC semantics;
- E2E and PoC are independently resolvable and buildable;
- E2E covers module dependencies, transactions, Narrative, Hotfix, Save, Replay and Semantic automation without importing PoC;
- PoC runs the complete seven-day week through GameSession and SemanticGamePort;
- Auto/Quick/Manual Save, strict import, State Dump, DebugBundle and replay work with RunIntegrity;
- Debug/Cheat/Automation default off and can be enabled in the same PoC Artifact;
- Pointer supports mouse/touch, semantic DOM supports keyboard/readers, and DOM/Port action semantics agree;
- code-native fallback assets provide a complete experience without approving archived AIGC candidates;
- `dist/poc` is reproducible, nested-base-safe, technically deployable and is the same artifact exercised by release smoke;
- all fast tests, Chromium/WebKit, accessibility, artifact, docs and release gates pass without modifying tracked baselines;
- final worktree status and any deliberately retained user changes are explicitly reported;
- no remote deployment, asset approval or subjective playtest result is claimed without separate user action.
