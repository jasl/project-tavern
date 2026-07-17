// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  canonicalJsonBytes,
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  digestCanonical,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStrictJson,
  rngStateV1Schema,
  saveJsonLimitsV1,
  type BuildProvenanceV1,
  type DeepReadonly,
  type HostAtomicRecordStoreV1,
  type HostStoredRecordV1,
  type IsoUtcInstant,
  type LeaseHandoffRequestId,
  type NonNegativeSafeInteger,
  type RuntimeSchemaV1,
  type SaveCodecContextV1,
  type SaveImportInvariantViewV1,
  type SaveImportValidationContextV1,
  type SaveRecordEnvelopeV1,
  type SaveSlotIdV1,
  type SessionLeaseOwnerId,
  type SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  classifySaveCompatibilityV1,
  createGameSessionV1,
  createPersistenceServiceV1,
  decodeSaveRecordV1,
  validateSaveImportCandidateV1,
  type GameSessionCompositionV1,
  type PersistenceServiceV1,
} from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createPocSemanticGamePortV1 } from "../application/create-poc-semantic-port.js";
import { pocReferenceRunIdsV1 } from "../content/identity.js";
import {
  deepFreezePocValueV1,
  pocGameStateSchemaV1,
  type PocGameBootstrapInputV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
  type PocGameStateV1,
} from "../gameplay/index.js";
import type { PocGameSimulationV1 } from "../gameplay/game-simulation.js";
import type { PocSemanticInvocationV1 } from "../presentation/semantic-actions.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { pocReferenceToolingFixtureByStrategyIdV1 } from "../tooling-fixtures.js";
import { compilePocToolingCommandsV1 } from "./compile-reference-strategy.js";
import {
  buildReviewedPocSaveRecordProvenanceV1,
  isPocSaveFixtureProvenanceCurrentV1,
  pocSaveFixtureProvenanceV1,
  projectPocSaveFixtureProvenanceV1,
  type PocSaveFixtureCaptureProvenanceV1,
  type PocSaveFixtureProvenanceModeV1,
} from "./save-fixture-provenance.js";

export { validatePocStateInvariantsV1, validatePocStateReferencesV1 };

export const pocSaveFixtureNamesV1 = Object.freeze([
  "save.auto-opening.json",
  "save.quick-world-action.json",
  "save.manual-completed.json",
  "save.auto-current-corrupt.json",
  "save.auto-previous-valid.json",
  "save.future-format.json",
  "save.revision-mismatch.json",
  "save.digest-mismatch.json",
] as const);

export type PocSaveFixtureNameV1 = (typeof pocSaveFixtureNamesV1)[number];

export interface PocSaveFixtureMatrixV1 {
  readonly files: ReadonlyMap<PocSaveFixtureNameV1, Uint8Array>;
  readonly records: Readonly<Record<PocSaveFixtureNameV1, DeepReadonly<unknown>>>;
  readonly negativeDiffs: Readonly<
    Record<
      | "save.auto-current-corrupt.json"
      | "save.future-format.json"
      | "save.revision-mismatch.json"
      | "save.digest-mismatch.json",
      readonly string[]
    >
  >;
}

export interface BuildPocSaveFixtureMatrixOptionsV1 {
  readonly provenanceMode?: PocSaveFixtureProvenanceModeV1;
}

interface PocSaveSlotMetadataV1 {
  readonly storyId: string;
  readonly slotId: SaveSlotIdV1;
  readonly writeReason: "auto" | "quick" | "manual";
  readonly capturedCommandSequence: NonNegativeSafeInteger;
}

type PocSaveRecordV1 = SaveRecordEnvelopeV1<
  PocGameSnapshotV1,
  BuildProvenanceV1,
  PocSaveSlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

type PocPersistenceV1 = PersistenceServiceV1<PocGameSnapshotV1>;
type PocRuntimeControlV1 = GameSessionCompositionV1<PocGameSimulationTypesV1>["runtimeControl"];
type PocSemanticPortV1 = ReturnType<typeof createPocSemanticGamePortV1>;

interface PocFixtureRuntimeV1 {
  readonly gameSimulation: PocGameSimulationV1;
  readonly semantic: PocSemanticPortV1;
  readonly runtimeControl: PocRuntimeControlV1;
  snapshot(): DeepReadonly<PocGameSnapshotV1>;
}

interface ReadOverrideStoreV1 {
  readonly store: HostAtomicRecordStoreV1;
  listUnmodified(): Promise<readonly HostStoredRecordV1[]>;
  overrideRead(record: DeepReadonly<HostStoredRecordV1>, bytes: Uint8Array): void;
}

interface FixedClockV1 {
  now(): IsoUtcInstant;
  assertConsumed(): void;
}

interface AutoCaptureV1 {
  readonly opening: DeepReadonly<PocSaveRecordV1>;
  readonly current: DeepReadonly<PocSaveRecordV1>;
  readonly previous: DeepReadonly<PocSaveRecordV1>;
  readonly corruptCurrent: DeepReadonly<unknown>;
  readonly recovery: {
    readonly current: { readonly health: "invalid"; readonly code: string };
    readonly previous: {
      readonly health: "valid";
      readonly disposition: "recovery_candidate";
    };
  };
}

interface InternalBuildV1 {
  readonly matrix: PocSaveFixtureMatrixV1;
  readonly recovery: AutoCaptureV1["recovery"];
}

type ExactFieldsV1<TField extends string> = Readonly<Record<TField, unknown>>;

const fixtureNameSetV1 = new Set<string>(pocSaveFixtureNamesV1);
const nodeFileReaderSpecifierV1: string = "node:fs/promises";
const alternativeStateDigestV1 = digestCanonical("sillymaker:state:v1", [
  "project-tavern:poc-save-fixture-corrupt-state",
]);
const alternativeSimulationDigestV1 = digestCanonical("sillymaker:simulation:v1", [
  "project-tavern:poc-save-fixture-simulation-mismatch",
]);

function exactFieldsV1<const TFields extends readonly string[]>(
  value: unknown,
  expectedFields: TFields,
  label: string,
): ExactFieldsV1<TFields[number]> {
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
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedFields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const field of expectedFields) {
    const descriptor = descriptors[field];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${field}`);
    }
  }
  return value as ExactFieldsV1<TFields[number]>;
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

function parseDenseArrayV1<TValue>(
  value: unknown,
  label: string,
  maximumLength: number,
  parseEntry: (entry: unknown, index: number) => TValue,
): readonly TValue[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entryKeys = Object.keys(descriptors).filter((key) => key !== "length");
  if (entryKeys.length !== value.length || entryKeys.some((key, index) => key !== String(index))) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    value.map((_, index) => {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry`);
      }
      return parseEntry(descriptor.value, index);
    }),
  );
}

const buildProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown): BuildProvenanceV1 {
    const fields = exactFieldsV1(value, ["story", "engine", "resolved"], "Save provenance");
    const story = exactFieldsV1(fields.story, ["id", "revision", "digest"], "Story provenance");
    const engine = exactFieldsV1(fields.engine, ["version", "digest"], "engine provenance");
    const resolved = exactFieldsV1(
      fields.resolved,
      [
        "stateContractRevision",
        "stateContractDigest",
        "simulationDigest",
        "presentationDigest",
        "patchSet",
      ],
      "resolved provenance",
    );
    const patchSet = exactFieldsV1(
      resolved.patchSet,
      ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
      "Save PatchSet",
    );
    const appliedHotfixes = parseDenseArrayV1(
      patchSet.appliedHotfixes,
      "Save applied Hotfixes",
      0,
      (): never => {
        throw new TypeError("PoC Save fixture PatchSet must remain empty");
      },
    );
    return Object.freeze({
      story: Object.freeze({
        id: nonemptyStringV1(story.id, "Save Story ID"),
        revision: parsePositiveSafeInteger(story.revision),
        digest: parseDigest(story.digest),
      }),
      engine: Object.freeze({
        version: nonemptyStringV1(engine.version, "Save engine version"),
        digest: parseDigest(engine.digest),
      }),
      resolved: Object.freeze({
        stateContractRevision: parsePositiveSafeInteger(resolved.stateContractRevision),
        stateContractDigest: parseDigest(resolved.stateContractDigest),
        simulationDigest: parseDigest(resolved.simulationDigest),
        presentationDigest: parseDigest(resolved.presentationDigest),
        patchSet: Object.freeze({
          digest: parseDigest(patchSet.digest),
          simulationDigest: parseDigest(patchSet.simulationDigest),
          presentationDigest: parseDigest(patchSet.presentationDigest),
          appliedHotfixes,
        }),
      }),
    });
  },
});

const saveSlotSchemaV1: RuntimeSchemaV1<PocSaveSlotMetadataV1> = Object.freeze({
  parse(value: unknown): PocSaveSlotMetadataV1 {
    const fields = exactFieldsV1(
      value,
      ["storyId", "slotId", "writeReason", "capturedCommandSequence"],
      "Save slot",
    );
    const slotId = fields.slotId;
    if (
      slotId !== "auto.current" &&
      slotId !== "auto.previous" &&
      slotId !== "quick" &&
      slotId !== "manual"
    ) {
      throw new TypeError("invalid Save slot ID");
    }
    const writeReason = fields.writeReason;
    if (writeReason !== "auto" && writeReason !== "quick" && writeReason !== "manual") {
      throw new TypeError("invalid Save write reason");
    }
    return Object.freeze({
      storyId: nonemptyStringV1(fields.storyId, "Save slot Story ID"),
      slotId,
      writeReason,
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const simulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown): readonly SimulationAdoptionV1[] {
    return parseDenseArrayV1(value, "Save simulation lineage", 16, (entry) => {
      const fields = exactFieldsV1(
        entry,
        [
          "fromSimulationDigest",
          "toSimulationDigest",
          "viaSimulationPatchSetDigest",
          "adoptedAtCommandSequence",
        ],
        "Save simulation adoption",
      );
      const fromSimulationDigest = parseDigest(fields.fromSimulationDigest);
      const toSimulationDigest = parseDigest(fields.toSimulationDigest);
      if (fromSimulationDigest === toSimulationDigest) {
        throw new TypeError("empty Save simulation adoption");
      }
      return Object.freeze({
        fromSimulationDigest,
        toSimulationDigest,
        viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
      });
    });
  },
});

const pocSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  pocGameStateSchemaV1,
  rngStateV1Schema,
) as RuntimeSchemaV1<PocGameSnapshotV1>;
const pocSaveRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  pocSnapshotSchemaV1,
  buildProvenanceSchemaV1,
  saveSlotSchemaV1,
  simulationLineageSchemaV1,
) as RuntimeSchemaV1<PocSaveRecordV1>;

const pocSaveCodecV1: SaveCodecContextV1<PocGameSnapshotV1, PocSaveRecordV1> = Object.freeze({
  recordSchema: pocSaveRecordSchemaV1,
  validateEnvelope(record: DeepReadonly<PocSaveRecordV1>): void {
    const expectedReason =
      record.slot.slotId === "quick"
        ? "quick"
        : record.slot.slotId === "manual"
          ? "manual"
          : "auto";
    if (
      record.slot.storyId !== record.provenance.story.id ||
      record.slot.writeReason !== expectedReason ||
      record.slot.capturedCommandSequence !== record.snapshot.commandSequence
    ) {
      throw new TypeError("invalid Save envelope identity");
    }
    for (let index = 0; index < record.simulationLineage.length; index += 1) {
      const current = record.simulationLineage[index];
      const previous = record.simulationLineage[index - 1];
      const next = record.simulationLineage[index + 1];
      if (
        current === undefined ||
        current.toSimulationDigest !==
          (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest) ||
        (previous !== undefined &&
          previous.adoptedAtCommandSequence > current.adoptedAtCommandSequence) ||
        current.adoptedAtCommandSequence > record.snapshot.commandSequence
      ) {
        throw new TypeError("invalid Save simulation lineage");
      }
    }
  },
});

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function strictJsonValueV1(bytes: Uint8Array, label: string): DeepReadonly<unknown> {
  const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!decoded.ok) throw new TypeError(`${label} violates Strict JSON: ${decoded.error.code}`);
  if (!bytesEqualV1(bytes, canonicalJsonBytes(decoded.value))) {
    throw new TypeError(`${label} is not canonical JSON`);
  }
  return deepFreezePocValueV1(decoded.value);
}

function decodeLegalRecordV1(bytes: Uint8Array, label: string): DeepReadonly<PocSaveRecordV1> {
  const decoded = decodeSaveRecordV1(bytes, pocSaveCodecV1);
  if (decoded.kind === "rejected") {
    throw new TypeError(`${label} failed the public Save codec: ${decoded.code}`);
  }
  return decoded.record;
}

function createInitialSnapshotV1(gameSimulation: PocGameSimulationV1): PocGameSnapshotV1 {
  const source = pocReferenceToolingFixtureByStrategyIdV1["strategy.investigation_first"];
  const bootstrap: PocGameBootstrapInputV1 = Object.freeze({
    rngSeed: source.seed,
    runId: pocReferenceRunIdsV1["strategy.investigation_first"],
  });
  return Object.freeze({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

function createFixtureRuntimeV1(resolved: PocResolvedGameV1): PocFixtureRuntimeV1 {
  const gameSimulation = resolved.gameSimulation;
  const created = createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: createInitialSnapshotV1(gameSimulation),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault(error): never {
      throw error;
    },
    onObserverFailure(error): never {
      throw error;
    },
  });
  const semantic = createPocSemanticGamePortV1({
    gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure(error): never {
      throw error;
    },
  });
  return Object.freeze({
    gameSimulation,
    semantic,
    runtimeControl: created.runtimeControl,
    snapshot: () => created.session.getCurrentSnapshot(),
  });
}

async function replayInvocationsV1(
  runtime: PocFixtureRuntimeV1,
  invocations: readonly DeepReadonly<PocSemanticInvocationV1>[],
): Promise<void> {
  for (const invocation of invocations) {
    const revision = runtime.semantic.observe().revision;
    const result = await runtime.semantic.dispatch(invocation);
    if (result.kind !== "committed") {
      throw new TypeError(
        `Save fixture Semantic invocation ${invocation.actionId} did not commit: ${result.kind}`,
      );
    }
    await runtime.semantic.waitForIdle(revision);
  }
}

function createFixedClockV1(times: readonly IsoUtcInstant[]): FixedClockV1 {
  let index = 0;
  return Object.freeze({
    now(): IsoUtcInstant {
      const value = times[index];
      if (value === undefined) throw new TypeError("PoC Save fixture clock was over-consumed");
      index += 1;
      return value;
    },
    assertConsumed(): void {
      if (index !== times.length) {
        throw new TypeError(`PoC Save fixture clock consumed ${index}/${times.length} values`);
      }
    },
  });
}

function createReadOverrideStoreV1(): ReadOverrideStoreV1 {
  const delegate = createMemoryHostRecordStoreV1();
  const overrides = new Map<string, Uint8Array>();
  const identityV1 = (
    namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
    key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
  ): string => `${namespace}\0${key}`;
  const overrideRecordV1 = (record: HostStoredRecordV1): HostStoredRecordV1 => {
    const bytes = overrides.get(identityV1(record.namespace, record.key));
    return bytes === undefined
      ? record
      : Object.freeze({ ...record, bytes: Uint8Array.from(bytes) });
  };
  const store: HostAtomicRecordStoreV1 = Object.freeze({
    async read(
      namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
      key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
    ) {
      const record = await delegate.read(namespace, key);
      return record === null ? null : overrideRecordV1(record);
    },
    async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      return Object.freeze((await delegate.list(namespace)).map(overrideRecordV1));
    },
    commit: (mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) =>
      delegate.commit(mutations),
  });
  return Object.freeze({
    store,
    listUnmodified: () => delegate.list("save"),
    overrideRead(record: DeepReadonly<HostStoredRecordV1>, bytes: Uint8Array): void {
      overrides.set(identityV1(record.namespace, record.key), Uint8Array.from(bytes));
    },
  });
}

function createValidationContextV1(
  resolved: PocResolvedGameV1,
): SaveImportValidationContextV1<PocGameStateV1, PocGameSnapshotV1, PocSaveRecordV1> {
  return Object.freeze({
    codec: pocSaveCodecV1,
    classifyCompatibility(record: DeepReadonly<PocSaveRecordV1>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: resolved.provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclaration: null,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences(state: DeepReadonly<PocGameStateV1>): readonly string[] {
      return validatePocStateReferencesV1(resolved, state);
    },
    validateInvariants(
      view: DeepReadonly<SaveImportInvariantViewV1<PocGameStateV1>>,
    ): readonly string[] {
      return validatePocStateInvariantsV1(resolved, view);
    },
  });
}

function createFixturePersistenceV1(
  runtime: PocFixtureRuntimeV1,
  resolved: PocResolvedGameV1,
  recordProvenance: DeepReadonly<BuildProvenanceV1>,
  records: HostAtomicRecordStoreV1,
  clock: FixedClockV1,
): Promise<PocPersistenceV1> {
  return createPersistenceServiceV1<PocGameStateV1, PocGameSnapshotV1>({
    runtimeControl: runtime.runtimeControl,
    records,
    snapshotSchema: pocSnapshotSchemaV1,
    provenance: recordProvenance,
    adoptionDeclaration: null,
    ownerId: "owner.poc-save-fixtures" as SessionLeaseOwnerId,
    nextHandoffRequestId: () => "request.poc-save-fixtures" as LeaseHandoffRequestId,
    validateReferences(state): readonly string[] {
      return validatePocStateReferencesV1(resolved, state);
    },
    validateInvariants(view): readonly string[] {
      return validatePocStateInvariantsV1(resolved, view);
    },
    initialSimulationLineage: Object.freeze([]),
    metadataClock: clock,
    exportFilename: "project-tavern-poc-save-fixture.json",
  });
}

async function requireExportV1(
  persistence: PocPersistenceV1,
  slotId: SaveSlotIdV1,
): Promise<Uint8Array> {
  const result = await persistence.port.exportSave(slotId);
  if (result.kind !== "exported") {
    throw new TypeError(`failed to export ${slotId}: ${result.kind}`);
  }
  return Uint8Array.from(result.file.bytes);
}

function assertCaptureV1(
  record: DeepReadonly<PocSaveRecordV1>,
  capture: PocSaveFixtureCaptureProvenanceV1,
  slotId: SaveSlotIdV1,
): void {
  if (
    record.formatRevision !== pocSaveFixtureProvenanceV1.saveFormatRevision ||
    record.recordRevision !== capture.expectedRecordRevision ||
    record.savedAt !== capture.savedAt ||
    record.slot.slotId !== slotId ||
    record.snapshot.integrity.mode !== "normal"
  ) {
    throw new TypeError(`PoC Save fixture capture drifted for ${slotId}`);
  }
}

async function buildAutoCaptureV1(
  resolved: PocResolvedGameV1,
  recordProvenance: DeepReadonly<BuildProvenanceV1>,
  invocations: readonly DeepReadonly<PocSemanticInvocationV1>[],
): Promise<AutoCaptureV1> {
  const startIndex = invocations.findIndex(
    ({ actionId }) => actionId === "action.tavern_opening_start",
  );
  if (
    startIndex < 0 ||
    invocations[startIndex + 1]?.actionId !== "action.tavern_opening_finalize"
  ) {
    throw new TypeError("investigation tooling commands lost the reviewed Opening capture pair");
  }
  const runtime = createFixtureRuntimeV1(resolved);
  await replayInvocationsV1(runtime, invocations.slice(0, startIndex));
  const store = createReadOverrideStoreV1();
  const openingCapture = pocSaveFixtureProvenanceV1.captures.auto_opening;
  const postCapture = pocSaveFixtureProvenanceV1.captures.auto_post_opening;
  const clock = createFixedClockV1([openingCapture.savedAt, postCapture.savedAt]);
  const persistence = await createFixturePersistenceV1(
    runtime,
    resolved,
    recordProvenance,
    store.store,
    clock,
  );

  await replayInvocationsV1(runtime, [invocations[startIndex]!]);
  await persistence.autoSaveIdle();
  if (runtime.snapshot().state.simulation.activeWorkflow?.kind !== "opening") {
    throw new TypeError("Auto Opening fixture was not captured during active Opening");
  }
  const opening = decodeLegalRecordV1(
    await requireExportV1(persistence, "auto.current"),
    "Auto Opening Save",
  );
  assertCaptureV1(opening, openingCapture, "auto.current");

  await replayInvocationsV1(runtime, [invocations[startIndex + 1]!]);
  await persistence.autoSaveIdle();
  const previous = decodeLegalRecordV1(
    await requireExportV1(persistence, "auto.previous"),
    "Auto previous Save",
  );
  assertCaptureV1(previous, openingCapture, "auto.previous");
  const currentBytes = await requireExportV1(persistence, "auto.current");
  const current = decodeLegalRecordV1(currentBytes, "Auto current Save");
  assertCaptureV1(current, postCapture, "auto.current");
  clock.assertConsumed();

  const corruptCurrent = deepFreezePocValueV1({
    ...current,
    stateDigest: alternativeStateDigestV1,
  });
  const corruptBytes = canonicalJsonBytes(corruptCurrent);
  const currentStored = (await store.listUnmodified()).find((candidate) => {
    const decoded = decodeSaveRecordV1(candidate.bytes, pocSaveCodecV1);
    return decoded.kind === "decoded" && decoded.record.slot.slotId === "auto.current";
  });
  if (currentStored === undefined) throw new TypeError("missing physical Auto current record");
  store.overrideRead(currentStored, corruptBytes);
  const summaries = await persistence.port.listSlots();
  const currentSummary = summaries.find(({ slotId }) => slotId === "auto.current");
  const previousSummary = summaries.find(({ slotId }) => slotId === "auto.previous");
  const currentCode = currentSummary?.warningCodes[0];
  if (
    currentSummary?.health !== "invalid" ||
    currentCode !== "digest.state_mismatch" ||
    previousSummary?.health !== "recovery_candidate"
  ) {
    throw new TypeError("public Persistence did not expose the reviewed Auto recovery pair");
  }
  return Object.freeze({
    opening,
    current,
    previous,
    corruptCurrent,
    recovery: Object.freeze({
      current: Object.freeze({ health: "invalid" as const, code: currentCode }),
      previous: Object.freeze({
        health: "valid" as const,
        disposition: "recovery_candidate" as const,
      }),
    }),
  });
}

async function buildQuickCaptureV1(
  resolved: PocResolvedGameV1,
  recordProvenance: DeepReadonly<BuildProvenanceV1>,
  invocations: readonly DeepReadonly<PocSemanticInvocationV1>[],
): Promise<DeepReadonly<PocSaveRecordV1>> {
  const worldActionIndex = invocations.findIndex(
    ({ actionId }) => actionId === "action.old_trade_road",
  );
  if (worldActionIndex < 0) throw new TypeError("investigation tooling commands lost WorldAction");
  const runtime = createFixtureRuntimeV1(resolved);
  await replayInvocationsV1(runtime, invocations.slice(0, worldActionIndex + 1));
  if (runtime.snapshot().state.simulation.activeWorkflow?.kind !== "world_action") {
    throw new TypeError("Quick fixture was not captured during active WorldAction");
  }
  const capture = pocSaveFixtureProvenanceV1.captures.quick_world_action;
  const clock = createFixedClockV1([capture.savedAt]);
  const persistence = await createFixturePersistenceV1(
    runtime,
    resolved,
    recordProvenance,
    createMemoryHostRecordStoreV1(),
    clock,
  );
  const saved = await persistence.port.save("quick");
  if (saved.kind !== "saved") throw new TypeError(`failed to create Quick Save: ${saved.kind}`);
  const record = decodeLegalRecordV1(await requireExportV1(persistence, "quick"), "Quick Save");
  assertCaptureV1(record, capture, "quick");
  clock.assertConsumed();
  return record;
}

async function buildManualCaptureV1(
  resolved: PocResolvedGameV1,
  recordProvenance: DeepReadonly<BuildProvenanceV1>,
  invocations: readonly DeepReadonly<PocSemanticInvocationV1>[],
): Promise<DeepReadonly<PocSaveRecordV1>> {
  const runtime = createFixtureRuntimeV1(resolved);
  await replayInvocationsV1(runtime, invocations);
  const snapshot = runtime.snapshot();
  if (
    runtime.semantic.observe().game.status !== "terminal" ||
    snapshot.state.simulation.run.completion === null ||
    snapshot.integrity.mode !== "normal"
  ) {
    throw new TypeError("Manual fixture source did not reach a normal terminal completion");
  }
  const capture = pocSaveFixtureProvenanceV1.captures.manual_completed;
  const clock = createFixedClockV1([capture.savedAt]);
  const persistence = await createFixturePersistenceV1(
    runtime,
    resolved,
    recordProvenance,
    createMemoryHostRecordStoreV1(),
    clock,
  );
  const saved = await persistence.port.save("manual");
  if (saved.kind !== "saved") throw new TypeError(`failed to create Manual Save: ${saved.kind}`);
  const record = decodeLegalRecordV1(
    await requireExportV1(persistence, "manual"),
    "Manual terminal Save",
  );
  assertCaptureV1(record, capture, "manual");
  clock.assertConsumed();
  return record;
}

function changedJsonPathsV1(left: unknown, right: unknown, prefix = ""): readonly string[] {
  if (Object.is(left, right)) return Object.freeze([]);
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object" &&
    Array.isArray(left) === Array.isArray(right)
  ) {
    const leftRecord = left as Readonly<Record<string, unknown>>;
    const rightRecord = right as Readonly<Record<string, unknown>>;
    const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
    return Object.freeze(
      keys.flatMap((key) =>
        changedJsonPathsV1(
          leftRecord[key],
          rightRecord[key],
          prefix.length === 0 ? key : `${prefix}.${key}`,
        ),
      ),
    );
  }
  return Object.freeze([prefix]);
}

function requireRecordProvenanceV1(
  resolved: PocResolvedGameV1,
  mode: PocSaveFixtureProvenanceModeV1,
): DeepReadonly<BuildProvenanceV1> {
  const live = projectPocSaveFixtureProvenanceV1({
    provenance: resolved.provenance,
    appBuildId: digestCanonical("sillymaker:application:v1", []),
  });
  if (!isPocSaveFixtureProvenanceCurrentV1(live, pocSaveFixtureProvenanceV1, mode)) {
    throw new TypeError("poc_save_fixture.provenance_drift");
  }
  return mode === "read_only_verification"
    ? buildReviewedPocSaveRecordProvenanceV1(pocSaveFixtureProvenanceV1)
    : resolved.provenance;
}

async function buildInternalV1(
  provenanceMode: PocSaveFixtureProvenanceModeV1,
): Promise<InternalBuildV1> {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const recordProvenance = requireRecordProvenanceV1(resolved, provenanceMode);
  const source = pocReferenceToolingFixtureByStrategyIdV1["strategy.investigation_first"];
  const compiled = await compilePocToolingCommandsV1(
    "strategy.investigation_first",
    source.commands,
  );
  const invocations = Object.freeze(compiled.entries.map(({ invocation }) => invocation));
  const [auto, quick, manual] = await Promise.all([
    buildAutoCaptureV1(resolved, recordProvenance, invocations),
    buildQuickCaptureV1(resolved, recordProvenance, invocations),
    buildManualCaptureV1(resolved, recordProvenance, invocations),
  ]);

  const futureFormat = deepFreezePocValueV1({ ...manual, formatRevision: 2 });
  const revisionMismatch = deepFreezePocValueV1({
    ...manual,
    provenance: {
      ...manual.provenance,
      story: {
        ...manual.provenance.story,
        revision: parsePositiveSafeInteger(manual.provenance.story.revision + 1),
      },
    },
  });
  const digestMismatch = deepFreezePocValueV1({
    ...manual,
    provenance: {
      ...manual.provenance,
      resolved: {
        ...manual.provenance.resolved,
        simulationDigest: alternativeSimulationDigestV1,
      },
    },
  });
  const records = Object.freeze({
    "save.auto-opening.json": auto.opening,
    "save.quick-world-action.json": quick,
    "save.manual-completed.json": manual,
    "save.auto-current-corrupt.json": auto.corruptCurrent,
    "save.auto-previous-valid.json": auto.previous,
    "save.future-format.json": futureFormat,
    "save.revision-mismatch.json": revisionMismatch,
    "save.digest-mismatch.json": digestMismatch,
  }) satisfies Readonly<Record<PocSaveFixtureNameV1, DeepReadonly<unknown>>>;
  const files = new Map<PocSaveFixtureNameV1, Uint8Array>();
  for (const name of pocSaveFixtureNamesV1) files.set(name, canonicalJsonBytes(records[name]));
  const negativeDiffs = Object.freeze({
    "save.auto-current-corrupt.json": changedJsonPathsV1(auto.current, auto.corruptCurrent),
    "save.future-format.json": changedJsonPathsV1(manual, futureFormat),
    "save.revision-mismatch.json": changedJsonPathsV1(manual, revisionMismatch),
    "save.digest-mismatch.json": changedJsonPathsV1(manual, digestMismatch),
  });
  return Object.freeze({
    matrix: Object.freeze({ files, records, negativeDiffs }),
    recovery: auto.recovery,
  });
}

const internalBuildPromisesV1 = new Map<PocSaveFixtureProvenanceModeV1, Promise<InternalBuildV1>>();
let recoveryPromiseV1: Promise<AutoCaptureV1["recovery"]> | undefined;

function internalBuildV1(mode: PocSaveFixtureProvenanceModeV1): Promise<InternalBuildV1> {
  const current = internalBuildPromisesV1.get(mode);
  if (current !== undefined) return current;
  const pending = buildInternalV1(mode).catch((error: unknown) => {
    internalBuildPromisesV1.delete(mode);
    throw error;
  });
  internalBuildPromisesV1.set(mode, pending);
  return pending;
}

export async function buildPocSaveFixtureMatrixV1(
  options: BuildPocSaveFixtureMatrixOptionsV1 = {},
): Promise<PocSaveFixtureMatrixV1> {
  return (await internalBuildV1(options.provenanceMode ?? "read_only_verification")).matrix;
}

function fixtureUrlV1(name: PocSaveFixtureNameV1): URL {
  return new URL(`../test/fixtures/saves/${name}`, import.meta.url);
}

async function readFixtureBytesV1(name: PocSaveFixtureNameV1): Promise<Uint8Array> {
  const fileReader = (await import(nodeFileReaderSpecifierV1)) as {
    readFile(path: URL): Promise<Uint8Array>;
  };
  try {
    return Uint8Array.from(await fileReader.readFile(fixtureUrlV1(name)));
  } catch (error) {
    throw new TypeError(`unable to read PoC Save fixture ${name}`, { cause: error });
  }
}

function parseFixtureNameV1(value: string): PocSaveFixtureNameV1 {
  if (!fixtureNameSetV1.has(value)) throw new TypeError(`unknown PoC Save fixture ${value}`);
  return value as PocSaveFixtureNameV1;
}

export async function readPocSaveFixtureV1(nameValue: string): Promise<DeepReadonly<unknown>> {
  const name = parseFixtureNameV1(nameValue);
  return strictJsonValueV1(await readFixtureBytesV1(name), `PoC Save fixture ${name}`);
}

export type PocSaveFixtureClassificationV1 =
  | { readonly kind: "exact"; readonly mismatches: readonly [] }
  | {
      readonly kind: "inspect_only";
      readonly mismatches: readonly { readonly field: string; readonly code: string }[];
    }
  | { readonly kind: "rejected"; readonly code: string };

export function classifyPocSaveBytesV1(bytes: Uint8Array): PocSaveFixtureClassificationV1 {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  requireRecordProvenanceV1(resolved, "read_only_verification");
  const result = validateSaveImportCandidateV1(bytes, createValidationContextV1(resolved));
  if (result.kind === "rejected") {
    return Object.freeze({ kind: "rejected" as const, code: result.code });
  }
  if (result.kind === "inspect_only") {
    return Object.freeze({
      kind: "inspect_only" as const,
      mismatches: Object.freeze(
        result.mismatches.map(({ field, code }) => Object.freeze({ field, code })),
      ),
    });
  }
  if (result.kind !== "exact") {
    throw new TypeError(`unexpected PoC Save fixture compatibility ${result.kind}`);
  }
  return Object.freeze({
    kind: "exact" as const,
    mismatches: Object.freeze([]) as readonly [],
  });
}

export async function classifyPocSaveFixtureV1(
  nameValue: string,
): Promise<PocSaveFixtureClassificationV1> {
  const name = parseFixtureNameV1(nameValue);
  return classifyPocSaveBytesV1(await readFixtureBytesV1(name));
}

export async function inspectPocAutoRecoveryPairV1(): Promise<AutoCaptureV1["recovery"]> {
  recoveryPromiseV1 ??= (async () => {
    const resolved = resolveStoryForTestV1(pocStoryEntryV1);
    const recordProvenance = requireRecordProvenanceV1(resolved, "read_only_verification");
    const source = pocReferenceToolingFixtureByStrategyIdV1["strategy.investigation_first"];
    const compiled = await compilePocToolingCommandsV1(
      "strategy.investigation_first",
      source.commands,
    );
    const invocations = Object.freeze(compiled.entries.map(({ invocation }) => invocation));
    return (await buildAutoCaptureV1(resolved, recordProvenance, invocations)).recovery;
  })().catch((error: unknown) => {
    recoveryPromiseV1 = undefined;
    throw error;
  });
  return recoveryPromiseV1;
}
