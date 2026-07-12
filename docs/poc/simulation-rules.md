# 七日 PoC 模拟规则与结算顺序

> 本文负责七日 Story 的玩法语义、结算顺序和固定验收向量。Phase 2+ 术语、运行时所有权和命令边界以 `docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md` 为准，未被修订的通用原则继续来自 `docs/superpowers/specs/2026-07-10-react-game-harness-design.md`；`GameState`、Story 状态、GameplayFact、Snapshot/DebugBundle 等字段级 ABI 以 `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md` 为准。本文的玩法描述不得重新定义 envelope 或全局合同。

状态：v0，待实现验证
原则：所有规则必须确定、可保存、可解释、可测试

## 1. 状态所有权

GameSession 拥有唯一的 `GameSnapshot`。UI 不直接修改状态，只提交命令并渲染结果。

概念模型：

```text
GameSnapshot
├── state
│   ├── simulation
│   │   ├── run          runId、initialSeed、run.status、completion
│   │   ├── calendar     当前日、时段、生活方针、剩余 AP、晚间是否已结算
│   │   ├── actors       玩家与女主的体力、心情、属性和关系量
│   │   ├── inventory    起始/当前现金、原料批次、道具堆叠与权威账本行
│   │   ├── status       PoC 允许的少数 Aura 实例
│   │   ├── facilities   已建设施与一次性机会决策
│   │   ├── tavern       人气、菜谱、伙计、备菜、需求 seeds、当日冻结需求、今日计划与营业历史
│   │   └── activeWorkflow 营业或文字冒险的可存档中途状态
│   └── story            Fact、Outcome、Quest、resolvedChecks 与 Narrative runtime
├── rng                  算法 ID 与可序列化 cursor
└── commandSequence
```

静态的原料、菜谱、基础需求、设施、事件、文本与素材引用属于 PoC Story 的强类型 data facet；Story 还负责选择这些 GameplayModules、素材包和 Scene。Snapshot 记录稳定 ID、`StartRun` 抽出的每日/客群 base+random-offset seeds，以及当前营业日早晨物化后整日冻结的 `currentDemand`。Story/Engine/ResolvedGame 身份位于 SaveRecord/DebugBundle provenance，不复制进 `GameState`。

CommandLog、每次 dispatch 返回的非权威 `GameplayFactV1`、UI 状态和异常属于 Diagnostics，不进入 `GameSnapshot`。持久 `Story Fact`、Outcome、Quest 和 Narrative runtime 位于 `state.story`；所有现金与估值原因的权威 `LedgerEntryV1` 位于 `state.simulation.inventory.ledger`，营业历史只引用这些账本行。

`run.status` 只允许 `setup | active | completed_stable | completed_danger | failed_arrears`。`createInitialSnapshot` 先创建 sequence 0、Narrative idle、空 demand seeds 且 `currentDemand=null`、status 已为 `setup` 的 replay base；第一条 `StartRun` 为 D1–D6 两客群生成并持久化 base+random-offset seeds，用初始人气/Fact/Modifier 物化并冻结 D1 `currentDemand`，发出 `demand.materialized`，再启动 manifest 开局文字卡，仍保持 `setup`。玩家走完该 Scene 后选择生活方针才进入 `active`；只有 `PayLevy` 可以写入三个 terminal 值。

## 2. 时间模型

### 2.1 日与时段

- `day`：1–7，分别为周一至周日；
- `phase`：`morning | afternoon | evening`；
- 周一至周六可以营业；
- 周日没有营业，上午展示预测总结，下午执行 `PayLevy` 并直接结束本轮；不存在可行动的周日晚上。

PoC 不记录小时、分钟、月份、季节或真实日期。v1 ABI 只有 `morning | afternoon | evening`；“凌晨”是未来扩展，不通过额外 AP、生活方针或 Aura 在 v1 中模拟。若以后加入，必须先完整设计 CalendarPhase、转移规则、存档兼容、UI 与测试向量，也不能改变“唯一时间推进入口”的原则。

### 2.2 生活方针与行动点

每个时段开始时重置 AP，不能跨时段结转：

| 方针     | 上午 | 下午 | 晚上 | 夜间玩家恢复 |
| -------- | ---: | ---: | ---: | -----------: |
| 均衡生活 |    2 |    2 |    2 |           +3 |
| 夜猫子   |    1 |    2 |    3 |           +2 |

夜猫子不增加每日 AP 总量，只把一个上午 AP 移到晚上，并牺牲 1 点自然恢复。女主不受玩家生活方针影响，基础夜间恢复始终为 +3。

### 2.3 时间推进

只有 `AdvancePhase` 可以改变时段。它先在临时状态上计算全部边界效果；任何一步失败则整次推进失败，旧状态不变。新局已经位于周一上午；`run.start` 与开局 Scene 完成后必须先 `ChooseLifePolicy`，才允许提交普通 D1 行动或第一次推进时段，不存在 day 0 转移。

边界顺序：

1. 验证当前阻塞事件已经处理，或显式声明将延续到紧邻的下一时段；
2. 标记本时段到期机会；
3. 清除按时段到期的 Aura；
4. 进入下一时段并重置 AP，在该 mutation 点先追加 `calendar.phase_advanced`；若跨入新营业日早晨，再从持久 seed 与此刻人气/Fact/Modifier 物化并冻结 `currentDemand`，紧随其后追加一个同值的 `demand.materialized` GameplayFact；进入非营业日则清为 null 且不追加该 Fact；
5. 按 Catalog 的外层全序计算 `day.ended`、`week.ended`、`phase.entered` 等 Scheduler contexts，并在直接 handler 的事件之后追加各 context 的 trigger/effect 事件；
6. 保持全部 GameplayFact 的 mutation/因果顺序，不按 kind 或 ID 重排；
7. Engine 只提交通过 Schema 与不变量的 Snapshot 和 GameplayFact；Application Runtime 收到成功且 Snapshot 已改变的 dispatch 结果后，再排队 Auto Save candidate。

周六晚上进入周日时，还要先完成营业和日终结算。周日缴税后直接写入对应 terminal `RunStatus`、生成 `run.completed` GameplayFact，不再触发普通行动。

晚上通常先完成营业工作流，再执行独立的 `AdvancePhase`。七日 Story 把非 `closed` 服务的玩法 shorthand `ResolveService` 展开为 `StartOpening` 与 `FinalizeOpening`，由 Finalize 设置 `eveningResolved=true`；主动或入夜时无计划产生的紧急 `closed` 则直接设置该标记，不建立 OpeningSession。`StartOpening`/`FinalizeOpening` 都不改变时段。若 non-closed 计划因原料、现金或体力不足始终未能 Start，且当前没有 active workflow，玩家仍可在晚上执行 `AdvancePhase` 接受紧急收店：同一事务改为 closed、扣人气并写 closure history 后继续日终；若 OpeningSession 已建立则必须 Finalize，不能用推进逃过已提交成本。这样既不锁档，时段也始终只有一个所有者。

## 3. 行动与资源守卫

所有成本在命令确认前显示。体力和 AP 不允许支付后为负；现金购买命令也不允许透支。

| 行动             | 可用时段             |  AP | 玩家体力 | 其他限制                                                                                                                   |
| ---------------- | -------------------- | --: | -------: | -------------------------------------------------------------------------------------------------------------------------- |
| 采购任意组合原料 | 上午/下午            |   1 |       -1 | 市场开放；现金足够                                                                                                         |
| 备菜             | 上午/下午            |   1 |       -1 | 当日最多 2 次                                                                                                              |
| 休息             | 任意非阻塞时段       |   1 |       +3 | 不超过上限                                                                                                                 |
| 处理供应商账单   | 周二上午、其他行动前 |   0 |        0 | Scheduler Event `event.supplier_invoice`；必须提交一个 Narrative choice；`[智力 B]` 分支不掷骰                             |
| 设施窗口         | 周四上午或下午       |   2 |       -1 | Facility opportunity `action.facility_window`；现金足够；只建一个；skip 为 0 成本                                          |
| 修理招牌         | 周五下午             |   2 |       -1 | StoryAction `action.repair_sign_with_heroine`；女主体力 -1；放弃/冲突分支为 0 AP；与调查互斥                               |
| 文字冒险         | 周五上午+下午        |   3 |       -3 | WorldAction `action.old_trade_road`；上午开始1、下午完成2；option 在 Begin payload 中选择，出发时现金 -4 或 -8；与关系互斥 |
| 道歉             | 周六上午/下午        |   1 |        0 | StoryAction `action.apologize_to_heroine`；仅在女主生气时可用                                                              |

采购 UI 可以为每种原料选择非负整数，但提交命令时必须省略数量 0 的行；included lines 全为正、ID 唯一，
全部为 0 时不发空命令。这样仍能一次购买多种原料，也与 reference driver 的零短缺规则一致。常用采购与菜单计划可以在 UI 中复制昨日设置，但复制不会跳过守卫或自动确认。

所有营业承诺统一提交 `tavern.plan.set { plan }`，不存在独立 `ChoosePlannedClosure` command；非停业 payload 携带所选 mode/menu，计划停业 payload 固定为 `{ mode:"closed", menu:[] }`。该命令与关系场景的放弃/冲突 `narrative.choose` 都是 0 AP 承诺，但仍必须在各自窗口内提交，不能在进入晚上后补填。

mode/day gate、菜单数量/重复/菜谱引用、容量和备菜结构非法时，`tavern.plan.set` 立即拒绝；结构合法但当前
现金、双方体力或原料尚不足的计划可以作为白天草案保存，计划 Overlay 必须显示精确缺口。玩家可以在入夜前
补资源或改计划；若最终仍未成功 StartOpening，按上节紧急收店，不能把“可保存草案”误解成保证营业。

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
7. 原料消耗是“批次库存 → 本次 OpeningBaseline 成品”的内部数量转移，写入 `inventory.consumed` 与 batch slices，但不重复改变总估值；Finalize 时，售出成品由 revenue entries、未售成品由 discarded-food entries 各扣除对应原料估值。采购、冒险奖励、报废与腐败都写入权威账本，因而一份原料价值只增加和移除一次。

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
4. 读取该营业日早晨已经用持久 seed、日初人气、日初 Fact 与受控 Modifier 物化并冻结的 `currentDemand`；同日后续变化不回写它；
5. 保存菜单、成品、同一份 materialized demand、设施、Aura、参与者能力和开始成本账本行 ID 为窄 `OpeningBaseline`；
6. 由 Workflow owner 设置 `ActiveWorkflow=OpeningSession` 并提交 Snapshot 与 GameplayFact，时段仍为晚上；Application Runtime 在 dispatch 成功后再排队 Auto Save candidate。

任一步失败则整条 `StartOpening` 拒绝，AP、体力、现金、库存、RNG 和 `commandSequence` 都不变。

`FinalizeOpening` 只允许在合法 OpeningSession 中按以下顺序执行另一个原子事务：

1. 从 OpeningBaseline 计算菜单有效订单；
2. 应用接待、备菜、设施、Aura 与已提交营业事件的容量修正；
3. 计算销量、收入、未售成品与缺失订单；
4. 更新现金、人气、默契、心情，并在需要时设置已声明的 Story Fact/Outcome；
5. 只对本次成功营业中实际适用并被纳入修正的 `opening` countdown Aura 扣除次数；不适用的营业方式不消费，拒绝或故障回滚也不消费；
6. 将开始成本与最终结果归并为完整的 `LedgerEntryV1` 引用与 `OpeningLedgerV1`；
7. 清除 OpeningSession，设置 `eveningResolved=true`；
8. 提交 Snapshot 与 GameplayFact，时段仍为晚上；Application Runtime 在 dispatch 成功后再排队 Auto Save candidate。

Finalize 的候选结算、Schema 或不变量失败时，本条命令的 1–8 全部不提交；已经由 StartOpening 合法提交的成本和 OpeningSession 保持原样，不能重复扣除，也不存在返还成本的取消路径。`StartOpening` 与 `FinalizeOpening` 各自增加一次 `commandSequence`。

随后 `AdvancePhase` 从晚上推进到次日上午，按以下顺序原子执行：

1. 若 `eveningResolved=false` 且没有 active OpeningSession，将未开始的 non-closed plan 原子转为带惩罚的紧急 closed 并设为 true；若 OpeningSession active 则拒绝推进；
2. 处理剩余原料腐败；
3. 在旧时段直接边界效果之后处理 `phase_end` Aura 计时与自然到期；
4. 处理 `day_end` Aura 计时与自然到期；`night_recovery` Aura 此时仍保持 active；
5. 收集玩家、女主、设施与仍 active 的 `night_recovery` Aura，按 components 一次结算恢复，再扣该 unit 次数并在归零时自然到期；
6. 清空今日营业计划；持久 Story Fact/Outcome 不因日终自动清理；
7. `day + 1`，设置次日上午、对应 AP，并将 `DailyPreparationStateV1` 重置为次日 0 次；
8. 若新日是营业日，用新日 seed 与此刻的 reputation/Fact/Modifier 物化并冻结 `currentDemand`；否则设为 `null`；
9. 清除 `eveningResolved`；
10. 依 Catalog 处理 `day.ended`、`phase.entered` 等 Scheduler contexts，生成按因果顺序排列的 `GameplayFactV1[]`，通过 Schema/invariants 后一次提交 Snapshot；Application Runtime 在成功结果后排队 Auto Save candidate。

主动提交 `closed` 计划后，进入晚上时直接把 `eveningResolved` 标记为真，不建立 OpeningSession，也不扣工资、杂费或人气；若进入晚上时仍无计划，`AdvancePhase` 在同一事务补上紧急 `closed` 计划、人气 -1 和类型化事件，并同样标记已解决。已有 non-closed plan 但未能开店时，晚上结束的 `AdvancePhase` 使用完全相同的紧急 closure reason/penalty/history 后继续日终。三种情况都由唯一的 Calendar 命令拥有跨日边界，不存在第二条偷偷跨日的路径。

## 8. Aura、Story Fact 与 Outcome

PoC 只允许以下 Aura：

| ID                        | 可见性      | 目标 | 生命周期                                      | 效果                                                |
| ------------------------- | ----------- | ---- | --------------------------------------------- | --------------------------------------------------- |
| `heroine.angry`           | 可见 Debuff | 女主 | 2 次日终或道歉解除                            | 接待 -1；默契增长为 0                               |
| `tavern.sign_repaired`    | 可见 Buff   | 酒馆 | 下一次成功结算且实际适用的亲自/部分营业后消耗 | 亲自/部分接待与备菜点各 +1；委托/停业不适用且不消费 |
| `player.adventure_strain` | 可见 Debuff | 玩家 | 下一次夜间恢复后消耗                          | 该次自然恢复 -2                                     |

以下不是 Aura，而是由 `StoryStateDefinitionsV1` 封闭声明、并持久在 Snapshot 中的 Story 状态：

| ID                                      | 类型          | 默认值 / 允许值                                                                                                                                                                                                             |
| --------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fact.war_clue`                         | boolean Fact  | `false`                                                                                                                                                                                                                     |
| `fact.tutorial_first_service_completed` | boolean Fact  | `false`                                                                                                                                                                                                                     |
| `fact.invoice_checked_this_week`        | boolean Fact  | `false`                                                                                                                                                                                                                     |
| `outcome.relationship_opportunity`      | token Outcome | 默认 `relationship.pending`；允许 `relationship.pending` 、`relationship.completed`、`relationship.abandoned`、`relationship.reconciled`、`relationship.unresolved_conflict`                                                |
| `outcome.investigation`                 | token Outcome | 默认 `investigation.not_attempted`；允许 `investigation.not_attempted`、`investigation.missed_by_choice`、`investigation.setback`、`investigation.success_with_cost`、`investigation.complete`、`investigation.exceptional` |

`fact.invoice_checked_this_week` 在 `StartRun` 时由 definition 默认为 `false`，命中 D2 选项后设为 `true`，并随 Snapshot 保留至本轮结束。PoC 不存在通用的周期 flag 容器；需要新的持久状态时，必须增加强类型 Fact/Outcome definition 及其受限效果。

不得为了普通事件新增可携带任意参数的万能 Aura。

## 9. Scheduler Event、玩家 Action 与互斥

`EventId` 只标识真正进入 Scheduler 候选集的 `StoryEventDefinitionV1`。PoC 的实际 Event 包括 `event.tutorial_first_service`、`event.supplier_invoice`、`event.helper_available`、`event.facility_window` 与 `event.levy_due`。玩家主动发起的 StoryAction、Facility opportunity 和 WorldAction 使用 `ActionId`，不得伪装成同名 Event：D4 的 Scheduler 通知是 `event.facility_window`，而 `facility.choose.opportunityId` 是 `action.facility_window`；修招牌、调查与道歉分别为 `action.repair_sign_with_heroine`、`action.old_trade_road`、`action.apologize_to_heroine`。

事件定义使用稳定 ID、明确窗口、优先级、受限条件与受限效果。PoC 不实现动态脚本或通用加权事件池。Scheduler 在每个 context 开始时冻结一份不可变 observation；该 context 的所有 trigger/condition 都读取同一份 observation，并在候选选择完成后才按稳定顺序应用效果，因此同一 context 的事件不能互相启用或禁用。后续 context 可以看到前一 context 已提交到同一候选事务的效果。

对 PoC 最重要的 observation 边界是：`command.succeeded` 看到 GameCommandExecutor 已应用的各 owner proposals；`calendar.advance_phase` 是唯一时间命令，但 Calendar owner 只写 Calendar 路径。GameCommandExecutor 先协调营业后腐败、日终 Aura 计时、夜间恢复、每日重置及日期/时段推进，再让 `day.ended` 与 `phase.entered` 读取完整 post-transition candidate。前者 context 携带刚结束的旧日，后者携带新日期/时段；Story 匹配旧日必须使用 `day.ended` trigger 自带的 `days`，不能假定 conditions 中的 calendar 仍停在旧日。这些只是同一命令事务里的不可变投影，不是额外提交的 Snapshot。

七日 Story 用以下整数层级给候选排序：

- 400：强制教学与结算；
- 300：明确截止期限；
- 200：已选择的关系/故事事件；
- 100：非阻塞提示。

这些 authored priority 只决定同一 context 的稳定候选顺序，绝不作为“保留最高、静默丢弃其他事件”的冲突解决器。七日 Story 的窗口与 conditions 必须设计到同一外层命令至多产生一个 blocking scene request；若仍选中两个 Scheduler scenes，或一个 Scheduler scene 与 handler 自带 Scene 冲突，Engine 按 Catalog fault 并回滚整条命令。纯效果事件可以在同一 context 多个生效。

周五上午同时展示两条机会与互斥说明。调查必须在上午执行 `world.action.begin { actionId: "action.old_trade_road", optionId }`；`optionId` 只能是 `choice.old_trade_road.basic` 或 `choice.old_trade_road.prepared`，不存在独立的准备命令。Begin 扣除 `step.old_trade_road.departure` 的 1 AP，并在同一事务中验证与扣除 3 体力、基础物资费 4 以及准备 option 的额外 4；成功后立即占用互斥组、将 `outcome.relationship_opportunity` 设为 `relationship.abandoned`，并以 `scene.old_trade_road.departure` 建立 Narrative。扣款、体力、Scheduler 或 Narrative 仲裁失败时整条命令回滚，关系机会仍可用。均衡生活多出的上午 1 AP 必须在出发前使用。

`scene.old_trade_road.departure` 结束后 workflow 进入等待下午状态；在此之前 `calendar.advance_phase` 会被 Narrative 阻止。合法推进到下午时，GameCommandExecutor 完成各 owner 的 phase-transition proposals 后请求第二步 `step.old_trade_road.investigation` 的 `scene.old_trade_road.investigation`。该场景结束后 workflow 才进入 `ready_to_complete`，此时除系统/存档外只允许 `world.action.complete`：扣除第二步 2 AP，使用 Begin 冻结的 `preparationBonus` 结算检定，追加 `ResolvedCheckV1` 与 band effects，并清除 workflow；不再扣现金或体力，也不启动第三段隐式 Narrative。结果 Overlay 从已提交的 ResolvedCheck projection 展示档位和收益，读档不会重掷。

若没有开始调查，进入下午后调查入口关闭，关系 StoryAction `story.action.start { actionId: "action.repair_sign_with_heroine" }` 开放。关系场景分别用 `choice.repair_sign.cooperate`（2 AP）、`choice.repair_sign.decline`（0 AP）或 `choice.repair_sign.conflict`（0 AP）提交结果；任一选择都将 `outcome.investigation` 设为 `investigation.missed_by_choice`。玩家也可以完全不发起该 StoryAction，此时不自动修改关系 Outcome，保持普通经营伙伴路线。周六生气时才开放 `action.apologize_to_heroine`。

WorldAction/StoryAction 自带的 scene request 与同一外层命令内 Scheduler 选出的 scene request 共用一个阻塞仲裁。整条命令只能产生零或一个阻塞 scene；若产生两个，以稳定 fault 回滚候选状态、RNG、Event 与 Narrative，不排队也不覆盖。纯效果 Scheduler Event 仍可按稳定 context/event 顺序应用。

## 10. 门槛与 2D6

- 确定性门槛：满足段位后直接开放选项；
- 随机检定：`score = 2D6 + attributeBonus + preparationBonus + auraBonus`；
- 结果分为受挫、带代价成功、完整成功、卓越成功；
- 所有骰子来自可序列化 PRNG；
- 事件首次结算时从唯一 PRNG 流取值，并在同一事务将结果提交至 Snapshot；事件前读档恢复相同 PRNG 状态，因此仍得到相同骰点；
- 成功检定先把骰点、修正、总分与 CheckBandId 追加为持久 `ResolvedCheckV1`，再由该 band 的受限 effects 将 `outcome.investigation` 映射为 `investigation.setback | investigation.success_with_cost | investigation.complete | investigation.exceptional`；重复进入不能重掷，也不能重放 effects。

## 11. 周日税负

周日没有新的收入来源。`PayLevy`：

1. 读取现金和税额；
2. 若现金不足，记录缺口并结束为 `failed_arrears`；
3. 若足够，扣税；
4. 根据税后现金、人气与设施计算稳定/危险结果；
5. 组合关系与调查结果；
6. 生成周总结与诊断指标；
7. 提交 terminal Snapshot 与 GameplayFact；Application Runtime 按通用规则为成功 dispatch 排队 Auto Save candidate。

`PayLevy` 不改变 `phase`；最终存档固定为 `day=7`、`phase=afternoon` 与 terminal run status。总结界面是终局投影，不代表另一个晚上时段。

库存不能在周日自动按价值变现，避免隐藏救济破坏账本可读性。

## 12. 存档与确定性

存档只捕获已经提交并通过不变量的完整 `GameSnapshot`。SaveRecord 的 `formatRevision`、Story/Engine provenance、state digest、Slot metadata、Auto/Quick/Manual 行为、导入限制和兼容策略完全遵守运行时与 Story 架构规格第 15 节，不在七日 Story 另建 envelope。

Slot 语义在 D7 也不改变：`auto.current` 是滚动自动存档；它缺失或未通过完整验证时，合法的 `auto.previous` 只作为显式标记的 recovery candidate，不静默回退。`quick` 和 `manual` 是两个独立可替换 Slot，各自捕获调用瞬间的已提交 Snapshot。

加载顺序为：严格解析隔离候选 → SaveRecord Schema 与上限 → state digest → identity/compatibility → 稳定引用与当前 Story Schema → Base/GameplayModule/GameSimulation invariants → 原子替换 GameSession。阻断键精确为 `story.id + story.revision + stateContractRevision + stateContractDigest + engine.digest + simulationDigest`；`story.digest`、`presentationDigest`、display-only `engine.version` 与 diagnostics-only `appBuildId` 只提示。只有独立 adoption declaration 精确匹配旧/新 simulation digest、状态合同 revision/digest 与当前 simulation PatchSet，且候选通过完整校验时可以收养；纯表现补丁不影响该资格。收养必须建立新 replay anchor并清空旧 CommandLog。其他阻断差异保留原文件、允许导出并拒绝建立可运行 GameSession。`debug_tools` capability 下对 DebugBundle 的 best-effort inspection/replay 仍不得写入 Save Slot。

至少保留一个 `SaveRecordV1` fixture，证明 Auto、Quick、Manual、OpeningSession、WorldActionSession 与周结算状态的 round-trip；另保留损坏、未来 formatRevision、revision mismatch、digest mismatch 和 current→previous recovery fixtures。首版 fixture 不虚构尚不存在的 migrator。

## 13. GameplayFact、Story Fact 与账本行

每个成功命令返回按引擎应用顺序排列的不可变 `GameplayFactV1[]`，例如：

```text
inventory.purchased
inventory.consumed
inventory.spoiled
food.discarded
calendar.phase_advanced
service.orders_created
service.capacity_limited
service.sale
cash.changed
reputation.changed
relationship.teamwork_changed
aura.applied
aura.expired
narrative.choice_committed
check.resolved
fact.set
outcome.set
levy.paid
run.completed
```

UI 文案和测试消费 GameplayFact 中的类型化字段，并在适用时读取 `ChangeReasonV1` 与 before/after，不重新猜测状态差量。`GameSnapshot` 是唯一恢复来源；`GameplayFactV1[]` 只负责解释本次 dispatch 并进入最多 200 条的有界 CommandLog，不用于恢复或再次应用。需要跨命令保留的故事状态必须是 Snapshot 中的强类型 Story Fact/Outcome；现金、报废、腐败和其他估值原因必须写入 `InventoryStateV1.ledger` 的 `LedgerEntryV1`，不伪装成 Story Fact。

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
- Auto current 损坏时的 previous recovery candidate，以及 Quick/Manual 独立 round-trip；
- SaveRecordV1 round-trip 与不支持身份/格式的拒绝路径。

具名矩阵补充而不替代 Harness 的 Story Rule Contract、fast-check、1,000-seed driver、RTL 与 Playwright 测试。
