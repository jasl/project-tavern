# Project Tavern Phase 6 Reproducible Local Artifact Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Close the deferred release balance and its provisional technical baselines, then produce reproducible local `poc × web` and `e2e × web` Artifacts, fully verify the exact PoC bytes—including default-off runtime capabilities and persistent Cheat integrity—and hand one platform-neutral manifest-bound Artifact to the separate final-human-review or future remote-distribution tracks.

**Architecture:** The production builder accepts only `(story, host)` from the closed set `{ poc × web, e2e × web }`; there is no Player, Developer or Headless flavor. `pnpm verify` builds each Story/Host once for all inspect-only browser/bundle/artifact gates, while local release reproducibility performs two isolated PoC builds. Phase 6 performs no CI, upload, hosting, workflow or remote smoke work; future distribution consumes these exact bytes without rebuilding.

**Tech Stack:** Existing Project Tavern workspace and materialization checkpoint, Vite 8.1.4 production build, TypeScript 7.0.2, Playwright 1.61.1, exact local Node/pnpm inputs, HashRouter, relative assets and local filesystem Artifacts.

## Global Constraints

- Phase 5 Acceptance and `pnpm verify:materialization` must pass twice and the working tree must be clean before this phase starts.
- [`2026-07-15-deterministic-balance-lab-design.md`](../specs/2026-07-15-deterministic-balance-lab-design.md) governs the Story-local balance runner, the engine-neutral future extraction boundary, and the mandatory deferred closeout before any Artifact build.
- Phase 4B/5 consume provisional but read-only golden and Save baselines. Phase 5 development builds remain valid UI/interaction evidence but never release evidence. Phase 6 must finish the frozen 1–1000 thresholds and replace every affected provisional byte before any Phase 6 Task 1+ Artifact implementation/build, `release:prepare`, `verify:release`, or reproducibility may run.
- `docs/engineering/specs/2026-07-12-game-runtime-design.md` defines the only current Artifact model: one Artifact per Story/Host, one application root, runtime-gated capabilities and no Headless build flavor.
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

## Phase 6 Entry: Finalize Deferred Balance and Technical Baselines

This is the first mandatory Phase 6 operation. It produces zero to twelve independent calibration-step commits and exactly
one final balance-freeze commit before Task 1; it does not add a phase or weaken Phase 4B order. Until the final commit and
its clean verification pass, every Artifact/release command in this plan is forbidden.

**Calibration-step Files:**

- Modify: `docs/poc/balance-v0.md`
- Modify: `game/stories/poc/src/content/balance.ts`
- Modify only when the selected field changes its direct literal expectations: `game/stories/poc/src/test/daily-gates.test.ts`
- Modify only when the selected field is `levy`: `game/stories/poc/src/test/ending-forecast.test.ts`

**Final balance-freeze Files:**

- Modify: `docs/poc/balance-v0.md` only to transition the provisional report/status to the final accepted state
- Modify: `scripts/verify-poc-balance.mjs` and `scripts/verify-poc-balance.test.mjs` only to remove the Task 10 provisional qualifier/report
- Modify: `game/stories/poc/src/test/fixtures/golden/**`
- Modify: `game/stories/poc/src/test/fixtures/saves/**`
- Preserve byte-for-byte: `game/stories/poc/src/content/balance.ts`, both direct-expectation tests,
  `game/stories/poc/src/test/fixtures/commands/**`, `game/stories/poc/src/tooling-fixtures.ts` and `pnpm-lock.yaml`

If live calibration exposes an evaluator, runner, counterfactual or selector defect, stop this entry and repair the Task 10
owner in its own focused commit and gates before restarting from a clean checkpoint. Such a repair never shares a calibration
step or final freeze commit, never changes thresholds or strategies, and is committed with
`--trailer "Balance-Calibration-Repair: true"`. When `N > 0`, it is accepted only after the repaired evaluator replays the
entire historical step chain byte-for-byte.

### Clean sandbox, entry discovery and recovery

Every historical audit and dirty recovery evaluates committed bytes in this exact detached sandbox. `target_commit` is
`HEAD`, a step parent, the final parent or final itself according to the replay; never use the dirty root as committed-HEAD
evidence:

```bash
test "$(node --version)" = "v26.5.0"
test "$(pnpm --version)" = "11.11.0"
target_commit="<clean-commit-sha>"
(
  set -eu
  test "$(node --version)" = "v26.5.0"
  test "$(pnpm --version)" = "11.11.0"
  repo="$(git rev-parse --show-toplevel)"
  store="$(pnpm store path --silent)"
  sandbox="$(mktemp -d "${TMPDIR:-/tmp}/project-tavern-balance.XXXXXX")"
  rmdir "$sandbox"
  trap 'git -C "$repo" worktree remove --force "$sandbox" >/dev/null 2>&1 || true' EXIT HUP INT TERM
  git -C "$repo" worktree add --detach "$sandbox" "$target_commit"
  cd "$sandbox"
  pnpm install --offline --frozen-lockfile --store-dir "$store"
  # Run the required strict gate, selector, writer, or patch replay here.
)
```

The executing shell first selects the Phase 0 materialized PATH (the current checkpoint uses `/opt/homebrew/bin`). Both
live/subshell version assertions must match accepted materialization identity before the store path comes from the live
repository. The sandbox install is recovery-only, offline, frozen-lockfile and temporary; it cannot access the registry or
change live tracked bytes.

Resolve the accepted Phase 5C checkpoint by `GOAL.md`. Because Phase 6 entry immediately follows it, inspect and classify
every first-parent commit through final—or through `HEAD` when final is absent—regardless of path:

```bash
phase5c_checkpoint="<accepted-phase5c-commit-sha>"
audit_tip="<final-commit-if-present-otherwise-HEAD>"
git rev-list --first-parent --reverse "${phase5c_checkpoint}..${audit_tip}"
git log --first-parent --reverse --format='%H%x09%(trailers:key=Balance-Calibration-Index,valueonly)%x09%(trailers:key=Balance-Calibration-Repair,valueonly)%x09%(trailers:key=Balance-Calibration-Final,valueonly)%x09%(trailers:key=Balance-Calibration-Steps,valueonly)' "${phase5c_checkpoint}..${audit_tip}"
git diff --name-only "<commit>^1" "<commit>" -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
```

Every commit through `${audit_tip}` must be exactly one continuous-index step, one explicit Task 10 owner repair carrying
`Balance-Calibration-Repair: true`, or the unique final. A repair has no step/final trailer, follows Task 10 Files/staging/gates,
does not alter threshold/strategy/accepted balance/direct expectations/golden/Save, and retains the provisional
report/assertion/CLI branch/tests. Final is the last classified commit after the last step/repair and has `Steps = N`. Any
unclassified or multiply classified pre-final commit invalidates recovery. For every later Phase 6 task commit from final to
`HEAD`, use the explicit first-parent diff `git diff "<commit>^1" "<commit>" -- <protected paths>` and require no protected
change; this keeps final the last protected-path-touching commit without misclassifying ordinary Artifact commits.

For each historical step `K`, let `N = K - 1`, create its parent sandbox, run
`pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N`, and require canonical stdout SHA-256 and all
decoded selection values to equal its seven trailers. Apply the candidate afresh to code, document and direct literals, then
require its entire binary patch to equal the historical commit:

```bash
pnpm --silent --filter @project-tavern/story-poc calibrate:balance --iteration=N > /tmp/project-tavern-step.replayed.json
test "sha256:$(shasum -a 256 /tmp/project-tavern-step.replayed.json | awk '{print $1}')" = "$(git -C "$repo" show -s --format='%(trailers:key=Balance-Calibration-Evidence-SHA256,valueonly)' "$step_commit")"
git -C "$repo" diff --binary "${step_commit}^1" "$step_commit" -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.expected.patch
git diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.replayed.patch
cmp /tmp/project-tavern-step.expected.patch /tmp/project-tavern-step.replayed.patch
```

If a repair occurs with `N > 0`, create a Phase 5C sandbox, overlay all accepted repair patches through that repair, and use
the repaired evaluator to replay every old step sequentially from `--iteration=0`; every evidence digest/trailer and rebuilt
full binary patch must remain identical before continuing. `N = 0` may continue after owner gates. Any mismatch at `N > 0`
is `balance_calibration_history_invalidated`, an authoritative-design stop: do not auto-rewrite, rollback or select a new
history.

After all audits pass, classify the live tree only from clean-`HEAD` sandbox evidence:

- clean without final and sandbox strict pass: enter the live-candidate plus final-parent replay procedure below;
- clean without final, sandbox threshold-only red and `N < 12`: run
  `pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N` for step `N+1`;
- `N = 12` still red or selector returns `balance_contract_unsatisfied`: stop before Artifact work;
- dirty only inside step allowlist and sandbox strict is threshold-only red: rebuild the candidate in the sandbox and require
  complete `git diff --binary` equality with the live patch before committing;
- dirty only inside final allowlist and sandbox strict passes: rerun final writers/removals in the sandbox and require complete
  binary-patch equality with the live patch before committing;
- mixed/out-of-range paths, invalid history or unexplained bytes: stop as unknown dirty state.

The pending-step comparison is literal and includes every optional direct-expectation byte:

```bash
git -C "$repo" diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.live.patch
git diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.replayed.patch
cmp /tmp/project-tavern-step.live.patch /tmp/project-tavern-step.replayed.patch
```

### Produce one calibration-step commit

The Story-local selector is read-only. With `N` accepted step commits and `K = N + 1`, capture the canonical evidence:

```bash
pnpm --silent --filter @project-tavern/story-poc calibrate:balance --iteration=N > /tmp/project-tavern-balance-step-K.txt
shasum -a 256 /tmp/project-tavern-balance-step-K.txt
```

Apply exactly the returned field to `balance.ts`, the authoritative document and any directly affected literal expectation.
Never lower a threshold, change the six strategies/seed set, accept a partial candidate set, tune from golden output or apply
more than one candidate. Golden, Save and qualifier bytes intentionally stay stale/provisional between step commits, so only
run the step-safe gates:

```bash
pnpm --filter @project-tavern/story-poc verify:balance:smoke
pnpm --filter @project-tavern/story-poc verify:commands
pnpm exec vitest run game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts
pnpm typecheck
git diff --check
git diff --exit-code -- pnpm-lock.yaml
```

Stage the exact step allowlist and create one commit with evidence-derived trailers:

```bash
git add -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts
git diff --cached --name-status
git diff --cached --check
test -z "$(git diff --cached --name-only | rg -v '^(docs/poc/balance-v0\.md|game/stories/poc/src/content/balance\.ts|game/stories/poc/src/test/(daily-gates|ending-forecast)\.test\.ts)$')"
test -z "$(git diff --cached --name-only -- scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves game/stories/poc/src/test/fixtures/commands game/stories/poc/src/tooling-fixtures.ts pnpm-lock.yaml)"
git commit -m "balance(story-poc): apply calibration step <K>" \
  --trailer "Balance-Calibration-Index: <K>" \
  --trailer "Balance-Calibration-Field: <field>" \
  --trailer "Balance-Calibration-Before: <before>" \
  --trailer "Balance-Calibration-After: <after>" \
  --trailer "Balance-Calibration-Before-Deficit: <beforeDeficit>" \
  --trailer "Balance-Calibration-After-Deficit: <afterDeficit>" \
  --trailer "Balance-Calibration-Evidence-SHA256: sha256:<digest>"
test -z "$(git status --porcelain=v1)"
pnpm verify:materialization
```

Replace every placeholder with the canonical evidence value. A step commit is a resumable calibration point, not a final
balance checkpoint; expected stale golden/Save/root gates are repaired only by the final commit.

### Produce the final balance-freeze commit

First prove the committed final parent passes all frozen thresholds in its clean sandbox. If no final exists and the live
root is clean, non-detached `main` at that parent, exit the sandbox and run the sequence below in the live root to materialize
the candidate bytes that will actually be staged. A classified pending dirty final already provides those live bytes; an
existing historical final does not rewrite them. Independently create a second final-parent sandbox, run the same sequence,
and require full-patch equality.

The sequence proves command bytes unchanged, regenerates the provisional baselines and repeats the complete Phase 4B Task
11/12 review—including exactly six golden files, eight Save files, full diff/provenance review, sorted SHA-256 lists and two
read-only verifier runs. Then remove exactly the provisional report data, its assertion, the `--qualify-provisional` CLI
branch, tests dedicated to that branch/report, and the provisional-to-final wording in `balance-v0.md`; no adjacent refactor,
balance number or direct expectation is admitted.

For the clean/no-final branch, establish the live candidate location before its first writer run:

```bash
test "$(git symbolic-ref --quiet --short HEAD)" = "main"
test "$(git rev-parse HEAD)" = "$final_parent"
test -z "$(git status --porcelain=v1)"
```

```bash
pnpm --filter @project-tavern/story-poc verify:commands
pnpm --filter @project-tavern/story-poc update:golden
pnpm --filter @project-tavern/story-poc update:fixtures
git add -N -- game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
pnpm verify:golden
pnpm verify:golden
pnpm verify:fixtures
pnpm verify:fixtures
git diff --check
git diff --exit-code -- pnpm-lock.yaml
```

Rebuild the whole final patch in the final-parent sandbox. For historical final audit compare it with the commit patch; for
pending dirty final compare it with the live root patch. Only exact `git diff --binary` equality is acceptable:

```bash
git diff --binary -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.replayed.patch
if test -n "${final_commit:-}"; then
  git -C "$repo" diff --binary "${final_commit}^1" "$final_commit" -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.expected.patch
  cmp /tmp/project-tavern-final.expected.patch /tmp/project-tavern-final.replayed.patch
else
  git -C "$repo" diff --binary -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.live.patch
  cmp /tmp/project-tavern-final.live.patch /tmp/project-tavern-final.replayed.patch
fi
```

If final already exists, skip creation after exact replay audit. Otherwise exit the sandbox, return to the still-dirty live
`main` candidate with `HEAD = final_parent`, run strict twice on those exact live bytes and use that hash for the trailer.
Then stage its closed allowlist and prove every exclusion:

```bash
test "$(git symbolic-ref --quiet --short HEAD)" = "main"
test "$(git rev-parse HEAD)" = "$final_parent"
pnpm --silent verify:balance > /tmp/project-tavern-balance.candidate-a.txt
pnpm --silent verify:balance > /tmp/project-tavern-balance.candidate-b.txt
cmp /tmp/project-tavern-balance.candidate-a.txt /tmp/project-tavern-balance.candidate-b.txt
shasum -a 256 /tmp/project-tavern-balance.candidate-a.txt
git add -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
git diff --cached --name-status
git diff --cached --check
test -z "$(git diff --cached --name-only | rg -v '^(docs/poc/balance-v0\.md|scripts/verify-poc-balance\.(mjs|test\.mjs)|game/stories/poc/src/test/fixtures/(golden|saves)/)')"
test -z "$(git diff --cached --name-only -- game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts game/stories/poc/src/test/fixtures/commands game/stories/poc/src/tooling-fixtures.ts pnpm-lock.yaml)"
git commit -m "balance(story-poc): finalize release calibration" \
  --trailer "Balance-Calibration-Final: true" \
  --trailer "Balance-Calibration-Steps: <N>" \
  --trailer "Balance-Calibration-Report-SHA256: sha256:<digest>"
final_commit="$(git rev-parse HEAD)"
final_parent="$(git rev-parse HEAD^1)"
```

After final is committed, create another clean sandbox at that final commit. Strict balance must run twice after the commit,
produce byte-identical stdout and exactly match its trailer digest; then run the remaining full gates:

```bash
pnpm --silent verify:balance > /tmp/project-tavern-balance.final-a.txt
pnpm --silent verify:balance > /tmp/project-tavern-balance.final-b.txt
cmp /tmp/project-tavern-balance.final-a.txt /tmp/project-tavern-balance.final-b.txt
test "sha256:$(shasum -a 256 /tmp/project-tavern-balance.final-a.txt | awk '{print $1}')" = "$(git show -s --format='%(trailers:key=Balance-Calibration-Report-SHA256,valueonly)' "$final_commit")"
```

Exit the sandbox and return to clean non-detached live `main` with `HEAD = final_commit` for ignored-attestation and
cumulative gates; the sandbox does not synthesize or copy `.project-tavern/goal-materialization.json`:

```bash
test "$(git symbolic-ref --quiet --short HEAD)" = "main"
test "$(git rev-parse HEAD)" = "$final_commit"
test -z "$(git status --porcelain=v1)"
pnpm verify:materialization
pnpm verify:golden
pnpm verify:fixtures
pnpm verify:phase4
pnpm verify:phase5c
pnpm verify
test -z "$(git status --porcelain=v1)"
```

Task 1 may start only from that replayed clean final commit. It must remain the last protected-path-touching commit, and its
accepted bytes/report digest remain inputs to `pnpm verify:release`, reproducibility and the Roadmap Definition of Done.

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
engine/packages/web/playwright.prebuilt.config.ts           # serves existing dist/poc only
engine/packages/web/e2e/release-*.spec.ts                   # PoC base/capability/integrity smoke
docs/runbooks/                                   # local verification/capability/automation/privacy
docs/engineering/checkpoints/                    # phase and final evidence templates
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

- Consumes: the single application roots `game/stories/poc/index.html` and `game/stories/e2e/index.html`, plus the source-graph evidence plugin. E2E root/build already exists from Phase 2; Phase 5 adds PoC without creating a second E2E root.
- Produces: `buildArtifactV1(request: ArtifactBuildRequestV1)`, `build:poc`, and `build:e2e` as the only production build commands.

- [ ] **Step 1: Write failing closed-matrix and path-validation tests**

```ts
it("maps poc × web to the one PoC application root", () => {
  expect(
    resolveArtifactBuildConfigV1({ story: "poc", host: "web", outDir: "dist/poc" }),
  ).toMatchObject({
    applicationId: "poc-web",
    applicationHtml: "game/stories/poc/index.html",
    base: "./",
    sourcemap: false,
  });
});

it("maps e2e × web to the one E2E application root", () => {
  expect(
    resolveArtifactBuildConfigV1({ story: "e2e", host: "web", outDir: "dist/e2e" }),
  ).toMatchObject({
    applicationId: "e2e-web",
    applicationHtml: "game/stories/e2e/index.html",
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
- Create: `engine/packages/web/playwright.prebuilt.config.ts`
- Create: `engine/packages/web/e2e/release-base-path.spec.ts`
- Create: `engine/packages/web/e2e/release-refresh.spec.ts`
- Create: `engine/packages/web/e2e/release-capabilities.spec.ts`
- Create: `engine/packages/web/e2e/release-integrity.spec.ts`
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
  "test:e2e:prebuilt": "playwright test --config engine/packages/web/playwright.prebuilt.config.ts"
}
```

Prebuilt tests cover new game, initial VN, first action, Save/refresh/continue, default-off capabilities, semantic-only Automation, and successful Cheat integrity surviving Save/Load. They verify the served manifest digest is unchanged across capability URLs.

- [ ] **Step 4: Run development-safe nested-base acceptance**

Run: `pnpm exec vitest run scripts/release/build-reproducibly.test.ts scripts/release/build-artifact.test.ts scripts/release/smoke-poc.test.ts && pnpm build:poc && pnpm test:e2e:prebuilt -- --project=chromium && pnpm verify`

Expected: PASS; injected archive tests prove the closed reproducibility path without mislabeling the dirty task tree, while the current browser build is marked development and supplies normal/debug/automation behavior at the nested prefix. Bare `release:repro` is intentionally not run until the task implementation is committed and the outer clean-HEAD precondition can be true.

- [ ] **Step 5: Commit reproducibility and release smoke**

```bash
git add -- scripts/release/build-reproducibly.mts scripts/release/build-reproducibly.test.ts scripts/release/build-artifact.mts scripts/release/build-artifact.test.ts scripts/release/smoke-poc.mts scripts/release/smoke-poc.test.ts engine/packages/web/playwright.prebuilt.config.ts engine/packages/web/e2e/release-base-path.spec.ts engine/packages/web/e2e/release-refresh.spec.ts engine/packages/web/e2e/release-capabilities.spec.ts engine/packages/web/e2e/release-integrity.spec.ts package.json
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
- Modify: `scripts/docs/verify-docs.mjs`
- Modify: `scripts/docs/verify-docs.test.mjs`
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
  "docs",
]);
expect(verificationSteps.filter((step) => step.id === "build-poc")).toHaveLength(1);
expect(verificationSteps.filter((step) => step.id === "build-e2e")).toHaveLength(1);
expect(verificationSteps.filter((step) => step.id === "semantic")).toHaveLength(1);
expect(verificationSteps.findIndex((step) => step.id === "semantic")).toBeGreaterThan(
  verificationSteps.findIndex((step) => step.id === "build-e2e"),
);
expect(verificationSteps.some((step) => step.id.includes("developer"))).toBe(false);
```

Extend recursive discovery tests against the live repository and injected omission/duplication fixtures. Assert every inspect-only step fails on missing output rather than rebuilding. Freeze the final Playwright config inventory to exactly `engine/packages/web/playwright.interaction.config.ts`, `engine/packages/web/playwright.ui.config.ts`, and `engine/packages/web/playwright.prebuilt.config.ts`; the obsolete root `playwright.config.ts` must be absent so plain `playwright test` cannot bypass explicit project/visual wrappers.

- [ ] **Step 2: Run orchestrator tests and confirm failure**

Run: `node --test scripts/run-script-tests.test.mjs scripts/verify.test.mjs scripts/docs/verify-docs.test.mjs`

Expected: FAIL because the final two-build order and Phase 6 runbook inventory extensions are absent; the existing Goal/plan/link contract remains green before those new assertions.

- [ ] **Step 3: Implement fail-fast exact orchestration**

Use `spawnSync(command,args,{stdio:"inherit"})`, no shell command strings. Every ID above maps to one frozen leaf command; in particular `materialization → pnpm verify:materialization`, `runtime-fixtures → pnpm verify:runtime-fixtures`, `poc-commands → pnpm --filter @project-tavern/story-poc verify:commands`, and `semantic → pnpm verify:semantic`. Preserve Task 2's ordinary development leaf `artifact → pnpm verify:artifact -- --allow-development` and its exact-argv test while moving it into the final order. No entry invokes `verify`, `verify:phase*`, or another recursive aggregate. `test:scripts` runs once before builds. `build:poc` and `build:e2e` run once; `verify:semantic`, UI, bundle, semantic smoke, and artifact steps inspect them. Preserve the Phase 1 tracked-byte/status `finally` guard. The clean-only `verify:release` calls bare `pnpm verify:artifact` separately after `release:prepare`; the development allowance never establishes release eligibility.

`verify:release` starts with `pnpm verify`—whose first and only materialization leaf is `pnpm verify:materialization`—then runs clean-only `release:prepare`, bare artifact verification, prebuilt PoC smoke, and reproducibility. Accepted Phase 5C `pnpm verify` already runs the complete Chromium, touch, and WebKit UI matrix against the same two prebuilt roots, so the release wrapper must not run WebKit a second time. It performs no network operation and has no workflow/hosting child.

Final browser scripts:

```json
{
  "test:e2e:smoke": "playwright test --config engine/packages/web/playwright.ui.config.ts --project=chromium --grep @smoke",
  "test:e2e:full": "playwright test --config engine/packages/web/playwright.ui.config.ts --project=chromium --project=webkit --grep-invert @visual",
  "verify:docs": "node scripts/docs/verify-docs.mjs"
}
```

Preserve and extend the existing `verify:docs` implementation rather than creating a second link checker: it continues to validate the Goal manifest, phase order, removed-workflow references, local links and execution entrypoint, then adds the Phase 6 runbook inventory/command rules. Script tests freeze the `--grep-invert @visual` argument. Functional full-browser coverage never compares pixels directly; every visual verify/update must pass through `verify:ui-visual`/`update:ui-snapshots`, which enforces `LocalVisualEnvironmentV1` before launching Chromium.

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
- Create: `docs/engineering/checkpoints/release-evidence-template.md`
- Modify: `scripts/docs/verify-docs.mjs`
- Modify: `scripts/docs/verify-docs.test.mjs`
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

Run: `pnpm verify:docs && node --test scripts/docs/verify-docs.test.mjs`

Expected: FAIL because the complete runbook set is absent.

- [ ] **Step 3: Write exact operational procedures**

Every runbook contains prerequisites, exact commands, expected output, failure evidence, stop condition, and authority boundary. `runtime-capabilities.md` documents fresh-store defaults, persisted Host preferences, nonpersistent URL session overrides, the same-Artifact guarantee, read-only Debug versus Cheat, integrity persistence, and how to return to normal capability state. `semantic-automation.md` documents bridge revision/discovery, operation-result unwrapping, `observe/availableActions/preview/dispatch/waitForIdle`, per-call capability recheck and `capability_disabled`, no sleeps, no coordinates, player-visible-only data, and no DebugTools.

`local-verification.md` documents `prepare:goal` versus offline/read-only verification, exact Artifact handoff identity and the rule that no local command publishes. DebugBundle docs require privacy review/consent and explain capability/integrity fields. The runbook index links to the separate final-human-review and deferred-distribution scope documents without reproducing either procedure.

- [ ] **Step 4: Run docs and development-safe verification**

Run: `pnpm verify:docs && pnpm verify && git diff --check && git status --short --branch`

Expected: PASS; only intended runbook/checkpoint/index files are staged before commit.

- [ ] **Step 5: Commit runbooks**

```bash
git add -- docs/runbooks docs/engineering/checkpoints/release-evidence-template.md docs/README.md README.md scripts/docs/verify-docs.mjs scripts/docs/verify-docs.test.mjs
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
pnpm verify:docs
git diff --check
git status --short --branch
```

Acceptance criteria:

- All commands exit 0 with no unexplained skip/quarantine and no tracked/worktree mutation.
- The deferred calibration reaches every unchanged 1–1000 threshold; two canonical full reports are byte-identical, candidate-based counterfactuals pass, provisional golden/Save bytes were regenerated and reviewed, and command fixture/tooling invocation bytes remained unchanged before the first Artifact build.
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
