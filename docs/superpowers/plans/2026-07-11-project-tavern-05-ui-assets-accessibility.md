# Project Tavern Phase 5 UI, Assets, and Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete Player and Developer browser experiences over the already verified runtime, using a generic MIT UI package, Story/Module-owned UI contributions, deterministic runtime asset resolution, accessible DOM interaction, and a complete code-native fallback.

**Architecture:** React receives only immutable `RuntimeViewModelEnvelopeV1`, `PlayerApplicationPortV1`, and `PresentationReadPortV1`; it never imports Snapshot, EngineSession, Story rules, owner capabilities, raw TextCatalogs, or Asset Packs. `@project-tavern/ui` owns generic shell/primitives/registry behavior, while `@project-tavern/modules` and `stories/demo` own tavern-specific HUD, overlays, Scenes, and copy. Browser image loading resolves through the frozen asset manifest and always retains a code-native fallback.

**Tech Stack:** React 19.2.7, React DOM 19.2.7, React Router DOM 7.18.1, Zustand 5.0.14, Radix Dialog 1.1.19, Motion 12.42.2, Lucide React 1.24.0, CSS Modules, Stylelint 17.14.0 with stylelint-config-standard 40.0.0, React Testing Library 16.3.2, user-event 14.6.1, Playwright 1.61.1, @axe-core/playwright 4.12.1.

## Global Constraints

- Phases 1–4 and their acceptance commands must pass from the live phase base SHA before this plan starts.
- `packages/ui/**` and game-neutral `apps/web/**` are MIT; tavern-specific renderers under `packages/modules/**` and Story Scene glue are PolyForm; original text and media remain CC BY-NC-SA. Every new source file carries the correct SPDX header.
- The Player renderer context is exactly `{ viewSlice, playerPort, presentation }`; Developer renderers may additionally receive the Developer control port.
- React, Zustand, CSS, Story Scene code, and Hotfixes never write `GameState` or keep a second Snapshot.
- One primary Workspace Overlay may be open; a bounded detail stack may sit above it. VN blocks gameplay commands but not explicitly allowed save/export/system operations.
- Runtime controls, player-visible text, focus indicators, and system symbols are semantic DOM/code-native. Generated screenshots never become interactive UI.
- The mandatory phase gate succeeds with the whole `art-source/aigc/**` archive excluded from builds and every current resolved asset using its code fallback.
- Runtime validators inspect only promoted files under `packages/assets/**` or Story asset directories. They validate technical manifest/byte identity and never scan AIGC source archives or infer copyright status.
- Support 1024×768 landscape and 768×1024 portrait tablets, use 1600×1000 as the design basis, stop stage stretching beyond 16:10, and preserve functional reflow at equivalent 200% zoom.
- Interactive targets are at least 44×44 CSS px, information is never hover-only, keyboard focus returns after Dialog/Overlay closure, and reduced-motion removes nonessential transitions.
- Browser tests use semantic role/name or stable `data-testid` only for non-semantic stage layers. They do not locate controls by CSS implementation class.
- Every new `scripts/**/*.test.ts` remains owned by Phase 1's recursive `scripts` Vitest project and `pnpm test:scripts`; Phase 5 must prove the real nested UI/asset tests are discovered rather than relying only on focused filenames.
- Every task ends with its focused suite, `pnpm verify:ui` as it exists at that commit, the current full `pnpm verify`, an exact staged-diff review, and a focused commit.

---

## File Map

```text
packages/ui/src/assets/                 # MIT browser AssetRegistry and PresentationReadPort adapter
packages/ui/src/runtime/                # MIT immutable view subscription bridge
packages/ui/src/contributions/          # MIT Scene/HUD/Overlay/Symbol registries
packages/ui/src/primitives/             # MIT accessible UI primitives
packages/ui/src/shell/                  # MIT GameShell, GameStage, overlay/narrative hosts
packages/ui/src/developer/              # MIT Developer-only framework exported from ./developer
packages/ui/src/theme/                  # MIT tokens and responsive framing
packages/modules/src/ui/                # PolyForm HUD and management-overlay contributions
stories/demo/src/presentation/          # PolyForm Story-owned Scenes and contribution composition
stories/demo/src/application/           # PolyForm Player/Developer roots and Demo HMR/rebootstrap wiring
stories/e2e/src/presentation/           # PolyForm stable browser integration Scenes
packages/assets/src/                    # mixed-license project asset/fallback declarations
apps/web/src/                           # MIT generic WebHost/Loader composition
apps/web/e2e/                           # PolyForm game-specific browser flows
scripts/assets/                         # runtime manifest/byte validators
scripts/ui/                             # flavor and renderer-boundary validators
```

### Task 1: Implement the browser AssetRegistry and PresentationReadPort

**Files:**

- Create: `packages/ui/src/assets/asset-registry.ts`
- Create: `packages/ui/src/assets/asset-registry.test.ts`
- Create: `packages/ui/src/assets/image-loader.ts`
- Create: `packages/ui/src/assets/image-loader.test.ts`
- Create: `packages/ui/src/assets/presentation-read-port.ts`
- Create: `packages/ui/src/assets/presentation-read-port.test.ts`
- Create: `packages/ui/src/assets/index.ts`
- Create: `packages/ui/type-tests/assets-public.test-d.ts`
- Modify: `packages/ui/package.json`
- Modify: `apps/web/package.json`
- Modify: root `package.json`
- Modify: `pnpm-lock.yaml`
- Test: `packages/ui/src/assets/*.test.ts`

**Interfaces:**

- Consumes: generic resolved-asset/text-catalog inputs, current locale, and a type-parameterized asset-diagnostic sink; Story/Application composition maps its concrete fault codes without exposing them to UI.
- Produces: generic `createAssetRegistry(manifest, loader, diagnostics)`, `registry.preload(group, signal)`, and `createPresentationReadPort(...)` implementations of the Base presentation contracts.

- [ ] **Step 1: Add reviewed exact UI dependencies and notices**

Run:

```bash
pnpm --filter @project-tavern/ui add --save-peer --save-exact react-dom@19.2.7
pnpm --filter @project-tavern/ui add --save-exact zustand@5.0.14 @radix-ui/react-dialog@1.1.19 motion@12.42.2 lucide-react@1.24.0
pnpm --filter @project-tavern/web add --save-dev --save-exact @axe-core/playwright@4.12.1
pnpm add --workspace-root --save-dev --save-exact stylelint@17.14.0 stylelint-config-standard@40.0.0
```

Phase 1 already supplies the exact React peer/development pair. The first command adds the exact ReactDOM peer plus pnpm's matching development entry before Radix/Motion are installed; with strict peer checking UI may not rely on the sibling Web package's ReactDOM. Regenerate the frozen lockfile and run the focused UI/type checks; expected: exact dependency pins are present without producing a dependency notice inventory.

- [ ] **Step 2: Write failing registry, fallback, and localization tests**

```ts
it("deduplicates URL plus digest and returns a result for every AssetId", async () => {
  const loader = createFakeImageLoader({ "assets/scene.webp": "loaded" });
  const registry = createAssetRegistry(runtimeImageManifestWithSharedUrl, loader, diagnostics);
  const result = await registry.preload("scene", new AbortController().signal);
  expect(result.map((entry) => entry.status)).toEqual(["loaded", "loaded"]);
  expect(loader.calls).toEqual(["assets/scene.webp#sha256:scene"]);
});

it("falls back per asset without rejecting the preload batch", async () => {
  const registry = createAssetRegistry(runtimeImageManifest, failingLoader, diagnostics);
  await expect(registry.preload("scene", neverAborted)).resolves.toMatchObject([
    { assetId: assetId("asset.test.scene"), status: "fallback" },
  ]);
  expect(registry.resolve(assetId("asset.test.scene"), syntheticSceneUsage).delivery).toBe(
    "code_fallback",
  );
});

it("resolves locale fallback without exposing the catalog", () => {
  const port = createPresentationReadPort({ catalogs, locale: locale("zh-Hant"), registry });
  expect(port.text(textId("ui.save"))).toEqual({
    textId: textId("ui.save"),
    requestedLocale: locale("zh-Hant"),
    resolvedLocale: locale("zh-CN"),
    text: "保存",
  });
  expect(port).not.toHaveProperty("catalogs");
});
```

- [ ] **Step 3: Run the focused tests and verify the target behavior is absent**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/assets`

Expected: FAIL because `createAssetRegistry` and `createPresentationReadPort` are not exported.

- [ ] **Step 4: Implement the closed registry and read port**

```ts
export interface AssetLoadResultV1<TAssetId> {
  readonly assetId: TAssetId;
  readonly status: "loaded" | "fallback" | "aborted";
}

export interface AssetRegistryV1<TAssetId, TUsage, TFallbackToken> {
  resolve(
    assetId: TAssetId,
    usage: TUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TUsage, TFallbackToken>;
  preload(
    group: "bootstrap" | "scene" | "overlay",
    signal: AbortSignal,
  ): Promise<readonly AssetLoadResultV1<TAssetId>[]>;
}
```

Implement load order as `bootstrap → scene → overlay`, manifest order within a group, and URL+sha256 deduplication for one registry lifetime. Abort marks unfinished entries `aborted`; a fetch/decode failure marks that entry `fallback` and emits one diagnostic per URL/error code/load cycle. `resolve` validates the requested usage and never returns `runtimePath` or a raw provider record.

UI contract/type tests use only synthetic IDs/usages and assert no source import or literal references `AssetUsageV1`, Demo Asset IDs, `@project-tavern/modules`, or a Story. Story composition adapts its concrete `ResolvedAssetManifestV1`/`TextCatalogSetV1` into these generics.

Expose this player-safe surface only as `@project-tavern/ui/assets` mapped to `./src/assets/index.ts`; do not leak loaders/registries through `@project-tavern/ui/developer` or an internal deep path. The consumer type-test imports every public asset/presentation symbol from that subpath and includes `@ts-expect-error` deep-import/Developer assertions.

- [ ] **Step 5: Run focused and package verification**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/assets && pnpm typecheck && pnpm verify:ui && pnpm verify`

Expected: PASS; tracked files remain unchanged after the commands.

- [ ] **Step 6: Commit the AssetRegistry slice**

```bash
git add -- packages/ui/src/assets packages/ui/type-tests/assets-public.test-d.ts packages/ui/package.json apps/web/package.json package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(ui): add resolved asset presentation port"
```

### Task 2: Build the UI contribution registry and immutable view bridge

**Files:**

- Create: `packages/ui/src/contributions/types.ts`
- Modify: `packages/ui/src/contributions/registry.ts`
- Modify: `packages/ui/src/contributions/registry.test.ts`
- Modify: `packages/ui/src/runtime/create-view-bridge.ts`
- Modify: `packages/ui/src/runtime/create-view-bridge.test.tsx`
- Create: `packages/ui/src/runtime/use-runtime-view.ts`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Consumes: `ReadonlyViewSourceV1`, Player renderer context, `UiContributionSetV1`.
- Produces: `createUiContributionRegistry`, `createRuntimeViewBridge`, `useRuntimeView`, and unique Scene/Overlay/HUD/Symbol lookup.

- [ ] **Step 1: Write failing uniqueness and one-way-subscription tests**

```tsx
it("rejects duplicate contribution IDs before React renders", () => {
  expect(() => createUiContributionRegistry([setA, setWithDuplicateScene])).toThrowError(
    /ui\.duplicate_scene_id/,
  );
});

it("publishes the exact immutable view reference from the application port", () => {
  const source = createFakeReadonlyViewSource(view0);
  const bridge = createRuntimeViewBridge(source);
  const seen: RuntimeViewModel[] = [];
  const unsubscribe = bridge.subscribe(() => seen.push(bridge.getState()));
  source.publish(view1);
  expect(seen).toEqual([view1]);
  expect(bridge.getState()).toBe(view1);
  expect(bridge.getState()).not.toHaveProperty("snapshot");
  unsubscribe();
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/contributions src/runtime`

Expected: FAIL on the newly required four-namespace uniqueness and Zustand-backed immutable subscription behavior; the Phase 1 minimal registry/bridge already exist and must remain green for their original Sandbox cases.

- [ ] **Step 3: Implement registries and the Zustand vanilla adapter**

```ts
export interface PlayerRendererContextV1<TViewSlice, TPlayerPort, TPresentation> {
  readonly viewSlice: DeepReadonly<TViewSlice>;
  readonly playerPort: TPlayerPort;
  readonly presentation: TPresentation;
}

export function createRuntimeViewBridge<T>(source: ReadonlyViewSourceV1<T>) {
  const store = createStore<{ readonly view: DeepReadonly<T> }>(() => ({
    view: source.getCurrent(),
  }));
  const disconnect = source.subscribe(() => {
    store.setState({ view: source.getCurrent() });
  });
  return {
    getState: () => store.getState().view,
    subscribe: store.subscribe,
    destroy: disconnect,
  };
}
```

Use four separate Maps for Scene, Overlay, HUD, and GameSymbol IDs, freeze the constructed registry, and reject duplicates with stable codes. The Zustand adapter stores only the latest view reference; Overlay selection, focused detail ID, and DevDock visibility live in a separate UI-session store.

- [ ] **Step 4: Run package and architecture checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/contributions src/runtime && pnpm verify:boundaries && pnpm verify:cycles && pnpm verify`

Expected: PASS; the MIT UI graph has no import from `packages/modules`, `stories`, or CC media.

- [ ] **Step 5: Commit the contribution boundary**

```bash
git add -- packages/ui/src/contributions packages/ui/src/runtime packages/ui/src/index.ts
git diff --cached --check
git commit -m "feat(ui): add typed contribution registry"
```

### Task 3: Implement GameShell, GameStage, tokens, and responsive framing

**Files:**

- Create: `packages/ui/src/theme/tokens.css`
- Create: `packages/ui/src/theme/global.css`
- Create: `packages/ui/src/primitives/Button.tsx`
- Create: `packages/ui/src/primitives/IconButton.tsx`
- Create: `packages/ui/src/primitives/ProgressMeter.tsx`
- Modify: `packages/ui/src/shell/game-shell.tsx`
- Modify: `packages/ui/src/shell/game-shell.module.css`
- Modify: `packages/ui/src/shell/game-shell.test.tsx`
- Create: `packages/ui/src/shell/game-stage.tsx`
- Create: `packages/ui/src/shell/game-stage.module.css`
- Create: `packages/ui/src/shell/game-stage.test.tsx`
- Create: `packages/ui/src/shell/system-dialog-host.tsx`
- Create: `.stylelintrc.json`
- Modify: root `package.json`
- Test: `packages/ui/src/shell/*.test.tsx`

**Interfaces:**

- Consumes: contribution registry, RuntimeViewModel envelope, PresentationReadPort.
- Produces: the seven fixed stage layers, generic HUD slots, Overlay/VN/System hosts, and capped 16:10 frame.

- [ ] **Step 1: Write failing semantic-layer and framing tests**

```tsx
render(<GameStage harness={stageHarness} />);
expect(screen.getByTestId("scene-background")).toHaveAttribute("data-layer", "1");
expect(screen.getByTestId("character-layer")).toHaveAttribute("data-layer", "2");
expect(screen.getByTestId("scene-interaction-layer")).toHaveAttribute("data-layer", "3");
expect(screen.getByTestId("hud-layer")).toHaveAttribute("data-layer", "4");
expect(screen.getByTestId("workspace-overlay-layer")).toHaveAttribute("data-layer", "5");
expect(screen.getByTestId("narrative-layer")).toHaveAttribute("data-layer", "6");
expect(screen.getByTestId("system-layer")).toHaveAttribute("data-layer", "7");
expect(screen.getByRole("main", { name: "游戏舞台" })).toBeVisible();
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/shell`

Expected: FAIL because the seven-layer GameStage and responsive framing are absent; extend the Phase 1 `game-shell.tsx` instead of creating a task-specific duplicate.

- [ ] **Step 3: Implement semantic primitives and the fixed stage**

```css
.frame {
  inline-size: min(100vw, calc(100vh * 1.6));
  max-inline-size: 1600px;
  aspect-ratio: 16 / 10;
  margin-inline: auto;
  position: relative;
}
@media (max-aspect-ratio: 4 / 3) {
  .frame {
    aspect-ratio: auto;
    min-block-size: 100dvh;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms;
    transition-duration: 1ms;
  }
}
```

Use semantic buttons, headings, lists, progressbar attributes, and live regions. Background fill outside the capped frame may use tokens/blur but cannot stretch the scene. Keep every stage layer mounted in fixed order; inactive Overlay/Narrative hosts render empty regions rather than reordering layers.

Add root script `lint:styles` as `stylelint "packages/**/*.css" "stories/**/*.css" "apps/**/*.css"`. `.stylelintrc.json` extends the pinned standard config, enables invalid/duplicate declaration checks, and contains only the reviewed CSS Modules exceptions. Ignore only generated build/report output; the command is read-only.

- [ ] **Step 4: Run focused tests, stylelint, and Story-neutral boundary checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/shell && pnpm lint:styles && pnpm verify:boundaries && pnpm verify`

Expected: PASS with no Demo IDs or commands in `packages/ui`.

- [ ] **Step 5: Commit the generic shell**

```bash
git add -- packages/ui/src/theme packages/ui/src/primitives packages/ui/src/shell .stylelintrc.json package.json
git diff --cached --check
git commit -m "feat(ui): add responsive game stage shell"
```

### Task 4: Add the generic VN layer and blocking-input policy

**Files:**

- Create: `packages/ui/src/narrative/VnLayer.tsx`
- Create: `packages/ui/src/narrative/VnLayer.module.css`
- Create: `packages/ui/src/narrative/VnLayer.test.tsx`
- Create: `packages/ui/src/narrative/use-vn-input-policy.ts`
- Create: `packages/ui/src/narrative/use-vn-input-policy.test.ts`
- Modify: `packages/ui/src/shell/game-stage.tsx`
- Test: `packages/ui/src/narrative/*.test.tsx`

**Interfaces:**

- Consumes: Story-provided renderer binding, generic `VnPresentationViewV1<TCommand,TTextId,TAssetId>` primitives, opaque exact projected commands, and presentation port.
- Produces: accessible narration/line/choice/check primitives and a policy that disables gameplay actions while preserving allowed system operations; it never imports Demo Narrative or command types.

- [ ] **Step 1: Write failing line, choice, disabled-reason, and input-policy tests**

```tsx
render(<VnLayer context={contextForChoiceNode} />);
expect(screen.getByRole("dialog", { name: "剧情" })).not.toHaveAttribute("aria-modal", "true");
await user.click(screen.getByRole("button", { name: "谨慎询问" }));
expect(playerPort.commands.dispatch).toHaveBeenCalledWith(opaqueChoiceCommand);
expect(screen.getByRole("button", { name: "强行追问" })).toBeDisabled();
expect(screen.getByText("尚未满足条件")).toBeVisible();
expect(gameplayAction).toHaveAttribute("aria-disabled", "true");
expect(saveButton).not.toBeDisabled();
```

- [ ] **Step 2: Run the focused VN tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/narrative`

Expected: FAIL on missing VN components.

- [ ] **Step 3: Implement VN using projections only**

```ts
export const allowedDuringBlockingNarrative = new Set([
  "save.quick",
  "save.manual",
  "save.export",
  "diagnostics.export",
  "settings.open",
]);
```

Resolve speaker names, line text, disabled reasons, and stage assets only through PresentationReadPort. Dispatch the exact command stored in the projection; do not rebuild Scene/Node/Choice IDs from DOM state. Move focus to the first enabled choice or Advance button and restore it to the invoking stage control when Narrative completes.

`@project-tavern/ui` defines only a generic discriminated presentation view whose text/asset references and `TCommand` are type parameters. Each Story/Modules presentation adapter transforms its own `NarrativeProjectionV1` into that view and stores the exact typed command as an opaque value. Add a boundary/type test proving `packages/ui` has no import or type reference to `@project-tavern/modules`, `GameCommandV1`, `NarrativeProjectionV1`, or Demo IDs.

VN is a blocking gameplay layer, not an ARIA-modal system dialog: while active, mark the gameplay-action region inert/disabled and expose its reason, but keep the separate top-level system-operation region (Save/export/settings/diagnostics) reachable by keyboard and assistive technology. Do not trap focus in VN while those operations are promised available; actual modal confirmation/system dialogs remain inside the system layer and use Radix Dialog focus management.

- [ ] **Step 4: Run VN and full UI verification**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/narrative src/shell && pnpm verify:ui && pnpm verify`

Expected: PASS; no test accesses Snapshot or Narrative source IR.

- [ ] **Step 5: Commit the VN layer**

```bash
git add -- packages/ui/src/narrative packages/ui/src/shell/game-stage.tsx
git diff --cached --check
git commit -m "feat(ui): add accessible visual novel layer"
```

### Task 5: Implement Overlay stack, action confirmation, save, and recovery UI

**Files:**

- Create: `packages/ui/src/overlays/OverlayHost.tsx`
- Create: `packages/ui/src/overlays/overlay-session-store.ts`
- Create: `packages/ui/src/overlays/OverlayHost.test.tsx`
- Create: `packages/ui/src/overlays/ActionConfirmationDialog.tsx`
- Create: `packages/ui/src/overlays/ActionConfirmationDialog.test.tsx`
- Create: `packages/ui/src/persistence/SaveOverlay.tsx`
- Create: `packages/ui/src/persistence/SaveOverlay.test.tsx`
- Create: `packages/ui/src/errors/RootErrorBoundary.tsx`
- Create: `packages/ui/src/errors/RuntimeFailureDialog.tsx`
- Create: `packages/ui/src/errors/errors.test.tsx`
- Create: `packages/ui/src/diagnostics/ui-context-source.ts`
- Create: `packages/ui/src/diagnostics/ui-context-source.test.ts`
- Create: `packages/ui/src/diagnostics/diagnostic-export-button.tsx`
- Create: `packages/ui/src/diagnostics/diagnostic-export-button.test.tsx`
- Modify: `packages/ui/src/shell/game-shell.tsx`
- Modify: `packages/ui/src/shell/game-stage.tsx`

**Interfaces:**

- Consumes: Overlay contribution bindings, generic `ConfirmationPresentationV1<TCommand,TReason>`, persistence/diagnostic ports, and Base slot/status DTOs.
- Produces: one primary Overlay, bounded detail stack, generic confirmation, four-slot management, import/export/recovery, categorized failure UI, and an always-reachable Player-safe diagnostic export control.

- [ ] **Step 1: Write failing Overlay and persistence-state tests**

```tsx
it("keeps one primary overlay and restores focus", async () => {
  render(<OverlayHarness />);
  await user.click(screen.getByRole("button", { name: "背包" }));
  await user.click(screen.getByRole("button", { name: "食材详情" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(2);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: "背包" })).toHaveFocus();
});

it("does not claim success before storage read-back verification", () => {
  render(<SaveOverlay port={pendingPersistencePort} />);
  expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  expect(screen.getByText("正在安全写入…")).toBeVisible();
});
```

Add a table-driven RTL case for ordinary play, blocking VN, and `fault_paused`. In all three states, the semantic button named `导出诊断包` remains visible, keyboard-focusable, enabled, and at least 44×44 CSS px; activating it calls the read-only Player diagnostics port exactly once and never imports or opens Developer controls.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/overlays src/persistence src/errors src/diagnostics`

Expected: FAIL because the hosts and persistence surfaces do not exist.

- [ ] **Step 3: Implement the bounded UI-session state and exact status mapping**

```ts
interface OverlaySessionStateV1 {
  readonly primaryId: OverlayId | null;
  readonly detailIds: readonly OverlayDetailId[];
}
const maximumOverlayDetailsV1 = 4;
```

Map `empty`, `valid`, `invalid`, `recovery_candidate`, and `unavailable` to distinct labels/actions. Only `quick` and `manual` expose Save; each of the four slots exposes only the load/clear/export actions allowed by its current status. Handle every `SaveExportOperationResultV1` branch explicitly—an empty/invalid/unavailable/conflicted stored export is not an exception and never starts a download. `auto.previous` recovery requires an explicit confirmation. Render errors by stable runtime code and retain current-Snapshot JSON/DebugBundle export whenever in-memory state is available.

Generic confirmation UI receives an opaque `TCommand`, already formatted consequences/reasons as Text IDs, and an allowed/disabled flag; Demo `CommandPreviewV1<GameCommandV1>` is adapted in Modules/Story presentation code. UI dispatches the opaque command unchanged and never imports or reconstructs a Demo preview, rejection, or formula.

Expose a generic read-only UI-session context source containing route token, bounded primary/detail Overlay IDs, dock booleans, and opaque selected action ID. It never imports `DebugUiContextV1`; Story application code owns the closed mapping. Unknown/unregistered IDs are omitted with one UI diagnostic, arrays are bounded, and a headless/unmounted UI may return no context.

Mount `DiagnosticExportButton` in the persistent system-control area of `GameShell`, outside ordinary gameplay and VN input blockers. It is present in Player and Developer builds, uses only `PlayerDiagnosticsPortV1`, downloads only a successfully validated `ExportedDebugBundleV1`, and reports a typed export fault without hiding the control. The Developer build may expose additional dock actions elsewhere, but this button never becomes a shortcut to mutating DevTools.

- [ ] **Step 4: Run UI, persistence integration, and accessibility unit checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/overlays src/persistence src/errors src/diagnostics && pnpm verify:fixtures && pnpm verify:ui && pnpm verify`

Expected: PASS; invalid imports and UI faults leave the active Session unchanged.

- [ ] **Step 5: Commit Overlay and recovery surfaces**

```bash
git add -- packages/ui/src/overlays packages/ui/src/persistence packages/ui/src/errors packages/ui/src/diagnostics packages/ui/src/shell/game-shell.tsx packages/ui/src/shell/game-stage.tsx
git diff --cached --check
git commit -m "feat(ui): add overlay save and recovery surfaces"
```

### Task 6: Implement tavern-specific HUD, management overlays, and Story Scenes

**Files:**

- Create: `packages/modules/src/ui/hud/TavernHud.tsx`
- Create: `packages/modules/src/ui/hud/TavernHud.test.tsx`
- Create: `packages/modules/src/ui/overlays/PolicyOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/InventoryOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/PurchaseOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/TavernPlanOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/FacilityOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/WorldActionOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/LedgerOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/RunSummaryOverlay.tsx`
- Create: `packages/modules/src/ui/overlays/overlays.test.tsx`
- Create: `packages/modules/src/ui/index.ts`
- Modify: `packages/modules/package.json`
- Modify: `stories/demo/package.json`
- Modify: `stories/e2e/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `stories/demo/src/presentation/scene-renderers.tsx`
- Modify: `stories/demo/src/presentation/scene-graph.tsx`
- Create: `stories/demo/src/presentation/ui-contributions.tsx`
- Create: `stories/demo/src/presentation/ui-contributions.test.tsx`
- Create: `stories/demo/player.html`
- Create: `stories/demo/src/application/create-demo-application.ts`
- Create: `stories/demo/src/application/create-demo-application.test.ts`
- Create: `stories/demo/src/application/create-demo-runtime-view.ts`
- Create: `stories/demo/src/application/create-demo-runtime-view.test.ts`
- Create: `stories/demo/src/application/create-demo-debug-ui-context.ts`
- Create: `stories/demo/src/application/create-demo-debug-ui-context.test.ts`
- Create: `stories/demo/src/application/player-entry.tsx`
- Create: `stories/demo/tsconfig.application.json`
- Modify: `stories/e2e/src/presentation/scene-graph.tsx`
- Create: `stories/e2e/src/presentation/ui-contributions.tsx`
- Create: `stories/e2e/player.html`
- Create: `stories/e2e/src/application/create-e2e-application.ts`
- Create: `stories/e2e/src/application/create-e2e-application.test.ts`
- Create: `stories/e2e/src/application/create-e2e-runtime-view.ts`
- Create: `stories/e2e/src/application/create-e2e-runtime-view.test.ts`
- Create: `stories/e2e/src/application/player-entry.tsx`
- Create: `stories/e2e/tsconfig.application.json`
- Modify: `vite.config.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: Demo RuntimeViewModel specialization, Player port, PresentationReadPort, generic UI registry.
- Produces: Story-owned main menu/play/summary Scenes and all tavern-specific HUD/Overlay contributions.

- [ ] **Step 1: Declare JSX runtime dependencies at their real package owners**

Run:

```bash
pnpm --filter @project-tavern/modules add --save-peer --save-exact react@19.2.7
pnpm --filter @project-tavern/story-demo add '@project-tavern/web@workspace:*'
pnpm --filter @project-tavern/story-e2e add '@project-tavern/web@workspace:*'
pnpm install --frozen-lockfile
```

Expected: strict peer/dependency checks pass; Modules UI and both Story application roots resolve `react/jsx-runtime` through their own manifests, not a sibling package. E2E and Demo retain the pinned direct React dependencies introduced with their earlier Story-owned SceneGraphs; this task adds React only for Modules. Demo/E2E each declare the generic MIT `@project-tavern/web: workspace:*` dependency used by their host-specific roots; Web still has no reverse Story edge. The existing React third-party record is updated with the additional paths/importers; no duplicate legal record is created.

- [ ] **Step 2: Write failing projection-parity and no-local-formula tests**

```tsx
render(<TavernPlanOverlay context={contextWithProjectedPreview} />);
expect(screen.getByText("预计现金变化：12–18")).toBeVisible();
await user.click(screen.getByRole("button", { name: "确认营业计划" }));
expect(playerPort.commands.dispatch).toHaveBeenCalledWith(projectedPreview.command);
expect(calculateOpeningLocally).not.toHaveBeenCalled();

render(<TavernHud context={hudContext} />);
expect(screen.getByText("第 4 天 · 下午")).toBeVisible();
expect(screen.getByLabelText("行动点 2 / 4")).toBeVisible();
expect(screen.getByRole("button", { name: "女主状态" })).toBeVisible();
```

- [ ] **Step 3: Run the Story/module UI tests and confirm failure**

Run: `pnpm --filter @project-tavern/modules exec vitest run src/ui && pnpm --filter @project-tavern/story-demo exec vitest run src/presentation`

Expected: FAIL because tavern renderers and Story Scene composition are missing.

- [ ] **Step 4: Implement renderers as pure projection consumers**

```ts
export const demoUiContributions = defineUiContributionSet({
  scenes: [mainMenuScene, tavernPlayScene, runSummaryScene],
  hud: [tavernHudContribution],
  overlays: [
    policyOverlay,
    inventoryOverlay,
    purchaseOverlay,
    tavernPlanOverlay,
    facilityOverlay,
    worldActionOverlay,
    ledgerOverlay,
    runSummaryOverlay,
  ],
  gameSymbols: [projectTavernSymbolProvider],
});
```

Every form submits a command supplied by its ViewModel/preview or constructs only the parameter DTO explicitly allowed by `directCommand=null`, then calls `previewCommand` before confirmation. No component recalculates AP, cash, availability, demand, opening revenue, relationship gates, or ending status.

Expose tavern renderers only from `@project-tavern/modules/ui` mapped to `./src/ui/index.ts`; do not re-export them from the headless root. The boundary verifier must accept `Story presentation/application → modules/ui` while still rejecting `Story simulation → modules/ui` and `modules/core → React/UI`.

Keep each existing `presentation/scene-graph.tsx` as the single authority for stable Scene/Overlay/HUD IDs and authored ordering. New renderer/contribution files implement bindings imported by that graph; they do not declare a parallel navigation graph. Contract tests assert every resolvable `activeSceneId` and every Story UiSceneGraph contribution ID has exactly one renderer binding, and that no extra binding is unreachable.

Before mounting React, each Story application composes the concrete Catalog envelope through a tested read-only projector: `revision` increases on a published projection change; `sessionStatus` comes from EngineSession; `activeSceneId` comes from the Story's closed main-menu/play/summary selection; `game` comes from `profile.projectView`/`EngineQueriesV1`; `narrative` is `NarrativeProjectionV1 | null`; `persistence` comes from the persistence facade; and `noticeTextIds` contains only stable Text IDs. Subscribe to Session and persistence status, publish one deep-readonly `RuntimeViewModelEnvelopeV1`, and coalesce same-tick notifications without hiding a final state. Contract tests cover bootstrap, active Narrative, busy/fault/HMR, unsafe-save/recovery, terminal summary, exact reference identity, and absence of Snapshot/ResolvedStory/TextCatalog/Asset Pack fields.

Demo application also maps the generic UI-session source to the Catalog's closed `DebugUiContextV1` and injects it into the Phase 3 optional DebugBundle UI-context provider. Export/decode tests cover play route, bounded known Overlay IDs, selected ActionId, and Player dock flags=false; unknown values never enter the bundle. DebugBundle inspection may display this context, but anchoring/importing a bundle never applies route/Overlay/dock state and never treats UI context as Snapshot authority.

Each Story owns its Player HTML and application entry. The entry imports that Story's default package/contributions plus the public generic Web Host/Loader/mount API, then passes them as explicit bootstrap parameters; `apps/web` imports neither Story. `stories/*/tsconfig.application.json` isolates DOM/JSX composition from the headless Story graph. Extend the closed Vite root map with `mode=demo-player → stories/demo/player.html` and `mode=e2e-player → stories/e2e/player.html`; no arbitrary path or runtime Story name is accepted. At this checkpoint the root scripts are exactly `build:player="vite build --mode demo-player"` and `build:e2e-player="vite build --mode e2e-player"`; Task 7 moves Developer to its Demo-owned root.

Do not modify either Story default `src/index.ts`: its exact export-key contract remains the single side-effect-free GamePackage only. Player/Developer application entries import presentation/application modules through package-internal relative paths owned by that same Story, and no application/developer symbol leaks from the default package export.

- [ ] **Step 5: Run Story UI and architectural gates**

Run: `pnpm --filter @project-tavern/modules exec vitest run src/ui && pnpm --filter @project-tavern/story-demo exec vitest run src/presentation src/application && pnpm --filter @project-tavern/story-e2e exec vitest run src/application && pnpm build:player && pnpm build:e2e-player && pnpm verify:boundaries && pnpm verify:stories && pnpm verify`

Expected: PASS; selecting the Demo- or E2E-owned Web application root requires no change in `packages/ui` or `apps/web` source.

- [ ] **Step 6: Commit Story/module UI contributions**

```bash
git add -- packages/modules/src/ui packages/modules/package.json stories/demo/package.json stories/demo/src/presentation stories/demo/player.html stories/demo/src/application stories/demo/tsconfig.application.json stories/e2e/package.json stories/e2e/src/presentation stories/e2e/player.html stories/e2e/src/application stories/e2e/tsconfig.application.json vite.config.ts package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(game): add tavern player interface"
```

### Task 7: Add the Developer-only DevDock and preview surfaces

**Files:**

- Create: `packages/ui/src/developer/DevDock.tsx`
- Create: `packages/ui/src/developer/DevDock.module.css`
- Create: `packages/ui/src/developer/DevDock.test.tsx`
- Create: `packages/ui/src/developer/FixtureBrowser.tsx`
- Create: `packages/ui/src/developer/DiagnosticInspector.tsx`
- Create: `packages/ui/src/developer/DebugCommandPanel.tsx`
- Create: `packages/ui/src/developer/index.ts`
- Modify: `packages/ui/package.json`
- Create: `stories/demo/src/development/ui-contributions.tsx`
- Modify: `stories/demo/src/development.ts`
- Create: `stories/demo/developer.html`
- Create: `stories/demo/src/application/developer-entry.tsx`
- Create: `stories/demo/src/application/install-demo-developer-hmr.ts`
- Create: `stories/demo/src/application/install-demo-developer-hmr.integration.test.ts`
- Modify: `stories/demo/src/application/create-demo-debug-ui-context.ts`
- Modify: `stories/demo/src/application/create-demo-debug-ui-context.test.ts`
- Modify: `stories/demo/tsconfig.application.json`
- Create: `apps/web/src/developer/developer-routes.tsx`
- Modify: `apps/web/src/developer/index.ts`
- Create: `apps/web/src/developer/developer-routes.test.tsx`
- Modify: `apps/web/package.json`
- Create: `scripts/ui/source-graph-plugin.mts`
- Create: `scripts/ui/verify-player-graph.mts`
- Create: `scripts/ui/verify-player-graph.test.ts`
- Modify: `scripts/collect-import-closure.test.mjs`
- Modify: `vite.config.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: DeveloperApplicationPort, Story `./development` fixtures/notes, generic developer UI framework, and Phase 3's closed `installResolvedDigestHmrV1`/runtime-invalidation/full-rebootstrap contract.
- Produces: independently toggleable left/right docks, fixture preview, bounded diagnostics, a Demo-owned `import.meta.hot` installation with export-then-full-rebootstrap recovery, and build/source-closure checks that keep all Player roots outside every Developer graph.

- [ ] **Step 1: Write failing dock and Player-exclusion tests**

```tsx
render(<DevDock developerPort={developerPort} support={developmentSupport} />);
await user.click(screen.getByRole("button", { name: "打开状态调试" }));
expect(screen.getByRole("complementary", { name: "状态调试" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "打开场景工具" }));
expect(screen.getByRole("complementary", { name: "场景工具" })).toBeVisible();
expect(screen.getByRole("main", { name: "游戏舞台" })).toBeVisible();

const playerSourceGraph = syntheticSourceGraph({
  applicationId: "demo-player",
  root: "stories/demo/player.html",
  modules: ["stories/demo/src/application/player-entry.tsx"],
});
expect(await inspectPlayerGraph(playerSourceGraph)).toMatchObject({ valid: true });
expect(JSON.stringify(playerSourceGraph)).not.toContain("./development");
expect(JSON.stringify(playerSourceGraph)).not.toContain("DeveloperApplicationPort");
```

Add an application-level HMR integration test using the actual Demo Developer composition, a fake structural hot channel, and fixed Host entropy:

```ts
it("invalidates the old Demo Session and fully reboots after a resolved digest changes", async () => {
  const fixture = await createDemoDeveloperHmrFixtureV1();
  const old = fixture.activeComposition();

  await fixture.hot.acceptUpdate(fixture.withChangedSimulationDigest());

  expect(old.session.getStatus()).toBe("hmr_invalidated");
  await expect(old.player.commands.dispatch(fixture.safeCommand)).resolves.toEqual({
    kind: "not_executed",
    code: "hmr_invalidated",
  });
  expect(old.coordinatorAttemptCount()).toBe(0);
  expect(old.pendingAutoSaveCount()).toBe(0);
  await expect(old.player.persistence.exportCurrentSave()).resolves.toMatchObject({
    mediaType: "application/json",
    bytes: expect.any(Uint8Array),
  });
  await expect(old.player.diagnostics.exportDebugBundle()).resolves.toMatchObject({
    mediaType: "application/json",
    bytes: expect.any(Uint8Array),
  });

  const replacement = await fixture.fullRebootstrap();
  expect(old.session.getStatus()).toBe("hmr_invalidated");
  expect(replacement.session.getStatus()).toBe("ready");
  expect(replacement.acceptedResolvedIdentity()).toEqual(fixture.changedResolvedIdentity());
});

it("keeps the Demo Session for an equal-tuple CSS or developer-note update", async () => {
  const fixture = await createDemoDeveloperHmrFixtureV1();
  const before = fixture.activeComposition();
  await fixture.hot.acceptUpdate(fixture.withEqualResolvedIdentity());
  expect(fixture.activeComposition()).toBe(before);
  expect(before.session.getStatus()).toBe("ready");
});
```

Extend `collect-import-closure.test.mjs` so the Phase 3 two-root owner set is deliberately expanded to exactly three Story-owned Developer roots: Sandbox, E2E, and Demo. All three must reach `apps/web/src/developer/resolved-digest-hmr.ts`, `packages/base/src/runtime/developer/index.ts`, and their own `./development` entry, and all three source roots must contain the real `import.meta.hot` handoff. The Sandbox/E2E/Demo Player roots must reach none of those paths; no Base/Web module may own `import.meta.hot` or statically import a Story.

- [ ] **Step 2: Run focused Developer tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/developer && pnpm --filter @project-tavern/story-demo exec vitest run src/application/install-demo-developer-hmr.integration.test.ts && node --test scripts/collect-import-closure.test.mjs && pnpm test:scripts`

Expected: FAIL because `@project-tavern/ui/developer`, the Demo HMR installer, the three-root closure expectation, and the graph verifier do not exist; `pnpm test:scripts` also proves the nested source-graph test is discovered by the Phase 1 runner.

- [ ] **Step 3: Implement the isolated Developer graph**

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./developer": "./src/developer/index.ts"
  }
}
```

Keep Developer routes behind `stories/demo/developer.html` and its separate Story-owned Developer application entry; add `mode=demo-developer → stories/demo/developer.html` to the closed Vite root map and set `build:developer="vite build --mode demo-developer"`. The Player root has no import edge to `./development` or `@project-tavern/ui/developer`. The left dock reads State/Fact/Aura/invariant/log summaries; the right dock resolves fixture IDs, Scene previews, notes, DebugBundle import/inspect, and controlled DebugCommands. Neither dock accepts raw JSON state edits or an arbitrary command string.

`developer-entry.tsx` is the third and final Story-owned HMR root. After constructing the active Demo Developer runtime, it calls `installDemoDeveloperHmrV1`, which passes that root's real `import.meta.hot`, immutable accepted Story/Engine/resolved digest resolver, and active `RuntimeInvalidationControllerV1` to `installResolvedDigestHmrV1` from `@project-tavern/web/developer`. A changed Story/Engine/state-contract/simulation/presentation digest invalidates exactly once, cancels unstarted Auto Save, and leaves the old composition mounted only for current Save/Debug export plus the explicit full-rebootstrap action. Full rebootstrap disposes subscriptions/lease/React root, re-resolves the Demo Story, creates a fresh Host/Profile/Session/application composition, and remounts it; it never anchors or resumes the old Session. Equal resolved identity—such as pure CSS, general UI, or developer-note HMR—keeps the current composition.

Wire DevDock open/close state into the same bounded UI-context source. Developer export/decode tests assert `leftDockOpen/rightDockOpen`; Player stays false. Inspecting or anchoring that bundle still does not reopen a dock or change a route automatically.

Expose the generic developer route/mount helpers only as `@project-tavern/web/developer` mapped to `./src/developer/index.ts`; the default Web export must not re-export them. The Demo Developer root may import that public subpath, while Player source-graph verification rejects it.

Add a Vite 8/Rolldown evidence plugin that classifies every emitted chunk module as exactly one of: `{ kind:"workspace", path, facet }` with a workspace-relative POSIX path; `{ kind:"third_party", packageName, version, subpath, integrity }` resolved through the frozen lockfile; or an allowlisted deterministic `{ kind:"virtual", id }` for Vite/React helpers. Record the closed application ID, Story/application root and output chunk, sort every collection, never persist an absolute module ID, and write only to ignored `dist/build-evidence/<application-id>-source-graph.json`, where the current IDs are exactly `demo-player`, `demo-developer`, and `e2e-player`. Each output's `build-input.json` records that graph's digest/application ID, and verification cross-checks output directory, root and digest so a later E2E build cannot overwrite or impersonate Demo Player evidence. Reject unknown virtual IDs, unresolved/external workspace code, missing lock integrity, and every `references/` path. This evidence is not shipped in `dist/player`, but `verify-player-graph.mts` and later release licensing consume it. Add `verify:ui:flavors="node scripts/ui/verify-player-graph.mts"`; it inspects caller-built roots (it never rebuilds or empties `dist`), validates source graphs plus emitted bytes, and never trusts an undefined Vite “metafile”.

Unit red tests use synthetic valid/invalid graph fixtures and therefore fail on missing validation behavior, never on an absent ignored build file. The built-root integration in Step 4 additionally asserts every graph is nonempty; Demo Player binds only `demo-player`/Demo root, Developer positively contains the development entry and marker, E2E binds only `e2e-player`/E2E root, and each build-input/graph digest pair matches its own output.

Update the real closure test atomically with the Demo installer: its exact Developer owner list is now the three Story roots and remains closed. This is a later extension of Phase 3, not permission for generic Web/Base code or any Player root to own HMR invalidation wiring.

- [ ] **Step 4: Build both flavors and prove static exclusion**

Run: `pnpm --filter @project-tavern/story-demo exec vitest run src/application/install-demo-developer-hmr.integration.test.ts && node --test scripts/collect-import-closure.test.mjs && pnpm test:scripts && pnpm build:player && pnpm build:developer && pnpm build:e2e-player && pnpm verify:ui:flavors && pnpm verify`

Expected: PASS; all three nonempty source graphs bind to their own roots/output digests; resolved-digest HMR invalidates/exports/full-reboots the Demo Developer runtime while equal-tuple HMR keeps it ready; Demo/E2E Player emitted bytes contain no Developer entry, HMR bridge, fixtures, notes, preview route, or mutating debug implementation; recursive script-test discovery reports the nested graph test exactly once.

- [ ] **Step 5: Commit Developer surfaces**

```bash
git add -- packages/ui/src/developer packages/ui/package.json stories/demo/src/development stories/demo/src/development.ts stories/demo/developer.html stories/demo/src/application/developer-entry.tsx stories/demo/src/application/install-demo-developer-hmr.ts stories/demo/src/application/install-demo-developer-hmr.integration.test.ts stories/demo/src/application/create-demo-debug-ui-context.ts stories/demo/src/application/create-demo-debug-ui-context.test.ts stories/demo/tsconfig.application.json apps/web/src/developer apps/web/package.json scripts/ui scripts/collect-import-closure.test.mjs vite.config.ts package.json
git diff --cached --check
git commit -m "feat(ui): add isolated developer docks"
```

### Task 8: Enforce runtime asset identity and the fallback-only Player artifact

**Files:**

- Create: `scripts/assets/validate-runtime.mts`
- Create: `scripts/assets/validate-runtime.test.ts`
- Modify: `scripts/verify-assets.mjs`
- Create: `packages/assets/src/fallbacks/project-tavern-fallbacks.ts`
- Create: `packages/assets/src/fallbacks/project-tavern-fallbacks.test.ts`
- Modify: `packages/assets/src/index.ts`
- Modify: `packages/assets/package.json`
- Create: `stories/demo/src/assets/slots.ts`
- Create: `stories/demo/src/assets/packs.ts`
- Create: `stories/demo/src/assets/asset-budgets.json`
- Create: `stories/e2e/src/assets/slots.ts`
- Create: `stories/e2e/src/assets/packs.ts`
- Modify: `stories/demo/src/presentation/assets.ts`
- Modify: `stories/demo/src/story.ts`
- Modify: `stories/demo/src/test/story-validation.test.ts`
- Modify: `stories/e2e/src/presentation/assets.ts`
- Modify: `stories/e2e/src/story.ts`
- Modify: `stories/e2e/src/test/story-contract.test.ts`
- Modify: `stories/demo/src/presentation/ui-contributions.tsx`
- Modify: `stories/e2e/src/presentation/ui-contributions.tsx`

**Interfaces:**

- Consumes: Contract Catalog runtime Asset Pack schema, selected Story asset slots, promoted runtime files, and the artifact file inventory.
- Produces: technical validators for runtime paths/media/dimensions/byte hashes/pack digests, proof that `art-source/aigc/**` is outside the Player graph, and a complete fallback-only manifest.

- [ ] **Step 1: Write failing runtime identity and archive-exclusion tests**

```ts
it("keeps the AIGC source archive outside runtime validation", async () => {
  const reads: string[] = [];
  const result = await validateRuntimeAssetPacksV1(runtimeFixture, {
    readFile: async (path) => {
      reads.push(path);
      return runtimeFixture.files[path];
    },
  });
  expect(result.errors).toEqual([]);
  expect(reads.every((path) => !path.startsWith("art-source/aigc/"))).toBe(true);
});

it.each([
  ["path-traversal", "asset.runtime_path_unsafe"],
  ["missing-file", "asset.runtime_file_missing"],
  ["hash-mismatch", "asset.runtime_hash_mismatch"],
  ["dimension-mismatch", "asset.runtime_dimensions_mismatch"],
  ["byte-length-mismatch", "asset.runtime_byte_length_mismatch"],
  ["duplicate-provider", "asset.provider_duplicate"],
] as const)("rejects %s with %s", async (fixture, code) => {
  expect(await validateRuntimeFixtureV1(fixture)).toContain(code);
});

it("binds the Asset Pack digest to provider metadata and exact bytes", async () => {
  const first = await resolveRuntimeFixtureV1("valid");
  const changed = await resolveRuntimeFixtureV1("changed-bytes");
  expect(first.pack.digest).not.toBe(changed.pack.digest);
});
```

- [ ] **Step 2: Run runtime tests and confirm failure**

Run: `pnpm exec vitest run scripts/assets packages/assets/src/fallbacks`

Expected: FAIL because the runtime manifest/byte validator and fallbacks are missing.

- [ ] **Step 3: Implement runtime validation and zero-image budgets**

```json
{
  "revision": 1,
  "bootstrapRuntimeImageBytes": 0,
  "maximumRuntimeImageBytes": 0,
  "storyRuntimeImageBytes": 0
}
```

Validate only providers explicitly authored in Story Asset Packs. Each `runtimePath` is a safe relative POSIX path rooted in `packages/assets/**` or the active Story asset directory; absolute paths, backslashes, empty/`.`/`..` segments, query, fragment, symlink escape, `art-source/**`, `references/**`, and remote URLs fail before file reads. Every provider has a unique Asset ID and exact media type, dimensions, byte length, and `digestBytes` SHA-256 matching the promoted file.

Build the pack projection exactly as `{ identity: { id, revision }, providers }` in authored order. Provider entries already contain the exact file digest, so any metadata, order, or byte change alters the automatic Asset Pack digest. Do not add source, model, prompt, service, review, license, or reverse-provenance fields and do not enumerate `art-source/aigc/**`.

Migrate the Phase 2/4 fallback declarations rather than creating a second asset configuration: `src/assets/slots.ts` and `packs.ts` become the one authoring authority; existing `presentation/assets.ts` imports them and remains the only Story resolver/presentation-digest entry. `story.ts` and validation tests prove the `ResolvedAssetManifestV1` and presentation digest are generated from those same records. `@project-tavern/assets` exports shared fallback declarations through its public root; Story presentation may import them, while simulation facets may not.

Extend the existing stable `scripts/verify-assets.mjs` wrapper so root `pnpm verify:assets` runs the original Sandbox asset checks first, then the runtime validator for E2E and Demo. It must remain read-only and never enumerate or read `art-source/aigc/**`.

- [ ] **Step 4: Run asset, license, build, and bundle checks**

Run: `pnpm verify:assets && pnpm build:player && pnpm verify:bundle && pnpm verify`

Expected: PASS; runtime validation reads no AIGC source archive, Player contains zero promoted runtime images, and every logical Asset ID resolves to a code fallback.

- [ ] **Step 5: Commit the governed fallback asset layer**

```bash
git add -- scripts/assets scripts/verify-assets.mjs packages/assets/src/fallbacks packages/assets/src/index.ts packages/assets/package.json stories/demo/src/assets stories/demo/src/presentation/assets.ts stories/demo/src/story.ts stories/demo/src/test/story-validation.test.ts stories/e2e/src/assets stories/e2e/src/presentation/assets.ts stories/e2e/src/story.ts stories/e2e/src/test/story-contract.test.ts stories/demo/src/presentation/ui-contributions.tsx stories/e2e/src/presentation/ui-contributions.tsx
git diff --cached --check
git commit -m "feat(assets): add deterministic fallback visual pack"
```

### Task 9: Establish the three-root browser harness and primary flows

**Files:**

- Create: `apps/web/e2e/ui-shell.spec.ts`
- Create: `apps/web/e2e/vn-keyboard.spec.ts`
- Create: `apps/web/e2e/overlay-focus.spec.ts`
- Create: `apps/web/e2e/player-first-day.spec.ts`
- Create: `apps/web/e2e/developer-dock.spec.ts`
- Create: `apps/web/e2e/ui-infrastructure.spec.ts`
- Create: `apps/web/playwright.ui.config.ts`
- Create: `apps/web/e2e/ui-targets.ts`
- Create: `scripts/ui/serve-static.mts`
- Create: `scripts/ui/serve-static.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: built Demo/E2E Player and Developer applications.
- Produces: stable Chromium/WebKit topology plus semantic Demo Player, Demo Developer, and E2E Player primary-flow tests.

- [ ] **Step 1: Write the failing bounded-server and target-map tests**

Tests reject `../` traversal, missing output roots, duplicate ports, non-loopback binding, and one ambiguous base URL. Run `pnpm exec vitest run scripts/ui/serve-static.test.ts`; expected: FAIL because the bounded server/target map do not exist.

- [ ] **Step 2: Implement a runnable three-root test topology**

Build `dist/player`, `dist/developer`, and `dist/e2e-player`, then configure three bounded static servers on test-assigned loopback ports. `apps/web/e2e/ui-targets.ts` exports explicit Demo Player, Demo Developer, and E2E Player base URLs; no test relies on one ambiguous `baseURL`. Add `test:e2e:ui="playwright test --config apps/web/playwright.ui.config.ts"` before invoking it. The static server rejects path traversal, adds no fallback build, and the config's `webServer[]` commands only serve existing bytes with `reuseExistingServer:false` in CI.

Run:

```bash
pnpm build:player
pnpm build:developer
pnpm build:e2e-player
pnpm test:e2e:ui -- --project=chromium --list
pnpm test:e2e:ui -- --project=chromium --grep @infrastructure
```

Expected: all three builds exist, the server unit tests pass, Playwright lists the UI tests/config, and the infrastructure smoke fetches each distinct root identity marker plus one valid asset while proving encoded/plain traversal is rejected. No missing script, config, browser, or server failure remains before primary-flow assertions are introduced.

- [ ] **Step 3: Add semantic primary-flow acceptance**

```ts
test("keyboard-only player can start, finish VN, choose policy, and open inventory", async ({
  page,
}) => {
  await page.goto(`${demoPlayerUrl}/#/play`);
  await page.getByRole("button", { name: "开始新游戏" }).press("Enter");
  await page.getByRole("button", { name: "继续" }).press("Enter");
  await page.getByRole("button", { name: "认真工作" }).press("Enter");
  await page.getByRole("button", { name: "背包" }).press("Enter");
  await expect(page.getByRole("dialog", { name: "背包" })).toBeVisible();
});
```

Add separate tests for Demo new-game/initial VN/policy/first action/Quick+Manual Save/recovery, E2E deterministic scene/command integration, and Developer dock/fixture/diagnostic visibility. Locators use roles/names; only stage layers may use stable test IDs. These are acceptance tests over Tasks 1–8, not an excuse to add new domain logic: if one fails, fix the owning earlier UI/application slice and rerun its focused test first.

Tag the bounded Demo new-game/first-action and E2E one-command paths `@smoke`; Save recovery and Developer tooling remain in the full matrix.

In `ui-infrastructure.spec.ts`, assert the Player diagnostic export button is keyboard- and touch-reachable during ordinary play and blocking VN. Use the Story-owned fault fixture in the Developer root to assert the same control remains reachable while gameplay is fault-paused; the test may inspect the downloaded Bundle metadata but must not import a mutating Developer API into the Player root.

- [ ] **Step 4: Run and commit the browser harness**

Run: `pnpm test:e2e:ui -- --project=chromium && pnpm test:e2e:ui -- --project=webkit && pnpm verify`

Expected: all primary flows pass against their explicit roots; the test servers neither build nor rewrite tracked files.

```bash
git add -- apps/web/e2e/ui-shell.spec.ts apps/web/e2e/vn-keyboard.spec.ts apps/web/e2e/overlay-focus.spec.ts apps/web/e2e/player-first-day.spec.ts apps/web/e2e/developer-dock.spec.ts apps/web/e2e/ui-infrastructure.spec.ts apps/web/e2e/ui-targets.ts apps/web/playwright.ui.config.ts scripts/ui/serve-static.mts scripts/ui/serve-static.test.ts package.json
git diff --cached --check
git commit -m "test(ui): add three-root browser flows"
```

### Task 10: Prove responsive, accessibility, and reduced-motion behavior

**Files:**

- Create: `apps/web/e2e/accessibility.spec.ts`
- Create: `apps/web/e2e/responsive.spec.ts`
- Create: `apps/web/e2e/reduced-motion.spec.ts`
- Modify: `packages/ui/src/shell/game-shell.tsx`
- Modify: `packages/ui/src/shell/game-shell.module.css`
- Modify: `packages/ui/src/theme/global.css`
- Test: the three new browser specs plus affected UI unit tests.

**Interfaces:**

- Consumes: the Task 9 three-root harness and code-native UI.
- Produces: automated viewport/target/safe-zone/WCAG/text-spacing/reduced-motion evidence without claiming VoiceOver automation.

- [ ] **Step 1: Write responsive and accessibility assertions before the final adaptations**

```ts
for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1600, height: 1000 },
  { width: 2560, height: 1080 },
  { width: 768, height: 1024 },
  { width: 800, height: 500 }, // 1600x1000 at equivalent 200% layout viewport
]) {
  test(`stage constraints hold at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${demoPlayerUrl}/#/play`);
    await expect(page.getByRole("main", { name: "游戏舞台" })).toBeInViewport();
    await expectStageAndTargetMetrics(page, viewport);
  });
}
```

Run:

```bash
pnpm test:e2e:ui -- --project=chromium --grep @a11y
```

Expected: at least one targeted portrait/reduced-motion/text-spacing assertion fails against the pre-adaptation UI; infrastructure and primary-flow failures are not the intended red.

- [ ] **Step 2: Implement the bounded adaptations**

Assert computed stage width never exceeds 1600, aspect ratio never exceeds 16:10, ultrawide gutters center the frame, declared art safe zones remain inside the stage, portrait HUD collapses without hiding required system operations, and primary/detail Overlays scroll without clipping. Every visible enabled interactive element has a bounding box at least 44×44 CSS px.

Run axe with WCAG 2 A/AA tags (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) and require zero violations rather than filtering by impact. Add a text-spacing test using WCAG spacing overrides, keyboard-only flows, touch emulation, and focus restoration. Wrap animation surfaces in `MotionConfig reducedMotion="user"`; mock `prefers-reduced-motion: reduce` and assert nonessential Motion transforms/transitions are absent, in addition to CSS reduction. Behavioral assertions remain semantic; Phase 5 does not add ungoverned tracked screenshots, and the existing licensed Sandbox shell baseline is sufficient for generic visual-regression plumbing. VoiceOver/screen-reader quality remains an explicit human runbook checkpoint, not an automated success claim.

Tag all three new suites with `@a11y` so the focused commands include responsive, motion, and semantic accessibility together rather than silently running only axe.

- [ ] **Step 3: Run both browsers and commit the accessibility slice**

Run: `pnpm --filter @project-tavern/ui test && pnpm test:e2e:ui -- --project=chromium --grep @a11y && pnpm test:e2e:ui -- --project=webkit --grep @a11y && pnpm verify`

Expected: all responsive/a11y/motion tests pass with no unexplained skip.

```bash
git add -- apps/web/e2e/accessibility.spec.ts apps/web/e2e/responsive.spec.ts apps/web/e2e/reduced-motion.spec.ts packages/ui/src/shell/game-shell.tsx packages/ui/src/shell/game-shell.module.css packages/ui/src/theme/global.css
git diff --cached --check
git commit -m "test(ui): enforce responsive accessible interaction"
```

### Task 11: Freeze the complete Phase 5 UI gate

**Files:**

- Create: `scripts/ui/verify-ui.mts`
- Create: `scripts/ui/verify-ui.test.ts`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: UI unit/contract suites and Task 9/10 browser suites over prebuilt roots.
- Produces: final inspect-only `pnpm verify:ui` plus the Phase 5 gate.

- [ ] **Step 1: Write the failing verifier-order/no-build and recursive-discovery test**

Assert the UI verifier runs RTL/contract tests followed by Chromium UI E2E; rejects `vite`, `build:*`, update/screenshot flags, and shell command strings. Extend the root-order test to retain exactly one `test:scripts` step before Demo Player, Demo Developer, and E2E Player builds and before `verify:ui`. Through the Phase 1 discovery API, compare the live recursive set with every Phase 5 `scripts/**/*.test.ts` path under `scripts/assets` and `scripts/ui`; zero-owner, duplicate-owner, or missing-from-Vitest-list paths fail. Run `pnpm test:scripts && node --test scripts/verify.test.mjs`; expected: FAIL because the final verifier/order does not exist, while the recursive runner still demonstrates that the new nested test is selected rather than skipped.

- [ ] **Step 2: Implement the stable UI gate**

Set `verify:ui="node scripts/ui/verify-ui.mts"`. It uses structured command/arg arrays, runs against already built Demo Player, Demo Developer, and E2E Player outputs, never builds, and never updates screenshots. WebKit remains the explicit phase/release expansion.

At this phase, update the existing root orchestrator so one recursive `test:scripts` step precedes all three builds and all three builds precede `verify:ui`; retain its tracked-byte `finally` guard. Phase 6 later consolidates artifact preparation and makes every downstream bundle/UI/artifact check inspect-only without changing this public ordering guarantee.

- [ ] **Step 3: Run the full Phase 5 gate**

Run: `pnpm test:scripts && pnpm build:player && pnpm build:developer && pnpm build:e2e-player && pnpm verify:ui && pnpm test:e2e:ui -- --project=webkit && pnpm verify:assets && pnpm verify:bundle && pnpm verify`

Expected: all commands exit 0, no unexplained skipped tests, and `git status --short` is unchanged from before verification.

- [ ] **Step 4: Commit the UI gate**

```bash
git add -- scripts/ui/verify-ui.mts scripts/ui/verify-ui.test.ts scripts/verify.mjs scripts/verify.test.mjs package.json
git diff --cached --check
git commit -m "test(ui): verify accessible player and developer flows"
```

## Phase 5 Acceptance

Phase 5 is complete only when all statements below are proven in one fresh run:

```bash
pnpm build:player
pnpm build:developer
pnpm build:e2e-player
pnpm test:scripts
pnpm verify:ui
pnpm test:e2e:ui -- --project=webkit
pnpm verify:assets
pnpm verify:boundaries
pnpm verify:bundle
pnpm verify
git diff --check
git status --short --branch
```

Acceptance criteria:

- Demo and E2E Stories render by selecting their own Player/Developer application roots; the generic Loader/WebHost and UI Base remain unchanged and never import a Story.
- Sandbox, E2E, and Demo are the exact three Story-owned Developer HMR roots. Demo resolved-digest changes invalidate the old Session, retain last-legal Save/Debug export, and require full rebootstrap; equal-tuple CSS/general-UI/developer-note updates retain the Session, and every Player root remains outside the HMR/Developer closure.
- Player can start, complete the initial VN, choose policy, perform the first-day loop, use Quick/Manual Save, and recover from a valid previous Auto slot with keyboard, mouse, and touch.
- The Player-safe `导出诊断包` control remains keyboard/touch reachable during ordinary play, blocking VN, and fault pause; it exports through the read-only diagnostics port without exposing DevTools.
- VN/Overlay focus, blocked input, every 44×44 target, equivalent 200% reflow, reduced motion, WCAG A/AA automation, text spacing, 1024×768, 1600×1000, 768×1024 portrait/touch, and 2560×1080 capped/centered framing pass in Chromium and WebKit; VoiceOver remains separately recorded human evidence.
- The Player graph and emitted artifact contain no Developer entry, fixture, note, preview route, mutating debug implementation, `references/` path, `art-source/aigc/` path, or unregistered runtime asset.
- The mandatory code-native fallback artifact is complete and fully functional; current OpenAI illustrations remain archive-only and outside runtime validation.
- No UI component imports Snapshot/EngineSession/owner capability, reimplements a rule/guard/formula, or reads raw TextCatalog/Asset Pack/runtimePath.
- Every recursive Phase 5 `scripts/**/*.test.ts` and inherited `scripts/**/*.test.mjs` file is discovered and executed exactly once by `pnpm test:scripts`.
- Worktree is clean after verification and the phase checkpoint records base/head SHA, commands, results, and remaining nonblocking asset-review status.
