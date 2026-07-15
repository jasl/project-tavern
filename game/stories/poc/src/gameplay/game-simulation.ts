// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineGameSimulation } from "@sillymaker/base";
import type { BootstrapEntropyV1, DeepReadonly } from "@sillymaker/base";

import {
  pocDebugCommandSchemaV1,
  pocDebugCommandValidationErrorSchemaV1,
  pocGameCommandSchemaV1,
  pocRejectionReasonSchemaV1,
  pocSimulationDataSchemaV1,
} from "./contracts/schemas.js";
import type {
  PocGameBootstrapInputV1,
  PocGameStateV1,
  PocGameSimulationTypesV1,
  PocSimulationProgramV1,
} from "./contracts/types.js";
import { parseRunId } from "./contracts/ids.js";
import { parseNonZeroUint32 } from "./contracts/values.js";
import { createPocGameCommandExecutorV1 } from "./game-command-executor.js";
import { createPocGameDebugCommandExecutorV1 } from "./game-debug-command-executor.js";
import { createPocGameQueriesV1 } from "./game-queries.js";
import { projectPocGameViewV1 } from "./game-view-projector.js";
import { createPocGameplayModuleTupleV1, type PocGameplayModuleTupleV1 } from "./modules/index.js";
import { pocGameStateSchemaV1, pocGameplayFactSchemaV1 } from "./runtime-schemas.js";

type PlainRecordV1 = Readonly<Record<string, unknown>>;

function exactPlainRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): PlainRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as PlainRecordV1;
}

function requireRuleGroupV1(value: unknown, expectedKeys: readonly string[], label: string): void {
  const group = exactPlainRecordV1(value, expectedKeys, label);
  for (const key of expectedKeys) {
    if (typeof group[key] !== "function") {
      throw new TypeError(`invalid ${label} provider ${key}`);
    }
  }
}

function validatePocSimulationProgramV1(
  value: DeepReadonly<PocSimulationProgramV1>,
): DeepReadonly<PocSimulationProgramV1> {
  const program = exactPlainRecordV1(value, ["data", "rules"], "PoC Simulation Program");
  const data = pocSimulationDataSchemaV1.parse(program.data);
  const rules = exactPlainRecordV1(
    program.rules,
    ["demand", "tavern", "checks", "endings"],
    "PoC rules",
  );
  requireRuleGroupV1(rules.demand, ["preview", "resolve"], "PoC demand rules");
  requireRuleGroupV1(rules.tavern, ["preview", "settle"], "PoC Tavern rules");
  requireRuleGroupV1(rules.checks, ["describe", "resolve"], "PoC check rules");
  requireRuleGroupV1(rules.endings, ["evaluate"], "PoC ending rules");
  return Object.freeze({
    data,
    rules: Object.freeze({
      demand: Object.freeze({
        preview: value.rules.demand.preview,
        resolve: value.rules.demand.resolve,
      }),
      tavern: Object.freeze({
        preview: value.rules.tavern.preview,
        settle: value.rules.tavern.settle,
      }),
      checks: Object.freeze({
        describe: value.rules.checks.describe,
        resolve: value.rules.checks.resolve,
      }),
      endings: Object.freeze({ evaluate: value.rules.endings.evaluate }),
    }),
  });
}

export function createPocGameBootstrapInputV1(
  entropy: BootstrapEntropyV1,
): PocGameBootstrapInputV1 {
  const rngSeed = parseNonZeroUint32(entropy.nextNonZeroUint32());
  const runId = parseRunId(entropy.nextUuidV4());
  return Object.freeze({ rngSeed, runId });
}

export function createInitialPocGameStateV1(
  modules: PocGameplayModuleTupleV1,
  bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): PocGameStateV1 {
  const run = modules[0].createInitialState(bootstrap);
  const calendar = modules[1].createInitialState(bootstrap);
  const actors = modules[2].createInitialState(bootstrap);
  const status = modules[3].createInitialState(bootstrap);
  const inventory = modules[4].createInitialState(bootstrap);
  const facilities = modules[5].createInitialState(bootstrap);
  const tavern = modules[6].createInitialState(bootstrap);
  const activeWorkflow = modules[7].createInitialState(bootstrap);
  const progression = modules[8].createInitialState(bootstrap);
  const narrative = modules[9].createInitialState(bootstrap);

  return pocGameStateSchemaV1.parse({
    simulation: {
      run,
      calendar,
      actors,
      inventory,
      status,
      facilities,
      tavern,
      activeWorkflow,
    },
    story: {
      facts: progression.facts,
      quests: progression.quests,
      outcomes: progression.outcomes,
      resolvedChecks: progression.resolvedChecks,
      narrative,
    },
  });
}

export function createPocGameSimulationV1(programValue: DeepReadonly<PocSimulationProgramV1>) {
  const program = validatePocSimulationProgramV1(programValue);
  const modules = createPocGameplayModuleTupleV1(program);
  const commandExecutor = createPocGameCommandExecutorV1(program, modules);
  const debugCommandExecutor = createPocGameDebugCommandExecutorV1(program, modules);

  return defineGameSimulation<PocGameSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: pocGameStateSchemaV1,
    commandSchema: pocGameCommandSchemaV1,
    factSchema: pocGameplayFactSchemaV1,
    rejectionSchema: pocRejectionReasonSchemaV1,
    debugCommandSchema: pocDebugCommandSchemaV1,
    debugValidationErrorSchema: pocDebugCommandValidationErrorSchemaV1,
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput: createPocGameBootstrapInputV1,
    createInitialState: (bootstrap) => createInitialPocGameStateV1(modules, bootstrap),
    createQueries: (state) => createPocGameQueriesV1(state, program),
    projectGameView: projectPocGameViewV1,
  });
}

export type PocGameSimulationV1 = ReturnType<typeof createPocGameSimulationV1>;
