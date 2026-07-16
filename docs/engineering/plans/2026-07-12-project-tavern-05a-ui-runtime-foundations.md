# Project Tavern Phase 5A UI Runtime Foundations Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Build the neutral Web UI runtime foundations that consume one atomic `SemanticPublicationV1`, demand-load only the exact `AssetId` values selected for the current presentation, route browser input without leaking it into Gameplay, and present a responsive seven-layer Stage with accessible Overlay, VN, persistence, and recovery surfaces.

**Architecture:** `@sillymaker/ui` owns renderer contribution contracts, the atomic Semantic publication bridge, exact-ID `AssetRegistry`, the independent `GameSymbol` registry, input contexts, semantic DOM primitives, the fixed Stage stack, and generic blocking/recovery surfaces. `engine/packages/web` owns only browser adapters such as image decoding and Pointer lifecycle; Story-specific Runtime Presentation projection, StageScene/Character/HitMap behavior, application roots, DevDock, and Automation remain in Phases 5B/5C. Every renderer receives immutable view data and narrow ports, and no UI object can read or mutate `GameSnapshot`.

**Tech Stack:** Node.js >=22.12.0, pnpm >=11.0.0, strict TypeScript 7.0.2, React 19.2.7, React DOM 19.2.7, Radix Dialog 1.1.19, Lucide React 1.24.0, CSS Modules, Stylelint 17.14.0 with stylelint-config-standard 40.0.0, Vitest 4.1.10, React Testing Library 16.3.2, and user-event 14.6.1.

## Global Constraints

- Phase 2A–4B and their acceptance commands must pass from the live phase base SHA before this plan starts; use the live post-Phase-4B paths and public exports.
- The roadmap `R1` materialization checkpoint is a hard prerequisite. `pnpm prepare:goal` is the only networked/side-effecting dependency preparation step and runs before the engineering Goal; every Phase 5A task starts by passing read-only `pnpm verify:materialization`. The tracked contract is `scripts/preflight/materialization-lock.json`, the ignored local attestation is `.project-tavern/goal-materialization.json`, and missing/stale evidence fails before task changes with `external_precondition.materialization_stale`.
- All exact Phase 5A npm dependencies, lockfile packages, pnpm store objects, and Playwright browser revisions are already pinned and materialized by R1. This plan never chooses a version, runs `pnpm add`, contacts a registry, downloads a browser, or repairs materialization in place; when a task needs to refresh workspace links it may run only `pnpm install --offline --frozen-lockfile` after the materialization check.
- `docs/engineering/specs/2026-07-12-game-runtime-design.md` and `docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md` are authoritative. The only current boundaries are atomic `SemanticPublicationV1`, exact-ID asset demand, one `GameApplicationPort`, and Story-owned Gameplay availability; no alternate view shape, coarse asset load group API, build flavor split or UI-owned Gameplay gate is allowed.
- Current Story roots remain exactly `game/stories/poc` and `game/stories/e2e`. Phase 5A does not create a Story Web root or create/modify a PoC-specific character, StageScene renderer, HitMap, interaction behavior, content-maturity preference, DevDock, Cheat UI, Automation Bridge, or browser test facade. It may adapt the existing neutral Phase-2 E2E root only to keep each generic UI contract migration independently buildable.
- `engine/packages/ui/**` and game-neutral `engine/packages/web/**` remain MIT and contain no PoC/E2E identifiers or semantics. The runtime asset verifier may enumerate the closed Story entries only to inspect their resolved manifests; it must not import Story presentation renderers or content into UI/Web.
- `SemanticPublicationV1` is the only atomic semantic snapshot exposed to the UI bridge. Its `game`, `narrative`, and `actions` values come from the same Queries, authoritative token, and semantic revision; `availableActions()` is never called to create a second action catalog for rendering.
- UI may retain local focus, open Overlay, VN reveal, hover, pointer capture, and animation progress. None enters Gameplay State, Snapshot, Save, CommandLog, Replay comparison, semantic revision, or any game identity.
- Asset demand is an ordered, first-occurrence-unique list of exact `AssetId` values selected by the current presentation. `AssetRegistry.preload` has no `bootstrap | scene | overlay` overload and never loads a manifest group merely because one member is visible.
- A filtered or unselected asset is not fetched, decoded, or diagnosed. One final URL plus exact SHA-256 is fetched/decoded at most once per registry lifetime; a failed item falls back independently without rejecting other demanded items.
- Input is a UI/Host facility. The closed normal precedence is `System > Overlay > Narrative > Interaction > Gameplay`; a registered Debug context is reserved for Phase 5C and consumes only while active. Web owns Pointer lifecycle, viewport CSS points, cancel, and focus-loss; Stage/renderer geometry and normalized local coordinates remain Phase 5B responsibilities.
- Native `<button>`, form, link, and focus behavior remains authoritative for semantic controls. The Pointer Adapter handles only the registered Stage surface and must not synthesize or duplicate a native click/keyboard activation.
- Stage layers are fixed in this order: `background`, `character`, `scene_interaction`, `hud`, `workspace_overlay`, `narrative`, `system`. All seven hosts remain mounted; an inactive host renders an empty layer rather than changing z-order.
- The Stage design basis is 1600×1000 CSS px, maximum width is 1600 CSS px, and the authored Stage never exceeds 16:10. It remains usable at 1024×768 landscape and 768×1024 portrait; larger ultrawide viewports center the capped Stage with noninteractive fill.
- Interactive targets are at least 44×44 CSS px, information is not hover-only, visible focus is mandatory, closing a blocking surface returns focus, and reduced motion removes nonessential transitions.
- Runtime controls, labels, focus indicators, and system symbols are semantic DOM/code-native. `art-source/aigc/**` and `references/**` are never enumerated, read, imported, hashed, bundled, or used as fallback inputs.
- Lucide is limited to system/application controls. Stamina, mood, cash, reputation, ingredients, relationships and other world semantics use the separate Story-supplied `GameSymbol` registry with a code-native fallback; UI defines only the neutral contract and no project symbol ID.
- Material selection/generation, subjective art approval, VoiceOver/device review, human playtesting, CI, and remote distribution are outside this local engineering plan. Approved runtime assets may be consumed through their manifest; every absent/unapproved slot must remain fully operable through the registered code-native/static fallback.
- Every task follows TDD, runs its focused suite, the current `pnpm verify:ui`, and the current full `pnpm verify`, reviews the exact staged file list, and creates one focused commit. Local verification never rewrites tracked assets, fixtures, screenshots, or goldens.
- At every task boundary record phase-base SHA, current HEAD, last completed task commit, and `git status --short`. A matching existing task commit is reverified and skipped; a dirty task resumes only when every changed/untracked path is inside that task's `Files` allowlist. Preserve all other user changes and never restart an already accepted task merely because the Goal/session resumed.
- An expected-red step is valid only when the named focused test/assertion fails for the documented missing API or stable diagnostic. Registry, host-browser availability, port, permission, unrelated compile, or stale-materialization failures are never accepted as red evidence. Before each commit inspect tracked and untracked paths, stage only the task allowlist with explicit `git add -- ...`, verify `git diff --cached --name-only` and `git diff --cached --check`, and report any remaining worktree changes.

---

## File Map

```text
engine/packages/ui/src/assets/                 # exact-AssetId registry, read port, generic code fallback
engine/packages/ui/src/runtime/                # atomic SemanticPublication external-store bridge
engine/packages/ui/src/contributions/          # seven neutral renderer namespaces
engine/packages/ui/src/symbols/                # Story-supplied world-semantic GameSymbol registry
engine/packages/ui/src/input/                  # device-independent input events, contexts, router
engine/packages/ui/src/theme/                  # tokens, focus, reduced-motion and responsive rules
engine/packages/ui/src/primitives/             # semantic buttons, icon buttons and meters
engine/packages/ui/src/shell/                  # GameShell, fixed seven-layer Stage and top HUD slots
engine/packages/ui/src/overlays/               # one primary workspace overlay plus bounded details
engine/packages/ui/src/narrative/              # blocking VN layer and Narrative input context
engine/packages/ui/src/system/                 # highest-priority dialogs
engine/packages/ui/src/persistence/            # four-slot Save/Load/Import/Export surface
engine/packages/ui/src/errors/                 # root error boundary and runtime-failure recovery
engine/packages/ui/src/diagnostics/            # always-reachable player-safe DebugBundle export
engine/packages/web/src/assets/                    # browser URL resolution and image decode adapter
engine/packages/web/src/input/                     # Pointer Events, viewport point, cancel and focus-loss
game/stories/e2e/src/application/            # existing Phase-2 root compatibility at task checkpoints
game/stories/e2e/src/presentation/           # existing neutral renderer namespace migration only
scripts/assets/                         # exact runtime path/bytes/hash/dimension validation
scripts/ui/                             # read-only Phase 5A UI verification orchestrator
```

## Task 1: Implement exact-AssetId AssetRegistry and PresentationReadPort

**Files:**

- Create: `engine/packages/ui/src/assets/asset-registry.ts`
- Create: `engine/packages/ui/src/assets/asset-registry.test.ts`
- Create: `engine/packages/ui/src/assets/code-native-asset-fallback.tsx`
- Create: `engine/packages/ui/src/assets/code-native-asset-fallback.test.tsx`
- Create: `engine/packages/ui/src/assets/presentation-read-port.ts`
- Create: `engine/packages/ui/src/assets/presentation-read-port.test.ts`
- Create: `engine/packages/ui/src/assets/use-presentation-asset.ts`
- Create: `engine/packages/ui/src/assets/use-presentation-asset.test.tsx`
- Create: `engine/packages/ui/src/assets/index.ts`
- Create: `engine/packages/ui/type-tests/assets-public.test-d.ts`
- Modify: `engine/packages/ui/package.json`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/web/src/assets/create-browser-image-loader.ts`
- Create: `engine/packages/web/src/assets/create-browser-image-loader.test.ts`
- Create: `engine/packages/web/src/assets/index.ts`
- Modify: `engine/packages/web/src/index.ts`

**Interfaces:**

- Consumes: Base `ResolvedAssetManifestV1` and `ResolvedAssetPresentationV1`, resolved text catalogs, exact current locale, and a bounded Runtime/Application diagnostic sink.
- Produces: public `@sillymaker/ui/assets`, `createAssetRegistryV1`, `AssetRegistryV1`, cached `AssetRegistryPublicationV1`, `createPresentationReadPortV1`, `usePresentationAssetV1`, `CodeNativeAssetFallbackV1`, and Web-owned `createBrowserImageLoaderV1`.

- [ ] **Step 1: Write failing exact-demand, deduplication, fallback, and locale tests**

```ts
it("loads only the exact demanded AssetIds in first-occurrence order", async () => {
  const loader = createFakeRuntimeAssetLoaderV1({
    "assets/current.png#sha256:current": { kind: "loaded", url: "/assets/current.png" },
  });
  const registry = createAssetRegistryV1(
    runtimeManifestWithCurrentAndFiltered,
    loader,
    diagnostics,
  );

  await expect(
    registry.preload(
      [assetId("asset.e2e.current"), assetId("asset.e2e.current")],
      neverAbortedSignal,
    ),
  ).resolves.toEqual([{ assetId: assetId("asset.e2e.current"), status: "loaded" }]);
  expect(loader.calls).toEqual(["assets/current.png#sha256:current"]);
  expect(loader.calls.join("\n")).not.toContain("filtered");
});

it("deduplicates one final URL and digest while returning every demanded AssetId", async () => {
  const loader = createFakeRuntimeAssetLoaderV1({
    "assets/shared.webp#sha256:shared": { kind: "loaded", url: "/assets/shared.webp" },
  });
  const registry = createAssetRegistryV1(sharedProviderManifest, loader, diagnostics);

  await expect(
    registry.preload(
      [assetId("asset.e2e.scene-a"), assetId("asset.e2e.scene-b")],
      neverAbortedSignal,
    ),
  ).resolves.toEqual([
    { assetId: assetId("asset.e2e.scene-a"), status: "loaded" },
    { assetId: assetId("asset.e2e.scene-b"), status: "loaded" },
  ]);
  expect(loader.calls).toEqual(["assets/shared.webp#sha256:shared"]);
});

it("falls back per AssetId and does not reject the remaining demand", async () => {
  const registry = createAssetRegistryV1(twoAssetManifest, failingFirstLoader, diagnostics);
  await expect(
    registry.preload(
      [assetId("asset.e2e.failed"), assetId("asset.e2e.loaded")],
      neverAbortedSignal,
    ),
  ).resolves.toEqual([
    {
      assetId: assetId("asset.e2e.failed"),
      status: "fallback",
      faultCode: "asset.decode_failed",
    },
    { assetId: assetId("asset.e2e.loaded"), status: "loaded" },
  ]);
  expect(registry.resolve(assetId("asset.e2e.failed"), "scene_background").delivery).toBe(
    "code_fallback",
  );
});

it("resolves locale fallback without exposing source catalogs", () => {
  const port = createPresentationReadPortV1({
    catalogs: resolvedCatalogFixture,
    locale: localeId("zh-Hant"),
    assets: fallbackOnlyRegistry,
  });
  expect(port.text(textId("ui.save"))).toEqual({
    textId: textId("ui.save"),
    requestedLocale: localeId("zh-Hant"),
    resolvedLocale: localeId("zh-CN"),
    text: "保存",
  });
  expect(port).not.toHaveProperty("catalogs");
});

it("publishes readiness after a shared load and rerenders the asset hook", async () => {
  const fixture = createDeferredPresentationAssetFixtureV1();
  render(<PresentationAssetHookHarnessV1 fixture={fixture} />);
  expect(screen.getByTestId("asset-result")).toHaveAttribute("data-delivery", "code_fallback");
  const before = fixture.presentation.observeAssets();
  const preload = fixture.registry.preload([fixture.assetId], neverAbortedSignal);
  fixture.loader.resolve({ kind: "loaded", url: "/assets/ready.webp" });
  await preload;
  expect(fixture.presentation.observeAssets().revision).toBe(before.revision + 1);
  expect(screen.getByTestId("asset-result")).toHaveAttribute("data-delivery", "runtime_image");
  expect(screen.getByTestId("asset-result")).toHaveAttribute("data-url", "/assets/ready.webp");
});
```

Add tests for an already-aborted signal, abort during one shared load, one diagnostic per `(finalUrl, digest, faultCode, loadCycle)`, usage mismatch, unknown `AssetId`, a runtime image resolving to fallback before successful preload, and `CodeNativeAssetFallbackV1` exposing the supplied accessible name without a transparent interactive element.

- [ ] **Step 2: Run the focused asset tests and confirm the API is absent**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/assets
pnpm --filter @sillymaker/web exec vitest run src/assets
```

Expected: FAIL because the exact-demand registry, read-port adapter, and browser loader do not exist.

- [ ] **Step 3: Implement the exact-demand registry contract**

```ts
export type AssetLoadFaultCodeV1 =
  "asset.fetch_failed" | "asset.decode_failed" | "asset.usage_mismatch";

export type AssetLoadResultV1<TAssetId> =
  | { readonly assetId: TAssetId; readonly status: "loaded" }
  | {
      readonly assetId: TAssetId;
      readonly status: "fallback";
      readonly faultCode: AssetLoadFaultCodeV1 | null;
    }
  | { readonly assetId: TAssetId; readonly status: "aborted" };

export interface RuntimeAssetLoadRequestV1 {
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly sha256: Digest;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
}

export interface RuntimeAssetLoaderV1 {
  cacheKey(request: DeepReadonly<RuntimeAssetLoadRequestV1>): string;
  load(
    request: DeepReadonly<RuntimeAssetLoadRequestV1>,
    signal: AbortSignal,
  ): Promise<
    | { readonly kind: "loaded"; readonly url: string }
    | { readonly kind: "failed"; readonly code: "fetch_failed" | "decode_failed" }
    | { readonly kind: "aborted" }
  >;
  dispose(): void;
}

export interface AssetRegistryV1<TAssetId, TAssetUsage, TFallbackToken> {
  observe(): DeepReadonly<AssetRegistryPublicationV1>;
  subscribe(listener: () => void): () => void;
  preload(
    assetIds: readonly TAssetId[],
    signal: AbortSignal,
  ): Promise<readonly AssetLoadResultV1<TAssetId>[]>;
  resolve(
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
  dispose(): void;
}

export interface AssetRegistryPublicationV1 {
  readonly revision: NonNegativeSafeInteger;
}
```

At construction, index the frozen manifest without changing authored order and reject duplicate resolved IDs with `asset.registry_duplicate_id`. `preload` removes duplicate requested IDs by first occurrence, rejects an unknown ID with `asset.registry_unknown_id` before starting I/O, and has no load-group parameter or overload. A `code_fallback` entry returns `fallback` with `faultCode: null`; an unloaded runtime image resolves to its validated fallback token until the exact demand succeeds.

Cache one Promise by `loader.cacheKey(request)`, which the Web adapter must return as `finalUrl + "#" + sha256`, for the registry lifetime. Each cache entry uses a registry-owned AbortController, never the first caller's signal; concurrent `preload` callers can stop awaiting independently without cancelling the shared fetch/decode needed by another caller. Map a shared result back to every demanded ID, preserve demand order, turn fetch/decode failure into the matching stable fault code, and never reject the aggregate for an individual provider failure. A caller AbortSignal converts only that call's unfinished items to `aborted`; it does not erase or poison the shared cache.

The registry owns one cached immutable `AssetRegistryPublicationV1`, initially revision `0`. When a shared load settles, commit the resulting state for every affected AssetId first, swap one new publication with revision +1, then notify isolated subscribers once; caller cancellation does not suppress this shared readiness publication. Already-settled/code-fallback resolution creates no new revision, and `resolve()` never publishes. `observe()` returns the exact cached reference required by `useSyncExternalStore`; subscriber/failure-sink exceptions cannot roll back the committed cache. `dispose()` is the only operation that aborts registry-owned work, unsubscribes all listeners, calls `loader.dispose()` once, and makes later preload calls fail with `asset.registry_disposed`.

- [ ] **Step 4: Implement the Web loader, read port, and code-native fallback**

```ts
export interface BrowserImageLoaderEnvironmentV1 {
  resolveRuntimeUrl(runtimePath: string): string;
  createImage(): HTMLImageElement;
}

export function createBrowserImageLoaderV1(
  environment: BrowserImageLoaderEnvironmentV1,
): RuntimeAssetLoaderV1;

export interface CodeNativeAssetFallbackPropsV1<TFallbackToken, TAssetUsage> {
  readonly fallbackToken: TFallbackToken;
  readonly usage: TAssetUsage;
  readonly accessibleName: string;
  readonly decorative?: boolean;
}
```

The browser loader resolves only the manifest path supplied by the registry. `cacheKey()` returns the resolved absolute URL plus exact digest without performing I/O. `load()` assigns that URL to an `HTMLImageElement`, waits for `load`/`error`, then awaits `decode()`; `error` becomes `fetch_failed` and decode rejection becomes `decode_failed`. It detaches handlers/src on abort or disposal. It does not inspect Story catalogs, enumerate directories, fetch source archives, or expose `HTMLImageElement` through the registry.

`createPresentationReadPortV1` closes over validated locale fallback chains and the registry, exposes only `locale`, `text()`, `asset()`, `observeAssets()`, and `subscribeAssets()`, and returns frozen resolved values. The last two methods forward the registry's exact cached publication/subscription rather than creating a second readiness store. `usePresentationAssetV1(presentation, assetId, usage)` uses React `useSyncExternalStore(presentation.subscribeAssets, presentation.observeAssets)`, then resolves the current asset; it is the single UI rerender path when a transition demand finishes after the RuntimePresentation publication. Asset readiness does not increment Semantic or RuntimePresentation revision. `CodeNativeAssetFallbackV1` renders a noninteractive semantic/CSS placeholder for scene, character, prop, and UI usages; `decorative=true` uses `aria-hidden`, otherwise it requires a nonempty `accessibleName`. It never leaves an invisible Pointer target.

Add the exact UI package export without opening deep paths:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./assets": "./src/assets/index.ts"
  }
}
```

Expose the same neutral names through the existing UI root surface. Type tests prove the public types contain no Story ID, Snapshot, GameSession, DOM loader implementation, runtime path, provider record, or load-group preload method.

- [ ] **Step 5: Run asset, type, boundary, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/assets
pnpm --filter @sillymaker/web exec vitest run src/assets
pnpm typecheck
pnpm verify:public-exports
pnpm verify:boundaries
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; the test fixture proves the filtered asset was never requested, and verification leaves tracked files unchanged.

- [ ] **Step 6: Stage the exact asset slice and commit**

```bash
git add -- engine/packages/ui/src/assets engine/packages/ui/type-tests/assets-public.test-d.ts engine/packages/ui/package.json engine/packages/ui/src/index.ts engine/packages/web/src/assets engine/packages/web/src/index.ts
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(ui): add demand-driven asset presentation"
```

Expected staged paths are only `engine/packages/ui/src/assets/**`, `engine/packages/ui/type-tests/assets-public.test-d.ts`, `engine/packages/ui/package.json`, `engine/packages/ui/src/index.ts`, `engine/packages/web/src/assets/**`, and `engine/packages/web/src/index.ts`.

### Authorized pre-Task 2 owner repair: retire the provisional Base UI contribution ABI

The Contract Catalog and StageScene/Interaction design assign renderer registries to
`@sillymaker/ui`, but the accepted Phase 2 Base surface still exports unused provisional
`UiRendererBindingV1` and four-bucket `UiContributionSetV1` types. They conflict with Task 2's
seven renderer namespaces and orthogonal GameSymbol registry. Before Task 2 RED, remove those two
type-only exports from Base and make the package-qualified UI contract the only renderer
contribution ABI. This repair changes no Gameplay State, state-contract revision, Gameplay
behavior, semantic outcome, dependency or materialization input. The source-based identity chain
must still be allowed to move: the PoC Rule provider entry closures transitively import the Base
public entry, so removing the two exports changes all seven generated provider-source digests and
therefore the resolved PoC simulation digest even though every Rule result stays identical.

**Exact repair files:**

- Modify: `docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md`
- Modify: `docs/engineering/plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md`
- Modify: `engine/packages/base/src/contracts/application.ts`
- Modify: `engine/packages/base/src/contracts/index.ts`
- Modify: `engine/packages/base/src/index.ts`
- Modify: `engine/packages/base/type-tests/application.test-d.ts`
- Modify: `engine/packages/base/public-exports.v1.json`
- Modify: `game/stories/e2e/src/runtime/runtime-fixture-provenance.ts`
- Modify: `game/stories/e2e/scripts/verify-runtime-fixtures.mts`
- Regenerate and review: `game/stories/e2e/src/test/fixtures/runtime/*.json`
- Regenerate and review: `game/stories/e2e/fixtures/session-zero.json`
- Regenerate and review: `game/stories/e2e/golden/semantic-flow.json`

First replace the positive Base type consumer with negative `@ts-expect-error` assertions and run
`pnpm typecheck`; expected RED is exactly TS2578 while Base still exports the two obsolete names.
Remove the declarations and named exports, update the reviewed public inventory, and rerun
typecheck/public-export checks. Because Base source bytes intentionally change the source-based
engine digest, project and review the live provenance, update only the frozen `engineDigest` and
`appBuildId`, then run the existing sole writers in this order:

```bash
pnpm --filter @project-tavern/story-e2e regenerate:runtime-fixtures
pnpm regenerate:fixtures
pnpm update:golden
```

Review the exact 10 payloads, manifest, session-zero and golden diffs plus their SHA-256 values.
After the runtime writer succeeds, update the read-only verifier's separately frozen
generation-time source digest to the exact new manifest value; this verifier constant changes only
when the sole tracked writer creates a newly reviewed baseline.
The state-contract digest, serialized State, command sequence and semantic results must remain
unchanged. Before staging run `pnpm typecheck`, `pnpm verify:public-exports`,
`pnpm verify:runtime-fixtures`, and `git diff --check`; exact-stage only the repair files above that
changed and commit `fix(base): retire obsolete UI contribution ABI`. The cumulative
`pnpm verify:persistence-diagnostics` and `pnpm verify` gates begin with the strict clean-tree
materialization precondition, so run both immediately after that commit and accept the repair only
when they exit 0 without tracked-byte drift.

The first clean-tree post-commit `pnpm verify:persistence-diagnostics` run exposed the expected
provider-closure drift as exactly seven `rule-source-digests.test.ts` mismatches. Complete the same
earlier-owner recovery with one narrow follow-up repair commit. Its exact files are this plan,
`game/stories/poc/src/rule-source-digests.generated.ts`,
`game/stories/poc/src/testing/save-fixture-provenance.ts`, and the eight tracked JSON files under
`game/stories/poc/src/test/fixtures/saves/`. Run only the existing sole writers, in this order:

```bash
pnpm --filter @project-tavern/story-poc update:rule-source-digests
# project and review the live PoC fixture provenance, then update its frozen identity tuple
pnpm --filter @project-tavern/story-poc update:fixtures
```

Review all seven generated provider digests and all eight Save writer outputs; seven legal/derived
records change only their current simulation digest, while the dedicated digest-mismatch negative
remains byte-identical because it already carries its fixed alternative digest. The PoC
simulation digest and any diagnostic identity derived from that source are expected to change;
Story behavior, state-contract identity, PatchSet identity, every serialized Snapshot/State,
state digest, command sequence, integrity value, and negative-fixture classification must remain
unchanged. Before staging, rerun the independent rule-source verifier, `pnpm verify:fixtures`,
`pnpm verify:golden`, `pnpm typecheck`, and `git diff --check`; none may invoke a writer or leave
additional tracked-byte drift. Then exact-stage and commit:

```bash
git add -- docs/engineering/plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md game/stories/poc/src/rule-source-digests.generated.ts game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/saves
git diff --cached --name-status
git diff --cached --check
git commit -m "fix(story-poc): refresh rule provenance after Base ABI repair"
```

The staged set is exactly the plan, generated source digests, frozen provenance, and the seven Save
JSON files that changed. Immediately after the commit, require a clean tree and run
`pnpm verify:materialization`, `pnpm verify:persistence-diagnostics`, and `pnpm verify`; accept the
owner repair and begin Task 2 RED only when all three exit 0 without tracked-byte drift.

Task 2 additionally freezes `SemanticActionControlV1.disabledReasonLabels` as one resolved,
nonempty label for each `descriptor.reasons` entry in the same authored order. The Story renderer
resolves those strings through its `PresentationReadPortV1`; neutral UI never stringifies or maps a
Story rejection DTO. The E2E migration assigns `choose`/`continue` controls to `narrative`,
`start`/`increment`/`complete` controls to `hud`, and the existing character renderer to
`character`; it adds no Gameplay or second availability calculation.

## Task 2: Bridge one atomic SemanticPublication and register neutral renderers

**Files:**

- Create: `engine/packages/ui/src/contributions/types.ts`
- Modify: `engine/packages/ui/src/contributions/registry.ts`
- Modify: `engine/packages/ui/src/contributions/registry.test.ts`
- Create: `engine/packages/ui/src/runtime/semantic-publication-bridge.ts`
- Create: `engine/packages/ui/src/runtime/semantic-publication-bridge.test.ts`
- Create: `engine/packages/ui/src/runtime/use-semantic-publication.ts`
- Create: `engine/packages/ui/src/runtime/semantic-action-control.tsx`
- Create: `engine/packages/ui/src/runtime/semantic-action-control.test.tsx`
- Create: `engine/packages/ui/src/symbols/game-symbol.tsx`
- Create: `engine/packages/ui/src/symbols/game-symbol.test.tsx`
- Create: `engine/packages/ui/src/symbols/game-symbol-registry.ts`
- Create: `engine/packages/ui/src/symbols/game-symbol-registry.test.ts`
- Create: `engine/packages/ui/src/symbols/index.ts`
- Modify: `engine/packages/ui/src/shell/game-shell.tsx`
- Modify: `engine/packages/ui/src/shell/game-shell.test.tsx`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/ui/type-tests/runtime-public.test-d.ts`
- Modify: `game/stories/e2e/src/presentation/e2e-renderers.tsx`
- Modify: `game/stories/e2e/src/presentation/e2e-renderers.test.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.test.tsx`

**Interfaces:**

- Consumes: Base `SemanticPublicationV1`, Story-specialized `SemanticGamePortV1.observe/subscribe`, immutable descriptor/invocation types, `PresentationReadPortV1`, and React `useSyncExternalStore`.
- Produces: `createSemanticPublicationBridgeV1`, `useSemanticPublicationV1`, `SemanticActionControlV1`, `GameRendererContextV1`, `UiContributionSetV1`, `UiContributionRegistryV1`, `createUiContributionRegistryV1` with seven independent namespaces, plus the orthogonal `GameSymbolIdV1`/`parseGameSymbolIdV1`/`GameSymbolProviderV1`/`GameSymbolRegistryV1`/`GameSymbolV1` surface.

- [ ] **Step 1: Write failing atomic-reference, uniqueness, and exact-invocation tests**

```ts
it("publishes the complete SemanticPublication as one immutable reference", () => {
  const semantic = createFakeSemanticGamePortV1(publication0);
  const bridge = createSemanticPublicationBridgeV1(semantic);
  const listener = vi.fn();
  const unsubscribe = bridge.subscribe(listener);

  semantic.publish(publication1);

  expect(bridge.getSnapshot()).toBe(publication1);
  expect(bridge.getSnapshot().game).toBe(publication1.game);
  expect(bridge.getSnapshot().narrative).toBe(publication1.narrative);
  expect(bridge.getSnapshot().actions).toBe(publication1.actions);
  expect(semantic.availableActions).not.toHaveBeenCalled();
  expect(listener).toHaveBeenCalledOnce();
  unsubscribe();
  bridge.dispose();
});

it("keeps game/narrative/actions references for a status-only publication", () => {
  const fixture = createStatusOnlyPublicationFixtureV1();
  fixture.publishBusy();
  expect(fixture.bridge.getSnapshot()).toMatchObject({ revision: 4, status: "busy" });
  expect(fixture.bridge.getSnapshot().game).toBe(fixture.publication0.game);
  expect(fixture.bridge.getSnapshot().narrative).toBe(fixture.publication0.narrative);
  expect(fixture.bridge.getSnapshot().actions).toBe(fixture.publication0.actions);
});

it("rejects duplicate renderer IDs only within the same namespace", () => {
  expect(() => createUiContributionRegistryV1([setA, duplicateHudSet])).toThrowError(
    /ui\.duplicate_renderer_id:hud:renderer\.shared/,
  );
  expect(() => createUiContributionRegistryV1([setA, sameIdInSystemSet])).not.toThrow();
});

it("dispatches the Story-supplied invocation unchanged", async () => {
  render(
    <SemanticActionControlV1
      descriptor={descriptor}
      invocation={typedInvocation}
      semantic={semantic}
      label="营业"
      disabledReasonLabels={[]}
    />,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "营业" }));
  expect(semantic.dispatch).toHaveBeenCalledWith(typedInvocation);
});

it("resolves a Story-owned world symbol independently of Stage namespaces", () => {
  const registry = createGameSymbolRegistryV1([staminaSymbolProviderV1]);
  render(
    <GameSymbolV1
      registry={registry}
      symbolId={parseGameSymbolIdV1("symbol.e2e.stamina")}
      size={24}
      accessibleName="体力"
    />,
  );
  expect(screen.getByRole("img", { name: "体力" })).toBeVisible();
});
```

Add tests for initial observation, multiple listeners, idempotent unsubscribe/dispose, a source subscriber throwing without corrupting the bridge, disabled reasons in authored order, 44×44 semantic control class, all seven renderer namespaces, duplicate/unknown GameSymbol IDs, 16/20/24/32 sizes, decorative versus named ARIA, and code-native fallback.

- [ ] **Step 2: Run the focused runtime tests and confirm the old bridge is insufficient**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/contributions src/runtime src/symbols
```

Expected: FAIL because the current bridge publishes a view-shaped value rather than the atomic `SemanticPublicationV1`, and the seven-namespace contribution contract does not exist.

- [ ] **Step 3: Implement the atomic external-store bridge**

```ts
export interface SemanticPublicationSourceV1<TPublication> {
  observe(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
}

export interface SemanticPublicationBridgeV1<TPublication> {
  getSnapshot(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export function createSemanticPublicationBridgeV1<TPublication>(
  source: SemanticPublicationSourceV1<TPublication>,
): SemanticPublicationBridgeV1<TPublication>;

export function useSemanticPublicationV1<TPublication>(
  bridge: SemanticPublicationBridgeV1<TPublication>,
): DeepReadonly<TPublication>;
```

`getSnapshot()` delegates to the one `source.observe()` and returns that complete object unchanged. Each bridge listener delegates through `source.subscribe`, so the Base Semantic source retains subscriber-failure isolation; the bridge never creates a second fan-out loop. Never call `availableActions()`, split `game`, `narrative`, or `actions`, derive a second semantic revision, or synthesize a status publication. `useSemanticPublicationV1` calls `useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot)` and therefore consumes the source's cached immutable snapshot under React concurrent rendering. `dispose()` invokes all retained source unsubscribe functions once and makes later subscribe calls fail with `ui.semantic_bridge_disposed`.

Keep the existing generic `createViewSourceV1/useReadonlyViewV1` only for non-authoritative UI session state already used by the Phase-2 checkpoint. It is not accepted by `useSemanticPublicationV1`, and no Story renderer may use it to split `SemanticPublicationV1.game`, `.narrative`, or `.actions`.

- [ ] **Step 4: Implement seven renderer namespaces and the generic semantic control**

```ts
export type UiRendererNamespaceV1 =
  | "background"
  | "character"
  | "scene_interaction"
  | "hud"
  | "workspace_overlay"
  | "narrative"
  | "system";

export interface GameRendererContextV1<TViewSlice, TSemanticPort, TPresentation> {
  readonly viewSlice: DeepReadonly<TViewSlice>;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}

export interface UiRendererContributionV1<TContext> {
  readonly rendererId: string;
  readonly component: ComponentType<TContext>;
}

export interface UiContributionRegistryV1<
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> = Readonly<
    Record<UiRendererNamespaceV1, unknown>
  >,
> {
  resolve<TNamespace extends UiRendererNamespaceV1>(
    namespace: TNamespace,
    rendererId: string,
  ):
    | {
        readonly kind: "found";
        readonly component: ComponentType<TContexts[TNamespace]>;
      }
    | { readonly kind: "not_found"; readonly code: "ui.renderer_not_found" };
}

export interface UiContributionSetV1<
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>>,
> {
  readonly contributionId: string;
  readonly renderers: {
    readonly [TNamespace in UiRendererNamespaceV1]?: readonly UiRendererContributionV1<
      TContexts[TNamespace]
    >[];
  };
}

export type GameSymbolIdV1 = Brand<string, "GameSymbolIdV1">;
export type GameSymbolSizeV1 = 16 | 20 | 24 | 32;

export function parseGameSymbolIdV1(value: string): GameSymbolIdV1;

export type GameSymbolAccessibilityV1 =
  | { readonly accessibleName: string; readonly decorative?: false }
  | { readonly accessibleName?: never; readonly decorative: true };

export type GameSymbolRenderPropsV1 = {
  readonly size: GameSymbolSizeV1;
} & GameSymbolAccessibilityV1;

export type GameSymbolPropsV1 = {
  readonly registry: GameSymbolRegistryV1;
  readonly symbolId: GameSymbolIdV1;
  readonly size: GameSymbolSizeV1;
} & GameSymbolAccessibilityV1;

export interface GameSymbolProviderV1 {
  readonly symbolId: GameSymbolIdV1;
  readonly component: ComponentType<GameSymbolRenderPropsV1>;
}

export interface GameSymbolRegistryV1 {
  resolve(
    symbolId: GameSymbolIdV1,
  ):
    | { readonly kind: "found"; readonly component: ComponentType<GameSymbolRenderPropsV1> }
    | { readonly kind: "not_found"; readonly code: "ui.game_symbol_not_found" };
}

export function createGameSymbolRegistryV1(
  providers: readonly DeepReadonly<GameSymbolProviderV1>[],
): GameSymbolRegistryV1;

export function GameSymbolV1(props: GameSymbolPropsV1): ReactElement;
```

`createUiContributionRegistryV1` returns the public `UiContributionRegistryV1<TContexts>`, builds one frozen map per namespace, preserves contribution/renderer authored order for diagnostics, rejects an empty ID, duplicate `contributionId`, or duplicate renderer ID in the same namespace with stable codes, and resolves unknown IDs as a typed `ui.renderer_not_found` result rather than rendering a random default. The same string may exist in two namespaces because lookup always includes the namespace.

`createGameSymbolRegistryV1` is deliberately separate from the seven Stage renderer maps. It rejects empty/duplicate IDs, preserves authored order for diagnostics, and never imports Lucide or project IDs. `GameSymbolV1` accepts only 16/20/24/32 px, requires exactly one of a nonempty `accessibleName` or `decorative=true`, and renders a visible code-native fallback for an unknown/failed provider. Lucide remains the implementation choice for system buttons only; Story applications register world-semantic providers in Phase 5B.

`SemanticActionControlV1` takes the descriptor, the exact typed invocation and
`disabledReasonLabels` from a Story renderer. The labels must be a frozen one-to-one projection of
`descriptor.reasons`, contain no empty string and retain authored order; a mismatch fails with
`ui.semantic_action_reason_mismatch`. It uses descriptor `enabled`, emits those resolved labels in
order through `aria-describedby`, and calls only `semantic.dispatch(invocation)`. It never
stringifies or maps a Story rejection DTO, constructs parameters, maps to a Gameplay Command,
calls Queries, performs optimistic Gameplay mutation, or reads `GameApplicationPortV1`.

Type/boundary tests prove `GameRendererContextV1` cannot expose `GameSnapshot`, `GameSession`, `GameQueries`, State, owner capability, DebugTools, RuntimeCapabilities, or Story tooling. The `presentation` parameter is the narrow `PresentationReadPortV1`, not `ResolvedGame.presentation` or the resolved asset manifest.

Migrate the already-existing Phase-2 E2E renderer set and `E2eApplicationRootV1` to the new namespaces in the same task: its existing scene renderer becomes a `background` contribution, `start`/`increment`/`complete` controls become `hud`, `choose`/`continue` controls become `narrative`, the existing character renderer becomes `character`, and unused namespaces are empty. Update `GameShell` only enough to resolve those new namespaces while preserving the Phase-2 visual checkpoint; Task 4 replaces that temporary flat placement with the fixed seven-layer Stage. This is a contract migration of the existing E2E root, not a new root, renderer, scene, or behavior.

- [ ] **Step 5: Run runtime, type, architecture, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/contributions src/runtime src/symbols
pnpm --filter @project-tavern/story-e2e exec vitest run src/presentation/e2e-renderers.test.tsx src/application/e2e-application-root.test.tsx
pnpm build:e2e
pnpm typecheck
pnpm verify:public-exports
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; status-only publications retain the exact `game`, `narrative`, and `actions` references, and UI has no Story Gameplay import.

- [ ] **Step 6: Stage the exact publication/contribution slice and commit**

```bash
git add -- engine/packages/ui/src/contributions engine/packages/ui/src/runtime engine/packages/ui/src/symbols engine/packages/ui/src/shell/game-shell.tsx engine/packages/ui/src/shell/game-shell.test.tsx engine/packages/ui/src/index.ts engine/packages/ui/type-tests/runtime-public.test-d.ts game/stories/e2e/src/presentation/e2e-renderers.tsx game/stories/e2e/src/presentation/e2e-renderers.test.tsx game/stories/e2e/src/application/e2e-application-root.tsx game/stories/e2e/src/application/e2e-application-root.test.tsx
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(ui): bridge atomic semantic publications"
```

Expected staged paths are only `engine/packages/ui/src/contributions/**`, `engine/packages/ui/src/runtime/**`, `engine/packages/ui/src/symbols/**`, the listed `GameShell`/E2E migration files, `engine/packages/ui/src/index.ts`, and `engine/packages/ui/type-tests/runtime-public.test-d.ts`.

## Task 3: Implement InputRouter and the Web Pointer lifecycle adapter

**Files:**

- Create: `engine/packages/ui/src/input/contracts.ts`
- Create: `engine/packages/ui/src/input/input-router.ts`
- Create: `engine/packages/ui/src/input/input-router.test.ts`
- Create: `engine/packages/ui/src/input/input-context.tsx`
- Create: `engine/packages/ui/src/input/input-context.test.tsx`
- Create: `engine/packages/ui/src/input/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/ui/type-tests/input-public.test-d.ts`
- Create: `engine/packages/web/src/input/install-pointer-adapter.ts`
- Create: `engine/packages/web/src/input/install-pointer-adapter.test.ts`
- Create: `engine/packages/web/src/input/index.ts`
- Modify: `engine/packages/web/src/index.ts`

**Interfaces:**

- Consumes: device-independent `InputEventV1`, active context registrations, an explicitly supplied Stage element, DOM Pointer Events, browser focus/visibility lifecycle, and no Story type.
- Produces: `InputContextIdV1`, open branded `InputActionIdV1`/`parseInputActionIdV1`, `systemInputActionIdsV1`, `InputEventV1`, `createInputRouterV1`, `InputContextProviderV1`, `useInputRouterV1`, and Web-owned `installPointerAdapterV1`.

- [ ] **Step 1: Write failing precedence, Interaction isolation, Pointer, cancel, and focus-loss tests**

```ts
it("routes through the closed normal precedence and never falls through after handled", () => {
  const router = createInputRouterV1();
  const gameplay = vi.fn(() => inputHandledV1);
  const interaction = vi.fn(() => inputHandledV1);
  const overlay = vi.fn(() => inputHandledV1);
  router.register({ context: "gameplay", handle: gameplay });
  router.register({ context: "interaction", handle: interaction });
  router.register({ context: "overlay", handle: overlay });

  expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
    kind: "handled",
    context: "overlay",
  });
  expect(overlay).toHaveBeenCalledOnce();
  expect(interaction).not.toHaveBeenCalled();
  expect(gameplay).not.toHaveBeenCalled();
});

it("lets Interaction consume Stage activation before Gameplay", () => {
  const fixture = createInteractionRouterFixtureV1();
  expect(
    fixture.router.route({
      kind: "viewport_point",
      phase: "activate",
      point: { x: 320, y: 240 },
      pointerId: 7,
      pointerType: "touch",
    }),
  ).toEqual({ kind: "handled", context: "interaction" });
  expect(fixture.gameplay).not.toHaveBeenCalled();
});

it.each(["mouse", "touch", "pen"] as const)(
  "emits one %s begin/activate pair in viewport CSS coordinates",
  (pointerType) => {
    const fixture = installPointerFixtureV1({ pointerType, clientX: 123, clientY: 456 });
    fixture.pointerDown();
    fixture.pointerUp();
    fixture.syntheticClick();
    expect(fixture.events()).toEqual([
      {
        kind: "viewport_point",
        phase: "begin",
        point: { x: 123, y: 456 },
        pointerId: 1,
        pointerType,
      },
      {
        kind: "viewport_point",
        phase: "activate",
        point: { x: 123, y: 456 },
        pointerId: 1,
        pointerType,
      },
    ]);
  },
);

it("emits cancellation and clears capture on pointercancel", () => {
  const fixture = installPointerFixtureV1({ pointerType: "touch" });
  fixture.pointerDown();
  fixture.pointerCancel();
  expect(fixture.events().at(-1)).toEqual({ kind: "pointer_cancel", pointerId: 1 });
  expect(fixture.hasPointerCapture()).toBe(false);
});

it("emits focus_loss on window blur and leaves native controls to click", () => {
  const fixture = installPointerFixtureV1({ target: "button" });
  fixture.pointerDown();
  fixture.pointerUp();
  fixture.windowBlur();
  expect(fixture.events()).toEqual([{ kind: "focus_loss" }]);
  expect(fixture.nativeClickCount()).toBe(1);
});
```

Add tests for overlay ignored then Interaction handled, LIFO registration within one context, unregister during dispatch, primary-pointer-only behavior, mismatched pointer IDs, `lostpointercapture`, hidden-document focus loss, dispose idempotence, and rejection of nonfinite viewport coordinates.

- [ ] **Step 2: Run focused input tests and confirm the contracts are absent**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/input
pnpm --filter @sillymaker/web exec vitest run src/input
```

Expected: FAIL because the closed context router and browser Pointer lifecycle adapter do not exist.

- [ ] **Step 3: Implement device-independent input events and explicit contexts**

```ts
export type InputContextIdV1 =
  "gameplay" | "interaction" | "narrative" | "overlay" | "system" | "debug";

export type InputActionIdV1 = Brand<string, "InputActionIdV1">;

export function parseInputActionIdV1(value: string): InputActionIdV1;

export const systemInputActionIdsV1 = Object.freeze({
  confirm: parseInputActionIdV1("ui.confirm"),
  cancel: parseInputActionIdV1("ui.cancel"),
  openMenu: parseInputActionIdV1("ui.open_menu"),
  narrativeAdvance: parseInputActionIdV1("narrative.advance"),
});

export interface ViewportPointV1 {
  readonly x: number;
  readonly y: number;
}

export type InputEventV1 =
  | { readonly kind: "action"; readonly actionId: InputActionIdV1 }
  | {
      readonly kind: "viewport_point";
      readonly phase: "begin" | "activate";
      readonly point: ViewportPointV1;
      readonly pointerId: NonNegativeSafeInteger;
      readonly pointerType: "mouse" | "touch" | "pen";
    }
  | { readonly kind: "pointer_cancel"; readonly pointerId: NonNegativeSafeInteger }
  | { readonly kind: "focus_loss" };

export type InputHandlerResultV1 = { readonly kind: "handled" } | { readonly kind: "ignored" };

export interface InputRouterV1 {
  register(registration: {
    readonly context: InputContextIdV1;
    readonly handle: (event: DeepReadonly<InputEventV1>) => InputHandlerResultV1;
  }): () => void;
  route(
    event: DeepReadonly<InputEventV1>,
  ):
    { readonly kind: "handled"; readonly context: InputContextIdV1 } | { readonly kind: "ignored" };
  clearTransientInput(): void;
}
```

The router owns the fixed precedence `debug=60, system=50, overlay=40, narrative=30, interaction=20, gameplay=10`. `debug` is inert until a Phase-5C surface registers it; it is not a Runtime Capability and adds no UI here. `InputActionIdV1` is a validated open branded ID so future keyboard/gamepad action maps and Story applications can add typed semantic actions without changing the engine ABI; Base/UI only exports the four system constants above and never interprets a Story action. Within one context, the most recently registered handler runs first. Continue only after `ignored`; stop after the first `handled`. Snapshot the registration order at route entry so registration/unregistration during one dispatch affects only the next event.

`clearTransientInput()` routes one `focus_loss` through the same precedence and retains no pointer/interaction selection itself. The router stores no Gameplay state, coordinate history, semantic invocation, or serializable value. `InputContextProviderV1` provides one injected router; `useInputRouterV1` fails with `ui.input_provider_missing` outside the provider.

- [ ] **Step 4: Implement the Pointer Adapter without geometry or native-click ownership**

```ts
export interface PointerAdapterInputV1 {
  readonly target: HTMLElement;
  readonly route: (event: InputEventV1) => void;
  readonly window: Pick<Window, "addEventListener" | "removeEventListener">;
  readonly document: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
}

export interface InstalledPointerAdapterV1 {
  dispose(): void;
}

export function installPointerAdapterV1(input: PointerAdapterInputV1): InstalledPointerAdapterV1;
```

Listen only on the supplied Stage target plus the injected window/document lifecycle. Accept one primary pointer; on primary `pointerdown`, require finite `clientX/clientY`, record its ID, capture it, and route `viewport_point/begin`. Route `viewport_point/activate` only after a matching primary `pointerup` with finite coordinates, then forget the pointer before releasing capture. `pointercancel` or an unexpected `lostpointercapture` routes `pointer_cancel` and clears the pointer. Window `blur` or `document.visibilityState === "hidden"` routes one `focus_loss` and clears capture.

Ignore events whose target is within `button`, `a[href]`, `input`, `select`, `textarea`, `summary`, `[contenteditable="true"]`, or `[data-native-semantic-control="true"]`. Do not register a `click` listener, call `.click()`, prevent native keyboard behavior, perform CSS transforms, normalize to renderer coordinates, hit-test, create `InteractionActivationV1`, or dispatch Semantic/Game commands. Phase 5B owns those downstream steps.

- [ ] **Step 5: Run input, type, boundary, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/input
pnpm --filter @sillymaker/web exec vitest run src/input
pnpm typecheck
pnpm verify:public-exports
pnpm verify:boundaries
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; mouse/touch/pen emit the same neutral event shape, and neither UI nor Web imports a Story, Snapshot, HitMap, or renderer geometry implementation.

- [ ] **Step 6: Stage the exact input slice and commit**

```bash
git add -- engine/packages/ui/src/input engine/packages/ui/src/index.ts engine/packages/ui/type-tests/input-public.test-d.ts engine/packages/web/src/input engine/packages/web/src/index.ts
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(input): add stage pointer routing"
```

Expected staged paths are only `engine/packages/ui/src/input/**`, `engine/packages/ui/src/index.ts`, `engine/packages/ui/type-tests/input-public.test-d.ts`, `engine/packages/web/src/input/**`, and `engine/packages/web/src/index.ts`.

## Task 4: Build GameShell and the fixed seven-layer responsive Stage

**Files:**

- Create: `engine/packages/ui/src/theme/tokens.css`
- Create: `engine/packages/ui/src/theme/global.css`
- Create: `engine/packages/ui/src/primitives/Button.tsx`
- Create: `engine/packages/ui/src/primitives/IconButton.tsx`
- Create: `engine/packages/ui/src/primitives/ProgressMeter.tsx`
- Create: `engine/packages/ui/src/primitives/primitives.test.tsx`
- Create: `engine/packages/ui/src/primitives/index.ts`
- Create: `engine/packages/ui/src/shell/stage-layout.ts`
- Create: `engine/packages/ui/src/shell/stage-layout.test.ts`
- Create: `engine/packages/ui/src/shell/top-card-hud.tsx`
- Create: `engine/packages/ui/src/shell/top-card-hud.test.tsx`
- Modify: `engine/packages/ui/src/shell/game-shell.tsx`
- Modify: `engine/packages/ui/src/shell/game-shell.module.css`
- Modify: `engine/packages/ui/src/shell/game-shell.test.tsx`
- Create: `engine/packages/ui/src/shell/game-stage.tsx`
- Create: `engine/packages/ui/src/shell/game-stage.module.css`
- Create: `engine/packages/ui/src/shell/game-stage.test.tsx`
- Create: `engine/packages/ui/src/shell/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.test.tsx`
- Create: `.stylelintrc.json`
- Modify: root `package.json`

**Interfaces:**

- Consumes: seven already-resolved React layer nodes, `InputContextProviderV1`, semantic labels supplied by the application, CSS viewport constraints, and no Story catalog.
- Produces: `StageLayerIdV1`, `GameStageLayersV1`, `GameStageV1`, `TopCardHudV1`, `StageHudSlotsV1`, `computeStageFrameV1`, and the existing public `GameShell` upgraded in place.

- [ ] **Step 1: Write failing layer-order, HUD-slot, framing, and focus-style tests**

```tsx
render(<GameStageV1 accessibleName="游戏舞台" layers={completeSevenLayerFixtureV1()} />);
expect(screen.getByTestId("stage-background")).toHaveAttribute("data-stage-layer", "background");
expect(screen.getByTestId("stage-character")).toHaveAttribute("data-stage-layer", "character");
expect(screen.getByTestId("stage-scene-interaction")).toHaveAttribute(
  "data-stage-layer",
  "scene_interaction",
);
expect(screen.getByTestId("stage-hud")).toHaveAttribute("data-stage-layer", "hud");
expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute(
  "data-stage-layer",
  "workspace_overlay",
);
expect(screen.getByTestId("stage-narrative")).toHaveAttribute("data-stage-layer", "narrative");
expect(screen.getByTestId("stage-system")).toHaveAttribute("data-stage-layer", "system");
expect(screen.getByRole("main", { name: "游戏舞台" })).toBeVisible();

it.each([
  [
    { width: 1024, height: 768 },
    { mode: "landscape", width: 1024, height: 640 },
  ],
  [
    { width: 768, height: 1024 },
    { mode: "portrait_reflow", width: 768, height: 1024 },
  ],
  [
    { width: 1600, height: 1000 },
    { mode: "landscape", width: 1600, height: 1000 },
  ],
  [
    { width: 2560, height: 1080 },
    { mode: "landscape", width: 1600, height: 1000 },
  ],
] as const)("computes the capped Stage for %o", (viewport, expected) => {
  expect(computeStageFrameV1(viewport)).toEqual(expected);
});

it("renders the three compact top-card HUD slots in logical order", () => {
  render(<TopCardHudV1 slots={topCardFixtureV1} accessibleName="状态" />);
  expect(screen.getAllByTestId(/top-card-/u).map((node) => node.dataset.slot)).toEqual([
    "start",
    "center",
    "end",
  ]);
});
```

Add tests that all seven layers stay mounted when their node is `null`, only `scene_interaction` is the Pointer Adapter target, HUD/Overlay/Narrative/System remain semantic DOM, buttons and icon buttons have a minimum 44×44 token, progress meters expose name/value, ultrawide fill has `pointer-events: none`, and the reduced-motion media rule removes transitions.

- [ ] **Step 2: Run focused shell tests and confirm the fixed Stage is absent**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/primitives src/shell
pnpm lint:styles
```

Expected: the Vitest command FAILs because the Stage/layout/primitives are missing; `lint:styles` FAILs until the script and reviewed configuration exist.

- [ ] **Step 3: Verify and consume the R1-pinned UI dependencies**

Run:

```bash
pnpm verify:materialization
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = JSON.parse(await readFile("package.json", "utf8"));
const ui = JSON.parse(await readFile("engine/packages/ui/package.json", "utf8"));
const code = "external_precondition.materialization_stale";
assert.equal(ui.peerDependencies?.["react-dom"], "19.2.7", code);
assert.equal(ui.dependencies?.["lucide-react"], "1.24.0", code);
assert.equal(root.devDependencies?.stylelint, "17.14.0", code);
assert.equal(root.devDependencies?.["stylelint-config-standard"], "40.0.0", code);
NODE
pnpm install --offline --frozen-lockfile
```

Expected: the read-only materialization verifier proves `react-dom@19.2.7` is already the UI peer, `lucide-react@1.24.0` is already UI-owned, and root devDependencies already contain `stylelint@17.14.0` plus `stylelint-config-standard@40.0.0`; the offline frozen install exits 0 and changes neither manifest nor lockfile. Any missing/mismatched entry is `external_precondition.materialization_stale`, not permission to edit dependencies during this task.

- [ ] **Step 4: Implement the Stage data contract and pure framing calculation**

```ts
export type StageLayerIdV1 =
  | "background"
  | "character"
  | "scene_interaction"
  | "hud"
  | "workspace_overlay"
  | "narrative"
  | "system";

export interface GameStageLayersV1 {
  readonly background: ReactNode;
  readonly character: ReactNode;
  readonly sceneInteraction: ReactNode;
  readonly hud: ReactNode;
  readonly workspaceOverlay: ReactNode;
  readonly narrative: ReactNode;
  readonly system: ReactNode;
}

export interface StageHudSlotsV1 {
  readonly start: ReactNode;
  readonly center: ReactNode;
  readonly end: ReactNode;
}

export type StageFrameV1 =
  | {
      readonly mode: "landscape";
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly mode: "portrait_reflow";
      readonly width: number;
      readonly height: number;
    };

export function computeStageFrameV1(viewport: {
  readonly width: number;
  readonly height: number;
}): StageFrameV1;
```

For viewport ratio below 4:3, return full-viewport `portrait_reflow`. Otherwise calculate `width = min(viewport.width, 1600, viewport.height * 1.6)` and `height = width / 1.6`. Reject nonfinite/nonpositive dimensions with `ui.invalid_viewport`. The CSS uses the same 1600×1000 and 4:3 constants, logical properties, `100dvh`, and container/media queries; tests freeze the shared exported constants so TypeScript and CSS cannot silently drift.

`GameStageV1` emits all seven layer containers in the fixed DOM/z order above. Only the scene-interaction layer receives `data-stage-pointer-surface="true"`; other layers own semantic controls and can disable lower Pointer routing through Input contexts. Layer `data-testid` attributes are structural witnesses, not player/browser action locators.

- [ ] **Step 5: Implement semantic primitives, compact HUD, and responsive shell**

```tsx
export interface GameShellPropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
  readonly inputRouter: InputRouterV1;
  readonly backdrop?: ReactNode;
}

export function GameShell(props: GameShellPropsV1): ReactElement;
```

`GameShell` keeps its Phase-2 public name so the E2E checkpoint remains buildable after this task. It creates the Input provider, renders the noninteractive fill outside the capped Stage, and passes exactly the seven supplied nodes to `GameStageV1`. It does not resolve a Story, build a `RuntimePresentationView`, choose a StageSceneVariant, read a Semantic action catalog, or own a browser route.

Update the existing `E2eApplicationRootV1` call site to pass its current renderer nodes as `background`, `hud`, and `narrative`, with `null` in the still-unused character/interaction/overlay/system positions. Do not add an E2E StageScene, HitMap, interaction, preference, route, or second root; Phase 5B replaces these empty positions from its neutral presentation fixture.

Tokens define a 1600×1000 basis, 44px minimum target, visible two-color focus ring, readable text scale, safe-area spacing, z-index for exactly seven Stage layers, and reduced-motion behavior. `TopCardHudV1` exposes three compact named regions, reflows into a scroll-safe two-row/vertical layout in portrait, and collapses nonessential decoration at large text. `Button`, `IconButton`, and `ProgressMeter` use native elements/ARIA; icon-only controls require an accessible label and Lucide remains limited to system UI symbols.

Add root script `"lint:styles": "stylelint \"engine/packages/**/*.css\" \"game/packages/**/*.css\" \"game/stories/**/*.css\""`. `.stylelintrc.json` extends only `stylelint-config-standard` and contains reviewed CSS Modules selector exceptions; it does not disable unknown-property, duplicate-property, contrast, or syntax failures globally.

- [ ] **Step 6: Run shell, style, boundary, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/primitives src/shell
pnpm --filter @project-tavern/story-e2e exec vitest run src/application/e2e-application-root.test.tsx
pnpm lint:styles
pnpm build:e2e
pnpm typecheck
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; all seven layers remain mounted in the fixed order, and the pure layout contract passes 1024×768, 768×1024, 1600×1000, and 2560×1080 fixtures.

- [ ] **Step 7: Stage the exact shell slice and commit**

```bash
git add -- engine/packages/ui/src/theme engine/packages/ui/src/primitives engine/packages/ui/src/shell engine/packages/ui/src/index.ts game/stories/e2e/src/application/e2e-application-root.tsx game/stories/e2e/src/application/e2e-application-root.test.tsx .stylelintrc.json package.json
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(ui): add responsive seven-layer stage"
```

Expected staged paths are only the listed UI theme/primitives/shell files, the two existing E2E root files, root `package.json`, `.stylelintrc.json`, and `engine/packages/ui/src/index.ts`; the R1-owned dependency entries and lockfile remain byte-identical.

## Task 5: Implement blocking Workspace Overlay, VN, and System surfaces

**Files:**

- Create: `engine/packages/ui/src/overlays/overlay-session-store.ts`
- Create: `engine/packages/ui/src/overlays/overlay-session-store.test.ts`
- Create: `engine/packages/ui/src/overlays/overlay-host.tsx`
- Create: `engine/packages/ui/src/overlays/overlay-host.module.css`
- Create: `engine/packages/ui/src/overlays/overlay-host.test.tsx`
- Create: `engine/packages/ui/src/overlays/action-confirmation-dialog.tsx`
- Create: `engine/packages/ui/src/overlays/action-confirmation-dialog.test.tsx`
- Create: `engine/packages/ui/src/overlays/index.ts`
- Create: `engine/packages/ui/src/narrative/vn-layer.tsx`
- Create: `engine/packages/ui/src/narrative/vn-layer.module.css`
- Create: `engine/packages/ui/src/narrative/vn-layer.test.tsx`
- Create: `engine/packages/ui/src/narrative/index.ts`
- Create: `engine/packages/ui/src/system/system-dialog-host.tsx`
- Create: `engine/packages/ui/src/system/system-dialog-host.test.tsx`
- Create: `engine/packages/ui/src/system/settings-launcher.tsx`
- Create: `engine/packages/ui/src/system/settings-launcher.test.tsx`
- Create: `engine/packages/ui/src/system/settings-dialog.tsx`
- Create: `engine/packages/ui/src/system/settings-dialog.test.tsx`
- Create: `engine/packages/ui/src/system/index.ts`
- Modify: `engine/packages/ui/src/shell/game-stage.tsx`
- Modify: `engine/packages/ui/src/index.ts`

**Interfaces:**

- Consumes: Story/application-supplied labels and exact semantic invocations, `SemanticGamePortV1`, `InputRouterV1`, the Stage Overlay/Narrative/System layer nodes, and native focus state.
- Produces: `createOverlaySessionStoreV1`, `OverlayHostV1`, `ActionConfirmationDialogV1`, `VnLayerV1`, `SystemDialogHostV1`, `SettingsLauncherV1`, and `SettingsDialogV1` with closed input isolation and focus return.

- [ ] **Step 1: Write failing overlay-stack, VN-choice, context, and focus tests**

```ts
it("keeps one primary Overlay and at most four ordered details", () => {
  const store = createOverlaySessionStoreV1<string>();
  store.openPrimary("inventory");
  store.pushDetail("ingredient-1");
  store.pushDetail("source-1");
  store.pushDetail("supplier-1");
  store.pushDetail("history-1");
  expect(store.pushDetail("fifth-detail")).toEqual({ kind: "rejected", code: "detail_limit" });
  expect(store.getSnapshot()).toEqual({
    primaryId: "inventory",
    detailIds: ["ingredient-1", "source-1", "supplier-1", "history-1"],
  });
});

it("closes the top detail before the primary and returns focus", async () => {
  render(<OverlayHarnessV1 />);
  const opener = screen.getByRole("button", { name: "打开背包" });
  await userEvent.setup().click(opener);
  await userEvent.setup().click(screen.getByRole("button", { name: "食材详情" }));
  await userEvent.setup().keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
  await userEvent.setup().keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

it("dispatches the exact projected VN choice and preserves authored disabled reasons", async () => {
  render(<VnLayerV1 {...choiceVnFixtureV1} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "谨慎询问" }));
  expect(choiceVnFixtureV1.semantic.dispatch).toHaveBeenCalledWith(cautiousChoiceInvocation);
  expect(screen.getByRole("button", { name: "强行追问" })).toBeDisabled();
  expect(screen.getByText("尚未满足条件")).toBeVisible();
});

it("uses System > Overlay > Narrative and never leaks to Gameplay", () => {
  const fixture = createBlockingContextFixtureV1();
  fixture.openNarrative();
  fixture.openOverlay();
  fixture.openSystemDialog();
  expect(
    fixture.router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
  ).toEqual({
    kind: "handled",
    context: "system",
  });
  expect(fixture.overlay).not.toHaveBeenCalled();
  expect(fixture.narrative).not.toHaveBeenCalled();
  expect(fixture.gameplay).not.toHaveBeenCalled();
});

it("opens Settings above a blocking VN and returns to the launcher", async () => {
  render(<BlockingNarrativeWithSettingsHarnessV1 />);
  const launcher = screen.getByRole("button", { name: "设置" });
  await userEvent.setup().click(launcher);
  expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
  expect(screen.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
  expect(blockingNarrativeWithSettingsFixtureV1.gameplayDispatch).not.toHaveBeenCalled();
  await userEvent.setup().keyboard("{Escape}");
  expect(launcher).toHaveFocus();
  expect(screen.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
});
```

Add tests for replacing a primary Overlay clearing details, `focus_loss` never selecting a VN choice or confirmation, Overlay/VN unmount unregistering contexts, disabled direct actions remaining visible, system confirmation requiring an explicit second activation, and reduced-motion VN reveal showing final text without a timer.

- [ ] **Step 2: Run focused blocking-surface tests and confirm the hosts are absent**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/overlays src/narrative src/system
```

Expected: FAIL because the bounded Overlay store and blocking layer hosts do not exist.

- [ ] **Step 3: Verify the R1-pinned dialog dependency at its owner**

Run:

```bash
pnpm verify:materialization
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const ui = JSON.parse(await readFile("engine/packages/ui/package.json", "utf8"));
assert.equal(
  ui.dependencies?.["@radix-ui/react-dialog"],
  "1.1.19",
  "external_precondition.materialization_stale",
);
NODE
pnpm install --offline --frozen-lockfile
```

Expected: the verifier proves `@radix-ui/react-dialog@1.1.19` is already an exact UI dependency and the offline frozen install changes no bytes; React/React DOM remain peer-owned as frozen in Task 4. Missing or mismatched dependency evidence is `external_precondition.materialization_stale`, not a mid-Goal install decision.

- [ ] **Step 4: Implement the bounded application-owned Overlay session**

```ts
export interface OverlaySessionStateV1<TOverlayId> {
  readonly primaryId: TOverlayId | null;
  readonly detailIds: readonly TOverlayId[];
}

export interface OverlaySessionStoreV1<TOverlayId> {
  getSnapshot(): DeepReadonly<OverlaySessionStateV1<TOverlayId>>;
  subscribe(listener: () => void): () => void;
  openPrimary(id: TOverlayId): void;
  pushDetail(
    id: TOverlayId,
  ):
    | { readonly kind: "opened" }
    | { readonly kind: "rejected"; readonly code: "no_primary" | "duplicate" | "detail_limit" };
  closeTop(): "detail_closed" | "primary_closed" | "already_closed";
  closeAll(): void;
}

export const maximumOverlayDetailDepthV1 = 4 as const;
```

Opening a new primary replaces the previous primary and clears its details in one immutable publication. Detail IDs are unique across the current stack and preserve open order. Store state is application/UI session state only; it has no codec, persistence adapter, semantic revision, or Snapshot integration.

`OverlayHostV1` consumes the store plus a closed renderer resolver supplied by the application. It renders one primary Radix Dialog and the ordered detail stack in the workspace-overlay Stage layer, registers `overlay` while any entry is active, closes only the top entry on `ui.cancel`, blocks lower viewport events, and reports an unknown renderer as bounded `ui.overlay_renderer_missing`. It never guesses a Story overlay from a route or action ID.

- [ ] **Step 5: Implement exact-invocation VN and System controls**

```ts
export interface VnChoiceV1<TInvocation> {
  readonly choiceId: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly disabledReasons: readonly string[];
  readonly invocation: DeepReadonly<TInvocation>;
}

export interface VnLayerPropsV1<TInvocation, TResult> {
  readonly active: boolean;
  readonly accessibleName: string;
  readonly speakerLabel: string | null;
  readonly text: string;
  readonly choices: readonly VnChoiceV1<TInvocation>[];
  readonly advance: VnChoiceV1<TInvocation> | null;
  readonly semantic: Pick<
    SemanticGamePortV1<unknown, unknown, unknown, TInvocation, unknown, TResult>,
    "dispatch"
  >;
  readonly inputRouter: InputRouterV1;
}
```

When active, `VnLayerV1` registers `narrative`, makes the Gameplay/Interaction layers inert through routing, and dispatches only a supplied choice/advance invocation. It does not infer Narrative state, advance a cursor locally, or optimistically display the next line. Save, Settings, diagnostics, and System controls remain reachable because they live above Narrative or outside its Stage Pointer target.

`ActionConfirmationDialogV1` and `SystemDialogHostV1` register `system`, require native confirm/cancel buttons, return focus to the exact opener, expose a live result region, and dispatch only the explicit invocation supplied to the confirmation. No generic component accepts a raw Story Command, State path, callback script, or arbitrary renderer import.

`SettingsLauncherV1` is a native button in the always-reachable System layer. It asks the existing `SystemDialogHostV1` to open the reserved code-native `settings` surface; while open, that host owns the `system` Input context above Narrative and returns focus to the launcher on close. `SettingsDialogV1` renders an accessible title, close control, and an ordered readonly list of application-composed settings-section React nodes. Settings sections are intentionally outside the seven renderer namespaces and their frozen `{ viewSlice, semantic, presentation }` context; the Story application root may construct a section with its own narrow Host preference port. `SettingsDialogV1` itself owns no preference value, codec, storage, Gameplay command, or Story ID; an empty list renders a truthful “no adjustable settings” state supplied as text by the application. Phase 5B supplies the actual E2E/PoC section nodes and binds any preference controls to their existing Host ports.

- [ ] **Step 6: Run blocking surfaces, styles, input, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/overlays src/narrative src/system src/input src/shell
pnpm lint:styles
pnpm typecheck
pnpm verify:boundaries
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; System/Overlay/Narrative events never reach Interaction/Gameplay, and closing each blocking surface returns focus.

- [ ] **Step 7: Stage the exact blocking-surface slice and commit**

```bash
git add -- engine/packages/ui/src/overlays engine/packages/ui/src/narrative engine/packages/ui/src/system engine/packages/ui/src/shell/game-stage.tsx engine/packages/ui/src/index.ts
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(ui): add overlay vn and system hosts"
```

Expected staged paths are only the listed Overlay/Narrative/System files, `game-stage.tsx`, and UI exports; the R1-owned dependency manifest entries and lockfile remain byte-identical.

## Task 6: Add persistence, diagnostics, and recovery surfaces

**Files:**

- Create: `engine/packages/ui/src/persistence/save-overlay.tsx`
- Create: `engine/packages/ui/src/persistence/save-overlay.module.css`
- Create: `engine/packages/ui/src/persistence/save-overlay.test.tsx`
- Create: `engine/packages/ui/src/persistence/index.ts`
- Create: `engine/packages/ui/src/errors/root-error-boundary.tsx`
- Create: `engine/packages/ui/src/errors/runtime-failure-dialog.tsx`
- Create: `engine/packages/ui/src/errors/errors.test.tsx`
- Create: `engine/packages/ui/src/errors/index.ts`
- Create: `engine/packages/ui/src/diagnostics/diagnostic-export-button.tsx`
- Create: `engine/packages/ui/src/diagnostics/diagnostic-export-button.test.tsx`
- Create: `engine/packages/ui/src/diagnostics/index.ts`
- Modify: `engine/packages/ui/src/shell/game-shell.tsx`
- Modify: `engine/packages/ui/src/index.ts`

**Interfaces:**

- Consumes: Phase 3 player-safe persistence status/operations, four physical Save slots, player-safe `diagnostics.exportDebugBundle`, lifecycle recovery operations, `RuntimeSessionStatusV1`, System/Overlay hosts, and application-supplied labels.
- Produces: `SaveOverlayV1`, `RootErrorBoundaryV1`, `RuntimeFailureDialogV1`, and `DiagnosticExportButtonV1`; it does not expose DebugTools or a Snapshot setter.

- [ ] **Step 1: Write failing Save truthfulness, degraded recovery, and diagnostic reachability tests**

```tsx
it("shows all four slots but writes only Quick and Manual", async () => {
  render(<SaveOverlayV1 {...saveOverlayFixtureV1} />);
  expect(screen.getAllByRole("listitem").map((entry) => entry.dataset.slotId)).toEqual([
    "auto.current",
    "auto.previous",
    "quick",
    "manual",
  ]);
  expect(screen.queryByRole("button", { name: "写入当前自动存档" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "手动保存" })).toBeEnabled();
});

it("does not report success before the persistence operation commits", async () => {
  const fixture = createPendingSaveOverlayFixtureV1();
  render(<SaveOverlayV1 {...fixture.props} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "快速保存" }));
  expect(screen.getByText("正在安全写入…")).toBeVisible();
  expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  fixture.resolve({ kind: "saved", slotId: "quick" });
  expect(await screen.findByText("已保存")).toBeVisible();
});

it("keeps current-session export available when storage is unavailable", async () => {
  render(<SaveOverlayV1 {...unavailableStorageFixtureV1} />);
  expect(screen.getByText("本地存储不可用")).toBeVisible();
  expect(screen.getByRole("button", { name: "导出当前进度" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
});

it.each(["ready", "busy", "fault_paused"] as const)(
  "keeps DebugBundle export reachable while the session is %s",
  async (status) => {
    const fixture = diagnosticFixtureV1(status);
    render(<DiagnosticExportButtonV1 {...fixture.props} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "导出诊断包" }));
    expect(fixture.diagnostics.exportDebugBundle).toHaveBeenCalledOnce();
  },
);
```

Add tests for empty/valid/invalid/recovery-candidate/busy/unavailable slot states, explicit load/clear/import confirmation, conflict/fault result text, focus return, rejected import leaving the rendered semantic publication unchanged, Root Error Boundary fallback, retry/reload/exit button availability, and a throwing export operation becoming a bounded UI failure rather than an unhandled rejection.

- [ ] **Step 2: Run focused persistence/recovery tests and confirm the surfaces are absent**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/persistence src/errors src/diagnostics
```

Expected: FAIL because the generic player-safe persistence and recovery surfaces do not exist.

- [ ] **Step 3: Implement a narrow UI-facing persistence contract over Phase 3 ports**

```ts
export type SaveUiWritableSlotIdV1 = "quick" | "manual";
export type SaveUiReadableSlotIdV1 = "auto.current" | "auto.previous" | SaveUiWritableSlotIdV1;

export interface SaveOverlayPortV1<TSlotSummary, TOperationResult, TExportResult> {
  getStatus(): DeepReadonly<PersistenceStatusV1>;
  listSlots(): Promise<readonly DeepReadonly<TSlotSummary>[]>;
  save(slotId: SaveUiWritableSlotIdV1): Promise<TOperationResult>;
  load(slotId: SaveUiReadableSlotIdV1): Promise<TOperationResult>;
  clear(slotId: SaveUiReadableSlotIdV1): Promise<TOperationResult>;
  importSave(): Promise<TOperationResult>;
  exportSave(slotId: SaveUiReadableSlotIdV1): Promise<TExportResult>;
  exportCurrentSave(): Promise<TExportResult>;
}
```

The Story Application passes the Phase 3 low-authority persistence subport through this structural interface; do not create another storage service, cache, status machine, or DTO translation that changes its result codes. Render the fixed slot order above and map every Phase 3 health/status/result variant exhaustively. Only a resolved `saved` result displays success. Load, clear, and import use `ActionConfirmationDialogV1`; a rejected/faulted operation leaves the current Semantic publication untouched and moves focus to the result summary.

`SaveOverlayV1` never captures Snapshot, serializes bytes, chooses provenance, repairs Auto slots, imports a file directly, calls IndexedDB, or creates a Save result locally. It receives no DebugTools port.

- [ ] **Step 4: Implement player-safe failure and diagnostic recovery**

```ts
export interface DiagnosticExportPortV1<TExportResult> {
  exportDebugBundle(): Promise<TExportResult>;
}

export interface RuntimeFailureDialogActionsV1 {
  readonly retry: (() => void) | null;
  readonly reloadApplication: () => void;
  readonly requestExit: (() => void) | null;
}
```

`DiagnosticExportButtonV1` consumes only `GameApplicationPortV1.diagnostics.exportDebugBundle`; it has no inspect/replay/anchor/debug-command method and remains in the System layer for `ready`, `busy`, and `fault_paused`. It reports pending/success/typed failure through an ARIA live region and cannot change `RunIntegrityV1`.

`RootErrorBoundaryV1` catches React render/lifecycle faults, reports one bounded Runtime/Application failure, and renders `RuntimeFailureDialogV1`. The dialog registers System input, exposes only actions actually supplied by the application, and keeps diagnostic export reachable. Retrying remounts the failed subtree; reload/exit call the narrow Host navigation operations. Neither path pretends a UI failure is a Gameplay rejection or modifies Session state directly.

- [ ] **Step 5: Run persistence, error, diagnostic, style, UI, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/persistence src/errors src/diagnostics src/overlays src/system
pnpm lint:styles
pnpm typecheck
pnpm verify:boundaries
pnpm verify:ui
pnpm verify
git diff --check
```

Expected: every command exits 0; storage failure still permits current-session and diagnostic export, and UI receives no Snapshot setter, DebugTools, or Host record store.

- [ ] **Step 6: Stage the exact persistence/recovery slice and commit**

```bash
git add -- engine/packages/ui/src/persistence engine/packages/ui/src/errors engine/packages/ui/src/diagnostics engine/packages/ui/src/shell/game-shell.tsx engine/packages/ui/src/index.ts
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(ui): add persistence and recovery surfaces"
```

Expected staged paths are only the listed persistence/errors/diagnostics modules, `game-shell.tsx`, and `engine/packages/ui/src/index.ts`.

## Task 7: Enforce runtime asset identity and freeze the Phase 5A gate

**Files:**

- Create: `scripts/assets/runtime-image-metadata.mts`
- Create: `scripts/assets/runtime-image-metadata.test.ts`
- Create: `scripts/assets/validate-runtime.mts`
- Create: `scripts/assets/validate-runtime.test.ts`
- Create: `scripts/assets/verify-runtime-assets.mts`
- Create: `scripts/assets/verify-runtime-assets.test.ts`
- Modify: `scripts/verify-assets.mjs`
- Modify: `scripts/verify-assets.test.mjs`
- Create: `scripts/ui/verify-ui.mts`
- Create: `scripts/ui/verify-ui.test.mjs`
- Modify: `scripts/run-script-tests.test.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: resolved E2E/PoC asset manifests after Phase 4B, exact repository-relative runtime paths, selected runtime bytes, Base asset provider metadata, the existing read-only Phase 4 and root verification structure, and no AIGC/reference directory.
- Produces: `readRuntimeImageMetadataV1`, `validateRuntimeAssetManifestV1`, a closed two-Story runtime asset verifier, inspect-only `pnpm verify:ui`, cumulative `pnpm verify:phase5a`, and one root Phase-5A verification child.

- [ ] **Step 1: Write failing path, bytes, dimensions, archive-exclusion, and gate-structure tests**

```ts
it("reads only exact runtime providers and never enumerates source archives", async () => {
  const reads: string[] = [];
  const result = await validateRuntimeAssetManifestV1(runtimeFixture.manifest, {
    repositoryRoot: runtimeFixture.root,
    readFile: async (path) => {
      reads.push(path);
      return runtimeFixture.files[path];
    },
    realpath: async (path) => path,
  });
  expect(result.errors).toEqual([]);
  expect(reads).toEqual(["game/packages/assets/e2e/scene.png"]);
  expect(
    reads.every((path) => !path.startsWith("art-source/") && !path.startsWith("references/")),
  ).toBe(true);
});

it.each([
  ["absolute-path", "asset.runtime_path_unsafe"],
  ["path-traversal", "asset.runtime_path_unsafe"],
  ["symlink-escape", "asset.runtime_path_escape"],
  ["missing-file", "asset.runtime_file_missing"],
  ["media-mismatch", "asset.runtime_media_mismatch"],
  ["byte-length-mismatch", "asset.runtime_byte_length_mismatch"],
  ["hash-mismatch", "asset.runtime_hash_mismatch"],
  ["dimension-mismatch", "asset.runtime_dimensions_mismatch"],
] as const)("rejects %s with %s", async (fixtureId, code) => {
  const result = await validateRuntimeFixtureV1(fixtureId);
  expect(result.errors.map((error) => error.code)).toContain(code);
});
```

```js
test("freezes the inspect-only UI command list", async () => {
  const { uiRuntimeVerificationCommandsV1 } = await import("./ui/verify-ui.mts");
  assert.deepEqual(uiRuntimeVerificationCommandsV1, [
    ["pnpm", ["--filter", "@sillymaker/ui", "test"]],
    ["pnpm", ["--filter", "@sillymaker/web", "exec", "vitest", "run", "src/assets", "src/input"]],
    ["pnpm", ["exec", "vitest", "run", "scripts/assets"]],
    ["pnpm", ["lint:styles"]],
    ["pnpm", ["verify:assets"]],
  ]);
  assert.doesNotMatch(
    JSON.stringify(uiRuntimeVerificationCommandsV1),
    /build|playwright|browser|update|regenerate|release|screenshot/u,
  );
});

test("makes Phase 5A cumulative without duplicate root children", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["verify:ui"],
    "node --experimental-strip-types scripts/ui/verify-ui.mts",
  );
  assert.equal(packageJson.scripts["verify:phase5a"], "pnpm verify:phase4 && pnpm verify:ui");

  const { coreVerificationCommandsV1 } = await import("./verify.mjs");
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  assert.equal(names.filter((name) => name === "verify:phase5a").length, 1);
  assert.equal(names.includes("verify:phase4"), false);
  assert.equal(names.includes("verify:ui"), false);
  assert.equal(names.filter((name) => name === "verify:semantic").length, 1);
});
```

- [ ] **Step 2: Run focused script tests and confirm the validator/gate are absent**

Run:

```bash
pnpm exec vitest run scripts/assets
node --experimental-strip-types --test scripts/ui/verify-ui.test.mjs scripts/verify-assets.test.mjs scripts/verify.test.mjs
```

Expected: FAIL because the runtime validator, UI verifier, and cumulative Phase 5A mapping do not exist.

- [ ] **Step 3: Implement deterministic PNG, WebP, and safe SVG metadata readers**

```ts
export type RuntimeImageMetadataV1 = {
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
};

export type RuntimeImageMetadataResultV1 =
  | { readonly kind: "valid"; readonly metadata: RuntimeImageMetadataV1 }
  | {
      readonly kind: "invalid";
      readonly code: "unsupported_media" | "invalid_bytes" | "unsafe_svg" | "invalid_dimensions";
    };

export function readRuntimeImageMetadataV1(
  bytes: Uint8Array,
  declaredMediaType: RuntimeImageMetadataV1["mediaType"],
): RuntimeImageMetadataResultV1;
```

For PNG, require the eight-byte signature, an `IHDR` first chunk, and positive big-endian width/height at bytes 16–23. For WebP, require `RIFF`/`WEBP`, bounds-check every chunk, and decode the first image-bearing `VP8 `, `VP8L`, or `VP8X` chunk according to its format width/height bit layout. For SVG, require valid UTF-8, one root `<svg>` with positive integer `width`, `height`, and matching numeric `viewBox`; reject doctype/entity, script, foreignObject, event-handler attributes, external/data URLs, CSS `url()`, and malformed/trailing roots. Declared media type must match detected bytes; no parser performs network or filesystem I/O.

Tests include one valid and truncated/overflow fixture for every supported image form, WebP odd-byte chunk padding, and SVG active-content cases.

- [ ] **Step 4: Implement exact runtime provider validation and the closed Story verifier**

```ts
export interface RuntimeAssetValidationEnvironmentV1 {
  readonly repositoryRoot: string;
  readFile(repositoryRelativePath: string): Promise<Uint8Array>;
  realpath(repositoryRelativePath: string): Promise<string>;
}

export interface RuntimeAssetValidationErrorV1 {
  readonly assetId: string;
  readonly code:
    | "asset.runtime_path_unsafe"
    | "asset.runtime_path_escape"
    | "asset.runtime_file_missing"
    | "asset.runtime_media_mismatch"
    | "asset.runtime_byte_length_mismatch"
    | "asset.runtime_hash_mismatch"
    | "asset.runtime_dimensions_mismatch";
}

export function validateRuntimeAssetManifestV1(
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  environment: RuntimeAssetValidationEnvironmentV1,
): Promise<{ readonly errors: readonly RuntimeAssetValidationErrorV1[] }>;
```

Inspect only entries whose delivery is `runtime_image`, in `manifest.assets` order. Require a relative POSIX `runtimePath` rooted in exactly `game/packages/assets/`, `game/stories/e2e/assets/`, or `game/stories/poc/assets/`; reject empty segments, `.`, `..`, absolute paths, backslashes, query, fragment, NUL, and encoded traversal before any read. Resolve the exact file once, require its realpath to remain under the declared allowed root, then check detected media type, exact byte length, `digestBytes(bytes) === sha256`, and decoded dimensions. Do not glob, walk, pair sidecars, or inspect prompts/licenses/source provenance.

`verify-runtime-assets.mts` imports only the two default Story entries and the Base resolver, resolves each once with the verification Host/empty Hotfix set, and passes `resolved.assets` to the generic validator. It imports no `.tsx` renderer/application/tooling entry. A fallback-only manifest performs zero file reads and passes if its slots/assets were already validated by Story resolution. `scripts/verify-assets.mjs` runs its existing checks and this child with Node type stripping, stops on first failure, and never modifies a manifest or asset.

- [ ] **Step 5: Implement the inspect-only UI leaf and cumulative Phase 5A gate**

Export and deep-freeze the exact `uiRuntimeVerificationCommandsV1` list asserted in Step 1. Execute sequentially with inherited stdio, stop on the first nonzero exit, reject signals as failure, and expose:

```json
{
  "scripts": {
    "verify:ui": "node --experimental-strip-types scripts/ui/verify-ui.mts",
    "verify:phase5a": "pnpm verify:phase4 && pnpm verify:ui"
  }
}
```

Update `coreVerificationCommandsV1` by replacing its one direct `verify:phase4` child with one direct `verify:phase5a` child. Keep the existing direct `verify:semantic` child and all unrelated root checks in their current relative order. Do not add a direct `verify:ui` child to root; it is already reached once through `verify:phase5a`. Structural tests reject recursion to `verify`, a direct Phase-4 child beside Phase 5A, duplicate asset/UI tests, and any writer/update/generator/browser command inside `verify:ui`.

`scripts/run-script-tests.test.mjs` must discover each new `.test.ts`/`.test.mjs` exactly once through the existing classifier; do not create an ad hoc second script-test runner.

- [ ] **Step 6: Run the complete Phase 5A gate twice and prove tracked bytes are immutable**

Run:

```bash
pnpm verify:materialization
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:assets
pnpm verify:ui
pnpm verify:phase5a
pnpm verify
pnpm verify:phase5a
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git diff --check
git status --short --branch
```

Expected: all commands exit 0; Phase 5A passes twice; runtime asset validation reads no fallback-only bytes and never touches `art-source/aigc/**` or `references/**`; every tracked hash is unchanged; only the intentional unstaged Phase 5A implementation remains before staging.

- [ ] **Step 7: Stage the exact validator/gate slice and commit**

```bash
git add -- scripts/assets scripts/ui scripts/verify-assets.mjs scripts/verify-assets.test.mjs scripts/run-script-tests.test.mjs scripts/verify.mjs scripts/verify.test.mjs package.json
git diff --cached --name-only
git diff --cached --check
git commit -m "test(ui): freeze phase five a runtime gate"
```

Expected staged paths are only `scripts/assets/**`, `scripts/ui/**`, the listed existing verifier/test files, and root `package.json`.

---

## Phase 5A Acceptance

- [ ] `AssetRegistryV1.preload` accepts only exact `AssetId[]` demand plus `AbortSignal`; filtered/unselected IDs are not fetched, decoded, or diagnosed, and no coarse `bootstrap | scene | overlay` preload API exists.
- [ ] One final URL+digest is loaded once per registry lifetime; each demanded ID receives an ordered `loaded | fallback | aborted` result, and one failure never rejects unrelated demand.
- [ ] Shared load completion swaps one cached readiness publication and rerenders `usePresentationAssetV1` consumers from fallback to runtime image without changing Semantic or RuntimePresentation revision; caller cancellation cannot suppress that shared publication.
- [ ] `PresentationReadPortV1` exposes resolved text/assets and validated fallbacks without catalogs, runtime paths, providers, or manifests.
- [ ] React consumes one immutable `SemanticPublicationV1`; `game`, `narrative`, `actions`, `status`, and `revision` never come from separate observations or a second availability calculation.
- [ ] The renderer registry has seven independent neutral namespaces and renderer context is exactly `{ viewSlice, semantic, presentation }`.
- [ ] `GameSymbol` is a separate neutral Story-supplied registry with 16/20/24/32 px and accessible/code-native fallback contracts; Lucide remains limited to system UI and no PoC/E2E symbol ID enters UI.
- [ ] Input includes the reserved `interaction` context plus viewport point, pointer cancel, and focus-loss events; browser code owns Pointer lifecycle while Stage/renderer geometry remains unimplemented until Phase 5B.
- [ ] One mouse/touch/pen physical activation cannot double-dispatch; native button and keyboard activation remain browser-owned.
- [ ] GameStage always mounts `background → character → scene_interaction → hud → workspace_overlay → narrative → system` in that order and only the interaction layer is the Stage Pointer surface.
- [ ] Stage framing passes 1024×768, 768×1024, 1600×1000, and 2560×1080 contracts; width never exceeds 1600 and authored landscape composition never exceeds 16:10.
- [ ] Overlay supports exactly one primary plus at most four details; VN/Overlay/System use the required input priority, never leak to Gameplay, expose semantic DOM, and return focus on close. A blocking VN keeps Save, Settings, diagnostic export, and System controls reachable above the Stage pointer target.
- [ ] Save UI represents all Phase 3 status/result variants truthfully, writes only Quick/Manual, and leaves current-session plus diagnostic export reachable during storage/session failure.
- [ ] Runtime asset validation checks safe exact path, realpath containment, media bytes, byte length, SHA-256, and dimensions without directory enumeration or source-archive access; fallback-only manifests perform zero runtime file reads.
- [ ] Phase 5A adds no PoC character/scene/HitMap/interaction implementation, RuntimePresentationStore/projector, ContentPreference behavior, Story Web root, DevDock, Debug/Cheat UI, Automation Bridge, browser facade, Gameplay contract, or persistent state.
- [ ] `pnpm verify:materialization` passes from the unchanged R1 tracked contract/local attestation; all Phase 5A dependency consumption is offline/frozen and changes no dependency manifest entry or lockfile byte.
- [ ] `pnpm verify:ui`, cumulative `pnpm verify:phase5a`, and full `pnpm verify` pass without rewriting tracked files; root verification reaches Phase 5A exactly once and keeps the direct semantic gate separate.
