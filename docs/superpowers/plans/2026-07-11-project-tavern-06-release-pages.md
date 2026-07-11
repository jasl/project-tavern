# Project Tavern Phase 6 Story-Host Release and GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible `poc × web` and `e2e × web` Artifacts, fully verify the exact PoC bytes—including default-off runtime capabilities and persistent Cheat integrity—and make those same PoC bytes deployable to protected GitHub Pages without rebuilding.

**Architecture:** The production builder accepts only `(story, host)` from the closed set `{ poc × web, e2e × web }`; there is no Player, Developer, or Headless flavor. `pnpm verify` builds each Story/Host once for all inspect-only browser/bundle/artifact gates, while release reproducibility performs two isolated PoC builds. CI uploads only the verified `dist/poc`; the Pages deploy job downloads and deploys that same current-run Artifact without checkout or build.

**Tech Stack:** Existing Project Tavern workspace, Vite 8.1.4 production build, TypeScript 7.0.2, Playwright 1.61.1, Node.js >=22.12.0, pnpm >=11.0.0, GitHub Actions pinned to immutable commit SHAs, GitHub Pages with HashRouter and relative assets.

## Global Constraints

- Phase 5 Acceptance must pass twice and the working tree must be clean before this phase starts.
- `docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md` overrides every older Player/Developer/Headless flavor, separate Developer root, and bundle-absence rule.
- Current build matrix is exactly `poc × web → dist/poc` and `e2e × web → dist/e2e`; reject every other Story, Host, root, or output mapping.
- `pnpm verify`, `pnpm verify:release`, and all local release commands are nonpublishing and never change tracked files, baselines, remote state, repository settings, runtime capability preferences, or Pages.
- Release source maps are disabled for both Artifacts. Vite Dev Server/HMR/source-map behavior is tooling configuration, not an Artifact flavor.
- Both builds use `base: "./"`; application routing uses HashRouter. Emitted URLs and manifests contain no root-relative runtime path.
- Ordinary verification builds PoC once and E2E once per run. UI, semantic, capability, bundle, and artifact checks inspect those bytes; they do not invoke another build.
- Release reproducibility builds the PoC twice only inside isolated clean source copies and compares sorted path/size/SHA-256 tuples plus detached manifest digests.
- Debug/Tooling code may exist in `dist/poc`; Artifact verification must not reject symbols merely because they are debug-related. Runtime tests—not byte absence—prove a fresh isolated Host store defaults `RuntimeCapabilitiesV1` all false, Automation is semantic-only, and successful Cheat/fixture mutation persists `RunIntegrityV1`.
- Release Artifact still forbids source maps, `references/`, `art-source/aigc/`, absolute local paths, secrets, credential-bearing URLs, and unapproved remote runtime assets.
- Release identity excludes timestamps, temporary directories, absolute paths, traversal order, runtime capability state, and archive metadata. Sorted relative path plus SHA-256 manifests are authoritative.
- Every workflow `uses:` reference is a full SHA from `scripts/release/actions-lock.json` with its reviewed tag in a comment. Floating tags and unlisted actions fail validation.
- Generic `actions/upload-artifact` steps set `retention-days: 30` and `if-no-files-found: error`. The reviewed `actions/upload-pages-artifact` step sets only its supported `retention-days: 30`; the validator recognizes that pinned action's internal missing-file failure behavior and rejects an unsupported `if-no-files-found` input. Failure evidence is bounded and path-scrubbed.
- Registry audit remains a separate scheduled/manual workflow. Registry availability does not enter deterministic local verification.
- Release `.mts` tools remain type-erasable and run with Node native type stripping; no enum, namespace, parameter property, or second TypeScript runtime.
- `pnpm test:scripts` recursively discovers every `scripts/**/*.test.mjs` and `scripts/**/*.test.ts` exactly once.
- PoC release bundles include `LICENSE.md`, `NOTICE`, all three project legal texts, `TRADEMARKS.md`, and the repository's non-exhaustive `THIRD_PARTY_NOTICES.md` statement. They do not synthesize a dependency/vendor license inventory.
- Pages deploys only the PoC Artifact from its own successful verify job. E2E Web bytes remain CI-only.
- Rollback is forward-only: revert/fix source, run the current workflow, and deploy the new current-run PoC Artifact. Never redeploy an older cross-run Artifact or lower the IndexedDB revision.
- Pushing, enabling Pages, approving an environment, or deploying requires explicit user authority. Local completion ends with a deploy-ready handoff unless that authority is given.
- Every task uses a focused failing test, confirms the intended red, implements the minimum behavior, runs the focused suite plus current `pnpm verify`, reviews staged scope, and commits.

---

## Reviewed GitHub Actions Allowlist

Create `scripts/release/actions-lock.json` from this exact reviewed mapping. Upgrades require a separate dependency review.

```json
{
  "actions/checkout": { "sha": "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0", "tag": "v7.0.0" },
  "pnpm/action-setup": { "sha": "0ebf47130e4866e96fce0953f49152a61190b271", "tag": "v6.0.9" },
  "actions/setup-node": { "sha": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e", "tag": "v6.4.0" },
  "actions/upload-artifact": { "sha": "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a", "tag": "v7.0.1" },
  "actions/download-artifact": {
    "sha": "3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
    "tag": "v8.0.1"
  },
  "actions/configure-pages": { "sha": "45bfe0192ca1faeb007ade9deae92b16b8254a0d", "tag": "v6.0.0" },
  "actions/upload-pages-artifact": {
    "sha": "fc324d3547104276b827a68afc52ff2a11cc49c9",
    "tag": "v5.0.0"
  },
  "actions/deploy-pages": { "sha": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "tag": "v5.0.0" }
}
```

## File Map

```text
scripts/release/build-artifact.mts              # closed Story × Host builder
scripts/release/build-config.mts                # poc-web/e2e-web root mapping
scripts/release/create-artifact-manifest.mts    # deterministic payload manifest
scripts/release/verify-poc-artifact.mts          # PoC release structure/identity checks
scripts/release/build-reproducibly.mts           # two isolated PoC builds
scripts/release/smoke-poc.mts                    # nested-base prebuilt checks
scripts/release/validate-workflows.mts           # immutable-SHA/no-rebuild workflow policy
scripts/release/post-deploy-smoke.mts            # read-only current-deployment smoke
scripts/verify.mjs                               # complete local/CI nonpublishing gate
scripts/verify-release.mjs                       # release-only expansion
apps/web/playwright.prebuilt.config.ts           # serves existing dist/poc only
apps/web/e2e/release-*.spec.ts                   # PoC base/capability/integrity smoke
.github/workflows/ci.yml                         # verify and upload exact dist/poc
.github/workflows/pages.yml                      # same-run protected deployment
.github/workflows/dependency-audit.yml           # separate registry-facing audit
docs/runbooks/                                   # verification/deploy/capability/automation/playtest
docs/checkpoints/                                # final evidence template
```

### Task 1: Freeze the Story × Host builder and two closed Artifacts

**Files:**

- Create: `scripts/release/build-artifact.mts`
- Create: `scripts/release/build-artifact.test.ts`
- Create: `scripts/release/build-config.mts`
- Create: `scripts/release/build-config.test.ts`
- Modify: root `vite.config.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: the single application roots `stories/poc/index.html` and `stories/e2e/index.html`, plus the source-graph evidence plugin. E2E root/build already exists from Phase 2; Phase 5 adds PoC without creating a second E2E root.
- Produces: `buildArtifactV1(request: ArtifactBuildRequestV1)`, `build:poc`, and `build:e2e` as the only production build commands.

- [ ] **Step 1: Write failing closed-matrix and path-validation tests**

```ts
it("maps poc × web to the one PoC application root", () => {
  expect(
    resolveArtifactBuildConfigV1({ story: "poc", host: "web", outDir: "dist/poc" }),
  ).toMatchObject({
    applicationId: "poc-web",
    applicationHtml: "stories/poc/index.html",
    base: "./",
    sourcemap: false,
  });
});

it("maps e2e × web to the one E2E application root", () => {
  expect(
    resolveArtifactBuildConfigV1({ story: "e2e", host: "web", outDir: "dist/e2e" }),
  ).toMatchObject({
    applicationId: "e2e-web",
    applicationHtml: "stories/e2e/index.html",
    sourcemap: false,
  });
});

it.each([
  { story: "poc", host: "developer", outDir: "dist/poc" },
  { story: "demo", host: "web", outDir: "dist/poc" },
  { story: "poc", host: "web", outDir: "dist/developer" },
  { story: "poc", host: "web", outDir: "../poc" },
] as const)("rejects unsupported build request %#", async (request) => {
  await expect(buildArtifactV1(request as never)).rejects.toThrow(/release\.invalid_build_request/);
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/build-config.test.ts scripts/release/build-artifact.test.ts`

Expected: FAIL because the Story × Host builder does not exist.

- [ ] **Step 3: Implement the only production build entry**

```ts
export interface ArtifactBuildRequestV1 {
  readonly story: "e2e" | "poc";
  readonly host: "web";
  readonly outDir: "dist/e2e" | "dist/poc";
}
```

Require exact matching tuples: `poc/web/dist/poc` and `e2e/web/dist/e2e`. Reject caller root paths, aliases, sourcemap flags, other outDirs, and all legacy flavor names. Invoke Vite programmatically with the allowlisted HTML, `base:"./"`, `emptyOutDir:true`, source maps disabled, and normalized source-graph evidence.

Write `build-input.json` with schema revision, application ID, Story, Host, application HTML, source-graph digest, source commit, Engine/Story/ResolvedGame/application identities, and exact tool versions. It contains no timestamp, capability state, absolute path, flavor, or recursive digest.

Set root scripts exactly:

```json
{
  "build:poc": "node --experimental-strip-types scripts/release/build-artifact.mts --story poc --host web --out-dir dist/poc",
  "build:e2e": "node --experimental-strip-types scripts/release/build-artifact.mts --story e2e --host web --out-dir dist/e2e"
}
```

Delete legacy `build:player`, `build:developer`, `build:e2e-player`, and their Vite modes. Do not retain aliases.

- [ ] **Step 4: Build both closed applications and run current verification**

Run: `pnpm build:poc && pnpm build:e2e && node --experimental-strip-types scripts/ui/verify-application-graphs.mts && pnpm test:scripts && pnpm verify`

Expected: PASS; both builders pass through `build-artifact.mts`, neither output contains `.map`, and no third application root/output exists.

- [ ] **Step 5: Commit the build wrapper**

```bash
git add -- scripts/release/build-artifact.mts scripts/release/build-artifact.test.ts scripts/release/build-config.mts scripts/release/build-config.test.ts vite.config.ts package.json
git diff --cached --check
git commit -m "build: freeze story host artifacts"
```

### Task 2: Create deterministic manifests and verify PoC release contents

**Files:**

- Create: `scripts/release/create-artifact-manifest.mts`
- Create: `scripts/release/create-artifact-manifest.test.ts`
- Create: `scripts/release/verify-poc-artifact.mts`
- Create: `scripts/release/verify-poc-artifact.test.ts`
- Modify: `scripts/release/build-artifact.mts`
- Modify: `scripts/verify-artifact.mjs`
- Modify: `scripts/verify-artifact.test.mjs`
- Modify: `scripts/verify-bundle.mjs`
- Modify: `scripts/verify-bundle.test.mjs`
- Modify: `scripts/prepare-artifact.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: `dist/poc`, its normalized `poc-web` source graph, resolved runtime assets, project legal files, and `build-input.json`.
- Produces: sorted `artifact-manifest.json`, `verifyPocArtifactV1(dir)`, inspect-only `verify:artifact`/`verify:bundle`, and release-ready `build:poc`.

- [ ] **Step 1: Write failing deterministic-manifest and forbidden-content tests**

```ts
it("sorts payload paths and excludes the manifest from its own input", async () => {
  const manifest = await createArtifactManifestV1(fixtureDir);
  expect(manifest.files.map((entry) => entry.path)).toEqual([
    "LICENSE.md",
    "NOTICE",
    "assets/app.js",
    "build-input.json",
    "index.html",
  ]);
  expect(manifest.files.every((entry) => /^sha256:[0-9a-f]{64}$/.test(entry.digest))).toBe(true);
});

it.each([
  "references/",
  "art-source/aigc/",
  "sourceMappingURL=",
  "/Users/",
  "https://secret.example/token",
])("rejects forbidden PoC marker %s", async (marker) => {
  await expect(verifyPocArtifactV1(await pocFixtureContainingV1(marker))).rejects.toThrow();
});

it.each(["DebugToolsPortV1", "StoryToolingEntryV1", "FixtureBrowser"])(
  "does not reject allowed runtime tooling marker %s",
  async (marker) => {
    await expect(
      verifyPocArtifactV1(await validPocFixtureContainingV1(marker)),
    ).resolves.toBeUndefined();
  },
);
```

- [ ] **Step 2: Run focused release-content tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/create-artifact-manifest.test.ts scripts/release/verify-poc-artifact.test.ts && node --test scripts/verify-artifact.test.mjs scripts/verify-bundle.test.mjs`

Expected: FAIL because final manifest/PoC verifier and new tooling policy are absent.

- [ ] **Step 3: Implement deterministic Artifact preparation and inspection**

Scan relative POSIX paths in sorted order, reject symlink/path escape, and hash exact bytes. Verify `build-input.applicationId="poc-web"`, `story="poc"`, `host="web"`, current source commit, and the matching normalized graph digest. Copy the seven project legal files, write the self-excluding manifest last, then verify.

The PoC verifier positively permits runtime Debug/Tooling code and never scans for Developer symbol absence. It still rejects forbidden paths/bytes, source maps, secrets, remote runtime assets, unknown graph modules, and E2E/other Story roots. Capability defaults/integrity are runtime behaviors verified by prebuilt Playwright, not guessed from chunk text.

`verify:bundle` inspects both `poc-web` and `e2e-web` graphs: each must bind only its own Story application root, both reject cross-Story imports and forbidden paths, and neither may contain source maps or unregistered remote assets. It does not require the E2E Artifact to carry PoC legal postprocessing.

Set final public behavior:

```json
{
  "artifact:manifest": "node --experimental-strip-types scripts/release/create-artifact-manifest.mts dist/poc",
  "verify:artifact": "node scripts/verify-artifact.mjs dist/poc",
  "release:prepare": "pnpm build:poc"
}
```

After Vite returns, the PoC branch of `build-artifact.mts` copies legal files, creates the manifest, and invokes `verifyPocArtifactV1`; E2E remains CI-only and receives no release legal postprocessing. `verify:artifact` and `verify:bundle` inspect caller-built outputs and fail if missing; they never rebuild.

- [ ] **Step 4: Build once, inspect, and run current gates**

Run: `pnpm release:prepare && pnpm verify:artifact && pnpm verify:bundle && pnpm verify`

Expected: PASS; `dist/poc` is complete/release-eligible, tooling code is allowed, and downstream checks do not rebuild.

- [ ] **Step 5: Commit release inspection**

```bash
git add -- scripts/release/create-artifact-manifest.mts scripts/release/create-artifact-manifest.test.ts scripts/release/verify-poc-artifact.mts scripts/release/verify-poc-artifact.test.ts scripts/release/build-artifact.mts scripts/verify-artifact.mjs scripts/verify-artifact.test.mjs scripts/verify-bundle.mjs scripts/verify-bundle.test.mjs scripts/prepare-artifact.mjs package.json
git diff --cached --check
git commit -m "build: verify poc artifact contents"
```

### Task 3: Prove reproducibility, nested-base operation, and release capability semantics

**Files:**

- Create: `scripts/release/build-reproducibly.mts`
- Create: `scripts/release/build-reproducibly.test.ts`
- Create: `scripts/release/smoke-poc.mts`
- Create: `scripts/release/smoke-poc.test.ts`
- Create: `apps/web/playwright.prebuilt.config.ts`
- Create: `apps/web/e2e/release-base-path.spec.ts`
- Create: `apps/web/e2e/release-refresh.spec.ts`
- Create: `apps/web/e2e/release-capabilities.spec.ts`
- Create: `apps/web/e2e/release-integrity.spec.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: Task 1 builder, Task 2 PoC verifier/manifest, and the Phase 5 browser capability/Automation contracts.
- Produces: `release:repro`, `test:e2e:prebuilt`, nested-base smoke, and proof that normal/debug/automation behavior uses identical PoC bytes.

- [ ] **Step 1: Write failing reproducibility, base-path, and same-bytes capability tests**

```ts
it("compares sorted file sets and exact digests rather than mtimes", async () => {
  await expect(compareArtifactDirectoriesV1(buildA, buildB)).resolves.toEqual({
    equal: true,
    differences: [],
  });
});

it("rejects root-relative browser assets", async () => {
  const dir = await artifactFixtureV1({ indexHtml: '<script src="/assets/app.js"></script>' });
  await expect(smokeStaticPocArtifactV1(dir, "/nested/tavern/")).rejects.toThrow(
    /artifact\.root_relative_url/,
  );
});
```

Add browser red tests that use isolated fresh Host stores and load the same `artifact-manifest.json` digest with no session override, with `automation_bridge`, with `debug_tools`, and with `debug_tools+cheats`; all digests must match, the fresh-store default is false, only explicit contexts expose their overrides, and every context finishes without a persisted preference record.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/build-reproducibly.test.ts scripts/release/smoke-poc.test.ts`

Expected: FAIL because reproducibility/smoke tooling is absent.

- [ ] **Step 3: Implement isolated PoC builds and prebuilt-only smoke**

Freeze the live 40-character lowercase `HEAD`, create two fresh `git archive` workspaces, install with the frozen lockfile from the same pnpm store, and pass the exact source commit through the dedicated archive-build input. Build/prepare/verify PoC in each, then compare sorted path/size/digest tuples and detached manifest digests. Never compare mtimes or temporary paths.

Serve existing `dist/poc` under `/nested/tavern/`; Playwright config must not call Vite/build. Add:

```json
{
  "release:repro": "node --experimental-strip-types scripts/release/build-reproducibly.mts",
  "test:e2e:prebuilt": "playwright test --config apps/web/playwright.prebuilt.config.ts"
}
```

Prebuilt tests cover new game, initial VN, first action, Save/refresh/continue, default-off capabilities, semantic-only Automation, and successful Cheat integrity surviving Save/Load. They verify the served manifest digest is unchanged across capability URLs.

- [ ] **Step 4: Run local nested-base/reproducibility acceptance**

Run: `pnpm release:prepare && pnpm release:repro && pnpm test:e2e:prebuilt -- --project=chromium && pnpm verify`

Expected: PASS; isolated manifests match and one PoC Artifact supplies normal/debug/automation behavior at the nested prefix.

- [ ] **Step 5: Commit reproducibility and release smoke**

```bash
git add -- scripts/release/build-reproducibly.mts scripts/release/build-reproducibly.test.ts scripts/release/smoke-poc.mts scripts/release/smoke-poc.test.ts apps/web/playwright.prebuilt.config.ts apps/web/e2e/release-base-path.spec.ts apps/web/e2e/release-refresh.spec.ts apps/web/e2e/release-capabilities.spec.ts apps/web/e2e/release-integrity.spec.ts package.json
git diff --cached --check
git commit -m "test(release): prove reproducible poc artifact"
```

### Task 4: Freeze the nonpublishing verification orchestrator

**Files:**

- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify-release.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `scripts/run-script-tests.test.mjs`
- Create: `scripts/docs/check-links.mts`
- Create: `scripts/docs/check-links.test.ts`
- Modify: root `package.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: all stable checks through Phase 5 plus Phase 6 Tasks 1–3.
- Produces: deterministic ordered `pnpm verify`, local `pnpm verify:release`, exact script-test ownership, and documented commands.

- [ ] **Step 1: Write failing exact-order, one-build, and immutability tests**

```ts
expect(verificationSteps.map((step) => step.id)).toEqual([
  "format",
  "lint",
  "lint-styles",
  "boundaries",
  "cycles",
  "typecheck",
  "public-exports",
  "unit",
  "contract",
  "property",
  "scripts",
  "stories",
  "runtime-fixtures",
  "poc-commands",
  "fixtures",
  "golden",
  "determinism",
  "balance",
  "assets",
  "build-poc",
  "build-e2e",
  "semantic",
  "ui",
  "bundle",
  "e2e-smoke",
  "artifact",
  "docs-links",
]);
expect(verificationSteps.filter((step) => step.id === "build-poc")).toHaveLength(1);
expect(verificationSteps.filter((step) => step.id === "build-e2e")).toHaveLength(1);
expect(verificationSteps.filter((step) => step.id === "semantic")).toHaveLength(1);
expect(verificationSteps.findIndex((step) => step.id === "semantic")).toBeGreaterThan(
  verificationSteps.findIndex((step) => step.id === "build-e2e"),
);
expect(verificationSteps.some((step) => step.id.includes("developer"))).toBe(false);
```

Extend recursive discovery tests against the live repository and injected omission/duplication fixtures. Assert every inspect-only step fails on missing output rather than rebuilding.

- [ ] **Step 2: Run orchestrator tests and confirm failure**

Run: `node --test scripts/run-script-tests.test.mjs scripts/verify.test.mjs && pnpm exec vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because the final two-build order/link checker is absent.

- [ ] **Step 3: Implement fail-fast exact orchestration**

Use `spawnSync(command,args,{stdio:"inherit"})`, no shell command strings. Every ID above maps to one frozen leaf command; in particular `runtime-fixtures → pnpm verify:runtime-fixtures`, `poc-commands → pnpm --filter @project-tavern/story-poc verify:commands`, and `semantic → pnpm verify:semantic`. No entry invokes `verify`, `verify:phase*`, or another recursive aggregate. `test:scripts` runs once before builds. `build:poc` and `build:e2e` run once; `verify:semantic`, UI, bundle, semantic smoke, and artifact steps inspect them. Preserve the Phase 1 tracked-byte/status `finally` guard.

At Task 4, `verify:release` runs `pnpm verify`, WebKit UI E2E, prebuilt PoC smoke, artifact verification, and reproducibility. Task 5 appends workflow validation only after workflows exist.

Final browser scripts:

```json
{
  "test:e2e:smoke": "playwright test --config apps/web/playwright.ui.config.ts --project=chromium --grep @smoke",
  "test:e2e:full": "playwright test --config apps/web/playwright.ui.config.ts --project=chromium --project=webkit",
  "docs:links": "node --experimental-strip-types scripts/docs/check-links.mts"
}
```

- [ ] **Step 4: Run the complete local gate twice**

Run: `pnpm test:scripts && pnpm verify && pnpm verify && pnpm verify:release`

Expected: all commands exit 0; PoC/E2E each build once per ordinary verify; tracked/worktree state is unchanged.

- [ ] **Step 5: Commit the public verification contract**

```bash
git add -- scripts/verify.mjs scripts/verify-release.mjs scripts/verify.test.mjs scripts/run-script-tests.test.mjs scripts/docs package.json README.md CONTRIBUTING.md
git diff --cached --check
git commit -m "build: unify story host verification"
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
- Modify: root `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: reviewed Action allowlist and `pnpm verify:release`.
- Produces: PR/main CI that uploads exact verified `dist/poc`, plus separate scheduled/manual dependency audit.

- [ ] **Step 1: Add the exact workflow parser**

Run: `pnpm add --workspace-root --save-dev --save-exact yaml@2.9.0`

Expected: manifest/lockfile update exactly; current verification remains green.

- [ ] **Step 2: Write failing workflow pin/retention/PoC/no-rebuild tests**

```ts
it("accepts only reviewed full Action SHAs", async () => {
  expect(await validateWorkflowV1(validCiWorkflow, actionsLock)).toEqual([]);
  expect(await validateWorkflowV1(ciUsingFloatingTag, actionsLock)).toContain(
    "workflow.floating_action_ref",
  );
});

it("uploads only the current verified PoC directory", async () => {
  const model = await parseWorkflowV1(validCiWorkflow);
  expect(model.uploads).toContainEqual({ path: "dist/poc", retentionDays: 30 });
  expect(model.uploads.some((upload) => upload.path === "dist/e2e")).toBe(false);
});
```

- [ ] **Step 3: Run workflow tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/validate-workflows.test.ts`

Expected: FAIL because the lock, workflows, and validator are absent.

- [ ] **Step 4: Implement CI from the exact allowlist**

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - uses: pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271 # v6.0.9
        with: { version: 11 }
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm verify:release
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: poc-${{ github.sha }}
          path: dist/poc
          retention-days: 30
          if-no-files-found: error
```

Failure evidence includes only bounded Playwright reports/traces and scrubbed DebugBundles. Add `verify:workflows`; validate full SHA/tag comments, minimal permissions, retention, job dependencies, PoC path, and no extra build after `verify:release`. The dependency audit remains outside ordinary verification.

- [ ] **Step 5: Validate workflows and release gate**

Run: `pnpm verify:workflows && pnpm verify:release`

Expected: PASS; CI publishes nothing and uploads only the exact current PoC bytes.

- [ ] **Step 6: Commit CI**

```bash
git add -- scripts/release/actions-lock.json scripts/release/validate-workflows.mts scripts/release/validate-workflows.test.ts scripts/verify-release.mjs scripts/verify.test.mjs .github/workflows/ci.yml .github/workflows/dependency-audit.yml package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "ci: verify reproducible poc artifact"
```

### Task 6: Add same-run protected Pages deployment and remote smoke

**Files:**

- Create: `.github/workflows/pages.yml`
- Create: `scripts/release/post-deploy-smoke.mts`
- Create: `scripts/release/post-deploy-smoke.test.ts`
- Create: `scripts/release/verify-downloaded-artifact.mjs`
- Create: `scripts/release/verify-downloaded-artifact.test.mjs`
- Create: `apps/web/e2e/remote-pages-smoke.spec.ts`
- Modify: `scripts/release/validate-workflows.test.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: current workflow's verified `poc-${sha}` Artifact and detached manifest digest.
- Produces: authorized protected Pages workflow and read-only smoke against exact deployed PoC identity.

- [ ] **Step 1: Write failing deploy structural/no-rebuild tests**

```ts
it("deploys its verify dependency and never checks out or builds", async () => {
  const model = await parseWorkflowV1(pagesWorkflow);
  expect(model.jobs.deploy.needs).toBe("verify");
  expect(model.jobs.deploy.downloads).toContain("poc-${{ github.sha }}");
  expect(model.jobs.deploy.steps.some((step) => step.uses?.startsWith("actions/checkout@"))).toBe(
    false,
  );
  expect(model.jobs.deploy.steps.some((step) => /pnpm (build|verify)/.test(step.run ?? ""))).toBe(
    false,
  );
  expect(model.jobs.deploy.environment).toMatchObject({ name: "github-pages" });
});
```

- [ ] **Step 2: Run deploy tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/post-deploy-smoke.test.ts scripts/release/validate-workflows.test.ts && node --test scripts/release/verify-downloaded-artifact.test.mjs`

Expected: FAIL because Pages and downloaded-artifact tooling are absent.

- [ ] **Step 3: Implement the same-run workflow**

```yaml
on: { workflow_dispatch: {} }
permissions: { contents: read }
concurrency: { group: pages, cancel-in-progress: false }
```

The verify job checks out the reviewed default branch SHA, runs `pnpm verify:release`, uploads `poc-${{ github.sha }}` and a self-contained built-in-Node verifier through generic `actions/upload-artifact` with `retention-days: 30` plus `if-no-files-found: error`, and exports source SHA/manifest digest. The deploy job alone receives `pages:write`/`id-token:write`, downloads those exact current-run names into empty unique directories, verifies every payload digest plus `build-input.sourceCommit`, then calls pinned `actions/upload-pages-artifact` with only `path` and `retention-days: 30` before deploy; it must not pass that action the unsupported `if-no-files-found` input. It performs no checkout/build.

Smoke needs deploy, consumes `page_url`, polls `build-input.json` and `artifact-manifest.json` until current SHA/digest match or a fixed deadline expires, then runs only `remote-pages-smoke.spec.ts`. It checks out exactly the workflow SHA only for test code, never builds or modifies deployed bytes.

Add `test:e2e:remote="node --experimental-strip-types scripts/release/post-deploy-smoke.mts"`; require explicit HTTPS URL, reject localhost/credentials, and never call it from local `verify:release`.

- [ ] **Step 4: Validate locally without deploying**

Run: `pnpm verify:workflows && pnpm exec vitest run scripts/release/post-deploy-smoke.test.ts && node --test scripts/release/verify-downloaded-artifact.test.mjs && pnpm verify:release`

Expected: PASS; no remote call, upload, or deployment occurs.

- [ ] **Step 5: Commit Pages workflow**

```bash
git add -- .github/workflows/pages.yml scripts/release/post-deploy-smoke.mts scripts/release/post-deploy-smoke.test.ts scripts/release/verify-downloaded-artifact.mjs scripts/release/verify-downloaded-artifact.test.mjs scripts/release/validate-workflows.test.ts apps/web/e2e/remote-pages-smoke.spec.ts package.json
git diff --cached --check
git commit -m "ci: deploy verified poc artifact to pages"
```

### Task 7: Write release, capability, Automation, smoke, and rollback runbooks

**Files:**

- Create: `docs/runbooks/local-verification.md`
- Create: `docs/runbooks/runtime-capabilities.md`
- Create: `docs/runbooks/semantic-automation.md`
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

- Consumes: exact commands/workflows/runtime contracts created through Phase 6.
- Produces: operator procedures that distinguish local readiness, runtime capabilities, semantic Automation, deployment authority, smoke, privacy, and forward rollback.

- [ ] **Step 1: Write failing docs inventory/link/command tests**

```ts
it("mentions only existing pnpm scripts", async () => {
  const commands = await extractPnpmCommandsV1("docs/runbooks");
  const scripts = await readRootPackageScriptsV1();
  expect(commands.filter((command) => !(command in scripts))).toEqual([]);
});

it("contains capability and semantic automation stop lines", async () => {
  const capabilities = await readFile("docs/runbooks/runtime-capabilities.md", "utf8");
  expect(capabilities).toContain("默认关闭");
  expect(capabilities).toContain("RunIntegrity");
  const automation = await readFile("docs/runbooks/semantic-automation.md", "utf8");
  expect(automation).toContain("SemanticGamePort");
  expect(automation).toContain("不得暴露 DebugTools");
});
```

- [ ] **Step 2: Run docs verification and confirm failure**

Run: `pnpm docs:links && pnpm exec vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because the complete runbook set is absent.

- [ ] **Step 3: Write exact operational procedures**

Every runbook contains prerequisites, exact commands, expected output, failure evidence, stop condition, and authority boundary. `runtime-capabilities.md` documents fresh-store defaults, persisted Host preferences, nonpersistent URL session overrides, the same-Artifact guarantee, read-only Debug versus Cheat, integrity persistence, and how to return to normal capability state. `semantic-automation.md` documents bridge revision/discovery, operation-result unwrapping, `observe/availableActions/preview/dispatch/waitForIdle`, per-call capability recheck and `capability_disabled`, no sleeps, no coordinates, player-visible-only data, and no DebugTools.

Pages docs distinguish activation authority from deployment. Rollback permits only a new verified source change. DebugBundle docs require privacy review/consent and explain capability/integrity fields. Friend playtest records subjective feedback without declaring the engineering or fun gate passed.

- [ ] **Step 4: Run docs, release, and clean-tree verification**

Run: `pnpm docs:links && pnpm verify:release && git diff --check && git status --short --branch`

Expected: PASS; only intended runbook/checkpoint/index files are staged before commit.

- [ ] **Step 5: Commit runbooks**

```bash
git add -- docs/runbooks docs/checkpoints/release-evidence-template.md docs/README.md README.md scripts/docs/check-links.mts scripts/docs/check-links.test.ts
git diff --cached --check
git commit -m "docs: add poc release and automation runbooks"
```

## Phase 6 Acceptance

Run from a clean checkout with versions satisfying root `engines`:

```bash
pnpm install --frozen-lockfile
pnpm test:scripts
pnpm build:poc
pnpm build:e2e
pnpm verify
pnpm verify:release
pnpm release:repro
pnpm test:e2e:prebuilt -- --project=chromium
pnpm verify:workflows
pnpm docs:links
git diff --check
git status --short --branch
```

Acceptance criteria:

- All commands exit 0 with no unexplained skip/quarantine and no tracked/worktree mutation.
- Exactly `poc × web → dist/poc` and `e2e × web → dist/e2e` build through one closed `(story,host)` wrapper; no legacy flavor script/root/output or compatibility alias exists.
- PoC and E2E production outputs contain no source map, local absolute path, `references/`, `art-source/aigc/**`, secret, or unapproved remote runtime asset.
- Runtime Debug/Tooling code is allowed in PoC. The same manifest digest serves normal/debug/automation contexts; a fresh isolated Host store defaults all capabilities false, persisted preferences and session-only URL overrides do not change ResolvedGame/GameSimulation identity, and verification leaves no preference side effect.
- The shipped Automation Bridge is absent by default, exposes only SemanticGamePort when enabled, uses `waitForIdle` rather than sleep, and never changes RunIntegrity for legal actions.
- Read-only Debug leaves integrity normal; successful Cheat/fixture mutation marks it modified and the mark survives the shipped Artifact's Save/Load/Replay and DebugBundle export.
- Every PoC payload file except the self-excluding manifest has a sorted SHA-256 entry; evidence records the manifest's own detached SHA-256 and canonical project legal hashes.
- Two fresh clean PoC builds have identical path/size/digest tuples and identical Engine/Story/ResolvedGame/application identities.
- Prebuilt PoC works at a nested base path through new game, initial VN, first action, Save, refresh, continue, capability toggles, semantic Automation, and persistence of the `modified` integrity state across Save/refresh/continue.
- CI uses only reviewed full Action SHAs, frozen install, explicit browser install, 30-day retention, and repository-owned verification; it uploads only current `dist/poc`.
- Pages deploys only its own successful verify job's PoC Artifact; deploy does not checkout/build, remote smoke waits for exact current SHA/manifest, and protected `github-pages` gates deployment.
- Runbooks document Story/Host builds, capabilities, Semantic Automation, privacy, activation, deployment, remote smoke, and forward-only rollback without implying external authority.
- Without explicit authorization, Phase 6 ends at a verified deploy-ready PoC Artifact/workflow. With authorization, the same-run Pages URL passes exact-identity remote smoke.
