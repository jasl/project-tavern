# Project Tavern Foundation Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the pinned multi-license workspace, neutral deterministic Base kernel, synthetic Sandbox GamePackage, minimal generic React/Web host, and browser walking skeleton that prove one typed command can cross every durable boundary without introducing tavern-specific state into Base.

**Architecture:** `@project-tavern/base` owns only generic values, strict serialization, deterministic RNG/attempts, static Module/Profile/GamePackage authoring, resolvers, Session mechanics, and narrow application/Host/presentation contracts. A PolyForm Sandbox Story supplies the only concrete Phase 1 state and command; generic MIT UI/Web code receives its immutable projection and resolved presentation through public ports. The root command surface is complete in this phase, but each command checks the smallest real Sandbox/Base/UI/Web artifact that exists now and is extended by later phases.

**Tech Stack:** Node.js 24.18.0, pnpm 11.11.0, TypeScript 7.0.2, React 19.2.7, React Router 7.18.1, Vite 8.1.4, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, Playwright 1.61.1, React Testing Library 16.3.2, Oxlint 1.73.0 with oxlint-tsgolint 0.24.0, Prettier 3.9.5, SHA-256, ESM.

## Global Constraints

- The Harness design and Contract Catalog are frozen as the first engineering Goal baseline. If implementation reveals a material contradiction or missing ABI, stop and amend the authoritative specification before changing code or this plan.
- Pin Node.js exactly `24.18.0`, pnpm exactly `11.11.0`, and the authoritative project compiler exactly TypeScript `7.0.2`. A third-party lint tool may not replace or wrap the formal TypeScript 7 typecheck.
- Use frozen workspace installs after the initial reviewed lockfile generation. Package-manager lifecycle scripts use an explicit empty allowlist until a reviewed dependency needs one.
- All workspace packages are private. Use ESM, package `exports`, TypeScript project references, `workspace:*` internal dependencies, and exact third-party versions.
- Public Base barrels use explicit named value/type exports only; `export *` is forbidden so the Phase 1 symbol inventory can detect every addition and removal.
- `packages/base`, `packages/ui`, and game-neutral `apps/web` are MIT. `packages/modules` and `stories/**` software are `PolyForm-Noncommercial-1.0.0`. `packages/assets` uses `SEE LICENSE IN LICENSE.md` and every source/media file still resolves to its own license.
- `@project-tavern/base` must not import React, DOM, IndexedDB, a Story, `@project-tavern/modules`, or any tavern/relationship/gameplay ID. Its unit and contract tests use only its own synthetic package.
- Sandbox is an explicitly non-canonical, synthetic Story. It must not import Demo/E2E content or establish tavern ABI.
- Do not create a root legacy `src/`, Electron, `stories/common`, a public npm release, runtime Module switching, a DI container, an event bus, ECS, CQRS/event sourcing, a generic rule language, a migration framework, or a browser Mod store.
- One `CommandCoordinatorV1.executeAttempt` owns candidate state/RNG/sequence for each command. EngineSession consumes the returned attempt exactly once and never re-executes for diagnostics.
- Rejected and faulted attempts return the exact input Snapshot object, preserve committed RNG/sequence/state, and emit no Facts. A commit advances sequence exactly once.
- FIFO dispatch returns `SessionDispatchOperationResultV1<TExecutionResult>` exactly: an executed command returns `{ kind: "executed", execution }`; admission failure or a queued command skipped after fault/HMR returns `{ kind: "not_executed", code }` without opening a candidate, consuming RNG/sequence, calling the coordinator, or entering CommandLog.
- Player `createNewSession()` and `restartSession()` accept no bootstrap values. At the FIFO head, Application calls `profile.createBootstrapInput(host.bootstrapEntropy)` and passes that same immutable result to Profile and stateful Modules. UI/Story renderers never receive bootstrap entropy or a seed/runId setter.
- `GameHostV1` remains outside simulation. Base receives declarative record/file/time/navigation/log ports, never a browser object, IndexedDB transaction, DOM node, callback transaction, network client, or global.
- Player/UI renderers receive only immutable ViewModel slices, `PlayerApplicationPortV1`, and `PresentationReadPortV1`; never Snapshot, owner capabilities, raw TextCatalogs, Asset Packs, or runtime paths.
- All Base structured values use strict closed Schemas. No `Record<string, unknown>` escape hatch, arbitrary script string, callback registry, `eval`, function serialization, `NaN`, `Infinity`, unsafe integer, negative zero, or `undefined` in serializable data.
- `references/` stays ignored, untracked, unread by production/tests/build/generation, absent from manifests and artifacts, and outside all project licenses.
- Verification commands are read-only with respect to tracked files. Only `regenerate:fixtures`, `update:golden`, `update:screenshots`, and `release:prepare` may write their documented outputs; `pnpm verify` never calls them.
- Script-test discovery is recursive and filesystem-driven: every `scripts/**/*.test.mjs` is owned by the Node runner and every `scripts/**/*.test.ts` is owned by the dedicated Vitest `scripts` project exactly once. No phase may rely on the shallow `scripts/*.test.mjs` glob or an enumerated list that can omit a future nested test.
- Every behavior slice follows focused red, observed expected failure, minimal green implementation, focused pass, phase gate, current `pnpm verify`, staged diff review, and the exact commit shown in the task.
- The first red must fail on the target behavior, not a broken toolchain, missing browser binary, invalid unrelated fixture, or syntax/type error.
- Use English identifiers and Chinese player-facing/design prose. Use SPDX headers matching each file's actual software license.
- `pnpm verify` must leave every tracked file byte-for-byte unchanged even when the worktree was already dirty before it started.

---

## File Map

### Root workspace and verification

- Create `.node-version`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`: exact toolchain, private workspaces, exact dependencies, lifecycle allowlist, and stable scripts.
- Create `tsconfig.base.json`, `tsconfig.json`, and `tsconfig.check.json`: TypeScript 7 strict project graph, build graph, and no-emit whole-workspace check.
- Create `vitest.config.ts`, `playwright.config.ts`, `vite.config.ts`, `.oxlintrc.json`, `.prettierrc.json`, and `.prettierignore`: test/build/format/type-aware-lint entrypoints without a legacy app root.
- Create `scripts/workspace-policy.mjs`: exact package/license/dependency/facet policy shared by verifiers.
- Create `scripts/classify-vitest-project.mjs`: stable mutually exclusive workspace test ownership reused by Vitest config and discovery guard.
- Create `scripts/run-script-tests.mjs`: recursively discover and execute all Node and TypeScript tests below `scripts/`, with a behavior test that rejects missing/duplicate ownership.
- Create `scripts/collect-import-closure.mjs`: resolve package exports and static production closure for Engine, Story simulation, Story presentation, and Application manifests.
- Create `packages/base/public-exports.v1.json` and `scripts/verify-public-exports.mjs`: exact Base entry targets/symbols plus a TypeScript consumer contract.
- Create `scripts/verify-toolchain.mjs`, `verify-boundaries.mjs`, `verify-cycles.mjs`, `verify-stories.mjs`, `verify-fixtures.mjs`, `verify-golden.mjs`, `verify-assets.mjs`, `verify-bundle.mjs`, `verify-artifact.mjs`, `verify-release.mjs`, and colocated `*.test.mjs`: real phase-adapted checks.
- Create `scripts/verify.mjs`: runs the complete current gate and proves tracked-file hashes are unchanged.
- Modify `scripts/verify-licensing.mjs` and `scripts/verify-licensing.test.mjs`: require all newly declared workspace package metadata and preserve the legal/reference checks.

### Workspace packages

- Create `packages/base/package.json`, `packages/ui/package.json`, `packages/modules/package.json`, `packages/assets/package.json`, `stories/demo/package.json`, `stories/e2e/package.json`, `stories/sandbox/package.json`, and `apps/web/package.json`: private package identities, exact licenses, public exports, and allowed `workspace:*` edges.
- Create one `tsconfig.json` and `src/index.ts` per package. Non-Phase-1 packages expose an intentionally empty root API; they do not publish fake domain contracts.
- Create `packages/base/src/contracts/`: values, Strict JSON, Canonical JSON, Snapshot, RNG, execution attempt, Module/Profile, GamePackage/Hotfix/asset, application, Host, presentation, Save/lease, CommandLog, and DebugBundle contracts.
- Create `packages/base/src/authoring/`: `defineGameModule`, `defineGameProfile`, `defineGamePackage`, PatchSurface, Story/Hotfix/asset resolvers, and validation.
- Create `packages/base/src/runtime/session/engine-session.ts` and `engine-session.test.ts`: synchronous busy admission, one FIFO, exact attempt consumption, and `SessionDispatchOperationResultV1` handling for paused/invalidation skips.
- Create `packages/base/src/testkit/`: neutral counter GamePackage, deterministic driver, schemas, contract suites, and resolver fixtures; export only from `@project-tavern/base/testkit`.
- Create `packages/ui/src/shell/`: minimal generic `GameShell`, immutable view bridge, contribution registry, code-native fallback renderer, and RTL tests.
- Create `stories/sandbox/src/`: independent counter Profile, GamePackage, fallback presentation, development entry, Story-owned Player/Developer application composition roots, fixture, golden vector, 1..1000 property driver, and contract/walking-skeleton tests.
- Create `apps/web/src/`: Player-safe root Loader/Web Host/mount API plus a closed `@project-tavern/web/developer` panel subpath, styles, and no Story/gameplay import.
- Create `apps/web/e2e/`: Chromium smoke, Chromium/WebKit full walking skeleton, stable generic-shell screenshot, and artifact capture hooks.

### Generated and tracked evidence

- Create `stories/sandbox/fixtures/session-zero.json`: reviewed sequence-0 development fixture regenerated only by `pnpm regenerate:fixtures`.
- Create `stories/sandbox/golden/counter-walk.json`: reviewed deterministic command/result vector updated only by `pnpm update:golden`.
- Create `apps/web/e2e/__screenshots__/sandbox-shell.png`: one stable generic shell reference updated only by `pnpm update:screenshots`.
- Keep `dist/`, Playwright reports, manifests produced by `release:prepare`, dependency folders, coverage, saves, and diagnostics ignored.

---

### Task 1: Pin the private workspace and enforce package licenses

**Files:**

- Create: `.node-version`
- Create: `.npmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Create: `packages/base/package.json`
- Create: `packages/ui/package.json`
- Create: `packages/modules/package.json`
- Create: `packages/assets/package.json`
- Create: `stories/demo/package.json`
- Create: `stories/e2e/package.json`
- Create: `stories/sandbox/package.json`
- Create: `apps/web/package.json`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`

**Interfaces:**

- Consumes: current legal files and `DEFAULT_POLICY.packageLicenses`.
- Produces: exact package names/licenses, Node/pnpm/TS pins, frozen lockfile, and `pnpm verify:licensing`.

- [ ] **Step 1: Add the missing-package-metadata red test**

Extend the temporary fixture so its success case creates `packages/base/package.json`, then add this exact behavior test:

```js
test("requires every declared workspace package manifest", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
  });
  assert(errors.includes("missing required package metadata: packages/base/package.json"));
});
```

- [ ] **Step 2: Run the focused test and observe the policy gap**

Run: `node --test --test-name-pattern="requires every declared workspace package manifest" scripts/verify-licensing.test.mjs`

Expected: FAIL because the current verifier silently skips a missing package manifest.

- [ ] **Step 3: Create the exact root and package metadata**

Use this root shape and these exact package facts; do not add semver ranges:

```json
{
  "name": "project-tavern-workspace",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "license": "SEE LICENSE IN LICENSE.md",
  "packageManager": "pnpm@11.11.0",
  "engines": { "node": "24.18.0", "pnpm": "11.11.0" },
  "scripts": {
    "verify:licensing": "node scripts/verify-licensing.mjs"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "fast-check": "4.9.0",
    "jsdom": "29.1.1",
    "oxlint": "1.73.0",
    "oxlint-tsgolint": "0.24.0",
    "prettier": "3.9.5",
    "typescript": "7.0.2",
    "vite": "8.1.4",
    "vitest": "4.1.10",
    "zod": "4.4.3"
  }
}
```

`.node-version` is exactly `24.18.0`. `.npmrc` contains `engine-strict=true`, `save-exact=true`, `strict-peer-dependencies=true`, and `shared-workspace-lockfile=true`. `pnpm-workspace.yaml` contains only the three globs `packages/*`, `stories/*`, and `apps/*`, plus `onlyBuiltDependencies: []`.

Use this exact manifest matrix:

| Path | Name | License | Runtime internal dependencies |
|---|---|---|---|
| `package.json` | `project-tavern-workspace` | `SEE LICENSE IN LICENSE.md` | none; root entries are exact dev dependencies only |
| `packages/base/package.json` | `@project-tavern/base` | `MIT` | Zod `4.4.3` |
| `packages/ui/package.json` | `@project-tavern/ui` | `MIT` | `@project-tavern/base: workspace:*`, React peer |
| `packages/modules/package.json` | `@project-tavern/modules` | `PolyForm-Noncommercial-1.0.0` | Base/UI via `workspace:*`, Zod `4.4.3` |
| `packages/assets/package.json` | `@project-tavern/assets` | `SEE LICENSE IN LICENSE.md` | Base via `workspace:*` |
| `stories/demo/package.json` | `@project-tavern/story-demo` | `PolyForm-Noncommercial-1.0.0` | Base/UI/Modules/Assets via `workspace:*`, Zod `4.4.3` |
| `stories/e2e/package.json` | `@project-tavern/story-e2e` | `PolyForm-Noncommercial-1.0.0` | Base/UI/Modules/Assets via `workspace:*`, React `19.2.7`, Zod `4.4.3` |
| `stories/sandbox/package.json` | `@project-tavern/story-sandbox` | `PolyForm-Noncommercial-1.0.0` | Base/UI/Assets/Web via `workspace:*`, Zod `4.4.3` |
| `apps/web/package.json` | `@project-tavern/web` | `MIT` | Base/UI via `workspace:*`, React/React DOM/Vite runtime |

Every workspace manifest is `private: true`, `version: "0.0.0"`, `type: "module"`, and initially exports only `.` from `src/index.ts`; the private root has no `exports`. Base later adds `./runtime` and `./testkit`, Story later adds `./development`, UI later adds `./developer`, and Web later adds a closed `./developer` entry that the Player root never re-exports. Add `package.json: "SEE LICENSE IN LICENSE.md"` to `DEFAULT_POLICY.packageLicenses` alongside the eight workspace paths.

Pin UI/Web third-party edges exactly: React and React DOM `19.2.7`, React Router DOM `7.18.1`, and Zod `4.4.3`; UI declares the exact React peer and a matching development dependency, while Web declares the three browser runtime dependencies. Base, Modules, and each Story that imports Zod declares exact `4.4.3` directly rather than relying on the root dev dependency or transitive resolution. The frozen lockfile is the reproducibility boundary; Task 1 does not enumerate, scan, classify, or gate direct/transitive dependency licensing and does not modify `THIRD_PARTY_NOTICES.md` for package-manager dependencies.

- [ ] **Step 4: Make missing metadata an error and generate the reviewed lockfile**

Replace the verifier's silent `continue` with:

```js
if (!(await exists(path))) {
  errors.push(`missing required package metadata: ${relativePath}`);
  continue;
}
```

Run:

```bash
node --version
pnpm --version
pnpm install --lockfile-only
pnpm install --frozen-lockfile
node --test scripts/verify-licensing.test.mjs
pnpm verify:licensing
```

Expected: versions print `v24.18.0` and `11.11.0`; lockfile generation runs no lifecycle scripts; all licensing tests pass; CLI prints `licensing verification passed`.

- [ ] **Step 5: Review and commit the workspace metadata**

```bash
git add -- .node-version .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml packages/base/package.json packages/ui/package.json packages/modules/package.json packages/assets/package.json stories/demo/package.json stories/e2e/package.json stories/sandbox/package.json apps/web/package.json scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "chore: scaffold pinned project workspace"
```

### Task 2: Establish the TypeScript 7 project graph and boundary gates

**Files:**

- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `tsconfig.check.json`
- Create: `packages/base/tsconfig.json`
- Create: `packages/base/src/index.ts`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/modules/tsconfig.json`
- Create: `packages/modules/src/index.ts`
- Create: `packages/assets/tsconfig.json`
- Create: `packages/assets/src/index.ts`
- Create: `stories/demo/tsconfig.json`
- Create: `stories/demo/src/index.ts`
- Create: `stories/e2e/tsconfig.json`
- Create: `stories/e2e/src/index.ts`
- Create: `stories/sandbox/tsconfig.json`
- Create: `stories/sandbox/src/index.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/index.ts`
- Create: `scripts/workspace-policy.mjs`
- Create: `scripts/verify-toolchain.mjs`
- Create: `scripts/verify-toolchain.test.mjs`
- Create: `scripts/verify-boundaries.mjs`
- Create: `scripts/verify-boundaries.test.mjs`
- Create: `scripts/verify-cycles.mjs`
- Create: `scripts/verify-cycles.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: Task 1 manifests and exact pins.
- Produces: `pnpm verify:toolchain`, `pnpm verify:boundaries`, `pnpm verify:cycles`, `pnpm typecheck`, `pnpm build`, and the first real read-only `pnpm verify` gate that Task 12 later expands.

- [ ] **Step 1: Add targeted negative toolchain/boundary/cycle tests**

Each verifier exports `verifyX(root, options?) -> Promise<readonly string[]>`. Tests create temporary package graphs and assert these exact cases:

```js
assert((await verifyToolchain(validRoot, { nodeVersion: "24.18.1", pnpmVersion: "11.11.0" }))
  .includes("Node version must be 24.18.0, got 24.18.1"));
assert((await verifyBoundaries(baseImportsStoryRoot))
  .includes("packages/base may not import @project-tavern/story-sandbox"));
assert((await verifyBoundaries(referenceImportRoot))
  .some((error) => error.includes("references/ is forbidden")));
assert((await verifyCycles(twoFileCycleRoot))
  .includes("production import cycle: packages/base/src/a.ts -> packages/base/src/b.ts -> packages/base/src/a.ts"));
```

Start each exported verifier with `return []`; the negative cases must fail on the missing policy behavior.

- [ ] **Step 2: Run the red tooling tests**

Run: `node --test scripts/verify-toolchain.test.mjs scripts/verify-boundaries.test.mjs scripts/verify-cycles.test.mjs`

Expected: FAIL on all three targeted negative assertions, not on imports or fixture setup.

- [ ] **Step 3: Create the strict TypeScript graph**

`tsconfig.base.json` uses `target: "ES2024"`, `module/moduleResolution: "NodeNext"`, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`, `isolatedModules`, `forceConsistentCasingInFileNames`, `skipLibCheck: false`, declarations, and no DOM library by default. UI/Web override `lib` with `DOM` and `DOM.Iterable`.

Root `tsconfig.json` references, in dependency order, Base, UI, Assets, Modules, Web, Sandbox, E2E, and Demo. `tsconfig.check.json` includes all production, `*.test.ts`, and `*.test-d.ts` files with `noEmit: true`. Each package project is composite, emits to its ignored local `dist/`, excludes tests, and references only its manifest dependencies.

At this checkpoint `tsconfig.check.json` covers the intentionally empty package roots and tooling only; Task 3 adds the first positive/negative public-export type test together with the contract it consumes, so Task 2 finishes clean rather than leaving a deliberately excluded file.

- [ ] **Step 4: Implement real graph verifiers**

`workspace-policy.mjs` exports the exact package matrix and allowed project edges. `verify-boundaries.mjs` parses static import/export literals, rejects `references/`, relative escapes, package-internal deep imports, undeclared workspace dependencies, simulation-to-presentation edges, Base React/DOM/browser imports, and MIT-to-PolyForm/CC edges. `verify-cycles.mjs` resolves source-file and package edges and reports a deterministic lexicographically normalized cycle. `verify-toolchain.mjs` checks live versions, `.node-version`, `packageManager`, engines, TypeScript exact dependency, workspace globs, empty lifecycle allowlist, package names/private/type/licenses/exports, and `workspace:*` internal versions.

CLI success strings are exactly `toolchain verification passed`, `boundary verification passed`, and `cycle verification passed`.

Add these root scripts at the same checkpoint:

```json
{
  "build": "tsc -b --pretty false",
  "typecheck": "tsc -p tsconfig.check.json --noEmit --pretty false",
  "verify:toolchain": "node scripts/verify-toolchain.mjs",
  "verify:boundaries": "node scripts/verify-boundaries.mjs",
  "verify:cycles": "node scripts/verify-cycles.mjs",
  "verify": "pnpm verify:toolchain && pnpm verify:licensing && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck && pnpm build"
}
```

- [ ] **Step 5: Run and commit the graph**

```bash
pnpm verify:toolchain
pnpm verify:boundaries
pnpm verify:cycles
node --test scripts/verify-toolchain.test.mjs scripts/verify-boundaries.test.mjs scripts/verify-cycles.test.mjs
pnpm verify
git add -- tsconfig.base.json tsconfig.json tsconfig.check.json packages/base/tsconfig.json packages/base/src/index.ts packages/ui/tsconfig.json packages/ui/src/index.ts packages/modules/tsconfig.json packages/modules/src/index.ts packages/assets/tsconfig.json packages/assets/src/index.ts stories/demo/tsconfig.json stories/demo/src/index.ts stories/e2e/tsconfig.json stories/e2e/src/index.ts stories/sandbox/tsconfig.json stories/sandbox/src/index.ts apps/web/tsconfig.json apps/web/src/index.ts scripts/workspace-policy.mjs scripts/verify-toolchain.mjs scripts/verify-toolchain.test.mjs scripts/verify-boundaries.mjs scripts/verify-boundaries.test.mjs scripts/verify-cycles.mjs scripts/verify-cycles.test.mjs package.json
git diff --cached --check
git commit -m "chore: enforce workspace project boundaries"
```

Expected: every verifier and its negative tests pass, `pnpm verify` runs the real toolchain/licensing/boundary/cycle/type/build gate with no root `src/`, the staged diff contains only Task 2 files, and the commit succeeds.

### Task 3: Implement neutral values, Strict JSON, Canonical JSON, and SHA-256

**Files:**

- Create: `packages/base/src/contracts/values.ts`
- Create: `packages/base/src/contracts/values.test.ts`
- Create: `packages/base/src/contracts/strict-json.ts`
- Create: `packages/base/src/contracts/strict-json.test.ts`
- Create: `packages/base/src/contracts/canonical-json.ts`
- Create: `packages/base/src/contracts/canonical-json.test.ts`
- Create: `packages/base/src/contracts/digest.ts`
- Create: `packages/base/src/contracts/digest.test.ts`
- Create: `packages/base/src/contracts/snapshot.ts`
- Create: `packages/base/src/contracts/snapshot.test.ts`
- Create: `packages/base/src/contracts/index.ts`
- Create: `packages/base/type-tests/public-exports.test-d.ts`
- Modify: `packages/base/src/index.ts`
- Modify: `tsconfig.check.json`

**Interfaces:**

- Consumes: Task 2's strict TypeScript/package graph and the Catalog's values, Strict JSON, Canonical JSON, digest, and generic Snapshot contracts.
- Produces: `Brand`, `DeepReadonly`, `ModuleId`, `StateSlotId`, `NonNegativeSafeInteger`, `PositiveSafeInteger`, `NonZeroUint32`, `RunId`, `Digest`, exact unsuffixed parsers `parseModuleId`, `parseStateSlotId`, `parseNonNegativeSafeInteger`, `parsePositiveSafeInteger`, `parseNonZeroUint32`, `parseRunId`, and `parseDigest`, `RuntimeSchemaV1<T>`, `StrictJsonValueV1`, `StrictJsonLimitsInputV1`, `parseStrictJsonLimitsV1`, `StrictJsonResultV1`, `parseStrictJson`, `canonicalJsonBytes`, closed `DigestDomainV1`, semantic `digestCanonical`, raw-file `digestBytes`, `GameSnapshotEnvelopeV1<TState,TRngState>`, and generic `createGameSnapshotEnvelopeSchemaV1(stateSchema, rngStateSchema)` for every later contract, resolver, fixture, Save/Debug codec, and Story validator.

- [ ] **Step 1: Write hostile-input and canonical-vector tests**

Tests must include actual bytes and exact outcomes:

```ts
expect(() => parseNonNegativeSafeInteger(-0)).toThrow("negative zero");
expect(parseModuleId("synthetic.parity")).toBe("synthetic.parity");
expect(parseStateSlotId("simulation.counter")).toBe("simulation.counter");
expect(() => parseModuleId(" Synthetic.parity")).toThrow();
expect(() => parseStateSlotId("simulation.counter/../../escape")).toThrow();
expect(parseStrictJson(new TextEncoder().encode('{"a":1,"a":2}'), limits))
  .toMatchObject({ ok: false, error: { code: "object.duplicate_key" } });
expect(parseStrictJson(Uint8Array.of(0xef, 0xbb, 0xbf, 0x7b, 0x7d), limits))
  .toMatchObject({ ok: false, error: { code: "encoding.bom_forbidden" } });
expect(new TextDecoder().decode(canonicalJsonBytes({ z: 0, a: [true, null] })))
  .toBe('{"a":[true,null],"z":0}');
let getterError: unknown;
try {
  canonicalJsonBytes(Object.defineProperty({}, "x", { get: () => 1 }));
} catch (error) {
  getterError = error;
}
expect(getterError).toMatchObject({ name: "CanonicalJsonError", code: "value.getter" });
expect(digestCanonical("project-tavern:state:v1", { a: 1 }))
  .not.toBe(digestCanonical("project-tavern:engine:v1", { a: 1 }));
expect(digestCanonical("project-tavern:asset-pack:v1", {
  identity: { id: "assets.synthetic", revision: 1 },
  providers: [],
})).toBe("sha256:fa4639da8be532f6097a895b8769fee4f51fbe3bf7168a90b32fb2faeb807e4e");
expect(digestBytes(new TextEncoder().encode("abc")))
  .toBe("sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(counterStateSchema, syntheticRngStateSchema);
expect(snapshotSchema.parse({ state: { count: 0 }, rng: { cursor: 1 }, commandSequence: 0 }))
  .toEqual({ state: { count: 0 }, rng: { cursor: 1 }, commandSequence: 0 });
expect(() => snapshotSchema.parse({
  state: { count: 0 }, rng: { cursor: 1 }, commandSequence: 0, extra: true,
})).toThrow();

// @ts-expect-error semantic digest domains are a closed Catalog union
digestCanonical("project-tavern:ad-hoc:v1", { a: 1 });
```

Add the package export type test only after the root contract exists:

```ts
import type { GameSnapshotEnvelopeV1, ModuleId, StateSlotId } from "@project-tavern/base";
import { parseModuleId, parseStateSlotId } from "@project-tavern/base";

export declare const publicSnapshot: GameSnapshotEnvelopeV1<unknown, unknown>;
export const publicModuleId: ModuleId = parseModuleId("synthetic.parity");
export const publicStateSlotId: StateSlotId = parseStateSlotId("simulation.counter");

// @ts-expect-error package internals are intentionally not exported
export type ForbiddenDeepImport = typeof import("@project-tavern/base/src/contracts/snapshot.js");
```

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/contracts/values.test.ts packages/base/src/contracts/strict-json.test.ts packages/base/src/contracts/canonical-json.test.ts packages/base/src/contracts/digest.test.ts packages/base/src/contracts/snapshot.test.ts`

Expected: FAIL because the five target modules/exports do not exist.

- [ ] **Step 3: Implement the closed contracts**

Use the Catalog's exact generic Snapshot:

```ts
export interface GameSnapshotEnvelopeV1<TState, TRngState> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
}

export function createGameSnapshotEnvelopeSchemaV1<TState, TRngState>(
  stateSchema: RuntimeSchemaV1<TState>,
  rngStateSchema: RuntimeSchemaV1<TRngState>,
): RuntimeSchemaV1<GameSnapshotEnvelopeV1<TState, TRngState>>;
```

The generic Snapshot Schema factory accepts only a plain object with exactly `state`, `rng`, and `commandSequence`; delegates the first two fields to the supplied strict runtime Schemas; parses sequence with `parseNonNegativeSafeInteger`; rejects accessors, custom prototypes, arrays, and unknown keys; and returns a fresh frozen envelope. It does not infer a concrete game State or RNG shape inside Base.

Implement `parseModuleId` with the Catalog stable-ID rule `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$` and UTF-8 byte length `3..96`. Implement `parseStateSlotId` as a real dot-path parser rooted at `simulation.` or `story.`: accept existing camelCase property segments such as `activeWorkflow` and `resolvedChecks`, but reject empty/index/escaped segments and the dangerous names `__proto__`, `prototype`, and `constructor`. Both parsers return their distinct brands without normalization and are exported unsuffixed from the Base root.

Strict JSON performs bounded UTF-8 decode followed by duplicate/dangerous-key-aware parsing and enforces byte/depth/node/member/array/string limits. A success result still exposes `value: unknown`; every caller must immediately pass it to the appropriate strict envelope Schema rather than treating parser success as domain validation. Canonical JSON rejects custom prototypes, accessors, cycles, functions, symbols, `undefined`, non-finite/unsafe numbers, and negative zero; it sorts keys by Unicode code point and emits UTF-8 without ambient locale/newline behavior.

Base implements deterministic UTF-8 and synchronous SHA-256 in platform-neutral TypeScript, verified against standard SHA-256/Unicode vectors; production code imports neither `node:crypto` nor DOM/WebCrypto. `DigestDomainV1` is exactly the Catalog's closed ASCII union, including `project-tavern:asset-pack:v1`; no ad-hoc service/legal-review domain is added to Base. `digestCanonical` hashes `UTF-8(domain) + one NUL byte + canonicalBytes`; `digestBytes` hashes exact bytes without framing for versioned files/artifacts. Both return `sha256:` plus 64 lower hex. Neither adds a length prefix, BOM, newline, or platform encoding.

- [ ] **Step 4: Run focused and public-export checks**

```bash
pnpm exec vitest run packages/base/src/contracts
pnpm typecheck
pnpm verify:boundaries
pnpm verify
```

Expected: all pass; the root Base import compiles and the `@ts-expect-error` deep import remains used.

- [ ] **Step 5: Commit**

```bash
git add -- packages/base/src/contracts/values.ts packages/base/src/contracts/values.test.ts packages/base/src/contracts/strict-json.ts packages/base/src/contracts/strict-json.test.ts packages/base/src/contracts/canonical-json.ts packages/base/src/contracts/canonical-json.test.ts packages/base/src/contracts/digest.ts packages/base/src/contracts/digest.test.ts packages/base/src/contracts/snapshot.ts packages/base/src/contracts/snapshot.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts packages/base/type-tests/public-exports.test-d.ts tsconfig.check.json
git diff --cached --check
git commit -m "feat(base): add strict deterministic data contracts"
```

### Task 4: Implement the project PRNG and generic execution attempt

**Files:**

- Create: `packages/base/src/contracts/rng.ts`
- Create: `packages/base/src/contracts/rng.test.ts`
- Create: `packages/base/src/contracts/rng.property.test.ts`
- Create: `packages/base/src/contracts/execution.ts`
- Create: `packages/base/src/contracts/execution.test.ts`
- Modify: `packages/base/src/contracts/index.ts`
- Modify: `packages/base/src/index.ts`

**Interfaces:**

- Consumes: Task 3 safe-integer, immutable Snapshot, and closed-value contracts plus the Catalog's xorshift32-v1 and execution-attempt semantics.
- Produces: `RngStateV1`, strict public `rngStateV1Schema`, `RngDrawTraceV1`, transactional `RuleRngV1`, exact `createTransactionalRngV1(input: NonZeroUint32 | DeepReadonly<RngStateV1>): RuleRngV1`, `CommandExecutionResultEnvelopeV1`, `CommandExecutionDiagnosticsEnvelopeV1`, and `CommandExecutionAttemptEnvelopeV1`, guaranteeing seed initialization, exact committed-state resumption, rejected/faulted exact Snapshot reference, attempted draw evidence without committed RNG movement, and the frozen 14-draw vector.

- [ ] **Step 1: Write fixed-vector and rollback tests**

```ts
const rng = createTransactionalRngV1(parseNonZeroUint32(0x00023049));
expect(rngStateV1Schema.parse({ algorithm: "xorshift32-v1", cursor: 0, rawDrawCount: 0 }))
  .toEqual({ algorithm: "xorshift32-v1", cursor: 0, rawDrawCount: 0 });
expect(() => rngStateV1Schema.parse({
  algorithm: "xorshift32-v1", cursor: 0x1_0000_0000, rawDrawCount: 0,
})).toThrow();
expect(Array.from({ length: 12 }, () => rng.nextInt({ exclusiveMax: 3, purpose: "demand:offset" }) - 1))
  .toEqual(Array(12).fill(0));
expect([
  rng.nextInt({ exclusiveMax: 6, purpose: "check:die.1" }) + 1,
  rng.nextInt({ exclusiveMax: 6, purpose: "check:die.2" }) + 1,
]).toEqual([4, 3]);
expect(rng.candidateState()).toEqual({ algorithm: "xorshift32-v1", cursor: 0x4e7b7f2e, rawDrawCount: 14 });
expect(rng.attemptedDraws()).toHaveLength(14);
expect(Object.keys(rng).sort()).toEqual(["attemptedDraws", "candidateState", "nextInt"]);
expect(Object.isFrozen(rng)).toBe(true);

const committedState = rng.candidateState();
const resumed = createTransactionalRngV1(committedState);
expect(resumed.candidateState()).toEqual(committedState);
expect(resumed.attemptedDraws()).toEqual([]);
expect(resumed.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" }))
  .toBe(rng.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" }));
expect(resumed.candidateState()).toEqual(rng.candidateState());

const rejected = rejectAttemptV1(snapshot, rng, [{ code: "synthetic.reject" }]);
expect(rejected.result.snapshot).toBe(snapshot);
expect(rejected.diagnostics.committedRngAfter).toBe(snapshot.rng);
expect(rejected.diagnostics.attemptedDraws).toHaveLength(14);

fc.assert(fc.property(nonZeroUint32Arb, fc.integer({ min: 1, max: 0x1_0000_0000 }), (seed, exclusiveMax) => {
  const left = runDrawVectorV1(seed, exclusiveMax, 64);
  const right = runDrawVectorV1(seed, exclusiveMax, 64);
  expect(left).toEqual(right);
  expect(left.results.every((value) => value >= 0 && value < exclusiveMax)).toBe(true);
}));
```

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/contracts/rng.test.ts packages/base/src/contracts/rng.property.test.ts packages/base/src/contracts/execution.test.ts`

Expected: FAIL because transactional RNG and attempt factories are absent.

- [ ] **Step 3: Implement exact Catalog types and unsigned rejection sampling**

```ts
export type CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault> =
  | { readonly kind: "committed"; readonly snapshot: TSnapshot; readonly facts: readonly TFact[] }
  | { readonly kind: "rejected"; readonly snapshot: TSnapshot; readonly reasons: readonly TRejection[] }
  | { readonly kind: "faulted"; readonly snapshot: TSnapshot; readonly fault: TFault };

export interface CommandExecutionAttemptEnvelopeV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace> {
  readonly result: CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault>;
  readonly diagnostics: CommandExecutionDiagnosticsEnvelopeV1<TRngState, TRngDrawTrace>;
}

export function createTransactionalRngV1(input: NonZeroUint32): RuleRngV1;
export function createTransactionalRngV1(input: DeepReadonly<RngStateV1>): RuleRngV1;
```

`rngStateV1Schema` is a strict object Schema for exactly `{ algorithm: "xorshift32-v1", cursor: Uint32, rawDrawCount: NonNegativeSafeInteger }`. Its internal cursor validation accepts every integer in `0..2^32-1` as required by the persisted Catalog ABI; it does not expose a new `parseUint32` public symbol. `createTransactionalRngV1` still requires a fresh `NonZeroUint32` seed, while the State overload accepts a deep-readonly committed `RngStateV1`, parses through that Schema, copies the supplied cursor/count exactly, starts `attemptedDraws()` empty, and performs no warm-up draw, seed rehash, or counter reset. Every `purpose` is validated against the Catalog rule `^(demand|check|scheduler):[a-z0-9._:-]+$` with byte length `1..128`. The next draw after resume must equal a still-live generator continued from the same State. It returns one frozen object whose complete public API is exactly `nextInt`, `candidateState`, and `attemptedDraws`; it exposes no generic cursor setter, raw draw primitive, or undocumented `draws()` alias. `attemptedDraws()` returns a readonly frozen snapshot of every attempted raw draw in stable attempt order, including discarded rejection-sampling draws. `nextInt` accepts `1..2^32`, increments `rawDrawCount` for every raw draw including discarded samples, and never uses floating scaling or direct biased modulo. Attempt factories never mutate input objects. This clarification changes no public type name beyond the already planned transactional `RuleRngV1` surface.

- [ ] **Step 4: Run focused/property/type gates and commit**

```bash
pnpm exec vitest run packages/base/src/contracts/rng.test.ts packages/base/src/contracts/execution.test.ts
pnpm exec vitest run packages/base/src/contracts/rng.property.test.ts
pnpm typecheck
pnpm verify
git add -- packages/base/src/contracts/rng.ts packages/base/src/contracts/rng.test.ts packages/base/src/contracts/rng.property.test.ts packages/base/src/contracts/execution.ts packages/base/src/contracts/execution.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts
git diff --cached --check
git commit -m "feat(base): add transactional deterministic attempts"
```

Expected: fixed-vector, rollback, and property tests pass; typecheck is clean; only the declared RNG/execution files are staged; the commit succeeds.

### Task 5: Implement Module/Profile/GamePackage authoring and synthetic Base testkit

**Files:**

- Create: `packages/base/src/contracts/module.ts`
- Create: `packages/base/src/contracts/game-package.ts`
- Create: `packages/base/src/authoring/define-game-module.ts`
- Create: `packages/base/src/authoring/define-game-profile.ts`
- Create: `packages/base/src/authoring/define-game-package.ts`
- Create: `packages/base/src/authoring/define-story-development-entry.ts`
- Create: `packages/base/src/authoring/define-story-development-entry.test.ts`
- Create: `packages/base/src/authoring/profile-validation.test.ts`
- Create: `packages/base/src/authoring/index.ts`
- Create: `packages/base/src/testkit/synthetic-counter.ts`
- Create: `packages/base/src/testkit/contract-suite.ts`
- Create: `packages/base/src/testkit/fixed-bootstrap-entropy.ts`
- Create: `packages/base/src/testkit/index.ts`
- Create: `packages/base/src/testkit/synthetic-counter.test.ts`
- Modify: `packages/base/src/contracts/index.ts`
- Modify: `packages/base/src/index.ts`
- Modify: `packages/base/package.json`

**Interfaces:**

- Consumes: Task 3 closed values/Schemas/Snapshot and Task 4 RNG/execution-attempt contracts.
- Produces: the exact Catalog `BootstrapEntropyV1`, `GameBootstrapInputV1`, `GameProfileTypeMapV1<TBootstrapInput,TState,TRngState>`, phantom witness, distinct stateful/stateless `GameModuleBindingV1`, owner proposal envelope, `CommandCoordinatorV1.executeAttempt`, `GameProfileV1.createBootstrapInput`, source `StorySimulationFacetV1` with `materializeProgram`/`createProfile`, inferred `ResolvedPatchValuesV1<TSurface>`, `GamePackageV1`, generic `StoryDevelopmentEntryV1`/`StoryDevelopmentSupportV1`, `defineGameModule`, `defineGameProfile`, `defineGamePackage`, `defineStoryDevelopmentEntry`, and `@project-tavern/base/testkit` with `createFixedBootstrapEntropyV1`, `createSyntheticCounterGamePackageV1`, exact `strictJsonRoundTripV1<T>(value: DeepReadonly<T>, schema: RuntimeSchemaV1<T>): T`, and `validateDevelopmentFixturesV1` but no concrete Story/Module/import-closure implementation.

- [ ] **Step 1: Write profile invariant and cross-profile type tests**

Cover duplicate Module ID, duplicate State slot, missing dependency, dependency cycle, stateful missing owner/schema, stateless nonempty slot/owner, and a valid one-stateful-plus-one-stateless profile. The stateless Binding has only descriptor/command-query Schemas/typed `services` plus null owner fields; it has no State Schema, initial slice, read port, or local invariant. `createFixedBootstrapEntropyV1` must prove `createBootstrapInput` consumes fresh entropy exactly once per lifecycle operation. `defineStoryDevelopmentEntry` validates/fixes the exact synchronous Catalog source shape without knowing a concrete Story command; generic `validateDevelopmentFixturesV1(entry, { fixtureIdSchema, commandSchema })` invokes support twice and rejects a throw/thenable, nondeterministic result, duplicate fixture IDs, invalid seeds, or invalid commands. Add a compile-time witness:

```ts
import { parseModuleId } from "@project-tavern/base";

const defineA = defineGameModule<ProfileATypesV1>();
const defineB = defineGameModule<ProfileBTypesV1>();
const moduleB = defineB(validBindingB);

// @ts-expect-error a Binding from Profile B cannot enter Profile A's tuple
defineGameProfile<ProfileATypesV1>()({ ...validProfileA, modules: [moduleB] });

const parity = defineGameModule<SyntheticTypesV1>()({
  bindingKind: "stateless",
  descriptor: {
    id: parseModuleId("synthetic.parity"),
    contractRevision: 1,
    stateSlots: [],
    dependencies: [],
  },
  commandSchema: null,
  querySchema: parityQuerySchema,
  queryResultSchema: parityResultSchema,
  ownerOperationSchema: null,
  ownerProposalSchema: null,
  owner: null,
  services: parityServiceV1,
});

const roundTripped = strictJsonRoundTripV1(
  { count: parseNonNegativeSafeInteger(2) },
  syntheticCounterStateV1Schema,
);
expect(roundTripped).toEqual({ count: 2 });
expect(() => strictJsonRoundTripV1({ count: 2, extra: true }, syntheticCounterStateV1Schema)).toThrow();
```

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/authoring/profile-validation.test.ts packages/base/src/testkit/synthetic-counter.test.ts && pnpm typecheck`

Expected: FAIL on missing authoring/testkit exports.

- [ ] **Step 3: Implement the exact type spine and runtime validation**

Use the Catalog signatures without widening Snapshot/state/RNG to independent unknowns. `defineGameProfile` verifies IDs/slots/owner triads/dependencies/DAG/closed Schemas and deep-freezes the accepted definition. Error messages are diagnostics, not new persisted ABI codes. `defineGamePackage` is side-effect-free and freezes only the source entry; its simulation facet contains a positive, non-patchable `stateContractRevision`, source data/rules/Narrative/PatchSurface, plus synchronous `materializeProgram(resolvedPatchValues)` and `createProfile(program)`, never a pre-resolved Profile. `ResolvedPatchValuesV1<TSurface>` is inferred through a private phantom witness carried by the typed PatchSurface and exposes only its exact symbol-to-value map; Task 6 makes the authoring helpers supply that witness. Resolver tasks freeze resolved outputs.

The neutral testkit counter owns `synthetic.counter`, accepts `synthetic.increment|reject|fault`, emits `synthetic.incremented`, and uses no tavern/Story-specific production package. Its coordinator returns one attempt with the same diagnostics later consumed by Session.

`strictJsonRoundTripV1<T>` performs exactly `canonicalJsonBytes(value)` → `parseStrictJson(bytes, fixedTestkitLimitsV1)` → `schema.parse(parsed.value)`. It throws the bounded Strict-JSON error on parse failure, never returns the unvalidated parser value, never uses `JSON.stringify`/`JSON.parse`, and preserves branded output only because the caller-supplied runtime Schema reconstructs it.

- [ ] **Step 4: Run and commit**

```bash
pnpm exec vitest run packages/base/src/authoring packages/base/src/testkit
pnpm typecheck
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify
git add -- packages/base/src/contracts/module.ts packages/base/src/contracts/game-package.ts packages/base/src/contracts/index.ts packages/base/src/authoring/define-game-module.ts packages/base/src/authoring/define-game-profile.ts packages/base/src/authoring/define-game-package.ts packages/base/src/authoring/define-story-development-entry.ts packages/base/src/authoring/define-story-development-entry.test.ts packages/base/src/authoring/profile-validation.test.ts packages/base/src/authoring/index.ts packages/base/src/testkit/synthetic-counter.ts packages/base/src/testkit/contract-suite.ts packages/base/src/testkit/fixed-bootstrap-entropy.ts packages/base/src/testkit/index.ts packages/base/src/testkit/synthetic-counter.test.ts packages/base/src/index.ts packages/base/package.json
git diff --cached --check
git commit -m "feat(base): add static game package authoring"
```

Expected: authoring and neutral testkit suites pass, cross-profile misuse remains a consumed `@ts-expect-error`, boundary/cycle gates stay green, and the commit contains no Story or gameplay implementation.

### Task 6: Implement Hotfix, asset, Story, and build-identity resolvers

**Files:**

- Create: `packages/base/src/contracts/hotfix.ts`
- Create: `packages/base/src/contracts/assets.ts`
- Create: `packages/base/src/contracts/provenance.ts`
- Create: `packages/base/src/authoring/patch-surface.ts`
- Create: `packages/base/src/authoring/hotfix-resolver.ts`
- Create: `packages/base/src/authoring/hotfix-resolver.test.ts`
- Create: `packages/base/src/authoring/asset-resolver.ts`
- Create: `packages/base/src/authoring/asset-resolver.test.ts`
- Create: `packages/base/src/authoring/story-resolver.ts`
- Create: `packages/base/src/authoring/story-resolver.test.ts`
- Create: `packages/base/src/authoring/build-identity.ts`
- Create: `packages/base/src/authoring/build-identity.test.ts`
- Create: `packages/base/src/testkit/resolver-fixtures.ts`
- Create: `packages/base/src/testkit/story-contracts.ts`
- Create: `packages/base/src/testkit/story-contracts.test.ts`
- Modify: `packages/base/src/testkit/index.ts`
- Modify: `packages/base/src/contracts/index.ts`
- Modify: `packages/base/src/authoring/index.ts`
- Modify: `packages/base/src/index.ts`

**Interfaces:**

- Consumes: Task 3 Canonical JSON/digests, Task 5 authoring/testkit contracts, and the Catalog's Hotfix, asset, provenance, and PatchSurface rules.
- Produces: `definePatchSlot`, `defineSimulationPatchSurface`, and `definePresentationPatchSurface`; separate simulation/presentation Patch registries whose private witnesses populate Task 5's `ResolvedPatchValuesV1<TSurface>`; exact Hotfix order/requires/conflicts/supersedes/target checks; closed `GamePackageResolutionFailureCodeV1`/failure/result contracts; public `PatchSetAdoptionDeclarationV1`; the Catalog-exact `AssetPackDigestProjectionV1` and `ResolvedAssetManifestV1`; frozen `ResolvedStoryV1`; one public generic `resolveGamePackageV1` composition function; layered engine/story/state/simulation/presentation/application identities; and public testkit `resolveStoryForTestV1`/`validateStoryV1` backed by those real resolvers.

- [ ] **Step 1: Write resolver contract tests**

Tests prove two fresh installs have identical traces, thenable install fails, missing/unapplied target fails, provider digest mismatch fails, collisions require explicit supersedes, presentation-only replacement leaves simulation PatchSet digest unchanged, sealed/unknown/path-traversal asset override fails, fallback-only slots still produce one resolved entry each, and calling `GamePackage.define()` twice produces equal canonical projections.

```ts
it("keeps presentation-only replacement out of the simulation identity", () => {
  const base = resolveSyntheticStoryV1({ hotfixes: [] });
  const patched = resolveSyntheticStoryV1({ hotfixes: [presentationTextHotfixV1] });

  expect(patched.patchSet.simulationDigest).toBe(base.patchSet.simulationDigest);
  expect(patched.presentationDigest).not.toBe(base.presentationDigest);
  expect(patched.patchSet.appliedHotfixes).toHaveLength(1);
});

it("keeps archive-only sources outside the compiled manifest", () => {
  expect(() => compileSyntheticAssetProviderV1({
    ...syntheticProviderV1,
    runtimePath: "../../art-source/aigc/openai/illustrations/example.png",
  })).toThrow();
  expect(resolveFallbackOnlyManifestV1().assets.every(
    (asset) => asset.delivery === "code_fallback",
  )).toBe(true);
});

it("computes Asset Pack identity from the exact nonrecursive authored projection", () => {
  const resolved = resolveSyntheticStoryV1({ assetPacks: [syntheticAssetPackV1] });
  const identity = resolved.assets.packs[0];
  const projection = {
    identity: {
      id: syntheticAssetPackV1.identity.id,
      revision: syntheticAssetPackV1.identity.revision,
    },
    providers: syntheticAssetPackV1.providers,
  };

  expect(identity.digest).toBe(
    digestCanonical("project-tavern:asset-pack:v1", projection),
  );
  expect(projection.identity).not.toHaveProperty("digest");
  expect(identity.digest).not.toBe(digestBytes(canonicalJsonBytes(projection)));
  expect(syntheticAssetPackV1.providers[0]?.sha256).toBe(
    digestBytes(syntheticProviderBytesV1),
  );
});

it("treats Asset Pack provider order as semantic", () => {
  const base = resolveSyntheticStoryV1({ assetPacks: [syntheticAssetPackV1] });
  const reordered = withSyntheticProviderOrderReversedV1(syntheticAssetPackV1);
  const changed = resolveSyntheticStoryV1({ assetPacks: [reordered] });
  expect(changed.assets.packs[0]?.digest).not.toBe(
    base.assets.packs[0]?.digest,
  );
});

it("rejects duplicate Asset Pack providers before identity", () => {
  expect(() => resolveSyntheticStoryV1({
    assetPacks: [syntheticAssetPackWithDuplicateProviderV1],
  })).toThrow();
});

it("resolves an unpatched Story through the real resolver for test drivers", () => {
  const resolved = resolveStoryForTestV1(syntheticStoryEntryV1);
  expect(resolved.frozen).toBe(true);
  expect(resolved.provenance.resolved.simulationDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(() => resolveStoryForTestV1(invalidSyntheticStoryEntryV1)).toThrow();
});

it("materializes a Profile from the post-Hotfix program", () => {
  const base = resolveStoryForTestV1(syntheticStoryEntryV1);
  const patched = resolveSyntheticStoryV1({ hotfixes: [syntheticRuleHotfixV1] });
  expect(base.simulationProgram.ruleResult).not.toBe(patched.simulationProgram.ruleResult);
  expect(runSyntheticProfileV1(patched.profile)).toBe(patched.simulationProgram.ruleResult);
  expect(runSyntheticProfileV1(base.profile)).toBe(base.simulationProgram.ruleResult);
});
```

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/authoring/hotfix-resolver.test.ts packages/base/src/authoring/asset-resolver.test.ts packages/base/src/authoring/story-resolver.test.ts packages/base/src/authoring/build-identity.test.ts packages/base/src/testkit/story-contracts.test.ts`

Expected: FAIL because resolver exports are absent.

- [ ] **Step 3: Implement candidate registries and deterministic resolution**

Install Hotfixes in supplied order only, reject duplicate IDs and invalid earlier-only `requires`, apply all candidates atomically, revoke write proxies, and deep-freeze results. Provider/PatchSet digests use the Catalog domains and canonical projections, never `Function#toString()`.

Asset resolution freezes slots first, applies packs in authored order, then asset Hotfixes to replaceable slots only. Before identity, each pack rejects duplicate provider Asset IDs. Its resolved digest is exactly `digestCanonical("project-tavern:asset-pack:v1", { identity: { id, revision }, providers })`, built by explicit field selection: no spread, no recursive resolved digest, and no sorting or normalization of the authored provider array. This resolved identity is carried by manifests/presentation roots; provider file hashes remain exact `digestBytes` values and therefore bind shipped bytes through the pack projection. `runtimePath` rejects absolute/backslash/empty/dot/dot-dot/query/fragment forms and cannot reach `art-source/aigc/**` or `references/**`. Every slot resolves to either a technically validated runtime image or code fallback. Phase 1 supplies fallback-only entries and does not inspect the AIGC source archive.

Build identity consumes workspace-relative POSIX import-closure records `{ path, sha256, facet }` produced by the repository collector in Task 12, rejects dynamic/unowned/reference/symlink inputs, sorts by path, and excludes mtime/absolute path/chunk name/environment traversal order.

`resolveGamePackageV1` is the only public resolver value. It accepts the typed GamePackage, explicit ordered Hotfix list, compiled asset-governance input, and generated build-identity input, then returns exactly `GamePackageResolutionResultV1<ResolvedStoryV1<...>>`. All throws/thenables/contract/provider/materialization/build failures are normalized to the Catalog's closed code, ordered rejected Hotfix IDs, and bounded Strict-JSON details; no arbitrary thrown shape crosses the public boundary. Its generic parameter/return structure is declared with the function; no separate public input bag is added. The lower-level Hotfix, asset, Story, and build-identity resolver functions remain private implementation details.

Resolution order is exact: call `entry.define()`; create fresh candidate Patch registries; install and validate all Hotfixes atomically; revoke writes; materialize deeply frozen, symbol-keyed `ResolvedPatchValuesV1<TSurface>` maps; call source `materializeProgram(values)` and `materializePresentation(values)` exactly once each; contract-validate and runtime-deep-freeze both returned Programs; call source `createProfile(simulationProgram)` exactly once; validate that the Profile's actual Module/schema/coordinator manifest and the SimulationProgram are same-origin; compute state/simulation/presentation identities from their canonical projections, provider/import-closure digests, and Patch traces; then deep-freeze `ResolvedStoryV1`. The source facet contains no already-closed Profile. Resolver failure before the final freeze exposes no runnable candidate: patched simulation value/rule symbols are observable through `resolved.simulationProgram` and `resolved.profile`, patched presentation text/value symbols through `resolved.presentationProgram`, and patched asset symbols through `resolved.assets`.

`@project-tavern/base/testkit` additionally exposes `resolveStoryForTestV1(entry)`. It invokes that same public resolver with no Hotfixes, an empty approved-provider set, and deterministic test-only import-closure/build-identity fixtures, throws the resolver's bounded failure, and returns the frozen `ResolvedStoryV1` on success. It neither skips validation nor claims production artifact identity; its digests are stable only for deterministic tests. `validateStoryV1` shares this path and discards the resolved value after its contract assertions. This is the only testkit helper allowed to turn a source `GamePackageV1` into a runnable unpatched test Story.

- [ ] **Step 4: Run and commit**

```bash
pnpm exec vitest run packages/base/src/authoring packages/base/src/testkit/story-contracts.test.ts
pnpm typecheck
pnpm verify:boundaries
pnpm verify
git add -- packages/base/src/contracts/hotfix.ts packages/base/src/contracts/assets.ts packages/base/src/contracts/provenance.ts packages/base/src/contracts/index.ts packages/base/src/authoring/patch-surface.ts packages/base/src/authoring/hotfix-resolver.ts packages/base/src/authoring/hotfix-resolver.test.ts packages/base/src/authoring/asset-resolver.ts packages/base/src/authoring/asset-resolver.test.ts packages/base/src/authoring/story-resolver.ts packages/base/src/authoring/story-resolver.test.ts packages/base/src/authoring/build-identity.ts packages/base/src/authoring/build-identity.test.ts packages/base/src/authoring/index.ts packages/base/src/testkit/resolver-fixtures.ts packages/base/src/testkit/story-contracts.ts packages/base/src/testkit/story-contracts.test.ts packages/base/src/testkit/index.ts packages/base/src/index.ts
git diff --cached --check
git commit -m "feat(base): resolve stories hotfixes and assets"
```

Expected: every deterministic, conflict, facet, asset-path, byte-identity, and resolved-identity test passes; a consumer can import only `resolveGamePackageV1` for full resolution and cannot deep-import the lower-level resolvers; type/boundary checks exit 0; only declared Base resolver files are committed.

### Task 7: Freeze Application, Host, Presentation, and UI contribution contracts

**Files:**

- Create: `packages/base/src/contracts/application.ts`
- Create: `packages/base/src/contracts/host.ts`
- Create: `packages/base/src/contracts/presentation.ts`
- Create: `packages/base/type-tests/application.test-d.ts`
- Create: `packages/base/src/contracts/host.test.ts`
- Create: `packages/base/src/contracts/presentation.test.ts`
- Modify: `packages/base/src/contracts/index.ts`
- Modify: `packages/base/src/index.ts`

**Interfaces:**

- Consumes: Task 3 closed values/Schemas, Task 5 bootstrap entropy and Profile type spine, Task 6 resolved presentation/provenance types, and the Catalog Application/Host/presentation signatures.
- Produces: exact Catalog `ReadonlyViewSourceV1`, five-subport `PlayerApplicationPortV1`, `SaveSlotIdV1`, `PlayerWritableSaveSlotIdV1`, branded lease IDs, seven-parameter generic `PlayerPersistencePortV1`, `DeveloperApplicationPortV1`, `GameHostV1`, atomic record/file ports, `RuntimeSessionStatusV1`, `SessionDispatchOperationResultV1`, `SessionAnchorResultV1`, `PresentationReadPortV1`, public `ResolvedTextPresentationV1`/`ResolvedAssetPresentationV1` DTOs, `RuntimeViewModelEnvelopeV1`, `UiRendererBindingV1`, and `UiContributionSetV1`.

- [ ] **Step 1: Write structural privacy and Host atomicity tests**

Use compile-time assertions that Player/Application renderer contexts reject `snapshot`, `session`, `owner`, `catalogs`, `assetPacks`, and `runtimePath`, and that `exportSave` returns generic `TSaveExportResult` while `exportCurrentSave` returns generic `TExportedSave`. Runtime tests use a memory Host to prove list key ordering, unique `(namespace,key)` mutation enforcement, all-or-nothing conflict, and no callback transaction API. Concrete Save/lease/Debug DTOs are frozen separately in Task 8.

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/contracts/host.test.ts packages/base/src/contracts/presentation.test.ts && pnpm typecheck`

Expected: FAIL because Host/Presentation/Application exports are absent.

- [ ] **Step 3: Implement exact interfaces**

Keep these central signatures unchanged:

```ts
export interface GameHostV1 {
  readonly platform: "web" | "electron";
  readonly bootstrapEntropy: BootstrapEntropyV1;
  readonly records: HostAtomicRecordStoreV1;
  readonly files: HostFilePortV1;
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly navigation: { reloadApplication(): void; requestExit(): void };
  readonly log: { write(level: "debug" | "info" | "warn" | "error", code: string, details: StrictJsonObjectV1): void };
}

export interface PresentationReadPortV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken> {
  readonly locale: TLocaleId;
  text(textId: TTextId): ResolvedTextPresentationV1<TTextId, TLocaleId>;
  asset(assetId: TAssetId, usage: TAssetUsage): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
}

export interface PlayerApplicationPortV1<TViewModel, TCommandPort, TLifecyclePort, TPersistencePort, TDiagnosticsPort> {
  readonly view: ReadonlyViewSourceV1<TViewModel>;
  readonly commands: TCommandPort;
  readonly lifecycle: TLifecyclePort;
  readonly persistence: TPersistencePort;
  readonly diagnostics: TDiagnosticsPort;
}

export interface SessionLifecyclePortV1<TAnchorResult> {
  createNewSession(): Promise<TAnchorResult>;
  restartSession(): Promise<TAnchorResult>;
}

export interface PlayerPersistencePortV1<
  TSlotSummary,
  TPersistenceStatus,
  TPersistenceResult,
  TExportedSave,
  TSaveExportResult,
  TLeaseStatus,
  TLeaseOperationResult,
> {
  readonly lease: SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult>;
  listSlots(): Promise<readonly TSlotSummary[]>;
  getStatus(): Promise<TPersistenceStatus>;
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult>;
  load(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  clear(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  exportSave(slot: SaveSlotIdV1): Promise<TSaveExportResult>;
  exportCurrentSave(): Promise<TExportedSave>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult>;
}
```

No concrete browser implementation enters Base.

`SaveSlotIdV1`, `PlayerWritableSaveSlotIdV1`, `SessionLeaseOwnerId`, and `LeaseHandoffRequestId` live with the generic Application method signatures in this task; Task 8 adds their concrete result/envelope DTOs without redefining these IDs.

- [ ] **Step 4: Run and commit**

```bash
pnpm exec vitest run packages/base/src/contracts
pnpm typecheck
pnpm verify:boundaries
pnpm verify
git add -- packages/base/src/contracts/application.ts packages/base/type-tests/application.test-d.ts packages/base/src/contracts/host.ts packages/base/src/contracts/host.test.ts packages/base/src/contracts/presentation.ts packages/base/src/contracts/presentation.test.ts packages/base/src/contracts/index.ts packages/base/src/index.ts
git diff --cached --check
git commit -m "feat(base): define host and presentation ports"
```

Expected: runtime and compile-time contract suites pass with the seven-parameter generic persistence port, exact dispatch/lifecycle/Host/Presentation shapes, and no browser implementation in Base; the commit succeeds.

### Task 8: Freeze Save, lease, CommandLog, and DebugBundle envelopes

**Files:**

- Create: `packages/base/src/contracts/persistence.ts`
- Create: `packages/base/src/contracts/persistence.test.ts`
- Create: `packages/base/src/contracts/diagnostics.ts`
- Create: `packages/base/src/contracts/diagnostics.test.ts`
- Create: `packages/base/type-tests/persistence-diagnostics.test-d.ts`
- Modify: `packages/base/src/contracts/index.ts`
- Modify: `packages/base/src/index.ts`

**Interfaces:**

- Consumes: Task 3 strict values/limits/digests, Task 6 provenance, and Task 7 generic Application/Host contracts.
- Produces: generic `SaveRecordEnvelopeV1`, exact public `createSaveRecordEnvelopeSchemaV1(snapshotSchema, provenanceSchema, slotMetadataSchema, simulationLineageSchema)`, public `SaveSlotHealthV1`, `SaveSlotSummaryV1`, `PersistenceStatusV1` and the remaining Save compatibility DTOs, `PersistenceOperationResultV1`, `SaveExportOperationResultV1`, `ExportedSaveV1`, exact lease statuses, generic `CommandLogEntryBaseV1`/`CommandLogEntryEnvelopeV1`, the Catalog's concrete `RuntimeFaultBaseV1`/`RuntimeOperationFaultV1`, generic `DebugBundleEnvelopeV1`, `ExportedDebugBundleV1`, and the reviewed Save/Debug strict limits. Base does not invent a second runtime-failure envelope.

- [ ] **Step 1: Write closed-envelope and public-shape tests**

```ts
it("keeps Save and Debug export results closed", () => {
  expect(() => exportedSaveSchemaV1.parse({
    filename: "slot.json",
    mediaType: "application/json",
    digest: digest("save"),
    bytes: Uint8Array.of(1),
    summary: {},
  })).toThrow();
  expect(() => exportedDebugBundleSchemaV1.parse({
    filename: "run.debug-bundle.json",
    mediaType: "application/json",
    digest: digest("debug"),
    bytes: Uint8Array.of(2),
    summary: {},
  })).toThrow();
});

it("carries owner and fencing state through every available lease branch", () => {
  expect(sessionLeaseStatusSchemaV1.parse({
    kind: "handoff_requested",
    ownerId: leaseOwnerId("owner-a"),
    fencingToken: 3,
    requestId: handoffRequestId("request-1"),
    requestedByOwnerId: leaseOwnerId("owner-b"),
  })).toMatchObject({ ownerId: "owner-a", fencingToken: 3 });
});

it("builds a strict Save record Schema from four specialization Schemas", () => {
  const schema = createSaveRecordEnvelopeSchemaV1(
    syntheticSnapshotSchema,
    syntheticProvenanceSchema,
    syntheticSlotMetadataSchema,
    syntheticSimulationLineageSchema,
  );
  expect(schema.parse(validSyntheticSaveRecord)).toEqual(validSyntheticSaveRecord);
  expect(() => schema.parse({ ...validSyntheticSaveRecord, extra: true })).toThrow();
});
```

The type test proves `PlayerPersistencePortV1.exportSave` specializes to `SaveExportOperationResultV1`, `exportCurrentSave` specializes to `ExportedSaveV1`, `PersistenceOperationResultV1` has no `exported` discriminant, `unowned` has `ownerId:null` plus a positive token, `unavailable` has both owner/token null, and `ExportedDebugBundleV1` has no `summary` property.

- [ ] **Step 2: Run red**

Run:

```bash
pnpm exec vitest run packages/base/src/contracts/persistence.test.ts packages/base/src/contracts/diagnostics.test.ts
pnpm typecheck
```

Expected: FAIL because the Save/lease/diagnostic envelope modules and public exports do not exist.

- [ ] **Step 3: Implement the generic envelopes and exact limits**

Keep persisted containers generic over Story/Profile specializations:

```ts
export interface SaveRecordEnvelopeV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage,
> {
  readonly formatRevision: 1;
  readonly recordRevision: PositiveSafeInteger;
  readonly provenance: TProvenance;
  readonly slot: TSlotMetadata;
  readonly savedAt: IsoUtcInstant;
  readonly stateDigest: Digest;
  readonly snapshot: TSnapshot;
  readonly simulationLineage: TSimulationLineage;
}

export function createSaveRecordEnvelopeSchemaV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage,
>(
  snapshotSchema: RuntimeSchemaV1<TSnapshot>,
  provenanceSchema: RuntimeSchemaV1<TProvenance>,
  slotMetadataSchema: RuntimeSchemaV1<TSlotMetadata>,
  simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>,
): RuntimeSchemaV1<SaveRecordEnvelopeV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage
>>;

export interface ExportedDebugBundleV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}
```

`PersistenceOperationResultV1` contains only saved/cleared, loaded/imported, typed rejected, and faulted. `SaveExportOperationResultV1` alone contains exported/file plus typed export rejection/fault. Lease status is exactly `owned | readonly | handoff_requested | unowned | unavailable`, with the current Catalog owner/fencing fields.

For both `ExportedSaveV1` and `ExportedDebugBundleV1`, `digest` means `digestBytes(bytes)` over the exact exported file bytes. It is raw-file integrity only; it never reuses a semantic digest domain or substitutes for the state/current-state digests inside the envelope.

`createSaveRecordEnvelopeSchemaV1` builds an exact strict envelope: literal `formatRevision: 1`, positive `recordRevision`, strict `IsoUtcInstant`/`Digest`, and the four supplied specialization Schemas; it rejects unknown keys at the envelope and delegates recursive closure to those Schemas. Generic CommandLog and DebugBundle envelopes preserve authored/causal array order and expose no arbitrary JSON field. Concrete internal schemas receive the relevant Profile specializations and reject unknown keys recursively. Freeze these limits exactly:

```ts
export const saveJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 10_000,
  maxObjectMembers: 10_000,
  maxNodes: 100_000,
  maxStringBytes: 262_144,
});
export const debugBundleJsonLimitsV1 = parseStrictJsonLimitsV1({
  ...saveJsonLimitsV1,
  maxBytes: 20_971_520,
});
```

- [ ] **Step 4: Run focused/type/full checks and commit**

```bash
pnpm exec vitest run packages/base/src/contracts/persistence.test.ts packages/base/src/contracts/diagnostics.test.ts
pnpm typecheck
pnpm verify:boundaries
pnpm verify
git add -- packages/base/src/contracts/persistence.ts packages/base/src/contracts/persistence.test.ts packages/base/src/contracts/diagnostics.ts packages/base/src/contracts/diagnostics.test.ts packages/base/type-tests/persistence-diagnostics.test-d.ts packages/base/src/contracts/index.ts packages/base/src/index.ts
git diff --cached --check
git commit -m "feat(base): freeze persistence diagnostic envelopes"
```

Expected: all contract/type/boundary/current verification commands pass; the staged diff contains only Task 8 files; the commit succeeds.

### Task 9: Implement the single EngineSession FIFO and dispatch operation result

**Files:**

- Create: `packages/base/src/runtime/session/engine-session.ts`
- Create: `packages/base/src/runtime/session/engine-session.test.ts`
- Create: `packages/base/src/runtime/session/index.ts`
- Create: `packages/base/src/runtime/index.ts`
- Modify: `packages/base/package.json`

**Interfaces:**

- Consumes: `SessionDispatchOperationResultV1`, `CommandCoordinatorV1.executeAttempt`, attempt diagnostics, `RuntimeSessionStatusV1`, and Base synthetic counter.
- Produces: `EngineSessionV1`, internal `EngineSessionRuntimeControlV1`, `AuthoritativeOutcomeV1`, and `createEngineSessionV1` from `@project-tavern/base/runtime`; exactly one mutation tail, synchronous busy state, immutable current Snapshot inspection for runtime composition only, and no Player setter.

- [ ] **Step 1: Write FIFO/admission/attempt-once tests**

Tests queue two commits, then queue `fault` followed by `increment`, and separately queue an authoritative HMR invalidation ahead of an accepted increment. They assert busy becomes visible before the returned Promise settles; commits run in admission order; `executeAttempt` is called once for every actually executed command; fault preserves exact Snapshot and pauses; the already queued increment resolves `not_executed/fault_paused` with zero additional coordinator calls; queued HMR skip resolves `not_executed/hmr_invalidated` with zero coordinator calls; a thrown/thenable coordinator is normalized to one faulted attempt; the internal tail settles so a permitted anchor operation can recover.

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run packages/base/src/runtime/session/engine-session.test.ts`

Expected: FAIL because `createEngineSessionV1` is absent.

- [ ] **Step 3: Implement the Catalog result exactly**

The public runtime shape is:

```ts
export interface EngineSessionV1<TTypes extends GameProfileTypeMapV1> {
  getStatus(): RuntimeSessionStatusV1;
  getCurrentSnapshot(): DeepReadonly<TTypes["snapshot"]>;
  subscribe(listener: () => void): () => void;
  dispatch(command: DeepReadonly<TTypes["command"]>): Promise<SessionDispatchOperationResultV1<
    CommandExecutionResultEnvelopeV1<TTypes["snapshot"], TTypes["fact"], TTypes["rejection"], TTypes["fault"]>
  >>;
}

export type AuthoritativeOutcomeV1<TSnapshot, TResult> =
  | { readonly kind: "preserve"; readonly result: TResult }
  | {
      readonly kind: "replace";
      readonly snapshot: TSnapshot;
      readonly result: TResult;
      readonly anchor: "preserve_log" | "replace_replay_base";
    };

export interface EngineSessionRuntimeControlV1<TSnapshot> {
  enqueueAuthoritative<TResult>(
    operation: (current: DeepReadonly<TSnapshot>) => Promise<AuthoritativeOutcomeV1<TSnapshot, TResult>>,
    normalizeUnexpectedFault: (error: unknown) => TResult,
  ): Promise<TResult>;
  inspectForRuntime(): {
    readonly snapshot: DeepReadonly<TSnapshot>;
    readonly status: RuntimeSessionStatusV1;
  };
}
```

An executed command resolves as `{ kind: "executed", execution: result }`. Admission Schema failure resolves `not_executed/validation_failed`; an unavailable Session resolves `not_executed/session_unavailable`; a queued command that reaches the head after fault/HMR resolves `not_executed/fault_paused|hmr_invalidated`. None of the four non-executed paths calls `executeAttempt`. `enqueueAuthoritative` is the only internal primitive used by no-argument lifecycle and later load/import/anchor operations; it is never placed on `PlayerApplicationPortV1`. Its required total `normalizeUnexpectedFault` converts a thrown/rejected callback into that operation's typed result while preserving the Snapshot, setting fault pause, settling the tail, and resolving rather than leaking a Promise rejection; Task 11 lifecycle maps this to `SessionAnchorResultV1 { kind: "faulted", code }`.

EngineSession also has a Base-private HMR invalidation capability used by its own tests and, later, by the closed Developer controller. It preserves the current Snapshot and causes queued/new gameplay dispatch to return the exact HMR non-executed result until full rebootstrap. The capability is not a member of exported `EngineSessionRuntimeControlV1`, is absent from `@project-tavern/base/runtime`, and cannot be obtained by Player/Application consumers.

- [ ] **Step 4: Run and commit**

```bash
pnpm exec vitest run packages/base/src/runtime/session/engine-session.test.ts
pnpm typecheck
pnpm verify:boundaries
pnpm verify
git add -- packages/base/src/runtime/session/engine-session.ts packages/base/src/runtime/session/engine-session.test.ts packages/base/src/runtime/session/index.ts packages/base/src/runtime/index.ts packages/base/package.json
git diff --cached --check
git commit -m "feat(base): serialize authoritative session operations"
```

Expected: FIFO, same-tick busy, attempt-once, queued fault/HMR skip, total-normalizer, and recovery tests pass; type/boundary gates exit 0; only Base runtime/export files are committed.

### Task 10: Build the independent Sandbox Story, fixtures, golden, balance, and asset checks

**Files:**

- Create: `stories/sandbox/src/contracts.ts`
- Create: `stories/sandbox/src/profile.ts`
- Create: `stories/sandbox/src/presentation.ts`
- Create: `stories/sandbox/src/story-entry.ts`
- Create: `stories/sandbox/src/development.ts`
- Create: `stories/sandbox/src/session.ts`
- Create: `stories/sandbox/src/walking-skeleton.test.ts`
- Create: `stories/sandbox/src/story-contract.test.ts`
- Create: `stories/sandbox/src/property.test.ts`
- Create: `stories/sandbox/fixtures/session-zero.json`
- Create: `stories/sandbox/golden/counter-walk.json`
- Create: `stories/sandbox/scripts/verify-fixtures.mts`
- Create: `stories/sandbox/scripts/regenerate-fixtures.mts`
- Create: `stories/sandbox/scripts/verify-golden.mts`
- Create: `stories/sandbox/scripts/update-golden.mts`
- Create: `stories/sandbox/scripts/verify-balance.mts`
- Modify: `stories/sandbox/src/index.ts`
- Modify: `stories/sandbox/package.json`

**Interfaces:**

- Consumes: Tasks 3–9 public Base contracts/runtime/testkit, `@project-tavern/assets`, Zod/fast-check, and the synthetic-only Sandbox scope.
- Produces: side-effect-free `sandboxStoryEntryV1`, separate `./development` export containing `sandboxDevelopmentEntryV1`, one stateful counter Module, one stateless parity service, one Profile/Coordinator, fallback-only Text/Asset presentation, fixed fixture/golden, 1..1000 deterministic property evidence, and real owned work for `verify:stories`, `verify:fixtures`, `verify:golden`, `verify:balance`, `verify:assets`, `test:contract`, and `test:property`.

- [ ] **Step 1: Write the headless walking-skeleton red test**

```ts
const resolved = resolveStoryForTestV1(sandboxStoryEntryV1);
const entropy = createFixedBootstrapEntropyV1({
  uuids: ["00000000-0000-4000-8000-000000000001"],
  uint32s: [parseNonZeroUint32(0x00023049)],
});
const session = createSandboxSessionV1(
  resolved.profile,
  resolved.profile.createBootstrapInput(entropy),
);
const pending = session.dispatch({ kind: "sandbox.counter.increment" });
expect(session.getStatus()).toBe("busy");
const outcome = await pending;
expect(outcome).toMatchObject({ kind: "executed", execution: { kind: "committed" } });
expect(session.getCurrentSnapshot().state.counter.value).toBe(1);
expect(resolved.presentationProgram.textCatalogs.catalogs[0]?.entries).toContainEqual({
  textId: "text.sandbox.counter",
  text: "计数",
});
const counterAsset = resolved.assets.assets.find(
  (asset) => asset.assetId === "asset.sandbox.counter",
);
if (counterAsset === undefined) throw new Error("missing Sandbox counter asset");
expect(counterAsset.delivery).toBe("code_fallback");
```

- [ ] **Step 2: Run red**

Run: `pnpm --filter @project-tavern/story-sandbox exec vitest run src/walking-skeleton.test.ts`

Expected: FAIL because Sandbox entry/Profile/session do not exist.

- [ ] **Step 3: Implement the synthetic package without importing real Modules**

The Profile state is only `{ counter: { value: NonNegativeSafeInteger } }`; commands are increment, reject, and fault; Facts contain before/after; queries return count/parity; RNG has no draw for increment. The stateful owner alone proposes/applies counter state. The stateless parity service has `stateSlots=[]`, null owner fields, and typed `services`; it has no State Schema, initial slice, read port, or local invariant. The source Story uses `parsePositiveSafeInteger(1)` for `stateContractRevision`, exposes one typed counter PatchSurface, materializes the post-patch counter/presentation programs, and creates its Profile only from the immutable simulation program. `createBootstrapInput(entropy)` consumes one nonzero uint32 and no UUID because Sandbox has no run identity. The coordinator is the only commit/sequence owner.

Default entry exports only `sandboxStoryEntryV1: GamePackageV1`; `./development` exports only `sandboxDevelopmentEntryV1` with the fixed fixture and driver. Freeze the manifest targets as `{ ".": "./src/index.ts", "./development": "./src/development.ts" }`. Text IDs, asset IDs, and scene IDs use stable namespaces. Presentation has one complete `zh-CN` catalog and one fallback-only resolved asset entry; no remote URL or candidate art.

- [ ] **Step 4: Add read-only fixture/golden/balance scripts and explicit writers**

`verify-fixtures` decodes and validates the tracked sequence-0 fixture without writing. `regenerate-fixtures` writes canonical bytes only to that file. `verify-golden` reruns the fixed command vector and compares exact canonical result/digests without writing. `update-golden` writes only that reviewed path. `verify-balance` runs seeds 1 through 1000, asserts deterministic duplicate runs, and checks every final count equals the fixed command count; it is deliberately a mechanics property, not a gameplay balance claim.

Set these Sandbox package scripts before invoking them:

```json
{
  "test": "pnpm --dir ../.. exec vitest run stories/sandbox/src",
  "verify:fixtures": "node scripts/verify-fixtures.mts",
  "regenerate:fixtures": "node scripts/regenerate-fixtures.mts",
  "verify:golden": "node scripts/verify-golden.mts",
  "update:golden": "node scripts/update-golden.mts",
  "verify:balance": "node scripts/verify-balance.mts"
}
```

- [ ] **Step 5: Run and commit**

```bash
pnpm --filter @project-tavern/story-sandbox test
pnpm --filter @project-tavern/story-sandbox verify:fixtures
pnpm --filter @project-tavern/story-sandbox verify:golden
pnpm --filter @project-tavern/story-sandbox verify:balance
pnpm verify
git add -- stories/sandbox/src/contracts.ts stories/sandbox/src/profile.ts stories/sandbox/src/presentation.ts stories/sandbox/src/story-entry.ts stories/sandbox/src/development.ts stories/sandbox/src/session.ts stories/sandbox/src/walking-skeleton.test.ts stories/sandbox/src/story-contract.test.ts stories/sandbox/src/property.test.ts stories/sandbox/src/index.ts stories/sandbox/fixtures/session-zero.json stories/sandbox/golden/counter-walk.json stories/sandbox/scripts/verify-fixtures.mts stories/sandbox/scripts/regenerate-fixtures.mts stories/sandbox/scripts/verify-golden.mts stories/sandbox/scripts/update-golden.mts stories/sandbox/scripts/verify-balance.mts stories/sandbox/package.json
git diff --cached --check
git commit -m "feat(sandbox): add deterministic walking story"
```

Expected: Sandbox unit/contract/property, fixture, golden, and 1..1000 checks pass; tracked baselines change only through their explicit writer commands; the commit contains no Demo/E2E imports.

### Task 11: Build the generic UI shell and Web Loader/Host walking skeleton

**Files:**

- Create: `packages/ui/src/runtime/create-view-bridge.ts`
- Create: `packages/ui/src/runtime/create-view-bridge.test.tsx`
- Create: `packages/ui/src/contributions/registry.ts`
- Create: `packages/ui/src/contributions/registry.test.ts`
- Create: `packages/ui/src/shell/game-shell.tsx`
- Create: `packages/ui/src/shell/game-shell.module.css`
- Create: `packages/ui/src/shell/game-shell.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Create: `apps/web/src/host/create-web-host.ts`
- Create: `apps/web/src/host/create-web-host.test.ts`
- Create: `apps/web/src/application/mount-game-application.tsx`
- Create: `apps/web/src/application/mount-game-application.test.tsx`
- Create: `apps/web/src/loader/loader.tsx`
- Create: `apps/web/src/loader/loader.test.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/developer/development-panel.tsx`
- Create: `apps/web/src/developer/index.ts`
- Create: `apps/web/type-tests/developer-exports.test-d.ts`
- Modify: `apps/web/src/index.ts`
- Modify: `packages/ui/package.json`
- Modify: `apps/web/package.json`
- Create: `stories/sandbox/player.html`
- Create: `stories/sandbox/developer.html`
- Create: `stories/sandbox/src/application/create-sandbox-application.ts`
- Create: `stories/sandbox/src/application/create-sandbox-application.test.ts`
- Create: `stories/sandbox/src/application/player-entry.tsx`
- Create: `stories/sandbox/src/application/developer-entry.tsx`
- Create: `stories/sandbox/tsconfig.application.json`
- Modify: `stories/sandbox/package.json`
- Modify: `stories/sandbox/tsconfig.json`
- Modify: `tsconfig.json`

**Interfaces:**

- Consumes: Sandbox `GamePackage`, EngineSession, immutable ViewModel, Player ports, presentation read port, and `GameHostV1`.
- Produces: MIT generic Player-safe Web root, bootstrap/Hotfix controller returning exact generic `GameBootstrapResolutionResultV1<ResolvedStory,ResolvedIdentity>`, safe-mode/fatal UI, closed `@project-tavern/web/developer` panel subpath, and PolyForm Story-owned Player/Developer composition roots; Player serves `#/play`, Developer additionally exposes `#/playground`, and state changes only by typed command dispatch.

- [ ] **Step 1: Write RTL boundary tests**

Tests render a synthetic immutable port, assert the current count and localized label, click the 44×44 increment control, observe a single dispatch and updated projection, reject duplicate contribution IDs, and prove no component prop includes Snapshot/Session/owner/raw catalogs. The Sandbox application contract test also asserts all five `PlayerApplicationPortV1` members exist, lifecycle methods accept zero arguments, storage-backed persistence reports typed `unavailable`, and current-Snapshot export succeeds without the storage adapter.

The Web package type test imports Host/Loader/mount/bootstrap controller only from `@project-tavern/web`, imports `DevelopmentPanel` only from `@project-tavern/web/developer`, and keeps this negative assertion consumed. Loader RTL tests use a synthetic validated GamePackage: a Hotfix conflict renders the bounded failure code and rejected IDs, offers “禁用补丁并安全启动”, retries exactly the untouched base package, and never creates a Session from a failed candidate. A successful bootstrap writes only its resolved combination identity to the Host record store; a later failure displays that identity for diagnosis but never trusts it as resolved content.

```ts
// @ts-expect-error the Player-safe Web root never re-exports Developer UI
export { DevelopmentPanel } from "@project-tavern/web";
```

The bootstrap-controller suite freezes all three result branches:

```ts
expect(await bootstrap(invalidBaseEntryV1, [])).toMatchObject({
  kind: "fatal",
  code: "story.contract_invalid",
  rejectedHotfixIds: [],
});
expect(await bootstrap(validEntryV1, [conflictingHotfixV1])).toMatchObject({
  kind: "safe_mode",
  code: "hotfix.conflict",
  rejectedHotfixIds: [conflictingHotfixV1.manifest.identity.id],
});
const ready = await bootstrap(validEntryV1, []);
expect(ready.kind).toBe("ready");
if (ready.kind !== "ready") throw new Error("expected ready");
expect(ready.base).toBe(ready.resolved);
```

Every DOM/RTL file starts with `// @vitest-environment jsdom` and imports `@testing-library/jest-dom/vitest`, so this task's red/green commands do not depend on the central Vitest project config that arrives in Task 12.

```tsx
it("changes the rendered slice only through typed dispatch", async () => {
  const fixture = createShellFixtureV1();
  render(
    <GameShell
      view={fixture.player.view}
      playerPort={fixture.player}
      presentation={fixture.presentation}
      contributions={fixture.contributions}
    />,
  );

  expect(screen.getByText("计数：0")).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));
  expect(fixture.dispatchedCommands()).toEqual([
    { kind: "sandbox.counter.increment" },
  ]);
  expect(await screen.findByText("计数：1")).toBeVisible();
});
```

- [ ] **Step 2: Run red**

Run:

```bash
pnpm --filter @project-tavern/ui exec vitest run src/runtime src/contributions src/shell
pnpm --filter @project-tavern/web exec vitest run src/loader
pnpm --filter @project-tavern/story-sandbox exec vitest run src/application/create-sandbox-application.test.ts
pnpm typecheck
```

Expected: focused suites FAIL because the generic bridge/shell and Story-owned application composition are absent; typecheck also fails because `@project-tavern/web/developer` and its negative root-export contract are not implemented.

- [ ] **Step 3: Implement the minimal generic UI**

Use `useSyncExternalStore` over `ReadonlyViewSourceV1`; the bridge holds only the immutable current ViewModel reference and UI session state. The generic shell renders scene, one HUD slot, one workspace region, one narrative region, and system status. It contains no AP/cash/tavern copy and no Canvas/WebGL loop.

- [ ] **Step 4: Implement generic Web composition**

Web Host adapts both `BootstrapEntropyV1.nextNonZeroUint32()` with `crypto.getRandomValues()` and `nextUuidV4()` with `crypto.randomUUID()`, plus metadata clock/navigation/log/file shell and an in-memory Phase 1 atomic record store used only by tests; browser IndexedDB arrives in Phase 3. Test Host entropy returns explicit fixed sequences. Player Application lifecycle methods accept no parameters and create bootstrap input only when their FIFO operation reaches the head.

The Phase 1 Sandbox application still instantiates all five reviewed Player subports. Its storage adapter reports `available:false`; `save/load/clear/import` and physical-slot export return the Catalog's typed `unavailable` outcomes; lease status is `unavailable` with null owner/token. `exportCurrentSave` is the one real persistence path: it captures the accepted-time committed Sandbox Snapshot, current generated provenance, and Host metadata time, then returns Canonical `ExportedSaveV1` bytes without consulting storage. Diagnostics uses a Phase-1-specific typed unavailable result and is not rendered; Phase 3 replaces that specialization with Catalog `ExportedDebugBundleV1` rather than inventing a partial bundle.

`apps/web` root exports only the generic Host, Loader, `createGameBootstrapControllerV1`, and mount factory. The controller first resolves and validates the untouched base Story, then attempts the explicit authored-order Hotfix list. A base failure returns Catalog `fatal` with no runnable Story and an empty rejected-ID list. Success records only the resolved combination identity through the Host atomic record store. A candidate Hotfix conflict/provider/schema/install failure returns Catalog `safe_mode` containing the already validated untouched base in both `base` and `resolved`, the closed failure code, ordered rejected IDs, bounded details, and nullable last-success identity; the Loader can start that base only after explicit user action. Candidate success returns `ready`; with no Hotfixes its `base` and `resolved` are the same reference. It never retries a subset, bypasses Story/Save validation, or restores a cached object. Its closed `./developer` export points to `src/developer/index.ts`; neither entry has a Sandbox/Story dependency, and the root never re-exports the Developer panel. Freeze the manifest mapping as `{ ".": "./src/index.ts", "./developer": "./src/developer/index.ts" }`. The PolyForm Sandbox owns `player.html`/`developer.html` and the two application entries. Player entry imports only the Sandbox default entry plus the MIT Web root; Developer entry may additionally import the Story's `./development` and `@project-tavern/web/developer`. `stories/sandbox/tsconfig.json` continues to compile the DOM-free simulation/presentation data and excludes `src/application`; the new `tsconfig.application.json` enables DOM/JSX only for Story application roots and references the Sandbox, UI, and Web projects. Root `tsconfig.json` references both projects without allowing a simulation → application edge.

Vite mode selects the corresponding Story-owned HTML as the Application root, uses `base: "./"`, and keeps HashRouter-compatible routing. Loader owns loading/bootstrap/fatal surfaces but Sandbox owns active scene content. This dependency direction is PolyForm Story → MIT Web and never MIT Web → PolyForm Story.

Set these focused package scripts before invoking them:

```jsonc
// packages/ui/package.json
{ "scripts": { "test": "pnpm --dir ../.. exec vitest run packages/ui/src" } }

// apps/web/package.json
{ "scripts": { "test": "pnpm --dir ../.. exec vitest run apps/web/src" } }
```

- [ ] **Step 5: Run and commit**

```bash
pnpm --filter @project-tavern/ui test
pnpm --filter @project-tavern/web test
pnpm --filter @project-tavern/story-sandbox test
pnpm verify:boundaries
pnpm verify:cycles
pnpm typecheck
pnpm verify
git add -- packages/ui/src/runtime/create-view-bridge.ts packages/ui/src/runtime/create-view-bridge.test.tsx packages/ui/src/contributions/registry.ts packages/ui/src/contributions/registry.test.ts packages/ui/src/shell/game-shell.tsx packages/ui/src/shell/game-shell.module.css packages/ui/src/shell/game-shell.test.tsx packages/ui/src/index.ts packages/ui/package.json apps/web/src/host/create-web-host.ts apps/web/src/host/create-web-host.test.ts apps/web/src/application/mount-game-application.tsx apps/web/src/application/mount-game-application.test.tsx apps/web/src/loader/loader.tsx apps/web/src/loader/loader.test.tsx apps/web/src/styles.css apps/web/src/developer/development-panel.tsx apps/web/src/developer/index.ts apps/web/type-tests/developer-exports.test-d.ts apps/web/src/index.ts apps/web/package.json stories/sandbox/player.html stories/sandbox/developer.html stories/sandbox/src/application/create-sandbox-application.ts stories/sandbox/src/application/create-sandbox-application.test.ts stories/sandbox/src/application/player-entry.tsx stories/sandbox/src/application/developer-entry.tsx stories/sandbox/tsconfig.application.json stories/sandbox/package.json stories/sandbox/tsconfig.json tsconfig.json
git diff --cached --check
git commit -m "feat(web): add generic browser walking skeleton"
```

Expected: UI and Web tests pass; parameterless lifecycle consumes Host entropy only at FIFO head; Player has five narrow subports and no authoritative setter; boundary/cycle/type checks exit 0; the commit succeeds.

### Task 12: Freeze the generic test, verifier, and public-export surface

**Files:**

- Create: `vitest.config.ts`
- Create: `.oxlintrc.json`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `scripts/classify-vitest-project.mjs`
- Create: `scripts/classify-vitest-project.d.mts`
- Create: `scripts/classify-vitest-project.test.mjs`
- Create: `scripts/run-script-tests.mjs`
- Create: `scripts/run-script-tests.test.mjs`
- Create: `scripts/collect-import-closure.mjs`
- Create: `scripts/collect-import-closure.test.mjs`
- Create: `scripts/verify-stories.mjs`
- Create: `scripts/verify-stories.test.mjs`
- Create: `scripts/verify-fixtures.mjs`
- Create: `scripts/verify-fixtures.test.mjs`
- Create: `scripts/verify-golden.mjs`
- Create: `scripts/verify-golden.test.mjs`
- Create: `scripts/verify-assets.mjs`
- Create: `scripts/verify-assets.test.mjs`
- Create: `scripts/verify-public-exports.mjs`
- Create: `scripts/verify-public-exports.test.mjs`
- Create: `scripts/verify.mjs`
- Create: `scripts/verify.test.mjs`
- Create: `packages/base/public-exports.v1.json`
- Create: `packages/base/type-tests/phase1-consumer.test-d.ts`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: Tasks 1–11 workspace packages, explicit package barrels, legal policy, Sandbox fixtures/golden, and every non-browser Phase 1 command owner.
- Produces: future-proof disjoint workspace/script Vitest discovery, recursive Node/TypeScript script-test execution, an exact machine-checked Base public export inventory, repository-owned import-closure tooling under `scripts/`, the stable core verifier/test command surface, and a tracked-file-immutable current `pnpm verify` that Task 13 extends with build/browser evidence.

- [ ] **Step 1: Write failing classifier, export-inventory, closure, and orchestrator tests**

`classifyVitestProjectV1` accepts only POSIX workspace-source paths under `packages/**/src`, `stories/**/src`, or `apps/**/src`, plus exact `scripts/**/*.test.ts` paths. Workspace property naming wins first, then contract naming/path ownership, then ordinary unit; TypeScript script tests receive the separate `scripts` owner. Node/Playwright/type-declaration tests return `null`.

```js
assert.equal(classifyVitestProjectV1("packages/base/src/contracts/rng.property.test.ts"), "property");
assert.equal(classifyVitestProjectV1("stories/future/src/story-contract.test.ts"), "contract");
assert.equal(classifyVitestProjectV1("packages/base/src/testkit/new-helper.test.ts"), "contract");
assert.equal(classifyVitestProjectV1("apps/future/src/loader/new-loader.test.tsx"), "unit");
assert.equal(classifyVitestProjectV1("scripts/future/nested/check.test.ts"), "scripts");
assert.equal(classifyVitestProjectV1("scripts/future/nested/check.test.mjs"), null);
assert.equal(classifyVitestProjectV1("apps/web/e2e/player.spec.ts"), null);
assert.equal(classifyVitestProjectV1("packages/base/type-tests/public.test-d.ts"), null);
```

The recursive script runner has its own filesystem/spawn contract test. It creates nested `.test.mjs` and `.test.ts` fixtures plus near-miss files, then proves exact sorted ownership and one execution per owner without relying on shell glob expansion:

```js
test("discovers every nested script test exactly once", async (t) => {
  const root = await scriptTestFixture({
    "scripts/root.test.mjs": "node",
    "scripts/ui/nested.test.ts": "vitest",
    "scripts/release/deep/workflow.test.mjs": "node",
    "scripts/release/not-a-test.ts": "ignored",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.deepEqual(await discoverScriptTestsV1(root), {
    node: ["scripts/release/deep/workflow.test.mjs", "scripts/root.test.mjs"],
    vitest: ["scripts/ui/nested.test.ts"],
  });
  assert.deepEqual(await recordScriptTestExecutionsV1(root), [
    ["node", ["--test", "scripts/release/deep/workflow.test.mjs", "scripts/root.test.mjs"]],
    ["pnpm", ["exec", "vitest", "run", "--project", "scripts"]],
  ]);
});
```

Add missing/duplicate/list-drift cases: the runner fails if Vitest list output omits or duplicates a discovered TypeScript path, if one path is classified twice, or if a test is a symlink/outside `scripts/`. An empty TypeScript set skips only the Vitest child process; it never hides Node tests.

The public-export verifier rejects star barrels, missing/extra symbols, a wrong subpath target, and unsorted inventory entries:

```js
assert.deepEqual(await verifyPublicExportsV1(extraExportFixture), [
  "@project-tavern/base . has unlisted export: accidentalHelper",
]);
assert.deepEqual(await verifyPublicExportsV1(starExportFixture), [
  "@project-tavern/base ./runtime must use explicit named exports; export * is forbidden",
]);
```

Keep the repository collector in `scripts/`; it is an importable CLI module, not a Base/testkit export:

```js
test("rejects an arbitrary dynamic import in a managed closure", async (t) => {
  const root = await importClosureFixture('await import("./stories/" + id + ".js")');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert((await collectImportClosure(root, managedRoots))
    .some((error) => error.includes("dynamic import path is not static")));
});

test("keeps the Web developer subpath out of the Player closure", async () => {
  const playerPaths = await collectManagedPaths(repositoryRoot, [
    "stories/sandbox/src/application/player-entry.tsx",
  ]);
  const developerPaths = await collectManagedPaths(repositoryRoot, [
    "stories/sandbox/src/application/developer-entry.tsx",
  ]);
  assert(!playerPaths.some((path) => path.startsWith("apps/web/src/developer/")));
  assert(developerPaths.includes("apps/web/src/developer/index.ts"));
});
```

- [ ] **Step 2: Run red behavior tests**

Run:

```bash
node --test scripts/classify-vitest-project.test.mjs scripts/run-script-tests.test.mjs scripts/collect-import-closure.test.mjs scripts/verify-stories.test.mjs scripts/verify-fixtures.test.mjs scripts/verify-golden.test.mjs scripts/verify-assets.test.mjs scripts/verify-public-exports.test.mjs scripts/verify.test.mjs scripts/verify-licensing.test.mjs
pnpm typecheck
```

Expected: Node tests fail on missing classifier/collector/export/orchestrator behavior; typecheck fails because the final Phase 1 consumer contract and exact helper names are not yet present. Existing Task 1–11 focused tests remain runnable.

- [ ] **Step 3: Freeze the exact Phase 1 Base inventory and consumer names**

Create this versioned inventory. Arrays are lexicographically sorted; the verifier compares both package targets and the complete TypeScript symbol set, so neither missing nor accidental public exports pass.

```json
{
  "revision": 1,
  "package": "@project-tavern/base",
  "entrypoints": {
    ".": {
      "target": "./src/index.ts",
      "exports": [
        "AssetPackDigestProjectionV1",
        "BootstrapEntropyV1",
        "Brand",
        "BuildProvenanceV1",
        "CommandCoordinatorV1",
        "CommandExecutionAttemptEnvelopeV1",
        "CommandExecutionDiagnosticsEnvelopeV1",
        "CommandExecutionResultEnvelopeV1",
        "CommandLogEntryBaseV1",
        "CommandLogEntryEnvelopeV1",
        "DebugBundleEnvelopeV1",
        "DeepReadonly",
        "DeveloperApplicationPortV1",
        "Digest",
        "DigestDomainV1",
        "ExportedDebugBundleV1",
        "ExportedSaveV1",
        "GameBootstrapInputV1",
        "GameBootstrapResolutionResultV1",
        "GameHostV1",
        "GameModuleBindingV1",
        "GamePackageResolutionFailureCodeV1",
        "GamePackageResolutionFailureV1",
        "GamePackageResolutionResultV1",
        "GamePackageV1",
        "GameProfileTypeMapV1",
        "GameProfileV1",
        "GameSnapshotEnvelopeV1",
        "HostAtomicRecordStoreV1",
        "HostFilePortV1",
        "HostRecordMutationV1",
        "HostStoredRecordV1",
        "HotfixEntryV1",
        "IsoUtcInstant",
        "LeaseHandoffRequestId",
        "ModuleId",
        "ModuleOwnerProposalEnvelopeV1",
        "NonNegativeSafeInteger",
        "NonZeroUint32",
        "PatchSetAdoptionDeclarationV1",
        "PersistenceOperationResultV1",
        "PersistenceStatusV1",
        "PlayerApplicationPortV1",
        "PlayerCommandPortV1",
        "PlayerDiagnosticsPortV1",
        "PlayerPersistencePortV1",
        "PlayerWritableSaveSlotIdV1",
        "PositiveSafeInteger",
        "PresentationReadPortV1",
        "ReadonlyViewSourceV1",
        "ResolvedAssetManifestV1",
        "ResolvedAssetPresentationV1",
        "ResolvedPatchValuesV1",
        "ResolvedStoryV1",
        "ResolvedTextPresentationV1",
        "RngDrawTraceV1",
        "RngStateV1",
        "RuleRngV1",
        "RunId",
        "RuntimeFaultBaseV1",
        "RuntimeOperationFaultV1",
        "RuntimeSchemaV1",
        "RuntimeSessionStatusV1",
        "RuntimeViewModelEnvelopeV1",
        "SaveExportOperationResultV1",
        "SaveRecordEnvelopeV1",
        "SaveSlotHealthV1",
        "SaveSlotIdV1",
        "SaveSlotSummaryV1",
        "SessionAnchorResultV1",
        "SessionDispatchOperationResultV1",
        "SessionLeaseOperationResultV1",
        "SessionLeaseOwnerId",
        "SessionLeasePortV1",
        "SessionLeaseStatusV1",
        "SessionLifecyclePortV1",
        "StateSlotId",
        "StoryDevelopmentEntryV1",
        "StoryDevelopmentSupportV1",
        "StrictJsonLimitsInputV1",
        "StrictJsonLimitsV1",
        "StrictJsonObjectV1",
        "StrictJsonResultV1",
        "StrictJsonValueV1",
        "UiContributionSetV1",
        "UiRendererBindingV1",
        "canonicalJsonBytes",
        "createGameSnapshotEnvelopeSchemaV1",
        "createSaveRecordEnvelopeSchemaV1",
        "createTransactionalRngV1",
        "debugBundleJsonLimitsV1",
        "defineGameModule",
        "defineGamePackage",
        "defineGameProfile",
        "definePatchSlot",
        "definePresentationPatchSurface",
        "defineSimulationPatchSurface",
        "defineStoryDevelopmentEntry",
        "digestBytes",
        "digestCanonical",
        "parseDigest",
        "parseModuleId",
        "parseNonNegativeSafeInteger",
        "parseNonZeroUint32",
        "parsePositiveSafeInteger",
        "parseRunId",
        "parseStateSlotId",
        "parseStrictJson",
        "parseStrictJsonLimitsV1",
        "resolveGamePackageV1",
        "rngStateV1Schema",
        "saveJsonLimitsV1"
      ]
    },
    "./runtime": {
      "target": "./src/runtime/index.ts",
      "exports": [
        "AuthoritativeOutcomeV1",
        "EngineSessionRuntimeControlV1",
        "EngineSessionV1",
        "createEngineSessionV1"
      ]
    },
    "./testkit": {
      "target": "./src/testkit/index.ts",
      "exports": [
        "createFixedBootstrapEntropyV1",
        "createSyntheticCounterGamePackageV1",
        "resolveStoryForTestV1",
        "strictJsonRoundTripV1",
        "validateDevelopmentFixturesV1",
        "validateStoryV1"
      ]
    }
  }
}
```

Every Base barrel uses explicit named value/type exports. `verify-public-exports.mjs` uses the pinned TypeScript 7 compiler API to resolve aliases and compare exported symbol names to this inventory. It does not execute a package module.

The consumer test fixes the names used by all later plans:

```ts
import type {
  BootstrapEntropyV1,
  GameBootstrapInputV1,
  GameBootstrapResolutionResultV1,
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionFailureV1,
  GamePackageResolutionResultV1,
  GameProfileTypeMapV1,
  ModuleId,
  NonZeroUint32,
  PatchSetAdoptionDeclarationV1,
  PersistenceStatusV1,
  ResolvedAssetPresentationV1,
  ResolvedPatchValuesV1,
  ResolvedTextPresentationV1,
  RunId,
  RuntimeFaultBaseV1,
  RuntimeOperationFaultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
  StateSlotId,
  StoryDevelopmentEntryV1,
} from "@project-tavern/base";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  defineGameModule,
  defineGamePackage,
  defineGameProfile,
  defineStoryDevelopmentEntry,
  parseModuleId,
  parseNonZeroUint32,
  parseRunId,
  parseStateSlotId,
  resolveGamePackageV1,
  rngStateV1Schema,
} from "@project-tavern/base";
import { createEngineSessionV1 } from "@project-tavern/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createSyntheticCounterGamePackageV1,
  resolveStoryForTestV1,
  strictJsonRoundTripV1,
  validateDevelopmentFixturesV1,
  validateStoryV1,
} from "@project-tavern/base/testkit";

export type Phase1ConsumerTypesV1 = {
  readonly entropy: BootstrapEntropyV1;
  readonly bootstrap: GameBootstrapInputV1;
  readonly bootstrapResolution: GameBootstrapResolutionResultV1<unknown, unknown>;
  readonly packageResolution: GamePackageResolutionResultV1<unknown>;
  readonly packageResolutionFailure: GamePackageResolutionFailureV1;
  readonly packageResolutionFailureCode: GamePackageResolutionFailureCodeV1;
  readonly profile: GameProfileTypeMapV1<GameBootstrapInputV1, unknown, unknown>;
  readonly moduleId: ModuleId;
  readonly seed: NonZeroUint32;
  readonly adoption: PatchSetAdoptionDeclarationV1;
  readonly persistenceStatus: PersistenceStatusV1;
  readonly assetPresentation: ResolvedAssetPresentationV1<unknown, unknown, unknown>;
  readonly patchValues: ResolvedPatchValuesV1<unknown>;
  readonly textPresentation: ResolvedTextPresentationV1<unknown, unknown>;
  readonly runId: RunId;
  readonly runtimeFaultBase: RuntimeFaultBaseV1;
  readonly runtimeOperationFault: RuntimeOperationFaultV1;
  readonly saveSlotHealth: SaveSlotHealthV1;
  readonly saveSlotSummary: SaveSlotSummaryV1;
  readonly stateSlotId: StateSlotId;
  readonly development: StoryDevelopmentEntryV1<unknown>;
};

export type Phase1ConsumerValuesV1 = {
  readonly createEngineSession: typeof createEngineSessionV1;
  readonly createFixedBootstrapEntropy: typeof createFixedBootstrapEntropyV1;
  readonly createGameSnapshotEnvelopeSchema: typeof createGameSnapshotEnvelopeSchemaV1;
  readonly createSaveRecordEnvelopeSchema: typeof createSaveRecordEnvelopeSchemaV1;
  readonly createSyntheticCounterGamePackage: typeof createSyntheticCounterGamePackageV1;
  readonly createTransactionalRng: typeof createTransactionalRngV1;
  readonly defineGameModule: typeof defineGameModule;
  readonly defineGamePackage: typeof defineGamePackage;
  readonly defineGameProfile: typeof defineGameProfile;
  readonly defineStoryDevelopmentEntry: typeof defineStoryDevelopmentEntry;
  readonly parseModuleId: typeof parseModuleId;
  readonly parseNonZeroUint32: typeof parseNonZeroUint32;
  readonly parseRunId: typeof parseRunId;
  readonly parseStateSlotId: typeof parseStateSlotId;
  readonly resolveGamePackage: typeof resolveGamePackageV1;
  readonly resolveStoryForTest: typeof resolveStoryForTestV1;
  readonly rngStateSchema: typeof rngStateV1Schema;
  readonly strictJsonRoundTrip: typeof strictJsonRoundTripV1;
  readonly validateDevelopmentFixtures: typeof validateDevelopmentFixturesV1;
  readonly validateStory: typeof validateStoryV1;
};

// @ts-expect-error parsers do not carry a V1 suffix
export { parseModuleIdV1 } from "@project-tavern/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseNonZeroUint32V1 } from "@project-tavern/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseStateSlotIdV1 } from "@project-tavern/base";
// @ts-expect-error repository import closure belongs to scripts, never Base/testkit
export { buildImportClosureV1 } from "@project-tavern/base/testkit";
```

- [ ] **Step 4: Implement future-proof disjoint Vitest projects**

`scripts/classify-vitest-project.mjs` exports both the pure classifier and the shared readonly include/exclude patterns; its colocated `.d.mts` fixes `VitestProjectNameV1 = "unit" | "contract" | "property" | "scripts"` so strict TypeScript config imports do not gain an implicit-any JS module. `vitest.config.ts` imports those patterns and defines exactly four projects over all current and future workspace/source tests plus TypeScript script tests:

- `property`: basename matches `*property.test.ts(x)`;
- `contract`: non-property basename matches `*contract.test.ts(x)`, or path is under `packages/base/src/authoring/**` or `packages/base/src/testkit/**`;
- `unit`: every remaining workspace source `*.test.ts(x)`.
- `scripts`: exactly `scripts/**/*.test.ts`; it does not own `.test.mjs`, `*.test-d.ts`, or workspace source tests.

The classifier normalizes POSIX paths and rejects traversal. `scripts/verify.test.mjs` recursively discovers files from the filesystem, not only `git ls-files`; runs Vitest list mode for each project; and fails on zero-owner, multi-owner, missing-from-list, or duplicate-in-list paths. Adding a future package/Story/App or `scripts/**/*.test.ts` test therefore requires no config edit. `scripts/run-script-tests.mjs` independently discovers sorted recursive `scripts/**/*.test.mjs` and passes their exact paths to `node --test`; its full mode also cross-checks/runs the `scripts` Vitest project. Playwright `apps/**/e2e/**/*.spec.ts` and `*.test-d.ts` stay in their own runners.

`.oxlintrc.json` enables correctness/suspicious/import/React/TypeScript rules, type-aware analysis, and unused-disable reporting. Oxlint/Prettier ignore only dependency folders, ignored build/report output, generated declarations, and the reviewed binary screenshot path; source, tests, scripts, manifests, JSON fixtures, and Markdown plans remain checked. Formal diagnostics still come from separately pinned TypeScript 7 through `pnpm typecheck`.

- [ ] **Step 5: Implement the stable core command surface and read-only orchestrator**

Add these exact scripts now:

```json
{
  "format:check": "prettier --check .",
  "lint": "oxlint --type-aware --deny-warnings --react-plugin --import-plugin packages stories apps scripts",
  "build": "tsc -b --pretty false",
  "typecheck": "tsc -p tsconfig.check.json --noEmit --pretty false",
  "verify:toolchain": "node scripts/verify-toolchain.mjs",
  "verify:licensing": "node scripts/verify-licensing.mjs",
  "verify:boundaries": "node scripts/verify-boundaries.mjs",
  "verify:cycles": "node scripts/verify-cycles.mjs",
  "verify:public-exports": "node scripts/verify-public-exports.mjs",
  "verify:stories": "node scripts/verify-stories.mjs",
  "verify:fixtures": "node scripts/verify-fixtures.mjs",
  "verify:golden": "node scripts/verify-golden.mjs",
  "verify:balance": "pnpm --filter @project-tavern/story-sandbox verify:balance",
  "verify:assets": "node scripts/verify-assets.mjs",
  "verify:ui": "pnpm --filter @project-tavern/ui test",
  "test:unit": "vitest run --project unit",
  "test:contract": "vitest run --project contract",
  "test:property": "vitest run --project property",
  "test:node": "node scripts/run-script-tests.mjs --kind mjs",
  "test:scripts": "node scripts/run-script-tests.mjs",
  "test": "pnpm test:unit && pnpm test:contract && pnpm test:property",
  "regenerate:fixtures": "pnpm --filter @project-tavern/story-sandbox regenerate:fixtures",
  "update:golden": "pnpm --filter @project-tavern/story-sandbox update:golden",
  "verify": "node scripts/verify.mjs"
}
```

The collector resolves package exports and static ESM production dependencies from explicit Engine, Story simulation, Story presentation, and Application roots; records workspace-relative POSIX path, `digestBytes` SHA-256, and facet; sorts by path; and rejects dynamic arbitrary imports, workspace-external symlinks, `references/`, missing ownership, and forbidden cross-facet edges. Its CLI writes only ignored `dist/manifests/`; test consumers import its named module exports directly from `scripts/collect-import-closure.mjs`.

`verify:licensing` now validates project legal hashes/notices, every workspace manifest, MIT source closure, and project-owned Sandbox asset licenses. It deliberately does not inventory or scan package-manager dependencies or `vendor/**`. Task 13 adds built-artifact carriage for project legal files. The four colocated wrapper tests prove `verify:stories` validates Sandbox while Demo/E2E remain intentionally non-startable, and prove fixture/golden/asset checks delegate to real read-only Sandbox validators, propagate nonzero exits, and never invoke a writer.

`verify.mjs` snapshots `git ls-files -z` plus SHA-256 for every current tracked file, then runs format, lint, all core verification commands, recursive script tests, typecheck, unit/contract/property, and TypeScript build. It compares the same path/hash map in `finally`, reports changed tracked paths, and fails even after another command fails. It never invokes a baseline writer.

Use this exact ordered core list:

```js
const commands = [
  ["pnpm", ["format:check"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["verify:toolchain"]],
  ["pnpm", ["verify:licensing"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["verify:fixtures"]],
  ["pnpm", ["verify:golden"]],
  ["pnpm", ["verify:balance"]],
  ["pnpm", ["verify:assets"]],
  ["pnpm", ["verify:ui"]],
  ["pnpm", ["test:scripts"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test:unit"]],
  ["pnpm", ["test:contract"]],
  ["pnpm", ["test:property"]],
  ["pnpm", ["build"]],
];
```

- [ ] **Step 6: Run the core gate and commit**

```bash
node --test scripts/classify-vitest-project.test.mjs scripts/run-script-tests.test.mjs scripts/collect-import-closure.test.mjs scripts/verify-stories.test.mjs scripts/verify-fixtures.test.mjs scripts/verify-golden.test.mjs scripts/verify-assets.test.mjs scripts/verify-public-exports.test.mjs scripts/verify.test.mjs scripts/verify-licensing.test.mjs
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:scripts
pnpm test:unit
pnpm test:contract
pnpm test:property
pnpm verify:public-exports
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git add -- vitest.config.ts .oxlintrc.json .prettierrc.json .prettierignore scripts/classify-vitest-project.mjs scripts/classify-vitest-project.d.mts scripts/classify-vitest-project.test.mjs scripts/run-script-tests.mjs scripts/run-script-tests.test.mjs scripts/collect-import-closure.mjs scripts/collect-import-closure.test.mjs scripts/verify-stories.mjs scripts/verify-stories.test.mjs scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs scripts/verify-golden.mjs scripts/verify-golden.test.mjs scripts/verify-assets.mjs scripts/verify-assets.test.mjs scripts/verify-public-exports.mjs scripts/verify-public-exports.test.mjs scripts/verify.mjs scripts/verify.test.mjs packages/base/public-exports.v1.json packages/base/type-tests/phase1-consumer.test-d.ts scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs package.json
git diff --cached --check
git diff --cached --stat
git commit -m "test: freeze core verification and public exports"
```

Expected: every classifier/verifier/type/core command exits 0; all current and synthetic-future Vitest paths have exactly one owner; public symbols and entry targets exactly match the inventory; the external hash comparison proves `pnpm verify` changed no tracked byte; the staged diff contains only Task 12 files; commit succeeds.

### Task 13: Add separate browser builds, artifact checks, and the final Phase 1 gate

**Files:**

- Create: `playwright.config.ts`
- Create: `vite.config.ts`
- Create: `apps/web/e2e/walking-skeleton.spec.ts`
- Create: `apps/web/e2e/__screenshots__/sandbox-shell.png`
- Create: `scripts/verify-bundle.mjs`
- Create: `scripts/verify-bundle.test.mjs`
- Create: `scripts/verify-artifact.mjs`
- Create: `scripts/verify-artifact.test.mjs`
- Create: `scripts/verify-release.mjs`
- Create: `scripts/verify-release.test.mjs`
- Create: `scripts/prepare-artifact.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: Task 12's green core gate, repository import-closure module, exact public exports, Story-owned Sandbox Player/Developer HTML roots, Web closed Developer subpath, and legal/build policy.
- Produces: `build:player` and `build:developer` from separate Story-owned roots, Chromium smoke, Chromium/WebKit full, Player/Developer bundle isolation, artifact/base-path/local-serving checks, clean double-build reproduction, project legal-file carriage, and the final tracked-file-immutable Phase 1 `pnpm verify`.

- [ ] **Step 1: Write verifier and browser red tests**

Browser smoke loads `#/play`, sees the localized counter, dispatches increment, and observes count 1. Full adds keyboard activation, reload bootstrap, Developer `#/playground`, Player route rejection for playground, and the stable shell screenshot in Chromium and WebKit.

Bundle tests feed synthetic manifests containing `apps/web/src/developer/development-panel.tsx`, `@project-tavern/base/testkit`, `/references/`, `/art-source/aigc/`, a source map, and an absolute path, then assert Player verification rejects each. Artifact tests reject a non-relative base, an unsorted manifest, a wrong raw-file `digestBytes`, a missing project legal file, and a nested-route local-serving failure. Release tests compare two fixture manifests with reordered paths and one changed byte. Licensing tests remain repository-scoped: they verify project legal hashes/notices, workspace package license metadata, and the tracked `references/` boundary without scanning images, dependencies, `vendor/**`, or built Player bytes.

```js
test("rejects every Developer-only path from a Player manifest", async () => {
  const errors = await verifyPlayerBundleFixtureV1({
    paths: [
      "apps/web/src/developer/development-panel.tsx",
      "stories/sandbox/src/development.ts",
      "packages/base/src/testkit/index.ts",
    ],
  });
  assert.deepEqual(errors, [
    "Player closure reached Developer path: apps/web/src/developer/development-panel.tsx",
    "Player closure reached Story development path: stories/sandbox/src/development.ts",
    "Player closure reached Base testkit: packages/base/src/testkit/index.ts",
  ]);
});
```

```ts
test("@smoke Player dispatches the Sandbox command", async ({ page }) => {
  await page.goto("/#/play");
  await page.getByRole("button", { name: "增加计数" }).click();
  await expect(page.getByText("计数：1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Playground" })).toHaveCount(0);
});
```

- [ ] **Step 2: Run red**

Run:

```bash
pnpm exec playwright install chromium
node --test scripts/verify-bundle.test.mjs scripts/verify-artifact.test.mjs scripts/verify-release.test.mjs scripts/verify-licensing.test.mjs scripts/verify.test.mjs
pnpm exec playwright test apps/web/e2e/walking-skeleton.spec.ts --project=chromium --grep @smoke
```

Expected: build/artifact/release/final-orchestrator behavior tests fail on missing implementations; browser smoke fails because Vite/Playwright entrypoints are absent, not because Chromium is uninstalled; Task 12 core verification remains green.

- [ ] **Step 3: Define the two closed Story-owned browser builds**

`vite.config.ts` maps `mode=player` to `stories/sandbox/player.html` with `outDir=dist/player` and `mode=developer` to `stories/sandbox/developer.html` with `outDir=dist/developer`; each build empties only its own output and uses `base:"./"`. It selects only closed Story-owned roots and creates no Web-to-Story alias. Player closure must not reach `stories/sandbox/src/application/developer-entry.tsx`, `stories/sandbox/src/development.ts`, `@project-tavern/web/developer`, or `apps/web/src/developer/**`; Developer closure must reach the selected Story and Web Developer entries.

`playwright.config.ts` starts separate local Player and Developer servers on fixed nonconflicting ports. `@smoke` targets Player only. Full Chromium/WebKit exercises Player on both engines and the Developer-only route against the Developer server, while proving the Player server rejects that route. No runtime query parameter or dynamic Story import changes flavor.

- [ ] **Step 4: Add build, browser, artifact, and release commands**

Extend the Task 12 scripts with exactly these additions:

```json
{
  "verify:bundle": "node scripts/verify-bundle.mjs",
  "verify:artifact": "node scripts/verify-artifact.mjs",
  "verify:release": "node scripts/verify-release.mjs",
  "test:e2e:smoke": "playwright test --project=chromium --grep @smoke",
  "test:e2e:full": "playwright test --project=chromium --project=webkit",
  "build:player": "vite build --mode player",
  "build:developer": "vite build --mode developer",
  "update:screenshots": "playwright test --project=chromium --grep @visual --update-snapshots",
  "release:prepare": "pnpm build:player && node scripts/prepare-artifact.mjs"
}
```

`verify:bundle` calls the Task 12 collector for both roots and checks Player excludes Developer/development/testkit/references/AIGC-source paths/source maps/absolute paths while Developer contains explicit Story/Web Developer markers. `verify:artifact` builds Player in a temporary root, verifies `base:"./"`, a path-sorted manifest whose file hashes are exactly `digestBytes(fileBytes)`, required project legal files, and nested-path local serving. `verify:release` runs collector plus Player build twice from clean temporary roots and compares Canonical root manifests and sorted emitted-file hashes. `verify:licensing` remains repository-scoped and does not build or inspect Player. No verifier writes a tracked baseline.

- [ ] **Step 5: Extend the tracked-file-immutable orchestrator**

Retain Task 12's snapshot/finally logic and append exactly `build:player`, `build:developer`, `verify:bundle`, `verify:artifact`, and `test:e2e:smoke` in that order. Keep every core classifier/public-export/test command. It excludes all side-effecting commands, full WebKit E2E, and double-build release verification from the normal gate; `verify:release` and `test:e2e:full` remain explicit mandatory Phase 1/release acceptance commands. `scripts/verify.test.mjs` asserts the final list has no duplicate command, no baseline writer, all Task 12 core owners, and all five new build/browser owners.

- [ ] **Step 6: Install browsers, create the reviewed screenshot explicitly, then run green**

```bash
pnpm exec playwright install webkit
pnpm update:screenshots
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:scripts
pnpm test:unit
pnpm test:contract
pnpm test:property
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
```

Create `sandbox-shell.png.license.json` beside the generated screenshot with strict fields `{ schemaRevision: 1, file: "sandbox-shell.png", copyright: "Copyright © 2026 Jun Jiang (jasl)", license: "MIT", origin: "project-playwright-code-native-sandbox" }`. This synthetic, game-neutral Engine test image is deliberately covered by MIT through its file-level sidecar; it contains no Story narrative, game-specific artwork, third-party material, or runtime image input. The licensing verifier checks the sidecar points to exactly one sibling binary, the sibling has exactly one sidecar, and the license is admitted for that path.

Expected: all commands exit 0; Player and Developer outputs are separate; screenshot update changes only the declared image while its reviewed filename-level sidecar remains valid; full Chromium/WebKit and clean double-build checks pass; the external hash comparison proves final `pnpm verify` changes no tracked byte.

- [ ] **Step 7: Commit browser, artifact, and final-gate work**

```bash
git add -- playwright.config.ts vite.config.ts apps/web/e2e/walking-skeleton.spec.ts apps/web/e2e/__screenshots__/sandbox-shell.png apps/web/e2e/__screenshots__/sandbox-shell.png.license.json scripts/verify-bundle.mjs scripts/verify-bundle.test.mjs scripts/verify-artifact.mjs scripts/verify-artifact.test.mjs scripts/verify-release.mjs scripts/verify-release.test.mjs scripts/prepare-artifact.mjs scripts/verify.mjs scripts/verify.test.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs package.json
git diff --cached --check
git diff --cached --stat
git commit -m "test: verify browser builds and release artifacts"
```

---

## Phase 1 Acceptance

Run from the exact Phase 1 head after reviewing every task commit:

```bash
test ! -e src
test ! -e apps/electron
test ! -e stories/common
test -z "$(git ls-files references)"
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm verify:toolchain
pnpm verify:licensing
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:public-exports
pnpm verify:stories
pnpm verify:fixtures
pnpm verify:golden
pnpm verify:balance
pnpm verify:assets
pnpm verify:ui
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:scripts
pnpm test:unit
pnpm test:contract
pnpm test:property
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

Expected:

- Node prints `v24.18.0`; pnpm prints `11.11.0`; frozen install succeeds without unapproved lifecycle scripts.
- Every named command performs its documented Phase 1 check and exits 0; none is an empty success shim.
- Every workspace source `*.test.ts(x)` is discovered exactly once by the stable unit/contract/property classifier, every recursive `scripts/**/*.test.ts`/`scripts/**/*.test.mjs` path is discovered and executed exactly once by its dedicated owner, and Playwright/type-only tests stay in their own runners.
- Base `.`, `./runtime`, and `./testkit` targets and symbols exactly match `public-exports.v1.json`; consumer typecheck uses `parseModuleId`, `parseStateSlotId`, `parseNonZeroUint32`, `parseRunId`, `createGameSnapshotEnvelopeSchemaV1`, `rngStateV1Schema`, `createSaveRecordEnvelopeSchemaV1`, `createTransactionalRngV1`, `createFixedBootstrapEntropyV1`, `resolveStoryForTestV1`, and `defineStoryDevelopmentEntry`, with no suffixed parser alias or Base/testkit import-closure helper.
- Base unit/contract/property suites import only Base and neutral testkit code; `rg -n "tavern|relationship|heroine|story\.demo" packages/base` finds no production match.
- The fixed PRNG vector ends with cursor `0x4e7b7f2e` and `rawDrawCount=14`.
- Reject/fault preserve the exact input Snapshot/RNG/sequence; the coordinator is called once per executed command; a queued command behind a fault resolves `not_executed/fault_paused` and is never executed.
- Sandbox default and `./development` graphs are separate; Player-safe `@project-tavern/web` cannot reach `@project-tavern/web/developer`; Player excludes development/testkit/references/source maps/absolute paths while the Developer root positively reaches the closed Web Developer entry.
- Player `#/play` displays the Sandbox scene and count changes from 0 to 1 only after the typed increment command. Player cannot open the Developer route.
- Sandbox fixture/golden verification is read-only; the 1..1000 property run is deterministic; asset verification proves a complete fallback-only manifest.
- Chromium and WebKit full walking-skeleton tests pass; both static build flavors pass their graph checks; two clean Player builds have identical sorted artifact hashes.
- `pnpm verify` leaves all tracked hashes exactly equal to the pre-run snapshot.
- Final `git status --short --branch` is clean on the intended branch. If pre-existing user changes were deliberately retained during execution, report them separately and prove their hashes were unchanged.

Do not begin Phase 2 if any public Base export differs from its inventory or lacks a contract test, any Vitest path has zero/multiple owners, the stable script surface contains a no-op, Player reaches Developer/testkit bytes, or `pnpm verify` mutates a tracked file.
