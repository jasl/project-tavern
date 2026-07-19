# 依赖升级

本文定义未来如何改变 workspace 外部 package closure。它不是当前 Phase 2–6 Goal 内新增依赖的
授权，也不是“遇到安装失败就联网”的逃生口。

## 前置条件

- 所有者先批准一个独立、范围明确的升级任务，写清 package owner、package 名、目标精确版本、
  升级理由和受影响 Artifact。计划外依赖必须停止，不能先改 lockfile 再补授权。
- 从 clean attached branch 开始，保留现有 materialization base、Node/pnpm checkpoint 和
  `git status --short --branch`。
- 所有 manifest 使用精确版本；workspace 内部依赖使用现有 `workspace:*` 合同。不得引入 caret、
  tilde、tag 或未冻结范围。
- `.npmrc` 必须保持 `save-exact=true`、`strict-peer-dependencies=true`、
  `shared-workspace-lockfile=true`；frozen lockfile 是唯一 package resolution authority。
- `pnpm-workspace.yaml#onlyBuiltDependencies` 是逐项直接评审的 lifecycle-script allowlist。不能为
  通过安装而笼统放宽。

## 精确命令

依赖选择和第一次联网解析只在已获批的独立 materialization 任务中进行；该任务必须把 exact
manifest 与 `pnpm-lock.yaml` 作为一个可审查候选。不要在正在执行的普通 Goal/gate 中临时查询
registry。候选锁定后，更新 tracked materialization contract：

```bash
pnpm update:materialization-lock
git diff -- package.json pnpm-lock.yaml scripts/preflight/materialization-lock.json .npmrc pnpm-workspace.yaml
git diff --check
```

先审查并独立提交 exact manifest、lockfile、materialization contract 和确有必要的 lifecycle allowlist。
只有 clean committed `HEAD` 才允许重新物化本机；在这个边界上，`pnpm prepare:goal` 是唯一公开的
network-capable writer：

```bash
pnpm prepare:goal
pnpm verify:materialization
pnpm install --offline --frozen-lockfile
pnpm test:scripts
pnpm verify
pnpm verify:release
git diff --check
git status --short --branch
```

第二次及后续安装/验证必须离线，证明 fresh source 可以只依赖 frozen lockfile 与物化 store。

## 预期输出

- manifest 只出现被批准 owner 的精确版本；`pnpm-lock.yaml` 没有浮动 selector 或无关 importer
  漂移。
- `pnpm update:materialization-lock` 重复运行 byte-identical，external package closure 和完整
  packages/snapshots resolution 被规范记录。
- `pnpm prepare:goal` 生成新的 ignored host attestation；随后
  `pnpm verify:materialization` 输出新的稳定 materialization digest。
- offline frozen install、script suite、完整普通 gate 和 clean release gate 全部退出 0，且没有 tracked
  mutation。

## 失败证据

记录 manifest/lock/materialization-contract diff、首个失败 code、当前工具版本和完整 status：

```bash
git status --porcelain=v1 --untracked-files=all
node --version
pnpm --version
git diff --check
```

若失败来自 lifecycle script，记录确切 package 与脚本；不得直接把 package 加入
`onlyBuiltDependencies`。若 external package closure 出现无关漂移，保留候选并停止缩小原因。

## 停止条件

- 没有所有者批准的 package、精确版本或 owner package；
- 升级要求计划外依赖、改变公共 ABI/权威设计、降低 TypeScript/Node/pnpm 合同或新增远端发布能力；
- 必须在普通验证中联网、使用临时 `npx`/隐式浏览器下载，或无法离线复现；
- package 需要未审查的 install/build script、原生二进制、专有 SDK 或额外分发条款；
- lockfile 含无关大范围变化，或 clean materialization/release gate 不通过。

## 权威边界

精确 manifest 和 frozen lockfile 管理 npm 依赖的工程可复现性；仓库不对直接、传递、开发或生产
npm 依赖做逐包许可取证、自动 `THIRD_PARTY_NOTICES.md` inventory 或构建阻断。许可与条款采用
直接评审。若把第三方源码、字体、图片、二进制或数据有意复制进 Git，必须进入 `vendor/**` 并保留
其原始条款；验证器不会扫描或裁决 `vendor/**`。高风险商业素材、专有 SDK 和特殊发行合同需要
所有者或专业审查，不能由升级 gate 自动批准。
