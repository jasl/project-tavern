// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { approvedPocAssetPacksV1 } from "@project-tavern/assets";
import {
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  defineGamePackage,
  digestBytes,
  digestCanonical,
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterActivityId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parsePresentationProviderId,
  parsePositiveSafeInteger,
  parseRunId,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
} from "@sillymaker/base";
import { createFixedBootstrapEntropyV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type {
  AppearanceLayerId,
  AssetId,
  CharacterRigId,
  ContentRequirementV1,
  HitMapId,
  InteractionBehaviorId,
  InteractionSurfaceId,
  InteractionTargetId,
  StageSceneId,
  TextId,
} from "@sillymaker/base";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStateContractRevisionV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import {
  actionIdsV1,
  actorIdsV1,
  assetIdsV1,
  auraIdsV1,
  characterIdsV1,
  checkBandIdsV1,
  checkIdsV1,
  checkpointIdsV1,
  choiceIdsV1,
  customerSegmentIdsV1,
  endingIdsV1,
  eventIdsV1,
  factIdsV1,
  facilityIdsV1,
  ingredientIdsV1,
  investigationOutcomeTokensV1,
  itemIdsV1,
  modifierSourceIdsV1,
  nodeIdsV1,
  outcomeIdsV1,
  pocHitAreaIdsV1,
  pocGameSymbolIdsV1,
  pocHeroineCharacterActivityIdsV1,
  pocHeroineCharacterExpressionIdsV1,
  pocHeroineCharacterPoseIdsV1,
  pocHeroineCharacterRigIdsV1,
  pocHeroineAppearanceLayerOrderV1,
  pocHeroinePresentationIdsV1,
  pocHitMapIdsV1,
  pocInteractionBehaviorIdsV1,
  pocInteractionSurfaceIdsV1,
  pocInteractionTargetIdsV1,
  pocNoContentFilterOptionsTextIdV1,
  pocPresentationProviderIdsV1,
  pocPresentationCharacterIdsV1,
  pocSemanticWorkflowActionIdsV1,
  pocStageSceneIdsV1,
  pocStageSceneVariantIdsV1,
  pocStoryTitleTextIdV1,
  pocTextIdsV1,
  policyIdsV1,
  questIdsV1,
  reasonIdsV1,
  recipeIdsV1,
  relationshipOutcomeTokensV1,
  sceneIdsV1,
  serviceModeIdsV1,
  storyTokenIdsV1,
  textIdsV1,
  weightedGroupIdsV1,
  worldStepIdsV1,
} from "../content/ids.js";
import { pocStoryDataV1 } from "../content/story-data.js";
import {
  createPocRulesV1,
  parseActionId,
  parseActorId,
  parseAuraId,
  parseCheckBandId,
  parseCheckId,
  parseCheckpointId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFactId,
  parseFacilityId,
  parseIngredientId,
  parseModifierSourceId,
  parseMoney,
  parseNodeId,
  parseNonNegativeSafeInteger,
  parseOutcomeId,
  parsePolicyId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseServiceMode,
  parseStoryToken,
  parseWorldStepId,
} from "../gameplay/index.js";
import { pocGameplayModuleDescriptorsV1 } from "../gameplay/contracts/module-catalog.js";
import {
  materializePocRulesFromPatchValuesV1,
  materializePocSimulationProgramV1,
  pocBaseRuleProvidersV1,
  pocPresentationPatchSurfaceV1,
  pocSimulationPatchSurfaceV1,
} from "../patch-surfaces.js";
import {
  pocAssetPacksV1,
  pocAssetSlotsV1,
  pocHeroineStandardAppearanceV1,
  pocResolvedPresentationCatalogV1,
  pocStandardRequiredAssetIdsByVariantV1,
} from "../presentation/assets.js";
import {
  pocContentMaturityPolicyV1,
  pocStandardContentRequirementV1,
} from "../presentation/content-maturity-policy.js";
import {
  pocInteractionBehaviorsV1,
  pocInteractionSurfacesV1,
  pocInteractionTargetsV1,
} from "../presentation/interaction-catalog.js";
import { pocSceneGraphV1, pocStageRendererIdsV1 } from "../presentation/scene-graph.js";
import {
  commandForPocSemanticInvocationV1,
  createPocSemanticActionCatalogV1,
  parsePocSemanticInvocationV1,
  pocSemanticInvocationOptionsSchemaByActionV1,
  previewPocSemanticInvocationV1,
  projectPocSemanticActionResultV1,
} from "../index.js";
import type {
  PocNoSemanticOptionsV1,
  PocPresentationV1,
  PocResolvedAssetsV1,
  PocResolvedGameV1,
  PocSemanticActionDescriptorV1,
  PocSemanticActionOptionV1,
  PocSemanticActionResultV1,
  PocSemanticConfirmationV1,
  PocSemanticDeliveryKindByActionV1,
  PocSemanticFormByActionV1,
  PocSemanticInvocationErrorCodeV1,
  PocSemanticInvocationOptionsByActionV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocStageSceneGraphV1,
} from "../index.js";
import { pocTextCatalogsV1 } from "../presentation/text-catalogs/index.js";
import { pocZhCnTextCatalogV1 } from "../presentation/text-catalogs/zh-CN.js";
import { pocStateContractManifestV1, pocStoryEntryV1 } from "../story-definition.js";
import type {
  ActionViewV1,
  ActionId,
  ActorId,
  CheckBandId,
  EndingInputV1,
  EventId,
  IngredientId,
  NarrativeProjectionV1,
  OutcomeId,
  PocGameQueriesV1,
  RecipeId,
  SceneId,
} from "../gameplay/index.js";
import {
  pocChecksDescribeProviderSourceDigestV1,
  pocChecksResolveProviderSourceDigestV1,
  pocDemandPreviewProviderSourceDigestV1,
  pocDemandResolveProviderSourceDigestV1,
  pocEndingsEvaluateProviderSourceDigestV1,
  pocTavernPreviewProviderSourceDigestV1,
  pocTavernSettleProviderSourceDigestV1,
} from "../rule-source-digests.generated.js";

function expectDeeplyFrozenV1(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

function compareCodePointsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUniqueStringsV1(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareCodePointsV1);
}

function allPocContentRequirementsV1(): readonly ContentRequirementV1[] {
  return Object.freeze([
    ...pocSceneGraphV1.variants.map((variant) => variant.content),
    ...pocSceneGraphV1.interactionBehaviors.map((behavior) => behavior.content),
  ]);
}

function expectStrictJsonDataOnlyV1(value: unknown, path = "$", seen = new Set<object>()): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  expect(typeof value, path).toBe("object");
  if (typeof value !== "object" || value === null) return;
  expect(seen.has(value), `${path} must not contain a cycle`).toBe(false);
  seen.add(value);
  expect(Object.getOwnPropertySymbols(value), `${path} symbol keys`).toEqual([]);
  expect(Object.isFrozen(value), `${path} frozen`).toBe(true);

  if (!Array.isArray(value)) {
    expect(Object.getPrototypeOf(value), `${path} prototype`).toBe(Object.prototype);
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor?.get, `${path}.${String(key)} getter`).toBeUndefined();
    expect(descriptor?.set, `${path}.${String(key)} setter`).toBeUndefined();
    expectStrictJsonDataOnlyV1(descriptor?.value, `${path}.${String(key)}`, seen);
  }
  seen.delete(value);
}

function resolvePocStoryWithAssetFixtureV1(input: {
  readonly assetSlots?: readonly unknown[];
  readonly assetPacks?: readonly unknown[];
  readonly uiSceneGraph?: typeof pocSceneGraphV1;
}) {
  const source = pocStoryEntryV1.define();
  const definition = Object.freeze({
    simulation: source.simulation,
    presentation: Object.freeze({
      ...source.presentation,
      uiSceneGraph: input.uiSceneGraph ?? source.presentation.uiSceneGraph,
      assetSlots: input.assetSlots ?? source.presentation.assetSlots,
      assetPacks: input.assetPacks ?? source.presentation.assetPacks,
    }),
  });
  const entry = defineGamePackage({
    contractRevision: 1,
    identity: pocStoryEntryV1.identity,
    define: () => definition,
  });
  return resolveStoryForTestV1(entry);
}

function syntheticProviderForSlotV1(
  slot: (typeof pocAssetSlotsV1)[number],
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  const bytes = new TextEncoder().encode(`synthetic:${slot.assetId}`);
  return Object.freeze({
    assetId: slot.assetId,
    runtimePath: `game/packages/assets/runtime/poc/synthetic-${String(slot.assetId).replaceAll(".", "-")}.png`,
    mediaType: "image/png",
    byteLength: parsePositiveSafeInteger(bytes.byteLength),
    width: parsePositiveSafeInteger(slot.width),
    height: parsePositiveSafeInteger(slot.height),
    sha256: digestBytes(bytes),
    ...overrides,
  });
}

function syntheticAssetPackV1(
  providers: readonly Readonly<Record<string, unknown>>[],
  id = "assets.poc.synthetic",
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    identity: Object.freeze({ id, revision: parsePositiveSafeInteger(1) }),
    providers: Object.freeze([...providers]),
  });
}

function createResolvedPocQueriesV1() {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const bootstrap = resolved.gameSimulation.createBootstrapInput(
    createFixedBootstrapEntropyV1({
      uuids: ["00000000-0000-4000-8000-000000000707"],
      seeds: [0x0002_3049],
    }),
  );
  const state = resolved.gameSimulation.createInitialState(bootstrap);
  const snapshot = Object.freeze({
    state,
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  return Object.freeze({
    resolved,
    state,
    snapshot,
    queries: resolved.gameSimulation.createQueries(state),
  });
}

function expectSemanticErrorCodeV1(value: unknown, code: PocSemanticInvocationErrorCodeV1): void {
  expect(() => parsePocSemanticInvocationV1(value)).toThrowError(expect.objectContaining({ code }));
}

function semanticActionViewV1(actionId: (typeof actionIdsV1)[number]): ActionViewV1 {
  const definition = pocStoryDataV1.content.actions.find(
    ({ actionId: candidate }) => candidate === actionId,
  );
  if (definition === undefined) throw new TypeError(`missing Action definition ${actionId}`);
  return Object.freeze({
    actionId,
    labelTextId: definition.labelTextId,
    available: true,
    costs: Object.freeze({
      ap: parseNonNegativeSafeInteger(0),
      playerStamina: parseNonNegativeSafeInteger(0),
      heroineStamina: parseNonNegativeSafeInteger(0),
      cash: parseMoney(0),
    }),
    availablePhases: definition.availablePhases,
    occupiedPhases: Object.freeze([]),
    confirmation: definition.confirmation,
    directCommand: null,
    rejectionCodes: Object.freeze([]),
  });
}

function defaultPocSimulationPatchValuesV1() {
  const { slots } = pocSimulationPatchSurfaceV1;
  return Object.freeze({
    balance: slots.balance.defaultValue,
    demandPreview: slots.demandPreview.defaultValue,
    demandResolve: slots.demandResolve.defaultValue,
    tavernPreview: slots.tavernPreview.defaultValue,
    tavernSettle: slots.tavernSettle.defaultValue,
    checksDescribe: slots.checksDescribe.defaultValue,
    checksResolve: slots.checksResolve.defaultValue,
    endingsEvaluate: slots.endingsEvaluate.defaultValue,
  });
}

function createProductionEndingInputV1(): EndingInputV1 {
  const { state } = createResolvedPocQueriesV1();
  const policy = pocStoryDataV1.balance.endingPolicy;
  const cash = policy.stableMinimumCashAfterLevy;
  const levyAmount = pocStoryDataV1.balance.levyAmount;
  return Object.freeze({
    cash,
    levy: Object.freeze({
      kind: "paid" as const,
      levyAmount,
      cash: Object.freeze({
        before: parseMoney(Number(cash) + Number(levyAmount)),
        after: cash,
      }),
    }),
    reputation: policy.stableMinimumReputation,
    facilityIds: Object.freeze(
      pocStoryDataV1.content.facilities
        .slice(0, policy.stableMinimumBuiltFacilities)
        .map(({ facilityId }) => facilityId),
    ),
    relationship: state.simulation.actors.relationship,
    facts: state.story.facts,
    quests: state.story.quests,
    outcomes: state.story.outcomes,
    auras: state.simulation.status.auras,
  });
}

describe("complete Story composition", () => {
  it("resolves one frozen game with one simulation and the resolved SceneGraph", () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const approvedPackIdentities = approvedPocAssetPacksV1.map((pack) => ({
      ...pack.identity,
      digest: digestCanonical("sillymaker:asset-pack:v1", {
        identity: pack.identity,
        providers: pack.providers,
      }),
    }));
    const approvedProviderAssetIds = approvedPocAssetPacksV1.flatMap((pack) =>
      pack.providers.map(({ assetId }) => assetId),
    );

    expect(resolved.frozen).toBe(true);
    expect(resolved.gameSimulation.modules).toHaveLength(10);
    expect(resolved.sceneGraph).toStrictEqual(pocSceneGraphV1);
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
    expect(resolved.presentation.resolvedCatalog).toBe(pocResolvedPresentationCatalogV1);
    expect(resolved.assets.packs).toEqual(approvedPackIdentities);
    expect(resolved.assets.slots).toEqual(pocAssetSlotsV1);
    expect(resolved.assets.assets).toHaveLength(12);
    expect(
      resolved.assets.assets.every(
        (asset) =>
          asset.fallbackToken.startsWith("fallback.poc.") && asset.fallbackToken.length > 0,
      ),
    ).toBe(true);
    expect(
      resolved.assets.assets
        .filter((asset) => asset.delivery === "runtime_image")
        .map(({ assetId }) => assetId),
    ).toEqual(approvedProviderAssetIds);
    expect(resolved.provenance.resolved.stateContractRevision).toBe(1);
    expect(resolved.provenance.resolved.stateContractDigest).toBe(
      digestCanonical("sillymaker:state-contract:v1", {
        story: pocStoryIdentityV1,
        revision: pocStateContractRevisionV1,
        manifest: pocStateContractManifestV1,
      }),
    );
    expectStrictJsonDataOnlyV1(resolved.sceneGraph);
    expectDeeplyFrozenV1(resolved);
  });

  it("freezes the exact renderer, variant, heroine, HitMap, and interaction topology", () => {
    expect(pocStageRendererIdsV1).toEqual({
      mainMenu: "renderer.poc.stage.main_menu",
      tavern: "renderer.poc.stage.tavern",
      market: "renderer.poc.stage.market",
      worldMap: "renderer.poc.stage.world_map",
      weekSummary: "renderer.poc.stage.week_summary",
    });
    expect(pocSceneGraphV1.variants.map(({ rendererId }) => rendererId)).toEqual([
      pocStageRendererIdsV1.mainMenu,
      pocStageRendererIdsV1.tavern,
      pocStageRendererIdsV1.tavern,
      pocStageRendererIdsV1.market,
      pocStageRendererIdsV1.worldMap,
      pocStageRendererIdsV1.weekSummary,
    ]);
    expect(pocSceneGraphV1.variants.map(({ variantId }) => variantId)).toEqual(
      pocStageSceneVariantIdsV1,
    );

    const tavernVariants = pocSceneGraphV1.variants.filter(
      ({ stageSceneId }) => stageSceneId === "stage_scene.poc.tavern",
    );
    expect(tavernVariants).toHaveLength(2);
    for (const variant of tavernVariants) {
      expect(variant.actors).toEqual([
        {
          characterId: "character.poc.heroine",
          anchor: { x: 0.6625, y: 0.93 },
          scale: 1,
        },
      ]);
      expect(variant.interactionSurfaces).toEqual([
        { surfaceId: "surface.poc.tavern", anchor: { x: 0.5, y: 0.5 } },
        { surfaceId: "surface.poc.heroine", anchor: { x: 0.5, y: 0.5 } },
      ]);
    }
    expect(pocSceneGraphV1.characterRigs).toEqual([
      expect.objectContaining({
        rigId: "rig.poc.heroine.default",
        rendererId: "renderer.poc.character.paper_doll",
        appearanceLayerOrder: pocHeroineAppearanceLayerOrderV1,
        staticFallbackAssetId: "asset.poc.character.heroine.static.standard",
        fallbackHitMapCompatibility: "compatible",
      }),
    ]);
    expect(pocSceneGraphV1.hitMaps).toEqual([
      expect.objectContaining({
        hitMapId: "hit_map.poc.heroine.idle",
        targets: [
          {
            areaId: "hit_area.poc.heroine.figure",
            targetId: "target.poc.heroine.figure",
            shape: { kind: "rect", x: 0.45, y: 0.05, width: 0.43, height: 0.9 },
            priority: 0,
          },
        ],
      }),
    ]);

    expect(pocInteractionSurfacesV1).toEqual(pocSceneGraphV1.interactionSurfaces);
    expect(pocInteractionTargetsV1).toEqual(pocSceneGraphV1.interactionTargets);
    expect(pocInteractionBehaviorsV1).toEqual(pocSceneGraphV1.interactionBehaviors);
    expect(
      pocInteractionSurfacesV1.find(({ surfaceId }) => surfaceId === "surface.poc.tavern")
        ?.targetBindings,
    ).toContainEqual({
      targetId: "target.poc.heroine.figure",
      allowedResolutionModes: ["open_surface"],
      openSurfaceId: "surface.poc.heroine",
    });
    expect(
      pocInteractionSurfacesV1.find(({ surfaceId }) => surfaceId === "surface.poc.heroine")
        ?.targetBindings,
    ).toEqual([
      {
        targetId: "target.poc.heroine.figure",
        allowedResolutionModes: ["direct", "choose"],
        openSurfaceId: null,
      },
    ]);
    expectDeeplyFrozenV1(pocSceneGraphV1);
  });

  it("binds exact fallback-complete asset metadata and one ordered per-variant demand", () => {
    expect(pocAssetPacksV1).toBe(approvedPocAssetPacksV1);
    expect(pocAssetSlotsV1.map(({ assetId }) => assetId)).toEqual(assetIdsV1);
    expect(pocAssetSlotsV1.every(({ overridePolicy }) => overridePolicy === "replaceable")).toBe(
      true,
    );

    for (const slot of pocAssetSlotsV1.slice(0, 6)) {
      expect(slot).toMatchObject({
        kind: "character",
        usage: "character_pose",
        width: 1600,
        height: 1000,
        loadGroup: "scene",
        safeArea: { x: 133, y: 0, width: 1334, height: 1000 },
        pivot: { x: 1060, y: 930 },
      });
    }
    for (const [index, slot] of pocAssetSlotsV1.slice(6).entries()) {
      expect(slot).toMatchObject({
        kind: "background",
        usage: "scene_background",
        width: 2560,
        height: 1600,
        loadGroup: index === 0 ? "bootstrap" : "scene",
        safeArea: { x: 213, y: 0, width: 2134, height: 1600 },
        pivot: null,
      });
    }
    expect(pocHeroineStandardAppearanceV1).toEqual(
      pocHeroineAppearanceLayerOrderV1.slice(0, 5).map((layerId, index) => ({
        layerId,
        assetId: assetIdsV1[index],
      })),
    );

    const expectedDemand = {
      "stage_variant.poc.main_menu.default": [assetIdsV1[6]],
      "stage_variant.poc.tavern.day": [assetIdsV1[7], ...assetIdsV1.slice(0, 6)],
      "stage_variant.poc.tavern.evening": [assetIdsV1[8], ...assetIdsV1.slice(0, 6)],
      "stage_variant.poc.market.day": [assetIdsV1[9]],
      "stage_variant.poc.world_map.default": [assetIdsV1[10]],
      "stage_variant.poc.week_summary.default": [assetIdsV1[11]],
    };
    expect(pocStandardRequiredAssetIdsByVariantV1).toEqual(expectedDemand);
    expect(Object.keys(pocStandardRequiredAssetIdsByVariantV1)).toEqual(pocStageSceneVariantIdsV1);
    for (const variant of pocSceneGraphV1.variants) {
      const demand = pocStandardRequiredAssetIdsByVariantV1[variant.variantId];
      if (demand === undefined) throw new TypeError(`missing asset demand ${variant.variantId}`);
      expect(demand[0], variant.variantId).toBe(variant.backgroundAssetId);
      expect(new Set(demand).size, variant.variantId).toBe(demand.length);
      expect(
        demand.every((assetId) => assetIdsV1.includes(assetId)),
        variant.variantId,
      ).toBe(true);
    }
    expectDeeplyFrozenV1(pocResolvedPresentationCatalogV1);
  });

  it("keeps the PoC maturity policy empty and every resolved requirement at the zero mask", () => {
    expect(pocContentMaturityPolicyV1).toEqual({
      policyRevision: 1,
      flags: [],
      presets: [],
      defaultAllowedFlags: 0,
    });
    expect(pocStandardContentRequirementV1).toEqual({ requiredFlags: 0 });
    expect(allPocContentRequirementsV1().every(({ requiredFlags }) => requiredFlags === 0)).toBe(
      true,
    );
  });

  it("publishes one complete nonblank zh-CN TextCatalog including the truthful empty setting", () => {
    expect(pocTextCatalogsV1).toEqual({
      defaultLocale: "zh-CN",
      catalogs: [pocZhCnTextCatalogV1],
    });
    expect(pocZhCnTextCatalogV1.entries.map(({ textId }) => textId)).toEqual(textIdsV1);
    expect(
      pocZhCnTextCatalogV1.entries.every(
        ({ text }) => text.trim().length > 0 && !/TODO/iu.test(text),
      ),
    ).toBe(true);
    expect(
      pocZhCnTextCatalogV1.entries.find(
        ({ textId }) => textId === pocNoContentFilterOptionsTextIdV1,
      )?.text,
    ).toBe("当前故事没有可调整的内容过滤选项。");
    expectDeeplyFrozenV1(pocTextCatalogsV1);
  });
});

describe("PoC resolved Asset provider contract", () => {
  it("accepts an empty pack list and preserves the complete fallback manifest", () => {
    const resolved = resolvePocStoryWithAssetFixtureV1({ assetPacks: [] });

    expect(resolved.assets.packs).toEqual([]);
    expect(resolved.assets.slots).toEqual(pocAssetSlotsV1);
    expect(resolved.assets.assets).toHaveLength(pocAssetSlotsV1.length);
    expect(resolved.assets.assets).toEqual(
      pocAssetSlotsV1.map((slot) => ({
        ...slot,
        delivery: "code_fallback",
        provider: null,
        overrideChain: [],
      })),
    );
  });

  it("lets a synthetic pack replace only a matching replaceable slot", () => {
    const base = resolvePocStoryWithAssetFixtureV1({ assetPacks: [] });
    const slot = pocAssetSlotsV1[7];
    const provider = syntheticProviderForSlotV1(slot);
    const pack = syntheticAssetPackV1([provider]);
    const resolved = resolvePocStoryWithAssetFixtureV1({ assetPacks: [pack] });
    const replaced = resolved.assets.assets.find(({ assetId }) => assetId === slot.assetId);

    expect(replaced).toMatchObject({
      ...provider,
      fallbackToken: slot.fallbackToken,
      delivery: "runtime_image",
      provider: { kind: "asset_pack", identity: { id: "assets.poc.synthetic", revision: 1 } },
    });
    expect(
      resolved.assets.assets
        .filter(({ delivery }) => delivery === "runtime_image")
        .map(({ assetId }) => assetId),
    ).toEqual([slot.assetId]);
    expect(
      resolved.assets.assets
        .filter(({ assetId }) => assetId !== slot.assetId)
        .every(
          ({ delivery, provider: currentProvider }) =>
            delivery === "code_fallback" && currentProvider === null,
        ),
    ).toBe(true);
    expect(resolved.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(resolved.provenance.resolved.simulationDigest).toBe(
      base.provenance.resolved.simulationDigest,
    );
    expect(resolved.provenance.resolved.presentationDigest).not.toBe(
      base.provenance.resolved.presentationDigest,
    );
  });

  it("partitions a catalog layout edit to presentation identity", () => {
    const base = resolvePocStoryWithAssetFixtureV1({});
    const layoutEditedGraph = Object.freeze({
      ...pocSceneGraphV1,
      variants: Object.freeze(
        pocSceneGraphV1.variants.map((variant, index) =>
          index === 0
            ? Object.freeze({
                ...variant,
                layout: Object.freeze({ ...variant.layout, logicalWidth: 1599 }),
              })
            : variant,
        ),
      ),
    }) as typeof pocSceneGraphV1;
    const changed = resolvePocStoryWithAssetFixtureV1({ uiSceneGraph: layoutEditedGraph });

    expect(changed.provenance.resolved.presentationDigest).not.toBe(
      base.provenance.resolved.presentationDigest,
    );
    expect(changed.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(changed.provenance.resolved.simulationDigest).toBe(
      base.provenance.resolved.simulationDigest,
    );
  });

  it("rejects unknown, duplicate, and sealed Asset resolution", () => {
    const slot = pocAssetSlotsV1[0];
    const unknownProvider = Object.freeze({
      ...syntheticProviderForSlotV1(slot),
      assetId: parseAssetId("asset.poc.not_registered"),
    });
    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetPacks: [syntheticAssetPackV1([unknownProvider])],
      }),
    ).toThrow(/asset slot unknown/iu);

    const provider = syntheticProviderForSlotV1(slot);
    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetPacks: [syntheticAssetPackV1([provider, provider])],
      }),
    ).toThrow(/duplicate Asset Pack provider/iu);
    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetSlots: [...pocAssetSlotsV1, { ...slot }],
        assetPacks: [],
      }),
    ).toThrow(/duplicate asset slot/iu);

    const sealedSlots = pocAssetSlotsV1.map((candidate) =>
      candidate.assetId === slot.assetId ? { ...candidate, overridePolicy: "sealed" } : candidate,
    );
    const secondProvider = syntheticProviderForSlotV1(slot, {
      runtimePath: "game/packages/assets/runtime/poc/synthetic-second.png",
      sha256: digestBytes(new TextEncoder().encode("synthetic-second")),
    });
    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetSlots: sealedSlots,
        assetPacks: [
          syntheticAssetPackV1([provider], "assets.poc.synthetic.first"),
          syntheticAssetPackV1([secondProvider], "assets.poc.synthetic.second"),
        ],
      }),
    ).toThrow(/asset slot sealed/iu);
  });

  it.each([
    ["invalid digest", { sha256: "sha256:not-a-digest" }, /invalid digest/iu],
    ["zero bytes", { byteLength: 0 }, /PositiveSafeInteger/iu],
    ["zero width", { width: 0 }, /PositiveSafeInteger/iu],
    ["wrong width", { width: 1599 }, /asset dimensions mismatch/iu],
    ["wrong height", { height: 999 }, /asset dimensions mismatch/iu],
  ] as const)("rejects %s provider metadata", (_label, overrides, error) => {
    const slot = pocAssetSlotsV1[0];
    const provider = syntheticProviderForSlotV1(slot, overrides);

    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetPacks: [syntheticAssetPackV1([provider])],
      }),
    ).toThrow(error);
  });

  it.each([
    "../escape.png",
    "/absolute.png",
    "https://example.invalid/remote.png",
    "art-source/aigc/source.png",
    "references/commercial.png",
    "game\\packages\\assets\\runtime\\poc\\backslash.png",
  ])("rejects unsafe runtime provider path %s", (runtimePath) => {
    const slot = pocAssetSlotsV1[0];
    const provider = syntheticProviderForSlotV1(slot, { runtimePath });

    expect(() =>
      resolvePocStoryWithAssetFixtureV1({
        assetPacks: [syntheticAssetPackV1([provider])],
      }),
    ).toThrow(/asset path invalid/iu);
  });
});

describe("PoC State contract manifest", () => {
  it("binds the exact aggregate, persistent Narrative IR, and ten Module schemas", () => {
    const expectedModuleSchemas = [
      ["module.actors", "schema.poc.module.actors-state"],
      ["module.calendar", "schema.poc.module.calendar-state"],
      ["module.facilities", "schema.poc.module.facilities-state"],
      ["module.inventory", "schema.poc.module.inventory-state"],
      ["module.narrative", "schema.poc.module.narrative-state"],
      ["module.progression", "schema.poc.module.progression-state"],
      ["module.run", "schema.poc.module.run-state"],
      ["module.status", "schema.poc.module.status-state"],
      ["module.tavern", "schema.poc.module.tavern-state"],
      ["module.workflow", "schema.poc.module.workflow-state"],
    ] as const;

    expect(pocStateContractManifestV1.contractRevision).toBe(1);
    expect(pocStateContractManifestV1.aggregateStateSchema).toEqual({
      schemaId: "schema.poc.game-state",
      revision: 1,
    });
    expect(pocStateContractManifestV1.persistentIrSchemas).toEqual([
      { schemaId: "schema.poc.narrative-runtime-ir", revision: 1 },
    ]);
    expect(pocStateContractManifestV1.moduleStateSchemas).toEqual(
      expectedModuleSchemas.map(([moduleId, schemaId]) => {
        const descriptor = pocGameplayModuleDescriptorsV1.find(({ id }) => id === moduleId);
        if (descriptor === undefined) throw new TypeError(`missing descriptor ${moduleId}`);
        return {
          moduleId: descriptor.id,
          moduleContractRevision: descriptor.contractRevision,
          stateSlots: descriptor.stateSlots,
          stateSchema: { schemaId, revision: 1 },
        };
      }),
    );
    expect(pocStateContractManifestV1.moduleStateSchemas.map(({ moduleId }) => moduleId)).toEqual(
      [...pocStateContractManifestV1.moduleStateSchemas.map(({ moduleId }) => moduleId)].sort(
        compareCodePointsV1,
      ),
    );
    expectDeeplyFrozenV1(pocStateContractManifestV1);
  });

  it("binds every exact closed State reference set to its Task 1 registry", () => {
    const referenceSources = [
      ["references.poc.action", actionIdsV1],
      ["references.poc.actor", actorIdsV1],
      ["references.poc.asset", assetIdsV1],
      ["references.poc.aura", auraIdsV1],
      ["references.poc.character", characterIdsV1],
      ["references.poc.check", checkIdsV1],
      ["references.poc.check-band", checkBandIdsV1],
      ["references.poc.choice", choiceIdsV1],
      ["references.poc.customer-segment", customerSegmentIdsV1],
      ["references.poc.ending", endingIdsV1],
      ["references.poc.event", eventIdsV1],
      ["references.poc.fact", factIdsV1],
      ["references.poc.facility", facilityIdsV1],
      ["references.poc.ingredient", ingredientIdsV1],
      ["references.poc.item", itemIdsV1],
      ["references.poc.modifier-source", modifierSourceIdsV1],
      ["references.poc.node", nodeIdsV1],
      ["references.poc.outcome", outcomeIdsV1],
      ["references.poc.policy", policyIdsV1],
      ["references.poc.quest", questIdsV1],
      ["references.poc.reason", reasonIdsV1],
      ["references.poc.recipe", recipeIdsV1],
      ["references.poc.scene", sceneIdsV1],
      ["references.poc.story-token", storyTokenIdsV1],
      ["references.poc.world-step", worldStepIdsV1],
    ] as const;
    const expectedSets = [...referenceSources]
      .sort(([left], [right]) => compareCodePointsV1(left, right))
      .map(([setId, ids]) => ({ setId, ids: sortedUniqueStringsV1(ids) }));

    expect(pocStateContractManifestV1.stableReferenceSets).toEqual(expectedSets);
    expect(pocStateContractManifestV1.stableReferenceSets.map(({ setId }) => setId)).toEqual(
      [...pocStateContractManifestV1.stableReferenceSets.map(({ setId }) => setId)].sort(
        compareCodePointsV1,
      ),
    );
    for (const { setId, ids } of pocStateContractManifestV1.stableReferenceSets) {
      expect(ids, setId).toEqual(sortedUniqueStringsV1(ids));
    }
  });

  it("excludes workflow adapters, fixed enums, control flow, tooling, and presentation authority", () => {
    const stateReferenceIds = new Set(
      pocStateContractManifestV1.stableReferenceSets.flatMap(({ ids }) => ids),
    );
    const excludedIds = [
      ...pocSemanticWorkflowActionIdsV1,
      ...checkpointIdsV1,
      ...weightedGroupIdsV1,
      ...serviceModeIdsV1,
      "morning",
      "afternoon",
      "evening",
      "setup",
      "active",
      "completed_stable",
      "fixture.poc.synthetic",
      ...textIdsV1,
      ...pocStageSceneIdsV1,
      ...pocStageSceneVariantIdsV1,
      ...pocInteractionSurfaceIdsV1,
      ...pocInteractionTargetIdsV1,
      ...pocInteractionBehaviorIdsV1,
      ...pocPresentationProviderIdsV1,
      ...Object.values(pocStageRendererIdsV1),
    ];

    for (const id of excludedIds) {
      expect(stateReferenceIds.has(id), id).toBe(false);
    }
    expect(
      pocStateContractManifestV1.stableReferenceSets.find(
        ({ setId }) => setId === "references.poc.action",
      )?.ids,
    ).toEqual(sortedUniqueStringsV1(actionIdsV1));
    expect(
      pocStateContractManifestV1.stableReferenceSets.find(
        ({ setId }) => setId === "references.poc.character",
      )?.ids,
    ).toEqual(sortedUniqueStringsV1(characterIdsV1));
    expect(
      pocStateContractManifestV1.stableReferenceSets.some(({ setId }) =>
        /(?:text|renderer|provider|checkpoint|fixture|preference)/u.test(setId),
      ),
    ).toBe(false);
  });
});

describe("PoC Patch materialization contract", () => {
  it("binds one Balance value and exactly seven raw Rule providers to source identity", () => {
    const { slots } = pocSimulationPatchSurfaceV1;

    expect(Object.keys(slots)).toEqual([
      "balance",
      "demandPreview",
      "demandResolve",
      "tavernPreview",
      "tavernSettle",
      "checksDescribe",
      "checksResolve",
      "endingsEvaluate",
    ]);
    expect(
      Object.values(slots).map(
        ({ symbolId, kind, contractRevision, replaceable, defaultProviderSourceDigest }) => ({
          symbolId,
          kind,
          contractRevision,
          replaceable,
          defaultProviderSourceDigest,
        }),
      ),
    ).toEqual([
      expect.objectContaining({ symbolId: "value.poc.balance", kind: "value" }),
      expect.objectContaining({
        symbolId: "demand.preview",
        kind: "rule",
        defaultProviderSourceDigest: pocDemandPreviewProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "demand.resolve",
        kind: "rule",
        defaultProviderSourceDigest: pocDemandResolveProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "tavern.preview",
        kind: "rule",
        defaultProviderSourceDigest: pocTavernPreviewProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "tavern.settle",
        kind: "rule",
        defaultProviderSourceDigest: pocTavernSettleProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "checks.describe",
        kind: "rule",
        defaultProviderSourceDigest: pocChecksDescribeProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "checks.resolve",
        kind: "rule",
        defaultProviderSourceDigest: pocChecksResolveProviderSourceDigestV1,
      }),
      expect.objectContaining({
        symbolId: "endings.evaluate",
        kind: "rule",
        defaultProviderSourceDigest: pocEndingsEvaluateProviderSourceDigestV1,
      }),
    ]);
    expect(Object.values(slots).every(({ contractRevision }) => contractRevision === 1)).toBe(true);
    expect(Object.values(slots).every(({ replaceable }) => replaceable)).toBe(true);
    expect(slots.balance.defaultValue).toBe(pocStoryDataV1.balance);
    expect(slots.demandPreview.defaultValue).toBe(pocBaseRuleProvidersV1.demand.preview);
    expect(slots.demandResolve.defaultValue).toBe(pocBaseRuleProvidersV1.demand.resolve);
    expect(slots.tavernPreview.defaultValue).toBe(pocBaseRuleProvidersV1.tavern.preview);
    expect(slots.tavernSettle.defaultValue).toBe(pocBaseRuleProvidersV1.tavern.settle);
    expect(slots.checksDescribe.defaultValue).toBe(pocBaseRuleProvidersV1.checks.describe);
    expect(slots.checksResolve.defaultValue).toBe(pocBaseRuleProvidersV1.checks.resolve);
    expect(slots.endingsEvaluate.defaultValue).toBe(pocBaseRuleProvidersV1.endings.evaluate);
    expectDeeplyFrozenV1(pocSimulationPatchSurfaceV1);
  });

  it("keeps Presentation patching separate as one text slot plus twelve exact Asset slots", () => {
    const { slots } = pocPresentationPatchSurfaceV1;
    const [textSlot, ...assetSlots] = Object.values(slots);

    expect(Object.keys(slots)).toEqual([
      "textCatalogs",
      "heroineBackHair",
      "heroineCostumeBody",
      "heroineFace",
      "heroineFrontHair",
      "heroineAccessory",
      "heroineStatic",
      "backgroundMainMenu",
      "backgroundTavernDay",
      "backgroundTavernEvening",
      "backgroundMarketDay",
      "backgroundWorldMap",
      "backgroundWeekSummary",
    ]);
    expect(textSlot).toMatchObject({
      symbolId: "text.poc.catalogs",
      kind: "text",
      defaultValue: pocTextCatalogsV1,
    });
    expect(assetSlots.map(({ symbolId }) => symbolId)).toEqual(assetIdsV1);
    expect(
      assetSlots.every(({ kind, defaultValue }) => kind === "asset" && defaultValue === null),
    ).toBe(true);
    expect(Object.values(slots).every(({ replaceable }) => replaceable)).toBe(true);
    expectDeeplyFrozenV1(pocPresentationPatchSurfaceV1);
  });

  it("keeps default materialization output-equivalent to createPocRulesV1", () => {
    const values = defaultPocSimulationPatchValuesV1();
    const program = materializePocSimulationProgramV1(values);
    const directRules = createPocRulesV1(program.data);
    const directMaterialization = materializePocRulesFromPatchValuesV1(program.data, values);
    const endingInput = createProductionEndingInputV1();

    expect(Object.keys(program.rules)).toEqual(["demand", "tavern", "checks", "endings"]);
    expect(Object.keys(program.rules.demand)).toEqual(["preview", "resolve"]);
    expect(Object.keys(program.rules.tavern)).toEqual(["preview", "settle"]);
    expect(Object.keys(program.rules.checks)).toEqual(["describe", "resolve"]);
    expect(Object.keys(program.rules.endings)).toEqual(["evaluate"]);
    expect(program.rules).not.toHaveProperty("scheduling");
    expect(program.rules.endings.evaluate(endingInput)).toEqual(
      directRules.endings.evaluate(endingInput),
    );
    expect(directMaterialization.endings.evaluate(endingInput)).toEqual(
      directRules.endings.evaluate(endingInput),
    );
    expectDeeplyFrozenV1(program);
  });

  it("rebinds every unreplaced default Rule after a Balance-only replacement", () => {
    const values = defaultPocSimulationPatchValuesV1();
    const endingInput = createProductionEndingInputV1();
    const nextStableCash = parseMoney(
      Number(values.balance.endingPolicy.stableMinimumCashAfterLevy) + 1,
    );
    const patchedBalance = Object.freeze({
      ...values.balance,
      endingPolicy: Object.freeze({
        ...values.balance.endingPolicy,
        stableMinimumCashAfterLevy: nextStableCash,
      }),
    });
    const baseProgram = materializePocSimulationProgramV1(values);
    const patchedProgram = materializePocSimulationProgramV1({
      ...values,
      balance: patchedBalance,
    });

    expect(baseProgram.rules.endings.evaluate(endingInput).status).toBe("completed_stable");
    expect(patchedProgram.data.balance.endingPolicy.stableMinimumCashAfterLevy).toBe(
      nextStableCash,
    );
    expect(patchedProgram.rules.endings.evaluate(endingInput).status).toBe("completed_danger");
    expect(pocSimulationPatchSurfaceV1.slots.endingsEvaluate.defaultValue).toBe(
      pocBaseRuleProvidersV1.endings.evaluate,
    );
  });

  it("uses one explicit Rule replacement without changing unaffected Rule behavior", () => {
    const values = defaultPocSimulationPatchValuesV1();
    const endingReplacement = vi.fn(values.endingsEvaluate);
    const baseProgram = materializePocSimulationProgramV1(values);
    const patchedProgram = materializePocSimulationProgramV1({
      ...values,
      endingsEvaluate: endingReplacement,
    });
    const endingInput = createProductionEndingInputV1();
    const { state } = createResolvedPocQueriesV1();
    const day = baseProgram.data.balance.serviceDays[0];
    if (day === undefined) throw new TypeError("missing service day");
    const demandInput = Object.freeze({
      day,
      seeds: Object.freeze(
        baseProgram.data.balance.baseDemand
          .filter(({ day: candidate }) => candidate === day)
          .map(({ segmentId, customers }) =>
            Object.freeze({ segmentId, baseCustomers: customers, randomOffset: 0 as const }),
          ),
      ),
      reputation: state.simulation.tavern.reputation,
      facts: state.story.facts,
      modifiers: Object.freeze([]),
    });

    expect(patchedProgram.rules.endings.evaluate(endingInput)).toEqual(
      baseProgram.rules.endings.evaluate(endingInput),
    );
    expect(endingReplacement).toHaveBeenCalledTimes(1);
    expect(patchedProgram.rules.demand.preview(demandInput)).toEqual(
      baseProgram.rules.demand.preview(demandInput),
    );
    expect(endingReplacement).toHaveBeenCalledTimes(1);
  });

  it("never merges an undeclared Patch key into the materialized Program", () => {
    const values = defaultPocSimulationPatchValuesV1();
    const unknownRule = vi.fn();
    const valuesWithUnknown = Object.freeze({
      ...values,
      unknownRule,
    });
    const program = materializePocSimulationProgramV1(valuesWithUnknown);

    expect(program).not.toHaveProperty("unknownRule");
    expect(program.rules).not.toHaveProperty("unknownRule");
    expect(Object.keys(program.rules)).toEqual(["demand", "tavern", "checks", "endings"]);
    expect(unknownRule).not.toHaveBeenCalled();
  });
});

describe("PoC Semantic action contract", () => {
  it("derives immutable player-safe descriptors from the resolved GameQueries boundary", () => {
    const { queries } = createResolvedPocQueriesV1();
    const actions = createPocSemanticActionCatalogV1(queries);
    const runStart = actions.find(({ actionId }) => actionId === "action.run_start");

    expect(runStart).toMatchObject({
      actionId: "action.run_start",
      delivery: "direct",
      enabled: true,
      directInvocation: {
        kind: "invoke",
        actionId: "action.run_start",
        options: {},
      },
      options: [],
      form: null,
    });
    expect(actions.every(({ actionId, textId }) => actionId.length > 0 && textId.length > 0)).toBe(
      true,
    );
    for (const action of actions) {
      expect(action).not.toHaveProperty("snapshot");
      expect(action).not.toHaveProperty("state");
      expect(action).not.toHaveProperty("rng");
      expect(action).not.toHaveProperty("sequence");
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
    expectStrictJsonDataOnlyV1(actions);
    expectDeeplyFrozenV1(actions);

    if (runStart?.delivery !== "direct") throw new TypeError("missing direct run-start action");
    const preview = previewPocSemanticInvocationV1(queries, runStart.directInvocation);
    expect(preview).toMatchObject({
      allowed: true,
      command: { kind: "run.start" },
    });
  });

  it("uses forms for bounded combinatorial inputs and authored options for finite choices", () => {
    const { queries } = createResolvedPocQueriesV1();
    const selectedActionIds = Object.freeze([
      actionIdsV1[1],
      actionIdsV1[4],
      actionIdsV1[7],
      actionIdsV1[9],
    ] as const);
    const formAndChoiceQueries: PocGameQueriesV1 = Object.freeze({
      ...queries,
      getAvailableActions: () =>
        Object.freeze(selectedActionIds.map((actionId) => semanticActionViewV1(actionId))),
      getRunStartControl: () => null,
      getTavernOpeningControl: () => null,
      getNarrativeProjection: () => null,
    });
    const actions = createPocSemanticActionCatalogV1(formAndChoiceQueries);

    expect(actions.map(({ actionId, delivery }) => [actionId, delivery])).toEqual([
      ["action.purchase", "form"],
      ["action.service_plan", "form"],
      ["action.facility_window", "choices"],
      ["action.old_trade_road", "choices"],
    ]);
    expect(actions.find(({ actionId }) => actionId === "action.purchase")).toMatchObject({
      directInvocation: null,
      options: [],
      form: {
        kind: "purchase",
        actionId: "action.purchase",
        input: {
          lineLimit: pocStoryDataV1.balance.purchaseLineLimit,
          quantityPerLineLimit: pocStoryDataV1.balance.purchaseQuantityPerLineLimit,
        },
      },
    });
    expect(actions.find(({ actionId }) => actionId === "action.service_plan")).toMatchObject({
      directInvocation: null,
      options: [],
      form: {
        kind: "tavern_plan",
        actionId: "action.service_plan",
        input: {
          recipeLimit: Math.min(16, pocStoryDataV1.balance.menuRecipeLimit),
          portionsPerRecipeLimit: pocStoryDataV1.balance.menuPortionsPerRecipeLimit,
        },
      },
    });
    const facility = actions.find(({ actionId }) => actionId === "action.facility_window");
    const worldAction = actions.find(({ actionId }) => actionId === "action.old_trade_road");
    if (facility?.delivery !== "choices" || worldAction?.delivery !== "choices") {
      throw new TypeError("missing finite semantic choices");
    }
    expect(facility.options.map(({ optionId }) => optionId)).toEqual([...facilityIdsV1, "skip"]);
    expect(worldAction.options.map(({ optionId }) => optionId)).toEqual(choiceIdsV1.slice(5));
    for (const option of [...facility.options, ...worldAction.options]) {
      expect(Object.isFrozen(option), option.optionId).toBe(true);
      expect(Object.isFrozen(option.invocation), option.optionId).toBe(true);
      expect(Object.isFrozen(option.invocation.options), option.optionId).toBe(true);
    }
    expectDeeplyFrozenV1(actions);
  });

  it("keeps disabled Narrative choices visible in projection but out of invokable options", () => {
    const { state, queries } = createResolvedPocQueriesV1();
    const confirmation = Object.freeze({
      benefitTextIds: Object.freeze([]),
      mutuallyExcludedActionIds: Object.freeze([]),
      majorRiskTextIds: Object.freeze([]),
    });
    const narrative = Object.freeze({
      status: "active" as const,
      cursor: Object.freeze({
        sceneId: sceneIdsV1[1],
        nodeId: nodeIdsV1[2],
      }),
      stage: state.story.narrative.stage,
      speakerId: null,
      textId: null,
      choices: Object.freeze([
        Object.freeze({
          choiceId: choiceIdsV1[0],
          textId: pocTextIdsV1.choiceSupplierInvoiceIntellectBLabel,
          enabled: true,
          confirmation,
        }),
        Object.freeze({
          choiceId: choiceIdsV1[1],
          textId: pocTextIdsV1.choiceSupplierInvoicePayNormallyLabel,
          enabled: false,
          disabledReasonId: reasonIdsV1[56],
          confirmation,
        }),
      ]),
      latestResolvedCheck: null,
    }) satisfies NarrativeProjectionV1;
    const narrativeQueries: PocGameQueriesV1 = Object.freeze({
      ...queries,
      getAvailableActions: () => Object.freeze([]),
      getRunStartControl: () => null,
      getTavernOpeningControl: () => null,
      getNarrativeProjection: () => narrative,
    });
    const actions = createPocSemanticActionCatalogV1(narrativeQueries);
    const choose = actions.find(({ actionId }) => actionId === "action.narrative_choose");

    expect(narrative.choices).toHaveLength(2);
    if (choose?.delivery !== "choices") throw new TypeError("missing Narrative choice action");
    expect(choose.options).toHaveLength(1);
    expect(choose.options[0]).toMatchObject({
      optionId: choiceIdsV1[0],
      invocation: {
        actionId: "action.narrative_choose",
        options: {
          sceneId: sceneIdsV1[1],
          nodeId: nodeIdsV1[2],
          choiceId: choiceIdsV1[0],
        },
      },
    });
    expect(Object.isFrozen(choose.options[0])).toBe(true);
    expect(Object.isFrozen(choose.options[0]?.invocation)).toBe(true);
    expect(Object.isFrozen(choose.options[0]?.invocation.options)).toBe(true);
    expectDeeplyFrozenV1(actions);
  });

  it("parses every closed invocation shape and maps it to the exact typed command", () => {
    const vectors = [
      [
        {
          kind: "invoke",
          actionId: "action.choose_life_policy",
          options: { policyId: policyIdsV1[0] },
        },
        { kind: "policy.choose", policyId: policyIdsV1[0] },
      ],
      [
        {
          kind: "invoke",
          actionId: "action.purchase",
          options: { lines: [{ ingredientId: ingredientIdsV1[0], quantity: 1 }] },
        },
        { kind: "inventory.buy", lines: [{ ingredientId: ingredientIdsV1[0], quantity: 1 }] },
      ],
      [
        { kind: "invoke", actionId: "action.prepare_food", options: {} },
        { kind: "actor.prepare_food" },
      ],
      [{ kind: "invoke", actionId: "action.rest", options: {} }, { kind: "actor.rest" }],
      [
        {
          kind: "invoke",
          actionId: "action.service_plan",
          options: {
            plan: {
              mode: "manual",
              menu: [{ recipeId: recipeIdsV1[0], portions: 1 }],
            },
          },
        },
        {
          kind: "tavern.plan.set",
          plan: { mode: "manual", menu: [{ recipeId: recipeIdsV1[0], portions: 1 }] },
        },
      ],
      [
        { kind: "invoke", actionId: "action.advance_phase", options: {} },
        { kind: "calendar.advance_phase" },
      ],
      [{ kind: "invoke", actionId: "action.pay_levy", options: {} }, { kind: "levy.pay" }],
      [
        {
          kind: "invoke",
          actionId: "action.facility_window",
          options: { choice: { kind: "skip" } },
        },
        {
          kind: "facility.choose",
          opportunityId: actionIdsV1[7],
          choice: { kind: "skip" },
        },
      ],
      [
        { kind: "invoke", actionId: "action.repair_sign_with_heroine", options: {} },
        { kind: "story.action.start", actionId: actionIdsV1[8] },
      ],
      [
        {
          kind: "invoke",
          actionId: "action.old_trade_road",
          options: { optionId: choiceIdsV1[5] },
        },
        { kind: "world.action.begin", actionId: actionIdsV1[9], optionId: choiceIdsV1[5] },
      ],
      [
        { kind: "invoke", actionId: "action.apologize_to_heroine", options: {} },
        { kind: "story.action.start", actionId: actionIdsV1[10] },
      ],
      [{ kind: "invoke", actionId: "action.run_start", options: {} }, { kind: "run.start" }],
      [
        { kind: "invoke", actionId: "action.tavern_opening_start", options: {} },
        { kind: "tavern.opening.start" },
      ],
      [
        { kind: "invoke", actionId: "action.tavern_opening_continue", options: {} },
        { kind: "tavern.opening.continue" },
      ],
      [
        { kind: "invoke", actionId: "action.tavern_opening_finalize", options: {} },
        { kind: "tavern.opening.finalize" },
      ],
      [
        { kind: "invoke", actionId: "action.world_action_complete", options: {} },
        { kind: "world.action.complete" },
      ],
      [
        { kind: "invoke", actionId: "action.narrative_advance", options: {} },
        { kind: "narrative.advance" },
      ],
      [
        {
          kind: "invoke",
          actionId: "action.narrative_choose",
          options: {
            sceneId: sceneIdsV1[1],
            nodeId: nodeIdsV1[2],
            choiceId: choiceIdsV1[0],
          },
        },
        {
          kind: "narrative.choose",
          sceneId: sceneIdsV1[1],
          nodeId: nodeIdsV1[2],
          choiceId: choiceIdsV1[0],
        },
      ],
    ] as const;

    expect(Object.keys(pocSemanticInvocationOptionsSchemaByActionV1).sort()).toEqual(
      [...actionIdsV1, ...pocSemanticWorkflowActionIdsV1].sort(),
    );
    for (const [invocationValue, expectedCommand] of vectors) {
      const invocation = parsePocSemanticInvocationV1(invocationValue);
      expect(invocation).toEqual(invocationValue);
      expectDeeplyFrozenV1(invocation);
      expect(commandForPocSemanticInvocationV1(invocation)).toEqual(expectedCommand);
    }
  });

  it("rejects unknown actions, malformed envelopes, extra options, callbacks, and State fragments", () => {
    expectSemanticErrorCodeV1(
      { kind: "invoke", actionId: "action.not_registered", options: {} },
      "semantic.action_unknown",
    );
    expectSemanticErrorCodeV1(
      { kind: "preview", actionId: "action.rest", options: {} },
      "semantic.invocation_invalid",
    );
    expectSemanticErrorCodeV1(
      { kind: "invoke", actionId: "action.rest", options: {}, extra: true },
      "semantic.invocation_invalid",
    );
    expectSemanticErrorCodeV1(
      { kind: "invoke", actionId: "action.rest", options: { callback: () => undefined } },
      "semantic.options_invalid",
    );
    expectSemanticErrorCodeV1(
      { kind: "invoke", actionId: "action.purchase", options: {} },
      "semantic.options_invalid",
    );
    expectSemanticErrorCodeV1(
      {
        kind: "invoke",
        actionId: "action.purchase",
        options: { lines: [], snapshot: { state: {} } },
      },
      "semantic.options_invalid",
    );
    expectSemanticErrorCodeV1(
      {
        kind: "invoke",
        actionId: "action.purchase",
        options: { lines: [{ ingredientId: ingredientIdsV1[0], quantity: 0 }] },
      },
      "semantic.options_invalid",
    );

    let getterCalled = false;
    const accessorEnvelope = {
      actionId: "action.rest",
      options: {},
    } as Record<string, unknown>;
    Object.defineProperty(accessorEnvelope, "kind", {
      enumerable: true,
      get() {
        getterCalled = true;
        return "invoke";
      },
    });
    expectSemanticErrorCodeV1(accessorEnvelope, "semantic.invocation_invalid");
    expect(getterCalled).toBe(false);
  });

  it("projects Session results without Snapshot, facts, RNG, or internal fault detail", () => {
    const { snapshot, queries } = createResolvedPocQueriesV1();
    const rejectedPreview = queries.previewCommand({ kind: "world.action.complete" });
    if (rejectedPreview.allowed) throw new TypeError("expected rejected WorldAction completion");
    const reason = rejectedPreview.reasons[0];
    if (reason === undefined) throw new TypeError("missing rejection reason");

    const committed = projectPocSemanticActionResultV1({
      kind: "executed",
      execution: { kind: "committed", snapshot, facts: [] },
    });
    const rejected = projectPocSemanticActionResultV1({
      kind: "executed",
      execution: { kind: "rejected", snapshot, reasons: [reason] },
    });
    const faulted = projectPocSemanticActionResultV1({
      kind: "executed",
      execution: {
        kind: "faulted",
        snapshot,
        fault: {
          category: "command_handler",
          code: "command.handler_threw",
          ruleSlot: null,
          message: "private failure",
          stack: "private stack",
        },
      },
    });

    expect(committed).toEqual({ kind: "committed" });
    expect(rejected).toEqual({ kind: "rejected", reasons: [reason] });
    expect(faulted).toEqual({ kind: "faulted", code: "gameplay_fault" });
    for (const code of [
      "session_unavailable",
      "fault_paused",
      "hmr_invalidated",
      "validation_failed",
    ] as const) {
      expect(projectPocSemanticActionResultV1({ kind: "not_executed", code })).toEqual({
        kind: "not_executed",
        code,
      });
    }
    for (const result of [committed, rejected, faulted]) {
      expect(result).not.toHaveProperty("snapshot");
      expect(result).not.toHaveProperty("facts");
      expect(result).not.toHaveProperty("fault");
      expect(Object.isFrozen(result)).toBe(true);
    }
  });

  it("keeps delivery, invocation, form, result, and resolved aliases exact at compile time", () => {
    type SemanticActionIdV1 =
      | "action.choose_life_policy"
      | "action.purchase"
      | "action.prepare_food"
      | "action.rest"
      | "action.service_plan"
      | "action.advance_phase"
      | "action.pay_levy"
      | "action.facility_window"
      | "action.repair_sign_with_heroine"
      | "action.old_trade_road"
      | "action.apologize_to_heroine"
      | "action.run_start"
      | "action.tavern_opening_start"
      | "action.tavern_opening_continue"
      | "action.tavern_opening_finalize"
      | "action.world_action_complete"
      | "action.narrative_advance"
      | "action.narrative_choose";
    type PurchaseDescriptorV1 = Extract<
      PocSemanticActionDescriptorV1,
      { readonly actionId: "action.purchase" }
    >;
    type RestDescriptorV1 = Extract<
      PocSemanticActionDescriptorV1,
      { readonly actionId: "action.rest" }
    >;
    type NarrativeDescriptorV1 = Extract<
      PocSemanticActionDescriptorV1,
      { readonly actionId: "action.narrative_choose" }
    >;
    type MismatchedDirectV1 = {
      readonly actionId: "action.rest";
      readonly textId: TextId;
      readonly enabled: true;
      readonly reasons: readonly [];
      readonly confirmation: null;
      readonly delivery: "direct";
      readonly directInvocation: Extract<
        PocSemanticInvocationV1,
        { readonly actionId: "action.prepare_food" }
      >;
      readonly options: readonly [];
      readonly form: null;
    };

    expectTypeOf<
      keyof PocSemanticInvocationOptionsByActionV1
    >().toEqualTypeOf<SemanticActionIdV1>();
    expectTypeOf<keyof PocSemanticDeliveryKindByActionV1>().toEqualTypeOf<SemanticActionIdV1>();
    expectTypeOf<{ readonly extra: true }>().not.toMatchTypeOf<PocNoSemanticOptionsV1>();
    expectTypeOf<PurchaseDescriptorV1["delivery"]>().toEqualTypeOf<"form">();
    expectTypeOf<RestDescriptorV1["delivery"]>().toEqualTypeOf<"direct">();
    expectTypeOf<NarrativeDescriptorV1["delivery"]>().toEqualTypeOf<"choices">();
    expectTypeOf<
      Extract<PurchaseDescriptorV1, { readonly delivery: "direct" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<RestDescriptorV1, { readonly delivery: "choices" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<
      NonNullable<PurchaseDescriptorV1["form"]>["actionId"]
    >().toEqualTypeOf<"action.purchase">();
    expectTypeOf<RestDescriptorV1["directInvocation"]["actionId"]>().toEqualTypeOf<"action.rest">();
    expectTypeOf<
      NarrativeDescriptorV1["options"][number]["invocation"]["actionId"]
    >().toEqualTypeOf<"action.narrative_choose">();
    expectTypeOf<MismatchedDirectV1>().not.toMatchTypeOf<PocSemanticActionDescriptorV1>();

    expectTypeOf<PocSemanticActionOptionV1<PocSemanticInvocationV1>>().toHaveProperty("invocation");
    expectTypeOf<keyof PocSemanticFormByActionV1>().toEqualTypeOf<
      "action.purchase" | "action.service_plan"
    >();
    expectTypeOf<PocSemanticConfirmationV1>().toHaveProperty("benefitTextIds");
    expectTypeOf<PocSemanticConfirmationV1>().toHaveProperty("mutuallyExcludedActionIds");
    expectTypeOf<PocSemanticConfirmationV1>().toHaveProperty("majorRiskTextIds");
    expectTypeOf<PocSemanticPreviewV1>().toMatchTypeOf<{ readonly allowed: boolean }>();
    expectTypeOf<PocSemanticActionResultV1>().toMatchTypeOf<
      | { readonly kind: "committed" }
      | { readonly kind: "rejected" }
      | { readonly kind: "not_executed" }
      | { readonly kind: "faulted" }
    >();

    expectTypeOf<PocResolvedGameV1["presentation"]>().toEqualTypeOf<PocPresentationV1>();
    expectTypeOf<PocResolvedGameV1["sceneGraph"]>().toEqualTypeOf<PocStageSceneGraphV1>();
    expectTypeOf<PocResolvedGameV1["assets"]>().toEqualTypeOf<PocResolvedAssetsV1>();
    expectTypeOf(resolveStoryForTestV1(pocStoryEntryV1)).toEqualTypeOf<PocResolvedGameV1>();
  });
});

describe("week.poc_001 identity", () => {
  it("freezes the Story and six deterministic runs", () => {
    expect(pocStoryIdentityV1).toEqual({ id: "week.poc_001", revision: 1 });
    expect(pocStateContractRevisionV1).toBe(1);
    expect(pocReferenceSeedV1).toBe(0x00023049);
    expect(pocReferenceRunIdsV1).toEqual({
      "strategy.cash_first": "00000000-0000-4000-8000-000000000101",
      "strategy.relationship_first": "00000000-0000-4000-8000-000000000102",
      "strategy.investigation_first": "00000000-0000-4000-8000-000000000103",
      "strategy.full_delegation": "00000000-0000-4000-8000-000000000104",
      "strategy.two_closures_recovery": "00000000-0000-4000-8000-000000000105",
      "strategy.explicit_failure": "00000000-0000-4000-8000-000000000106",
    });
    expect(new Set(Object.values(pocReferenceRunIdsV1)).size).toBe(6);
    expect(Object.values(pocReferenceRunIdsV1).map(parseRunId)).toEqual(
      Object.values(pocReferenceRunIdsV1),
    );
    expectDeeplyFrozenV1(pocStoryIdentityV1);
    expectDeeplyFrozenV1(pocReferenceRunIdsV1);
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

describe("closed gameplay content ID catalog", () => {
  it("matches the authored policy, actor, economy, and Scheduler namespaces", () => {
    expect(policyIdsV1).toEqual(["policy.balanced", "policy.night_owl"]);
    expect(actorIdsV1).toEqual(["actor.player", "actor.heroine"]);
    expect(characterIdsV1).toEqual(["character.narrator", "character.player", "character.heroine"]);
    expect(customerSegmentIdsV1).toEqual(["segment.locals", "segment.travelers"]);
    expect(modifierSourceIdsV1).toEqual(["modifier_source.reputation", "modifier_source.war_clue"]);
    expect(eventIdsV1).toEqual([
      "event.tutorial_first_service",
      "event.supplier_invoice",
      "event.helper_available",
      "event.facility_window",
      "event.levy_due",
    ]);
    expect(checkpointIdsV1).toEqual([
      "checkpoint.tutorial_first_service",
      "checkpoint.supplier_invoice",
      "checkpoint.helper_available",
      "checkpoint.facility_window",
      "checkpoint.levy_due",
    ]);
    expect(weightedGroupIdsV1).toEqual([]);
  });

  it("matches every player Action and economy definition in authored order", () => {
    expect(actionIdsV1).toEqual([
      "action.choose_life_policy",
      "action.purchase",
      "action.prepare_food",
      "action.rest",
      "action.service_plan",
      "action.advance_phase",
      "action.pay_levy",
      "action.facility_window",
      "action.repair_sign_with_heroine",
      "action.old_trade_road",
      "action.apologize_to_heroine",
    ]);
    expect(ingredientIdsV1).toEqual([
      "ingredient.coarse_grain",
      "ingredient.root_vegetable",
      "ingredient.ale",
      "ingredient.fresh_meat",
      "ingredient.herb",
    ]);
    expect(recipeIdsV1).toEqual([
      "recipe.grain_root_porridge",
      "recipe.ale_bread",
      "recipe.hunter_stew",
      "recipe.traveler_roast",
    ]);
    expect(facilityIdsV1).toEqual(["facility.cold_storage", "facility.comfortable_bed"]);
    expect(auraIdsV1).toEqual(["heroine.angry", "tavern.sign_repaired", "player.adventure_strain"]);
    expect(serviceModeIdsV1).toEqual(["manual", "assisted", "delegated", "closed"]);
    expect(itemIdsV1).toEqual([]);
  });

  it("matches every Narrative, Progression, Check, and Ending ID", () => {
    expect(choiceIdsV1).toEqual([
      "choice.supplier_invoice.intellect_b",
      "choice.supplier_invoice.pay_normally",
      "choice.repair_sign.cooperate",
      "choice.repair_sign.decline",
      "choice.repair_sign.conflict",
      "choice.old_trade_road.basic",
      "choice.old_trade_road.prepared",
    ]);
    expect(checkIdsV1).toEqual(["check.old_trade_road"]);
    expect(worldStepIdsV1).toEqual([
      "step.old_trade_road.departure",
      "step.old_trade_road.investigation",
    ]);
    expect(sceneIdsV1).toEqual([
      "scene.manifest_start",
      "scene.supplier_invoice",
      "scene.facility_window",
      "scene.levy_due",
      "scene.repair_sign_with_heroine",
      "scene.apologize_to_heroine",
      "scene.old_trade_road.departure",
      "scene.old_trade_road.investigation",
    ]);
    expect(nodeIdsV1).toEqual([
      "node.manifest_start.card",
      "node.manifest_start.end",
      "node.supplier_invoice.choice",
      "node.supplier_invoice.end",
      "node.facility_window.notice",
      "node.facility_window.end",
      "node.levy_due.notice",
      "node.levy_due.end",
      "node.repair_sign.intro",
      "node.repair_sign.choice",
      "node.repair_sign.end",
      "node.apology.line",
      "node.apology.end",
      "node.old_trade_road.departure.line",
      "node.old_trade_road.departure.end",
      "node.old_trade_road.investigation.line",
      "node.old_trade_road.investigation.end",
    ]);
    expect(factIdsV1).toEqual([
      "fact.war_clue",
      "fact.tutorial_first_service_completed",
      "fact.invoice_checked_this_week",
    ]);
    expect(questIdsV1).toEqual([]);
    expect(outcomeIdsV1).toEqual(["outcome.relationship_opportunity", "outcome.investigation"]);
    expect(checkBandIdsV1).toEqual([
      "band.investigation.setback",
      "band.investigation.success-with-cost",
      "band.investigation.complete",
      "band.investigation.exceptional",
    ]);
    expect(endingIdsV1).toEqual(["ending.stable", "ending.danger", "ending.failed_arrears"]);
  });

  it("freezes the complete authored Reason namespace", () => {
    expect(reasonIdsV1).toEqual([
      "reason.action.purchase",
      "reason.action.prepare_food",
      "reason.action.rest",
      "reason.action.facility_build",
      "reason.action.facility_skip",
      "reason.recovery.balanced_night",
      "reason.recovery.night_owl_night",
      "reason.recovery.heroine_night",
      "reason.service.manual",
      "reason.service.assisted",
      "reason.service.delegated",
      "reason.service.closed",
      "reason.service.emergency_closed",
      "reason.ledger.purchase",
      "reason.ledger.wage",
      "reason.ledger.opening_fee",
      "reason.ledger.revenue",
      "reason.ledger.discarded_food",
      "reason.ledger.spoiled_ingredient",
      "reason.ledger.facility_build",
      "reason.ledger.world_action_cost",
      "reason.ledger.levy",
      "reason.modifier.cold_storage_shelf_life",
      "reason.modifier.comfortable_bed_player_recovery",
      "reason.modifier.comfortable_bed_heroine_recovery",
      "reason.modifier.reputation_demand",
      "reason.modifier.war_clue_demand",
      "reason.aura.sign_repaired",
      "reason.aura.heroine_angry",
      "reason.aura.adventure_strain",
      "reason.event.tutorial_completed",
      "reason.event.invoice_checked",
      "reason.event.helper_unlocked",
      "reason.obligation.levy_forecast",
      "reason.relationship.repair_sign",
      "reason.relationship.repair_sign_declined",
      "reason.relationship.repair_sign_conflict",
      "reason.relationship.apology",
      "reason.investigation.begin",
      "reason.investigation.setback",
      "reason.investigation.success_with_cost",
      "reason.investigation.complete",
      "reason.investigation.exceptional",
      "reason.ending.stable",
      "reason.ending.danger",
      "reason.ending.arrears",
      "reason.ending.reputation_crisis",
      "reason.unavailable.story_window_closed",
      "reason.unavailable.relationship_resolved",
      "reason.unavailable.investigation_resolved",
      "reason.unavailable.mutually_exclusive",
      "reason.unavailable.heroine_not_angry",
      "reason.unavailable.facility_decided",
      "reason.unavailable.tax_not_visible",
      "reason.unavailable.policy_not_ready",
      "reason.unavailable.service_mode_locked",
      "reason.unavailable.helper_locked",
      "reason.unavailable.intellect_b_required",
      "reason.debug.state_override",
      "reason.debug.cash_adjustment",
      "reason.debug.aura_adjustment",
      "reason.debug.narrative_jump",
      "reason.debug.rng_override",
    ]);
    expect(reasonIdsV1).toHaveLength(63);
  });

  it("freezes every persistent outcome token before State construction", () => {
    expect(relationshipOutcomeTokensV1).toEqual([
      "relationship.pending",
      "relationship.completed",
      "relationship.abandoned",
      "relationship.reconciled",
      "relationship.unresolved_conflict",
    ]);
    expect(investigationOutcomeTokensV1).toEqual([
      "investigation.not_attempted",
      "investigation.missed_by_choice",
      "investigation.setback",
      "investigation.success_with_cost",
      "investigation.complete",
      "investigation.exceptional",
    ]);
    expect(storyTokenIdsV1).toEqual([
      ...relationshipOutcomeTokensV1,
      ...investigationOutcomeTokensV1,
    ]);
  });
});

describe("closed Story presentation ID catalog", () => {
  it("freezes the exact Stage, Interaction, and heroine identities", () => {
    expect(pocStageSceneIdsV1).toEqual([
      "stage_scene.poc.main_menu",
      "stage_scene.poc.tavern",
      "stage_scene.poc.market",
      "stage_scene.poc.world_map",
      "stage_scene.poc.week_summary",
    ]);
    expect(pocStageSceneVariantIdsV1).toEqual([
      "stage_variant.poc.main_menu.default",
      "stage_variant.poc.tavern.day",
      "stage_variant.poc.tavern.evening",
      "stage_variant.poc.market.day",
      "stage_variant.poc.world_map.default",
      "stage_variant.poc.week_summary.default",
    ]);
    expect(pocInteractionSurfaceIdsV1).toEqual([
      "surface.poc.heroine",
      "surface.poc.tavern",
      "surface.poc.market",
      "surface.poc.world_map",
    ]);
    expect(pocInteractionTargetIdsV1).toEqual([
      "target.poc.heroine.figure",
      "target.poc.tavern.service",
      "target.poc.market.purchase",
      "target.poc.world_map.old_trade_road",
    ]);
    expect(pocInteractionBehaviorIdsV1).toEqual([
      "behavior.poc.heroine.open_profile",
      "behavior.poc.heroine.repair_sign",
      "behavior.poc.heroine.apologize",
      "behavior.poc.tavern.service_plan",
      "behavior.poc.market.purchase",
      "behavior.poc.world_map.old_trade_road",
    ]);
    expect(pocHitAreaIdsV1).toEqual(["hit_area.poc.heroine.figure"]);
    expect(pocPresentationCharacterIdsV1).toEqual(["character.poc.heroine"]);
    expect(pocHeroineCharacterRigIdsV1).toEqual(["rig.poc.heroine.default"]);
    expect(pocHeroineCharacterPoseIdsV1).toEqual(["pose.poc.heroine.idle"]);
    expect(pocHeroineCharacterExpressionIdsV1).toEqual(["expression.poc.heroine.neutral"]);
    expect(pocHeroineCharacterActivityIdsV1).toEqual(["activity.poc.heroine.idle"]);
    expect(pocHitMapIdsV1).toEqual(["hit_map.poc.heroine.idle"]);
    expect(pocPresentationProviderIdsV1).toEqual([
      "provider.poc.intent.open_profile",
      "provider.poc.semantic.repair_sign_with_heroine",
      "provider.poc.semantic.apologize_to_heroine",
      "provider.poc.semantic.service_plan",
      "provider.poc.semantic.purchase",
      "provider.poc.semantic.old_trade_road",
    ]);
  });

  it("freezes the complete fallback asset demand and authored rig order", () => {
    expect(assetIdsV1).toEqual([
      "asset.poc.character.heroine.back_hair.standard",
      "asset.poc.character.heroine.costume_body.standard",
      "asset.poc.character.heroine.face.neutral",
      "asset.poc.character.heroine.front_hair.standard",
      "asset.poc.character.heroine.accessory.standard",
      "asset.poc.character.heroine.static.standard",
      "asset.poc.background.main_menu.standard",
      "asset.poc.background.tavern.day.standard",
      "asset.poc.background.tavern.evening.standard",
      "asset.poc.background.market.day.standard",
      "asset.poc.background.world_map.standard",
      "asset.poc.background.week_summary.standard",
    ]);
    expect(pocHeroineAppearanceLayerOrderV1).toEqual([
      "appearance_layer.poc.heroine.back_hair",
      "appearance_layer.poc.heroine.costume_body",
      "appearance_layer.poc.heroine.face",
      "appearance_layer.poc.heroine.front_hair",
      "appearance_layer.poc.heroine.accessory",
      "appearance_layer.poc.heroine.held_prop",
      "appearance_layer.poc.heroine.foreground_effect",
    ]);
    expect(assetIdsV1.slice(0, 5).map((id) => id.split(".").at(-2))).toEqual([
      "back_hair",
      "costume_body",
      "face",
      "front_hair",
      "accessory",
    ]);
  });

  it("keeps world symbols and workflow controls closed outside generic actions", () => {
    expect(pocGameSymbolIdsV1).toEqual([
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
    ]);
    expect(pocSemanticWorkflowActionIdsV1).toEqual([
      "action.run_start",
      "action.tavern_opening_start",
      "action.tavern_opening_continue",
      "action.tavern_opening_finalize",
      "action.world_action_complete",
      "action.narrative_advance",
      "action.narrative_choose",
    ]);
    expect(new Set([...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]).size).toBe(18);
  });

  it("freezes one complete provisional TextId authority", () => {
    const catalog = new Set<string>(textIdsV1);

    expect(pocNoContentFilterOptionsTextIdV1).toBe("text.poc.settings.content_filter.none");
    expect(pocStoryTitleTextIdV1).toBe("text.poc.story.title");
    expect(textIdsV1).toEqual(Object.values(pocTextIdsV1));
    expect(textIdsV1).toHaveLength(200);
    expect(new Set(textIdsV1).size).toBe(textIdsV1.length);
    expect(textIdsV1.every((id) => id.startsWith("text.poc."))).toBe(true);
    expect(textIdsV1.map(parseTextId)).toEqual(textIdsV1);
    expect(textIdsV1).toContain(pocStoryTitleTextIdV1);
    expect(textIdsV1).toContain(pocNoContentFilterOptionsTextIdV1);
    expect(textIdsV1.some((id) => id.includes("confirmation"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("obligation"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("stage"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("behavior"))).toBe(true);

    for (const reasonId of reasonIdsV1) {
      expect(catalog.has(`text.poc.${reasonId}`), reasonId).toBe(true);
    }
    for (const actionId of [...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]) {
      expect(catalog.has(`text.poc.${actionId}.label`), actionId).toBe(true);
    }
    for (const id of [...ingredientIdsV1, ...recipeIdsV1, ...policyIdsV1, ...facilityIdsV1]) {
      expect(catalog.has(`text.poc.${id}.name`), id).toBe(true);
    }
    for (const choiceId of choiceIdsV1) {
      expect(catalog.has(`text.poc.${choiceId}.label`), choiceId).toBe(true);
    }
    for (const endingId of endingIdsV1) {
      expect(catalog.has(`text.poc.${endingId}.name`), endingId).toBe(true);
    }
    for (const serviceMode of serviceModeIdsV1) {
      expect(catalog.has(`text.poc.service_mode.${serviceMode}.name`), serviceMode).toBe(true);
    }
    expect(pocTextIdsV1.choiceFacilitySkipLabel).toBe("text.poc.choice.facility.skip.label");
  });
});

describe("ID parser, brand, and immutability guarantees", () => {
  it("round-trips every non-empty registry through its public parser", () => {
    const vectors: readonly [
      label: string,
      values: readonly unknown[],
      parser: (value: unknown) => unknown,
    ][] = [
      ["PolicyId", policyIdsV1, parsePolicyId],
      ["ActorId", actorIdsV1, parseActorId],
      ["CharacterId", characterIdsV1, parseCharacterId],
      ["CustomerSegmentId", customerSegmentIdsV1, parseCustomerSegmentId],
      ["ModifierSourceId", modifierSourceIdsV1, parseModifierSourceId],
      ["EventId", eventIdsV1, parseEventId],
      ["CheckpointId", checkpointIdsV1, parseCheckpointId],
      ["ActionId", actionIdsV1, parseActionId],
      ["IngredientId", ingredientIdsV1, parseIngredientId],
      ["RecipeId", recipeIdsV1, parseRecipeId],
      ["FacilityId", facilityIdsV1, parseFacilityId],
      ["AuraId", auraIdsV1, parseAuraId],
      ["ServiceMode", serviceModeIdsV1, parseServiceMode],
      ["ChoiceId", choiceIdsV1, parseChoiceId],
      ["CheckId", checkIdsV1, parseCheckId],
      ["WorldStepId", worldStepIdsV1, parseWorldStepId],
      ["SceneId", sceneIdsV1, parseSceneId],
      ["NodeId", nodeIdsV1, parseNodeId],
      ["FactId", factIdsV1, parseFactId],
      ["OutcomeId", outcomeIdsV1, parseOutcomeId],
      ["CheckBandId", checkBandIdsV1, parseCheckBandId],
      ["EndingId", endingIdsV1, parseEndingId],
      ["ReasonId", reasonIdsV1, parseReasonId],
      ["StoryToken", storyTokenIdsV1, parseStoryToken],
      ["TextId", textIdsV1, parseTextId],
      ["AssetId", assetIdsV1, parseAssetId],
      ["StageSceneId", pocStageSceneIdsV1, parseStageSceneId],
      ["StageSceneVariantId", pocStageSceneVariantIdsV1, parseStageSceneVariantId],
      ["Presentation CharacterId", pocPresentationCharacterIdsV1, parseCharacterId],
      ["CharacterRigId", pocHeroineCharacterRigIdsV1, parseCharacterRigId],
      ["CharacterPoseId", pocHeroineCharacterPoseIdsV1, parseCharacterPoseId],
      ["CharacterExpressionId", pocHeroineCharacterExpressionIdsV1, parseCharacterExpressionId],
      ["CharacterActivityId", pocHeroineCharacterActivityIdsV1, parseCharacterActivityId],
      ["HitMapId", pocHitMapIdsV1, parseHitMapId],
      ["InteractionSurfaceId", pocInteractionSurfaceIdsV1, parseInteractionSurfaceId],
      ["InteractionTargetId", pocInteractionTargetIdsV1, parseInteractionTargetId],
      ["InteractionBehaviorId", pocInteractionBehaviorIdsV1, parseInteractionBehaviorId],
      ["AppearanceLayerId", pocHeroineAppearanceLayerOrderV1, parseAppearanceLayerId],
      ["HitAreaId", pocHitAreaIdsV1, parseHitAreaId],
      ["PresentationProviderId", pocPresentationProviderIdsV1, parsePresentationProviderId],
      ["Workflow ActionId", pocSemanticWorkflowActionIdsV1, parseActionId],
    ];

    for (const [label, values, parser] of vectors) {
      expect(values.map(parser), label).toEqual(values);
    }
    expect(parseCharacterRigId(pocHeroinePresentationIdsV1.rigId)).toBe(
      pocHeroinePresentationIdsV1.rigId,
    );
    expect(parseCharacterPoseId(pocHeroinePresentationIdsV1.poseId)).toBe(
      pocHeroinePresentationIdsV1.poseId,
    );
    expect(parseCharacterExpressionId(pocHeroinePresentationIdsV1.expressionId)).toBe(
      pocHeroinePresentationIdsV1.expressionId,
    );
    expect(parseCharacterActivityId(pocHeroinePresentationIdsV1.activityId)).toBe(
      pocHeroinePresentationIdsV1.activityId,
    );
    expect(parseHitMapId(pocHeroinePresentationIdsV1.hitMapId)).toBe(
      pocHeroinePresentationIdsV1.hitMapId,
    );
  });

  it("keeps Event and Action runtime namespaces mutually exclusive", () => {
    expect(() => parseActionId(eventIdsV1[0])).toThrowError(TypeError);
    expect(() => parseEventId(actionIdsV1[0])).toThrowError(TypeError);
  });

  it("deep-freezes every public registry", () => {
    for (const registry of [
      policyIdsV1,
      actorIdsV1,
      characterIdsV1,
      customerSegmentIdsV1,
      modifierSourceIdsV1,
      eventIdsV1,
      checkpointIdsV1,
      weightedGroupIdsV1,
      actionIdsV1,
      ingredientIdsV1,
      recipeIdsV1,
      facilityIdsV1,
      auraIdsV1,
      serviceModeIdsV1,
      choiceIdsV1,
      checkIdsV1,
      worldStepIdsV1,
      sceneIdsV1,
      nodeIdsV1,
      factIdsV1,
      questIdsV1,
      outcomeIdsV1,
      checkBandIdsV1,
      endingIdsV1,
      reasonIdsV1,
      itemIdsV1,
      relationshipOutcomeTokensV1,
      investigationOutcomeTokensV1,
      storyTokenIdsV1,
      pocTextIdsV1,
      textIdsV1,
      assetIdsV1,
      pocStageSceneIdsV1,
      pocStageSceneVariantIdsV1,
      pocInteractionSurfaceIdsV1,
      pocInteractionTargetIdsV1,
      pocInteractionBehaviorIdsV1,
      pocPresentationCharacterIdsV1,
      pocHeroineCharacterRigIdsV1,
      pocHeroineCharacterPoseIdsV1,
      pocHeroineCharacterExpressionIdsV1,
      pocHeroineCharacterActivityIdsV1,
      pocHitMapIdsV1,
      pocHitAreaIdsV1,
      pocPresentationProviderIdsV1,
      pocHeroinePresentationIdsV1,
      pocHeroineAppearanceLayerOrderV1,
      pocGameSymbolIdsV1,
      pocSemanticWorkflowActionIdsV1,
    ]) {
      expectDeeplyFrozenV1(registry);
    }
  });

  it("keeps compile-time ID brands distinct", () => {
    expectTypeOf<ActionId>().not.toMatchTypeOf<EventId>();
    expectTypeOf<SceneId>().not.toMatchTypeOf<StageSceneId>();
    expectTypeOf<ActorId>().not.toMatchTypeOf<ReturnType<typeof parseCharacterId>>();
    expectTypeOf<IngredientId>().not.toMatchTypeOf<RecipeId>();
    expectTypeOf<OutcomeId>().not.toMatchTypeOf<CheckBandId>();
    expectTypeOf<TextId>().not.toMatchTypeOf<AssetId>();
    expectTypeOf<CharacterRigId>().not.toMatchTypeOf<ReturnType<typeof parseCharacterPoseId>>();
    expectTypeOf<AppearanceLayerId>().not.toMatchTypeOf<HitMapId>();
    expectTypeOf<InteractionSurfaceId>().not.toMatchTypeOf<InteractionTargetId>();
    expectTypeOf<InteractionTargetId>().not.toMatchTypeOf<InteractionBehaviorId>();
  });
});
