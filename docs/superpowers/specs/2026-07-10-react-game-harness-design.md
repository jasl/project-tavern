# React 游戏 Harness 与 StoryPackage 架构设计

日期：2026-07-10
状态：待最终书面确认；架构自检已通过，已补齐首批视觉素材方案
适用阶段：七日酒馆 PoC 及其后的 Web 玩法、剧情与数值迭代

## 1. 设计结论

本项目当前不再把 Web 版本视为一次性灰盒，而是建设一个生产级、可长期演进的 React 游戏开发 Harness。第一轮内容仍然是非正史的七日酒馆 PoC；玩法与数值在真实试玩前保持现有假设，不用新增系统掩盖尚未验证的问题。

需要长期保留的是：

- 确定性模拟内核；
- 强类型 StoryPackage 与叙事 IR；
- 中央舞台、Overlay 和 VN 表现层；
- 存档、Quick Save、State Dump 与确定性重放；
- 开发者侧栏、场景预览与测试 Story；
- 内容、素材、构建和诊断的版本身份；
- 自动化测试、静态发布和工程约束。

七日 PoC 的具体公式、内容与路线可以在试玩后推翻，但上述 Harness 边界应能支撑后续持续增加剧情、替换数值算法和扩展玩法。

选择 React Harness 而不是直接进入 Unity，也不是退回表格或命令行模拟：表格/命令行不能真实验证信息层级、点击疲劳、Overlay 与关系事件的操作体验；Unity 又会让引擎学习、场景搭建和正式资源导入过早干扰玩法验证。DOM UI 与纯 TypeScript 内核既能快速调整数值，也能形成可分发、可保存、可诊断的真实游玩流程。

## 2. 文档权威与冲突规则

技术实现按以下顺序解释：

1. 本规格负责 Harness、StoryPackage、UI、存档、调试、测试、构建与素材边界；
2. `docs/poc/poc-charter.md` 负责第一轮玩法范围与通过闸门；
3. `docs/poc/simulation-rules.md`、`balance-v0.md`、`content-and-playtest.md` 与 `reference-strategies.md` 负责七日 Story 的现有规则、数值和固定场景；
4. `docs/design/game-design-baseline.md` 负责长期产品方向。

若旧 PoC 文档中的技术表述与本规格冲突，以本规格为准。明确被替代的旧约定包括：

- “Web 代码可丢弃”；
- 固定的玩家三栏仪表盘；
- `localStorage` 存档；
- Story 只能导出纯数据、不能实现强类型规则接口；
- 单一全局 `GameDefinitions` 同时承载引擎契约与七日内容；
- 把诊断轨迹直接混入可保存的 `GameState`。

七日 PoC 的已确认玩法范围和数值不因这些技术替换自动改变。

## 3. 目标与非目标

### 3.1 第一轮目标

- 用生产级工程边界实现一个完整可玩的七日 Story；
- 玩家可以从开局玩到周日结算，并理解主要取舍和账本；
- 开发者可以替换 Story、跳转场景、固定随机、查看状态和导入调试包；
- CI 使用独立的 E2E Story 稳定覆盖引擎能力；
- 正式 Story 可以构建并发布到 GitHub Pages 供朋友试玩；
- 后续新增剧情和事件主要表现为 Story 变更，而不是修改 React 基础设施。

### 3.2 当前非目标

- Unity、3D、第一/第三人称探索和角色自由定制；
- 实时地下城、战斗、装备、敌人和烹饪小游戏；
- 排班沙盒、装修沙盒、完整设施树和长期员工剧情；
- 可视化剧情编辑器、节点图、Mod SDK 和不受信任的第三方 Story；
- 多周目、正式长期经济、完整多周日历和最终平衡；
- 运行时开放式 LLM 对话、网络服务、账号、云存档和遥测上传；
- 成人内容；
- 存档跨 revision 迁移；
- 正式音频管线。

## 4. 架构原则

### 4.1 专用 Harness，不做泛用游戏引擎

内核服务于酒馆经营、关系养成和文字冒险。只有出现至少两个真实用例时才抽取通用机制。首版不引入 ECS、通用插件系统、通用依赖注入容器、可递归触发的全局消息总线、任意规则语言、CQRS 或事件溯源。

### 4.2 单一权威 Snapshot

EngineSession 持有唯一权威 `GameSnapshot`。其中 `GameState` 是领域状态，RNG 与 commandSequence 是事务元状态；只有引擎命令可以产生下一 Snapshot。React、Zustand、叙事节点、Story 规则和开发者面板都不能直接修改任何一部分。

### 4.3 确定性优先

相同的 Engine、Story、初始 Snapshot、命令序列和 RNG 状态必须产生完全相同的状态、领域事件和账本。模拟逻辑不得读取真实时间、DOM、网络、浏览器存储或 `Math.random()`。

### 4.4 显式扩展点

Story 可以执行 TypeScript，但只能实现引擎声明的具名、强类型规则接口。内容节点不能注册任意 callback、传入函数名、执行脚本字符串或使用 `eval`。

### 4.5 事务与工作流分离

单个命令是原子事务；营业和 VN 等可暂停流程由多个原子命令组成。任何时候都不暴露部分提交的 GameState。

## 5. 系统正交性与所有权

| 模块 | 拥有 | 不拥有 |
|---|---|---|
| Calendar | 日期、时段、AP、生活方针和推进规则 | 体力、剧情触发、营业算法 |
| Actors | 玩家/女主属性、体力、心情、好感、默契、关系阶段 | 时间推进、库存和 UI |
| Status | Aura 实例、来源、可见性、持续时间和到期 | 好感数值、关系阶段、任务事实 |
| Inventory | 钱、物品和食材批次、保质期及原子增减 | 菜单需求、营业收入公式 |
| Tavern | 菜谱可用性、设施、员工抽象、营业流程状态 | 直接写库存、时间或关系 |
| World | 地点、可用行动和文字冒险入口 | 独立探索引擎、地图模拟 |
| Progression | 任务、Fact、路线结果、解锁和结局条件 | 临时生气、体力或库存 |
| Narrative | 当前节点、调用栈、选项与演出提示 | 直接修改任何领域状态 |
| Story | 内容、数值、素材和规则实现 | EngineSession、浏览器存储、React 状态 |
| Runtime | 组合 Engine、Story、存档、素材与 UI 会话 | 领域规则本身 |
| UI | ViewModel、Overlay、焦点和输入映射 | 权威 GameState 和数值算法 |
| Diagnostics | 命令/事件轨迹、不变量报告和 UI 调试上下文 | 正式存档状态 |

额外约束：

- AP 表示可支配时间；体力表示可投入劳动能力，二者不得互相代替；
- 好感是数值，关系阶段是状态机，心情是短周期量，`生气`是 Aura；
- Fact 描述已发生的世界事实，Quest 描述目标进度，Aura 描述仍在作用的处境；
- Event Scheduler 决定何时发生，Narrative 决定如何演出，领域命令决定世界如何变化；
- Story 规则只能返回提案和账本行，引擎负责验证并原子应用；
- Facility、Aura 与剧情奖励通过引擎拥有的强类型 Modifier/Effect Intent 描述影响，不允许 Engine 对 Story ID 写 `switch`；
- Calendar 是唯一允许推进日期与时段的模块；
- Inventory 是唯一允许改变物品批次与余额的模块。

## 6. 技术栈

- Node.js 24 LTS，并在脚手架任务中把当时选定的精确 patch 写入 `.node-version`/`.nvmrc` 与 CI；
- pnpm，`packageManager` 固定精确版本并提交 `pnpm-lock.yaml`；
- React、TypeScript 严格模式和 Vite；
- React Router HashRouter；
- Zustand vanilla store 作为 EngineSession 与 React 的薄订阅桥；
- Zod 负责内容、规则输出、存档和导入数据的运行时校验；
- Radix Primitives 负责无样式、可访问的 Dialog、Popover、Tooltip、Tabs 和 ScrollArea；
- Motion 负责少量状态转场并尊重 reduced-motion；
- Lucide React 负责系统和开发工具图标；
- IndexedDB 与 `idb` 负责本地持久化；
- Vitest、React Testing Library、Playwright 和 fast-check 负责自动化验证；
- CSS Modules 或分层普通 CSS 与 CSS Variables 负责主题，不采用通用后台视觉组件库。

依赖在实施开始时选择相互兼容的当前稳定版本，并由 lockfile 冻结。CI 使用 `pnpm install --frozen-lockfile`。pnpm lifecycle build scripts 使用显式 allowlist；新增原生或安装期脚本依赖必须单独评审。GitHub Actions 使用完整 commit SHA 固定。

## 7. 目录与依赖方向

```text
src/
  app/                 # 启动、路由、组合根、错误边界
  engine/
    contracts/         # Story、命令、Snapshot、规则接口
    core/              # 命令执行、事务、不变量、RNG
    domains/           # Calendar、Actors、Inventory、Tavern 等
    narrative/         # IR 解释器和叙事游标
    scheduling/        # 事件候选与触发边界
  runtime/
    session/           # EngineSession 与 ViewModel 发布
    persistence/       # IndexedDB、SaveRecord、导入导出
    diagnostics/       # trace、dump、恢复
    assets/            # AssetRegistry 与预加载
  stories/
    tavern-poc/
    e2e/
    experiments/
  ui/
    shell/
    stage/
    hud/
    overlays/
    vn/
    debug/
    primitives/
  test-support/        # builders、fixtures、matchers
scripts/               # Story 构建、digest 和验证入口
art-source/            # 获选且可提交的自有母版与来源记录
```

允许的主要依赖方向：

```text
engine/contracts <- engine/core + engine/domains
engine/contracts <- stories/*
engine <- runtime -> persistence / diagnostics / assets
runtime <- app -> ui
```

禁止：

- `engine/` 导入 React、Zustand、Radix、DOM、IndexedDB 或具体 Story；
- Story 导入 Runtime、UI、Persistence 或可变 EngineSession；
- UI 导入领域内部实现并直接构造下一状态；
- Story 相互导入正式内容，尤其是 `e2e` 不得继承 `tavern-poc`；
- 生产代码、测试、生成脚本或构建读取 `references/`。

实施时使用 ESLint import restrictions 和独立 TypeScript project references 或等价检查把这些边界变成 CI 规则，而不是只写在文档中。

TypeScript 至少启用 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`useUnknownInCatchVariables`、`noImplicitOverride`、`noFallthroughCasesInSwitch` 和 `isolatedModules`。公共联合类型通过 exhaustive `never` 检查；只允许从模块公开入口导入。

## 8. 引擎核心合同

权威状态在结构上分成引擎拥有和 Story 运行态两部分，避免把七日路线写进可复用领域模块：

```ts
interface GameState {
  readonly simulation: EngineOwnedState
  readonly story: StoryRuntimeState
}

interface StoryRuntimeState {
  readonly facts: Readonly<Partial<Record<FactId, FactValue>>>
  readonly quests: Readonly<Partial<Record<QuestId, QuestProgress>>>
  readonly outcomes: Readonly<Partial<Record<OutcomeId, OutcomeValue>>>
  readonly narrative: NarrativeRuntimeState
}
```

`FactId`、`QuestId` 与 `OutcomeId` 是由 Story builder 产生的 branded stable IDs，不接受任意 string；每个 ID 的允许值由 StoryStateDefinitions 声明并在编译期与 bootstrap 双重校验。`StoryRuntimeState` 的结构和修改操作由 Engine Contract 封闭定义。引擎不包含 `ending.stable`、`event.old_trade_road` 等具体 ID，也不为某个 Story 增加专用字段。未来出现无法由 Fact、Quest、Outcome 或 Narrative 表达的新机制时，显式扩展 Engine Contract，而不是向 StoryRuntimeState 塞入无类型 JSON。

唯一权威容器：

```ts
interface GameSnapshot {
  readonly state: GameState
  readonly rng: RngState
  readonly commandSequence: number
}
```

`NarrativeRuntimeState` 只存在于 `GameState.story.narrative`，ActiveWorkflow 只存在于 `GameState.simulation`；GameSnapshot 不复制它们。

新局唯一入口：

```ts
createInitialSnapshot(
  loadedStory: LoadedStory,
  seed: NonZeroUint32,
  runId: RunId,
): GameSnapshot
```

它合并 Engine 通用 setup state 与 Story 的 initialState，初始化 Narrative 起点与 RNG，设置 `commandSequence = 0`，消费零次 RNG，通过 Schema/引用/不变量检查后成为 replay base。`StartRun` 是第一条被 trace 的 GameCommand，并负责七日 Story 已冻结的 12 次需求抽取；初始化函数不得提前执行它们。

概念入口：

```ts
type CommandResult =
  | { ok: true; snapshot: GameSnapshot; events: readonly DomainEvent[] }
  | { ok: false; snapshot: GameSnapshot; reasons: readonly RejectionReason[] }

executeCommand(
  snapshot: DeepReadonly<GameSnapshot>,
  command: GameCommand,
  context: EngineContext,
): CommandResult
```

规则：

- 命令和领域事件是可序列化 discriminated unions；
- Story rule 输入每次从 Snapshot 物化为新的 plain-data projection，不与 GameState 共享可变对象或数组引用；开发和测试环境另外 deep-freeze；
- 成功生成新状态，拒绝保持原状态且不产生世界变化事件；
- 规则拒绝返回调用时同一个已提交 Snapshot 引用；测试不得接受“内容相同但偷偷重建”的候选状态；
- 候选状态通过 Schema 和不变量后才提交；
- 每个成功命令分配单调递增 `commandSequence`；
- 所有随机抽取经由可序列化 RNG，并记录抽取序号和用途；
- 领域事件解释“发生了什么”，账本行解释“数值为什么变化”；
- EngineSession 串行化命令，不允许同一会话并发提交。

Command Contract Tests 必须 deep-freeze 完整输入 `GameSnapshot`；成功和拒绝都不得修改输入。拒绝必须返回同一个已提交 Snapshot 引用、空的领域事件集合，并保持 RNG cursor 与 `commandSequence` 不变。

`GameSnapshot` 只包含恢复游戏所需的权威状态。最近命令、日志、UI Overlay、性能数据和错误栈属于 Diagnostics 或 UI Session，不进入 Snapshot。

### 8.1 命令与 Story 动作

GameCommand 描述引擎支持的机制，例如购买、休息、推进时段、开始营业、选择叙事选项和执行世界行动。Story 通过稳定 `actionId`、`eventId`、`choiceId` 和参数选择这些机制，不得向运行时注册新的命令种类。

现有七日文档中的 `BeginAdventure` 等场景化名称在 Story driver 中映射为通用的 `BeginWorldAction { actionId }`；只有真正新增玩法机制时才扩展 GameCommand 联合类型。

### 8.2 纯查询与预览 API

UI、开发者工具和 AI 编码代理不得复制引擎公式。EngineSession 除命令入口外还公开 RNG-free 的只读查询：

```ts
interface EngineQueries {
  getAvailableActions(): readonly ActionView[]
  explainAvailability(actionId: string): AvailabilityExplanation
  previewCommand(command: GameCommand): CommandPreview
  getNarrativeProjection(): NarrativeProjection
}
```

查询与执行共享同一验证器和计算器；查询不能推进状态、写诊断、分配命令序号或消费 RNG。随机行为的 preview 只能返回由 Story 规则定义的确定范围、已提交随机结果或明确的未知项。契约测试保证实际结果落在曾展示的合法范围内。

Engine query 只返回领域与叙事投影，包括稳定文本/素材/cue ID，不返回 React 或布局类型。Runtime Projection 层结合 LoadedStory 文本与 AssetRegistry 产生 `StageViewModel`、HUD 和 Overlay models；UI 只消费这些 ViewModel。这样 Engine 不拥有表现层，UI 也不重新计算领域结果。

### 8.3 冻结的 PRNG 算法与向量

首版 `RngState` 固定为 `{ algorithm: "xorshift32-v1", cursor: NonZeroUint32, rawDrawCount: NonNegativeSafeInteger }`。cursor 是非零 unsigned 32-bit 整数；`rawDrawCount` 对每次底层 `nextU32()`（包括拒绝采样丢弃值）增加 1。所有移位、异或和溢出都按无符号 32 位语义执行：

```text
x = state
x = uint32(x XOR uint32(x << 13))
x = uint32(x XOR (x >>> 17))
x = uint32(x XOR uint32(x << 5))
state = x
return x
```

`nextInt(exclusiveMax)` 只接受 `1..2^32` 的安全整数，其他输入立即拒绝；它使用无偏拒绝采样：`limit = floor(2^32 / exclusiveMax) * exclusiveMax`，反复取得 `nextU32()` 直到 `value < limit`，再返回 `value % exclusiveMax`。不得用浮点缩放或直接取模替代。RNG 状态保存算法 ID 与内部 cursor；首版只有一个流，不预建子流派生协议。

新局把经过 `NonZeroUint32` 校验的 seed 原值作为第一个 cursor，不做额外 hash、warm-up 或 xor。需求抽取固定调用 `nextInt(3) - 1`，按 D1 本地、D1 旅客……D6 本地、D6 旅客映射为 `-1 | 0 | 1`；2D6 固定连续两次调用 `nextInt(6) + 1`，顺序记为 die 1、die 2。purpose 分别使用稳定的 `demand:<day>:<segmentId>` 与 `check:<checkId>:die:<1|2>`。

reference seed `0x00023049` 的前 12 个需求偏移均为 0，随后两枚 D6 为 4 与 3；14 次无拒绝的底层抽取后 cursor 为 `0x4e7b7f2e`、`rawDrawCount=14`。算法、seed 初始化、映射、purpose、拒绝采样和这些向量必须同时被 TypeScript 单元测试、Debug replay 与未来 C# 端口复用。

## 9. 时间、行动与事件边界

权威时间由日期、时段和剩余 AP 组成。具体钟点是基于每 AP 约十分钟的显示推导值，不另存一份可变时间。

标准时段为上午、下午、晚上；凌晨由生活方针、剧情或 Aura 解锁。时段 AP 上限由 Story 的强类型 Balance 配置和已生效修正共同推导。

事件调度只发生在明确检查点：

- 新时段进入后；
- 玩家命令成功后；
- 营业开始、中段和结算前；
- 日终和周结算；
- Story 显式声明的工作流检查点。

React render、属性预览、Tooltip、存档序列化和调试观察不得触发事件或消耗 RNG。

Scheduler 只有在某条 GameCommand 的事务中遇到 Story 声明的加权候选时才能使用该事务克隆出的 RNG，并为每次抽取提供稳定 purpose；其抽取与命令一起提交或回滚。`tavern-poc` revision 1 没有需要 RNG 的 Opening 候选，E2E Story 用固定候选覆盖这一机制。

同一 checkpoint 的候选先按 `priority` 降序、再按稳定 `eventId` 升序排列。无权重的必然事件按该顺序触发且不消费 RNG。每个互斥 weighted group 的正安全整数权重求和必须仍是安全整数；权重 0 候选不参与。Scheduler 对每组只调用一次 `nextInt(totalWeight)`，purpose 为 `scheduler:<checkpointId>:<groupId>`，随后按稳定顺序累加权重，选择第一个满足 `draw < cumulativeWeight` 的候选。负权重、浮点权重、空的正权重组、重复 group/event ID 或无稳定次序在 Story 校验阶段失败。首版不做无放回多抽；需要多个事件时由 Story 声明多个有序 group/checkpoint。

## 10. 营业工作流

营业不是即时小游戏，也不是一条不可暂停的大命令。权威状态中允许存在一个封闭联合 `ActiveWorkflow = OpeningSession | WorldActionSession`，同一时刻最多一个。

`OpeningSession`：

1. `StartOpening` 校验计划、体力和基础资源，原子提交当晚已经不可撤销的 AP、双方体力、工资/杂费与计划原料消耗，并物化一个窄的、可序列化 `OpeningBaseline`（菜单、已消耗批次与成品数量、参与者能力、设施/Modifier、需求输入、已提交成本账本和开始序号），不把整个 GameSnapshot 嵌入 workflow；
2. Scheduler 在固定检查点选择零个或多个营业事件；
3. 环境事件直接生成受控修正；交互事件进入 VN，选择结果通过领域命令写入 OpeningSession；
4. `FinalizeOpening` 调用 Story 的 `TavernSettlementRule` 生成 SettlementDraft，分配订单与容量，结算销量、收入、报废、人气、默契、心情、Aura 和事件事实；
5. 引擎校验库存消耗、容量、账本平衡、有限数值和 Story 输出 Schema；
6. Inventory、Actors、Status 与 Progression 分别应用其拥有的变化；
7. 全部通过后一次提交最终状态和详细账单。

`StartOpening`、每条营业事件/选择命令和 `FinalizeOpening` 都分别提交合法 Snapshot；各自只在其明示 checkpoint 消费 RNG。`FinalizeOpening` 内部的 SettlementDraft 校验与跨领域应用是单条原子事务，并把 OpeningSession 的开始成本与最终结果合并为持久化营业账本。若 Finalize 被拒绝或故障，候选结算不提交，已合法提交的开始成本和 OpeningSession 保持原样；不存在退回成本或另开一条取消营业路径。同一 OpeningSession 可以在已提交的随机事件或 VN 选项处 Quick Save，载入后从同一叙事游标和 RNG 位置继续。

七日 `tavern-poc` revision 1 没有营业中随机候选，因此旧玩法文档和 reference driver 中的一次 `ResolveService` 是规范化 shorthand，构建 fixture 时必须展开成连续两条公开命令：`StartOpening`、`FinalizeOpening`。两条命令各自增加一次 `commandSequence` 并触发一次 Auto Save candidate；第二条只有在第一条成功后才能提交。E2E Story 可以在两条命令之间插入 Scheduler 与 Narrative 命令以覆盖随机事件、选择、中途 Save 和重放。

酒鬼闹事、老饕赞赏等事件负责改变当晚处境与演出；固定、可测试的结算算法负责最终营业额。相同输入与随机状态必须得到相同事件和账单。

`WorldActionSession` 服务首版文字冒险，不引入独立探索引擎：

1. `BeginWorldAction { actionId }` 校验时段、互斥机会、费用和体力，提交开始成本与当前 step；
2. Narrative 展示场景并通过通用选项记录准备和分支；
3. 时段推进只允许到 action definition 声明的下一 step；
4. `CompleteWorldAction` 调用 Check Rule、产生 Effect Intents、结束 workflow，并请求 Calendar 扣除 action definition 声明的当前时段 AP；它不直接修改日期/时段，只有 `AdvancePhase` 可以切换时段；
5. 中途 Save/Quick Save 保存 actionId、step、已提交成本、选择、叙事游标和 RNG。

首版只有上述两个 workflow variant；新增地图、队伍、程序化路线或连续资源模型时再设计独立探索模块。

## 11. 内容与叙事 IR

Story 使用类型化 TS builder 编写内容，但 builder 最终产生可序列化、可校验的 IR。内容节点不得携带任意函数。

基础节点：

- `line`、`narration`；
- `choice`；
- `condition`；
- `check`；
- `command`；
- `jump`、`call`、`return`；
- `stageCue`；
- `end`。

选项条件分为：

- `showWhen`：是否显示；
- `enableWhen`：显示但是否可选；
- `check`：选择后执行确定性门槛或受控随机检定。

Condition 与 Command 使用具名、有限、强类型 DSL，例如属性段位、关系阶段、Fact、Aura、库存、日期和 Story 命令。若出现新玩法，先修改 Engine Contract 和联合类型，再由所有 Story 显式适配；不通过通用表达式树绕过边界。

Narrative Runner 只维护游标、调用栈和演出提示。任何世界变化必须发出领域命令。

`AdvanceNarrative` 与 `ChooseNarrativeOption { sceneId, nodeId, choiceId }` 都是原子 GameCommand。选择命令验证提交时游标仍与预览一致，重新检查 show/enable 条件，按需执行 Check Rule，验证全部 Effect Intents，然后在同一候选 Snapshot 中应用领域变化并移动游标。任一拒绝、Rule fault 或不变量失败都会同时回滚游标、领域状态和 RNG，不能出现“选项已翻页但效果未生效”或相反情况。

### 11.1 开发期热更新

每个 EngineSession 从创建起固定一组 Story/Engine provenance。内容、Balance、Story rule 或 Engine 发生 HMR 后，当前会话不得混入新模块继续运行。Runtime 暂停命令和自动保存，并提供：

1. 以新构建从当前 preview fixture 自动重启；
2. 以新构建开始新局；
3. 使用仍固定在旧模块上的会话导出旧 digest 的 Save JSON 或 DebugBundle，然后完整 reload。

HMR invalidation 禁用全部 IndexedDB Slot 写入，但允许把最后已提交 Snapshot 按旧 provenance 导出为 JSON。任何 Story/Engine digest 输入变化都会使 Vite virtual provenance module 失效；开发插件先使用与 production 相同的算法重新生成 manifests，成功后才能建立新 Session，失败则强制完整 reload 并拒绝启动。

不提供跨 digest 的原地强制继续，因为这会让一个 trace 同时包含两套规则。仅 CSS、纯 UI 表现和不参与 Engine digest 的开发说明可以保留普通 HMR。

## 12. StoryPackage

每个 Story 是受信任、静态链接、完整实现引擎契约的作品模块：

```ts
interface StoryPackage {
  readonly contractRevision: 1
  readonly identity: StoryIdentity
  readonly manifest: StoryManifest
  readonly stateDefinitions: StoryStateDefinitions
  readonly initialState: StoryInitialState
  readonly balance: StoryBalance
  readonly content: StoryContent
  readonly rules: StoryRules
  readonly assets: StoryAssetManifest
}

interface StoryDevelopmentSupport {
  readonly fixtures: StoryFixtures
}
```

`contractRevision` 是静态 Story ABI 的技术字段，不属于 Story 身份，也不替代 `story.revision`。首版只有 revision `1`；因为 Story 与 Engine 在同一仓库静态编译，TypeScript 和 bootstrap validator 会同时检查它。未来若契约发生不兼容变化才增加新 revision。

Story source 只人工声明 `id` 与 `revision`；`digest` 由构建注入到 LoadedStory identity，不能在 Story 源文件中手填。`stateDefinitions` 声明允许的强类型 Fact、Quest 与 Outcome ID、值类型和默认值；`initialState` 是惰性无副作用数据，由 Engine bootstrap 结合通用领域初始值构造新局。Fixtures 属于独立 Developer/Test entry，不是运行时 StoryPackage 的一部分。

Story bootstrap 和 CI 至少校验：稳定 ID 唯一且命名空间合法、所有引用存在、数值为允许范围内的安全整数、原料和配方数量为正、事件窗口与互斥组闭合、Aura 目标和生命周期合法、叙事跳转可达、同优先级候选具有稳定决胜顺序、素材 ID 存在且用途匹配。校验失败不得创建 EngineSession。

### 12.1 强类型规则接口

首版冻结一个穷举的 `StoryRulesV1`，所有槽位都由七日 Story 和 E2E Story 实现：

```ts
interface StoryRulesV1 {
  readonly demand: {
    preview(input: DeepReadonly<DemandInput>): DemandPreview
    resolve(input: DeepReadonly<DemandInput>, rng: RuleRng): DemandResult
  }
  readonly tavern: {
    preview(input: DeepReadonly<TavernPreviewInput>): TavernPreview
    settle(input: DeepReadonly<TavernSettlementInput>, rng: RuleRng): SettlementDraft
  }
  readonly checks: {
    describe(input: DeepReadonly<CheckInput>): CheckPreview
    resolve(input: DeepReadonly<CheckInput>, rng: RuleRng): CheckResult
  }
  readonly endings: {
    evaluate(input: DeepReadonly<EndingInput>): EndingResult
  }
}
```

属性成长不在七日 PoC，因此首版不预建 `AttributeProgressionRule`。新增规则槽位必须先有真实玩法用例、输入/输出 Schema、故障语义和契约测试。

Story 实现必须：

- 同步执行；
- 输入深只读；
- 只返回经过 Schema 校验的纯数据或引擎拥有的 Effect Intent，不返回 State fragment；
- 不直接修改 GameState；
- 不读取 DOM、网络、存储、真实时间或环境随机数；
- 只能通过引擎提供的 `RuleRng` 消费 RNG；
- 不注册新的命令类型、事件总线监听器或生命周期 callback。

RuleRng 由引擎拥有。每次命令开始时，引擎克隆已提交的 RNG cursor，只向明确带 `rng` 参数的规则暴露 `nextInt({ exclusiveMax, purpose })`；`purpose` 是受校验、写入 trace 的稳定标识。preview、describe、内容验证、渲染、存档和热更新永远拿不到 RNG 能力。

规则成功且候选状态通过不变量后才提交克隆后的 cursor。命令拒绝、规则抛错、返回 thenable、输出非法或不变量失败时，候选 cursor 与所有抽取一并丢弃。每次抽取记录 ordinal、用途、参数、结果和 before/after cursor。现有七日 Story 的 12 次需求抽取和 2D6 顺序只能由对应 Story rule 消费一次，Engine 不得再次预抽。

规则的确定性定义为相同输入和相同 RNG 初始状态产生相同输出及相同抽取序列。

为保持现有七日 golden vector，`tavern-poc` Story revision 1 冻结 RNG 消费：StartRun 恰好调用一次 `demand.resolve`，按 D1 本地、D1 旅客……D6 本地、D6 旅客消费 12 次；CompleteAdventure 恰好调用一次 `checks.resolve` 并消费随后两次 2D6；该 revision 的 `tavern.settle` 与 Opening Event Scheduler 消费零次 RNG。营业随机事件能力先由 E2E Story 覆盖；若在正式七日 Story 加入随机营业事件，必须作为显式玩法/数值变更更新 revision 1 的消费规格、golden vectors 与 reference strategies，不能悄悄插入抽取。

每个 Story 自动运行 Rule Contract Tests：输入不变、无 `NaN/Infinity`、输出合法、账本可平衡、同输入同输出和不变量保持。

### 12.2 静态 Story 绑定

构建命令选择一个 Story，`app/active-story` 组合根同时导入 Engine 和由 Vite alias 指向的具体 Story；Engine 本身永远不导入 `@story`。最终应用包不动态执行用户提供的 Story 代码，URL、Save、IndexedDB 和内容 IR 都不能决定模块路径或触发 `import()`。

```text
pnpm story:dev tavern-poc
pnpm story:build tavern-poc
pnpm story:e2e
```

bootstrap 先校验 contractRevision、Manifest、Balance、IR 引用、规则槽位、素材清单和 Story 初始状态，再 deep-freeze 得到 `LoadedStory` 并交给 EngineSession。Story 的顶层模块禁止 I/O、网络、时间、环境随机和浏览器副作用，由 lint、import boundary 和独立 build-smoke import 共同约束。

`e2e` Story 完全自包含，不继承正式剧情、数值或素材。它可以实现受控的测试规则以稳定进入需要的 UI 和状态分支。Fixtures 只由 preview/test 入口导入，不进入正式 Story runtime entry、生产 bundle 或 Story digest。

### 12.3 Story 与 Engine 身份

```ts
interface BuildProvenance {
  readonly story: {
    readonly id: string
    readonly revision: number
    readonly digest: `sha256:${string}`
  }
  readonly engine: {
    readonly version: string
    readonly digest: `sha256:${string}`
  }
}
```

- Story ID 区分不同作品；
- Story revision 是正安全整数，首版从 `1` 开始，作为机器使用的粗粒度兼容边界；
- Story digest 是构建生成的精确指纹；
- Engine version 是人类可读发布标签，不承担兼容判断；
- Engine digest 是当前确定性模拟与重放内核的精确指纹。

开发阶段可以长期保持 Story revision 为 `1` 和固定的开发版 Engine version，digest 仍会区分实际构建。

### 12.4 Digest 生成

所有 digest 使用 SHA-256，编码为 `sha256:` 加恰好 64 个小写十六进制字符（32 bytes）。不同用途加入固定 domain separator：`tavern-story-v1`、`tavern-engine-v1` 与 `tavern-state-v1`，避免同一字节序列跨域混淆。

结构化数据使用一份项目拥有、遵循 RFC 8785 JSON Canonicalization Scheme 的 Canonical JSON 字节编码，并在领域层额外限制所有整数为安全整数。数组保留语义顺序；拒绝 `undefined`、稀疏数组、循环、自定义 prototype、函数、getter、`NaN`、Infinity、`-0`、lone surrogate 和导入 JSON 的重复成员名；字符串不做 Unicode normalization，输出不含无意义空白。Canonical JSON 同时服务 state digest、测试 checkpoint 和 DebugBundle 比较，不能各写一套序列化器。跨 TypeScript 与未来 C# 的 golden byte vectors 是规范的一部分。

构建脚本分别生成 Story 和 Engine 输入清单：

- 使用规范化 POSIX 相对路径排序；
- 逐文件计算 SHA-256；
- 对规范化 JSON 清单再次计算根 SHA-256；
- Story 清单覆盖 identity（digest 字段除外）、manifest、stateDefinitions、物化后的 initialState、Canonical Content/Balance、Story rule 源码及其 Story-local import closure、稳定素材清单和素材字节；
- Story fixtures、测试文件和 preview-only 素材不进入 Story digest；
- Engine 清单覆盖会影响模拟、规则调用、Snapshot 与重放的 Contracts、Core、Domains、Narrative、RNG、Serializer 和相关依赖；纯 UI、CSS 和 Story 素材不进入 Engine digest；
- 排除时间戳、绝对路径、临时文件、source map 路径和生成出的 digest 字段本身。

每个可执行 import 必须恰好归属一个 digest manifest。Story rules 只能导入 Story-local 源码或已经归入 Engine digest 的公开 contract/helper；禁止直接导入其他第三方 runtime。若 Engine 使用第三方 runtime，其精确 lockfile integrity/version、相关 TypeScript 配置和构建配置进入 Engine manifest。源码统一 UTF-8、LF、无 BOM，digest 哈希精确 bytes，不做未声明的源码正规化；CI 对未分类 import 失败。

Story 与 Engine 两个 digest 的组合标识可复现游戏逻辑环境。DebugBundle 另外记录可用的应用 commit 或 CI artifact ID，辅助定位纯 UI 构建，但该值不参与游戏兼容判断。构建时间可以作为普通 metadata 保存，也不参与 digest。

State digest 只覆盖完整 GameSnapshot 的 Canonical JSON，不包含 `savedAt`、Slot metadata、Story/Engine provenance、UI 状态、trace 或异常信息。构建与测试必须能从干净输入连续生成两次相同 digest；生成清单过期时构建失败。

## 13. UI 架构

### 13.1 舞台与模式

中央 `GameStage` 是始终存在的主要表面：

- 经营模式显示背景、角色、轻量行动和 HUD；
- VN 模式复用相同场景层并叠加对白、选项和演出；
- 背包、采购、设施、账本和存档作为舞台内 Overlay；
- 除系统操作外，VN 阻塞时暂停经营输入。

固定层级：

```text
SceneBackground
CharacterLayer
SceneInteractionLayer
HUDLayer
WorkspaceOverlayLayer
NarrativeLayer
SystemDialogAndToastLayer
```

同一时间只允许一个主要 Workspace Overlay。嵌套详情可以位于其上；关闭顺序遵守栈。Overlay 打开时屏蔽下层指针并正确管理焦点。

首版 `GameStage`、HUD、VN 和 Overlay 使用语义 DOM、CSS 图层与普通图片素材，不引入 Phaser、Canvas、WebGL 或独立游戏渲染循环。以后若某个真实玩法确实需要 Canvas/WebGL，必须先证明它不破坏可访问性、输入和可测试的 ViewModel 边界，再作为单独设计变更加入。

视觉方向、首批 Image Gen 清单、Asset ID、尺寸、安全区与来源记录以 [`docs/art/first-web-visual-pack.md`](../../art/first-web-visual-pack.md) 为准。Image Gen 只生成场景、人物和视觉参考；最终 HUD、面板、排版、焦点态与系统图标仍由 React/CSS/Radix/Lucide 实现，不把整张 AI UI 截图当成交互界面切图。

### 13.2 顶栏与开发者侧栏

顶栏显示日期、时段、AP、双方关键体力/心情、现金、人气和税负摘要。详细属性、关系和 Aura 通过点击或触摸展开，不依赖 hover。

Player 与 Developer build flavor 使用同一 GameShell：

- Player flavor 只提供 `#/play` 与只读诊断导出，编译时排除 mutating DevTools；
- Developer flavor 提供 `#/playground` 与 `#/preview/:sceneId`，顶栏右上角显示 Lucide `Bug` 按钮；
- DevDock 可独立开关左侧观察器、右侧工具/备注或两者；
- 两栏关闭后除 Bug 按钮外与玩家模式一致；
- “隐藏全部开发 UI”用于无干扰截图；
- 宽屏为真实侧栏，平板为互斥的覆盖式抽屉。

左侧观察 State、Fact、Aura、不变量和命令轨迹；右侧提供跳场景、固定随机、导入 Dump、受控改值、开发备注和选项解释。任何正式玩家必需信息不得只存在于侧栏。

### 13.3 视口与输入

- 最低支持 1024×768 CSS 像素；
- 支持 4:3 至 16:10；
- 超过 16:10 后停止拉伸，以暗色或场景延展填充；
- 逻辑设计基准为 1600×1000，背景母版为 2560×1600；
- 重要人物、文本和交互放在中央 4:3 安全区；
- 鼠标、触摸和键盘都能完成完整 Player flow；复杂快捷键只作为桌面和调试增强；
- 不使用 hover-only 信息；
- 主要触控目标至少 44×44 CSS px；对比度、可见焦点、Overlay 焦点进入/返回、可访问名称和 reduced-motion 纳入验收。

首版的完整视觉构图支持平板横屏；普通竖屏可以提示旋转。低于 1024×768 或在 1024×768 上使用 200% browser zoom 时，应用进入功能性 reflow：弱化/裁切场景、折叠 HUD、把主要 Overlay 变为可滚动全视口布局，但不得只显示阻塞性的“扩大窗口”页面，所有关键操作仍可完成。目标为 WCAG 2.2 AA 的对比度、语义标签、状态播报和文本缩放下无关键操作丢失。

Lucide 用于保存、关闭、返回、设置、搜索和调试等系统图标。体力、关系、食材、天气和声望等世界观符号通过 `GameSymbol` 抽象，允许 PoC 占位后替换定制素材。

## 14. ViewModel 与 Zustand 边界

EngineSession 发布不可变的 Engine Snapshot 和按界面用途派生的 ViewModel。React 通过 Zustand vanilla store 的 selector 订阅所需切片。

Zustand 可以保存：

- 当前只读 Engine Snapshot 引用；
- Overlay 栈、开发栏开关、选中项和路由会话；
- 非权威的加载、保存和错误状态。

Zustand 不得：

- 实现领域规则；
- 直接修改 GameState；
- 使用 persist middleware 保存权威游戏；
- 复制一份可以与 EngineSession 分叉的 GameState。

App 组合根把一个只暴露 queries、dispatch、persistence operations 和 Runtime ViewModels 的 `GameApplicationPort` 注入 UI。UI 依赖该公开 Port 类型，不导入 EngineSession 或 Runtime 实现；Zustand adapter 位于 app/runtime 边界并实现订阅。这样 import rule 可以明确禁止 `ui -> runtime/internal` 与 `ui -> engine/internal`。

## 15. Snapshot、存档与 Quick Save

### 15.1 数据分层

```text
GameSnapshot
  └─ 权威 GameState（内含 Narrative Cursor 与 ActiveWorkflow）、RNG、命令序号

SaveRecord
  └─ formatRevision、provenance、slot metadata、stateDigest、GameSnapshot

DebugBundle
  └─ formatRevision、provenance、GameSnapshot、replay checkpoint、trace、diagnostics、UI context
```

```ts
interface SaveRecordV1 {
  readonly formatRevision: 1
  readonly recordRevision: number
  readonly provenance: BuildProvenance
  readonly slot: SaveSlotMetadata
  readonly savedAt: string
  readonly stateDigest: `sha256:${string}`
  readonly snapshot: GameSnapshot
}

interface DebugBundleV1 {
  readonly formatRevision: 1
  readonly provenance: BuildProvenance
  readonly appBuildId?: string
  readonly replayBase: GameSnapshot
  readonly trace: readonly DispatchTraceEntryV1[]
  readonly currentSnapshot: GameSnapshot
  readonly failure?: DebugFailureV1
  readonly uiContext?: DebugUiContextV1
}
```

`savedAt`、Slot metadata、recordRevision 和 appBuildId 都不参与 state digest 或模拟。

SaveRepository 支持任意稳定 Slot ID；首版 UI 只暴露：

- `auto.current` 与只读恢复槽 `auto.previous`，共同表现为一个滚动 Auto Save；
- `quick`；
- `manual`；
- JSON 导入、导出和清除。

Save、Quick Save 和 Auto Save 都是 Persistence 操作，不是 GameCommand：不消费 RNG、不产生领域事件、不增加 commandSequence。存档只捕获最新已提交且通过不变量的 Snapshot；dispatch 正在执行、StoryRuleFault、HMR invalidation 或恢复导入尚未完成时禁用保存。若用户在营业事件或 VN 中保存，Snapshot 包含 ActiveWorkflow 和 Narrative Cursor，因此仍是安全边界。

载入在候选 Snapshot 完整验证通过后才原子替换 EngineSession，并以载入状态建立新的 replay anchor。强制接受 digest mismatch 后，不得立即覆盖唯一的 exact-build previous save。

每个成功且改变 Snapshot 的 dispatch 在提交后排队 Auto Save；拒绝和纯查询不排队。每个 Slot 的异步写串行执行，尚未开始的旧 Auto candidate 可以合并成最新 Snapshot，但旧写绝不能在新写之后提交。成功 Auto 写将旧 current 轮换到 previous；Quick 与 Manual 只替换各自 Slot，并捕获调用瞬间的已提交 Snapshot。

读取 Auto Save 时分别对 current 与 previous 执行完整候选验证。current 缺失，或完整性、Schema、稳定引用与不变量校验失败时，合法的 previous 只作为明确标记的 recovery candidate 展示；provenance mismatch 仍严格按 15.3 节处理，不能因回退而静默绕过。读取失败不得覆盖、删除或“修复”任一原记录。

### 15.2 IndexedDB 与多标签页

IndexedDB 自身拥有独立的 `databaseRevision`，不得与 Save `formatRevision` 或 Story revision 混用。首版 object stores 至少包括：

- `saveRecords`：以 `[storyId, slotId]` 为物理键；首版 slotId 固定为 `auto.current | auto.previous | quick | manual`；
- `settings`：玩家和开发 UI 偏好；
- `diagnosticDrafts`：有界、可清理的本地故障草稿，不自动上传。
- `sessionLeases`：当前 Story 的 ownerId 与单调递增 fencingToken。

数据库名包含应用 ID 与当前 Story ID；Story ID 也保留在记录键和信封身份中，防止导出或未来迁移时失去来源。每个物理 Slot 的 SaveRecord 带各自单调递增的 `recordRevision`。普通 Quick/Manual 写在同一 readwrite transaction 中读取该 Slot revision、比较调用方 expected revision 并写入 candidate。Auto 写在同一 transaction 中同时读取 `auto.current`、`auto.previous`、Session lease 与调用方 expected current revision：先把旧 current 作为新 previous 内容写入并递增 previous revision，再写新 current 并递增 current revision；任一 CAS 或 lease 检查失败则两者都不变。revision 不符时返回显式 conflict，不允许最后写入者静默覆盖。

写后重新读取并校验；只有验证成功才向 UI 报告保存完成。BroadcastChannel 只负责快速通知其他标签页和改善体验，不承担并发正确性。

首版不支持同一 Story 多标签页并发游玩。每个活动 Session 取得随机 `ownerId` 和持久化 fencingToken；正常交接或强制接管都在单一 IDB transaction 中递增 token 并写入新 owner。每次保存 transaction 同时校验 owner/token 与 expected recordRevision，任何一项不符都返回 stale-writer conflict。

BroadcastChannel 只负责通知和合作式交接：第二个标签页默认只读，可请求原标签页释放；原标签页无响应或已崩溃时，用户可以显式强制接管并递增 token。旧标签页从后台恢复后即使错过全部消息，也因 fencingToken 过期无法写入，并切换为只读冲突状态。

SaveRepository 还必须处理 blocked upgrade、`versionchange`、连接异常终止、配额/隐私模式失败和旧应用回滚。旧构建遇到更高 databaseRevision 时进入只读恢复模式，不尝试降级写入。

若 IndexedDB 不可用、配额不足或写入失败：

- 游戏可以继续在内存运行；
- UI 持续显示“未安全保存”；
- 自动保存不伪装成功；
- 玩家仍可下载 JSON；
- 原有合法存档不得被覆盖或删除。

### 15.3 兼容策略

- Story ID 不同：不能建立可运行 Session，Playground 只允许 inspection；
- 不支持的 Save `formatRevision`：拒绝；只有未来真实存在的纯结构 migrator 才能升级，首版不编造迁移；
- Story revision 不同：首版没有迁移器，不能建立可运行 Session，并保留原文件；
- digest 不同但 ID/revision 相同：Player 与 Playground 都显示保存时/当前身份，并只提供取消或显式 `Load anyway`；
- Engine version 只用于人类识别；Engine digest 不同同样警告；
- stateDigest 与重新计算值不同：拒绝；
- 导入永远先解析到隔离候选对象，通过大小、深度、集合/字符串上限、Canonical JSON、Schema、身份、引用和不变量检查后才替换当前会话。

首版不承诺向前或向后兼容。没有迁移器不等于可以静默忽略差异。

`Load anyway` 建立的 Session 标记为 `compatibilityTainted`。Auto、Quick 和 Manual 写入保持禁用，但 JSON 导出可用，直到用户选择 `Adopt current build`。Adopt 必须先把来源 SaveRecord 保留为 recovery/previous，再用当前 provenance 写新记录，并在 metadata 记录 `loadedFrom` 的旧身份。

## 16. DebugBundle 与确定性重放

Runtime 维护有界的 Diagnostic Trace：

- 一份紧邻 `trace[0]` 之前的 replay base Snapshot；
- 此后的命令、拒绝、领域事件和 RNG 抽取；
- 每步 before/after 状态 hash；
- 当前 Snapshot；
- Story/Engine provenance；
- 内容校验、不变量和最近异常；
- 可选的路由、Overlay、侧栏和选中项。

每条 DispatchTraceEntry 保存精确命令、成功/拒绝/故障结果、期望领域事件、pre/post state digest，以及 `committedRngBefore`、`attemptedDraws`、可选 `candidateRngAfter` 和 `committedRngAfter`。对拒绝或故障，committed after 必须等于 before，候选抽取只作为诊断证据。重放只重新提交命令；记录的领域事件和账本是待比较输出，绝不能再次应用。

authoritative replay 比较结果 discriminant、稳定 rejection/fault code 与 rule slot、领域事件和账本顺序、state digests 及 attempted draws。错误消息、stack、耗时和浏览器 metadata 只用于诊断，不属于确定性比较。

首版上限为最近 200 次 dispatch。达到上限时，Runtime 将 replay base 前移到被保留首条命令之前，并丢弃更早日志；不能留下无法重放的半段轨迹。开发者 DebugCommand 必须同样可序列化、可重放并进入 trace；不可重放的调试操作会建立新的 anchor 并清空旧 trace。

不变量失败时：

1. 候选状态不提交；
2. EngineSession 暂停新命令；
3. 自动生成内存中的 DebugBundle；
4. 恢复 Overlay 允许导出、回到最后正确状态、载入存档或重开；
5. 不进行远程上传。

故障包中的 `currentSnapshot` 始终是最后已提交的合法状态。失败命令、候选 RNG 抽取和错误信息单独保存在 `failure`；若非法候选状态仍能安全 Canonical serialize，可作为可选 `candidateSnapshot` 附加，但不得冒充已提交状态。

导入 DebugBundle 时同时比较 Story 和 Engine 的身份。只有 digest 完全匹配才称为 authoritative replay；不匹配时必须在尝试恢复前显示期望值与当前值，Playground 只允许明确标记的 best-effort inspect/replay，Player Route 不提供绕过。

## 17. 错误分类

- `CommandRejection`：预期的游戏规则拒绝，状态不变；
- `ContentValidationError`：Story 内容、引用或 Balance 不合法，开发和 CI 阻止启动/构建；
- `StoryRuleFault`：规则抛错、返回 thenable、输出 Schema 非法或 Effect Intent 在结构/语义校验时被拒绝，事务回滚并生成 Dump；
- `PersistenceError`：保存、读取、配额或多标签页冲突，保持内存状态和旧存档；
- `AssetLoadError`：开发模式显示素材 ID 占位，玩家模式显示安全 fallback 并保留诊断；
- `UiRenderError`：React Error Boundary 保持 EngineSession，允许导出 Dump 或重载 UI；
- `EngineInvariantError`：合法 Effect Intents 由引擎应用后仍违反 Engine invariant，冻结会话并进入恢复流程。

错误文案面向玩家时使用中文；内部错误保留稳定 code、上下文和 cause，不依赖字符串解析。

React Error Boundary 只捕获渲染错误；Application Facade 还必须显式捕获事件处理器、异步 Story/素材加载、Persistence Promise 和 Engine dispatch 故障。Root Shell 与 VN/Stage 分别设置恢复边界，使 UI 局部崩溃时仍能保留 EngineSession、载入最后存档或导出诊断。

DebugBundle 默认不记录本机绝对路径、浏览器历史、任意存储内容或用户未选择的文件。Story 文本只记录稳定 ID；需要正文时由匹配 digest 的 Story 解析。玩家主动导出前展示包含内容摘要和大小。

## 18. 素材管线与许可证

Story 只通过稳定 Asset ID 引用素材。运行时素材位于 Story 的 `assets/runtime/`，并参与 Story digest。

首轮明确使用 OpenAI Image Gen 生成原创 Web 视觉包。用户提供的商业游戏截图只用于人工总结布局规律，不作为生成输入；`references/`、购买素材和许可未明确允许 AIGC 的图片不得上传到任何生成服务。首批内容与精确 prompt、归档和验收清单见 [`docs/art/first-web-visual-pack.md`](../../art/first-web-visual-pack.md)。

素材分层：

- 运行时成品提交仓库；
- 获选、自有、体积合理的母版、提示词和处理记录提交 `art-source/`；
- 原始生成候选批次、商业素材原包和第三方参考图不进入应用仓库；
- `references/` 永不参与构建、测试、生成或 AIGC 输入，除非具体许可证明确允许且另行记录。

每项正式素材记录：来源类型、作者或服务、模型与日期、提示词、输入素材、许可证、允许用途、修改记录、源摘要和运行时摘要。

运行时 Manifest 还记录文件大小、像素尺寸、格式和加载组。CI 拒绝未登记素材、未知或禁止许可证、任意远程 URL、重复 ID，以及生产/测试对 `references/` 的依赖；发布包生成第三方 notices。首个代表性背景、人物和图标进入仓库时同步提交 `asset-budgets.json`，以实测值建立首版初始加载、单文件和 Story 总大小上限；此预算文件是首次 Pages 发布的必需物，后续超限必须以显式评审改动更新，不能由 CI 自动放宽。

首版视觉包包括：

- 一张 Player 舞台 + Workspace Overlay 的 UI 视觉基准图，只作设计参考、不进入运行时；
- 酒馆主场景白天母版及从同一母版编辑出的晚间光照变体；
- 女主 `neutral` 身份锚点及由它编辑出的 `working`、`angry` 变体，避免每张重生成造成身份漂移；
- 同一块酒馆招牌的 `damaged` 与 `repaired` 状态，用于周五事件及其回流经营的可见反馈；
- 采购、营业、账本、设施与关系所需的小尺寸世界观符号由代码原生 `GameSymbol` 提供，不交给 Image Gen 生成位图。

背景以 2560×1600 母版制作，运行时优先导出 WebP；透明人物使用 PNG 或 WebP。复杂头发边缘在概念阶段不强行抠图，先确定身份锚点，再选择经验证的透明化流程。首版不因正式美术未完成而阻塞玩法验证，但占位资产也必须满足最终尺寸、锚点和安全区契约。

## 19. 路由、构建与发布

路由：

- `#/play`：Player 与 Developer flavor 均可使用；
- `#/playground`：仅 Developer flavor，可呼出 DevDock；
- `#/preview/:sceneId`：仅 Developer flavor，使用 Story fixture 预览叙事场景。

Vite 在构建时静态选择 Story 并配置 GitHub Pages `base`。正式工作流：

1. 校验所有 Story；
2. 完成静态检查、类型检查和非浏览器测试；
3. 一次构建正式 `tavern-poc` Player artifact；
4. 使用 Developer flavor 构建 `e2e` Story 并运行 Playwright；
5. 对步骤 3 的正式 artifact 运行 base-path、启动、首个行动和素材 Smoke；
6. 只上传步骤 3 的同一份 `dist` 到 GitHub Pages，不在部署 job 重新构建。

由于 IndexedDB 受 origin 约束，仓库路径或域名迁移不承诺自动搬迁存档；JSON 导入导出是长期保留的逃生口。

首版不做 PWA、Service Worker 或离线安装。静态托管和浏览器缓存足以满足朋友试玩。

正式构建默认不公开 source map。发布 workflow 使用受保护的 `github-pages` environment；部署后对真实仓库 base path 和代表性 hash route 执行 Smoke。Release 验证额外从干净输入构建两次并比较排序后的 artifact SHA-256 manifest，排除允许的非确定 metadata。

## 20. 测试策略

### 20.1 引擎与 Story

- 领域命令单元测试；
- Story Rule Contract Tests；
- 营业结算 golden cases；
- Narrative IR 和 Event Scheduler 测试；
- RNG 固定向量和相同输入重放；
- Save/Quick Save/ActiveWorkflow round-trip；
- digest 与身份匹配测试；
- Story 内容引用、设施图和叙事可达性检查；
- fast-check 生成命令序列并持续验证不变量；
- 现有 1,000-seed balance driver 与 reference strategies。

### 20.2 UI 与 E2E

- React Testing Library 按用户可见行为测试 Overlay、焦点、触摸和错误恢复；
- Playwright 覆盖 1024×768、1280×800、1600×1000 和超宽屏；
- E2E Story 使用固定 Story ID、revision、digest 输入和 RNG 种子；
- 覆盖经营流程、营业随机事件、VN 分支、属性条件、Save、Quick Save、Dump、调试栏和周结算；
- 截图基线只针对稳定 fixture，并在测试时关闭非必要动画；
- 截图基线只验证少量稳定布局与视觉契约，不能替代领域、查询、焦点和交互行为测试；
- 稳定 Player/E2E 屏幕运行自动化可访问性扫描，并覆盖 keyboard-only traversal、焦点恢复、触摸模拟、200% zoom reflow 和 reduced-motion；
- 核心流程至少在 Chromium 与 WebKit 执行；首次 Pages 发布前完成一次真实横屏平板与 VoiceOver smoke；
- 正式 Story 至少进行启动、首个行动和素材加载 Smoke。

### 20.3 CI 闸门

仓库提供单一非交互、无外部写操作的入口 `pnpm verify`，在已完成 frozen install 的环境中依次执行格式检查、lint/import boundary/cycle 检查、类型检查、Story/digest/素材许可证与预算校验、Vitest/RTL、fast-check、golden week、两个 flavor 构建、自动化可访问性检查、Player artifact security/base-path Smoke 和 Playwright。它可以生成本地 `dist`/报告，但不发布、不改 tracked baselines。各子命令仍可单独运行，CI 不拼装另一套隐藏流程。

顺序为：

1. 格式与静态规则；
2. import boundary 与类型检查；
3. 单元、契约、内容和模拟测试；
4. 正式 Story 生产构建；
5. E2E Story Playwright；
6. 正式 Story Smoke；
7. 验证 job 上传已经 Smoke 的 Player artifact。

GitHub Pages 部署是独立、受保护且依赖验证成功的 job，不属于 `pnpm verify`，也不在普通本地或 PR 验证中执行。Developer E2E artifact 永不部署；Player artifact 被原样下载和发布。

不以单一全局覆盖率数字替代关键行为测试。Engine Core、规则输出校验、Snapshot、身份比较和迁移边界必须具备显式分支测试。

fast-check 失败必须输出可复现 seed/path；golden 与截图基线只能通过显式更新命令改变，CI 不写回。E2E 增加非法导入、损坏存档恢复和多标签页 revision conflict 的负向路径。

导入测试语料覆盖超大 bytes、深层嵌套、重复成员、超长字符串/集合、非法/原型相关 key、未知字段、错误稳定 ID、digest 篡改和截断 JSON；fast-check 生成的任意输入不得导致 hang、代码执行、部分 Session 替换或旧存档丢失。

## 21. 安全与健壮性

- Story 是仓库内受信任代码，不是安全沙箱中的第三方 Mod；
- 从文件或 IndexedDB 读取的 Save/Debug 数据一律视为不受信任；
- Save JSON 原始输入上限 5 MiB，DebugBundle 上限 20 MiB；解析深度不超过 64，单数组不超过 10,000 项，单对象不超过 10,000 个成员，整棵结构不超过 100,000 个容器/标量节点，单字符串不超过 256 KiB，trace 不超过 200 项；
- 在 JSON 解析前检查 bytes，并使用能拒绝重复成员名和危险 prototype key 的严格路径；SaveRecord 与 DebugBundle 使用彼此独立、拒绝 unknown keys 的 Zod envelope；
- 解析后继续执行 Canonical JSON、Schema、稳定 ID、引用、digest 与不变量校验，失败数据不得写入 IndexedDB 或部分替换 EngineSession；
- Narrative 文本作为文本渲染，首版不接受 Story 注入任意 HTML；
- 不使用 `dangerouslySetInnerHTML` 展示 Story 内容；
- 构建中不含密钥、外部 API token 或本地绝对路径；
- 依赖升级由 lockfile diff、测试和 Story build 验证，不自动跨 major；
- 开发者改值只能通过注册的 DebugCommand，仍经过引擎验证和诊断记录；
- Player Route 不暴露 Story ID/revision/格式错误绕过、任意改值或跳转命令；唯一例外是 Save 已通过格式、ID、revision、Schema、引用、不变量和 stateDigest 检查后，对同 ID/revision 的 Story/Engine digest mismatch 进行明确 `Load anyway` 与 compatibility-tainted 恢复。

## 22. 生产级代码质量标准

- 公共边界使用明确类型、只读输入和结构化结果；
- 文件按职责拆分，不建立巨型 `game-store.ts`、`definitions.ts` 或 `App.tsx`；
- 所有领域修改都有命令、领域事件和 reason code；
- 所有 Story Rule 有契约测试；
- 所有可保存状态都有 Schema、round-trip 和不变量测试；
- 架构依赖通过工具检查，不依赖代码评审记忆；
- 无未处理 Promise rejection、无静默保存失败、无模拟层 console side effect；
- 玩家路径在平板最低分辨率、触摸输入和 reduced-motion 下可完成；
- CI 绿色才允许发布；
- 玩法数值失败优先修改 Story Balance 或删除规则，不通过破坏 Harness 边界应急。

首次 Pages 发布前补齐短小运行手册：本地 bootstrap/verify、Story authoring 与校验失败、存档恢复/导出/删除、Pages 发布与回滚、依赖升级、平板与 VoiceOver smoke、诊断包隐私。发布记录保存待部署 artifact manifest、Story/Engine digest、浏览器 smoke 结果和回滚目标。旧构建面对更高 IndexedDB databaseRevision 时必须只读退出，不能为回滚而破坏新数据。

## 23. 第一轮交付验收

### 23.1 Harness 验收

- `tavern-poc` 与 `e2e` 可以独立静态构建；
- Story 规则接口、内容 IR、身份与 digest 全部生效；
- Engine、Runtime、UI、Persistence、Diagnostics 的 import 边界通过 CI；
- 中央舞台、Overlay、VN 和可切换开发栏完成；
- 首批 Image Gen 视觉包按来源记录、Asset ID、尺寸和安全区合同接入，UI 基准图不进入运行时 bundle；
- Opening Event 工作流由 E2E Story 至少覆盖一个可复现的随机营业事件；七日正式 Story 暂不增加新 RNG 消费；
- Auto、Quick、Manual Save 与 JSON 导入导出完成；
- State Dump 可以还原匹配构建的现场并重放有界命令轨迹；
- GitHub Pages 可从新局开始游玩且刷新后继续；
- E2E Story 在固定输入下稳定通过。

### 23.2 七日 Story 验收

继续采用 `docs/poc/` 已定义的七日范围：生活方针、采购、备菜、四种营业方式、一个设施二选一、关系/调查互斥、属性门槛、2D6、Aura、税负和三维结局。

试玩前不主动增加新玩法。完成后依据实际反馈调整：

- AP 与体力是否重复；
- 经营步骤是否疲劳；
- 预测与账本是否可理解；
- 经营、关系和调查是否形成真实取舍；
- 自动化是否减少重复而不消灭决策。

### 23.3 允许延后

- 存档跨 revision 迁移；
- 多 Story 运行时切换；
- 可视化内容编辑器；
- 音频、语音和完整资产流；
- 独立探索引擎；
- 正式长期设施树、员工等级与多周目；
- Unity 和 3D 管线。

## 24. 实施停止线

出现以下情况时停止编码并回到设计讨论：

- 新系统需要绕过命令管线直接改 GameState；
- Story 需要导入 Runtime/UI 或使用未注册 callback；
- Engine 必须知道具体 Story ID 才能工作；
- Event、Narrative、Quest、Fact 或 Aura 的所有权无法判定；
- 存档无法说明哪部分是权威状态、哪部分是诊断信息；
- digest 不能在相同输入下稳定复现；
- E2E 只能依赖正式剧情的易变文本或数值；
- UI 必须依赖开发侧栏才能完成玩家操作；
- 为通过七日玩法而破坏生产级模块边界；
- 规格仍存在会导致两种合理实现的关键歧义。

## 25. 书面评审问题

本规格落盘后的评审只检查：

1. Engine、Story、Runtime、UI、Persistence 和 Diagnostics 是否真正正交；
2. 强类型 Story 规则接口是否既可替换算法又不会变成任意插件系统；
3. Snapshot、SaveRecord 和 DebugBundle 是否能准确恢复与复现；
4. Story/Engine provenance 是否足以定位精确构建；
5. 第一轮是否把生产级 Harness 和可变的七日玩法正确分开；
6. 是否仍有会阻塞实施的缺失契约。
7. Image Gen 视觉包是否和代码化 UI、许可边界及玩法验证范围正确分开。
