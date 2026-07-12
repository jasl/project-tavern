# Project Tavern Phase 6 Reproducible Local Artifact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible local `poc × web` and `e2e × web` Artifacts, fully verify the exact PoC bytes—including default-off runtime capabilities and persistent Cheat integrity—and hand one platform-neutral manifest-bound Artifact to the separate final-human-review or future remote-distribution tracks.

**Architecture:** The production builder accepts only `(story, host)` from the closed set `{ poc × web, e2e × web }`; there is no Player, Developer or Headless flavor. `pnpm verify` builds each Story/Host once for all inspect-only browser/bundle/artifact gates, while local release reproducibility performs two isolated PoC builds. Phase 6 performs no CI, upload, hosting, workflow or remote smoke work; future distribution consumes these exact bytes without rebuilding.

**Tech Stack:** Existing Project Tavern workspace and materialization checkpoint, Vite 8.1.4 production build, TypeScript 7.0.2, Playwright 1.61.1, exact local Node/pnpm inputs, HashRouter, relative assets and local filesystem Artifacts.

## Global Constraints

- Phase 5 Acceptance and `pnpm verify:materialization` must pass twice and the working tree must be clean before this phase starts.
- `docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md` overrides every older Player/Developer/Headless flavor, separate Developer root, and bundle-absence rule.
- Current build matrix is exactly `poc × web → dist/poc` and `e2e × web → dist/e2e`; reject every other Story, Host, root, or output mapping.
- `pnpm verify`, `pnpm verify:release`, and all local release commands are offline, nonpublishing and never change tracked files, baselines, remote state, repository settings or runtime capability preferences.
- Release source maps are disabled for both Artifacts. Vite Dev Server/HMR/source-map behavior is tooling configuration, not an Artifact flavor.
- Both builds use `base: "./"`; application routing uses HashRouter. Emitted URLs and manifests contain no root-relative runtime path.
- Ordinary verification builds PoC once and E2E once per run. UI, semantic, capability, bundle, and artifact checks inspect those bytes; they do not invoke another build.
- Release reproducibility builds the PoC twice only inside isolated clean source copies and compares sorted path/size/SHA-256 tuples plus detached manifest digests.
- Debug/Tooling code may exist in `dist/poc`; Artifact verification must not reject symbols merely because they are debug-related. Runtime tests—not byte absence—prove a fresh isolated Host store defaults `RuntimeCapabilitiesV1` all false, Automation is semantic-only, and successful Cheat/fixture mutation persists `RunIntegrityV1`.
- Release Artifact still forbids source maps, `references/`, `art-source/aigc/`, absolute local paths, secrets, credential-bearing URLs, and unapproved remote runtime assets.
- Release identity excludes timestamps, temporary directories, absolute paths, traversal order, runtime capability state, and archive metadata. Sorted relative path plus SHA-256 manifests are authoritative.
- Package-registry/browser-download access ended at Phase 0. Later deterministic checks consume the already validated host pnpm store and exact host Playwright browser revisions offline; host-local availability is not part of Artifact identity.
- Release `.mts` tools remain type-erasable and run with Node native type stripping; no enum, namespace, parameter property, or second TypeScript runtime.
- `pnpm test:scripts` recursively discovers every `scripts/**/*.test.mjs` and `scripts/**/*.test.ts` exactly once.
- PoC release bundles include `LICENSE.md`, `NOTICE`, all three project legal texts, `TRADEMARKS.md`, and the repository's non-exhaustive `THIRD_PARTY_NOTICES.md` statement. They do not synthesize a dependency/vendor license inventory.
- E2E Web bytes are local integration evidence; PoC bytes are the handoff Artifact. Neither is uploaded by this phase.
- `.github/workflows/**`, GitHub Actions, GitHub Pages, Cloudflare, remote credentials, upload, deployment, remote smoke and remote rollback are forbidden scope and belong to the deferred distribution track.
- A dirty-worktree build is always `provenanceMode="development"` and never release-eligible. Only a clean exact `HEAD` or a `git archive` of it may produce `provenanceMode="clean_commit"`; formal release evidence is generated after the relevant task commit.
- Every task uses a focused failing test, confirms the intended red, implements the minimum behavior, runs the focused suite plus current `pnpm verify`, reviews staged scope, and commits.
- Every expected red must match its named test and stable diagnostic code. Every task follows the global resume contract and accepts only the exact declared staged paths.

---

## File Map

```text
scripts/release/build-artifact.mts              # closed Story × Host builder
scripts/release/build-config.mts                # poc-web/e2e-web root mapping
scripts/release/create-artifact-manifest.mts    # deterministic payload manifest
scripts/release/verify-poc-artifact.mts          # PoC release structure/identity checks
scripts/release/build-reproducibly.mts           # two isolated PoC builds
scripts/release/smoke-poc.mts                    # nested-base prebuilt checks
scripts/verify.mjs                               # complete local nonpublishing gate
scripts/verify-release.mjs                       # release-only expansion
apps/web/playwright.prebuilt.config.ts           # serves existing dist/poc only
apps/web/e2e/release-*.spec.ts                   # PoC base/capability/integrity smoke
docs/runbooks/                                   # local verification/capability/automation/privacy
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

Write `build-input.json` with schema revision, application ID, Story, Host, application HTML, source-graph digest, source commit, canonical `sourceTree`, `provenanceMode`, Engine/Story/ResolvedGame/application identities, materialization digest and exact tool versions. A clean checkout or verified archive uses the exact lowercase Git tree ID for that commit; a dirty/development build uses `sourceTree:null` and can never borrow the clean tree identity. It contains no timestamp, capability state, absolute path, flavor, or recursive digest. `build:poc` may create a development Artifact while a task is dirty; the stricter `release:prepare` entry is introduced in Task 2 and rejects dirty input.

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

Expected: PASS; both builders pass through `build-artifact.mts`, neither output contains `.map`, no third application root/output exists, and the dirty-task artifacts are explicitly non-release-eligible.

- [ ] **Step 5: Commit the build wrapper**

```bash
git add -- scripts/release/build-artifact.mts scripts/release/build-artifact.test.ts scripts/release/build-config.mts scripts/release/build-config.test.ts vite.config.ts package.json
git diff --cached --check
git commit -m "build: freeze story host artifacts"
```

- [ ] **Step 6: Prove the committed wrapper emits clean provenance**

Run: `pnpm build:poc && node --input-type=module -e 'import{readFileSync}from"node:fs";import{execFileSync}from"node:child_process";const value=JSON.parse(readFileSync("dist/poc/build-input.json","utf8"));const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();if(value.provenanceMode!=="clean_commit"||value.sourceCommit!==head)process.exit(1)'`

Expected: the ignored Artifact names the new exact task commit and is release-eligible.

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
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `scripts/prepare-artifact.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: `dist/poc`, its normalized `poc-web` source graph, resolved runtime assets, project legal files, and `build-input.json`.
- Produces: sorted `artifact-manifest.json`, `verifyPocArtifactV1(dir)`, inspect-only `verify:artifact`/`verify:bundle`, a development-safe root artifact leaf, and release-ready `build:poc`.

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

Scan relative POSIX paths in sorted order, reject symlink/path escape, and hash exact bytes. Verify `build-input.applicationId="poc-web"`, `story="poc"`, `host="web"`, the declared provenance mode/source commit/source tree, materialization digest and matching normalized graph digest. A `clean_commit` build must have the exact Git/verified-archive tree; development must have `sourceTree:null`. Copy the seven project legal files, write the self-excluding manifest last, then verify. Structural development-mode inspection is allowed during TDD; release eligibility requires clean-commit mode.

The PoC verifier positively permits runtime Debug/Tooling code and never scans for Developer symbol absence. It still rejects forbidden paths/bytes, source maps, secrets, remote runtime assets, unknown graph modules, and E2E/other Story roots. Its only development escape hatch is an explicit `--allow-development`, which permits `provenanceMode="development"` for pre-commit structural inspection but changes no other check; ordinary `verify:artifact`, `release:prepare` and `verify:release` reject it. Capability defaults/integrity are runtime behaviors verified by prebuilt Playwright, not guessed from chunk text.

In the same slice, update the root `scripts/verify.mjs` artifact leaf to invoke `pnpm verify:artifact -- --allow-development`, and freeze that exact argv in `scripts/verify.test.mjs`. This is required before the task's dirty-tree full gate: it lets ordinary local verification inspect the development Artifact produced by `build:poc` without claiming release eligibility. Do not add the allowance to the public `verify:artifact` script itself, `release:prepare`, a direct artifact invocation, or the existing clean-only `verify:release` path; those remain bare/strict. Task 4 later reorganizes the full root order but must preserve this already-established leaf mapping.

`verify:bundle` inspects both `poc-web` and `e2e-web` graphs: each must bind only its own Story application root, both reject cross-Story imports and forbidden paths, and neither may contain source maps or unregistered remote assets. It does not require the E2E Artifact to carry PoC legal postprocessing.

Set final public behavior:

```json
{
  "artifact:manifest": "node --experimental-strip-types scripts/release/create-artifact-manifest.mts dist/poc",
  "verify:artifact": "node scripts/verify-artifact.mjs dist/poc",
  "release:prepare": "node --experimental-strip-types scripts/release/build-artifact.mts --story poc --host web --out-dir dist/poc --require-clean"
}
```

After Vite returns, the PoC branch of `build-artifact.mts` copies legal files, creates the manifest, and invokes `verifyPocArtifactV1`; a development build selects only its internal structural allowance, while `--require-clean` rejects dirty source before building. E2E remains local integration evidence and receives no release legal postprocessing. `verify:artifact` and `verify:bundle` inspect caller-built outputs and fail if missing; they never rebuild.

- [ ] **Step 4: Build once, inspect, and run current gates**

Run: `pnpm build:poc && pnpm verify:artifact -- --allow-development && pnpm verify:bundle && pnpm verify`

Expected: PASS; the development Artifact is structurally complete but explicitly non-release-eligible, tooling code is allowed, and downstream checks do not rebuild.

- [ ] **Step 5: Commit release inspection**

```bash
git add -- scripts/release/create-artifact-manifest.mts scripts/release/create-artifact-manifest.test.ts scripts/release/verify-poc-artifact.mts scripts/release/verify-poc-artifact.test.ts scripts/release/build-artifact.mts scripts/verify-artifact.mjs scripts/verify-artifact.test.mjs scripts/verify-bundle.mjs scripts/verify-bundle.test.mjs scripts/verify.mjs scripts/verify.test.mjs scripts/prepare-artifact.mjs package.json
git diff --cached --check
git commit -m "build: verify poc artifact contents"
```

- [ ] **Step 6: Generate formal evidence from the committed source**

Run: `pnpm release:prepare && pnpm verify:artifact && pnpm verify:bundle`

Expected: PASS with `provenanceMode="clean_commit"` and `sourceCommit` equal to the new HEAD.

### Task 3: Prove reproducibility, nested-base operation, and release capability semantics

**Files:**

- Create: `scripts/release/build-reproducibly.mts`
- Create: `scripts/release/build-reproducibly.test.ts`
- Modify: `scripts/release/build-artifact.mts`
- Modify: `scripts/release/build-artifact.test.ts`
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

Add archive-provenance tests proving the outer process rejects a dirty/detached/non-descendant source or stale materialization attestation, ordinary `buildArtifactV1` rejects caller-supplied source/provenance/materialization overrides, the archive contains neither `.git` nor `.project-tavern/goal-materialization.json`, and only the dedicated verified-archive path can make both outputs carry the same exact clean source commit/tree and validated materialization digest. The comparator must reject archive A↔B success when either one differs from the prepared handoff, when handoff provenance is development/stale, or when any detached manifest digest differs.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm exec vitest run scripts/release/build-reproducibly.test.ts scripts/release/build-artifact.test.ts scripts/release/smoke-poc.test.ts`

Expected: FAIL because reproducibility/smoke tooling is absent.

- [ ] **Step 3: Implement isolated PoC builds and prebuilt-only smoke**

The outer `build-reproducibly.mts` first runs read-only `pnpm verify:materialization`, requires a clean non-detached `HEAD`, freezes its 40-character lowercase commit and tree IDs, reads the already validated materialization digest/tool identities, and creates two tar archives. It proves each tar's embedded commit with `git get-tar-commit-id`, extracts it, checks the expected tree/file set, and asserts neither `.git` nor `.project-tavern/goal-materialization.json` exists. It resolves the already materialized host store once with structured `pnpm store path --silent` and runs exactly `pnpm install --offline --frozen-lockfile --store-dir <resolved-store>` in each archive.

For each extracted tree the outer process writes a closed temporary `VerifiedArchiveBuildInputV1` containing only schema revision, source commit, source tree, materialization digest, and exact tracked tool identities, then invokes a dedicated non-public `buildArtifactFromVerifiedArchiveV1` path. That path recomputes the tracked materialization contract/package closure inside the archive, requires equality with the explicit digest/tool identities, emits ordinary `provenanceMode="clean_commit"` plus the verified source tree, and never tries to read Git status or the ignored attestation. Ordinary `buildArtifactV1`, `build:poc`, and `release:prepare` reject this input and all ambient env/CLI provenance overrides; only `build-reproducibly.mts` owns the structured archive call. Tests reject a missing `--offline`, missing `--frozen-lockfile`, different store, shell command string, registry-facing environment override, altered archive/input/tree/contract, or direct provenance injection.

Before comparison, require an already prepared, strict-verified `dist/poc` whose clean source commit, source tree and materialization digest match the frozen outer inputs; missing/development/stale handoff bytes fail without rebuilding them. Build/prepare/verify PoC in each archive, then compare sorted path/size/digest tuples and detached manifest digests across archive A, archive B **and the actual `dist/poc` handoff**. All three must be byte-identical; never compare mtimes or temporary paths. This makes reproducibility evidence describe the delivered Artifact rather than a parallel internal build.

Serve existing `dist/poc` under `/nested/tavern/` on the already materialization-preflighted `127.0.0.1:41731` with strict port ownership and `reuseExistingServer:false`; Playwright config must not call Vite/build or choose another fixed port. Config tests freeze the host, port, nested prefix, prebuilt-only command and failure on occupation. Add:

```json
{
  "release:repro": "node --experimental-strip-types scripts/release/build-reproducibly.mts",
  "test:e2e:prebuilt": "playwright test --config apps/web/playwright.prebuilt.config.ts"
}
```

Prebuilt tests cover new game, initial VN, first action, Save/refresh/continue, default-off capabilities, semantic-only Automation, and successful Cheat integrity surviving Save/Load. They verify the served manifest digest is unchanged across capability URLs.

- [ ] **Step 4: Run development-safe nested-base acceptance**

Run: `pnpm exec vitest run scripts/release/build-reproducibly.test.ts scripts/release/build-artifact.test.ts scripts/release/smoke-poc.test.ts && pnpm build:poc && pnpm test:e2e:prebuilt -- --project=chromium && pnpm verify`

Expected: PASS; injected archive tests prove the closed reproducibility path without mislabeling the dirty task tree, while the current browser build is marked development and supplies normal/debug/automation behavior at the nested prefix. Bare `release:repro` is intentionally not run until the task implementation is committed and the outer clean-HEAD precondition can be true.

- [ ] **Step 5: Commit reproducibility and release smoke**

```bash
git add -- scripts/release/build-reproducibly.mts scripts/release/build-reproducibly.test.ts scripts/release/build-artifact.mts scripts/release/build-artifact.test.ts scripts/release/smoke-poc.mts scripts/release/smoke-poc.test.ts apps/web/playwright.prebuilt.config.ts apps/web/e2e/release-base-path.spec.ts apps/web/e2e/release-refresh.spec.ts apps/web/e2e/release-capabilities.spec.ts apps/web/e2e/release-integrity.spec.ts package.json
git diff --cached --check
git commit -m "test(release): prove reproducible poc artifact"
```

- [ ] **Step 6: Re-run clean reproducibility for the new task commit**

Run: `pnpm release:prepare && pnpm release:repro && pnpm test:e2e:prebuilt -- --project=chromium`

Expected: both isolated builds and the exact served `dist/poc` identify the new clean commit/tree/materialization digest and have identical detached manifest digests.

### Task 4: Freeze the nonpublishing verification orchestrator

**Files:**

- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify-release.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `scripts/run-script-tests.test.mjs`
- Create: `scripts/docs/check-links.mts`
- Create: `scripts/docs/check-links.test.ts`
- Delete: root `playwright.config.ts`
- Modify: root `package.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: all stable checks through Phase 5 plus Phase 6 Tasks 1–3.
- Produces: deterministic ordered `pnpm verify`, local `pnpm verify:release`, exact script-test ownership, and documented commands.

- [ ] **Step 1: Write failing exact-order, one-build, and immutability tests**

```ts
expect(verificationSteps.map((step) => step.id)).toEqual([
  "materialization",
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

Extend recursive discovery tests against the live repository and injected omission/duplication fixtures. Assert every inspect-only step fails on missing output rather than rebuilding. Freeze the final Playwright config inventory to exactly `apps/web/playwright.interaction.config.ts`, `apps/web/playwright.ui.config.ts`, and `apps/web/playwright.prebuilt.config.ts`; the obsolete root `playwright.config.ts` must be absent so plain `playwright test` cannot bypass explicit project/visual wrappers.

- [ ] **Step 2: Run orchestrator tests and confirm failure**

Run: `node --test scripts/run-script-tests.test.mjs scripts/verify.test.mjs && pnpm exec vitest run scripts/docs/check-links.test.ts`

Expected: FAIL because the final two-build order/link checker is absent.

- [ ] **Step 3: Implement fail-fast exact orchestration**

Use `spawnSync(command,args,{stdio:"inherit"})`, no shell command strings. Every ID above maps to one frozen leaf command; in particular `materialization → pnpm verify:materialization`, `runtime-fixtures → pnpm verify:runtime-fixtures`, `poc-commands → pnpm --filter @project-tavern/story-poc verify:commands`, and `semantic → pnpm verify:semantic`. Preserve Task 2's ordinary development leaf `artifact → pnpm verify:artifact -- --allow-development` and its exact-argv test while moving it into the final order. No entry invokes `verify`, `verify:phase*`, or another recursive aggregate. `test:scripts` runs once before builds. `build:poc` and `build:e2e` run once; `verify:semantic`, UI, bundle, semantic smoke, and artifact steps inspect them. Preserve the Phase 1 tracked-byte/status `finally` guard. The clean-only `verify:release` calls bare `pnpm verify:artifact` separately after `release:prepare`; the development allowance never establishes release eligibility.

`verify:release` starts with `pnpm verify`—whose first and only materialization leaf is `pnpm verify:materialization`—then runs clean-only `release:prepare`, bare artifact verification, prebuilt PoC smoke, and reproducibility. Accepted Phase 5C `pnpm verify` already runs the complete Chromium, touch, and WebKit UI matrix against the same two prebuilt roots, so the release wrapper must not run WebKit a second time. It performs no network operation and has no workflow/hosting child.

Final browser scripts:

```json
{
  "test:e2e:smoke": "playwright test --config apps/web/playwright.ui.config.ts --project=chromium --grep @smoke",
  "test:e2e:full": "playwright test --config apps/web/playwright.ui.config.ts --project=chromium --project=webkit --grep-invert @visual",
  "docs:links": "node --experimental-strip-types scripts/docs/check-links.mts"
}
```

Script tests freeze the `--grep-invert @visual` argument. Functional full-browser coverage never compares pixels directly; every visual verify/update must pass through `verify:ui-visual`/`update:ui-snapshots`, which enforces `LocalVisualEnvironmentV1` before launching Chromium.

Delete the Phase 2 root `playwright.config.ts` in the same slice. All public browser scripts name one of the three allowlisted configs explicitly; no default config or plain `playwright test` path remains.

- [ ] **Step 4: Run the complete pre-commit local gate twice**

Run: `pnpm test:scripts && pnpm verify && pnpm verify`

Expected: all commands exit 0; PoC/E2E each build once per ordinary verify; tracked/worktree state is unchanged.

- [ ] **Step 5: Commit the public verification contract**

```bash
git add -- scripts/verify.mjs scripts/verify-release.mjs scripts/verify.test.mjs scripts/run-script-tests.test.mjs scripts/docs playwright.config.ts package.json README.md CONTRIBUTING.md
git diff --cached --check
git commit -m "build: unify story host verification"
```

- [ ] **Step 6: Run the clean local release gate**

Run: `pnpm verify:release`

Expected: PASS from the exact new HEAD; both reproducibility archives and final Artifact use clean-commit provenance.

### Task 5: Write local release, capability, Automation, and privacy runbooks

**Files:**

- Create: `docs/runbooks/local-verification.md`
- Create: `docs/runbooks/runtime-capabilities.md`
- Create: `docs/runbooks/semantic-automation.md`
- Create: `docs/runbooks/story-hotfix-authoring.md`
- Create: `docs/runbooks/save-data-recovery.md`
- Create: `docs/runbooks/dependency-upgrades.md`
- Create: `docs/runbooks/debug-bundle-sharing.md`
- Create: `docs/checkpoints/release-evidence-template.md`
- Modify: `scripts/docs/check-links.mts`
- Modify: `scripts/docs/check-links.test.ts`
- Modify: `docs/README.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: exact local commands, Artifact identities and runtime contracts created through Phase 6.
- Produces: operator procedures for local readiness, materialization, runtime capabilities, semantic Automation, Save recovery, Hotfix authoring and privacy.

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

`local-verification.md` documents `prepare:goal` versus offline/read-only verification, exact Artifact handoff identity and the rule that no local command publishes. DebugBundle docs require privacy review/consent and explain capability/integrity fields. The runbook index links to the separate final-human-review and deferred-distribution scope documents without reproducing either procedure.

- [ ] **Step 4: Run docs and development-safe verification**

Run: `pnpm docs:links && pnpm verify && git diff --check && git status --short --branch`

Expected: PASS; only intended runbook/checkpoint/index files are staged before commit.

- [ ] **Step 5: Commit runbooks**

```bash
git add -- docs/runbooks docs/checkpoints/release-evidence-template.md docs/README.md README.md scripts/docs/check-links.mts scripts/docs/check-links.test.ts
git diff --cached --check
git commit -m "docs: add local artifact and automation runbooks"
```

- [ ] **Step 6: Run the final clean release gate**

Run: `pnpm verify:release && git diff --check && git status --short --branch`

Expected: PASS from the exact runbook commit with clean provenance, no tracked mutation, and no remote side effect.

## Phase 6 Acceptance

Run from the materialized checkout with a clean worktree and exact recorded toolchain:

```bash
pnpm verify:materialization
pnpm install --offline --frozen-lockfile
pnpm test:scripts
pnpm build:poc
pnpm build:e2e
pnpm verify
pnpm verify:release
pnpm release:repro
pnpm test:e2e:prebuilt -- --project=chromium
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
- Two fresh clean archive PoC builds and the exact handed-off `dist/poc` have identical path/size/digest tuples, detached manifest digest, source commit/tree/materialization digest, and Engine/Story/ResolvedGame/application identities.
- Prebuilt PoC works at a nested base path through new game, initial VN, first action, Save, refresh, continue, capability toggles, semantic Automation, and persistence of the `modified` integrity state across Save/refresh/continue.
- Runbooks document local Story/Host builds, materialization, capabilities, Semantic Automation, Save recovery, Hotfix authoring and privacy without implying remote authority.
- The repository contains no `.github/workflows/**`, Cloudflare configuration, remote publishing dependency, deployment script or remote-smoke command from this phase.
- Phase 6 ends with exact local `dist/poc`, source SHA, build-input, manifest digest and verification evidence for the separate final-human-review or deferred-distribution tracks.
