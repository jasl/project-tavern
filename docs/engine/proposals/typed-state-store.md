# Typed in-memory StateStore proposal

状态：**探索性、非绑定**。未选择 API、依赖、迁移时间或实现方案。

## Motivation

SillyMaker 当前把每个 Story 的 Gameplay State 组合成一个普通、已验证的对象。GameplayModules 拥有明确 State slot，Story executor 协调写入，Queries 产生只读 DTO，GameSession 负责原子提交。这套模型正确但可能在玩法扩大后暴露重复样板：跨模块读写、关系查找、稳定排序、引用校验、索引重建和 Save 映射需要各自手写。

候选方向是引擎提供一个 Prisma-like 开发体验的同步 typed in-memory StateStore，用统一 API 表达 State schema、查询、owner-scoped transaction 和 canonical import/export。这里的 “Prisma-like” 指类型化、可发现的读写语义；不表示已经决定采用 Prisma Client、SQL、IndexedDB 作为 live State 或任何特定数据库产品。

## Desired outcomes

如果采用，StateStore 应让 Story 作者更容易：

- 从实际采用的 GameplayModules 组合精确的 State surface；
- 用类型化方法读取 resource/collection，而不是拼字符串路径；
- 声明 stable key、关系、唯一性、排序和可重建索引；
- 在 owner capability 范围内提出写入；
- 让跨 owner command 原子 commit 或完整 rollback；
- 为 Queries、reference validation、Save export/import 复用同一读取模型；
- 在 headless simulation 和浏览器应用中使用相同语义。

成功标准是减少 Story 样板并使所有权/查询更清楚，而不是仅仅把现有对象包装成一个名字更像数据库的 client。

## Boundaries to preserve during evaluation

这些是评估新方案的正确性问题，不是对某个 API 的预先冻结：

- 一个 Session 只有一个 authoritative committed State；不能长期维护对象 State 与数据库 State 两份权威副本。
- Authoritative commands 仍需串行、可验证，并且 rejection/fault 不产生部分写入。
- UI、renderer 和 browser automation 应消费 player-safe projections/semantic actions，而不是任意 State query/write client。
- RNG、command sequence、run integrity 和 Host metadata 与 Gameplay collections 是不同权限域。
- Save 是 plain、versioned、canonical data；不保存 client、transaction、index、prototype、closure 或数据库 handle。
- IndexedDB 是异步 durable persistence adapter，不应因为名称相似而自动成为每条 gameplay command 的 live query engine。
- 派生索引必须能从 canonical State 重建；改变内部布局不应无故破坏 Save compatibility。

## Candidate shapes to compare

至少比较以下路线，而不是先锁定一个依赖：

1. **Refine the current object model** — 改善 module reader/writer/query 类型和生成工具，不引入独立 Store runtime。
2. **Small SillyMaker TypeScript Store** — 为 resource/collection、scoped transaction、index 和 canonical codec 提供专用实现。
3. **Adopt an existing typed data library** — 评估 Prisma 生态或其他 browser/in-memory 方案是否真的支持同步 deterministic simulation、ESM、bundle、许可和自定义 Save codec。
4. **IndexedDB-backed repository** — 只适合需要 durable 大数据查询的边界；需证明异步事务不会侵入每条游戏命令，并与 live State authority 分离。

SQL、ECS、event sourcing、CQRS 或通用全局 mutable store 也可以作为对照，但没有因“数据库”这个目标而自动获得优先级。

## Conceptual capability model

一个可行原型可以从不同能力而非全能 client 开始：

| Consumer                   | Read                                                       | Write                    |
| -------------------------- | ---------------------------------------------------------- | ------------------------ |
| Module reader              | owned resources and declared dependency ports              | none                     |
| Module owner               | owned resources and declared dependency ports              | owned resources only     |
| Story executor             | command evaluation views and owner proposals               | atomic validated batch   |
| GameQueries                | gameplay read transaction                                  | none                     |
| Save validation            | canonical gameplay state plus explicitly required metadata | none                     |
| UI / renderer / automation | projected views and semantic descriptors                   | semantic invocation only |

The exact names and generated types remain open. A prototype should prove that TypeScript types and runtime checks agree when a caller attempts a foreign write or invalid relation.

## Persistence model

The expected separation is:

```text
authoritative in-memory Store revision
  -> canonical Gameplay State export
  -> GameSnapshot envelope
  -> Save/provenance/digest
  -> HostAtomicRecordStore
  -> IndexedDB on Web
```

Import performs schema, identity, reference, and invariant validation before constructing one new Store revision. Any cache or secondary index is derived and omitted from canonical bytes.

## Numeric representation is a separate decision

A StateStore should not silently impose JavaScript `number`, `bigint`, Decimal, or one rounding policy on every Story value. Money, quantity, probability, and time should use explicit value types and codecs.

During the gameplay redesign, evaluate actual requirements:

- integer smallest units with bounded arithmetic;
- fixed-point values;
- a Decimal library with canonical string persistence;
- `bigint` for integer domains that exceed safe-number range.

If Decimal is selected, define rounding, comparison, serialization, digest compatibility, UI formatting, and bundle cost together. Changing storage alone does not solve ambiguous arithmetic semantics.

## Evaluation plan

Before committing to migration:

1. collect concrete awkward read/write/query cases from the redesigned gameplay;
2. prototype one real module and one cross-module command;
3. demonstrate atomic rejection/fault behavior and deterministic results;
4. demonstrate canonical export/import and compatibility with Save/replay needs;
5. measure authoring complexity, runtime latency, memory, and browser bundle impact;
6. compare the prototype with a smaller refinement of the current model;
7. decide whether to adopt, revise, or discard the proposal;
8. if adopted, document migration and deletion of the old authority path.

The prototype should use ordinary product tests. It does not need a new Goal harness, fixed Phase plan, host attestation, or frozen corpus.

## Decision record

No library or implementation is approved by this document. The decision belongs in a future active architecture decision based on the redesigned gameplay and a vertical prototype. Until then, the current `GameSnapshot`/module/query model remains the implementation in use.
