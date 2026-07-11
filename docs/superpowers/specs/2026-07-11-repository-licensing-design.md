# Project Tavern 仓库许可与第三方材料治理设计

日期：2026-07-11

状态：已实施；标准许可证与治理文件见仓库根目录

版权主体：Jun Jiang（互联网 ID：jasl）

实施入口：[`../../../LICENSE.md`](../../../LICENSE.md)

实施计划：[`../plans/2026-07-11-repository-licensing-implementation.md`](../plans/2026-07-11-repository-licensing-implementation.md)

## 1. 设计结论

本仓库采用三层许可，而不是用一份许可证笼统覆盖所有文件：

1. 通用游戏运行时、UI 框架和通用 Loader 以 MIT License 真正开源；
2. 酒馆游戏专用软件以 PolyForm Noncommercial License 1.0.0 公开源码，允许非商业使用、修改和分发；
3. 项目原创剧情、文案、美术、音频和设计文档以 Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International 许可，允许非商业分享与改编，公开改编须保持相同许可。

因此，对外表述固定为：

> Engine components are open source under the MIT License. Game-specific software and original content are source-available for noncommercial use.

中文表述固定为：

> 引擎组件以 MIT License 开源；游戏专用软件和原创内容公开源码，仅许可非商业使用。

不得把整个仓库简称为“MIT 项目”或“开源游戏”。含禁止商用条款的部分不符合 OSI 对 Open Source 的定义。

## 2. 目标与非目标

### 2.1 目标

- 允许第三方自由地商业或非商业使用通用 Engine；
- 允许玩家非商业制作和发布 Fork、Mod、汉化、移植、同人游戏与内容改编；
- 禁止使用项目游戏专用代码、剧情、人物、美术或其他受保护表达制作商业产品或商业衍生品；
- 保留版权主体自行商业发布、签约发行商或另行授予商业许可证的权利；
- 让每个仓库文件和最终发布制品都能确定其许可证与来源；
- 防止第三方、商业购买或权属不明材料被根许可证错误地重新授权。

### 2.2 非目标

- 不编写自定义“非商业”许可证文本；
- 不修改 MIT、PolyForm 或 CC 的标准法律文本；
- 不用版权许可阻止他人独立实现抽象玩法、规则思想或通用工程模式；
- 不把项目名称、Logo、角色标识或其他商标权自动包含在版权许可中；
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

### 4.1 MIT：通用 Engine

以下项目自有代码默认为 MIT：

- `packages/base/**`；
- `packages/ui/**`；
- 保持通用 Loader/Host 边界的 `apps/web/**`；
- 明确放入通用 Engine/tooling 子目录的构建、摘要、打包和 testkit 代码；
- 上述包内直接随代码提供的 API 文档与示例。

MIT 区域不得包含：

- 酒馆专用 State、Command、Fact、规则、数值和稳定 ID；
- Story 剧情、人物设定、本地化正文或世界观表达；
- 项目专属皮肤、Logo、角色图片、背景、音频和其他游戏素材；
- 只为 Demo 或正式 Story 服务的 fixture、测试内容与 Hotfix。

若 `apps/web` 后续出现游戏专属代码，该代码必须移动到 Story/Module，或以文件级声明改受 PolyForm/CC 管理；不能因为位于 MIT 目录就自动获得 MIT。

### 4.2 PolyForm Noncommercial：游戏专用软件

以下项目自有软件默认适用 `PolyForm-Noncommercial-1.0.0`：

- `packages/modules/**`；
- `stories/**` 中的 TypeScript/JavaScript、规则、数值、配置、Scene glue、Hotfix 和游戏专用测试；
- E2E/Sandbox Story 与依赖酒馆 Modules 的集成测试；
- Story 专用构建、校验、迁移和内容编译工具；
- 未被范围表或文件级声明明确归入 MIT/CC 的其他项目自有软件。

第三方可以为非商业目的使用、修改和分发这些软件，包括发布非商业 Fork、Mod、汉化和移植。任何包含这些受保护代码或其改编的商业发行，需要另行取得 Jun Jiang 的书面商业许可。

### 4.3 CC BY-NC-SA：原创内容

以下项目自有内容默认适用 `CC-BY-NC-SA-4.0`：

- `docs/**` 中的游戏设计、玩法、剧情、美术和研究文档；
- `art-source/**` 中经权属和服务条款审批的原创素材；
- Story 的原创剧情正文、本地化文本、角色/世界设定；
- 原创图片、动画、模型、音乐、语音、音效和宣传素材；
- `packages/assets/**`、`stories/*/assets/**` 与 `stories/*/content/**` 中明确标记为项目原创内容的文件。

代码文件中的实质可执行实现仍按其软件目录适用 MIT 或 PolyForm；文档中从代码包复制的实质代码片段沿用来源代码许可证。纯粹的 API 名称、短小调用示例和不受版权保护的事实不因此改变归属。

公开分享 CC 内容的改编版本必须署名、注明修改，并继续采用 CC BY-NC-SA 4.0 或其允许的兼容许可。项目标准许可只约束版权及类似权利范围内的具体表达，不授予商标、肖像、隐私或其他权利。

### 4.4 混合目录与文件级覆盖

`packages/assets` 和 Story 目录天然可能同时包含代码与内容，不能只靠最近的父目录猜许可证：

- 代码按 MIT 或 PolyForm；
- 原创媒体、正文和设计数据按 CC；
- 二进制文件使用同名 sidecar 或聚合 manifest 记录许可证；
- 第三方文件使用自己的原始许可证记录；
- package metadata 遇到混合许可时使用 `SEE LICENSE IN LICENSE.md`，不能错误写成单一 SPDX ID。

文件级声明优先于目录默认值，但只能在版权主体确实有权授权时使用。

## 5. 复合发布制品

网页 Player bundle 是多许可证聚合制品：

- MIT 代码仍可被单独提取并用于商业项目；
- PolyForm/CC 内容不会因为与 MIT 代码打包而变成 MIT；
- 包含游戏专用软件或原创内容的整个 Player bundle 只能按所有组成许可证的交集使用，因此不能商业使用；
- 构建产物必须同时携带项目范围说明、Required Notice、第三方 Notices 和法律文本或稳定 URL；
- Source map、独立素材包或可下载 Story 包也遵循相同范围，不是绕开许可的第二分发渠道。

## 6. 第三方材料总原则

项目许可证只授权 Jun Jiang 拥有或有权再许可的部分。任何第三方代码、字体、图标、图片、模型、音频、数据、翻译、购买素材、插件和生成服务输出都遵守其原始许可证、合同或服务条款；根级 MIT、PolyForm 和 CC 声明不覆盖这些材料。

第三方材料只有同时满足以下条件才可进入 Git、构建或发布制品：

1. 能从权威来源确认精确版本或内容摘要；
2. 有明确、适用于该材料和预期用途的许可证或书面授权；
3. 允许所需的复制、修改、仓库公开和/或成品分发；
4. 与目标制品中其他许可证兼容；
5. 已保存所需版权声明、许可证文本、署名、修改说明和源代码提供义务；
6. 已登记到 `THIRD_PARTY_NOTICES.md` 或素材 provenance manifest。

每条第三方记录至少包含：

- 名称、版本、来源 URL 与内容 hash；
- 已知版权主体；
- SPDX ID 或原始许可证/合同名称；
- 本地法律文本或权威链接；
- 本项目使用和修改范围；
- 进入的源码路径与发布制品；
- 是否允许公开原始文件、修改、商用和 AIGC 输入；
- 必须随发行提供的 notice、attribution、source offer 或其他义务。

“遵守原始协议”不等于一律可以使用。若原协议禁止公开源文件、修改、再分发或与当前组合方式不兼容，则该材料不能进入对应仓库或制品。

## 7. 无版权声明或无许可证材料

“文件上没有 copyright 行”与“没有可验证许可”不是同一件事：

- 单个文件没有版权行，但其权威上游仓库/发行包有清晰覆盖该文件的许可证，可以按上游许可证处理并保留完整证据；
- 有明确许可证但版权主体不详时，保留原始许可证与来源，不自行猜测或补写作者；
- 整个来源没有许可证、许可证范围含糊、无法确认该版本是否受许可证覆盖，或只有“网上公开可见”，一律标记为 `unverified/all-rights-reserved`；
- 没有版权声明不能被解释为 public domain、免费素材、MIT、CC0 或默认允许非商业使用。

`unverified/all-rights-reserved` 材料默认禁止：

- 提交到仓库；
- 复制、改写或翻译进项目；
- 进入运行时、测试 fixture、截图、文档或发布包；
- 作为 AIGC 输入；
- 仅因已购买、可下载、可 Fork 或位于公共仓库而改变上述结论。

解除阻断只能依靠以下任一证据：

1. 权威来源中可验证且覆盖目标版本/文件的许可证；
2. 权利人提供的明确书面授权；
3. 有证据的 public-domain/CC0 声明；
4. 针对具体用途完成并记录的专项法律审查。

首版不以 fair use/fair dealing 作为生产素材准入通道。若未来确需依赖法定例外，必须逐项法律审查并在制品中明确标记，不得让项目许可证看似覆盖该材料。

## 8. `references/` 与研究材料

`references/` 已被 `.gitignore` 忽略，并继续满足：

- 不提交、不打包、不部署；
- 构建、测试、代码生成和 AIGC 管线不得读取；
- 只用于人工观察通用模式；
- 每项来源在 `docs/research/reference-register.md` 登记；
- 本地存在不表示项目获得复制、修改或再分发权；
- 根许可证和最终 Player Notices 都不覆盖其中内容。

CI 还应断言不存在已跟踪的 `references/` 文件，并检查生产 import graph、asset manifest 与生成输入中没有该路径。

## 9. 商业素材、依赖与 AI 素材

- 购买素材如果只允许随成品发布、禁止公开源文件，保留在私有素材源；公开仓库只保存占位符、Asset ID、获取说明和不泄露受保护内容的 metadata；
- npm 依赖按 lockfile 精确版本审计；缺失或不兼容许可证阻止 Player 构建，不能只信 package metadata 的一个字符串；
- Lucide、字体等依赖保留自己的许可证和 attribution；
- AI 素材记录服务、模型、日期、提示词、输入、输出 hash 和当时条款；只有确认有公开分发与再许可权时才标为项目 CC 内容；
- 权属或服务条款不确定的 AI 输出可以留在本地候选区，不进入 Git、Player 或 Pages；
- 商业素材和 `references/` 永不作为生成输入，除非未来取得针对该操作的明确授权并修改本规格。

## 10. 名称、Logo 与商标

项目名称、Logo、角色名称/标识及其他品牌元素不因代码或内容许可证而获得商标授权。根范围声明使用：

```text
Project names, logos, character marks, and other brand identifiers are not licensed under the repository licenses. All trademark rights are reserved by Jun Jiang.
```

这不阻止为说明兼容性、来源或合理署名而进行法律允许的指称性使用，但不得暗示官方认可。

## 11. 外部贡献与未来商业授权

Jun Jiang 可以对自己拥有的同一作品另行授予商业许可证。标准非商业许可不会限制版权主体本人商业使用。

外部贡献者仍拥有其贡献版权。若直接按 PolyForm/CC 接受贡献，Jun Jiang 未必能把这些贡献另行用于商业版本。因此首版政策是：

- MIT Engine 区可以按明确的 inbound=outbound MIT 贡献条款接受贡献；
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
- `THIRD_PARTY_NOTICES.md` 只登记实际进入仓库/制品的第三方材料，不登记本地 `references/` 全量内容；
- `TRADEMARKS.md` 记录未授予的品牌权利；
- `CONTRIBUTING.md` 冻结 inbound 许可和 CLA 闸门。

每个 npm package 的 `package.json.license` 必须与目录范围一致：单一 MIT 或 PolyForm 包写标准 SPDX ID；混合包写 `SEE LICENSE IN LICENSE.md`。二进制素材通过 sidecar/manifest 映射，不能塞源码注释。

## 13. 自动化与发布闸门

实施阶段至少增加以下检查：

- 每个 workspace package 都有合法 `license` metadata；
- 每个发布文件恰好解析到一个项目许可范围或一个第三方记录；
- 不存在 `unknown`/`unverified` 第三方输入；
- `references/` 没有被跟踪、导入、打包或作为 AIGC 输入；
- MIT import graph 不依赖 PolyForm/CC 的游戏专用实现；
- Player artifact 同时携带 License scope、NOTICE、法律文本和实际第三方 notices；
- 许可证扫描结果使用 lockfile、最终 bundle manifest 和素材 manifest，而不是只扫描源码目录；
- CI 不自动“修复”或猜测许可证，发现未知项即失败并要求人工审查。

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
5. 无许可、商业素材、AI 素材和 `references/` 是否都默认拒绝进入生产；
6. Player bundle 是否清楚说明多许可证交集；
7. 商标保留和贡献/CLA 闸门是否符合未来可能商业发行的需要；
8. 是否还有任何文件会因为“位于公开仓库”而被误认为自动获得许可。
