# SillyMaker Typed StateStore v2 演进设计

日期：2026-07-15

状态：已确认的 Post-Goal 演进规格；不改变当前 Phase 2–6 v1 ABI

## 1. 决策与时机

SillyMaker 将在当前 Phase 2–6 本地工程 Goal、可复现 Artifact 和 Roadmap Definition of Done
全部通过后，以独立 Goal 设计并实现一个引擎级、同步、类型安全且 capability-scoped 的
`StateStore`。它为 GameplayModule 组合状态、只读查询、owner-scoped 写事务和 canonical
导入/导出提供统一 API。

当前 Goal 不实现或部分接入这个 Store，不新增 Prisma、SQL、IndexedDB wrapper 或其他依赖，也不替换
`GameSnapshotEnvelopeV1`、GameSession FIFO、GameplayModule owner proposal、GameQueries authority、Save envelope、
Replay、Hotfix adoption 或现有 digest 合同。当前实现只允许建立可迁移的命名窄读取/评估边界，并修复已经确认的
capability/ABI 缺口；它可以给 Story-owned GameQueries 增加一个明确 DTO getter，但不能暴露通用 Store client、
path/query DSL 或新的写入口。

选择延后的原因不是认为统一 Store 没有价值，而是当前两个直接阻塞并非存储表示问题：

- `PocGameViewV1.status` 仍需要一个明确、可审查的 Query/View ABI；通用数据库 reader 不会自动产生公开字段；
- `run.already_started` 的玩家拒绝不需要 engine-owned `commandSequence`。为保留这个诊断字段而把 sequence
  开放给 Story Query 会扩大权限，而不是改善存储；
- Parameterized Semantic action 需要 Ingredient/Recipe/ServiceMode 等安全输入目录；采购数量和菜单份数虽然各有
  Story-owned 有限上界，但购物车/菜单的组合空间仍不适合枚举为 concrete invocations。正确的 v1 缝是一个只读、字段受限的 `PocActionInputCatalogV1`
  Query DTO 与 `form` descriptor，不是让 UI 读取 State/Story content 或把通用数据库 client 交给 renderer；
- 当前 v1 已经通过 Snapshot、candidate、FIFO、Save、Replay、Debug、Hotfix 和 digest 的大量验收。现在替换
  这些基础会让 Phase 2、Phase 3 和 Phase 4A 已通过的提交整体重新进入设计与验收，而不是一个 Task 12
  局部重构；
- Phase 6 后已有真实 Story、UI、Automation、Save corpus 和 Artifact 数据，可以用实证评估 API、内存、性能和
  迁移成本，而不是为预想扩展提前冻结错误抽象。

如果后续独立 Goal 的垂直原型不能同时保持 determinism、owner capability、canonical persistence、Replay
和现有外部端口，则不得迁移生产 Story。

## 2. 名称与非目标

公共概念使用 `StateStore`，不使用 `World`。当前运行时设计已把 `World` 保留给未来活动世界、地图或世界状态；
状态基础设施不应占用这个领域名称。

`StateStore` 是 Prisma-like 的开发体验方向，不是 Prisma Client 的运行时采用决定：

- schema/module composition 产生类型化 reader、writer 和 query；
- 调用方不拼接字符串路径，不直接操作任意 JSON；
- 关系、唯一键、稳定顺序和引用由声明及 validator 表达；
- command transaction 有明确 commit/rollback 语义。

它不是 SQL 数据库、ORM、ECS、event sourcing、CQRS、全局 mutable store 或任意查询控制台。v2 不把
IndexedDB object store 当作 live Gameplay State，不把 UI、renderer、Automation 或 Story content 连接到
一个通用 client，也不把内部索引或内存布局变成 Save ABI。

## 3. 行业模型与采用边界

最接近“游戏状态数据库”的成熟模型是 ECS `World`：entity/resource/component 形成类型化运行时容器，system
通过 query 取得受调度的读写能力，结构变更可通过 command buffer 延后应用。Unity Entities 的
`EntityQuery`/`EntityCommandBuffer` 和 Bevy 的 `World`/`Query`/`Commands` 都证明统一运行时查询 API
有价值。

但这些机制不自动提供 Project Tavern 所需的业务级原子回滚、稳定拒绝、canonical ordering、Save 兼容、
Replay anchor 或 Hotfix adoption。传统引擎也通常把 live object/world、UI projection 和 SaveGame 分开：
Godot 由项目显式选择和序列化可保存节点，Unreal 使用独立 `USaveGame` 数据对象，Bevy `DynamicScene`
也是从 World 显式抽取的投影。

因此 SillyMaker 借鉴 ECS 的 typed query 与 scoped system capability，但保留现有的事务、投影与持久化分层；
不复制 ECS 的 entity/archetype 模型，也不把完整 live store 原样落盘。

## 4. v2 权威模型

### 4.1 静态组合

每个 stateful GameplayModule 在 GameSimulation freeze 前登记自己的一个或多个 typed resources/collections：

- stable ModuleId、StateSlotId 和 state-contract revision；
- exact runtime Schema 与 canonical codec；
- stable primary key、必要的 secondary index 定义和排序；
- initial value、local references、local invariants；
- public read capability 和 owner-only write capability。

`defineGameSimulation` 从实际采用的 module tuple 组合一个封闭 `StateStoreDefinitionV2`。未采用的 module
不会留下空表、可选路径或查询方法；Session 创建后不能添加、移除或替换 module/collection。

StateStore 不能借 schema 生成任意通用规则语言。跨 resource 的 gameplay 语义继续由 Story 的命名 Rule、
Resolver、validator 和 GameCommandExecutor 拥有。

### 4.2 运行时 authority

一个 Session 仍只有一个 authoritative committed state。内部实现可以使用 copy-on-write、persistent data
structure 或经过证明的增量索引，但对外语义保持：

```text
GameSession FIFO
  -> committed StateStore revision + engine envelope metadata
  -> scoped read transaction
  -> owner proposals / scoped write transaction
  -> aggregate validation
  -> atomic commit or zero-write rejection/fault
  -> canonical GameSnapshot projection
```

RNG、`commandSequence` 和 RunIntegrity 继续是 engine envelope metadata，不成为普通 Gameplay collection。
Store revision 是实现细节，不能替代 Snapshot identity、semantic revision、commandSequence 或 state digest。

成功 commit 必须一次建立新的 immutable authoritative revision；rejection/fault 保留原 revision、RNG 和
sequence。任何派生 index 必须能从 canonical state 重建，不能进入 Snapshot、Save、digest 或 Replay 比较。

### 4.3 capability roles

v2 必须按用途签发不同能力，而不是暴露一个全能 client：

| Role                     | 可读                                                            | 可写                                   | 明确不可见                                     |
| ------------------------ | --------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| Module reader            | 自己的 resources 与声明的 public dependency ports               | 无                                     | foreign private resources、engine metadata     |
| Module owner             | 自己的 resources 与声明的 public dependency ports               | 自己拥有的 resources                   | foreign owner writes                           |
| Story executor           | 通过 owner proposal 协调多个 owner；读取执行所需 Gameplay views | 只能提交通过 owner validation 的 batch | 任意 path write、Host/UI                       |
| GameQueries              | Gameplay read transaction                                       | 无                                     | RNG、sequence、RunIntegrity、Host、persistence |
| Save reference validator | Gameplay state                                                  | 无                                     | RNG、RunIntegrity、Host                        |
| Save invariant validator | Gameplay state 与显式批准的 `commandSequence` view              | 无                                     | RNG、RunIntegrity、provenance 其余字段         |
| UI/renderer/Automation   | GameView、NarrativeView、semantic descriptors                   | semantic invocation only               | Store client、State paths、owner ports         |

增加一项查询需求时，必须先判断它属于 Gameplay、engine metadata、diagnostics 还是 presentation，再修改对应
named capability。不能通过扩大“数据库可查询性”绕过所有权。

### 4.4 query 与 command parity

StateStore 统一读取机制，但不负责生成产品语义。`getAvailableActions`、`explainAvailability`、
`previewCommand` 和 execute 的 parity 继续由一个 Story-owned pure command evaluator 保证：

- evaluator 只接收 capability-scoped read interface、validated Program 和 command；
- guard、reference、cost、confirmation、forecast basis 与 rejection ordering 只实现一次；
- Query 把 evaluation 结果投影成 player-visible DTO；
- Executor 在同一 FIFO 队首重新运行 evaluator，然后才取得 owner writers 并提交；
- RNG resolution、actual effects 和 write proposals 不进入 preview。

当前 Phase 4A 的共享 evaluator 是这一迁移缝，但不是 v2 Store 的预实现，不能引入通用 path/query DSL。

### 4.5 当前 Goal 的 parameterized-action 窄缝

Phase 4B 允许给 `PocGameQueriesV1` 增加一个 `getActionInputCatalog()` getter。它只投影构造严格 Semantic options
所需的玩家安全字段：Ingredient 采购目录、当前已解锁 Recipe、ServiceMode 输入元数据、Facility choices 和
WorldAction choices。它不得返回原始 Story content、availability gate、Effect、Rule、owner port、State、RNG、
sequence 或 Snapshot。

该临时 DTO 还必须显式携带已有权威定义中的标签和结构上限：ServiceMode 使用
`ServiceModeDefinitionV1.nameTextId`；采购使用 `balance.purchaseLineLimit` 与
`balance.purchaseQuantityPerLineLimit`，营业菜单使用 `min(16, balance.menuRecipeLimit)` 与
`balance.menuPortionsPerRecipeLimit`。UI 不得按 ID 字符串拼接 TextId，也不得硬编码 `64`/`16`/`99` 或反向导入
Story content 来补齐表单。现金、接待容量、备菜能力、原料等动态资源、可用性和规则结果仍只通过同一 Semantic preview 计算。

Semantic descriptor 以 `direct | choices | form` 区分交付方式。`purchase` 与 `service_plan` 使用 `form`：
descriptor 携带上述 bounded Query DTO，Overlay 构造完整严格 options 后仍必须调用同一 Semantic preview 和
dispatch。数量/份数保持有 Story 上限的 PositiveSafeInteger 输入，不伪造默认命令，也不试图枚举组合空间。有限的 Policy、
Facility、WorldAction 和 Narrative 分支继续使用 `choices`。

这两个上限属于 Balance、command evaluation 与 Semantic form ABI，不收窄持久 State Schema 的 `Quantity` 域，
因此只改变 simulation identity，不提升 state-contract revision。若未来另行增加每种原料的聚合持有上限或 stack
capacity，那才是 Inventory State invariant/Schema 设计，必须独立评估 state-contract revision 与存档迁移。

这是一项 v1 public Query DTO 修复，不是 StateStore v2 的局部接入。Post-Goal 原型必须证明同一 DTO 可从 scoped
read transaction 等价投影，且 UI/Semantic public shape 无需因为内部 Store 迁移再次改变。

## 5. Persistence、Save 与 IndexedDB

StateStore 与 persistence 是两个边界：

```text
authoritative in-memory StateStore
  -> versioned canonical Gameplay State export
  -> GameSnapshot envelope (State + RNG + sequence + integrity)
  -> Save envelope / provenance / digest / lineage
  -> HostAtomicRecordStore
  -> Web IndexedDB adapter
```

IndexedDB 继续只提供异步、原子 record storage。它不参与每条 Gameplay command 的同步读取，不暴露给 Base
或 Story，也不决定 module schema。测试仍可注入 memory Host record store。

Save 必须保存 canonical、plain、versioned data，不保存 Store client、transaction、index、closure、prototype、
component instance 或 implementation revision。load/import 先完成 bytes、Schema、digest、identity、reference 和
invariant 验证，再构造新的 Store revision；失败不能部分 hydrate live state。

Store 的 schema/layout revision 与 state-contract revision 分离。只改变内部索引或实现而 canonical export
不变时，不得改变 Save compatibility 或 simulation outcome；改变 canonical State 字段时必须按现有 state-contract
与 adoption/migration authority 处理。

## 6. 数值表示

StateStore 不隐式选择 JavaScript `number`、`bigint` 或 Decimal。每个 value type 通过自己的 runtime Schema、
canonical codec 和 arithmetic policy 进入 Store。

当前 v1 Gameplay 金额继续是 SafeInteger `number`。计算一个可能越过 SafeInteger 的调试候选值时，允许使用
`bigint` 作为非持久化中间值，并以 canonical signed base-10 string 报告越界的精确 `actual`；这不改变 Money
或 Save ABI。

若再出现一项独立、真实、无法由边界检查/整数最小单位合理处理的 Decimal 类需求，必须启动一次数值表示设计
审查，比较 Decimal library、定点整数、字符串 codec、digest/Save 兼容、性能和 bundle 成本。StateStore v2
不得顺手把所有数字全局改成 Decimal。

### 6.1 Forecast 极值审查结论

Phase 4B 的 obligation forecast 审计发现了第三个未检查整数边界位置：合法 Debug Cash 可以把
`currentCash` 调整到接近 `Number.MAX_SAFE_INTEGER`，此时一个带正收益的 committed Tavern plan 会让
`currentCash + preview.cashDelta` 越过 `SafeInteger`。`currentGap = max(0, levy - cash)` 和 final
`cash - levy` 对两个非负 `Money` 的差始终可表示；风险只在正向合计，不属于小数、比例或舍入需求。

这次审查不引入 Decimal。Decimal 若仍要输出当前 `Money`/`IntegerRangeV1`，同样无法容纳越界结果；若扩大
值域，则必须连带改变 State、Ledger、Save、Canonical JSON、digest、fixture 和 Hotfix compatibility，不能作为
Query 局部修复进入当前 Goal。正确的 Post-Goal 修复必须满足：

- 所有可能越过目标整数品牌的 Money 合计与 range 端点先用 `bigint` 计算，`bigint` 只作非持久化中间值；
- 越界返回 typed error，并用 canonical signed base-10 string 携带精确 actual；
- Tavern preview、Opening start/finalize、obligation Query 与 execute 共用同一 arithmetic policy 和 rejection；
- Query 不得抛出未分类异常，也不得 silent clamp、伪装成 `current_gap` 或无提示 fallback；
- 固定验收 `MAX_SAFE_INTEGER + positive Tavern revenue`，并证明 preview/execute/query parity 与 zero-write rejection。

只有后续再出现一项真正需要小数语义、舍入政策或超出整数最小单位能够合理表达的独立需求，才重新比较
Decimal library、定点整数和字符串 codec。单纯发现新的 unchecked integer call site 不足以把全局数值迁移到
Decimal。

## 7. Post-Goal 实施顺序

后续独立 Goal 至少包含以下顺序，每一步独立 TDD、gate 和 commit：

1. 先冻结共享 Money arithmetic policy 与 typed overflow rejection，并修复 Tavern preview/execute/query parity；
2. 在 E2E Story 建立单 resource、collection、typed read query 和 owner write 的垂直原型；
3. 证明多 owner command 的 atomic commit、rejection/fault zero-write、RNG/sequence 一致性；
4. 证明 canonical export/import 与当前 Snapshot digest、Save、Replay 和 Hotfix adoption 等价；
5. 证明 derived index 重建、稳定排序、duplicate/reference/invariant failure；
6. 对比 v1/v2 command corpus、semantic publication、内存和延迟，记录迁移门槛；
7. 通过兼容 adapter 迁移 E2E，并证明命名 action-input DTO 可从 scoped reader 等价产生，不改变 UI/Semantic public shape；
8. 只有 E2E 完整验收后，才为 PoC 制定逐 module 迁移计划并重生成受影响的 fixture/golden/Artifact；
9. 所有 Story 迁移并通过 release gate 后，才能删除 v1 adapter。

该 Goal 必须重新审查外部依赖；默认从无依赖的 TypeScript core 开始。若未来采用第三方库，必须证明 browser、
Node type-strip、ESM、许可、frozen lockfile、determinism、bundle 与长期维护全部满足仓库合同。

## 8. 验收条件

StateStore v2 只有同时满足以下条件才可替换 v1：

- module tuple 精确决定 schema/resources/query surface，且 dependency DAG 与 owner uniqueness 可机械验证；
- owner capability 在类型和运行时都不能写 foreign state；
- 每条 authoritative operation 仍由一个 GameSession FIFO 串行化并原子 commit；
- Query/preview/execute parity 不依赖 UI 或重复 guard；
- UI、renderer、Automation、Rule 和 ordinary Query 仍拿不到 engine metadata 或通用 Store client；
- canonical export 的字段顺序、值域、Schema、digest、Save、Replay 和 adoption 有可复现证据；
- IndexedDB 与 Host adapter 保持 persistence-only，live simulation 可在 headless memory 中完整运行；
- E2E v1/v2 golden command corpus 在批准的 state-contract 变更之外完全等价；
- 所有受影响的 public exports、boundaries、cycles、fixtures、Artifact 和 release gates 通过；
- 迁移计划包含明确 rollback/adapter 删除条件，不维持两个 authoritative states。
