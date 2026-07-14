# SillyMaker 游戏运行时与 Project Tavern Story 架构设计

日期：2026-07-12

状态：已确认；当前运行时与 Story 架构权威

适用基线：Phase 1 完成提交 `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2`

## 1. 权威范围

本文自包含地定义当前运行时术语、Story 所有权、Loader/Host、Application Port、Debug/Automation、Input、持久化和构建边界。

**SillyMaker** 是通用游戏引擎的正式名称，对应 `@sillymaker/base`、`@sillymaker/ui`、`@sillymaker/web` 及其定义的运行时协议；**Project Tavern** 是采用该引擎开发的实际游戏代号，对应游戏 Gameplay、素材、Story、Artifact、部署和仓库身份。公共类型继续使用 `GameSession`、`GameHost`、`ResolvedGame` 等职责名称，不添加品牌前缀。

本文与下列文档共同构成后续实施权威：

- [`2026-07-12-local-engineering-delivery-boundaries-design.md`](2026-07-12-local-engineering-delivery-boundaries-design.md)：素材准备、本地工程 Goal、最终人工审查与远端分发的轨道边界，以及无人值守审查、物化和恢复规则；
- [`2026-07-12-game-runtime-contract-catalog.md`](2026-07-12-game-runtime-contract-catalog.md)：Base envelope、PoC Gameplay、Save、Debug 与 Narrative 的当前字段级 ABI；
- [`2026-07-12-scene-interaction-character-presentation-design.md`](2026-07-12-scene-interaction-character-presentation-design.md)：StageScene、Character、HitMap、Interaction、内容特征过滤和 RuntimePresentation；
- 本文：运行时、Story、Loader/Host、持久化、能力和 Artifact 公共边界。

运行时术语和所有权冲突时本文优先；字段形状和稳定判别值冲突时 Contract Catalog 优先；表现与交互冲突时 Scene/Interaction 规格优先；交付轨道、人工/agent 审查、物化和恢复冲突时 delivery-boundaries 规格优先。Phase 2 破坏式迁移既有实现，不保留旧名称兼容别名。

本文不改变七日 PoC 的玩法规则和数值；这些继续由 `docs/poc/` 与 Contract Catalog 的具体字段控制，实施所有权改为 PoC Story。

## 2. 已有基础与必须保留的不变量

当前仓库已经交付并验证以下基础：

- 严格 JSON、Canonical JSON、Digest、Snapshot、RNG 和事务 attempt；
- Module ID、State Slot、依赖存在性和 DAG 校验；
- StoryDefinition 的 simulation/presentation 分面；
- bootstrap-only Hotfix、PatchSurface、素材和构建身份解析；
- 单 FIFO 权威 Session；
- Host、通用 UI、Web Loader、Walking Story、测试发现、边界、构建和发布验证骨架。

这些机制应迁移和复用，不应重写。Phase 2 将现有 walking Story 迁移为 E2E Story，并建立唯一的 PoC Story。

## 3. 最终术语

### 3.1 启动生命周期

```text
StoryEntry
    ↓ define()
StoryDefinition
    ↓ Hotfix、素材、身份与 Program 解析
ResolvedGame
    ├── GameSimulation
    ├── SimulationProgram
    ├── Presentation
    ├── SceneGraph
    ├── Assets
    └── Provenance
    ↓
GameSession
    └── GameSnapshot
```

- **StoryEntry**：Story npm 包唯一、无副作用的启动入口；源码合同仍可使用中性的 `GamePackageV1`。
- **StoryDefinition**：Hotfix 和素材解析前的 source definition。
- **ResolvedGame**：解析完成、深冻结、可创建 GameSession 的完整组合根。
- **GameSimulation**：确定性 Gameplay 的静态模块组合，不包含 Presentation、SceneGraph、Assets 或 Provenance。
- **GameSession**：一次实际运行；持有唯一权威 GameSnapshot 和统一 FIFO。
- **GameSnapshot**：Gameplay State、RNG、commandSequence 和引擎拥有的 RunIntegrity。

`ResolvedGame` 可以是不可变超级对象，但只能组合已分离能力，不能变成实现全部业务的 God Object。`World` 保留给未来活动世界、地图或世界状态，不用于组合根。

## 4. Workspace 与 Story

当前只保留具有明确用途的两个 Story：

```text
engine/
  packages/
    base/      @sillymaker/base
    ui/        @sillymaker/ui
    web/       @sillymaker/web

game/
  packages/
    assets/    @project-tavern/assets
  stories/
    e2e/       @project-tavern/story-e2e
    poc/       @project-tavern/story-poc
```

- `game/stories/e2e` 是本地 Automation、AI agent 和未来 CI 共用的引擎集成夹具；
- `game/stories/poc` 是当前七日酒馆可玩原型；
- 不预建 Sandbox、Demo、Full、`game/stories/common` 或其他 Story；
- 不预建通用 Gameplay modules 包；未来出现至少两个真实消费者后再创建共享 Gameplay 包；
- `game/packages/assets` 继续提供共享素材合同和经选择的跨 Story 资产；Story 可拥有本地素材。
- 所有 workspace package 都是 private ESM package；跨 package 依赖只通过显式 package `exports`、TypeScript project references 与 `workspace:*` 建立，不能读取兄弟 package 的 `src/**` 内部路径；
- Base 公共 barrel 必须逐项命名导出，禁止 `export *` 造成 ABI 意外扩张；其他 package 也应让公共入口保持显式、可审查；
- 第三方依赖在 manifest 中使用精确版本并由共享 lockfile 冻结；内部 workspace 依赖使用 `workspace:*`，不复制本地版本号；
- package-manager lifecycle scripts 使用显式 allowlist，`pnpm-workspace.yaml#onlyBuiltDependencies` 在没有经过逐项审查的依赖前保持空数组。

E2E 不依赖 PoC 的状态、命令、剧情、平衡、ID、规则、素材或私有实现。

## 5. Gameplay 所有权

`domain` 不再作为游戏源码主目录；使用 `gameplay`：

```text
game/stories/poc/src/
├── gameplay/
│   ├── contracts/
│   ├── modules/
│   ├── rules/
│   ├── resolvers/
│   ├── game-command-executor.ts
│   ├── game-queries.ts
│   ├── game-view-projector.ts
│   └── game-simulation.ts
├── content/
├── presentation/
├── application/
├── tooling/
├── story-definition.ts
└── index.ts
```

- **GameplayModule**：有状态或无状态的玩法所有权边界；
- **Rule**：纯公式或约束；
- **Resolver**：根据明确输入求出结果；
- **Compiler/Projector/Validator**：分别负责编译、投影和验证；
- **GameCommandExecutor**：跨 Module 原子命令编排；
- **GameQueries**：针对一个 Gameplay State 创建的只读组合读取能力。

不建立宽泛 Gameplay `Service` 或 `services/` 目录。基础设施使用 `HostPort`、`StoragePort`、`DownloadPort`、`LoggerPort` 等具体名称。

体力、具体属性、NPC、人物关系、任务、对话、酒馆、设施、探索和 PoC Effect 联合均属于 `game/stories/poc`，不属于 Base。

## 6. GameplayModule 与 GameSimulation

### 6.1 Module 合同

每个 GameplayModule 声明：

- 稳定 Module ID 和合同 revision；
- 自己拥有的零个或多个 State Slot；
- 显式只读 dependencies；
- Command/Query Schema；
- stateful Module 的 State Schema、初始值、局部 invariants、Read Port、owner proposal/apply；
- stateless Module 的强类型 `capabilities`，具体成员使用 Rule/Resolver 等名字；
- simulation/presentation digest 贡献；
- contract tests 和可选 UI contribution。

`defineGameSimulation` 在启动期验证：

- Module ID 和 State Slot 唯一；
- 每个非空 State Slot 恰有一个 stateful Owner；
- stateless Module 不拥有 State Slot 或写 capability；
- dependency 存在、只读且无环；
- dependency port 与声明一致；
- 聚合 Schema 封闭；
- GameCommandExecutor、GameDebugCommandExecutor、GameQueries、GameView projector 与同一 type map 闭合。

Module 不能读取完整 Snapshot，不能写其他 Owner 的 State Slice，不能监听 GameplayFact 后重新应用状态。

### 6.2 Executor 与 Queries 正交

命令执行与只读查询是两个职责：

```ts
interface GameCommandExecutorV1<TSnapshot, TCommand, TContext, TAttempt> {
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TCommand>,
    context: TContext,
  ): TAttempt;
}

interface GameDebugCommandExecutorV1<
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

type GameDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "validation_failed";
      readonly errors: readonly TValidationError[];
    };

interface GameSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
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
  readonly modules: GameplayModuleTupleForSimulationV1<TTypes, TModules>;
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

`GameCommandExecutor` 不提供 `createQueries`。GameSimulation 的 query factory 只接收 Gameplay State，projector 只接收已经创建的 Queries；Application 从 Snapshot 中取 `.state`，因此这两条 Story-owned 路径在类型和运行时都拿不到 RunIntegrity/RNG/sequence。Replayable DebugCommand 的 strict Schema、queue-front `validate`、owner proposal mapping 和 attempt semantics 由同一 Story/GameSimulation 的 `GameDebugCommandExecutor` 拥有，并进入 `simulationDigest`。Generic DebugTools 在 FIFO 队首先调用 `validate`；只有 `allowed` 才恰好调用一次 `executeAttempt`，而 `validation_failed` 不创建 attempt、不进入 CommandLog。Debug executor 不标记 RunIntegrity，GameSession 只在其 committed result 外层原子标记；被允许的 attempt 只能 committed 或 faulted，返回 rejected 属于 engine contract fault。Fixture/DebugBundle anchor 不是 replayable DebugCommand，不进入该 executor。具体执行顺序、Effect routing、Rules 和 Resolvers 由 Story 的 executor 实现。

`createInitialState` 在 Session 时只接收 bootstrap entropy/identity，不把 Story Program 扩大成第二个 bootstrap 输入。若 post-Hotfix Simulation Program 含有一个 stateful Module 的初始值，`createGameSimulation(program)` 必须在 ResolvedGame 冻结前从已严格解析、深冻结的 owner-only 初始 Slice 构造该 binding 实例。Module 的类型、ID、数量、顺序、descriptor 和 State Slots 仍是静态封闭的；不得把完整 Program、可变全局、时间或随机能力捕获进单个 Module。Aggregate initializer 必须从 GameSimulation 中的同一 binding tuple 调用各 `createInitialState(bootstrap)` 并组装 State；不得先使用一组无 Program 的 singleton 初态，再以 sequence-zero owner proposal 改写。Base 会将 aggregate 中每个 owner Slice 与对应 Module 初态做 Canonical JSON byte equality，并在初始 State 创建时拒绝任何偏离。

### 6.3 原子事务

一次命令：

```text
验证 Command
→ 克隆候选 Snapshot/RNG
→ 读取窄 Read Ports
→ 调用 Rules/Resolvers
→ 各 Owner propose/apply 自己的 Slice
→ 汇总有序 GameplayFacts/账本
→ 全量 Schema/invariants
→ 一次提交或完整回滚
```

拒绝和 fault 保留输入 Snapshot/RNG/sequence 的同一引用；GameSession 不为日志重新执行命令。

## 7. ResolvedGame

ResolvedGame 必须保留完整的已解析组合根：

```ts
interface ResolvedGameV1<TGameSimulation, TSimulationProgram, TPresentation, TSceneGraph, TAssets> {
  readonly provenance: BuildProvenanceV1;
  readonly gameSimulation: TGameSimulation;
  readonly simulationProgram: TSimulationProgram;
  readonly presentation: TPresentation;
  readonly sceneGraph: TSceneGraph;
  readonly assets: TAssets;
  readonly frozen: true;
}
```

Resolver 顺序保持：define → fresh Patch registries → Hotfix → revoke writes → materialize Programs once → validate/deep-freeze → create GameSimulation once → resolve assets/identities → freeze ResolvedGame。source simulation facet 的 `StateContractManifestV1` 在 define validation 阶段先被严格解析成 exact、data-only、canonical 且深冻结的权威投影；GameSimulation 创建并验证后，Resolver 再把 manifest 中全部且仅有的 stateful Module `moduleId + moduleContractRevision + stateSlots` 与实际 bindings 精确交叉验证。manifest 自身非法是 `story.contract_invalid`，合法 manifest 与 GameSimulation 不一致是 `story.simulation_invalid`；stateless Module 不得登记。

Resolver 的 fresh-definition determinism 分两层验证：Simulation 和 ordinary Strict JSON data facets 使用既有 safe-integer Canonical JSON 比较；resolved Presentation Program 与 SceneGraph 使用 Presentation-only tagged canonical projection 比较。该 projection 把每个有限 binary64 number 编码为 `Number::toString` shortest-round-trip string 并保留 value-kind tag，拒绝 `NaN`、正负 Infinity 与 `-0`，最终仍由既有整数-only Canonical JSON encoder 产生 bytes。Rule/Resolver/lifecycle 等 executable capabilities 必须是模块级稳定函数引用，或带稳定 provider ID/source digest 的受控 descriptor，并按允许键、引用稳定性与 import-closure digest 校验。不得把函数放进 JSON 投影后因其被丢弃而误判为相同，也不得接受每次 `define()` 新建的匿名/nondeterministic executable provider。

SceneGraph 必须来自 resolved Presentation，应用入口不能再从 source Story 重取或创建第二份图。改变 stateful GameplayModule 集合、Module contract revision/state slots、aggregate/module/persistent-IR Schema descriptor 或可持久稳定引用集合必须改变 state-contract identity，并因 simulation root 绑定该摘要而同时改变 simulation identity。改变 stateless Module/capability、Command/Fact/Debug Schema、executor、控制流、Rule provider、公式或平衡值只改变 simulation identity；纯文本、素材、SceneGraph 和布局只改变 presentation/application identity。

默认 Story/Headless import closure 中的 SceneGraph 是 Node 可直接 type-strip 导入的 `.ts` 数据描述符：只包含稳定 renderer ID、layout/slot descriptor、typed binary64 geometry 和其他可验证 presentation data，不包含 JSX、React component、函数或浏览器对象。显式 `StrictJsonObjectV1` 字段仍只接受 safe integers；小数只存在于 Presentation 合同明确声明的有限数值字段。Story 的 Web-only `.tsx` renderer registry/contribution 在 application closure 中把 renderer ID 解析为组件；它影响 application identity，但不能反向进入 GameSimulation、默认 Story entry 或 Headless closure。

### 7.1 Loader、Host 与 Story 启动所有权

Loader 是中性的启动控制器，只负责取得 StoryEntry、按显式顺序取得 Hotfix、调用 resolver、归一化 bootstrap failure、建立 GameSession/Application，以及在候选补丁失败时提供无补丁安全模式。Loader 不拥有主菜单、继续游戏、设置、玩法场景、VN、内容成熟度或任何 Story 流程。

Host 只提供平台能力：entropy、原子记录存储、文件导入导出、日志、导航和浏览器生命周期。Story、GameplayModule、Rule、Resolver 和 renderer 不得获得原始平台对象、裸 IndexedDB transaction、环境随机或可绕过 Host Port 的存储入口。

通用 `@sillymaker/web` 存储适配器要求 Application 注入稳定 database name，不内置 SillyMaker 或 Project Tavern 默认值。Project Tavern 玩家应用使用 `project-tavern.runtime`，E2E 应用使用隔离的 `project-tavern.e2e.runtime`；采用 SillyMaker 的其他游戏提供自己的名称，避免引擎品牌成为具体游戏的持久化命名空间，也避免测试应用污染玩家数据。

`createWebHostV1` 的 persistence composition 精确二选一：production 提供 `databaseName` 并由 Web Host 使用浏览器 IndexedDB，测试或替代 Host composition 显式提供 `HostAtomicRecordStoreV1`；两者不能同时出现，也不能同时缺失。无 IndexedDB 的 production Web Host 安装稳定失败的 degraded store，不能静默使用内存后谎报持久化成功。Base 的 memory record-store factory 只从 `@sillymaker/base/testkit` 暴露，不进入 Base root 或 production Story closure。

`StoryEntry.define()` 必须同步、无参数且可重复调用。在模块 import 和 define 阶段禁止网络、存储、真实时间、环境随机、DOM 查询和其他平台 I/O；这些操作只能在 Loader/Host 建立明确适配器后发生。Story package 的默认入口只暴露 StoryEntry，不因主菜单、开发工具或某个 Host 再创建第二个游戏入口。

### 7.2 Narrative 与 UI Scene 分面

可保存的 Narrative cursor/持久 IR Schema descriptor，以及 Gameplay State/持久 IR 可以引用的封闭 authored scene/node 等稳定 ID 集合属于 state contract；条件、检定、命令、分支、Effect 与完整控制流语义属于 simulation。真实文本、视觉 cue、角色姿态、素材和布局属于 presentation。Authoring 文件可以同时贡献这些分面，但 resolver 必须编译、校验并分别摘要，Presentation 不能反向决定 Gameplay 可用性。

Narrative 节点只使用封闭、可验证的数据联合，不接受 callback、函数名、脚本字符串、`eval`、反射或通用表达式语言。一次选择或检定的条件读取、RNG、Effect、游标推进、Workflow 和 GameplayFacts 属于同一个 GameCommandExecutor attempt，要么一起提交，要么完整回滚。文字冒险、关系事件和经营事件复用同一 Narrative/Command/Workflow，不另建第二套叙事运行时。

### 7.3 PatchSurface、Hotfix 与身份摘要

Story 分别暴露 Simulation `rule | value` 与 Presentation `value | text | asset` PatchSurface。Hotfix 只在 bootstrap 阶段按调用方给出的顺序安装；`requires` 只能引用更早条目，`conflicts` 必须显式拒绝，覆盖同一 Symbol 时后者必须通过 `supersedes` 精确声明当前 provider，禁止隐式 last-wins。

每次解析使用 fresh registries。Hotfix 安装必须同步、确定、无平台 I/O、真实时间、环境随机或进程级可变状态；resolver 在安装后撤销写 capability、深冻结结果并验证 provider digest、Patch trace 和完整 Story。任一补丁失败都不产生部分 ResolvedGame 或 GameSession；已验证的无补丁 Story 可以作为显式安全模式重新 bootstrap。

身份始终分层保存：Story source、state contract、simulation、presentation、engine、application 和 PatchSet 不能合并成一个 app version。摘要使用 domain-separated SHA-256 和 Canonical JSON；`presentationDigest` 额外覆盖 post-Hotfix resolved Presentation Program 与完整 SceneGraph 的 Presentation-only tagged canonical bytes，使小数 geometry 或 Presentation Program 变化只改变 presentation/application identity。`story.digest` 可以作为 combined source 诊断，但不得再嵌入 simulation/presentation root：`simulationDigest` 直接绑定 Story identity、simulation source、post-Hotfix Program、GameSimulation manifest 与 simulation PatchSet，`presentationDigest` 直接绑定 Story identity、presentation source、resolved Presentation/SceneGraph、Asset Pack identities 与 presentation PatchSet，因此任一 source facet 变化都不会污染另一个 resolved root。可执行 provider 绑定构建生成的 workspace-relative POSIX import-closure/source digest，不使用 `Function#toString()`。时间戳、mtime、临时目录、绝对路径、chunk 名和运行时 capability 状态不进入确定性身份；无法明确归类但可能改变权威结果的生产输入保守进入 simulation。State digest 只覆盖完整 GameSnapshot，包括 RunIntegrity，不覆盖 provenance、slot、lineage、CommandLog、runtime failure 或 UI 状态；SceneGraph 也不进入 Save、CommandLog 或 Replay。

`stateContractDigest` 的输入冻结为 `digestCanonical("sillymaker:state-contract:v1", { story: storyIdentity, revision: stateContractRevision, manifest: validatedStateContractManifest })`。它不包含整个 simulation source/import closure、Rule、公式、平衡、Patch provider 或 Presentation；实际 GameSimulation stateful binding metadata 用于交叉验证该显式 manifest，完整 GameSimulation manifest 则继续进入 `simulationDigest`。`RuntimeSchemaV1.parse` 是 opaque executable，Resolver 不反射其结构；State/持久 IR Schema 语义变化必须由 Story 作者提升对应 schema descriptor revision，可持久稳定引用集合变化必须更新 reference set。这样即使错误遗漏外层 `stateContractRevision`，正确更新的内层 manifest 仍会令 digest 漂移。

Save adoption 只能由与 Story、state-contract revision/digest、engine、from/to simulation digest 和完整 simulation PatchSet digest 精确匹配的声明授权；单个 Hotfix 不能自行授权 adoption，额外的 simulation 补丁会自动使声明失效，纯 presentation 补丁不改变该判断。

## 8. GameSession 与 RunIntegrity

GameSession 使用一条 FIFO。Gameplay dispatch、合法 Save load/import、生命周期替换、replayable DebugCommand、fixture/DebugBundle anchor 和 Semantic preview 的权威读取共享同一串行化边界。Semantic preview 在轮到自己的队首时取得最新 Gameplay State，再创建 Queries；不能在调用时缓存旧 Snapshot 后越过已排队的 dispatch。

为保持单一权威，`RunIntegrityV1` 进入引擎拥有的 GameSnapshot envelope，但不进入 Story Gameplay State。Rules、Resolvers、owner ports、GameQueries 和 GameView projector 都不能接收、读取或修改它；Story executor/candidate 只能把它当作 opaque engine metadata 原样保留：

```ts
interface RunIntegrityV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: NonNegativeSafeInteger;
  readonly firstMutationSequence: NonNegativeSafeInteger | null;
  readonly reasons: readonly RunIntegrityReasonV1[];
}
```

`reasons` 最多 16 项，按首次出现顺序保留稳定 reason kind；`mutationCount` 永不截断。成功执行绕过正常玩法规则的 DebugCommand 或 fixture/debug anchor 后，GameSession 与 Snapshot 在同一原子提交中标记 `modified`。结构验证失败、`validation_failed`、faulted DebugCommand、只读 Debug、普通 Gameplay Command、合法 Automation 和 AI 游玩不改变 integrity。

Snapshot/status 订阅是通知机制，不是事务的一部分。GameSession 必须逐个隔离 subscriber exception，继续通知其余 listener，并把异常交给注入的、不可重入修改权威状态的 runtime-failure sink；listener 抛错不能改变已提交 attempt、FIFO tail、Session status 或公开 Promise 结果。

Save、State Dump、replay base 和 DebugBundle 保存 integrity；Snapshot digest 覆盖它。Runtime capability 的当前开关不进入 Snapshot、Save、state-contract digest 或 simulation digest。

## 9. 统一 Application Port

不再存在 Player/Developer 两套应用。每个 Story/Host 只有一个应用组合：

```ts
interface GameApplicationPortV1<
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

普通 Story Renderer 只接收所需窄 Port；DevDock 才接收 `debugTools`。代码是否存在于 bundle 不是权限边界；所有 DebugTools 操作在执行点重新检查 capability，关闭时返回稳定 `capability_disabled`，且不进入 GameSession FIFO。

DebugTools 的 capability policy 由 Application 外层统一表达，不污染已经获准执行的 Story-specific operation result。八个操作均返回 `DebugToolsOperationResultV1<TAllowedResult> = TAllowedResult | { kind: "capability_disabled" }`；fixture list 的成功值精确为 `{ kind: "listed", fixtureIds }`。因此已授权的空列表与调用时 capability 被撤销是两个可判别结果，不能用 `[]`、Promise rejection 或异常代替拒绝。

运行时只有一个 `GameApplicationPort` 和一个 Story application root。`PlayerPersistencePort` 等表达玩家低权限范围的子端口可以保留；不存在独立 Developer application root、Developer Artifact，也不把代码是否存在于 bundle 当作权限边界。

## 10. Runtime Capabilities 与 Story Tooling

```ts
type RuntimeCapabilityIdV1 = "debug_tools" | "cheats" | "automation_bridge";

interface RuntimeCapabilitiesV1 {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge: boolean;
}

type RuntimeCapabilityOperationResultV1 =
  | {
      readonly kind: "updated" | "unchanged";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    }
  | {
      readonly kind: "rejected";
      readonly code: "conflict" | "unavailable";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    };

interface RuntimeCapabilityPortV1 {
  readonly state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  setEnabled(
    capability: RuntimeCapabilityIdV1,
    enabled: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1>;
}
```

- 一个全新的 Host preference store 中三个 capability 都是 false；已保存的本地偏好在后续启动时恢复；
- DebugTools 开启只提供只读诊断和工具 UI，不污染 integrity；
- Cheats 开启后才允许 Story 定义的状态修改 DebugCommand；
- Automation Bridge 开启只暴露 SemanticGamePort，绝不暴露 DebugTools；
- 开关属于 Application/Host 设置，可以保存在本地偏好中；改变开关不重新解析 Story、不重建 GameSimulation、不改变任何 game identity；
- Web URL 可以在当前页面会话中显式请求闭合集合内的 capability；effective state 是 `persisted OR session-requested`，URL 请求不写回持久偏好，重新加载无该参数页面即可移除。URL 缺席表示“不提供会话覆盖”，而不是清空用户已经保存的偏好；自动化/验收必须使用隔离的全新 store/context，证明结束后没有持久副作用；
- DebugBundle 记录导出时的 capability state 和 RunIntegrity。

`StoryToolingEntryV1`/`StoryToolingSupportV1` 是同一 Artifact 中可延迟加载的 Story tooling，不建立独立 build。fixtures、开发备注和把受控表单输入构造成已声明 DebugCommand 的 UI adapter 可以在 capability 开启时动态导入。Replayable DebugCommand 的 Schema、验证、owner proposal 和 attempt 语义不得放在 lazy tooling 中；它们属于 resolved GameSimulation，并进入 `simulationDigest`。

## 11. SemanticGamePort

Headless Runner、本地 Automation、AI Agent、人类 UI 和未来 CI 使用同一语义操作来源：

```ts
interface SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus> {
  readonly revision: NonNegativeSafeInteger;
  readonly status: DeepReadonly<TStatus>;
  readonly game: DeepReadonly<TGameView>;
  readonly narrative: DeepReadonly<TNarrativeView>;
  readonly actions: readonly DeepReadonly<TActionDescriptor>[];
}

interface SemanticGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  observe(): DeepReadonly<
    SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>
  >;
  subscribe(listener: () => void): () => void;
  availableActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<
    DeepReadonly<SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>>
  >;
}

interface SemanticGamePortSourceV1<TState, TStatus> {
  getCurrentState(): DeepReadonly<TState>;
  getAuthoritativeRevisionToken(): object;
  getStatus(): DeepReadonly<TStatus>;
  subscribe(listener: () => void): () => void;
  reportSubscriberFailure(error: unknown): void;
  readStateAtQueueFront<TResult>(
    reader: (state: DeepReadonly<TState>) => TResult,
  ): Promise<TResult>;
}

interface SemanticGamePortInputV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly source: SemanticGamePortSourceV1<TState, TStatus>;
  createQueries(state: DeepReadonly<TState>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  projectNarrativeView(queries: TQueries): TNarrativeView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}
```

Story 特化的 `TInvocation` 必须是 strict、可序列化的闭合联合；它不能携带 callback、任意 State 路径或脚本。Semantic action descriptor 至少包含稳定 ActionId、TextId、enabled、按声明顺序排列的禁用原因和构造 invocation 所需的受控选项。`observe().game`、`observe().narrative` 与 `observe().actions` 必须由同一次 `createQueries`、同一个 authoritative token 和同一个 semantic revision 原子发布；`availableActions()` 只返回当前 publication 中 `actions` 的同一引用，不另行读取 State 或创建 Queries。

约束：

- 只观察当前玩家理论上可见的信息；
- 只执行当前可用的合法 Gameplay Command；
- preview 通过 `readStateAtQueueFront` 在 FIFO 队首读取最新 State 并重建 Queries；dispatch 在 executor 的 FIFO 执行点以同一 Rule/Query 语义完成最终再验证；
- 不暴露 Snapshot、Owner capability、隐藏剧情条件或 DebugTools；
- UI 与 Automation 使用同一 action availability、preview、dispatch 和 rejection 语义；
- `waitForIdle` 解决异步消费竞态，不使用任意 sleep；
- Automation 使用正常语义操作不改变 RunIntegrity。

`SemanticGamePortSourceV1` 是 Base/Application 在 bootstrap 时使用的内部组合输入，不通过 `GameApplicationPort` 暴露给 UI、内容、Hotfix 或 Automation，也不接受运行时提供的任意 reader。Base 的 factory 只把 Gameplay State 交给已解析 Story-owned `createQueries`，不会把完整 Snapshot、RunIntegrity、RNG 或 sequence 传入 Semantic callback。`getAuthoritativeRevisionToken()` 只提供不可解构的引用恒等 token，使 factory 能识别 envelope 替换而不暴露任何字段。每次新的 authoritative token 恰好创建一次 Queries，并从它同时投影 immutable GameView、NarrativeView 与 action catalog；status-only publication 复用这三个引用。`reportSubscriberFailure` 把 Semantic listener 异常转发到与 GameSession observer 相同的有界 runtime-failure sink；factory 必须继续通知其余 listener，sink 自身异常也被隔离。`revision` 只在该权威 token 改变时递增；busy/idle 等 status 改变可以发布新的 immutable publication，但不能伪造一次 Gameplay revision。Lifecycle/load/anchor 造成的权威替换也必须发布。React 通过 `subscribe`/`useSyncExternalStore` 消费 immutable publication；Story Application 可以从同一 publication 生成更丰富的 `RuntimePresentationView`，其中 Narrative 直接复用 publication 的独立 `narrative` 值，操作、禁用状态和原因复用同一 publication 中的 action catalog。浏览器 E2E 同时验证 Port 和真实 DOM，不能用 Port 替代可访问性测试。

## 12. Input

Input 是 UI/Host 引擎能力，不是 GameplayModule，不进入 GameSnapshot 或 Save：

```text
Pointer / Keyboard / Gamepad
          ↓
     Input Adapter
       ↙        ↘
semantic control  viewport point/cancel/focus-loss
       ↓                     ↓
SemanticGamePort/UI    Stage/renderer hit-test
                             ↓
                  typed InteractionActivation
```

第一版：

- `engine/packages/ui/src/input` 提供 InputAction、InputContext 和 InputRouter；
- `engine/packages/web/src/input` 提供 Pointer Adapter；
- 使用 Pointer Events 同时兼容鼠标、触摸和触控笔；
- Web Adapter 只拥有 DOM Pointer 生命周期、去重、viewport point、cancel 和 focus-loss；Stage/renderer 拥有 CSS transform、局部归一化坐标和 HitMap；
- 普通交互继续使用原生 `<button>`、表单和焦点行为；
- System、Overlay、Narrative、Interaction、Gameplay 和 Debug 使用显式 Context；正常优先级为 `System > Overlay > Narrative > Interaction > Gameplay`，活动 Debug surface 消费自身注册输入且不穿透；
- 一次物理操作只能产生一次语义 dispatch；
- 触摸目标至少 44×44 CSS px。

键位重绑定、复杂手势和 Gamepad Adapter 延后；键盘原生激活和无障碍测试仍是第一版必需项。

## 13. E2E Story

E2E Story 是最小、稳定、确定性的引擎夹具，不加载 PoC 酒馆模块。它至少包含：

- 2–3 个 stateful fixture owners；
- 1 个 stateless resolver capability；
- 1 个显式只读 dependency；
- 1 个跨 owner 原子 Command；
- 1 个可暂停并继续的 Workflow；
- 1 个 Narrative branch/rejoin；
- 1 个 terminal state；
- GameQueries、GameView 和 SemanticGamePort；
- rule/value Hotfix；
- fixed fixture/golden/determinism vectors。

E2E 验证缺失依赖、循环、重复 ID/slot、跨 owner 回滚、reject/fault、RNG、Save、Replay、Hotfix、SceneGraph、Host/UI 和 Automation。它不包含 AP、酒馆营业、税负、设施、WorldAction、D1–D7 或 PoC 关系语义。

## 14. PoC Story

七日酒馆的具体 Gameplay 全部位于 `game/stories/poc`：

- Run、Calendar、Actors、Status、Inventory、Facilities、Tavern、Workflow、Progression、Narrative；
- Demand、Settlement、Check、Ending Rules/Resolvers；
- Effect routing 和 `PocGameCommandExecutor`；
- Contract Catalog 中十种 replayable debug command 的 closed `PocDebugCommandV1`、Schema、validation 和 `PocGameDebugCommandExecutor`；`debug.fixture.load` 仍是独立 tooling anchor，不属于该联合；
- `PocGameQueries` 和 GameView/Semantic projection；
- 具体属性、关系、任务、NPC、内容、文本、SceneGraph 和资产；
- golden、1..1000 seed、Save/Debug fixtures。

原 Phase 2 的具体十二模块工作迁入 PoC；为控制计划大小，Phase 4 分为：

- Phase 4A：PoC Gameplay 与 GameSimulation；
- Phase 4B：七日内容、Narrative、Golden 和 Balance。

## 15. Persistence、Replay 与 Diagnostics

Host record-store、严格 Save envelope、CommandLog 和单 FIFO 必须满足：

- Save/Quick/Auto/Manual 操作不消耗 Gameplay RNG、不产生 GameplayFact、不推进 commandSequence；
- load/import/adoption/anchor 在同一 GameSession FIFO 原子替换 Snapshot 和 RunIntegrity；
- compatibility 比较 Story、state-contract、engine 和 simulation identity；
- Base 先验证 Save envelope/integrity/provenance；Story validator 只接收 Gameplay State 做 reference/invariant 校验，不能读取或改写完整 Snapshot envelope；
- CommandLog 有界，记录 executor 实际收到的已解析 `{ source: "game", command }` 或 `{ source: "debug", command }`，不记录 Semantic invocation；Facts 只作输出证据，不作为 replay 输入；
- successful DebugCommand 由 GameSession 在同一个 queue item 中先完成 integrity finalization，再把最终 Snapshot 同时用于公开 attempt、live state、CommandLog digest 和 replay evidence；
- DebugBundle 包含 ResolvedGame provenance、capability state、RunIntegrity、replay base、CommandLog、当前 Snapshot、两个 digest 和有界 runtime failures；
- DebugTools 与 Automation Bridge 分离；
- HMR digest 变化使当前 GameSession invalidated，同一个 Story application root 完整重建；不存在 Developer-only root。

固定存档槽位为 `auto.current | auto.previous | quick | manual`。玩家只能显式写 Quick/Manual；Auto policy 在成功提交后的最新 Snapshot 上串行轮换 current/previous，合并同一事件循环内的重复请求，旧写入不得覆盖更新 replay anchor。`auto.previous` 只作为显式 recovery candidate，不自动覆盖 current。所有写入使用 compare-and-swap revision 与 lease/fencing；冲突、失去 lease、不可用和损坏均返回稳定结果，不依赖“先 list 再假设未变”。

GameSession 在接受权威操作时同步发布 busy。Persistence 在自己的 FIFO 项到达队首时捕获候选 Snapshot/identity，写入后重新读取并校验 exact bytes/revision；失败不能部分替换 Session。导入顺序固定为 bytes → Strict JSON → envelope Schema → state digest → compatibility/adoption → stable references → invariants，任一阶段失败都不能写 IndexedDB 或改变 live publication。Save 原始输入上限为 5 MiB。

CommandLog 最多保留最近 200 次已进入 executor 的 gameplay/debug attempts；裁剪日志时同步把 replay base 前移到被裁剪前缀之后的权威 Snapshot。重放只重新提交记录的 Command，绝不重新应用 GameplayFacts、账本或 UI action。DebugBundle 原始输入上限为 20 MiB，默认不包含绝对路径、浏览器历史、任意 Host storage、未选择文件或未裁剪异常；导出前 UI 展示已验证的内容类别和编码后大小，始终由用户显式保存且不自动上传。

当前只有开发基线，无向前兼容承诺。Phase 2 ABI 迁移后显式重生成 E2E fixture，不编写旧格式 Save 迁移器。

## 16. UI 与 Debug 工具

- `@sillymaker/ui` 提供中性的 Shell、Stage、Overlay、VN、Input、DevDock framework 和可访问组件；
- PoC HUD、关系、任务、营业、设施和 Scene renderers 位于 `game/stories/poc/src/presentation`；
- E2E 拥有自己的最小 Scene；
- DevDock 与 Story tooling 随同一个 Artifact 提供，默认隐藏，可延迟加载；
- 开启 Debug/Cheat 不改变 ResolvedGame 或 GameSimulation identity；
- UI 永远不获得 Snapshot setter、Owner capability 或任意属性路径编辑器。

## 17. 构建与 Artifact

不存在 Player、Developer 或 Headless build flavor：

```text
Artifact = Story × Host
Runtime behavior = RuntimeCapabilities
```

当前闭合集合：

```text
e2e × web → dist/e2e
poc × web → dist/poc
```

构建请求为：

```ts
interface ArtifactBuildRequestV1 {
  readonly story: "e2e" | "poc";
  readonly host: "web";
  readonly outDir: "dist/e2e" | "dist/poc";
}
```

公共脚本最终使用 `pnpm build:e2e` 和 `pnpm build:poc`。Vite Dev Server、HMR、压缩和 source map 是工具环境，不是玩法或 Artifact flavor。Release Artifact 不含 source map、`references/`、`art-source/aigc/`、绝对本机路径、秘密或未准入远程素材。

Artifact 可以包含 Debug/Tooling code；验证默认 capability 关闭、受控开启和作弊留痕，不能通过扫描 bundle 中是否出现 Developer 符号来代替运行测试。第一轮工程轨道只在本地构建和验证两份 Artifact；未来远端分发适配器必须消费这些 exact bytes，不得重新构建。

## 18. 测试分层

```text
Base contract/property tests
→ E2E Story headless SemanticGamePort tests
→ E2E Web/Automation/DOM tests
→ PoC GameplayModule/Rule/Resolver tests
→ PoC GameSimulation integration tests
→ PoC golden/balance/Save tests
→ PoC Web accessibility and artifact smoke
```

必须持续验证：

- Base 不出现 PoC ID、属性或酒馆语义；
- E2E 不导入 PoC；
- PoC Gameplay 不进入 Base/UI/Web；
- DOM 与 Semantic actions 同源；
- capability 默认关闭；
- Automation 无额外权限且不污染 integrity；
- successful Cheat/fixture mutation 持久标记 integrity；
- UI/Host 不写 Snapshot；
- `pnpm verify` 不修改 tracked baselines。

## 19. 实施顺序

```text
Phase 2A：Phase 1 ABI、ResolvedGame 和 Story 布局迁移
Phase 2B：最小 E2E Gameplay、GameSimulation 和 SemanticGamePort
Phase 3：Persistence、RuntimeCapabilities、DebugTools、RunIntegrity、Replay
Phase 4A：PoC GameplayModules、Rules、Resolvers、Executor、Queries
Phase 4B：七日内容、Narrative、Golden、Balance、Save fixtures
Phase 5：UI、Input、Assets、Accessibility、Automation Bridge
Phase 6：单 Story×Host Artifact、本地可复现构建与交付就绪
```

任何实施若重新引入公共酒馆 GameplayModules、Player/Developer build、独立 Developer root、Headless flavor、E2E 复用 PoC 或 Executor-owned Queries，必须停止并先修正设计或计划。

## 20. 当前架构验收

完成 Phase 2–6 后必须满足：

- workspace 只有 Base、UI、Assets、Web、E2E Story 和 PoC Story；
- Base 公共 ABI 使用新名称，无旧别名；
- ResolvedGame 保留 frozen GameSimulation、Presentation、SceneGraph、Assets 和 Provenance；
- GameCommandExecutor 与 GameQueries 正交；Replayable DebugCommand 由 GameSimulation-owned GameDebugCommandExecutor 执行并进入 simulation identity；
- E2E 使用 Story-local fixture modules；
- PoC 拥有全部酒馆 Gameplay；
- 每个 Story/Host 只有一个 Artifact；
- Debug、Cheat、Automation 都是默认关闭的运行时 capability；
- SemanticGamePort 可供 UI、Headless Runner、本地 Automation 和 AI adapter 使用；
- Pointer 同时支持鼠标和触摸；
- Cheat/fixture mutation 的 integrity 能跨 Save/Load/Replay；
- PoC Artifact 可复现、可在嵌套 base path 运行并保持托管平台中立；
- 全部 verification、browser、artifact 和 documentation gates 通过且工作树状态明确。

人工素材批准、人工试玩、真实设备/VoiceOver 结论、CI、GitHub Pages、Cloudflare 和 remote smoke 均由 delivery-boundaries 规格定义的独立轨道负责，不属于上述验收。

## 21. 错误、恢复、安全与停止线

错误按所有权归一化：预期 Gameplay 规则拒绝是结构化 rejection；Story、Hotfix、Save、素材或引用不合法是 compatibility/content failure；Rule/Resolver/owner/invariant 抛错或返回无效结果是 Engine fault；Persistence、Asset、UI、Host 和 async failure 是 Runtime/Application fault。后三类不能伪装成 GameCommand rejection。

Engine fault 必须回滚候选 Snapshot/RNG/sequence、暂停当前 Session 并保留可导出的诊断。Hotfix rule 故障不能静默退回原 provider；bootstrap 候选失败时只允许以已经完整验证的无补丁 Story 新建安全模式 Session。React Root、GameStage/VN 和主要 Overlay 分层设置 Error Boundary；事件处理器、资源和 Persistence Promise 仍由 Application Port 显式捕获，不能只依赖渲染边界。

Story 与 Hotfix 是受信任 JavaScript，不是假装安全的第三方沙箱；从文件、剪贴板或 IndexedDB 读取的 Save/Debug bytes 一律是不可信输入。Narrative 文本只按纯文本渲染，禁止 `dangerouslySetInnerHTML`。构建不得包含密钥、token、本机绝对路径或未准入远程运行时素材 URL；普通 renderer、Automation 和 AI adapter 不获得任意 DebugCommand、Snapshot setter、Owner capability 或兼容绕过。

出现以下任一情况时停止实施并回到设计：

- Base/UI/Web 必须知道酒馆、关系、具体 Story ID 或 PoC Gameplay 类型才能工作；
- GameplayModule、UI、Hotfix 或 DevDock 需要直接写其他 owner、Gameplay State 或完整 Snapshot；
- Hotfix 无法说明 Symbol、顺序、provider digest、影响面和 PatchSet identity；
- Save 无法区分 state-contract、simulation 与 presentation 变化，或 adoption 需要用新规则重放旧日志；
- E2E 只能依赖 PoC 的易变剧情、文案、平衡或素材；
- 玩家必需操作只存在于 Debug/DevDock，或 Automation 获得玩家正常流程之外的权限；
- 为赶进度需要任意 callback registry、通用事件总线、表达式语言、全局可变 store、ECS、CQRS 或 event sourcing；
- 相同输入无法稳定复现 Snapshot、digest、simulation 或 Artifact。
