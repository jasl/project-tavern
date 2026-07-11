# Project Tavern Phase 3 Persistence, Runtime Capabilities, and Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase 2 的 GameSession、ResolvedGame、统一 E2E Artifact 和 SemanticGamePort 上实现持久化、RuntimeCapabilities、统一 GameApplicationPort、RunIntegrity、CommandLog/Replay、DebugTools、DebugBundle 与同一应用根 HMR。

**Architecture:** Base 继续拥有一个 GameSession FIFO、严格 Save/Debug codec、兼容策略、RunIntegrity、Persistence orchestration、CommandLog 和 replay；Web 只实现 Host/IndexedDB、capability preference 和同一根 HMR 适配。DebugTools 与 SemanticGamePort 分离但存在于同一个 GameApplicationPort，所有 capability 在执行点复查；不存在 Developer application root、Developer subpath、Developer Artifact 或 bundle-absence 权限边界。

**Tech Stack:** TypeScript 7.0.2、React 19.2.7、Vite 8.1.4、Vitest 4.1.10、Playwright 1.61.1、Zod 4.4.3、idb 8.0.3、fake-indexeddb 6.2.5、Node.js >=22.12.0、pnpm >=11.0.0。

## Global Constraints

- 本计划以 docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md 为最高优先级架构输入。
- Phase 2 Acceptance、pnpm verify:phase2 和当前完整 pnpm verify 必须在本阶段开始前通过，工作树状态必须明确。
- 所有权威操作共享一条 GameSession FIFO：Gameplay dispatch、合法 load/import/adoption、lifecycle replacement、replayable DebugCommand 和 fixture/DebugBundle anchor。
- GameSession 调用同一个 GameCommandExecutor attempt 恰好一次；CommandLog 消费该 attempt，不允许为诊断或 replay 重新执行当前命令。
- CommandLog 只记录 schema 实际 parse 后的 GameCommand/DebugCommand 与 Session-finalized attempt；Semantic invocation、UI form 和 Story executor 的未最终 candidate 不入日志。
- RunIntegrity 是 GameSnapshot envelope 的引擎字段，不属于 Story Gameplay State；Story Rules、Resolvers、Modules、Queries 和 UI 不得修改它。
- Save reference/invariant validators 只接收 Gameplay State；Debug schema、queue-front validation 和 executor 由 ResolvedGame.gameSimulation 拥有，延迟 tooling 只提供 fixtures、notes 和 form adapter。
- Snapshot digest 覆盖 RunIntegrity；RuntimeCapabilities 当前开关不进入 Snapshot、Save、state-contract digest、simulation digest 或 commandSequence。
- RuntimeCapabilities 默认全部 false；changing a toggle 不重建 ResolvedGame/GameSimulation/GameSession，不改变任何 identity。
- DebugTools 关闭时所有操作返回 capability_disabled 且不进入 FIFO；Cheats 关闭时只读 Debug 仍可工作，任何 mutation 操作返回 capability_disabled。
- 正常 Semantic/Automation/AI 操作不改变 RunIntegrity；只有成功的规则绕过 DebugCommand、fixture anchor 或 DebugBundle anchor 标记 modified。
- Save/Quick/Auto/Manual 不消耗 Gameplay RNG、不产生 GameplayFact、不增加 commandSequence。
- Auto candidates 必须带 monotonic anchorEpoch，成功 authoritative anchor 后旧 epoch write 不得成为最终 `auto.current`。
- import validation 固定为 bytes → Strict JSON → envelope Schema → state digest → compatibility → stable references → invariants；前一阶段失败后不得运行后续阶段。
- PlayerPersistencePort 等低权限子端口名称可以保留；必须删除 DeveloperApplicationPort、DeveloperControlPort、runtime/developer、web/developer 和任何独立 Developer root/build。
- StoryToolingEntry 是同 Artifact 的延迟加载 fixtures/notes/form-adapter 入口；只允许从当前静态 Story package 的固定 ./tooling export 导入，不接受 URL、文件名或任意动态 specifier，也不拥有 debug 规则/算法。
- Automation Bridge 和 InputRouter 不在本阶段实现；automation_bridge capability 只完成状态与诊断记录，Phase 5 才安装浏览器 bridge。
- Base 不导入 idb、IndexedDB、DOM、React、具体 Story 或 E2E 类型；apps/web 不静态导入 E2E Story。
- 每个任务严格 TDD、聚焦测试、当前 pnpm verify、git diff --check、精确暂存和独立 commit。
- tracked Save/Debug fixtures 只能由显式 regenerate:runtime-fixtures 重写；普通 test、verify 和 CI 只读。

---

## File Map

```text
packages/base/src/contracts/
  snapshot.ts                    # engine-owned RunIntegrity in authoritative Snapshot
  application.ts                 # GameApplicationPort and RuntimeCapability contracts
  persistence.ts                 # strict generic Save envelopes
  diagnostics.ts                 # DebugBundle includes capability state and integrity

packages/base/src/runtime/
  session/game-session.ts
  application/game-application.ts
  capabilities/runtime-capabilities.ts
  persistence/
  diagnostics/

apps/web/src/
  host/indexeddb-record-store.ts
  application/create-game-runtime.ts
  application/resolved-game-hmr.ts
  capabilities/web-capability-preferences.ts

stories/e2e/src/
  runtime/
  tooling.ts
  application/entry.tsx
  test/fixtures/runtime/
```

### Task 1: Add engine-owned RunIntegrity to every GameSnapshot

**Files:**

- Modify: packages/base/src/contracts/snapshot.ts
- Modify: packages/base/src/contracts/snapshot.test.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/index.ts
- Create: packages/base/src/runtime/session/run-integrity.ts
- Create: packages/base/src/runtime/session/run-integrity.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/testkit/synthetic-counter.ts
- Modify: stories/e2e/src/gameplay/contracts/state.ts
- Modify: stories/e2e/src/gameplay/game-command-executor.ts
- Modify: stories/e2e/src/gameplay/game-command-executor.test.ts
- Modify: stories/e2e/src/gameplay/game-debug-command-executor.ts
- Modify: stories/e2e/src/gameplay/game-debug-command-executor.test.ts
- Modify: stories/e2e/src/session.ts
- Modify: stories/e2e/fixtures/session-zero.json
- Modify: stories/e2e/golden/semantic-flow.json
- Modify: stories/e2e/scripts/update-golden.mts
- Modify: packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: packages/base/type-tests/public-exports.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Test: packages/base/src/runtime/session/run-integrity.test.ts
- Test: packages/base/src/runtime/session/game-session.test.ts

**Interfaces:**

- Consumes: Phase 2 GameSnapshotEnvelopeV1、GameSession FIFO and NonNegativeSafeInteger。
- Produces: public RunIntegrityReasonV1、RunIntegrityV1、runIntegrityV1Schema、createPristineRunIntegrityV1 and integrity-aware GameSnapshotEnvelopeV1。`IntegrityDirectiveV1` 与 `markRunModifiedV1` 仅是 Session-internal authority，不进入 Base root/runtime barrel 或 reviewed public inventory。

- [ ] **Step 1: Write failing exact-schema and mutation tests**

```ts
it("requires exact engine-owned integrity fields", () => {
  const snapshot = snapshotSchema.parse({
    state: { count: 0 },
    rng: { seed: 1, cursor: 0 },
    commandSequence: 0,
    integrity: {
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    },
  });
  expect(snapshot.integrity.mode).toBe("normal");
  expect(() =>
    snapshotSchema.parse({
      ...snapshot,
      integrity: { ...snapshot.integrity, injected: true },
    }),
  ).toThrow();
});

it("marks successful mutations atomically and deduplicates reason kinds", () => {
  const pristine = createPristineRunIntegrityV1();
  const first = markRunModifiedV1(pristine, {
    kind: "debug_command",
    commandKind: "debug.e2e.increment",
    sequence: 3,
  });
  const second = markRunModifiedV1(first, {
    kind: "debug_command",
    commandKind: "debug.e2e.increment",
    sequence: 4,
  });

  expect(second).toEqual({
    mode: "modified",
    mutationCount: 2,
    firstMutationSequence: 3,
    reasons: [
      {
        kind: "debug_command",
        commandKind: "debug.e2e.increment",
        sequence: 3,
      },
    ],
  });
});
```

- [ ] **Step 2: Run focused tests and confirm Snapshot lacks integrity**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/snapshot.test.ts src/runtime/session/run-integrity.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay src/session.ts
```

Expected: FAIL because RunIntegrity contracts and the fourth Snapshot field do not exist。

- [ ] **Step 3: Implement the strict integrity contract**

```ts
export type RunIntegrityReasonV1 =
  | {
      readonly kind: "debug_command";
      readonly commandKind: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "fixture_anchor";
      readonly fixtureId: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "debug_bundle_anchor";
      readonly sequence: NonNegativeSafeInteger;
    };

export interface RunIntegrityV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: NonNegativeSafeInteger;
  readonly firstMutationSequence: NonNegativeSafeInteger | null;
  readonly reasons: readonly RunIntegrityReasonV1[];
}
```

Rules：

- pristine 是 normal/0/null/[]；
- 每次成功 mutation 增加 mutationCount；
- firstMutationSequence 只在第一次成功 mutation 设置；
- reasons 按首次出现的 reason kind 保留，最多 16 项；
- mutationCount 不截断；
- schema 检查 mode 与其他字段的双向一致性；
- 不接受 accessor、unknown field、NaN、负数或未声明 kind。

- [ ] **Step 4: Make GameSession preserve or replace integrity explicitly**

Authoritative replacement 使用内部 directive：

```ts
export type IntegrityDirectiveV1 =
  | { readonly kind: "preserve_current" }
  | { readonly kind: "accept_replacement" }
  | { readonly kind: "mark_modified"; readonly reason: RunIntegrityReasonV1 };
```

- Gameplay dispatch 永远 preserve current；executor 返回的 candidate integrity 必须与 input 相等，否则 fault；
- new/restart lifecycle 接受 pristine replacement；
- exact/adopted load 接受 Save 中的 replacement integrity；
- successful DebugCommand/fixture/debug bundle anchor 使用 mark_modified；
- rejected/faulted/validation failure 不改变 integrity。

GameSession 在同一个 queue item 内生成最终 Snapshot；Story code 不取得 markRunModified capability。type/public-inventory tests 必须证明 Story 只能观察 integrity contract，无法从任何公开 entrypoint 导入 `IntegrityDirectiveV1` 或 `markRunModifiedV1`。Normal 与 Debug Story executor 的 committed/rejected/faulted candidate 都必须原样保留输入 integrity；任何 Story-owned integrity drift 被 Session 转为 fault。

- [ ] **Step 5: Regenerate the E2E sequence-zero fixture and verify**

当前只有 Phase 2 E2E fixture，无兼容承诺。显式运行：

```bash
pnpm --filter @project-tavern/story-e2e regenerate:fixtures
pnpm --filter @project-tavern/story-e2e update:golden
git diff -- stories/e2e/fixtures/session-zero.json stories/e2e/golden/semantic-flow.json
pnpm --filter @project-tavern/base exec vitest run src/contracts/snapshot.test.ts src/runtime/session
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay src/session.ts src/runtime
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: fixture 与 semantic-flow golden 只增加 pristine integrity 和相应 digest/provenance 变化；所有命令退出 0；普通 Semantic flow 仍保持 normal。

- [ ] **Step 6: Commit RunIntegrity**

```bash
git add -- packages/base/src/contracts/snapshot.ts packages/base/src/contracts/snapshot.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts packages/base/src/runtime/session packages/base/src/testkit/synthetic-counter.ts packages/base/type-tests/phase1-consumer.test-d.ts packages/base/type-tests/public-exports.test-d.ts packages/base/public-exports.v1.json stories/e2e/src/gameplay/contracts/state.ts stories/e2e/src/gameplay/game-command-executor.ts stories/e2e/src/gameplay/game-command-executor.test.ts stories/e2e/src/gameplay/game-debug-command-executor.ts stories/e2e/src/gameplay/game-debug-command-executor.test.ts stories/e2e/src/session.ts stories/e2e/fixtures/session-zero.json stories/e2e/golden/semantic-flow.json stories/e2e/scripts/update-golden.mts
git diff --cached --check
git commit -m "feat(base): track run integrity in snapshots"
```

### Task 2: Add RuntimeCapabilities and one unified GameApplicationPort

**Files:**

- Modify: packages/base/src/contracts/application.ts
- Modify: packages/base/src/contracts/application.test.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/index.ts
- Create: packages/base/src/runtime/capabilities/runtime-capabilities.ts
- Create: packages/base/src/runtime/capabilities/runtime-capabilities.test.ts
- Create: packages/base/src/runtime/application/game-application.ts
- Create: packages/base/src/runtime/application/game-application.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/type-tests/application.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Create: apps/web/src/capabilities/web-capability-preferences.ts
- Create: apps/web/src/capabilities/web-capability-preferences.test.ts
- Create: apps/web/src/application/create-game-runtime.ts
- Create: apps/web/src/application/create-game-runtime.test.ts
- Modify: apps/web/src/index.ts
- Modify: apps/web/type-tests/application-exports.test-d.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Test: packages/base/src/runtime/capabilities/runtime-capabilities.test.ts
- Test: packages/base/src/runtime/application/game-application.test.ts

**Interfaces:**

- Consumes: Phase 2 SemanticGamePort、ReadonlyViewSource、Host settings records、lifecycle/persistence/diagnostics subports。
- Produces: RuntimeCapabilityIdV1、RuntimeCapabilitiesV1、RuntimeCapabilityPortV1、GameApplicationPortV1、createRuntimeCapabilityPortV1 and generic createGameRuntimeV1。

- [ ] **Step 1: Write failing defaults, persistence, and no-rebootstrap tests**

```ts
it("starts with every runtime capability disabled", async () => {
  const fixture = createCapabilityFixture();
  expect(fixture.port.state.getCurrent()).toEqual({
    debugTools: false,
    cheats: false,
    automationBridge: false,
  });
});

it("changes a preference without rebuilding game identity or session", async () => {
  const fixture = createGameRuntimeFixture();
  const session = fixture.gameSession;
  const simulation = fixture.resolvedGame.gameSimulation;
  await fixture.application.capabilities.setEnabled("debug_tools", true);
  expect(fixture.application.capabilities.state.getCurrent().debugTools).toBe(true);
  expect(fixture.gameSession).toBe(session);
  expect(fixture.resolvedGame.gameSimulation).toBe(simulation);
  expect(fixture.resolveCalls()).toBe(1);
});

it("restores a valid saved preference in the next runtime", async () => {
  const store = createCapabilityPreferenceStore();
  const first = createGameRuntimeFixture({ capabilityStore: store });
  await first.application.capabilities.setEnabled("debug_tools", true);
  await first.application.capabilities.setEnabled("cheats", true);

  const next = createGameRuntimeFixture({ capabilityStore: store });
  expect(next.application.capabilities.state.getCurrent()).toEqual({
    debugTools: true,
    cheats: true,
    automationBridge: false,
  });
});
```

application type tests 必须证明统一端口没有 player/developer wrapper，也没有 Snapshot：

```ts
declare const application: GameApplicationPortV1<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;
// @ts-expect-error removed
application.player;
// @ts-expect-error removed
application.developer;
// @ts-expect-error forbidden
application.snapshot;
```

- [ ] **Step 2: Run focused tests and confirm real capabilities are missing while the unified application contract remains**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/capabilities src/runtime/application/game-application.test.ts
pnpm --filter @project-tavern/web exec vitest run src/capabilities src/application/create-game-runtime.test.ts
pnpm typecheck
```

Expected: FAIL because RuntimeCapabilities and its real Host-backed port do not exist；Phase 2 unified GameApplicationPort and removed old application exports remain green。

- [ ] **Step 3: Implement the exact capability contract**

```ts
export type RuntimeCapabilityIdV1 = "debug_tools" | "cheats" | "automation_bridge";

export interface RuntimeCapabilitiesV1 {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge: boolean;
}

export interface RuntimeCapabilityPortV1 {
  readonly state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  setEnabled(
    capability: RuntimeCapabilityIdV1,
    enabled: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1>;
}
```

Web adapter 使用 settings namespace 和固定 key runtime-capabilities.v1，strict decode exact booleans，CAS write。fresh/absent/invalid record 均以全 false 启动，invalid 额外记录稳定 warning；有效已保存 preference 在下一次 runtime construction 恢复，但不写入 Snapshot/Save 也不改变 identity。setEnabled 串行化同一 key 的并发写；expected conflict 返回 typed result 并 re-read，不 reject expected conditions。Phase 5 的 URL/query capability 只是 nonpersistent session override，不属于本任务，也不得污染这个 Host preference record。

Automation Bridge capability 在本阶段只存储状态；不得向 globalThis 安装任何对象。

- [ ] **Step 4: Complete the unified top-level application composition**

```ts
export interface GameApplicationPortV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools,
> {
  readonly semantic: TSemantic;
  readonly lifecycle: TLifecycle;
  readonly persistence: TPersistence;
  readonly diagnostics: TDiagnostics;
  readonly capabilities: TCapabilities;
  readonly debugTools: TDebugTools;
}
```

Task 9 会提供真实 DebugTools。当前 composition 注入一个完整、稳定的 capability-gated DebugTools port interface，其所有方法返回 capability_disabled；不得使用 undefined、optional field 或 throw new Error 作为临时行为。

确认 Phase 2 已删除 DeveloperApplicationPort、DeveloperControlPort 和 PlayerApplicationPort，且本任务不得重新引入。PlayerPersistencePort、PlayerWritableSaveSlotId 等表达低权限的子端口可以保留。apps/web/package.json 不得新增 ./developer export。

- [ ] **Step 5: Run ports, boundary, and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/application.test.ts src/runtime/capabilities src/runtime/application
pnpm --filter @project-tavern/web exec vitest run src/capabilities src/application/create-game-runtime.test.ts
pnpm verify:public-exports
pnpm verify:boundaries
pnpm typecheck
pnpm build:e2e
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；一个 E2E application exposes semantic/lifecycle/persistence/diagnostics/capabilities/debugTools；capability default false；没有 Developer application export 或 build。

- [ ] **Step 6: Commit unified application capabilities**

```bash
git add -- packages/base/src/contracts/application.ts packages/base/src/contracts/application.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts packages/base/src/runtime/capabilities packages/base/src/runtime/application packages/base/src/runtime/index.ts packages/base/type-tests/application.test-d.ts packages/base/public-exports.v1.json apps/web/src/capabilities apps/web/src/application/create-game-runtime.ts apps/web/src/application/create-game-runtime.test.ts apps/web/src/index.ts apps/web/type-tests/application-exports.test-d.ts stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts
git diff --cached --check
git commit -m "feat(runtime): unify application capabilities"
```

### Task 3: Implement bounded Save decoding and exact compatibility/adoption

**Files:**

- Create: packages/base/src/runtime/persistence/save-codec.ts
- Create: packages/base/src/runtime/persistence/save-codec.test.ts
- Create: packages/base/src/runtime/persistence/compatibility.ts
- Create: packages/base/src/runtime/persistence/compatibility.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Create: packages/base/type-tests/persistence.test-d.ts
- Test: packages/base/src/runtime/persistence/save-codec.test.ts
- Test: packages/base/src/runtime/persistence/compatibility.test.ts

**Interfaces:**

- Consumes: parseStrictJson、saveJsonLimitsV1、SaveRecordEnvelopeV1、BuildProvenanceV1、PatchSetAdoptionDeclarationV1、integrity-aware Snapshot Schema and canonical state digest。
- Produces: encodeSaveRecordV1、decodeSaveRecordV1、classifySaveCompatibilityV1、validateSaveImportCandidateV1 and exact staged result unions。

- [ ] **Step 1: Write failing hostile-input and stage-order tests**

```ts
it.each([
  [duplicateKeySaveBytes, "object.duplicate_key", 0],
  [oversizedSaveBytes, "limit.bytes", 0],
  [unknownEnvelopeFieldBytes, "envelope.schema_invalid", 0],
  [wrongStateDigestBytes, "digest.state_mismatch", 0],
])("rejects at the first stable stage", (bytes, code, referenceChecks) => {
  const context = createSyntheticSaveValidationContext();
  expect(validateSaveImportCandidateV1(bytes, context)).toEqual({
    kind: "rejected",
    code,
  });
  expect(context.referenceChecks()).toBe(referenceChecks);
  expect(context.invariantChecks()).toBe(0);
});

it("includes RunIntegrity in the state digest", () => {
  const pristine = syntheticSaveRecord();
  const modified = withIntegrity(pristine, modifiedIntegrityV1);
  expect(pristine.stateDigest).not.toBe(modified.stateDigest);
});
```

在 `persistence.test-d.ts` 中用一个含 `state`/`integrity` 的 synthetic Snapshot 实例化 validation context，证明 `validateReferences`/`validateInvariants` 参数只有 Gameplay State；对 `state.integrity`、`state.rng` 和 `state.commandSequence` 的访问都必须是 `@ts-expect-error`。

- [ ] **Step 2: Run focused tests and confirm codecs are absent**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
```

Expected: FAIL because runtime Save codec and compatibility policy do not exist。

- [ ] **Step 3: Implement the fixed validation stages**

```ts
export interface SaveImportValidationContextV1<
  TState,
  TSnapshot extends { readonly state: TState },
  TSaveRecord,
> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): ImportCompatibilityOutcomeV1;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(state: DeepReadonly<TState>): readonly string[];
}
```

decode owns only bytes → Strict JSON → envelope Schema → state digest。Import validator 先 compatibility；只有 exact/adopted 才运行 references/invariants。Base 在调用 Story validator 前已经完成整个 envelope/integrity/digest 校验，然后只传入 `record.snapshot.state`；Story validator 的类型不能观察或改写 integrity、RNG、sequence 或 provenance。inspect_only 不运行 Story validators，不产生 runnable candidate。Encoding 使用 Canonical JSON，无 BOM、缩进或换行差异。

- [ ] **Step 4: Implement exact/adopted/inspect-only classification**

固定 blocking order：

```text
story.id
story.revision
stateContractRevision
stateContractDigest
engine.digest
simulationDigest
```

presentation/story digest、engine.version 和 appBuildId 仅 warning。Adoption 只在 sole mismatch 为 simulationDigest、declaration exact matching、state contract/engine/story 相同且 lineage 少于 16 时返回。第 17 次 adoption 拒绝；exact load with 16 lineage 仍允许。

- [ ] **Step 5: Run focused, type, and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
pnpm verify:public-exports
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；malformed integrity 在 envelope/state-digest stage 被拒绝；no Session/storage mutation is reachable from codec。

- [ ] **Step 6: Commit Save validation**

```bash
git add -- packages/base/src/runtime/persistence/save-codec.ts packages/base/src/runtime/persistence/save-codec.test.ts packages/base/src/runtime/persistence/compatibility.ts packages/base/src/runtime/persistence/compatibility.test.ts packages/base/src/runtime/index.ts packages/base/type-tests/persistence.test-d.ts packages/base/public-exports.v1.json
git diff --cached --check
git commit -m "feat(base): validate save compatibility"
```

### Task 4: Implement the Web IndexedDB atomic record store

**Files:**

- Create: apps/web/src/host/indexeddb-record-store.ts
- Create: apps/web/src/host/indexeddb-record-store.test.ts
- Modify: apps/web/src/host/create-web-host.ts
- Modify: apps/web/src/host/create-web-host.test.ts
- Modify: apps/web/package.json
- Modify: pnpm-lock.yaml
- Test: apps/web/src/host/indexeddb-record-store.test.ts

**Interfaces:**

- Consumes: HostAtomicRecordStoreV1、HostStoredRecordV1、HostRecordMutationV1 and browser IndexedDB。
- Produces: createIndexedDbRecordStoreV1 with all-or-nothing read/list/commit、Host revision CAS、stable error mapping and no Base dependency on idb。

- [ ] **Step 1: Add exact Web-only dependencies**

Run:

```bash
pnpm --filter @project-tavern/web add --save-exact idb@8.0.3
pnpm --filter @project-tavern/web add --save-dev --save-exact fake-indexeddb@6.2.5
pnpm view idb@8.0.3 name version license repository dist.integrity --json
pnpm view fake-indexeddb@6.2.5 name version license repository dist.integrity --json
```

Expected: apps/web/package.json and pnpm-lock.yaml record exact versions；no dependency notice inventory is generated。

- [ ] **Step 2: Write failing transaction, ordering, and upgrade tests**

```ts
it("commits every mutation or none", async () => {
  const store = await createTestRecordStore();
  await store.commit([
    put("save", "story.e2e:quick", null, bytes("old")),
    put("lease", "story.e2e", null, bytes("owner-a")),
  ]);

  const result = await store.commit([
    put("save", "story.e2e:quick", 1, bytes("new")),
    put("lease", "story.e2e", 99, bytes("owner-b")),
  ]);

  expect(result).toMatchObject({ kind: "conflict", namespace: "lease" });
  expect(await readText(store, "save", "story.e2e:quick")).toBe("old");
});

it("lists records by stable key order", async () => {
  const store = await createTestRecordStore();
  await seedKeys(store, ["z", "a", "m"]);
  expect((await store.list("save")).map((record) => record.key)).toEqual(["a", "m", "z"]);
});
```

另加 tests：database revision > supported 时只读拒绝、blocked upgrade、quota、transaction abort、duplicate mutation identity and Uint8Array defensive copies。

- [ ] **Step 3: Run focused tests and confirm the adapter is absent**

Run:

```bash
pnpm --filter @project-tavern/web exec vitest run src/host/indexeddb-record-store.test.ts src/host/create-web-host.test.ts
```

Expected: FAIL because IndexedDB adapter does not exist and createWebHost still uses memory records by default。

- [ ] **Step 4: Implement the one-store atomic adapter**

使用一个 records object store 和 composite key [namespace,key]。commit 在单一 readwrite transaction 中：

1. reject duplicate mutation targets before opening transaction；
2. read every current revision；
3. on first mismatch abort and return conflict with actual revision；
4. apply every put/delete；
5. await transaction done；
6. return defensive copies of changed records。

Expected IndexedDB failures map to typed Host errors at Web boundary；unexpected implementation bugs may reject and are normalized by higher runtime failure handling。Base source and package manifest must contain no idb import。

- [ ] **Step 5: Wire WebHost and verify boundaries**

createWebHostV1 在 browser 支持 IndexedDB 时使用 persistent adapter；test/options 可以显式注入 memory record store。Host construction must not open Story or GameSession。

Run:

```bash
pnpm --filter @project-tavern/web exec vitest run src/host
pnpm verify:boundaries
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；IndexedDB/idb imports only exist under apps/web；Base remains DOM/storage neutral。

- [ ] **Step 6: Commit the Web record store**

```bash
git add -- apps/web/src/host/indexeddb-record-store.ts apps/web/src/host/indexeddb-record-store.test.ts apps/web/src/host/create-web-host.ts apps/web/src/host/create-web-host.test.ts apps/web/package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(web): persist atomic host records"
```

### Task 5: Implement physical Save slots, CAS rotation, and fenced leases

**Files:**

- Create: packages/base/src/runtime/persistence/slot-keys.ts
- Create: packages/base/src/runtime/persistence/save-repository.ts
- Create: packages/base/src/runtime/persistence/save-repository.test.ts
- Create: packages/base/src/runtime/persistence/session-lease.ts
- Create: packages/base/src/runtime/persistence/session-lease.test.ts
- Test: packages/base/src/runtime/persistence/save-repository.test.ts
- Test: packages/base/src/runtime/persistence/session-lease.test.ts

**Interfaces:**

- Consumes: HostAtomicRecordStoreV1、Task 3 Save codec、four slot DTOs and Story-scoped record keys。
- Produces: SaveRepositoryV1、SessionLeaseV1、atomic Auto rotation、Quick/Manual CAS、lease handoff/takeover/release and fencing。

- [ ] **Step 1: Write failing slot rotation and corruption tests**

```ts
it("rotates Auto current and previous in one fenced batch", async () => {
  const fixture = createSaveRepositoryFixture();
  await fixture.writeAuto(saveAtSequence(1));
  await fixture.writeAuto(saveAtSequence(2));

  expect(await fixture.read("auto.current")).toMatchObject({
    health: "valid",
    record: { slot: { capturedCommandSequence: 2 } },
  });
  expect(await fixture.read("auto.previous")).toMatchObject({
    health: "valid",
    record: { slot: { capturedCommandSequence: 1 } },
  });
  expect(fixture.commitBatches().at(-1)).toHaveLength(3);
});

it("never overwrites valid previous from a corrupt current", async () => {
  const fixture = createCorruptCurrentFixture();
  await expect(fixture.writeAuto(saveAtSequence(3))).resolves.toMatchObject({
    kind: "saved",
  });
  expect(await fixture.read("auto.previous")).toEqual(fixture.previousBeforeWrite);
});
```

- [ ] **Step 2: Write failing lease election and stale-writer tests**

```ts
it("elects exactly one initial owner", async () => {
  const first = createLease(store, owner("a"));
  const second = createLease(store, owner("b"));
  const results = await Promise.all([first.acquireInitial(), second.acquireInitial()]);
  expect(results.filter((result) => result.kind === "owned")).toHaveLength(1);
});

it("rejects a writer after ownership changes", async () => {
  const fixture = await createOwnedLeaseFixture("a");
  const stale = fixture.captureFence();
  await fixture.takeOver("b");
  await expect(fixture.repository.writeQuick(saveAtSequence(4), stale)).resolves.toEqual({
    kind: "rejected",
    code: "conflict",
  });
});
```

- [ ] **Step 3: Run focused tests and confirm repository/lease absence**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/session-lease.test.ts
```

Expected: FAIL because repository and lease services do not exist。

- [ ] **Step 4: Implement exact four-slot semantics**

Physical slot IDs：

```text
auto.current
auto.previous
quick
manual
```

Auto batch decodes old current and re-encodes its same Snapshot/provenance/integrity/lineage/savedAt with slotId auto.previous；raw bytes are never copied under a mismatched slot identity。Corrupt/missing current never deletes valid previous。Read returns empty/valid/invalid；higher service marks previous recovery_candidate only when current is absent/invalid。Clear is CAS delete plus lease touch。

Quick/Manual compare both Host revision and Save recordRevision。Every write CAS-touches lease record in same batch。

- [ ] **Step 5: Implement lease state and fencing**

Lease record contains ownerId、monotonic fencingToken and optional handoff request。acquireInitial only creates an absent lease with expectedRevision null and token 1；it never steals an existing/unowned lease。takeOver and approved handoff increment token；release sets owner null and retains token；next takeover increments again。BroadcastChannel can improve UX later but is never correctness boundary。

- [ ] **Step 6: Run property and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/session-lease.test.ts
pnpm test:property
pnpm verify
git diff --check
```

Expected: all commands exit 0；randomized interleavings never permit stale write、partial Auto rotation or silent repair。

- [ ] **Step 7: Commit slots and leases**

```bash
git add -- packages/base/src/runtime/persistence/slot-keys.ts packages/base/src/runtime/persistence/save-repository.ts packages/base/src/runtime/persistence/save-repository.test.ts packages/base/src/runtime/persistence/session-lease.ts packages/base/src/runtime/persistence/session-lease.test.ts
git diff --cached --check
git commit -m "feat(base): add fenced save slots"
```

### Task 6: Implement capture, autosave, import/load, and degraded recovery

**Files:**

- Create: packages/base/src/runtime/persistence/auto-save-queue.ts
- Create: packages/base/src/runtime/persistence/auto-save-queue.test.ts
- Create: packages/base/src/runtime/persistence/persistence-service.ts
- Create: packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: packages/base/src/runtime/application/game-application.ts
- Modify: packages/base/src/runtime/application/game-application.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Modify: apps/web/src/application/create-game-runtime.ts
- Modify: apps/web/src/application/create-game-runtime.test.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Create: stories/e2e/src/runtime/persistence-roundtrip.test.ts
- Test: packages/base/src/runtime/persistence/persistence-service.test.ts
- Test: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Test: stories/e2e/src/runtime/persistence-roundtrip.test.ts

**Interfaces:**

- Consumes: GameSessionRuntimeControlV1、Task 3 codec/compatibility、Task 5 repository/lease、Host clock/files and ResolvedGame provenance。
- Produces: PersistenceServiceV1、createPersistenceServiceV1、createAutoSaveQueueV1 with monotonic `anchorEpoch`、public persistence/lease subports and E2E round-trip evidence。

- [ ] **Step 1: Write failing accepted-time capture and coalescing tests**

```ts
it("captures Quick at accepted call time", async () => {
  const fixture = createPersistenceFixture({ initialSequence: 3 });
  const save = fixture.service.save("quick");
  await fixture.semantic.dispatch({
    actionId: "action.e2e.increment",
    parameters: {},
  });
  fixture.store.releaseWrites();
  await expect(save).resolves.toMatchObject({ kind: "saved", slotId: "quick" });
  expect(await fixture.repository.read("quick")).toMatchObject({
    record: { slot: { capturedCommandSequence: 3 } },
  });
});

it("coalesces only Auto candidates that have not started", async () => {
  const fixture = createAutoQueueFixture();
  fixture.queue.enqueue(snapshotAtSequence(1));
  fixture.queue.enqueue(snapshotAtSequence(2));
  fixture.queue.enqueue(snapshotAtSequence(3));
  fixture.releaseFirstWrite();
  await fixture.queue.idle();
  expect(fixture.writtenSequences()).toEqual([1, 3]);
});

it("cannot publish an old-epoch Auto candidate after an authoritative anchor", async () => {
  const fixture = createAutoQueueFixture();
  fixture.queue.enqueue(snapshotAtSequence(3));
  await fixture.waitUntilWriteStarted();
  await fixture.anchor(snapshotAtSequence(0));
  fixture.releaseWrite();
  await fixture.queue.idle();
  expect(fixture.currentAutoSequence()).not.toBe(3);
  expect(fixture.queue.anchorEpoch()).toBe(1);
});
```

- [ ] **Step 2: Write failing load/integrity/recovery tests**

覆盖：

- same-tick dispatch vs load and dispatch vs import ordering；
- exact load preserves Snapshot integrity and lineage；
- adopted load preserves integrity、appends lineage and uses current provenance；
- inspect-only/invalid/lineage limit preserve Session and storage；
- corrupt current + valid previous is recovery_candidate but never auto-loaded；
- unavailable/quota keeps exportCurrentSave operational without IDB；
- RuntimeCapabilities state is neither saved nor restored。

- [ ] **Step 3: Run focused tests and confirm orchestration is absent**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence/auto-save-queue.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @project-tavern/web exec vitest run src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/application/create-e2e-game-runtime.test.ts src/runtime/persistence-roundtrip.test.ts
```

Expected: FAIL because persistence orchestration is not implemented。

- [ ] **Step 4: Implement capture and Auto policy**

save(quick|manual) checks ready + owned lease，synchronously captures current committed Snapshot/provenance/lineage，then starts async encode/write。After commit re-read slot and lease，validate bytes、state digest、record revision、captured sequence、Host revision and fence before returning saved。

Successful state-changing Gameplay dispatch hands its immutable committed Snapshot to Auto policy before public dispatch Promise resolves；dispatch does not wait for IDB。Rejected/faulted command、Query、preview、capability toggle and read-only Debug never enqueue Auto。

每个 Auto candidate 在接收时捕获 monotonic `anchorEpoch`。成功的 authoritative load/import/adoption/new/restart/fixture/debug-bundle anchor 在同一协调边界先递增 epoch，再丢弃尚未开始的旧 epoch candidates；新 anchor 失败不改 epoch。已开始的旧 write 可能无法取消 IndexedDB transaction，但完成时必须再检查 epoch：若 stale，其 saved result 不可见，并在同一 Auto queue 中用当前 anchor Snapshot 执行受 fence 的 repair/replace；`idle()` 仅在 repair 完成后 resolve。竞态测试必须阻塞存储、anchor、再释放旧 write，并证明 queue idle 后 `auto.current` 从不回退到旧世界。

- [ ] **Step 5: Implement load/import in the same FIFO**

At queue front decode and validate against current ResolvedGame。exact/adopted uses authoritative replacement with integrity directive accept_replacement，advances `anchorEpoch`，and anchors replace_replay_base。import never writes a physical slot implicitly。clear never changes Session。exportCurrentSave creates non-persisted Manual-shaped bytes from current Snapshot including integrity；exportSave validates stored bytes before download。

- [ ] **Step 6: Prove minimal E2E continuation**

Round-trip these exact E2E states：

```text
flow choosing
left branch blocked at rejoin
right branch blocked at rejoin
resolved flow before terminal
terminal run
modified run after later Task 9 fixture/debug anchor
```

Task 6 initially covers the first five；Task 9 extends the same test with modified integrity。Direct continuation and load continuation must have identical state digest、Facts、RNG and SemanticGameView。

- [ ] **Step 7: Run persistence and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/persistence src/runtime/application/game-application.test.ts
pnpm --filter @project-tavern/web exec vitest run src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/persistence-roundtrip.test.ts
pnpm verify
git diff --check
```

Expected: all commands exit 0；normal Save round-trips pristine integrity；no operation creates a second mutation queue。

- [ ] **Step 8: Commit persistence orchestration**

```bash
git add -- packages/base/src/runtime/persistence/auto-save-queue.ts packages/base/src/runtime/persistence/auto-save-queue.test.ts packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts packages/base/src/runtime/application/game-application.ts packages/base/src/runtime/application/game-application.test.ts packages/base/src/runtime/session/game-session.ts packages/base/src/runtime/session/game-session.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json apps/web/src/application/create-game-runtime.ts apps/web/src/application/create-game-runtime.test.ts stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts stories/e2e/src/runtime/persistence-roundtrip.test.ts
git diff --cached --check
git commit -m "feat(runtime): persist and recover game sessions"
```

### Task 7: Add the bounded CommandLog and authoritative replay

**Files:**

- Create: packages/base/src/runtime/diagnostics/command-log.ts
- Create: packages/base/src/runtime/diagnostics/command-log.test.ts
- Create: packages/base/src/runtime/diagnostics/replay.ts
- Create: packages/base/src/runtime/diagnostics/replay.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/persistence/persistence-service.ts
- Modify: packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Create: stories/e2e/src/runtime/diagnostics-replay.test.ts
- Test: packages/base/src/runtime/diagnostics/command-log.test.ts
- Test: packages/base/src/runtime/diagnostics/replay.test.ts

**Interfaces:**

- Consumes: exact GameSession finalized attempt、canonical Snapshot digest including integrity、schema-parsed GameCommand/DebugCommand and anchor transitions。
- Produces: CommandLogV1、createCommandLogV1、FinalizedCommandAttemptV1、ReplayComparisonV1、replayAuthoritativelyV1 and inspectReplayBestEffortV1。

- [ ] **Step 1: Write failing 201-entry mixed-outcome test**

```ts
it("moves replay base before evicting the 201st mixed entry", () => {
  const log = createCommandLogV1({ replayBase: snapshotAtSequence(0), limit: 200 });
  for (const fixture of mixedAttempts(201)) {
    log.append(fixture.parsedCommand, fixture.finalizedAttempt);
  }
  expect(log.entries()).toHaveLength(200);
  expect(log.entries()[0].logOrdinal).toBe(2);
  expect(log.replayBaseStateDigest()).toBe(stateDigest(afterAttempt(1)));
});
```

corpus includes committed/rejected and final faulted Gameplay commands。Rejected/faulted have equal pre/post state digest and committed RNG；attempted draws remain diagnostic。

- [ ] **Step 2: Write failing replay and integrity comparisons**

Replay submits commands only and compares：

- outcome kind and stable rejection/fault；
- ordered GameplayFacts；
- pre/post state digest；
- commandSequence；
- every attempted RNG draw；
- replay-base and final RunIntegrity；
- declared currentStateDigest even for empty log。

Mutating recorded Facts must produce mismatch，never state application。Blocking identity mismatch cannot authoritative replay；presentation/appBuild drift can return visualMatch false。

- [ ] **Step 3: Run focused tests and confirm log/replay absence**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics/command-log.test.ts src/runtime/diagnostics/replay.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts
```

Expected: FAIL because attempts are not retained or replayed。

- [ ] **Step 4: Implement log append, eviction, and anchor reset**

GameSession 在同一 queue item 内对 executor candidate 应用引擎 directive，生成唯一 `FinalizedCommandAttemptV1`，然后把这个已经包含最终 Snapshot/integrity/digest 的对象同时交给 CommandLog 并作为 dispatch result 来源。不得记录 Story executor 的未最终 candidate，不得为日志再执行或二次标记 integrity。log entry 保留 schema 实际 parse 后的 GameCommand；Semantic invocation/action ID 不进入 CommandLog。Task 9 以同一 finalization seam 加入实际 parsed DebugCommand。

logOrdinal increments for committed/rejected/faulted because commandSequence may not。Internally retain public entry plus finalized postAttemptSnapshot；on overflow first move replay base to evicted post snapshot，then remove。No command is re-executed for eviction。测试必须断言 log post-state digest、dispatch result digest 与 Session live digest 三者相同。

establishAnchor replaces replay base、clears public/internal entries and resets ordinal 1。Successful load/import/adoption/lifecycle/fixture/debug bundle anchors call it；failed anchors preserve log。

- [ ] **Step 5: Implement isolated replay**

Authoritative replay verifies blocking identity first，then submits each logged parsed GameCommand/DebugCommand to the matching executor in an isolated GameSession and compares outputs。It never replays Semantic invocation，never anchors live Session or writes Save。Best-effort inspection returns authoritative false and stays read-only。

Task 9 extends command log source union with DebugCommand；normal Gameplay replay must preserve pristine integrity。

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics src/runtime/session/game-session.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts
pnpm verify:public-exports
pnpm verify
git diff --check
```

Expected: all commands exit 0；201-entry replay exact；recorded Facts never applied；anchor resets log and preserves replacement integrity。

- [ ] **Step 7: Commit CommandLog and replay**

```bash
git add -- packages/base/src/runtime/diagnostics packages/base/src/runtime/session/game-session.ts packages/base/src/runtime/session/game-session.test.ts packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json stories/e2e/src/runtime/diagnostics-replay.test.ts
git diff --cached --check
git commit -m "feat(base): replay bounded game commands"
```

### Task 8: Build bounded, privacy-scrubbed DebugBundle export

**Files:**

- Modify: packages/base/src/contracts/diagnostics.ts
- Modify: packages/base/src/contracts/diagnostics.test.ts
- Create: packages/base/src/runtime/diagnostics/debug-bundle.ts
- Create: packages/base/src/runtime/diagnostics/debug-bundle.test.ts
- Create: packages/base/src/runtime/diagnostics/runtime-failures.ts
- Create: packages/base/src/runtime/diagnostics/runtime-failures.test.ts
- Create: packages/base/src/runtime/diagnostics/privacy.ts
- Create: packages/base/src/runtime/diagnostics/privacy.test.ts
- Modify: packages/base/src/runtime/application/game-application.ts
- Modify: packages/base/src/runtime/application/game-application.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Modify: apps/web/src/application/create-game-runtime.ts
- Modify: apps/web/src/application/create-game-runtime.test.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Test: packages/base/src/runtime/diagnostics/debug-bundle.test.ts
- Test: packages/base/src/runtime/diagnostics/privacy.test.ts

**Interfaces:**

- Consumes: ResolvedGame provenance、RuntimeCapabilities current state、GameSession Snapshot/RunIntegrity and Phase 2 `onObserverFailure` hook、CommandLog、runtime failures and Host metadata clock。
- Produces: DebugBundleEnvelopeV1 with capabilities/integrity、encodeDebugBundleV1、decodeDebugBundleV1、createGameDiagnosticsServiceV1 and bounded privacy scrubber。

- [ ] **Step 1: Write failing envelope, digest, limit, and privacy tests**

```ts
it("exports one self-contained bundle with capabilities and integrity", async () => {
  const fixture = createDiagnosticsFixture();
  const exported = await fixture.service.exportDebugBundle();
  const decoded = decodeDebugBundleV1(exported.bytes, fixture.validation);

  expect(exported).toMatchObject({
    filename: expect.stringMatching(/\.debug-bundle\.json$/),
    mediaType: "application/json",
    digest: digestBytes(exported.bytes),
  });
  expect(decoded).toMatchObject({
    kind: "decoded",
    bundle: {
      capabilities: {
        debugTools: true,
        cheats: false,
        automationBridge: false,
      },
      currentSnapshot: {
        integrity: { mode: "normal" },
      },
    },
  });
});

it("scrubs local paths before size accounting and encoding", async () => {
  const fixture = createDiagnosticsFixture();
  fixture.failures.append(
    runtimeFailure({
      operation: "/Users/alice/project/src/save.ts",
      message: "failed at C:\\Users\\alice\\save.ts",
    }),
  );
  const text = new TextDecoder().decode((await fixture.service.exportDebugBundle()).bytes);
  expect(text).not.toContain("/Users/alice");
  expect(text).not.toContain("C:\\Users\\alice");
});
```

- [ ] **Step 2: Run focused tests and confirm current envelope lacks capability state**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/diagnostics.test.ts src/runtime/diagnostics/debug-bundle.test.ts src/runtime/diagnostics/runtime-failures.test.ts src/runtime/diagnostics/privacy.test.ts
```

Expected: FAIL because DebugBundle runtime codec/service and capabilities field do not exist。

- [ ] **Step 3: Implement the exact bundle contents**

DebugBundle contains：

```text
formatRevision
provenance
optional appBuildId
capabilities at export
simulationLineage
generatedAt
replayBase + replayBaseStateDigest
commandLog
currentSnapshot + currentStateDigest
bounded diagnostics
bounded runtimeFailures
optional command failure
optional closed UI context
```

Both Snapshot digests independently include RunIntegrity and must be checked even for empty CommandLog。Capabilities are diagnostic-only and do not participate in either digest。

Limits：

- raw Debug input 20 MiB；
- at most 50 runtime failures；
- message/stack at most 64 KiB；
- operation/cause fields at most 4 KiB；
- UI context uses closed schema and bounded arrays；
- no browser history、unselected files、arbitrary Host settings or storage dump。

Command faults stay in CommandLog/failure and do not duplicate runtime.dispatch_failed。Persistence/Asset/UI/async/HMR failures use runtime failure buffer。

Application composition 必须把 Phase 2 GameSession `onObserverFailure` hook 与 internal Semantic source `reportSubscriberFailure` 连到同一 bounded RuntimeFailure buffer。记录使用稳定 operation code `runtime.observer_notification_failed`，并在 append 前对 message/stack/cause 执行同样的长度界限和路径脱敏。测试必须分别让一个 GameSession subscriber 和一个公开 Semantic subscriber one-shot 抛错，证明：第二个 listener 仍收到 publication，dispatch result/live Snapshot 不变，每次 failure 恰记录一次，后续 FIFO 命令仍可执行；RuntimeFailure append/hook/reporter 自身的异常也必须隔离。

- [ ] **Step 4: Keep export available without DebugTools mutation authority**

GameApplicationPort.diagnostics.exportDebugBundle is always available because it is player-facing bug evidence。It cannot inspect/import/replay/anchor or execute DebugCommand。Expected runtime failures become typed results；unexpected construction fault is normalized and never leaks raw local paths。

`createGameRuntimeV1` 创建一个 observer-failure sink，同时注入 GameSession hook 和 E2E Semantic source reporter，而不在 Semantic/UI 各自创建独立 failure store。该线路只记录观察者失败，绝不将其转换为 command fault 或 rejected dispatch。

- [ ] **Step 5: Run diagnostics and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/diagnostics.test.ts src/runtime/diagnostics src/runtime/application/game-application.test.ts
pnpm verify:public-exports
pnpm typecheck
pnpm verify
git diff --check
```

Expected: all commands exit 0；bundle round-trip preserves capability state and integrity；privacy/size limits apply before download。

- [ ] **Step 6: Commit DebugBundle export**

```bash
git add -- packages/base/src/contracts/diagnostics.ts packages/base/src/contracts/diagnostics.test.ts packages/base/src/runtime/diagnostics packages/base/src/runtime/application/game-application.ts packages/base/src/runtime/application/game-application.test.ts packages/base/src/runtime/session/game-session.ts packages/base/src/runtime/session/game-session.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json apps/web/src/application/create-game-runtime.ts apps/web/src/application/create-game-runtime.test.ts stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts
git diff --cached --check
git commit -m "feat(base): export bounded debug bundles"
```

### Task 9: Implement capability-gated DebugTools and same-artifact Story tooling

**Files:**

- Create: packages/base/src/runtime/diagnostics/debug-tools.ts
- Create: packages/base/src/runtime/diagnostics/debug-tools.test.ts
- Modify: packages/base/src/runtime/diagnostics/command-log.ts
- Modify: packages/base/src/runtime/diagnostics/command-log.test.ts
- Modify: packages/base/src/runtime/diagnostics/replay.ts
- Modify: packages/base/src/runtime/diagnostics/replay.test.ts
- Modify: packages/base/src/runtime/application/game-application.ts
- Modify: packages/base/src/runtime/application/game-application.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Modify: stories/e2e/src/tooling.ts
- Create: stories/e2e/src/tooling/debug-command-form-adapter.ts
- Create: stories/e2e/src/tooling/debug-command-form-adapter.test.ts
- Create: stories/e2e/src/tooling/fixture-resolver.ts
- Create: stories/e2e/src/tooling/fixture-resolver.test.ts
- Modify: stories/e2e/package.json
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: stories/e2e/src/runtime/persistence-roundtrip.test.ts
- Modify: stories/e2e/src/runtime/diagnostics-replay.test.ts
- Test: packages/base/src/runtime/diagnostics/debug-tools.test.ts
- Test: stories/e2e/src/tooling/debug-command-form-adapter.test.ts

**Interfaces:**

- Consumes: RuntimeCapabilityPort、GameSession FIFO、ResolvedGame.gameSimulation-owned debug command/error schemas plus validator/executor、RunIntegrity、CommandLog/replay、DebugBundle codec and StoryToolingEntry。
- Produces: DebugToolsPortV1、createDebugToolsPortV1、fixture/debug bundle anchor and lazy same-artifact fixtures/notes/form-adapter resolution。`E2eDebugCommandV1` and all debug semantics were already produced by Phase 2 Gameplay，not by tooling。

- [ ] **Step 1: Write failing capability matrix and integrity tests**

```ts
it.each([
  ["inspect", false, false, "capability_disabled"],
  ["inspect", true, false, "allowed"],
  ["execute", true, false, "capability_disabled"],
  ["execute", true, true, "allowed"],
])("checks capability at execution for %s", async (operation, debugTools, cheats, expected) => {
  const fixture = createDebugToolsFixture({ debugTools, cheats });
  expect(await fixture.invoke(operation)).toMatchObject({ kind: expected });
});

it("marks only a successful mutating command", async () => {
  const fixture = createCheatEnabledFixture();
  await fixture.debugTools.executeDebugCommand({
    kind: "debug.e2e.counter.add",
    amount: 5,
  });
  expect(fixture.snapshot().integrity).toMatchObject({
    mode: "modified",
    mutationCount: 1,
    reasons: [{ kind: "debug_command" }],
  });

  await fixture.debugTools.executeDebugCommand({
    kind: "debug.e2e.test.validation_failed",
  });
  expect(fixture.snapshot().integrity.mutationCount).toBe(1);
});

it("logs the same finalized debug attempt returned by the session", async () => {
  const fixture = createCheatEnabledFixture();
  const result = await fixture.debugTools.executeDebugCommand({
    kind: "debug.e2e.counter.add",
    amount: 5,
  });
  expect(fixture.commandLog().at(-1)?.postStateDigest).toBe(result.postStateDigest);
  expect(result.postStateDigest).toBe(fixture.liveStateDigest());
  expect(fixture.debugExecuteAttemptCalls()).toBe(1);
});
```

- [ ] **Step 2: Write failing lazy tooling and no-arbitrary-import tests**

E2E application test injects a loader spy：

```ts
it("loads the fixed tooling export only after DebugTools is enabled", async () => {
  const fixture = createE2eGameRuntimeFixture();
  expect(fixture.toolingLoads()).toBe(0);
  await fixture.application.capabilities.setEnabled("debug_tools", true);
  await fixture.application.debugTools.listFixtures();
  expect(fixture.toolingLoads()).toBe(1);
  expect(fixture.loadedSpecifier()).toBe("@project-tavern/story-e2e/tooling");
});
```

No method accepts module URL、path、Story ID or arbitrary import specifier。另加 loader test 证明 `executeDebugCommand` 直接使用 ResolvedGame 内已加载的 schema/validator/executor，不触发 tooling import；只有 fixture/notes/form UI 才延迟加载固定 tooling export。

- [ ] **Step 3: Run focused tests and confirm DebugTools are unavailable**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics/debug-tools.test.ts src/runtime/application/game-application.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/application/create-e2e-game-runtime.test.ts
```

Expected: FAIL because real capability-gated DebugTools and Story adapters do not exist。

- [ ] **Step 4: Implement read-only and mutating authority separately**

DebugToolsPort methods：

```ts
interface DebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TInspection,
  TReplay,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
> {
  listFixtures(): Promise<readonly TFixtureId[]>;
  queryDiagnostics(query: TDiagnosticQuery): Promise<TDiagnosticQueryResult>;
  inspectDebugBundle(bytes: Uint8Array): Promise<TInspection>;
  inspectReplayBestEffort(bytes: Uint8Array): Promise<TReplay>;
  replayAuthoritatively(bytes: Uint8Array): Promise<TReplay>;
  executeDebugCommand(command: TDebugCommand): Promise<TDebugResult>;
  anchorFixture(fixtureId: TFixtureId): Promise<TAnchorResult>;
  anchorDebugBundle(bytes: Uint8Array): Promise<TAnchorResult>;
}
```

Read-only methods require debug_tools。execute/anchor methods require debug_tools + cheats。admission 顺序固定为：

```text
call-time capability check
→ fixed tooling import only when that operation needs fixtures/notes/form adapter
→ GameSimulation-owned strict schema parse
→ enqueue on the single GameSession FIFO
→ queue-front capability re-check
→ GameSimulation.debugCommandExecutor.validate(current Snapshot, parsed command)
→ executeAttempt exactly once when allowed
→ Session finalization/logging
```

`capability_disabled` 在 call time 时必须早于 schema parse、tooling import 和 FIFO enqueue；队列等待期间 toggle 关闭则在 queue front 早于 validate/attempt 返回同一 code，不产生 log/integrity trace。对 `executeDebugCommand` 不导入 tooling；strict schema rejection 不入队，reference/range/current-state validation 只在队首由 GameSimulation-owned validator 执行。

E2E DebugCommand union 仍是 Phase 2 声明的 counter.add、flow.set_blocked and stable validation/fault cases；no arbitrary State path/value editor。`debug-command-form-adapter.ts` 只将受控 UI form DTO 转成该已声明 union 的 candidate，不拥有 schema、range/reference 规则、executor 或 State access。

- [ ] **Step 5: Integrate integrity and replay**

- successful replayable DebugCommand commits via owner proposals；GameSession 在同一 queue item 中只生成一个已标记 modified 的 finalized attempt，CommandLog source=debug、public result 与 live Session 都引用该最终 Snapshot/digest；
- `validation_failed` opens no attempt/log and preserves integrity；
- admitted faulted attempt enters log，preserves integrity，then pauses GameSession；不得标记 modified；
- successful fixture/debug bundle anchor sets replay base、clears log and marks modified；
- anchorDebugBundle requires exact blocking identity and authoritative replay to currentStateDigest；
- inspect/replay methods never alter live Session、Save or integrity。

Story executor 返回的 candidate 必须保留 input integrity；只有 Session-internal finalizer 可以 mark modified。测试必须覆盖 validation failure 不打开 attempt/log、fault 记录但不标记、successful command 只调用一次 attempt，且 log post digest === returned digest === live digest。Extend persistence-roundtrip with modified fixture/debug command Save/load，assert modified integrity and mutationCount survive exact load and replay。

- [ ] **Step 6: Run capability, tooling, replay, and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/diagnostics src/runtime/application/game-application.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/runtime/persistence-roundtrip.test.ts src/runtime/diagnostics-replay.test.ts src/application/create-e2e-game-runtime.test.ts
pnpm verify:boundaries
pnpm build:e2e
pnpm verify:bundle
pnpm verify
git diff --check
```

Expected: all commands exit 0；same Artifact contains tooling chunk but default UI/capabilities are off；normal Semantic operations remain normal integrity；successful cheat/anchor remains modified across Save/replay。

- [ ] **Step 7: Commit DebugTools**

```bash
git add -- packages/base/src/runtime/diagnostics/debug-tools.ts packages/base/src/runtime/diagnostics/debug-tools.test.ts packages/base/src/runtime/diagnostics/command-log.ts packages/base/src/runtime/diagnostics/command-log.test.ts packages/base/src/runtime/diagnostics/replay.ts packages/base/src/runtime/diagnostics/replay.test.ts packages/base/src/runtime/application/game-application.ts packages/base/src/runtime/application/game-application.test.ts packages/base/src/runtime/session/game-session.ts packages/base/src/runtime/session/game-session.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json stories/e2e/src/tooling.ts stories/e2e/src/tooling stories/e2e/package.json stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts stories/e2e/src/runtime/persistence-roundtrip.test.ts stories/e2e/src/runtime/diagnostics-replay.test.ts
git diff --cached --check
git commit -m "feat(runtime): gate same-artifact debug tools"
```

### Task 10: Harden unified-root HMR invalidation and recovery

**Files:**

- Create: packages/base/src/runtime/session/runtime-invalidation.ts
- Create: packages/base/src/runtime/session/runtime-invalidation.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/session/index.ts
- Modify: packages/base/src/runtime/persistence/persistence-service.ts
- Modify: packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: packages/base/src/runtime/diagnostics/runtime-failures.ts
- Modify: packages/base/src/runtime/diagnostics/runtime-failures.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/src/index.ts
- Modify: packages/base/type-tests/public-exports.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Create: apps/web/src/application/resolved-game-hmr.ts
- Create: apps/web/src/application/resolved-game-hmr.test.ts
- Modify: apps/web/src/application/create-game-runtime.ts
- Modify: apps/web/src/application/create-game-runtime.test.ts
- Modify: apps/web/src/index.ts
- Modify: stories/e2e/src/application/entry.tsx
- Create: stories/e2e/src/runtime/hmr-integration.test.ts
- Test: packages/base/src/runtime/session/runtime-invalidation.test.ts
- Test: apps/web/src/application/resolved-game-hmr.test.ts
- Test: stories/e2e/src/runtime/hmr-integration.test.ts

**Interfaces:**

- Consumes: unified E2E application root、accepted ResolvedGame digest tuple、GameSession invalidation、Save/Debug export and import.meta.hot-like adapter。
- Produces: RuntimeInvalidationControllerV1、installResolvedGameHmrV1 and same-root full rebootstrap with no Developer-specific path。

- [ ] **Step 1: Write failing invalidation and queued-dispatch tests**

```ts
it("invalidates digest-changing HMR without mixing identities", async () => {
  const fixture = createRuntimeFixture();
  fixture.hmr.accept(nextResolvedIdentity({ simulationDigest: digest("new") }));

  expect(fixture.session.getStatus()).toBe("hmr_invalidated");
  await expect(
    fixture.application.semantic.dispatch({
      actionId: "action.e2e.increment",
      parameters: {},
    }),
  ).resolves.toEqual({
    kind: "not_executed",
    code: "hmr_invalidated",
  });
  await expect(fixture.application.diagnostics.exportDebugBundle()).resolves.toMatchObject({
    mediaType: "application/json",
  });
});

it("skips a command queued behind invalidation", async () => {
  const fixture = createBlockedRuntimeFixture();
  const queued = fixture.application.semantic.dispatch(incrementInvocationV1);
  fixture.invalidate();
  fixture.releaseBlocker();
  await expect(queued).resolves.toEqual({
    kind: "not_executed",
    code: "hmr_invalidated",
  });
  expect(fixture.executeAttemptCalls()).toBe(0);
});
```

- [ ] **Step 2: Write failing resolved-tuple and same-root tests**

HMR tuple exactly includes Story ID/revision/digest、Engine digest、state-contract revision/digest、simulation digest and presentation digest。engine.version、appBuildId and RuntimeCapabilities are excluded。Any single blocking/visual field change or resolution failure invalidates once；equal tuple CSS/UI/tooling-note update does not。

Full rebootstrap must call the same stories/e2e/src/application/entry.tsx composition factory；test asserts no developer-entry、player-entry、second HTML or second Vite mode。

- [ ] **Step 3: Run focused tests and confirm unified HMR is absent**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/runtime-invalidation.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/web exec vitest run src/application/resolved-game-hmr.test.ts src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/hmr-integration.test.ts
```

Expected: FAIL because invalidation policy and same-root HMR adapter do not exist。

- [ ] **Step 4: Implement failure-safe invalidation**

Digest change synchronously publishes hmr_invalidated，blocks queued/new Gameplay、Debug mutation and Auto Save before attempt，records one runtime.hmr_invalidated，preserves last legal Snapshot/provenance for current Save/Debug export。HMR-invalidated Session cannot recover by load；the application unmounts and constructs a fresh ResolvedGame/GameSession through the same root。

Fault-paused Session remains distinct：validated exact load/restart can recover through FIFO。Internal queue throws settle as typed fault and cannot poison tail。

`RuntimeInvalidationControllerV1` 是 Web HMR adapter 所需的公开 Base runtime contract；它必须从 `runtime/session/index.ts` → `runtime/index.ts` → Base root 完整导出，同步更新 type test 和 `public-exports.v1.json`。Web 不得 deep-import `runtime/session/runtime-invalidation.ts`。

- [ ] **Step 5: Run HMR, build, and full verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session src/runtime/persistence/persistence-service.test.ts src/runtime/diagnostics/runtime-failures.test.ts
pnpm --filter @project-tavern/web exec vitest run src/application
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/hmr-integration.test.ts
pnpm build:e2e
pnpm verify:bundle
pnpm verify
git diff --check
```

Expected: all commands exit 0；same Artifact/root reboots；no second app build；capability toggles never invalidate。

- [ ] **Step 6: Commit HMR invalidation**

```bash
git add -- packages/base/src/runtime/session packages/base/src/runtime/persistence/persistence-service.ts packages/base/src/runtime/persistence/persistence-service.test.ts packages/base/src/runtime/diagnostics/runtime-failures.ts packages/base/src/runtime/diagnostics/runtime-failures.test.ts packages/base/src/runtime/index.ts packages/base/src/index.ts packages/base/type-tests/public-exports.test-d.ts packages/base/public-exports.v1.json apps/web/src/application apps/web/src/index.ts stories/e2e/src/application/entry.tsx stories/e2e/src/runtime/hmr-integration.test.ts
git diff --cached --check
git commit -m "feat(runtime): rebootstrap unified hmr sessions"
```

### Task 11: Freeze runtime fixtures and add the read-only Phase 3 gate

**Files:**

- Create: stories/e2e/src/test/fixtures/runtime/auto-current-flow-blocked.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/auto-previous-recovery.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/quick-narrative-branch.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/manual-terminal.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/manual-modified-cheat.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/adoption-exact-patchset.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/adoption-lineage-limit.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/corrupt-state-digest.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/future-format-revision.v1.json
- Create: stories/e2e/src/test/fixtures/runtime/debug-flow-command-log.v1.json
- Create: stories/e2e/src/runtime/runtime-fixture-provenance.ts
- Create: stories/e2e/scripts/runtime-fixture-builder.mts
- Create: stories/e2e/scripts/regenerate-runtime-fixtures.mts
- Create: stories/e2e/scripts/verify-runtime-fixtures.mts
- Create: stories/e2e/src/runtime/runtime-fixtures.test.ts
- Modify: stories/e2e/package.json
- Modify: package.json
- Create: scripts/verify-persistence-diagnostics.mts
- Create: scripts/verify-persistence-diagnostics.test.mjs
- Modify: scripts/run-script-tests.test.mjs
- Modify: packages/base/package.json
- Modify: apps/web/package.json
- Test: stories/e2e/src/runtime/runtime-fixtures.test.ts
- Test: scripts/verify-persistence-diagnostics.test.mjs

**Interfaces:**

- Consumes: green Phase 3 runtime、fixed E2E Story/tooling、Save/Debug codecs、RunIntegrity and explicit frozen provenance。
- Produces: ten reviewed canonical fixture files、explicit writer/read-only verifier and pnpm verify:persistence-diagnostics。

- [ ] **Step 1: Write failing fixture classification and integrity tests**

```ts
it.each([
  ["auto-current-flow-blocked.v1.json", "exact", "normal"],
  ["auto-previous-recovery.v1.json", "exact", "normal"],
  ["quick-narrative-branch.v1.json", "exact", "normal"],
  ["manual-terminal.v1.json", "exact", "normal"],
  ["manual-modified-cheat.v1.json", "exact", "modified"],
  ["adoption-exact-patchset.v1.json", "adopted", "normal"],
  ["adoption-lineage-limit.v1.json", "compatibility.lineage_limit", "normal"],
  ["corrupt-state-digest.v1.json", "digest.state_mismatch", "normal"],
  ["future-format-revision.v1.json", "envelope.unsupported_revision", "normal"],
])("keeps %s in its reviewed class", async (filename, expected, integrity) => {
  const result = classifyRuntimeFixture(await readRuntimeFixture(filename));
  expect(result.classification).toBe(expected);
  expect(result.integrityMode).toBe(integrity);
});

it("authoritatively replays the tracked debug bundle", async () => {
  const bytes = await readRuntimeFixture("debug-flow-command-log.v1.json");
  await expect(replayTrackedDebugBundle(bytes)).resolves.toMatchObject({
    authoritative: true,
    finalIntegrity: { mode: "modified" },
  });
});
```

- [ ] **Step 2: Write failing exact phase-gate test**

```js
const expected = [
  ["pnpm", ["--filter", "@project-tavern/base", "run", "test:runtime"]],
  ["pnpm", ["--filter", "@project-tavern/web", "run", "test:host"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "run", "test:runtime"]],
  ["pnpm", ["verify:runtime-fixtures"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["test:scripts"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact"]],
];
```

Test freezes nested arrays、first-failure exit and prohibition of regenerate/update/release/publish commands。

- [ ] **Step 3: Run tests and confirm fixtures/gate are absent**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/runtime-fixtures.test.ts
node --test scripts/verify-persistence-diagnostics.test.mjs
```

Expected: FAIL because fixture corpus、builder and phase gate do not exist。

- [ ] **Step 4: Implement one pure deterministic fixture builder**

runtime-fixture-provenance.ts freezes：

- blocking：Story ID/revision、state-contract revision/digest、Engine digest、simulation digest；
- diagnosticAtGeneration：Story digest、presentation digest/PatchSet、Engine version、appBuildId。

Builder uses fixed seed、fixed UTC times、fixed tooling commands and frozen provenance；it calls real public Save/Debug encoders and returns filename-to-bytes map。modified fixture must be produced by real successful DebugCommand，not by directly editing integrity。Corrupt/future files derive from one legal record by changing exactly one declared field and canonical re-encoding。

regenerate script is sole tracked writer，requires no pre-existing changes under runtime fixtures and exact current blocking identity。Verifier builds into temp/in-memory，compares sorted file set and every byte，checks classifications/integrity and never updates frozen provenance。

- [ ] **Step 5: Implement package aliases and read-only phase gate**

Exact package scripts：

```json
{
  "root": {
    "verify:runtime-fixtures": "pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures",
    "verify:persistence-diagnostics": "node --experimental-strip-types scripts/verify-persistence-diagnostics.mts"
  },
  "packages/base": {
    "test:runtime": "pnpm --dir ../.. exec vitest run packages/base/src/runtime"
  },
  "apps/web": {
    "test:host": "pnpm --dir ../.. exec vitest run apps/web/src/host apps/web/src/capabilities apps/web/src/application"
  },
  "stories/e2e": {
    "test:runtime": "pnpm --dir ../.. exec vitest run stories/e2e/src/runtime stories/e2e/src/tooling",
    "regenerate:runtime-fixtures": "node --experimental-strip-types scripts/regenerate-runtime-fixtures.mts",
    "verify:runtime-fixtures": "node --experimental-strip-types scripts/verify-runtime-fixtures.mts"
  }
}
```

Root `verify:runtime-fixtures` delegates only to Story read-only verifier。`verify:persistence-diagnostics.mts` runs the exact frozen command list with spawnSync and no shell interpolation。Gate test 必须同时锁定上述两个 root script 的精确映射。

- [ ] **Step 6: Generate once, review, and prove read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-e2e regenerate:runtime-fixtures
git diff -- stories/e2e/src/runtime/runtime-fixture-provenance.ts stories/e2e/src/test/fixtures/runtime
pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures
before="$(git status --porcelain=v1)"
pnpm verify:persistence-diagnostics
pnpm verify
pnpm verify:persistence-diagnostics
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

Expected: explicit writer creates exactly ten files；normal/modified distinctions are visible；all read-only gates exit 0 twice and status comparison passes。

- [ ] **Step 7: Commit runtime fixtures and gate**

```bash
git add -- stories/e2e/src/test/fixtures/runtime stories/e2e/src/runtime/runtime-fixture-provenance.ts stories/e2e/scripts/runtime-fixture-builder.mts stories/e2e/scripts/regenerate-runtime-fixtures.mts stories/e2e/scripts/verify-runtime-fixtures.mts stories/e2e/src/runtime/runtime-fixtures.test.ts stories/e2e/package.json package.json scripts/verify-persistence-diagnostics.mts scripts/verify-persistence-diagnostics.test.mjs scripts/run-script-tests.test.mjs packages/base/package.json apps/web/package.json
git diff --cached --check
git commit -m "test(runtime): freeze persistence diagnostics evidence"
```

## Phase 3 Acceptance

从 Phase 3 最终 HEAD 运行：

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

Expected: both gates exit 0 twice；tracked hash snapshot is identical；final status is explicit。

- [ ] Every authoritative operation shares one GameSession FIFO and every admitted Gameplay/Debug command opens exactly one attempt。
- [ ] RunIntegrity is engine-owned Snapshot state，included in state digest/Save/replay，and unreachable for Story Rules/UI mutation。
- [ ] Save Story validators receive Gameplay State only；public Story code cannot import integrity mutation authority。
- [ ] normal Semantic/AI operation remains normal；only successful cheat/fixture/debug bundle mutation marks modified。
- [ ] RuntimeCapabilities default false，persist as Host preference only，and do not rebuild or change any game identity。
- [ ] one GameApplicationPort exposes semantic/lifecycle/persistence/diagnostics/capabilities/debugTools；no Player/Developer application split or Developer subpath exists。
- [ ] DebugTools read-only and mutation operations enforce debug_tools/cheats at execution；capability_disabled creates no FIFO/log/integrity trace。
- [ ] Base consumes only Host record contract；IndexedDB/idb remain under apps/web。
- [ ] four physical slots、atomic Auto rotation、Quick/Manual CAS、read-back verification、lease handoff/takeover/release and fencing tests pass。
- [ ] Auto anchorEpoch prevents an in-flight pre-anchor write from becoming the final `auto.current`。
- [ ] Save/Debug validation follows the fixed staged order and never partially replaces Session/storage。
- [ ] exact/adopted compatibility and 16-entry lineage boundary work；presentation/app metadata stay warnings。
- [ ] E2E blocked branch、resolved flow、terminal and modified states round-trip without repeated command/RNG/effect。
- [ ] 201 mixed CommandLog entries retain actual parsed Game/Debug commands plus the one Session-finalized attempt，replay exactly and never apply recorded Facts。
- [ ] DebugBundle includes capability state、RunIntegrity、two Snapshot digests、bounded failures and scrubbed paths。
- [ ] Throwing subscribers are isolated，recorded through the bounded failure hook，and never alter dispatch results/Snapshot/FIFO usability。
- [ ] HMR digest change invalidates and reboots the same Story application root；capability/UI-only changes do not。
- [ ] ten reviewed fixtures preserve bytes/classification/integrity and only explicit regeneration writes them。
- [ ] pnpm verify:persistence-diagnostics and pnpm verify pass twice without tracked mutations。
