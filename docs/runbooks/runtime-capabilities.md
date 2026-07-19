# 运行时能力

本文说明同一份 Story × Web Artifact 中如何临时启用调试、作弊和语义自动化能力。能力开关是
Host/Application 状态，不是构建 flavor；它们不会重新解析 Story、替换 GameSimulation 或改变
Engine、Story、ResolvedGame 和 application identity。

## 前置条件

- 使用当前已验证的 `poc-web` 或 `e2e-web` Artifact。不要为了获得工具创建 Developer build、修改
  bundle 或另开一套 Story root。
- 先确认是否需要 `debug_tools`、`cheats` 或 `automation_bridge`。全新的隔离 Host preference store
  中三者默认关闭。
- URL 会话请求只接受闭合集合中的重复 `capability` 参数，例如
  `?capability=debug_tools&capability=cheats#/play`。未知、重复、空值或其他 query member 会使整组请求
  被拒绝，不产生部分启用。
- 自动化和验收使用新 browser context/store，不能复用玩家的 IndexedDB 或 capability preference。
- DebugBundle 导出始终是玩家可用的只读操作；不得仅为导出而启用 DebugTools 或 Cheat。

## 精确命令

从仓库根目录构建并验证同一 Artifact 的 capability 行为：

```bash
pnpm build:poc
pnpm build:e2e
pnpm exec playwright test --config engine/packages/web/playwright.ui.config.ts engine/packages/web/e2e/runtime-capabilities.spec.ts --project=chromium
pnpm verify:docs
```

在 exact clean `HEAD` 上验证 release Artifact 的同一身份时再运行：

```bash
pnpm release:prepare
pnpm test:e2e:prebuilt --project=chromium --grep "capability identity"
```

页面内有两种来源：

1. Host 设置写入 persisted preference；后续启动会恢复。
2. URL 只为当前页面会话请求能力。effective state 精确为 `persisted OR session-requested`，URL 请求
   **不写回** preference。

`debug_tools` 使 Story tooling/DevDock 可见，但只读 Debug 操作仍会在每次调用时重新检查
capability。Story 定义的状态修改、fixture anchor 或其他规则绕过操作还必须同时有 `cheats`，并经过
相应 UI 确认。单独启用 Cheat 不构成可调用的 DebugTools port。

返回普通能力状态时按来源分两步关闭：

1. 通过 `?capability=debug_tools#/play` 进入面板，先关闭本次 URL **没有**请求的 persisted
   Automation/Cheats；session-requested switch 是只读的，不能在该页声称关闭其持久值。
2. 导航到不含 `capability` query 的同一 Artifact URL。若 DevDock 仍出现，说明 DebugTools 由
   persisted preference 启用；在面板关闭它，再次无 query reload，确认 DevDock 和 Automation global
   都不存在。

URL 缺席只移除 session-requested 覆盖，不会清除已保存偏好；反过来，在当前 URL 仍请求某项能力
时把 persisted 开关关闭，也不会使 effective state 立即变成 false。

## 预期输出

- 普通 URL 不出现 DevDock，`globalThis.__SILLYMAKER_AUTOMATION_V1__` 不存在。
- `debug_tools` URL 显示 read-only Debug UI；变更命令和 fixture anchor 保持禁用，且不改变当前
  RunIntegrity；fresh normal Session 仍为 `normal`。
- `debug_tools + cheats` 才允许已声明的 Cheat/fixture mutation；成功提交后 RunIntegrity 变为
  `modified`，并随 Save/Load 保留。
- `automation_bridge` 只安装冻结的 Semantic Automation facade，不显示 DevDock，也不得暴露
  DebugTools。
- persisted preference 在同一 Host store 的无 query reload 后仍存在；session-requested 能力不会被
  持久化。
- 切换能力本身不改变 Snapshot、RunIntegrity、ResolvedGame/GameSimulation identity 或 Artifact
  manifest digest。
- 关闭能力不会把已经是 `modified` 的 RunIntegrity 洗回 `normal`；需要 pristine provenance 时必须
  创建新的正常 Session，不能篡改 Save。

## 失败证据

保留当前 URL（删除任何私密 fragment/参数）、application ID、effective/persisted/session-requested 三组
状态、操作结果以及 Artifact `build-input.json` 身份。能力写入的稳定结果为：

```text
updated | unchanged
rejected: conflict | unavailable
```

DebugTools 在执行点发现权限已关闭时返回 `{ kind: "capability_disabled" }`；这不是空结果、异常或可重试
成功。记录该结果和调用名称，不要用旧 facade 或缓存的按钮状态绕过复检。

## 停止条件

- fresh store 的任一能力不是 false，或测试结束后出现持久副作用；
- query 被判为 malformed/unknown/duplicate，或只有部分请求被应用；
- capability 变化导致 Story 重新解析、GameSimulation/ResolvedGame identity 漂移或生成另一份 Artifact；
- read-only Debug 改变 RunIntegrity，或 Cheat 在缺少 `debug_tools + cheats`/明确确认时可执行；
- Automation 暴露 Snapshot、Save、DebugTools、owner capability 或隐藏剧情条件；
- 需要修改 IndexedDB、注入全局 setter、关闭执行点复检或绕过 `capability_disabled`。

## 权威边界

Host preference 只决定持久开关，URL 只增加当前 session-requested 覆盖，Application 计算 effective
state。DebugTools 与 Automation facade 每次调用都以当时 effective state 为准。read-only Debug 可以
检查已公开的诊断；Cheat 是 Story 定义且受控的规则绕过能力；Automation 只能调用
SemanticGamePort 的玩家语义操作。代码存在于同一 Artifact 不是授权，DevDock 是否可见也不是
GameSession 写权限。
