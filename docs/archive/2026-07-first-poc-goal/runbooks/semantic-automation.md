# 语义自动化

本文说明如何从浏览器驱动同一份玩家 Artifact 的 SemanticGamePort。它用于确定性的本地验收和未来
适配器，不是 DOM 坐标脚本、调试控制台或第二套游戏 API。

## 前置条件

- 从 fresh browser context 打开已构建 Story URL，并仅为当前会话请求
  `?capability=automation_bridge#/play`。普通 URL 不安装桥。
- 确认全局 `__SILLYMAKER_AUTOMATION_V1__` 存在、`contractRevision === 1`，且 facade 已冻结。
- 调用方必须理解当前 Story 的 action descriptor 与 invocation 闭合联合；不得猜测 action ID、参数、
  隐藏 State 路径或构造脚本字符串。
- 每个调用都必须解包外层 operation result。成功是 `{ kind: "ok", value }`；能力被撤销是
  `{ kind: "capability_disabled" }`，此时不得继续 dispatch。
- Automation context 必须与其他测试和玩家 preference/storage 隔离，结束后关闭 context。

## 精确命令

先构建并运行浏览器语义 parity：

```bash
pnpm build:e2e
pnpm build:poc
pnpm verify:semantic
pnpm exec playwright test --config engine/packages/web/playwright.ui.config.ts engine/packages/web/e2e/automation-bridge.spec.ts --project=chromium
pnpm verify:docs
```

自动化循环使用固定顺序：

```text
bridge = globalThis.__SILLYMAKER_AUTOMATION_V1__
assert bridge.contractRevision === 1

publication = unwrapOk(bridge.observe())
actions = unwrapOk(bridge.availableActions())
choose one enabled descriptor and one of its declared invocations
preview = unwrapOk(await bridge.preview(invocation))
idle = bridge.waitForIdle(publication.revision)
result = unwrapOk(await bridge.dispatch(invocation))
next = unwrapOk(await idle)
```

`observe` 返回一次原子 publication：`revision`、`status`、player-visible `game`、`narrative` 和
`actions` 来自同一权威 token。`availableActions()` 返回当前 publication 的同一 actions 引用。
`preview` 在 Session FIFO 队首读取最新 Gameplay State；`dispatch` 在真正执行点再次验证，因此 preview
通过不保证稍后的 dispatch 必然提交。必须处理 Story 自己的 structured rejection/fault result。

在隔离且没有并发操作者的上下文中，先创建 `waitForIdle(before.revision)` Promise，再 dispatch，避免
错过同步完成后的 revision publication。等待进度只能使用 `waitForIdle(afterRevision?)`。不得使用 sleep；
不得使用定时轮询或“延迟够久就算完成”，也不得使用坐标、截图像素或未声明 DOM 文本替代 action
descriptor。真实 UI 的可访问性仍由浏览器测试单独覆盖，Automation 不能替代它。

## 预期输出

- facade 只有六个公开成员：`contractRevision`、`observe`、`availableActions`、`preview`、`dispatch`、
  `waitForIdle`。
- 每个已授权且底层调用成功 settle 的操作返回 `kind: "ok"`，并在 `value` 中提供 Story-specialized
  结果；底层 throw/Promise rejection 保持异常，必须作为失败证据记录。
- DOM 与 Automation 对同一 invocation 得到相同的 availability、ordered reasons、preview、dispatch
  result 和最终 publication。
- legal Semantic dispatch 进入正常 GameSession FIFO 并保持当前 RunIntegrity；fresh normal Session 仍为
  `normal`。
- capability 关闭、页面替换或 installation dispose 后，全局属性被移除；此前捕获的 facade 永久返回
  `capability_disabled`，重新启用会创建新 generation，不复活旧引用。
- `waitForIdle` 只在 publication 非 `busy`，且可选 `afterRevision` 阈值已越过时返回真实
  publication；它不制造额外 Gameplay revision。

## 失败证据

记录 application ID、Artifact manifest digest、bridge `contractRevision`、调用名、输入 invocation、外层
operation result、调用前后 publication revision/status，以及 Story 内层 result。不要记录或索取完整
Snapshot、IndexedDB、DebugBundle 或隐藏 State。

若 retained facade 返回 `capability_disabled`，重新发现当前全局；若全局也不存在，说明能力确实关闭，
停止本次序列。若 preview 与 dispatch 不同，保留二者及中间 publication；这可能是合法 stale rejection，
不能通过重放内部命令强行消除。dispatch 未提交时不要无限等待预先创建的 idle Promise；关闭隔离
context 以 dispose 本轮 bridge/waiter，然后从新 publication 重新发现。

## 停止条件

- 全局缺失、revision 不受支持、facade 未冻结或公开成员超出闭合集合；
- 任何操作返回 `capability_disabled`，或当前 capability 状态不明确；
- action disabled、invocation 不属于 descriptor 的受控 options，或 preview/dispatch 返回 rejection/fault；
- 需要使用 sleep、坐标、任意 State path、DOM setter、网络请求或直接 Session/Snapshot setter；
- Automation 改变 RunIntegrity、绕过 FIFO/最终验证、观察到玩家不可见字段，或测试结束后留下 preference；
- 需要 DebugCommand、fixture anchor、Save mutation 或 Debug Bundle replay。

## 权威边界

SemanticGamePort 是 UI、Headless 与 Automation 的共同玩家语义来源，只发布 player-visible immutable
projection 和当前合法 action。浏览器 bridge 仅做 capability-gated 包装，并在每次调用时复检；它
不得暴露 DebugTools、Cheats、Snapshot、RNG、RunIntegrity、owner proposal 或隐藏剧情条件。Story 的
GameCommandExecutor 和 GameSession FIFO 仍拥有最终写入权，Automation 只提交 typed semantic
invocation。
