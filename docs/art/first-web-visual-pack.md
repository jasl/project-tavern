# 首批 Web 视觉包与 Image Gen 基线

日期：2026-07-10
状态：v1 临时视觉基线；Phase A 四张候选已生成，待用户确认锚点；正式美术可在试玩后重做
适用范围：React Harness 的 Player 舞台、VN、Workspace Overlay 与七日 Story 素材

## 1. 目的

首批视觉包不是正式美术生产，而是让可点击 PoC 具备足够一致的场景、人物和状态差分，从而真实评估信息层级、操作疲劳、关系表现和 Overlay 可读性。

当前采用 OpenAI Image Gen 生成原创候选。Image Gen 负责栅格场景、人物和物件；React、CSS、Radix、Lucide 与 `GameSymbol` 负责精确 UI。任何 AI 生成的整屏 UI 只作为视觉基准，不切图成为实际按钮、文字、HUD 或面板。

商业游戏截图和本地 `references/` 只由人观察并归纳抽象布局原则，不作为生成输入。商业素材、朋友提供的素材或许可证未明确允许 AIGC 的图片同样不得上传到生成服务。

## 2. 临时视觉语言

### 2.1 气质

- 日式低魔幻想叙事游戏的可读性，但不模仿任何具体作品；
- 温馨、克制、略带战后重建痕迹，不做糖果色童话或压抑黑暗奇幻；
- 2D 手绘与轻厚涂结合，轮廓清楚、材质有磨损，不追求摄影写实；
- 场景以木材、灰泥、粗布、旧铜和暖色灯火为主；
- 人物为成年比例和自然姿态，不做 Q 版、幼态化、夸张胸腰或暴露服装；
- 没有 Logo、水印、现代物件或可读的虚构文字。

### 2.2 UI 色彩与材质

首版代码化 UI 以以下 token 为基准，允许在对比度测试中微调明度：

| 角色            | 基准色    | 用途                   |
| --------------- | --------- | ---------------------- |
| `ink-950`       | `#171B26` | 舞台遮罩、深色面板     |
| `ink-800`       | `#283043` | 面板与顶部 HUD         |
| `parchment-100` | `#EEE5D2` | 主文字与浅色详情面     |
| `brass-500`     | `#C69A57` | 边框、选中态、重要资源 |
| `amber-500`     | `#D8863B` | 行动与暖光强调         |
| `sage-500`      | `#66877A` | 正向、恢复与生活设施   |
| `danger-500`    | `#B95E55` | 风险、拒绝与危机       |

面板使用低透明墨蓝背板、细铜边和非常轻的纸/木纹；正文优先高可读无衬线中文字体，标题可以使用克制的宋体气质。首版不依赖远程字体，字体许可与打包在 UI 实施任务中单独确认。

Motion 只用于 Overlay 进入、VN 文本切换、资源变化和 Aura 提示，基准时长 160–240 ms；不使用持续漂浮、弹跳或遮挡输入的装饰动画，并尊重 `prefers-reduced-motion`。

## 3. 舞台构图合同

逻辑画布为 1600×1000，背景母版为 2560×1600，二者均为 16:10。4:3 核心安全区分别为：

| 画布      | 4:3 安全区               |
| --------- | ------------------------ |
| 1600×1000 | `x=133..1467, y=0..1000` |
| 2560×1600 | `x=213..2347, y=0..1600` |

遮挡与交互预留：

- 顶部 HUD：逻辑 `y=0..80`；
- VN 对话区：逻辑 `y=720..1000`；
- 轻量行动入口：逻辑 `x=1240..1560, y=120..700`；
- Workspace Overlay 常用范围：逻辑 `x=260..1340, y=120..900`；
- 女主默认脚底 pivot：逻辑 `(980, 930)`，脸、手和关键道具必须处在中央安全区且不落入 VN 遮挡带；
- 背景的门、柜台、壁炉和招牌等关键叙事物件不能只存在于 16:10 两侧裁切区。

1024×768 使用中央裁切与 CSS 重排；超宽屏不横向拉伸母版。背景图不承担文字对比度，HUD 与 Overlay 必须自行提供满足 WCAG 2.2 AA 的背板。

## 4. 场景与人物锚点

### 4.1 酒馆

固定平视机位，约 35 mm 等效视角。酒馆已经勉强恢复营业：主体结构安全但仍能看到修补灰泥、替换木板和少量未完成的木工。柜台、壁炉、窗户、桌椅与通往后厨的入口在所有光照变体中保持同一几何与位置。

白天母版使用柔和窗光和少量炉火；晚间变体只能改变环境光、窗外亮度、蜡烛与炉火，不能重新布置家具或改变镜头。背景中不出现人物、文字、菜单牌或徽标。

### 4.2 女主身份锚点

女主是 22 岁的年轻成年女性，低魔幻想小镇居民。固定特征：栗棕色及肩发，低侧辫；灰绿色眼睛；自然成年脸型；身形健康普通。服装为灰蓝长袖上衣、深蓝及踝裙、米色实用围裙、窄皮带与耐磨短靴，只有少量修补针脚，不使用女仆头饰、蕾丝堆叠或暴露剪裁。

默认姿态自然站立，一只手可轻扶托盘或围裙，重心稳定。初始表情集：

- `neutral`：克制、礼貌但仍有距离；
- `working`：专注而稍微放松；
- `angry`：明确不悦和防备，不做滑稽暴怒。

先生成并选定 `neutral` 身份锚点，后续变体必须以它作为 edit target，只改变表情和明示的小幅手部姿态；脸型、发型、服装、比例、画布、视角、光向与 pivot 不变。

## 5. 首批 Asset ID 与生成顺序

稳定 Asset ID 不包含格式、尺寸、模型名或 `v2`。生成分成两个明确阶段：

- **Phase A，基础校准**：独立生成 UI 基准、酒馆 day、女主 neutral 和 damaged sign。四张都先作为 preview/source candidate，不进入 Player manifest；本轮只执行这一阶段。
- **Phase B，锚点派生**：用户确认对应 Phase A 锚点后，才通过 edit 派生 evening、working、angry 和 repaired。不得在锚点未确认时并行独立生成变体。

内置 Image Gen 的 Phase A 输出使用工具原生尺寸校准风格与构图；1600×1000 逻辑画布、2560×1600 背景母版和人物/物件源尺寸是获选后的规范化合同，未经裁切、缩放、来源复核和验收的概念输出不能直接称为 runtime master。

| 顺序 | Asset ID                          | 类型              | 生成方式                            | 首轮用途                           |
| ---: | --------------------------------- | ----------------- | ----------------------------------- | ---------------------------------- |
|   A1 | `concept.ui.player-stage-overlay` | preview only      | 独立生成                            | 校准视觉层级，不进 Story digest    |
|   A2 | `background.tavern.main.day`      | source candidate  | 独立生成                            | 酒馆中央舞台锚点                   |
|   A3 | `character.heroine.neutral`       | source anchor     | 独立生成                            | 身份锚点；通过后再做透明运行时导出 |
|   A4 | `prop.tavern.sign.damaged`        | source candidate  | 独立生成                            | 招牌物件锚点                       |
|   B1 | `background.tavern.main.evening`  | runtime candidate | day 的 lighting-only edit           | 晚间营业                           |
|   B2 | `character.heroine.working`       | runtime candidate | neutral 的 identity-preserving edit | 正常营业                           |
|   B3 | `character.heroine.angry`         | runtime candidate | neutral 的 identity-preserving edit | `heroine.angry`                    |
|   B4 | `prop.tavern.sign.repaired`       | runtime candidate | damaged 的 precise-object edit      | 修理结果与 Buff 来源               |

首轮不生成伙计立绘、主角立绘、四道菜和五种原料的逐项插画、Logo、完整设施图、远景地图或旧贸易路线专用背景。它们先使用文本、CSS、`GameSymbol` 或通用场景承载；真实试玩证明有价值后再扩充。

## 6. Image Gen 首轮 Prompt

以下 prompt 是生成时的权威输入。工具未披露的模型名不得猜测。

### 6.1 UI 视觉基准

```text
Use case: ui-mockup
Asset type: original 16:10 browser game interface visual reference, preview only
Primary request: a polished player screen for a cozy low-magic fantasy tavern management and relationship simulation game
Scene/backdrop: a repaired medieval trade-town tavern, warm timber and plaster, softly painted 2D background
Subject: persistent central stage; compact top HUD represented by icons, meters and abstract label bars for day, period, action points, stamina, mood, cash, reputation and levy; one non-authoritative adult heroine silhouette placeholder on stage; one large centered procurement workspace overlay using abstract item cards; light action rail at the right edge; no developer sidebars
Style/medium: practical shippable game UI mockup, restrained Japanese narrative-game readability, original design, code-native panels rather than ornate fantasy concept art
Composition/framing: 1600x1000 landscape, central 4:3 safe area, overlay leaves enough context of the stage visible, clear hierarchy for tablet landscape
Lighting/mood: warm and calm with a slight post-war rebuilding texture
Color palette: ink navy translucent panels, parchment text surfaces, aged brass accents, muted amber and sage status colors
Constraints: teen-rated; adult character placeholder; readable large shapes; abstract unreadable placeholder glyphs only, no real UI copy or paragraphs; no tiny decorative controls; no hover-only affordance; no logos; no trademarks; no watermark; do not imitate any specific existing game
Avoid: photorealism, chibi proportions, excessive gold filigree, mobile gacha clutter, readable rasterized interface text, sexualized clothing
```

### 6.2 酒馆白天母版

```text
Use case: stylized-concept
Asset type: game environment background source candidate
Primary request: an original low-magic fantasy trade-town tavern recently repaired after wartime damage and ready for modest business
Scene/backdrop: timber beams, patched pale plaster, sturdy bar counter, small hearth, simple tables and chairs, window daylight, a visible passage toward the kitchen, subtle replacement boards and unfinished carpentry
Subject: empty interior with no people; clear central standing area for a character; stable readable silhouettes at tablet size
Style/medium: polished 2D hand-painted game background with restrained anime narrative-game readability and grounded material texture
Composition/framing: 16:10 landscape, eye-level fixed camera, approximately 35mm equivalent, central 4:3 safe area, important furniture away from extreme side crops, top and lower zones tolerant of HUD and VN overlays
Lighting/mood: soft late-morning window light with a small warm hearth glow; hopeful, calm, not luxurious
Color palette: warm worn wood, pale plaster, muted blue-gray cloth, aged brass, low-saturation amber
Constraints: no people; no text; no readable signs; no menu board; no logos; no watermark; no modern objects; no magical spectacle
Avoid: photorealism, fisheye perspective, cathedral scale, spotless luxury, dark horror lighting, clutter in the central character area
```

### 6.3 女主 neutral 身份锚点

```text
Use case: stylized-concept
Asset type: adult game heroine identity anchor, source concept for later expression edits
Primary request: an original 22-year-old low-magic fantasy tavern worker standing naturally
Subject: shoulder-length chestnut-brown hair gathered into a low side braid, gray-green eyes, natural adult face and proportions, healthy ordinary build; slate-blue long-sleeve blouse, deep-blue ankle-length skirt, practical cream apron, narrow leather belt, worn short boots, a few subtle repaired seams
Style/medium: polished 2D hand-painted anime-inspired character art with grounded fabric texture and a clean readable silhouette
Composition/framing: full body, front three-quarter view, centered on a plain warm neutral backdrop, feet fully visible, generous padding, stable vertical pose for future edits
Lighting/mood: soft tavern window light from upper left; neutral expression that is polite but emotionally reserved
Constraints: clearly adult; teen-rated; practical work clothing; natural hands; no text; no logo; no watermark; original design
Avoid: maid headpiece, excessive lace, cleavage, transparent fabric, fetish styling, childlike face, chibi proportions, extreme hourglass anatomy, weapons, magic effects, busy scenery
```

### 6.4 损坏招牌

```text
Use case: stylized-concept
Asset type: game prop state anchor source candidate
Primary request: a damaged hanging tavern sign made from one thick wooden plank and simple dark iron brackets, repairable rather than destroyed
Style/medium: hand-painted low-magic fantasy game prop, grounded worn wood and iron texture, clear silhouette
Composition/framing: single complete object centered on a plain warm neutral backdrop, square canvas, generous padding, fixed three-quarter view for a later repaired-state edit
Lighting/mood: soft neutral studio-like game asset lighting
Constraints: no readable lettering or emblem; no text; no logo; no watermark; no background scene; no cast shadow; original design
Avoid: splintered beyond repair, ornate royal crest, magical glow, modern hardware
```

晚间、工作、生气与修复状态使用对应基础图做单一变量 edit；每次 edit 必须重申不变项，不重新独立生成。

## 7. Image Gen、代码 UI 与符号边界

以下内容不得由 Image Gen 生成运行时位图：

- HUD 数字、文本、进度条、AP 点和状态提示；
- 按钮、Dialog、Tabs、Tooltip、ScrollArea、焦点环与触摸反馈；
- 保存、关闭、返回、设置、搜索、导入导出和 Bug 等系统图标；
- 账本行、配方表、库存格和设施条件；
- 需要在 16–32 px 清晰显示的世界语义符号。

系统图标使用 Lucide。世界语义符号经 `GameSymbol` 抽象，首版可以用项目自有 CSS/SVG 或封装后的临时 Lucide 实现，不能在业务组件中散落直接图标依赖。首批语义集合：

```text
actor.stamina
actor.mood
economy.cash
tavern.reputation
obligation.levy
inventory.ingredient
relationship.affection
relationship.teamwork
action.purchase
action.service
overlay.ledger
overlay.facility
facility.cold_storage
facility.comfortable_bed
```

符号以 24×24 viewBox 设计，在 16/20/24/32 px 验收；可点击容器仍至少 44×44 CSS px，且不能只靠颜色表达含义。

## 8. 文件、来源与运行时合同

未整理的生成批次和临时导出保留在被忽略的本地工作目录。只有已归档、带完整 prompt、provenance 和 hash 的评审候选才可以按以下结构进入 Git；在用户明确选定且条款审批前，它们不得进入 runtime manifest、Story digest 或 Player 产物：

```text
art-source/imagegen/first-web-pack/
  README.md                 # 指向本文件这个权威 visual brief
  <asset-slug>/
    source.png
    prompt.md
    provenance.json

src/stories/tavern-poc/assets/
  manifest.ts
  asset-budgets.json
  runtime/
    backgrounds/
    characters/heroine/
    props/
```

人物源母版建议 1536×2048 或等比例纵向画布，pivot 为 `50% 100%`；物件母版为 1024×1024。运行时导出在实际 UI 中确定所需尺寸后再生成 WebP/PNG，不用未经测量的预算阻塞第一张概念图。

每个已归档评审候选或获选素材的 `provenance.json` 必须精确满足以下 closed schema；所有对象拒绝 unknown keys，不能把额外说明塞进任意 JSON：

```ts
type Rfc3339Timestamp = string;
type HttpsUrl = string;
type Sha256 = `sha256:${string}`;

interface GeneratorRecordV1 {
  readonly service: string;
  readonly surface: string;
  readonly model: string;
  readonly generatedAt: Rfc3339Timestamp;
}

type InputUseReviewV1 = null | {
  readonly status: "approved";
  readonly reviewedAt: Rfc3339Timestamp;
  readonly sourceUrl: HttpsUrl;
  readonly allowedInputUses: readonly (
    "generation_input" | "image_edit_input"
  )[];
  readonly restrictions: readonly string[];
};

type TermsReviewV1 =
  | {
      readonly status: "pending";
      readonly reviewedAt: null;
      readonly sourceUrl: null;
      readonly allowedUses: readonly [];
      readonly restrictions: readonly [];
    }
  | {
      readonly status: "approved";
      readonly reviewedAt: Rfc3339Timestamp;
      readonly sourceUrl: HttpsUrl;
      readonly allowedUses: readonly string[];
      readonly restrictions: readonly string[];
    }
  | {
      readonly status: "rejected";
      readonly reviewedAt: Rfc3339Timestamp;
      readonly sourceUrl: HttpsUrl;
      readonly allowedUses: readonly [];
      readonly restrictions: readonly string[];
    };

interface ModificationRecordV1 {
  readonly kind:
    | "image_edit"
    | "crop"
    | "resize"
    | "background_removal"
    | "color_correction";
  readonly performedAt: Rfc3339Timestamp;
  readonly tool: string;
  readonly notes: string;
}

interface SourceDescriptorV1 {
  readonly path: "source.png";
  readonly format: "png";
  readonly width: number;
  readonly height: number;
}

interface RuntimeExportV1 {
  readonly path: string;
  readonly format: "png" | "webp";
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
  readonly loadingGroup: string;
  readonly budgetGroup: string;
  readonly sha256: Sha256;
}

type ReviewDecisionV1 =
  | { readonly status: "candidate"; readonly selectionReason: null }
  | {
      readonly status: "selected" | "rejected";
      readonly selectionReason: string;
    };

interface ProvenanceV1 {
  readonly assetId: string;
  readonly sourceType: "ai_generated";
  readonly generator: GeneratorRecordV1;
  readonly promptFile: "prompt.md";
  readonly inputAssets: readonly string[];
  readonly inputUseReview: InputUseReviewV1;
  readonly termsReview: TermsReviewV1;
  readonly modifications: readonly ModificationRecordV1[];
  readonly source: SourceDescriptorV1;
  readonly sourceSha256: Sha256;
  readonly runtime: RuntimeExportV1 | null;
  readonly review: ReviewDecisionV1;
}
```

字符串还必须非空；timestamp 必须是合法 RFC3339，URL 必须是 HTTPS，SHA-256 必须是恰好 64 个小写十六进制字符；宽高和 byteLength 必须是正安全整数。`allowedUses` 在 approved 时非空，`restrictions` 在 rejected 时非空，selected/rejected 的 `selectionReason` 必须非空。`inputAssets` 是按输入顺序排列且唯一的稳定 AssetId，不是文件路径。

工具未披露模型时记录 `undisclosed-by-tool`，不得猜测。只有本项目自有、已经按本节归档的候选才有资格进入 `inputAssets`；商业素材、商业截图与 `references/` 无条件禁止。无输入的原始生成必须使用 `inputAssets: []` 与 `inputUseReview: null`；只要 `inputAssets` 非空，上传或编辑前必须有 `status: "approved"` 的独立 `inputUseReview`，其 `allowedInputUses` 包含本次实际操作且 `reviewedAt <= generator.generatedAt`。它不替代运行时/商用条款复核。`termsReview.status` 未变为 `approved` 的素材可以作为 `art-source` 候选和 Developer preview，但不能进入 Player runtime manifest 或 Pages artifact。

字段按用途分层：

- preview/source candidate 必须登记 Asset ID、prompt、输入清单、生成来源、source hash 与 review 状态；`runtime` 保持 `null`，不要求 loading group；
- runtime candidate 还必须通过条款复核，并登记 runtime 路径、格式、像素尺寸、loading group、runtime hash 与预算归属；
- UI preview 永不进入 Story runtime manifest、Story digest 或 Player artifact。

首个背景、人物和物件完成运行时导出后，以实测值建立 `asset-budgets.json`，包含初始加载、单文件和整个 Story 的大小上限；CI 不得自动放宽预算。

## 9. 验收

- UI 基准图明确展示中央舞台、顶栏、一个 Workspace Overlay 和右侧轻量行动入口，不出现开发侧栏；
- 背景在 1024×768、1280×800、1600×1000 与超宽边带下无关键裁切；
- day/evening 除光照外没有镜头、几何、家具或物件漂移；
- 女主三种状态的身份、服装、尺度、画布和 pivot 一致，实际显示尺寸下表情可辨；
- 人物与物件若进入透明运行时导出，不得有残底、明显色边、烘焙投影或被截断的肢体；
- damaged/repaired 是同一招牌的状态变化，不是两个不同设计；
- 运行时场景、人物和物件图片无文字、Logo、水印、现代物件和无关人物；UI preview 只能使用不可读的抽象占位字形，不得包含可被误当成最终文案的正文；
- 图像只提供氛围，HUD/VN/Overlay 的可读性由代码背板保证；
- preview/source candidate 完成 Asset ID、prompt、输入清单、来源、source hash 与 review 状态登记；只有 runtime candidate 才额外要求 approved 条款、runtime 尺寸、路径、hash、loading group 与预算；
- 未整理候选批次、商业参考图与 `references/` 不进入仓库；带完整 prompt、严格 provenance 和 hash 的项目自有归档候选可以进入 `art-source/`。未选定或条款未审批的候选不进入 runtime manifest、Story digest 或 Player 构建；只有项目自有归档候选才可能在独立 `inputUseReview` 批准后作为新生成输入，商业素材与 `references/` 不存在例外。

任何一项失败都先修 prompt、edit 或导出流程，不通过给 UI 增加不可维护的特殊裁切和逐图补丁掩盖。

## 10. 明确延后

- 正式 Logo、标题画面和宣传图；
- 伙计、主角、老人、战友和镇民的正式角色包；
- 四道菜、五种原料与设施树的完整插图；
- 完整外景、季节、天气和昼夜场景库；
- 换装、Live2D、3D、动作生成和语音；
- 正式字体、音频、粒子和复杂 shader 管线。

这些内容由真实试玩和正式世界观决定，不进入首轮 Goal。

## 11. 当前 Phase A 候选

四张候选均位于 `art-source/imagegen/first-web-pack/`，各自包含 `source.png`、最终 prompt 与 `provenance.json`：

- `ui-player-stage-overlay/`；
- `tavern-main-day/`；
- `heroine-neutral/`；
- `tavern-sign-damaged/`。

它们的 `review.status` 与 `termsReview.status` 分别为 `candidate`、`pending`，因此当前不进入 Story manifest、Story digest、Player artifact 或 Pages。Phase B 必须等待用户逐项确认或要求重生成。
