# Project Tavern Phase 5 UI, Input, Assets, Accessibility, and Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one complete Web application for the PoC Story and one minimal Web application for the E2E Story, both driven by `SemanticGamePortV1`, with accessible DOM presentation, Pointer-based mouse/touch input, runtime-gated Debug/Cheat/Automation tooling, deterministic assets, and no build flavor split.

**Architecture:** `@project-tavern/ui` owns neutral Shell, Stage, Overlay, VN, InputRouter, DevDock framework, and accessibility primitives; `apps/web` owns Pointer and Automation Bridge adapters; each Story owns its presentation and its single Web application root. React renders immutable projections and sends semantic invocations through the same `SemanticGamePortV1` used by CI and AI adapters. Debug, Cheat, and Automation are default-off runtime capabilities in the same Artifact, never separate Player/Developer/Headless builds.

**Tech Stack:** React 19.2.7, React DOM 19.2.7, Vite 8.1.4, TypeScript 7.0.2, Zustand 5.0.14, Radix Dialog 1.1.19, Motion 12.42.2, Lucide React 1.24.0, CSS Modules, Stylelint 17.14.0 with stylelint-config-standard 40.0.0, React Testing Library 16.3.2, user-event 14.6.1, Playwright 1.61.1, and @axe-core/playwright 4.12.1.

## Global Constraints

- Phase 2A–4B and their acceptance commands must pass from the live phase base SHA before this plan starts.
- `docs/superpowers/specs/2026-07-12-post-phase1-game-runtime-design.md` is authoritative when older plans/specs mention Demo/Sandbox, `GameProfile`, `EngineSession`, public tavern Modules, Player/Developer roots, or build flavors.
- Current Story roots are exactly `stories/poc` and `stories/e2e`; do not recreate `stories/demo`, `stories/sandbox`, `packages/modules`, or `stories/common`.
- `packages/ui/**` and game-neutral `apps/web/**` remain MIT. PoC/E2E presentation, application, tooling, fixtures, and gameplay-specific browser tests remain PolyForm; original text/media remain CC BY-NC-SA. Every new source file carries the correct SPDX header.
- Every `Story × Host` has one application root and one Artifact: `poc × web → dist/poc`, `e2e × web → dist/e2e`.
- Runtime capabilities are exactly `debug_tools`, `cheats`, and `automation_bridge`; a fresh Host preference store defaults all three to false, persisted preferences/session overrides follow the Phase 3 contract, and changing them never re-resolves the Story, rebuilds `GameSimulation`, replaces `GameSession`, or changes Story/ResolvedGame identities.
- Normal Story renderers receive only immutable view slices, the Story-specialized `SemanticGamePortV1`, and `PresentationReadPortV1`. Persistence, diagnostics, lifecycle, capability, and DebugTools surfaces are passed only to the generic or tooling UI that needs them.
- Automation Bridge exposes only a frozen, versioned facade over `SemanticGamePortV1`; it never exposes `DebugToolsPortV1`, Snapshot, State paths, owner capabilities, fixtures, or arbitrary commands.
- Read-only DebugTools and normal semantic Automation do not change `RunIntegrityV1`. A successful Cheat or fixture/debug anchor must already be marked atomically by Phase 3 runtime behavior and remain marked through Save/Load/Replay.
- Input is a UI/Host facility, not a GameplayModule and not saveable state. Phase 5 implements `InputRouter`/`InputContext` in UI and a Web Pointer Adapter that covers mouse, touch, and pen through Pointer Events.
- Native `<button>`, form, and focus behavior remains the default for ordinary controls. The Pointer Adapter handles only explicitly registered global/stage actions and must not duplicate a native click dispatch.
- One primary Workspace Overlay may be open; a bounded detail stack may sit above it. System > Overlay > Narrative > Gameplay is the closed normal context priority; an active Debug surface consumes its own registered interactions without leaking them to the stage.
- Runtime controls, player-visible text, focus indicators, and system symbols are semantic DOM/code-native. Generated screenshots never become interactive UI.
- The mandatory phase gate succeeds with `art-source/aigc/**` excluded from every build and every current resolved asset using its code-native fallback.
- Support 1024×768 landscape and 768×1024 portrait tablets, use 1600×1000 as the design basis, stop stage stretching beyond 16:10, and preserve functional reflow at equivalent 200% zoom.
- Interactive targets are at least 44×44 CSS px, information is never hover-only, focus returns after Dialog/Overlay closure, and reduced-motion removes nonessential transitions.
- Browser tests use semantic role/name. Stable `data-testid` is allowed only for non-semantic stage layers; `data-semantic-action-id` is allowed only as a parity witness, not as the primary locator.
- Every task ends with its focused suite, the current `pnpm verify:ui`, the current full `pnpm verify`, an exact staged-diff review, and a focused commit.

---

## File Map

```text
packages/ui/src/assets/                 # neutral AssetRegistry and presentation adapter
packages/ui/src/runtime/                # immutable view bridge
packages/ui/src/contributions/          # Scene/HUD/Overlay/Symbol registries
packages/ui/src/input/                  # InputAction, InputContext, InputRouter
packages/ui/src/primitives/             # accessible semantic controls
packages/ui/src/shell/                  # GameShell, Stage, system/overlay/narrative hosts
packages/ui/src/debug/                  # runtime-gated neutral DevDock framework
packages/ui/src/theme/                  # tokens and responsive framing
apps/web/src/input/                     # Pointer Adapter
apps/web/src/routing/                   # HashRouter adapter for nested-base Web roots
apps/web/src/automation/                # versioned SemanticGamePort browser facade
apps/web/src/capabilities/              # URL/Host capability activation adapter
stories/poc/src/presentation/           # all tavern-specific HUD, Scenes, VN/Overlay renderers
stories/poc/src/application/            # one PoC Web composition root
stories/poc/src/tooling/                # lazy Story tooling and controlled command forms
stories/e2e/src/presentation/           # minimal stable Scene/UI
stories/e2e/src/application/            # one E2E Web composition root
packages/assets/src/                    # shared fallbacks
scripts/assets/                         # runtime manifest/byte validators
scripts/ui/                             # two-root graph and UI verification
apps/web/e2e/                           # PoC/E2E DOM, Semantic, capability, input, and a11y flows
```

### Task 1: Implement AssetRegistry and PresentationReadPort

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

- Consumes: Base resolved asset/text contracts, current locale, and a generic asset diagnostic sink.
- Produces: `createAssetRegistryV1`, `AssetRegistryV1`, `createPresentationReadPortV1`, and the public `@project-tavern/ui/assets` subpath.

- [ ] **Step 1: Install the exact UI dependencies at their owners**

Run:

```bash
pnpm --filter @project-tavern/ui add --save-peer --save-exact react-dom@19.2.7
pnpm --filter @project-tavern/ui add --save-exact zustand@5.0.14 @radix-ui/react-dialog@1.1.19 motion@12.42.2 lucide-react@1.24.0
pnpm --filter @project-tavern/web add --save-dev --save-exact @axe-core/playwright@4.12.1
pnpm add --workspace-root --save-dev --save-exact stylelint@17.14.0 stylelint-config-standard@40.0.0
```

Expected: exact versions enter manifests/lockfile; strict peer checks pass.

- [ ] **Step 2: Write failing registry, fallback, and locale tests**

```ts
it("deduplicates one URL and digest while returning every AssetId", async () => {
  const loader = createFakeImageLoaderV1({ "assets/scene.webp": "loaded" });
  const registry = createAssetRegistryV1(sharedUrlManifest, loader, diagnostics);
  await expect(registry.preload("scene", neverAborted)).resolves.toEqual([
    { assetId: assetId("asset.e2e.scene-a"), status: "loaded" },
    { assetId: assetId("asset.e2e.scene-b"), status: "loaded" },
  ]);
  expect(loader.calls).toEqual(["assets/scene.webp#sha256:scene"]);
});

it("falls back per asset without rejecting the batch", async () => {
  const registry = createAssetRegistryV1(runtimeManifest, failingLoader, diagnostics);
  await expect(registry.preload("scene", neverAborted)).resolves.toMatchObject([
    { assetId: assetId("asset.e2e.scene"), status: "fallback" },
  ]);
  expect(registry.resolve(assetId("asset.e2e.scene"), sceneUsage).delivery).toBe("code_fallback");
});

it("resolves locale fallback without exposing catalogs", () => {
  const port = createPresentationReadPortV1({ catalogs, locale: locale("zh-Hant"), registry });
  expect(port.text(textId("ui.save"))).toMatchObject({
    resolvedLocale: locale("zh-CN"),
    text: "保存",
  });
  expect(port).not.toHaveProperty("catalogs");
});
```

- [ ] **Step 3: Run the focused tests and verify the behavior is absent**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/assets`

Expected: FAIL because the registry/read-port exports do not exist.

- [ ] **Step 4: Implement the closed registry and read port**

```ts
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

Use `bootstrap → scene → overlay`, authored order within a group, and URL+sha256 deduplication for one registry lifetime. Abort unfinished entries as `aborted`; fetch/decode failures become per-entry `fallback` with one bounded diagnostic per URL/error/load cycle. `resolve` never returns `runtimePath` or provider records.

Expose only `@project-tavern/ui/assets`. Type tests must prove no PoC/E2E ID, Story import, Snapshot type, or deep internal path leaks through the subpath.

- [ ] **Step 5: Run package verification**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/assets && pnpm typecheck && pnpm verify:ui && pnpm verify`

Expected: PASS; tracked files remain unchanged after verification.

- [ ] **Step 6: Commit the presentation asset boundary**

```bash
git add -- packages/ui/src/assets packages/ui/type-tests/assets-public.test-d.ts packages/ui/package.json apps/web/package.json package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(ui): add resolved asset presentation port"
```

### Task 2: Build the immutable view and Semantic action bridge

**Files:**

- Create: `packages/ui/src/contributions/types.ts`
- Modify: `packages/ui/src/contributions/registry.ts`
- Modify: `packages/ui/src/contributions/registry.test.ts`
- Modify: `packages/ui/src/runtime/create-view-bridge.ts`
- Modify: `packages/ui/src/runtime/create-view-bridge.test.tsx`
- Create: `packages/ui/src/runtime/use-runtime-view.ts`
- Create: `packages/ui/src/runtime/semantic-action-control.tsx`
- Create: `packages/ui/src/runtime/semantic-action-control.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/contributions/*.test.ts` and `packages/ui/src/runtime/*.test.tsx`

**Interfaces:**

- Consumes: Story-specialized `SemanticGamePortV1.observe/subscribe`, `UiContributionSetV1`, and presentation data.
- Produces: `createUiContributionRegistryV1`, `createRuntimeViewBridgeV1`, `useRuntimeViewV1`, and `SemanticActionControlV1` that renders one descriptor while dispatching the explicit typed invocation supplied by its Story renderer.

- [ ] **Step 1: Write failing uniqueness, immutable-view, and exact-invocation tests**

```tsx
it("rejects duplicate contribution IDs before render", () => {
  expect(() => createUiContributionRegistryV1([setA, duplicateSceneSet])).toThrowError(
    /ui\.duplicate_scene_id/,
  );
});

it("publishes the exact immutable semantic view reference", () => {
  const semantic = createFakeSemanticGamePortV1(view0);
  const bridge = createRuntimeViewBridgeV1(semantic);
  semantic.publish(view1);
  expect(bridge.getState()).toBe(view1);
  expect(bridge.getState()).not.toHaveProperty("snapshot");
});

it("dispatches the Story-supplied invocation unchanged", async () => {
  render(
    <SemanticActionControlV1
      descriptor={descriptor}
      invocation={typedInvocation}
      semantic={semantic}
      label="营业"
    />,
  );
  await user.click(screen.getByRole("button", { name: "营业" }));
  expect(semantic.dispatch).toHaveBeenCalledWith(typedInvocation);
});
```

- [ ] **Step 2: Run the focused tests and confirm the intended red**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/contributions src/runtime`

Expected: FAIL on four-namespace uniqueness and missing semantic control.

- [ ] **Step 3: Implement typed registries and semantic controls**

```ts
export interface GameRendererContextV1<TViewSlice, TSemanticPort, TPresentation> {
  readonly viewSlice: DeepReadonly<TViewSlice>;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}
```

Keep separate Scene, Overlay, HUD, and GameSymbol maps and reject duplicates with stable codes. The Zustand vanilla adapter bridges `semantic.observe()` and `semantic.subscribe()` and stores only the latest immutable view reference; `useRuntimeViewV1` consumes it through `useSyncExternalStore`, including lifecycle/load/anchor publications and status-only publications without inventing a new Gameplay revision. `SemanticActionControlV1` uses descriptor `enabled`, ordered disabled reasons, an explicit typed invocation prop, and stable ActionId; it never guesses parameters, rebuilds a Gameplay command, gate, or preview from DOM state. Parameterized controls remain Story-owned and construct only the closed invocation variants allowed by their descriptor options.

Add a type/boundary test proving UI does not import PoC/E2E command/state unions, `GameSnapshot`, `GameSession`, Story tooling, or DebugTools.

- [ ] **Step 4: Run package and architecture checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/contributions src/runtime && pnpm verify:boundaries && pnpm verify:cycles && pnpm verify:ui && pnpm verify`

Expected: PASS; the MIT UI graph has no Story Gameplay import.

- [ ] **Step 5: Commit the semantic UI bridge**

```bash
git add -- packages/ui/src/contributions packages/ui/src/runtime packages/ui/src/index.ts
git diff --cached --check
git commit -m "feat(ui): add semantic action view bridge"
```

### Task 3: Implement InputRouter, InputContext, and the Web Pointer Adapter

**Files:**

- Create: `packages/ui/src/input/contracts.ts`
- Create: `packages/ui/src/input/input-router.ts`
- Create: `packages/ui/src/input/input-router.test.ts`
- Create: `packages/ui/src/input/input-context.tsx`
- Create: `packages/ui/src/input/input-context.test.tsx`
- Create: `packages/ui/src/input/index.ts`
- Modify: `packages/ui/src/index.ts`
- Create: `apps/web/src/input/pointer-adapter.ts`
- Create: `apps/web/src/input/pointer-adapter.test.ts`
- Create: `apps/web/src/input/index.ts`
- Modify: `apps/web/src/index.ts`
- Test: `packages/ui/src/input/*.test.*` and `apps/web/src/input/*.test.ts`

**Interfaces:**

- Consumes: device-independent `InputActionV1`, registered context layers, and explicitly annotated stage/global targets.
- Produces: `createInputRouterV1`, `InputContextProviderV1`, `useInputContextV1`, and `installPointerAdapterV1`.

- [ ] **Step 1: Write failing priority, no-through, mouse/touch, and no-double-dispatch tests**

```ts
it("routes to the highest active context and never falls through", () => {
  const router = createInputRouterV1();
  const gameplay = vi.fn(() => ({ kind: "handled" as const }));
  const overlay = vi.fn(() => ({ kind: "handled" as const }));
  router.register({ context: "gameplay", priority: 10, handle: gameplay });
  router.register({ context: "overlay", priority: 30, handle: overlay });
  expect(router.route({ id: "ui.cancel" })).toEqual({ kind: "handled", context: "overlay" });
  expect(overlay).toHaveBeenCalledOnce();
  expect(gameplay).not.toHaveBeenCalled();
});

it.each(["mouse", "touch", "pen"] as const)(
  "routes one %s pointer gesture exactly once",
  (pointerType) => {
    const dispatch = vi.fn();
    const fixture = installPointerFixtureV1({ pointerType, dispatch });
    fixture.pointerDown();
    fixture.pointerUp();
    fixture.syntheticClick();
    expect(dispatch).toHaveBeenCalledOnce();
  },
);

it("leaves native buttons to click and keyboard activation", () => {
  const route = vi.fn();
  const fixture = installPointerFixtureV1({ target: "button", route });
  fixture.pointerDown();
  fixture.pointerUp();
  expect(route).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/input && pnpm --filter @project-tavern/web exec vitest run src/input`

Expected: FAIL because Input contracts/router and Pointer Adapter do not exist.

- [ ] **Step 3: Implement the closed first-version input boundary**

```ts
export type InputContextIdV1 = "gameplay" | "narrative" | "overlay" | "system" | "debug";

export interface InputActionV1 {
  readonly id: "ui.confirm" | "ui.cancel" | "ui.open_menu" | "narrative.advance";
}
```

`InputRouter` uses explicit numeric priority and LIFO registration order within one priority, returns `handled | ignored`, and stops after the first handler that handles. `installPointerAdapterV1` accepts only primary `pointerdown/pointerup` pairs on the same registered non-native target, ignores cancel/multi-pointer/drag, and removes listeners idempotently. It does not listen for ordinary button clicks and therefore cannot duplicate browser click/keyboard activation.

No Input state enters Snapshot, Save, Story identity, or GameSimulation. Do not add keyboard binding, rebinding, gesture, or Gamepad polling APIs.

- [ ] **Step 4: Run input and boundary verification**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/input && pnpm --filter @project-tavern/web exec vitest run src/input && pnpm verify:boundaries && pnpm verify:ui && pnpm verify`

Expected: PASS; UI input code has no Story import and Web owns every PointerEvent/global reference.

- [ ] **Step 5: Commit the input adapter slice**

```bash
git add -- packages/ui/src/input packages/ui/src/index.ts apps/web/src/input apps/web/src/index.ts
git diff --cached --check
git commit -m "feat(input): add semantic pointer routing"
```

### Task 4: Implement GameShell, GameStage, tokens, and responsive framing

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

- Consumes: contribution registry, immutable Runtime/Game View envelope, PresentationReadPort, and InputContext provider.
- Produces: seven fixed stage layers, generic HUD slots, Overlay/VN/System hosts, and capped 16:10 framing.

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

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/shell`

Expected: FAIL because the complete stage/framing is absent.

- [ ] **Step 3: Implement the semantic shell and fixed layers**

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
```

Use semantic headings, lists, progressbars, buttons, live regions, and visible focus. Keep all seven layers mounted in fixed order; inactive hosts render empty regions. Background fill may extend beyond the capped frame but never stretch authored scene composition.

Add `lint:styles="stylelint \"packages/**/*.css\" \"stories/**/*.css\" \"apps/**/*.css\""`. Configure only reviewed CSS Modules exceptions.

- [ ] **Step 4: Run shell/style/boundary checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/shell && pnpm lint:styles && pnpm verify:boundaries && pnpm verify:ui && pnpm verify`

Expected: PASS; no PoC/E2E IDs or Gameplay commands occur in UI Base.

- [ ] **Step 5: Commit the generic shell**

```bash
git add -- packages/ui/src/theme packages/ui/src/primitives packages/ui/src/shell .stylelintrc.json package.json
git diff --cached --check
git commit -m "feat(ui): add responsive semantic game stage"
```

### Task 5: Implement VN, Overlay, persistence, and recovery surfaces

**Files:**

- Create: `packages/ui/src/narrative/VnLayer.tsx`
- Create: `packages/ui/src/narrative/VnLayer.module.css`
- Create: `packages/ui/src/narrative/VnLayer.test.tsx`
- Create: `packages/ui/src/narrative/use-vn-input-context.ts`
- Create: `packages/ui/src/narrative/use-vn-input-context.test.ts`
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
- Create: `packages/ui/src/diagnostics/DiagnosticExportButton.tsx`
- Create: `packages/ui/src/diagnostics/DiagnosticExportButton.test.tsx`
- Modify: `packages/ui/src/shell/game-shell.tsx`
- Modify: `packages/ui/src/shell/game-stage.tsx`
- Test: affected `packages/ui/src/{narrative,overlays,persistence,errors,diagnostics}` suites.

**Interfaces:**

- Consumes: Story-projected semantic descriptors/invocations, InputRouter contexts, persistence and player-safe diagnostics ports.
- Produces: accessible blocking VN, one primary Overlay plus bounded detail stack, semantic confirmation, four-slot Save UI, recovery/failure UI, and always-reachable DebugBundle export.

- [ ] **Step 1: Write failing blocking-context, exact-choice, focus, and Save-state tests**

```tsx
render(<VnLayer context={choiceContext} />);
await user.click(screen.getByRole("button", { name: "谨慎询问" }));
expect(semantic.dispatch).toHaveBeenCalledWith(cautiousChoiceInvocation);
expect(screen.getByRole("button", { name: "强行追问" })).toBeDisabled();
expect(screen.getByText("尚未满足条件")).toBeVisible();

render(<OverlayHarness />);
await user.click(screen.getByRole("button", { name: "背包" }));
await user.click(screen.getByRole("button", { name: "食材详情" }));
await user.keyboard("{Escape}");
expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();

render(<SaveOverlay port={pendingPersistencePort} />);
expect(screen.getByText("正在安全写入…")).toBeVisible();
expect(screen.queryByText("已保存")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/narrative src/overlays src/persistence src/errors src/diagnostics`

Expected: FAIL because the hosts and InputContext integration do not exist.

- [ ] **Step 3: Implement projection-only VN/Overlay/system behavior**

VN registers a Narrative InputContext and makes Gameplay inert while keeping Save/export/settings/diagnostics reachable. Overlay registers above Narrative; Radix system dialogs register above Overlay. Dispatch the exact invocation supplied by projection. Never reconstruct a PoC command or recompute a gate/formula.

```ts
interface OverlaySessionStateV1 {
  readonly primaryId: string | null;
  readonly detailIds: readonly string[];
}

const maximumOverlayDetailsV1 = 4;
```

Map every persistence status/result branch explicitly. `DiagnosticExportButton` lives outside Gameplay/VN blockers, remains available in `ready`, `busy`, and `fault_paused`, and uses only player-safe diagnostics.

- [ ] **Step 4: Run UI, persistence, and input checks**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/narrative src/overlays src/persistence src/errors src/diagnostics && pnpm verify:fixtures && pnpm verify:ui && pnpm verify`

Expected: PASS; blocked stage input never executes and invalid imports leave GameSession unchanged.

- [ ] **Step 5: Commit VN/Overlay/recovery surfaces**

```bash
git add -- packages/ui/src/narrative packages/ui/src/overlays packages/ui/src/persistence packages/ui/src/errors packages/ui/src/diagnostics packages/ui/src/shell
git diff --cached --check
git commit -m "feat(ui): add semantic vn overlay and recovery surfaces"
```

### Task 6: Implement PoC-owned UI and the two single Web application roots

**Files:**

- Create: `stories/poc/src/presentation/hud/PocHud.tsx`
- Create: `stories/poc/src/presentation/hud/PocHud.test.tsx`
- Create: `stories/poc/src/presentation/overlays/PolicyOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/InventoryOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/PurchaseOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/TavernPlanOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/FacilityOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/WorldActionOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/LedgerOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/RunSummaryOverlay.tsx`
- Create: `stories/poc/src/presentation/overlays/overlays.test.tsx`
- Create: `stories/poc/src/presentation/scene-renderers.tsx`
- Modify: `stories/poc/src/presentation/scene-graph.ts`
- Create: `stories/poc/src/presentation/ui-contributions.tsx`
- Create: `stories/poc/src/presentation/ui-contributions.test.tsx`
- Create: `stories/poc/src/application/create-poc-game-runtime.ts`
- Create: `stories/poc/src/application/create-poc-game-runtime.test.ts`
- Create: `stories/poc/src/application/poc-application-root.tsx`
- Create: `stories/poc/src/application/poc-application-root.test.tsx`
- Create: `stories/poc/src/application/create-poc-runtime-view.ts`
- Create: `stories/poc/src/application/create-poc-runtime-view.test.ts`
- Create: `stories/poc/src/application/entry.tsx`
- Create: `stories/poc/index.html`
- Create: `stories/poc/tsconfig.application.json`
- Create: `stories/e2e/src/presentation/ui-contributions.tsx`
- Create: `stories/e2e/src/presentation/ui-contributions.test.tsx`
- Modify: `stories/e2e/src/application/create-e2e-game-runtime.ts`
- Modify: `stories/e2e/src/application/create-e2e-game-runtime.test.ts`
- Modify: `stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `stories/e2e/src/application/e2e-application-root.test.tsx`
- Modify: `stories/e2e/src/application/entry.tsx`
- Modify: `stories/e2e/index.html`
- Modify: `stories/e2e/tsconfig.application.json`
- Modify: `stories/poc/package.json`
- Modify: `stories/e2e/package.json`
- Create: `apps/web/src/routing/hash-router.tsx`
- Create: `apps/web/src/routing/hash-router.test.tsx`
- Create: `apps/web/src/routing/index.ts`
- Modify: `apps/web/src/index.ts`
- Modify: `vite.config.ts`
- Modify: root `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `pocStoryEntryV1`, `createPocSemanticGamePortV1`, the E2E Story entry/semantic port, each data-only `ResolvedGameV1.sceneGraph`, immutable GameView/PresentationReadPort values, and generic UI/Web mount/routing APIs. Story tooling is not imported until Task 7.
- Produces: all PoC-specific renderers and exactly two application IDs/roots: `poc-web` and `e2e-web`.

- [ ] **Step 1: Write failing PoC projection-parity and Story ownership tests**

```tsx
render(<TavernPlanOverlay context={contextWithProjectedPreview} />);
expect(screen.getByText("预计现金变化：12–18")).toBeVisible();
await user.click(screen.getByRole("button", { name: "确认营业计划" }));
expect(semantic.dispatch).toHaveBeenCalledWith(projectedPreview.invocation);
expect(calculateOpeningLocally).not.toHaveBeenCalled();

expect(await collectProductionImports("stories/poc/src/presentation")).not.toContain(
  "packages/modules",
);
expect(await collectProductionImports("stories/e2e")).not.toContain("stories/poc");
```

- [ ] **Step 2: Run Story UI tests and confirm failure**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation src/application && pnpm --filter @project-tavern/story-e2e exec vitest run src/presentation src/application && pnpm --filter @project-tavern/web exec vitest run src/routing`

Expected: FAIL because Story-owned renderers and single Web roots are missing.

- [ ] **Step 3: Implement pure projection renderers and one root per Story**

Declare the actual application dependencies before adding imports:

```bash
pnpm --filter @project-tavern/story-poc add '@project-tavern/ui@workspace:*' '@project-tavern/web@workspace:*'
pnpm --filter @project-tavern/story-e2e add '@project-tavern/ui@workspace:*' '@project-tavern/web@workspace:*'
pnpm install --frozen-lockfile
```

Both Story packages retain an exact direct React dependency and never rely on a sibling package to provide `react/jsx-runtime`. ReactDOM remains owned by the generic Web mount package unless a live Story file directly imports it; if that boundary changes, add the exact direct dependency and matching types to that Story before implementation rather than relying on hoisting.

```ts
export const pocUiContributionsV1 = defineUiContributionSetV1({
  scenes: [mainMenuScene, tavernPlayScene, runSummaryScene],
  hud: [pocHudContribution],
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
  gameSymbols: [pocGameSymbolProvider],
});
```

Every action uses the same PocGameQueries-backed descriptor/preview/dispatch as SemanticGamePort. No component calculates AP, cash, demand, relationship gates, revenue, or ending status. E2E owns only its minimal fixture Scene/HUD/Workflow UI.

Each `application/entry.tsx` imports its StoryEntry plus the generic Web mount API and passes explicit Host/build composition inputs. It never supplies `rngSeed`, `runId`, test bootstrap, or another source of simulation entropy; the unified lifecycle obtains production bootstrap values through the Host entropy port at the GameSession FIFO boundary. Each runtime composition owns one bounded RuntimeFailure sink and passes the same callback to GameSession observer isolation and SemanticGamePort subscriber isolation. `apps/web` imports neither Story. The resolved `.ts` SceneGraph is a data-only renderer-ID/layout descriptor from `ResolvedGameV1.sceneGraph`; each Story's Web-only `.tsx` contribution registry resolves those IDs without constructing a second graph or entering the default Story/Headless import closure. Extend the Phase 2 E2E runtime/root in place; do not create a second E2E entry or HTML file.

Both roots use the same Web-owned `createHashRouterV1` adapter with the closed routes `/`, `/play`, and a deterministic unknown-route recovery to `/`. The router reads/writes only the hash fragment, preserves Vite's relative asset base, and works after direct refresh below a nested deployment base such as `/project-tavern/preview/`. Tests cover legal hashes, unknown/malformed hashes, back/forward subscription, disposal, and nested-base refresh; no Story owns a second router or uses pathname routing.

At this checkpoint retain Phase 2's `build:e2e="vite build --mode e2e-web"` and add `build:poc="vite build --mode poc-web"`. Extend the existing closed Vite root map to exactly those two modes and `dist/e2e`/`dist/poc`; do not replace the already verified E2E entry. Phase 6 replaces both script implementations with the production artifact builder without renaming them.

- [ ] **Step 4: Run Story UI/build/boundary gates**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation src/application && pnpm --filter @project-tavern/story-e2e exec vitest run src/presentation src/application && pnpm --filter @project-tavern/web exec vitest run src/routing && pnpm build:poc && pnpm build:e2e && pnpm verify:boundaries && pnpm verify:stories && pnpm verify:ui && pnpm verify`

Expected: PASS; exactly two Story-owned Web roots build and generic Base/UI/Web remain Story-neutral.

- [ ] **Step 5: Commit Story-owned applications**

```bash
git add -- stories/poc/src/presentation stories/poc/src/application stories/poc/index.html stories/poc/tsconfig.application.json stories/poc/package.json stories/e2e/src/presentation stories/e2e/src/application stories/e2e/index.html stories/e2e/tsconfig.application.json stories/e2e/package.json apps/web/src/routing apps/web/src/index.ts vite.config.ts package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat(game): add poc and e2e web applications"
```

### Task 7: Add runtime-gated DevDock, Cheat UI, Story tooling, and Automation Bridge

**Files:**

- Create: `packages/ui/src/debug/DevDock.tsx`
- Create: `packages/ui/src/debug/DevDock.module.css`
- Create: `packages/ui/src/debug/DevDock.test.tsx`
- Create: `packages/ui/src/debug/FixtureBrowser.tsx`
- Create: `packages/ui/src/debug/DiagnosticInspector.tsx`
- Create: `packages/ui/src/debug/DebugCommandPanel.tsx`
- Create: `packages/ui/src/debug/CapabilityPanel.tsx`
- Create: `packages/ui/src/debug/index.ts`
- Modify: `packages/ui/package.json`
- Create: `apps/web/src/capabilities/parse-capability-request.ts`
- Create: `apps/web/src/capabilities/parse-capability-request.test.ts`
- Create: `apps/web/src/capabilities/runtime-capability-session-overlay.ts`
- Create: `apps/web/src/capabilities/runtime-capability-session-overlay.test.ts`
- Create: `apps/web/src/capabilities/index.ts`
- Create: `apps/web/src/automation/browser-automation-bridge.ts`
- Create: `apps/web/src/automation/browser-automation-bridge.test.ts`
- Create: `apps/web/src/automation/global.d.ts`
- Create: `apps/web/src/automation/index.ts`
- Modify: `apps/web/package.json`
- Create: `stories/poc/src/tooling/ui-contributions.tsx`
- Create: `stories/poc/src/tooling/ui-contributions.test.tsx`
- Create: `stories/poc/src/tooling/debug-command-form-adapter.ts`
- Create: `stories/poc/src/tooling/debug-command-form-adapter.test.ts`
- Modify: `stories/poc/src/tooling/index.ts`
- Modify: `stories/poc/src/application/create-poc-game-runtime.ts`
- Modify: `stories/poc/src/application/create-poc-game-runtime.test.ts`
- Create: `stories/poc/src/application/install-poc-hmr.ts`
- Create: `stories/poc/src/application/install-poc-hmr.integration.test.ts`
- Modify: `stories/poc/src/application/entry.tsx`
- Modify: `stories/e2e/src/application/entry.tsx`
- Create: `scripts/ui/source-graph-plugin.mts`
- Create: `scripts/ui/verify-application-graphs.mts`
- Create: `scripts/ui/verify-application-graphs.test.ts`
- Modify: `vite.config.ts`
- Modify: root `package.json`

**Interfaces:**

- Consumes: `RuntimeCapabilityPortV1`, `DebugToolsPortV1`, `pocStoryToolingEntryV1` from the fixed `@project-tavern/story-poc/tooling` export, SemanticGamePort, the complete Phase 4A `PocDebugCommandV1`, and GameSession HMR invalidation/rebootstrap control from Phases 2–4B.
- Produces: default-hidden runtime DevDock/Capability/Cheat surfaces, the form-only `pocDebugCommandFormAdapterV1`, one Story-application-owned fixed-specifier tooling loader, `installBrowserAutomationBridgeV1`, one-root HMR recovery, and two-application source-graph evidence.

- [ ] **Step 1: Write failing capability, integrity, bridge, and same-root HMR tests**

```ts
it("keeps all capabilities disabled without an explicit request", async () => {
  const app = await createPocApplicationFixtureV1();
  expect(app.capabilities.state.getCurrent()).toEqual({
    debugTools: false,
    cheats: false,
    automationBridge: false,
  });
  expect(globalThis.__PROJECT_TAVERN_AUTOMATION_V1__).toBeUndefined();
});

it("exposes only SemanticGamePort through the enabled browser bridge", async () => {
  const installed = installBrowserAutomationBridgeV1({ capabilities, semantic });
  await capabilities.setEnabled("automation_bridge", true);
  const bridge = globalThis.__PROJECT_TAVERN_AUTOMATION_V1__;
  expect(bridge).toMatchObject({ contractRevision: 1 });
  expect(bridge).not.toHaveProperty("debugTools");
  expect(bridge).not.toHaveProperty("snapshot");
  installed.dispose();
});

it("revokes every operation on a captured automation facade", async () => {
  await capabilities.setEnabled("automation_bridge", true);
  const captured = globalThis.__PROJECT_TAVERN_AUTOMATION_V1__!;
  await capabilities.setEnabled("automation_bridge", false);
  await expectEveryBridgeMethodV1(captured).resolves.toEqual([
    "capability_disabled",
    "capability_disabled",
    "capability_disabled",
    "capability_disabled",
    "capability_disabled",
  ]);
  expect(semanticDispatch).not.toHaveBeenCalled();
});

it("does not modify integrity for read-only debug but persists successful cheat mutation", async () => {
  const fixture = await createPocApplicationFixtureV1();
  await fixture.enable("debug_tools");
  await fixture.debugTools.queryDiagnostics(fixture.summaryQuery);
  expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
  await fixture.enable("cheats");
  await fixture.debugTools.executeDebugCommand(fixture.grantCashCommand);
  expect(fixture.snapshotForTest().integrity).toMatchObject({
    mode: "modified",
    mutationCount: 1,
  });
  expect((await fixture.saveAndReload()).integrity.mode).toBe("modified");
});
```

Add `CapabilityPanel` tests for persisted preferences, explicit Cheat confirmation, session-only URL overrides, and restoring all three switches to false. Add same-root HMR tests: changed resolved identity invalidates/export/full-reboots the current PoC GameSession; equal identity CSS/tooling-note updates retain it. There is no Developer root.

When effective `debugTools=true`, two code-native, ≥44×44 corner controls remain reachable from every Scene, VN, Overlay, and fault-pause surface and independently show/hide the left and right DevDock rails; with `debugTools=false` both controls and rails are absent. Tests cover opening/closing each rail, focus return, no Gameplay pointer-through, and tablet reflow. The rails are reserved for diagnostics, debug operations, controlled Cheat forms, and Story developer notes; ordinary player information and formal Gameplay overlays never depend on them.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @project-tavern/ui exec vitest run src/debug && pnpm --filter @project-tavern/web exec vitest run src/capabilities src/automation && pnpm --filter @project-tavern/story-poc exec vitest run src/tooling src/application/install-poc-hmr.integration.test.ts && pnpm test:scripts`

Expected: FAIL because runtime-gated UI, bridge, tooling composition, and two-root graph verifier do not exist.

- [ ] **Step 3: Implement runtime gating and versioned Automation**

```ts
export type BrowserAutomationOperationResultV1<T> =
  | { readonly kind: "ok"; readonly value: DeepReadonly<T> }
  | { readonly kind: "capability_disabled" };

export interface BrowserAutomationBridgeV1<TView, TDescriptor, TInvocation, TPreview, TResult> {
  readonly contractRevision: 1;
  observe(): BrowserAutomationOperationResultV1<TView>;
  availableActions(): BrowserAutomationOperationResultV1<readonly TDescriptor[]>;
  preview(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TPreview>>;
  dispatch(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TResult>>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<BrowserAutomationOperationResultV1<TView>>;
}
```

The bridge property appears only while `automationBridge=true` and is removed when disabled. Freeze the semantic-only transport facade and never expose DebugTools; every method—including one retained from before disablement—rechecks capability before observing or dispatching and returns stable `capability_disabled` without touching SemanticGamePort. Parse only repeated closed URL parameters such as `?capability=debug_tools&capability=cheats&capability=automation_bridge`; reject unknown/duplicate values. `createRuntimeCapabilitySessionOverlayV1(persistedPort, requestedIds)` exposes effective `persisted OR session-requested` state while delegating explicit UI `setEnabled` only to the persisted port; it never writes requested IDs and is disposed with the application. URL absence supplies an empty overlay and therefore preserves persisted Host preferences; only a fresh preference store defaults all false. Browser verification always injects an isolated empty store/context and proves it leaves no persistent capability record behind.

`stories/poc/src/application/create-poc-game-runtime.ts` owns the only memoized closed loader and imports the fixed Story export only after `debugTools=true`:

```ts
const { pocStoryToolingEntryV1 } = await import("@project-tavern/story-poc/tooling");
```

The Story application injects narrow tooling UI contributions into the neutral DevDock and a narrow form adapter into its own command panel. `packages/ui/src/debug/**` never statically or dynamically imports a Story. Tests prove zero imports while disabled, exactly one import on the first read-only tooling operation, retry after a failed load, memoization after success, and the exact specifier above. No API accepts a module URL, file path, arbitrary Story ID, or alternate import specifier.

`pocDebugCommandFormAdapterV1` only converts controlled, typed UI fields into an already declared `PocDebugCommandV1` variant; it owns no command Schema, reference/range/current-state validation, Rule, owner proposal, or state mutation semantics. Those stay in Phase 4A's GameSimulation-owned debug executor and `simulationDigest`. For example, the form may construct `debug.inventory.adjust_cash`, but only that executor maps it to the Inventory owner's ledger proposal. `CapabilityPanel` exposes the three persisted runtime preferences and requires an explicit confirmation before enabling `cheats`; controlled URL activation is displayed as a read-only session override and is removed by reloading without that query. Read-only panels require only DebugTools; mutating controls require both `debugTools` and `cheats`, and execution rechecks capability at admission and FIFO execution. No UI accepts raw State JSON, arbitrary paths, command strings, or hidden Snapshot data.

Production graph evidence recognizes exactly `poc-web` and `e2e-web`. It permits tooling/debug chunks but rejects Story cross-imports, `references/`, `art-source/aigc/`, absolute paths, unknown virtual IDs, and missing lock integrity. Do not reintroduce a bundle-absence security assertion.

- [ ] **Step 4: Build the same Artifacts and verify runtime capabilities**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/tooling src/application/install-poc-hmr.integration.test.ts && pnpm --filter @project-tavern/web exec vitest run src/capabilities src/automation && pnpm test:scripts && pnpm build:poc && pnpm build:e2e && node --experimental-strip-types scripts/ui/verify-application-graphs.mts && pnpm verify:ui && pnpm verify`

Expected: PASS; same roots/bytes support normal and debugging flows; default capabilities are false; Automation is semantic-only; successful Cheat remains modified after Save/Load; no Developer Artifact exists.

- [ ] **Step 5: Commit runtime tooling and Automation**

```bash
git add -- packages/ui/src/debug packages/ui/package.json apps/web/src/capabilities apps/web/src/automation apps/web/package.json stories/poc/src/tooling stories/poc/src/application stories/e2e/src/application scripts/ui vite.config.ts package.json
git diff --cached --check
git commit -m "feat(tooling): add runtime debug and automation capabilities"
```

### Task 8: Enforce runtime asset identity and fallback-only Story assets

**Files:**

- Create: `scripts/assets/validate-runtime.mts`
- Create: `scripts/assets/validate-runtime.test.ts`
- Modify: `scripts/verify-assets.mjs`
- Create: `packages/assets/src/fallbacks/project-tavern-fallbacks.ts`
- Create: `packages/assets/src/fallbacks/project-tavern-fallbacks.test.ts`
- Modify: `packages/assets/src/index.ts`
- Create: `stories/poc/src/assets/slots.ts`
- Create: `stories/poc/src/assets/packs.ts`
- Create: `stories/poc/src/assets/asset-budgets.json`
- Create: `stories/e2e/src/assets/slots.ts`
- Create: `stories/e2e/src/assets/packs.ts`
- Modify: `stories/poc/src/presentation/assets.ts`
- Modify: `stories/poc/src/story-definition.ts`
- Modify: `stories/e2e/src/presentation/presentation-program.ts`
- Modify: `stories/e2e/src/story-definition.ts`
- Test: asset validator/fallback and Story validation suites.

**Interfaces:**

- Consumes: resolved Asset Pack contracts, Story asset slots/providers, promoted runtime files, and Artifact inventories.
- Produces: exact runtime path/media/dimension/byte/hash/pack validation and complete code-native fallbacks.

- [ ] **Step 1: Write failing runtime identity and archive-exclusion tests**

```ts
it("never enumerates the AIGC source archive", async () => {
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
] as const)("rejects %s with %s", async (fixture, code) => {
  expect(await validateRuntimeFixtureV1(fixture)).toContain(code);
});
```

- [ ] **Step 2: Run focused asset tests and confirm failure**

Run: `pnpm exec vitest run scripts/assets packages/assets/src/fallbacks`

Expected: FAIL because runtime validators/fallbacks are absent.

- [ ] **Step 3: Implement exact runtime validation and zero-image budgets**

```json
{
  "revision": 1,
  "bootstrapRuntimeImageBytes": 0,
  "maximumRuntimeImageBytes": 0,
  "storyRuntimeImageBytes": 0
}
```

Allow only safe relative POSIX providers rooted in `packages/assets/**` or the active Story assets directory. Reject absolute/backslash/empty/dot/dot-dot/query/fragment/symlink escape, `art-source/**`, `references/**`, and remote URLs before reads. Validate unique AssetId, media type, dimensions, byte length, and exact `digestBytes`.

`slots.ts`/`packs.ts` are each Story's one authority. Runtime asset changes affect presentation/asset identity only as specified; validators never enumerate source archives or attach prompt/model/provenance fields.

- [ ] **Step 4: Run asset, build, and bundle checks**

Run: `pnpm verify:assets && pnpm build:poc && pnpm build:e2e && pnpm verify:bundle && pnpm verify:ui && pnpm verify`

Expected: PASS; both Artifacts use complete code fallbacks and contain zero promoted runtime images.

- [ ] **Step 5: Commit deterministic fallback assets**

```bash
git add -- scripts/assets scripts/verify-assets.mjs packages/assets/src/fallbacks packages/assets/src/index.ts stories/poc/src/assets stories/poc/src/presentation/assets.ts stories/poc/src/story-definition.ts stories/e2e/src/assets stories/e2e/src/presentation/presentation-program.ts stories/e2e/src/story-definition.ts
git diff --cached --check
git commit -m "feat(assets): add deterministic story fallbacks"
```

### Task 9: Establish the two-root browser, Semantic, capability, and Pointer harness

**Files:**

- Create: `apps/web/e2e/ui-shell.spec.ts`
- Create: `apps/web/e2e/vn-keyboard.spec.ts`
- Create: `apps/web/e2e/overlay-focus.spec.ts`
- Create: `apps/web/e2e/poc-first-day.spec.ts`
- Create: `apps/web/e2e/e2e-semantic.spec.ts`
- Create: `apps/web/e2e/semantic-dom-parity.spec.ts`
- Create: `apps/web/e2e/pointer-input.spec.ts`
- Create: `apps/web/e2e/runtime-capabilities.spec.ts`
- Create: `apps/web/e2e/automation-bridge.spec.ts`
- Create: `apps/web/e2e/ui-infrastructure.spec.ts`
- Create: `apps/web/playwright.ui.config.ts`
- Create: `apps/web/e2e/ui-targets.ts`
- Create: `scripts/ui/serve-static.mts`
- Create: `scripts/ui/serve-static.test.ts`
- Modify: `scripts/verify-semantic.mts`
- Modify: `scripts/verify-semantic.test.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: prebuilt `dist/poc` and `dist/e2e`, semantic DOM, the versioned Automation Bridge, RuntimeCapabilities, and Pointer Adapter.
- Produces: explicit PoC/E2E URLs, Chromium/WebKit flows for real DOM and direct semantic automation, and the Phase 5 extension of `pnpm verify:semantic` with inspect-only DOM/action parity.

- [ ] **Step 1: Write failing server/target and bridge-discovery tests**

Tests reject traversal, missing output roots, duplicate ports, non-loopback binding, and ambiguous base URL. Add a browser test proving the bridge is absent at the normal PoC URL and present only at `?capability=automation_bridge`.

Run: `pnpm exec vitest run scripts/ui/serve-static.test.ts`

Expected: FAIL because the bounded two-root server/target map is absent.

- [ ] **Step 2: Implement the prebuilt two-root topology**

Build/serve `dist/poc` and `dist/e2e` on separate test-assigned loopback ports. Export `pocWebUrl` and `e2eWebUrl`; no ambiguous default base URL. Add `test:e2e:ui="playwright test --config apps/web/playwright.ui.config.ts"`. Web servers serve existing bytes only and use `reuseExistingServer:false` in CI.

```ts
export const uiTargetsV1 = Object.freeze({
  poc: { applicationId: "poc-web", root: "dist/poc" },
  e2e: { applicationId: "e2e-web", root: "dist/e2e" },
});
```

The Playwright config defines `chromium`, `chromium-touch` (`hasTouch:true`), and `webkit`. Touch-only cases run in `chromium-touch`; ordinary keyboard/mouse cases remain in `chromium`/`webkit`.

Run:

```bash
pnpm build:poc
pnpm build:e2e
pnpm test:e2e:ui -- --project=chromium --list
pnpm test:e2e:ui -- --project=chromium --project=chromium-touch --grep @infrastructure
```

Expected: two distinct application identity markers and valid assets load; traversal fails.

- [ ] **Step 3: Add semantic/DOM parity, Pointer, capability, and primary flows**

```ts
test("DOM actions match Semantic descriptors", async ({ page }) => {
  await page.goto(`${pocWebUrl}/?capability=automation_bridge#/play`);
  const result = await page.evaluate(() =>
    globalThis.__PROJECT_TAVERN_AUTOMATION_V1__!.availableActions(),
  );
  expect(result.kind).toBe("ok");
  const actions = result.kind === "ok" ? result.value : [];
  for (const action of actions) {
    const control = page.locator(`[data-semantic-action-id="${action.actionId}"]`);
    await expect(control).toHaveCount(1);
    if (action.enabled) await expect(control).toBeEnabled();
    else await expect(control).toBeDisabled();
  }
});

test("one touch gesture commits one semantic action", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const before = await readVisibleRevision(page);
  await page.getByRole("button", { name: "推进" }).tap();
  await expectVisibleRevision(page, before + 1);
});
```

Add PoC new-game/initial VN/policy/first action/Quick+Manual Save/recovery; E2E cross-owner command/workflow/Narrative; keyboard native activation; mouse and touch Pointer flows; fresh-store default-off and no-persistent-side-effect capability checks; debug read-only integrity unchanged; successful session-only Debug+Cheat activation with integrity persisting after Save/Load; Automation semantic-only/no-integrity tests. Every browser case gets an isolated Host preference store/context. AI/CI paths unwrap the transport result, call `waitForIdle(revision)`, and never sleep or simulate coordinates.

Extend the existing `scripts/verify-semantic.mts` rather than creating another semantic verifier. It first retains the Phase 4B frozen E2E-then-PoC headless checks, then inspects the already built PoC/E2E roots and runs the parity subset from `semantic-dom-parity.spec.ts`; it never builds, rewrites fixtures, or invokes a capability unavailable to an ordinary semantic client.

Tag bounded PoC first action, E2E semantic command, capability defaults, and Automation Bridge `@smoke`.

- [ ] **Step 4: Run and commit the browser harness**

Run: `pnpm test:e2e:ui -- --project=chromium --project=chromium-touch && pnpm test:e2e:ui -- --project=webkit && pnpm verify:semantic && pnpm verify:ui && pnpm verify`

Expected: all two-root DOM/Semantic/Input/Capability flows pass; servers never build or rewrite tracked files.

```bash
git add -- apps/web/e2e apps/web/playwright.ui.config.ts scripts/ui/serve-static.mts scripts/ui/serve-static.test.ts scripts/verify-semantic.mts scripts/verify-semantic.test.mjs package.json
git diff --cached --check
git commit -m "test(ui): add semantic two-story browser flows"
```

### Task 10: Prove responsive, accessibility, and reduced-motion behavior

**Files:**

- Create: `apps/web/e2e/accessibility.spec.ts`
- Create: `apps/web/e2e/responsive.spec.ts`
- Create: `apps/web/e2e/reduced-motion.spec.ts`
- Modify: `packages/ui/src/shell/game-shell.tsx`
- Modify: `packages/ui/src/shell/game-shell.module.css`
- Modify: `packages/ui/src/theme/global.css`
- Test: the three browser specs plus affected UI unit tests.

**Interfaces:**

- Consumes: Task 9 two-root harness, code-native UI, Pointer behavior, and semantic action descriptors.
- Produces: automated viewport/target/WCAG/text-spacing/reduced-motion evidence without claiming screen-reader automation.

- [ ] **Step 1: Write failing responsive and accessibility assertions**

```ts
for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1600, height: 1000 },
  { width: 2560, height: 1080 },
  { width: 768, height: 1024 },
  { width: 800, height: 500 },
]) {
  test(`stage constraints hold at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${pocWebUrl}/#/play`);
    await expect(page.getByRole("main", { name: "游戏舞台" })).toBeInViewport();
    await expectStageAndTargetMetrics(page, viewport);
  });
}
```

Run: `pnpm test:e2e:ui -- --project=chromium --grep @a11y`

Expected: at least one targeted portrait/text-spacing/motion assertion fails; infrastructure remains green.

- [ ] **Step 2: Implement bounded responsive/a11y adaptations**

Assert stage width ≤1600, ratio ≤16:10, centered ultrawide gutters, portrait functional reflow, scrollable Overlay details, and every visible enabled target ≥44×44 CSS px. Run axe with `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa` and require zero violations. Test text spacing, keyboard-only flows, touch emulation, focus restoration, and `prefers-reduced-motion` for CSS and Motion.

Automation/Semantic tests do not replace DOM checks. VoiceOver remains a human runbook checkpoint.

- [ ] **Step 3: Run both browsers and commit accessibility evidence**

Run: `pnpm --filter @project-tavern/ui test && pnpm test:e2e:ui -- --project=chromium --grep @a11y && pnpm test:e2e:ui -- --project=webkit --grep @a11y && pnpm verify:ui && pnpm verify`

Expected: all responsive/a11y/motion tests pass with no unexplained skip.

```bash
git add -- apps/web/e2e/accessibility.spec.ts apps/web/e2e/responsive.spec.ts apps/web/e2e/reduced-motion.spec.ts packages/ui/src/shell/game-shell.tsx packages/ui/src/shell/game-shell.module.css packages/ui/src/theme/global.css
git diff --cached --check
git commit -m "test(ui): enforce responsive accessible interaction"
```

### Task 11: Freeze the complete Phase 5 gate

**Files:**

- Create: `scripts/ui/verify-ui.mts`
- Create: `scripts/ui/verify-ui.test.ts`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes: UI unit/contract suites, the extended `verify:semantic`, two built Story roots, application graph evidence, and Chromium Semantic/DOM/a11y suites.
- Produces: inspect-only `pnpm verify:ui`, a root verification order that invokes `verify:semantic` after both builds, and the Phase 5 gate.

- [ ] **Step 1: Write failing verifier-order/no-build and recursive-discovery tests**

Assert `verify:ui` runs UI/Story presentation tests, application graph validation, and Chromium E2E against prebuilt `dist/poc`/`dist/e2e`; it rejects Vite/build/update/screenshot commands. Root verification has exactly one `test:scripts`, then `build:poc`, `build:e2e`, then exactly one inspect-only `verify:semantic`, followed by UI/bundle checks. Every Phase 5 `scripts/**/*.test.ts` is discovered exactly once.

Run: `pnpm test:scripts && node --test scripts/verify.test.mjs`

Expected: FAIL because the final two-root verifier/order is absent.

- [ ] **Step 2: Implement the stable UI gate**

Set `verify:ui="node --experimental-strip-types scripts/ui/verify-ui.mts"`. Keep the existing root `verify:semantic` name and extend its exact leaf work to `(1)` the Phase 4B headless semantic suites in their frozen E2E-then-PoC order and `(2)` the Chromium `semantic-dom-parity.spec.ts` subset against both already built outputs; it contains no build, `verify:ui`, or recursive phase gate. Use structured command/arg arrays. The UI verifier never builds, mutates capabilities persistently, or updates screenshots. Chromium runs in isolated fresh contexts for ordinary/default, explicit Automation, and explicit Debug/Cheat session overrides against the same PoC bytes; E2E uses the separate E2E bytes. Each context finishes with an empty capability-preference record.

- [ ] **Step 3: Run the complete Phase 5 gate**

Run:

```bash
pnpm test:scripts
pnpm build:poc
pnpm build:e2e
pnpm verify:semantic
pnpm verify:ui
pnpm test:e2e:ui -- --project=chromium-touch
pnpm test:e2e:ui -- --project=webkit
pnpm verify:assets
pnpm verify:bundle
pnpm verify
```

Expected: all commands exit 0, no unexplained skips, and tracked/worktree state is unchanged.

- [ ] **Step 4: Commit the UI gate**

```bash
git add -- scripts/ui/verify-ui.mts scripts/ui/verify-ui.test.ts scripts/verify.mjs scripts/verify.test.mjs package.json
git diff --cached --check
git commit -m "test(ui): verify semantic accessible story applications"
```

## Phase 5 Acceptance

Run from the live phase checkout:

```bash
pnpm build:poc
pnpm build:e2e
pnpm test:scripts
pnpm verify:semantic
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

- PoC and E2E each have one Story-owned Web root and one Artifact; no Player/Developer/Headless flavor, Developer HTML, or Developer Artifact exists.
- PoC owns every tavern HUD/Overlay/Scene renderer. E2E owns only its minimal fixture UI and imports no PoC implementation or ID.
- Normal Story controls, DOM disabled states/reasons, direct Automation, and AI/CI actions use the same GameQueries-backed Semantic descriptors, preview, dispatch, and rejection semantics.
- Automation Bridge is absent by default, exposes only the versioned SemanticGamePort facade when enabled, rechecks capability on every call, and never exposes DebugTools or hidden Snapshot data.
- DebugTools, Cheats, and Automation default false. Enabling them does not change ResolvedGame/GameSimulation identities or replace GameSession.
- Read-only Debug and normal Automation leave `RunIntegrityV1` normal; successful Cheat/fixture mutation marks it modified and the mark survives Save/Load/Replay and appears in DebugBundle.
- Pointer Events support mouse, touch, and pen without duplicate dispatch; native button click/Enter/Space remain functional; Overlay/VN/System/Debug input does not leak to the stage.
- PoC completes initial VN, policy, first action, Quick/Manual Save, and recovery through DOM. E2E completes its semantic cross-owner/workflow/Narrative path.
- Diagnostic export remains keyboard/touch reachable during normal play, blocking VN, and fault pause without enabling mutating tools.
- 1024×768, 1600×1000, 768×1024, 2560×1080, equivalent 200% zoom, WCAG A/AA, text spacing, focus restoration, ≥44×44 targets, and reduced motion pass in Chromium and WebKit; VoiceOver is separately recorded human evidence.
- Runtime validation reads no AIGC source archive; both Artifacts are complete with code-native fallbacks and contain no `references/`, `art-source/aigc/`, absolute local path, source map, secret, or unregistered runtime asset.
- No UI/Application/Host code writes Snapshot or imports owner capabilities; no renderer reimplements a Gameplay rule, gate, or formula.
- Worktree state is unchanged after verification, and the checkpoint records base/head SHA, commands, results, capability/semantic/input evidence, and remaining nonblocking asset review.
