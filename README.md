# Tavern Game

一个以酒馆经营为主轴、关系养成与文字冒险为副轴的个人游戏开发项目。

当前阶段建设一个生产级 React + TypeScript 游戏运行时与 Story 开发 Harness，首个加载内容是非正史的七日 Demo。七日玩法模块、公式与平衡可以在试玩后推翻，但 Base/UI、Story Loader、VN、存档/调试、自动化测试和静态发布基础设施按长期维护标准实现。是否以及何时迁移 Unity，待 Web 版本验证玩法后再决定。

## 当前状态

- 高层游戏设计已经形成基线；
- 七日 PoC 的范围、规则、首轮数值与测试场景已经落盘；
- Base/UI 包、由 Story 组合的 Modules、Story 自有 Scenes、Loader/Host、Hotfix 与 E2E 集成 Story 的架构规格和字段 ABI 已冻结为第一轮 Goal 的实施基线；
- 旧五阶段计划已因架构重组被清理；新的六阶段工程 Goal 已获授权并进行中，当前执行 Phase 1；完成全部 Phase 1 任务和阶段验收后暂停，不进入 Phase 2；
- Phase A 的四张 Image Gen 校准候选的精确输出绑定服务条款仓库准入已批准；它们仍是 `candidate` 且 `runtime: null`，主观素材选择仍待用户独立确认；
- 尚未创建前端脚手架；
- 大规模正式美术、3D、实时战斗、成人内容和运行时 LLM 均不在当前范围；PoC 必须先以 code-native fallback 完整交付。仓库条款准入不等于运行时选定或发布批准；任何原创 Image Gen 候选仍需人工选定、runtime export 验收和独立发布授权才能进入对应制品。

## 文档入口

- [项目文档地图](docs/README.md)
- [游戏设计基线](docs/design/game-design-baseline.md)
- [Project Tavern Web 运行时与 Story 架构](docs/superpowers/specs/2026-07-10-react-game-harness-design.md)
- [Base Envelope 与 Demo Module Contract Catalog v1](docs/superpowers/specs/2026-07-10-engine-contract-catalog.md)
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
- 游戏 Modules、Stories、规则、Hotfix 和专用测试使用 [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.txt)；
- 项目原创剧情、本地化、美术、音频和设计文档使用 [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt)。

完整路径范围和复合网页制品规则见 [LICENSE.md](LICENSE.md)。npm 依赖和 `vendor/**` 中的第三方内容始终遵守各自的原始许可、合同、声明或 public-domain 状态，不被项目许可证重新授权；详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目不对 npm 依赖或 `vendor/**` 做自动许可扫描和构建准入判定。项目名称和品牌权利见 [TRADEMARKS.md](TRADEMARKS.md)，贡献边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Reference 目录

`references/` 保存本地参考项目，不进入本仓库版本历史。参考资料必须登记在 `docs/research/reference-register.md`；参考代码只用于理解通用工程模式，不得复制第三方代码、文本、资源或数据到本项目。生产构建、测试和代码生成不得读取该目录。

## 下一道闸门

当前工程边界是完成全部 Phase 1 任务和阶段验收后暂停，不进入 Phase 2。Phase A 的仓库服务条款准入已经批准，但主观素材选择、运行时选定与发布授权仍是彼此独立且尚未通过的闸门；工程 Goal 也不会自行宣告主观试玩通过或执行远端发布。
