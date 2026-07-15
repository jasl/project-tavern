# SillyMaker Deterministic Balance Lab 演进设计

日期：2026-07-15

状态：当前 Goal 采用 Story-local v1；通用抽取为 Post-Goal 演进候选

## 1. 决策与交付时机

Project Tavern 的完整 1–1000 seed 数值校准后移到 Phase 6 Artifact 构建之前。Phase 4B 仍完成真实
GameSession/SemanticGamePort 驱动的策略编译、指标、counterfactual、确定性 worker 合并和有限邻域搜索合同，
并用固定小样本 smoke 证明基础设施；Phase 4/5 的 golden 与 Save bytes 是开发期 provisional 技术基线。

Phase 6 必须在任何 release build 前完成冻结阈值下的完整校准。每个确定候选先独立同步权威 Balance 与直接
expectations，并形成一个可由 first-parent ancestry 恢复的 calibration-step commit；全部阈值通过后，再用唯一 final
balance-freeze commit 更新最终文档状态、移除 provisional qualifier 并重新生成、复核所有受影响的
golden/Save/digest bytes。最终阈值、六个策略、seed 集、counterfactual 和 Pareto 定义不因后移而改变。

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

### 4.1 Git 持久 checkpoint 与恢复合同

Accepted Phase 5C checkpoint 后的 first-parent Git ancestry 是校准进度的唯一持久权威；不得创建进度 JSON、
checkpoint 文本或聊天专用文件。`/tmp` canonical report 只用于当轮 digest/evidence，shell 变量和聊天摘要都不能决定
下一轮 iteration。

所有历史 replay 与 dirty recovery 的 committed-HEAD 判断都在同一种 clean-commit sandbox 中执行，不读取 dirty
root 的代码或依赖。sandbox 从 live materialization 只读取得 store path，允许唯一的 recovery-only offline install：

```bash
test "$(node --version)" = "v26.5.0"
test "$(pnpm --version)" = "11.11.0"
target_commit="<clean-commit-sha>"
(
  set -eu
  test "$(node --version)" = "v26.5.0"
  test "$(pnpm --version)" = "11.11.0"
  repo="$(git rev-parse --show-toplevel)"
  store="$(pnpm store path --silent)"
  sandbox="$(mktemp -d "${TMPDIR:-/tmp}/project-tavern-balance.XXXXXX")"
  rmdir "$sandbox"
  trap 'git -C "$repo" worktree remove --force "$sandbox" >/dev/null 2>&1 || true' EXIT HUP INT TERM
  git -C "$repo" worktree add --detach "$sandbox" "$target_commit"
  cd "$sandbox"
  pnpm install --offline --frozen-lockfile --store-dir "$store"
  # Run the required strict gate, selector, writer, or patch replay here.
)
```

执行者先选择 Phase 0 materialized PATH（当前 checkpoint 为 `/opt/homebrew/bin`）；live 与 subshell 的
`v26.5.0`/`11.11.0` 断言和 accepted materialization identity 一致后，sandbox 才可取 store 或产证据。该 install
只写临时 worktree 的 ignored dependency bytes，不访问 registry、不改 live tree 或 lockfile。

校准包含零到十二个 step commits。若 ancestry 中已有严格连续的 `Balance-Calibration-Index: 1..N`，则下一次调用
固定为 `pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N`，成功候选固定为 step `N+1`。每个
step commit 使用 Git 推荐的 `Key: value` trailers：

- `Balance-Calibration-Index: <N>`
- `Balance-Calibration-Field: <field>`
- `Balance-Calibration-Before: <before>`
- `Balance-Calibration-After: <after>`
- `Balance-Calibration-Before-Deficit: <beforeDeficit>`
- `Balance-Calibration-After-Deficit: <afterDeficit>`
- `Balance-Calibration-Evidence-SHA256: sha256:<digest>`

Step diff allowlist 只有 `docs/poc/balance-v0.md`、`game/stories/poc/src/content/balance.ts`，以及确有直接 literal
变化时的 `game/stories/poc/src/test/daily-gates.test.ts`/
`game/stories/poc/src/test/ending-forecast.test.ts`。但 allowlist/scalar validation 只是一层快速拒绝：恢复器必须在每个
step parent sandbox 重跑 `pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N`，校验 canonical
evidence SHA-256 和全部 trailer 值，重新应用候选到文档/代码/直接 literals，并要求重建的完整
`git diff --binary` 与历史 step byte-for-byte 相同。中间 step 有意让 golden/Save/完整 phase gate 保持 stale/red，
不是最终冻结 checkpoint。

Phase 6 entry 紧邻 accepted Phase 5C：从该 checkpoint 到 final（尚无 final 时到 `HEAD`）的每个 first-parent
commit，不论 path，都必须且只能是连续 step、带 `Balance-Calibration-Repair: true` 的 Task 10 owner repair、或唯一
final；这会覆盖任何 evaluator-only change，而不是依赖不完整的 path union。Repair 不带 step/final trailer，遵循
Task 10 Files/staging/gates，不改变阈值、策略、accepted balance、直接 expectations、golden/Save，也不提前移除
provisional report/assertion/CLI branch/tests。Final 必须是最后 classified commit 并晚于最后 step/repair。Final 后允许
普通 Phase 6 task commits，但逐 commit 的显式 `git diff "<commit>^1" "<commit>"` 不得再触及 step/final protected
paths；禁止使用含糊的 merge combined diff。

Repair 发生时若 `N = 0`，owner gates 通过后可继续；若 `N > 0`，必须从 Phase 5C clean sandbox overlay repaired
evaluator，并从 `--iteration=0` 顺序重放全部既有 steps。每步的 evidence digest、全部 trailers 和 rebuilt full binary
patch 都必须与历史完全相同。任一冲突或差异产生权威设计停点 `balance_calibration_history_invalidated`；执行者不得
自动修改旧 commit、rewrite、rollback 或接受一条新候选链。

全部阈值在 committed `HEAD` 通过后，唯一 final commit 使用：

- `Balance-Calibration-Final: true`
- `Balance-Calibration-Steps: <N>`
- `Balance-Calibration-Report-SHA256: sha256:<digest>`

Final diff allowlist 只有 `docs/poc/balance-v0.md` 的最终状态文字、`scripts/verify-poc-balance.mjs`、
`scripts/verify-poc-balance.test.mjs`、`game/stories/poc/src/test/fixtures/golden/**` 与
`game/stories/poc/src/test/fixtures/saves/**`；不得再含 balance 数值或 direct expectation。final 最多一个，`Steps`
必须等于 ancestry 的 step 数。Clean/no-final 首次收口先在 clean non-detached live `main` 运行 writers 和精确
removals，形成真正可 stage 的 candidate；final-parent sandbox 再独立重跑，并要求完整 rebuilt `git diff --binary`
与 live candidate 精确相同。Historical/pending-dirty final 使用同一 replay 比较。Final commit sandbox 随后只连续
两次运行 strict gate，stdout 必须 byte-identical，其 SHA-256 必须与 `Balance-Calibration-Report-SHA256` trailer
精确相等；退出 sandbox 后才在 clean live `main`、`HEAD = final` 运行 materialization/phase/root gates。

完整 protected audit/replay 后才分类 live tree。Clean-`HEAD` sandbox strict pass 进入 final；threshold-only red 且
`N < 12` 进入 step `N+1`；`N = 12` 仍 red 或 selector 无严格改善则停止为
`balance_contract_unsatisfied`。Dirty 只在 step allowlist 且 clean-`HEAD` sandbox threshold-only red 时，在 sandbox
以同一 `--iteration=N` 重算、重新应用并要求完整 binary patch 等于 live patch；dirty 只在 final allowlist 且 sandbox
strict pass 时重跑 writer/精确 removals 并要求完整 binary patch 等于 live patch；混合、范围外 bytes、无效 ancestry
或不可重放 patch 一律停止为未知 dirty state。

性能优化不得删掉策略、seed、preview/dispatch、Session FIFO、transaction validation、ledger invariant 或
counterfactual。可以缓存同一 schema 自己产生的 immutable validated identity、复用静态 Program/Simulation、
限制 worker 并发并避免重复报告拷贝，但必须保留 sequential/parallel 与优化前后等价证据。

当前成本是已知的 Phase 6 施工预算，不是降低 corpus 的理由：2026-07-15 本机完整当前点约为 40 分钟，单轮
校准需要当前点加最多 26 个合法邻居，因此最坏会达到多小时。CLI 将 shard 进度写 stderr、只把 canonical evidence
写 stdout；Goal 可以持续等待并按上述 Git ancestry/trailers 恢复。若 Phase 6 前优化，必须先用现有 bounded smoke、worker
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
