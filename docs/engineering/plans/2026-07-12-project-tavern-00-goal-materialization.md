# Project Tavern Goal Materialization Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Materialize every known external dependency and Playwright browser required by Phase 2–6 on the development host before the long unattended engineering Goal starts, then expose one read-only attestation check that later phases can run without network access.

**Architecture:** A tracked materialization contract freezes exact external inputs while an ignored local attestation records that this machine actually possesses them. The explicit Task 1 package-freeze commands are the one bootstrap exception before that contract exists; after the dependency commit, `prepare:goal` is the only public network-capable writer. `verify:materialization` is read-only/offline and checks the current external package closure, exact browser revisions and host prerequisites. Phase 2–6 consume this contract and may not introduce a new external package or implicit download. Pixel baselines are intentionally host-local: Phase 5C records a separate visual-environment fingerprint and requires an explicit rebaseline whenever it changes.

**Tech Stack:** Node.js 26.5.0 for the first materialization checkpoint, pnpm 11.11.0, Playwright 1.61.1 with Chromium revision 1228 and WebKit revision 2311, plus the exact `@fontsource/noto-sans-sc` files frozen in the package closure. The ignored attestation records `process.platform` and `process.arch`; it never claims cross-platform pixel equivalence.

## Global Constraints

- This plan runs after the independent asset-preparation track and before creating the Phase 2–6 Goal.
- The predecessor clean commit must already export the possibly empty `approvedPocAssetPacksV1` and pass `game/packages/assets/src/approved-poc-pack.test.ts`; Phase 0 inspects but never creates, selects or changes that handoff.
- It performs no Gameplay, Engine, UI, Story, fixture, golden, screenshot, CI, workflow, hosting or remote deployment work.
- Network access is confined to the exact Task 1 package-freeze commands and, after their commit, `pnpm prepare:goal`; every verification command is offline/read-only. No other task or later phase may contact a package registry or browser-download source.
- Exact future dependencies are installed into their final owners now. Later plans assert them and do not run `pnpm add`, `pnpm view`, `npx --yes` or a browser download.
- The local attestation contains no secret, credential, absolute repository path or hostname and remains ignored/untracked.
- The materialization digest covers the exact external package closure from the lockfile `packages`/snapshot data, not workspace importer layout, so Phase 2 package deletion/renaming does not invalidate it when external versions remain unchanged.
- All edits use TDD, exact staged paths and a clean worktree; no approved-dirty exception exists at the materialization boundary.

---

## File Map

```text
.node-version                                      # exact first-Goal Node input
.gitignore                                         # ignored local attestation/cache
package.json                                       # packageManager and public prepare/verify scripts
pnpm-lock.yaml                                     # every known Phase 2–6 package
engine/packages/web/package.json                              # idb and fake-indexeddb
engine/packages/ui/package.json                           # Lucide, Radix and Noto Sans SC
scripts/preflight/materialization-lock.json        # tracked external-input contract
scripts/preflight/materialization-contract.mts     # canonical closure/digest logic
scripts/preflight/materialize-goal.mts             # sole network-capable writer
scripts/preflight/verify-materialization.mts        # read-only/offline verifier
scripts/preflight/*.test.ts                         # injected-host and failure tests
.project-tavern/goal-materialization.json          # ignored local attestation
```

## Task 1: Freeze exact package and toolchain inputs

**Files:**

- Create: `.node-version`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `engine/packages/web/package.json`
- Modify: `engine/packages/ui/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: current Phase 1 workspace and the exact dependency versions already approved by the Phase 2–6 plans.
- Produces: one frozen host dependency closure with no mid-Goal registry additions.

- [ ] **Step 1: Prove the committed asset handoff and Phase 1 baseline before any edit or network call**

Run from the clean predecessor commit:

```bash
if test -n "$(git status --porcelain=v1)"; then echo external_precondition.git_worktree_dirty >&2; exit 1; fi
if ! git merge-base --is-ancestor 4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2 HEAD; then echo external_precondition.phase_base_mismatch >&2; exit 1; fi
if ! git cat-file -e HEAD:game/packages/assets/src/approved-poc-pack.ts || ! git cat-file -e HEAD:game/packages/assets/src/approved-poc-pack.test.ts; then echo external_precondition.asset_handoff_missing >&2; exit 1; fi
if ! pnpm exec vitest run game/packages/assets/src/approved-poc-pack.test.ts; then echo external_precondition.asset_handoff_invalid >&2; exit 1; fi
pnpm verify
git rev-parse HEAD
```

Expected: every command exits 0 before any tracked byte or package store is changed; the printed clean `HEAD` is recorded as the predecessor asset-handoff checkpoint. The export may contain an empty approved pack, but both files must already be tracked in that commit. Missing/invalid handoff, dirty scope or missing Phase 1 ancestry stops here with the exact code above; Phase 0 never synthesizes or repairs the asset input.

- [ ] **Step 2: Record the exact toolchain inputs**

Set `.node-version` to `26.5.0`, root `packageManager` to `pnpm@11.11.0`, and keep the existing compatible `engines` floors. These exact values are materialization inputs; future upgrades require rerunning this plan.

Add the root-anchored `/.project-tavern/` entry to `.gitignore`. It owns only local materialization attestations, visual runs/diagnostics and other reproducible operator evidence; tracked checkpoints remain under `docs/**`. Assert `git check-ignore .project-tavern/goal-materialization.json .project-tavern/visual-runs/probe .project-tavern/visual-diagnostics/probe` succeeds before continuing.

- [ ] **Step 3: Install every future direct dependency into its final owner**

Run exactly:

```bash
pnpm --filter @sillymaker/web add --save-exact idb@8.0.3
pnpm --filter @sillymaker/web add --save-dev --save-exact fake-indexeddb@6.2.5
pnpm --filter @sillymaker/ui add --save-exact lucide-react@1.24.0
pnpm --filter @sillymaker/ui add --save-exact @radix-ui/react-dialog@1.1.19
pnpm --filter @sillymaker/ui add --save-exact @fontsource/noto-sans-sc@5.2.9
pnpm --filter @sillymaker/ui add --save-peer --save-exact react-dom@19.2.7
pnpm add --workspace-root --save-dev --save-exact stylelint@17.14.0 stylelint-config-standard@40.0.0 @axe-core/playwright@4.12.1 yaml@2.9.0
pnpm install --frozen-lockfile
```

`yaml@2.9.0` is the exact root-dev parser for `pnpm-lock.yaml` canonical package/snapshot/resolution data; it has no workflow/CI role. No workflow/hosting dependency is admitted because remote distribution is deferred. Under pnpm 11.11.0, the one `--save-peer` command must leave exact `react-dom` entries in both UI `peerDependencies` (consumer ABI) and `devDependencies` (isolated UI tests); assert both rather than running a second classification-changing add. Expected: exact manifests and lockfile change; lifecycle allowlist remains empty unless a dependency proves a reviewed build requirement.

- [ ] **Step 4: Prove the frozen dependencies, asset handoff and existing Phase 1 baseline still pass**

Run:

```bash
pnpm exec vitest run game/packages/assets/src/approved-poc-pack.test.ts
pnpm verify
git diff --check
git status --short --branch
```

Expected: the already committed empty or owner-approved non-empty handoff still passes its byte contract, current verification passes, and only this task's manifest/toolchain files are changed. Any new asset byte or handoff edit is out of scope and must return to the predecessor track.

- [ ] **Step 5: Commit the frozen dependency set**

```bash
git add -- .node-version .gitignore package.json engine/packages/web/package.json engine/packages/ui/package.json pnpm-lock.yaml
git diff --cached --check
git diff --cached --name-only
git commit -m "build: materialize poc toolchain dependencies"
```

## Task 2: Implement the tracked materialization contract

**Files:**

- Create: `scripts/preflight/materialization-lock.json`
- Create: `scripts/preflight/materialization-contract.mts`
- Create: `scripts/preflight/materialization-contract.test.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: `MaterializationContractV1`, `deriveExternalPackageClosureV1(lockfile)`, `computeMaterializationDigestV1(contract)`, exact browser/tool identifiers and stable failure codes.
- Produces: explicit writer `pnpm update:materialization-lock`; ordinary verification and `prepare:goal` only validate its tracked output.

- [ ] **Step 1: Write failing canonical-closure tests**

Tests must prove importer reorder/rename does not change the digest, any external package/version/integrity change does, browser/tool version changes do, duplicate/missing entries fail, and Strict JSON round-trips canonically.

- [ ] **Step 2: Run the focused tests and confirm the intended red**

Run: `pnpm exec vitest run scripts/preflight/materialization-contract.test.ts`

Expected: FAIL only because the contract implementation and lock do not exist.

- [ ] **Step 3: Implement the explicit atomic writer and generate the reviewed lock**

Parse the lockfile with the exact root-owned `yaml@2.9.0`; production tooling must not use regex or a home-grown YAML subset parser. The tracked JSON contains schema revision `1`, pnpm `11.11.0`, Playwright `1.61.1`, Chromium revision `1228`, WebKit revision `2311`, and the sorted external package closure with each package key plus its complete canonical `packages`/`snapshots` resolution record (including integrity whenever present). It contains no availability claim, host OS/architecture, workspace importer layout or local path.

Expose exactly:

```json
{
  "update:materialization-lock": "node --experimental-strip-types scripts/preflight/materialization-contract.mts --write"
}
```

`--write` derives the entire candidate into a sibling temporary file, parses and validates it again, fsyncs/atomically renames it, and exits without touching any other tracked path. The no-argument/read API never writes. Run the writer, then make the new file visible and review its complete deterministic output:

```bash
pnpm update:materialization-lock
git add -N -- scripts/preflight/materialization-lock.json
git diff --no-ext-diff -- scripts/preflight/materialization-lock.json
shasum -a 256 scripts/preflight/materialization-lock.json
pnpm exec vitest run scripts/preflight/materialization-contract.test.ts
```

Expected: one canonical JSON file, a stable full SHA-256, exact reviewed tool/browser fields and the complete sorted external closure. A second writer run is byte-identical. Tests prove an interrupted/invalid candidate never replaces the accepted file and that `pnpm verify`, `verify:materialization`, and `prepare:goal` never invoke the writer.

- [ ] **Step 4: Verify and commit**

Run the focused test, `pnpm test:scripts`, `pnpm verify`, a second writer/byte comparison, `git diff --check`, then commit only the contract files and package script changes as `build: freeze goal materialization contract`.

## Task 3: Implement the side-effecting materializer and offline verifier

**Files:**

- Create: `scripts/preflight/materialize-goal.mts`
- Create: `scripts/preflight/materialize-goal.test.ts`
- Create: `scripts/preflight/verify-materialization.mts`
- Create: `scripts/preflight/verify-materialization.test.ts`
- Modify: `package.json`
- Modify: `scripts/run-script-tests.test.mjs`

**Interfaces:**

- Produces: `pnpm prepare:goal`, `pnpm verify:materialization`, and ignored `GoalMaterializationAttestationV1` for this host.

- [ ] **Step 1: Write failing injected-environment tests**

Freeze structured child-process/socket arguments and one exact code for every failure class. Tests use injected adapters and never contact a real registry or browser-download source:

| Failure class                                                              | Stable code                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| dirty scope                                                                | `external_precondition.git_worktree_dirty`             |
| detached/unexpected branch                                                 | `external_precondition.git_branch_invalid`             |
| missing Phase 1 or materialization ancestor                                | `external_precondition.phase_base_mismatch`            |
| missing `user.name`/`user.email`                                           | `external_precondition.git_identity_missing`           |
| occupied `127.0.0.1:{4173,41731,41732}`                                    | `external_precondition.port_unavailable`               |
| Node/pnpm mismatch                                                         | `external_precondition.toolchain_mismatch`             |
| online package resolution/materialization failure                          | `external_precondition.package_materialization_failed` |
| required host package/store object absent                                  | `external_precondition.host_package_missing`           |
| host OS/architecture differs from attestation                              | `external_precondition.host_platform_mismatch`         |
| Playwright browser download/install failure                                | `external_precondition.browser_materialization_failed` |
| expected browser executable absent                                         | `external_precondition.browser_missing`                |
| browser revision mismatch                                                  | `external_precondition.browser_revision_mismatch`      |
| exact browser executable cannot launch                                     | `external_precondition.browser_launch_failed`          |
| required bundled visual font absent/unloadable                             | `external_precondition.visual_font_missing`            |
| host temp/cache free-space floor not met                                   | `external_precondition.insufficient_disk_space`        |
| disposable offline frozen install failure                                  | `external_precondition.offline_install_failed`         |
| disposable current-workspace build failure                                 | `external_precondition.offline_build_failed`           |
| tracked contract/closure or ignored attestation missing, invalid, or stale | `external_precondition.materialization_stale`          |

- [ ] **Step 2: Implement `prepare:goal`**

The writer:

1. requires a clean worktree at the final Task 3 tooling commit, a non-detached branch, and `4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2` as an ancestor; it records the current Task 3 `HEAD` as `materializationBaseCommit` plus the exact branch;
2. requires non-empty repository-local/effective `git config user.name` and `user.email`, then proves it can exclusively bind and close final fixed ports `127.0.0.1:4173`, `41731`, and `41732` without starting a long-lived server; Phase 1's temporary `4174` Developer preview is exercised only by the current baseline verification and is not persisted in the long-Goal attestation;
3. verifies exact Node/pnpm and the tracked materialization contract;
4. requires at least 8 GiB free in the host temp/cache location, performs the one allowed online frozen host install, leaves the exact host pnpm store available for Phase 2–6/archive builds, and installs Playwright Chromium/WebKit;
5. proves the frozen `@fontsource/noto-sans-sc` package contains the weights consumed by the visual verifier;
6. proves a disposable host source copy can run `pnpm install --offline --frozen-lockfile`, build the current Phase 1 Player root, launch both exact Playwright browsers, and load the required local font files without any download;
7. writes the canonical local attestation atomically under `.project-tavern/` only after every check passes.

Set and test the root public mappings exactly:

```json
{
  "prepare:goal": "node --experimental-strip-types scripts/preflight/materialize-goal.mts",
  "verify:materialization": "node --experimental-strip-types scripts/preflight/verify-materialization.mts"
}
```

`materialize-goal.test.ts`, `verify-materialization.test.ts`, and `scripts/run-script-tests.test.mjs` freeze these exact structured entries and prove neither command shells out through a command string; `prepare:goal` is never reachable from `pnpm verify`.

The attestation records `materializationBaseCommit`, branch, fixed port set, materialization digest, package-closure digest, `process.platform`, `process.arch`, browser revisions/executable availability and completion status, but no Git identity value, absolute executable/repository path, hostname or credential. `materializationBaseCommit` is provenance for the clean preparation checkpoint, not an equality lock on every later phase commit. The host OS/architecture are availability evidence, not tracked contract inputs; Phase 5C records its stricter visual-environment fingerprint with every accepted screenshot baseline.

- [ ] **Step 3: Implement `verify:materialization`**

The verifier performs no network operation. It recomputes the external closure/digest, checks the same non-detached branch, Phase 1/materialization ancestors, effective Git identity presence and fixed-port bindability, then checks the attestation, current host OS/architecture, host pnpm store, exact browser revisions/executable availability, required font files and the 8 GiB host free-space floor. It runs a bounded disposable host `pnpm install --offline --frozen-lockfile` smoke, builds the current workspace, launches Chromium and WebKit, and proves the visual font is loadable without download. It requires `git merge-base --is-ancestor <materializationBaseCommit> HEAD`, but deliberately does not require equality: Phase 2–6 commits may change source and workspace importer layout while the canonical external package closure remains identical. A non-ancestor checkpoint, changed branch/toolchain/materialization contract, changed external package closure, changed host platform, missing browser/font evidence or failed offline smoke returns its stable external-precondition code before any implementation edit.

- [ ] **Step 4: Run the injected tests and commit the tooling**

Run the focused tests, `pnpm test:scripts`, the existing non-materialization verification that can run before an attestation exists, and `git diff --check`. Commit only scripts/package mappings as `build: add offline goal materialization`. Do not run the real materializer from a dirty worktree: its attested source SHA must be this final tooling commit, not the preceding Task 2 commit or an uncommitted implementation.

- [ ] **Step 5: Materialize once from the clean final checkpoint**

From the clean Task 3 commit, run `pnpm prepare:goal`, then `pnpm verify:materialization`, `pnpm install --offline --frozen-lockfile`, `pnpm verify`, the tracked-byte/status comparison and `git diff --check`. The ignored attestation must record the exact Task 3 HEAD as `materializationBaseCommit`. Any tracked mutation is a failure; there is no post-attestation commit in this plan.

## Materialization Acceptance

Run from the final clean HEAD:

```bash
pnpm verify:materialization
pnpm install --offline --frozen-lockfile
pnpm verify
git diff --check
git status --short --branch
```

Acceptance requires:

- exact dependency owners and a frozen lockfile contain every Phase 2–6 external package;
- no Phase 2–6 plan contains a `pnpm add`, `pnpm view`, `npx --yes`, browser download or package-registry lookup step;
- both exact host browsers and the required local font files match the tracked contract and ignored host attestation;
- offline install and baseline verification pass without changing tracked files;
- the ignored attestation matches the final materialization checkpoint;
- only after this checkpoint may the long Phase 2–6 Goal be created.
