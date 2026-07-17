// SPDX-License-Identifier: MIT
import {
  digestBytes,
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseContentMaturityFlagsV1,
  parseContentMaturityPolicyV1,
  parseInteractionSurfaceId,
  parseNonNegativeSafeInteger,
  parseNormalizedCoordinateV1,
  parsePositiveFiniteNumber,
  parsePositiveSafeInteger,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
  type BuildProvenanceV1,
  type ContentMaturityFlagsV1,
  type ContentMaturityPolicyV1,
  type Digest,
  type InteractionSurfaceId,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";
import type { RuntimeCharacterPresentationV1 } from "../characters/contracts.js";
import type { RuntimeInteractionSurfaceV1 } from "../interaction/contracts.js";
import type { RuntimePresentationPublicationV1 } from "../runtime/runtime-presentation-store.js";
import type { RuntimeStageSceneV1 } from "../stage/contracts.js";
import { classifyDebugUiContextUseV1, createDebugUiContextV1 } from "./debug-ui-context.js";

const textEncoderV1 = new TextEncoder();
const digestV1 = (label: string): Digest => digestBytes(textEncoderV1.encode(label));
const emptyFlagPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [],
  presets: [],
  defaultAllowedFlags: 0,
});

function appearanceLayerIdV1(characterIndex: number, layerIndex: number) {
  return parseAppearanceLayerId(`appearance.e2e.${characterIndex}.${layerIndex}`);
}

function createCharacterV1(
  characterIndex = 0,
  appearanceCount = 1,
): RuntimeCharacterPresentationV1 {
  return Object.freeze({
    characterId: parseCharacterId(`character.e2e.counter.${characterIndex}`),
    accessibleNameTextId: parseTextId(`text.e2e.character.${characterIndex}`),
    rendererId: "renderer.e2e.character.layered",
    rigId: parseCharacterRigId("rig.e2e.counter.default"),
    poseId: parseCharacterPoseId("pose.e2e.counter.idle"),
    expressionId: parseCharacterExpressionId("expression.e2e.counter.neutral"),
    activityId: null,
    appearance: Object.freeze(
      Array.from({ length: appearanceCount }, (_, layerIndex) =>
        Object.freeze({
          layerId: appearanceLayerIdV1(characterIndex, layerIndex),
          assetId: parseAssetId(`asset.e2e.character.${characterIndex}.${layerIndex}`),
          fallbackPolicy: "omit" as const,
        }),
      ),
    ),
    hitMapId: null,
    anchor: Object.freeze({
      x: parseNormalizedCoordinateV1(0.5),
      y: parseNormalizedCoordinateV1(0.75),
    }),
    scale: parsePositiveFiniteNumber(1),
    staticFallbackAssetId: parseAssetId(`asset.e2e.character.${characterIndex}.fallback`),
    fallbackHitMapCompatibility: "compatible" as const,
  });
}

function createSurfaceV1(surfaceIndex = 0): RuntimeInteractionSurfaceV1<never, never> {
  return Object.freeze({
    surfaceId: parseInteractionSurfaceId(`surface.e2e.counter.${surfaceIndex}`),
    accessibleNameTextId: parseTextId(`text.e2e.surface.${surfaceIndex}`),
    entryMode: "always_active" as const,
    hitMapId: null,
    targets: Object.freeze([]),
  });
}

interface FixtureOptionsV1 {
  readonly contentPolicy?: ContentMaturityPolicyV1;
  readonly allowedFlags?: ContentMaturityFlagsV1;
  readonly routeId?: string | null;
  readonly detailOverlayIds?: readonly string[];
  readonly activeInteractionSurfaceId?: InteractionSurfaceId | null;
  readonly characters?: readonly RuntimeCharacterPresentationV1[];
  readonly surfaces?: readonly RuntimeInteractionSurfaceV1<never, never>[];
  readonly variant?: "day" | "evening";
}

function debugPresentationFixtureV1(options: FixtureOptionsV1 = {}) {
  const stage: RuntimeStageSceneV1 = Object.freeze({
    stageSceneId: parseStageSceneId("stage_scene.e2e.main"),
    variantId: parseStageSceneVariantId(
      options.variant === "evening"
        ? "stage_variant.e2e.main.evening"
        : "stage_variant.e2e.main.day",
    ),
    rendererId: "renderer.e2e.stage.css",
    background: Object.freeze({
      assetId: parseAssetId("asset.e2e.stage.background"),
      accessibleNameTextId: parseTextId("text.e2e.stage.name"),
    }),
    layout: Object.freeze({
      coordinate: "private-layout-value",
      runtimePath: "private/stage.webp",
      domNode: "private-dom-value",
      pointer: "private-pointer-value",
      snapshot: "private-snapshot-value",
    }),
  });
  const view = Object.freeze({
    stage,
    characters: Object.freeze([...(options.characters ?? [createCharacterV1()])]),
    interactionSurfaces: Object.freeze([...(options.surfaces ?? [createSurfaceV1()])]),
  });
  const presentation: RuntimePresentationPublicationV1<
    { readonly snapshot: { readonly private: true } },
    typeof view,
    ReturnType<typeof parseAssetId>
  > = Object.freeze({
    revision: parseNonNegativeSafeInteger(7),
    semantic: Object.freeze({ snapshot: Object.freeze({ private: true as const }) }),
    view,
    requiredAssetIds: Object.freeze([parseAssetId("asset.e2e.stage.background")]),
  });

  return Object.freeze({
    presentation,
    contentPolicy: options.contentPolicy ?? emptyFlagPolicyV1,
    contentPreference: Object.freeze({
      allowedFlags:
        options.allowedFlags ??
        options.contentPolicy?.defaultAllowedFlags ??
        emptyFlagPolicyV1.defaultAllowedFlags,
    }),
    uiSession: Object.freeze({
      routeId: options.routeId === undefined ? "route.e2e.tavern" : options.routeId,
      primaryOverlayId: "overlay.e2e.orders",
      detailOverlayIds: Object.freeze([...(options.detailOverlayIds ?? ["overlay.e2e.detail"])]),
      narrativeOpen: true,
      systemDialogOpen: false,
      devDock: Object.freeze({ leftOpen: false, rightOpen: true }),
      activeInteractionSurfaceId:
        options.activeInteractionSurfaceId === undefined
          ? parseInteractionSurfaceId("surface.e2e.counter.0")
          : options.activeInteractionSurfaceId,
    }),
  });
}

type OverLimitKindV1 =
  "stable_id_bytes" | "renderers" | "appearance_layers" | "visible_surfaces" | "detail_stack";

function overLimitDebugUiContextFixtureV1(kind: OverLimitKindV1) {
  if (kind === "stable_id_bytes") {
    return debugPresentationFixtureV1({ routeId: "r".repeat(257) });
  }
  if (kind === "renderers") {
    return debugPresentationFixtureV1({
      characters: Object.freeze(Array.from({ length: 17 }, (_, index) => createCharacterV1(index))),
    });
  }
  if (kind === "appearance_layers") {
    return debugPresentationFixtureV1({ characters: Object.freeze([createCharacterV1(0, 17)]) });
  }
  if (kind === "visible_surfaces") {
    return debugPresentationFixtureV1({
      surfaces: Object.freeze(Array.from({ length: 33 }, (_, index) => createSurfaceV1(index))),
    });
  }
  return debugPresentationFixtureV1({
    detailOverlayIds: Object.freeze(Array.from({ length: 9 }, (_, index) => `detail.${index}`)),
  });
}

function exactLimitDebugUiContextFixtureV1() {
  return debugPresentationFixtureV1({
    routeId: "r".repeat(256),
    characters: Object.freeze(
      Array.from({ length: 16 }, (_, index) => createCharacterV1(index, 16)),
    ),
    surfaces: Object.freeze(Array.from({ length: 32 }, (_, index) => createSurfaceV1(index))),
    detailOverlayIds: Object.freeze(Array.from({ length: 8 }, (_, index) => `detail.${index}`)),
  });
}

function patchSetV1(label = "current"): BuildProvenanceV1["resolved"]["patchSet"] {
  return Object.freeze({
    digest: digestV1(`patch:${label}`),
    simulationDigest: digestV1(`patch:simulation:${label}`),
    presentationDigest: digestV1(`patch:presentation:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

interface ProvenanceOverridesV1 {
  readonly storyId?: string;
  readonly storyRevision?: number;
  readonly storyDigest?: Digest;
  readonly engineVersion?: string;
  readonly engineDigest?: Digest;
  readonly stateContractRevision?: number;
  readonly stateContractDigest?: Digest;
  readonly simulationDigest?: Digest;
  readonly presentationDigest?: Digest;
  readonly patchSet?: BuildProvenanceV1["resolved"]["patchSet"];
}

function provenanceV1(overrides: ProvenanceOverridesV1 = {}): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: overrides.storyId ?? "story.e2e",
      revision: parsePositiveSafeInteger(overrides.storyRevision ?? 1),
      digest: overrides.storyDigest ?? digestV1("story"),
    }),
    engine: Object.freeze({
      version: overrides.engineVersion ?? "1.0.0",
      digest: overrides.engineDigest ?? digestV1("engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(overrides.stateContractRevision ?? 1),
      stateContractDigest: overrides.stateContractDigest ?? digestV1("state-contract"),
      simulationDigest: overrides.simulationDigest ?? digestV1("simulation"),
      presentationDigest: overrides.presentationDigest ?? digestV1("presentation"),
      patchSet: overrides.patchSet ?? patchSetV1(),
    }),
  });
}

describe("DebugBundle presentation context", () => {
  it("projects only bounded stable presentation identifiers", () => {
    const context = createDebugUiContextV1(debugPresentationFixtureV1());

    expect(context).toEqual({
      revision: 1,
      presentation: {
        presentationRevision: 7,
        stageSceneId: "stage_scene.e2e.main",
        variantId: "stage_variant.e2e.main.day",
        stageRendererId: "renderer.e2e.stage.css",
        renderers: [
          {
            rendererId: "renderer.e2e.character.layered",
            characterId: "character.e2e.counter.0",
            rigId: "rig.e2e.counter.default",
            poseId: "pose.e2e.counter.idle",
            expressionId: "expression.e2e.counter.neutral",
            appearanceLayerIds: ["appearance.e2e.0.0"],
          },
        ],
        visibleInteractionSurfaceIds: ["surface.e2e.counter.0"],
        activeInteractionSurfaceId: "surface.e2e.counter.0",
        contentPolicyRevision: 1,
        allowedContentFlags: 0,
      },
      session: {
        routeId: "route.e2e.tavern",
        primaryOverlayId: "overlay.e2e.orders",
        detailOverlayIds: ["overlay.e2e.detail"],
        narrativeOpen: true,
        systemDialogOpen: false,
        devDock: { leftOpen: false, rightOpen: true },
      },
    });
    expect(JSON.stringify(context)).not.toMatch(
      /coordinate|runtimePath|pointer|domNode|snapshot|assetId|hitMap|semantic/i,
    );
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.presentation)).toBe(true);
    expect(Object.isFrozen(context.presentation?.renderers)).toBe(true);
    expect(Object.isFrozen(context.session.detailOverlayIds)).toBe(true);
    expect(Object.isFrozen(context.session.devDock)).toBe(true);
  });

  it("copies active interaction only from the UI session without duplicating or inferring it", () => {
    const hiddenActive = parseInteractionSurfaceId("surface.e2e.hidden");
    const copied = createDebugUiContextV1(
      debugPresentationFixtureV1({ activeInteractionSurfaceId: hiddenActive }),
    );
    const absent = createDebugUiContextV1(
      debugPresentationFixtureV1({ activeInteractionSurfaceId: null }),
    );

    expect(copied.presentation?.visibleInteractionSurfaceIds).toEqual(["surface.e2e.counter.0"]);
    expect(copied.presentation?.activeInteractionSurfaceId).toBe(hiddenActive);
    expect("activeInteractionSurfaceId" in copied.session).toBe(false);
    expect(absent.presentation?.activeInteractionSurfaceId).toBeNull();
  });

  it("accepts every exact diagnostics boundary", () => {
    const context = createDebugUiContextV1(exactLimitDebugUiContextFixtureV1());

    expect(context.session.routeId).toHaveLength(256);
    expect(context.presentation?.renderers).toHaveLength(16);
    expect(context.presentation?.renderers[0]?.appearanceLayerIds).toHaveLength(16);
    expect(context.presentation?.visibleInteractionSurfaceIds).toHaveLength(32);
    expect(context.session.detailOverlayIds).toHaveLength(8);
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
          allowedFlags: parseContentMaturityFlagsV1(0x8000_0000),
        }),
      ),
    ).toThrowError("diagnostics.ui_context_content_flags_unknown");
  });
});

describe("Debug UI context identity", () => {
  const appBuildIdV1 = digestV1("application");

  it("permits restoration only for exact Story, presentation, and application identity", () => {
    const provenance = provenanceV1();
    expect(
      classifyDebugUiContextUseV1(
        { provenance, appBuildId: appBuildIdV1 },
        { provenance, appBuildId: appBuildIdV1 },
      ),
    ).toEqual({ kind: "restorable" });
    expect(
      classifyDebugUiContextUseV1({ provenance }, { provenance, appBuildId: appBuildIdV1 }),
    ).toEqual({ kind: "diagnostic_only", reasons: ["application_identity_mismatch"] });
  });

  it("reports every mismatch once in Story, presentation, application order", () => {
    const recorded = provenanceV1();
    const current = provenanceV1({
      storyId: "story.other",
      storyRevision: 2,
      presentationDigest: digestV1("presentation.other"),
    });

    expect(
      classifyDebugUiContextUseV1(
        { provenance: recorded, appBuildId: digestV1("application.old") },
        { provenance: current, appBuildId: digestV1("application.current") },
      ),
    ).toEqual({
      kind: "diagnostic_only",
      reasons: [
        "story_identity_mismatch",
        "presentation_identity_mismatch",
        "application_identity_mismatch",
      ],
    });
  });

  it("ignores identities outside static presentation restoration", () => {
    const recorded = provenanceV1();
    const current = provenanceV1({
      storyDigest: digestV1("story.other"),
      engineVersion: "9.9.9",
      engineDigest: digestV1("engine.other"),
      stateContractRevision: 2,
      stateContractDigest: digestV1("state-contract.other"),
      simulationDigest: digestV1("simulation.other"),
      patchSet: patchSetV1("other"),
    });

    expect(
      classifyDebugUiContextUseV1(
        { provenance: recorded, appBuildId: appBuildIdV1 },
        { provenance: current, appBuildId: appBuildIdV1 },
      ),
    ).toEqual({ kind: "restorable" });
  });
});
