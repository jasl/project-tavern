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
| 每次开店杂费                  |                                       1 |
| 菜单上限                      |                                  2 道菜 |
| 每道菜计划份数上限            |                                   99 份 |
| 当日备菜行动上限              |                                    2 次 |
| 单次采购行上限                |       5（恰好覆盖本 Story 的 5 种原料） |
| 单条采购数量上限              |                                   99 份 |
| 单命令 Narrative 自动节点上限 |                                     128 |
| Narrative call 深度上限       |                                       8 |
| 初始伙计                      | `{ unlocked:false, tier:"apprentice" }` |
| 初始菜谱                      |                            四道全部解锁 |
| 初始原料/道具/Aura            |                                全部为空 |

两个数量上限在强类型 `StoryBalance` 中分别命名为 `purchaseQuantityPerLineLimit` 与
`menuPortionsPerRecipeLimit`；它们限制表单和命令中的单条数值，不替代现金、接待容量、备菜能力与原料等动态约束。
上述两个 Narrative 数值则分别命名为 `maxNarrativeStepsPerCommand` 和 `maxNarrativeCallDepth`。Story materializer、
Phase 4A fixture program 与 interpreter 只消费这两个字段；不得另设 `narrativeStepLimit`、`narrativeCallDepth` 或
`64/4` fallback。

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

任何开店模式另收 1 点杂费。完全委托仍能从白天备菜得到有限帮助，但低于亲自参与。

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

本节定义两级只读 gate，二者职责不可互换：

- Story `pnpm --filter @project-tavern/story-poc verify:balance:smoke` 是 Phase 4B/5 的快速合同 gate。它用当前默认 Program 固定运行 seed 1 的六策略顺序/worker 等价与真实 worker structured admission，再用反向输入的 synthetic seeds 1–2 shards 证明排序/合并/间隙和 ending/sample 不变量而不重复昂贵 Simulation；seed 17 另行执行真实 `war_clue` committed-attempt → D6 plan 分支。它还覆盖设施 counterfactual、指标/Pareto/中位数、完整阈值边界、账本不变量、校准邻居排序与不可变 Program materialization。Root `pnpm verify:balance:smoke` 只是调用这一 Story leaf 的便捷别名。它必须快速、确定、无写入，但不对 1,000 个种子的总体阈值作抽样推断。
- Root/Story `pnpm verify:balance` 是唯一完整 release gate。其 CLI 直接运行 seeds 1–1000、全部六策略、D4 压力、设施 counterfactual 和本节所有总体阈值，最终只输出一个包含 `deficit` 与精确 metrics/counterfactual evaluation 的 canonical report；它不通过 Vitest、`test:story` 或 smoke alias 间接运行。普通 Phase 4B/5、unit 与 full local verification 不得意外包含这条长 corpus。完整 evaluator 可显式接收 `--workers=1..64`，本机默认 16；worker count 只划分连续 seed ranges，不进入 canonical report/evidence。

`pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N` 复用完整 corpus，但只读地枚举和评估 §14.4 的合法邻居，输出 canonical baseline/candidate/selection evidence；可验证辅助执行使用 `calibrate:balance:remote --iteration=N [--prior-after-sha256=sha256:<previous-local-after>] --host=... --remote-root=... --workers=... --attestation-out=...`，但 semantic evidence 与本机命令保持同一形状。`N = 0` 禁止 prior digest；`N > 0` 必须在 iteration 后紧接上一 accepted step 的本机 after-evaluation digest。`N` 只能来自 accepted Phase 5C checkpoint 后 first-parent ancestry 中已验证且严格连续的 calibration-step commit 数，不来自聊天、shell 或本地文件。它显式表示已应用的变化数，调用时不插入独立 `--`，也不修改 balance、fixture、golden、Save 或任何计划文件。Task 10 另有无 package alias 的 `node scripts/verify-poc-balance.mjs --qualify-provisional`：它只在完整 reproduction range `1..1000` 的所有 metrics/counterfactual 与下述 2026-07-15 provisional report 精确相等时返回 0；默认 `verify:balance` 仍对同一 deficit 返回非零。该临时 qualifier 只在 Phase 6 final balance-freeze commit 中移除。Phase 4B/5 可在 strict full gate 保持“已记录且仅阈值失败”的状态下继续，但 smoke、schema、命令、算法、确定性、不变量、counterfactual、Pareto 与 provenance 失败一律不能 defer。

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

`medianPaidAfterTaxCash` 只对已缴税轮次的 `afterTaxCash` 升序计算；偶数个样本取中间两个整数的算术平均值，因此类型仍是有限 number，零个样本为 `null`。三种 ending count 之和必须等于 1000，`paidCount = stableCount + dangerCount`。这个精确 shape 属于完整 release corpus；fast smoke 使用同一聚合语义的 bounded shard 值，不伪造 `firstSeed:1,lastSeed:1000`。

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

`overrides` 是上述 closed kind 对应的固定、按 `field` 排序的 before/after provenance；结果必须 deep-freeze、通过完整 Program schema，并在创建 `GameSessionV1` 之前完成。它只从 `game/stories/poc/src/testing/**` 导出，不进入 Story 默认入口、tooling、正式 Artifact、正式 Story simulation digest 或玩家存档；测试场景自身仍按其实际 Program 计算独立 simulation digest。counterfactual runner 仍提交相同 strategy compiler 生成的普通 Semantic invocation；床铺场景必须在 D6 因体力不足拒绝同一亲自营业 invocation，冷藏场景必须在 D5 日终腐败同一 D4 鲜肉批次。

### 14.4 Phase 6 Artifact 前的确定校准路径

Phase 4B 先完成 reference command fixture、完整 runner/calibration/counterfactual 基础设施与 fast smoke，并至少运行一次 strict 1–1000 gate 得到完整基线证据。2026-07-15 的 provisional technical baseline reproduction 是完整 seed range `1..1000`（这是总体计数失败，不伪称存在一个单独失败 seed），且只有一条冻结阈值失败：`strategy.full_delegation.paidCount=801`，低于未改变的下界 850，缺口 49；该策略已缴税样本中位数为 14，其他总体阈值和 counterfactual 均通过。只有 live 复跑仍证明“仅冻结阈值失败”时，Phase 4B/5 才可使用 provisional golden/Save 技术基线继续；任何其他失败都必须在所有者处先修复。

完整校准延后到 Phase 5C Acceptance 之后，但必须在 Phase 6 Task 1 或任何 Phase 6 Artifact implementation/build 或 release evidence 之前闭环；此前 Phase 5 development builds 只属于 UI/interaction evidence，不能充当 release evidence。Phase 6 entry 紧邻 accepted Phase 5C，因此从该 checkpoint 到 final（尚无 final 时到 `HEAD`）的每个 first-parent commit，不论 path，都必须且只能分类为连续的 `Balance-Calibration-Index: 1..N` step、显式 `Balance-Calibration-Repair: true` 的 Task 10 owner repair，或唯一 final；final 必须晚于最后 step/repair。Final 后允许普通 Phase 6 task commits，但以 `git diff "<commit>^1" "<commit>"` 检查时不得再触及 step/final protected paths。任何无分类/多分类 pre-final commit 使恢复无效。

所有 committed-HEAD gate、historical replay 与 dirty recovery 都在 temporary detached clean sandbox 中运行，使用 live store 的 recovery-only offline frozen install：

```bash
test "$(node --version)" = "v26.5.0"
test "$(pnpm --version)" = "11.11.0"
target_commit="<clean-commit-sha>"
(
  set -eu
  test "$(node --version)" = "v26.5.0"
  test "$(pnpm --version)" = "11.11.0"
  repo="$(git rev-parse --show-toplevel)"
  store="$(pnpm store path --silent)"
  sandbox="$(mktemp -d "${TMPDIR:-/tmp}/project-tavern-balance.XXXXXX")"
  rmdir "$sandbox"
  trap 'git -C "$repo" worktree remove --force "$sandbox" >/dev/null 2>&1 || true' EXIT HUP INT TERM
  git -C "$repo" worktree add --detach "$sandbox" "$target_commit"
  cd "$sandbox"
  pnpm install --offline --frozen-lockfile --store-dir "$store"
  # Run the required strict gate, selector, writer, or patch replay here.
)
```

执行者先选择 Phase 0 materialized PATH（当前 checkpoint 为 `/opt/homebrew/bin`），live 与 subshell 的 Node/pnpm 断言通过且匹配 accepted materialization identity 后才可产证据。该 install 不访问 registry、不改变 live tree/lockfile。每个历史 step 都必须在其 parent sandbox 以当时已应用步数 `N` 重跑 `pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N`，校验 canonical evidence SHA-256 与所有 field/before/after/deficit/index trailers，重新把候选应用到 `balance-v0.md`、`balance.ts` 和精确 direct literals，并要求重建的完整 `git diff --binary` 与历史 commit byte-for-byte 相同；只验 path/scalar 不足以恢复。每轮新候选仍只改一个既有数值并独立提交，step 不含 qualifier、golden 或 Save。

项目所有者授权的辅助计算执行器可以代替本机运行 canonical 邻居枚举，但不能代替本机验收：无零缺口候选时 evidence
必须包含完整合法集；一旦达到零缺口则必须恰好结束于 canonical 顺序的首个零缺口候选。编排器只上传 clean
`git archive HEAD`，在两端校验 source commit/tree/archive、lock、tracked materialization/package closure 与 exact
Node/pnpm；远端 evidence run 从 fresh archive 执行 offline frozen install，并显式使用 `1..64` workers。它不得复制
本机 ignored attestation，不运行 writer/build/Vite/Playwright/server/Artifact/remote smoke，也不得把 SSH host、private
IP、路径、时间或调度顺序写入 semantic evidence/attestation。`N = 0` 首轮必须本机完整复算 current point；每轮都由
本机从同一 frozen archive 的独立 sandbox 严格 admission complete canonical remote candidates、重算 selector，并完整复算选中 candidate。两处 evaluation 都必须与
remote bytes 相同；后续轮次的 before digest 可由上一轮本机 after digest 链接。失败分别以稳定 mismatch 停止，绝不
应用候选。

使用辅助执行器的 step 除原七个 trailers 外还必须记录
`Balance-Calibration-Source-Archive-SHA256`、`Balance-Calibration-Before-Evaluation-SHA256`、
`Balance-Calibration-After-Evaluation-SHA256` 与 `Balance-Calibration-Remote-Attestation-SHA256`。历史 replay 可在
任何满足相同 exact-input/canonical-output 合同的执行器上重建，不绑定原物理主机。

balance evidence codec 接受 Base 已允许的 safe integer；中位数只额外允许非负 exact half-integer。Story-local
canonical codec 以唯一 `.5` 十进制 JSON number 编码后一种，且整数 evidence 与 Base Canonical JSON byte-identical；它不改变 Gameplay 的
SafeInteger 金额或引入 Decimal/舍入政策。

若 `Balance-Calibration-Repair: true` 出现在 `N > 0`，必须从 Phase 5C sandbox overlay repaired evaluator，并从 `--iteration=0` 顺序重放全部旧 steps；每轮 evidence/trailers/full binary patch 全等才能继续。任一差异产生 `balance_calibration_history_invalidated` 权威设计停点，禁止自动 rewrite、rollback 或重选历史；`N = 0` 可在 owner repair gates 通过后继续。Dirty step/final 也必须从 clean-`HEAD` sandbox 重算 selector 或 writer/removals，并要求完整 binary patch 与 live dirty patch 精确相同；混合或范围外 dirty bytes 必须停止。

允许的 calibration field 按顺序固定为：`levy`、`openingFee`、`assistedWage`、`delegatedWage`、`manualGuestCapacity`、`manualPreparationBase`、`manualPreparationPerAction`、`assistedGuestCapacity`、`assistedPreparationBase`、`assistedPreparationPerAction`、`delegatedGuestCapacity`、`delegatedPreparationBase`、`delegatedPreparationPerAction`。每次整数步长为 1（`levy` 步长为 2）。manual/closed 工资、closed 容量、体力/AP、D4 设施成本和两项设施 modifier 都是固定合同，不进入自动校准。固定顺序是在当前点枚举上述字段的 `-step`、再 `+step` 邻居，丢弃负值/破坏静态 schema 的候选，选择使未满足阈值的总绝对缺口严格下降最多的候选；并列按本文字段顺序、再 `-step` 优先。总绝对缺口是每条上下界到最近合法边界的整数距离之和，delegation median 也按 0–35 计算；counterfactual/Pareto boolean 失败各计 1001。最多 12 轮。若没有邻居严格改善、出现本节不允许修改的合同冲突或 12 轮后仍失败，停止为 `balance_contract_unsatisfied`，附完整 metrics/候选差异，不生成或更新 golden；不得降低阈值或偷偷接受失败结果。

所有冻结阈值通过后，clean/no-final 首次收口必须先在 clean non-detached live `main` 显式重新生成 Task 11 的 6 个 golden 与 Task 12 的 8 个 Save fixtures、执行精确 removals，并形成真正可 stage 的 candidate；final-parent sandbox 再独立重跑相同 writers/removals，重做完整 diff、精确 file count、schema/provenance、负面单字段差异和两次按路径排序 SHA-256 审查。只移除 provisional report data、assertion、`--qualify-provisional` CLI branch、专属 tests 与本文 provisional-to-final 状态文字；重建的完整 final `git diff --binary` 必须与 live candidate、historical final 或 pending dirty final 精确相同。唯一 final commit 不再修改 `balance.ts` 数值或两个 direct-expectation tests，并使用 `Balance-Calibration-Final: true`、`Balance-Calibration-Steps: N` 与 `Balance-Calibration-Report-SHA256: sha256:<digest>` trailers。该 commit 后必须在 final clean sandbox 只连续两次运行 `pnpm verify:balance`，要求 canonical stdout byte-identical 且 SHA-256 与 trailer 精确相等；退出 sandbox 后回到 clean live `main`、`HEAD = final`，再使 `verify:golden`、`verify:fixtures`、`pnpm verify` 与 materialization 全部通过，完整 replayed step/repair chain 加 final commit 才构成允许进入 Phase 6 Artifact 工作的冻结 checkpoint。

## 15. 已知风险

1. 140 税负可能让全委托从危险策略变成新手陷阱；
2. 亲自营业若体力压力不足，可能同时拿走现金和关系最优；
3. 两道容量概念（接待与备菜点）可能过难读；
4. 冷藏收益若不显示“避免的损失”，感知上会弱于床铺；
5. 周五互斥是人为实验控制，若玩家只感到强行锁路线，需要在正式设计中改成可提前规划的资源竞争；
6. 所有菜单位备菜毛利相同适合实验，却不适合长期游戏。
7. reference seed 的理想日利润过于平坦，可能让客群变化只剩“换采购表”；需由试玩判断是否要打破对称。

遇到上述问题先改数值或删规则，不增加新货币、新属性或新设施来补洞。
