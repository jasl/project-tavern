# Project Tavern 自动化工程 Goal 入口

<!-- goal-entrypoint:v1 -->

状态：当前有效，适用于 Phase 0 与 Phase 2–6。

这是启动或恢复 Project Tavern 自动化工程工作的唯一操作者入口。聊天记录、计划复选框和模型记忆都不是执行状态；实时仓库、已验收提交、可重建的 phase checkpoint、显式 attestation 和只读 gate 才是执行状态。

## 1. 当前基线与目标布局

- Phase 1 的已知完成基线为 `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2`；它只需是当前 `HEAD` 的祖先，不要求当前分支停在该提交。
- 当前 pre-Phase-2 workspace 仍包含 `game/packages/modules`、`game/stories/sandbox`、`game/stories/demo` 和空的 `game/stories/e2e`。这是合法过渡态，不是文档漂移。
- Phase 2 Task 4 才把 Sandbox 实现迁入 E2E、把 Demo 骨架迁为 PoC、删除共享 Modules，并形成只含 E2E/PoC Story 的目标布局。
- `engine/packages/{base,ui,web}` 是 SillyMaker；`game/packages/**` 与 `game/stories/**` 是 Project Tavern。`@sillymaker/*` 不得依赖 `@project-tavern/*`。

任何执行都先检查 live state，不得因为仓库尚处于计划定义的过渡态而提前“修复”后续任务。

## 2. 三段启动顺序

### A. 素材 handoff（主工程 Goal 之外）

在 Phase 0 前，必须已经提交 `game/packages/assets/src/approved-poc-pack.ts`、对应测试和公开导出。`approvedPocAssetPacksV1` 可以为空；空数组表示继续使用 code-native fallback，不表示批准任何素材。

如果该 handoff 缺失，不得让 Phase 0 或主 Goal 猜测素材决定。先按 [`../art/first-web-visual-pack.md`](../art/first-web-visual-pack.md) 完成这个独立、可为空的交接并提交。

### B. Phase 0 物化（独立的有界预检）

在创建 Phase 2–6 长 Goal 前，单独执行 [`Phase 0`](plans/2026-07-12-project-tavern-00-goal-materialization.md)。它允许计划明确列出的依赖下载和浏览器物化，最后必须从 clean checkpoint 生成本机 attestation，并通过 `pnpm verify:materialization`。

Phase 0 目标：

> 完整阅读 `AGENTS.md`、`docs/engineering/GOAL.md`、`docs/engineering/execution-protocol.md`、Roadmap 和 Phase 0 计划；从 live clean checkout 按 Phase 0 Task 1–3 顺序执行、逐任务提交并完成 Materialization Acceptance。只处理物化合同和计划列出的外部输入，不开始 Phase 2，不生成或批准素材，不创建远端基础设施。

### C. Phase 2–6 长 Goal

只有 handoff、Phase 0 acceptance、clean worktree 和 materialization attestation 同时成立时，才创建一个跨 Phase 2–6 的长 Goal。Phase 边界不是 Goal 完成；只有 Phase 6 和 Roadmap Definition of Done 全部通过才能完成 Goal。

规范 Goal objective：

> 在素材 handoff 已提交、Phase 0 Materialization Acceptance 已通过且 live checkpoint 匹配的前提下，完整阅读 `AGENTS.md`、`docs/engineering/GOAL.md`、`docs/engineering/execution-protocol.md` 与 Roadmap，严格按 `plan-set.v1.json` 的 Phase 2、3、4A、4B、5A、5B、5C、6 顺序逐任务实施；使用各 phase plan 的 Files、TDD、expected-red、验证、精确暂存和 commit 合同自动恢复并持续推进，直到全部自动化 gate、可复现本地 Artifact 和工程 Definition of Done 通过。缺失 workflow skill 或可用 subagent 不是阻塞；不生成或批准素材，不进行人工试玩，不创建 CI，不部署或访问远端。

不得为 Goal 设置隐含 token budget。不得在 phase checkpoint 处标记完成。

## 3. 启动与恢复算法

每次 Goal 首次运行、自动 continuation、模型切换或容量中断后，都按以下顺序恢复：

1. 读取 `AGENTS.md`、本文件、[`execution-protocol.md`](execution-protocol.md)、[`plan-set.v1.json`](plan-set.v1.json) 和 Roadmap；不要一开始读取全部 16k 行 phase 细节。
2. 运行 `git status --short --branch`、`git log -5 --oneline --decorate`、`git rev-parse HEAD`，检查 materialization attestation、最近 accepted task commit 和已存在的计划显式证据。
3. 用 Git ancestry、当前 phase gate 和最近 task 的 focused gate 验证最后一个 accepted task；计划中的 `[ ]` 不参与判断。
4. clean tree 从第一个未验收 task 开始。dirty tree 只有在所有变更都落入同一个未完成 task 的 `Files`/显式生成集合时才原地恢复；否则保留现场并按协议分类。
5. 只读取当前 phase plan、该 task 和下表列出的权威输入。完成 task commit 后再移动到下一 task。
6. Phase 4B–6 的平衡、golden、Save 与 digest 恢复还必须应用下文“延后平衡冻结合同”：Phase 4B/5 的临时验收证据不能被误判为最终 1..1000 校准，Phase 6 的 Artifact 工作也不能越过最终冻结 checkpoint。
7. phase acceptance 通过后，以“最后一个 task commit + acceptance gate + clean status”建立默认 checkpoint，然后自动进入下一 phase，不等待例行确认。除非 phase plan 明确列出 checkpoint 文件、写入步骤、暂存集合和 commit，否则不得自行新增证据文件或独立 checkpoint commit。

## 4. 强制阶段图

| 阶段                                                                                  | 前置                       | 当前阶段必须读取                                                           | 完成 gate/产物                                               |
| ------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Phase 0](plans/2026-07-12-project-tavern-00-goal-materialization.md)                 | 已提交的可为空素材 handoff | Phase 0、交付边界、素材 handoff 文档                                       | Materialization Acceptance 与本机 attestation                |
| [Phase 2](plans/2026-07-11-project-tavern-02-modules-e2e-story.md)                    | Phase 0                    | Phase 2、runtime design、scene/interaction design、相关 Contract Catalog   | `pnpm verify:phase2` 与 E2E/PoC 目标布局                     |
| [Phase 3](plans/2026-07-11-project-tavern-03-persistence-diagnostics.md)              | Phase 2                    | Phase 3、runtime design、persistence/diagnostics catalog                   | `pnpm verify:persistence-diagnostics` 与持久化/诊断 fixtures |
| [Phase 4A](plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)            | Phase 3                    | Phase 4A、runtime design、Contract Catalog、`docs/poc/simulation-rules.md` | `pnpm verify:poc-gameplay` 与 PoC GameSimulation             |
| [Phase 4B](plans/2026-07-11-project-tavern-04b-poc-story-golden.md)                   | Phase 4A                   | Phase 4B、scene/interaction design、全部 `docs/poc/` 当前合同              | `pnpm verify:phase4`、快速 balance smoke 与临时 golden/Save  |
| [Phase 5A](plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md)             | Phase 4B                   | Phase 5A、runtime design、scene/interaction design                         | `pnpm verify:phase5a` 与中性 UI runtime                      |
| [Phase 5B](plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md) | Phase 5A                   | Phase 5B、scene/interaction design、Phase 4B catalog                       | `pnpm verify:phase5b` 与两个 Story presentation roots        |
| [Phase 5C](plans/2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)      | Phase 5B                   | Phase 5C、交付边界、runtime/scene specs                                    | `pnpm verify:phase5c`、Automation/a11y/visual evidence       |
| [Phase 6](plans/2026-07-11-project-tavern-06-local-artifact.md)                       | Phase 5C                   | Phase 6、交付边界、许可设计                                                | 最终 balance/baseline 冻结、`verify:release` 与 Artifact     |

精确路径、依赖关系和范围由 [`plan-set.v1.json`](plan-set.v1.json) 冻结。若表格、manifest 和 Roadmap 不一致，文档 gate 必须失败，不能由执行者选择其中一个猜测。

### Phase 4B–6 延后平衡冻结合同

本 Goal 将耗时的完整数值校准延后到 Phase 6 开始、任何 release/Artifact 实现或构建之前；阶段顺序仍为 Phase 4B → 5A → 5B → 5C → 6，不新增或跳过 phase。

- Phase 4B Task 10 的当前完成证据是确定性的多 seed 指标/校准/反事实基础设施、顺序与并行结果一致性、固定小样本的快速 smoke，以及一次只读 1..1000 基线测量。若该完整测量只因冻结阈值未满足而失败，记录精确指标与 reproduction seed/range 后继续；结构、命令、算法、确定性、反事实或数据不变量失败仍是必须在原 owner 修复的缺陷。
- Phase 4B Task 11–12 仍按原 writer、完整 diff/hash 技术复核、只读双跑和精确暂存合同生成 golden 与 Save。它们是供 Phase 5 开发使用的临时基线，不声称已经校准或最终冻结。Phase 4B checkpoint 由最后一个 task commit、`pnpm verify:phase4`（使用快速 balance smoke）、临时 baseline 技术复核证据和 clean status 建立。
- Phase 5A–5C 只读消费同一组临时 golden/Save/digest bytes；不得以 UI、presentation、tooling 或 acceptance 工作为理由运行 writer、调整 balance，或接受这些 bytes 的变化。已知的纯阈值差额不阻止 Phase 5；其他失败仍按最早 owner 修复。
- Phase 6 恢复时，先寻找一个独立的最终平衡冻结 checkpoint。若它不存在，就必须在任何 Phase 6 Artifact task 前执行冻结的 seeds 1..1000 × 六策略阈值和反事实校准，按确定性选择同步修改 `docs/poc/balance-v0.md` 与 Story balance，随后用既有 writer 合同重新生成、完整复核并精确暂存 golden/Save/digest 变化。只有 `pnpm verify:balance` 连续两次输出相同且全部通过、reference command bytes 未变、golden/fixture 只读 gate 通过并形成 clean accepted commit 后，才能开始或恢复 Artifact 工作。

恢复时不得把 Phase 4B 临时基线 commit 误当成 Phase 6 最终冻结 commit，也不得因 Phase 5 已消费临时 bytes 而跳过最终重生成与技术复核。最终 `pnpm verify`、`pnpm verify:release`、可复现 Artifact 和 Definition of Done 都消费 Phase 6 冻结后的同一组权威 bytes。

## 5. 渐进读取规则

- 始终读取：`AGENTS.md`、本文件、执行协议、Roadmap、当前 phase plan。
- 按当前任务读取：phase plan 明确列出的规格、Contract Catalog 对应章节、PoC 文档和已有实现。
- 仅在冲突或交叉验收时读取其他 phase plan；不要为了“了解全貌”一次吞入全部计划和 catalog。
- 规格优先于计划；计划负责实现顺序，不能改写上游合同。live implementation 与规格冲突时按执行协议的 repair/stop 分类处理。

## 6. 自动推进与真正停止

计划范围内、权威规格已经给出唯一答案的实现缺陷，不是用户阻塞：回到最早 owner task 做窄 repair commit，重跑受影响 gate 后继续。

只有以下情况可以停止并请求新决策：

- 需要改变权威规格或出现两个同等合理但会改变产品/公共合同的方案；
- 素材采用、许可判断、人工体验、远端权限或其他明确保留给所有者的决定；
- 需要计划外依赖、网络、凭据、外部协调或显著扩展范围；
- dirty paths 无法安全归入一个 task，或证据表明存在未知/外来 bytes；
- Phase 0 的真实 external precondition 经计划内诊断仍不满足。

缺失某个 workflow skill、插件、空闲 subagent、可选审查代理或聊天历史不属于停止条件。完整规则见执行协议。

## 7. 完成与交接

主 Goal 仅在 Roadmap 的最终 Definition of Done 全部满足、`pnpm verify:release` 通过、exact Artifact identity 已记录、工作树与保留变更已准确报告后完成。

[`Final Human Review`](plans/2026-07-12-project-tavern-final-human-review.md) 和 [`Remote Distribution`](plans/2026-07-12-project-tavern-remote-distribution-deferred.md) 都不属于该 Goal；主 Goal 不得代替它们声明结果或产生副作用。
