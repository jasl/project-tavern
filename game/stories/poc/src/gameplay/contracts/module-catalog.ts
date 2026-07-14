// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "@sillymaker/base";
import type { GameplayModuleDescriptorV1 } from "@sillymaker/base";

export const pocGameplayModuleKeysV1 = Object.freeze([
  "run",
  "calendar",
  "actors",
  "status",
  "inventory",
  "facilities",
  "tavern",
  "workflow",
  "progression",
  "narrative",
] as const);

export type PocGameplayModuleKeyV1 = (typeof pocGameplayModuleKeysV1)[number];

export const pocGameplayModuleDependenciesV1 = Object.freeze({
  run: Object.freeze([]),
  calendar: Object.freeze([]),
  actors: Object.freeze([]),
  status: Object.freeze([]),
  inventory: Object.freeze([]),
  facilities: Object.freeze([]),
  tavern: Object.freeze([]),
  workflow: Object.freeze([]),
  progression: Object.freeze([]),
  narrative: Object.freeze([]),
} as const satisfies Record<PocGameplayModuleKeyV1, readonly PocGameplayModuleKeyV1[]>);

const pocGameplayModuleStateSlotsV1 = Object.freeze({
  run: Object.freeze(["simulation.run"]),
  calendar: Object.freeze(["simulation.calendar"]),
  actors: Object.freeze(["simulation.actors"]),
  status: Object.freeze(["simulation.status"]),
  inventory: Object.freeze(["simulation.inventory"]),
  facilities: Object.freeze(["simulation.facilities"]),
  tavern: Object.freeze(["simulation.tavern"]),
  workflow: Object.freeze(["simulation.activeWorkflow"]),
  progression: Object.freeze([
    "story.facts",
    "story.quests",
    "story.outcomes",
    "story.resolvedChecks",
  ]),
  narrative: Object.freeze(["story.narrative"]),
} as const satisfies Record<PocGameplayModuleKeyV1, readonly string[]>);

export const pocGameplayModuleDescriptorsV1: readonly GameplayModuleDescriptorV1[] = Object.freeze(
  pocGameplayModuleKeysV1.map((key): GameplayModuleDescriptorV1 =>
    Object.freeze({
      id: parseModuleId(`module.${key}`),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze(
        pocGameplayModuleStateSlotsV1[key].map((slot) => parseStateSlotId(slot)),
      ),
      dependencies: Object.freeze(
        pocGameplayModuleDependenciesV1[key].map((dependency) =>
          parseModuleId(`module.${dependency}`),
        ),
      ),
    }),
  ),
);

export const pocStateOwnerKeysV1 = pocGameplayModuleKeysV1;

export function descriptorForPocModuleV1(key: PocGameplayModuleKeyV1): GameplayModuleDescriptorV1 {
  const descriptor = pocGameplayModuleDescriptorsV1.find(
    (candidate) => candidate.id === `module.${key}`,
  );
  if (descriptor === undefined) throw new TypeError(`unknown PoC module: ${key}`);
  return descriptor;
}
