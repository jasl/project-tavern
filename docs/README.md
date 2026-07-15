# 文档地图

本目录把长期方向、当前 PoC 合同、可调数值和工程边界分开，避免原型临时决定反向污染正式游戏设计。

**SillyMaker** 是正式引擎名；**Project Tavern** 是使用该引擎开发的游戏代号。通用运行时包使用 `@sillymaker/*`，游戏模块、素材和 Story 使用 `@project-tavern/*`。

启动或恢复 Phase 0/Phase 2–6 时只从 [`engineering/GOAL.md`](engineering/GOAL.md) 进入；[`engineering/README.md`](engineering/README.md) 说明工程文档的组织方式。本文只做领域地图，不维护独立的执行状态或 Goal prompt。

## 长期方向

- [`design/game-design-baseline.md`](design/game-design-baseline.md)：已经确认的产品愿景、系统边界与叙事方向。

## 当前七日 PoC

- [`engineering/specs/2026-07-12-game-runtime-design.md`](engineering/specs/2026-07-12-game-runtime-design.md)：SillyMaker 与 Project Tavern 的当前技术架构权威；定义 Loader/Host、ResolvedGame、GameSimulation、Story Gameplay、Hotfix/digest、Persistence/Diagnostics、统一 Application、Runtime Capabilities、SemanticGamePort、Input 和单 Artifact 边界。
- [`engineering/specs/2026-07-12-local-engineering-delivery-boundaries-design.md`](engineering/specs/2026-07-12-local-engineering-delivery-boundaries-design.md)：素材准备、Goal 物化、本地无人值守工程、最终人工审查和 deferred 远端分发的权威轨道边界。
- [`engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md`](engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md)：StageScene/variant、角色混合纸娃娃、HitMap/Interaction、正交内容特征过滤、RuntimePresentation 与权威状态单向发布边界。
- [`engineering/specs/2026-07-12-game-runtime-contract-catalog.md`](engineering/specs/2026-07-12-game-runtime-contract-catalog.md)：当前 v1 字段级合同；区分 SillyMaker Base 共享 envelope 与 Project Tavern PoC Gameplay/Story 的具体 State、Command、GameplayFact、Narrative、Save 和 Debug 字段。
- [`engineering/specs/2026-07-11-repository-licensing-design.md`](engineering/specs/2026-07-11-repository-licensing-design.md)：MIT SillyMaker 引擎、PolyForm 非商业游戏代码、CC BY-NC-SA 原创内容、npm 依赖与 `vendor/**` 第三方隔离边界。
- [`engineering/specs/2026-07-12-aigc-asset-archive-design.md`](engineering/specs/2026-07-12-aigc-asset-archive-design.md)：人类可维护的 AIGC 来源目录、图片/prompt 归档、无审计提升与自动 Asset Pack digest 边界。
- [`engineering/specs/2026-07-15-deterministic-balance-lab-design.md`](engineering/specs/2026-07-15-deterministic-balance-lab-design.md)：确定性多 seed 实验、worker 合并、有限候选搜索、Story adapter 与 Phase 6 最终校准边界。
- [`engineering/GOAL.md`](engineering/GOAL.md)：Phase 0/主 Goal 的唯一启动入口、live-state 发现、渐进读取矩阵、恢复与完成规则。
- [`engineering/execution-protocol.md`](engineering/execution-protocol.md)：工具无关的 task/TDD/commit/checkpoint/repair/stop 合同。
- [`engineering/plans/2026-07-11-project-tavern-poc-roadmap.md`](engineering/plans/2026-07-11-project-tavern-poc-roadmap.md)：第一版整体交付的轨道顺序、工程 Goal 阶段顺序、目标公共命令面、跨阶段停止线和最终 Definition of Done。
  - [`Phase 0 — Goal Materialization`](engineering/plans/2026-07-12-project-tavern-00-goal-materialization.md)：在长 Goal 之前一次性物化全部外部依赖与本机浏览器，并冻结离线验证凭据。
  - [`Phase 2 — Runtime Alignment & Minimal E2E Story`](engineering/plans/2026-07-11-project-tavern-02-modules-e2e-story.md)
  - [`Phase 3 — Persistence, Capabilities, Replay & Diagnostics`](engineering/plans/2026-07-11-project-tavern-03-persistence-diagnostics.md)
  - [`Phase 4A — PoC Gameplay & GameSimulation`](engineering/plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)
  - [`Phase 4B — Seven-day PoC Story & Golden Week`](engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md)
  - [`Phase 5A — UI Runtime Foundations`](engineering/plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md)
  - [`Phase 5B — StageScene, Character & Story Presentation`](engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md)
  - [`Phase 5C — Tooling, Automation & Acceptance`](engineering/plans/2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)
  - [`Phase 6 — Reproducible Local PoC Artifact`](engineering/plans/2026-07-11-project-tavern-06-local-artifact.md)
- [`art/first-web-visual-pack.md`](art/first-web-visual-pack.md)：主线 Goal 之前独立执行的素材准备轨道；定义首批 Image Gen 视觉语言、场景/人物锚点、Asset ID、安全区、来源归档与运行时提升边界。
- [`Final Human Review`](engineering/plans/2026-07-12-project-tavern-final-human-review.md)：全部自动化质量和完整流程验收之后执行的最终人工试玩、设备、可访问性与视觉审查。
- [`Remote Distribution — Deferred Scope`](engineering/plans/2026-07-12-project-tavern-remote-distribution-deferred.md)：未来单独获批后才设计的 GitHub/Cloudflare/Electron 等远端分发轨道；当前不是可执行计划。
- [`poc/poc-charter.md`](poc/poc-charter.md)：为什么做、做多少、怎样判断通过。
- [`poc/simulation-rules.md`](poc/simulation-rules.md)：状态模型、命令、时间推进、事件与结算顺序。
- [`poc/balance-v0.md`](poc/balance-v0.md)：首轮可执行数值，不代表正式平衡。
- [`poc/content-and-playtest.md`](poc/content-and-playtest.md)：固定七日场景、教学节奏与策略测试矩阵。
- [`poc/reference-strategies.md`](poc/reference-strategies.md)：把六种 reference 策略展开为唯一命令序列的确定性 driver。

权威按领域划分并写在仓库根目录 `AGENTS.md`：运行时与 Story 架构规格负责技术边界，Contract Catalog 负责字段级 ABI，`docs/poc/` 负责七日玩法与数值，交付路线只负责轨道/实施顺序、验收与停止线，不改变上游合同。

## 研究

- [`research/degrees-of-lewdity-notes.md`](research/degrees-of-lewdity-notes.md)：对本地参考项目的独立重实现工程观察及许可证边界。
- [`research/reference-register.md`](research/reference-register.md)：所有本地参考资料的来源、版本、许可提示和允许用途。

## 决策状态

- **已确认并执行**：Phase 1 基础已完成并通过完整验证；首个玩家内容是七日网页 PoC Story。当前 live workspace 仍保留 Phase 1 的 Modules、Sandbox、Demo 和空 E2E 过渡 package；Phase 2 Task 4 才形成只含 E2E/PoC Story 的目标布局。Debug/Cheat/Automation 的目标形态是运行时能力；每个 `Story × Host` 目标上只有一个 Artifact。当前没有 AIGC 图片进入运行时 Asset Pack。
- **当前实施结构**：Phase 2–6 已按现行架构完成编写和交叉复核；Phase 4 分为 Gameplay Simulation 与 Story/Golden，Phase 5 分为 UI Foundations、Stage/Character Presentation、Tooling/Acceptance。素材 handoff 和 Phase 0 是主 Goal 前的真实 gate；通过后主 Goal 从 Phase 2 开始。
- **尚未通过**：PoC Gameplay、主观素材选择、最终人工试玩与远端发布；素材先行但独立，人工试玩后置，远端发布 deferred，这些都不会仅因工程 Goal 已启动或计划完成而自动视为通过。
- **本轮可调**：所有经济数值、行动/体力强度、需求与委托效率。
- **等待试玩**：行动点与体力是否重复、经营步骤是否疲劳、预测信息量、三种营业模式是否都有用途。
- **明确延后**：Unity、大规模正式美术、完整关系阶段、完整设施树、多周目、外部 Mod 管理器/安全沙箱、运行时 LLM、成人版本。
- **许可已落盘**：SillyMaker 通用引擎使用 MIT；Project Tavern 游戏专用软件与原创内容允许非商业 Fork、Mod、汉化和改编；npm 依赖与 `vendor/**` 内容保留各自原始条款，不由项目验证器做自动许可裁决。
