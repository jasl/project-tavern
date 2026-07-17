# Project Tavern Phase 5C Tooling, Automation, and Acceptance Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Complete the same-artifact runtime tooling, bounded presentation diagnostics, semantic-only browser Automation, two-root browser verification, cross-browser accessibility/visual evidence, and the final read-only Phase 5 gate without adding or changing Gameplay.

**Architecture:** Phase 5C consumes the accepted Phase 5A atomic `SemanticPublication` bridge and the accepted Phase 5B `RuntimePresentationPublicationV1`, Interaction DOM witnesses, ContentPreference adapter, and exactly two Story-owned Web roots. Generic UI owns the DevDock framework, Web owns capability-session and Automation adapters, each Story owns only its tooling UI/form adapter and fixed application composition, and `DebugBundle.uiContext` remains bounded non-authoritative presentation evidence. Local browser assertions compare one atomic Semantic publication against DOM and the Automation facade; they never read Snapshot, run HitMap through Automation, or introduce a second Gameplay availability path.

**Tech Stack:** Node.js >=22.12.0, pnpm >=11.0.0, React 19.2.7, React DOM 19.2.7, Vite 8.1.4, strict TypeScript 7.0.2, Radix Dialog 1.1.19, Lucide React 1.24.0, Noto Sans SC via @fontsource 5.2.9, CSS Modules, Stylelint 17.14.0 with stylelint-config-standard 40.0.0, Vitest 4.1.10, React Testing Library 16.3.2, user-event 14.6.1, Playwright 1.61.1 with its exact R1-materialized local Chromium revision, and @axe-core/playwright 4.12.1.

## Global Constraints

- Phase 2A–4B, [`Phase 5A`](2026-07-12-project-tavern-05a-ui-runtime-foundations.md), and [`Phase 5B`](2026-07-12-project-tavern-05b-stage-character-story-presentation.md) plus their acceptance commands are hard prerequisites from the live phase-base SHA.
- The roadmap `R1` materialization checkpoint remains a hard prerequisite. Every task starts with read-only `pnpm verify:materialization`; missing/stale tracked `scripts/preflight/materialization-lock.json` or ignored `.project-tavern/goal-materialization.json` evidence fails before task changes with `external_precondition.materialization_stale`. `pnpm prepare:goal` is the sole networked preparation command and is never invoked from Phase 5C.
- R1 has already pinned and materialized every exact external package, lockfile closure, pnpm/browser revision, and font package needed by Phase 5C. Phase 5C never chooses versions, runs `pnpm add`, contacts a registry, or downloads a browser; it may run only offline/frozen installs after `verify:materialization` passes. It adds no dependency entry and makes no lockfile change; root `package.json` changes are limited to the declared scripts.
- `docs/engineering/specs/2026-07-12-game-runtime-design.md` and `docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md` are authoritative. Stop rather than implementing around a live interface that differs from either specification.
- Phase 5C adds no GameplayModule, State Slot, Gameplay Command/Fact variant, Rule, resolver, relationship counter, outfit state, Narrative control flow, balance value, or golden command sequence. It consumes the Phase 4B Story/GameSimulation and existing Semantic invocations unchanged.
- Each `Story × Host` still has one application root and one Artifact: `poc × web → dist/poc`, `e2e × web → dist/e2e`. There is no Player/Developer/Headless flavor, Developer HTML, second Story root, or tooling-only Artifact.
- Runtime capabilities remain exactly `debug_tools`, `cheats`, and `automation_bridge`. A fresh Host preference store defaults all false; URL requests are session-only `persisted OR requested` overlays and never write the preference record.
- Read-only DebugTools require `debug_tools`; mutating DebugCommand/fixture/DebugBundle anchor operations require both `debug_tools` and `cheats`. Every operation rechecks authority at call time and, where Phase 3 requires it, at the GameSession FIFO front.
- Story tooling is loaded only through two fixed active-Story package exports after an allowed operation needs it: existing Node-safe `./tooling` for fixtures/notes/form values and browser-only `./tooling-ui` for React contributions. The Node-safe export never reaches TSX/React, neither loader accepts a runtime specifier, and tooling owns no debug command Schema, reference/range validation, Rule, owner proposal, executor, integrity transition, or CommandLog behavior.
- Automation Bridge is absent while disabled. When enabled it exposes only a frozen, versioned facade over `SemanticGamePortV1`; it never exposes DebugTools, ContentPreference mutation, Interaction/HitMap execution, Snapshot, State paths, owner capabilities, fixtures, arbitrary commands, or renderer internals.
- `SemanticPublicationV1.game`, `.narrative`, and `.actions` come from the same Queries, authoritative token, and semantic revision. DOM and Automation parity always compare one complete publication; `availableActions()` must reuse the current publication's `actions` reference.
- Phase 5B's `RuntimePresentationPublicationV1` remains the only Story presentation source. Phase 5C does not create another RuntimePresentationStore, query GameQueries, recalculate Gameplay gates, or place StageScene/Asset IDs into GameView.
- `DebugBundle.uiContext` is optional, Strict JSON, bounded, privacy-scrubbed, and non-authoritative. It does not enter Snapshot, state digest, CommandLog, authoritative replay comparison, Save compatibility, or simulation identity. Identity mismatch makes it diagnostic-only and never restores UI automatically.
- Phase 5B already proves rect/circle/polygon HitMap, Interaction mode, Pointer/keyboard/semantic-control equivalence, focus, cancel/focus-loss cleanup, and no input-through. Phase 5C reuses that gate and tests only the complete-application capability, publication, DOM, Automation, responsive, and cross-browser surfaces.
- Browser tests locate player controls by semantic role/name. `data-semantic-action-id`, `data-semantic-revision`, `data-semantic-disabled-reasons`, `data-interaction-surface-id`, and `data-interaction-target-id` are parity witnesses only, never primary locators or Gameplay inputs.
- Browser waits use `waitForIdle(revision)`, publication revisions, web assertions, or explicit events. Arbitrary sleeps, coordinate scripts for normal controls, polling Snapshot, and test-only direct state setters are forbidden.
- Every browser spec created by this plan wraps its cases in `test.describe("@phase5c", ...)` and adds the narrower tag used by targeted commands (`@infrastructure`, `@semantic-parity`, `@primary-flow`, `@a11y`, `@responsive`, `@motion`, or `@visual`). The existing public smoke selector is preserved by tagging exactly four bounded cases with `@smoke`: fresh capability defaults, enabled Automation Bridge shape, the PoC first ordinary action, and one E2E Semantic command. No visual or broad matrix case receives `@smoke`.
- Normal Semantic/Automation operations and read-only diagnostics keep `RunIntegrityV1` normal. Only an already-declared successful Cheat or fixture/debug anchor marks it modified, and Phase 5C verifies rather than reimplements that Phase 3/4 behavior.
- Runtime controls, text, focus rings, symbols, DevDock, and diagnostic panels remain code-native semantic DOM. `references/` and `art-source/aigc/**` are never imported, scanned by production code, bundled, or used as browser/visual-regression inputs.
- Visual-regression verification runs in the current host's already materialized Playwright Chromium and reads agent-reviewed engineering baselines only. It is intentionally local-environment evidence, not a cross-platform pixel guarantee. A baseline is comparable only when its recorded `LocalVisualEnvironmentV1` fingerprint exactly matches the current host probe; mismatch fails with stable `visual_environment_mismatch` and requires an explicit rebaseline. Updating baselines is an explicit offline writer, never part of `verify:phase5c`, `verify:ui`, root `pnpm verify`, or artifact serving. Screenshot review is technical evidence rather than material/character-art approval and never pauses for a human inside the Goal.
- VoiceOver/Safari device checks, physical tablet/touch review, subjective art approval, human playtesting, CI, and remote distribution are outside Phase 5C and its acceptance status. They occur only in the post-engineering human-review or deferred-distribution tracks and no runbook/status placeholder for them is created here.
- Every task follows TDD, runs its focused suite, cumulative `pnpm verify:phase5b` (which already invokes Phase 5A and its current inspect-only `verify:ui` exactly once), and full `pnpm verify`, reviews the exact staged diff, and ends with a narrow commit. Task 9 preserves that leaf as `verify:ui-runtime` and makes final `verify:ui` a prebuilt-only runtime → Story presentation → 5C tooling aggregator.
- At every task boundary record phase-base SHA, current HEAD, last completed task commit, and `git status --short`. Reverify and skip an already matching task commit; resume a dirty task only when every changed/untracked path is within its `Files` allowlist. Expected-red counts only when the named focused assertion fails for its documented missing API/stable diagnostic, never for stale materialization, browser/font/visual-environment/port failures, or unrelated compilation. Stage only explicit allowlist paths, inspect cached names/diff and the complete tracked/untracked set, and preserve/report remaining user changes.

**Accepted clean-boundary execution repair:** `pnpm verify:phase5b` and full `pnpm verify` both transitively begin with the Phase 0 `verify:materialization` guard, which intentionally rejects every tracked or untracked worktree change. Therefore, in each task verification block, run all preceding focused/type/build/read-only commands and `git diff --check` before staging; then exact-stage and create the planned task commit; then run the listed cumulative `verify:phase5b` and full `pnpm verify` from that clean task `HEAD` as the execution protocol's mandatory post-commit verification. A task is not accepted and the next task cannot start until both cumulative commands exit 0. Any post-commit defect is repaired in a narrow follow-up owned by that task; never weaken materialization, stash dirty bytes, or verify a different checkout merely to satisfy the clean guard.

---

## File Map

```text
engine/packages/base/src/contracts/diagnostics.ts
engine/packages/base/src/contracts/diagnostics.test.ts
  # bounded non-authoritative DebugPresentationSummary inside DebugUiContext

engine/packages/base/src/runtime/diagnostics/debug-bundle.ts
engine/packages/base/src/runtime/diagnostics/debug-bundle.test.ts
  # export-time optional UI-context reader and strict copy boundary

engine/packages/ui/src/diagnostics/
  debug-ui-context.ts
  debug-ui-context.test.ts
  index.ts
  # derives a privacy-safe summary from RuntimePresentationPublication

engine/packages/ui/src/system/
  system-dialog-session-store.ts
  system-dialog-session-store.test.ts
  system-dialog-host.tsx
  system-dialog-host.test.tsx
  # one application-local transient source shared by rendering and diagnostics

game/stories/{poc,e2e}/src/runtime/*-debug-bundle.ts
  # Story production codecs admit the one concrete DebugUiContextV1 schema

game/stories/e2e/src/runtime/hmr-integration.test.ts
  # entry-owned application identity reaches diagnostics unchanged

game/stories/e2e/src/runtime/diagnostics-replay.test.ts
  # recorded bundle identity is never reused as the current application identity

game/stories/e2e/scripts/runtime-fixture-builder.mts
game/stories/e2e/src/runtime/runtime-fixtures.test.ts
  # fixture replay supplies its independently materialized current appBuildId

game/stories/poc/src/presentation/runtime/contracts.ts
game/stories/poc/src/presentation/ui-contributions.tsx
game/stories/e2e/src/presentation/runtime-presentation.ts
game/stories/e2e/src/presentation/ui-contributions.tsx
  # renderer and diagnostics share one Node-safe Narrative-open predicate per Story

engine/packages/ui/src/debug/
  DevDock.tsx
  DevDock.module.css
  DebugLaunchers.tsx
  FixtureBrowser.tsx
  DiagnosticInspector.tsx
  DebugCommandPanel.tsx
  CapabilityPanel.tsx
  DevDockPortalCoordinator.tsx
  dev-dock.test.tsx
  index.ts
  # neutral runtime-gated tooling chrome; no Story imports

engine/packages/web/src/capabilities/
  parse-capability-request.ts
  runtime-capability-session-overlay.ts
  *.test.ts
  index.ts

engine/packages/web/src/automation/
  browser-automation-bridge.ts
  browser-automation-bridge.test.ts
  global.d.ts
  index.ts
  # versioned, revocable SemanticPublication facade

game/stories/poc/src/tooling/
  debug-command-form-adapter.ts
  debug-command-form-adapter.test.ts

game/stories/poc/src/tooling-ui/
  index.ts
  ui-contributions.tsx
  ui-contributions.test.tsx

game/stories/e2e/src/tooling-ui/
  index.ts
  ui-contributions.tsx
  ui-contributions.test.tsx

game/stories/poc/src/application/
  create-poc-game-runtime.ts
  create-poc-presentation-runtime.ts
  install-poc-hmr.ts
  install-poc-hmr.integration.test.ts
  poc-application-root.tsx
  entry.tsx

game/stories/e2e/src/application/
  create-e2e-game-runtime.ts
  create-e2e-presentation-runtime.ts
  e2e-application-root.tsx
  entry.tsx

scripts/ui/
  source-graph-plugin.mts
  verify-application-graphs.mts
  verify-application-graphs.test.ts
  serve-story-roots.mts
  serve-story-roots.test.ts
  run-visual-regression.mts
  run-visual-regression.test.ts
  verify-phase5c.mts
  verify-phase5c.test.ts
  verify-stage-presentation.mts
  verify-stage-presentation.test.ts
  verify-ui-runtime.mts
  verify-ui-runtime.test.mjs
  verify-ui.mts
  verify-ui.test.mjs

engine/packages/web/e2e/
  ui-targets.ts
  ui-infrastructure.spec.ts
  runtime-capabilities.spec.ts
  automation-bridge.spec.ts
  semantic-publication-parity.spec.ts
  poc-primary-flow.spec.ts
  e2e-primary-flow.spec.ts
  accessibility.spec.ts
  responsive.spec.ts
  reduced-motion.spec.ts
  visual-regression.spec.ts
  __screenshots__/chromium/
    environment.v1.json
    poc-stage-standard.png
    poc-devdock-overlay.png
    e2e-narrative.png

engine/packages/web/playwright.ui.config.ts
```

### Task 1: Add bounded non-authoritative StageScene diagnostics

**Files:**

- Modify: `engine/packages/base/src/contracts/diagnostics.ts`
- Modify: `engine/packages/base/src/contracts/diagnostics.test.ts`
- Modify: `engine/packages/base/src/contracts/index.ts`
- Modify: `engine/packages/base/src/index.ts`
- Modify: `engine/packages/base/public-exports.v1.json`
- Modify: `engine/packages/base/src/runtime/diagnostics/debug-bundle.ts`
- Modify: `engine/packages/base/src/runtime/diagnostics/debug-bundle.test.ts`
- Modify: `engine/packages/base/src/runtime/diagnostics/replay.ts`
- Modify: `engine/packages/base/src/runtime/diagnostics/replay.test.ts`
- Create: `engine/packages/ui/src/diagnostics/debug-ui-context.ts`
- Create: `engine/packages/ui/src/diagnostics/debug-ui-context.test.ts`
- Modify: `engine/packages/ui/src/diagnostics/index.ts`
- Modify: `engine/packages/ui/src/index.ts`
- Create: `engine/packages/ui/src/system/system-dialog-session-store.ts`
- Create: `engine/packages/ui/src/system/system-dialog-session-store.test.ts`
- Modify: `engine/packages/ui/src/system/system-dialog-host.tsx`
- Modify: `engine/packages/ui/src/system/system-dialog-host.test.tsx`
- Modify: `engine/packages/ui/src/system/index.ts`
- Create: `engine/packages/ui/type-tests/diagnostics-public.test-d.ts`
- Modify: `engine/packages/ui/package.json`
- Modify: `engine/packages/web/src/application/create-game-runtime.ts`
- Modify: `engine/packages/web/src/application/create-game-runtime.test.ts`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.ts`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.test.ts`
- Modify: `game/stories/poc/src/application/poc-application-root.tsx`
- Modify: `game/stories/poc/src/application/poc-application-root.test.tsx`
- Modify: `game/stories/poc/src/presentation/runtime/contracts.ts`
- Modify: `game/stories/poc/src/presentation/runtime/project-poc-runtime-presentation.test.ts`
- Modify: `game/stories/poc/src/presentation/ui-contributions.tsx`
- Modify: `game/stories/poc/src/presentation/ui-contributions.test.tsx`
- Modify: `game/stories/poc/src/application/create-poc-game-runtime.ts`
- Modify: `game/stories/poc/src/application/create-poc-game-runtime.test.ts`
- Modify: `game/stories/poc/src/runtime/poc-debug-bundle.ts`
- Modify: `game/stories/poc/src/runtime/poc-debug-bundle.test.ts`
- Modify: `game/stories/poc/src/testing/poc-runtime-test-fixture.ts`
- Modify: `game/stories/e2e/src/application/create-e2e-presentation-runtime.ts`
- Modify: `game/stories/e2e/src/application/create-e2e-presentation-runtime.test.ts`
- Modify: `game/stories/e2e/src/application/create-e2e-game-runtime.ts`
- Modify: `game/stories/e2e/src/application/create-e2e-game-runtime.test.ts`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.test.tsx`
- Modify: `game/stories/e2e/src/presentation/runtime-presentation.ts`
- Modify: `game/stories/e2e/src/presentation/runtime-presentation.test.ts`
- Modify: `game/stories/e2e/src/presentation/ui-contributions.tsx`
- Modify: `game/stories/e2e/src/presentation/ui-contributions.test.tsx`
- Modify: `game/stories/e2e/src/application/entry.tsx`
- Modify: `game/stories/e2e/src/runtime/e2e-debug-bundle.ts`
- Modify: `game/stories/e2e/src/runtime/diagnostics-replay.test.ts`
- Modify: `game/stories/e2e/src/runtime/persistence-roundtrip.test.ts`
- Modify: `game/stories/e2e/src/runtime/hmr-integration.test.ts`
- Modify: `game/stories/e2e/scripts/runtime-fixture-builder.mts`
- Modify: `game/stories/e2e/src/runtime/runtime-fixture-provenance.ts`
- Modify: `game/stories/e2e/scripts/verify-runtime-fixtures.mts`
- Regenerate and review: `game/stories/e2e/src/test/fixtures/runtime/*.json`
- Regenerate and review: `game/stories/e2e/fixtures/session-zero.json`
- Regenerate and review: `game/stories/e2e/golden/semantic-flow.json`
- Regenerate and review: `game/stories/poc/src/rule-source-digests.generated.ts`
- Modify: `game/stories/poc/src/testing/save-fixture-provenance.ts`
- Modify: `game/stories/poc/src/test/save-fixtures.test.ts`
- Regenerate and review: `game/stories/poc/src/test/fixtures/saves/*.json`

**Interfaces:**

- Consumes: Phase 3 generic `DebugBundleEnvelopeV1<TUiContext>`, diagnostics-provider seam, provenance/digest checks and privacy scrubber; Phase 5B `RuntimePresentationPublicationV1`, `RuntimeStageSceneV1`, `RuntimeCharacterPresentationV1`, UI session projection, active `ContentMaturityPolicyV1`, and `ContentPreferencePortV1`.
- Produces: concrete `DebugUiContextV1`, `DebugUiSessionSummaryV1`, input-only `DebugUiSessionProjectionInputV1`, `DebugPresentationRendererSummaryV1`, `DebugPresentationSummaryV1`, exact limits, strict structural `createDebugUiContextSchemaV1()`, policy-validating pure `createDebugUiContextV1`, `classifyDebugUiContextUseV1`, and the application-local `SystemDialogSessionStateV1`/`SystemDialogSessionStoreV1` plus `createSystemDialogSessionStoreV1()`.

- [ ] **Step 1: Write the failing bounds, privacy, digest-independence, and identity tests**

```ts
import { describe, expect, it } from "vitest";
import { createDebugUiContextSchemaV1, parseContentMaturityFlagsV1 } from "@sillymaker/base";
import { classifyDebugUiContextUseV1, createDebugUiContextV1 } from "@sillymaker/ui/diagnostics";

describe("DebugBundle presentation context", () => {
  it("captures only bounded stable presentation identifiers", () => {
    const context = createDebugUiContextV1(debugPresentationFixtureV1());
    expect(context.presentation).toMatchObject({
      presentationRevision: 7,
      stageSceneId: "stage_scene.e2e.main",
      variantId: "stage_variant.e2e.main.default",
      stageRendererId: "renderer.e2e.stage.css",
      contentPolicyRevision: 1,
      allowedContentFlags: 0,
      activeInteractionSurfaceId: "surface.e2e.counter",
      renderers: [
        {
          rendererId: "renderer.e2e.character.layered",
          characterId: "character.e2e.counter",
          poseId: "pose.e2e.counter.idle",
        },
      ],
    });
    expect(JSON.stringify(context)).not.toMatch(/coordinate|runtimePath|pointer|domNode|snapshot/i);
  });

  it.each([
    ["stable_id_bytes", "diagnostics.ui_context_id_limit"],
    ["renderers", "diagnostics.presentation_renderers_limit"],
    ["appearance_layers", "diagnostics.presentation_appearance_limit"],
    ["visible_surfaces", "diagnostics.presentation_surfaces_limit"],
    ["detail_stack", "diagnostics.ui_context_detail_stack_limit"],
  ] as const)("rejects %s above its exact limit", (kind, code) => {
    expect(() => createDebugUiContextV1(overLimitDebugUiContextFixtureV1(kind))).toThrowError(code);
  });

  it("rejects an export preference absent from the supplied active Story policy", () => {
    expect(() =>
      createDebugUiContextV1(
        debugPresentationFixtureV1({
          contentPolicy: emptyFlagPolicyV1,
          allowedFlags: parseContentMaturityFlagsV1(0x80000000),
        }),
      ),
    ).toThrowError(/diagnostics\.ui_context_content_flags_unknown/);
  });

  it("structurally preserves an old bounded policy summary for mismatch diagnostics", () => {
    const parsed = createDebugUiContextSchemaV1().parse({
      ...validDebugUiContextV1,
      presentation: {
        ...validDebugUiContextV1.presentation,
        contentPolicyRevision: 1,
        allowedContentFlags: 0x80000000,
      },
    });
    expect(parsed.presentation).toMatchObject({
      contentPolicyRevision: 1,
      allowedContentFlags: 2147483648,
    });
  });

  it("does not change state digests or replay when only uiContext changes", async () => {
    const fixture = createDebugBundleUiContextFixtureV1();
    const left = await fixture.exportWithContext(debugPresentationFixtureV1({ variant: "day" }));
    const right = await fixture.exportWithContext(
      debugPresentationFixtureV1({ variant: "evening" }),
    );
    expect(left.bundle.currentStateDigest).toBe(right.bundle.currentStateDigest);
    expect(left.bundle.replayBaseStateDigest).toBe(right.bundle.replayBaseStateDigest);
    expect(left.bundle.commandLog).toEqual(right.bundle.commandLog);
    await expect(fixture.replay(left.bytes)).resolves.toEqual(fixture.replay(right.bytes));
  });

  it("never treats two absent application identities as an exact visual match", async () => {
    const comparison = await replayAuthoritativelyV1(
      replayInputWithApplicationIdentityV1(undefined, undefined),
    );
    expect(comparison.visualMatch).toBe(false);
  });

  it("permits static restoration only for exact presentation and application identity", () => {
    expect(classifyDebugUiContextUseV1(exactBundle, currentProvenance)).toEqual({
      kind: "restorable",
    });
    expect(classifyDebugUiContextUseV1(oldPresentationBundle, currentProvenance)).toEqual({
      kind: "diagnostic_only",
      reasons: ["presentation_identity_mismatch"],
    });
  });
});
```

`debug-ui-context.test.ts` defines `emptyFlagPolicyV1` as the exact revision-1 empty policy and makes `debugPresentationFixtureV1` return all four constructor inputs: one frozen runtime publication, an overridable active policy, a preference whose `allowedFlags` defaults to that policy, and a copied UI-session projection input. The fourth input contains the bounded output session fields plus the current `activeInteractionSurfaceId`; the projector copies that ID only into `presentation.activeInteractionSurfaceId`, so the exported session ABI does not duplicate it. `overLimitDebugUiContextFixtureV1` starts from the same complete input. These are test-local helpers defined before the first run, so the expected-red is the missing schema/projector rather than an undefined fixture.

The same expected-red slice adds `SystemDialogSessionStoreV1` tests proving frozen initial/transition snapshots, idempotent `openSettings`/`closeSettings`, and exact subscription notification, plus `SystemDialogHostV1` coverage proving the host and diagnostics reader observe the same application-local store through open, close, and unmount. Story root tests prove each production `SettingsLauncherV1` is wired to the one store owned by its presentation runtime; no DOM query or second mirrored boolean is accepted as diagnostics state.

- [ ] **Step 2: Run the focused tests and confirm the strict context is absent**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/contracts/diagnostics.test.ts
pnpm --filter @sillymaker/base exec vitest run src/runtime/diagnostics/replay.test.ts
pnpm --filter @sillymaker/ui exec vitest run src/diagnostics/debug-ui-context.test.ts src/system/system-dialog-session-store.test.ts src/system/system-dialog-host.test.tsx
pnpm --filter @project-tavern/story-poc exec vitest run src/application/poc-application-root.test.tsx src/presentation/runtime/project-poc-runtime-presentation.test.ts src/presentation/ui-contributions.test.tsx
pnpm --filter @project-tavern/story-e2e exec vitest run src/application/e2e-application-root.test.tsx src/presentation/runtime-presentation.test.ts src/presentation/ui-contributions.test.tsx
```

Expected: FAIL because the bounded presentation summary contract/UI adapter, System-dialog session store, production-root wiring, shared Narrative predicates, and present application-identity requirement for exact visual replay do not exist.

- [ ] **Step 3: Implement the exact neutral summary and limits**

```ts
export const debugPresentationLimitsV1 = Object.freeze({
  stableIdUtf8Bytes: 256,
  renderers: 16,
  appearanceLayersPerRenderer: 16,
  visibleInteractionSurfaces: 32,
  detailOverlayStack: 8,
} as const);

export interface DebugPresentationRendererSummaryV1 {
  readonly rendererId: string;
  readonly characterId: CharacterId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly appearanceLayerIds: readonly AppearanceLayerId[];
}

export interface DebugPresentationSummaryV1 {
  readonly presentationRevision: NonNegativeSafeInteger;
  readonly stageSceneId: StageSceneId | null;
  readonly variantId: StageSceneVariantId | null;
  readonly stageRendererId: string | null;
  readonly renderers: readonly DebugPresentationRendererSummaryV1[];
  readonly visibleInteractionSurfaceIds: readonly InteractionSurfaceId[];
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
  readonly contentPolicyRevision: PositiveSafeInteger;
  readonly allowedContentFlags: ContentMaturityFlagsV1;
}

export interface DebugUiSessionSummaryV1 {
  readonly routeId: string | null;
  readonly primaryOverlayId: string | null;
  readonly detailOverlayIds: readonly string[];
  readonly narrativeOpen: boolean;
  readonly systemDialogOpen: boolean;
  readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
}

export interface DebugUiSessionProjectionInputV1 extends DebugUiSessionSummaryV1 {
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
}

export interface DebugUiContextV1 {
  readonly revision: 1;
  readonly presentation: DebugPresentationSummaryV1 | null;
  readonly session: DebugUiSessionSummaryV1;
}
```

Use Phase 3's generic closed UI-context slot to define the concrete `DebugUiContextV1` above; the outer `DebugBundleEnvelopeV1.uiContext` remains optional, but a present V1 context has both required fields. `createDebugUiContextSchemaV1()` is strict and structural: it rejects unknown keys; duplicate `characterId`; duplicate visible surface IDs; duplicate appearance-layer IDs within one character; any ID over 256 UTF-8 bytes; an over-limit renderer/appearance/surface/detail-stack array; non-uint32 flags; coordinates; asset runtime paths; DOM values; callbacks or renderer instances; and Live2D parameters. The 256-byte diagnostics ceiling is checked before field parsing so over-limit data gets the stable diagnostics code; fields typed with a Base stable-ID brand still use that brand's canonical 3..96-byte syntax/parser, while neutral diagnostic strings such as route/overlay/renderer IDs use the wider diagnostics ceiling. Never cast a 97..256-byte string into a branded ID merely to fill the outer privacy bound. The schema intentionally does not close imported bytes over the current policy: an older bundle's bounded policy revision/mask must remain inspectable and will be classified diagnostic-only by identity. Different characters may legally reuse the same renderer, rig, pose, expression, or appearance-layer ID, so those cross-character repetitions are preserved.

`createDebugUiContextV1` is a pure structural projection over exactly `(1)` one cached `RuntimePresentationPublicationV1` whose view is constrained to the neutral `stage`, `characters`, and `interactionSurfaces` slices from 5B, `(2)` the active frozen `ContentMaturityPolicyV1`, `(3)` the current `ContentPreferencePortV1.observe()` value, and `(4)` a newly copied `DebugUiSessionProjectionInputV1`. The input-only `activeInteractionSurfaceId` comes from the existing Interaction session and is copied only into `DebugPresentationSummaryV1`; it is not inferred from the visible-surface array and is not duplicated in `DebugUiSessionSummaryV1`. The projector validates the preference against that policy, copies `policy.policyRevision` and the normalized mask, and reads only stable IDs and booleans. It does not infer a runtime fallback result that is absent from the publication, inspect `layout`, action descriptors/invocations, HitMap geometry, renderer contributions/instances, asset providers, GameQueries, or Snapshot. The application reads the four sources once per bundle export; because the result is diagnostic-only, it records the consumed presentation revision instead of inventing cross-source atomicity.

`classifyDebugUiContextUseV1` returns `restorable` only when Story ID/revision, `presentationDigest`, and a present `appBuildId` all match the current application. A historical bundle with no `appBuildId` is `application_identity_mismatch`, even if the current application also came from an older test path. Otherwise it returns ordered reasons from the closed set `story_identity_mismatch | presentation_identity_mismatch | application_identity_mismatch`. The diagnostics inspector may offer a static pose/overlay preview only for `restorable`; it never changes GameSession or automatically installs UI state. Base authoritative replay applies the same presence rule to `visualMatch`: matching `presentationDigest` values plus two absent application identities are diagnostic-only, never an exact visual match.

**Accepted cumulative-gate repair:** the complete E2E Story suite also owns two legacy replay assertions in `persistence-roundtrip.test.ts`. Its `createInstrumentedRuntimeV1` helper intentionally exercises the permitted direct/headless construction path without a current `appBuildId`, so both the original and loaded replay comparisons must preserve authoritative/state equality while reporting `visualMatch: false`. Add that test to this task's focused E2E slice and exact staging set; do not synthesize application identity, alter production code, or regenerate fixtures to keep the old expectation green.

Extend the existing diagnostics directory and UI-root export from Phase 5A, then add the one player-safe `@sillymaker/ui/diagnostics` package subpath in this task; do not create a competing diagnostics entry. The type test proves the new subpath accepts `RuntimePresentationPublicationV1` and neutral IDs but exports no Story type, Snapshot, GameSession, DebugTools, owner capability, DOM node, or renderer instance.

- [ ] **Step 4: Wire the same current context into both Story diagnostics exporters**

Thread an optional, schema-validated zero-argument `readUiContext` provider through the existing Phase 3 diagnostics service and generic Web runtime factory. The diagnostics service invokes it only during export, parses/copies the returned plain data before privacy scrubbing and size accounting, and omits `uiContext` when the provider returns `undefined`; it never retains the returned object. Each 5B Story runtime already owns one `RuntimePresentationStore` and binds that provider without adding another store:

```ts
let presentation: RuntimePresentationStoreV1<PocRuntimePresentationPublicationV1> | undefined;
const gameRuntime = createGameRuntimeV1({
  ...gameInputs,
  uiContextSchema: createDebugUiContextSchemaV1(),
  readUiContext: () => {
    const current = presentation?.getSnapshot();
    if (current === undefined) return undefined;
    return createDebugUiContextV1({
      presentation: current,
      contentPolicy: resolvedContentPolicy,
      contentPreference: contentPreference.observe(),
      uiSession: readCurrentDebugUiSessionV1(),
    });
  },
});
presentation = createRuntimePresentationStoreV1({
  ...presentationInputs,
  semantic: gameRuntime.semantic,
});
```

This is the PoC spelling; E2E substitutes its frozen `E2eRuntimePresentationPublicationV1` rather than introducing a generic Story export. The closure is application-local and never exported; no completed application is returned before `presentation` is bound. Each presentation runtime intercepts and captures the `WebRuntimeRebootstrapLifecycleV1` registered by its newly created game owner without exposing it to the caller yet. Only after all presentation/session bindings succeed does it invoke and await the caller's lifecycle callback immediately before return. Any construction or lifecycle-handoff failure awaits the captured `disposeForRebootstrap()` before rethrowing, including an E2E preference failure racing a successfully created game owner; the caller never observes a half-constructed owner.

Create one generic `SystemDialogSessionStoreV1` per Story presentation runtime. Its frozen state is exactly `{ settingsOpen: boolean }`; `openSettings` and `closeSettings` are idempotent, notify only on a real transition, and never persist or enter RuntimePresentationPublication. `SystemDialogHostV1` renders from an optional supplied store, retains opener/focus ownership locally, and closes the active store during unmount; when the prop is absent it creates one stable private fallback so this additive engine API does not break existing consumers. Each production Story root must pass its runtime-owned store. Thus production rendering and diagnostics share one transient source without a global store, DOM inspection, callback mirror, or extra Presentation subscription.

`readCurrentDebugUiSessionV1` is a pure reader over the already existing route, Overlay/detail stack, Interaction session, the shared System-dialog session, the current publication's Story-local Narrative predicate, and dock-open booleans; it has no setter and returns a new bounded plain-data DTO. Add one Node-type-strip-safe pure predicate per Story and call the same function from both renderer and diagnostics: PoC is exactly `publication.view.narrative !== null && publication.view.narrative.status === "active"`; E2E is exactly `publication.view.game.flow.status === "choosing" || publication.view.game.flow.status === "blocked"`, never the E2E publication's always-null neutral narrative slot. In this task the not-yet-created dock booleans are both false; Task 2 replaces only that source with its real root-owned state. The callback must not subscribe, publish a Semantic or Presentation revision, capture browser history, or retain a mutable publication. The E2E entry computes `appBuildId` from the same application build identity used by its resolver and passes it through presentation runtime → game runtime → diagnostics; direct/headless construction may omit that current identity but can never claim exact visual restoration. `createE2eReplayInputV1` receives the current runtime `appBuildId` separately and never reuses the decoded bundle's recorded `appBuildId` as current identity; neither Story may synthesize application identity from `presentationDigest`.

**Accepted owner regeneration before Step 5:** the new Base diagnostics ABI and Story presentation/application bytes intentionally move source-derived identity. The live read-only gates must first fail with the existing provenance guards: seven exact PoC Rule-provider source-digest mismatches, `runtime_fixture_generation.provenance_drift`, and E2E reviewed-vector blocking drift. This is not permission to weaken those guards or make verification write. Regenerate only through the existing reviewed writers, in dependency order:

```bash
pnpm --filter @project-tavern/story-poc update:rule-source-digests
# Review the seven generated source digests, then project the resulting live PoC provenance into
# pocSaveFixtureProvenanceV1 before invoking its sole Save writer.
pnpm --filter @project-tavern/story-poc update:fixtures

# Project the live E2E blocking and diagnostic tuples into runtimeFixtureProvenanceV1 first.
pnpm --filter @project-tavern/story-e2e regenerate:runtime-fixtures
pnpm regenerate:fixtures
pnpm update:golden
```

Review the complete generated diffs and SHA-256 values. PoC and E2E state-contract digests, serialized State, command sequences, gameplay outcomes, and E2E simulation digest must remain unchanged. Only the identity/provenance fields implied by the reviewed source closures, the Debug-bundle optional `uiContext`, the runtime-fixture manifest hashes/source digest, and deterministic container hashes may move. After the runtime writer succeeds, update `runtimeFixtureGeneratorSourceDigestAtGenerationV1` to the exact new manifest `generatorSourceDigest`; ordinary verification remains read-only. The runtime fixture builder keeps the recorded fixture `appBuildId` separate from its independently materialized live `currentAppBuildId` when it constructs replay input.

The prior PoC fixture test's positive live witness intentionally asserted the then-current Presentation-only drift from its historical frozen tuple. After this authorized regeneration, replace only that witness with equality of the complete live and frozen tuples. Preserve the separate synthetic diagnostic-drift case unchanged so it continues proving that read-only verification is nonblocking while fixture generation is strict.

- [ ] **Step 5: Run diagnostics, public exports, and repository verification**

Run:

```bash
pnpm --filter @sillymaker/base exec vitest run src/contracts/diagnostics.test.ts src/runtime/diagnostics
pnpm --filter @sillymaker/ui exec vitest run src/diagnostics src/system/system-dialog-session-store.test.ts src/system/system-dialog-host.test.tsx
pnpm --filter @sillymaker/web exec vitest run src/application/create-game-runtime.test.ts
pnpm --filter @project-tavern/story-poc exec vitest run src/runtime/poc-debug-bundle.test.ts src/application/create-poc-game-runtime.test.ts src/application/create-poc-presentation-runtime.test.ts src/application/poc-application-root.test.tsx src/presentation/runtime/project-poc-runtime-presentation.test.ts src/presentation/ui-contributions.test.tsx
pnpm --filter @project-tavern/story-e2e exec vitest run src/application/create-e2e-game-runtime.test.ts src/application/create-e2e-presentation-runtime.test.ts src/application/e2e-application-root.test.tsx src/presentation/runtime-presentation.test.ts src/presentation/ui-contributions.test.tsx src/runtime/diagnostics-replay.test.ts src/runtime/persistence-roundtrip.test.ts src/runtime/hmr-integration.test.ts src/runtime/runtime-fixtures.test.ts
pnpm --filter @project-tavern/story-poc exec vitest run src/test/rule-source-digests.test.ts src/test/save-fixtures.test.ts
pnpm verify:public-exports
pnpm verify:runtime-fixtures
pnpm verify:fixtures
pnpm verify:golden
pnpm verify:phase5b
pnpm verify
git diff --check
```

Expected: all commands exit 0; UI context round-trips strictly, exceeds no limits, changes no authoritative digest/replay result, and both Story exporters use their existing RuntimePresentationStore.

- [ ] **Step 6: Commit bounded presentation diagnostics**

```bash
git add -- engine/packages/base/src/contracts/diagnostics.ts engine/packages/base/src/contracts/diagnostics.test.ts engine/packages/base/src/contracts/index.ts engine/packages/base/src/index.ts engine/packages/base/public-exports.v1.json engine/packages/base/src/runtime/diagnostics/debug-bundle.ts engine/packages/base/src/runtime/diagnostics/debug-bundle.test.ts engine/packages/base/src/runtime/diagnostics/replay.ts engine/packages/base/src/runtime/diagnostics/replay.test.ts engine/packages/ui/src/diagnostics/debug-ui-context.ts engine/packages/ui/src/diagnostics/debug-ui-context.test.ts engine/packages/ui/src/diagnostics/index.ts engine/packages/ui/src/index.ts engine/packages/ui/src/system/system-dialog-session-store.ts engine/packages/ui/src/system/system-dialog-session-store.test.ts engine/packages/ui/src/system/system-dialog-host.tsx engine/packages/ui/src/system/system-dialog-host.test.tsx engine/packages/ui/src/system/index.ts engine/packages/ui/type-tests/diagnostics-public.test-d.ts engine/packages/ui/package.json engine/packages/web/src/application/create-game-runtime.ts engine/packages/web/src/application/create-game-runtime.test.ts game/stories/poc/src/application/create-poc-game-runtime.ts game/stories/poc/src/application/create-poc-game-runtime.test.ts game/stories/poc/src/application/create-poc-presentation-runtime.ts game/stories/poc/src/application/create-poc-presentation-runtime.test.ts game/stories/poc/src/application/poc-application-root.tsx game/stories/poc/src/application/poc-application-root.test.tsx game/stories/poc/src/presentation/runtime/contracts.ts game/stories/poc/src/presentation/runtime/project-poc-runtime-presentation.test.ts game/stories/poc/src/presentation/ui-contributions.tsx game/stories/poc/src/presentation/ui-contributions.test.tsx game/stories/poc/src/runtime/poc-debug-bundle.ts game/stories/poc/src/runtime/poc-debug-bundle.test.ts game/stories/poc/src/testing/poc-runtime-test-fixture.ts game/stories/poc/src/rule-source-digests.generated.ts game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/save-fixtures.test.ts game/stories/poc/src/test/fixtures/saves game/stories/e2e/src/application/create-e2e-game-runtime.ts game/stories/e2e/src/application/create-e2e-game-runtime.test.ts game/stories/e2e/src/application/create-e2e-presentation-runtime.ts game/stories/e2e/src/application/create-e2e-presentation-runtime.test.ts game/stories/e2e/src/application/e2e-application-root.tsx game/stories/e2e/src/application/e2e-application-root.test.tsx game/stories/e2e/src/presentation/runtime-presentation.ts game/stories/e2e/src/presentation/runtime-presentation.test.ts game/stories/e2e/src/presentation/ui-contributions.tsx game/stories/e2e/src/presentation/ui-contributions.test.tsx game/stories/e2e/src/application/entry.tsx game/stories/e2e/src/runtime/e2e-debug-bundle.ts game/stories/e2e/src/runtime/diagnostics-replay.test.ts game/stories/e2e/src/runtime/persistence-roundtrip.test.ts game/stories/e2e/src/runtime/hmr-integration.test.ts game/stories/e2e/scripts/runtime-fixture-builder.mts game/stories/e2e/src/runtime/runtime-fixture-provenance.ts game/stories/e2e/scripts/verify-runtime-fixtures.mts game/stories/e2e/src/test/fixtures/runtime game/stories/e2e/fixtures/session-zero.json game/stories/e2e/golden/semantic-flow.json
git diff --cached --check
git commit -m "feat(diagnostics): capture bounded presentation context"
```

### Task 2: Build the neutral runtime-gated DevDock framework

**Files:**

- Create: `engine/packages/ui/src/debug/DevDock.tsx`
- Create: `engine/packages/ui/src/debug/DevDock.module.css`
- Create: `engine/packages/ui/src/debug/DebugLaunchers.tsx`
- Create: `engine/packages/ui/src/debug/FixtureBrowser.tsx`
- Create: `engine/packages/ui/src/debug/DiagnosticInspector.tsx`
- Create: `engine/packages/ui/src/debug/DebugCommandPanel.tsx`
- Create: `engine/packages/ui/src/debug/CapabilityPanel.tsx`
- Create: `engine/packages/ui/src/debug/DevDockPortalCoordinator.tsx`
- Create: `engine/packages/ui/src/debug/dev-dock.test.tsx`
- Create: `engine/packages/ui/src/debug/index.ts`
- Create: `engine/packages/ui/type-tests/debug-public.test-d.ts`
- Modify: `engine/packages/ui/src/shell/game-shell.tsx`
- Modify: `engine/packages/ui/src/shell/game-shell.module.css`
- Modify: `engine/packages/ui/src/overlays/overlay-host.tsx`
- Modify: `engine/packages/ui/src/overlays/overlay-host.test.tsx`
- Modify: `engine/packages/ui/src/narrative/vn-layer.tsx`
- Modify: `engine/packages/ui/src/narrative/vn-layer.test.tsx`
- Modify: `engine/packages/ui/src/system/system-dialog-host.tsx`
- Modify: `engine/packages/ui/src/system/system-dialog-host.test.tsx`
- Modify: `engine/packages/ui/src/errors/runtime-failure-dialog.tsx`
- Modify: `engine/packages/ui/src/errors/errors.test.tsx`
- Modify: `engine/packages/ui/package.json`
- Modify: `game/stories/poc/src/application/poc-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`

**Interfaces:**

- Consumes: Phase 3 `RuntimeCapabilityPortV1` and `DebugToolsPortV1`, Phase 5A GameShell/InputContext, and narrow Story-supplied panel/form descriptors.
- Produces: `DevDockPanelV1`, `DevDockContributionSetV1`, `DevDockPortalCoordinatorV1`, `DevDockV1`, `DebugLaunchersV1`, `FixtureBrowserV1`, `DiagnosticInspectorV1`, `DebugCommandPanelV1`, and `CapabilityPanelV1`.

- [ ] **Step 1: Write the failing visibility, focus, authority, and no-through tests**

```tsx
it("mounts no debug chrome while debug_tools is disabled", () => {
  render(<DevDockHarness capabilities={allCapabilitiesDisabledV1} />);
  expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: "开发工具" })).not.toBeInTheDocument();
});

it.each(["overlay", "narrative", "system", "fault_pause"] as const)(
  "keeps two launchers inside the %s focus scope and restores both focus layers",
  async (surface) => {
    const user = userEvent.setup();
    render(<DevDockHarness capabilities={debugToolsEnabledV1} surface={surface} />);
    const launcher = screen.getByRole("button", { name: "打开左侧开发工具" });
    expect(launcher.closest("[data-blocking-focus-scope]")).toHaveAttribute(
      "data-blocking-focus-scope",
      surface,
    );
    await user.click(launcher);
    expect(screen.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(launcher).toHaveFocus();
    expect(activeBlockingSurfaceV1(surface)).toBeVisible();
    await user.keyboard("{Escape}");
    expect(originalBlockingSurfaceOpenerV1(surface)).toHaveFocus();
  },
);

it("uses semantic focus priority rather than registration order for concurrent blockers", () => {
  const fixture = renderConcurrentBlockingDevDockV1(["narrative", "overlay", "system"]);
  const unrelatedFocus = fixture.systemCancel;
  unrelatedFocus.focus();
  expect(fixture.launcherScope()).toBe("system");

  fixture.remove("system");
  expect(fixture.launcherScope()).toBe("overlay");
  fixture.remove("overlay");
  expect(fixture.launcherScope()).toBe("narrative");
  fixture.remove("narrative");
  expect(fixture.launcherScope()).toBe("base");

  expect(screen.getAllByRole("button", { name: /打开.+开发工具/ })).toHaveLength(2);
  expect(screen.queryByRole("complementary", { name: /开发工具/ })).not.toBeInTheDocument();
  expect(document.activeElement).not.toHaveAttribute("data-devdock-launcher");
});

it("shows read-only panels without cheats and never calls a mutating operation", async () => {
  const fixture = createDevDockFixtureV1({ debugTools: true, cheats: false });
  render(<DevDockHarness fixture={fixture} />);
  await userEvent.click(screen.getByRole("button", { name: "诊断摘要" }));
  expect(fixture.debugTools.queryDiagnostics).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();
  expect(fixture.debugTools.executeDebugCommand).not.toHaveBeenCalled();
});

it("consumes debug input without dispatching through the stage", async () => {
  const fixture = createDevDockFixtureV1({ debugTools: true, cheats: true });
  render(<DevDockHarness fixture={fixture} />);
  await userEvent.click(screen.getByRole("button", { name: "打开右侧开发工具" }));
  await userEvent.click(screen.getByRole("button", { name: "夹具" }));
  expect(fixture.stageActivation).not.toHaveBeenCalled();
  expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
});

it("distinguishes an empty authorized fixture list from capability revocation", async () => {
  const fixture = createDevDockFixtureV1({ debugTools: true, cheats: false });
  fixture.debugTools.listFixtures
    .mockResolvedValueOnce({ kind: "listed", fixtureIds: [] })
    .mockResolvedValueOnce({ kind: "capability_disabled" });
  render(<DevDockHarness fixture={fixture} />);
  await userEvent.click(screen.getByRole("button", { name: "夹具" }));
  expect(await screen.findByText("没有可用夹具")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "刷新夹具" }));
  expect(await screen.findByText("调试工具已关闭")).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and confirm the DevDock is absent**

Run: `pnpm --filter @sillymaker/ui exec vitest run src/debug/dev-dock.test.tsx`

Expected: FAIL because the neutral DevDock components and shell integration do not exist.

- [ ] **Step 3: Implement one bounded panel registry and capability policy**

```ts
export interface DevDockPanelV1 {
  readonly id: string;
  readonly side: "left" | "right";
  readonly title: string;
  readonly authority: "read_only" | "cheat";
  readonly render: () => ReactNode;
}

export interface DevDockContributionSetV1 {
  readonly panels: readonly DevDockPanelV1[];
}
```

Reject duplicate panel IDs, unknown sides/authority, more than 16 panels per side, and titles longer than 128 UTF-8 bytes. `debug_tools=false` unmounts both launchers and rails. `debug_tools=true` exposes two code-native at-least-44×44 launchers from normal play, Overlay, Narrative, System dialog, and fault-pause surfaces. `cheats=false` keeps diagnostic/fixture-list inspection visible but disables every mutating submit/anchor control with an accessible reason. The server-side DebugTools port remains the authority and rechecks all calls.

The rails are GameShell-owned chrome outside the authored seven Stage layers; opening one registers the existing `debug` InputContext above Stage interactions without creating an eighth Stage layer. Only one rail receives focus at a time, Escape closes the top rail, focus returns to its launcher, and 768×1024 reflows each rail as a modal sheet without covering both launchers.

`DevDockPortalCoordinatorV1` owns one base chrome target plus focus-scope targets registered by `OverlayHostV1`, `VnLayerV1`, `SystemDialogHostV1`, and `RuntimeFailureDialogV1`. Selection uses the fixed semantic priority `fault_pause > system > overlay > narrative > base`, never mount/registration order. Exactly one pair of launchers and the active rail are portaled into the highest active target, inside that surface's Radix/native focus scope; no inert sibling, duplicate launcher, or z-index-only escape is allowed. The rail is a nested focus scope: its Escape closes only DevDock and returns to its in-scope launcher, then the blocking surface's next Escape closes that surface and returns to its original opener. Unmounting/replacing a surface unregisters its target and moves closed launchers to the next target without opening a rail or stealing focus; disabling `debug_tools` closes the rail before removing launchers.

Each existing Story root owns one dock-open state source and passes it both to `DevDockV1` and Task 1's application-local `readCurrentDebugUiSessionV1`. Reading that source for DebugBundle export is non-mutating and does not publish Semantic or RuntimePresentation revisions.

- [ ] **Step 4: Implement concrete neutral panels without Story knowledge**

- `FixtureBrowserV1` branches on DebugFixtureListResultV1 before reading fixtureIds，distinguishes authorized `{ kind: "listed", fixtureIds: [] }` from a call-time `{ kind: "capability_disabled" }` revocation，and delegates inspect/anchor through injected callbacks; it never accepts a path, URL, Story ID, or free-form fixture name.
- `DiagnosticInspectorV1` renders player-safe diagnostics and Task 1's `restorable | diagnostic_only` classification; diagnostic-only presentation context has no restore button.
- `DebugCommandPanelV1` renders fields supplied by one Story contribution and submits only the already typed command returned by that adapter.
- `CapabilityPanelV1` renders exactly the three persisted switches, requires explicit confirmation before enabling `cheats`, and displays session-requested capabilities as read-only overrides.
- No file in `engine/packages/ui/src/debug/**` imports `game/stories/**`, PoC/E2E IDs, Snapshot, GameSession, owner capabilities, or a debug command union.
- Expose only `@sillymaker/ui/debug`; the public type test proves Story panels are injected through `DevDockContributionSetV1` and no Story command/state type leaks from the subpath.

- [ ] **Step 5: Run UI, input, boundary, and full verification**

Run:

```bash
pnpm --filter @sillymaker/ui exec vitest run src/debug src/shell src/overlays src/narrative src/system src/errors
pnpm verify:boundaries
pnpm verify:cycles
pnpm verify:phase5b
pnpm verify
git diff --check
```

Expected: all commands exit 0; default UI has no debug chrome, read-only/mutating authority is visually and behaviorally distinct, focus/no-through tests pass, and the UI package remains Story-neutral.

- [ ] **Step 6: Commit the DevDock framework**

```bash
git add -- engine/packages/ui/src/debug engine/packages/ui/type-tests/debug-public.test-d.ts engine/packages/ui/src/shell/game-shell.tsx engine/packages/ui/src/shell/game-shell.module.css engine/packages/ui/src/overlays/overlay-host.tsx engine/packages/ui/src/overlays/overlay-host.test.tsx engine/packages/ui/src/narrative/vn-layer.tsx engine/packages/ui/src/narrative/vn-layer.test.tsx engine/packages/ui/src/system/system-dialog-host.tsx engine/packages/ui/src/system/system-dialog-host.test.tsx engine/packages/ui/src/errors/runtime-failure-dialog.tsx engine/packages/ui/src/errors/errors.test.tsx engine/packages/ui/package.json game/stories/poc/src/application/poc-application-root.tsx game/stories/e2e/src/application/e2e-application-root.tsx
git diff --cached --check
git commit -m "feat(ui): add runtime gated dev dock"
```

### Task 3: Compose capability-session overlays, PoC tooling UI, and same-root HMR

**Files:**

- Create: `engine/packages/web/src/capabilities/parse-capability-request.ts`
- Create: `engine/packages/web/src/capabilities/parse-capability-request.test.ts`
- Create: `engine/packages/web/src/capabilities/runtime-capability-session-overlay.ts`
- Create: `engine/packages/web/src/capabilities/runtime-capability-session-overlay.test.ts`
- Create: `engine/packages/web/src/capabilities/index.ts`
- Modify: `engine/packages/web/src/index.ts`
- Create: `game/stories/poc/src/tooling/debug-command-form-adapter.ts`
- Create: `game/stories/poc/src/tooling/debug-command-form-adapter.test.ts`
- Modify: `game/stories/poc/src/tooling/index.ts`
- Create: `game/stories/poc/src/tooling-ui/index.ts`
- Create: `game/stories/poc/src/tooling-ui/ui-contributions.tsx`
- Create: `game/stories/poc/src/tooling-ui/ui-contributions.test.tsx`
- Modify: `game/stories/poc/package.json`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.ts`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.test.ts`
- Create: `game/stories/poc/src/application/install-poc-hmr.ts`
- Create: `game/stories/poc/src/application/install-poc-hmr.integration.test.ts`
- Modify: `game/stories/poc/src/application/poc-application-root.tsx`
- Modify: `game/stories/poc/src/application/entry.tsx`
- Modify: `game/stories/e2e/src/application/create-e2e-presentation-runtime.ts`
- Create: `game/stories/e2e/src/tooling-ui/index.ts`
- Create: `game/stories/e2e/src/tooling-ui/ui-contributions.tsx`
- Create: `game/stories/e2e/src/tooling-ui/ui-contributions.test.tsx`
- Modify: `game/stories/e2e/package.json`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`
- Modify: `game/stories/e2e/src/application/entry.tsx`

**Interfaces:**

- Consumes: Phase 3 runtime capability/DebugTools ports and existing Node-safe fixed `./tooling` loaders; Phase 4B `pocStoryToolingEntryV1` and complete ten-kind `PocDebugCommandV1`; Phase 5B two application roots.
- Produces: `parseCapabilityRequestV1`, `createRuntimeCapabilitySessionOverlayV1`, Node-safe `pocDebugCommandFormAdapterV1`, browser-only `pocToolingUiContributionsV1`/`e2eToolingUiContributionsV1`, one additional memoized fixed `./tooling-ui` loader per Story application, and `installPocHmrV1`.

- [ ] **Step 1: Write failing URL overlay and non-persistence tests**

```ts
it("parses only unique members of the closed capability set", () => {
  expect(
    parseCapabilityRequestV1(
      "?capability=debug_tools&capability=cheats&capability=automation_bridge",
    ),
  ).toEqual({
    kind: "accepted",
    requested: ["debug_tools", "cheats", "automation_bridge"],
  });
  expect(parseCapabilityRequestV1("?capability=debug_tools&capability=debug_tools")).toEqual({
    kind: "rejected",
    code: "capability.duplicate_request",
  });
  expect(parseCapabilityRequestV1("?capability=unknown")).toEqual({
    kind: "rejected",
    code: "capability.unknown_request",
  });
});

it("applies persisted OR requested without writing the persisted port", async () => {
  const persisted = createCapabilityPreferenceFixtureV1({ debugTools: false });
  const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, ["debug_tools"]);
  expect(overlay.state.getCurrent().debugTools).toBe(true);
  expect(persisted.writes()).toEqual([]);
  overlay.dispose();
});
```

- [ ] **Step 2: Write failing lazy tooling, exhaustive form, and HMR tests**

```ts
it("loads only the fixed Node-safe and browser tooling exports after an allowed operation", async () => {
  const fixture = await createPocApplicationFixtureV1({ debugTools: false });
  expect(fixture.toolingLoads()).toEqual({ node: 0, ui: 0 });
  await fixture.enable("debug_tools");
  await fixture.openFixtureBrowser();
  await fixture.openFixtureBrowser();
  expect(fixture.toolingLoads()).toEqual({ node: 1, ui: 1 });
  expect(fixture.loadedSpecifiers()).toEqual([
    "@project-tavern/story-poc/tooling",
    "@project-tavern/story-poc/tooling-ui",
  ]);
});

it("maps every declared form kind to the existing debug union and nothing else", () => {
  expect(pocDebugCommandFormAdapterV1.kinds).toEqual(pocDebugCommandKindsV1);
  expect(
    pocDebugCommandFormAdapterV1.toCommand({
      kind: "debug.inventory.adjust_cash",
      delta: 5,
      reasonId: "reason.debug.cash_adjustment",
    }),
  ).toEqual({
    kind: "debug.inventory.adjust_cash",
    delta: 5,
    reasonId: "reason.debug.cash_adjustment",
  });
});

it("retains the one application root for equal identity and fully reboots after identity drift", async () => {
  const fixture = createPocHmrFixtureV1();
  await fixture.apply({ kind: "css_only", identities: fixture.currentIdentities });
  expect(fixture.session()).toBe(fixture.originalSession());
  await fixture.apply({ kind: "resolved_change", identities: fixture.changedIdentities });
  expect(fixture.exportCalls()).toBe(1);
  expect(fixture.invalidatedSessions()).toEqual([fixture.originalSession()]);
  expect(fixture.applicationRootCount()).toBe(1);
});
```

- [ ] **Step 3: Run the focused suites and confirm capability/tooling composition is absent**

Run:

```bash
pnpm --filter @sillymaker/web exec vitest run src/capabilities
pnpm --filter @project-tavern/story-poc exec vitest run src/tooling src/tooling-ui src/application/install-poc-hmr.integration.test.ts src/application/create-poc-presentation-runtime.test.ts
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/tooling-ui src/application
```

Expected: FAIL because the Web session overlay, Story UI adapter, and unified-root HMR installation do not exist.

- [ ] **Step 4: Implement the exact session-overlay lifecycle**

Parse only repeated `capability` parameters with values `debug_tools | cheats | automation_bridge`, preserving that declared order. Unknown, duplicate, empty, or mixed malformed requests return a typed rejection and request no capability. URL absence supplies an empty requested set and preserves persisted values. `setEnabled` on the overlay delegates only to the persisted port; session-requested true values remain effective and are shown read-only until reload without that URL parameter. Disposing the application unsubscribes both sources and installs no default record.

- [ ] **Step 5: Implement the exhaustive PoC form adapter and fixed tooling loader**

`pocDebugCommandFormAdapterV1.kinds` is exactly:

```ts
[
  "debug.calendar.set_ap",
  "debug.actor.set_stamina",
  "debug.actor.set_mood",
  "debug.relationship.set",
  "debug.inventory.adjust_cash",
  "debug.aura.apply",
  "debug.aura.clear",
  "debug.story.fact.set",
  "debug.narrative.jump",
  "debug.rng.set",
] as const;
```

Its exhaustive switch copies controlled typed fields into the same `PocDebugCommandV1` variant and uses `assertNever` for no default widening. It does not parse arbitrary JSON, invent reason/reference IDs, inspect current State, clamp values, validate Aura/Narrative policy, or execute a command; the resolved GameSimulation and Phase 3 DebugTools retain those responsibilities.

Keep the existing Phase 3/4 Node-safe loader and package export unchanged:

```ts
const { pocStoryToolingEntryV1 } = await import("@project-tavern/story-poc/tooling");
```

`game/stories/poc/src/tooling/index.ts` may export the pure form adapter, fixtures, and notes, but imports no `.tsx`, React, DOM, `tooling-ui`, or UI package. Add the separate package export `"./tooling-ui": "./src/tooling-ui/index.ts"`; only that browser-only entry imports React/TSX and the neutral DevDock types. The application imports it only through the second fixed expression:

```ts
const { pocToolingUiContributionsV1 } = await import("@project-tavern/story-poc/tooling-ui");
```

Both loaders perform zero loads while disabled, retry their own rejected load, and memoize their own first success. E2E uses the corresponding fixed `@project-tavern/story-e2e/tooling` and `@project-tavern/story-e2e/tooling-ui` exports and never imports PoC. No loader accepts a URL, path, package name, Story ID, or alternate specifier. Node `--experimental-strip-types` and headless Story imports resolve `./tooling` without parsing TSX or loading React.

E2E's tooling UI reuses the Phase 3 typed E2E form adapter and exposes exactly its four declared variants: `debug.e2e.counter.add`, `debug.e2e.flow.set_blocked`, `debug.e2e.test.validation_failed`, and `debug.e2e.test.fault`. The last variant exists only to verify fault-pause recovery/accessibility; it does not add a new Gameplay or debug contract in Phase 5C.

- [ ] **Step 6: Mount Story panels and preserve same-root HMR behavior**

Inject `pocToolingUiContributionsV1` into Task 2's neutral registry after `debug_tools` becomes effective. Read-only notes/diagnostics require only DebugTools; command submits and anchors require Cheats and an explicit confirmation. `installPocHmrV1` delegates identity comparison, invalidation, diagnostic export, and rebootstrap to the Phase 3 runtime control. CSS and tooling-note changes with equal resolved identity retain the current Session; resolved identity drift invalidates, exports, disposes, and recreates the runtime inside the same `poc-web` root. No second React root or HTML file is permitted.

- [ ] **Step 7: Run tooling, capability, build, and full verification**

Run:

```bash
pnpm --filter @sillymaker/web exec vitest run src/capabilities
pnpm --filter @project-tavern/story-poc exec vitest run src/tooling src/tooling-ui src/application
pnpm --filter @project-tavern/story-e2e exec vitest run src/tooling src/tooling-ui src/application
pnpm verify:boundaries
pnpm verify:phase5b
pnpm verify
git diff --check
```

Expected: all commands exit 0; fresh/default/session/persisted capability behavior is exact, fixed tooling loads are bounded, all ten form variants remain adapters only, and both builds retain one application root.

- [ ] **Step 8: Commit capability and Story tooling composition**

```bash
git add -- engine/packages/web/src/capabilities engine/packages/web/src/index.ts game/stories/poc/src/tooling game/stories/poc/src/tooling-ui game/stories/poc/src/application game/stories/poc/package.json game/stories/e2e/src/tooling-ui game/stories/e2e/src/application game/stories/e2e/package.json
git diff --cached --check
git commit -m "feat(tooling): compose same artifact story tools"
```

### Task 4: Install the revocable atomic Semantic Automation Bridge

**Files:**

- Create: `engine/packages/web/src/automation/browser-automation-bridge.ts`
- Create: `engine/packages/web/src/automation/browser-automation-bridge.test.ts`
- Create: `engine/packages/web/src/automation/global.d.ts`
- Create: `engine/packages/web/src/automation/index.ts`
- Modify: `engine/packages/web/src/index.ts`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.ts`
- Modify: `game/stories/poc/src/application/create-poc-presentation-runtime.test.ts`
- Modify: `game/stories/poc/src/application/entry.tsx`
- Modify: `game/stories/e2e/src/application/create-e2e-presentation-runtime.ts`
- Modify: `game/stories/e2e/src/application/create-e2e-presentation-runtime.test.ts`
- Modify: `game/stories/e2e/src/application/entry.tsx`

**Interfaces:**

- Consumes: `RuntimeCapabilityPortV1`, one Story-specialized `SemanticGamePortV1`, and its atomic `SemanticPublicationV1`.
- Produces: `BrowserAutomationOperationResultV1`, `BrowserAutomationBridgeV1`, and `installBrowserAutomationBridgeV1` at `globalThis.__SILLYMAKER_AUTOMATION_V1__`.

- [ ] **Step 1: Write failing default-off, atomic-reference, revocation, and least-authority tests**

```ts
it("installs no global facade until automation_bridge becomes effective", () => {
  const fixture = createAutomationFixtureV1({ automationBridge: false });
  expect(globalThis.__SILLYMAKER_AUTOMATION_V1__).toBeUndefined();
  fixture.dispose();
});

it("returns the current atomic publication and the same actions reference", async () => {
  const fixture = createAutomationFixtureV1({ automationBridge: true });
  const bridge = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  const observed = bridge.observe();
  const available = bridge.availableActions();
  expect(observed.kind).toBe("ok");
  expect(available.kind).toBe("ok");
  if (observed.kind === "ok" && available.kind === "ok") {
    expect(available.value).toBe(observed.value.actions);
  }
  expect(fixture.semantic.availableActions).toHaveBeenCalledTimes(1);
  fixture.dispose();
});

it("installs and removes one exact non-enumerable global property", async () => {
  const fixture = createAutomationFixtureV1({ automationBridge: true });
  const installed = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  expect(Object.getOwnPropertyDescriptor(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toEqual({
    configurable: true,
    enumerable: false,
    value: installed,
    writable: false,
  });
  await fixture.capabilities.setEnabled("automation_bridge", false);
  expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
  fixture.dispose();
});

it("revokes every method retained before disablement", async () => {
  const fixture = createAutomationFixtureV1({ automationBridge: true });
  const captured = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  await fixture.capabilities.setEnabled("automation_bridge", false);
  expect(captured.observe()).toEqual({ kind: "capability_disabled" });
  expect(captured.availableActions()).toEqual({ kind: "capability_disabled" });
  await expect(captured.waitForIdle()).resolves.toEqual({ kind: "capability_disabled" });
  await expect(captured.preview(fixture.invocation)).resolves.toEqual({
    kind: "capability_disabled",
  });
  await expect(captured.dispatch(fixture.invocation)).resolves.toEqual({
    kind: "capability_disabled",
  });
  expect(fixture.semanticCalls()).toEqual([]);
});

it("never revives a revoked facade when capability is re-enabled", async () => {
  const fixture = createAutomationFixtureV1({ automationBridge: true });
  const revoked = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  await fixture.capabilities.setEnabled("automation_bridge", false);
  await fixture.capabilities.setEnabled("automation_bridge", true);
  const current = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  expect(current).not.toBe(revoked);
  expect(revoked.observe()).toEqual({ kind: "capability_disabled" });
  expect(current.observe().kind).toBe("ok");
  fixture.dispose();
  fixture.dispose();
  expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
});

it("lets an admitted async call settle but rejects every later call", async () => {
  const fixture = createDeferredAutomationFixtureV1();
  const bridge = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  const admitted = bridge.dispatch(fixture.invocation);
  await fixture.semantic.waitUntilDispatchAdmitted();
  await fixture.capabilities.setEnabled("automation_bridge", false);
  fixture.semantic.resolveDispatch(fixture.result);
  await expect(admitted).resolves.toEqual({ kind: "ok", value: fixture.result });
  await expect(bridge.dispatch(fixture.invocation)).resolves.toEqual({
    kind: "capability_disabled",
  });
  expect(fixture.semantic.dispatch).toHaveBeenCalledTimes(1);
  fixture.dispose();
});

it("never overwrites a facade owned by another live installer", () => {
  const owner = createAutomationFixtureV1({ automationBridge: true });
  const owned = globalThis.__SILLYMAKER_AUTOMATION_V1__!;
  expect(() => createAutomationFixtureV1({ automationBridge: true })).toThrowError(
    "automation.bridge_already_installed",
  );
  expect(globalThis.__SILLYMAKER_AUTOMATION_V1__).toBe(owned);
  owner.dispose();
});

it("exposes no debug, presentation, interaction, persistence, or state authority", () => {
  const bridge = createEnabledAutomationBridgeV1();
  expect(Object.keys(bridge).sort()).toEqual([
    "availableActions",
    "contractRevision",
    "dispatch",
    "observe",
    "preview",
    "waitForIdle",
  ]);
});
```

- [ ] **Step 2: Run focused tests and confirm the global bridge is absent**

Run: `pnpm --filter @sillymaker/web exec vitest run src/automation/browser-automation-bridge.test.ts`

Expected: FAIL because the versioned Automation facade and global declaration do not exist.

- [ ] **Step 3: Implement the exact frozen facade**

```ts
export type BrowserAutomationOperationResultV1<T> =
  | { readonly kind: "ok"; readonly value: DeepReadonly<T> }
  | { readonly kind: "capability_disabled" };

export interface BrowserAutomationBridgeV1<
  TPublication extends { readonly actions: readonly unknown[] },
  TInvocation,
  TPreview,
  TResult,
> {
  readonly contractRevision: 1;
  observe(): BrowserAutomationOperationResultV1<TPublication>;
  availableActions(): BrowserAutomationOperationResultV1<TPublication["actions"]>;
  preview(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TPreview>>;
  dispatch(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TResult>>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<BrowserAutomationOperationResultV1<TPublication>>;
}
```

Freeze the facade and every successful transport envelope without cloning the publication or its action array. `observe` forwards the current complete publication. `availableActions` delegates exactly once to the Phase 2B `semantic.availableActions()`, which already returns the current publication's cached `actions` reference; the bridge forwards that reference unchanged and never maps, spreads, clones, queries, or asks the Story for another projection. In a quiescent revision, calling `observe()` followed by `availableActions()` therefore satisfies reference equality. All five methods check both the facade generation and effective capability before touching SemanticGamePort. A call admitted while that generation is active settles with its underlying Semantic result; disabling does not disguise an already-dispatched command as `capability_disabled`.

The installer owns a module-private generation token. Disable permanently revokes that generation, compare-deletes its global property, and makes every later call through that facade return `capability_disabled`, even after re-enable. Re-enable creates a new token and newly frozen facade. Define the own property exactly as `{ value: facade, writable: false, enumerable: false, configurable: true }`; configurability exists because JavaScript deletion requires it and is not claimed as a security boundary. Disabled/disposed means the own property is absent, not merely set to `undefined`.

Only one live installer may own the global in a realm. A second live install fails with `automation.bridge_already_installed` and never overwrites the first owner. `dispose()` is idempotent: it permanently revokes every generation it created, unsubscribes capability observation once, and compare-deletes the current property only when both the module-private owner token and facade identity still match. An older disposer cannot delete a newer or foreign facade. Never serialize functions or allow an invocation other than the Story-specialized closed union already accepted by SemanticGamePort.

- [ ] **Step 4: Install one bridge in each existing Story runtime**

Both 5B application entries pass their own `application.semantic` and effective capability overlay to `installBrowserAutomationBridgeV1`; they dispose it with the existing runtime. Tests prove normal URLs install nothing, `?capability=automation_bridge` installs one facade, and E2E/Poc roots never coexist in one page. Enabling Automation does not change ResolvedGame, GameSimulation, GameSession, RuntimePresentation publication, ContentPreference, or RunIntegrity.

- [ ] **Step 5: Run Automation, Story application, build, and full verification**

Run:

```bash
pnpm --filter @sillymaker/web exec vitest run src/automation
pnpm --filter @project-tavern/story-poc exec vitest run src/application
pnpm --filter @project-tavern/story-e2e exec vitest run src/application
pnpm verify:boundaries
pnpm verify:phase5b
pnpm verify
git diff --check
```

Expected: all commands exit 0; the bridge is default-absent, atomic, revocable, semantic-only, and normal Automation leaves integrity unchanged.

- [ ] **Step 6: Commit the Automation Bridge**

```bash
git add -- engine/packages/web/src/automation engine/packages/web/src/index.ts game/stories/poc/src/application game/stories/e2e/src/application
git diff --cached --check
git commit -m "feat(automation): expose revocable semantic bridge"
```

### Task 5: Freeze same-Artifact application graph evidence

**Files:**

- Create: `scripts/ui/source-graph-plugin.mts`
- Create: `scripts/ui/verify-application-graphs.mts`
- Create: `scripts/ui/verify-application-graphs.test.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the Phase 5B `poc-web`/`e2e-web` Vite roots and Task 3 fixed tooling imports.
- Produces: `collectApplicationGraphV1`, `verifyApplicationGraphsV1`, and read-only `pnpm verify:application-graphs`.

- [ ] **Step 1: Write the failing two-root, fixed-tooling, and forbidden-edge tests**

```ts
it("accepts exactly the two Story-owned application roots", async () => {
  const result = await verifyApplicationGraphsV1(projectGraphFixtureV1());
  expect(result.applications).toEqual([
    { id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" },
    { id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" },
  ]);
  expect(result.developerRoots).toEqual([]);
});

it.each([
  ["web imports a Story", graphWithEdge("engine/packages/web", "game/stories/poc")],
  ["E2E imports PoC", graphWithEdge("game/stories/e2e", "game/stories/poc")],
  ["default Story closure imports TSX", graphWithDefaultStoryTsxEdge()],
  ["production imports AIGC", graphWithEdge("game/stories/poc", "art-source/aigc")],
  ["production imports references", graphWithEdge("engine/packages/web", "references")],
])("rejects %s", async (_name, graph) => {
  await expect(verifyApplicationGraphsV1(graph)).rejects.toThrow(/ui\.application_graph_forbidden/);
});

it("allows only each active Story's fixed Node-safe and browser tooling exports", async () => {
  const result = await verifyApplicationGraphsV1(projectGraphFixtureV1());
  expect(result.dynamicSpecifiers).toEqual([
    "@project-tavern/story-e2e/tooling",
    "@project-tavern/story-e2e/tooling-ui",
    "@project-tavern/story-poc/tooling",
    "@project-tavern/story-poc/tooling-ui",
  ]);
});

it("reads two exact canonical source-graph manifests and reports their digests", async () => {
  const result = await verifyApplicationGraphsV1(projectGraphFixtureV1());
  expect(result.manifests).toEqual([
    {
      applicationId: "e2e-web",
      path: "dist/e2e/source-graph.v1.json",
      digest: digestBytes(result.manifestBytes.e2e),
    },
    {
      applicationId: "poc-web",
      path: "dist/poc/source-graph.v1.json",
      digest: digestBytes(result.manifestBytes.poc),
    },
  ]);
  expect(result.manifestBytes.poc).toEqual(canonicalJsonBytes(result.manifestValues.poc));
});
```

- [ ] **Step 2: Run the script test and confirm graph evidence is absent**

Run: `pnpm exec vitest run scripts/ui/verify-application-graphs.test.ts`

Expected: FAIL because the Vite graph collector and verifier do not exist.

- [ ] **Step 3: Implement structured graph collection and exact rejection codes**

The Vite plugin records normalized workspace-relative module IDs, static edges, literal dynamic specifiers, entry IDs, output chunks, and owning package. Reject absolute local paths, backslashes, `..`, unknown virtual IDs, nonliteral dynamic imports, Story cross-imports, `references/`, `art-source/aigc/`, source maps, and a third HTML/application root. Allow tooling/debug chunks because runtime capability—not code absence—is the authority boundary.

During `generateBundle`, emit exactly one `source-graph.v1.json` asset in each output root. Its strict schema is `{ contractRevision: 1, applicationId, entry, nodes, edges, dynamicSpecifiers, chunks }`: nodes are sorted by normalized ID and carry only owning package; edges are sorted by `(from, kind, to)` with kind `static | dynamic`; specifiers are unique lexical order; chunks are sorted by `fileName` and contain sorted imports/dynamicImports plus normalized entry module ID or null. Encode with the repository canonical JSON encoder as exact UTF-8 bytes with no absolute path, timestamp, host metadata, or nondeterministic object traversal.

The verifier requires exactly:

```ts
Object.freeze({
  "e2e-web": {
    entry: "game/stories/e2e/src/application/entry.tsx",
    output: "dist/e2e",
    toolingSpecifiers: [
      "@project-tavern/story-e2e/tooling",
      "@project-tavern/story-e2e/tooling-ui",
    ],
  },
  "poc-web": {
    entry: "game/stories/poc/src/application/entry.tsx",
    output: "dist/poc",
    toolingSpecifiers: [
      "@project-tavern/story-poc/tooling",
      "@project-tavern/story-poc/tooling-ui",
    ],
  },
});
```

It also proves `engine/packages/web` imports neither Story, default Story/Headless closures and each `./tooling` export import no `.tsx`/React/DOM, only `./tooling-ui` may reach Story tooling TSX, and debug/tooling chunks are reachable only from their matching application closure. The command reads only `dist/e2e/source-graph.v1.json` and `dist/poc/source-graph.v1.json`, strict-decodes and canonically re-encodes each byte-for-byte, verifies it against the matching output graph, and reports `digestBytes(bytes)` for runbooks/checkpoints; it never builds or rewrites either manifest.

Freeze the exact root alias:

```json
{
  "scripts": {
    "verify:application-graphs": "node --experimental-strip-types scripts/ui/verify-application-graphs.mts"
  }
}
```

- [ ] **Step 4: Run script, build, graph, and full verification**

Run:

```bash
pnpm exec vitest run scripts/ui/verify-application-graphs.test.ts
pnpm verify:phase5b
pnpm verify:application-graphs
pnpm verify:bundle
pnpm verify
git diff --check
```

Expected: all commands exit 0; both Artifacts may contain tooling chunks but have exactly one root each and no forbidden import or output path.

- [ ] **Step 5: Commit application graph evidence**

```bash
git add -- scripts/ui/source-graph-plugin.mts scripts/ui/verify-application-graphs.mts scripts/ui/verify-application-graphs.test.ts vite.config.ts package.json
git diff --cached --check
git commit -m "test(ui): verify same artifact application graphs"
```

### Task 6: Establish the prebuilt two-root browser harness

**Files:**

- Create: `engine/packages/web/e2e/ui-targets.ts`
- Create: `engine/packages/web/e2e/ui-infrastructure.spec.ts`
- Create: `engine/packages/web/e2e/runtime-capabilities.spec.ts`
- Create: `engine/packages/web/playwright.ui.config.ts`
- Modify: `scripts/ui/serve-story-roots.mts`
- Modify: `scripts/ui/serve-story-roots.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: prebuilt `dist/poc`, prebuilt `dist/e2e`, Phase 5B's traversal-safe `serve-story-roots.mts`, two application identity markers, and Task 3/4 capability behavior.
- Produces: the shared `uiTargetsV1`, Chromium/Chromium-touch/WebKit full-application projects, and `pnpm test:e2e:ui` without creating a second static server.

- [ ] **Step 1: Write failing server and target-map tests**

```ts
it("serves exactly two distinct loopback targets without building", async () => {
  expect(uiTargetsV1).toEqual({
    e2e: {
      applicationId: "e2e-web",
      root: "dist/e2e",
      host: "127.0.0.1",
      port: 41731,
    },
    poc: {
      applicationId: "poc-web",
      root: "dist/poc",
      host: "127.0.0.1",
      port: 41732,
    },
  });
  expect(uiTargetsV1.e2e.port).not.toBe(uiTargetsV1.poc.port);
});

it.each(["../package.json", "%2e%2e/package.json", "\\..\\package.json"])(
  "continues to reject traversal %s",
  async (path) => {
    const server = await createStoryRootServerV1(testDistRootV1());
    await expect(server.request(path)).resolves.toMatchObject({ status: 400 });
    await server.close();
  },
);
```

- [ ] **Step 2: Extend the Phase 5B server test and confirm the full target matrix is absent**

Run: `pnpm exec vitest run scripts/ui/serve-story-roots.test.ts`

Expected: FAIL on the new exact two-target/full-project assertions; Phase 5B traversal and Interaction-serving assertions remain green.

- [ ] **Step 3: Implement the static-only server and exact Playwright projects**

Reuse and extend Phase 5B's `serve-story-roots.mts`; do not fork or wrap it with a second server implementation. It continues to bind only `127.0.0.1`, refuse duplicate/occupied ports, require the configured output root and `index.html`, normalize URL paths before joining, serve existing files only, and return `index.html` only for legal hash-router entry requests. Its existing traversal, symlink-escape, directory-listing, dotfile, unknown-method, missing-root, non-loopback, no-Vite, and no-write tests remain mandatory.

Configure:

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  {
    name: "chromium-touch",
    use: { ...devices["Desktop Chrome"], hasTouch: true, isMobile: false },
  },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
],
webServer: [
  commandForUiTargetV1(uiTargetsV1.e2e),
  commandForUiTargetV1(uiTargetsV1.poc),
],
```

Set `reuseExistingServer: false`, one isolated browser context per test, no shared IndexedDB/localStorage, and a snapshot path template independent of the developer's absolute path. `test:e2e:ui` is exactly `playwright test --config engine/packages/web/playwright.ui.config.ts`.

Use the file-level describe title `@phase5c @infrastructure` in both `ui-infrastructure.spec.ts` and `runtime-capabilities.spec.ts`, and place every case defined in Step 4 inside it. Later tasks use the same outer `@phase5c` convention with their narrower tags.

- [ ] **Step 4: Prove default capability and session-overlay behavior in real pages**

`runtime-capabilities.spec.ts` covers:

- normal PoC/E2E URLs have no Automation global and no DevDock launcher;
- `?capability=debug_tools` shows DevDock but not mutating controls;
- `?capability=debug_tools&capability=cheats` requires UI confirmation before a Cheat submit;
- `?capability=automation_bridge` exposes only the six Task 4 members;
- reload without query removes session-only capability while preserving an explicitly persisted switch;
- a newly created browser context observes all three capabilities off after every session-only case.

The first default-off case title includes `@smoke`, as does the one `automation_bridge` exact-six-member case. All remaining infrastructure cases keep only `@phase5c @infrastructure`; this preserves the established smoke selector without turning the entire capability matrix into smoke coverage.

All controls use role/name. No case reads internal stores through `page.evaluate`; the sole evaluated global is the public Automation facade. Browser evidence intentionally does not claim it can distinguish an absent preference record from a stored all-false record; Task 3's injected store-spy unit test is the authority for zero session-overlay writes.

- [ ] **Step 5: Build once, list/run infrastructure, and verify**

Run:

```bash
pnpm verify:phase5b
pnpm exec vitest run scripts/ui/serve-story-roots.test.ts
pnpm test:e2e:ui -- --project=chromium --list
pnpm test:e2e:ui -- --project=chromium --grep @infrastructure
pnpm verify:application-graphs
pnpm verify
git diff --check
```

Expected: all commands exit 0; exactly two prebuilt roots are served, normal pages and fresh contexts are effectively default-off, Task 3 still proves session overrides make zero preference writes, and servers perform no build/write operation.

- [ ] **Step 6: Commit the browser infrastructure**

```bash
git add -- engine/packages/web/e2e/ui-targets.ts engine/packages/web/e2e/ui-infrastructure.spec.ts engine/packages/web/e2e/runtime-capabilities.spec.ts engine/packages/web/playwright.ui.config.ts scripts/ui/serve-story-roots.mts scripts/ui/serve-story-roots.test.ts package.json
git diff --cached --check
git commit -m "test(web): add two root browser harness"
```

### Task 7: Prove atomic SemanticPublication, DOM, and Automation parity

**Files:**

- Create: `engine/packages/web/e2e/automation-bridge.spec.ts`
- Create: `engine/packages/web/e2e/semantic-publication-parity.spec.ts`
- Create: `engine/packages/web/e2e/poc-primary-flow.spec.ts`
- Create: `engine/packages/web/e2e/e2e-primary-flow.spec.ts`
- Modify: `game/stories/poc/src/application/poc-application-root.tsx`
- Modify: `game/stories/e2e/src/application/e2e-application-root.tsx`

**Interfaces:**

- Consumes: one atomic `SemanticPublicationV1`, Task 4 browser facade, Phase 5B RuntimePresentation root and `data-semantic-action-id` witnesses, and player-safe diagnostic export.
- Produces: revision-stamped DOM parity evidence, direct Automation/DOM equivalence, and complete primary PoC/E2E browser flows without duplicating Phase 5B HitMap tests.

- [ ] **Step 1: Write the failing publication-to-DOM parity test**

```ts
test("one publication supplies GameView, NarrativeView, actions, DOM state, and Automation", async ({
  page,
}) => {
  await page.goto(`${pocWebUrl}/?capability=automation_bridge#/play`);
  const result = await page.evaluate(() => globalThis.__SILLYMAKER_AUTOMATION_V1__!.observe());
  expect(result.kind).toBe("ok");
  if (result.kind !== "ok") throw new Error("automation bridge disabled");

  const publication = result.value;
  const root = page.getByRole("application", { name: "Project Tavern 七日原型" });
  await expect(root).toHaveAttribute("data-application-id", "poc-web");
  await expect(root).toHaveAttribute("data-semantic-revision", String(publication.revision));
  await expect(page.getByRole("main", { name: "游戏舞台" })).toBeVisible();

  for (const action of publication.actions) {
    const controls = page.locator(`[data-semantic-action-id="${action.actionId}"]`);
    await expect(controls).not.toHaveCount(0);
    const canonical = controls.first();
    if (action.enabled) await expect(canonical).toBeEnabled();
    else await expect(canonical).toBeDisabled();
    await expect(canonical).toHaveAttribute(
      "data-semantic-disabled-reasons",
      action.reasons.map((reason) => reason.code).join(","),
    );
  }

  const domIds = await page
    .locator("[data-semantic-action-id]")
    .evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => node.getAttribute("data-semantic-action-id")))].sort(),
    );
  expect(domIds).toEqual(publication.actions.map((action) => action.actionId).sort());
});
```

- [ ] **Step 2: Write failing DOM-versus-Automation outcome and integrity tests**

```ts
test("DOM and Automation produce the same E2E semantic result", async ({ browser }) => {
  const dom = await createFreshE2ePageV1(browser, "dom");
  const automation = await createFreshE2ePageV1(browser, "automation");

  const domBefore = await dom.visibleRevision();
  await dom.page.getByRole("button", { name: "增加计数" }).click();
  await dom.waitForVisibleRevisionAfter(domBefore);
  const before = await automation.observe();
  const invocation = invocationForActionV1(before.actions, "action.e2e.increment");
  const idle = automation.waitForIdle(before.revision);
  const dispatched = await automation.dispatch(invocation);
  await idle;

  expect(dispatched).toMatchObject({ kind: "ok", value: { kind: "committed" } });
  expect(await dom.visibleGameView()).toEqual((await automation.observe()).game);
  expect(await dom.visibleActionStates()).toEqual((await automation.observe()).actions);
});

test("preview and stale rejection reuse descriptor options and ordered reasons", async ({
  browser,
}) => {
  const fixture = await createE2ePageAtChoosingV1(browser);
  const publication = await fixture.automation.observe();
  const descriptor = descriptorForActionV1(publication.actions, "action.e2e.choose");
  const invocation = invocationForDescriptorOptionV1(descriptor, { choice: "left" });

  await expect(fixture.automation.preview(invocation)).resolves.toMatchObject({
    kind: "ok",
    value: { kind: "allowed" },
  });

  const idle = fixture.automation.waitForIdle(publication.revision);
  await expect(fixture.automation.dispatch(invocation)).resolves.toMatchObject({
    kind: "ok",
    value: { kind: "committed" },
  });
  await idle;

  const stalePreview = await fixture.automation.preview(invocation);
  const staleDispatch = await fixture.automation.dispatch(invocation);
  expect(stalePreview).toMatchObject({
    kind: "ok",
    value: { kind: "rejected", reasons: [{ code: "flow.not_choosing" }] },
  });
  expect(staleDispatch).toMatchObject({ kind: "ok", value: { kind: "rejected" } });
  expect(orderedRejectionReasonsV1(staleDispatch)).toEqual(orderedRejectionReasonsV1(stalePreview));
});

test("a currently published disabled descriptor matches its DOM reasons", async ({ browser }) => {
  const fixture = await createE2ePageWithVisibleDisabledActionV1(browser);
  const publication = await fixture.automation.observe();
  const descriptor = requireVisibleDisabledDescriptorV1(publication.actions);
  const invocation = invocationForFirstControlledOptionV1(descriptor);
  const preview = await fixture.automation.preview(invocation);

  expect(preview).toMatchObject({ kind: "ok", value: { kind: "rejected" } });
  if (preview.kind !== "ok" || preview.value.kind !== "rejected") {
    throw new Error("expected disabled preview rejection");
  }
  expect(preview.value.reasons).toEqual(descriptor.reasons);
  expect(await fixture.domDisabledReasons(descriptor.actionId)).toEqual(descriptor.reasons);
});

test("normal Automation leaves integrity normal without exposing it on the facade", async ({
  page,
}) => {
  await page.goto(`${pocWebUrl}/?capability=debug_tools&capability=automation_bridge#/play`);
  await runOneAutomationActionV1(page);
  expect(await automationKeysV1(page)).not.toContain("snapshot");
  const bundle = await exportDiagnosticBundleThroughDevDockV1(page);
  expect(bundle.currentSnapshot.integrity.mode).toBe("normal");
});

test("Automation dispatch results are recursively player-safe in both Stories", async ({
  browser,
}) => {
  for (const fixture of await createAutomationResultFixturesV1(browser, ["e2e", "poc"])) {
    const result = await fixture.dispatchOneAvailableAction();
    expect(result.kind).toBe("ok");
    expect(collectObjectKeysRecursivelyV1(result)).not.toEqual(
      expect.arrayContaining([
        "snapshot",
        "state",
        "rng",
        "facts",
        "fault",
        "attempt",
        "commandLog",
      ]),
    );
  }
});
```

- [ ] **Step 3: Run the parity subset and confirm revision/DOM witnesses are incomplete**

Run:

```bash
pnpm build:poc
pnpm build:e2e
pnpm test:e2e:ui -- --project=chromium --grep @semantic-parity
```

Expected: FAIL on missing root revision/disabled-reason witnesses or incomplete browser parity flows; Phase 5B Interaction tests remain green.

- [ ] **Step 4: Stamp DOM from the consumed publication without a second read**

Both Story roots already consume one `RuntimePresentationPublicationV1`. Put its embedded semantic revision on the existing 5B application wrapper and pass its action descriptors unchanged into controls:

```tsx
<div
  role="application"
  aria-label="Project Tavern 七日原型"
  data-application-id="poc-web"
  data-semantic-revision={publication.semantic.revision}
>
  <GameShell accessibleName="游戏舞台" layers={layers} inputRouter={runtime.input} />
</div>
```

This modifies the existing single `role="application"` Story root; it does not wrap `GameShell` in another `main`, because Phase 5A `GameStageV1` already owns the one `role="main"` landmark. The E2E spelling retains `applicationId="e2e-web"` and its existing accessible application name. Do not add a `publication` prop to frozen `GameShellPropsV1`. The root continues deriving `layers` from the one 5B publication and passes the existing `runtime.input`. `data-semantic-disabled-reasons` is the ordered comma-separated stable reason-code list from that same descriptor. Rendering may duplicate a Gameplay action across Stage and explicit-control lists, but every publication action must have at least one zero-requirement DOM entry, and no DOM Gameplay control may reference an ID absent from the publication. No component calls `availableActions()` during render or creates another Queries object.

- [ ] **Step 5: Implement complete primary flows at the application level**

`poc-primary-flow.spec.ts` performs new game → initial VN → life policy → one currently available action → Quick Save → Manual Save → reload/recovery using only role/name controls and public persistence UI. `e2e-primary-flow.spec.ts` completes the E2E cross-owner command, paused/resumed workflow, Narrative branch/rejoin, and terminal state once through DOM and once through Automation. Before every dispatch, capture `before.revision` and subscribe with `const idle = waitForIdle(before.revision)`; dispatch only after that promise exists, then await `idle` and assert its next complete publication. No post-dispatch waiter, sleep, or coordinate click is allowed.

Split the PoC first ordinary action and the first E2E Semantic command into one bounded test each whose title includes `@smoke`; subsequent Save/reload/workflow coverage stays in the surrounding `@phase5c @primary-flow` suite without that tag. Together with Task 6's two smoke cases, `rg -n "@smoke" engine/packages/web/e2e` must find exactly four executable test titles.

Do not repeat Phase 5B rect/circle/polygon, pose override, Pointer cancel, focus-loss, or touch HitMap matrix. This task only proves that the accepted Interaction layer, ordinary DOM controls, and Automation converge on the same Semantic source in the complete applications.

- [ ] **Step 6: Prove capability and content-preference combinations do not change Gameplay actions**

Use an isolated Automation-only E2E context as the full-publication baseline. True default, DebugTools-only, and DebugTools+Cheats-before-mutation contexts intentionally have no Automation global; compare only their public DOM action IDs/enabled/ordered reasons/revision witnesses to that baseline, while Task 6 separately proves the global is absent. For full publication/preview comparisons, create parallel isolated contexts that explicitly add `automation_bridge` to DebugTools and DebugTools+Cheats-before-mutation. In the E2E root, run the same comparison for exactly `0`、alpha-only、beta-only、`alpha|beta` and the Story-defined `stream_safe` preset. Drive the exact sequence default `0` → check alpha → uncheck alpha/check beta → check alpha → click `[data-content-preset-id="content_preset.e2e.stream_safe"]`; locate checkboxes only by validated `data-content-flag-id`, assert their native checked state and the exact `data-content-cue-id` presence/absence after every write, and require the preset's `aria-pressed=true` at the end. Never select by raw labels, ordinals or mask numbers. PoC remains at `allowedFlags=0` with no filter controls. Before any Cheat, assert identical action IDs/enabled/reasons for the same authoritative state. For each enabled descriptor used by the flow, construct the exact invocation only from its controlled options and compare positive `preview(invocation)` results across Automation-enabled contexts. For a currently published disabled descriptor, compare typed preview rejection plus ordered reasons to its disabled DOM witness; for an invocation retained after its action disappears, compare direct preview and dispatch typed rejection only. Changing content preference may increment only the Phase 5B presentation revision; semantic revision and `publication.actions` remain unchanged.

Test one successful existing PoC Cheat separately through the real DevDock form: request DebugTools+Cheats, confirm `debug.inventory.adjust_cash` with the authored `reason.debug.cash_adjustment`, wait for the public revision, and export the player-safe diagnostic bundle to observe modified integrity. Quick Save through the public persistence UI, reload/continue, and export again; the same modified integrity/mutation count must survive. This browser test constructs no new command, reads no internal store, and confirms Automation still has no DebugTools method.

- [ ] **Step 7: Run browser parity, interaction prerequisite, and full verification**

Run:

```bash
pnpm verify:phase5b
pnpm verify:application-graphs
pnpm test:e2e:ui -- --project=chromium --grep @semantic-parity
pnpm test:e2e:ui -- --project=chromium --grep @primary-flow
pnpm verify:semantic
pnpm verify
git diff --check
```

Expected: all commands exit 0; one publication drives GameView/NarrativeView/actions/DOM, DOM and Automation produce equivalent results, normal Automation preserves integrity, and no basic Interaction test is duplicated.

- [ ] **Step 8: Commit publication and primary-flow evidence**

```bash
git add -- engine/packages/web/e2e/automation-bridge.spec.ts engine/packages/web/e2e/semantic-publication-parity.spec.ts engine/packages/web/e2e/poc-primary-flow.spec.ts engine/packages/web/e2e/e2e-primary-flow.spec.ts game/stories/poc/src/application/poc-application-root.tsx game/stories/e2e/src/application/e2e-application-root.tsx
git diff --cached --check
git commit -m "test(ui): prove atomic semantic browser parity"
```

### Task 8: Complete responsive, accessibility, motion, and visual regression evidence

**Files:**

- Create: `engine/packages/web/e2e/accessibility.spec.ts`
- Create: `engine/packages/web/e2e/responsive.spec.ts`
- Create: `engine/packages/web/e2e/reduced-motion.spec.ts`
- Create: `engine/packages/web/e2e/visual-regression.spec.ts`
- Modify: `engine/packages/web/e2e/walking-skeleton.spec.ts`
- Delete: `engine/packages/web/e2e/__screenshots__/e2e-shell.png`
- Create: `engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json`
- Create: `engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png`
- Create: `engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png`
- Create: `engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png`
- Create: `docs/engineering/checkpoints/phase5c-visual-baselines.md`
- Create: `scripts/ui/run-visual-regression.mts`
- Create: `scripts/ui/run-visual-regression.test.ts`
- Modify: `engine/packages/web/playwright.ui.config.ts`
- Modify: `engine/packages/ui/src/shell/game-shell.tsx`
- Modify: `engine/packages/ui/src/shell/game-shell.module.css`
- Modify: `engine/packages/ui/src/theme/global.css`
- Modify: `engine/packages/ui/src/debug/DevDock.tsx`
- Modify: `engine/packages/ui/src/debug/DevDock.module.css`
- Modify: `package.json`

**Interfaces:**

- Consumes: Task 6 two-root browser harness, accepted Phase 5A/5B responsive/Interaction behavior, Task 2 DevDock, code-native fallbacks, and `@axe-core/playwright`.
- Produces: global `@a11y`, `@responsive`, `@motion`, and read-only `@visual` suites; host-local visual execution bound to `LocalVisualEnvironmentV1`; explicit `update:ui-snapshots`; `verify:ui-visual`; and agent-authored technical baseline evidence.

- [ ] **Step 1: Verify R1-pinned axe/font inputs and write the failing global responsive/zoom matrix**

Run before importing `AxeBuilder`:

```bash
pnpm verify:materialization
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = JSON.parse(await readFile("package.json", "utf8"));
const ui = JSON.parse(await readFile("engine/packages/ui/package.json", "utf8"));
const code = "external_precondition.materialization_stale";
assert.equal(root.devDependencies?.["@axe-core/playwright"], "4.12.1", code);
assert.equal(ui.dependencies?.["@fontsource/noto-sans-sc"], "5.2.9", code);
NODE
pnpm install --offline --frozen-lockfile
```

Expected: the verifier proves root already owns exact test-only `@axe-core/playwright@4.12.1`, UI already owns exact `@fontsource/noto-sans-sc@5.2.9`, and the lock/materialization closure contains both; the offline frozen install changes no manifest or lockfile. Missing/mismatched evidence is `external_precondition.materialization_stale`, not permission to select/install a dependency during Phase 5C. The UI package imports only `@fontsource/noto-sans-sc/chinese-simplified-400.css` and `chinese-simplified-700.css`, applies `"Noto Sans SC"` before the system fallback stack, and therefore ships two pinned OFL-1.1 npm font resources rather than relying on host CJK fonts. It imports no remote stylesheet and performs no network font request.

```ts
for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1600, height: 1000 },
  { width: 768, height: 1024 },
  { width: 2560, height: 1080 },
  { width: 800, height: 500 },
]) {
  test(`@responsive complete shell at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${pocWebUrl}/?capability=debug_tools#/play`);
    const stage = page.getByRole("main", { name: "游戏舞台" });
    await expect(stage).toBeInViewport();
    await expectStageBoundsV1(stage, { maximumWidth: 1600, maximumRatio: 1.6 });
    await expect(page.getByRole("button", { name: "打开左侧开发工具" })).toHaveMinimumSize({
      width: 44,
      height: 44,
    });
  });
}

test("@responsive remains operable at equivalent 200 percent zoom", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 800, height: 500 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${pocWebUrl}/?capability=debug_tools#/play`);
  await expect(page.getByRole("main", { name: "游戏舞台" })).toBeVisible();
  await page.getByRole("button", { name: "打开左侧开发工具" }).click();
  await expect(page.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
  await expectNoUnreachableInteractiveContentV1(page);
  await context.close();
});
```

The 200% case uses an 800×500 CSS viewport rendered into 1600×1000 device pixels; it does not inject CSS `zoom`, call Chromium-only CDP, or mistake DPR-only scaling for reflow.

- [ ] **Step 2: Write failing axe, keyboard, text-spacing, and motion tests**

```ts
test("@a11y has no WCAG A/AA violations across every blocking surface", async ({ page }) => {
  for (const surface of [
    "play",
    "overlay",
    "narrative",
    "system",
    "devdock",
    "fault_pause",
  ] as const) {
    await openSurfaceFixtureV1(page, surface);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("@motion reduced motion removes nonessential Stage and DevDock transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${pocWebUrl}/?capability=debug_tools#/play`);
  await page.getByRole("button", { name: "打开左侧开发工具" }).click();
  await expectNonessentialMotionDisabledV1(page, [
    "stage-variant-transition",
    "workspace-overlay-transition",
    "devdock-transition",
  ]);
});

for (const surface of ["normal", "narrative", "fault_pause"] as const) {
  test(`@a11y exports diagnostics from ${surface} with keyboard or touch`, async ({
    page,
  }, testInfo) => {
    await openDiagnosticSurfaceFixtureV1(page, surface);
    const exportControl = page.getByRole("button", { name: "导出调试包" });
    if (testInfo.project.name === "chromium-touch") {
      await exportControl.tap();
    } else {
      await exportControl.focus();
      await page.keyboard.press("Space");
    }
    await expectPlayerSafeDiagnosticExportV1(page, { surface });
  });
}
```

Run the diagnostic-export matrix in both `chromium` and `chromium-touch`. `openDiagnosticSurfaceFixtureV1` reaches Narrative and fault-pause only through their existing public E2E controls; the assertion validates the browser-produced player-safe bundle and never calls an internal exporter. This is the retained normal/VN/fault × keyboard/touch evidence, not a new diagnostic implementation.

Keyboard-only coverage starts from the primary HUD and, separately for Overlay, Narrative, System, and fault-pause, opens DevDock while that blocker remains active, checks visible focus/logical order, closes the rail first, then closes the underlying surface, and verifies both focus restorations. Text-spacing applies WCAG spacing overrides and asserts no clipped labels, hidden disabled reasons, or horizontal page scroll. Other touch coverage in this task checks DevDock/capability/global controls only; Phase 5B remains the sole detailed Interaction touch matrix.

`openSurfaceFixtureV1(page, "fault_pause")` uses the E2E root with session-requested DebugTools+Cheats, confirms the controlled `debug.e2e.test.fault` form from Task 3, and waits for the public fault-pause surface. It does not inject a fault through `page.evaluate`, add a new command, or expose DebugTools through Automation.

- [ ] **Step 3: Run targeted suites and confirm at least one global adaptation is absent**

Run:

```bash
pnpm build:poc
pnpm build:e2e
pnpm test:e2e:ui -- --project=chromium --grep "@responsive|@a11y|@motion"
pnpm test:e2e:ui -- --project=chromium-touch --grep @a11y
```

Expected: FAIL in the named `@responsive complete shell at 768x1024` case at the DevDock reachability/no-horizontal-overflow assertion while the Phase 5B Interaction gate remains green. A setup, browser-launch, port, materialization, or unrelated assertion failure does not satisfy this red step.

- [ ] **Step 4: Implement bounded global adaptations without changing Interaction semantics**

Adjust only shell/debug/theme CSS and component accessibility metadata needed by failing global tests. Preserve the Phase 5A seven layers and Phase 5B HitMap/Interaction contracts. Portrait DevDock becomes one focus-trapped modal sheet; ultrawide leaves centered gutters; overlays scroll internally; the page itself does not horizontally scroll at 200% equivalent zoom. `prefers-reduced-motion: reduce` removes nonessential opacity/transform/tween duration while preserving immediate state changes and focus movement.

Do not create a VoiceOver/Safari or physical-device runbook/status in this task. Those checks belong to the post-engineering human-playtest track after the complete automated flow has passed; their absence cannot block, skip, or qualify Phase 5C acceptance. This task claims only the declared automated DOM/axe/keyboard/touch-emulation/browser evidence.

- [ ] **Step 5: Add host-local Chromium visual baselines and an explicit update path**

First write the environment-fingerprint, argument, mismatch, diagnostics, and atomic-writer assertions in `scripts/ui/run-visual-regression.test.ts`:

```ts
const environment: LocalVisualEnvironmentV1 = {
  revision: 1,
  os: "darwin",
  arch: "arm64",
  playwrightVersion: "1.61.1",
  chromiumRevision: "1228",
  chromiumVersion: "149.0.7827.55",
  fontPackage: "@fontsource/noto-sans-sc",
  fontVersion: "5.2.9",
  deviceScaleFactor: 1,
  viewport: { width: 1600, height: 1000 },
  reducedMotion: "reduce",
};

expect(compareLocalVisualEnvironmentV1(environment, environment)).toEqual({
  kind: "compatible",
});
expect(
  compareLocalVisualEnvironmentV1(environment, {
    ...environment,
    chromiumVersion: "150.0.0.0",
  }),
).toEqual({
  kind: "incompatible",
  code: "visual_environment_mismatch",
  fields: ["chromiumVersion"],
});
expect(createVisualPlaywrightInvocationV1("verify", ".project-tavern/visual-runs/run-1")).toEqual({
  command: "pnpm",
  args: [
    "test:e2e:ui",
    "--",
    "--project=chromium",
    "--grep",
    "@visual",
    "--output=.project-tavern/visual-runs/run-1",
  ],
});
expect(createVisualPlaywrightInvocationV1("update", ".project-tavern/visual-runs/run-1")).toEqual({
  command: "pnpm",
  args: [
    "test:e2e:ui",
    "--",
    "--project=chromium",
    "--grep",
    "@visual",
    "--output=.project-tavern/visual-runs/run-1",
    "--update-snapshots",
  ],
});
```

The remaining unit cases must prove: all fingerprint fields are compared in the declaration order below; missing or unknown fields are rejected; a verifier environment mismatch launches no browser test and writes diagnostics containing both fingerprints; `verify` cannot write the tracked baseline directory; only the three declared PNG names are accepted; every screenshot mismatch retains a complete expected/actual/diff triplet; `update` validates all candidates before atomically replacing the three PNGs plus `environment.v1.json`; the runner never spawns the full `verify:materialization` child; `walking-skeleton.spec.ts` no longer contains `@visual`; and the Phase 2 `e2e-shell.png` path plus legacy `update:screenshots` script are absent.

Run:

```bash
pnpm exec vitest run scripts/ui/run-visual-regression.test.ts
```

Expected: FAIL because the host-local visual runner and `LocalVisualEnvironmentV1` contract do not exist.

Remove the Phase 2-only screenshot case/tag from `walking-skeleton.spec.ts`, delete `engine/packages/web/e2e/__screenshots__/e2e-shell.png`, and remove the legacy `update:screenshots` root script in the same task. Preserve any nonvisual smoke assertions still owned by that spec. A static test must prove `engine/packages/web/e2e/visual-regression.spec.ts` is the only executable source containing `@visual`, so the new runner cannot accidentally discover a fourth baseline.

Capture the real prebuilt `poc-web` default Story and its already committed `approvedPocAssetPacksV1`; do not inject an empty pack, re-resolve the Story, add a test-only asset override, or create a second Artifact. If the approved pack is empty, the same root naturally renders code-native fallbacks. If it is non-empty, the technical baseline records the actual Artifact presentation. Phase 4B provider tests and Phase 5B injected fallback-only renderer tests remain the authoritative empty-pack/failure coverage and must stay green.

Keep the PoC's zero-requirement content policy, fixed 1600×1000 CSS-pixel viewport, `deviceScaleFactor: 1`, `reducedMotion: reduce`, the two pinned Noto Sans SC 5.2.9 resources, and settled `RuntimePresentationPublication`. Before capture, await `document.fonts.ready` and assert both `400 16px "Noto Sans SC"` and `700 16px "Noto Sans SC"`; a missing bundled font is a test failure, never permission to use the host's system-font fallback. Capture exactly:

```ts
test("@visual PoC standard stage", async ({ page }) => {
  await openSettledVisualFixtureV1(page, "poc-stage-standard");
  await expect(page).toHaveScreenshot("poc-stage-standard.png", { animations: "disabled" });
});

test("@visual PoC DevDock over workspace overlay", async ({ page }) => {
  await openSettledVisualFixtureV1(page, "poc-devdock-overlay");
  await expect(page).toHaveScreenshot("poc-devdock-overlay.png", { animations: "disabled" });
});

test("@visual E2E blocking narrative", async ({ page }) => {
  await openSettledVisualFixtureV1(page, "e2e-narrative");
  await expect(page).toHaveScreenshot("e2e-narrative.png", { animations: "disabled" });
});
```

With `testDir: "./e2e"` in `engine/packages/web/playwright.ui.config.ts`, set the normal `snapshotPathTemplate` to `{testDir}/__screenshots__/{projectName}/{arg}{ext}` and allow the runner to replace only the leading snapshot root with its absolute `PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT` candidate directory during `update`. Relative templates resolve from the config directory, so repeating `engine/packages/web` would be wrong. Run visual comparisons only in Chromium. Set `grepInvert: /@visual/` on the `chromium-touch` and `webkit` projects, while Chromium keeps the suite discoverable; this is configuration-level scope, not `test.skip`, so unfiltered touch/WebKit commands never request nonexistent baselines. Replace the Phase 2 screenshot writer with only these root scripts; add no dependency and make no lockfile change:

```json
{
  "scripts": {
    "update:ui-snapshots": "node --experimental-strip-types scripts/ui/run-visual-regression.mts update",
    "verify:ui-visual": "node --experimental-strip-types scripts/ui/run-visual-regression.mts verify"
  }
}
```

Define and strict-decode the following machine-readable fingerprint. `environment.v1.json` is canonical JSON containing exactly this record, and the checkpoint repeats the same values plus its canonical SHA-256:

```ts
export interface LocalVisualEnvironmentV1 {
  readonly revision: 1;
  readonly os: NodeJS.Platform;
  readonly arch: string;
  readonly playwrightVersion: "1.61.1";
  readonly chromiumRevision: string;
  readonly chromiumVersion: string;
  readonly fontPackage: "@fontsource/noto-sans-sc";
  readonly fontVersion: "5.2.9";
  readonly deviceScaleFactor: 1;
  readonly viewport: { readonly width: 1600; readonly height: 1000 };
  readonly reducedMotion: "reduce";
}
```

`run-visual-regression.mts` accepts only `update | verify` and performs a focused read-only visual preflight rather than spawning the full `pnpm verify:materialization` offline-copy/build smoke a second time. It imports the Phase 0 canonical contract reader, recomputes the external closure/materialization digest, strict-decodes the ignored attestation, and requires their equality before reading the Playwright/font package versions and exact Chromium revision. It confirms `chromium.executablePath()` exists, launches that already materialized executable only long enough to read `browser.version()`, and combines those values with `process.platform`, `process.arch`, and the fixed capture settings into `LocalVisualEnvironmentV1`. It neither installs dependencies nor downloads, repairs, substitutes, or builds. A missing or inconsistent contract/attestation/package/browser/font fails before the visual suite with the Phase 0 codes `external_precondition.materialization_stale`, `external_precondition.browser_missing`, `external_precondition.browser_revision_mismatch`, or `external_precondition.visual_font_missing`. The root verifier still runs the one complete `verify:materialization` leaf first; explicit baseline-generation instructions do the same before invoking the writer.

In `verify` mode, strict-decode tracked `environment.v1.json` and compare every fingerprint field before launching the screenshot suite. Any difference emits `visual_environment_mismatch`, records current and baseline fingerprints plus their canonical SHA-256 values in ignored `.project-tavern/visual-diagnostics/<run-id>/environment-mismatch.v1.json`, and exits nonzero without comparing pixels. This result means only that the local pixel baseline is no longer comparable; it is not an application defect and it is not a cross-platform compatibility claim. The sole recovery is an intentional `pnpm update:ui-snapshots` followed by the same full agent review and checkpoint update required for any rebaseline.

Both modes invoke Playwright with the structured arguments frozen above, use a new ignored `.project-tavern/visual-runs/<run-id>/` output directory, and never build. `verify` uses the tracked snapshot root and cannot alter it. If its only test failures are screenshot mismatches for the three declared cases, validate and preserve one expected/actual/diff triplet for every mismatched case plus a canonical manifest containing paths, byte sizes, SHA-256 values, materialization digest, and the complete `LocalVisualEnvironmentV1` fingerprint under `.project-tavern/visual-diagnostics/<run-id>/`; reject missing, partial, duplicate, or extra evidence. Print the preserved diagnostics path before returning the original nonzero result.

`update` points Playwright at a fresh candidate snapshot root, requires exactly the three declared PNGs, and rejects a missing/extra name, non-1600×1000 dimensions, empty file, or file changed during hashing. Only after the full candidate set validates does it atomically replace the three tracked PNGs and canonical `environment.v1.json` through same-filesystem temporary names. An interruption before replacement leaves the previous baseline set intact. Unit tests freeze the fingerprint probe/comparison order, structured Playwright arguments, explicit update-only flag, complete PNG allowlist, environment and screenshot diagnostic manifests, atomic replacement, cleanup, and absence of tracked writes during `verify`. These baselines are therefore deterministic evidence only for the exact recorded host-local environment; functional, responsive, accessibility, and WebKit/touch tests provide the portable behavioral coverage.

- [ ] **Step 6: Generate/review baselines once and run the full browser matrix**

The execution agent performs this technical review without waiting for a human and without treating it as artwork approval. For a first baseline set, run the writer, immediately make the three PNGs plus `environment.v1.json` visible to Git, and record their complete sorted path/size/SHA-256 set:

```bash
pnpm verify:materialization
pnpm verify:phase5b
pnpm verify:application-graphs
pnpm exec vitest run scripts/ui/run-visual-regression.test.ts
pnpm update:ui-snapshots
git add -N -- engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png
wc -c engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png
shasum -a 256 engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png
git diff -- engine/packages/web/e2e/__screenshots__/chromium
pnpm verify:ui-visual
pnpm test:e2e:ui -- --project=chromium --grep "@responsive|@a11y|@motion"
pnpm test:e2e:ui -- --project=chromium-touch --grep "@responsive|@a11y"
pnpm test:e2e:ui -- --project=webkit --grep "@responsive|@a11y|@motion"
pnpm verify
git diff --check
```

For an existing baseline set, first run `pnpm verify:ui-visual`. If it passes, do not invoke the writer. If it fails with `visual_environment_mismatch`, inspect the recorded baseline/current fingerprints and their diagnostics digest, confirm that the host change is understood, then explicitly run `pnpm update:ui-snapshots`; no pixel comparison from the mismatched environment is evidence. If and only if it instead fails solely with declared Playwright screenshot mismatches, use the printed ignored diagnostics path to verify its manifest and inspect every preserved expected/actual/diff triplet before running the writer. Any other failure follows normal debugging and cannot authorize an update.

After first-generation or changed-baseline review, inspect each full-resolution PNG with the agent's image-view capability and write `docs/engineering/checkpoints/phase5c-visual-baselines.md` with reviewer=`agent`; materialization, presentation and approved Asset Pack digests; the complete `LocalVisualEnvironmentV1` record and canonical fingerprint SHA-256; baseline path/dimensions/SHA-256; comparison evidence (`full_image` for first generation, environment-mismatch evidence when applicable, or the ignored expected/actual/diff paths and manifest digest for a pixel update); and one pass/fail result for each fixed item: clipping/truncation, unintended overlap, focus visibility, dialog/backdrop layering, Stage/HUD/card readability, Interaction layer occlusion, and fallback integrity for every unresolved/failed slot visible in the captured state. Record an explicit acceptance reason per image. A failed rubric item is an implementation defect; it is never waived as taste. This checkpoint approves only the technical test baseline for the already owner-approved runtime pack in that exact local environment; it does not make a new AIGC/commercial-material adoption decision or claim character style, cross-platform pixel identity, or player experience approval.

Expected: exactly the three agent-reviewed Chromium PNG baselines over the default resolved E2E/PoC roots, one canonical matching `environment.v1.json`, and one complete environment/presentation/Asset-Pack digest plus rubric checkpoint exist; `verify:ui-visual` then passes read-only and offline on the recorded host-local environment; all automated accessibility/responsive/motion checks pass in their declared projects; WebKit and touch have no unexplained runtime skip (their intentional `@visual` exclusion is visible in project configuration); Phase 4B asset-provider/fallback and Phase 5B Interaction/fallback tests remain unchanged and green.

- [ ] **Step 7: Commit global accessibility and visual evidence**

```bash
git add -- engine/packages/web/e2e/accessibility.spec.ts engine/packages/web/e2e/responsive.spec.ts engine/packages/web/e2e/reduced-motion.spec.ts engine/packages/web/e2e/visual-regression.spec.ts engine/packages/web/e2e/walking-skeleton.spec.ts engine/packages/web/e2e/__screenshots__/e2e-shell.png engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png engine/packages/web/e2e/__screenshots__/chromium/poc-devdock-overlay.png engine/packages/web/e2e/__screenshots__/chromium/e2e-narrative.png engine/packages/web/playwright.ui.config.ts engine/packages/ui/src/shell/game-shell.tsx engine/packages/ui/src/shell/game-shell.module.css engine/packages/ui/src/theme/global.css engine/packages/ui/src/debug/DevDock.tsx engine/packages/ui/src/debug/DevDock.module.css scripts/ui/run-visual-regression.mts scripts/ui/run-visual-regression.test.ts docs/engineering/checkpoints/phase5c-visual-baselines.md package.json
git diff --cached --name-only
git diff --cached --check
git commit -m "test(ui): enforce global accessible presentation"
```

### Task 9: Freeze the final one-build Phase 5 gate

**Files:**

- Create: `scripts/ui/verify-phase5c.mts`
- Create: `scripts/ui/verify-phase5c.test.ts`
- Rename: `scripts/ui/verify-ui.mts` → `scripts/ui/verify-ui-runtime.mts`
- Rename: `scripts/ui/verify-ui.test.mjs` → `scripts/ui/verify-ui-runtime.test.mjs`
- Create: `scripts/ui/verify-ui.mts`
- Create: `scripts/ui/verify-ui.test.mjs`
- Modify: `scripts/ui/verify-stage-presentation.mts`
- Modify: `scripts/ui/verify-stage-presentation.test.ts`
- Modify: `scripts/verify-semantic.mts`
- Modify: `scripts/verify-semantic.test.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: the Phase 5A UI leaf, Phase 5B Stage/Story verifier and cumulative aliases, all 5C unit/graph/browser/visual checks, exactly one prebuilt E2E/PoC root pair, and the existing Phase 4B E2E-then-PoC headless Semantic verifier.
- Produces: preserved Phase 5A leaf `pnpm verify:ui-runtime`, prebuilt-only Phase 5B leaf `pnpm verify:story-presentation`, inspect-only Phase 5C leaf `pnpm verify:ui-tooling`, cumulative implementation gate `pnpm verify:phase5c`, final prebuilt-only `pnpm verify:ui`, atomic browser extension of `pnpm verify:semantic`, and the complete one-build Phase 5 root verification order.

- [ ] **Step 1: Write failing structured-command, order, no-write, and discovery tests**

```ts
it("runs the final UI phases in exact order without recursion", () => {
  expect(verifyUiCommandsV1).toEqual([
    ["pnpm", ["verify:ui-runtime"]],
    ["pnpm", ["verify:story-presentation"]],
    ["pnpm", ["verify:ui-tooling"]],
  ]);
});

it("keeps Phase 5C inspect-only", () => {
  expect(verifyPhase5cCommandsV1).toEqual([
    [
      "pnpm",
      [
        "--filter",
        "@sillymaker/base",
        "exec",
        "vitest",
        "run",
        "src/contracts/diagnostics.test.ts",
        "src/runtime/diagnostics/debug-bundle.test.ts",
      ],
    ],
    [
      "pnpm",
      ["--filter", "@sillymaker/ui", "exec", "vitest", "run", "src/debug", "src/diagnostics"],
    ],
    [
      "pnpm",
      [
        "--filter",
        "@sillymaker/web",
        "exec",
        "vitest",
        "run",
        "src/capabilities",
        "src/automation",
        "src/application/create-game-runtime.test.ts",
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
        "src/tooling",
        "src/tooling-ui",
        "src/application/create-poc-presentation-runtime.test.ts",
        "src/application/install-poc-hmr.integration.test.ts",
      ],
    ],
    [
      "pnpm",
      [
        "--filter",
        "@project-tavern/story-e2e",
        "exec",
        "vitest",
        "run",
        "src/tooling",
        "src/tooling-ui",
        "src/application",
      ],
    ],
    ["pnpm", ["verify:application-graphs"]],
    [
      "pnpm",
      ["test:e2e:ui", "--", "--project=chromium", "--grep", "@phase5c", "--grep-invert", "@visual"],
    ],
    [
      "pnpm",
      [
        "test:e2e:ui",
        "--",
        "--project=chromium-touch",
        "--grep",
        "@phase5c",
        "--grep-invert",
        "@visual",
      ],
    ],
    [
      "pnpm",
      ["test:e2e:ui", "--", "--project=webkit", "--grep", "@phase5c", "--grep-invert", "@visual"],
    ],
    ["pnpm", ["verify:ui-visual"]],
  ]);
  expect(verifyPhase5cCommandsV1).not.toContainEqual(["pnpm", ["verify:ui"]]);
  expect(JSON.stringify(verifyPhase5cCommandsV1)).not.toMatch(
    /build:|update:|--update-snapshots|vite build/,
  );
});
```

The renamed Phase 5A test keeps the exact original `uiRuntimeVerificationCommandsV1` leaf unchanged. Refactor `stagePresentationVerificationCommandsV1` by removing only its `build:e2e`/`build:poc` commands; it must require both roots already exist and retain every unit, Interaction, Story, asset, boundary, cycle, and type check in prior relative order. Package-script tests require the cumulative implementation aliases shown in Step 3 and forbid any UI leaf from invoking a cumulative phase. Script discovery asserts every `scripts/ui/**/*.test.ts|test.mjs` appears exactly once in `test:scripts`. Root verification begins with exactly one direct read-only `verify:materialization`, then contains exactly one `test:scripts`, one `build:poc`, one `build:e2e`, one inspect-only `verify:semantic`, one inspect-only `verify:ui`, and the remaining asset/boundary/bundle checks; it has no prepare/writer, direct Phase 5 aggregate, remote command, or recursive `pnpm verify` child.

- [ ] **Step 2: Run script tests and confirm the final orchestration is absent**

Run:

```bash
pnpm verify:materialization
pnpm test:scripts
node --test scripts/verify-semantic.test.mjs scripts/verify.test.mjs
```

Expected: FAIL because the preserved runtime-leaf alias, prebuilt-only Story leaf, Phase 5C leaf/cumulative mapping, final inspect-only `verify:ui`, and atomic browser semantic parity are not wired.

- [ ] **Step 3: Implement the inspect-only UI leaves and cumulative implementation aliases**

Rename the existing Phase 5A `verify-ui.mts` and its test to `verify-ui-runtime.*` without changing `uiRuntimeVerificationCommandsV1`; this preserves that inspect-only leaf under the new `verify:ui-runtime` alias. Update `verify:phase5a` to call `verify:ui-runtime`, so later reuse of the public `verify:ui` name cannot recurse through Phase 5B.

Remove the two build commands from `verify-stage-presentation.mts`; it becomes a prebuilt-only leaf and fails with a stable missing-root result instead of rebuilding. Move those builds into the cumulative `verify:phase5b` mapping so Tasks 1–8 retain their convenient complete gate.

`verify-phase5c.mts`, exposed only as `verify:ui-tooling`, runs exactly the ten structured commands in Step 1 and stops on first nonzero exit. It assumes `dist/poc` and `dist/e2e` already exist, never starts Vite, never builds, never updates fixtures/golden/screenshots, and never invokes `verify:ui`, `verify:phase5c`, or any earlier cumulative phase. Capability/content-preference writes occur only inside isolated temporary browser profiles in the cases that explicitly test persistence; the suite deletes those profiles and writes no tracked repository state. Chromium-touch and WebKit are real leaf commands, not manual-only acceptance extras; their project-level `@visual` exclusion avoids extra baselines without a runtime skip.

The new final `verify-ui.mts` runs only `verify:ui-runtime → verify:story-presentation → verify:ui-tooling`; all three leaves inspect the already built roots and none calls a cumulative phase. Add/update:

```json
{
  "scripts": {
    "verify:ui-runtime": "node --experimental-strip-types scripts/ui/verify-ui-runtime.mts",
    "verify:phase5a": "pnpm verify:phase4 && pnpm verify:ui-runtime",
    "verify:phase5b": "pnpm verify:phase5a && pnpm build:e2e && pnpm build:poc && pnpm verify:story-presentation",
    "verify:ui-tooling": "node --experimental-strip-types scripts/ui/verify-phase5c.mts",
    "verify:ui": "node --experimental-strip-types scripts/ui/verify-ui.mts",
    "verify:phase5c": "pnpm verify:phase5b && pnpm verify:ui-tooling"
  }
}
```

- [ ] **Step 4: Extend the existing Semantic verifier with one atomic browser subset**

Preserve the Phase 4B headless order exactly:

```ts
[
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:semantic"]],
  ["pnpm", ["test:e2e:ui", "--", "--project=chromium", "--grep", "@semantic-parity"]],
];
```

The third command inspects the already built roots and proves complete-publication/DOM/Automation parity. It does not build, enable DebugTools, mutate persistent capability/content preferences, or replace the headless suites.

- [ ] **Step 5: Freeze the root verification order and no-write policy**

The root verifier order is:

```text
verify:materialization
test:scripts
typecheck/lint/unit and existing Phase 2–4 gates in their established order
build:poc
build:e2e
verify:semantic # headless E2E → PoC, then browser parity against those unchanged bytes
verify:ui       # runtime → Story presentation → 5C tooling, all against the same bytes
verify:assets
verify:boundaries
verify:bundle
remaining release-independent static checks
```

Replace the direct cumulative Phase 5B root child with its existing Phase 4 prerequisite, then add the exact single build pair followed by Semantic and final UI inspection at the dependency-correct position. The cumulative `verify:phase5b`/`verify:phase5c` aliases remain available for task development but are never root children. Tests reject a second build, build/update/screenshot writers inside any inspect-only verifier, a missing-root auto-build, and tracked changes to golden, Save fixture, command fixture, visual baseline, or AIGC archive paths.

- [ ] **Step 6: Run the complete Phase 5 gate**

Run:

```bash
pnpm verify:materialization
pnpm test:scripts
pnpm build:poc
pnpm build:e2e
pnpm verify:semantic
pnpm verify:ui
pnpm verify:assets
pnpm verify:boundaries
pnpm verify:application-graphs
pnpm verify:bundle
pnpm verify
git diff --check
git status --short --branch
```

Expected: every command exits 0 with no unexplained skip; inspect-only commands rewrite no tracked baseline; both Artifacts are the exact bytes tested; the final status contains only the intended implementation changes before commit.

- [ ] **Step 7: Commit the final Phase 5 gate**

```bash
git add -- scripts/ui/verify-phase5c.mts scripts/ui/verify-phase5c.test.ts scripts/ui/verify-ui-runtime.mts scripts/ui/verify-ui-runtime.test.mjs scripts/ui/verify-ui.mts scripts/ui/verify-ui.test.mjs scripts/ui/verify-stage-presentation.mts scripts/ui/verify-stage-presentation.test.ts scripts/verify-semantic.mts scripts/verify-semantic.test.mjs scripts/verify.mjs scripts/verify.test.mjs package.json
git diff --cached --check
git commit -m "test(ui): freeze complete phase five gate"
```

## Phase 5C Acceptance

Run from the live Phase 5B acceptance SHA plus the complete Phase 5C implementation:

```bash
pnpm verify:materialization
pnpm test:scripts
pnpm build:poc
pnpm build:e2e
pnpm verify:semantic
pnpm verify:ui
pnpm verify:assets
pnpm verify:boundaries
pnpm verify:application-graphs
pnpm verify:bundle
pnpm verify
git diff --check
git status --short --branch
```

Acceptance criteria:

- PoC and E2E each retain exactly one Story-owned Web root and one Artifact. Tooling/debug code may be present in those bytes, but all capabilities are false in a fresh Host store and there is no Developer build/root/HTML.
- DevDock is absent while disabled, reachable from normal/Overlay/Narrative/System/fault surfaces when enabled, separates read-only DebugTools from Cheats, restores focus, and cannot leak input to Stage or Semantic dispatch.
- Story tooling loads only the fixed active-Story Node-safe `./tooling` and browser-only `./tooling-ui` exports after an allowed operation needs them. The PoC form adapter exhaustively constructs the ten existing debug command variants without owning Gameplay validation/execution, and Node/headless paths never parse TSX.
- Automation global is absent by default, revocable after capture, and exposes exactly one versioned Semantic facade. It never exposes DebugTools, Snapshot, State, ContentPreference mutation, Interaction/HitMap execution, fixtures, or arbitrary commands.
- `observe().game`, `observe().narrative`, `observe().actions`, DOM Gameplay controls, `availableActions()`, preview, dispatch, rejection, and `waitForIdle` are tied to complete atomic publications. DOM and direct Automation produce equivalent Story results without sleeps or coordinate scripts.
- Normal Automation and read-only diagnostics keep RunIntegrity normal. Successful existing Cheat/anchor behavior remains capability-gated, marked modified, and durable through the already accepted Save/Replay path.
- Exactly four executable browser cases retain the `@smoke` compatibility tag: fresh capability defaults, Automation Bridge shape, the PoC first ordinary action, and one E2E Semantic command.
- `DebugBundle.uiContext` contains only bounded StageScene/variant/renderer/appearance/interaction/content-preference summaries. Current export receives the active policy explicitly, validates the preference and records its revision/mask; strict import preserves bounded older policy summaries for diagnosis, while presentation/application identity mismatch prevents restoration. It is privacy-safe and non-authoritative and changes no state digest/replay result.
- Player-safe diagnostic export succeeds from normal, blocking Narrative, and fault-pause surfaces in both keyboard-driven Chromium and touch-driven Chromium-touch without internal state/export hooks.
- Phase 5B remains the sole detailed HitMap/Interaction accessibility gate. Phase 5C adds complete-application DOM/Automation parity and global DevDock/capability/browser evidence without duplicating or weakening that gate.
- 1024×768, 1600×1000, 768×1024, 2560×1080, 800×500, equivalent 200% zoom, keyboard-only navigation, WCAG A/AA, text spacing, focus restoration, at-least-44×44 targets, and reduced motion pass in Chromium and WebKit; touch global controls pass in Chromium-touch.
- Exactly three agent-reviewed Chromium PNG baselines over the default resolved E2E/PoC roots pass read-only/offline comparison in the exact host-local `LocalVisualEnvironmentV1` recorded beside them. The Phase 2 `e2e-shell.png`, its `@visual` case, and `update:screenshots` writer are absent. The complete environment fingerprint, presentation/approved Asset Pack digests, each PNG's full path/dimensions/SHA-256, and the fixed technical rubric are recorded; a fingerprint difference fails with `visual_environment_mismatch` until an explicit rebaseline, no verifier updates files or reads AIGC/reference material, and this evidence claims neither cross-platform pixel identity nor a new material/player-experience approval.
- Both prebuilt roots pass traversal-safe serving, application graph, asset, boundary, and bundle checks; Web remains Story-neutral and E2E imports no PoC implementation or ID.
- No Phase 5C change adds Gameplay state, commands, facts, rules, balance, relationship counters, outfit persistence, Narrative control flow, or a second availability calculation.
- The checkpoints record phase-base/head SHA, exact commands/results, R1 materialization digest, Task 5 source-graph manifest digests, capability/publication/parity/a11y evidence, the complete local visual-environment fingerprint, presentation and approved Asset Pack digests, visual-baseline file/comparison digests and rubric results, plus final worktree status. No VoiceOver/device/human-playtest or remote-distribution status belongs to Phase 5C; Phase 6 owns formal local build-input/artifact manifests.
