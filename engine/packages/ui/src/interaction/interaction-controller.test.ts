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
  InteractionActivationV1,
  InteractionBehaviorId,
  InteractionEntryModeV1,
  InteractionResolutionModeV1,
  InteractionSurfaceId,
  InteractionTargetId,
  NonNegativeSafeInteger,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import type {
  PresentationIntentV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";
import { createInteractionControllerV1 } from "./interaction-controller.js";

interface TestReasonV1 {
  readonly code: string;
}

interface TestDescriptorV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<TestReasonV1>[];
}

interface TestInvocationV1 {
  readonly actionId: string;
  readonly parameters: Readonly<Record<string, never>>;
}

type TestSemanticResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<TestReasonV1>[];
    };

type TestBehaviorV1 = RuntimeInteractionBehaviorV1<TestDescriptorV1, TestInvocationV1>;
type TestTargetV1 = RuntimeInteractionTargetV1<TestDescriptorV1, TestInvocationV1>;
type TestSurfaceV1 = RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>;

interface TestRuntimePresentationPublicationV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly semantic: Readonly<{ readonly revision: NonNegativeSafeInteger }>;
  readonly view: Readonly<{
    readonly interactionSurfaces: readonly DeepReadonly<TestSurfaceV1>[];
  }>;
  readonly requiredAssetIds: readonly string[];
}

const stageSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.stage");
const detailSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.detail");
const staleSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.stale");
const stageTargetIdV1 = parseInteractionTargetId("target.e2e.stage");
const detailTargetIdV1 = parseInteractionTargetId("target.e2e.detail");
const missingTargetIdV1 = parseInteractionTargetId("target.e2e.missing");
const semanticControlFocusIdV1 = "interaction-control.e2e.detail";
const committedResultV1 = Object.freeze({ kind: "committed" as const });
const intentExecutedResultV1 = Object.freeze({ kind: "executed" as const });

function semanticBehaviorV1(
  suffix: string,
  input: {
    readonly isDefault?: boolean;
    readonly enabled?: boolean;
    readonly reasons?: readonly DeepReadonly<TestReasonV1>[];
    readonly descriptor?: DeepReadonly<TestDescriptorV1>;
    readonly invocation?: DeepReadonly<TestInvocationV1>;
  } = {},
): DeepReadonly<TestBehaviorV1> {
  const actionId = `action.e2e.${suffix}`;
  return Object.freeze({
    behaviorId: parseInteractionBehaviorId(`behavior.e2e.${suffix}`),
    nameTextId: parseTextId(`text.e2e.behavior.${suffix}.name`),
    descriptionTextId: null,
    requiredFlags: emptyContentMaturityFlagsV1,
    isDefault: input.isDefault ?? false,
    route: Object.freeze({
      kind: "semantic_invocation" as const,
      descriptor:
        input.descriptor ??
        Object.freeze({
          actionId,
          enabled: input.enabled ?? true,
          reasons: input.reasons ?? Object.freeze([]),
        }),
      invocation:
        input.invocation ??
        Object.freeze({
          actionId,
          parameters: Object.freeze({}),
        }),
    }),
  });
}

function presentationBehaviorV1(
  suffix: string,
  intent: PresentationIntentV1,
): DeepReadonly<TestBehaviorV1> {
  return Object.freeze({
    behaviorId: parseInteractionBehaviorId(`behavior.e2e.${suffix}`),
    nameTextId: parseTextId(`text.e2e.behavior.${suffix}.name`),
    descriptionTextId: null,
    requiredFlags: emptyContentMaturityFlagsV1,
    isDefault: true,
    route: Object.freeze({
      kind: "presentation_intent" as const,
      intent,
    }),
  });
}

function semanticControlBehaviorV1(
  suffix: string,
  descriptor: DeepReadonly<TestDescriptorV1>,
  intent: Extract<PresentationIntentV1, { readonly kind: "overlay.open" }>,
): DeepReadonly<TestBehaviorV1> {
  return Object.freeze({
    behaviorId: parseInteractionBehaviorId(`behavior.e2e.${suffix}`),
    nameTextId: parseTextId(`text.e2e.behavior.${suffix}.name`),
    descriptionTextId: null,
    requiredFlags: emptyContentMaturityFlagsV1,
    isDefault: true,
    route: Object.freeze({
      kind: "semantic_control" as const,
      descriptor,
      intent,
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
  entryMode: InteractionEntryModeV1,
  target: DeepReadonly<TestTargetV1>,
  surfaceId: InteractionSurfaceId = stageSurfaceIdV1,
): DeepReadonly<TestSurfaceV1> {
  return Object.freeze({
    surfaceId,
    accessibleNameTextId: parseTextId(`text.e2e.${surfaceId}.name`),
    entryMode,
    hitMapId: null,
    targets: Object.freeze([target]),
  });
}

function publicationV1(
  revision: number,
  surfaces: readonly DeepReadonly<TestSurfaceV1>[],
): DeepReadonly<TestRuntimePresentationPublicationV1> {
  const parsedRevision = parseNonNegativeSafeInteger(revision);
  return Object.freeze({
    revision: parsedRevision,
    semantic: Object.freeze({ revision: parsedRevision }),
    view: Object.freeze({ interactionSurfaces: Object.freeze([...surfaces]) }),
    requiredAssetIds: Object.freeze([]),
  });
}

function activationV1(
  surfaceId: InteractionSurfaceId,
  targetId: InteractionTargetId,
  activationKind: InteractionActivationV1["activationKind"],
): DeepReadonly<InteractionActivationV1> {
  return Object.freeze({ surfaceId, targetId, activationKind });
}

type TestDispatchV1 = (invocation: DeepReadonly<TestInvocationV1>) => Promise<TestSemanticResultV1>;

function createInteractionControllerFixtureV1(input: {
  readonly surfaces: readonly DeepReadonly<TestSurfaceV1>[];
  readonly dispatch?: TestDispatchV1;
}) {
  let currentPublication = publicationV1(0, input.surfaces);
  let authoritativeSequence = 0;
  const authoritativeCommandLog: Array<DeepReadonly<TestInvocationV1>> = [];
  const routedIntents: Array<DeepReadonly<PresentationIntentV1>> = [];
  const openedChoices: Array<
    Readonly<{ readonly surfaceId: InteractionSurfaceId; readonly targetId: InteractionTargetId }>
  > = [];

  const defaultDispatch: TestDispatchV1 = async (invocation) => {
    authoritativeSequence += 1;
    authoritativeCommandLog.push(invocation);
    return committedResultV1;
  };
  const dispatch = vi.fn(input.dispatch ?? defaultDispatch);
  const getSnapshot = vi.fn(() => currentPublication);
  const resolveSurface = vi.fn(
    (
      publication: DeepReadonly<TestRuntimePresentationPublicationV1>,
      surfaceId: InteractionSurfaceId,
    ): DeepReadonly<TestSurfaceV1> | null =>
      publication.view.interactionSurfaces.find((surface) => surface.surfaceId === surfaceId) ??
      null,
  );
  const routeIntent = vi.fn(
    (
      intent: DeepReadonly<PresentationIntentV1>,
      _context?: Readonly<{ readonly returnFocusId: string | null }>,
    ) => {
      routedIntents.push(intent);
      return intentExecutedResultV1;
    },
  );
  const openChoice = vi.fn(
    (
      surfaceId: InteractionSurfaceId,
      targetId: InteractionTargetId,
      _returnFocusId: string | null,
    ) => {
      openedChoices.push(Object.freeze({ surfaceId, targetId }));
    },
  );
  const getReturnFocusId = vi.fn((activation: DeepReadonly<InteractionActivationV1>) =>
    activation.activationKind === "semantic_control" ? semanticControlFocusIdV1 : null,
  );

  const controller = createInteractionControllerV1({
    presentation: Object.freeze({ getSnapshot }),
    resolveSurface,
    semantic: Object.freeze({ dispatch }),
    intents: Object.freeze({ execute: routeIntent }),
    session: Object.freeze({ openChoice }),
    getReturnFocusId,
  });

  return Object.freeze({
    controller,
    dispatch,
    getSnapshot,
    resolveSurface,
    routeIntent,
    openChoice,
    getReturnFocusId,
    routedIntents,
    openedChoices,
    publish(surfaces: readonly DeepReadonly<TestSurfaceV1>[]) {
      currentPublication = publicationV1(currentPublication.revision + 1, surfaces);
      return currentPublication;
    },
    publication: () => currentPublication,
    authoritativeEvidence: () =>
      Object.freeze({
        sequence: authoritativeSequence,
        commandLog: Object.freeze([...authoritativeCommandLog]),
      }),
  });
}

function fixtureForLegalPathV1(
  entryMode: InteractionEntryModeV1,
  activationStep: "surface" | "target" | "control",
  resolutionMode: InteractionResolutionModeV1,
) {
  const targetId = activationStep === "surface" ? stageTargetIdV1 : detailTargetIdV1;
  const target =
    resolutionMode === "open_surface"
      ? targetV1(targetId, resolutionMode, [], detailSurfaceIdV1)
      : resolutionMode === "choose"
        ? targetV1(targetId, resolutionMode, [
            semanticBehaviorV1("choose.alpha", { isDefault: true }),
            semanticBehaviorV1("choose.beta"),
          ])
        : targetV1(targetId, resolutionMode, [
            semanticBehaviorV1(`direct.${activationStep}`, { isDefault: true }),
          ]);
  const sourceSurface = surfaceV1(entryMode, target);
  const destinationSurface = surfaceV1(
    "explicit_control",
    targetV1(detailTargetIdV1, "direct", [semanticBehaviorV1("destination", { isDefault: true })]),
    detailSurfaceIdV1,
  );
  const fixture = createInteractionControllerFixtureV1({
    surfaces:
      resolutionMode === "open_surface" ? [sourceSurface, destinationSurface] : [sourceSurface],
  });
  const activation = activationV1(
    sourceSurface.surfaceId,
    targetId,
    activationStep === "control" ? "semantic_control" : "pointer",
  );
  return Object.freeze({
    ...fixture,
    sourceSurface,
    target,
    activation,
    activate: () => fixture.controller.activate(activation),
  });
}

describe("InteractionControllerV1", () => {
  it.each([
    ["surface_activation", "surface", "open_surface", "entered"],
    ["surface_activation", "target", "direct", "dispatched"],
    ["surface_activation", "target", "choose", "choice_opened"],
    ["always_active", "target", "direct", "dispatched"],
    ["always_active", "target", "choose", "choice_opened"],
    ["explicit_control", "control", "open_surface", "entered"],
    ["explicit_control", "control", "direct", "dispatched"],
  ] as const)(
    "routes %s/%s + %s to %s",
    async (entryMode, activationStep, resolutionMode, expected) => {
      const fixture = fixtureForLegalPathV1(entryMode, activationStep, resolutionMode);

      await expect(fixture.activate()).resolves.toMatchObject({ kind: expected });

      if (expected === "entered") {
        expect(fixture.routeIntent).toHaveBeenCalledWith(
          {
            kind: "interaction.enter_surface",
            surfaceId: detailSurfaceIdV1,
          },
          {
            returnFocusId:
              fixture.activation.activationKind === "semantic_control"
                ? semanticControlFocusIdV1
                : null,
          },
        );
        expect(fixture.dispatch).not.toHaveBeenCalled();
      } else if (expected === "choice_opened") {
        expect(fixture.openChoice).toHaveBeenCalledWith(
          fixture.sourceSurface.surfaceId,
          fixture.target.targetId,
          fixture.activation.activationKind === "semantic_control"
            ? semanticControlFocusIdV1
            : null,
        );
        expect(fixture.dispatch).not.toHaveBeenCalled();
      } else {
        expect(fixture.dispatch).toHaveBeenCalledOnce();
        expect(fixture.routeIntent).not.toHaveBeenCalled();
      }
    },
  );

  it("dispatches the exact current descriptor invocation without constructing a command", async () => {
    const currentActionDescriptor = Object.freeze({
      actionId: "action.e2e.increment",
      enabled: true,
      reasons: Object.freeze([]),
    }) satisfies DeepReadonly<TestDescriptorV1>;
    const projectedInvocation = Object.freeze({
      actionId: currentActionDescriptor.actionId,
      parameters: Object.freeze({}),
    }) satisfies DeepReadonly<TestInvocationV1>;
    const projectedBehavior = semanticBehaviorV1("increment", {
      isDefault: true,
      descriptor: currentActionDescriptor,
      invocation: projectedInvocation,
    });
    const surface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [projectedBehavior]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    await fixture.controller.activate(activationV1(surface.surfaceId, stageTargetIdV1, "pointer"));

    expect(fixture.dispatch).toHaveBeenCalledWith(projectedInvocation);
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(projectedInvocation);
    expect(projectedBehavior.route.kind).toBe("semantic_invocation");
    if (projectedBehavior.route.kind === "semantic_invocation") {
      expect(projectedBehavior.route.descriptor).toBe(currentActionDescriptor);
    }
    expect(fixture.dispatch).toHaveBeenCalledTimes(1);
    expect(fixture.authoritativeEvidence().commandLog[0]).toBe(projectedInvocation);
    expect(JSON.stringify(fixture.authoritativeEvidence().commandLog[0])).not.toMatch(
      /surface|target|behavior|coordinate|pointer|device|dom|renderer|preference/iu,
    );
  });

  it("executes a Presentation-only cue without sequence, CommandLog, or semantic movement", async () => {
    const cueIntent = Object.freeze({
      kind: "presentation.play_cue" as const,
      cueId: "cue.e2e.counter.extra",
    });
    const cueBehavior = presentationBehaviorV1("cue", cueIntent);
    const surface = surfaceV1(
      "explicit_control",
      targetV1(detailTargetIdV1, "direct", [cueBehavior]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });
    const before = fixture.authoritativeEvidence();

    await expect(
      fixture.controller.activate(
        activationV1(surface.surfaceId, detailTargetIdV1, "semantic_control"),
      ),
    ).resolves.toMatchObject({ kind: "intent_executed" });

    expect(fixture.routedIntents).toEqual([cueIntent]);
    expect(fixture.routedIntents[0]).toBe(cueIntent);
    expect(fixture.authoritativeEvidence()).toEqual(before);
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("routes an enabled semantic control from its exact descriptor without dispatching", async () => {
    const descriptor = Object.freeze({
      actionId: "action.e2e.configure",
      enabled: true,
      reasons: Object.freeze([]),
    }) satisfies DeepReadonly<TestDescriptorV1>;
    const overlayIntent = Object.freeze({
      kind: "overlay.open" as const,
      overlayId: "overlay.e2e.configure",
    });
    const behavior = semanticControlBehaviorV1("configure", descriptor, overlayIntent);
    const surface = surfaceV1("explicit_control", targetV1(detailTargetIdV1, "direct", [behavior]));
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    await expect(
      fixture.controller.activate(
        activationV1(surface.surfaceId, detailTargetIdV1, "semantic_control"),
      ),
    ).resolves.toMatchObject({ kind: "intent_executed" });

    expect(behavior.route.kind).toBe("semantic_control");
    if (behavior.route.kind === "semantic_control") {
      expect(behavior.route.descriptor).toBe(descriptor);
    }
    expect(fixture.routeIntent).toHaveBeenCalledWith(overlayIntent, {
      returnFocusId: semanticControlFocusIdV1,
    });
    expect(fixture.routedIntents[0]).toBe(overlayIntent);
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("returns an exact disabled semantic-control reason without opening its overlay", async () => {
    const reasons = Object.freeze([Object.freeze({ code: "flow.not_configurable" })]);
    const descriptor = Object.freeze({
      actionId: "action.e2e.configure",
      enabled: false,
      reasons,
    }) satisfies DeepReadonly<TestDescriptorV1>;
    const behavior = semanticControlBehaviorV1(
      "configure-disabled",
      descriptor,
      Object.freeze({
        kind: "overlay.open",
        overlayId: "overlay.e2e.configure",
      }),
    );
    const surface = surfaceV1("explicit_control", targetV1(detailTargetIdV1, "direct", [behavior]));
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    const result = await fixture.controller.activate(
      activationV1(surface.surfaceId, detailTargetIdV1, "semantic_control"),
    );

    expect(result).toMatchObject({ kind: "disabled", reasons });
    if (result.kind === "disabled") expect(result.reasons).toBe(reasons);
    expect(fixture.routeIntent).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("returns the exact direct descriptor reasons without dispatching when disabled", async () => {
    const reasons = Object.freeze([
      Object.freeze({ code: "flow.not_ready" }),
      Object.freeze({ code: "counter.value_out_of_range" }),
    ]);
    const disabled = semanticBehaviorV1("disabled", {
      isDefault: true,
      enabled: false,
      reasons,
    });
    const surface = surfaceV1("always_active", targetV1(stageTargetIdV1, "direct", [disabled]));
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    const result = await fixture.controller.activate(
      activationV1(surface.surfaceId, stageTargetIdV1, "pointer"),
    );

    expect(result).toMatchObject({ kind: "disabled", reasons });
    if (result.kind === "disabled") expect(result.reasons).toBe(reasons);
    expect(fixture.dispatch).not.toHaveBeenCalled();
    expect(fixture.routeIntent).not.toHaveBeenCalled();
    expect(fixture.openChoice).not.toHaveBeenCalled();
  });

  it("re-resolves the latest disabled descriptor before pointer execution", async () => {
    const initiallyEnabled = semanticBehaviorV1("increment", { isDefault: true });
    const initialSurface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [initiallyEnabled]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [initialSurface] });
    const pointerActivation = activationV1(initialSurface.surfaceId, stageTargetIdV1, "pointer");
    const disabledReasons = Object.freeze([Object.freeze({ code: "counter.value_out_of_range" })]);
    const latestBehavior = semanticBehaviorV1("increment", {
      isDefault: true,
      enabled: false,
      reasons: disabledReasons,
    });
    const latestSurface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [latestBehavior]),
    );
    const latestPublication = fixture.publish([latestSurface]);

    const result = await fixture.controller.activate(pointerActivation);

    expect(fixture.getSnapshot).toHaveBeenCalledOnce();
    expect(fixture.resolveSurface).toHaveBeenCalledWith(
      latestPublication,
      initialSurface.surfaceId,
    );
    expect(result).toMatchObject({ kind: "disabled", reasons: disabledReasons });
    if (result.kind === "disabled") expect(result.reasons).toBe(disabledReasons);
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("freshly resolves and activates the exact chosen behavior", async () => {
    const first = semanticBehaviorV1("choose.first", { isDefault: true });
    const secondInvocation = Object.freeze({
      actionId: "action.e2e.choose.second",
      parameters: Object.freeze({}),
    });
    const second = semanticBehaviorV1("choose.second", {
      invocation: secondInvocation,
    });
    const surface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "choose", [first, second]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });
    const activation = activationV1(surface.surfaceId, stageTargetIdV1, "pointer");

    await expect(
      fixture.controller.activateBehavior(activation, second.behaviorId),
    ).resolves.toMatchObject({ kind: "dispatched" });

    expect(fixture.getSnapshot).toHaveBeenCalledOnce();
    expect(fixture.dispatch).toHaveBeenCalledWith(secondInvocation);
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(secondInvocation);
    expect(fixture.dispatch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["pointer", null],
    ["semantic_control", semanticControlFocusIdV1],
  ] as const)(
    "passes %s choice activation return focus through the session lens",
    async (activationKind, expectedReturnFocusId) => {
      const surface = surfaceV1(
        "always_active",
        targetV1(stageTargetIdV1, "choose", [
          semanticBehaviorV1("focus.first", { isDefault: true }),
          semanticBehaviorV1("focus.second"),
        ]),
      );
      const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });
      const activation = activationV1(surface.surfaceId, stageTargetIdV1, activationKind);

      await expect(fixture.controller.activate(activation)).resolves.toMatchObject({
        kind: "choice_opened",
      });

      expect(fixture.getReturnFocusId).toHaveBeenCalledWith(activation);
      expect(fixture.openChoice).toHaveBeenCalledWith(
        surface.surfaceId,
        stageTargetIdV1,
        expectedReturnFocusId,
      );
    },
  );

  it.each([
    ["missing_surface", staleSurfaceIdV1, stageTargetIdV1],
    ["missing_target", stageSurfaceIdV1, missingTargetIdV1],
  ] as const)("fails closed for an invalid %s activation", async (_case, surfaceId, targetId) => {
    const surface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [semanticBehaviorV1("increment", { isDefault: true })]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    await expect(
      fixture.controller.activate(activationV1(surfaceId, targetId, "pointer")),
    ).resolves.toEqual({
      kind: "rejected",
      code: "interaction.invalid_activation",
    });

    expect(fixture.dispatch).not.toHaveBeenCalled();
    expect(fixture.routeIntent).not.toHaveBeenCalled();
    expect(fixture.openChoice).not.toHaveBeenCalled();
  });

  it("fails closed when the latest behavior route is invalid", async () => {
    const malformedBehavior = Object.freeze({
      ...semanticBehaviorV1("malformed", { isDefault: true }),
      route: Object.freeze({ kind: "arbitrary_callback", callback: vi.fn() }),
    }) as unknown as DeepReadonly<TestBehaviorV1>;
    const surface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [malformedBehavior]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });

    await expect(
      fixture.controller.activate(activationV1(surface.surfaceId, stageTargetIdV1, "pointer")),
    ).resolves.toEqual({
      kind: "rejected",
      code: "interaction.invalid_route",
    });

    expect(fixture.dispatch).not.toHaveBeenCalled();
    expect(fixture.routeIntent).not.toHaveBeenCalled();
    expect(fixture.openChoice).not.toHaveBeenCalled();
  });

  it("awaits Gameplay dispatch without emitting an optimistic cue", async () => {
    let resolveDispatch: ((result: TestSemanticResultV1) => void) | undefined;
    const dispatch = vi.fn(
      () =>
        new Promise<TestSemanticResultV1>((resolve) => {
          resolveDispatch = resolve;
        }),
    );
    const surface = surfaceV1(
      "always_active",
      targetV1(stageTargetIdV1, "direct", [semanticBehaviorV1("increment", { isDefault: true })]),
    );
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface], dispatch });
    const settled = vi.fn();

    const activation = fixture.controller.activate(
      activationV1(surface.surfaceId, stageTargetIdV1, "pointer"),
    );
    void activation.then(settled);
    await Promise.resolve();

    expect(fixture.dispatch).toHaveBeenCalledOnce();
    expect(settled).not.toHaveBeenCalled();
    expect(fixture.routedIntents).toEqual([]);

    if (resolveDispatch === undefined) throw new TypeError("dispatch fixture was not called");
    resolveDispatch(committedResultV1);
    await expect(activation).resolves.toEqual({
      kind: "dispatched",
      result: committedResultV1,
    });
    expect(fixture.routedIntents).toEqual([]);
  });

  it("fails a stale behavior selection closed without falling back to a default", async () => {
    const onlyBehavior = semanticBehaviorV1("only", { isDefault: true });
    const surface = surfaceV1("always_active", targetV1(stageTargetIdV1, "direct", [onlyBehavior]));
    const fixture = createInteractionControllerFixtureV1({ surfaces: [surface] });
    const missingBehaviorId = parseInteractionBehaviorId("behavior.e2e.missing");

    await expect(
      fixture.controller.activateBehavior(
        activationV1(surface.surfaceId, stageTargetIdV1, "semantic_control"),
        missingBehaviorId as InteractionBehaviorId,
      ),
    ).resolves.toEqual({
      kind: "rejected",
      code: "interaction.invalid_activation",
    });

    expect(fixture.dispatch).not.toHaveBeenCalled();
    expect(fixture.routeIntent).not.toHaveBeenCalled();
  });
});
