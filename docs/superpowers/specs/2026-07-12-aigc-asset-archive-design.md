# Project Tavern AIGC 素材归档与运行时提升设计

日期：2026-07-12

状态：已批准，待实施

本规格是 Project Tavern AIGC 素材归档和入选运行时素材的权威边界。它取代仓库现有文档中针对 AIGC 的 service-terms review、provenance JSON、source digest、input-use review、content-admission review、candidate/selected 审计状态和自动许可扫描要求。

## 1. 设计目标

- 让人可以直接维护 AIGC 原始图和 prompt，不需要 Agent 产生审计 JSON。
- 按生成来源隔离素材，同时允许来源目录下自由组织。
- 把频繁重新生成和直接覆盖视为正常工作流。
- 让入选图片像普通游戏素材一样进入 Asset Pack，不携带版权审计数据。
- 保留 Asset Pack 为确定性、缓存和存档身份自动计算 digest 的技术能力。

## 2. 非目标

- 不存储或验证生成服务条款副本、条款日期或账号类型。
- 不维护逐图 provenance Schema、版权结论、输入链、hash 链或 review 状态机。
- 不对 AIGC 归档目录、入选图片或最终 E2E/PoC Web Artifact 做版权扫描或自动准入判定。
- 不要求为每张图片标注许可证、版权人、生成时间、模型摘要或不可重复的输出身份。
- 不把 Asset Pack digest 解释为版权、来源或生成证据。

## 3. 归档目录

AIGC 原始素材统一放在：

```text
art-source/aigc/<source>/...
```

`<source>` 是第一层来源边界。当前约定的目录名包括：

```text
openai/
google-gemini/
xai-grok/
comfyui/
```

来源目录名就是项目归档中的全部生成来源/条款范围上下文；不再附加条款记录、许可证字段或审计文件。

来源目录下不定义通用 Schema，可以按当前创作用途自由组织。首批 OpenAI 概念图使用以下结构：

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

`illustrations/` 只是当前人工分组，不是稳定 ABI。未来可在不修改引擎、Story 或验证器的前提下增加或重组下级目录。

## 4. 文件命名与 prompt

图片和 prompt 建议使用相同 stem：

```text
<purpose>[.<model>].<image-extension>
<purpose>[.<model>].txt
```

- `<purpose>` 是人可读用途，使用简短 kebab-case。
- `<model>` 是可选的人工备注。已知且值得保留时可写入文件名；未知或不想维护时直接省略，不使用 `unknown-model` 占位。
- `.txt` 是为了方便重新生成和调整 prompt 而保留的人工档案，可以附带少量备注；没有必填字段、标题或机器可读 Schema，也不由自动化要求必须存在。
- 配对命名是人工约定，仓库不扫描、强制或修复图片/prompt 配对。
- 重新生成可以直接覆盖图片与 prompt。是否保留旧版由作者自行决定；仓库不维护素材修订号或历史 digest。

## 5. 禁止的审计文件与扫描

AIGC 归档不再创建或要求：

- `service-terms-review*.json`；
- `provenance.json`；
- `inputUseReview`、`contentAdmissionReview`、`termsReview` 或类似审计记录；
- source/prompt/output digest 文件；
- candidate/selected/runtime 版权准入状态；
- 条款证据、权利受益人证明、输入权利证明或完整生成链。

许可验证器、素材验证器、本地工程 gate 和未来发布验证器均不读取、遍历或判定 `art-source/aigc/**`。该目录不是运行时输入，也不进入 E2E/PoC Web Artifact。

## 6. 入选素材提升

最终采用的图片通过人工复制进入以下任一运行时目录：

```text
packages/assets/**
stories/<story>/assets/**
```

提升后的图片按普通游戏素材处理：

- 不复制 prompt、服务条款、provenance、来源目录、生成日期或人工审计数据；
- 不添加 AIGC 专用 sidecar、许可记录或版权检查；
- 不要求从运行时素材反向追溯到 `art-source/aigc/**`；
- 只受游戏运行时需要的路径、格式、尺寸、安全区、Asset ID、资源引用和构建排除等技术规则约束。

OpenAI、Google Gemini、xAI Grok 和本地 ComfyUI 输出都遵循同一提升流程。是否采用由项目所有者人工决定，不建立按来源差异化的自动准入门禁。

## 7. Asset Pack digest

入选后的运行时素材可以参与 Asset Pack digest。digest 由构建或 Story 解析过程从最终 manifest 和文件字节自动计算，不由人编辑，也不写回 AIGC 归档。

Asset Pack digest 只用于：

- 确定性构建与重放身份；
- 缓存失效；
- 存档和运行时兼容诊断；
- 识别最终运行时素材集合变化。

它不表示版权归属、许可合规、生成服务、模型、prompt 或归档来源。重新生成并重新复制一张入选图片时，下一次构建自动得到新 digest。

## 8. 当前迁移

现有 `art-source/imagegen/first-web-pack/**` 迁移到 `art-source/aigc/openai/illustrations/`：

- 四张 `source.png` 改为平铺的 `<purpose>.png`；
- 四份 `prompt.md` 改为平铺的 `<purpose>.txt`；
- 删除四份 `provenance.json`；
- 删除 `openai-service-terms-review.v1.json` 和旧 pack README；
- 删除所有针对旧路径、Schema、digest、review 状态和服务条款证据的自动验证。

这四张图仍是概念图，本次迁移本身不将它们复制进 Asset Pack 或 Story。

## 9. 验收边界

实施完成后：

- 仓库不存在 AIGC service-terms review 或 provenance JSON；
- 首批四张图和 prompt 可在 `art-source/aigc/openai/illustrations/` 直接浏览和编辑；
- 没有测试、CI 或发布步骤扫描 `art-source/aigc/**` 的许可、provenance、prompt 配对或 digest；
- `art-source/aigc/**` 不进入 E2E/PoC Web Artifact；
- 未入选归档图片的变化不影响 Asset Pack digest；
- 最终运行时素材字节变化会由构建自动反映到 Asset Pack digest。
