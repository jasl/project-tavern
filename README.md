# Tavern Game

一个以酒馆经营为主轴、关系养成与文字冒险为副轴的个人游戏开发项目。

当前阶段建设一个生产级 React + TypeScript 游戏开发 Harness，首个加载内容是非正史的七日数值 PoC。七日玩法与平衡可以在试玩后推翻，但模拟内核、StoryPackage、VN、存档/调试、自动化测试和静态发布基础设施按长期维护标准实现。是否以及何时迁移 Unity，待 Web Harness 验证玩法后再决定。

## 当前状态

- 高层游戏设计已经形成基线；
- 七日 PoC 的范围、规则、首轮数值与测试场景已经落盘；
- React 游戏 Harness、StoryPackage 与首批 Image Gen 视觉包的书面规格已经确认；
- 五阶段逐任务实施计划和总路线图已经落盘，等待计划评审与显式创建 Goal；
- Phase A 的 UI、酒馆、女主与招牌四张 Image Gen 校准候选已经归档，尚未选为运行时素材；
- 尚未创建前端脚手架；
- 大规模正式美术、3D、实时战斗、成人内容和运行时 LLM 均不在当前范围；首批原创 Image Gen Web 视觉包属于 PoC 交付。

## 文档入口

- [项目文档地图](docs/README.md)
- [游戏设计基线](docs/design/game-design-baseline.md)
- [React 游戏 Harness 与 StoryPackage 架构](docs/superpowers/specs/2026-07-10-react-game-harness-design.md)
- [Engine Contract Catalog v1](docs/superpowers/specs/2026-07-10-engine-contract-catalog.md)
- [React 游戏 Harness 第一轮实施路线图](docs/superpowers/plans/2026-07-10-react-game-harness-roadmap.md)
- [首批 Web 视觉包与 Image Gen 基线](docs/art/first-web-visual-pack.md)
- [PoC 游戏合同](docs/poc/poc-charter.md)
- [模拟规则与结算顺序](docs/poc/simulation-rules.md)
- [首轮数值草案](docs/poc/balance-v0.md)
- [内容场景与试玩矩阵](docs/poc/content-and-playtest.md)
- [确定性参考策略](docs/poc/reference-strategies.md)
- [参考项目研究](docs/research/degrees-of-lewdity-notes.md)
- [本地参考资料登记表](docs/research/reference-register.md)

## Reference 目录

`references/` 保存本地参考项目，不进入本仓库版本历史。参考资料必须登记在 `docs/research/reference-register.md`；参考代码只用于理解通用工程模式，不得复制第三方代码、文本、资源或数据到本项目。生产构建、测试和代码生成不得读取该目录。

## 下一道闸门

评审逐任务实施计划；确认无调整后再显式创建长期 Goal，严格按五个阶段搭建 React + TypeScript Harness。Phase A 候选素材的选择和条款审批仍是独立的人工作业，不应被含混地视为已批准。
