// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, InteractionBehaviorDescriptorV1 } from "@sillymaker/base";
import type { RuntimeInteractionBehaviorV1 } from "@sillymaker/ui";

import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";

type PocSemanticActionIdV1 = PocSemanticInvocationV1["actionId"];
type PocDescriptorForDirectRelationshipV1 = Extract<
  PocSemanticActionDescriptorV1,
  {
    readonly actionId: "action.repair_sign_with_heroine" | "action.apologize_to_heroine";
  }
>;
type PocRuntimeInteractionBehaviorV1 = DeepReadonly<
  RuntimeInteractionBehaviorV1<PocSemanticActionDescriptorV1, PocSemanticInvocationV1>
>;

export interface PocInteractionBehaviorResolverV1 {
  actionMatchCount(actionId: PocSemanticActionIdV1): number;
  resolve(
    descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
  ): PocRuntimeInteractionBehaviorV1 | null;
}

function isPlainRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.getOwnPropertySymbols(value).length === 0
  );
}

function hasExactKeysV1(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).toSorted();
  const sortedExpectedKeys = expectedKeys.toSorted();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function hasCommonDescriptorShapeV1(
  value: Readonly<Record<string, unknown>>,
  actionId: PocSemanticActionIdV1,
): boolean {
  return (
    value.actionId === actionId &&
    typeof value.textId === "string" &&
    typeof value.enabled === "boolean" &&
    Array.isArray(value.reasons) &&
    (value.confirmation === null || isPlainRecordV1(value.confirmation))
  );
}

function hasExactEmptyOptionsV1(value: unknown): boolean {
  return isPlainRecordV1(value) && hasExactKeysV1(value, []);
}

function hasDirectDescriptorShapeV1(
  value: unknown,
  actionId: "action.repair_sign_with_heroine" | "action.apologize_to_heroine",
): value is DeepReadonly<PocDescriptorForDirectRelationshipV1> {
  if (!isPlainRecordV1(value) || !hasCommonDescriptorShapeV1(value, actionId)) return false;
  if (
    !hasExactKeysV1(value, [
      "actionId",
      "confirmation",
      "delivery",
      "directInvocation",
      "enabled",
      "form",
      "options",
      "reasons",
      "textId",
    ]) ||
    value.delivery !== "direct" ||
    value.form !== null ||
    !Array.isArray(value.options) ||
    value.options.length !== 0 ||
    !isPlainRecordV1(value.directInvocation)
  ) {
    return false;
  }
  const invocation = value.directInvocation;
  return (
    hasExactKeysV1(invocation, ["actionId", "kind", "options"]) &&
    invocation.kind === "invoke" &&
    invocation.actionId === actionId &&
    hasExactEmptyOptionsV1(invocation.options)
  );
}

function hasFormDescriptorShapeV1(
  value: unknown,
  actionId: "action.service_plan" | "action.purchase",
  formKind: "tavern_plan" | "purchase",
): boolean {
  if (!isPlainRecordV1(value) || !hasCommonDescriptorShapeV1(value, actionId)) return false;
  if (
    !hasExactKeysV1(value, [
      "actionId",
      "confirmation",
      "delivery",
      "directInvocation",
      "enabled",
      "form",
      "options",
      "reasons",
      "textId",
    ]) ||
    value.delivery !== "form" ||
    value.directInvocation !== null ||
    !Array.isArray(value.options) ||
    value.options.length !== 0 ||
    !isPlainRecordV1(value.form)
  ) {
    return false;
  }
  return (
    hasExactKeysV1(value.form, ["actionId", "input", "kind"]) &&
    value.form.kind === formKind &&
    value.form.actionId === actionId &&
    isPlainRecordV1(value.form.input)
  );
}

function hasWorldActionDescriptorShapeV1(value: unknown): boolean {
  const actionId = "action.old_trade_road" as const;
  if (!isPlainRecordV1(value) || !hasCommonDescriptorShapeV1(value, actionId)) return false;
  if (
    !hasExactKeysV1(value, [
      "actionId",
      "confirmation",
      "delivery",
      "directInvocation",
      "enabled",
      "form",
      "options",
      "reasons",
      "textId",
    ]) ||
    value.delivery !== "choices" ||
    value.directInvocation !== null ||
    value.form !== null ||
    !Array.isArray(value.options) ||
    value.options.length === 0
  ) {
    return false;
  }
  return value.options.every((option) => {
    if (
      !isPlainRecordV1(option) ||
      !hasExactKeysV1(option, ["invocation", "optionId", "textId"]) ||
      typeof option.optionId !== "string" ||
      typeof option.textId !== "string" ||
      !isPlainRecordV1(option.invocation)
    ) {
      return false;
    }
    const invocation = option.invocation;
    return (
      hasExactKeysV1(invocation, ["actionId", "kind", "options"]) &&
      invocation.kind === "invoke" &&
      invocation.actionId === actionId &&
      isPlainRecordV1(invocation.options) &&
      hasExactKeysV1(invocation.options, ["optionId"]) &&
      invocation.options.optionId === option.optionId
    );
  });
}

function hasBehaviorDescriptorShapeV1(
  descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
): boolean {
  const value: unknown = descriptor;
  if (!isPlainRecordV1(value)) return false;
  return (
    hasExactKeysV1(value, [
      "behaviorId",
      "content",
      "descriptionTextId",
      "nameTextId",
      "providerId",
    ]) &&
    typeof value.behaviorId === "string" &&
    typeof value.nameTextId === "string" &&
    (value.descriptionTextId === null || typeof value.descriptionTextId === "string") &&
    typeof value.providerId === "string" &&
    isPlainRecordV1(value.content) &&
    hasExactKeysV1(value.content, ["requiredFlags"]) &&
    typeof value.content.requiredFlags === "number"
  );
}

function presentationProfileBehaviorV1(
  descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
): PocRuntimeInteractionBehaviorV1 {
  return Object.freeze({
    behaviorId: descriptor.behaviorId,
    nameTextId: descriptor.nameTextId,
    descriptionTextId: descriptor.descriptionTextId,
    requiredFlags: descriptor.content.requiredFlags,
    isDefault: true,
    route: Object.freeze({
      kind: "presentation_intent" as const,
      intent: Object.freeze({
        kind: "overlay.open" as const,
        overlayId: "overlay.poc.relationship",
      }),
    }),
  });
}

function semanticInvocationBehaviorV1(
  descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
  action: DeepReadonly<
    Extract<
      PocSemanticActionDescriptorV1,
      {
        readonly actionId: "action.repair_sign_with_heroine" | "action.apologize_to_heroine";
      }
    >
  >,
): PocRuntimeInteractionBehaviorV1 {
  return Object.freeze({
    behaviorId: descriptor.behaviorId,
    nameTextId: descriptor.nameTextId,
    descriptionTextId: descriptor.descriptionTextId,
    requiredFlags: descriptor.content.requiredFlags,
    isDefault: false,
    route: Object.freeze({
      kind: "semantic_invocation" as const,
      descriptor: action,
      invocation: action.directInvocation,
    }),
  });
}

function semanticControlBehaviorV1(
  descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
  action: DeepReadonly<PocSemanticActionDescriptorV1>,
  overlayId: "overlay.poc.tavern_plan" | "overlay.poc.purchase" | "overlay.poc.world_action",
): PocRuntimeInteractionBehaviorV1 {
  return Object.freeze({
    behaviorId: descriptor.behaviorId,
    nameTextId: descriptor.nameTextId,
    descriptionTextId: descriptor.descriptionTextId,
    requiredFlags: descriptor.content.requiredFlags,
    isDefault: true,
    route: Object.freeze({
      kind: "semantic_control" as const,
      descriptor: action,
      intent: Object.freeze({ kind: "overlay.open" as const, overlayId }),
    }),
  });
}

/** Builds one immutable action index, then resolves only exact Story behavior joins. */
export function createPocInteractionBehaviorResolverV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): PocInteractionBehaviorResolverV1 {
  const actionsById = new Map<string, DeepReadonly<PocSemanticActionDescriptorV1>[]>();
  for (const action of actions) {
    const actionValue: unknown = action;
    if (!isPlainRecordV1(actionValue) || typeof actionValue.actionId !== "string") continue;
    const bucket = actionsById.get(actionValue.actionId);
    if (bucket === undefined) actionsById.set(actionValue.actionId, [action]);
    else bucket.push(action);
  }

  function onlyActionV1(actionId: PocSemanticActionIdV1) {
    const matches = actionsById.get(actionId);
    return matches?.length === 1 ? matches[0] : undefined;
  }

  function resolve(
    descriptor: DeepReadonly<InteractionBehaviorDescriptorV1>,
  ): PocRuntimeInteractionBehaviorV1 | null {
    if (!hasBehaviorDescriptorShapeV1(descriptor)) return null;
    switch (descriptor.providerId) {
      case "provider.poc.intent.open_profile":
        return descriptor.behaviorId === "behavior.poc.heroine.open_profile"
          ? presentationProfileBehaviorV1(descriptor)
          : null;
      case "provider.poc.semantic.repair_sign_with_heroine": {
        if (descriptor.behaviorId !== "behavior.poc.heroine.repair_sign") return null;
        const action = onlyActionV1("action.repair_sign_with_heroine");
        return action !== undefined &&
          hasDirectDescriptorShapeV1(action, "action.repair_sign_with_heroine")
          ? semanticInvocationBehaviorV1(descriptor, action)
          : null;
      }
      case "provider.poc.semantic.apologize_to_heroine": {
        if (descriptor.behaviorId !== "behavior.poc.heroine.apologize") return null;
        const action = onlyActionV1("action.apologize_to_heroine");
        return action !== undefined &&
          hasDirectDescriptorShapeV1(action, "action.apologize_to_heroine")
          ? semanticInvocationBehaviorV1(descriptor, action)
          : null;
      }
      case "provider.poc.semantic.service_plan": {
        if (descriptor.behaviorId !== "behavior.poc.tavern.service_plan") return null;
        const action = onlyActionV1("action.service_plan");
        return action !== undefined &&
          hasFormDescriptorShapeV1(action, "action.service_plan", "tavern_plan")
          ? semanticControlBehaviorV1(descriptor, action, "overlay.poc.tavern_plan")
          : null;
      }
      case "provider.poc.semantic.purchase": {
        if (descriptor.behaviorId !== "behavior.poc.market.purchase") return null;
        const action = onlyActionV1("action.purchase");
        return action !== undefined &&
          hasFormDescriptorShapeV1(action, "action.purchase", "purchase")
          ? semanticControlBehaviorV1(descriptor, action, "overlay.poc.purchase")
          : null;
      }
      case "provider.poc.semantic.old_trade_road": {
        if (descriptor.behaviorId !== "behavior.poc.world_map.old_trade_road") return null;
        const action = onlyActionV1("action.old_trade_road");
        return action !== undefined && hasWorldActionDescriptorShapeV1(action)
          ? semanticControlBehaviorV1(descriptor, action, "overlay.poc.world_action")
          : null;
      }
      default:
        return null;
    }
  }

  return Object.freeze({
    actionMatchCount(actionId: PocSemanticActionIdV1): number {
      return actionsById.get(actionId)?.length ?? 0;
    },
    resolve,
  });
}
