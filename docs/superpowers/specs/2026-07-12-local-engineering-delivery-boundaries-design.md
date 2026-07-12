# Project Tavern Local Engineering Delivery Boundaries Design

日期：2026-07-12

状态：已确认，适用于 Phase 2 及以后计划

## 1. 决策

Project Tavern 的第一轮交付不再把素材制作、人工试玩、CI 或远端托管混入同一个长期 Goal。工作被拆成四条拥有独立完成条件的轨道：

1. **素材准备轨道**：先行、独立、由项目所有者批准；
2. **本地工程轨道**：Phase 2–6 的唯一长期 Goal，可无人值守执行；
3. **最终人工审查轨道**：工程质量和完整流程验收之后执行；
4. **远端分发轨道**：明确 defer，未来作为独立任务设计和实施。

轨道之间只通过版本化、可检查的制品交接，不共享隐式状态，也不把后置人工或远端条件反向变成工程验收门禁。

## 2. 素材准备轨道

素材准备遵循 `docs/art/first-web-visual-pack.md` 与 AIGC 归档规范，排在工程 Goal 之前，但不属于该 Goal：

- Image Gen、外部 AIGC、人工筛选、风格/角色一致性判断和许可判断均在这条轨道完成；
- 只有项目所有者明确采用并复制到 runtime asset root 的文件才进入技术 Asset Pack；
- 轨道结束时提交始终存在且可为空的 `approvedPocAssetPacksV1`、对应 provider bytes 和机械测试，作为 Phase 0/工程 Goal 的唯一版本化素材交接；
- 素材轨道可以只批准一部分槽位；未批准或缺失的槽位继续使用 Story 登记的 code-native/static fallback；
- 工程 Goal 不生成、挑选、提升或宣称批准素材，也不会因某张概念图未完成而停止；
- 素材提升后必须通过 manifest、尺寸、摘要、构建和 runtime demand 验证，这些机械检查属于工程轨道；审美与采用决定仍属于素材轨道。

因此“先行”表示工作顺序和输入冻结，不表示正式素材完整度成为 Engine/UI 的必要条件。

## 3. 本地工程轨道

本地工程轨道从已验证的 Phase 1 基线开始，依次执行 Phase 2–6。它只交付本地可验证的软件与静态制品：

- `@project-tavern/base`、`@project-tavern/ui`、Web Host、E2E Story 与 PoC Story；
- Persistence、Diagnostics、Semantic Automation、Input 和可访问 UI；
- `dist/e2e` 与 `dist/poc`；
- 可复现构建、artifact manifest、nested-base smoke 和本地 runbook；
- 一个通过完整自动化验收、可交给人工试玩或任意未来分发适配器的 PoC Artifact。

这条轨道明确不创建或验证：

- `.github/workflows/**`；
- GitHub Actions、GitHub Pages、Cloudflare Pages/Workers 或其他托管配置；
- 上传、部署、远端 smoke、远端权限、environment protection 或回滚操作；
- 人工素材批准、VoiceOver 实机结论、主观趣味性结论或人工试玩通过。

`base: "./"`、HashRouter、相对资源路径、无 source map、nested-base smoke 和确定性 manifest 保留，因为它们是平台中立的静态 Artifact 质量，而不是 GitHub Pages 特化。

## 4. 技术基线审查

Save/Debug fixture、golden、command corpus 和 code-native UI screenshot 是工程测试制品，不是素材批准。长期 Goal 的执行 agent 可以在不暂停等待人工确认的情况下审查并提交它们，但必须留下可复核证据：

- writer 只写显式 allowlist，并先在临时目录生成完整集合；
- 首次生成的 untracked 文件先 `git add -N` 或生成排序后的 path/size/SHA-256 manifest，不能依赖看不到新文件的普通 `git diff`；
- writer 中断后，逐字节等于当前 builder 输出的文件可安全复用；foreign bytes 必须停止而不是覆盖；
- JSON/文本基线记录 canonical diff、分类、关键身份和摘要；
- screenshot 首次逐张检查，后续生成 expected/actual/diff 或 contact sheet；固定检查 clipping、overlap、focus、dialog、Stage/HUD、热点和 fallback；
- checkpoint 记录 reviewer=`agent`、文件路径、摘要、检查结果和任何接受理由；
- 普通 `verify` 永远只读，不能自动接受新输出。

这一授权不适用于 AIGC/商业素材采用、角色审美、许可判断或人工试玩结论。

## 5. Goal 启动前物化预检

长期 Goal 启动前必须先完成一次自动化、只读优先的 Phase 0（roadmap `R1.5`）物化预检。它用于在任何实现前发现外部环境问题：

- clean Git 状态、当前非 detached branch、phase-base ancestor 和可用 Git identity；
- 精确 Node、pnpm、TypeScript 与 package-manager 输入；
- frozen lockfile、所需 npm 包和可离线复用的 pnpm store；
- 当前 host OS/architecture，以及 Chromium/WebKit 精确 revision 与 executable availability；
- visual verifier 所需 `@fontsource/noto-sans-sc` 字体、浏览器和依赖已物化，后续 `verify:ui-visual` 只允许 offline/frozen 消费；
- screenshot baseline 记录 OS、architecture、Playwright/Chromium、字体版本、viewport、deviceScaleFactor 与 reduced-motion 组成的本机视觉环境指纹；指纹不匹配必须以 `visual_environment_mismatch` 停止并显式 rebaseline，不承诺跨平台像素一致；
- Phase 1/2 与 Phase 5 冻结的 `127.0.0.1:4173`、`4174`、`41731`、`41732` 可独占绑定；
- 不检查 GitHub token、Pages、Cloudflare 或任何远端发布权限。

本地 attestation 记录物化时的 clean commit；后续只要求该 commit 仍是当前 `HEAD` 的祖先，且工具链、物化合同和 canonical 外部 package closure 未变化。Phase 2–6 的源码提交和不改变外部闭包的 workspace importer 调整不会使 attestation 失效。若预检失败，必须在 Phase 2 开始前以稳定 external-precondition 证据退出。预检通过后，Phase 2–6 不得再通过 `pnpm view`、`npx --yes`、隐式浏览器下载或其他临时联网引入新的外部依赖。

## 6. 无人值守恢复合同

每个任务以独立 commit 和验收命令为恢复点：

1. 记录 phase-base、最后完成 task SHA、当前 HEAD 和 porcelain status；
2. 已存在且内容匹配的 task commit 先复验，再跳到下一任务；
3. dirty task 只能在该任务 `Files` allowlist 内继续，保留范围外用户改动；
4. expected-red 只有在指定测试名和稳定诊断 code 匹配时才算预期失败；
5. writer 输出按本设计第 4 节恢复，不得盲目重写；
6. 提交前检查 exact staged paths、cached diff、tracked/untracked 完整集合和剩余 worktree；
7. 每个 phase gate 写 checkpoint；checkpoint 是证据，不是第二套运行时状态。

模型容量中断、进程退出或 Goal continuation 不要求从头重做已经验证并提交的任务。

## 7. 最终人工审查轨道

最终人工审查只在本地工程 Goal 的完整质量门禁和端到端流程验收全部通过之后开始。它消费一个固定 source SHA 和 Artifact manifest digest，覆盖：

- 人工完整七日流程与不同策略体验；
- 操作疲劳、信息焦点、数值取舍、叙事节奏和关系表现；
- 已批准素材在真实 UI 中的一致性和可读性；
- 横屏平板、触摸、Safari/VoiceOver 等无法由当前自动化充分证明的体验；
- 主观是否值得继续、需要调整玩法或进入下一轮内容生产。

人工发现的问题形成新的工程或内容任务；它不修改已经记录的自动化验收事实，也不要求工程 Goal 宣称“好玩”或“人工通过”。

## 8. 远端分发轨道

远端分发明确 defer，未来单独设计。候选目标可以包括 GitHub Actions + GitHub Pages、Cloudflare Pages/Workers、Electron 或其他包装器。无论目标为何，都必须：

- 消费本地工程轨道已经验证的 exact Artifact 和 manifest；
- 不重新构建部署内容；
- 独立处理凭据、权限、保护环境、上传、缓存、远端 identity smoke 和回滚；
- 不把目标特定 SDK、workflow、依赖或权限引回 Base/UI/Story；
- 在单独获得用户授权后才产生远端副作用。

该轨道不属于第一轮长期 Goal，也不进入其 Definition of Done。

## 9. 第一轮完成定义

第一轮工程完成只表示：

- Phase 2–6 本地计划和全部自动化 gate 在同一可审查 commit chain 上通过；
- code-native fallback 足以完成完整流程；
- `dist/poc` 可复现、nested-base-safe、平台中立且通过 prebuilt smoke；
- 技术 baseline 已按 agent 证据流程审查；
- 工作树和所有保留变更被准确报告。

素材批准、人工试玩和远端发布分别由其他轨道声明自己的结果，不能由本地工程 Goal 代为推断。
