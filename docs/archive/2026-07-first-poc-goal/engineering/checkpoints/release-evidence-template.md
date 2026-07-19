# Phase 6 Release Evidence Template

状态：template only。复制本模板后才能记录一次 exact clean commit 的只读证据；**模板本身不构成验收证据**，
不宣称 Goal、Final Human Review 或 Remote Distribution 已完成。

## Source authority

| Field                           | Recorded value |
| ------------------------------- | -------------- |
| branch                          |                |
| source commit                   |                |
| source tree                     |                |
| clean status before/after       |                |
| materialization base commit     |                |
| materialization digest          |                |
| package closure digest          |                |
| Node / pnpm / TypeScript / Vite |                |
| host platform / architecture    |                |
| Chromium / WebKit revision      |                |

附上 materialization attestation strict-decode、tracked contract byte comparison 和 ancestry 结果。不要把
ignored attestation 复制进 Artifact。

## Frozen balance admission

| Field                                             | Recorded value |
| ------------------------------------------------- | -------------- |
| frozen balance final commit                       |                |
| final commit trailers                             |                |
| A/B report digest and byte equality               |                |
| A/B strict-attestation digest and byte equality   |                |
| source archive / lock / tool / package provenance |                |
| protected-path audit                              |                |

这里只记录 frozen evidence admission leaf；不得运行新的 corpus、candidate、calibration replay 或参数搜索。

## Gate evidence

按计划原序记录命令、exit code、关键稳定输出和 tracked/status before/after。空白行不代表通过。

| Command                                     | Exit | Evidence |
| ------------------------------------------- | ---: | -------- |
| `pnpm verify:materialization`               |      |          |
| `pnpm install --offline --frozen-lockfile`  |      |          |
| `pnpm test:scripts`                         |      |          |
| `pnpm verify:balance:freeze`                |      |          |
| `pnpm build:poc`                            |      |          |
| `pnpm build:e2e`                            |      |          |
| `pnpm verify`                               |      |          |
| `pnpm verify:release`                       |      |          |
| `pnpm release:repro`                        |      |          |
| `pnpm test:e2e:prebuilt --project=chromium` |      |          |
| `pnpm verify:docs`                          |      |          |
| `git diff --check`                          |      |          |
| `git status --short --branch`               |      |          |

## Artifact handoff

从 exact handed-off `dist/poc` 记录：

| Field                                                | Recorded value |
| ---------------------------------------------------- | -------------- |
| `build-input.json` byte digest                       |                |
| provenance mode / source commit / source tree        |                |
| materialization digest / tool versions               |                |
| Story / Host / application identity                  |                |
| Engine / Story / ResolvedGame identities             |                |
| source graph digest                                  |                |
| `artifact-manifest.json` detached manifest digest    |                |
| payload file count and path/size/digest tuple digest |                |
| legal file digests                                   |                |
| nested-base prebuilt result                          |                |

记录 `reproducible <sourceCommit> <sourceTree> <manifestDigest>` 的完整输出，并明确两个 fresh archive
build 与 handed-off Artifact 是否 byte-equivalent。不得由后续适配器重新构建这些 bytes。

## Scope statement

记录本证据只覆盖本地自动化软件、deterministic Artifact 和可复现交接。分别写明以下状态，禁止由
空白或本地 gate 推断：

- 素材批准：不属于本模板；
- 人工试玩、Safari/VoiceOver 与主观体验：只属于 Final Human Review；
- 上传、托管、凭据、远端 smoke、回滚与发布：只属于 Remote Distribution；
- CI：未由 Phase 6 创建；
- tracked mutation、unknown skip/quarantine 或未解释失败：必须阻断该 evidence instance。
