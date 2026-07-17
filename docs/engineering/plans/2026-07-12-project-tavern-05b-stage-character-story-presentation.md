# Project Tavern Phase 5B Stage, Character, and Story Presentation Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Build the StageScene/Character/Interaction presentation runtime, Story-scoped content preference, neutral E2E interaction fixture, and the complete PoC/E2E Web roots so the existing Semantic actions can be played through an accessible tavern-first interface without adding Gameplay.

**Architecture:** Phase 5A supplies the neutral AssetRegistry, atomic Semantic publication bridge, seven-layer Shell, InputRouter, Pointer Adapter, Overlay/VN/System hosts, renderer contribution registry, and orthogonal world-semantic `GameSymbol` registry. Phase 5B adds one generic `RuntimePresentationStoreV1` as the only join of an atomic `SemanticPublicationV1`, the resolved data-only presentation catalog, a Story-scoped `ContentPreferencePortV1`, and application-owned UI session state; Story Web projectors turn that immutable input into renderer-neutral runtime views, and renderers can feed back only typed Presentation intents or the exact Semantic descriptor/invocation already published by the Story. `GameSimulation → GameQueries → SemanticPublication → RuntimePresentationPublication → Renderer` remains the one authoritative read direction, while input returns through `InteractionActivationV1` and either local UI state or the existing GameSession FIFO.

**Tech Stack:** Phase 2–5A SillyMaker runtime packages and Project Tavern Story packages, React 19.2.7, React DOM 19.2.7, Vite 8.1.4, TypeScript 7.0.2, Phase 5A Radix/Dialog and Lucide system surfaces, CSS Modules, Vitest 4.1.10, React Testing Library 16.3.2, user-event 14.6.1, and Playwright 1.61.1. Phase 5B adds no state/animation library; its small external stores and reduced-motion CSS use the Phase 5A primitives.

## Global Constraints

- Cumulative `pnpm verify:phase5a` (and therefore Phase 2–4B/`verify:phase4`) plus every Phase 4B Story acceptance command must pass from the live phase base SHA before this plan starts; do not rerun an already nested phase merely to satisfy the prerequisite twice.
- The roadmap `R1` materialization checkpoint remains a hard prerequisite. Every task starts with read-only `pnpm verify:materialization`; missing/stale `scripts/preflight/materialization-lock.json` or `.project-tavern/goal-materialization.json` evidence fails before task changes with `external_precondition.materialization_stale`. R1 has already pinned every external package and browser revision needed by this plan, so Phase 5B never chooses a version, runs `pnpm add`, contacts a registry, or downloads a browser; it may only run `pnpm install --offline --frozen-lockfile` after the check.
- The authority order for this plan is `docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md`, `docs/engineering/specs/2026-07-12-game-runtime-design.md`, and `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`. The implementation must use StageScene variants, layered character presentation, exact-ID asset demand and the single atomic semantic-to-runtime-presentation bridge; a single static background, single character image, group preload or second application-level GameView bridge is invalid.
- Phase 5B consumes the Phase 2 neutral StageScene/Character/HitMap/Interaction/content-maturity contracts and the Phase 4B frozen PoC catalog. It does not add or rename a GameplayModule, State Slot, Game Command, GameplayFact, Rule, Resolver, ActionId, Narrative SceneId, relationship counter, daily touch reward, outfit state, or golden/Save command sequence.
- `GameSimulation` never imports SceneGraph, renderer, Input, `ContentPreferenceV1`, DOM, React, or application UI state. `PocGameViewV1` never imports StageScene/variant/asset/renderer IDs. Pure presentation catalog or asset changes may change presentation/application identity but must leave state-contract and simulation digests byte-for-byte unchanged.
- `RuntimePresentationStoreV1` is the sole allowed presentation join. Its Story projector receives exactly the current immutable `SemanticPublicationV1`, resolved presentation catalog, effective `ContentPreferenceV1`, and immutable UI session state; it never receives GameQueries, GameSnapshot, RunIntegrity, RNG, command sequence, an owner port, or an arbitrary state reader.
- Runtime presentation views retain `TextId` fields from the validated Story catalog. Projectors do not resolve locale strings or receive `PresentationReadPortV1`; the final renderer resolves each ID through the `presentation` member of its Phase 5A context. Tests may assert rendered Chinese text, but no projector or policy embeds it.
- Every Gameplay behavior retains the exact action descriptor object from the current `SemanticPublicationV1.actions`, including `enabled`, authored disabled reasons, controlled options, preview, and invocation shape. No Interaction or renderer code recomputes availability or constructs a raw Story command.
- Presentation-only intents are a closed union and never enter Gameplay CommandLog. Gameplay dispatch goes through the existing Story-specialized `SemanticGamePortV1`; the executor's original Story command is the only command logged. Coordinates, PointerEvent, DOM nodes, renderer IDs, surface/target/behavior IDs, and content preference are never appended to that command.
- `ContentPreferencePortV1` is an ordinary Story-scoped Host/player preference over the Host atomic record store. It is not one of the closed `debug_tools | cheats | automation_bridge` capabilities and does not enter Snapshot, Save, Replay, GameView, Semantic revision, state-contract identity, simulation identity, or Artifact identity.
- The PoC registers no restricted content flags or presets: `flags=[]`, `presets=[]`, and its effective/default `allowedFlags` are `0`; no `suggestive`, `sexual`, or `explicit` runtime text, behavior, media, asset slot, preload, test expectation, or hidden branch is added. The E2E Story uses two independently switchable neutral one-hot flags plus Story presets to verify `0 / A / B / A|B`, not an ordered scale.
- A content-flag descriptor is exactly `{ id, flag, nameTextId, descriptionTextId }`; a preset is `{ presetId, allowedFlags, nameTextId, descriptionTextId }`; a requirement stores only `requiredFlags`, and a preference stores only `allowedFlags`. `standard` is the zero mask rather than a flag. Story catalogs own the `TextId` values and player-facing labels resolve only through `PresentationReadPortV1.text()`. No policy, requirement, preference, Host record, or renderer embeds a flag/preset name or description string.
- The PoC stable presentation IDs are exactly:

  ```text
  stage_scene.poc.main_menu
  stage_scene.poc.tavern
  stage_scene.poc.market
  stage_scene.poc.world_map
  stage_scene.poc.week_summary

  stage_variant.poc.main_menu.default
  stage_variant.poc.tavern.day
  stage_variant.poc.tavern.evening
  stage_variant.poc.market.day
  stage_variant.poc.world_map.default
  stage_variant.poc.week_summary.default

  surface.poc.heroine
  surface.poc.tavern
  surface.poc.market
  surface.poc.world_map

  target.poc.heroine.figure
  target.poc.tavern.service
  target.poc.market.purchase
  target.poc.world_map.old_trade_road

  behavior.poc.heroine.open_profile
  behavior.poc.heroine.repair_sign
  behavior.poc.heroine.apologize
  behavior.poc.tavern.service_plan
  behavior.poc.market.purchase
  behavior.poc.world_map.old_trade_road

  symbol.poc.actor.stamina
  symbol.poc.actor.mood
  symbol.poc.economy.cash
  symbol.poc.tavern.reputation
  symbol.poc.obligation.levy
  symbol.poc.inventory.ingredient
  symbol.poc.relationship.affection
  symbol.poc.relationship.teamwork
  symbol.poc.action.purchase
  symbol.poc.action.service
  symbol.poc.overlay.ledger
  symbol.poc.overlay.facility
  symbol.poc.facility.cold_storage
  symbol.poc.facility.comfortable_bed
  ```

- `behavior.poc.heroine.repair_sign` and `behavior.poc.heroine.apologize` reuse the existing descriptors for `action.repair_sign_with_heroine` and `action.apologize_to_heroine`. `behavior.poc.tavern.service_plan`, `behavior.poc.market.purchase`, and `behavior.poc.world_map.old_trade_road` retain the parameterized descriptors for `action.service_plan`, `action.purchase`, and `action.old_trade_road` while opening their controlled Story overlays; they do not synthesize an empty plan/purchase or select a WorldAction option automatically.
- The PoC does not predeclare body-part targets. `target.poc.heroine.figure` is the only heroine spatial target in this revision; body areas and touch-specific Gameplay require a later Story revision and are not inferred from the renderer.
- The default interaction path is figure activation → enter `surface.poc.heroine` → activate the figure target → direct one behavior or choose among the currently projected behaviors. `behavior.poc.heroine.open_profile` is Presentation-only; relationship effects remain limited to the two already-frozen Story actions.
- HitMap coordinates are normalized renderer-local coordinates. Startup validation rejects duplicate IDs, invalid shapes, missing references, every possible `open_surface` cycle, and incompatible rig/pose references with stable codes. Runtime validation disables only the bad spatial surface, records a bounded fault, and preserves an accessible DOM fallback with the original disabled reason.
- Spatial pointer input, native keyboard activation, and accessible DOM controls converge on the same `InteractionActivationV1` or Semantic invocation. A physical mouse/touch/pen operation activates once; native buttons are left to browser click/keyboard behavior. Interaction uses the Phase 5A priority `System > Overlay > Narrative > Interaction > Gameplay` and clears on pointer cancel, focus loss, or StageScene replacement.
- Static, hybrid paper-doll, and fake Live2D adapters use the same Character/rig/pose/target IDs. A changed appearance does not change the default HitMap; a changed pose may explicitly select another registered HitMap. Each projected appearance layer declares neutral `omit | character_fallback` failure policy, and the generic renderer never guesses Story layer names. No Live2D SDK, adapter player, or model file is added.
- Background, character, and animation failures follow their separately registered fallback chains. A spatial HitMap remains active only when the selected character fallback declares compatible local coordinates; otherwise the visible DOM behavior list remains and the transparent spatial hotspot is removed.
- `RuntimePresentationPublicationV1.requiredAssetIds` is the exact allowed-and-needed `AssetId` list in first-use order. Phase 5A `AssetRegistryV1.preload(assetIds, signal)` receives that list directly; no scene/group preload or preload-then-hide behavior is reintroduced.
- World-semantic icons are independent of the seven Stage renderer namespaces. Phase 5B registers the exact Story-owned `symbol.poc.*` IDs above through the Phase 5A `GameSymbolProviderV1`/`GameSymbolRegistryV1` surface; `@sillymaker/ui` owns no PoC ID, Lucide remains system-only, and symbol providers cannot become asset, Gameplay, or presentation-routing authorities.
- Normal presentation components receive only `GameRendererContextV1<{ viewSlice, semantic, presentation }>` plus the narrow Interaction controller they require. They never receive the full `GameApplicationPortV1`, GameSession, persistence, diagnostics, capabilities, DebugTools, Snapshot, Rule, Resolver, or raw Story content graph.
- Story default/Headless imports remain Node type-strip-safe `.ts`. Web projectors, renderer registries, UI contributions, and application roots are `.tsx`/application-closure-only and are unreachable from the default Story entry, SceneGraph, GameSimulation, headless runner, and golden generators.
- There remain exactly two application IDs and roots: `poc-web` and `e2e-web`. Generic `engine/packages/web` imports neither Story. Story tooling, DevDock, Cheat UI, Automation Bridge, Debug UI context, full cross-browser/zoom/reduced-motion matrix, and visual regression remain Phase 5C work.
- Phase 5B itself completes the Interaction-specific mouse, touch, keyboard, focus, semantic DOM, 44×44 target, no-through, and accessible fallback acceptance in Chromium desktop and touch projects. Phase 5C extends rather than replaces this evidence.
- Player-facing text is Chinese and identifiers are English. Runtime controls, text, focus rings, HUD numbers, map labels, and icons are DOM/code-native; `art-source/aigc/**` and `references/**` are never imported, scanned, copied, preloaded, or bundled.
- Material generation/selection, subjective art approval, VoiceOver/device review, human playtesting, CI, and remote distribution are outside this plan. Phase 5B consumes only already-approved runtime assets and otherwise proves the complete flow with registered code-native/static fallbacks.
- Every task uses TDD, passes its focused suite and full `pnpm verify`, reviews `git diff --check`, and ends with a narrow commit. Before Task 12, root `pnpm verify` already reaches cumulative `verify:phase5a` (and therefore inspect-only `verify:ui`) exactly once; tasks do not invoke either dependency a second time. The final gate task replaces that temporary Phase 5A root child with cumulative Phase 5B exactly once.
- At every task boundary record phase-base SHA, current HEAD, last completed task commit, and `git status --short`. Reverify and skip an already matching task commit; resume a dirty task only when all changed/untracked paths are inside that task's `Files` allowlist. An expected-red counts only when the named focused assertion fails for the documented missing symbol/stable diagnostic, never for external materialization, browser, port, or unrelated build failure. Stage only explicit allowlist paths, inspect `git diff --cached --name-only`/`--check`, and preserve/report all remaining user changes.

---

## File Map

```text
engine/packages/ui/src/
  runtime/
    runtime-presentation-store.ts       # sole atomic presentation join and publication
    runtime-presentation-store.test.ts
    use-runtime-presentation.ts
  stage/
    contracts.ts                        # renderer-neutral runtime Stage view
    stage-scene-host.tsx                # contribution resolution and background fallback
    stage-scene-host.module.css
    stage-scene-host.test.tsx
    index.ts
  characters/
    contracts.ts                        # runtime character and renderer-adapter contracts
    character-renderer-registry.ts
    character-renderer-registry.test.ts
    character-host.tsx
    character-host.test.tsx
    static-character-renderer.tsx
    paper-doll-character-renderer.tsx
    character-renderers.test.tsx
    index.ts
  interaction/
    contracts.ts                        # activation, modes, behaviors, faults, intents
    hit-test.ts                         # rect/circle/polygon and viewport→local conversion
    hit-test.test.ts
    runtime-interaction-validation.ts
    runtime-interaction-validation.test.ts
    interaction-session-store.ts
    interaction-session-store.test.ts
    presentation-intent-router.ts
    presentation-intent-router.test.ts
    interaction-controller.ts
    interaction-controller.test.ts
    InteractionSurface.tsx
    InteractionSurface.module.css
    InteractionSurface.test.tsx
    InteractionBehaviorList.tsx
    InteractionBehaviorList.test.tsx
    index.ts

engine/packages/ui/type-tests/
  runtime-presentation-public.test-d.ts
  stage-presentation-public.test-d.ts

engine/packages/base/src/contracts/
  presentation.test.ts                 # consume Phase 2 startup validator codes

engine/packages/web/src/
  preferences/
    content-preference-store.ts         # Story-scoped Host record adapter
    content-preference-store.test.ts
    index.ts
  routing/
    hash-router.ts
    hash-router.test.ts
    index.ts

engine/packages/web/type-tests/
  application-exports.test-d.ts

game/stories/e2e/src/
  presentation/
    interaction-fixture.ts              # runtime additions over the Phase 2 catalog/HitMap
    runtime-presentation.ts             # SemanticPublication-only projector
    runtime-presentation.test.ts
    ui-contributions.tsx
    ui-contributions.test.tsx
  application/
    create-e2e-presentation-runtime.ts
    create-e2e-presentation-runtime.test.ts
    e2e-application-root.tsx
    e2e-application-root.test.tsx
    entry.tsx

game/stories/e2e/
  index.html
  package.json
  tsconfig.application.json

game/stories/poc/src/
  presentation/
    runtime/contracts.ts
    runtime/project-poc-runtime-presentation.ts
    runtime/project-poc-runtime-presentation.test.ts
    runtime/interaction-behaviors.ts
    runtime/interaction-behaviors.test.ts
    hud/PocHud.tsx
    hud/PocHud.module.css
    hud/PocHud.test.tsx
    scenes/PocMainMenuScene.tsx
    scenes/PocTavernScene.tsx
    scenes/PocMarketScene.tsx
    scenes/PocWorldMapScene.tsx
    scenes/PocWeekSummaryScene.tsx
    scenes/PocScenes.module.css
    scenes/scenes.test.tsx
    overlays/PolicyOverlay.tsx
    overlays/InventoryOverlay.tsx
    overlays/PurchaseOverlay.tsx
    overlays/TavernPlanOverlay.tsx
    overlays/FacilityOverlay.tsx
    overlays/WorldActionOverlay.tsx
    overlays/LedgerOverlay.tsx
    overlays/RelationshipOverlay.tsx
    overlays/RunSummaryOverlay.tsx
    overlays/overlays.test.tsx
    symbols/poc-game-symbols.tsx
    symbols/poc-game-symbols.module.css
    symbols/poc-game-symbols.test.tsx
    ui-contributions.tsx
    ui-contributions.test.tsx
  application/
    create-poc-presentation-runtime.ts
    create-poc-presentation-runtime.test.ts
    poc-application-root.tsx
    poc-application-root.test.tsx
    entry.tsx

game/stories/poc/
  index.html
  package.json
  tsconfig.application.json

engine/packages/web/
  e2e/interaction/
    e2e-interaction.spec.ts
    poc-stage.spec.ts
    interaction-accessibility.spec.ts
    interaction-input.spec.ts
  playwright.interaction.config.ts

scripts/ui/
  serve-story-roots.mts
  serve-story-roots.test.ts
  verify-stage-presentation.mts
  verify-stage-presentation.test.ts

vite.config.ts                          # exactly e2e-web and poc-web roots
package.json                            # build/browser/Phase 5B scripts
scripts/preflight/materialization-lock.json # R1 exact external closure; read-only here
scripts/verify.mjs                      # replace Phase 5A child with Phase 5B
scripts/verify.test.mjs
```

### Task 1: Persist Story-Scoped Content Preference as an Ordinary Web Host Port

**Files:**

- Create: `engine/packages/web/src/preferences/content-preference-store.ts`
- Create: `engine/packages/web/src/preferences/content-preference-store.test.ts`
- Create: `engine/packages/web/src/preferences/index.ts`
- Modify: `engine/packages/web/src/index.ts`
- Modify: `engine/packages/web/type-tests/application-exports.test-d.ts`
- Test: `engine/packages/web/src/preferences/content-preference-store.test.ts`

**Interfaces:**

- Consumes: Base `ContentMaturityPolicyV1`, `ContentPreferenceV1`, `ContentPreferencePortV1`, strict uint32 flag/policy parsers and mask helpers, `HostAtomicRecordStoreV1`, Story identity, and Web Host logger.
- Produces: `createWebContentPreferencePortV1`, one Story-scoped `settings/content-maturity.v1:<StoryId>` record, deterministic invalid-record fallback, CAS serialization, and the public `@sillymaker/web` preference export.

- [ ] **Step 1: Write the failing default, persistence, invalid-record, and isolation tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  combineContentMaturityFlagsV1,
  createMemoryHostRecordStoreV1,
  emptyContentMaturityFlagsV1,
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagsV1,
  parseStoryId,
} from "@sillymaker/base";
import { createWebContentPreferencePortV1 } from "./content-preference-store.js";

const e2eAlphaFlagV1 = neutralTwoFlagPolicyV1.flags[0]!.flag;
const e2eBetaFlagV1 = neutralTwoFlagPolicyV1.flags[1]!.flag;
const e2eBothFlagsV1 = combineContentMaturityFlagsV1(e2eAlphaFlagV1, e2eBetaFlagV1);
const e2eStoryIdV1 = parseStoryId("story.e2e");

describe("Web ContentPreferencePort", () => {
  it("uses the Story default without writing an absent record", async () => {
    const records = createMemoryHostRecordStoreV1();
    const port = await createWebContentPreferencePortV1({
      records,
      storyId: e2eStoryIdV1,
      policy: neutralTwoFlagPolicyV1,
      reportWarning: vi.fn(),
    });
    expect(port.observe()).toEqual({ allowedFlags: 0 });
    expect(await records.list("settings")).toEqual([]);
  });

  it("persists and republishes an independent beta-only mask", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = await createE2ePreferencePortV1(records);
    const listener = vi.fn();
    first.subscribe(listener);
    await expect(first.set({ allowedFlags: e2eBetaFlagV1 })).resolves.toEqual({
      kind: "updated",
      preference: { allowedFlags: e2eBetaFlagV1 },
    });
    expect(first.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
    expect(listener).toHaveBeenCalledOnce();

    const second = await createE2ePreferencePortV1(records);
    expect(second.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
  });

  it("falls back after a policy revision change and reports one bounded warning", async () => {
    const records = createPreferenceRecordFixtureV1({
      key: "content-maturity.v1:story.e2e",
      value: {
        contractRevision: 1,
        storyId: e2eStoryIdV1,
        policyRevision: 1,
        allowedFlags: e2eBetaFlagV1,
      },
    });
    const reportWarning = vi.fn();
    const port = await createWebContentPreferencePortV1({
      records,
      storyId: e2eStoryIdV1,
      policy: neutralTwoFlagPolicyRevision2V1,
      reportWarning,
    });
    expect(port.observe()).toEqual({ allowedFlags: 0 });
    expect(reportWarning).toHaveBeenCalledWith({
      code: "content_preference.policy_mismatch",
      storyId: e2eStoryIdV1,
      storedPolicyRevision: 1,
      activePolicyRevision: 2,
      storedAllowedFlags: e2eBetaFlagV1,
    });
  });

  it("rejects undeclared flags without opening Host storage", async () => {
    const fixture = await createNoFlagPreferenceFixtureV1();
    const undeclared = parseContentMaturityFlagsV1(0x80000000);
    await expect(fixture.port.set({ allowedFlags: undeclared })).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.unknown_flags",
    });
    expect(fixture.commits()).toBe(0);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
  });

  it.each([
    { allowedFlags: -1 },
    { allowedFlags: 1.5 },
    { allowedFlags: Number.NaN },
    { allowedFlags: 0x1_0000_0000 },
    { allowedFlags: 0, extra: true },
  ] as const)("rejects malformed runtime preference input before storage", async (input) => {
    const fixture = await createE2ePreferenceFixtureV1();
    await expect(fixture.port.set(input as never)).resolves.toEqual({
      kind: "rejected",
      code: "content_maturity.invalid_preference",
    });
    expect(fixture.commits()).toBe(0);
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
  });

  it.each(invalidStoredPreferenceCasesV1)(
    "recovers $name to the Story default with one bounded warning",
    async ({ record, policy, warning }) => {
      const reportWarning = vi.fn();
      const port = await createWebContentPreferencePortV1({
        records: createPreferenceRecordFixtureV1(record),
        storyId: e2eStoryIdV1,
        policy,
        reportWarning,
      });
      expect(port.observe()).toEqual({ allowedFlags: policy.defaultAllowedFlags });
      expect(reportWarning).toHaveBeenCalledTimes(1);
      expect(reportWarning).toHaveBeenCalledWith(expect.objectContaining(warning));
    },
  );

  it("round-trips bit 31 and a mixed mask as positive canonical uint32", async () => {
    const records = createMemoryHostRecordStoreV1();
    const high = parseContentMaturityFlagBitV1(0x80000000);
    const mixed = combineContentMaturityFlagsV1(high, parseContentMaturityFlagBitV1(1));
    const first = await createHighestBitPreferencePortV1(records);
    await expect(first.set({ allowedFlags: mixed })).resolves.toMatchObject({
      kind: "updated",
      preference: { allowedFlags: 2147483649 },
    });
    expect(await decodeStoredPreferenceRecordV1(records, e2eStoryIdV1)).toMatchObject({
      allowedFlags: 2147483649,
    });
    const second = await createHighestBitPreferencePortV1(records);
    expect(second.observe()).toEqual({ allowedFlags: 2147483649 });
  });

  it("keeps the old snapshot after a repeated CAS/storage failure", async () => {
    const fixture = await createFailingPreferenceStorageFixtureV1({
      allowedFlags: emptyContentMaturityFlagsV1,
    });
    await expect(fixture.port.set({ allowedFlags: e2eBothFlagsV1 })).resolves.toEqual({
      kind: "failed",
      code: "content_preference.storage_failed",
    });
    expect(fixture.port.observe()).toEqual({ allowedFlags: 0 });
    expect(fixture.listener).not.toHaveBeenCalled();
  });

  it("isolates records by Story and never exposes a runtime capability", async () => {
    const records = createMemoryHostRecordStoreV1();
    const e2e = await createE2ePreferencePortV1(records);
    const poc = await createPocPreferencePortV1(records);
    await e2e.set({ allowedFlags: e2eBetaFlagV1 });
    expect(poc.observe()).toEqual({ allowedFlags: 0 });
    expect(poc).not.toHaveProperty("setEnabled");
    expect(poc).not.toHaveProperty("capabilities");
  });

  it("keeps a committed preference when a subscriber and warning reporter throw", async () => {
    const fixture = await createThrowingPreferenceSubscriberFixtureV1();
    fixture.port.subscribe(() => {
      throw new Error("subscriber");
    });
    fixture.port.subscribe(fixture.secondListener);
    await expect(fixture.port.set({ allowedFlags: e2eAlphaFlagV1 })).resolves.toMatchObject({
      kind: "updated",
    });
    expect(fixture.port.observe()).toEqual({ allowedFlags: e2eAlphaFlagV1 });
    expect(fixture.secondListener).toHaveBeenCalledOnce();
  });
});
```

All helpers referenced above are test-local declarations in `content-preference-store.test.ts`, authored before the first run so the named expected-red remains only the missing production adapter:

- `e2eStoryIdV1=parseStoryId("story.e2e")`; every production-factory/helper input uses that branded value, while raw hostile-record fixtures may deliberately encode an arbitrary string;
- `neutralTwoFlagPolicyV1` declares alpha=`1`, beta=`2`, revision `1`, default `emptyContentMaturityFlagsV1`; `neutralTwoFlagPolicyRevision2V1` changes only the revision; `emptyFlagPolicyV1` declares no flags; `highestBitPolicyV1` declares bits `1` and `0x80000000`;
- `createE2ePreferencePortV1`/`createPocPreferencePortV1`/`createHighestBitPreferencePortV1` call the pending production factory with those exact policies; `createE2ePreferenceFixtureV1` additionally counts Host commits;
- `createPreferenceRecordFixtureV1` accepts either exact raw bytes or a value to encode, and `decodeStoredPreferenceRecordV1` strict-decodes the one private Web record for assertions;
- `createNoFlagPreferenceFixtureV1` counts pre-transaction rejection; `createFailingPreferenceStorageFixtureV1` forces two CAS/storage failures; `createThrowingPreferenceSubscriberFixtureV1` exposes a second listener;
- `invalidStoredPreferenceCasesV1` covers non-canonical bytes, extra fields, wrong `contractRevision`, wrong `storyId`, non-uint32 mask and stored `0x80000000` against `emptyFlagPolicyV1`, with exact warning objects for `content_preference.record_invalid | content_preference.story_mismatch | content_preference.unknown_flags`; the bit-31 case additionally requires `storedAllowedFlags=unknownFlags=2147483648`。The separate test above owns `content_preference.policy_mismatch`.

- [ ] **Step 2: Run the focused Web test and confirm the adapter is absent**

Run: `pnpm --filter @sillymaker/web exec vitest run src/preferences/content-preference-store.test.ts`

Expected: FAIL with an unresolved `content-preference-store.js` import.

- [ ] **Step 3: Implement strict Story-scoped decode, observe/subscribe/set, and CAS retry**

```ts
const contentPreferenceRecordRevisionV1 = 1 as const;

function contentPreferenceRecordKeyV1(storyId: StoryId): HostRecordKeyV1 {
  // StoryId is already validated; keep the only HostRecordKey brand assertion at this adapter edge.
  return `content-maturity.v1:${storyId}` as HostRecordKeyV1;
}

interface ContentPreferenceRecordV1 {
  readonly contractRevision: 1;
  readonly storyId: StoryId;
  readonly policyRevision: PositiveSafeInteger;
  readonly allowedFlags: ContentMaturityFlagsV1;
}

function parseContentPreferenceForPolicyResultV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  value: unknown,
):
  | { readonly kind: "parsed"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | { readonly kind: "invalid_preference" }
  | { readonly kind: "unknown_flags"; readonly unknownFlags: ContentMaturityFlagsV1 } {
  let preference: ContentPreferenceV1;
  try {
    preference = parseContentPreferenceV1(value);
  } catch {
    return Object.freeze({ kind: "invalid_preference" as const });
  }
  const unknownFlags = findUnknownContentMaturityFlagsV1(policy, preference.allowedFlags);
  return unknownFlags === 0
    ? Object.freeze({ kind: "parsed" as const, preference: Object.freeze({ ...preference }) })
    : Object.freeze({ kind: "unknown_flags" as const, unknownFlags });
}

type ContentPreferenceWarningV1 =
  | {
      readonly code: "content_preference.record_invalid";
      readonly storyId: StoryId;
      readonly reason: "non_canonical" | "shape" | "contract_revision" | "mask";
    }
  | {
      readonly code: "content_preference.story_mismatch";
      readonly storyId: StoryId;
      readonly storedStoryId: string;
    }
  | {
      readonly code: "content_preference.policy_mismatch";
      readonly storyId: StoryId;
      readonly storedPolicyRevision: PositiveSafeInteger;
      readonly activePolicyRevision: PositiveSafeInteger;
      readonly storedAllowedFlags: ContentMaturityFlagsV1;
    }
  | {
      readonly code: "content_preference.unknown_flags";
      readonly storyId: StoryId;
      readonly storedAllowedFlags: ContentMaturityFlagsV1;
      readonly unknownFlags: ContentMaturityFlagsV1;
    }
  | { readonly code: "content_preference.subscriber_failed"; readonly storyId: StoryId };

interface CreateWebContentPreferencePortInputV1 {
  readonly records: HostAtomicRecordStoreV1;
  readonly storyId: StoryId;
  readonly policy: DeepReadonly<ContentMaturityPolicyV1>;
  readonly reportWarning: (warning: DeepReadonly<ContentPreferenceWarningV1>) => void;
}

export async function createWebContentPreferencePortV1(
  input: CreateWebContentPreferencePortInputV1,
): Promise<ContentPreferencePortV1> {
  const key = contentPreferenceRecordKeyV1(input.storyId);
  const reportWarning = (
    warning: Parameters<CreateWebContentPreferencePortInputV1["reportWarning"]>[0],
  ) => {
    try {
      input.reportWarning(warning);
    } catch {
      // Diagnostics are best effort and cannot change a committed preference outcome.
    }
  };
  const stored = await input.records.read("settings", key);
  const decoded = decodePreferenceOrDefaultV1(stored, input.storyId, input.policy, reportWarning);
  let current = Object.freeze({ allowedFlags: decoded.allowedFlags });
  let currentRevision = stored?.revision ?? null;
  let tail = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        reportWarning({
          code: "content_preference.subscriber_failed",
          storyId: input.storyId,
        });
      }
    }
  };

  const persist = async (next: ContentPreferenceV1): Promise<ContentPreferenceSetResultV1> => {
    const parsed = parseContentPreferenceForPolicyResultV1(input.policy, next);
    if (parsed.kind === "invalid_preference") {
      return Object.freeze({
        kind: "rejected" as const,
        code: "content_maturity.invalid_preference" as const,
      });
    }
    if (parsed.kind === "unknown_flags") {
      return Object.freeze({
        kind: "rejected" as const,
        code: "content_maturity.unknown_flags" as const,
      });
    }
    const bytes = canonicalJsonBytes({
      contractRevision: contentPreferenceRecordRevisionV1,
      storyId: input.storyId,
      policyRevision: input.policy.policyRevision,
      allowedFlags: parsed.preference.allowedFlags,
    } satisfies ContentPreferenceRecordV1);
    const commitAt = (expectedRevision: HostRecordRevisionV1 | null) =>
      input.records.commit([{ kind: "put", namespace: "settings", key, expectedRevision, bytes }]);

    try {
      let result = await commitAt(currentRevision);
      if (result.kind === "conflict") {
        const latest = await input.records.read("settings", key);
        result = await commitAt(latest?.revision ?? null);
      }
      if (result.kind !== "committed") {
        return Object.freeze({
          kind: "failed" as const,
          code: "content_preference.storage_failed" as const,
        });
      }
      currentRevision = result.records[0]?.revision ?? currentRevision;
      current = Object.freeze({ allowedFlags: parsed.preference.allowedFlags });
      notify();
      return Object.freeze({
        kind: "updated" as const,
        preference: current,
      });
    } catch {
      return Object.freeze({
        kind: "failed" as const,
        code: "content_preference.storage_failed" as const,
      });
    }
  };

  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: ContentPreferenceV1) {
      const operation = tail.then(() => persist(next));
      tail = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  });
}
```

`ContentPreferenceRecordV1` is private to this Web adapter and is not exported by Base. `decodePreferenceOrDefaultV1` accepts only canonical JSON with exactly `contractRevision`、matching `storyId`、matching positive `policyRevision` and a canonical uint32 `allowedFlags` mask containing no undeclared bit. Absent records use `policy.defaultAllowedFlags` without a write. Invalid bytes/shape, wrong Story identity, unsupported record revision, policy revision mismatch or unknown bits each use the default and emit exactly one stable bounded warning for that construction. Subscriber and diagnostic-reporter exceptions are isolated and cannot turn a successful Host commit into a failed public result. `set` first calls the strict exact-object `parseContentPreferenceV1`: malformed masks or extra fields return `rejected/content_maturity.invalid_preference`; a valid mask with undeclared bits returns `rejected/content_maturity.unknown_flags`; both happen before a Host transaction. Concurrent calls serialize through one local tail. A CAS conflict re-reads the latest revision and retries once; a second conflict or Host exception returns `failed/content_preference.storage_failed`, publishes nothing, and preserves the pre-operation preference snapshot. Legal bit 31 values and mixed masks remain positive uint32 in memory and canonical JSON.

- [ ] **Step 4: Prove the preference stays outside capability, Save, and Gameplay APIs**

Add these public type/import assertions:

```ts
declare const input: Parameters<typeof createWebContentPreferencePortV1>[0];
const records: HostAtomicRecordStoreV1 = input.records;
// @ts-expect-error Content preference is not a RuntimeCapabilityPort.
const capability: RuntimeCapabilityPortV1 = input.records;

declare const port: Awaited<ReturnType<typeof createWebContentPreferencePortV1>>;
port.observe();
port.subscribe(() => undefined);
port.set({ allowedFlags: input.policy.defaultAllowedFlags });
// @ts-expect-error closed port has no capability mutation.
port.setEnabled("debug_tools", true);
// @ts-expect-error closed port has no Snapshot.
port.snapshot;

expect(await collectProductionImportsV1("engine/packages/web/src/preferences")).not.toMatch(
  /stories\/|react|GameSnapshot|RuntimeCapabilityPort/u,
);
```

No preference symbol is added to Base Snapshot, persistence, semantic invocation, or runtime-capability modules.

Run: `pnpm --filter @sillymaker/web exec vitest run src/preferences && pnpm verify:public-exports && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; setting any E2E flag combination changes only its Host settings record, and the PoC remains at `allowedFlags=0`.

- [ ] **Step 5: Commit the ordinary Host preference port**

```bash
git add -- engine/packages/web/src/preferences engine/packages/web/src/index.ts engine/packages/web/type-tests/application-exports.test-d.ts
git diff --cached --check
git commit -m "feat(web): persist story content preference"
```

### Task 2: Build the Atomic RuntimePresentationStore

**Files:**

- Create: `engine/packages/ui/src/runtime/runtime-presentation-store.ts`
- Create: `engine/packages/ui/src/runtime/runtime-presentation-store.test.ts`
- Create: `engine/packages/ui/src/runtime/use-runtime-presentation.ts`
- Modify: `engine/packages/ui/src/runtime/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/ui/type-tests/runtime-presentation-public.test-d.ts`
- Test: `engine/packages/ui/src/runtime/runtime-presentation-store.test.ts`

**Interfaces:**

- Consumes: Phase 5A `SemanticPublicationBridgeV1`, Base `SemanticPublicationV1`, resolved immutable presentation catalog, a `ContentPreferencePortV1`, an application `ReadonlyViewSourceV1<TUiState>`, one stable Story Web projector, and a bounded presentation-failure sink.
- Produces: `RuntimePresentationProjectionInputV1`, `RuntimePresentationProjectionV1`, `RuntimePresentationPublicationV1`, bounded `PresentationRuntimeFailureV1`, `RuntimePresentationConstructionErrorV1`, `RuntimePresentationStoreV1`, `createRuntimePresentationStoreV1`, and `useRuntimePresentationV1`.

- [ ] **Step 1: Write failing atomicity, source isolation, preference, UI-state, and listener tests**

```ts
it("projects one view from the exact atomic Semantic publication", () => {
  const fixture = createRuntimePresentationStoreFixtureV1();
  const semantic1 = fixture.publishSemantic({
    game: game1,
    narrative: narrative1,
    actions: actions1,
  });
  const published = fixture.store.getSnapshot();
  expect(published.semantic).toBe(semantic1);
  expect(published.view.gameToken).toBe(game1);
  expect(published.view.narrativeToken).toBe(narrative1);
  expect(published.view.actionToken).toBe(actions1);
  expect(fixture.projectInputs.at(-1)?.semantic).toBe(semantic1);
});

it("reprojects preference and UI state without inventing a Semantic revision", async () => {
  const fixture = createRuntimePresentationStoreFixtureV1();
  const semantic = fixture.semantic.getSnapshot();
  const initialPresentationRevision = fixture.store.getSnapshot().revision;
  await fixture.preference.set({ allowedFlags: fixture.testContentFlag.flag });
  fixture.uiState.publish({ primaryOverlayId: "overlay.fixture" });
  expect(fixture.store.getSnapshot()).toMatchObject({
    revision: initialPresentationRevision + 2,
    semantic,
  });
  expect(fixture.store.getSnapshot().semantic.revision).toBe(semantic.revision);
});

it("publishes the exact allowed asset list in first-use order", () => {
  const fixture = createRuntimePresentationStoreFixtureV1();
  fixture.publishSemantic({ game: extraSceneGameView, narrative: narrative1, actions: [] });
  expect(fixture.store.getSnapshot().requiredAssetIds).toEqual([
    "asset.e2e.background.base",
    "asset.e2e.character.base",
  ]);
  expect(fixture.store.getSnapshot().requiredAssetIds).not.toContain("asset.e2e.background.alpha");
  expect(fixture.store.getSnapshot().requiredAssetIds).not.toContain("asset.e2e.background.beta");
});

it("isolates a throwing subscriber and keeps the committed publication", () => {
  const fixture = createRuntimePresentationStoreFixtureV1();
  const second = vi.fn();
  fixture.store.subscribe(() => {
    throw new Error("presentation-listener");
  });
  fixture.store.subscribe(second);
  fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 });
  expect(second).toHaveBeenCalledOnce();
  expect(fixture.failures()).toEqual([
    expect.objectContaining({ code: "presentation.subscriber_failed" }),
  ]);
  expect(fixture.store.getSnapshot().semantic.game).toBe(game1);
});

it("disposes every upstream subscription exactly once", () => {
  const fixture = createRuntimePresentationStoreFixtureV1();
  fixture.store.dispose();
  fixture.store.dispose();
  expect(fixture.semanticUnsubscribes()).toBe(1);
  expect(fixture.preferenceUnsubscribes()).toBe(1);
  expect(fixture.uiStateUnsubscribes()).toBe(1);
});

it("isolates a throwing failure sink and preserves the prior snapshot", () => {
  const fixture = createRuntimePresentationStoreFixtureV1({
    reportFailure: () => {
      throw new Error("diagnostic-sink");
    },
  });
  const before = fixture.store.getSnapshot();
  fixture.throwOnNextProjection();
  expect(() =>
    fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 }),
  ).not.toThrow();
  expect(fixture.store.getSnapshot()).toBe(before);
});

it("rejects construction when no valid initial projection exists", () => {
  expect(() => createRuntimePresentationStoreWithThrowingInitialProjectorV1()).toThrowError(
    expect.objectContaining({ code: "presentation.initial_projection_failed" }),
  );
});
```

`createRuntimePresentationStoreFixtureV1` is fully test-local and returns the semantic/UI sources, the pending store, a strict in-memory `ContentPreferencePortV1`, and `testContentFlag`, which is descriptor alpha=`1` from its frozen two-flag policy. `narrative1` is a frozen test-only Narrative token. The projector records every exact input reference, including that token. These fields are part of the test fixture contract, not production exports; Step 1 defines them before running the expected-red test.

- [ ] **Step 2: Run the focused UI runtime test and confirm the store is absent**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/runtime/runtime-presentation-store.test.ts`

Expected: FAIL with unresolved runtime-presentation store and hook exports.

- [ ] **Step 3: Implement one cached immutable application publication**

```ts
export interface RuntimePresentationProjectionInputV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
> {
  readonly semantic: DeepReadonly<TSemanticPublication>;
  readonly resolvedCatalog: DeepReadonly<TResolvedCatalog>;
  readonly contentPreference: DeepReadonly<ContentPreferenceV1>;
  readonly uiState: DeepReadonly<TUiState>;
}

export interface RuntimePresentationProjectionV1<TView, TAssetId> {
  readonly view: DeepReadonly<TView>;
  readonly requiredAssetIds: readonly TAssetId[];
}

export interface PresentationRuntimeFailureV1 {
  readonly code:
    | "presentation.initial_projection_failed"
    | "presentation.projection_failed"
    | "presentation.subscriber_failed"
    | "presentation.asset_preload_failed";
  readonly summary: string;
  readonly details: StrictJsonObjectV1;
}

export class RuntimePresentationConstructionErrorV1 extends Error {
  readonly code = "presentation.initial_projection_failed" as const;
}

export interface RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId> {
  readonly revision: NonNegativeSafeInteger;
  readonly semantic: DeepReadonly<TSemanticPublication>;
  readonly view: DeepReadonly<TView>;
  readonly requiredAssetIds: readonly TAssetId[];
}

export interface RuntimePresentationStoreV1<TPublication> {
  getSnapshot(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface CreateRuntimePresentationStoreInputV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
  TView,
  TAssetId,
> {
  readonly semantic: SemanticPublicationBridgeV1<TSemanticPublication>;
  readonly resolvedCatalog: DeepReadonly<TResolvedCatalog>;
  readonly contentPreference: ContentPreferencePortV1;
  readonly uiState: ReadonlyViewSourceV1<TUiState>;
  project(
    input: RuntimePresentationProjectionInputV1<TSemanticPublication, TResolvedCatalog, TUiState>,
  ): RuntimePresentationProjectionV1<TView, TAssetId>;
  reportFailure(failure: DeepReadonly<PresentationRuntimeFailureV1>): void;
}

export function createRuntimePresentationStoreV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
  TView,
  TAssetId,
>(
  input: CreateRuntimePresentationStoreInputV1<
    TSemanticPublication,
    TResolvedCatalog,
    TUiState,
    TView,
    TAssetId
  >,
): RuntimePresentationStoreV1<
  RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>
>;
```

`createRuntimePresentationStoreV1` reads the four current source references once per upstream notification, invokes the supplied projector exactly once, rejects duplicate `requiredAssetIds`, freezes a new `RuntimePresentationPublicationV1`, then swaps the cached reference before notifying listeners. Revision begins at `0` for the initial projection and increments by exactly one per successful source-driven projection; it never copies or changes `semantic.revision`. If the initial projection fails, no valid external-store snapshot exists, so construction reports the bounded failure, removes any already-installed upstream subscriptions, and throws `RuntimePresentationConstructionErrorV1`; the Story root hands that error to the Phase 5A System recovery surface instead of mounting a partial store. A later projector exception preserves the prior publication, reports one bounded `presentation.projection_failed` value, and leaves all subscriptions live. Listener exceptions are isolated and reported after the publication swap; failure-sink exceptions are also swallowed at this diagnostics boundary and never alter a publication or source notification result. `dispose` is idempotent and makes later upstream notifications inert.

```ts
export function useRuntimePresentationV1<TPublication>(
  store: RuntimePresentationStoreV1<TPublication>,
): DeepReadonly<TPublication> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
```

The hook returns the cached snapshot reference and performs no projection in render or effect. Type tests prove the projector input has no `createQueries`, Snapshot, GameSession, owner, RNG, sequence, persistence, diagnostics, capability, or DebugTools member.

- [ ] **Step 4: Verify exact AssetRegistry demand and render-store boundaries**

Add this exact-demand and import-boundary integration test:

```ts
it("preloads only the exact IDs resolved by one publication", async () => {
  const fixture = createRuntimePresentationAssetFixtureV1();
  const publication = fixture.store.getSnapshot();
  await fixture.assetRegistry.preload(publication.requiredAssetIds, fixture.signal);
  expect(fixture.preloadCalls()).toEqual([
    ["asset.e2e.background.base", "asset.e2e.character.base"],
  ]);
  expect(JSON.stringify(fixture.preloadCalls())).not.toMatch(/scene|overlay|extra/u);
});

it("keeps generic runtime and Story Web projection closures separated", async () => {
  expect(await collectProductionImportsV1("engine/packages/ui/src/runtime")).not.toMatch(
    /stories\/|apps\/web/u,
  );
  expect(await collectNodeImportClosureV1("game/stories/e2e/src/story-entry.ts")).not.toMatch(
    /runtime-presentation|\.tsx|react/u,
  );
});
```

Run: `pnpm --filter @sillymaker/ui exec vitest run src/runtime src/assets && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck && pnpm verify`

Expected: PASS; React sees stable external-store snapshots, filtered assets are never requested, and no second Gameplay read API exists.

- [ ] **Step 5: Commit the application presentation store**

```bash
git add -- engine/packages/ui/src/runtime engine/packages/ui/src/index.ts engine/packages/ui/type-tests/runtime-presentation-public.test-d.ts
git diff --cached --check
git commit -m "feat(ui): add atomic runtime presentation store"
```

### Task 3: Render StageScene Variants Without Owning Gameplay State

**Files:**

- Create: `engine/packages/ui/src/stage/contracts.ts`
- Create: `engine/packages/ui/src/stage/stage-scene-host.tsx`
- Create: `engine/packages/ui/src/stage/stage-scene-host.module.css`
- Create: `engine/packages/ui/src/stage/stage-scene-host.test.tsx`
- Create: `engine/packages/ui/src/stage/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/ui/type-tests/stage-presentation-public.test-d.ts`
- Test: `engine/packages/ui/src/stage/stage-scene-host.test.tsx`

**Interfaces:**

- Consumes: Base StageScene/variant/Asset IDs and validated renderer strings, Phase 5A background contribution namespace plus exact `GameRendererContextV1`, `PresentationReadPortV1`/`usePresentationAssetV1`, a `RuntimePresentationPublicationV1` view slice, and the Stage background layer.
- Produces: `RuntimeStageSceneV1`, `StageBackgroundPresentationV1`, `StageSceneHostV1`, and `CodeFallbackStageSceneV1`.

- [ ] **Step 1: Write failing renderer resolution, variant replacement, asset fallback, and reduced-motion tests**

```tsx
it("renders the selected variant through its registered background renderer", () => {
  render(
    <StageSceneHostV1
      stage={runtimeStage("stage_scene.e2e.main", "stage_variant.e2e.main.default")}
      contributions={backgroundContributions}
      semantic={semantic}
      presentation={presentation}
    />,
  );
  expect(screen.getByTestId("stage-scene-background")).toHaveAttribute(
    "data-stage-scene-id",
    "stage_scene.e2e.main",
  );
  expect(screen.getByTestId("stage-scene-background")).toHaveAttribute(
    "data-stage-variant-id",
    "stage_variant.e2e.main.default",
  );
  expect(calmRenderer).toHaveBeenCalledOnce();
});

it("replaces only the runtime variant when the projected view changes", () => {
  const { rerender } = renderStageHostV1(calmStage);
  rerenderStageHostV1(rerender, activeStage);
  expect(activeRenderer).toHaveBeenCalledOnce();
  expect(gameSessionFactory).toHaveBeenCalledTimes(0);
  expect(simulationFactory).toHaveBeenCalledTimes(0);
});

it("falls back from a missing registered image to the code-native scene", () => {
  renderStageHostV1(stageWithMissingBackground);
  expect(presentation.asset).toHaveBeenCalledWith(
    stageWithMissingBackground.background.assetId,
    "scene_background",
  );
  expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
    "data-stage-fallback",
    "code_native",
  );
  expect(screen.queryByTestId("transparent-background-hotspot")).not.toBeInTheDocument();
});

it("removes the cross-fade when reduced motion is requested", () => {
  setReducedMotionV1(true);
  renderStageHostV1(calmStage);
  expect(screen.getByTestId("stage-scene-background")).toHaveAttribute("data-transition", "none");
});

it("rerenders a transition background when deferred preload becomes ready", async () => {
  const fixture = renderDeferredStageAssetV1();
  expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
    "data-stage-fallback",
    "code_native",
  );
  const presentationPublication = fixture.runtimePresentation.getSnapshot();
  fixture.loader.resolve({ kind: "loaded", url: "/assets/active.webp" });
  await fixture.preload;
  expect(await screen.findByTestId("stage-runtime-image")).toHaveAttribute(
    "src",
    "/assets/active.webp",
  );
  expect(fixture.runtimePresentation.getSnapshot()).toBe(presentationPublication);
  expect(fixture.semanticRevision()).toBe(fixture.initialSemanticRevision);
});
```

- [ ] **Step 2: Run the focused Stage suite and confirm the host is absent**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/stage/stage-scene-host.test.tsx`

Expected: FAIL because the Stage runtime contracts and host do not exist.

- [ ] **Step 3: Implement a renderer-neutral runtime Stage slice and bounded fallback**

```ts
export interface StageBackgroundPresentationV1 {
  readonly assetId: AssetId;
  readonly accessibleNameTextId: TextId;
}

export interface RuntimeStageSceneV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly background: StageBackgroundPresentationV1;
  readonly layout: StrictJsonObjectV1;
}

export interface StageSceneHostPropsV1<
  TSemanticPort,
  TPresentation,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> & {
    readonly background: GameRendererContextV1<RuntimeStageSceneV1, TSemanticPort, TPresentation>;
  },
> {
  readonly stage: DeepReadonly<RuntimeStageSceneV1>;
  readonly contributions: UiContributionRegistryV1<TContexts>;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}
```

`StageSceneHostV1` looks up only `stage.rendererId` in the Phase 5A `background` namespace and passes exactly `{ viewSlice: stage, semantic, presentation }` to that contribution. The contribution resolves the selected asset only through `usePresentationAssetV1(presentation, stage.background.assetId, "scene_background")`; raw `presentation.asset()` is called only inside that hook. An unknown renderer or failed background resolution reports a bounded presentation fault and renders `CodeFallbackStageSceneV1` with `presentation.text(stage.background.accessibleNameTextId).text` plus the `fallbackToken` returned by the same hook result. The runtime Stage slice and Story projector never duplicate fallback metadata or inspect the resolved asset manifest. The host never guesses another StageScene, mutates UI session state, imports a Story, or examines Calendar; it receives the already-selected variant. A successful variant replacement uses a 160–240 ms opacity transition unless reduced motion is active, and it preserves the mounted Shell, GameSession, input router, and all non-background layers.

- [ ] **Step 4: Prove the Stage contract cannot enter simulation or Headless closures**

Add these type/import tests:

```ts
declare const stage: RuntimeStageSceneV1;
const id: StageSceneId = stage.stageSceneId;
// @ts-expect-error UI runtime Stage is not a Gameplay view.
const gameplay: PocGameViewV1 = stage;
// @ts-expect-error Stage host never exposes Session.
stage.gameSession;

it.each([
  "game/stories/e2e/src/story-entry.ts",
  "game/stories/poc/src/index.ts",
  "game/stories/e2e/src/runtime/headless-runner.ts",
] as const)("keeps %s free of the React Stage host", async (entry) => {
  expect(await collectNodeImportClosureV1(entry)).not.toMatch(
    /stage-scene-host|PocGameQueries|GameSession|\.tsx|react/u,
  );
});
```

The existing Base contract test continues to prove `StageScenePresentationV1` round-trips as Strict JSON.

Run: `pnpm --filter @sillymaker/ui exec vitest run src/stage && pnpm verify:stories && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck && pnpm verify`

Expected: PASS; Stage variant rendering is a replaceable presentation concern and the default Story closure remains Node-safe.

- [ ] **Step 5: Commit the StageScene host**

```bash
git add -- engine/packages/ui/src/stage engine/packages/ui/src/index.ts engine/packages/ui/type-tests/stage-presentation-public.test-d.ts
git diff --cached --check
git commit -m "feat(ui): render stage scene variants"
```

#### Authorized owner repair before Task 4

The Task 4 input audit found that the original plan required generic UI to distinguish critical and decorative Story layers without a neutral field, described an unexecutable renderer-to-renderer fallback edge, and assigned cue-player/DOM behavior responsibilities before their owners existed. The approved narrow repair adds the neutral runtime field and assigns its PoC policy to Task 8's Story application projector before Task 4's expected-red. It does not change a Base ABI, Gameplay, Save, materialized Story Presentation, state-contract digest, simulation digest, asset demand, or materialized dependency.

**Repair files:**

- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`
- Modify: `docs/engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md`
- Modify: `docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md`
- Modify: `game/stories/poc/src/presentation/assets.ts`
- Modify: `game/stories/poc/src/test/story-validation.test.ts`

Before committing, run the focused Story validation, `pnpm typecheck`, and `git diff --check`. Then stage exactly the repair files and commit independently:

```bash
git add -- docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md docs/engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md game/stories/poc/src/presentation/assets.ts game/stories/poc/src/test/story-validation.test.ts
git diff --cached --check
git commit -m "fix(story-poc): declare appearance fallback policy"
```

The first repair attempt placed `fallbackPolicy` inside Phase 4B `pocResolvedPresentationCatalogV1`. The clean post-commit gate correctly rejected all eight Save fixtures because the then-current PoC builder required the complete live diagnostic tuple, even though state-contract, engine, and simulation digests remained identical. The accepted Task 3 recovery restores the Phase 4B pairs and keeps one exhaustive policy function solely in Task 8's Web/application closure. At this recovery point do not bypass that provenance guard or regenerate the fixtures. The authorized Task 9 owner repair below later adopts Phase 3's strict two-mode provenance contract without relaxing any blocking key or writer check. Stage the same five repair files for the recovery commit:

```bash
git add -- docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md docs/engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md game/stories/poc/src/presentation/assets.ts game/stories/poc/src/test/story-validation.test.ts
git diff --cached --check
git commit -m "fix(story-poc): preserve presentation provenance"
```

From that clean recovery commit run `pnpm verify:materialization`, `pnpm verify:phase4`, and `pnpm verify`. The repair is accepted only when all three pass and the worktree remains clean; otherwise follow the execution protocol's owner-repair recovery before starting Task 4.

### Task 4: Add Static and Hybrid Paper-Doll Character Renderers with Compatible Fallbacks

**Files:**

- Create: `engine/packages/ui/src/characters/contracts.ts`
- Create: `engine/packages/ui/src/characters/character-renderer-registry.ts`
- Create: `engine/packages/ui/src/characters/character-renderer-registry.test.ts`
- Create: `engine/packages/ui/src/characters/character-host.tsx`
- Create: `engine/packages/ui/src/characters/character-host.test.tsx`
- Create: `engine/packages/ui/src/characters/static-character-renderer.tsx`
- Create: `engine/packages/ui/src/characters/paper-doll-character-renderer.tsx`
- Create: `engine/packages/ui/src/characters/use-character-assets.ts`
- Create: `engine/packages/ui/src/characters/character-renderers.module.css`
- Create: `engine/packages/ui/src/characters/character-renderers.test.tsx`
- Create: `engine/packages/ui/src/characters/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Modify: `engine/packages/ui/type-tests/stage-presentation-public.test-d.ts`
- Test: `engine/packages/ui/src/characters/*.test.*`

**Interfaces:**

- Consumes: Base Character/rig/pose/expression/activity/appearance/HitMap IDs, Phase 5A character contribution namespace and exact `GameRendererContextV1`, the Story-specialized Semantic port, `PresentationReadPortV1`/`usePresentationAssetV1`, resolved rig layer order, and the character Stage layer.
- Produces: `RuntimeCharacterPresentationV1`, `RuntimeAppearanceLayerV1`, `CharacterRendererContributionV1`, `CharacterRendererRegistryV1`, `createCharacterRendererRegistryV1`, `CharacterHostV1`, `StaticCharacterRendererV1`, and `PaperDollCharacterRendererV1`.

- [ ] **Step 1: Write failing identity, layer order, appearance stability, pose override, and fallback tests**

```tsx
it("renders static and paper-doll characters with the same stable identity", () => {
  const staticResult = renderCharacterV1(staticCharacterView);
  expect(staticResult.getByTestId("character-root")).toHaveAttribute(
    "data-character-id",
    "character.synthetic.guide",
  );
  staticResult.unmount();

  const layeredResult = renderCharacterV1(paperDollCharacterView);
  expect(layeredResult.getByTestId("character-root")).toHaveAttribute(
    "data-character-id",
    "character.synthetic.guide",
  );
  expect(layeredResult.getByTestId("character-root")).toHaveAttribute(
    "data-hit-map-id",
    "hit_map.synthetic.guide.standing",
  );
});

it("uses authored layer order rather than engine-owned clothing names", () => {
  renderCharacterV1(paperDollCharacterView);
  expect(screen.getAllByTestId("appearance-layer").map((node) => node.dataset.layerId)).toEqual([
    "layer.e2e.back",
    "layer.e2e.body",
    "layer.e2e.face",
    "layer.e2e.front",
  ]);
});

it("changes appearance without changing the rig pose or default HitMap", () => {
  const next = withAppearanceV1(paperDollCharacterView, alternateAppearance);
  expect(next.rigId).toBe(paperDollCharacterView.rigId);
  expect(next.poseId).toBe(paperDollCharacterView.poseId);
  expect(next.hitMapId).toBe(paperDollCharacterView.hitMapId);
});

it("allows an authored pose to select its explicit HitMap override", () => {
  expect(resolveCharacterHitMapV1(standingCharacter, rigCatalog)).toBe(
    "hit_map.synthetic.guide.standing",
  );
  expect(resolveCharacterHitMapV1(seatedCharacter, rigCatalog)).toBe(
    "hit_map.synthetic.guide.seated",
  );
});

it("disables only spatial hit testing when the static fallback is not coordinate-compatible", () => {
  renderCharacterV1(characterWithFailedCriticalLayer);
  expect(screen.getByRole("img", { name: "测试角色" })).toBeVisible();
  expect(screen.getByTestId("character-root")).toHaveAttribute("data-spatial-hit-test", "disabled");
});

it("keeps committed pose and expression outside adapter mapping", () => {
  const before = paperDollCharacterView;
  expect(fakeAdapter.mapStoryCue?.("cue.synthetic.guide.greet")).toBe("Greet");
  expect(paperDollCharacterView.poseId).toBe(before.poseId);
  expect(paperDollCharacterView.expressionId).toBe(before.expressionId);
  expect(gameplayWitness()).toEqual(initialGameplayWitness);
});

it("rerenders paper-doll layers after deferred readiness without a new gameplay view", async () => {
  const fixture = renderDeferredPaperDollAssetV1();
  expect(screen.getByTestId("character-root")).toHaveAttribute(
    "data-character-fallback",
    "code_native",
  );
  const runtimeView = fixture.runtimePresentation.getSnapshot();
  fixture.loader.resolve({ kind: "loaded", url: "/assets/body.webp" });
  await fixture.preload;
  expect(await screen.findByTestId("appearance-layer-runtime-image")).toHaveAttribute(
    "src",
    "/assets/body.webp",
  );
  expect(fixture.runtimePresentation.getSnapshot()).toBe(runtimeView);
  expect(fixture.gameplayWitness()).toEqual(fixture.initialGameplayWitness);
});
```

- [ ] **Step 2: Run the Character suites and confirm the renderer layer is absent**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/characters`

Expected: FAIL because the Character renderer contracts, registry, and implementations do not exist.

- [ ] **Step 3: Implement stable character inputs and the hybrid renderer**

```ts
export interface RuntimeAppearanceLayerV1 {
  readonly layerId: AppearanceLayerId;
  readonly assetId: AssetId;
  readonly fallbackPolicy: "omit" | "character_fallback";
}

export interface RuntimeCharacterPresentationV1 {
  readonly characterId: CharacterId;
  readonly accessibleNameTextId: TextId;
  readonly rendererId: string;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly activityId: CharacterActivityId | null;
  readonly appearance: readonly RuntimeAppearanceLayerV1[];
  readonly hitMapId: HitMapId | null;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
  readonly staticFallbackAssetId: AssetId | null;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}

export interface CharacterRendererContributionV1 {
  readonly rendererId: string;
  readonly kind: "static" | "paper_doll" | "adapter";
  mapStoryPose?(poseId: CharacterPoseId): string | null;
  mapStoryCue?(cueId: string): string | null;
  mapExternalTarget?(externalTargetId: string): InteractionTargetId | null;
}
```

`CharacterRendererRegistryV1` is the neutral adapter-metadata catalog for `kind` and optional stable-ID mappings; it is not a second React component registry. Actual component lookup remains exclusively in Phase 5A `UiContributionRegistryV1`'s `character` namespace, and `CharacterHostV1` passes that contribution exactly `{ viewSlice: character, semantic, presentation }`. The adapter catalog validates unique renderer IDs. `PaperDollCharacterRendererV1` uses the resolved rig's authored layer sequence and one shared canvas/origin/foot pivot; it does not recognize `back_hair`, `costume_body`, or any other Story layer name. Static reads use `usePresentationAssetV1`; variable-length layer reads use private `useCharacterAssetsV1`, which owns one `useSyncExternalStore` subscription and resolves every request in the same render, so Hooks are never called from a data-dependent loop. Only those two hooks call raw `presentation.asset()`. Appearance layers are decorative/`aria-hidden`; the character root alone exposes `presentation.text(character.accessibleNameTextId).text`, so a seven-layer paper doll is announced once. A failed `omit` layer is omitted; AssetRegistry retains load/usage diagnostics. A failed `character_fallback` layer invokes the built-in generic static renderer with `staticFallbackAssetId`, then a code-native named silhouette. Spatial hit testing is retained only for a declared compatible static fallback. Character rendering never creates a DOM action; Task 6's `InteractionBehaviorListV1` owns the always-present semantic DOM equivalent.

This task freezes mapping direction only: stable Story pose/cue IDs map outward to adapter IDs, while external target names map inward to stable Story targets. It does not invent a player, cue target, request identity, failure sink, or clear port. Task 6's `presentation.play_cue` updates only the application-owned transient cue lens; a future concrete adapter must add its scoped execution/failure contract before playback. Mapping and fallback leave Semantic publication, Snapshot, RNG, CommandLog, relationship state, and the committed static `poseId`/`expressionId` untouched. The fallback is independently testable from background and appearance-asset fallback and introduces no animation library.

- [ ] **Step 4: Prove the future Live2D adapter seam without adding the SDK**

```ts
it("maps stable Story pose and cue IDs outward and hit-area names inward", () => {
  const adapter = createFakeLive2dCharacterContributionV1({
    rendererId: "renderer.synthetic.fake_live2d",
    poses: { "pose.synthetic.guide.standing": "Standing" },
    cues: { "cue.synthetic.guide.greet": "Greet" },
    targets: { Body: "target.synthetic.guide.figure" },
  });
  expect(adapter.mapStoryPose?.("pose.synthetic.guide.standing")).toBe("Standing");
  expect(adapter.mapStoryCue?.("cue.synthetic.guide.greet")).toBe("Greet");
  expect(adapter.mapExternalTarget?.("Body")).toBe("target.synthetic.guide.figure");
  expect(adapter.mapExternalTarget?.("Unknown")).toBeNull();
  expect(collectProductionImports(adapter)).not.toContain("live2d");
});
```

The fake is test-only and satisfies `CharacterRendererContributionV1`; no SDK package, model format, parameter value, Motion file, physics state, or ArtMesh name enters Base, Gameplay, SceneGraph, Save, or production dependencies.

Run: `pnpm --filter @sillymaker/ui exec vitest run src/characters && pnpm verify:assets && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; static and layered renderers share IDs, and every failed path remains visibly and semantically operable.

- [ ] **Step 5: Commit the first character renderer family**

```bash
git add -- engine/packages/ui/src/characters engine/packages/ui/src/index.ts engine/packages/ui/type-tests/stage-presentation-public.test-d.ts
git diff --cached --check
git commit -m "feat(ui): render static and layered characters"
```

### Task 5: Implement HitMap Geometry and Two-Level Interaction Validation

**Files:**

- Modify: `engine/packages/base/src/contracts/presentation.test.ts`
- Create: `engine/packages/ui/src/interaction/contracts.ts`
- Create: `engine/packages/ui/src/interaction/hit-test.ts`
- Create: `engine/packages/ui/src/interaction/hit-test.test.ts`
- Create: `engine/packages/ui/src/interaction/runtime-interaction-validation.ts`
- Create: `engine/packages/ui/src/interaction/runtime-interaction-validation.test.ts`
- Create: `engine/packages/ui/src/interaction/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Modify: `engine/packages/ui/type-tests/stage-presentation-public.test-d.ts`
- Modify: `game/stories/e2e/src/story-contract.test.ts`
- Test: `engine/packages/ui/src/interaction/hit-test.test.ts`
- Test: `engine/packages/ui/src/interaction/runtime-interaction-validation.test.ts`

**Interfaces:**

- Consumes: Phase 2 validated/frozen `HitMapDescriptorV1`, rect/circle/polygon shapes, Base-owned `InteractionActivationV1`/`InteractionEntryModeV1`/`InteractionResolutionModeV1`/`InteractionSurfaceTargetBindingV1`, resolved surface catalog, the current `RuntimePresentationPublicationV1.view`, and bounded presentation-failure sink.
- Produces: closed `PresentationIntentV1`, `RuntimeInteractionBehaviorRouteV1`, `RuntimeInteractionBehaviorV1`, `RuntimeInteractionTargetV1`, `RuntimeInteractionSurfaceV1`, `PresentationFaultV1`, `normalizeViewportPointV1`, `hitTestHitMapV1`, and `validateRuntimeInteractionSurfaceV1`; UI only re-exports the three Base interaction types and does not redeclare them.

- [ ] **Step 1: Write failing rect, circle, polygon, boundary, and priority tests**

```ts
it.each([
  [rectAreaV1(0.1, 0.1, 0.4, 0.3), { x: 0.25, y: 0.2 }],
  [circleAreaV1(0.5, 0.5, 0.2), { x: 0.5, y: 0.65 }],
  [
    polygonAreaV1([
      { x: 0.1, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.4, y: 0.8 },
    ]),
    { x: 0.4, y: 0.3 },
  ],
] as const)("hits a bounded normalized shape", (area, point) => {
  expect(hitTestHitMapV1(hitMapV1(area), point)?.targetId).toBe("target.e2e.shape");
});

it("includes authored shape boundaries and excludes points outside the character box", () => {
  expect(hitTestHitMapV1(hitMapV1(rectAreaV1(0, 0, 1, 1)), { x: 1, y: 1 })).not.toBeNull();
  expect(normalizeViewportPointV1({ x: 99, y: 100 }, domRect(100, 100, 200, 400))).toBeNull();
});

it("uses larger priority, then earlier descriptor order", () => {
  const hitMap = overlappingHitMapV1([
    targetAreaV1("target.e2e.first", 10),
    targetAreaV1("target.e2e.high", 20),
    targetAreaV1("target.e2e.same_priority_later", 20),
  ]);
  expect(hitTestHitMapV1(hitMap, { x: 0.5, y: 0.5 })?.targetId).toBe("target.e2e.high");
  expect(hitMap.targets.map((target) => target.targetId)).toEqual([
    "target.e2e.first",
    "target.e2e.high",
    "target.e2e.same_priority_later",
  ]);
});
```

- [ ] **Step 2: Write failing runtime cardinality and accessible-fallback tests**

```ts
it.each([
  [surfaceWithDirectBehaviorsV1([]), "presentation.interaction.direct_default_count"],
  [
    surfaceWithDirectBehaviorsV1([defaultA, defaultB]),
    "presentation.interaction.direct_default_count",
  ],
  [surfaceWithChooseBehaviorsV1([behaviorA]), "presentation.interaction.choose_behavior_count"],
  [surfaceWithMissingOpenTargetV1(), "presentation.interaction.open_surface_missing"],
] as const)("disables an invalid spatial surface with %s", (surface, code) => {
  const result = validateRuntimeInteractionSurfaceV1(surface, runtimeCatalog);
  expect(result.spatialState).toBe("disabled");
  expect(result.faults).toContainEqual(expect.objectContaining({ code }));
  expect(result.domFallback).toEqual(expect.objectContaining({ visible: true }));
});

it("keeps one disabled direct behavior valid with its authored Semantic reason", () => {
  const result = validateRuntimeInteractionSurfaceV1(
    surfaceWithDirectBehaviorsV1([disabledSemanticBehavior]),
    runtimeCatalog,
  );
  expect(result.spatialState).toBe("enabled");
  expect(result.surface.targets[0]?.behaviors[0]?.semantic?.descriptor).toBe(
    disabledSemanticDescriptor,
  );
  expect(result.surface.targets[0]?.behaviors[0]?.semantic?.descriptor.reasons).toEqual([
    { code: "flow.not_ready" },
  ]);
});
```

- [ ] **Step 3: Run the focused Interaction geometry/validation suites**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/interaction/hit-test.test.ts src/interaction/runtime-interaction-validation.test.ts`

Expected: FAIL because the HitMap and runtime validation functions do not exist.

- [ ] **Step 4: Implement deterministic hit testing without Story behavior**

`normalizeViewportPointV1` converts a viewport CSS point through the character element's current bounding rect to `[0,1] × [0,1]`, returning `null` outside or for a zero/non-finite rect. Rect and circle comparisons include their boundary. Polygon validation is already completed at startup; runtime hit testing uses a boundary-inclusive segment test followed by an even/odd ray crossing. `hitTestHitMapV1` scans authored entries once, tracks the winning `{ priority, authoredIndex }`, and never sorts or mutates the frozen descriptor.

`engine/packages/ui/src/interaction/contracts.ts` imports the Base-owned types for internal use, and `engine/packages/ui/src/interaction/index.ts` re-exports those exact symbols. A public type test proves Base and UI imports are mutually assignable; no second declaration is permitted.

```ts
import type { InteractionEntryModeV1, InteractionResolutionModeV1 } from "@sillymaker/base";

export type PresentationIntentV1 =
  | { readonly kind: "overlay.open"; readonly overlayId: string }
  | { readonly kind: "presentation.play_cue"; readonly cueId: string }
  | { readonly kind: "interaction.enter_surface"; readonly surfaceId: InteractionSurfaceId }
  | { readonly kind: "interaction.leave_surface" };

export type RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation> =
  | {
      readonly kind: "semantic_invocation";
      readonly descriptor: DeepReadonly<TDescriptor>;
      readonly invocation: DeepReadonly<TInvocation>;
    }
  | {
      readonly kind: "semantic_control";
      readonly descriptor: DeepReadonly<TDescriptor>;
      readonly intent: Extract<PresentationIntentV1, { kind: "overlay.open" }>;
    }
  | { readonly kind: "presentation_intent"; readonly intent: PresentationIntentV1 };

export interface RuntimeInteractionBehaviorV1<TDescriptor, TInvocation> {
  readonly behaviorId: InteractionBehaviorId;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId | null;
  readonly requiredFlags: ContentMaturityFlagsV1;
  readonly isDefault: boolean;
  readonly route: RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation>;
}

export interface RuntimeInteractionTargetV1<TDescriptor, TInvocation> {
  readonly targetId: InteractionTargetId;
  readonly accessibleNameTextId: TextId;
  readonly resolutionMode: InteractionResolutionModeV1;
  readonly openSurfaceId: InteractionSurfaceId | null;
  readonly behaviors: readonly RuntimeInteractionBehaviorV1<TDescriptor, TInvocation>[];
}

export interface RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> {
  readonly surfaceId: InteractionSurfaceId;
  readonly accessibleNameTextId: TextId;
  readonly entryMode: InteractionEntryModeV1;
  readonly hitMapId: HitMapId | null;
  readonly targets: readonly RuntimeInteractionTargetV1<TDescriptor, TInvocation>[];
}
```

`RuntimeInteractionTargetV1.resolutionMode/openSurfaceId` are projected from the current surface's `InteractionSurfaceTargetBindingV1`, never from the reusable global target descriptor. `validateRuntimeInteractionSurfaceV1` validates only the current catalog join and cardinality: direct has exactly one `isDefault` behavior; choose has at least two ordered behaviors; open_surface has no executable behavior and targets a currently enterable registered surface. A unique disabled direct behavior is valid. Invalid state returns a frozen sanitized result, disables the spatial surface, preserves every safe DOM behavior/reason it can identify, reports at most one fault per code/surface/revision, and never dispatches, advances a revision, mutates UI state, or throws through sibling surfaces.

- [ ] **Step 5: Lock startup validation at the ResolvedGame boundary**

Add these contract fixtures to the existing Phase 2 Base/Story validation suite without creating another validator:

```ts
it.each([
  [catalogWithDuplicateHitMapIdV1(), "presentation.catalog.duplicate_id"],
  [catalogWithDuplicateAreaIdV1(), "presentation.catalog.duplicate_id"],
  [catalogWithOutOfRangeRectV1(), "presentation.catalog.invalid_shape"],
  [catalogWithOutOfRangeCircleV1(), "presentation.catalog.invalid_shape"],
  [catalogWithUnboundedPolygonV1(), "presentation.catalog.invalid_shape"],
  [catalogWithMissingRigV1(), "presentation.catalog.missing_reference"],
  [catalogWithMissingPoseV1(), "presentation.catalog.missing_reference"],
  [catalogWithMissingTargetV1(), "presentation.catalog.missing_reference"],
  [catalogWithMissingSurfaceV1(), "presentation.catalog.missing_reference"],
  [catalogWithSelfLoopV1(), "presentation.catalog.surface_cycle"],
  [catalogWithTwoSurfaceCycleV1(), "presentation.catalog.surface_cycle"],
] as const)("rejects startup catalog with %s", (catalog, code) => {
  expect(() => resolveGameWithPresentationCatalogV1(catalog)).toThrowError(
    expect.objectContaining({ code }),
  );
  expect(gameSessionCreations()).toBe(0);
});

it("passes only the deeply frozen validated catalog to presentation", () => {
  const resolved = resolveGameWithPresentationCatalogV1(validInteractionCatalogV1);
  expect(Object.isFrozen(resolved.sceneGraph)).toBe(true);
  expect(Object.isFrozen(resolved.sceneGraph.hitMaps[0]!.targets)).toBe(true);
  expect(() => parseStageSceneGraphV1(resolved.sceneGraph)).not.toThrow();
});

it("reuses one target with context-specific outer and inner surface bindings", () => {
  const resolved = resolveGameWithPresentationCatalogV1(contextualTargetReuseCatalogV1);
  expect(bindingForV1(resolved.sceneGraph, "surface.e2e.stage", "target.e2e.figure")).toMatchObject(
    {
      allowedResolutionModes: ["open_surface"],
      openSurfaceId: "surface.e2e.character",
    },
  );
  expect(
    bindingForV1(resolved.sceneGraph, "surface.e2e.character", "target.e2e.figure"),
  ).toMatchObject({
    allowedResolutionModes: ["direct", "choose"],
    openSurfaceId: null,
  });
});
```

These are conformance cases for the Phase 2 parser, not a second implementation. If any static case fails, correct the Phase 2 contract/parser before continuing; Task 5 must not install a UI-side startup validator.

Run: `pnpm --filter @sillymaker/ui exec vitest run src/interaction && pnpm --filter @sillymaker/base exec vitest run src/contracts/presentation && pnpm --filter @project-tavern/story-e2e exec vitest run src/story-contract.test.ts && pnpm verify:stories && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; bad static catalogs cannot resolve, bad dynamic joins degrade locally, and no coordinate or shape enters Story Gameplay.

- [ ] **Step 6: Commit HitMap and runtime validation**

```bash
git add -- engine/packages/ui/src/interaction engine/packages/ui/src/index.ts engine/packages/ui/type-tests/stage-presentation-public.test-d.ts engine/packages/base/src/contracts/presentation.test.ts game/stories/e2e/src/story-contract.test.ts
git diff --cached --check
git commit -m "feat(ui): validate and hit test interaction maps"
```

### Task 6: Route Interaction Surfaces to Presentation Intents or Exact Semantic Invocations

**Files:**

- Create: `engine/packages/ui/src/interaction/interaction-session-store.ts`
- Create: `engine/packages/ui/src/interaction/interaction-session-store.test.ts`
- Create: `engine/packages/ui/src/interaction/presentation-intent-router.ts`
- Create: `engine/packages/ui/src/interaction/presentation-intent-router.test.ts`
- Create: `engine/packages/ui/src/interaction/interaction-controller.ts`
- Create: `engine/packages/ui/src/interaction/interaction-controller.test.ts`
- Create: `engine/packages/ui/src/interaction/InteractionSurface.tsx`
- Create: `engine/packages/ui/src/interaction/InteractionSurface.module.css`
- Create: `engine/packages/ui/src/interaction/InteractionSurface.test.tsx`
- Create: `engine/packages/ui/src/interaction/InteractionBehaviorList.tsx`
- Create: `engine/packages/ui/src/interaction/InteractionBehaviorList.test.tsx`
- Modify: `engine/packages/ui/src/interaction/contracts.ts`
- Modify: `engine/packages/ui/src/interaction/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Test: remaining `engine/packages/ui/src/interaction/*.test.*`

**Interfaces:**

- Consumes: Task 5 validated runtime surfaces, Phase 5A InputRouter/Interaction context/Pointer Adapter/Overlay session store and `PresentationReadPortV1`, one application `PresentationUiState` source plus its narrow interaction-state lens, a Story-specialized `SemanticGamePortV1`, exact current Semantic action descriptors, and a bounded presentation-failure sink.
- Produces: `PresentationIntentRouterV1`, `InteractionSessionStateV1`, lens-backed `InteractionSessionStoreV1`/`createInteractionSessionStoreV1`, `InteractionControllerV1`, `createInteractionControllerV1`, `InteractionSurfaceV1`, and `InteractionBehaviorListV1` over Task 5's closed contracts.

- [ ] **Step 1: Write failing tests for all seven legal entry/resolution paths**

```ts
it.each([
  ["surface_activation", "surface", "open_surface", "entered"],
  ["surface_activation", "target", "direct", "dispatched"],
  ["surface_activation", "target", "choose", "choice_opened"],
  ["always_active", "target", "direct", "dispatched"],
  ["always_active", "target", "choose", "choice_opened"],
  ["explicit_control", "control", "open_surface", "entered"],
  ["explicit_control", "control", "direct", "dispatched"],
] as const)(
  "routes %s/%s + %s to %s",
  async (entryMode, activationStep, resolutionMode, expected) => {
    const fixture = createInteractionControllerFixtureV1({
      entryMode,
      activationStep,
      resolutionMode,
    });
    await expect(fixture.activate()).resolves.toMatchObject({ kind: expected });
  },
);

it("dispatches the exact descriptor invocation without constructing a command", async () => {
  const fixture = createDirectSemanticInteractionFixtureV1();
  await fixture.controller.activate(fixture.pointerActivation);
  expect(fixture.semantic.dispatch).toHaveBeenCalledWith(fixture.projectedInvocation);
  expect(fixture.projectedBehavior.semantic?.descriptor).toBe(fixture.currentActionDescriptor);
  expect(fixture.semantic.dispatch).toHaveBeenCalledTimes(1);
});

it("executes a Presentation-only cue without sequence or CommandLog movement", async () => {
  const fixture = createPresentationOnlyInteractionFixtureV1();
  const before = fixture.authoritativeEvidence();
  await fixture.controller.activate(fixture.semanticControlActivation);
  expect(fixture.intents()).toEqual([
    { kind: "presentation.play_cue", cueId: "cue.e2e.counter.extra" },
  ]);
  expect(fixture.authoritativeEvidence()).toEqual(before);
  expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Write failing DOM, keyboard, focus, cleanup, and no-through tests**

```tsx
it("exposes every target and behavior through named native buttons", async () => {
  renderInteractionFixtureV1(heroineSurfaceView);
  await user.click(screen.getByRole("button", { name: "与女主互动" }));
  expect(screen.getByRole("region", { name: "女主互动" })).toBeVisible();
  expect(screen.getByRole("button", { name: "查看人物资料" })).toBeVisible();
  expect(screen.getByRole("button", { name: "一起修理招牌" })).toBeDisabled();
  expect(screen.getByText("当前不在可用时段")).toBeVisible();
});

it("uses native Enter activation and restores focus after leaving", async () => {
  const { entryButton } = renderInteractionFixtureV1(heroineSurfaceView);
  entryButton.focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("region", { name: "女主互动" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(entryButton).toHaveFocus();
});

it.each(["pointer_cancel", "focus_loss", "stage_scene_replaced"] as const)(
  "clears temporary interaction state after %s",
  (event) => {
    const fixture = createOpenInteractionSessionFixtureV1();
    fixture.route(event);
    expect(fixture.session.observe()).toEqual(initialInteractionSessionStateV1);
  },
);

it("does not let an active Overlay activation reach Interaction or Gameplay", () => {
  const fixture = createLayeredInputFixtureV1({ overlay: true, interaction: true });
  fixture.route({ kind: "action", actionId: systemInputActionIdsV1.confirm });
  expect(fixture.overlayHandler).toHaveBeenCalledOnce();
  expect(fixture.interactionHandler).not.toHaveBeenCalled();
  expect(fixture.gameplayHandler).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the Interaction controller and component suites**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/interaction`

Expected: FAIL because session, intent, controller, and DOM components do not exist.

- [ ] **Step 4: Implement the closed route types and one interaction session**

```ts
export interface InteractionSessionStateV1 {
  readonly activeSurfaceId: InteractionSurfaceId | null;
  readonly choosingTargetId: InteractionTargetId | null;
  readonly returnFocusId: string | null;
}
```

Each Story application owns one immutable `PresentationUiState` external store containing route, primary Overlay, Interaction session, and active cue together. `createInteractionSessionStoreV1` is a narrow lens over that supplied store/update port; it does not own or subscribe to a second authoritative UI-state object. `RuntimePresentationStoreV1` subscribes to the one complete source. `PresentationIntentRouterV1` only updates the known Overlay/session/cue lenses supplied at composition; unknown IDs return `presentation.intent_unknown` without execution. `InteractionControllerV1` consumes a validated current runtime surface, never caches an action descriptor across a Semantic publication, and re-resolves the activated target from the latest `RuntimePresentationPublicationV1` before route execution. Direct disabled actions return the exact descriptor reasons and do not call dispatch. Gameplay routes await the Semantic dispatch result; success/reaction presentation comes only from the subsequent committed publication or Narrative, never from an optimistic local cue. `semantic_control` opens a parameter form that retains the descriptor; the form later previews/dispatches only controlled options from that descriptor.

`InteractionSurfaceV1` converts only registered non-native spatial pointer input into normalized HitMap activation. `InteractionBehaviorListV1` resolves surface/target/behavior name and description IDs with its injected `PresentationReadPortV1`, then renders native buttons with those accessible names/descriptions, disabled state/reasons, `data-interaction-surface-id`, `data-interaction-target-id`, `data-interaction-behavior-id`, and—only for Gameplay routes—the existing `data-semantic-action-id`. Markers are parity witnesses; tests locate controls by role/name. Every spatially available behavior has a visible DOM equivalent, every target is at least 44×44 CSS px, and neither hover nor color is the sole feedback.

- [ ] **Step 5: Prove one physical operation, fresh-descriptor revalidation, and CommandLog cleanliness**

Use the Phase 5A Web Pointer Adapter fixture in these tests:

```ts
it.each(["mouse", "touch", "pen"] as const)(
  "activates one spatial target once for %s",
  (pointerType) => {
    const fixture = createSpatialPointerInteractionFixtureV1(pointerType);
    fixture.pointerDown();
    fixture.pointerUp();
    fixture.syntheticClick();
    expect(fixture.controllerActivations()).toHaveLength(1);
  },
);

it("leaves a native behavior button to one browser click", async () => {
  const fixture = renderNativeBehaviorButtonFixtureV1();
  await user.click(screen.getByRole("button", { name: "增加计数" }));
  expect(fixture.pointerRoutes()).toEqual([]);
  expect(fixture.semantic.dispatch).toHaveBeenCalledOnce();
});

it("re-resolves the latest disabled descriptor before pointer execution", async () => {
  const fixture = createFreshDescriptorInteractionFixtureV1();
  fixture.pointerDown();
  fixture.publish(disabledIncrementPublicationV1);
  await fixture.pointerUp();
  expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
  expect(fixture.result()).toMatchObject({
    kind: "disabled",
    reasons: disabledIncrementDescriptorV1.reasons,
  });
});

it("logs only the executor's Story command", async () => {
  const fixture = createCommittedE2eInteractionFixtureV1();
  await fixture.activateIncrement();
  expect(fixture.latestCommandLogEntry()).toMatchObject({
    source: "game",
    command: { kind: "e2e.counter.increment" },
  });
  expect(JSON.stringify(fixture.latestCommandLogEntry())).not.toMatch(
    /surface|target|behavior|coordinate|pointer|device|dom|renderer|preference/iu,
  );
});
```

Run: `pnpm --filter @sillymaker/ui exec vitest run src/interaction && pnpm --filter @sillymaker/web exec vitest run src/input && pnpm verify:semantic && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; all seven paths work, local intents stay non-authoritative, and Gameplay uses one fresh semantic route.

- [ ] **Step 6: Commit Interaction routing and accessible controls**

```bash
git add -- engine/packages/ui/src/interaction engine/packages/ui/src/index.ts
git diff --cached --check
git commit -m "feat(ui): route accessible interaction surfaces"
```

### Task 7: Activate the Phase 2 Neutral E2E Presentation Fixture

**Files:**

- Create: `game/stories/e2e/src/presentation/interaction-fixture.ts`
- Create: `game/stories/e2e/src/presentation/runtime-presentation.ts`
- Create: `game/stories/e2e/src/presentation/runtime-presentation.test.ts`
- Create: `game/stories/e2e/src/presentation/ui-contributions.tsx`
- Create: `game/stories/e2e/src/presentation/ui-contributions.test.tsx`
- Create: `game/stories/e2e/src/presentation/e2e-settings-section.tsx`
- Create: `game/stories/e2e/src/presentation/e2e-settings-section.test.tsx`
- Modify: `game/stories/e2e/src/presentation/text-catalogs.ts`
- Modify: `game/stories/e2e/src/presentation/presentation-program.ts`
- Modify: `game/stories/e2e/src/presentation/scene-graph.ts`
- Modify: `game/stories/e2e/src/story-contract.test.ts`
- Modify: `game/stories/e2e/tsconfig.application.json`
- Test: affected `game/stories/e2e/src/presentation/*.test.*`

**Interfaces:**

- Consumes: the Phase 2 `E2eSceneGraphV1` with `stage_scene.e2e.main/summary`, `surface.e2e.counter`, the rect/circle/polygon HitMap, the exported `e2eAlphaFlagV1`/`e2eBetaFlagV1`/`e2eBothFlagsV1`/`e2eStreamSafeContentPresetIdV1` constants from its two independent neutral content flags and Story presets, E2E `SemanticPublicationV1<E2eGameViewV1, null, E2eSemanticActionDescriptorV1, ...>`, Task 2 RuntimePresentation projector input/output, Tasks 3–6 Stage/Character/Interaction types, and the existing `action.e2e.increment` descriptor/invocation.
- Produces: additive data-only active variant plus alpha/beta cue descriptors and their neutral TextCatalog entries in the existing `E2eSceneGraphV1`, exact inferred `E2eSemanticGamePortV1`/publication/action-descriptor aliases, `e2eInteractionFixtureV1` runtime fixtures, `E2ePresentationUiStateV1`, `E2eRuntimePresentationViewV1`, `E2eRuntimePresentationPublicationV1`, `projectE2eRuntimePresentationV1`, Web-only `e2eUiContributionsV1`, and `E2eSettingsSectionV1`; it does not replace the Phase 2 catalog, policy, Story entry, root, or Gameplay.

- [ ] **Step 1: Write the failing neutral catalog and startup-validation tests**

```ts
it("reuses two independent neutral flags and Story presets with no PoC semantics", () => {
  expect(e2eContentMaturityPolicyV1.flags.map(({ id, flag }) => ({ id, flag }))).toEqual([
    { id: "content_flag.e2e.alpha", flag: 1 },
    { id: "content_flag.e2e.beta", flag: 2 },
  ]);
  expect(
    e2eContentMaturityPolicyV1.presets.map(({ presetId, allowedFlags }) => ({
      presetId,
      allowedFlags,
    })),
  ).toEqual([
    { presetId: "content_preset.e2e.base", allowedFlags: 0 },
    { presetId: "content_preset.e2e.stream_safe", allowedFlags: 2 },
    { presetId: "content_preset.e2e.all", allowedFlags: 3 },
  ]);
  expect(e2eContentMaturityPolicyV1.defaultAllowedFlags).toBe(0);
  const presentation = createE2ePresentationReadPortFixtureV1();
  for (const descriptor of [
    ...e2eContentMaturityPolicyV1.flags,
    ...e2eContentMaturityPolicyV1.presets,
  ]) {
    expect(presentation.text(descriptor.nameTextId).text.trim()).not.toBe("");
    expect(presentation.text(descriptor.descriptionTextId).text.trim()).not.toBe("");
  }
  expect(JSON.stringify(e2eContentMaturityPolicyV1)).not.toMatch(/"name"\s*:|"description"\s*:/u);
  expect(e2eInteractionFixtureV1.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
    "stage_scene.e2e.main",
    "stage_scene.e2e.summary",
  ]);
  expect(JSON.stringify(e2eInteractionFixtureV1)).not.toMatch(
    /poc|tavern|heroine|relationship|suggestive|sexual|explicit/iu,
  );
});

it.each([
  [e2eCatalogWithMissingSurfaceV1(), "presentation.catalog.missing_reference"],
  [e2eCatalogWithSurfaceCycleV1(), "presentation.catalog.surface_cycle"],
  [e2eCatalogWithDuplicateHitAreaV1(), "presentation.catalog.duplicate_id"],
] as const)("rejects an invalid startup catalog with %s", (catalog, code) => {
  expect(() => resolveE2eStoryWithPresentationCatalogV1(catalog)).toThrowError(
    expect.objectContaining({ code }),
  );
  expect(e2eSessionCreations()).toBe(0);
});
```

The exact fixture IDs are:

```text
stage_scene.e2e.main
stage_scene.e2e.summary
stage_variant.e2e.main.default
stage_variant.e2e.main.active        # Phase 5B additive presentation variant
stage_variant.e2e.summary.default
renderer.e2e.stage.css
renderer.e2e.character.layered
renderer.e2e.character.static
character.e2e.counter
rig.e2e.counter
pose.e2e.counter.idle
expression.e2e.counter.neutral
hit_map.e2e.counter.idle
surface.e2e.counter
target.e2e.counter.figure
behavior.e2e.counter.increment
behavior.e2e.counter.alpha_cue      # requires neutral alpha flag
behavior.e2e.counter.beta_cue       # requires neutral beta flag
cue.e2e.counter.alpha
cue.e2e.counter.beta
asset.e2e.background.base
asset.e2e.background.alpha
asset.e2e.background.beta
asset.e2e.character.base
```

The Phase 2 HitMap already contains one rect, one circle, and one polygon area with overlapping-priority coverage; these shapes are mechanical fixtures, not anatomical regions. The alpha/beta cues are pure-Presentation behaviors on the always-present counter figure target, so changing allowed flags never adds/removes a HitMap target or creates a zero-behavior spatial target.

- [ ] **Step 2: Write failing atomic projection, arbitrary-variant, content filtering, and descriptor-reuse tests**

```ts
it("selects a Stage variant from a non-Calendar GameView field", () => {
  const calm = projectE2ePresentationFixtureV1({ flow: { status: "idle" } });
  const active = projectE2ePresentationFixtureV1({ flow: { status: "choosing" } });
  expect(calm.view.stage.variantId).toBe("stage_variant.e2e.main.default");
  expect(active.view.stage.variantId).toBe("stage_variant.e2e.main.active");
  expect(projectE2eRuntimePresentationV1.toString()).not.toMatch(/calendar|morning|evening/u);
});

it("reuses the increment descriptor from the same publication", () => {
  const semantic = e2eSemanticPublicationV1({ actions: [incrementDescriptor] });
  const projected = projectE2eRuntimePresentationV1(
    e2eProjectionInputV1({
      semantic,
      allowedFlags: emptyContentMaturityFlagsV1,
    }),
  );
  const behavior = findE2eBehaviorV1(projected.view, "behavior.e2e.counter.increment");
  expect(behavior.route.kind).toBe("semantic_invocation");
  if (behavior.route.kind === "semantic_invocation") {
    expect(behavior.route.descriptor).toBe(incrementDescriptor);
    expect(behavior.route.invocation).toEqual({
      actionId: "action.e2e.increment",
      parameters: {},
    });
  }
});

it.each([
  [0, false, false],
  [e2eAlphaFlagV1, true, false],
  [e2eBetaFlagV1, false, true],
  [e2eBothFlagsV1, true, true],
] as const)(
  "filters alpha and beta independently for allowedFlags=%i",
  (allowedFlags, alphaVisible, betaVisible) => {
    const actionsFromFixture = Object.freeze([incrementDescriptor]);
    const semantic = e2eSemanticPublicationV1({ actions: actionsFromFixture });
    const projected = projectE2eRuntimePresentationV1(
      e2eProjectionInputV1({ semantic, allowedFlags }),
    );
    expect(findE2eBehaviorV1(projected.view, "behavior.e2e.counter.alpha_cue") !== undefined).toBe(
      alphaVisible,
    );
    expect(findE2eBehaviorV1(projected.view, "behavior.e2e.counter.beta_cue") !== undefined).toBe(
      betaVisible,
    );
    expect(collectE2eTargetIdsV1(projected.view)).toContain("target.e2e.counter.figure");
    expect(
      findE2eBehaviorV1(projected.view, "behavior.e2e.counter.increment")?.route,
    ).toMatchObject({ descriptor: incrementDescriptor });
    expect(projected.requiredAssetIds).toContain("asset.e2e.background.base");
    expect(projected.requiredAssetIds).toContain("asset.e2e.character.base");
    expect(projected.requiredAssetIds.includes("asset.e2e.background.alpha")).toBe(alphaVisible);
    expect(projected.requiredAssetIds.includes("asset.e2e.background.beta")).toBe(betaVisible);
    expect(semantic.actions).toBe(actionsFromFixture);
  },
);

it("applies a Story streamer preset through the same preference mask", async () => {
  const contentPreference = createE2eContentPreferencePortFixtureV1();
  const preset = requireContentPreferencePresetV1(
    e2eContentMaturityPolicyV1,
    e2eStreamSafeContentPresetIdV1,
  );
  await contentPreference.set({ allowedFlags: preset.allowedFlags });
  expect(contentPreference.observe()).toEqual({ allowedFlags: e2eBetaFlagV1 });
});
```

Task 7 imports the four constants from Phase 2's `content-maturity-policy.ts`; it does not redeclare naked values. `runtime-presentation.test.ts` defines two test-only helpers before the first run: `e2eProjectionInputV1({ semantic, allowedFlags })` validates `allowedFlags` with `parseContentMaturityFlagsV1` and returns the exact frozen resolved catalog, `{ allowedFlags }` preference and default `E2ePresentationUiStateV1`; `createE2eContentPreferencePortFixtureV1()` is a strict observable in-memory Port initialized from `defaultAllowedFlags`. Thus the preset test constructs every value it uses and the expected-red remains the missing production projector/fixture, not an undefined helper.

- [ ] **Step 3: Run E2E presentation tests and confirm the fixture/projector are absent**

Run: `pnpm --filter @project-tavern/story-e2e exec vitest run src/presentation src/story-contract.test.ts`

Expected: FAIL because the neutral interaction fixture, runtime projector, and Web contributions do not exist.

- [ ] **Step 4: Encode the data-only fixture and SemanticPublication-only projector**

```ts
export interface E2ePresentationUiStateV1 {
  readonly interaction: InteractionSessionStateV1;
  readonly primaryOverlayId: string | null;
  readonly activeCueId: string | null;
}

export type E2eSemanticGamePortV1 = ReturnType<typeof createE2eSemanticGamePortV1>;
export type E2eSemanticPublicationV1 = ReturnType<E2eSemanticGamePortV1["observe"]>;
export type E2eSemanticActionDescriptorV1 = E2eSemanticPublicationV1["actions"][number];

export interface E2eRuntimePresentationViewV1 {
  readonly game: DeepReadonly<E2eGameViewV1>;
  readonly narrative: null;
  readonly stage: RuntimeStageSceneV1;
  readonly characters: readonly RuntimeCharacterPresentationV1[];
  readonly interactionSurfaces: readonly RuntimeInteractionSurfaceV1<
    E2eSemanticActionDescriptorV1,
    E2eSemanticInvocationV1
  >[];
  readonly activeOverlayId: string | null;
  readonly activeCueId: string | null;
}

export type E2eRuntimePresentationPublicationV1 = RuntimePresentationPublicationV1<
  E2eSemanticPublicationV1,
  E2eRuntimePresentationViewV1,
  AssetId
>;

export function projectE2eRuntimePresentationV1(
  input: RuntimePresentationProjectionInputV1<
    E2eSemanticPublicationV1,
    E2eSceneGraphV1,
    E2ePresentationUiStateV1
  >,
): RuntimePresentationProjectionV1<E2eRuntimePresentationViewV1, AssetId> {
  const increment = requireActionDescriptorV1(input.semantic.actions, "action.e2e.increment");
  const alphaCue = requireInteractionBehaviorV1(
    input.resolvedCatalog,
    "behavior.e2e.counter.alpha_cue",
  );
  const betaCue = requireInteractionBehaviorV1(
    input.resolvedCatalog,
    "behavior.e2e.counter.beta_cue",
  );
  const alphaAllowed = isContentRequirementAllowedV1(
    alphaCue.requiredFlags,
    input.contentPreference.allowedFlags,
  );
  const betaAllowed = isContentRequirementAllowedV1(
    betaCue.requiredFlags,
    input.contentPreference.allowedFlags,
  );
  return buildFrozenE2eRuntimeProjectionV1({
    input,
    increment,
    alphaAllowed,
    betaAllowed,
  });
}
```

`interaction-fixture.ts` contains Strict JSON descriptors and parsed stable IDs only. `runtime-presentation.ts` lives in the Web application closure, imports no GameQueries/module/executor/State contract, and receives no Story runtime callback except its own module-level projector function. The active variant uses the already-published `game.flow.status`; it does not make the engine depend on Flow any more than the PoC projector makes it depend on Calendar. Task 7 does not modify or re-export from `game/stories/e2e/src/index.ts`: the default package entry remains StoryEntry-only, while the same-package application closure uses relative imports for Web runtime/TSX contributions.

- [ ] **Step 5: Implement the neutral Web contributions and verify closure/digest partition**

`e2eUiContributionsV1` registers one CSS background, one layered neutral counter character, the existing counter Interaction surface, one compact HUD, one neutral Overlay, and the existing Narrative/System hosts in the seven Phase 5A namespaces. `E2eSettingsSectionV1` is an application-only React component outside `e2eUiContributionsV1` and all seven renderer registries; the E2E application root constructs it with exactly `ContentPreferencePortV1` and `PresentationReadPortV1`, renders two independent flag checkboxes plus Story preset controls, and calls only `contentPreference.set`. It contains no Semantic/Gameplay/Snapshot/capability access. The alpha/beta cues change only CSS labels/visual tokens. Flag, preset, cue and control labels are stable neutral `TextId` entries added to the existing E2E TextCatalog and resolved only through `PresentationReadPortV1`; runtime views retain those IDs.

The DOM contract is closed: each native checkbox carries `data-content-flag-id=<ContentMaturityFlagId>` and derives `checked` from the current `allowedFlags`; each native button carries `data-content-preset-id=<ContentPreferencePresetId>` and `aria-pressed=true` iff its mask exactly matches. Each rendered alpha/beta cue element carries its exact `data-content-cue-id=<CueId>`; contribution tests prove absent cues emit no stale witness. Checkbox updates call only Base `setContentMaturityFlagV1(current, descriptor.flag, checked)`; preset buttons look up the branded descriptor and set its mask. Controls remain disabled while their single write is pending. A rejected result keeps the prior observed mask and resolves Phase 2's `e2eContentPreferenceRejectedTextIdV1`; a failed result does the same with `e2eContentPreferenceStorageFailedTextIdV1`. Both render through `PresentationReadPortV1` in one `role="status" data-content-preference-result="rejected|failed"`; a successful subscription update clears the status. No React file embeds fallback player text. Unit tests must cover check, uncheck, `base`/`stream_safe`/`all`, bitwise state after every transition, exact cue witnesses, and a rejected/failed write without optimistic drift. Browser tests wait on `checked`/`aria-pressed` plus the matching `data-content-cue-id` witness; exact background AssetId filtering remains in the projector test and is not inferred from CSS/DOM. Add these closure/digest/runtime tests:

```ts
it.each(["src/story-entry.ts", "src/presentation/scene-graph.ts"] as const)(
  "keeps %s Node-safe",
  async (entry) => {
    expect(await collectE2eNodeImportClosureV1(entry)).not.toMatch(
      /runtime-presentation|ui-contributions|\.tsx|react|@project-tavern\/ui|apps\/web/u,
    );
  },
);

it.each([
  ["policy revision", policyRevisionChangedFixtureCatalogV1],
  ["preset mask", presetMaskChangedFixtureCatalogV1],
  ["variant requirement", variantRequirementChangedFixtureCatalogV1],
  ["behavior requirement", behaviorRequirementChangedFixtureCatalogV1],
] as const)("puts a %s change only in presentation/application identity", (_kind, catalog) => {
  const base = resolveE2ePresentationIdentityFixtureV1(baseFixtureCatalogV1);
  const changed = resolveE2ePresentationIdentityFixtureV1(catalog);
  expect(changed.presentationDigest).not.toBe(base.presentationDigest);
  expect(changed.applicationDigest).not.toBe(base.applicationDigest);
  expect(changed.stateContractDigest).toBe(base.stateContractDigest);
  expect(changed.simulationDigest).toBe(base.simulationDigest);
});

it("keeps resolved identity and Semantic revision stable for a player preference change", async () => {
  const fixture = createE2ePresentationIdentityRuntimeFixtureV1();
  const before = fixture.captureResolvedIdentity();
  const semantic = fixture.runtime.semantic.getSnapshot();
  const presentationRevision = fixture.runtime.presentation.getSnapshot().revision;
  await fixture.runtime.contentPreference.set({ allowedFlags: e2eAlphaFlagV1 });
  expect(fixture.captureResolvedIdentity()).toEqual(before);
  expect(fixture.runtime.semantic.getSnapshot()).toBe(semantic);
  expect(fixture.runtime.presentation.getSnapshot().revision).toBe(presentationRevision + 1);
});

it.each([emptyContentMaturityFlagsV1, e2eAlphaFlagV1, e2eBetaFlagV1, e2eBothFlagsV1] as const)(
  "keeps unrestricted Gameplay reachable at allowedFlags=%i",
  (allowedFlags) => {
    renderE2ePresentationFixtureV1({ allowedFlags });
    expect(screen.getByRole("button", { name: "增加计数" })).toBeEnabled();
    expect(gameSessionCreations()).toBe(1);
    expect(resolvedGameCreations()).toBe(1);
  },
);
```

The four catalog fixtures are deep-frozen test-local clones with exactly one field change each: `policyRevisionChangedFixtureCatalogV1` advances only `policyRevision` to `2`; `presetMaskChangedFixtureCatalogV1` changes only `stream_safe` from beta=`2` to alpha=`1` while retaining revision `1`; the other two change one `emptyContentMaturityFlagsV1` requirement on a base Stage variant or the increment behavior to alpha. A preset-only edit therefore changes presentation identity without falsely claiming that preset labels/masks are persisted or always require a policy revision bump; incompatible flag ID↔bit/meaning changes still do. `createE2ePresentationIdentityRuntimeFixtureV1` resolves once, then exposes that immutable identity, one Semantic source, one presentation store and one in-memory preference port. No fixture changes layout, assets or simulation data, so these tests specifically bind policy/requirement data to presentation identity and player preference to application runtime state only.

Run: `pnpm --filter @project-tavern/story-e2e exec vitest run src/presentation src/story-contract.test.ts && pnpm verify:semantic && pnpm verify:stories && pnpm verify:assets && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; the neutral fixture proves the mechanism without importing any PoC identifier or content semantics.

- [ ] **Step 6: Commit the neutral Story presentation fixture**

```bash
git add -- game/stories/e2e/src/presentation game/stories/e2e/src/story-contract.test.ts game/stories/e2e/tsconfig.application.json
git diff --cached --check
git commit -m "feat(story-e2e): add neutral interaction presentation"
```

### Task 8: Project the Frozen PoC Catalog onto Existing Semantic Actions

**Files:**

- Create: `game/stories/poc/src/presentation/runtime/contracts.ts`
- Create: `game/stories/poc/src/presentation/runtime/project-poc-runtime-presentation.ts`
- Create: `game/stories/poc/src/presentation/runtime/project-poc-runtime-presentation.test.ts`
- Create: `game/stories/poc/src/presentation/runtime/interaction-behaviors.ts`
- Create: `game/stories/poc/src/presentation/runtime/interaction-behaviors.test.ts`
- Modify: `game/stories/poc/src/test/story-validation.test.ts`
- Test: `game/stories/poc/src/presentation/runtime/*.test.ts`

**Interfaces:**

- Consumes: the Phase 4B frozen `pocResolvedPresentationCatalogV1` with its StageScene/variant/rig/HitMap/behavior graph and explicit heroine layer-to-asset selection, atomic `SemanticPublicationV1<PocGameViewV1, NarrativeProjectionV1 | null, PocSemanticActionDescriptorV1, ...>`, `PocGameViewV1.hud.day`, `PocGameViewV1.hud.phase`, Phase 5B runtime types, the empty-flag/zero-mask PoC content policy, and application UI/Overlay/Interaction state.
- Produces: `PocPresentationRouteV1`, `PocPresentationUiStateV1`, `PocRuntimePresentationViewV1`, `PocRuntimePresentationPublicationV1`, typed `PocRuntimePresentationProjectorV1`, `projectPocRuntimePresentationV1`, and exact PoC Interaction behavior mappings.

- [ ] **Step 1: Write failing route/variant tests using UI state plus only frozen HUD fields**

```ts
it.each([
  [pocUiStateV1({ route: "main_menu" }), "stage_scene.poc.main_menu"],
  [pocUiStateV1({ route: "play" }), "stage_scene.poc.tavern"],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.purchase" }),
    "stage_scene.poc.market",
  ],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.world_action" }),
    "stage_scene.poc.world_map",
  ],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.run_summary" }),
    "stage_scene.poc.week_summary",
  ],
] as const)("selects %s from presentation route/overlay state", (uiState, expected) => {
  const projected = projectPocPresentationFixtureV1({
    game: pocGameViewFixtureV1({ hud: { day: 1, phase: "morning" } }),
    uiState,
  });
  expect(projected.view.stage.stageSceneId).toBe(expected);
});

it.each([
  ["morning", "stage_variant.poc.tavern.day"],
  ["afternoon", "stage_variant.poc.tavern.day"],
  ["evening", "stage_variant.poc.tavern.evening"],
] as const)("maps renderer-neutral hud.phase %s to %s", (phase, variantId) => {
  const projected = projectPocPresentationFixtureV1({
    game: pocGameViewFixtureV1({ hud: { day: 2, phase } }),
    uiState: pocUiStateV1({ route: "play" }),
  });
  expect(projected.view.stage.variantId).toBe(variantId);
});
```

These tests do not add `screen`, StageScene, renderer, asset, or Overlay fields to `PocGameViewV1`; main-menu/profile/market/world-map/week-summary selection is application presentation state. Day/phase remain renderer-neutral Gameplay read data already frozen by Phase 4A/4B.

- [ ] **Step 2: Write failing exact action-descriptor and heroine-mode tests**

```ts
it.each([
  ["behavior.poc.tavern.service_plan", "action.service_plan", "overlay.poc.tavern_plan"],
  ["behavior.poc.market.purchase", "action.purchase", "overlay.poc.purchase"],
  ["behavior.poc.world_map.old_trade_road", "action.old_trade_road", "overlay.poc.world_action"],
] as const)("maps %s to the exact %s descriptor", (behaviorId, actionId, overlayId) => {
  const descriptor = pocActionDescriptorFixtureV1(actionId);
  const semantic = pocSemanticPublicationFixtureV1({ actions: [descriptor] });
  const projected = projectPocRuntimePresentationV1(
    pocProjectionInputV1({ semantic, uiState: pocUiStateV1({ route: "play" }) }),
  );
  const behavior = findPocBehaviorV1(projected.view, behaviorId);
  expect(behavior?.route).toEqual({
    kind: "semantic_control",
    descriptor,
    intent: { kind: "overlay.open", overlayId },
  });
});

it("uses one figure target and chooses among profile plus currently published relationship actions", () => {
  const repair = pocActionDescriptorFixtureV1("action.repair_sign_with_heroine");
  const projected = projectPocPresentationFixtureV1({
    actions: [repair],
    uiState: pocUiStateV1({ route: "play", activeSurfaceId: "surface.poc.heroine" }),
  });
  const figure = findPocTargetV1(projected.view, "target.poc.heroine.figure");
  expect(figure.resolutionMode).toBe("choose");
  expect(figure.behaviors.map((behavior) => behavior.behaviorId)).toEqual([
    "behavior.poc.heroine.open_profile",
    "behavior.poc.heroine.repair_sign",
  ]);
  expect(figure.behaviors[1]?.route).toMatchObject({ descriptor: repair });
  expect(JSON.stringify(projected.view)).not.toMatch(/head|face|chest|body_part/iu);
});

it("falls back to direct profile presentation when no relationship action is published", () => {
  const projected = projectPocPresentationFixtureV1({ actions: [] });
  const figure = findPocTargetV1(projected.view, "target.poc.heroine.figure");
  expect(figure.resolutionMode).toBe("direct");
  expect(figure.behaviors).toEqual([
    expect.objectContaining({
      behaviorId: "behavior.poc.heroine.open_profile",
      route: {
        kind: "presentation_intent",
        intent: { kind: "overlay.open", overlayId: "overlay.poc.relationship" },
      },
    }),
  ]);
});
```

- [ ] **Step 3: Run the focused PoC runtime-presentation tests**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation/runtime src/test/story-validation.test.ts`

Expected: FAIL because the PoC runtime projector and behavior mapping do not exist.

- [ ] **Step 4: Implement one typed projector over the atomic publication**

```ts
export interface PocPresentationUiStateV1 {
  readonly route: PocPresentationRouteV1;
  readonly primaryOverlayId: PocOverlayIdV1 | null;
  readonly interaction: InteractionSessionStateV1;
  readonly activeCueId: string | null;
}

export type PocPresentationRouteV1 = "main_menu" | "play";

export type PocSemanticPublicationV1 = SemanticPublicationV1<
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  RuntimeSessionStatusV1
>;

export type PocResolvedPresentationCatalogV1 = DeepReadonly<
  typeof pocResolvedPresentationCatalogV1
>;

export type PocOverlayIdV1 =
  | "overlay.poc.policy"
  | "overlay.poc.inventory"
  | "overlay.poc.purchase"
  | "overlay.poc.tavern_plan"
  | "overlay.poc.facility"
  | "overlay.poc.world_action"
  | "overlay.poc.ledger"
  | "overlay.poc.relationship"
  | "overlay.poc.run_summary";

export interface PocRuntimePresentationViewV1 {
  readonly game: DeepReadonly<PocGameViewV1>;
  readonly narrative: DeepReadonly<NarrativeProjectionV1 | null>;
  readonly stage: RuntimeStageSceneV1;
  readonly characters: readonly RuntimeCharacterPresentationV1[];
  readonly interactionSurfaces: readonly RuntimeInteractionSurfaceV1<
    PocSemanticActionDescriptorV1,
    PocSemanticInvocationV1
  >[];
  readonly activeOverlayId: PocOverlayIdV1 | null;
  readonly activeCueId: string | null;
}

export interface PocRuntimePresentationProjectorV1 {
  project(
    input: RuntimePresentationProjectionInputV1<
      PocSemanticPublicationV1,
      PocResolvedPresentationCatalogV1,
      PocPresentationUiStateV1
    >,
  ): RuntimePresentationProjectionV1<PocRuntimePresentationViewV1, AssetId>;
}

export type PocRuntimePresentationPublicationV1 = RuntimePresentationPublicationV1<
  PocSemanticPublicationV1,
  PocRuntimePresentationViewV1,
  AssetId
>;

export const pocRuntimePresentationProjectorV1: PocRuntimePresentationProjectorV1 = Object.freeze({
  project: projectPocRuntimePresentationV1,
});
```

`projectPocRuntimePresentationV1` copies `input.semantic.narrative` unchanged into the Runtime view, builds indices from `input.semantic.actions` once, selects a Stage from route/Overlay state, selects only the tavern light variant from `input.semantic.game.hud.phase`, and joins registered characters/surfaces from `input.resolvedCatalog.sceneGraph`. It copies layer/asset pairs only from `input.resolvedCatalog.heroineStandardAppearance`, then enriches them through one non-exported Story application function whose exact closed policy is `costume_body → character_fallback` and `back_hair | face | front_hair | accessory → omit`. Startup/projector validation requires every resolved pair exactly once, rejects every unknown or extra policy key, and preserves authored order. This policy function remains under `presentation/runtime`, is unreachable from the default Story/Headless/materialized Presentation closure, and therefore changes only the Web application identity. The projector reads exact demand only from `input.resolvedCatalog.requiredAssetIdsByVariant[selectedVariantId]`; it never zips a layer list to an AssetId list or imports a second asset/appearance catalog. It never imports or calls `createPocGameQueriesV1`, `createPocSemanticActionCatalogV1`, any module Read Port, or any availability function. Missing/duplicate action descriptors create bounded presentation faults and a disabled DOM behavior; they never create a substitute invocation.

`surface.poc.tavern` maps its service target to the exact `action.service_plan` descriptor. The heroine placement uses `surface_activation/open_surface`; within `surface.poc.heroine`, the single figure target is `direct` for profile alone and `choose` when either existing relationship action descriptor is visible. Repair/apology use exact direct invocations from their descriptors. Purchase/WorldAction/service-plan retain their parameterized descriptors and open the controlled overlay. Profile is the only PoC Presentation-only behavior.

- [ ] **Step 5: Prove zero-mask filtering, exact assets, digest partition, and no Gameplay expansion**

Add these zero-mask, asset, and identity tests:

```ts
function allPocContentRequirementsV1(): readonly ContentRequirementV1[] {
  return Object.freeze([
    ...pocSceneGraphV1.variants.map((variant) => variant.content),
    ...pocSceneGraphV1.interactionBehaviors.map((behavior) => behavior.content),
  ]);
}

it("ships a PoC policy with no restricted flag or preset", () => {
  expect(pocContentMaturityPolicyV1).toMatchObject({
    policyRevision: 1,
    flags: [],
    presets: [],
    defaultAllowedFlags: 0,
  });
  expect(allPocContentRequirementsV1().every(({ requiredFlags }) => requiredFlags === 0)).toBe(
    true,
  );
});

it.each([
  [pocUiStateV1({ route: "main_menu" }), "morning", "stage_variant.poc.main_menu.default"],
  [pocUiStateV1({ route: "play" }), "morning", "stage_variant.poc.tavern.day"],
  [pocUiStateV1({ route: "play" }), "evening", "stage_variant.poc.tavern.evening"],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.purchase" }),
    "morning",
    "stage_variant.poc.market.day",
  ],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.world_action" }),
    "morning",
    "stage_variant.poc.world_map.default",
  ],
  [
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.run_summary" }),
    "morning",
    "stage_variant.poc.week_summary.default",
  ],
] as const)("requests exact standard assets for %s", (uiState, phase, variantId) => {
  const projected = projectPocPresentationFixtureV1({
    game: pocGameViewFixtureV1({ hud: { day: 1, phase } }),
    uiState,
  });
  expect(projected.view.stage.variantId).toBe(variantId);
  expect(projected.requiredAssetIds).toEqual(
    pocResolvedPresentationCatalogV1.requiredAssetIdsByVariant[variantId],
  );
  expect(JSON.stringify(projected.requiredAssetIds)).not.toMatch(
    /extra|suggestive|sexual|explicit|art-source|references/iu,
  );
});

it("projects explicit appearance pairs through the exhaustive Story fallback policy", () => {
  const projected = projectPocPresentationFixtureV1({
    uiState: pocUiStateV1({ route: "play" }),
  });
  expect(projected.view.characters[0]?.appearance).toEqual(
    pocResolvedPresentationCatalogV1.heroineStandardAppearance.map((layer) => ({
      ...layer,
      fallbackPolicy:
        layer.layerId === "appearance_layer.poc.heroine.costume_body"
          ? "character_fallback"
          : "omit",
    })),
  );
});

it("changes runtime variant without changing authoritative or Artifact identity", () => {
  const fixture = createPocPresentationIdentityFixtureV1();
  const before = fixture.captureIdentityAndAuthority();
  fixture.uiState.publish(
    pocUiStateV1({ route: "play", primaryOverlayId: "overlay.poc.purchase" }),
  );
  expect(fixture.captureIdentityAndAuthority()).toEqual(before);
  expect(fixture.presentation().view.stage.stageSceneId).toBe("stage_scene.poc.market");
});

it("changes only presentation/application identity for a catalog layout edit", () => {
  const base = resolvePocIdentityFixtureV1(pocPresentationCatalogV1);
  const changed = resolvePocIdentityFixtureV1(pocPresentationCatalogWithLayoutEditV1);
  expect(changed.presentationDigest).not.toBe(base.presentationDigest);
  expect(changed.applicationDigest).not.toBe(base.applicationDigest);
  expect(changed.stateContractDigest).toBe(base.stateContractDigest);
  expect(changed.simulationDigest).toBe(base.simulationDigest);
});
```

`allPocContentRequirementsV1` is the test-local exhaustive collector for every requirement-bearing descriptor in the v1 SceneGraph ABI: Stage variants and Interaction behaviors. The test separately compares each selected variant's exact `requiredAssetIds` to Phase 4B's frozen zero-requirement mapping, so no asset-demand path is omitted or treated as a third requirement catalog. This helper is defined in `runtime-presentation.test.ts` and is not a production export.

Before and after the task, hash the Phase 4B closed State/Command/Fact/Action ID sources, six command fixtures, six golden files, and eight Save fixtures and require byte equality. The planned diff scan rejects `touch`, `headpat`, daily counter, outfit unlock, boundary counter, or any new relationship effect outside documentation assertions.

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation/runtime src/test/story-validation.test.ts && pnpm --filter @project-tavern/story-poc verify:commands && pnpm verify:golden && pnpm verify:fixtures && pnpm verify:semantic && pnpm verify:stories && pnpm verify:assets && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; PoC presentation maps only existing behavior and leaves every authoritative fixture unchanged.

- [ ] **Step 6: Commit the PoC runtime presentation projector**

```bash
git add -- game/stories/poc/src/presentation/runtime game/stories/poc/src/test/story-validation.test.ts
git diff --cached --check
git commit -m "feat(story-poc): project stage interactions"
```

#### Authorized owner repair before Task 9

The live Task 9 input audit found two presentation-contract gaps:

1. the Phase 4B TextCatalog lacks the code-native HUD, Overlay, form and compact Stage labels that
   Task 9 explicitly requires, while React is forbidden to embed a second dictionary; and
2. the Task 9 AP example called for a meter even though `PocHudProjectionV1` intentionally exposes
   only `apRemaining`, with no authoritative maximum that a renderer may infer.

Correct the first gap additively in the existing `pocTextIdsV1`/`zh-CN` authority, including an
exhaustive Story-owned rejection-code-to-TextId map for Semantic preview and disabled reasons. This
is a Presentation-only change: `presentationDigest` changes, while Story digest, PatchSet,
state-contract, engine, simulation, command, golden and Gameplay IDs remain unchanged. Preserve all
eight Save bytes through the Phase 4B authorized two-mode fixture-provenance repair: read-only
verification requires the complete blocking tuple and rebuilds historical bytes with the frozen
diagnostic tuple; the tracked writer remains strict over both tuples. Do not add a React fallback
string or run the writer.

Render AP as the named discrete counter `行动点 N`. Continue to render player and heroine stamina
with the Phase 5A `ProgressMeterV1` using their projected current/maximum values. This changes no
GameView field and prevents the renderer from hard-coding or recomputing an AP maximum.

The exact repair files, TDD sequence, verification commands and independent repair commit are
recorded under Phase 4B Task 12. Complete that repair from a clean checkpoint before Task 9's own
expected-red.

### Task 9: Build the PoC HUD, Tavern Idle, Market, World Map, and Story Overlays

**Files:**

- Create: `game/stories/poc/src/presentation/hud/PocHud.tsx`
- Create: `game/stories/poc/src/presentation/hud/PocHud.module.css`
- Create: `game/stories/poc/src/presentation/hud/PocHud.test.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocMainMenuScene.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocTavernScene.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocMarketScene.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocWorldMapScene.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocWeekSummaryScene.tsx`
- Create: `game/stories/poc/src/presentation/scenes/PocScenes.module.css`
- Create: `game/stories/poc/src/presentation/scenes/scenes.test.tsx`
- Create: `game/stories/poc/src/presentation/overlays/PolicyOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/InventoryOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/PurchaseOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/TavernPlanOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/FacilityOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/WorldActionOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/LedgerOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/RelationshipOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/RunSummaryOverlay.tsx`
- Create: `game/stories/poc/src/presentation/overlays/overlays.test.tsx`
- Create: `game/stories/poc/src/presentation/symbols/poc-game-symbols.tsx`
- Create: `game/stories/poc/src/presentation/symbols/poc-game-symbols.module.css`
- Create: `game/stories/poc/src/presentation/symbols/poc-game-symbols.test.tsx`
- Create: `game/stories/poc/src/presentation/ui-contributions.tsx`
- Create: `game/stories/poc/src/presentation/ui-contributions.test.tsx`
- Create: `game/stories/poc/tsconfig.application.json`
- Test: affected `game/stories/poc/src/presentation/**/*.test.tsx`

**Interfaces:**

- Consumes: Task 8 `PocRuntimePresentationViewV1`, Phase 5A Shell/Stage slots/Overlay/VN/System/primitives/AssetRegistry/PresentationReadPort plus the separate `GameSymbolIdV1`/provider/registry/`GameSymbolV1` surface, Tasks 3–6 Stage/Character/Interaction components, Phase 4B action descriptors/options/previews, player-visible GameView slices, the frozen `pocGameSymbolIdsV1` tuple, and Story Text/Asset catalogs.
- Produces: all player-facing PoC React contributions, `pocUiContributionsV1` across the seven Phase 5A namespaces, and the separate Story-owned `pocGameSymbolIdsByRoleV1`/`pocGameSymbolProvidersV1`/`pocGameSymbolRegistryV1` while consuming the explicitly corrected Phase 4B TextCatalog plus the resolved asset manifest and symbol-ID tuple unchanged.

- [ ] **Step 1: Write failing top-card HUD and tavern-idle tests**

```tsx
it("renders the compact top-card HUD from the projected GameView", () => {
  renderPocHudV1(pocRuntimeViewFixtureV1());
  expect(screen.getByText("周一 · 上午")).toBeVisible();
  expect(screen.getByText("行动点 2")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "主角体力" })).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "女主体力" })).toBeVisible();
  expect(screen.getByText("现金 70")).toBeVisible();
  expect(screen.getByText("人气 50")).toBeVisible();
  expect(screen.getByText("重建税 140")).toBeVisible();
  expect(screen.queryByText("库存详情")).not.toBeInTheDocument();
});

it("keeps the tavern and heroine visible while actions stay lightweight", () => {
  renderPocSceneV1(pocTavernRuntimeViewFixtureV1());
  expect(screen.getByRole("img", { name: "酒馆主厅" })).toBeVisible();
  expect(screen.getByRole("img", { name: "女主" })).toBeVisible();
  expect(screen.getByRole("button", { name: "与女主互动" })).toBeVisible();
  expect(screen.getByRole("button", { name: "安排营业" })).toBeVisible();
  expect(screen.queryByRole("table", { name: "完整库存" })).not.toBeInTheDocument();
});

it("registers the exact PoC world-symbol IDs outside renderer namespaces", () => {
  expect(pocGameSymbolIdsV1).toHaveLength(14);
  expect(pocGameSymbolProvidersV1.map(({ symbolId }) => symbolId)).toEqual(pocGameSymbolIdsV1);
  expect(Object.keys(pocUiContributionsV1.renderers)).not.toContain("gameSymbols");
});

it.each([16, 20, 24, 32] as const)("renders a named world symbol at %ipx", (size) => {
  render(
    <GameSymbolV1
      registry={pocGameSymbolRegistryV1}
      symbolId={pocGameSymbolIdsByRoleV1.stamina}
      size={size}
      accessibleName="体力"
    />,
  );
  expect(screen.getByRole("img", { name: "体力" })).toHaveStyle({
    width: `${size}px`,
    height: `${size}px`,
  });
});

it("supports decorative symbols and a visible named code fallback", () => {
  const missingSymbolId = parseGameSymbolIdV1("symbol.poc.test_missing");
  const { container, rerender } = render(
    <GameSymbolV1
      registry={pocGameSymbolRegistryV1}
      symbolId={pocGameSymbolIdsByRoleV1.ingredient}
      size={20}
      decorative
    />,
  );
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  rerender(
    <GameSymbolV1
      registry={pocGameSymbolRegistryV1}
      symbolId={missingSymbolId}
      size={24}
      accessibleName="未知资源"
    />,
  );
  expect(pocGameSymbolRegistryV1.resolve(missingSymbolId)).toEqual({
    kind: "not_found",
    code: "ui.game_symbol_not_found",
  });
  expect(screen.getByRole("img", { name: "未知资源" })).toBeVisible();
});
```

- [ ] **Step 2: Write failing market/map and exact parameterized-overlay tests**

```tsx
it("uses presentation state to show the market while purchase remains the same action", async () => {
  const fixture = renderPocSceneV1(pocMarketRuntimeViewFixtureV1());
  expect(screen.getByRole("img", { name: "市集" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "采购" }));
  expect(screen.getByRole("dialog", { name: "采购食材" })).toBeVisible();
  expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
  await choosePurchaseLinesV1([{ ingredientId: "ingredient.coarse_grain", quantity: 2 }]);
  await user.click(screen.getByRole("button", { name: "确认采购" }));
  expect(fixture.semantic.preview).toHaveBeenCalledWith(fixture.purchaseInvocation);
  expect(fixture.semantic.dispatch).toHaveBeenCalledWith(fixture.purchaseInvocation);
});

it("renders the existing old-trade-road action as a map node without selecting its option", async () => {
  const fixture = renderPocSceneV1(pocWorldMapRuntimeViewFixtureV1());
  await user.click(screen.getByRole("button", { name: "旧贸易路线" }));
  expect(screen.getByRole("dialog", { name: "旧贸易路线调查" })).toBeVisible();
  expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
  expect(screen.getByRole("radio", { name: "基础准备" })).toBeVisible();
  expect(screen.getByRole("radio", { name: "充分准备" })).toBeVisible();
});

it("dispatches the exact Story-supplied service-plan invocation", async () => {
  const fixture = renderTavernPlanOverlayV1(projectedServicePlanDescriptor);
  await selectProjectedMenuAndModeV1();
  await user.click(screen.getByRole("button", { name: "确认营业计划" }));
  expect(fixture.semantic.preview).toHaveBeenCalledWith(fixture.projectedInvocation);
  expect(fixture.semantic.dispatch).toHaveBeenCalledWith(fixture.projectedInvocation);
  expect(fixture.localGameplayCalculations()).toBe(0);
});
```

- [ ] **Step 3: Run the Story presentation suites and confirm the components are absent**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation`

Expected: FAIL because the HUD, Stage scenes, overlays, Story world-symbol providers, and contribution set do not exist.

- [ ] **Step 4: Implement code-native PoC world symbols, scenes, and the hybrid heroine**

Before importing the UI package from production `.tsx`, verify the already-authored Story importer and consume its R1 materialization without changing dependency metadata:

```bash
pnpm verify:materialization
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const story = JSON.parse(await readFile("game/stories/poc/package.json", "utf8"));
const code = "external_precondition.workspace_importer_mismatch";
assert.equal(story.dependencies?.["@sillymaker/ui"], "workspace:*", code);
assert.equal(story.dependencies?.react, "19.2.7", code);
NODE
pnpm install --offline --frozen-lockfile
```

Expected: `game/stories/poc/package.json` already contains `@sillymaker/ui: "workspace:*"` and exact `react: "19.2.7"`, the lock importer resolves them, and both files remain unchanged. A missing/mismatched importer entry fails as `external_precondition.workspace_importer_mismatch`; this is a Phase 2 contract failure, not stale R1 external-package evidence, because the materialization digest deliberately excludes workspace importer layout. This task does not run `pnpm add`.

Consume the exact `pocGameSymbolIdsV1` tuple frozen by Phase 4B. Parse those values once into role aliases and register providers separately from the seven renderer namespaces; do not author another project-ID list:

```tsx
const parsedPocGameSymbolIdsV1 = pocGameSymbolIdsV1.map((symbolId) =>
  parseGameSymbolIdV1(symbolId),
);

export const pocGameSymbolIdsByRoleV1 = Object.freeze({
  stamina: parsedPocGameSymbolIdsV1[0]!,
  mood: parsedPocGameSymbolIdsV1[1]!,
  cash: parsedPocGameSymbolIdsV1[2]!,
  reputation: parsedPocGameSymbolIdsV1[3]!,
  levy: parsedPocGameSymbolIdsV1[4]!,
  ingredient: parsedPocGameSymbolIdsV1[5]!,
  affection: parsedPocGameSymbolIdsV1[6]!,
  teamwork: parsedPocGameSymbolIdsV1[7]!,
  purchase: parsedPocGameSymbolIdsV1[8]!,
  service: parsedPocGameSymbolIdsV1[9]!,
  ledger: parsedPocGameSymbolIdsV1[10]!,
  facility: parsedPocGameSymbolIdsV1[11]!,
  coldStorage: parsedPocGameSymbolIdsV1[12]!,
  comfortableBed: parsedPocGameSymbolIdsV1[13]!,
});

export type PocGameSymbolRoleV1 = keyof typeof pocGameSymbolIdsByRoleV1;

export const pocGameSymbolProvidersV1 = Object.freeze(
  (
    Object.entries(pocGameSymbolIdsByRoleV1) as readonly (readonly [
      PocGameSymbolRoleV1,
      GameSymbolIdV1,
    ])[]
  ).map(([role, symbolId]) => createPocCodeSymbolProviderV1(symbolId, role)),
) satisfies readonly GameSymbolProviderV1[];

export const pocGameSymbolRegistryV1 = createGameSymbolRegistryV1(pocGameSymbolProvidersV1);
```

The Phase 4B Story validator remains the single assertion of the tuple's exact values and authored order; Task 9 asserts its length and provider equality before deriving only role aliases. Each provider is a small Story-owned inline-SVG/CSS component with the exact Phase 5A `GameSymbolRenderPropsV1 = { size } & ({ accessibleName; decorative?: false } | { accessibleName?: never; decorative: true })` contract and `16 | 20 | 24 | 32` size. It forwards size and accessible/decorative semantics unchanged, is noninteractive and nonfocusable, imports no Lucide component or Gameplay symbol, and owns no rule value. `GameSymbolV1` remains the only resolver and wraps unknown/thrown providers in its visible code-native fallback. HUD and Overlays resolve any named symbol label from their Story `TextId` through `PresentationReadPortV1`, then use `GameSymbolV1`; they never call providers directly.

The persistent HUD uses the Phase 5A `start/center/end` top-card slots: date/phase; one named AP counter and both stamina meters; cash/reputation/levy forecast. AP consumes only `apRemaining`; it does not invent a maximum. Detailed inventory, obligation explanations, service forecasts, facilities, ledger, relationship profile, and summary stay in primary Overlays. `PocTavernScene` keeps the background and heroine visible, mounts `InteractionSurfaceV1` over the compatible character-local rect, and renders the DOM behavior list. `PocMarketScene` and `PocWorldMapScene` are separate StageScene renderers selected by UI state; returning/closing the Overlay returns to tavern without advancing Gameplay.

The first heroine uses the frozen hybrid order from the PoC catalog (`back_hair`, `costume_body`, `face`, `front_hair`, `accessory`, `held_prop`, `foreground_effect`) only as Story-owned IDs; the generic renderer still treats them as opaque. The default runtime consumes Phase 4B's already resolved provider-or-fallback entries: owner-approved providers may render, while every missing/load-failed layer follows its registered static/code-native fallback. Source-archive concepts are never imported directly by this task.

- [ ] **Step 5: Implement Story overlays as pure descriptor/preview consumers**

Each Overlay receives a narrow view slice, the exact action descriptor, and the Story semantic port. Policy, Facility, WorldAction and Narrative controls select only finite `choices` invocations already carried by the descriptor; Facility/WorldAction selections call `preview` before dispatch, while disabled Narrative choices remain display-only in the Narrative projection and never become invokable options. Purchase and TavernPlan consume only their `form.input` catalog—including its authoritative `lineLimit`/`quantityPerLineLimit`, `recipeLimit`/`portionsPerRecipeLimit`, and ServiceMode `nameTextId`—construct the action-specific strict options object, call `preview`, render the returned player-visible result/reasons, and then pass that exact parsed invocation to `dispatch`. Numeric controls use those static maxima, but cash, capacity, preparation and ingredient feasibility still come only from Semantic preview; React does not recompute a second effective gameplay limit. A `form` descriptor never contains a fabricated empty/default invocation, and React never imports raw Story content or hard-codes schema limits to build its fields. Inventory, Ledger, Relationship, and RunSummary are read-only projections. No component calculates AP cost, cash guard, demand, revenue, relationship availability, 2D6, ending, or command payload outside the typed form/choice construction already authorized by its descriptor.

```ts
export const pocUiContributionsV1 = Object.freeze({
  contributionId: "ui.poc.presentation.v1",
  renderers: Object.freeze({
    background: pocBackgroundContributionsV1,
    character: pocCharacterContributionsV1,
    scene_interaction: pocInteractionContributionsV1,
    hud: [pocHudContributionV1],
    workspace_overlay: pocOverlayContributionsV1,
    narrative: [pocNarrativeContributionV1],
    system: [pocSystemContributionV1],
  }),
}) satisfies UiContributionSetV1<PocRendererContextsV1>;
```

Tests require every renderer ID referenced by the frozen SceneGraph/runtime projector to have exactly one contribution and reject an unknown/duplicate ID before render. Components import no GameplayModule, owner, executor, query factory, rules, raw State, persistence, capabilities, or DebugTools.

- [ ] **Step 6: Keep Story asset slots exact, unrestricted, and fallback-complete**

Phase 4B `presentation/assets.ts` and the closed IDs in `content/ids.ts` remain the only PoC slot authority; this task does not create a second slots/packs catalog. The predecessor-approved pack is already merged into `resolvedGame.assets` and is consumed as data, not re-read from source directories. `GameSymbolIdV1` values and their code-native providers are not `AssetId` values and never enter `requiredAssetIds` or asset preload. Scene/character/Overlay render tests resolve every required zero-mask Asset ID from `resolvedGame.assets`; include both the default approved-pack fixture and an injected empty-pack fixture proving full fallback operation. The Phase 5A asset validator must show no read of `art-source/aigc/**` or `references/**`, no remote URL, no provider with nonzero required flags, and no transparent interactive element after fallback.

Resolve every HUD/Overlay/symbol label from the corrected complete Phase 4B `zh-CN` Story catalog through `PresentationReadPortV1`, and fail the Story presentation test if any required `TextId` is absent. If a later required label is still absent, stop and correct that upstream contract explicitly rather than embedding a raw fallback string in `.tsx`. Task 9 does not add a second localization dictionary or mutate Text ID/catalog authority from React; `.tsx` files contain rendered-text expectations only.

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/presentation && pnpm verify:assets && pnpm lint:styles && pnpm verify:stories && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; the complete PoC Story UI remains projection-only, renders any already-approved resolved providers, and is still fully playable through code-native/static fallbacks when the pack is empty or a load fails.

- [ ] **Step 7: Commit the PoC Story presentation**

```bash
git add -- game/stories/poc/src/presentation/hud game/stories/poc/src/presentation/scenes game/stories/poc/src/presentation/overlays game/stories/poc/src/presentation/symbols game/stories/poc/src/presentation/ui-contributions.tsx game/stories/poc/src/presentation/ui-contributions.test.tsx game/stories/poc/tsconfig.application.json
git diff --cached --check
git commit -m "feat(story-poc): add tavern stage presentation"
```

### Task 10: Compose Exactly Two Story-Owned Web Application Roots

**Files:**

- Create: `engine/packages/web/src/routing/hash-router.ts`
- Create: `engine/packages/web/src/routing/hash-router.test.ts`
- Create: `engine/packages/web/src/routing/index.ts`
- Modify: `engine/packages/web/src/index.ts`
- Create: `game/stories/e2e/src/application/create-e2e-presentation-runtime.ts`
- Create: `game/stories/e2e/src/application/create-e2e-presentation-runtime.test.ts`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.test.tsx`
- Modify: `game/stories/e2e/src/application/entry.tsx`
- Modify: `game/stories/e2e/index.html`
- Modify: `game/stories/e2e/tsconfig.application.json`
- Create: `game/stories/poc/src/application/create-poc-presentation-runtime.ts`
- Create: `game/stories/poc/src/application/create-poc-presentation-runtime.test.ts`
- Create: `game/stories/poc/src/application/poc-application-root.tsx`
- Create: `game/stories/poc/src/application/poc-application-root.test.tsx`
- Create: `game/stories/poc/src/application/entry.tsx`
- Create: `game/stories/poc/index.html`
- Modify: `game/stories/poc/tsconfig.application.json`
- Modify: `vite.config.ts`
- Modify: root `package.json`
- Test: affected Story application and Web routing suites.

**Interfaces:**

- Consumes: each Story's existing `StoryEntry`, resolved Game/SceneGraph/Presentation/Asset catalogs, Phase 3 unified Game runtime/application ports, Story SemanticGamePort, Tasks 1–9 preference/store/projectors/contributions and the PoC world-symbol registry, Phase 5A Shell/Input/Asset/Web Pointer APIs, and generic `mountGameApplicationV1`.
- Produces: `createE2ePresentationRuntimeV1`, `E2eApplicationRootV1`, the typed single-Session specialization `createPocGameApplicationV1`/`PocGameApplicationPortV1`, `createPocPresentationRuntimeV1`, `PocApplicationRootV1`, application IDs `e2e-web`/`poc-web`, the two build roots, provisional `build:poc` beside the existing `build:e2e`, and `createHashRouterV1`. Phase 6 later replaces both direct Vite scripts with the closed release builder while preserving their public names.

- [ ] **Step 1: Write failing one-resolution/one-session/one-store composition tests**

```ts
it("composes the E2E Web presentation over its existing single game runtime", async () => {
  const fixture = await createE2ePresentationRuntimeFixtureV1();
  expect(fixture.resolveCalls()).toBe(1);
  expect(fixture.gameSessionCreations()).toBe(1);
  expect(fixture.semanticBridgeCreations()).toBe(1);
  expect(fixture.presentationStoreCreations()).toBe(1);
  expect(fixture.presentationUiStateStoreCreations()).toBe(1);
  expect(fixture.runtime.resolvedGame.sceneGraph).toBe(fixture.resolvedSceneGraph);
  expect(fixture.runtime.application.semantic).toBe(fixture.semanticPort);
  for (const descriptor of [
    ...e2eContentMaturityPolicyV1.flags,
    ...e2eContentMaturityPolicyV1.presets,
  ]) {
    expect(fixture.runtime.presentationRead.text(descriptor.nameTextId).text.trim()).not.toBe("");
    expect(
      fixture.runtime.presentationRead.text(descriptor.descriptionTextId).text.trim(),
    ).not.toBe("");
  }
});

it("composes the PoC Web presentation without a second Gameplay view source", async () => {
  const fixture = await createPocPresentationRuntimeFixtureV1();
  expect(fixture.resolveCalls()).toBe(1);
  expect(fixture.gameSessionCreations()).toBe(1);
  expect(fixture.runtime.presentation.getSnapshot().semantic).toBe(
    fixture.runtime.application.semantic.observe(),
  );
  expect(fixture.gameQueryFactoriesOutsideSemantic()).toBe(0);
  expect(fixture.runtime.contentPreference.observe()).toEqual({ allowedFlags: 0 });
  expect(fixture.runtime.gameSymbols).toBe(pocGameSymbolRegistryV1);
  for (const symbolId of pocGameSymbolIdsV1) {
    expect(fixture.runtime.gameSymbols.resolve(parseGameSymbolIdV1(symbolId)).kind).toBe("found");
  }
});

it("reprojects an Overlay route without replacing authoritative runtime objects", async () => {
  const fixture = await createPocPresentationRuntimeFixtureV1();
  const session = fixture.gameSession;
  const simulation = fixture.resolvedGame.gameSimulation;
  const semanticRevision = fixture.runtime.application.semantic.observe().revision;
  fixture.runtime.intents.execute({ kind: "overlay.open", overlayId: "overlay.poc.purchase" });
  expect(fixture.runtime.presentation.getSnapshot().view.stage.stageSceneId).toBe(
    "stage_scene.poc.market",
  );
  expect(fixture.gameSession).toBe(session);
  expect(fixture.resolvedGame.gameSimulation).toBe(simulation);
  expect(fixture.runtime.application.semantic.observe().revision).toBe(semanticRevision);
});

it.each(["e2e-web", "poc-web"] as const)(
  "mounts one always-reachable Settings surface in %s",
  async (applicationId) => {
    const fixture = await createPresentationRuntimeFixtureV1(applicationId);
    render(fixture.root);
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    expect(fixture.gameSession).toBe(fixture.initialGameSession);
    expect(fixture.semanticRevision()).toBe(fixture.initialSemanticRevision);
  },
);
```

- [ ] **Step 2: Write failing root, route, cleanup, and Story-neutral Web tests**

```tsx
it.each([
  ["poc-web", "Project Tavern 七日原型"],
  ["e2e-web", "SillyMaker 引擎测试"],
] as const)("renders one %s application root", async (applicationId, name) => {
  renderStoryApplicationRootV1(applicationId);
  expect(screen.getByRole("application", { name })).toHaveAttribute(
    "data-application-id",
    applicationId,
  );
  expect(screen.getAllByRole("application")).toHaveLength(1);
});

it.each([
  ["poc-web", "project-tavern.runtime"],
  ["e2e-web", "project-tavern.e2e.runtime"],
] as const)("isolates %s host records in %s", async (applicationId, databaseName) => {
  const fixture = await createPresentationRuntimeFixtureV1(applicationId);
  expect(fixture.hostDatabaseName()).toBe(databaseName);
});

it("recovers unknown hashes to the main menu and preserves nested asset bases", () => {
  const router = createHashRouterV1({ location: nestedBaseLocationV1("#/unknown") });
  expect(router.observe()).toEqual({ route: "main_menu", hash: "#/" });
  expect(nestedBaseLocationV1("#/unknown").pathname).toBe("/project-tavern/preview/");
});

it("disposes Pointer, router, asset preload, bridge, and presentation subscriptions", async () => {
  const fixture = await createPocPresentationRuntimeFixtureV1();
  fixture.runtime.dispose();
  fixture.runtime.dispose();
  expect(fixture.disposalCounts()).toEqual({
    pointer: 1,
    router: 1,
    preload: 1,
    semanticBridge: 1,
    presentationStore: 1,
  });
});

it("keeps generic Web source free of Story imports", async () => {
  expect(await collectProductionImportsV1("engine/packages/web/src")).not.toMatch(
    /stories\/(poc|e2e)|@project-tavern\/story-/u,
  );
});
```

- [ ] **Step 3: Run application/routing tests and confirm the roots are incomplete**

Run: `pnpm --filter @sillymaker/web exec vitest run src/routing && pnpm --filter @project-tavern/story-e2e exec vitest run src/application && pnpm --filter @project-tavern/story-poc exec vitest run src/application`

Expected: FAIL because the hash adapter, presentation runtime compositions, PoC application root, `poc-web` Vite mapping, and `build:poc` script do not exist.

- [ ] **Step 4: Implement one presentation composition per existing Story game runtime**

Each factory performs this sequence once:

```text
resolve StoryEntry once
→ create existing unified game runtime/GameSession once
→ create Story-scoped ContentPreferencePort once
→ create Phase 5A SemanticPublicationBridge once
→ create one Story PresentationUiState store and its narrow route/Overlay/Interaction/cue lenses once
→ create RuntimePresentationStore with the Story projector once
→ create exact-demand AssetRegistry preload subscription once
→ create InputRouter and Web Pointer Adapter once
→ freeze the Story presentation runtime and render its root
```

```ts
export interface PocPresentationRuntimeV1 {
  readonly applicationId: "poc-web";
  readonly resolvedGame: PocResolvedGameV1;
  readonly application: PocGameApplicationPortV1;
  readonly contentPreference: ContentPreferencePortV1;
  readonly uiState: ReadonlyViewSourceV1<PocPresentationUiStateV1>;
  readonly presentation: RuntimePresentationStoreV1<PocRuntimePresentationPublicationV1>;
  readonly intents: PresentationIntentRouterV1;
  readonly input: InputRouterV1;
  readonly assets: AssetRegistryV1;
  readonly presentationRead: PresentationReadPortV1;
  readonly contributions: UiContributionRegistryV1;
  readonly gameSymbols: GameSymbolRegistryV1;
  dispose(): void;
}
```

Task 10 also implements one typed `createPocGameApplicationV1` specialization over the existing unified application factory and exports `type PocGameApplicationPortV1 = ReturnType<typeof createPocGameApplicationV1>`. The function resolves nothing, creates no second Session, and has an explicit return-type test proving its `semantic` member is exactly `PocSemanticGamePortV1`; the presentation runtime simply stores that one returned application.

`createE2ePresentationRuntimeV1` has the corresponding E2E types and `applicationId: "e2e-web"`. Both factories subscribe to `RuntimePresentationPublicationV1.requiredAssetIds`, cancel only the prior caller's wait/subscription, and start awaiting the new exact ordered list. Phase 5A's shared registry fetch/decode continues until registry `dispose()`; one view transition never aborts shared work needed by another caller. A load failure leaves the committed view/session intact and lets the registered fallback render. Neither factory adds content preference to `GameApplicationPortV1`, exposes a Snapshot setter, or creates another Semantic/GameView cache.

The PoC composition passes `project-tavern.runtime` to `createWebHostV1`; the E2E composition retains Phase 3's isolated `project-tavern.e2e.runtime`. Neither Story may derive a database name from `StoryId`, the SillyMaker package scope, or a renderer route at runtime.

- [ ] **Step 5: Render the seven fixed layers from one cached publication**

Each root calls `useRuntimePresentationV1` once and derives the seven `GameStageLayersV1` React nodes from that one publication. Renderer contributions receive narrow view slices, the same `runtime.application.semantic`, `PresentationReadPortV1`, and—only for interaction contributions—the narrow controller. The PoC factory also exposes its one immutable Story-owned `GameSymbolRegistryV1` to PoC HUD/Overlay renderers; it is neither inserted into `UiContributionRegistryV1` nor added to the runtime publication. The roots do not define inline component types, do not project in render/effects, and do not pass the full application port into a Story renderer. Independent preload/preference initialization begins in parallel before the first non-loading application render; no serial asset waterfall is introduced.

Both roots mount the Phase 5A `SettingsLauncherV1` in the always-reachable System layer and route it to exactly one `SettingsDialogV1`; this is production composition, not a browser-test fixture. The E2E dialog renders `E2eSettingsSectionV1`, two neutral independent flag checkboxes and Story preset controls backed by `ContentPreferencePortV1` for mechanism testing. It follows Task 7's exact `data-content-flag-id`/`data-content-preset-id`, native checkbox/button, pending/result and subscription contract. Visible names and descriptions come only from `presentationRead.text(descriptor.nameTextId/descriptionTextId)`. A checkbox update uses Base `setContentMaturityFlagV1`, while preset selection looks up the frozen branded Story descriptor and sets its `allowedFlags`; neither path casts arbitrary DOM text/number into a branded mask. The PoC dialog supplies no content filter controls because its flag/preset catalogs are empty; it resolves Phase 4B's frozen `pocNoContentFilterOptionsTextIdV1` through `PresentationReadPortV1` and renders that truthful Story-localized empty-settings text. Opening/closing either Settings dialog changes only System UI session state, leaves a blocking Narrative mounted underneath, and never changes Semantic revision or Gameplay. Neither root imports Story tooling, DevDock, capability session overrides, Automation Bridge, HMR adapter, or Phase 5C browser globals.

- [ ] **Step 6: Implement the closed hash router and exactly two Vite roots**

`createHashRouterV1` supports only `#/` → `main_menu` and `#/play` → `play`; unknown or malformed hashes replace to `#/` without touching `location.pathname` or the configured Vite base. Back/forward/hashchange updates the UI state source; disposal removes one listener. It is generic and contains no Story IDs.

Phase 5A already gave E2E its direct UI dependency, and Task 9 verified PoC's direct UI dependency before either new import. Verify the already-authored Web composition edges now:

```bash
pnpm verify:materialization
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
for (const path of ["game/stories/e2e/package.json", "game/stories/poc/package.json"]) {
  const story = JSON.parse(await readFile(path, "utf8"));
  const message = `external_precondition.workspace_importer_mismatch:${path}`;
  assert.equal(story.dependencies?.["@sillymaker/web"], "workspace:*", message);
  assert.equal(story.dependencies?.react, "19.2.7", message);
}
NODE
pnpm install --offline --frozen-lockfile
```

Expected: both Story manifests already contain `@sillymaker/web: "workspace:*"`, their lock importers resolve the exact workspace edge, and the command changes neither manifests nor lockfile. A missing/mismatched importer edge is `external_precondition.workspace_importer_mismatch`, owned by Phase 2 rather than materialization; this task does not repair it with `pnpm add`. Keep exact direct React dependencies at both Story packages. Extend `vite.config.ts` from Phase 2's single `e2e-web → game/stories/e2e/index.html → dist/e2e` mapping to the exact closed pair by adding `poc-web → game/stories/poc/index.html → dist/poc`. Preserve Phase 2's `"build:e2e": "vite build --mode e2e-web"` and introduce `"build:poc": "vite build --mode poc-web"`; no other Story/Host tuple or compatibility alias is allowed. Phase 6 replaces these two implementations with its unified builder without renaming the scripts. Every HTML entry passes an explicit StoryEntry/runtime composition to generic `mountGameApplicationV1`; `engine/packages/web` imports neither Story.

- [ ] **Step 7: Run Story roots, builds, and closure verification**

Run: `pnpm --filter @sillymaker/web exec vitest run src/routing src/preferences && pnpm --filter @project-tavern/story-e2e exec vitest run src/application src/presentation && pnpm --filter @project-tavern/story-poc exec vitest run src/application src/presentation && pnpm build:e2e && pnpm build:poc && pnpm verify:bundle && pnpm verify:stories && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck && pnpm verify`

Expected: PASS; exactly two roots build, both reuse one Session/publication pipeline, and default Story/Headless closures remain browser-free.

- [ ] **Step 8: Commit the two Story application roots**

```bash
git add -- engine/packages/web/src/routing engine/packages/web/src/index.ts game/stories/e2e/src/application game/stories/e2e/index.html game/stories/e2e/tsconfig.application.json game/stories/poc/src/application game/stories/poc/index.html game/stories/poc/tsconfig.application.json vite.config.ts package.json
git diff --cached --check
git commit -m "feat(game): compose stage presentation roots"
```

### Task 11: Prove Interaction Keyboard, Touch, Focus, and Accessible DOM in Real Browsers

**Files:**

- Create: `scripts/ui/serve-story-roots.mts`
- Create: `scripts/ui/serve-story-roots.test.ts`
- Create: `engine/packages/web/playwright.interaction.config.ts`
- Create: `engine/packages/web/e2e/interaction/e2e-interaction.spec.ts`
- Create: `engine/packages/web/e2e/interaction/poc-stage.spec.ts`
- Create: `engine/packages/web/e2e/interaction/interaction-accessibility.spec.ts`
- Create: `engine/packages/web/e2e/interaction/interaction-input.spec.ts`
- Modify: root `package.json`
- Test: the four Playwright specs and static-server unit test.

**Interfaces:**

- Consumes: prebuilt `dist/e2e` and `dist/poc`, the two application IDs, visible Semantic revision/status in the neutral fixture, named DOM controls and Interaction parity markers, and real mouse/touch/keyboard browser input.
- Produces: loopback-only `createStoryRootServerV1`, Chromium desktop/touch projects, and public `pnpm test:e2e:interaction`.

- [ ] **Step 1: Write the failing bounded-server and two-target tests**

```ts
it("serves exactly the two prebuilt Story roots on loopback", async () => {
  const fixture = await createStoryRootServerFixtureV1();
  expect(fixture.targets).toEqual({
    e2e: { applicationId: "e2e-web", root: "dist/e2e" },
    poc: { applicationId: "poc-web", root: "dist/poc" },
  });
  expect(fixture.bindAddress).toBe("127.0.0.1");
});

it.each([
  ["../dist/poc", "ui_server.path_traversal"],
  ["dist/missing", "ui_server.root_missing"],
  ["https://example.test", "ui_server.non_loopback"],
] as const)("rejects %s with %s", async (input, code) => {
  await expect(startInvalidStoryRootServerV1(input)).rejects.toMatchObject({ code });
});
```

- [ ] **Step 2: Run the server test and confirm the browser harness is absent**

Run: `pnpm exec vitest run scripts/ui/serve-story-roots.test.ts`

Expected: FAIL because the prebuilt two-root server and interaction Playwright config do not exist.

- [ ] **Step 3: Implement the prebuilt desktop/touch topology**

`createStoryRootServerV1` serves existing bytes only, rejects traversal/symlinks/missing roots, assigns distinct test ports, binds loopback, and never builds or writes. `playwright.interaction.config.ts` defines exactly:

```ts
projects: [
  {
    name: "chromium",
    use: { browserName: "chromium", viewport: { width: 1024, height: 768 } },
  },
  {
    name: "chromium-touch",
    use: {
      browserName: "chromium",
      viewport: { width: 1024, height: 768 },
      hasTouch: true,
      isMobile: false,
    },
  },
];
```

The default desktop viewport is 1024×768; targeted portrait tests use 768×1024. WebKit, Firefox, 1600×1000, 2560×1080, equivalent 200% zoom, full reduced-motion, axe, and visual regression remain additive Phase 5C coverage.

- [ ] **Step 4: Add real pointer and native keyboard convergence tests**

```ts
test("mouse, touch, Enter, and Space each commit one increment", async ({ page }, testInfo) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  if (testInfo.project.name === "chromium-touch") {
    await page.getByTestId("spatial-increment-target").tap();
  } else {
    await page.getByTestId("spatial-increment-target").click();
  }
  await expectVisibleSemanticRevisionV1(page, before + 1);

  const semanticButton = page.getByRole("button", { name: "增加计数" });
  await semanticButton.focus();
  await page.keyboard.press("Enter");
  await expectVisibleSemanticRevisionV1(page, before + 2);

  await page.keyboard.press("Space");
  await expectVisibleSemanticRevisionV1(page, before + 3);
});

test("opening Interaction blocks the ordinary Stage and restores focus on Escape", async ({
  page,
}) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const entry = page.getByRole("button", { name: "与测试计数器互动" });
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toBeVisible();
  await expect(page.getByRole("button", { name: "推进流程" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(entry).toBeFocused();
});

test("blocking Narrative keeps Save, Settings, and diagnostics reachable", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  await openBlockingNarrativeFixtureV1(page);
  await expect(page.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "设置" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "导出调试包" })).toBeEnabled();

  await page.getByRole("button", { name: "设置" }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
});
```

Add these no-through/cleanup/deduplication cases; none sleeps or clicks by coordinates:

```ts
test("pointer cancel and focus loss leave no open transient interaction", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  await page.getByRole("button", { name: "与测试计数器互动" }).click();
  await page.dispatchEvent("[data-testid=spatial-increment-target]", "pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
  });
  await page.evaluate(() => globalThis.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toBeHidden();
});

test("Stage replacement closes Interaction without a Gameplay revision", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  await page.getByRole("button", { name: "与测试计数器互动" }).click();
  const before = await visibleSemanticRevisionV1(page);
  await page.getByRole("button", { name: "切换测试表现" }).click();
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toBeHidden();
  expect(await visibleSemanticRevisionV1(page)).toBe(before);
});

test("an active Overlay consumes confirm without Stage dispatch", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  await page.getByRole("button", { name: "打开测试面板" }).click();
  const before = await visibleSemanticRevisionV1(page);
  await page.keyboard.press("Enter");
  expect(await visibleSemanticRevisionV1(page)).toBe(before);
});

test("one native click remains one dispatch after pointer events", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  await page.getByRole("button", { name: "增加计数" }).click();
  await expectVisibleSemanticRevisionV1(page, before + 1);
});
```

- [ ] **Step 5: Add accessible fallback, target-size, content preference, and PoC stage tests**

Use role/name as primary locators and add the following assertions:

- every visible enabled interaction control has a bounding box at least 44×44 CSS px;
- target/behavior names, disabled state, and authored reason text are exposed without hover or color;
- `data-interaction-surface-id`, `data-interaction-target-id`, and `data-semantic-action-id` agree on the DOM parity witness;
- the E2E independent alpha/beta switches and Story preset change only the matching cues/background assets and leave the increment control's enabled state and visible Semantic revision unchanged;
- failed character/background assets remove spatial ghost hotspots while the named DOM behavior remains usable;
- at 1024×768 and 768×1024 the Stage, heroine/guide entry, behavior list, close control, and focused element remain in the viewport;
- the PoC opens on the tavern Idle stage with the top-card HUD; opening Purchase shows `stage_scene.poc.market`; closing returns to tavern; the empty-flag root exposes no content-filter setting;
- the WorldAction and heroine relationship mappings are covered by Story projector/component tests and remain named DOM controls when their existing descriptors are published.

```ts
test("exposes named 44px controls and parity markers without hover", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  await page.getByRole("button", { name: "与测试计数器互动" }).click();
  const control = page.getByRole("button", { name: "增加计数" });
  const box = await control.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await expect(control).toHaveAttribute("data-interaction-surface-id", "surface.e2e.counter");
  await expect(control).toHaveAttribute("data-interaction-target-id", "target.e2e.counter.figure");
  await expect(control).toHaveAttribute("data-semantic-action-id", "action.e2e.increment");
  await expect(page.getByText("当前流程不可用")).toBeVisible();
});

test("switches independent neutral presentation flags without changing Gameplay", async ({
  page,
}) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const increment = page.getByRole("button", { name: "增加计数" });
  const enabled = await increment.isEnabled();
  const alpha = page.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
  await expect(alpha).toHaveRole("checkbox");
  await alpha.check();
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.alpha"]')).toBeVisible();
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.beta"]')).toHaveCount(0);
  expect(await increment.isEnabled()).toBe(enabled);
  expect(await visibleSemanticRevisionV1(page)).toBe(before);
});

test("applies the branded stream-safe preset through the stable DOM contract", async ({ page }) => {
  await page.goto(`${e2eWebUrl}/#/play`);
  const alpha = page.locator('[data-content-flag-id="content_flag.e2e.alpha"]');
  const beta = page.locator('[data-content-flag-id="content_flag.e2e.beta"]');
  await alpha.check();
  await beta.check();
  const preset = page.locator('[data-content-preset-id="content_preset.e2e.stream_safe"]');
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(alpha).not.toBeChecked();
  await expect(beta).toBeChecked();
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.alpha"]')).toHaveCount(0);
  await expect(page.locator('[data-content-cue-id="cue.e2e.counter.beta"]')).toBeVisible();
});

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
]) {
  test(`keeps Interaction operable at ${viewport.width} x ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${pocWebUrl}/#/play`);
    await expect(page.getByRole("main", { name: "游戏舞台" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "与女主互动" })).toBeInViewport();
  });
}
```

- [ ] **Step 6: Run both browser projects and the full current verification**

Add root script:

```json
{
  "scripts": {
    "test:e2e:interaction": "playwright test --config engine/packages/web/playwright.interaction.config.ts"
  }
}
```

Run: `pnpm build:e2e && pnpm build:poc && pnpm test:e2e:interaction -- --project=chromium && pnpm test:e2e:interaction -- --project=chromium-touch && pnpm verify:semantic && pnpm verify`

Expected: PASS with no skip; mouse/touch/keyboard use the same semantic outcomes, Presentation-only behavior leaves the revision unchanged, and both Story roots remain accessible with fallbacks.

- [ ] **Step 7: Commit the basic Interaction browser acceptance**

```bash
git add -- scripts/ui/serve-story-roots.mts scripts/ui/serve-story-roots.test.ts engine/packages/web/playwright.interaction.config.ts engine/packages/web/e2e/interaction package.json
git diff --cached --check
git commit -m "test(ui): prove accessible stage interaction"
```

### Task 12: Freeze the Read-Only Phase 5B Verification Gate

**Files:**

- Create: `scripts/ui/verify-stage-presentation.mts`
- Create: `scripts/ui/verify-stage-presentation.test.ts`
- Modify: root `package.json`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Test: `scripts/ui/verify-stage-presentation.test.ts`

**Interfaces:**

- Consumes: cumulative `verify:phase5a`, UI/Web/Story unit suites, both builds, `test:e2e:interaction`, Story/asset/boundary/cycle/type checks, and the root verifier structure.
- Produces: leaf `pnpm verify:story-presentation`, cumulative `pnpm verify:phase5b = pnpm verify:phase5a && pnpm verify:story-presentation`, and one exact root Phase 5B child.

- [ ] **Step 1: Write the failing exact leaf-command and root-replacement tests**

```ts
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("owns the read-only Stage/Story presentation leaf", async () => {
  const { stagePresentationVerificationCommandsV1 } =
    await import("./verify-stage-presentation.mts");
  expect(stagePresentationVerificationCommandsV1).toEqual([
    [
      "pnpm",
      [
        "--filter",
        "@sillymaker/ui",
        "exec",
        "vitest",
        "run",
        "src/runtime/runtime-presentation-store.test.ts",
        "src/stage",
        "src/characters",
        "src/interaction",
      ],
    ],
    [
      "pnpm",
      ["--filter", "@sillymaker/web", "exec", "vitest", "run", "src/preferences", "src/routing"],
    ],
    [
      "pnpm",
      [
        "--filter",
        "@project-tavern/story-e2e",
        "exec",
        "vitest",
        "run",
        "src/presentation",
        "src/application",
      ],
    ],
    [
      "pnpm",
      [
        "--filter",
        "@project-tavern/story-poc",
        "exec",
        "vitest",
        "run",
        "src/presentation",
        "src/application",
      ],
    ],
    ["pnpm", ["build:e2e"]],
    ["pnpm", ["build:poc"]],
    ["pnpm", ["test:e2e:interaction"]],
    ["pnpm", ["verify:stories"]],
    ["pnpm", ["verify:assets"]],
    ["pnpm", ["verify:boundaries"]],
    ["pnpm", ["verify:cycles"]],
    ["pnpm", ["typecheck"]],
  ]);
  expect(JSON.stringify(stagePresentationVerificationCommandsV1)).not.toMatch(/update|regenerate/u);
});

test("maps the cumulative phase exactly once", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );
  expect(packageJson.scripts["verify:phase5b"]).toBe(
    "pnpm verify:phase5a && pnpm verify:story-presentation",
  );
});

test("replaces the Phase 5A root child with one Phase 5B child", async () => {
  const { coreVerificationCommandsV1 } = await import("../verify.mjs");
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  expect(names.filter((name) => name === "verify:phase5b")).toHaveLength(1);
  expect(names).not.toContain("verify:phase5a");
  expect(names).not.toContain("verify:phase4");
  expect(names.filter((name) => name === "verify:semantic")).toHaveLength(1);
});
```

- [ ] **Step 2: Run the structural test and confirm the gate is absent**

Run: `pnpm exec vitest run scripts/ui/verify-stage-presentation.test.ts`

Expected: FAIL because the Stage presentation verifier and Phase 5B scripts do not exist.

- [ ] **Step 3: Implement the sequential fail-fast leaf and cumulative mapping**

Export and deeply freeze the exact command list above, spawn each command with inherited stdio in authored order, and stop on the first nonzero/signal result. Add:

```json
{
  "scripts": {
    "verify:story-presentation": "node --experimental-strip-types scripts/ui/verify-stage-presentation.mts",
    "verify:phase5b": "pnpm verify:phase5a && pnpm verify:story-presentation"
  }
}
```

Keep Phase 5A `verify:ui` unchanged as its inspect-only package/asset/input/style leaf; do not add builds/browser checks to it and do not call it again from `verify:story-presentation`, because `verify:phase5a` already owns it. In `scripts/verify.mjs`, replace the one direct `verify:phase5a` child with one `verify:phase5b` child. Preserve the separate direct root `verify:semantic` child for later Phase 5C DOM/Automation parity extension. Reject recursive `pnpm verify`, writers, fixture updates, duplicated phase/UI/semantic children, and browser execution before both builds.

- [ ] **Step 4: Run the cumulative gate twice and prove verification is read-only**

Run:

```bash
pnpm verify:materialization
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:story-presentation
pnpm verify:phase5b
pnpm verify
pnpm verify:phase5b
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
git diff --check
git status --short --branch
```

Expected: the leaf, cumulative Phase 5B, and full root gates pass; a second cumulative run passes; every tracked byte is unchanged; only the intended implementation-plan changes are present before the gate commit.

- [ ] **Step 5: Commit only the Phase 5B verification gate**

```bash
git add -- scripts/ui/verify-stage-presentation.mts scripts/ui/verify-stage-presentation.test.ts package.json scripts/verify.mjs scripts/verify.test.mjs
git diff --cached --check
git commit -m "test(ui): add phase five stage gate"
```

## Phase 5B Acceptance

- [ ] `RuntimePresentationStoreV1` is the only presentation join and atomically publishes one cached immutable `RuntimePresentationPublicationV1` from the exact current Semantic publication, resolved catalog, content preference, and UI session state.
- [ ] Each Story owns one immutable Presentation UI-state source; route, Overlay, Interaction, and cue controllers are narrow lenses over it rather than independent state authorities.
- [ ] `RuntimePresentationPublicationV1.semantic` retains the same `SemanticPublicationV1` reference used by the projector; GameView, NarrativeView, and action catalog cannot be mixed across authoritative revisions, and status/preference/UI changes never invent a Semantic revision.
- [ ] Story Web projectors cannot receive GameQueries, Snapshot, RunIntegrity, RNG, command sequence, owner ports, persistence, capabilities, DebugTools, or arbitrary readers, and renderer contributions receive only narrow view/semantic/presentation/interaction inputs.
- [ ] Runtime Stage/Character/Interaction views retain validated `TextId` values; projectors receive no locale/text service, and only final renderers resolve player-visible strings through `PresentationReadPortV1.text()`.
- [ ] StageScene and StageSceneVariant catalogs remain frozen Strict JSON in ResolvedGame. Runtime variant/route/Overlay switching does not recreate GameSession/GameSimulation, advance RNG/commandSequence, or change Artifact identity; presentation catalog changes do not change simulation identity.
- [ ] Exact fixtures prove static policy revision/preset and variant/behavior `requiredFlags` changes alter presentation/application identity but not state-contract/simulation identity; changing only the Host `allowedFlags` preference alters one Presentation publication revision and no resolved/Semantic identity.
- [ ] The E2E fixture selects `stage_variant.e2e.main.default/active` from a non-Calendar GameView field. The PoC projector uses only existing `hud.day`/`hud.phase`, the same publication action catalog, and application UI state; it adds no Stage/asset/screen field to `PocGameViewV1`.
- [ ] Static and hybrid paper-doll renderers share stable Character/rig/pose/target IDs; changing appearance preserves the default HitMap, authored pose override may change it, and the fake Live2D adapter contract passes without a production SDK dependency.
- [ ] Background, character, and cue failures follow registered independent fallback chains. Incompatible character fallback and missing/transparent background disable spatial ghost hotspots while preserving named DOM actions.
- [ ] Stage, static-character, paper-doll layer, and static-fallback assets all consume `usePresentationAssetV1`; deferred transition loads replace code-native fallback after readiness publication without a new Gameplay/RuntimePresentation view.
- [ ] Rect, circle, and bounded polygon hit tests include stable boundaries; higher priority wins and authored order breaks ties without mutating the frozen descriptor.
- [ ] Startup catalog validation rejects duplicate IDs, invalid shapes, missing references, and all `open_surface` cycles before Session creation. Runtime zero/multiple direct defaults, short choose sets, missing open surfaces, and invalid joins report bounded faults, disable the bad spatial surface, and preserve the safe accessible fallback.
- [ ] All seven entry/resolution paths from the design spec pass. One disabled direct behavior remains valid and shows the exact current Semantic disabled reasons.
- [ ] Pointer activation, native keyboard activation, the visible behavior list, direct Semantic tests, and later Automation all use the same current descriptor/invocation. Phase 5B desktop/touch browser tests prove mouse, touch, Enter, and Space behavior without coordinate scripts or sleeps.
- [ ] A physical mouse/touch/pen operation activates once. Native buttons are not double handled. System/Overlay/Narrative/Interaction/Gameplay priority does not leak, and cancel/focus loss/StageScene replacement clears temporary interaction state with focus restoration.
- [ ] Presentation-only profile/cue/enter/leave intents do not advance commandSequence, alter Snapshot/RNG/RunIntegrity, or enter CommandLog/Replay. Gameplay dispatch waits for the committed result before projecting reaction.
- [ ] Gameplay CommandLog entries remain the executor's exact Story Commands and contain no coordinates, device/DOM, surface/target/behavior, renderer, or content-preference data. Replay continues to replay commands, not HitMap/Semantic/Presentation operations.
- [ ] `ContentPreferencePortV1` persists as one Story-scoped Host settings record with strict exact-object runtime parsing, distinct malformed/unknown rejection, the full invalid-record recovery table, deterministic default, CAS behavior, legal bit-31/mixed-mask canonical round-trip, and no Runtime Capability, Save, Snapshot, Gameplay, Semantic revision, Replay, or identity effect.
- [ ] The PoC registers no restricted flag/preset and every requirement is zero. The neutral E2E two-flag fixture proves `0/A/B/A|B`, Story preset application, preference persistence, exact asset filtering, runtime switching, and zero-mask Gameplay parity without importing PoC/adult semantics. Its stable checkbox/preset DOM contract covers check/uncheck, `base`/`stream_safe`/`all`, pending/failure rollback and cue witnesses without raw numeric selection.
- [ ] `RuntimePresentationPublicationV1.requiredAssetIds` is the exact allowed/needed first-use list; filtered resources are never preloaded, group preload is absent, and both Stories have complete code-native fallbacks with no AIGC/reference read.
- [ ] Phase 5B consumes the fourteen Phase 4B `symbol.poc.*` IDs unchanged, registers one Story-owned code-native provider for each, and renders named/decorative 16/20/24/32 px symbols plus visible failure fallback through the separate Phase 5A `GameSymbol` registry. No PoC symbol ID enters Base/UI, a renderer namespace, `AssetId`, preload, Gameplay, or `RuntimePresentationPublicationV1`.
- [ ] The PoC opens on a compact top-card HUD over the tavern Idle scene, retains the heroine and lightweight actions, projects Purchase as a market appearance, projects the existing WorldAction as a world-map node, and maps profile/repair/apology/service-plan/purchase/old-trade-road behavior without adding location or touch Gameplay.
- [ ] The PoC heroine has only `target.poc.heroine.figure`; no body-part target, daily touch reward, repeat counter, persistent outfit, nonzero content requirement, or new relationship rule enters the revision.
- [ ] Parameterized service-plan/purchase controls open a Story Overlay, retain the exact `form` descriptor and bounded Query input catalog, construct only declared typed options, use Semantic preview, and dispatch the exact invocation. WorldAction retains its finite `choices` descriptor. None submits an empty/default command merely because a spatial target was activated, and no Overlay imports raw Story content or reads Gameplay State.
- [ ] E2E remains neutral and imports no PoC code/IDs. Base/UI/Web remain Story-neutral and MIT; Story application/presentation code remains in the correct PolyForm/CC scope.
- [ ] There are exactly two Story-owned application roots/IDs and build outputs: `e2e-web → dist/e2e` and `poc-web → dist/poc`. Both resolve once, create one Session, one Semantic bridge, one presentation store, one input router, and one disposal tree.
- [ ] Default Story/Headless closures remain Node type-strip-safe and cannot reach Web projectors, `.tsx` renderer registries, React/DOM, content preference storage, or application roots.
- [ ] At 1024×768 and 768×1024, Interaction-specific Stage, target, behavior list, close control, focus, named/disabled reasons, and 44×44 targets remain operable. Phase 5C owns the additive full browser/zoom/reduced-motion/axe/visual matrix.
- [ ] `pnpm verify:materialization` passes from the unchanged R1 contract/attestation; Story/UI/Web dependency edges were already pinned, every install is offline/frozen, and Phase 5B changes no lockfile byte.
- [ ] All Phase 4B command/golden/Save fixture bytes remain unchanged and `pnpm --filter @project-tavern/story-poc verify:commands`, `pnpm verify:golden`, `pnpm verify:fixtures`, `pnpm verify:semantic`, `pnpm verify:story-presentation`, cumulative `pnpm verify:phase5b`, and full `pnpm verify` pass read-only.
