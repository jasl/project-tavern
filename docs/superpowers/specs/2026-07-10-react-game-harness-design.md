# Project Tavern Web 游戏运行时与 Story 架构设计

日期：2026-07-10

最后修订：2026-07-12

状态：Phase 1 已执行的架构基线；Phase 2+ 由 2026-07-12 修订规格覆盖

适用阶段：Phase 1 已实现机制，以及未被后续修订改变的通用原则

> **Phase 2+ 权威修订：** [`2026-07-12-post-phase1-game-runtime-design.md`](2026-07-12-post-phase1-game-runtime-design.md) 已取代本文中的旧术语、公共酒馆 Modules、Sandbox/Demo Story 布局、Player/Developer build flavor、独立 Developer application 和 E2E 复用完整酒馆玩法等约定；[`2026-07-12-local-engineering-delivery-boundaries-design.md`](2026-07-12-local-engineering-delivery-boundaries-design.md) 已将素材准备、人工试玩、CI 和远端托管移出第一轮工程 Goal，并取代本文相冲突的人工审查/发布约定。本文保留为 Phase 1 as-built 设计记录；发生冲突时必须执行后续修订，不得继续扩展旧边界。

## 1. 设计结论

本项目第一轮真正要沉淀的不是七日酒馆玩法，而是一套生产级、可长期迭代的 Web 游戏运行时与 UI 框架。玩法模块、数值公式和 Demo 剧情都允许在试玩后多次推翻；`@project-tavern/base`、`@project-tavern/ui`、Story 装载边界、存档/诊断能力和工程化测试应保持稳定。

最终采用以下模型：

- `@project-tavern/base` 提供中性的运行时合同、确定性会话、持久化、重放、诊断、Story/Hotfix 装载与测试工具；
- `@project-tavern/ui` 提供 React GameShell、中央舞台、Overlay、VN、开发者侧栏和可访问性基础设施；
- `@project-tavern/modules` 提供可静态组合的玩法模块；模块不是 Engine 内建领域，也不是运行时 ECS；
- 一个 Story 是完整、可启动的游戏单元，负责选择模块、组合 `GameProfile`、提供数值/规则/内容/素材，并定义主菜单和全部 Scene；
- `apps/web` 是通用的 Loader、Web Host 和挂载库，只负责装载前、装载失败和安全模式 UI；Story 自有的 Web 应用根将 `StoryEntry` 作为显式参数传入。进入游戏后，由 Story 接管控制；
- Hotfix 是 Story 在创建 `EngineSession` 前主动暴露的一小块 JavaScript monkey-patch 接口；官方路径可校验、可追踪、可复现，第三方越界修改风险自负；
- `stories/e2e` 使用真实模块和最小确定性内容验证模块能正确组合，相当于稳定的集成测试夹具，不复制 Demo Story 的剧情回归。

七日 Demo 的现有玩法和数值继续由 `docs/poc/` 负责。它是第一份试验内容，不是基础运行时的领域模型。

## 2. 文档权威与冲突规则

技术实现按以下顺序解释：

1. [`2026-07-12-post-phase1-game-runtime-design.md`](2026-07-12-post-phase1-game-runtime-design.md) 负责 Phase 2+ 术语、Story、Gameplay、Application、Capability、Input 和 Artifact 边界；
2. [`2026-07-12-local-engineering-delivery-boundaries-design.md`](2026-07-12-local-engineering-delivery-boundaries-design.md) 负责独立素材、本地无人值守工程、最终人工审查与 deferred 远端分发轨道；
3. 本规格负责 Phase 1 as-built 架构和未被修订改变的通用原则；
4. [`2026-07-10-engine-contract-catalog.md`](2026-07-10-engine-contract-catalog.md) 负责共享 envelope 与七日 PoC 的字段语义，并按 2026-07-12 的名称和所有权映射解释；
5. `docs/poc/poc-charter.md` 负责第一轮玩法范围与通过闸门；
6. `docs/poc/simulation-rules.md`、`balance-v0.md`、`content-and-playtest.md` 与 `reference-strategies.md` 负责 PoC Story 的规则、数值和固定场景；
7. `docs/design/game-design-baseline.md` 负责长期产品方向；
8. `docs/art/first-web-visual-pack.md` 负责独立先行素材轨道的首批视觉语言、素材槽位、来源记录和人工准入。

若字段目录把某个酒馆概念写成“Engine ABI”，按 2026-07-12 修订将其解释为 `stories/poc` 的 Story-local Gameplay/PoC ABI，而不是 Base 能力。若两份文档仍出现无法由包所有权解决的冲突，停止实施并修正文档，不由实现者临场创造第三种合同。

本修订明确取代以下旧约定：

- 单一 `src/` 应用和 Engine-owned `GameProfile`；
- Story 不能选择玩法模块；
- Story 只提供固定的七个规则函数；
- `storyDigest + engineDigest` 四元组是唯一兼容键；
- E2E Story 不得使用真实玩法模块；
- Story 素材不能被注入或覆盖；
- 不存在正式 Hotfix seam；
- 已写好的五阶段实施计划仍可直接执行。

## 3. 目标与非目标

### 3.1 第一轮目标

- 建立 pnpm workspace 和清晰的 npm 包边界；
- 实现可无 React 运行、可确定性测试的基础运行时；
- 用 Story 静态组合玩法模块、素材和完整 SceneGraph；
- 完成中央舞台、舞台内 Overlay、VN 和可随时开关的开发者左右侧栏；
- 完成 Save、Quick Save、Auto Save、State Dump、DebugBundle 和 CommandLog 重放；
- 支持启动期官方 Hotfix 覆盖 Story 公开符号；
- 用独立 E2E Story 稳定验证各个模块及其跨模块工作流；
- 以 Demo Story 自有的 Web application root 静态组合通用 Loader/WebHost，并生成可部署到 GitHub Pages 的制品；
- 让后续替换玩法、公式和剧情主要发生在 modules/Story，而不是重写运行时和 UI Shell。

### 3.2 当前非目标

- Unity、3D、第一/第三人称探索和角色自由定制；
- 实时地下城、战斗、装备、敌人和烹饪小游戏；
- 排班沙盒、装修沙盒和长期员工剧情；
- 可视化剧情编辑器和通用节点图；
- 运行中安装、卸载或切换玩法模块；
- 面向不受信任代码的安全 Mod 沙箱；
- 浏览器内完整外部包商店、依赖求解和签名分发；
- 多周目、正式长期经济、完整多周日历和最终平衡；
- 运行时开放式 LLM 对话、后端、账号、云存档和遥测上传；
- 成人内容；
- 通用存档迁移框架；
- 正式音频管线。

## 4. 核心术语

- **Base**：与具体酒馆玩法无关的 Engine/runtime 机制和公共合同。
- **GameModule**：一块内聚玩法能力，拥有自己的状态切片、命令、查询、规则和局部不变量。
- **GameProfile**：某个 Story 在启动前静态组合出的模块集合、状态形状、端口和唯一跨模块协调器。
- **GamePackage**：Loader 可启动的中性包合同。
- **Story**：本项目对一个具体 GamePackage 的称呼；它包含模块组合、游戏内容、素材与全部 Scene。
- **StoryEntry**：Story npm 包对 Loader 暴露的唯一启动入口。
- **PatchSurface**：Story 明确允许 Hotfix 替换的稳定符号集合。
- **ResolvedStory**：Story 定义和全部受管 Hotfix 解析、校验、冻结后的启动输入。
- **EngineSession**：持有唯一权威 Snapshot、串行命令队列和诊断上下文的一次运行会话。
- **Host**：Web 或未来 Electron 提供的存储、文件、导航和平台能力适配器。

Story 是完整作品边界；Module 是源码所有权和测试边界；Hotfix 是启动期替换边界。三者不能混为运行时插件系统。

## 5. 技术栈

- Node.js >=22.12.0；根 `engines` 只声明最低兼容版本；
- pnpm >=11.0.0 workspace；精确依赖 manifest 和 `pnpm-lock.yaml` 负责依赖图重现性；
- React、当前稳定 TypeScript 7 严格模式和 Vite；正式 typecheck 不降级到 TypeScript 6；
- React Router `HashRouter`，确保 GitHub Pages 子路径可用；
- Zustand vanilla store 作为 `EngineSession`/应用端口到 React 的薄订阅桥；
- Zod 或等价 strict runtime Schema 负责 Story、规则输出、存档与导入校验；
- Radix Primitives 负责无样式、可访问的 Dialog、Popover、Tooltip、Tabs 和 ScrollArea；
- Motion 负责少量状态转场，并尊重 `prefers-reduced-motion`；
- Lucide React 负责保存、关闭、设置、调试等系统图标；世界观图标走 `GameSymbol`；
- IndexedDB 与 `idb` 负责 Web 本地持久化；
- Vitest、React Testing Library、Playwright 和 fast-check 负责自动化验证；
- CSS Variables 配合 CSS Modules 或分层普通 CSS；不采用后台管理视觉组件库作为游戏皮肤。

若 TypeScript 7 与 lint 生态仍需 Compiler API 兼容包，只允许它服务第三方工具。项目源码、自有构建脚本和正式 `tsc` 不依赖旧 Compiler API。CI 使用 frozen install，pnpm lifecycle scripts 使用显式 allowlist，GitHub Actions 固定完整 commit SHA。

## 6. Workspace 与 npm 包

```text
packages/
  base/       @project-tavern/base
  ui/         @project-tavern/ui
  modules/    @project-tavern/modules
  assets/     @project-tavern/assets

stories/
  demo/       @project-tavern/story-demo
  e2e/        @project-tavern/story-e2e
  sandbox/    @project-tavern/story-sandbox

apps/
  web/        @project-tavern/web
  electron/   @project-tavern/electron       # 未来

scripts/      构建、digest、Story/素材校验
art-source/   按生成来源组织、仅供人工维护且不参与构建的 AIGC 源档案
```

第一版所有 workspace 包都标记为 private，不发布公共 npm。包仍使用规范的 `exports`、peer dependency、project reference 和 `workspace:*`，防止内部源码路径耦合，为未来单独发布保留真实边界。

`stories/common` 不预建；只有至少两个 Story 出现实际重复后才抽取 `@project-tavern/story-common`。

### 6.1 `@project-tavern/base`

根入口导出：

- GamePackage、Story、GameModule、GameProfile、Host 和 Hotfix 的公共类型与 Schema；
- `ModuleId`、`StateSlotId` 及其无后缀的严格构造函数 `parseModuleId`、`parseStateSlotId`，使模块描述符无需类型断言即可建立；
- 泛型 Player/Developer Application Port、RuntimeViewModel subscription 和 UI contribution 边界；
- `defineGamePackage`、`defineGameProfile`、`defineGameModule`、`definePatchSlot`、`defineSimulationPatchSurface`、`definePresentationPatchSurface` 等无副作用 authoring helper，以及把 GamePackage、显式有序 Hotfix、素材和构建身份原子解析为 ResolvedStory 的 `resolveGamePackageV1`；
- Snapshot、Command、Fact、错误、identity、Strict JSON 和 Canonical JSON 基础合同，以及严格的 Snapshot/Save Schema factories 和 `rngStateV1Schema`。

建议子路径：

- `@project-tavern/base/runtime`：EngineSession 与事务，以及后续阶段加入的 Persistence、Replay 和 Diagnostics；项目 RNG、Story/Hotfix authoring/resolution 合同位于 Base 根入口，Loader/bootstrap controller 属于 `@project-tavern/web`；
- `@project-tavern/base/testkit`：Module/Story/Hotfix contract suite、builders、deterministic driver、断言，以及只用确定性测试身份通过真实 resolver 解析未打补丁 Story 的 `resolveStoryForTestV1`；该结果不冒充生产构建身份。

Base 不得包含体力、好感、菜谱、营业或七日 Story ID。

### 6.2 `@project-tavern/ui`

提供 GameShell、GameStage、HUD/Overlay slots、VN、系统对话框、错误恢复表面和基础组件。DevDock 与 mutating developer renderer 从独立 `@project-tavern/ui/developer` 子路径导出。UI 依赖 Base 的公开应用端口，不导入玩法模块内部实现。

### 6.3 `@project-tavern/modules`

放置项目当前可复用的玩法模块，例如 Run、Calendar、Actors、Status、Inventory、Facilities、Tavern、Workflow、World、Progression、Narrative 和 Scheduling。酒馆专用 State/Command/Fact/Effect/Query 合同属于这里，而不是 Base。

每个模块至少分离：

- headless 领域逻辑与 Schema；
- 公共 read port、owner capability 和 ViewModel projection；
- 可选 React UI contribution，后者可以依赖 `@project-tavern/ui`，领域逻辑不能依赖 React。

### 6.4 `@project-tavern/assets`

提供共享 Asset 类型、校验工具、code-native fallback 和确实跨 Story 复用的项目素材。它不是强制全局素材仓库。Story 可以拥有本地素材，并在组合时选择共享资产、Story 资产和合法覆盖。

## 7. 依赖方向

```text
@project-tavern/base
  ↑              ↑
modules/core     @project-tavern/ui
  ↑              ↑              ↑
modules/ui  -----┘              apps/web generic Loader/WebHost/mount
  ↑                                      ↑
stories/*  → @project-tavern/assets -----┘
  └─ host-specific Story application roots/HTML
```

约束：

- Base 不导入 React、DOM、IndexedDB 具体实现、玩法模块或具体 Story；浏览器实现位于 Host/runtime adapter；
- Module 领域逻辑只依赖 Base 公共合同，不导入 Story、App 或其他模块内部实现；
- Story 的 core/default/development entries 只依赖 Base、UI、Modules 和 Assets；其 host-specific Web composition entry 可以额外依赖通用 `@project-tavern/web` mount API，但不能取得 Web 内部实现；
- `apps/web` 依赖 Base/UI 并导出通用 Host、Loader 与 mount API，不导入任何 StoryEntry、Story ID、玩法命令或游戏素材；构建工具选择 Story-owned application root，而不是让 MIT Web 源码静态 alias 到 PolyForm Story；
- E2E Story 可以组合公开的真实 Modules，但不能导入 Demo Story 内容或私有实现；
- 生产代码、测试、生成脚本和构建不得读取 `references/`。

Oxlint lint policy、仓库自有 boundary verifier、package `exports`、TypeScript project references 和 cycle 检查共同执行这些边界。

## 8. Loader、Host 与启动生命周期

`apps/web` 是通用 Loader/WebHost/mount library，永远不静态导入具体 Story。每个 Story 提供 host-specific Player application root（以及独立 Developer root）；root 导入通用 Web mount API，并把本 Story 默认 StoryEntry、构建元数据和允许的 Hotfix 列表作为显式 bootstrap 参数传入。构建配置只在 Story-owned roots/HTML 之间做 closed selection；这不妨碍未来把同一 Story 构建成独立 `entry.mjs + manifest + assets`。Story 的默认入口只含 Player runtime；fixtures、预览和开发备注位于独立 `./development` export，只有 Story-owned Developer application root 可以导入。

Web route 只表达 Host/build mode，不表达玩法导航：Player 使用 `#/play`；Developer 额外提供 `#/playground` 和 `#/preview/:fixtureId`。preview 只从当前 Story 的 development fixtures 解析稳定 fixtureId，URL 不能直接注入 Scene、Module 或任意 Snapshot。主菜单以后仍是 Story Scene，而不是另一个 Loader route。

标准启动顺序：

```text
Story-owned Web/Electron application root
  → Generic WebHost / ElectronHost + Loader mount
  → 显式传入的 StoryEntry.define()
  → Story 声明 Module/Profile factory、SceneGraph、内容与素材
  → 暴露 PatchSurface
  → Loader 按显式顺序执行已选择 Hotfix
  → 从 resolved patch values 物化并冻结 Simulation/Presentation Programs
  → 从冻结的 SimulationProgram 创建最终 GameProfile
  → 计算 resolved identities 与 digests
  → 校验并冻结完整 ResolvedStory
  → 创建 EngineSession
  → 进入 Story-owned SceneGraph
```

Loader 只拥有：

- Story/Hotfix 选择和装载；
- loading、bootstrap failure、Hotfix conflict、安全模式和 fatal error UI；
- Host 能力注入；
- DebugBundle 导出等最后恢复入口。

主菜单、继续游戏、游戏内设置、全部玩法场景和 VN Scene 都由 Story 定义。进入 Story 后，Loader 不提供另一套竞争性的游戏导航。

Host Adapter 按 Contract Catalog 的声明式端口抽象：只供新锚点 bootstrap 的 entropy、atomic record store（read/list/compare-and-swap batch）、文件选择与下载、仅供 metadata 的时间戳、导航/退出意图、日志和平台信息。Web Host 在 IndexedDB transaction 上实现 record batch；Base 不接收裸 IndexedDB transaction/callback。Player/Story renderer 拿不到 bootstrap entropy；确定性模拟层拿不到真实时间、存储、网络、DOM 或平台对象。

## 9. 静态 Module 组合

GameState 由 Story 选定的一组 Module State Slice 静态组合。TypeScript 使用显式 generics/intersection 和手写 composition root 表达精确形状，不使用 ECS entity/component world，也不把 State 退化为任意字符串字典。

Story 在 `define()` 阶段选择 Module，并声明纯同步 simulation/presentation materializers 与 `createProfile(program)`；Loader 应用全部 Hotfix 后只调用每个 materializer 一次，先验证并深冻结两个 Programs，再从冻结的 SimulationProgram 创建 Profile，因而最终 `GameProfile` 必然闭合 post-Hotfix Program。`ResolvedStory` 冻结后，当前 EngineSession 不得安装、移除、替换 Module 或重新物化 Program。变更 Module 集合需要重新 bootstrap，并产生新的 `simulationDigest`。

每个 Module 必须声明：

- 稳定 module ID 和合同 revision；
- 自己拥有的零个或多个状态路径；
- stateful Module 的 State Schema、初始值、局部不变量、只读 port 与 owner-scoped proposal/apply capability；
- stateless World/Scheduling Module 的纯服务输入输出 Schema；它没有 State slot 或 owner capability，也不能写候选 Snapshot；
- 命令和查询 surface；
- 对其他 Module 公共 port 的显式依赖；
- 对 simulation/presentation digest 的贡献；
- contract tests 和可选 UI contribution。

跨玩法写入由 Profile 中唯一 `CommandCoordinator` 显式编排：路由命令、克隆候选 Snapshot/RNG、读取窄 port、让 owner 产生并应用 proposal、汇总有序 Facts/账本、运行全量 Schema/invariants，最后一次提交。Module 不能直接写其他 owner 的路径。

首版仍优先保持 Module-to-Module read edge 为空，由 Coordinator 组合 DTO；未来确有必要时可增加具名只读依赖，但必须无环且不得暴露整个 Snapshot。

共享的玩家属性属于 Actors 等玩法模块，不属于 Base。Base 只知道 Snapshot envelope、模块贡献、命令事务和查询协议。

## 10. 确定性运行时

EngineSession 持有唯一权威 `GameSnapshot`：组合后的 GameState、可序列化 RNG 状态和 `commandSequence`。React、Zustand、Story Scene、Hotfix 和开发者面板都不能直接写 Snapshot。

本设计是 **snapshot-authoritative、command-driven、fact-emitting deterministic simulation**：

- 相同 Engine、ResolvedStory、初始 Snapshot、命令序列和 RNG 状态产生相同 Snapshot、DomainFact 与账本；
- 单个命令是原子事务；营业、VN、文字冒险等可暂停流程由多个原子命令组成；
- 成功命令生成新 Snapshot；拒绝和 fault 保持最后已提交 Snapshot；
- 随机只通过事务化项目 PRNG，禁止模拟代码调用 `Math.random()`；
- DomainFact 解释刚刚发生了什么，可驱动演出和诊断，但不是权威状态，也不能被监听器重新应用；
- CommandLog 用于有界重放和调试，不是 Event Sourcing 的唯一事实来源；
- 所有改变权威 Session 的操作共用一条 FIFO mutation tail。

精确的 Demo State、Command、Fact、EffectIntent、规则输入输出和不变量继续由 Contract Catalog 冻结，但实现位置按本规格重新归属 Modules/Story。

## 11. Story 与 GamePackage

一个 Story npm 包是完整、内聚、可启动的游戏单元。其 StoryEntry 至少定义：

- `id`、正整数 `revision`；base Story digest 由构建身份输入生成，不由 Story 源码手填；
- 所需 Module、SimulationProgram materializer 与 GameProfile factory；
- 初始状态工厂和 Story State definitions；
- Balance、规则、内容、文本和 Narrative IR；
- SceneGraph，包括主菜单、游戏舞台、Overlay 注册和开发预览；
- Asset manifests、共享资产选择和 Story 本地资产；
- 分离的 Simulation/Presentation PatchSurface；
- 独立 Developer entry 中的 fixtures、预览数据和开发备注；
- Story 自身的验证器。

Story 顶层模块必须无副作用；不得在 import/define 阶段读网络、真实时间、浏览器存储或环境随机。只有 Loader/Host 执行平台 I/O。

Story 可以包含 React UI Scene 和普通 TypeScript 规则，因此不是纯 JSON 包；但内容数据、Snapshot、命令、规则输入输出和可保存 IR 仍必须严格可序列化。默认 StoryEntry 不得引用 Developer entry，Player 构建对 `./development` 设置 import prohibition 和 bundle absence 检查。

第一版构建工具选择 `stories/demo` 自有的 Web Player/Developer application root；`apps/web` 不组合或命名 Demo。未来可增加 `story:pack` 输出独立分发目录，但不在首轮实现浏览器内依赖解析或包商店。

## 12. Narrative 与 SceneGraph

Story 的 `UiSceneGraph` 负责主菜单和正式游戏的 React 场景；Narrative Program 负责可保存、可重放的对白控制流和选择游标。两者分工如下：

- React UI Scene 决定布局、舞台和交互表面，属于 presentation；
- Narrative Program 的稳定 scene/node/cursor、分支、condition、check、command、Effect、jump/call/return 和节点顺序属于 state-contract/simulation；
- line/narration 引用的真实文本、stageCue 的视觉映射和素材属于 presentation；
- 任何世界变化必须通过类型化 Command/EffectIntent；
- 内容节点不携带任意 callback、函数名、脚本字符串、`eval` 或通用表达式语言；
- Narrative 选择在同一候选事务内重新校验条件、执行检定/效果并移动游标，任一失败全部回滚；
- 文字冒险复用 Narrative、Command、Check、EffectIntent 和可保存 Workflow，不另建第二套引擎。

Story 可以用代码定义 UI Scene，但不能让它直接修改 Snapshot。修改 Narrative 控制流必须改变 simulation digest；只修改文本、素材或纯布局只改变 presentation digest。Story 内容可变不等于运行时边界可绕过。

Authoring builder 可以让一个源文件同时描述语义与表现，但 `validateStory` 必须编译成两个结构化输出：`NarrativeProgram` 保存稳定节点、条件、检定、命令和效果；`NarrativePresentationMap` 保存 TextId、AssetId、舞台提示与视觉映射。Digest 对编译后的 facet 计算，不按源文件目录猜归属；同一源文件可以通过不同 canonical projection 同时贡献两个摘要。

## 13. PatchSurface 与 Hotfix

Hotfix 不是数据型 Mod DSL，也不是安全沙箱，而是 Story 在启动阶段主动留出的受管 JavaScript seam。

Story 只公开四类稳定逻辑符号：

- `rule`：算法、结算、判定和派生规则；
- `value`：Balance、数值、常量和受控配置；
- `text`：本地化文本和普通文案；
- `asset`：逻辑素材槽位和已校验资源描述。

Story 的 TextId 与真实字符串分离。Presentation facet 提供带 canonical BCP 47 LocaleId 的 catalog set：默认语言必须完整，其他语言允许部分翻译但 fallback 链必须无环并最终到达默认语言。v1 将完整 catalog set 作为一个强类型 `text.catalogs` Patch Slot，不进行隐式 merge；Hotfix 可以替换整套 catalog 来增加语言或覆盖文案，解析后重新验证全部 TextId 与 fallback。

Story 分别暴露 `SimulationPatchSurface` 与 `PresentationPatchSurface`。前者只允许 `rule | value`，后者只允许 `value | text | asset`；surface 自身决定摘要归属，不能靠作者填写 `impact` 字符串。每个 Patch Slot 声明稳定 Symbol ID、kind、输入/输出或值 Schema、默认 provider source digest，以及是否可替换。Hotfix 使用普通同步 ESM JavaScript；可以导入辅助代码、执行条件判断并生成替代函数。

官方 Hotfix 通过 `@project-tavern/base` 提供的受控 Registry/Proxy 直接替换公开符号。使用体验接近普通赋值，底层记录：

- Hotfix id/revision/实际脚本 digest；
- 替换的 Symbol ID 和前后实现身份；
- 每个目标在应用前预期的 provider digest；
- 显式加载顺序；
- `requires`、`conflicts` 与 `supersedes`；
- 对 simulation/presentation digest 的最终影响。

两个受管 Hotfix 覆盖同一 Symbol 时默认报错。只有后者明确 `supersedes` 前者才允许覆盖；不使用隐含 last-wins。

Loader 接收一份显式有序 Hotfix 列表并原样记录 ordinal，不按文件名或发现顺序排序，也不自动重排依赖。Hotfix ID 不得重复；每个 `requires` 必须指向列表中更早的条目；任一方向声明 `conflicts` 都使组合失败。这样同一配置在不同 Host 上得到相同 PatchSet。

存档收养不由某个 Hotfix 单独声明，而由解析后 PatchSet 的独立 compatibility metadata 声明精确的 `Story + stateContractRevision/digest + fromSimulationDigest → toSimulationDigest + simulationPatchSetDigest`。只要额外启用另一个 simulation Hotfix，最终 digest/simulation PatchSet 就不同，旧收养声明自动失效；纯 presentation Hotfix 不影响收养资格。

Hotfix 在 Story 完成 define 后、EngineSession 创建前执行。第一版不支持运行中切换，即使只改文字或素材也统一重新 bootstrap，避免一个会话混入两套身份。

开发期 HMR 遵循同一边界：Story、Module、rule/value/text/asset 或任何 resolved digest 输入变化都会使当前 Session 失效，暂停新命令和自动保存；开发者可以按旧 provenance 导出最后合法 Save/DebugBundle，再完整 rebootstrap。只有纯 CSS、通用 UI 表现或开发备注等不影响 resolved digests 的变化可以保留普通 HMR。第一版不实现 presentation-only Session 热接续。

Loader 根据实际取得的入口脚本及可解析本地 import closure bytes 计算 digest，不只相信 manifest 声明。无法完整取得依赖闭包的外部动态加载不属于受管 Hotfix。脚本抛错、目标 Symbol 不存在、类型/Schema 不符、冲突或解析后 Story 校验失败时，不创建 EngineSession；保留原 Story/存档，并允许禁用补丁进入安全模式。

官方受管 Hotfix 还必须满足确定性合同：install 同步、无平台 I/O、真实时间、环境随机或全局可变状态；替代 rule 无状态，只依赖输入与显式 RNG。Loader 在新的 candidate registries 上安装，完成后撤销写入 Proxy 并冻结结果；contract suite 在两个全新 candidate 中重复安装并比较 replacement trace、可序列化值和规则向量。普通 JavaScript 无法形成安全边界，因此这些保证只适用于遵守合同的受管路径。

第三方可以自行编辑 bundle、导入内部路径、触碰 `window`、DOM 或 IndexedDB。项目不阻止、不限制来源，也不为 Hotfix 建安全沙箱；但越过 PatchSurface 的行为属于非托管修改：不承诺兼容、存档安全、CommandLog 可复现或 DebugBundle 能完整描述现场。

## 14. 构建身份与 Digest

身份分层，不能再次压缩为一个 app version：

- `storyId`：区分 Story；
- `storyRevision`：正整数、人工维护的粗粒度存档/状态合同代际；纯文本、素材、React Scene 或布局改动不得推动 revision，开发期可长期保持 `1`；
- `storyDigest`：未应用 Hotfix 的 Story 默认 runtime entry 指纹，用于定位 Player 制品；独立 `./development` entry 不进入该摘要；
- `engineVersion`：人类可读的 Base/runtime 版本；
- `engineDigest`：`@project-tavern/base` 中影响事务、Snapshot、RNG、序列化和重放的确定性机制指纹；
- `stateContractRevision/stateContractDigest`：ResolvedStory 的可保存 State Schema、Module state slices、Command/Fact 合同，以及可持久 Narrative scene/node/cursor 等稳定引用边界；revision 用于选择精确 decoder，digest 用于机器校验同一合同，二者都是存档阻断字段；
- `simulationDigest`：ResolvedStory 选定的 Modules、Profile、规则、数值、Narrative 控制流/稳定引用/效果内容及 simulation Hotfix 的解析后指纹；
- `presentationDigest`：React UiSceneGraph、真实文本目录、视觉 cue 映射、素材、样式及 presentation Hotfix 的解析后指纹；
- `appBuildId`：Loader、Host、共享 UI 和最终应用制品的诊断指纹；
- `patchSetDigest/appliedHotfixes`：对有序 Hotfix identities 与替换 traces 计算的组合身份，并逐项记录 id/revision/digest 和替换摘要。

玩法 Module 不再进入 `engineDigest`，而进入选中 Story 的 `simulationDigest`。Story-owned Scene 和资产不进入 Engine；共享 `@project-tavern/ui` 进入 `appBuildId`，Story 的 UI contribution 进入 `presentationDigest`。无法可靠判定的生产输入保守归入 simulation，不能为了提高兼容率漏算。

所有摘要使用带 domain separator 的 SHA-256。结构化数据使用项目唯一 Canonical JSON 实现；排除时间戳、绝对路径、临时文件和摘要字段本身。构建脚本以 Story builder 的结构化 simulation/presentation 输出和代码 import closure 生成 manifests，而不是把整个 Scene 文件粗略归类；未进入任一输出或 closure 的生产输入、非法跨 facet 依赖和过期 manifest都使构建失败。

代码 import closure 的冻结算法是：从明确的 Engine、Story simulation、Story presentation 和 Application roots 分别解析 package `exports` 后的静态生产依赖；拒绝动态任意路径、workspace 外 symlink 与 `references/`；把每个输入记录为 workspace-relative POSIX path、内容 SHA-256 和归属 facet，按 path 升序写入 Canonical JSON，再以对应 domain 摘要。不得把绝对路径、mtime、文件遍历顺序、Vite chunk 名或系统换行转换当输入。一个源文件可以由 builder 产生两个结构化投影，但代码 bytes 只能按实际 import root 归入允许的 closure；非法 simulation → presentation 依赖直接失败。

生成的 root manifests 位于忽略的 `dist/manifests/`，不提交仓库；`pnpm verify` 完成一次构建并只读检查同次产物，`pnpm verify:release` 才在隔离的 clean source archive 中执行两次完整构建并比较字节级可复现性，两者都不得改 tracked 文件。Save/Debug/golden 中需要稳定 provenance 的测试 fixture 单独跟踪，只有显式 writer 可以重写，并由执行 agent 按 delivery-boundaries 规格记录 canonical diff、摘要、分类和审查结论；普通验证不能自动接受。摘要算法 revision、root 清单与 package/toolchain version 写入 manifest，算法变化视为 Engine/state-contract ABI 变更。

State digest 只覆盖完整 GameSnapshot，不包含 provenance、Slot metadata、保存时间、CommandLog 或 UI 状态。

## 15. Save、Quick Save 与兼容

数据分层：

```text
GameSnapshot
  └─ 权威 GameState、RNG、commandSequence

SaveRecord
  └─ format/state-contract revision、provenance、slot metadata、stateDigest、GameSnapshot

DebugBundle / State Dump
  └─ 完整 provenance、replay base、CommandLog、current Snapshot、故障与 UI context
```

Save、Quick Save 和 Auto Save 是 Persistence 操作，不是 GameCommand：不消费 RNG、不发 DomainFact、不增加 sequence。所有 load/import、lifecycle create/restart、debug fixture replacement 与普通 dispatch 共用 EngineSession FIFO，并在成功后原子建立新的 replay base。

首版物理槽位：`auto.current`、`auto.previous`、`quick`、`manual`。Auto current/previous 在同一 IndexedDB transaction 中轮换；Quick/Manual 使用 record revision CAS。Session lease 与 fencing token 防止旧标签页继续写入；第二标签页默认只读，可请求交接或显式接管。

读取失败不删除原记录。IndexedDB 不可用、配额不足或写入失败时游戏可以继续，但 UI 必须持续显示“未安全保存”，并保留 JSON 导出。

每个成功且改变 Snapshot 的 dispatch 在提交后排队 Auto Save；拒绝、fault 和纯查询不排队。每个 Slot 的写入串行，尚未开始的旧 Auto candidate 可以合并成最新 Snapshot，但旧写不能在新写之后覆盖。`auto.current` 损坏或缺失时，合法的 `auto.previous` 只作为明确标记的 recovery candidate 展示，不静默加载。ActiveWorkflow 和 Narrative cursor 都属于 Snapshot，因此营业事件或 VN 中途仍可安全保存和恢复。

任何权威操作一入队，Application Port 必须在同一个 JavaScript tick 同步标记 Session busy；Busy、fault pause 或 HMR invalidation 时拒绝新的 Save 请求。Quick/Manual 在请求被接受的调用时点同步捕获当时最后已提交的 Snapshot，之后的异步写不改换候选。每次 IDB 写完成后重新读取并执行 envelope、state digest 和 Slot revision 校验，全部通过后 UI 才能显示“已保存”。

### 15.1 继续游戏判定

建立可运行 Session 至少要求：

- Story ID 相同；
- Story revision 与 state contract revision/digest 均与当前 ResolvedStory 精确相等；
- Engine digest 相同；
- simulation digest 相同，或者存在与当前 simulation PatchSet 精确匹配的 adoption declaration；
- Snapshot 通过 strict Schema、stable references 和全部 invariants；
- state digest 匹配。

`storyDigest`、`presentationDigest`、`engineVersion` 和 `appBuildId` 差异用于提示和诊断，不单独阻止继续游戏。纯文本、素材或 Scene 表现调整不应让有效存档失效。

公式/数值 Hotfix 的 adoption 只允许在 Story revision、state contract revision/digest 与 Engine digest 均精确相等时发生。成功 adoption 后，以验证过的当前 Snapshot 建立新 replay base并清空旧 CommandLog；旧日志可以留在导出的历史诊断证据中，但不得用新公式重新解释旧命令。

`storyRevision` 是人工维护的粗粒度存档代际；`stateContractRevision` 是该代际内具体 Snapshot/可持久 IR Schema 的 revision。State 结构变化必须递增后者，在旧存档不再可载入时同时递增前者；`stateContractDigest` 即使作者忘记改 revision 也会捕获实际合同变化。State 结构变化不属于普通 Hotfix，需要显式 migrator 或开始新局。首版不实现通用迁移器，也不提供无条件 “Load anyway”。新规则存档回到旧规则同样默认拒绝，除非存在显式兼容/adoption 声明。

## 16. CommandLog、State Dump 与 DebugBundle

Runtime 维护最近 200 次 dispatch 的有界 CommandLog，并保存紧邻首条日志之前的 replay base。日志记录语义 Command、结果、DomainFact/账本、pre/post state digest、RNG 抽取和稳定 fault/rejection code；重放只重新提交命令，绝不重新应用记录的 Facts。

日志达到上限时先前移 replay base，再丢弃更早条目，不能留下不可重放的半段轨迹。

State Dump 统一使用完整 DebugBundle，不另建弱类型现场格式。DebugBundle 记录：

- Story、Engine、resolved digests、Hotfix 集合和 `appBuildId`；
- replay base、CommandLog、current Snapshot 及各自 state digest；
- failure、runtime failures、invariant codes；
- 当前 Scene/Overlay、开发侧栏、选中项等有界 UI context；
- 经隐私裁剪且满足固定大小上限的诊断数据。

authoritative simulation replay 要求 Engine digest 与 simulation digest 精确匹配；presentation 不匹配时仍可验证模拟，但不能称为精确视觉复现。非匹配包只允许 Developer inspection，不写回 Save Slot。

开发者修改必须通过受控 DebugCommand 或 Story fixture anchor。replayable DebugCommand 经过同一事务和 owner capability；fixture load 建立新 anchor，不伪装成普通 CommandLog entry。UI 不获得任意 Snapshot setter。

DebugBundle 默认不记录绝对路径、浏览器历史、任意存储内容或未选择的文件；导出前由 UI 根据已验证 Bundle 与编码 bytes 展示内容类别和大小，不自动上传，也不把展示摘要写回权威 Bundle。

## 17. UI 架构

中央 `GameStage` 始终是正式游戏主表面。固定层级：

```text
SceneBackground
CharacterLayer
SceneInteractionLayer
HUDLayer
WorkspaceOverlayLayer
NarrativeLayer
SystemDialogAndToastLayer
```

- 经营模式显示背景、角色、轻量行动和 HUD；
- VN 模式复用同一舞台并叠加对白、选项和演出；
- 生活方针、背包、采购、设施、账本、存档等使用舞台内 UI Overlay；
- 同时只有一个主要 Workspace Overlay，详情可形成受控栈；
- VN 阻塞时暂停普通经营输入；系统操作和诊断导出仍可用；
- 首版使用语义 DOM、CSS 图层和普通图片，不引入 Canvas/WebGL 游戏循环。

`@project-tavern/ui` 只提供顶栏/HUD slot、布局和交互容器，不硬编码 AP、现金或酒馆 Overlay。Demo Modules/Story 的 UI contributions 向这些 slot 提供日期、时段、AP、关键人物状态、现金、人气和长期压力摘要，并注册生活方针、采购、营业、设施、账本等 Overlay。详细属性、关系和 Aura 通过点击/触摸展开，不依赖 hover。

左右边栏明确为 Developer DevDock：

- 顶栏或舞台角落有始终可用的 Bug 按钮；
- 左右栏可独立呼出、隐藏，也可一键隐藏全部开发 UI；
- 左侧用于 State、Fact、Aura、不变量和命令轨迹；
- 右侧用于 fixture/Scene 跳转、固定随机、Dump 导入、受控 DebugCommand、开发者备注和选项解释；
- 宽屏使用真实侧栏，平板使用覆盖式抽屉；
- 任何 Player 必需信息不得只存在于开发侧栏。

Zustand 只保存不可变 RuntimeViewModel 引用以及 Overlay、选中项、DevDock 等 UI session state。它不保存、复制或持久化 GameSnapshot，也不实现领域规则。

### 17.1 Application Port 与 UI Contribution

Base 暴露由五个窄子端口组成的泛型 `PlayerApplicationPort`：不可变 RuntimeViewModel 的 `getCurrent/subscribe`、类型化 command dispatch、无参数 create/restart lifecycle、persistence/lease，以及只读 diagnostics。Lifecycle 到达 FIFO 队首后才由 Application/Profile 使用 Host bootstrap entropy 产生显式 input 并建立 sequence-0 新锚点，不等同于 Demo 的 `run.start` Command；UI/Story renderer 不能指定 seed/runId。Persistence 只允许玩家写 `quick | manual`，同时提供四槽 list/status/load/clear/export、Save JSON import、无需 IDB 的 current-Snapshot export，以及 lease 请求交接/批准/接管/释放；Auto 两槽只能由运行时策略写入。它不暴露 Snapshot、EngineSession、Module owner capability 或任意 setter。

Command dispatch 的应用层结果先区分 `executed | not_executed`。只有确实在队首调用同一次 Coordinator attempt 时，内部领域结果才使用 `committed | rejected | faulted`；若 admission validation 失败，或排队期间 Session 被前项 fault/HMR 置为不可执行，则返回稳定 `not_executed` code，且不创建日志/RNG/sequence 痕迹。UI 不能把“未执行”本地化成游戏规则拒绝。

`DeveloperApplicationPort` 在独立 Developer entry 上组合 Player port 与 Developer control port，增加 fixture/DebugBundle anchor、DebugBundle inspect、authoritative replay、只读 best-effort replay inspect、受控 DebugCommand 和诊断查询。Player build 不能 import Developer port 或其实现；bundle 检查必须证明 mutating DevTools、fixtures 与开发备注不可达。

`@project-tavern/ui` 定义泛型 UI contribution contract：Story/Profile 静态注册唯一 Scene ID、Overlay ID、HUD slot、GameSymbol provider 和对应 renderer。Player renderer context 精确为 `{ viewSlice, playerPort, presentation }`；`presentation` 只能按稳定 Text/Asset ID 返回已经解析的本地化文本、runtime image 或 code fallback，不能暴露 TextCatalog、Asset Pack 或 runtimePath。Developer renderer 才可额外取得 Developer control port。`@project-tavern/ui` 不读取 Demo command/state 类型。Demo 的 RuntimeViewModel、`DebugUiContextV1`、Overlay ID 和 Action ID 是泛型 envelope 的一次 specialization，不属于 UI Base ABI。

## 18. 视口、输入与可访问性

- 最低支持 1024×768 CSS px；
- 正式构图支持 4:3 到 16:10，逻辑设计基准 1600×1000；
- 超过 16:10 不拉伸舞台，以暗色、模糊或场景延展填充；
- 重要人物、文本和交互位于中央 4:3 安全区；
- 横屏平板是首版完整视觉目标；竖屏可提示旋转，但关键操作仍可通过功能性 reflow 完成；
- 鼠标、触摸和键盘均能完成 Player flow；主要触控目标至少 44×44 CSS px；
- 不使用 hover-only 信息；
- 200% zoom 时弱化场景、折叠 HUD，并让主要 Overlay 成为可滚动全视口布局；
- 对比度、可见焦点、Overlay 焦点进入/返回、状态播报、文本缩放和 reduced-motion 按 WCAG 2.2 AA 目标验收。

Lucide 只承担系统图标。体力、关系、食材、天气和声望等世界观符号通过 `GameSymbol`，允许从 code-native fallback 替换为定制素材。

## 19. 素材组合与治理

运行时只引用稳定 Asset ID。Module/Story 先声明不可变素材槽位：用途、尺寸、安全区、pivot、code-native fallback、加载组和 `replaceable | sealed`；Asset Pack 只提供候选资源，无权改变槽位合同。Story 显式排列共享包、Story 包和开发覆盖；Resolver 先冻结 slots，再按 pack 顺序选择 provider，最后才允许 asset Hotfix 覆盖 replaceable slot。非法覆盖不能靠导入顺序决定。

构建生成不可变 `ResolvedAssetManifest`。未知 ID、usage 不匹配、缺少 slot/fallback、非法 sealed 覆盖、尺寸或完整性错误使 Story validation 失败；运行时 fetch/decode 失败则使用已经校验过的 code-native fallback，并记录 `AssetLoadFaultCodeV1` 分类的 Runtime fault。

AssetRegistry 按 `bootstrap → scene → overlay` 及 manifest 稳定顺序预载，同一最终 URL/sha256 只请求和解码一次。预载接受 AbortSignal，返回逐 Asset ID 的结构化 `loaded | fallback | aborted` 结果，不以一次 aggregate throw 丢失其他结果；同一 URL 的同类失败每个加载周期只记录一次诊断。UI renderer 永远只看到 resolved asset 或 fallback token。

素材分层：

- AIGC 源档案按 `art-source/aigc/<source>/**` 组织；来源目录之下自由分组，模型名和 prompt 都是可选的人工作业信息；
- `art-source/aigc/**` 不进入构建、测试扫描、Player、Pages 或 Asset Pack digest；
- 被采用的图片由作者人工复制到 `packages/assets/**` 或 Story asset 目录，运行时不保留回指 AIGC 档案的版权/provenance 字段；
- `references/` 永不参与构建、测试、生成或 AIGC 输入。

正式运行时素材只记录加载所需的稳定 Asset ID、相对路径、媒体类型、尺寸、字节数和精确文件摘要。Asset Pack digest 由 runtime manifest 的 canonical projection 自动生成，并与精确资源 bytes 一起服务于确定性、缓存、存档身份和诊断；它不是版权或来源审计记录。首版仍可使用完整 code-native fallback 交付。

首批视觉范围继续采用：同一酒馆日/夜母版、女主 identity anchor 及工作/生气变体、损坏/修复招牌，以及 UI 视觉基准图。HUD、面板、文字、焦点态和系统图标保持代码原生。

## 20. 错误与恢复

错误按层归一化：

1. `CommandRejection`：预期规则拒绝；不改变已提交 Snapshot/RNG/sequence；
2. `CompatibilityOrContentError`：Story、Hotfix、Save、素材或引用不合法；不建立或替换 Session；
3. `EngineFault`：规则抛错、输出无效、命令 handler 或 invariant 故障；候选事务回滚、Session 暂停并生成 DebugBundle；
4. Persistence、Asset、UI、Host 和 async failure：属于 Runtime/Application fault，不伪装成 GameCommand 结果。

Hotfix rule 在命令中抛错时不静默降级到原公式；这会破坏可复现性。事务回滚并暂停 Session，玩家可导出现场、载入已验证存档、重新开始或以禁用 Hotfix 的新 bootstrap 启动。

React Root、GameStage/VN 和主要 Overlay 分层设置 Error Boundary。事件处理器、异步资源和 Persistence Promise 由应用端口显式捕获，不能只依赖渲染边界。

Loader 保存上一次成功解析的 Story/Hotfix 组合身份。下次 bootstrap 失败时提供安全模式，但安全模式只是不加载 Hotfix，不绕过 Story/Save 校验。

## 21. 测试策略

采用分层 CI，让基础设施严格而内容迭代成本可控。

### 21.1 Base

- 使用一个极小 synthetic GamePackage 验证 Base 自身，不让 Base 测试依赖酒馆 Modules；
- Command/Transaction 原子性和 FIFO；
- Snapshot/Strict JSON/Canonical JSON round-trip；
- PRNG 固定向量和确定性；
- Save/Debug identity、导入上限和错误分类；
- CommandLog 裁剪与 replay；
- Story/Module resolver 和全局 invariants；
- Hotfix replacement、冲突、`supersedes`、digest、adoption 和安全模式。

### 21.2 Modules

每个 Module 使用 `@project-tavern/base/testkit` 独立验证 State Slice、命令、查询、只读 port、owner capability、局部不变量和 ViewModel projection。模块测试不依赖完整 Demo Story。

Profile/Coordinator 集成测试验证唯一状态 owner、无非法跨模块 import、依赖无环、跨模块成功一次提交，以及拒绝/fault 整体回滚。

### 21.3 Story validation

每个 Story 构建时执行统一 `validateStory`，检查：

- ID 唯一、命名空间和所有引用；
- Module 依赖、State/Command 组合与 Profile 完整；
- Narrative 可达性和 Scene/Overlay 引用；
- Patch Slot 类型、影响分类和 Hotfix 目标；
- Asset ID、覆盖、尺寸、安全区、许可证和预算；
- 规则同步性、输入不变、输出 Schema、无 `NaN/Infinity`、账本和平衡不变量；
- 相同 seed/输入得到相同结果。

PoC 继续保留六种 reference strategies、golden week、fast-check 命令序列和 1,000-seed balance driver。Golden/工程截图只能通过显式命令和执行 agent 的证据审查更新；普通验证不写回。素材采用和人工试玩仍由独立轨道负责。

### 21.4 E2E Story

`stories/e2e` 是模块集成测试用 GamePackage：

- 组合当前第一版全部真实玩法模块；
- 使用最少、固定、无正史负担的内容、数值、规则和 code-native 素材；
- 不导入 Demo Story 的内容、私有 helper 或易变文案；
- 固定 Story ID/revision、seed、fixtures 和语义测试定位；
- 只有 Module 合同变化、新增玩法能力或集成用例变化时才更新。

它至少覆盖：启动/主菜单、强制生活方针选择、VN 对话与选择、时间/AP、一次完整营业结算、营业随机事件中断后的 Save/Load/继续、资源不足后的紧急停业、税负预测、两阶段 WorldAction、跨模块 Effect、D7 总结、Quick Save、State Dump、DebugBundle、Hotfix 启用/禁用/冲突/故障，以及 CommandLog replay。

Playwright 失败产物包含 screenshot、trace、console、State Dump 和 DebugBundle，尽量使 CI 现场可直接还原。浏览器 E2E 不重复证明底层营业公式。

### 21.5 UI 与分辨率

- RTL 按用户可见行为测试 Overlay、焦点、触摸、DevDock 和错误恢复；
- Playwright 主视口至少覆盖 1024×768 与 1600×1000，并验证超宽屏不拉伸；
- 少量稳定 fixture 才使用视觉截图，不建立大面积脆弱像素快照；
- 覆盖 keyboard-only、焦点恢复、200% zoom、reduced-motion 和自动化可访问性扫描；
- 核心 E2E 至少在 Chromium 与 WebKit 运行；真实横屏平板与 VoiceOver 属于工程验收后的最终人工审查；
- 正式 Demo Story 只做启动、首个行动和素材加载 Smoke。

## 22. 本地验证、构建与交付边界

每个工程 checkpoint 至少执行：

1. format、lint、import boundary 和 cycle 检查；
2. TypeScript 7 typecheck；
3. Base/Module unit、contract、transaction、determinism 和 Story validation；
4. Web production build；
5. E2E Story Playwright smoke；
6. Demo Story artifact 的 base-path、启动、首行动和素材 Smoke。

本地 release gate 再执行完整 Playwright、关键分辨率、可访问性和可复现 artifact manifest 检查。仓库最终提供单一非交互入口 `pnpm verify`；它不发布、不改 tracked baseline。

Phase 1 的 Player/Developer 静态 build flavor 只保留为迁移输入：Player 编译时排除 mutating DevTools，Developer 提供 playground、fixtures、DebugCommand 和 Hotfix diagnostics。Phase 2 必须按后续修订将它们收敛为每个 `Story × Host` 唯一 Artifact 和默认关闭的运行时 capabilities，不得继续扩展这套 flavor split。

Vite 固定 `base: "./"` 和 HashRouter。正式本地 Artifact 从干净输入构建两次并比较排序后的 artifact SHA-256 manifest；时间戳等允许的非确定 metadata 不进入比较，source map 默认关闭。`dist`、报告、存档和 DebugBundle 保持 gitignored。

本地交付证据记录 Engine/Story/resolved digests、Hotfix 集合、`appBuildId`、artifact SHA-256 manifest、许可证 notices 和浏览器 smoke。旧构建遇到更高 IndexedDB database revision 时只读退出，不能为了回滚破坏新数据。

远端 CI、部署、remote smoke、权限和回滚由 deferred 分发轨道单独设计。本地工程轨道只提供 bootstrap/verify、Story/Hotfix authoring、存档恢复/导出/删除、依赖物化和 DebugBundle 隐私手册；平板/VoiceOver 与主观试玩属于最终人工审查。

## 23. 安全与健壮性边界

- Story 和 Hotfix 都是受信任 JavaScript，不是假装安全的第三方沙箱；
- 从文件和 IndexedDB 读取的 Save/Debug 数据一律不受信任；
- Save 原始输入默认上限 5 MiB，DebugBundle 20 MiB；深度、节点、数组、对象成员和字符串均有显式上限；
- 导入顺序为 bytes → Strict JSON → envelope Schema → state digest → identity/compatibility → stable references → invariants；失败不能写 IDB 或部分替换 Session；
- Narrative 文本按纯文本渲染，不使用 `dangerouslySetInnerHTML`；
- 构建不得包含密钥、token、本机绝对路径或远程运行时素材 URL；
- 普通 Player 不提供任意 DebugCommand、Snapshot setter 或兼容绕过；
- 不对越过 PatchSurface 的第三方修改提供安全、稳定性或兼容承诺。

## 24. 第一轮交付验收

基础设施验收：

- 四个 `packages/*`、至少 `stories/demo`/`stories/e2e` 和 `apps/web` 的依赖边界可由 CI 验证；
- Demo 和 E2E Story 都可独立静态构建；
- Story 真实选择 Module、素材和全部 Scene；Loader 不拥有游戏主菜单；
- Hotfix 可在 bootstrap 阶段替换公开 rule/value/text/asset，并产生可诊断身份；
- Engine/ResolvedStory/Save/Debug digests 分层生效；
- 中央舞台、Overlay、VN、顶栏和可切换 DevDock 完成；
- Auto/Quick/Manual Save、JSON 导入导出、State Dump 和有界 replay 完成；
- E2E Story 稳定验证各个模块及跨模块工作流；
- `dist/poc` 可以从新局开始、刷新后继续，并在 nested base 下运行通过测试的同一 artifact；
- 素材 fallback 和技术 Asset Pack 验证生效；来源/许可与 Image Gen 采用由先行素材轨道负责。

Demo 玩法验收继续采用 `docs/poc/` 定义的七日范围：生活方针、采购、备菜、营业模式、设施选择、关系/调查取舍、属性门槛、2D6、Aura、税负和多维结局。试玩前不因架构重构主动增加玩法。

## 25. 实施停止线

出现以下情况时停止编码并回到设计：

- Base 必须知道酒馆、关系、Story ID 或具体 Module 才能工作；
- Story 无法选择/替换玩法模块而需要修改 App；
- Module 绕过 Coordinator 直接写其他 owner 或整个 Snapshot；
- UI、Zustand、Hotfix 或开发面板需要直接写 GameState；
- Hotfix 覆盖无法说明 Symbol、顺序、影响分类和实际 digest；
- 存档无法区分 simulation 与 presentation 变化；
- adoption 需要用新规则重放旧 CommandLog；
- E2E 只能依赖 Demo 的易变剧情、文案或平衡；
- Player 必需操作依赖开发侧栏；
- 素材无法说明来源、许可、覆盖和 fallback；
- 同一输入无法稳定复现 digest 或模拟结果；
- 为赶进度需要恢复隐式 callback、通用事件总线、任意规则语言或全局可变 store；
- 规格仍存在会导致两种合理实现的关键歧义。

## 26. 书面评审清单

本规格评审检查：

1. Base/UI 是否与可推翻的酒馆玩法真正分离；
2. Story 是否成为完整组合和启动边界；
3. Module 静态组合是否保留强类型、确定性和跨模块事务；
4. Hotfix 是否既足够灵活，又有清晰的官方支持面和风险边界；
5. provenance、Save adoption 与 replay 是否自洽；
6. E2E Story 是否明确是模块集成夹具；
7. UI、素材、诊断和发布合同是否完整；
8. 是否仍有影响实施的缺失或矛盾。
