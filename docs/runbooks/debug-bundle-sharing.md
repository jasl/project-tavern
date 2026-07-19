# DebugBundle 隐私审查与分享

DebugBundle 是本地支持证据，包含完整游戏状态、命令历史、诊断、构建来源，也可能包含界面上下文。它不是
匿名文件、Save 或自动上传协议；本流程始终不自动上传。

## 前置条件

- 明确导出目的。导出、预览、保存都不要求 `debug_tools`/`cheats`，也不改变 RunIntegrity。
- 本地“保存调试包”的同意不等于对第三方分享的同意。分享前必须针对这个 exact 文件、接收者、
  用途、保留期和渠道重新完成隐私审查并取得明确同意。
- 原始 Bundle 上限为 20 MiB；CommandLog 最多 200 条，runtime failures 最多 50 条。
- 文件可能含完整 replay base/current Snapshot、RNG、RunIntegrity、命令参数/结果/Facts、叙事文本、
  UI route/overlay/dialog/DevDock 状态、RuntimeCapabilities、Story/engine/provenance 和时间戳。
- path scrubber 不等于匿名化；Story State、命令和文本仍可能含玩家认为敏感的信息。

## 精确命令

验证 prepare/review/save/discard 和 Bundle codec：

```bash
pnpm exec vitest run engine/packages/ui/src/diagnostics/diagnostic-export-button.test.tsx engine/packages/web/src/application/create-player-ui-ports.test.ts game/stories/poc/src/application/poc-application-root.test.tsx
pnpm --filter @sillymaker/base run test:runtime
pnpm verify:runtime-fixtures
pnpm verify:docs
```

玩家流程是明确的两步本地保存：

1. 点击“导出调试包”。Runtime 在 queue front 捕获 Bundle；Web adapter 校验 export wrapper、raw-byte
   SHA-256、Strict JSON、closed 顶层 envelope 和 `formatRevision`。
2. UI 只接收 `{ filename, mediaType, digest, encodedByteLength, categories }` preview，不接收 raw
   bytes；此时没有下载。
3. 审查文件名、digest、编码后大小和内容类别：构建与来源信息、运行能力与完整性状态、完整游戏状态
   与命令历史、诊断与运行时故障，以及可选的失败现场/UI 上下文。
4. 选择“取消”会 discard prepared reference；选择“保存调试包”才下载 prepare 阶段冻结的同一份
   detached bytes，不重新捕获最新 Session。
5. save 失败时 preview 保持可见，重试保存同一 digest/size/bytes；prepare 失败则没有保留 bytes，
   再次导出会生成新的 Bundle。
6. 保存成功后应用清除 prepared reference。磁盘文件仍由玩家管理；再完成一次实际文件的隐私审查，
   获得明确同意后才能通过已批准渠道分享。

Bundle 描述的是 prepare 时刻，不是稍后点击保存时的最新状态。review 期间若游戏已变化且需要最新
现场，应取消并重新 prepare。取消/卸载/port replacement 会防止晚到 prepare 结果复活，但不是 secure
memory zeroing；save 已开始后也不能撤销浏览器下载。

默认排除浏览器历史、任意 Host storage/settings dump、未选择文件、原始绝对路径和未裁剪异常；
preview/adapter 不调用 `inspectDebugBundle`、replay、anchor 或 DebugTools。

## 预期输出

- 第一次 activation 只显示 preview，不触发 download；UI 不显示 raw JSON/bytes。
- preview digest 等于 raw exported bytes 的 SHA-256，`encodedByteLength` 不超过 20 MiB。
- closed categories 至少覆盖 provenance、capabilities/integrity、replay evidence、diagnostics/runtime
  failures；只有 Bundle 存在相应字段时才增加 failure context 和 UI context。
- 显式 save 只下载 retained exact bytes；成功后 reference 清除，失败后同一 bytes 可重试。
- cancel、unmount 或 port replacement 丢弃 retained reference，pending result 不会重新进入 review。
- prepare/save 前后 Snapshot、CommandLog、RuntimeCapabilities 与 RunIntegrity 都不改变，也没有 upload/
  network side effect。

## 失败证据

只记录 filename、encoded byte size、SHA-256、展示的 category labels、prepare/save UI state、当前 Artifact
provenance 和稳定 rejection/failure code；不要为了报错公开 payload。运行时 exporter 的意外异常被规范
为有界导出失败，不能把原始本机路径或未裁剪异常复制到公开渠道。

UI preview 证明的是 exact wrapper/digest/Strict JSON/closed envelope 已准入并给出内容分类，不等价于
接收方的 authoritative replay acceptance。接收方仍应使用正式 decoder/replay verifier 检查 Snapshot
digests 与 engine/state-contract/simulation identity。

## 停止条件

- 没有针对 exact 文件/接收者/用途/保留期/渠道的明确同意；
- preview 缺少 filename/digest/size/categories，第一次点击已经下载，或 UI 获得 raw bytes；
- 文件超过 20 MiB，digest/Schema/identity/replay validation 失败，或内容类别超出 closed set；
- 人工审查发现未预期的状态、叙事、身份或 UI 信息；
- 需要编辑、裁剪、“修复”原始 bytes 才能通过，或要求把 DebugBundle 当 Save 强行恢复；
- 分享要求启用 Cheat、调用 anchor/DebugCommand、自动上传、网络 API 或绕过 consent；
- 接收者要求 authoritative replay，但 engine/state-contract/simulation identity 不匹配。

## 权威边界

Runtime exporter 创建并验证 canonical Bundle；Web adapter 最多保留一份 detached prepared file，UI 只
展示 metadata/categories 并收集本地 save/cancel 意图。Operator 可以审查并在明确同意后分享 exact
bytes，但不能声明匿名、修改 Bundle 或批准 replay。`inspectDebugBundle` 和 replay 需要
`debug_tools`；anchor 需要 `debug_tools + cheats`，会替换 Session 并把 RunIntegrity 标记为 modified。
普通玩家分享、Renderer 与 Automation 均不得获得这些 DebugTools 权限。
