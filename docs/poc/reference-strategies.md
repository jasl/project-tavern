# Reference strategy drivers

状态：固定 reference seed 的确定性验收输入
作用：把策略描述收束为可生成唯一命令序列的规则；不是玩家攻略

## 1. 共同规则

所有 reference driver 使用 seed `0x00023049`。除 `relationship_first` 使用夜猫子外，其余均选择均衡生活。每条 `calendar.advance_phase` 后，driver 先读取 Narrative projection 并排空该时段唯一的 Scheduler Scene；无选择通知只提交 `narrative.advance`。D2 的 `event.supplier_invoice` 是唯一带 choice 的自动 Scene：driver 把当前 projection 的 `sceneId`、`nodeId` 原样复制到 `narrative.choose`，固定提交 `choice.supplier_invoice.intellect_b`，再走到 Scene 结束。driver 不硬编码或猜造游标 ID。

新局先执行 `StartRun`；它启动 `manifest_start` 开局文字卡，driver 反复提交合法的 `narrative.advance`，直到该 Scene 完成，再执行表中指定的 `ChooseLifePolicy`。每日命令按以下顺序生成：

1. 执行当天表格列出的上午动作；
2. `AdvancePhase`，随后按上段规则排空 Scheduler Scene；
3. 执行下午动作并冻结服务计划；
4. `AdvancePhase`，随后按上段规则排空 Scheduler Scene；
5. 执行表格列出的营业前晚间动作；
6. 非 `closed` 服务把玩法 shorthand `ResolveService` 固定展开为相邻的 `StartOpening`、`FinalizeOpening`；七日 Story 不在两者之间插入其他命令。计划停业在第 4 步进入晚上时已标记当晚 resolved，因此跳过这两条营业命令；
7. `AdvancePhase` 完成日终，并按上段规则排空新日上午 Scheduler Scene。

D6 的第 7 步进入 D7 上午并先排空 `event.levy_due` Scene。D7 不执行普通动作：再用一次 `AdvancePhase` 进入下午，处理任何 projection 后立即执行 `PayLevy`。终局固定停在 `day=7`、`phase=afternoon`；所有 driver 都必须包含这两条领域命令和必要的 Narrative drain。

表格没有写出的 AP 直接放弃，不自动寻找更优动作。任何命令被拒绝都使该 driver 失败，不能临时换营业方式或菜单。

“上午/下午动作”按下列机械规则展开，避免测试作者自行安排：

1. `备菜2`、`休息2` 先展开成两个相同的独立命令；其余动作维持表内从左到右的顺序；
2. 先为固定窗口命令预留 AP：`BeginAdventure` 固定为上午最后一条领域命令，随后走完 departure scene；下午的 `AdvancePhase` 自动启动 investigation scene，走完该 scene 后 `CompleteAdventure` 固定为下午第一条领域命令；关系 StoryAction 固定在普通下午动作之后、服务计划之前，其中一起修理占满下午，放弃/冲突为该时段最后一条故事动作；
3. 其余需要 AP 的动作按列表顺序放入最早可用且能完整支付该命令的上午或下午；同一命令不可跨时段拆分；
4. `BeginAdventure` 展开为 `world.action.begin { actionId: "action.old_trade_road", optionId }`；基础与准备 option 分别固定为 `choice.old_trade_road.basic`、`choice.old_trade_road.prepared`，不生成独立的准备命令。准备 option 由 Begin 原子扣除基础物资与准备包合计 8 现金；Begin 后反复发出合法的 `narrative.advance` 直到 `scene.old_trade_road.departure` 结束；
5. `CompleteAdventure` 展开为：推进 `scene.old_trade_road.investigation` 直到结束，再提交 `world.action.complete`。检定后结果从 persisted `ResolvedCheckV1` 读取，不再发 Narrative 命令；
6. “一起修理招牌/放弃关系事件/冲突”分别展开为 `story.action.start { actionId: "action.repair_sign_with_heroine" }`，推进到 choice node，复制当前 `sceneId`/`nodeId` 并提交 `choice.repair_sign.cooperate | choice.repair_sign.decline | choice.repair_sign.conflict`，再推进至 scene 结束；
7. “建冷藏柜/建舒适床铺/放弃施工”分别用 `facility.choose { opportunityId: "action.facility_window", choice }`，build choice 携带对应 FacilityId，skip 不携带 FacilityId；
8. 所有服务计划都在下午动作之后、第二次 `AdvancePhase` 之前提交统一的 `tavern.plan.set { plan }`。非停业 plan 使用表格固定 mode/menu；计划停业固定在下午末尾提交 `{ mode:"closed", menu:[] }`；
9. “晚上服务前”动作按列表顺序执行；非 `closed` 计划然后相邻调用 `StartOpening` 与 `FinalizeOpening`，任一失败都使 driver 失败，不能只重试第二条、绕过开始成本或插入额外动作。`closed` 计划不发出两条 Opening 命令。

若预留固定窗口后，普通动作无法按上述规则排入合法时段，则 driver 直接失败。生成 fixture 时必须保存带明确 `day`、`phase` 和顺序号的最终命令列表；表格本身不在测试运行时临时解释。

## 2. 采购展开规则

`buy(current)` 表示购买当日服务计划的精确短缺；`buy(current+next)` 表示一次购买覆盖当日与次日计划；`buy(D4+D5+D6-clue)` 固定按这三天表内的“有线索”计划采购，即使 D5 的检定结果尚未产生。该特殊展开把同一日随后建造冷藏柜视为已经提交的计划，计算可用期时给 D4 现有与新购批次应用 +2；若建造命令随后失败，整个 driver 仍按失败处理。

测试 driver 将它展开为普通 `BuyIngredients`：

1. 按服务日从早到晚展开菜谱原料总需求；
2. 用当前库存批次按 `lastUsableDay` FIFO 分配给各日；
3. 不把会在目标服务日前腐败的库存计入可用量；
4. 对每种原料购买剩余正短缺；
5. 不购买安全余量；
6. 冒险奖励在实际获得前不计入采购预测，获得后 D6 `buy(current)` 会扣除已有奖励库存。

数量为 0 的原料不进入命令；若全部原料短缺都为 0，`buy(...)` 展开为零条命令，不执行空的 `BuyIngredients`，也不消耗 AP 或体力。

`buy(...)` 是测试 driver 的确定性展开规则，不是玩家可见的“一键最优采购”游戏命令。展开后的完整命令 JSON 必须保存为 test fixture 并参与 snapshot review。

## 3. Reference 服务计划

缩写：P=粗麦根菜粥、B=麦酒面包、S=猎人肉炖锅、R=商旅香烤肉。数字为计划份数。

| 日        | `M1` 亲自/备菜1 | `M2` 亲自/备菜2 | `A1` 部分/备菜1 | `D1` 委托/备菜1 |
| --------- | --------------- | --------------- | --------------- | --------------- |
| D1        | P2 + S4         | S7              | P2 + S4         | P1 + S4         |
| D2        | P4 + S3         | S7              | P4 + S3         | P3 + S3         |
| D3        | P2 + S4         | B4 + S5         | P2 + S4         | P1 + S4         |
| D4        | P2 + S4         | P4 + R5         | P2 + S4         | P1 + S4         |
| D5        | P4 + B6         | P2 + R6         | P2 + S4         | P1 + S4         |
| D6 无线索 | P5 + B5         | P4 + S5         | S5              | P1 + S4         |
| D6 有线索 | P3 + B7         | P2 + S6         | S5              | P1 + S4         |

额外固定计划：

- `D0-Friday`：完全委托、备菜 0，P1 + B6；
- `A1-Sign-D6`：部分委托、备菜 1、带修好招牌 Buff，P1 + S5；
- `D2-NoClue-D6`：完全委托、备菜 2、没有线索，P1 + S4；
- `D2-Clue-D6`：完全委托、备菜 2、取得线索，P1 + S5。

这些计划故意不随预测寻找更优解。reference golden 与多种子测试都只能使用本文件第 10 节的固定映射，不能临时搜索更优菜单。

## 4. `strategy.cash_first`

生活方针：均衡。设施：舒适床铺。D5 完全不发起关系 StoryAction，保持 `relationship.pending`。

| 日  | 服务 | 上午/下午动作                     | 晚上服务前 |
| --- | ---- | --------------------------------- | ---------- |
| D1  | M2   | `buy(current)`、备菜2、休息1      | 无         |
| D2  | M2   | `buy(current)`、备菜2、休息1      | 无         |
| D3  | M2   | `buy(current+next)`、备菜2、休息1 | 无         |
| D4  | M2   | 备菜2、建舒适床铺                 | 无         |
| D5  | M2   | `buy(current)`、备菜2             | 无         |
| D6  | M2   | `buy(current)`、备菜2             | 无         |

## 5. `strategy.relationship_first`

生活方针：夜猫子。设施：舒适床铺。D5 选择一起修理。

| 日  | 服务       | 上午/下午动作                     | 晚上服务前 |
| --- | ---------- | --------------------------------- | ---------- |
| D1  | M1         | `buy(current)`、备菜1             | 无         |
| D2  | M1         | `buy(current)`、备菜1             | 无         |
| D3  | M1         | `buy(current+next)`、备菜1、休息1 | 无         |
| D4  | A1         | 备菜1、建舒适床铺                 | 休息1      |
| D5  | D0-Friday  | `buy(current)`、一起修理招牌      | 休息1      |
| D6  | A1-Sign-D6 | `buy(current)`、备菜1、休息1      | 无         |

## 6. `strategy.investigation_first`

生活方针：均衡。设施：冷藏柜。D5 选择准备包并调查。

| 日  | 服务         | 上午/下午动作                                            | 晚上服务前 |
| --- | ------------ | -------------------------------------------------------- | ---------- |
| D1  | M1           | `buy(current)`、备菜1、休息1                             | 无         |
| D2  | M1           | `buy(current)`、备菜1、休息1                             | 无         |
| D3  | M1           | `buy(current)`、备菜1、休息1                             | 无         |
| D4  | A1           | `buy(D4+D5+D6-clue)`、备菜1、建冷藏柜                    | 休息1      |
| D5  | D1           | 备菜1、选择准备包、`BeginAdventure`、`CompleteAdventure` | 无         |
| D6  | M2（有线索） | `buy(current)`、备菜2、休息1                             | 无         |

## 7. `strategy.full_delegation`

生活方针：均衡。设施：冷藏柜。D5 选择准备包并调查。这个稳定 ID 表示“每种委托模式一解锁就立即采用”：
D1 教学期仍亲自、D2 使用刚解锁的部分委托、D3 起才完全委托；它不绕过 Story 的教学与伙计 gate。

| 日  | 服务       | 上午/下午动作                                            | 晚上服务前 |
| --- | ---------- | -------------------------------------------------------- | ---------- |
| D1  | M1         | `buy(current)`、备菜1                                    | 无         |
| D2  | A1         | `buy(current)`、备菜1                                    | 无         |
| D3  | D1         | `buy(current)`、备菜1                                    | 无         |
| D4  | D1         | `buy(D4+D5+D6-clue)`、备菜1、建冷藏柜                    | 无         |
| D5  | D1         | 备菜1、选择准备包、`BeginAdventure`、`CompleteAdventure` | 无         |
| D6  | D2-Clue-D6 | `buy(current)`、备菜2                                    | 无         |

## 8. `strategy.two_closures_recovery`

生活方针：均衡。设施：舒适床铺。D5 主动放弃关系事件。

| 日  | 服务     | 上午/下午动作                     | 晚上服务前 |
| --- | -------- | --------------------------------- | ---------- |
| D1  | M1       | `buy(current)`、备菜1             | 无         |
| D2  | M1       | `buy(current)`、备菜1             | 无         |
| D3  | 计划停业 | 休息2、下午结束前声明停业         | 无         |
| D4  | A1       | `buy(current)`、备菜1、建舒适床铺 | 休息1      |
| D5  | 计划停业 | 放弃关系事件、下午结束前声明停业  | 无         |
| D6  | M2       | `buy(current)`、备菜2、休息1      | 无         |

D1/D2 故意不休息，使 D3 起始体力低于上限，两次休息都能合法提交并把计划停业转化为可见的恢复窗口。体力机械复核为：D1 `10 -1采购 -1备菜 -3亲自 +3夜间 = 8`；D2 `8 -1 -1 -3 +3 = 6`；D3 两次休息 `6→9→10`，停业并保持 10；D4 `10 -1采购 -1备菜 -1建造 = 7`，晚间休息到 10，部分营业后为 9，床铺夜间恢复到 10；D5 停业并保持 10；D6 `10 -1采购 -2备菜 = 7`，休息到 10，亲自营业后为 7。全程没有在满体力时休息，且四次营业均能支付体力成本。

## 9. `strategy.explicit_failure`

生活方针：均衡。设施：冷藏柜。D5 主动放弃关系事件。前两日同样只使用当日已解锁的最低参与模式，
从 D3 起连续停业并继续花费，制造一条合法而可解释的失败路线。

| 日  | 服务     | 上午/下午动作                    | 晚上服务前 |
| --- | -------- | -------------------------------- | ---------- |
| D1  | M1       | `buy(current)`、备菜1            | 无         |
| D2  | A1       | `buy(current)`、备菜1            | 无         |
| D3  | 计划停业 | 下午结束前声明停业               | 无         |
| D4  | 计划停业 | 建冷藏柜、下午结束前声明停业     | 无         |
| D5  | 计划停业 | 放弃关系事件、下午结束前声明停业 | 无         |
| D6  | 计划停业 | 下午结束前声明停业               | 无         |

## 10. 1,000-seed 固定展开

种子 `0x00000001` 到 `0x000003E8` 复用第 4–9 节的同一日程、动作顺序、营业方式、菜单与份数，不根据客流偏移改菜单，也不搜索最优解。唯一允许的状态分支是调查后的 D6 计划：

- `investigation_first`：`fact.war_clue=true` 时使用 M2 的“D6 有线索”行，否则使用“D6 无线索”行；
- `full_delegation`：`fact.war_clue=true` 时使用 `D2-Clue-D6`，否则使用 `D2-NoClue-D6`；
- 其余策略使用各表已经指定的无线索或专用计划。

D4 的 `buy(D4+D5+D6-clue)` 是在不知道骰点时做出的固定乐观采购承诺，不读取未来随机值；D6 的 `buy(current)` 再根据已提交结果、剩余库存和实际 D6 固定计划补足短缺。需求偏移只影响结算，不影响计划选择。

任何命令被拒绝后立即停止该轮，记录命令、原因和当时状态；在通过率统计中，该轮按“未缴税”处理，driver 不得切换备用动作。这样每个种子与策略只有一个命令序列和一个统计结果。

## 11. Golden artifact 规则

实现上述 driver 后，第一次运行生成：

- 完整命令 JSON；
- 每条命令后的 state digest；
- 每晚账本；
- 最终三个维度结果。

这些产物经人工复核后进入 `src/test/fixtures/golden/`。后续规则或数值改动必须显式更新 fixture 并说明原因，不能由测试自动接受新输出。
