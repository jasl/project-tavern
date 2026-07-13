// SPDX-License-Identifier: MIT
import { resolveAssetManifestV1 } from "./asset-resolver.js";
import type { BuildIdentityInputV1 } from "./build-identity.js";
import { resolveBuildIdentityV1 } from "./build-identity.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";
import { defineGameSimulation } from "./define-game-simulation.js";
import { resolveHotfixesV1 } from "./hotfix-resolver.js";

import type {
  AssetPackV1,
  AssetSlotDefinitionV1,
  ResolvedAssetManifestV1,
} from "../contracts/assets.js";
import { canonicalJsonBytes } from "../contracts/canonical-json.js";
import { digestBytes, digestCanonical } from "../contracts/digest.js";
import type {
  GamePackageV1,
  ResolvedGameV1,
  StateContractManifestV1,
  StateContractModuleManifestV1,
  StateContractSchemaManifestV1,
  StateContractStableReferenceSetV1,
} from "../contracts/game-package.js";
import type { GameSimulationTypeMapV1 } from "../contracts/gameplay-module.js";
import type {
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionResultV1,
  HotfixEntryV1,
} from "../contracts/hotfix.js";
import {
  canonicalPresentationJsonBytesV1,
  parseStageSceneGraphV1,
} from "../contracts/presentation.js";
import type { StageSceneGraphV1 } from "../contracts/presentation.js";
import {
  parseDigest,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.js";

type FunctionResultV1<TValue, TKey extends PropertyKey> = TValue extends {
  readonly [TCurrent in TKey]: infer TFunction;
}
  ? TFunction extends (...arguments_: never[]) => infer TResult
    ? TResult
    : never
  : never;

type PropertyValueV1<TValue, TKey extends PropertyKey> = TValue extends {
  readonly [TCurrent in TKey]: infer TResult;
}
  ? TResult
  : never;

export type ResolvedGameForPackageV1<TSimulationFacet, TPresentationFacet> = ResolvedGameV1<
  FunctionResultV1<TSimulationFacet, "createGameSimulation">,
  FunctionResultV1<TSimulationFacet, "materializeProgram">,
  FunctionResultV1<TPresentationFacet, "materializePresentation">,
  PropertyValueV1<TPresentationFacet, "uiSceneGraph">,
  ResolvedAssetManifestV1
>;

type ResolvedForV1<TSimulationFacet, TPresentationFacet> = ResolvedGameForPackageV1<
  TSimulationFacet,
  TPresentationFacet
>;

type DataFunctionV1 = (...arguments_: never[]) => unknown;
const validateUnknownGameSimulationV1 =
  defineGameSimulation<GameSimulationTypeMapV1>() as unknown as DataFunctionV1;

interface SourceSimulationFacetLikeV1 {
  readonly record: Record<string, unknown>;
  readonly stateContractRevision: unknown;
  readonly stateContractManifest: StateContractManifestV1;
  readonly data: unknown;
  readonly rules: unknown;
  readonly narrativeProgram: unknown;
  readonly patchSurface: unknown;
  readonly materializeProgram: DataFunctionV1;
  readonly createGameSimulation: DataFunctionV1;
}

interface SourcePresentationFacetLikeV1 {
  readonly record: Record<string, unknown>;
  readonly uiSceneGraph: unknown;
  readonly textCatalogs: unknown;
  readonly assetSlots: unknown;
  readonly assetPacks: unknown;
  readonly patchSurface: unknown;
  readonly materializePresentation: DataFunctionV1;
}

interface SourceDefinitionLikeV1 {
  readonly simulation: SourceSimulationFacetLikeV1;
  readonly presentation: SourcePresentationFacetLikeV1;
}

class StoryContractErrorV1 extends TypeError {
  readonly resolutionFailureKind = "contract";
}
class StoryNondeterminismErrorV1 extends TypeError {
  readonly resolutionFailureKind = "nondeterministic";
}

const maximumFailureMessageLengthV1 = 4_096;

function boundFailureMessageV1(value: string): string {
  let result = "";
  for (let index = 0; index < value.length && result.length < maximumFailureMessageLengthV1;) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (
        second >= 0xdc00 &&
        second <= 0xdfff &&
        result.length + 2 <= maximumFailureMessageLengthV1
      ) {
        result += value[index] ?? "";
        result += value[index + 1] ?? "";
        index += 2;
        continue;
      }
      result += "\uFFFD";
      index += 1;
      continue;
    }
    if (first >= 0xdc00 && first <= 0xdfff) {
      result += "\uFFFD";
      index += 1;
      continue;
    }
    result += value[index] ?? "";
    index += 1;
  }
  return result || "Unknown failure";
}

function ownStringDataPropertyV1(value: unknown, key: string): string | undefined {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return undefined;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined &&
      descriptor.get === undefined &&
      descriptor.set === undefined &&
      typeof descriptor.value === "string"
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function ownDataPropertyV1(value: unknown, key: string): unknown {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return undefined;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined &&
      descriptor.get === undefined &&
      descriptor.set === undefined &&
      "value" in descriptor
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function safeRejectedHotfixIdsV1(hotfixes: readonly HotfixEntryV1[]): readonly string[] {
  const lengthValue = ownDataPropertyV1(hotfixes, "length");
  const length =
    typeof lengthValue === "number" && Number.isSafeInteger(lengthValue) && lengthValue >= 0
      ? Math.min(lengthValue, 1_000)
      : 0;
  const ids: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const hotfix = ownDataPropertyV1(hotfixes, String(index));
    const manifest = ownDataPropertyV1(hotfix, "manifest");
    const identity = ownDataPropertyV1(manifest, "identity");
    const id = ownDataPropertyV1(identity, "id");
    if (typeof id === "string" && !ids.includes(id)) ids.push(id);
  }
  return Object.freeze(ids);
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return boundFailureMessageV1(error);
  const message = ownStringDataPropertyV1(error, "message");
  return boundFailureMessageV1(message ?? "Unknown failure");
}

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) return true;
    if (descriptor !== undefined) return typeof descriptor.value === "function";
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function requirePlainRecord(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new StoryContractErrorV1(`${label} must be a plain object`);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
    throw new StoryContractErrorV1(`${label} must not have symbol keys`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(Object.getOwnPropertyDescriptors(record)).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new StoryContractErrorV1(`${label} has invalid fields`);
  }
}

function ownDataValue(record: Record<string, unknown>, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor)
  ) {
    throw new StoryContractErrorV1(`${label}.${key} must be an own data property`);
  }
  return descriptor.value;
}

function requireDataFunction(value: unknown, label: string): DataFunctionV1 {
  if (typeof value !== "function") {
    throw new StoryContractErrorV1(`${label} must be a function`);
  }
  return value as DataFunctionV1;
}

function validateSourceDefinition(value: unknown): SourceDefinitionLikeV1 {
  const definition = requirePlainRecord(value, "Story definition");
  requireExactKeys(definition, ["simulation", "presentation"], "Story definition");
  const simulation = requirePlainRecord(
    ownDataValue(definition, "simulation", "Story definition"),
    "Story simulation facet",
  );
  const presentation = requirePlainRecord(
    ownDataValue(definition, "presentation", "Story definition"),
    "Story presentation facet",
  );
  requireExactKeys(
    simulation,
    [
      "stateContractRevision",
      "stateContractManifest",
      "data",
      "rules",
      "narrativeProgram",
      "patchSurface",
      "materializeProgram",
      "createGameSimulation",
    ],
    "Story simulation facet",
  );
  requireExactKeys(
    presentation,
    [
      "uiSceneGraph",
      "textCatalogs",
      "assetSlots",
      "assetPacks",
      "patchSurface",
      "materializePresentation",
    ],
    "Story presentation facet",
  );
  return {
    simulation: {
      record: simulation,
      stateContractRevision: ownDataValue(
        simulation,
        "stateContractRevision",
        "Story simulation facet",
      ),
      stateContractManifest: parseStateContractManifestV1(
        ownDataValue(simulation, "stateContractManifest", "Story simulation facet"),
      ),
      data: ownDataValue(simulation, "data", "Story simulation facet"),
      rules: ownDataValue(simulation, "rules", "Story simulation facet"),
      narrativeProgram: ownDataValue(simulation, "narrativeProgram", "Story simulation facet"),
      patchSurface: ownDataValue(simulation, "patchSurface", "Story simulation facet"),
      materializeProgram: requireDataFunction(
        ownDataValue(simulation, "materializeProgram", "Story simulation facet"),
        "Story simulation materializer",
      ),
      createGameSimulation: requireDataFunction(
        ownDataValue(simulation, "createGameSimulation", "Story simulation facet"),
        "Story GameSimulation factory",
      ),
    },
    presentation: {
      record: presentation,
      uiSceneGraph: ownDataValue(presentation, "uiSceneGraph", "Story presentation facet"),
      textCatalogs: ownDataValue(presentation, "textCatalogs", "Story presentation facet"),
      assetSlots: ownDataValue(presentation, "assetSlots", "Story presentation facet"),
      assetPacks: ownDataValue(presentation, "assetPacks", "Story presentation facet"),
      patchSurface: ownDataValue(presentation, "patchSurface", "Story presentation facet"),
      materializePresentation: requireDataFunction(
        ownDataValue(presentation, "materializePresentation", "Story presentation facet"),
        "Story presentation materializer",
      ),
    },
  };
}

interface DeterminismStateV1 {
  readonly firstActive: Set<object>;
  readonly secondActive: Set<object>;
  readonly providerIds: Set<string>;
}

function mismatch(path: string): never {
  throw new StoryNondeterminismErrorV1(`Story definitions differ at ${path}`);
}

function defineProjectionMember(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

interface ArrayDataDescriptorsV1 {
  readonly length: number;
  readonly values: readonly unknown[];
}

interface DefinitionDeterminismSnapshotV1 {
  readonly simulationRecord: unknown;
  readonly presentationRecord: unknown;
}

function requireArrayDataDescriptorsV1(value: unknown[], path: string): ArrayDataDescriptorsV1 {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new StoryContractErrorV1(`Story array has a custom prototype at ${path}`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new StoryContractErrorV1(`Story array has symbol fields at ${path}`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    throw new StoryContractErrorV1(`Story array has an invalid length at ${path}`);
  }
  const length = lengthDescriptor.value;
  const actualKeys = ownKeys as string[];
  if (actualKeys.length !== length + 1) {
    throw new StoryContractErrorV1(`Story array has extra or sparse fields at ${path}`);
  }
  for (const key of actualKeys) {
    if (key === "length") continue;
    if (!/^(?:0|[1-9][0-9]*)$/u.test(key)) {
      throw new StoryContractErrorV1(`Story array has extra or sparse fields at ${path}`);
    }
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
      throw new StoryContractErrorV1(`Story array has extra or sparse fields at ${path}`);
    }
  }
  const values: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      throw new StoryContractErrorV1(`Story array accessor at ${path}/${index}`);
    }
    values.push(descriptor.value);
  }
  return { length, values };
}

function requireStrictArrayValuesV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new StoryContractErrorV1(`${label} must be an array`);
  }
  return requireArrayDataDescriptorsV1(value, label).values;
}

function snapshotDeterministicValueV1(
  value: unknown,
  path: string,
  active: Set<object> = new Set<object>(),
): unknown {
  if (typeof value === "function") return value;
  if (value === null || typeof value !== "object") {
    if (typeof value === "undefined" || typeof value === "symbol" || typeof value === "bigint") {
      throw new StoryContractErrorV1(`Unsupported Story value at ${path}`);
    }
    return value;
  }
  if (active.has(value)) {
    throw new StoryContractErrorV1(`Cyclic Story value at ${path}`);
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(
        requireArrayDataDescriptorsV1(value, path).values.map((entry, index) =>
          snapshotDeterministicValueV1(entry, `${path}/${index}`, active),
        ),
      );
    }
    const record = requirePlainRecord(value, `Story value at ${path}`);
    const descriptors = Object.getOwnPropertyDescriptors(record);
    const snapshot: Record<string, unknown> = {};
    for (const key of Object.keys(descriptors).sort(compareUnicodeCodePointsV1)) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor)
      ) {
        throw new StoryContractErrorV1(`Story accessor at ${path}/${key}`);
      }
      defineProjectionMember(
        snapshot,
        key,
        snapshotDeterministicValueV1(descriptor.value, `${path}/${key}`, active),
      );
    }
    return Object.freeze(snapshot);
  } finally {
    active.delete(value);
  }
}

function compareUnicodeCodePointsV1(left: string, right: string): number {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex) ?? 0;
    const rightPoint = right.codePointAt(rightIndex) ?? 0;
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
    leftIndex += leftPoint > 0xffff ? 2 : 1;
    rightIndex += rightPoint > 0xffff ? 2 : 1;
  }
  if (leftIndex < left.length) return 1;
  if (rightIndex < right.length) return -1;
  return 0;
}

function assertStrictlyIncreasingV1(values: readonly string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (compareUnicodeCodePointsV1(values[index - 1] ?? "", values[index] ?? "") >= 0) {
      throw new StoryContractErrorV1(`${label} must be strictly increasing`);
    }
  }
}

function parseStateContractStableIdV1(value: unknown, label: string): string {
  try {
    return parseModuleId(value) as string;
  } catch {
    throw new StoryContractErrorV1(`${label} must be a stable ID`);
  }
}

function parseStateContractSchemaManifestV1(
  value: unknown,
  label: string,
): StateContractSchemaManifestV1 {
  const record = requirePlainRecord(value, label);
  requireExactKeys(record, ["schemaId", "revision"], label);
  return {
    schemaId: parseStateContractStableIdV1(
      ownDataValue(record, "schemaId", label),
      `${label}.schemaId`,
    ),
    revision: parsePositiveSafeInteger(ownDataValue(record, "revision", label)),
  };
}

function parseStateContractModuleManifestV1(
  value: unknown,
  label: string,
): StateContractModuleManifestV1 {
  const record = requirePlainRecord(value, label);
  requireExactKeys(
    record,
    ["moduleId", "moduleContractRevision", "stateSlots", "stateSchema"],
    label,
  );
  const stateSlots = requireStrictArrayValuesV1(
    ownDataValue(record, "stateSlots", label),
    `${label}.stateSlots`,
  ).map(parseStateSlotId);
  if (new Set(stateSlots).size !== stateSlots.length) {
    throw new StoryContractErrorV1(`${label}.stateSlots must be unique`);
  }
  return {
    moduleId: parseModuleId(ownDataValue(record, "moduleId", label)),
    moduleContractRevision: parsePositiveSafeInteger(
      ownDataValue(record, "moduleContractRevision", label),
    ),
    stateSlots,
    stateSchema: parseStateContractSchemaManifestV1(
      ownDataValue(record, "stateSchema", label),
      `${label}.stateSchema`,
    ),
  };
}

function parseStateContractStableReferenceSetV1(
  value: unknown,
  label: string,
): StateContractStableReferenceSetV1 {
  const record = requirePlainRecord(value, label);
  requireExactKeys(record, ["setId", "ids"], label);
  const ids = requireStrictArrayValuesV1(ownDataValue(record, "ids", label), `${label}.ids`).map(
    (entry) => parseStateContractStableIdV1(entry, `${label}.ids`),
  );
  assertStrictlyIncreasingV1(ids, "State-contract stable reference IDs");
  return {
    setId: parseStateContractStableIdV1(ownDataValue(record, "setId", label), `${label}.setId`),
    ids,
  };
}

function parseStateContractManifestV1(value: unknown): StateContractManifestV1 {
  const label = "State-contract manifest";
  const record = requirePlainRecord(value, label);
  requireExactKeys(
    record,
    [
      "contractRevision",
      "aggregateStateSchema",
      "moduleStateSchemas",
      "persistentIrSchemas",
      "stableReferenceSets",
    ],
    label,
  );
  if (ownDataValue(record, "contractRevision", label) !== 1) {
    throw new StoryContractErrorV1("State-contract manifest contractRevision must be 1");
  }
  const aggregateStateSchema = parseStateContractSchemaManifestV1(
    ownDataValue(record, "aggregateStateSchema", label),
    "State-contract aggregate State schema",
  );
  const moduleStateSchemas = requireStrictArrayValuesV1(
    ownDataValue(record, "moduleStateSchemas", label),
    "State-contract module State schemas",
  ).map((entry, index) =>
    parseStateContractModuleManifestV1(entry, `State-contract module State schema ${index}`),
  );
  assertStrictlyIncreasingV1(
    moduleStateSchemas.map((entry) => entry.moduleId),
    "State-contract module IDs",
  );
  const persistentIrSchemas = requireStrictArrayValuesV1(
    ownDataValue(record, "persistentIrSchemas", label),
    "State-contract persistent IR schemas",
  ).map((entry, index) =>
    parseStateContractSchemaManifestV1(entry, `State-contract persistent IR schema ${index}`),
  );
  assertStrictlyIncreasingV1(
    persistentIrSchemas.map((entry) => entry.schemaId),
    "State-contract persistent IR schema IDs",
  );
  const stableReferenceSets = requireStrictArrayValuesV1(
    ownDataValue(record, "stableReferenceSets", label),
    "State-contract stable reference sets",
  ).map((entry, index) =>
    parseStateContractStableReferenceSetV1(entry, `State-contract stable reference set ${index}`),
  );
  assertStrictlyIncreasingV1(
    stableReferenceSets.map((entry) => entry.setId),
    "State-contract stable reference set IDs",
  );

  const schemaIds = [
    aggregateStateSchema.schemaId,
    ...moduleStateSchemas.map((entry) => entry.stateSchema.schemaId),
    ...persistentIrSchemas.map((entry) => entry.schemaId),
  ];
  if (new Set(schemaIds).size !== schemaIds.length) {
    throw new StoryContractErrorV1("State-contract manifest schema IDs must be unique");
  }

  const manifest = {
    contractRevision: 1 as const,
    aggregateStateSchema,
    moduleStateSchemas,
    persistentIrSchemas,
    stableReferenceSets,
  } satisfies StateContractManifestV1;
  canonicalJsonBytes(manifest);
  return deepFreezeAuthoringValueV1(manifest);
}

function compareDeterministicValue(
  first: unknown,
  second: unknown,
  path: string,
  state: DeterminismStateV1,
): unknown {
  if (typeof first === "function" || typeof second === "function") {
    if (typeof first !== "function" || typeof second !== "function" || first !== second) {
      return mismatch(path);
    }
    const functionName = ownStringDataPropertyV1(first, "name");
    if (functionName === undefined || functionName.length === 0) {
      throw new StoryNondeterminismErrorV1(`Anonymous executable provider at ${path}`);
    }
    return ["function", functionName];
  }
  if (
    first === null ||
    second === null ||
    typeof first !== "object" ||
    typeof second !== "object"
  ) {
    if (!Object.is(first, second)) return mismatch(path);
    if (typeof first === "undefined" || typeof first === "symbol" || typeof first === "bigint") {
      throw new StoryContractErrorV1(`Unsupported Story value at ${path}`);
    }
    return first;
  }

  if (state.firstActive.has(first) || state.secondActive.has(second)) {
    throw new StoryContractErrorV1(`Cyclic Story value at ${path}`);
  }
  state.firstActive.add(first);
  state.secondActive.add(second);
  try {
    const firstIsArray = Array.isArray(first);
    const secondIsArray = Array.isArray(second);
    if (firstIsArray || secondIsArray) {
      if (!firstIsArray || !secondIsArray) {
        return mismatch(path);
      }
      const firstArray = requireArrayDataDescriptorsV1(first, path);
      const secondArray = requireArrayDataDescriptorsV1(second, path);
      if (firstArray.length !== secondArray.length) return mismatch(path);
      const projection: unknown[] = [];
      for (let index = 0; index < firstArray.length; index += 1) {
        projection.push(
          compareDeterministicValue(
            firstArray.values[index],
            secondArray.values[index],
            `${path}/${index}`,
            state,
          ),
        );
      }
      return projection;
    }

    const firstRecord = requirePlainRecord(first, `Story value at ${path}`);
    const secondRecord = requirePlainRecord(second, `Story value at ${path}`);
    const firstDescriptors = Object.getOwnPropertyDescriptors(firstRecord);
    const secondDescriptors = Object.getOwnPropertyDescriptors(secondRecord);
    const firstKeys = Object.keys(firstDescriptors).sort();
    const secondKeys = Object.keys(secondDescriptors).sort();
    if (
      firstKeys.length !== secondKeys.length ||
      firstKeys.some((key, index) => key !== secondKeys[index])
    ) {
      return mismatch(path);
    }
    for (const key of firstKeys) {
      const firstDescriptor = firstDescriptors[key];
      const secondDescriptor = secondDescriptors[key];
      if (
        firstDescriptor?.get !== undefined ||
        firstDescriptor?.set !== undefined ||
        secondDescriptor?.get !== undefined ||
        secondDescriptor?.set !== undefined
      ) {
        throw new StoryContractErrorV1(`Story accessor at ${path}/${key}`);
      }
    }

    const executableProviderKeys = ["provider", "providerId", "sourceDigest"];
    const hasExecutableProviderMarker =
      firstKeys.includes("sourceDigest") ||
      (firstKeys.includes("provider") && typeof firstDescriptors.provider?.value === "function");
    if (hasExecutableProviderMarker) {
      if (
        firstKeys.length !== executableProviderKeys.length ||
        firstKeys.some((key, index) => key !== [...executableProviderKeys].sort()[index])
      ) {
        throw new StoryNondeterminismErrorV1(
          `Executable provider descriptor has invalid fields at ${path}`,
        );
      }
      const firstProviderId = firstDescriptors.providerId?.value;
      const secondProviderId = secondDescriptors.providerId?.value;
      const firstSourceDigest = firstDescriptors.sourceDigest?.value;
      const secondSourceDigest = secondDescriptors.sourceDigest?.value;
      const firstProvider = firstDescriptors.provider?.value;
      const secondProvider = secondDescriptors.provider?.value;
      if (
        typeof firstProviderId !== "string" ||
        typeof secondProviderId !== "string" ||
        firstProviderId !== secondProviderId ||
        firstSourceDigest !== secondSourceDigest ||
        typeof firstProvider !== "function" ||
        firstProvider !== secondProvider
      ) {
        return mismatch(path);
      }
      try {
        parseModuleId(firstProviderId);
        parseDigest(firstSourceDigest);
      } catch {
        throw new StoryNondeterminismErrorV1(`Executable provider identity is invalid at ${path}`);
      }
      const providerName = ownStringDataPropertyV1(firstProvider, "name");
      if (providerName === undefined || providerName.length === 0) {
        throw new StoryNondeterminismErrorV1(`Executable provider is anonymous at ${path}`);
      }
      if (state.providerIds.has(firstProviderId)) {
        throw new StoryNondeterminismErrorV1(`Duplicate executable provider ID ${firstProviderId}`);
      }
      state.providerIds.add(firstProviderId);
      return ["provider", firstProviderId, firstSourceDigest];
    }

    const projection: Record<string, unknown> = {};
    for (const key of firstKeys) {
      defineProjectionMember(
        projection,
        key,
        compareDeterministicValue(
          firstDescriptors[key]?.value,
          secondDescriptors[key]?.value,
          `${path}/${key}`,
          state,
        ),
      );
    }
    return projection;
  } finally {
    state.firstActive.delete(first);
    state.secondActive.delete(second);
  }
}

function assertDeterministicDefinitions(
  first: SourceDefinitionLikeV1,
  second: SourceDefinitionLikeV1,
  firstSnapshot: DefinitionDeterminismSnapshotV1,
): ReturnType<typeof digestBytes> {
  const firstManifestBytes = canonicalJsonBytes(first.simulation.stateContractManifest);
  const secondManifestBytes = canonicalJsonBytes(second.simulation.stateContractManifest);
  if (
    firstManifestBytes.length !== secondManifestBytes.length ||
    firstManifestBytes.some((byte, index) => byte !== secondManifestBytes[index])
  ) {
    mismatch("/simulation/stateContractManifest");
  }
  const state: DeterminismStateV1 = {
    firstActive: new Set<object>(),
    secondActive: new Set<object>(),
    providerIds: new Set<string>(),
  };
  const simulationBytes = canonicalJsonBytes(
    compareDeterministicValue(
      firstSnapshot.simulationRecord,
      second.simulation.record,
      "/simulation",
      state,
    ),
  );
  canonicalPresentationJsonBytesV1(
    compareDeterministicValue(
      firstSnapshot.presentationRecord,
      second.presentation.record,
      "/presentation",
      state,
    ),
  );
  return digestBytes(simulationBytes);
}

function simulationValueProjectionDigestV1(
  value: unknown,
  path: string,
): ReturnType<typeof digestBytes> {
  const state: DeterminismStateV1 = {
    firstActive: new Set<object>(),
    secondActive: new Set<object>(),
    providerIds: new Set<string>(),
  };
  return digestBytes(canonicalJsonBytes(compareDeterministicValue(value, value, path, state)));
}

function requireArray<TValue>(value: unknown, label: string): readonly TValue[] {
  if (!Array.isArray(value)) throw new StoryContractErrorV1(`${label} must be an array`);
  return value as readonly TValue[];
}

interface GameSimulationStatefulModuleIdentityV1 {
  readonly moduleId: ReturnType<typeof parseModuleId>;
  readonly moduleContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
  readonly stateSlots: readonly ReturnType<typeof parseStateSlotId>[];
}

function gameSimulationIdentityProjectionsV1(value: unknown): {
  readonly simulation: unknown;
  readonly statefulModules: readonly GameSimulationStatefulModuleIdentityV1[];
} {
  const simulation = requirePlainRecord(value, "GameSimulation identity root");
  const modules = requireStrictArrayValuesV1(
    ownDataValue(simulation, "modules", "GameSimulation identity root"),
    "GameSimulation modules",
  );
  const projectedModules: unknown[] = [];
  const statefulModules: GameSimulationStatefulModuleIdentityV1[] = [];
  for (const moduleValue of modules) {
    const module = requirePlainRecord(moduleValue, "GameSimulation module identity");
    const descriptor = requirePlainRecord(
      ownDataValue(module, "descriptor", "GameSimulation module identity"),
      "GameSimulation module descriptor identity",
    );
    const bindingKind = ownDataValue(module, "bindingKind", "GameSimulation module identity");
    if (bindingKind !== "stateful" && bindingKind !== "stateless") {
      throw new StoryContractErrorV1("GameSimulation module bindingKind is invalid");
    }
    const id = parseModuleId(
      ownDataValue(descriptor, "id", "GameSimulation module descriptor identity"),
    );
    const moduleContractRevision = parsePositiveSafeInteger(
      ownDataValue(descriptor, "contractRevision", "GameSimulation module descriptor identity"),
    );
    const stateSlots = requireStrictArrayValuesV1(
      ownDataValue(descriptor, "stateSlots", "GameSimulation module descriptor identity"),
      "GameSimulation module State slots",
    ).map(parseStateSlotId);
    const dependencies = requireStrictArrayValuesV1(
      ownDataValue(descriptor, "dependencies", "GameSimulation module descriptor identity"),
      "GameSimulation module dependencies",
    ).map(parseModuleId);
    const capabilities =
      bindingKind === "stateless"
        ? Object.keys(
            requirePlainRecord(
              ownDataValue(module, "capabilities", "GameSimulation module identity"),
              "GameSimulation module capabilities identity",
            ),
          ).sort(compareUnicodeCodePointsV1)
        : [];
    projectedModules.push({
      id,
      contractRevision: moduleContractRevision,
      stateSlots,
      dependencies,
      bindingKind,
      hasCommandSchema:
        ownDataValue(module, "commandSchema", "GameSimulation module identity") !== null,
      hasQuerySchema:
        ownDataValue(module, "querySchema", "GameSimulation module identity") !== null,
      hasQueryResultSchema:
        ownDataValue(module, "queryResultSchema", "GameSimulation module identity") !== null,
      capabilities,
    });
    if (bindingKind === "stateful") {
      statefulModules.push({ moduleId: id, moduleContractRevision, stateSlots });
    }
  }
  const contractRevision = ownDataValue(
    simulation,
    "contractRevision",
    "GameSimulation identity root",
  );
  if (contractRevision !== 1) {
    throw new StoryContractErrorV1("GameSimulation contractRevision must be 1");
  }
  return {
    simulation: {
      contractRevision,
      modules: projectedModules,
      ports: [
        "stateSchema",
        "commandSchema",
        "factSchema",
        "rejectionSchema",
        "debugCommandSchema",
        "debugValidationErrorSchema",
        "commandExecutor",
        "debugCommandExecutor",
        "createBootstrapInput",
        "createInitialState",
        "createQueries",
        "projectGameView",
      ],
    },
    statefulModules,
  };
}

function validateStateContractManifestAgainstGameSimulationV1(
  manifest: StateContractManifestV1,
  actualModules: readonly GameSimulationStatefulModuleIdentityV1[],
): void {
  const actualById = new Map(actualModules.map((module) => [module.moduleId, module] as const));
  if (
    actualById.size !== actualModules.length ||
    actualById.size !== manifest.moduleStateSchemas.length
  ) {
    throw new TypeError("State-contract manifest does not match GameSimulation stateful modules");
  }
  for (const expected of manifest.moduleStateSchemas) {
    const actual = actualById.get(expected.moduleId);
    if (
      actual === undefined ||
      actual.moduleContractRevision !== expected.moduleContractRevision ||
      actual.stateSlots.length !== expected.stateSlots.length ||
      actual.stateSlots.some((slot, index) => slot !== expected.stateSlots[index])
    ) {
      throw new TypeError("State-contract manifest does not match GameSimulation stateful modules");
    }
  }
}

function digestPresentationProjectionV1(value: unknown): ReturnType<typeof digestBytes> {
  const domain = "sillymaker:presentation:v1";
  const domainBytes = Uint8Array.from(domain, (character) => character.charCodeAt(0));
  const valueBytes = canonicalPresentationJsonBytesV1(value);
  const framed = new Uint8Array(domainBytes.length + 1 + valueBytes.length);
  framed.set(domainBytes);
  framed[domainBytes.length] = 0;
  framed.set(valueBytes, domainBytes.length + 1);
  return digestBytes(framed);
}

class StoryPresentationCatalogErrorV1 extends TypeError {
  readonly code = "presentation.catalog.missing_reference";

  constructor(assetId: string, path: string) {
    super(`presentation.catalog.missing_reference at ${path}: ${assetId}`);
  }
}

function validateSceneGraphAssetReferencesV1(
  sceneGraph: StageSceneGraphV1,
  assets: ResolvedAssetManifestV1,
): void {
  const assetIds = new Set(assets.assets.map((asset) => asset.assetId));
  sceneGraph.variants.forEach((variant, index) => {
    if (!assetIds.has(variant.backgroundAssetId)) {
      throw new StoryPresentationCatalogErrorV1(
        variant.backgroundAssetId,
        `/variants/${index}/backgroundAssetId`,
      );
    }
  });
  sceneGraph.characterRigs.forEach((rig, index) => {
    if (rig.staticFallbackAssetId !== null && !assetIds.has(rig.staticFallbackAssetId)) {
      throw new StoryPresentationCatalogErrorV1(
        rig.staticFallbackAssetId,
        `/characterRigs/${index}/staticFallbackAssetId`,
      );
    }
  });
}

function validateAssetPatchSymbolsV1(
  slots: readonly AssetSlotDefinitionV1[],
  assetPatchSymbols: readonly string[],
): void {
  const slotsById = new Map(slots.map((slot) => [slot.assetId, slot]));
  for (const assetId of assetPatchSymbols) {
    const slot = slotsById.get(assetId);
    if (!slot) throw new TypeError(`asset slot unknown: ${assetId}`);
    if (slot.overridePolicy === "sealed") throw new TypeError(`asset slot sealed: ${assetId}`);
  }
}

function failure<TResolved>(
  code: GamePackageResolutionFailureCodeV1,
  hotfixes: readonly HotfixEntryV1[],
  message: string,
): GamePackageResolutionResultV1<TResolved> {
  return Object.freeze({
    kind: "failed",
    failure: Object.freeze({
      code,
      rejectedHotfixIds: safeRejectedHotfixIdsV1(hotfixes),
      details: Object.freeze({ message }),
    }),
  });
}

function classify(error: unknown): GamePackageResolutionFailureCodeV1 {
  const code = ownStringDataPropertyV1(error, "code");
  switch (code) {
    case "hotfix.duplicate_id":
    case "hotfix.target_mismatch":
    case "hotfix.requires_missing":
    case "hotfix.requires_order":
    case "hotfix.conflict":
    case "hotfix.collision":
    case "hotfix.unknown_symbol":
    case "hotfix.provider_mismatch":
    case "hotfix.install_threw":
    case "hotfix.install_thenable":
    case "hotfix.output_invalid":
    case "asset.governance_invalid":
    case "asset.slot_unknown":
    case "asset.slot_sealed":
    case "asset.path_invalid":
    case "build_identity.invalid":
      return code;
  }
  if (
    typeof code === "string" &&
    (code.startsWith("presentation.catalog.") || code.startsWith("content_maturity."))
  ) {
    return "story.presentation_invalid";
  }
  const message = errorMessage(error);
  if (message.includes("hotfix duplicate")) return "hotfix.duplicate_id";
  if (message.includes("target mismatch") || message.includes("undeclared target")) {
    return "hotfix.target_mismatch";
  }
  if (message.includes("requires order")) return "hotfix.requires_order";
  if (message.includes("requires")) return "hotfix.requires_missing";
  if (message.includes("conflict")) return "hotfix.conflict";
  if (message.includes("collision")) return "hotfix.collision";
  if (message.includes("unknown symbol")) return "hotfix.unknown_symbol";
  if (message.includes("provider mismatch")) return "hotfix.provider_mismatch";
  if (message.includes("install returned thenable")) return "hotfix.install_thenable";
  if (message.includes("target was not replaced")) return "hotfix.output_invalid";
  if (message.includes("asset path")) return "asset.path_invalid";
  if (message.includes("asset slot unknown")) return "asset.slot_unknown";
  if (message.includes("asset slot sealed")) return "asset.slot_sealed";
  if (
    message.includes("asset dimensions") ||
    message.includes("Asset Pack") ||
    message.includes("asset slot")
  ) {
    return "asset.governance_invalid";
  }
  if (message.includes("build identity")) return "build_identity.invalid";
  return "story.contract_invalid";
}

export function resolveGamePackageV1<TSimulationFacet, TPresentationFacet>(
  entry: GamePackageV1<TSimulationFacet, TPresentationFacet>,
  hotfixes: readonly HotfixEntryV1<
    PropertyValueV1<TSimulationFacet, "patchSurface">,
    PropertyValueV1<TPresentationFacet, "patchSurface">
  >[],
  buildIdentityInput: BuildIdentityInputV1,
): GamePackageResolutionResultV1<ResolvedForV1<TSimulationFacet, TPresentationFacet>> {
  type TResolved = ResolvedForV1<TSimulationFacet, TPresentationFacet>;
  let firstValue: unknown;
  try {
    firstValue = entry.define();
    if (isThenable(firstValue)) {
      return failure<TResolved>("story.define_thenable", [], "Story define returned thenable");
    }
  } catch (error) {
    return failure<TResolved>("story.define_threw", [], errorMessage(error));
  }

  let first: SourceDefinitionLikeV1 | null = null;
  let firstDeterminismSnapshot: DefinitionDeterminismSnapshotV1 | null = null;
  let firstValidationFailed = false;
  let firstValidationError: unknown;
  try {
    first = validateSourceDefinition(firstValue);
    firstDeterminismSnapshot = {
      simulationRecord: snapshotDeterministicValueV1(first.simulation.record, "/simulation"),
      presentationRecord: snapshotDeterministicValueV1(first.presentation.record, "/presentation"),
    };
  } catch (error) {
    firstValidationFailed = true;
    firstValidationError = error;
  }

  let secondValue: unknown;
  try {
    secondValue = entry.define();
    if (isThenable(secondValue)) {
      return failure<TResolved>("story.define_thenable", [], "Story define returned thenable");
    }
  } catch (error) {
    return failure<TResolved>("story.define_threw", [], errorMessage(error));
  }

  let second: SourceDefinitionLikeV1;
  let simulationDefinitionDigest: ReturnType<typeof digestBytes>;
  try {
    if (firstValidationFailed) throw firstValidationError;
    if (first === null || firstDeterminismSnapshot === null) {
      throw new StoryContractErrorV1("Story definition validation failed");
    }
    second = validateSourceDefinition(secondValue);
    simulationDefinitionDigest = assertDeterministicDefinitions(
      first,
      second,
      firstDeterminismSnapshot,
    );
  } catch (error) {
    const code =
      ownStringDataPropertyV1(error, "resolutionFailureKind") === "nondeterministic"
        ? "story.nondeterministic"
        : "story.contract_invalid";
    return failure<TResolved>(code, [], errorMessage(error));
  }

  let patches: ReturnType<typeof resolveHotfixesV1>;
  try {
    patches = resolveHotfixesV1(
      first.simulation.patchSurface,
      first.presentation.patchSurface,
      hotfixes,
      entry.identity,
    );
  } catch (error) {
    return failure<TResolved>(classify(error), hotfixes, errorMessage(error));
  }

  let simulationProgram: unknown;
  let presentation: unknown;
  try {
    simulationProgram = Reflect.apply(
      first.simulation.materializeProgram,
      first.simulation.record,
      [patches.simulationValues],
    );
    if (isThenable(simulationProgram)) {
      return failure<TResolved>(
        "story.materialization_thenable",
        hotfixes,
        "Simulation materializer returned thenable",
      );
    }
    presentation = Reflect.apply(
      first.presentation.materializePresentation,
      first.presentation.record,
      [patches.presentationValues],
    );
    if (isThenable(presentation)) {
      return failure<TResolved>(
        "story.materialization_thenable",
        hotfixes,
        "Presentation materializer returned thenable",
      );
    }
  } catch (error) {
    return failure<TResolved>("story.materialization_threw", hotfixes, errorMessage(error));
  }

  let sceneGraph: StageSceneGraphV1;
  let simulationProgramDigest: ReturnType<typeof digestBytes>;
  try {
    deepFreezeAuthoringValueV1(simulationProgram);
    simulationProgramDigest = simulationValueProjectionDigestV1(
      simulationProgram,
      "/simulationProgram",
    );
  } catch (error) {
    return failure<TResolved>("story.program_invalid", hotfixes, errorMessage(error));
  }
  try {
    canonicalPresentationJsonBytesV1(presentation);
    deepFreezeAuthoringValueV1(presentation);
  } catch (error) {
    return failure<TResolved>("story.presentation_invalid", hotfixes, errorMessage(error));
  }
  try {
    sceneGraph = parseStageSceneGraphV1(first.presentation.uiSceneGraph);
  } catch (error) {
    return failure<TResolved>("story.presentation_invalid", hotfixes, errorMessage(error));
  }

  let gameSimulation: unknown;
  let gameSimulationIdentity: ReturnType<typeof gameSimulationIdentityProjectionsV1>;
  try {
    const createdGameSimulation = Reflect.apply(
      first.simulation.createGameSimulation,
      first.simulation.record,
      [simulationProgram],
    );
    if (isThenable(createdGameSimulation)) {
      return failure<TResolved>(
        "story.simulation_invalid",
        hotfixes,
        "GameSimulation factory returned an invalid value",
      );
    }
    gameSimulation = Reflect.apply(validateUnknownGameSimulationV1, undefined, [
      createdGameSimulation,
    ]);
    gameSimulationIdentity = gameSimulationIdentityProjectionsV1(gameSimulation);
    validateStateContractManifestAgainstGameSimulationV1(
      first.simulation.stateContractManifest,
      gameSimulationIdentity.statefulModules,
    );
  } catch (error) {
    return failure<TResolved>("story.simulation_invalid", hotfixes, errorMessage(error));
  }

  let build: ReturnType<typeof resolveBuildIdentityV1>;
  try {
    build = resolveBuildIdentityV1(buildIdentityInput);
  } catch (error) {
    return failure<TResolved>("build_identity.invalid", hotfixes, errorMessage(error));
  }

  let assets: ResolvedAssetManifestV1;
  try {
    const slots = requireArray<AssetSlotDefinitionV1>(
      first.presentation.assetSlots,
      "Story assetSlots",
    );
    const packs = requireArray<AssetPackV1>(first.presentation.assetPacks, "Story assetPacks");
    validateAssetPatchSymbolsV1(slots, patches.assetPatchSymbols);
    assets = resolveAssetManifestV1(slots, packs, patches.assetReplacements);
  } catch (error) {
    const code = classify(error);
    return failure<TResolved>(
      code.startsWith("asset.") ? code : "asset.governance_invalid",
      hotfixes,
      errorMessage(error),
    );
  }

  try {
    validateSceneGraphAssetReferencesV1(sceneGraph, assets);
  } catch (error) {
    return failure<TResolved>("story.presentation_invalid", hotfixes, errorMessage(error));
  }

  try {
    const storyDigest = digestCanonical("sillymaker:story:v1", {
      identity: entry.identity,
      simulationSourceDigest: build.storySimulation.digest,
      presentationSourceDigest: build.storyPresentation.digest,
    });
    const stateContractRevision = parsePositiveSafeInteger(first.simulation.stateContractRevision);
    const stateContractDigest = digestCanonical("sillymaker:state-contract:v1", {
      story: entry.identity,
      revision: stateContractRevision,
      manifest: first.simulation.stateContractManifest,
    });
    const simulationDigest = digestCanonical("sillymaker:simulation:v1", {
      story: entry.identity,
      stateContractDigest,
      sourceDigest: build.storySimulation.digest,
      patchSetDigest: patches.patchSet.simulationDigest,
      definitionDigest: simulationDefinitionDigest,
      programDigest: simulationProgramDigest,
      manifest: gameSimulationIdentity.simulation,
    });
    const presentationDigest = digestPresentationProjectionV1({
      story: entry.identity,
      sourceDigest: build.storyPresentation.digest,
      patchSetDigest: patches.patchSet.presentationDigest,
      presentation,
      sceneGraph,
      assetPacks: assets.packs,
    });
    const provenance = deepFreezeAuthoringValueV1({
      story: {
        id: entry.identity.id,
        revision: entry.identity.revision,
        digest: storyDigest,
      },
      engine: { version: "0.0.0", digest: build.engine.digest },
      resolved: {
        stateContractRevision,
        stateContractDigest,
        simulationDigest,
        presentationDigest,
        patchSet: patches.patchSet,
      },
    });
    const resolved = deepFreezeAuthoringValueV1({
      provenance,
      gameSimulation,
      simulationProgram,
      presentation,
      sceneGraph,
      assets,
      frozen: true as const,
    }) as TResolved;
    return Object.freeze({ kind: "resolved", resolved });
  } catch (error) {
    return failure<TResolved>(classify(error), hotfixes, errorMessage(error));
  }
}
