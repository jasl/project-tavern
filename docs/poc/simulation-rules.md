# 七日 PoC 模拟规则与结算顺序

> 本文负责七日 Story 的玩法语义、结算顺序和固定验收向量。`GameState` 分区、Story 强类型规则接口、Snapshot/DebugBundle、IndexedDB 和 digest 等技术合同以 `docs/superpowers/specs/2026-07-10-react-game-harness-design.md` 为准；本文保留的旧 envelope 与全局 definitions 文字不再覆盖 Harness 规格。

状态：v0，待实现验证
原则：所有规则必须确定、可保存、可解释、可测试

## 1. 状态所有权

EngineSession 拥有唯一的 `GameSnapshot`。UI 不直接修改状态，只提交命令并渲染结果。

概念模型：

```text
GameSnapshot
├── state
│   ├── simulation
│   │   ├── run          runId、runStatus
│   │   ├── clock        当前日、时段、生活方针、剩余 AP
│   │   ├── actors       玩家与女主的体力、心情、属性和关系量
│   │   ├── tavern       现金、人气、库存批次、设施、伙计、今日计划与营业工作流
│   │   └── status       PoC 允许的少数 Aura 实例
│   └── story            Fact、Outcome、Quest 与 Narrative runtime
├── rng                  算法 ID 与可序列化 cursor
└── commandSequence
```

静态的原料、菜谱、需求、设施、事件、文本与素材引用属于 `StoryPackage` 的强类型 content/balance/manifest，不写入每份 Snapshot；Snapshot 只记录稳定 ID。Story/Engine 身份位于 SaveRecord/DebugBundle provenance，不复制进 `GameState`。

最近命令、领域事件、facts、UI 状态和异常属于 Diagnostics，不进入 GameSnapshot；只有具有游戏语义的按日/按周营业账本留在 simulation 中。

`runStatus` 只允许 `setup | active | completed_stable | completed_danger | failed_arrears`。`StartRun` 创建 `setup`，选择生活方针后进入 `active`；只有 `PayLevy` 可以写入三个 terminal 值。

## 2. 时间模型

### 2.1 日与时段

- `day`：1–7，分别为周一至周日；
- `phase`：`morning | afternoon | evening`；
- 周一至周六可以营业；
- 周日没有营业，上午展示预测总结，下午执行 `PayLevy` 并直接结束本轮；不存在可行动的周日晚上。

PoC 不记录小时、分钟、月份、季节或真实日期。未来若需要完整日历，也不能改变“唯一时间推进入口”的原则。

### 2.2 生活方针与行动点

每个时段开始时重置 AP，不能跨时段结转：

| 方针 | 上午 | 下午 | 晚上 | 夜间玩家恢复 |
|---|---:|---:|---:|---:|
| 均衡生活 | 2 | 2 | 2 | +3 |
| 夜猫子 | 1 | 2 | 3 | +2 |

夜猫子不增加每日 AP 总量，只把一个上午 AP 移到晚上，并牺牲 1 点自然恢复。女主不受玩家生活方针影响，基础夜间恢复始终为 +3。

### 2.3 时间推进

只有 `AdvancePhase` 可以改变时段。它先在临时状态上计算全部边界效果；任何一步失败则整次推进失败，旧状态不变。新局必须先完成 `ChooseLifePolicy`，才允许第一次进入周一上午。

边界顺序：

1. 验证当前阻塞事件已经处理，或显式声明将延续到紧邻的下一时段；
2. 标记本时段到期机会；
3. 清除按时段到期的 Aura；
4. 进入下一时段并重置 AP；
5. 计算新时段可用事件；
6. 生成 `phase.advanced` fact；
7. 在完整事务提交后自动保存。

周六晚上进入周日时，还要先完成营业和日终结算。周日缴税后直接进入 `run.complete` 或 `run.failed`，不再触发普通行动。

晚上先完成营业工作流，再执行独立的 `AdvancePhase`。七日 Story 把玩法 shorthand `ResolveService` 展开为 `StartOpening` 与 `FinalizeOpening`；只有 Finalize 设置 `eveningResolved=true`，两者都不改变时段。`AdvancePhase` 要求营业工作流已结束且该标记存在，再完成腐败、日终状态、恢复和次日推进。这样时段永远只有一个所有者。

## 3. 行动与资源守卫

所有成本在命令确认前显示。体力和 AP 不允许支付后为负；现金购买命令也不允许透支。

| 行动 | 可用时段 | AP | 玩家体力 | 其他限制 |
|---|---|---:|---:|---|
| 采购任意组合原料 | 上午/下午 | 1 | -1 | 市场开放；现金足够 |
| 备菜 | 上午/下午 | 1 | -1 | 当日最多 2 次 |
| 休息 | 任意非阻塞时段 | 1 | +3 | 不超过上限 |
| 处理供应商账单 | 周二上午、其他行动前 | 0 | 0 | 必须提交一个事件选项；`[智力 B]` 分支不掷骰 |
| 建造设施 | 周四上午或下午 | 2 | -1 | 现金足够；只建一个 |
| 一起修理招牌 | 周五下午 | 2 | -1 | 女主体力 -1；放弃/冲突分支为 0 AP；与冒险互斥 |
| 选择冒险准备 | 周五上午、出发前 | 0 | 0 | 可选准备包 +4；只记录选择，出发时与基础物资费一起扣款 |
| 文字冒险 | 周五上午+下午 | 3 | -3 | 上午开始1、下午完成2；出发时现金 -4 或 -8；与关系互斥 |
| 道歉 | 周六上午/下午 | 1 | 0 | 仅在女主生气时可用 |

采购一次可以选择任意非负整数数量，避免为了买不同原料重复点击。常用采购与菜单计划可以在 UI 中复制昨日设置，但复制不会跳过守卫或自动确认。

`SetServicePlan`、`ChoosePlannedClosure` 和关系事件的放弃/冲突分支是 0 AP 的承诺命令；它们仍必须在各自窗口内提交，不能在进入晚上后补填。

## 4. 玩家与女主

### 4.1 玩家

- 初始与最大体力见数值文档；
- PoC 固定体格 C、社交 C、智力 B；
- 不实现属性经验、升级或技能；
- 段位加值沿用长期设计：C=0、B=1、A=2、S=3、S+=4。

固定智力 B 只用于验证门槛选项与检定加值能否被清楚表达，不表示正式主角默认属性。

### 4.2 女主

- 关系阶段固定为 `cold`，本周不发生阶段转移；
- 好感与默契独立；
- 心情范围 -2…+2，初始 0；
- 体力不足以支付营业成本时，对应营业方式不可选；
- 不主动发展关系可以完成整轮，不产生被动好感惩罚。

## 5. 库存与腐败

库存按批次保存：

```text
InventoryBatch {
  ingredientId
  quantity
  acquiredDay
  lastUsableDay
  source
}
```

使用规则：

1. 同一原料按 `lastUsableDay`、`acquiredDay`、批次 ID 的稳定顺序 FIFO 消耗；
2. 采购时立即扣现金并建立批次；
3. 营业确认时按计划份数一次性消耗原料并生成成品；
4. 未售成品在当晚报废，不退回原料；
5. 营业后再处理原料腐败；
6. 营业结束后，`currentDay >= lastUsableDay` 的剩余数量腐败；
7. 每次消耗、报废与腐败都进入账本。

保鲜期 `N` 表示购买日起总共可用 N 个日历日。具体换算为 `lastUsableDay = acquiredDay + N - 1`。例如 D1 购买、保鲜期 2 的鲜肉可用于 D1 与 D2 营业，并在 D2 营业结束后腐败，D3 不再可用。

建造冷藏设施时，所有受影响的现有批次与后续新批次的 `lastUsableDay` 增加 2；同一批次只能扩展一次。

## 6. 每日经营计划

下午结束前必须选择：

- 最多两道菜；
- 每道菜计划份数；
- 营业方式或计划停业。

计划可以反复修改，直到进入晚上。进入晚上后计划被冻结；若没有合法计划且没有声明停业，触发紧急停业并降低 1 点人气。

### 6.1 四种营业方式

精确数值见 `balance-v0.md`。规则差异为：

- `manual`：需要 2 晚间 AP，容量最高，无工资，默契最高；均衡生活用尽晚上 AP，夜猫子仍可在营业前使用多出的 1 AP；
- `assisted`：占用一个晚上 AP，容量较低，支付工资，获得少量默契；
- `delegated`：不占玩家晚上 AP，容量最低，工资最高，不增加默契；
- `closed`：无收入、工资与杂费；在下午结束、进入晚上前提交则不降低人气。

完全委托仍可受玩家白天备菜帮助，但提升幅度低于亲自/部分营业，避免“白天完全手动、晚上名义委托”得到全部优势。

### 6.2 订单生成

对每个客群分别计算：

1. 取得当日实际客流；
2. 读取所提供菜品对该客群的偏好 0–3；
3. 找到菜单中的最高偏好 `p`；
4. 有效订单人数为 `round(客流 × p / 3)`；
5. 按两道菜的偏好权重分配订单；
6. 小数余数使用最大余数法，若仍相同则按稳定菜谱 ID 排序。

没有提供菜品时有效订单为 0。这个模型刻意简单，但结算必须依次显示“潜在客流 → 菜单吸引后的订单 → 容量限制 → 实际销量”。

### 6.3 容量与备菜点

营业必须同时满足接待容量和备菜点：

```text
计划总份数 <= 接待上限
Σ(计划份数 × 菜品备菜点) <= 可用备菜点
```

合法计划不保证全部售出。实际销量：

```text
actualSales[recipe] = min(plannedPortions[recipe], allocatedOrders[recipe])
```

若总订单超过接待上限，先按客群订单比例分配容量；余数依稳定客群 ID 和菜谱 ID 处理，保证同输入同结果。

### 6.4 现金账本

采购成本在采购命令发生时扣除。营业现金变化：

```text
收入 = Σ(实际销量 × 售价)
营业现金变化 = 收入 - 工资 - 营业杂费
```

结算页另行显示本日采购成本、未售成品成本和腐败原料成本，使玩家能看到净变化而不是只有当晚收入。

### 6.5 人气、默契和心情

覆盖率：

```text
coverage = 实际销量 / 当晚全部潜在客流
```

- 覆盖率 ≥80%：人气 +1；
- 50%–79%：人气不变；
- <50%：人气 -1；
- 正常计划停业：人气不变；
- 紧急停业：人气 -1。

只有覆盖率至少 50% 才获得营业方式对应的默契。`heroine.angry` 存在时，亲自/部分营业接待上限 -1，且本次不增加默契。

女主体力在支付营业成本后低于 2 时，心情 -1；关系事件成功时心情 +1。PoC 不让低心情被动扣长期好感。

## 7. 晚间营业与日终事务

本文中的 `ResolveService` 是玩法层 shorthand，不是 Engine command。七日 Story revision 1 的 driver 必须把它展开为连续的 `StartOpening` 与 `FinalizeOpening`；该 Story 两者之间没有营业随机事件，E2E Story 才插入 Scheduler/VN 命令验证可暂停工作流。

`StartOpening` 按以下顺序执行一个原子事务：

1. 验证日期、计划、营业方式、AP、双方体力、现金和原料；
2. 扣除营业 AP、双方体力、工资和杂费；
3. 按 FIFO 消耗计划份数所需原料并记录成品数量；
4. 读取已经在 `StartRun` 提交的当晚实际客流；
5. 保存菜单、成品、需求、设施、Aura、参与者能力和开始成本账本为窄 `OpeningBaseline`；
6. 设置 `ActiveWorkflow=OpeningSession`，提交 Snapshot 并排队一次 Auto Save candidate，时段仍为晚上。

任一步失败则整条 `StartOpening` 拒绝，AP、体力、现金、库存、RNG 和 `commandSequence` 都不变。

`FinalizeOpening` 只允许在合法 OpeningSession 中按以下顺序执行另一个原子事务：

1. 从 OpeningBaseline 计算菜单有效订单；
2. 应用接待、备菜、设施、Aura 与已提交营业事件的容量修正；
3. 计算销量、收入、未售成品与缺失订单；
4. 更新现金、人气、默契、心情与事件事实；
5. 消耗“下一次营业”Aura；
6. 把开始成本与最终结果合并成完整 ledger facts；
7. 清除 OpeningSession，设置 `eveningResolved=true`；
8. 提交 Snapshot 并排队一次 Auto Save candidate，时段仍为晚上。

Finalize 的候选结算、Schema 或不变量失败时，本条命令的 1–8 全部不提交；已经由 StartOpening 合法提交的成本和 OpeningSession 保持原样，不能重复扣除，也不存在返还成本的取消路径。`StartOpening` 与 `FinalizeOpening` 各自增加一次 `commandSequence`。

随后 `AdvancePhase` 从晚上推进到次日上午，按以下顺序原子执行：

1. 要求 `eveningResolved=true`；
2. 处理剩余原料腐败；
3. 处理日终 Aura 计时与自然到期；
4. 应用玩家、女主和设施的夜间恢复；
5. 清空今日计划和 daily flags；weekly flags 保留至本轮结束；
6. `day + 1`，设置次日上午与对应 AP；
7. 清除 `eveningResolved`；
8. 生成日终 facts，并更新滚动自动存档。

计划停业也通过同一对 `StartOpening`/`FinalizeOpening` 生成零收入的合法晚间结算，再由同一个 `AdvancePhase` 完成日终。不存在第二条偷偷跨日的路径。

## 8. Aura 与事实

PoC 只允许以下 Aura：

| ID | 可见性 | 目标 | 生命周期 | 效果 |
|---|---|---|---|---|
| `heroine.angry` | 可见 Debuff | 女主 | 2 次日终或道歉解除 | 接待 -1；默契增长为 0 |
| `tavern.sign_repaired` | 可见 Buff | 酒馆 | 下一次营业后消耗 | 亲自/部分接待与备菜点各 +1 |
| `player.adventure_strain` | 可见 Debuff | 玩家 | 下一次夜间恢复后消耗 | 该次自然恢复 -2 |

以下不是 Aura，而是显式事实：

- `story.warClue`；
- `story.relationshipOpportunityResult`；
- `story.adventureResult`；
- `tutorial.firstServiceCompleted`；
- `periodFlags.invoiceCheckedThisWeek`。

`periodFlags` 按生命周期分为 `daily` 与 `weekly`。daily flags 每次日终清除；`invoiceCheckedThisWeek` 属于 weekly flags，只在新一轮 `StartRun` 时初始化，并保留到 D7 总结完成。

不得为了普通事件新增可携带任意参数的万能 Aura。

## 9. 事件与互斥

事件定义使用稳定 ID、明确窗口、优先级、受限条件与受限效果。PoC 不实现动态脚本或通用加权事件池。

同一时刻最多一个阻塞事件。优先级：

1. 强制教学与结算；
2. 明确截止期限；
3. 已选择的关系/故事事件；
4. 非阻塞提示。

周五上午同时展示两条机会与互斥说明。冒险必须在上午执行 `BeginAdventure`，消耗 1 AP，并在同一事务中验证与扣除 3 体力、基础物资费 4 以及已选择准备包时的额外 4；成功后立即占用互斥组。扣款或体力守卫失败时命令整体拒绝，关系机会仍可用。均衡生活多出的上午 1 AP 必须在出发前使用。进入下午后，调查入口关闭，关系事件正式开放。

已经开始冒险时，下午只允许 `CompleteAdventure`：消耗 2 AP，结算检定并清除阻塞状态，不再扣现金或体力。由于出发事务已经支付全部不可恢复成本，合法的 `BeginAdventure` 必定可以在下午完成，不存在资源不足软锁。若没有开始冒险，玩家可以在下午选择一起修理（2 AP）、无惩罚放弃（0 AP）或冲突（0 AP）。提交任一关系结果后记录调查为 `missed_by_choice`。

## 10. 门槛与 2D6

- 确定性门槛：满足段位后直接开放选项；
- 随机检定：`score = 2D6 + attributeBonus + preparationBonus + auraBonus`；
- 结果分为受挫、带代价成功、完整成功、卓越成功；
- 所有骰子来自可序列化 PRNG；
- 事件首次结算时从唯一 PRNG 流取值并立即保存结果；事件前读档恢复相同 PRNG 状态，因此仍得到相同骰点；
- 事件结果写入 `story.adventureResult`，重复进入不能重掷。

## 11. 周日税负

周日没有新的收入来源。`PayLevy`：

1. 读取现金和税额；
2. 若现金不足，记录缺口并结束为 `failed_arrears`；
3. 若足够，扣税；
4. 根据税后现金、人气与设施计算稳定/危险结果；
5. 组合关系与调查结果；
6. 生成周总结与诊断指标；
7. 保存完成状态。

`PayLevy` 不改变 `phase`；最终存档固定为 `day=7`、`phase=afternoon` 与 terminal run status。总结界面是终局投影，不代表另一个晚上时段。

库存不能在周日自动按价值变现，避免隐藏救济破坏账本可读性。

## 12. 存档与确定性

存档只捕获已经提交并通过不变量的完整 `GameSnapshot`。SaveRecord 的 `formatRevision`、Story/Engine provenance、state digest、Slot metadata、Auto/Quick/Manual 行为、导入限制和兼容策略完全遵守 Harness 规格第 15 节，不在七日 Story 另建 envelope。

加载顺序为：严格解析隔离候选 → SaveRecord Schema 与上限 → state digest → Story/Engine 身份 → 稳定引用与当前 Story Schema → Engine invariants → 原子替换 Session。首版不实现跨 Story revision 迁移；revision 不匹配时保留原文件并拒绝运行。相同 ID/revision 的 digest mismatch 只能走明确标记的 compatibility-tainted 恢复流程。

至少保留一个 `SaveRecordV1` fixture，证明 Auto、Quick、Manual、OpeningSession、WorldActionSession 与周结算状态的 round-trip；另保留损坏、未来 formatRevision、revision mismatch、digest mismatch 和 current→previous recovery fixtures。首版 fixture 不虚构尚不存在的 migrator。

## 13. Facts 与原因码

每个成功命令返回不可变 facts，例如：

```text
inventory.purchased
inventory.consumed
inventory.spoiled
food.discarded
service.orders_created
service.capacity_limited
service.sale
cash.changed
reputation.changed
relationship.synergy_changed
aura.applied
aura.expired
event.choice_committed
roll.resolved
levy.paid
run.completed
```

Fact 包含稳定原因码与数值 before/after。UI 文案和测试都消费 facts，不通过重新猜测状态差量来解释结果。`GameSnapshot` 是唯一恢复来源；facts 只负责本次解释并进入最多 200 条的有界 Diagnostic Trace，不用于恢复或再次应用。只有按日/按周汇总、具有游戏语义的营业账本持久化。

## 14. 七日 Story 最小回归矩阵

- AP、体力、现金与时段守卫；
- FIFO 批次、腐败和冷藏设施延长；
- 订单权重、稳定余数与两个客群的稳定排序；
- 接待容量和备菜点两类限制；
- StartOpening/FinalizeOpening 开始成本、最终账本、人气与 Auto Save 边界；
- Aura 应用、下一次营业消费、道歉解除和自然到期；
- 周五关系/调查互斥与 WorldAction 中途存档；
- 周日税负、三维结果与 terminal 状态；
- PRNG golden vectors、同输入重放和事件前后读档不重骰；
- Auto current 损坏时的 previous recovery candidate；
- SaveRecordV1 round-trip 与不支持身份/格式的拒绝路径。

具名矩阵补充而不替代 Harness 的 Story Rule Contract、fast-check、1,000-seed driver、RTL 与 Playwright 测试。
