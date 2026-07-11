# Project Tavern First PoC Execution Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, deterministic, modular Web game runtime and a complete non-canonical seven-day Tavern Demo—including an independent module-integration E2E Story, bootstrap Hotfixes, safe local persistence, replay/diagnostics, accessible React UI, and a reproducible deploy-ready Player artifact—without adding deferred gameplay systems.

**Architecture:** Generic MIT `@project-tavern/base` and `@project-tavern/ui` remain independent of tavern concepts. Each Story statically composes typed PolyForm gameplay Modules behind one CommandCoordinator, supplies its own rules/content/Scenes/assets, and communicates with UI through immutable RuntimeViewModels and narrow Application/Presentation ports. Work proceeds from a synthetic walking skeleton to real Modules, then E2E integration, runtime services, Demo content, UI, and release hardening; each checkpoint leaves independently runnable green software.

**Tech Stack:** Node.js 24.18.0, pnpm 11.11.0, TypeScript 7.0.2, React 19.2.7, Vite 8.1.4, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, IndexedDB/idb 8.0.3, Playwright 1.61.1, CSS Modules, GitHub Pages.

## Global Constraints

- The user approved the runtime direction and requested this implementation plan on 2026-07-11. The architecture and Contract Catalog are frozen for Goal execution after the specification-closure edits in this plan commit.
- Before every phase, re-read live `AGENTS.md`, the three authoritative specs, the phase plan, package exports, scripts, routes, `git status`, and the previous checkpoint evidence. Live repository state wins over remembered file paths.
- The first Goal covers automated engineering delivery and a feedback-ready artifact. It does not claim the game is fun, declare the five-person playtest passed, approve generated assets, start Unity, or authorize a remote deployment.
- Do not create Electron, `stories/common`, a public npm release, a Mod manager, a package store, a migration framework, ECS, event bus, CQRS/event sourcing, dependency-injection container, generic scripting DSL, or visual Story editor.
- Simulation is snapshot-authoritative and command-driven. One coordinator owns candidate commit/sequence/RNG; a Module cannot write state owned by another Module; UI and Hotfix never write State.
- `stories/e2e` is the first real consumer of all public Modules and owns independent minimal content. It must not import Demo Story content, private helpers, fixtures, text, or IDs.
- Browser E2E proves integration and player-visible outcomes. Formula ordering, rejection details, invariants, and balance distributions stay in fast Vitest/fast-check suites.
- Code-native asset fallbacks are a complete mandatory deliverable. The four current Phase A candidates are terms-approved but remain unselected and therefore excluded; future terms-pending art remains excluded until terms approval, and no candidate enters runtime without explicit user selection.
- The existing MIT / PolyForm Noncommercial / CC BY-NC-SA boundaries remain authoritative. Run licensing verification after every new package, dependency, asset, manifest, or artifact change.
- Every behavior task uses TDD: focused red test for the target behavior, confirmed expected failure, minimal implementation, focused green, phase gate, current `pnpm verify`, staged-diff review, commit.
- The first red test must fail on the missing target behavior, not on a broken toolchain, missing browser binary, invalid fixture, unrelated type error, or test syntax error.
- Every committed state is green for the verification surface available at that commit. No commit may rely on a later task to repair known failures.
- Update golden files, persistence fixtures, or screenshots only through explicit side-effecting commands. Verification and CI never rewrite tracked baselines.
- Do not publish, push, deploy, approve an asset, or change external repository settings without explicit authority. A verified local artifact is sufficient for the engineering Goal.

---

## Plan Set and Required Order

1. [`2026-07-11-project-tavern-01-foundation-walking-skeleton.md`](2026-07-11-project-tavern-01-foundation-walking-skeleton.md)
2. [`2026-07-11-project-tavern-02-modules-e2e-story.md`](2026-07-11-project-tavern-02-modules-e2e-story.md)
3. [`2026-07-11-project-tavern-03-persistence-diagnostics.md`](2026-07-11-project-tavern-03-persistence-diagnostics.md)
4. [`2026-07-11-project-tavern-04-demo-story-golden.md`](2026-07-11-project-tavern-04-demo-story-golden.md)
5. [`2026-07-11-project-tavern-05-ui-assets-accessibility.md`](2026-07-11-project-tavern-05-ui-assets-accessibility.md)
6. [`2026-07-11-project-tavern-06-release-pages.md`](2026-07-11-project-tavern-06-release-pages.md)

The order is mandatory. A phase may add tests for later behavior, but it may not implement around an unaccepted earlier interface. If a phase changes a public contract, stop, update the authoritative spec and contract test first, obtain user review when the change is material, then revise all affected later plans.

## Recommended Goal Objective

When the user explicitly asks to start execution, create one Goal with this objective and no inferred token budget:

> 从已确认的 Project Tavern 架构、字段 ABI 与许可边界出发，严格按 `docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md` 的阶段顺序和停止线，构建生产级 React + TypeScript Web 游戏运行时、真实 Modules、独立 E2E Story、七日 Demo Story、存档/重放/诊断、Player/Developer UI 与可复现发布制品；使全部强制自动化验收通过并交付可供人工试玩的版本，不自行批准素材、发布远端制品或宣告主观 PoC 试玩闸门通过。

The Goal stays active across all mandatory phases. Phase completion is recorded with plan progress/checkpoints; do not mark the Goal complete merely because one phase finished or the remaining work is large.

## Stable Public Command Surface

Phase 1 creates these script names and later phases extend their real work. No script may be a no-op or print success without executing its owned checks.

```text
pnpm format:check            read-only Prettier conformance
pnpm lint                    type-aware Oxlint policy; never replaces TS7 tsc
pnpm typecheck               authoritative whole-workspace TypeScript 7 check
pnpm verify:toolchain        exact Node/pnpm/TS7 and tool isolation
pnpm verify:licensing        project legal files, project package metadata, owned-source/artifact scope
pnpm verify:boundaries       package/facet/import rules and references exclusion
pnpm verify:cycles           production import graph cycles
pnpm verify:stories          Demo/E2E/Sandbox Story validation
pnpm verify:fixtures         read-only persistence/debug fixture validation
pnpm verify:golden           read-only strategy golden validation
pnpm verify:balance          fixed 1..1000 seed thresholds
pnpm verify:assets           provenance, compiled manifests, runtime budgets
pnpm verify:ui               RTL, UI flavor, responsive and accessibility checks
pnpm verify:bundle           Player/Developer graph and emitted-byte checks
pnpm verify:artifact         production manifest, base path and smoke
pnpm verify:release          clean double-build and workflow/runbook checks
pnpm test:unit              all unit suites
pnpm test:contract          Base/Module/Story contract suites
pnpm test:property          fast-check invariants and determinism
pnpm test:e2e:smoke         short browser integration on every normal CI run
pnpm test:e2e:full          Chromium and WebKit full integration
pnpm build:player           production Player only
pnpm build:developer        local Developer artifact only
pnpm verify                 complete noninteractive, nonpublishing current gate
```

Side-effecting commands stay separate and are never called by `pnpm verify` or CI:

```text
pnpm regenerate:fixtures
pnpm update:golden
pnpm update:screenshots
pnpm release:prepare
```

## Checkpoints

### Task R0: Record the approved specification baseline

**Files:**

- Read: `AGENTS.md`
- Read: `docs/superpowers/specs/2026-07-10-react-game-harness-design.md`
- Read: `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md`
- Read: `docs/superpowers/specs/2026-07-11-repository-licensing-design.md`
- Read: this roadmap and all six phase plans.

**Interfaces:**

- Consumes: the reviewed plan commit and clean repository.
- Produces: Goal commentary containing exact base SHA, active branch, spec paths, verification results, and explicit acknowledgment of stop conditions.

- [ ] **Step 1: Capture the live baseline**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git log -1 --oneline --decorate
git ls-files references
```

Expected: clean intended branch; a single exact HEAD is recorded; `git ls-files references` prints nothing.

- [ ] **Step 2: Verify the existing legal baseline**

Run:

```bash
node --test scripts/verify-licensing.test.mjs
node scripts/verify-licensing.mjs
git diff --check
```

Expected: Node tests pass 3/3, licensing verification prints `licensing verification passed`, and diff check exits 0.

- [ ] **Step 3: Create the execution Goal only after explicit user authority**

Use the recommended objective verbatim. Do not add a token budget unless the user explicitly requests one. Record the Step 1 SHA as `goal_base_sha` in commentary; it is evidence, not a generated tracked file.

### Task R1: Complete Phase 1 — foundation and walking skeleton

**Files:**

- Execute: [`2026-07-11-project-tavern-01-foundation-walking-skeleton.md`](2026-07-11-project-tavern-01-foundation-walking-skeleton.md)

**Interfaces:**

- Consumes: documentation/legal-only repository.
- Produces: pinned workspace, neutral Base contracts/kernel, Story/Hotfix/asset resolver, generic Session/Application ports, Sandbox Story, minimal generic UI/Web Loader, and a browser walking skeleton.

- [ ] **Step 1: Execute every unchecked Phase 1 task in order**

Use a fresh implementation subagent per task and two reviews: specification compliance first, code quality second. Resolve review findings before checking the task.

- [ ] **Step 2: Run the Phase 1 acceptance block exactly**

Expected: all commands in the Phase 1 Acceptance section exit 0 and the walking skeleton changes state only by dispatching its typed command.

- [ ] **Step 3: Record checkpoint evidence**

Record phase base/head SHA, commits, changed package paths, full commands/results, Story/Engine/app digests, and clean status. Do not start Phase 2 with an unreviewed public Base export.

### Task R2: Complete Phase 2 — real Modules and independent E2E Story

**Files:**

- Execute: [`2026-07-11-project-tavern-02-modules-e2e-story.md`](2026-07-11-project-tavern-02-modules-e2e-story.md)

**Interfaces:**

- Consumes: accepted generic Base/Sandbox skeleton.
- Produces: real gameplay Modules, one Tavern Profile coordinator, full Narrative/Scheduler/workflow mechanics, and independent `stories/e2e` integration fixtures.

- [ ] **Step 1: Re-read live contracts and execute Phase 2 tasks in order**

Expected: owner-local tests precede Profile integration; no E2E code imports Demo.

- [ ] **Step 2: Run Phase 2 acceptance and contamination checks**

Expected: all E2E headless scenarios pass, Module graph is acyclic, Base remains game-neutral, and reject/fault paths preserve exact committed Snapshot/RNG/sequence.

- [ ] **Step 3: Record checkpoint evidence**

Include module owner table, coordinator route coverage, E2E Story ID/revision/digests, fixture IDs, full test output, and clean status.

### Task R3: Complete Phase 3 — persistence, replay, and diagnostics

**Files:**

- Execute: [`2026-07-11-project-tavern-03-persistence-diagnostics.md`](2026-07-11-project-tavern-03-persistence-diagnostics.md)

**Interfaces:**

- Consumes: deterministic E2E Story workflows.
- Produces: FIFO Session completion, atomic Host storage adapter, four slots, CAS/lease/fencing, strict imports/adoption, CommandLog/replay, DebugBundle, and Developer control port.

- [ ] **Step 1: Execute Phase 3 with E2E Story as the real fixture**

Expected: Demo content remains unnecessary; persistence tests cover resumable Opening, Narrative, and WorldAction states.

- [ ] **Step 2: Run Phase 3 acceptance and hostile-import matrix**

Expected: every failure preserves Session and existing records; saved status appears only after read-back verification; lineage attempt 17 is rejected without truncation.

- [ ] **Step 3: Record checkpoint evidence**

Include IndexedDB schema revision, fixture digests, replay vector results, multi-tab matrix, failure/privacy evidence, and clean status.

### Task R4: Complete Phase 4 — seven-day Demo and balance evidence

**Files:**

- Execute: [`2026-07-11-project-tavern-04-demo-story-golden.md`](2026-07-11-project-tavern-04-demo-story-golden.md)

**Interfaces:**

- Consumes: accepted public Modules/runtime.
- Produces: Demo Story data/rules/Narrative/Scenes definitions, six deterministic reference drivers, reviewed golden artifacts, 1..1000 seed metrics, and a headless playable week.

- [ ] **Step 1: Execute content/rule slices in teaching order**

Expected: D1–D7 behavior comes only from authoritative PoC docs; E2E fixtures remain independent.

- [ ] **Step 2: Run Phase 4 acceptance and review every generated baseline diff**

Expected: six reference strategies accept every command, fixed golden digests match, numerical thresholds pass exactly, and no strategy dominates all resources/outcomes.

- [ ] **Step 3: Record checkpoint evidence**

Include Story identity/digests, golden update reason/diff, 1000-seed summary, failures/reproduction seeds, and clean status.

### Task R5: Complete Phase 5 — UI, assets, and accessibility

**Files:**

- Execute: [`2026-07-11-project-tavern-05-ui-assets-accessibility.md`](2026-07-11-project-tavern-05-ui-assets-accessibility.md)

**Interfaces:**

- Consumes: stable runtime ports and complete Demo projections.
- Produces: generic GameShell/Stage/VN/Overlay/DevDock, tavern contributions, governed fallback assets, responsive/a11y browser flows, and static Player/Developer isolation.

- [ ] **Step 1: Execute generic UI before Story-specific renderers**

Expected: generic UI tests use synthetic ports; tavern UI arrives only through contributions.

- [ ] **Step 2: Run Phase 5 acceptance with no asset approval assumptions**

Expected: Player is complete with code-native fallbacks; current Phase A candidates are valid-but-excluded; Chromium/WebKit and accessibility gates pass.

- [ ] **Step 3: Record checkpoint evidence**

Include viewport matrix, a11y results, Player/Developer graph comparison, asset exclusion report, screenshots for stable shells only, and clean status.

### Task R6: Complete Phase 6 — release hardening and deploy-ready handoff

**Files:**

- Execute: [`2026-07-11-project-tavern-06-release-pages.md`](2026-07-11-project-tavern-06-release-pages.md)

**Interfaces:**

- Consumes: complete Player/Developer builds.
- Produces: one full verification entry, reproducible Player artifact, immutable-SHA CI, protected same-artifact Pages workflow, local smoke, runbooks, and an external-action handoff.

- [ ] **Step 1: Execute all local/repository Phase 6 tasks**

Expected: no task publishes; workflows and runbooks are reviewable files.

- [ ] **Step 2: Run the Phase 6 acceptance block from a clean checkout**

Expected: two clean builds produce byte-identical sorted manifests; Player contains required license/notices and no source map/dev/reference/unapproved bytes.

- [ ] **Step 3: Handle remote deployment authority explicitly**

If the user authorizes push/Pages configuration, deploy only the artifact from the same successful workflow and run remote smoke. Otherwise deliver the verified artifact, workflow, and exact activation instructions without claiming deployment.

### Task R7: Close the engineering Goal and hand off subjective playtesting

**Files:**

- Modify: `README.md`
- Modify: `docs/README.md`
- Create: `docs/playtests/first-poc-playtest-guide.md`
- Create: `docs/checkpoints/first-poc-engineering-handoff.md`

**Interfaces:**

- Consumes: all six accepted phases and the final artifact manifest.
- Produces: concise operating/playtest guide, reproducible evidence, known limitations, and next-decision questions.

- [ ] **Step 1: Write the handoff documents from observed evidence**

The checkpoint records exact base/head, all phase commits, tool versions, final Story/Engine/app/patch digests, commands/results, artifact manifest SHA-256, deployment status, excluded assets, known limitations, and no unsupported success claim.

- [ ] **Step 2: Run final verification fresh**

Run:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm verify:release
git diff --check
git status --short --branch
```

Expected: all verification commands exit 0; only the intended handoff documentation remains uncommitted before its commit.

- [ ] **Step 3: Commit the engineering handoff**

```bash
git add -- README.md docs/README.md docs/playtests/first-poc-playtest-guide.md docs/checkpoints/first-poc-engineering-handoff.md
git diff --cached --check
git commit -m "docs: hand off first playable PoC"
```

- [ ] **Step 4: Mark the Goal complete only if the automatic objective is achieved**

Report final token usage if the Goal was budgeted. State clearly that asset selection, remote deployment if unauthorized, five-person feedback, “is it fun?”, balance iteration, Unity, and formal content remain separate decisions.

## Stop Conditions

Stop the current task and return to the relevant specification instead of improvising when any condition below occurs:

- Base requires a tavern/relationship/Story ID, concrete Module, React, DOM, or browser storage type.
- A Module needs the entire Snapshot, writes another owner, creates a read cycle, or a second component attempts to commit sequence/RNG/state.
- Query, preview, and execute cannot share one guard/calculator for the same command.
- UI, Zustand, Hotfix, Story Scene, or Developer tooling needs a direct State setter or raw ResolvedStory internals.
- E2E Story can pass only by importing Demo private content/helper/fixture or by weakening a real Module.
- Simulation and presentation inputs cannot be classified deterministically, import closure contains a forbidden edge, or identical clean builds produce different digest inputs.
- Save adoption requires replaying old commands under new rules, accepting a state-contract mismatch, truncating lineage, or bypassing current PatchSet identity.
- Formula/balance failures can be “fixed” only by silently accepting regenerated golden outputs.
- TypeScript 7 must be replaced as the authoritative typecheck; third-party tool compatibility must stay isolated.
- A new ABI field/kind/code/hook or relaxed JSON escape hatch is required but not first added to the Catalog, Schema, contract tests, and revision policy.
- Project-owned asset provenance, AIGC input review, or generated-output redistribution rights are unclear. Package-manager dependencies and `vendor/**` licensing are outside the automated stop line.
- Candidate/terms-pending/unselected art is about to enter a manifest, digest, screenshot baseline, artifact, or Pages deployment.
- A task grows beyond one independently testable/reviewable outcome; split it before continuing.
- A gameplay problem prompts a new system outside PoC instead of first changing information, numbers, automation, or deleting a rule.

## Definition of Done

The engineering Goal is complete only when:

- all mandatory checkboxes in all six phase plans and Tasks R0–R7 are checked with evidence;
- `pnpm install --frozen-lockfile`, `pnpm verify`, and `pnpm verify:release` pass from a clean checkout;
- E2E Story covers every real Module, VN branch/rejoin, interrupted Opening save/resume, emergency closure, facility/Aura effects, two-step WorldAction, levy/ending, Hotfix, State Dump, and authoritative replay without Demo imports;
- Demo Story completes D1–D7 through all six reference strategies, fixed golden artifacts, and exact 1..1000 seed thresholds;
- Player/Developer builds are statically separated; Player has no Developer/development/reference/source-map/unapproved asset bytes;
- UI works at required viewports, keyboard/touch/200% zoom/reduced-motion, and Chromium/WebKit automated accessibility gates;
- Player artifact is reproducible, has a sorted SHA-256 manifest, includes the correct multi-license notices, passes nested-base local smoke, and is deploy-ready;
- any actual remote deployment used the same verified workflow artifact and passed remote smoke, or the handoff explicitly states deployment was not authorized;
- the repository is clean and the final checkpoint distinguishes automated correctness from pending subjective playtesting and asset approval.
