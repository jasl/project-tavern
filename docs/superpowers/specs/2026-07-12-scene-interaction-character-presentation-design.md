# StageScene Interaction、角色呈现与内容成熟度等级设计

日期：2026-07-12

状态：设计与架构复核完成；Phase 2、Phase 4B 与 Phase 5 分拆计划的权威输入

适用范围：`@project-tavern/base`、`@project-tavern/ui`、Web Host、PoC/E2E Story 的场景呈现、角色渲染、交互和内容偏好

## 1. 目的

本文补充 Phase 2+ 运行时架构，解决以下已经确认、且会在 PoC 后继续复用的表现需求：

- 默认以酒馆、市集等地点及角色日常活动为主舞台；
- 同一地点可以因任意 Story 条件切换背景或布景，不把变体机制绑定到时间系统；
- 角色可以使用静态立绘、混合纸娃娃或未来的 Live2D renderer；
- 场景、角色和角色局部区域可以成为交互目标；
- 同一交互既可以播放演出，也可以打开 Overlay、进入 Narrative/VN，或者提交产生持久后果的 Gameplay Command；
- Story 可以提供可关闭的性暗示表现，同时保持同一 Artifact、Save、Replay 和 Gameplay Module 结构；
- 对有持久 Gameplay 后果的行为，鼠标、触摸、键盘、辅助技术、浏览器 E2E 和 AI Agent 使用相同的语义入口，而不是依赖坐标脚本；纯 Presentation 操作通过等价 DOM 入口测试。

本文不把具体角色关系、身体部位、台词、动画、好感变化或成人内容写进引擎。引擎只提供中性的场景、角色、命中、输入、路由和内容过滤机制；全部语义归 Story。

## 2. 与现有权威架构的关系

本文延续下列既有决定：

- `ResolvedGameV1.sceneGraph` 是由 resolved Presentation 产生的 Strict JSON 数据描述，不包含 JSX、函数或浏览器对象；
- Web-only renderer/contribution registry 位于 Story application closure；
- Gameplay State、规则、关系、Aura、Narrative 和命令属于 Story，不属于 Base/UI；
- UI 只消费不可变投影，通过 Story-specialized `SemanticGamePortV1` 提交正常玩法操作；
- Input 是 UI/Host 能力，不进入 Snapshot 或 Save；
- Pointer、键盘、辅助技术和 Automation 不得通过不同规则修改 Gameplay；
- 普通 Gameplay Command 和持久 Narrative 结果必须可重放，CommandLog 不记录浏览器坐标。

若本文与旧视觉包或 Phase 5 计划中的单一静态场景、单一角色图片假设冲突，本文优先。本文不改变已经确认的 Simulation、Session、Persistence、Digest 或 Story 所有权边界；Phase 2 必须先交付中性 descriptor/policy/SemanticPublication 合同，Phase 4B 再在冻结完整 ID catalog、GameView、Semantic actions、golden 和 Save fixtures 前纳入本文规定的表现 catalog 与既有行为映射。

## 3. 设计原则

### 3.1 场景优先

常态画面保留尽可能完整的地点和角色活动，只显示紧凑的顶部卡片 HUD、少量情境提示和必要入口。经营、地图、人物资料、设施、库存和保存等信息通过按需 Overlay 展示，不把主舞台长期改造成网页仪表盘。

### 3.2 命中不等于行为

HitMap 只回答“激活了哪个稳定目标”，不能携带 Story 回调、属性修改、关系规则或 Narrative 分支。Story 根据当前只读投影把目标解析为可用行为。

### 3.3 持久后果必须确定

会改变属性、好感、心情、Aura、边界记录、任务、Narrative 或未来可用内容的互动必须提交 Story Gameplay Command。纯 UI 导航和无持久影响的预览演出可以留在 application/presentation 层。

### 3.4 表现技术可替换

静态图片、混合纸娃娃、序列帧和 Live2D 都是 renderer 实现。Story 使用稳定角色、姿态、表情、外观、目标和演出 ID，不把 Gameplay 合同绑定到具体 SDK、图层文件名或 ArtMesh。

### 3.5 内容过滤不改变世界结构

运行时内容成熟度等级可以过滤入口、文本、素材和演出，但不能动态增删 GameplayModule、State Slot、Command 联合或 Rule。未来成人玩法若存在，必须在 bootstrap 时由独立 Story/模块组合决定是否装载。

### 3.6 权威状态的单向发布/提取路径

本文采用的是“权威状态的单向发布/提取路径”，不是整个运行时没有反馈的直线。完整的跨帧闭环为：

```text
OS/Pointer/semantic control
  → Input Adapter / HitTest
  → typed InteractionActivation / Semantic invocation
  → Story/GameSession FIFO
  → authoritative Gameplay State
  → Queries
  → atomic SemanticPublication { game, actions, revision, status }
  → RuntimePresentationView
  → Renderer
  → 下一次输入
```

单向的是写入权和源码依赖：Renderer 不反向修改 Story；任何有 Gameplay 意义的反馈只能以 typed invocation/command 回到 GameSession。Renderer 可以拥有 GPU handle、补间进度、粒子、相机平滑、hover 和 Live2D 物理等短命状态；这些状态不进入 Gameplay、Save 或每次 publication。animation-complete 只有在 Story 语义确实依赖它时才转为 typed input，否则由 renderer 本地处理。

Story/event tick 与 render frame 不要求 1:1。当前回合制 Web PoC 可以按提交发布；未来实时 renderer 可以消费最近一个完整 publication 并自行插值。`RuntimePresentationView` 是可重建、immutable、带 application presentation revision 的派生快照，但实现可以缓存和增量复用，不要求每帧深拷贝整个场景。

### 3.7 正交性与依赖 DAG

```text
Base neutral contracts
  ├─→ Story Gameplay → GameSimulation
  └─→ Story Presentation catalog → Resolved Presentation/SceneGraph

GameSnapshot.state
  → GameQueries
  → atomic SemanticPublication { GameView, action catalog }
          │
Resolved Presentation ─┐
ContentPreference ─────┼→ RuntimePresentationStore → Renderer
UI session state ──────┘

Pointer/Keyboard
  → Input Adapter
  → Stage hit-test / Interaction controller
      ├─→ Presentation intent → UI session state
      └─→ Semantic invocation → GameSession FIFO → next publication
```

必须保持：

- GameSimulation 不依赖 SceneGraph、Renderer、Input 或 ContentPreference；
- GameView 不依赖 Snapshot envelope、UI session state、Host preference 或 presentation asset ID；
- Semantic publication 的 GameView 与 action catalog 来自同一次 Queries 和 revision；
- RuntimePresentationStore 是允许的汇合点，但不能重新读取 Queries 或重算 Gameplay gate；
- Renderer 不读取 Gameplay State/Rules，也不构造 Story Command；
- domain 只依赖语义 ID/端口，不依赖屏幕坐标、StageScene node、素材文件名、纸娃娃层名或 Live2D 参数；
- ContentPreference 只改变表现或重复入口，不改变命中目标、奖励、Save 或唯一 Gameplay availability；
- SceneVariant 映射属于 Presentation/Application，不让 GameSimulation 导入 `StageSceneId` 或 catalog。

## 4. 所有权边界

### 4.1 Base 合同

`@project-tavern/base` 提供可被默认 Story/Headless closure 安全导入的中性 Strict JSON 合同和稳定 ID，例如：

- `StageSceneId`、`StageSceneVariantId`、`InteractionSurfaceId`；
- `CharacterId`、`CharacterRigId`、`CharacterPoseId`、`CharacterExpressionId`；
- `AppearanceLayerId`、`HitMapId`、`InteractionTargetId`、`InteractionBehaviorId`；
- StageScene/Character/HitMap 数据描述；
- 有序内容成熟度等级的安全整数类型、policy Schema 和 `ContentPreferencePortV1` 合同。

Base 不包含 React、DOM、PointerEvent、Live2D、PoC 角色 ID 或身体部位常量。

### 4.2 UI Runtime

`@project-tavern/ui` 提供：

- Stage、Character、Interaction 和 HUD 的通用 renderer registry；
- 静态/纸娃娃角色 renderer 的第一版实现；
- HitMap 命中检测和 Interaction InputContext；
- 互动模式的进入、退出、焦点、遮罩、输入优先级和可访问等价入口；
- Presentation-only intent 的受控路由；
- 内容成熟度等级过滤所需的通用 UI adapter；
- reduced-motion、静态降级和资源 fallback。

UI 不读取完整 Snapshot，不计算关系反应，不修改 Story State，也不硬编码 `head`、`face`、`chest` 等目标。

### 4.3 Web Host

`apps/web` 继续拥有 Pointer Adapter、Host preference storage 和浏览器生命周期。它负责保存玩家的内容成熟度等级偏好，并把 DOM Pointer 生命周期、去重和 viewport point 交给 Stage。Stage/renderer 负责 CSS transform、局部归一化坐标和 HitMap；Web Host 不理解 renderer 几何或命中的 Story 语义。

### 4.4 Story

每个 Story 拥有：

- 具体地点、StageSceneVariant、角色摆位和背景资源；
- 角色 rig、姿态、表情、外观层、HitMap 和 renderer contribution；
- `InteractionTargetId` 的具体含义；
- 可用行为、入口方式、文本、内容成熟度等级和禁用理由；
- 关系、心情、Aura、重复互动、边界记录和 Gameplay 后果；
- 动画、立绘差分、Overlay、Narrative/VN 和 Story-specific UI；
- 标准内容与可选内容的素材和演出 fallback。

E2E Story 只创建最小中性夹具验证引擎机制，不导入 PoC 角色、关系或内容成熟度语义。

## 5. StageScene 与 StageSceneVariant

### 5.1 StageScene 是地点或表现舞台身份

`StageSceneId` 表示稳定地点或表现舞台，例如酒馆主厅、市集或世界地图。它不是浏览器路由，也不等同于某张背景图片，更不能复用现有可保存 Narrative IR 中的 `SceneId`。Narrative `SceneId` 属于 Simulation/Story content identity；`StageSceneId` 属于 Presentation catalog。

### 5.2 静态 catalog、Gameplay 投影与运行时表现

`ResolvedGameV1.sceneGraph` 保存冻结的 StageScene、variant、rig 和 HitMap descriptor catalog。GameView 只输出玩家可见、与具体 renderer/asset ID 无关的 Gameplay read model；Application 的 Story-specific Presentation projector 再把该 read model 映射到 catalog 中稳定的 ID，并合并内容偏好和临时 UI session state，产生不可变 `RuntimePresentationView`：

```text
ResolvedGame.sceneGraph
  = frozen StageScene/variant/rig/hitmap descriptor catalog

Gameplay State
  → GameQueries
  → atomic SemanticPublication { GameView, Semantic action catalog }

SemanticPublication + resolved Presentation
+ ContentPreference + UI session state
  → immutable RuntimePresentationView

Renderer
  ← { viewSlice, semantic, presentation }
```

同一 StageScene 可以登记多个 `StageSceneVariantId`：

```ts
interface StageScenePresentationV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly backgroundAssetId: AssetId;
  readonly layout: StrictJsonObjectV1;
  readonly actors: readonly CharacterPlacementV1[];
  readonly interactionSurfaces: readonly InteractionSurfacePlacementV1[];
}
```

GameView 可以暴露时间段、天气、季节、剧情、设施、Aura、地点状态等玩家可见的 Gameplay read model；Story Application 的 Presentation projector 使用这些字段选择 variant。引擎不监听 Calendar，也不定义 morning/day/evening/night 枚举。GameView/GameSimulation 不导入 `StageSceneId`、variant catalog 或 asset ID，因此改变纯视觉映射不会改变 simulation digest。换装预览、互动模式等临时 UI 选择只进入 application-owned UI session state，不反向进入 GameQueries。

Web-only Presentation provider 只消费 atomic SemanticPublication、resolved catalog、内容偏好和临时 UI 状态，不能再次读取 GameQueries，也不能建立第二套 Gameplay availability 计算。若选择会改变可用 Gameplay 行为或未来结果，相关原因必须先成为显式 Story State/Query；Presentation 只投影结果，不能把 Gameplay 规则藏在背景选择器中。

### 5.3 切换与 fallback

- variant 切换不重建 GameSession，不推进 RNG 或 commandSequence；
- 背景切换可以使用短淡入淡出，并尊重 reduced-motion；
- 缺失资源按“同一 StageScene 登记的标准图片 fallback → code-native/CSS 占位场景”降级，不能留下透明但仍可命中的区域；
- DebugBundle 记录当前 StageScene/variant、内容成熟度等级和 renderer 状态摘要，以便还原视觉现场；
- 运行时选择另一个已登记 variant 只更新 `RuntimePresentationView`，不改变任何 Artifact identity；修改 catalog 数据、素材或布局才改变 presentation/application identity，且不改变 simulation identity。

## 6. 角色呈现与混合纸娃娃

### 6.1 中性角色描述

代表性合同如下，最终字段名在实施计划中冻结：

```ts
interface CharacterPresentationV1 {
  readonly characterId: CharacterId;
  readonly rendererId: string;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly activityId: CharacterActivityId | null;
  readonly appearance: readonly AppearanceLayerSelectionV1[];
  readonly hitMapId: HitMapId | null;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
}
```

`rendererId` 决定由静态图片、纸娃娃或未来 Live2D renderer 解释这些稳定 ID。SceneGraph 不包含组件、模型实例或动画回调。

### 6.2 第一版混合纸娃娃

第一版不制作完全自由组合的服装系统，但必须保留稳定的层和锚点合同。下列名称是 PoC Story-owned `AppearanceLayerId`，不是 Base 固定枚举：

```text
back_hair
costume_body       # 当前一套服装通常是一张完整合成层
face
front_hair
accessory
held_prop
foreground_effect
```

- 同一 rig 的所有层共享画布、原点、缩放和脚底 pivot；
- 表情、前后发、饰品和手持物可以独立替换；
- 当前服装主体作为一个合成层，避免 AIGC 对齐和遮挡失控；
- 未来出现真实需求后，可以增加 upper/lower/outer 等层，不改变角色、姿态和目标 ID；
- 特殊 CG 不强行复用纸娃娃层，可以作为独立 renderer/StageScene asset；
- 服装解锁、选择和持久化若进入某个 Story，就属于该 Story Gameplay；预览与图层合成属于 Presentation。当前七日 PoC 不新增持久换装，只使用固定 appearance 和无状态预览夹具。

### 6.3 Live2D 适配边界

第一版不引入 Live2D SDK、模型格式或运行时依赖。未来 adapter 负责：

- 把 Story pose/expression/activity/cue ID 映射到 Live2D 参数或 Motion；
- 把 Live2D HitArea/ArtMesh 名称映射到稳定 `InteractionTargetId`；
- 向通用 Input/Interaction 层报告命中结果；
- 提供静态 fallback，以便 reduced-motion、加载失败、测试和无 WebGL 环境使用。

Gameplay 和 Story 内容不得读取 Live2D 参数、帧、物理摆动或 SDK 对象。

### 6.4 角色与动画 fallback

- 角色 renderer 或关键图层失败时，先使用 Story 登记的兼容静态 pose fallback，再使用带可访问名称的 code-native 占位角色；
- 只有 fallback 与原 rig/pose 共享兼容局部坐标时才保留空间 HitMap，否则禁用空间命中，并保留等价的语义 DOM 行为入口；
- 动画、Motion 或 cue 缺失时保持新的 committed GameView 所指定的静态 pose/expression，不让 Gameplay 回滚或卡住；
- 背景继续使用 §5.3 的“标准图片 → code-native/CSS 场景”顺序；角色、背景和动画各自只使用已登记、可诊断的 fallback，不互相猜测资源。

## 7. HitMap 与 InteractionSurface

### 7.1 InteractionSurface 是通用机制

角色、门、柜台、市集摊位、地图节点和其他场景对象都可以提供 `InteractionSurfaceId`。Character HitMap 只是其中一种 renderer-specific 命中实现，不单独建立“触摸玩法引擎”。

### 7.2 HitMap 只描述空间

```ts
interface HitMapDescriptorV1 {
  readonly hitMapId: HitMapId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly targets: readonly HitAreaDescriptorV1[];
}

interface HitAreaDescriptorV1 {
  readonly areaId: HitAreaId;
  readonly targetId: InteractionTargetId;
  readonly shape: NormalizedRectV1 | NormalizedCircleV1 | NormalizedPolygonV1;
  readonly priority: NonNegativeSafeInteger;
}
```

- 坐标位于 renderer 的归一化局部空间，不进入 Gameplay；
- 重叠区域中较大的 priority 先匹配；priority 相同时，descriptor catalog 中较早声明的区域先匹配；
- HitMap 默认绑定 rig + pose，服装共用；改变轮廓或姿态时可以显式覆盖；
- 第一版只支持矩形、圆形和有界多边形，不使用像素遮罩或任意脚本；
- HitMap 不包含 `onClick`、命令、好感变化、内容成熟度等级或 Narrative ID。

### 7.3 两个正交的交互维度

目标语义与 surface 内的解析方式必须分开。`InteractionTargetDescriptorV1` 可以跨 surface 复用；`InteractionSurfaceTargetBindingV1` 才声明该 target 在当前 surface 中允许 direct/choose/open_surface 以及要打开的下一级 surface：

```ts
interface InteractionSurfaceTargetBindingV1 {
  readonly targetId: InteractionTargetId;
  readonly allowedResolutionModes: readonly InteractionResolutionModeV1[];
  readonly openSurfaceId: InteractionSurfaceId | null;
}
```

因此，同一个 `target.poc.heroine.figure` 可以在酒馆 Stage surface 中绑定为 `open_surface → surface.poc.heroine`，进入角色互动 surface 后再绑定为 `direct | choose`。`openSurfaceId` 不能放在全局 target descriptor 上，否则同一目标的两段交互会被误判为自环。

进入方式：

```text
surface_activation 激活角色或场景对象后进入互动模式
always_active      目标区域在当前 Stage Context 中直接有效
explicit_control   通过可见 UI 控件进入或直接选择行为
```

目标解析方式：

```text
direct             当前目标只有一个默认行为，立即激活
choose             当前目标有多个行为，显示选择面板
open_surface       只进入更具体的 InteractionSurface
```

这两个维度由 Story 当前投影决定，可以因 StageScene、关系、状态或玩法模式而改变。引擎不为整个游戏冻结唯一交互模式。

PoC 第一版默认采用：

```text
激活女主 → 进入互动模式 → 激活区域 → 直接执行默认行为
```

若区域存在多个行为则显示小型选择面板；同时保留 UI 按钮直接触发和未来 always-active renderer 的能力。

第一版最小合法矩阵为：

| 入口                 | 目标解析       | 预期结果                       |
| -------------------- | -------------- | ------------------------------ |
| `surface_activation` | `open_surface` | 激活角色后进入互动模式         |
| 互动模式中的目标     | `direct`       | 恰好一个默认行为时直接激活     |
| 互动模式中的目标     | `choose`       | 多个行为时显示选择面板         |
| `always_active`      | `direct`       | Stage 上直接命中并激活默认行为 |
| `always_active`      | `choose`       | Stage 上命中后显示选择面板     |
| `explicit_control`   | `open_surface` | DOM 控件进入互动模式           |
| `explicit_control`   | `direct`       | DOM 控件直接激活已投影行为     |

校验分为两层：

- 启动期校验 catalog 的 ID/shape 唯一性、静态引用、每个 surface 内的 target binding 唯一性、每条 binding 所声明的 `open_surface` 边及完整 surface DAG；跨 surface 复用同一 target 合法，缺失引用或真实循环以稳定 validation code 拒绝 ResolvedGame；
- 运行期校验当前 RuntimePresentationView 的 catalog join、mode 与行为 cardinality。`direct` 必须恰好投影一个默认行为，但该行为可以 disabled 并展示其原有原因；`choose` 必须投影至少两个有序行为；`open_surface` 必须指向当前可进入的已登记 surface。

运行期出现零行为、多个默认行为、无效 join 或不满足 cardinality 时，记录有界 Presentation fault、禁用该空间 surface，并显示可访问的 DOM fallback/禁用原因；不得修改 GameSession、伪造 Semantic revision、自动选择 Gameplay 行为或让异常穿透到其他 surface。

## 8. 从激活到 Story 行为

### 8.1 命中事件

Input/renderer 只产生中性的激活：

```ts
interface InteractionActivationV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly targetId: InteractionTargetId;
  readonly activationKind: "pointer" | "semantic_control";
}
```

`pointer` 覆盖鼠标、触摸和触控笔产生的 Pointer Event；`semantic_control` 表示通过已注册的 DOM/键盘/辅助技术等价入口激活，不尝试识别具体设备来源。`activationKind` 只用于 UI 反馈和诊断，不得改变 Story 规则。原始坐标、DOM node 和 PointerEvent 可以在 Web Adapter、Stage 与 UI renderer 边界内传递，但不能进入 GameView、RuntimePresentationView、Story provider、Gameplay Command、CommandLog 或 DebugBundle。

### 8.2 Story 投影行为

SemanticGamePort 从同一次 GameQueries 原子发布 GameView 和 action catalog。Application 的 Interaction projector 只能消费该 immutable SemanticPublication、resolved Presentation、内容偏好和临时 UI session state，再投影有序行为描述；StageScene/variant 也在该 Application 层选择，不进入 GameView：

- 稳定 `InteractionBehaviorId`；
- 玩家可见名称和说明；
- enabled 与有序 disabled reasons；
- 所需内容成熟度等级；
- direct/choose/open_surface 提示；
- 受控的 Presentation intent 或 Story-specialized Semantic invocation。

Gameplay 行为的 enabled、reasons、preview 和 invocation 必须直接复用同一 Semantic action catalog 中的 descriptor，不能由 Interaction projector 重新读取 GameQueries 或重算 gate。Story application/presentation registry 中的稳定 provider 不能作为函数塞进 Strict JSON SceneGraph，也不能读取 Snapshot、Owner capability 或任意 State path。

### 8.3 Presentation-only 行为

以下行为不改变 Gameplay，可以由受控 Presentation intent 完成，不写 CommandLog：

- 进入/退出互动模式；
- 打开人物资料、换装预览或其他 Workspace Overlay；
- 播放不影响状态的表情、立绘差分、短动画或音效；
- 打开没有选择、记忆或未来后果的纯 flavor 对话。

Presentation intent 是闭合联合，例如 open overlay、play cue、enter/leave surface；不能携带任意函数、脚本或 DOM 操作。

### 8.4 Gameplay 行为

以下情况必须通过 `SemanticGamePortV1` 提交 Story Gameplay Command：

- 增加亲密度、好感、默契、心情或其他属性；
- 记录每日首次互动、重复次数、冷却、边界或冒犯；
- 添加/解除 Aura、Memory、任务或 Narrative 状态；
- 解锁选项、服装、事件或结局条件；
- 进入含选择、检定、记忆或未来后果的 VN/Narrative。

混合行为先原子提交 Gameplay Command，再由新的 GameView/Narrative 投影选择表情、动画、台词或 VN。UI 不根据旧状态猜测成功反应，也不在命令提交前乐观修改关系表现。

若一次性反应不能从新的 committed GameView 稳定推出，Story 必须保存稳定 reaction token/sequence 或进入 Narrative；GameplayFact 不成为第二套 UI 状态 API。

### 8.5 重复互动与关系反应

“每天首次摸头增加亲密度”“连续点击后生气”“关系阶段不同产生惊讶、冷淡、厌恶或害羞反应”等全部属于 Story：

- Story Module 拥有必要计数、周期记录、Aura 或边界事实；
- Rule/Resolver 根据关系、心情、好感、当前 Aura 和历史求出结果；
- Command executor 原子提交结果；
- GameView 投影下一反应或 Narrative；
- 引擎只消除一次物理输入产生的重复浏览器事件，不替 Story 做行为冷却。

### 8.6 当前七日 PoC 的停止线

本文是 Phase 4B Task 1、7、8 以及 Phase 5 的输入。Phase 4B 冻结完整 ID catalog、GameView、Semantic actions、golden 和 Save fixtures；Phase 5 不得临时新增 State Slot、Command/Fact variant、Rule、Gameplay Action、持久计数或服装状态。

当前七日 PoC 的互动表现只能映射已经冻结的行为，例如采购、`action.old_trade_road`、`action.repair_sign_with_heroine` 和 `action.apologize_to_heroine`，或者执行不改变 Gameplay 的 Presentation intent。“每天首次摸头增加亲密度”、连续触摸计数、持久换装等效果是未来 Story 需求；若决定纳入七日 PoC，必须先显式修改 Phase 4A/4B、`docs/poc/**`、State/Command/Action catalog，并重生成 golden 与 Save fixtures。

## 9. Input、可访问性、Automation 与 Replay

### 9.1 多输入同语义

同一 Story 行为至少可以由以下入口到达：

- Pointer 命中区域；
- 互动模式中的可见 DOM 行为列表；
- 键盘焦点与原生激活；
- 辅助技术读取的名称、状态和禁用原因；
- 浏览器测试通过 role/name 操作等价 DOM 控件。

HitMap 本身不满足可访问性。每个当前可用目标/行为必须存在等价的语义 DOM 控件；不可只靠 hover、颜色或不可见像素区域传达信息。

### 9.2 输入优先级

Interaction 使用显式 InputContext，并继续遵守：

```text
System > Overlay > Narrative > Interaction > Gameplay
```

进入互动模式后，普通 Stage 热点不可穿透；退出、系统、保存和诊断仍保持可达。Pointer cancel、窗口失焦和 StageScene 替换必须安全退出临时 interaction state。

### 9.3 CommandLog 与调试

- CommandLog 原样记录 executor 实际收到的 `{ source: "game", command: StoryGameCommand }`；只有 Story Command 自身定义的领域 ID 才进入日志；
- 引擎不向 Story Command 自动附加 character、surface、target、behavior、坐标、设备或 activation source；
- 纯 Presentation intent 不进入 Gameplay CommandLog；
- authoritative Replay 从 replay base 重新执行日志中的 Story Commands，并比较 outcome、RNG 与 state digest；它不重放 Semantic invocation、HitMap activation 或 Presentation intent；
- ContentPreference 不参与 Replay；重放结束后，当前 Application 再按当前偏好选择表现 fallback；
- 激活来源如需诊断，只进入有界、非权威的 `DebugBundle.uiContext`。

Phase 5 可以扩展 strict、封闭的 `DebugUiContextV1`，记录当前 StageScene/variant、renderer、pose、appearance、interaction surface 和内容偏好摘要。每个数组、字符串和详情栈必须有明确上限；该上下文不进入 Snapshot/state digest、CommandLog 或 replay comparison。只有 presentation/application identity 匹配时才能用于静态视觉现场恢复，否则只是诊断摘要；不承诺恢复 Live2D 的精确物理帧。

Automation Bridge 继续只暴露正常 SemanticGamePort，不增加任意 UI/HitMap 执行接口。UI 导航和纯演出通过真实可访问 DOM 测试；持久 Gameplay 行为通过等价 Semantic invocation 验证。

## 10. 内容成熟度等级

### 10.1 有序整数而非 TypeScript numeric enum

内容成熟度等级使用可比较的安全整数，但不使用 TypeScript 原生 numeric `enum`。Base 提供品牌化非负安全整数、严格 Schema 和比较器，不提供固定名称。项目采用下列稀疏序数约定，Story definition 只登记自身实际支持的子集：

```ts
const projectContentMaturityOrdinalV1 = {
  standard: 0,
  suggestive: 100,
  sexual: 200,
  explicit: 300,
} as const;
```

中文含义固定为：`standard` 标准内容、`suggestive` 性暗示内容、`sexual` 性内容、`explicit` 露骨内容。间隔为未来插入等级保留空间；这些名称和值是项目约定，不是 Base ABI 枚举。

当前七日 PoC 只登记并交付 `standard`。E2E 可以用中性占位内容验证两个有序等级的机制，但不导入 PoC 或成人语义。`suggestive` 视觉探索先保存在 archive；后续 Story 若登记它，可以把 Story 默认 `maximumLevel` 设为 `suggestive`。`sexual` 和 `explicit` 只是未来保留序数，不代表当前 Artifact 包含对应素材、行为或玩法。

### 10.2 比较语义

内容和玩家偏好使用方向明确的字段：

```ts
interface ContentRequirementV1 {
  readonly requiredLevel: ContentMaturityLevelV1;
}

interface ContentPreferenceV1 {
  readonly maximumLevel: ContentMaturityLevelV1;
}

const allowed = requirement.requiredLevel <= preference.maximumLevel;
```

Story 为每个已登记等级提供稳定 ID、整数值、玩家可见名称和说明，并在 policy definition 上另行指定唯一的 `defaultMaximumLevel`。Schema 拒绝负数、非安全整数、重复 ID、重复值、未登记的 required/maximum value，以及不属于登记集合的默认值。

### 10.3 作用范围

内容成熟度等级可以控制：

- 某项纯 Presentation 行为是否投影为可用入口；
- 同一 Gameplay 行为使用哪个文本、素材或演出 variant；
- 重复 Gameplay 入口中哪些可见，但必须保留一个 `standard` 等价入口；
- 文本、表情、姿态、服装、CG、动画和音频 variant；
- 被当前 maximum level 排除的资源不得预加载；
- 当前场景是否使用标准替代表现。

`RuntimePresentationView` 先解析当前允许且实际需要的精确 `AssetId` 集合，AssetRegistry 再按这些 ID demand-load/preload。按 `scene` 等粗粒度组无条件预加载、再在 UI 隐藏资源不满足本合同。

内容成熟度等级不能控制：

- 运行时增删 GameplayModule 或 State Slot；
- 改变 Command/Fact Schema、simulation digest 或 state-contract identity；
- 成为唯一 Gameplay availability gate 或命令授权边界；
- 绕过关系、边界、任务或 Gameplay 条件；
- 让 UI 直接修改属性；
- 把第三方或成人内容自动加载进标准 Artifact。

任何 SemanticGamePort 中可用的 Gameplay invocation 都必须具有 `standard` 等价 DOM 入口；UI 与 Automation 继续看到相同的 Gameplay availability、preview、dispatch 和 rejection 语义。Host-only preference 不进入 GameQueries，也不能让 Application 建立第二套 Gameplay gate。若未来必须提供“关闭等级后完全不存在、且具有独特 Gameplay 后果”的行为，就必须先重新设计 Semantic projection 的受限 preference context、订阅、revision、Headless 默认值和 FIFO 前重检；当前合同明确不支持。

该整数轴只描述性内容成熟度，不复用为暴力、酒精、粗口、恐怖等独立内容分类。未来若需要过滤其他类别，增加正交的标签或独立轴，不扭曲此顺序。

### 10.4 Preference、Save 与 Replay

- maximum level 是按 Story 保存的普通 Host/player preference，不属于已封闭的 `debug_tools`、`cheats`、`automation_bridge` Runtime Capability，也不进入 Gameplay State、Snapshot、Save 或 simulation digest；
- 独立 `ContentPreferencePortV1` 提供 observe/subscribe/set 和 Story-scoped 持久化；preference 变化发布新的 application-owned Presentation revision 并重新生成 `RuntimePresentationView`，不重建 GameSession、不伪造 Semantic/GameView revision，也不改变 Module/State/Command 合同；
- DebugBundle 的有界 `uiContext` 记录有效 maximum level，便于诊断玩家看到的入口与素材；
- 已存在的 Save/CommandLog 不因降低等级失效；Replay 仍能执行已记录的合法 Story Command，当前 Presentation 使用允许的标准 fallback；
- 每个有 Gameplay 后果的行为都保留 standard 等价入口；Story 必须为影响主线理解或必要操作的内容提供 standard 文本/演出替代，不能因过滤造成死路；
- preference record 的值若因 Story policy revision 已不再登记，Host 使用 Story default、发出有界诊断，并等待玩家重新选择。

### 10.5 未来成人扩展

未来成人内容可以复用 StageScene、Character renderer、HitMap、Interaction、ContentPreference 和素材替换机制。独立成人玩法仍应由新的 Story/Gameplay Module 在 bootstrap 时静态组合，并拥有自己的内容、状态、命令和测试；不能靠把 maximum level 调高而在运行中的 GameSession 注入 Module。

## 11. 美术与素材合同

### 11.1 角色方向

女主设定年龄为 19 岁（明确成年）。目标气质是清纯、活泼、可爱、邻家感和少量自然笨拙；使用年轻成年比例、实用日常服装和自然姿态，不用暴露剪裁或夸张身体比例作为常态视觉卖点。

未来 `suggestive` 内容可以通过特定事件 CG、服装、姿态、距离、害羞或边界反应形成项目内部定义的轻度性暗示演出，但不对应或承诺任何平台的正式评级，也不包含当前范围外的露骨性行为。常态 Idle 和标准人物锚点保持健康、温馨并适合长期观看。当前七日 PoC runtime 只交付 `standard`，性暗示图仅作为 archive 中的未来方向探索。

美术语言提取为原创的克制欧式低魔、细腻线条、低饱和自然色、安静略带忧郁、半写实建筑材质和光照；不复刻现有动画的角色、服装、构图或可识别画面。

### 11.2 AIGC 一致性锚点

在生成大批场景前，先建立角色技术锚点：

- 正面、四分之三与必要侧面参考；
- 固定脸型、眼睛、发色、发型、身高比例和服装轮廓；
- 标准画布、脚底 pivot、头/肩/手等 rig landmark；
- expression：neutral、surprised、angry、shy 等有限基础表情；
- pose/activity：standing、working、idle 等有限基础姿态与活动；
- 第一套 costume_body、前后发和饰品的分层边界；
- 与首个 pose 对应的概念 HitMap，不把可视线条画进运行时角色素材。

后续背景、角色姿态和场景整屏稿以已选锚点作为参考输入。概念 UI 中的文本、数字、按钮和精确图标仍由 React/CSS/Lucide 实现，Image Gen 只提供视觉层级参考。

### 11.3 首批概念稿

首批视觉探索包括 1 组角色技术锚点和 7 张 16:10 整屏概念稿：

1. 女主角色与混合纸娃娃技术锚点；
2. 酒馆白日 Idle 主舞台；
3. 酒馆夜间/营业前 StageSceneVariant；
4. 女主互动模式与区域反馈构图；
5. 行动/经营 Workspace Overlay；
6. 小镇与周边世界地图；
7. 市集地点互动舞台；
8. 人物与关系资料 Overlay。

先生成角色锚点并选定人物身份，再以该锚点生成整屏概念稿；被采用的方向才拆成背景、角色图层和代码化 UI。所有图片先进入 `art-source/aigc/**` archive，不自动提升为 runtime asset，也不扩大当前七日 PoC runtime 的内容范围。

## 12. Phase 2/4B 集成与 Phase 5 分拆

Phase 2 在 Base 先交付 StageScene/variant/rig/HitMap/InteractionBehavior ID、Strict JSON descriptor、内容成熟度 policy Schema、ContentPreference observe/subscribe/set 合同、SemanticPublication 和原子 publication factory；E2E Story 登记最小中性 catalog，但不实现完整 PoC renderer。这样 Phase 4B 不反向创建引擎合同。

Phase 4B 登记 PoC StageScene/variant/rig/HitMap/behavior catalog，并保证 `createPocSemanticGamePortV1` 直接复用 `gameSimulation.projectGameView(queries)`；GameView 不包含 StageScene/asset ID。Task 8 的 semantic integration 证明 GameView 与 action catalog 由同一次 Queries/revision 原子发布，后续 Interaction 映射不形成第二套 gate。若不增加七日 PoC Gameplay，golden 和 Save fixtures 的命令序列保持原范围。

新增表现范围已拆成三个连续、可独立验收的 active plans，并已同步 roadmap/文档索引、supersede 旧的单份 Phase 5 plan：[`Phase 5A — UI Runtime Foundations`](../plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md)、[`Phase 5B — StageScene, Character & Story Presentation`](../plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md) 和 [`Phase 5C — Tooling, Automation & Acceptance`](../plans/2026-07-12-project-tavern-05c-tooling-automation-acceptance.md)。

### Phase 5A：UI Runtime Foundations

- AssetRegistry、PresentationReadPort 和 fallback；
- 七层 contribution registry、独立 GameSymbol registry、atomic SemanticPublication bridge；
- InputRouter、Pointer Adapter；
- GameShell、固定七层 Stage（background、character、scene interaction、HUD、workspace overlay、narrative、system）和顶部卡片 HUD slots；
- Overlay、VN、System、Persistence 和 recovery 基础；
- 1600×1000 最大 Stage、宽高比不超过 16:10、平板 reflow 和基础可访问性。

验收重点：中性 Base/UI/Web 边界、StageScene/HUD/Overlay/VN 层级、输入隔离、1024×768 与 768×1024 可用。

### Phase 5B：StageScene、Character 与 Story Presentation

- StageSceneVariant 和地点 renderer；
- CharacterPresentation、混合纸娃娃和静态 fallback；
- HitMap、InteractionSurface、进入/解析模式；
- ContentPreference 与 Story 表现过滤；
- PoC 酒馆 Idle、把采购投影为市集外观、把现有 WorldAction 投影为地图入口，以及现有关系行为的表现映射；这些都不增加地点 Gameplay；
- E2E 中性 interaction fixture；
- Story-owned Web application root 和视觉资源接入；
- 本阶段完成 Interaction 自身的键盘、触摸、等价 DOM 控件、焦点和输入隔离验收，不能拖到 5C。

验收重点：不同入口对有持久后果的行为复用同一 Semantic descriptor、换装不改变目标 ID、StageSceneVariant 不绑定时间、Phase 5 不新增 Gameplay、内容偏好不改变 Semantic availability。

### Phase 5C：Tooling、Automation 与完整验收

- DevDock、Debug/Cheat 控件和开发者备注；
- Automation Bridge 与等待协议；
- UI/Story browser E2E；
- 全局 accessibility、跨浏览器触摸/键盘、200% zoom、reduced-motion 回归矩阵；
- DebugBundle 的 StageScene/renderer/content preference 现场信息；
- 视觉回归和 Release 前 UI gates。

验收重点：同一 Artifact 在各 Runtime Capability 与内容偏好组合下可运行、Semantic/DOM parity、可访问等价入口、无坐标 CommandLog 和可复现调试包。

## 13. 必需测试

实施至少证明：

1. frozen catalog 与动态选择分离；StageSceneVariant 可以由任意 Story GameView 投影选择，Calendar 不是引擎依赖；
2. 运行时 variant 切换不重建 GameSession、不推进 RNG/commandSequence、不改变 Artifact identity；catalog 内容修改只改变 presentation/application identity；
3. SceneGraph、HitMap 和角色描述保持 Strict JSON，默认/Headless closure 不导入 `.tsx`、DOM 或 Live2D；
4. Web-only provider 不读取 GameQueries、不重算 Gameplay gate，renderer 只收到允许的 view slice、semantic 和 presentation；
5. 静态与纸娃娃 renderer 使用同一 Character/target ID；outfit 切换不改变默认 HitMap，pose override 可以显式替换；
6. rect、circle、polygon 命中成立；较大 priority 优先，同值时较早声明者优先；
7. §7.3 的七条最小合法路径全部通过；启动期缺失 surface/静态引用和 surface cycle 以稳定 code 拒绝；
8. 运行期零行为、`direct` 多默认、`choose` 少于两个和无效 catalog join 产生有界 Presentation fault、禁用空间命中并保留 DOM fallback；唯一 disabled direct 行为保持合法并显示原 Semantic reason；
9. Pointer（鼠标/触摸/笔）、键盘、可访问行为列表、直接 Semantic invocation 和 Automation facade 对同一个有持久后果的行为复用同一 availability、preview、dispatch、rejection 与 Story Command 结果；
10. Presentation-only 行为可以由 Pointer、键盘和等价 DOM 入口到达，但不推进 commandSequence、不写 CommandLog；
11. 一次物理操作只激活一次；Overlay/VN/System 不穿透；Pointer cancel、窗口失焦和 StageScene 替换清理临时 interaction state；
12. 属性、关系、重复次数和 Narrative 后果只通过原子 Gameplay Command 修改，Phase 5 不新增任何此类合同；
13. CommandLog 原样记录 Story Command，且不自动包含坐标、DOM、设备、surface、target 或 renderer 私有数据；Replay 不重放 Semantic/HitMap/Presentation intent；
14. 内容成熟度 Schema 拒绝负数、非安全整数、重复 ID/值、未登记 required/maximum 和非法 default；
15. requiredLevel ≤ maximumLevel 的比较、Story default、Host 持久化、运行时切换、资源预加载过滤和标准 fallback 正确；
16. ContentPreference 不进入 State/Snapshot/Save/digest，不改变 Semantic revision、Module/State/Command 合同或 Gameplay availability；
17. 内容偏好降低不产生主线死路，不破坏 Save/Replay；所有 Gameplay invocation 保留 standard 等价入口；
18. DebugBundle.uiContext 有界且非权威，identity 不匹配时只作诊断摘要；
19. E2E Story 用中性目标和中性等级 fixture 证明机制，且不导入 PoC 内容；
20. 1024×768、768×1024、1600×1000、2560×1080、200% zoom 和 reduced-motion 下互动仍可操作；2560×1080 时 Stage 宽度不超过 1600、宽高比不超过 16:10，并保持居中留白；
21. 背景、角色和动画分别按 §5.3/§6.4 的登记顺序 fallback；不留下透明但仍响应 Pointer 的幽灵热点，失去兼容空间坐标时仍保留语义 DOM 入口；
22. fake Live2D renderer contract test 可以映射 pose/cue/target，而无需引入真实 SDK。

## 14. 明确延后

- Live2D SDK、模型制作、物理参数和正式 Motion 管线；
- 完全自由组合的上衣/下装/内外层纸娃娃；
- 像素级 mask、复杂手势、拖拽、抚摸轨迹和多点触控；
- 运行时骨骼编辑、自由角色移动和 3D 点击检测；
- sexual/explicit 素材、行为、Gameplay Module 和商店发行策略；
- 通用公开 Mod 编辑器和第三方交互脚本沙箱；
- 把纯 Presentation intent 纳入 Gameplay Replay；
- 对 Live2D 精确动画帧或物理状态进行 DebugBundle 还原。

## 15. 决策摘要

- 互动是中性的 Stage/Character 目标激活机制，不是专用触摸玩法；
- 整体运行时是有 typed feedback 的 input→update→publish→render 闭环，权威状态只沿单向路径发布给 renderer；
- HitMap 只映射空间到稳定目标 ID，行为由 Story 强类型投影；
- Presentation-only 操作与 Gameplay Command 分离，持久后果始终可重放；
- SemanticPublication 原子包含同一次 Queries/revision 的 GameView 与 action catalog；
- StageSceneVariant 由 frozen catalog 和 Application Presentation projector 选择，不与时间绑定，也不进入 simulation digest；
- 第一版使用完整服装主体加少量可替换层的混合纸娃娃；
- Live2D 未来通过 renderer adapter 接入，不进入 Gameplay；
- 内容成熟度使用有序整数、Story policy definition 和 maximum-level 比较；
- 当前七日 PoC runtime 只交付 standard；suggestive 先作 archive 视觉探索，成人玩法未来静态组合；
- 内容偏好不能隐藏唯一 Gameplay 入口，也不能改变 Semantic availability；
- Phase 2 先交付中性表现合同；Phase 4B 冻结 PoC catalog 和既有 Semantic 映射；Phase 5 不新增 Gameplay；
- Phase 5 拆为 UI Foundations、StageScene/Character Presentation、Tooling/Acceptance 三个计划；
- 首批素材先建立角色锚点，再生成七张整屏场景/UI 概念稿。

## 16. 工程校准参考

- [Bevy `Extract`](https://docs.rs/bevy/latest/bevy/render/struct.Extract.html)：从 simulation `MainWorld` 只读提取到独立 RenderWorld，是本文 publication/extraction 边界最接近的公开先例；
- [Unity Entities system concepts](https://docs.unity3d.com/Packages/com.unity.entities%401.3/manual/concepts-systems.html)：默认区分 Initialization、Simulation 与 Presentation system groups，并用显式调度顺序和 command buffer 管理变更边界；
- [Godot signals](https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html)：说明事件/信号可以在不直接引用对象的情况下形成运行时反馈；也提醒简单游戏不必强制复制本项目的全部 projection 层；
- [React `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)：要求订阅外部 store 时提供 immutable/cached snapshot，支持 Web UI 消费 SemanticPublication/RuntimePresentationView；它只负责 React 集成，不驱动 Gameplay tick。
