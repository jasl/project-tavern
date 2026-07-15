// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  canonicalJsonBytes,
  parseNonZeroUint32,
  type DeepReadonly,
  type NonZeroUint32,
} from "@sillymaker/base";

import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import { actorIdsV1, facilityIdsV1, ingredientIdsV1 } from "../content/ids.js";
import {
  createPocGameSimulationV1,
  createPocRulesV1,
  deepFreezePocValueV1,
  parseDayIndex,
  parseMoney,
  parseSafeInteger,
  pocSimulationDataSchemaV1,
  type DayIndex,
  type PocGameBootstrapInputV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import {
  materializePocSimulationProgramV1,
  pocSimulationPatchSurfaceV1,
} from "../patch-surfaces.js";
import type { PocSemanticActionResultV1 } from "../presentation/semantic-actions.js";
import {
  compilePocStrategyWithProgramV1,
  type CompiledPocReferenceStrategyV1,
} from "./compile-reference-strategy.js";
import {
  pocReferenceStrategyDefinitionsV1,
  pocReferenceStrategyIdsV1,
  type PocReferenceStrategyIdV1,
} from "./reference-strategy-definitions.js";

export type PocCounterfactualScenarioKindV1 =
  | "baseline"
  | "d4_cash_pressure"
  | "without_comfortable_bed_recovery"
  | "without_cold_storage_shelf_life";

export type PocCounterfactualOverrideV1 =
  | { readonly field: "facilityBuildCost"; readonly before: 12; readonly after: 24 }
  | {
      readonly field: "comfortableBedPlayerRecovery";
      readonly before: 2;
      readonly after: 0;
    }
  | {
      readonly field: "comfortableBedHeroineRecovery";
      readonly before: 1;
      readonly after: 0;
    }
  | { readonly field: "coldStorageShelfLife"; readonly before: 2; readonly after: 0 };

export interface PocCounterfactualProvenanceV1 {
  readonly scenarioId:
    | "counterfactual.baseline"
    | "counterfactual.d4_cash_pressure"
    | "counterfactual.without_comfortable_bed_recovery"
    | "counterfactual.without_cold_storage_shelf_life";
  readonly kind: PocCounterfactualScenarioKindV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: NonZeroUint32;
  readonly baseStoryIdentity: typeof pocStoryIdentityV1;
  readonly overrides: readonly DeepReadonly<PocCounterfactualOverrideV1>[];
}

export interface PocCounterfactualScenarioV1 {
  readonly provenance: DeepReadonly<PocCounterfactualProvenanceV1>;
  readonly program: DeepReadonly<PocSimulationProgramV1>;
  readonly bootstrap: DeepReadonly<PocGameBootstrapInputV1>;
}

export interface PocFacilityCounterfactualEffectsV1 {
  readonly withoutBed: {
    readonly d6ManualResult: DeepReadonly<PocSemanticActionResultV1>;
  };
  readonly withoutColdStorage: {
    readonly d4FreshMeatSpoiledAtDay: DayIndex;
  };
}

export interface PocFacilityCounterfactualChecksV1 {
  readonly comfortableBedRecovery: boolean;
  readonly investigationColdStorageShelfLife: boolean;
  readonly fullDelegationColdStorageShelfLife: boolean;
}

interface PocFacilityCounterfactualEvaluationV1 {
  readonly checks: DeepReadonly<PocFacilityCounterfactualChecksV1>;
  readonly withoutBedResult: DeepReadonly<PocSemanticActionResultV1>;
}

interface CreatePocCounterfactualScenarioInputV1 {
  readonly kind: PocCounterfactualScenarioKindV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: number;
}

interface ParsedPocCounterfactualScenarioInputV1 {
  readonly kind: PocCounterfactualScenarioKindV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: NonZeroUint32;
}

const scenarioKindsV1 = new Set<PocCounterfactualScenarioKindV1>([
  "baseline",
  "d4_cash_pressure",
  "without_comfortable_bed_recovery",
  "without_cold_storage_shelf_life",
]);
const strategyIdsV1 = new Set<string>(pocReferenceStrategyIdsV1);
const [playerActorIdV1, heroineActorIdV1] = actorIdsV1;
const [coldStorageIdV1, comfortableBedIdV1] = facilityIdsV1;
const freshMeatIdV1 = ingredientIdsV1[3];
const scenarioProgramCacheV1 = new Map<
  PocCounterfactualScenarioKindV1,
  DeepReadonly<PocSimulationProgramV1>
>();

function exactInputV1(value: unknown): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError("invalid PoC counterfactual scenario input");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = ["kind", "seed", "strategyId"];
  const keys = Object.keys(descriptors).sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index]) ||
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true,
    )
  ) {
    throw new TypeError("invalid PoC counterfactual scenario input fields");
  }
  return value as Readonly<Record<string, unknown>>;
}

function parseScenarioInputV1(value: unknown): ParsedPocCounterfactualScenarioInputV1 {
  const input = exactInputV1(value);
  const kind = input.kind;
  if (typeof kind !== "string" || !scenarioKindsV1.has(kind as PocCounterfactualScenarioKindV1)) {
    throw new TypeError("invalid PoC counterfactual scenario kind");
  }
  const strategyId = input.strategyId;
  if (typeof strategyId !== "string" || !strategyIdsV1.has(strategyId)) {
    throw new TypeError("invalid PoC counterfactual StrategyId");
  }
  return deepFreezePocValueV1({
    kind: kind as PocCounterfactualScenarioKindV1,
    strategyId: strategyId as PocReferenceStrategyIdV1,
    seed: parseNonZeroUint32(input.seed),
  });
}

function defaultProgramV1(): DeepReadonly<PocSimulationProgramV1> {
  const { slots } = pocSimulationPatchSurfaceV1;
  return materializePocSimulationProgramV1({
    balance: slots.balance.defaultValue,
    demandPreview: slots.demandPreview.defaultValue,
    demandResolve: slots.demandResolve.defaultValue,
    tavernPreview: slots.tavernPreview.defaultValue,
    tavernSettle: slots.tavernSettle.defaultValue,
    checksDescribe: slots.checksDescribe.defaultValue,
    checksResolve: slots.checksResolve.defaultValue,
    endingsEvaluate: slots.endingsEvaluate.defaultValue,
  });
}

function replaceFacilityDefinitionsV1(
  baseProgram: DeepReadonly<PocSimulationProgramV1>,
  kind: PocCounterfactualScenarioKindV1,
): readonly unknown[] {
  if (kind === "baseline") return baseProgram.data.content.facilities;

  let changedFacilities = 0;
  let changedModifiers = 0;
  const facilities = baseProgram.data.content.facilities.map((facility) => {
    if (kind === "d4_cash_pressure") {
      if (facility.cashCost !== 12) {
        throw new TypeError(`unexpected base facility cost for ${facility.facilityId}`);
      }
      changedFacilities += 1;
      return { ...facility, cashCost: parseMoney(24) };
    }
    if (kind === "without_comfortable_bed_recovery") {
      if (facility.facilityId !== comfortableBedIdV1) return facility;
      changedFacilities += 1;
      return {
        ...facility,
        modifiers: facility.modifiers.map((modifier) => {
          if (modifier.kind !== "recovery.add") return modifier;
          if (modifier.actorId === playerActorIdV1 && modifier.amount === 2) {
            changedModifiers += 1;
            return { ...modifier, amount: parseSafeInteger(0) };
          }
          if (modifier.actorId === heroineActorIdV1 && modifier.amount === 1) {
            changedModifiers += 1;
            return { ...modifier, amount: parseSafeInteger(0) };
          }
          throw new TypeError("unexpected comfortable-bed recovery modifier");
        }),
      };
    }
    if (facility.facilityId !== coldStorageIdV1) return facility;
    changedFacilities += 1;
    return {
      ...facility,
      modifiers: facility.modifiers.filter((modifier) => {
        if (modifier.kind !== "shelf_life.add_days") return true;
        if (modifier.amount !== 2) {
          throw new TypeError("unexpected cold-storage shelf-life modifier");
        }
        changedModifiers += 1;
        // The frozen Modifier ABI admits only positive shelf-life additions. The test-only
        // override's conceptual zero is therefore normalized to absence, without changing the
        // facility ID, cost, choice, command, or any other Program field.
        return false;
      }),
    };
  });

  const expectedFacilities = kind === "d4_cash_pressure" ? 2 : 1;
  const expectedModifiers =
    kind === "d4_cash_pressure" ? 0 : kind === "without_comfortable_bed_recovery" ? 2 : 1;
  if (changedFacilities !== expectedFacilities || changedModifiers !== expectedModifiers) {
    throw new TypeError(`counterfactual ${kind} did not match the authored facility Program`);
  }
  return facilities;
}

export function materializePocCounterfactualProgramV1(
  kind: PocCounterfactualScenarioKindV1,
  baseProgramValue?: DeepReadonly<PocSimulationProgramV1>,
): DeepReadonly<PocSimulationProgramV1> {
  if (!scenarioKindsV1.has(kind)) throw new TypeError("invalid PoC counterfactual Program kind");
  if (baseProgramValue === undefined) {
    const cached = scenarioProgramCacheV1.get(kind);
    if (cached !== undefined) return cached;
  }

  const baseProgram = baseProgramValue ?? defaultProgramV1();
  const data = pocSimulationDataSchemaV1.parse({
    ...baseProgram.data,
    content: {
      ...baseProgram.data.content,
      facilities: replaceFacilityDefinitionsV1(baseProgram, kind),
    },
  });
  const program = deepFreezePocValueV1<PocSimulationProgramV1>({
    data,
    rules: createPocRulesV1(data),
  });

  // This performs the full Program, module-composition, executor, query and projector validation
  // before a caller is able to construct a Session from the returned Program.
  createPocGameSimulationV1(program);
  if (baseProgramValue === undefined) scenarioProgramCacheV1.set(kind, program);
  return program;
}

function scenarioIdV1(
  kind: PocCounterfactualScenarioKindV1,
): PocCounterfactualProvenanceV1["scenarioId"] {
  switch (kind) {
    case "baseline":
      return "counterfactual.baseline";
    case "d4_cash_pressure":
      return "counterfactual.d4_cash_pressure";
    case "without_comfortable_bed_recovery":
      return "counterfactual.without_comfortable_bed_recovery";
    case "without_cold_storage_shelf_life":
      return "counterfactual.without_cold_storage_shelf_life";
  }
  const unsupported: never = kind;
  throw new TypeError(`unsupported counterfactual scenario ${String(unsupported)}`);
}

function overridesV1(
  kind: PocCounterfactualScenarioKindV1,
): readonly DeepReadonly<PocCounterfactualOverrideV1>[] {
  switch (kind) {
    case "baseline":
      return Object.freeze([]);
    case "d4_cash_pressure":
      return deepFreezePocValueV1([{ field: "facilityBuildCost", before: 12, after: 24 } as const]);
    case "without_comfortable_bed_recovery":
      return deepFreezePocValueV1(
        [
          { field: "comfortableBedPlayerRecovery", before: 2, after: 0 } as const,
          { field: "comfortableBedHeroineRecovery", before: 1, after: 0 } as const,
        ].toSorted((left, right) =>
          left.field < right.field ? -1 : left.field > right.field ? 1 : 0,
        ),
      );
    case "without_cold_storage_shelf_life":
      return deepFreezePocValueV1([
        { field: "coldStorageShelfLife", before: 2, after: 0 } as const,
      ]);
  }
  const unsupported: never = kind;
  throw new TypeError(`unsupported counterfactual override ${String(unsupported)}`);
}

export function createPocCounterfactualScenarioV1(
  inputValue: CreatePocCounterfactualScenarioInputV1,
): DeepReadonly<PocCounterfactualScenarioV1> {
  const input = parseScenarioInputV1(inputValue);
  return deepFreezePocValueV1({
    provenance: {
      scenarioId: scenarioIdV1(input.kind),
      kind: input.kind,
      strategyId: input.strategyId,
      seed: input.seed,
      baseStoryIdentity: pocStoryIdentityV1,
      overrides: overridesV1(input.kind),
    },
    program: materializePocCounterfactualProgramV1(input.kind),
    bootstrap: {
      rngSeed: input.seed,
      runId: pocReferenceRunIdsV1[input.strategyId],
    },
  });
}

export function mutateCounterfactualProgramForTestV1(
  scenario: DeepReadonly<PocCounterfactualScenarioV1>,
): never {
  const facility = scenario.program.data.content.facilities[0];
  if (facility === undefined) throw new TypeError("counterfactual Program has no facility");
  Object.defineProperty(facility, "cashCost", {
    value: parseMoney(Number(facility.cashCost) + 1),
    enumerable: true,
  });
  throw new TypeError("counterfactual Program unexpectedly allowed mutation");
}

function resultForInvocationV1(
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
  predicate: (
    entry: DeepReadonly<CompiledPocReferenceStrategyV1["fixture"]["entries"][number]>,
  ) => boolean,
): DeepReadonly<PocSemanticActionResultV1> {
  const index = compiled.fixture.entries.findIndex(predicate);
  const result = index < 0 ? undefined : compiled.results[index];
  if (result === undefined) throw new TypeError("counterfactual invocation result is missing");
  return result;
}

function assertCanonicalEqualV1(left: unknown, right: unknown, label: string): void {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  if (
    leftBytes.length !== rightBytes.length ||
    leftBytes.some((value, index) => value !== rightBytes[index])
  ) {
    throw new TypeError(`${label} diverged`);
  }
}

function d4FreshMeatBatchIdsV1(
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const attempt of compiled.attempts) {
    const entry = compiled.fixture.entries.find(
      (candidate) => candidate.commandSequence === attempt.commandSequence.before,
    );
    if (entry?.day !== 4 || attempt.outcome.kind !== "committed") continue;
    for (const fact of attempt.outcome.facts) {
      if (fact.kind !== "inventory.purchased") continue;
      fact.lines.forEach((line, index) => {
        if (line.ingredientId !== freshMeatIdV1) return;
        const batchId = fact.createdBatchIds[index];
        if (batchId === undefined) throw new TypeError("fresh-meat purchase lost its BatchId");
        ids.add(batchId);
      });
    }
  }
  if (ids.size === 0) throw new TypeError("counterfactual run purchased no D4 fresh meat");
  return ids;
}

function hasMatchingInventoryFactV1(
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
  day: number,
  kind: "inventory.consumed" | "inventory.spoiled",
  d4BatchIds: ReadonlySet<string>,
): boolean {
  return compiled.attempts.some((attempt) => {
    const entry = compiled.fixture.entries.find(
      (candidate) => candidate.commandSequence === attempt.commandSequence.before,
    );
    if (entry?.day !== day || attempt.outcome.kind !== "committed") return false;
    return attempt.outcome.facts.some(
      (fact) =>
        fact.kind === kind &&
        fact.lines.some(
          (line) =>
            line.ingredientId === freshMeatIdV1 &&
            d4BatchIds.has(line.batchId) &&
            Number(line.quantity) > 0,
        ),
    );
  });
}

async function compileScenarioV1(
  kind: PocCounterfactualScenarioKindV1,
  strategyId: PocReferenceStrategyIdV1,
  baseProgram: DeepReadonly<PocSimulationProgramV1>,
): Promise<CompiledPocReferenceStrategyV1> {
  return compilePocStrategyWithProgramV1(
    pocReferenceStrategyDefinitionsV1[strategyId],
    pocReferenceSeedV1,
    materializePocCounterfactualProgramV1(kind, baseProgram),
  );
}

async function evaluatePocFacilityCounterfactualsV1(
  baseProgram: DeepReadonly<PocSimulationProgramV1>,
): Promise<PocFacilityCounterfactualEvaluationV1> {
  const [bedBaseline, withoutBed] = await Promise.all([
    compileScenarioV1("baseline", "strategy.cash_first", baseProgram),
    compileScenarioV1("without_comfortable_bed_recovery", "strategy.cash_first", baseProgram),
  ]);
  const d6Opening = (
    entry: DeepReadonly<CompiledPocReferenceStrategyV1["fixture"]["entries"][number]>,
  ) =>
    entry.day === 6 &&
    entry.phase === "evening" &&
    entry.invocation.actionId === "action.tavern_opening_start";
  const baselineBedResult = resultForInvocationV1(bedBaseline, d6Opening);
  const withoutBedResult = resultForInvocationV1(withoutBed, d6Opening);
  assertCanonicalEqualV1(
    bedBaseline.fixture.entries.slice(0, withoutBed.fixture.entries.length),
    withoutBed.fixture.entries,
    "comfortable-bed invocation prefix",
  );
  const comfortableBedRecovery =
    baselineBedResult.kind === "committed" &&
    withoutBedResult.kind === "rejected" &&
    withoutBedResult.reasons.some(
      (reason) =>
        reason.code === "actor.insufficient_stamina" && reason.details.actorId === playerActorIdV1,
    );

  const coldStrategies = ["strategy.investigation_first", "strategy.full_delegation"] as const;
  const coldStorageShelfLife: Record<(typeof coldStrategies)[number], boolean> = {
    "strategy.investigation_first": false,
    "strategy.full_delegation": false,
  };
  for (const strategyId of coldStrategies) {
    const [coldBaseline, withoutCold] = await Promise.all([
      compileScenarioV1("baseline", strategyId, baseProgram),
      compileScenarioV1("without_cold_storage_shelf_life", strategyId, baseProgram),
    ]);
    const baselineD4Batches = d4FreshMeatBatchIdsV1(coldBaseline);
    const withoutColdD4Batches = d4FreshMeatBatchIdsV1(withoutCold);
    assertCanonicalEqualV1(
      coldBaseline.fixture.entries.filter(({ day }) => day <= 5),
      withoutCold.fixture.entries.filter(({ day }) => day <= 5),
      `${strategyId} cold-storage invocation prefix`,
    );
    assertCanonicalEqualV1(
      [...baselineD4Batches].toSorted(),
      [...withoutColdD4Batches].toSorted(),
      `${strategyId} D4 fresh-meat BatchIds`,
    );
    coldStorageShelfLife[strategyId] =
      !hasMatchingInventoryFactV1(coldBaseline, 5, "inventory.spoiled", baselineD4Batches) &&
      hasMatchingInventoryFactV1(coldBaseline, 6, "inventory.consumed", baselineD4Batches) &&
      hasMatchingInventoryFactV1(withoutCold, 5, "inventory.spoiled", withoutColdD4Batches);
  }

  return deepFreezePocValueV1({
    checks: {
      comfortableBedRecovery,
      investigationColdStorageShelfLife: coldStorageShelfLife["strategy.investigation_first"],
      fullDelegationColdStorageShelfLife: coldStorageShelfLife["strategy.full_delegation"],
    },
    withoutBedResult,
  });
}

export async function evaluatePocFacilityCounterfactualChecksV1(
  baseProgram: DeepReadonly<PocSimulationProgramV1>,
): Promise<DeepReadonly<PocFacilityCounterfactualChecksV1>> {
  return (await evaluatePocFacilityCounterfactualsV1(baseProgram)).checks;
}

export async function runPocFacilityCounterfactualsV1(): Promise<
  DeepReadonly<PocFacilityCounterfactualEffectsV1>
> {
  const evaluation = await evaluatePocFacilityCounterfactualsV1(defaultProgramV1());
  if (!evaluation.checks.comfortableBedRecovery) {
    throw new TypeError("comfortable-bed D6 manual-service counterfactual did not separate");
  }
  if (!evaluation.checks.investigationColdStorageShelfLife) {
    throw new TypeError(
      "cold-storage fresh-meat counterfactual failed for strategy.investigation_first",
    );
  }
  if (!evaluation.checks.fullDelegationColdStorageShelfLife) {
    throw new TypeError(
      "cold-storage fresh-meat counterfactual failed for strategy.full_delegation",
    );
  }

  return deepFreezePocValueV1({
    withoutBed: { d6ManualResult: evaluation.withoutBedResult },
    withoutColdStorage: { d4FreshMeatSpoiledAtDay: parseDayIndex(5) },
  });
}
