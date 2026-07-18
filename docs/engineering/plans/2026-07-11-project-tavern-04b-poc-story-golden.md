# Project Tavern Seven-Day PoC Story and Golden Corpus Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Build the complete non-canonical seven-day `week.poc_001` Story from the Phase 4A Gameplay contracts, supply its content/Narrative/presentation/assets and Story-owned semantic actions, compile six deterministic reference strategies, freeze reviewed provisional technical golden and Save fixtures for Phase 5, and install the exact 1–1000 seed release-balance gate whose deterministic calibration closes before the first Phase 6 Artifact build.

**Architecture:** `game/stories/poc` owns one side-effect-free StoryEntry whose source definition materializes a deeply frozen `PocSimulationProgramV1`, creates the already-proven `PocGameSimulationV1` once, and resolves presentation, SceneGraph, fallback assets, and provenance into one `ResolvedGameV1`. Concrete content and balance are data; all Gameplay algorithms, owner boundaries, command execution, queries, and projection remain in Phase 4A. Story integration and reference drivers operate through the real `GameSessionV1` and `SemanticGamePortV1`. Phase 4B/5 use a fast fixed-seed balance contract gate and provisional technical baselines; the complete 1–1000 release gate remains installed and strict, and deterministic Phase 6 pre-Artifact calibration explicitly regenerates and re-reviews every balance-dependent golden and Save byte.

**Tech Stack:** Phase 2–4A Project Tavern packages, Node.js >=22.12.0, pnpm >=11.0.0, strict TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.10, fast-check 4.9.0, Canonical JSON, and SHA-256 manifests. The Story-owned SceneGraph introduced here is a Node-importable `.ts` data descriptor; React and the Web-only `.tsx` renderer registry arrive in Phase 5.

## Global Constraints

- Phase 4A `pnpm verify:poc-gameplay` is a hard prerequisite. Consume `PocGameSimulationV1`, its ten Story-local GameplayModules, Rules/Resolvers, `PocGameCommandExecutorV1`, `PocGameDebugCommandExecutorV1`, `PocGameQueriesV1`, and `PocGameViewV1`; do not copy or replace them in content/presentation/tooling code.
- Consume the exact Phase 4A surfaces: the seven `PocRulesV1` slots, the separate Scheduling resolver, all eighteen `PocGameQueriesV1` methods, and the Narrative-free `PocGameViewV1`. Story integration publishes `PocGameViewV1`, `NarrativeProjectionV1 | null`, and semantic actions as three atomic channels built from one Queries instance.
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
- Task 10 completes the deterministic runner, counterfactual, calibration-selector, immutable candidate-Program, worker-equivalence, and fixed-seed smoke contracts. Story `verify:balance:smoke` is the bounded Phase 4B/5 gate. Root `pnpm verify:balance` remains the strict complete 1–1000 release gate and may stay red only for the explicitly recorded threshold-only Phase 4B baseline; no schema, command, algorithm, determinism, counterfactual, invariant, or provenance failure may be deferred.
- Task 11 golden and Task 12 Save files are provisional technical baselines: they are still generated, fully diff/hash-reviewed, committed, and verified read-only so tooling and Phase 5 consume real bytes. Before the first Phase 6 Artifact task, the deferred calibration closure must make `pnpm verify:balance` pass without changing thresholds/strategies, regenerate both baseline sets, perform the complete diff/hash review again, and commit the calibrated bytes from a clean checkpoint. No Phase 6 Artifact may be built from the provisional baseline commit.
- No second week, long-term skill tree, employee progression, full facility tree, weather, seasons, dynamic prices, combat, equipment, minigames, metaprogression, runtime LLM, backend, cloud save, or generalized scripting language is added.
- Every task uses TDD, passes its focused tests plus `pnpm typecheck && pnpm verify`, and ends with a narrow commit.
- R1 has already materialized every exact dependency. Phase 4B performs no registry/install write, never runs `pnpm add`, and leaves `pnpm-lock.yaml` byte-identical; package changes are scripts, exports, and license metadata only.
- The executing agent writes complete provisional Chinese TextCatalog/Narrative copy and continues without requesting line-edit approval. `TODO`, placeholder, blank, or deliberately unfinished player-facing strings fail Story validation. Formal copy review, asset preparation/selection, art judgment, and human playtesting are separate tasks outside this plan and cannot block the engineering Goal.
- Phase 4A and 4B test leaves remain orthogonal: `test:gameplay` is the permanently frozen Phase 4A file list, while Phase 4B defines an exact `test:story` list for content/application tests. Baselines and balance gates run only through their named verifiers and are not smuggled into either leaf; in particular no ordinary unit, `test:story`, Phase 4, or Phase 5 gate may accidentally run the complete 1–1000 corpus.

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
      balance-1000-seeds.test.ts       # fixed-seed smoke/contracts; full corpus is the CLI gate
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
- Produces: `pocStoryIdentityV1`, `pocStateContractRevisionV1`, `pocReferenceSeedV1`, six fixed `pocReferenceRunIdsV1`, `pocStoryTitleTextIdV1`, `pocNoContentFilterOptionsTextIdV1`, complete closed readonly ID arrays/registries consumed by every later content file, the exact persistent StoryToken registries, the one HitArea and six Presentation provider IDs required by the resolved SceneGraph, and the explicitly empty `weightedGroupIdsV1`, `questIdsV1`, and `itemIdsV1`.

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

`ids.ts` parses and freezes every policy, actor, character, ingredient, recipe, segment, mode, facility, aura, action, event, check/band, fact, quest, outcome, ending, reason, modifier source, Narrative scene/node/choice/checkpoint, persistent StoryToken, Text, Asset, StageScene, StageSceneVariant, Character/rig/pose/expression/activity/appearance/HitMap/HitArea, InteractionSurface, InteractionTarget, InteractionBehavior, and PresentationProvider ID from the PoC documents and this plan. This Task is the complete simulation/content/presentation ID authority: Tasks 2–13 may consume these registries but never modify `ids.ts` or construct one of those stable IDs from an unregistered raw string. Task 9's testing-only strategy IDs and Task 11's tooling-only `FixtureId` values remain owned by those tasks and are not part of this catalog. `weightedGroupIdsV1`, `questIdsV1`, and `itemIdsV1` are deliberately empty for revision 1. Narrative `SceneId` and Presentation `StageSceneId` remain distinct branded namespaces。十四个 `symbol.poc.*` 值在这里仅作为严格、唯一、冻结的 Story 字符串登记；`pocStoryTitleTextIdV1` 与 `pocNoContentFilterOptionsTextIdV1` 精确解析 `text.poc.story.title` / `text.poc.settings.content_filter.none`，后者为 Phase 5B 的空策略 Settings 提供上游权威 ID。Phase 4B 不导入 UI，也不调用尚由 Phase 5A 才提供的 `parseGameSymbolIdV1`。

The persistent token registries are exact and authored in this order: `relationship.pending`, `relationship.completed`, `relationship.abandoned`, `relationship.reconciled`, `relationship.unresolved_conflict`; then `investigation.not_attempted`, `investigation.missed_by_choice`, `investigation.setback`, `investigation.success_with_cost`, `investigation.complete`, `investigation.exceptional`. The SceneGraph-only closure additionally registers `hit_area.poc.heroine.figure` plus these six provider IDs in InteractionBehavior order: `provider.poc.intent.open_profile`, `provider.poc.semantic.repair_sign_with_heroine`, `provider.poc.semantic.apologize_to_heroine`, `provider.poc.semantic.service_plan`, `provider.poc.semantic.purchase`, and `provider.poc.semantic.old_trade_road`.

Task 1 also authors one flat, named, deeply frozen `pocTextIdsV1` registry and derives the ordered unique `textIdsV1` projection from it. The two IDs above are exact; the executing agent freezes the remaining provisional `text.poc.*` names once here. The registry must cover every later Text demand before Task 1 commits: three character names, all authored reasons, segments, modifier sources, generic and workflow action labels, ingredients, recipes, policies, service modes, facilities, Auras, choices/options, endings, obligation recommendations, rendered Narrative lines/notices, Stage/variant/surface/target/behavior accessibility, and confirmation benefit/risk copy. Tasks 2–7 may only reference this registry, and validation proves every source/presentation TextId belongs to `textIdsV1`.

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

The twelve `assetIdsV1` members are, in authored demand order, the five selected heroine layers (`back_hair`, `costume_body`, `face.neutral`, `front_hair`, `accessory`), the heroine static fallback, and the six standard backgrounds (`main_menu`, Tavern day/evening, Market day, World Map, Week Summary). Task 7 consumes these exact parsed values rather than reparsing raw Asset IDs.

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
    initialSceneId: "scene.manifest_start",
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
    "purchaseQuantityPerLineLimit",
    "menuRecipeLimit",
    "menuPortionsPerRecipeLimit",
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
    purchaseQuantityPerLineLimit: 99,
    menuRecipeLimit: 2,
    menuPortionsPerRecipeLimit: 99,
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
    purchaseQuantityPerLineLimit: 99,
    menuRecipeLimit: 2,
    menuPortionsPerRecipeLimit: 99,
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

`core-definitions.ts` is the one authority for the complete source `texts`, `characters`, `reasons`, `customerSegments`, `modifierSources`, and `items` arrays. Each array follows its Task 1 closed ID order, is built only from parsed Task 1 IDs, is deep-frozen, and has exact object-key/ID/TextId/reference tests; there are exactly three Story characters and two Story modifier sources, while the PoC `items` array is empty rather than omitted. Phase 4A exports standalone strict schemas for State definitions, initial State, and Balance, so Task 2 parses those three values immediately. It does not duplicate private leaf schemas or fabricate a forbidden partial `PocSimulationContentV1`; Task 6 performs strict runtime validation of these source definition arrays when all eighteen `StoryContentV1` fields are assembled. A `TextEntryV1` contains only its stable `textId`, never the real Chinese string. No later task recreates one of these definitions.

Copy every numeric value, Reason binding, formula input, and recommendation exactly from the current balance document. `playableDays` belongs to source `StoryManifestV1` and later projects into `PocSimulationManifestV1`; `customerSegments` belongs only to Story/simulation content; neither is a `StoryBalanceV1` field. Phase 4A owns and exports the exact strict `pocStoryBalanceSchemaV1` used here. Balance uses the exact 23-key Catalog shape above, with four action-cost rows, the complete 6-day × 2-segment base-demand matrix, nine ledger bindings, emergency/planned closure policy, both recovery bindings, preparation/menu/purchase count limits, the two per-entry quantity limits, opening fee, levy/forecast/ending policies, and Narrative limits. Strict schema and exact-key tests reject every missing/extra field and prove all Reason/Text/Action/segment references resolve. `purchaseQuantityPerLineLimit=99` and `menuPortionsPerRecipeLimit=99` are Story-owned static form/command bounds; cash, reception capacity, preparation capacity, and ingredient availability remain separate dynamic guards. `maxNarrativeStepsPerCommand=128` and `maxNarrativeCallDepth=8` use the exact `StoryBalanceV1` field names consumed by the Phase 4A interpreter and reject a stale `64`/`4` literal or alias field. Ingredients use the exact Catalog fields `ingredientId`, `nameTextId`, `unitPrice`, `shelfLifeDays`, and `refrigeratable`; recipes use `recipeId`, `nameTextId`, required quantities, `salePrice`, `prepPoints`, and per-segment preferences. Inventory valuation derives from the Ingredient `unitPrice`, and the stable valuation/removal Reason bindings remain in `StoryBalanceV1.ledgerReasons`; revision 1 has no Ingredient reason/valuation fields and no Recipe equipment-gate field. `pocInitialStateV1` contains no ingredient batch, item, or Aura and initializes every source-owned value exactly once. Complete concrete sequence-zero GameSimulation validation waits until Task 6 has assembled all eighteen Story content fields.

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
- Modify: `scripts/workspace-policy.mjs`
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

Actions encode purchase, preparation, rest, service-plan, phase/levy, StoryAction, WorldAction, and facility-opportunity presentation plus authored gates. `ActionPresentationDefinitionV1` has no cost fields: fixed action/service costs remain in Task 2 Balance, facility costs remain in D4 Facility definitions, and later StoryAction/WorldAction costs remain in their own definitions/effects. Opening start/continue/finalize are deliberately absent from generic `StoryContent.actions`: `PocGameQueriesV1.getTavernOpeningControl()` is their only UI projection and exposes exactly one context-valid branch. The shared `action.choose_life_policy` presentation uses the Catalog-required empty visibility/availability and an empty confirmation; current v1 has no per-policy confirmation field, so the four provisional policy-specific confirmation TextIds remain registered rather than being incorrectly merged into every option. The D2 invoice `[智力 B]` choice consumes zero AP and zero RNG, appends the exact +4 ledger effect, and sets the weekly fact. `facilities-auras.ts` owns the only `FacilityOpportunityDefinitionV1` array: exactly one `action.facility_window` entry references both facilities in authored order and freezes build/skip confirmation, availability and skip Reason once. D4 facility definitions own their costs/modifiers and never duplicate the opportunity. The three Aura definitions freeze the exact duration policies: anger is `day_end × 2`, repaired-sign is applicable-successful `opening × 1`, and adventure strain is `night_recovery × 1`; no content carries `expiresAt` or invents a condition expiry. Scheduler events use the fixed total order and stable blocking arbitration; Event IDs are never reused as player Action IDs.

```ts
export const pocEventDefinitionsV1 = deepFreezePocValueV1([
  buildTutorialFirstServiceEventV1(),
  buildSupplierInvoiceEventV1(),
  buildHelperAvailableEventV1(),
  buildFacilityWindowEventV1(),
  buildLevyDueEventV1(),
] satisfies readonly StoryEventDefinitionV1[]);
```

Phase 4A keeps the individual Action/Event/Facility/Aura Zod schemas private and exports only the complete Simulation-content schema. Task 3 therefore uses exact object-key/reference tests, `satisfies`, and recursive freezing for these partial arrays; it neither duplicates those schemas nor fabricates a partial `PocSimulationContentV1`. Task 6 performs their strict runtime parse once all eighteen content fields are present.

Create `game/stories/poc/LICENSE.md` in the same commit: executable software remains PolyForm Noncommercial, while `src/content/narrative/**` is CC BY-NC-SA 4.0. Change package metadata and the frozen `scripts/workspace-policy.mjs` entry for `@project-tavern/story-poc` to `SEE LICENSE IN LICENSE.md`; the boundary verifier requires those two values to remain equal. Do not change another package policy and do not add a tooling export yet.

- [ ] **Step 4: Run content, licensing, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/daily-gates.test.ts && pnpm verify && pnpm typecheck`

Expected: PASS; D1–D4 reachability/gates/counts/references pass and package license scope matches the files introduced in this task.

- [ ] **Step 5: Commit D1–D4 content**

```bash
git add -- game/stories/poc/src/content/actions.ts game/stories/poc/src/content/facilities-auras.ts game/stories/poc/src/content/events.ts game/stories/poc/src/content/narrative/d1-d4.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/LICENSE.md game/stories/poc/package.json scripts/workspace-policy.mjs
git commit -m "feat(story-poc): add early-week content"
```

## Task 4: Implement the D5 Relationship Branch and D6 Apology Content

**Files:**

- Create: `game/stories/poc/src/content/narrative/relationship.ts`
- Create: `game/stories/poc/src/test/relationship-content.test.ts`

**Interfaces:**

- Consumes: relationship State/Effect contracts, StoryAction/Narrative IR, exact conditions in the PoC content document, and Task 3 Narrative definitions.
- Produces: `pocRelationshipNarrativeV1` as the exact two-scene `DeepReadonly<readonly NarrativeSceneV1[]>`, the exact two-row `pocRelationshipStoryActionDefinitionsV1`, and the authored transitions among the already-owned pending/completed/abandoned/unresolved/reconciled Outcome tokens.

- [ ] **Step 1: Write failing route and Aura tests**

```ts
it("keeps ignoring the relationship route valid and makes conflict exceptional", () => {
  const repairScene = pocRelationshipNarrativeV1[0];
  const choiceNode = repairScene?.nodes.find((node) => node.kind === "choice");
  const conflictChoice = choiceNode?.choices.find(
    (choice) => choice.choiceId === parseChoiceId("choice.repair_sign.conflict"),
  );
  expect(conflictChoice?.effects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "relationship.affection.adjust", delta: expect.any(Number) }),
      expect.objectContaining({ kind: "aura.apply", auraId: "heroine.angry" }),
    ]),
  );
});

it("authors apology as the exact StoryAction start transaction", () => {
  const apology = pocRelationshipStoryActionDefinitionsV1[1];
  expect(apology?.startEffects).toContainEqual(
    expect.objectContaining({ kind: "aura.clear", auraId: "heroine.angry" }),
  );
  expect(apology?.startEffects).toContainEqual(
    expect.objectContaining({
      kind: "outcome.set",
      value: { kind: "token", value: "relationship.reconciled" },
    }),
  );
});
```

- [ ] **Step 2: Run and confirm missing relationship content**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/relationship-content.test.ts`

Expected: FAIL because relationship Narrative/actions do not exist.

- [ ] **Step 3: Encode the complete branch without a second relationship system**

Use the existing Actors relationship State and Status Aura. `pocRelationshipNarrativeV1` is a recursively frozen two-scene array so Task 6 can concatenate it directly; do not invent a second source aggregate for `start`, the default Outcome, individual choices, or apology. The repair scene is exactly a speakerless narration intro, the three-choice node, then end. The apology StoryAction itself expresses the player's apology; its scene is exactly one heroine response line followed by end. `pocRelationshipStoryActionDefinitionsV1` contains repair first with no start effects, then apology with ordered start effects: AP -1, affection +1, clear the heroine's angry Aura, and set the relationship Outcome to the reconciled token. The repair scene's ordered cooperate effects are AP -2, player stamina -1, heroine stamina -1, affection +3, heroine mood +1, apply the `opening × 1` repaired-sign Aura with StoryAction provenance, set relationship completed, then set investigation missed-by-choice. Decline sets relationship abandoned then investigation missed-by-choice. Conflict applies affection -1, the `day_end × 2` angry Aura with StoryAction provenance, relationship unresolved-conflict, then investigation missed-by-choice. All Outcome values use the strict `{ kind: "token", value }` shape. All three choices declare the old-trade-road mutual exclusion; only cooperate declares the repair benefit and only conflict declares the conflict risk.

The Action visibility/availability gates and Action-level confirmations already landed completely in Task 3 and are not re-authored here. The engine enum remains exactly `stranger | dislike | cold | friendly | trust | admiration | lovers`, while this seven-day PoC initializes and keeps the derived stage at `cold`; affection and teamwork may change but are not stage names. Starting this branch blocks investigation; not starting it is valid. Apology changes affection and the relationship Outcome but never mood or relationship stage. Natural Aura expiry clears only the Aura and keeps the unresolved-conflict Outcome.

- [ ] **Step 4: Run content and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/relationship-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all route outcomes, sign/range constraints, mutual-exclusion gates, anger application/clear, and stable references validate.

- [ ] **Step 5: Commit relationship content**

```bash
git add -- game/stories/poc/src/content/narrative/relationship.ts game/stories/poc/src/test/relationship-content.test.ts
git commit -m "feat(story-poc): add relationship branch"
```

## Task 5: Implement the Two-Stage Investigation and D6 Consequences

**Files:**

- Create: `game/stories/poc/src/content/narrative/investigation.ts`
- Create: `game/stories/poc/src/content/checks-endings.ts`
- Create: `game/stories/poc/src/test/investigation-content.test.ts`

**Interfaces:**

- Consumes: WorldAction/Workflow/Check/Outcome IR, PoC check resolver contract, mutual-exclusion facts/outcomes, and reference seed.
- Produces: `pocInvestigationNarrativeV1` as the exact two-scene `DeepReadonly<readonly NarrativeSceneV1[]>`, the sole `pocWorldActionDefinitionsV1`, the sole `pocCheckDefinitionsV1`, one four-band 2D6 check, investigation outcomes/effects, and data consumed by the existing D6 consequence mechanisms. The sole deterministic threshold choice already landed with the D2 supplier event in Task 3.

- [ ] **Step 1: Write failing content and fixed-vector tests**

```ts
it("defines one two-stage investigation and one four-band check", () => {
  expect(pocInvestigationNarrativeV1.map(({ sceneId }) => sceneId)).toEqual([
    "scene.old_trade_road.departure",
    "scene.old_trade_road.investigation",
  ]);
  expect(pocWorldActionDefinitionsV1[0]?.steps).toHaveLength(2);
  expect(pocCheckDefinitionsV1[0]?.dice).toBe("2d6");
  expect(pocCheckDefinitionsV1[0]?.bands).toHaveLength(4);
});

it("keeps the reference basic/prepared totals at 8 and 9", () => {
  const basic = resolveReferenceInvestigationCheckV1({ preparationBonus: 0 });
  const prepared = resolveReferenceInvestigationCheckV1({ preparationBonus: 1 });
  expect(basic.dice).toEqual([4, 3]);
  expect(basic.total).toBe(8);
  expect(prepared.total).toBe(9);
});
```

- [ ] **Step 2: Run and confirm missing investigation files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/investigation-content.test.ts`

Expected: FAIL because investigation/check/ending content is absent.

- [ ] **Step 3: Encode exact WorldAction/check/outcome data**

`pocInvestigationNarrativeV1` is a recursively frozen two-scene array: departure narration then end, followed by investigation narration then end. There is no choice/check node or third result scene. The sole WorldAction has empty local availability because Task 3 already owns its Action visibility/availability gates. It declares base cash 4, player stamina 3, the morning/afternoon steps with AP 1/2, the basic option at additional cash/preparation 0/0, the prepared option at 4/+1, and one Begin effect that sets the relationship Outcome to the abandoned token. Basic has empty option confirmation because the Action confirmation already owns the shared clue/mutual-exclusion/base-risk copy; prepared alone adds its preparation benefit and extra-cost risk.

The four Check bands are `[2,5]`, `[6,8]`, `[9,11]`, and `[12,null]`. In authored order, setback grants herb 1, applies the `night_recovery × 1` strain Aura, and sets the setback Outcome; success-with-cost grants meat 1/herb 2 then sets its Outcome; complete grants meat 2/herb 3, sets the war-clue Fact, then its Outcome; exceptional grants meat 3/herb 4, sets the Fact, adds reputation 1, then its Outcome. Each band uses its matching investigation ReasonId, and Inventory/Aura provenance is the old-trade-road WorldAction. Story values use strict `{ kind, value }` wrappers. D6 demand, FIFO Inventory, Aura recovery, and diagnostics consume these existing outputs; do not add a D6 Event, custom ledger, duplicate demand modifier, or third Narrative scene.

The first stage records the chosen option and opens Narrative; the second resolves the one check and applies Inventory/Fact/Outcome effects once. The existing GameCommandExecutor owns Workflow progress and persisted `ResolvedCheckV1`; this content task does not add a second workflow or persistence harness. The 2D6 check consumes exactly two draws and cannot retry. The fixed-vector test uses the real Base RNG and Phase 4A resolver, consuming the twelve D1–D6 demand draws from a fresh `pocReferenceSeedV1` before the two Check draws; its helper is test-local, not a production API. Relationship/investigation start conditions remain mutually exclusive through the Task 3 Action gates.

- [ ] **Step 4: Run investigation and repository checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/investigation-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; route reachability, two-stage definitions, the four Check bands, fixed vector, rewards, and existing D6 consequence bindings pass. Workflow progress and persisted-check behavior remain covered by Phase 4A and the later Story Session integration tasks.

- [ ] **Step 5: Commit investigation content**

```bash
git add -- game/stories/poc/src/content/narrative/investigation.ts game/stories/poc/src/content/checks-endings.ts game/stories/poc/src/test/investigation-content.test.ts
git commit -m "feat(story-poc): add investigation branch"
```

## Task 6: Freeze Rule Data, Forecasts, and Three Ending Outcomes

**Files:**

- Modify: `game/stories/poc/src/content/checks-endings.ts`
- Create: `game/stories/poc/src/content/narrative/index.ts`
- Create: `game/stories/poc/src/content/story-data.ts`
- Create: `game/stories/poc/src/test/ending-forecast.test.ts`
- Create: `game/stories/poc/src/test/story-data.test.ts`

**Interfaces:**

- Consumes: Phase 4A Rules/Resolvers and state-only Queries; every named source-definition array from Tasks 2–5; exact forecast/ending policy from `docs/poc/simulation-rules.md`; and ending IDs/reasons/outcomes.
- Produces: referentially complete `pocEndingDefinitionsV1`, combined `pocNarrativeScenesV1`, stable/danger/arrears vectors, the sole complete source `pocStoryDataV1: PocStoryDataV1`, the explicit `projectPocSimulationDataV1(source, resolvedBalance)` projector, and its concrete `pocSimulationDataV1: PocSimulationDataV1` output consumed by Story materialization. It consumes and verifies the sole `StoryBalanceV1.obligationForecast`/`endingPolicy` already frozen in Task 2 rather than creating a second policy or a no-op Balance diff.

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

Add only ending definitions, complete source/projection composition, and the tests that consume the already-frozen Balance policy, ReasonIds, and effect lists. `pocEndingDefinitionsV1` contains exactly one row per terminal status in stable/danger/arrears order; each row declares its own EndingId, status, the same two named relationship/investigation OutcomeId bindings, and its progression-only effects (empty for this concrete PoC revision). Invoke the Phase 4A factories and `createPocGameQueriesV1` in pure provider tests; do not add a new `rules/` or `resolvers/` implementation under `content`. The concrete initial-state vector above must differ from the Phase 4A fixture where authored data differs (`intellect="B"`/cash `70` here versus `"C"`/`100` there), while both Simulation instances keep the same ten descriptors/order and every aggregate owner Slice equals the corresponding binding initializer. This proves that no fixture singleton or cross-Program owner data leaks into the resolved Story. `PocRulesV1.endings.evaluate` reads the one Balance-owned ending policy and has no forecast method or private threshold/EndingId/OutcomeId copy: policy decides status/reasons, then the status-matched definition supplies endingId/effects/summary bindings. Forecast is exclusively `getObligationForecast()` over the latest Gameplay State plus the same Tavern preview calculator wrapper: before `visibleFrom` it returns `null`, then `current_gap`, only an eligible frozen D5+ plan yields `committed_plan_conservative`, and all service days resolved yields `final`. The wrapper owns the shared structural/reference/day/mode guard and supplies either the current-resource rule branch or exact active plan/session branch; Story content does not duplicate the Condition evaluator. Stable requires paid levy plus the exact cash/reputation/facility thresholds and persists the two-field relationship/investigation summary. Arrears never deducts unavailable cash and records exact shortfall.

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

There is no partial `pocSimulationDataBaseV1`, source spread, `Omit`, implicit merge, or second definition array. `pocStoryDataSchemaV1` is Phase-4B-owned and strict at its six top-level fields, `StoryManifestV1`, and all eighteen `StoryContentV1` fields. It parses source-only manifest/text records locally, composes `pocStoryStateDefinitionsSchemaV1`, `pocStoryInitialStateSchemaV1`, `pocStoryBalanceSchemaV1`, `pocSimulationContentSchemaV1`, and `pocNarrativeProgramSchemaV1`, and never republishes or duplicates private Gameplay leaf schemas. The projector then uses `pocSimulationDataSchemaV1` after spelling all seven simulation fields, both manifest fields, all sixteen simulation-content fields, and `narrative.scenes` explicitly before canonical round-trip/deep freeze. `story-data.test.ts` structurally rejects spread/`Omit`, proves the exact source/projection key sets and exclusions, and only then creates the concrete sequence-zero GameSimulation. Tests reject missing/extra source and projection keys, executable/module/presentation/tooling values, and any unresolved reference.

- [ ] **Step 4: Run forecast, rule, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/ending-forecast.test.ts src/test/story-data.test.ts src/test/investigation-content.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; every forecast transition, recommendation nulling, all three endings, exact source/projection shapes, complete sequence-zero initialization, no mutation/thenable/NaN, and strict schema validation pass.

- [ ] **Step 5: Commit final simulation data**

```bash
git add -- game/stories/poc/src/content/checks-endings.ts game/stories/poc/src/content/narrative/index.ts game/stories/poc/src/content/story-data.ts game/stories/poc/src/test/ending-forecast.test.ts game/stories/poc/src/test/story-data.test.ts
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
- Create: `game/stories/poc/src/gameplay/rule-provider-entries/demand.ts`
- Create: `game/stories/poc/src/gameplay/rule-provider-entries/tavern.ts`
- Create: `game/stories/poc/src/gameplay/rule-provider-entries/checks.ts`
- Create: `game/stories/poc/src/gameplay/rule-provider-entries/endings.ts`
- Create: `game/stories/poc/src/gameplay/rule-providers.ts`
- Create: `game/stories/poc/scripts/update-rule-source-digests.mts`
- Create: `game/stories/poc/src/rule-source-digests.generated.ts`
- Create: `game/stories/poc/src/test/rule-source-digests.test.ts`
- Modify: `game/stories/poc/src/content/balance.ts`
- Modify: `game/stories/poc/src/content/facilities-auras.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/schemas.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/types.ts`
- Modify: `game/stories/poc/src/gameplay/game-queries.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`
- Modify: `game/stories/poc/src/testing/gameplay-fixture.ts`
- Modify: `game/stories/poc/src/test/daily-gates.test.ts`
- Modify: `game/stories/poc/src/test/game-queries.test.ts`
- Modify: `game/stories/poc/src/index.ts`
- Modify: `game/stories/poc/LICENSE.md`
- Modify: `game/stories/poc/package.json`
- Modify: `game/stories/poc/src/test/story-validation.test.ts`
- Modify: `docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md`
- Inspect unchanged: `game/packages/assets/src/index.ts`
- Inspect unchanged: `game/packages/assets/src/approved-poc-pack.ts`
- Inspect unchanged: `game/packages/assets/runtime/poc/**`

**Interfaces:**

- Consumes: Task 6's sole complete `pocStoryDataV1` source and field-by-field projector, `createPocRuleProvidersV1`, `createValidatedPocRulesV1`, `createPocRulesV1`, `createPocGameSimulationV1`, Base ResolvedGame/Story/Patch/asset contracts, the Node-safe data-only renderer/layout descriptor contract proven by Phase 2, stable Text/Asset/Action IDs, and the predecessor track's immutable `approvedPocAssetPacksV1` export from `@project-tavern/assets`. The default Story closure does not import `@sillymaker/ui` or a Web renderer registry.
- Produces: `pocStoryEntryV1`, `definePocStoryV1`, `materializePocSimulationProgramV1`, `materializePocPresentationV1`, typed Patch Surfaces, build-generated slot-local Rule provider-closure digests, one complete Chinese TextCatalog, fallback-complete assets with optional approved providers, `PocPresentationV1`, `PocStageSceneGraphV1`, `PocResolvedAssetsV1`, `PocResolvedGameV1`, `pocSceneGraphV1`, `pocHeroineStandardAppearanceV1`, `pocResolvedPresentationCatalogV1`, `pocContentMaturityPolicyV1`, the derived single-source `pocStandardRequiredAssetIdsByVariantV1` mapping, a data-only resolved StageScene/variant/rig/hitmap/interaction catalog, the empty-flag/zero-requirement PoC content policy, one bounded `PocActionInputCatalogV1` Query projection, and the complete `PocSemantic*V1` contract plus `createPocSemanticActionCatalogV1(queries)`.

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
    if (action.delivery === "choices") {
      expect(action.options.length).toBeGreaterThan(0);
      expect(action.directInvocation).toBeNull();
      expect(action.form).toBeNull();
      expect(
        action.options.every(({ invocation }) => invocation.actionId === action.actionId),
      ).toBe(true);
    } else if (action.delivery === "direct") {
      expect(action.options).toEqual([]);
      expect(action.form).toBeNull();
      expect(action.directInvocation.actionId).toBe(action.actionId);
    } else {
      expect(["action.purchase", "action.service_plan"]).toContain(action.actionId);
      expect(action.directInvocation).toBeNull();
      expect(action.options).toEqual([]);
      expect(action.form.actionId).toBe(action.actionId);
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

`approvedPocAssetPackIdentitiesV1` and `approvedPocProviderAssetIdsV1` in this example are test-only, authored-order projections derived from the imported frozen pack; `resolvePocAssetsForTestV1(packs)` constructs a test-only GamePackage with injected packs and resolves it through public `resolveStoryForTestV1`, which indirectly calls the one production Base asset resolver. It does not deep-import `@sillymaker/base/src/**`, copy the resolver, or create another pack catalog/runtime authority.

Add provider-contract cases that an empty approved pack is valid and yields the complete fallback manifest, while a non-empty synthetic pack replaces only matching `replaceable` slots and preserves every slot's `fallbackToken`. The Base resolution cases reject unknown/duplicate/sealed Asset IDs, invalid digest/byte/dimension metadata, and archived/reference/remote/traversal paths according to the public resolver contract. The already accepted `game/packages/assets/src/approved-poc-pack.test.ts` remains the sole live-byte/root gate for a non-empty committed pack: it verifies `game/packages/assets/runtime/poc/**`, media magic, byte length, dimensions and SHA-256. Task 7 reruns that gate and does not duplicate filesystem governance in Story tests. The default Story uses the imported phase-base pack unchanged; tests may inject an empty or synthetic pack without changing default provider selection. Asset Pack identities/providers enter only the presentation/asset digest, never simulation or Save compatibility.

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

Four slot-local entry modules own the exact unvalidated provider groups: `demand.ts` returns the raw `preview/resolve` pair from `createPocDemandRulesV1(data)`, `tavern.ts` returns `preview/settle` from `createPocTavernSettlementResolverV1(data)`, `checks.ts` returns `describe/resolve` from `createPocCheckResolverV1(data)`, and `endings.ts` returns `evaluate` from `createPocEndingRuleV1(data)`. `gameplay/rule-providers.ts` only assembles those four already named groups without remapping their members and exports `createPocRuleProvidersV1(data)`; `gameplay/index.ts` re-exports it and `createPocRulesV1(data)` becomes the unchanged convenience composition `createValidatedPocRulesV1(data, createPocRuleProvidersV1(data))`. This extraction changes no Rule output or public `PocRulesV1` shape and lets each Patch slot bind the actual executable provider instead of a validation wrapper defined in the aggregate barrel.

`materializePocRulesFromPatchValuesV1` is implemented in `patch-surfaces.ts` and maps exactly seven declared slots—`demand.preview`, `demand.resolve`, `tavern.preview`, `tavern.settle`, `checks.describe`, `checks.resolve`, and `endings.evaluate`—into `PocRulesV1`; it performs no implicit merge of unknown keys. The seven slot defaults are the exact raw functions from `createPocRuleProvidersV1(baseData)`. After resolving `values.balance`, the materializer first creates `reboundDefaults = createPocRuleProvidersV1(resolvedData)`. For each slot, exact reference equality with that slot's original `defaultValue` means “unreplaced” and selects the corresponding `reboundDefaults` provider; a different reference selects the Hotfix replacement. The explicit seven-field provider object then passes exactly once through `createValidatedPocRulesV1(resolvedData, providers)`. This ensures a Balance-only Hotfix cannot leave default Rules closed over old data, avoids double-wrapping default Rules, and keeps an actual Rule replacement exact and runtime-validated. Tests must prove `createPocRulesV1` parity, a Balance-only replacement changes both Program data and a representative default Rule result, a one-slot replacement changes only that provider, and no unknown slot is merged.

Scheduling remains a separate deterministic resolver over validated event data, enters simulation source identity, and is not a `PocRulesV1` member or PatchSurface rule slot. The source simulation facet exposes `stateContractRevision`, the explicitly projected `PocSimulationDataV1`, base rule providers, simulation PatchSurface, `materializeProgram`, and `createGameSimulation: createPocGameSimulationV1`. `pocStoryDataV1` is the authoring source but never enters the simulation root wholesale: `projectPocSimulationDataV1` rebuilds the exact field-level projection for the resolved Balance without spread, `Omit`, or implicit merge. That projection excludes real text/presentation/assets/tooling and contains no module instances or owner capabilities. Presentation consumes the source TextId declarations for closure validation and separately exposes source SceneGraph/text/assets, presentation PatchSurface, `materializePresentation`, and one materializer. Resolved SceneGraph comes from resolved Presentation and is not recreated by an application root. Simulation value slots expose Balance plus the exact named rule providers; presentation slots expose complete TextCatalog and one `asset` slot for every replaceable fallback Asset ID. The canonical simulation source projection includes `PocGameDebugCommandExecutorV1`, its strict command/error schemas, owner-routing table, Scheduling resolver, and validation/rule providers, so changing those sources changes `simulationDigest`; tooling form adapters and fixture definitions are excluded from that projection.

The seven executable Rule slots use generated slot-local source/import-closure digests. `update-rule-source-digests.mts` calls the repository's existing `scripts/collect-import-closure.mjs`, reads the sorted live-byte closure of the exact slot entry root below, and computes `digestCanonical("sillymaker:patch-provider:v1", { symbolId, records: [{ path, sha256 }] })` independently for each symbol:

| Patch symbol       | actual provider entry root                                       |
| ------------------ | ---------------------------------------------------------------- |
| `demand.preview`   | `game/stories/poc/src/gameplay/rule-provider-entries/demand.ts`  |
| `demand.resolve`   | `game/stories/poc/src/gameplay/rule-provider-entries/demand.ts`  |
| `tavern.preview`   | `game/stories/poc/src/gameplay/rule-provider-entries/tavern.ts`  |
| `tavern.settle`    | `game/stories/poc/src/gameplay/rule-provider-entries/tavern.ts`  |
| `checks.describe`  | `game/stories/poc/src/gameplay/rule-provider-entries/checks.ts`  |
| `checks.resolve`   | `game/stories/poc/src/gameplay/rule-provider-entries/checks.ts`  |
| `endings.evaluate` | `game/stories/poc/src/gameplay/rule-provider-entries/endings.ts` |

Two slots may legitimately share a closure only when they are members of the same raw provider group; changing Demand code invalidates the two Demand digests but not Check/Ending digests. The aggregate `rule-providers.ts` performs no member remapping and is not a substitute digest root; the validation wrapper from `gameplay/index.ts` is never a Patch default. The writer emits only `src/rule-source-digests.generated.ts`, refuses to overwrite dirty/foreign output bytes, and is exposed as `pnpm --filter @project-tavern/story-poc update:rule-source-digests`. The read-only `rule-source-digests.test.ts` independently recomputes all seven values from these exact roots, rejects a stale/misbound constant, and includes focused parity vectors proving every assembled provider member behaves exactly like its corresponding raw factory member. No test, build, verify, or release command invokes the writer.

`pocStateContractManifestV1` is one explicit exact-data projection with aggregate schema `schema.poc.game-state` revision 1 and persistent runtime-IR schema `schema.poc.narrative-runtime-ir` revision 1. The latter describes only the persisted Narrative `status/source/cursor/callStack/stage` shape; the complete Narrative Program, conditions, commands, effects, Scheduler checkpoints and control flow remain simulation identity. The manifest registers all ten stateful modules in Unicode module-ID order, with each descriptor's exact module ID, contract revision and state slots, using these unique schema IDs:

| Module ID            | State schema ID                       |
| -------------------- | ------------------------------------- |
| `module.actors`      | `schema.poc.module.actors-state`      |
| `module.calendar`    | `schema.poc.module.calendar-state`    |
| `module.facilities`  | `schema.poc.module.facilities-state`  |
| `module.inventory`   | `schema.poc.module.inventory-state`   |
| `module.narrative`   | `schema.poc.module.narrative-state`   |
| `module.progression` | `schema.poc.module.progression-state` |
| `module.run`         | `schema.poc.module.run-state`         |
| `module.status`      | `schema.poc.module.status-state`      |
| `module.tavern`      | `schema.poc.module.tavern-state`      |
| `module.workflow`    | `schema.poc.module.workflow-state`    |

The manifest's stable reference sets are exactly `references.poc.{action,actor,asset,aura,character,check,check-band,choice,customer-segment,ending,event,fact,facility,ingredient,item,modifier-source,node,outcome,policy,quest,reason,recipe,scene,story-token,world-step}` in set-ID order. Each set is the unique code-point-sorted projection of its same-named Task 1 registry; `action` uses only Gameplay `actionIdsV1` and never the seven Semantic workflow-adapter IDs, `character` uses only the simulation Narrative `characterIdsV1`, and the currently empty `item` set remains present. The logical `asset` set is present because `NarrativeStageStateV1` can persist `backgroundAssetId`/`poseAssetId`; renderer/provider identities remain presentation-only. These sets cover every authored stable ID (the Base stable-ID grammar requires a namespaced separator) that can occur in `PocGameStateV1`, including persisted Narrative cursor/stage and active-workflow references. Fixed schema enums such as `ServiceMode`, `CalendarPhase`, `RunStatus`, ranks and stages are validated by their State schema revision rather than encoded as stable-reference IDs; raw values such as `manual` intentionally fail the Base stable-ID grammar. Control-flow-only `CheckpointId`/`WeightedGroupId`, presentation `TextId`, and open schema-validated tooling `FixtureId` are not closed State reference sets; Run/Batch/Ledger/Session instance IDs are likewise schema-validated values rather than closed authored sets. Tests compare every exact set to its source registry, assert ordering/uniqueness, preserve each Module descriptor's declared `stateSlots` order, and prove no Semantic workflow ID, fixed enum, control-flow-only ID, presentation renderer/provider/content preference, or tooling ID enters the State contract.

Run the guarded writer after implementing the source roots and inspect its sole generated diff:

```bash
pnpm --filter @project-tavern/story-poc update:rule-source-digests
git diff -- game/stories/poc/src/rule-source-digests.generated.ts
```

- [ ] **Step 4: Add the data-only SceneGraph, Chinese text, and semantic action descriptors**

`scene-graph.ts` exports only deeply frozen renderer IDs, layout/slot descriptors, and Strict JSON presentation data. It contains no JSX, React component, callback, class instance, DOM/browser global, or dynamic import. The default `src/index.ts`/StoryEntry/Headless import closure may import this descriptor but must not reach any `.tsx` file. Phase 5 adds the Story's Web-only `.tsx` renderer registry/contributions, which resolve these IDs without constructing a second graph or entering the default/Headless closure.

The resolved graph registers exactly the StageScene/variant/surface/target/behavior IDs frozen in Task 1, the exact `pocHeroinePresentationIdsV1` identity, and one concept HitMap whose only PoC target is `target.poc.heroine.figure`. It must not invent head/face/body-part targets or persistent appearance state. Renderer IDs are frozen here as `renderer.poc.stage.main_menu`, `renderer.poc.stage.tavern`, `renderer.poc.stage.market`, `renderer.poc.stage.world_map`, and `renderer.poc.stage.week_summary`; Tavern day/evening deliberately share the Tavern renderer. The character rig continues to use `renderer.poc.character.paper_doll`. `stage_variant.poc.tavern.day` and `.evening` are catalog variants selected later by the Story Application presentation projector; the catalog contains no Calendar trigger and the Gameplay `PocGameViewV1` contains no StageScene/variant/Asset ID.

The Tavern heroine placement uses the visual baseline's normalized foot anchor `{ x: 0.6625, y: 0.93 }`, scale 1. The one concept HitMap uses the renderer-local rectangle `{ kind: "rect", x: 0.45, y: 0.05, width: 0.43, height: 0.9 }`, priority 0, and only `target.poc.heroine.figure`. Tavern/heroine surface anchors are `{ x: 0.5, y: 0.5 }`; Market and World Map use the same neutral surface anchor. These values are Story-authored interaction geometry, not Gameplay State or persisted appearance.

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

All twelve Asset slots are registered fallback-complete before provider resolution: five selected appearance layers, one heroine static fallback, and one background for each of the six variants. Every slot is `replaceable` and has a stable `fallback.poc.*` token. Background slots use the visual-pack master dimensions `2560×1600`, safe area `{ x: 213, y: 0, width: 2134, height: 1600 }`, null pivot, `scene` load group except the Main Menu's `bootstrap` group, and `scene_background` usage. All six character slots share the visual-pack logical canvas `1600×1000`, safe area `{ x: 133, y: 0, width: 1334, height: 1000 }`, foot pivot `{ x: 1060, y: 930 }`, `scene` load group and `character_pose` usage. The predecessor-approved pack may replace only matching slots with those exact dimensions; the empty-pack fixture resolves all twelve to `provider:null`, while the default Story resolves the exact committed pack without changing slot order or fallback tokens.

`pocResolvedPresentationCatalogV1` is one deep-frozen object returned by resolved Presentation and passed to the Phase 5B projector; it is not a Web-only second catalog. Phase 5B derives the Runtime character's layer and asset IDs directly from its explicit pairs and, after selecting a variant, reads `requiredAssetIds` only from `input.resolvedCatalog.requiredAssetIdsByVariant[variantId]`; it never ambient-imports the asset mapping or restates, zips, sorts, unions, or coarsens it. The Phase 5B Story application projector owns the separate exhaustive runtime fallback-policy enrichment so this frozen catalog and its presentation digest remain unchanged. Tests assert the pair order matches the first five authored rig slots, all six exact variant keys and ordered demand arrays, every non-null `backgroundAssetId` equals the first ID of its variant demand, no duplicate within a demand, no unselected slot, and no non-standard asset.

`interaction-catalog.ts` maps `behavior.poc.heroine.open_profile` to a closed Presentation intent symbol, while repair/apology/service-plan/purchase/old-trade-road map to the existing Semantic action IDs. It stores only stable provider symbols in Strict JSON—not invocations, commands, closures, or enabled flags. Phase 5B joins those symbols to the atomic action catalog and performs dynamic mode/cardinality validation; Phase 4B validates only static references, ID uniqueness, HitMap shapes, and the complete open-surface DAG.

The outer `surface.poc.tavern` contains a contextual binding from `target.poc.heroine.figure` to `open_surface → surface.poc.heroine`; `surface.poc.heroine` reuses that same target with allowed `direct | choose` and `openSurfaceId: null`. The Tavern service target remains a separate binding. This deliberately exercises the Phase 2 `InteractionSurfaceTargetBindingV1` contract: target semantics are reusable, while transition/mode is surface-local.

`content-maturity-policy.ts` exports `pocContentMaturityPolicyV1` with `policyRevision=1`、an empty flag/preset catalog and `defaultAllowedFlags=emptyContentMaturityFlagsV1`. `scene-graph.ts` exports `pocSceneGraphV1`. Every runtime asset, variant, target, behavior, text, and fallback in this Story uses `requiredFlags=emptyContentMaturityFlagsV1`; no authored field uses a raw numeric zero to bypass the brand. No filtered AssetId or alternative suggestive asset enters the resolved graph. The complete `zh-CN` catalog maps `pocNoContentFilterOptionsTextIdV1` to the provisional truthful text `当前故事没有可调整的内容过滤选项。`; Story validation requires that exact ID to be nonblank, while later UI still resolves it through `PresentationReadPortV1` rather than importing a raw string.

Task 7 extends `PocGameQueriesV1` with one `getActionInputCatalog()` getter so parameter construction remains on the same read-only Query boundary instead of importing raw Story content in React. Its exact deep-frozen `PocActionInputCatalogV1` projection contains only:

- `purchase.lineLimit = balance.purchaseLineLimit`, `purchase.quantityPerLineLimit = balance.purchaseQuantityPerLineLimit`, plus `purchase.ingredients`: `ingredientId`, `nameTextId`, `unitPrice`, `shelfLifeDays`, and `refrigeratable` for each authored ingredient;
- `tavernPlan.recipeLimit = min(16, balance.menuRecipeLimit)`, `tavernPlan.portionsPerRecipeLimit = balance.menuPortionsPerRecipeLimit`, plus `tavernPlan.serviceModes`: `mode`, `nameTextId`, AP/stamina/wage/capacity fields and confirmation metadata, without availability gates or Rule providers;
- `tavernPlan.recipes`: only currently unlocked `recipeId`, `nameTextId`, ingredient requirements, `salePrice`, and `prepPoints`;
- `facility.options`: the one authored opportunity ID plus build/skip choice, label TextId, cash cost and confirmation metadata; build labels use each `FacilityDefinitionV1.nameTextId`, while skip uses the opportunity's explicit `skipLabelTextId`;
- `worldAction.options`: Action/Choice IDs, label TextId, base/additional cash cost, player-stamina cost and confirmation metadata.

`ServiceModeDefinitionV1` gains the explicit `nameTextId` field already frozen by Task 1. `pocStoryBalanceSchemaV1`, `content/balance.ts`, and the exact balance tests carry the four existing `text.poc.service_mode.{manual,assisted,delegated,closed}.name` IDs as the single source. `FacilityOpportunityDefinitionV1` likewise gains `skipLabelTextId`; `content/facilities-auras.ts` binds it to the already frozen `text.poc.choice.facility.skip.label`, and fixture/schema/referential-closure tests carry that required field. The Query must not construct a TextId from an enum/ID, reuse an unrelated Action label, hard-code a second mapping, or reverse-import `content/ids.ts`. These required label fields complete revision 1 before the first resolved PoC Story/fixture/golden is frozen and do not alter State contract revision. The getter projects from the closed Simulation Program and current Gameplay State, clones exact fields, and exposes no State object, module port, callback, availability gate, Effect, Rule, RNG, sequence, Snapshot or command executor. `game-queries.test.ts` proves the two effective limits, label closure, current unlocked-recipe filtering and deep immutability. This bounded projection is the temporary typed Query workaround for the deferred StateStore v2; it does not create a second state authority.

`semantic-actions.ts` owns these exact closed types; none may remain an implied name. Its catalog consumes all relevant Phase 4A getters rather than inspecting State: generic actions come from `getAvailableActions()`, parameter metadata from `getActionInputCatalog()`, run/policy controls from their dedicated getters, Narrative commands from `getNarrativeProjection()`, and Opening commands only from `getTavernOpeningControl()`. An active Narrative or WorldAction produces no Opening descriptor; otherwise the control contributes exactly one of start/continue/finalize with the exact command and preview carried by that branch:

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

export interface PocSemanticFormByActionV1 {
  readonly "action.purchase": {
    readonly kind: "purchase";
    readonly actionId: "action.purchase";
    readonly input: DeepReadonly<PocActionInputCatalogV1["purchase"]>;
  };
  readonly "action.service_plan": {
    readonly kind: "tavern_plan";
    readonly actionId: "action.service_plan";
    readonly input: DeepReadonly<PocActionInputCatalogV1["tavernPlan"]>;
  };
}

export interface PocSemanticDeliveryKindByActionV1 {
  readonly "action.choose_life_policy": "choices";
  readonly "action.purchase": "form";
  readonly "action.prepare_food": "direct";
  readonly "action.rest": "direct";
  readonly "action.service_plan": "form";
  readonly "action.advance_phase": "direct";
  readonly "action.pay_levy": "direct";
  readonly "action.facility_window": "choices";
  readonly "action.repair_sign_with_heroine": "direct";
  readonly "action.old_trade_road": "choices";
  readonly "action.apologize_to_heroine": "direct";
  readonly "action.run_start": "direct";
  readonly "action.tavern_opening_start": "direct";
  readonly "action.tavern_opening_continue": "direct";
  readonly "action.tavern_opening_finalize": "direct";
  readonly "action.world_action_complete": "direct";
  readonly "action.narrative_advance": "direct";
  readonly "action.narrative_choose": "choices";
}

type PocSemanticActionDeliveryV1<TActionId extends keyof PocSemanticInvocationOptionsByActionV1> =
  PocSemanticDeliveryKindByActionV1[TActionId] extends "direct"
    ? {
        readonly delivery: "direct";
        readonly directInvocation: DeepReadonly<
          Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
        >;
        readonly options: readonly [];
        readonly form: null;
      }
    : PocSemanticDeliveryKindByActionV1[TActionId] extends "choices"
      ? {
          readonly delivery: "choices";
          readonly directInvocation: null;
          readonly options: readonly [
            DeepReadonly<
              PocSemanticActionOptionV1<
                Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
              >
            >,
            ...DeepReadonly<
              PocSemanticActionOptionV1<
                Extract<PocSemanticInvocationV1, { readonly actionId: TActionId }>
              >
            >[],
          ];
          readonly form: null;
        }
      : TActionId extends keyof PocSemanticFormByActionV1
        ? {
            readonly delivery: "form";
            readonly directInvocation: null;
            readonly options: readonly [];
            readonly form: DeepReadonly<PocSemanticFormByActionV1[TActionId]>;
          }
        : never;

export type PocSemanticActionDescriptorV1 = {
  readonly [TActionId in keyof PocSemanticInvocationOptionsByActionV1]: {
    readonly actionId: TActionId;
    readonly textId: TextId;
    readonly enabled: boolean;
    readonly reasons: readonly DeepReadonly<PocRejectionReasonV1>[];
    readonly confirmation: DeepReadonly<PocSemanticConfirmationV1> | null;
  } & PocSemanticActionDeliveryV1<TActionId>;
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

The file declares one strict schema in `pocSemanticInvocationOptionsSchemaByActionV1` for every generic and workflow action member and derives the discriminated union/parser from that closed map. `PocSemanticDeliveryKindByActionV1` has exactly the same keys and fixes exactly one delivery per Action: a no-parameter action uses `direct`; policy/facility/WorldAction/Narrative choices use a finite non-empty `choices` tuple whose invocations parse against the action-specific schema; `action.purchase` and `action.service_plan` use `form` with the exact bounded Query input projection, `directInvocation:null`, and no fabricated concrete invocation. Their quantities/portions are strict PositiveSafeInteger values capped by the two Story Balance limits; the cart/menu combination space remains too large to encode as an authored `choices` list. Policy, Facility, and WorldAction choices retain authored order whenever their parent descriptor is visible; option-specific availability is not duplicated into this descriptor, and selecting one must call the same Semantic `preview` before dispatch so a currently invalid option returns the authoritative typed rejection. Narrative keeps disabled choices in `NarrativeProjectionV1` for display but includes only `enabled === true` choices as invokable Semantic options. The mapped descriptor union preserves `descriptor.actionId === directInvocation/options[].invocation.actionId/form.actionId` at compile time. Unknown actions, missing/extra options, callbacks, state paths, Snapshot fragments, and arbitrary JSON are rejected with stable typed errors. Type tests prove both maps' keys equal the combined literal action-ID union in both directions, reject an extra property on `PocNoSemanticOptionsV1`, reject `purchase/direct` and `rest/choices`, reject mismatched descriptor/invocation/form action IDs, and prove all public `PocSemantic*V1` names export from the Story root.

`PocSemanticActionResultV1` is deliberately not the GameSession dispatch envelope. `projectPocSemanticActionResultV1` exhaustively maps `not_executed` unchanged, maps committed execution to `{ kind: "committed" }`, preserves only player-visible rejection reasons, and collapses an engine fault to `{ kind: "faulted", code: "gameplay_fault" }`. Snapshot, State, RNG, facts, internal fault details, attempts, and CommandLog evidence never cross SemanticGamePort; diagnostics remain the separate player-safe inspection path.

The resolved Story exports exact structural aliases `PocPresentationV1`, `PocStageSceneGraphV1`, and `PocResolvedAssetsV1`, then specializes Base's generic `ResolvedGameV1` as `PocResolvedGameV1`. The aliases are inferred from the concrete materializers/catalogs without `as unknown as`, and public type tests prove their simulation/program/presentation/sceneGraph/assets members match `pocStoryEntryV1`.

Future Scene renderers receive only `{ viewSlice, semantic, presentation }`; no complete `GameApplicationPortV1`, Snapshot, persistence, diagnostics, capability/debug port, module owner, Rule, resolver, or raw content object. Semantic descriptors already contain stable ActionId/TextId, enabled, ordered reasons, and strict invocation options derived from `PocGameQueriesV1`. Do not activate React, JSX, DOM, or `DOM.Iterable` in this phase. Extend `LICENSE.md` so `src/presentation/text-catalogs/**` is CC BY-NC-SA while executable code remains PolyForm.

- [ ] **Step 5: Run source-digest, Story, asset, boundary, type, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/story-validation.test.ts src/test/game-queries.test.ts src/test/rule-source-digests.test.ts && pnpm exec vitest run game/packages/assets/src/approved-poc-pack.test.ts && pnpm verify:stories && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; all generated Rule source digests match their exact live import closures, stable references/reachability/catalog/rule/slot/fallback checks pass, the default entry imports under Node type stripping, the resolved SceneGraph is Strict JSON/data-only and preserved, replayable-debug simulation sources affect only simulation identity, the approved Asset Pack retains its independent live-byte/root verification, and no `.tsx`, React, DOM, runtime image, tooling, Web, AIGC, or reference path enters the default Story/Headless closure. Rerun `pnpm --filter @project-tavern/story-poc update:rule-source-digests` only as a writer audit and require `git diff --exit-code -- game/stories/poc/src/rule-source-digests.generated.ts`; ordinary verification remains read-only.

- [ ] **Step 6: Commit complete Story composition**

```bash
git add -- game/stories/poc/src/presentation game/stories/poc/src/patch-surfaces.ts game/stories/poc/src/story-definition.ts game/stories/poc/src/rule-source-digests.generated.ts game/stories/poc/src/content/balance.ts game/stories/poc/src/content/facilities-auras.ts game/stories/poc/src/gameplay/contracts/schemas.ts game/stories/poc/src/gameplay/contracts/types.ts game/stories/poc/src/gameplay/game-queries.ts game/stories/poc/src/gameplay/rule-provider-entries game/stories/poc/src/gameplay/rule-providers.ts game/stories/poc/src/gameplay/index.ts game/stories/poc/src/testing/gameplay-fixture.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/game-queries.test.ts game/stories/poc/src/test/rule-source-digests.test.ts game/stories/poc/src/test/story-validation.test.ts game/stories/poc/src/index.ts game/stories/poc/scripts/update-rule-source-digests.mts game/stories/poc/package.json game/stories/poc/LICENSE.md docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md
git diff --cached --name-status
git diff --cached --check
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

**Accepted-owner repair during the Task 10 full-root verification:** Task 8's first terminal-route
case drives one complete seven-day week through the real `GameSessionV1` and Semantic port. On the
exact Goal checkpoint toolchain it normally completes in about four seconds, leaving insufficient
margin under Vitest's default five-second per-test timeout; ordinary full-suite CPU contention
produced a correct result after 5.467 seconds and was misclassified as a timeout. This is a semantic
integration contract, not a performance budget. Per the execution protocol's unique-answer
earlier-owner rule, give only that complete-week case the same bounded 15-second timeout already
used by long reference-strategy simulations. Do not change global timeouts, worker concurrency,
production behavior, or the shorter independent terminal case.

Repair files:

- Modify: docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md
- Modify: game/stories/poc/src/test/terminal-route.integration.test.ts

Repair TDD and contract:

1. Record the exact-toolchain full-root RED where the first terminal-route case alone exceeds the
   inherited 5-second timeout while its focused rerun completes with all assertions passing. A
   gameplay assertion failure or deterministic-result drift does not count as this RED.
2. Add only `15_000` as the timeout argument on that first complete-week `it` case.
3. Run the focused terminal-route file repeatedly, its four-file semantic suite, `pnpm verify`,
   Prettier on the repair files, and `git diff --check`; every command must exit 0.
4. Commit the accepted-owner repair exactly:

   ```bash
   git add -- docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md game/stories/poc/src/test/terminal-route.integration.test.ts
   git diff --cached --name-status
   git diff --cached --check
   git commit -m "test(story-poc): bound terminal route timeout"
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

## Task 10: Build Balance Tooling and Freeze the Fast Technical Gate

The unchecked Step labels below are retained byte-for-byte as immutable plan checkboxes. Under the Goal-level deferred-freeze
contract, “run calibration” and “calibrated balance gates” in those legacy labels mean installing and qualifying the exact
read-only calibration/release machinery here; applying a selected value and satisfying the strict population thresholds occur
only in the mandatory Phase 6 entry checkpoint.

**Files:**

- Create: `game/stories/poc/src/testing/balance-metrics.ts`
- Create: `game/stories/poc/src/testing/balance-calibration.ts`
- Create: `game/stories/poc/src/testing/counterfactual-scenarios.ts`
- Create: `game/stories/poc/src/test/balance-1000-seeds.test.ts`
- Modify: `game/stories/poc/src/testing/compile-reference-strategy.ts`
- Modify: `game/stories/poc/src/testing/run-reference-strategy.ts`
- Modify: `docs/poc/balance-v0.md`
- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`
- Create: `scripts/verify-poc-balance.mjs`
- Create: `scripts/verify-poc-balance.test.mjs`
- Modify: `game/stories/poc/package.json`
- Modify: `package.json`

**Owner-authorized Phase 6 `N = 0` repair extension:** the original Task 10 Files remain the owner boundary for evaluator
defects. Before the first calibration step, one separate repair may additionally create
`scripts/run-poc-balance-remote.mjs`/`.test.mjs`, modify the balance-lab and delivery authority documents, GOAL/Roadmap and
Phase 6 plan, and add only the Story `calibrate:balance:remote` alias. It may add explicit `1..64` worker scheduling, strict
remote aggregate-evidence admission/local selector verification and a Story-local exact-half-integer evidence codec. It must preserve
all balance values/thresholds/strategies/direct expectations, provisional report/qualifier, golden, Save, command/tooling
fixtures, root package manifest and lockfile, and commits only with `Balance-Calibration-Repair: true`.

**Interfaces:**

- Consumes: the six frozen strategy definitions, reference-seed literal envelopes, the closed `compilePocStrategyForSeedV1` decision API, fixed smoke seeds plus the complete seeds 1–1000 release range, exact `PocBalanceMetricsV1`/Pareto definitions and finite calibration procedure in `docs/poc/balance-v0.md`, resolved SemanticGamePort, and immutable Program materialization.
- Produces: `PocBalanceMetricsV1`, `PocParetoVectorV1`, `PocCounterfactualProvenanceV1`, `PocCounterfactualScenarioV1`, `createPocCounterfactualScenarioV1`, `PocBalanceCalibrationCandidateV1`, `selectPocBalanceCalibrationStepV1`, bed/cold-storage/D4-pressure counterfactuals, Story `verify:balance:smoke`, its root smoke delegate, strict Story/root `verify:balance`, and read-only Story `calibrate:balance`. The Vitest file is intentionally the fast contract/smoke leaf despite its historical `balance-1000-seeds.test.ts` name; only the CLI default mode executes the full corpus. No golden file exists when this task begins.

- [ ] **Step 1: Write failing metric, compiler-branch, threshold, and counterfactual tests**

```ts
it("keeps the fixed default seed smoke deterministic and internally valid", async () => {
  const sequential = await runPocBalanceCorpusShardV1({
    firstSeed: 1,
    lastSeed: 1,
    execution: "sequential",
  });
  const workers = mergePocBalanceCorpusShardRangeV1(
    await runPocBalanceCorpusWorkersForRangeV1({ firstSeed: 1, lastSeed: 1, workerCount: 1 }),
  );
  expect(canonicalJsonBytes(workers)).toEqual(canonicalJsonBytes(sequential));
  for (const strategy of Object.values(sequential.strategies)) {
    expect(strategy.stableCount + strategy.dangerCount + strategy.arrearsCount).toBe(1);
    expect(strategy.paidAfterTaxCash).toHaveLength(strategy.stableCount + strategy.dangerCount);
  }
  expect(Object.isFrozen(sequential)).toBe(true);

  const syntheticSecond = Object.freeze({ ...sequential, firstSeed: 2, lastSeed: 2 });
  const twoShardMerge = mergePocBalanceCorpusShardRangeV1([syntheticSecond, sequential]);
  expect([twoShardMerge.firstSeed, twoShardMerge.lastSeed]).toEqual([1, 2]);
});

it("asserts the frozen release thresholds over a complete metrics value", () => {
  const metrics = completeMetricsFixtureV1();
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

it("selects the seed-17 D6 plan from the committed war clue", async () => {
  const compiled = await compileInvestigationStrategyForSeedV1(17);
  const warClue = persistedWarClueV1(compiled.finalSnapshot);
  expect(warClue).toBe(committedWarClueAttemptV1(compiled.attempts));
  expect(daySixPlanV1(compiled.fixture)).toEqual(
    warClue ? investigationDaySixDecisionV1.cluePlan : investigationDaySixDecisionV1.noCluePlan,
  );
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

Also assert all three ending counts sum to 1000, `paidCount=stableCount+dangerCount`, every frozen threshold passes at its exact boundary and contributes its specified deficit one unit outside it, even-sample median behavior is exact, `freeAp` counts only AP surrendered by legal phase advances, all six Pareto counts use the four-component comparison, and same inputs serialize to identical sorted metrics twice. Re-admit every structured-clone shard, require ending/sample/count identities, reject malformed/range-mismatched messages, and resolve a worker only after both one admitted message and exit 0; one synthetic reversed two-shard value proves stable merge/gap handling without a second expensive real seed.

`scripts/verify-poc-balance.test.mjs` freezes all five original root/Story aliases below, proves default CLI mode calls the complete 1–1000 runner and exact threshold/counterfactual assertion once, proves both smoke aliases reach the same Story Vitest leaf, proves `--calibrate [--iteration=0..12]` selects from only validated immutable neighbors without writing, and admits only the additional Task-10-only `--qualify-provisional` exact-report mode. Every other argument fails. The Phase 6 owner repair extends strict/qualify/calibrate with an exact trailing `--workers=1..64` grammar while smoke rejects it; default remains 16 and worker count never enters semantic evidence. The test injects bounded fixture evaluations; it never launches the full corpus.

- [ ] **Step 2: Run and confirm the missing metrics/scenario implementation**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/balance-1000-seeds.test.ts && node --test scripts/verify-poc-balance.test.mjs`

Expected: FAIL because the metrics, restricted multi-seed compiler, immutable scenario builder, full CLI and read-only calibration mode do not exist. A threshold-only failure is not yet sufficient—the contract tests above must fail for missing symbols first.

- [ ] **Step 3: Implement closed multi-seed compilation, metrics, and scenarios**

`compilePocStrategyForSeedV1` recompiles the frozen schedule for each seed rather than replaying the reference-seed literal envelope. It has no generic state predicate/callback. Its only state-sensitive decision is `select_d6_plan_from_war_clue`; all other invocation choice comes from the frozen definition and public action options. Any rejection terminates that seed/strategy and records it as unpaid without selecting a fallback.

Implement `PocBalanceMetricsV1` and `PocParetoVectorV1` exactly as `docs/poc/balance-v0.md` §14: cash margin uses pre-levy cash minus that candidate Program's configured levy, relationship/investigation ranks are independent, free AP is surrendered AP at legal phase transitions, and one strategy's dominance count increments only when it Pareto-dominates all other five strategies for the same seed. Iterate seeds and strategies in stable ascending order. Parallel workers are allowed only behind a test proving byte-identical output to the sequential runner plus runtime admission of the structured-clone shard, complete count/sample invariants, stable multi-shard merge and clean worker exit.

`balance-calibration.ts` encodes the exact allowed field order, step sizes, bounds, deficit function, tie-break and 12-iteration cap from §14.4. It materializes each neighboring candidate as a validated immutable test Program, evaluates the same sorted corpus when invoked by the deferred calibration CLI, and returns only a strictly improving closed candidate; it returns `{ kind:"balance_contract_unsatisfied", reason:"no_improving_neighbor" | "iteration_limit", metrics, candidates }` otherwise. It never writes files, mutates a Program, changes thresholds/strategies, or enters the Story export. The future Phase 6 pre-Artifact calibration applies the one returned field change to the two authoritative balance files and reruns; candidate selection itself is therefore reproducible rather than an informal judgment.

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

Install one fast Story gate, one root delegate for convenient direct smoke, and keep the unqualified stable root name exclusively for the complete release corpus:

```json
{
  "root": {
    "verify:balance": "node scripts/verify-poc-balance.mjs",
    "verify:balance:smoke": "node scripts/verify-poc-balance.mjs --smoke"
  },
  "game/stories/poc": {
    "verify:balance:smoke": "vitest run src/test/balance-1000-seeds.test.ts",
    "verify:balance": "node ../../../scripts/verify-poc-balance.mjs",
    "calibrate:balance": "node ../../../scripts/verify-poc-balance.mjs --calibrate"
  }
}
```

In default/main mode `scripts/verify-poc-balance.mjs` directly imports the balance runner, executes exactly seeds 1–1000, evaluates the full frozen threshold/counterfactual contract, emits one canonical report containing `deficit` plus the exact metrics/counterfactual evaluation, and exits nonzero on any failure. It is not a wrapper that invokes Vitest or the Story alias. Worker mode remains the structured shard entry. `--calibrate [--iteration=0..12] [--workers=1..64]` is a separate read-only mode: it evaluates the current full corpus and valid neighboring immutable Programs in frozen order, emits canonical baseline/candidate/selection evidence, enforces the explicit external iteration index, and never edits either authoritative balance file or a fixture. The Story-local canonical codec preserves Base bytes for integer evidence and additionally admits only exact safe half-integer medians.

The Phase 6 repair's `calibrate:balance:remote` controller is separate from this platform-neutral evaluator. It uploads only an
exact clean archive, requires exact source/tree/archive/lock/materialization/package closure and Node/pnpm evidence, runs a
fresh remote offline frozen install, then canonicalizes and strictly admits the complete aggregate result, validates the exact
legal-neighbor set or first-zero canonical prefix, and recomputes deficit/selection locally. It derives before/after digests from
the admitted current/selected evaluations and, after `N = 0`, chains each before digest to the preceding accepted after digest;
it does not repeat the full corpus locally. It emits only the same semantic stdout and writes a separate canonical attestation
without host/IP/path/time/scheduling metadata. It never runs a writer,
build, Vite, Playwright, server, Artifact or remote smoke.

Task 10 also installs the temporary, unaliased `--qualify-provisional` mode. It runs that same complete corpus but exits 0 only when the entire report—every metric, counterfactual and `deficit=49`—equals the reviewed 2026-07-15 provisional evidence; any drift or additional failure remains red. The strict default mode continues to reject that report. Phase 6 final calibration removes this mode and its frozen report literal in the same exact commit that makes the default full gate pass. No other argument is admitted.

Task 10 deliberately does not apply the selected calibration neighbor. First make the bounded gate pass twice, then run the complete gate once as evidence:

```bash
pnpm --filter @project-tavern/story-poc verify:balance:smoke
pnpm --filter @project-tavern/story-poc verify:balance:smoke
node --test scripts/verify-poc-balance.test.mjs
pnpm --filter @project-tavern/story-poc verify:commands
pnpm verify
git diff --check
git diff --exit-code -- game/stories/poc/src/test/fixtures/golden pnpm-lock.yaml
node scripts/verify-poc-balance.mjs --qualify-provisional
```

Expected: both smoke runs pass with byte-identical fixed-seed metrics; compiler branches, invariants, Pareto helpers, worker admission/equivalence, candidate materialization and all facility counterfactuals pass; reference command bytes remain unchanged; the golden directory is still absent/empty; no lockfile or unrelated file changed. The final qualification runs the complete reproduction range `1..1000` and returns 0 only for the recorded frozen-threshold gap: `strategy.full_delegation.paidCount=801` against the unchanged lower bound `850` (deficit 49), with median 14 and every other metric/counterfactual exact. The default root/Story `verify:balance` remains strict and is unit-proven to reject that same report. If live evidence differs, or any non-threshold contract fails, repair its owner before Task 11 rather than deferring it.

- [ ] **Step 5: Commit calibrated balance gates**

```bash
git add -- game/stories/poc/src/testing/balance-metrics.ts game/stories/poc/src/testing/balance-calibration.ts game/stories/poc/src/testing/counterfactual-scenarios.ts game/stories/poc/src/testing/compile-reference-strategy.ts game/stories/poc/src/testing/run-reference-strategy.ts game/stories/poc/src/test/balance-1000-seeds.test.ts docs/poc/balance-v0.md docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md game/stories/poc/package.json scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs package.json
git diff --cached --name-only
git commit -m "test(story-poc): add balance verification tools"
```

## Task 11: Freeze Provisional Technical Golden Week Artifacts

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
- Modify: `.prettierignore`

**Interfaces:**

- Consumes: the passed Task 10 smoke/contract gate, the qualified threshold-only full-corpus evidence, the Contract Catalog's exact `PocStoryToolingFixtureV1`, six reviewed semantic invocation envelopes, fixed bootstraps, same-attempt CommandLog evidence, state digest, six nightly service rows, and terminal completion.
- Produces: the sole frozen synchronous TS-literal `pocStoryToolingFixturesV1`, a closed reference-strategy-to-fixture mapping, `PocGoldenArtifactV1`, `buildPocGoldenArtifactV1`, command-derived verification output for the six reviewed invocation envelopes, six agent-reviewed provisional technical golden files, explicit `update:golden`, package read-only `verify:golden`, and the stable root aggregator ordered E2E then PoC. These bytes are real Phase 5/tooling inputs but are not final balance approval; the deferred pre-Phase6 closure regenerates and re-reviews all six after calibration.

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

Run: `pnpm --filter @project-tavern/story-poc verify:balance:smoke && pnpm --filter @project-tavern/story-poc exec vitest run src/test/golden-week.test.ts && node --test scripts/verify-golden.test.mjs`

Expected: the fast balance contract passes first; then FAIL because the golden builder/files do not exist. Do not proceed if the smoke, qualified-full-failure classification, command, invariant, or counterfactual evidence is invalid.

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

The golden builder validates each source command, awaits commands sequentially through the real GameSession/Semantic mapping, checks each pre-dispatch day/phase/sequence, and pairs it with exactly one same-attempt CommandLog entry. It never reads commands from `src/test/fixtures`, loads the filesystem at runtime, or re-executes to recover RNG/facts. Nightly rows come from authoritative service history/ledger; terminal data comes from persisted Run completion. The six command-envelope JSON files and six golden JSON files are deterministic reviewed verification outputs derived from the same TS command source. The golden bytes are explicitly provisional with respect to balance only; their schemas, provenance, command ordering, same-attempt evidence, read-only behavior, and technical review are final-quality contracts.

The six canonical golden JSON files are generated byte authorities, so `.prettierignore` owns exactly
`game/stories/poc/src/test/fixtures/golden/*.json`; formatting source code must not rewrite their
reviewed whitespace or hashes. Their writer/schema/read-only verifier remains the sole byte-format
authority, matching the repository's existing generated E2E golden/runtime-fixture boundary.

- [ ] **Step 4: Generate, agent-review, hash, and verify twice**

Run:

```bash
pnpm --filter @project-tavern/story-poc verify:balance:smoke
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

Expected: exactly six canonical provisional technical artifacts appear in the full intent-to-add diff. The agent records the global rubric result, verifies every command entry/same-attempt digest/RNG/fact/night/terminal/integrity field and the complete hashes; all three read-only runs preserve bytes. No human approval is awaited. Passing this step authorizes Phase 5/tooling consumption, not release balance approval.

- [ ] **Step 5: Commit the exact golden corpus**

```bash
git add -- .prettierignore docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md game/stories/poc/src/tooling-fixtures.ts game/stories/poc/src/testing/compile-reference-strategy.ts game/stories/poc/src/testing/golden-artifact.ts game/stories/poc/src/test/reference-strategies.test.ts game/stories/poc/src/test/golden-week.test.ts game/stories/poc/scripts/update-golden.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/package.json scripts/verify-golden.mjs scripts/verify-golden.test.mjs
git diff --cached --name-only
git commit -m "test(story-poc): freeze provisional golden weeks"
```

## Task 12: Add Same-Artifact Story Tooling and Provisional Save Fixtures

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
- Modify: `.prettierignore`

**Interfaces:**

- Consumes: Phase 3 `StoryToolingEntryV1`, the exact Catalog `PocStoryToolingFixtureV1`, Task 11's sole frozen provisional `pocStoryToolingFixturesV1` references, capability-gated DebugTools/fixture anchor, the resolved `PocGameSimulationV1.debugCommandExecutor`, Save codec/compatibility, Auto rotation repository, DebugBundle/replay, resolved PoC identity, Snapshot-owned RunIntegrity, Canonical JSON, the passed balance smoke contract, and an injected fixed-specifier tooling loader.
- Produces: `pocStoryToolingEntryV1`, test-only `createPocRuntimeTestFixtureV1`, frozen PoC fixture provenance/clock, command-derived fixture anchors/notes available from the same Artifact without redefining commands, actual-Story ten-kind replayable-debug evidence, exact import/slot-health classifications, successful-anchor integrity round-trip evidence, eight reviewed provisional Save fixtures, explicit `update:fixtures`, package read-only `verify:fixtures`, and a stable root `pnpm verify:fixtures` aggregator that checks E2E then PoC. The deferred pre-Phase6 calibration regenerates and re-reviews all eight because balance changes can alter Snapshot bytes and simulation provenance/digest.

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

The eight canonical Save JSON files are generated byte authorities, so `.prettierignore` owns
exactly `game/stories/poc/src/test/fixtures/saves/*.json`; formatting source code must not rewrite
their reviewed whitespace or hashes. Their explicit writer, strict schema, and read-only verifier
remain the sole byte-format authority.

- [ ] **Step 5: Generate once, review, and verify read-only behavior**

Run:

```bash
pnpm --filter @project-tavern/story-poc verify:balance:smoke
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

Expected: the fast balance contract passes and exactly eight canonical provisional Save JSON files appear in the full intent-to-add diff. The agent records every complete hash and proves each negative differs from its declared legal source in only the named field; fixed-specifier lazy tooling, ten actual-Story replayable debug kinds, queue-front validation failure, successful anchor, exact Save, DebugBundle, replay, Auto rotation, capability, and integrity tests pass; both fixture runs and full verification rewrite nothing. No human approval is awaited. Passing this step freezes the persistence/tooling contract for Phase 5 but not the final balance-dependent bytes.

- [ ] **Step 6: Commit tooling and Save fixtures**

```bash
git add -- .prettierignore docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md game/stories/poc/src/tooling game/stories/poc/src/testing/save-fixture-builder.ts game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/testing/poc-runtime-test-fixture.ts game/stories/poc/src/test/tooling.test.ts game/stories/poc/src/test/tooling-runtime.integration.test.ts game/stories/poc/src/test/save-fixtures.test.ts game/stories/poc/scripts/update-save-fixtures.mjs game/stories/poc/src/test/fixtures/saves game/stories/poc/package.json scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs
git diff --cached --name-only
git commit -m "test(story-poc): add tooling and save fixtures"
```

**Accepted-owner repair during the Phase 5B Task 4 prerequisite gate:** the real tooling-anchor
integration case lazily imports the fixed Story tooling export, establishes a D5 anchor through the
Session FIFO, round-trips a Save, exports a Debug bundle, and replays it. It completes in about
2.7–3.6 seconds when focused, but twice completed correctly after 5.550 and 6.067 seconds under the
128-file unit matrix and was misclassified by Vitest's inherited five-second timeout. This is an
integration correctness contract, not a five-second performance budget. Give only this complete
anchor case the same bounded 15-second timeout used by other long Story integrations; do not change
global timeout, worker concurrency, production behavior, assertions, or the shorter tooling tests.

Repair files:

- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`
- Modify: `game/stories/poc/src/test/tooling-runtime.integration.test.ts`

Repair TDD and contract:

1. Preserve the two exact-toolchain full-matrix REDs and the focused green as the timing witness.
2. Add only `15_000` as the timeout argument on the complete tooling-anchor `it` case.
3. Run the focused case, the full unit matrix, `pnpm verify:phase4`, `pnpm verify`, Prettier on both
   repair files, and `git diff --check`; every command must exit 0.
4. Commit the accepted-owner repair exactly:

   ```bash
   git add -- docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md game/stories/poc/src/test/tooling-runtime.integration.test.ts
   git diff --cached --name-status
   git diff --cached --check
   git commit -m "test(story-poc): bound tooling anchor timeout"
   ```

#### Authorized owner repair before Phase 5B Task 9: keep historical Save diagnostics nonblocking

Task 9's required Story UI copy is a Presentation-only upstream correction. It changes the Story
and `presentationDigest`, but ordinary Save compatibility already treats both values as diagnostic
warnings: the blocking tuple remains Story ID/revision, state-contract revision/digest, engine
digest, and `simulationDigest`. The eight reviewed Save files are historical byte evidence and must
not be regenerated merely to make their diagnostic-at-generation tuple equal a newer Presentation.

Apply the Phase 3 Task 11 accepted two-mode fixture-provenance contract to the PoC builder:

- `read_only_verification` requires the complete live blocking tuple to equal the frozen tuple, then
  reconstructs the expected historical records with the frozen `diagnosticAtGeneration` values;
- `fixture_generation` requires both blocking and diagnostic tuples to equal the current resolved
  Story before the tracked writer may produce a candidate;
- blocking drift fails both modes, diagnostic-only drift is accepted only by read-only verification,
  and compatibility classification still reports Story/presentation differences as warnings;
- the writer explicitly selects `fixture_generation`; ordinary verification defaults to
  `read_only_verification`; no tracked Save JSON byte changes in this repair.

First add focused tests proving diagnostic-only drift passes read-only verification but fails
generation, while blocking drift fails both and the frozen diagnostic tuple reconstructs the exact
historical bytes. Then add the complete Task 9 TextIds and Chinese copy to the existing Story
catalog, including one exhaustive `PocRejectionReasonV1["code"] -> TextId` mapping so preview and
disabled reasons never need a React fallback dictionary. Prove state-contract, engine, and
simulation identity remain unchanged while only the expected presentation diagnostic identity
changes; Story digest, PatchSet, engine version and appBuildId remain equal to the reviewed
diagnostic tuple. Hash all eight Save files before and after, run the focused Story/provenance
suites and `pnpm verify:fixtures` twice, and require byte equality.

**Exact repair files:**

- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`
- Modify: `docs/engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md`
- Modify: `game/stories/poc/src/content/ids.ts`
- Modify: `game/stories/poc/src/presentation/text-catalogs/zh-CN.ts`
- Modify: `game/stories/poc/src/testing/save-fixture-provenance.ts`
- Modify: `game/stories/poc/src/testing/save-fixture-builder.ts`
- Modify: `game/stories/poc/src/test/save-fixtures.test.ts`
- Modify: `game/stories/poc/src/test/story-validation.test.ts`
- Modify: `game/stories/poc/scripts/update-save-fixtures.mjs`

Run the focused tests, `pnpm verify:fixtures` twice, `pnpm verify:commands`, `pnpm verify:golden`,
`pnpm verify:semantic`, `pnpm verify:stories`, `pnpm verify:boundaries`, `pnpm typecheck`, full
`pnpm verify`, and `git diff --check`. Exact-stage only the nine files above and commit
`fix(story-poc): complete presentation text contract`.

## Task 13: Add the Read-Only Phase 4B Verification Gate

**Files:**

- Create: `scripts/verify-poc-story.mts`
- Create: `scripts/verify-poc-story.test.mjs`
- Modify: `package.json`
- Modify: `game/stories/poc/package.json`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/verify.test.mjs`

**Interfaces:**

- Consumes: Phase 4A gate, Phase 3 persistence/diagnostics gate, Story validation/integration, the PoC headless semantic leaf, commands/golden/fast-balance-smoke/Save/tooling checks, public exports, boundaries/cycles, typecheck, and build. The strict root `verify:balance` remains installed but is deliberately absent from Phase 4B/5 cumulative gates until the pre-Phase6 calibration closure. The full root verifier separately owns the E2E→PoC `verify:semantic` aggregator from Task 8.
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
    ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:balance:smoke"]],
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

Export the deeply frozen Phase 4B command array above, run it in order, stop on first nonzero status, and expose root scripts. Add the exact twelve-file `test:story` command frozen above; it includes content/source-data/application/tooling integration but excludes all Phase 4A files plus commands/golden/balance/Save baselines, whose named read-only gates run separately. The named balance child is precisely Story `verify:balance:smoke`; adding root `verify:balance` here would accidentally turn every Phase 4/5 run into the deferred release corpus and must fail the structural test:

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
pnpm --filter @project-tavern/story-poc verify:balance:smoke
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
pnpm --filter @project-tavern/story-poc verify:balance:smoke
pnpm verify:poc-story
pnpm verify:phase4
pnpm verify
pnpm verify:phase4
after="$(git ls-files -z | xargs -0 shasum -a 256)"
test "$before" = "$after"
test -z "$(git status --porcelain=v1)"
git diff --check
```

Per the Goal-level deferred-freeze contract, the unchecked checklist text below remains byte-for-byte unchanged and is not
used as live progress state. For this Goal, its complete-corpus and final baseline clauses become satisfied only by the
mandatory Phase 6 entry checkpoint; the executable Phase 4B acceptance above uses the fast smoke plus the qualified
threshold-only baseline evidence. Git ancestry, gates and clean checkpoints remain the only execution state.

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

## Deferred Balance Closure Before Phase 6 Artifact Work

This closure is mandatory after Phase 5C Acceptance and before Phase 6 Task 1 or any Phase 6 Artifact
implementation/build or release evidence. Earlier Phase 5 development builds remain UI/interaction evidence only and cannot
be reused as release evidence. This is not a Phase 4B acceptance checkbox and does not authorize skipping, weakening,
quarantining, or renaming the strict release gate.

The accepted Phase 5C checkpoint and the first-parent commits after it are the only durable recovery authority. The closure
contains zero to twelve independent calibration-step commits followed by exactly one final balance-freeze commit. Chat,
shell variables, `/tmp` reports and local progress files are not execution state. Any evaluator/runner/counterfactual/selector
defect returns to Task 10 as a separate owner repair commit and gates before this clean closure restarts; it never shares a
calibration or freeze commit. A mechanical calibration/finalization authority defect is a second closed repair subtype and may modify
only `docs/engineering/GOAL.md`, the Roadmap, the balance-lab design, this plan, the Phase 6 plan and
the local-engineering delivery-boundaries design, plus `docs/poc/balance-v0.md`, and its diff must be nonempty. A Task 10 executable-owner repair must actually modify at least one
listed non-authority-document executable/test/package path, so the two subtypes are disjoint. Both carry
`Balance-Calibration-Repair: true`; neither changes balance/direct expectations,
qualifier, golden, Save, command/tooling fixture or lock bytes, and the authority-only subtype changes no executable. If any
step already exists, executable repairs use the repaired-evaluator replay below; authority-only repairs prove the executable
closure unchanged and replay each step from its original parent/exact archive so unrelated documentation cannot alter its
source-archive proof.

A post-step controller-only orchestration repair is the executable-owner subtype but may change only
`scripts/run-poc-balance-remote.mjs`, `scripts/run-poc-balance-remote.test.mjs` and the changed subset of those seven authority
documents. It preserves the remote semantic evaluator/import closure, balance/direct expectations, provisional and fixture
bytes. The repaired controller runs outside each historical step's original exact archive, strictly admits newly recomputed
remote aggregate evidence and reproduces every evidence/trailer/full patch without changing the historical archive identity.
Its focused RED removes the local `evaluateValues` port while the old controller requires it; GREEN preserves frozen-archive
Story admission but removes the metrics import and current/selected full-corpus replay. Exact-stage those paths and commit
`fix(story-poc): accept verified remote calibration evidence` with only `Balance-Calibration-Repair: true` after the Phase 6
owner gates and historical replay pass.

### Calibration-step commits

For `N` already accepted step commits, let `K = N + 1`, run the selector with `--iteration=N`, and make a successful
selection step `K`.
The command is read-only and returns canonical current metrics, every legal neighbor evaluation, before/after deficits and
the deterministic one-field selection:

```bash
pnpm --silent --filter @project-tavern/story-poc calibrate:balance --iteration=N > /tmp/project-tavern-balance-step-K.txt
# Or use calibrate:balance:remote with explicit operator-only host/root/workers/attestation args.
shasum -a 256 /tmp/project-tavern-balance-step-K.txt
```

Apply exactly that one field to `game/stories/poc/src/content/balance.ts`, `docs/poc/balance-v0.md` and only the direct
literal expectation files affected by that field. Never change a threshold, strategy, command, algorithm, closed ID, fixed
counterfactual or more than one declared value in one step. Golden, Save, qualifier and qualifier-test bytes intentionally
remain provisional; therefore their read-only gates and the root/phase gates may be expected red between step commits and
must not be used to call a step a final checkpoint. Run only the step-safe focused gates:

```bash
pnpm --filter @project-tavern/story-poc verify:balance:smoke
pnpm --filter @project-tavern/story-poc verify:commands
pnpm exec vitest run game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts
pnpm typecheck
git diff --check
git diff --exit-code -- pnpm-lock.yaml
```

Stage and commit each accepted candidate independently. Optional direct-expectation paths are admitted only when their bytes
actually change; no final-freeze path is admitted:

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

Every placeholder above is replaced with the exact canonical evidence value. The evidence digest is the SHA-256 of the
captured selector stdout. A valid step commit changes the named field from its `Before` trailer in its parent tree to its
`After` trailer in its own tree, strictly decreases deficit, has index exactly one greater than its accepted predecessor,
and touches only the step allowlist.

A remote-assisted step additionally records exact source archive, admitted before evaluation, admitted selected after evaluation and
remote attestation SHA-256 trailers. The host, private IP, remote path and elapsed time remain operator transport state and are
never trailers. Every iteration locally re-encodes and strictly admits the complete canonical remote aggregate evidence,
validates its exact schema/current values and complete-neighbor or first-zero-prefix rule, recomputes deficit/selection, and
checks the source/toolchain/input/output digests plus the prior-step before→after chain before any byte is applied. No local full-corpus
current or selected-candidate replay is required.

### Clean-commit sandbox

Every historical replay and every dirty recovery must evaluate committed bytes, never the dirty live root. Use this exact
temporary detached-worktree shape; `target_commit` is `HEAD`, a step parent, the final parent or the final commit as required
by the operation:

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

The executing shell first selects the Phase 0 materialized PATH (the current checkpoint uses `/opt/homebrew/bin`). The live
and subshell Node/pnpm assertions must match accepted materialization identity before the live repository supplies the exact
store path. This recovery-only install is offline, uses the frozen lockfile and writes only ignored dependency bytes in the
temporary worktree; registry access and live-tree mutation remain forbidden.

### First-parent protected-path audit

Resolve the accepted Phase 5C checkpoint through `GOAL.md`. Because this entry begins immediately after Phase 5C, every
first-parent commit from that checkpoint through final—or through `HEAD` when final does not exist—must be classified; path
filtering is not enough because an evaluator-only change can alter the next selector result:

```bash
phase5c_checkpoint="<accepted-phase5c-commit-sha>"
audit_tip="<final-commit-if-present-otherwise-HEAD>"
git rev-list --first-parent --reverse "${phase5c_checkpoint}..${audit_tip}"
git log --first-parent --reverse --format='%H%x09%(trailers:key=Balance-Calibration-Index,valueonly)%x09%(trailers:key=Balance-Calibration-Repair,valueonly)%x09%(trailers:key=Balance-Calibration-Final,valueonly)%x09%(trailers:key=Balance-Calibration-Steps,valueonly)' "${phase5c_checkpoint}..${audit_tip}"
git diff --name-only "<commit>^1" "<commit>" -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts game/stories/poc/src/testing/save-fixture-provenance.ts scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
```

Every commit in `${phase5c_checkpoint}..${audit_tip}`, whether or not it touches that protected union, must be exactly one of:

- a step with all seven step trailers, the exact step allowlist and the next uninterrupted index `1..N`;
- a closed repair with `Balance-Calibration-Repair: true` and no step/final trailer: either the Task 10 executable-owner
  Files/staging/gates contract with at least one listed non-authority-document executable/test/package path changed, or the
  nonempty authority-only calibration/finalization contract above; neither changes threshold, strategy,
  accepted balance value, direct expectation, golden or Save, or removes the provisional report/assertion/CLI branch/tests; or
- the unique final with all final trailers and the exact final allowlist.

Any unclassified or multiply classified commit before final invalidates recovery. Final must be the unique last classified
commit after the last step/repair, and `Balance-Calibration-Steps` must equal `N`. If commits exist after final, inspect each
with `git diff "<commit>^1" "<commit>" -- <protected paths>` and require no protected-path change; ordinary Phase 6 task
commits may otherwise follow. With `N > 0`, live balance bytes must equal the last step `After` before final; with `N = 0`,
the final-parent balance bytes must equal the accepted Phase 5C balance bytes because repairs cannot change balance.

### Historical step and repair replay

For every historical step `K`, set the already-applied count `N = K - 1`, create the clean sandbox at that step's parent,
run the complete local selector, or rebuild the exact archive and run the verified remote aggregate computation with its
required local canonical/schema/admission, complete-prefix, selector and digest-chain verification. Require canonical stdout
SHA-256 plus decoded field/before/after/beforeDeficit/afterDeficit to equal
all seven semantic trailers and, when present, require all four remote proof trailers. Apply the returned candidate afresh to the
authoritative balance document/code and exact direct literals; do not copy the commit's files. Compare the complete rebuilt
patch, including whitespace and binary bytes:

```bash
pnpm --silent --filter @project-tavern/story-poc calibrate:balance --iteration=N > /tmp/project-tavern-step.replayed.json
test "sha256:$(shasum -a 256 /tmp/project-tavern-step.replayed.json | awk '{print $1}')" = "$(git -C "$repo" show -s --format='%(trailers:key=Balance-Calibration-Evidence-SHA256,valueonly)' "$step_commit")"
# Decode the canonical selection and require every value to equal the six remaining step trailers, then apply it afresh.
git -C "$repo" diff --binary "${step_commit}^1" "$step_commit" -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.expected.patch
git diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.replayed.patch
cmp /tmp/project-tavern-step.expected.patch /tmp/project-tavern-step.replayed.patch
```

The scalar/path checks remain necessary but are not sufficient; only exact selector evidence and exact full-patch replay
accept a step. If one or more executable-owner `Balance-Calibration-Repair: true` commits that change the
evaluator/runner/selector/evidence codec or their semantic inputs exist after an accepted step, create another clean sandbox from
the Phase 5C checkpoint, overlay those executable repair patches through the repair being audited, and make that repaired
evaluator the clean replay baseline. Sequentially rerun every earlier step from
`--iteration=0` onward, requiring each canonical evidence SHA/trailer set and rebuilt `git diff --binary` patch to equal its
historical step before committing that replayed candidate only inside the sandbox and advancing to the next. For an
executable controller-only orchestration repair that changes admission/verification but not that semantic closure, invoke the
repaired controller as an admission layer outside every historical step's original parent exact archive. The original archive
commit/tree/SHA-256 and trailers stay authoritative; do not overlay the controller repair into the archive it is auditing. For an
authority-only calibration/finalization repair, prove its parent-to-commit patch has an empty projection onto the
evaluator/runner/selector/remote-controller executable import closure, then rerun every historical step from its original
parent/exact archive; never overlay unrelated authority bytes
into the historical archive. With `N = 0`, a repair may continue after its owner gates. With `N > 0`, any overlay conflict or
evidence/trailer/full-patch difference is the authoritative design stop `balance_calibration_history_invalidated`; do not
automatically edit old commits, rewrite history, rollback or choose new candidates.

### Dirty classification

After ancestry and historical replay pass, classify the live tree using a clean `HEAD` sandbox for every committed-HEAD
decision:

- clean, no final, sandbox strict gate passes: start the live-candidate plus final-parent replay procedure below;
- clean, no final, sandbox strict gate is threshold-only red and `N < 12`: run
  `pnpm --filter @project-tavern/story-poc calibrate:balance --iteration=N` and create step `N+1`;
- clean with `N = 12` and strict red, or selector result `balance_contract_unsatisfied`: stop before Artifact work;
- dirty paths wholly inside the step allowlist and sandbox strict is threshold-only red: rerun the selector at clean `HEAD`,
  apply its candidate afresh in the sandbox, and require the sandbox `git diff --binary` to equal the complete live dirty
  binary patch before completing step `N+1`;
- dirty paths wholly inside the final allowlist and sandbox strict passes: run the final writer/removal replay below at clean
  `HEAD` and require its complete binary patch to equal the live dirty patch before finishing final;
- mixed step/final paths, any path outside both allowlists, invalid ancestry or unexplained bytes: stop as unknown dirty
  state.

For the pending-step branch, compare the live root only after the clean sandbox has independently selected and reapplied the
candidate:

```bash
git -C "$repo" diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.live.patch
git diff --binary -- docs/poc/balance-v0.md game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts > /tmp/project-tavern-step.replayed.patch
cmp /tmp/project-tavern-step.live.patch /tmp/project-tavern-step.replayed.patch
```

### Final balance-freeze commit and replay

First prove strict balance at the committed final parent in a clean sandbox. If no final exists and the live root is clean,
non-detached `main` at that parent, exit the sandbox and run the writer/removal sequence below in the live root to materialize
the candidate bytes that will actually be staged. A classified pending dirty final already supplies those live candidate
bytes; an existing historical final never rewrites the live root. In every branch, create a separate final-parent sandbox,
rerun the same sequence independently, and compare its complete patch before any commit is accepted.

The sequence first projects the final parent's complete live Save fixture provenance. The existing focused test
`matches the complete reviewed live provenance tuple` must be RED only because frozen `blocking.simulationDigest` is
`sha256:015106ae1e2513fbf93c2fab692a119d580193e2267aa8b8ce55c0bf6ea3d1d7` while live is
`sha256:165ea3339e15f51bb92d1cf205e6cc4bc66e23fe5912262356405ad20484140c`; every other blocking,
diagnostic and capture byte remains identical. Mechanically update only that scalar in
`game/stories/poc/src/testing/save-fixture-provenance.ts`, rerun the same focused test to GREEN, and stop on any additional
drift. Do not modify the provenance parser, modes, generation guard, builder, writer or test.

The remaining sequence proves command bytes unchanged, reruns both writers, and repeats the complete Task 11/12 review over
exactly six golden and eight Save files. Then make only these manual removals: the provisional report data, its assertion,
the `--qualify-provisional` CLI branch, the tests dedicated to that branch/report, and the provisional-to-final status wording
in `balance-v0.md`. No adjacent refactor, balance number or direct expectation belongs to final.

For the clean/no-final branch, establish the live candidate location before its first writer run:

```bash
test "$(git symbolic-ref --quiet --short HEAD)" = "main"
test "$(git rev-parse HEAD)" = "$final_parent"
test -z "$(git status --porcelain=v1)"
```

```bash
pnpm exec vitest run game/stories/poc/src/test/save-fixtures.test.ts -t 'matches the complete reviewed live provenance tuple'
# Expected RED above: exactly the reviewed blocking.simulationDigest transition. Update that one frozen scalar.
pnpm exec vitest run game/stories/poc/src/test/save-fixtures.test.ts -t 'matches the complete reviewed live provenance tuple'
pnpm --filter @project-tavern/story-poc verify:commands
pnpm --filter @project-tavern/story-poc update:golden
pnpm --filter @project-tavern/story-poc update:fixtures
git add -N -- game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
git diff --no-ext-diff -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
find game/stories/poc/src/test/fixtures/golden -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-calibrated-golden.before.sha256
find game/stories/poc/src/test/fixtures/saves -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-calibrated-saves.before.sha256
pnpm verify:golden
pnpm verify:golden
pnpm verify:fixtures
pnpm verify:fixtures
find game/stories/poc/src/test/fixtures/golden -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-calibrated-golden.after.sha256
find game/stories/poc/src/test/fixtures/saves -type f -print0 | xargs -0 shasum -a 256 | LC_ALL=C sort -k2 > /tmp/project-tavern-calibrated-saves.after.sha256
diff -u /tmp/project-tavern-calibrated-golden.before.sha256 /tmp/project-tavern-calibrated-golden.after.sha256
diff -u /tmp/project-tavern-calibrated-saves.before.sha256 /tmp/project-tavern-calibrated-saves.after.sha256
git diff --check
git diff --exit-code -- pnpm-lock.yaml
```

For an existing final, compare the clean parent-sandbox replay with its historical full patch; for a pending dirty final,
compare it with the live full patch:

```bash
git diff --binary -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.replayed.patch
if test -n "${final_commit:-}"; then
  git -C "$repo" diff --binary "${final_commit}^1" "$final_commit" -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.expected.patch
  cmp /tmp/project-tavern-final.expected.patch /tmp/project-tavern-final.replayed.patch
else
  git -C "$repo" diff --binary -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves > /tmp/project-tavern-final.live.patch
  cmp /tmp/project-tavern-final.live.patch /tmp/project-tavern-final.replayed.patch
fi
```

Before committing the replayed candidate, run strict twice on those exact candidate bytes, compare stdout and use its hash in
the trailer. If final already exists, skip this creation block after its exact replay audit. Otherwise exit the sandbox,
return to the still-dirty live `main` candidate at `HEAD = final_parent`, then stage only the final allowlist and prove all
numeric/direct exclusions:

```bash
test "$(git symbolic-ref --quiet --short HEAD)" = "main"
test "$(git rev-parse HEAD)" = "$final_parent"
pnpm --silent verify:balance > /tmp/project-tavern-balance.candidate-a.txt
pnpm --silent verify:balance > /tmp/project-tavern-balance.candidate-b.txt
cmp /tmp/project-tavern-balance.candidate-a.txt /tmp/project-tavern-balance.candidate-b.txt
shasum -a 256 /tmp/project-tavern-balance.candidate-a.txt
git add -- docs/poc/balance-v0.md scripts/verify-poc-balance.mjs scripts/verify-poc-balance.test.mjs game/stories/poc/src/testing/save-fixture-provenance.ts game/stories/poc/src/test/fixtures/golden game/stories/poc/src/test/fixtures/saves
git diff --cached --name-status
git diff --cached --check
test -z "$(git diff --cached --name-only | rg -v '^(docs/poc/balance-v0\.md|scripts/verify-poc-balance\.(mjs|test\.mjs)|game/stories/poc/src/testing/save-fixture-provenance\.ts|game/stories/poc/src/test/fixtures/(golden|saves)/)')"
test -z "$(git diff --cached --name-only -- game/stories/poc/src/content/balance.ts game/stories/poc/src/test/daily-gates.test.ts game/stories/poc/src/test/ending-forecast.test.ts game/stories/poc/src/test/fixtures/commands game/stories/poc/src/tooling-fixtures.ts pnpm-lock.yaml)"
git commit -m "balance(story-poc): finalize release calibration" \
  --trailer "Balance-Calibration-Final: true" \
  --trailer "Balance-Calibration-Steps: <N>" \
  --trailer "Balance-Calibration-Report-SHA256: sha256:<digest>"
final_commit="$(git rev-parse HEAD)"
final_parent="$(git rev-parse HEAD^1)"
```

After final exists, create a clean sandbox at the final commit and run strict balance twice after that commit; stdout must be
byte-identical and its SHA-256 must equal the final trailer exactly:

```bash
pnpm --silent verify:balance > /tmp/project-tavern-balance.final-a.txt
pnpm --silent verify:balance > /tmp/project-tavern-balance.final-b.txt
cmp /tmp/project-tavern-balance.final-a.txt /tmp/project-tavern-balance.final-b.txt
test "sha256:$(shasum -a 256 /tmp/project-tavern-balance.final-a.txt | awk '{print $1}')" = "$(git show -s --format='%(trailers:key=Balance-Calibration-Report-SHA256,valueonly)' "$final_commit")"
```

Exit that sandbox, then return to the clean non-detached live `main` with `HEAD = final_commit` for the attestation-bound and
cumulative gates; the temporary sandbox never substitutes for the ignored live materialization attestation:

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

Only that replayed, clean final commit may enter Phase 6 Task 1. The later `pnpm verify:release`, reproducible Artifact and
Roadmap Definition of Done continue to require the same unchanged final bytes.
