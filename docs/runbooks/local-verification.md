# 本地验证与 Artifact 交接

本文用于在同一份已物化 checkout 中验证 Project Tavern，并把 exact `poc × web`
Artifact 交给后续人工审查或另行批准的分发适配器。这里的任何命令都不会 publish、push、
deploy，也不会宣称人工试玩或远端分发已经通过。

## 前置条件

- 从仓库根目录执行，Git 必须位于 attestation 记录的 branch，且当前提交后代关系有效。
- 使用 `.project-tavern/goal-materialization.json` 记录的精确 Node、pnpm、平台和浏览器；该文件
  是 ignored host attestation，不进入 Artifact。
- release 证据只接受 clean、attached `HEAD`。先运行 `git status --short --branch`，来源不明的
  tracked、untracked 或 mode bytes 必须先停止并确认所有权。
- `pnpm prepare:goal` 与普通 gate 不同：它是 Phase 0/重新物化时唯一公开的 network-capable
  writer，会建立本机依赖和浏览器并写 ignored attestation。Phase 2–6 的
  `pnpm verify:materialization`、安装和验证路径都是 offline/read-only authority checks；它们可使用
  临时目录或刷新 ignored build output，但不得改写 tracked baseline。
- frozen balance 已由 `pnpm verify:balance:freeze` 准入时，只消费保留的 report、attestation、
  final trailer 和 provenance；本流程不授权 `pnpm verify:balance` 或新的 full corpus。

## 精确命令

先固定 live source 和物化状态：

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
node --version
pnpm --version
pnpm verify:materialization
pnpm install --offline --frozen-lockfile
```

普通开发验收使用：

```bash
pnpm verify
```

它是 ordinary non-release gate。它会构建并 development-safe 地检查本轮 `dist/poc`，但不建立
release eligibility。只有 clean exact `HEAD` 才运行本地发布证据链：

```bash
pnpm verify:release
git diff --check
git status --short --branch
```

`pnpm verify:release` 依次执行普通 gate、clean Artifact prepare、严格 Artifact admission、
prebuilt Chromium 流程和双构建可复现比较。Phase/Goal acceptance 需要单独列出证据时，仍使用计划
冻结的公共入口：

```bash
pnpm release:repro
pnpm test:e2e:prebuilt --project=chromium
pnpm verify:docs
```

交接时记录以下只读结果和文件，不重新打包：

```bash
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
shasum -a 256 dist/poc/artifact-manifest.json
```

- `dist/poc/build-input.json`：记录 `provenanceMode=clean_commit`、`sourceCommit`、`sourceTree`、
  `materializationDigest`、精确 tools、Story/Host、source graph，以及 Engine、Story、ResolvedGame
  和 application identity。ResolvedGame 记录 state-contract revision/digest、simulation、
  presentation 与 PatchSet；这些身份不能压成一个 app version。
- `dist/poc/artifact-manifest.json`：规范、排序地记录除 manifest 自身外每个 payload 的 path、
  byte length 和 SHA-256。交接另外记录 manifest 文件本身的 detached SHA-256。
- exact `dist/poc` 目录：未来分发适配器消费这些 bytes，不得重新构建。

## 预期输出

- materialization gate 输出 `goal materialization verified sha256:…`，Node/pnpm 与 attestation 一致。
- `pnpm verify` 的 28 个 leaf 全部退出 0；frozen balance leaf 输出已准入 final commit 与 report
  digest，而不是 corpus 进度。
- 严格 Artifact 检查输出 `PoC Game Artifact verified`，build input 为 `clean_commit`。
- prebuilt Chromium 的五条 Phase 6 流程通过。
- reproducibility 输出 `reproducible <sourceCommit> <sourceTree> <manifestDigest>`；两个 fresh clean
  archive build 和 handed-off `dist/poc` 的 path/size/digest tuple、build-input bytes 与 manifest
  digest 完全相同。
- 最后 `git diff --check` 无输出，`git status --short --branch` 只有 branch 行。

## 失败证据

保留首个非零命令、完整稳定诊断 code、stdout/stderr、以下 live identity，以及 Artifact 若已生成时
的 `build-input.json` 与 detached manifest digest：

```bash
git status --porcelain=v1 --untracked-files=all
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
git diff --check
```

不要用重复运行掩盖第一次失败，不要运行 writer 修补只读 gate，也不要把 development provenance
记录成 release evidence。

## 停止条件

- materialization digest/toolchain/platform/browser 不匹配、固定端口或离线 store 不可用；
- dirty bytes 来源不明、HEAD/树在验证期间变化，或 Artifact identity 与 live source 不一致；
- Artifact 含 source map、绝对路径、secret、`references/`、`art-source/aigc/**` 或未准入远程资源；
- frozen balance report/attestation/trailer/provenance 不一致；此时只报告缺失或漂移，不重跑 corpus；
- 需要联网补包、批准素材、人工试玩、远端凭据、上传、部署或改变权威设计。

## 权威边界

本流程证明的是可复现的本地软件和静态 Artifact，不证明玩法好玩、素材获批或发布成功。最终人工
体验由独立的 [Final Human Review](../engineering/plans/2026-07-12-project-tavern-final-human-review.md)
消费 exact source SHA 与 manifest digest；未来上传/托管只由另行授权的
[Remote Distribution](../engineering/plans/2026-07-12-project-tavern-remote-distribution-deferred.md)
消费 exact Artifact bytes。两份后续计划不得被本 runbook 复制执行，也不得反向改变已经通过的本地证据。
