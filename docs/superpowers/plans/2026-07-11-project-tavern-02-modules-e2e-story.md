# Project Tavern Phase 2 Runtime Alignment and Minimal E2E Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase 1 的可验证基线上完成破坏式运行时 ABI、ResolvedGame、Story 布局和单 Artifact 迁移，并以 Story-local 的最小 E2E Gameplay 与 SemanticGamePort 证明新架构可确定运行。

**Architecture:** Phase 2A 只迁移并加强 Base、Story、GameSession 和 Web 构建边界，不实现七日酒馆玩法。Phase 2B 在 stories/e2e 内定义三个有状态 fixture owners、一个无状态 Resolver capability、唯一 GameCommandExecutor、GameQueries、SceneGraph 和 SemanticGamePort；stories/poc 只保留空的可构建包骨架，所有酒馆语义延后到 Phase 4。

**Tech Stack:** TypeScript 7.0.2、React 19.2.7、Vite 8.1.4、Vitest 4.1.10、Playwright 1.61.1、Zod 4.4.3、fast-check 4.9.0、Node.js >=22.12.0、pnpm >=11.0.0。

## Global Constraints

- 本计划以 docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md 为 Phase 2+ 最高优先级架构输入；冲突时不得延续旧 Phase 1 术语。
- `docs/superpowers/specs/2026-07-12-scene-interaction-character-presentation-design.md` 是中性 StageScene、HitMap、Interaction、内容成熟度和 atomic SemanticPublication 的权威输入；Phase 2 只交付 Base contracts/E2E catalog，不实现完整 renderer 或 PoC 语义。
- Phase 1 基线提交为 4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2；开始前必须确认 main、HEAD 和工作树实际状态，不根据对话猜测。
- 不保留 GameProfile、CommandCoordinator、ResolvedStory、EngineSession、GameModule、DomainFact 或 StoryDevelopmentEntry 的兼容别名。
- GamePackageV1、StoryDefinitionV1、resolveGamePackageV1、ModuleId 和 StateSlotId 保留。
- workspace 最终只保留 packages/base、packages/ui、packages/assets、apps/web、stories/e2e 和 stories/poc；删除 packages/modules、stories/sandbox 和 stories/demo。
- E2E Gameplay 必须完全位于 stories/e2e；不得导入 PoC 状态、命令、ID、规则、素材或私有 helper。
- stories/poc 在本阶段不得实现 AP、酒馆营业、关系、税负、设施、WorldAction 或 D1–D7 内容。
- 每个 Story/Host 只有一个应用入口和一个 Artifact；不存在 Player、Developer 或 Headless build flavor。
- Phase 2 不实现持久化服务、RuntimeCapabilities、DebugTools、RunIntegrity、Automation Bridge 或 InputRouter；这些合同按实施顺序分别由 Phase 3 和 Phase 5完成。
- E2E 的 SemanticGamePort 是正常玩法权限；它不得暴露 Snapshot、owner capability、隐藏条件、fixture loader 或 DebugCommand。
- 随机只使用项目事务 RNG；Gameplay、Story define、materializer、Queries 和 Semantic preview 不得读取真实时间、网络、DOM、浏览器存储或 Math.random。
- 每个任务严格 TDD：先加入一个能证明缺口的聚焦失败，再实现最小闭集，随后运行聚焦验证、当前完整 pnpm verify、git diff --check 和暂存范围检查。
- 每个任务单独提交；提交前只能暂存 Files 段列出的文件和因精确 rename 产生的对应路径。
- pnpm verify、fixture verifier 和 golden verifier必须只读；只有明确的 regenerate/update 命令可以改 tracked baseline。

---

## File Map

```text
packages/base/src/contracts/
  gameplay-module.ts             # renamed and strengthened Module/GameSimulation contracts
  game-package.ts                # StoryDefinition and createGameSimulation source facet
  presentation.ts                # StageScene/rig/hitmap/content-policy descriptors
  application.ts                 # atomic SemanticPublication/SemanticGamePort contract
packages/base/src/authoring/
  define-gameplay-module.ts
  define-game-simulation.ts
  story-resolver.ts              # returns typed ResolvedGame including SceneGraph
packages/base/src/runtime/session/
  game-session.ts                # renamed single authoritative FIFO
packages/base/src/testkit/        # neutral synthetic contracts only

stories/e2e/src/
  gameplay/contracts/
  gameplay/modules/
  gameplay/rules/
  gameplay/resolvers/
  gameplay/game-command-executor.ts
  gameplay/game-queries.ts
  gameplay/game-view-projector.ts
  gameplay/game-simulation.ts
  presentation/
  application/
  tooling/
  runtime/
  story-definition.ts
  story-entry.ts

stories/poc/src/index.ts          # empty Phase 2 Story package boundary
apps/web/src/application/        # one generic Web application root
scripts/                         # updated story/build/fixture/artifact gates
```

## Phase 2A — Runtime and Workspace Alignment

### Task 1: Replace the Base Module/Profile ABI with GameplayModule and GameSimulation

**Files:**

- Rename: packages/base/src/contracts/module.ts → packages/base/src/contracts/gameplay-module.ts
- Rename: packages/base/src/authoring/define-game-module.ts → packages/base/src/authoring/define-gameplay-module.ts
- Rename: packages/base/src/authoring/define-game-profile.ts → packages/base/src/authoring/define-game-simulation.ts
- Rename: packages/base/src/authoring/profile-validation.test.ts → packages/base/src/authoring/game-simulation-validation.test.ts
- Modify: packages/base/src/authoring/asset-resolver.ts
- Modify: packages/base/src/authoring/build-identity.ts
- Modify: packages/base/src/authoring/define-game-package.ts
- Modify: packages/base/src/authoring/define-story-development-entry.ts
- Modify: packages/base/src/authoring/hotfix-resolver.ts
- Modify: packages/base/src/authoring/patch-surface.ts
- Modify: packages/base/src/authoring/story-resolver.ts
- Modify: packages/base/src/contracts/game-package.ts
- Modify: packages/base/src/contracts/hotfix.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/authoring/index.ts
- Modify: packages/base/src/index.ts
- Modify: packages/base/src/runtime/session/engine-session.ts
- Modify: packages/base/src/runtime/session/engine-session.test.ts
- Modify: packages/base/src/testkit/synthetic-counter.ts
- Modify: packages/base/src/testkit/synthetic-counter.test.ts
- Modify: packages/base/src/testkit/story-contracts.ts
- Modify: packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: packages/base/type-tests/public-exports.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Modify: stories/sandbox/src/contracts.ts
- Modify: stories/sandbox/src/profile.ts
- Modify: stories/sandbox/src/session.ts
- Modify: apps/web/src/loader/loader.tsx
- Modify: apps/web/src/loader/loader.test.tsx
- Modify: stories/sandbox/scripts/regenerate-fixtures.mts
- Modify: stories/sandbox/scripts/update-golden.mts
- Modify: stories/sandbox/scripts/verify-balance.mts
- Modify: stories/sandbox/scripts/verify-fixtures.mts
- Modify: stories/sandbox/scripts/verify-golden.mts
- Modify: stories/sandbox/src/application/create-sandbox-application.ts
- Modify: stories/sandbox/src/application/create-sandbox-application.test.ts
- Modify: stories/sandbox/src/application/player-entry.tsx
- Modify: stories/sandbox/src/property.test.ts
- Modify: stories/sandbox/src/story-contract.test.ts
- Modify: stories/sandbox/src/story-entry.ts
- Modify: stories/sandbox/src/walking-skeleton.test.ts
- Test: packages/base/src/authoring/game-simulation-validation.test.ts
- Test: packages/base/type-tests/phase1-consumer.test-d.ts

**Interfaces:**

- Consumes: Phase 1 Module ID、State Slot、owner proposal/apply、依赖 DAG、RuntimeSchema 和 GameSnapshot envelope。
- Produces: GameplayModuleDescriptorV1、StatefulGameplayModuleBindingV1、StatelessGameplayModuleBindingV1、GameplayModuleBindingV1、GameSimulationTypeMapV1、GameSimulationTypeWitnessV1、GameCommandExecutorV1、GameDebugCommandValidationResultV1、GameDebugCommandExecutorV1、GameSimulationV1、defineGameplayModule 和 defineGameSimulation。

- [ ] **Step 1: Write the failing public ABI and orthogonality tests**

在 game-simulation-validation.test.ts 中定义两个 stateful bindings 和一个 stateless binding，加入以下断言：

```ts
it("keeps command execution separate from queries", () => {
  const simulation = defineSyntheticSimulation();

  expect(simulation.commandExecutor).toHaveProperty("executeAttempt");
  expect(simulation.commandExecutor).not.toHaveProperty("createQueries");
  expect(simulation.debugCommandExecutor).toHaveProperty("executeAttempt");
  expect(simulation.debugCommandExecutor).toHaveProperty("validate");
  expect(simulation.debugCommandExecutor).not.toHaveProperty("createQueries");
  const queries = simulation.createQueries(syntheticSnapshot().state);
  expect(queries).toEqual({
    count: 0,
    parity: "even",
  });
  expect(simulation.projectGameView(queries)).toEqual({ countLabel: "0" });
});

it("rejects duplicate slots, missing dependencies, and dependency cycles", () => {
  expect(() => defineSimulationWithDuplicateSlot()).toThrow("duplicate State slot");
  expect(() => defineSimulationWithMissingDependency()).toThrow("missing dependency");
  expect(() => defineSimulationWithCycle()).toThrow("dependency cycle");
});

it("allows stateless capabilities but no state or owner surface", () => {
  const resolver = defineSyntheticResolverModule();
  expect(resolver.bindingKind).toBe("stateless");
  expect(resolver.capabilities).toHaveProperty("resolveParity");
  expect(resolver).not.toHaveProperty("services");
  expect(resolver).not.toHaveProperty("stateSchema");
});
```

在 phase1-consumer.test-d.ts 中只从公开入口导入新名称，并加入 consumed negative assertions：

```ts
import type {
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameplayModuleBindingV1,
  GameCommandExecutorV1,
  GameDebugCommandValidationResultV1,
  GameDebugCommandExecutorV1,
} from "@project-tavern/base";
import { defineGameSimulation, defineGameplayModule } from "@project-tavern/base";

// @ts-expect-error removed after Phase 1
export type OldProfile = import("@project-tavern/base").GameProfileV1;
// @ts-expect-error removed after Phase 1
export { defineGameProfile } from "@project-tavern/base";
```

- [ ] **Step 2: Run the focused tests and prove the old ABI is still present**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/authoring/game-simulation-validation.test.ts
pnpm typecheck
```

Expected: FAIL because the renamed files and exports do not exist, while the negative assertions report that old symbols are still exported.

- [ ] **Step 3: Implement the exact new contracts**

gameplay-module.ts 必须定义下列职责分离：

```ts
export interface GameSimulationTypeMapV1<
  TBootstrapInput extends GameBootstrapInputV1 = GameBootstrapInputV1,
  TState = unknown,
  TRngState = unknown,
> {
  readonly bootstrapInput: TBootstrapInput;
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: unknown;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly fact: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly debugValidationError: unknown;
  readonly executionContext: unknown;
  readonly queries: unknown;
  readonly viewModel: unknown;
}

export interface GameCommandExecutorV1<TSnapshot, TCommand, TContext, TAttempt> {
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TCommand>,
    context: TContext,
  ): TAttempt;
}

export type GameDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "validation_failed";
      readonly errors: readonly TValidationError[];
    };

export interface GameDebugCommandExecutorV1<
  TSnapshot,
  TDebugCommand,
  TContext,
  TValidationError,
  TAttempt,
> {
  validate(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): GameDebugCommandValidationResultV1<TValidationError>;
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): TAttempt;
}

export interface GameSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly GameplayModuleBindingV1[],
  TExecutor extends GameCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["command"],
    TTypes["executionContext"],
    unknown
  >,
  TDebugExecutor extends GameDebugCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["debugCommand"],
    TTypes["executionContext"],
    TTypes["debugValidationError"],
    unknown
  >,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly contractRevision: 1;
  readonly modules: TModules;
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly factSchema: RuntimeSchemaV1<TTypes["fact"]>;
  readonly rejectionSchema: RuntimeSchemaV1<TTypes["rejection"]>;
  readonly debugCommandSchema: RuntimeSchemaV1<TTypes["debugCommand"]>;
  readonly debugValidationErrorSchema: RuntimeSchemaV1<TTypes["debugValidationError"]>;
  readonly commandExecutor: TExecutor;
  readonly debugCommandExecutor: TDebugExecutor;
  createBootstrapInput(entropy: BootstrapEntropyV1): TTypes["bootstrapInput"];
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TTypes["state"];
  createQueries(state: DeepReadonly<TTypes["state"]>): TTypes["queries"];
  projectGameView(queries: TTypes["queries"]): TTypes["viewModel"];
}
```

Stateless binding 的唯一函数集合字段命名为 capabilities。具体成员必须使用 resolve、evaluate、compile、project 或 validate 等职责动词，不能重新引入 services 容器。

Authoring helper 固定为两段式调用，让 Story 在第一段锁定唯一 type witness，第二段再提供实现：

```ts
defineGameplayModule<TTypes>()(binding);
defineGameSimulation<TTypes>()(simulation);
```

type test 必须覆盖这两个公开调用形状，不接受同名单段 overload 或 Story-owned cast。

defineGameSimulation 保留并加强 Phase 1 的 ID、slot 和 DAG 校验，同时验证：

- stateful binding 至少拥有一个 slot；
- stateless binding 的 stateSlots 为空且没有 owner/state surface；
- 每个 dependency 在相同 simulation 中存在；
- modules、commandExecutor、debugCommandExecutor、debug validation Schema、createQueries 和 projector 由同一 type witness 约束；
- 传入对象在验证后深冻结。

本任务必须同时机械迁移当前所有 compile/test/runtime consumers，包括 Base testkit/authoring tests、Web loader 与 Sandbox application/session/scripts/tests。这一 checkpoint 可以暂时保留 Phase 1 `ResolvedStoryV1` 组合形状，但其内部必须已改用 GameSimulation/new module names；Task 2 再原子替换为 ResolvedGame/StoryTooling。不得把任何 Profile/Module 旧别名留给 Task 2 收拾。

- [ ] **Step 4: Update barrels and the reviewed public inventory**

packages/base/public-exports.v1.json 必须删除全部旧名称，添加新名称并保持每个 entrypoint 字母序。同步更新 Base testkit synthetic counter；不得在 root 中导出任何 E2E 类型。

Run:

```bash
pnpm verify:public-exports
pnpm --filter @project-tavern/base exec vitest run src/authoring
! rg -n "GameProfile|defineGameProfile|GameModule|defineGameModule|createProfile|CommandCoordinator|DomainFact" packages/base/src apps/web stories/sandbox
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；public inventory 没有旧 ABI；synthetic counter 只使用新泛型；工作树没有生成文件变化。

- [ ] **Step 5: Commit the ABI migration**

```bash
git add -- packages/base/src/contracts packages/base/src/authoring packages/base/src/index.ts packages/base/src/runtime/session/engine-session.ts packages/base/src/runtime/session/engine-session.test.ts packages/base/src/testkit/synthetic-counter.ts packages/base/src/testkit/synthetic-counter.test.ts packages/base/src/testkit/story-contracts.ts packages/base/type-tests/phase1-consumer.test-d.ts packages/base/type-tests/public-exports.test-d.ts packages/base/public-exports.v1.json apps/web/src/loader/loader.tsx apps/web/src/loader/loader.test.tsx stories/sandbox/scripts stories/sandbox/src/application/create-sandbox-application.ts stories/sandbox/src/application/create-sandbox-application.test.ts stories/sandbox/src/application/player-entry.tsx stories/sandbox/src/contracts.ts stories/sandbox/src/profile.ts stories/sandbox/src/session.ts stories/sandbox/src/property.test.ts stories/sandbox/src/story-contract.test.ts stories/sandbox/src/story-entry.ts stories/sandbox/src/walking-skeleton.test.ts
git diff --cached --check
git commit -m "refactor(base): replace profile with game simulation"
```

### Task 2: Resolve a typed ResolvedGame and retain the frozen SceneGraph

**Files:**

- Create: packages/base/src/contracts/presentation.ts
- Create: packages/base/src/contracts/presentation.test.ts
- Modify: packages/base/src/contracts/game-package.ts
- Modify: packages/base/src/contracts/hotfix.ts
- Modify: packages/base/src/authoring/define-game-package.ts
- Rename: packages/base/src/authoring/define-story-development-entry.ts → packages/base/src/authoring/define-story-tooling-entry.ts
- Rename: packages/base/src/authoring/define-story-development-entry.test.ts → packages/base/src/authoring/define-story-tooling-entry.test.ts
- Modify: packages/base/src/authoring/story-resolver.ts
- Modify: packages/base/src/authoring/story-resolver.test.ts
- Modify: packages/base/src/authoring/index.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/index.ts
- Modify: packages/base/src/testkit/story-contracts.ts
- Modify: packages/base/src/testkit/story-contracts.test.ts
- Modify: packages/base/src/testkit/contract-suite.ts
- Modify: packages/base/src/testkit/index.ts
- Modify: packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: packages/base/type-tests/public-exports.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Modify: apps/web/src/loader/loader.tsx
- Modify: apps/web/src/loader/loader.test.tsx
- Modify: stories/sandbox/scripts/regenerate-fixtures.mts
- Modify: stories/sandbox/scripts/update-golden.mts
- Modify: stories/sandbox/scripts/verify-balance.mts
- Modify: stories/sandbox/scripts/verify-fixtures.mts
- Modify: stories/sandbox/scripts/verify-golden.mts
- Modify: stories/sandbox/src/application/create-sandbox-application.test.ts
- Modify: stories/sandbox/src/application/create-sandbox-application.ts
- Modify: stories/sandbox/src/application/player-entry.tsx
- Modify: stories/sandbox/src/development.ts
- Modify: stories/sandbox/src/property.test.ts
- Modify: stories/sandbox/src/story-contract.test.ts
- Modify: stories/sandbox/src/story-entry.ts
- Modify: stories/sandbox/src/walking-skeleton.test.ts
- Test: packages/base/src/authoring/story-resolver.test.ts
- Test: packages/base/src/authoring/define-story-tooling-entry.test.ts

**Interfaces:**

- Consumes: GamePackageV1、StoryDefinitionV1、PatchSurface、BuildProvenance、Asset resolver 和 Task 1 GameSimulation。
- Produces: StoryToolingEntryV1、StoryToolingSupportV1、ResolvedGameV1、StorySimulationFacetV1.createGameSimulation、类型保持的 resolveGamePackageV1，以及不含任何 Story/React 语义的 StageScene、Character、HitMap、Interaction 和内容成熟度 Base contracts。

- [ ] **Step 1: Write failing SceneGraph retention and type inference tests**

```ts
it("returns one deeply frozen complete ResolvedGame", () => {
  const entry = createSyntheticCounterGamePackageV1();
  const result = resolveGamePackageV1(entry, [], deterministicBuildIdentityInputV1);

  expect(result.kind).toBe("resolved");
  if (result.kind !== "resolved") return;
  expect(result.resolved).toMatchObject({
    gameSimulation: expect.any(Object),
    simulationProgram: expect.any(Object),
    presentation: expect.any(Object),
    sceneGraph: { stageScenes: [{ stageSceneId: "stage_scene.synthetic.counter" }] },
    assets: expect.any(Object),
    frozen: true,
  });
  expect(Object.isFrozen(result.resolved.sceneGraph)).toBe(true);
});

it("calls each materializer and the simulation factory once", () => {
  const fixture = createCountingGamePackage();
  resolveGamePackageV1(fixture.entry, [], deterministicBuildIdentityInputV1);
  expect(fixture.calls()).toEqual({
    define: 2,
    simulationMaterializer: 1,
    presentationMaterializer: 1,
    createGameSimulation: 1,
  });
});

it("keeps executable providers out of canonical JSON while checking stable identity", () => {
  const result = resolveGamePackageV1(
    createPackageWithNamedRuleAndResolver(),
    [],
    deterministicBuildIdentityInputV1,
  );
  expect(result.kind).toBe("resolved");
  expect(namedRuleCalls()).toBe(0);
  expect(namedResolverCalls()).toBe(0);
});

it("accepts one strictly validated neutral presentation catalog", () => {
  const parsed = stageSceneGraphSchemaV1.parse(createSyntheticStageSceneGraphV1());
  expect(parsed.stageScenes.map((entry) => entry.stageSceneId)).toEqual([
    "stage_scene.synthetic.counter",
  ]);
  expect(parsed.hitMaps[0]?.targets.map((entry) => entry.shape.kind)).toEqual([
    "rect",
    "circle",
    "polygon",
  ]);
});

it("allows one semantic target to have context-specific bindings in two surfaces", () => {
  const parsed = parseStageSceneGraphV1(createCatalogWithContextualTargetReuseV1());
  expect(
    parsed.interactionSurfaces.map(({ surfaceId, targetBindings }) => ({
      surfaceId,
      targetBindings,
    })),
  ).toEqual([
    expect.objectContaining({
      surfaceId: "surface.synthetic.stage",
      targetBindings: [
        expect.objectContaining({
          targetId: "target.synthetic.figure",
          openSurfaceId: "surface.synthetic.character",
        }),
      ],
    }),
    expect.objectContaining({
      surfaceId: "surface.synthetic.character",
      targetBindings: [
        expect.objectContaining({
          targetId: "target.synthetic.figure",
          openSurfaceId: null,
        }),
      ],
    }),
  ]);
});

it.each([
  [createSceneGraphWithDuplicateIdV1(), "presentation.catalog.duplicate_id"],
  [createSceneGraphWithInvalidShapeV1(), "presentation.catalog.invalid_shape"],
  [createSceneGraphWithMissingStaticReferenceV1(), "presentation.catalog.missing_reference"],
  [createSceneGraphWithCyclicSurfaceGraphV1(), "presentation.catalog.surface_cycle"],
] as const)("rejects an invalid static presentation catalog with %s", (input, code) => {
  expect(() => parseStageSceneGraphV1(input)).toThrowError(expect.objectContaining({ code }));
});

it("rejects invalid content maturity policies", () => {
  expect(() => parseContentMaturityPolicyV1(createPolicyWithNegativeOrdinalV1())).toThrow(
    /content_maturity\.ordinal/u,
  );
  expect(() => parseContentMaturityPolicyV1(createPolicyWithDuplicateOrdinalV1())).toThrow(
    /content_maturity\.duplicate/u,
  );
  expect(() => parseContentMaturityPolicyV1(createPolicyWithUnknownDefaultV1())).toThrow(
    /content_maturity\.default/u,
  );
});
```

增加 type test，证明 resolver 返回值能够从具体 GamePackage 推断 gameSimulation、program、presentation 和 sceneGraph，而不需要 `specializeSandboxResolvedStoryV1` 这类 Story-owned 类型断言。该 type test 还必须从 public root 导入全部新增品牌 ID、descriptor、schema/parser 和 content-policy helper，证明 Base API 不要求 Story 导入内部文件。再加两组 determinism case：模块级 named Rule/Resolver 在两次 define 中保持同一引用时通过；重新创建的函数引用、冲突的 provider ID 或不同 source digest 必须返回稳定 determinism failure。SceneGraph 本身只是 Strict JSON data，不参与 executable-reference 比较。

- [ ] **Step 2: Run focused tests and confirm the Phase 1 composition gap**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/authoring/story-resolver.test.ts src/authoring/define-story-tooling-entry.test.ts
pnpm --filter @project-tavern/base exec vitest run src/contracts/presentation.test.ts
pnpm typecheck
```

Expected: FAIL because ResolvedStoryV1 still drops uiSceneGraph, createProfile remains on the source facet, StoryTooling names do not exist, and the neutral presentation contracts are absent。

- [ ] **Step 3: Implement the complete ResolvedGame lifecycle**

game-package.ts 必须使用：

```ts
export interface StorySimulationFacetV1<
  TGameSimulation,
  TData,
  TRules,
  TNarrativeProgram,
  TPatchSurface,
  TSimulationProgram,
> {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly data: TData;
  readonly rules: TRules;
  readonly narrativeProgram: TNarrativeProgram;
  readonly patchSurface: TPatchSurface;
  materializeProgram(
    values: DeepReadonly<ResolvedPatchValuesV1<TPatchSurface>>,
  ): TSimulationProgram;
  createGameSimulation(program: DeepReadonly<TSimulationProgram>): TGameSimulation;
}

export interface ResolvedGameV1<
  TGameSimulation,
  TSimulationProgram,
  TPresentation,
  TSceneGraph,
  TAssets,
> {
  readonly provenance: BuildProvenanceV1;
  readonly gameSimulation: TGameSimulation;
  readonly simulationProgram: TSimulationProgram;
  readonly presentation: TPresentation;
  readonly sceneGraph: TSceneGraph;
  readonly assets: TAssets;
  readonly frozen: true;
}
```

Resolver 顺序必须保持 define 两次确定性检查 → fresh patch registries → Hotfix → revoke → 两个 materializer 各一次 → validate/deep-freeze Programs → createGameSimulation 一次 → resolve assets/identities → freeze ResolvedGame。failure code story.profile_invalid 改为 story.simulation_invalid。

define-twice 比较必须区分 data 与 executable provider：canonical JSON 只处理可序列化 data 和经 schema 验证的 provider descriptor，不得对函数 stringify。Rule/Resolver/lifecycle 等受控可执行值必须是具有 stable symbol ID 和 build source/import-closure digest 的 module-level named reference，两次 define 以 allowed descriptor keys、引用恒等与 digest 三重检查；最终 ResolvedGame 保留这些 Gameplay executable 并深冻结容器，不把函数替换为 JSON 占位符。ResolvedGame 只持有 data-only SceneGraph；Web renderer registry 不属于 default Story resolver/import closure。

SceneGraph 只能取自第一次已验证 source definition 的 presentation facet，并随 ResolvedGame 深冻结；Application 不允许再次调用 Story define 或自行创建第二份 registry。

同一 checkpoint 在 `contracts/presentation.ts` 冻结以下中性 ABI；全部 ID 使用现有 `Brand<string, ...>` 风格 parser，所有坐标必须是有限的 `[0, 1]` 数值，所有 descriptor 都是 Strict JSON 且不允许函数、JSX、DOM、Story Command、Narrative ID 或任意 callback：

```ts
export type StageSceneId = Brand<string, "StageSceneId">;
export type StageSceneVariantId = Brand<string, "StageSceneVariantId">;
export type CharacterId = Brand<string, "CharacterId">;
export type CharacterRigId = Brand<string, "CharacterRigId">;
export type CharacterPoseId = Brand<string, "CharacterPoseId">;
export type CharacterExpressionId = Brand<string, "CharacterExpressionId">;
export type CharacterActivityId = Brand<string, "CharacterActivityId">;
export type AppearanceLayerId = Brand<string, "AppearanceLayerId">;
export type HitMapId = Brand<string, "HitMapId">;
export type HitAreaId = Brand<string, "HitAreaId">;
export type InteractionSurfaceId = Brand<string, "InteractionSurfaceId">;
export type InteractionTargetId = Brand<string, "InteractionTargetId">;
export type InteractionBehaviorId = Brand<string, "InteractionBehaviorId">;
export type PresentationProviderId = Brand<string, "PresentationProviderId">;
export type ContentMaturityLevelId = Brand<string, "ContentMaturityLevelId">;
export type ContentMaturityLevelV1 = Brand<NonNegativeSafeInteger, "ContentMaturityLevelV1">;
export type NormalizedCoordinateV1 = Brand<number, "NormalizedCoordinateV1">;
export type NormalizedExtentV1 = Brand<number, "NormalizedExtentV1">;
export type PositiveFiniteNumber = Brand<number, "PositiveFiniteNumber">;
export type InteractionEntryModeV1 = "surface_activation" | "always_active" | "explicit_control";
export type InteractionResolutionModeV1 = "direct" | "choose" | "open_surface";

export type PresentationCatalogValidationCodeV1 =
  | "presentation.catalog.duplicate_id"
  | "presentation.catalog.invalid_shape"
  | "presentation.catalog.missing_reference"
  | "presentation.catalog.surface_cycle";

export interface PresentationCatalogValidationErrorV1 extends Error {
  readonly code: PresentationCatalogValidationCodeV1;
  readonly details: StrictJsonObjectV1;
}

export interface InteractionActivationV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly targetId: InteractionTargetId;
  readonly activationKind: "pointer" | "semantic_control";
}

export interface NormalizedPointV1 {
  readonly x: NormalizedCoordinateV1;
  readonly y: NormalizedCoordinateV1;
}

export type NormalizedShapeV1 =
  | {
      readonly kind: "rect";
      readonly x: NormalizedCoordinateV1;
      readonly y: NormalizedCoordinateV1;
      readonly width: NormalizedExtentV1;
      readonly height: NormalizedExtentV1;
    }
  | {
      readonly kind: "circle";
      readonly centerX: NormalizedCoordinateV1;
      readonly centerY: NormalizedCoordinateV1;
      readonly radius: NormalizedExtentV1;
    }
  | { readonly kind: "polygon"; readonly points: readonly NormalizedPointV1[] };

export interface HitAreaDescriptorV1 {
  readonly areaId: HitAreaId;
  readonly targetId: InteractionTargetId;
  readonly shape: NormalizedShapeV1;
  readonly priority: NonNegativeSafeInteger;
}

export interface HitMapDescriptorV1 {
  readonly hitMapId: HitMapId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly targets: readonly HitAreaDescriptorV1[];
}

export interface CharacterDescriptorV1 {
  readonly characterId: CharacterId;
  readonly accessibleNameTextId: TextId;
  readonly defaultRigId: CharacterRigId;
}

export interface CharacterRigDescriptorV1 {
  readonly rigId: CharacterRigId;
  readonly rendererId: string;
  readonly poseIds: readonly CharacterPoseId[];
  readonly expressionIds: readonly CharacterExpressionId[];
  readonly activityIds: readonly CharacterActivityId[];
  readonly appearanceLayerOrder: readonly AppearanceLayerId[];
  readonly defaultHitMapId: HitMapId | null;
  readonly poseHitMapOverrides: readonly {
    readonly poseId: CharacterPoseId;
    readonly hitMapId: HitMapId;
  }[];
  readonly staticFallbackAssetId: AssetId | null;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}

export interface CharacterPlacementV1 {
  readonly characterId: CharacterId;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
}

export interface InteractionSurfacePlacementV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly anchor: NormalizedPointV1;
}

export interface StageSceneDescriptorV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantIds: readonly StageSceneVariantId[];
  readonly defaultVariantId: StageSceneVariantId;
}

export interface StageScenePresentationV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly accessibleNameTextId: TextId;
  readonly backgroundAssetId: AssetId;
  readonly layout: StrictJsonObjectV1;
  readonly actors: readonly CharacterPlacementV1[];
  readonly interactionSurfaces: readonly InteractionSurfacePlacementV1[];
  readonly content: ContentRequirementV1;
}

export interface InteractionSurfaceDescriptorV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly accessibleNameTextId: TextId;
  readonly allowedEntryModes: readonly InteractionEntryModeV1[];
  readonly targetBindings: readonly InteractionSurfaceTargetBindingV1[];
}

export interface InteractionSurfaceTargetBindingV1 {
  readonly targetId: InteractionTargetId;
  readonly allowedResolutionModes: readonly InteractionResolutionModeV1[];
  readonly openSurfaceId: InteractionSurfaceId | null;
}

export interface InteractionTargetDescriptorV1 {
  readonly targetId: InteractionTargetId;
  readonly accessibleNameTextId: TextId;
  readonly behaviorIds: readonly InteractionBehaviorId[];
}

export interface InteractionBehaviorDescriptorV1 {
  readonly behaviorId: InteractionBehaviorId;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId | null;
  readonly providerId: PresentationProviderId;
  readonly content: ContentRequirementV1;
}

export interface StageSceneGraphV1 {
  readonly stageScenes: readonly StageSceneDescriptorV1[];
  readonly variants: readonly StageScenePresentationV1[];
  readonly characters: readonly CharacterDescriptorV1[];
  readonly characterRigs: readonly CharacterRigDescriptorV1[];
  readonly hitMaps: readonly HitMapDescriptorV1[];
  readonly interactionSurfaces: readonly InteractionSurfaceDescriptorV1[];
  readonly interactionTargets: readonly InteractionTargetDescriptorV1[];
  readonly interactionBehaviors: readonly InteractionBehaviorDescriptorV1[];
  readonly contentMaturityPolicy: ContentMaturityPolicyV1;
}

export interface ContentMaturityLevelDescriptorV1 {
  readonly id: ContentMaturityLevelId;
  readonly ordinal: ContentMaturityLevelV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

export interface ContentMaturityPolicyV1 {
  readonly levels: readonly ContentMaturityLevelDescriptorV1[];
  readonly defaultMaximumLevel: ContentMaturityLevelV1;
}

export interface ContentRequirementV1 {
  readonly requiredLevel: ContentMaturityLevelV1;
}

export interface ContentPreferenceV1 {
  readonly maximumLevel: ContentMaturityLevelV1;
}

export type ContentPreferenceSetResultV1 =
  | { readonly kind: "updated"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | {
      readonly kind: "rejected";
      readonly code: "content_maturity.unregistered_level";
    }
  | {
      readonly kind: "failed";
      readonly code: "content_preference.storage_failed";
    };

export interface ContentPreferencePortV1 {
  observe(): DeepReadonly<ContentPreferenceV1>;
  subscribe(listener: () => void): () => void;
  set(preference: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1>;
}
```

`InteractionSurfaceDescriptorV1` 只登记稳定 surface ID、进入方式和 context-specific `targetBindings`；`InteractionSurfaceTargetBindingV1` 才拥有该 surface 内允许的解析模式与静态 `open_surface` 边。`InteractionTargetDescriptorV1` 只登记可跨 surface 复用的稳定 target 语义、显示文本和候选 behavior；同一个 target 因而可以在外层 Stage surface 打开角色 surface，又在角色 surface 内 direct/choose，而不会制造全局自环。`InteractionBehaviorDescriptorV1` 只登记稳定 behavior ID、显示 TextId、内容 requirement 和 provider symbol ID，不能携带 invocation 或函数。

启动期 parser/resolver validation 必须抛出 `PresentationCatalogValidationErrorV1`，并以稳定 code `presentation.catalog.duplicate_id`、`presentation.catalog.invalid_shape`、`presentation.catalog.missing_reference` 或 `presentation.catalog.surface_cycle` 拒绝：任意 descriptor 全局稳定 ID 重复、同一 surface 内重复 `(surfaceId,targetId)` binding、空 renderer/provider ID、variant/character/rig/pose/hitmap/surface/target/behavior/Text/Asset 静态引用缺失、非法 shape、少于三个点或退化的 polygon、重复 area、binding 模式与 `openSurfaceId` 不一致，以及由所有 binding 构成的完整 `open_surface` 图中的自环或环。跨两个 surface 复用同一 target descriptor 是合法且必须测试的。测试直接断言 `.code`，不得靠错误消息正则推断分类；`details` 只包含有界 Strict JSON 诊断。`direct`/`choose` 的动态行为数和 Semantic action join 不是静态 catalog 能证明的条件，留给 Phase 5B RuntimePresentation projector 校验。

`ContentMaturityPolicyV1` 是 Story 登记的稀疏有序集合，包含唯一 level ID/ordinal/显示 TextId 和唯一 `defaultMaximumLevel`；parser 拒绝负数、非安全整数、重复 ID、重复 ordinal、未知 requirement/default。Base 只提供比较器 `isContentRequirementAllowedV1(requiredLevel, maximumLevel)` 和上面的观察/设置端口合同，不内置 standard/suggestive 等项目名称，也不实现 Host storage。Host-backed factory 留给 Phase 5B；未登记 level 返回 `rejected` 且不写，Host/CAS 异常返回 `failed` 并保持操作前 snapshot，成功提交后才发布 `updated`。

- [ ] **Step 4: Rename tooling without creating a separate application**

StoryToolingEntryV1 仍是独立 package export，用于未来在同一 Artifact 内按 capability 延迟导入。它只定义 fixtures、notes 和 Story-specific adapters；本任务不得新增 Developer package subpath、HTML 或 build。

Run:

```bash
pnpm verify:public-exports
pnpm --filter @project-tavern/base exec vitest run src/authoring src/testkit
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；ResolvedGame 类型无需强制 cast；SceneGraph 被保留；旧 ResolvedStory、createProfile 和 StoryDevelopment 符号不再导出。

- [ ] **Step 5: Commit the resolved composition root**

```bash
git add -- packages/base/src/contracts/presentation.ts packages/base/src/contracts/presentation.test.ts packages/base/src/contracts/game-package.ts packages/base/src/contracts/hotfix.ts packages/base/src/contracts/index.ts packages/base/src/authoring packages/base/src/index.ts packages/base/src/testkit packages/base/type-tests/phase1-consumer.test-d.ts packages/base/type-tests/public-exports.test-d.ts packages/base/public-exports.v1.json apps/web/src/loader stories/sandbox
git diff --cached --check
git commit -m "refactor(base): resolve complete frozen games"
```

### Task 3: Rename EngineSession to GameSession and isolate observer failures

**Files:**

- Rename: packages/base/src/runtime/session/engine-session.ts → packages/base/src/runtime/session/game-session.ts
- Rename: packages/base/src/runtime/session/engine-session.test.ts → packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/session/index.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/src/testkit/synthetic-counter.ts
- Modify: packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Modify: stories/sandbox/src/application/create-sandbox-application.ts
- Modify: stories/sandbox/src/session.ts
- Test: packages/base/src/runtime/session/game-session.test.ts

**Interfaces:**

- Consumes: Phase 1 single FIFO、AuthoritativeOutcomeV1、CommandExecutionAttemptEnvelopeV1 和 Task 1 GameSimulation type map。
- Produces: GameSessionV1、GameSessionInputV1、GameSessionCompositionV1、GameSessionRuntimeControlV1 和 createGameSessionV1；FIFO/执行行为与 Phase 1 等价，并增加隔离的 observer-failure hook。

- [ ] **Step 1: Write failing rename and behavior-preservation tests**

在 type test 中只导入新 runtime public symbols，并增加旧名称 negative assertions。将现有 FIFO 测试重命名后保留全部案例，额外加入：

```ts
it("publishes busy in the enqueueing tick and executes once", async () => {
  const fixture = createAttemptCountingGameSession();
  const result = fixture.session.dispatch({ kind: "synthetic.increment" });

  expect(fixture.session.getStatus()).toBe("busy");
  await expect(result).resolves.toMatchObject({
    kind: "executed",
    execution: { kind: "committed" },
  });
  expect(fixture.executeAttemptCalls()).toBe(1);
});

it("serializes dispatch and authoritative replacement on one tail", async () => {
  const fixture = createOrderedGameSession();
  await expect(fixture.runDispatchThenAnchor()).resolves.toEqual(["dispatch", "anchor"]);
});

it("isolates a throwing subscriber and keeps the FIFO usable", async () => {
  const fixture = createGameSessionWithOneShotThrowingSubscriber();
  const first = await fixture.session.dispatch({ kind: "synthetic.increment" });
  expect(first).toMatchObject({
    kind: "executed",
    execution: { kind: "committed" },
  });
  expect(fixture.session.getCurrentSnapshot().state.count).toBe(1);
  expect(fixture.session.getStatus()).toBe("idle");
  expect(fixture.secondSubscriberCalls()).toBeGreaterThan(0);
  expect(fixture.observerFailures()).toHaveLength(1);
  await expect(fixture.session.dispatch({ kind: "synthetic.increment" })).resolves.toMatchObject({
    kind: "executed",
    execution: { kind: "committed" },
  });
  expect(fixture.session.getCurrentSnapshot().state.count).toBe(2);
  expect(fixture.session.getStatus()).toBe("idle");
  expect(fixture.observerFailures()).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused suite and confirm only the new API is missing**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/game-session.test.ts
pnpm typecheck
```

Expected: FAIL because the renamed file and exports do not exist；复制过来的 Phase 1 行为断言不得出现新的语义失败。

- [ ] **Step 3: Perform the naming migration and observer isolation hardening**

保持以下行为不变：

- 入队同 tick 发布 busy；
- dispatch admission 在 queue front 重新检查；
- 一个 admitted command 只调用一次 commandExecutor.executeAttempt；
- committed 替换 Snapshot，rejected/faulted 保留输入 Snapshot 引用；
- runtimeControl 是唯一 authoritative replacement seam；
- tail 内部异常经 total normalizer settle；
- HMR private invalidation seam 暂时保留，Phase 3 完成公开策略。

`subscribe` 的每个 listener 必须分别 `try/catch`：一个 listener 抛错不得阻止后续 listener、不得改写 dispatch result/Snapshot，也不得破坏 FIFO tail。`GameSessionInputV1` 接收一个可选 `onObserverFailure(error)` hook；hook 本身抛错也必须被隔离。Phase 2 测试只证明隔离和继续执行，Phase 3 Task 8 再将 hook 接入 RuntimeFailure buffer。

不得在本任务加入 RunIntegrity、Persistence、CommandLog 或 RuntimeCapabilities。

- [ ] **Step 4: Update runtime barrels and inventory**

Run:

```bash
pnpm verify:public-exports
pnpm --filter @project-tavern/base exec vitest run src/runtime/session/game-session.test.ts
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；runtime entrypoint 只包含 GameSession 名称；旧 engine-session 路径和导出均不存在。

- [ ] **Step 5: Commit the Session rename**

```bash
git add -- packages/base/src/runtime/session packages/base/src/runtime/index.ts packages/base/src/testkit/synthetic-counter.ts packages/base/type-tests/phase1-consumer.test-d.ts packages/base/public-exports.v1.json stories/sandbox/src/application/create-sandbox-application.ts stories/sandbox/src/session.ts
git diff --cached --check
git commit -m "refactor(base): rename engine session to game session"
```

### Task 4: Collapse the workspace to E2E and PoC Stories and remove the unproven shared Modules package

**Files:**

- Replace: stories/e2e/package.json
- Replace: stories/e2e/tsconfig.json
- Replace: stories/e2e/src/index.ts
- Rename into stories/e2e: every tracked file currently under stories/sandbox
- Rename: stories/demo/package.json → stories/poc/package.json
- Rename: stories/demo/tsconfig.json → stories/poc/tsconfig.json
- Rename: stories/demo/src/index.ts → stories/poc/src/index.ts
- Delete: packages/modules/package.json
- Delete: packages/modules/tsconfig.json
- Delete: packages/modules/src/index.ts
- Modify: pnpm-workspace.yaml
- Modify: tsconfig.json
- Modify: tsconfig.check.json
- Modify: scripts/workspace-policy.mjs
- Modify: scripts/collect-import-closure.mjs
- Modify: scripts/collect-import-closure.test.mjs
- Modify: scripts/typescript-runtime.test.mjs
- Modify: scripts/verify-boundaries.mjs
- Modify: scripts/verify-boundaries.test.mjs
- Modify: scripts/verify-cycles.mjs
- Modify: scripts/verify-stories.mjs
- Modify: scripts/verify-stories.test.mjs
- Modify: scripts/verify-fixtures.mjs
- Modify: scripts/verify-fixtures.test.mjs
- Modify: scripts/verify-golden.mjs
- Modify: scripts/verify-golden.test.mjs
- Modify: scripts/verify-assets.mjs
- Modify: scripts/verify-assets.test.mjs
- Modify: scripts/verify-bundle.mjs
- Modify: scripts/verify-bundle.test.mjs
- Modify: scripts/verify-release.mjs
- Modify: scripts/verify-release.test.mjs
- Modify: vite.config.ts
- Modify: apps/web/e2e/walking-skeleton.spec.ts
- Rename: `apps/web/e2e/__screenshots__/sandbox-shell.png` → `apps/web/e2e/__screenshots__/e2e-shell.png`
- Modify: package.json
- Modify: pnpm-lock.yaml
- Modify: LICENSE.md
- Modify: README.md
- Modify: AGENTS.md
- Test: scripts/verify-boundaries.test.mjs
- Test: scripts/verify-stories.test.mjs

**Interfaces:**

- Consumes: the migrated Phase 1 walking Story、workspace policy and all root verification delegates。
- Produces: exactly @project-tavern/story-e2e and @project-tavern/story-poc；E2E temporarily retains the counter behavior under new E2E names，PoC is a side-effect-free empty package boundary，and no package depends on @project-tavern/modules。

- [ ] **Step 1: Write failing workspace and story-matrix tests**

扩展 workspace policy test：

```js
test("contains only the approved Phase 2 packages", () => {
  assert.deepEqual(
    workspacePackages.map((entry) => entry.path),
    ["packages/base", "packages/ui", "packages/assets", "apps/web", "stories/e2e", "stories/poc"],
  );
});

test("keeps E2E independent from PoC and removed shared modules", () => {
  const e2e = workspacePackageByPath.get("stories/e2e");
  assert(!e2e.edges.includes("@project-tavern/story-poc"));
  assert(!e2e.edges.includes("@project-tavern/modules"));
  assert(!workspacePackageByPath.has("packages/modules"));
});
```

verify-stories.test.mjs 必须断言 read-only Story matrix 恰为 E2E 与 PoC，而且不再出现 sandbox/demo。

- [ ] **Step 2: Run the focused checks and confirm the current layout fails**

Run:

```bash
node --test scripts/verify-boundaries.test.mjs scripts/verify-stories.test.mjs
pnpm verify:boundaries
```

Expected: FAIL because workspace policy still列出 packages/modules、stories/sandbox 和 stories/demo。

- [ ] **Step 3: Move the existing walking Story without copying it**

执行时使用 git mv 保留历史，然后用 apply_patch 完成符号和内容改名。迁移集合必须覆盖：

```text
stories/sandbox/src/**
stories/sandbox/scripts/**
stories/sandbox/fixtures/**
stories/sandbox/golden/**
stories/sandbox/player.html
stories/sandbox/developer.html
stories/sandbox/tsconfig.application.json
stories/sandbox/package.json
stories/sandbox/tsconfig.json
```

移入 stories/e2e 后，在同一任务内更新全部 build/test/verifier consumers，使这个中间 checkpoint 仍可完整验证：

- package name 为 @project-tavern/story-e2e；
- Story ID 为 story.e2e；
- runtime symbols 使用 E2e 或 E2eCounter 前缀；
- fixture ID 为 fixture.e2e.session-zero；
- 文件名不再出现 sandbox；
- 删除旧空 stories/e2e stub；
- 当前 fixture/golden 保持只读直到 Task 12 显式重生成。

Vite 在本任务仍暂时保留 Player/Developer 两个 mode，但两者都必须指向新的 E2E paths；Task 5 才原子删除 flavor split。同步更新 import-closure、TypeScript runtime、asset/bundle/release/story/fixture/golden verifiers、browser spec 和 reviewed screenshot，使任何脚本都不再访问已移动的 Sandbox package。这个兼容 checkpoint 只服务安全迁移，不新增 public alias 或新玩法。

将空 stories/demo 原样迁移为 stories/poc，package name 改为 @project-tavern/story-poc，默认 export 暂时仍为空。

- [ ] **Step 4: Remove packages/modules and update every exact workspace consumer**

删除 packages/modules 三个 tracked files；从 E2E/PoC manifests、workspace policy、project references、license path prose 和 root scripts 中删除该包。packages/assets 保留。

root verifier 应通过显式、排序的 Story matrix 依次运行 E2E 与 PoC 的现有 test script；空 PoC test script 可以运行 Vitest 并允许 no test files only when package script explicitly uses passWithNoTests，Phase 4 添加首个测试后移除该标志。

- [ ] **Step 5: Scan stale paths and run complete verification**

Run:

```bash
test "$(find stories -mindepth 1 -maxdepth 1 -type d -print | sort)" = "$(printf '%s\n' stories/e2e stories/poc)"
test ! -e packages/modules
! rg -n "stories/(sandbox|demo)|story-sandbox|story-demo|@project-tavern/modules|story\.sandbox|Sandbox" packages stories apps scripts package.json pnpm-workspace.yaml tsconfig.json
pnpm install --lockfile-only
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:stories
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；只有 E2E 和 PoC Story；lockfile 不再包含 removed workspace importer；verify 不重写 fixture/golden。

- [ ] **Step 6: Commit the workspace migration**

```bash
git add -A -- packages/modules stories/sandbox stories/e2e stories/demo stories/poc apps/web/e2e vite.config.ts pnpm-workspace.yaml tsconfig.json tsconfig.check.json scripts package.json pnpm-lock.yaml LICENSE.md README.md AGENTS.md
git diff --cached --check
git commit -m "refactor(stories): keep only e2e and poc packages"
```

### Task 5: Collapse Player and Developer roots into one E2E Web Artifact

**Files:**

- Rename: stories/e2e/player.html → stories/e2e/index.html
- Rename: stories/e2e/src/application/player-entry.tsx → stories/e2e/src/application/entry.tsx
- Delete: stories/e2e/developer.html
- Delete: stories/e2e/src/application/developer-entry.tsx
- Modify: stories/e2e/src/application/create-e2e-application.ts
- Modify: stories/e2e/tsconfig.application.json
- Modify: apps/web/package.json
- Delete: apps/web/src/developer/development-panel.tsx
- Delete: apps/web/src/developer/index.ts
- Modify: apps/web/src/index.ts
- Rename: apps/web/type-tests/developer-exports.test-d.ts → apps/web/type-tests/application-exports.test-d.ts
- Modify: vite.config.ts
- Modify: playwright.config.ts
- Modify: package.json
- Modify: scripts/verify.mjs
- Modify: scripts/verify.test.mjs
- Modify: scripts/verify-bundle.mjs
- Modify: scripts/verify-bundle.test.mjs
- Modify: scripts/prepare-artifact.mjs
- Modify: scripts/verify-artifact.mjs
- Modify: scripts/verify-artifact.test.mjs
- Modify: scripts/verify-release.mjs
- Modify: scripts/verify-release.test.mjs
- Modify: apps/web/e2e/walking-skeleton.spec.ts
- Modify: `apps/web/e2e/__screenshots__/e2e-shell.png`
- Test: scripts/verify-bundle.test.mjs
- Test: scripts/verify-artifact.test.mjs
- Test: apps/web/e2e/walking-skeleton.spec.ts

**Interfaces:**

- Consumes: Task 4 E2E Story and generic @project-tavern/web mount/loader。
- Produces: one E2E Web entry at stories/e2e/index.html、one build:e2e command、one dist/e2e Artifact and one Playwright server；there is no build:player、build:developer、Developer HTML or @project-tavern/web/developer export。

- [ ] **Step 1: Write failing single-artifact and closure tests**

```js
test("collects one E2E application closure", async () => {
  const paths = await collectManagedPaths(repositoryRoot, [
    "stories/e2e/src/application/entry.tsx",
  ]);
  assert(paths.includes("stories/e2e/src/application/entry.tsx"));
  assert(!paths.some((path) => path.includes("developer-entry")));
  assert(!paths.some((path) => path.includes("player-entry")));
});

test("forbids testkit and source archives but permits future tooling chunks", () => {
  assert.deepEqual(
    verifyGameArtifactClosureV1({
      paths: ["stories/e2e/src/tooling/index.ts", "packages/base/src/testkit/private.ts"],
    }),
    ["Artifact closure reached Base testkit: packages/base/src/testkit/private.ts"],
  );
});
```

更新 verify.test.mjs 的 expected command list：移除 build:player 和 build:developer，加入一次 build:e2e。

- [ ] **Step 2: Run focused tests and confirm the dual-root baseline fails**

Run:

```bash
node --test scripts/verify-bundle.test.mjs scripts/verify-artifact.test.mjs scripts/verify.test.mjs
pnpm build:e2e
```

Expected: script tests FAIL because single-artifact functions/scripts do not exist；build:e2e FAIL because root package still只有 player/developer scripts。

- [ ] **Step 3: Implement one closed E2E build root**

vite.config.ts 在本阶段只接受 mode=e2e-web：

```ts
const applicationRoots = Object.freeze({
  "e2e-web": Object.freeze({
    html: resolve(repositoryRoot, "stories/e2e/index.html"),
    outDir: resolve(repositoryRoot, "dist/e2e"),
  }),
});
```

保持 base 为 ./、publicDir false、emptyOutDir true、source map false，并把 emitted HTML 重命名为 index.html。任意未知 mode、caller-supplied root 或 dist 外路径必须失败。

root scripts 精确改为：

```json
{
  "build:e2e": "vite build --mode e2e-web",
  "release:prepare": "pnpm build:e2e && node scripts/prepare-artifact.mjs dist/e2e"
}
```

Phase 6 将在同一 closed map 中增加 poc-web；本任务不创建第二种 E2E flavor。

- [ ] **Step 4: Make artifact verification product-neutral**

将 Player 命名改为 Game Artifact：

- verifyPlayerBundleFixtureV1 → verifyGameArtifactClosureV1；
- verifyTemporaryPlayerArtifactV1 → verifyTemporaryE2eArtifactV1；
- default artifact root 从 dist/player 改为 dist/e2e；
- release reproducibility 临时构建调用 build:e2e；
- closure 继续禁止 Base testkit、references、art-source/aigc、source map、绝对路径和 secrets；
- 不再禁止 tooling/debug 文件名，因为同 Artifact runtime capability 是 Phase 3 的权限边界。

Playwright 只启动一个 4173 E2E preview server；删除 4174。route isolation 测试改为确认不存在第二 Developer URL，当前普通 E2E flow 仍可用鼠标和键盘完成。

- [ ] **Step 5: Run build, browser and full verification**

Run:

```bash
pnpm build:e2e
node scripts/verify-bundle.mjs
node scripts/verify-artifact.mjs
pnpm test:e2e:smoke
pnpm test:scripts
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；只生成 dist/e2e；Playwright 只管理一个服务器；Artifact 中没有独立 Developer HTML 或 source map。

- [ ] **Step 6: Commit the single Artifact migration**

```bash
git add -A -- stories/e2e apps/web vite.config.ts playwright.config.ts package.json scripts apps/web/e2e
git diff --cached --check
git commit -m "refactor(web): build one artifact per story host"
```

### Task 6: Remove the public Player/Developer application split

**Files:**

- Modify: packages/base/src/contracts/application.ts
- Create: packages/base/src/contracts/application.test.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/index.ts
- Modify: packages/base/type-tests/application.test-d.ts
- Modify: packages/base/type-tests/phase1-consumer.test-d.ts
- Modify: packages/base/public-exports.v1.json
- Rename: stories/e2e/src/application/create-e2e-application.ts → stories/e2e/src/application/create-e2e-game-runtime.ts
- Rename: stories/e2e/src/application/create-e2e-application.test.ts → stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: stories/e2e/src/application/entry.tsx
- Test: packages/base/src/contracts/application.test.ts
- Test: packages/base/type-tests/application.test-d.ts

**Interfaces:**

- Consumes: Phase 2 Semantic placeholder、existing lifecycle/persistence/diagnostics subports and Task 5 unified application root。
- Produces: generic GameApplicationPortV1 with semantic/lifecycle/persistence/diagnostics/capabilities/debugTools fields；typed unavailable E2E capability/debug facades until Phase 3 supplies real implementations；no PlayerApplicationPortV1、DeveloperApplicationPortV1 or DeveloperControlPortV1 export。

- [ ] **Step 1: Write failing unified-port and removed-export tests**

```ts
interface SyntheticSemanticPortV1 {
  observe(): unknown;
}

declare const application: GameApplicationPortV1<
  SyntheticSemanticPortV1,
  SessionLifecyclePortV1<SessionAnchorResultV1>,
  E2ePersistencePortV1,
  E2eDiagnosticsPortV1,
  E2eUnavailableCapabilitiesPortV1,
  E2eUnavailableDebugToolsPortV1
>;

application.semantic;
application.lifecycle;
application.persistence;
application.diagnostics;
application.capabilities;
application.debugTools;

// @ts-expect-error removed after Phase 1
application.player;
// @ts-expect-error removed after Phase 1
application.developer;
// @ts-expect-error authoritative state is never public
application.snapshot;

// @ts-expect-error removed public ABI
export type OldPlayerPort = import("@project-tavern/base").PlayerApplicationPortV1;
// @ts-expect-error removed public ABI
export type OldDeveloperPort = import("@project-tavern/base").DeveloperApplicationPortV1;
```

- [ ] **Step 2: Run focused type and contract tests**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/application.test.ts
pnpm typecheck
```

Expected: FAIL because GameApplicationPortV1 does not exist and the old public application split is still exported。

- [ ] **Step 3: Define the generic unified application contract**

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

删除 PlayerApplicationPortV1、DeveloperApplicationPortV1、DeveloperControlPortV1 and PlayerCommandPortV1。PlayerPersistencePortV1、PlayerDiagnosticsPortV1、PlayerWritableSaveSlotIdV1 等表达低权限子端口的名称可以保留。

Phase 2 的 E2E unavailable facades 必须是完整、稳定、不可变对象：

```ts
export interface E2eUnavailableCapabilitiesPortV1 {
  readonly kind: "unavailable";
}

export interface E2eUnavailableDebugToolsPortV1 {
  readonly kind: "unavailable";
  readonly code: "phase3_not_installed";
}
```

它们不能提供 state mutation、throwing placeholder、optional method 或 arbitrary callback。Phase 3 Task 2 在相同字段位置替换为 RuntimeCapabilityPortV1 和 capability-gated DebugToolsPortV1。

- [ ] **Step 4: Update the exact public inventory and E2E application**

Base root inventory 添加 GameApplicationPortV1，删除全部 old top-level application symbols。`createE2eGameRuntimeV1` returns one unified port；until Task 10 adds SemanticGamePort，`semantic` 字段必须是一个明确的临时窄适配器（仅 current visible view source + typed dispatch），不得暴露 raw Snapshot，也不得继续保留 removed top-level `view`/`commands` 字段。同一任务必须更新 `entry.tsx` 只从 `application.semantic` 取值，保证该 checkpoint 独立 `build:e2e` 绿色。The name `ApplicationRoot` is reserved for the React element composed in Task 11。

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/contracts/application.test.ts
pnpm verify:public-exports
pnpm typecheck
pnpm build:e2e
pnpm verify
git diff --check
```

Expected: all commands exit 0；Base inventory contains no DeveloperApplicationPortV1、DeveloperControlPortV1、PlayerApplicationPortV1 or PlayerCommandPortV1；same E2E Artifact boots through GameApplicationPortV1。

- [ ] **Step 5: Commit the unified public application surface**

```bash
git add -- packages/base/src/contracts/application.ts packages/base/src/contracts/application.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts packages/base/type-tests/application.test-d.ts packages/base/type-tests/phase1-consumer.test-d.ts packages/base/public-exports.v1.json stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts stories/e2e/src/application/entry.tsx
git diff --cached --check
git commit -m "refactor(base): unify the game application port"
```

## Phase 2B — Minimal E2E Gameplay and Semantic Interaction

### Task 7: Define the closed E2E Gameplay contracts and three owner modules

**Files:**

- Create: stories/e2e/src/gameplay/contracts/ids.ts
- Create: stories/e2e/src/gameplay/contracts/state.ts
- Create: stories/e2e/src/gameplay/contracts/commands.ts
- Create: stories/e2e/src/gameplay/contracts/facts.ts
- Create: stories/e2e/src/gameplay/contracts/results.ts
- Create: stories/e2e/src/gameplay/contracts/index.ts
- Create: stories/e2e/src/gameplay/modules/counter-module.ts
- Create: stories/e2e/src/gameplay/modules/counter-module.test.ts
- Create: stories/e2e/src/gameplay/modules/flow-module.ts
- Create: stories/e2e/src/gameplay/modules/flow-module.test.ts
- Create: stories/e2e/src/gameplay/modules/run-module.ts
- Create: stories/e2e/src/gameplay/modules/run-module.test.ts
- Create: stories/e2e/src/gameplay/resolvers/choice-delta-resolver.ts
- Create: stories/e2e/src/gameplay/resolvers/choice-delta-resolver.test.ts
- Create: stories/e2e/src/gameplay/modules/index.ts
- Modify: stories/e2e/src/contracts.ts
- Modify: stories/e2e/tsconfig.json
- Test: stories/e2e/src/gameplay/modules/*.test.ts
- Test: stories/e2e/src/gameplay/resolvers/choice-delta-resolver.test.ts

**Interfaces:**

- Consumes: Base GameplayModule authoring、strict schema、owner proposal/apply and project RNG types。
- Produces: E2eGameStateV1、E2eGameCommandV1、closed replayable E2eDebugCommandV1/E2eDebugValidationErrorV1、E2eGameplayFactV1、three stateful owners counter/flow/run、one stateless choiceDeltaResolver module and exact read ports。

- [ ] **Step 1: Write failing strict-contract and ownership tests**

```ts
it("rejects unknown command and state fields", () => {
  expect(() =>
    e2eGameCommandSchemaV1.parse({
      kind: "e2e.flow.choose",
      choice: "left",
      injected: true,
    }),
  ).toThrow();
  expect(() =>
    e2eGameStateSchemaV1.parse({
      counter: { value: 0 },
      flow: initialFlowStateV1,
      run: initialRunStateV1,
      foreign: {},
    }),
  ).toThrow();
});

it("keeps every proposal owner scoped", () => {
  const proposal = counterModuleV1.owner.propose(
    { value: 0 },
    { kind: "counter.add", amount: 2 },
    {},
  );
  expect(proposal).toMatchObject({
    kind: "proposed",
    proposal: { payload: { value: 2 } },
  });
  expect(JSON.stringify(proposal)).not.toContain("flow");
  expect(JSON.stringify(proposal)).not.toContain("run");
});
```

- [ ] **Step 2: Run the focused suite and confirm the Gameplay layer is absent**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay/modules src/gameplay/resolvers
```

Expected: FAIL because Story-local Gameplay contracts and modules do not exist。

- [ ] **Step 3: Implement the exact fixture state machine**

使用以下最小闭集：

```ts
export interface E2eGameStateV1 {
  readonly counter: { readonly value: NonNegativeSafeInteger };
  readonly flow: {
    readonly status: "idle" | "choosing" | "blocked" | "resolved";
    readonly branch: "left" | "right" | null;
    readonly nodeId: "intro" | "choice" | "left" | "right" | "rejoin" | "done";
  };
  readonly run: { readonly status: "active" | "complete" };
}

export type E2eGameCommandV1 =
  | { readonly kind: "e2e.counter.increment" }
  | { readonly kind: "e2e.counter.roll"; readonly maximum: PositiveSafeInteger }
  | { readonly kind: "e2e.flow.start" }
  | { readonly kind: "e2e.flow.choose"; readonly choice: "left" | "right" }
  | { readonly kind: "e2e.flow.continue" }
  | { readonly kind: "e2e.run.complete" }
  | { readonly kind: "e2e.test.reject" }
  | { readonly kind: "e2e.test.fault" };

export type E2eDebugCommandV1 =
  | { readonly kind: "debug.e2e.counter.add"; readonly amount: PositiveSafeInteger }
  | { readonly kind: "debug.e2e.flow.set_blocked"; readonly blocked: boolean }
  | { readonly kind: "debug.e2e.test.validation_failed" }
  | { readonly kind: "debug.e2e.test.fault" };

export type E2eDebugValidationErrorV1 =
  | {
      readonly code: "debug.e2e.value_out_of_range";
      readonly commandKind: "debug.e2e.counter.add";
    }
  | {
      readonly code: "debug.e2e.state_conflict";
      readonly commandKind: "debug.e2e.flow.set_blocked";
    }
  | {
      readonly code: "debug.e2e.test_validation_failed";
      readonly commandKind: "debug.e2e.test.validation_failed";
    };
```

状态槽精确为 simulation.counter、simulation.flow 和 simulation.run。Flow descriptor 显式依赖 e2e.counter 并只取得 CounterReadPortV1；Run 不直接依赖 Flow，由 executor 显式传入 terminal proposal input。choiceDeltaResolver 是 stateless binding，stateSlots 为空，capabilities 只有 resolveChoiceDelta(choice): 1 | 2。

Debug amount 使用 safe-integer bounded Schema；其 strict union 与普通 Command 分开，不能表达任意 State path/value。Facts 只解释已应用 proposal：counter.changed、flow.started、flow.branch_selected、flow.blocked、flow.resolved、run.completed。Facts 不能作为另一个 owner 的写入口。

- [ ] **Step 4: Add module-local invariant and dependency tests**

覆盖：

- Counter 永不为负；
- Flow branch 只在 choosing/blocked/resolved 中允许；
- resolved 必须位于 done；
- complete Run 只能由 terminal proposal 创建；
- dependency port 是冻结投影，不含完整 Snapshot；
- stateless Resolver 没有 State Schema、owner 或 mutable closure。

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay/modules src/gameplay/resolvers
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；E2E Gameplay 不导入 stories/poc；Base/UI/Web 中不存在 e2e.* ID。

- [ ] **Step 5: Commit the minimal modules**

```bash
git add -- stories/e2e/src/gameplay stories/e2e/src/contracts.ts stories/e2e/tsconfig.json
git diff --cached --check
git commit -m "feat(e2e): add minimal gameplay owners"
```

### Task 8: Implement the atomic E2E GameCommandExecutor, GameQueries, and GameView

**Files:**

- Create: stories/e2e/src/gameplay/game-command-executor.ts
- Create: stories/e2e/src/gameplay/game-command-executor.test.ts
- Create: stories/e2e/src/gameplay/game-debug-command-executor.ts
- Create: stories/e2e/src/gameplay/game-debug-command-executor.test.ts
- Create: stories/e2e/src/gameplay/game-queries.ts
- Create: stories/e2e/src/gameplay/game-queries.test.ts
- Create: stories/e2e/src/gameplay/game-view-projector.ts
- Create: stories/e2e/src/gameplay/game-view-projector.test.ts
- Create: stories/e2e/src/gameplay/game-simulation.ts
- Create: stories/e2e/src/gameplay/game-simulation.test.ts
- Modify: stories/e2e/src/session.ts
- Modify: stories/e2e/src/property.test.ts
- Test: stories/e2e/src/gameplay/game-command-executor.test.ts
- Test: stories/e2e/src/gameplay/game-debug-command-executor.test.ts
- Test: stories/e2e/src/gameplay/game-queries.test.ts
- Test: stories/e2e/src/gameplay/game-simulation.test.ts

**Interfaces:**

- Consumes: Task 7 bindings、strict Game/Debug schemas、transaction RNG and Task 1 GameSimulation/GameDebugCommandExecutor contracts。
- Produces: E2eGameCommandExecutorV1、E2eGameDebugCommandExecutorV1、createE2eGameQueriesV1、projectE2eGameViewV1、E2eGameSimulationV1 and createE2eGameSimulationV1(program)。

- [ ] **Step 1: Write failing transaction, rollback, RNG, and query tests**

```ts
it("commits both owners or neither for branch selection", () => {
  const fixture = createChoosingFixture();
  const committed = fixture.execute({
    kind: "e2e.flow.choose",
    choice: "right",
  });
  expect(committed.result).toMatchObject({
    kind: "committed",
    snapshot: {
      state: {
        counter: { value: 2 },
        flow: { status: "blocked", branch: "right", nodeId: "rejoin" },
      },
    },
  });

  const failing = createFailingSecondOwnerFixture();
  const rejected = failing.execute({
    kind: "e2e.flow.choose",
    choice: "right",
  });
  expect(rejected.result.kind).toBe("rejected");
  expect(rejected.result.snapshot).toBe(failing.inputSnapshot);
});

it("does not expose the rolled value from queries before commit", () => {
  const fixture = createActiveFixture();
  const before = fixture.simulation.createQueries(fixture.snapshot.state);
  const result = fixture.execute({ kind: "e2e.counter.roll", maximum: 6 });
  const after = fixture.simulation.createQueries(result.result.snapshot.state);
  expect(before.counterValue).toBe(0);
  expect(after.counterValue).toBeGreaterThanOrEqual(1);
  expect(after.counterValue).toBeLessThanOrEqual(6);
});

it("executes replayable debug commands through owner proposals", () => {
  const fixture = createDebugExecutorFixture();
  const command = {
    kind: "debug.e2e.counter.add",
    amount: parsePositiveSafeInteger(5),
  } as const;
  expect(fixture.debugExecutor.validate(fixture.snapshot, command, undefined)).toEqual({
    kind: "allowed",
  });
  const attempt = fixture.debugExecutor.executeAttempt(fixture.snapshot, command, undefined);
  expect(attempt.result).toMatchObject({
    kind: "committed",
    snapshot: { state: { counter: { value: 5 } } },
  });
});

it("returns validation failure without opening an attempt", () => {
  const fixture = createDebugExecutorFixture();
  expect(
    fixture.debugExecutor.validate(
      fixture.snapshot,
      { kind: "debug.e2e.test.validation_failed" },
      undefined,
    ),
  ).toEqual({
    kind: "validation_failed",
    errors: [
      {
        code: "debug.e2e.test_validation_failed",
        commandKind: "debug.e2e.test.validation_failed",
      },
    ],
  });
  expect(fixture.executeAttemptCalls()).toBe(0);
});
```

- [ ] **Step 2: Run focused tests and confirm executor/query absence**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay/game-command-executor.test.ts src/gameplay/game-debug-command-executor.test.ts src/gameplay/game-queries.test.ts src/gameplay/game-view-projector.test.ts src/gameplay/game-simulation.test.ts
```

Expected: FAIL because the normal/debug executors、queries、view projector and simulation factory do not exist。

- [ ] **Step 3: Implement one candidate transaction**

Executor 固定执行顺序：

```text
parse command
→ clone candidate state and transactional RNG
→ evaluate guards from current read ports
→ call choice Rule/Resolver
→ ask owners for proposals in authored order
→ validate every proposal before apply
→ apply only to owner slices
→ validate aggregate State and local/global invariants
→ commit state/RNG/sequence once
```

e2e.flow.choose 是跨 owner 原子命令：Counter proposal 在前，Flow proposal 在后；任一 proposal/revalidation/invariant 失败都返回输入 Snapshot 和 committed RNG 的同一引用。e2e.test.reject 不消费 RNG 或 sequence；e2e.test.fault 返回稳定 fault 并保留输入。counter.roll 的 attempted draw 记录在 diagnostics，只有 committed 才提交 candidate RNG。

E2eGameDebugCommandExecutorV1 是 GameSimulation-owned replayable executor：strict Schema 在 admission 前解析，GameSession FIFO 队首先调用其 `validate` 处理 reference/range/current-state checks；`validation_failed` 不打开 attempt。只有 `allowed` 才恰好调用一次 `executeAttempt`，所有 mutation 通过 Counter/Flow owner proposals，结果只能 committed 或 faulted。Executor 本身绝不调用 `markRunModifiedV1`，由 Phase 3 GameSession DebugTools wrapper 在 successful commit 外层原子标记。Fixture/DebugBundle anchor 不进入此 executor。

- [ ] **Step 4: Keep Queries and projection separate from execution**

```ts
export interface E2eGameQueriesV1 {
  readonly counterValue: NonNegativeSafeInteger;
  readonly parity: "even" | "odd";
  readonly flowStatus: E2eGameStateV1["flow"]["status"];
  readonly visibleNodeId: E2eGameStateV1["flow"]["nodeId"];
  readonly runStatus: E2eGameStateV1["run"]["status"];
  readonly canComplete: boolean;
}

export interface E2eGameViewV1 {
  readonly counterLabel: string;
  readonly flow: {
    readonly status: E2eGameQueriesV1["flowStatus"];
    readonly nodeId: E2eGameQueriesV1["visibleNodeId"];
  };
  readonly terminal: boolean;
}
```

createQueries 只读 Gameplay State；projectGameView 只接收已经创建的 Queries。Normal/Debug Executor 都不拥有 createQueries；UI 不自行重复 canComplete 或 action availability 公式。`createE2eGameSimulationV1(program)` 必须同时绑定 `commandExecutor`、`debugCommandSchema`、`debugValidationErrorSchema` 与 `debugCommandExecutor`，它们都进入 simulation source closure/digest。

- [ ] **Step 5: Add property tests and run complete verification**

fast-check 生成最多 100 条 E2E Command，验证：

- 结果永远通过 Snapshot Schema；
- rejection/fault 保留输入 state/RNG/sequence；
- committed sequence 恰加一；
- 相同 seed/normal-or-debug commands 得到相同 Snapshot、Facts 和 RNG traces；
- terminal 后普通 Gameplay Command 稳定拒绝。

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/gameplay src/property.test.ts
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；同一命令只进入一个 executor attempt；Queries 不改变 Snapshot。

- [ ] **Step 6: Commit executor and queries**

```bash
git add -- stories/e2e/src/gameplay stories/e2e/src/session.ts stories/e2e/src/property.test.ts
git diff --cached --check
git commit -m "feat(e2e): execute atomic fixture gameplay"
```

### Task 9: Define the E2E Story, Patch Surfaces, Presentation, SceneGraph, and Tooling

**Files:**

- Create: stories/e2e/src/simulation/program.ts
- Create: stories/e2e/src/simulation/patch-surfaces.ts
- Create: stories/e2e/src/presentation/text-catalogs.ts
- Create: stories/e2e/src/presentation/presentation-program.ts
- Create: stories/e2e/src/presentation/scene-graph.ts
- Create: stories/e2e/src/presentation/content-maturity-policy.ts
- Create: stories/e2e/src/presentation/scene-graph.test.tsx
- Create: stories/e2e/src/story-definition.ts
- Create: stories/e2e/src/story-entry.ts
- Create: stories/e2e/src/story-contract.test.ts
- Rename: stories/e2e/src/development.ts → stories/e2e/src/tooling.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: stories/e2e/src/index.ts
- Modify: stories/e2e/package.json
- Modify: stories/e2e/tsconfig.json
- Test: stories/e2e/src/story-contract.test.ts
- Test: stories/e2e/src/presentation/scene-graph.test.tsx

**Interfaces:**

- Consumes: ResolvedGame、createE2eGameSimulationV1、Task 8 GameView、Base PatchSurface/asset contracts and Task 2 StoryToolingEntry。
- Produces: side-effect-free E2E StoryEntry、E2eSimulationProgramV1、E2ePresentationV1、E2eSceneGraphV1、最小中性 StageScene/variant/rig/hitmap/interaction/content-policy catalog、rule/value patch slots and fixed Story tooling fixtures。

- [ ] **Step 1: Write failing source/resolve/SceneGraph tests**

```ts
it("resolves one complete E2E game from the public Story entry", () => {
  const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
  expect(resolved.provenance.story.id).toBe("story.e2e");
  expect(resolved.gameSimulation.modules.map((module) => module.descriptor.id)).toEqual([
    "e2e.counter",
    "e2e.flow",
    "e2e.run",
    "e2e.choice-delta-resolver",
  ]);
  expect(resolved.sceneGraph.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
    "stage_scene.e2e.main",
    "stage_scene.e2e.summary",
  ]);
  expect(resolved.sceneGraph.interactionSurfaces.map((surface) => surface.surfaceId)).toEqual([
    "surface.e2e.counter",
  ]);
  expect(resolved.sceneGraph.contentMaturityPolicy.levels).toHaveLength(2);
  expect(Object.isFrozen(resolved)).toBe(true);
});

it("keeps tooling out of Story define and simulation identity", () => {
  expect(e2eStoryEntryV1).not.toHaveProperty("tooling");
  const first = resolveStoryForTestV1(e2eStoryEntryV1);
  const second = resolveStoryForTestV1(e2eStoryEntryV1);
  expect(first.provenance.resolved.simulationDigest).toBe(
    second.provenance.resolved.simulationDigest,
  );
});
```

- [ ] **Step 2: Run focused tests and confirm the Story is still the migrated counter**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/story-contract.test.ts src/presentation/scene-graph.test.tsx
```

Expected: FAIL because the full ResolvedGame source and SceneGraph do not exist。

- [ ] **Step 3: Implement the smallest authored Programs and patch surface**

Simulation PatchSurface 暴露恰好：

- rule symbol e2e.rule.choice-delta，provider type 为同步 pure function；
- value symbol e2e.value.terminal-threshold，正整数默认值 2。

materializeProgram 返回：

```ts
export interface E2eSimulationProgramV1 {
  readonly rules: {
    readonly resolveChoiceDelta: (choice: "left" | "right") => 1 | 2;
  };
  readonly values: {
    readonly terminalThreshold: PositiveSafeInteger;
  };
}
```

Presentation PatchSurface 只提供两个 Text slots；Asset 使用 code fallback。SceneGraph 含：

- stage_scene.e2e.main：显示 counter、flow visible node 和正常操作；
- 一个阻塞 Narrative overlay：choice/rejoin；
- stage_scene.e2e.summary：terminal summary。

E2E catalog 使用与 PoC 无关的稳定 ID：`stage_variant.e2e.main.default`、`stage_variant.e2e.summary.default`、`character.e2e.counter`、`rig.e2e.counter`、`pose.e2e.counter.idle`、`surface.e2e.counter`、`target.e2e.counter.figure` 和 `behavior.e2e.counter.increment`。HitMap 至少包含 rect/circle/polygon 各一条中性测试 area；重叠优先级和 authored-order tie-break 必须在 data-only unit test 中锁定。surface 图必须是 DAG；interaction behavior 只能引用一个 provider symbol ID，不能嵌入 E2E command 或 callback。

内容 policy 只为机制测试登记两个中性等级 `{ id: "content.e2e.base", ordinal: 0 }` 与 `{ id: "content.e2e.extra", ordinal: 100 }`，默认 maximum 是 base；它不使用 standard/suggestive/sexual/explicit 项目语义。Task 9 只证明静态 catalog 可解析、冻结并进入 presentation identity；不实现 Host preference storage、RuntimePresentationView 或内容过滤。

StoryEntry define 同步、无参数、无 I/O；createGameSimulation 只接收已经冻结的 post-Hotfix program。

`scene-graph.ts` 是 Node verifier 可直接 import 的 data-only runtime definition：只包含 stable renderer ID、layout/slot descriptor 和 Strict JSON presentation data，不得包含 JSX、React component、函数、浏览器对象或 browser-only transform。Web-only `.tsx` renderer registry/contribution 放在 application closure，把 renderer ID 解析为组件；它影响 application identity，不得反向进入 GameSimulation、default Story entry 或 Headless closure。只在 `scene-graph.test.tsx` 和 React application root 中使用 JSX。E2E default Story entry 的 Node-reachable closure 不得 re-export/import `application/*.tsx`，保证 `node --experimental-strip-types` 可直接加载。

同一任务必须让 `createE2eGameRuntimeV1` 改用新 E2E StoryEntry/ResolvedGame/GameSimulation，但仍保留 Task 6 的临时窄 semantic adapter，直到 Task 10 原子替换。runtime factory test 必须证明 resolve 两次 define/各 materializer 一次、单 GameSession 和新 Story 初始 visible view，使 Task 9 checkpoint 独立 `build:e2e`/`pnpm verify` 绿色。

- [ ] **Step 4: Define same-artifact Story tooling**

tooling.ts 使用 defineStoryToolingEntry，提供：

- fixture.e2e.initial；
- fixture.e2e.choice-left-blocked；
- fixture.e2e.choice-right-blocked；
- fixture.e2e.terminal。

每个 fixture 只含固定 seed 和 closed command list。Tooling 只容纳 fixtures、notes 和将表单输入转为 Story 已声明 DebugCommand 的 adapter；不定义 debug schema、validation 或 execution semantics。Tooling 不从默认 Story entry re-export，不进入 simulation/presentation digest；Phase 3 在 capability 开启后动态导入。

- [ ] **Step 5: Verify Hotfix partition and Story boundaries**

加入 tests：

- rule/value Hotfix 改变 simulation digest，保持 state-contract revision/digest；
- text Hotfix 只改变 presentation digest；
- unknown/collision/provider mismatch 返回稳定 failure；
- SceneGraph 与 presentation 来自同一个 ResolvedGame；
- E2E default entry 不导入 tooling；
- E2E source graph 不包含 stories/poc。

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/story-contract.test.ts src/presentation
pnpm verify:stories
pnpm verify:assets
pnpm verify:boundaries
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；Story resolve 无 cast；Hotfix digest 分区符合预期；SceneGraph 被 ResolvedGame 持有。

- [ ] **Step 6: Commit the E2E Story composition**

```bash
git add -- stories/e2e/src/simulation stories/e2e/src/presentation stories/e2e/src/story-definition.ts stories/e2e/src/story-entry.ts stories/e2e/src/story-contract.test.ts stories/e2e/src/tooling.ts stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts stories/e2e/src/index.ts stories/e2e/package.json stories/e2e/tsconfig.json
git diff --cached --check
git commit -m "feat(e2e): resolve the minimal fixture story"
```

### Task 10: Implement SemanticGamePort over the real GameSession

**Files:**

- Modify: packages/base/src/contracts/application.ts
- Modify: packages/base/src/contracts/index.ts
- Modify: packages/base/src/index.ts
- Create: packages/base/src/runtime/application/semantic-game-port.ts
- Create: packages/base/src/runtime/application/semantic-game-port.test.ts
- Modify: packages/base/src/runtime/session/game-session.ts
- Modify: packages/base/src/runtime/session/game-session.test.ts
- Modify: packages/base/src/runtime/index.ts
- Modify: packages/base/public-exports.v1.json
- Create: stories/e2e/src/runtime/e2e-semantic-game-port.ts
- Create: stories/e2e/src/runtime/e2e-semantic-game-port.test.ts
- Create: stories/e2e/src/runtime/headless-runner.ts
- Create: stories/e2e/src/runtime/headless-runner.test.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.ts
- Modify: stories/e2e/src/application/create-e2e-game-runtime.test.ts
- Modify: stories/e2e/package.json
- Modify: package.json
- Create: scripts/verify-semantic.mts
- Create: scripts/verify-semantic.test.mjs
- Modify: scripts/run-script-tests.test.mjs
- Test: packages/base/src/runtime/application/semantic-game-port.test.ts
- Test: stories/e2e/src/runtime/e2e-semantic-game-port.test.ts

**Interfaces:**

- Consumes: GameSession、E2E GameQueries/GameView and strict E2E commands。
- Produces: atomic `SemanticPublicationV1`、SemanticGamePortV1、SemanticActionDescriptorV1 envelope、createSemanticGamePortV1、`E2eSemanticInvocationV1`、`E2eSemanticActionDescriptorV1`、`E2eSemanticPreviewV1`、`createE2eSemanticActionCatalogV1(queries)`、`previewE2eSemanticInvocationV1(queries, invocation)`、player-safe `E2eSemanticActionResultV1`/`projectE2eSemanticActionResultV1` and a no-DOM headless runner。

- [ ] **Step 1: Write failing visibility, parity, and idle tests**

```ts
it("exposes only player-visible semantic state and available actions", () => {
  const port = createE2eSemanticFixture().port;
  const publication = port.observe();
  expect(publication).toEqual({
    revision: 0,
    status: "ready",
    game: expect.any(Object),
    actions: expect.any(Array),
  });
  expect(port.availableActions()).toBe(publication.actions);
  expect(publication).not.toHaveProperty("snapshot");
  expect(publication).not.toHaveProperty("hiddenConditions");
  expect(port).not.toHaveProperty("debugTools");
});

it("publishes game and actions atomically from exactly one Queries instance", async () => {
  const fixture = createQueriesCountingSemanticFixture();
  const first = fixture.port.observe();
  expect(fixture.createQueriesCalls()).toBe(1);
  expect(first.game.queryWitness).toBe(first.actions[0]?.queryWitness);

  await fixture.publishBusyReadyWithoutReplacement();
  const statusOnly = fixture.port.observe();
  expect(statusOnly.game).toBe(first.game);
  expect(statusOnly.actions).toBe(first.actions);
  expect(fixture.createQueriesCalls()).toBe(1);

  await fixture.port.dispatch({ actionId: "action.e2e.increment", parameters: {} });
  const committed = fixture.port.observe();
  expect(committed.game).not.toBe(first.game);
  expect(committed.actions).not.toBe(first.actions);
  expect(committed.game.queryWitness).toBe(committed.actions[0]?.queryWitness);
  expect(fixture.createQueriesCalls()).toBe(2);
});

it("uses the same availability for preview and queue-front dispatch", async () => {
  const fixture = createChoosingSemanticFixture();
  const invocation = {
    actionId: "action.e2e.choose",
    parameters: { choice: "left" },
  } as const;
  expect(await fixture.port.preview(invocation)).toMatchObject({
    kind: "allowed",
  });
  await fixture.changeStateBeforeDispatch();
  await expect(fixture.port.dispatch(invocation)).resolves.toMatchObject({
    kind: "rejected",
    reasons: [{ code: "flow.not_choosing" }],
  });
});

it("rebuilds preview queries from the state at its FIFO position", async () => {
  const fixture = createSemanticFixtureOneBelowCompletionWithBlockedQueue();
  const mutation = fixture.dispatchBeforeRelease({
    actionId: "action.e2e.increment",
    parameters: {},
  });
  const preview = fixture.port.preview({
    actionId: "action.e2e.complete",
    parameters: {},
  });
  fixture.releaseQueue();
  await mutation;
  await expect(preview).resolves.toMatchObject({
    kind: "allowed",
  });
});

it("publishes status changes without inventing a gameplay revision", async () => {
  const fixture = createSemanticFixture();
  const publications: number[] = [];
  const unsubscribe = fixture.port.subscribe(() => {
    publications.push(fixture.port.observe().revision);
  });
  await fixture.publishBusyReadyWithoutReplacement();
  expect(publications).toEqual([0, 0]);
  await fixture.replaceWithEquivalentAuthoritativeSnapshot();
  expect(publications.at(-1)).toBe(1);
  unsubscribe();
});

it("routes a throwing semantic subscriber through the session failure hook", async () => {
  const fixture = createSemanticFixtureWithOneShotThrowingSubscriber();
  const second = vi.fn();
  fixture.port.subscribe(fixture.oneShotThrowingListener);
  fixture.port.subscribe(second);
  await fixture.port.dispatch({ actionId: "action.e2e.increment", parameters: {} });
  expect(second).toHaveBeenCalled();
  expect(fixture.observerFailures()).toHaveLength(1);
  expect(fixture.port.observe()).toMatchObject({ revision: 1, status: "ready" });
});

it("waits for a later stable revision without sleeping", async () => {
  const fixture = createSemanticFixture();
  const awaited = fixture.port.waitForIdle(fixture.port.observe().revision);
  await fixture.port.dispatch({ actionId: "action.e2e.increment", parameters: {} });
  await expect(awaited).resolves.toMatchObject({ revision: 1, status: "ready" });
});

it.each([
  ["committed", { kind: "committed" }],
  ["rejected", { kind: "rejected", reasons: [{ code: "flow.not_choosing" }] }],
  ["faulted", { kind: "faulted", code: "gameplay_fault" }],
  ["not_executed", { kind: "not_executed", code: "fault_paused" }],
] as const)("projects a player-safe E2E %s result", async (source, expected) => {
  const result = await createE2eSemanticResultFixtureV1(source).dispatch();
  expect(result).toEqual(expected);
  expect(collectObjectKeysRecursivelyV1(result)).not.toEqual(
    expect.arrayContaining(["snapshot", "state", "rng", "facts", "fault", "attempt", "commandLog"]),
  );
});
```

- [ ] **Step 2: Run focused tests and confirm SemanticGamePort is absent**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/application/semantic-game-port.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/e2e-semantic-game-port.test.ts src/runtime/headless-runner.test.ts
```

Expected: FAIL because Base semantic contracts and E2E adapter do not exist。

- [ ] **Step 3: Implement the generic port without Story knowledge**

```ts
export interface SemanticPublicationV1<TGameView, TActionDescriptor, TStatus> {
  readonly revision: NonNegativeSafeInteger;
  readonly status: DeepReadonly<TStatus>;
  readonly game: DeepReadonly<TGameView>;
  readonly actions: readonly DeepReadonly<TActionDescriptor>[];
}

export interface SemanticGamePortV1<
  TGameView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  observe(): DeepReadonly<SemanticPublicationV1<TGameView, TActionDescriptor, TStatus>>;
  subscribe(listener: () => void): () => void;
  availableActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<DeepReadonly<SemanticPublicationV1<TGameView, TActionDescriptor, TStatus>>>;
}

export interface SemanticGamePortSourceV1<TState, TStatus> {
  getCurrentState(): DeepReadonly<TState>;
  getAuthoritativeRevisionToken(): object;
  getStatus(): DeepReadonly<TStatus>;
  subscribe(listener: () => void): () => void;
  reportSubscriberFailure(error: unknown): void;
  readStateAtQueueFront<TResult>(
    reader: (state: DeepReadonly<TState>) => TResult,
  ): Promise<TResult>;
}

export interface SemanticGamePortInputV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly source: SemanticGamePortSourceV1<TState, TStatus>;
  createQueries(state: DeepReadonly<TState>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}
```

Base factory 只负责：

- immutable current `SemanticPublicationV1`；
- 直接消费 GameSession-compatible `getCurrentState/getAuthoritativeRevisionToken/getStatus/subscribe/reportSubscriberFailure/readStateAtQueueFront` source；opaque token 只用于判断权威 Snapshot 引用是否替换，不暴露 Snapshot 字段；
- 仅在 authoritative Snapshot 引用改变时递增 monotonic semantic revision，busy/ready publication 不重复递增；
- 第一次 publication 以及每次 authoritative token 替换时，各从当前 committed Gameplay State 恰好创建一个 Queries；同一个 Queries 同时投影 `game` 和 `actions`，随后原子冻结/发布，不能先后读取两次 State 或建立第二套 action gate；
- status-only publication 只替换 `status`/publication envelope，并严格复用前一 publication 的 `game` 与 `actions` 引用；`observe()` 是只读缓存读取，`availableActions()` 必须返回当前 `observe().actions` 的同一引用，二者都不能新建 Queries；
- preview 作为非权威 FIFO read 入队，到达队首后从当时 committed Gameplay state 重建 Queries，再执行纯 preview；
- preview/dispatch delegation；
- busy/ready 状态；
- subscribers/waiters 的确定 publication、resolve/reject 和 teardown；factory 逐个隔离公开 Semantic subscriber，单个 listener 抛错时继续通知其余 listener/waiter，并调用 internal source `reportSubscriberFailure(error)`；该 reporter 自身抛错也必须隔离；
- 禁止 thenable leakage 和 unbounded waiter growth。

GameSession 在本任务为 runtime control 增加一个只读 `readAtQueueFront` seam：它与 dispatch/authoritative replacement 共用同一 FIFO，不执行 executor，不改变 Snapshot/RNG/sequence/revision，不产生 Gameplay result，并在 reader 抛错后保持 tail 可用。该 seam 和 `SemanticGamePortSourceV1` 都只是 Base/Application bootstrap 的内部组合输入，不进入 `GameApplicationPort`、UI、Hotfix 或 Automation 公开面。E2E source adapter 是唯一可看到 Snapshot envelope 的层，它只把 `snapshot.state` 传给 Semantic source callback，并把 `reportSubscriberFailure` 转发到与 GameSession `onObserverFailure` 相同的 injected hook；`createQueries/projectGameView/actions/preview` 的公开类型不能观察 provenance、RNG、sequence 或 Phase 3 integrity。Base 不解析 E2E invocation，也不导入任何 Story。

- [ ] **Step 4: Implement E2E semantic mapping from the same Queries**

E2eSemanticInvocationV1 是 strict closed union：

```ts
export type E2eSemanticInvocationV1 =
  | {
      readonly actionId: "action.e2e.increment";
      readonly parameters: E2eNoSemanticParametersV1;
    }
  | {
      readonly actionId: "action.e2e.choose";
      readonly parameters: { readonly choice: "left" | "right" };
    }
  | {
      readonly actionId: "action.e2e.continue";
      readonly parameters: E2eNoSemanticParametersV1;
    }
  | {
      readonly actionId: "action.e2e.complete";
      readonly parameters: E2eNoSemanticParametersV1;
    };

export type E2eNoSemanticParametersV1 = Readonly<Record<string, never>>;

export type E2eSemanticActionDescriptorV1 = {
  readonly [TInvocation in E2eSemanticInvocationV1 as TInvocation["actionId"]]: {
    readonly actionId: TInvocation["actionId"];
    readonly textId: TextId;
    readonly enabled: boolean;
    readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    readonly options: readonly DeepReadonly<TInvocation>[];
  };
}[E2eSemanticInvocationV1["actionId"]];

export type E2eSemanticPreviewV1 =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    };

export type E2eSemanticActionResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: "gameplay_fault" };
```

Action descriptor 包含 stable actionId、textId、enabled、按 authored order 排列的 reasons 和受控 options；mapped union 保持 descriptor actionId 与每个 option invocation actionId 一致。`createE2eSemanticActionCatalogV1(queries)` 只读取 Task 8 已冻结的 `E2eGameQueriesV1` 字段并返回 authored-order visible descriptors；它不是 GameQueries 的新成员，也不修改 Task 8 ABI。`previewE2eSemanticInvocationV1(queries, invocation)` 使用同一 Queries 字段和共享 guard/rule helper。preview 在 FIFO read 到达队首后重新创建 Queries；dispatch 由 executor 在自己的 queue front 执行最终 guard。不存在 arbitrary command passthrough。Strict parser 对 `E2eNoSemanticParametersV1` 拒绝任意额外 key，并对 choice parameters 拒绝缺失/额外字段。

`createE2eSemanticGamePortV1` 必须把 `gameSimulation.createQueries`、`gameSimulation.projectGameView`、`createE2eSemanticActionCatalogV1` 和 `previewE2eSemanticInvocationV1` 直接交给 Base factory；不得新增 `projectE2eSemanticGameViewV1`、另一个 State reader 或另一个 Gameplay view model。每个 authoritative token 只创建一个 Queries，并由它同时生成 GameView 与 action catalog。`queryWitness` 只存在于 test fixture，用来证明 publication 的 game/actions 同源，不进入 production descriptor。

The adapter never delegates the raw GameSession dispatch envelope as its public result. `projectE2eSemanticActionResultV1` exhaustively maps committed execution to `{ kind: "committed" }`, preserves only player-visible rejection reasons, forwards the four public `not_executed` codes, and collapses an internal engine fault to `{ kind: "faulted", code: "gameplay_fault" }`. Its `dispatch` callback awaits Session dispatch and returns only this DTO. Type/runtime tests recursively reject Snapshot, State, RNG, facts, internal fault, attempt, or CommandLog keys; the headless runner and future Automation receive `E2eSemanticActionResultV1` only.

`createE2eGameRuntimeV1` 在本任务将 Task 6 临时 semantic adapter 替换为真实 `SemanticGamePortV1`，其他 unavailable subports 保持不变；相关 runtime factory test 必须证明一个 GameSession 同时驱动 semantic observe/subscribe/preview/dispatch，没有第二个 state cache。

headless runner 只接受 Semantic invocation list，逐项 await dispatch/waitForIdle，输出有序 semantic views/results；不创建 React、DOM、fake click 或 sleep。

- [ ] **Step 5: Add the read-only semantic gate**

scripts/verify-semantic.mts 固定运行 E2E Story 的 public headless semantic suite，覆盖：

- identical seed/action sequence deterministic equality；
- availableActions authored order and visible-only descriptors；
- preview/dispatch queue-front revalidation parity；
- atomic game/actions publication、status-only reference reuse 和 waitForIdle revision behavior without sleep；
- no Snapshot、State、RNG、facts、internal fault、attempt、CommandLog、DebugTools or tooling reachability in publications or nested preview/dispatch results。

Exact scripts：

```json
{
  "root": {
    "verify:semantic": "node --experimental-strip-types scripts/verify-semantic.mts"
  },
  "stories/e2e": {
    "verify:semantic": "pnpm --dir ../.. exec vitest run stories/e2e/src/runtime/e2e-semantic-game-port.test.ts stories/e2e/src/runtime/headless-runner.test.ts"
  }
}
```

verify-semantic.test.mjs freezes the delegated command，requires first-failure exit and rejects browser、regenerate、update、release or write commands。Phase 5 extends this same gate with DOM parity；it does not create a second semantic verifier。

- [ ] **Step 6: Run semantic, property, and boundary verification**

Run:

```bash
pnpm --filter @project-tavern/base exec vitest run src/runtime/application/semantic-game-port.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime
pnpm verify:semantic
pnpm verify:public-exports
pnpm verify:boundaries
pnpm typecheck
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；normal semantic operations produce the same final Snapshot digest as direct GameSession dispatch；Port does not expose Snapshot or tooling。

- [ ] **Step 7: Commit SemanticGamePort**

```bash
git add -- packages/base/src/contracts/application.ts packages/base/src/contracts/index.ts packages/base/src/index.ts packages/base/src/runtime/application packages/base/src/runtime/session/game-session.ts packages/base/src/runtime/session/game-session.test.ts packages/base/src/runtime/index.ts packages/base/public-exports.v1.json stories/e2e/src/runtime stories/e2e/src/application/create-e2e-game-runtime.ts stories/e2e/src/application/create-e2e-game-runtime.test.ts stories/e2e/package.json package.json scripts/verify-semantic.mts scripts/verify-semantic.test.mjs scripts/run-script-tests.test.mjs
git diff --cached --check
git commit -m "feat(runtime): add semantic game interaction"
```

### Task 11: Render the resolved E2E SceneGraph from the unified Web entry

**Files:**

- Modify: packages/ui/src/shell/game-shell.tsx
- Modify: packages/ui/src/shell/game-shell.test.tsx
- Modify: packages/ui/src/contributions/registry.ts
- Modify: packages/ui/src/contributions/registry.test.ts
- Create: stories/e2e/src/application/e2e-application-root.tsx
- Create: stories/e2e/src/application/e2e-application-root.test.tsx
- Modify: stories/e2e/src/application/entry.tsx
- Modify: stories/e2e/src/presentation/scene-graph.ts
- Create: stories/e2e/src/presentation/e2e-renderers.tsx
- Create: stories/e2e/src/presentation/e2e-renderers.test.tsx
- Modify: apps/web/e2e/walking-skeleton.spec.ts
- Modify: `apps/web/e2e/__screenshots__/e2e-shell.png`
- Test: packages/ui/src/shell/game-shell.test.tsx
- Test: stories/e2e/src/application/e2e-application-root.test.tsx
- Test: stories/e2e/src/presentation/e2e-renderers.test.tsx
- Test: apps/web/e2e/walking-skeleton.spec.ts

**Interfaces:**

- Consumes: ResolvedGame.sceneGraph、Presentation、SemanticGamePort and generic Web mount/Loader。
- Produces: one `E2eApplicationRootV1` React root that renders the resolved graph，derives enabled/disabled controls from semantic actions and never reconstructs SceneGraph or embeds raw Gameplay Commands in generic UI。`createE2eGameRuntimeV1` remains the non-React application/runtime port factory from Tasks 6/10。

- [ ] **Step 1: Write failing render-source and DOM parity tests**

```tsx
it("renders only the SceneGraph held by ResolvedGame", async () => {
  const fixture = await createE2eApplicationFixture();
  render(fixture.element);
  expect(screen.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();
  expect(fixture.storyDefineCalls()).toBe(2);
  expect(fixture.sceneGraphFactoryCalls()).toBe(1);
});

it("uses semantic action availability for the DOM control", async () => {
  const fixture = await createChoosingApplicationFixture();
  render(fixture.element);
  const chooseLeft = screen.getByRole("button", { name: "选择左侧" });
  expect(chooseLeft).toBeEnabled();
  await userEvent.setup().click(chooseLeft);
  expect(fixture.semanticInvocations()).toEqual([
    {
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    },
  ]);
});
```

- [ ] **Step 2: Run focused UI tests and confirm manual assembly remains**

Run:

```bash
pnpm --filter @project-tavern/ui exec vitest run src/shell src/contributions
pnpm --filter @project-tavern/story-e2e exec vitest run src/application
```

Expected: FAIL because the migrated entry still manually creates contributions and GameShell dispatches a raw increment command。

- [ ] **Step 3: Make the Story application the only composition point**

`E2eApplicationRootV1` 接收：

```ts
interface E2eApplicationRootPropsV1 {
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly host: GameHostV1;
}
```

它把 resolvedGame.sceneGraph 与 resolvedGame.presentation 传给 generic GameShell，并且只向 scene renderer 提供 narrow view slice 和 `application.semantic`；generic UI 删除 incrementCommand/incrementLabel special case。`e2e-renderers.tsx` 是 Web-only registry，以穷尽 typed map 将 data-only SceneGraph 中的 rendererId 解析为 React component，unknown/missing ID 返回稳定 composition failure；它不从 default Story entry 导出，只由 `E2eApplicationRootV1` 导入。所有 action buttons 由 descriptor 的 textId、enabled、reasons 和 invocation options 渲染。`entry.tsx` 仅 resolve 一次 Story、创建一次 `createE2eGameRuntimeV1`，再 mount `<E2eApplicationRootV1 ... />`；不得把 GameApplicationPort 当成 ReactNode，也不得重新定义一个 `createE2eApplicationV1` runtime factory。

renderer registry tests 必须覆盖所有 SceneGraph renderer IDs 恰好一次、unknown ID 稳定失败、renderer 只收到 narrow view/semantic port，并用 import-closure test 证明直接 Node import default Story/`scene-graph.ts` 不加载 `e2e-renderers.tsx`、React 或任何 `.tsx` module。

本任务不加入 Debug、Capability、Automation Bridge 或 InputRouter。

- [ ] **Step 4: Prove real Pointer/keyboard behavior and one server**

Playwright 覆盖：

- mouse click 完成 increment；
- Enter/Space 激活相同 native button；
- left/right branch 到 rejoin，再 continue；
- terminal summary；
- disabled action exposes reason text；
- reload creates a fresh run until Phase 3 persistence；
- only one 4173 server and no Developer route。

Run:

```bash
pnpm --filter @project-tavern/ui test
pnpm --filter @project-tavern/story-e2e exec vitest run src/application src/presentation
pnpm build:e2e
pnpm test:e2e:smoke
pnpm test:e2e:full
pnpm verify
git diff --check
```

Expected: 所有命令退出 0；DOM 与 Semantic invocation log 一致；UI receives no Snapshot；一个 physical activation 只 dispatch 一次。

- [ ] **Step 5: Update the reviewed screenshot and commit**

```bash
pnpm update:screenshots
git diff -- apps/web/e2e/__screenshots__/e2e-shell.png
git add -- packages/ui/src/shell packages/ui/src/contributions stories/e2e/src/application stories/e2e/src/presentation/scene-graph.ts stories/e2e/src/presentation/e2e-renderers.tsx stories/e2e/src/presentation/e2e-renderers.test.tsx apps/web/e2e/walking-skeleton.spec.ts apps/web/e2e/__screenshots__/e2e-shell.png
git diff --cached --check
git commit -m "feat(web): render the resolved e2e game"
```

### Task 12: Freeze E2E fixtures, golden vectors, Hotfix integration, and the Phase 2 gate

**Files:**

- Modify: stories/e2e/fixtures/session-zero.json
- Rename: stories/e2e/golden/counter-walk.json → stories/e2e/golden/semantic-flow.json
- Modify: stories/e2e/scripts/regenerate-fixtures.mts
- Modify: stories/e2e/scripts/verify-fixtures.mts
- Modify: stories/e2e/scripts/update-golden.mts
- Modify: stories/e2e/scripts/verify-golden.mts
- Rename: stories/e2e/scripts/verify-balance.mts → stories/e2e/scripts/verify-determinism.mts
- Create: stories/e2e/src/runtime/hotfix-integration.test.ts
- Create: stories/e2e/src/runtime/dependency-failures.test.ts
- Modify: stories/e2e/package.json
- Modify: package.json
- Create: scripts/verify-phase2-runtime.mts
- Create: scripts/verify-phase2-runtime.test.mjs
- Modify: scripts/run-script-tests.test.mjs
- Test: stories/e2e/src/runtime/hotfix-integration.test.ts
- Test: stories/e2e/src/runtime/dependency-failures.test.ts
- Test: scripts/verify-phase2-runtime.test.mjs

**Interfaces:**

- Consumes: all green Phase 2A/2B APIs、fixed E2E tooling commands、Hotfix resolver and read-only verifier framework。
- Produces: reviewed E2E fixture/golden bytes、1..1000 determinism driver、safe-mode/dependency failure coverage and a read-only pnpm verify:phase2 gate。

- [ ] **Step 1: Write failing integration and gate tests**

```ts
it("changes behavior and simulation identity for an official rule patch", async () => {
  const base = resolveE2eGame([]);
  const patched = resolveE2eGame([choiceDeltaHotfixV1]);
  expect(patched.provenance.resolved.simulationDigest).not.toBe(
    base.provenance.resolved.simulationDigest,
  );
  expect(patched.provenance.resolved.stateContractDigest).toBe(
    base.provenance.resolved.stateContractDigest,
  );
  expect(await playRightBranch(patched)).toMatchObject({
    game: { counterLabel: "计数 3" },
  });
});

it.each([
  createMissingDependencySimulation,
  createDependencyCycleSimulation,
  createDuplicateModuleSimulation,
  createDuplicateSlotSimulation,
])("fails composition before creating GameSession", (createInvalid) => {
  expect(createInvalid).toThrow();
  expect(gameSessionCreations()).toBe(0);
});
```

phase gate test freezes this exact command order:

```js
const expected = [
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:fixtures"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:golden"]],
  ["pnpm", ["verify:determinism"]],
  ["pnpm", ["verify:semantic"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact"]],
  ["pnpm", ["test:e2e:smoke"]],
];
```

- [ ] **Step 2: Run focused tests and confirm stale vectors/gates**

Run:

```bash
pnpm --filter @project-tavern/story-e2e exec vitest run src/runtime/hotfix-integration.test.ts src/runtime/dependency-failures.test.ts
node --test scripts/verify-phase2-runtime.test.mjs
pnpm --filter @project-tavern/story-e2e verify:fixtures
pnpm --filter @project-tavern/story-e2e verify:golden
```

Expected: integration/gate tests FAIL because files do not exist；fixture/golden verifiers FAIL because the migrated Sandbox bytes no longer match E2E identity and semantic flow。

- [ ] **Step 3: Implement deterministic vectors and explicit writers**

session-zero fixture 使用 fixed seed、sequence 0、initial integrity-free Phase 2 Snapshot 和 ResolvedGame test provenance。semantic-flow golden executes：

```text
flow.start
flow.choose right
flow.continue
run.complete
```

记录 final state digest、ordered Facts、RNG trace 和 terminal SemanticGameView。verify-determinism.mts 对 seeds 1..1000 运行同一 normal semantic action strategy 并确认 deterministic equality；不做酒馆 balance 结论。

regenerate-fixtures 与 update-golden 是唯一 writers；verify commands 只在临时内存生成 expected bytes 后比较，不写 tracked files。

package scripts 精确为：

```json
{
  "root": {
    "verify:determinism": "pnpm --filter @project-tavern/story-e2e verify:determinism",
    "verify:phase2": "node --experimental-strip-types scripts/verify-phase2-runtime.mts"
  },
  "stories/e2e": {
    "verify:determinism": "node --experimental-strip-types scripts/verify-determinism.mts"
  }
}
```

- [ ] **Step 4: Implement Hotfix safe mode and exact phase gate**

覆盖：

- rule/value official Hotfix；
- text-only Hotfix；
- duplicate ID、collision、unknown symbol、provider mismatch；
- candidate failure returns base ResolvedGame safe mode；
- no Hotfix ready result has base === resolved；
- Session creation only after ready/base choice。

verify-phase2-runtime.mts uses spawnSync without shell interpolation，first nonzero exit stops execution，and no command name contains regenerate、update: 或 release:prepare。

Phase gate 还必须用 `node --experimental-strip-types` 直接 import E2E default Story/SceneGraph 的 Node-reachable closure，证明 runtime `scene-graph.ts` 不依赖 JSX/browser transform，并且该 closure 不可达 `application/*.tsx` 或 tooling。`verify-phase2-runtime.test.mjs` 同时锁定 root `verify:phase2` script 的上述精确映射。

- [ ] **Step 5: Regenerate once, review, then prove read-only verification**

Run:

```bash
pnpm --filter @project-tavern/story-e2e regenerate:fixtures
pnpm --filter @project-tavern/story-e2e update:golden
git diff -- stories/e2e/fixtures stories/e2e/golden
before="$(git status --porcelain=v1)"
pnpm --filter @project-tavern/story-e2e verify:fixtures
pnpm --filter @project-tavern/story-e2e verify:golden
pnpm verify:determinism
pnpm verify:semantic
pnpm verify:phase2
after="$(git status --porcelain=v1)"
test "$before" = "$after"
pnpm verify
git diff --check
```

Expected: explicit writers update exactly the E2E fixture and semantic-flow golden；all read-only commands exit 0；status comparison exits 0。

- [ ] **Step 6: Commit Phase 2 evidence and gate**

```bash
git add -- stories/e2e/fixtures stories/e2e/golden stories/e2e/scripts stories/e2e/src/runtime/hotfix-integration.test.ts stories/e2e/src/runtime/dependency-failures.test.ts stories/e2e/package.json package.json scripts/verify-phase2-runtime.mts scripts/verify-phase2-runtime.test.mjs scripts/run-script-tests.test.mjs
git diff --cached --check
git commit -m "test(e2e): freeze the phase two runtime harness"
```

## Phase 2 Acceptance

从 Phase 2 最终 HEAD 运行：

```bash
pnpm install --frozen-lockfile
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:phase2
pnpm verify
pnpm verify:phase2
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git diff --check
git status --short --branch
```

Expected: 两次 Phase gate 与完整 verify 均退出 0；tracked hash 完全相同；最终工作树状态明确。

- [ ] Base root/runtime/testkit exports contain only GameSimulation、GameplayModule、ResolvedGame and GameSession new names；no old compatibility aliases。
- [ ] GameCommandExecutor has no createQueries method；GameSimulation owns createQueries and projectGameView。
- [ ] GameSimulation owns strict DebugCommand/error schemas plus queue-front validator/executor；Story tooling owns only fixtures/notes/form adapters。
- [ ] ResolvedGame retains one frozen GameSimulation、SimulationProgram、Presentation、SceneGraph、Assets and Provenance。
- [ ] Base exports strict neutral StageScene/variant/Character/rig/HitMap/Interaction/content-policy contracts and stable startup validation codes；it imports no PoC ID、renderer、React、DOM or project maturity names。
- [ ] Resolved SceneGraph is data-only `.ts` with a statically validated surface DAG；Web renderer registry is `.tsx` in the application closure and is unreachable from direct Node Story/Headless imports。
- [ ] workspace contains only Base、UI、Assets、Web、E2E Story and PoC Story；packages/modules、stories/sandbox and stories/demo are absent。
- [ ] E2E uses Story-local fixture modules and does not import PoC。
- [ ] one cross-owner command commits all owner slices or rolls back the exact input Snapshot/RNG/sequence。
- [ ] E2E contains a pausable branch/rejoin flow and terminal state but no tavern/AP/tax/facility/D1–D7 semantics。
- [ ] SemanticGamePort exposes one immutable atomic publication；each authoritative token creates exactly one Queries for GameView/actions, `availableActions()` returns the publication's same actions reference, status-only publications reuse GameView/actions, preview rebuilds Queries from a FIFO queue-front state-only read, and waitForIdle is deterministic without sleep。
- [ ] Headless runner and React DOM consume the same semantic availability、preview、dispatch and rejection semantics。
- [ ] pnpm verify:semantic runs the read-only E2E headless semantic contract；Phase 5 can extend the same gate with DOM parity。
- [ ] one E2E×Web Artifact is built at dist/e2e；no Player/Developer/Headless flavor or second server exists。
- [ ] official Hotfix、safe mode、dependency failures、fixed fixture/golden and 1..1000 determinism checks pass。
- [ ] pnpm verify:phase2 and pnpm verify are read-only and pass twice。
