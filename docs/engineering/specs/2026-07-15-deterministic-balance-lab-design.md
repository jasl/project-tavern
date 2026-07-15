# SillyMaker Deterministic Balance Lab 演进设计

日期：2026-07-15

状态：当前 Goal 采用 Story-local v1；通用抽取为 Post-Goal 演进候选

## 1. 决策与交付时机

Project Tavern 的完整 1–1000 seed 数值校准后移到 Phase 6 Artifact 构建之前。Phase 4B 仍完成真实
GameSession/SemanticGamePort 驱动的策略编译、指标、counterfactual、确定性 worker 合并和有限邻域搜索合同，
并用固定小样本 smoke 证明基础设施；Phase 4/5 的 golden 与 Save bytes 是开发期 provisional 技术基线。

Phase 6 必须在任何 release build 前完成冻结阈值下的完整校准，同步权威 Balance 与直接 expectations，重新生成并
复核所有受影响的 golden/Save/digest bytes，再连续两次通过完整 balance gate。最终阈值、六个策略、seed 集、
counterfactual 和 Pareto 定义不因后移而改变。

后移的目的，是避免 UI、工具和 Artifact 尚未完成时反复冻结数值输出；它不是跳过 balance acceptance，也不允许
用小样本、人工试玩、降低断言或接受生成基线来替代最终 1–1000 corpus。

## 2. v1 所有权

当前 Goal 的实现保持 Story-local：

- `game/stories/poc` 定义六个策略、Program materialization、可调字段、阈值、deficit、counterfactual 和报告；
- `@sillymaker/base` 只提供已存在的 Session、RNG、canonical data、digest、RuntimeSchema 与 testkit 能力；
- UI、renderer、Web Host、Save runtime 与 Artifact 不导入 balance runner；
- balance runner、候选搜索和 worker CLI 是开发/验证工具，不进入 ResolvedGame、GameSimulation 或浏览器运行时；
- 校准器只返回一个确定候选与证据，不自行改写文件、golden、Save、计划或阈值。

当前没有第二个 Story 消费者，因此本 Goal 不新增 `@sillymaker/balance-lab` package，也不把 Tavern 的字段或策略
提升到引擎。Phase 6 可以改进 Story-local 工具以完成最终校准，但通用抽取必须等到 Post-Goal 独立任务审查。

## 3. 可复用内核候选

未来可复用层只拥有机制，不拥有游戏含义。建议的最小模型为：

```ts
interface DeterministicExperimentPort<Point, Observation> {
  evaluate(point: DeepReadonly<Point>, seed: NonZeroUint32): Promise<Observation>;
}

interface DeterministicExperimentPlan<Point> {
  readonly seeds: readonly NonZeroUint32[];
  readonly points: readonly DeepReadonly<Point>[];
  readonly shardCount: PositiveSafeInteger;
}

interface DeterministicCandidateSearchPort<Point, Report> {
  enumerate(point: DeepReadonly<Point>): readonly DeepReadonly<Point>[];
  deficit(report: DeepReadonly<Report>): NonNegativeSafeInteger;
}
```

通用机制可以负责：

- seed/point 的稳定顺序、连续 shard、worker 上限与 fail-fast；
- 每个 shard 的不可变结果、稳定 merge 和 Canonical JSON 输出；
- 顺序执行与 worker 执行的 byte-identical 证明；
- 完整候选集、固定 tie-break、严格改善和已知全局下界的合法短路；
- 只读 CLI、进度事件、耗时/失败证据和重复运行 byte comparison；
- injected evaluator 的异常传播、取消与资源清理。

Story adapter 继续负责：

- Program/Simulation 的验证与冻结；
- 策略、Semantic invocation、GameSession 与 RNG 语义；
- metrics/threshold/deficit/counterfactual/Pareto 定义；
- 哪些字段可调、步长、静态 schema 和最多迭代次数；
- golden、Save、simulation digest 和产品文档的更新范围。

## 4. 确定性与正确性合同

Balance Lab 的结果只有在以下条件同时成立时可作为校准证据：

- seed、策略、候选与 shard 顺序封闭且稳定；
- 每个 run 从新的 Session 和明确 Program 开始，不复用 authoritative mutable state；
- 只使用项目可序列化 PRNG，不读取时间、网络、DOM、storage 或 `Math.random()`；
- worker structured clone 后重新进行 Program/schema admission；
- parallel merge 与 sequential runner 对同一小 corpus 产生相同 canonical bytes；
- 完整 gate 连续两次产生相同 canonical metrics bytes；
- candidate-specific D4、bed、cold-storage counterfactual 基于同一 candidate Program；
- selector 拒绝不完整、乱序、伪造或重复候选证据；只有 deficit 的已知全局下界可以提前结束枚举；
- calibration 不写文件；应用候选、生成 baseline 与技术复核是后续显式步骤。

性能优化不得删掉策略、seed、preview/dispatch、Session FIFO、transaction validation、ledger invariant 或
counterfactual。可以缓存同一 schema 自己产生的 immutable validated identity、复用静态 Program/Simulation、
限制 worker 并发并避免重复报告拷贝，但必须保留 sequential/parallel 与优化前后等价证据。

当前成本是已知的 Phase 6 施工预算，不是降低 corpus 的理由：2026-07-15 本机完整当前点约为 40 分钟，单轮
校准需要当前点加最多 26 个合法邻居，因此最坏会达到多小时。CLI 将 shard 进度写 stderr、只把 canonical evidence
写 stdout；Goal 可以持续等待并按 checkpoint 恢复。若 Phase 6 前优化，必须先用现有 bounded smoke、worker
admission 和完整 report 证明语义/字节等价；不得用抽样、代理评分、解析近似、复用 mutable Session 或跳过候选来
换取速度。通用 Balance Lab 抽取仍等第二个消费者，性能压力本身不构成提前创建引擎 package 的理由。

## 5. 与其他基础设施的边界

Balance Lab 不是 StateStore、数据库、ECS、Analytics、telemetry、自动难度或 runtime live tuning。它读取通过公开
Story test adapter 构造的独立 Simulation run，不提供通用 State path/query，也不改变 UI projection 或 Save ABI。

它也不决定数值表示。当前 PoC 金额仍是 SafeInteger 最小单位；越界中间计算使用既有 bigint/typed error policy。
若未来出现独立的真实小数/舍入需求，按 Typed StateStore v2 数值审查合同另行比较 Decimal、定点整数与 codec，
不能在 balance runner 内隐式切换。

Balance Lab 不使用 LLM、网络、远端 worker、数据库、IndexedDB、Prisma、SQL、随机搜索服务或外部 telemetry。
Phase 6 校准必须在 materialized offline toolchain 上可复现。

## 6. Post-Goal 抽取门槛

只有出现第二个真实 Story/engine test consumer，并且两者共享的不是 Tavern 字段而是上述机制时，才评估抽取到
`@sillymaker/base/testkit` 或独立 private dev package。抽取前至少证明：

1. 两个 adapter 使用同一 seed/shard/search API 而无需 `any`、路径字符串或 callback registry；
2. browser production graph 和 Artifact 不包含该工具；
3. worker、Node type-strip、ESM、许可、frozen lockfile 与 cycle/boundary gate 通过；
4. Story-local 与抽取版对既有 corpus 的 canonical reports byte-identical；
5. 通用层不导入 `@project-tavern/*`，不认识 Cash、Heroine、Tavern、Facility 或七日周；
6. 性能收益与维护成本有实际测量，而不是为单一 PoC 预先抽象。

在这些门槛通过前，Story-local v1 是正式边界。
