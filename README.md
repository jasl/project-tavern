# Project Tavern / SillyMaker

Project Tavern 是一款以酒馆经营为核心、关系与文字叙事为重要组成的个人游戏项目；SillyMaker 是本仓库持续维护的 React + TypeScript 游戏引擎。

仓库已经完成首个七日 PoC 的工程闭环。接下来会重新设计玩法并改善引擎：现有 PoC 代码可以作为运行时、Story 组合、存档、诊断和浏览器交付的实例，但其模块划分、公式、平衡和内容都不是最终设计。

## 快速开始

要求：Node.js >= 22.12.0、pnpm >= 11.0.0。

```sh
pnpm install
pnpm dev
```

常用命令：

- `pnpm check`：格式、静态检查、类型检查和产品级自动化测试的本地主入口；
- `pnpm test`：引擎与游戏行为测试；
- `pnpm test:e2e`：浏览器端用户流程；
- `pnpm build:poc`：构建当前 Project Tavern Web Player；
- `pnpm release:poc`：准备带法律文件和技术清单的本地 Artifact；
- `pnpm test:e2e:prebuilt`：验证已经构建的 Artifact。

这些命令不要求特定机器、精确 Node/pnpm patch 版本或 Goal materialization attestation。发布到远端仍是独立的人工作业。

## 文档

- [文档地图](docs/README.md)
- [SillyMaker 架构](docs/engine/architecture.md)
- [引擎特性](docs/engine/features.md)
- [开发与测试](docs/engine/development.md)
- [Story 编写](docs/engine/story-authoring.md)
- [构建与发布](docs/engine/build-and-release.md)
- [Project Tavern 玩法重设计状态](docs/game/README.md)
- [许可政策](docs/policies/licensing.md)
- [素材与参考资料政策](docs/policies/assets-and-references.md)

首个 PoC Goal 的计划、规格、证据和旧 runbook 已整体移入[历史归档](docs/archive/2026-07-first-poc-goal/README.md)。归档用于追溯，不再约束当前开发。

## 仓库结构

```text
engine/packages/base   通用合同、Story authoring、运行时、存档与诊断
engine/packages/ui     通用 React 游戏 UI 与 presentation runtime
engine/packages/web    浏览器 Host、IndexedDB、挂载、路由与自动化
game/stories           Project Tavern Story 与应用组合
docs                   活动技术、游戏和政策文档
```

各 workspace package 当前均为私有包；“public export”表示仓库内受支持的包入口，不表示已发布到 npm。

## 许可证

Copyright © 2026 Jun Jiang (jasl).

这是多许可证仓库：通用 SillyMaker 引擎代码采用 MIT；Project Tavern 游戏专用软件采用 PolyForm Noncommercial 1.0.0；原创内容与项目文档通常采用 CC BY-NC-SA 4.0。第三方材料保留原始条款。完整范围以 [LICENSE.md](LICENSE.md)、文件头和包元数据为准。

Project Tavern 不能被描述为 MIT 游戏或整体开源项目。贡献边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。
