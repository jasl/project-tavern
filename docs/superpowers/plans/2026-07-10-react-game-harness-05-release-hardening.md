# React Game Harness Phase 5 Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the complete game Harness into a reproducibly built, security-checked, documented, deploy-ready GitHub Pages artifact whose CI verification and deployment use the exact same Player bytes.

**Architecture:** One non-publishing `pnpm verify` orchestrates every static/test/build/smoke gate; CI uploads the Player artifact that this command already tested. The same workflow may, only on an explicitly requested main-branch run, pass that current-run artifact to a protected `deploy-pages` job that never rebuilds; a dependent read-only job smokes the deployed URL. Release scripts produce sorted SHA-256 manifests and compare two clean builds; runbooks make external approvals, rollback, real-device smoke, and human playtests explicit.

**Tech Stack:** Existing Harness, pnpm scripts, Vite production build, Playwright, GitHub Actions pinned to immutable commit SHAs.

## Global Constraints

- Phase 4 must pass twice and the worktree must be clean before release hardening starts.
- `pnpm verify` performs no publishing, deployment, baseline updates, or external writes; generated dist/reports remain ignored local outputs.
- Developer artifact is never deployed. Player artifact excludes mutating DevTools and production source maps.
- CI builds the formal Player artifact once; smoke and upload use those bytes; an authorized Pages job downloads the artifact from the same workflow run.
- Every Vite flavor uses `base: "./"` and `HashRouter`; neither source manifests nor emitted browser-fetching URLs may contain a root-relative path.
- No workflow uses a floating `@vN` tag; every action is pinned to the SHA recorded below.
- Every uploaded CI artifact, including failure reports and the Pages artifact, sets `retention-days: 30` explicitly.
- Dependency audit/network availability does not make deterministic local tests flaky; registry audit runs in a separate scheduled/manual workflow.
- Rollback is forward-only: create a new reviewed revert/fix commit, verify it, and deploy its current-run artifact. Never redeploy a historical cross-run artifact or lower IndexedDB `databaseRevision`.
- Without explicit remote/push/Pages authority, finish at a verified deploy-ready artifact and workflow commit.

## Pinned GitHub Actions Snapshot (2026-07-10)

```text
actions/checkout v7.0.0 @ 9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0
pnpm/action-setup v6.0.9 @ 0ebf47130e4866e96fce0953f49152a61190b271
actions/setup-node v6.4.0 @ 48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e
actions/upload-artifact v7.0.1 @ 043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
actions/download-artifact v8.0.1 @ 3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c
actions/configure-pages v6.0.0 @ 45bfe0192ca1faeb007ade9deae92b16b8254a0d
actions/upload-pages-artifact v5.0.0 @ fc324d3547104276b827a68afc52ff2a11cc49c9
actions/deploy-pages v5.0.0 @ cd2ce8fcbc39b97be8ca5fce6e763baed58fa128
```

The workflow contract copies this exact machine-readable allowlist, keyed by action repository:

```json
{
  "actions/checkout": {
    "sha": "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
    "tag": "v7.0.0"
  },
  "pnpm/action-setup": {
    "sha": "0ebf47130e4866e96fce0953f49152a61190b271",
    "tag": "v6.0.9"
  },
  "actions/setup-node": {
    "sha": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
    "tag": "v6.4.0"
  },
  "actions/upload-artifact": {
    "sha": "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    "tag": "v7.0.1"
  },
  "actions/download-artifact": {
    "sha": "3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
    "tag": "v8.0.1"
  },
  "actions/configure-pages": {
    "sha": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
    "tag": "v6.0.0"
  },
  "actions/upload-pages-artifact": {
    "sha": "fc324d3547104276b827a68afc52ff2a11cc49c9",
    "tag": "v5.0.0"
  },
  "actions/deploy-pages": {
    "sha": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
    "tag": "v5.0.0"
  }
}
```

A `uses:` line must have the form `owner/repository@<listed SHA> # <listed tag>`; an unlisted action, the right SHA with the wrong tag comment, or the right tag with another SHA fails validation.

## Exact Final Package Script Surface

These mappings are frozen here so CI, runbooks, and local verification cannot acquire different hidden orchestration. Tasks add each entry only when its target file exists.

```json
{
  "build:player": "tsx scripts/release/build-artifact.mts --story tavern-poc --flavor player --out-dir dist/player",
  "build:tavern-developer": "tsx scripts/release/build-artifact.mts --story tavern-poc --flavor developer --out-dir dist/tavern-developer",
  "build:e2e": "tsx scripts/release/build-artifact.mts --story e2e --flavor developer --out-dir dist/e2e",
  "preview:player:prebuilt": "vite preview --outDir dist/player --host 127.0.0.1 --port 4173 --strictPort",
  "preview:e2e:prebuilt": "vite preview --outDir dist/e2e --host 127.0.0.1 --port 4174 --strictPort",
  "test:e2e:prebuilt": "playwright test --config playwright.prebuilt.config.ts",
  "story:validate": "tsx scripts/story-cli.mts validate --all",
  "toolchain:verify": "tsx scripts/verify-toolchain.mts",
  "fixtures:persistence:verify": "tsx scripts/persistence/verify-fixtures.mts",
  "verify:ui:flavors": "tsx scripts/ui/verify-build-flavors.mts --prebuilt dist/player dist/tavern-developer dist/e2e",
  "assets:validate": "tsx scripts/assets/validate-provenance.mts && tsx scripts/assets/validate-runtime.mts --all",
  "licenses:validate": "tsx scripts/release/third-party-notices.mts --verify-inputs",
  "golden:verify": "tsx scripts/golden/verify-week.mts",
  "player:manifest": "tsx scripts/release/create-artifact-manifest.mts --dir dist/player",
  "smoke:player": "tsx scripts/release/smoke-player.mts --dir dist/player --base-path /nested/tavern/",
  "verify": "tsx scripts/verify.mts",
  "release:repro": "tsx scripts/release/build-reproducibly.mts",
  "player:inspect": "tsx scripts/release/verify-player-artifact.mts --dir dist/player",
  "workflow:validate": "tsx scripts/release/validate-workflows.mts",
  "post-deploy:smoke": "tsx scripts/release/post-deploy-smoke.mts",
  "docs:links": "tsx scripts/docs/check-links.mts README.md docs"
}
```

---

### Task 1: Finalize production artifact, security, base-path, and bundle checks

**Files:**

- Create: `scripts/release/create-artifact-manifest.mts`
- Create: `scripts/release/build-artifact.mts`
- Create: `scripts/release/build-artifact.test.ts`
- Create: `scripts/release/verify-player-artifact.mts`
- Create: `scripts/release/verify-player-artifact.test.ts`
- Create: `scripts/release/smoke-player.mts`
- Create: `scripts/release/smoke-player.test.ts`
- Create: `scripts/release/build-reproducibly.mts`
- Create: `scripts/release/build-reproducibly.test.ts`
- Create: `scripts/release/third-party-notices.mts`
- Create: `scripts/verify.mts`
- Create: `scripts/ui/verify-build-flavors.test.ts`
- Create: `playwright.prebuilt.config.ts`
- Modify: `scripts/ui/verify-build-flavors.mts`
- Modify: `scripts/story-cli.mts`
- Modify: `scripts/assets/validate-provenance.mts`
- Modify: `scripts/assets/validate-runtime.mts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: Player build, asset/license manifests, and the shared leaf checks behind the phase verifiers; the final orchestrator never nests those phase wrappers.
- Produces: one prebuilt matrix at `dist/player`, `dist/tavern-developer`, and `dist/e2e`; Player `manifest.sha256`; notices; security/base-path smoke; `pnpm verify`; `pnpm release:repro`.

- [ ] **Step 1: Write artifact-negative tests first**

Fixtures must fail for source maps, Developer route/debug codes (including DebugBundle import, authoritative/best-effort replay, and DebugCommand symbols), secrets/token patterns, local absolute paths, remote runtime URLs, root-relative browser-fetching URLs in both Story asset manifests and emitted HTML/CSS/JS, `references/`, pending/rejected/unregistered assets, unknown licenses, missing notices, missing hash entry, unexpected executable HTML, and bundle/asset budget overflow. Add config/router tests that require exact `base: "./"`, `HashRouter`, the distinct Player port surface, and both prebuilt Playwright servers; `#/play` is a hash route and must not be mistaken for a root-relative URL. Add a prebuilt-flavor contract test requiring the verifier to inspect exactly tavern Player, tavern Developer, and E2E Developer directories without invoking a build; it preserves Phase 4's Player exclusion plus active-Story fixture-resolution assertions.

- [ ] **Step 2: Confirm intended failures**

Run: `pnpm vitest run scripts/release/build-artifact.test.ts scripts/release/verify-player-artifact.test.ts scripts/release/smoke-player.test.ts scripts/release/build-reproducibly.test.ts scripts/ui/verify-build-flavors.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic artifact manifest**

Walk files in POSIX-relative sorted order, hash exact bytes, and write `manifest.sha256` without timestamps/absolute paths. The manifest excludes itself while hashing and includes all shipped JS/CSS/HTML/assets/notices.

- [ ] **Step 4: Implement the Player artifact inspector and prebuilt flavor verifier**

Implement `verify-player-artifact.mts` against exact emitted bytes and the manifest: cover every Step 1 rejection, canonical relative-path parsing, notice/license/asset-budget cross-checks, Player-only symbol/route exclusion, and no network fetch. Run `pnpm vitest run scripts/release/verify-player-artifact.test.ts`; expected PASS including every negative fixture before `player:inspect` enters the full gate.

Refactor Phase 4's `verify-build-flavors.mts` to require the exact `--prebuilt dist/player dist/tavern-developer dist/e2e` arguments in release mode. It performs no build/cleanup; it scans those already-built bytes for Player exclusion and runs the two active-Story fixture-resolution smokes. Run `pnpm vitest run scripts/ui/verify-build-flavors.test.ts`; expected PASS and zero build command.

- [ ] **Step 5: Implement formal Player smoke**

Serve exactly `dist/player` under a configurable synthetic prefix such as `/nested/tavern/`. Use Playwright to open the prefix plus `#/play`, read and retain the initial sequence-0 run's projected seed, click the Runtime-projected `RunStartControl` to dispatch exact `run.start`, drain the manifest opening card, select the first deterministic LifePolicy through the real mandatory Overlay, then execute the first ordinary action. Confirm read-only Debug export is present while import/replay/Developer routes are absent, resolve one relative asset, refresh, and continue with the same projected initial seed and selected policy. Do not invoke Vite build in smoke. `playwright.prebuilt.config.ts` similarly starts only the two `vite preview` commands from the frozen script surface and serves the already-built `dist/player` and `dist/e2e`; it contains no build command and never delegates to the Phase 4 build-and-test wrapper.

`smoke-player.test.ts` uses an injected server/browser harness to assert the exact URL/base path, no build subprocess, initial sequence-0 projection → projected RunStart command → manifest drain → LifePolicy selection → first action order, seed/policy continuity after refresh, relative asset success, and Player capability exclusions. Run `pnpm vitest run scripts/release/smoke-player.test.ts`; expected PASS before the smoke leaf enters `pnpm verify`.

- [ ] **Step 6: Implement reproducible double build**

Make the very first operation in `build-reproducibly.mts` a repository cleanliness check, before deleting/creating output directories, generating notices, or invoking Vite. Fail on staged, unstaged, or non-ignored untracked paths using Git's porcelain output; ignored `dist/` and `.tmp/repro/` are permitted. Only after that check passes, require the already-verified `dist/player/manifest.sha256`, then build the same Story/flavor into the exact two ignored outputs `.tmp/repro/player-a` and `.tmp/repro/player-b`, create manifests, and compare every relative path/hash across formal `dist/player`, build A, and build B. Never replace `dist/player` during this command. Exclude only explicitly documented non-deterministic metadata; unexpected difference fails with paths. Unit tests record the spawned-operation order and prove a dirty fixture runs zero build/cleanup operations. Add `.tmp/repro/` to `.gitignore` in this task.

- [ ] **Step 7: Generate third-party notices from frozen resolution**

Use `pnpm licenses list --prod --json` plus project asset provenance to create deterministic notices. Reject unknown/prohibited licenses instead of guessing. Freeze the shipped filename as `THIRD_PARTY_NOTICES.txt` at each artifact root. `licenses:validate` verifies the frozen dependency/asset inputs without requiring an existing build. `build-artifact.mts` calls the controlled Story build first, then writes that exact notice from the same verified inputs into its requested output; `build-reproducibly.mts` reuses the same build/notices function for A and B before hashing. Add tests proving Vite success followed by notice write, notice failure removes/rejects the incomplete artifact, and `manifest.sha256` includes the notice.

Extend `scripts/story-cli.mts` with `validate --all`. A build without `--out-dir` keeps Phase 1's closed mapping under `.tmp/story-build/<story>-<flavor>`; an explicit output is allowed only when exactly equal to `dist/player|dist/tavern-developer|dist/e2e|.tmp/repro/player-a|.tmp/repro/player-b|.tmp/ui-flavors/tavern-player|.tmp/ui-flavors/tavern-developer|.tmp/ui-flavors/e2e-developer`. Reject absolute paths, traversal, every other output directory, and invalid command/flag combinations so the exact scripts above, earlier phase gates, and Phase 4 flavor verifier remain controlled. Extend the source asset validator to reject manifest URLs beginning with `/`, `//`, or a scheme; only registered relative runtime paths are legal. `validate-runtime.mts --all` does not replace provenance checking: the frozen `assets:validate` leaf invokes `validate-provenance.mts` first and runtime validation second.

- [ ] **Step 8: Freeze the package scripts and prebuilt E2E contract**

Add the Task 1 entries from the exact final package script surface: `build:player`, `build:tavern-developer`, `build:e2e`, `verify:ui:flavors`, both prebuilt previews, `test:e2e:prebuilt`, `verify`, `release:repro`, and `player:inspect`; retain the existing `toolchain:verify` and `fixtures:persistence:verify` mappings byte-for-byte. The Playwright config uses the two preview scripts as its only `webServer` commands. Its behavior matrix must remain Chromium + WebKit over the exact Phase 4 player/opening/save/import/multi-tab/developer/accessibility/responsive specs; visual comparison remains Chromium-only over `visual.spec.ts`, with the same five repository baseline paths and `snapshotPathTemplate`. Contract tests compare project names, spec partitions, viewport/device settings, and snapshot paths against Phase 4, and fail if coverage narrows. They also inspect both server commands and fail if `vite build`, `story:build`, or `pnpm test:e2e` appears anywhere in the prebuilt path.

- [ ] **Step 9: Implement the one full verify orchestrator from leaf checks**

The completed `scripts/verify.mts` invokes each leaf exactly once, in this exact order:

```text
pnpm format:check
pnpm docs:links
pnpm lint:code
pnpm lint:styles
pnpm workflow:validate
pnpm exec depcruise src scripts e2e --config .dependency-cruiser.cjs
pnpm toolchain:verify
pnpm typecheck:app
pnpm typecheck:node
pnpm typecheck:test
pnpm story:validate
pnpm provenance:generate
pnpm provenance:verify
pnpm fixtures:persistence:verify
pnpm assets:validate
pnpm licenses:validate
pnpm vitest run
pnpm golden:verify
pnpm build:player
pnpm player:manifest
pnpm build:tavern-developer
pnpm build:e2e
pnpm verify:ui:flavors
pnpm test:e2e:prebuilt
pnpm smoke:player
pnpm player:inspect
```

Task 1 implements this list without the two not-yet-created leaves `docs:links` and `workflow:validate`; there is no existence-based conditional or silent skip. Task 2 inserts `workflow:validate` at the exact position shown after creating workflows and pinning `yaml`; Task 4 inserts `docs:links` at the exact position shown after creating the checker. Add all other supporting leaf aliases exactly as listed in the final package script surface now. The single `pnpm vitest run` already executes the 1,000-seed and fast-check test files, so no second balance wrapper is allowed. `scripts/verify.mts` uses inherited stdio/immediate failure and never invokes `verify:foundation`, `verify:simulation`, `verify:runtime`, `verify:ui`, `pnpm test:e2e`, `release:repro`, deploy, or baseline-update commands. Thus tavern Player, tavern Developer, and E2E Developer are each built exactly once during `pnpm verify`; `verify:ui:flavors`, Playwright, and Player smoke consume those prebuilt bytes without rebuilding.

- [ ] **Step 10: Run the full non-publishing gate before the checkpoint commit**

Run: `pnpm verify && git diff --check`

Expected: PASS. `pnpm verify` is allowed to run while this task's reviewed implementation is still uncommitted; do not invoke `release:repro` yet because its clean-tree precondition would correctly reject the task changes.

- [ ] **Step 11: Commit release verification**

```bash
git add scripts/release scripts/verify.mts scripts/story-cli.mts scripts/assets/validate-provenance.mts scripts/assets/validate-runtime.mts scripts/ui/verify-build-flavors.mts scripts/ui/verify-build-flavors.test.ts playwright.prebuilt.config.ts package.json vite.config.ts .gitignore
git commit -m "build: add reproducible player verification"
```

- [ ] **Step 12: Run reproducibility only after the checkpoint commit is clean**

Run: `git status --porcelain=v1 --untracked-files=all && pnpm release:repro && pnpm player:inspect && git status --short`

Expected: both status commands emit nothing; `release:repro` repeats cleanliness as its first internal operation before either build; manifests are identical and inspection passes. If this finds a defect, add a focused failing test, fix it, create a new fix commit, and repeat this step from a clean tree; never weaken or bypass the clean precondition.

### Task 2: Add immutable-SHA CI that uploads the tested Player artifact

**Files:**

- Create: `.github/workflows/verify.yml`
- Create: `.github/workflows/dependency-audit.yml`
- Create: `scripts/release/workflow-contract.test.ts`
- Create: `scripts/release/validate-workflows.mts`
- Create: `docs/engineering/ci-contract.md`
- Modify: `scripts/verify.mts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: exact Node/pnpm pins and `pnpm verify`.
- Produces: pull-request/main/manual verification, test reports, `tavern-player-<sha>` artifact, separate registry audit.

- [ ] **Step 1: Write the workflow contract and exact action allowlist before YAML**

Document permissions, triggers, concurrency, caches, artifact names/retention, browser install, the manual `deploy_pages` input, and the exact action repository -> SHA -> tag table in this plan. Every raw `uses:` line carries its matching tag comment on the same line. The verification job always has `contents: read` only; no write token. Ordinary pull-request and push runs cannot deploy.

- [ ] **Step 2: Run the workflow contract red test**

Run: `pnpm vitest run scripts/release/workflow-contract.test.ts`

Expected: FAIL because the workflows, parser-backed validator, and pinned action uses do not exist.

- [ ] **Step 3: Implement verify workflow**

Trigger on pull requests, pushes to `main`, and manual dispatch. Manual dispatch defines a boolean `deploy_pages` input defaulting to false. Verification order:

1. checkout pinned SHA;
2. pnpm action pinned SHA with version 11.11.0 and no install;
3. setup-node pinned SHA with 24.18.0 and pnpm cache;
4. `pnpm install --frozen-lockfile`;
5. `pnpm exec playwright install --with-deps chromium webkit`;
6. `pnpm verify`;
7. upload Playwright/Vitest reports on failure with explicit `retention-days: 30`;
8. upload exact `dist/player` as `tavern-player-${{ github.sha }}` on success with `retention-days: 30`, step ID `upload-player`, and `if-no-files-found: error`.

Use concurrency per ref with cancellation only for PRs; a main/manual release run is never canceled underneath an active deployment. Never build again after verify. Export these exact `verify` job outputs for release evidence and the dependent deployment:

```yaml
outputs:
  player_artifact_id: ${{ steps.upload-player.outputs.artifact-id }}
  player_artifact_digest: ${{ steps.upload-player.outputs.artifact-digest }}
  player_artifact_url: ${{ steps.upload-player.outputs.artifact-url }}
```

- [ ] **Step 4: Add separate dependency audit workflow**

Scheduled weekly and manual only: frozen install, `pnpm audit --prod --audit-level high`, and license report. It may fail on registry/network independently; it does not replace deterministic verify.

- [ ] **Step 5: Pin the YAML parser and validate workflow syntax plus local contract**

Run exactly `pnpm add -D --save-exact yaml@2.9.0`; both `package.json` and `pnpm-lock.yaml` must change and are part of this task. Add `"workflow:validate": "tsx scripts/release/validate-workflows.mts"` from the frozen script surface and insert `pnpm workflow:validate` into `scripts/verify.mts` at the frozen position immediately after both lint leaves. The validator parses only `.github/workflows/*.yml` with `yaml@2.9.0`, rejects duplicate YAML keys/aliases/custom tags, then compares every action use against the exact repository -> SHA -> tag allowlist above. It also scans raw lines to require the matching tag comment, and rejects any action repository not in the allowlist.

The contract test additionally asserts every `actions/upload-artifact` use has `retention-days: 30`, the successful Player upload exposes `artifact-id`, `artifact-digest`, and `artifact-url` through the job outputs above, and workflow scripts call `pnpm verify` rather than reconstructing its leaves. At this checkpoint the workflow has no deploy permission/action; Task 3 deliberately extends the same workflow and updates this test.

Run: `pnpm vitest run scripts/release/workflow-contract.test.ts && pnpm workflow:validate`

Expected: PASS with no generated or tracked writes.

- [ ] **Step 6: Commit CI**

```bash
git add .github/workflows/verify.yml .github/workflows/dependency-audit.yml scripts/release/workflow-contract.test.ts scripts/release/validate-workflows.mts scripts/verify.mts docs/engineering/ci-contract.md package.json pnpm-lock.yaml
git commit -m "ci: verify and package the player artifact"
```

### Task 3: Add protected Pages deployment that never rebuilds

**Files:**

- Modify: `.github/workflows/verify.yml`
- Modify: `scripts/release/workflow-contract.test.ts`
- Create: `scripts/release/post-deploy-smoke.mts`
- Create: `scripts/release/post-deploy-smoke.test.ts`
- Modify: `package.json`
- Modify: `docs/engineering/ci-contract.md`

**Interfaces:**

- Consumes: the successful `verify` job and its current-run artifact identified by commit SHA.
- Produces: protected Pages deployment, real base-path/hash-route smoke, rollback evidence.

- [ ] **Step 1: Write deployment invariants test**

Assert `deploy-pages` exists in `verify.yml`, has `needs: verify`, runs only when a manual main-branch dispatch explicitly sets `deploy_pages`, contains no checkout/install/build step, downloads exactly `tavern-player-${{ github.sha }}` from the current run (no cross-run `run-id` or token), verifies `manifest.sha256`, uses `pages: write` + `id-token: write` only in that job, targets protected `github-pages`, and has deployment concurrency with `cancel-in-progress: false`. Require `actions/upload-pages-artifact` to set `retention-days: 30`; require the deploy job to expose `page_url: ${{ steps.deployment.outputs.page_url }}`. Re-run the exact action repository -> SHA -> tag allowlist over every newly introduced `uses:` line.

- [ ] **Step 2: Run the deployment contract red tests**

Run: `pnpm vitest run scripts/release/post-deploy-smoke.test.ts scripts/release/workflow-contract.test.ts`

Expected: FAIL because the protected deployment, smoke implementation, and newly required workflow invariants are absent.

- [ ] **Step 3: Extend the verify workflow with the protected same-run deployment**

Use configure-pages, download-artifact, upload-pages-artifact, and deploy-pages pinned above, each with its exact tag comment. The job runs only for `workflow_dispatch` on `refs/heads/main` with `deploy_pages == true`, depends directly on the successful `verify` job, and downloads the current run's exact artifact without `run-id`. Verify the standard SHA-256 manifest before repackaging `dist/player` as the Pages artifact. Record the upstream `needs.verify.outputs.player_artifact_id`, `player_artifact_digest`, and `player_artifact_url` in the release evidence; expose the deployment URL as the `page_url` job output. A normal PR or push to main verifies and uploads but cannot deploy.

- [ ] **Step 4: Implement post-deploy smoke**

Add `"post-deploy:smoke": "tsx scripts/release/post-deploy-smoke.mts"` from the frozen script surface and a separate `post-deploy-smoke` job with `needs: [verify, deploy-pages]` and read-only permissions. It may checkout the same commit, install the frozen test toolchain, and install Chromium, but it must not invoke any build command. Pass `needs.deploy-pages.outputs.page_url` as `DEPLOYMENT_URL` and `needs.verify.outputs.player_artifact_digest` as `EXPECTED_ARTIFACT_DIGEST`, then run exactly `pnpm post-deploy:smoke`. The script opens the supplied URL plus `#/play`, confirms app identity/digests, retains the initial sequence-0 projected seed, dispatches exact `run.start` through the projected RunStart control, drains the manifest Scene, selects the first deterministic LifePolicy through the real Overlay, executes the first ordinary action, refreshes/continues with the same seed/policy, verifies an asset load, and writes structured JSON release evidence containing the artifact ID/digest/URL and deployment URL. Upload that evidence with `retention-days: 30`.

- [ ] **Step 5: Validate locally without deployment**

Run: `pnpm vitest run scripts/release/post-deploy-smoke.test.ts scripts/release/workflow-contract.test.ts && pnpm workflow:validate`

Expected: PASS; no external writes.

- [ ] **Step 6: Commit Pages workflow**

```bash
git add .github/workflows/verify.yml scripts/release/workflow-contract.test.ts scripts/release/post-deploy-smoke.mts scripts/release/post-deploy-smoke.test.ts package.json docs/engineering/ci-contract.md
git commit -m "ci: deploy the verified player artifact"
```

### Task 4: Write production runbooks and release evidence templates

**Files:**

- Create: `docs/runbooks/bootstrap-and-verify.md`
- Create: `docs/runbooks/story-authoring.md`
- Create: `docs/runbooks/asset-approval.md`
- Create: `docs/runbooks/save-recovery.md`
- Create: `docs/runbooks/diagnostics-privacy.md`
- Create: `docs/runbooks/pages-release-and-rollback.md`
- Create: `docs/runbooks/dependency-upgrades.md`
- Create: `docs/runbooks/tablet-voiceover-smoke.md`
- Create: `docs/runbooks/playtest-handoff.md`
- Create: `docs/runbooks/release-record-template.md`
- Create: `scripts/docs/check-links.mts`
- Create: `scripts/docs/check-links.test.ts`
- Modify: `scripts/verify.mts`
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: actual commands/UI/workflows.
- Produces: operator and author instructions that can be followed without chat history.

- [ ] **Step 1: Write each runbook with prerequisites, exact commands, expected evidence, and forward-rollback stop conditions**

No generic “run tests” language. Include exact `[storyId, slotId]` keys, atomic Auto rotation, strict compatibility refusal/export semantics, persisted `initialSeed`/`resolvedChecks`/`completion` verification, fixture/digest commands, Player-versus-Developer port abilities, asset approval fields, privacy contents, GitHub authority requirements, and safe behavior for newer IDB database revisions. `pages-release-and-rollback.md` explicitly forbids cross-run historical-artifact redeploy and history rewriting. Its exact rollback order is: set `FAULTY_SHA` to the reviewed faulty commit; branch from current `origin/main`; run `git revert --no-commit "$FAULTY_SHA"`; preserve/increase (never decrease) `databaseRevision` and all readers needed for data already written; run frozen install plus `pnpm verify` on the reviewed pending diff; create a new rollback commit; confirm the tree is clean; run `pnpm release:repro && pnpm player:inspect`; review/push that new commit; then dispatch only that commit's same-run protected deployment. If a safe forward-compatible revert cannot be written, stop serving mutations and ship/read-only recovery before any feature rollback.

- [ ] **Step 2: Define real-device smoke checklist**

Landscape tablet + VoiceOver: start/continue, top HUD details, purchase, service plan, VN choice, save, overlay focus return, 200% text, reduced motion, orientation/reflow. Record device/OS/browser/results and do not claim completion until a human signs.

- [ ] **Step 3: Define five-person playtest handoff**

Use the seven exact post-play questions and acceptance counts in `docs/poc/`; separate software readiness from gameplay validation. Record seeds, builds/digests, strategy, observed fatigue/confusion, and no collection beyond consented local notes.

- [ ] **Step 4: Add release record template**

Fields: commit, Node/pnpm/lock digest, Story/Engine identity, Player manifest, verify run, Player artifact ID/digest/URL outputs, asset approval/notices, browser smoke, tablet/VoiceOver, deployment URL, previous known-good commit (evidence only), forward-rollback commit/run/result, and known external handoffs.

- [ ] **Step 5: Write deterministic Markdown link-checker tests**

Write exact fixtures for missing relative files, bad `#fragment` targets, percent-encoded paths, path traversal outside the repository, and valid inline/reference-style links.

- [ ] **Step 6: Run the link-checker red test**

Run: `pnpm vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because `scripts/docs/check-links.mts` and the package mapping do not exist.

- [ ] **Step 7: Implement the deterministic local Markdown link checker**

`scripts/docs/check-links.mts` receives the exact roots listed on the CLI, recursively sorts Markdown files, skips fenced/code-span text, resolves local links relative to the containing file, rejects links escaping the repository, checks target existence, and validates Markdown heading fragments using deterministic GitHub-style duplicate slug numbering. It ignores only explicit `http:`, `https:`, `mailto:`, and `tel:` links; malformed URI escapes fail with source file and line. It performs no network calls and writes no files.

Add exactly:

```json
"docs:links": "tsx scripts/docs/check-links.mts README.md docs"
```

Insert `pnpm docs:links` into `scripts/verify.mts` at the frozen final position immediately after `pnpm format:check`; do not add another docs check elsewhere.

- [ ] **Step 8: Run the checker and formatting green gate**

Run: `pnpm vitest run scripts/docs/check-links.test.ts && pnpm docs:links && pnpm format:check`

Expected: PASS.

- [ ] **Step 9: Commit runbooks and checker**

```bash
git add docs/runbooks docs/README.md README.md scripts/docs scripts/verify.mts package.json
git commit -m "docs: add game harness operations runbooks"
```

### Task 5: Execute the final clean verification and authorized handoff

**Files:**

- Create or modify only if verification finds a real defect; otherwise no source change.
- Produce ignored: `dist/player/`, Playwright/Vitest reports, release evidence.

**Interfaces:**

- Consumes: all five phases.
- Produces: verified deploy-ready artifact; optional authorized deployment; explicit remaining human gates.

- [ ] **Step 1: Confirm live repository scope and clean state**

Run: `git status --short --branch && git log --oneline --decorate -10`

Expected: intended branch; no unreviewed changes.

- [ ] **Step 2: Install from the frozen lock without mutating the tree**

Run: `pnpm install --frozen-lockfile && git status --porcelain=v1 --untracked-files=all`

Expected: install exits 0 and status emits nothing. Stop here if frozen install changes tracked or non-ignored files.

- [ ] **Step 3: Run the deduplicated final gate**

Run: `pnpm verify`

Expected: exit 0 and report exact test/build/smoke counts. Its transcript matches the frozen leaf order: no phase verifier is nested; `build:player`, `build:tavern-developer`, and `build:e2e` each occur exactly once; `verify:ui:flavors`, `test:e2e:prebuilt`, and `smoke:player` consume those outputs without building. Do not conflate successful checks with worktree cleanliness.

- [ ] **Step 4: Re-check cleanliness before reproducibility, then inspect the verified artifact**

Run: `git status --porcelain=v1 --untracked-files=all && pnpm release:repro && pnpm player:inspect`

Expected: the status command emits nothing; `release:repro` independently repeats the same check as its first operation and then produces identical manifests; `player:inspect` reports no debug/source-map/secret/path/remote/root-relative/unapproved-asset finding.

- [ ] **Step 5: Verify the worktree remains clean after all local gates**

Run: `git status --short`

Expected: no output.

- [ ] **Step 6: Stop for GitHub authority if absent**

Report local commit, manifest, Story/Engine digests, exact artifact path, and required repo/Pages authority. Do not create a remote, push, or deploy implicitly.

- [ ] **Step 7: If explicitly authorized, deploy and smoke**

Push the reviewed branch, run the protected Pages workflow for that exact commit, run post-deploy smoke, and save the release record including upload artifact ID/digest/URL plus deployment URL. Record the prior known-good commit only as evidence. If rollback is required, create and verify a new forward revert/fix commit and deploy only that new run's artifact; never select the prior run's artifact for deployment.

- [ ] **Step 8: Report engineering completion separately from human gates**

List asset terms approval, tablet/VoiceOver sign-off, and five-person playtest as complete or outstanding with evidence. Do not mark PoC gameplay validated from automation alone.

## Phase 5 Completion Check

- [ ] `pnpm verify` exits 0 from frozen install without tracked writes, nested phase gates, or duplicate leaf execution.
- [ ] Tavern Player, tavern Developer, and E2E Developer each build exactly once in `pnpm verify`; flavor inspection, manifest, Playwright, security inspection, base-path/startup/policy/first-action/refresh/asset smoke, and upload all consume prebuilt bytes.
- [ ] Vite is fixed to `base: "./"` + `HashRouter`; source and artifact validators reject root-relative browser-fetching URLs.
- [ ] Two builds produce identical sorted SHA-256 manifests.
- [ ] CI action uses match the exact repository/SHA/tag allowlist; every artifact retention is 30 days.
- [ ] Verify uploads the tested artifact and exposes artifact ID, digest, and URL job outputs.
- [ ] Pages job downloads/verifies/deploys without rebuilding.
- [ ] Developer artifact is never deployable through the Pages workflow.
- [ ] `pnpm docs:links` passes and runbooks/release records define only forward rollback through a new verified commit.
- [ ] Deployment and human validations are reported only if actually performed.
