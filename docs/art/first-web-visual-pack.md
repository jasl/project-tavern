# 首批 Web 视觉包与 Image Gen 基线

日期：2026-07-12

状态：v1 临时视觉基线；四张 OpenAI 概念图已归档，尚未提升为运行时素材

适用范围：React Harness 的 Player 舞台、VN、Workspace Overlay 与七日 Story 素材

## 1. 目的

首批视觉包不是正式美术生产，而是让可点击 PoC 具备足够一致的场景、人物和状态差分，从而评估信息层级、操作疲劳、关系表现和 Overlay 可读性。

Image Gen 只负责栅格场景、人物和物件概念图；React、CSS、Radix、Lucide 与 `GameSymbol` 负责精确 UI。AI 生成的整屏 UI 仅作视觉参考，不切图成为实际按钮、文字、HUD 或面板。

商业游戏截图和本地 `references/` 只由人观察并归纳抽象布局原则，不作为生成输入。

## 2. 临时视觉语言

- 日式低魔幻想叙事游戏的可读性，但不模仿任何具体作品；
- 温馨、克制、略带战后重建痕迹，不做糖果色童话或压抑黑暗奇幻；
- 2D 手绘与轻厚涂结合，轮廓清楚、材质有磨损，不追求摄影写实；
- 木材、灰泥、粗布、旧铜和暖色灯火为主；
- 人物使用成年比例与自然姿态，不做 Q 版、幼态化或暴露服装；
- 不出现 Logo、水印、现代物件或可读的虚构文字。

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

Motion 只用于 Overlay 进入、VN 文本切换、资源变化和 Aura 提示，基准 160–240 ms，并尊重 `prefers-reduced-motion`。

## 3. 舞台构图合同

逻辑画布为 1600×1000，背景母版为 2560×1600，均为 16:10。4:3 核心安全区：

| 画布      | 4:3 安全区               |
| --------- | ------------------------ |
| 1600×1000 | `x=133..1467, y=0..1000` |
| 2560×1600 | `x=213..2347, y=0..1600` |

遮挡与交互预留：

- 顶部 HUD：逻辑 `y=0..80`；
- VN 对话区：逻辑 `y=720..1000`；
- 轻量行动入口：逻辑 `x=1240..1560, y=120..700`；
- Workspace Overlay：逻辑 `x=260..1340, y=120..900`；
- 女主默认脚底 pivot：逻辑 `(980, 930)`；
- 门、柜台、壁炉和招牌不能只存在于 16:10 两侧裁切区。

1024×768 使用中央裁切与 CSS 重排；超宽屏不拉伸母版。HUD 与 Overlay 自己提供满足 WCAG 2.2 AA 的背板。

## 4. 场景与人物锚点

酒馆使用固定平视机位、约 35 mm 等效视角。主体结构安全但可见修补灰泥、替换木板和未完成木工。柜台、壁炉、窗户、桌椅与后厨入口在光照变体中保持同一几何和位置；背景不出现人物、文字、菜单牌或徽标。

女主是 22 岁成年女性。固定特征：栗棕色及肩发、低侧辫、灰绿色眼睛、自然成年脸型和健康普通身形；灰蓝长袖上衣、深蓝及踝裙、米色实用围裙、窄皮带和耐磨短靴。后续 `working`/`angry` 变体只改变表情和明示的小幅手部姿态，脸型、发型、服装、比例、画布、视角、光向与 pivot 不变。

## 5. 稳定 Asset ID 与当前概念图

稳定 Asset ID 不包含格式、尺寸、模型名或版本号：

| Asset ID                          | 当前用途                               |
| --------------------------------- | -------------------------------------- |
| `concept.ui.player-stage-overlay` | 视觉层级参考，不进 presentation digest |
| `background.tavern.main.day`      | 酒馆中央舞台锚点                       |
| `character.heroine.neutral`       | 女主身份锚点                           |
| `prop.tavern.sign.damaged`        | 招牌状态锚点                           |
| `background.tavern.main.evening`  | 后续 day 光照 edit                     |
| `character.heroine.working`       | 后续 neutral 表情/姿态 edit            |
| `character.heroine.angry`         | 后续 neutral 表情 edit                 |
| `prop.tavern.sign.repaired`       | 后续 damaged 物件 edit                 |

当前四张 OpenAI 概念图及 prompt 平铺在：

```text
art-source/aigc/openai/illustrations/
  heroine-neutral.png
  heroine-neutral.txt
  tavern-main-day.png
  tavern-main-day.txt
  tavern-sign-damaged.png
  tavern-sign-damaged.txt
  ui-player-stage-overlay.png
  ui-player-stage-overlay.txt
```

prompt 是方便重新生成和调整的人工作业档案。模型名和 prompt 文件都不是自动化必需项；当前工具没有提供值得维护的模型名，因此文件名不包含模型段，也不使用 `unknown-model`。

来源目录下的结构不是 ABI，可以自由重组、覆盖或增加版本。仓库不扫描图片/prompt 配对、生成服务条款、输入链、时间戳、来源 digest 或人工评审状态。

## 6. 代码 UI 与符号边界

以下内容不得由 Image Gen 生成运行时位图：HUD 数字/文本/进度条、按钮、Dialog、Tabs、Tooltip、焦点环、保存/关闭/设置等系统图标、账本行、配方表、库存格、设施条件，以及需要在 16–32 px 清晰显示的世界语义符号。

系统图标使用 Lucide。世界语义符号经 `GameSymbol` 抽象，首批集合为：

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

符号以 24×24 viewBox 设计，在 16/20/24/32 px 验收；可点击容器至少 44×44 CSS px，且不能只靠颜色表达含义。

## 7. 运行时提升与 Asset Pack

`art-source/aigc/**` 是 archive-only：生产代码、测试扫描、构建、Player 和 Pages 都不读取它。概念图进入 Git 不代表已被运行时采用。

被采用的图片由作者人工复制到 `packages/assets/**` 或 `stories/<story>/assets/**`。运行时记录仅包含稳定 Asset ID、相对路径、媒体类型、尺寸、字节数和精确文件摘要，不保留生成服务、模型、prompt、审计或反向来源字段。

Asset Pack digest 自动覆盖 runtime manifest 的 canonical projection；provider 的文件摘要又绑定精确资源 bytes。因此 digest 只服务于确定性、缓存、存档身份和诊断，不是版权或 provenance 记录。未复制进运行时目录的概念图变化不得改变 presentation digest 或 Player 制品。

## 8. 验收

- 1600×1000、1024×768、768×1024 与等效 200% zoom 下核心舞台、HUD、Overlay 和 VN 可用；
- 中央 4:3 安全区与上下遮挡预留成立；
- 女主锚点明确成年、服装实用、轮廓稳定；
- 背景/人物/招牌概念图不含可读文字、Logo、水印或现代物件；
- 代码 UI 保持语义 DOM、键盘可达、可见焦点和 code-native fallback；
- `art-source/aigc/**` 不进入 Player/Pages，也不被许可或素材验证器扫描；
- 当前四张概念图不进入 Asset Pack；首版仍能使用完整 fallback 试玩。

## 9. 明确延后

- 正式 Logo、标题字与品牌系统；
- 扩展表情、客人群像、菜品/原料逐项插画；
- 正式音频、VFX、动画骨骼、Live2D 或 3D；
- 自动 AIGC 许可判定、来源审计、输入图谱或运行时反向追踪；
- 大规模素材生产与外部 Mod 素材导入。
