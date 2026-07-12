# 七日 PoC 首轮数值草案 v0

状态：用于实现和推翻的初始假设，不是正式平衡
平衡取向：税负压线；亲自经营最赚钱，委托必须用释放的时间换取其他价值

## 1. 起始状态

| 项目                          |                                    数值 |
| ----------------------------- | --------------------------------------: |
| 起始现金                      |                                      70 |
| 起始库存                      |                                  全部 0 |
| 玩家体力                      |                                 10 / 10 |
| 玩家心情                      |                         0（范围 -2…+2） |
| 女主体力                      |                                 10 / 10 |
| 人气                          |                                      50 |
| 默契 / 好感                   |                                   0 / 0 |
| 女主心情                      |                         0（范围 -2…+2） |
| 关系阶段                      |                                    冷淡 |
| 玩家属性                      |                  体格 C、社交 C、智力 B |
| 周日城镇重建税负              |                                     140 |
| 每次开店杂费                  |                                       2 |
| 菜单上限                      |                                  2 道菜 |
| 当日备菜行动上限              |                                    2 次 |
| 单次采购行上限                |       5（恰好覆盖本 Story 的 5 种原料） |
| 单命令 Narrative 自动节点上限 |                                     128 |
| Narrative call 深度上限       |                                       8 |
| 初始伙计                      | `{ unlocked:false, tier:"apprentice" }` |
| 初始菜谱                      |                            四道全部解锁 |
| 初始原料/道具/Aura            |                                全部为空 |

上述两个 Narrative 数值在强类型 `StoryBalance` 中分别命名为 `maxNarrativeStepsPerCommand` 和 `maxNarrativeCallDepth`。Story materializer、Phase 4A fixture program 与 interpreter 只消费这两个字段；不得另设 `narrativeStepLimit`、`narrativeCallDepth` 或 `64/4` fallback。

基础夜间恢复：玩家 +3、女主 +3；夜猫子玩家仅 +2。舒适床铺在此基础上增加恢复。

## 2. 行动点与体力

| 行动     |                AP | 玩家体力 | 女主体力 |
| -------- | ----------------: | -------: | -------: |
| 采购     |                 1 |       -1 |        0 |
| 备菜一次 |                 1 |       -1 |        0 |
| 休息     |                 1 |       +3 |        0 |
| 建设施   |                 2 |       -1 |        0 |
| 关系事件 |                 2 |       -1 |       -1 |
| 文字冒险 | 3（上午1、下午2） |       -3 |        0 |
| 道歉     |                 1 |        0 |        0 |

两种方针：

| 方针     | 上午/下午/晚上 AP | 玩家自然恢复 | 意图                                      |
| -------- | ----------------: | -----------: | ----------------------------------------- |
| 均衡生活 |         2 / 2 / 2 |           +3 | 最稳定                                    |
| 夜猫子   |         1 / 2 / 3 |           +2 | 牺牲采购/冒险灵活性，换晚上休息或部分参与 |

## 3. 原料与保鲜期

| ID                          | 名称 | 单价 | 保鲜期 | 冷藏设施影响 |
| --------------------------- | ---- | ---: | -----: | ------------ |
| `ingredient.coarse_grain`   | 粗麦 |    1 |   7 天 | 否           |
| `ingredient.root_vegetable` | 根菜 |    1 |   3 天 | +2 天        |
| `ingredient.ale`            | 麦酒 |    2 |   7 天 | 否           |
| `ingredient.fresh_meat`     | 鲜肉 |    3 |   2 天 | +2 天        |
| `ingredient.herb`           | 香草 |    2 |   3 天 | +2 天        |

新购原料在购买日可用。营业后处理腐败，使用即将过期批次优先。成品不能隔夜保存。

## 4. 菜谱与客群偏好

偏好 0 表示拒绝，3 表示最喜欢。`备菜点`代表每份对厨房准备能力的占用。

| ID                           | 菜名       | 配方                | 成本 | 售价 | 毛利 | 备菜点 | 本地人/旅客偏好 |
| ---------------------------- | ---------- | ------------------- | ---: | ---: | ---: | -----: | --------------: |
| `recipe.grain_root_porridge` | 粗麦根菜粥 | 粗麦1、根菜1        |    2 |    5 |    3 |      1 |           3 / 1 |
| `recipe.ale_bread`           | 麦酒面包   | 粗麦1、麦酒1        |    3 |    6 |    3 |      1 |           2 / 3 |
| `recipe.hunter_stew`         | 猎人肉炖锅 | 鲜肉1、根菜1、香草1 |    6 |   12 |    6 |      2 |           3 / 2 |
| `recipe.traveler_roast`      | 商旅香烤肉 | 鲜肉1、麦酒1、香草1 |    7 |   13 |    6 |      2 |           1 / 3 |

四道菜有意保持“每备菜点毛利 = 3”，先隔离客群偏好、容量、工资和腐败的影响。长期版本必须再制造差异，但 PoC 不同时调太多变量。

## 5. 客流与预测

以下为 reference seed `0x00023049` 在人气 50、无额外事件时的实际客流。周一 UI 显示精确值；周二起显示每个客群 `±1` 的预测区间。

| 日      | 本地人 | 旅客 | 备注                          |
| ------- | -----: | ---: | ----------------------------- |
| D1 周一 |      6 |    2 | 引导营业                      |
| D2 周二 |      5 |    3 | 属性门槛事件                  |
| D3 周三 |      7 |    2 | 开放完全委托和税负义务追踪    |
| D4 周四 |      4 |    5 | 设施机会                      |
| D5 周五 |      3 |    7 | 关系/调查互斥                 |
| D6 周六 |      6 |    4 | 最后恢复窗口；情报可令旅客 +2 |
| D7 周日 |      0 |    0 | 店休与缴税                    |

其他种子在表中每个数字上产生 -1、0 或 +1 的确定性偏移。人气从次日起额外影响本地客流：

```text
reputationGuestModifier = clamp(trunc((reputation - 50) / 4), -2, 2)
```

实际本地客流不得低于 0。

## 6. 营业方式

`n` 为当日备菜行动次数。

| 模式              | 晚间 AP | 玩家/女主体力 | 接待上限 | 可用备菜点 | 工资 | 默契 |
| ----------------- | ------: | ------------: | -------: | ---------: | ---: | ---: |
| 亲自 `manual`     |       2 |       -3 / -3 |       10 |   `6 + 4n` |    0 |   +2 |
| 部分 `assisted`   |       1 |       -1 / -2 |        8 |   `6 + 4n` |    5 |   +1 |
| 完全 `delegated`  |       0 |         0 / 0 |        7 |   `7 + 2n` |    7 |    0 |
| 计划停业 `closed` |       0 |         0 / 0 |        0 |          0 |    0 |    0 |

任何开店模式另收 2 点杂费。完全委托仍能从白天备菜得到有限帮助，但低于亲自参与。

人气：

- 覆盖率 ≥80%：+1；
- 50%–79%：0；
- <50%：-1；
- 下午结束、进入晚上前计划停业：0；
- 没有合法计划导致紧急停业：-1。

覆盖率至少 50% 才增加默契。

## 7. D2 确定性属性门槛

事件 `event.supplier_invoice` 提供：

- `[智力 B] 指出重复计费`：直接节省 4 现金，追加原因为账单复核的账本行，并将 `fact.invoice_checked_this_week` 设为 `true`；
- `照单付款`：无额外后果。

该事件不掷骰，用来验证玩家能否理解“段位选项是确定性能力，而不是成功率提示”。

## 8. D4 设施二选一

两者均花费 12 现金、2 AP、1 玩家体力；只能在周四建一个，也可以放弃。

Scheduler Event `event.facility_window` 只在 D4 开放窗口并展示提示；实际提交使用 Facility opportunity `action.facility_window`。建造与跳过都以 `facility.choose` 记录唯一决定。

| ID                         | 设施     | 效果                                    | 验证目标                     |
| -------------------------- | -------- | --------------------------------------- | ---------------------------- |
| `facility.cold_storage`    | 冷藏柜   | 根菜、鲜肉、香草现有与未来批次保鲜期 +2 | 批量采购、冒险库存、委托路线 |
| `facility.comfortable_bed` | 舒适床铺 | 玩家每晚额外恢复 +2；女主 +1            | 高频亲自营业与生活设施价值   |

完整经营成功要求建成其中一个，迫使玩家在现金压力下作出可见投资；设施效果必须在周四至周六立即可体验。

## 9. D5 关系 StoryAction

StoryAction `action.repair_sign_with_heroine` 在周五下午开放，与文字冒险互斥。玩家先提交 `story.action.start` 进入关系场景，再用下表的稳定 ChoiceId 提交选择。一起修理时占用 2 AP，双方体力各 -1；放弃或不耐烦地拒绝不消耗 AP，但会提交该动作结果，不能再改走冒险。

选项：

| ChoiceId                       | 选择             | 结果                                                                                                         |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `choice.repair_sign.cooperate` | 一起认真修好     | 好感 +3、女主心情 +1、施加 `tavern.sign_repaired`；`outcome.relationship_opportunity=relationship.completed` |
| `choice.repair_sign.decline`   | 说明今天抽不开身 | 无惩罚，`outcome.relationship_opportunity=relationship.abandoned`                                            |
| `choice.repair_sign.conflict`  | 不耐烦地否定她   | 好感 -1、施加 2 日终的 `heroine.angry`；`outcome.relationship_opportunity=relationship.unresolved_conflict`  |

`tavern.sign_repaired` 只适用于亲自/部分营业：令下一次成功结算且该 Aura 的修正实际适用的亲自/部分营业接待上限与备菜点各 +1，并在该次 `tavern.opening.finalize` 成功后消耗。完全委托和停业既不获得效果，也不消耗次数；被拒绝或故障回滚的 Finalize 同样不消耗。

周六 StoryAction `action.apologize_to_heroine` 花费 1 AP：清除`生气`、恢复 1 好感，并将 `outcome.relationship_opportunity` 从 `relationship.unresolved_conflict` 设为 `relationship.reconciled`。自然到期只清除状态，不恢复好感，Outcome 仍为 `relationship.unresolved_conflict`。

Aura duration policy 也是数值合同：`heroine.angry = day_end default/max 2/2`，
`tavern.sign_repaired = opening 1/1`，`player.adventure_strain = night_recovery 1/1`。普通 Story apply 使用 default；
Cheat/DebugCommand 也只能在同 unit、1..max 内设置，不能把同一个 Aura 改成另一种生命周期。

## 10. D5 文字冒险与 2D6

WorldAction `action.old_trade_road`：

- option `choice.old_trade_road.basic` 的额外费用为 0、准备加值为 0；`choice.old_trade_road.prepared` 的额外费用为 4、准备加值为 +1；UI 必须在 `world.action.begin` 前选择 option，不存在独立的“购买准备包”命令；
- 上午执行 `world.action.begin`，扣除 `step.old_trade_road.departure` 的 1 AP，并启动 `scene.old_trade_road.departure`；该场景结束后才允许推进到下午；
- `calendar.advance_phase` 进入下午时启动 `step.old_trade_road.investigation` 的 `scene.old_trade_road.investigation`；该场景结束后才允许执行 `world.action.complete`，再扣除 2 AP、提交检定并清除 workflow；结果界面读取已持久化的 `ResolvedCheckV1`，不重掷也不启动第三段隐式 Narrative；
- 玩家体力 -3；
- 基础物资费 4；
- 基础费与 option 额外费都由 `world.action.begin` 在周五上午原子扣除；
- 与关系事件共享互斥组；
- reference seed 对该动作检定的裸 2D6 为 7。

检定：

```text
score = 2D6 + 智力 B(+1) + 准备加值
```

| score | CheckBandId                            | Outcome token                     | 结果       | 收益与代价                                              |
| ----: | -------------------------------------- | --------------------------------- | ---------- | ------------------------------------------------------- |
|    ≤5 | `band.investigation.setback`           | `investigation.setback`           | 受挫       | 香草1；施加 `player.adventure_strain`                   |
|   6–8 | `band.investigation.success-with-cost` | `investigation.success_with_cost` | 带代价成功 | 鲜肉1、香草2；没有完整情报                              |
|  9–11 | `band.investigation.complete`          | `investigation.complete`          | 完整成功   | 鲜肉2、香草3；`fact.war_clue=true`；D6 旅客 +2          |
|   ≥12 | `band.investigation.exceptional`       | `investigation.exceptional`       | 卓越成功   | 鲜肉3、香草4；`fact.war_clue=true`；D6 旅客 +2；人气 +1 |

reference seed 下，不买准备包得到 8，属于带代价成功；购买后得到 9，进入完整成功。这是有意设计的验收向量，用来证明准备行为真实改变结果。

## 11. 周日结果

税负：140。

- **稳定完成**：缴税后现金 ≥20、人气 ≥50、已建一个设施；
- **危险完成**：可缴税，但不满足全部稳定条件；人气低于 45 时附加`声誉危机`原因；
- **欠税失败**：现金不足 140。

周三、周四只显示义务追踪：`currentGap = max(0, 140 - currentCash)`，不猜测未来收入。

StoryBalance 的强类型策略固定为 `obligationForecast.visibleFrom = D3 morning`、`conservativeFrom = D5 morning`、`levyDue = D7 afternoon`。到达 conservativeFrom 只表示允许进入保守分支；仍须当晚非停业计划已经冻结且尚未结算。D3/D4 即使先设计划也保持 `current_gap`，全部六个营业日写入 `serviceHistory` 后才进入 `final`。

周五开始，在当晚计划被冻结后显示保守税后预测：

```text
conservativeTaxAfter = currentCash
  + lowerBoundNetOfCommittedTonightPlan
  - 140
```

`lowerBoundNetOfCommittedTonightPlan` 使用客流预测下界计算销量，扣除尚未扣除的工资与杂费；采购和事件成本已经反映在 `currentCash` 中。尚未提交当晚计划时不显示预测，只显示当前缺口。它不假设尚未计划的未来营业，因此负数只表示“仍需赚取的缺口”，不是提前宣判失败。

- ≥20：现金稳定条件已锁定；
- 0–19：税已覆盖但缓冲危险；
- <0：显示仍需赚取的确切缺口。

周六营业结算后，预测变为周日缴税前的精确结果。

## 12. 策略验收目标

以下是模拟器应调到的目标区间，不是尚未实现时伪装成精确结论。区间基于 reference seed，并允许菜单与采购策略造成差异。

| 策略       | 六晚模式与侧线                                       |  目标税后现金 | 预期                     |
| ---------- | ---------------------------------------------------- | ------------: | ------------------------ |
| 现金优先   | 亲自×6；建床；不走侧线                               |       100–170 | 稳定，默契高             |
| 关系优先   | 亲自/部分混合；D5关系；建床                          |         30–70 | 稳定，好感 +3            |
| 调查优先   | 亲自/部分混合；准备冒险；建冷藏                      |        65–125 | 稳定或高位危险，取得线索 |
| 渐进全委托 | D1亲自、D2部分、D3起完全委托；可完成一个侧线；建冷藏 |          0–35 | 税线附近，不能轻松致富   |
| 保守停业   | 营业4晚、计划停业2晚                                 |         10–55 | 可恢复但缓冲较小         |
| 显式失败   | D1亲自、D2部分、停业4晚                              | <0 或无法缴税 | 周五应已明确预警         |

一次普通失误定义为总现金影响不超过 12。关系/调查混合策略在周六改用亲自营业、廉价菜单并停止额外投资后，应仍有恢复可能。

## 13. 静态枚举 sanity check

在尚未实现体力、腐败、预测误差和事件前，先对 reference seed 做了一个“每天精确采购、知道实际订单、六晚使用同一模式”的最优菜单枚举。这个表刻意忽略 D1/D2 的模式解锁 gate，只是纯公式上界，不是可执行 reference driver。结果包含 D2 节省的 4 现金、12 设施成本与 140 税负：

| 六晚统一模式     | 0 次日备菜 | 1 次日备菜 | 2 次日备菜 |
| ---------------- | ---------: | ---------: | ---------: |
| 亲自营业税后现金 |         18 |         90 |        162 |
| 部分委托税后现金 |        -12 |         60 |        132 |
| 完全委托税后现金 |         -6 |         30 |         66 |

负数表示缴税时的现金缺口，实际状态不会允许现金变成负数。这不是试玩结果，只是证明数值没有出现“无论怎样都交不起税”或“完全委托不投入任何劳动也能轻松发财”的立即矛盾。加入体力、未知需求、报废与腐败后，实际结果应低于这些理想值；若低得使有效策略普遍失败，再降低税负或工资。

枚举也暴露一个实验风险：reference seed 下，理想菜单的每日最优毛利较平。客群变化主要改变采购的原料组合，而不是总利润。若实际试玩中预测与菜单选择因此失去意义，应在核心流程可读后再打破菜品单位备菜毛利对称，而不是现在增加更多系统。

## 14. 自动化平衡断言

固定种子集合为十六进制 `0x00000001` 到 `0x000003E8`（十进制 1–1000）。1,000-seed driver 必须严格使用 `reference-strategies.md` 第 10 节的唯一展开规则；不得另写自适应策略、读取未来随机值或搜索整周最优解。

- 现金、关系、调查策略各至少 900/1000 轮可以缴税；
- 渐进全委托策略 850–950/1000 轮可以缴税，缴税轮次的税后现金中位数为 0–35；
- 两晚停业恢复策略至少 700/1000 轮可以缴税；
- 显式失败策略至多 200/1000 轮可以缴税；
- 在 D4 额外扣除 12 现金后，现金、关系、调查三种策略各至少 750/1000 轮仍可缴税；
- 同种子同命令产生完全相同结果；
- AP、体力、库存不为负，现金变动与账本相等；
- `cash_first` 中，舒适床铺必须使 D6 的亲自营业合法；移除设施而保持同一命令时，该营业必须因玩家体力不足被拒绝；
- `investigation_first` 与 `full_delegation` 中，D6 必须消耗至少一份 D4 采购的鲜肉；移除冷藏而保持同一命令时，该批次必须在 D5 日终腐败；
- 任一策略在不超过 800/1000 个种子中同时严格支配其他五种策略的现金、关系结果、调查结果和自由 AP。

### 14.1 `PocBalanceMetricsV1` 的精确统计形状

统计器返回一个深冻结、Strict JSON、按 seed 与策略稳定排序的值；不得把测试断言隐藏在临时 console 文本中：

```ts
interface PocStrategyBalanceMetricsV1 {
  readonly paidCount: NonNegativeSafeInteger;
  readonly stableCount: NonNegativeSafeInteger;
  readonly dangerCount: NonNegativeSafeInteger;
  readonly arrearsCount: NonNegativeSafeInteger;
  readonly medianPaidAfterTaxCash: number | null;
}

interface PocBalanceMetricsV1 {
  readonly firstSeed: 1;
  readonly lastSeed: 1000;
  readonly strategies: Readonly<Record<PocReferenceStrategyIdV1, PocStrategyBalanceMetricsV1>>;
  readonly d4CashPressure: Readonly<{
    cashFirstPaidCount: NonNegativeSafeInteger;
    relationshipFirstPaidCount: NonNegativeSafeInteger;
    investigationFirstPaidCount: NonNegativeSafeInteger;
  }>;
  readonly strictDominanceCountByStrategy: Readonly<
    Record<PocReferenceStrategyIdV1, NonNegativeSafeInteger>
  >;
  readonly maximumStrictDominance: NonNegativeSafeInteger;
}
```

`medianPaidAfterTaxCash` 只对已缴税轮次的 `afterTaxCash` 升序计算；偶数个样本取中间两个整数的算术平均值，因此类型仍是有限 number，零个样本为 `null`。三种 ending count 之和必须等于 1000，`paidCount = stableCount + dangerCount`。

### 14.2 Pareto/严格支配定义

每个 `seed × strategy` 的现金与两条侧线从终局持久状态读取，`freeAp` 由 runner 在每次合法 phase advance 前从公开 Semantic GameView 累加；四项都不得从可能裁剪的 CommandLog 猜测：

```ts
interface PocParetoVectorV1 {
  readonly cashMargin: SafeInteger;
  readonly relationshipRank: -1 | 0 | 1 | 2;
  readonly investigationRank: 0 | 1 | 2 | 3 | 4;
  readonly freeAp: NonNegativeSafeInteger;
}
```

- `cashMargin = cashBeforeLevy - configuredLevy`（v0 初值为 140），欠税时允许为负；
- relationship rank：`unresolved_conflict=-1`，`pending|abandoned=0`，`reconciled=1`，`completed=2`；
- investigation rank：`not_attempted|missed_by_choice=0`，`setback=1`，`success_with_cost=2`，`complete=3`，`exceptional=4`；
- `freeAp` 是每次合法 `calendar.advance_phase` 放弃的当期 `apRemaining` 之和；进入 terminal 后的不可行动时段不计。

同一 seed 下，A 严格支配 B 当且仅当 A 的四个数值逐项 `>=` B 且至少一项 `>`。A “同时严格支配其他策略”要求它对另外五个策略都成立。`strictDominanceCountByStrategy[A]` 是满足该条件的 seed 数，`maximumStrictDominance` 是六个 count 的最大值。不得用现金加权总分、只比较参加的侧线、或把两条侧线折叠成一个 `max` 分数。

### 14.3 Test-only counterfactual scenario contract

设施和 D4 压力测试只能通过 Session 创建前的封闭、不可变 scenario builder 生成另一份已验证 Simulation Program；不得运行中写 Snapshot、调用 DebugTools/Cheat、编辑存档、插入任意函数或污染正式 Story export。scenario kind 只有：

```ts
type PocCounterfactualScenarioKindV1 =
  | "baseline"
  | "d4_cash_pressure"
  | "without_comfortable_bed_recovery"
  | "without_cold_storage_shelf_life";
```

- `d4_cash_pressure` 仅把同一 D4 facility build 的成本从 12 提高到 24，使额外 12 现金在真实 `facility.choose` 事务发生；
- `without_comfortable_bed_recovery` 保留设施 ID、选择、价格和命令，只将床铺恢复 modifier 设为 0；
- `without_cold_storage_shelf_life` 同样只将冷藏保鲜 modifier 设为 0。

provenance 和 scenario 的精确形状为：

```ts
type PocCounterfactualOverrideV1 =
  | { readonly field: "facilityBuildCost"; readonly before: 12; readonly after: 24 }
  | { readonly field: "comfortableBedPlayerRecovery"; readonly before: 2; readonly after: 0 }
  | { readonly field: "comfortableBedHeroineRecovery"; readonly before: 1; readonly after: 0 }
  | { readonly field: "coldStorageShelfLife"; readonly before: 2; readonly after: 0 };

interface PocCounterfactualProvenanceV1 {
  readonly scenarioId:
    | "counterfactual.baseline"
    | "counterfactual.d4_cash_pressure"
    | "counterfactual.without_comfortable_bed_recovery"
    | "counterfactual.without_cold_storage_shelf_life";
  readonly kind: PocCounterfactualScenarioKindV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: NonZeroUint32;
  readonly baseStoryIdentity: { readonly id: "week.poc_001"; readonly revision: 1 };
  readonly overrides: readonly PocCounterfactualOverrideV1[];
}

interface PocCounterfactualScenarioV1 {
  readonly provenance: PocCounterfactualProvenanceV1;
  readonly program: PocSimulationProgramV1;
  readonly bootstrap: PocGameBootstrapInputV1;
}
```

`overrides` 是上述 closed kind 对应的固定、按 `field` 排序的 before/after provenance；结果必须 deep-freeze、通过完整 Program schema，并在创建 `GameSessionV1` 之前完成。它只从 `stories/poc/src/testing/**` 导出，不进入 Story 默认入口、tooling、正式 Artifact、正式 Story simulation digest 或玩家存档；测试场景自身仍按其实际 Program 计算独立 simulation digest。counterfactual runner 仍提交相同 strategy compiler 生成的普通 Semantic invocation；床铺场景必须在 D6 因体力不足拒绝同一亲自营业 invocation，冷藏场景必须在 D5 日终腐败同一 D4 鲜肉批次。

### 14.4 Golden 冻结前的确定校准路径

先完成 reference command fixture，再运行 1–1000 corpus，最后才允许生成 golden。若首轮阈值失败，agent 不暂停请求主观意见，也不改命令、算法、closed ID 或测试阈值；它输出完整 `PocBalanceMetricsV1`，按“现金/通过率 → 委托中位数 → 设施 counterfactual → Pareto”顺序定位，并且每轮只修改 `balance-v0.md` 与 `stories/poc/src/content/balance.ts` 中一个既有数值。每次修改都重跑 reference seed、1–1000 corpus 和 counterfactual，保留前后 metrics diff。

允许的 calibration field 按顺序固定为：`levy`、`openingFee`、`assistedWage`、`delegatedWage`、`manualGuestCapacity`、`manualPreparationBase`、`manualPreparationPerAction`、`assistedGuestCapacity`、`assistedPreparationBase`、`assistedPreparationPerAction`、`delegatedGuestCapacity`、`delegatedPreparationBase`、`delegatedPreparationPerAction`。每次整数步长为 1（`levy` 步长为 2）。manual/closed 工资、closed 容量、体力/AP、D4 设施成本和两项设施 modifier 都是固定合同，不进入自动校准。固定顺序是在当前点枚举上述字段的 `-step`、再 `+step` 邻居，丢弃负值/破坏静态 schema 的候选，选择使未满足阈值的总绝对缺口严格下降最多的候选；并列按本文字段顺序、再 `-step` 优先。总绝对缺口是每条上下界到最近合法边界的整数距离之和，delegation median 也按 0–35 计算；counterfactual/Pareto boolean 失败各计 1001。最多 12 轮。若没有邻居严格改善、出现本节不允许修改的合同冲突或 12 轮后仍失败，停止为 `balance_contract_unsatisfied`，附完整 metrics/候选差异，不生成或更新 golden；不得降低阈值或偷偷接受失败结果。

## 15. 已知风险

1. 140 税负可能让全委托从危险策略变成新手陷阱；
2. 亲自营业若体力压力不足，可能同时拿走现金和关系最优；
3. 两道容量概念（接待与备菜点）可能过难读；
4. 冷藏收益若不显示“避免的损失”，感知上会弱于床铺；
5. 周五互斥是人为实验控制，若玩家只感到强行锁路线，需要在正式设计中改成可提前规划的资源竞争；
6. 所有菜单位备菜毛利相同适合实验，却不适合长期游戏。
7. reference seed 的理想日利润过于平坦，可能让客群变化只剩“换采购表”；需由试玩判断是否要打破对称。

遇到上述问题先改数值或删规则，不增加新货币、新属性或新设施来补洞。
