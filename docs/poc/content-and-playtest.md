# 七日内容场景与试玩矩阵

状态：v0 非正史测试内容
目的：用最少人工内容覆盖全部关键系统，不作为正式剧本

## 1. 本周虚构前提

序章不制作正式演出。开局文字卡只说明：酒馆刚恢复营业，城镇要求周日缴纳 140 的重建税，伙计在第一天结束后可以代班。旧战友留下一个周五有效的调查机会；女主也计划在同一天下午修复酒馆招牌。

首轮不固定正式人名，角色显示名使用“你”“她”“旁白”。对白采用完整但克制的功能性文案，不留未完成标记或空白句；PoC 只验证信息、选择和状态差分，不评估正式文笔，正式剧本以后整体替换。

## 2. 稳定内容 ID

```text
week.poc_001

# PolicyId / CustomerSegmentId
policy.balanced
policy.night_owl
segment.locals
segment.travelers

# ModifierSourceId
modifier_source.reputation
modifier_source.war_clue

# ActorId / CharacterId
actor.player
actor.heroine
character.narrator
character.player
character.heroine

# Scheduler EventId（只表示实际候选事件）
event.tutorial_first_service
event.supplier_invoice
event.helper_available
event.facility_window
event.levy_due

# CheckpointId
checkpoint.tutorial_first_service
checkpoint.supplier_invoice
checkpoint.helper_available
checkpoint.facility_window
checkpoint.levy_due

# ActionId（只表示玩家主动发起的动作/机会）
action.choose_life_policy
action.purchase
action.prepare_food
action.rest
action.service_plan
action.advance_phase
action.pay_levy
action.facility_window
action.repair_sign_with_heroine
action.old_trade_road
action.apologize_to_heroine

# IngredientId / RecipeId / FacilityId / AuraId
ingredient.coarse_grain
ingredient.root_vegetable
ingredient.ale
ingredient.fresh_meat
ingredient.herb
recipe.grain_root_porridge
recipe.ale_bread
recipe.hunter_stew
recipe.traveler_roast
facility.cold_storage
facility.comfortable_bed
heroine.angry
tavern.sign_repaired
player.adventure_strain

# ChoiceId
choice.supplier_invoice.intellect_b
choice.supplier_invoice.pay_normally
choice.repair_sign.cooperate
choice.repair_sign.decline
choice.repair_sign.conflict
choice.old_trade_road.basic
choice.old_trade_road.prepared

# CheckId / WorldStepId
check.old_trade_road
step.old_trade_road.departure
step.old_trade_road.investigation

# SceneId
scene.manifest_start
scene.supplier_invoice
scene.facility_window
scene.levy_due
scene.repair_sign_with_heroine
scene.apologize_to_heroine
scene.old_trade_road.departure
scene.old_trade_road.investigation

# NodeId（entry/choice/可呈现节点可成为 active cursor；end 被同一命令解释为 completed + cursor=null）
node.manifest_start.card
node.manifest_start.end
node.supplier_invoice.choice
node.supplier_invoice.end
node.facility_window.notice
node.facility_window.end
node.levy_due.notice
node.levy_due.end
node.repair_sign.intro
node.repair_sign.choice
node.repair_sign.end
node.apology.line
node.apology.end
node.old_trade_road.departure.line
node.old_trade_road.departure.end
node.old_trade_road.investigation.line
node.old_trade_road.investigation.end

fact.war_clue
fact.tutorial_first_service_completed
fact.invoice_checked_this_week
outcome.relationship_opportunity
outcome.investigation
band.investigation.setback
band.investigation.success-with-cost
band.investigation.complete
band.investigation.exceptional
ending.stable
ending.danger
ending.failed_arrears

# ReasonId（本 Story revision 1 的封闭 authored reason 表）
reason.action.purchase
reason.action.prepare_food
reason.action.rest
reason.action.facility_build
reason.action.facility_skip
reason.recovery.balanced_night
reason.recovery.night_owl_night
reason.recovery.heroine_night
reason.service.manual
reason.service.assisted
reason.service.delegated
reason.service.closed
reason.service.emergency_closed
reason.ledger.purchase
reason.ledger.wage
reason.ledger.opening_fee
reason.ledger.revenue
reason.ledger.discarded_food
reason.ledger.spoiled_ingredient
reason.ledger.facility_build
reason.ledger.world_action_cost
reason.ledger.levy
reason.modifier.cold_storage_shelf_life
reason.modifier.comfortable_bed_player_recovery
reason.modifier.comfortable_bed_heroine_recovery
reason.modifier.reputation_demand
reason.modifier.war_clue_demand
reason.aura.sign_repaired
reason.aura.heroine_angry
reason.aura.adventure_strain
reason.event.tutorial_completed
reason.event.invoice_checked
reason.event.helper_unlocked
reason.obligation.levy_forecast
reason.relationship.repair_sign
reason.relationship.repair_sign_declined
reason.relationship.repair_sign_conflict
reason.relationship.apology
reason.investigation.begin
reason.investigation.setback
reason.investigation.success_with_cost
reason.investigation.complete
reason.investigation.exceptional
reason.ending.stable
reason.ending.danger
reason.ending.arrears
reason.ending.reputation_crisis
reason.unavailable.story_window_closed
reason.unavailable.relationship_resolved
reason.unavailable.investigation_resolved
reason.unavailable.mutually_exclusive
reason.unavailable.heroine_not_angry
reason.unavailable.facility_decided
reason.unavailable.tax_not_visible
reason.unavailable.policy_not_ready
reason.unavailable.service_mode_locked
reason.unavailable.helper_locked
reason.unavailable.intellect_b_required
reason.debug.state_override
reason.debug.cash_adjustment
reason.debug.aura_adjustment
reason.debug.narrative_jump
reason.debug.rng_override
```

这些 ID 一旦进入存档 fixture 不得重新赋予其他语义。`StorySourceIdentityV1` 固定为 `{ id: "week.poc_001", revision: 1 }`；`tavern-poc` 只是目录与 CLI/build key，不是 Save/Debug 中的 StoryId。上表同时收拢了散落在数值文档中的 Ingredient/Recipe/Facility/Aura spelling；对应数值仍以 `balance-v0.md` 为准，不能再创建第二套别名。

`event.*` 只用于实际参与 Scheduler 的 `StoryEventDefinitionV1`；玩家主动调用的 StoryAction、Facility opportunity 与 WorldAction 一律使用 `action.*`，不得为了复用名称而造一个无效果的伪 Event。D4 的 `event.facility_window` 只负责在进入窗口时通知并开放机会，提交建造/跳过时 `facility.choose.opportunityId` 必须是 `action.facility_window`。

Action presentation 与公开 command 的对应关系冻结如下；“提交窗口”用于 guard，“承诺占用”用于玩家确认，不能互相代替：

| ActionId                          | commandKind              | 提交窗口                  | 承诺占用          | directCommand / 参数来源                        |
| --------------------------------- | ------------------------ | ------------------------- | ----------------- | ----------------------------------------------- |
| `action.choose_life_policy`       | `policy.choose`          | morning                   | 无                | `null`；LifePolicy Overlay 提交强类型 PolicyId  |
| `action.purchase`                 | `inventory.buy`          | morning/afternoon         | 当前时段          | `null`；Purchase Overlay 提交 lines             |
| `action.prepare_food`             | `actor.prepare_food`     | morning/afternoon         | 当前时段          | 精确无参 command                                |
| `action.rest`                     | `actor.rest`             | morning/afternoon/evening | 当前时段          | 精确无参 command                                |
| `action.service_plan`             | `tavern.plan.set`        | morning/afternoon         | evening           | `null`；ServicePlan Overlay 提交 menu/mode      |
| `action.advance_phase`            | `calendar.advance_phase` | morning/afternoon/evening | 无                | 精确无参 command                                |
| `action.pay_levy`                 | `levy.pay`               | afternoon                 | 无                | 精确无参 command                                |
| `action.facility_window`          | `facility.choose`        | morning/afternoon         | 当前时段          | `null`；Facility Overlay 提交 build/skip choice |
| `action.repair_sign_with_heroine` | `story.action.start`     | afternoon                 | afternoon         | 精确 `{ actionId }`                             |
| `action.apologize_to_heroine`     | `story.action.start`     | morning/afternoon         | 当前时段          | 精确 `{ actionId }`                             |
| `action.old_trade_road`           | `world.action.begin`     | morning                   | morning/afternoon | `null`；WorldAction Overlay 提交 optionId       |

`run.start`、三条 `tavern.opening.*`、`world.action.complete` 与两条 `narrative.*` 是 Lifecycle/Opening/WorldAction/VN 专用 workflow controls，不进入通用 `StoryContent.actions`，其 `CommandPreview.confirmation` 为 `null` 或由专用已提交决策投影承载；DebugCommand 和 persistence operations 也不属于 Story Action。除此表外，revision 1 不允许实施时临时发明 ActionPresentation ID。

四种 ServiceMode 的 authored gate 冻结如下：manual 只要求 `calendar.day_at_least(D1)`；assisted 要求
`calendar.day_at_least(D2)` 且 `tavern.helper_tier_at_least(apprentice)`；delegated 要求
`calendar.day_at_least(D3)` 且同一 helper gate；closed 要求 `calendar.day_at_least(D3)`。day gate 使用
`reason.unavailable.service_mode_locked`，helper gate 使用 `reason.unavailable.helper_locked`；helper 未解锁时 tier 条件恒为 false。
D4 Facility Event 与 action availability 都使用
`tavern.facility_opportunity_undecided(action.facility_window)`，失败 reason 为
`reason.unavailable.facility_decided`。备菜每日次数上限由 Engine-owned guard 读取 `dailyPreparationLimit`，达到上限时
query/preview/execute 都返回带 `{ current, limit }` 的 `tavern.preparation_limit_reached`；这是 Engine rejection code 的
直接本地化，不伪造 authored ReasonId，也不能只在按钮上隐藏。
通用采购、备菜、休息与营业计划 Action 还都带 `calendar.day_at_most(D6)` gate，失败使用
`reason.unavailable.story_window_closed`，因此 D7 只保留推进到下午、缴税与 workflow controls；D7 afternoon 的
`calendar.advance_phase` 由 Engine 在 `levyDue` 以 `calendar.phase_blocked { blocker:"levy_due" }` 拒绝。
D2 的智力选项使用 `reason.unavailable.intellect_b_required` 作为必填 disabledReasonId，即使 reference 初始属性已经满足。
Action visibility 同步收束焦点：选择生活方针使用 reason `reason.unavailable.policy_not_ready` 的 authored conditions，
仅在 `run.started + run.status=setup + narrative.not_active` 时可见，
sequence 0、开局卡进行中和 policy 已选后都隐藏；普通经营动作仅在 active 的 D1–D6 可见；Facility 只在 D4 且 opportunity 未决定时可见；
修招牌/调查只在 D5 对应窗口且两条 Outcome 均未决定时可见；道歉只在 D6 且 `heroine.angry` 存在时可见；
缴税只在 D7 afternoon 可见。visibility 失败并不放宽安全守卫，直接构造命令仍由同一 gate 拒绝。
run/Narrative lifecycle guard 优先，因此直接提交 policy 的结果依次是：pre-Start `run.not_started`；manifest active
`command.blocked_by_narrative`；manifest completed 且 policy 为空时可提交；已选择后 `policy.already_chosen`。

关键 Action gate 的声明顺序冻结如下；query/preview/execute 都先按行内 visibility 顺序，再按 availability 顺序返回 reason：

| Action                            | visibility gates（顺序）                                                                           | availability gates（顺序）                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `action.facility_window`          | D4 morning/afternoon → `story_window_closed`；opportunity undecided → `facility_decided`           | 无 authored gate；资源用 Engine rejection          |
| `action.repair_sign_with_heroine` | D5 afternoon → `story_window_closed`；relationship outcome pending → `relationship_resolved`       | investigation not attempted → `mutually_exclusive` |
| `action.old_trade_road`           | D5 morning → `story_window_closed`；investigation outcome not attempted → `investigation_resolved` | relationship pending → `mutually_exclusive`        |
| `action.apologize_to_heroine`     | D6 morning/afternoon → `story_window_closed`；heroine angry present → `heroine_not_angry`          | 无                                                 |
| `action.pay_levy`                 | D7 afternoon → `tax_not_visible`                                                                   | run active；普通 lifecycle rejection 优先          |

表中的短名都指本节 closed ReasonId 的 `reason.unavailable.*` 完整值；不得为了隐藏按钮而改变直接命令的拒绝顺序。

五个 Scheduler Event 的 definition 冻结如下；priority 是普通整数，只决定候选排序，不会静默吞掉另一个 blocking request：

| EventId                        | EventTrigger / context                         | CheckpointId                        | Priority | Scene                    | Conditions / effects                                                                                                                     |
| ------------------------------ | ---------------------------------------------- | ----------------------------------- | -------: | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `event.tutorial_first_service` | `command.succeeded`, `tavern.opening.finalize` | `checkpoint.tutorial_first_service` |      400 | `null`                   | 仅 D1 且教学 Fact 为 false；effects-only 设置 `fact.tutorial_first_service_completed=true`，正式 Story 的三个 Opening checkpoints 仍为空 |
| `event.supplier_invoice`       | `phase.entered`, D2 morning                    | `checkpoint.supplier_invoice`       |      400 | `scene.supplier_invoice` | 本周尚未处理账单；选择节点负责确定性智力门槛、账本与 Fact，Event 本身无直接 effect                                                       |
| `event.helper_available`       | `day.ended`, days=[D1]                         | `checkpoint.helper_available`       |      300 | `null`                   | effects-only 设置 helper `{ unlocked:true, tier:"apprentice" }`；conditions 读取 post-transition candidate                               |
| `event.facility_window`        | `phase.entered`, D4 morning                    | `checkpoint.facility_window`        |      300 | `scene.facility_window`  | 尚无 `action.facility_window` decision；Scene 只通知，实际 build/skip 仍由 `facility.choose`                                             |
| `event.levy_due`               | `phase.entered`, D7 morning                    | `checkpoint.levy_due`               |      400 | `scene.levy_due`         | run 未 terminal；Scene 只说明下午缴税，金额/预测继续来自 Obligation projection                                                           |

`event.tutorial_first_service` 与 `event.helper_available` 是非阻塞纯效果；另外三个各自只在唯一窗口产生一个 blocking Scene。Reference driver 每次 `calendar.advance_phase` 后都先检查 Narrative projection：若 Scheduler 建立了上述无选择 Scene，就反复提交 `narrative.advance` 至结束；D2 的 choice Scene 按本文件既定 ChoiceId 处理。这样 D4/D7 不会因为未排空通知而软锁，且同一命令从不依靠 priority 覆盖另一个 Scene。

Story 状态定义同样是封闭的：三个 Fact 都是默认 `false` 的 boolean；`outcome.relationship_opportunity` 是 StoryToken，允许 `relationship.pending | relationship.completed | relationship.abandoned | relationship.reconciled | relationship.unresolved_conflict`；`outcome.investigation` 是 StoryToken，允许 `investigation.not_attempted | investigation.missed_by_choice | investigation.setback | investigation.success_with_cost | investigation.complete | investigation.exceptional`。各 Outcome 的第一个值是新局默认值。四个 `band.investigation.*` 是 CheckBandId，只标识 2D6 命中区间；每个 band 的受限 effects 再把 `outcome.investigation` 设为对应 StoryToken，不把 OutcomeId 当成检定档位 ID。

上面的 ReasonId 与 ModifierSourceId 表同样是 closed content，不是示例前缀。ActionCost、LifePolicy/女主夜间恢复、四种 ServiceMode、WorldAction、Facility skip、closure、ledger bindings、Modifier、EffectIntent、Ending 与 AvailabilityGate 必须从表中引用；实现时不得临时拼接新 reason/source。需求解释中的人气与战争线索贡献分别使用 `modifier_source.reputation` + `reason.modifier.reputation_demand`、`modifier_source.war_clue` + `reason.modifier.war_clue_demand`。税负 Forecast policy 使用 `reason.obligation.levy_forecast`，并按 Story 顺序声明五条建议：`current_gap` 使用“亲自营业”（关联 `action.service_plan`）、“选择廉价菜单”和“停止采购过量”（后两者 actionId=null）；`committed_plan_conservative` 只显示“本晚计划已锁定，结算后复核”的 null-action 说明；`final` 只显示“将本周账本用于下轮调整”的 null-action 重玩建议。不可执行阶段绝不返回已锁定/已隐藏的 ActionId。多个效果可以共享一个语义准确的 ReasonId，但 `ChangeReasonV1` 必须保留该 reason 及 StoryAction/WorldAction/Event 等 provenance，UI 才能解释“为什么变化”。

## 3. 每日内容

### D1 周一：第一次完整营业

开放：采购、备菜、休息、菜单、亲自营业。

- 客流预测显示精确值；
- 引导玩家采购一套足够但不过量的原料；
- 强制展示“潜在客流 → 有效订单 → 计划份数 → 销量”；
- 第一次结算逐项解释采购、收入、未售成品和体力；
- 完成后将 `fact.tutorial_first_service_completed` 设为 `true`。

教学不能替玩家自动选择唯一正确菜单；它可以标出一套安全方案，并允许玩家自行修改。

### D2 周二：门槛不是概率

开放：部分委托、`±1` 客流预测、供应商账单事件。

- `[智力 B]` 选项明确标为满足后直接生效；
- 账单事件在 D2 上午进入后、其他行动前阻塞展示，选择不消耗 AP；
- 不显示百分比，不掷骰；
- 事件结束后账本显示节省 4 现金的原因；
- UI 首次允许复制昨日采购与菜单计划。

### D3 周三：自动化与税负

开放：完全委托、计划停业、周日税负义务卡。这里只显示税额、当前现金与缺口，不预测未来收入。

- 伙计只以简短背景说明出现；
- UI 对比四种营业方式的确定成本与容量；
- 委托释放的晚上 AP 仍由玩家决定如何使用；
- 不添加伙计好感、装备、排班或个人事件。

### D4 周四：经营设施还是生活设施

开放一次施工窗口：

- 冷藏柜；
- 舒适床铺；
- 放弃施工。

`event.facility_window` 是 Scheduler 通知；三个选项都通过 `facility.choose { opportunityId: "action.facility_window", choice }` 提交并永久记录本次决定。

预测展示各自能改变的具体批次到期日或未来三晚恢复量。建造后开发者面板和账本都能指出设施贡献。

### D5 周五：明确放弃一条支线

上午展示两个机会及其互斥关系：

- 旧贸易路线调查：占上午和下午；
- 与女主修理招牌：占下午。

确认任一选项前，界面写明另一机会本周失效。调查使用 WorldAction `action.old_trade_road`；关系事件使用 StoryAction `action.repair_sign_with_heroine`。选择调查后，下午不能再次打开关系事件；进入下午后调查失效。关系事件中只有 `choice.repair_sign.cooperate` 消耗 2 AP，`choice.repair_sign.decline` 与 `choice.repair_sign.conflict` 不消耗 AP，但都会提交关系事件结果。

调查在调用 `world.action.begin` 前必须从 `choice.old_trade_road.basic` 与 `choice.old_trade_road.prepared` 中选择一个 option；没有独立的准备命令。两步演出依次为 `step.old_trade_road.departure` / `scene.old_trade_road.departure` 与 `step.old_trade_road.investigation` / `scene.old_trade_road.investigation`，最终只有一次 2D6。关系事件包含合作、无惩罚放弃和冲突三种选择。冲突只为验证`生气`，不是鼓励玩家选择负面内容。

### D6 周六：后果回流与恢复窗口

- `fact.war_clue=true` 时令旅客 +2，并在客流预测中说明来源；
- 冒险获得的原料进入正常库存和 FIFO；
- 修好招牌的 Buff 影响下一次亲自/部分营业；
- 女主生气时显示容量与默契影响；
- 可通过 StoryAction `action.apologize_to_heroine` 花 1 AP 道歉；
- 当晚计划提交后计算保守税后余额；计划锁定后只解释本晚风险，营业后升级为最终精确结果与下轮调整建议，不再返回已经无法执行的本周行动。

### D7 周日：店休、税负与三维总结

没有营业。总结分三栏：

- 酒馆：稳定、危险或欠税失败；
- 关系：`relationship.pending` 表示玩家未参与该可选关系事件，显示“维持经营伙伴”；`relationship.completed | relationship.abandoned | relationship.reconciled | relationship.unresolved_conflict` 分别显示为完成、主动放弃、和解或未处理冲突；
- 调查：`investigation.not_attempted | investigation.missed_by_choice` 都显示为未进行，但保留不同原因；`investigation.setback | investigation.success_with_cost | investigation.complete | investigation.exceptional` 分别显示为受挫、带代价、完整或卓越。

展示现金总账、腐败/报废、六晚营业方式、每次服务实际提交的 AP/双方体力消耗和关键选择；这些玩家总结来自持久 `serviceHistory`，不依赖可能被裁剪的调试 CommandLog。被拒绝命令、浪费 AP 等只属于本节自动化指标与 Developer 诊断，不伪装成可从任意终局 Save 恢复的玩家历史。存档面板在 D7 仍完整展示四个物理 Slot：

- 读取 `auto.current`；当 current 缺失或损坏时，只将通过完整验证的 `auto.previous` 显示为需玩家确认的 recovery candidate，不静默回退；
- 写入或读取独立的 `quick` Slot；
- 写入或读取独立的 `manual` Slot；
- 导出诊断 JSON；
- 使用相同或新种子立即重开。

## 4. UI 最小流程

每个时段使用同一个中央 GameStage：

1. 顶栏显示周几、时段、AP、双方关键体力、现金、人气和税负预测；
2. 当前场景、角色和轻量行动入口位于主舞台；
3. 本周义务、库存、菜单、预测、营业账本和周总结使用舞台内 Overlay；
4. 事件与选择使用 VN Layer；
5. 左右开发者侧栏只在 Developer flavor 中由 Bug 按钮呼出，不承载玩家必需信息。

营业结算使用舞台内的逐层账本 Overlay。完整布局、触摸和平板契约以 Harness 规格为准。

## 5. 六个策略验收画像

这里说明每种策略想验证什么；唯一的动作、菜单和采购输入由 `reference-strategies.md` 定义。它们是自动化 golden scenarios，也是人工试玩建议，不要求玩家照做。

### `strategy.cash_first`

- 均衡生活；
- 六晚亲自营业；
- 前三日主动休息，建床后用额外恢复支撑最后两晚；
- 建舒适床铺；
- 不参加周五侧线。

验证：高劳动是否换来明显现金和默契，而不会因操作密度无法完成。

### `strategy.relationship_first`

- 亲自、部分和周五完全委托的固定组合；
- 建舒适床铺；
- 周五修招牌；
- 正常经营周五晚上。

验证：关系投入是否回流经营，但不会同时给出全部最高收益。

### `strategy.investigation_first`

- 亲自/部分委托混合；
- 建冷藏柜；
- 周五选择准备包并调查；
- 周五固定完全委托，周六固定亲自营业；
- 周六利用情报客流和冒险原料。

验证：离店成本是否由后续经营收益部分补偿。

### `strategy.full_delegation`

- D1 亲自、D2 部分委托，D3 起在解锁后立即完全委托；
- 白天只做必要采购和有限备菜；
- 选择准备包并完成调查侧线；
- 建冷藏柜。

验证：渐进自动化能否完成但接近税线，且解锁后释放的时间确实有价值。

### `strategy.two_closures_recovery`

- 两晚计划停业；
- 其他四晚按固定亲自/部分组合；
- 不作过量采购；
- 最后两天执行恢复计划。

验证：短期失误或主动休息不是必然毁档。

### `strategy.explicit_failure`

- D1 亲自、D2 部分委托、之后四晚停业；
- 仍购买设施或过量原料；
- 忽略税负预警。

验证：失败可在周五预见，并能由现金账本解释。

## 6. 自动化指标

每轮记录：

- 每日开盘、采购后、营业后、日终和税后的现金；
- 每种原料采购、使用、腐败数量与价值；
- 每道菜计划、订单、销量和报废；
- 两客群客流、菜单吸引、容量损失与缺货；
- 四种营业方式次数；
- 每日玩家必要确认次数与总命令数；
- AP 被浪费、体力阻止命令和主动休息次数；
- 人气、默契、好感、心情变化；
- Aura 应用、解除和自然到期；
- 事件选择、检定输入、骰点和结果；
- 读档次数与是否改变未来结果；
- 最终三个维度的结果。

## 7. 人工试玩问题

结束后只问可由体验回答的问题：

1. 本周最重要的压力是什么？
2. 你主动放弃了什么，为什么？
3. 哪个数字或状态最难理解？
4. 你认为哪种营业方式永远不值得选？
5. 哪一次操作感觉是在重复昨日劳动？
6. 结算页能否说明你为什么赚到或损失了钱？
7. 如果再玩一轮，你会换哪种策略？

不要用“好玩吗”替代具体观察。

## 8. Stop rules

出现以下情况时停止加内容：

- 同种子同命令产生不同结果；
- 账本与最终现金、库存对不上；
- UI 或 React 组件直接改模拟状态；
- 普通事件需要新增任意脚本执行能力；
- Aura 开始承载现金、关系阶段或主路线；
- 亲自营业在现金、时间、关系三方面同时严格最优；
- 完全委托不管释放时间做什么都无法成为合理策略；
- 新玩家通过把所有按钮依次点完即可完成全部内容；
- 两次普通失误就不可恢复；
- 每日需要重新确认超过三类常规决策；
- 玩家无法从结算解释主要盈亏；
- 为解决无聊而提出的答案连续两次都是“再加一个系统”。

先修核心循环、信息或自动化；仍无法改善时，允许砍掉行动点、体力或某个经营步骤，而不是维护沉没成本。
