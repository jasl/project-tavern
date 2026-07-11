# Project Tavern AIGC Asset Archive Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the machine-audited Image Gen provenance system with a source-scoped, human-maintained AIGC archive while preserving runtime Asset Pack byte identity and all non-AIGC repository licensing boundaries.

**Architecture:** `art-source/aigc/<source>/**` is an archive-only authoring area whose structure below the source is deliberately free. Runtime art is promoted by copying it into `packages/assets/**` or a Story asset directory; only the promoted runtime manifest and bytes participate in the Asset Pack digest. The licensing verifier continues to enforce project license files, package scope metadata, notices, and the `references/` contamination boundary, but it never enumerates or interprets the AIGC archive or package-manager dependency licenses.

**Tech Stack:** Node.js 24.18.0, pnpm 11.11.0, Node test runner, ECMAScript modules, Git.

## Global Constraints

- Use `art-source/aigc/<source>/**`; only the first source directory is fixed and all deeper organization is human-owned.
- Store the current OpenAI concept illustrations flat under `art-source/aigc/openai/illustrations/`.
- Prefer `<purpose>[.<model>].png` and `<purpose>[.<model>].txt`; the model segment and prompt file are both optional, and `unknown-model` placeholders are forbidden.
- Do not retain or recreate provenance JSON, service-terms review JSON, generation timestamps, source digests, review statuses, rights attestations, or input-use graphs for AIGC archives.
- Do not scan `art-source/aigc/**` in tests, CI, builds, release checks, or licensing checks.
- Do not import or bundle `art-source/aigc/**` into Player or Pages artifacts.
- Promote selected images by copying them into `packages/assets/**` or `stories/<story>/assets/**`; runtime packages do not retain AIGC reverse provenance.
- Keep the Asset Pack digest as an automatic technical digest of the resolved runtime manifest and exact shipped bytes, never as a copyright or provenance record.
- Keep `references/` ignored, untracked, and excluded from production, test, generation, and release inputs.
- Do not add dependency license inventory, per-package notices, or license scanning for pnpm dependencies, GitHub Actions, Player, or Pages artifacts.
- Preserve all current Phase 1 Task 1 workspace scaffolding while making these policy changes; do not enter Phase 2.

---

### Task 1: Migrate the OpenAI illustration archive

**Files:**
- Modify: `docs/superpowers/specs/2026-07-12-aigc-asset-archive-design.md`
- Create: `art-source/aigc/openai/illustrations/heroine-neutral.png`
- Create: `art-source/aigc/openai/illustrations/heroine-neutral.txt`
- Create: `art-source/aigc/openai/illustrations/tavern-main-day.png`
- Create: `art-source/aigc/openai/illustrations/tavern-main-day.txt`
- Create: `art-source/aigc/openai/illustrations/tavern-sign-damaged.png`
- Create: `art-source/aigc/openai/illustrations/tavern-sign-damaged.txt`
- Create: `art-source/aigc/openai/illustrations/ui-player-stage-overlay.png`
- Create: `art-source/aigc/openai/illustrations/ui-player-stage-overlay.txt`
- Delete: `art-source/imagegen/first-web-pack/**`

**Interfaces:**
- Consumes: the four tracked source PNGs and prompts in `art-source/imagegen/first-web-pack/**`.
- Produces: a human-browsable archive with no machine-readable admission metadata and byte-identical PNGs.

- [ ] **Step 1: Record the source image digests before relocation**

Run:

```bash
shasum -a 256 art-source/imagegen/first-web-pack/*/source.png
```

Expected: four SHA-256 lines, one for each current source PNG; save the values in the command transcript for comparison only, not in the repository.

- [ ] **Step 2: Move images and prompts into the new flat archive**

Create `art-source/aigc/openai/illustrations/`, then move each `source.png` and `prompt.md` to the corresponding purpose-only `.png` and `.txt` path. Remove the old pack README, four `provenance.json` files, the service-terms review JSON, and the now-empty `art-source/imagegen/` tree.

- [ ] **Step 3: Verify relocation semantics**

Run:

```bash
find art-source/aigc/openai/illustrations -maxdepth 1 -type f -print | sort
find art-source -type f \( -name 'provenance.json' -o -name '*service-terms-review*.json' \) -print
shasum -a 256 art-source/aigc/openai/illustrations/*.png
```

Expected: exactly eight flat files; the metadata search prints nothing; the four post-move image digests match Step 1 by purpose.

- [ ] **Step 4: Commit the archive migration and approved naming refinement**

```bash
git add docs/superpowers/specs/2026-07-12-aigc-asset-archive-design.md art-source/aigc art-source/imagegen
git diff --cached --check
git diff --cached --stat
git commit -m "chore(art): simplify aigc source archive"
```

Expected: the staged diff contains only the AIGC design refinement and archive relocation; Git records PNG moves without byte changes where possible.

---

### Task 2: Remove AIGC and dependency-license auditing from the verifier

**Files:**
- Modify: `scripts/verify-licensing.test.mjs`
- Modify: `scripts/verify-licensing.mjs`

**Interfaces:**
- Consumes: `verifyLicensing(root: string, options?: { policy?: LicensingPolicy; trackedReferences?: string | string[] }): Promise<string[]>`.
- Produces: a verifier that enforces legal-file hashes, required notice text, package `license` metadata, `.gitignore`/tracked `references/`, and nothing about `art-source/aigc/**` or package-manager dependency licenses.

- [ ] **Step 1: Replace obsolete audit tests with the new archive-boundary test**

Delete the dependency-inventory fixtures/tests and every AI provenance/service-terms/input-graph fixture/test. Keep the general legal-file, notice, package-scope, reference-boundary, and active-Goal documentation tests. Add this focused behavior:

```js
test("keeps human-maintained AIGC archives outside licensing verification", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeValidPackageMetadata(root);
  const archive = join(root, "art-source", "aigc", "openai", "illustrations");
  await mkdir(archive, { recursive: true });
  await writeFile(join(archive, "heroine-neutral.png"), new Uint8Array());
  execFileSync("git", ["add", "--", "art-source/aigc/openai/illustrations/heroine-neutral.png"], { cwd: root });

  assert.deepEqual(
    await verifyLicensing(root, { policy, trackedReferences: "" }),
    [],
  );
});
```

- [ ] **Step 2: Run the focused test and observe the old scanner fail**

Run:

```bash
node --test --test-name-pattern='keeps human-maintained AIGC archives outside licensing verification' scripts/verify-licensing.test.mjs
```

Expected: FAIL because the current verifier reports the tracked archive image as an orphan or unknown `art-source` file.

- [ ] **Step 3: Delete obsolete implementation paths**

Remove `dependencyInventory`, `artSourceRootFiles`, all dependency inventory parsers/checks, all AI provenance/service-terms constants and validators, art-source Git discovery, path ownership, digest/review validation, and the `trackedProvenanceFiles`/`trackedArtSourceFiles` test seams. Retain only helpers reachable from project-license, package-metadata, notice, and reference verification. The function must no longer run a Git query containing `art-source`.

- [ ] **Step 4: Run focused and complete verifier tests**

Run:

```bash
node --test --test-name-pattern='keeps human-maintained AIGC archives outside licensing verification' scripts/verify-licensing.test.mjs
node --test scripts/verify-licensing.test.mjs
```

Expected: both commands PASS; the complete suite has no test name containing `provenance`, `service-terms`, `AIGC input`, or `dependency notice inventory`.

- [ ] **Step 5: Prove the verifier no longer scans either excluded domain**

Run:

```bash
rg -n 'art-source|imagegen|provenance|service.?terms|dependencyInventory|lockfile inventory|direct dependency notice' scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
```

Expected: the only match is the new test's human-maintained archive path/name; there are no matches in `scripts/verify-licensing.mjs`.

- [ ] **Step 6: Commit the verifier simplification**

```bash
git add scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "fix: narrow repository licensing verification"
```

Expected: only verifier code/tests are staged; the retained tests prove project-owned licensing and `references/` controls.

---

### Task 3: Synchronize every authoritative asset and release contract

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `LICENSE.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `docs/README.md`
- Modify: `docs/art/first-web-visual-pack.md`
- Modify: `docs/superpowers/specs/2026-07-10-react-game-harness-design.md`
- Modify: `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md`
- Modify: `docs/superpowers/specs/2026-07-11-repository-licensing-design.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-poc-roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-05-ui-assets-accessibility.md`
- Modify: `docs/superpowers/plans/2026-07-11-project-tavern-06-release-pages.md`
- Modify: `docs/superpowers/plans/2026-07-11-repository-licensing-implementation.md`

**Interfaces:**
- Consumes: the approved AIGC archive design and the dependency/vendor boundary committed before this plan.
- Produces: one consistent contract: archive metadata is human-maintained and unscanned; promoted runtime assets have only technical manifest/byte validation; Asset Pack identity remains deterministic; `vendor/**` and package-manager dependencies stay outside automated legal adjudication.

- [ ] **Step 1: Update repository-level authority and status text**

Add the AIGC archive design to `AGENTS.md` sources of truth. Replace strict AIGC provenance/admission language in `AGENTS.md`, `README.md`, `LICENSE.md`, `THIRD_PARTY_NOTICES.md`, and `docs/README.md` with the source-directory, optional prompt/model, manual promotion, no-scan, and runtime-digest boundaries. Preserve copyright scope, trademark, contribution, `vendor/**`, and `references/` rules.

- [ ] **Step 2: Separate authoring archive from runtime asset identity in technical specs**

In the Harness design and Contract Catalog, delete copyright/service/model/prompt/review/input-chain fields from runtime asset contracts. Keep stable Asset IDs, runtime paths, media metadata, exact file-byte hashes, code fallbacks, resolved provider identity, and the Asset Pack digest. State explicitly that these are technical determinism/cache/save inputs and do not reverse-map to AIGC archives.

- [ ] **Step 3: Rewrite visual and licensing authority documents**

Point the visual pack at `art-source/aigc/openai/illustrations/` and retain visual intent, safe zones, and current purpose names without candidate admission statuses. Replace the licensing design's AI audit Schema with a short archive-boundary section referencing the AIGC design. Mark the historical licensing implementation plan's strict AIGC audit as superseded.

- [ ] **Step 4: Align roadmap and Phase plans**

Remove service-terms/provenance/user-selection gates and AIGC scanners from the roadmap and Phase 1/5/6 plans. Phase 1 must still build deterministic technical Asset Pack identity with fallback-only current providers. Phase 5 must validate promoted runtime paths, image dimensions/hashes, slot registration, and artifact exclusion without scanning `art-source/aigc/**`. Phase 6 must exclude `art-source/aigc/**`, `references/**`, and development-only files from Player/Pages artifacts without generating dependency-license inventories.

- [ ] **Step 5: Scan for stale normative rules**

Run:

```bash
rg -n 'openai-service-terms-review|provenance\.json|inputUseReview|contentAdmissionReview|rightsHolderAttestation|unknown-model|art-source/imagegen|terms-pending|not_selected|build\.license|Vite license' AGENTS.md README.md LICENSE.md THIRD_PARTY_NOTICES.md docs
```

Expected: no active normative rule requires removed AIGC audit files, `unknown-model`, dependency license output, or the old archive path. Historical text may mention the former mechanism only to mark it superseded.

- [ ] **Step 6: Verify cross-document invariants**

Run:

```bash
rg -n 'art-source/aigc/<source>|art-source/aigc/openai/illustrations|Asset Pack digest|references/' AGENTS.md README.md THIRD_PARTY_NOTICES.md docs/superpowers/specs docs/superpowers/plans docs/art
```

Expected: all authority layers describe the same archive, promotion, technical digest, and exclusion boundaries.

- [ ] **Step 7: Commit authority synchronization**

```bash
git add AGENTS.md README.md LICENSE.md THIRD_PARTY_NOTICES.md docs
git diff --cached --check
git diff --cached --stat
git commit -m "docs: align aigc archive and asset contracts"
```

Expected: the staged diff contains only authority/status/plan text and this implementation plan; no source code, workspace manifests, or generated files are included.

---

### Task 4: Close the policy migration and resume Phase 1 Task 1

**Files:**
- Verify: all files changed by Tasks 1-3
- Preserve uncommitted: `.node-version`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/**/package.json`, `packages/**/package.json`, `stories/**/package.json`

**Interfaces:**
- Consumes: the migrated archive, simplified verifier, synchronized authority documents, and the existing Phase 1 Task 1 scaffold.
- Produces: a clean policy baseline on top of which Phase 1 Task 1 can continue without reintroducing obsolete legal machinery.

- [ ] **Step 1: Run licensing and archive-focused validation**

Run:

```bash
node --test scripts/verify-licensing.test.mjs
node scripts/verify-licensing.mjs
pnpm verify:licensing
```

Expected: all three commands PASS and print no AIGC or dependency-inventory warning.

- [ ] **Step 2: Verify Git and artifact boundaries**

Run:

```bash
git ls-files -z -- references | wc -c
git ls-files 'art-source/aigc/**' | sort
git ls-files 'art-source/**/provenance.json' '*service-terms-review*.json'
git status --short --branch
```

Expected: tracked `references` byte count is `0`; exactly eight AIGC archive files are tracked; no provenance/service-review JSON is tracked; only the pre-existing Phase 1 Task 1 scaffold remains uncommitted.

- [ ] **Step 3: Resume Phase 1 Task 1 at its existing TDD boundary**

Run the Task 1 focused test first, confirm the current expected failure if the manifest set is incomplete, then finish only the files and commands specified by `docs/superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md` Task 1. Do not broaden the licensing verifier or regenerate `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Continue Phase 1 in mandatory task order**

Execute Phase 1 Tasks 2-13 with their exact Files, Interfaces, Steps, Run, Expected, staging, and commit boundaries. At the end, run the Phase 1 acceptance bundle, report commit hashes and risks, and pause before Phase 2 as requested.
