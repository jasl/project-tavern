// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { beforeEach, describe, expect, it, vi } from "vitest";

import { defineGameSimulation, parseModuleId } from "@sillymaker/base";
import type { GameplayModuleBindingV1, GameplayModuleDescriptorV1 } from "@sillymaker/base";
import { createFixedBootstrapEntropyV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import type { E2eGameSimulationTypesV1 } from "../gameplay/contracts/index.js";
import type { E2eGameSimulationV1 } from "../gameplay/game-simulation.js";
import { createE2eSessionV1 } from "../session.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

type E2eGameplayModuleV1 = GameplayModuleBindingV1<E2eGameSimulationTypesV1>;

const canonicalSimulationV1 = resolveStoryForTestV1(e2eStoryEntryV1).gameSimulation;
const [counterModuleV1, flowModuleV1, runModuleV1, choiceDeltaResolverModuleV1] =
  canonicalSimulationV1.modules;

const validateE2eSimulationV1 = defineGameSimulation<E2eGameSimulationTypesV1>() as unknown as (
  simulation: unknown,
) => E2eGameSimulationV1;

function cloneModuleWithDescriptorV1(
  module: E2eGameplayModuleV1,
  descriptor: GameplayModuleDescriptorV1,
): E2eGameplayModuleV1 {
  return Object.freeze({
    ...module,
    descriptor: Object.freeze(descriptor),
  }) as E2eGameplayModuleV1;
}

function composeE2eSimulationV1(modules: readonly E2eGameplayModuleV1[]): E2eGameSimulationV1 {
  return validateE2eSimulationV1(
    Object.freeze({
      ...canonicalSimulationV1,
      modules: Object.freeze([...modules]),
    }),
  );
}

function createMissingDependencySimulationV1(): E2eGameSimulationV1 {
  const resolver = cloneModuleWithDescriptorV1(choiceDeltaResolverModuleV1, {
    ...choiceDeltaResolverModuleV1.descriptor,
    dependencies: Object.freeze([parseModuleId("e2e.missing")]),
  });
  return composeE2eSimulationV1([counterModuleV1, flowModuleV1, runModuleV1, resolver]);
}

function createDependencyCycleSimulationV1(): E2eGameSimulationV1 {
  const peerId = parseModuleId("e2e.cycle-peer");
  const resolver = cloneModuleWithDescriptorV1(choiceDeltaResolverModuleV1, {
    ...choiceDeltaResolverModuleV1.descriptor,
    dependencies: Object.freeze([peerId]),
  });
  const peer = cloneModuleWithDescriptorV1(choiceDeltaResolverModuleV1, {
    ...choiceDeltaResolverModuleV1.descriptor,
    id: peerId,
    dependencies: Object.freeze([choiceDeltaResolverModuleV1.descriptor.id]),
  });
  return composeE2eSimulationV1([counterModuleV1, flowModuleV1, runModuleV1, resolver, peer]);
}

function createDuplicateModuleSimulationV1(): E2eGameSimulationV1 {
  return composeE2eSimulationV1([
    counterModuleV1,
    flowModuleV1,
    runModuleV1,
    choiceDeltaResolverModuleV1,
    choiceDeltaResolverModuleV1,
  ]);
}

function createDuplicateSlotSimulationV1(): E2eGameSimulationV1 {
  const duplicateSlotOwner = cloneModuleWithDescriptorV1(runModuleV1, {
    ...runModuleV1.descriptor,
    id: parseModuleId("e2e.duplicate-slot-owner"),
    stateSlots: counterModuleV1.descriptor.stateSlots,
  });
  return composeE2eSimulationV1([
    counterModuleV1,
    flowModuleV1,
    runModuleV1,
    choiceDeltaResolverModuleV1,
    duplicateSlotOwner,
  ]);
}

const createTrackedGameSessionV1 = vi.fn((simulation: E2eGameSimulationV1) => {
  const entropy = createFixedBootstrapEntropyV1({
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
  });
  return createE2eSessionV1(simulation, simulation.createBootstrapInput(entropy));
});

interface InvalidCompositionCaseV1 {
  readonly label: string;
  readonly expectedMessage: string;
  readonly createSimulation: () => E2eGameSimulationV1;
}

interface DependencyFailureFixtureV1 {
  readonly invalidCompositions: readonly InvalidCompositionCaseV1[];
  createSession(createSimulation: () => E2eGameSimulationV1): unknown;
  sessionCreations(): number;
}

function createDependencyFailureFixtureV1(): DependencyFailureFixtureV1 {
  return Object.freeze({
    invalidCompositions: Object.freeze([
      Object.freeze({
        label: "missing dependency",
        expectedMessage: "missing dependency",
        createSimulation: createMissingDependencySimulationV1,
      }),
      Object.freeze({
        label: "dependency cycle",
        expectedMessage: "dependency cycle",
        createSimulation: createDependencyCycleSimulationV1,
      }),
      Object.freeze({
        label: "duplicate module",
        expectedMessage: "duplicate GameplayModule ID",
        createSimulation: createDuplicateModuleSimulationV1,
      }),
      Object.freeze({
        label: "duplicate State slot",
        expectedMessage: "duplicate State slot",
        createSimulation: createDuplicateSlotSimulationV1,
      }),
    ]),
    createSession(createSimulation: () => E2eGameSimulationV1) {
      const simulation = createSimulation();
      return createTrackedGameSessionV1(simulation);
    },
    sessionCreations: () => createTrackedGameSessionV1.mock.calls.length,
  });
}

beforeEach(() => {
  createTrackedGameSessionV1.mockClear();
});

describe("E2E dependency failures", () => {
  it("rejects every invalid composition before creating GameSession", () => {
    const fixture = createDependencyFailureFixtureV1();

    expect(fixture.invalidCompositions).toHaveLength(4);
    for (const { createSimulation, expectedMessage } of fixture.invalidCompositions) {
      expect(() => fixture.createSession(createSimulation)).toThrow(expectedMessage);
      expect(fixture.sessionCreations()).toBe(0);
    }
  });

  it("reaches the real GameSession factory after a valid composition", () => {
    const fixture = createDependencyFailureFixtureV1();
    const session = fixture.createSession(() =>
      composeE2eSimulationV1([
        counterModuleV1,
        flowModuleV1,
        runModuleV1,
        choiceDeltaResolverModuleV1,
      ]),
    );

    expect(fixture.sessionCreations()).toBe(1);
    expect(session).toHaveProperty("getCurrentSnapshot");
  });
});
