# Phase 5C 技术视觉基线

- Checkpoint：`phase5c-visual-baselines-v1`
- Task：Phase 5C Task 8
- Reviewer：`agent`
- Review date：2026-07-18
- Comparison evidence：`full_image`
- Overall result：`PASS`
- Phase 5C base：`f84e623`
- Task execution base `HEAD`：`f991b36cf09d838d2c1cd74f199fcf9823ebfd25`
- Previous accepted task commit：`25bd15a`（Phase 5C Task 7）

本 checkpoint 记录首套固定环境 Chromium 技术基线。Task 8 的 accepted commit 由包含本文件的 Git commit 确立，不在文件内创建自引用哈希。

## Materialization 与生产闭包

- Materialization base：`47e412ae37d35f3a5c847c1970bf20ed2395a4e9`
- Materialization digest：`sha256:394281da75c9934b13d1766fa4530f741fe88e73f93c7cca079d3c78f98b4c2f`
- Package closure digest：`sha256:d7f6b53840acda091ee9564dec0e5b09d17b8035c31f9d4409daa8ece1d377b1`
- Live ignored attestation 与 tracked materialization contract 严格解码、重算后完全匹配；base 是执行基线 `HEAD` 的祖先。

生产 presentation digest 由 live source bytes、生产 `collectE2eBuildIdentityV1` / `collectPocBuildIdentityV1` collector 和 `resolveGamePackageV1` 重算。

| Production root | Presentation digest                                                       | Asset Pack evidence           | Source graph manifest digest                                              |
| --------------- | ------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| E2E             | `sha256:6a24a65ea908f224031747013d2a06d56ba509ea3e753f9c08a649c054209b03` | source/resolved `[]`          | `sha256:da1efc057b0c4eac903cae5e1cfa32f703d3cb415fdef95a22c9038acf5a08b9` |
| PoC             | `sha256:5eece36bc37f901b2b1f5d76a3c6dd18085b8d22eac2d250fcc8a38f7e8a1e20` | approved/source/resolved `[]` | `sha256:458fd32b390091aef1c4b958c884c50a5e760e6b163cb49b4a0d463b672c8eda` |

当前已批准 PoC Asset Pack 为空，因此没有 per-pack digest；基线捕获的是默认生产 Story 自然解析出的代码原生 fallback，不是测试注入或第二个 Artifact。

## `LocalVisualEnvironmentV1`

Tracked canonical file：`engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json`

```json
{
  "revision": 1,
  "os": "darwin",
  "arch": "arm64",
  "playwrightVersion": "1.61.1",
  "chromiumRevision": "1228",
  "chromiumVersion": "149.0.7827.55",
  "fontPackage": "@fontsource/noto-sans-sc",
  "fontVersion": "5.2.9",
  "deviceScaleFactor": 1,
  "viewport": {
    "width": 1600,
    "height": 1000
  },
  "reducedMotion": "reduce"
}
```

- Canonical byte size：`282`
- Canonical SHA-256：`sha256:ba254eea1eba3e8beb6f85f63f6330951e5dcdc39c668e8f7f987a009c0613cc`
- 文件是无 BOM、无尾随换行的 compact canonical JSON；上方仅以等价展开形式展示完整字段。

## Baseline inventory

| Path                                                                       | Dimensions / format                      |  Bytes | SHA-256                                                                   | Result |
| -------------------------------------------------------------------------- | ---------------------------------------- | -----: | ------------------------------------------------------------------------- | ------ |
| `engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png`       | 1600×1000, 8-bit RGB PNG, non-interlaced | 226822 | `sha256:bc93886f9a0211ded0f663512aa27e739b876e60fe91a24534dd5e5d7931f245` | `PASS` |
| `engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png` | 1600×1000, 8-bit RGB PNG, non-interlaced | 169189 | `sha256:3a6f7952e4986a646591cd7bb692b47d6a2257de2ee27653150932c884c2283a` | `PASS` |
| `engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png`  | 1600×1000, 8-bit RGB PNG, non-interlaced |  66225 | `sha256:07d4863c4c9286fc5da0be0be663e1aa878a28e9695c22580d2c80a26bbb947a` | `PASS` |

## Full-image rubric

| Baseline                  | Clipping / truncation | Unintended overlap | Focus visibility | Dialog / backdrop layering | Stage / HUD / card readability | Interaction occlusion | Fallback integrity |
| ------------------------- | --------------------- | ------------------ | ---------------- | -------------------------- | ------------------------------ | --------------------- | ------------------ |
| `poc-stage-standard.png`  | PASS                  | PASS               | PASS             | PASS                       | PASS                           | PASS                  | PASS               |
| `poc-devdock-overlay.png` | PASS                  | PASS               | PASS             | PASS                       | PASS                           | PASS                  | PASS               |
| `e2e-narrative.png`       | PASS                  | PASS               | PASS             | PASS                       | PASS                           | PASS                  | PASS               |

### `poc-stage-standard.png`

验收理由：没有裁切或文字截断；Interaction、语义操作目录、System chrome 与顶部 HUD 不发生非预期重叠；“保存”焦点环清楚；Stage、HUD、卡片和资源条可读；Interaction 未被遮挡；条纹代码 fallback 完整且无破图。该 fixture 没有打开阻塞 dialog，现有层级顺序通过。

### `poc-devdock-overlay.png`

验收理由：Save dialog、DevDock rail、关闭按钮及存档、导入、导出控件均完整位于视口内；背景、Save dialog 与 DevDock 的遮罩顺序正确。左 rail 与底层 dialog 的交叠属于该 fixture 的预期组合，没有遮住有意义内容；右 launcher 位于预留空白带；“运行时能力”焦点环清楚；遮罩后的 Stage 与 fallback 完整。

### `e2e-narrative.png`

验收理由：顶部 System chrome、操作目录、状态卡和 Interaction 横条互不遮挡；底部 Narrative panel、边框、标题及选项完整无裁切；“选择右侧”焦点环清楚；渐变 backdrop 与 dialog 层级正确；Stage、HUD 与卡片可读；Narrative 未遮住顶部 Interaction；fallback 背景完整。

## 自动化验证证据

| Command                                                                               | Result                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------- |
| `pnpm exec vitest run scripts/ui/run-visual-regression.test.ts`                       | PASS，20/20                             |
| `pnpm exec vitest run engine/packages/ui/src/narrative/vn-layer.test.tsx`             | PASS，27/27                             |
| `pnpm exec vitest run game/stories/e2e/src/application/e2e-application-root.test.tsx` | PASS，13/13                             |
| `pnpm typecheck`                                                                      | PASS                                    |
| `pnpm lint`                                                                           | PASS                                    |
| `pnpm exec prettier --check .`                                                        | PASS                                    |
| `pnpm build:e2e`                                                                      | PASS                                    |
| `pnpm build:poc`                                                                      | PASS（仅保留非阻塞 chunk-size warning） |
| `pnpm verify:application-graphs`                                                      | PASS                                    |
| `pnpm update:ui-snapshots`                                                            | PASS，精确生成 3 个声明基线             |
| `pnpm verify:ui-visual`                                                               | PASS，3/3，只读像素比较                 |
| `pnpm test:e2e:ui --project=chromium --grep "@responsive\|@a11y\|@motion"`            | PASS，18/18                             |
| `pnpm test:e2e:ui --project=chromium-touch --grep "@responsive\|@a11y"`               | PASS，17/17                             |
| `pnpm test:e2e:ui --project=webkit --grep "@responsive\|@a11y\|@motion"`              | PASS，18/18                             |
| `git diff --check`                                                                    | PASS                                    |

Touch 与 WebKit 的 `@visual` 排除由 Playwright project 配置明确完成；上述功能矩阵没有 unexplained runtime skip。

## Scope 与工作树说明

本 checkpoint 只批准上述精确本机环境、当前生产闭包和已由 owner 批准的 runtime pack 的技术测试基线。它不构成人工试玩、艺术或素材批准、商业素材采用、跨平台像素一致性、VoiceOver/物理设备验证或玩家体验验收。

证据采集时没有来源不明或计划外用户改动；Task 8 的精确暂存、accepted commit、clean-tree materialization 和完整 `pnpm verify` 验收由 Git ancestry 与提交后的只读 gate 记录，不通过修改 Roadmap 复选框表达。
