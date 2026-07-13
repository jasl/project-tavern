// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  definePatchSlot,
  defineSimulationPatchSurface,
  digestCanonical,
  parseDigest,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type { HotfixEntryV1 } from "@sillymaker/base";

import type { E2eSimulationProgramInputV1 } from "../gameplay/contracts/index.js";
import { installChoiceDeltaHotfixV1 } from "./choice-delta-hotfix.js";
import { defaultChoiceDeltaProviderV1 } from "./choice-delta-provider.js";
import {
  e2eChoiceDeltaHotfixSourceDigestV1,
  e2eChoiceDeltaProviderSourceDigestV1,
} from "./source-digests.generated.js";

type ChoiceDeltaProviderV1 = E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"];

const terminalThresholdV1 = parsePositiveSafeInteger(2);

const choiceDeltaProviderSourceDigestV1 = parseDigest(e2eChoiceDeltaProviderSourceDigestV1);

const terminalThresholdProviderSourceDigestV1 = digestCanonical("sillymaker:patch-provider:v1", {
  symbolId: "e2e.value.terminal-threshold",
  contractRevision: 1,
  value: terminalThresholdV1,
});

const choiceDeltaSlotV1 = definePatchSlot({
  symbolId: "e2e.rule.choice-delta",
  kind: "rule",
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: choiceDeltaProviderSourceDigestV1,
  defaultValue: defaultChoiceDeltaProviderV1 satisfies ChoiceDeltaProviderV1,
});

const terminalThresholdSlotV1 = definePatchSlot({
  symbolId: "e2e.value.terminal-threshold",
  kind: "value",
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: terminalThresholdProviderSourceDigestV1,
  defaultValue: terminalThresholdV1,
});

export const e2eSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  choiceDelta: choiceDeltaSlotV1,
  terminalThreshold: terminalThresholdSlotV1,
});

const choiceDeltaHotfixSourceDigestV1 = parseDigest(e2eChoiceDeltaHotfixSourceDigestV1);

export const choiceDeltaHotfixV1: HotfixEntryV1<typeof e2eSimulationPatchSurfaceV1> = Object.freeze(
  {
    manifest: Object.freeze({
      identity: Object.freeze({
        id: "hotfix.e2e.choice-delta",
        revision: parsePositiveSafeInteger(1),
      }),
      targetStoryId: "story.e2e",
      targetStoryRevision: parsePositiveSafeInteger(1),
      targets: Object.freeze([
        Object.freeze({
          surface: "simulation" as const,
          symbolId: "e2e.rule.choice-delta",
          expectedProviderDigest: choiceDeltaProviderSourceDigestV1,
        }),
      ]),
      requires: Object.freeze([]),
      conflicts: Object.freeze([]),
      supersedes: Object.freeze([]),
    }),
    sourceDigest: choiceDeltaHotfixSourceDigestV1,
    install: installChoiceDeltaHotfixV1,
  },
);
