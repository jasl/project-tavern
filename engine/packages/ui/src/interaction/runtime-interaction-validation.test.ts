// SPDX-License-Identifier: MIT
import {
  emptyContentMaturityFlagsV1,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseNonNegativeSafeInteger,
  parseTextId,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  InteractionEntryModeV1,
  InteractionResolutionModeV1,
  InteractionSurfaceDescriptorV1,
  InteractionSurfaceId,
  InteractionTargetId,
  NonNegativeSafeInteger,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import type {
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";
import { validateRuntimeInteractionSurfaceV1 } from "./runtime-interaction-validation.js";

interface TestDescriptorV1 {
  readonly enabled: boolean;
  readonly reasons: readonly { readonly code: string }[];
  readonly dispatch: () => void;
}

interface TestInvocationV1 {
  readonly actionId: string;
  readonly parameters: Readonly<Record<string, never>>;
}

type TestBehaviorV1 = RuntimeInteractionBehaviorV1<TestDescriptorV1, TestInvocationV1>;
type TestSemanticBehaviorV1 = Omit<TestBehaviorV1, "route"> & {
  readonly route: Extract<TestBehaviorV1["route"], { readonly kind: "semantic_invocation" }>;
};
type TestTargetV1 = RuntimeInteractionTargetV1<TestDescriptorV1, TestInvocationV1>;
type TestSurfaceV1 = RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>;

const revisionV1 = parseNonNegativeSafeInteger(17);
const stageSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.stage");
const detailSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.detail");
const missingSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.missing");
const siblingSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.sibling");
const alphaTargetIdV1 = parseInteractionTargetId("target.e2e.alpha");
const betaTargetIdV1 = parseInteractionTargetId("target.e2e.beta");
const gammaTargetIdV1 = parseInteractionTargetId("target.e2e.gamma");

function behaviorV1(
  suffix: string,
  input: {
    readonly isDefault?: boolean;
    readonly enabled?: boolean;
    readonly reasons?: readonly { readonly code: string }[];
    readonly dispatch?: () => void;
  } = {},
): DeepReadonly<TestSemanticBehaviorV1> {
  const actionId = `action.e2e.${suffix}`;
  return Object.freeze({
    behaviorId: parseInteractionBehaviorId(`behavior.e2e.${suffix}`),
    nameTextId: parseTextId(`text.e2e.behavior.${suffix}.name`),
    descriptionTextId: null,
    requiredFlags: emptyContentMaturityFlagsV1,
    isDefault: input.isDefault ?? false,
    route: Object.freeze({
      kind: "semantic_invocation" as const,
      descriptor: Object.freeze({
        enabled: input.enabled ?? true,
        reasons: input.reasons ?? Object.freeze([]),
        dispatch: input.dispatch ?? vi.fn(),
      }),
      invocation: Object.freeze({ actionId, parameters: Object.freeze({}) }),
    }),
  });
}

function targetV1(
  targetId: InteractionTargetId,
  resolutionMode: InteractionResolutionModeV1,
  behaviors: readonly DeepReadonly<TestBehaviorV1>[],
  openSurfaceId: InteractionSurfaceId | null = null,
): DeepReadonly<TestTargetV1> {
  return Object.freeze({
    targetId,
    accessibleNameTextId: parseTextId(`text.e2e.${targetId}.name`),
    resolutionMode,
    openSurfaceId,
    behaviors: Object.freeze([...behaviors]),
  });
}

function surfaceV1(
  input: {
    readonly surfaceId?: InteractionSurfaceId;
    readonly entryMode?: InteractionEntryModeV1;
    readonly targets?: readonly DeepReadonly<TestTargetV1>[];
  } = {},
): DeepReadonly<TestSurfaceV1> {
  const surfaceId = input.surfaceId ?? stageSurfaceIdV1;
  return Object.freeze({
    surfaceId,
    accessibleNameTextId: parseTextId(`text.e2e.${surfaceId}.name`),
    entryMode: input.entryMode ?? "always_active",
    hitMapId: null,
    targets: Object.freeze([...(input.targets ?? [])]),
  });
}

type TestBindingV1 = DeepReadonly<InteractionSurfaceDescriptorV1["targetBindings"][number]>;

function resolvedSurfaceV1(
  input: {
    readonly surfaceId?: InteractionSurfaceId;
    readonly entryModes?: readonly InteractionEntryModeV1[];
    readonly bindings?: readonly TestBindingV1[];
  } = {},
): DeepReadonly<InteractionSurfaceDescriptorV1> {
  const surfaceId = input.surfaceId ?? stageSurfaceIdV1;
  return Object.freeze({
    surfaceId,
    accessibleNameTextId: parseTextId(`text.e2e.${surfaceId}.name`),
    allowedEntryModes: Object.freeze([...(input.entryModes ?? ["always_active"])]),
    targetBindings: Object.freeze([...(input.bindings ?? [])]),
  });
}

function bindingV1(
  targetId: InteractionTargetId,
  modes: readonly InteractionResolutionModeV1[],
  openSurfaceId: InteractionSurfaceId | null = null,
): TestBindingV1 {
  return Object.freeze({
    targetId,
    allowedResolutionModes: Object.freeze([...modes]),
    openSurfaceId,
  });
}

function catalogV1(input: {
  readonly revision?: NonNegativeSafeInteger;
  readonly resolvedSurfaces: readonly DeepReadonly<InteractionSurfaceDescriptorV1>[];
  readonly runtimeSurfaces: readonly DeepReadonly<TestSurfaceV1>[];
}) {
  return Object.freeze({
    revision: input.revision ?? revisionV1,
    resolvedSurfaces: Object.freeze([...input.resolvedSurfaces]),
    runtimeSurfaces: Object.freeze([...input.runtimeSurfaces]),
  });
}

function singleSurfaceCatalogV1(
  surface: DeepReadonly<TestSurfaceV1>,
  bindings: readonly TestBindingV1[],
  entryModes: readonly InteractionEntryModeV1[] = [surface.entryMode],
) {
  return catalogV1({
    resolvedSurfaces: [resolvedSurfaceV1({ surfaceId: surface.surfaceId, entryModes, bindings })],
    runtimeSurfaces: [surface],
  });
}

function validDetailSurfaceV1(
  surfaceId: InteractionSurfaceId = detailSurfaceIdV1,
): DeepReadonly<TestSurfaceV1> {
  return surfaceV1({
    surfaceId,
    entryMode: "explicit_control",
    targets: [targetV1(betaTargetIdV1, "direct", [behaviorV1("detail", { isDefault: true })])],
  });
}

function resolvedDetailSurfaceV1(
  surfaceId: InteractionSurfaceId = detailSurfaceIdV1,
): DeepReadonly<InteractionSurfaceDescriptorV1> {
  return resolvedSurfaceV1({
    surfaceId,
    entryModes: ["explicit_control"],
    bindings: [bindingV1(betaTargetIdV1, ["direct"])],
  });
}

function expectFaultV1(
  result: ReturnType<typeof validateRuntimeInteractionSurfaceV1>,
  code: string,
  surfaceId: InteractionSurfaceId = stageSurfaceIdV1,
  revision: NonNegativeSafeInteger = revisionV1,
): void {
  expect(result.spatialState).toBe("disabled");
  expect(result.domFallback).toEqual(expect.objectContaining({ visible: true }));
  expect(result.faults).toEqual([expect.objectContaining({ code, surfaceId, revision })]);
}

describe("validateRuntimeInteractionSurfaceV1", () => {
  it("accepts exactly one direct default even when its exact descriptor is disabled", () => {
    const reasons = Object.freeze([Object.freeze({ code: "flow.not_ready" })]);
    const disabled = behaviorV1("disabled", {
      isDefault: true,
      enabled: false,
      reasons,
    });
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", [disabled])],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["direct"])]),
    );

    expect(result.spatialState).toBe("enabled");
    expect(result.faults).toEqual([]);
    const route = result.surface.targets[0]?.behaviors[0]?.route;
    expect(route?.kind).toBe("semantic_invocation");
    if (route?.kind === "semantic_invocation") {
      expect(route.descriptor).toBe(disabled.route.descriptor);
      expect(route.descriptor.reasons).toBe(reasons);
    }
  });

  it("constructs a new deeply frozen wrapper projection from mutable runtime wrappers", () => {
    const frozenBehavior = behaviorV1("mutable", { isDefault: true });
    if (frozenBehavior.route.kind !== "semantic_invocation") {
      throw new TypeError("test fixture route must be semantic_invocation");
    }
    const mutableRoute = {
      kind: frozenBehavior.route.kind,
      descriptor: frozenBehavior.route.descriptor,
      invocation: frozenBehavior.route.invocation,
    };
    const mutableBehavior = {
      behaviorId: frozenBehavior.behaviorId,
      nameTextId: frozenBehavior.nameTextId,
      descriptionTextId: frozenBehavior.descriptionTextId,
      requiredFlags: frozenBehavior.requiredFlags,
      isDefault: frozenBehavior.isDefault,
      route: mutableRoute,
    };
    const mutableTarget = {
      targetId: alphaTargetIdV1,
      accessibleNameTextId: parseTextId("text.e2e.target.mutable.name"),
      resolutionMode: "direct" as const,
      openSurfaceId: null,
      behaviors: [mutableBehavior],
    };
    const mutableSurface = {
      surfaceId: stageSurfaceIdV1,
      accessibleNameTextId: parseTextId("text.e2e.surface.mutable.name"),
      entryMode: "always_active" as const,
      hitMapId: null,
      targets: [mutableTarget],
    };
    const result = validateRuntimeInteractionSurfaceV1(
      mutableSurface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({ bindings: [bindingV1(alphaTargetIdV1, ["direct"])] }),
        ],
        runtimeSurfaces: [mutableSurface],
      }),
    );

    expect(result.surface).not.toBe(mutableSurface);
    expect(result.surface.targets[0]).not.toBe(mutableTarget);
    expect(result.surface.targets[0]?.behaviors[0]).not.toBe(mutableBehavior);
    expect(result.surface.targets[0]?.behaviors[0]?.route).not.toBe(mutableRoute);
    expect(Object.isFrozen(result.surface)).toBe(true);
    expect(Object.isFrozen(result.surface.targets)).toBe(true);
    expect(Object.isFrozen(result.surface.targets[0])).toBe(true);
    expect(Object.isFrozen(result.surface.targets[0]?.behaviors)).toBe(true);
    expect(Object.isFrozen(result.surface.targets[0]?.behaviors[0])).toBe(true);
    expect(Object.isFrozen(result.surface.targets[0]?.behaviors[0]?.route)).toBe(true);
    const route = result.surface.targets[0]?.behaviors[0]?.route;
    expect(route?.kind).toBe("semantic_invocation");
    if (route?.kind === "semantic_invocation") {
      expect(route.descriptor).toBe(frozenBehavior.route.descriptor);
      expect(route.invocation).toBe(frozenBehavior.route.invocation);
    }
  });

  it.each([
    ["zero", []],
    [
      "two",
      [behaviorV1("direct-a", { isDefault: true }), behaviorV1("direct-b", { isDefault: true })],
    ],
  ] as const)("disables direct with %s defaults", (_label, behaviors) => {
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", behaviors)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["direct"])]),
    );
    expectFaultV1(result, "presentation.interaction.direct_default_count");
    expect(result.surface.targets).toEqual([]);
  });

  it("accepts at least two choose behaviors without reordering them", () => {
    const first = behaviorV1("choose-first");
    const second = behaviorV1("choose-second");
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "choose", [first, second])],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["choose"])]),
    );

    expect(result.spatialState).toBe("enabled");
    expect(result.surface.targets[0]?.behaviors).toEqual([first, second]);
  });

  it("accepts a nonempty runtime target subset of the resolved static bindings", () => {
    const behavior = behaviorV1("filtered-subset", { isDefault: true });
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", [behavior])],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [
        bindingV1(alphaTargetIdV1, ["direct"]),
        bindingV1(betaTargetIdV1, ["direct"]),
      ]),
    );

    expect(result.spatialState).toBe("enabled");
    expect(result.surface.targets[0]?.behaviors).toEqual([behavior]);
    expect(result.faults).toEqual([]);
  });

  it("disables choose with fewer than two behaviors", () => {
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "choose", [behaviorV1("choose-only")])],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["choose"])]),
    );
    expectFaultV1(result, "presentation.interaction.choose_behavior_count");
    expect(result.surface.targets).toEqual([]);
  });

  it("accepts behavior-free open_surface only when its resolved target is currently enterable", () => {
    const detail = validDetailSurfaceV1();
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [targetV1(alphaTargetIdV1, "open_surface", [], detailSurfaceIdV1)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({
            entryModes: ["surface_activation"],
            bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], detailSurfaceIdV1)],
          }),
          resolvedDetailSurfaceV1(),
        ],
        runtimeSurfaces: [surface, detail],
      }),
    );

    expect(result.spatialState).toBe("enabled");
    expect(result.faults).toEqual([]);
  });

  it("disables open_surface with an executable behavior without dispatching it", () => {
    const dispatch = vi.fn(() => {
      throw new Error("validation must not dispatch");
    });
    const detail = validDetailSurfaceV1();
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [
        targetV1(
          alphaTargetIdV1,
          "open_surface",
          [behaviorV1("must-not-run", { dispatch })],
          detailSurfaceIdV1,
        ),
      ],
    });
    const catalog = catalogV1({
      resolvedSurfaces: [
        resolvedSurfaceV1({
          entryModes: ["surface_activation"],
          bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], detailSurfaceIdV1)],
        }),
        resolvedDetailSurfaceV1(),
      ],
      runtimeSurfaces: [surface, detail],
    });

    expect(() => validateRuntimeInteractionSurfaceV1(surface, catalog)).not.toThrow();
    const result = validateRuntimeInteractionSurfaceV1(surface, catalog);
    expect(dispatch).not.toHaveBeenCalled();
    expectFaultV1(result, "presentation.interaction.open_surface_behavior_count");
    expect(result.surface.targets).toEqual([]);
  });

  it("disables open_surface when the referenced resolved surface is absent from the current view", () => {
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [targetV1(alphaTargetIdV1, "open_surface", [], missingSurfaceIdV1)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({
            entryModes: ["surface_activation"],
            bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], missingSurfaceIdV1)],
          }),
          resolvedSurfaceV1({
            surfaceId: missingSurfaceIdV1,
            entryModes: ["explicit_control"],
          }),
        ],
        runtimeSurfaces: [surface],
      }),
    );
    expectFaultV1(result, "presentation.interaction.open_surface_missing");
  });

  it.each([
    ["has no resolved descriptor", []],
    ["has duplicate resolved descriptors", [resolvedDetailSurfaceV1(), resolvedDetailSurfaceV1()]],
    [
      "uses a current entry mode not allowed by its resolved descriptor",
      [
        resolvedSurfaceV1({
          surfaceId: detailSurfaceIdV1,
          entryModes: ["always_active"],
          bindings: [bindingV1(betaTargetIdV1, ["direct"])],
        }),
      ],
    ],
  ] as const)("disables open_surface when the current target %s", (_label, resolvedDetails) => {
    const detail = validDetailSurfaceV1();
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [targetV1(alphaTargetIdV1, "open_surface", [], detailSurfaceIdV1)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({
            entryModes: ["surface_activation"],
            bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], detailSurfaceIdV1)],
          }),
          ...resolvedDetails,
        ],
        runtimeSurfaces: [surface, detail],
      }),
    );

    expectFaultV1(result, "presentation.interaction.open_surface_missing");
  });

  it("disables open_surface when the current target surface ID is duplicated", () => {
    const detail = validDetailSurfaceV1();
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [targetV1(alphaTargetIdV1, "open_surface", [], detailSurfaceIdV1)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({
            entryModes: ["surface_activation"],
            bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], detailSurfaceIdV1)],
          }),
          resolvedDetailSurfaceV1(),
        ],
        runtimeSurfaces: [surface, detail, detail],
      }),
    );

    expectFaultV1(result, "presentation.interaction.open_surface_missing");
  });

  it.each([
    [
      "runtime surface registration",
      (surface: DeepReadonly<TestSurfaceV1>) =>
        catalogV1({
          resolvedSurfaces: [
            resolvedSurfaceV1({
              surfaceId: surface.surfaceId,
              bindings: [bindingV1(alphaTargetIdV1, ["direct"])],
            }),
          ],
          runtimeSurfaces: [],
        }),
    ],
    [
      "resolved surface descriptor",
      (surface: DeepReadonly<TestSurfaceV1>) =>
        catalogV1({ resolvedSurfaces: [], runtimeSurfaces: [surface] }),
    ],
    [
      "entry mode",
      (surface: DeepReadonly<TestSurfaceV1>) =>
        singleSurfaceCatalogV1(
          surface,
          [bindingV1(alphaTargetIdV1, ["direct"])],
          ["surface_activation"],
        ),
    ],
    [
      "target binding",
      (surface: DeepReadonly<TestSurfaceV1>) => singleSurfaceCatalogV1(surface, []),
    ],
    [
      "resolution mode",
      (surface: DeepReadonly<TestSurfaceV1>) =>
        singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["choose"])]),
    ],
  ] as const)("locally degrades a missing %s join", (_label, createCatalog) => {
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", [behaviorV1("join", { isDefault: true })])],
    });
    expectFaultV1(
      validateRuntimeInteractionSurfaceV1(surface, createCatalog(surface)),
      "presentation.interaction.catalog_join",
    );
  });

  it("locally degrades an empty runtime target join", () => {
    const surface = surfaceV1({ targets: [] });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, []),
    );
    expectFaultV1(result, "presentation.interaction.catalog_join");
  });

  it("clears every target when the current surface-level catalog join fails", () => {
    const valid = behaviorV1("surface-join", { isDefault: true });
    const surface = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", [valid])],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({ bindings: [bindingV1(alphaTargetIdV1, ["direct"])] }),
        ],
        runtimeSurfaces: [],
      }),
    );

    expectFaultV1(result, "presentation.interaction.catalog_join");
    expect(result.surface.targets).toEqual([]);
  });

  it("locally degrades duplicate runtime target IDs", () => {
    const first = behaviorV1("duplicate-target-first", { isDefault: true });
    const second = behaviorV1("duplicate-target-second", { isDefault: true });
    const surface = surfaceV1({
      targets: [
        targetV1(alphaTargetIdV1, "direct", [first]),
        targetV1(alphaTargetIdV1, "direct", [second]),
      ],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      singleSurfaceCatalogV1(surface, [bindingV1(alphaTargetIdV1, ["direct"])]),
    );

    expectFaultV1(result, "presentation.interaction.catalog_join");
    expect(result.surface.targets).toEqual([]);
  });

  it("rejects a runtime openSurfaceId that differs from its resolved binding", () => {
    const detail = validDetailSurfaceV1();
    const sibling = validDetailSurfaceV1(siblingSurfaceIdV1);
    const surface = surfaceV1({
      entryMode: "surface_activation",
      targets: [targetV1(alphaTargetIdV1, "open_surface", [], detailSurfaceIdV1)],
    });
    const result = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        resolvedSurfaces: [
          resolvedSurfaceV1({
            entryModes: ["surface_activation"],
            bindings: [bindingV1(alphaTargetIdV1, ["open_surface"], siblingSurfaceIdV1)],
          }),
          resolvedDetailSurfaceV1(),
          resolvedDetailSurfaceV1(siblingSurfaceIdV1),
        ],
        runtimeSurfaces: [surface, detail, sibling],
      }),
    );
    expectFaultV1(result, "presentation.interaction.catalog_join");
  });

  it("deduplicates faults per code/surface/revision in a frozen safe-DOM result", () => {
    const reasons = Object.freeze([Object.freeze({ code: "flow.not_ready" })]);
    const dispatch = vi.fn(() => {
      throw new Error("validation must not dispatch");
    });
    const safeDisabled = behaviorV1("safe-disabled", {
      isDefault: true,
      enabled: false,
      reasons,
      dispatch,
    });
    const invalidAlpha = behaviorV1("invalid-alpha", { isDefault: true });
    const invalidGamma = behaviorV1("invalid-gamma", { isDefault: true });
    const surface = surfaceV1({
      targets: [
        targetV1(alphaTargetIdV1, "direct", [invalidAlpha]),
        targetV1(betaTargetIdV1, "direct", [safeDisabled]),
        targetV1(gammaTargetIdV1, "direct", [invalidGamma]),
      ],
    });
    const catalog = singleSurfaceCatalogV1(surface, [bindingV1(betaTargetIdV1, ["direct"])]);

    expect(() => validateRuntimeInteractionSurfaceV1(surface, catalog)).not.toThrow();
    expect(dispatch).not.toHaveBeenCalled();
    const validated = validateRuntimeInteractionSurfaceV1(surface, catalog);
    expectFaultV1(validated, "presentation.interaction.catalog_join");
    expect(validated.surface.targets).toHaveLength(1);
    expect(validated.surface.targets[0]?.targetId).toBe(betaTargetIdV1);
    const route = validated.surface.targets[0]?.behaviors[0]?.route;
    expect(route?.kind).toBe("semantic_invocation");
    if (route?.kind === "semantic_invocation") {
      expect(route.descriptor).toBe(safeDisabled.route.descriptor);
      expect(route.descriptor.reasons).toBe(reasons);
    }
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.surface)).toBe(true);
    expect(Object.isFrozen(validated.surface.targets)).toBe(true);
    expect(Object.isFrozen(validated.surface.targets[0]?.behaviors)).toBe(true);
    expect(Object.isFrozen(validated.domFallback)).toBe(true);
    expect(Object.isFrozen(validated.faults)).toBe(true);
    expect(Object.isFrozen(validated.faults[0])).toBe(true);

    const nextRevision = parseNonNegativeSafeInteger(revisionV1 + 1);
    const next = validateRuntimeInteractionSurfaceV1(
      surface,
      catalogV1({
        revision: nextRevision,
        resolvedSurfaces: catalog.resolvedSurfaces,
        runtimeSurfaces: catalog.runtimeSurfaces,
      }),
    );
    expectFaultV1(next, "presentation.interaction.catalog_join", stageSurfaceIdV1, nextRevision);
  });

  it("does not let one invalid surface throw through or alter a valid sibling", () => {
    const invalid = surfaceV1({
      targets: [targetV1(alphaTargetIdV1, "direct", [])],
    });
    const sibling = validDetailSurfaceV1(siblingSurfaceIdV1);
    const catalog = catalogV1({
      resolvedSurfaces: [
        resolvedSurfaceV1({ bindings: [bindingV1(alphaTargetIdV1, ["direct"])] }),
        resolvedDetailSurfaceV1(siblingSurfaceIdV1),
      ],
      runtimeSurfaces: [invalid, sibling],
    });

    expect(() => validateRuntimeInteractionSurfaceV1(invalid, catalog)).not.toThrow();
    const siblingResult = validateRuntimeInteractionSurfaceV1(sibling, catalog);
    expect(siblingResult.spatialState).toBe("enabled");
    expect(siblingResult.faults).toEqual([]);
    expect(siblingResult.surface).not.toBe(sibling);
    expect(siblingResult.surface).toEqual(sibling);
  });
});
