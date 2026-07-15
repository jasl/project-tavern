// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  InteractionBehaviorDescriptorV1,
  InteractionSurfaceDescriptorV1,
  InteractionTargetDescriptorV1,
} from "@sillymaker/base";

import {
  pocInteractionBehaviorIdsV1,
  pocInteractionSurfaceIdsV1,
  pocInteractionTargetIdsV1,
  pocPresentationProviderIdsV1,
  pocTextIdsV1,
} from "../content/ids.js";
import { pocStandardContentRequirementV1 } from "./content-maturity-policy.js";

function deepFreezePresentationDataV1<TValue>(value: TValue): TValue {
  const seen = new WeakSet<object>();

  function freeze(current: unknown): void {
    if (current === null || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
        throw new TypeError("presentation data accessors are forbidden");
      }
      freeze(descriptor?.value);
    }
    Object.freeze(current);
  }

  freeze(value);
  return value;
}

export const pocInteractionSurfacesV1 = deepFreezePresentationDataV1([
  {
    surfaceId: pocInteractionSurfaceIdsV1[0],
    accessibleNameTextId: pocTextIdsV1.surfaceHeroineAccessibleName,
    allowedEntryModes: ["surface_activation", "explicit_control"],
    targetBindings: [
      {
        targetId: pocInteractionTargetIdsV1[0],
        allowedResolutionModes: ["direct", "choose"],
        openSurfaceId: null,
      },
    ],
  },
  {
    surfaceId: pocInteractionSurfaceIdsV1[1],
    accessibleNameTextId: pocTextIdsV1.surfaceTavernAccessibleName,
    allowedEntryModes: ["always_active", "explicit_control"],
    targetBindings: [
      {
        targetId: pocInteractionTargetIdsV1[0],
        allowedResolutionModes: ["open_surface"],
        openSurfaceId: pocInteractionSurfaceIdsV1[0],
      },
      {
        targetId: pocInteractionTargetIdsV1[1],
        allowedResolutionModes: ["direct"],
        openSurfaceId: null,
      },
    ],
  },
  {
    surfaceId: pocInteractionSurfaceIdsV1[2],
    accessibleNameTextId: pocTextIdsV1.surfaceMarketAccessibleName,
    allowedEntryModes: ["always_active", "explicit_control"],
    targetBindings: [
      {
        targetId: pocInteractionTargetIdsV1[2],
        allowedResolutionModes: ["direct"],
        openSurfaceId: null,
      },
    ],
  },
  {
    surfaceId: pocInteractionSurfaceIdsV1[3],
    accessibleNameTextId: pocTextIdsV1.surfaceWorldMapAccessibleName,
    allowedEntryModes: ["always_active", "explicit_control"],
    targetBindings: [
      {
        targetId: pocInteractionTargetIdsV1[3],
        allowedResolutionModes: ["direct"],
        openSurfaceId: null,
      },
    ],
  },
] as const satisfies readonly InteractionSurfaceDescriptorV1[]);

export const pocInteractionTargetsV1 = deepFreezePresentationDataV1([
  {
    targetId: pocInteractionTargetIdsV1[0],
    accessibleNameTextId: pocTextIdsV1.targetHeroineFigureAccessibleName,
    behaviorIds: [
      pocInteractionBehaviorIdsV1[0],
      pocInteractionBehaviorIdsV1[1],
      pocInteractionBehaviorIdsV1[2],
    ],
  },
  {
    targetId: pocInteractionTargetIdsV1[1],
    accessibleNameTextId: pocTextIdsV1.targetTavernServiceAccessibleName,
    behaviorIds: [pocInteractionBehaviorIdsV1[3]],
  },
  {
    targetId: pocInteractionTargetIdsV1[2],
    accessibleNameTextId: pocTextIdsV1.targetMarketPurchaseAccessibleName,
    behaviorIds: [pocInteractionBehaviorIdsV1[4]],
  },
  {
    targetId: pocInteractionTargetIdsV1[3],
    accessibleNameTextId: pocTextIdsV1.targetWorldMapOldTradeRoadAccessibleName,
    behaviorIds: [pocInteractionBehaviorIdsV1[5]],
  },
] as const satisfies readonly InteractionTargetDescriptorV1[]);

export const pocInteractionBehaviorsV1 = deepFreezePresentationDataV1([
  {
    behaviorId: pocInteractionBehaviorIdsV1[0],
    nameTextId: pocTextIdsV1.behaviorHeroineOpenProfileName,
    descriptionTextId: pocTextIdsV1.behaviorHeroineOpenProfileDescription,
    providerId: pocPresentationProviderIdsV1[0],
    content: pocStandardContentRequirementV1,
  },
  {
    behaviorId: pocInteractionBehaviorIdsV1[1],
    nameTextId: pocTextIdsV1.behaviorHeroineRepairSignName,
    descriptionTextId: pocTextIdsV1.behaviorHeroineRepairSignDescription,
    providerId: pocPresentationProviderIdsV1[1],
    content: pocStandardContentRequirementV1,
  },
  {
    behaviorId: pocInteractionBehaviorIdsV1[2],
    nameTextId: pocTextIdsV1.behaviorHeroineApologizeName,
    descriptionTextId: pocTextIdsV1.behaviorHeroineApologizeDescription,
    providerId: pocPresentationProviderIdsV1[2],
    content: pocStandardContentRequirementV1,
  },
  {
    behaviorId: pocInteractionBehaviorIdsV1[3],
    nameTextId: pocTextIdsV1.behaviorTavernServicePlanName,
    descriptionTextId: pocTextIdsV1.behaviorTavernServicePlanDescription,
    providerId: pocPresentationProviderIdsV1[3],
    content: pocStandardContentRequirementV1,
  },
  {
    behaviorId: pocInteractionBehaviorIdsV1[4],
    nameTextId: pocTextIdsV1.behaviorMarketPurchaseName,
    descriptionTextId: pocTextIdsV1.behaviorMarketPurchaseDescription,
    providerId: pocPresentationProviderIdsV1[4],
    content: pocStandardContentRequirementV1,
  },
  {
    behaviorId: pocInteractionBehaviorIdsV1[5],
    nameTextId: pocTextIdsV1.behaviorWorldMapOldTradeRoadName,
    descriptionTextId: pocTextIdsV1.behaviorWorldMapOldTradeRoadDescription,
    providerId: pocPresentationProviderIdsV1[5],
    content: pocStandardContentRequirementV1,
  },
] as const satisfies readonly InteractionBehaviorDescriptorV1[]);
