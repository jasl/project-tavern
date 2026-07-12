# 文档地图

本目录把长期方向、当前 PoC 合同、可调数值和工程边界分开，避免原型临时决定反向污染正式游戏设计。

## 长期方向

- [`design/game-design-baseline.md`](design/game-design-baseline.md)：已经确认的产品愿景、系统边界与叙事方向。

## 当前七日 PoC

- [`superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md`](superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md)：Phase 2+ 当前技术架构权威；定义 ResolvedGame、GameSimulation、Story Gameplay、统一 Application、Runtime Capabilities、SemanticGamePort、Input 和单 Artifact 边界。
- [`superpowers/specs/2026-07-12-local-engineering-delivery-boundaries-design.md`](superpowers/specs/2026-07-12-local-engineering-delivery-boundaries-design.md)：素材准备、Goal 物化、本地无人值守工程、最终人工审查和 deferred 远端分发的权威轨道边界。
- [`superpowers/specs/2026-07-12-scene-interaction-character-presentation-design.md`](superpowers/specs/2026-07-12-scene-interaction-character-presentation-design.md)：StageScene/variant、角色混合纸娃娃、HitMap/Interaction、内容成熟度、RuntimePresentation 与权威状态单向发布边界。
- [`superpowers/specs/2026-07-10-react-game-harness-design.md`](superpowers/specs/2026-07-10-react-game-harness-design.md)：Phase 1 as-built 架构和未被后续修订改变的 Base/UI、Loader/Host、Hotfix、存档/调试、测试与素材原则。
- [`superpowers/specs/2026-07-10-engine-contract-catalog.md`](superpowers/specs/2026-07-10-engine-contract-catalog.md)：v1 字段级合同；区分 Base 共享 envelope 与 PoC Gameplay/Story 具体字段，按 Phase 2+ 规格中的新名称和所有权解释。
- [`superpowers/specs/2026-07-11-repository-licensing-design.md`](superpowers/specs/2026-07-11-repository-licensing-design.md)：MIT Engine、PolyForm 非商业游戏代码、CC BY-NC-SA 原创内容、npm 依赖与 `vendor/**` 第三方隔离边界。
- [`superpowers/specs/2026-07-12-aigc-asset-archive-design.md`](superpowers/specs/2026-07-12-aigc-asset-archive-design.md)：人类可维护的 AIGC 来源目录、图片/prompt 归档、无审计提升与自动 Asset Pack digest 边界。
- [`superpowers/specs/2026-07-12-simplify-toolchain-and-repository-checks-design.md`](superpowers/specs/2026-07-12-simplify-toolchain-and-repository-checks-design.md)：最低工具链版本、人工维护项目法律文本、轻量 repository policy 与 PoC release Artifact 法律文件携带边界。
- [`superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md`](superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md)：第一版整体交付的轨道顺序、工程 Goal 阶段顺序、公共命令面、跨阶段停止线和最终 Definition of Done。
  - [`Phase 0 — Goal Materialization`](superpowers/plans/2026-07-12-project-tavern-00-goal-materialization.md)：在长 Goal 之前一次性物化全部外部依赖与本机浏览器，并冻结离线验证凭据。
  - [`Phase 1 — Foundation & Walking Skeleton`](superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md)
  - [`Phase 2 — Runtime Alignment & Minimal E2E Story`](superpowers/plans/2026-07-11-project-tavern-02-modules-e2e-story.md)
  - [`Phase 3 — Persistence, Capabilities, Replay & Diagnostics`](superpowers/plans/2026-07-11-project-tavern-03-persistence-diagnostics.md)
  - [`Phase 4A — PoC Gameplay & GameSimulation`](superpowers/plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md)
  - [`Phase 4B — Seven-day PoC Story & Golden Week`](superpowers/plans/2026-07-11-project-tavern-04b-poc-story-golden.md)
  - [`Phase 5A — UI Runtime Foundations`](superpowers/plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md)
  - [`Phase 5B — StageScene, Character & Story Presentation`](superpowers/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md)
  - [`Phase 5C — Tooling, Automation & Acceptance`](superpowers/plans/2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)
  - [`Phase 6 — Reproducible Local PoC Artifact`](superpowers/plans/2026-07-11-project-tavern-06-local-artifact.md)
- [`art/first-web-visual-pack.md`](art/first-web-visual-pack.md)：主线 Goal 之前独立执行的素材准备轨道；定义首批 Image Gen 视觉语言、场景/人物锚点、Asset ID、安全区、来源归档与运行时提升边界。
- [`Final Human Review`](superpowers/plans/2026-07-12-project-tavern-final-human-review.md)：全部自动化质量和完整流程验收之后执行的最终人工试玩、设备、可访问性与视觉审查。
- [`Remote Distribution — Deferred Scope`](superpowers/plans/2026-07-12-project-tavern-remote-distribution-deferred.md)：未来单独获批后才设计的 GitHub/Cloudflare/Electron 等远端分发轨道；当前不是可执行计划。
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

- **已确认并执行**：Phase 1 已完成并通过完整验证；首个玩家内容是七日网页 PoC Story；当前只保留 E2E/PoC 两个 Story；Debug/Cheat/Automation 是运行时能力；UI、本地 Automation、Headless Runner 与 AI adapter 共用 SemanticGamePort；每个 `Story × Host` 只有一个 Artifact。权威 GameState 经同一次 Queries 原子发布 GameView/actions；Renderer 只能通过受控 intent/command 反馈。四张 OpenAI v1 概念图按来源归档但尚未复制到运行时 Asset Pack。
- **已完成修订**：Phase 2–6 已根据 Phase 1 实际代码和新架构重新编写并交叉复核；Phase 5 已拆为 UI Foundations、Stage/Character Presentation、Tooling/Acceptance 三个连续计划。下一次工程 Goal 从新的 Phase 2 恢复，旧 Phase 2/Phase 5 不再执行。
- **尚未通过**：PoC Gameplay、主观素材选择、最终人工试玩与远端发布；素材先行但独立，人工试玩后置，远端发布 deferred，这些都不会仅因工程 Goal 已启动或计划完成而自动视为通过。
- **本轮可调**：所有经济数值、行动/体力强度、需求与委托效率。
- **等待试玩**：行动点与体力是否重复、经营步骤是否疲劳、预测信息量、三种营业模式是否都有用途。
- **明确延后**：Unity、大规模正式美术、完整关系阶段、完整设施树、多周目、外部 Mod 管理器/安全沙箱、运行时 LLM、成人版本。
- **许可已落盘**：通用 Engine 使用 MIT；游戏专用软件与原创内容允许非商业 Fork、Mod、汉化和改编；npm 依赖与 `vendor/**` 内容保留各自原始条款，不由项目验证器做自动许可裁决。
