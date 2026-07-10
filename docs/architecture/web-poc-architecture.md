# Web PoC 架构

状态：历史灰盒架构；技术约束已由 `docs/superpowers/specs/2026-07-10-react-game-harness-design.md` 取代
目标：快速验证数值与交互，同时保留可迁移的规格和测试

> 本文保留最早的一次性 PoC 推理。实现时不得用本文的 npm、localStorage、固定三栏 UI、全局 GameDefinitions 或“内容不得实现 TypeScript 规则”等旧约定覆盖当前 Harness 规格。七日数值与规则仍以 `docs/poc/` 为准。

## 1. 技术路线

采用：

- React；
- TypeScript 严格模式；
- Vite 开发与构建；
- Vitest 进行核心规则和 golden-week 测试；
- 浏览器 DOM UI 与本地存档；
- 普通 CSS 或 CSS Modules，灰盒阶段不引入重型 UI 系统。

不使用 Phaser、Canvas 或 WebGL。这个 PoC 是文字与表格密集的经营界面，没有需要游戏渲染循环解决的问题。正式 Unity 表现层也不是该 Web 项目的目标。

## 2. 边界图

```text
React UI
  │ typed commands
  ▼
Application facade
  │ validates + dispatches
  ▼
Pure simulation core ───────► immutable facts / ledger
  │                              │
  │ stable IDs                   └──► UI, debug panel, tests
  ▼
Read-only content definitions

Browser persistence ◄──── versioned plain GameState ────► JSON diagnostics
```

React、浏览器存储和内容加载都依赖模拟核心的公开接口；模拟核心不反向依赖任何一项。

## 3. 建议目录

```text
src/
├── app/
│   ├── App.tsx
│   └── game-session.ts
├── sim/
│   ├── model/
│   │   ├── game-state.ts
│   │   ├── commands.ts
│   │   └── facts.ts
│   ├── engine/
│   │   ├── execute-command.ts
│   │   ├── advance-phase.ts
│   │   ├── tavern-service.ts
│   │   ├── inventory.ts
│   │   ├── events.ts
│   │   ├── auras.ts
│   │   └── outcomes.ts
│   ├── rng/
│   │   └── xorshift32.ts
│   └── validation/
│       ├── invariants.ts
│       └── content-validation.ts
├── content/
│   └── poc-week/
│       ├── ingredients.ts
│       ├── recipes.ts
│       ├── demand.ts
│       ├── facilities.ts
│       └── events.ts
├── persistence/
│   ├── save-envelope.ts
│   ├── local-save-store.ts
│   ├── migrations/
│   └── diagnostics.ts
├── ui/
│   ├── dashboard/
│   ├── actions/
│   ├── service-plan/
│   ├── event-panel/
│   ├── ledger/
│   ├── week-summary/
│   └── debug/
└── test/
    ├── fixtures/
    ├── strategies/
    └── helpers/
```

目录按职责而不是 MVC 技术层堆叠。这是职责地图，不要求脚手架先创建所有空目录；文件应在第一个需要它的测试任务中出现。若实现时一个文件开始同时拥有规则、React 状态和文案，应立即拆回边界。

## 4. 模拟 API

核心入口概念签名：

```ts
type CommandResult =
  | { ok: true; state: GameState; facts: readonly GameFact[] }
  | { ok: false; state: GameState; reasons: readonly RejectionReason[] };

function executeCommand(
  state: DeepReadonly<GameState>,
  command: GameCommand,
  definitions: DeepReadonly<GameDefinitions>,
): CommandResult;
```

约束：

- 命令是可序列化的 discriminated union；
- 成功返回新状态，不修改传入对象；
- 拒绝返回原状态引用或结构等价状态；
- 每项变化生成 fact；
- 核心规则不读当前时间、localStorage、DOM 或环境随机数；
- 单个命令执行期间不发布可观察的中间状态。

`Readonly<T>` 只能保护顶层，因此公开接口使用项目定义的深只读类型。规则测试会 deep-freeze 输入，并断言成功命令不修改输入快照、失败命令返回原状态引用且不生成 facts。

React 会话层可以把新状态放入 `useReducer` 或一个很薄的外部 store，但 store 只保存会话结果，不拥有业务规则。

## 5. 命令集合

首轮只需要：

```text
StartRun
ChooseLifePolicy
BuyIngredients
PrepareFood
Rest
ChooseFacility
SetServicePlan
ChoosePlannedClosure
ResolveService
ChooseEventOption
ChooseAdventurePreparation
BeginAdventure
CompleteAdventure
Apologize
AdvancePhase
PayLevy
```

存档与导出是 application/persistence 操作，不伪装成会改变游戏世界的模拟命令。

`StartRun` 创建尚未进入 D1 的 setup 状态；`ChooseLifePolicy` 是唯一允许的下一条进度命令。选择完成后才进入周一上午，且本轮不能更改方针。

`ChooseAdventurePreparation` 只记录是否携带准备包，不立即扣款；紧随其后的 `BeginAdventure` 原子验证并扣除基础费、可选准备费和全部体力成本。`CompleteAdventure` 只支付下午 AP 并结算结果，不能因现金或体力不足形成中途软锁。

## 6. 内容模型

`GameDefinitions` 在启动后冻结，至少包括：

- `IngredientDefinition`；
- `RecipeDefinition`；
- `CustomerSegmentDefinition`；
- `FacilityDefinition`；
- `EventDefinition`；
- `AuraDefinition`；
- `WeekScenarioDefinition`。

事件条件和效果只允许有限联合类型，例如：

```text
Condition:
  day_is | phase_is | has_cash | rank_at_least | aura_present |
  story_fact_is | opportunity_is_available

Effect:
  change_cash | change_affection | change_mood | grant_inventory |
  apply_aura | clear_aura | set_story_fact | consume_opportunity
```

PoC 不提供 `and/or` 任意嵌套表达式树。一个事件需要复杂条件时，先把复杂性收束为明确的路线或机会状态。内容不得执行函数名、JavaScript 字符串或 `eval`。

内容可以暂时放在 `.ts` 文件中获得类型检查，但这些文件只能导出 JSON-shaped literal：不允许函数、getter、class、构造器或模块初始化副作用。定义使用 `satisfies` 做编译期检查，并在启动时再次做运行时 schema 校验。这里的 `.ts` 是静态数据载体，不是“内容作者可以执行 TypeScript”。

启动时的 `validate-content` 检查：

- ID 唯一且符合命名空间；
- 所有引用存在；
- 配方数量为正整数；
- 价格、成本、时长在允许范围；
- 事件窗口与互斥组有效；
- 条件和效果类型被代码支持；
- Aura 目标和生命周期匹配定义；
- 同优先级事件具有稳定决胜顺序。

## 7. 确定性随机

PoC 冻结为 xorshift32，不再把算法留给实现者选择。状态是非零 unsigned 32-bit 整数，`nextU32()` 精确定义为：

```text
x = state
x = uint32(x XOR uint32(x << 13))
x = uint32(x XOR (x >>> 17))
x = uint32(x XOR uint32(x << 5))
state = x
return x
```

`nextInt(n)` 使用拒绝采样：`limit = floor(2^32 / n) * n`，反复取得 `nextU32()` 直到 `value < limit`，返回 `value % n`。不得用浮点缩放或直接带偏差取模替换。

实现还必须：

- 拒绝全零状态；
- 规定无符号 32 位溢出语义；
- 保存算法 ID 和内部状态；
- 提供固定输入/输出向量；
- PoC 只维护一个 PRNG 流，不预建子流派生协议；
- 只有模拟命令和时段推进可以消费随机数；
- 每日需求与事件骰点在首次决定时立即写入 `GameState`，后续查询只读已提交结果；
- UI 渲染、条件预览、存档迁移和调试面板不得消费随机数；
- 模拟代码禁止 `Math.random()`。

新局固定抽取顺序：

1. `StartRun` 依 D1 本地、D1 旅客、D2 本地……D6 旅客的顺序调用 12 次 `nextInt(3) - 1`，把全部客流偏移写入状态；
2. 若进行 D5 冒险，`CompleteAdventure` 接着调用两次 `nextInt(6) + 1`；
3. PoC 没有其他正式随机调用。

reference seed `0x00023049` 的前 12 个客流偏移均为 0，随后两枚骰子为 4 与 3，14 次抽取后的状态为 `0x4e7b7f2e`。这些是 TypeScript 与未来 C# 都必须通过的 golden vectors。

若后续认为 PRNG 质量不足，可以更换算法，但必须通过 schema 版本和算法 ID 保留旧存档确定性。

## 8. 存档

保存信封：

```text
SaveEnvelope
├── schemaVersion
├── gameVersion
├── contentRevision
├── savedAt (仅 metadata，不参与模拟)
└── state
```

浏览器提供：

- 一个滚动自动存档；
- 一个手动槽；
- 导出/导入 JSON；
- 清除存档；
- 诊断包导出。

PoC 加载结果使用类型化错误，至少区分：不存在、JSON/结构损坏、schema 版本过新、内容 revision 不兼容、迁移失败和浏览器存储错误。`contentRevision` 不相等时默认拒绝加载；只有显式内容迁移成功后才能更新 revision。

localStorage 写入协议：

1. 序列化 candidate，并在内存中解析与校验；
2. 写入临时 `candidate` key，再读回校验；
3. 若存在合法 `current`，复制为 `previous`；
4. 把 candidate 写为新的 `current`；
5. 删除临时 key；
6. 任一步失败都报告错误，并尽量保持旧 `current` 可读。

读取时先校验 `current`，失败后才尝试 `previous`。PoC 不支持多标签页同时游玩；检测到同一存档 key 的外部 `storage` 事件时暂停自动保存并提示刷新或关闭另一标签页。

存档迁移是一串纯函数：`v1 -> v2 -> ... -> current`。迁移不得调用 React、内容事件或正常游戏命令。

## 9. 调试与诊断

开发者面板至少提供：

- 跳到指定日/时段；
- 调整现金、体力、人气和库存；
- 应用/清除三种允许的 Aura；
- 强制打开事件和指定检定结果；
- 查看当前可用事件及每条条件通过/失败原因；
- 查看 PRNG 状态；
- 查看最近命令、facts 和状态差量；
- 导出存档、内容 revision、日志和构建版本。

调试命令只能通过同一命令入口或专门的测试构造器生成合法状态，不允许 React 组件随意改对象字段。发行构建可以隐藏入口，但不需要删除调试代码。

`GameState` 快照是唯一恢复来源，facts 不用于重放恢复。UI 只消费本次命令返回的 facts；诊断区最多保留最近 200 条。只有具有游戏语义的汇总营业账本进入周目状态，调试状态差量不进入存档。这样保留可解释性而不形成半套事件溯源。

## 10. 测试分层

### 10.1 纯规则测试

- AP/体力/现金守卫；
- FIFO 库存与设施延长；
- 订单分配与稳定余数；
- 两种容量限制；
- 营业账本与人气；
- Aura 应用、消费、道歉和到期；
- 周五互斥；
- 周日结果。

### 10.2 确定性与存档

- PRNG golden vectors；
- 同状态同命令深度相等；
- 事件前后读档不重骰；
- round-trip；
- 当前/上一份存档回退；
- 版本过新拒绝；
- v1 fixture 迁移。

### 10.3 整周策略

`docs/poc/reference-strategies.md` 定义确定性 strategy drivers。driver 只能发出公开模拟命令；第一次执行后把完整命令 JSON 固化为经人工评审的 fixture。测试断言最终状态、账本不变量和结果区间，不能在运行中临时寻找更优动作。

### 10.4 薄 UI/E2E

只覆盖新游戏、第一天营业、保存刷新、继续、周五互斥和周日结算。不用大量截图测试替代核心规则单元测试。

## 11. 脚本合同

脚手架完成后应提供互不修改文件的命令：

```text
npm run lint
npm run typecheck
npm test
npm run validate-content
npm run build
```

格式化使用独立命令。`lint` 与测试在 CI/验收中不得自动修文件。

## 12. 向 Unity/C# 迁移

未来迁移的是：

- 稳定 ID 与内容字段；
- 命令、状态和 fact 的语义；
- 结算顺序；
- PRNG 测试向量；
- 存档 fixture；
- golden-week 命令和期望结果；
- 试玩结论。

不迁移 React 组件、浏览器存储实现、CSS 或 TypeScript 对象结构本身。Unity 中仍保持纯 C# 模拟核心不依赖 MonoBehaviour、场景和插件类型。

## 13. 明确拒绝的架构

PoC 不采用：

- 事件溯源、CQRS、ECS；
- 通用依赖注入容器；
- 可递归触发的全局消息总线；
- 通用脚本语言或表达式求值器；
- 以 Aura 代替领域字段；
- 以 React state 或组件实例作为存档；
- 后端 API、数据库、账号和在线同步。

这些技术不是永远错误，而是当前问题不需要它们。
