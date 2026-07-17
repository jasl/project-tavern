// SPDX-License-Identifier: MIT
import type {
  InteractionSurfaceDescriptorV1,
  InteractionSurfaceId,
  NonNegativeSafeInteger,
} from "@sillymaker/base";

import type {
  PresentationFaultV1,
  PresentationIntentV1,
  RuntimeInteractionBehaviorRouteV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";

interface RuntimeInteractionValidationCatalogV1<TDescriptor, TInvocation> {
  readonly revision: NonNegativeSafeInteger;
  readonly resolvedSurfaces: readonly InteractionSurfaceDescriptorV1[];
  readonly runtimeSurfaces: readonly RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>[];
}

interface RuntimeInteractionValidationResultV1<TDescriptor, TInvocation> {
  readonly surface: RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>;
  readonly spatialState: "enabled" | "disabled";
  readonly domFallback: Readonly<{ readonly visible: boolean }>;
  readonly faults: readonly PresentationFaultV1[];
}

type PresentationFaultCodeV1 = PresentationFaultV1["code"];

function findOnlyRuntimeSurfaceV1<TDescriptor, TInvocation>(
  surfaces: readonly RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>[],
  surfaceId: InteractionSurfaceId,
): RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> | null {
  let match: RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> | null = null;
  for (const candidate of surfaces) {
    if (candidate.surfaceId !== surfaceId) continue;
    if (match !== null) return null;
    match = candidate;
  }
  return match;
}

function findOnlyResolvedSurfaceV1(
  surfaces: readonly InteractionSurfaceDescriptorV1[],
  surfaceId: InteractionSurfaceId,
): InteractionSurfaceDescriptorV1 | null {
  let match: InteractionSurfaceDescriptorV1 | null = null;
  for (const candidate of surfaces) {
    if (candidate.surfaceId !== surfaceId) continue;
    if (match !== null) return null;
    match = candidate;
  }
  return match;
}

function isCurrentlyEnterableSurfaceV1<TDescriptor, TInvocation>(
  catalog: RuntimeInteractionValidationCatalogV1<TDescriptor, TInvocation>,
  surfaceId: InteractionSurfaceId,
): boolean {
  const runtimeSurface = findOnlyRuntimeSurfaceV1(catalog.runtimeSurfaces, surfaceId);
  const resolvedSurface = findOnlyResolvedSurfaceV1(catalog.resolvedSurfaces, surfaceId);
  return (
    runtimeSurface !== null &&
    resolvedSurface !== null &&
    resolvedSurface.allowedEntryModes.includes(runtimeSurface.entryMode)
  );
}

function sanitizePresentationIntentV1(intent: PresentationIntentV1): PresentationIntentV1 {
  if (intent.kind === "overlay.open") {
    return Object.freeze({ kind: intent.kind, overlayId: intent.overlayId });
  }
  if (intent.kind === "presentation.play_cue") {
    return Object.freeze({ kind: intent.kind, cueId: intent.cueId });
  }
  if (intent.kind === "interaction.enter_surface") {
    return Object.freeze({ kind: intent.kind, surfaceId: intent.surfaceId });
  }
  return Object.freeze({ kind: intent.kind });
}

function sanitizeRouteV1<TDescriptor, TInvocation>(
  route: RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation>,
): RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation> {
  if (route.kind === "semantic_invocation") {
    return Object.freeze({
      kind: route.kind,
      descriptor: route.descriptor,
      invocation: route.invocation,
    });
  }
  if (route.kind === "semantic_control") {
    return Object.freeze({
      kind: route.kind,
      descriptor: route.descriptor,
      intent: Object.freeze({ kind: route.intent.kind, overlayId: route.intent.overlayId }),
    });
  }
  return Object.freeze({
    kind: route.kind,
    intent: sanitizePresentationIntentV1(route.intent),
  });
}

function sanitizeBehaviorV1<TDescriptor, TInvocation>(
  behavior: RuntimeInteractionBehaviorV1<TDescriptor, TInvocation>,
): RuntimeInteractionBehaviorV1<TDescriptor, TInvocation> {
  return Object.freeze({
    behaviorId: behavior.behaviorId,
    nameTextId: behavior.nameTextId,
    descriptionTextId: behavior.descriptionTextId,
    requiredFlags: behavior.requiredFlags,
    isDefault: behavior.isDefault,
    route: sanitizeRouteV1(behavior.route),
  });
}

function sanitizeTargetV1<TDescriptor, TInvocation>(
  target: RuntimeInteractionTargetV1<TDescriptor, TInvocation>,
): RuntimeInteractionTargetV1<TDescriptor, TInvocation> {
  return Object.freeze({
    targetId: target.targetId,
    accessibleNameTextId: target.accessibleNameTextId,
    resolutionMode: target.resolutionMode,
    openSurfaceId: target.openSurfaceId,
    behaviors: Object.freeze(target.behaviors.map((behavior) => sanitizeBehaviorV1(behavior))),
  });
}

function sanitizeSurfaceV1<TDescriptor, TInvocation>(
  surface: RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>,
  targets: readonly RuntimeInteractionTargetV1<TDescriptor, TInvocation>[],
): RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> {
  return Object.freeze({
    surfaceId: surface.surfaceId,
    accessibleNameTextId: surface.accessibleNameTextId,
    entryMode: surface.entryMode,
    hitMapId: surface.hitMapId,
    targets: Object.freeze(targets.map((target) => sanitizeTargetV1(target))),
  });
}

/**
 * Validates one runtime surface against the resolved catalog and current
 * publication, then returns a frozen fail-closed projection. Semantic
 * descriptor and invocation references are preserved and never executed.
 */
export function validateRuntimeInteractionSurfaceV1<TDescriptor, TInvocation>(
  surface: RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>,
  catalog: RuntimeInteractionValidationCatalogV1<TDescriptor, TInvocation>,
): RuntimeInteractionValidationResultV1<TDescriptor, TInvocation> {
  const faults: PresentationFaultV1[] = [];
  const faultKeys = new Set<string>();
  const addFault = (code: PresentationFaultCodeV1): void => {
    const key = `${code}\u0000${surface.surfaceId}\u0000${catalog.revision}`;
    if (faultKeys.has(key)) return;
    faultKeys.add(key);
    faults.push(
      Object.freeze({
        code,
        surfaceId: surface.surfaceId,
        revision: catalog.revision,
      }),
    );
  };

  let surfaceJoinValid = true;
  const currentRuntimeSurface = findOnlyRuntimeSurfaceV1(
    catalog.runtimeSurfaces,
    surface.surfaceId,
  );
  if (currentRuntimeSurface !== surface) {
    addFault("presentation.interaction.catalog_join");
    surfaceJoinValid = false;
  }

  const resolvedSurface = findOnlyResolvedSurfaceV1(catalog.resolvedSurfaces, surface.surfaceId);
  if (resolvedSurface === null) {
    addFault("presentation.interaction.catalog_join");
    surfaceJoinValid = false;
  } else if (!resolvedSurface.allowedEntryModes.includes(surface.entryMode)) {
    addFault("presentation.interaction.catalog_join");
    surfaceJoinValid = false;
  }

  if (surface.targets.length === 0) {
    addFault("presentation.interaction.catalog_join");
    surfaceJoinValid = false;
  }

  const runtimeTargetCounts = new Map<string, number>();
  for (const target of surface.targets) {
    runtimeTargetCounts.set(target.targetId, (runtimeTargetCounts.get(target.targetId) ?? 0) + 1);
  }

  const validTargets: Array<RuntimeInteractionTargetV1<TDescriptor, TInvocation>> = [];
  for (const target of surface.targets) {
    let targetValid = true;
    if (runtimeTargetCounts.get(target.targetId) !== 1) {
      addFault("presentation.interaction.catalog_join");
      targetValid = false;
    }

    const bindings =
      resolvedSurface?.targetBindings.filter((binding) => binding.targetId === target.targetId) ??
      [];
    const binding = bindings.length === 1 ? bindings[0] : undefined;
    if (
      binding === undefined ||
      !binding.allowedResolutionModes.includes(target.resolutionMode) ||
      binding.openSurfaceId !== target.openSurfaceId
    ) {
      addFault("presentation.interaction.catalog_join");
      targetValid = false;
    }

    if (target.resolutionMode === "direct") {
      let defaultCount = 0;
      for (const behavior of target.behaviors) {
        if (behavior.isDefault) defaultCount += 1;
      }
      if (defaultCount !== 1) {
        addFault("presentation.interaction.direct_default_count");
        targetValid = false;
      }
    } else if (target.resolutionMode === "choose") {
      if (target.behaviors.length < 2) {
        addFault("presentation.interaction.choose_behavior_count");
        targetValid = false;
      }
    } else {
      if (target.behaviors.length !== 0) {
        addFault("presentation.interaction.open_surface_behavior_count");
        targetValid = false;
      }
      if (
        target.openSurfaceId === null ||
        !isCurrentlyEnterableSurfaceV1(catalog, target.openSurfaceId)
      ) {
        addFault("presentation.interaction.open_surface_missing");
        targetValid = false;
      }
    }

    if (targetValid) validTargets.push(target);
  }

  const frozenFaults = Object.freeze(faults);
  const hasFault = frozenFaults.length !== 0;
  return Object.freeze({
    surface: sanitizeSurfaceV1(surface, surfaceJoinValid ? validTargets : []),
    spatialState: hasFault ? "disabled" : "enabled",
    domFallback: Object.freeze({ visible: hasFault }),
    faults: frozenFaults,
  });
}
