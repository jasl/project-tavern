# Story Hotfix 编写

本文说明 SillyMaker 受管 PatchSurface 的源码工作流。Hotfix 是 bootstrap-only 的可信替换缝，不是
运行时 Mod 管理器、任意脚本系统或绕过 Story/Save identity 的开关。

## 前置条件

- 变更必须由 Story owner 授权，并明确为什么不能直接提升 Story revision 或修改默认 provider。
- 先确认目标已由 Story 公开在 Simulation `rule | value` 或 Presentation `value | text | asset`
  PatchSurface。Hotfix 不能增加 symbol、Module、State slot、Command/Fact union 或 Schema。
- 记录目标 Story ID/revision、symbol ID、surface、slot contract revision、当前
  `defaultProviderSourceDigest`/provider digest 和精确替换类型。
- Hotfix 的 import closure 必须是本仓库受审源码；`HotfixEntryV1.sourceDigest` 由 Story-local 受控
  source-digest writer 根据 workspace-relative POSIX path 与 exact executable source/import-closure bytes
  生成，并由只读测试独立重算。build identity collector 另行生成 Story/Engine/Application facet identity，
  二者不得混用，也不能手写或使用 `Function#toString()`、绝对路径、mtime 或 chunk name。
- 预先决定 Save 是否需要 adoption。单个 Hotfix 自身不能批准旧 Save；任何 adoption 都是另一个精确
  PatchSet declaration 和 fixture review。
- 当前 PoC/E2E production application 都以空 Hotfix 列表和 `adoptionDeclaration: null` 启动；新增
  Hotfix 源文件本身不会启用它。应用组合与 adoption 必须各自显式、独立受审。

## 精确命令

以 E2E Story 的受控示例为例，先确认 generated output 没有未处理改动，再运行 writer、审查 diff，
最后用 live-byte verifier 和 resolver/Story contract 测试独立验证：

```bash
git status --porcelain=v1 --untracked-files=all -- game/stories/e2e/src/simulation/source-digests.generated.ts
pnpm --filter @project-tavern/story-e2e update:source-digests
git diff -- game/stories/e2e/src/simulation/source-digests.generated.ts
pnpm exec vitest run engine/packages/base/src/authoring/hotfix-resolver.test.ts engine/packages/base/src/authoring/story-resolver.test.ts game/stories/e2e/src/simulation/source-digests.test.ts game/stories/e2e/src/runtime/hotfix-integration.test.ts game/stories/e2e/src/story-contract.test.ts
pnpm typecheck
pnpm verify:public-exports
pnpm verify:fixtures
pnpm verify:golden
pnpm verify:docs
pnpm verify
git diff --check
git status --short --branch
```

`update:source-digests` 是显式 writer，只在已授权的 Hotfix/import-closure 变更中运行；生成文件必须与
源码一起评审。普通 verify 只读，不可用 writer 掩盖未计划的 digest/fixture 漂移。

若 Hotfix 将进入可交接 Artifact，只在 exact clean commit 上再运行：

```bash
pnpm verify:release
git diff --check
git status --short --branch
```

Authoring 顺序固定：

1. 选择并记录 Story 已有 `definePatchSlot` descriptor 的 symbol、surface、kind、contract revision、
   `defaultValue` 与当前 provider digest；Hotfix authoring 不新增或重定义 slot。目标不存在时停止，
   另行进行 Story contract/design 变更。
2. Hotfix manifest 声明 identity、精确 Story target、全部 targets，以及 `requires`、`conflicts`、
   `supersedes`。
3. `requires` 只能引用列表中更早且已应用的条目；任何已列出的 `conflicts` 都拒绝整组。
4. 覆盖已有 Hotfix provider 时，后者必须在 `supersedes` 中精确声明当前 provider ID；不存在隐式
   last-wins。
5. `install(context)` 必须同步确定性；对每个声明 target 恰好调用一次相应 replacement port。不得返回
   Promise/thenable，不得访问网络、storage、DOM、真实时间、环境随机或进程级可变状态。

每次 resolve 都依次执行 `define → fresh registries → Hotfix → 撤销写能力 → materialize/validate →
freeze ResolvedGame`。install 返回或抛错后，捕获的 replacement port 都已失效，不能延迟写入。

## 预期输出

- Resolver 对 manifest、provider digest、target kind、调用顺序、collision 和 replacement value 完整
  验证；每个 applied Hotfix 留下 ordinal 和 replacement trace。
- Simulation replacement 改变 combined `PatchSet.digest` 与 `PatchSet.simulationDigest`，保持
  `PatchSet.presentationDigest`；纯 Presentation replacement 改变 combined digest 与 presentation
  digest，保持 simulation digest。
- 最终 PatchSet 同时保留 combined、simulation、presentation digest 和 ordered applied Hotfixes；这些
  identity 与 Story/state contract/engine 分层保存。
- 同一 Hotfix contract suite 必须在两个独立 fresh candidate registries 中分别执行，逐字节比较
  applied ordinals、replacement traces、serializable replacement values、PatchSet identities，并比较
  全部 rule vectors；同一精确输入产生相同 Programs、GameSimulation 和 digests。
- 任一 Hotfix 失败不会产生部分 GameSession 或部分 ResolvedGame；Loader 只能显式回到已验证的
  无补丁 safe mode，或 fatal 停止。

## 失败证据

保留 failure code、被拒 Hotfix IDs、manifest/target/provider digest、应用顺序、生成的 source closure
digest diff 和最后一个成功 ResolvedGame identity。常见稳定 code 包括：

```text
hotfix.duplicate_id
hotfix.target_mismatch
hotfix.requires_missing
hotfix.requires_order
hotfix.conflict
hotfix.collision
hotfix.unknown_symbol
hotfix.provider_mismatch
hotfix.install_threw
hotfix.install_thenable
hotfix.output_invalid
```

不要捕获错误后继续拼接部分 PatchSet，不要把用户抛出的同名 error code 当作 resolver 认证的诊断。

## 停止条件

- 目标 symbol 不在已批准 PatchSurface，或变更需要新 Module/State/Command/Schema/任意 callback registry；
- source digest 不能由精确 import closure 重现，或 install 依赖平台 I/O、时间、随机、全局 mutable state；
- `requires` 顺序、`conflicts`、provider digest 或 collision 无法以显式 `supersedes` 解决；
- 需要在 ResolvedGame/GameSession 创建后追加、删除或替换 Hotfix；
- simulation digest 漂移但缺少精确 Save adoption 决策、fixture/golden technical review；
- 提议仅凭一个 Hotfix ID 放行旧 Save，或想以纯 Presentation patch 掩盖 Simulation 变化；
- resolver 只能生成部分 GameSession、需要保留活跃 replacement port，或 safe mode Story 本身未验证。

## 权威边界

Story owner 定义有限 PatchSurface 和默认 provider，并拥有受控 source-digest writer 输入与 generated
output review；Base resolver 拥有 manifest、provider、trace、fresh registries、写能力撤销和 PatchSet
identity。build identity collector 另行拥有 Story/Engine/Application facet identity。Loader 只按显式顺序
提供 Hotfix 并处理 ready/safe-mode/fatal bootstrap。Save adoption declaration 只包含 Story ID/revision、
state-contract revision/digest、from/to simulation digest 和当前 `simulationPatchSetDigest`；engine digest
相等是 compatibility 的独立阻断条件，不是 declaration 字段。Hotfix、UI、Host 或 operator 都不能自行
授权 adoption。
