# 首批 Web 视觉包与 Image Gen 基线

日期：2026-07-12

状态：独立先行素材准备轨道；当前视觉方向；尚无图片提升为运行时素材

适用范围：React 运行时的 StageScene、角色呈现、HUD、VN、Workspace Overlay 与七日 PoC 视觉探索

> 本文属于工程 Goal 之前的独立素材轨道。Image Gen、人工筛选、风格/一致性与采用决定不进入 Phase 2–6 Goal；Goal 只消费启动时已经批准并提升的 runtime assets，并对所有缺失槽位保留完整 code-native/static fallback。素材轨道可以先行但不要求一次完成全部槽位。

## 1. 目的

首批视觉包不是正式美术生产，而是为可点击 PoC 建立一套可反复生成、比较和淘汰的视觉锚点，用来验证：

- 场景优先的 SLG/Idle 构图是否能长期承载经营、陪伴和轻量互动；
- 顶部卡片 HUD、舞台、Workspace Overlay 和 VN 之间的信息层级；
- 女主在日常活动、关系反应和换装预览中的身份一致性；
- 1600×1000、平板横屏和竖屏重排下的素材安全区；
- AI 素材能否通过固定角色锚点、场景几何和差分策略维持一致性。

Image Gen 只负责栅格场景、人物、物件与整屏概念稿。React、CSS、Radix、Lucide 与 `GameSymbol` 负责实际 HUD、文字、按钮、表格、焦点环和系统图标。整屏概念稿只作构图参考，不切图成为运行时控件。

商业游戏截图和本地 `references/` 只由人观察并归纳布局、信息密度与交互模式，不作为生成输入，也不要求复刻具体作品的角色、构图或画风。

## 2. v2 视觉语言

总体方向是克制的日式低魔幻想插画：安静的生活感、清晰的动画式人物设计、较细腻且略偏写实的欧洲中世纪场景。吸收“淡雅配色、自然光、旅行与日常并存、不过度装饰”的抽象特征，不模仿任何具体动画、画师或现成角色。

- 场景材质比人物更写实：木材、灰泥、粗布、石板、旧铜和食物保留细小磨损与自然纹理；
- 人物保持清晰轮廓、克制赛璐珞明暗和柔和面部塑造，不使用厚重 3D 塑料质感；
- 色彩以低饱和自然色为底，日间使用清冷天光与暖木色，傍晚使用灯火和窗外蓝调形成冷暖对比；
- 小镇可见战后重建痕迹，但常态氛围温暖、有生活秩序，不做糖果色童话或压抑黑暗奇幻；
- 不出现 Logo、水印、现代物件、可读虚构文字或无法由代码替换的 UI 文案；
- 基础运行时素材不要求任何受限内容 flag：自然、非性化的日常服装与姿态；未来 `suggestive` 研究稿只进入 archive，不随当前 PoC 打包。

代码化 UI 的基准 token：

| 角色            | 基准色    | 用途                   |
| --------------- | --------- | ---------------------- |
| `ink-950`       | `#171B26` | 舞台遮罩、深色面板     |
| `ink-800`       | `#283043` | 面板与顶部 HUD         |
| `parchment-100` | `#EEE5D2` | 主文字与浅色详情面     |
| `brass-500`     | `#C69A57` | 边框、选中态、重要资源 |
| `amber-500`     | `#D8863B` | 行动与暖光强调         |
| `sage-500`      | `#66877A` | 正向、恢复与生活设施   |
| `danger-500`    | `#B95E55` | 风险、拒绝与危机       |

界面动画只用于 Overlay 进入、背景 variant 淡变、VN 文本切换、资源变化和 Aura 提示，基准 160–240 ms，并尊重 `prefers-reduced-motion`；这里不指定或暗示任何动画库。

## 3. 舞台与 UI 构图合同

逻辑画布为 1600×1000，背景母版为 2560×1600，均为 16:10。4:3 核心安全区：

| 画布      | 4:3 安全区               |
| --------- | ------------------------ |
| 1600×1000 | `x=133..1467, y=0..1000` |
| 2560×1600 | `x=213..2347, y=0..1600` |

常态画面以酒馆、市集、世界地图和女主的日常活动为主体。顶部信息以若干紧凑卡片横向排列；中部尽量保留完整舞台；详细库存、采购、设施、人物资料和结算使用覆盖舞台的 Workspace Overlay；VN 使用底部对话框和阻塞选择层。

遮挡与交互预留：

- 顶部卡片 HUD：逻辑 `y=0..96`；
- VN 对话区：逻辑 `y=720..1000`；
- 轻量行动/互动入口：逻辑 `x=1240..1560, y=120..700`；
- Workspace Overlay：逻辑 `x=220..1380, y=110..920`；
- 女主默认脚底 pivot：逻辑 `(1060, 930)`，角色主体必须留在 4:3 安全区；
- 门、柜台、壁炉、摊位、地图节点和招牌不能只存在于 16:10 两侧裁切区。

1024×768 使用完整舞台缩放与轻微重排；768×1024 使用竖屏重排，不把 16:10 背景强行拉伸。超宽屏居中显示最大 1600×1000 舞台，外围填充不可交互。

背景 variant 是普通 Presentation 选择，不绑定引擎时间系统。同一酒馆可以由时间段、天气、剧情、调试夹具或纯 UI 预览选择日间/傍晚版本；切换只替换背景/光照和表现数据，不推进游戏时间。

## 4. 女主角色锚点

女主明确为 19 岁成年女性。气质关键词是清纯、活泼、可爱、邻家感，以及一点做事不够熟练的笨拙；她首先是共同经营酒馆的生活伙伴，而不是为展示身体而设计的成人角色。

固定身份特征：

- 栗棕色及肩发、低侧辫、灰绿色眼睛；
- 年轻但明确成年的自然脸型，健康普通的少女身材，不幼态化、不夸张胸腰臀；
- 日常工作服为灰蓝长袖上衣、深蓝及踝裙、米色实用围裙、窄皮带和耐磨短靴；
- 表情基线为自然、专注、开心、惊讶、害羞、生气/冒犯后冷淡；
- 动作强调擦桌、记账、端盘、整理食材、读信、休息等日常活动；
- 基础姿态不使用刻意挺胸、扭臀、内衣外露或成人写真式镜头。

当前角色锚点必须固定脸型、瞳色、发型轮廓、身高比例、手脚比例、主服装配色、画布、视角、光向和脚底 pivot。后续差分优先通过表情、手部动作、手持物和有限外观层修改，不能每张图重新设计一个“相似人物”。

未来项目内部以“约 PG-17”描述的 `suggestive` 表现可以研究睡衣、雨后湿发、围裙差分、近距离害羞反应等不露骨内容；这不是任何商店或评级机构的正式分级承诺。它们必须有零 requirement 的替代表现、独立内容 flag 和明确开关，不能假定与暴力、血腥等其他特征存在大小关系。当前批次只生成不要求受限 flag 的锚点。sexual/explicit 内容与独立成人玩法不属于本视觉包。

## 5. 混合纸娃娃与换装准备

第一版采用“完整服装主体 + 可替换小层”的混合纸娃娃，不追求任意上衣/下装自由组合。所有层共享同一画布、原点、缩放和脚底 pivot：

```text
back_hair
costume_body
face
front_hair
accessory
held_prop
foreground_effect
```

- `costume_body` 是当前姿态下的完整身体与服装合成层，减少 AIGC 遮挡错误；
- 表情、前后发、饰品、手持物和前景效果可以单独替换；
- 换装预览属于 Presentation UI；未来若服装解锁、持有或选择需要保存，再由 Story Gameplay 定义；
- 第一版 HitMap 只为完整人物登记一个 `target.poc.heroine.figure`，不预设头、胸、臀等身体部位；
- 后续 Live2D adapter 仍使用相同 Character/pose/expression/target ID，不把模型参数暴露给 Gameplay。

用于生成差分的角色源图应尽量使用透明背景、完整身体、无遮挡轮廓和固定镜头。整屏概念稿中的人物可以与场景合成，但不能反过来作为纸娃娃切层母版。

## 6. 首批 v2 概念图清单

先生成并人工确认一个身份/风格锚点，再基于它产生七张整屏概念稿。锚点不通过时，不批量扩散错误身份。

### 6.1 一个锚点

`concept.v2.anchor.heroine-and-tavern-direction`

- 一张 16:10 技术/美术方向板，包含女主正面、四分之三和必要侧面参考，以及一个日间酒馆材质/光照小景；
- 固定完整 19 岁角色的脸型、比例、主服装、脚底 pivot、发型前后层和有限表情方向；
- 展示木材、灰泥、旧铜、布料、自然天光和整体色板，人物与环境必须像属于同一个项目；
- 不含 HUD、说明文字、按钮或可读招牌；分栏只用干净留白和不可读标记；
- 为后续透明角色差分、干净背景和整屏概念稿提供唯一身份/风格参考。

### 6.2 七张整屏视觉稿

1. `concept.v2.screen.tavern-idle-day`：日间酒馆 Idle 舞台、顶部卡片 HUD、女主做日常工作、轻量操作入口；
2. `concept.v2.screen.tavern-idle-evening`：相同几何的傍晚 variant，用灯火/窗外蓝调证明背景可切换；
3. `concept.v2.screen.heroine-interaction`：激活女主后的互动模式、人物整体目标反馈和等价行为列表；
4. `concept.v2.screen.workspace-overlay`：舞台仍隐约可见，前景为采购/库存类大型 Overlay 和详情层；
5. `concept.v2.screen.world-map`：小镇、旧贸易路线和周边地点组成的低魔幻想地图；
6. `concept.v2.screen.market`：贸易小镇市集，采购入口与摊位交互节点；
7. `concept.v2.screen.character-profile`：人物资料与换装预览 Overlay，展示混合纸娃娃层的产品形态。

整屏稿中的 UI 文本只允许不可读占位或由后期代码叠加；最终实现不从图片中裁切控件。每张稿都要检查 4:3 安全区、顶部 HUD、底部 VN 和 Overlay 遮挡。

## 7. Phase 4B 冻结的 Asset ID 与归档关系

稳定运行时 Asset ID 不包含格式、尺寸、模型名或版本号。本文不另建命名表；首轮只使用 Phase 4B `presentation/assets.ts` 冻结的下列 ID：

| Asset ID                                            | 用途                              |
| --------------------------------------------------- | --------------------------------- |
| `asset.poc.background.tavern.day.standard`          | 酒馆日间背景                      |
| `asset.poc.background.tavern.evening.standard`      | 同几何傍晚背景                    |
| `asset.poc.background.main_menu.standard`           | 主菜单 code-native/后续图片背景   |
| `asset.poc.background.market.day.standard`          | 市集 code-native/后续图片背景     |
| `asset.poc.background.world_map.standard`           | 世界地图 code-native/后续图片背景 |
| `asset.poc.background.week_summary.standard`        | 周结算 code-native/后续图片背景   |
| `asset.poc.character.heroine.static.standard`       | 女主 standard 静态 fallback       |
| `asset.poc.character.heroine.back_hair.standard`    | 后发层                            |
| `asset.poc.character.heroine.costume_body.standard` | 当前完整服装主体层                |
| `asset.poc.character.heroine.face.neutral`          | 当前中性表情层                    |
| `asset.poc.character.heroine.front_hair.standard`   | 前发层                            |
| `asset.poc.character.heroine.accessory.standard`    | 饰品层                            |

市集与世界地图已经拥有上表中的稳定 code-fallback Asset ID，后续图片 provider 必须替换这些公开符号而不是再造别名。更多表情和招牌状态仍只是视觉角色需求，等 Story 实际登记时再由 Phase 4B 的后续修订命名。上表图片也只有在人工选择、复制到 runtime asset root、登记 manifest 并通过摘要/尺寸/构建验证后才成为实际 provider；当前均允许是 fallback-only manifest 项。

## 8. 代码 UI 与符号边界

以下内容不得由 Image Gen 生成运行时位图：HUD 数字/文本/进度条、按钮、Dialog、Tabs、Tooltip、焦点环、保存/关闭/设置等系统图标、账本行、配方表、库存格、设施条件，以及需要在 16–32 px 清晰显示的世界语义符号。

系统图标使用 Lucide。世界语义符号经 `GameSymbol` 抽象，首批集合为：

```text
symbol.poc.actor.stamina
symbol.poc.actor.mood
symbol.poc.economy.cash
symbol.poc.tavern.reputation
symbol.poc.obligation.levy
symbol.poc.inventory.ingredient
symbol.poc.relationship.affection
symbol.poc.relationship.teamwork
symbol.poc.action.purchase
symbol.poc.action.service
symbol.poc.overlay.ledger
symbol.poc.overlay.facility
symbol.poc.facility.cold_storage
symbol.poc.facility.comfortable_bed
```

符号以 24×24 viewBox 设计，在 16/20/24/32 px 验收；可点击容器至少 44×44 CSS px，且不能只靠颜色表达含义。

## 9. 运行时提升与 Asset Pack

`art-source/aigc/**` 是 archive-only：生产代码、测试扫描、构建和 Web Artifact 都不读取它。概念图进入 Git 不代表已被运行时采用。

被采用的图片由作者人工复制到 `game/packages/assets/**` 或 `game/stories/<story>/assets/**`。运行时记录只包含稳定 Asset ID、相对路径、媒体类型、尺寸、字节数和精确文件摘要，不保留生成服务、模型、prompt、审计或反向来源字段。

本先行轨道必须在 Phase 0 之前提交一个版本化技术交接点：
`game/packages/assets/src/approved-poc-pack.ts` 导出 `approvedPocAssetPacksV1`。没有图片获准时该只读数组为空；有图片获准时，它只登记已复制到 `game/packages/assets/runtime/poc/**` 的 provider，并使用本文和 Phase 4B 冻结的稳定 Asset ID。`game/packages/assets/src/index.ts` 公开该值；`game/packages/assets/src/approved-poc-pack.test.ts` 对非空 provider 的受控根路径、媒体 magic、字节数、尺寸和 SHA-256 做机械校验，并证明空数组合法。文件名中的 `approved` 只表示项目所有者已决定让它进入 runtime；许可/审美判断不进入引擎 schema。该模块、测试、provider 文件和 clean Git commit 是素材轨道交给工程 Goal 的唯一输入，工程 Goal 不扫描候选目录或等待新的人工决定。

`RuntimePresentationView` 先根据当前 StageScene variant、角色层、素材 `requiredFlags` 与玩家 `allowedFlags` 求出精确、去重且保持首现顺序的 `requiredAssetIds`；AssetRegistry 只加载这些 ID。未通过当前 mask all-of 判断或当前画面未使用的素材不能先加载再隐藏。

Asset Pack digest 自动覆盖 runtime manifest 的 canonical projection；provider 文件摘要绑定精确资源 bytes。未复制进运行时目录的概念图变化不得改变 presentation digest、Save compatibility 或 Web Artifact。

## 10. 验收

- 一个锚点先通过角色身份、年龄、比例、服装、场景材质和色板审核，再生成七张屏幕稿；
- 女主明确为 19 岁成年人，体现清纯、活泼、可爱、邻家感和轻微笨拙；零 requirement 的基础素材不以身体展示为中心；
- 酒馆日间/傍晚保持相同几何，证明 variant 可以独立切换且不与游戏时间硬绑定；
- 女主互动、市集、世界地图、Workspace Overlay 和人物资料/换装形成同一视觉系统；
- 1600×1000、1024×768、768×1024 与等效 200% zoom 下核心舞台、HUD、Overlay 和 VN 可用；
- 中央 4:3 安全区、顶部 HUD、底部 VN 和 Overlay 遮挡预留成立；
- 背景、人物和物件不含可读文字、Logo、水印或现代物件；
- 代码 UI 保持语义 DOM、键盘可达、可见焦点和 code-native fallback；
- `art-source/aigc/**` 不进入 Web Artifact，也不被 runtime 素材验证器扫描；
- `approvedPocAssetPacksV1` 始终存在且可为空；每个非空 provider 只引用已提交的 `game/packages/assets/runtime/poc/**` 文件和既有 Asset ID；
- `pnpm exec vitest run game/packages/assets/src/approved-poc-pack.test.ts`、`pnpm typecheck`、`pnpm verify:boundaries` 和当前 `pnpm verify` 在该素材 commit 上通过；
- 当前 PoC 不登记任何受限内容 flag，所有 runtime requirement 为零；suggestive 研究稿如产生也保持 archive-only；
- 新稿不因“已生成”自动进入 Asset Pack。

## 11. 明确延后

- 正式 Logo、标题字与品牌系统；
- 完整身体分区 HitMap、触摸反应 Gameplay 和每日互动奖励；
- 多套持久换装、自由上衣/下装组合和服装解锁；
- 扩展表情、客人群像、菜品/原料逐项插画；
- 正式音频、VFX、Live2D 或 3D；
- suggestive 运行时素材、sexual/explicit 内容和独立成人玩法；
- 自动 AIGC 许可判定、来源审计、输入图谱或运行时反向追踪；
- 大规模素材生产与外部 Mod 素材导入。
