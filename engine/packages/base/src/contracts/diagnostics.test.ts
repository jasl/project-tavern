// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "./digest.js";
import type { DebugBundleEnvelopeV1 } from "./diagnostics.js";
import {
  createDebugUiContextSchemaV1,
  debugBundleJsonLimitsV1,
  debugPresentationLimitsV1,
  exportedDebugBundleSchemaV1,
  runtimeOperationFaultSchemaV1,
} from "./diagnostics.js";
import { parseIsoUtcInstantV1 } from "./persistence.js";

function createDebugPresentationRendererSummaryV1(index = 0) {
  return {
    rendererId: "renderer.e2e.character.layered",
    characterId: `character.e2e.counter.${index}`,
    rigId: "rig.e2e.counter",
    poseId: "pose.e2e.counter.idle",
    expressionId: "expression.e2e.counter.neutral",
    appearanceLayerIds: [`appearance.e2e.counter.apron.${index}`],
  };
}

function createValidDebugUiContextV1() {
  return {
    revision: 1,
    presentation: {
      presentationRevision: 7,
      stageSceneId: "stage_scene.e2e.main",
      variantId: "stage_variant.e2e.main.default",
      stageRendererId: "renderer.e2e.stage.css",
      renderers: [createDebugPresentationRendererSummaryV1()],
      visibleInteractionSurfaceIds: ["surface.e2e.counter"],
      activeInteractionSurfaceId: "surface.e2e.counter",
      contentPolicyRevision: 1,
      allowedContentFlags: 0,
    },
    session: {
      routeId: "route.e2e.play",
      primaryOverlayId: "overlay.e2e.primary",
      detailOverlayIds: ["overlay.e2e.detail"],
      narrativeOpen: true,
      systemDialogOpen: false,
      devDock: { leftOpen: false, rightOpen: true },
    },
  };
}

function expectDebugUiContextFailureCodeV1(value: unknown, code: string): void {
  let failure: unknown;
  try {
    createDebugUiContextSchemaV1().parse(value);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(TypeError);
  expect((failure as TypeError).message).toBe(code);
}

describe("diagnostic contracts", () => {
  it("keeps Debug exports closed and binds the exact bytes", () => {
    const bytes = Uint8Array.of(2);
    const valid = {
      filename: "run.debug-bundle.json",
      mediaType: "application/json",
      digest: digestBytes(bytes),
      bytes,
    };
    expect(exportedDebugBundleSchemaV1.parse(valid)).toEqual(valid);
    expect(() => exportedDebugBundleSchemaV1.parse({ ...valid, summary: {} })).toThrow();
  });

  it("parses only exact runtime fault branches", () => {
    const valid = {
      occurredAt: "2026-07-12T01:02:03.000Z",
      operation: "save.quick",
      message: "failed",
      category: "persistence",
      code: "persistence.transaction_failed",
    };
    expect(runtimeOperationFaultSchemaV1.parse(valid)).toEqual(valid);
    expect(() => runtimeOperationFaultSchemaV1.parse({ ...valid, extra: true })).toThrow();
  });

  it("freezes capability state into every Debug Bundle envelope", () => {
    const bundle = {
      formatRevision: 1,
      provenance: "provenance",
      capabilities: {
        debugTools: true,
        cheats: false,
        automationBridge: false,
      },
      simulationLineage: [],
      generatedAt: parseIsoUtcInstantV1("2026-07-12T01:02:03.000Z"),
      replayBase: "base",
      replayBaseStateDigest: digestBytes(Uint8Array.of(1)),
      commandLog: [],
      currentSnapshot: "current",
      currentStateDigest: digestBytes(Uint8Array.of(2)),
      diagnostics: "diagnostics",
      runtimeFailures: [],
    } satisfies DebugBundleEnvelopeV1<
      string,
      {
        readonly debugTools: boolean;
        readonly cheats: boolean;
        readonly automationBridge: boolean;
      },
      readonly never[],
      string,
      never,
      string,
      never,
      never,
      never
    >;

    expect(bundle.capabilities).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
  });

  it("rejects runtime fault text beyond the reviewed byte limits", () => {
    const common = {
      occurredAt: "2026-07-12T01:02:03.000Z",
      category: "runtime",
      code: "runtime.async_operation_failed",
    } as const;

    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "😀".repeat(1_025),
        message: "failed",
      }),
    ).toThrow();
    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "runtime.test",
        message: "x".repeat(65_537),
      }),
    ).toThrow();
    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "runtime.test",
        message: "failed",
        cause: { name: "x".repeat(4_097), message: "cause" },
      }),
    ).toThrow();
  });

  it("freezes the reviewed Debug Bundle limits", () => {
    expect(debugBundleJsonLimitsV1).toEqual({
      maxBytes: 20_971_520,
      maxDepth: 64,
      maxArrayItems: 10_000,
      maxObjectMembers: 10_000,
      maxNodes: 100_000,
      maxStringBytes: 262_144,
    });
  });

  it("round-trips a bounded Debug UI context as a detached deep-frozen value", () => {
    const input = createValidDebugUiContextV1();
    const parsed = createDebugUiContextSchemaV1().parse(input);

    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(parsed.presentation).not.toBe(input.presentation);
    expect(parsed.presentation?.renderers).not.toBe(input.presentation.renderers);
    expect(parsed.presentation?.renderers[0]?.appearanceLayerIds).not.toBe(
      input.presentation.renderers[0]?.appearanceLayerIds,
    );
    expect(parsed.session).not.toBe(input.session);
    expect(parsed.session.devDock).not.toBe(input.session.devDock);
    expect(createDebugUiContextSchemaV1().parse(parsed)).toEqual(parsed);

    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.presentation)).toBe(true);
    expect(Object.isFrozen(parsed.presentation?.renderers)).toBe(true);
    expect(Object.isFrozen(parsed.presentation?.renderers[0])).toBe(true);
    expect(Object.isFrozen(parsed.presentation?.renderers[0]?.appearanceLayerIds)).toBe(true);
    expect(Object.isFrozen(parsed.presentation?.visibleInteractionSurfaceIds)).toBe(true);
    expect(Object.isFrozen(parsed.session)).toBe(true);
    expect(Object.isFrozen(parsed.session.detailOverlayIds)).toBe(true);
    expect(Object.isFrozen(parsed.session.devDock)).toBe(true);

    input.presentation.renderers[0]?.appearanceLayerIds.splice(
      0,
      1,
      "appearance.e2e.counter.changed",
    );
    input.session.devDock.leftOpen = true;
    expect(parsed.presentation?.renderers[0]?.appearanceLayerIds).toEqual([
      "appearance.e2e.counter.apron.0",
    ]);
    expect(parsed.session.devDock.leftOpen).toBe(false);
  });

  it("admits an exact context whose presentation is null", () => {
    const input = createValidDebugUiContextV1();
    const parsed = createDebugUiContextSchemaV1().parse({ ...input, presentation: null });

    expect(parsed).toEqual({ ...input, presentation: null });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.session)).toBe(true);
    expect(Object.isFrozen(parsed.session.devDock)).toBe(true);
  });

  it.each([
    [
      "root",
      (value: ReturnType<typeof createValidDebugUiContextV1>) => Reflect.set(value, "extra", true),
    ],
    [
      "presentation",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.set(value.presentation, "coordinates", { x: 0, y: 0 }),
    ],
    [
      "renderer",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.set(value.presentation.renderers[0] ?? {}, "runtimePath", "/private/asset.png"),
    ],
    [
      "session",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.set(value.session, "pointer", "secret"),
    ],
    [
      "dev dock",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.set(value.session.devDock, "bottomOpen", true),
    ],
  ] as const)("rejects unknown %s keys", (_name, mutate) => {
    const value = createValidDebugUiContextV1();
    mutate(value);
    expect(() => createDebugUiContextSchemaV1().parse(value)).toThrow(TypeError);
  });

  it.each([
    [
      "foreign root prototype",
      () => Object.setPrototypeOf(createValidDebugUiContextV1(), { inherited: true }),
    ],
    [
      "null nested prototype",
      () => {
        const value = createValidDebugUiContextV1();
        Object.setPrototypeOf(value.session.devDock, null);
        return value;
      },
    ],
    [
      "accessor",
      () => {
        const value = createValidDebugUiContextV1();
        Object.defineProperty(value.session, "routeId", {
          enumerable: true,
          get: () => "route.e2e.accessor",
        });
        return value;
      },
    ],
    [
      "symbol key",
      () => {
        const value = createValidDebugUiContextV1();
        Object.defineProperty(value.presentation, Symbol("private"), {
          enumerable: true,
          value: true,
        });
        return value;
      },
    ],
  ] as const)("rejects a %s instead of accepting non-plain data", (_name, createValue) => {
    expect(() => createDebugUiContextSchemaV1().parse(createValue())).toThrow(TypeError);
  });

  it.each([
    [
      "renderer list",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.deleteProperty(value.presentation.renderers, "0"),
    ],
    [
      "appearance list",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.deleteProperty(value.presentation.renderers[0]?.appearanceLayerIds ?? [], "0"),
    ],
    [
      "surface list",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.deleteProperty(value.presentation.visibleInteractionSurfaceIds, "0"),
    ],
    [
      "detail-overlay list",
      (value: ReturnType<typeof createValidDebugUiContextV1>) =>
        Reflect.deleteProperty(value.session.detailOverlayIds, "0"),
    ],
  ] as const)("rejects holes in the %s", (_name, mutate) => {
    const value = createValidDebugUiContextV1();
    mutate(value);
    expect(() => createDebugUiContextSchemaV1().parse(value)).toThrow(TypeError);
  });

  it("rejects arrays with extra properties, accessors, or foreign prototypes", () => {
    const extraProperty = createValidDebugUiContextV1();
    Reflect.set(extraProperty.presentation.renderers, "private", true);
    expect(() => createDebugUiContextSchemaV1().parse(extraProperty)).toThrow(TypeError);

    const accessor = createValidDebugUiContextV1();
    Object.defineProperty(accessor.session.detailOverlayIds, "0", {
      enumerable: true,
      get: () => "overlay.e2e.accessor",
    });
    expect(() => createDebugUiContextSchemaV1().parse(accessor)).toThrow(TypeError);

    const foreignPrototype = createValidDebugUiContextV1();
    Object.setPrototypeOf(foreignPrototype.presentation.visibleInteractionSurfaceIds, {});
    expect(() => createDebugUiContextSchemaV1().parse(foreignPrototype)).toThrow(TypeError);
  });

  it("applies the UTF-8 diagnostic ceiling before branded ID parsing", () => {
    const exactNeutralLimit = createValidDebugUiContextV1();
    exactNeutralLimit.session.routeId = "😀".repeat(64);
    expect(createDebugUiContextSchemaV1().parse(exactNeutralLimit).session.routeId).toBe(
      exactNeutralLimit.session.routeId,
    );

    const overNeutralLimit = createValidDebugUiContextV1();
    overNeutralLimit.session.routeId = "😀".repeat(65);
    expectDebugUiContextFailureCodeV1(overNeutralLimit, "diagnostics.ui_context_id_limit");

    const overBrandedLimit = createValidDebugUiContextV1();
    overBrandedLimit.presentation.renderers[0]!.characterId = "😀".repeat(65);
    expectDebugUiContextFailureCodeV1(overBrandedLimit, "diagnostics.ui_context_id_limit");

    const withinDiagnosticButOutsideBrandLimit = createValidDebugUiContextV1();
    withinDiagnosticButOutsideBrandLimit.presentation.renderers[0]!.characterId = "c".repeat(97);
    expectDebugUiContextFailureCodeV1(withinDiagnosticButOutsideBrandLimit, "invalid CharacterId");
  });

  it.each([
    [
      "renderers",
      "diagnostics.presentation_renderers_limit",
      (value: ReturnType<typeof createValidDebugUiContextV1>) => {
        value.presentation.renderers = Array.from(
          { length: debugPresentationLimitsV1.renderers + 1 },
          (_unused, index) => createDebugPresentationRendererSummaryV1(index),
        );
      },
    ],
    [
      "appearance layers",
      "diagnostics.presentation_appearance_limit",
      (value: ReturnType<typeof createValidDebugUiContextV1>) => {
        value.presentation.renderers[0]!.appearanceLayerIds = Array.from(
          { length: debugPresentationLimitsV1.appearanceLayersPerRenderer + 1 },
          (_unused, index) => `appearance.e2e.counter.layer.${index}`,
        );
      },
    ],
    [
      "visible surfaces",
      "diagnostics.presentation_surfaces_limit",
      (value: ReturnType<typeof createValidDebugUiContextV1>) => {
        value.presentation.visibleInteractionSurfaceIds = Array.from(
          { length: debugPresentationLimitsV1.visibleInteractionSurfaces + 1 },
          (_unused, index) => `surface.e2e.counter.${index}`,
        );
      },
    ],
    [
      "detail overlays",
      "diagnostics.ui_context_detail_stack_limit",
      (value: ReturnType<typeof createValidDebugUiContextV1>) => {
        value.session.detailOverlayIds = Array.from(
          { length: debugPresentationLimitsV1.detailOverlayStack + 1 },
          (_unused, index) => `overlay.e2e.detail.${index}`,
        );
      },
    ],
  ] as const)("rejects the exact +1 %s boundary with %s", (_name, code, mutate) => {
    const value = createValidDebugUiContextV1();
    mutate(value);
    expectDebugUiContextFailureCodeV1(value, code);
  });

  it("rejects duplicate characters, visible surfaces, and per-character appearance layers", () => {
    const duplicateCharacter = createValidDebugUiContextV1();
    duplicateCharacter.presentation.renderers.push(createDebugPresentationRendererSummaryV1());
    expect(() => createDebugUiContextSchemaV1().parse(duplicateCharacter)).toThrow(TypeError);

    const duplicateSurface = createValidDebugUiContextV1();
    duplicateSurface.presentation.visibleInteractionSurfaceIds.push("surface.e2e.counter");
    expect(() => createDebugUiContextSchemaV1().parse(duplicateSurface)).toThrow(TypeError);

    const duplicateAppearance = createValidDebugUiContextV1();
    duplicateAppearance.presentation.renderers[0]?.appearanceLayerIds.push(
      "appearance.e2e.counter.apron.0",
    );
    expect(() => createDebugUiContextSchemaV1().parse(duplicateAppearance)).toThrow(TypeError);
  });

  it("allows cross-character renderer details to repeat", () => {
    const value = createValidDebugUiContextV1();
    value.presentation.renderers.push({
      ...createDebugPresentationRendererSummaryV1(1),
      rendererId: value.presentation.renderers[0]!.rendererId,
      rigId: value.presentation.renderers[0]!.rigId,
      poseId: value.presentation.renderers[0]!.poseId,
      expressionId: value.presentation.renderers[0]!.expressionId,
      appearanceLayerIds: [...value.presentation.renderers[0]!.appearanceLayerIds],
    });

    expect(createDebugUiContextSchemaV1().parse(value).presentation?.renderers).toHaveLength(2);
  });

  it("preserves bounded historical uint32 content masks without applying current policy", () => {
    const value = createValidDebugUiContextV1();
    value.presentation.allowedContentFlags = 0x8000_0000;
    const parsed = createDebugUiContextSchemaV1().parse(value);

    expect(parsed.presentation?.allowedContentFlags).toBe(2_147_483_648);
  });

  it.each([-1, -0, 1.5, 0x1_0000_0000, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-uint32 historical content mask %s",
    (allowedContentFlags) => {
      const value = createValidDebugUiContextV1();
      value.presentation.allowedContentFlags = allowedContentFlags;
      expect(() => createDebugUiContextSchemaV1().parse(value)).toThrow(TypeError);
    },
  );
});
