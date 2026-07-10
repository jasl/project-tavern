# React Game Harness First Iteration Execution Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade React + TypeScript game-development Harness, load the complete non-canonical seven-day tavern Story, and finish with a verified deploy-ready Player artifact plus a Developer playground.

**Architecture:** Execute five ordered implementation plans. A neutral, build-time `GameProfile` statically composes named modules behind one explicit `CommandCoordinator`; contracts and deterministic foundations land first; pure simulation and Story follow; browser persistence and diagnostics wrap the engine; React UI and approved assets consume the public application port; release hardening makes the exact tested Player artifact deployable. Every phase produces independently reviewable, testable commits and must pass its own exit gate before the next phase starts.

**Tech Stack:** Node.js 24.18.0 LTS, pnpm 11.11.0, TypeScript 7.0.2 authoritative CLI plus `@typescript/typescript6` 6.0.2 wrapping the TS 6.0.3 API for third-party tooling, React 19.2.7, Vite 8.1.4, Zod 4.4.3, Zustand 5.0.14, IndexedDB/idb 8.0.3, Radix Primitives, Motion, Lucide, Vitest 4.1.10, fast-check 4.9.0, React Testing Library, Playwright 1.61.1, dependency-cruiser 18.0.0.

## Global Constraints

- Treat Harness code as production code; the seven-day Story, balance, prose, and generated visual candidates remain replaceable.
- The only authoritative mutable game container is `GameSnapshot = { state, rng, commandSequence }`; React, Story code, persistence, and debug UI never mutate it directly.
- `GameProfile` is a neutral static composition root, not a runtime plugin registry. Named modules own exact state paths and never write another owner; `CommandCoordinator` is the only cross-module transaction orchestrator.
- The engine is deterministic and synchronous: no DOM, React, IndexedDB, network, wall clock, environment randomness, or `Math.random()` imports.
- Story content is validated serializable IR; executable Story code exists only in the exhaustive synchronous `StoryRulesV1` slots.
- Runtime controls use semantic DOM/CSS/Radix/Lucide; do not convert the Image Gen UI concept into rasterized interactive controls.
- `references/` is ignored, never imported, scanned, copied, bundled, tested against, or used as AIGC input.
- Player-facing/design prose is Chinese; identifiers and internal stable codes are English.
- Player flow supports mouse, touch, and keyboard from 1024×768 through 16:10; 200% zoom uses functional reflow; no hover-only information.
- Use TDD for every behavior slice: focused failing test, confirm the expected failure, minimal implementation, focused pass, wider relevant suite, then commit.
- Use exact dependency versions and a frozen `pnpm-lock.yaml`; lifecycle build scripts are allowlisted only for `esbuild` and `sharp`.
- Do not weaken tests, regenerate baselines silently, add arbitrary callbacks, or broaden scope to resolve implementation friction.
- No backend, accounts, runtime LLM, telemetry upload, PWA, Service Worker, real-time combat/exploration, minigames, staff schedules, decoration sandbox, Mod SDK, adult content, formal 3D, or cross-Story-revision save migration.
- A task is not complete until its listed command exits 0 and `git diff --check` passes.

---

## Plan Set and Required Order

| Phase | Plan                                                                                                                                         | Independent deliverable                                                                                                        | Exit gate                |
| ----: | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
|     1 | [`2026-07-10-react-game-harness-01-foundation-contracts.md`](2026-07-10-react-game-harness-01-foundation-contracts.md)                       | Pinned toolchain, exhaustive v1 contracts, canonical JSON, PRNG, Story bootstrap, digest manifests                             | `pnpm verify:foundation` |
|     2 | [`2026-07-10-react-game-harness-02-simulation-story.md`](2026-07-10-react-game-harness-02-simulation-story.md)                               | Deterministic domains, workflows, narrative, seven-day Story, golden/property tests                                            | `pnpm verify:simulation` |
|     3 | [`2026-07-10-react-game-harness-03-runtime-persistence-diagnostics.md`](2026-07-10-react-game-harness-03-runtime-persistence-diagnostics.md) | EngineSession, queries/ViewModels, IndexedDB slots/leases, save import/export, dump/replay                                     | `pnpm verify:runtime`    |
|     4 | [`2026-07-10-react-game-harness-04-ui-assets-accessibility.md`](2026-07-10-react-game-harness-04-ui-assets-accessibility.md)                 | Player/Developer shells, code-native fallback stage, overlays, VN, DevDock, responsive/a11y flow, optional approved-art branch | `pnpm verify:ui`         |
|     5 | [`2026-07-10-react-game-harness-05-release-hardening.md`](2026-07-10-react-game-harness-05-release-hardening.md)                             | Full CI, reproducible Player artifact, security/base-path smoke, runbooks, optional Pages handoff                              | `pnpm verify`            |

Do not parallelize phases. Within a phase, tasks remain ordered unless the plan explicitly states that two read-only reviews can run concurrently.

## Specification Coverage Matrix

| Authoritative requirement                                                                      | Primary implementation tasks                                                | Verification evidence                                                                                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Harness design §§4–8: GameProfile/module ownership, Snapshot, contracts, deterministic kernel  | Phase 1 Tasks 2–4; Phase 2 Task 1                                           | profile composition/owner/acyclic contracts, RNG vector, coordinator transaction identity/immutability, dependency rules |
| Harness design §§9–12: time, workflows, Narrative, StoryPackage, rules, identities             | Phase 1 Tasks 5–6; Phase 2 Tasks 2–8                                        | Story bootstrap, scheduler/workflow round trips, formal/E2E RNG consumption, digest manifests                            |
| Harness design §§13–14 and visual baseline §§2–7: stage, HUD, overlays, VN, optional docks     | Phase 3 Task 1; Phase 4 Tasks 1–6                                           | ViewModel boundary, RTL behavior, Player bundle exclusion, responsive/a11y E2E                                           |
| Harness design §§15–17: Save/Quick/Auto, IDB recovery, DebugBundle, replay, errors             | Phase 3 Tasks 2–7; Phase 4 Tasks 8–9                                        | hostile import corpus, CAS/fencing matrix, recovery round trips, authoritative replay, UI recovery                       |
| Harness design §18 and visual baseline §§8–11: generated assets, provenance, approval, budgets | Phase 4 mandatory Task 1 and optional Task 7; Phase 5 Tasks 1 and 4         | fallback-only/runtime manifests, separate selection/terms gates, asset validation, notices, artifact scan                |
| Harness design §§19–22: routes, builds, CI, security, production quality                       | Phase 1 Task 7; Phase 4 Task 9; Phase 5 Tasks 1–4                           | phase gates, clean `pnpm verify`, reproducible manifest, same-run protected Pages job, runbooks                          |
| Harness design §§23–24: delivery acceptance and stop lines                                     | Roadmap Goal Boundary/Architecture Stop Lines; every phase completion check | checkpoint reviews and explicit external handoffs                                                                        |
| PoC charter, rules, balance, content, and reference strategies                                 | Phase 2 Tasks 2–9; Phase 4 Tasks 3–5 and 9                                  | six strategies, 1,000 seeds, golden week, full seven-day UI flow                                                         |
| Long-term game-design baseline without expanding the first PoC                                 | Roadmap constraints; Phase 2 Story scope; Phase 4 presentation              | excluded-system scan and post-playtest handoff rather than speculative mechanics                                         |

If an authoritative section cannot be mapped to a concrete task and test above, stop at Task R1 and amend the plans before implementation.

## Goal Boundary

Recommended Goal objective:

> Implement the five React Game Harness plans in order, preserving their TDD and review checkpoints, until `pnpm verify` passes from a clean checkout and the tested `tavern-poc` Player artifact is deploy-ready. Stop for the documented external approvals and architecture stop lines; do not claim Pages deployment or human PoC validation unless those handoffs actually occur.

The engineering Goal is complete when all of the following are true:

- all mandatory tasks in the five implementation plans are checked off; every task that specifies a checkpoint commit has that commit present, while verification-only Phase 5 Task 5 has its recorded evidence instead; optional Phase 4 Task 7 is explicitly completed or deferred by the user;
- `tavern-poc` and `e2e` Story builds are independent and digest-addressed;
- a player can finish the full seven-day Story, save/quick-save/load, export a DebugBundle, and restart;
- Developer flavor can inspect state, fix RNG, jump fixtures, and replay an exact compatible bundle;
- the same verified Player artifact passes production Story smoke, base-path smoke, accessibility automation, and security checks;
- `pnpm verify` exits 0 without modifying tracked files or publishing externally;
- repository runbooks explain bootstrap, Story authoring, asset approval, save recovery, diagnostics privacy, release, and rollback.

The following are external handoffs, not silent Goal assumptions:

- **Generated-asset selection and terms approval:** Phase B generation requires a separate explicit instruction; the user alone marks a candidate `selected`, and a human separately marks terms `approved`. Until both happen, images remain source candidates outside every runtime bundle.
- **Golden fixture review:** the first generated command/state/ledger fixtures require an explicit human review commit before becoming immutable baselines.
- **GitHub Pages:** no remote currently exists. Without explicit repository/push/Pages authority, stop at the verified deploy-ready artifact and workflow files.
- **Real-device smoke:** a human performs the required landscape-tablet and VoiceOver smoke using the runbook.
- **Human playtest gate:** the five-person PoC study in `docs/poc/poc-charter.md` happens after engineering delivery and is not simulated by automated tests.

## Checkpoints

### Task R1: Approve and start Phase 1

**Files:**

- Review: all six files in `docs/superpowers/plans/`
- Review: `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md`

**Interfaces:**

- Consumes: approved Harness, PoC, and visual specifications.
- Produces: explicit authority to create a Goal or start plan execution.

- [ ] **Step 1: Confirm the plan suite has no requested changes**

Record approval of both the plan suite and the new field-level Contract Catalog in the Codex task. Do not create a Goal from implied approval.

- [ ] **Step 2: Choose an execution mode**

Use `superpowers:subagent-driven-development` for a fresh implementer and reviewer per task, or `superpowers:executing-plans` for inline batch checkpoints.

- [ ] **Step 3: Create the Goal only after explicit user instruction**

Use the exact objective above. Do not set a token budget unless the user supplies one.

### Task R2: Phase 1 exit review

**Files:**

- Review: Phase 1 diff and commits
- Review: `package.json`, `pnpm-lock.yaml`, `src/engine/contracts/`, `src/engine/core/`, `scripts/`

**Interfaces:**

- Consumes: Phase 1 implementation.
- Produces: frozen contracts and toolchain consumed by every later phase.

- [ ] **Step 1: Run the phase gate**

Run: `pnpm verify:foundation`

Expected: exit 0; contract, canonical JSON, PRNG, Story bootstrap, dependency-boundary, and digest-reproducibility suites all pass.

- [ ] **Step 2: Review public contract churn**

Confirm every `GameCommandV1`, `DomainFactV1`, `RejectionReasonV1`, `EffectIntentV1`, `ModifierV1`, `StoryRulesV1`, Query, Save, and Debug type is exhaustive and versioned. Confirm the `GameProfile` module set, state owner table, dependency graph and `CommandCoordinator` routing are closed and tested. Any ambiguity returns to the design spec before Phase 2.

### Task R3: Phase 2 exit and golden approval

**Files:**

- Review: `src/stories/tavern-poc/`
- Review: `src/test/fixtures/golden/`

**Interfaces:**

- Consumes: deterministic simulation and Story.
- Produces: approved seven-day baselines for runtime/UI work.

- [ ] **Step 1: Confirm the already completed human golden approval**

Phase 2 Task 9 must already have presented the generated diff, received explicit human approval, and created the separate `test: approve seven-day golden fixtures` commit before its verifier could pass. Inspect that commit and the complete command JSON (including explicit Story actions), per-command state digests, nightly ledgers, persisted resolved checks, and three-dimensional completion. Do not create a second approval commit and do not infer approval from a green test.

- [ ] **Step 2: Run the phase gate against the approved bytes**

Run: `pnpm verify:simulation`

Expected: exit 0 with the approved fixtures unchanged; six reference strategies, 1,000-seed metrics, StoryAction/Narrative/Scheduler/WorldAction round trips, ledger conservation, and property invariants pass.

### Task R4: Phase 3 exit review

**Files:**

- Review: `src/runtime/session/`, `src/runtime/persistence/`, `src/runtime/diagnostics/`

**Interfaces:**

- Consumes: pure engine and approved Story.
- Produces: browser-safe state recovery and reproduction.

- [ ] **Step 1: Run the phase gate**

Run: `pnpm verify:runtime`

Expected: exit 0; fake IndexedDB concurrency, fencing, strict compatibility refusal, strict imports, bounded CommandLog, and authoritative replay tests pass.

### Task R5: Phase 4 visual and UX review

**Files:**

- Review: `src/ui/`, `src/stories/tavern-poc/assets/`, screenshots in the Playwright report

**Interfaces:**

- Consumes: application port and optional approved runtime art.
- Produces: a complete Player and Developer browser experience.

- [ ] **Step 1: Resolve asset approval checkpoint**

Stop once and ask the user to choose **execute Phase B** or **defer Phase B**. Only an explicit choice resolves this checkpoint: execute runs generation/selection/terms checkpoints and integrates only selected plus approved normalized exports; defer records the user's decision, keeps the strictly validated code-native fallback pack, and continues to Task 8. Silence, an unrelated continuation message, or the agent's preference cannot auto-defer or auto-select art.

- [ ] **Step 2: Run the phase gate**

Run: `pnpm verify:ui`

Expected: exit 0 at 1024×768, 1280×800, 1600×1000, ultrawide, 200% zoom, reduced motion, keyboard-only, touch emulation, Chromium, and WebKit fixtures.

### Task R6: Phase 5 release review and external handoff

**Files:**

- Review: `.github/workflows/`, `docs/runbooks/`, `dist/player/manifest.sha256`

**Interfaces:**

- Consumes: all prior phases.
- Produces: the final verified artifact and optional authorized deployment.

- [ ] **Step 1: Run the full clean verification**

Run: `pnpm install --frozen-lockfile && pnpm verify`

Expected: exit 0; no tracked-file diff.

- [ ] **Step 2: Verify reproducible artifact bytes**

Run: `pnpm release:repro`

Expected: two clean Player builds produce identical sorted SHA-256 manifests.

- [ ] **Step 3: Stop or deploy according to authority**

Without explicit GitHub authority, attach the smoke-tested Player artifact and report the exact missing handoff. With authority, push the reviewed branch, run the protected Pages workflow, and execute the post-deploy smoke from the release-hardening plan.

## Architecture Stop Lines

Stop the Goal and return to design discussion if any task requires:

- direct `GameState` mutation outside command transactions;
- a Story import of Runtime/UI/Persistence or an unregistered callback;
- an Engine branch on a concrete Story ID;
- ownership of Event/Narrative/Quest/Fact/Aura that cannot be assigned to one module;
- a save or dump that cannot separate authoritative state from diagnostics/UI context;
- a digest that differs for identical clean inputs;
- an E2E test coupled to unstable production prose or balance;
- Player functionality that only exists in Developer sidebars;
- weakening production boundaries to make the seven-day Story pass;
- a new critical ambiguity with two reasonable implementations.
