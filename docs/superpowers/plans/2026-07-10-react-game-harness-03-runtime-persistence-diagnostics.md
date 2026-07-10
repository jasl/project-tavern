# React Game Harness Phase 3 Runtime Persistence and Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the pure engine in a serial application session, provide RNG-free queries/ViewModels, persist exact snapshots safely in IndexedDB, and export/import bounded Save/Debug records with authoritative deterministic replay.

**Architecture:** `EngineSession` owns the only live Snapshot and serializes dispatch through the statically composed `GameProfile`/`CommandCoordinator`. `GameApplicationPort` is the sole UI-facing API. Persistence is an async facade outside GameState with strict import isolation, slot CAS, fencing leases, and ordered autosaves. Diagnostics holds an independent bounded `CommandLog` anchored by a replay Snapshot; replay submits semantic commands and compares regenerated `DomainFact` output rather than applying recorded facts.

**Tech Stack:** Phase 1/2 engine, idb 8.0.3, fake-indexeddb 6.2.5, Zod 4.4.3, Zustand vanilla 5.0.14 only as the later React subscription bridge.

## Global Constraints

- Phase 2 and approved golden fixtures must be green before this plan starts.
- Save/Quick/Auto are persistence operations, never GameCommands; they consume no RNG and do not increment sequence.
- Diagnostics, recent commands, errors, UI routes, and selection state never enter GameSnapshot.
- Imported Save/Debug JSON is untrusted and cannot partially replace a Session or overwrite a legal record.
- No remote storage, cloud sync, telemetry upload, service worker, or cross-revision migration.
- IndexedDB failure leaves the in-memory game playable and exposes JSON export; it never reports false save success.
- UI consumes only the flavor-discriminated `GameApplicationPort` and immutable ViewModels, never EngineSession or runtime internals. Player receives no Debug import/replay/mutation capability; Developer receives those abilities only under its non-null Developer port.

---

## File Map

```text
src/runtime/session/                 # EngineSession, application port, subscriptions
src/runtime/contracts/               # UI-facing Port and closed ViewModel contracts
src/runtime/projection/              # engine/story -> UI-neutral ViewModels
src/runtime/persistence/contracts/   # SaveRecord and import outcomes
src/runtime/persistence/indexed-db/  # schema, repository, CAS, leases
src/runtime/persistence/auto-save/   # ordered/coalesced write queue
src/runtime/diagnostics/             # CommandLog, DebugBundle, replay, privacy summary
src/runtime/errors/                  # stable runtime fault taxonomy
src/app/create-application.ts        # composition root, no React component state
src/test-support/runtime/            # fake IDB and deterministic clocks/UUIDs
```

### Task 1: Implement EngineSession, queries, projections, and GameApplicationPort

**Files:**

- Create: `src/runtime/session/engine-session.ts`
- Create: `src/runtime/session/engine-session.test.ts`
- Create: `src/runtime/session/session-store.ts`
- Create: `src/runtime/contracts/game-application-port.ts`
- Create: `src/runtime/contracts/game-application-port.test.ts`
- Create: `src/runtime/contracts/lifecycle-operations.ts`
- Create: `src/runtime/contracts/persistence-operations.ts`
- Create: `src/runtime/contracts/diagnostic-operations.ts`
- Create: `src/runtime/contracts/developer-operations.ts`
- Create: `src/runtime/contracts/view-models.ts`
- Create: `src/runtime/projection/action-projection.ts`
- Create: `src/runtime/projection/narrative-projection.ts`
- Create: `src/runtime/projection/stage-view-model.ts`
- Create: `src/runtime/projection/hud-view-model.ts`
- Create: `src/runtime/projection/life-policy-view-model.ts`
- Create: `src/runtime/projection/management-view-models.ts`
- Create: `src/runtime/projection/save-view-model.ts`
- Create: `src/runtime/projection/diagnostic-view-model.ts`
- Create: `src/runtime/projection/run-view-model.ts`
- Create: `src/runtime/projection/projection.test.ts`
- Create: `src/app/create-application.ts`

**Interfaces:**

- Consumes: the `GameProfile` public execution/query facade, LoadedStory, immutable Snapshot.
- Produces: serial `dispatch`, pure queries, subscription snapshots, UI-neutral Stage/HUD/Overlay/VN ViewModels.

- [ ] **Step 1: Write dispatch serialization and query purity tests**

Submit two dispatch Promises in the same tick and assert order follows call order. Query/preview calls must not change Snapshot identity, sequence, or RNG. A rejected command publishes no new snapshot. CommandLog and autosave do not exist yet at this task boundary; their own integration tests are Tasks 5–6. Table-drive the catalog contracts through the real query facade: only visibility-passing Actions are listed, submission windows and resolved occupation remain distinct, current-window resource failures stay visible-but-disabled, an available `story.action.start` has its exact `directCommand`, parameterized WorldAction has `directCommand=null`, and system/workflow controls have no Action presentation. The sequence-0 initial state alone exposes `getRunStartControl()` with exact run.start command, allowed/null-confirmation preview, and no Action row; every post-Start/non-initial state returns null. The completed-manifest setup state exposes ordered `getLifePolicySelection()` options with exact mutually equal option/command/preview policy identities and `allowed=true`; active Narrative or selected policy returns null. Tavern control projects exact Start/Continue/Finalize command+preview by workflow checkpoint and returns null under active Narrative, every WorldAction progress, resolved, closed, or wrong-phase states. Unavailable Story/World/actions expose ordered typed rejection details. Cover `run.not_started`, unknown reference, Narrative/workflow blocking, preparation limit, Opening missing/blocked/already-ready/not-ready, evening resolved, and WorldAction phase/progress rejections without fallback codes. Confirmation arrays preserve the Catalog's Action → ServiceMode / opportunity → build-or-skip / WorldAction-option source order and reject cross-source duplicate IDs. `getDemandForecast` is null before Start/non-service days, exact on D1, ranged from D2, projects persisted morning `currentDemand` without offset/actual, and StartOpening copies that same record. `previewTavernPlan` exposes exact prospective costs/shortages before Start and committed baseline/remaining settlement after Start. Obligation forecasts follow `null → current_gap → committed_plan_conservative → final → null(terminal)` with exact fields from the same calculators and authoritative ledger used by execution.

- [ ] **Step 2: Confirm intended failures**

Run: `pnpm vitest run src/runtime/session/engine-session.test.ts src/runtime/contracts/game-application-port.test.ts src/runtime/projection/projection.test.ts`

Expected: FAIL on missing runtime modules.

- [ ] **Step 3: Implement EngineSession without a duplicate mutable store**

```ts
interface EngineSessionV1 {
  getSnapshot(): GameSnapshot;
  dispatch(command: GameCommandV1): Promise<CommandExecutionResultV1>;
  query<T>(selector: (queries: EngineQueriesV1) => T): T;
  subscribe(listener: () => void): () => void;
}
```

Internally hold one Snapshot reference and one FIFO Promise tail; never expose a setter to UI. Every later Session-authoritative operation—Game dispatch, exact-compatible Save load/import, start/restart, replayable DebugCommand, fixture anchor, and any future recovery replacement—must enqueue through this same tail rather than add a second queue. Mark Session busy synchronously when an operation is enqueued, before its Promise callback begins. Dispatch calls the Profile's internal `executeAttempt` exactly once and returns `attempt.result`; Task 6 consumes that same attempt's diagnostics to build CommandLog, so no later layer may replay a command merely to recover attempted draws. Provide only a non-exported, implementation-internal enqueue/replacement primitive for Runtime composition; it is absent from `EngineSessionV1`, `GameApplicationPort`, Runtime public contracts, and UI imports. The tail always catches/normalizes an operation failure and settles before accepting the next authorized operation; it must never remain a rejected Promise that deadlocks recovery.

- [ ] **Step 4: Implement query/projection from shared calculators**

`getAvailableActions`, `explainAvailability`, `previewCommand`, `previewTavernPlan`, `getDemandForecast`, and `getObligationForecast` call the same visibility/gate/cost calculators as execution but have no RNG capability. `story.action.start` projects the exact authored command and confirmation; WorldAction projects its definition/options plus persisted progress for a typed parameter Overlay; every rejected preview preserves the exact `RejectionReasonV1` code/details. Tavern preview keeps plan commitment zero-cost separate from future service costs; an active Opening reads baseline/prepared inventory and marks costs committed, so it cannot double-charge or manufacture post-consumption shortages. Before StoryBalance `visibleFrom`, and again after terminal completion, the forecast is `null`; D3/D4, any unfrozen plan, and any frozen but opening-infeasible plan yield `current_gap`; only at/after `conservativeFrom` with a feasible frozen non-closed unfinalized plan does `committed_plan_conservative` expose both ranges. Once Start has committed costs, the active-baseline projection uses current cash plus remaining settlement only. Planned/emergency closure returns current gap; after every service day appears in `serviceHistory`, exact `final` is derived from committed cash. Every variant carries the Catalog-exact levy/current-gap/reason/recovery fields and never duplicates a UI-only formula or reconstructs cash outside `InventoryState.ledger`. Projection resolves Story text/Asset IDs/cues into stable UI-neutral records; it never returns React nodes or CSS/layout classes. Every returned record is deeply readonly and uses closed discriminants from the v1 Contract Catalog.

- [ ] **Step 5: Freeze `GameApplicationPort`**

Freeze the Port types under `src/runtime/contracts/`, not `src/app/` or a UI module. Expose only:

```ts
interface CommonApplicationPort {
  readonly session: SessionOperations;
  readonly lifecycle: LifecycleOperations;
  readonly persistence: PersistenceOperations;
  readonly diagnostics: ReadonlyDiagnosticOperations;
  readonly view: ViewModelSubscriptionPort;
}

interface PlayerApplicationPort extends CommonApplicationPort {
  readonly flavor: "player";
  readonly developer: null;
}

interface DeveloperApplicationPort extends CommonApplicationPort {
  readonly flavor: "developer";
  readonly developer: DeveloperOperations;
}

type GameApplicationPort = PlayerApplicationPort | DeveloperApplicationPort;
```

`SessionOperations` exposes `dispatch`, `query`, and `subscribe`, but not Snapshot access/replacement. `LifecycleOperations` freezes Player-safe `startNewRun({ seed })`, `restartRun()`, and `reloadApplication()`; restart reuses the current run's persisted `initialSeed` and Story initial state, while a new run requires an explicit `NonZeroUint32` seed. `PersistenceOperations` freezes `getStatus`, `listSlots`, `saveQuick`, `saveManual`, `loadSlot`, `importSave`, `exportSave`, `clearSlot`, `getLeaseStatus`, `requestCooperativeRelease`, `takeOverLease`, and `releaseLease`. Ordinary Save import/load requires exact `(story.id, story.revision, story.digest, engine.digest)` compatibility; `engine.version`/`appBuildId` are display/diagnostic only, and no `loadAnyway` or `adoptCurrentBuild` exists. `ReadonlyDiagnosticOperations` freezes only `getSummary`, `exportDebugBundle`, and `subscribe`. Developer-only `DeveloperOperations` freezes generic `executeDebugCommand<C extends DebugCommandV1>(command: C): Promise<DebugCommandOperationResultForV1<C>>`, `importDebugBundle`, `replayAuthoritatively`, and `replayBestEffort`; validation failure is a typed resolved result and never enters CommandLog, while best-effort Debug replay never writes a Save Slot or becomes authoritative. Player composition is a statically distinct object with literal `developer:null` and imports no Developer implementation; Developer composition statically injects the complete service. `game-application-port.test.ts` proves both shapes and correlated Debug results, rejects cross-assignment, and scans the Player static dependency graph for every Developer-only method/kind; Phase 4/5 later scan emitted bytes. Every async method returns a discriminated result/code; none throws an error that UI must parse.

`ViewModelSubscriptionPort` exposes only `getSnapshot(): RuntimeViewModelV1` and `subscribe(listener)`. `RuntimeViewModelV1` contains these exact required projections:

```text
run, stage, hud, actions, narrative, lifePolicy, demandForecast, obligation, inventory,
servicePlan, facilityChoice, worldAction, ledger, save, weekSummary, systemStatus
```

and optional Developer-only `diagnostics`. `run` preserves the persisted `initialSeed`, status, and terminal `completion`, plus nullable `startControl` copied only from `getRunStartControl()`; UI never constructs `run.start`. Narrative exposes the latest and ordered resolved-check history needed by Player presentation, while Developer diagnostics exposes the same read-only records rather than recomputing them. `lifePolicy` is null unless selection is currently required; otherwise it carries ordered policy ID/name/AP-by-phase/night-recovery/reason plus the exact typed command and Runtime preview for every option. `ActionViewModelV1` carries the catalog `directCommand`, visibility-filtered availability, separate submission/occupied phases, and a confirmation projection with closed arrays for costs, benefits, mutually excluded Action IDs, and major-risk text IDs; no command that requires confirmation can omit those fields. Every `NarrativeChoiceViewModelV1`, Facility option, and WorldAction option carries the same catalog-backed confirmation shape, so parameterized decisions do not bypass the player-information contract. `worldAction` exposes definition/option/step IDs, the exact four-value persisted progress, active step Scene/phase, and only the typed command that is currently legal; it never constructs commands from display strings or offers Complete before both Scenes have ended. `demandForecast` contains only current day segment ranges and explained ModifierSource/Reason pairs, never random offsets or actual customers. `servicePlan` carries both immediate plan preview, Tavern preview, and nullable Catalog-projected `currentOpeningControl`; the latter is the only source for exact Start/Continue/Finalize command and disabled reasons, and is null while VN owns input. `obligation` is a direct discriminated projection of all three `ObligationForecastV1` variants plus the Story-authored reason and ordered text/optional-Action recommendations, with no invented `precision` field or guessed command. Inventory exposes batch quantity/acquired/last-usable day; persisted `serviceHistory` exposes each opening or planned/emergency closure plus preparation count, applied modifiers/reasons, service AP/stamina/cash/reputation deltas, so reloadable counts, ledger explanations and WeekSummary never depend on the bounded CommandLog. Save exposes all four physical slots plus recovery/compatibility/unsafe status; HUD contains day/phase/AP, both actors' key resources, cash, reputation, and levy; WeekSummary combines persisted completion with persisted service history. Add an exact strict TS/Zod leaf type for every named projection in `view-models.ts`; generic `Record<string, unknown>`, React nodes, class names, and arbitrary callbacks are forbidden.

- [ ] **Step 6: Run focused and architecture tests**

Run: `pnpm vitest run src/runtime/session src/runtime/contracts/game-application-port.test.ts src/runtime/projection && pnpm exec depcruise src --config .dependency-cruiser.cjs`

Expected: PASS; UI has no reason to import Engine internals.

- [ ] **Step 7: Commit Runtime session/projections**

```bash
git add src/runtime/session src/runtime/contracts src/runtime/projection src/app/create-application.ts
git commit -m "feat: add the game application session port"
```

### Task 2: Implement strict isolated Save/Debug import against the frozen envelopes

**Files:**

- Create: `src/runtime/persistence/contracts/save-slots.ts`
- Create: `src/runtime/persistence/contracts/import-result.ts`
- Create: `src/runtime/persistence/import-save.ts`
- Create: `src/runtime/persistence/import-save.test.ts`
- Create: `src/runtime/diagnostics/debug-bundle-codec.ts`
- Create: `src/runtime/diagnostics/import-debug.ts`
- Create: `src/runtime/diagnostics/import-debug.test.ts`
- Create: `src/test-support/runtime/malicious-json-corpus.ts`
- Create: `src/test/fixtures/persistence/auto-current-opening-session.v1.json`
- Create: `src/test/fixtures/persistence/auto-previous-recovery.v1.json`
- Create: `src/test/fixtures/persistence/quick-world-action-session.v1.json`
- Create: `src/test/fixtures/persistence/manual-terminal.v1.json`
- Create: `src/test/fixtures/persistence/corrupt-state-digest.v1.json`
- Create: `src/test/fixtures/persistence/future-format-revision.v1.json`
- Create: `src/test/fixtures/persistence/story-revision-mismatch.v1.json`
- Create: `src/test/fixtures/persistence/digest-mismatch.v1.json`
- Create: `src/test/fixtures/persistence/debug-opening-command-log.v1.json`
- Create: `scripts/persistence/generate-fixtures.mts`
- Create: `scripts/persistence/verify-fixtures.mts`
- Create: `scripts/persistence/persistence-fixtures.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: Phase 1's exact `SaveRecordV1`, `DebugBundleV1`, CommandLog/failure/UI-context, strict JSON, canonical digest, Snapshot, and provenance schemas.
- Produces: bounded import/codecs, typed compatibility outcomes, and language-neutral reviewed fixtures; Runtime does not redefine the envelopes.

- [ ] **Step 1: Write exact envelope and fixture tests first**

Import Phase 1 schemas from the public contract barrel and prove Runtime has no shadow interface. Both Zod envelopes are strict and independent. Assert Save slot Story/sequence/digest equality and that Save metadata has no taint/adoption fields; assert DebugBundle replay-base/current explicit digests and required bounded `runtimeFailures` even when CommandLog is empty. The Debug fixture includes one legal Runtime fault plus the complete closed UI overlay-ID stack and rejects unknown categories/codes/overlays. Each legal fixture carries and round-trips an explicit `initialSeed`; the WorldAction fixture carries an ordered `resolvedChecks` record; the terminal fixture carries catalog-valid `completion`. Parse the nine named fixtures and assert their expected classification: legal Auto/Quick/Manual workflow/terminal states, a legal previous recovery candidate, exact corruption/format/revision/digest outcomes, and one exact DebugBundle replay CommandLog.

Freeze a deterministic fixture pipeline. `fixtures:persistence:generate` builds all nine canonical JSON files from the current Story/Engine provenance, fixed seeds/timestamps/record revisions, and reviewed command inputs; dedicated corruption/revision/digest fixtures are derived by one named mutation after generating a legal base. `fixtures:persistence:verify` regenerates only in memory/temp, byte-compares every tracked fixture, fails on missing/extra/stale bytes, and never writes tracked files. Ordinary tests/CI call only verify. Any later change to Story or Engine digest inputs—including runtime asset manifest/bytes, replay, or replayable Debug handlers—must run generate explicitly, review the semantic diff, and commit every changed legal/mismatch fixture in the same change.

- [ ] **Step 2: Write malicious import tests**

Use the exact Phase 1 strict-JSON profiles: Save max 5 MiB, Debug max 20 MiB; depth 64; array/object 10,000; total nodes 100,000; string 256 KiB; CommandLog 200. Cover duplicate/dangerous/unknown members, truncated JSON, invalid IDs, forged state digest, wrong format/story/revision/digest, invalid references/invariants, and hostile property-based bytes. Assert no Session replacement or IDB write. Fixture JSON is canonical, has fixed timestamps, and is reviewed like golden data; ordinary verification only reads it.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/runtime/persistence/import-save.test.ts src/runtime/diagnostics/import-debug.test.ts scripts/persistence/persistence-fixtures.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement ordered isolated candidate validation**

Pipeline is exactly: byte limit → strict JSON → envelope schema → state digest → four-field compatibility classification → stable references/current Story schema → Engine invariants → compatibility outcome. Only an exact `SaveCompatibilityKeyV1` match (`story.id/revision/digest + engine.digest`) can become a runnable Save candidate; `engine.version` and `appBuildId` never affect compatibility. Mismatches remain inspectable/exportable data and never replace the Session.

- [ ] **Step 5: Implement compatibility discriminants**

Return the Catalog-exact `ImportCompatibilityOutcomeV1`: `exact` has an empty mismatch tuple; `inspect_only` has a non-empty, unique mismatch tuple ordered `story_id → story_revision → story_digest → engine_digest`; `rejected` contains only a non-identity `ImportRejectionCodeV1`. Table-drive every single mismatch and all four simultaneous mismatches. Story revision is inspect-only like the other compatibility fields, not a structural rejection. `engine.version`/`appBuildId` produce no mismatch. No message parsing controls behavior.

- [ ] **Step 6: Implement the generator/read-only verifier, then run corpus/property tests**

Implement both scripts against one shared in-memory fixture builder. The generate entry is the only writer and atomically replaces exactly the nine named canonical files; the verify entry writes no tracked path, regenerates in memory or an ignored temp directory, byte-compares the exact file set, and reports missing/extra/stale files. Add:

```json
"fixtures:persistence:generate": "tsx scripts/persistence/generate-fixtures.mts",
"fixtures:persistence:verify": "tsx scripts/persistence/verify-fixtures.mts"
```

First run `pnpm vitest run scripts/persistence/persistence-fixtures.test.ts`; expected PASS for writer allowlist, deterministic bytes, read-only verification, and stale/missing/extra failures. For the initial reviewed baseline only, run `pnpm fixtures:persistence:generate`, inspect all nine diffs and their intended classifications, then run `pnpm fixtures:persistence:verify && pnpm vitest run src/runtime/persistence src/runtime/diagnostics`. Subsequent ordinary verification never calls generate.

Expected: PASS; arbitrary inputs terminate within test timeout, never mutate current state, and the read-only verifier reports all nine tracked fixture bytes current.

- [ ] **Step 7: Commit envelope/import contracts**

```bash
git add src/runtime/persistence/contracts/save-slots.ts src/runtime/persistence/contracts/import-result.ts src/runtime/persistence/import-save.ts src/runtime/persistence/import-save.test.ts src/runtime/diagnostics/debug-bundle-codec.ts src/runtime/diagnostics/import-debug.ts src/runtime/diagnostics/import-debug.test.ts src/test-support/runtime/malicious-json-corpus.ts src/test/fixtures/persistence scripts/persistence package.json
git commit -m "feat: add bounded save and debug imports"
```

### Task 3: Implement IndexedDB schema, physical slots, CAS, and recovery reads

**Files:**

- Create: `src/runtime/persistence/indexed-db/database.ts`
- Create: `src/runtime/persistence/indexed-db/schema.ts`
- Create: `src/runtime/persistence/indexed-db/lease-record.ts`
- Create: `src/runtime/persistence/indexed-db/save-repository.ts`
- Create: `src/runtime/persistence/indexed-db/save-repository.test.ts`
- Create: `src/runtime/persistence/indexed-db/database-errors.ts`
- Create: `src/test-support/runtime/fake-database.ts`

**Interfaces:**

- Consumes: SaveRecord contracts, idb, fake-indexeddb.
- Produces: exact `[storyId, slotId]` physical keys for `auto.current|auto.previous|quick|manual`, per-slot revisions, atomic Auto rotation, explicit recovery candidate.

- [ ] **Step 1: Write physical-key/CAS tests first**

Freeze `SessionLeaseRecordV1` and caller `LeaseFenceV1` in `lease-record.ts`. The key's `storyId` is exactly `LoadedStory.identity.id`/`SaveRecord.slot.storyId` such as `week.poc_001`, never the CLI key `tavern-poc`, revision, or digest. Repository tests seed the persistent lease row directly (Task 4 has not implemented acquisition yet), then assert Quick/Manual compare expected slot revision plus owner/fencing token. `auto.previous` has no public direct-write method. One Auto transaction reads current, previous, and lease; if current exists and is legal, it re-envelopes that exact snapshot/provenance/savedAt/stateDigest/captured sequence under `slotId="auto.previous"` with the next previous physical revision, then writes the new current with the next current revision. A missing current leaves previous unchanged. Any expected-current revision, lease, validation, abort, or quota failure changes neither slot. Different Story IDs never collide, even with equal slot IDs and digests.

- [ ] **Step 2: Write recovery-read tests**

Validate current and previous independently. Missing/corrupt/schema-invalid/reference-invalid/invariant-invalid current exposes a legal previous only as marked recovery candidate. Identity mismatch still follows compatibility policy. Reads never repair/delete originals.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/runtime/persistence/indexed-db/save-repository.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement database revision 1**

Object stores:

```text
saveRecords       key [storyId, slotId]
settings          key [storyId, key]
diagnosticDrafts  key [storyId, draftId]
sessionLeases     key storyId
```

Database name contains the stable app ID and exact authored Story ID. The duplicated Story ID in each object-store key/envelope is validated on every read/write; no API accepts an arbitrary tuple independent of its record. `schema.ts` creates the `sessionLeases` store and validates the frozen record shape now; Task 4 later implements acquire/release/takeover behavior against this existing contract. Handle blocked upgrade, `versionchange`, abnormal close, quota/private-mode errors, and a newer database revision by entering read-only recovery.

- [ ] **Step 5: Implement write-then-read validation**

Only report save success after transaction completion and a fresh validated read. Simulate abort/quota errors and prove old legal records remain.

- [ ] **Step 6: Run fake IDB tests**

Run: `pnpm vitest run src/runtime/persistence/indexed-db`

Expected: PASS.

- [ ] **Step 7: Commit IDB repository**

```bash
git add src/runtime/persistence/indexed-db src/test-support/runtime/fake-database.ts
git commit -m "feat: add revisioned indexeddb saves"
```

### Task 4: Implement session leases, fencing, and multi-tab cooperation

**Files:**

- Create: `src/runtime/persistence/indexed-db/session-lease.ts`
- Create: `src/runtime/persistence/indexed-db/session-lease.test.ts`
- Create: `src/runtime/persistence/multi-tab/channel.ts`
- Create: `src/runtime/persistence/multi-tab/coordinator.ts`
- Create: `src/runtime/persistence/multi-tab/coordinator.test.ts`
- Create: `src/test-support/runtime/fake-broadcast-channel.ts`
- Modify: `src/runtime/persistence/indexed-db/save-repository.ts`
- Modify: `src/runtime/persistence/indexed-db/save-repository.test.ts`
- Modify: `src/runtime/contracts/persistence-operations.ts`
- Modify: `src/app/create-application.ts`

**Interfaces:**

- Consumes: sessionLeases store, save transaction capability.
- Produces: ownerId/fencingToken acquisition, read-only secondary tabs, cooperative release, explicit takeover, stale-writer rejection.

- [ ] **Step 1: Write stale-writer race tests**

Create two coordinators. Tab A acquires token 1; B is read-only; B force-takes token 2; A misses all messages and later writes. IDB transaction must reject A from persistent lease state, while B succeeds. Put the scenario behind a deterministic table that exercises at least 20 explicit operation interleavings; do not depend on wall-clock timing or sleeps.

- [ ] **Step 2: Write cooperative handoff/channel-loss tests**

BroadcastChannel only requests/releases/notifies. Close/drop every message and prove fencing still prevents overwrite. Normal release/takeover increments token in one transaction. Wire the four frozen lease operations through `PersistenceOperations`; each returns the resulting lease/read-only status as a discriminated value.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/runtime/persistence/indexed-db/session-lease.test.ts src/runtime/persistence/multi-tab/coordinator.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement persistent fencing**

Owner ID uses browser `crypto.randomUUID()` outside simulation. Change `SaveRepository` itself so every Quick/Manual/Auto write transaction reads and checks owner/token plus expected record revision before changing any record; the coordinator cannot be a side-channel guard. Secondary Session is read-only until cooperative or explicit forced takeover.

- [ ] **Step 5: Run the deterministic race matrix**

Run: `pnpm vitest run src/runtime/persistence/indexed-db/session-lease.test.ts src/runtime/persistence/multi-tab/coordinator.test.ts`

Expected: PASS for all 20+ named interleavings without timing sleeps, retries, or runner-specific repeat flags.

- [ ] **Step 6: Commit multi-tab correctness**

```bash
git add src/runtime/persistence/indexed-db/session-lease.ts src/runtime/persistence/indexed-db/session-lease.test.ts src/runtime/persistence/indexed-db/save-repository.ts src/runtime/persistence/indexed-db/save-repository.test.ts src/runtime/persistence/multi-tab src/runtime/contracts/persistence-operations.ts src/app/create-application.ts src/test-support/runtime/fake-broadcast-channel.ts
git commit -m "feat: fence concurrent browser sessions"
```

### Task 5: Implement ordered autosave, Quick/Manual operations, and strict compatibility refusal

**Files:**

- Create: `src/runtime/persistence/auto-save/auto-save-queue.ts`
- Create: `src/runtime/persistence/auto-save/auto-save-queue.test.ts`
- Create: `src/runtime/persistence/persistence-service.ts`
- Create: `src/runtime/persistence/persistence-service.test.ts`
- Create: `src/runtime/persistence/load-continuation.test.ts`
- Create: `src/runtime/persistence/export-json.ts`
- Modify: `src/runtime/persistence/indexed-db/save-repository.ts`
- Modify: `src/runtime/persistence/indexed-db/save-repository.test.ts`
- Modify: `src/app/create-application.ts`

**Interfaces:**

- Consumes: EngineSession committed outcomes, SaveRepository, compatibility results, lease.
- Produces: post-dispatch Auto scheduling, point-in-time Quick/Manual, JSON export/import, and non-destructive exact-compatibility load/refusal behavior.

- [ ] **Step 1: Write queue ordering/coalescing tests**

Successful state-changing dispatch, including `story.action.start`, enqueues Auto; rejection/query does not. Writes per slot serialize. An old queued candidate not started may coalesce to newest; an in-flight old write can never commit after a newer write. StartOpening, every state-changing Opening Continue, and FinalizeOpening each enqueue one candidate.

- [ ] **Step 2: Write point-in-time Quick/Manual tests**

Quick/Manual capture the latest committed Snapshot at invocation, not completion. Session busy is set synchronously at authoritative-operation enqueue, so same-tick `dispatch(); saveQuick()` and `dispatch(); saveManual()` are typed-disabled rather than capturing the pre-command Snapshot. Table-drive the same behavior while any Game/Debug/fixture/load/lifecycle operation is queued or running. Save during HMR invalidation, import validation, or a Session paused by any `EngineFaultV1` category is also disabled with a typed reason.

- [ ] **Step 3: Write exact-compatibility load and mismatch refusal tests**

Exact Story ID/revision/digest plus exact Engine digest permits load after full validation. Validation and replacement run only when the operation reaches the shared Session FIFO front, against the then-current provenance/Session; a successful replacement is one atomic queue item. Table-drive the four independent `SaveCompatibilityKeyV1` fields and assert the exact mismatch code for each. Different `engine.version` with equal key remains compatible and only changes display metadata; different `appBuildId` is irrelevant to Save load. Any key mismatch returns the precise inspection/refusal result, leaves the current Session and all physical slots byte-for-byte unchanged, and keeps JSON export available. Player exposes no bypass. Developer may inspect the parsed candidate but cannot install it as a runnable Save, adopt current provenance, or write it to any Slot. Verify the public port and emitted types contain no `loadAnyway`, `adoptCurrentBuild`, `compatibilityTainted`, `loadedFrom`, or `adopt_current_build` escape hatch. Add both same-tick enqueue orders for Game dispatch versus `loadSlot` and exact `importSave`: earlier Game commit is visible to later validation/replacement; earlier load/import is visible to the later Game command; final state follows FIFO with no lost update or stale validation.

- [ ] **Step 4: Confirm intended failures**

Run: `pnpm vitest run src/runtime/persistence/auto-save src/runtime/persistence/persistence-service.test.ts src/runtime/persistence/indexed-db/save-repository.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement persistence operations outside GameCommand**

Expose `saveQuick`, `saveManual`, `loadSlot`, `importSave`, `exportSave`, and `clearSlot`. None calls engine dispatch or changes sequence/RNG/DomainFacts. Only exact-compatible validated candidates may replace EngineSession, and replacement uses the non-exported shared Session FIFO primitive; no Persistence service receives a direct Snapshot setter.

- [ ] **Step 6: Prove degraded storage behavior**

When IDB is unavailable/quota-failed, continue in-memory, keep a persistent `unsafeToClose` status, never claim success, keep JSON export enabled, and never delete/overwrite old records.

- [ ] **Step 7: Prove load continuation is deterministic**

At every Opening checkpoint—including the saveable gap after an Event Scene completed and `blockingEvent` cleared but before Continue—every WorldAction progress, post-`story.action.start` Narrative, post-check, and terminal fixture, continue directly and continue after export/import/load. Assert exact equality of `initialSeed`, full ordered `resolvedChecks`, terminal `completion`, Opening baseline/committed costs/applied modifiers, ledger/state digest, and remaining command outcomes/RNG draws. Loading a terminal fixture returns its stored WeekSummary without re-running Endings; loading a post-check fixture never rerolls. Feed `WeekMetricsV1` a nonzero load count and assert `loadChangedFuture === false`.

- [ ] **Step 8: Run persistence integration tests**

Run: `pnpm vitest run src/runtime/persistence`

Expected: PASS.

- [ ] **Step 9: Commit persistence service**

```bash
git add src/runtime/persistence/auto-save src/runtime/persistence/persistence-service.ts src/runtime/persistence/persistence-service.test.ts src/runtime/persistence/load-continuation.test.ts src/runtime/persistence/export-json.ts src/runtime/persistence/indexed-db/save-repository.ts src/runtime/persistence/indexed-db/save-repository.test.ts src/app/create-application.ts
git commit -m "feat: add safe save operations"
```

### Task 6: Implement bounded diagnostics, DebugBundle export, and authoritative replay

**Files:**

- Create: `src/runtime/diagnostics/command-log.ts`
- Create: `src/runtime/diagnostics/command-log.test.ts`
- Create: `src/engine/debug/validate-debug-command.ts`
- Create: `src/engine/debug/execute-replayable-debug-command.ts`
- Create: `src/engine/debug/execute-replayable-debug-command.test.ts`
- Create: `src/runtime/diagnostics/fixture-resolver.ts`
- Create: `src/runtime/diagnostics/debug-command-service.ts`
- Create: `src/runtime/diagnostics/debug-command-service.test.ts`
- Create: `src/runtime/diagnostics/debug-service.ts`
- Create: `src/runtime/diagnostics/debug-service.test.ts`
- Create: `src/engine/replay/replay.ts`
- Create: `src/engine/replay/replay.test.ts`
- Create: `src/runtime/diagnostics/privacy-summary.ts`
- Modify: `src/runtime/session/engine-session.ts`
- Modify: `src/runtime/session/engine-session.test.ts`
- Modify: `src/runtime/persistence/persistence-service.ts`
- Modify: `src/runtime/persistence/persistence-service.test.ts`
- Modify: `src/runtime/persistence/load-continuation.test.ts`
- Modify: `src/runtime/contracts/diagnostic-operations.ts`
- Modify: `src/runtime/contracts/developer-operations.ts`
- Modify: `src/app/create-application.ts`

**Interfaces:**

- Consumes: each EngineSession dispatch's single `CommandExecutionAttemptV1`, Engine-owned DebugCommand contracts/owner capabilities, an injected active-Story fixture resolver, state digests, provenance, and the catalog DebugBundle schema.
- Produces: deterministic replayable Debug mutation, validated fixture anchors, 200-entry CommandLog, fault bundle, exact/best-effort classification, replay comparison, and export privacy summary.

- [ ] **Step 1: Write CommandLog eviction/anchor tests**

Modify EngineSession so the same `executeAttempt` object used to publish `attempt.result` is synchronously handed to the built-in CommandLog recorder before dispatch completion; never call `executeCommand` again and never reconstruct attempted draws from the result Snapshot. After 201 dispatches, replayBase advances to the Snapshot immediately before retained `commandLog[0]`; all retained semantic commands, including `story.action.start`, replay to current. Pure UI operations never enter the log. Game rejections/faults record committed before/after RNG equal plus attempted candidate draws and exact typed rejection details.

Implement every `ReplayableDebugCommandV1` mutation under `src/engine/debug/`, so its deterministic Snapshot semantics enter `engineDigest`. Structural decoding may happen at the public boundary, but all Story/state-dependent semantic admission runs only after the operation reaches the front of EngineSession's existing FIFO Promise tail and sees the latest committed Snapshot. Strict semantic admission happens before candidate creation; table-drive every correlated unknown reference, reachable range, Story value, forbidden Aura target, Aura duration-policy mismatch, and state-conflict variant, plus negative tests for all illegal cross-pairs. Validation failure returns the generic `DebugCommandOperationResultForV1<C>.validation_failed`, changes nothing, and never enters CommandLog. An admitted replayable command uses owner capabilities and, within that same queue item, returns only committed/faulted and records the exact attempt for both outcomes; faulted additionally pauses the Session and populates failure, and Debug-source entries cannot encode rejected. The Runtime service branches only between the Engine replayable handler and an injected active-Story `FixtureResolverV1`, but both branches use the same EngineSession tail: unknown/foreign fixtureId returns `debug.unknown_reference`; valid `debug.fixture.load` builds and validates the current Story fixture, then atomically replaces current Snapshot plus replay base and clears the old log inside one queue item; invalid/faulted anchor attempts preserve the old Session and use the Catalog result/failure shapes. Generic `DeveloperOperations.executeDebugCommand<C extends DebugCommandV1>(command: C)` is the only public mutation entry and returns `DebugCommandOperationResultForV1<C>`; common diagnostics remains read-only.

Add same-tick FIFO tests for both enqueue orders of GameCommand versus replayable DebugCommand and GameCommand versus fixture load. The request that reaches the queue first must complete first; a later replayable Debug mutation observes the Game commit, a later Game command observes the debug/fixture commit, and a later fixture anchor intentionally supersedes the earlier Game state only through its documented atomic anchor transition. Also retrofit exact-compatible `loadSlot` and `importSave`: inside their existing single queue item, successful Snapshot replacement must atomically set replayBase to the loaded Snapshot and clear the old CommandLog; refusal changes none of the three. Assert exact commandSequence/log order, anchor clearing behavior, no lost update, no stale semantic validation, and no second queue or direct Snapshot replacement path.

- [ ] **Step 2: Write authoritative replay tests**

Replay submits commands only; recorded DomainFacts/ledgers are expected outputs and are never applied. Compare outcome discriminant, rejection/fault code and exact details/rule slot, Scheduler event/context order, DomainFact/ledger order and digest, state digests, persisted `initialSeed`/`resolvedChecks`/`completion`, and attempted draws. Ignore stack, text message, timings, browser metadata.

- [ ] **Step 3: Write fault bundle tests**

Table-drive `story_rule`, `command_handler`, and `engine_invariant` faults through real EngineSession dispatch. Every category resolves—not rejects—the dispatch Promise with `kind="faulted"`, keeps the exact last legal `currentSnapshot`, records failed command/candidate draws/fault separately, pauses later dispatch and all autosave/Quick/Manual writes, and offers export/load/restart/reload. There is no unsupported rollback/resume operation: recovery installs a separately validated anchor or reloads the Application. A normal faulted result never creates `runtime.dispatch_failed` or a duplicate runtime failure. Optional candidate Snapshot can exist only if safely canonicalizable and clearly labeled. Every bundle already carries required `runtimeFailures` (empty here); Task 7 appends non-command Runtime/Application faults without converting them into CommandLog entries.

- [ ] **Step 4: Confirm intended failures**

Run: `pnpm vitest run src/engine/debug src/runtime/diagnostics src/engine/replay`

Expected: FAIL.

- [ ] **Step 5: Implement exact and best-effort modes**

Exact `SaveCompatibilityKeyV1`—Story ID/revision/digest plus Engine digest—permits authoritative replay. Table-drive all four mismatches independently; `engine.version` and `appBuildId` differences remain diagnostic only. Any key mismatch reports stored/current provenance; Developer may explicitly inspect/best-effort replay, Player cannot bypass DebugBundle mismatch. Best-effort result is never labeled authoritative.

- [ ] **Step 6: Implement privacy summary**

Bundles omit absolute paths, browser history, unrelated storage, and prose bodies. Store stable Story IDs; before export return a Chinese summary of included categories and bytes.

- [ ] **Step 7: Run CommandLog/replay/fault tests and refresh provenance-bound fixtures**

Run: `pnpm vitest run src/engine/debug src/runtime/diagnostics src/engine/replay`

Expected: PASS including 200-entry eviction. Because the new `src/engine/debug/` and `src/engine/replay/` runtime sources are Engine-digest inputs, now run `pnpm fixtures:persistence:generate`, inspect all nine fixture diffs and confirm each legal/mismatch/corrupt classification is preserved, then run `pnpm fixtures:persistence:verify`. Ordinary phase verification remains read-only after this explicit refresh.

- [ ] **Step 8: Commit diagnostics/replay**

```bash
git add src/engine/debug src/engine/replay src/runtime/diagnostics src/runtime/session/engine-session.ts src/runtime/session/engine-session.test.ts src/runtime/persistence/persistence-service.ts src/runtime/persistence/persistence-service.test.ts src/runtime/persistence/load-continuation.test.ts src/runtime/contracts/diagnostic-operations.ts src/runtime/contracts/developer-operations.ts src/test/fixtures/persistence src/app/create-application.ts
git commit -m "feat: add reproducible diagnostic bundles"
```

### Task 7: Handle HMR invalidation/runtime faults and create the Phase 3 gate

**Files:**

- Create: `src/runtime/errors/runtime-errors.ts`
- Create: `src/runtime/errors/runtime-errors.test.ts`
- Create: `src/runtime/session/hmr-invalidation.ts`
- Create: `src/runtime/session/hmr-invalidation.test.ts`
- Create: `scripts/verify-runtime.mts`
- Modify: `src/runtime/diagnostics/debug-service.ts`
- Modify: `src/runtime/diagnostics/debug-service.test.ts`
- Modify: `src/runtime/contracts/diagnostic-operations.ts`
- Modify: `src/runtime/contracts/lifecycle-operations.ts`
- Modify: `src/runtime/session/engine-session.ts`
- Modify: `src/runtime/session/engine-session.test.ts`
- Modify: `src/app/create-application.ts`
- Modify: `package.json`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: the public `src/engine/contracts/provenance.ts` BuildProvenance contract, Vite-injected value, and persistence/diagnostic services; Runtime never imports the App value module for the type.
- Produces: pinned-provenance Session lifecycle, typed async failures, `pnpm verify:runtime`.

- [ ] **Step 1: Write HMR invalidation tests**

Story/Balance/rules/Engine provenance change pauses commands and all IDB writes, allows old-provenance Save/Debug JSON export, and offers fixture restart/new run/full reload. UI/CSS-only change keeps Session. No mixed-digest continuation exists.

- [ ] **Step 2: Write runtime fault taxonomy tests**

Classify CommandRejection, CompatibilityOrContentError, StoryRuleFault, CommandHandlerFault, PersistenceError, AssetLoadError, UiRenderError, async/HMR faults, and EngineInvariantError by the Catalog's stable correlated category/code/cause shapes. Table-drive every `PersistenceFaultCodeV1`, `AssetLoadFaultCodeV1`, `UiFaultCodeV1`, and `RuntimeFaultCodeV1`; explicitly catch event handler, async loader, persistence Promise, dispatch boundary, and HMR failures. Force one out-of-contract throw inside a queued dispatch boundary and prove the shared Promise tail settles into a typed paused state rather than remaining rejected: later gameplay is typed-blocked, an authorized load/restart can enqueue and complete in FIFO order, and no unhandled rejection occurs. Append normalized Runtime/Application faults to the Debug service's bounded `runtimeFailures` in occurrence order while Engine command faults remain in CommandLog/`failure`; neither path mutates Snapshot, and no unhandled rejection or silent console-only path remains.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/runtime/errors src/runtime/session/hmr-invalidation.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement Session invalidation and recovery operations**

Pin provenance at Session creation. Runtime consumes Vite provenance invalidation notification, transitions to `invalidated`, drains/blocks writes, records `runtime.hmr_invalidated`, and returns typed recovery actions without replacing Snapshot. Wire `LifecycleOperations`: `startNewRun` and `restartRun` enqueue through the same Session FIFO, construct and validate a complete initial Snapshot only at queue front, then atomically replace current Snapshot, set the new replayBase, and clear CommandLog; the resulting ViewModel exposes RunStart control and no lifecycle operation silently dispatches/logs `run.start`. `reloadApplication` invokes the App-owned reload capability. Test both same-tick enqueue orders against Game dispatch and prove FIFO final state/anchor/log semantics. Developer fixture restart remains the anchoring `debug.fixture.load` command through `DeveloperOperations`, never a hidden Snapshot setter. Debug export includes the exact bounded/sanitized Runtime failures and required empty/non-empty arrays without inventing a second envelope.

- [ ] **Step 5: Implement the exact runtime verifier**

`verify:runtime` runs simulation gate, Runtime type/boundary tests, read-only `fixtures:persistence:verify`, import corpus/property tests, fake-IDB CAS/lease/queue tests, save/workflow round trips, CommandLog/fault/replay tests, and both Story build smokes. It never calls the fixture generator.

Add the exact script:

```json
{
  "verify:runtime": "tsx scripts/verify-runtime.mts"
}
```

- [ ] **Step 6: Run the Phase 3 gate twice**

Run: `pnpm verify:runtime && pnpm verify:runtime`

Expected: both exit 0; tracked tree remains unchanged.

- [ ] **Step 7: Commit Runtime hardening**

```bash
git add src/runtime/errors src/runtime/session/hmr-invalidation.ts src/runtime/session/hmr-invalidation.test.ts src/runtime/session/engine-session.ts src/runtime/session/engine-session.test.ts src/runtime/diagnostics/debug-service.ts src/runtime/diagnostics/debug-service.test.ts src/runtime/contracts/diagnostic-operations.ts src/runtime/contracts/lifecycle-operations.ts scripts/verify-runtime.mts package.json AGENTS.md src/app/create-application.ts
git commit -m "build: verify persistence and diagnostics"
```

## Phase 3 Completion Check

- [ ] `GameApplicationPort` is the only future UI dependency.
- [ ] Player and Developer ports are statically distinct; Player contains only read-only diagnostic export and no import/replay/mutation implementation.
- [ ] Queries/previews consume no RNG or diagnostic writes.
- [ ] StoryAction/WorldAction confirmation, rejection, and forecast projections share execution calculators and exact catalog payloads.
- [ ] Save/Debug import limits and hostile corpus pass.
- [ ] Auto current/previous rotation is atomic and recovery read is explicit.
- [ ] Stale tabs cannot write after takeover even with no BroadcastChannel messages.
- [ ] Auto/Quick/Manual ordering and point-in-time semantics pass.
- [ ] Save digest mismatch is non-destructive and cannot create a runnable Session; Debug best-effort remains inspection-only.
- [ ] `initialSeed`, resolved checks, and completion survive exact Save/import/load and do not rerun rules.
- [ ] CommandLog eviction remains replayable and exact replay compares regenerated DomainFacts without applying recorded output.
- [ ] HMR cannot mix Story/Engine provenance.
- [ ] `pnpm verify:runtime` exits 0 twice with a clean tree.
