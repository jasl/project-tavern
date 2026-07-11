# Project Tavern Demo Story and Golden Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete non-canonical seven-day Demo Story on the proven Module/runtime contracts, encode the fixed PoC content and balance, compile the six deterministic reference strategies, track reviewed fixed-seed golden artifacts and Save fixtures, and enforce the exact 1–1000 seed balance/property thresholds.

**Architecture:** `stories/demo` is a complete Story package, not application code. It imports twelve individual public bindings/Schemas/builders, statically constructs its own Module tuple/coordinator/Profile, and supplies Story-owned initial values, balance, rules, Narrative IR, text, code-native assets, Scene contributions, Patch Surfaces, and development fixtures. All real behavior tests dispatch through one uniform runtime harness. Golden artifacts are derived from fixed branded bootstraps and literal command fixtures, updated only by an explicit generator, verified read-only, and never accepted automatically by CI.

**Tech Stack:** Phase 1–3 Project Tavern packages, Node.js 24 LTS, pnpm, strict TypeScript 7, Zod, Vitest, fast-check, Canonical JSON/SHA-256 manifests, and Story-specific build/test scripts. Browser Story aliasing, Vite Player/Developer flavors, Playwright, and Pages deployment remain Phase 5 work.

## Global Constraints

- Phase 1 foundation, Phase 2 Modules/E2E Story, and Phase 3 persistence/diagnostics plans are hard prerequisites. Consume their public exports and tests; do not copy Base, Module, persistence, diagnostic, or E2E fixture implementations into Demo.
- The Story identity is exactly `{ id: "week.poc_001", revision: 1 }`; `demo` is only a package/build key. State-contract revision begins at `1`.
- The run is exactly D1–D7: D1–D6 service days, D7 no service, levy due D7 afternoon, and no actionable D7 evening.
- Use exactly two life policies, four recipes, five ingredients, two customer segments, four service modes, one helper, one facility opportunity, one relationship opportunity, one two-stage WorldAction, one deterministic threshold choice, one 2D6 check, three Auras, five Scheduler Events, and three ending IDs defined by the PoC documents.
- The Demo Story itself selects all twelve individual public Module bindings and constructs exactly one coordinator/Profile. `@project-tavern/modules` supplies no preassembled tuple/Profile, and Demo does not add Module-to-Module read edges, a second coordinator, a global store, or Story-specific state outside declared Fact/Quest/Outcome/Narrative contracts.
- `run.start` materializes all D1–D6 demand seeds, freezes D1 demand, and opens `scene.manifest_start`; only after that Scene completes may the player choose a life policy.
- The Demo Story has no opening event between StartOpening and FinalizeOpening. Interruptible opening behavior remains covered by `stories/e2e`; Demo reference drivers call the two commands adjacently.
- D5 investigation and relationship are mutually exclusive by explicit Action/Outcome gates. Not starting the relationship StoryAction leaves `relationship.pending` and is a valid route.
- A threshold choice is deterministic; a 2D6 check uses only the serializable project PRNG. No test or rule may inspect future random values, retry a check, call `Math.random`, or search for a better command sequence.
- Player-facing/design text is Chinese; identifiers are English stable IDs. TextCatalog is separate from semantic Narrative IR.
- Original Story code, rules, values, fixtures, and Story-specific tests use PolyForm Noncommercial. Original narrative/localization files use CC BY-NC-SA. The package stays `PolyForm-Noncommercial-1.0.0` until its first CC-scoped file is activated; that same commit creates `LICENSE.md`, changes metadata/policy/tests to `SEE LICENSE IN LICENSE.md`, and adds only exports whose target files exist.
- Every public DTO and test fixture uses the Module contract's `DayIndex`, `Money`, `Quantity`, signed/safe integer, and per-kind ID brands. Demo constructs them through the exported unsuffixed parsers; raw strings/numbers may appear only as parser input, display text, or local loop indices.
- The four current Phase A Image Gen items remain `review.status="candidate"` and `termsReview.status="pending"`. They must not enter Story asset packs, `ResolvedAssetManifest`, presentation digest, Player artifact, golden screenshot, or AIGC input. Demo ships fallback-only slots until both selection and terms gates are approved.
- Production/test/build/generation code must not import, scan, copy, screenshot, or otherwise depend on `references/`.
- Command, golden, and Save fixture verification is read-only. Only `update:commands`, `update:golden`, and `update:fixtures` may rewrite their respective tracked fixture directories, and every resulting diff must be manually reviewed.
- Any balance change updates `docs/poc/balance-v0.md` and the reviewed golden/threshold expectations in the same change. This plan implements the current values; it does not tune around failing tests silently.
- Do not add a second week, long-term XP, skill trees, relationship stage transitions, employee progression, a complete facility tree, weather, seasons, dynamic prices, combat, equipment, minigames, metaprogression, runtime LLM, backend, cloud saves, or a generalized content scripting language.
- Do not create a legacy root `src/` application. All Demo implementation stays under `stories/demo/**`; generic runtime remains under existing packages/apps.
- Tasks 1–6 are definition/Schema/pure-rule tasks only: they must not create/import `demo-harness.ts`, `profile.ts`, `index.ts`, `EngineSession`, or dispatch commands. Any command-through route vector described with relationship/investigation content is implemented only after Task 7 composition, in Task 7A.
- Use TDD for every task and commit only the named slice. Do not stage unrelated live spec edits, art-source files, Phase 5 app work, or generated `dist/` output.
- Immediately before every task's `git add`, run `pnpm typecheck && pnpm verify`; both must exit 0 without tracked-file changes. No task may depend on a later Profile/rule/content task merely to restore green.

---

## File Map

### Package, identity, composition, and validation

- Modify: `package.json` — route stable `verify:balance` through the repository wrapper, then add `verify:phase4`.
- Modify: `stories/demo/package.json` — add each script/export only with its target; mixed licensing begins in the Story-composition task.
- Create in Story-composition task: `stories/demo/LICENSE.md` — PolyForm software vs CC narrative/localization scope.
- Modify: `stories/demo/tsconfig.json` — project references to public Base/Modules/UI/Assets only.
- Modify: `stories/demo/src/index.ts` — replace the Phase 1 non-startable stub with the default side-effect-free GamePackage export.
- Create: `stories/demo/src/story.ts` — resolved simulation/presentation facet composition.
- Create: `stories/demo/src/profile.ts` — Story-owned explicit twelve-binding tuple, coordinator, bootstrap, initial-state assembly, and Profile.
- Create: `stories/demo/src/patch-surfaces.ts` — typed rule/value/text/asset slots.
- Create: `stories/demo/src/simulation/identity.ts` — Story identity, state-contract revision, fixed reference seed/run IDs.
- Create: `stories/demo/src/test/story-validation.test.ts`

### Story simulation data and rules

- Create: `stories/demo/src/simulation/state-definitions.ts`
- Create: `stories/demo/src/simulation/initial-state.ts`
- Create: `stories/demo/src/simulation/balance.ts`
- Create: `stories/demo/src/simulation/content/ids.ts`
- Create: `stories/demo/src/simulation/content/ingredients-recipes.ts`
- Create: `stories/demo/src/simulation/content/actions.ts`
- Create: `stories/demo/src/simulation/content/facilities-auras.ts`
- Create: `stories/demo/src/simulation/content/events.ts`
- Create: `stories/demo/src/simulation/content/checks-endings.ts`
- Create: `stories/demo/src/simulation/narrative/d1-d4.ts`
- Create: `stories/demo/src/simulation/narrative/relationship.ts`
- Create: `stories/demo/src/simulation/narrative/investigation.ts`
- Create: `stories/demo/src/simulation/rules/demand.ts`
- Create: `stories/demo/src/simulation/rules/tavern.ts`
- Create: `stories/demo/src/simulation/rules/checks.ts`
- Create: `stories/demo/src/simulation/rules/endings.ts`
- Create: `stories/demo/src/simulation/rules/index.ts`
- Create: `stories/demo/src/test/balance-contract.test.ts`
- Create: `stories/demo/src/test/daily-gates.test.ts`
- Create: `stories/demo/src/test/relationship-content.contract.test.ts`
- Create: `stories/demo/src/test/investigation-content.contract.test.ts`
- Create: `stories/demo/src/test/ending-forecast.test.ts`

### Story presentation

- Create: `stories/demo/src/presentation/text-catalogs/zh-CN.ts`
- Create: `stories/demo/src/presentation/text-catalogs/index.ts`
- Create: `stories/demo/src/presentation/assets.ts` — fallback-only slots; zero runtime providers.
- Create: `stories/demo/src/presentation/scene-graph.tsx`

### Reference strategy compiler and golden artifacts

- Create: `stories/demo/src/testing/reference-strategy-definitions.ts`
- Create: `stories/demo/src/testing/compile-reference-strategy.ts`
- Create: `stories/demo/src/testing/run-reference-strategy.ts`
- Create after Story composition: `stories/demo/src/testing/demo-harness.ts`
- Create: `stories/demo/src/testing/golden-artifact.ts`
- Create: `stories/demo/src/test/reference-strategies.test.ts`
- Create: `stories/demo/src/test/golden-week.test.ts`
- Create: `stories/demo/src/test/balance-1000-seeds.test.ts`
- Create: `stories/demo/scripts/update-command-fixtures.mjs`
- Create: `stories/demo/scripts/update-golden.mjs`
- Create: `stories/demo/scripts/update-save-fixtures.mjs`
- Create: `stories/demo/src/test/fixtures/commands/strategy.cash_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.relationship_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.investigation_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.full_delegation.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.two_closures_recovery.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.explicit_failure.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.cash_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.relationship_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.investigation_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.full_delegation.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.two_closures_recovery.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.explicit_failure.json`

### Development and persistence fixtures

- Create: `stories/demo/src/development.ts`
- Create: `stories/demo/src/development/fixtures.ts`
- Create: `stories/demo/src/testing/save-fixture-builder.ts`
- Create: `stories/demo/src/test/save-fixtures.test.ts`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-opening.json`
- Create: `stories/demo/src/test/fixtures/saves/save.quick-world-action.json`
- Create: `stories/demo/src/test/fixtures/saves/save.manual-completed.json`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-current-corrupt.json`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-previous-valid.json`
- Create: `stories/demo/src/test/fixtures/saves/save.future-format.json`
- Create: `stories/demo/src/test/fixtures/saves/save.revision-mismatch.json`
- Create: `stories/demo/src/test/fixtures/saves/save.digest-mismatch.json`

## Task 1: Freeze Package Identity and the Closed Content-ID Catalog

**Files:**
- Modify: `stories/demo/package.json`
- Modify: `stories/demo/tsconfig.json`
- Create: `stories/demo/src/simulation/identity.ts`
- Create: `stories/demo/src/simulation/content/ids.ts`
- Create: `stories/demo/src/test/story-validation.test.ts`

**Interfaces:**
- Consumes: Base generic identity/safe-integer parsers, public Modules game-specific stable-ID parsers, the Story identity contract, and the exact ID table in `docs/poc/content-and-playtest.md`.
- Produces: fixed package metadata, Story identity/revision, reference seed/run IDs, and readonly closed ID arrays used by all later Demo files.

- [ ] **Step 1: Write the failing identity/ID catalog test**

```ts
// stories/demo/src/test/story-validation.test.ts
import { describe, expect, it } from "vitest";
import { demoStoryIdentityV1, referenceRunIdsV1, referenceSeedV1 } from "../simulation/identity.js";
import { actionIdsV1, eventIdsV1, ingredientIdsV1, recipeIdsV1 } from "../simulation/content/ids.js";

describe("week.poc_001 identity catalog", () => {
  it("freezes Story identity and deterministic reference inputs", () => {
    expect(demoStoryIdentityV1).toEqual({ id: "week.poc_001", revision: 1 });
    expect(referenceSeedV1).toBe(0x00023049);
    expect(new Set(Object.values(referenceRunIdsV1)).size).toBe(6);
  });

  it("keeps Event and player Action namespaces distinct", () => {
    expect(eventIdsV1).toEqual([
      "event.tutorial_first_service", "event.supplier_invoice", "event.helper_available",
      "event.facility_window", "event.levy_due",
    ]);
    expect(actionIdsV1).toContain("action.facility_window");
    expect(actionIdsV1).not.toContain("event.facility_window");
    expect(new Set([...eventIdsV1, ...actionIdsV1, ...ingredientIdsV1, ...recipeIdsV1]).size)
      .toBe(eventIdsV1.length + actionIdsV1.length + ingredientIdsV1.length + recipeIdsV1.length);
  });
});
```

- [ ] **Step 2: Run and verify the identity files are absent**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts`

Expected: FAIL with missing `identity.js`/`ids.js`.

- [ ] **Step 3: Activate only the package test script**

```json
// stories/demo/package.json
{
  "name": "@project-tavern/story-demo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "license": "PolyForm-Noncommercial-1.0.0",
  "exports": {},
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "@project-tavern/base": "workspace:*",
    "@project-tavern/modules": "workspace:*",
    "@project-tavern/ui": "workspace:*",
    "@project-tavern/assets": "workspace:*"
  }
}
```

- [ ] **Step 4: Add exact identity and six fixed run IDs**

```ts
// stories/demo/src/simulation/identity.ts
import { parseNonZeroUint32, parsePositiveSafeInteger, parseRunId } from "@project-tavern/base";
import { parseStoryId } from "@project-tavern/modules";

export const demoStoryIdentityV1 = Object.freeze({
  id: parseStoryId("week.poc_001"),
  revision: parsePositiveSafeInteger(1),
});
export const demoStateContractRevisionV1 = parsePositiveSafeInteger(1);
export const referenceSeedV1 = parseNonZeroUint32(0x00023049);

export const referenceRunIdsV1 = Object.freeze({
  "strategy.cash_first": parseRunId("00000000-0000-4000-8000-000000000101"),
  "strategy.relationship_first": parseRunId("00000000-0000-4000-8000-000000000102"),
  "strategy.investigation_first": parseRunId("00000000-0000-4000-8000-000000000103"),
  "strategy.full_delegation": parseRunId("00000000-0000-4000-8000-000000000104"),
  "strategy.two_closures_recovery": parseRunId("00000000-0000-4000-8000-000000000105"),
  "strategy.explicit_failure": parseRunId("00000000-0000-4000-8000-000000000106"),
} as const);
```

- [ ] **Step 5: Add the exact closed ID arrays**

```ts
// stories/demo/src/simulation/content/ids.ts
import {
  parseActionId,
  parseActorId,
  parseAttributeId,
  parseAuraId,
  parseCheckBandId,
  parseCheckId,
  parseChoiceId,
  parseEventId,
  parseFactId,
  parseIngredientId,
  parseOutcomeId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseStoryToken,
  parseTextId,
  parseWorldStepId,
} from "@project-tavern/modules";

export const eventIdsV1 = [
  parseEventId("event.tutorial_first_service"), parseEventId("event.supplier_invoice"),
  parseEventId("event.helper_available"), parseEventId("event.facility_window"),
  parseEventId("event.levy_due"),
] as const;

export const actionIdsV1 = [
  parseActionId("action.choose_life_policy"), parseActionId("action.purchase"),
  parseActionId("action.prepare_food"), parseActionId("action.rest"),
  parseActionId("action.service_plan"), parseActionId("action.advance_phase"),
  parseActionId("action.pay_levy"), parseActionId("action.facility_window"),
  parseActionId("action.repair_sign_with_heroine"), parseActionId("action.old_trade_road"),
  parseActionId("action.apologize_to_heroine"),
] as const;

export const ingredientIdsV1 = [
  parseIngredientId("ingredient.coarse_grain"), parseIngredientId("ingredient.root_vegetable"),
  parseIngredientId("ingredient.ale"), parseIngredientId("ingredient.fresh_meat"),
  parseIngredientId("ingredient.herb"),
] as const;

export const recipeIdsV1 = [
  parseRecipeId("recipe.grain_root_porridge"), parseRecipeId("recipe.ale_bread"),
  parseRecipeId("recipe.hunter_stew"), parseRecipeId("recipe.traveler_roast"),
] as const;

export const demoIdsV1 = Object.freeze({
  actorPlayer: parseActorId("actor.player"),
  actorHeroine: parseActorId("actor.heroine"),
  attributeIntellect: parseAttributeId("intellect"),
  actionRepairSign: parseActionId("action.repair_sign_with_heroine"),
  actionOldTradeRoad: parseActionId("action.old_trade_road"),
  auraSignRepaired: parseAuraId("tavern.sign_repaired"),
  auraHeroineAngry: parseAuraId("heroine.angry"),
  auraAdventureStrain: parseAuraId("player.adventure_strain"),
  checkOldTradeRoad: parseCheckId("check.old_trade_road"),
  choiceOldTradeRoadBasic: parseChoiceId("choice.old_trade_road.basic"),
  choiceOldTradeRoadPrepared: parseChoiceId("choice.old_trade_road.prepared"),
  outcomeRelationship: parseOutcomeId("outcome.relationship_opportunity"),
  outcomeInvestigation: parseOutcomeId("outcome.investigation"),
  factWarClue: parseFactId("fact.war_clue"),
  ingredientFreshMeat: parseIngredientId("ingredient.fresh_meat"),
  ingredientHerb: parseIngredientId("ingredient.herb"),
  reasonRelationshipRepair: parseReasonId("reason.relationship.repair_sign"),
  reasonRelationshipDeclined: parseReasonId("reason.relationship.repair_sign_declined"),
  reasonRelationshipConflict: parseReasonId("reason.relationship.repair_sign_conflict"),
  reasonRelationshipApology: parseReasonId("reason.relationship.apology"),
  reasonAuraSignRepaired: parseReasonId("reason.aura.sign_repaired"),
  reasonAuraHeroineAngry: parseReasonId("reason.aura.heroine_angry"),
  reasonInvestigationBegin: parseReasonId("reason.investigation.begin"),
  reasonInvestigationSetback: parseReasonId("reason.investigation.setback"),
  reasonInvestigationSuccessWithCost: parseReasonId("reason.investigation.success_with_cost"),
  reasonInvestigationComplete: parseReasonId("reason.investigation.complete"),
  reasonInvestigationExceptional: parseReasonId("reason.investigation.exceptional"),
  sceneOldTradeRoadDeparture: parseSceneId("scene.old_trade_road.departure"),
  sceneOldTradeRoadInvestigation: parseSceneId("scene.old_trade_road.investigation"),
  stepOldTradeRoadDeparture: parseWorldStepId("step.old_trade_road.departure"),
  stepOldTradeRoadInvestigation: parseWorldStepId("step.old_trade_road.investigation"),
  textActionOldTradeRoad: parseTextId("text.action_old_trade_road"),
  textChoiceOldTradeRoadBasic: parseTextId("text.choice_old_trade_road_basic"),
  textChoiceOldTradeRoadPrepared: parseTextId("text.choice_old_trade_road_prepared"),
  tokenRelationshipCompleted: parseStoryToken("relationship.completed"),
  tokenRelationshipAbandoned: parseStoryToken("relationship.abandoned"),
  tokenRelationshipReconciled: parseStoryToken("relationship.reconciled"),
  tokenRelationshipUnresolved: parseStoryToken("relationship.unresolved_conflict"),
  tokenInvestigationMissed: parseStoryToken("investigation.missed_by_choice"),
  tokenInvestigationSetback: parseStoryToken("investigation.setback"),
  tokenInvestigationSuccessWithCost: parseStoryToken("investigation.success_with_cost"),
  tokenInvestigationComplete: parseStoryToken("investigation.complete"),
  tokenInvestigationExceptional: parseStoryToken("investigation.exceptional"),
  bandInvestigationSetback: parseCheckBandId("band.investigation.setback"),
  bandInvestigationSuccessWithCost: parseCheckBandId("band.investigation.success-with-cost"),
  bandInvestigationComplete: parseCheckBandId("band.investigation.complete"),
  bandInvestigationExceptional: parseCheckBandId("band.investigation.exceptional"),
});
```

Apply the matching exported Module parser to ingredients/recipes and equally exact readonly arrays for policies, segments, modifier sources, actors/characters, checkpoints, facilities, Auras, choices, check/bands, World steps, scenes, nodes, Facts, Outcomes, endings, Story tokens, Text/Asset IDs, and every closed ReasonId from the PoC table. Export no raw-string array and no alias for an old spelling.

- [ ] **Step 6: Run the focused identity test**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts`

Expected: PASS; fixed identity/seed/run IDs and all stable-ID namespaces parse without duplicates.

- [ ] **Step 7: Commit package identity and IDs**

```bash
git add stories/demo/package.json stories/demo/tsconfig.json stories/demo/src/simulation/identity.ts stories/demo/src/simulation/content/ids.ts stories/demo/src/test/story-validation.test.ts
git commit -m "feat(story-demo): freeze identity and content ids"
```

## Task 2: Encode Initial State, Ingredients, Recipes, and Balance

**Files:**
- Create: `stories/demo/src/simulation/state-definitions.ts`
- Create: `stories/demo/src/simulation/initial-state.ts`
- Create: `stories/demo/src/simulation/balance.ts`
- Create: `stories/demo/src/simulation/content/ingredients-recipes.ts`
- Create: `stories/demo/src/test/balance-contract.test.ts`

**Interfaces:**
- Consumes: Demo Module contracts and exact numeric tables in `balance-v0.md`.
- Produces: closed Fact/Outcome definitions, initial actors/resources, five ingredients, four recipes, policies, action costs, service modes, demand, levy/forecast policy, and numeric limits.

- [ ] **Step 1: Write the failing exact-value test**

```ts
// stories/demo/src/test/balance-contract.test.ts
import { describe, expect, it } from "vitest";
import { demoInitialStateV1 } from "../simulation/initial-state.js";
import { demoBalanceV1 } from "../simulation/balance.js";
import { ingredientsV1, recipesV1 } from "../simulation/content/ingredients-recipes.js";

describe("Demo balance v0 contract", () => {
  it("freezes initial resources and limits", () => {
    expect(demoInitialStateV1).toMatchObject({
      cash: 70,
      reputation: 50,
      player: { stamina: { current: 10, maximum: 10 }, mood: 0, attributes: { body: "C", social: "C", intellect: "B" } },
      heroine: { stamina: { current: 10, maximum: 10 }, mood: 0 },
      relationship: { affection: 0, teamwork: 0, stage: "cold" },
    });
    expect(demoBalanceV1).toMatchObject({
      purchaseLineLimit: 5,
      menuRecipeLimit: 2,
      dailyPreparationLimit: 2,
      openingFee: 2,
      levyAmount: 140,
      maxNarrativeStepsPerCommand: 128,
      maxNarrativeCallDepth: 8,
    });
  });

  it("freezes five ingredients and four recipes", () => {
    expect(ingredientsV1.map(({ ingredientId, unitPrice, shelfLifeDays }) => ({ ingredientId, unitPrice, shelfLifeDays }))).toEqual([
      { ingredientId: "ingredient.coarse_grain", unitPrice: 1, shelfLifeDays: 7 },
      { ingredientId: "ingredient.root_vegetable", unitPrice: 1, shelfLifeDays: 3 },
      { ingredientId: "ingredient.ale", unitPrice: 2, shelfLifeDays: 7 },
      { ingredientId: "ingredient.fresh_meat", unitPrice: 3, shelfLifeDays: 2 },
      { ingredientId: "ingredient.herb", unitPrice: 2, shelfLifeDays: 3 },
    ]);
    expect(recipesV1.map(({ recipeId, salePrice, prepPoints }) => ({ recipeId, salePrice, prepPoints }))).toEqual([
      { recipeId: "recipe.grain_root_porridge", salePrice: 5, prepPoints: 1 },
      { recipeId: "recipe.ale_bread", salePrice: 6, prepPoints: 1 },
      { recipeId: "recipe.hunter_stew", salePrice: 12, prepPoints: 2 },
      { recipeId: "recipe.traveler_roast", salePrice: 13, prepPoints: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run and verify missing balance modules**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/balance-contract.test.ts`

Expected: FAIL with missing initial/balance/content files.

- [ ] **Step 3: Define exact Story state defaults**

```ts
// stories/demo/src/simulation/state-definitions.ts
export const demoStateDefinitionsV1: StoryStateDefinitionsV1 = Object.freeze({
  facts: [
    { factId: "fact.war_clue", value: { kind: "boolean", defaultValue: false } },
    { factId: "fact.tutorial_first_service_completed", value: { kind: "boolean", defaultValue: false } },
    { factId: "fact.invoice_checked_this_week", value: { kind: "boolean", defaultValue: false } },
  ],
  quests: [],
  outcomes: [
    { outcomeId: "outcome.relationship_opportunity", value: { kind: "token", defaultValue: "relationship.pending", allowedValues: ["relationship.pending", "relationship.completed", "relationship.abandoned", "relationship.reconciled", "relationship.unresolved_conflict"] } },
    { outcomeId: "outcome.investigation", value: { kind: "token", defaultValue: "investigation.not_attempted", allowedValues: ["investigation.not_attempted", "investigation.missed_by_choice", "investigation.setback", "investigation.success_with_cost", "investigation.complete", "investigation.exceptional"] } },
  ],
});
```

- [ ] **Step 4: Encode exact ingredients and recipes**

```ts
// stories/demo/src/simulation/content/ingredients-recipes.ts
export const ingredientsV1 = Object.freeze([
  { ingredientId: "ingredient.coarse_grain", nameTextId: "text.ingredient_coarse_grain", unitPrice: 1, shelfLifeDays: 7, refrigeratable: false },
  { ingredientId: "ingredient.root_vegetable", nameTextId: "text.ingredient_root_vegetable", unitPrice: 1, shelfLifeDays: 3, refrigeratable: true },
  { ingredientId: "ingredient.ale", nameTextId: "text.ingredient_ale", unitPrice: 2, shelfLifeDays: 7, refrigeratable: false },
  { ingredientId: "ingredient.fresh_meat", nameTextId: "text.ingredient_fresh_meat", unitPrice: 3, shelfLifeDays: 2, refrigeratable: true },
  { ingredientId: "ingredient.herb", nameTextId: "text.ingredient_herb", unitPrice: 2, shelfLifeDays: 3, refrigeratable: true },
] as const);

export const recipesV1 = Object.freeze([
  recipe("recipe.grain_root_porridge", "text.recipe_grain_root_porridge", [["ingredient.coarse_grain", 1], ["ingredient.root_vegetable", 1]], 5, 1, [3, 1]),
  recipe("recipe.ale_bread", "text.recipe_ale_bread", [["ingredient.coarse_grain", 1], ["ingredient.ale", 1]], 6, 1, [2, 3]),
  recipe("recipe.hunter_stew", "text.recipe_hunter_stew", [["ingredient.fresh_meat", 1], ["ingredient.root_vegetable", 1], ["ingredient.herb", 1]], 12, 2, [3, 2]),
  recipe("recipe.traveler_roast", "text.recipe_traveler_roast", [["ingredient.fresh_meat", 1], ["ingredient.ale", 1], ["ingredient.herb", 1]], 13, 2, [1, 3]),
] as const);
```

- [ ] **Step 5: Encode policies, costs, service modes, demand, and levy**

`demoBalanceV1` uses:

```ts
const lifePolicies = [
  { policyId: "policy.balanced", nameTextId: "text.policy_balanced", apByPhase: { morning: 2, afternoon: 2, evening: 2 }, playerNightRecovery: 3, nightRecoveryReasonId: "reason.recovery.balanced_night" },
  { policyId: "policy.night_owl", nameTextId: "text.policy_night_owl", apByPhase: { morning: 1, afternoon: 2, evening: 3 }, playerNightRecovery: 2, nightRecoveryReasonId: "reason.recovery.night_owl_night" },
] as const;

const serviceModes = [
  serviceMode("manual", 2, 3, 3, 0, 10, 6, 2, 4),
  serviceMode("assisted", 1, 1, 2, 5, 8, 6, 1, 4),
  serviceMode("delegated", 0, 0, 0, 7, 7, 7, 0, 2),
  serviceMode("closed", 0, 0, 0, 0, 0, 0, 0, 0),
] as const;
```

The same `balance.ts` file exports the parsed constants used by later public-contract examples:

```ts
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@project-tavern/base";
import {
  parseMoney,
  parseQuantity,
  parseSafeInteger,
} from "@project-tavern/modules";

export const demoValuesV1 = Object.freeze({
  safeMin: parseSafeInteger(Number.MIN_SAFE_INTEGER),
  safeMinusTwo: parseSafeInteger(-2),
  safeMinusOne: parseSafeInteger(-1),
  safeZero: parseSafeInteger(0),
  safeOne: parseSafeInteger(1),
  safeTwo: parseSafeInteger(2),
  safeThree: parseSafeInteger(3),
  safeFive: parseSafeInteger(5),
  safeSix: parseSafeInteger(6),
  safeEight: parseSafeInteger(8),
  safeNine: parseSafeInteger(9),
  safeEleven: parseSafeInteger(11),
  safeTwelve: parseSafeInteger(12),
  nonNegativeZero: parseNonNegativeSafeInteger(0),
  nonNegativeOne: parseNonNegativeSafeInteger(1),
  nonNegativeTwo: parseNonNegativeSafeInteger(2),
  nonNegativeThree: parseNonNegativeSafeInteger(3),
  positiveOne: parsePositiveSafeInteger(1),
  positiveTwo: parsePositiveSafeInteger(2),
  positiveSix: parsePositiveSafeInteger(6),
  moneyZero: parseMoney(0),
  moneyFour: parseMoney(4),
  quantityOne: parseQuantity(1),
  quantityTwo: parseQuantity(2),
  quantityThree: parseQuantity(3),
  quantityFour: parseQuantity(4),
});
```

`parseNonNegativeSafeInteger`/`parsePositiveSafeInteger` come from Base; the game-specific `parseSafeInteger`, `parseMoney`, and `parseQuantity` come from `@project-tavern/modules`. No later example casts an arithmetic result or numeric literal to a branded value.

Base demand is the exact D1–D6 locals/travelers table `[[6,2],[5,3],[7,2],[4,5],[3,7],[6,4]]`; `serviceDays=[1,2,3,4,5,6]`; forecast visibility is D3 morning, conservative start D5 morning, levy due D7 afternoon.

- [ ] **Step 6: Run balance contract tests**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/balance-contract.test.ts`

Expected: PASS; exact initial state, all numeric tables, recipe costs/margins/preferences, mode costs/capacities, demand rows, forecast ordering, and strict schemas pass.

- [ ] **Step 7: Commit balance/data foundations**

```bash
git add stories/demo/src/simulation/state-definitions.ts stories/demo/src/simulation/initial-state.ts stories/demo/src/simulation/balance.ts stories/demo/src/simulation/content/ingredients-recipes.ts stories/demo/src/test/balance-contract.test.ts
git commit -m "feat(story-demo): encode initial balance contract"
```

## Task 3: Encode D1–D4 Actions, Gates, Facilities, Auras, and Scheduler Events

**Files:**
- Create: `stories/demo/src/simulation/content/actions.ts`
- Create: `stories/demo/src/simulation/content/facilities-auras.ts`
- Create: `stories/demo/src/simulation/content/events.ts`
- Create: `stories/demo/src/simulation/narrative/d1-d4.ts`
- Create: `stories/demo/src/test/daily-gates.test.ts`

**Interfaces:**
- Consumes: balance/state definitions, closed IDs, Module Action/Condition/Event contracts, and Narrative IR.
- Produces: every common Action presentation, four service mode gates, D2 invoice threshold Scene, D4 facility notification/choice, three exact Aura definitions, and five Scheduler Events.

- [ ] **Step 1: Write failing daily gate/Event tests**

```ts
// stories/demo/src/test/daily-gates.test.ts
import { describe, expect, it } from "vitest";
import { actionsV1 } from "../simulation/content/actions.js";
import { eventsV1 } from "../simulation/content/events.js";
import { facilitiesV1, aurasV1 } from "../simulation/content/facilities-auras.js";

describe("D1-D4 authored gates", () => {
  it("maps player Actions and workflow controls without aliases", () => {
    expect(actionsV1.map(({ actionId, commandKind }) => [actionId, commandKind])).toEqual([
      ["action.choose_life_policy", "policy.choose"],
      ["action.purchase", "inventory.buy"],
      ["action.prepare_food", "actor.prepare_food"],
      ["action.rest", "actor.rest"],
      ["action.service_plan", "tavern.plan.set"],
      ["action.advance_phase", "calendar.advance_phase"],
      ["action.pay_levy", "levy.pay"],
      ["action.facility_window", "facility.choose"],
      ["action.repair_sign_with_heroine", "story.action.start"],
      ["action.old_trade_road", "world.action.begin"],
      ["action.apologize_to_heroine", "story.action.start"],
    ]);
  });

  it("freezes five Scheduler Events and their priorities", () => {
    expect(eventsV1.map(({ eventId, priority, sceneId }) => [eventId, priority, sceneId])).toEqual([
      ["event.tutorial_first_service", 400, null],
      ["event.supplier_invoice", 400, "scene.supplier_invoice"],
      ["event.helper_available", 300, null],
      ["event.facility_window", 300, "scene.facility_window"],
      ["event.levy_due", 400, "scene.levy_due"],
    ]);
  });

  it("freezes two facilities and three narrow Auras", () => {
    expect(facilitiesV1.map((entry) => [entry.facilityId, entry.cashCost])).toEqual([
      ["facility.cold_storage", 12], ["facility.comfortable_bed", 12],
    ]);
    expect(aurasV1.map((entry) => [entry.auraId, entry.durationPolicy])).toEqual([
      ["heroine.angry", { kind: "countdown", unit: "day_end", defaultRemaining: 2, maximumRemaining: 2 }],
      ["tavern.sign_repaired", { kind: "countdown", unit: "opening", defaultRemaining: 1, maximumRemaining: 1 }],
      ["player.adventure_strain", { kind: "countdown", unit: "night_recovery", defaultRemaining: 1, maximumRemaining: 1 }],
    ]);
  });
});
```

- [ ] **Step 2: Run and verify content files are missing**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/daily-gates.test.ts`

Expected: FAIL with missing actions/events/facilities files.

- [ ] **Step 3: Encode exact Action presentation windows**

```ts
// complete ordered entries in stories/demo/src/simulation/content/actions.ts
export const actionsV1: readonly ActionPresentationDefinitionV1[] = Object.freeze([
  action("action.choose_life_policy", "policy.choose", ["morning"], { kind: "none" }, policyVisibilityV1),
  action("action.purchase", "inventory.buy", ["morning", "afternoon"], { kind: "current_phase" }, activeServiceDayVisibilityV1),
  action("action.prepare_food", "actor.prepare_food", ["morning", "afternoon"], { kind: "current_phase" }, activeServiceDayVisibilityV1),
  action("action.rest", "actor.rest", ["morning", "afternoon", "evening"], { kind: "current_phase" }, activeServiceDayVisibilityV1),
  action("action.service_plan", "tavern.plan.set", ["morning", "afternoon"], { kind: "fixed", phases: ["evening"] }, activeServiceDayVisibilityV1),
  action("action.advance_phase", "calendar.advance_phase", ["morning", "afternoon", "evening"], { kind: "none" }, activeRunVisibilityV1),
  action("action.pay_levy", "levy.pay", ["afternoon"], { kind: "none" }, levyVisibilityV1),
  facilityActionV1,
  repairSignActionV1,
  oldTradeRoadActionV1,
  apologyActionV1,
]);
```

Policy presentation has empty authored availability and exactly `morning/none`. Common operation Actions include the D6 maximum-day gate. Assisted opens D2 plus helper; delegated and closed open D3; manual opens D1.

- [ ] **Step 4: Encode facilities and Aura modifiers**

Cold storage adds `shelf_life.add_days amount=2` to root vegetable/fresh meat/herb. Comfortable bed adds player recovery 2 and heroine recovery 1. Sign repaired adds capacity/prep points 1 for manual/assisted; angry adds capacity -1 for manual/assisted plus teamwork-gain block; adventure strain adds player recovery -2.

- [ ] **Step 5: Encode exact Scheduler Events and D1–D4 scenes**

```ts
// stories/demo/src/simulation/content/events.ts
export const eventsV1: readonly StoryEventDefinitionV1[] = Object.freeze([
  event("event.tutorial_first_service", "checkpoint.tutorial_first_service", { kind: "command.succeeded", commandKinds: ["tavern.opening.finalize"] }, 400, null, tutorialConditionsV1, tutorialEffectsV1),
  event("event.supplier_invoice", "checkpoint.supplier_invoice", { kind: "phase.entered", days: [2], phases: ["morning"] }, 400, "scene.supplier_invoice", invoiceConditionsV1, []),
  event("event.helper_available", "checkpoint.helper_available", { kind: "day.ended", days: [1] }, 300, null, [], helperEffectsV1),
  event("event.facility_window", "checkpoint.facility_window", { kind: "phase.entered", days: [4], phases: ["morning"] }, 300, "scene.facility_window", facilityUndecidedConditionsV1, []),
  event("event.levy_due", "checkpoint.levy_due", { kind: "phase.entered", days: [7], phases: ["morning"] }, 400, "scene.levy_due", activeRunConditionsV1, []),
]);
```

`scene.supplier_invoice` has one choice node: the `[智力 B]` branch appends a +4 story-reward ledger entry and sets `fact.invoice_checked_this_week=true`; the normal branch has no effect. It does not roll dice or consume AP. Facility/levy scenes are one narration plus end.

- [ ] **Step 6: Run daily content tests**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/daily-gates.test.ts`

Expected: PASS; all Action windows/occupations/gate order, mode unlocks, Event triggers/priorities/scenes/effects, facility costs/modifiers, Aura policies/targets, and D2 threshold semantics pass.

- [ ] **Step 7: Commit D1–D4 content**

```bash
git add stories/demo/src/simulation/content/actions.ts stories/demo/src/simulation/content/facilities-auras.ts stories/demo/src/simulation/content/events.ts stories/demo/src/simulation/narrative/d1-d4.ts stories/demo/src/test/daily-gates.test.ts
git commit -m "feat(story-demo): add d1 through d4 content"
```

## Task 4: Implement the D5 Relationship Branch and D6 Apology

**Files:**
- Create: `stories/demo/src/simulation/narrative/relationship.ts`
- Create: `stories/demo/src/test/relationship-content.contract.test.ts`
- Modify: `stories/demo/src/simulation/content/actions.ts`

**Interfaces:**
- Consumes: StoryAction/Narrative/Effect Schemas, D5/D6 gates, and branded content IDs.
- Produces: schema-valid repair-sign/apology definitions with cooperate/decline/conflict choices and exact mutual exclusion. Runtime outcomes are deferred to Task 7A.

- [ ] **Step 1: Write failing relationship definition contract tests**

Parse both StoryAction definitions and every Narrative Scene with the public strict Schemas. Assert the three repair choices have exact ordered branded EffectIntent kinds, apology is gated by the angry Aura, relationship and investigation Outcomes are mutually exclusive, all referenced IDs exist, and no command dispatch/harness import occurs in the file.

- [ ] **Step 2: Run and verify missing StoryAction failure**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/relationship-content.contract.test.ts`

Expected: FAIL with unknown `action.repair_sign_with_heroine`.

- [ ] **Step 3: Define repair-sign choices with exact effects**

```ts
// stories/demo/src/simulation/narrative/relationship.ts
import type { EffectIntentV1 } from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "../content/ids.js";

const cooperateEffectsV1: readonly EffectIntentV1[] = [
  { kind: "calendar.ap.adjust", delta: demoValuesV1.safeMinusTwo, reasonId: demoIdsV1.reasonRelationshipRepair },
  { kind: "actor.stamina.adjust", actorId: demoIdsV1.actorPlayer, delta: demoValuesV1.safeMinusOne, reasonId: demoIdsV1.reasonRelationshipRepair },
  { kind: "actor.stamina.adjust", actorId: demoIdsV1.actorHeroine, delta: demoValuesV1.safeMinusOne, reasonId: demoIdsV1.reasonRelationshipRepair },
  { kind: "relationship.affection.adjust", delta: demoValuesV1.safeThree, reasonId: demoIdsV1.reasonRelationshipRepair },
  { kind: "actor.mood.adjust", actorId: demoIdsV1.actorHeroine, delta: demoValuesV1.safeOne, reasonId: demoIdsV1.reasonRelationshipRepair },
  {
    kind: "aura.apply",
    auraId: demoIdsV1.auraSignRepaired,
    target: { kind: "tavern" },
    source: { kind: "story_action", actionId: demoIdsV1.actionRepairSign },
    duration: { kind: "countdown", unit: "opening", remaining: demoValuesV1.positiveOne },
    reasonId: demoIdsV1.reasonAuraSignRepaired,
  },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeRelationship, value: { kind: "token", value: demoIdsV1.tokenRelationshipCompleted }, reasonId: demoIdsV1.reasonRelationshipRepair },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeInvestigation, value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed }, reasonId: demoIdsV1.reasonRelationshipRepair },
];

const declineEffectsV1: readonly EffectIntentV1[] = [
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeRelationship, value: { kind: "token", value: demoIdsV1.tokenRelationshipAbandoned }, reasonId: demoIdsV1.reasonRelationshipDeclined },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeInvestigation, value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed }, reasonId: demoIdsV1.reasonRelationshipDeclined },
];

const conflictEffectsV1: readonly EffectIntentV1[] = [
  { kind: "relationship.affection.adjust", delta: demoValuesV1.safeMinusOne, reasonId: demoIdsV1.reasonRelationshipConflict },
  {
    kind: "aura.apply",
    auraId: demoIdsV1.auraHeroineAngry,
    target: { kind: "actor", actorId: demoIdsV1.actorHeroine },
    source: { kind: "story_action", actionId: demoIdsV1.actionRepairSign },
    duration: { kind: "countdown", unit: "day_end", remaining: demoValuesV1.positiveTwo },
    reasonId: demoIdsV1.reasonAuraHeroineAngry,
  },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeRelationship, value: { kind: "token", value: demoIdsV1.tokenRelationshipUnresolved }, reasonId: demoIdsV1.reasonRelationshipConflict },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeInvestigation, value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed }, reasonId: demoIdsV1.reasonRelationshipConflict },
];
```

- [ ] **Step 4: Add exact visibility/availability and apology effects**

Repair is visible D5 afternoon while relationship is pending, then available only while investigation is not attempted. Its confirmation names `action.old_trade_road` as mutually excluded. Apology is visible D6 morning/afternoon only while `heroine.angry` is present.

```ts
const apologyEffectsV1: readonly EffectIntentV1[] = [
  { kind: "calendar.ap.adjust", delta: demoValuesV1.safeMinusOne, reasonId: demoIdsV1.reasonRelationshipApology },
  { kind: "aura.clear", auraId: demoIdsV1.auraHeroineAngry, target: { kind: "actor", actorId: demoIdsV1.actorHeroine }, reasonId: demoIdsV1.reasonRelationshipApology },
  { kind: "relationship.affection.adjust", delta: demoValuesV1.safeOne, reasonId: demoIdsV1.reasonRelationshipApology },
  { kind: "outcome.set", outcomeId: demoIdsV1.outcomeRelationship, value: { kind: "token", value: demoIdsV1.tokenRelationshipReconciled }, reasonId: demoIdsV1.reasonRelationshipApology },
];
```

- [ ] **Step 5: Add pure gate/effect consistency tests**

Assert cooperate declares both actor/AP costs; decline/conflict declare zero AP; sign modifiers apply only to manual/assisted; angry declares teamwork block/capacity reduction; apology alone clears angry and writes reconciled. Atomic application, opening consumption, natural expiry, and final Outcome behavior run in Task 7A.

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/relationship-content.contract.test.ts`

Expected: PASS; branded definitions, gates, effect order, mutual exclusion, and strict Schemas pass without Profile/Session imports.

- [ ] **Step 6: Commit relationship content**

```bash
git add stories/demo/src/simulation/narrative/relationship.ts stories/demo/src/test/relationship-content.contract.test.ts stories/demo/src/simulation/content/actions.ts
git commit -m "feat(story-demo): add relationship choice route"
```

## Task 5: Implement the Two-Stage Investigation and D6 Consequences

**Files:**
- Create: `stories/demo/src/simulation/narrative/investigation.ts`
- Create: `stories/demo/src/simulation/content/checks-endings.ts`
- Create: `stories/demo/src/simulation/rules/checks.ts`
- Create: `stories/demo/src/test/investigation-content.contract.test.ts`
- Modify: `stories/demo/src/simulation/content/actions.ts`

**Interfaces:**
- Consumes: WorldAction/check/Narrative contracts, fixed rule-RNG vector, branded IDs/values, and D5 mutual exclusion.
- Produces: schema-valid basic/prepared WorldAction options, two Scene steps, one four-band check definition, Inventory reward intents, war-clue demand modifier, relationship exclusion, and adventure strain. Command-through persistence is deferred to Task 7A.

- [ ] **Step 1: Write failing WorldAction/check definition contract tests**

Parse the action, both Scenes, four check bands, and every EffectIntent with strict public Schemas. With a fixed `RuleRngV1`, call only the pure check rule and assert basic/prepared totals 8/9 from dice `[4,3]`, exact band IDs/effects, two authored steps, and relationship mutual exclusion. The test imports no Profile, Session, coordinator, or harness.

- [ ] **Step 2: Run and verify unknown action failure**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/investigation-content.contract.test.ts`

Expected: FAIL with `command.unknown_reference` for `action.old_trade_road`.

- [ ] **Step 3: Define the exact WorldAction**

```ts
// stories/demo/src/simulation/narrative/investigation.ts
import type { WorldActionDefinitionV1 } from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "../content/ids.js";

export const oldTradeRoadV1: WorldActionDefinitionV1 = Object.freeze({
  actionId: demoIdsV1.actionOldTradeRoad,
  nameTextId: demoIdsV1.textActionOldTradeRoad,
  availability: [pendingRelationshipGateV1, notAttemptedInvestigationGateV1],
  reasonId: demoIdsV1.reasonInvestigationBegin,
  baseCashCost: demoValuesV1.moneyFour,
  playerStaminaCost: demoValuesV1.nonNegativeThree,
  beginEffects: [{
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeRelationship,
    value: { kind: "token", value: demoIdsV1.tokenRelationshipAbandoned },
    reasonId: demoIdsV1.reasonInvestigationBegin,
  }],
  options: [
    { optionId: demoIdsV1.choiceOldTradeRoadBasic, labelTextId: demoIdsV1.textChoiceOldTradeRoadBasic, availability: [], additionalCashCost: demoValuesV1.moneyZero, preparationBonus: demoValuesV1.safeZero, beginEffects: [], confirmation: oldTradeRoadConfirmationV1 },
    { optionId: demoIdsV1.choiceOldTradeRoadPrepared, labelTextId: demoIdsV1.textChoiceOldTradeRoadPrepared, availability: [], additionalCashCost: demoValuesV1.moneyFour, preparationBonus: demoValuesV1.safeOne, beginEffects: [], confirmation: oldTradeRoadPreparedConfirmationV1 },
  ],
  steps: [
    { stepId: demoIdsV1.stepOldTradeRoadDeparture, phase: "morning", apCost: demoValuesV1.nonNegativeOne, sceneId: demoIdsV1.sceneOldTradeRoadDeparture },
    { stepId: demoIdsV1.stepOldTradeRoadInvestigation, phase: "afternoon", apCost: demoValuesV1.nonNegativeTwo, sceneId: demoIdsV1.sceneOldTradeRoadInvestigation },
  ],
  checkId: demoIdsV1.checkOldTradeRoad,
});
```

- [ ] **Step 4: Define all check bands and exact rewards**

```ts
// stories/demo/src/simulation/content/checks-endings.ts
import type {
  CheckBandId,
  CheckDefinitionV1,
  CheckOutcomeBandV1,
  EffectIntentV1,
  IngredientId,
  IngredientQuantityV1,
  Quantity,
  ReasonId,
  SafeInteger,
  StoryToken,
} from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "./ids.js";

const ingredient = (ingredientId: IngredientId, quantity: Quantity): IngredientQuantityV1 => ({
  ingredientId,
  quantity,
});

const grant = (
  lines: readonly IngredientQuantityV1[],
  reasonId: ReasonId,
): EffectIntentV1 => ({
  kind: "inventory.grant",
  lines,
  source: { kind: "world_action", actionId: demoIdsV1.actionOldTradeRoad },
  reasonId,
});

const investigationOutcome = (value: StoryToken, reasonId: ReasonId): EffectIntentV1 => ({
  kind: "outcome.set",
  outcomeId: demoIdsV1.outcomeInvestigation,
  value: { kind: "token", value },
  reasonId,
});

const applyStrainV1: EffectIntentV1 = {
  kind: "aura.apply",
  auraId: demoIdsV1.auraAdventureStrain,
  target: { kind: "actor", actorId: demoIdsV1.actorPlayer },
  source: { kind: "world_action", actionId: demoIdsV1.actionOldTradeRoad },
  duration: { kind: "countdown", unit: "night_recovery", remaining: demoValuesV1.positiveOne },
  reasonId: demoIdsV1.reasonInvestigationSetback,
};

const setWarClueV1: EffectIntentV1 = {
  kind: "fact.set",
  factId: demoIdsV1.factWarClue,
  value: { kind: "boolean", value: true },
  reasonId: demoIdsV1.reasonInvestigationComplete,
};

const band = (
  bandId: CheckBandId,
  minInclusive: SafeInteger,
  maxInclusive: SafeInteger | null,
  effects: readonly EffectIntentV1[],
): CheckOutcomeBandV1 => ({ bandId, minInclusive, maxInclusive, effects });

export const oldTradeRoadCheckV1: CheckDefinitionV1 = Object.freeze({
  checkId: demoIdsV1.checkOldTradeRoad,
  attribute: demoIdsV1.attributeIntellect,
  dice: "2d6",
  bands: [
    band(demoIdsV1.bandInvestigationSetback, demoValuesV1.safeMin, demoValuesV1.safeFive, [
      grant([ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityOne)], demoIdsV1.reasonInvestigationSetback),
      applyStrainV1,
      investigationOutcome(demoIdsV1.tokenInvestigationSetback, demoIdsV1.reasonInvestigationSetback),
    ]),
    band(demoIdsV1.bandInvestigationSuccessWithCost, demoValuesV1.safeSix, demoValuesV1.safeEight, [
      grant([
        ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityOne),
        ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityTwo),
      ], demoIdsV1.reasonInvestigationSuccessWithCost),
      investigationOutcome(demoIdsV1.tokenInvestigationSuccessWithCost, demoIdsV1.reasonInvestigationSuccessWithCost),
    ]),
    band(demoIdsV1.bandInvestigationComplete, demoValuesV1.safeNine, demoValuesV1.safeEleven, [
      grant([
        ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityTwo),
        ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityThree),
      ], demoIdsV1.reasonInvestigationComplete),
      setWarClueV1,
      investigationOutcome(demoIdsV1.tokenInvestigationComplete, demoIdsV1.reasonInvestigationComplete),
    ]),
    band(demoIdsV1.bandInvestigationExceptional, demoValuesV1.safeTwelve, null, [
      grant([
        ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityThree),
        ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityFour),
      ], demoIdsV1.reasonInvestigationExceptional),
      setWarClueV1,
      { kind: "reputation.adjust", delta: demoValuesV1.safeOne, reasonId: demoIdsV1.reasonInvestigationExceptional },
      investigationOutcome(demoIdsV1.tokenInvestigationExceptional, demoIdsV1.reasonInvestigationExceptional),
    ]),
  ],
});
```

- [ ] **Step 5: Implement fixed check resolution and D6 demand effect**

```ts
// stories/demo/src/simulation/rules/checks.ts
import type { DeepReadonly } from "@project-tavern/base";
import type { CheckInputV1, CheckResultV1, RuleRngV1 } from "@project-tavern/modules";
import { parseDieFace, parseSafeInteger } from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";

export function resolveCheckV1(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1 {
  const dice = [
    parseDieFace(rng.nextInt({ exclusiveMax: demoValuesV1.positiveSix, purpose: `check:${input.checkId}:die-1` }) + demoValuesV1.positiveOne),
    parseDieFace(rng.nextInt({ exclusiveMax: demoValuesV1.positiveSix, purpose: `check:${input.checkId}:die-2` }) + demoValuesV1.positiveOne),
  ] as const;
  const applied = collectCheckModifiersV1(input.modifiers, input.checkId);
  const totalBonus = parseSafeInteger(
    input.attributeBonus + input.preparationBonus + applied.reduce((sum, modifier) => sum + modifier.contribution, 0),
  );
  const total = parseSafeInteger(dice[0] + dice[1] + totalBonus);
  const band = input.bands.find((candidate) => total >= candidate.minInclusive && (candidate.maxInclusive === null || total <= candidate.maxInclusive))!;
  return { checkId: input.checkId, actorId: input.actorId, dice, attributeBonus: input.attributeBonus, preparationBonus: input.preparationBonus, modifiers: applied, totalBonus, total, bandId: band.bandId, effects: band.effects };
}
```

The demand rule adds an explained `+2` travelers modifier on D6 only when `fact.war_clue=true`. It does not alter D5 current demand retroactively.

- [ ] **Step 6: Add pure definition round-trip and mutual-exclusion tests**

Strict-JSON round-trip the authored WorldAction/check/Narrative definitions and assert equality. Prove reciprocal relationship/investigation gates, adventure-strain recovery targeting, and exactly one branded D6 traveler modifier of `demoValuesV1.safeTwo`. Snapshot workflow restoration, once-only checks/effects, and route visibility run in Task 7A.

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/investigation-content.contract.test.ts`

Expected: PASS; fixed pure-rule vectors, branded definition round-trips, rewards, strain, clue, and reciprocal gates pass without Profile/Session imports.

- [ ] **Step 7: Commit investigation content**

```bash
git add stories/demo/src/simulation/narrative/investigation.ts stories/demo/src/simulation/content/checks-endings.ts stories/demo/src/simulation/rules/checks.ts stories/demo/src/test/investigation-content.contract.test.ts stories/demo/src/simulation/content/actions.ts
git commit -m "feat(story-demo): add two-stage investigation"
```

## Task 6: Implement Demand, Tavern Settlement, Forecast, and Endings

**Files:**
- Create: `stories/demo/src/simulation/rules/demand.ts`
- Create: `stories/demo/src/simulation/rules/tavern.ts`
- Create: `stories/demo/src/simulation/rules/endings.ts`
- Create: `stories/demo/src/simulation/rules/index.ts`
- Create: `stories/demo/src/test/ending-forecast.test.ts`
- Modify: `stories/demo/src/simulation/content/checks-endings.ts`

**Interfaces:**
- Consumes: exact Balance/content, pure Story rule contracts, deterministic RNG, Module modifier ordering, OpeningBaseline, ledger drafts, and Ending input.
- Produces: all seven `StoryRulesV1` slots, explained demand/opening results, obligation projections through shared queries, and three persisted ending outcomes.

- [ ] **Step 1: Write failing demand, settlement, and ending vectors**

```ts
// stories/demo/src/test/ending-forecast.test.ts
import { describe, expect, it } from "vitest";
import { demandRulesV1, endingRulesV1, tavernRulesV1 } from "../simulation/rules/index.js";

describe("Demo rules", () => {
  it("materializes the reference D1 demand and keeps actual inside preview", () => {
    const preview = demandRulesV1.preview(buildD1DemandProjectionInputV1());
    expect(preview.lines.map((line) => [line.segmentId, line.range, line.actualCustomers])).toEqual([
      ["segment.locals", { min: 6, max: 6 }, 6],
      ["segment.travelers", { min: 2, max: 2 }, 2],
    ]);
  });

  it("uses stable order allocation and balances settlement ledger value", () => {
    const draft = tavernRulesV1.settle(buildReferenceD1OpeningInputV1(), noDrawRuleRngV1());
    expect(draft.orders.map((line) => [line.segmentId, line.recipeId, line.actualSales])).toEqual([
      ["segment.locals", "recipe.grain_root_porridge", 2],
      ["segment.locals", "recipe.hunter_stew", 4],
      ["segment.travelers", "recipe.hunter_stew", 0],
    ]);
    expect(draft.entries.reduce((sum, entry) => sum + entry.valuationDelta, 0)).toBeLessThanOrEqual(0);
  });

  it.each([
    [buildEndingInputV1({ cashAfterLevy: 20, reputation: 50, facilityIds: ["facility.comfortable_bed"] }), "completed_stable", "ending.stable"],
    [buildEndingInputV1({ cashAfterLevy: 1, reputation: 49, facilityIds: [] }), "completed_danger", "ending.danger"],
    [buildArrearsEndingInputV1(), "failed_arrears", "ending.failed_arrears"],
  ] as const)("evaluates %s", (input, status, endingId) => {
    expect(endingRulesV1.evaluate(input)).toMatchObject({ status, endingId });
  });
});
```

- [ ] **Step 2: Run and verify missing rule modules**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/ending-forecast.test.ts`

Expected: FAIL with missing rule index.

- [ ] **Step 3: Implement exact demand resolve/preview**

```ts
// stories/demo/src/simulation/rules/demand.ts
export const demandRulesV1 = Object.freeze({
  resolve(input: DeepReadonly<DemandSeedInputV1>, rng: RuleRngV1): DemandSeedResultV1 {
    return {
      lines: input.segments.map((line) => ({
        day: line.day,
        segmentId: line.segmentId,
        randomOffset: (rng.nextInt({ exclusiveMax: 3, purpose: `demand:${line.day}:${line.segmentId}` }) - 1) as -1 | 0 | 1,
      })),
    };
  },
  preview(input: DeepReadonly<DemandProjectionInputV1>): DemandPreviewV1 {
    return { day: input.day, lines: input.seeds.map((seed) => projectDemandLineV1(seed, input)) };
  },
});
```

`projectDemandLineV1` applies the local reputation modifier `clamp(trunc((reputation-50)/4),-2,2)` and D6 war-clue travelers modifier, records applied modifiers in stable collector order, clamps actual locals to zero, uses exact D1 range, and uses an actual-containing `±1` range from D2.

- [ ] **Step 4: Implement order allocation and settlement**

`preview` and `settle` share recipe preference, largest-remainder, capacity, preparation-point, cost, and modifier calculators. Stable tie order is segment ID then recipe ID. Settlement emits sale/revenue/discard drafts, reputation coverage result, teamwork only at coverage ≥50%, heroine mood change when post-cost stamina <2, and exact applied modifier explanations. Start costs are absent from Finalize drafts because they were already committed.

```ts
export function coverageReputationDeltaV1(actualSales: number, potentialCustomers: number): -1 | 0 | 1 {
  if (potentialCustomers === 0) return 0;
  const basisPoints = Math.floor((actualSales * 10_000) / potentialCustomers);
  return basisPoints >= 8_000 ? 1 : basisPoints >= 5_000 ? 0 : -1;
}
```

- [ ] **Step 5: Implement stable/danger/arrears endings**

```ts
// stories/demo/src/simulation/rules/endings.ts
export function evaluateEndingV1(input: DeepReadonly<EndingInputV1>): EndingResultV1 {
  const relationship = requiredOutcomeV1(input.outcomes, "outcome.relationship_opportunity");
  const investigation = requiredOutcomeV1(input.outcomes, "outcome.investigation");
  if (input.levy.kind === "arrears") {
    return { endingId: "ending.failed_arrears", status: "failed_arrears", reasonIds: ["reason.ending.arrears"], effects: [], summary: { relationship, investigation } };
  }
  const stable = input.cash >= 20 && input.reputation >= 50 && input.facilityIds.length === 1;
  const reasonIds = stable
    ? ["reason.ending.stable"]
    : input.reputation < 45
      ? ["reason.ending.danger", "reason.ending.reputation_crisis"]
      : ["reason.ending.danger"];
  return {
    endingId: stable ? "ending.stable" : "ending.danger",
    status: stable ? "completed_stable" : "completed_danger",
    reasonIds,
    effects: [],
    summary: { relationship, investigation },
  };
}
```

- [ ] **Step 6: Test all forecast transitions and deterministic vectors**

Add tests for D2 hidden forecast, D3/D4 `current_gap`, D5 no-plan `current_gap`, D5 committed plan `committed_plan_conservative`, closed/emergency return to `current_gap`, all service days resolved `final`, recommendation Action nulling, reference PRNG demand/check vector, and no NaN/Infinity/mutation/thenable output.

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/ending-forecast.test.ts`

Expected: PASS; rule, forecast, and three ending vectors pass.

- [ ] **Step 7: Commit all Story rules**

```bash
git add stories/demo/src/simulation/rules/demand.ts stories/demo/src/simulation/rules/tavern.ts stories/demo/src/simulation/rules/endings.ts stories/demo/src/simulation/rules/index.ts stories/demo/src/test/ending-forecast.test.ts stories/demo/src/simulation/content/checks-endings.ts
git commit -m "feat(story-demo): implement deterministic story rules"
```

## Task 7: Compose the Complete Demo Story with Text, Fallback Assets, Scenes, and Patch Surfaces

**Files:**
- Create: `stories/demo/src/presentation/text-catalogs/zh-CN.ts`
- Create: `stories/demo/src/presentation/text-catalogs/index.ts`
- Create: `stories/demo/src/presentation/assets.ts`
- Create: `stories/demo/src/presentation/scene-graph.tsx`
- Create: `stories/demo/src/patch-surfaces.ts`
- Create: `stories/demo/src/profile.ts`
- Create: `stories/demo/src/story.ts`
- Modify: `stories/demo/src/index.ts`
- Create: `stories/demo/LICENSE.md`
- Modify: `stories/demo/package.json`
- Modify: `stories/demo/src/test/story-validation.test.ts`
- Modify: `scripts/verify-stories.mjs`
- Modify: `scripts/verify-stories.test.mjs`
- Modify: `scripts/workspace-policy.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`

**Interfaces:**
- Consumes: complete data/rules/Narrative, individual public bindings/Schemas/coordinator/query builders, generic UI/Presentation contracts, and Story/asset validators.
- Produces: Story-owned twelve-binding tuple/coordinator/Profile, complete default Demo GamePackage, Chinese catalog, fallback-only assets, typed Patch Surfaces, mixed-license scope, and stable Story verification.

- [ ] **Step 1: Extend the failing Story validation test**

```ts
// append to stories/demo/src/test/story-validation.test.ts
import { validateStoryV1 } from "@project-tavern/base/testkit";
import { demoStoryEntryV1 } from "../index.js";

it("validates the complete week.poc_001 Story", () => {
  expect(validateStoryV1(demoStoryEntryV1)).toEqual({ ok: true });
  const definition = demoStoryEntryV1.define();
  expect(definition.simulation.profile.modules).toHaveLength(12);
  expect(definition.presentation.assetPacks).toEqual([]);
  expect(definition.presentation.assetSlots.every((slot) => slot.fallbackToken.startsWith("fallback."))).toBe(true);
});
```

- [ ] **Step 2: Run and verify missing Story entry**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts`

Expected: FAIL with missing `../index.js`.

- [ ] **Step 3: Add complete Chinese catalogs and fallback-only slots**

`zh-CN.ts` contains every TextId referenced by identity, reasons, confirmations, actions, recipes, events, scenes, choices, facilities, Auras, checks, endings, forecasts, and UI contributions exactly once. Every value is complete player-facing Chinese; unfinished-work sentinels and empty values are rejected by the catalog test.

```ts
// stories/demo/src/presentation/assets.ts
export const demoAssetSlotsV1: readonly AssetSlotDefinitionV1[] = Object.freeze([
  fallbackBackground("background.tavern.main.day", "fallback.tavern_day"),
  fallbackBackground("background.tavern.main.evening", "fallback.tavern_evening"),
  fallbackCharacter("character.heroine.neutral", "fallback.heroine_neutral"),
  fallbackCharacter("character.heroine.working", "fallback.heroine_working"),
  fallbackCharacter("character.heroine.angry", "fallback.heroine_angry"),
  fallbackProp("prop.tavern.sign.damaged", "fallback.sign_damaged"),
  fallbackProp("prop.tavern.sign.repaired", "fallback.sign_repaired"),
]);

export const demoAssetPacksV1 = Object.freeze([] as const);
```

None of the four archived candidate source files is referenced by this module.

- [ ] **Step 4: Compose the Profile, SceneGraph, and Patch Surfaces**

```ts
// stories/demo/src/profile.ts
const demoProgramV1 = Object.freeze({
  data: demoStoryDataV1,
  rules: demoStoryRulesV1,
  narrativeProgram: demoNarrativeProgramV1,
});
const demoCoordinatorV1 = createDemoCommandCoordinatorV1(demoProgramV1);

export const demoGameProfileV1 = defineGameProfile<DemoProfileTypesV1>()({
  contractRevision: 1,
  modules: [
    runModuleV1, calendarModuleV1, actorsModuleV1, statusModuleV1,
    inventoryModuleV1, facilitiesModuleV1, tavernModuleV1, workflowModuleV1,
    worldModuleV1, progressionModuleV1, narrativeModuleV1, schedulingModuleV1,
  ] as const,
  stateSchema: gameStateV1Schema,
  commandSchema: gameCommandV1Schema,
  factSchema: domainFactV1Schema,
  rejectionSchema: rejectionReasonV1Schema,
  debugCommandSchema: debugCommandV1Schema,
  coordinator: demoCoordinatorV1,
  createBootstrapInput: (entropy) => Object.freeze({
    rngSeed: entropy.nextNonZeroUint32(),
    runId: parseRunId(entropy.nextUuidV4()),
  }),
  createInitialState: (bootstrap) => createDemoInitialStateV1(bootstrap, demoProgramV1.data),
  projectView: (state) => projectDemoGameViewV1(state, demoProgramV1),
});
```

```ts
// stories/demo/src/index.ts
export const demoStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: demoStoryIdentityV1,
  define: defineDemoStoryV1,
});

export default demoStoryEntryV1;
```

SceneGraph registers Story-owned main menu, play stage, week summary, and declared overlays. Renderers receive only `{ viewSlice, playerPort, presentation }`. Simulation slots expose all seven rules plus Balance values; presentation slots expose full text catalogs and only replaceable fallback asset slots.

- [ ] **Step 5: Activate the default entry, mixed-license scope, and stable Story verifier atomically**

Create `stories/demo/LICENSE.md` mapping executable Story files/tests/scripts to PolyForm and `src/simulation/narrative/**` plus `src/presentation/text-catalogs/**` to CC BY-NC-SA. In the same edit, change package license to `SEE LICENSE IN LICENSE.md` and add only `".": "./src/index.ts"`; do not add `./development`. Update workspace/licensing policy and behavior tests, then extend `verify:stories` to keep Sandbox/E2E checks and validate Demo. Its default-closure checks use `scripts/collect-import-closure.mjs` and reject development/app/art-source/references paths; no Base/testkit closure helper exists.

- [ ] **Step 6: Run full Story, licensing, and import gates**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts && pnpm verify:stories && pnpm verify:licensing && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; all stable references/reachability/catalogs/rules/slots/fallbacks validate; no candidate image, development module, app module, or forbidden path is reachable.

- [ ] **Step 7: Commit complete Demo composition**

```bash
git add stories/demo/package.json stories/demo/LICENSE.md stories/demo/src/presentation/text-catalogs/zh-CN.ts stories/demo/src/presentation/text-catalogs/index.ts stories/demo/src/presentation/assets.ts stories/demo/src/presentation/scene-graph.tsx stories/demo/src/patch-surfaces.ts stories/demo/src/profile.ts stories/demo/src/story.ts stories/demo/src/index.ts stories/demo/src/test/story-validation.test.ts scripts/verify-stories.mjs scripts/verify-stories.test.mjs scripts/workspace-policy.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
git commit -m "feat(story-demo): compose seven-day story package"
```

## Task 7A: Prove the Complete Story Through One Uniform Runtime Harness

**Files:**
- Create: `stories/demo/src/testing/demo-harness.ts`
- Create: `stories/demo/src/test/daily-flow.integration.test.ts`
- Create: `stories/demo/src/test/relationship-route.integration.test.ts`
- Create: `stories/demo/src/test/investigation-route.integration.test.ts`
- Create: `stories/demo/src/test/terminal-route.integration.test.ts`

**Interfaces:**
- Consumes: the complete Task 7 GamePackage/Profile, `createEngineSessionV1`, fixed Host entropy, public `GameCommandV1`, Player dispatch result, and immutable queries.
- Produces: one `createDemoStoryHarnessV1(input)` API and all real command-through D1–D7 route tests. No content/rule test before this task dispatches a command.

- [ ] **Step 1: Write the failing uniform-harness contract**

```ts
export interface DemoStoryHarnessInputV1 {
  readonly bootstrap: DemoGameBootstrapInputV1;
  readonly resolvedStory?: ResolvedStoryV1;
}

export interface DemoStoryHarnessV1 {
  dispatch(command: DeepReadonly<GameCommandV1>): Promise<SessionDispatchOperationResultV1<DemoCommandExecutionResultV1>>;
  commit(command: DeepReadonly<GameCommandV1>): Promise<DeepReadonly<GameSnapshotV1>>;
  snapshot(): DeepReadonly<GameSnapshotV1>;
  queries(): EngineQueriesV1;
}

export function createDemoStoryHarnessV1(input: DemoStoryHarnessInputV1): DemoStoryHarnessV1;
```

There is no zero-argument overload, `{ seed }` alias, direct `executeAttempt`, `anchorSnapshot`, owner apply, rule call, or state setter. `commit` calls `dispatch` exactly once, requires `{ kind:"executed", execution:{ kind:"committed" } }`, and returns the adopted immutable Snapshot. Every convenience driver expands only into public commands and awaits them.

- [ ] **Step 2: Run and observe the missing harness**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/daily-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts`

Expected: FAIL with missing `../testing/demo-harness.js`.

- [ ] **Step 3: Implement the harness over the real Session**

Create the resolved Demo Story before Session creation, instantiate its Story-owned Profile, feed `input.bootstrap` through fixed Host entropy, and delegate dispatch to `createEngineSessionV1`. Queries come from the same coordinator instance and current committed Snapshot. Test-only inspection is private to the harness; Player/public package exports remain unchanged.

- [ ] **Step 4: Port all command-through acceptance vectors after composition**

Move the relationship/investigation route scenarios from Tasks 4/5 into the integration files and add D1 start/policy/opening, D2 invoice threshold, D4 facility choice, D5 mutual exclusion, D6 apology/consequence, planned/emergency closure, levy paid/arrears, and terminal-lock vectors. Build every command/expected ID/resource through the branded ID/value registries. No test invokes a Story rule or owner directly.

- [ ] **Step 5: Run all integration, Story, type, and current gates**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/*.integration.test.ts && pnpm verify:stories && pnpm typecheck && pnpm verify`

Expected: PASS; all routes commit through the one Session API, preview/execute codes agree, D1–D7 terminates exactly, and verification is unchanged.

- [ ] **Step 6: Commit the harness and command-through routes**

```bash
git add stories/demo/src/testing/demo-harness.ts stories/demo/src/test/daily-flow.integration.test.ts stories/demo/src/test/relationship-route.integration.test.ts stories/demo/src/test/investigation-route.integration.test.ts stories/demo/src/test/terminal-route.integration.test.ts
git commit -m "test(story-demo): prove command-through week routes"
```

## Task 8: Compile the Six Reference Strategies into Literal Command Fixtures

**Files:**
- Modify: `stories/demo/package.json` — add command update/verify scripts only with their target files.
- Modify: `scripts/verify-fixtures.mjs` — retain Sandbox/E2E and add Demo command fixtures.
- Modify: `scripts/verify-fixtures.test.mjs`
- Create: `stories/demo/src/testing/reference-strategy-definitions.ts`
- Create: `stories/demo/src/testing/compile-reference-strategy.ts`
- Create: `stories/demo/src/testing/run-reference-strategy.ts`
- Create: `stories/demo/scripts/update-command-fixtures.mjs`
- Create: `stories/demo/src/test/reference-strategies.test.ts`
- Create: `stories/demo/src/test/fixtures/commands/strategy.cash_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.relationship_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.investigation_first.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.full_delegation.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.two_closures_recovery.json`
- Create: `stories/demo/src/test/fixtures/commands/strategy.explicit_failure.json`

**Interfaces:**
- Consumes: fixed strategy schedules in `reference-strategies.md`, Story queries/commands, fixed seed/run IDs, and current committed inventory for deterministic purchase expansion.
- Produces: six unique literal `GameCommandV1[]` JSON fixtures and a runner that fails immediately on any rejection/fault. Runtime tests read the JSON; they do not reinterpret strategy prose.

- [ ] **Step 1: Write the failing compiler/fixture test**

```ts
// stories/demo/src/test/reference-strategies.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canonicalJsonBytes } from "@project-tavern/base";
import { compileReferenceStrategyV1 } from "../testing/compile-reference-strategy.js";
import { referenceStrategyDefinitionsV1 } from "../testing/reference-strategy-definitions.js";

describe("reference strategy command fixtures", () => {
  for (const definition of Object.values(referenceStrategyDefinitionsV1)) {
    it(`${definition.strategyId} compiles to the reviewed literal fixture`, async () => {
      const compiled = compileReferenceStrategyV1(definition);
      const path = new URL(`./fixtures/commands/${definition.strategyId}.json`, import.meta.url);
      const stored = JSON.parse(await readFile(path, "utf8"));
      expect(canonicalJsonBytes(compiled.commands)).toEqual(canonicalJsonBytes(stored));
      expect(compiled.results.every((result) => result.kind === "committed")).toBe(true);
      expect(compiled.finalSnapshot.state.simulation.run.status).not.toBe("active");
    });
  }
});
```

- [ ] **Step 2: Run and verify missing definitions/fixtures**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/reference-strategies.test.ts`

Expected: FAIL with missing strategy definitions or command JSON.

- [ ] **Step 3: Encode all six schedules exactly**

```ts
// stories/demo/src/testing/reference-strategy-definitions.ts
export const referenceStrategyDefinitionsV1 = Object.freeze({
  "strategy.cash_first": strategy("strategy.cash_first", "policy.balanced", [
    day(1, "M2", [buy("current"), prepare(2), rest(1)]),
    day(2, "M2", [buy("current"), prepare(2), rest(1)]),
    day(3, "M2", [buy("current+next"), prepare(2), rest(1)]),
    day(4, "M2", [prepare(2), build("facility.comfortable_bed")]),
    day(5, "M2", [buy("current"), prepare(2)]),
    day(6, "M2", [buy("current"), prepare(2)]),
  ]),
  "strategy.relationship_first": strategy("strategy.relationship_first", "policy.night_owl", [
    day(1, "M1", [buy("current"), prepare(1)]),
    day(2, "M1", [buy("current"), prepare(1)]),
    day(3, "M1", [buy("current+next"), prepare(1), rest(1)]),
    day(4, "A1", [prepare(1), build("facility.comfortable_bed")], [rest(1)]),
    day(5, "D0-Friday", [buy("current"), relationship("cooperate")], [rest(1)]),
    day(6, "A1-Sign-D6", [buy("current"), prepare(1), rest(1)]),
  ]),
  "strategy.investigation_first": strategy("strategy.investigation_first", "policy.balanced", [
    day(1, "M1", [buy("current"), prepare(1), rest(1)]),
    day(2, "M1", [buy("current"), prepare(1), rest(1)]),
    day(3, "M1", [buy("current"), prepare(1), rest(1)]),
    day(4, "A1", [buy("D4+D5+D6-clue"), prepare(1), build("facility.cold_storage")], [rest(1)]),
    day(5, "D1", [prepare(1), investigate("choice.old_trade_road.prepared")]),
    day(6, "M2-clue-conditional", [buy("current"), prepare(2), rest(1)]),
  ]),
  "strategy.full_delegation": strategy("strategy.full_delegation", "policy.balanced", [
    day(1, "M1", [buy("current"), prepare(1)]),
    day(2, "A1", [buy("current"), prepare(1)]),
    day(3, "D1", [buy("current"), prepare(1)]),
    day(4, "D1", [buy("D4+D5+D6-clue"), prepare(1), build("facility.cold_storage")]),
    day(5, "D1", [prepare(1), investigate("choice.old_trade_road.prepared")]),
    day(6, "D2-clue-conditional", [buy("current"), prepare(2)]),
  ]),
  "strategy.two_closures_recovery": strategy("strategy.two_closures_recovery", "policy.balanced", [
    day(1, "M1", [buy("current"), prepare(1)]),
    day(2, "M1", [buy("current"), prepare(1)]),
    day(3, "closed", [rest(2)]),
    day(4, "A1", [buy("current"), prepare(1), build("facility.comfortable_bed")], [rest(1)]),
    day(5, "closed", [relationship("decline")]),
    day(6, "M2", [buy("current"), prepare(2), rest(1)]),
  ]),
  "strategy.explicit_failure": strategy("strategy.explicit_failure", "policy.balanced", [
    day(1, "M1", [buy("current"), prepare(1)]),
    day(2, "A1", [buy("current"), prepare(1)]),
    day(3, "closed", []),
    day(4, "closed", [build("facility.cold_storage")]),
    day(5, "closed", [relationship("decline")]),
    day(6, "closed", []),
  ]),
});
```

`M1/M2/A1/D1/D0-Friday/A1-Sign-D6/D2-*-D6` resolve to the exact fixed menus in `reference-strategies.md` section 3. Conditional D6 chooses only on the already committed `fact.war_clue`; no other state branch is allowed.

- [ ] **Step 4: Implement deterministic purchase and command expansion**

```ts
// stories/demo/src/testing/compile-reference-strategy.ts
export async function compileReferenceStrategyV1(
  definition: Readonly<ReferenceStrategyDefinitionV1>,
): Promise<CompiledReferenceStrategyV1> {
  const harness = createDemoStoryHarnessV1({
    bootstrap: {
      rngSeed: referenceSeedV1,
      runId: referenceRunIdsV1[definition.strategyId],
    },
  });
  const commands: GameCommandV1[] = [];
  const commit = async (command: GameCommandV1): Promise<void> => {
    await harness.commit(command);
    commands.push(command);
  };

  await commit({ kind: "run.start" });
  await drainNarrativeCommandsV1(harness, commit);
  await commit({ kind: "policy.choose", policyId: definition.policyId });
  for (const dayPlan of definition.days) await compileDayV1(dayPlan, harness, commit);
  await commit({ kind: "calendar.advance_phase" });
  await drainNarrativeCommandsV1(harness, commit);
  commit({ kind: "levy.pay" });
  return { commands, results: harness.results(), finalSnapshot: harness.snapshot() };
}

export function buildAllCommandFixturesV1(): Readonly<
  Record<ReferenceStrategyIdV1, readonly GameCommandV1[]>
> {
  return Object.freeze(Object.fromEntries(
    referenceStrategyIdsV1.map((strategyId) => [
      strategyId,
      compileReferenceStrategyV1(referenceStrategyDefinitionsV1[strategyId]).commands,
    ]),
  ) as Record<ReferenceStrategyIdV1, readonly GameCommandV1[]>);
}
```

`compileDayV1` reserves fixed-window AP first, expands repeated prepare/rest as separate commands, computes purchases from current FIFO inventory without future RNG, submits plan before afternoon advance, drains every Scheduler Scene after phase advance, calls Start/Finalize adjacently for non-closed service, and fails on the first non-committed result.

- [ ] **Step 5: Add the command-only writer, generate literal JSON once, and review it**

```js
// stories/demo/scripts/update-command-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAllCommandFixturesV1 } from "../dist/testing/compile-reference-strategy.js";

const directory = resolve(import.meta.dirname, "../src/test/fixtures/commands");
await mkdir(directory, { recursive: true });
for (const [strategyId, commands] of Object.entries(buildAllCommandFixturesV1())) {
  await writeFile(resolve(directory, `${strategyId}.json`), `${JSON.stringify(commands, null, 2)}\n`, "utf8");
}
```

Run: `pnpm --filter @project-tavern/story-demo update:commands`

Expected: creates/updates exactly six `src/test/fixtures/commands/strategy.*.json` files; no golden or Save fixture is written.

Run: `git diff -- stories/demo/src/test/fixtures/commands`

Expected: every file contains a literal JSON command array beginning with `run.start`, manifest Narrative drain, and `policy.choose`, and ending with D7 `calendar.advance_phase`, levy Scene drain, and `levy.pay`; non-closed nights contain adjacent opening Start/Finalize commands.

- [ ] **Step 6: Run compiler/fixture parity tests**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/reference-strategies.test.ts`

Expected: PASS; 6/6 strategies compile to byte-equivalent command fixtures and contain no rejected/faulted command.

- [ ] **Step 7: Commit reviewed command fixtures**

```bash
git add stories/demo/src/testing/reference-strategy-definitions.ts stories/demo/src/testing/compile-reference-strategy.ts stories/demo/src/testing/run-reference-strategy.ts stories/demo/scripts/update-command-fixtures.mjs stories/demo/src/test/reference-strategies.test.ts stories/demo/src/test/fixtures/commands stories/demo/package.json scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs
git commit -m "test(story-demo): freeze reference strategy commands"
```

## Task 9: Generate and Verify Fixed-Seed Golden Week Artifacts

**Files:**
- Modify: `stories/demo/package.json` — add golden update/verify scripts only with their target files.
- Modify: `scripts/verify-golden.mjs` — retain Sandbox/E2E and add Demo golden files.
- Modify: `scripts/verify-golden.test.mjs`
- Create: `stories/demo/src/testing/golden-artifact.ts`
- Create: `stories/demo/src/test/golden-week.test.ts`
- Create: `stories/demo/scripts/update-golden.mjs`
- Create: `stories/demo/src/test/fixtures/golden/strategy.cash_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.relationship_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.investigation_first.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.full_delegation.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.two_closures_recovery.json`
- Create: `stories/demo/src/test/fixtures/golden/strategy.explicit_failure.json`

**Interfaces:**
- Consumes: reviewed command fixtures, fixed seed/run IDs, EngineSession, state digest, DomainFacts, ledger, service history, and Run completion.
- Produces: six canonical golden artifacts containing every command/state digest, nightly ledger/history, PRNG trace summary, and final three-dimensional outcome.

- [ ] **Step 1: Write the failing read-only golden verifier**

```ts
// stories/demo/src/test/golden-week.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canonicalJsonBytes } from "@project-tavern/base";
import { buildGoldenArtifactV1 } from "../testing/golden-artifact.js";
import { loadCommandFixtureV1 } from "../testing/run-reference-strategy.js";

describe("reference seed golden weeks", () => {
  for (const strategyId of referenceStrategyIdsV1) {
    it(`${strategyId} matches the reviewed artifact`, async () => {
      const actual = buildGoldenArtifactV1(strategyId, loadCommandFixtureV1(strategyId));
      const stored = JSON.parse(await readFile(new URL(`./fixtures/golden/${strategyId}.json`, import.meta.url), "utf8"));
      expect(canonicalJsonBytes(actual)).toEqual(canonicalJsonBytes(stored));
      expect(actual.transitions).toHaveLength(actual.commands.length);
      expect(actual.final.runStatus).not.toBe("active");
    });
  }
});
```

- [ ] **Step 2: Run and verify golden files are missing**

Run: `pnpm --filter @project-tavern/story-demo verify:golden`

Expected: FAIL with `ENOENT` for the first missing golden artifact.

- [ ] **Step 3: Define the exact artifact schema and builder**

```ts
// stories/demo/src/testing/golden-artifact.ts
export interface DemoGoldenArtifactV1 {
  readonly formatRevision: 1;
  readonly storyId: StoryId;
  readonly storyRevision: PositiveSafeInteger;
  readonly strategyId: ReferenceStrategyIdV1;
  readonly seed: NonZeroUint32;
  readonly runId: RunId;
  readonly commands: readonly GameCommandV1[];
  readonly transitions: readonly {
    readonly ordinal: PositiveSafeInteger;
    readonly command: GameCommandV1;
    readonly outcome: "committed";
    readonly stateDigest: Digest;
    readonly factKinds: readonly DomainFactV1["kind"][];
    readonly rngDraws: readonly RngDrawTraceV1[];
  }[];
  readonly nights: readonly {
    readonly day: DayIndex;
    readonly service: ServiceHistoryEntryV1;
    readonly ledgerEntryIds: readonly LedgerEntryId[];
    readonly cash: Money;
  }[];
  readonly final: {
    readonly runStatus: RunStatus;
    readonly endingId: EndingId;
    readonly cashAfterLevy: Money | null;
    readonly reputation: NonNegativeSafeInteger;
    readonly relationship: StoryValueV1;
    readonly investigation: StoryValueV1;
    readonly completionStateDigest: Digest;
  };
}
```

`buildGoldenArtifactV1` executes only the stored command fixture with the fixed seed/runId, records the same attempt's diagnostics, derives nightly rows from authoritative serviceHistory/ledger, and reads final outcomes from `RunCompletionV1`; it never reads CommandLog as player history.

- [ ] **Step 4: Implement the explicit update script**

```js
// stories/demo/scripts/update-golden.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAllGoldenArtifactsV1 } from "../dist/testing/golden-artifact.js";

const records = buildAllGoldenArtifactsV1();
const directory = resolve(import.meta.dirname, "../src/test/fixtures/golden");
await mkdir(directory, { recursive: true });
for (const [strategyId, value] of Object.entries(records)) {
  await writeFile(resolve(directory, `${strategyId}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
```

The package `build` compiles `src/testing` to `dist/testing` before this script runs. This script writes no source, manifest, Save fixture, or command fixture.

- [ ] **Step 5: Generate and inspect six golden artifacts**

Run: `pnpm --filter @project-tavern/story-demo update:golden`

Expected: writes exactly six `src/test/fixtures/golden/strategy.*.json` files.

Run: `git diff --stat -- stories/demo/src/test/fixtures/golden && git diff -- stories/demo/src/test/fixtures/golden`

Expected: each file includes all commands/transitions, six nightly history rows, and one final three-dimensional result; no unexpected path changes.

- [ ] **Step 6: Run read-only golden verification twice**

Run: `pnpm --filter @project-tavern/story-demo verify:golden && pnpm --filter @project-tavern/story-demo verify:golden && git diff --exit-code -- stories/demo/src/test/fixtures/golden`

Expected: both runs PASS and produce no fixture diff.

- [ ] **Step 7: Commit reviewed goldens and generator**

```bash
git add stories/demo/src/testing/golden-artifact.ts stories/demo/src/test/golden-week.test.ts stories/demo/scripts/update-golden.mjs stories/demo/src/test/fixtures/golden stories/demo/package.json scripts/verify-golden.mjs scripts/verify-golden.test.mjs
git commit -m "test(story-demo): add reviewed golden weeks"
```

## Task 10: Enforce 1–1000 Seed Balance and Property Thresholds

**Files:**
- Modify: root `package.json` — point stable `verify:balance` at the repository wrapper.
- Modify: `stories/demo/package.json` — add Demo `verify:balance` with its test.
- Create: `scripts/verify-balance.mjs` — compose the existing Sandbox check with the Demo corpus.
- Create: `scripts/verify-balance.test.mjs`
- Create: `stories/demo/src/test/balance-1000-seeds.test.ts`
- Modify: `stories/demo/src/testing/run-reference-strategy.ts`

**Interfaces:**
- Consumes: six reviewed command schedules, seeds `1..1000`, already-committed clue-only D6 branch, final completion/ledger/AP/stamina/inventory metrics, and fast-check.
- Produces: exact pass-count/median/dominance assertions plus deterministic, non-negative, ledger, bed, and cold-storage counterfactuals.

- [ ] **Step 1: Write exact threshold tests before running the corpus**

```ts
// stories/demo/src/test/balance-1000-seeds.test.ts
import { describe, expect, it } from "vitest";
import { runStrategyCorpusV1 } from "../testing/run-reference-strategy.js";

describe("1..1000 seed balance contract", () => {
  const corpus = runStrategyCorpusV1({ firstSeed: 1, lastSeed: 1000 });

  it("keeps primary strategies viable", () => {
    expect(corpus.paidCount("strategy.cash_first")).toBeGreaterThanOrEqual(900);
    expect(corpus.paidCount("strategy.relationship_first")).toBeGreaterThanOrEqual(900);
    expect(corpus.paidCount("strategy.investigation_first")).toBeGreaterThanOrEqual(900);
  });

  it("keeps delegation near the levy line", () => {
    expect(corpus.paidCount("strategy.full_delegation")).toBeGreaterThanOrEqual(850);
    expect(corpus.paidCount("strategy.full_delegation")).toBeLessThanOrEqual(950);
    expect(corpus.paidCashMedian("strategy.full_delegation")).toBeGreaterThanOrEqual(0);
    expect(corpus.paidCashMedian("strategy.full_delegation")).toBeLessThanOrEqual(35);
  });

  it("separates recovery and explicit failure", () => {
    expect(corpus.paidCount("strategy.two_closures_recovery")).toBeGreaterThanOrEqual(700);
    expect(corpus.paidCount("strategy.explicit_failure")).toBeLessThanOrEqual(200);
  });

  it("survives the D4 investment pressure and avoids one strict dominator", () => {
    for (const strategyId of ["strategy.cash_first", "strategy.relationship_first", "strategy.investigation_first"] as const) {
      expect(corpus.paidCountWithD4CashDelta(strategyId, -12)).toBeGreaterThanOrEqual(750);
    }
    expect(corpus.maximumStrictDominanceCount()).toBeLessThanOrEqual(800);
  });
});
```

- [ ] **Step 2: Run and record the initial corpus result**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/balance-1000-seeds.test.ts`

Expected: PASS against the current `balance-v0.md` contract. If any exact threshold fails, stop Phase 4, retain the failing corpus report, and revise the authoritative balance document and affected golden expectations before changing implementation values.

- [ ] **Step 3: Add deterministic and resource invariants**

```ts
it("replays every seed/strategy identically and preserves resource invariants", () => {
  for (const run of corpus.runs()) {
    const replay = corpus.replay(run.strategyId, run.seed);
    expect(replay.finalStateDigest).toBe(run.finalStateDigest);
    expect(replay.finalRng).toEqual(run.finalRng);
    expect(run.minimumAp).toBeGreaterThanOrEqual(0);
    expect(run.minimumPlayerStamina).toBeGreaterThanOrEqual(0);
    expect(run.minimumHeroineStamina).toBeGreaterThanOrEqual(0);
    expect(run.minimumIngredientQuantity).toBeGreaterThanOrEqual(0);
    expect(run.finalCash).toBe(run.startingCash + run.ledgerCashDelta);
  }
});
```

- [ ] **Step 4: Add the exact facility counterfactuals**

```ts
it("requires the comfortable bed for cash_first D6 manual service", () => {
  const withBed = corpus.counterfactual("strategy.cash_first", referenceSeedV1, { facilities: "authored" });
  const withoutBed = corpus.counterfactual("strategy.cash_first", referenceSeedV1, { facilities: "none" });
  expect(withBed.d6OpeningResult.kind).toBe("committed");
  expect(withoutBed.d6OpeningResult).toMatchObject({ kind: "rejected", reasons: [{ code: "actor.insufficient_stamina" }] });
});

it.each(["strategy.investigation_first", "strategy.full_delegation"] as const)("requires cold storage for %s D4 meat", (strategyId) => {
  const withStorage = corpus.counterfactual(strategyId, referenceSeedV1, { facilities: "authored" });
  const withoutStorage = corpus.counterfactual(strategyId, referenceSeedV1, { facilities: "none" });
  expect(withStorage.d6ConsumedD4FreshMeat).toBeGreaterThanOrEqual(1);
  expect(withoutStorage.d5SpoiledD4FreshMeat).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 5: Add fast-check command-sequence invariants**

Generate only schema-valid commands from currently visible Action/Workflow projections; execute up to 200 commands per case for at least 200 cases. Assert deterministic duplicate runs, no negative resource, state Schema validity after every commit, rejection/fault source object preservation, ledger equality, and no hidden demand in queries.

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/balance-1000-seeds.test.ts`

Expected: PASS; 6,000 strategy runs, exact thresholds, counterfactuals, deterministic replay, and fast-check invariants pass.

- [ ] **Step 6: Wire and prove the stable read-only repository balance gate**

Set Demo package `verify:balance` to `vitest run src/test/balance-1000-seeds.test.ts`, then set root `verify:balance` to `node scripts/verify-balance.mjs`. The wrapper invokes the existing Sandbox `verify:balance` and the Demo `verify:balance` in fixed order, propagates either failure, and never invokes an update/generator command. Its behavior test uses fake package commands to prove order, failure propagation, and absence of writer names.

Run:

```bash
node --test scripts/verify-balance.test.mjs
pnpm verify:balance
pnpm verify
```

Expected: the wrapper test and both real balance suites pass; no tracked fixture, golden, report, or manifest changes.

- [ ] **Step 7: Commit balance/property tests**

```bash
git add package.json stories/demo/src/test/balance-1000-seeds.test.ts stories/demo/src/testing/run-reference-strategy.ts stories/demo/package.json scripts/verify-balance.mjs scripts/verify-balance.test.mjs
git commit -m "test(story-demo): enforce multiseed balance gates"
```

## Task 11: Add Demo Development Anchors and Persistence Fixtures

**Files:**
- Modify: `stories/demo/package.json` — atomically add `./development`, update, and verify targets.
- Modify: `scripts/verify-fixtures.mjs` — retain Sandbox/E2E/Demo commands and add Demo saves.
- Modify: `scripts/verify-fixtures.test.mjs`
- Create: `stories/demo/src/development.ts`
- Create: `stories/demo/src/development/fixtures.ts`
- Create: `stories/demo/src/testing/save-fixture-builder.ts`
- Create: `stories/demo/src/test/save-fixtures.test.ts`
- Create: `stories/demo/scripts/update-save-fixtures.mjs`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-opening.json`
- Create: `stories/demo/src/test/fixtures/saves/save.quick-world-action.json`
- Create: `stories/demo/src/test/fixtures/saves/save.manual-completed.json`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-current-corrupt.json`
- Create: `stories/demo/src/test/fixtures/saves/save.auto-previous-valid.json`
- Create: `stories/demo/src/test/fixtures/saves/save.future-format.json`
- Create: `stories/demo/src/test/fixtures/saves/save.revision-mismatch.json`
- Create: `stories/demo/src/test/fixtures/saves/save.digest-mismatch.json`
- Modify: `stories/demo/package.json`

**Interfaces:**
- Consumes: Phase 3 persistence/import APIs, Demo provenance/digests, fixed command fixtures, SaveRecord schemas, and Story development entry contract.
- Produces: four command-derived preview anchors, three valid SaveRecords covering Opening/WorldAction/terminal states, five invalid/recovery fixtures, read-only verification, and a separate explicit Save regeneration command.

- [ ] **Step 1: Write the failing Save fixture matrix test**

```ts
// stories/demo/src/test/save-fixtures.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateSaveImportCandidateV1 } from "@project-tavern/base/runtime";
import { demoResolvedStoryV1 } from "../story.js";
import { createDemoSaveValidationContextV1 } from "../testing/save-fixture-builder.js";

const readFixture = async (name: string): Promise<Uint8Array> =>
  new TextEncoder().encode(await readFile(new URL(`./fixtures/saves/${name}.json`, import.meta.url), "utf8"));

describe("Demo Save fixtures", () => {
  const context = createDemoSaveValidationContextV1(demoResolvedStoryV1);

  it.each([
    ["save.auto-opening", "exact"],
    ["save.quick-world-action", "exact"],
    ["save.manual-completed", "exact"],
  ] as const)("imports %s as %s", async (name, compatibility) => {
    const result = validateSaveImportCandidateV1(await readFixture(name), context);
    expect(result).toMatchObject({ kind: "validated", compatibility: { kind: compatibility } });
  });

  it.each([
    ["save.future-format", "envelope.unsupported_revision"],
    ["save.digest-mismatch", "digest.state_mismatch"],
  ] as const)("rejects %s with %s", async (name, code) => {
    const result = validateSaveImportCandidateV1(await readFixture(name), context);
    expect(result).toMatchObject({ kind: "rejected", code });
  });

  it("keeps a Story revision mismatch inspect-only", async () => {
    const result = validateSaveImportCandidateV1(await readFixture("save.revision-mismatch"), context);
    expect(result).toMatchObject({
      kind: "inspect_only",
      mismatches: [{ field: "story_revision", code: "identity.story_revision_mismatch" }],
    });
  });
});
```

- [ ] **Step 2: Run and verify fixtures are absent**

Run: `pnpm --filter @project-tavern/story-demo verify:fixtures`

Expected: FAIL with `ENOENT` for `save.auto-opening.json`.

- [ ] **Step 3: Define command-derived development anchors**

```ts
// stories/demo/src/development/fixtures.ts
export const demoDevelopmentFixturesV1: StoryDevelopmentSupportV1["fixtures"] = Object.freeze([
  { fixtureId: "fixture.demo_d1_start", seed: referenceSeedV1, commands: commandsToD1StartV1 },
  { fixtureId: "fixture.demo_d5_relationship", seed: referenceSeedV1, commands: commandsToD5RelationshipV1 },
  { fixtureId: "fixture.demo_d5_world", seed: referenceSeedV1, commands: commandsToD5WorldV1 },
  { fixtureId: "fixture.demo_d7_summary", seed: referenceSeedV1, commands: commandsToD7SummaryV1 },
]);
```

All four command arrays are literal and replay successfully with fixed run IDs `00000000-0000-4000-8000-000000000201`, `00000000-0000-4000-8000-000000000202`, `00000000-0000-4000-8000-000000000203`, and `00000000-0000-4000-8000-000000000204`. The default Story entry does not import them.

```ts
// stories/demo/src/development.ts
export const demoDevelopmentEntryV1 = defineStoryDevelopmentEntry({
  contractRevision: 1,
  storyIdentity: demoStoryIdentityV1,
  defineDevelopmentSupport: () => ({ fixtures: demoDevelopmentFixturesV1 }),
});
```

- [ ] **Step 4: Implement the Save builder and explicit fixture generation**

```ts
// stories/demo/src/testing/save-fixture-builder.ts
export function buildDemoSaveFixtureMatrixV1(): Readonly<
  Record<DemoSaveFixtureNameV1, StrictJsonObjectV1>
> {
  const autoOpening = saveFromCommandsV1("auto.current", "auto", commandsToOpeningV1);
  const quickWorld = saveFromCommandsV1("quick", "quick", commandsToAwaitingWorldCompletionV1);
  const manualCompleted = saveFromCommandsV1("manual", "manual", commandsToD7SummaryV1);
  return Object.freeze({
    "save.auto-opening": autoOpening,
    "save.quick-world-action": quickWorld,
    "save.manual-completed": manualCompleted,
    "save.auto-current-corrupt": withStateDigestV1(autoOpening, invalidDigestV1),
    "save.auto-previous-valid": withSlotV1(autoOpening, "auto.previous"),
    "save.future-format": withFormatRevisionV1(manualCompleted, 2),
    "save.revision-mismatch": withStoryRevisionV1(manualCompleted, 2),
    "save.digest-mismatch": withStateDigestV1(manualCompleted, invalidDigestV1),
  });
}
```

`saveFromCommandsV1` replays literal commands through `DemoCommandCoordinatorV1`, captures the committed Snapshot once, computes current provenance and state digest, and validates the generated record before returning it. Each `with*V1` negative-fixture helper deep-clones through Canonical JSON and changes only the named field; `withSlotV1` also recomputes the cross-field slot metadata required for a valid previous record.

```js
// stories/demo/scripts/update-save-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDemoSaveFixtureMatrixV1 } from "../dist/testing/save-fixture-builder.js";

const directory = resolve(import.meta.dirname, "../src/test/fixtures/saves");
await mkdir(directory, { recursive: true });
for (const [name, record] of Object.entries(buildDemoSaveFixtureMatrixV1())) {
  await writeFile(resolve(directory, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
```

The fixture builder creates:

- `auto-opening`: `slotId=auto.current`, captured during a valid OpeningSession;
- `quick-world-action`: `slotId=quick`, captured at `awaiting_completion_phase`;
- `manual-completed`: `slotId=manual`, captured after D7 completion;
- corrupt current plus valid previous recovery pair;
- future format, Story revision mismatch, and state-digest mismatch negative records.

Every valid record has matching slot Story ID/sequence, exact provenance, state digest, and empty simulation lineage.

- [ ] **Step 5: Add explicit package script and generate once**

Add to `stories/demo/package.json`:

```json
{
  "update:fixtures": "pnpm build && node scripts/update-save-fixtures.mjs"
}
```

Run: `pnpm --filter @project-tavern/story-demo update:fixtures`

Expected: writes exactly 8 JSON files under `src/test/fixtures/saves/`.

Run: `git diff -- stories/demo/src/test/fixtures/saves`

Expected: valid fixtures contain no absolute path, UI history, arbitrary storage, or unbounded diagnostic text; invalid fixtures differ only at the field named by their filename.

- [ ] **Step 6: Verify exact/inspect-only/rejected/recovery behavior read-only**

Extend `save-fixtures.test.ts` to assert corrupt `auto.current` is invalid while `auto.previous` appears only as `recovery_candidate`, Quick/Manual remain independent, Opening/WorldAction cursors round-trip, and completed Save does not re-evaluate Ending.

Run: `pnpm --filter @project-tavern/story-demo verify:fixtures && pnpm --filter @project-tavern/story-e2e test:runtime && git diff --exit-code -- stories/demo/src/test/fixtures/saves`

Expected: PASS; Phase 3 runtime consumes the Story fixtures without rewriting them.

- [ ] **Step 7: Commit development and reviewed Save fixtures**

```bash
git add stories/demo/src/development.ts stories/demo/src/development/fixtures.ts stories/demo/src/testing/save-fixture-builder.ts stories/demo/src/test/save-fixtures.test.ts stories/demo/scripts/update-save-fixtures.mjs stories/demo/src/test/fixtures/saves stories/demo/package.json scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs
git commit -m "test(story-demo): add persistence fixtures"
```

## Task 12: Add the Phase 4 Verification Gate

**Files:**
- Modify: `package.json`
- Modify: `stories/demo/package.json`

**Interfaces:**
- Consumes: Phase 2 gate, Phase 3 runtime/Host suites, all Demo tests, read-only fixture/golden verifiers, build, boundary/cycle/type/licensing gates.
- Produces: one non-interactive `pnpm verify:phase4` command that never updates a tracked baseline. Phase 5 later adds Story aliasing, browser flavors, Playwright smoke, and release hardening.

- [ ] **Step 1: Add the exact root phase script**

```json
// package.json scripts addition
{
  "verify:phase4": "pnpm verify:phase2 && pnpm verify:persistence-diagnostics && pnpm verify:stories && pnpm verify:fixtures && pnpm verify:golden && pnpm verify:balance && pnpm --filter @project-tavern/story-demo test && pnpm build"
}
```

None of `update:commands`, `update:golden`, or `update:fixtures` appears in `verify:phase4` or `verify`.

- [ ] **Step 2: Run all focused Demo suites**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts src/test/daily-gates.test.ts src/test/relationship-content.contract.test.ts src/test/investigation-content.contract.test.ts src/test/ending-forecast.test.ts src/test/*.integration.test.ts`

Expected: PASS; Story contract, D1–D7 gates, relationship, investigation, rule, forecast, and ending tests pass.

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/reference-strategies.test.ts src/test/golden-week.test.ts src/test/balance-1000-seeds.test.ts src/test/save-fixtures.test.ts`

Expected: PASS; six command fixtures, six golden artifacts, 1–1000 seed thresholds/properties, and eight Save fixtures pass.

- [ ] **Step 3: Run the non-mutating Phase 4 gate**

Run: `pnpm verify:phase4`

Expected: PASS; Phase 2, Phase 3 runtime/Host, Demo, golden, Save, and build gates pass without changing tracked files.

- [ ] **Step 4: Run licensing verification**

Run: `node scripts/verify-licensing.mjs`

Expected: `licensing verification passed`

- [ ] **Step 5: Run full repository verification and prove a clean generated state**

Run: `pnpm verify && git diff --exit-code -- stories/demo/src/test/fixtures && git status --short`

Expected: `pnpm verify` exits 0; both fixture directories are unchanged; status shows only intentionally uncommitted work outside this task, if any, and no `dist`, report, Save export, or DebugBundle.

- [ ] **Step 6: Commit the Phase 4 gate**

```bash
git add package.json stories/demo/package.json
git commit -m "test(story-demo): add phase four verification gate"
```

## Phase 4 Acceptance

- [ ] `week.poc_001` revision 1 validates as one complete GamePackage selecting exactly 12 public Modules and 1 coordinator.
- [ ] The Demo Story, not `@project-tavern/modules`, owns the exact twelve-binding tuple, coordinator instance, bootstrap/initial-state assembly, and Profile; E2E remains the earlier first real consumer.
- [ ] Tasks 1–6 contain no Profile/Session/harness imports; all command-through route assertions run after composition through the single async `createDemoStoryHarnessV1({ bootstrap, resolvedStory? })` API.
- [ ] Every public Story state/command/artifact field uses Catalog brands and unsuffixed parsers; no raw `string`/`number` widening or suffixed Base parser alias appears.
- [ ] The Story contains exactly 2 policies, 5 ingredients, 4 recipes, 2 segments, 4 service modes, 2 facilities in 1 opportunity, 3 Auras, 5 Scheduler Events, 1 relationship opportunity, 1 two-stage WorldAction, 1 threshold choice, 1 four-band 2D6 check, and 3 ending IDs.
- [ ] D1–D6 each materialize one frozen service-day demand; D7 has no service and terminates at afternoon.
- [ ] The D2 `[智力 B]` branch consumes 0 AP and 0 RNG draws, appends the +4 ledger effect, and persists `fact.invoice_checked_this_week=true`.
- [ ] Relationship pending/completed/abandoned/unresolved/reconciled vectors pass; the sign and angry Aura applicability/expiry vectors pass.
- [ ] Reference seed basic/prepared investigation totals are exactly 8/9 from dice `[4,3]`, and one persisted check maps to the correct Outcome/rewards.
- [ ] All `current_gap`, `committed_plan_conservative`, and `final` forecast branches pass; stable/danger/arrears endings persist exact three-dimensional summaries.
- [ ] The default Demo import closure contains 0 development modules, 0 app imports, 0 `art-source` imports, 0 `references/` paths, and 0 runtime image providers.
- [ ] All four current Image Gen candidates remain excluded; the Story resolves every declared asset ID through code-native fallback.
- [ ] Exactly 6 literal command fixtures compile without a rejected/faulted command and match their reviewed JSON.
- [ ] Exactly 6 golden artifacts include every command/state digest, 6 nightly rows, and one terminal three-dimensional result; running `verify:golden` twice produces no diff.
- [ ] Seeds 1–1000 meet all exact PoC thresholds: primary strategies ≥900 paid, delegation 850–950 paid with median 0–35, two-closure ≥700 paid, explicit failure ≤200 paid, D4-pressure primary strategies ≥750 paid, and maximum strict dominance ≤800.
- [ ] Bed and cold-storage counterfactual assertions pass exactly as specified.
- [ ] Exactly 8 Save fixtures cover valid Opening/World/terminal states, corrupt-current/valid-previous recovery, rejected future-format/digest failures, and an inspect-only Story revision mismatch; verification is read-only.
- [ ] Stable root `verify:stories`, `verify:fixtures`, `verify:golden`, and `verify:balance` retain all Sandbox/E2E checks and include Demo only when the corresponding Story target exists.
- [ ] Demo mixed-license metadata/scope and default/development exports are each activated atomically with their target files and pass licensing/closure verification.
- [ ] `pnpm --filter @project-tavern/story-demo test` passes.
- [ ] `pnpm --filter @project-tavern/story-demo verify:golden` passes without writes.
- [ ] `pnpm --filter @project-tavern/story-demo verify:fixtures` passes without writes.
- [ ] `pnpm verify:phase4` passes.
- [ ] `pnpm verify` passes and no generated artifact is tracked.
