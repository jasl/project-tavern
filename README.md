# Tavern Game

一个以酒馆经营为主轴、关系养成与文字冒险为副轴的个人游戏开发项目。

当前阶段建设一个生产级 React + TypeScript 游戏运行时与 Story 开发 Harness，首个玩家内容是非正史的七日 PoC。七日玩法模块、公式与平衡可以在试玩后推翻，但 Base/UI、Story Loader、VN、存档/调试、语义自动化、输入与静态发布基础设施按长期维护标准实现。是否以及何时迁移 Unity，待 Web 版本验证玩法后再决定。

## 当前状态

- 高层游戏设计已经形成基线；
- 七日 PoC 的范围、规则、首轮数值与测试场景已经落盘；
- Phase 1 已在 `4e9c2bd` 完成并重新通过完整验证，React/TypeScript workspace、Base、UI、Web Host、确定性 walking Story、测试和可复现构建骨架均已落地；
- Phase 1 后架构已修订为 `ResolvedGame / GameSimulation / GameCommandExecutor / GameQueries`，当前只保留 E2E 与 PoC 两个 Story，每个 `Story × Host` 只有一个 Artifact，Debug/Cheat/Automation 改为运行时能力；
- Phase 2–6 已依据实际 Phase 1 实现完成修订；在长工程 Goal 前先独立准备素材并完成本机依赖与浏览器物化，然后从新的 Phase 2 开始；
- 四张 OpenAI 概念图及其 prompt 已按来源归档在 `art-source/aigc/openai/illustrations/`，仅供人工浏览、调整和重新生成；当前仍未复制进运行时 Asset Pack；
- 大规模正式美术、3D、实时战斗、成人内容和运行时 LLM 均不在当前范围；PoC 必须先以 code-native fallback 完整交付。AIGC 来源归档不进入构建；采用的图片需人工复制到资产包或 Story，由运行时清单、文件字节和自动 Asset Pack digest 进行技术验证。

## 文档入口

- [项目文档地图](docs/README.md)
- [游戏设计基线](docs/design/game-design-baseline.md)
- [Phase 2+ 游戏运行时架构修订](docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md)
- [本地工程交付与独立轨道边界](docs/superpowers/specs/2026-07-12-local-engineering-delivery-boundaries-design.md)
- [Project Tavern Web 运行时与 Story 架构](docs/superpowers/specs/2026-07-10-react-game-harness-design.md)
- [Base Envelope 与 PoC Gameplay Contract Catalog v1](docs/superpowers/specs/2026-07-10-engine-contract-catalog.md)
- [AIGC 素材来源归档设计](docs/superpowers/specs/2026-07-12-aigc-asset-archive-design.md)
- [第一版 PoC 六阶段实施路线](docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md)
- [首批 Web 视觉包与 Image Gen 基线](docs/art/first-web-visual-pack.md)
- [PoC 游戏合同](docs/poc/poc-charter.md)
- [模拟规则与结算顺序](docs/poc/simulation-rules.md)
- [首轮数值草案](docs/poc/balance-v0.md)
- [内容场景与试玩矩阵](docs/poc/content-and-playtest.md)
- [确定性参考策略](docs/poc/reference-strategies.md)
- [参考项目研究](docs/research/degrees-of-lewdity-notes.md)
- [本地参考资料登记表](docs/research/reference-register.md)

## 许可证

Copyright © 2026 Jun Jiang (jasl).

引擎组件以 MIT License 开源；游戏专用软件和原创内容公开源码，仅许可非商业使用。本仓库采用按文件范围划分的多许可证方案：

- `packages/base`、`packages/ui` 与通用 Web Loader/Host 使用 [MIT License](LICENSES/MIT.txt)；
- Story GameplayModules、规则、Hotfix、Stories 和专用测试使用 [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt)；
- 项目原创剧情、本地化、美术、音频和设计文档使用 [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt)。

完整路径范围和复合网页制品规则见 [LICENSE.md](LICENSE.md)。npm 依赖和 `vendor/**` 中的第三方内容始终遵守各自的原始许可、合同、声明或 public-domain 状态，不被项目许可证重新授权；详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目不对 npm 依赖或 `vendor/**` 做自动许可扫描和构建准入判定。项目名称和品牌权利见 [TRADEMARKS.md](TRADEMARKS.md)，贡献边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Reference 目录

`references/` 保存本地参考项目，不进入本仓库版本历史。参考资料必须登记在 `docs/research/reference-register.md`；参考代码只用于理解通用工程模式，不得复制第三方代码、文本、资源或数据到本项目。生产构建、测试和代码生成不得读取该目录。

## 下一道闸门

先完成独立素材轨道并提交可为空的 approved pack 交接，再执行 Phase 0 物化计划；只有本地离线凭据通过后，才能创建从修订版 Phase 2 开始的长工程 Goal。该 Goal 交付可复现的本地 Artifact，但不会生成或批准素材、宣告主观试玩通过、创建 GitHub Actions 或执行远端发布。完整自动化验收之后再启动最终人工审查；远端分发另行设计和批准。
