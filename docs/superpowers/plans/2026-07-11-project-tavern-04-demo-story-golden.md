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
- The four current Phase A Image Gen items remain `review.status="candidate"` and `termsReview.status="approved"`. They must not enter Story asset packs, `ResolvedAssetManifest`, presentation digest, Player artifact, golden screenshot, or AIGC input while they remain unselected. Demo ships fallback-only slots until explicit user selection; recorded service-terms approval neither selects an asset nor approves any future AIGC input reuse.
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
- Modify: `stories/demo/package.json` — add each script/export only with its target; mixed licensing begins atomically in Task 3 with the first narrative file.
- Create in Task 3 with the first narrative file, then modify in Task 7 for localization scope: `stories/demo/LICENSE.md` — PolyForm software vs CC narrative/localization scope.
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
import {
  actionIdsV1,
  eventIdsV1,
  ingredientIdsV1,
  recipeIdsV1,
} from "../simulation/content/ids.js";

describe("week.poc_001 identity catalog", () => {
  it("freezes Story identity and deterministic reference inputs", () => {
    expect(demoStoryIdentityV1).toEqual({ id: "week.poc_001", revision: 1 });
    expect(referenceSeedV1).toBe(0x00023049);
    expect(new Set(Object.values(referenceRunIdsV1)).size).toBe(6);
  });

  it("keeps Event and player Action namespaces distinct", () => {
    expect(eventIdsV1).toEqual([
      "event.tutorial_first_service",
      "event.supplier_invoice",
      "event.helper_available",
      "event.facility_window",
      "event.levy_due",
    ]);
    expect(actionIdsV1).toContain("action.facility_window");
    expect(actionIdsV1).not.toContain("event.facility_window");
    expect(new Set([...eventIdsV1, ...actionIdsV1, ...ingredientIdsV1, ...recipeIdsV1]).size).toBe(
      eventIdsV1.length + actionIdsV1.length + ingredientIdsV1.length + recipeIdsV1.length,
    );
  });
});
```

- [ ] **Step 2: Run and verify the identity files are absent**

Run: `pnpm exec vitest run stories/demo/src/test/story-validation.test.ts`

Expected: FAIL with missing `identity.js`/`ids.js`.

- [ ] **Step 3: Activate only the package test script**

```jsonc
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
    "test": "vitest run",
  },
  "dependencies": {
    "@project-tavern/base": "workspace:*",
    "@project-tavern/modules": "workspace:*",
    "@project-tavern/ui": "workspace:*",
    "@project-tavern/assets": "workspace:*",
  },
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
  parseCheckpointId,
  parseCharacterId,
  parseCheckBandId,
  parseCheckId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseFactId,
  parseIngredientId,
  parseModifierSourceId,
  parseNodeId,
  parseOutcomeId,
  parsePolicyId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseStoryToken,
  parseTextId,
  parseWorldStepId,
} from "@project-tavern/modules";

export const eventIdsV1 = [
  parseEventId("event.tutorial_first_service"),
  parseEventId("event.supplier_invoice"),
  parseEventId("event.helper_available"),
  parseEventId("event.facility_window"),
  parseEventId("event.levy_due"),
] as const;

export const actionIdsV1 = [
  parseActionId("action.choose_life_policy"),
  parseActionId("action.purchase"),
  parseActionId("action.prepare_food"),
  parseActionId("action.rest"),
  parseActionId("action.service_plan"),
  parseActionId("action.advance_phase"),
  parseActionId("action.pay_levy"),
  parseActionId("action.facility_window"),
  parseActionId("action.repair_sign_with_heroine"),
  parseActionId("action.old_trade_road"),
  parseActionId("action.apologize_to_heroine"),
] as const;

export const ingredientIdsV1 = [
  parseIngredientId("ingredient.coarse_grain"),
  parseIngredientId("ingredient.root_vegetable"),
  parseIngredientId("ingredient.ale"),
  parseIngredientId("ingredient.fresh_meat"),
  parseIngredientId("ingredient.herb"),
] as const;

export const recipeIdsV1 = [
  parseRecipeId("recipe.grain_root_porridge"),
  parseRecipeId("recipe.ale_bread"),
  parseRecipeId("recipe.hunter_stew"),
  parseRecipeId("recipe.traveler_roast"),
] as const;

export const demoIdsV1 = Object.freeze({
  actionChooseLifePolicy: actionIdsV1[0],
  actionPurchase: actionIdsV1[1],
  actionPrepareFood: actionIdsV1[2],
  actionRest: actionIdsV1[3],
  actionServicePlan: actionIdsV1[4],
  actionAdvancePhase: actionIdsV1[5],
  actionPayLevy: actionIdsV1[6],
  actionFacilityWindow: actionIdsV1[7],
  actorPlayer: parseActorId("actor.player"),
  actorHeroine: parseActorId("actor.heroine"),
  attributeIntellect: parseAttributeId("intellect"),
  actionRepairSign: actionIdsV1[8],
  actionOldTradeRoad: actionIdsV1[9],
  actionApologize: actionIdsV1[10],
  auraSignRepaired: parseAuraId("tavern.sign_repaired"),
  auraHeroineAngry: parseAuraId("heroine.angry"),
  auraAdventureStrain: parseAuraId("player.adventure_strain"),
  characterNarrator: parseCharacterId("character.narrator"),
  characterPlayer: parseCharacterId("character.player"),
  characterHeroine: parseCharacterId("character.heroine"),
  checkOldTradeRoad: parseCheckId("check.old_trade_road"),
  checkpointTutorialFirstService: parseCheckpointId("checkpoint.tutorial_first_service"),
  checkpointSupplierInvoice: parseCheckpointId("checkpoint.supplier_invoice"),
  checkpointHelperAvailable: parseCheckpointId("checkpoint.helper_available"),
  checkpointFacilityWindow: parseCheckpointId("checkpoint.facility_window"),
  checkpointLevyDue: parseCheckpointId("checkpoint.levy_due"),
  choiceSupplierInvoiceIntellectB: parseChoiceId("choice.supplier_invoice.intellect_b"),
  choiceSupplierInvoicePayNormally: parseChoiceId("choice.supplier_invoice.pay_normally"),
  choiceOldTradeRoadBasic: parseChoiceId("choice.old_trade_road.basic"),
  choiceOldTradeRoadPrepared: parseChoiceId("choice.old_trade_road.prepared"),
  endingStable: parseEndingId("ending.stable"),
  endingDanger: parseEndingId("ending.danger"),
  endingFailedArrears: parseEndingId("ending.failed_arrears"),
  eventTutorialFirstService: eventIdsV1[0],
  eventSupplierInvoice: eventIdsV1[1],
  eventHelperAvailable: eventIdsV1[2],
  eventFacilityWindow: eventIdsV1[3],
  eventLevyDue: eventIdsV1[4],
  facilityColdStorage: parseFacilityId("facility.cold_storage"),
  facilityComfortableBed: parseFacilityId("facility.comfortable_bed"),
  outcomeRelationship: parseOutcomeId("outcome.relationship_opportunity"),
  outcomeInvestigation: parseOutcomeId("outcome.investigation"),
  factWarClue: parseFactId("fact.war_clue"),
  factTutorialFirstServiceCompleted: parseFactId("fact.tutorial_first_service_completed"),
  factInvoiceCheckedThisWeek: parseFactId("fact.invoice_checked_this_week"),
  ingredientCoarseGrain: ingredientIdsV1[0],
  ingredientRootVegetable: ingredientIdsV1[1],
  ingredientAle: ingredientIdsV1[2],
  ingredientFreshMeat: ingredientIdsV1[3],
  ingredientHerb: ingredientIdsV1[4],
  modifierSourceReputation: parseModifierSourceId("modifier_source.reputation"),
  modifierSourceWarClue: parseModifierSourceId("modifier_source.war_clue"),
  policyBalanced: parsePolicyId("policy.balanced"),
  policyNightOwl: parsePolicyId("policy.night_owl"),
  recipeGrainRootPorridge: recipeIdsV1[0],
  recipeAleBread: recipeIdsV1[1],
  recipeHunterStew: recipeIdsV1[2],
  recipeTravelerRoast: recipeIdsV1[3],
  reasonActionPurchase: parseReasonId("reason.action.purchase"),
  reasonActionPrepareFood: parseReasonId("reason.action.prepare_food"),
  reasonActionRest: parseReasonId("reason.action.rest"),
  reasonActionFacilityBuild: parseReasonId("reason.action.facility_build"),
  reasonActionFacilitySkip: parseReasonId("reason.action.facility_skip"),
  reasonBalancedNightRecovery: parseReasonId("reason.recovery.balanced_night"),
  reasonNightOwlNightRecovery: parseReasonId("reason.recovery.night_owl_night"),
  reasonHeroineNightRecovery: parseReasonId("reason.recovery.heroine_night"),
  reasonServiceManual: parseReasonId("reason.service.manual"),
  reasonServiceAssisted: parseReasonId("reason.service.assisted"),
  reasonServiceDelegated: parseReasonId("reason.service.delegated"),
  reasonServiceClosed: parseReasonId("reason.service.closed"),
  reasonServiceEmergencyClosed: parseReasonId("reason.service.emergency_closed"),
  reasonEventTutorialCompleted: parseReasonId("reason.event.tutorial_completed"),
  reasonEventInvoiceChecked: parseReasonId("reason.event.invoice_checked"),
  reasonEventHelperUnlocked: parseReasonId("reason.event.helper_unlocked"),
  reasonModifierColdStorageShelfLife: parseReasonId("reason.modifier.cold_storage_shelf_life"),
  reasonModifierComfortableBedPlayerRecovery: parseReasonId(
    "reason.modifier.comfortable_bed_player_recovery",
  ),
  reasonModifierComfortableBedHeroineRecovery: parseReasonId(
    "reason.modifier.comfortable_bed_heroine_recovery",
  ),
  reasonUnavailableServiceModeLocked: parseReasonId("reason.unavailable.service_mode_locked"),
  reasonUnavailableHelperLocked: parseReasonId("reason.unavailable.helper_locked"),
  reasonRelationshipRepair: parseReasonId("reason.relationship.repair_sign"),
  reasonRelationshipDeclined: parseReasonId("reason.relationship.repair_sign_declined"),
  reasonRelationshipConflict: parseReasonId("reason.relationship.repair_sign_conflict"),
  reasonRelationshipApology: parseReasonId("reason.relationship.apology"),
  reasonAuraSignRepaired: parseReasonId("reason.aura.sign_repaired"),
  reasonAuraHeroineAngry: parseReasonId("reason.aura.heroine_angry"),
  reasonAuraAdventureStrain: parseReasonId("reason.aura.adventure_strain"),
  reasonEndingStable: parseReasonId("reason.ending.stable"),
  reasonEndingDanger: parseReasonId("reason.ending.danger"),
  reasonEndingArrears: parseReasonId("reason.ending.arrears"),
  reasonEndingReputationCrisis: parseReasonId("reason.ending.reputation_crisis"),
  reasonInvestigationBegin: parseReasonId("reason.investigation.begin"),
  reasonInvestigationSetback: parseReasonId("reason.investigation.setback"),
  reasonInvestigationSuccessWithCost: parseReasonId("reason.investigation.success_with_cost"),
  reasonInvestigationComplete: parseReasonId("reason.investigation.complete"),
  reasonInvestigationExceptional: parseReasonId("reason.investigation.exceptional"),
  sceneOldTradeRoadDeparture: parseSceneId("scene.old_trade_road.departure"),
  sceneOldTradeRoadInvestigation: parseSceneId("scene.old_trade_road.investigation"),
  sceneSupplierInvoice: parseSceneId("scene.supplier_invoice"),
  sceneFacilityWindow: parseSceneId("scene.facility_window"),
  sceneLevyDue: parseSceneId("scene.levy_due"),
  segmentLocals: parseCustomerSegmentId("segment.locals"),
  segmentTravelers: parseCustomerSegmentId("segment.travelers"),
  stepOldTradeRoadDeparture: parseWorldStepId("step.old_trade_road.departure"),
  stepOldTradeRoadInvestigation: parseWorldStepId("step.old_trade_road.investigation"),
  textIngredientCoarseGrain: parseTextId("text.ingredient_coarse_grain"),
  textIngredientRootVegetable: parseTextId("text.ingredient_root_vegetable"),
  textIngredientAle: parseTextId("text.ingredient_ale"),
  textIngredientFreshMeat: parseTextId("text.ingredient_fresh_meat"),
  textIngredientHerb: parseTextId("text.ingredient_herb"),
  textRecipeGrainRootPorridge: parseTextId("text.recipe_grain_root_porridge"),
  textRecipeAleBread: parseTextId("text.recipe_ale_bread"),
  textRecipeHunterStew: parseTextId("text.recipe_hunter_stew"),
  textRecipeTravelerRoast: parseTextId("text.recipe_traveler_roast"),
  textPolicyBalanced: parseTextId("text.policy_balanced"),
  textPolicyNightOwl: parseTextId("text.policy_night_owl"),
  textActionChooseLifePolicy: parseTextId("text.action_choose_life_policy"),
  textActionPurchase: parseTextId("text.action_purchase"),
  textActionPrepareFood: parseTextId("text.action_prepare_food"),
  textActionRest: parseTextId("text.action_rest"),
  textActionServicePlan: parseTextId("text.action_service_plan"),
  textActionAdvancePhase: parseTextId("text.action_advance_phase"),
  textActionPayLevy: parseTextId("text.action_pay_levy"),
  textActionFacilityWindow: parseTextId("text.action_facility_window"),
  textFacilityColdStorage: parseTextId("text.facility_cold_storage"),
  textFacilityComfortableBed: parseTextId("text.facility_comfortable_bed"),
  textAuraHeroineAngry: parseTextId("text.aura_heroine_angry"),
  textAuraSignRepaired: parseTextId("text.aura_sign_repaired"),
  textAuraAdventureStrain: parseTextId("text.aura_adventure_strain"),
  textActionOldTradeRoad: parseTextId("text.action_old_trade_road"),
  textChoiceOldTradeRoadBasic: parseTextId("text.choice_old_trade_road_basic"),
  textChoiceOldTradeRoadPrepared: parseTextId("text.choice_old_trade_road_prepared"),
  tokenRelationshipPending: parseStoryToken("relationship.pending"),
  tokenRelationshipCompleted: parseStoryToken("relationship.completed"),
  tokenRelationshipAbandoned: parseStoryToken("relationship.abandoned"),
  tokenRelationshipReconciled: parseStoryToken("relationship.reconciled"),
  tokenRelationshipUnresolved: parseStoryToken("relationship.unresolved_conflict"),
  tokenInvestigationNotAttempted: parseStoryToken("investigation.not_attempted"),
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

- Consumes: Demo Module contracts, Task 1 `demoIdsV1`, exact exported parsers, and the numeric tables in `balance-v0.md`.
- Produces: closed Fact/Outcome definitions, initial actors/resources, five ingredients, four recipes, policies, action costs, service modes, demand, levy/forecast policy, and numeric limits.

- [ ] **Step 1: Write the failing exact-value test**

```ts
// stories/demo/src/test/balance-contract.test.ts
import { describe, expect, it } from "vitest";
import { demoInitialStateV1 } from "../simulation/initial-state.js";
import { demoBalanceV1 } from "../simulation/balance.js";
import { demoValuesV1 } from "../simulation/balance.js";
import { demoIdsV1 } from "../simulation/content/ids.js";
import { ingredientsV1, recipesV1 } from "../simulation/content/ingredients-recipes.js";

describe("Demo balance v0 contract", () => {
  it("freezes initial resources and limits", () => {
    expect(demoInitialStateV1).toMatchObject({
      cash: demoValuesV1.moneySeventy,
      reputation: demoValuesV1.nonNegativeFifty,
      player: {
        stamina: { current: demoValuesV1.nonNegativeTen, maximum: demoValuesV1.positiveTen },
        mood: demoValuesV1.moodZero,
        attributes: { body: "C", social: "C", intellect: "B" },
      },
      heroine: {
        stamina: { current: demoValuesV1.nonNegativeTen, maximum: demoValuesV1.positiveTen },
        mood: demoValuesV1.moodZero,
      },
      relationship: {
        affection: demoValuesV1.safeZero,
        teamwork: demoValuesV1.nonNegativeZero,
        stage: "cold",
      },
    });
    expect(demoBalanceV1).toMatchObject({
      purchaseLineLimit: demoValuesV1.positiveFive,
      menuRecipeLimit: demoValuesV1.positiveTwo,
      dailyPreparationLimit: demoValuesV1.positiveTwo,
      openingFee: demoValuesV1.moneyTwo,
      levyAmount: demoValuesV1.moneyOneHundredForty,
      maxNarrativeStepsPerCommand: demoValuesV1.positiveOneHundredTwentyEight,
      maxNarrativeCallDepth: demoValuesV1.positiveEight,
    });
  });

  it("freezes five ingredients and four recipes", () => {
    expect(
      ingredientsV1.map(({ ingredientId, unitPrice, shelfLifeDays }) => ({
        ingredientId,
        unitPrice,
        shelfLifeDays,
      })),
    ).toEqual([
      {
        ingredientId: demoIdsV1.ingredientCoarseGrain,
        unitPrice: demoValuesV1.moneyOne,
        shelfLifeDays: demoValuesV1.positiveSeven,
      },
      {
        ingredientId: demoIdsV1.ingredientRootVegetable,
        unitPrice: demoValuesV1.moneyOne,
        shelfLifeDays: demoValuesV1.positiveThree,
      },
      {
        ingredientId: demoIdsV1.ingredientAle,
        unitPrice: demoValuesV1.moneyTwo,
        shelfLifeDays: demoValuesV1.positiveSeven,
      },
      {
        ingredientId: demoIdsV1.ingredientFreshMeat,
        unitPrice: demoValuesV1.moneyThree,
        shelfLifeDays: demoValuesV1.positiveTwo,
      },
      {
        ingredientId: demoIdsV1.ingredientHerb,
        unitPrice: demoValuesV1.moneyTwo,
        shelfLifeDays: demoValuesV1.positiveThree,
      },
    ]);
    expect(
      recipesV1.map(({ recipeId, salePrice, prepPoints }) => ({ recipeId, salePrice, prepPoints })),
    ).toEqual([
      {
        recipeId: demoIdsV1.recipeGrainRootPorridge,
        salePrice: demoValuesV1.moneyFive,
        prepPoints: demoValuesV1.positiveOne,
      },
      {
        recipeId: demoIdsV1.recipeAleBread,
        salePrice: demoValuesV1.moneySix,
        prepPoints: demoValuesV1.positiveOne,
      },
      {
        recipeId: demoIdsV1.recipeHunterStew,
        salePrice: demoValuesV1.moneyTwelve,
        prepPoints: demoValuesV1.positiveTwo,
      },
      {
        recipeId: demoIdsV1.recipeTravelerRoast,
        salePrice: demoValuesV1.moneyThirteen,
        prepPoints: demoValuesV1.positiveTwo,
      },
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
import type { StoryStateDefinitionsV1 } from "@project-tavern/modules";
import { demoIdsV1 } from "./content/ids.js";

export const demoStateDefinitionsV1: StoryStateDefinitionsV1 = Object.freeze({
  facts: [
    { factId: demoIdsV1.factWarClue, value: { kind: "boolean", defaultValue: false } },
    {
      factId: demoIdsV1.factTutorialFirstServiceCompleted,
      value: { kind: "boolean", defaultValue: false },
    },
    {
      factId: demoIdsV1.factInvoiceCheckedThisWeek,
      value: { kind: "boolean", defaultValue: false },
    },
  ],
  quests: [],
  outcomes: [
    {
      outcomeId: demoIdsV1.outcomeRelationship,
      value: {
        kind: "token",
        defaultValue: demoIdsV1.tokenRelationshipPending,
        allowedValues: [
          demoIdsV1.tokenRelationshipPending,
          demoIdsV1.tokenRelationshipCompleted,
          demoIdsV1.tokenRelationshipAbandoned,
          demoIdsV1.tokenRelationshipReconciled,
          demoIdsV1.tokenRelationshipUnresolved,
        ],
      },
    },
    {
      outcomeId: demoIdsV1.outcomeInvestigation,
      value: {
        kind: "token",
        defaultValue: demoIdsV1.tokenInvestigationNotAttempted,
        allowedValues: [
          demoIdsV1.tokenInvestigationNotAttempted,
          demoIdsV1.tokenInvestigationMissed,
          demoIdsV1.tokenInvestigationSetback,
          demoIdsV1.tokenInvestigationSuccessWithCost,
          demoIdsV1.tokenInvestigationComplete,
          demoIdsV1.tokenInvestigationExceptional,
        ],
      },
    },
  ],
});
```

`initial-state.ts` likewise builds `StoryInitialStateV1` only from `demoIdsV1` and `demoValuesV1`: actor IDs, four unlocked Recipe IDs, cash, reputation, stamina maxima/currents, mood, affection, and teamwork are already branded. Only closed enum/ABI literals such as attribute ranks, relationship stage, helper tier, and empty arrays remain raw.

- [ ] **Step 4: Encode exact ingredients and recipes**

```ts
// stories/demo/src/simulation/content/ingredients-recipes.ts
import type { PositiveSafeInteger } from "@project-tavern/base";
import type {
  CustomerSegmentId,
  IngredientDefinitionV1,
  IngredientId,
  Money,
  Quantity,
  RecipeDefinitionV1,
  RecipeId,
  RecipeIngredientV1,
  SegmentPreferenceV1,
  TextId,
} from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "./ids.js";

const ingredient = (
  ingredientId: IngredientId,
  nameTextId: TextId,
  unitPrice: Money,
  shelfLifeDays: PositiveSafeInteger,
  refrigeratable: boolean,
): IngredientDefinitionV1 =>
  Object.freeze({ ingredientId, nameTextId, unitPrice, shelfLifeDays, refrigeratable });

const recipeIngredient = (ingredientId: IngredientId, quantity: Quantity): RecipeIngredientV1 => ({
  ingredientId,
  quantity,
});
const preference = (segmentId: CustomerSegmentId, value: 0 | 1 | 2 | 3): SegmentPreferenceV1 => ({
  segmentId,
  value,
});
const recipe = (
  recipeId: RecipeId,
  nameTextId: TextId,
  ingredients: readonly RecipeIngredientV1[],
  salePrice: Money,
  prepPoints: PositiveSafeInteger,
  preferences: readonly SegmentPreferenceV1[],
): RecipeDefinitionV1 =>
  Object.freeze({ recipeId, nameTextId, ingredients, salePrice, prepPoints, preferences });

export const ingredientsV1: readonly IngredientDefinitionV1[] = Object.freeze([
  ingredient(
    demoIdsV1.ingredientCoarseGrain,
    demoIdsV1.textIngredientCoarseGrain,
    demoValuesV1.moneyOne,
    demoValuesV1.positiveSeven,
    false,
  ),
  ingredient(
    demoIdsV1.ingredientRootVegetable,
    demoIdsV1.textIngredientRootVegetable,
    demoValuesV1.moneyOne,
    demoValuesV1.positiveThree,
    true,
  ),
  ingredient(
    demoIdsV1.ingredientAle,
    demoIdsV1.textIngredientAle,
    demoValuesV1.moneyTwo,
    demoValuesV1.positiveSeven,
    false,
  ),
  ingredient(
    demoIdsV1.ingredientFreshMeat,
    demoIdsV1.textIngredientFreshMeat,
    demoValuesV1.moneyThree,
    demoValuesV1.positiveTwo,
    true,
  ),
  ingredient(
    demoIdsV1.ingredientHerb,
    demoIdsV1.textIngredientHerb,
    demoValuesV1.moneyTwo,
    demoValuesV1.positiveThree,
    true,
  ),
]);

export const recipesV1: readonly RecipeDefinitionV1[] = Object.freeze([
  recipe(
    demoIdsV1.recipeGrainRootPorridge,
    demoIdsV1.textRecipeGrainRootPorridge,
    [
      recipeIngredient(demoIdsV1.ingredientCoarseGrain, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientRootVegetable, demoValuesV1.quantityOne),
    ],
    demoValuesV1.moneyFive,
    demoValuesV1.positiveOne,
    [preference(demoIdsV1.segmentLocals, 3), preference(demoIdsV1.segmentTravelers, 1)],
  ),
  recipe(
    demoIdsV1.recipeAleBread,
    demoIdsV1.textRecipeAleBread,
    [
      recipeIngredient(demoIdsV1.ingredientCoarseGrain, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientAle, demoValuesV1.quantityOne),
    ],
    demoValuesV1.moneySix,
    demoValuesV1.positiveOne,
    [preference(demoIdsV1.segmentLocals, 2), preference(demoIdsV1.segmentTravelers, 3)],
  ),
  recipe(
    demoIdsV1.recipeHunterStew,
    demoIdsV1.textRecipeHunterStew,
    [
      recipeIngredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientRootVegetable, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityOne),
    ],
    demoValuesV1.moneyTwelve,
    demoValuesV1.positiveTwo,
    [preference(demoIdsV1.segmentLocals, 3), preference(demoIdsV1.segmentTravelers, 2)],
  ),
  recipe(
    demoIdsV1.recipeTravelerRoast,
    demoIdsV1.textRecipeTravelerRoast,
    [
      recipeIngredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientAle, demoValuesV1.quantityOne),
      recipeIngredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityOne),
    ],
    demoValuesV1.moneyThirteen,
    demoValuesV1.positiveTwo,
    [preference(demoIdsV1.segmentLocals, 1), preference(demoIdsV1.segmentTravelers, 3)],
  ),
]);
```

- [ ] **Step 5: Encode policies, costs, service modes, demand, and levy**

`balance.ts` first exports the one parsed numeric registry used by every Task 2–6 DTO and helper:

```ts
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@project-tavern/base";
import {
  parseDayIndex,
  parseMoney,
  parseMoodPoint,
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
  safeFour: parseSafeInteger(4),
  safeFive: parseSafeInteger(5),
  safeSix: parseSafeInteger(6),
  safeEight: parseSafeInteger(8),
  safeNine: parseSafeInteger(9),
  safeEleven: parseSafeInteger(11),
  safeTwelve: parseSafeInteger(12),
  safeThreeHundred: parseSafeInteger(300),
  safeFourHundred: parseSafeInteger(400),
  day1: parseDayIndex(1),
  day2: parseDayIndex(2),
  day3: parseDayIndex(3),
  day4: parseDayIndex(4),
  day5: parseDayIndex(5),
  day6: parseDayIndex(6),
  day7: parseDayIndex(7),
  nonNegativeZero: parseNonNegativeSafeInteger(0),
  nonNegativeOne: parseNonNegativeSafeInteger(1),
  nonNegativeTwo: parseNonNegativeSafeInteger(2),
  nonNegativeThree: parseNonNegativeSafeInteger(3),
  nonNegativeFour: parseNonNegativeSafeInteger(4),
  nonNegativeFive: parseNonNegativeSafeInteger(5),
  nonNegativeSix: parseNonNegativeSafeInteger(6),
  nonNegativeSeven: parseNonNegativeSafeInteger(7),
  nonNegativeEight: parseNonNegativeSafeInteger(8),
  nonNegativeTen: parseNonNegativeSafeInteger(10),
  nonNegativeFortyFive: parseNonNegativeSafeInteger(45),
  nonNegativeFortyNine: parseNonNegativeSafeInteger(49),
  nonNegativeFifty: parseNonNegativeSafeInteger(50),
  positiveOne: parsePositiveSafeInteger(1),
  positiveTwo: parsePositiveSafeInteger(2),
  positiveThree: parsePositiveSafeInteger(3),
  positiveFive: parsePositiveSafeInteger(5),
  positiveSix: parsePositiveSafeInteger(6),
  positiveSeven: parsePositiveSafeInteger(7),
  positiveEight: parsePositiveSafeInteger(8),
  positiveTen: parsePositiveSafeInteger(10),
  positiveOneHundredTwentyEight: parsePositiveSafeInteger(128),
  moodZero: parseMoodPoint(0),
  moneyZero: parseMoney(0),
  moneyOne: parseMoney(1),
  moneyTwo: parseMoney(2),
  moneyThree: parseMoney(3),
  moneyFour: parseMoney(4),
  moneyFive: parseMoney(5),
  moneySix: parseMoney(6),
  moneySeven: parseMoney(7),
  moneyTwelve: parseMoney(12),
  moneyThirteen: parseMoney(13),
  moneyTwenty: parseMoney(20),
  moneySeventy: parseMoney(70),
  moneyOneHundredForty: parseMoney(140),
  quantityOne: parseQuantity(1),
  quantityTwo: parseQuantity(2),
  quantityThree: parseQuantity(3),
  quantityFour: parseQuantity(4),
});
```

`parseNonNegativeSafeInteger`/`parsePositiveSafeInteger` come from Base; the game-specific `parseDayIndex`, `parseMoodPoint`, `parseSafeInteger`, `parseMoney`, and `parseQuantity` come from `@project-tavern/modules`. No later example casts an arithmetic result or numeric literal to a branded value.

`demoBalanceV1` then uses `demoIdsV1` and `demoValuesV1` exclusively for branded fields. Its two central tables are constructed through exact public-contract signatures:

```ts
import type { NonNegativeSafeInteger } from "@project-tavern/base";
import type {
  AvailabilityGateV1,
  ConfirmationMetadataV1,
  LifePolicyDefinitionV1,
  Money,
  ReasonId,
  ServiceMode,
  ServiceModeDefinitionV1,
} from "@project-tavern/modules";
import { demoIdsV1 } from "./content/ids.js";

const lifePolicies = [
  {
    policyId: demoIdsV1.policyBalanced,
    nameTextId: demoIdsV1.textPolicyBalanced,
    apByPhase: {
      morning: demoValuesV1.nonNegativeTwo,
      afternoon: demoValuesV1.nonNegativeTwo,
      evening: demoValuesV1.nonNegativeTwo,
    },
    playerNightRecovery: demoValuesV1.nonNegativeThree,
    nightRecoveryReasonId: demoIdsV1.reasonBalancedNightRecovery,
  },
  {
    policyId: demoIdsV1.policyNightOwl,
    nameTextId: demoIdsV1.textPolicyNightOwl,
    apByPhase: {
      morning: demoValuesV1.nonNegativeOne,
      afternoon: demoValuesV1.nonNegativeTwo,
      evening: demoValuesV1.nonNegativeThree,
    },
    playerNightRecovery: demoValuesV1.nonNegativeTwo,
    nightRecoveryReasonId: demoIdsV1.reasonNightOwlNightRecovery,
  },
] as const satisfies readonly [LifePolicyDefinitionV1, ...LifePolicyDefinitionV1[]];

const emptyServiceConfirmationV1: ConfirmationMetadataV1 = Object.freeze({
  benefitTextIds: [],
  mutuallyExcludedActionIds: [],
  majorRiskTextIds: [],
});
const serviceAvailabilityByModeV1 = Object.freeze({
  manual: [],
  assisted: [
    {
      conditions: [{ kind: "calendar.day_at_least", day: demoValuesV1.day2 }],
      reasonId: demoIdsV1.reasonUnavailableServiceModeLocked,
    },
    {
      conditions: [{ kind: "tavern.helper_tier_at_least", tier: "apprentice" }],
      reasonId: demoIdsV1.reasonUnavailableHelperLocked,
    },
  ],
  delegated: [
    {
      conditions: [{ kind: "calendar.day_at_least", day: demoValuesV1.day3 }],
      reasonId: demoIdsV1.reasonUnavailableServiceModeLocked,
    },
  ],
  closed: [
    {
      conditions: [{ kind: "calendar.day_at_least", day: demoValuesV1.day3 }],
      reasonId: demoIdsV1.reasonUnavailableServiceModeLocked,
    },
  ],
} as const satisfies Record<ServiceMode, readonly AvailabilityGateV1[]>);
const serviceConfirmationByModeV1 = Object.freeze({
  manual: emptyServiceConfirmationV1,
  assisted: emptyServiceConfirmationV1,
  delegated: emptyServiceConfirmationV1,
  closed: emptyServiceConfirmationV1,
} as const satisfies Record<ServiceMode, ConfirmationMetadataV1>);

const serviceMode = (
  mode: ServiceMode,
  reasonId: ReasonId,
  apCost: NonNegativeSafeInteger,
  playerStaminaCost: NonNegativeSafeInteger,
  heroineStaminaCost: NonNegativeSafeInteger,
  wage: Money,
  baseReceptionCapacity: NonNegativeSafeInteger,
  basePreparationPoints: NonNegativeSafeInteger,
  teamworkGain: NonNegativeSafeInteger,
  preparationPointsPerAction: NonNegativeSafeInteger,
): ServiceModeDefinitionV1 =>
  Object.freeze({
    mode,
    availability: serviceAvailabilityByModeV1[mode],
    confirmation: serviceConfirmationByModeV1[mode],
    reasonId,
    apCost,
    playerStaminaCost,
    heroineStaminaCost,
    wage,
    baseReceptionCapacity,
    basePreparationPoints,
    teamworkGain,
    preparationPointsPerAction,
  });

const serviceModes = [
  serviceMode(
    "manual",
    demoIdsV1.reasonServiceManual,
    demoValuesV1.nonNegativeTwo,
    demoValuesV1.nonNegativeThree,
    demoValuesV1.nonNegativeThree,
    demoValuesV1.moneyZero,
    demoValuesV1.nonNegativeTen,
    demoValuesV1.nonNegativeSix,
    demoValuesV1.nonNegativeTwo,
    demoValuesV1.nonNegativeFour,
  ),
  serviceMode(
    "assisted",
    demoIdsV1.reasonServiceAssisted,
    demoValuesV1.nonNegativeOne,
    demoValuesV1.nonNegativeOne,
    demoValuesV1.nonNegativeTwo,
    demoValuesV1.moneyFive,
    demoValuesV1.nonNegativeEight,
    demoValuesV1.nonNegativeSix,
    demoValuesV1.nonNegativeOne,
    demoValuesV1.nonNegativeFour,
  ),
  serviceMode(
    "delegated",
    demoIdsV1.reasonServiceDelegated,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.moneySeven,
    demoValuesV1.nonNegativeSeven,
    demoValuesV1.nonNegativeSeven,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeTwo,
  ),
  serviceMode(
    "closed",
    demoIdsV1.reasonServiceClosed,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.moneyZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
    demoValuesV1.nonNegativeZero,
  ),
] as const;
```

Action costs, base demand, ledger reason bindings, closure, recovery, limits, and forecast policy follow the same rule: ID fields come from `demoIdsV1`, numeric fields from `demoValuesV1`, and helper parameters use the exact branded public types. The reference demand matrix remains `[[6,2],[5,3],[7,2],[4,5],[3,7],[6,4]]`, but production `BaseDemandLineV1[]` materializes each row with `demoValuesV1.day1..day6`, `segmentLocals`/`segmentTravelers`, and the matching non-negative customer values. `serviceDays` uses the same branded day constants; forecast visibility is D3 morning, conservative start D5 morning, levy due D7 afternoon.

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
- Create: `stories/demo/LICENSE.md`
- Modify: `stories/demo/package.json`
- Modify: `scripts/workspace-policy.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`

**Interfaces:**

- Consumes: balance/state definitions, Task 1 `demoIdsV1`, Task 2 `demoValuesV1`, Module Action/Condition/Event contracts, Narrative IR, and the repository licensing policy.
- Produces: every common Action presentation, four service mode gates, D2 invoice threshold Scene, D4 facility notification/choice, three exact Aura definitions, five Scheduler Events, and the atomically activated Demo mixed-license package scope required by the first narrative file.

- [ ] **Step 1: Write failing daily gate/Event tests**

```ts
// stories/demo/src/test/daily-gates.test.ts
import { describe, expect, it } from "vitest";
import { actionsV1 } from "../simulation/content/actions.js";
import { eventsV1 } from "../simulation/content/events.js";
import { facilitiesV1, aurasV1 } from "../simulation/content/facilities-auras.js";
import { demoValuesV1 } from "../simulation/balance.js";
import { demoIdsV1 } from "../simulation/content/ids.js";

describe("D1-D4 authored gates", () => {
  it("maps player Actions and workflow controls without aliases", () => {
    expect(actionsV1.map(({ actionId, commandKind }) => [actionId, commandKind])).toEqual([
      [demoIdsV1.actionChooseLifePolicy, "policy.choose"],
      [demoIdsV1.actionPurchase, "inventory.buy"],
      [demoIdsV1.actionPrepareFood, "actor.prepare_food"],
      [demoIdsV1.actionRest, "actor.rest"],
      [demoIdsV1.actionServicePlan, "tavern.plan.set"],
      [demoIdsV1.actionAdvancePhase, "calendar.advance_phase"],
      [demoIdsV1.actionPayLevy, "levy.pay"],
      [demoIdsV1.actionFacilityWindow, "facility.choose"],
      [demoIdsV1.actionRepairSign, "story.action.start"],
      [demoIdsV1.actionOldTradeRoad, "world.action.begin"],
      [demoIdsV1.actionApologize, "story.action.start"],
    ]);
  });

  it("freezes five Scheduler Events and their priorities", () => {
    expect(eventsV1.map(({ eventId, priority, sceneId }) => [eventId, priority, sceneId])).toEqual([
      [demoIdsV1.eventTutorialFirstService, demoValuesV1.safeFourHundred, null],
      [
        demoIdsV1.eventSupplierInvoice,
        demoValuesV1.safeFourHundred,
        demoIdsV1.sceneSupplierInvoice,
      ],
      [demoIdsV1.eventHelperAvailable, demoValuesV1.safeThreeHundred, null],
      [demoIdsV1.eventFacilityWindow, demoValuesV1.safeThreeHundred, demoIdsV1.sceneFacilityWindow],
      [demoIdsV1.eventLevyDue, demoValuesV1.safeFourHundred, demoIdsV1.sceneLevyDue],
    ]);
  });

  it("freezes two facilities and three narrow Auras", () => {
    expect(facilitiesV1.map((entry) => [entry.facilityId, entry.cashCost])).toEqual([
      [demoIdsV1.facilityColdStorage, demoValuesV1.moneyTwelve],
      [demoIdsV1.facilityComfortableBed, demoValuesV1.moneyTwelve],
    ]);
    expect(aurasV1.map((entry) => [entry.auraId, entry.durationPolicy])).toEqual([
      [
        demoIdsV1.auraHeroineAngry,
        {
          kind: "countdown",
          unit: "day_end",
          defaultRemaining: demoValuesV1.positiveTwo,
          maximumRemaining: demoValuesV1.positiveTwo,
        },
      ],
      [
        demoIdsV1.auraSignRepaired,
        {
          kind: "countdown",
          unit: "opening",
          defaultRemaining: demoValuesV1.positiveOne,
          maximumRemaining: demoValuesV1.positiveOne,
        },
      ],
      [
        demoIdsV1.auraAdventureStrain,
        {
          kind: "countdown",
          unit: "night_recovery",
          defaultRemaining: demoValuesV1.positiveOne,
          maximumRemaining: demoValuesV1.positiveOne,
        },
      ],
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
import type {
  ActionId,
  ActionOccupationDefinitionV1,
  ActionPresentationDefinitionV1,
  AvailabilityGateV1,
  CalendarPhase,
  GameCommandV1,
} from "@project-tavern/modules";
import { demoIdsV1 } from "./ids.js";

const action = (
  actionId: ActionId,
  commandKind: GameCommandV1["kind"],
  availablePhases: readonly CalendarPhase[],
  occupation: ActionOccupationDefinitionV1,
  visibility: readonly AvailabilityGateV1[],
): ActionPresentationDefinitionV1 =>
  buildActionPresentationV1({
    actionId,
    commandKind,
    availablePhases,
    occupation,
    visibility,
  });

export const actionsV1: readonly ActionPresentationDefinitionV1[] = Object.freeze([
  action(
    demoIdsV1.actionChooseLifePolicy,
    "policy.choose",
    ["morning"],
    { kind: "none" },
    policyVisibilityV1,
  ),
  action(
    demoIdsV1.actionPurchase,
    "inventory.buy",
    ["morning", "afternoon"],
    { kind: "current_phase" },
    activeServiceDayVisibilityV1,
  ),
  action(
    demoIdsV1.actionPrepareFood,
    "actor.prepare_food",
    ["morning", "afternoon"],
    { kind: "current_phase" },
    activeServiceDayVisibilityV1,
  ),
  action(
    demoIdsV1.actionRest,
    "actor.rest",
    ["morning", "afternoon", "evening"],
    { kind: "current_phase" },
    activeServiceDayVisibilityV1,
  ),
  action(
    demoIdsV1.actionServicePlan,
    "tavern.plan.set",
    ["morning", "afternoon"],
    { kind: "fixed", phases: ["evening"] },
    activeServiceDayVisibilityV1,
  ),
  action(
    demoIdsV1.actionAdvancePhase,
    "calendar.advance_phase",
    ["morning", "afternoon", "evening"],
    { kind: "none" },
    activeRunVisibilityV1,
  ),
  action(demoIdsV1.actionPayLevy, "levy.pay", ["afternoon"], { kind: "none" }, levyVisibilityV1),
  facilityActionV1,
  repairSignActionV1,
  oldTradeRoadActionV1,
  apologyActionV1,
]);
```

`buildActionPresentationV1` is local to this file and accepts the exact object above. It obtains `labelTextId`, authored availability, and confirmation from closed `ActionId`-keyed maps whose ID fields come only from `demoIdsV1`; it does not parse or concatenate IDs internally. Raw values above are limited to the closed command/phase/occupation ABI literals.

Policy presentation has empty authored availability and exactly `morning/none`. Common operation Actions include the D6 maximum-day gate. Assisted opens D2 plus helper; delegated and closed open D3; manual opens D1.

- [ ] **Step 4: Encode facilities and Aura modifiers**

`facilities-auras.ts` defines `facility(definition: FacilityDefinitionV1): FacilityDefinitionV1` and `aura(definition: AuraDefinitionV1): AuraDefinitionV1`; neither accepts `string` or `number` in place of a branded field. Facility/Aura/Text/Reason/Ingredient IDs come from `demoIdsV1`; cash, duration, and signed modifier amounts come from `demoValuesV1`. Only Modifier/Aura discriminants, targets, visibility, duration units, and ServiceMode enum members remain raw ABI literals.

Cold storage adds `shelf_life.add_days amount=demoValuesV1.safeTwo` to the three branded Ingredient IDs for root vegetable/fresh meat/herb. Comfortable bed adds player recovery `safeTwo` and heroine recovery `safeOne`. Sign repaired adds capacity/prep points `safeOne` for manual/assisted; angry adds capacity `safeMinusOne` for manual/assisted plus teamwork-gain block; adventure strain adds player recovery `safeMinusTwo`. Both Facility costs use `moneyTwelve`; Aura countdown defaults/maxima use `positiveOne`/`positiveTwo`.

- [ ] **Step 5: Encode exact Scheduler Events and D1–D4 scenes**

```ts
// stories/demo/src/simulation/content/events.ts
import type {
  CheckpointId,
  ConditionV1,
  EffectIntentV1,
  EventId,
  EventTriggerV1,
  SafeInteger,
  SceneId,
  StoryEventDefinitionV1,
} from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "./ids.js";

const event = (
  eventId: EventId,
  checkpointId: CheckpointId,
  trigger: EventTriggerV1,
  priority: SafeInteger,
  sceneId: SceneId | null,
  when: readonly ConditionV1[],
  effects: readonly EffectIntentV1[],
): StoryEventDefinitionV1 =>
  Object.freeze({
    eventId,
    checkpointId,
    trigger,
    priority,
    weightedGroupId: null,
    weight: demoValuesV1.nonNegativeZero,
    when,
    sceneId,
    effects,
  });

export const eventsV1: readonly StoryEventDefinitionV1[] = Object.freeze([
  event(
    demoIdsV1.eventTutorialFirstService,
    demoIdsV1.checkpointTutorialFirstService,
    { kind: "command.succeeded", commandKinds: ["tavern.opening.finalize"] },
    demoValuesV1.safeFourHundred,
    null,
    tutorialConditionsV1,
    tutorialEffectsV1,
  ),
  event(
    demoIdsV1.eventSupplierInvoice,
    demoIdsV1.checkpointSupplierInvoice,
    { kind: "phase.entered", days: [demoValuesV1.day2], phases: ["morning"] },
    demoValuesV1.safeFourHundred,
    demoIdsV1.sceneSupplierInvoice,
    invoiceConditionsV1,
    [],
  ),
  event(
    demoIdsV1.eventHelperAvailable,
    demoIdsV1.checkpointHelperAvailable,
    { kind: "day.ended", days: [demoValuesV1.day1] },
    demoValuesV1.safeThreeHundred,
    null,
    [],
    helperEffectsV1,
  ),
  event(
    demoIdsV1.eventFacilityWindow,
    demoIdsV1.checkpointFacilityWindow,
    { kind: "phase.entered", days: [demoValuesV1.day4], phases: ["morning"] },
    demoValuesV1.safeThreeHundred,
    demoIdsV1.sceneFacilityWindow,
    facilityUndecidedConditionsV1,
    [],
  ),
  event(
    demoIdsV1.eventLevyDue,
    demoIdsV1.checkpointLevyDue,
    { kind: "phase.entered", days: [demoValuesV1.day7], phases: ["morning"] },
    demoValuesV1.safeFourHundred,
    demoIdsV1.sceneLevyDue,
    activeRunConditionsV1,
    [],
  ),
]);
```

`d1-d4.ts` constructs every Scene/node/choice/effect through the matching `demoIdsV1` member and `demoValuesV1`; only node/effect discriminants, attribute rank, phase, and boolean ABI literals remain raw. The supplier-invoice Scene has one choice node: the `[智力 B]` branch appends a `moneyFour` story-reward ledger entry and sets `factInvoiceCheckedThisWeek=true`; the normal branch has no effect. It does not roll dice or consume AP. Facility/levy scenes are one narration plus end.

- [ ] **Step 6: Activate Demo mixed licensing with the first narrative file**

Create `stories/demo/LICENSE.md` in this same task. It maps executable Story source/tests/scripts to PolyForm Noncommercial 1.0.0 and maps the now-existing `src/simulation/narrative/**` scope to CC BY-NC-SA 4.0, linking the exact root legal texts. Change `stories/demo/package.json` from `PolyForm-Noncommercial-1.0.0` to `SEE LICENSE IN LICENSE.md` but keep `exports:{}` because the default entry does not exist yet. Atomically update `scripts/workspace-policy.mjs`, `scripts/verify-licensing.mjs`, and the hostile verifier tests to require the package-local scope file, both root licenses, and the narrative mapping. Do not predeclare the later text-catalog scope in this task.

- [ ] **Step 7: Run daily content and atomic licensing tests**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/daily-gates.test.ts && pnpm verify:licensing && pnpm typecheck && pnpm verify`

Expected: PASS; all Action windows/occupations/gate order, mode unlocks, Event triggers/priorities/scenes/effects, facility costs/modifiers, Aura policies/targets, and D2 threshold semantics pass; the same candidate commit already reports Demo as mixed-license with narrative under CC and all other current files under PolyForm.

- [ ] **Step 8: Commit D1–D4 content and its license activation atomically**

```bash
git add stories/demo/src/simulation/content/actions.ts stories/demo/src/simulation/content/facilities-auras.ts stories/demo/src/simulation/content/events.ts stories/demo/src/simulation/narrative/d1-d4.ts stories/demo/src/test/daily-gates.test.ts stories/demo/LICENSE.md stories/demo/package.json scripts/workspace-policy.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
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
  {
    kind: "calendar.ap.adjust",
    delta: demoValuesV1.safeMinusTwo,
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "actor.stamina.adjust",
    actorId: demoIdsV1.actorPlayer,
    delta: demoValuesV1.safeMinusOne,
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "actor.stamina.adjust",
    actorId: demoIdsV1.actorHeroine,
    delta: demoValuesV1.safeMinusOne,
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "relationship.affection.adjust",
    delta: demoValuesV1.safeThree,
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "actor.mood.adjust",
    actorId: demoIdsV1.actorHeroine,
    delta: demoValuesV1.safeOne,
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "aura.apply",
    auraId: demoIdsV1.auraSignRepaired,
    target: { kind: "tavern" },
    source: { kind: "story_action", actionId: demoIdsV1.actionRepairSign },
    duration: { kind: "countdown", unit: "opening", remaining: demoValuesV1.positiveOne },
    reasonId: demoIdsV1.reasonAuraSignRepaired,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeRelationship,
    value: { kind: "token", value: demoIdsV1.tokenRelationshipCompleted },
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeInvestigation,
    value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed },
    reasonId: demoIdsV1.reasonRelationshipRepair,
  },
];

const declineEffectsV1: readonly EffectIntentV1[] = [
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeRelationship,
    value: { kind: "token", value: demoIdsV1.tokenRelationshipAbandoned },
    reasonId: demoIdsV1.reasonRelationshipDeclined,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeInvestigation,
    value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed },
    reasonId: demoIdsV1.reasonRelationshipDeclined,
  },
];

const conflictEffectsV1: readonly EffectIntentV1[] = [
  {
    kind: "relationship.affection.adjust",
    delta: demoValuesV1.safeMinusOne,
    reasonId: demoIdsV1.reasonRelationshipConflict,
  },
  {
    kind: "aura.apply",
    auraId: demoIdsV1.auraHeroineAngry,
    target: { kind: "actor", actorId: demoIdsV1.actorHeroine },
    source: { kind: "story_action", actionId: demoIdsV1.actionRepairSign },
    duration: { kind: "countdown", unit: "day_end", remaining: demoValuesV1.positiveTwo },
    reasonId: demoIdsV1.reasonAuraHeroineAngry,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeRelationship,
    value: { kind: "token", value: demoIdsV1.tokenRelationshipUnresolved },
    reasonId: demoIdsV1.reasonRelationshipConflict,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeInvestigation,
    value: { kind: "token", value: demoIdsV1.tokenInvestigationMissed },
    reasonId: demoIdsV1.reasonRelationshipConflict,
  },
];
```

- [ ] **Step 4: Add exact visibility/availability and apology effects**

Repair is visible D5 afternoon while relationship is pending, then available only while investigation is not attempted. Its confirmation names `action.old_trade_road` as mutually excluded. Apology is visible D6 morning/afternoon only while `heroine.angry` is present.

```ts
const apologyEffectsV1: readonly EffectIntentV1[] = [
  {
    kind: "calendar.ap.adjust",
    delta: demoValuesV1.safeMinusOne,
    reasonId: demoIdsV1.reasonRelationshipApology,
  },
  {
    kind: "aura.clear",
    auraId: demoIdsV1.auraHeroineAngry,
    target: { kind: "actor", actorId: demoIdsV1.actorHeroine },
    reasonId: demoIdsV1.reasonRelationshipApology,
  },
  {
    kind: "relationship.affection.adjust",
    delta: demoValuesV1.safeOne,
    reasonId: demoIdsV1.reasonRelationshipApology,
  },
  {
    kind: "outcome.set",
    outcomeId: demoIdsV1.outcomeRelationship,
    value: { kind: "token", value: demoIdsV1.tokenRelationshipReconciled },
    reasonId: demoIdsV1.reasonRelationshipApology,
  },
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
  beginEffects: [
    {
      kind: "outcome.set",
      outcomeId: demoIdsV1.outcomeRelationship,
      value: { kind: "token", value: demoIdsV1.tokenRelationshipAbandoned },
      reasonId: demoIdsV1.reasonInvestigationBegin,
    },
  ],
  options: [
    {
      optionId: demoIdsV1.choiceOldTradeRoadBasic,
      labelTextId: demoIdsV1.textChoiceOldTradeRoadBasic,
      availability: [],
      additionalCashCost: demoValuesV1.moneyZero,
      preparationBonus: demoValuesV1.safeZero,
      beginEffects: [],
      confirmation: oldTradeRoadConfirmationV1,
    },
    {
      optionId: demoIdsV1.choiceOldTradeRoadPrepared,
      labelTextId: demoIdsV1.textChoiceOldTradeRoadPrepared,
      availability: [],
      additionalCashCost: demoValuesV1.moneyFour,
      preparationBonus: demoValuesV1.safeOne,
      beginEffects: [],
      confirmation: oldTradeRoadPreparedConfirmationV1,
    },
  ],
  steps: [
    {
      stepId: demoIdsV1.stepOldTradeRoadDeparture,
      phase: "morning",
      apCost: demoValuesV1.nonNegativeOne,
      sceneId: demoIdsV1.sceneOldTradeRoadDeparture,
    },
    {
      stepId: demoIdsV1.stepOldTradeRoadInvestigation,
      phase: "afternoon",
      apCost: demoValuesV1.nonNegativeTwo,
      sceneId: demoIdsV1.sceneOldTradeRoadInvestigation,
    },
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

const grant = (lines: readonly IngredientQuantityV1[], reasonId: ReasonId): EffectIntentV1 => ({
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
      grant(
        [ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityOne)],
        demoIdsV1.reasonInvestigationSetback,
      ),
      applyStrainV1,
      investigationOutcome(
        demoIdsV1.tokenInvestigationSetback,
        demoIdsV1.reasonInvestigationSetback,
      ),
    ]),
    band(demoIdsV1.bandInvestigationSuccessWithCost, demoValuesV1.safeSix, demoValuesV1.safeEight, [
      grant(
        [
          ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityOne),
          ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityTwo),
        ],
        demoIdsV1.reasonInvestigationSuccessWithCost,
      ),
      investigationOutcome(
        demoIdsV1.tokenInvestigationSuccessWithCost,
        demoIdsV1.reasonInvestigationSuccessWithCost,
      ),
    ]),
    band(demoIdsV1.bandInvestigationComplete, demoValuesV1.safeNine, demoValuesV1.safeEleven, [
      grant(
        [
          ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityTwo),
          ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityThree),
        ],
        demoIdsV1.reasonInvestigationComplete,
      ),
      setWarClueV1,
      investigationOutcome(
        demoIdsV1.tokenInvestigationComplete,
        demoIdsV1.reasonInvestigationComplete,
      ),
    ]),
    band(demoIdsV1.bandInvestigationExceptional, demoValuesV1.safeTwelve, null, [
      grant(
        [
          ingredient(demoIdsV1.ingredientFreshMeat, demoValuesV1.quantityThree),
          ingredient(demoIdsV1.ingredientHerb, demoValuesV1.quantityFour),
        ],
        demoIdsV1.reasonInvestigationExceptional,
      ),
      setWarClueV1,
      {
        kind: "reputation.adjust",
        delta: demoValuesV1.safeOne,
        reasonId: demoIdsV1.reasonInvestigationExceptional,
      },
      investigationOutcome(
        demoIdsV1.tokenInvestigationExceptional,
        demoIdsV1.reasonInvestigationExceptional,
      ),
    ]),
  ],
});
```

- [ ] **Step 5: Implement fixed check resolution and D6 demand effect**

```ts
// stories/demo/src/simulation/rules/checks.ts
import type { DeepReadonly } from "@project-tavern/base";
import type {
  AppliedModifierV1,
  CheckId,
  CheckInputV1,
  CheckResultV1,
  ModifierV1,
  RuleRngV1,
} from "@project-tavern/modules";
import { parseDieFace, parseSafeInteger } from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";

function collectCheckModifiersV1(
  modifiers: DeepReadonly<readonly ModifierV1[]>,
  checkId: CheckId,
): readonly AppliedModifierV1[] {
  return modifiers
    .filter((modifier) => modifier.kind === "check.add" && modifier.checkId === checkId)
    .map((modifier) => ({ modifier, contribution: modifier.amount }));
}

export function resolveCheckV1(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1 {
  const dice = [
    parseDieFace(
      rng.nextInt({
        exclusiveMax: demoValuesV1.positiveSix,
        purpose: `check:${input.checkId}:die-1`,
      }) + demoValuesV1.positiveOne,
    ),
    parseDieFace(
      rng.nextInt({
        exclusiveMax: demoValuesV1.positiveSix,
        purpose: `check:${input.checkId}:die-2`,
      }) + demoValuesV1.positiveOne,
    ),
  ] as const;
  const applied = collectCheckModifiersV1(input.modifiers, input.checkId);
  const totalBonus = parseSafeInteger(
    input.attributeBonus +
      input.preparationBonus +
      applied.reduce((sum, modifier) => sum + modifier.contribution, 0),
  );
  const total = parseSafeInteger(dice[0] + dice[1] + totalBonus);
  const band = input.bands.find(
    (candidate) =>
      total >= candidate.minInclusive &&
      (candidate.maxInclusive === null || total <= candidate.maxInclusive),
  )!;
  return {
    checkId: input.checkId,
    actorId: input.actorId,
    dice,
    attributeBonus: input.attributeBonus,
    preparationBonus: input.preparationBonus,
    modifiers: applied,
    totalBonus,
    total,
    bandId: band.bandId,
    effects: band.effects,
  };
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
- Create: `stories/demo/src/testing/rule-fixtures.ts`
- Create: `stories/demo/src/test/ending-forecast.test.ts`
- Modify: `stories/demo/src/simulation/content/checks-endings.ts`

**Interfaces:**

- Consumes: exact Balance/content, pure Story rule contracts, deterministic RNG, Module modifier ordering, OpeningBaseline, ledger drafts, and Ending input.
- Produces: all seven `StoryRulesV1` slots, explained demand/opening results, obligation projections through shared queries, and three persisted ending outcomes.

- [ ] **Step 1: Write failing demand, settlement, and ending vectors**

```ts
// stories/demo/src/test/ending-forecast.test.ts
import { describe, expect, it } from "vitest";
import { demoValuesV1 } from "../simulation/balance.js";
import { demoIdsV1 } from "../simulation/content/ids.js";
import { demandRulesV1, endingRulesV1, tavernRulesV1 } from "../simulation/rules/index.js";
import {
  buildArrearsEndingInputV1,
  buildD1DemandProjectionInputV1,
  buildEndingInputV1,
  buildReferenceD1OpeningInputV1,
  noDrawRuleRngV1,
} from "../testing/rule-fixtures.js";

describe("Demo rules", () => {
  it("materializes the reference D1 demand and keeps actual inside preview", () => {
    const preview = demandRulesV1.preview(buildD1DemandProjectionInputV1());
    expect(preview.lines.map((line) => [line.segmentId, line.range, line.actualCustomers])).toEqual(
      [
        ["segment.locals", { min: 6, max: 6 }, 6],
        ["segment.travelers", { min: 2, max: 2 }, 2],
      ],
    );
  });

  it("uses stable order allocation and balances settlement ledger value", () => {
    const draft = tavernRulesV1.settle(buildReferenceD1OpeningInputV1(), noDrawRuleRngV1());
    expect(draft.orders.map((line) => [line.segmentId, line.recipeId, line.actualSales])).toEqual([
      ["segment.locals", "recipe.grain_root_porridge", 2],
      ["segment.locals", "recipe.hunter_stew", 4],
      ["segment.travelers", "recipe.hunter_stew", 0],
    ]);
    expect(draft.entries.reduce((sum, entry) => sum + entry.valuationDelta, 0)).toBeLessThanOrEqual(
      0,
    );
  });

  it.each([
    [
      buildEndingInputV1({
        cashAfterLevy: demoValuesV1.moneyTwenty,
        reputation: demoValuesV1.nonNegativeFifty,
        facilityIds: [demoIdsV1.facilityComfortableBed],
      }),
      "completed_stable",
      demoIdsV1.endingStable,
    ],
    [
      buildEndingInputV1({
        cashAfterLevy: demoValuesV1.moneyOne,
        reputation: demoValuesV1.nonNegativeFortyNine,
        facilityIds: [],
      }),
      "completed_danger",
      demoIdsV1.endingDanger,
    ],
    [buildArrearsEndingInputV1(), "failed_arrears", demoIdsV1.endingFailedArrears],
  ] as const)("evaluates %s", (input, status, endingId) => {
    expect(endingRulesV1.evaluate(input)).toMatchObject({ status, endingId });
  });
});
```

`rule-fixtures.ts` constructs these five fixtures from `demoIdsV1`/`demoValuesV1` and the exact public rule contracts. It returns fresh deeply immutable values, rejects any unexpected RNG draw in `noDrawRuleRngV1`, and contains no raw branded-ID assertion, Snapshot, Session, or duplicated settlement algorithm.

- [ ] **Step 2: Run and verify missing rule modules**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/ending-forecast.test.ts`

Expected: FAIL with missing rule index.

- [ ] **Step 3: Implement exact demand resolve/preview**

```ts
// stories/demo/src/simulation/rules/demand.ts
import type { DeepReadonly } from "@project-tavern/base";
import type {
  DemandPreviewV1,
  DemandProjectionInputV1,
  DemandRandomOffset,
  DemandSeedInputV1,
  DemandSeedResultV1,
  RuleRngV1,
} from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";

export const demandRulesV1 = Object.freeze({
  resolve(input: DeepReadonly<DemandSeedInputV1>, rng: RuleRngV1): DemandSeedResultV1 {
    return {
      lines: input.segments.map((line) => {
        const draw = rng.nextInt({
          exclusiveMax: demoValuesV1.positiveThree,
          purpose: `demand:${line.day}:${line.segmentId}`,
        });
        const randomOffset: DemandRandomOffset = draw === 0 ? -1 : draw === 1 ? 0 : 1;
        return { day: line.day, segmentId: line.segmentId, randomOffset };
      }),
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
export function coverageReputationDeltaV1(
  actualSales: number,
  potentialCustomers: number,
): -1 | 0 | 1 {
  if (potentialCustomers === 0) return 0;
  const basisPoints = Math.floor((actualSales * 10_000) / potentialCustomers);
  return basisPoints >= 8_000 ? 1 : basisPoints >= 5_000 ? 0 : -1;
}
```

- [ ] **Step 5: Implement stable/danger/arrears endings**

```ts
// stories/demo/src/simulation/rules/endings.ts
import type { DeepReadonly } from "@project-tavern/base";
import type {
  EndingInputV1,
  EndingResultV1,
  OutcomeEntryV1,
  OutcomeId,
} from "@project-tavern/modules";
import { demoValuesV1 } from "../balance.js";
import { demoIdsV1 } from "../content/ids.js";

function requiredOutcomeV1(
  outcomes: DeepReadonly<readonly OutcomeEntryV1[]>,
  outcomeId: OutcomeId,
): OutcomeEntryV1 {
  const outcome = outcomes.find((entry) => entry.outcomeId === outcomeId);
  if (outcome === undefined) throw new Error(`missing required outcome: ${outcomeId}`);
  return outcome;
}

export function evaluateEndingV1(input: DeepReadonly<EndingInputV1>): EndingResultV1 {
  const relationship = requiredOutcomeV1(input.outcomes, demoIdsV1.outcomeRelationship);
  const investigation = requiredOutcomeV1(input.outcomes, demoIdsV1.outcomeInvestigation);
  if (input.levy.kind === "arrears") {
    return {
      endingId: demoIdsV1.endingFailedArrears,
      status: "failed_arrears",
      reasonIds: [demoIdsV1.reasonEndingArrears],
      effects: [],
      summary: { relationship, investigation },
    };
  }
  const stable =
    input.cash >= demoValuesV1.moneyTwenty &&
    input.reputation >= demoValuesV1.nonNegativeFifty &&
    input.facilityIds.length === 1;
  const reasonIds = stable
    ? [demoIdsV1.reasonEndingStable]
    : input.reputation < demoValuesV1.nonNegativeFortyFive
      ? [demoIdsV1.reasonEndingDanger, demoIdsV1.reasonEndingReputationCrisis]
      : [demoIdsV1.reasonEndingDanger];
  return {
    endingId: stable ? demoIdsV1.endingStable : demoIdsV1.endingDanger,
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
git add stories/demo/src/simulation/rules/demand.ts stories/demo/src/simulation/rules/tavern.ts stories/demo/src/simulation/rules/endings.ts stories/demo/src/simulation/rules/index.ts stories/demo/src/testing/rule-fixtures.ts stories/demo/src/test/ending-forecast.test.ts stories/demo/src/simulation/content/checks-endings.ts
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
- Modify: `stories/demo/LICENSE.md`
- Modify: `stories/demo/package.json`
- Modify: `stories/demo/tsconfig.json`
- Modify: `stories/demo/src/test/story-validation.test.ts`
- Modify: `scripts/verify-stories.mjs`
- Modify: `scripts/verify-stories.test.mjs`
- Modify: `scripts/workspace-policy.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`

**Interfaces:**

- Consumes: complete data/rules/Narrative, individual public bindings/Schemas/coordinator/query builders, generic UI/Presentation contracts, and Story/asset validators.
- Produces: Story-owned twelve-binding tuple/coordinator/Profile factory, post-Hotfix Simulation/Presentation materializers, complete default Demo GamePackage, Chinese catalog, fallback-only assets, typed Patch Surfaces, mixed-license scope, and stable Story verification.

- [ ] **Step 1: Extend the failing Story validation test**

```ts
// append to stories/demo/src/test/story-validation.test.ts
import { resolveStoryForTestV1, validateStoryV1 } from "@project-tavern/base/testkit";
import { demoStoryEntryV1 } from "../index.js";
import { demoStateContractRevisionV1 } from "../simulation/identity.js";

it("validates the complete week.poc_001 Story", () => {
  expect(validateStoryV1(demoStoryEntryV1)).toEqual({ ok: true });
  const resolved = resolveStoryForTestV1(demoStoryEntryV1);
  const definition = demoStoryEntryV1.define();
  expect(resolved.profile.modules).toHaveLength(12);
  expect(resolved.provenance.resolved.stateContractRevision).toBe(demoStateContractRevisionV1);
  expect(definition.presentation.assetPacks).toEqual([]);
  expect(
    definition.presentation.assetSlots.every((slot) => slot.fallbackToken.startsWith("fallback.")),
  ).toBe(true);
});
```

- [ ] **Step 2: Run and verify missing Story entry**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts`

Expected: FAIL because the existing placeholder index has no named `demoStoryEntryV1` export or complete Story implementation.

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
export function createDemoGameProfileV1(program: DeepReadonly<DemoSimulationProgramV1>) {
  const coordinator = createDemoCommandCoordinatorV1(program);
  return defineGameProfile<DemoProfileTypesV1>()({
    contractRevision: 1,
    modules: [
      runModuleV1,
      calendarModuleV1,
      actorsModuleV1,
      statusModuleV1,
      inventoryModuleV1,
      facilitiesModuleV1,
      tavernModuleV1,
      workflowModuleV1,
      worldModuleV1,
      progressionModuleV1,
      narrativeModuleV1,
      schedulingModuleV1,
    ] as const,
    stateSchema: gameStateV1Schema,
    commandSchema: gameCommandV1Schema,
    factSchema: domainFactV1Schema,
    rejectionSchema: rejectionReasonV1Schema,
    debugCommandSchema: debugCommandV1Schema,
    coordinator,
    createBootstrapInput: (entropy) =>
      Object.freeze({
        rngSeed: entropy.nextNonZeroUint32(),
        runId: parseRunId(entropy.nextUuidV4()),
      }),
    createInitialState: (bootstrap) => createDemoInitialStateV1(bootstrap, program.data),
    projectView: (snapshot) =>
      projectDemoGameViewV1(snapshot.state, coordinator.createQueries(snapshot)),
  });
}
```

`story.ts` first assembles `demoStoryDataV1` from the exact Task 1–6 manifest/state/balance/content exports and `demoStoryRulesV1` from the seven rule functions. It then defines the source facets and maps every simulation value/rule slot into the post-Hotfix Program; no source Profile exists:

```ts
// stories/demo/src/story.ts
type DemoSimulationPatchValuesV1 = ResolvedPatchValuesV1<typeof demoSimulationPatchSurfaceV1>;
type DemoPresentationPatchValuesV1 = ResolvedPatchValuesV1<typeof demoPresentationPatchSurfaceV1>;

function materializeDemoSimulationProgramV1(
  values: DeepReadonly<DemoSimulationPatchValuesV1>,
): DemoSimulationProgramV1 {
  return Object.freeze({
    data: Object.freeze({
      ...demoStoryDataV1,
      balance: values["value.balance"],
    }),
    rules: Object.freeze({
      demand: Object.freeze({
        resolve: values["rule.demand.resolve"],
        preview: values["rule.demand.preview"],
      }),
      tavern: Object.freeze({
        preview: values["rule.tavern.preview"],
        settle: values["rule.tavern.settle"],
      }),
      checks: Object.freeze({
        describe: values["rule.checks.describe"],
        resolve: values["rule.checks.resolve"],
      }),
      endings: Object.freeze({
        evaluate: values["rule.endings.evaluate"],
      }),
    }),
  });
}

function materializeDemoPresentationV1(values: DeepReadonly<DemoPresentationPatchValuesV1>) {
  return Object.freeze({
    uiSceneGraph: demoUiSceneGraphV1,
    textCatalogs: values["text.catalogs"],
    assetSlots: demoAssetSlotsV1,
    assetPacks: demoAssetPacksV1,
  });
}

export function defineDemoStoryV1() {
  return Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: demoStateContractRevisionV1,
      data: demoStoryDataV1,
      rules: demoStoryRulesV1,
      narrativeProgram: demoStoryDataV1.content.scenes,
      patchSurface: demoSimulationPatchSurfaceV1,
      materializeProgram: materializeDemoSimulationProgramV1,
      createProfile: createDemoGameProfileV1,
    }),
    presentation: Object.freeze({
      uiSceneGraph: demoUiSceneGraphV1,
      textCatalogs: demoTextCatalogsV1,
      assetSlots: demoAssetSlotsV1,
      assetPacks: demoAssetPacksV1,
      patchSurface: demoPresentationPatchSurfaceV1,
      materializePresentation: materializeDemoPresentationV1,
    }),
  });
}
```

The presentation asset Patch symbols are consumed directly by the generic asset resolver into `ResolvedStory.assets`; `materializeDemoPresentationV1` owns only the text/value projection and immutable slot/pack selection. Task 7 Story validation proves the state-contract revision reaches resolved provenance and every default provider is mapped into the base Programs/Profile. General replacement materialization is already proven by Phase 1's synthetic resolver test and Phase 2's official E2E Hotfix test, so this task does not invent seven redundant Demo Hotfix fixtures.

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

- [ ] **Step 5: Activate the default entry and extend the existing mixed-license scope atomically**

Modify the Task 3 `stories/demo/LICENSE.md` rather than recreating it: preserve the executable PolyForm mapping and `src/simulation/narrative/**` CC mapping, then add the now-existing `src/presentation/text-catalogs/**` scope to CC BY-NC-SA. The package already says `SEE LICENSE IN LICENSE.md`; add `".": "./src/index.ts"`, do not add `./development`, and add the exact direct `react: "19.2.7"` dependency because this task creates the Story-owned `.tsx` SceneGraph. In the same edit, enable `jsx: "react-jsx"` plus `DOM`/`DOM.Iterable` in `stories/demo/tsconfig.json`; the boundary verifier still forbids DOM imports from `src/simulation/**`, so enabling presentation compilation does not make DOM a simulation dependency. Extend the workspace/licensing policy, verifier, and behavior tests for the new text-catalog scope and React importer while asserting the earlier narrative mapping remains intact. Then extend `verify:stories` to keep Sandbox/E2E checks and validate Demo. Its default-closure checks use `scripts/collect-import-closure.mjs` and reject development/app/art-source/references paths; no Base/testkit closure helper exists.

- [ ] **Step 6: Run full Story, licensing, and import gates**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/story-validation.test.ts && pnpm verify:stories && pnpm verify:licensing && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; all stable references/reachability/catalogs/rules/slots/fallbacks validate; Demo retains its Task 3 mixed-license activation and adds only the text-catalog CC scope; no runtime image, AIGC archive path, development module, app module, or forbidden path is reachable.

- [ ] **Step 7: Commit complete Demo composition**

```bash
git add stories/demo/package.json stories/demo/tsconfig.json stories/demo/LICENSE.md stories/demo/src/presentation/text-catalogs/zh-CN.ts stories/demo/src/presentation/text-catalogs/index.ts stories/demo/src/presentation/assets.ts stories/demo/src/presentation/scene-graph.tsx stories/demo/src/patch-surfaces.ts stories/demo/src/profile.ts stories/demo/src/story.ts stories/demo/src/index.ts stories/demo/src/test/story-validation.test.ts scripts/verify-stories.mjs scripts/verify-stories.test.mjs scripts/workspace-policy.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
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

- Consumes: the complete Task 7 GamePackage/resolved Profile, `resolveStoryForTestV1`, `createEngineSessionV1`, explicit bootstrap input, public `GameCommandV1`, Player dispatch result, the runtime-owned bounded CommandLog, and immutable queries.
- Produces: one test-only `createDemoStoryHarnessV1(input)` API, a readonly same-attempt execution/CommandLog observation surface, and all real command-through D1–D7 route tests. No content/rule test before this task dispatches a command, and no harness symbol enters a public or Player export.

- [ ] **Step 1: Write the failing uniform-harness contract**

```ts
export function resolveBaseDemoStoryV1() {
  return resolveStoryForTestV1(demoStoryEntryV1);
}

export type DemoResolvedStoryV1 = ReturnType<typeof resolveBaseDemoStoryV1>;

export interface DemoStoryHarnessInputV1 {
  readonly bootstrap: DemoGameBootstrapInputV1;
  readonly resolvedStory?: DemoResolvedStoryV1;
}

export interface DemoHarnessExecutedGameAttemptV1 {
  readonly command: DeepReadonly<GameCommandV1>;
  readonly execution: DeepReadonly<DemoCommandExecutionResultV1>;
  readonly logEntry: DeepReadonly<Extract<CommandLogEntryV1, { readonly source: "game" }>>;
}

export interface DemoStoryHarnessV1 {
  dispatch(
    command: DeepReadonly<GameCommandV1>,
  ): Promise<SessionDispatchOperationResultV1<DemoCommandExecutionResultV1>>;
  commit(command: DeepReadonly<GameCommandV1>): Promise<DeepReadonly<GameSnapshotV1>>;
  snapshot(): DeepReadonly<GameSnapshotV1>;
  queries(): EngineQueriesV1;
  executedGameAttempts(): readonly DeepReadonly<DemoHarnessExecutedGameAttemptV1>[];
}

export function createDemoStoryHarnessV1(input: DemoStoryHarnessInputV1): DemoStoryHarnessV1;
```

There is no zero-argument overload, `{ seed }` alias, direct `executeAttempt`, `anchorSnapshot`, owner apply, rule call, state setter, mutable CommandLog handle, or replay-base accessor. `dispatch` calls the real Session exactly once. For each `{ kind:"executed" }` result, it pairs that exact execution with the one next-ordinal game CommandLog entry appended before return, deep-freezes the test record, and appends it to a private observation array; `{ kind:"not_executed" }` appends nothing. `executedGameAttempts()` returns a frozen copy and never exposes a mutable log. `commit` calls this `dispatch` wrapper exactly once, requires `{ kind:"executed", execution:{ kind:"committed" } }`, and returns the adopted immutable Snapshot. Every convenience driver expands only into public commands and awaits them.

- [ ] **Step 2: Run and observe the missing harness**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/daily-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts`

Expected: FAIL with missing `../testing/demo-harness.js`.

- [ ] **Step 3: Implement the harness over the real Session**

Select `const resolved = input.resolvedStory ?? resolveBaseDemoStoryV1()` before Session creation, then pass that exact `resolved.profile` and `input.bootstrap` to `createEngineSessionV1`. The local helper also gives `DemoResolvedStoryV1` its complete inferred five-parameter specialization without a cast or raw generic. Never call the source materializer/Profile factory again: a supplied Hotfix-resolved candidate must retain its own closed Program/Profile. Queries come from that same coordinator instance and current committed Snapshot. The harness privately retains the runtime CommandLog instance supplied to that Session. Around each dispatch it records the prior last ordinal and bounded entry count, awaits the Session result, and for an executed attempt requires one next-ordinal game entry whose command and outcome match that same result; the bounded log may grow by one or remain at its limit after evicting the oldest entry. The harness immediately copies only that immutable public entry into `DemoHarnessExecutedGameAttemptV1`, so its test-only observation history remains complete even after later CommandLog eviction. Tests cover committed, rejected, faulted, `not_executed`, and bounded-eviction cardinality. This observation seam is exported only from `src/testing/demo-harness.ts`, is absent from the default Story and Player import closures, and cannot append, anchor, replay, or mutate the CommandLog.

- [ ] **Step 4: Port all command-through acceptance vectors after composition**

Move the relationship/investigation route scenarios from Tasks 4/5 into the integration files and add D1 start/policy/opening, D2 invoice threshold, D4 facility choice, D5 mutual exclusion, D6 apology/consequence, planned/emergency closure, levy paid/arrears, and terminal-lock vectors. Build every command/expected ID/resource through the branded ID/value registries. No test invokes a Story rule or owner directly.

- [ ] **Step 5: Run all integration, Story, type, and current gates**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/*.integration.test.ts && pnpm verify:stories && pnpm typecheck && pnpm verify`

Expected: PASS; all routes commit through the single Session API, preview/execute codes agree, the D1–D7 flow terminates exactly as specified, and verification leaves tracked files unchanged.

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
- Produces: an async compiler with explicitly captured committed Session results, an ordered async all-fixtures builder, six unique literal `GameCommandV1[]` JSON fixtures, and a runner that fails immediately on any rejection/fault. Runtime tests read the JSON; they do not reinterpret strategy prose.

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
      const compiled = await compileReferenceStrategyV1(definition);
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
  const results: DemoCommandExecutionResultV1[] = [];
  const commit = async (command: GameCommandV1): Promise<void> => {
    const operation = await harness.dispatch(command);
    if (operation.kind !== "executed" || operation.execution.kind !== "committed") {
      throw new Error(`reference_strategy.command_not_committed:${command.kind}`);
    }
    commands.push(command);
    results.push(operation.execution);
  };

  await commit({ kind: "run.start" });
  await drainNarrativeCommandsV1(harness, commit);
  await commit({ kind: "policy.choose", policyId: definition.policyId });
  for (const dayPlan of definition.days) await compileDayV1(dayPlan, harness, commit);
  await commit({ kind: "calendar.advance_phase" });
  await drainNarrativeCommandsV1(harness, commit);
  await commit({ kind: "levy.pay" });
  return { commands, results, finalSnapshot: harness.snapshot() };
}

export async function buildAllCommandFixturesV1(): Promise<
  Readonly<Record<ReferenceStrategyIdV1, readonly GameCommandV1[]>>
> {
  const entries: Array<readonly [ReferenceStrategyIdV1, readonly GameCommandV1[]]> = [];
  for (const strategyId of referenceStrategyIdsV1) {
    const compiled = await compileReferenceStrategyV1(referenceStrategyDefinitionsV1[strategyId]);
    entries.push([strategyId, compiled.commands]);
  }
  return Object.freeze(
    Object.fromEntries(entries) as Record<ReferenceStrategyIdV1, readonly GameCommandV1[]>,
  );
}
```

`compileDayV1` reserves fixed-window AP first, expands repeated prepare/rest as separate commands, computes purchases from current FIFO inventory without future RNG, submits plan before afternoon advance, drains every Scheduler Scene after phase advance, calls Start/Finalize adjacently for non-closed service, and fails on the first non-committed result. `buildAllCommandFixturesV1` awaits strategies sequentially in `referenceStrategyIdsV1` order so failure reporting and writer order are deterministic; it does not launch an unbounded `Promise.all`.

- [ ] **Step 5: Add the command-only writer, generate literal JSON once, and review it**

```js
// stories/demo/scripts/update-command-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAllCommandFixturesV1 } from "../dist/testing/compile-reference-strategy.js";

const directory = resolve(import.meta.dirname, "../src/test/fixtures/commands");
await mkdir(directory, { recursive: true });
const fixtures = await buildAllCommandFixturesV1();
for (const [strategyId, commands] of Object.entries(fixtures)) {
  await writeFile(
    resolve(directory, `${strategyId}.json`),
    `${JSON.stringify(commands, null, 2)}\n`,
    "utf8",
  );
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

- Consumes: reviewed command fixtures, fixed seed/run IDs, EngineSession, the Task 7A readonly same-attempt execution/CommandLog records, state digest, DomainFacts, ledger, service history, and Run completion.
- Produces: async single/all golden builders and six canonical golden artifacts containing every command/state digest, nightly ledger/history, PRNG trace summary, and final three-dimensional outcome.

- [ ] **Step 1: Write the failing read-only golden verifier**

```ts
// stories/demo/src/test/golden-week.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canonicalJsonBytes } from "@project-tavern/base";
import { buildGoldenArtifactV1 } from "../testing/golden-artifact.js";
import { referenceStrategyIdsV1 } from "../testing/reference-strategy-definitions.js";
import { loadCommandFixtureV1 } from "../testing/run-reference-strategy.js";

describe("reference seed golden weeks", () => {
  for (const strategyId of referenceStrategyIdsV1) {
    it(`${strategyId} matches the reviewed artifact`, async () => {
      const actual = await buildGoldenArtifactV1(strategyId, loadCommandFixtureV1(strategyId));
      const stored = JSON.parse(
        await readFile(new URL(`./fixtures/golden/${strategyId}.json`, import.meta.url), "utf8"),
      );
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

export async function buildAllGoldenArtifactsV1(): Promise<
  Readonly<Record<ReferenceStrategyIdV1, DemoGoldenArtifactV1>>
> {
  const entries: Array<readonly [ReferenceStrategyIdV1, DemoGoldenArtifactV1]> = [];
  for (const strategyId of referenceStrategyIdsV1) {
    entries.push([
      strategyId,
      await buildGoldenArtifactV1(strategyId, loadCommandFixtureV1(strategyId)),
    ]);
  }
  return Object.freeze(
    Object.fromEntries(entries) as Record<ReferenceStrategyIdV1, DemoGoldenArtifactV1>,
  );
}
```

`buildGoldenArtifactV1(strategyId, commands)` is async and returns `Promise<DemoGoldenArtifactV1>`. It creates one fixed-seed/runId harness, then awaits each stored command sequentially. Every dispatch must return an executed committed result and add exactly one `executedGameAttempts()` record. The builder pairs the command with that same record, takes `stateDigest` and `rngDraws` from its immutable `logEntry`, and takes ordered `factKinds` from its paired committed `execution`; it never re-executes a command or reads a later entry to reconstruct diagnostics. It derives nightly rows from authoritative serviceHistory/ledger and reads final outcomes from `RunCompletionV1`. This test-only use of CommandLog evidence is diagnostic correlation, never player history or simulation input. `buildAllGoldenArtifactsV1` awaits the six builders sequentially in `referenceStrategyIdsV1` order so generated object/write order and first-failure reporting stay deterministic.

- [ ] **Step 4: Implement the explicit update script**

```js
// stories/demo/scripts/update-golden.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAllGoldenArtifactsV1 } from "../dist/testing/golden-artifact.js";

const records = await buildAllGoldenArtifactsV1();
const directory = resolve(import.meta.dirname, "../src/test/fixtures/golden");
await mkdir(directory, { recursive: true });
for (const [strategyId, value] of Object.entries(records)) {
  await writeFile(
    resolve(directory, `${strategyId}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
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
- Produces: an asynchronously materialized corpus, exact pass-count/median/dominance assertions, and awaited deterministic, non-negative, ledger, bed, and cold-storage replay/counterfactual checks.

- [ ] **Step 1: Write exact threshold tests before running the corpus**

```ts
// stories/demo/src/test/balance-1000-seeds.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { runStrategyCorpusV1, type StrategyCorpusV1 } from "../testing/run-reference-strategy.js";
import { referenceStrategyIdsV1 } from "../testing/reference-strategy-definitions.js";

const corpusBuildTimeoutMs = 300_000;
const perStrategyReplayTimeoutMs = 180_000;

describe("1..1000 seed balance contract", () => {
  let corpus: StrategyCorpusV1;

  beforeAll(async () => {
    corpus = await runStrategyCorpusV1({ firstSeed: 1, lastSeed: 1000 });
  }, corpusBuildTimeoutMs);

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
    for (const strategyId of [
      "strategy.cash_first",
      "strategy.relationship_first",
      "strategy.investigation_first",
    ] as const) {
      expect(corpus.paidCountWithD4CashDelta(strategyId, -12)).toBeGreaterThanOrEqual(750);
    }
    expect(corpus.maximumStrictDominanceCount()).toBeLessThanOrEqual(800);
  });
});
```

`runStrategyCorpusV1` returns `Promise<StrategyCorpusV1>` because every run uses the async Session harness. It materializes runs in stable `referenceStrategyIdsV1` order and ascending seed order, awaiting every command before recording metrics. The explicit async `beforeAll` owns corpus construction inside the Vitest lifecycle, has a bounded five-minute timeout rather than Vitest's default hook timeout, and publishes `corpus` only after all 6,000 runs complete; no corpus execution starts at module/`describe` evaluation, and no test reads a partially built corpus. The resolved corpus exposes synchronous aggregate reads, while `replay(...)` and `counterfactual(...)` return Promises because they execute fresh command sequences. All test snippets below live in the same `describe`.

- [ ] **Step 2: Run and record the initial corpus result**

Run: `pnpm --filter @project-tavern/story-demo test -- src/test/balance-1000-seeds.test.ts`

Expected: PASS against the current `balance-v0.md` contract. If any exact threshold fails, stop Phase 4, retain the failing corpus report, and revise the authoritative balance document and affected golden expectations before changing implementation values.

- [ ] **Step 3: Add deterministic and resource invariants**

```ts
it.each(referenceStrategyIdsV1)(
  "replays every %s seed identically and preserves resource invariants",
  async (strategyId) => {
    for (const run of corpus.runs()) {
      if (run.strategyId !== strategyId) continue;
      const replay = await corpus.replay(run.strategyId, run.seed);
      expect(replay.finalStateDigest).toBe(run.finalStateDigest);
      expect(replay.finalRng).toEqual(run.finalRng);
      expect(run.minimumAp).toBeGreaterThanOrEqual(0);
      expect(run.minimumPlayerStamina).toBeGreaterThanOrEqual(0);
      expect(run.minimumHeroineStamina).toBeGreaterThanOrEqual(0);
      expect(run.minimumIngredientQuantity).toBeGreaterThanOrEqual(0);
      expect(run.finalCash).toBe(run.startingCash + run.ledgerCashDelta);
    }
  },
  perStrategyReplayTimeoutMs,
);
```

Replay verification is split into six deterministic 1,000-run test chunks, each with a bounded three-minute timeout. A timeout is a real failure with the strategy ID in the test name; the plan does not hide it by using an unbounded timeout or one monolithic 6,000-replay test.

- [ ] **Step 4: Add the exact facility counterfactuals**

```ts
it("requires the comfortable bed for cash_first D6 manual service", async () => {
  const withBed = await corpus.counterfactual("strategy.cash_first", referenceSeedV1, {
    facilities: "authored",
  });
  const withoutBed = await corpus.counterfactual("strategy.cash_first", referenceSeedV1, {
    facilities: "none",
  });
  expect(withBed.d6OpeningResult.kind).toBe("committed");
  expect(withoutBed.d6OpeningResult).toMatchObject({
    kind: "rejected",
    reasons: [{ code: "actor.insufficient_stamina" }],
  });
});

it.each(["strategy.investigation_first", "strategy.full_delegation"] as const)(
  "requires cold storage for %s D4 meat",
  async (strategyId) => {
    const withStorage = await corpus.counterfactual(strategyId, referenceSeedV1, {
      facilities: "authored",
    });
    const withoutStorage = await corpus.counterfactual(strategyId, referenceSeedV1, {
      facilities: "none",
    });
    expect(withStorage.d6ConsumedD4FreshMeat).toBeGreaterThanOrEqual(1);
    expect(withoutStorage.d5SpoiledD4FreshMeat).toBeGreaterThanOrEqual(1);
  },
);
```

- [ ] **Step 5: Add fast-check command-sequence invariants**

Generate only schema-valid commands from currently visible Action/Workflow projections with `fc.asyncProperty`; execute and await up to 200 commands per case for at least 200 cases. Await the duplicate run before comparing it. Assert deterministic duplicate runs, no negative resource, state Schema validity after every commit, rejection/fault source object preservation, ledger equality, and no hidden demand in queries.

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

**Interfaces:**

- Consumes: Phase 3 persistence/import APIs, the deterministic test-only resolved Demo identity from Task 7A, fixed command fixtures, SaveRecord schemas, and Story development entry contract.
- Produces: four command-derived preview anchors, three valid SaveRecords covering Opening/WorldAction/terminal states, five invalid/recovery fixtures, read-only verification, and a separate explicit Save regeneration command.

- [ ] **Step 1: Write the failing Save fixture matrix test**

```ts
// stories/demo/src/test/save-fixtures.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateSaveImportCandidateV1 } from "@project-tavern/base/runtime";
import { resolveBaseDemoStoryV1 } from "../testing/demo-harness.js";
import { createDemoSaveValidationContextV1 } from "../testing/save-fixture-builder.js";

const readFixture = async (name: string): Promise<Uint8Array> =>
  new TextEncoder().encode(
    await readFile(new URL(`./fixtures/saves/${name}.json`, import.meta.url), "utf8"),
  );

describe("Demo Save fixtures", () => {
  const context = createDemoSaveValidationContextV1(resolveBaseDemoStoryV1());

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
    const result = validateSaveImportCandidateV1(
      await readFixture("save.revision-mismatch"),
      context,
    );
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
  {
    fixtureId: "fixture.demo_d5_relationship",
    seed: referenceSeedV1,
    commands: commandsToD5RelationshipV1,
  },
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
export async function buildDemoSaveFixtureMatrixV1(): Promise<
  Readonly<Record<DemoSaveFixtureNameV1, Uint8Array>>
> {
  const autoOpening = await saveRecordFromCommandsV1("auto.current", "auto", commandsToOpeningV1);
  const quickWorld = await saveRecordFromCommandsV1(
    "quick",
    "quick",
    commandsToAwaitingWorldCompletionV1,
  );
  const manualCompleted = await saveRecordFromCommandsV1("manual", "manual", commandsToD7SummaryV1);
  return Object.freeze({
    "save.auto-opening": encodeSaveRecordV1(autoOpening, demoSaveCodecV1),
    "save.quick-world-action": encodeSaveRecordV1(quickWorld, demoSaveCodecV1),
    "save.manual-completed": encodeSaveRecordV1(manualCompleted, demoSaveCodecV1),
    "save.auto-current-corrupt": encodeNegativeSaveMutationV1(autoOpening, (record) =>
      withStateDigestV1(record, invalidDigestV1),
    ),
    "save.auto-previous-valid": encodeSaveRecordV1(
      withSlotV1(autoOpening, "auto.previous"),
      demoSaveCodecV1,
    ),
    "save.future-format": encodeNegativeSaveMutationV1(manualCompleted, (record) =>
      withFormatRevisionV1(record, 2),
    ),
    "save.revision-mismatch": encodeNegativeSaveMutationV1(manualCompleted, (record) =>
      withStoryRevisionV1(record, 2),
    ),
    "save.digest-mismatch": encodeNegativeSaveMutationV1(manualCompleted, (record) =>
      withStateDigestV1(record, invalidDigestV1),
    ),
  });
}
```

`saveRecordFromCommandsV1` is async: it obtains one `resolved = resolveBaseDemoStoryV1()`, replays literal commands through `createDemoStoryHarnessV1({ resolvedStory: resolved, bootstrap })`, awaits each public Session dispatch in authored order, captures the committed Snapshot once, uses that same resolved provenance to compute the state digest, and validates the generated record before returning it. `buildDemoSaveFixtureMatrixV1` awaits its three legal bases sequentially before applying deterministic negative transforms. The helper's build identity is explicitly test-only; these tracked files are compatibility fixtures and never masquerade as production Player saves. Phase 6 production artifacts resolve their own build identity through the Loader. Valid records are encoded only by public `encodeSaveRecordV1`. Each negative-fixture transform deep-clones a legal record through Canonical JSON and changes only the named field; `encodeNegativeSaveMutationV1` then emits `canonicalJsonBytes` directly because deliberately invalid future/digest records cannot pass the public valid-record encoder. `withSlotV1` recomputes the cross-field slot metadata required for a valid previous record and therefore still uses `encodeSaveRecordV1`. Every fixture is canonical UTF-8 with no BOM, indentation, or trailing newline.

```js
// stories/demo/scripts/update-save-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDemoSaveFixtureMatrixV1 } from "../dist/testing/save-fixture-builder.js";

const directory = resolve(import.meta.dirname, "../src/test/fixtures/saves");
await mkdir(directory, { recursive: true });
const matrix = await buildDemoSaveFixtureMatrixV1();
for (const [name, bytes] of Object.entries(matrix)) {
  await writeFile(resolve(directory, `${name}.json`), bytes);
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

```jsonc
// package.json scripts addition
{
  "verify:phase4": "pnpm verify:phase2 && pnpm verify:persistence-diagnostics && pnpm verify:stories && pnpm verify:fixtures && pnpm verify:golden && pnpm verify:balance && pnpm --filter @project-tavern/story-demo test && pnpm build",
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
