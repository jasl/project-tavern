# Project Tavern Phase 3 Persistence, Runtime Capabilities, and Diagnostics Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** 在 Phase 2 的 GameSession、ResolvedGame、统一 E2E Artifact 和 SemanticGamePort 上实现持久化、RuntimeCapabilities、统一 GameApplicationPort、RunIntegrity、CommandLog/Replay、DebugTools、DebugBundle 与同一应用根 HMR。

**Architecture:** Base 继续拥有一个 GameSession FIFO、严格 Save/Debug codec、兼容策略、RunIntegrity、Persistence orchestration、CommandLog 和 replay；Web 只实现 Host/IndexedDB、capability preference 和同一根 HMR 适配。DebugTools 与 SemanticGamePort 分离但存在于同一个 GameApplicationPort，所有 capability 在执行点复查；不存在 Developer application root、Developer subpath、Developer Artifact 或 bundle-absence 权限边界。

**Tech Stack:** TypeScript 7.0.2、React 19.2.7、Vite 8.1.4、Vitest 4.1.10、Playwright 1.61.1、Zod 4.4.3、idb 8.0.3、fake-indexeddb 6.2.5、Node.js >=22.12.0、pnpm >=11.0.0。

## Global Constraints

- 本计划以 docs/engineering/specs/2026-07-12-game-runtime-design.md 为最高优先级架构输入。
- Phase 2 Acceptance、pnpm verify:phase2 和当前完整 pnpm verify 必须在本阶段开始前通过，工作树状态必须明确。
- 在任何 Phase 3 编辑前运行只读 `pnpm verify:materialization`；缺失或 stale 必须以 `external_precondition.materialization_stale` 在改动前停止。Phase 3 不运行 `pnpm prepare:goal`、`pnpm add`、`pnpm view` 或任何 registry-facing command，只消费 R1 已写入 manifest/lock 并缓存的 exact dependencies。
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
- Base 不导入 idb、IndexedDB、DOM、React、具体 Story 或 E2E 类型；engine/packages/web 不静态导入 E2E Story。
- 每个任务严格 TDD、聚焦测试、当前 pnpm verify、git diff --check、精确暂存和独立 commit。
- tracked Save/Debug fixtures 只能由显式 regenerate:runtime-fixtures 重写；普通 test、verify 和 CI 只读。
- 每个 Expected RED 必须由命令输出中的指定 test title、缺失 symbol/path 或稳定 error code 命中；执行 agent 保存匹配证据。若命令因语法、dependency materialization、浏览器、其他测试或未声明错误失败，必须先修复意外失败，不得把任意非零退出当成合格 RED。
- Goal 恢复时先读取 `git status --short --branch`、`git log -1 --oneline`、Phase 2 gate 和当前任务 Files：clean tree 从下一任务开始；dirty tree 只有在全部路径属于同一个未完成任务且 focused RED/GREEN 可重建时才续跑，否则停止并报告。不得重做已提交任务或猜测 fixture transaction 的状态；Task 11 generator 的 recovery protocol 是唯一允许的自动恢复。
- 每次 commit 前，执行 agent 将 `git diff --cached --name-status` 与当前任务 Files 加精确 rename/delete/generated manifest 集合逐项比较；出现未列出的路径即停止。fixture/provenance 的 review 由执行 agent 按 schema、classification、digest、manifest 与 byte diff rubric 完成并记录证据，不等待人工批准。

---

## File Map

```text
engine/packages/base/src/contracts/
  snapshot.ts                    # engine-owned RunIntegrity in authoritative Snapshot
  application.ts                 # GameApplicationPort and RuntimeCapability contracts
  persistence.ts                 # strict generic Save envelopes
  diagnostics.ts                 # DebugBundle includes capability state and integrity

engine/packages/base/src/runtime/
  session/game-session.ts
  application/game-application.ts
  capabilities/runtime-capabilities.ts
  persistence/
  diagnostics/

engine/packages/web/src/
  host/indexeddb-record-store.ts
  application/create-game-runtime.ts
  application/resolved-game-hmr.ts
  capabilities/web-capability-preferences.ts

game/stories/e2e/src/
  runtime/
  tooling.ts
  application/entry.tsx
  test/fixtures/runtime/
```

### Task 1: Add engine-owned RunIntegrity to every GameSnapshot

**Files:**

- Modify: engine/packages/base/src/contracts/snapshot.ts
- Modify: engine/packages/base/src/contracts/snapshot.test.ts
- Modify: engine/packages/base/src/contracts/index.ts
- Modify: engine/packages/base/src/index.ts
- Create: engine/packages/base/src/runtime/session/run-integrity.ts
- Create: engine/packages/base/src/runtime/session/run-integrity.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/authoring/game-simulation-validation.test.ts
- Modify: engine/packages/base/src/testkit/synthetic-counter.ts
- Modify: game/stories/e2e/src/profile.ts
- Modify: game/stories/e2e/src/property.test.ts
- Modify: game/stories/e2e/src/gameplay/contracts/state.ts
- Modify: game/stories/e2e/src/gameplay/game-command-executor.ts
- Modify: game/stories/e2e/src/gameplay/game-command-executor.test.ts
- Modify: game/stories/e2e/src/gameplay/game-debug-command-executor.ts
- Modify: game/stories/e2e/src/gameplay/game-debug-command-executor.test.ts
- Modify: game/stories/e2e/src/session.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Modify: game/stories/e2e/scripts/update-golden.mts
- Modify: engine/packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: engine/packages/base/type-tests/public-exports.test-d.ts
- Modify: engine/packages/base/public-exports.v1.json
- Test: engine/packages/base/src/runtime/session/run-integrity.test.ts
- Test: engine/packages/base/src/runtime/session/game-session.test.ts

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
pnpm --filter @sillymaker/base exec vitest run src/contracts/snapshot.test.ts src/runtime/session/run-integrity.test.ts src/runtime/session/game-session.test.ts
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
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm --filter @sillymaker/base exec vitest run src/contracts/snapshot.test.ts src/runtime/session
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay src/session.ts src/runtime
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: fixture 与 semantic-flow golden 只增加 pristine integrity 和相应 digest/provenance 变化；所有命令退出 0；普通 Semantic flow 仍保持 normal。

- [ ] **Step 6: Commit RunIntegrity**

```bash
git add -- engine/packages/base/src/contracts/snapshot.ts engine/packages/base/src/contracts/snapshot.test.ts engine/packages/base/src/contracts/index.ts engine/packages/base/src/index.ts engine/packages/base/src/runtime/session engine/packages/base/src/authoring/game-simulation-validation.test.ts engine/packages/base/src/testkit/synthetic-counter.ts engine/packages/base/type-tests/phase1-consumer.test-d.ts engine/packages/base/type-tests/public-exports.test-d.ts engine/packages/base/public-exports.v1.json game/stories/e2e/src/profile.ts game/stories/e2e/src/property.test.ts game/stories/e2e/src/gameplay/contracts/state.ts game/stories/e2e/src/gameplay/game-command-executor.ts game/stories/e2e/src/gameplay/game-command-executor.test.ts game/stories/e2e/src/gameplay/game-debug-command-executor.ts game/stories/e2e/src/gameplay/game-debug-command-executor.test.ts game/stories/e2e/src/session.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json game/stories/e2e/scripts/update-golden.mts
git diff --cached --check
git commit -m "feat(base): track run integrity in snapshots"
```

### Task 2: Add RuntimeCapabilities and one unified GameApplicationPort

**Files:**

- Modify: docs/engineering/specs/2026-07-12-game-runtime-design.md
- Modify: docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md
- Modify: engine/packages/base/src/contracts/application.ts
- Modify: engine/packages/base/src/contracts/application.test.ts
- Modify: engine/packages/base/src/contracts/index.ts
- Modify: engine/packages/base/src/index.ts
- Create: engine/packages/base/src/runtime/capabilities/runtime-capabilities.ts
- Create: engine/packages/base/src/runtime/capabilities/runtime-capabilities.test.ts
- Create: engine/packages/base/src/runtime/application/game-application.ts
- Create: engine/packages/base/src/runtime/application/game-application.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/type-tests/application.test-d.ts
- Modify: engine/packages/base/public-exports.v1.json
- Create: engine/packages/web/src/capabilities/web-capability-preferences.ts
- Create: engine/packages/web/src/capabilities/web-capability-preferences.test.ts
- Create: engine/packages/web/src/application/create-game-runtime.ts
- Create: engine/packages/web/src/application/create-game-runtime.test.ts
- Modify: engine/packages/web/src/index.ts
- Modify: engine/packages/web/type-tests/application-exports.test-d.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: game/stories/e2e/src/application/entry.tsx
- Modify: game/stories/e2e/src/application/e2e-application-root.test.tsx
- Modify: game/stories/e2e/src/presentation/e2e-renderers.test.tsx
- Modify: game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts
- Modify: game/stories/e2e/src/runtime/headless-runner.test.ts
- Modify: game/stories/e2e/src/runtime/hotfix-integration.test.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Test: engine/packages/base/src/runtime/capabilities/runtime-capabilities.test.ts
- Test: engine/packages/base/src/runtime/application/game-application.test.ts

**Interfaces:**

- Consumes: Phase 2 SemanticGamePort、ReadonlyViewSource、Host settings records、lifecycle/persistence/diagnostics subports。
- Produces: RuntimeCapabilityIdV1、RuntimeCapabilitiesV1、RuntimeCapabilityPortV1、DebugToolsOperationResultV1、DebugFixtureListResultV1、DebugToolsPortV1、GameApplicationPortV1、createRuntimeCapabilityPortV1、createGameApplicationV1、createCapabilityDisabledDebugToolsPortV1 and generic async createGameRuntimeV1。

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
  const fixture = await createGameRuntimeFixture();
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
  const first = await createGameRuntimeFixture({ capabilityStore: store });
  await first.application.capabilities.setEnabled("debug_tools", true);
  await first.application.capabilities.setEnabled("cheats", true);

  const next = await createGameRuntimeFixture({ capabilityStore: store });
  expect(next.application.capabilities.state.getCurrent()).toEqual({
    debugTools: true,
    cheats: true,
    automationBridge: false,
  });
});

it("does not expose an application before preference hydration finishes", async () => {
  const pendingRead = createDeferredCapabilityRead();
  const runtime = createGameRuntimeFixture({ pendingRead });
  let settled = false;
  void runtime.then(() => {
    settled = true;
  });
  expect(pendingRead.calls()).toBe(1);
  await Promise.resolve();
  expect(settled).toBe(false);
  pendingRead.resolve({ debugTools: true, cheats: false, automationBridge: false });
  await expect(runtime).resolves.toMatchObject({
    application: {
      capabilities: { state: expect.any(Object) },
    },
  });
});
```

Host record read 是异步边界；createGameRuntimeV1 与 Story wrapper 必须 await 有效 preference 后才返回 Application。不得先暴露全 false 状态再后台 hydration，也不得增加 readiness/loading ABI。E2E entry 和全部 live 同步调用点在本任务改为 await；createWebHostV1 本身保持同步 construction。

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
pnpm --filter @sillymaker/base exec vitest run src/runtime/capabilities src/runtime/application/game-application.test.ts
pnpm --filter @sillymaker/web exec vitest run src/capabilities src/application/create-game-runtime.test.ts
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

export type RuntimeCapabilityOperationResultV1 =
  | {
      readonly kind: "updated" | "unchanged";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    }
  | {
      readonly kind: "rejected";
      readonly code: "conflict" | "unavailable";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    };

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

export type DebugToolsOperationResultV1<TAllowedResult> =
  TAllowedResult | { readonly kind: "capability_disabled" };

export type DebugFixtureListResultV1<TFixtureId> = DebugToolsOperationResultV1<{
  readonly kind: "listed";
  readonly fixtureIds: readonly TFixtureId[];
}>;

export interface DebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
> {
  listFixtures(): Promise<DebugFixtureListResultV1<TFixtureId>>;
  executeDebugCommand(
    command: DeepReadonly<TDebugCommand>,
  ): Promise<DebugToolsOperationResultV1<TDebugResult>>;
  anchorFixture(fixtureId: TFixtureId): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  inspectDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TDebugInspection>>;
  anchorDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  replayAuthoritatively(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TAuthoritativeReplayResult>>;
  inspectReplayBestEffort(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TBestEffortReplayInspection>>;
  queryDiagnostics(
    query: DeepReadonly<TDiagnosticQuery>,
  ): Promise<DebugToolsOperationResultV1<TDiagnosticQueryResult>>;
}
```

本任务冻结并公开完整 DebugTools ABI；Task 9 只提供真实实现。当前 composition 注入稳定的 capability-gated stub，八个方法均 resolve 精确 `{ kind: "capability_disabled" }`；不得使用空 fixture list、undefined、optional field、Promise rejection 或 throw new Error 伪装临时行为。Story-specific admitted-operation result 不包含 capability policy；权限拒绝留在 Base/Application 的 DebugToolsOperationResultV1 外层。

Base runtime 的 createGameApplicationV1 是纯六端口组合 factory：返回冻结外壳并保持每个注入端口的引用，不解析 Story、不创建 Session、不提供 optional/default field。createCapabilityDisabledDebugToolsPortV1 返回泛型完整 stub，并让八个方法共享同一个冻结的 capability_disabled result。两个 value 只从 `@sillymaker/base/runtime` 导出并进入 reviewed runtime inventory；Base root 保持 type/contract surface，Web 不跨包导入 `src/**`。

确认 Phase 2 已删除 DeveloperApplicationPort、DeveloperControlPort 和 PlayerApplicationPort，且本任务不得重新引入。PlayerPersistencePort、PlayerWritableSaveSlotId 等表达低权限的子端口可以保留。engine/packages/web/package.json 不得新增 ./developer export。

- [ ] **Step 5: Run ports, boundary, and full verification**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/contracts/application.test.ts src/runtime/capabilities src/runtime/application
pnpm --filter @sillymaker/web exec vitest run src/capabilities src/application/create-game-runtime.test.ts
pnpm verify:public-exports
pnpm verify:boundaries
pnpm typecheck
pnpm build:e2e
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；一个 E2E application exposes semantic/lifecycle/persistence/diagnostics/capabilities/debugTools；capability default false；没有 Developer application export 或 build。显式 writers 只更新 fixture/golden 内的 engine provenance/digest，执行 agent 审查 exact bytes、size、SHA-256 和语义投影；普通 verifier/verify 保持只读。

- [ ] **Step 6: Commit unified application capabilities**

```bash
git add -- docs/engineering/specs/2026-07-12-game-runtime-design.md docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md engine/packages/base/src/contracts/application.ts engine/packages/base/src/contracts/application.test.ts engine/packages/base/src/contracts/index.ts engine/packages/base/src/index.ts engine/packages/base/src/runtime/capabilities engine/packages/base/src/runtime/application engine/packages/base/src/runtime/index.ts engine/packages/base/type-tests/application.test-d.ts engine/packages/base/public-exports.v1.json engine/packages/web/src/capabilities engine/packages/web/src/application/create-game-runtime.ts engine/packages/web/src/application/create-game-runtime.test.ts engine/packages/web/src/index.ts engine/packages/web/type-tests/application-exports.test-d.ts game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/application/entry.tsx game/stories/e2e/src/application/e2e-application-root.test.tsx game/stories/e2e/src/presentation/e2e-renderers.test.tsx game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts game/stories/e2e/src/runtime/headless-runner.test.ts game/stories/e2e/src/runtime/hotfix-integration.test.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(runtime): unify application capabilities"
```

### Task 3: Implement bounded Save decoding and exact compatibility/adoption

**Files:**

- Inspect unchanged: docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md
- Modify: engine/packages/base/src/contracts/persistence.ts
- Modify: engine/packages/base/src/contracts/persistence.test.ts
- Modify: engine/packages/base/src/contracts/index.ts
- Modify: engine/packages/base/src/index.ts
- Create: engine/packages/base/src/runtime/persistence/save-codec.ts
- Create: engine/packages/base/src/runtime/persistence/save-codec.test.ts
- Create: engine/packages/base/src/runtime/persistence/compatibility.ts
- Create: engine/packages/base/src/runtime/persistence/compatibility.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/public-exports.v1.json
- Create: engine/packages/base/type-tests/persistence.test-d.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Test: engine/packages/base/src/runtime/persistence/save-codec.test.ts
- Test: engine/packages/base/src/runtime/persistence/compatibility.test.ts

**Interfaces:**

- Consumes: parseStrictJson、saveJsonLimitsV1、SaveRecordEnvelopeV1、BuildProvenanceV1、PatchSetAdoptionDeclarationV1、integrity-aware Snapshot Schema and canonical state digest。
- Produces: Base-root SaveCompatibilityKeyV1、SimulationAdoptionV1、ImportValidationErrorCodeV1、SaveCompatibilityMismatchV1、ImportCompatibilityWarningV1、ImportRejectionCodeV1、ImportCompatibilityOutcomeV1、SaveCodecContextV1、SaveRecordDecodeResultV1、SaveCompatibilityClassificationV1、SaveImportValidationContextV1、SaveImportValidationResultV1；runtime-only values encodeSaveRecordV1、decodeSaveRecordV1、classifySaveCompatibilityV1 and validateSaveImportCandidateV1。

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
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
pnpm typecheck
```

Expected: FAIL because runtime Save codec/compatibility modules、new root contract types and runtime exports do not exist；failure 不得来自既有 test、syntax 或 dependency。

- [ ] **Step 3: Implement the fixed validation stages**

```ts
export interface SaveImportValidationContextV1<
  TState,
  TSnapshot extends { readonly state: TState },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): SaveCompatibilityClassificationV1;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(state: DeepReadonly<TState>): readonly string[];
}
```

精确公共签名与 result unions 以 Contract Catalog 为准。decode owns only bytes → Strict JSON → envelope Schema/`validateEnvelope` → state digest。标准 envelope Schema 使用内部 tagged failure 区分 future positive format revision 和顶层 stateDigest 格式，不匹配异常文本；`validateEnvelope` 负责 slot/provenance、captured sequence 和 lineage 固定关系。Import classifier 先返回 exact、adoption_candidate、inspect_only 或 rejected；只有 exact/adoption_candidate 才运行 references/invariants，后者全部通过才提升为公开 adopted。Base 在调用 Story validator 前已经完成整个 envelope/integrity/digest 校验，然后只传入 `record.snapshot.state`；Story validator 的类型不能观察或改写 integrity、RNG、sequence 或 provenance。只有最终 exact/adopted 携带 runnable `candidate`；inspect_only/rejected 没有。Encoding 使用 Canonical JSON，无 BOM、缩进或换行差异。

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

warnings 只按 `story_digest → presentation_digest → hotfix_set` 产生；hotfix_set 比较完整 Canonical PatchSet identity。engine.version 和 appBuildId 不进入 mismatch/warning，仅是外围 display/diagnostics。Adoption 只在 sole mismatch 为 simulationDigest、declaration exact matching、state contract/engine/story 相同且 lineage 少于 16 时成为 candidate，并在 Story validators 通过后返回 adopted。第 17 次 adoption 拒绝；exact load with 16 lineage 仍允许。

- [ ] **Step 5: Run focused, type, and full verification**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence/save-codec.test.ts src/runtime/persistence/compatibility.test.ts
pnpm verify:public-exports
pnpm typecheck
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；malformed integrity 在 envelope/state-digest stage 被拒绝；no Session/storage mutation is reachable from codec。显式 writers 只更新 fixture/golden 的 engine provenance/digest；执行 agent 审查 exact bytes、size、SHA-256 与语义投影，普通 verifier/verify 保持只读。

- [ ] **Step 6: Commit Save validation**

```bash
git add -- engine/packages/base/src/contracts/persistence.ts engine/packages/base/src/contracts/persistence.test.ts engine/packages/base/src/contracts/index.ts engine/packages/base/src/index.ts engine/packages/base/src/runtime/persistence/save-codec.ts engine/packages/base/src/runtime/persistence/save-codec.test.ts engine/packages/base/src/runtime/persistence/compatibility.ts engine/packages/base/src/runtime/persistence/compatibility.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/type-tests/persistence.test-d.ts engine/packages/base/public-exports.v1.json game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(base): validate save compatibility"
```

### Task 4: Implement the Web IndexedDB atomic record store

**Files:**

- Modify: engine/packages/base/public-exports.v1.json
- Modify: engine/packages/base/src/testkit/index.ts
- Modify: engine/packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: engine/packages/web/src/application/create-game-runtime.test.ts
- Modify: engine/packages/web/src/capabilities/web-capability-preferences.test.ts
- Create: engine/packages/web/src/host/indexeddb-record-store.ts
- Create: engine/packages/web/src/host/indexeddb-record-store.test.ts
- Modify: engine/packages/web/src/host/create-web-host.ts
- Modify: engine/packages/web/src/host/create-web-host.test.ts
- Modify: engine/packages/web/src/loader/loader.test.tsx
- Modify: engine/packages/web/type-tests/application-exports.test-d.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: game/stories/e2e/src/application/e2e-application-root.test.tsx
- Modify: game/stories/e2e/src/application/entry.tsx
- Modify: game/stories/e2e/src/presentation/e2e-renderers.test.tsx
- Modify: game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts
- Modify: game/stories/e2e/src/runtime/headless-runner.test.ts
- Modify: game/stories/e2e/src/runtime/hotfix-integration.test.ts
- Inspect unchanged: docs/engineering/specs/2026-07-12-game-runtime-design.md
- Inspect unchanged: engine/packages/web/package.json
- Inspect unchanged: pnpm-lock.yaml
- Test: engine/packages/web/src/host/indexeddb-record-store.test.ts

**Interfaces:**

- Consumes: HostAtomicRecordStoreV1、HostStoredRecordV1、HostRecordMutationV1 and browser IndexedDB。
- Produces: createIndexedDbRecordStoreV1 with all-or-nothing read/list/commit、Host revision CAS、stable error mapping、`CreateWebHostOptionsV1` 的 production database/test record-store 互斥组合，以及只从 `@sillymaker/base/testkit` 暴露的 memory record-store factory；Base root 不新增该 test helper，Base 也不依赖 idb。

- [ ] **Step 1: Assert the pre-materialized exact Web-only dependencies without registry access**

Run:

```bash
pnpm verify:materialization
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("engine/packages/web/package.json", "utf8"));
assert.equal(manifest.dependencies?.idb, "8.0.3");
assert.equal(manifest.devDependencies?.["fake-indexeddb"], "6.2.5");
const lock = readFileSync("pnpm-lock.yaml", "utf8");
assert.match(lock, /idb:\s*\n\s*specifier: 8\.0\.3\s*\n\s*version: 8\.0\.3/u);
assert.match(lock, /fake-indexeddb:\s*\n\s*specifier: 6\.2\.5\s*\n\s*version: 6\.2\.5/u);
NODE
pnpm install --frozen-lockfile --offline
pnpm --filter @sillymaker/web exec node --input-type=module -e \
  'await import("idb"); await import("fake-indexeddb");'
git diff --exit-code -- engine/packages/web/package.json pnpm-lock.yaml
```

Expected: all commands exit 0；engine/packages/web/package.json and pnpm-lock.yaml already record exact versions from R1；offline resolution succeeds；manifest/lock remain byte-identical。任一失败归类为 `external_precondition.materialization_stale` 并在写 Task 4 code 前停止。

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

it("opens the frozen v1 schema through the injected factory", async () => {
  const factory = createInstrumentedIdbFactoryV1();
  const store = await createIndexedDbRecordStoreV1({
    indexedDB: factory,
    databaseName: "project-tavern.test.runtime",
  });
  await store.list("settings");
  expect(factory.opens()).toEqual([{ name: "project-tavern.test.runtime", version: 1 }]);
  expect(factory.schema()).toEqual({
    storeName: "records",
    keyPath: ["namespace", "key"],
    indexes: [{ name: "by-namespace", keyPath: "namespace", unique: false }],
  });
});

it.each([
  [createUnavailableFactoryV1(), "indexeddb.unavailable"],
  [createFutureRevisionFactoryV1(2), "indexeddb.database_newer"],
  [createBlockedUpgradeFactoryV1(), "indexeddb.upgrade_blocked"],
  [createQuotaFailureFactoryV1(), "indexeddb.quota_exceeded"],
  [createAbortedTransactionFactoryV1(), "indexeddb.transaction_aborted"],
] as const)("maps expected storage failure to %s", async (factory, code) => {
  await expect(createAndExerciseStoreV1(factory)).rejects.toMatchObject({ code });
});
```

另加 tests：database revision > supported 时只读拒绝、blocked upgrade、quota、transaction abort、duplicate mutation identity and Uint8Array defensive copies。所有既有 `createWebHostV1` test callsites 都必须从 `@sillymaker/base/testkit` 显式注入 fresh `createMemoryHostRecordStoreV1()`；`application-exports.test-d.ts` 固定 `databaseName`/`records` 恰好二选一，并用 `@ts-expect-error` 拒绝两者同时存在或同时缺失。Base consumer type test 固定 memory factory 只存在于 `@sillymaker/base/testkit`，不从 root 暴露。

- [ ] **Step 3: Run focused tests and confirm the adapter is absent**

Run:

```bash
pnpm --filter @sillymaker/web exec vitest run src/host/indexeddb-record-store.test.ts src/host/create-web-host.test.ts
```

Expected: FAIL because IndexedDB adapter、testkit memory-store export and required WebHost persistence union do not exist；failure 不得来自 dependency resolution、syntax 或 unrelated tests。

- [ ] **Step 4: Implement the frozen one-store IndexedDB ABI and atomic adapter**

Web-internal durable ABI 精确为：

```ts
export const SILLYMAKER_DATABASE_VERSION_V1 = 1;
export const SILLYMAKER_RECORD_STORE_NAME_V1 = "records";
export const SILLYMAKER_NAMESPACE_INDEX_NAME_V1 = "by-namespace";

export interface IndexedDbRecordRowV1 {
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly revision: HostRecordRevisionV1;
  readonly bytes: ArrayBuffer;
}

export type IndexedDbRecordStoreFailureCodeV1 =
  | "indexeddb.unavailable"
  | "indexeddb.database_newer"
  | "indexeddb.upgrade_blocked"
  | "indexeddb.quota_exceeded"
  | "indexeddb.transaction_aborted"
  | "indexeddb.request_failed"
  | "indexeddb.schema_invalid";

export interface IndexedDbRecordStoreFailureV1 extends Error {
  readonly code: IndexedDbRecordStoreFailureCodeV1;
  readonly operation: "open" | "read" | "list" | "commit";
}

export interface CreateIndexedDbRecordStoreOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
}
```

`@sillymaker/web` 的公开 composition ABI 精确为：

```ts
interface CreateWebHostCommonOptionsV1 {
  readonly seeds?: readonly number[];
  readonly uuids?: readonly string[];
  readonly now?: () => string;
  readonly crypto?: Pick<Crypto, "getRandomValues" | "randomUUID">;
}

export type CreateWebHostOptionsV1 = CreateWebHostCommonOptionsV1 &
  (
    | { readonly databaseName: string; readonly records?: never }
    | { readonly databaseName?: never; readonly records: HostAtomicRecordStoreV1 }
  );
```

`createWebHostV1` 不再接受省略 options 的调用；production branch 只用 `databaseName`，injected branch 只用 `records`。`createMemoryHostRecordStoreV1` 的实现继续属于 storage-neutral Base，但只新增 `@sillymaker/base/testkit` named export、public inventory 和 consumer type coverage，不进入 Base root。

Production WebHost 必须显式接收 `databaseName` 并传入 `globalThis.indexedDB`，tests 通过 `CreateIndexedDbRecordStoreOptionsV1` 注入名称和 fake/instrumented `IDBFactory`；adapter 不直接捕获全局 factory，也不提供 SillyMaker 或 Project Tavern 品牌化默认值。Project Tavern 玩家 application composition 传入 `project-tavern.runtime`，E2E composition 传入 `project-tavern.e2e.runtime`，单元测试每例使用隔离名称；其他采用 SillyMaker 的游戏必须提供自己的稳定名称。version 1 恰好拥有 object store `records`，composite keyPath `["namespace","key"]` 和 non-unique index `by-namespace`；row 没有时间戳、Story ID 或额外 metadata，转换到 `HostStoredRecordV1` 时复制 `ArrayBuffer`→`Uint8Array`。

Open 必须以显式 version 1 执行；遇到更高 database version 的 `VersionError` 映射 `indexeddb.database_newer`，不得 delete/recreate/upgrade；blocked callback close pending handle and rejects `indexeddb.upgrade_blocked`。version=1 但 store/keyPath/index 不精确时 close 并返回 `indexeddb.schema_invalid`，不得自行修复。所有 expected DOMException 在 Web boundary 映射为上述稳定 code；failure 对象不携带本地路径、原始 row bytes 或任意 database dump。

使用一个 records object store 和 composite key [namespace,key]。commit 在单一 readwrite transaction 中：

1. reject duplicate mutation targets before opening transaction；
2. read every current revision；
3. on first mismatch abort and return conflict with actual revision；
4. apply every put/delete；
5. await transaction done；
6. return defensive copies of changed records。

Expected IndexedDB failures map to `IndexedDbRecordStoreFailureV1` at Web boundary；unexpected implementation bugs may reject and are normalized by higher runtime failure handling。Base source and package manifest must contain no idb import。

- [ ] **Step 5: Wire WebHost and verify boundaries**

createWebHostV1 要求 application 提供稳定 `databaseName`，在 browser 支持 IndexedDB 时使用 persistent adapter；Project Tavern 的 E2E application entry 精确传入 `project-tavern.e2e.runtime`，不得与玩家应用共享数据库。production 缺少 `globalThis.indexedDB` 时安装返回 `indexeddb.unavailable` 的 degraded record store，绝不静默回退到 memory 并谎报持久化成功；所有现有 unit/Story tests 改为显式注入各自 fresh memory record store，不共享 module-global store。Host construction must not open Story or GameSession。

Run:

```bash
pnpm --filter @sillymaker/web exec vitest run src/host
pnpm verify:public-exports
pnpm verify:boundaries
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；IndexedDB/idb imports only exist under engine/packages/web；Base remains DOM/storage neutral。

- [ ] **Step 6: Commit the Web record store**

```bash
git add -- engine/packages/base/public-exports.v1.json engine/packages/base/src/testkit/index.ts engine/packages/base/type-tests/phase1-consumer.test-d.ts engine/packages/web/src/application/create-game-runtime.test.ts engine/packages/web/src/capabilities/web-capability-preferences.test.ts engine/packages/web/src/host/indexeddb-record-store.ts engine/packages/web/src/host/indexeddb-record-store.test.ts engine/packages/web/src/host/create-web-host.ts engine/packages/web/src/host/create-web-host.test.ts engine/packages/web/src/loader/loader.test.tsx engine/packages/web/type-tests/application-exports.test-d.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/application/e2e-application-root.test.tsx game/stories/e2e/src/application/entry.tsx game/stories/e2e/src/presentation/e2e-renderers.test.tsx game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts game/stories/e2e/src/runtime/headless-runner.test.ts game/stories/e2e/src/runtime/hotfix-integration.test.ts
git diff --exit-code -- engine/packages/web/package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(web): persist atomic host records"
```

### Task 5: Implement physical Save slots, CAS rotation, and fenced leases

**Files:**

- Create: engine/packages/base/src/runtime/persistence/slot-keys.ts
- Create: engine/packages/base/src/runtime/persistence/save-repository.ts
- Create: engine/packages/base/src/runtime/persistence/save-repository.test.ts
- Create: engine/packages/base/src/runtime/persistence/save-repository.property.test.ts
- Create: engine/packages/base/src/runtime/persistence/session-lease.ts
- Create: engine/packages/base/src/runtime/persistence/session-lease.test.ts
- Test: engine/packages/base/src/runtime/persistence/save-repository.test.ts
- Test: engine/packages/base/src/runtime/persistence/save-repository.property.test.ts
- Test: engine/packages/base/src/runtime/persistence/session-lease.test.ts

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

另在 `save-repository.property.test.ts` 使用 fast-check 生成 repository write/Auto rotation/lease takeover 的交错序列，固定 stale fence 永不提交、Auto batch 不部分轮换、损坏记录不静默修复。该文件必须由 `pnpm test:property` 直接发现，不能把 randomized coverage 藏在普通 unit test 中。

- [ ] **Step 3: Run focused tests and confirm repository/lease absence**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/save-repository.property.test.ts src/runtime/persistence/session-lease.test.ts
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
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence/save-repository.test.ts src/runtime/persistence/save-repository.property.test.ts src/runtime/persistence/session-lease.test.ts
pnpm test:property
pnpm verify
git diff --check
```

Expected: all commands exit 0；randomized interleavings never permit stale write、partial Auto rotation or silent repair。

- [ ] **Step 7: Commit slots and leases**

```bash
git add -- engine/packages/base/src/runtime/persistence/slot-keys.ts engine/packages/base/src/runtime/persistence/save-repository.ts engine/packages/base/src/runtime/persistence/save-repository.test.ts engine/packages/base/src/runtime/persistence/save-repository.property.test.ts engine/packages/base/src/runtime/persistence/session-lease.ts engine/packages/base/src/runtime/persistence/session-lease.test.ts
git diff --cached --check
git commit -m "feat(base): add fenced save slots"
```

### Task 6: Implement capture, autosave, import/load, and degraded recovery

**Files:**

- Create: engine/packages/base/src/runtime/persistence/auto-save-queue.ts
- Create: engine/packages/base/src/runtime/persistence/auto-save-queue.test.ts
- Create: engine/packages/base/src/runtime/persistence/persistence-service.ts
- Create: engine/packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: engine/packages/base/src/runtime/application/game-application.ts
- Modify: engine/packages/base/src/runtime/application/game-application.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/public-exports.v1.json
- Modify: engine/packages/web/src/application/create-game-runtime.ts
- Modify: engine/packages/web/src/application/create-game-runtime.test.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Create: game/stories/e2e/src/runtime/persistence-roundtrip.test.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Test: engine/packages/base/src/runtime/persistence/persistence-service.test.ts
- Test: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Test: game/stories/e2e/src/runtime/persistence-roundtrip.test.ts

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
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence/auto-save-queue.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @sillymaker/web exec vitest run src/application/create-game-runtime.test.ts
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
pnpm --filter @sillymaker/base exec vitest run src/runtime/persistence src/runtime/application/game-application.test.ts
pnpm --filter @sillymaker/web exec vitest run src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/persistence-roundtrip.test.ts
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
wc -c game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: all commands exit 0；normal Save round-trips pristine integrity；no operation creates a second mutation queue。显式 writers 只更新 fixture/golden 内因新 persistence public closure 产生的 engine provenance/digest；执行 agent 审查 exact bytes、size、SHA-256 和不变的 Snapshot/Facts/RNG/Story/simulation/presentation 语义，普通 verifier/verify 保持只读。

- [ ] **Step 8: Commit persistence orchestration**

```bash
git add -- engine/packages/base/src/runtime/persistence/auto-save-queue.ts engine/packages/base/src/runtime/persistence/auto-save-queue.test.ts engine/packages/base/src/runtime/persistence/persistence-service.ts engine/packages/base/src/runtime/persistence/persistence-service.test.ts engine/packages/base/src/runtime/application/game-application.ts engine/packages/base/src/runtime/application/game-application.test.ts engine/packages/base/src/runtime/session/game-session.ts engine/packages/base/src/runtime/session/game-session.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/public-exports.v1.json engine/packages/web/src/application/create-game-runtime.ts engine/packages/web/src/application/create-game-runtime.test.ts game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/runtime/persistence-roundtrip.test.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(runtime): persist and recover game sessions"
```

### Task 7: Add the bounded CommandLog and authoritative replay

**Files:**

- Create: engine/packages/base/src/runtime/diagnostics/command-log.ts
- Create: engine/packages/base/src/runtime/diagnostics/command-log.test.ts
- Create: engine/packages/base/src/runtime/diagnostics/replay.ts
- Create: engine/packages/base/src/runtime/diagnostics/replay.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/public-exports.v1.json
- Create: game/stories/e2e/src/runtime/diagnostics-replay.test.ts
- Modify: game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Test: engine/packages/base/src/runtime/diagnostics/command-log.test.ts
- Test: engine/packages/base/src/runtime/diagnostics/replay.test.ts

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
pnpm --filter @sillymaker/base exec vitest run src/runtime/diagnostics/command-log.test.ts src/runtime/diagnostics/replay.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts
```

Expected: FAIL because attempts are not retained or replayed。

- [ ] **Step 4: Implement log append, eviction, and anchor reset**

GameSession 在同一 queue item 内对 executor candidate 应用引擎 directive，生成唯一 `FinalizedCommandAttemptV1`，然后把这个已经包含最终 Snapshot/integrity/digest 的对象同时交给 CommandLog 并作为 dispatch result 来源。不得记录 Story executor 的未最终 candidate，不得为日志再执行或二次标记 integrity。log entry 保留 schema 实际 parse 后的 GameCommand；Semantic invocation/action ID 不进入 CommandLog。Task 9 以同一 finalization seam 加入实际 parsed DebugCommand。

logOrdinal increments for committed/rejected/faulted because commandSequence may not。Internally retain public entry plus finalized postAttemptSnapshot；on overflow first move replay base to evicted post snapshot，then remove。No command is re-executed for eviction。测试必须断言 log post-state digest、dispatch result digest 与 Session live digest 三者相同。

establishAnchor replaces replay base、clears public/internal entries and resets ordinal 1。Successful load/import/adoption/lifecycle/fixture/debug bundle anchors call it；failed anchors preserve log。

`preserve_log` 只允许 replacement 保持当前 Snapshot 的同一对象引用；任何未记录但改变 Snapshot 的测试 setup 或权威 replacement 都必须使用 `replace_replay_base`，否则 replay base/log/current continuity 无法成立。

- [ ] **Step 5: Implement isolated replay**

Authoritative replay verifies blocking identity first，then submits each logged parsed GameCommand/DebugCommand to the matching executor in an isolated GameSession and compares outputs。It never replays Semantic invocation，never anchors live Session or writes Save。Best-effort inspection returns authoritative false and stays read-only。

Task 9 extends command log source union with DebugCommand；normal Gameplay replay must preserve pristine integrity。

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/diagnostics src/runtime/session/game-session.test.ts src/runtime/persistence/persistence-service.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/diagnostics-replay.test.ts src/runtime/e2e-semantic-game-port.test.ts
pnpm verify:public-exports
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
wc -c game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: all commands exit 0；201-entry replay exact；recorded Facts never applied；anchor resets log and preserves replacement integrity；`preserve_log` 不能产生未记录的 Snapshot replacement。显式 writers 只更新 fixture/golden 内因新 diagnostics public closure 产生的 engine provenance/digest；执行 agent 审查 exact bytes、size、SHA-256 和不变的 Snapshot/Facts/RNG/Story/simulation/presentation 语义，普通 verifier/verify 保持只读。

- [ ] **Step 7: Commit CommandLog and replay**

```bash
git add -- engine/packages/base/src/runtime/diagnostics engine/packages/base/src/runtime/session/game-session.ts engine/packages/base/src/runtime/session/game-session.test.ts engine/packages/base/src/runtime/persistence/persistence-service.ts engine/packages/base/src/runtime/persistence/persistence-service.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/public-exports.v1.json game/stories/e2e/src/runtime/diagnostics-replay.test.ts game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(base): replay bounded game commands"
```

### Task 8: Build bounded, privacy-scrubbed DebugBundle export

**Files:**

- Modify: engine/packages/base/src/contracts/diagnostics.ts
- Modify: engine/packages/base/src/contracts/diagnostics.test.ts
- Modify: engine/packages/base/src/contracts/index.ts
- Modify: engine/packages/base/src/index.ts
- Create: engine/packages/base/src/runtime/diagnostics/debug-bundle.ts
- Create: engine/packages/base/src/runtime/diagnostics/debug-bundle.test.ts
- Create: engine/packages/base/src/runtime/diagnostics/runtime-failures.ts
- Create: engine/packages/base/src/runtime/diagnostics/runtime-failures.test.ts
- Create: engine/packages/base/src/runtime/diagnostics/privacy.ts
- Create: engine/packages/base/src/runtime/diagnostics/privacy.test.ts
- Modify: engine/packages/base/src/runtime/application/game-application.ts
- Modify: engine/packages/base/src/runtime/application/game-application.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/public-exports.v1.json
- Modify: engine/packages/web/src/application/create-game-runtime.ts
- Modify: engine/packages/web/src/application/create-game-runtime.test.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Inspect unchanged: docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md
- Test: engine/packages/base/src/runtime/diagnostics/debug-bundle.test.ts
- Test: engine/packages/base/src/runtime/diagnostics/privacy.test.ts

**Interfaces:**

- Consumes: ResolvedGame provenance、RuntimeCapabilities current state、GameSession Snapshot/RunIntegrity and Phase 2 `onObserverFailure` hook、CommandLog、runtime failures and Host metadata clock。
- Produces: DebugBundleEnvelopeV1 with capabilities/integrity、encodeDebugBundleV1、decodeDebugBundleV1、createGameDiagnosticsServiceV1、PersistenceServiceV1 的 frozen current-lineage read seam and bounded privacy scrubber。

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
pnpm --filter @sillymaker/base exec vitest run src/contracts/diagnostics.test.ts src/runtime/diagnostics/debug-bundle.test.ts src/runtime/diagnostics/runtime-failures.test.ts src/runtime/diagnostics/privacy.test.ts
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

`PersistenceServiceV1.getSimulationLineage()` 只向 bootstrap composition 暴露当前已提交 lineage 的 frozen read-only snapshot；它不进入 player persistence port，也不提供写入或 adoption 权限。exact/adopted load 与 lifecycle anchor 后分别返回已提交的 preserved/appended/reset lineage，失败操作保持原引用内容不变。

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
pnpm --filter @sillymaker/base exec vitest run src/contracts/diagnostics.test.ts src/runtime/diagnostics src/runtime/application/game-application.test.ts
pnpm verify:public-exports
pnpm typecheck
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
wc -c game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: all commands exit 0；bundle round-trip preserves capability state and integrity；privacy/size limits apply before download。显式 writers 只更新 fixture/golden 内因新 diagnostics public closure 产生的 engine provenance/digest；执行 agent 审查 exact bytes、size、SHA-256 和不变的 Snapshot/Facts/RNG/Story/simulation/presentation 语义，普通 verifier/verify 保持只读。

- [ ] **Step 6: Commit DebugBundle export**

```bash
git add -- engine/packages/base/src/contracts/diagnostics.ts engine/packages/base/src/contracts/diagnostics.test.ts engine/packages/base/src/contracts/index.ts engine/packages/base/src/index.ts engine/packages/base/src/runtime/diagnostics engine/packages/base/src/runtime/application/game-application.ts engine/packages/base/src/runtime/application/game-application.test.ts engine/packages/base/src/runtime/session/game-session.ts engine/packages/base/src/runtime/session/game-session.test.ts engine/packages/base/src/runtime/persistence/persistence-service.ts engine/packages/base/src/runtime/persistence/persistence-service.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/public-exports.v1.json engine/packages/web/src/application/create-game-runtime.ts engine/packages/web/src/application/create-game-runtime.test.ts game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(base): export bounded debug bundles"
```

### Task 9: Implement capability-gated DebugTools and same-artifact Story tooling

**Files:**

- Create: engine/packages/base/src/runtime/diagnostics/debug-tools.ts
- Create: engine/packages/base/src/runtime/diagnostics/debug-tools.test.ts
- Modify: engine/packages/base/src/runtime/diagnostics/command-log.ts
- Modify: engine/packages/base/src/runtime/diagnostics/command-log.test.ts
- Modify: engine/packages/base/src/runtime/diagnostics/replay.ts
- Modify: engine/packages/base/src/runtime/diagnostics/replay.test.ts
- Modify: engine/packages/base/src/runtime/application/game-application.ts
- Modify: engine/packages/base/src/runtime/application/game-application.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/public-exports.v1.json
- Modify: game/stories/e2e/src/tooling.ts
- Create: game/stories/e2e/src/tooling/debug-command-form-adapter.ts
- Create: game/stories/e2e/src/tooling/debug-command-form-adapter.test.ts
- Create: game/stories/e2e/src/tooling/fixture-resolver.ts
- Create: game/stories/e2e/src/tooling/fixture-resolver.test.ts
- Modify: game/stories/e2e/package.json
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: game/stories/e2e/src/runtime/persistence-roundtrip.test.ts
- Modify: game/stories/e2e/src/runtime/diagnostics-replay.test.ts
- Modify: game/stories/e2e/fixtures/session-zero.json
- Modify: game/stories/e2e/golden/semantic-flow.json
- Test: engine/packages/base/src/runtime/diagnostics/debug-tools.test.ts
- Test: game/stories/e2e/src/tooling/debug-command-form-adapter.test.ts

**Interfaces:**

- Consumes: RuntimeCapabilityPort、GameSession FIFO、ResolvedGame.gameSimulation-owned debug command/error schemas plus validator/executor、RunIntegrity、CommandLog/replay、DebugBundle codec and StoryToolingEntry。
- Produces: createDebugToolsPortV1、fixture/debug bundle anchor and lazy same-artifact fixtures/notes/form-adapter resolution；consumes the Task 2-frozen DebugToolsPortV1 ABI。`E2eDebugCommandV1` and all debug semantics were already produced by Phase 2 Gameplay，not by tooling。

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
  expect(result).toMatchObject({
    kind: "committed",
    commandSequence: fixture.snapshot().commandSequence,
  });
  expect(fixture.commandLog().at(-1)?.postStateDigest).toBe(fixture.liveStateDigest());
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
  await expect(fixture.application.debugTools.listFixtures()).resolves.toEqual({
    kind: "listed",
    fixtureIds: e2eFixtureIdsV1,
  });
  expect(fixture.toolingLoads()).toBe(1);
  expect(fixture.loadedSpecifier()).toBe("@project-tavern/story-e2e/tooling");
});
```

No method accepts module URL、path、Story ID or arbitrary import specifier。另加 loader test 证明 `executeDebugCommand` 直接使用 ResolvedGame 内已加载的 schema/validator/executor，不触发 tooling import；只有 fixture/notes/form UI 才延迟加载固定 tooling export。

- [ ] **Step 3: Run focused tests and confirm DebugTools are unavailable**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/diagnostics/debug-tools.test.ts src/runtime/application/game-application.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/application/create-e2e-game-runtime.test.ts
```

Expected: FAIL because real capability-gated DebugTools and Story adapters do not exist。

- [ ] **Step 4: Implement read-only and mutating authority separately**

Task 2 已冻结 DebugToolsPortV1、DebugToolsOperationResultV1 和 DebugFixtureListResultV1；本任务消费该 ABI，只实现 createDebugToolsPortV1。成功列表 resolve `{ kind: "listed", fixtureIds }`，关闭 capability resolve `{ kind: "capability_disabled" }`：

```ts
declare const listed: DebugFixtureListResultV1<FixtureId>;
if (listed.kind === "listed") listed.fixtureIds;
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
pnpm --filter @sillymaker/base exec vitest run src/runtime/diagnostics src/runtime/application/game-application.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/runtime/persistence-roundtrip.test.ts src/runtime/diagnostics-replay.test.ts src/application/create-e2e-game-runtime.test.ts
pnpm verify:boundaries
pnpm build:e2e
pnpm verify:bundle
pnpm regenerate:fixtures
pnpm update:golden
git diff -- game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
wc -c game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
shasum -a 256 game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
pnpm verify:fixtures
pnpm verify:golden
pnpm verify
git diff --check
```

Expected: all commands exit 0；same Artifact contains tooling chunk but default UI/capabilities are off；normal Semantic operations remain normal integrity；successful cheat/anchor remains modified across Save/replay。显式 writers 只更新 fixture/golden 内因新 DebugTools public closure 产生的 engine provenance/digest；执行 agent 审查 exact bytes、size、SHA-256 和不变的 Snapshot/Facts/RNG/Story/simulation/presentation 语义，普通 verifier/verify 保持只读。

- [ ] **Step 7: Commit DebugTools**

```bash
git add -- engine/packages/base/src/runtime/diagnostics/debug-tools.ts engine/packages/base/src/runtime/diagnostics/debug-tools.test.ts engine/packages/base/src/runtime/diagnostics/command-log.ts engine/packages/base/src/runtime/diagnostics/command-log.test.ts engine/packages/base/src/runtime/diagnostics/replay.ts engine/packages/base/src/runtime/diagnostics/replay.test.ts engine/packages/base/src/runtime/application/game-application.ts engine/packages/base/src/runtime/application/game-application.test.ts engine/packages/base/src/runtime/session/game-session.ts engine/packages/base/src/runtime/session/game-session.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/public-exports.v1.json game/stories/e2e/src/tooling.ts game/stories/e2e/src/tooling game/stories/e2e/package.json game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/runtime/persistence-roundtrip.test.ts game/stories/e2e/src/runtime/diagnostics-replay.test.ts game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(runtime): gate same-artifact debug tools"
```

### Task 10: Harden unified-root HMR invalidation and recovery

**Files:**

- Create: engine/packages/base/src/runtime/session/runtime-invalidation.ts
- Create: engine/packages/base/src/runtime/session/runtime-invalidation.test.ts
- Modify: engine/packages/base/src/runtime/session/game-session.ts
- Modify: engine/packages/base/src/runtime/session/game-session.test.ts
- Modify: engine/packages/base/src/runtime/session/index.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.ts
- Modify: engine/packages/base/src/runtime/persistence/persistence-service.test.ts
- Modify: engine/packages/base/src/runtime/persistence/session-lease.ts
- Modify: engine/packages/base/src/runtime/persistence/session-lease.test.ts
- Modify: engine/packages/base/src/runtime/diagnostics/runtime-failures.ts
- Modify: engine/packages/base/src/runtime/diagnostics/runtime-failures.test.ts
- Modify: engine/packages/base/src/runtime/index.ts
- Modify: engine/packages/base/src/index.ts
- Modify: engine/packages/base/type-tests/public-exports.test-d.ts
- Modify: engine/packages/base/public-exports.v1.json
- Create: engine/packages/web/src/application/resolved-game-hmr.ts
- Create: engine/packages/web/src/application/resolved-game-hmr.test.ts
- Modify: engine/packages/web/src/application/create-game-runtime.ts
- Modify: engine/packages/web/src/application/create-game-runtime.test.ts
- Modify: engine/packages/web/src/index.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: game/stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: game/stories/e2e/src/application/entry.tsx
- Create: game/stories/e2e/src/runtime/hmr-integration.test.ts
- Test: engine/packages/base/src/runtime/session/runtime-invalidation.test.ts
- Test: engine/packages/web/src/application/resolved-game-hmr.test.ts
- Test: game/stories/e2e/src/runtime/hmr-integration.test.ts

**Interfaces:**

- Consumes: unified E2E application root、accepted ResolvedGame digest tuple、GameSession invalidation、Save/Debug export and import.meta.hot-like adapter。
- Produces: RuntimeInvalidationControllerV1、installResolvedGameHmrV1 and same-root full rebootstrap with no Developer-specific path。
- Produces: a disposal/handoff lifecycle that fences the invalidated runtime before a fresh HMR runtime receives Save ownership。

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

it("fences the old lease owner before the replacement runtime can save", async () => {
  const fixture = await createOwnedHmrRuntimeFixture("owner-old");
  const staleFence = fixture.currentFence();
  const replacement = fixture.acceptAndRebootstrap({ nextOwnerId: "owner-new" });
  fixture.releaseBlockedAutoWrite();
  await replacement;

  expect(fixture.oldRuntimeDisposition()).toBe("disposed");
  expect(fixture.currentLease()).toMatchObject({
    ownerId: "owner-new",
    fencingToken: staleFence.fencingToken + 1,
  });
  await expect(fixture.writeWithOldRuntime(staleFence)).resolves.toMatchObject({
    kind: "rejected",
    code: "conflict",
  });
  await expect(fixture.saveWithReplacement()).resolves.toMatchObject({ kind: "saved" });
});

it("keeps the replacement read-only when lease takeover fails", async () => {
  const fixture = await createHmrRuntimeWithTakeoverFailure();
  await fixture.acceptAndRebootstrap({ nextOwnerId: "owner-new" });
  expect(fixture.replacementPersistenceStatus()).toMatchObject({
    ownership: "read_only",
    code: "lease_takeover_failed",
  });
  expect(fixture.oldRuntimeCanWrite()).toBe(false);
});
```

- [ ] **Step 2: Write failing resolved-tuple and same-root tests**

HMR tuple exactly includes Story ID/revision/digest、Engine digest、state-contract revision/digest、simulation digest and presentation digest。engine.version、appBuildId and RuntimeCapabilities are excluded。Any single blocking/visual field change or resolution failure invalidates once；equal tuple CSS/UI/tooling-note update does not。

Full rebootstrap must call the same game/stories/e2e/src/application/entry.tsx composition factory；test asserts no developer-entry、player-entry、second HTML or second Vite mode。

The Story runtime factory must expose the Base invalidation and PersistenceService rebootstrap lifecycle that it creates to that same entry-side composition factory through an explicit Story-local contract；`entry.tsx` cannot reconstruct those owner-only controls from the player-facing `GameApplicationPortV1`。

HMR identity changes also freeze one persistence-owner lifecycle: equal-tuple CSS/UI update does nothing to lease ownership；digest-changing accept creates a fresh owner ID from Host bootstrap entropy, invalidates old Session synchronously, calls `disposeForRebootstrap()` on old PersistenceService, and does not expose the replacement as writable until an explicit lease transfer succeeds。

- [ ] **Step 3: Run focused tests and confirm unified HMR is absent**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/session/runtime-invalidation.test.ts src/runtime/session/game-session.test.ts
pnpm --filter @sillymaker/web exec vitest run src/application/resolved-game-hmr.test.ts src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/hmr-integration.test.ts
```

Expected: FAIL because invalidation policy and same-root HMR adapter do not exist。

- [ ] **Step 4: Implement failure-safe invalidation**

Digest change synchronously publishes hmr_invalidated，blocks queued/new Gameplay、Debug mutation and Auto Save before attempt，records one runtime.hmr_invalidated，preserves last legal Snapshot/provenance for current Save/Debug export。HMR-invalidated Session cannot recover by load；the application unmounts and constructs a fresh ResolvedGame/GameSession through the same root。

`disposeForRebootstrap()` is idempotent and ordered：increment Auto `anchorEpoch` → drop not-started candidates → await any started write plus stale-write repair → mark old PersistenceService disposed → release old lease with its exact current fence。After release, the new runtime performs explicit takeover of the unowned lease, which increments `fencingToken` exactly once, then enables writes。Old queued/new Save operations return stable `runtime_disposed`/`conflict` and cannot touch the replacement world。Release or takeover failure never re-enables the old runtime；the replacement remains read-only with stable `lease_release_failed` or `lease_takeover_failed` status and JSON `exportCurrentSave` still works。No owner ID or fence is reused across HMR rebootstrap。

Fault-paused Session remains distinct：validated exact load/restart can recover through FIFO。Internal queue throws settle as typed fault and cannot poison tail。

`RuntimeInvalidationControllerV1` 是 Web HMR adapter 所需的公开 Base runtime contract；它必须从 `runtime/session/index.ts` → `runtime/index.ts` → Base root 完整导出，同步更新 type test 和 `public-exports.v1.json`。Web 不得 deep-import `runtime/session/runtime-invalidation.ts`。

- [ ] **Step 5: Run HMR, build, and full verification**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/runtime/session src/runtime/persistence/persistence-service.test.ts src/runtime/persistence/session-lease.test.ts src/runtime/diagnostics/runtime-failures.test.ts
pnpm --filter @sillymaker/web exec vitest run src/application
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/hmr-integration.test.ts
pnpm build:e2e
pnpm verify:bundle
pnpm verify
git diff --check
```

Expected: all commands exit 0；same Artifact/root reboots；no second app build；capability toggles never invalidate；old HMR owner is fenced before replacement writes and takeover failure yields a read-only replacement rather than a stuck or shared owner。

- [ ] **Step 6: Commit HMR invalidation**

```bash
git add -- engine/packages/base/src/runtime/session engine/packages/base/src/runtime/persistence/persistence-service.ts engine/packages/base/src/runtime/persistence/persistence-service.test.ts engine/packages/base/src/runtime/persistence/session-lease.ts engine/packages/base/src/runtime/persistence/session-lease.test.ts engine/packages/base/src/runtime/diagnostics/runtime-failures.ts engine/packages/base/src/runtime/diagnostics/runtime-failures.test.ts engine/packages/base/src/runtime/index.ts engine/packages/base/src/index.ts engine/packages/base/type-tests/public-exports.test-d.ts engine/packages/base/public-exports.v1.json engine/packages/web/src/application engine/packages/web/src/index.ts game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/application/entry.tsx game/stories/e2e/src/runtime/hmr-integration.test.ts
git diff --cached --check
git commit -m "feat(runtime): rebootstrap unified hmr sessions"
```

### Task 11: Freeze runtime fixtures and add the read-only Phase 3 gate

**Files:**

- Modify: .gitignore
- Create: game/stories/e2e/src/test/fixtures/runtime/auto-current-flow-blocked.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/auto-previous-recovery.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/quick-narrative-branch.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/manual-terminal.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/manual-modified-cheat.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/adoption-exact-patchset.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/adoption-lineage-limit.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/corrupt-state-digest.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/future-format-revision.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/debug-flow-command-log.v1.json
- Create: game/stories/e2e/src/test/fixtures/runtime/manifest.v1.json
- Create: game/stories/e2e/src/runtime/runtime-fixture-provenance.ts
- Create: game/stories/e2e/scripts/runtime-fixture-builder.mts
- Create: game/stories/e2e/scripts/regenerate-runtime-fixtures.mts
- Create: game/stories/e2e/scripts/verify-runtime-fixtures.mts
- Create: game/stories/e2e/src/runtime/runtime-fixtures.test.ts
- Modify: game/stories/e2e/package.json
- Modify: package.json
- Create: scripts/verify-persistence-diagnostics.mts
- Create: scripts/verify-persistence-diagnostics.test.mjs
- Modify: scripts/run-script-tests.test.mjs
- Modify: engine/packages/base/package.json
- Modify: engine/packages/web/package.json
- Test: game/stories/e2e/src/runtime/runtime-fixtures.test.ts
- Test: scripts/verify-persistence-diagnostics.test.mjs

**Interfaces:**

- Consumes: green Phase 3 runtime、fixed E2E Story/tooling、Save/Debug codecs、RunIntegrity and explicit frozen provenance。
- Produces: ten reviewed canonical fixture payloads、one provenance-bound manifest、recoverable directory transaction、explicit writer/read-only verifier and cumulative pnpm verify:persistence-diagnostics。

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
  ["pnpm", ["verify:materialization"]],
  ["pnpm", ["verify:phase2"]],
  ["pnpm", ["--filter", "@sillymaker/base", "run", "test:runtime"]],
  ["pnpm", ["--filter", "@sillymaker/web", "run", "test:host"]],
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

Gate test 还必须证明 `verify:phase2` 位于任何 Phase 3-specific test 之前，从而 Phase 3 gate 是累积 gate，而不是允许 Phase 2 regression 的旁路。

- [ ] **Step 3: Run tests and confirm fixtures/gate are absent**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/runtime-fixtures.test.ts
node --test scripts/verify-persistence-diagnostics.test.mjs
```

Expected RED 必须逐项命中：Vitest 只因 exact ten payloads/manifest/classifier 尚不存在而失败；Node test 只因 `verify-persistence-diagnostics.mts` 或包含 `verify:materialization`→`verify:phase2` 的 exact mapping 尚不存在而失败。出现 syntax、dependency、browser 或既有 Phase 2 regression 时不得继续。

- [ ] **Step 4: Implement one pure deterministic fixture builder**

runtime-fixture-provenance.ts freezes：

- blocking：Story ID/revision、state-contract revision/digest、Engine digest、simulation digest；
- diagnosticAtGeneration：Story digest、presentation digest/PatchSet、Engine version、appBuildId。

Builder uses fixed seed、fixed UTC times、fixed tooling commands and frozen provenance；it calls real public Save/Debug encoders and returns filename-to-bytes map。modified fixture must be produced by real successful DebugCommand，not by directly editing integrity。Corrupt/future files derive from one legal record by changing exactly one declared field and canonical re-encoding。

`manifest.v1.json` is canonical JSON and contains exactly：`formatRevision: 1`、sorted ten payload entries `{ path, byteLength, sha256, classification, integrityMode }`、the complete blocking provenance tuple、diagnostic-at-generation tuple and generator source digest。Manifest不得自我列出；verifier computes every payload SHA-256/size/classification and rejects missing/extra files, unsorted entries or provenance drift。

regenerate script is sole tracked writer。启动时先只处理下段定义的 recognized transaction residue；recovery 完成后要求 target runtime-fixtures directory 下没有 pre-existing tracked、untracked、intent-to-add change。Task-authored `runtime-fixture-provenance.ts` 可以是本任务的 untracked/modified source，但必须通过 strict parser，且其 blocking identity 与 live ResolvedGame 精确匹配后 writer 才能开始。它不得逐文件覆盖 target：先在 sibling `.runtime-fixtures.next-<pid>` 写完整十个 payload 与 manifest，fsync/close、用 verifier 校验；若 target 已存在，将它 rename 为 `.runtime-fixtures.previous`，首次生成则跳过该 rename；再将 next rename 为 target，复验后删除 previous。`.gitignore` 精确忽略 `game/stories/e2e/src/test/fixtures/.runtime-fixtures.next-*`、`.runtime-fixtures.previous` 和 `.runtime-fixtures.transaction.v1.json`。

Writer 在第一次 rename 前原子写 transaction journal `{ formatRevision: 1, phase: "prepared" | "swapped", hadPrevious: boolean, expectedManifestSha256 }`，且每次 journal/rename 后 fsync parent directory。Recovery 决策精确为：

- `prepared + hadPrevious`：删除可能已换入的 target/next，以 verified previous 恢复 target，再删 journal，返回 `runtime_fixture_generation.recovered_rollback`；
- `prepared + !hadPrevious`：删除可能已换入的 target/next，使 target 回到 absent，再删 journal，返回同一 rollback code；
- `swapped + target manifest === expectedManifestSha256`：保留完整新 target，删除 previous/next/journal；
- `swapped + target invalid`：有 verified previous 时 rollback；首次生成则删除 invalid target；随后返回 rollback code；
- journal 不符合 strict schema、previous 不可验证或同时存在未知 residue：不删除任何证据，失败为 `runtime_fixture_generation.recovery_ambiguous`。

SIGINT/throw tests 必须分别注入在 prepared、old-renamed、new-renamed 和 swapped-journal 四个点，证明 rerun 后 target 要么是完整旧 set、要么是 manifest 验证过的完整新 set，绝不是 partial mix。Verifier builds into temp/in-memory，compares sorted file set and every byte，checks classifications/integrity/manifest and never updates frozen provenance。

- [ ] **Step 5: Implement package aliases and read-only phase gate**

Exact package scripts：

```json
{
  "root": {
    "verify:runtime-fixtures": "pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures",
    "verify:persistence-diagnostics": "node --experimental-strip-types scripts/verify-persistence-diagnostics.mts"
  },
  "engine/packages/base": {
    "test:runtime": "pnpm --dir ../.. exec vitest run engine/packages/base/src/runtime"
  },
  "engine/packages/web": {
    "test:host": "pnpm --dir ../.. exec vitest run engine/packages/web/src/host engine/packages/web/src/capabilities engine/packages/web/src/application"
  },
  "game/stories/e2e": {
    "test:runtime": "pnpm --dir ../.. exec vitest run game/stories/e2e/src/runtime game/stories/e2e/src/tooling",
    "regenerate:runtime-fixtures": "node --experimental-strip-types scripts/regenerate-runtime-fixtures.mts",
    "verify:runtime-fixtures": "node --experimental-strip-types scripts/verify-runtime-fixtures.mts"
  }
}
```

Root `verify:runtime-fixtures` delegates only to Story read-only verifier。`verify:persistence-diagnostics.mts` runs the exact frozen cumulative command list with spawnSync and no shell interpolation。Gate test 必须同时锁定上述两个 root script 的精确映射；普通 verify 不得 invoke recovery/writer or modify journal/temp paths。

- [ ] **Step 6: Generate once, review, and prove read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-e2e regenerate:runtime-fixtures
git add -N -- game/stories/e2e/src/test/fixtures/runtime/*.json game/stories/e2e/src/runtime/runtime-fixture-provenance.ts
git diff -- game/stories/e2e/src/runtime/runtime-fixture-provenance.ts game/stories/e2e/src/test/fixtures/runtime
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("game/stories/e2e/src/test/fixtures/runtime/manifest.v1.json", "utf8"));
assert.equal(manifest.formatRevision, 1);
assert.equal(manifest.files.length, 10);
assert.deepEqual(manifest.files.map(({ path }) => path), manifest.files.map(({ path }) => path).toSorted());
NODE
shasum -a 256 game/stories/e2e/src/test/fixtures/runtime/*.json
pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures
before="$(git status --porcelain=v1)"
pnpm verify:persistence-diagnostics
pnpm verify
pnpm verify:persistence-diagnostics
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

Expected: explicit writer creates exactly ten payload files plus manifest；`git add -N` makes every new artifact visible to review without accepting its content；executing agent checks exact file set、manifest hashes/sizes、blocking and diagnostic provenance、normal/modified/classification matrix and records SHA-256 evidence；recovery residue is absent；all cumulative read-only gates exit 0 twice and status comparison passes。该技术 review 不等待人工批准。

- [ ] **Step 7: Commit runtime fixtures and gate**

```bash
git add -- .gitignore game/stories/e2e/src/test/fixtures/runtime game/stories/e2e/src/runtime/runtime-fixture-provenance.ts game/stories/e2e/scripts/runtime-fixture-builder.mts game/stories/e2e/scripts/regenerate-runtime-fixtures.mts game/stories/e2e/scripts/verify-runtime-fixtures.mts game/stories/e2e/src/runtime/runtime-fixtures.test.ts game/stories/e2e/package.json package.json scripts/verify-persistence-diagnostics.mts scripts/verify-persistence-diagnostics.test.mjs scripts/run-script-tests.test.mjs engine/packages/base/package.json engine/packages/web/package.json
git diff --cached --check
git commit -m "test(runtime): freeze persistence diagnostics evidence"
```

## Phase 3 Acceptance

从 Phase 3 最终 HEAD 运行：

```bash
pnpm install --frozen-lockfile --offline
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:materialization
pnpm verify:phase2
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
- [ ] Base consumes only Host record contract；IndexedDB/idb remain under engine/packages/web。
- [ ] four physical slots、atomic Auto rotation、Quick/Manual CAS、read-back verification、lease handoff/takeover/release and fencing tests pass。
- [ ] Auto anchorEpoch prevents an in-flight pre-anchor write from becoming the final `auto.current`。
- [ ] Save/Debug validation follows the fixed staged order and never partially replaces Session/storage。
- [ ] exact/adopted compatibility and 16-entry lineage boundary work；presentation/app metadata stay warnings。
- [ ] E2E blocked branch、resolved flow、terminal and modified states round-trip without repeated command/RNG/effect。
- [ ] 201 mixed CommandLog entries retain actual parsed Game/Debug commands plus the one Session-finalized attempt，replay exactly and never apply recorded Facts。
- [ ] DebugBundle includes capability state、RunIntegrity、two Snapshot digests、bounded failures and scrubbed paths。
- [ ] Throwing subscribers are isolated，recorded through the bounded failure hook，and never alter dispatch results/Snapshot/FIFO usability。
- [ ] HMR digest change invalidates、disposes/fences the old lease owner and reboots the same Story application root；replacement writes only after a fresh-token takeover；capability/UI-only changes do not touch ownership。
- [ ] ten reviewed fixture payloads plus one manifest preserve bytes/classification/integrity/provenance；crash injection proves directory generation recovers without a partial mix，and only explicit regeneration writes them。
- [ ] pnpm verify:persistence-diagnostics and pnpm verify pass twice without tracked mutations。
