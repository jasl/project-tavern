// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGameSimulation,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type { DeepReadonly, PositiveSafeInteger } from "@sillymaker/base";

import {
  e2eDebugCommandSchemaV1,
  e2eDebugValidationErrorSchemaV1,
  e2eGameCommandSchemaV1,
  e2eGameStateSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "./contracts/index.js";
import type { E2eGameSimulationTypesV1, E2eSimulationProgramInputV1 } from "./contracts/index.js";
import { createE2eGameCommandExecutorV1 } from "./game-command-executor.js";
import { createE2eGameDebugCommandExecutorV1 } from "./game-debug-command-executor.js";
import { createE2eGameQueriesV1 } from "./game-queries.js";
import { projectE2eGameViewV1 } from "./game-view-projector.js";
import { createE2eGameplayModulesV1 } from "./modules/index.js";

type DataRecordV1 = Readonly<Record<string, unknown>>;

interface ValidatedE2eSimulationProgramV1 {
  readonly resolveChoiceDelta: E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"];
  readonly terminalThreshold: PositiveSafeInteger;
}

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): DataRecordV1 {
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
  if (Object.keys(descriptors).sort().join("\0") !== [...expectedKeys].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }

  const parsed: Record<string, unknown> = {};
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
    parsed[key] = descriptor.value;
  }
  return parsed;
}

function validateE2eSimulationProgramV1(
  programValue: DeepReadonly<E2eSimulationProgramInputV1>,
): ValidatedE2eSimulationProgramV1 {
  const program = exactDataObjectV1(programValue, ["rules", "values"], "E2E Simulation Program");
  const rules = exactDataObjectV1(program.rules, ["resolveChoiceDelta"], "E2E Simulation rules");
  const values = exactDataObjectV1(program.values, ["terminalThreshold"], "E2E Simulation values");
  if (typeof rules.resolveChoiceDelta !== "function") {
    throw new TypeError("invalid E2E choice-delta provider");
  }
  return Object.freeze({
    resolveChoiceDelta:
      rules.resolveChoiceDelta as E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"],
    terminalThreshold: parsePositiveSafeInteger(values.terminalThreshold),
  });
}

export function createE2eGameSimulationV1(program: DeepReadonly<E2eSimulationProgramInputV1>) {
  const validatedProgram = validateE2eSimulationProgramV1(program);
  const modules = createE2eGameplayModulesV1(validatedProgram.resolveChoiceDelta);
  const commandExecutor = createE2eGameCommandExecutorV1(
    modules,
    validatedProgram.terminalThreshold,
  );
  const debugCommandExecutor = createE2eGameDebugCommandExecutorV1(modules);

  return defineGameSimulation<E2eGameSimulationTypesV1>()({
    contractRevision: 1 as const,
    modules,
    stateSchema: e2eGameStateSchemaV1,
    commandSchema: e2eGameCommandSchemaV1,
    factSchema: e2eGameplayFactSchemaV1,
    rejectionSchema: e2eRejectionReasonSchemaV1,
    debugCommandSchema: e2eDebugCommandSchemaV1,
    debugValidationErrorSchema: e2eDebugValidationErrorSchemaV1,
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy) {
      return Object.freeze({ rngSeed: parseNonZeroUint32(entropy.nextNonZeroUint32()) });
    },
    createInitialState(bootstrap) {
      return e2eGameStateSchemaV1.parse({
        simulation: {
          counter: modules[0].createInitialState(bootstrap),
          flow: modules[1].createInitialState(bootstrap),
          run: modules[2].createInitialState(bootstrap),
        },
      });
    },
    createQueries(state) {
      return createE2eGameQueriesV1(
        state,
        validatedProgram.terminalThreshold,
        modules[3].capabilities.resolveChoiceDelta,
      );
    },
    projectGameView(queries) {
      return projectE2eGameViewV1(queries);
    },
  });
}

export type E2eGameSimulationV1 = ReturnType<typeof createE2eGameSimulationV1>;
