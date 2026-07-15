# Project Tavern Seven-Day PoC Story and Golden Corpus Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Build the complete non-canonical seven-day `week.poc_001` Story from the Phase 4A Gameplay contracts, supply its content/Narrative/presentation/assets and Story-owned semantic actions, compile six deterministic reference strategies, freeze reviewed golden and Save fixtures, and enforce the exact 1–1000 seed balance thresholds.

**Architecture:** `game/stories/poc` owns one side-effect-free StoryEntry whose source definition materializes a deeply frozen `PocSimulationProgramV1`, creates the already-proven `PocGameSimulationV1` once, and resolves presentation, SceneGraph, fallback assets, and provenance into one `ResolvedGameV1`. Concrete content and balance are data; all Gameplay algorithms, owner boundaries, command execution, queries, and projection remain in Phase 4A. Story integration and reference drivers operate through the real `GameSessionV1` and `SemanticGamePortV1`, while tracked fixtures and golden artifacts are regenerated only by explicit commands and verified read-only by automated gates.

**Tech Stack:** Phase 2–4A Project Tavern packages, Node.js >=22.12.0, pnpm >=11.0.0, strict TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, Canonical JSON, and SHA-256 manifests. The Story-owned SceneGraph introduced here is a Node-importable `.ts` data descriptor; React and the Web-only `.tsx` renderer registry arrive in Phase 5.

## Global Constraints

- Phase 4A `pnpm verify:poc-gameplay` is a hard prerequisite. Consume `PocGameSimulationV1`, its ten Story-local GameplayModules, Rules/Resolvers, `PocGameCommandExecutorV1`, `PocGameDebugCommandExecutorV1`, `PocGameQueriesV1`, and `PocGameViewV1`; do not copy or replace them in content/presentation/tooling code.
- Consume the exact Phase 4A surfaces: the seven `PocRulesV1` slots, the separate Scheduling resolver, all seventeen `PocGameQueriesV1` methods, and the Narrative-free `PocGameViewV1`. Story integration publishes `PocGameViewV1`, `NarrativeProjectionV1 | null`, and semantic actions as three atomic channels built from one Queries instance.
- `docs/engineering/specs/2026-07-12-scene-interaction-character-presentation-design.md` is authoritative for StageScene/variant/rig/HitMap/Interaction/content-policy boundaries and atomic SemanticPublication. Phase 4B registers PoC data and mappings against the Phase 2 contracts; it must not create engine contracts or a second GameView.
- Story identity is exactly `{ id: "week.poc_001", revision: 1 }`; state-contract revision begins at `1`. Package/build key is `poc`, and the package name is `@project-tavern/story-poc`.
- The run is exactly D1–D7: D1–D6 are service days, D7 has no service, levy is due D7 afternoon, and D7 evening is not actionable.
- Use exactly two life policies, four recipes, five ingredients, two customer segments, four service modes, one helper, one facility opportunity, one relationship opportunity, one two-stage WorldAction, one deterministic threshold choice, one four-band 2D6 check, three Auras, five Scheduler events, and three ending IDs defined by `docs/poc/`.
- `game/stories/poc` owns the actual Gameplay data, rules configuration, content, Narrative, presentation, SceneGraph, semantic action mapping, assets, tooling, reference strategies, golden data, and persistence fixtures. Base/UI/Web/E2E must not acquire PoC IDs or gameplay semantics.
- Story source `define()` is synchronous and side-effect-free. It does not read Host state, wall-clock time, storage, network, environment randomness, or tooling configuration.
- StoryDefinition carries `createGameSimulation(program)`, never a pre-resolved GameSimulation. The resolver materializes and freezes the Simulation/Presentation Programs once, creates GameSimulation once, preserves resolved SceneGraph, and returns a frozen `ResolvedGameV1`.
- The default Story/Headless closure contains only a data-only `.ts` SceneGraph: stable renderer IDs, layout/slot descriptors, and Strict JSON presentation data. It contains no JSX, React component, function, DOM/browser object, or import of the Phase 5 Web-only `.tsx` renderer registry.
- Every Task 8–12 test that exercises player behavior uses the real `GameSessionV1` and Story `SemanticGamePortV1`. Tasks 3–7 may call deep-readonly public Rule/Resolver/Query factories only as pure data/provider contract tests; they never call an owner, transaction candidate, normal/debug executor, or mutate Gameplay State to bypass application behavior. Tests may inspect bounded same-attempt evidence only through a test-only harness.
- Semantic actions expose only visible information and legal Gameplay Commands. Automation/reference strategies do not enable DebugTools or Cheats and do not change RunIntegrity.
- Story tooling is part of the same Story×Web Artifact and is capability-gated at runtime. It may be a lazy package export, but it must not create a separate application root, HTML file, build mode, GameSimulation, or Story identity.
- Player-facing text is Chinese; stable identifiers are English. Real text remains in TextCatalogs and does not enter semantic Narrative control flow.
- Every Asset slot always retains its code-native fallback. The default Story statically consumes the predecessor track's committed `approvedPocAssetPacksV1`, which may be empty; only its owner-approved `game/packages/assets/runtime/poc/**` providers may replace matching stable slots. Unapproved Image Gen candidates, `art-source/aigc/**`, and `references/**` must not enter Asset Packs, resolved providers, digests, screenshots, or generation inputs.
- The current seven-day PoC registers no restricted content flags: its policy has `flags=[]`, `presets=[]`, `defaultAllowedFlags=emptyContentMaturityFlagsV1` (runtime value `0`), and every Presentation requirement reuses that empty mask. It adds no daily-touch reward, touch counter, relationship reaction rule, persistent outfit choice, new state/command/action, or suggestive/sexual/explicit runtime content; those require an explicit Phase 4A/4B gameplay revision rather than a presentation shortcut.
- `references/` and `art-source/aigc/**` are never imported, scanned, copied, bundled, or used by tests/generators.
- Command, golden, and Save fixture verification is read-only. Only `update:commands`, `update:golden`, and `update:fixtures` may rewrite their respective tracked directories. The executing agent performs the frozen technical baseline review described below; no human approval is required inside the engineering Goal.
- Task 10 calibration updates `docs/poc/balance-v0.md` and `src/content/balance.ts` together before any golden exists; Task 11 is the immediately following checkpoint and freezes output only after the balance gate passes. Once Task 11 has committed golden files, any later balance change must update the document, concrete balance, metrics evidence, and agent-reviewed golden outputs in the same change; implementation never silently tunes around a failing gate.
- No second week, long-term skill tree, employee progression, full facility tree, weather, seasons, dynamic prices, combat, equipment, minigames, metaprogression, runtime LLM, backend, cloud save, or generalized scripting language is added.
- Every task uses TDD, passes its focused tests plus `pnpm typecheck && pnpm verify`, and ends with a narrow commit.
- R1 has already materialized every exact dependency. Phase 4B performs no registry/install write, never runs `pnpm add`, and leaves `pnpm-lock.yaml` byte-identical; package changes are scripts, exports, and license metadata only.
- The executing agent writes complete provisional Chinese TextCatalog/Narrative copy and continues without requesting line-edit approval. `TODO`, placeholder, blank, or deliberately unfinished player-facing strings fail Story validation. Formal copy review, asset preparation/selection, art judgment, and human playtesting are separate tasks outside this plan and cannot block the engineering Goal.
- Phase 4A and 4B test leaves remain orthogonal: `test:gameplay` is the permanently frozen Phase 4A file list, while Phase 4B defines an exact `test:story` list for content/application tests. Baseline and 1–1000 gates run only through their named verifier and are not smuggled into either leaf.

## Unattended prerequisite, resume, staging, and baseline-review contract

Before Task 1, run:

```bash
test -z "$(git status --porcelain=v1)"
pnpm verify:materialization
pnpm verify:phase2
pnpm verify:persistence-diagnostics
pnpm verify:poc-gameplay
pnpm verify
git diff --exit-code -- pnpm-lock.yaml
test -z "$(git status --porcelain=v1)"
```

Expected: every command exits 0. `verify:materialization` validates `scripts/preflight/materialization-lock.json` plus `.project-tavern/goal-materialization.json`; missing/stale state exits as `external_precondition.materialization_stale` before edits. A missing Phase 2/3/4A API or gate is repaired in its owning phase, never papered over in Story content.

Each task is a resumable checkpoint. On entry inspect `git status --short --branch` and the task's exact paths; resume plan-owned partial work at the first unproven step. Before every commit use only the task's explicit `git add -- <paths...>`, inspect `git diff --cached --name-only`, and fail if any staged path is outside that task. Never use `git add -A`, wildcard staging, amend, or unrelated cleanup. After commit require a clean status and byte-identical `pnpm-lock.yaml`.

For the first creation or any intentional update of commands/golden/Save baselines, the writer is separate from verification. Immediately after generation run `git add -N -- <baseline-directory>`, show the complete `git diff --no-ext-diff -- <baseline-directory>`, and create a path-sorted full hash list with `find <baseline-directory> -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2`. Baseline paths are controlled repository paths and may not contain newlines. The agent must record and check: exact expected file count, strict schema/closed references, deterministic ordering/provenance, command `order/day/phase/commandSequence`, same-attempt RNG/fact evidence where applicable, negative-fixture single-field differences, and absence of Debug/Cheat/private-state decisions. Save the pre-verification hash list in an ignored temporary path, rerun the read-only gate twice, recompute and `diff` the full list, then stage exact paths. This technical approval is sufficient for the Goal and is not a human playtest/copy/art approval.

---

## File Map

```text
game/stories/poc/
  package.json
  tsconfig.json
  LICENSE.md
  src/
    index.ts
    story-definition.ts
    patch-surfaces.ts
    tooling-fixtures.ts
    content/
      identity.ts
      ids.ts
      core-definitions.ts
      story-data.ts
      state-definitions.ts
      balance.ts
      ingredients-recipes.ts
      actions.ts
      facilities-auras.ts
      events.ts
      checks-endings.ts
      narrative/
        d1-d4.ts
        relationship.ts
        investigation.ts
        index.ts
    presentation/
      text-catalogs/zh-CN.ts
      text-catalogs/index.ts
      assets.ts
      scene-graph.ts
      interaction-catalog.ts
      content-maturity-policy.ts
      semantic-actions.ts
    application/
      create-poc-semantic-port.ts
    tooling/
      index.ts
      fixtures.ts
      notes.ts
    testing/
      poc-story-harness.ts
      reference-strategy-definitions.ts
      compile-reference-strategy.ts
      run-reference-strategy.ts
      balance-metrics.ts
      balance-calibration.ts
      counterfactual-scenarios.ts
      golden-artifact.ts
      save-fixture-builder.ts
      save-fixture-provenance.ts
      poc-runtime-test-fixture.ts
    test/
      story-validation.test.ts
      daily-gates.test.ts
      relationship-content.test.ts
      investigation-content.test.ts
      ending-forecast.test.ts
      story-data.test.ts
      semantic-flow.integration.test.ts
      relationship-route.integration.test.ts
      investigation-route.integration.test.ts
      terminal-route.integration.test.ts
      reference-strategies.test.ts
      golden-week.test.ts
      balance-1000-seeds.test.ts
      save-fixtures.test.ts
      tooling.test.ts
      tooling-runtime.integration.test.ts
      fixtures/{commands,golden,saves}/
  scripts/
    update-command-fixtures.mjs
    update-golden.mjs
    update-save-fixtures.mjs
```

## Task 1: Freeze Story Identity and the Closed Content-ID Catalog

**Files:**

- Create: `game/stories/poc/src/content/identity.ts`
- Create: `game/stories/poc/src/content/ids.ts`
- Create: `game/stories/poc/src/test/story-validation.test.ts`

**Interfaces:**

- Consumes: Base identity/safe-integer parsers, PoC stable-ID parsers from Phase 4A, Story source identity contract, and the exact tables in `docs/poc/content-and-playtest.md`.
- Produces: `pocStoryIdentityV1`, `pocStateContractRevisionV1`, `pocReferenceSeedV1`, six fixed `pocReferenceRunIdsV1`, `pocStoryTitleTextIdV1`, `pocNoContentFilterOptionsTextIdV1`, complete closed readonly ID arrays/registries consumed by every later content file, and the explicitly empty `itemIdsV1`.

- [ ] **Step 1: Write the failing identity and namespace test**

```ts
// game/stories/poc/src/test/story-validation.test.ts
import { describe, expect, it } from "vitest";
import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import {
  actionIdsV1,
  eventIdsV1,
  ingredientIdsV1,
  pocGameSymbolIdsV1,
  pocHeroineAppearanceLayerOrderV1,
  pocHeroinePresentationIdsV1,
  pocNoContentFilterOptionsTextIdV1,
  pocStoryTitleTextIdV1,
  pocSemanticWorkflowActionIdsV1,
  itemIdsV1,
  recipeIdsV1,
  textIdsV1,
} from "../content/ids.js";

describe("week.poc_001 identity", () => {
  it("freezes the Story and six deterministic runs", () => {
    expect(pocStoryIdentityV1).toEqual({ id: "week.poc_001", revision: 1 });
    expect(pocReferenceSeedV1).toBe(0x00023049);
    expect(new Set(Object.values(pocReferenceRunIdsV1)).size).toBe(6);
  });

  it("keeps Event and player Action namespaces distinct", () => {
    expect(eventIdsV1).toHaveLength(5);
    expect(new Set([...eventIdsV1, ...actionIdsV1, ...ingredientIdsV1, ...recipeIdsV1]).size).toBe(
      eventIdsV1.length + actionIdsV1.length + ingredientIdsV1.length + recipeIdsV1.length,
    );
  });

  it("freezes fourteen Story-owned world symbols outside UI", () => {
    expect(pocGameSymbolIdsV1).toHaveLength(14);
    expect(new Set(pocGameSymbolIdsV1).size).toBe(14);
    expect(pocGameSymbolIdsV1.every((id) => id.startsWith("symbol.poc."))).toBe(true);
  });

  it("freezes seven workflow controls outside generic StoryContent actions", () => {
    expect(pocSemanticWorkflowActionIdsV1).toHaveLength(7);
    expect(new Set([...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]).size).toBe(
      actionIdsV1.length + pocSemanticWorkflowActionIdsV1.length,
    );
  });

  it("freezes the PoC heroine renderer identity and seven authored layer slots", () => {
    expect(pocHeroinePresentationIdsV1).toEqual({
      characterId: "character.poc.heroine",
      rigId: "rig.poc.heroine.default",
      poseId: "pose.poc.heroine.idle",
      expressionId: "expression.poc.heroine.neutral",
      activityId: "activity.poc.heroine.idle",
      hitMapId: "hit_map.poc.heroine.idle",
      rendererId: "renderer.poc.character.paper_doll",
      staticFallbackAssetId: "asset.poc.character.heroine.static.standard",
    });
    expect(pocHeroineAppearanceLayerOrderV1).toHaveLength(7);
    expect(new Set(pocHeroineAppearanceLayerOrderV1).size).toBe(7);
  });

  it("freezes the truthful empty content-filter setting label before UI composition", () => {
    expect(pocNoContentFilterOptionsTextIdV1).toBe("text.poc.settings.content_filter.none");
    expect(pocStoryTitleTextIdV1).toBe("text.poc.story.title");
    expect(textIdsV1).toContain(pocStoryTitleTextIdV1);
    expect(itemIdsV1).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and confirm missing identity/content files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/story-validation.test.ts`

Expected: FAIL with unresolved `content/identity.js` and `content/ids.js`.

- [ ] **Step 3: Implement exact identity and deterministic run IDs**

```ts
export const pocStoryIdentityV1 = Object.freeze({
  id: parseStoryId("week.poc_001"),
  revision: parsePositiveSafeInteger(1),
});

export const pocStateContractRevisionV1 = parsePositiveSafeInteger(1);
export const pocReferenceSeedV1 = parseNonZeroUint32(0x00023049);

export const pocReferenceRunIdsV1 = Object.freeze({
  "strategy.cash_first": parseRunId("00000000-0000-4000-8000-000000000101"),
  "strategy.relationship_first": parseRunId("00000000-0000-4000-8000-000000000102"),
  "strategy.investigation_first": parseRunId("00000000-0000-4000-8000-000000000103"),
  "strategy.full_delegation": parseRunId("00000000-0000-4000-8000-000000000104"),
  "strategy.two_closures_recovery": parseRunId("00000000-0000-4000-8000-000000000105"),
  "strategy.explicit_failure": parseRunId("00000000-0000-4000-8000-000000000106"),
} as const);
```

`ids.ts` parses and freezes every policy, actor, character, ingredient, recipe, segment, mode, facility, aura, action, event, check/band, fact, quest, outcome, ending, reason, modifier source, Narrative scene/node/choice/checkpoint, Text, Asset, StageScene, StageSceneVariant, Character/rig/pose/expression/activity/appearance/HitMap, InteractionSurface, InteractionTarget, and InteractionBehavior ID from the PoC documents. This Task is the complete ID authority: Tasks 2–13 may consume these registries but never modify `ids.ts` or construct a stable ID from an unregistered raw string. `itemIdsV1` is deliberately empty for revision 1. Narrative `SceneId` and Presentation `StageSceneId` remain distinct branded namespaces。十四个 `symbol.poc.*` 值在这里仅作为严格、唯一、冻结的 Story 字符串登记；`pocStoryTitleTextIdV1` 与 `pocNoContentFilterOptionsTextIdV1` 精确解析 `text.poc.story.title` / `text.poc.settings.content_filter.none`，后者为 Phase 5B 的空策略 Settings 提供上游权威 ID。Phase 4B 不导入 UI，也不调用尚由 Phase 5A 才提供的 `parseGameSymbolIdV1`。

The presentation catalog is closed to these exact Stage identities:

```ts
export const pocStageSceneIdsV1 = Object.freeze([
  "stage_scene.poc.main_menu",
  "stage_scene.poc.tavern",
  "stage_scene.poc.market",
  "stage_scene.poc.world_map",
  "stage_scene.poc.week_summary",
] as const);

export const pocStageSceneVariantIdsV1 = Object.freeze([
  "stage_variant.poc.main_menu.default",
  "stage_variant.poc.tavern.day",
  "stage_variant.poc.tavern.evening",
  "stage_variant.poc.market.day",
  "stage_variant.poc.world_map.default",
  "stage_variant.poc.week_summary.default",
] as const);

export const pocInteractionSurfaceIdsV1 = Object.freeze([
  "surface.poc.heroine",
  "surface.poc.tavern",
  "surface.poc.market",
  "surface.poc.world_map",
] as const);

export const pocInteractionTargetIdsV1 = Object.freeze([
  "target.poc.heroine.figure",
  "target.poc.tavern.service",
  "target.poc.market.purchase",
  "target.poc.world_map.old_trade_road",
] as const);

export const pocInteractionBehaviorIdsV1 = Object.freeze([
  "behavior.poc.heroine.open_profile",
  "behavior.poc.heroine.repair_sign",
  "behavior.poc.heroine.apologize",
  "behavior.poc.tavern.service_plan",
  "behavior.poc.market.purchase",
  "behavior.poc.world_map.old_trade_road",
] as const);

export const pocHeroinePresentationIdsV1 = Object.freeze({
  characterId: "character.poc.heroine",
  rigId: "rig.poc.heroine.default",
  poseId: "pose.poc.heroine.idle",
  expressionId: "expression.poc.heroine.neutral",
  activityId: "activity.poc.heroine.idle",
  hitMapId: "hit_map.poc.heroine.idle",
  rendererId: "renderer.poc.character.paper_doll",
  staticFallbackAssetId: "asset.poc.character.heroine.static.standard",
} as const);

export const pocHeroineAppearanceLayerOrderV1 = Object.freeze([
  "appearance_layer.poc.heroine.back_hair",
  "appearance_layer.poc.heroine.costume_body",
  "appearance_layer.poc.heroine.face",
  "appearance_layer.poc.heroine.front_hair",
  "appearance_layer.poc.heroine.accessory",
  "appearance_layer.poc.heroine.held_prop",
  "appearance_layer.poc.heroine.foreground_effect",
] as const);

export const pocGameSymbolIdsV1 = Object.freeze([
  "symbol.poc.actor.stamina",
  "symbol.poc.actor.mood",
  "symbol.poc.economy.cash",
  "symbol.poc.tavern.reputation",
  "symbol.poc.obligation.levy",
  "symbol.poc.inventory.ingredient",
  "symbol.poc.relationship.affection",
  "symbol.poc.relationship.teamwork",
  "symbol.poc.action.purchase",
  "symbol.poc.action.service",
  "symbol.poc.overlay.ledger",
  "symbol.poc.overlay.facility",
  "symbol.poc.facility.cold_storage",
  "symbol.poc.facility.comfortable_bed",
] as const);

export const pocSemanticWorkflowActionIdsV1 = Object.freeze([
  "action.run_start",
  "action.tavern_opening_start",
  "action.tavern_opening_continue",
  "action.tavern_opening_finalize",
  "action.world_action_complete",
  "action.narrative_advance",
  "action.narrative_choose",
] as const);
```

`behavior.poc.heroine.open_profile` is Presentation-only. The other five behaviors join only to already-existing Phase 4A action descriptors; they do not introduce commands or rewards. Body-part target IDs are deliberately absent from this PoC catalog。纸娃娃顺序、角色/rig/pose/expression/activity/HitMap/renderer/static fallback 身份同样由这里唯一冻结；Phase 5B 只能消费，不能重命名或重排。

- [ ] **Step 4: Run focused and repository verification**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/story-validation.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; identity/revision/seed/run IDs and every content namespace are exact, unique, deeply frozen, and parser-valid.

- [ ] **Step 5: Commit identity and IDs**

```bash
git add -- game/stories/poc/src/content/identity.ts game/stories/poc/src/content/ids.ts game/stories/poc/src/test/story-validation.test.ts
git commit -m "feat(story-poc): freeze story identity catalog"
```

## Task 2: Encode Initial State, Balance, Ingredients, and Recipes

**Files:**

- Create: `game/stories/poc/src/content/core-definitions.ts`
- Create: `game/stories/poc/src/content/state-definitions.ts`
- Create: `game/stories/poc/src/content/balance.ts`
- Create: `game/stories/poc/src/content/ingredients-recipes.ts`
- Create: `game/stories/poc/src/test/daily-gates.test.ts`

**Interfaces:**

- Consumes: exact `docs/poc/balance-v0.md` values, Task 1's complete ID registries, and Phase 4A strict value/definition/State schemas.
- Produces: `pocStoryManifestV1: StoryManifestV1`, `pocStateDefinitionsV1`, `pocInitialStateV1`, exact `pocBalanceV1: StoryBalanceV1`, and the sole named source-definition arrays `pocTextEntriesV1`, `pocCharacterDefinitionsV1`, `pocReasonDefinitionsV1`, `pocCustomerSegmentDefinitionsV1`, `pocModifierSourceDefinitionsV1`, `pocItemDefinitionsV1`, `pocIngredientDefinitionsV1`, and `pocRecipeDefinitionsV1`. It does not create a partial production SimulationData object or a second initial-state factory.

- [ ] **Step 1: Write failing exact source-component tests**

```ts
it("encodes the closed source economy components", () => {
  expect(pocIngredientDefinitionsV1).toHaveLength(5);
  expect(pocRecipeDefinitionsV1).toHaveLength(4);
  expect(pocBalanceV1.lifePolicies).toHaveLength(2);
  expect(pocCustomerSegmentDefinitionsV1).toHaveLength(2);
  expect(pocStoryManifestV1).toEqual({
    titleTextId: "text.poc.story.title",
    initialSceneId: "scene.poc.manifest_start",
    playableDays: 7,
  });
  expect(pocTextEntriesV1.map(({ textId }) => textId)).toEqual(textIdsV1);
  expect(pocTextEntriesV1.every((entry) => Object.keys(entry).join() === "textId")).toBe(true);
  expect(pocCharacterDefinitionsV1).toHaveLength(3);
  expect(pocCharacterDefinitionsV1.map(({ characterId }) => characterId)).toEqual(characterIdsV1);
  expect(pocReasonDefinitionsV1.map(({ reasonId }) => reasonId)).toEqual(reasonIdsV1);
  expect(pocCustomerSegmentDefinitionsV1.map(({ segmentId }) => segmentId)).toEqual(
    customerSegmentIdsV1,
  );
  expect(pocModifierSourceDefinitionsV1.map(({ sourceId }) => sourceId)).toEqual(
    modifierSourceIdsV1,
  );
  expect(pocModifierSourceDefinitionsV1).toHaveLength(2);
  expect(pocItemDefinitionsV1.map(({ itemId }) => itemId)).toEqual(itemIdsV1);
  expect(pocItemDefinitionsV1).toEqual([]);
  expect(pocBalanceV1.serviceModes).toHaveLength(4);
  expect(Object.keys(pocBalanceV1)).toEqual([
    "lifePolicies",
    "actionCosts",
    "serviceModes",
    "serviceDays",
    "baseDemand",
    "ledgerReasons",
    "emergencyClosure",
    "plannedClosureReasonId",
    "heroineNightRecovery",
    "heroineNightRecoveryReasonId",
    "restRecovery",
    "purchaseLineLimit",
    "menuRecipeLimit",
    "dailyPreparationLimit",
    "openingFee",
    "levyAmount",
    "levyDue",
    "obligationForecast",
    "endingPolicy",
    "maxNarrativeStepsPerCommand",
    "maxNarrativeCallDepth",
  ]);
  expect(pocBalanceV1.actionCosts).toEqual([
    {
      action: "inventory.buy",
      apCost: 1,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: "reason.action.purchase",
    },
    {
      action: "actor.prepare_food",
      apCost: 1,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: "reason.action.prepare_food",
    },
    {
      action: "actor.rest",
      apCost: 1,
      playerStaminaCost: 0,
      heroineStaminaCost: 0,
      reasonId: "reason.action.rest",
    },
    {
      action: "facility.choose.build",
      apCost: 2,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: "reason.action.facility_build",
    },
  ]);
  expect(pocBalanceV1.baseDemand).toEqual(
    [
      [1, 6, 2],
      [2, 5, 3],
      [3, 7, 2],
      [4, 4, 5],
      [5, 3, 7],
      [6, 6, 4],
    ].flatMap(([day, locals, travelers]) => [
      { day, segmentId: "segment.locals", customers: locals },
      { day, segmentId: "segment.travelers", customers: travelers },
    ]),
  );
  expect(pocBalanceV1.ledgerReasons).toEqual({
    purchase: "reason.ledger.purchase",
    serviceWage: "reason.ledger.wage",
    openingFee: "reason.ledger.opening_fee",
    revenue: "reason.ledger.revenue",
    discardedFood: "reason.ledger.discarded_food",
    spoiledIngredient: "reason.ledger.spoiled_ingredient",
    facilityBuild: "reason.ledger.facility_build",
    worldActionCost: "reason.ledger.world_action_cost",
    levy: "reason.ledger.levy",
  });
  expect(pocBalanceV1).toMatchObject({
    emergencyClosure: {
      reputationPenalty: 1,
      reasonId: "reason.service.emergency_closed",
    },
    plannedClosureReasonId: "reason.service.closed",
    heroineNightRecovery: 3,
    heroineNightRecoveryReasonId: "reason.recovery.heroine_night",
    restRecovery: 3,
    purchaseLineLimit: 5,
    menuRecipeLimit: 2,
    dailyPreparationLimit: 2,
    openingFee: 2,
    levyAmount: 140,
    levyDue: { day: 7, phase: "afternoon" },
    obligationForecast: {
      visibleFrom: { day: 3, phase: "morning" },
      conservativeFrom: { day: 5, phase: "morning" },
      reasonId: "reason.obligation.levy_forecast",
    },
    endingPolicy: {
      stableMinimumCashAfterLevy: 20,
      stableMinimumReputation: 50,
      stableMinimumBuiltFacilities: 1,
      reputationCrisisBelow: 45,
    },
    maxNarrativeStepsPerCommand: 128,
    maxNarrativeCallDepth: 8,
  });
  expect(pocBalanceV1.obligationForecast.recommendations).toHaveLength(5);
  expect(Object.values(pocBalanceV1.endingPolicy).slice(4)).toEqual([
    "reason.ending.stable",
    "reason.ending.danger",
    "reason.ending.arrears",
    "reason.ending.reputation_crisis",
  ]);

  expect(pocInitialStateV1.ingredientBatches).toEqual([]);
  expect(pocInitialStateV1.itemStacks).toEqual([]);
  expect(pocInitialStateV1.auras).toEqual([]);
});
```

- [ ] **Step 2: Run and confirm missing data files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/daily-gates.test.ts`

Expected: FAIL because core-definition/balance/state/ingredient/recipe files do not exist.

- [ ] **Step 3: Implement strict frozen data**

```ts
export const pocServiceDaysV1 = Object.freeze([1, 2, 3, 4, 5, 6].map(parseDayIndex));

export const pocStoryManifestV1: DeepReadonly<StoryManifestV1> = deepFreeze({
  titleTextId: pocStoryTitleTextIdV1,
  initialSceneId: pocManifestStartSceneIdV1,
  playableDays: parsePositiveSafeInteger(7),
});

export const pocCustomerSegmentDefinitionsV1 = buildPocCustomerSegmentsV1();

export const pocBalanceV1: DeepReadonly<StoryBalanceV1> = deepFreeze(
  pocStoryBalanceSchemaV1.parse({
    lifePolicies: buildPocLifePoliciesV1(),
    actionCosts: buildPocActionCostsV1(),
    serviceModes: buildPocServiceModesV1(),
    serviceDays: pocServiceDaysV1,
    baseDemand: buildPocBaseDemandV1(pocServiceDaysV1, pocCustomerSegmentDefinitionsV1),
    ledgerReasons: pocLedgerReasonsV1,
    emergencyClosure: pocEmergencyClosureV1,
    plannedClosureReasonId: pocPlannedClosureReasonIdV1,
    heroineNightRecovery: 3,
    heroineNightRecoveryReasonId: pocHeroineNightRecoveryReasonIdV1,
    restRecovery: 3,
    purchaseLineLimit: 5,
    menuRecipeLimit: 2,
    dailyPreparationLimit: 2,
    openingFee: 2,
    levyAmount: 140,
    levyDue: { day: 7, phase: "afternoon" },
    obligationForecast: pocObligationForecastPolicyV1,
    endingPolicy: pocEndingPolicyV1,
    maxNarrativeStepsPerCommand: 128,
    maxNarrativeCallDepth: 8,
  }),
);
```

`core-definitions.ts` is the one authority for the complete source `texts`, `characters`, `reasons`, `customerSegments`, `modifierSources`, and `items` arrays. Each array follows its Task 1 closed ID order, is strict-validated/deep-frozen, and has exact ID/TextId/reference tests; there are exactly three Story characters and two Story modifier sources, while the PoC `items` array is empty rather than omitted. A `TextEntryV1` contains only its stable `textId`, never the real Chinese string. No later task recreates one of these definitions.

Copy every numeric value, Reason binding, formula input, and recommendation exactly from the current balance document. `playableDays` belongs to source `StoryManifestV1` and later projects into `PocSimulationManifestV1`; `customerSegments` belongs only to Story/simulation content; neither is a `StoryBalanceV1` field. Phase 4A owns and exports the exact strict `pocStoryBalanceSchemaV1` used here. Balance uses the exact 21-key Catalog shape above, with four action-cost rows, the complete 6-day × 2-segment base-demand matrix, nine ledger bindings, emergency/planned closure policy, both recovery bindings, preparation/menu/purchase limits, opening fee, levy/forecast/ending policies, and Narrative limits. Strict schema and exact-key tests reject every missing/extra field and prove all Reason/Text/Action/segment references resolve. `maxNarrativeStepsPerCommand=128` and `maxNarrativeCallDepth=8` use the exact `StoryBalanceV1` field names consumed by the Phase 4A interpreter and reject a stale `64`/`4` literal or alias field. Ingredients include price, shelf life, valuation, and stable reason IDs; recipes include required quantities, menu value, and equipment gates. `pocInitialStateV1` contains no ingredient batch, item, or Aura and initializes every source-owned value exactly once. Complete concrete sequence-zero GameSimulation validation waits until Task 6 has assembled all eighteen Story content fields.

- [ ] **Step 4: Run balance/schema and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/daily-gates.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; exact source manifests/definitions/counts/values, referential closure, strict schemas, source initial values, and canonical round-trip pass. RunIntegrity is tested only on a complete GameSnapshot/GameSession, never inferred from source initial data.

- [ ] **Step 5: Commit initial data**

```bash
git add -- game/stories/poc/src/content/core-definitions.ts game/stories/poc/src/content/state-definitions.ts game/stories/poc/src/content/balance.ts game/stories/poc/src/content/ingredients-recipes.ts game/stories/poc/src/test/daily-gates.test.ts
git commit -m "feat(story-poc): encode initial economy data"
```

## Task 3: Encode D1–D4 Actions, Facilities, Auras, and Scheduler Events

**Files:**

- Create: `game/stories/poc/src/content/actions.ts`
- Create: `game/stories/poc/src/content/facilities-auras.ts`
- Create: `game/stories/poc/src/content/events.ts`
- Create: `game/stories/poc/src/content/narrative/d1-d4.ts`
- Create: `game/stories/poc/LICENSE.md`
- Modify: `game/stories/poc/package.json`
- Modify: `game/stories/poc/src/test/daily-gates.test.ts`

**Interfaces:**

- Consumes: Task 1 IDs, Task 2 balance/data, Narrative IR schemas, Action/Event/Aura/Facility definitions, and the D1–D4 scenario in `docs/poc/content-and-playtest.md`.
- Produces: `pocActionDefinitionsV1`, `pocFacilityDefinitionsV1`, the sole `pocFacilityOpportunityDefinitionsV1`, `pocAuraDefinitionsV1`, `pocEventDefinitionsV1`, and `pocNarrativeD1D4V1`.

- [ ] **Step 1: Write failing chronology and count tests**

```ts
it("freezes the D1-D4 authored surface", () => {
  expect(pocAuraDefinitionsV1).toHaveLength(3);
  expect(pocEventDefinitionsV1).toHaveLength(5);
  expect(pocFacilityDefinitionsV1).toHaveLength(2);
  expect(pocFacilityOpportunityDefinitionsV1).toEqual([
    expect.objectContaining({
      opportunityId: "action.facility_window",
      facilityIds: ["facility.cold_storage", "facility.comfortable_bed"],
    }),
  ]);
  expect(pocEventDefinitionsV1.map((event) => event.eventId)).toEqual([
    "event.tutorial_first_service",
    "event.supplier_invoice",
    "event.helper_available",
    "event.facility_window",
    "event.levy_due",
  ]);
  expect(validateNarrativeReachabilityV1(pocNarrativeD1D4V1)).toEqual([]);
});
```

- [ ] **Step 2: Run and confirm missing content**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/daily-gates.test.ts`

Expected: FAIL with unresolved action/facility/Aura/event/Narrative imports.

- [ ] **Step 3: Add exact D1–D4 content and activate mixed licensing atomically**

Actions encode purchase, preparation, rest, service-plan, phase/levy, StoryAction, WorldAction, and facility-opportunity gates/costs. Opening start/continue/finalize are deliberately absent from generic `StoryContent.actions`: `PocGameQueriesV1.getTavernOpeningControl()` is their only UI projection and exposes exactly one context-valid branch. The D2 invoice `[智力 B]` choice consumes zero AP and zero RNG, appends the exact +4 ledger effect, and sets the weekly fact. `facilities-auras.ts` owns the only `FacilityOpportunityDefinitionV1` array: exactly one `action.facility_window` entry references both facilities in authored order and freezes build/skip confirmation, availability and skip Reason once. D4 facility definitions own their costs/modifiers and never duplicate the opportunity. The three Aura definitions freeze the exact duration policies: anger is `day_end × 2`, repaired-sign is applicable-successful `opening × 1`, and adventure strain is `night_recovery × 1`; no content carries `expiresAt` or invents a condition expiry. Scheduler events use the fixed total order and stable blocking arbitration; Event IDs are never reused as player Action IDs.

```ts
export const pocEventDefinitionsV1 = deepFreeze(
  pocEventDefinitionsSchemaV1.parse([
    buildTutorialFirstServiceEventV1(),
    buildSupplierInvoiceEventV1(),
    buildHelperAvailableEventV1(),
    buildFacilityWindowEventV1(),
    buildLevyDueEventV1(),
  ]),
);
```

Create `game/stories/poc/LICENSE.md` in the same commit: executable software remains PolyForm Noncommercial, while `src/content/narrative/**` is CC BY-NC-SA 4.0. Change package metadata to `SEE LICENSE IN LICENSE.md`; do not add a tooling export yet.

- [ ] **Step 4: Run content, licensing, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/daily-gates.test.ts && pnpm verify && pnpm typecheck`

Expected: PASS; D1–D4 reachability/gates/counts/references pass and package license scope matches the files introduced in this task.

- [ ] **Step 5: Commit D1–D4 content**

```bash
git add -- game/stories/poc/src/content/actions.ts game/stories/poc/src/content/facilities-auras.ts game/stories/poc/src/content/events.ts game/stories/poc/src/content/narrative/d1-d4.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/LICENSE.md game/stories/poc/package.json
git commit -m "feat(story-poc): add early-week content"
```

## Task 4: Implement the D5 Relationship Branch and D6 Apology Content

**Files:**

- Create: `game/stories/poc/src/content/narrative/relationship.ts`
- Create: `game/stories/poc/src/test/relationship-content.test.ts`
- Modify: `game/stories/poc/src/content/actions.ts`

**Interfaces:**

- Consumes: relationship State/Effect contracts, StoryAction/Narrative IR, exact conditions in the PoC content document, and Task 3 Narrative definitions.
- Produces: `pocRelationshipNarrativeV1`, the exact `pocRelationshipStoryActionDefinitionsV1` relationship/apology entries, and exact pending/completed/abandoned/unresolved/reconciled outcomes.

- [ ] **Step 1: Write failing route and Aura tests**

```ts
it("keeps ignoring the relationship route valid and makes conflict exceptional", () => {
  const content = pocRelationshipNarrativeV1;
  expect(content.start.conditions).toContainEqual({
    kind: "outcome.equals",
    outcomeId: parseOutcomeId("outcome.investigation"),
    value: "investigation.not_attempted",
  });
  expect(content.unstartedEndingOutcome).toEqual({
    outcomeId: "outcome.relationship_opportunity",
    value: "relationship.pending",
  });
  expect(content.conflictChoice.effects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "relationship.affection.adjust", delta: expect.any(Number) }),
      expect.objectContaining({ kind: "aura.apply", auraId: "heroine.angry" }),
    ]),
  );
});

it("allows apology or time policy to clear anger without rewriting relationship", () => {
  expect(pocRelationshipNarrativeV1.apology.effects).toContainEqual(
    expect.objectContaining({ kind: "aura.clear", auraId: "heroine.angry" }),
  );
});
```

- [ ] **Step 2: Run and confirm missing relationship content**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/relationship-content.test.ts`

Expected: FAIL because relationship Narrative/actions do not exist.

- [ ] **Step 3: Encode the complete branch without a second relationship system**

Use the existing Actors relationship State and Status Aura. Content defines conditions/effects only. The engine enum remains exactly `stranger | dislike | cold | friendly | trust | admiration | lovers`, while this seven-day PoC initializes and keeps the derived stage at `cold`; affection and teamwork may change but are not stage names. Starting this branch blocks investigation; not starting it is valid. Offending choices apply explicit affection loss and the `day_end × 2` anger Aura; apology clears the matching Aura target, while natural expiry follows its countdown policy. Neither path overwrites mood or relationship stage.

- [ ] **Step 4: Run content and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/relationship-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all route outcomes, sign/range constraints, mutual-exclusion gates, anger application/clear, and stable references validate.

- [ ] **Step 5: Commit relationship content**

```bash
git add -- game/stories/poc/src/content/narrative/relationship.ts game/stories/poc/src/content/actions.ts game/stories/poc/src/test/relationship-content.test.ts
git commit -m "feat(story-poc): add relationship branch"
```

## Task 5: Implement the Two-Stage Investigation and D6 Consequences

**Files:**

- Create: `game/stories/poc/src/content/narrative/investigation.ts`
- Create: `game/stories/poc/src/content/checks-endings.ts`
- Create: `game/stories/poc/src/test/investigation-content.test.ts`
- Modify: `game/stories/poc/src/content/actions.ts`

**Interfaces:**

- Consumes: WorldAction/Workflow/Check/Outcome IR, PoC check resolver contract, mutual-exclusion facts/outcomes, and reference seed.
- Produces: `pocInvestigationNarrativeV1`, the sole `pocWorldActionDefinitionsV1`, the sole `pocCheckDefinitionsV1`, one threshold choice, one four-band 2D6 check, investigation outcomes/effects, and D6 consequences.

- [ ] **Step 1: Write failing content and fixed-vector tests**

```ts
it("defines one two-stage investigation and one persisted check", () => {
  expect(pocInvestigationNarrativeV1.worldAction.steps).toHaveLength(2);
  expect(pocInvestigationNarrativeV1.check.dice).toBe("2d6");
  expect(pocInvestigationNarrativeV1.check.bands).toHaveLength(4);
  expect(pocInvestigationNarrativeV1.start.conditions).toContainEqual({
    kind: "outcome.equals",
    outcomeId: parseOutcomeId("outcome.relationship_opportunity"),
    value: "relationship.pending",
  });
});

it("keeps the reference basic/prepared totals at 8 and 9", () => {
  const basic = resolvePocInvestigationFixtureV1({ prepared: false, seed: pocReferenceSeedV1 });
  const prepared = resolvePocInvestigationFixtureV1({ prepared: true, seed: pocReferenceSeedV1 });
  expect(basic.dice).toEqual([4, 3]);
  expect(basic.total).toBe(8);
  expect(prepared.total).toBe(9);
});
```

- [ ] **Step 2: Run and confirm missing investigation files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/investigation-content.test.ts`

Expected: FAIL because investigation/check/ending content is absent.

- [ ] **Step 3: Encode exact WorldAction/check/outcome data**

The first stage records the chosen option and opens Narrative; the second resolves the one check and applies Inventory/Fact/Outcome effects once. The deterministic threshold choice consumes no RNG. The 2D6 check consumes exactly two draws, stores dice/bonuses/total/band at the committed sequence, and cannot retry. Relationship/investigation start conditions are mutually exclusive in both directions.

- [ ] **Step 4: Run investigation and repository checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/investigation-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; route reachability, four Workflow progress states, one persisted check, fixed vector, rewards, and D6 consequences pass.

- [ ] **Step 5: Commit investigation content**

```bash
git add -- game/stories/poc/src/content/narrative/investigation.ts game/stories/poc/src/content/checks-endings.ts game/stories/poc/src/content/actions.ts game/stories/poc/src/test/investigation-content.test.ts
git commit -m "feat(story-poc): add investigation branch"
```

## Task 6: Freeze Rule Data, Forecasts, and Three Ending Outcomes

**Files:**

- Modify: `game/stories/poc/src/content/checks-endings.ts`
- Modify: `game/stories/poc/src/content/balance.ts`
- Create: `game/stories/poc/src/content/narrative/index.ts`
- Create: `game/stories/poc/src/content/story-data.ts`
- Create: `game/stories/poc/src/test/ending-forecast.test.ts`
- Create: `game/stories/poc/src/test/story-data.test.ts`

**Interfaces:**

- Consumes: Phase 4A Rules/Resolvers and state-only Queries; every named source-definition array from Tasks 2–5; exact forecast/ending policy from `docs/poc/simulation-rules.md`; and ending IDs/reasons/outcomes.
- Produces: referentially complete `pocEndingDefinitionsV1`, combined `pocNarrativeScenesV1`, `StoryBalanceV1.obligationForecast`/`endingPolicy`, stable/danger/arrears vectors, the sole complete source `pocStoryDataV1: PocStoryDataV1`, the explicit `projectPocSimulationDataV1(source, resolvedBalance)` projector, and its concrete `pocSimulationDataV1: PocSimulationDataV1` output consumed by Story materialization.

- [ ] **Step 1: Write failing forecast and ending tests**

```ts
it("uses current, committed-plan, and final forecast bases", () => {
  expect(createForecastQueriesV1({ day: 2 }).getObligationForecast()).toBeNull();
  expect(createForecastQueriesV1({ day: 4 }).getObligationForecast()).toMatchObject({
    kind: "current_gap",
  });
  expect(
    createForecastQueriesV1({ day: 5, committedPlan: true }).getObligationForecast(),
  ).toMatchObject({ kind: "committed_plan_conservative" });
  expect(
    createForecastQueriesV1({ allServiceDaysResolved: true }).getObligationForecast(),
  ).toMatchObject({ kind: "final" });
});

it("binds each terminal status to one authored ending and the same two summary outcomes", () => {
  expect(
    pocEndingDefinitionsV1.map(({ endingId, status, summaryOutcomeIds, effects }) => ({
      endingId,
      status,
      summaryOutcomeIds,
      effects,
    })),
  ).toEqual([
    {
      endingId: "ending.stable",
      status: "completed_stable",
      summaryOutcomeIds: {
        relationship: "outcome.relationship_opportunity",
        investigation: "outcome.investigation",
      },
      effects: [],
    },
    {
      endingId: "ending.danger",
      status: "completed_danger",
      summaryOutcomeIds: {
        relationship: "outcome.relationship_opportunity",
        investigation: "outcome.investigation",
      },
      effects: [],
    },
    {
      endingId: "ending.failed_arrears",
      status: "failed_arrears",
      summaryOutcomeIds: {
        relationship: "outcome.relationship_opportunity",
        investigation: "outcome.investigation",
      },
      effects: [],
    },
  ]);
});

it.each([
  [stableEndingInputV1(), "ending.stable", "completed_stable"],
  [dangerEndingInputV1(), "ending.danger", "completed_danger"],
  [arrearsEndingInputV1(), "ending.failed_arrears", "failed_arrears"],
])("maps one ending vector", (input, endingId, status) => {
  const definition = pocEndingDefinitionsV1.find((candidate) => candidate.status === status);
  expect(definition).toBeDefined();
  expect(createPocRulesV1(pocSimulationDataV1).endings.evaluate(input)).toMatchObject({
    endingId,
    status,
    effects: definition?.effects,
    summary: {
      relationship: { outcomeId: definition?.summaryOutcomeIds.relationship },
      investigation: { outcomeId: definition?.summaryOutcomeIds.investigation },
    },
  });
});

it("owns complete Story source data and projects the exact simulation shape", () => {
  expect(Object.keys(pocStoryDataV1)).toEqual([
    "dataRevision",
    "manifest",
    "stateDefinitions",
    "initialState",
    "balance",
    "content",
  ]);
  expect(Object.keys(pocStoryDataV1.content)).toEqual([
    "texts",
    "characters",
    "reasons",
    "actions",
    "storyActions",
    "customerSegments",
    "modifierSources",
    "ingredients",
    "items",
    "recipes",
    "facilities",
    "facilityOpportunities",
    "auras",
    "worldActions",
    "events",
    "checks",
    "endings",
    "scenes",
  ]);
  expect(pocStoryDataV1.content).toEqual({
    texts: pocTextEntriesV1,
    characters: pocCharacterDefinitionsV1,
    reasons: pocReasonDefinitionsV1,
    actions: pocActionDefinitionsV1,
    storyActions: pocRelationshipStoryActionDefinitionsV1,
    customerSegments: pocCustomerSegmentDefinitionsV1,
    modifierSources: pocModifierSourceDefinitionsV1,
    ingredients: pocIngredientDefinitionsV1,
    items: pocItemDefinitionsV1,
    recipes: pocRecipeDefinitionsV1,
    facilities: pocFacilityDefinitionsV1,
    facilityOpportunities: pocFacilityOpportunityDefinitionsV1,
    auras: pocAuraDefinitionsV1,
    worldActions: pocWorldActionDefinitionsV1,
    events: pocEventDefinitionsV1,
    checks: pocCheckDefinitionsV1,
    endings: pocEndingDefinitionsV1,
    scenes: pocNarrativeScenesV1,
  });
  expect(Object.keys(pocSimulationDataV1)).toEqual([
    "dataRevision",
    "manifest",
    "stateDefinitions",
    "initialState",
    "balance",
    "content",
    "narrative",
  ]);
  expect(pocSimulationDataV1.manifest).toEqual({
    initialSceneId: pocStoryDataV1.manifest.initialSceneId,
    playableDays: pocStoryDataV1.manifest.playableDays,
  });
  expect(Object.keys(pocSimulationDataV1.content)).toEqual([
    "characters",
    "reasons",
    "actions",
    "storyActions",
    "customerSegments",
    "modifierSources",
    "ingredients",
    "items",
    "recipes",
    "facilities",
    "facilityOpportunities",
    "auras",
    "worldActions",
    "events",
    "checks",
    "endings",
  ]);
  expect(pocSimulationDataV1.manifest).not.toHaveProperty("titleTextId");
  expect(pocSimulationDataV1.content).not.toHaveProperty("texts");
  expect(pocSimulationDataV1.content).not.toHaveProperty("scenes");
  expect(pocSimulationDataV1.narrative).toEqual({ scenes: pocStoryDataV1.content.scenes });
  expect(Object.isFrozen(pocStoryDataV1)).toBe(true);
  expect(Object.isFrozen(pocSimulationDataV1)).toBe(true);
});

it("creates the sequence-zero replay base from complete concrete data", () => {
  const program = deepFreeze({
    data: pocSimulationDataV1,
    rules: createPocRulesV1(pocSimulationDataV1),
  });
  const bootstrap = fixedPocBootstrapV1();
  const simulation = createPocGameSimulationV1(program);
  const state = simulation.createInitialState(bootstrap);
  expect(state.simulation.run.status).toBe("setup");
  expect(state.simulation.calendar).toMatchObject({
    day: 1,
    phase: "morning",
    lifePolicyId: null,
    apRemaining: 0,
  });
  expect(state.simulation.actors.player.attributes.intellect).toBe("B");
  expect(state.simulation.inventory).toMatchObject({ startingCash: 70, cash: 70 });
  expect(state.story.narrative.status).toBe("idle");
  expect(simulation.modules.map((module) => module.createInitialState(bootstrap))).toEqual([
    state.simulation.run,
    state.simulation.calendar,
    state.simulation.actors,
    state.simulation.status,
    state.simulation.inventory,
    state.simulation.facilities,
    state.simulation.tavern,
    state.simulation.activeWorkflow,
    {
      facts: state.story.facts,
      quests: state.story.quests,
      outcomes: state.story.outcomes,
      resolvedChecks: state.story.resolvedChecks,
    },
    state.story.narrative,
  ]);
});

it("keeps the production projector structural and field-by-field", async () => {
  const source = await readFile(new URL("../content/story-data.ts", import.meta.url), "utf8");
  expect(source).not.toMatch(/\.\.\.|Omit\s*</u);
});
```

- [ ] **Step 2: Run and confirm incomplete ending data**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/ending-forecast.test.ts src/test/story-data.test.ts`

Expected: FAIL because final forecast/ending definitions, combined Narrative, and complete Story source/projection files are incomplete.

- [ ] **Step 3: Complete strict source data and its field-by-field simulation projection**

Add only definitions, the exact `endingPolicy`/forecast policy, reason IDs, and effect lists. `pocEndingDefinitionsV1` contains exactly one row per terminal status in stable/danger/arrears order; each row declares its own EndingId, status, the same two named relationship/investigation OutcomeId bindings, and its progression-only effects (empty for this concrete PoC revision). Invoke the Phase 4A factories and `createPocGameQueriesV1` in pure provider tests; do not add a new `rules/` or `resolvers/` implementation under `content`. The concrete initial-state vector above must differ from the Phase 4A fixture where authored data differs (`intellect="B"`/cash `70` here versus `"C"`/`100` there), while both Simulation instances keep the same ten descriptors/order and every aggregate owner Slice equals the corresponding binding initializer. This proves that no fixture singleton or cross-Program owner data leaks into the resolved Story. `PocRulesV1.endings.evaluate` reads the one Balance-owned ending policy and has no forecast method or private threshold/EndingId/OutcomeId copy: policy decides status/reasons, then the status-matched definition supplies endingId/effects/summary bindings. Forecast is exclusively `getObligationForecast()` over the latest Gameplay State plus the same Tavern preview calculator wrapper: before `visibleFrom` it returns `null`, then `current_gap`, only an eligible frozen D5+ plan yields `committed_plan_conservative`, and all service days resolved yields `final`. The wrapper owns the shared structural/reference/day/mode guard and supplies either the current-resource rule branch or exact active plan/session branch; Story content does not duplicate the Condition evaluator. Stable requires paid levy plus the exact cash/reputation/facility thresholds and persists the two-field relationship/investigation summary. Arrears never deducts unavailable cash and records exact shortfall.

`narrative/index.ts` combines the D1–D4, relationship and investigation scenes once in authored order. `story-data.ts` owns strict source schemas and the only complete source object:

```ts
export const pocStoryDataV1: DeepReadonly<PocStoryDataV1> = deepFreeze(
  pocStoryDataSchemaV1.parse({
    dataRevision: 1,
    manifest: pocStoryManifestV1,
    stateDefinitions: pocStateDefinitionsV1,
    initialState: pocInitialStateV1,
    balance: pocBalanceV1,
    content: {
      texts: pocTextEntriesV1,
      characters: pocCharacterDefinitionsV1,
      reasons: pocReasonDefinitionsV1,
      actions: pocActionDefinitionsV1,
      storyActions: pocRelationshipStoryActionDefinitionsV1,
      customerSegments: pocCustomerSegmentDefinitionsV1,
      modifierSources: pocModifierSourceDefinitionsV1,
      ingredients: pocIngredientDefinitionsV1,
      items: pocItemDefinitionsV1,
      recipes: pocRecipeDefinitionsV1,
      facilities: pocFacilityDefinitionsV1,
      facilityOpportunities: pocFacilityOpportunityDefinitionsV1,
      auras: pocAuraDefinitionsV1,
      worldActions: pocWorldActionDefinitionsV1,
      events: pocEventDefinitionsV1,
      checks: pocCheckDefinitionsV1,
      endings: pocEndingDefinitionsV1,
      scenes: pocNarrativeScenesV1,
    },
  }),
);

export function projectPocSimulationDataV1(
  source: DeepReadonly<PocStoryDataV1>,
  resolvedBalance: DeepReadonly<StoryBalanceV1>,
): DeepReadonly<PocSimulationDataV1> {
  const validatedSource = pocStoryDataSchemaV1.parse(source);
  return deepFreeze(
    pocSimulationDataSchemaV1.parse({
      dataRevision: validatedSource.dataRevision,
      manifest: {
        initialSceneId: validatedSource.manifest.initialSceneId,
        playableDays: validatedSource.manifest.playableDays,
      },
      stateDefinitions: validatedSource.stateDefinitions,
      initialState: validatedSource.initialState,
      balance: resolvedBalance,
      content: {
        characters: validatedSource.content.characters,
        reasons: validatedSource.content.reasons,
        actions: validatedSource.content.actions,
        storyActions: validatedSource.content.storyActions,
        customerSegments: validatedSource.content.customerSegments,
        modifierSources: validatedSource.content.modifierSources,
        ingredients: validatedSource.content.ingredients,
        items: validatedSource.content.items,
        recipes: validatedSource.content.recipes,
        facilities: validatedSource.content.facilities,
        facilityOpportunities: validatedSource.content.facilityOpportunities,
        auras: validatedSource.content.auras,
        worldActions: validatedSource.content.worldActions,
        events: validatedSource.content.events,
        checks: validatedSource.content.checks,
        endings: validatedSource.content.endings,
      },
      narrative: { scenes: validatedSource.content.scenes },
    }),
  );
}

export const pocSimulationDataV1 = projectPocSimulationDataV1(
  pocStoryDataV1,
  pocStoryDataV1.balance,
);
```

There is no partial `pocSimulationDataBaseV1`, source spread, `Omit`, implicit merge, or second definition array. `pocStoryDataSchemaV1` is Phase-4B-owned and strict at its six top-level fields, `StoryManifestV1`, and all eighteen `StoryContentV1` fields; it composes the already strict Phase 4A leaf schemas rather than redefining Gameplay types. The projector validates the source first, then spells all seven simulation fields, both manifest fields, all sixteen simulation-content fields, and `narrative.scenes` explicitly before canonical round-trip/deep freeze. `story-data.test.ts` structurally rejects spread/`Omit`, proves the exact source/projection key sets and exclusions, and only then creates the concrete sequence-zero GameSimulation. Tests reject missing/extra source and projection keys, executable/module/presentation/tooling values, and any unresolved reference.

- [ ] **Step 4: Run forecast, rule, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/ending-forecast.test.ts src/test/story-data.test.ts src/test/investigation-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; every forecast transition, recommendation nulling, all three endings, exact source/projection shapes, complete sequence-zero initialization, no mutation/thenable/NaN, and strict schema validation pass.

- [ ] **Step 5: Commit final simulation data**

```bash
git add -- game/stories/poc/src/content/checks-endings.ts game/stories/poc/src/content/balance.ts game/stories/poc/src/content/narrative/index.ts game/stories/poc/src/content/story-data.ts game/stories/poc/src/test/ending-forecast.test.ts game/stories/poc/src/test/story-data.test.ts
git commit -m "feat(story-poc): freeze ending and forecast data"
```

## Task 7: Compose the StoryDefinition, Resolved Presentation, SceneGraph, and Semantic Actions

**Files:**

- Create: `game/stories/poc/src/presentation/text-catalogs/zh-CN.ts`
- Create: `game/stories/poc/src/presentation/text-catalogs/index.ts`
- Create: `game/stories/poc/src/presentation/assets.ts`
- Create: `game/stories/poc/src/presentation/scene-graph.ts`
- Create: `game/stories/poc/src/presentation/interaction-catalog.ts`
- Create: `game/stories/poc/src/presentation/content-maturity-policy.ts`
- Create: `game/stories/poc/src/presentation/semantic-actions.ts`
- Create: `game/stories/poc/src/patch-surfaces.ts`
- Create: `game/stories/poc/src/story-definition.ts`
- Modify: `game/stories/poc/src/index.ts`
- Modify: `game/stories/poc/LICENSE.md`
- Modify: `game/stories/poc/src/test/story-validation.test.ts`
- Inspect unchanged: `game/packages/assets/src/index.ts`
- Inspect unchanged: `game/packages/assets/src/approved-poc-pack.ts`
- Inspect unchanged: `game/packages/assets/runtime/poc/**`

**Interfaces:**

- Consumes: Task 6's sole complete `pocStoryDataV1` source and field-by-field projector, `createPocRulesV1`, `createPocGameSimulationV1`, Base ResolvedGame/Story/Patch/asset contracts, the Node-safe data-only renderer/layout descriptor contract proven by Phase 2, stable Text/Asset/Action IDs, and the predecessor track's immutable `approvedPocAssetPacksV1` export from `@project-tavern/assets`. The default Story closure does not import `@sillymaker/ui` or a Web renderer registry.
- Produces: `pocStoryEntryV1`, `definePocStoryV1`, `materializePocSimulationProgramV1`, `materializePocPresentationV1`, typed Patch Surfaces, one complete Chinese TextCatalog, fallback-complete assets with optional approved providers, `PocPresentationV1`, `PocStageSceneGraphV1`, `PocResolvedAssetsV1`, `PocResolvedGameV1`, `pocSceneGraphV1`, `pocHeroineStandardAppearanceV1`, `pocResolvedPresentationCatalogV1`, `pocContentMaturityPolicyV1`, the derived single-source `pocStandardRequiredAssetIdsByVariantV1` mapping, a data-only resolved StageScene/variant/rig/hitmap/interaction catalog, the empty-flag/zero-requirement PoC content policy, and the complete `PocSemantic*V1` contract plus `createPocSemanticActionCatalogV1(queries)`.

- [ ] **Step 1: Write the failing complete-Story contract test**

```ts
it("resolves one frozen game with one simulation and the resolved SceneGraph", () => {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  expect(resolved.frozen).toBe(true);
  expect(resolved.gameSimulation.modules).toHaveLength(10);
  expect(resolved.sceneGraph.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
    "stage_scene.poc.main_menu",
    "stage_scene.poc.tavern",
    "stage_scene.poc.market",
    "stage_scene.poc.world_map",
    "stage_scene.poc.week_summary",
  ]);
  expect(resolved.sceneGraph.contentMaturityPolicy).toMatchObject({
    policyRevision: 1,
    flags: [],
    presets: [],
    defaultAllowedFlags: 0,
  });
  expect(resolved.presentation.textCatalogs.defaultLocale).toBe("zh-CN");
  expect(resolved.assets.packs).toEqual(approvedPocAssetPackIdentitiesV1);
  expect(resolved.assets.assets.every((asset) => asset.fallbackToken.length > 0)).toBe(true);
  expect(
    resolvePocAssetsForTestV1([]).assets.every(
      (asset) => asset.delivery === "code_fallback" && asset.provider === null,
    ),
  ).toBe(true);
  expect(
    resolved.assets.assets
      .filter((asset) => asset.delivery === "runtime_image")
      .map((asset) => asset.assetId),
  ).toEqual(approvedPocProviderAssetIdsV1);
  expect(resolved.provenance.resolved.stateContractRevision).toBe(1);
  expect(assertStrictJsonDataOnlySceneGraphV1(resolved.sceneGraph)).toBe(true);
});

it("keeps semantic actions strict and derived from GameQueries", () => {
  const fixture = resolvePocStoryFixtureV1();
  const actions = createPocSemanticActionCatalogV1(
    fixture.resolved.gameSimulation.createQueries(fixture.snapshot.state),
  );
  expect(actions.every((action) => action.actionId && action.textId)).toBe(true);
  expect(actions.some((action) => "snapshot" in action)).toBe(false);
  for (const action of actions) {
    if (action.directInvocation === null) {
      expect(action.options.length).toBeGreaterThan(0);
      expect(
        action.options.every(({ invocation }) => invocation.actionId === action.actionId),
      ).toBe(true);
    } else {
      expect(action.options).toEqual([]);
      expect(action.directInvocation.actionId).toBe(action.actionId);
    }
  }
  expect(Object.keys(pocSemanticInvocationOptionsSchemaByActionV1).sort()).toEqual(
    [...actionIdsV1, ...pocSemanticWorkflowActionIdsV1].sort(),
  );
  expect(() => parsePocSemanticInvocationV1(unknownSemanticActionV1())).toThrowError(
    expect.objectContaining({ code: "semantic.action_unknown" }),
  );
  expect(() => parsePocSemanticInvocationV1(extraSemanticOptionV1())).toThrowError(
    expect.objectContaining({ code: "semantic.options_invalid" }),
  );
});
```

`approvedPocAssetPackIdentitiesV1` and `approvedPocProviderAssetIdsV1` in this example are test-only, authored-order projections derived from the imported frozen pack; `resolvePocAssetsForTestV1(packs)` is a test helper that calls the one production Base asset resolver with an injected pack list. They do not create another resolver, pack catalog, or runtime authority.

Add provider-contract cases that an empty approved pack is valid and yields the complete fallback manifest, while a non-empty committed pack replaces only matching `replaceable` slots and preserves every slot's `fallbackToken`. Reject unknown/duplicate/sealed Asset IDs, archived/reference/remote/traversal paths, byte/hash/dimension mismatch, or any provider not rooted in `game/packages/assets/runtime/poc/**`. The default Story uses the imported phase-base pack unchanged; tests may inject an empty pack to exercise deterministic fallback presentation without changing the default provider selection. Asset Pack identities and providers enter only the presentation/asset digest, never simulation or Save compatibility.

- [ ] **Step 2: Run and confirm missing Story/presentation files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/story-validation.test.ts`

Expected: FAIL because StoryDefinition, presentation, Patch Surfaces, and default entry are absent.

- [ ] **Step 3: Implement exact materialization and StoryEntry**

```ts
export function materializePocSimulationProgramV1(
  values: DeepReadonly<ResolvedPatchValuesV1<typeof pocSimulationPatchSurfaceV1>>,
): PocSimulationProgramV1 {
  const data = projectPocSimulationDataV1(pocStoryDataV1, values.balance);
  return deepFreeze({
    data,
    rules: materializePocRulesFromPatchValuesV1(data, values),
  });
}

export const pocStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: pocStoryIdentityV1,
  define: definePocStoryV1,
});

export default pocStoryEntryV1;
```

`materializePocRulesFromPatchValuesV1` is implemented in `patch-surfaces.ts` and maps exactly seven declared slots—`demand.preview`, `demand.resolve`, `tavern.preview`, `tavern.settle`, `checks.describe`, `checks.resolve`, and `endings.evaluate`—into `PocRulesV1`; it performs no implicit merge of unknown keys. Scheduling remains a separate deterministic resolver over validated event data, enters simulation source identity, and is not a `PocRulesV1` member or PatchSurface rule slot. The source simulation facet exposes `stateContractRevision`, the explicitly projected `PocSimulationDataV1`, base rule providers, simulation PatchSurface, `materializeProgram`, and `createGameSimulation: createPocGameSimulationV1`. `pocStoryDataV1` is the authoring source but never enters the simulation root wholesale: `projectPocSimulationDataV1` rebuilds the exact field-level projection for the resolved Balance without spread, `Omit`, or implicit merge. That projection excludes real text/presentation/assets/tooling and contains no module instances or owner capabilities. Presentation consumes the source TextId declarations for closure validation and separately exposes source SceneGraph/text/assets, presentation PatchSurface, and one materializer. Resolved SceneGraph comes from resolved Presentation and is not recreated by an application root. Simulation value slots expose Balance plus the exact named rule providers; presentation slots expose complete TextCatalog and replaceable fallback assets. The canonical simulation source projection includes `PocGameDebugCommandExecutorV1`, its strict command/error schemas, owner-routing table, Scheduling resolver, and validation/rule providers, so changing those sources changes `simulationDigest`; tooling form adapters and fixture definitions are excluded from that projection.

- [ ] **Step 4: Add the data-only SceneGraph, Chinese text, and semantic action descriptors**

`scene-graph.ts` exports only deeply frozen renderer IDs, layout/slot descriptors, and Strict JSON presentation data. It contains no JSX, React component, callback, class instance, DOM/browser global, or dynamic import. The default `src/index.ts`/StoryEntry/Headless import closure may import this descriptor but must not reach any `.tsx` file. Phase 5 adds the Story's Web-only `.tsx` renderer registry/contributions, which resolve these IDs without constructing a second graph or entering the default/Headless closure.

The resolved graph registers exactly the StageScene/variant/surface/target/behavior IDs frozen in Task 1, the exact `pocHeroinePresentationIdsV1` identity, and one concept HitMap whose only PoC target is `target.poc.heroine.figure`. It must not invent head/face/body-part targets or persistent appearance state. `stage_variant.poc.tavern.day` and `.evening` are catalog variants selected later by the Story Application presentation projector; the catalog contains no Calendar trigger and the Gameplay `PocGameViewV1` contains no StageScene/variant/Asset ID.

`assets.ts` freezes exactly five initially selected appearance layers—back hair, costume body, face, front hair, and accessory—against Task 1's seven-slot authored rig order. `held_prop` and `foreground_effect` remain valid empty slots and therefore produce no invisible placeholder demand. It must preserve the explicit layer-to-asset pairs rather than relying on two parallel arrays:

```ts
export const pocHeroineStandardAppearanceV1 = deepFreeze([
  {
    layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.back_hair"),
    assetId: parseAssetId("asset.poc.character.heroine.back_hair.standard"),
  },
  {
    layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.costume_body"),
    assetId: parseAssetId("asset.poc.character.heroine.costume_body.standard"),
  },
  {
    layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.face"),
    assetId: parseAssetId("asset.poc.character.heroine.face.neutral"),
  },
  {
    layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.front_hair"),
    assetId: parseAssetId("asset.poc.character.heroine.front_hair.standard"),
  },
  {
    layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.accessory"),
    assetId: parseAssetId("asset.poc.character.heroine.accessory.standard"),
  },
] as const);

const pocHeroineStandardDemandV1 = Object.freeze([
  ...pocHeroineStandardAppearanceV1.map(({ assetId }) => assetId),
  parseAssetId("asset.poc.character.heroine.static.standard"),
]);

export const pocStandardRequiredAssetIdsByVariantV1 = deepFreeze({
  "stage_variant.poc.main_menu.default": [parseAssetId("asset.poc.background.main_menu.standard")],
  "stage_variant.poc.tavern.day": [
    parseAssetId("asset.poc.background.tavern.day.standard"),
    ...pocHeroineStandardDemandV1,
  ],
  "stage_variant.poc.tavern.evening": [
    parseAssetId("asset.poc.background.tavern.evening.standard"),
    ...pocHeroineStandardDemandV1,
  ],
  "stage_variant.poc.market.day": [parseAssetId("asset.poc.background.market.day.standard")],
  "stage_variant.poc.world_map.default": [parseAssetId("asset.poc.background.world_map.standard")],
  "stage_variant.poc.week_summary.default": [
    parseAssetId("asset.poc.background.week_summary.standard"),
  ],
} as const);

export const pocResolvedPresentationCatalogV1 = deepFreeze({
  sceneGraph: pocSceneGraphV1,
  heroineStandardAppearance: pocHeroineStandardAppearanceV1,
  requiredAssetIdsByVariant: pocStandardRequiredAssetIdsByVariantV1,
});
```

All twelve Asset slots are registered fallback-complete before provider resolution: five selected appearance layers, one heroine static fallback, and one background for each of the six variants. The predecessor-approved pack may replace only matching `replaceable` slots; the empty-pack fixture resolves all twelve to `provider:null`, while the default Story resolves the exact committed pack without changing slot order or fallback tokens. `pocResolvedPresentationCatalogV1` is one deep-frozen object returned by resolved Presentation and passed to the Phase 5B projector; it is not a Web-only second catalog. Phase 5B derives the Runtime character's `appearance` directly from its explicit pairs and, after selecting a variant, reads `requiredAssetIds` only from `input.resolvedCatalog.requiredAssetIdsByVariant[variantId]`; it never ambient-imports the mapping or restates, zips, sorts, unions, or coarsens it. Tests assert the pair order matches the first five authored rig slots, all six exact variant keys and ordered demand arrays, every non-null `backgroundAssetId` equals the first ID of its variant demand, no duplicate within a demand, no unselected slot, and no non-standard asset.

`interaction-catalog.ts` maps `behavior.poc.heroine.open_profile` to a closed Presentation intent symbol, while repair/apology/service-plan/purchase/old-trade-road map to the existing Semantic action IDs. It stores only stable provider symbols in Strict JSON—not invocations, commands, closures, or enabled flags. Phase 5B joins those symbols to the atomic action catalog and performs dynamic mode/cardinality validation; Phase 4B validates only static references, ID uniqueness, HitMap shapes, and the complete open-surface DAG.

The outer `surface.poc.tavern` contains a contextual binding from `target.poc.heroine.figure` to `open_surface → surface.poc.heroine`; `surface.poc.heroine` reuses that same target with allowed `direct | choose` and `openSurfaceId: null`. The Tavern service target remains a separate binding. This deliberately exercises the Phase 2 `InteractionSurfaceTargetBindingV1` contract: target semantics are reusable, while transition/mode is surface-local.

`content-maturity-policy.ts` exports `pocContentMaturityPolicyV1` with `policyRevision=1`、an empty flag/preset catalog and `defaultAllowedFlags=emptyContentMaturityFlagsV1`. `scene-graph.ts` exports `pocSceneGraphV1`. Every runtime asset, variant, target, behavior, text, and fallback in this Story uses `requiredFlags=emptyContentMaturityFlagsV1`; no authored field uses a raw numeric zero to bypass the brand. No filtered AssetId or alternative suggestive asset enters the resolved graph. The complete `zh-CN` catalog maps `pocNoContentFilterOptionsTextIdV1` to the provisional truthful text `当前故事没有可调整的内容过滤选项。`; Story validation requires that exact ID to be nonblank, while later UI still resolves it through `PresentationReadPortV1` rather than importing a raw string.

`semantic-actions.ts` owns these exact closed types; none may remain an implied name. Its catalog consumes all relevant Phase 4A getters rather than inspecting State: generic actions come from `getAvailableActions()`, run/policy controls from their dedicated getters, Narrative commands from `getNarrativeProjection()`, and Opening commands only from `getTavernOpeningControl()`. An active Narrative or WorldAction produces no Opening descriptor; otherwise the control contributes exactly one of start/continue/finalize with the exact command and preview carried by that branch:

```ts
type PocCommandOptionsV1<TKind extends PocGameCommandV1["kind"]> = Omit<
  Extract<PocGameCommandV1, { readonly kind: TKind }>,
  "kind"
>;
type PocNoSemanticOptionsV1 = Readonly<Record<string, never>>;

export interface PocSemanticInvocationOptionsByActionV1 {
  readonly "action.choose_life_policy": PocCommandOptionsV1<"policy.choose">;
  readonly "action.purchase": PocCommandOptionsV1<"inventory.buy">;
  readonly "action.prepare_food": PocNoSemanticOptionsV1;
  readonly "action.rest": PocNoSemanticOptionsV1;
  readonly "action.service_plan": PocCommandOptionsV1<"tavern.plan.set">;
  readonly "action.advance_phase": PocNoSemanticOptionsV1;
  readonly "action.pay_levy": PocNoSemanticOptionsV1;
  readonly "action.facility_window": Omit<PocCommandOptionsV1<"facility.choose">, "opportunityId">;
  readonly "action.repair_sign_with_heroine": PocNoSemanticOptionsV1;
  readonly "action.old_trade_road": Omit<PocCommandOptionsV1<"world.action.begin">, "actionId">;
  readonly "action.apologize_to_heroine": PocNoSemanticOptionsV1;
  readonly "action.run_start": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_start": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_continue": PocNoSemanticOptionsV1;
  readonly "action.tavern_opening_finalize": PocNoSemanticOptionsV1;
  readonly "action.world_action_complete": PocNoSemanticOptionsV1;
  readonly "action.narrative_advance": PocNoSemanticOptionsV1;
  readonly "action.narrative_choose": PocCommandOptionsV1<"narrative.choose">;
}

export type PocSemanticInvocationV1 = {
  readonly [TActionId in keyof PocSemanticInvocationOptionsByActionV1]: {
    readonly kind: "invoke";
    readonly actionId: TActionId;
    readonly options: DeepReadonly<PocSemanticInvocationOptionsByActionV1[TActionId]>;
  };
}[keyof PocSemanticInvocationOptionsByActionV1];

export interface PocSemanticActionOptionV1<TInvocation extends PocSemanticInvocationV1> {
  readonly optionId: string;
  readonly textId: TextId;
  readonly invocation: DeepReadonly<TInvocation>;
}

type PocSemanticActionDeliveryV1<TInvocation extends PocSemanticInvocationV1> =
  | {
      readonly directInvocation: DeepReadonly<TInvocation>;
      readonly options: readonly [];
    }
  | {
      readonly directInvocation: null;
      readonly options: readonly [
        DeepReadonly<PocSemanticActionOptionV1<TInvocation>>,
        ...DeepReadonly<PocSemanticActionOptionV1<TInvocation>>[],
      ];
    };

export type PocSemanticActionDescriptorV1 = {
  readonly [TActionId in keyof PocSemanticInvocationOptionsByActionV1]: {
    readonly actionId: TActionId;
    readonly textId: TextId;
    readonly enabled: boolean;
    readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
    readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  } & PocSemanticActionDeliveryV1<
    Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
  >;
}[keyof PocSemanticInvocationOptionsByActionV1];

export type PocSemanticConfirmationV1 = NonNullable<
  Extract<CommandPreviewV1, { readonly allowed: true }>["confirmation"]
>;
export type PocSemanticPreviewV1 = CommandPreviewV1;
export type PocSemanticActionResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
    }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: "gameplay_fault" };
```

The file declares one strict schema in `pocSemanticInvocationOptionsSchemaByActionV1` for every generic and workflow action member and derives the discriminated union/parser from that closed map. Every descriptor has exactly one mapping: a no-parameter action has one `directInvocation` and zero `options`; a parameterized action has `directInvocation: null` plus finite controlled options whose invocations parse against its action-specific schema. The mapped descriptor union preserves `descriptor.actionId === directInvocation/options[].invocation.actionId` at compile time. Unknown actions, missing/extra options, callbacks, state paths, Snapshot fragments, and arbitrary JSON are rejected with stable typed errors. Type tests prove the schema keys equal the combined literal action-ID union in both directions, reject an extra property on `PocNoSemanticOptionsV1`, reject a mismatched descriptor/invocation action ID, and prove all five `PocSemantic*V1` names export from the Story root.

`PocSemanticActionResultV1` is deliberately not the GameSession dispatch envelope. `projectPocSemanticActionResultV1` exhaustively maps `not_executed` unchanged, maps committed execution to `{ kind: "committed" }`, preserves only player-visible rejection reasons, and collapses an engine fault to `{ kind: "faulted", code: "gameplay_fault" }`. Snapshot, State, RNG, facts, internal fault details, attempts, and CommandLog evidence never cross SemanticGamePort; diagnostics remain the separate player-safe inspection path.

The resolved Story exports exact structural aliases `PocPresentationV1`, `PocStageSceneGraphV1`, and `PocResolvedAssetsV1`, then specializes Base's generic `ResolvedGameV1` as `PocResolvedGameV1`. The aliases are inferred from the concrete materializers/catalogs without `as unknown as`, and public type tests prove their simulation/program/presentation/sceneGraph/assets members match `pocStoryEntryV1`.

Future Scene renderers receive only `{ viewSlice, semantic, presentation }`; no complete `GameApplicationPortV1`, Snapshot, persistence, diagnostics, capability/debug port, module owner, Rule, resolver, or raw content object. Semantic descriptors already contain stable ActionId/TextId, enabled, ordered reasons, and strict invocation options derived from `PocGameQueriesV1`. Do not activate React, JSX, DOM, or `DOM.Iterable` in this phase. Extend `LICENSE.md` so `src/presentation/text-catalogs/**` is CC BY-NC-SA while executable code remains PolyForm.

- [ ] **Step 5: Run Story, boundary, type, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/story-validation.test.ts && pnpm verify:stories && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; all stable references/reachability/catalog/rule/slot/fallback checks pass, the default entry imports under Node type stripping, the resolved SceneGraph is Strict JSON/data-only and preserved, replayable-debug simulation sources affect only simulation identity, and no `.tsx`, React, DOM, runtime image, tooling, Web, AIGC, or reference path enters the default Story/Headless closure.

- [ ] **Step 6: Commit complete Story composition**

```bash
git add -- game/stories/poc/src/presentation game/stories/poc/src/patch-surfaces.ts game/stories/poc/src/story-definition.ts game/stories/poc/src/index.ts game/stories/poc/LICENSE.md game/stories/poc/src/test/story-validation.test.ts
git commit -m "feat(story-poc): compose seven-day story"
```

## Task 8: Prove the Complete Story Through GameSession and SemanticGamePort

**Files:**

- Create: `game/stories/poc/src/application/create-poc-semantic-port.ts`
- Create: `game/stories/poc/src/testing/poc-story-harness.ts`
- Create: `game/stories/poc/src/test/semantic-flow.integration.test.ts`
- Create: `game/stories/poc/src/test/relationship-route.integration.test.ts`
- Create: `game/stories/poc/src/test/investigation-route.integration.test.ts`
- Create: `game/stories/poc/src/test/terminal-route.integration.test.ts`
- Modify: `game/stories/poc/package.json`
- Modify: `scripts/verify-semantic.mts`
- Modify: `scripts/verify-semantic.test.mjs`

**Interfaces:**

- Consumes: resolved Story, `createGameSessionV1`, its internal `GameSessionRuntimeControlV1`, Phase 2 atomic `SemanticPublicationV1`/`SemanticGamePortV1` plus the state-only/FIFO-read `SemanticGamePortSourceV1`, the shared bounded observer/subscriber-failure callback, `PocGameSimulationV1.projectGameView`, `PocGameQueriesV1`, Story semantic action descriptors, fixed bootstrap, and runtime-owned bounded CommandLog.
- Produces: the exact `PocSemanticGamePortV1` specialization, `createPocSemanticGamePortV1`, test-only `createPocStoryHarnessV1`, atomic same-Queries Gameplay/Narrative/action publications, all real D1–D7 command-through route evidence, and the root `verify:semantic` aggregator ordered E2E then PoC. It does not produce a second Gameplay or Narrative projector.

- [ ] **Step 1: Write the failing semantic harness contract**

```ts
export interface PocStoryHarnessV1 {
  readonly semantic: PocSemanticGamePortV1;
  snapshotForTest(): DeepReadonly<PocGameSnapshotV1>;
  executedAttempts(): readonly DeepReadonly<PocHarnessAttemptV1>[];
}

it("exposes only legal visible actions and waits by revision", async () => {
  const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
  const before = harness.semantic.observe();
  expect(before.revision).toBe(0);
  expect(harness.semantic.availableActions()).toBe(before.actions);
  expect(before.narrative).toBeNull();
  expect(before.game).not.toHaveProperty("narrative");
  expect(before.actions.map((entry) => entry.actionId)).toContain("action.run_start");
  const nextIdle = harness.semantic.waitForIdle(before.revision);
  const published: number[] = [];
  const unsubscribe = harness.semantic.subscribe(() => {
    published.push(harness.semantic.observe().revision);
  });
  await harness.semantic.dispatch({ kind: "invoke", actionId: "action.run_start", options: {} });
  await expect(nextIdle).resolves.toMatchObject({
    revision: 1,
  });
  expect(harness.semantic.observe()).not.toHaveProperty("snapshot");
  expect(published).toContain(1);
  unsubscribe();
});

it("previews at the FIFO front against the latest committed state", async () => {
  const harness = createBlockedPocStoryHarnessV1();
  const dispatch = harness.semantic.dispatch(consumeLastApInvocationV1());
  const preview = harness.semantic.preview(requiresApInvocationV1());
  harness.releaseQueueFront();
  await expect(dispatch).resolves.toMatchObject({ kind: "committed" });
  await expect(preview).resolves.toMatchObject({
    allowed: false,
    reasons: [{ code: "calendar.insufficient_ap" }],
  });
});

it.each(["lifecycle", "load"] as const)(
  "publishes an authoritative revision for an equivalent-state $source replacement",
  async (source) => {
    const harness = createPocReplacementPublicationHarnessV1(source);
    const before = harness.semantic.observe().revision;
    const published = harness.nextSemanticPublication();
    await harness.replaceWithEquivalentStateAtQueueFront();
    await expect(published).resolves.toMatchObject({ revision: before + 1 });
    expect(harness.semantic.observe()).not.toHaveProperty("snapshot");
  },
);

it("publishes Gameplay, Narrative, and actions from the same Queries instance", async () => {
  const harness = createQueriesCountingPocStoryHarnessV1();
  const initial = harness.semantic.observe();
  expect(harness.createQueriesCalls()).toBe(1);
  expect(initial.game).toEqual(harness.projectedGameViewFromWitness());
  expect(initial.narrative).toBe(harness.projectedNarrativeFromWitness());
  expect(initial.actions).toEqual(harness.projectedActionsFromWitness());

  await harness.publishBusyReadyWithoutReplacement();
  const statusOnly = harness.semantic.observe();
  expect(statusOnly.game).toBe(initial.game);
  expect(statusOnly.narrative).toBe(initial.narrative);
  expect(statusOnly.actions).toBe(initial.actions);
  expect(harness.createQueriesCalls()).toBe(1);
});

it.each([
  ["committed", { kind: "committed" }],
  ["rejected", { kind: "rejected", reasons: [{ code: "calendar.insufficient_ap" }] }],
  ["faulted", { kind: "faulted", code: "gameplay_fault" }],
  ["not_executed", { kind: "not_executed", code: "fault_paused" }],
] as const)("projects a player-safe %s dispatch result", async (source, expected) => {
  const result = await createPocSemanticResultFixtureV1(source).dispatch();
  expect(result).toEqual(expected);
  expect(collectObjectKeysRecursivelyV1(result)).not.toEqual(
    expect.arrayContaining(["snapshot", "state", "rng", "facts", "fault", "attempt", "commandLog"]),
  );
});

it("rejects malformed runtime invocations before dispatch admission", async () => {
  const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
  const before = harness.semantic.observe();
  const attemptsBefore = harness.executedAttempts().length;
  await expect(
    Reflect.apply(harness.semantic.dispatch, harness.semantic, [extraSemanticInvocationV1()]),
  ).resolves.toEqual({ kind: "not_executed", code: "validation_failed" });
  expect(harness.semantic.observe()).toBe(before);
  expect(harness.executedAttempts()).toHaveLength(attemptsBefore);
});
```

- [ ] **Step 2: Run and confirm the missing semantic adapter/harness**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/semantic-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts`

Expected: FAIL with missing `create-poc-semantic-port.js` and `poc-story-harness.js`.

- [ ] **Step 3: Implement the semantic adapter over one GameSession**

```ts
export type PocSemanticGamePortV1 = SemanticGamePortV1<
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1,
  RuntimeSessionStatusV1
>;

interface PocSemanticGamePortInputV1 {
  readonly session: GameSessionV1<PocGameSimulationTypesV1>;
  readonly runtimeControl: GameSessionRuntimeControlV1<PocGameSnapshotV1>;
  readonly gameSimulation: PocGameSimulationV1;
  reportSubscriberFailure(error: unknown): void;
}

export function createPocSemanticGamePortV1(
  input: PocSemanticGamePortInputV1,
): PocSemanticGamePortV1 {
  const { gameSimulation, runtimeControl, session } = input;
  return createSemanticGamePortV1({
    source: {
      getCurrentState: () => session.getCurrentSnapshot().state,
      getAuthoritativeRevisionToken: () => session.getCurrentSnapshot(),
      getStatus: () => session.getStatus(),
      subscribe: (listener) => session.subscribe(listener),
      reportSubscriberFailure: (error) => input.reportSubscriberFailure(error),
      readStateAtQueueFront: (reader) =>
        runtimeControl.readAtQueueFront((snapshot) => reader(snapshot.state)),
    },
    createQueries: (state) => gameSimulation.createQueries(state),
    projectGameView: (queries) => gameSimulation.projectGameView(queries),
    projectNarrativeView: (queries) => queries.getNarrativeProjection(),
    actions: (queries) => createPocSemanticActionCatalogV1(queries),
    preview: (queries, invocation) => previewPocSemanticInvocationV1(queries, invocation),
    dispatch: async (invocationValue) => {
      let invocation: PocSemanticInvocationV1;
      try {
        invocation = parsePocSemanticInvocationV1(invocationValue);
      } catch {
        return Object.freeze({
          kind: "not_executed" as const,
          code: "validation_failed" as const,
        });
      }
      return projectPocSemanticActionResultV1(
        await session.dispatch(commandFromPocSemanticInvocationV1(invocation)),
      );
    },
  });
}
```

The adapter directly reuses `gameSimulation.projectGameView(queries)` and `queries.getNarrativeProjection()`; there is no `PocSemanticGameViewV1`, second Narrative/GameView projector, second State reader, or second Gameplay gate. For each new authoritative token the Base factory creates exactly one `PocGameQueriesV1`, then calls `projectGameView`, `projectNarrativeView`, and `actions` once each with that same Queries reference before atomically publishing renderer-neutral `game`, `narrative`, and `actions` channels. `PocGameViewV1` never contains Narrative. A status-only publication reuses all three exact references, and `availableActions()` returns the current publication's exact `actions` reference.

`getAuthoritativeRevisionToken` returns the immutable current Snapshot reference only as an opaque Base-internal identity token; Base compares it by reference and never passes it to `createQueries`, `projectGameView`, actions, preview, UI, or Automation. Preview is a non-mutating FIFO read: the Base factory enqueues it through the injected internal runtime control, obtains the latest Gameplay State only when it reaches the queue front, rebuilds Queries there, and creates no attempt, RNG draw, sequence increment, or CommandLog entry. Dispatch first strict-parses the runtime value; malformed/extra/unknown input returns stable `not_executed/validation_failed` without opening an attempt or publishing a revision. Only a parsed invocation reaches the command mapper, and the GameCommandExecutor performs the final guard at its own FIFO execution point with the same Rules/Queries semantics. Disabled/stale valid invocations return stable rejection results. `subscribe` publishes immutable publication/status changes while incrementing semantic revision only when the authoritative Snapshot token changes; every listener is isolated and forwards failures through the same bounded callback injected into GameSession/Application composition. Lifecycle and load replacement therefore publish even when the replacement Gameplay State is structurally equal, while busy/ready-only publication does not increment revision. Task 12 adds the equivalent assertion for fixture anchor replacement once PoC tooling fixtures exist. `waitForIdle(afterRevision)` subscribes before dispatch in the race-sensitive test, follows semantic publication revisions, and uses no sleep. Automation uses ordinary commands and leaves RunIntegrity normal.

- [ ] **Step 4: Port complete D1–D7 routes through semantic invocations**

Cover start/policy, purchase/preparation/rest, D2 invoice, D4 facility, D5 relationship/investigation exclusion, D6 apology/consequence, planned/emergency closure, paid/arrears levy, and terminal lock. The harness resolves once, starts the exact `resolved.gameSimulation`, dispatches once per invocation, and records the matching same-attempt CommandLog evidence without exposing a mutable log or Snapshot setter.

- [ ] **Step 5: Extend the public semantic verifier and run all gates**

Update `scripts/verify-semantic.mts` and its structural test so the deeply frozen child-command list is exactly:

```js
[
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:semantic"]],
];
```

Set the PoC package script to `vitest run src/test/semantic-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts`. Both children use public Semantic ports, and neither enables DebugTools/Cheats, calls a fixture anchor, imports React, or writes a baseline. Keep the stable root mapping `verify:semantic = node --experimental-strip-types scripts/verify-semantic.mts` unchanged.

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/semantic-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts && node --test scripts/verify-semantic.test.mjs && pnpm verify:semantic && pnpm verify:stories && pnpm typecheck && pnpm verify`

Expected: PASS; all routes use SemanticGamePort/GameSession, each authoritative token creates one Queries and atomically publishes the Phase 4A Gameplay/Narrative/action channels, status-only publications reuse all three references, blocked-queue preview reads the latest queue-front State, subscribe/revision behavior is deterministic across commit/lifecycle/load replacement, opaque revision tokens never reach Story callbacks, preview/dispatch agree, D7 ends in afternoon, both E2E and PoC are covered by the public semantic gate, and normal automation leaves RunIntegrity unchanged.

- [ ] **Step 6: Commit semantic Story integration**

```bash
git add -- game/stories/poc/src/application/create-poc-semantic-port.ts game/stories/poc/src/testing/poc-story-harness.ts game/stories/poc/src/test/semantic-flow.integration.test.ts game/stories/poc/src/test/relationship-route.integration.test.ts game/stories/poc/src/test/investigation-route.integration.test.ts game/stories/poc/src/test/terminal-route.integration.test.ts game/stories/poc/package.json scripts/verify-semantic.mts scripts/verify-semantic.test.mjs
git commit -m "test(story-poc): prove semantic week routes"
```

## Task 9: Compile Six Reference Strategies into Literal Semantic Invocation Fixtures

**Files:**

- Create: `game/stories/poc/src/testing/reference-strategy-definitions.ts`
- Create: `game/stories/poc/src/testing/compile-reference-strategy.ts`
- Create: `game/stories/poc/src/testing/run-reference-strategy.ts`
- Create: `game/stories/poc/scripts/update-command-fixtures.mjs`
- Create: `game/stories/poc/src/test/reference-strategies.test.ts`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.cash_first.json`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.relationship_first.json`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.investigation_first.json`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.full_delegation.json`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.two_closures_recovery.json`
- Create: `game/stories/poc/src/test/fixtures/commands/strategy.explicit_failure.json`
- Modify: `game/stories/poc/package.json`

**Interfaces:**

- Consumes: fixed schedules in `docs/poc/reference-strategies.md`, Story SemanticGamePort, fixed seed/run IDs, current visible action options, and Canonical JSON.
- Produces: six unique literal `PocReferenceCommandFixtureV1` envelopes, `compilePocReferenceStrategyV1`, the restricted multi-seed `compilePocStrategyForSeedV1`, `runPocReferenceStrategyV1`, `update:commands`, and read-only `verify:commands`.

- [ ] **Step 1: Write the failing compiler/fixture equality test**

```ts
for (const definition of Object.values(pocReferenceStrategyDefinitionsV1)) {
  it(`${definition.strategyId} matches its reviewed semantic fixture`, async () => {
    const compiled = await compilePocReferenceStrategyV1(definition);
    const stored = await readPocCommandFixtureV1(definition.strategyId);
    expect(canonicalJsonBytes(compiled.fixture)).toEqual(canonicalJsonBytes(stored));
    expect(stored.entries.map(({ order }) => order)).toEqual(
      stored.entries.map((_, index) => index),
    );
    expect(stored.entries.every((entry) => entry.commandSequence >= 0)).toBe(true);
    expect(compiled.results.every((result) => result.kind === "committed")).toBe(true);
    expect(compiled.finalView.status).toBe("terminal");
    expect(compiled.finalSnapshot.integrity.mode).toBe("normal");
  });
}
```

- [ ] **Step 2: Run and confirm missing fixtures/compiler**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/reference-strategies.test.ts`

Expected: FAIL because compiler/runner and six JSON fixtures do not exist.

- [ ] **Step 3: Implement deterministic semantic compilation**

The reference compiler starts one fixed Story harness, reads `availableActions()` after every committed invocation, chooses only declared options by stable ID, previews then dispatches each invocation, and awaits the next idle revision. Before each dispatch the test harness records the current public day/phase plus test-only authoritative `commandSequence`; after commit it appends one entry with the original invocation. It never reads Snapshot to decide an action, enables automation/debug capability, retries RNG, or invokes a private command.

```ts
export interface PocReferenceCommandFixtureEntryV1 {
  readonly order: NonNegativeSafeInteger;
  readonly day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly phase: "morning" | "afternoon" | "evening";
  readonly commandSequence: NonNegativeSafeInteger;
  readonly invocation: PocSemanticInvocationV1;
}

export interface PocReferenceCommandFixtureV1 {
  readonly schemaRevision: 1;
  readonly storyIdentity: typeof pocStoryIdentityV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: typeof pocReferenceSeedV1;
  readonly runId: RunId;
  readonly entries: readonly PocReferenceCommandFixtureEntryV1[];
}

export interface CompiledPocReferenceStrategyV1 {
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly fixture: PocReferenceCommandFixtureV1;
  readonly results: readonly PocSemanticActionResultV1[];
  readonly finalView: PocGameViewV1;
  readonly finalSnapshot: PocGameSnapshotV1;
}
```

The final Snapshot and `commandSequence` read are test evidence only and are never used to choose subsequent actions. `compilePocStrategyForSeedV1` consumes the same frozen strategy definition for seeds 1–1000 and returns in-memory entries with the same envelope shape. Its decision API is a closed union with one state-dependent member, `{ kind:"select_d6_plan_from_war_clue" }`; the compiler may select only the two plans frozen by `reference-strategies.md`. Tests inject every other observed field (cash, stamina, inventory, demand, check band and rejection diagnostics) with differing values and prove the generated invocation prefix/suffix remains byte-identical. The complete literal files remain authoritative only for `0x00023049`; the corpus does not blindly replay a reference-seed D6 branch.

- [ ] **Step 4: Generate once, review, and verify read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-poc update:commands
git add -N -- game/stories/poc/src/test/fixtures/commands
git diff --no-ext-diff -- game/stories/poc/src/test/fixtures/commands
find game/stories/poc/src/test/fixtures/commands -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-command-fixtures.before.sha256
pnpm --filter @project-tavern/story-poc verify:commands
pnpm --filter @project-tavern/story-poc verify:commands
pnpm verify
find game/stories/poc/src/test/fixtures/commands -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-command-fixtures.after.sha256
diff -u /tmp/project-tavern-command-fixtures.before.sha256 /tmp/project-tavern-command-fixtures.after.sha256
```

Expected: exactly six canonical JSON files are visible in the intent-to-add diff; each passes the strict envelope schema and contains continuous `order`, exact pre-dispatch `day/phase/commandSequence`, and one closed Semantic invocation. The executing agent records the technical rubric result and complete hashes; both read-only runs preserve every byte. Human review is not awaited.

- [ ] **Step 5: Commit reference commands**

```bash
git add -- game/stories/poc/src/testing/reference-strategy-definitions.ts game/stories/poc/src/testing/compile-reference-strategy.ts game/stories/poc/src/testing/run-reference-strategy.ts game/stories/poc/scripts/update-command-fixtures.mjs game/stories/poc/src/test/reference-strategies.test.ts game/stories/poc/src/test/fixtures/commands game/stories/poc/package.json
git commit -m "test(story-poc): freeze reference invocations"
```

## Task 10: Calibrate 1–1000 Seed Balance Before Freezing Golden Output

**Files:**

- Create: `game/stories/poc/src/testing/balance-metrics.ts`
- Create: `game/stories/poc/src/testing/balance-calibration.ts`
- Create: `game/stories/poc/src/testing/counterfactual-scenarios.ts`
- Create: `game/stories/poc/src/test/balance-1000-seeds.test.ts`
- Modify: `game/stories/poc/src/testing/compile-reference-strategy.ts`
- Modify: `game/stories/poc/src/testing/run-reference-strategy.ts`
- Modify: `game/stories/poc/src/content/balance.ts` only if deterministic calibration changes an existing value
- Modify: `docs/poc/balance-v0.md` only in the same calibration change
- Create: `scripts/verify-poc-balance.mjs`
- Create: `scripts/verify-poc-balance.test.mjs`
- Modify: `game/stories/poc/package.json`
- Modify: `package.json`

**Interfaces:**

- Consumes: the six frozen strategy definitions, reference-seed literal envelopes, the closed `compilePocStrategyForSeedV1` decision API, seeds 1–1000, exact `PocBalanceMetricsV1`/Pareto definitions and finite calibration procedure in `docs/poc/balance-v0.md`, resolved SemanticGamePort, and immutable Program materialization.
- Produces: `PocBalanceMetricsV1`, `PocParetoVectorV1`, `PocCounterfactualProvenanceV1`, `PocCounterfactualScenarioV1`, `createPocCounterfactualScenarioV1`, `PocBalanceCalibrationCandidateV1`, `selectPocBalanceCalibrationStepV1`, deterministic 1–1000 assertions, bed/cold-storage/D4-pressure counterfactuals, package `verify:balance`, and the existing root `verify:balance` redirected to PoC. No golden file exists when this task begins.

- [ ] **Step 1: Write failing metric, compiler-branch, threshold, and counterfactual tests**

```ts
it("meets the frozen 1..1000 strategy thresholds with exact metrics", async () => {
  const metrics = await runPocBalanceCorpusV1({ firstSeed: 1, lastSeed: 1000 });
  expect(metrics.firstSeed).toBe(1);
  expect(metrics.lastSeed).toBe(1000);
  expect(metrics.strategies["strategy.cash_first"].paidCount).toBeGreaterThanOrEqual(900);
  expect(metrics.strategies["strategy.relationship_first"].paidCount).toBeGreaterThanOrEqual(900);
  expect(metrics.strategies["strategy.investigation_first"].paidCount).toBeGreaterThanOrEqual(900);
  expect(metrics.strategies["strategy.full_delegation"].paidCount).toBeGreaterThanOrEqual(850);
  expect(metrics.strategies["strategy.full_delegation"].paidCount).toBeLessThanOrEqual(950);
  const delegationMedian = metrics.strategies["strategy.full_delegation"].medianPaidAfterTaxCash;
  expect(delegationMedian).not.toBeNull();
  if (delegationMedian === null) throw new TypeError("delegation must have paid samples");
  expect(delegationMedian).toBeGreaterThanOrEqual(0);
  expect(delegationMedian).toBeLessThanOrEqual(35);
  expect(metrics.strategies["strategy.two_closures_recovery"].paidCount).toBeGreaterThanOrEqual(
    700,
  );
  expect(metrics.strategies["strategy.explicit_failure"].paidCount).toBeLessThanOrEqual(200);
  expect(metrics.d4CashPressure.cashFirstPaidCount).toBeGreaterThanOrEqual(750);
  expect(metrics.d4CashPressure.relationshipFirstPaidCount).toBeGreaterThanOrEqual(750);
  expect(metrics.d4CashPressure.investigationFirstPaidCount).toBeGreaterThanOrEqual(750);
  expect(metrics.maximumStrictDominance).toBeLessThanOrEqual(800);
});

it("allows only the committed war-clue result to choose a D6 plan", async () => {
  const withoutClue = await compileMultiSeedFixtureV1({ seed: 17, warClue: false });
  const withClue = await compileMultiSeedFixtureV1({ seed: 17, warClue: true });
  expect(invocationsBeforeD6V1(withoutClue)).toEqual(invocationsBeforeD6V1(withClue));
  expect(nonD6InvocationsV1(withoutClue)).toEqual(nonD6InvocationsV1(withClue));
  expect(d6PlanV1(withoutClue)).not.toEqual(d6PlanV1(withClue));
  expect(() => compileWithUndeclaredDecisionV1("cash_below_levy")).toThrow(/closed decision/u);
});

it("builds immutable counterfactual programs before Session creation", async () => {
  const pressure = createPocCounterfactualScenarioV1({
    kind: "d4_cash_pressure",
    strategyId: "strategy.cash_first",
    seed: 1,
  });
  expect(Object.isFrozen(pressure)).toBe(true);
  expect(pressure.provenance.overrides).toEqual([
    { field: "facilityBuildCost", before: 12, after: 24 },
  ]);
  expect(() => mutateCounterfactualProgramForTestV1(pressure)).toThrow();

  const effects = await runPocFacilityCounterfactualsV1();
  expect(effects.withoutBed.d6ManualResult).toMatchObject({ kind: "rejected" });
  expect(effects.withoutColdStorage.d4FreshMeatSpoiledAtDay).toBe(5);
});

it("chooses one deterministic strictly improving calibration neighbor", () => {
  const selected = selectPocBalanceCalibrationStepV1(calibrationCandidateFixtureV1());
  expect(selected).toMatchObject({
    field: "levy",
    direction: "decrease",
    step: 2,
  });
  expect(selected.afterDeficit).toBeLessThan(selected.beforeDeficit);
});
```

Also assert all three ending counts sum to 1000, `paidCount=stableCount+dangerCount`, even-sample median behavior is exact, `freeAp` counts only AP surrendered by legal phase advances, all six Pareto counts use the four-component comparison, and same inputs serialize to identical sorted metrics twice.

- [ ] **Step 2: Run and confirm the missing metrics/scenario implementation**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/balance-1000-seeds.test.ts`

Expected: FAIL because the metrics, restricted multi-seed compiler, and immutable scenario builder do not exist. A threshold-only failure is not yet sufficient—the contract tests above must fail for missing symbols first.

- [ ] **Step 3: Implement closed multi-seed compilation, metrics, and scenarios**

`compilePocStrategyForSeedV1` recompiles the frozen schedule for each seed rather than replaying the reference-seed literal envelope. It has no generic state predicate/callback. Its only state-sensitive decision is `select_d6_plan_from_war_clue`; all other invocation choice comes from the frozen definition and public action options. Any rejection terminates that seed/strategy and records it as unpaid without selecting a fallback.

Implement `PocBalanceMetricsV1` and `PocParetoVectorV1` exactly as `docs/poc/balance-v0.md` §14: cash margin uses pre-levy cash minus that candidate Program's configured levy, relationship/investigation ranks are independent, free AP is surrendered AP at legal phase transitions, and one strategy's dominance count increments only when it Pareto-dominates all other five strategies for the same seed. Iterate seeds and strategies in stable ascending order. Parallel workers are allowed only behind a test proving byte-identical sorted output to the sequential runner.

`balance-calibration.ts` encodes the exact allowed field order, step sizes, bounds, deficit function, tie-break and 12-iteration cap from §14.4. It materializes each neighboring candidate as a validated immutable test Program, evaluates the same sorted corpus, and returns only a strictly improving closed candidate; it returns `{ kind:"balance_contract_unsatisfied", reason:"no_improving_neighbor" | "iteration_limit", metrics, candidates }` otherwise. It never writes files, mutates a Program, changes thresholds/strategies, or enters the Story export. The agent applies the one returned field change to the two authoritative files and reruns; candidate selection itself is therefore reproducible rather than an informal judgment.

```ts
export interface PocBalanceCalibrationCandidateV1 {
  readonly kind: "candidate";
  readonly field: PocBalanceCalibrationFieldV1;
  readonly direction: "decrease" | "increase";
  readonly step: PositiveSafeInteger;
  readonly beforeValue: NonNegativeSafeInteger;
  readonly afterValue: NonNegativeSafeInteger;
  readonly beforeDeficit: NonNegativeSafeInteger;
  readonly afterDeficit: NonNegativeSafeInteger;
  readonly metrics: PocBalanceMetricsV1;
}

export type PocBalanceCalibrationSelectionV1 =
  | PocBalanceCalibrationCandidateV1
  | {
      readonly kind: "balance_contract_unsatisfied";
      readonly reason: "no_improving_neighbor" | "iteration_limit";
      readonly metrics: PocBalanceMetricsV1;
      readonly candidates: readonly PocBalanceCalibrationCandidateV1[];
    };
```

`createPocCounterfactualScenarioV1` is an exhaustive switch over the four declared kinds. It validates and deep-freezes Program overrides before constructing the Session: D4 pressure changes the real facility build cost 12→24; no-bed and no-cold-storage keep IDs/commands/costs and zero only the named modifier. The returned fixed provenance has no callback, arbitrary path, Snapshot fragment, debug command, mutable object, or default-Story export.

- [ ] **Step 4: Install the read-only gate, run calibration, and stop before golden**

Replace the Phase 2 E2E placeholder behind the stable root name:

```json
{
  "root": {
    "verify:balance": "node scripts/verify-poc-balance.mjs"
  },
  "game/stories/poc": {
    "verify:balance": "vitest run src/test/balance-1000-seeds.test.ts"
  }
}
```

Run `pnpm verify:balance`. If it fails only on thresholds, follow the finite neighbor procedure in `docs/poc/balance-v0.md` §14.4 exactly: one declared value per iteration, complete metrics diff, reference seed + 1–1000 + counterfactual rerun, at most 12 iterations. Update the document and `src/content/balance.ts` together. A schema/command/algorithm/reference failure is not a tunable threshold and must be fixed at its owner. If the deterministic procedure returns `balance_contract_unsatisfied`, stop without creating golden and report its metrics; never lower an assertion, alter the six strategies, or accept a generated baseline.

After success run:

```bash
pnpm verify:balance
pnpm verify:balance
pnpm --filter @project-tavern/story-poc verify:commands
pnpm verify
git diff --check
git diff --exit-code -- game/stories/poc/src/test/fixtures/golden pnpm-lock.yaml
```

Expected: both corpus runs emit byte-identical `PocBalanceMetricsV1`; all thresholds/counterfactuals pass; reference command bytes remain unchanged; the golden directory is still absent/empty; no lockfile or unrelated file changed.

- [ ] **Step 5: Commit calibrated balance gates**

```bash
git add -- game/stories/poc/src/testing/balance-metrics.ts game/stories/poc/src/testing/balance-calibration.ts game/stories/poc/src/testing/counterfactual-scenarios.ts game/stories/poc/src/testing/compile-reference-strategy.ts game/stories/poc/src/testing/run-reference-strategy.ts game/stories/poc/src/test/balance-1000-seeds.test.ts game/stories/poc/src/content/balance.ts docs/poc/balance-v0.md game/stories/poc/package.json scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs package.json
git diff --cached --name-only
git commit -m "test(story-poc): calibrate multiseed balance"
```

If calibration did not change the two balance files, omit them from `git add`; staged paths must still be a subset of the list above.

## Task 11: Freeze Golden Week Artifacts After Balance Passes

**Files:**

- Create: `game/stories/poc/src/tooling-fixtures.ts`
- Create: `game/stories/poc/src/testing/golden-artifact.ts`
- Create: `game/stories/poc/src/test/golden-week.test.ts`
- Create: `game/stories/poc/scripts/update-golden.mjs`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.cash_first.json`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.relationship_first.json`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.investigation_first.json`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.full_delegation.json`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.two_closures_recovery.json`
- Create: `game/stories/poc/src/test/fixtures/golden/strategy.explicit_failure.json`
- Modify: `game/stories/poc/src/testing/compile-reference-strategy.ts`
- Modify: `game/stories/poc/src/test/reference-strategies.test.ts`
- Modify: `game/stories/poc/package.json`
- Modify: `scripts/verify-golden.mjs`
- Modify: `scripts/verify-golden.test.mjs`

**Interfaces:**

- Consumes: the passed Task 10 balance gate, the Contract Catalog's exact `PocStoryToolingFixtureV1`, six reviewed semantic invocation envelopes, fixed bootstraps, same-attempt CommandLog evidence, state digest, six nightly service rows, and terminal completion.
- Produces: the sole frozen synchronous TS-literal `pocStoryToolingFixturesV1`, a closed reference-strategy-to-fixture mapping, `PocGoldenArtifactV1`, `buildPocGoldenArtifactV1`, command-derived verification output for the six reviewed invocation envelopes, six agent-reviewed canonical golden files, explicit `update:golden`, package read-only `verify:golden`, and the stable root aggregator ordered E2E then PoC.

- [ ] **Step 1: Write the failing golden equality test**

```ts
for (const strategyId of pocReferenceStrategyIdsV1) {
  it(`${strategyId} equals its reviewed golden artifact`, async () => {
    const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
    const commands = await compilePocToolingCommandsV1(strategyId, source.commands);
    const storedCommands = await readPocCommandFixtureV1(strategyId);
    expect(canonicalJsonBytes(commands)).toEqual(canonicalJsonBytes(storedCommands));
    const actual = await buildPocGoldenArtifactV1(strategyId, source.commands);
    const stored = await readPocGoldenFixtureV1(strategyId);
    expect(canonicalJsonBytes(actual)).toEqual(canonicalJsonBytes(stored));
    expect(actual.attempts.map(({ order }) => order)).toEqual(
      source.commands.map((_, order) => order),
    );
    expect(actual.nights).toHaveLength(6);
    expect(actual.integrity.mode).toBe("normal");
    expect(actual.terminal.summary).toBeDefined();
  });
}
```

Update `scripts/verify-golden.test.mjs` to freeze exactly two read-only child commands in order: E2E `verify:golden`, then PoC `verify:golden`.

- [ ] **Step 2: Run and confirm only the golden baseline is missing**

Run: `pnpm verify:balance && pnpm --filter @project-tavern/story-poc exec vitest run src/test/golden-week.test.ts && node --test scripts/verify-golden.test.mjs`

Expected: balance passes first; then FAIL because the golden builder/files do not exist. Do not proceed if balance fails.

- [ ] **Step 3: Implement same-attempt golden evidence**

```ts
export interface PocGoldenArtifactV1 {
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly storyIdentity: typeof pocStoryIdentityV1;
  readonly bootstrap: PocGameBootstrapInputV1;
  readonly attempts: readonly {
    readonly order: NonNegativeSafeInteger;
    readonly day: DayIndex;
    readonly phase: CalendarPhase;
    readonly commandSequenceBefore: NonNegativeSafeInteger;
    readonly invocation: PocSemanticInvocationV1;
    readonly preStateDigest: Digest;
    readonly postStateDigest: Digest;
    readonly gameplayFactKinds: readonly PocGameplayFactV1["kind"][];
    readonly rngDraws: readonly RngDrawTraceV1[];
  }[];
  readonly nights: readonly PocGoldenNightV1[];
  readonly terminal: RunCompletionV1;
  readonly integrity: RunIntegrityV1;
}
```

`src/tooling-fixtures.ts` is Story-owned PolyForm code and the only authority for every PoC tooling fixture. It exports deeply frozen, synchronous, Node-type-strip-safe TS literals satisfying the exact `PocStoryToolingFixtureV1` shape `{ fixtureId, seed, commands: readonly PocGameCommandV1[] }`, plus one closed mapping from the six reference strategy IDs to their corresponding entries. It performs no I/O, imports no test module, is absent from the default Story closure, and contains no filesystem path or JSON reader. The reference compiler deterministically maps those exact commands to the already reviewed legal Semantic invocations and verifies the command JSON envelope as output; it does not make a runtime/test JSON file authoritative. Task 12 imports these same frozen fixture references into the tooling export and must not restate any command literal.

The golden builder validates each source command, awaits commands sequentially through the real GameSession/Semantic mapping, checks each pre-dispatch day/phase/sequence, and pairs it with exactly one same-attempt CommandLog entry. It never reads commands from `src/test/fixtures`, loads the filesystem at runtime, or re-executes to recover RNG/facts. Nightly rows come from authoritative service history/ledger; terminal data comes from persisted Run completion. The six command-envelope JSON files and six golden JSON files are deterministic reviewed verification outputs derived from the same TS command source.

- [ ] **Step 4: Generate, agent-review, hash, and verify twice**

Run:

```bash
pnpm verify:balance
pnpm --filter @project-tavern/story-poc update:golden
git add -N -- game/stories/poc/src/test/fixtures/golden
git diff --no-ext-diff -- game/stories/poc/src/test/fixtures/golden
find game/stories/poc/src/test/fixtures/golden -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-golden.before.sha256
pnpm --filter @project-tavern/story-poc verify:golden
pnpm verify:golden
pnpm verify:golden
pnpm verify
find game/stories/poc/src/test/fixtures/golden -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-golden.after.sha256
diff -u /tmp/project-tavern-golden.before.sha256 /tmp/project-tavern-golden.after.sha256
```

Expected: exactly six canonical artifacts appear in the full intent-to-add diff. The agent records the global rubric result, verifies every command entry/same-attempt digest/RNG/fact/night/terminal/integrity field and the complete hashes; all three read-only runs preserve bytes. No human approval is awaited.

- [ ] **Step 5: Commit the exact golden corpus**

```bash
git add -- game/stories/poc/src/tooling-fixtures.ts game/stories/poc/src/testing/compile-reference-strategy.ts game/stories/poc/src/testing/golden-artifact.ts game/stories/poc/src/test/reference-strategies.test.ts game/stories/poc/src/test/golden-week.test.ts game/stories/poc/scripts/update-golden.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/package.json scripts/verify-golden.mjs scripts/verify-golden.test.mjs
git diff --cached --name-only
git commit -m "test(story-poc): freeze calibrated golden weeks"
```

## Task 12: Add Same-Artifact Story Tooling and Reviewed Save Fixtures

**Files:**

- Create: `game/stories/poc/src/tooling/index.ts`
- Create: `game/stories/poc/src/tooling/fixtures.ts`
- Create: `game/stories/poc/src/tooling/notes.ts`
- Create: `game/stories/poc/src/testing/save-fixture-builder.ts`
- Create: `game/stories/poc/src/testing/save-fixture-provenance.ts`
- Create: `game/stories/poc/src/testing/poc-runtime-test-fixture.ts`
- Create: `game/stories/poc/src/test/tooling.test.ts`
- Create: `game/stories/poc/src/test/tooling-runtime.integration.test.ts`
- Create: `game/stories/poc/src/test/save-fixtures.test.ts`
- Create: `game/stories/poc/scripts/update-save-fixtures.mjs`
- Create: `game/stories/poc/src/test/fixtures/saves/save.auto-opening.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.quick-world-action.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.manual-completed.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.auto-current-corrupt.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.auto-previous-valid.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.future-format.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.revision-mismatch.json`
- Create: `game/stories/poc/src/test/fixtures/saves/save.digest-mismatch.json`
- Modify: `game/stories/poc/package.json`
- Modify: `scripts/verify-fixtures.mjs`
- Modify: `scripts/verify-fixtures.test.mjs`

**Interfaces:**

- Consumes: Phase 3 `StoryToolingEntryV1`, the exact Catalog `PocStoryToolingFixtureV1`, Task 11's sole frozen `pocStoryToolingFixturesV1` references, capability-gated DebugTools/fixture anchor, the resolved `PocGameSimulationV1.debugCommandExecutor`, Save codec/compatibility, Auto rotation repository, DebugBundle/replay, resolved PoC identity, Snapshot-owned RunIntegrity, Canonical JSON, and an injected fixed-specifier tooling loader.
- Produces: `pocStoryToolingEntryV1`, test-only `createPocRuntimeTestFixtureV1`, frozen PoC fixture provenance/clock, command-derived fixture anchors/notes available from the same Artifact without redefining commands, actual-Story ten-kind replayable-debug evidence, exact import/slot-health classifications, successful-anchor integrity round-trip evidence, eight reviewed Save fixtures, explicit `update:fixtures`, package read-only `verify:fixtures`, and a stable root `pnpm verify:fixtures` aggregator that checks E2E then PoC.

- [ ] **Step 1: Write failing tooling capability and Save classification tests**

```ts
it("keeps tooling in the same Story identity and denies it while disabled", async () => {
  expect(pocStoryToolingEntryV1.storyIdentity).toEqual(pocStoryIdentityV1);
  expect(pocStoryToolingEntryV1.defineToolingSupport().fixtures).toBe(pocStoryToolingFixturesV1);
  const fixture = createPocRuntimeTestFixtureV1({ debugTools: false, cheats: false });
  await expect(
    fixture.application.debugTools.anchorFixture("fixture.poc_d5_relationship"),
  ).resolves.toEqual({ kind: "capability_disabled" });
  expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
  expect(fixture.toolingLoads()).toBe(0);
});

it("classifies exact, rejected, and inspect-only imports without flattening codes", async () => {
  await expect(classifyPocSaveFixtureV1("save.auto-opening.json")).resolves.toEqual({
    kind: "exact",
    mismatches: [],
  });
  await expect(classifyPocSaveFixtureV1("save.auto-current-corrupt.json")).resolves.toEqual({
    kind: "rejected",
    code: "digest.state_mismatch",
  });
  await expect(classifyPocSaveFixtureV1("save.future-format.json")).resolves.toEqual({
    kind: "rejected",
    code: "envelope.unsupported_revision",
  });
  await expect(classifyPocSaveFixtureV1("save.revision-mismatch.json")).resolves.toEqual({
    kind: "inspect_only",
    mismatches: [{ field: "story_revision", code: "identity.story_revision_mismatch" }],
  });
  await expect(classifyPocSaveFixtureV1("save.digest-mismatch.json")).resolves.toEqual({
    kind: "inspect_only",
    mismatches: [{ field: "simulation_digest", code: "identity.simulation_digest_mismatch" }],
  });
});

it("offers the valid previous slot only after the current Auto record is corrupt", async () => {
  await expect(inspectPocAutoRecoveryPairV1()).resolves.toEqual({
    current: { health: "invalid", code: "digest.state_mismatch" },
    previous: { health: "valid", disposition: "recovery_candidate" },
  });
});

it("loads one fixed tooling export and persists a successful anchor mark", async () => {
  const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
  expect(fixture.toolingLoads()).toBe(0);
  await expect(fixture.application.debugTools.listFixtures()).resolves.toEqual({
    kind: "listed",
    fixtureIds: pocFixtureIdsV1,
  });
  await expect(fixture.application.debugTools.listFixtures()).resolves.toEqual({
    kind: "listed",
    fixtureIds: pocFixtureIdsV1,
  });
  expect(fixture.toolingLoads()).toBe(1);
  expect(fixture.loadedSpecifier()).toBe("@project-tavern/story-poc/tooling");

  const beforeRevision = fixture.application.semantic.observe().revision;
  const publication = fixture.nextSemanticPublication();
  const expectedAnchorSequence =
    pocStoryToolingFixtureByIdV1["fixture.poc_d5_relationship"].commands.length;
  await expect(
    fixture.application.debugTools.anchorFixture("fixture.poc_d5_relationship"),
  ).resolves.toEqual({
    kind: "anchor_established",
    commandSequence: expectedAnchorSequence,
  });
  await expect(publication).resolves.toMatchObject({ revision: beforeRevision + 1 });
  expect(fixture.snapshotForTest().integrity.mode).toBe("modified");
  await expect(fixture.roundTripExactSave()).resolves.toMatchObject({
    snapshot: { integrity: { mode: "modified" } },
  });
  expect(await fixture.exportDebugBundleForTest()).toMatchObject({
    replayBase: { integrity: { mode: "modified" } },
    currentSnapshot: { integrity: { mode: "modified" } },
  });
  expect((await fixture.replayForTest()).finalSnapshot.integrity.mode).toBe("modified");
});

it.each(pocReplayableDebugIntegrationVectorsV1)(
  "routes $kind through the resolved GameSimulation debug executor",
  async ({ command, kind }) => {
    const fixture = createPocRuntimeTestFixtureV1({
      debugTools: true,
      cheats: true,
      initialSnapshot: "debug_matrix",
    });
    expect(command.kind).toBe(kind);
    await expect(
      fixture.application.debugTools.executeDebugCommand(command),
    ).resolves.toMatchObject({
      kind: "committed",
    });
    expect(fixture.debugExecutorValidateCalls()).toBe(1);
    expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(1);
    expect(fixture.latestCommandLogEntry()).toMatchObject({
      source: "debug",
      command: { kind },
      outcome: { kind: "committed" },
    });
    expect(fixture.snapshotForTest().integrity.mode).toBe("modified");
  },
);

it("does not open an attempt, log, or integrity mark after queue-front validation failure", async () => {
  const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
  await expect(
    fixture.application.debugTools.executeDebugCommand(unknownReasonDebugCommandV1()),
  ).resolves.toMatchObject({ kind: "validation_failed" });
  expect(fixture.debugExecutorValidateCalls()).toBe(1);
  expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(0);
  expect(fixture.commandLogForTest()).toEqual([]);
  expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
});

it("records one faulted debug attempt without installing state or an integrity mark", async () => {
  const fixture = createPocRuntimeTestFixtureV1({
    debugTools: true,
    cheats: true,
    injectedOwnerFault: "actors.after_proposal",
  });
  const before = fixture.snapshotForTest();
  await expect(
    fixture.application.debugTools.executeDebugCommand(validSetMoodDebugCommandV1()),
  ).resolves.toMatchObject({ kind: "faulted" });
  expect(fixture.debugExecutorValidateCalls()).toBe(1);
  expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(1);
  expect(fixture.snapshotForTest()).toBe(before);
  expect(fixture.latestCommandLogEntry()).toMatchObject({
    source: "debug",
    outcome: { kind: "faulted" },
  });
  expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
});

it("keeps fixture load as an anchor rather than a replayable debug command", () => {
  expect(pocReplayableDebugIntegrationVectorsV1).toHaveLength(10);
  expect(pocReplayableDebugIntegrationVectorsV1.map((entry) => entry.kind)).toEqual(
    pocDebugCommandKindsV1,
  );
  expect(
    pocReplayableDebugIntegrationVectorsV1.some((entry) => entry.kind === "debug.fixture.load"),
  ).toBe(false);
});
```

Update `scripts/verify-fixtures.test.mjs` to freeze exactly two structured child commands in order: E2E `verify:fixtures`, then PoC `verify:fixtures`. The wrapper stops on first failure and never invokes either Story's writer.

- [ ] **Step 2: Run and confirm missing tooling/fixture files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/tooling.test.ts src/test/tooling-runtime.integration.test.ts src/test/save-fixtures.test.ts && node --test scripts/verify-fixtures.test.mjs`

Expected: FAIL because tooling entry, actual-Story debug integration, Save builder, and tracked fixtures do not exist.

- [ ] **Step 3: Implement same-Artifact tooling and command-derived anchors**

```ts
export const pocStoryToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1,
  storyIdentity: pocStoryIdentityV1,
  defineToolingSupport: () =>
    Object.freeze({
      fixtures: pocStoryToolingFixturesV1,
      notes: pocToolingNotesV1,
    }),
});
```

`src/tooling/fixtures.ts` re-exports Task 11's exact `pocStoryToolingFixturesV1` array reference and derives the frozen `pocStoryToolingFixtureByIdV1` lookup over those same object references, but contains no fixture or command literal and performs no JSON/test/filesystem read. The tooling entry therefore exposes the same `PocStoryToolingFixtureV1` objects consumed by the reference/golden tests rather than reconstructing equivalent values. A successful public DebugTools fixture operation returns `anchor_established` with the exact replayed command count; the lower-level Session-only `anchored` result never leaks through this API.

Add `"./tooling": "./src/tooling/index.ts"` only now. Tooling is dynamically loadable by the same application when runtime capability permits; there is no second HTML/application/build. The loader accepts only the statically selected `@project-tavern/story-poc/tooling` specifier, performs zero loads while disabled, and caches the first successful load.

The test-only `debug_matrix` initial Snapshot contains all referenced actors, one clearable Aura instance, one separate applicable Aura, a declared Fact, and an active Narrative cursor. It is supplied before Session creation with normal integrity; it is not loaded through DebugTools and is never exported as a player fixture. `pocReplayableDebugIntegrationVectorsV1` lives under `src/testing`, not tooling, and contains only strict `PocDebugCommandV1` values plus expected command kinds. Story tooling in this phase owns fixtures and notes only. Phase 5 may add a form adapter that constructs those already-declared values, but no tooling layer may own schema, range/reference/current-state validation, owner mapping, Rule, transaction, attempt, integrity, or CommandLog behavior; all of that comes from `resolved.gameSimulation.debugCommandExecutor` and its simulation identity.

Capability and strict admission-schema failures return before the FIFO. Replayable DebugCommands that pass admission enter the one GameSession FIFO; at queue front, the resolved executor validates against the latest Snapshot. `validation_failed` opens no attempt, consumes no RNG/sequence, writes no CommandLog, and preserves normal integrity. `allowed` calls `executeAttempt` exactly once and can only commit or fault: commit atomically appends one debug-source log entry, installs the new Snapshot, and lets GameSession mark RunIntegrity modified; fault preserves the old Snapshot/integrity and appends the faulted debug attempt before the runtime fault policy pauses the Session. A replayable debug result is never `rejected`.

`debug.fixture.load` is a separate tooling anchor, not part of `PocDebugCommandV1`, its schema, the debug executor, or CommandLog. Its reference/current-state validation also occurs at its FIFO position; failure preserves Snapshot, integrity, replay base, and prior log, while success atomically replaces Snapshot/replay base, clears the prior log, and marks RunIntegrity modified. The ten-kind integration matrix runs through actual DebugTools and the resolved PoC GameSimulation—not a tooling-owned fake executor—and proves stable owner/log/integrity behavior.

- [ ] **Step 4: Build eight Save fixture bytes deterministically**

`pocSaveFixtureProvenanceV1` freezes the complete blocking and diagnostic provenance, save-envelope revision, record revisions, and one explicit UTC timestamp per capture. `buildPocSaveFixtureMatrixV1` resolves one test-only ResolvedGame identity, replays literal semantic invocations sequentially, captures complete committed Snapshots (with RunIntegrity only inside the Snapshot), and encodes valid records through public Save APIs at these exact points: Auto during active Opening, Quick during WorldAction, and Manual after terminal completion.

The Auto pair is produced by two real repository Auto writes so the old current record is decoded and re-encoded with `auto.previous` slot metadata and its original provenance/integrity/savedAt. Only after that legal rotation does the negative builder clone and corrupt the current record's named field; the previous bytes remain valid. Future/revision/digest negatives clone one legal record and change only the declared field before Canonical JSON encoding. No fixture claims production Artifact provenance.

- [ ] **Step 5: Generate once, review, and verify read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-poc update:fixtures
git add -N -- game/stories/poc/src/test/fixtures/saves
git diff --no-ext-diff -- game/stories/poc/src/test/fixtures/saves
find game/stories/poc/src/test/fixtures/saves -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-save-fixtures.before.sha256
pnpm verify:fixtures
pnpm verify:fixtures
find game/stories/poc/src/test/fixtures/saves -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-save-fixtures.after.sha256
diff -u /tmp/project-tavern-save-fixtures.before.sha256 /tmp/project-tavern-save-fixtures.after.sha256
pnpm verify
```

Expected: exactly eight canonical JSON files appear in the full intent-to-add diff. The agent records every complete hash and proves each negative differs from its declared legal source in only the named field; fixed-specifier lazy tooling, ten actual-Story replayable debug kinds, queue-front validation failure, successful anchor, exact Save, DebugBundle, replay, Auto rotation, capability, and integrity tests pass; both fixture runs and full verification rewrite nothing. No human approval is awaited.

- [ ] **Step 6: Commit tooling and Save fixtures**

```bash
git add -- game/stories/poc/src/tooling game/stories/poc/src/testing/save-fixture-builder.ts game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/testing/poc-runtime-test-fixture.ts game/stories/poc/src/test/tooling.test.ts game/stories/poc/src/test/tooling-runtime.integration.test.ts game/stories/poc/src/test/save-fixtures.test.ts game/stories/poc/scripts/update-save-fixtures.mjs game/stories/poc/src/test/fixtures/saves game/stories/poc/package.json scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs
git diff --cached --name-only
git commit -m "test(story-poc): add tooling and save fixtures"
```

## Task 13: Add the Read-Only Phase 4B Verification Gate

**Files:**

- Create: `scripts/verify-poc-story.mts`
- Create: `scripts/verify-poc-story.test.mjs`
- Modify: `package.json`
- Modify: `game/stories/poc/package.json`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`

**Interfaces:**

- Consumes: Phase 4A gate, Phase 3 persistence/diagnostics gate, Story validation/integration, the PoC headless semantic leaf, commands/golden/balance/Save/tooling checks, public exports, boundaries/cycles, typecheck, and build. The full root verifier separately owns the E2E→PoC `verify:semantic` aggregator from Task 8.
- Produces: Phase-4B-only `pnpm verify:poc-story`, cumulative root `pnpm verify:phase4`, one structurally frozen `pnpm verify` child for the complete Phase 4 checkpoint, one direct root `verify:semantic` child, and deterministic read-only gates.

- [ ] **Step 1: Write the failing exact-command-list test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owns the complete read-only Phase 4B command list", async () => {
  const { pocStoryVerificationCommandsV1 } = await import("./verify-poc-story.mts");
  assert.deepEqual(pocStoryVerificationCommandsV1, [
    ["pnpm", ["verify:persistence-diagnostics"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "run", "test:story"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:commands"]],
    ["pnpm", ["verify:balance"]],
    ["pnpm", ["verify:golden"]],
    ["pnpm", ["verify:fixtures"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:semantic"]],
    ["pnpm", ["verify:stories"]],
    ["pnpm", ["verify:public-exports"]],
    ["pnpm", ["verify:boundaries"]],
    ["pnpm", ["verify:cycles"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["build"]],
  ]);
  assert(!JSON.stringify(pocStoryVerificationCommandsV1).match(/update|regenerate/u));
});

test("keeps Phase 4A and 4B test leaves disjoint", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:story"],
    "vitest run src/test/story-validation.test.ts src/test/daily-gates.test.ts src/test/relationship-content.test.ts src/test/investigation-content.test.ts src/test/ending-forecast.test.ts src/test/story-data.test.ts src/test/semantic-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts src/test/tooling.test.ts src/test/tooling-runtime.integration.test.ts",
  );
  assert(!packageJson.scripts["test:story"].includes("gameplay-contract.test.ts"));
  assert(!packageJson.scripts["test:gameplay"].includes("story-validation.test.ts"));
});

test("keeps the cumulative Phase 4 root mapping exact", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["verify:phase4"],
    "pnpm verify:poc-gameplay && pnpm verify:poc-story",
  );
});

test("keeps Phase 4 and semantic as separate root verification children", async () => {
  const { coreVerificationCommandsV1 } = await import("./verify.mjs");
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  assert.equal(names.filter((name) => name === "verify:phase4").length, 1);
  assert.equal(names.filter((name) => name === "verify:semantic").length, 1);
});
```

- [ ] **Step 2: Run and confirm the missing verifier**

Run: `node --test scripts/verify-poc-story.test.mjs`

Expected: FAIL because `verify-poc-story.mts` and cumulative scripts do not exist.

- [ ] **Step 3: Implement sequential fail-fast verification**

Export the deeply frozen Phase 4B command array above, run it in order, stop on first nonzero status, and expose root scripts. Add the exact twelve-file `test:story` command frozen above; it includes content/source-data/application/tooling integration but excludes all Phase 4A files plus commands/golden/balance/Save baselines, whose named read-only gates run separately:

```json
{
  "scripts": {
    "verify:poc-story": "node --experimental-strip-types scripts/verify-poc-story.mts",
    "verify:phase4": "pnpm verify:poc-gameplay && pnpm verify:poc-story"
  }
}
```

`verify:poc-story` does not call `verify:poc-gameplay`, so the cumulative mapping runs each subphase exactly once. It invokes only the PoC headless semantic leaf, not the root `verify:semantic` aggregator; this prevents Phase 5's later browser-parity extension from being nested before its required builds. Update `coreVerificationCommandsV1` and `scripts/verify.test.mjs` to contain exactly one `pnpm verify:phase4` child and exactly one direct `pnpm verify:semantic` child. At this phase both are read-only/headless; Phase 5 may move the direct semantic child after `build:poc`/`build:e2e` without changing `verify:phase4`. The structural test rejects omission, duplication, a writer command, nested root-semantic recursion, or recursion back to `pnpm verify`. No update/generator command may be reachable from either verifier.

- [ ] **Step 4: Run task-local read-only checks without invoking the clean-tree phase gate**

Run:

```bash
before="$(git status --porcelain=v1)"
node --test scripts/verify-poc-story.test.mjs
pnpm --filter @project-tavern/story-poc test:story
pnpm --filter @project-tavern/story-poc verify:commands
pnpm verify:balance
pnpm verify:golden
pnpm verify:fixtures
pnpm --filter @project-tavern/story-poc verify:semantic
pnpm verify:stories
pnpm verify:public-exports
pnpm verify:boundaries
pnpm verify:cycles
pnpm typecheck
pnpm build
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

Expected: every structural/leaf/public/type/build command exits 0 and status is byte-for-byte unchanged. `verify:poc-story`, `verify:phase4`, and root `verify` are deliberately not run while the Task 13 files are dirty because each now reaches the strict materialization clean-tree guard; they run only after the commit in Phase 4B Acceptance.

- [ ] **Step 5: Commit only the Phase 4B gate**

```bash
git add -- scripts/verify-poc-story.mts scripts/verify-poc-story.test.mjs package.json game/stories/poc/package.json scripts/verify.mjs scripts/verify.test.mjs
git commit -m "test(story-poc): add phase four story gate"
```

## Phase 4B Acceptance

After the Task 13 commit, run the cumulative phase gates only from the clean checkpoint:

```bash
test -z "$(git status --porcelain=v1)"
before="$(git ls-files -z | xargs -0 shasum -a 256)"
pnpm verify:poc-story
pnpm verify:phase4
pnpm verify
pnpm verify:phase4
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
test -z "$(git status --porcelain=v1)"
git diff --check
```

- [ ] `week.poc_001` revision 1 resolves as one frozen `ResolvedGameV1` containing one `PocGameSimulationV1`, SimulationProgram, Presentation, resolved SceneGraph, fallback assets, and provenance.
- [ ] The PoC Story owns all concrete Gameplay data/content/Narrative/presentation/semantic mappings; Base/UI/Web/E2E contain no PoC stable ID, relationship, facility, Tavern, or seven-day rule.
- [ ] One strict `pocStoryDataV1` owns all six source fields and all eighteen `StoryContentV1` fields through exactly one named definition source per field. Its no-spread/no-`Omit` projector produces the exact seven-field `PocSimulationDataV1`, sixteen-field simulation content, two-field manifest, and separate `narrative.scenes`; `titleTextId`, source `texts`, real strings, Presentation, tooling, modules and callbacks are excluded.
- [ ] The Story contains exactly 2 policies, 5 ingredients, 4 recipes, 2 segments, 4 service modes, 2 facilities in 1 opportunity, 3 Auras, 5 events, 1 relationship opportunity, 1 two-stage WorldAction, 1 threshold choice, 1 four-band 2D6 check, and 3 endings.
- [ ] D1–D6 each materialize one frozen service-day demand; D7 has no service and terminates at afternoon.
- [ ] D2 `[智力 B]` consumes no AP/RNG, appends the exact +4 ledger effect, and persists its weekly fact.
- [ ] Relationship pending/completed/abandoned/unresolved/reconciled routes and anger Aura application/apology/expiry pass without conflating mood, affection, teamwork, or stage.
- [ ] Reference-seed basic/prepared investigation totals are exactly 8/9 from dice `[4,3]`; one persisted check maps to the correct outcome and rewards.
- [ ] All `current_gap`, `committed_plan_conservative`, and `final` forecasts pass; stable/danger/arrears endings persist the exact two-field relationship/investigation summary, while stable classification reads the three cash/reputation/facility thresholds from `EndingPolicyV1`.
- [ ] Story SemanticGamePort exposes only visible legal actions, creates exactly one Queries per authoritative token, atomically publishes the Phase 4A `PocGameViewV1`, separate `NarrativeProjectionV1 | null`, and action catalog, makes `availableActions()` return that same actions reference, reuses all three references for status-only publications, and never defines a second Gameplay or Narrative projector. `PocGameViewV1` contains no Narrative. Lifecycle/load/anchor replacement changes the opaque authoritative token and semantic revision even for structurally equal Gameplay State; preview reads the latest State at the shared FIFO front, preview/dispatch use the same state-only GameQueries/rules, `waitForIdle` uses revisions rather than sleeps, and automation leaves RunIntegrity normal. Dispatch exhaustively maps the GameSession result to `PocSemanticActionResultV1`; no Snapshot/State/RNG/facts/internal fault/attempt/log field reaches UI or Automation.
- [ ] The resolved default Story uses one complete `zh-CN` catalog, fallback-complete slots plus the exact optional committed approved pack, the exact closed PoC StageScene/variant/rig/HitMap/Interaction catalog, and a Node-importable data-only `.ts` SceneGraph; its default/Headless closure may contain frozen provider metadata/runtime paths but contains no `.tsx`, React/DOM, browser asset loader, tooling import, or `references/`/AIGC source dependency. Its content policy registers no restricted flags or presets, every requirement is zero, and `PocGameViewV1` contains no StageScene/variant/Asset ID.
- [ ] `pocGameSymbolIdsV1` freezes exactly fourteen `symbol.poc.*` IDs for Phase 5B Story-owned providers; no provider/component enters Phase 4B, Base/UI, Gameplay, SceneGraph, AssetId, or semantic publication.
- [ ] `src/tooling-fixtures.ts` is the sole Story-owned static authority for exact `PocStoryToolingFixtureV1` command arrays. Reference/golden verification and same-Artifact tooling share the same frozen object references; command/golden JSON files are deterministic reviewed outputs, and runtime/tooling performs no test-file, JSON-baseline, or filesystem read.
- [ ] Exactly 6 literal semantic command envelopes and 6 golden artifacts verify byte-for-byte without writes; every command entry contains order/day/phase/pre-dispatch sequence/invocation, and every golden contains matching same-attempt state/RNG/GameplayFact evidence, 6 nightly rows, terminal summary, and normal integrity.
- [ ] Seeds 1–1000 meet all frozen thresholds: primary strategies at least 900 paid; delegation 850–950 paid with median cash 0–35; two-closure at least 700 paid; explicit failure at most 200 paid; D4 pressure primary strategies at least 750 paid; maximum strict dominance at most 800.
- [ ] Bed and cold-storage counterfactuals pass exactly as specified by the PoC documents.
- [ ] Same-Artifact Story tooling is capability-gated, loads only the fixed `@project-tavern/story-poc/tooling` export once after enablement, and has no separate application/build. An actual-Story integration matrix covers exactly the ten `PocDebugCommandV1` kinds while schema/validation/owner routing/attempt semantics remain on the resolved GameSimulation and in simulation identity; future form adapters may only construct those values. Validation failure creates no attempt/log/integrity mark; committed replayable debug creates one debug log entry and a Session-owned integrity mark.
- [ ] `debug.fixture.load` remains a separate anchoring operation outside `PocDebugCommandV1`, `PocGameDebugCommandExecutorV1`, and CommandLog; successful fixture anchoring marks RunIntegrity modified and the same mark appears in exact Save round-trip, replay base/current DebugBundle snapshots, and authoritative replay evidence.
- [ ] Exactly 8 Save fixtures cover active Opening, WorldAction, terminal, corrupt-current/valid-previous recovery, future format, Story revision, and simulation digest classifications; verification is read-only.
- [ ] Phase 2/3/4A and materialization prerequisite gates passed before Task 1; every task used exact-path staging/resume rules; `pnpm-lock.yaml` remained byte-identical and no registry/install command ran.
- [ ] `test:gameplay` and `test:story` are exact disjoint leaves; commands, golden, balance and Save baselines run only through their named read-only verifiers.
- [ ] Command/golden/Save first-generation files were exposed with `git add -N`, reviewed by the executing agent against the frozen rubric, and preserved under complete path-sorted SHA-256 lists across two verifier runs.
- [ ] Balance calibration passed before any golden writer ran. Multi-seed compilation has only the declared post-investigation D6 `war_clue` branch, `PocBalanceMetricsV1`/Pareto semantics are exact, and counterfactual Programs are immutable/test-only and materialized before Session creation.
- [ ] Provisional Chinese copy is complete and technically valid; formal copy/art/material approval and human playtesting are absent from this plan and deferred until all automated/full-flow acceptance passes.
- [ ] `pnpm --filter @project-tavern/story-poc test:story`, `verify:commands`, `verify:golden`, `verify:fixtures`, `pnpm verify:balance`, E2E→PoC `pnpm verify:semantic`, `pnpm verify:poc-story`, cumulative `pnpm verify:phase4`, and `pnpm verify` all pass without changing tracked files; the full root verifier structurally contains the Phase 4 checkpoint exactly once.
