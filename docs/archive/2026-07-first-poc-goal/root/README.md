# Project Tavern（游戏开发代号）

一个以酒馆经营为主轴、关系养成与文字冒险为副轴的个人游戏开发项目。

**SillyMaker** 是本项目正在建设的正式游戏引擎名称；**Project Tavern** 继续作为使用 SillyMaker 开发的实际游戏代号和仓库身份。

当前阶段建设生产级 React + TypeScript 的 SillyMaker 运行时与 Story 开发 Harness，首个玩家内容是 Project Tavern 的非正史七日 PoC。七日玩法模块、公式与平衡可以在试玩后推翻，但 Base/UI、Story Loader、VN、存档/调试、语义自动化、输入与静态发布基础设施按长期维护标准实现。是否以及何时迁移 Unity，待 Web 版本验证玩法后再决定。

## 当前状态

- 高层游戏设计已经形成基线；
- 七日 PoC 的范围、规则、首轮数值与测试场景已经落盘；
- Phase 1 已在 `4e9c2bd` 完成并重新通过完整验证，React/TypeScript workspace、Base、UI、Web Host、确定性 walking Story、测试和可复现构建骨架均已落地；
- Phase 2–5C 已落地 `ResolvedGame / GameSimulation / GameCommandExecutor / GameQueries`、Persistence/Diagnostics、完整七日 PoC Story、统一 UI/Stage、Story tooling 与 Semantic Automation；workspace 只保留独立的 E2E 与 PoC Story；
- 独立素材交接与 Phase 0 本机依赖/浏览器物化已经完成；Phase 6 已建立冻结数值证据准入、统一 Story × Host 构建、严格 Artifact admission 和可复现本地 release 工程，最终完成状态只由 live Phase 6/Roadmap gate 与 clean tree 证据决定；
- 当前仍没有 AIGC 图片被复制进运行时 Asset Pack；后续候选按来源归档，只有人工选择并提升的文件才进入运行时；
- 大规模正式美术、3D、实时战斗、成人内容和运行时 LLM 均不在当前范围；PoC 必须先以 code-native fallback 完整交付。AIGC 来源归档不进入构建；采用的图片需人工复制到资产包或 Story，由运行时清单、文件字节和自动 Asset Pack digest 进行技术验证。

## 文档入口

- [自动化工程 Goal 唯一入口](docs/engineering/GOAL.md)
- [项目文档地图](docs/README.md)
- [游戏设计基线](docs/design/game-design-baseline.md)
- [SillyMaker 游戏运行时与 Project Tavern Story 架构](docs/engineering/specs/2026-07-12-game-runtime-design.md)
- [本地工程交付与独立轨道边界](docs/engineering/specs/2026-07-12-local-engineering-delivery-boundaries-design.md)
- [SillyMaker Runtime Contract Catalog 与 Project Tavern PoC ABI v1](docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md)
- [AIGC 素材来源归档设计](docs/engineering/specs/2026-07-12-aigc-asset-archive-design.md)
- [第一版 PoC 六阶段实施路线](docs/engineering/plans/2026-07-11-project-tavern-poc-roadmap.md)
- [首批 Web 视觉包与 Image Gen 基线](docs/art/first-web-visual-pack.md)
- [PoC 游戏合同](docs/poc/poc-charter.md)
- [模拟规则与结算顺序](docs/poc/simulation-rules.md)
- [首轮数值草案](docs/poc/balance-v0.md)
- [内容场景与试玩矩阵](docs/poc/content-and-playtest.md)
- [确定性参考策略](docs/poc/reference-strategies.md)
- [参考项目研究](docs/research/degrees-of-lewdity-notes.md)
- [本地参考资料登记表](docs/research/reference-register.md)

## 本地运行手册

- [本地验证与 Artifact 交接](docs/runbooks/local-verification.md)
- [运行时能力](docs/runbooks/runtime-capabilities.md)
- [语义自动化](docs/runbooks/semantic-automation.md)
- [Story Hotfix 编写](docs/runbooks/story-hotfix-authoring.md)
- [Save 数据恢复](docs/runbooks/save-data-recovery.md)
- [依赖升级](docs/runbooks/dependency-upgrades.md)
- [DebugBundle 隐私审查与分享](docs/runbooks/debug-bundle-sharing.md)
- [Phase 6 Release Evidence Template](docs/engineering/checkpoints/release-evidence-template.md)
- [Final Human Review（独立后续范围）](docs/engineering/plans/2026-07-12-project-tavern-final-human-review.md)
- [Remote Distribution（延后且需另行授权）](docs/engineering/plans/2026-07-12-project-tavern-remote-distribution-deferred.md)

## 许可证

Copyright © 2026 Jun Jiang (jasl).

SillyMaker 引擎组件以 MIT License 开源；Project Tavern 游戏专用软件和原创内容公开源码，仅许可非商业使用。本仓库采用按文件范围划分的多许可证方案：

- `engine/packages/base`、`engine/packages/ui` 与通用 Web Loader/Host 使用 [MIT License](LICENSES/MIT.txt)；
- Story GameplayModules、规则、Hotfix、Stories 和专用测试使用 [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt)；
- 项目原创剧情、本地化、美术、音频和设计文档使用 [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt)。

完整路径范围和复合网页制品规则见 [LICENSE.md](LICENSE.md)。npm 依赖和 `vendor/**` 中的第三方内容始终遵守各自的原始许可、合同、声明或 public-domain 状态，不被项目许可证重新授权；详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目不对 npm 依赖或 `vendor/**` 做自动许可扫描和构建准入判定。项目名称和品牌权利见 [TRADEMARKS.md](TRADEMARKS.md)，贡献边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Reference 目录

`references/` 保存本地参考项目，不进入本仓库版本历史。参考资料必须登记在 `docs/research/reference-register.md`；参考代码只用于理解通用工程模式，不得复制第三方代码、文本、资源或数据到本项目。生产构建、测试和代码生成不得读取该目录。

## 当前工程闸门

从 [Goal 入口](docs/engineering/GOAL.md) 根据 live repository state 恢复并验收 Phase 2–6 的本地工程 Goal。该 Goal 交付可复现的本地 Artifact，但不会生成或批准素材、宣告主观试玩通过、创建 GitHub Actions 或执行远端发布。完整自动化验收之后再启动最终人工审查；远端分发另行设计和批准。

## 本地验证命令

[Phase 6 本地 Artifact 计划](docs/engineering/plans/2026-07-11-project-tavern-06-local-artifact.md) 冻结了三个用途不同的入口：

- `pnpm verify` 是 ordinary non-release 本地闸门；它离线执行完整的非发布检查，并对本轮 Artifact 做 development-safe 的结构准入，但不建立 release eligibility。在 clean `HEAD` 上，实际 provenance 仍可以是 `clean_commit`。
- `pnpm verify:release` 是 clean-worktree only 的发布证据闸门；它只接受干净的 exact `HEAD`，先执行普通验证，再准备并严格检查同一份 PoC Artifact、运行 prebuilt smoke 和可复现构建。
- `pnpm verify:balance:freeze` 是 frozen-evidence admission only；它只读准入已经冻结的 A/B report、attestation、commit trailer 与 provenance。缺少或不匹配的外部证据会使该命令失败，但不会授权重新运行 `pnpm verify:balance` 或任何 full balance corpus。

这三个验证入口都不会访问 network、push 或 deploy，也不会修改 tracked baseline。Artifact 发布、远端分发和人工试玩分别属于后续独立流程。
