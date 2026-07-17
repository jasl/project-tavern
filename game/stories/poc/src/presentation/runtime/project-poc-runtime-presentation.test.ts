// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { parseAppearanceLayerId } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";
import {
  initialInteractionSessionStateV1,
  type RuntimePresentationProjectionInputV1,
  validateRuntimeInteractionSurfaceV1,
} from "@sillymaker/ui";
import { describe, expect, it } from "vitest";

import { pocTextIdsV1, policyIdsV1 } from "../../content/ids.js";
import type { NarrativeProjectionV1, PocGameViewV1 } from "../../gameplay/contracts/types.js";
import { createPocStoryHarnessV1, fixedPocBootstrapV1 } from "../../testing/poc-story-harness.js";
import { pocResolvedPresentationCatalogV1 } from "../assets.js";
import { pocContentMaturityPolicyV1 } from "../content-maturity-policy.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";
import type {
  PocPresentationUiStateV1,
  PocResolvedPresentationCatalogV1,
  PocSemanticPublicationV1,
} from "./contracts.js";
import { isPocNarrativeOpenV1 } from "./contracts.js";
import { projectPocRuntimePresentationV1 } from "./project-poc-runtime-presentation.js";

const baselineSemanticV1 = createPocStoryHarnessV1({
  bootstrap: fixedPocBootstrapV1(),
}).semantic.observe();

const emptyActionsV1 = Object.freeze([]) satisfies readonly PocSemanticActionDescriptorV1[];
const repairInvocationV1 = Object.freeze({
  kind: "invoke",
  actionId: "action.repair_sign_with_heroine",
  options: Object.freeze({}),
}) satisfies Extract<
  PocSemanticInvocationV1,
  { readonly actionId: "action.repair_sign_with_heroine" }
>;
const repairDescriptorV1 = Object.freeze({
  actionId: "action.repair_sign_with_heroine",
  textId: pocTextIdsV1.actionRepairSignWithHeroineLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: null,
  delivery: "direct",
  directInvocation: repairInvocationV1,
  options: Object.freeze([]) satisfies readonly [],
  form: null,
}) satisfies Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.repair_sign_with_heroine" }
>;

const narrativeFixtureV1 = Object.freeze({
  status: "idle",
  cursor: null,
  stage: Object.freeze({
    backgroundAssetId: null,
    characters: Object.freeze([]),
    transition: "cut",
  }),
  speakerId: null,
  textId: null,
  choices: Object.freeze([]),
  latestResolvedCheck: null,
}) satisfies DeepReadonly<NarrativeProjectionV1>;

function narrativeWithStatusV1(
  status: NarrativeProjectionV1["status"],
): DeepReadonly<NarrativeProjectionV1> {
  return Object.freeze({ ...narrativeFixtureV1, status });
}

async function enterActiveRunV1(
  semantic: ReturnType<typeof createPocStoryHarnessV1>["semantic"],
): Promise<void> {
  await semantic.dispatch({ kind: "invoke", actionId: "action.run_start", options: {} });
  for (let count = 0; semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("manifest Narrative did not settle");
    await semantic.dispatch({
      kind: "invoke",
      actionId: "action.narrative_advance",
      options: {},
    });
  }
  await semantic.dispatch({
    kind: "invoke",
    actionId: "action.choose_life_policy",
    options: { policyId: policyIdsV1[1] },
  });
}

function gameViewV1(phase: PocGameViewV1["hud"]["phase"]): DeepReadonly<PocGameViewV1> {
  return Object.freeze({
    ...baselineSemanticV1.game,
    hud: Object.freeze({ ...baselineSemanticV1.game.hud, phase }),
  });
}

function semanticPublicationV1(input: {
  readonly game: DeepReadonly<PocGameViewV1>;
  readonly narrative?: DeepReadonly<NarrativeProjectionV1 | null> | undefined;
  readonly actions?: readonly DeepReadonly<PocSemanticActionDescriptorV1>[] | undefined;
}): DeepReadonly<PocSemanticPublicationV1> {
  return Object.freeze({
    ...baselineSemanticV1,
    game: input.game,
    narrative: input.narrative ?? null,
    actions: input.actions ?? emptyActionsV1,
  });
}

function uiStateV1(input: {
  readonly route: PocPresentationUiStateV1["route"];
  readonly primaryOverlayId?: PocPresentationUiStateV1["primaryOverlayId"] | undefined;
}): DeepReadonly<PocPresentationUiStateV1> {
  return Object.freeze({
    route: input.route,
    primaryOverlayId: input.primaryOverlayId ?? null,
    interaction: initialInteractionSessionStateV1,
    activeCueId: null,
  });
}

function projectFixtureV1(input: {
  readonly route?: PocPresentationUiStateV1["route"];
  readonly primaryOverlayId?: PocPresentationUiStateV1["primaryOverlayId"];
  readonly phase?: PocGameViewV1["hud"]["phase"];
  readonly narrative?: DeepReadonly<NarrativeProjectionV1 | null>;
  readonly actions?: readonly DeepReadonly<PocSemanticActionDescriptorV1>[];
  readonly resolvedCatalog?: PocResolvedPresentationCatalogV1;
}) {
  const semantic = semanticPublicationV1({
    game: gameViewV1(input.phase ?? "morning"),
    narrative: input.narrative,
    actions: input.actions,
  });
  const projectionInput = Object.freeze({
    semantic,
    resolvedCatalog: input.resolvedCatalog ?? pocResolvedPresentationCatalogV1,
    contentPreference: Object.freeze({
      allowedFlags: pocContentMaturityPolicyV1.defaultAllowedFlags,
    }),
    uiState: uiStateV1({
      route: input.route ?? "play",
      primaryOverlayId: input.primaryOverlayId,
    }),
  }) satisfies RuntimePresentationProjectionInputV1<
    PocSemanticPublicationV1,
    PocResolvedPresentationCatalogV1,
    PocPresentationUiStateV1
  >;
  return Object.freeze({
    semantic,
    projection: projectPocRuntimePresentationV1(projectionInput),
  });
}

describe("projectPocRuntimePresentationV1", () => {
  it.each([
    ["missing", null, false],
    ["idle", narrativeWithStatusV1("idle"), false],
    ["active", narrativeWithStatusV1("active"), true],
    ["completed", narrativeWithStatusV1("completed"), false],
  ] as const)(
    "classifies %s Narrative with the exact shared open predicate",
    (_name, narrative, open) => {
      expect(isPocNarrativeOpenV1(narrative)).toBe(open);
    },
  );

  it.each([
    [
      "main_menu",
      null,
      "morning",
      "stage_scene.poc.main_menu",
      "stage_variant.poc.main_menu.default",
    ],
    ["play", null, "morning", "stage_scene.poc.tavern", "stage_variant.poc.tavern.day"],
    ["play", null, "afternoon", "stage_scene.poc.tavern", "stage_variant.poc.tavern.day"],
    ["play", null, "evening", "stage_scene.poc.tavern", "stage_variant.poc.tavern.evening"],
    [
      "play",
      "overlay.poc.purchase",
      "morning",
      "stage_scene.poc.market",
      "stage_variant.poc.market.day",
    ],
    [
      "play",
      "overlay.poc.world_action",
      "morning",
      "stage_scene.poc.world_map",
      "stage_variant.poc.world_map.default",
    ],
    [
      "play",
      "overlay.poc.run_summary",
      "morning",
      "stage_scene.poc.week_summary",
      "stage_variant.poc.week_summary.default",
    ],
  ] as const)(
    "maps %s/%s/%s to %s/%s",
    (route, primaryOverlayId, phase, expectedSceneId, expectedVariantId) => {
      const { projection } = projectFixtureV1({ route, primaryOverlayId, phase });
      expect(projection.view.stage).toMatchObject({
        stageSceneId: expectedSceneId,
        variantId: expectedVariantId,
      });
    },
  );

  it("retains the exact atomic GameView and Narrative references", () => {
    const fixture = projectFixtureV1({ narrative: narrativeFixtureV1 });
    expect(fixture.projection.view.game).toBe(fixture.semantic.game);
    expect(fixture.projection.view.narrative).toBe(narrativeFixtureV1);
  });

  it.each([
    ["main_menu", null, "morning"],
    ["play", null, "morning"],
    ["play", null, "evening"],
    ["play", "overlay.poc.purchase", "morning"],
    ["play", "overlay.poc.world_action", "morning"],
    ["play", "overlay.poc.run_summary", "morning"],
  ] as const)("returns the exact frozen asset demand for %s/%s/%s", (route, overlay, phase) => {
    const { projection } = projectFixtureV1({ route, primaryOverlayId: overlay, phase });
    expect(projection.requiredAssetIds).toBe(
      pocResolvedPresentationCatalogV1.requiredAssetIdsByVariant[projection.view.stage.variantId],
    );
  });

  it("projects explicit heroine pairs through the exhaustive fallback policy", () => {
    const { projection } = projectFixtureV1({});
    expect(projection.view.characters).toHaveLength(1);
    expect(projection.view.characters[0]?.appearance).toEqual(
      pocResolvedPresentationCatalogV1.heroineStandardAppearance.map((layer) => ({
        ...layer,
        fallbackPolicy:
          layer.layerId === "appearance_layer.poc.heroine.costume_body"
            ? "character_fallback"
            : "omit",
      })),
    );
    expect(projection.view.characters[0]?.appearance.map(({ layerId }) => layerId)).not.toContain(
      "appearance_layer.poc.heroine.held_prop",
    );
    expect(projection.view.characters[0]?.appearance.map(({ layerId }) => layerId)).not.toContain(
      "appearance_layer.poc.heroine.foreground_effect",
    );
  });

  it.each([
    ["missing", pocResolvedPresentationCatalogV1.heroineStandardAppearance.slice(0, -1)],
    [
      "duplicate",
      Object.freeze([
        pocResolvedPresentationCatalogV1.heroineStandardAppearance[0],
        pocResolvedPresentationCatalogV1.heroineStandardAppearance[0],
        ...pocResolvedPresentationCatalogV1.heroineStandardAppearance.slice(2),
      ]),
    ],
    [
      "unknown",
      Object.freeze([
        Object.freeze({
          ...pocResolvedPresentationCatalogV1.heroineStandardAppearance[0],
          layerId: parseAppearanceLayerId("appearance_layer.poc.heroine.unknown_test"),
        }),
        ...pocResolvedPresentationCatalogV1.heroineStandardAppearance.slice(1),
      ]),
    ],
  ] as const)("rejects a %s heroine appearance pair set", (_label, heroineStandardAppearance) => {
    const malformedCatalog = Object.freeze({
      ...pocResolvedPresentationCatalogV1,
      heroineStandardAppearance: Object.freeze(heroineStandardAppearance),
    }) as unknown as PocResolvedPresentationCatalogV1;

    expect(() => projectFixtureV1({ resolvedCatalog: malformedCatalog })).toThrowError(TypeError);
  });

  it("changes UI variants without changing Semantic or authoritative Snapshot identity", () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    const semantic = harness.semantic.observe();
    const snapshot = harness.snapshotForTest();
    const common = Object.freeze({
      semantic,
      resolvedCatalog: pocResolvedPresentationCatalogV1,
      contentPreference: Object.freeze({
        allowedFlags: pocContentMaturityPolicyV1.defaultAllowedFlags,
      }),
    });
    const tavern = projectPocRuntimePresentationV1(
      Object.freeze({ ...common, uiState: uiStateV1({ route: "play" }) }),
    );
    const market = projectPocRuntimePresentationV1(
      Object.freeze({
        ...common,
        uiState: uiStateV1({
          route: "play",
          primaryOverlayId: "overlay.poc.purchase",
        }),
      }),
    );

    expect(tavern.view.stage.variantId).toBe("stage_variant.poc.tavern.day");
    expect(market.view.stage.variantId).toBe("stage_variant.poc.market.day");
    expect(tavern.view.game).toBe(semantic.game);
    expect(market.view.game).toBe(semantic.game);
    expect(harness.semantic.observe()).toBe(semantic);
    expect(harness.snapshotForTest()).toBe(snapshot);
  });

  it("keeps the contextual heroine target topology without inventing body-part targets", () => {
    const { projection } = projectFixtureV1({ actions: emptyActionsV1 });
    expect(projection.view.interactionSurfaces.map(({ surfaceId }) => surfaceId)).toEqual([
      "surface.poc.tavern",
      "surface.poc.heroine",
    ]);

    const tavern = projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.tavern",
    );
    const heroine = projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.heroine",
    );
    const outerFigure = tavern?.targets.find(
      ({ targetId }) => targetId === "target.poc.heroine.figure",
    );
    const innerFigure = heroine?.targets.find(
      ({ targetId }) => targetId === "target.poc.heroine.figure",
    );

    expect(tavern?.entryMode).toBe("always_active");
    expect(outerFigure).toMatchObject({
      resolutionMode: "open_surface",
      openSurfaceId: "surface.poc.heroine",
      behaviors: [],
    });
    expect(heroine?.entryMode).toBe("surface_activation");
    expect(innerFigure).toMatchObject({
      resolutionMode: "direct",
      openSurfaceId: null,
    });
    expect(innerFigure?.behaviors.map(({ behaviorId }) => behaviorId)).toEqual([
      "behavior.poc.heroine.open_profile",
    ]);
    expect(JSON.stringify(projection.view.interactionSurfaces)).not.toMatch(
      /head|chest|body_part/iu,
    );
  });

  it("chooses profile plus the exact published relationship action", () => {
    const { projection } = projectFixtureV1({ actions: Object.freeze([repairDescriptorV1]) });
    const heroine = projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.heroine",
    );
    const figure = heroine?.targets.find(
      ({ targetId }) => targetId === "target.poc.heroine.figure",
    );

    expect(figure?.resolutionMode).toBe("choose");
    expect(figure?.behaviors.map(({ behaviorId }) => behaviorId)).toEqual([
      "behavior.poc.heroine.open_profile",
      "behavior.poc.heroine.repair_sign",
    ]);
    const repair = figure?.behaviors[1];
    expect(repair?.route.kind).toBe("semantic_invocation");
    if (repair?.route.kind !== "semantic_invocation") {
      throw new TypeError("missing projected repair behavior");
    }
    expect(repair.route.descriptor).toBe(repairDescriptorV1);
    expect(repair.route.invocation).toBe(repairInvocationV1);
  });

  it("leaves an ambiguous relationship join fail-closed for the bounded UI validator", () => {
    const { projection, semantic } = projectFixtureV1({
      actions: Object.freeze([repairDescriptorV1, repairDescriptorV1]),
    });
    const heroine = projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.heroine",
    );
    if (heroine === undefined) throw new TypeError("missing projected heroine surface");

    const validated = validateRuntimeInteractionSurfaceV1(heroine, {
      revision: semantic.revision,
      resolvedSurfaces: pocResolvedPresentationCatalogV1.sceneGraph.interactionSurfaces,
      runtimeSurfaces: projection.view.interactionSurfaces,
    });

    expect(validated.surface.targets).toEqual([]);
    expect(validated.spatialState).toBe("disabled");
    expect(validated.domFallback).toEqual({ visible: true });
    expect(validated.faults).toContainEqual({
      code: "presentation.interaction.choose_behavior_count",
      surfaceId: "surface.poc.heroine",
      revision: semantic.revision,
    });
  });

  it("accepts the exact form descriptors from a live active Semantic publication", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await enterActiveRunV1(harness.semantic);
    const actions = harness.semantic.observe().actions;
    const serviceDescriptor = actions.find(({ actionId }) => actionId === "action.service_plan");
    const purchaseDescriptor = actions.find(({ actionId }) => actionId === "action.purchase");
    if (serviceDescriptor === undefined || purchaseDescriptor === undefined) {
      throw new TypeError("active PoC Semantic publication omitted required form descriptors");
    }

    const tavern = projectFixtureV1({ actions }).projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.tavern",
    );
    const service = tavern?.targets
      .find(({ targetId }) => targetId === "target.poc.tavern.service")
      ?.behaviors.find(({ behaviorId }) => behaviorId === "behavior.poc.tavern.service_plan");
    const market = projectFixtureV1({
      actions,
      primaryOverlayId: "overlay.poc.purchase",
    }).projection.view.interactionSurfaces.find(
      ({ surfaceId }) => surfaceId === "surface.poc.market",
    );
    const purchase = market?.targets[0]?.behaviors[0];

    expect(service?.route).toMatchObject({
      kind: "semantic_control",
      descriptor: serviceDescriptor,
    });
    if (service?.route.kind !== "semantic_control") {
      throw new TypeError("missing live service-plan control route");
    }
    expect(service.route.descriptor).toBe(serviceDescriptor);
    expect(purchase?.route).toMatchObject({
      kind: "semantic_control",
      descriptor: purchaseDescriptor,
    });
    if (purchase?.route.kind !== "semantic_control") {
      throw new TypeError("missing live purchase control route");
    }
    expect(purchase.route.descriptor).toBe(purchaseDescriptor);
  });

  it("does not import Gameplay authorities or rebuild Semantic availability", async () => {
    const source = await readFile(
      new URL("./project-poc-runtime-presentation.ts", import.meta.url),
      "utf8",
    );
    const simulationIdRegistrySource = await readFile(
      new URL("../../content/simulation-ids.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\b(?:createPocGameQueriesV1|createPocSemanticActionCatalogV1|GameSnapshot|RunIntegrity|Math\.random)\b/u,
    );
    expect(source).not.toMatch(
      /from\s+["'][^"']*gameplay\/(?:game-queries|modules|command-executor|rules|resolvers)/u,
    );
    expect(source).toMatch(/from\s+["'][^"']*content\/ids/u);
    expect(simulationIdRegistrySource).toMatch(
      /from\s+["']\.\.\/gameplay\/contracts\/ids\.js["']/u,
    );
    expect(simulationIdRegistrySource).not.toMatch(/from\s+["']\.\.\/gameplay\/index\.js["']/u);
  });
});
