// SPDX-License-Identifier: MIT
import type { PatchSurfaceValueMapWitnessV1 } from "../contracts/game-package.js";
import type {
  PatchSlotDescriptorV1,
  PatchSurfaceKindV1,
  PatchSymbolKindV1,
} from "../contracts/hotfix.js";
import { parseDigest, parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

type SlotRecordV1 = Readonly<Record<string, PatchSlotDescriptorV1<PatchSymbolKindV1, unknown>>>;
type ValuesForSlotsV1<TSlots extends SlotRecordV1> = {
  readonly [TKey in keyof TSlots]: TSlots[TKey]["defaultValue"];
};

export interface PatchSurfaceV1<
  TValues,
  TSlots extends SlotRecordV1 = SlotRecordV1,
> extends PatchSurfaceValueMapWitnessV1<TValues> {
  readonly surface: PatchSurfaceKindV1;
  readonly slots: TSlots;
}

export function definePatchSlot<
  const TSymbolId extends string,
  TKind extends PatchSymbolKindV1,
  TValue,
>(
  slot: Omit<PatchSlotDescriptorV1<TKind, TValue, TSymbolId>, "replaceable">,
): PatchSlotDescriptorV1<TKind, TValue, TSymbolId> {
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u.test(slot.symbolId)) {
    throw new TypeError("invalid Patch symbol ID");
  }
  parsePositiveSafeInteger(slot.contractRevision);
  parseDigest(slot.defaultProviderSourceDigest);
  return deepFreezeAuthoringValueV1({ ...slot, replaceable: true as const });
}

function defineSurface<TSlots extends SlotRecordV1>(
  surface: PatchSurfaceKindV1,
  slots: TSlots,
): PatchSurfaceV1<ValuesForSlotsV1<TSlots>, TSlots> {
  const ids = Object.values(slots).map((slot) => slot.symbolId);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("duplicate Patch symbol ID");
  }
  for (const slot of Object.values(slots)) {
    if (surface === "simulation" && slot.kind !== "rule" && slot.kind !== "value") {
      throw new TypeError("invalid simulation Patch kind");
    }
    if (
      surface === "presentation" &&
      slot.kind !== "value" &&
      slot.kind !== "text" &&
      slot.kind !== "asset"
    ) {
      throw new TypeError("invalid presentation Patch kind");
    }
  }
  return deepFreezeAuthoringValueV1({ surface, slots });
}

export function defineSimulationPatchSurface<TSlots extends SlotRecordV1>(
  slots: TSlots,
): PatchSurfaceV1<ValuesForSlotsV1<TSlots>, TSlots> {
  return defineSurface("simulation", slots);
}

export function definePresentationPatchSurface<TSlots extends SlotRecordV1>(
  slots: TSlots,
): PatchSurfaceV1<ValuesForSlotsV1<TSlots>, TSlots> {
  return defineSurface("presentation", slots);
}
