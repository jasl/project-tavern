# React Game Harness Phase 2 Simulation and Seven-Day Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete deterministic game engine, narrative/workflow mechanics, non-canonical seven-day tavern Story, reference strategies, golden ledgers, and property invariants without importing browser or UI concerns.

**Architecture:** The neutral Phase 1 `GameProfile` statically composes named domain modules. Each module owns exactly its declared, non-overlapping state paths; v1 has no direct Module-to-Module read edges. The sole `CommandCoordinator` combines public read-only projections with owner-scoped proposal/apply capabilities and routes every Story/Narrative/Scheduler effect through the exhaustive `EffectIntentRouter`. Story rules provide demand, settlement, checks, and endings through `StoryRulesV1`; Narrative and Scheduler produce proposals but never mutate other domains directly. `OpeningSession` and `WorldActionSession` are the only resumable workflows.

**Tech Stack:** Phase 1 contracts/kernel/profile, TypeScript 7.0.2 authoritative CLI, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0.

## Global Constraints

- Phase 1 must be green and its public ABI reviewed before this plan starts.
- Implement every temporary command stub; `pnpm verify:simulation` fails if any `command.handler_not_implemented` path remains reachable.
- `Calendar` alone changes day/phase/AP; `Inventory` alone changes cash/items/batches; `Actors` alone changes actor resources/relationship quantities; `Status` alone applies/expires Auras.
- `Progression` alone changes Fact/Quest/Outcome/ResolvedCheck; Ending evaluation returns a terminal proposal, while only `Run` applies `simulation.run.status/completion`. Coordinator atomically combines both with the Inventory levy proposal.
- No Module imports another Module's read port or owner capability. Coordinator alone assembles cross-domain DTOs and commits owner proposals.
- `InventoryState.ledger` is the only cash/valuation authority. Story-authored arbitrary deltas use only `ledger.append`; the closed `inventory.grant` composite may create only its required story-reward valuation entries. No `cash.adjust`, direct Story cash mutation, or caller-managed paired second ledger path exists.
- Every Demand/Tavern/Check/Ending call goes through Phase 1's single `invokeStoryRule` boundary; Story rules return validated data/intents, and Engine validates and atomically applies them. No domain calls a Story rule function or output Schema directly.
- `tavern-poc` revision 1 consumes RNG only for 12 StartRun demand draws and the later two D6 check draws.
- Formal seven-day Story has no random opening event; E2E Story covers the opening Scheduler between Start/Finalize.
- Do not add gameplay beyond `docs/poc/`; balance changes require an explicit doc + expectation change.
- No UI text assertions in engine tests; assert stable IDs, reason codes, events, ledgers, and state.

---

## File Map

```text
src/engine/domains/run/              # lifecycle and terminal status
src/engine/domains/calendar/         # policy, AP, phase/day advancement
src/engine/domains/actors/           # stamina, mood, affection, teamwork
src/engine/domains/status/           # Aura instances and expiry
src/engine/domains/inventory/        # cash, batches, FIFO, spoilage
src/engine/domains/facilities/       # fixed availability/build effects
src/engine/domains/tavern/           # plan, opening baseline, settlement application
src/engine/domains/workflow/         # sole ActiveWorkflow owner and mutual exclusion
src/engine/domains/world/            # WorldActionSession mechanics
src/engine/domains/progression/      # Fact/Quest/Outcome/ResolvedCheck owner and ending proposals
src/engine/narrative/                # IR runner and atomic choice handling
src/engine/scheduling/               # deterministic checkpoint candidates
src/engine/replay/                   # pure command replay/comparison
src/stories/tavern-poc/              # full seven-day data/rules/content
src/stories/e2e/                     # stable mechanics fixtures
src/test-support/strategies/         # deterministic public-command drivers
src/test/fixtures/golden/            # reviewed command/state/ledger artifacts
```

### Task 1: Materialize initial state, lifecycle, CommandCoordinator, and global invariants

**Files:**

- Create: `src/engine/domains/run/run-state.ts`
- Create: `src/engine/domains/run/run-commands.ts`
- Create: `src/engine/domains/run/run.test.ts`
- Create: `src/engine/domains/workflow/workflow-state.ts`
- Create: `src/engine/domains/workflow/workflow-port.ts`
- Create: `src/engine/domains/workflow/workflow.test.ts`
- Create: `src/engine/domains/progression/progression-state.ts`
- Create: `src/engine/domains/progression/progression-effects.ts`
- Create: `src/engine/domains/progression/progression.test.ts`
- Modify: `src/engine/core/bootstrap-story.ts`
- Modify: `src/engine/core/invariants.ts`
- Create: `src/engine/core/invariants.test.ts`
- Modify: `src/engine/profile/command-coordinator.ts`
- Modify: `src/engine/profile/effect-intent-router.ts`

**Interfaces:**

- Consumes: `LoadedStory`, seed, runId, transactional kernel.
- Produces: complete setup Snapshot, `run.start`, lifecycle states, the sole owner-scoped ActiveWorkflow transition port, the Progression owner capability required by later Narrative/Scheduler effects, and all-domain invariant aggregation.

- [ ] **Step 1: Write failing setup/start tests**

Using Phase 1's minimal valid LoadedStory fixture and its synchronous test Demand rule (not the not-yet-authored formal tavern-poc rule), assert `createInitialSnapshot` stores the caller's exact `initialSeed`, sets `completion=null`, `resolvedChecks=[]`, `setup`, sequence 0, rawDrawCount 0, empty `demandSeeds`, Catalog-exact idle Narrative/stage, no workflow, and consumes zero RNG. Before Start, every other GameCommand—including `policy.choose`—returns exact `run.not_started`. First `run.start` preserves that seed, consumes exactly 12 demand-offset draws, records every Story base line plus its -1/0/+1 offset without future reputation/Fact effects, materializes D1 currentDemand, increments sequence once, remains setup, and atomically starts the manifest initial Scene with `NarrativeSource.kind="manifest_start"`. Feed the blocking-scene arbiter a second test proposal and prove conflict rollback; Task 6 supplies the real Scheduler producer. While the Scene is active, `policy.choose` is blocked and repeated `run.start` returns `run.already_started`. Since the Narrative interpreter does not exist until Task 5, use a separate strict-schema completed-manifest Snapshot fixture only to prove the post-scene guard (`run.policy_required` for non-policy commands); do not add a hidden drain/jump implementation here.

Also prove only the Workflow module can establish, advance, or clear `simulation.activeWorkflow`; a second workflow is rejected without mutation. Tavern and World handlers receive this owner-scoped port through CommandCoordinator and never assign the field directly.

Table-drive `fact.set`, `quest.set`, and `outcome.set` through the Phase 1 EffectIntentRouter into the Progression owner. Prove exact Story definitions/references/reasons, authored ordering, and whole-batch rollback; no Narrative/Scheduler code writes `state.story` directly. Initialize and round-trip `resolvedChecks=[]`; its append operation remains owner-scoped and Task 7 adds check semantics.

- [ ] **Step 2: Confirm focused failure**

Run: `pnpm vitest run src/engine/domains/run/run.test.ts src/engine/domains/workflow/workflow.test.ts src/engine/domains/progression/progression.test.ts src/engine/core/invariants.test.ts`

Expected: FAIL on missing lifecycle/domain state.

- [ ] **Step 3: Implement lifecycle and initial materialization**

Extend Phase 1's `createInitialSnapshot` in `bootstrap-story.ts`; do not create a second initialization entry point. Use Story initial state plus Engine defaults. Allowed run status is exactly:

```text
setup | active | completed_stable | completed_danger | failed_arrears
```

Only policy choice enters `active`; only levy resolution enters terminal states.

- [ ] **Step 4: Implement global invariant aggregation**

Extend Phase 1's `invariants.ts`; do not create a parallel invariant module. At minimum reject unsafe/non-finite numbers, inverted or illegally negative ranges, out-of-range Story integer defaults, invalid day/phase/AP, negative cash or inventory quantities, duplicate batch IDs, stamina/mood violations, invalid workflow/phase combinations, missing Story/ModifierSource references, terminal state with an active workflow, malformed/changed `initialSeed`, invalid or duplicate/out-of-order `resolvedChecks`, terminal/non-terminal `completion` mismatch, and ledger imbalance.

- [ ] **Step 5: Replace the Coordinator's run command stubs and prove rollback**

Wire `run.start` through the exhaustive switch and the same blocking-scene arbiter later used by StoryAction, WorldAction, and Scheduler. Wire the three Progression-owned EffectIntent kinds through the existing exhaustive Router. With the Phase 1 test Story, force an invalid demand rule output, an invalid Progression reference, and a second generic blocking-scene proposal; assert state/RNG/sequence/Narrative/Story rollback plus the exact structured fault. Do not implement or import Scheduler in this task.

- [ ] **Step 6: Run focused and foundation regression suites**

Run: `pnpm vitest run src/engine/domains/run src/engine/core && pnpm verify:foundation`

Expected: PASS.

- [ ] **Step 7: Commit lifecycle and invariants**

```bash
git add src/engine/domains/run src/engine/domains/workflow src/engine/domains/progression src/engine/core/bootstrap-story.ts src/engine/core/invariants.ts src/engine/core/invariants.test.ts src/engine/profile/command-coordinator.ts src/engine/profile/effect-intent-router.ts
git commit -m "feat: add run lifecycle and game invariants"
```

### Task 2: Implement Calendar, Actors, and Aura ownership

**Files:**

- Create: `src/engine/domains/calendar/calendar-state.ts`
- Create: `src/engine/domains/calendar/calendar-commands.ts`
- Create: `src/engine/domains/calendar/calendar.test.ts`
- Create: `src/engine/domains/actors/actor-state.ts`
- Create: `src/engine/domains/actors/actor-commands.ts`
- Create: `src/engine/domains/actors/actors.test.ts`
- Create: `src/engine/domains/status/aura-state.ts`
- Create: `src/engine/domains/status/aura-commands.ts`
- Create: `src/engine/domains/status/status.test.ts`
- Modify: `src/engine/domains/run/run-commands.ts`
- Modify: `src/engine/domains/run/run.test.ts`
- Modify: `src/engine/profile/command-coordinator.ts`
- Modify: `src/engine/profile/effect-intent-router.ts`

**Interfaces:**

- Consumes: policy/balance data and EffectIntent validators.
- Produces: policy choice, prepare/rest, phase advancement, night recovery, mood/relationship adjustments, Aura apply/clear/expiry.

- [ ] **Step 1: Write policy/AP/phase tests first**

Encode exact PoC policy table:

```text
balanced: morning 2, afternoon 2, evening 2, player recovery 3
night_owl: morning 1, afternoon 2, evening 3, player recovery 2
heroine base recovery: 3
```

Using the same strict-schema completed-manifest fixture (not an EngineSession replacement path), `policy.choose` atomically combines Calendar's policy/AP proposal with Run's `setup → active` proposal; a forced failure in either owner rolls both back. Task 5 later proves the real run.start → Narrative drain → policy sequence. Policy is mandatory and immutable for the week, AP never carries, and only the `calendar.advance_phase` command may request phase/day change. At this task boundary every other Calendar test remains owner-local: Calendar writes no Actors/Status/Tavern/Inventory field. Every AP/stamina/mood/recovery proposal preserves the exact Story-authored `ChangeReasonV1.reasonId`; base player/heroine night recovery uses the LifePolicy/StoryBalance bindings, while facility/Aura recovery uses the selected Modifier's reason. Recovery vectors preserve signed base/bed/strain components, compute `max(0,sum)` once, clamp only the upper bound once, and prove strain cannot become damage. Costs and negative Story effects first reject insufficient stamina instead of lower-clamping to a successful zero; debug absolute set rejects values above maximum. Emergency closure, spoilage, demand materialization, and Scheduler integration are deliberately deferred until their owners exist in Tasks 3–6.

- [ ] **Step 2: Write actor/Aura failure cases**

Cover insufficient AP/stamina, rest and generic actor-cost proposals, mood clamp -2..2, no passive affection loss, `heroine.angry`, `tavern.sign_repaired`, and `player.adventure_strain` exact owner-local lifecycles from `docs/poc/simulation-rules.md` section 8. Table-drive pure Aura boundary proposals for every countdown unit; Task 6 proves their placement in complete phase/day/Opening transactions. Rejected/faulted local proposals do not decrement. The cross-owner `actor.prepare_food` command and its shared daily limit wait for Tavern ownership in Task 4. At `StoryBalance.levyDue`, Calendar validation rejects with `calendar.phase_blocked { blocker:"levy_due" }` and leaves D7 afternoon payable.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/engine/domains/run src/engine/domains/calendar src/engine/domains/actors src/engine/domains/status`

Expected: FAIL because domain handlers are missing.

- [ ] **Step 4: Implement named pure validate/apply functions**

Use `validateAdvancePhase` + `proposeAdvancePhase`, `validateActorAction` + `proposeActorAction`, and `proposeAuraBoundary`. Only each owner capability can apply its proposal to its own candidate path. Implement the existing Router capabilities for `calendar.ap.adjust`, all five Actors/relationship kinds, and both Aura kinds; the frozen kind→owner map itself cannot change. Calendar receives no whole Snapshot or cross-owner writer; the complete `calendar.advance_phase` Coordinator recipe is wired after Inventory/Tavern/Scheduler exist.

- [ ] **Step 5: Prove owner-local proposal contracts**

Deep-freeze each owner input and assert validation is pure, each proposal carries its exact before/after and ordered DomainFacts, and applying it changes only the owner's frozen paths. Prove the Coordinator can combine Calendar+Actors+Status proposals in a candidate and fully roll them back on a forced later failure, without claiming the not-yet-implemented Inventory/Tavern/Scheduler sequence. Task 6 owns the complete day-boundary order test.

- [ ] **Step 6: Run domain and invariant tests**

Run: `pnpm vitest run src/engine/domains/run src/engine/domains/calendar src/engine/domains/actors src/engine/domains/status src/engine/core/invariants.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Calendar/Actors/Status**

```bash
git add src/engine/domains/run src/engine/domains/calendar src/engine/domains/actors src/engine/domains/status src/engine/profile/command-coordinator.ts src/engine/profile/effect-intent-router.ts
git commit -m "feat: add time actor and aura domains"
```

### Task 3: Implement cash, inventory batches, FIFO, spoilage, and facilities

**Files:**

- Create: `src/engine/domains/inventory/inventory-state.ts`
- Create: `src/engine/domains/inventory/inventory-commands.ts`
- Create: `src/engine/domains/inventory/fifo.ts`
- Create: `src/engine/domains/inventory/inventory.test.ts`
- Create: `src/engine/domains/facilities/facility-state.ts`
- Create: `src/engine/domains/facilities/facility-commands.ts`
- Create: `src/engine/domains/facilities/facilities.test.ts`
- Modify: `src/engine/profile/command-coordinator.ts`
- Modify: `src/engine/profile/effect-intent-router.ts`

**Interfaces:**

- Consumes: Story ingredient/facility definitions plus `inventory.buy` and `facility.choose` commands from the v1 Contract Catalog.
- Produces: atomic purchases, stable FIFO consumption plans, spoilage ledger lines, cold-storage and comfortable-bed facility effects.

- [ ] **Step 1: Write FIFO and shelf-life tests**

Sort batches by `lastUsableDay`, `acquiredDay`, then stable batch ID. Verify shelf life `N` means `lastUsableDay = acquiredDay + N - 1`; cold storage adds 2 once to existing and new affected batches; after-service spoilage uses `currentDay >= lastUsableDay`.

- [ ] **Step 2: Write purchase/facility-choice guard tests**

Purchase accepts a non-empty unique line set in one command, enforces the PoC line limit 5 with exact `inventory.line_limit_exceeded`, charges exact Story prices, creates deterministic batch IDs from run/sequence/line order, and never permits negative cash/quantity. Every cash-changing purchase/facility proposal appends the exact catalog ledger entry in the same transaction and emits `cash.changed` referencing those entry IDs. Add an EffectIntent table proving `ledger.append` alone accepts arbitrary Story cash/valuation drafts, `inventory.grant` can only create its deterministic batches plus required `story_reward` valuation entries/event, and an attempted unknown `cash.adjust` fails schema validation before execution. Verify purchase/grant positive valuation, internal consume zero valuation movement, and sold/discarded/spoiled negative valuation conserve every ingredient unit exactly once. `facility.choose` validates the current opportunity ID and accepts the catalog's closed `{ kind: "build", facilityId } | { kind: "skip" }` choice; a known but unoffered facility returns exact `facility.target_not_offered`. Every branch persistently resolves the window exactly once, while only `build` charges/builds/emits typed facility modifiers.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/engine/domains/inventory src/engine/domains/facilities`

Expected: FAIL on missing handlers.

- [ ] **Step 4: Implement immutable consumption proposals**

`planFifoConsumption` returns selected batch slices and shortages without mutation. `applyInventoryDelta` is the only batch/cash write path. Purchase/spoilage and the closed `inventory.grant` composite emit their exact ledger plus DomainFact lines; grant creates deterministic batch IDs and `inventory.ingredient_granted` with positive unit-price valuation entries. Ordinary ingredient consume is an internal inventory→prepared-portions transfer: it emits `inventory.consumed`, freezes batch slices in OpeningBaseline, and does not change total valuation. Finalize revenue/discard entries remove sold/unsold prepared valuation exactly once. Facilities alone apply `simulation.facilities` changes and emit the typed fact without inventing a ledger row; build and skip both emit `facility.choice_committed` with respectively the ActionCost reason and opportunity.skipReasonId. Extend the already-exhaustive EffectIntentRouter's Inventory capability implementation for all five mapped kinds (`inventory.grant`, `inventory.consume`, both item variants, and `ledger.append`), without changing the frozen owner table. In particular `ledger.append` validates the authored draft, allocates the deterministic entry ID, appends once, applies `cashDelta` once, and emits the matching fact in one candidate transaction.

- [ ] **Step 5: Implement facilities through typed modifiers**

Cold storage emits `shelf_life.add_days`; comfortable bed emits `recovery.add`; `skip` records the resolved opportunity without a modifier. Both Event and action availability use the persistent opportunity-undecided condition, so build/skip/reload cannot reopen it. Engine code never switches on Story-specific stable IDs; Story definitions bind IDs to typed modifiers.

- [ ] **Step 6: Run focused and property tests**

Use fast-check to generate batch sets/consumption quantities; assert conservation, stable ordering, no negative quantities, and input immutability.

Run: `pnpm vitest run src/engine/domains/inventory src/engine/domains/facilities`

Expected: PASS.

- [ ] **Step 7: Commit inventory/facilities**

```bash
git add src/engine/domains/inventory src/engine/domains/facilities src/engine/profile/command-coordinator.ts src/engine/profile/effect-intent-router.ts
git commit -m "feat: add inventory and facility domains"
```

### Task 4: Implement demand, plan previews, and the resumable Opening commands

**Files:**

- Create: `src/engine/domains/tavern/demand.ts`
- Create: `src/engine/domains/tavern/service-plan.ts`
- Create: `src/engine/domains/tavern/opening-baseline.ts`
- Create: `src/engine/domains/tavern/start-opening.ts`
- Create: `src/engine/domains/tavern/continue-opening.ts`
- Create: `src/engine/domains/tavern/finalize-opening.ts`
- Create: `src/engine/domains/tavern/settlement.ts`
- Create: `src/engine/domains/tavern/tavern.test.ts`
- Create: `src/stories/tavern-poc/rules/demand-rule.ts`
- Create: `src/stories/tavern-poc/rules/tavern-rule.ts`
- Create: `src/stories/tavern-poc/rules/tavern-rule.test.ts`
- Modify: `src/engine/profile/command-coordinator.ts`
- Modify: `src/engine/profile/effect-intent-router.ts`

**Interfaces:**

- Consumes: Inventory/Actors/Status modifiers, Story demand/settlement rules.
- Produces: RNG-free previews, valid plans, resumable OpeningSession checkpoint cursor, balanced detailed ledgers.

- [ ] **Step 1: Write plan and demand golden cases**

Encode exact formulas from `docs/poc/simulation-rules.md` sections 6.2–6.5: StartRun freezes base+random-offset seeds and materializes D1; on each later service-day morning CommandCoordinator assembles the demand input from Calendar/Tavern/Progression/Status read ports, calls pure projection once, and asks Tavern owner to persist `currentDemand`/emit exactly one equal `demand.materialized` before Scheduler. Its player range is exact on D1 and ±1 per segment from D2 onward, while hidden actual is deterministic and inside the range. Queries expose only the stored range/modifier projection with the closed reputation/war-clue ModifierSource+Reason bindings; StartOpening copies the same stored materialization. Prove same-day reputation/Fact changes do not alter it, but D1 service changes affect D2 and D5 investigation changes affect D6. Then cover preference-derived effective orders, largest-remainder allocation with stable IDs, reception/prep-point limits, sales min(plan, orders), coverage thresholds, wages/fees, teamwork/mood/Aura effects.

- [ ] **Step 2: Write Opening command atomicity tests**

`tavern.opening.start` commits AP, both actor stamina costs, wage/fee cash, FIFO ingredients, prepared portions, and narrow baseline; it sets a fully serializable OpeningSession safe boundary but not `eveningResolved` (actual Auto-save scheduling belongs to Phase 3). Baseline freezes preparationActionCount, cash/reputation before values and the exact ordered applied Modifier+Reason set. At this task boundary use the formal Story's no-event checkpoint path, so `start` advances to `ready_to_finalize` and `finalize` remains adjacent. Continue at ready returns `tavern.opening_continue_not_needed`. While the workflow is active, the Catalog allowlist blocks unrelated actor/plan/world commands with exact Narrative/workflow rejections. `finalize` is legal only at `ready_to_finalize`, consumes no formal-Story RNG, applies sales/results, merges ledgers, appends exactly one opening `ServiceHistoryEntryV1` that round-trips preparation count, applied modifiers/reasons and AP/player/heroine-stamina/cash before-after, clears workflow, and sets `eveningResolved`. Rejection/fault preserves the committed baseline/costs and cannot double-charge or append history. The serializable blocked-event/`narrative.advance`/Continue path is an explicit Task 6 integration test after Narrative and Scheduler exist.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/engine/domains/tavern src/stories/tavern-poc/rules/tavern-rule.test.ts`

Expected: FAIL on missing calculators/handlers.

- [ ] **Step 4: Implement preview/execute from shared calculators**

`previewTavernPlan` and execution call the same guard/cost/capacity calculators. Before Start it returns current-state/prospective AP, both stamina, wage, fee, service-cost modifier, total cash, ingredient shortages and sales/net ranges; while Opening is active it reads baseline/prepared ingredients/start ledger, marks costs committed and returns only remaining settlement delta, never post-Start fake shortages or duplicate costs. `previewCommand(tavern.plan.set)` remains the immediate zero-cost commitment. Preview never receives `RuleRng`. Settlement output is strict-schema validated, ledger-balanced, finite, and bounded before domain proposals apply. Implement the frozen Router capabilities for Tavern's `reputation.adjust`/`tavern.helper.set` and Workflow's Opening-only `modifier.add`; table-drive wrong/no active workflow rejection and whole-batch rollback. At this point every EffectIntent kind has a real owner capability and the profile test rejects remaining placeholders.

- [ ] **Step 5: Cover all four service modes and closure**

Assert the shared `actor.prepare_food` query/preview/execute limit with exact `{ current, limit }` rejection now that Tavern owns daily preparation; Coordinator atomically combines Calendar AP, Actors stamina, and Tavern count proposals. Then assert manual, assisted, delegated and closed exact day/helper gates plus AP/stamina/wage/capacity/teamwork differences from `docs/poc/balance-v0.md`: D1 manual only, D2 assisted after helper unlock, D3 delegated/closed, and locked helper tier is false regardless of stored tier. Opening Start outside evening returns `calendar.invalid_phase`; active Opening returns `tavern.opening_active`; after any Finalize/planned/emergency resolution, another Start returns `tavern.evening_resolved` and cannot double-open. A planned `closed` mode has an empty menu, zero income/wage/fee, no OpeningSession, and no reputation loss; entering evening appends one planned closure history/DomainFact with the authored reason. Starting before a plan exists returns `tavern.opening_plan_missing`; continue/finalize without a session return the corresponding `tavern.opening_missing` payload. Entering a service evening with no plan atomically installs emergency closed. If a frozen non-closed plan never successfully starts, evening `calendar.advance_phase` with no active workflow converts it to the same documented emergency closure/penalty/history then completes the owner-proposal portion of day-end; an active Opening instead blocks advance. Thus shortages, cash or stamina rejection never soft-lock. Across resolved service days, `serviceHistory` is day-ordered and contains exactly one opening-or-closure item per day, including canonical Snapshot serialize/parse round trips. Task 6 adds Scheduler contexts and proves the final complete causal order.

- [ ] **Step 6: Run settlement, invariants, and foundation tests**

Run: `pnpm vitest run src/engine/domains/tavern src/stories/tavern-poc/rules && pnpm verify:foundation`

Expected: PASS.

- [ ] **Step 7: Commit Tavern workflow**

```bash
git add src/engine/domains/tavern src/stories/tavern-poc/rules src/engine/profile/command-coordinator.ts src/engine/profile/effect-intent-router.ts
git commit -m "feat: add resumable tavern settlement"
```

### Task 5: Implement Narrative IR and atomic choice execution

**Files:**

- Create: `src/engine/narrative/nodes.ts`
- Create: `src/engine/narrative/runner.ts`
- Create: `src/engine/narrative/conditions.ts`
- Create: `src/engine/narrative/commands.ts`
- Create: `src/engine/narrative/story-action.ts`
- Create: `src/engine/narrative/story-action.test.ts`
- Create: `src/engine/narrative/narrative.test.ts`
- Create: `src/stories/e2e/content/narrative-fixtures.ts`
- Create: `src/stories/e2e/content/story-actions.ts`
- Modify: `src/stories/e2e/index.ts`
- Modify: `src/engine/profile/command-coordinator.ts`

**Interfaces:**

- Consumes: narrative node/condition/effect contracts, StoryAction definitions, Check Rule, and the already-frozen EffectIntentRouter/owner capabilities (including Progression).
- Produces: `story.action.start`, `narrative.advance`, `narrative.choose`, cursor/call-stack state, projection-ready cues.

- [ ] **Step 1: Write node and cursor failure tests**

Cover `line`, `narration`, `choice`, `condition`, `check`, `command`, `eventCheckpoint`, `jump`, `call`, `return`, `stageCue`, and `end`. Reject missing targets, stale scene/node/choice submission, hidden/disabled choices, and commands attempted while a blocking choice is open. Force an automatic-node loop past `maxNarrativeStepsPerCommand` and a call push past `maxNarrativeCallDepth`; assert the exact command-handler fault codes and whole-command rollback, never a committed cursor on an internal node or implicit next-frame continuation. Table-drive `narrative.inactive`, `narrative.cursor_mismatch`, `narrative.choice_required`, hidden/disabled choice reasons, plus `command.blocked_by_narrative` for every non-Narrative command; each rejection preserves the original Snapshot reference and emits no `DomainFact`.

Add the first real lifecycle integration: createInitialSnapshot → `run.start` → advance the manifest opening Scene through the interpreter → `policy.choose`. Assert policy is blocked before Scene completion, the completed Scene leaves setup/null policy, policy then atomically writes Calendar+Run owners and enters active, and no test-only fixture jump or hidden Snapshot replacement is used.

- [ ] **Step 2: Write atomic choice rollback tests**

Force a Check Rule throw/invalid output, an invalid intent, and an invariant failure. Assert cursor, call stack, domains, RNG, sequence, ledger, and `resolvedChecks` all roll back together; an ordinary low-band check remains a successful committed result. Successful choice applies intents and advances cursor in one command; arbitrary cash-changing Story intent is `ledger.append` and produces exactly one authoritative entry. Every resulting DomainFact preserves the Effect's exact `reasonId` and uses the active Narrative source as `story_action` or `world_action` provenance rather than degrading to generic `narrative.choose`.

Add `story.action.start` vectors against the independent E2E Story: an unavailable gate returns the exact ordered `action.unavailable` reasons; an active Narrative rejects without effects; a legal action atomically applies `startEffects`, appends any authored ledger effect once, establishes `NarrativeSourceV1.kind="story_action"` only when `sceneId` is non-null, and emits exactly one `story.action_started`. A forced bad effect/scene reference rolls back all domains, Narrative, ledger, RNG, and sequence. Merely advancing days without dispatching this command never changes its relationship Outcome.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/engine/narrative/narrative.test.ts src/engine/narrative/story-action.test.ts`

Expected: FAIL on missing runner/handlers.

- [ ] **Step 4: Implement a total, bounded interpreter**

Use an explicit loop with a per-command node-step limit and maximum call depth from Story validation. Narrative only emits typed commands/intents/cues; it never imports domain internals or edits state.

- [ ] **Step 5: Run narrative and transaction tests**

Run: `pnpm vitest run src/engine/narrative src/engine/core/transaction.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Narrative IR**

```bash
git add src/engine/narrative src/stories/e2e/content/narrative-fixtures.ts src/stories/e2e/content/story-actions.ts src/stories/e2e/index.ts src/engine/profile/command-coordinator.ts
git commit -m "feat: add the atomic narrative runner"
```

### Task 6: Implement deterministic Event Scheduler and opening-event fixtures

**Files:**

- Create: `src/engine/scheduling/candidates.ts`
- Create: `src/engine/scheduling/checkpoints.ts`
- Create: `src/engine/scheduling/scheduler.ts`
- Create: `src/engine/scheduling/scheduler.test.ts`
- Create: `src/engine/scheduling/checkpoint-integration.test.ts`
- Create: `src/stories/e2e/content/opening-events.ts`
- Modify: `src/stories/e2e/index.ts`
- Modify: `src/engine/profile/command-coordinator.ts`
- Modify: `src/engine/domains/calendar/calendar-commands.ts`
- Modify: `src/engine/domains/tavern/start-opening.ts`
- Modify: `src/engine/domains/tavern/continue-opening.ts`
- Modify: `src/engine/domains/tavern/finalize-opening.ts`
- Modify: `src/engine/narrative/runner.ts`

**Interfaces:**

- Consumes: serializable Story event-candidate IR, command-cloned RuleRng, and explicit checkpoint contexts.
- Produces: stable guaranteed/weighted candidate selection at every frozen checkpoint plus one reproducible E2E opening event; it does not add a fifth Story rule slot.

- [ ] **Step 1: Write stable-order and weighted-vector tests**

Candidates sort by priority descending then event ID ascending. Guaranteed candidates consume no RNG. Each weighted group validates positive safe-integer weights, excludes zero, draws once with `scheduler:<checkpointId>:<groupId>`, and selects first cumulative weight greater than draw. Reject invalid totals/duplicates/empty positive groups. Freeze one deep-readonly evaluation Snapshot per context: select every candidate against that same pre-context candidate, then apply all selected pure effects in order; same-context effects cannot change later eligibility, while the next context sees prior-context effects. Add a multi-context vector for the catalog's exact outer-command order, including `day.ended` carrying the old day while its conditions read the fully post-transition calendar; prove `story.explicit` applies effects before cursor advance and both `story.explicit`/`week.ended` reject non-null scenes at Story validation. Also reject any week-ended effect other than `fact.set | quest.set`; every `command.succeeded` Event whose commandKinds contains `levy.pay` has the same scene/effect restriction, so terminal resources/outcomes/completion cannot diverge after materialization. Two selected Scheduler scenes must fault `scheduler.multiple_blocking_events`; one selected Scheduler scene plus an active or owner-proposed manifest/StoryAction/WorldAction scene must fault `narrative.blocking_conflict`. Both preserve pre-command state, ledger, RNG, workflow, cursor, DomainFacts, and sequence. Table-drive every `EventTriggerV1` against its corresponding `SchedulerContextV1`, including `command.succeeded` carrying `story.action.start`, and assert nonmatching day/phase/command/checkpoint arrays do not trigger.

This task owns the cross-domain integration that earlier owner tasks intentionally deferred. First test an ordinary morning→afternoon advance and prove Status `phase_end` runs after old-phase direct effects but before `phase.entered`. For a full successful day boundary, assert the exact Coordinator order: emergency/old-day domain proposals → Inventory spoilage → Status `phase_end` → Status `day_end` → Actors recovery using still-active modifiers → Status `night_recovery` decrement → Tavern daily clear/plan transition → Calendar day/phase/AP proposal and `calendar.phase_advanced` → Tavern next-day demand materialization/`demand.materialized` (or silent clear) → Catalog-ordered Scheduler contexts. Force a failure at each later owner/Scheduler stage and prove the original Snapshot/RNG/sequence and all earlier proposals/Facts roll back. Also run the E2E Opening blocked-event path: Start selects one Scene, Scene-end `narrative.advance` leaves the checkpoint and cleared `blockingEvent` serializable, Continue alone advances without re-charging, and Finalize succeeds exactly once. With an applicable `opening` Aura, Finalize decrements it once after its Modifier contributes; Start/Continue/closed/mode mismatch/rejection/fault do not decrement it.

Freeze the checkpoint kinds exactly as:

```text
phase.entered
command.succeeded
opening.started
opening.middle
opening.before_finalize
day.ended
week.ended
story.explicit
```

The concrete `checkpointId` is a stable Story-declared ID plus the contextual day/phase/opening sequence fields defined by the Contract Catalog; it never uses text or wall time.

- [ ] **Step 2: Confirm intended failure**

Run: `pnpm vitest run src/engine/scheduling/scheduler.test.ts`

Expected: FAIL on missing Scheduler.

- [ ] **Step 3: Implement all checkpoint integrations transactionally**

The outer command transaction invokes Scheduler exactly once for each applicable checkpoint in the catalog's full order: inline `story.explicit`, `command.succeeded`, Opening started/middle/before-finalize, day-ended, week-ended, then phase-entered. For `calendar.advance_phase`, Calendar contributes only its owner proposal; CommandCoordinator completes and orders the full Inventory/Status/Actors/Tavern/Calendar transition before the latter contexts, while context payloads preserve the Catalog's old-day/new-phase identities. Integrate successful `run.start`, `story.action.start`, Opening, and phase commands here; Scheduler unit tests also accept WorldAction command-kind contexts, while Task 7 adds the first real WorldAction handler integration. Owner-proposed Narrative requests plus Scheduler-selected scenes use the same single-blocking arbiter. Freeze/select/apply contexts exactly as tested in Step 1. A selected candidate and its RNG commit with that same command or fully roll back. Apply effects-only events through the exhaustive EffectIntentRouter in context/event order, validate at most one blocking scene across the whole transaction, and only then establish Narrative/Opening blocking state. `ledger.append` remains the only Story-authored cash/valuation intent; Scheduler effects never recursively re-enter `command.succeeded`, and no render/query/save path imports Scheduler.

The D2 supplier invoice is the integration fixture for `phase.entered`: advancing into D2 morning atomically selects a guaranteed blocking Narrative event before another action can commit. Tests also prove phase-entered, post-command, three Opening, day-end, week-end, and explicit checkpoints each map to the expected context exactly once.

- [ ] **Step 4: Add the independent E2E opening event**

E2E Story declares fixed candidate IR in `content/opening-events.ts`; it is data consumed by Scheduler, not an executable `opening-rule`. A known seed enters one interactive event after Start. The choice changes a typed capacity modifier; save/replay can pause at its Narrative choice, and `tavern.opening.continue` advances the remaining checkpoint cursor before Finalize. Do not import tavern-poc content or prose.

- [ ] **Step 5: Prove formal Story consumes no opening RNG and run the focused PASS suite**

Run the same seven-day formal opening with/without preview/query calls; assert identical RNG cursor and no scheduler draw. E2E fixture asserts exactly one named draw.

Run: `pnpm vitest run src/engine/scheduling src/engine/domains/calendar/calendar.test.ts src/engine/domains/tavern/tavern.test.ts src/stories/e2e`

Expected: PASS; all eight checkpoint kinds are covered, formal Opening has zero Scheduler draws, and E2E has the one frozen draw.

- [ ] **Step 6: Commit Scheduler/E2E opening fixture**

```bash
git add src/engine/scheduling src/stories/e2e/content/opening-events.ts src/stories/e2e/index.ts src/engine/profile/command-coordinator.ts src/engine/domains/calendar/calendar-commands.ts src/engine/domains/tavern/start-opening.ts src/engine/domains/tavern/continue-opening.ts src/engine/domains/tavern/finalize-opening.ts src/engine/narrative/runner.ts
git commit -m "feat: add deterministic opening events"
```

### Task 7: Implement WorldActionSession, checks, progression, and endings

**Files:**

- Create: `src/engine/domains/world/world-action.ts`
- Create: `src/engine/domains/world/world-action.test.ts`
- Create: `src/engine/domains/progression/progression-commands.ts`
- Modify: `src/engine/domains/progression/progression-state.ts`
- Modify: `src/engine/domains/progression/progression-effects.ts`
- Modify: `src/engine/domains/progression/progression.test.ts`
- Modify: `src/engine/domains/run/run-commands.ts`
- Modify: `src/engine/domains/run/run.test.ts`
- Create: `src/stories/e2e/content/world-actions.ts`
- Modify: `src/stories/e2e/index.ts`
- Create: `src/stories/tavern-poc/rules/check-rule.ts`
- Create: `src/stories/tavern-poc/rules/ending-rule.ts`
- Create: `src/stories/tavern-poc/rules/check-ending.test.ts`
- Modify: `src/engine/profile/command-coordinator.ts`

**Interfaces:**

- Consumes: an independent E2E WorldAction definition/Scenes plus pure tavern-poc Check/Ending rule inputs; the complete formal Story binds its content in Task 8.
- Produces: resumable D5 investigation, deterministic thresholds/2D6, typed Progression updates, an Ending terminal proposal, and Run-owned D7 completion.

- [ ] **Step 1: Write D5 workflow tests before implementation**

Begin investigation only Friday morning with one of the Story-declared base/preparation `optionId` values; atomically commit 1 AP, 3 stamina, base cost 4, option cost 0 or 4, the frozen preparation bonus, both workflow step IDs, typed ledger-entry IDs, mutual-exclusion outcome, `progress="begin_scene"`, and the begin-step Narrative. Ending that Scene moves to `awaiting_completion_phase`; only then may `calendar.advance_phase` enter Friday afternoon, atomically set `completion_scene`, and start the completion-step Narrative. Ending the second Scene sets `ready_to_complete`; only then does `world.action.complete` consume 2 AP, resolve/persist the check, apply effects, and clear the workflow without further cash/stamina or a third Narrative. Round-trip every progress value and table-drive the workflow allowlist: Narrative controls in both scene states, only phase advance while awaiting, only Complete while ready; all other GameCommands return exact `command.blocked_by_narrative` or `command.blocked_by_workflow` without mutation. Also assert exact `command.unknown_reference`, `world.action_unavailable`, `workflow.conflict`, `workflow.missing`, `world.action_wrong_phase`, and `calendar.phase_blocked` details for invalid action/option/progress/phase/workflow cases. A legal begin always has a completable afternoon; relation Story action remains available after rejected begin.

- [ ] **Step 2: Write check vectors**

Deterministic `[Intellect B]` threshold never draws RNG. Investigation uses exactly `2D6 + attributeBonus + preparationBonus + auraBonus`; reference dice are 4/3. Append one catalog-valid `ResolvedCheckV1` containing raw dice, score, selected `CheckBandId`, modifiers, and `resolvedAtSequence`; apply band effects that set the resulting Fact/Outcome StoryToken so serialization/reload cannot reroll. Enforce CheckId uniqueness and sequence order, and never use an `OutcomeId` as a check-band identifier.

- [ ] **Step 3: Write D7 ending tests**

Only `levy.pay` terminates. Insufficient cash produces arrears with exact shortfall; otherwise Inventory appends the typed levy ledger entry and deducts levy once. Progression evaluates stable/danger using `docs/poc/poc-charter.md` thresholds, independently combines relationship/investigation outcomes, validates/applies its own effects, and returns a terminal proposal without touching `simulation.run`. Run owner then persists the complete catalog `RunCompletionV1` and status with all three ending dimensions and `completedAtSequence` equal to the committed command sequence. Force failure at Inventory, Progression effects, and Run application boundaries and prove atomic rollback. Make the Ending rule return one otherwise-valid non-Progression EffectIntent and assert exact `rule.output_invalid`, no owner proposal, and full rollback. Terminal snapshot stays D7 afternoon; phase advance at the levy-due point rejects with blocker `levy_due`, and replaying/reloading completion never re-runs the Ending rule.

- [ ] **Step 4: Confirm intended failures**

Run: `pnpm vitest run src/engine/domains/world src/engine/domains/progression src/engine/domains/run src/stories/tavern-poc/rules/check-ending.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement generic world/progression mechanics**

Engine only knows typed action/option/check/effect contracts, never `action.old_trade_road` or ending IDs. This task's E2E fixture binds a two-step definition, options, generic begin effects, concrete test IDs/Scenes, and confirmation metadata; Task 8 later binds the documented formal IDs and copy without changing mechanics. The WorldAction proposal, Narrative runner, Calendar owner proposal, and global blocking-scene arbiter jointly implement the Catalog's four-value progress state machine; WorldAction step-scene and Scheduler scene proposals conflict as `narrative.blocking_conflict` and roll back the outer command. Validate that WorldAction/action/option confirmation arrays preserve Story order and references; begin/advance/complete use the same guards and costs later exposed by preview. Progression remains the sole Fact/Quest/Outcome/ResolvedCheck writer; Ending returns a terminal proposal and Run remains the sole `RunState.status/completion` writer. CommandCoordinator is the only place that may combine them.

- [ ] **Step 6: Run workflow/round-trip and focused PASS tests**

Canonical serialize and schema-parse snapshots at every WorldAction step, before/after check, and after terminal completion. Expect deep equality of `initialSeed`, `resolvedChecks`, `completion`, ledger entry references, and workflow plus identical continuation.

Run: `pnpm vitest run src/engine/domains/world src/engine/domains/progression src/engine/domains/run src/stories/tavern-poc/rules/check-ending.test.ts src/engine/core/transaction.test.ts`

Expected: PASS with the exact deterministic threshold and 2D6 vectors, every workflow round trip, and all three ending dimensions.

- [ ] **Step 7: Commit World/Progression**

```bash
git add src/engine/domains/world src/engine/domains/progression src/engine/domains/run src/stories/e2e/content/world-actions.ts src/stories/e2e/index.ts src/stories/tavern-poc/rules src/engine/profile/command-coordinator.ts
git commit -m "feat: add world actions checks and endings"
```

### Task 8: Author and validate the complete seven-day tavern Story

**Files:**

- Create: `src/stories/tavern-poc/identity.ts`
- Create: `src/stories/tavern-poc/manifest.ts`
- Create: `src/stories/tavern-poc/state-definitions.ts`
- Create: `src/stories/tavern-poc/initial-state.ts`
- Create: `src/stories/tavern-poc/balance/initial.ts`
- Create: `src/stories/tavern-poc/balance/action-costs.ts`
- Create: `src/stories/tavern-poc/balance/ingredients.ts`
- Create: `src/stories/tavern-poc/balance/recipes.ts`
- Create: `src/stories/tavern-poc/balance/demand.ts`
- Create: `src/stories/tavern-poc/balance/service-modes.ts`
- Create: `src/stories/tavern-poc/balance/facilities.ts`
- Create: `src/stories/tavern-poc/balance/checks.ts`
- Create: `src/stories/tavern-poc/balance/endings.ts`
- Create: `src/stories/tavern-poc/balance/metrics-targets.ts`
- Create: `src/stories/tavern-poc/content/ingredients.ts`
- Create: `src/stories/tavern-poc/content/recipes.ts`
- Create: `src/stories/tavern-poc/content/policies.ts`
- Create: `src/stories/tavern-poc/content/facilities.ts`
- Create: `src/stories/tavern-poc/content/actions.ts`
- Create: `src/stories/tavern-poc/content/events.ts`
- Create: `src/stories/tavern-poc/content/prose-v0.ts`
- Create: `src/stories/tavern-poc/content/scenes/opening.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-1.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-2.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-3.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-4.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-5.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-6.ts`
- Create: `src/stories/tavern-poc/content/scenes/day-7.ts`
- Create: `src/stories/tavern-poc/content/endings.ts`
- Create: `src/stories/tavern-poc/assets/manifest.ts`
- Create: `src/stories/tavern-poc/story-validation.test.ts`
- Modify: `src/stories/tavern-poc/development.ts`
- Modify: `src/stories/tavern-poc/index.ts`

**Interfaces:**

- Consumes: all Phase 2 mechanics and exact `docs/poc/` tables.
- Produces: one complete non-canonical playable week with stable IDs and no unapproved runtime images.

- [ ] **Step 1: Write reachability and schedule tests first**

Assert every stable ID listed in `docs/poc/content-and-playtest.md` exists once, including manifest/Event/StoryAction/WorldAction Scene and Node IDs, CheckpointIds, `check.old_trade_road`, action/choice/step IDs, both ModifierSource IDs, every closed ReasonId, and every Event matrix row; every node/action/reference resolves, and source identity is exactly StoryId `week.poc_001`, revision `1`. `tavern-poc` remains only the CLI/build key and never appears as Save/Debug StoryId. Table-drive the five exact EventTrigger/checkpoint/priority/scene/condition/effect definitions: the tutorial/helper events are effects-only, the other three are the only automatic blocking Scenes, formal Opening checkpoints remain empty, and any future levy-pay command event must be terminal-safe. Validate the complete Action table: exact player/system cardinality, visibility gates, availablePhases, resolved occupation, direct commands, and ordered confirmation references. D1–D7 gates open in order—D1 manual, D2 helper-backed assisted, D3 delegated/closed; D7 hides ordinary actions—and Friday relation/WorldAction mutual exclusion plus D4 persistent opportunity are condition-driven. Every `StoryContent.storyActions` row has one matching Action presentation and no automatic substitute event. All terminal outcomes are reachable, the D2 rank choice has its authored disabled reason, and no Story node introduces arbitrary callbacks/HTML.

- [ ] **Step 2: Confirm validation tests fail**

Run: `pnpm vitest run src/stories/tavern-poc/story-validation.test.ts`

Expected: FAIL on missing full content/balance.

- [ ] **Step 3: Encode all PoC data verbatim**

Translate every table and formula in `docs/poc/balance-v0.md` into typed named constants: 4 recipes, 5 ingredients, 2 customer segments, initial cash/reputation/attributes, prices/costs/shelf life, service modes, preparation/capacity, facility costs/effects, D5 relation Story action, the two D5 world-action options/steps, ledger/change-reason bindings, Facility skip, planned/emergency closure reasons, visibility/availability gates, submission/occupation metadata, confirmation metadata, levy, the exact D3-visible/D5-conservative obligation policy with its closed reason and three ordered text/optional-Action recommendations, check thresholds, relationship/Aura deltas, demand ModifierSource+Reason bindings, and 1,000-seed pass ranges. Every arbitrary authored cash/valuation Effect is `ledger.append`; WorldAction ingredient rewards use only the closed `inventory.grant` composite and its required valuation entries. Do not adjust numbers during implementation.

- [ ] **Step 4: Author the exact seven-day content beats**

Implement the `manifest_start` opening text card started only by `run.start`, D1 tutorial, D2 supplier threshold, D3 helper/tax obligation, D4 facility notification/choice, the explicitly dispatched D5 relation `story.action.start`/investigation WorldAction split, D6 consequences/recovery, and the blocking D7 levy notice plus three-dimensional summary. Reference drivers must drain the three automatic Scenes exactly as the PoC matrix states. The no-relation route issues no relation command and remains legal. `prose-v0.ts` is a complete, frozen functional copy table: speaker labels are exactly `旁白`、`你`、`她`; do not invent proper names; every line, choice label, disabled explanation, result line, and ledger explanation has a stable text ID and non-empty Chinese text. The copy is deliberately non-canonical, but no lorem, blank, or unfinished marker is allowed and tests/golden files assert IDs rather than prose bytes.

- [ ] **Step 5: Keep art pending-safe**

Story asset manifest may reference code-native fallbacks only. Phase A Image Gen sources remain under `art-source` and outside Story digest/Player bundle until terms and selection are approved in Phase 4.

- [ ] **Step 6: Run Story validation and complete-week smoke**

Run: `pnpm vitest run src/stories/tavern-poc && pnpm story:build tavern-poc --flavor player`

Expected: validation passes and production Story builds without `references/` or pending art.

- [ ] **Step 7: Commit the seven-day Story**

```bash
git add src/stories/tavern-poc
git commit -m "feat: author the seven-day tavern story"
```

### Task 9: Freeze reference strategies, golden artifacts, and property invariants

**Files:**

- Create: `src/test-support/strategies/types.ts`
- Create: `src/test-support/strategies/purchase-expander.ts`
- Create: `src/test-support/strategies/reference-drivers.ts`
- Create: `src/test-support/strategies/reference-drivers.test.ts`
- Create: `src/test-support/strategies/multi-seed.test.ts`
- Create: `src/test-support/metrics/week-metrics.ts`
- Create: `src/test-support/metrics/week-metrics.test.ts`
- Create: `src/test-support/property/command-sequences.test.ts`
- Create: `scripts/golden/generate-week.mts`
- Create: `scripts/golden/verify-week.mts`
- Create: `scripts/golden/golden.test.ts`
- Create: `src/test/fixtures/golden/reference-seed.commands.json`
- Create: `src/test/fixtures/golden/reference-seed.state-digests.json`
- Create: `src/test/fixtures/golden/reference-seed.nightly-ledgers.json`
- Create: `src/test/fixtures/golden/reference-seed.outcomes.json`
- Create: `src/test/fixtures/golden/multi-seed.metrics.json`
- Create: `scripts/verify-simulation.mts`
- Modify: `package.json`

**Interfaces:**

- Consumes: only public commands/queries and complete tavern-poc Story.
- Produces: six deterministic strategies, 1,000-seed metrics, reviewed golden fixtures, `pnpm verify:simulation`.

- [ ] **Step 1: Write driver expansion tests**

Translate `docs/poc/reference-strategies.md` exactly. `buy(...)` expands deterministically; quantity-zero lines disappear; non-closed StartOpening/FinalizeOpening are adjacent in the formal Story, while planned-closure days emit neither command. Both `full_delegation` and `explicit_failure` obey the teaching gates with D1 M1 and D2 A1; only D3+ uses delegated/closed, so no driver expects a rejection to mean success. After `run.start` and every phase advance, drain the exact manifest/Event/WorldAction Scene before the next domain command; only D2 auto-chooses its frozen invoice ChoiceId. A relation strategy emits the exact `{ kind: "story.action.start", actionId }`, a no-relation strategy emits none, and `BeginAdventure` carries the selected Story option directly in `world.action.begin` then completes both persisted step Scenes before Complete. Any rejection fails the driver; D7 drains the levy Scene, advances once, then pays levy. Drivers never inspect future RNG or search better menus.

- [ ] **Step 2: Confirm driver tests fail**

Run: `pnpm vitest run src/test-support/strategies/reference-drivers.test.ts`

Expected: FAIL on missing drivers.

- [ ] **Step 3: Implement public-command-only drivers**

No driver imports domain internals or mutates snapshots. Save every emitted command with day/phase/order metadata and compute state digest after dispatch.

- [ ] **Step 4: Write WeekMetrics and 1,000-seed acceptance tests**

Assert exact reference-seed end states/ledgers/service history and the numeric pass/failure ranges in `docs/poc/balance-v0.md` section 14. `WeekMetricsV1` records every field from `docs/poc/content-and-playtest.md` section 6: initial seed, cash checkpoints, ingredient/recipe/customer flow, service-mode/closure counts, confirmations/commands including Story actions, wasted AP/stamina rejections/rests, relationship/mood/reputation, Aura lifecycle, events, complete ordered resolved-check records, terminal completion/endings, and `loadCount/loadChangedFuture`. Player-facing reloadable counts and service AP/stamina deltas are cross-checked against persisted `serviceHistory`; rejected-command metrics remain diagnostic. Pure reference drivers set both load fields to zero; Phase 3 load-continuation tests provide the nonzero coverage. Output fast-check seed/path on shrink failure.

Run: `pnpm vitest run src/test-support/metrics/week-metrics.test.ts src/test-support/strategies/multi-seed.test.ts`

Expected: FAIL because the metrics collector and multi-seed runner are missing.

- [ ] **Step 5: Add invariant property tests**

Generate valid/invalid command sequences, including `story.action.start`, every WorldAction phase, and Scheduler-triggering commands. Continuously assert determinism, input immutability, no illegal negatives, valid references, one workflow, `initialSeed` immutability, ordered unique `resolvedChecks`, completion/status agreement, cash conservation against the sole ledger, rejected-command identity/RNG stability, and saveable schema at every committed Snapshot.

Run: `pnpm vitest run src/test-support/property/command-sequences.test.ts`

Expected: FAIL because the property harness is missing.

- [ ] **Step 6: Implement metrics, multi-seed execution, and property harness**

Implement `WeekMetricsV1` from persisted/public outcomes only, the deterministic 1,000-seed runner over all six public-command drivers, and bounded fast-check command generators/shrink diagnostics. No collector or property may inspect future RNG, mutate Snapshot, or import domain internals.

Run: `pnpm vitest run src/test-support/strategies/reference-drivers.test.ts src/test-support/metrics/week-metrics.test.ts src/test-support/strategies/multi-seed.test.ts src/test-support/property/command-sequences.test.ts`

Expected: PASS for all six strategies, numeric ranges, and invariant properties before any golden baseline exists.

- [ ] **Step 7: Write the golden-script contract test and confirm failure**

Test exact output paths, canonical JSON ordering/newline, missing/partial strategy rejection, verify-without-write behavior, and package mappings. Run: `pnpm vitest run scripts/golden/golden.test.ts`

Expected: FAIL because the generator, verifier, and mappings do not exist.

- [ ] **Step 8: Implement golden generation and verification before invoking them**

Implement `generate-week.mts` and `verify-week.mts`, then add these exact mappings:

```json
{
  "golden:generate": "tsx scripts/golden/generate-week.mts",
  "golden:verify": "tsx scripts/golden/verify-week.mts"
}
```

Run: `pnpm vitest run scripts/golden/golden.test.ts`

Expected: PASS without creating an accepted baseline.

- [ ] **Step 9: Re-run the complete pre-golden behavior suite**

Run: `pnpm vitest run src/test-support/strategies/reference-drivers.test.ts src/test-support/metrics/week-metrics.test.ts src/test-support/strategies/multi-seed.test.ts src/test-support/property/command-sequences.test.ts scripts/golden/golden.test.ts`

Expected: PASS. Do not generate or review golden bytes until this full driver/metrics/property suite is green; any behavior fix returns to this checkpoint first.

- [ ] **Step 10: Generate proposed golden artifacts**

Run: `pnpm golden:generate`

Expected: writes exactly the five named JSON files above: complete commands (including explicit Story actions), per-command state digests, nightly authoritative ledgers, final outcomes containing `initialSeed`/`resolvedChecks`/`completion`, and deterministic metrics; command exits nonzero if any strategy/field is partial.

- [ ] **Step 11: Stop for human golden review**

Do not mark baselines accepted automatically. Present the diff; after explicit approval, commit fixtures separately:

```bash
git add src/test/fixtures/golden
git commit -m "test: approve seven-day golden fixtures"
```

- [ ] **Step 12: Implement and run the phase verifier**

`verify:simulation` runs foundation gate, all domain/Story tests, golden verification, 1,000-seed metrics, property tests, and both Story build smokes. It rejects remaining not-implemented handlers.

Add the remaining exact script without replacing the Step 8 mappings:

```json
{
  "verify:simulation": "tsx scripts/verify-simulation.mts"
}
```

Run: `pnpm verify:simulation && pnpm verify:simulation`

Expected: exit 0 twice; tracked files unchanged.

- [ ] **Step 13: Commit strategy/property verification**

```bash
git add src/test-support scripts/golden scripts/verify-simulation.mts package.json
git commit -m "test: add deterministic simulation verification"
```

## Phase 2 Completion Check

- [ ] Every production GameCommand handler is implemented and exhaustive.
- [ ] Domain ownership/import checks pass.
- [ ] Formal Story RNG consumption is exactly 12 demand draws plus two D6 draws.
- [ ] Opening and WorldAction workflows round-trip at every checkpoint.
- [ ] Narrative choice effects/cursor/RNG are atomic.
- [ ] `story.action.start` is atomic, queryable, Scheduler-visible, and never runs implicitly.
- [ ] `initialSeed`, ordered `resolvedChecks`, and terminal `completion` survive canonical round trips.
- [ ] `ledger.append` is the only Story cash/valuation Effect and cash conservation holds after every command.
- [ ] Six reference strategies and 1,000-seed metrics pass.
- [ ] Golden artifacts have explicit human approval.
- [ ] `pnpm verify:simulation` exits 0 twice with a clean tree.
