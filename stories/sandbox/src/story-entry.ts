// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGamePackage,
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@project-tavern/base";
import type { GamePackageV1, ResolvedStoryV1 } from "@project-tavern/base";

import { createSandboxProfileV1 } from "./profile.js";
import type { SandboxProfileV1, SandboxSimulationProgramV1 } from "./profile.js";
import {
  materializeSandboxPresentationV1,
  sandboxAssetSlotsV1,
  sandboxTextCatalogsV1,
} from "./presentation.js";
import type { SandboxPresentationProgramV1 } from "./presentation.js";

const initialCountSlot = definePatchSlot({
  symbolId: "sandbox.counter.initial-value",
  kind: "value" as const,
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: digestCanonical("project-tavern:patch-provider:v1", {
    source: "story.sandbox",
    symbol: "sandbox.counter.initial-value",
    revision: 1,
  }),
  defaultValue: parseNonNegativeSafeInteger(0),
});
const simulationPatchSurface = defineSimulationPatchSurface({ initialCount: initialCountSlot });
const presentationPatchSurface = definePresentationPatchSurface({});

function createDefinition() {
  return Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      data: Object.freeze({ kind: "sandbox-counter-v1" }),
      rules: Object.freeze({ increment: parsePositiveSafeInteger(1) }),
      narrativeProgram: null,
      patchSurface: simulationPatchSurface,
      materializeProgram(values: { readonly initialCount: number }): SandboxSimulationProgramV1 {
        return Object.freeze({ initialCount: parseNonNegativeSafeInteger(values.initialCount) });
      },
      createProfile(program: SandboxSimulationProgramV1) {
        return createSandboxProfileV1(program);
      },
    }),
    presentation: Object.freeze({
      uiSceneGraph: Object.freeze({ scenes: Object.freeze(["scene.sandbox.counter"]) }),
      textCatalogs: sandboxTextCatalogsV1,
      assetSlots: sandboxAssetSlotsV1,
      assetPacks: Object.freeze([]),
      patchSurface: presentationPatchSurface,
      materializePresentation(): SandboxPresentationProgramV1 {
        return materializeSandboxPresentationV1();
      },
    }),
  });
}

export const sandboxStoryEntryV1: GamePackageV1<unknown, unknown> = defineGamePackage({
  contractRevision: 1,
  identity: Object.freeze({
    id: "story.sandbox",
    revision: parsePositiveSafeInteger(1),
  }),
  define: createDefinition,
});

export interface SandboxResolvedStoryV1 extends Omit<
  ResolvedStoryV1,
  "profile" | "simulationProgram" | "presentationProgram"
> {
  readonly profile: SandboxProfileV1;
  readonly simulationProgram: SandboxSimulationProgramV1;
  readonly presentationProgram: SandboxPresentationProgramV1;
}

export function specializeSandboxResolvedStoryV1(
  resolved: ResolvedStoryV1,
): SandboxResolvedStoryV1 {
  if (
    typeof (resolved.profile as { createBootstrapInput?: unknown }).createBootstrapInput !==
    "function"
  ) {
    throw new TypeError("Sandbox Profile did not resolve");
  }
  return resolved as SandboxResolvedStoryV1;
}
