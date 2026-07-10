# React Game Harness Phase 4 UI Assets and Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete Player and Developer browser experiences on the shared central stage, with a mandatory code-native visual fallback, in-stage overlays, VN, debug docks, touch/keyboard access, responsive tablet layouts, stable E2E fixtures, and an optional governed branch for user-selected generated art.

**Architecture:** React consumes only `GameApplicationPort` through a thin Zustand vanilla subscription adapter. UI renders immutable Runtime ViewModels and sends typed commands/persistence operations. Semantic DOM/CSS/Radix own all interactive UI; `AssetRegistry` resolves either approved runtime art or code-native fallbacks before `GameStage` exists, so generated images remain optional scene/character/prop assets and never become raster controls/text.

**Tech Stack:** React 19.2.7, React Router 7.18.1 HashRouter, Zustand 5.0.14, Radix Primitives, Motion 12.42.2, Lucide 1.24.0, CSS Modules/tokens, React Testing Library, Playwright, axe.

## Global Constraints

- Phase 3 gate must pass before UI starts.
- Player flavor exposes only `#/play` plus read-only diagnostic export; mutating DevTools are compile-time excluded.
- Developer flavor exposes `#/playground` and `#/preview/:fixtureId`; sidebars are optional and no Player-required information lives there.
- Preview resolves fixtures only from the statically selected active Story's `StoryDevelopmentSupportV1`; no route, URL, Save, or fixture ID may switch Story modules.
- `AssetRegistry`, preload behavior, and code-native scene/character/prop fallbacks are a mandatory prerequisite for `GameStage`; the mandatory Phase 4 gate succeeds with zero generated runtime images.
- Phase B Image Gen work is a pausable, post-UI branch. Candidate generation, visual review, terms review, or runtime integration never blocks the mandatory Phase 4 gate.
- Only the user can change an asset review status to `selected`, through an explicit approval. Codex may record `candidate`, `rejected`, or a terms evidence recommendation, but must never infer selection from "继续", ownership language, or generation success.
- `candidate`, terms-pending, terms-rejected, and user-unselected assets stay outside Player runtime manifest/digest/bundle. Required validation reports their exclusion and exits 0; malformed or unregistered runtime assets still fail.
- One primary Workspace Overlay at a time; nested detail uses a stack; focus enters and returns correctly.
- VN blocks underlying gameplay input except system/save operations explicitly allowed by Runtime.
- Full Player flow works with mouse, touch, and keyboard; no hover-only information; targets at least 44×44 CSS px.
- Base layout 1600×1000; support 1024×768 through 16:10; ultrawide stops stretching; 200% zoom uses functional reflow.
- Respect `prefers-reduced-motion`; do not use generated UI text/icons as runtime controls.

---

## File Map

```text
src/runtime/assets/types.ts                  # asset result/fallback contracts
src/runtime/assets/asset-registry.ts         # stable ID resolver
src/runtime/assets/preload.ts                # bounded loading groups
src/runtime/assets/fallbacks.ts              # code-native fallback descriptors
src/app/game-view-store.ts                   # one-way Zustand adapter over the application port
src/app/router.tsx                           # flavor-aware HashRouter
src/app/build-flavor.ts                      # compile-time player/developer discriminant
src/ui/theme/tokens.css                      # theme tokens
src/ui/primitives/Button.tsx                 # accessible primitive example
src/ui/shell/GameShell.tsx                   # shared shell and overlay host
src/ui/shell/PlayRoute.tsx                   # production Player/Developer play composition root
src/ui/stage/GameStage.tsx                   # central seven-layer stage
src/ui/stage/RunStartControl.tsx             # initial typed system control
src/ui/hud/TopHud.tsx                        # top status HUD
src/ui/overlays/ActionConfirmation.tsx       # common consequence confirmation
src/ui/overlays/InventoryOverlay.tsx         # inventory management surface
src/ui/overlays/WorldActionOverlay.tsx       # typed text-adventure option/step surface
src/ui/vn/VnLayer.tsx                        # dialogue/choice/check presentation
src/ui/debug/DevDock.tsx                     # Developer-only docks
src/ui/debug/PreviewRoute.tsx                # active-Story fixture preview
src/ui/errors/RootErrorBoundary.tsx           # UI recovery boundary
scripts/assets/validate-provenance.mts        # optional-art provenance validator
scripts/ui/verify-build-flavors.mts           # compile-time exclusion verifier
e2e/player-week.spec.ts                       # deterministic Player flow
e2e/import-recovery.spec.ts                   # invalid import/current recovery
e2e/multi-tab-conflict.spec.ts                # CAS/revision conflict
scripts/verify-ui.mts                         # mandatory Phase 4 gate
```

### Task 1: Establish AssetRegistry, preload semantics, and code-native fallbacks

**Files:**

- Create: `src/runtime/assets/types.ts`
- Create: `src/runtime/assets/asset-registry.ts`
- Create: `src/runtime/assets/asset-registry.test.ts`
- Create: `src/runtime/assets/preload.ts`
- Create: `src/runtime/assets/preload.test.ts`
- Create: `src/runtime/assets/fallbacks.ts`
- Create: `src/runtime/assets/governed-assets.test.ts`
- Create: `scripts/assets/validate-provenance.mts`
- Create: `scripts/assets/validate-runtime.mts`
- Create: `scripts/assets/assets.test.ts`
- Modify: `src/runtime/contracts/view-models.ts`
- Modify: `src/runtime/projection/stage-view-model.ts`
- Modify: `src/runtime/projection/projection.test.ts`
- Modify: `src/app/create-application.ts`
- Modify: `src/stories/tavern-poc/assets/manifest.ts`
- Create: `src/stories/tavern-poc/assets/asset-budgets.json`
- Create: `src/stories/e2e/assets/manifest.ts`
- Modify: `src/stories/e2e/index.ts`
- Modify generated: `src/test/fixtures/persistence/*.v1.json`
- Modify: `package.json`

**Interfaces:**

- Consumes: validated active Story `StoryAssetManifest`, stable `AssetId`, `AssetUsage`, `AssetLoadingGroup`, and `AssetLoadError` diagnostic sink.
- Produces: internal `AssetRegistry.resolve(id, usage): AssetResolutionV1`, `AssetRegistry.preload(group, signal): Promise<readonly AssetLoadResultV1[]>`, closed code-native fallback descriptors, resolved `AssetPresentationV1` leaves, and mandatory governance validators that pass a zero-runtime-image Story while rejecting an unregistered or unapproved runtime byte.

- [ ] **Step 1: Write failing registry/fallback tests**

Assert exact-ID and usage matching, no remote/root-relative URLs, deterministic loading-group order, abortable preload, one diagnostic per failed URL, and these resolution rules:

```text
declared runtime_image + selected + terms-approved + loadable -> runtime descriptor
declared code_fallback, or admitted runtime_image load failure -> code-native fallback descriptor
unknown Asset ID, wrong usage, or malformed/unapproved runtime_image metadata -> validation failure
```

The fallback descriptor carries a closed semantic token, accessible name, dimensions/safe-zone metadata, and neutral CSS palette; it never points at temporary raster bytes. Governance tests reject duplicate IDs, unregistered files, `references/`, malformed provenance, unknown/rejected licenses, any non-empty `inputAssets` record without an independently approved `inputUseReview`, and any runtime image when the fallback-only budget is zero; well-formed candidate or terms-pending source art is reported as excluded and succeeds.

- [ ] **Step 2: Add and run the focused failing script**

Add these exact package scripts:

```json
"test:ui:assets-core": "vitest run src/runtime/assets/asset-registry.test.ts src/runtime/assets/preload.test.ts src/runtime/projection/projection.test.ts",
"test:assets:governance": "vitest run scripts/assets/assets.test.ts src/runtime/assets/governed-assets.test.ts",
"assets:validate": "tsx scripts/assets/validate-provenance.mts --mode runtime && tsx scripts/assets/validate-runtime.mts --story tavern-poc"
```

Run: `pnpm test:ui:assets-core && pnpm test:assets:governance`

Expected: FAIL because registry/preload/fallback modules are missing.

- [ ] **Step 3: Implement the minimum pure registry and fallbacks**

Keep registry logic independent of React. A fallback-only Story manifest still declares every logical Asset ID with the catalog-defined `code_fallback` presentation and contains zero `runtime_image` entries; an actually unknown reference remains a bootstrap error. Preload returns result records instead of throwing an aggregate error and never fetches a fallback. Compose the registry in `src/app/create-application.ts`; `src/runtime/projection/stage-view-model.ts` resolves Story Asset IDs into readonly `AssetPresentationV1` values. UI receives those values only through `RuntimeViewModelV1` and never imports `src/runtime/assets/asset-registry.ts`.

- [ ] **Step 4: Implement mandatory fallback-only governance**

The provenance validator scans committed source records and classifies them without approving them. Empty-input original generation accepts explicit `inputUseReview: null`; any edited/generated derivative with inputs requires a non-null approved record containing the official evidence URL/date and allowed input use before those bytes were sent. This input permission remains independent of `termsReview`, which gates runtime distribution. The runtime validator reads only the active Story manifest, registered relative runtime files, hashes, dimensions/formats, loading groups, license decisions, and budgets. Create `asset-budgets.json` with schema revision 1 and exact zero ceilings for optional runtime image initial-load, per-file, and Story-total bytes; code-native CSS/SVG symbols are governed by the normal bundle budget, not this image budget. The first later admitted image must replace these zero ceilings with reviewed measured values in Task 7.

- [ ] **Step 5: Run the focused tests and required no-art build smoke**

Both Story asset manifests are Story-digest inputs, so first build their new provenance, run `pnpm fixtures:persistence:generate`, and inspect every persistence-fixture diff. The generator must change only deterministic provenance/digest-derived bytes and keep the dedicated mismatch fixture classified as mismatch. Then run `pnpm fixtures:persistence:verify` before the focused suite. Ordinary tests remain read-only.

Run: `pnpm test:ui:assets-core && pnpm test:assets:governance && pnpm assets:validate && pnpm story:build tavern-poc --flavor player && pnpm story:build e2e --flavor developer && pnpm fixtures:persistence:verify`

Expected: PASS; validators explicitly report zero admitted runtime images and excluded pending candidates, while both builds declare all logical Asset IDs as code-native fallbacks.

- [ ] **Step 6: Commit the asset runtime prerequisite**

```bash
git add src/runtime/assets/types.ts src/runtime/assets/asset-registry.ts src/runtime/assets/asset-registry.test.ts src/runtime/assets/preload.ts src/runtime/assets/preload.test.ts src/runtime/assets/fallbacks.ts src/runtime/assets/governed-assets.test.ts scripts/assets/validate-provenance.mts scripts/assets/validate-runtime.mts scripts/assets/assets.test.ts src/runtime/contracts/view-models.ts src/runtime/projection/stage-view-model.ts src/runtime/projection/projection.test.ts src/app/create-application.ts src/stories/tavern-poc/assets/manifest.ts src/stories/tavern-poc/assets/asset-budgets.json src/stories/e2e/assets/manifest.ts src/stories/e2e/index.ts src/test/fixtures/persistence package.json
git commit -m "feat: add code-native asset fallbacks"
```

### Task 2: Implement flavor-aware routes, theme tokens, primitives, and GameShell

**Files:**

- Create: `src/app/build-flavor.ts`
- Create: `src/app/game-view-store.ts`
- Create: `src/app/game-view-store.test.ts`
- Create: `src/app/router.tsx`
- Create: `src/app/router.test.tsx`
- Create: `src/ui/theme/tokens.css`
- Create: `src/ui/theme/global.css`
- Create: `src/ui/theme/motion.css`
- Create: `src/ui/primitives/Button.tsx`
- Create: `src/ui/primitives/Dialog.tsx`
- Create: `src/ui/primitives/Popover.tsx`
- Create: `src/ui/primitives/Tooltip.tsx`
- Create: `src/ui/primitives/ScrollArea.tsx`
- Create: `src/ui/primitives/primitives.test.tsx`
- Create: `src/ui/shell/GameShell.tsx`
- Create: `src/ui/shell/GameShell.module.css`
- Create: `src/ui/shell/GameShell.test.tsx`
- Create: `src/ui/shell/PlayRoute.tsx`
- Create: `src/ui/shell/PlayRoute.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/main.tsx`

**Interfaces:**

- Consumes: `GameApplicationPort`, build flavor define, mandatory `AssetRegistry` created in Task 1.
- Produces: HashRouter surfaces, one-way Zustand subscription adapter, global visual tokens, accessible primitives, and a real `PlayRoute` composition root with typed shell slots.

- [ ] **Step 1: Write route/flavor tests first**

Player: `#/play` renders; `#/playground` and `#/preview/:fixtureId` neither import nor render mutating debug modules. Developer's route table reserves all three paths but uses non-mutating shell placeholders until Task 6 replaces the two Developer targets with statically imported implementations. Unknown hash returns a Chinese not-found action back to play. Assert the router narrows the Phase 3 flavor-discriminated port and can never pair a Player port with a Developer route table.

- [ ] **Step 2: Confirm intended failures**

Run: `pnpm vitest run src/app/router.test.tsx src/app/game-view-store.test.ts src/ui/primitives/primitives.test.tsx src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement compile-time flavor selection**

Vite defines `__BUILD_FLAVOR__` as exact literal `"player" | "developer"`. Use separate static route arrays so Player tree-shaking removes every module reachable only through `src/ui/debug/index.ts`; do not check only at runtime.

Create `game-view-store.ts` at the app/runtime boundary. It subscribes once to `GameApplicationPort.view`, publishes the immutable `RuntimeViewModelV1` plus non-authoritative overlay/focus/loading/error state through Zustand vanilla selectors, and delegates every command/persistence call back to the flavor-safe Port. It never copies or mutates `GameState`, never uses persist middleware, and never imports Engine internals. `PlayRoute.tsx` owns this adapter and passes semantic `hud`, `stage`, `workspace`, `narrative`, `system`, and optional `developerDock` slots to `GameShell`; later tasks replace these slots explicitly rather than relying on component self-registration.

- [ ] **Step 4: Implement exact visual tokens from the visual baseline**

Create ink/parchment/brass/amber/sage/danger colors, focus ring, spacing, 44 px target minimum, type scale, panel opacity, 160–240 ms motion, and reduced-motion overrides from `docs/art/first-web-visual-pack.md`.

- [ ] **Step 5: Wrap only needed Radix primitives**

Wrappers expose semantic labels, focus restore, escape/close, portal container, and test IDs only when no accessible query exists. Keep domain language out of primitives.

- [ ] **Step 6: Run exact shell tests and all required flavor smoke builds**

Run: `pnpm vitest run src/app/router.test.tsx src/app/game-view-store.test.ts src/ui/primitives/primitives.test.tsx src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.test.tsx && pnpm story:build tavern-poc --flavor player && pnpm story:build tavern-poc --flavor developer && pnpm story:build e2e --flavor developer`

Expected: PASS; Player output contains no Developer route labels or DebugCommand kinds.

- [ ] **Step 7: Commit shell and routes**

```bash
git add src/app/build-flavor.ts src/app/game-view-store.ts src/app/game-view-store.test.ts src/app/router.tsx src/app/router.test.tsx src/app/App.tsx src/app/main.tsx src/ui/theme/tokens.css src/ui/theme/global.css src/ui/theme/motion.css src/ui/primitives/Button.tsx src/ui/primitives/Dialog.tsx src/ui/primitives/Popover.tsx src/ui/primitives/Tooltip.tsx src/ui/primitives/ScrollArea.tsx src/ui/primitives/primitives.test.tsx src/ui/shell/GameShell.tsx src/ui/shell/GameShell.module.css src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx
git commit -m "feat: add the flavor-aware game shell"
```

### Task 3: Implement GameStage, top HUD, responsive framing, and GameSymbol

**Files:**

- Create: `src/ui/stage/GameStage.tsx`
- Create: `src/ui/stage/GameStage.module.css`
- Create: `src/ui/stage/SceneBackground.tsx`
- Create: `src/ui/stage/CharacterLayer.tsx`
- Create: `src/ui/stage/SceneInteractionLayer.tsx`
- Create: `src/ui/stage/RunStartControl.tsx`
- Create: `src/ui/stage/RunStartControl.test.tsx`
- Create: `src/ui/stage/GameStage.test.tsx`
- Create: `src/ui/hud/TopHud.tsx`
- Create: `src/ui/hud/TopHud.module.css`
- Create: `src/ui/hud/StatusDetails.tsx`
- Create: `src/ui/hud/TopHud.test.tsx`
- Create: `src/ui/theme/GameSymbol.tsx`
- Create: `src/ui/theme/GameSymbol.test.tsx`
- Create: `src/ui/theme/game-symbols.css`
- Modify: `src/ui/shell/PlayRoute.tsx`
- Modify: `src/ui/shell/PlayRoute.test.tsx`

**Interfaces:**

- Consumes: Stage/HUD/Run ViewModels containing Task 1 `AssetPresentationV1` leaves and the Catalog-projected RunStart command, system Lucide icons; no Runtime implementation import.
- Produces: fixed seven-layer stage, the initial typed RunStart control, top summaries/details, code-native world symbols, viewport contracts.

- [ ] **Step 1: Write stage-layer and HUD behavior tests**

Assert layer order: background, character, scene interaction, HUD, workspace overlay, narrative, system dialog/toast. `PlayRoute` mounts the real `GameStage` and `TopHud` into the Task 2 shell slots and selects only their ViewModel leaves from the Zustand adapter. On the sequence-0 initial ViewModel, `RunStartControl` renders the exact `run.startControl.command` as a distinct system control—not an Action row—dispatches it once through the Port, disables while Session is busy, disappears after commit, and yields input to the manifest Narrative. A null control renders nothing; React never constructs `{kind:"run.start"}`. Scene interaction renders only Runtime visibility-passing `ActionViewModelV1` rows; future Facility/D5/apology/levy actions do not leak early, while current-window AP/cash/stamina failures remain visible and disabled with ordered reasons. Submission phases and resolved occupied phases render as separate concepts. A Story action retains the exact `{ kind: "story.action.start", actionId }` direct command, while a parameterized WorldAction opens its typed Overlay rather than guessing a payload. HUD summary shows day/phase/AP, both key stamina/mood, cash, reputation, and levy. Its explicit details surface shows the player's physique/social/intellect ranks, relationship stage/affection/teamwork, both complete mood states, and visible Auras with duration/indefinite labels. Details open on click/touch/keyboard, not hover. Missing and terms-pending assets render the code-native Task 1 fallback without layout shift.

- [ ] **Step 2: Write viewport contract tests**

Render at 1024×768, 1280×800, 1600×1000, and 2560×1080 container sizes. Assert 4:3 safe region, no stretch over 16:10, ultrawide side fill, collapsed HUD/reflow flags at 200% equivalent, and all key controls present.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/ui/stage/RunStartControl.test.tsx src/ui/stage/GameStage.test.tsx src/ui/hud/TopHud.test.tsx src/ui/theme/GameSymbol.test.tsx`

Expected: FAIL.

- [ ] **Step 4: Implement stage and responsive CSS**

Use CSS grid/absolute semantic layers, `aspect-ratio: 16 / 10`, max inline size, object-fit/object-position from Asset metadata, central safe-zone variables, and viewport/container queries. Portrait shows a rotate suggestion but keeps functional scroll/reflow. Implement `RunStartControl` from the exact nullable Runtime projection and standard Button primitive. Update `PlayRoute.tsx` in this task so the production route—not merely unit-test harnesses—renders these components.

- [ ] **Step 5: Implement the exact GameSymbol set**

Support the 14 IDs from the visual baseline (`actor.stamina` through `facility.comfortable_bed`) behind one mapping. System operations use direct Lucide only inside primitives/shell. Every symbol has an accessible name and non-color state cue.

- [ ] **Step 6: Run the exact focused PASS command**

Run: `pnpm vitest run src/ui/stage/RunStartControl.test.tsx src/ui/stage/GameStage.test.tsx src/ui/hud/TopHud.test.tsx src/ui/theme/GameSymbol.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit stage and HUD**

```bash
git add src/ui/stage/GameStage.tsx src/ui/stage/GameStage.module.css src/ui/stage/SceneBackground.tsx src/ui/stage/CharacterLayer.tsx src/ui/stage/SceneInteractionLayer.tsx src/ui/stage/RunStartControl.tsx src/ui/stage/RunStartControl.test.tsx src/ui/stage/GameStage.test.tsx src/ui/hud/TopHud.tsx src/ui/hud/TopHud.module.css src/ui/hud/StatusDetails.tsx src/ui/hud/TopHud.test.tsx src/ui/theme/GameSymbol.tsx src/ui/theme/GameSymbol.test.tsx src/ui/theme/game-symbols.css src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx
git commit -m "feat: add the responsive central game stage"
```

### Task 4: Implement Workspace Overlay stack and all Player management surfaces

**Files:**

- Create: `src/ui/shell/overlay-stack.ts`
- Create: `src/ui/shell/overlay-stack.test.ts`
- Create: `src/ui/overlays/LifePolicyOverlay.tsx`
- Create: `src/ui/overlays/LifePolicyOverlay.test.tsx`
- Create: `src/ui/overlays/ActionConfirmation.tsx`
- Create: `src/ui/overlays/ActionConfirmation.test.tsx`
- Create: `src/ui/overlays/ObligationOverlay.tsx`
- Create: `src/ui/overlays/PurchaseOverlay.tsx`
- Create: `src/ui/overlays/InventoryOverlay.tsx`
- Create: `src/ui/overlays/ServicePlanOverlay.tsx`
- Create: `src/ui/overlays/FacilityOverlay.tsx`
- Create: `src/ui/overlays/WorldActionOverlay.tsx`
- Create: `src/ui/overlays/WorldActionOverlay.test.tsx`
- Create: `src/ui/overlays/LedgerOverlay.tsx`
- Create: `src/ui/overlays/SaveOverlay.tsx`
- Create: `src/ui/overlays/WeekSummaryOverlay.tsx`
- Create: `src/ui/overlays/overlays.module.css`
- Create: `src/ui/overlays/overlays.test.tsx`
- Modify: `src/ui/shell/PlayRoute.tsx`
- Modify: `src/ui/shell/PlayRoute.test.tsx`

**Interfaces:**

- Consumes: action/confirmation/rejection/forecast, WorldAction, inventory, ledger, save ViewModels and application-port operations.
- Produces: complete management, consequence confirmation, explanation, save, and ending flows without direct formulas.

- [ ] **Step 1: Write overlay stack/focus tests**

Only one primary overlay; nested detail stacks above it; pointer input to stage is blocked; opening focuses heading/first control; escape/close returns focus to exact trigger; route/command change cannot leave orphan portals. Every stack entry uses the Contract Catalog's closed Debug UI overlay ID (`hud_details`, `life_policy`, `obligation`, `purchase`, `inventory`, `service_plan`, `facility_choice`, `world_action`, `ledger`, `save`, `week_summary`, `action_confirmation`, or `recovery`); DebugBundle UI context preserves the exact ordered stack without accepting component names or arbitrary strings.

- [ ] **Step 2: Write generic ActionConfirmation tests**

Before every executable command can dispatch, its surface renders the exact closed arrays already frozen on `ActionViewModelV1.confirmation`: `costs`, `benefits`, separately labelled submission window and committed `occupiedPhases`, labels resolved from `mutuallyExcludedActionIds`, and copy resolved from `majorRiskTextIds`. Cross-check these values against the current `CommandPreviewV1`/typed domain preview; an empty category displays explicit `无`, never silently disappears. A zero-cost, non-destructive advance may show this summary inline; any nonzero cost, exclusion, destructive effect, or major risk must use `ActionConfirmation`. Confirm dispatches the exact typed `directCommand` once for `story.action.start`; parameterized actions cannot synthesize a command here. A stale preview or dispatch rejection renders localized text from the exact code/details, refreshes projection/forecast, and never parses a message or guesses new values.

- [ ] **Step 3: Write management and inventory behavior tests**

`LifePolicyOverlay` opens automatically when the required Runtime `lifePolicy` projection becomes non-null after the manifest Scene. It renders Story order, name, per-phase AP, night recovery/reason, and submits only the exact option command; it never imports Balance or constructs a PolicyId. It cannot be dismissed into a soft-lock and disappears after the committed choice. Purchase supports multiple integer lines in one confirmation and rejects/announces invalid quantities. Inventory shows quantity, freshness/expiry, reserved amount, and shortage/spoilage warning without recomputing them. Purchase and ServicePlan surfaces render Runtime's UI-safe demand ranges and ModifierSource/Reason explanations—exact on D1, ranged from D2—without access to actual customers or random offsets. Service plan shows 1–2 recipes, portions, all four modes, immediate zero-cost plan commitment plus the separate exact future AP/player-stamina/heroine-stamina/wage/opening-fee/modifier/total-cash costs, ingredient shortages, sales/net ranges and risks from `previewTavernPlan`; it never derives a formula. Before Start those costs are prospective; during Opening they are visibly committed and the remaining delta cannot double-charge. It renders Start/Continue/Finalize solely from `servicePlan.currentOpeningControl`, using the exact command/allowed-or-reasons projection; active VN hides that control and no component infers workflow state. Structurally invalid/mode-locked plans cannot submit; a resource-short plan may be saved as a warned draft, and evening Advance offers the typed emergency-closure consequence instead of soft-locking. Copy-yesterday always runs a fresh validated command. Facility shows cold storage/bed/skip concrete effects and the merged opportunity/build-or-skip confirmation. `WorldActionOverlay` renders Story-declared action/option/step IDs, availability reasons, confirmation metadata, AP/stamina/cash and persisted progress from Runtime, then dispatches the exact `{ kind: "world.action.begin", actionId, optionId }`. The central VN layer owns both step Scenes; normal phase advance moves `awaiting_completion_phase` into `completion_scene`, and the Overlay dispatches `world.action.complete` only at `ready_to_complete`. It preserves exact unavailable/missing/wrong-phase/Narrative/workflow-blocked/conflict details. Ledger explains every required line, applied modifier and reason, while ObligationOverlay renders `current_gap | committed_plan_conservative | final` directly and is absent when Runtime returns null; infeasible plans stay current-gap and it never recomputes cash or levy.

- [ ] **Step 4: Write save/summary tests**

Expose Auto current/recovery, Quick, Manual, import/export/clear, exact four-field compatibility/refusal, unsafe-to-close, and current/previous recovery labels. A mismatched Save shows stored/current Story ID/revision/digest and Engine digest plus display-only Engine version, export, and cancel actions; it never offers a load/adopt bypass and never treats version/appBuildId as a blocker. Save fixtures rendered through the real projection preserve the run's `initialSeed`, resolved-check presentation, and terminal completion. Week summary reads persisted completion into independent tavern/relationship/investigation columns and exact restart/export actions; restart returns to a sequence-0 ViewModel with the projected RunStart control and does not silently execute `run.start`. Reopening a terminal Save must not ask Runtime to resolve an ending again.

- [ ] **Step 5: Confirm intended failures**

Run: `pnpm vitest run src/ui/shell/overlay-stack.test.ts src/ui/overlays/LifePolicyOverlay.test.tsx src/ui/overlays/ActionConfirmation.test.tsx src/ui/overlays/WorldActionOverlay.test.tsx src/ui/overlays/overlays.test.tsx src/ui/shell/PlayRoute.test.tsx`

Expected: FAIL.

- [ ] **Step 6: Implement overlays from ViewModels only**

Every confirm submits a typed command/persistence operation supplied by ViewModel data. Do not import balance/rules/domain state or recompute predictions in React. Purchase, plan, facility, StoryAction, WorldAction, destructive save actions, and other major-risk actions all compose the same `ActionConfirmation`. Update `PlayRoute.tsx` to mount the overlay host and each Player Overlay into the production `workspace` slot, driven by the Zustand adapter's non-authoritative overlay stack.

- [ ] **Step 7: Run the exact RTL keyboard/touch PASS command**

Use `userEvent` tab/enter/escape plus pointer clicks; assert live-region result/rejection/save announcements.

Run: `pnpm vitest run src/ui/shell/overlay-stack.test.ts src/ui/overlays/LifePolicyOverlay.test.tsx src/ui/overlays/ActionConfirmation.test.tsx src/ui/overlays/WorldActionOverlay.test.tsx src/ui/overlays/overlays.test.tsx src/ui/shell/PlayRoute.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit management overlays**

```bash
git add src/ui/shell/overlay-stack.ts src/ui/shell/overlay-stack.test.ts src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx src/ui/overlays/LifePolicyOverlay.tsx src/ui/overlays/LifePolicyOverlay.test.tsx src/ui/overlays/ActionConfirmation.tsx src/ui/overlays/ActionConfirmation.test.tsx src/ui/overlays/ObligationOverlay.tsx src/ui/overlays/PurchaseOverlay.tsx src/ui/overlays/InventoryOverlay.tsx src/ui/overlays/ServicePlanOverlay.tsx src/ui/overlays/FacilityOverlay.tsx src/ui/overlays/WorldActionOverlay.tsx src/ui/overlays/WorldActionOverlay.test.tsx src/ui/overlays/LedgerOverlay.tsx src/ui/overlays/SaveOverlay.tsx src/ui/overlays/WeekSummaryOverlay.tsx src/ui/overlays/overlays.module.css src/ui/overlays/overlays.test.tsx
git commit -m "feat: add player management overlays"
```

### Task 5: Implement VN presentation and blocking choice/check flow

**Files:**

- Create: `src/ui/vn/VnLayer.tsx`
- Create: `src/ui/vn/VnLayer.module.css`
- Create: `src/ui/vn/DialogueBox.tsx`
- Create: `src/ui/vn/ChoiceList.tsx`
- Create: `src/ui/vn/CheckResult.tsx`
- Create: `src/ui/vn/VnLayer.test.tsx`
- Modify: `src/ui/shell/PlayRoute.tsx`
- Modify: `src/ui/shell/PlayRoute.test.tsx`
- Modify: `package.json`

**Interfaces:**

- Consumes: `NarrativeProjection` and narrative commands.
- Produces: dialogue/narration/stage cues, enabled/disabled/explained choices, deterministic check presentation.

- [ ] **Step 1: Write blocking/input/focus tests**

VN choice blocks stage management commands, allows configured system/save actions, focuses the dialogue/choice region, exposes disabled explanation without hover, and returns focus/interaction when narrative unblocks. A successful `story.action.start` scene enters this same production layer with source/action identity preserved. Before a choice dispatches, render its `NarrativeChoiceViewModelV1.confirmation`; any cost, exclusion, destructive effect, or major risk uses the shared confirmation dialog rather than hiding consequences in prose.

- [ ] **Step 2: Write relation/check presentation tests**

Show deterministic attribute gates as `[智力 B]` without percentage/dice. Show random check modifiers and committed dice/result only from persisted `resolvedChecks` after resolution; remounting the route must render the same record and never request a reroll. `heroine.angry` changes cue/expression Asset ID but not relation-stage labels; absent art resolves through the mandatory fallback.

- [ ] **Step 3: Add and run the exact focused failing script**

Add this exact package script:

```json
"test:ui:vn": "vitest run src/ui/vn/VnLayer.test.tsx src/ui/shell/PlayRoute.test.tsx"
```

Run: `pnpm test:ui:vn`

Expected: FAIL because VN components are missing.

- [ ] **Step 4: Implement VN from projections/cues**

Render Story text as text nodes; never `dangerouslySetInnerHTML`. Motion respects reduced-motion and never delays command availability. Stale choice rejection refreshes projection and announces the exact typed reason. Update `PlayRoute.tsx` in this task to mount `VnLayer` in the production `narrative` slot and block the already-mounted Stage/Overlay input through the shared adapter.

- [ ] **Step 5: Run the exact focused PASS command**

Run: `pnpm test:ui:vn`

Expected: PASS.

- [ ] **Step 6: Commit VN layer**

```bash
git add src/ui/vn/VnLayer.tsx src/ui/vn/VnLayer.module.css src/ui/vn/DialogueBox.tsx src/ui/vn/ChoiceList.tsx src/ui/vn/CheckResult.tsx src/ui/vn/VnLayer.test.tsx src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx package.json
git commit -m "feat: add visual novel presentation"
```

### Task 6: Implement Developer DevDock, active-Story scene preview, and controlled DebugCommands

**Files:**

- Create: `src/ui/debug/index.ts`
- Create: `src/ui/debug/DevDock.tsx`
- Create: `src/ui/debug/DevDock.module.css`
- Create: `src/ui/debug/StateInspector.tsx`
- Create: `src/ui/debug/CommandLogInspector.tsx`
- Create: `src/ui/debug/DebugTools.tsx`
- Create: `src/ui/debug/DeveloperNotes.tsx`
- Create: `src/ui/debug/DevDock.test.tsx`
- Create: `src/ui/debug/PreviewRoute.tsx`
- Create: `src/ui/debug/PreviewRoute.test.tsx`
- Create: `src/ui/debug/PlaygroundRoute.tsx`
- Modify: `src/runtime/diagnostics/debug-command-service.ts`
- Modify: `src/runtime/diagnostics/debug-command-service.test.ts`
- Create: `scripts/ui/verify-build-flavors.mts`
- Modify: `src/stories/tavern-poc/development.ts`
- Modify: `src/stories/e2e/development.ts`
- Modify: `scripts/story-cli.mts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `src/app/create-application.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/app/router.test.tsx`
- Modify: `src/ui/shell/PlayRoute.tsx`
- Modify: `src/ui/shell/PlayRoute.test.tsx`

**Interfaces:**

- Consumes: Developer-only route, active Story's statically linked `StoryDevelopmentSupportV1`, Phase 3's Engine-owned replayable Debug handler/Runtime service, diagnostic ViewModels, and serialized DebugCommands.
- Produces: optional left observer/right tools/notes docks and active-Story fixture resolver/UI wiring; it does not redefine deterministic Debug mutation semantics.

- [ ] **Step 1: Test the existing Debug service through the active-Story resolver**

Import `DebugCommandV1`, `replayableDebugCommandKinds`, `anchoringDebugCommandKinds`, and `debugCommandKinds` from the Phase 1 contract module; their exact literals are frozen by `docs/superpowers/specs/2026-07-10-engine-contract-catalog.md` §9.3. Phase 3 already exhaustively implements validation and Engine-owned replayable handlers. Here assert the Story CLI injects exactly one active-Story `FixtureResolverV1`, anchoring fixture load returns the Catalog operation result/clears the old log, and all replayable commands still delegate to the Engine service. Do not restate, redefine, or place mutation handlers under Runtime/UI.

- [ ] **Step 2: Write dock toggle/responsive tests**

Lucide Bug button independently opens left/right/both; hide-all leaves only Bug button; wide layout uses real columns, tablet uses mutually exclusive drawers; Player build cannot import `src/ui/debug/index.ts`.

- [ ] **Step 3: Write active-Story preview route tests**

`#/preview/:fixtureId` resolves `fixtureId` only in the current build's `StoryDevelopmentSupportV1.fixtures`, then loads that fixture through the narrowed `DeveloperApplicationPort.developer.executeDebugCommand({ kind: "debug.fixture.load", ... })`. A tavern-poc Developer build can render a tavern-poc fixture and cannot resolve an E2E-only fixture; the inverse holds for an E2E Developer build. Unknown fixture returns an explanatory developer page. Developer notes/choice explanations remain outside GameState, Save, and Story digest. Port tests prove Player has no DebugBundle import/replay methods and cannot be passed to either Developer route.

The Story CLI creates a Developer-only static alias for the selected Story's `development.ts`; `PreviewRoute` imports that alias and never imports either concrete Story directly. Player builds define no development alias and contain no fixture data.

- [ ] **Step 4: Add and run exact focused failing scripts**

Add these exact package scripts:

```json
"test:ui:debug": "vitest run src/ui/debug/DevDock.test.tsx src/ui/debug/PreviewRoute.test.tsx src/app/router.test.tsx src/ui/shell/PlayRoute.test.tsx src/runtime/diagnostics/debug-command-service.test.ts",
"verify:ui:flavors": "tsx scripts/ui/verify-build-flavors.mts"
```

Run: `pnpm test:ui:debug`

Expected: FAIL because Developer components and active-Story resolver wiring are missing.

- [ ] **Step 5: Implement docks/tools through application port**

Left shows Snapshot projection, persisted `initialSeed`/resolved checks/completion, Story Facts/Auras/invariants/CommandLog. Right fixes RNG, jumps only within the active Story's fixtures, imports/replays Dump, executes bounded DebugCommands through `DeveloperApplicationPort.developer`, and shows notes. Developer composition injects the service in `create-application.ts`; Player composition returns the distinct Player port with literal `developer:null` and imports no Developer implementation. Replace Task 2's Developer placeholders in `router.tsx` with `PlaygroundRoute` and `PreviewRoute`, and have `PlaygroundRoute` compose the real `PlayRoute` plus `DevDock`; do not create a parallel game shell. No React field mutation exists.

- [ ] **Step 6: Run the exact focused PASS command**

Run: `pnpm test:ui:debug`

Expected: PASS.

- [ ] **Step 7: Prove all three static flavor/Story combinations**

`scripts/ui/verify-build-flavors.mts` invokes the controlled Story CLI with exact ignored outputs `.tmp/ui-flavors/tavern-player`, `.tmp/ui-flavors/tavern-developer`, and `.tmp/ui-flavors/e2e-developer`; add only `.tmp/ui-flavors/` to `.gitignore`. It imports the Phase 1 `debugCommandKinds` list and asserts every serialized kind is absent from Player output, alongside `PlaygroundRoute`, `DeveloperNotes`, and fixture note text. It also asserts tavern-poc Developer starts and resolves one tavern fixture while E2E Developer resolves one E2E fixture.

Run: `pnpm story:build tavern-poc --flavor developer && pnpm verify:ui:flavors`

Expected: PASS; the explicit tavern-poc Developer smoke exits 0 and the three-output exclusion/fixture checks pass.

- [ ] **Step 8: Commit Developer UI**

```bash
git add src/ui/debug/index.ts src/ui/debug/DevDock.tsx src/ui/debug/DevDock.module.css src/ui/debug/StateInspector.tsx src/ui/debug/CommandLogInspector.tsx src/ui/debug/DebugTools.tsx src/ui/debug/DeveloperNotes.tsx src/ui/debug/DevDock.test.tsx src/ui/debug/PreviewRoute.tsx src/ui/debug/PreviewRoute.test.tsx src/ui/debug/PlaygroundRoute.tsx src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx src/runtime/diagnostics/debug-command-service.ts src/runtime/diagnostics/debug-command-service.test.ts scripts/ui/verify-build-flavors.mts src/stories/tavern-poc/development.ts src/stories/e2e/development.ts src/app/create-application.ts src/app/router.tsx src/app/router.test.tsx scripts/story-cli.mts vite.config.ts package.json .gitignore
git commit -m "feat: add controlled developer docks"
```

### Task 7: Optionally generate Phase B candidates and integrate only user-selected, terms-approved art

**Status:** Optional and pausable. Do not execute this task while writing or reviewing the plan. At execution time, invoke the `imagegen` skill before any generation/edit action. If the user postpones or pauses this task, continue directly to Task 8; Tasks 1–6 already provide the complete required fallback path.

**Files:**

- Create: `art-source/imagegen/first-web-pack/tavern-main-evening/source.png`
- Create: `art-source/imagegen/first-web-pack/tavern-main-evening/prompt.md`
- Create: `art-source/imagegen/first-web-pack/tavern-main-evening/provenance.json`
- Create: `art-source/imagegen/first-web-pack/heroine-working/source.png`
- Create: `art-source/imagegen/first-web-pack/heroine-working/prompt.md`
- Create: `art-source/imagegen/first-web-pack/heroine-working/provenance.json`
- Create: `art-source/imagegen/first-web-pack/heroine-angry/source.png`
- Create: `art-source/imagegen/first-web-pack/heroine-angry/prompt.md`
- Create: `art-source/imagegen/first-web-pack/heroine-angry/provenance.json`
- Create: `art-source/imagegen/first-web-pack/tavern-sign-repaired/source.png`
- Create: `art-source/imagegen/first-web-pack/tavern-sign-repaired/prompt.md`
- Create: `art-source/imagegen/first-web-pack/tavern-sign-repaired/provenance.json`
- Create: `scripts/assets/normalize-runtime.mts`
- Modify conditionally: `art-source/imagegen/first-web-pack/tavern-main-day/provenance.json`
- Modify conditionally: `art-source/imagegen/first-web-pack/heroine-neutral/provenance.json`
- Modify conditionally: `art-source/imagegen/first-web-pack/tavern-sign-damaged/provenance.json`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/backgrounds/tavern-main-day.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/backgrounds/tavern-main-evening.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/characters/heroine/neutral.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/characters/heroine/working.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/characters/heroine/angry.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/props/tavern-sign-damaged.webp`
- Create conditionally: `src/stories/tavern-poc/assets/runtime/props/tavern-sign-repaired.webp`
- Modify: `scripts/assets/validate-provenance.mts`
- Modify: `scripts/assets/validate-runtime.mts`
- Modify: `scripts/assets/assets.test.ts`
- Modify: `src/runtime/assets/governed-assets.test.ts`
- Modify: `src/stories/tavern-poc/assets/asset-budgets.json`
- Modify: `src/stories/tavern-poc/assets/manifest.ts`
- Modify conditionally: `src/test/fixtures/persistence/*.v1.json`
- Modify: `docs/art/first-web-visual-pack.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: explicitly approved Phase A anchors, `imagegen` skill, provenance policy, Story Asset IDs, Task 1 registry/fallbacks.
- Produces: four identity-preserving Phase B source candidates and, only after two independent approvals per asset, validated optional runtime exports for the three usable Phase A anchors plus Phase B derivatives with measured budgets. The Phase A UI concept remains a design reference and is never a runtime control/background.

- [ ] **Step 1: Pause for permission, verify input-use rights, then invoke imagegen and inspect every source**

Before this step begins, obtain an explicit user instruction to generate Phase B. Verify and record official evidence that every Phase A input may be sent back to the selected image-edit service; this input-use check is required before upload and is separate from later commercial/runtime admission. If evidence is absent or rejects model input, stop without sending bytes. Then invoke the `imagegen` skill, read its complete `SKILL.md`, and use `view_image` on every local source before editing. This plan revision does not generate any image.

Use built-in Image Gen edits:

- day → evening: change only ambient/window/hearth/candle lighting; preserve camera/geometry/furniture relationships;
- neutral → working: preserve identity/outfit/scale/canvas/light; change only expression and small hand pose;
- neutral → angry: preserve the same invariants; express guarded displeasure, not comic rage;
- damaged → repaired: same sign/bracket/camera/scale; repair wood and reinforce it without lettering/emblem.

Save each source, exact edit prompt, explicit input list, input-use evidence URL/date/status, actual model disclosure, timestamp, SHA-256, and `candidate/pending` provenance. Do not generate independent replacements.

- [ ] **Step 2: Archive and commit review candidates before any selection decision**

Validate prompt/input/hash/provenance completeness, then commit only immutable candidate sources and their records:

```bash
git add art-source/imagegen/first-web-pack/tavern-main-evening/source.png art-source/imagegen/first-web-pack/tavern-main-evening/prompt.md art-source/imagegen/first-web-pack/tavern-main-evening/provenance.json art-source/imagegen/first-web-pack/heroine-working/source.png art-source/imagegen/first-web-pack/heroine-working/prompt.md art-source/imagegen/first-web-pack/heroine-working/provenance.json art-source/imagegen/first-web-pack/heroine-angry/source.png art-source/imagegen/first-web-pack/heroine-angry/prompt.md art-source/imagegen/first-web-pack/heroine-angry/provenance.json art-source/imagegen/first-web-pack/tavern-sign-repaired/source.png art-source/imagegen/first-web-pack/tavern-sign-repaired/prompt.md art-source/imagegen/first-web-pack/tavern-sign-repaired/provenance.json docs/art/first-web-visual-pack.md
git commit -m "art: add phase B imagegen candidates"
```

- [ ] **Step 3: Stop for explicit user selection**

Present the three runtime-eligible Phase A anchors together with Phase B candidates. Only a user message naming each accepted asset/version may change its `review.status` from `candidate` to `selected`; selection is per asset, so a Phase A anchor can be admitted without its derivative and vice versa. The Phase A UI concept cannot be selected for runtime use. Rejection remains non-destructive; version one targeted edit at a time. Neither Codex nor a test may auto-select an image.

- [ ] **Step 4: Collect runtime/commercial terms evidence as a separate decision**

Record official source URL/date/allowed-use evidence for runtime distribution and the intended commercial scope. `termsReview.status` remains `pending` until a human changes it to `approved` or `rejected`. User selection does not imply terms approval, and terms approval does not imply user selection; neither substitutes for Step 1's input-use evidence.

- [ ] **Step 5: Extend the mandatory governance tests for admitted art**

Reject duplicate runtime IDs, missing prompt/input/hash for any committed candidate, pending/rejected runtime asset, wrong dimensions/format, remote URL, unknown license, source/runtime hash mismatch, unregistered bytes, budget overflow, and any `references/` path. A well-formed candidate with pending terms must be reported as excluded and must not fail the mandatory gate.

Keep Task 1's `test:assets:governance` and `assets:validate` mappings unchanged. Add only:

```json
"assets:normalize": "tsx scripts/assets/normalize-runtime.mts"
```

Run: `pnpm test:assets:governance`

Expected: FAIL on the newly added admitted-art normalization/hash/budget cases because `normalize-runtime.mts` and the runtime-manifest update do not exist yet.

- [ ] **Step 6: Implement deterministic normalization only for selected plus terms-approved assets**

Use sharp with explicit dimensions/crop/color profile/metadata stripping/quality. Background master contract is 2560×1600; runtime WebP derivatives are measured. Character/prop alpha requires a separately approved, validated process; if unavailable, keep the Task 1 code-native fallback and do not ship a dirty matte. The normalizer is a closed seven-entry mapping: Phase A day/neutral/damaged plus Phase B evening/working/angry/repaired; it rejects every other source/output pair.

On every normalized export, atomically replace that provenance record's `runtime` with the closed-schema `RuntimeExportV1` containing the exact relative path, format, measured dimensions, byteLength, loadingGroup, budgetGroup, and SHA-256. Runtime validation rejects a manifest admission when provenance is still `runtime:null` or any field differs from the bytes. Re-running normalization must produce byte-identical output and byte-identical provenance.

First make the focused implementation tests green in fallback-only mode, then commit the reusable governance infrastructure whether or not any asset has both approvals:

```bash
pnpm test:assets:governance
git add scripts/assets/validate-provenance.mts scripts/assets/normalize-runtime.mts scripts/assets/validate-runtime.mts scripts/assets/assets.test.ts src/runtime/assets/governed-assets.test.ts package.json docs/art/first-web-visual-pack.md
git commit -m "feat: add governed asset normalization"
```

After the implementation test is green and only if at least one candidate has both approvals, run: `pnpm assets:normalize`

Expected: creates or replaces only the exact conditional runtime path corresponding to each doubly approved provenance record; an unselected, terms-pending/rejected, hash-mismatched, or unlisted candidate creates no output. Re-running produces byte-identical WebP files and no additional path.

- [ ] **Step 7: Establish measured budgets only when the first runtime asset is admitted**

After the first selected plus terms-approved background/character/prop runtime export, replace Task 1's exact zero ceilings with reviewed initial-load, per-file, and total Story byte ceilings derived from measured artifacts. Test an over-budget fixture fails; never auto-raise thresholds. If no art is admitted, leave the zero-budget file untouched and continue on the fallback-only path.

The admitted runtime manifest and runtime bytes are Story-digest inputs. After the complete admitted set, manifest, and measured budgets are final—but before the integration commit—run `pnpm fixtures:persistence:generate`, inspect every one of the nine fixture diffs, and then run `pnpm fixtures:persistence:verify`. The generator may update only deterministic provenance/digest-derived fields while preserving each fixture's intended exact/mismatch/rejected classification. Commit every changed persistence fixture with the same runtime integration. Candidate/provenance-only review decisions are not Story-digest inputs: if no runtime asset is admitted, do not run the generator and require the tracked fixture tree to remain byte-for-byte unchanged.

- [ ] **Step 8: Run exact optional-asset PASS commands**

Run: `pnpm test:assets:governance && pnpm assets:validate && pnpm test:ui:assets-core && pnpm fixtures:persistence:verify`

Expected: PASS. Candidate or terms-pending sources are listed as excluded, Player manifest contains only admitted assets plus code-native fallbacks, no pending review blocks exit 0, and all nine tracked persistence fixtures match the current Story/Engine provenance. On the fallback-only path the verifier must confirm that no fixture changed.

- [ ] **Step 9: Commit runtime integration only after both approvals**

Only after explicit user selection and runtime/commercial terms approval, stage the manifest/budget changes, each normalized provenance record, and each admitted file from the exact conditional allowlist above. The governance infrastructure was already committed in Step 6. Omit every unadmitted path; do not use a glob:

```bash
git add src/stories/tavern-poc/assets/asset-budgets.json src/stories/tavern-poc/assets/manifest.ts
git add src/test/fixtures/persistence
# Run one exact provenance command below for each candidate whose selection or terms record changed:
git add art-source/imagegen/first-web-pack/tavern-main-day/provenance.json
git add art-source/imagegen/first-web-pack/heroine-neutral/provenance.json
git add art-source/imagegen/first-web-pack/tavern-sign-damaged/provenance.json
git add art-source/imagegen/first-web-pack/tavern-main-evening/provenance.json
git add art-source/imagegen/first-web-pack/heroine-working/provenance.json
git add art-source/imagegen/first-web-pack/heroine-angry/provenance.json
git add art-source/imagegen/first-web-pack/tavern-sign-repaired/provenance.json
# Run one exact command below only for each admitted artifact:
git add src/stories/tavern-poc/assets/runtime/backgrounds/tavern-main-day.webp
git add src/stories/tavern-poc/assets/runtime/backgrounds/tavern-main-evening.webp
git add src/stories/tavern-poc/assets/runtime/characters/heroine/neutral.webp
git add src/stories/tavern-poc/assets/runtime/characters/heroine/working.webp
git add src/stories/tavern-poc/assets/runtime/characters/heroine/angry.webp
git add src/stories/tavern-poc/assets/runtime/props/tavern-sign-damaged.webp
git add src/stories/tavern-poc/assets/runtime/props/tavern-sign-repaired.webp
git commit -m "feat: admit the governed runtime asset pack"
```

The bounded persistence directory is staged only in this admitted-runtime branch, after the explicit generate/review/verify sequence above. It must not be staged by the candidate archive, governance-infrastructure, or review-decision-only commits.

If no candidate receives both approvals, the Step 6 infrastructure commit already leaves a clean engineering tree. Record any explicit selection/terms decisions in Phase A or Phase B provenance and, only when that review changed tracked bytes, run the exact commands for the changed records; the complete possible list is:

```bash
git add art-source/imagegen/first-web-pack/tavern-main-day/provenance.json art-source/imagegen/first-web-pack/heroine-neutral/provenance.json art-source/imagegen/first-web-pack/tavern-sign-damaged/provenance.json art-source/imagegen/first-web-pack/tavern-main-evening/provenance.json art-source/imagegen/first-web-pack/heroine-working/provenance.json art-source/imagegen/first-web-pack/heroine-angry/provenance.json art-source/imagegen/first-web-pack/tavern-sign-repaired/provenance.json
git commit -m "art: record runtime asset review decisions"
```

Then rerun the fallback-only PASS commands and finish this optional task without an empty runtime-integration commit.

### Task 8: Add UI/runtime error boundaries, loading, save status, and recovery surfaces

**Files:**

- Create: `src/ui/errors/RootErrorBoundary.tsx`
- Create: `src/ui/errors/StageErrorBoundary.tsx`
- Create: `src/ui/errors/VnErrorBoundary.tsx`
- Create: `src/ui/errors/RecoveryOverlay.tsx`
- Create: `src/ui/errors/errors.test.tsx`
- Create: `src/ui/shell/LoadingScreen.tsx`
- Create: `src/ui/shell/SaveStatus.tsx`
- Create: `src/ui/shell/ToastRegion.tsx`
- Create: `src/ui/shell/system-status.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/main.tsx`
- Modify: `src/app/create-application.ts`
- Modify: `src/app/game-view-store.ts`
- Modify: `src/app/game-view-store.test.ts`
- Modify: `src/runtime/diagnostics/debug-service.ts`
- Modify: `src/runtime/diagnostics/debug-service.test.ts`
- Modify: `src/ui/shell/GameShell.tsx`
- Modify: `src/ui/shell/GameShell.test.tsx`
- Modify: `src/ui/shell/PlayRoute.tsx`
- Modify: `src/ui/shell/PlayRoute.test.tsx`

**Interfaces:**

- Consumes: typed runtime errors, persistence/diagnostic recovery operations.
- Produces: local recovery without destroying EngineSession, accessible save/unsafe/fault status.

- [ ] **Step 1: Write render/async failure tests**

Root, Stage, and VN render failures preserve EngineSession and offer UI reload, last save, Dump export, or restart as appropriate. Tests mount the actual `App`/`PlayRoute` composition and prove Root wraps the router, while Stage and VN boundaries wrap their respective production slots. Event handler/asset/persistence/dispatch Promise failures are caught by `game-view-store.ts`, normalized through the application facade, and reach the same stable error model, never an unhandled rejection. Export the resulting DebugBundle and assert the exact `UiFaultCodeV1`/Asset/Persistence/Runtime entry appears once in bounded `runtimeFailures`, while CommandLog and `failure` remain reserved for simulation dispatch attempts.

- [ ] **Step 2: Write save/degraded-state tests**

Show saving/saved/conflict/unsafe-to-close/read-only/incompatible/invalidated states with `aria-live`. Never flash saved before write-read verification. JSON export remains available on IDB failure or compatibility refusal. A post-check reload remounts the same persisted resolved-check result; a terminal reload remounts the same completion/WeekSummary; Developer status retains the persisted initial seed. None dispatches a check or Ending command during render.

- [ ] **Step 3: Confirm intended failures**

Run: `pnpm vitest run src/ui/errors/errors.test.tsx src/ui/shell/system-status.test.tsx src/app/game-view-store.test.ts src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.test.tsx`

Expected: FAIL.

- [ ] **Step 4: Implement boundaries and recovery actions**

React boundaries handle render only; application facade catches async categories. `create-application.ts` statically injects one App-owned, typed Runtime-fault sink into the boundaries/adapter; it is not Story-accessible, not a callback registry, and only normalizes Catalog fault variants into the existing Debug service. Wire `RootErrorBoundary` in `main.tsx`/`App.tsx`, wire Stage/VN boundaries plus `RecoveryOverlay`/`LoadingScreen`/`SaveStatus`/`ToastRegion` in `PlayRoute` and `GameShell`, and update the Zustand adapter to carry only non-authoritative async UI state. Recovery actions call flavor-safe ports and never patch component state as game state.

- [ ] **Step 5: Run the exact system UI PASS command**

Run: `pnpm vitest run src/ui/errors/errors.test.tsx src/ui/shell/system-status.test.tsx src/app/game-view-store.test.ts src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit UI recovery**

```bash
git add src/ui/errors/RootErrorBoundary.tsx src/ui/errors/StageErrorBoundary.tsx src/ui/errors/VnErrorBoundary.tsx src/ui/errors/RecoveryOverlay.tsx src/ui/errors/errors.test.tsx src/ui/shell/LoadingScreen.tsx src/ui/shell/SaveStatus.tsx src/ui/shell/ToastRegion.tsx src/ui/shell/system-status.test.tsx src/app/App.tsx src/app/main.tsx src/app/create-application.ts src/app/game-view-store.ts src/app/game-view-store.test.ts src/runtime/diagnostics/debug-service.ts src/runtime/diagnostics/debug-service.test.ts src/ui/shell/GameShell.tsx src/ui/shell/GameShell.test.tsx src/ui/shell/PlayRoute.tsx src/ui/shell/PlayRoute.test.tsx
git commit -m "feat: add accessible game recovery surfaces"
```

### Task 9: Build stable RTL/Playwright accessibility, persistence-fault coverage, and the Phase 4 gate

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/player-week.spec.ts`
- Create: `e2e/opening-event.spec.ts`
- Create: `e2e/save-debug.spec.ts`
- Create: `e2e/import-recovery.spec.ts`
- Create: `e2e/multi-tab-conflict.spec.ts`
- Create: `e2e/developer.spec.ts`
- Create: `e2e/accessibility.spec.ts`
- Create: `e2e/responsive.spec.ts`
- Create: `e2e/visual.spec.ts`
- Create: `e2e/fixtures.ts`
- Create: `e2e/__screenshots__/stage.png`
- Create: `e2e/__screenshots__/vn-choice.png`
- Create: `e2e/__screenshots__/workspace-overlay.png`
- Create: `e2e/__screenshots__/tablet-drawer.png`
- Create: `e2e/__screenshots__/ultrawide-fill.png`
- Create: `scripts/verify-ui.mts`
- Modify: `package.json`

**Interfaces:**

- Consumes: active E2E Story `StoryDevelopmentSupportV1` fixtures and complete UI.
- Produces: stable Chromium/WebKit flows, limited screenshots, automated accessibility/responsive/persistence verification, `pnpm verify:ui`.

- [ ] **Step 1: Configure deterministic web servers/projects**

Playwright `webServer` builds/serves E2E Developer and tavern-poc Player with fixed ports/base; projects cover Chromium and WebKit. Disable nonessential animation and use fixed locale/timezone. No test depends on production prose; query stable roles, labels, and fixture IDs.

- [ ] **Step 2: Write failing complete-flow E2E tests**

Cover the new game's initial sequence-0 ViewModel, the distinct Runtime-projected `RunStartControl` dispatching exact `run.start`, manifest opening-card drain, automatic non-dismissible LifePolicy Overlay with exact option command, committed policy, D1 visibility focus/purchase/Inventory/prepare-limit/plan/ActionConfirmation/exact opening-cost preview, Runtime-projected Start/Continue/Finalize controls, and authoritative ledger; an explicit relation `story.action.start` and a separate no-relation path; an opening event Scene saved after `blockingEvent` clears and continued after reload; a resource-short plan that cannot Start but accepts emergency closure and reaches next morning; typed Narrative/workflow rejection announcements; the complete obligation forecast lifecycle including infeasible-plan current-gap and active-baseline no-double-cost; deterministic attribute gate; the full `WorldActionOverlay` option/begin-scene/phase-transition/completion-scene/complete flow with no third Narrative; Quick/Manual/Auto/reload; dump exact replay; DevDock toggles; D7 ordinary-action hiding, levy-due phase block, persisted summary/restart.

- [ ] **Step 3: Write explicit persistence fault E2E tests**

`e2e/import-recovery.spec.ts` injects schema-invalid, over-limit, and wrong-provenance JSON through the real import UI and asserts rejection, announced reason, and unchanged Snapshot. It then writes a valid Auto previous record plus a deliberately corrupt Auto current record, reloads, and asserts current is quarantined, previous is offered/loaded as recovery with the correct label, and no corrupt bytes become the active Snapshot.

`e2e/save-debug.spec.ts` starts with a known non-default seed, completes the D5 check, saves/reloads through the real UI, and asserts the displayed dice/band/modifiers plus Developer seed are unchanged and no check dispatch occurs during reload. It then loads/saves a terminal state, reloads, and asserts the three completion columns and `completedAtSequence` projection are unchanged without invoking Endings. The Player variant proves Debug export remains available while Debug import/replay controls and symbols are absent.

`e2e/multi-tab-conflict.spec.ts` opens two browser pages on the same origin/slot/revision N. First prove Page B is default read-only while A owns the lease and a direct B write returns the lease/read-only surface rather than pretending to be a revision conflict. Then B retains its cached expected revision N, A commits N+1 and cooperatively releases the lease, and B acquires a fresh fencing token without refreshing the slot. B's ensuing write must pass lease ownership but fail the real expected-recordRevision CAS, preserve A's N+1 bytes, and enter the specified refresh/read-only path. Only after B reloads winning revision N+1 may it write successfully. A separate forced-takeover vector proves the old A token becomes stale and can no longer write even if it missed BroadcastChannel messages.

- [ ] **Step 4: Write viewport/input/accessibility tests**

Run 1024×768, 1280×800, 1600×1000, 2560×1080, 200% zoom, reduced motion, touch emulation, and keyboard-only traversal. Axe scans stable Player/E2E screens. Assert focus enter/return and no key action loss.

- [ ] **Step 5: Add only stable screenshot baselines**

Baseline one stage, one VN choice, one Workspace Overlay, 1024 tablet drawer, and ultrawide fill using E2E fixtures. Freeze `snapshotPathTemplate` to the five exact repository paths above and run visual comparisons only in the Chromium project; Chromium and WebKit still run every behavioral, responsive, persistence, and accessibility spec. Do not screenshot dynamic prose/balance or replace behavior assertions.

- [ ] **Step 6: Add exact E2E and gate package scripts**

Add these exact package scripts:

```json
"test:e2e:persistence": "playwright test e2e/import-recovery.spec.ts e2e/multi-tab-conflict.spec.ts --project=chromium",
"test:e2e:behavior": "playwright test e2e/player-week.spec.ts e2e/opening-event.spec.ts e2e/save-debug.spec.ts e2e/import-recovery.spec.ts e2e/multi-tab-conflict.spec.ts e2e/developer.spec.ts e2e/accessibility.spec.ts e2e/responsive.spec.ts --project=chromium --project=webkit",
"test:e2e:visual": "playwright test e2e/visual.spec.ts --project=chromium",
"test:e2e": "pnpm test:e2e:behavior && pnpm test:e2e:visual",
"test:e2e:update-snapshots": "playwright test e2e/visual.spec.ts --project=chromium --update-snapshots",
"verify:ui": "tsx scripts/verify-ui.mts"
```

Run: `pnpm test:e2e:persistence`

Expected: FAIL until the fixtures and UI wiring are complete.

- [ ] **Step 7: Run behavior tests, then explicitly approve screenshots**

Run: `pnpm test:e2e`

Expected: first run fails only on missing approved screenshot baselines or real defects. Generate candidates with `pnpm test:e2e:update-snapshots`, inspect every diff, and commit explicitly; CI never updates them.

- [ ] **Step 8: Implement the mandatory Phase 4 verifier**

`scripts/verify-ui.mts` runs, in order: `pnpm verify:runtime`; `pnpm test:ui:assets-core`; `pnpm test:assets:governance`; `pnpm assets:validate`; the exact router/Zustand-adapter/PlayRoute/primitives/shell, Stage/RunStart/HUD/GameSymbol, ActionConfirmation/WorldAction/management overlay, and wired error RTL files named in Tasks 2–4 and 8; `pnpm test:ui:vn`; `pnpm test:ui:debug`; tavern-poc Player build; tavern-poc Developer smoke; E2E Developer build; `pnpm verify:ui:flavors`; and `pnpm test:e2e`. Candidate or terms-pending exclusions are informational success. It never conditionally skips a missing leaf and never requires Phase B source files or admitted runtime art.

- [ ] **Step 9: Run Phase 4 gate twice**

Run: `pnpm verify:ui && pnpm verify:ui`

Expected: exit 0 twice; tracked tree unchanged. The fallback-only configuration is a valid required result.

- [ ] **Step 10: Commit E2E/UI gate**

```bash
git add playwright.config.ts e2e/player-week.spec.ts e2e/opening-event.spec.ts e2e/save-debug.spec.ts e2e/import-recovery.spec.ts e2e/multi-tab-conflict.spec.ts e2e/developer.spec.ts e2e/accessibility.spec.ts e2e/responsive.spec.ts e2e/visual.spec.ts e2e/fixtures.ts e2e/__screenshots__/stage.png e2e/__screenshots__/vn-choice.png e2e/__screenshots__/workspace-overlay.png e2e/__screenshots__/tablet-drawer.png e2e/__screenshots__/ultrawide-fill.png scripts/verify-ui.mts package.json
git commit -m "test: verify the complete browser game flow"
```

## Phase 4 Completion Check

- [ ] `AssetRegistry`, preload, and complete code-native fallbacks pass before Stage tests; zero generated runtime images is supported.
- [ ] Player/Developer routes and compile-time exclusion pass, including tavern-poc Developer build smoke.
- [ ] Preview uses only the active Story's `StoryDevelopmentSupportV1`; tavern-poc and E2E fixtures cannot cross-resolve.
- [ ] The real PlayRoute mounts central stage layers, top HUD, Inventory/WorldAction/ActionConfirmation management overlays, VN, save/recovery, and summary through the one-way Zustand adapter.
- [ ] Story actions, exact confirmations/rejections/forecasts, and Scheduler/WorldAction UI paths are covered without UI-authored formulas or payload guessing.
- [ ] Reload UI preserves initial seed, resolved checks, and terminal completion without rerunning rules.
- [ ] DevDock is optional and never carries Player-required information.
- [ ] Invalid import, corrupt Auto current → previous recovery, and multi-tab revision conflict pass through real UI/persistence paths.
- [ ] 1024×768 through 16:10, ultrawide, 200% zoom, touch, keyboard, and reduced motion pass.
- [ ] Candidate/terms-pending art is excluded without failing the mandatory gate; runtime art, if any, is both explicitly user-selected and terms-approved.
- [ ] Phase B remains optional and was not generated as part of this planning change.
- [ ] Chromium/WebKit behavior and axe checks pass; the five Chromium-only stable screenshot baselines pass.
- [ ] `pnpm verify:ui` exits 0 twice with a clean tree.
