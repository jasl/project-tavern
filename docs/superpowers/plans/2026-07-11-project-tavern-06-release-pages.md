# Project Tavern Phase 6 Release and GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one reproducibly built, fully verified Player artifact with the project legal scope, plus immutable-SHA GitHub workflows that can deploy those exact bytes to protected GitHub Pages without rebuilding.

**Architecture:** A single nonpublishing `pnpm verify` expands all deterministic code/test/build/browser gates. One closed artifact wrapper builds Demo Player, Demo Developer, and E2E Player, leaving the release-eligible ignored `dist/player` from the current checkout; release preparation verifies and manifests those exact bytes and CI uploads them. An authorized Pages job downloads the artifact produced by its own successful verification job, wraps it for Pages, deploys it without checkout/build, and runs read-only remote smoke.

**Tech Stack:** Existing Project Tavern workspace, Vite production build, Playwright 1.61.1, Node.js 24.18.0, pnpm 11.11.0, GitHub Actions pinned to immutable commit SHAs, GitHub Pages with HashRouter and relative assets.

## Global Constraints

- Phase 5 Acceptance must pass twice and the working tree must be clean before this phase starts.
- `pnpm verify` and `pnpm verify:release` are nonpublishing and never change tracked files, baselines, remote state, repository settings, or Pages.
- Player source maps are disabled. Developer artifact is verified locally/CI but never deployed.
- Vite Player and Developer builds use `base: "./"`; application routing uses HashRouter. Emitted URLs and manifests contain no root-relative runtime path.
- Verification builds Player once per workflow run for consumption by Playwright, artifact inspection, manifest creation, and upload. The Pages deploy job does not rebuild.
- Release identity excludes timestamps, temporary directories, absolute paths, file traversal order, and archive metadata. Sorted relative-path + SHA-256 manifests are authoritative.
- Every workflow `uses:` reference is a full SHA from `scripts/release/actions-lock.json` with its reviewed tag in a comment. Floating tags and unlisted actions fail validation.
- Every uploaded artifact sets `retention-days: 30`. Failure evidence is bounded and path-scrubbed.
- Registry audit is a separate scheduled/manual workflow. A transient registry failure does not make local deterministic verification flaky.
- Release `.mts` tools are type-erasable and run directly under pinned Node 24 native TypeScript stripping; they use no transform-required TypeScript feature or second TS runtime.
- `pnpm test:scripts` recursively discovers and executes every `scripts/**/*.test.mjs` and `scripts/**/*.test.ts` exactly once through the Phase 1 runner; Phase 6 release/docs subdirectories may not depend on shallow globs or hand-maintained test lists.
- Release bundles include `LICENSE.md`, `NOTICE`, the three project legal texts, and the repository's non-exhaustive `THIRD_PARTY_NOTICES.md` boundary statement. They do not generate dependency/vendor license inventories or gate release on third-party license scanning.
- `references/`, all of `art-source/aigc/**`, secrets, `.env`, Developer modules, Story `./development`, fixtures, local paths, and source maps are forbidden from Player.
- Rollback is forward-only: revert/fix source, run the current workflow, and deploy the new current-run artifact. Never redeploy an older cross-run artifact or lower the IndexedDB database revision.
- Pushing, enabling Pages, approving an environment, or deploying requires explicit user authority. Local completion produces a deploy-ready handoff without claiming a remote deployment. The deploy job never checks out or builds; the read-only smoke job may check out the exact workflow SHA solely to obtain its test code, but may not build or alter the deployed artifact.
- Every task uses a focused failing test, confirms the expected failure, implements the minimum behavior, runs the focused suite plus current `pnpm verify`, reviews staged scope, and commits.

---

## Reviewed GitHub Actions Allowlist

Create `scripts/release/actions-lock.json` from this exact mapping. A later action upgrade is a separate reviewed dependency task.

```json
{
  "actions/checkout": { "sha": "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0", "tag": "v7.0.0" },
  "pnpm/action-setup": { "sha": "0ebf47130e4866e96fce0953f49152a61190b271", "tag": "v6.0.9" },
  "actions/setup-node": { "sha": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e", "tag": "v6.4.0" },
  "actions/upload-artifact": { "sha": "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a", "tag": "v7.0.1" },
  "actions/download-artifact": { "sha": "3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c", "tag": "v8.0.1" },
  "actions/configure-pages": { "sha": "45bfe0192ca1faeb007ade9deae92b16b8254a0d", "tag": "v6.0.0" },
  "actions/upload-pages-artifact": { "sha": "fc324d3547104276b827a68afc52ff2a11cc49c9", "tag": "v5.0.0" },
  "actions/deploy-pages": { "sha": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "tag": "v5.0.0" }
}
```

The SHA/tag pairs above are exact. Task 5 validates these identities and workflow behavior without adding per-action license evidence.

## File Map

```text
scripts/verify.mjs                         # complete local/CI nonpublishing gate, extended from Phase 1
scripts/verify-release.mjs                 # full release-only expansion
scripts/run-script-tests.mjs               # recursive Node/Vitest script-test owner from Phase 1
scripts/run-script-tests.test.mjs          # final no-omission/duplicate discovery contract
scripts/release/build-artifact.mts         # flavor/Story build wrapper
scripts/release/create-artifact-manifest.mts
scripts/release/verify-player-artifact.mts
scripts/release/build-reproducibly.mts
scripts/release/smoke-player.mts
scripts/release/validate-workflows.mts
scripts/release/post-deploy-smoke.mts
scripts/release/actions-lock.json
scripts/release/*.test.ts                  # focused release-tool tests
apps/web/playwright.prebuilt.config.ts     # tests only prebuilt bytes
apps/web/e2e/release-*.spec.ts             # artifact/base-path/full flow smoke
.github/workflows/ci.yml                   # PR/main verification and artifact
.github/workflows/pages.yml                # authorized same-run Pages deployment
.github/workflows/dependency-audit.yml      # separate registry-facing audit
docs/runbooks/                              # verification, deployment, rollback, playtest
docs/checkpoints/                           # final evidence template
```

### Task 1: Freeze build flavors and one artifact builder

**Files:**

- Create: `scripts/release/build-artifact.mts`
- Create: `scripts/release/build-artifact.test.ts`
- Create: `scripts/release/build-config.mts`
- Modify: root `vite.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the closed Story-owned application-root map from Phase 5 (`demo/player`, `demo/developer`, `e2e/player`).
- Produces: `buildArtifact({ story, flavor, outDir, sourcemap })` as the only production build entry plus exact `build:player`, `build:developer`, and `build:e2e-player` scripts.

- [ ] **Step 1: Write failing build-config and argument-validation tests**

```ts
it("pins the production Player to the Demo-owned Player root", () => {
  const config = resolveBuildConfig({ story: "demo", flavor: "player", outDir: "dist/player" });
  expect(config.applicationHtml).toBe("stories/demo/player.html");
  expect(config.sourcemap).toBe(false);
  expect(config.base).toBe("./");
});

it("pins the E2E Player to the same closed artifact wrapper", () => {
  const config = resolveBuildConfig({ story: "e2e", flavor: "player", outDir: "dist/e2e-player" });
  expect(config.applicationHtml).toBe("stories/e2e/player.html");
  expect(config.sourcemap).toBe(false);
  expect(config.base).toBe("./");
});

it("rejects an outDir outside the repository dist directory", async () => {
  await expect(buildArtifact({ story: "demo", flavor: "player", outDir: "../player", sourcemap: false }))
    .rejects.toThrow(/release\.invalid_output_path/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm exec vitest run scripts/release/build-artifact.test.ts`

Expected: FAIL because the release build wrapper does not exist.

- [ ] **Step 3: Implement the only production build entry**

```ts
export interface ArtifactBuildRequestV1 {
  readonly story: "demo" | "e2e";
  readonly flavor: "player" | "developer";
  readonly outDir: `dist/${string}`;
  readonly sourcemap: boolean;
}
```

Map `(demo,player)` to `stories/demo/player.html`, `(demo,developer)` to `stories/demo/developer.html`, and `(e2e,player)` to `stories/e2e/player.html`; reject `(e2e,developer)`, Player+sourcemap, non-dist output, unknown Story/flavor, and every caller-supplied/dynamic root path. Invoke Vite 8 programmatically with repository root, the allowlisted HTML as `build.rolldownOptions.input`, `base: "./"`, `emptyOutDir: true`, the reviewed source-graph evidence plugin, and no alias from MIT Web code into a Story. Do not generate, inspect, or cross-check dependency-license inventories. Write `dist/<name>/build-input.json` containing the closed application ID, Story/flavor, selected workspace-relative application HTML, source-graph digest, source commit, engine/story/resolved/app identities, exact tool versions, and no timestamp/absolute path; normalized source graph stays outside the shipped Player under ignored `dist/build-evidence/<application-id>-source-graph.json`.

Replace the Phase 1 build-script implementations, without renaming the public commands:

```json
{
  "build:player": "node scripts/release/build-artifact.mts --story demo --flavor player --out-dir dist/player --sourcemap false",
  "build:developer": "node scripts/release/build-artifact.mts --story demo --flavor developer --out-dir dist/developer --sourcemap true",
  "build:e2e-player": "node scripts/release/build-artifact.mts --story e2e --flavor player --out-dir dist/e2e-player --sourcemap false"
}
```

- [ ] **Step 4: Build all three closed applications and run current verification**

Run: `pnpm build:player && pnpm build:developer && pnpm build:e2e-player && pnpm verify:ui:flavors && pnpm test:scripts && pnpm verify`

Expected: PASS; all three commands pass through `build-artifact.mts`; `dist/player` and `dist/e2e-player` have no `.map`; `dist/developer` is not referenced by either Player HTML; the nested release-tool test is discovered exactly once.

- [ ] **Step 5: Commit the build wrapper**

```bash
git add -- scripts/release/build-artifact.mts scripts/release/build-artifact.test.ts scripts/release/build-config.mts vite.config.ts package.json
git diff --cached --check
git commit -m "build: freeze all browser artifacts"
```

### Task 2: Create artifact manifests and verify Player contents/project legal files

**Files:**

- Create: `scripts/release/create-artifact-manifest.mts`
- Create: `scripts/release/create-artifact-manifest.test.ts`
- Create: `scripts/release/verify-player-artifact.mts`
- Create: `scripts/release/verify-player-artifact.test.ts`
- Modify: `scripts/release/build-artifact.mts`
- Modify: `scripts/verify-artifact.mjs`
- Modify: `scripts/verify-bundle.mjs`
- Modify: `scripts/verify-bundle.test.mjs`
- Modify: `scripts/prepare-artifact.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: built Player directory, application-bound normalized Vite/Rolldown source graph, and resolved runtime asset manifests.
- Produces: sorted `artifact-manifest.json` and `verifyPlayerArtifact(dir)`.

- [ ] **Step 1: Write failing deterministic-manifest and forbidden-content tests**

```ts
it("sorts paths and excludes the manifest from its own digest input", async () => {
  const manifest = await createArtifactManifest(fixtureDir);
  expect(manifest.files.map((entry) => entry.path)).toEqual([
    "assets/app.js", "index.html", "LICENSE.md", "NOTICE",
  ]);
  expect(manifest.files.every((entry) => /^sha256:[0-9a-f]{64}$/.test(entry.digest))).toBe(true);
});

it.each(["./development", "DeveloperApplicationPort", "references/", "art-source/aigc/", "sourceMappingURL=", "/Users/"])(
  "rejects forbidden Player marker %s", async (marker) => {
    const dir = await playerFixtureContaining(marker);
    await expect(verifyPlayerArtifact(dir)).rejects.toThrow();
  },
);
```

- [ ] **Step 2: Run release-content tests and confirm failure**

Run:

```bash
pnpm exec vitest run scripts/release/create-artifact-manifest.test.ts scripts/release/verify-player-artifact.test.ts
node --test scripts/verify-licensing.test.mjs
```

Expected: FAIL on missing manifest/artifact verifiers.

- [ ] **Step 3: Implement deterministic artifact inspection**

Scan relative POSIX paths in sorted order, reject symlinks and path escape, and hash raw bytes with `digestBytes`. Inspect the exact application-bound source/chunk graph and emitted UTF-8 text for forbidden project modules/markers; do not infer safety only from filename and do not inspect Vite license JSON, the lockfile, dependency chunks, GitHub Actions, or `vendor/**` for third-party license classification. Copy the project legal files and the non-exhaustive third-party boundary statement into Player, then verify their canonical project-controlled hashes after copy. `artifact-manifest.json` excludes only its own bytes to avoid a recursive hash; every other payload file has an entry. CI/checkpoint evidence separately records `digestBytes(artifact-manifest.json)`.

Keep the Phase 1 public names and make their final behavior explicit:

```json
{
  "player:manifest": "node scripts/release/create-artifact-manifest.mts dist/player",
  "verify:artifact": "node scripts/verify-artifact.mjs",
  "release:prepare": "pnpm build:player"
}
```

After Vite returns, the Player branch of `build-artifact.mts` calls `prepare-artifact.mjs`: it copies/verifies project legal files, writes the self-excluding sorted manifest last, and invokes the Player verifier. Thus `build:player` always produces one complete release-eligible artifact; Developer/E2E builds do not receive Player legal postprocessing. Refactor the Phase 1 `verify-artifact.mjs` and `verify-bundle.mjs` into inspect-only commands over the caller-built outputs/source graphs; their tests fail when output is missing rather than silently rebuilding. Also remove the Phase 1 temporary Player build from `verify-licensing.mjs`: its final pre-build role is project source/legal/package/asset validation, while post-build project legal-file completeness is owned by `verify:artifact`. Add a process-spy regression proving the final ordinary `pnpm verify` invokes the main Demo Player builder exactly once (isolated `verify:release` reproducibility builds are counted separately). `release:prepare` remains an explicit operator alias for the same one build, not a second mutation pass.

- [ ] **Step 4: Build, manifest, inspect, and run licensing gates**

Run: `pnpm release:prepare && pnpm verify:artifact && pnpm verify:licensing && pnpm verify:bundle && pnpm verify`

Expected: PASS; artifact manifests are stable, project legal files are present and valid, and the manifest's detached digest is reported separately.

- [ ] **Step 5: Commit release inspection**

```bash
git add -- scripts/release/create-artifact-manifest.mts scripts/release/create-artifact-manifest.test.ts scripts/release/verify-player-artifact.mts scripts/release/verify-player-artifact.test.ts scripts/release/build-artifact.mts scripts/verify-artifact.mjs scripts/verify-bundle.mjs scripts/verify-bundle.test.mjs scripts/prepare-artifact.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs package.json
git diff --cached --check
git commit -m "build: verify player artifact contents"
```

### Task 3: Prove clean-build reproducibility and nested-base operation

**Files:**

- Create: `scripts/release/build-reproducibly.mts`
- Create: `scripts/release/build-reproducibly.test.ts`
- Create: `scripts/release/smoke-player.mts`
- Create: `scripts/release/smoke-player.test.ts`
- Create: `apps/web/playwright.prebuilt.config.ts`
- Create: `apps/web/e2e/release-base-path.spec.ts`
- Create: `apps/web/e2e/release-refresh.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the Task 1 builder and Task 2 manifest verifier.
- Produces: `pnpm release:repro` and local prebuilt smoke under a nested URL prefix.

- [ ] **Step 1: Write failing reproducibility and root-relative-path tests**

```ts
it("compares file sets and digests rather than mtimes", async () => {
  const result = await compareArtifactDirectories(buildA, buildB);
  expect(result).toEqual({ equal: true, differences: [] });
});

it("rejects root-relative browser asset references", async () => {
  const dir = await artifactFixture({ indexHtml: '<script src="/assets/app.js"></script>' });
  await expect(smokeStaticArtifact(dir, "/nested/tavern/")).rejects.toThrow(/artifact\.root_relative_url/);
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/build-reproducibly.test.ts scripts/release/smoke-player.test.ts`

Expected: FAIL because reproducibility/smoke tooling is missing.

- [ ] **Step 3: Implement isolated double builds and prebuilt-only smoke**

```ts
export async function compareArtifactDirectories(
  left: string,
  right: string,
): Promise<{ readonly equal: boolean; readonly differences: readonly string[] }>;
```

Freeze the outer repository's 40-character lowercase hexadecimal `HEAD` value before creating two fresh temporary workspace copies with `git archive <that HEAD>`. Archive workspaces have no `.git`, so the reproducibility driver passes that exact value through a dedicated `PROJECT_TAVERN_SOURCE_COMMIT` input; the build wrapper accepts it only in this archive mode, validates its form and equality to the archive source chosen by the outer driver, and otherwise resolves/validates live `git rev-parse HEAD`. Install from the same pnpm store with frozen lockfile, build/prepare/verify each Player artifact, assert both `build-input.sourceCommit` values equal the frozen outer HEAD, then compare sorted file path/digest/size tuples plus detached manifest digests. The Playwright web server serves an existing root `dist/player` under `/nested/tavern/`; test configuration must not call Vite build.

Add the exact scripts:

```json
{
  "release:repro": "node scripts/release/build-reproducibly.mts",
  "test:e2e:prebuilt": "playwright test --config apps/web/playwright.prebuilt.config.ts"
}
```

- [ ] **Step 4: Run local nested-base and reproducibility acceptance**

Run: `pnpm release:prepare && pnpm release:repro && pnpm test:e2e:prebuilt -- --project=chromium && pnpm verify`

Expected: PASS; two manifests match byte-for-byte and new game/first action/refresh-load work at the nested prefix.

- [ ] **Step 5: Commit reproducibility tooling**

```bash
git add -- scripts/release/build-reproducibly.mts scripts/release/build-reproducibly.test.ts scripts/release/smoke-player.mts scripts/release/smoke-player.test.ts apps/web/playwright.prebuilt.config.ts apps/web/e2e/release-base-path.spec.ts apps/web/e2e/release-refresh.spec.ts package.json
git diff --cached --check
git commit -m "test(release): prove reproducible nested-base player"
```

### Task 4: Freeze the local nonpublishing verification orchestrator

**Files:**

- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify-release.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `scripts/run-script-tests.test.mjs`
- Create: `scripts/docs/check-links.mts`
- Create: `scripts/docs/check-links.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: every stable local verification script through Phase 5, Phase 1's recursive script-test owner, and Phase 6 Tasks 1–3; workflow validation is attached only after Task 5 creates it.
- Produces: deterministic ordered `pnpm verify`, the local portion of `pnpm verify:release`, a final no-omission contract for recursive Node/TypeScript script tests, and documented developer commands.

- [ ] **Step 1: Write failing orchestration-order and side-effect tests**

```ts
expect(verificationSteps.map((step) => step.id)).toEqual([
  "toolchain", "format", "lint", "lint-styles", "licensing", "boundaries", "cycles",
  "typecheck", "unit", "contract", "property", "scripts", "stories", "fixtures",
  "golden", "balance", "assets", "build-player", "build-developer", "build-e2e-player",
  "ui-flavors", "bundle", "e2e-smoke", "ui-chromium", "artifact", "docs-links",
]);
expect(verificationSteps.every((step) => !step.command.includes("update:") && !step.command.includes("regenerate:")))
  .toBe(true);
```

Extend `run-script-tests.test.mjs` against the live Phase 6 checkout as well as synthetic fixtures. Recursively enumerate `scripts/` without `git ls-files` or shell globbing, compare it with `discoverScriptTestsV1`, and assert the union is exact:

```js
test("owns every live recursive script test exactly once", async () => {
  const expected = await recursivelyListScriptTestsV1(repositoryRoot);
  const discovered = await discoverScriptTestsV1(repositoryRoot);
  assert.deepEqual([...discovered.node, ...discovered.vitest].sort(), expected);
  assert.equal(new Set([...discovered.node, ...discovered.vitest]).size, expected.length);
  assert(expected.some((path) => path === "scripts/release/build-artifact.test.ts"));
  assert(expected.some((path) => path === "scripts/ui/verify-ui.test.ts"));
  assert(expected.some((path) => path === "scripts/verify.test.mjs"));
});
```

The test also injects one omitted and one duplicated nested path and requires stable `script_test.missing_owner`/`script_test.duplicate_owner` failures. It does not hardcode the complete inventory; the three witnesses only prove all owner kinds/directories are present.

- [ ] **Step 2: Run orchestrator tests and confirm failure**

Run: `node --test scripts/run-script-tests.test.mjs scripts/verify.test.mjs && pnpm exec vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because the final orchestration and link checker do not exist.

- [ ] **Step 3: Implement fail-fast orchestration with exact evidence**

```js
/** @typedef {{ readonly id: string, readonly command: string, readonly args: readonly string[] }} VerificationStepV1 */
```

Use `spawnSync(command,args,{stdio:"inherit"})` without shell interpolation. Print the failing step ID and preserve its exit code. The `scripts` step is exactly `pnpm test:scripts`; it runs once after unit/contract/property and before any build, recursively executing every Node and TypeScript script test then present. `build:player` creates the complete legal/manifested artifact once; later UI-flavor, bundle, and artifact steps are inspect-only. `verify:ui`/`ui-chromium` uses the already built Demo Player, Demo Developer, and E2E Player roots. Unit/contract/property discovery explicitly covers all Phase 3 runtime suites, while the script runner owns all release/docs/UI/asset tool tests, so the checkpoint-only `verify:persistence-diagnostics` is not nested for a second build. At Task 4, `verify:release` runs `pnpm verify`, WebKit/full browser E2E, artifact verification, and reproducibility; Task 5 appends workflow validation only after that command exists.

Preserve the stronger Phase 1 immutability guard: snapshot the sorted tracked path plus `digestBytes` of every `git ls-files -z` entry and `git status --porcelain=v1` before execution, compare both in `finally` even after a failing step, and reject unexpected untracked files outside the explicit ignored-output allowlist. Equal status text alone is insufficient because a dirty tracked file could change bytes while remaining `M`.

Keep `verify="node scripts/verify.mjs"` and `verify:release="node scripts/verify-release.mjs"`; add `docs:links="node scripts/docs/check-links.mts"`. These wrappers import the ordered step data but never evaluate a command string through a shell.

Finalize browser public names over the prebuilt three-root config: `test:e2e:smoke="playwright test --config apps/web/playwright.ui.config.ts --project=chromium --grep @smoke"` and `test:e2e:full="playwright test --config apps/web/playwright.ui.config.ts --project=chromium --project=webkit"`. Neither script starts Vite or builds. `verify:release` may invoke only the WebKit project after `pnpm verify` has already run Chromium; the all-project public command remains available for explicit full acceptance.

- [ ] **Step 4: Run the complete local gate twice**

Run: `pnpm test:scripts && pnpm verify && pnpm verify && pnpm verify:release`

Expected: all three exit 0; tracked files remain unchanged; every skipped or quarantined test is explained.

- [ ] **Step 5: Commit the public verification contract**

```bash
git add -- scripts/verify.mjs scripts/verify-release.mjs scripts/verify.test.mjs scripts/run-script-tests.test.mjs scripts/docs package.json README.md CONTRIBUTING.md
git diff --cached --check
git commit -m "build: unify project verification"
```

### Task 5: Add immutable-SHA CI and bounded failure evidence

**Files:**

- Create: `scripts/release/actions-lock.json`
- Create: `scripts/release/validate-workflows.mts`
- Create: `scripts/release/validate-workflows.test.ts`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/dependency-audit.yml`
- Modify: `scripts/verify-release.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: reviewed action allowlist and `pnpm verify:release`.
- Produces: PR/main CI that uploads the already verified Player and a separate scheduled/manual dependency audit.

- [ ] **Step 1: Add the reviewed workflow parser dependency**

Run: `pnpm add --workspace-root --save-dev --save-exact yaml@2.9.0`

Regenerate the frozen lockfile and run `pnpm verify:licensing`. Expected: the exact parser version enters the manifest/lockfile and project licensing verification remains green without creating a dependency notice record.

- [ ] **Step 2: Write failing workflow pin/retention/no-rebuild tests**

```ts
it("accepts only reviewed full action SHAs with matching tag comments", async () => {
  expect(await validateWorkflow(validCiWorkflow, actionsLock)).toEqual([]);
  expect(await validateWorkflow(ciUsingFloatingTag, actionsLock)).toContain("workflow.floating_action_ref");
});

it("requires explicit 30-day retention for every uploaded artifact", async () => {
  expect(await validateWorkflow(uploadWithoutRetention, actionsLock)).toContain("workflow.retention_missing");
});
```

- [ ] **Step 3: Run workflow tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/validate-workflows.test.ts`

Expected: FAIL because the workflow validator/lock do not exist.

- [ ] **Step 4: Implement CI from the exact allowlist**

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - uses: pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271 # v6.0.9
        with: { version: 11.11.0 }
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with: { node-version: 24.18.0, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm verify:release
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with: { name: player-${{ github.sha }}, path: dist/player, retention-days: 30, if-no-files-found: error }
```

Every `actions/upload-artifact` use sets both `retention-days: 30` and `if-no-files-found: error`; failure evidence uploads only Playwright reports/traces, scrubbed diagnostics, and DebugBundles. The dependency audit workflow runs `pnpm audit --prod` on schedule/manual and uploads a report; it is not called by `pnpm verify`.

Add `verify:workflows="node scripts/release/validate-workflows.mts"`; it parses every tracked workflow and validates the action lock identities, permissions, artifact retention, job dependencies, and no-build rules. It does not collect or validate per-action license evidence and performs no GitHub API call during ordinary verification.

Only now append `verify:workflows` to `verify:release` and its exact-order test. Before this task the release gate intentionally has no workflow step; after this task the validator covers CI and dependency-audit, and Task 6 extends the same closed set with Pages.

- [ ] **Step 5: Validate workflows and run local release verification**

Run: `pnpm verify:workflows && pnpm verify:release`

Expected: PASS; every `uses:` line is allowlisted and CI has no publish/deploy permission.

- [ ] **Step 6: Commit CI**

```bash
git add -- scripts/release/actions-lock.json scripts/release/validate-workflows.mts scripts/release/validate-workflows.test.ts scripts/verify-release.mjs scripts/verify.test.mjs .github/workflows/ci.yml .github/workflows/dependency-audit.yml package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "ci: verify reproducible player artifact"
```

### Task 6: Add same-run protected Pages deployment and post-deploy smoke

**Files:**

- Create: `.github/workflows/pages.yml`
- Create: `scripts/release/post-deploy-smoke.mts`
- Create: `scripts/release/post-deploy-smoke.test.ts`
- Create: `scripts/release/verify-downloaded-artifact.mjs`
- Create: `scripts/release/verify-downloaded-artifact.test.mjs`
- Create: `apps/web/e2e/remote-pages-smoke.spec.ts`
- Modify: `scripts/release/validate-workflows.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: current workflow's verified Player artifact.
- Produces: manual/authorized Pages workflow and read-only remote smoke.

- [ ] **Step 1: Write failing deploy-workflow structural tests**

```ts
it("deploy job downloads its verify dependency and never rebuilds", async () => {
  const model = await parseWorkflow(pagesWorkflow);
  expect(model.jobs.deploy.needs).toEqual("verify");
  expect(model.jobs.deploy.steps.some((step) => step.uses?.startsWith("actions/download-artifact@"))).toBe(true);
  expect(model.jobs.deploy.steps.some((step) => step.uses?.startsWith("actions/checkout@"))).toBe(false);
  expect(model.jobs.deploy.steps.some((step) => /pnpm (build|verify)/.test(step.run ?? ""))).toBe(false);
  expect(model.jobs.deploy.environment).toMatchObject({ name: "github-pages" });
  expect(model.permissions).toEqual({ contents: "read" });
  expect(model.jobs.deploy.permissions).toMatchObject({ pages: "write", "id-token": "write" });
  expect(model.jobs.verify.permissions?.pages).toBeUndefined();
  expect(model.jobs.smoke.permissions?.pages).toBeUndefined();
  expect(model.jobs.smoke.steps.some((step) => /pnpm build/.test(step.run ?? ""))).toBe(false);
});
```

- [ ] **Step 2: Run deploy-workflow tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/post-deploy-smoke.test.ts scripts/release/validate-workflows.test.ts && node --test scripts/release/verify-downloaded-artifact.test.mjs`

Expected: FAIL because `pages.yml` and remote-smoke tooling are absent.

- [ ] **Step 3: Implement the same-run workflow**

```yaml
on: { workflow_dispatch: {} }
permissions: { contents: read }
concurrency: { group: pages, cancel-in-progress: false }
```

The workflow refuses any ref other than the reviewed default branch before verify and still requires the protected `github-pages` environment. The `verify` job checks out, installs, runs `pnpm verify:release`, and uploads both `player-${{ github.sha }}` and a self-contained built-in-Node `artifact-verifier-${{ github.sha }}` with 30-day retention and `if-no-files-found:error`; it exports the detached manifest digest and source SHA as job outputs. Only `deploy` receives job-level `pages:write`/`id-token:write`. It starts from absent/explicitly emptied unique download directories, needs `verify`, downloads those exact names, runs the downloaded verifier over every Player payload hash plus `build-input.sourceCommit`, passes the already verified directory to `actions/upload-pages-artifact` with explicit path/30-day retention, and invokes `actions/deploy-pages` in protected `github-pages`; it never checks out or builds. The workflow validator rejects hidden-file dependence, stale/shared download paths, missing upload inputs, and default-warn artifact uploads. The verifier contains no dependency install or network call and its focused test uses hostile extra/missing/changed files.

`smoke` needs `deploy`, consumes the exact `deploy.outputs.page_url`, manifest digest, and `${{ github.sha }}`, checks out exactly that SHA only for the allowlisted remote-test source, installs frozen dependencies and Chromium, and runs remote Playwright. Before interaction it polls the HTTPS deployment's `build-input.json` and `artifact-manifest.json` with bounded exponential backoff until source SHA and detached manifest digest match the expected current run (or a fixed deadline reports the last 404/stale identity). It never invokes Vite/build/upload/deploy and treats the URL as read-only.

Add `test:e2e:remote="node scripts/release/post-deploy-smoke.mts"`. It requires an explicit HTTPS deployment URL argument/environment value, rejects localhost and credential-bearing URLs, invokes only `remote-pages-smoke.spec.ts`, and is called only by the authorized workflow or an operator following the runbook—not by local `verify:release`.

- [ ] **Step 4: Validate locally without deploying**

Run: `pnpm verify:workflows && pnpm exec vitest run scripts/release/post-deploy-smoke.test.ts && node --test scripts/release/verify-downloaded-artifact.test.mjs && pnpm verify:release`

Expected: PASS; no remote call occurs.

- [ ] **Step 5: Commit Pages workflow**

```bash
git add -- .github/workflows/pages.yml scripts/release/post-deploy-smoke.mts scripts/release/post-deploy-smoke.test.ts scripts/release/verify-downloaded-artifact.mjs scripts/release/verify-downloaded-artifact.test.mjs scripts/release/validate-workflows.test.ts apps/web/e2e/remote-pages-smoke.spec.ts package.json
git diff --cached --check
git commit -m "ci: add protected same-artifact pages workflow"
```

### Task 7: Write release, activation, smoke, and forward-rollback runbooks

**Files:**

- Create: `docs/runbooks/local-verification.md`
- Create: `docs/runbooks/pages-activation.md`
- Create: `docs/runbooks/pages-deployment.md`
- Create: `docs/runbooks/post-deploy-smoke.md`
- Create: `docs/runbooks/forward-rollback.md`
- Create: `docs/runbooks/story-hotfix-authoring.md`
- Create: `docs/runbooks/save-data-recovery.md`
- Create: `docs/runbooks/dependency-upgrades.md`
- Create: `docs/runbooks/tablet-voiceover-smoke.md`
- Create: `docs/runbooks/debug-bundle-sharing.md`
- Create: `docs/runbooks/friend-playtest.md`
- Create: `docs/checkpoints/release-evidence-template.md`
- Modify: `scripts/docs/check-links.mts`
- Modify: `scripts/docs/check-links.test.ts`
- Modify: `docs/README.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: exact commands/workflows created in this phase.
- Produces: operator instructions that distinguish local readiness, authorization, deployment, smoke, and rollback.

- [ ] **Step 1: Write failing docs-link and command-existence tests**

```ts
it("mentions only package scripts that exist", async () => {
  const commands = await extractPnpmCommands("docs/runbooks");
  const scripts = await readRootPackageScripts();
  expect(commands.filter((command) => !(command in scripts))).toEqual([]);
});
```

Extend the contract test with the exact required runbook filename set listed in this task, mandatory headings (prerequisites/command/expected/failure evidence/stop/authority), and reciprocal docs-index links before creating the files.

- [ ] **Step 2: Run docs verification and confirm failure**

Run: `pnpm docs:links && pnpm exec vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because the runbooks and/or linked command records do not exist.

- [ ] **Step 3: Write exact operational procedures**

Each runbook contains prerequisites, exact command, expected success output, failure evidence location, stop condition, and authority boundary. `pages-activation.md` covers repository Pages source=GitHub Actions and protected environment approval but does not perform it. `forward-rollback.md` permits only a new revert/fix commit through current verification; it explicitly forbids cross-run historical artifact redeploy. The additional runbooks cover: Story/Hotfix authoring and validation failure/safe mode; list/export/import/recovery/delete Save operations without promising migration; pinned dependency/lock upgrades; landscape tablet plus portrait/text-spacing/VoiceOver human smoke; DebugBundle privacy review and consent before sharing; and a friend-playtest script/feedback form that records subjective results without marking the engineering Goal or PoC fun gate passed.

- [ ] **Step 4: Run docs, release, and clean-tree verification**

Run: `pnpm docs:links && pnpm verify:release && git diff --check && git status --short --branch`

Expected: PASS; only intended runbook files are staged before commit.

- [ ] **Step 5: Commit runbooks**

```bash
git add -- docs/runbooks docs/checkpoints/release-evidence-template.md docs/README.md README.md scripts/docs/check-links.mts scripts/docs/check-links.test.ts
git diff --cached --check
git commit -m "docs: add release and pages runbooks"
```

## Phase 6 Acceptance

Run from a clean checkout with the exact pinned Node/pnpm versions:

```bash
pnpm install --frozen-lockfile
pnpm test:scripts
pnpm verify
pnpm verify:release
pnpm release:repro
pnpm verify:workflows
pnpm docs:links
git diff --check
git status --short --branch
```

Acceptance criteria:

- All commands exit 0 twice where the reproducibility plan requires it; no tracked file changes and no unexplained skip/quarantine.
- Demo Player, Demo Developer, and E2E Player all build through the single artifact wrapper; only Demo Player is release-eligible. Both Player outputs have no source map, Developer/development graph, fixtures, local paths, `references/`, `art-source/aigc/**`, secret, or remote runtime asset URL.
- `pnpm test:scripts` and the final ordered `scripts` verification step recursively discover and execute every `scripts/**/*.test.ts` and `scripts/**/*.test.mjs` exactly once, including later workflow, Pages, post-deploy, and docs tests; omission/duplication fixtures fail deterministically.
- Every artifact payload file except the self-excluding manifest has a sorted SHA-256 entry; checkpoint/CI evidence records the manifest file's own SHA-256, and required project legal/notices retain canonical hashes.
- Two fresh clean builds have identical path/size/digest tuples and identical Story/Engine/resolved/app identities.
- Prebuilt Player works at a nested base path through new game, initial VN, policy selection, first action, save, refresh, and continue.
- CI uses only the reviewed full action SHAs, frozen install, explicit browser install, 30-day artifact retention, and the repository's own verification commands.
- Pages workflow deploys only the artifact from its own successful verify job; deploy does not checkout/build, smoke checks out only the exact workflow SHA and never builds, and the protected `github-pages` environment gates deployment.
- Runbooks describe exact activation, deployment, evidence, remote smoke, and forward-only rollback without implying external authority was granted.
- Without explicit authorization, Phase 6 ends at a verified deploy-ready artifact and workflow. With authorization, the same-run deployment URL also passes remote smoke for subpath assets, `#/play`, new game, first action, and IndexedDB refresh/continue.
