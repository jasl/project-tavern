// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  InteractionActivationV1,
  InteractionBehaviorId,
  InteractionSurfaceId,
  InteractionTargetId,
} from "@sillymaker/base";

import type {
  PresentationIntentV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";

export interface InteractionSemanticDescriptorV1 {
  readonly enabled: boolean;
  readonly reasons: readonly unknown[];
}

export interface InteractionIntentRouteContextV1 {
  readonly returnFocusId: string | null;
}

export type InteractionActivationResultV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TSemanticResult,
  TIntentResult,
> =
  | {
      readonly kind: "entered";
      readonly surfaceId: InteractionSurfaceId;
    }
  | {
      readonly kind: "choice_opened";
      readonly surfaceId: InteractionSurfaceId;
      readonly targetId: InteractionTargetId;
    }
  | {
      readonly kind: "dispatched";
      readonly result: TSemanticResult;
    }
  | {
      readonly kind: "intent_executed";
      readonly result: TIntentResult;
    }
  | {
      readonly kind: "disabled";
      readonly reasons: DeepReadonly<TDescriptor["reasons"]>;
    }
  | {
      readonly kind: "rejected";
      readonly code: "interaction.invalid_activation" | "interaction.invalid_route";
    };

export interface InteractionControllerV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TSemanticResult,
  TIntentResult,
> {
  activate(
    activation: DeepReadonly<InteractionActivationV1>,
  ): Promise<InteractionActivationResultV1<TDescriptor, TSemanticResult, TIntentResult>>;
  activateBehavior(
    activation: DeepReadonly<InteractionActivationV1>,
    behaviorId: InteractionBehaviorId,
  ): Promise<InteractionActivationResultV1<TDescriptor, TSemanticResult, TIntentResult>>;
}

export interface CreateInteractionControllerInputV1<
  TPublication,
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
  TSemanticResult,
  TIntentResult,
> {
  readonly presentation: Readonly<{
    getSnapshot(): DeepReadonly<TPublication>;
  }>;
  resolveSurface(
    publication: DeepReadonly<TPublication>,
    surfaceId: InteractionSurfaceId,
  ): RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> | null;
  readonly semantic: Readonly<{
    dispatch(invocation: DeepReadonly<TInvocation>): Promise<TSemanticResult>;
  }>;
  readonly intents: Readonly<{
    execute(
      intent: DeepReadonly<PresentationIntentV1>,
      context: DeepReadonly<InteractionIntentRouteContextV1>,
    ): TIntentResult;
  }>;
  readonly session: Readonly<{
    openChoice(
      surfaceId: InteractionSurfaceId,
      targetId: InteractionTargetId,
      returnFocusId: string | null,
    ): void;
  }>;
  getReturnFocusId(activation: DeepReadonly<InteractionActivationV1>): string | null;
}

type InteractionResultForV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TSemanticResult,
  TIntentResult,
> = InteractionActivationResultV1<TDescriptor, TSemanticResult, TIntentResult>;

type RuntimeSurfaceForV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
> = RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>;

type RuntimeTargetForV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
> = RuntimeInteractionTargetV1<TDescriptor, TInvocation>;

type RuntimeBehaviorForV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
> = RuntimeInteractionBehaviorV1<TDescriptor, TInvocation>;

const invalidActivationResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "interaction.invalid_activation" as const,
});

const invalidRouteResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "interaction.invalid_route" as const,
});

function isRecordV1(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

function isActivationV1(value: unknown): value is DeepReadonly<InteractionActivationV1> {
  if (!isRecordV1(value)) return false;
  return (
    typeof value.surfaceId === "string" &&
    typeof value.targetId === "string" &&
    (value.activationKind === "pointer" || value.activationKind === "semantic_control")
  );
}

function hasDescriptorGateV1(
  value: unknown,
): value is DeepReadonly<InteractionSemanticDescriptorV1> {
  return isRecordV1(value) && typeof value.enabled === "boolean" && Array.isArray(value.reasons);
}

function isPresentationIntentV1(value: unknown): value is DeepReadonly<PresentationIntentV1> {
  if (!isRecordV1(value)) return false;
  switch (value.kind) {
    case "overlay.open":
      return typeof value.overlayId === "string" && value.overlayId.length > 0;
    case "presentation.play_cue":
      return typeof value.cueId === "string" && value.cueId.length > 0;
    case "interaction.enter_surface":
      return typeof value.surfaceId === "string" && value.surfaceId.length > 0;
    case "interaction.leave_surface":
      return true;
    default:
      return false;
  }
}

function intentWasRejectedV1(value: unknown): boolean {
  return isRecordV1(value) && value.kind === "rejected";
}

function findOnlyTargetV1<TDescriptor extends InteractionSemanticDescriptorV1, TInvocation>(
  surface: RuntimeSurfaceForV1<TDescriptor, TInvocation>,
  targetId: InteractionTargetId,
): RuntimeTargetForV1<TDescriptor, TInvocation> | null {
  let match: RuntimeTargetForV1<TDescriptor, TInvocation> | null = null;
  for (const target of surface.targets) {
    if (target.targetId !== targetId) continue;
    if (match !== null) return null;
    match = target;
  }
  return match;
}

function findOnlyBehaviorV1<TDescriptor extends InteractionSemanticDescriptorV1, TInvocation>(
  target: RuntimeTargetForV1<TDescriptor, TInvocation>,
  behaviorId: InteractionBehaviorId,
): RuntimeBehaviorForV1<TDescriptor, TInvocation> | null {
  let match: RuntimeBehaviorForV1<TDescriptor, TInvocation> | null = null;
  for (const behavior of target.behaviors) {
    if (behavior.behaviorId !== behaviorId) continue;
    if (match !== null) return null;
    match = behavior;
  }
  return match;
}

function findOnlyDefaultBehaviorV1<
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
>(
  target: RuntimeTargetForV1<TDescriptor, TInvocation>,
): RuntimeBehaviorForV1<TDescriptor, TInvocation> | null {
  let match: RuntimeBehaviorForV1<TDescriptor, TInvocation> | null = null;
  for (const behavior of target.behaviors) {
    if (!behavior.isDefault) continue;
    if (match !== null) return null;
    match = behavior;
  }
  return match;
}

function disabledResultV1<TDescriptor extends InteractionSemanticDescriptorV1>(
  descriptor: DeepReadonly<TDescriptor>,
): Extract<
  InteractionActivationResultV1<TDescriptor, never, never>,
  { readonly kind: "disabled" }
> {
  return Object.freeze({
    kind: "disabled",
    reasons: descriptor.reasons,
  }) as Extract<
    InteractionActivationResultV1<TDescriptor, never, never>,
    { readonly kind: "disabled" }
  >;
}

export function createInteractionControllerV1<
  TPublication,
  TDescriptor extends InteractionSemanticDescriptorV1,
  TInvocation,
  TSemanticResult,
  TIntentResult,
>(
  input: CreateInteractionControllerInputV1<
    TPublication,
    TDescriptor,
    TInvocation,
    TSemanticResult,
    TIntentResult
  >,
): InteractionControllerV1<TDescriptor, TSemanticResult, TIntentResult> {
  type ResultV1 = InteractionResultForV1<TDescriptor, TSemanticResult, TIntentResult>;

  const resolveActivation = (
    activation: DeepReadonly<InteractionActivationV1>,
  ):
    | {
        readonly kind: "resolved";
        readonly publication: DeepReadonly<TPublication>;
        readonly surface: RuntimeSurfaceForV1<TDescriptor, TInvocation>;
        readonly target: RuntimeTargetForV1<TDescriptor, TInvocation>;
      }
    | { readonly kind: "invalid" } => {
    if (!isActivationV1(activation)) return Object.freeze({ kind: "invalid" });
    try {
      const publication = input.presentation.getSnapshot();
      const surface = input.resolveSurface(publication, activation.surfaceId);
      if (surface === null || surface.surfaceId !== activation.surfaceId) {
        return Object.freeze({ kind: "invalid" });
      }
      const target = findOnlyTargetV1(surface, activation.targetId);
      if (target === null) return Object.freeze({ kind: "invalid" });
      return Object.freeze({ kind: "resolved", publication, surface, target });
    } catch {
      return Object.freeze({ kind: "invalid" });
    }
  };

  const resolveReturnFocusId = (
    activation: DeepReadonly<InteractionActivationV1>,
  ): string | null | undefined => {
    try {
      const returnFocusId = input.getReturnFocusId(activation);
      if (
        returnFocusId !== null &&
        (typeof returnFocusId !== "string" || returnFocusId.length === 0)
      ) {
        return undefined;
      }
      return returnFocusId;
    } catch {
      return undefined;
    }
  };

  const routeIntent = (
    intent: DeepReadonly<PresentationIntentV1>,
    returnFocusId: string | null,
  ):
    | { readonly kind: "executed"; readonly result: TIntentResult }
    | { readonly kind: "invalid" } => {
    if (!isPresentationIntentV1(intent)) return Object.freeze({ kind: "invalid" });
    try {
      const result = input.intents.execute(
        intent,
        Object.freeze({ returnFocusId }) satisfies InteractionIntentRouteContextV1,
      );
      if (intentWasRejectedV1(result)) return Object.freeze({ kind: "invalid" });
      return Object.freeze({ kind: "executed", result });
    } catch {
      return Object.freeze({ kind: "invalid" });
    }
  };

  const executeBehavior = async (
    behavior: RuntimeBehaviorForV1<TDescriptor, TInvocation>,
    returnFocusId: string | null,
  ): Promise<ResultV1> => {
    const route = behavior.route;
    switch (route.kind) {
      case "semantic_invocation": {
        if (!hasDescriptorGateV1(route.descriptor)) return invalidRouteResultV1;
        if (!route.descriptor.enabled) {
          return disabledResultV1(route.descriptor as DeepReadonly<TDescriptor>);
        }
        const result = (await input.semantic.dispatch(route.invocation)) as TSemanticResult;
        return Object.freeze({ kind: "dispatched" as const, result });
      }
      case "semantic_control": {
        if (!hasDescriptorGateV1(route.descriptor)) return invalidRouteResultV1;
        if (!route.descriptor.enabled) {
          return disabledResultV1(route.descriptor as DeepReadonly<TDescriptor>);
        }
        const routed = routeIntent(route.intent, returnFocusId);
        if (routed.kind === "invalid") return invalidRouteResultV1;
        return Object.freeze({ kind: "intent_executed" as const, result: routed.result });
      }
      case "presentation_intent": {
        const routed = routeIntent(route.intent, returnFocusId);
        if (routed.kind === "invalid") return invalidRouteResultV1;
        return Object.freeze({ kind: "intent_executed" as const, result: routed.result });
      }
      default:
        return invalidRouteResultV1;
    }
  };

  const activate = async (activation: DeepReadonly<InteractionActivationV1>): Promise<ResultV1> => {
    const resolved = resolveActivation(activation);
    if (resolved.kind === "invalid") return invalidActivationResultV1;
    const returnFocusId = resolveReturnFocusId(activation);
    if (returnFocusId === undefined) return invalidActivationResultV1;

    const { publication, surface, target } = resolved;
    switch (target.resolutionMode) {
      case "open_surface": {
        if (target.behaviors.length !== 0 || target.openSurfaceId === null) {
          return invalidRouteResultV1;
        }
        let destination: RuntimeSurfaceForV1<TDescriptor, TInvocation> | null;
        try {
          destination = input.resolveSurface(publication, target.openSurfaceId);
        } catch {
          return invalidRouteResultV1;
        }
        if (destination === null || destination.surfaceId !== target.openSurfaceId) {
          return invalidRouteResultV1;
        }
        const intent = Object.freeze({
          kind: "interaction.enter_surface" as const,
          surfaceId: target.openSurfaceId,
        });
        const routed = routeIntent(intent, returnFocusId);
        if (routed.kind === "invalid") return invalidRouteResultV1;
        return Object.freeze({ kind: "entered", surfaceId: target.openSurfaceId });
      }
      case "choose": {
        if (target.behaviors.length < 2) return invalidRouteResultV1;
        try {
          input.session.openChoice(surface.surfaceId, target.targetId, returnFocusId);
        } catch {
          return invalidRouteResultV1;
        }
        return Object.freeze({
          kind: "choice_opened",
          surfaceId: surface.surfaceId,
          targetId: target.targetId,
        });
      }
      case "direct": {
        const behavior = findOnlyDefaultBehaviorV1(target);
        if (behavior === null) return invalidRouteResultV1;
        return executeBehavior(behavior, returnFocusId);
      }
      default:
        return invalidRouteResultV1;
    }
  };

  const activateBehavior = async (
    activation: DeepReadonly<InteractionActivationV1>,
    behaviorId: InteractionBehaviorId,
  ): Promise<ResultV1> => {
    const resolved = resolveActivation(activation);
    if (resolved.kind === "invalid" || typeof behaviorId !== "string") {
      return invalidActivationResultV1;
    }
    const behavior = findOnlyBehaviorV1(resolved.target, behaviorId);
    if (behavior === null) return invalidActivationResultV1;
    const returnFocusId = resolveReturnFocusId(activation);
    if (returnFocusId === undefined) return invalidActivationResultV1;
    return executeBehavior(behavior, returnFocusId);
  };

  return Object.freeze({ activate, activateBehavior });
}
