// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { choiceIdsV1, pocTextIdsV1 } from "../../content/ids.js";
import { pocStoryDataV1 } from "../../content/story-data.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";
import { pocInteractionBehaviorsV1 } from "../interaction-catalog.js";
import { createPocInteractionBehaviorResolverV1 } from "./interaction-behaviors.js";

type PocDescriptorForV1<TActionId extends PocSemanticInvocationV1["actionId"]> = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: TActionId }
>;

const emptyReasonsV1 = Object.freeze([]) satisfies readonly [];
const emptyDescriptorOptionsV1 = Object.freeze([]) satisfies readonly [];

const repairInvocationV1 = Object.freeze({
  kind: "invoke",
  actionId: "action.repair_sign_with_heroine",
  options: Object.freeze({}),
}) satisfies PocDescriptorForV1<"action.repair_sign_with_heroine">["directInvocation"];

const repairDescriptorV1 = Object.freeze({
  actionId: repairInvocationV1.actionId,
  textId: pocTextIdsV1.actionRepairSignWithHeroineLabel,
  enabled: true,
  reasons: emptyReasonsV1,
  confirmation: null,
  delivery: "direct",
  directInvocation: repairInvocationV1,
  options: emptyDescriptorOptionsV1,
  form: null,
}) satisfies PocDescriptorForV1<"action.repair_sign_with_heroine">;

const apologizeInvocationV1 = Object.freeze({
  kind: "invoke",
  actionId: "action.apologize_to_heroine",
  options: Object.freeze({}),
}) satisfies PocDescriptorForV1<"action.apologize_to_heroine">["directInvocation"];

const apologizeDescriptorV1 = Object.freeze({
  actionId: apologizeInvocationV1.actionId,
  textId: pocTextIdsV1.actionApologizeToHeroineLabel,
  enabled: true,
  reasons: emptyReasonsV1,
  confirmation: null,
  delivery: "direct",
  directInvocation: apologizeInvocationV1,
  options: emptyDescriptorOptionsV1,
  form: null,
}) satisfies PocDescriptorForV1<"action.apologize_to_heroine">;

const servicePlanDescriptorV1 = Object.freeze({
  actionId: "action.service_plan",
  textId: pocTextIdsV1.actionServicePlanLabel,
  enabled: true,
  reasons: emptyReasonsV1,
  confirmation: null,
  delivery: "form",
  directInvocation: null,
  options: emptyDescriptorOptionsV1,
  form: Object.freeze({
    kind: "tavern_plan",
    actionId: "action.service_plan",
    input: Object.freeze({
      recipeLimit: pocStoryDataV1.balance.menuRecipeLimit,
      portionsPerRecipeLimit: pocStoryDataV1.balance.menuPortionsPerRecipeLimit,
      serviceModes: Object.freeze([]),
      recipes: Object.freeze([]),
    }),
  }),
}) satisfies PocDescriptorForV1<"action.service_plan">;

const purchaseDescriptorV1 = Object.freeze({
  actionId: "action.purchase",
  textId: pocTextIdsV1.actionPurchaseLabel,
  enabled: true,
  reasons: emptyReasonsV1,
  confirmation: null,
  delivery: "form",
  directInvocation: null,
  options: emptyDescriptorOptionsV1,
  form: Object.freeze({
    kind: "purchase",
    actionId: "action.purchase",
    input: Object.freeze({
      lineLimit: pocStoryDataV1.balance.purchaseLineLimit,
      quantityPerLineLimit: pocStoryDataV1.balance.purchaseQuantityPerLineLimit,
      ingredients: Object.freeze([]),
    }),
  }),
}) satisfies PocDescriptorForV1<"action.purchase">;

const oldTradeRoadInvocationV1 = Object.freeze({
  kind: "invoke",
  actionId: "action.old_trade_road",
  options: Object.freeze({ optionId: choiceIdsV1[5] }),
}) satisfies Extract<PocSemanticInvocationV1, { readonly actionId: "action.old_trade_road" }>;

const oldTradeRoadOptionsV1 = Object.freeze([
  Object.freeze({
    optionId: choiceIdsV1[5],
    textId: pocTextIdsV1.actionOldTradeRoadLabel,
    invocation: oldTradeRoadInvocationV1,
  }),
]) satisfies PocDescriptorForV1<"action.old_trade_road">["options"];

const oldTradeRoadDescriptorV1 = Object.freeze({
  actionId: "action.old_trade_road",
  textId: pocTextIdsV1.actionOldTradeRoadLabel,
  enabled: true,
  reasons: emptyReasonsV1,
  confirmation: null,
  delivery: "choices",
  directInvocation: null,
  options: oldTradeRoadOptionsV1,
  form: null,
}) satisfies PocDescriptorForV1<"action.old_trade_road">;

function requireBehaviorDescriptorV1(behaviorId: string) {
  const descriptor = pocInteractionBehaviorsV1.find(
    (candidate) => candidate.behaviorId === behaviorId,
  );
  if (descriptor === undefined) throw new TypeError(`missing PoC behavior ${behaviorId}`);
  return descriptor;
}

describe("createPocInteractionBehaviorResolverV1", () => {
  it("projects profile as the one Presentation-only default behavior", () => {
    const resolver = createPocInteractionBehaviorResolverV1(Object.freeze([]));
    const profile = resolver.resolve(
      requireBehaviorDescriptorV1("behavior.poc.heroine.open_profile"),
    );

    expect(profile).toMatchObject({
      behaviorId: "behavior.poc.heroine.open_profile",
      isDefault: true,
      route: {
        kind: "presentation_intent",
        intent: { kind: "overlay.open", overlayId: "overlay.poc.relationship" },
      },
    });
    expect(profile?.requiredFlags).toBe(0);
  });

  it.each([
    ["behavior.poc.heroine.repair_sign", repairDescriptorV1, repairInvocationV1],
    ["behavior.poc.heroine.apologize", apologizeDescriptorV1, apologizeInvocationV1],
  ] as const)(
    "reuses the exact direct descriptor and invocation for %s",
    (behaviorId, descriptor, invocation) => {
      const resolver = createPocInteractionBehaviorResolverV1(Object.freeze([descriptor]));
      const behavior = resolver.resolve(requireBehaviorDescriptorV1(behaviorId));

      expect(behavior?.isDefault).toBe(false);
      expect(behavior?.route.kind).toBe("semantic_invocation");
      if (behavior?.route.kind !== "semantic_invocation") {
        throw new TypeError(`missing direct route for ${behaviorId}`);
      }
      expect(behavior.route.descriptor).toBe(descriptor);
      expect(behavior.route.invocation).toBe(invocation);
    },
  );

  it.each([
    ["behavior.poc.tavern.service_plan", servicePlanDescriptorV1, "overlay.poc.tavern_plan"],
    ["behavior.poc.market.purchase", purchaseDescriptorV1, "overlay.poc.purchase"],
    ["behavior.poc.world_map.old_trade_road", oldTradeRoadDescriptorV1, "overlay.poc.world_action"],
  ] as const)(
    "retains the exact parameter descriptor for %s",
    (behaviorId, descriptor, overlayId) => {
      const resolver = createPocInteractionBehaviorResolverV1(Object.freeze([descriptor]));
      const behavior = resolver.resolve(requireBehaviorDescriptorV1(behaviorId));

      expect(behavior?.isDefault).toBe(true);
      expect(behavior?.route.kind).toBe("semantic_control");
      if (behavior?.route.kind !== "semantic_control") {
        throw new TypeError(`missing controlled route for ${behaviorId}`);
      }
      expect(behavior.route.descriptor).toBe(descriptor);
      expect(behavior.route.intent).toEqual({ kind: "overlay.open", overlayId });
      expect(behavior.route).not.toHaveProperty("invocation");
    },
  );

  it("keeps heroine behaviors in authored order even when actions publish in another order", () => {
    const resolver = createPocInteractionBehaviorResolverV1(
      Object.freeze([apologizeDescriptorV1, repairDescriptorV1]),
    );
    const heroineBehaviors = pocInteractionBehaviorsV1
      .slice(0, 3)
      .map((descriptor) => resolver.resolve(descriptor));

    expect(heroineBehaviors.map((behavior) => behavior?.behaviorId)).toEqual([
      "behavior.poc.heroine.open_profile",
      "behavior.poc.heroine.repair_sign",
      "behavior.poc.heroine.apologize",
    ]);
    expect(heroineBehaviors[1]?.route).toMatchObject({ descriptor: repairDescriptorV1 });
    expect(heroineBehaviors[2]?.route).toMatchObject({ descriptor: apologizeDescriptorV1 });
  });

  it.each([
    ["behavior.poc.heroine.repair_sign", repairDescriptorV1],
    ["behavior.poc.heroine.apologize", apologizeDescriptorV1],
    ["behavior.poc.tavern.service_plan", servicePlanDescriptorV1],
    ["behavior.poc.market.purchase", purchaseDescriptorV1],
    ["behavior.poc.world_map.old_trade_road", oldTradeRoadDescriptorV1],
  ] as const)(
    "fails closed for a missing or duplicate descriptor behind %s",
    (behaviorId, descriptor) => {
      const behaviorDescriptor = requireBehaviorDescriptorV1(behaviorId);
      const missing = createPocInteractionBehaviorResolverV1(Object.freeze([]));
      const duplicate = createPocInteractionBehaviorResolverV1(
        Object.freeze([descriptor, descriptor]),
      );

      expect(missing.actionMatchCount(descriptor.actionId)).toBe(0);
      expect(missing.resolve(behaviorDescriptor)).toBeNull();
      expect(duplicate.actionMatchCount(descriptor.actionId)).toBe(2);
      expect(duplicate.resolve(behaviorDescriptor)).toBeNull();
    },
  );
});
