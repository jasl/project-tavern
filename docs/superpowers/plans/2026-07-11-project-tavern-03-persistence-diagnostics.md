# Project Tavern Persistence and Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the generic runtime mutation boundary, persist exact Story snapshots safely through the Host record-store contract, and provide bounded diagnostics plus deterministic replay without exposing authoritative state to Player UI.

**Architecture:** `@project-tavern/base` owns one generic `EngineSession` FIFO, Save/Debug codecs, compatibility policy, persistence orchestration, CommandLog, replay, and generic Player/Developer application ports. `apps/web` alone implements `HostAtomicRecordStoreV1` with IndexedDB; it never leaks an IndexedDB transaction into Base. Every successful load, import, adoption, lifecycle replacement, or fixture anchor establishes a new replay anchor atomically, while writes capture immutable committed snapshots outside `GameCommand` semantics.

**Tech Stack:** Node.js >=22.12.0, pnpm >=11.0.0, TypeScript 7.0.2 strict mode, Zod 4.4.3, idb 8.0.3, fake-indexeddb 6.2.5, Vitest 4.1.10, fast-check 4.9.0, and the Phase 1/2 workspace packages.

## Global Constraints

- Start only after the Foundation walking skeleton and Modules/E2E Story phase gates pass from the live checkout.
- `GameSnapshot` is the only authoritative simulation state. Save metadata, slot status, leases, CommandLog, runtime failures, and UI context never enter it.
- Save, Quick Save, and Auto Save are persistence operations: they consume no RNG, emit no `DomainFact`, and do not increment `commandSequence`.
- Game dispatch, validated load/import/adoption, lifecycle create/restart, replayable DebugCommand, and fixture/DebugBundle anchors share one `EngineSession` FIFO. No second mutation queue or Snapshot setter is permitted.
- Public command dispatch returns `SessionDispatchOperationResultV1<CommandExecutionResultEnvelopeV1<...>>`: only `executed.execution` contains a domain `committed | rejected | faulted` result; admission failure or a preceding queued fault/HMR returns `not_executed` without opening an attempt.
- The Coordinator is called exactly once per admitted command through `executeAttempt`; EngineSession logs that same attempt and never re-executes a command to reconstruct RNG diagnostics.
- Imported Save/Debug bytes are untrusted. The order is bytes → Strict JSON → envelope Schema → state digest → compatibility → stable references → invariants.
- Exact load requires Story ID/revision, state-contract revision/digest, engine digest, and simulation digest. Story digest, presentation digest, engine version, and appBuildId are warnings or diagnostics only.
- Development HMR compares the Story-owned application's accepted Story/Engine/resolved digest identity with a freshly resolved identity. Any changed resolved-digest field invalidates the old Session and requires full rebootstrap; an update that leaves that tuple equal (for example pure CSS, general UI, or developer notes) keeps ordinary HMR.
- Adoption is authorized only by an exact resolved simulation PatchSet declaration. A seventeenth lineage entry returns `compatibility.lineage_limit`; v1 never truncates lineage.
- IndexedDB is a Web Host detail. Base consumes only `HostAtomicRecordStoreV1.read/list/commit` and never receives a callback transaction, DOM object, `window`, or real clock in simulation context.
- Player may write only `quick | manual`; Auto slots are runtime-owned. All four physical slots may be listed, loaded, cleared, and exported.
- Storage failure leaves the in-memory game playable, retains the old records, exposes current-Snapshot JSON export, and never reports false save success.
- Player imports no Developer control implementation, fixture data, mutating DebugCommand handler, or `./development` Story export.
- `@project-tavern/base/runtime` and `@project-tavern/web` stay Player-safe. Mutating control/composition is exported only through `@project-tavern/base/runtime/developer` and `@project-tavern/web/developer`, and only a Story-owned Developer root may import those closed subpaths.
- Every Base public symbol or entrypoint addition updates `packages/base/public-exports.v1.json` in the same task and passes `pnpm verify:public-exports`; no task temporarily relies on an unlisted export.
- Base runtime and Web Host adapter remain MIT and game-neutral. E2E Story integration tests remain PolyForm and use only public package exports.
- `pnpm verify` is read-only: it may generate ignored files under `dist/`, but it must not rewrite tracked Save/Debug fixtures, golden files, lockfiles, or screenshots.
- If implementation requires a new field, kind, code, relaxed JSON escape hatch, or different compatibility rule, stop and update the authoritative specs and contract tests before continuing.

---

## File Map

```text
packages/base/src/runtime/index.ts    # Player-safe public runtime barrel
packages/base/src/runtime/developer/
  index.ts                            # closed mutating Developer-only public subpath

packages/base/src/runtime/session/
  engine-session.ts                 # sole authoritative FIFO, status, anchor replacement
  engine-session.test.ts            # ordering, busy, fault pause, recovery, exact-attempt tests
  runtime-invalidation.ts           # digest-changing HMR invalidation and recovery policy
  runtime-invalidation.test.ts

packages/base/src/runtime/application/
  player-application.ts             # five narrow Player subports over Session/services
  player-application.test.ts        # no Snapshot/setter/Developer reachability
  developer-application.ts          # Developer composition over the Player port
  developer-application.test.ts     # correlated control results and static isolation

packages/base/src/runtime/persistence/
  save-codec.ts                     # strict bounded SaveRecord decode/encode
  save-codec.test.ts
  compatibility.ts                  # exact/adopted/inspect-only/rejected classification
  compatibility.test.ts
  slot-keys.ts                      # stable Host record keys for four physical slots
  save-repository.ts                # CAS, auto rotation, read-back verification
  save-repository.test.ts
  session-lease.ts                  # owner, handoff, takeover, fencing token
  session-lease.test.ts
  persistence-service.ts            # capture, load/import/export/clear, status
  persistence-service.test.ts
  auto-save-queue.ts                # per-slot serialization and queued-candidate coalescing
  auto-save-queue.test.ts

packages/base/src/runtime/diagnostics/
  command-log.ts                    # 200-entry bounded log and replay-base advancement
  command-log.test.ts
  replay.ts                         # authoritative and best-effort replay comparison
  replay.test.ts
  debug-bundle.ts                   # full State Dump/DebugBundle codec and export
  debug-bundle.test.ts
  runtime-failures.ts               # bounded normalized non-command failures
  runtime-failures.test.ts
  developer-control.ts              # fixture/debug anchors and DebugCommand service
  developer-control.test.ts
  privacy.ts                        # size summary and absolute-path scrubbing
  privacy.test.ts

apps/web/src/host/
  indexeddb-record-store.ts         # IndexedDB implementation of atomic CAS batches
  indexeddb-record-store.test.ts

apps/web/src/application/
  create-player-runtime.ts          # Web Host + Player application composition
  create-player-runtime.test.ts

apps/web/src/developer/
  index.ts                           # closed Web Developer public subpath
  create-developer-runtime.ts       # Developer-only static composition
  create-developer-runtime.test.ts
  resolved-digest-hmr.ts            # generic import.meta.hot-to-Session bridge
  resolved-digest-hmr.test.ts

apps/web/src/index.ts               # Player-safe Host/Loader/mount/runtime exports

stories/e2e/src/runtime/
  persistence-roundtrip.test.ts     # real workflow Save/load/import continuation
  diagnostics-replay.test.ts        # real Modules/Profile replay and anchor transitions
  developer-hmr-integration.test.ts # real invalidation/export/rebootstrap behavior

stories/e2e/src/application/
  developer-entry.ts                # Story-owned import.meta.hot wiring

stories/e2e/src/runtime/runtime-fixture-provenance.ts
                                      # frozen generation-time blocking/diagnostic identity

stories/e2e/src/test/fixtures/runtime/
  *.v1.json                          # reviewed provenance-bound Save/Debug vectors

stories/e2e/scripts/
  runtime-fixture-builder.mts        # pure in-memory fixture corpus builder
  regenerate-runtime-fixtures.mts    # explicit side-effecting baseline writer
  verify-runtime-fixtures.mts        # temp regeneration and byte comparison only

scripts/
  collect-import-closure.test.mjs    # Player/Developer subpath reachability regression
  verify-persistence-diagnostics.mts # phase gate; verification only, no baseline writes
  verify-persistence-diagnostics.test.mjs

package.json                         # phase scripts
packages/base/package.json           # Base runtime/developer export and test:runtime
packages/base/public-exports.v1.json # cumulative exact Base entrypoint/symbol inventory
apps/web/package.json                # root/developer exports and exact idb dependencies
stories/e2e/package.json             # E2E test:runtime script
pnpm-lock.yaml                       # frozen dependency graph
```

### Task 1: Freeze the Phase 3 Player composition on the single EngineSession FIFO

**Files:**

- Modify: `packages/base/src/runtime/session/engine-session.ts`
- Modify: `packages/base/src/runtime/session/engine-session.test.ts`
- Create: `packages/base/src/runtime/application/player-application.ts`
- Create: `packages/base/src/runtime/application/player-application.test.ts`
- Modify: `packages/base/src/runtime/index.ts`
- Modify: `packages/base/public-exports.v1.json`

**Interfaces:**

- Consumes: Phase 1 `GameProfileV1`, `CommandCoordinatorV1.executeAttempt`, `CommandExecutionAttemptEnvelopeV1`, `SessionDispatchOperationResultV1`, `RuntimeSessionStatusV1`, `SessionAnchorResultV1`, and synthetic Sandbox Profile.
- Produces: one FIFO for every authoritative operation, a read-only `ReadonlyViewSourceV1`, and the five-subport `PlayerApplicationPortV1` exported from the Player-safe `@project-tavern/base/runtime` without a Snapshot getter or setter.

- [ ] **Step 1: Write the failing FIFO and same-tick busy tests**

Add the following cases to `engine-session.test.ts`. The test coordinator records each call and returns the Snapshot supplied by the test operation so ordering is observable without Demo types.

```ts
it("serializes dispatch and anchor replacement on one tail", async () => {
  const gate = deferred<void>();
  const { session, runtimeControl } = createSyntheticSession();

  const blocker = runtimeControl.enqueueAuthoritative(
    async () => {
      await gate.promise;
      return { kind: "preserve", result: undefined };
    },
    () => undefined,
  );
  const dispatch = session.dispatch({ kind: "counter.increment", amount: 1 });
  expect(session.getStatus()).toBe("busy");
  const anchor = runtimeControl.enqueueAuthoritative(
    async () => ({
      kind: "replace",
      snapshot: syntheticSnapshot({ count: 40, commandSequence: 0 }),
      result: { kind: "anchored", commandSequence: 0 } as const,
      anchor: "replace_replay_base",
    }),
    () => ({ kind: "faulted", code: "runtime.anchor_failed" }) as const,
  );

  gate.resolve();
  await blocker;
  await expect(dispatch).resolves.toMatchObject({
    kind: "executed",
    execution: { kind: "committed" },
  });
  await expect(anchor).resolves.toEqual({
    kind: "anchored",
    commandSequence: 0,
  });
  expect(session.inspectForRuntime().snapshot.state.count).toBe(40);
  expect(session.getStatus()).toBe("ready");
});

it("uses one coordinator attempt for result and diagnostics", async () => {
  const fixture = createAttemptCountingSession();
  await fixture.session.dispatch({ kind: "counter.random_increment", maximum: 4 });
  expect(fixture.executeAttemptCalls()).toBe(1);
  expect(fixture.attemptsSeenByRecorder()).toHaveLength(1);
});

it("does not execute a later accepted dispatch after the first dispatch faults", async () => {
  const fixture = createFaultQueueSession();
  const first = fixture.session.dispatch({ kind: "counter.fault" });
  const second = fixture.session.dispatch({ kind: "counter.increment", amount: 1 });

  await expect(first).resolves.toMatchObject({
    kind: "executed",
    execution: { kind: "faulted" },
  });
  await expect(second).resolves.toEqual({
    kind: "not_executed",
    code: "fault_paused",
  });
  expect(fixture.executeAttemptCalls()).toBe(1);
  expect(fixture.session.getCurrentSnapshot()).toBe(fixture.snapshotBeforeFault());
});
```

- [ ] **Step 2: Run the focused test and confirm the intended failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/engine-session.test.ts src/runtime/application/player-application.test.ts
```

Expected: the Phase 1 EngineSession regression cases remain green, while `player-application.test.ts` fails because the reusable five-subport Base composition does not exist. If a FIFO regression fails, stop and repair the accepted Foundation contract before adding Phase 3 behavior.

- [ ] **Step 3: Retain the Foundation authoritative-operation primitive as the only mutation seam**

Do not create a Phase 3 queue. Keep the Foundation replacement capability private to Base runtime composition and extend its tests for dispatch/anchor interleavings. The public Player port never receives `inspectForRuntime`, `enqueueAuthoritative`, `invalidateForHmr`, or any replacement method. Its reviewed signature remains:

```ts
export interface EngineSessionRuntimeControlV1<TSnapshot> {
  enqueueAuthoritative<T>(
    operation: (current: DeepReadonly<TSnapshot>) => Promise<AuthoritativeOutcomeV1<TSnapshot, T>>,
    normalizeUnexpectedFault: (error: unknown) => T,
  ): Promise<T>;
  inspectForRuntime(): {
    readonly snapshot: DeepReadonly<TSnapshot>;
    readonly status: RuntimeSessionStatusV1;
  };
}

export type AuthoritativeOutcomeV1<TSnapshot, TResult> =
  | { readonly kind: "preserve"; readonly result: TResult }
  | {
      readonly kind: "replace";
      readonly snapshot: TSnapshot;
      readonly result: TResult;
      readonly anchor: "preserve_log" | "replace_replay_base";
    };
```

`enqueueAuthoritative` increments a pending-operation count before returning the Promise, publishes `busy` in the same JavaScript tick, and uses the mandatory total `normalizeUnexpectedFault` callback to settle internal throws as the operation's typed result while preserving the prior Snapshot and pausing the Session. The normalizer itself must be non-throwing and is contract-tested. The tail restores `ready | fault_paused | hmr_invalidated` after the last pending item. Dispatch invokes `coordinator.executeAttempt` exactly once only after the queue-front status check. It then returns `{ kind:"executed", execution }`; a committed execution replaces the Snapshot, while rejection and fault preserve the exact prior object. A fault sets `fault_paused` after its CommandLog hook has received the same attempt. A later dispatch already accepted into the FIFO returns `{ kind:"not_executed", code:"fault_paused" }` without an attempt. The equivalent HMR path returns `hmr_invalidated`. Validated load/import and lifecycle recovery remain eligible to enqueue after a fault; newly submitted gameplay dispatch is not admitted while the published status is `fault_paused` or `hmr_invalidated`.

- [ ] **Step 4: Freeze the Player application composition**

Implement only the Catalog's five narrow members:

```ts
export interface PlayerApplicationDependenciesV1<
  TViewModel,
  TCommand,
  TDispatchResult,
  TAnchorResult,
  TPersistencePort,
  TDebugBundle,
> {
  readonly view: ReadonlyViewSourceV1<TViewModel>;
  dispatch(command: DeepReadonly<TCommand>): Promise<TDispatchResult>;
  readonly lifecycle: SessionLifecyclePortV1<TAnchorResult>;
  readonly persistence: TPersistencePort;
  readonly diagnostics: PlayerDiagnosticsPortV1<TDebugBundle>;
}

export function createPlayerApplicationPortV1<
  TViewModel,
  TCommand,
  TDispatchResult,
  TAnchorResult,
  TPersistencePort,
  TDebugBundle,
>(
  input: PlayerApplicationDependenciesV1<
    TViewModel,
    TCommand,
    TDispatchResult,
    TAnchorResult,
    TPersistencePort,
    TDebugBundle
  >,
): PlayerApplicationPortV1<
  TViewModel,
  PlayerCommandPortV1<TCommand, TDispatchResult>,
  SessionLifecyclePortV1<TAnchorResult>,
  TPersistencePort,
  PlayerDiagnosticsPortV1<TDebugBundle>
> {
  return {
    view: input.view,
    commands: { dispatch: input.dispatch },
    lifecycle: input.lifecycle,
    persistence: input.persistence,
    diagnostics: input.diagnostics,
  };
}
```

`player-application.test.ts` must include compile-time `@ts-expect-error` assertions for `port.snapshot`, `port.session`, `port.setSnapshot`, `port.developer`, and `port.persistence.save("auto.current")`.

For the Sandbox specialization, `TDispatchResult` is exactly `SessionDispatchOperationResultV1<CommandExecutionResultEnvelopeV1<...>>`; neither the Player application nor UI unwraps a `not_executed` result as a domain rejection. `createNewSession()` and `restartSession()` remain parameterless. Their FIFO operation calls `profile.createBootstrapInput(host.bootstrapEntropy)` only at queue front, then passes that one immutable input to Profile and every stateful Module. No public lifecycle caller can supply `rngSeed` or `runId`.

Update `packages/base/src/runtime/index.ts` and the sorted inventory with exactly `PlayerApplicationDependenciesV1` and `createPlayerApplicationPortV1` in `./runtime`. It must not export or import a Developer control module; the closed Developer subpath does not exist until Task 7.

- [ ] **Step 5: Run focused and boundary verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/engine-session.test.ts src/runtime/application/player-application.test.ts
pnpm verify:boundaries
pnpm verify
```

Expected: all commands exit 0; the Sandbox walking skeleton still runs; `git status --short` shows only this task's intended files before commit.

- [ ] **Step 6: Commit the FIFO completion**

```bash
git add -- packages/base/src/runtime/session/engine-session.ts packages/base/src/runtime/session/engine-session.test.ts packages/base/src/runtime/application/player-application.ts packages/base/src/runtime/application/player-application.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json
git commit -m "feat(base): complete the authoritative session fifo"
```

### Task 2: Implement bounded Save decoding and exact compatibility/adoption

**Files:**

- Create: `packages/base/src/runtime/persistence/save-codec.ts`
- Create: `packages/base/src/runtime/persistence/save-codec.test.ts`
- Create: `packages/base/src/runtime/persistence/compatibility.ts`
- Create: `packages/base/src/runtime/persistence/compatibility.test.ts`
- Modify: `packages/base/src/runtime/index.ts`
- Modify: `packages/base/public-exports.v1.json`

**Interfaces:**

- Consumes: `parseStrictJson`, `saveJsonLimitsV1`, `SaveRecordEnvelopeV1`, current `BuildProvenanceV1`, `PatchSetAdoptionDeclarationV1`, Snapshot Schema/reference/invariant validators, and Canonical state digest.
- Produces: strict Save bytes encoder/decoder and the exact `ImportCompatibilityOutcomeV1` classification used by load/import, exposed through Player-safe `@project-tavern/base/runtime` for later public-export-only E2E fixture verification.

- [ ] **Step 1: Write the hostile-input and stage-order tests**

```ts
it.each([
  [duplicateKeySaveBytes, "object.duplicate_key", 0],
  [oversizedSaveBytes, "limit.bytes", 0],
  [unknownEnvelopeFieldBytes, "envelope.schema_invalid", 0],
  [wrongStateDigestBytes, "digest.state_mismatch", 0],
] as const)("rejects at the first stable stage", (bytes, code, referenceChecks) => {
  const context = createSyntheticSaveValidationContext();
  expect(validateSaveImportCandidateV1(bytes, context)).toEqual({ kind: "rejected", code });
  expect(context.referenceChecks()).toBe(referenceChecks);
  expect(context.invariantChecks()).toBe(0);
  expect(context.sessionReplacementCalls()).toBe(0);
});

it("allows presentation drift without changing exact simulation compatibility", () => {
  const stored = syntheticSaveRecord();
  const current = provenance({ presentationDigest: digest("presentation-new") });
  expect(classifySaveCompatibilityV1(stored, current, [])).toMatchObject({
    kind: "exact",
    mismatches: [],
    warnings: [{ field: "presentation_digest" }],
  });
});

it("classifies incompatible identity before touching stable references", () => {
  const context = createSyntheticSaveValidationContext();
  expect(
    validateSaveImportCandidateV1(incompatibleIdentityWithUnknownReferenceBytes, context),
  ).toMatchObject({ kind: "inspect_only" });
  expect(context.referenceChecks()).toBe(0);
  expect(context.invariantChecks()).toBe(0);
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
```

Expected: FAIL because Save bytes and compatibility policy are not implemented.

- [ ] **Step 3: Implement the injected generic validation context**

```ts
export interface SaveCodecContextV1<TSnapshot, TSaveRecord> {
  readonly envelopeSchema: RuntimeSchemaV1<TSaveRecord>;
  digestSnapshot(snapshot: DeepReadonly<TSnapshot>): Digest;
}

export type DecodedSaveV1<TSaveRecord> =
  | { readonly kind: "decoded"; readonly record: TSaveRecord }
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 };

export interface SaveImportValidationContextV1<TSnapshot, TSaveRecord> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): ImportCompatibilityOutcomeV1;
  validateReferences(snapshot: DeepReadonly<TSnapshot>): readonly string[];
  validateInvariants(record: DeepReadonly<TSaveRecord>): readonly string[];
}

export type ValidatedSaveImportV1<TSaveRecord> =
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 }
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" }>
  | {
      readonly kind: "validated";
      readonly record: TSaveRecord;
      readonly compatibility: Extract<
        ImportCompatibilityOutcomeV1,
        { readonly kind: "exact" | "adopted" }
      >;
    };
```

`decodeSaveRecordV1` owns only bytes → Strict JSON → envelope Schema → state digest. The import validator then calls `classifySaveCompatibilityV1`; only `exact | adopted` candidates continue to stable-reference validation and finally Snapshot/Save invariants. `inspect_only` returns its ordered mismatches without invoking reference or invariant validators. Cross-field checks for `slot.storyId`, `slot.capturedCommandSequence`, and the full lineage chain run in the final invariant stage. No later stage runs after an earlier rejection.

```ts
export function validateSaveImportCandidateV1<
  TSnapshot,
  TSaveRecord extends { readonly snapshot: TSnapshot },
>(
  bytes: Uint8Array,
  context: SaveImportValidationContextV1<TSnapshot, TSaveRecord>,
): ValidatedSaveImportV1<TSaveRecord> {
  const decoded = decodeSaveRecordV1(bytes, context.codec);
  if (decoded.kind === "rejected") return decoded;
  const compatibility = context.classifyCompatibility(decoded.record);
  if (compatibility.kind === "rejected" || compatibility.kind === "inspect_only") {
    return compatibility;
  }
  const referenceErrors = context.validateReferences(decoded.record.snapshot);
  if (referenceErrors.length > 0) {
    return { kind: "rejected", code: "reference.unknown_id" };
  }
  return context.validateInvariants(decoded.record).length === 0
    ? { kind: "validated", record: decoded.record, compatibility }
    : { kind: "rejected", code: "invariant.failed" };
}
```

Encoding emits Canonical JSON bytes with no BOM or formatting variance.

Export and add to the sorted `./runtime` inventory exactly `DecodedSaveV1`, `ImportCompatibilityOutcomeV1`, `ImportRejectionCodeV1`, `SaveCodecContextV1`, `SaveImportValidationContextV1`, `ValidatedSaveImportV1`, `classifySaveCompatibilityV1`, `decodeSaveRecordV1`, `encodeSaveRecordV1`, and `validateSaveImportCandidateV1`; no storage or Developer capability is introduced. The two classification/code unions are public because they occur by name in exported codec/context signatures; consumers never need a deep import to express those results.

- [ ] **Step 4: Implement exact/adopted/inspect-only classification**

Table-drive the six blocking fields in the Catalog's fixed order. Adoption is returned only when the sole mismatch is `simulation_digest`, engine/story/state-contract fields match, the current declaration matches `from → to` plus `simulationPatchSetDigest`, and the stored lineage has fewer than 16 entries. The import validator still verifies the complete lineage chain in the final invariant stage before allowing an anchor.

```ts
if (record.simulationLineage.length === 16) {
  return { kind: "rejected", code: "compatibility.lineage_limit" };
}

return {
  kind: "adopted",
  mismatches: [],
  warnings,
  adoption: {
    fromSimulationDigest: storedSimulationDigest,
    toSimulationDigest: current.resolved.simulationDigest,
    viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
    adoptedAtCommandSequence: record.snapshot.commandSequence,
  },
};
```

Add explicit negative cases for 0, 15, and 16 existing lineage entries; extra simulation Hotfix; changed state-contract digest; changed engine digest; reversed from/to; and a presentation-only Hotfix. Inspect-only data remains exportable but cannot produce an anchor candidate.

An exact-compatible record with 16 existing lineage entries still loads exactly. Only an operation that would append the seventeenth adoption returns `compatibility.lineage_limit`.

- [ ] **Step 5: Run focused, property, and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
pnpm verify
```

Expected: all commands exit 0; property tests preserve classification order and never accept malformed lineage; tracked files remain unchanged by verification.

- [ ] **Step 6: Commit the Save codec and policy**

```bash
git add -- packages/base/src/runtime/persistence/save-codec.ts packages/base/src/runtime/persistence/save-codec.test.ts packages/base/src/runtime/persistence/compatibility.ts packages/base/src/runtime/persistence/compatibility.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json
git commit -m "feat(base): validate save compatibility and adoption"
```

### Task 3: Implement the Web IndexedDB atomic record store

**Files:**

- Create: `apps/web/src/host/indexeddb-record-store.ts`
- Create: `apps/web/src/host/indexeddb-record-store.test.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `HostAtomicRecordStoreV1`, `HostStoredRecordV1`, and `HostRecordMutationV1` from `@project-tavern/base`; browser IndexedDB through `idb` only.
- Produces: a Web-only, all-or-nothing `read/list/commit` adapter with revision CAS and stable error normalization.

- [ ] **Step 1: Add exact Web Host dependencies**

Run:

```bash
pnpm --filter @project-tavern/web add --save-exact idb@8.0.3
pnpm --filter @project-tavern/web add --save-dev --save-exact fake-indexeddb@6.2.5
pnpm view idb@8.0.3 name version license repository dist.integrity --json
pnpm view fake-indexeddb@6.2.5 name version license repository dist.integrity --json
```

Use the returned version and integrity only to confirm that the exact requested packages entered the frozen graph. Dependency licensing remains under the package's own terms and is not copied into `THIRD_PARTY_NOTICES.md` or used as a build gate.

Expected: `apps/web/package.json` records exact versions and `pnpm-lock.yaml` changes only for those packages.

- [ ] **Step 2: Write failing atomicity and CAS tests**

```ts
it("commits every mutation or none", async () => {
  const store = await createTestRecordStore();
  await store.commit([
    put("save", "story.test:quick", null, bytes("old")),
    put("lease", "story.test", null, bytes("owner-a")),
  ]);

  const result = await store.commit([
    put("save", "story.test:quick", 0, bytes("new")),
    put("lease", "story.test", 99, bytes("owner-b")),
  ]);

  expect(result).toMatchObject({ kind: "conflict", namespace: "lease" });
  expect(await readText(store, "save", "story.test:quick")).toBe("old");
});

it("lists records by key, not IndexedDB traversal accident", async () => {
  const store = await createTestRecordStore();
  await seedKeys(store, ["z", "a", "m"]);
  expect((await store.list("save")).map((record) => record.key)).toEqual(["a", "m", "z"]);
});

it("opens only the reviewed database revision", async () => {
  const fixture = await createDatabaseAtRevision(2);
  await expect(
    createIndexedDbRecordStoreV1({ indexedDB: fixture.indexedDB }),
  ).rejects.toMatchObject({ code: "persistence.blocked_upgrade" });
  expect(fixture.deletedDatabaseNames()).toEqual([]);
});
```

- [ ] **Step 3: Run the focused test and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/web exec vitest run src/host/indexeddb-record-store.test.ts
```

Expected: FAIL because the IndexedDB Host adapter does not exist.

- [ ] **Step 4: Implement one-transaction declarative batches**

Open database `project-tavern` at schema revision `1` with one object store named `records`, compound key path `["namespace","key"]`, and records `{ namespace, key, revision, bytes }`. The sole upgrade creates that store only for old version `0`; a higher on-disk revision refuses mutation, reports `persistence.blocked_upgrade`, and is never deleted or downgraded.

Before any write, reject duplicate `(namespace,key)` mutations. In a single `readwrite` transaction, read every target, compare `expectedRevision`, abort on the first conflict, and otherwise write/delete all mutations. A new `put` with `expectedRevision:null` creates revision `0`; every successful replacement increments the Host revision by one. Return committed stored records in mutation order. Normalize IDB open/upgrade/transaction/connection failures to the Catalog persistence fault codes; do not catch a conflict as a transaction fault.

- [ ] **Step 5: Run Web Host, boundary, licensing, and full checks**

Run:

```bash
pnpm --filter @project-tavern/web exec vitest run src/host/indexeddb-record-store.test.ts
pnpm verify:boundaries
pnpm verify
```

Expected: all commands exit 0; Base has no `idb`, DOM, or IndexedDB import; licensing verification recognizes the new locked dependencies.

- [ ] **Step 6: Commit the IndexedDB Host adapter**

```bash
git add -- apps/web/src/host/indexeddb-record-store.ts apps/web/src/host/indexeddb-record-store.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add the atomic indexeddb record store"
```

### Task 4: Implement physical slots, CAS rotation, and fenced leases

**Files:**

- Create: `packages/base/src/runtime/persistence/slot-keys.ts`
- Create: `packages/base/src/runtime/persistence/save-repository.ts`
- Create: `packages/base/src/runtime/persistence/save-repository.test.ts`
- Create: `packages/base/src/runtime/persistence/session-lease.ts`
- Create: `packages/base/src/runtime/persistence/session-lease.test.ts`

**Interfaces:**

- Consumes: `HostAtomicRecordStoreV1`, Save codec, four `SaveSlotIdV1` values, `SessionLeaseStatusV1`, and injected owner/request IDs.
- Produces: non-destructive slot reads, atomic Auto current/previous rotation, Quick/Manual record CAS, cooperative handoff, explicit takeover, and monotonically fenced writes.

- [ ] **Step 1: Write the failing slot and lease matrix**

```ts
it("rotates auto current and previous in one fenced batch", async () => {
  const fixture = await createRepositoryFixture();
  await fixture.repository.writeAuto(saveAtSequence(4));
  await fixture.repository.writeAuto(saveAtSequence(5));

  expect(await fixture.repository.read("auto.current")).toMatchObject({
    kind: "valid",
    record: { slot: { capturedCommandSequence: 5 } },
  });
  expect(await fixture.repository.read("auto.previous")).toMatchObject({
    kind: "valid",
    record: {
      recordRevision: 1,
      slot: { slotId: "auto.previous", capturedCommandSequence: 4 },
    },
  });
  expect(fixture.store.committedBatchSizes()).toContain(3);
});

it("rejects an old tab after takeover without relying on BroadcastChannel", async () => {
  const fixture = await createTwoOwnerFixture({ leaseRecord: null });
  const oldLease = await fixture.ownerA.acquireInitial();
  await fixture.ownerB.takeOver();
  await expect(fixture.ownerA.writeQuick(saveAtSequence(8), oldLease)).resolves.toEqual({
    kind: "rejected",
    code: "conflict",
  });
});

it("elects exactly one initial owner with an absent-record CAS", async () => {
  const fixture = await createTwoOwnerFixture({ leaseRecord: null });
  const [ownerA, ownerB] = await Promise.all([
    fixture.ownerA.acquireInitial(),
    fixture.ownerB.acquireInitial(),
  ]);
  expect([ownerA.kind, ownerB.kind].sort()).toEqual(["owned", "readonly"]);
  expect(await fixture.readStoredLease()).toMatchObject({ fencingToken: 1 });
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/session-lease.test.ts
```

Expected: FAIL because slots, leases, and fencing do not exist.

- [ ] **Step 3: Implement stable record keys and lease bytes**

Use these exact key shapes:

```ts
export const saveRecordKeyV1 = (storyId: StoryId, slotId: SaveSlotIdV1) =>
  parseHostRecordKeyV1(`story:${storyId}:slot:${slotId}`);

export const leaseRecordKeyV1 = (storyId: StoryId) =>
  parseHostRecordKeyV1(`story:${storyId}:session-lease`);

interface StoredSessionLeaseV1 {
  readonly revision: 1;
  readonly ownerId: SessionLeaseOwnerId | null;
  readonly fencingToken: PositiveSafeInteger;
  readonly handoff: {
    readonly requestId: LeaseHandoffRequestId;
    readonly requestedByOwnerId: SessionLeaseOwnerId;
  } | null;
}
```

Every Save write batch must CAS-touch the lease record with its current Host record revision in the same batch as slot mutations. The logical `fencingToken` increases only on ownership change; the Host record revision increases on every successful fenced write. BroadcastChannel may later improve UX but is never the correctness boundary.

- [ ] **Step 4: Implement four-slot semantics**

Quick/Manual compare both Host record revision and Save `recordRevision`. Auto write uses one batch: decode the old valid current and re-encode its same Snapshot/provenance/lineage/savedAt with `slotId:"auto.previous"` and the next `auto.previous` record revision; put the new `slotId:"auto.current"` record with the next current revision; then CAS-touch the lease. Raw current bytes are never copied under a mismatched physical slot ID. A corrupt/missing current never deletes or overwrites the prior valid previous. Read returns `empty | valid | invalid`; the higher service marks a valid previous as `recovery_candidate` only when current is missing/invalid. Clear is a CAS delete plus lease touch. Reads never delete or repair bytes.

- [ ] **Step 5: Implement handoff and takeover**

The runtime calls internal `acquireInitial()` once during composition. It creates an absent lease with `expectedRevision:null`, this instance as owner, and `fencingToken:1`; concurrent creation has exactly one winner and every loser re-reads as `readonly`. It never silently steals an existing or unowned record.

`requestHandoff` writes one request ID; only the current owner may approve it. Approval transfers owner and increments the fencing token. `takeOver` does the same without approval and returns the new owned status. `release` sets `ownerId:null` in a CAS update while retaining the monotonic fencing token; its public result is `updated` with the explicit `{ kind:"unowned", ownerId:null, fencingToken }` status. A later explicit takeover claims that record and increments the token. Every available status carries the current owner (or explicit `null`) and fencing token; `handoff_requested` additionally carries both the current owner and requester. Unknown request, changed Host revision, or changed owner returns the exact typed lease rejection.

- [ ] **Step 6: Run repository, lease, property, and full checks**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/session-lease.test.ts
pnpm verify
```

Expected: all commands exit 0; absent-record acquisition elects exactly one token-1 owner, and randomized interleavings never permit a stale writer or partial Auto rotation.

- [ ] **Step 7: Commit slots and leases**

```bash
git add -- packages/base/src/runtime/persistence/slot-keys.ts packages/base/src/runtime/persistence/save-repository.ts packages/base/src/runtime/persistence/save-repository.test.ts packages/base/src/runtime/persistence/session-lease.ts packages/base/src/runtime/persistence/session-lease.test.ts
git commit -m "feat(base): add fenced save slots and leases"
```

### Task 5: Implement capture, autosave, import/load, and degraded recovery

**Files:**

- Create: `packages/base/src/runtime/persistence/auto-save-queue.ts`
- Create: `packages/base/src/runtime/persistence/auto-save-queue.test.ts`
- Create: `packages/base/src/runtime/persistence/persistence-service.ts`
- Create: `packages/base/src/runtime/persistence/persistence-service.test.ts`
- Modify: `packages/base/src/runtime/index.ts`
- Modify: `packages/base/public-exports.v1.json`
- Create: `apps/web/src/application/create-player-runtime.ts`
- Create: `apps/web/src/application/create-player-runtime.test.ts`
- Modify: `apps/web/src/index.ts`
- Modify: `apps/web/type-tests/developer-exports.test-d.ts`
- Create: `stories/e2e/src/runtime/persistence-roundtrip.test.ts`

**Interfaces:**

- Consumes: EngineSession runtime control, Save codec/compatibility, SaveRepository, SessionLease, `GameHostV1.metadataClock/files`, injected generic ResolvedStory/Profile dependencies, and `PersistenceOperationResultV1` DTOs. Only the PolyForm E2E integration test supplies the E2E Story; MIT Web source never imports it.
- Produces: generic Player persistence/lease ports, ordered Auto policy, immutable Quick/Manual capture, exact/adopted anchors, JSON import/export, slot summaries, unsafe-to-close status, a Player-safe Base runtime export, and generic `createPlayerRuntimeV1` from the Player-safe Web root.

- [ ] **Step 1: Write failing capture and coalescing tests**

```ts
it("captures quick at accepted call time and never swaps the candidate", async () => {
  const fixture = createPersistenceFixture({ initialSequence: 3 });
  const save = fixture.service.save("quick");
  await fixture.session.dispatch({ kind: "counter.increment", amount: 1 });
  fixture.store.releaseWrites();
  await expect(save).resolves.toMatchObject({ kind: "saved", slotId: "quick" });
  expect(await fixture.repository.read("quick")).toMatchObject({
    record: { slot: { capturedCommandSequence: 3 } },
  });
});

it("coalesces only auto candidates that have not started", async () => {
  const fixture = createAutoQueueFixture();
  fixture.queue.enqueue(snapshotAtSequence(1));
  fixture.queue.enqueue(snapshotAtSequence(2));
  fixture.queue.enqueue(snapshotAtSequence(3));
  fixture.releaseFirstWrite();
  await fixture.queue.idle();
  expect(fixture.writtenSequences()).toEqual([1, 3]);
});
```

- [ ] **Step 2: Write failing load/import and recovery tests**

Cover both same-tick orders for dispatch versus `load(slot)` and dispatch versus `importSave(bytes)`. Earlier operation wins queue position; a successful later anchor intentionally replaces the earlier Snapshot, and a later command observes the loaded Snapshot. Exact load preserves lineage; adopted load appends one lineage item and swaps provenance to current. Both successful paths return the internal `anchor:"replace_replay_base"` outcome that Task 6 wires to CommandLog. Inspect-only, invalid, and lineage-limit inputs preserve current Snapshot and slots byte-for-byte and return no replacement outcome.

Add a corrupt-current/valid-previous test: list marks previous `recovery_candidate`; no operation loads it automatically. Exercise `exportSave` against valid, empty, invalid, unavailable, and an injected read/CAS race: only the valid case returns `{ kind:"exported", slotId, file }`; every expected failure is a typed result and preserves storage. Add unavailable/quota tests proving `exportCurrentSave` still returns `ExportedSaveV1` bytes without reading IDB.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/auto-save-queue.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @project-tavern/web exec vitest run src/application/create-player-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/persistence-roundtrip.test.ts
```

Expected: FAIL because persistence orchestration and Web composition do not exist.

- [ ] **Step 4: Implement accepted-time capture and write verification**

`save("quick" | "manual")` first checks Session `ready` and owned lease, synchronously captures the current committed Snapshot/provenance, then starts async encoding/storage. After every committed Host write, re-read the slot and lease, decode the envelope, verify state digest, Save record revision, captured sequence, Host revision, and fencing ownership, and only then return `kind:"saved"`. Busy/fault-paused/HMR-invalidated reject before capture.

Successful state-changing dispatch hands its committed Snapshot directly to the internal Auto policy after commit and enqueues that immutable candidate before the public dispatch Promise resolves. Dispatch does not wait for the IDB write. Internal Auto does not call the Player `save` method and is allowed to capture that just-committed Snapshot while the dispatch queue item is finishing; Player Quick/Manual requests remain rejected while Session status is busy. Rejected/faulted dispatch and queries do not enqueue Auto. Each slot has one serial write tail; only not-yet-started Auto candidates may coalesce.

`create-player-runtime.ts` accepts a resolved package/profile/application dependency object from the Story-owned composition root; it has no static Story import. It creates one branded `SessionLeaseOwnerId` per Web application instance and fresh handoff request IDs with `crypto.randomUUID()`, then awaits the one-time absent-record `acquireInitial()` result before exposing persistence status. These platform coordination IDs never use `GameHostV1.bootstrapEntropy`, never enter Snapshot/provenance, and are injected into the generic Base lease service. MIT Web tests use the neutral Base testkit and fixed IDs rather than importing E2E or patching global randomness.

Add exactly `PersistenceServiceV1`, `createPersistenceServiceV1`, and `createAutoSaveQueueV1` to the Player-safe Base runtime barrel and sorted inventory, and `createPlayerRuntimeV1` to `apps/web/src/index.ts`. Extend the existing Web consumer type test with `import { createPlayerRuntimeV1 } from "@project-tavern/web"`; neither barrel imports a Developer application/control file or `@project-tavern/*/development`. The E2E integration imports runtime values only from `@project-tavern/base/runtime`, its Story only from declared `@project-tavern/story-e2e` exports, and never a source/deep path.

- [ ] **Step 5: Implement load/import as one FIFO operation**

At queue front, decode and validate against the then-current ResolvedStory provenance. `exact` replaces the Snapshot while preserving lineage. `adopted` replaces provenance and appends the returned adoption. Both use `AuthoritativeOutcomeV1` with `anchor:"replace_replay_base"`; Task 6 consumes that marker only after CommandLog exists. `inspect_only` maps to `rejected/incompatible`; `compatibility.lineage_limit` maps to `rejected/lineage_limit` while preserving export access. No path writes imported bytes into a physical slot before successful validation and anchor replacement.

`exportCurrentSave()` constructs a non-persisted `ExportedSaveV1` with a record whose `recordRevision:1`, `slotId:"manual"`, `writeReason:"manual"`, Snapshot/lineage, and Host metadata time are captured when the call is accepted; it does not use IDB. `exportSave(slot)` re-reads and validates the stored record, then returns `SaveExportOperationResultV1`: `exported` contains the slot and file, while empty, invalid, unavailable, or a read/CAS race returns the exact typed rejection and never rejects the Promise for an expected condition. Both successful export wrappers set `digest === digestBytes(bytes)`; raw-file integrity never reuses a semantic digest domain. `importSave(bytes)` never writes a physical slot implicitly; after a successful import anchor the player may explicitly save Manual. `clear` never changes Session state.

- [ ] **Step 6: Prove real workflow continuation**

In `persistence-roundtrip.test.ts`, use the E2E Story's public fixture/command APIs to round-trip at these exact states: active Narrative choice, Opening blocking event after Save, the gap after event Scene end but before `tavern.opening.continue`, each WorldAction progress value, a persisted `ResolvedCheck`, and terminal completion. Continue both directly and after load; assert identical state digests, RNG draws, ledger, Opening baseline, check result, and completion. Loading never re-runs a check or Ending rule.

- [ ] **Step 7: Run focused and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence
pnpm --filter @project-tavern/web exec vitest run src/application/create-player-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/persistence-roundtrip.test.ts
pnpm verify
```

Expected: all commands exit 0; four-slot status and workflow continuation pass; verification does not alter tracked files.

- [ ] **Step 8: Commit persistence orchestration**

```bash
git add -- packages/base/src/runtime/persistence/auto-save-queue.ts packages/base/src/runtime/persistence/auto-save-queue.test.ts packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json apps/web/src/application/create-player-runtime.ts apps/web/src/application/create-player-runtime.test.ts apps/web/src/index.ts apps/web/type-tests/developer-exports.test-d.ts stories/e2e/src/runtime/persistence-roundtrip.test.ts
git commit -m "feat(runtime): add save and recovery operations"
```

### Task 6: Add the bounded CommandLog and authoritative replay

**Files:**

- Create: `packages/base/src/runtime/diagnostics/command-log.ts`
- Create: `packages/base/src/runtime/diagnostics/command-log.test.ts`
- Create: `packages/base/src/runtime/diagnostics/replay.ts`
- Create: `packages/base/src/runtime/diagnostics/replay.test.ts`
- Modify: `packages/base/src/runtime/index.ts`
- Modify: `packages/base/public-exports.v1.json`
- Modify: `packages/base/src/runtime/session/engine-session.ts`
- Modify: `packages/base/src/runtime/session/engine-session.test.ts`
- Modify: `packages/base/src/runtime/persistence/persistence-service.ts`
- Modify: `packages/base/src/runtime/persistence/persistence-service.test.ts`
- Create: `stories/e2e/src/runtime/diagnostics-replay.test.ts`

**Interfaces:**

- Consumes: the single Coordinator `executeAttempt` result, Canonical state digest, semantic Game/Debug commands, current provenance, and Session anchor transitions.
- Produces: a 200-entry replayable log, correctly advanced replay base, exact replay comparison, and read-only best-effort inspection exported through Player-safe `@project-tavern/base/runtime` without any anchoring control.

- [ ] **Step 1: Write the failing 201-entry mixed-outcome test**

```ts
it("moves the replay base before evicting the 201st mixed entry", () => {
  const log = createCommandLogV1({ replayBase: snapshotAtSequence(0), limit: 200 });
  for (const fixture of mixedAttempts(201)) {
    log.appendGameAttempt(fixture.command, fixture.attempt);
  }

  expect(log.entries()).toHaveLength(200);
  expect(log.entries()[0]?.logOrdinal).toBe(2);
  expect(log.replayBaseStateDigest()).toBe(stateDigest(afterAttempt(1)));
  expect(log.entries().at(-1)?.outcome.kind).toBe(mixedAttempts(201).at(-1)?.kind);
});
```

The mixed corpus must include committed, rejected, and a final faulted Game command. Rejection/fault keep equal pre/post state digests and committed RNG; attempted candidate draws remain recorded. A fault is final because Session pauses until a new anchor clears the log.

- [ ] **Step 2: Write failing exact replay comparisons**

Replay submits commands only. Assert comparison of outcome discriminant, stable rejection/fault code and details/rule slot, ordered Facts/ledger, pre/post state digest, sequence, and every attempted draw. Explicitly mutate one recorded Fact and prove replay reports a mismatch instead of applying it. Presentation/appBuild mismatch may return `visualMatch:false` while simulation stays authoritative; engine/state-contract/simulation mismatch cannot be authoritative.

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics/command-log.test.ts src/runtime/diagnostics/replay.test.ts src/runtime/session/engine-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts
```

Expected: FAIL because attempts are not yet retained or replayed.

- [ ] **Step 4: Implement log append and eviction**

```ts
export interface CommandLogV1<
  TSnapshot,
  TLoggedCommand,
  TEntry,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> {
  append(
    command: TLoggedCommand,
    attempt: CommandExecutionAttemptEnvelopeV1<
      TSnapshot,
      TFact,
      TRejection,
      TFault,
      TRngState,
      TRngDrawTrace
    >,
  ): void;
  establishAnchor(snapshot: TSnapshot): void;
  replayBase(): DeepReadonly<TSnapshot>;
  entries(): readonly TEntry[];
}
```

EngineSession hands the exact attempt to the log synchronously before resolving dispatch. Log entries receive monotonically increasing `logOrdinal`; they never reuse `commandSequence` as log identity because rejected/faulted attempts do not increment it. Internally retain `{ publicEntry, postAttemptSnapshot }` for each of the bounded entries; `postAttemptSnapshot` is the committed result Snapshot or the unchanged input Snapshot for reject/fault and is not serialized into `CommandLogEntryV1`. When over limit, assign the evicted record's `postAttemptSnapshot` as the new replay base, then remove that record. Eviction therefore never executes a command a second time. Faulted entries cannot precede later retained entries without an anchor transition.

`establishAnchor(snapshot)` replaces the replay base, empties all public/internal entries, and resets the next `logOrdinal` to 1. Anchoring operations themselves never appear as ordinary log entries.

- [ ] **Step 5: Implement authoritative and best-effort replay**

Authoritative replay first verifies Story ID/revision, state-contract revision/digest, engine digest, and simulation digest. It executes each logged semantic command and compares stable outputs; it never reads recorded Facts as input. After the final entry it also requires the replayed Snapshot digest to equal the declared `currentStateDigest`, including the empty-log case where replay base and current must agree. Best-effort Developer inspection may run against mismatch provenance but returns `authoritative:false`, never anchors a Session, and never writes a Save slot.

Successful load/import/adoption/lifecycle anchors call `establishAnchor`; failed anchors preserve base and entries. Add tests that adoption clears pre-adoption logs before the persistence operation resolves. Fixture/DebugBundle anchoring is added and tested only in Task 7 through the closed Developer control subpath.

Add exactly `CommandLogV1`, `ReplayComparisonV1`, `createCommandLogV1`, `replayAuthoritativelyV1`, and `inspectReplayBestEffortV1` to the Player-safe runtime barrel and sorted inventory. `diagnostics-replay.test.ts` imports them only from `@project-tavern/base/runtime`; the barrel does not expose `anchorFixture`, `anchorDebugBundle`, `executeDebugCommand`, or any Developer application factory.

- [ ] **Step 6: Run focused and full checks**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics/command-log.test.ts src/runtime/diagnostics/replay.test.ts src/runtime/session/engine-session.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts
pnpm verify
```

Expected: all commands exit 0; 201-entry eviction replays exactly; recorded Facts are never applied; verification leaves tracked files unchanged.

- [ ] **Step 7: Commit CommandLog and replay**

```bash
git add -- packages/base/src/runtime/diagnostics/command-log.ts packages/base/src/runtime/diagnostics/command-log.test.ts packages/base/src/runtime/diagnostics/replay.ts packages/base/src/runtime/diagnostics/replay.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json packages/base/src/runtime/session/engine-session.ts packages/base/src/runtime/session/engine-session.test.ts packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts stories/e2e/src/runtime/diagnostics-replay.test.ts
git commit -m "feat(base): add bounded command replay"
```

### Task 7: Build DebugBundle export and the isolated Developer control port

**Files:**

- Create: `packages/base/src/runtime/diagnostics/debug-bundle.ts`
- Create: `packages/base/src/runtime/diagnostics/debug-bundle.test.ts`
- Create: `packages/base/src/runtime/diagnostics/runtime-failures.ts`
- Create: `packages/base/src/runtime/diagnostics/runtime-failures.test.ts`
- Create: `packages/base/src/runtime/diagnostics/privacy.ts`
- Create: `packages/base/src/runtime/diagnostics/privacy.test.ts`
- Create: `packages/base/src/runtime/diagnostics/developer-control.ts`
- Create: `packages/base/src/runtime/diagnostics/developer-control.test.ts`
- Create: `packages/base/src/runtime/application/developer-application.ts`
- Create: `packages/base/src/runtime/application/developer-application.test.ts`
- Modify: `packages/base/src/runtime/index.ts`
- Create: `packages/base/src/runtime/developer/index.ts`
- Create: `packages/base/type-tests/runtime-developer-exports.test-d.ts`
- Modify: `packages/base/public-exports.v1.json`
- Modify: `packages/base/package.json`
- Create: `apps/web/src/developer/create-developer-runtime.ts`
- Create: `apps/web/src/developer/create-developer-runtime.test.ts`
- Modify: `apps/web/src/developer/index.ts`
- Modify: `apps/web/type-tests/developer-exports.test-d.ts`
- Modify: `stories/sandbox/src/application/developer-entry.tsx`
- Modify: `scripts/collect-import-closure.test.mjs`

**Interfaces:**

- Consumes: Player-safe `@project-tavern/base/runtime`, `DebugBundleEnvelopeV1`, CommandLog/replay, runtime-failure codes, Story `./development` fixture resolver supplied only by a Story-owned Developer root, a Profile-owned replayable DebugCommand handler with caller-supplied command/result types, Host clock/file port, and bounded UI context provider.
- Produces: full State Dump/DebugBundle bytes and the Catalog-defined `ExportedDebugBundleV1` from Player-safe `@project-tavern/base/runtime`; closed `@project-tavern/base/runtime/developer` and `@project-tavern/web/developer` subpaths for fixture/DebugBundle anchors, authoritative/best-effort replay control, and typed DebugCommand execution; plus bounded diagnostics within the bundle itself. The export file wrapper contains only filename/media type/digest/bytes; UI derives any display summary from already validated diagnostics rather than a second unversioned DTO.

- [ ] **Step 1: Write failing DebugBundle and privacy tests**

```ts
it("exports one self-contained bounded bundle", async () => {
  const fixture = createDiagnosticsFixture();
  fixture.failures.append(
    runtimeFailure({
      operation: "/Users/alice/project/src/save.ts",
      message: "failed at C:\\Users\\alice\\save.ts",
    }),
  );
  const exported = await fixture.service.exportDebugBundle();
  const decoded = decodeDebugBundleV1(exported.bytes, fixture.validation);

  expect(exported).toMatchObject({
    filename: expect.stringMatching(/\.debug-bundle\.json$/),
    mediaType: "application/json",
    digest: digestBytes(exported.bytes),
  });
  expect("summary" in exported).toBe(false);
  expect(decoded).toMatchObject({
    kind: "decoded",
    bundle: {
      replayBaseStateDigest: fixture.replayBaseDigest,
      currentStateDigest: fixture.currentDigest,
    },
  });
  expect(new TextDecoder().decode(exported.bytes)).not.toContain("/Users/alice");
  expect(new TextDecoder().decode(exported.bytes)).not.toContain("C:\\Users\\alice");
});
```

Also assert the 20 MiB Debug limit, 50 runtime-failure limit, 64 KiB message/stack limit, 4 KiB operation/cause fields, at most 16 overlay-ID entries each drawn from the Catalog's closed union, and absence of browser history/unselected files/arbitrary storage.

Decode tests must independently verify both `replayBaseStateDigest` and `currentStateDigest`, even for an empty CommandLog. Strict JSON/envelope/digest/reference/invariant failures return stable staged results and never invoke a Session anchor. Identity mismatch remains Developer inspection-only unless authoritative replay identity matches exactly.

- [ ] **Step 2: Write failing Developer command and anchor tests**

Structural DebugCommand Schema rejection occurs before enqueue. Reference, Aura policy, range, and state-conflict validation occurs at queue front against the latest committed Snapshot. Validation failure consumes no RNG/sequence and writes no log. Admitted replayable commands can only commit/fault, and both append a Debug-source entry from the same attempt. Fixture/DebugBundle anchor success replaces Snapshot/replay base and clears log; failure preserves all three and is not logged as a normal command.

Add package-export type assertions in the two declared `*.test-d.ts` files:

```ts
// packages/base/type-tests/runtime-developer-exports.test-d.ts
import { decodeDebugBundleV1 } from "@project-tavern/base/runtime";
import {
  createDeveloperApplicationPortV1,
  createDeveloperControlV1,
} from "@project-tavern/base/runtime/developer";

export type BaseRuntimeExportWitnessV1 = {
  readonly decode: typeof decodeDebugBundleV1;
  readonly application: typeof createDeveloperApplicationPortV1;
  readonly control: typeof createDeveloperControlV1;
};

// @ts-expect-error mutating Developer control is absent from the Player-safe Base barrel
export { createDeveloperControlV1 } from "@project-tavern/base/runtime";
```

```ts
// apps/web/type-tests/developer-exports.test-d.ts
import { createPlayerRuntimeV1 } from "@project-tavern/web";
import { createDeveloperRuntimeV1 } from "@project-tavern/web/developer";

export type WebRuntimeExportWitnessV1 = {
  readonly player: typeof createPlayerRuntimeV1;
  readonly developer: typeof createDeveloperRuntimeV1;
};

// @ts-expect-error Developer composition is absent from the Player-safe Web root
export { createDeveloperRuntimeV1 } from "@project-tavern/web";
```

Extend the real import-closure test rather than testing only synthetic packages:

```js
test("keeps both Developer subpaths behind the Story Developer root", async () => {
  const player = await collectManagedPaths(repositoryRoot, [
    "stories/sandbox/src/application/player-entry.tsx",
  ]);
  const developer = await collectManagedPaths(repositoryRoot, [
    "stories/sandbox/src/application/developer-entry.tsx",
  ]);
  const forbiddenToPlayer = [
    "packages/base/src/runtime/developer/",
    "apps/web/src/developer/",
    "stories/sandbox/src/development.ts",
  ];

  assert(forbiddenToPlayer.every((prefix) => !player.some((path) => path.startsWith(prefix))));
  assert(developer.includes("packages/base/src/runtime/developer/index.ts"));
  assert(developer.includes("apps/web/src/developer/index.ts"));
  assert(developer.includes("stories/sandbox/src/development.ts"));
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics/debug-bundle.test.ts src/runtime/diagnostics/runtime-failures.test.ts src/runtime/diagnostics/privacy.test.ts src/runtime/diagnostics/developer-control.test.ts src/runtime/application/developer-application.test.ts
pnpm --filter @project-tavern/web exec vitest run src/developer/create-developer-runtime.test.ts
pnpm typecheck
node --test scripts/collect-import-closure.test.mjs
```

Expected: focused runtime tests fail because bundle/control composition is absent; typecheck fails because the two closed package exports do not exist; the real-root closure assertion fails because the Developer root does not yet import all three Developer-only entries.

- [ ] **Step 4: Implement bounded bundle construction**

Construct exactly one `DebugBundleEnvelopeV1` containing provenance, optional appBuildId, lineage, generatedAt metadata, replay base/log/current Snapshot and both explicit digests, diagnostics, ordered runtime failures, optional command failure, and optional closed UI context. Use `debugBundleJsonLimitsV1` and Canonical JSON. Player diagnostics exposes only current bundle export; it cannot inspect/import/replay.

`runtimeFailures` records Persistence/Asset/UI/async/HMR failures only. Engine command faults remain in CommandLog plus `failure` and never create a duplicate `runtime.dispatch_failed` entry. Scrub local absolute paths before size calculation and export.

Add exactly `RuntimeFailureBufferV1`, `createPlayerDiagnosticsServiceV1`, `createRuntimeFailureBufferV1`, `decodeDebugBundleV1`, and `encodeDebugBundleV1` to the Player-safe runtime barrel and sorted inventory. That barrel contains no import or re-export of `developer-control.ts`, `developer-application.ts`, or `runtime/developer/index.ts`.

- [ ] **Step 5: Implement correlated Developer control**

```ts
export interface ActiveStoryDevelopmentResolverV1<TFixtureId, TSnapshot> {
  resolveFixture(
    fixtureId: TFixtureId,
    seed: NonZeroUint32,
  ): { readonly kind: "resolved"; readonly snapshot: TSnapshot } | { readonly kind: "unknown" };
}

export function createDeveloperApplicationPortV1<TPlayerPort, TControl>(
  player: TPlayerPort,
  control: TControl,
): DeveloperApplicationPortV1<TPlayerPort, TControl> {
  return { player, control };
}
```

Base Developer control stays generic as `executeDebugCommand<TCommand, TResult>(command: TCommand): Promise<TResult>` and preserves the result type supplied by the selected Profile; Base never names or reconstructs Demo `DebugCommandOperationResultForV1`. `inspectDebugBundle`, `inspectReplayBestEffort`, and `replayAuthoritatively` run against an isolated replay instance; even exact authoritative replay never enqueues, replaces the current Session, or writes storage. Only `anchorDebugBundle` and fixture load are anchoring operations and enqueue through the one Session tail. Tests assert the current Snapshot/replay base/log remain byte-for-byte unchanged after both successful and failed authoritative replay. The Player composition file must not import this module or the Story development export.

`create-developer-runtime.ts` accepts the Developer resolver/control dependencies from the Story-owned Developer application root and has no static `./development` or Story import. `anchorFixture(fixtureId)` resolves the authored seed stored beside that fixture in the active Story's `StoryDevelopmentSupportV1`, then calls `resolveFixture(fixtureId, authoredSeed)`. The typed `debug.fixture.load` command instead passes its explicit validated seed to the same resolver. Neither path accepts a fixture from another Story or exposes a general Player seed setter.

`anchorDebugBundle` accepts only a fully decoded bundle whose Story ID/revision, state-contract revision/digest, engine digest, and simulation digest match the active ResolvedStory and whose replay verifies to `currentStateDigest`. Presentation/appBuild mismatch may be reported but does not prevent simulation replay. Inspection of a mismatched bundle remains read-only and cannot be converted into Save bytes or a runnable anchor.

Create `packages/base/src/runtime/developer/index.ts` as the only public export of `createDeveloperControlV1` and `createDeveloperApplicationPortV1`, then add exactly this package mapping without changing the existing root/runtime/testkit targets:

```json
{
  "exports": {
    "./runtime/developer": "./src/runtime/developer/index.ts"
  }
}
```

Add the matching sorted inventory entry `"./runtime/developer"` with target `"./src/runtime/developer/index.ts"` and exactly the two symbols `createDeveloperApplicationPortV1` and `createDeveloperControlV1`.

`apps/web/src/developer/index.ts` keeps the Phase 1 `DevelopmentPanel` export and adds `createDeveloperRuntimeV1`; `apps/web/src/index.ts` remains unchanged and never re-exports either. The existing Web manifest target remains `"./developer": "./src/developer/index.ts"`. The Sandbox Developer root directly imports its own `../development`, `@project-tavern/base/runtime/developer`, and `@project-tavern/web/developer`, then injects resolved Story dependencies. The Sandbox Player root is not modified. Generic Base/Web Developer implementations never import a Story package or Story ID.

```ts
import { createDeveloperControlV1 } from "@project-tavern/base/runtime/developer";
import { createDeveloperRuntimeV1 } from "@project-tavern/web/developer";
import { sandboxDevelopmentEntryV1 } from "../development.js";

const control = createDeveloperControlV1({
  development: sandboxDevelopmentEntryV1,
  ...resolvedSandboxDeveloperDependencies,
});
createDeveloperRuntimeV1({ player: sandboxPlayerApplication, control });
```

- [ ] **Step 6: Run diagnostics, source-isolation, and full checks**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics src/runtime/application/developer-application.test.ts
pnpm --filter @project-tavern/web exec vitest run src/developer/create-developer-runtime.test.ts
pnpm typecheck
node --test scripts/collect-import-closure.test.mjs
pnpm verify:boundaries
pnpm build
pnpm verify
```

Expected: all commands exit 0; declared package roots resolve; the real Sandbox Developer closure reaches both Developer subpaths and its own development entry; the Player source/bundle graph reaches none of those paths and contains no fixture resolver or mutating DebugCommand handler.

- [ ] **Step 7: Commit DebugBundle and Developer control**

```bash
git add -- packages/base/src/runtime/diagnostics/debug-bundle.ts packages/base/src/runtime/diagnostics/debug-bundle.test.ts packages/base/src/runtime/diagnostics/runtime-failures.ts packages/base/src/runtime/diagnostics/runtime-failures.test.ts packages/base/src/runtime/diagnostics/privacy.ts packages/base/src/runtime/diagnostics/privacy.test.ts packages/base/src/runtime/diagnostics/developer-control.ts packages/base/src/runtime/diagnostics/developer-control.test.ts packages/base/src/runtime/application/developer-application.ts packages/base/src/runtime/application/developer-application.test.ts packages/base/src/runtime/index.ts packages/base/src/runtime/developer/index.ts packages/base/type-tests/runtime-developer-exports.test-d.ts packages/base/public-exports.v1.json packages/base/package.json apps/web/src/developer/create-developer-runtime.ts apps/web/src/developer/create-developer-runtime.test.ts apps/web/src/developer/index.ts apps/web/type-tests/developer-exports.test-d.ts stories/sandbox/src/application/developer-entry.tsx scripts/collect-import-closure.test.mjs
git commit -m "feat(runtime): add diagnostic bundles and developer control"
```

### Task 7A: Harden invalidation and recovery before freezing runtime fixtures

**Files:**

- Create: `packages/base/src/runtime/session/runtime-invalidation.ts`
- Create: `packages/base/src/runtime/session/runtime-invalidation.test.ts`
- Modify: `packages/base/src/runtime/session/engine-session.ts`
- Modify: `packages/base/src/runtime/session/engine-session.test.ts`
- Modify: `packages/base/src/runtime/developer/index.ts`
- Modify: `packages/base/type-tests/runtime-developer-exports.test-d.ts`
- Modify: `packages/base/public-exports.v1.json`
- Modify: `packages/base/src/runtime/persistence/persistence-service.ts`
- Modify: `packages/base/src/runtime/persistence/persistence-service.test.ts`
- Modify: `packages/base/src/runtime/diagnostics/runtime-failures.ts`
- Modify: `packages/base/src/runtime/diagnostics/runtime-failures.test.ts`
- Create: `apps/web/src/developer/resolved-digest-hmr.ts`
- Create: `apps/web/src/developer/resolved-digest-hmr.test.ts`
- Modify: `apps/web/src/developer/index.ts`
- Modify: `apps/web/type-tests/developer-exports.test-d.ts`
- Modify: `stories/sandbox/src/application/developer-entry.tsx`
- Create: `stories/e2e/src/application/developer-entry.ts`
- Create: `stories/e2e/src/runtime/developer-hmr-integration.test.ts`
- Modify: `stories/e2e/package.json`
- Modify: `stories/e2e/tsconfig.json`
- Modify: `pnpm-lock.yaml`
- Modify: `scripts/collect-import-closure.test.mjs`

**Interfaces:**

- Consumes: each Story-owned Developer application's accepted Story/Engine/resolved digest identity, its real `import.meta.hot`, Task 7 diagnostics export, persistence recovery operations, and the cumulative Base public export inventory.
- Produces: the final Phase 3 EngineSession/persistence/runtime-failure implementation; a generic closed-Web-subpath HMR bridge; real Sandbox and E2E Developer-root wiring; and fault/HMR recovery semantics that are fully green before Task 8 freezes any engine-digest-bound bytes.

- [ ] **Step 1: Write failing invalidation and recovery tests**

```ts
it("invalidates digest-changing HMR without mixing session identities", async () => {
  const fixture = createRuntimeFixture({
    bootstrapEntropy: fixedBootstrapEntropy({
      uuids: ["00000000-0000-4000-8000-000000000043"],
      seeds: [0x00023049],
    }),
  });
  fixture.invalidate({ kind: "resolved_digest_changed" });

  expect(fixture.session.getStatus()).toBe("hmr_invalidated");
  await expect(
    fixture.player.commands.dispatch({ kind: "counter.increment", amount: 1 }),
  ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
  await expect(fixture.player.persistence.save("quick")).resolves.toEqual({
    kind: "rejected",
    code: "busy",
  });
  await expect(fixture.player.diagnostics.exportDebugBundle()).resolves.toMatchObject({
    mediaType: "application/json",
    bytes: expect.any(Uint8Array),
  });
  await expect(fixture.player.persistence.exportCurrentSave()).resolves.toMatchObject({
    mediaType: "application/json",
    bytes: expect.any(Uint8Array),
  });

  const replacement = await fixture.fullRebootstrapDeveloperApplication();
  expect(fixture.session.getStatus()).toBe("hmr_invalidated");
  expect(replacement.session.getStatus()).toBe("ready");
  expect(replacement.acceptedResolvedIdentity()).toEqual(fixture.nextResolvedIdentity());
});

it("skips a dispatch already queued behind a digest-changing HMR boundary", async () => {
  const fixture = createRuntimeFixture();
  const gate = deferred<void>();
  const blocker = fixture.runtimeControl.enqueueAuthoritative(
    async () => {
      await gate.promise;
      return { kind: "preserve", result: undefined };
    },
    () => undefined,
  );
  const queued = fixture.player.commands.dispatch({ kind: "counter.increment", amount: 1 });
  fixture.invalidate({ kind: "resolved_digest_changed" });
  gate.resolve();

  await blocker;
  await expect(queued).resolves.toEqual({
    kind: "not_executed",
    code: "hmr_invalidated",
  });
  expect(fixture.executeAttemptCalls()).toBe(0);
  expect(fixture.commandLogEntries()).toHaveLength(0);
});
```

Add a queued internal-throw test: the tail resolves a typed fault, pauses gameplay, then permits an authorized exact load or restart queued afterward. No unhandled rejection occurs. A fault-paused Session may recover by a validated anchor; an HMR-invalidated Session may only export the last legal Save/DebugBundle before the Story-owned application destroys it and constructs a fresh runtime.

In `resolved-digest-hmr.test.ts`, drive a fake `ImportMetaHotLikeV1` through a real accepted-update callback. The immutable comparison tuple is exactly Story ID/revision/digest, Engine digest, state-contract revision/digest, simulation digest, and presentation digest. Every single-field change, a resolution failure, or a newly added resolved field that is not accounted for must call the invalidation controller exactly once. An accepted update whose tuple remains byte-for-byte equal must not invalidate; this is how pure CSS, shared UI, and developer-note updates retain ordinary HMR. `engine.version` and `appBuildId` are not resolved-digest inputs and do not enter this invalidation tuple.

In `developer-hmr-integration.test.ts`, boot the actual E2E Developer application with a fake Vite hot channel, change each resolved-digest input class (Story/Module/rule/value/text/asset), and assert the resulting digest-tuple change immediately publishes `hmr_invalidated`. A queued or new command returns `not_executed/hmr_invalidated`, opens no Coordinator attempt, appends no CommandLog entry, and enqueues no Auto Save. Current-Snapshot Save and DebugBundle export still succeed under the old provenance. Only `fullRebootstrapDeveloperApplication()` creates a ready replacement using the new resolved identity; the old Session remains invalidated. A CSS/general-UI/developer-note update with an equal tuple leaves the same Session ready.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/runtime-invalidation.test.ts src/runtime/session/engine-session.test.ts src/runtime/persistence/persistence-service.test.ts src/runtime/diagnostics/runtime-failures.test.ts
pnpm --filter @project-tavern/web exec vitest run src/developer/resolved-digest-hmr.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/developer-hmr-integration.test.ts
```

Expected: FAIL because invalidation/recovery policy, the Web HMR bridge, and the two Story-owned Developer-root connections are not wired.

- [ ] **Step 3: Implement recovery policy and real Story-owned HMR wiring**

Digest-changing invalidation sets `hmr_invalidated`, blocks new and already-queued dispatch before attempt, blocks Quick/Manual capture, cancels pending Auto candidates that have not begun, records one `runtime.hmr_invalidated`, and preserves the last legal Snapshot/provenance for current-Snapshot Save/Debug export. Fault pause allows diagnostics export, validated load/import, lifecycle create/restart, and application reload; its successful anchor returns that Session to `ready`. HMR invalidation has no in-place anchor, restart, or presentation-only continuation: the Story-owned Developer application must discard the old composition and fully re-resolve/rebootstrap.

Normalize persistence/asset/UI/async failures into `runtimeFailures`. Do not convert an ordinary Coordinator fault into `runtime.dispatch_failed`; only an out-of-contract Runtime boundary throw uses that code.

Add exactly `RuntimeInvalidationControllerV1` and `createRuntimeInvalidationControllerV1` to the closed `@project-tavern/base/runtime/developer` barrel and its sorted inventory entry. The factory is implemented inside Base and wraps EngineSession's private invalidation capability; callers receive only the closed Developer controller, never the private handle or an extended Player-safe runtime control. Extend `runtime-developer-exports.test-d.ts` with positive Developer-subpath imports and negative Player-safe-root imports. Invalidating a Session is a Developer mutation capability: `@project-tavern/base/runtime` must neither export it nor gain a static edge to `./developer`.

Implement `installResolvedDigestHmrV1` in `@project-tavern/web/developer`. It accepts a structural `ImportMetaHotLikeV1`, an immutable identity resolver, and the Base invalidation controller; snapshots the accepted tuple at boot; installs the real `hot.accept` callback; re-resolves on each accepted JavaScript update; and invalidates once when any tuple field differs or resolution fails. It never guesses from filenames. Equal tuples are a no-op, so Vite's CSS handling and general UI/developer-note changes remain normal HMR. Export the helper and its public types only from `apps/web/src/developer/index.ts`; extend `developer-exports.test-d.ts` with a positive `@project-tavern/web/developer` import and a negative Player-root import.

`stories/sandbox/src/application/developer-entry.tsx` and the new `stories/e2e/src/application/developer-entry.ts` are the only owners of `import.meta.hot`. Each passes its freshly resolved Story identity and its active runtime invalidation controller to the generic Web helper, and each exposes one full-rebootstrap callback that reconstructs Loader/Profile/Session/application state rather than mutating the old Session. The E2E package adds the declared `@project-tavern/web: workspace:*` dependency, TypeScript project reference, and matching lockfile importer update. Extend the real import-closure test so both Story Developer roots reach `apps/web/src/developer/resolved-digest-hmr.ts` and their own `./development` entry, while Sandbox Player and E2E default roots reach neither the Web Developer subpath nor either Developer application. The test also asserts both Developer roots contain the `import.meta.hot` handoff; no Web or Base module statically imports a Story.

- [ ] **Step 4: Run the hardened runtime and full pre-fixture gate**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session src/runtime/persistence src/runtime/diagnostics
pnpm --filter @project-tavern/web exec vitest run src/developer
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/developer-hmr-integration.test.ts
pnpm verify:public-exports
pnpm verify:boundaries
pnpm typecheck
pnpm verify
git diff --check
```

Expected: every command exits 0; fault/HMR recovery, real `import.meta.hot` wiring, Player/Developer reachability, and cumulative public exports are green. Digest-changing updates pause commands and Auto Save while retaining export/rebootstrap; equal-tuple updates do not invalidate. No runtime fixture file exists or is regenerated in this task; the hardened source closure is now stable input for Task 8.

- [ ] **Step 5: Commit runtime hardening before fixture generation**

```bash
git add -- packages/base/src/runtime/session/runtime-invalidation.ts packages/base/src/runtime/session/runtime-invalidation.test.ts packages/base/src/runtime/session/engine-session.ts packages/base/src/runtime/session/engine-session.test.ts packages/base/src/runtime/developer/index.ts packages/base/type-tests/runtime-developer-exports.test-d.ts packages/base/public-exports.v1.json packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts packages/base/src/runtime/diagnostics/runtime-failures.ts packages/base/src/runtime/diagnostics/runtime-failures.test.ts apps/web/src/developer/resolved-digest-hmr.ts apps/web/src/developer/resolved-digest-hmr.test.ts apps/web/src/developer/index.ts apps/web/type-tests/developer-exports.test-d.ts stories/sandbox/src/application/developer-entry.tsx stories/e2e/src/application/developer-entry.ts stories/e2e/src/runtime/developer-hmr-integration.test.ts stories/e2e/package.json stories/e2e/tsconfig.json pnpm-lock.yaml scripts/collect-import-closure.test.mjs
git commit -m "feat(runtime): harden invalidation and recovery"
```

### Task 8: Freeze reviewed Save and Debug fixture bytes

**Files:**

- Create: `stories/e2e/src/test/fixtures/runtime/auto-current-opening-blocked.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/auto-previous-recovery.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/quick-world-action-ready.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/manual-terminal.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/adoption-exact-patchset.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/adoption-lineage-limit.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/corrupt-state-digest.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/future-format-revision.v1.json`
- Create: `stories/e2e/src/test/fixtures/runtime/debug-opening-command-log.v1.json`
- Create: `stories/e2e/src/runtime/runtime-fixture-provenance.ts`
- Create: `stories/e2e/scripts/runtime-fixture-builder.mts`
- Create: `stories/e2e/scripts/regenerate-runtime-fixtures.mts`
- Create: `stories/e2e/scripts/verify-runtime-fixtures.mts`
- Create: `stories/e2e/src/runtime/runtime-fixtures.test.ts`
- Modify: `stories/e2e/package.json`
- Modify: `package.json`

**Interfaces:**

- Consumes: fixed E2E Story identity/seed/run IDs and development command fixtures, the green Task 7A runtime, a reviewed generation-time provenance lock, Save/Debug codecs, CommandLog, adoption declarations, and explicit corruption transforms.
- Produces: nine reviewed language-neutral fixture files bound to the lock's blocking identity, frozen generation-time diagnostic provenance, explicit `regenerate:runtime-fixtures`, package `verify:runtime-fixtures`, and an extended root `verify:fixtures` that never writes tracked files or refreshes provenance implicitly.

- [ ] **Step 1: Write the failing fixture verifier test**

```ts
it.each([
  ["auto-current-opening-blocked.v1.json", "exact"],
  ["auto-previous-recovery.v1.json", "exact"],
  ["quick-world-action-ready.v1.json", "exact"],
  ["manual-terminal.v1.json", "exact"],
  ["adoption-exact-patchset.v1.json", "adopted"],
  ["adoption-lineage-limit.v1.json", "compatibility.lineage_limit"],
  ["corrupt-state-digest.v1.json", "digest.state_mismatch"],
  ["future-format-revision.v1.json", "envelope.unsupported_revision"],
] as const)("keeps %s in its reviewed classification", async (filename, expected) => {
  const bytes = await readRuntimeFixture(filename);
  expect(classifyRuntimeFixture(bytes)).toBe(expected);
});

it("replays the tracked DebugBundle to its current digest", async () => {
  const bundle = await readRuntimeFixture("debug-opening-command-log.v1.json");
  await expect(replayTrackedDebugBundle(bundle)).resolves.toMatchObject({
    authoritative: true,
    finalStateDigest: trackedDebugBundleCurrentDigest,
  });
});

it("keeps frozen bytes loadable when only diagnostic provenance drifts", async () => {
  const frozen = runtimeFixtureProvenanceV1;
  const current = withDiagnosticDrift(frozen, {
    storyDigest: digest("later-story-presentation"),
    presentationDigest: digest("later-presentation"),
    engineVersion: "later-display-label",
    appBuildId: digest("later-application"),
  });

  expect(current.blocking).toEqual(frozen.blocking);
  expect(classifyTrackedSave("manual-terminal.v1.json", current)).toMatchObject({
    kind: "exact",
    warnings: [
      { code: "identity.story_digest_mismatch" },
      { code: "identity.presentation_digest_mismatch" },
    ],
  });
  await expect(replayTrackedDebugBundleWithCurrentIdentity(current)).resolves.toMatchObject({
    authoritative: true,
    visualMatch: false,
  });
  expect(buildRuntimeFixturesV1({ provenance: frozen })).toEqual(
    await readAllTrackedRuntimeFixtureBytes(),
  );
});
```

The drift test also covers a presentation-only Hotfix-set warning in the Catalog-defined order. `engine.version` and `appBuildId` remain display/diagnostic fields: they may lower Debug replay's visual match and appear in diagnostics, but they produce neither a blocking Save mismatch nor a reason to rewrite tracked fixture bytes.

- [ ] **Step 2: Run the verifier test and confirm failure**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/runtime-fixtures.test.ts
```

Expected: FAIL because the tracked runtime fixture corpus and generator do not exist.

- [ ] **Step 3: Freeze generation provenance and implement one deterministic builder**

Create `runtime-fixture-provenance.ts` as a deeply frozen, reviewed source lock captured only after Task 7A is green. It has two explicit groups:

- `blocking`: Story ID/revision, state-contract revision/digest, Engine digest, and simulation digest.
- `diagnosticAtGeneration`: Story digest, presentation digest, presentation Hotfix-set identity, Engine version, and appBuildId.

`runtime-fixture-builder.mts` is a side-effect-free function that starts from fixed E2E development fixtures, fixed `DemoGameBootstrapInputV1` values, fixed UTC timestamps, and that frozen lock—not freshly generated presentation/Story/application diagnostics—then returns the complete filename-to-bytes map. It executes commands through the real Profile/Session and preserves the exact byte arrays returned by the public Save/Debug encoders: Canonical JSON with no BOM, indentation, or trailing newline. The four legal Save records and the DebugBundle are generated directly. The adoption record changes only the stored simulation digest and supplies the exact accepted declaration. The lineage-limit record carries 16 valid chained entries and requests one more adoption. Corrupt-digest and future-revision files are produced from a named legal base by changing exactly one field and re-encoding through the same Canonical JSON codec.

`regenerate-runtime-fixtures.mts` is the only tracked-path writer and calls that pure builder. Before writing, it resolves the live blocking identity and requires exact equality with the lock. It never derives, refreshes, or rewrites `runtime-fixture-provenance.ts`. A genuine blocking-identity change therefore requires a deliberate edit to the lock plus explicit regeneration/review in the same diff; diagnostic-only drift requires neither.

The generator deletes no unknown files and refuses to run unless the working tree has no changes under `stories/e2e/src/test/fixtures/runtime/`. It is never invoked by `pnpm verify` or CI.

- [ ] **Step 4: Implement byte-for-byte read-only verification**

`verify-runtime-fixtures.mts` first resolves the current identity. It requires only the six blocking fields to equal the frozen lock; it deliberately does not require current Story digest, presentation digest/Hotfix set, Engine version, or appBuildId to equal generation-time diagnostics. It then invokes the pure builder with the frozen lock into a temporary directory, compares the sorted expected filename set and every byte, validates each expected classification against the current identity, and removes the temporary directory. Missing, extra, stale, differently classified, or blocking-identity-mismatched files fail.

For diagnostic drift, the verifier must prove that legal Saves remain `exact`/loadable with Catalog-ordered Story/presentation/Hotfix warnings, and that the DebugBundle remains simulation-authoritative while `visualMatch` may be false and diagnostic differences remain visible. It never rebuilds expected bytes from current diagnostic provenance, never opens the lock or tracked fixture paths for writing, and never treats a diagnostic warning as a regeneration requirement.

Add these exact scripts:

```jsonc
// stories/e2e/package.json
{
  "scripts": {
    "regenerate:runtime-fixtures": "node scripts/regenerate-runtime-fixtures.mts",
    "verify:runtime-fixtures": "node scripts/verify-runtime-fixtures.mts"
  }
}

// root package.json: preserve Phase 1 Sandbox and add Phase 2/3 E2E checks
{
  "scripts": {
    "verify:fixtures": "node scripts/verify-fixtures.mjs && pnpm --filter @project-tavern/story-e2e verify:fixtures && pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures"
  }
}
```

- [ ] **Step 5: Generate once, review the semantic diff, then verify read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-e2e regenerate:runtime-fixtures
git add -N -- stories/e2e/src/runtime/runtime-fixture-provenance.ts stories/e2e/src/test/fixtures/runtime
git diff -- stories/e2e/src/runtime/runtime-fixture-provenance.ts stories/e2e/src/test/fixtures/runtime
pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures
before="$(git status --porcelain=v1)"
pnpm verify:fixtures
after="$(git status --porcelain=v1)"
test "$before" = "$after"
```

Expected: regeneration creates exactly nine reviewed JSON files and never rewrites the reviewed provenance source lock; the diff shows the frozen generation identity plus only the declared legal/adoption/corruption distinctions; both verifiers exit 0; the status comparison exits 0.

- [ ] **Step 6: Run full verification**

Run:

```bash
pnpm verify
git diff --check
```

Expected: both commands exit 0; `pnpm verify` leaves the provenance lock and all nine tracked fixture bytes unchanged, including when a test supplies diagnostic-only current drift.

- [ ] **Step 7: Commit the reviewed runtime fixture corpus**

```bash
git add -- stories/e2e/src/test/fixtures/runtime/auto-current-opening-blocked.v1.json stories/e2e/src/test/fixtures/runtime/auto-previous-recovery.v1.json stories/e2e/src/test/fixtures/runtime/quick-world-action-ready.v1.json stories/e2e/src/test/fixtures/runtime/manual-terminal.v1.json stories/e2e/src/test/fixtures/runtime/adoption-exact-patchset.v1.json stories/e2e/src/test/fixtures/runtime/adoption-lineage-limit.v1.json stories/e2e/src/test/fixtures/runtime/corrupt-state-digest.v1.json stories/e2e/src/test/fixtures/runtime/future-format-revision.v1.json stories/e2e/src/test/fixtures/runtime/debug-opening-command-log.v1.json stories/e2e/src/runtime/runtime-fixture-provenance.ts stories/e2e/scripts/runtime-fixture-builder.mts stories/e2e/scripts/regenerate-runtime-fixtures.mts stories/e2e/scripts/verify-runtime-fixtures.mts stories/e2e/src/runtime/runtime-fixtures.test.ts stories/e2e/package.json package.json
git commit -m "test(runtime): freeze save and debug fixtures"
```

### Task 9: Add the read-only persistence and diagnostics phase gate

**Files:**

- Create: `scripts/verify-persistence-diagnostics.mts`
- Create: `scripts/verify-persistence-diagnostics.test.mjs`
- Modify: `package.json`
- Modify: `packages/base/package.json`
- Modify: `apps/web/package.json`
- Modify: `stories/e2e/package.json`

**Interfaces:**

- Consumes: green Task 7A hardened runtime, reviewed Task 8 fixture bytes/provenance lock, all Phase 3 focused suites, Phase 2 Story gates, and root verification scripts.
- Produces: `pnpm verify:persistence-diagnostics`, a deterministic read-only phase gate and package-owned suite aliases; it changes no runtime source, public export, identity, or fixture byte.

- [ ] **Step 1: Write the failing phase-gate contract test**

```js
import assert from "node:assert/strict";
import test from "node:test";

const expectedPhase3CommandsV1 = [
  ["pnpm", ["--filter", "@project-tavern/base", "run", "test:runtime"]],
  ["pnpm", ["--filter", "@project-tavern/web", "run", "test:host"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "run", "test:runtime"]],
  ["pnpm", ["verify:fixtures"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["test:node"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["build"]],
];

test("owns an exact read-only Phase 3 command list", async () => {
  const { phase3VerificationCommandsV1 } = await import("./verify-persistence-diagnostics.mts");
  assert.deepEqual(phase3VerificationCommandsV1, expectedPhase3CommandsV1);
  assert(Object.isFrozen(phase3VerificationCommandsV1));
  for (const command of phase3VerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert(
    !phase3VerificationCommandsV1.some(([, args]) =>
      args.some((arg) => /regenerate|update:|release:prepare/u.test(arg)),
    ),
  );
});
```

The test also asserts every package alias named by the gate exists, the command array and nested argument arrays are deeply frozen, the runner exits on the first nonzero status, and no command mutates the nine fixture files or their frozen provenance lock.

- [ ] **Step 2: Run the gate test and confirm failure**

Run: `node --test scripts/verify-persistence-diagnostics.test.mjs`

Expected: FAIL because the Phase 3 verifier module and package-owned aliases do not exist.

- [ ] **Step 3: Implement the exact phase verifier**

`scripts/verify-persistence-diagnostics.mts` runs these existing commands sequentially and exits on the first nonzero result:

```ts
const phase3CommandV1 = <TArgs extends readonly string[]>(executable: "pnpm", args: TArgs) =>
  Object.freeze([executable, Object.freeze(args)] as const);

export const phase3VerificationCommandsV1 = Object.freeze([
  phase3CommandV1("pnpm", ["--filter", "@project-tavern/base", "run", "test:runtime"]),
  phase3CommandV1("pnpm", ["--filter", "@project-tavern/web", "run", "test:host"]),
  phase3CommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "run", "test:runtime"]),
  phase3CommandV1("pnpm", ["verify:fixtures"]),
  phase3CommandV1("pnpm", ["verify:public-exports"]),
  phase3CommandV1("pnpm", ["test:node"]),
  phase3CommandV1("pnpm", ["verify:boundaries"]),
  phase3CommandV1("pnpm", ["build"]),
] as const);
```

Add the exact root script:

```json
{
  "scripts": {
    "verify:persistence-diagnostics": "node scripts/verify-persistence-diagnostics.mts"
  }
}
```

Add these exact package scripts so the verifier names concrete, owned suites:

```jsonc
// packages/base/package.json
{ "scripts": { "test:runtime": "vitest run src/runtime" } }

// apps/web/package.json
{
  "scripts": {
    "test:host": "vitest run src/host src/application/create-player-runtime.test.ts src/developer"
  }
}

// stories/e2e/package.json
{ "scripts": { "test:runtime": "vitest run src/runtime" } }
```

The verifier is type-erasable `.mts` executed by the supported Node runtime's native TypeScript stripping; it uses no enum, namespace, parameter property, path alias, or transform-required syntax and adds no second TypeScript runtime. It runs only read-only tests and builds; it never calls `regenerate:fixtures`, `update:golden`, or any other baseline writer.

- [ ] **Step 4: Run the phase gate twice and prove a clean tree**

Run:

```bash
before="$(git status --porcelain=v1)"
pnpm verify:persistence-diagnostics
pnpm verify
pnpm verify:persistence-diagnostics
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

Expected: every command exits 0; `test` exits 0; no tracked fixture, manifest, lockfile, golden, or screenshot changes appear.

- [ ] **Step 5: Commit only the phase gate**

```bash
git add -- scripts/verify-persistence-diagnostics.mts scripts/verify-persistence-diagnostics.test.mjs package.json packages/base/package.json apps/web/package.json stories/e2e/package.json
git commit -m "build: add the persistence diagnostics phase gate"
```

## Phase Acceptance

Run from the exact Phase 3 head after reviewing every task commit:

```bash
pnpm install --frozen-lockfile
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:public-exports
pnpm verify:persistence-diagnostics
pnpm verify
pnpm verify:persistence-diagnostics
pnpm verify
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git diff --check
git status --short --branch
```

Expected: both gates exit 0 twice; the tracked-file hash snapshot is byte-for-byte identical; whitespace validation passes; final status contains only deliberately retained pre-existing work, if any.

- [ ] `EngineSession` has one authoritative FIFO and calls `executeAttempt` exactly once per admitted Game/Debug command.
- [ ] Public Game dispatch returns `executed.execution` only after a real attempt; admission failure or a queued fault/HMR skip returns `not_executed` with no Coordinator, RNG, sequence, Fact, Auto Save, or CommandLog trace.
- [ ] Busy is visible in the enqueueing tick; fault pause allows its documented anchor recovery, while HMR invalidation blocks commands/Auto Save, preserves last-legal Save/Debug export, and requires a fresh Story-owned application rebootstrap.
- [ ] Real Sandbox and E2E Developer roots hand `import.meta.hot` to the closed Web HMR bridge; every Story/Engine/resolved-digest change invalidates exactly once, while equal-tuple CSS/general-UI/developer-note updates retain the current Session.
- [ ] Base consumes only the declarative Host record-store contract; IndexedDB and `idb` imports exist only under `apps/web`.
- [ ] Four physical slots, atomic Auto rotation, Quick/Manual CAS, read-back verification, exactly one absent-record initial lease owner, explicit unowned state, handoff, takeover, and fencing tests pass.
- [ ] Save/Debug imports follow the fixed validation stage order and never partially replace Session or storage.
- [ ] Exact compatibility uses Story ID/revision, state-contract revision/digest, engine digest, and simulation digest; presentation/story/app metadata remain warnings only.
- [ ] Exact PatchSet adoption establishes a new anchor and appends lineage; the seventeenth adoption returns `compatibility.lineage_limit` without truncation.
- [ ] Active Narrative, every Opening interruption gap, every WorldAction progress value, resolved checks, and terminal completion round-trip through Save/load/import without repeated costs, RNG, effects, checks, or Ending evaluation.
- [ ] CommandLog remains replayable after 201 mixed attempts and never reapplies recorded Facts as state.
- [ ] DebugBundle is the only State Dump format, enforces size/privacy limits, and distinguishes command failure from bounded runtime failures.
- [ ] Nine blocking-identity-bound Save/Debug fixtures retain their reviewed bytes and classifications; generation-time diagnostic provenance is frozen, current diagnostic drift remains loadable/visible, and only the explicit regeneration command can rewrite fixture bytes.
- [ ] Package-export type tests and real-root import-closure tests prove Player-safe Base/Web roots cannot reach either Developer subpath or Story `./development`, while both Story-owned Developer roots positively reach their development entry and the Web HMR bridge.
- [ ] The cumulative Base inventory lists every new Player-safe runtime symbol and every closed `./runtime/developer` symbol exactly, including the Developer-only invalidation controller; `pnpm verify:public-exports` exits 0.
- [ ] Player exposes only read-only diagnostic export. Developer mutation/fixtures/import/replay remain in the Developer-only static graph.
- [ ] `pnpm verify:persistence-diagnostics` and `pnpm verify` both exit 0 twice from the intended phase diff.
- [ ] Verification does not modify any tracked file; `git diff --check` passes.
