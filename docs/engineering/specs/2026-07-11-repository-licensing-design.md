# Project Tavern 仓库许可与第三方材料治理设计

日期：2026-07-11

状态：已实施；标准许可证与治理文件见仓库根目录

版权主体：Jun Jiang（互联网 ID：jasl）

实施入口：[`../../../LICENSE.md`](../../../LICENSE.md)

## 1. 设计结论

本仓库采用三层许可，而不是用一份许可证笼统覆盖所有文件：

1. 通用游戏运行时、UI 框架和通用 Loader 以 MIT License 真正开源；
2. 酒馆游戏专用软件以 PolyForm Noncommercial License 1.0.0 公开源码，允许非商业使用、修改和分发；
3. 项目原创剧情、文案、美术、音频和设计文档以 Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International 许可，允许非商业分享与改编，公开改编须保持相同许可。

因此，对外表述固定为：

> SillyMaker engine components are open source under the MIT License. Project Tavern game-specific software and original content are source-available for noncommercial use.

中文表述固定为：

> SillyMaker 引擎组件以 MIT License 开源；Project Tavern 游戏专用软件和原创内容公开源码，仅许可非商业使用。

不得把整个仓库简称为“MIT 项目”或“开源游戏”。含禁止商用条款的部分不符合 OSI 对 Open Source 的定义。

## 2. 目标与非目标

### 2.1 目标

- 允许第三方自由地商业或非商业使用 SillyMaker 通用引擎；
- 允许玩家非商业制作和发布 Fork、Mod、汉化、移植、同人游戏与内容改编；
- 禁止使用项目游戏专用代码、剧情、人物、美术或其他受保护表达制作商业产品或商业衍生品；
- 保留版权主体自行商业发布、签约发行商或另行授予商业许可证的权利；
- 让每个项目自有仓库文件能确定其 MIT、PolyForm 或 CC 范围；
- 防止放入 `vendor/**` 的第三方材料被根许可证错误地重新授权。

### 2.2 非目标

- 不编写自定义“非商业”许可证文本；
- 不修改 MIT、PolyForm 或 CC 的标准法律文本；
- 不用版权许可阻止他人独立实现抽象玩法、规则思想或通用工程模式；
- 不把项目名称、Logo、角色标识或其他商标权自动包含在版权许可中；
- 不对 npm 直接、传递、开发或生产依赖进行逐包版权取证、许可扫描或发布准入裁决；
- 不对 `vendor/**` 做自动许可分类、完整性扫描或 public-domain 身份判定；
- 本规格不替代针对具体发行、众筹、赞助、直播获利或司法辖区争议的律师意见。

## 3. 版权声明

根级版权声明使用：

```text
Copyright © 2026 Jun Jiang (jasl).
All rights reserved except as expressly granted by the licenses identified for each part of this repository.
```

MIT 法律文本中的声明使用 ASCII 形式：

```text
Copyright (c) 2026 Jun Jiang (jasl)
```

PolyForm Required Notice 使用：

```text
Required Notice: Copyright 2026 Jun Jiang (jasl).
```

CC 内容标记使用：

```text
© 2026 Jun Jiang (jasl). Licensed under CC BY-NC-SA 4.0 except where otherwise noted.
```

后续年份有新的可版权贡献时可以改为覆盖首次和最近贡献年份的范围（例如 `2026–2028`），不因普通构建或机械格式化自动推进年份。

## 4. 许可证范围

### 4.1 MIT：SillyMaker 通用引擎

以下项目自有代码默认为 MIT：

- `engine/packages/base/**`；
- `engine/packages/ui/**`；
- 保持通用 Loader/Host 边界的 `engine/packages/web/**`；
- 明确放入 SillyMaker 通用引擎/tooling 子目录的构建、摘要、打包和 testkit 代码；
- 上述包内直接随代码提供的 API 文档与示例。

MIT 区域不得包含：

- 酒馆专用 State、Command、Fact、规则、数值和稳定 ID；
- Story 剧情、人物设定、本地化正文或世界观表达；
- 项目专属皮肤、Logo、角色图片、背景、音频和其他游戏素材；
- 只为 E2E 或 PoC Story 服务的 fixture、测试内容与 Hotfix。

若 `engine/packages/web` 后续出现游戏专属代码，该代码必须移动到 Story/Module，或以文件级声明改受 PolyForm/CC 管理；不能因为位于 MIT 目录就自动获得 MIT。

### 4.2 PolyForm Noncommercial：游戏专用软件

以下项目自有软件默认适用 `PolyForm-Noncommercial-1.0.0`：

- `game/stories/**` 中的 TypeScript/JavaScript、Story-local GameplayModules、规则、数值、配置、Scene glue、Hotfix 和游戏专用测试；
- E2E/PoC Story 及其 Gameplay 集成测试；
- Story 专用构建、校验、迁移和内容编译工具；
- 未被范围表或文件级声明明确归入 MIT/CC 的其他项目自有软件。

第三方可以为非商业目的使用、修改和分发这些软件，包括发布非商业 Fork、Mod、汉化和移植。任何包含这些受保护代码或其改编的商业发行，需要另行取得 Jun Jiang 的书面商业许可。

### 4.3 CC BY-NC-SA：原创内容

以下项目自有内容默认适用 `CC-BY-NC-SA-4.0`：

- `docs/**` 中的游戏设计、玩法、剧情、美术和研究文档；
- `art-source/**` 中的项目创作与 AIGC 来源档案；
- Story 的原创剧情正文、本地化文本、角色/世界设定；
- 原创图片、动画、模型、音乐、语音、音效和宣传素材；
- `game/packages/assets/**`、`game/stories/*/assets/**` 与 `game/stories/*/content/**` 中明确标记为项目原创内容的文件。

代码文件中的实质可执行实现仍按其软件目录适用 MIT 或 PolyForm；文档中从代码包复制的实质代码片段沿用来源代码许可证。纯粹的 API 名称、短小调用示例和不受版权保护的事实不因此改变归属。

公开分享 CC 内容的改编版本必须署名、注明修改，并继续采用 CC BY-NC-SA 4.0 或其允许的兼容许可。项目标准许可只约束版权及类似权利范围内的具体表达，不授予商标、肖像、隐私或其他权利。

### 4.4 混合目录与文件级覆盖

`game/packages/assets` 和 Story 目录天然可能同时包含代码与内容，不能只靠最近的父目录猜许可证：

- 代码按 MIT 或 PolyForm；
- 原创媒体、正文和设计数据按 CC；
- 项目运行时二进制素材继承其所在项目 package/Story 的许可范围；runtime manifest 只记录技术加载与 digest 字段，不要求逐图片版权 sidecar；
- `vendor/**` 中的第三方文件保留并遵守各自的版权、许可、合同或 public-domain 状态，不因目录位置获得项目许可；
- package metadata 遇到混合许可时使用 `SEE LICENSE IN LICENSE.md`，不能错误写成单一 SPDX ID。

文件级声明优先于目录默认值，但只能在版权主体确实有权授权时使用。

## 5. 复合发布制品

PoC Web Artifact 是多许可证聚合制品：

- MIT 代码仍可被单独提取并用于商业项目；
- PolyForm/CC 内容不会因为与 MIT 代码打包而变成 MIT；
- 包含游戏专用软件或原创内容的整个 PoC Web Artifact 只能按所有组成许可证的交集使用，因此不能商业使用；
- 构建产物携带项目范围说明、Required Notice 和项目标准法律文本或稳定 URL；
- Source map、独立素材包或可下载 Story 包也遵循相同范围，不是绕开许可的第二分发渠道。

## 6. 第三方材料总原则

项目许可证只授权 Jun Jiang 拥有或有权再许可的部分。npm、浏览器、操作系统、构建工具和其他生态系统依赖不因本仓库的 MIT、PolyForm 或 CC 范围而被重新授权；它们继续遵守各自条款。

任何有意复制进仓库的第三方源码、二进制、字体、图标、图片、模型、音频、数据或翻译统一放在 `vendor/**`。`vendor/**` 是归档和许可范围隔离边界，不是自动准入系统：

- `vendor/**` 中的每项内容保留并遵守其自身的版权、许可证、合同、声明或 public-domain 状态；
- 项目许可、根级版权声明和包级 metadata 均不适用于 `vendor/**`；
- 仓库验证器不枚举、扫描、猜测或裁决 `vendor/**` 内容的许可、版权主体或 public-domain 身份；
- `THIRD_PARTY_NOTICES.md` 只说明这一隔离边界，不是 npm 依赖清单、`vendor/**` 完整清单或法律审计报告。

这一边界不会自动确认某项内容可以使用，也不把许可合规变成构建器的机械发布门禁。对高风险的商业素材或特殊发行合同，项目所有者可在需要时单独做人工或专业审查。

## 7. 版权声明、许可和 public domain

第三方材料可能有标准开源许可、自定义条款、合同限制、书面授权、CC0 或 public-domain 状态，也可能没有逐文件 copyright 行。本仓库不用自动扫描器把这些情况压成一个强制分类，也不因缺少某个文件就自动判定为不合规。

项目范围声明只做两件事：

1. 明确 `vendor/**` 不受本项目 MIT、PolyForm 或 CC 授权覆盖；
2. 提醒使用者和分发者遵守各项材料实际适用的原始条款或 public-domain 状态。

是否需要针对某项高风险商业素材、专有 SDK 或特殊发行场景做进一步审查，由项目所有者按具体情况决定，不作为普通开发、测试、构建或发布的通用机械门禁。

## 8. `references/` 与研究材料

`references/` 已被 `.gitignore` 忽略，并继续满足：

- 不提交、不打包、不部署；
- 构建、测试、代码生成和 AIGC 管线不得读取；
- 只用于人工观察通用模式；
- 每项来源在 `docs/research/reference-register.md` 登记；
- 本地存在不表示项目获得复制、修改或再分发权；
- 根许可证和最终 PoC Artifact notices 都不覆盖其中内容。

本地工程 gate 还应断言不存在已跟踪的 `references/` 文件，并检查生产 import graph、asset manifest 与生成输入中没有该路径；未来 CI 必须复用同一边界。

## 9. 商业素材、依赖与 AI 素材

- 购买素材如果只允许随成品发布、禁止公开源文件，保留在私有素材源；公开仓库只保存占位符、Asset ID、获取说明和不泄露受保护内容的 metadata；
- npm 依赖通过精确 manifest 和 frozen lockfile 管理可重现性；无论直接、传递、开发或生产依赖，均不做逐包许可取证、`THIRD_PARTY_NOTICES.md` 登记或构建阻断；
- Lucide、字体等若作为依赖安装则遵守各自原始条款；若将其文件有意复制进仓库，则放入 `vendor/**`；
- AIGC 素材按生成来源归档在 `art-source/aigc/<source>/**`；来源目录之下自由组织，模型名和 prompt 文件均可选，不维护逐输出审计 JSON、digest、时间戳、输入链或许可判断；
- AIGC 来源档案可以进入 Git，但不进入 E2E/PoC Web Artifact、远端分发输入或自动许可扫描。采用的图片由作者人工复制到 `game/packages/assets/**` 或 Story asset 目录，之后作为普通运行时资产处理；
- 商业素材和 `references/` 永不作为生成输入，除非未来取得针对该操作的明确授权并修改本规格。

### 9.1 AIGC 来源归档与运行时提升

具体目录、命名和迁移规则以 `docs/engineering/specs/2026-07-12-aigc-asset-archive-design.md` 为准。仓库只固定第一层来源目录；OpenAI、Google Gemini、xAI Grok 与本地 ComfyUI 使用同一种人工归档和提升流程，不建立服务特定的自动准入机制。

prompt 是为了方便重新生成和调整而保留的人工作业档案，不是自动化必需项；模型未知或不想维护时直接省略模型名，不写 `unknown-model`。归档图片可以被覆盖或重组，不记录源 digest。

运行时选择与来源归档完全解耦。被采用的图片复制到 runtime asset package 或 Story 后，只接受稳定 Asset ID、相对路径、媒体类型、尺寸、字节数和精确文件摘要等技术验证。Asset Pack digest 由 runtime manifest 的 canonical projection 自动计算并间接绑定精确资源 bytes，只用于确定性、缓存、存档身份和诊断，不是版权、来源或服务条款记录。

## 10. 名称、Logo 与商标

项目名称、Logo、角色名称/标识及其他品牌元素不因代码或内容许可证而获得商标授权。根范围声明使用：

```text
Project names, logos, character marks, and other brand identifiers are not licensed under the repository licenses. All trademark rights are reserved by Jun Jiang.
```

这不阻止为说明兼容性、来源或合理署名而进行法律允许的指称性使用，但不得暗示官方认可。

## 11. 外部贡献与未来商业授权

Jun Jiang 可以对自己拥有的同一作品另行授予商业许可证。标准非商业许可不会限制版权主体本人商业使用。

外部贡献者仍拥有其贡献版权。若直接按 PolyForm/CC 接受贡献，Jun Jiang 未必能把这些贡献另行用于商业版本。因此首版政策是：

- MIT SillyMaker 引擎区可以按明确的 inbound=outbound MIT 贡献条款接受贡献；
- PolyForm/CC 区在正式 Contributor License Agreement 或版权转让机制完成前，不接受外部内容/代码合并；
- 机器人依赖更新和纯机械修改仍需确认没有引入新的版权表达或许可证；
- CLA 至少要授予项目维护者复制、修改、分发、再许可和商业使用贡献的权利，同时保留贡献者合理署名。

若暂时不启用 CLA，`CONTRIBUTING.md` 必须清楚写明受限区域不接受贡献，不能在收到 PR 后再口头补许可。

## 12. 计划文件布局

正式实施采用：

```text
LICENSE.md
NOTICE
LICENSES/
  MIT.txt
  PolyForm-Noncommercial-1.0.0.txt
  CC-BY-NC-SA-4.0.txt
THIRD_PARTY_NOTICES.md
TRADEMARKS.md
CONTRIBUTING.md
```

其中：

- `LICENSE.md` 是范围导航与版权声明，不修改三份标准许可证；
- `NOTICE` 包含 PolyForm 的逐字 `Required Notice:` 行；
- `LICENSES/` 保存标准法律文本；
- `THIRD_PARTY_NOTICES.md` 说明 npm 依赖与 `vendor/**` 保留各自原始条款，不维护逐项依赖或 vendor 清单，也不登记本地 `references/` 内容；
- `TRADEMARKS.md` 记录未授予的品牌权利；
- `CONTRIBUTING.md` 冻结 inbound 许可和 CLA 闸门。

每个 npm package 的 `package.json.license` 必须与目录范围一致：单一 MIT 或 PolyForm 包写标准 SPDX ID；混合包写 `SEE LICENSE IN LICENSE.md`。项目自有二进制素材继承 package/Story 范围，技术 manifest 不承担逐图片版权登记。

## 13. 自动化与发布闸门

实施阶段采用以下边界：

- 项目法律文件与 workspace package `license` metadata 由维护者直接评审，不使用存在性、固定哈希或元数据自动闸门；
- 自动化不扫描 npm 依赖或 `vendor/**` 许可，不以第三方 metadata、copyright 行、LICENSE 文件或 public-domain 判定阻断构建；
- `references/` 没有被跟踪、导入、打包或作为 AIGC 输入；
- 自动化不扫描 `art-source/aigc/**` 的许可、prompt 配对、模型名、digest 或来源元数据，也不从该目录构建运行时素材；
- MIT import graph 不依赖 PolyForm/CC 的游戏专用实现；
- PoC Web Artifact 携带项目 License scope、NOTICE 和项目标准法律文本；artifact 检查只验证发布结构和技术 digest，不冻结法律文本哈希；
- PoC Web Artifact 精确携带 `LICENSE.md`、`NOTICE`、`LICENSES/MIT.txt`、`LICENSES/PolyForm-Noncommercial-1.0.0.txt`、`LICENSES/CC-BY-NC-SA-4.0.txt`、`THIRD_PARTY_NOTICES.md` 与 `TRADEMARKS.md`；`CONTRIBUTING.md` 不属于运行制品；
- 本地工程 gate 和未来 CI 均不生成或维护 npm/vendor 版权清单，也不对其做自动法律结论。

## 14. 权威来源

- [MIT License，Open Source Initiative](https://opensource.org/license/mit)
- [Open Source Definition，Open Source Initiative](https://opensource.org/osd)
- [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
- [CC BY-NC-SA 4.0 Deed](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- [CC BY-NC-SA 4.0 Legal Code](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en)
- [Creative Commons FAQ：software 与第三方内容](https://creativecommons.org/faq/)
- [Creative Commons：Marking third-party content](https://wiki.creativecommons.org/wiki/Marking/Creators/Marking_third_party_content)
- [GitHub Docs：Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

标准许可证和平台文档提供通用规则，不构成针对本项目的正式法律意见。项目开始收费、接受发行投资、签署商业素材合同或准备执行侵权主张前，应由熟悉软件与游戏版权的律师复核实际制品和贡献历史。

## 15. 书面评审清单

评审时逐项确认：

1. `Jun Jiang (jasl)` 是否是所有项目自有部分的正确版权主体标记；
2. MIT 区域是否足够中性，且没有想保留非商业限制的游戏表达；
3. PolyForm 与 CC 的目录默认值是否覆盖全部 Story/Module/内容资产；
4. 混合目录是否必须依赖文件级/manifest 映射；
5. 商业素材和 `references/` 是否仍排除在生产与生成输入之外，AIGC 来源档案是否保持不进入构建；
6. PoC Web Artifact 是否清楚说明多许可证交集；
7. 商标保留和贡献/CLA 闸门是否符合未来可能商业发行的需要；
8. 是否还有任何文件会因为“位于公开仓库”而被误认为自动获得许可。
