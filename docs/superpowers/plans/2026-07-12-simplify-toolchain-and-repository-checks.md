# Simplify Toolchain and Repository Checks Implementation Plan

> **Status:** Completed Phase 1 cleanup record; do not execute again. The later
> [`Project Tavern Goal Materialization`](2026-07-12-project-tavern-00-goal-materialization.md)
> plan deliberately reintroduces an exact local Node/package-manager checkpoint for the bounded Phase 2–6 Goal and supersedes this document's no-`.node-version` constraint for future work. The Player/Developer commands below remain as-built historical evidence only.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace exact local toolchain and repository-license gates with minimum engine declarations while preserving behavior, architecture, artifact, and E2E verification.

**Architecture:** Package metadata declares compatibility floors and the lockfile owns dependency reproducibility. The main verification orchestrator runs only checks that exercise software behavior or artifact structure. Project legal documents are human-maintained; Player preparation copies the seven project release statements without canonical hash or third-party inspection.

**Tech Stack:** Node.js `>=22.12.0`, pnpm `>=11.0.0`, ESM, Node test runner, TypeScript 7, Vite 8, Playwright 1.61, Git.

## Global Constraints

- Root `engines` must be exactly `{ "node": ">=22.12.0", "pnpm": ">=11.0.0" }`; no `.node-version`, exact `packageManager`, `engine-strict`, or runtime version verifier remains.
- Exact dependency versions, `pnpm-lock.yaml`, frozen installation, strict peer dependencies, and the installed TypeScript compiler remain unchanged.
- Delete repository legal-file/hash/metadata/screenshot-sidecar verification; do not replace it with a renamed or no-op gate.
- Player artifacts carry exactly the seven project release statements from the design; they do not carry `CONTRIBUTING.md`.
- Keep import boundaries, cycles, public exports, Story/fixture/golden/balance/assets/UI, bundle/artifact/release, deterministic simulation, and browser E2E verification.
- Do not enter Phase 2 or change gameplay/runtime contracts in this cleanup.

---

### Task 1: Replace exact toolchain gates with compatibility floors

**Files:**

- Delete: `.node-version`
- Modify: `.npmrc`
- Modify: `package.json`
- Delete: `scripts/verify-toolchain.mjs`
- Delete: `scripts/verify-toolchain.test.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`

**Interfaces:**

- Consumes: the approved compatibility floors and current `coreVerificationCommandsV1` ordering.
- Produces: standard package-manager compatibility declarations and an orchestrator with no toolchain-version gate.

- [ ] **Step 1: Add the failing orchestrator policy assertion**

Add this assertion to `keeps the ordered core gate read-only` in `scripts/verify.test.mjs`:

```js
assert(!coreVerificationCommandsV1.flat(2).includes("verify:toolchain"));
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="keeps the ordered core gate read-only" scripts/verify.test.mjs
```

Expected: FAIL because `coreVerificationCommandsV1` still contains `verify:toolchain`.

- [ ] **Step 3: Apply the minimal environment-policy change**

Make the root metadata equivalent to:

```json
{
  "engines": {
    "node": ">=22.12.0",
    "pnpm": ">=11.0.0"
  }
}
```

Remove `packageManager`, remove `.npmrc` line `engine-strict=true`, delete `.node-version`, delete both `verify-toolchain` files, remove the package script, and remove this orchestrator entry:

```js
["pnpm", ["verify:toolchain"]],
```

- [ ] **Step 4: Verify GREEN and the absence of exact gates**

Run:

```bash
node --test scripts/verify.test.mjs
node --input-type=module -e 'import assert from "node:assert/strict"; import { readFile, access } from "node:fs/promises"; const p=JSON.parse(await readFile("package.json","utf8")); assert.deepEqual(p.engines,{node:">=22.12.0",pnpm:">=11.0.0"}); assert.equal(p.packageManager,undefined); await assert.rejects(access(".node-version")); assert(!p.scripts["verify:toolchain"]);'
test -z "$(rg -l 'verify-toolchain|verify:toolchain|engine-strict=true|24\\.18\\.0|11\\.11\\.0' .npmrc package.json scripts --glob '!*.test.mjs' || true)"
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the toolchain cleanup**

```bash
git add -- .node-version .npmrc package.json scripts/verify-toolchain.mjs scripts/verify-toolchain.test.mjs scripts/verify.mjs scripts/verify.test.mjs
git diff --cached --check
git commit -m "chore: relax local toolchain constraints"
```

### Task 2: Remove repository licensing gates and narrow Player legal carriage

**Files:**

- Modify: `package.json`
- Delete: `scripts/verify-licensing.mjs`
- Delete: `scripts/verify-licensing.test.mjs`
- Delete: `apps/web/e2e/__screenshots__/sandbox-shell.png.license.json`
- Modify: `scripts/prepare-artifact.mjs`
- Modify: `scripts/verify-artifact.test.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`

**Interfaces:**

- Consumes: `prepareArtifactDirectoryV1(repositoryRoot, artifactRoot)` and `projectLegalFilesV1`.
- Produces: seven project release statements in Player artifacts and no repository licensing command or screenshot sidecar policy.

- [ ] **Step 1: Add failing assertions for the new legal boundary**

Add to `scripts/verify.test.mjs`:

```js
assert(!coreVerificationCommandsV1.flat(2).includes("verify:licensing"));
```

Add this test to `scripts/verify-artifact.test.mjs`:

```js
import { projectLegalFilesV1 } from "./prepare-artifact.mjs";

test("carries only project release statements", () => {
  assert.deepEqual(projectLegalFilesV1, [
    "LICENSE.md",
    "LICENSES/CC-BY-NC-SA-4.0.txt",
    "LICENSES/MIT.txt",
    "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
    "NOTICE",
    "THIRD_PARTY_NOTICES.md",
    "TRADEMARKS.md",
  ]);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test scripts/verify.test.mjs scripts/verify-artifact.test.mjs
```

Expected: FAIL because the orchestrator still invokes licensing verification and `projectLegalFilesV1` still contains `CONTRIBUTING.md`.

- [ ] **Step 3: Delete the static gate and narrow artifact preparation**

Delete the licensing verifier, its test, and the screenshot sidecar. Remove `verify:licensing` from `package.json` and `scripts/verify.mjs`. Change `projectLegalFilesV1` to the exact seven-element list in Step 1; do not alter digest generation, nested serving, or release reproducibility.

- [ ] **Step 4: Verify GREEN and real artifact behavior**

Run:

```bash
node --test scripts/verify.test.mjs scripts/verify-artifact.test.mjs
pnpm test:scripts
pnpm verify:artifact
pnpm verify:release
test ! -e apps/web/e2e/__screenshots__/sandbox-shell.png.license.json
test -z "$(rg -l 'verify-licensing|verify:licensing' package.json scripts || true)"
```

Expected: all commands exit 0; artifact and reproducibility checks remain green.

- [ ] **Step 5: Commit the repository-gate cleanup**

```bash
git add -- package.json scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs apps/web/e2e/__screenshots__/sandbox-shell.png.license.json scripts/prepare-artifact.mjs scripts/verify-artifact.test.mjs scripts/verify.mjs scripts/verify.test.mjs
git diff --cached --check
git commit -m "chore: remove repository licensing gates"
```

### Task 3: Migrate authoritative documentation and all six phase plans

> **Historical path note:** 本计划执行时 `docs/superpowers/plans/2026-07-11-project-tavern-04-demo-story-golden.md` 与 `docs/superpowers/plans/2026-07-11-project-tavern-05-ui-assets-accessibility.md` 仍是当时的 Phase 4/5 文件，因此下方 Files 与历史 commit 命令保留这些路径作为执行记录。旧 Phase 4 已由 `2026-07-11-project-tavern-04a-poc-gameplay-simulation.md` 与 `2026-07-11-project-tavern-04b-poc-story-golden.md` 取代；旧 Phase 5 已由 `2026-07-12-project-tavern-05a-ui-runtime-foundations.md`、`2026-07-12-project-tavern-05b-stage-character-story-presentation.md` 与 `2026-07-12-project-tavern-05c-tooling-automation-acceptance.md` 取代。后续工作不得重建或继续执行旧文件。

**Files:**

- Modify: `AGENTS.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/specs/2026-07-10-react-game-harness-design.md`
- Modify: `docs/superpowers/specs/2026-07-11-repository-licensing-design.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-02-modules-e2e-story.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-03-persistence-diagnostics.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-04-demo-story-golden.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-05-ui-assets-accessibility.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-06-local-artifact.md`
- Modify: `docs/superpowers/plans/2026-07-11-repository-licensing-implementation.md`
- Modify: `docs/superpowers/plans/2026-07-12-simplify-aigc-asset-archiving.md`

**Interfaces:**

- Consumes: the approved design and Tasks 1–2 command surface.
- Produces: future implementation instructions that never recreate exact environment or repository licensing gates.

- [ ] **Step 1: Update the authoritative prose**

Apply these rules consistently:

```text
Node.js >=22.12.0
pnpm >=11.0.0
exact dependencies + frozen lockfile remain
no verify:toolchain or verify:licensing command
no repository legal/hash/metadata/screenshot-sidecar scan
Player carries seven project release statements without canonical legal hashes
```

Remove deleted commands from every command block, ordered verifier array, expected-result paragraph, file list, `git add` list, and acceptance checklist. Replace future tasks that say “update the licensing verifier” with direct package metadata or Story `LICENSE.md` maintenance plus ordinary review. Preserve every unrelated task order and runtime verification command.

- [ ] **Step 2: Run documentation consistency scans**

Run:

```bash
test -z "$(rg -l 'verify-toolchain|verify:toolchain|verify-licensing|verify:licensing|engine-strict=true|Node\.js 24\.18\.0|pnpm 11\.11\.0|pinned Node|固定.*Node|精确.*Node' AGENTS.md CONTRIBUTING.md docs/superpowers/specs/2026-07-10-react-game-harness-design.md docs/superpowers/specs/2026-07-11-repository-licensing-design.md docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md docs/superpowers/plans/2026-07-11-project-tavern-0*.md docs/superpowers/plans/2026-07-11-repository-licensing-implementation.md docs/superpowers/plans/2026-07-12-simplify-aigc-asset-archiving.md || true)"
rg -n 'Node\.js >=22\.12\.0|pnpm >=11\.0\.0' AGENTS.md docs/superpowers/specs/2026-07-10-react-game-harness-design.md docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md
pnpm format:check
git diff --check
```

Expected: the forbidden scan is empty, minimum-version language is present in all three routing authorities, formatting passes, and no whitespace errors exist.

- [ ] **Step 3: Commit the documentation migration**

```bash
git add -- AGENTS.md CONTRIBUTING.md docs/README.md docs/superpowers/specs/2026-07-10-react-game-harness-design.md docs/superpowers/specs/2026-07-11-repository-licensing-design.md docs/superpowers/specs/2026-07-12-simplify-toolchain-and-repository-checks-design.md docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md docs/superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md docs/superpowers/plans/2026-07-11-project-tavern-02-modules-e2e-story.md docs/superpowers/plans/2026-07-11-project-tavern-03-persistence-diagnostics.md docs/superpowers/plans/2026-07-11-project-tavern-04-demo-story-golden.md docs/superpowers/plans/2026-07-11-project-tavern-05-ui-assets-accessibility.md docs/superpowers/plans/2026-07-11-project-tavern-06-local-artifact.md docs/superpowers/plans/2026-07-11-repository-licensing-implementation.md docs/superpowers/plans/2026-07-12-simplify-aigc-asset-archiving.md docs/superpowers/plans/2026-07-12-simplify-toolchain-and-repository-checks.md
git diff --cached --check
git commit -m "docs: align plans with lightweight repository policy"
```

### Task 4: Run the retained Phase 1 regression gate

**Files:**

- Verify only; no baseline writer is allowed.

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: fresh evidence that policy cleanup did not weaken runtime, architecture, artifact, or browser behavior.

- [ ] **Step 0: Keep direct TypeScript tools strip-only compatible**

Run `scripts/typescript-runtime.test.mjs` under the active Node runtime. If a supported Node release does not accept the former transform flag, change direct `.mts` commands to `--experimental-strip-types` and replace transform-required TypeScript in their import closure with equivalent erasable declarations. Do not branch on an exact Node version and do not add a second TypeScript runtime.

- [ ] **Step 1: Run the complete retained verification surface**

Run:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:scripts
pnpm test:unit
pnpm test:contract
pnpm test:property
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:public-exports
pnpm verify:stories
pnpm verify:fixtures
pnpm verify:golden
pnpm verify:balance
pnpm verify:assets
pnpm verify:ui
pnpm build:player
pnpm build:developer
pnpm verify:bundle
pnpm verify:artifact
pnpm test:e2e:smoke
pnpm test:e2e:full
pnpm verify:release
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git diff --check
git status --short --branch
```

Expected: every retained command exits 0, Chromium/WebKit pass with only the Chromium-owned visual test skipped on WebKit, tracked hashes are unchanged, and the worktree is clean.

- [ ] **Step 2: Report the policy change without resuming Phase 2**

Report the three implementation commit hashes, compatibility floors, deleted gates, retained verification evidence, artifact legal-file boundary, and clean worktree. Keep the six-phase Goal active/paused before Phase 2 unless the user separately authorizes continuation.
