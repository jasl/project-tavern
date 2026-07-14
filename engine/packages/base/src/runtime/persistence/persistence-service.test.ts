// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SessionLeaseOwnerId } from "../../contracts/application.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.js";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.js";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.js";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "../../contracts/hotfix.js";
import type { BuildProvenanceV1 } from "../../contracts/provenance.js";
import {
  createSaveRecordEnvelopeSchemaV1,
  parseIsoUtcInstantV1,
} from "../../contracts/persistence.js";
import type {
  SaveCodecContextV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.js";
import type { GameSnapshotEnvelopeV1, RunIntegrityV1 } from "../../contracts/snapshot.js";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  runIntegrityV1Schema,
} from "../../contracts/snapshot.js";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.js";
import type {
  AuthoritativeOutcomeV1,
  GameSessionRuntimeControlV1,
} from "../session/game-session.js";
import { createGameSessionV1 } from "../session/game-session.js";
import { classifySaveCompatibilityV1 } from "./compatibility.js";
import { decodeSaveRecordV1, encodeSaveRecordV1 } from "./save-codec.js";
import { createPersistenceServiceV1 } from "./persistence-service.js";
import { createSaveRepositoryV1 } from "./save-repository.js";
import type { SaveRepositorySlotMetadataV1, SaveRepositoryV1 } from "./save-repository.js";
import { createSessionLeaseV1 } from "./session-lease.js";
import type { SessionLeaseV1 } from "./session-lease.js";
import { createSaveSlotRecordKeyV1 } from "./slot-keys.js";

interface SyntheticStateV1 {
  readonly count: NonNegativeSafeInteger;
  readonly referenceId: string;
}

interface SyntheticRngV1 {
  readonly cursor: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngV1>;
type SyntheticSaveRecordV1 = SaveRecordEnvelopeV1<
  SyntheticSnapshotV1,
  BuildProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

type SyntheticCommandV1 = { readonly kind: "increment" };
type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  { readonly count: NonNegativeSafeInteger },
  { readonly code: string },
  { readonly code: string },
  SyntheticRngV1,
  never
>;

interface SyntheticTypesV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  SyntheticStateV1,
  SyntheticRngV1
> {
  readonly snapshot: SyntheticSnapshotV1;
  readonly command: SyntheticCommandV1;
  readonly fact: { readonly count: NonNegativeSafeInteger };
  readonly rejection: { readonly code: string };
  readonly fault: { readonly code: string };
  readonly rngState: SyntheticRngV1;
  readonly rngDrawTrace: never;
  readonly executionContext: undefined;
}

const storyIdV1 = "story.persistence-service-test";
const ownerIdV1 = "owner.persistence-service-test" as SessionLeaseOwnerId;
const textEncoderV1 = new TextEncoder();

async function resolveWithinV1<TResult>(promise: Promise<TResult>): Promise<TResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("operation did not settle within the test guard"));
        }, 1_000);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

const digestV1 = (label: string): Digest => digestBytes(textEncoderV1.encode(label));

function patchSetV1(label = "current"): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch:${label}`),
    simulationDigest: digestV1(`patch:simulation:${label}`),
    presentationDigest: digestV1(`patch:presentation:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

function provenanceV1(
  input: {
    readonly simulation?: string;
    readonly engine?: string;
    readonly patch?: string;
  } = {},
): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: storyIdV1,
      revision: parsePositiveSafeInteger(1),
      digest: digestV1("story"),
    }),
    engine: Object.freeze({
      version: "1.0.0",
      digest: digestV1(input.engine ?? "engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: digestV1("state-contract"),
      simulationDigest: digestV1(input.simulation ?? "simulation.current"),
      presentationDigest: digestV1("presentation"),
      patchSet: patchSetV1(input.patch),
    }),
  });
}

function adoptionDeclarationV1(
  stored: BuildProvenanceV1,
  current: BuildProvenanceV1,
): PatchSetAdoptionDeclarationV1 {
  return Object.freeze({
    storyId: current.story.id,
    storyRevision: current.story.revision,
    stateContractRevision: current.resolved.stateContractRevision,
    stateContractDigest: current.resolved.stateContractDigest,
    fromSimulationDigest: stored.resolved.simulationDigest,
    toSimulationDigest: current.resolved.simulationDigest,
    simulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
  });
}

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)
  ) {
    throw new TypeError("invalid object fields");
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ),
  );
}

const stateSchemaV1: RuntimeSchemaV1<SyntheticStateV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["count", "referenceId"]);
    if (typeof fields.referenceId !== "string") throw new TypeError("invalid reference ID");
    return Object.freeze({
      count: parseNonNegativeSafeInteger(fields.count),
      referenceId: fields.referenceId,
    });
  },
});

const rngSchemaV1: RuntimeSchemaV1<SyntheticRngV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["cursor"]);
    return Object.freeze({ cursor: parseNonNegativeSafeInteger(fields.cursor) });
  },
});

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(stateSchemaV1, rngSchemaV1);
const provenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") throw new TypeError("invalid provenance");
    return value as BuildProvenanceV1;
  },
});
const slotSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, [
      "storyId",
      "slotId",
      "writeReason",
      "capturedCommandSequence",
    ]);
    if (
      typeof fields.storyId !== "string" ||
      (fields.slotId !== "auto.current" &&
        fields.slotId !== "auto.previous" &&
        fields.slotId !== "quick" &&
        fields.slotId !== "manual") ||
      (fields.writeReason !== "auto" &&
        fields.writeReason !== "quick" &&
        fields.writeReason !== "manual")
    ) {
      throw new TypeError("invalid slot metadata");
    }
    return Object.freeze({
      storyId: fields.storyId,
      slotId: fields.slotId,
      writeReason: fields.writeReason,
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});
const lineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value)) throw new TypeError("invalid simulation lineage");
    return Object.freeze(value) as readonly SimulationAdoptionV1[];
  },
});
const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);
const codecV1: SaveCodecContextV1<SyntheticSnapshotV1, SyntheticSaveRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope(record: DeepReadonly<SyntheticSaveRecordV1>) {
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
      throw new TypeError("invalid Save identity");
    }
    for (let index = 0; index < record.simulationLineage.length; index += 1) {
      const current = record.simulationLineage[index];
      const next = record.simulationLineage[index + 1];
      if (
        current === undefined ||
        current.toSimulationDigest !==
          (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest)
      ) {
        throw new TypeError("invalid simulation lineage");
      }
    }
  },
});

function snapshotV1(
  sequence: number,
  integrity: RunIntegrityV1 = createPristineRunIntegrityV1(),
): SyntheticSnapshotV1 {
  return snapshotSchemaV1.parse({
    state: { count: sequence, referenceId: "reference.valid" },
    rng: { cursor: sequence },
    commandSequence: sequence,
    integrity,
  });
}

function lineageV1(length: number, finalDigest: Digest): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length }, (_, index) => digestV1(`lineage:${index}`));
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: boundaries[index + 1] ?? finalDigest,
        viaSimulationPatchSetDigest: digestV1(`lineage-patch:${index}`),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(index),
      }),
    ),
  );
}

function recordV1(input: {
  readonly snapshot: SyntheticSnapshotV1;
  readonly provenance?: BuildProvenanceV1;
  readonly lineage?: readonly SimulationAdoptionV1[];
  readonly slotId?: "auto.current" | "auto.previous" | "quick" | "manual";
  readonly recordRevision?: number;
}): SyntheticSaveRecordV1 {
  const provenance = input.provenance ?? provenanceV1();
  const slotId = input.slotId ?? "manual";
  return recordSchemaV1.parse({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(input.recordRevision ?? 1),
    provenance,
    slot: {
      storyId: storyIdV1,
      slotId,
      writeReason: slotId === "quick" ? "quick" : slotId === "manual" ? "manual" : "auto",
      capturedCommandSequence: input.snapshot.commandSequence,
    },
    savedAt: parseIsoUtcInstantV1("2026-07-14T12:00:00.000Z"),
    stateDigest: digestCanonical("sillymaker:state:v1", input.snapshot),
    snapshot: input.snapshot,
    simulationLineage: input.lineage ?? Object.freeze([]),
  });
}

const commandSchemaV1: RuntimeSchemaV1<SyntheticCommandV1> = Object.freeze({
  parse(value: unknown) {
    if ((value as { readonly kind?: unknown } | null)?.kind !== "increment") {
      throw new TypeError("invalid command");
    }
    return Object.freeze({ kind: "increment" });
  },
});

function executeAttemptV1(current: DeepReadonly<SyntheticSnapshotV1>): SyntheticAttemptV1 {
  const parsed = snapshotV1(Number(current.commandSequence) + 1, current.integrity);
  const next = Object.freeze({ ...parsed, integrity: current.integrity });
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: next,
      facts: Object.freeze([{ count: next.state.count }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: current.rng,
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: next.rng,
    }),
  });
}

function createSessionV1(initial: SyntheticSnapshotV1) {
  return createGameSessionV1<SyntheticTypesV1>({
    initialSnapshot: initial,
    commandSchema: commandSchemaV1,
    executionContext: undefined,
    executeAttempt: executeAttemptV1,
    normalizeUnexpectedDispatchFault(_error, current) {
      return Object.freeze({
        result: Object.freeze({
          kind: "faulted" as const,
          snapshot: current,
          fault: Object.freeze({ code: "synthetic.unexpected" }),
        }),
        diagnostics: Object.freeze({
          committedRngBefore: current.rng,
          attemptedDraws: Object.freeze([]) as readonly never[],
          committedRngAfter: current.rng,
        }),
      });
    },
  });
}

function failReplacementCommitV1(
  control: GameSessionRuntimeControlV1<SyntheticSnapshotV1>,
): GameSessionRuntimeControlV1<SyntheticSnapshotV1> {
  return Object.freeze({
    ...control,
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<SyntheticSnapshotV1>,
      ) => Promise<AuthoritativeOutcomeV1<SyntheticSnapshotV1, TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<SyntheticSnapshotV1>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
    ): Promise<TResult> {
      return control.enqueueAuthoritative(
        operation,
        normalizeUnexpectedFault,
        prepareReplacementCommit === undefined
          ? undefined
          : () => {
              throw new Error("replacement callback failed");
            },
      );
    },
  });
}

interface FixtureOptionsV1 {
  readonly records?: HostAtomicRecordStoreV1;
  readonly ownerId?: SessionLeaseOwnerId;
  readonly leaseAcquisition?: "acquire_initial" | "deferred_rebootstrap";
  readonly initial?: SyntheticSnapshotV1;
  readonly provenance?: BuildProvenanceV1;
  readonly adoptionDeclaration?: PatchSetAdoptionDeclarationV1 | null;
  readonly initialLineage?: readonly SimulationAdoptionV1[];
  readonly failReplacementCommit?: boolean;
  decorateRepository?(
    repository: SaveRepositoryV1<SyntheticSaveRecordV1>,
    lease: SessionLeaseV1,
    records: HostAtomicRecordStoreV1,
  ): SaveRepositoryV1<SyntheticSaveRecordV1>;
  decorateLease?(lease: SessionLeaseV1, records: HostAtomicRecordStoreV1): SessionLeaseV1;
}

async function fixtureV1(options: FixtureOptionsV1 = {}) {
  const records = options.records ?? createMemoryHostRecordStoreV1();
  const provenance = options.provenance ?? provenanceV1();
  const created = createSessionV1(options.initial ?? snapshotV1(0));
  const lease = createSessionLeaseV1({
    records,
    storyId: storyIdV1,
    ownerId: options.ownerId ?? ownerIdV1,
    nextHandoffRequestId: () => "handoff.persistence-service-test" as never,
  });
  const baseRepository = createSaveRepositoryV1({ records, storyId: storyIdV1, codec: codecV1 });
  const repository = options.decorateRepository?.(baseRepository, lease, records) ?? baseRepository;
  const serviceLease = options.decorateLease?.(lease, records) ?? lease;
  const validation: SaveImportValidationContextV1<
    SyntheticStateV1,
    SyntheticSnapshotV1,
    SyntheticSaveRecordV1
  > = Object.freeze({
    codec: codecV1,
    classifyCompatibility(record: DeepReadonly<SyntheticSaveRecordV1>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclaration: options.adoptionDeclaration ?? null,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences(state: DeepReadonly<SyntheticStateV1>) {
      return state.referenceId === "reference.valid" ? Object.freeze([]) : ["reference.unknown"];
    },
    validateInvariants() {
      return Object.freeze([]);
    },
  });
  const metadataClock = Object.freeze({
    now: () => "2026-07-14T12:00:00.000Z" as IsoUtcInstant,
  });
  const service = await createPersistenceServiceV1({
    runtimeControl:
      options.failReplacementCommit === true
        ? failReplacementCommitV1(created.runtimeControl)
        : created.runtimeControl,
    repository,
    lease: serviceLease,
    validation,
    provenance,
    initialSimulationLineage: options.initialLineage ?? Object.freeze([]),
    metadataClock,
    exportFilename: "synthetic-save.json",
    ...(options.leaseAcquisition === undefined
      ? {}
      : { leaseAcquisition: options.leaseAcquisition }),
  });
  return Object.freeze({
    ...created,
    records,
    repository: baseRepository,
    lease,
    service,
  });
}

function createDelayedSaveStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let block = false;
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  let startedPromise = Promise.resolve();
  let gate = Promise.resolve();
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (block && mutations.some(({ namespace }) => namespace === "save")) {
        started?.();
        await gate;
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    blockSaveWrites() {
      block = true;
      startedPromise = new Promise<void>((resolve) => {
        started = resolve;
      });
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    waitUntilWriteStarts: () => startedPromise,
    releaseWrites() {
      block = false;
      release?.();
    },
  });
}

function createSemanticallyTamperingStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let tamperSaveReads = false;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    async read(...args: Parameters<HostAtomicRecordStoreV1["read"]>) {
      const stored = await memory.read(...args);
      if (!tamperSaveReads || args[0] !== "save" || stored === null) return stored;
      const parsed = JSON.parse(new TextDecoder().decode(stored.bytes)) as unknown;
      return Object.freeze({
        ...stored,
        bytes: textEncoderV1.encode(JSON.stringify(parsed, null, 2)),
      });
    },
    list: memory.list,
    async commit(...args: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      const result = await memory.commit(...args);
      if (
        result.kind === "committed" &&
        args[0].some((mutation) => mutation.namespace === "save")
      ) {
        tamperSaveReads = true;
      }
      return result;
    },
  });
  return records;
}

function unavailableStoreV1(): HostAtomicRecordStoreV1 {
  const failure = new Error("IndexedDB unavailable");
  Object.defineProperties(failure, {
    name: { value: "IndexedDbRecordStoreFailureV1" },
    code: { value: "indexeddb.unavailable" },
    operation: { value: "read" },
  });
  return Object.freeze({
    async read() {
      throw failure;
    },
    async list() {
      throw failure;
    },
    async commit() {
      throw failure;
    },
  });
}

function createSwitchableUnavailableStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let unavailable = false;
  const failV1 = (operation: "read" | "list" | "commit"): never => {
    const failure = new Error("IndexedDB quota exceeded");
    Object.defineProperties(failure, {
      name: { value: "IndexedDbRecordStoreFailureV1" },
      code: { value: "indexeddb.quota_exceeded" },
      operation: { value: operation },
    });
    throw failure;
  };
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read(...args: Parameters<HostAtomicRecordStoreV1["read"]>) {
      return unavailable ? failV1("read") : memory.read(...args);
    },
    list(...args: Parameters<HostAtomicRecordStoreV1["list"]>) {
      return unavailable ? failV1("list") : memory.list(...args);
    },
    commit(...args: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      return unavailable ? failV1("commit") : memory.commit(...args);
    },
  });
  return Object.freeze({
    records,
    becomeUnavailable() {
      unavailable = true;
    },
  });
}

async function ownedFenceV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  await fixture.lease.getStatus();
  const fence = fixture.lease.captureFence();
  if (fence === null) throw new TypeError("expected an owned lease");
  return fence;
}

async function saveRecordsV1(records: HostAtomicRecordStoreV1) {
  return (await records.list("save")).map((record) => ({
    key: record.key,
    revision: record.revision,
    bytes: [...record.bytes],
  }));
}

async function corruptAutoCurrentV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  const currentKey = createSaveSlotRecordKeyV1(storyIdV1, "auto.current");
  const current = await fixture.records.read("save", currentKey);
  if (current === null) throw new TypeError("missing Auto current");
  await fixture.records.commit([
    {
      kind: "put",
      namespace: "save",
      key: currentKey,
      expectedRevision: current.revision,
      bytes: textEncoderV1.encode("corrupt"),
    },
  ]);
}

describe("PersistenceServiceV1", () => {
  it("exposes a frozen current-lineage snapshot only on the internal service", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({ initialLineage });

    const observed = fixture.service.getSimulationLineage();
    expect(observed).toEqual(initialLineage);
    expect(observed).not.toBe(initialLineage);
    expect(Object.isFrozen(observed)).toBe(true);
    expect(fixture.service.port).not.toHaveProperty("getSimulationLineage");

    fixture.service.establishAnchor(snapshotV1(3), Object.freeze([]));
    expect(fixture.service.getSimulationLineage()).toEqual([]);
    expect(observed).toEqual(initialLineage);
  });

  it("disposes in-flight Auto state before exact-fence release and transfers once", async () => {
    const delayed = createDelayedSaveStoreV1();
    let releaseFenceCalls = 0;
    const fixture = await fixtureV1({
      records: delayed.records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async releaseFence(fence: Parameters<SessionLeaseV1["releaseFence"]>[0]) {
            releaseFenceCalls += 1;
            return lease.releaseFence(fence);
          },
        });
      },
    });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const queuedSave = fixture.service.port.save("quick");
    await fixture.session.dispatch({ kind: "increment" });
    const firstDisposal = fixture.service.disposeForRebootstrap();
    const repeatedDisposal = fixture.service.disposeForRebootstrap();
    let disposed = false;
    void firstDisposal.then(() => {
      disposed = true;
    });
    await Promise.resolve();
    expect(disposed).toBe(false);
    await expect(fixture.lease.getStatus()).resolves.toMatchObject({
      kind: "owned",
      fencingToken: 1,
    });

    delayed.releaseWrites();
    const disposition = await firstDisposal;
    await expect(queuedSave).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(repeatedDisposal).resolves.toBe(disposition);
    expect(releaseFenceCalls).toBe(1);
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 2 } },
    });
    await expect(fixture.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });

    const replacement = await fixtureV1({
      records: delayed.records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    const takeover = await replacement.service.takeOverForRebootstrap(disposition);
    expect(takeover).toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-replacement",
        fencingToken: 2,
      },
    });
    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toBe(takeover);
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    for (const operation of [
      fixture.service.port.save("quick"),
      fixture.service.port.clear("quick"),
      fixture.service.port.load("quick"),
      fixture.service.port.importSave(
        encodeSaveRecordV1(recordV1({ snapshot: snapshotV1(9) }), codecV1),
      ),
    ]) {
      await expect(operation).resolves.toEqual({
        kind: "faulted",
        code: "runtime_disposed",
      });
    }
    await expect(fixture.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fixture.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("drains an in-flight public takeover and exact-releases its newly acquired fence", async () => {
    let releaseTakeover: (() => void) | undefined;
    let markTakeoverStarted: (() => void) | undefined;
    const takeoverGate = new Promise<void>((resolve) => {
      releaseTakeover = resolve;
    });
    const takeoverStarted = new Promise<void>((resolve) => {
      markTakeoverStarted = resolve;
    });
    let takeoverCalls = 0;
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOver() {
            takeoverCalls += 1;
            markTakeoverStarted?.();
            await takeoverGate;
            return lease.takeOver();
          },
        });
      },
    });
    await expect(oldRuntime.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });

    const takeover = oldRuntime.service.port.lease.takeOver();
    await takeoverStarted;
    const disposal = oldRuntime.service.disposeForRebootstrap();
    await expect(oldRuntime.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    expect(takeoverCalls).toBe(1);
    releaseTakeover?.();

    await expect(takeover).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned", fencingToken: 2 },
    });
    const disposition = await resolveWithinV1(disposal);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 2 },
    });
    await expect(oldRuntime.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 2,
    });

    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-successor" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
    });
    await expect(successor.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-successor",
        fencingToken: 3,
      },
    });
  });

  it("drains an in-flight public release and preserves its strict successor fence", async () => {
    let releaseResult: (() => void) | undefined;
    let markReleaseCommitted: (() => void) | undefined;
    const releaseResultGate = new Promise<void>((resolve) => {
      releaseResult = resolve;
    });
    const releaseCommitted = new Promise<void>((resolve) => {
      markReleaseCommitted = resolve;
    });
    let releaseCalls = 0;
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async release() {
            releaseCalls += 1;
            const result = await lease.release();
            markReleaseCommitted?.();
            await releaseResultGate;
            return result;
          },
        });
      },
    });

    const release = oldRuntime.service.port.lease.release();
    await releaseCommitted;
    const disposal = oldRuntime.service.disposeForRebootstrap();
    await expect(oldRuntime.service.port.lease.release()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    expect(releaseCalls).toBe(1);
    releaseResult?.();

    await expect(release).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });
    const disposition = await resolveWithinV1(disposal);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(oldRuntime.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });

    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-successor" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
    });
    await expect(successor.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-successor",
        fencingToken: 2,
      },
    });
  });

  it("finishes disposal after a rejected stale-write repair instead of waiting for future work", async () => {
    let releaseFirstWrite: (() => void) | undefined;
    let markFirstWriteStarted: (() => void) | undefined;
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    let autoWriteCalls = 0;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async writeAuto(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>
          ) {
            autoWriteCalls += 1;
            if (autoWriteCalls === 1) {
              markFirstWriteStarted?.();
              await firstWriteGate;
              return repository.writeAuto(...arguments_);
            }
            return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
          },
        });
      },
    });
    await fixture.session.dispatch({ kind: "increment" });
    await firstWriteStarted;

    const disposal = fixture.service.disposeForRebootstrap();
    releaseFirstWrite?.();
    const disposition = await resolveWithinV1(disposal);

    expect(autoWriteCalls).toBe(2);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(disposal).resolves.toBe(disposition);
  });

  it("keeps both runtimes read-only with stable release failure and skips takeover", async () => {
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async releaseFence() {
            return Object.freeze({ kind: "rejected" as const, code: "unavailable" as const });
          },
        });
      },
    });
    const disposition = await oldRuntime.service.disposeForRebootstrap();
    expect(disposition).toEqual({
      ownership: "read_only",
      code: "lease_release_failed",
      fence: null,
    });
    await expect(oldRuntime.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(oldRuntime.service.port.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(oldRuntime.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });

    let takeoverCalls = 0;
    const replacement = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOverUnowned(
            expectedFencingToken: Parameters<SessionLeaseV1["takeOverUnowned"]>[0],
          ) {
            takeoverCalls += 1;
            return lease.takeOverUnowned(expectedFencingToken);
          },
        });
      },
    });
    const takeover = await replacement.service.takeOverForRebootstrap(disposition);
    expect(takeover).toEqual({
      ownership: "read_only",
      code: "lease_release_failed",
      fence: null,
    });
    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toBe(takeover);
    expect(takeoverCalls).toBe(0);
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(replacement.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(replacement.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("reports a stable takeover failure after a successful release", async () => {
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({ records });
    const disposition = await oldRuntime.service.disposeForRebootstrap();
    const replacement = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOverUnowned() {
            return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
          },
        });
      },
    });

    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "read_only",
      code: "lease_takeover_failed",
      fence: null,
    });
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await replacement.session.dispatch({ kind: "increment" });
    await replacement.service.autoSaveIdle();
    expect(replacement.session.getCurrentSnapshot().state.count).toBe(1);
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it.each(["load", "import"] as const)(
    "maps HMR-invalidated %s to runtime_disposed without replacing the Snapshot",
    async (operation) => {
      const fixture = await fixtureV1({ initial: snapshotV1(4) });
      const snapshot = fixture.session.getCurrentSnapshot();
      fixture.invalidationController.invalidateForHmr();

      const result =
        operation === "load"
          ? fixture.service.port.load("quick")
          : fixture.service.port.importSave(
              encodeSaveRecordV1(recordV1({ snapshot: snapshotV1(9) }), codecV1),
            );
      await expect(result).resolves.toEqual({
        kind: "faulted",
        code: "runtime_disposed",
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(snapshot);
    },
  );

  it("captures Quick at accepted call time and does not make dispatch wait for storage", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records, initial: snapshotV1(3) });
    delayed.blockSaveWrites();

    const save = fixture.service.port.save("quick");
    const dispatch = fixture.session.dispatch({ kind: "increment" });
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    delayed.releaseWrites();

    await expect(save).resolves.toEqual({ kind: "saved", slotId: "quick" });
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "valid",
      record: { slot: { capturedCommandSequence: 3 }, snapshot: { commandSequence: 3 } },
    });
    await fixture.service.autoSaveIdle();
  });

  it("does not let an accepted Quick Save borrow a later lease fence", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const quick = fixture.service.port.save("quick");
    await expect(fixture.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });
    await expect(fixture.service.port.lease.takeOver()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned", fencingToken: 2 },
    });

    delayed.releaseWrites();
    await expect(quick).resolves.toEqual({ kind: "rejected", code: "conflict" });
    await fixture.service.autoSaveIdle();
  });

  it("does not publish an old Quick result as safely saved after a new anchor", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records, initial: snapshotV1(3) });
    delayed.blockSaveWrites();

    const quick = fixture.service.port.save("quick");
    await delayed.waitUntilWriteStarts();
    const replacement = recordV1({ snapshot: snapshotV1(9) });
    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toEqual({ kind: "imported", compatibility: "exact", commandSequence: 9 });

    delayed.releaseWrites();
    await expect(quick).resolves.toEqual({ kind: "saved", slotId: "quick" });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(9);
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 3 } },
    });
  });

  it("does not report saved after the committed record loses its lease fence", async () => {
    let contender: SessionLeaseV1 | undefined;
    const fixture = await fixtureV1({
      decorateRepository(repository, _lease, records) {
        contender = createSessionLeaseV1({
          records,
          storyId: storyIdV1,
          ownerId: "owner.contender" as SessionLeaseOwnerId,
          nextHandoffRequestId: () => "handoff.contender" as never,
        });
        return Object.freeze({
          ...repository,
          async writeQuick(
            record: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeQuick"]>[0],
            fence: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeQuick"]>[1],
          ) {
            const result = await repository.writeQuick(record, fence);
            if (result.kind === "saved") await contender?.takeOver();
            return result;
          },
        });
      },
    });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
  });

  it("preserves degraded storage identity when Save verification becomes unavailable", async () => {
    let unavailable = false;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async read(slotId: Parameters<typeof repository.read>[0]) {
            if (unavailable) {
              return Object.freeze({
                health: "unavailable" as const,
                slotId,
                hostRevision: null,
                record: null,
                code: "indexeddb.quota_exceeded",
              });
            }
            return repository.read(slotId);
          },
          async writeQuick(
            record: Parameters<typeof repository.writeQuick>[0],
            fence: Parameters<typeof repository.writeQuick>[1],
          ) {
            const result = await repository.writeQuick(record, fence);
            unavailable = true;
            return result;
          },
        });
      },
    });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: true,
      safelySavedCommandSequence: null,
      lastFailureCode: "indexeddb.quota_exceeded",
    });
  });

  it("detects semantically equivalent physical-byte changes after a Save commit", async () => {
    const fixture = await fixtureV1({ records: createSemanticallyTamperingStoreV1() });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    const stored = await fixture.repository.read("quick");
    if (stored.health !== "valid") throw new TypeError("expected a valid tampered Save");
    expect(stored.bytes).not.toEqual(encodeSaveRecordV1(stored.record, codecV1));
    await expect(fixture.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
      slotId: "quick",
      file: { bytes: stored.bytes },
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
  });

  it("marks a valid previous Auto slot as recovery-only when current is corrupt", async () => {
    const fixture = await fixtureV1();
    const fence = await ownedFenceV1(fixture);
    await fixture.repository.writeAuto(recordV1({ snapshot: snapshotV1(1) }), fence);
    await fixture.repository.writeAuto(recordV1({ snapshot: snapshotV1(2) }), fence);
    await corruptAutoCurrentV1(fixture);

    const summaries = await fixture.service.port.listSlots();
    expect(summaries.map(({ slotId }) => slotId)).toEqual([
      "auto.current",
      "auto.previous",
      "quick",
      "manual",
    ]);
    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.current", health: "invalid" }),
        expect.objectContaining({ slotId: "auto.previous", health: "recovery_candidate" }),
      ]),
    );
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(0);
  });

  it("offers Auto recovery only from a fully runnable previous Save", async () => {
    const currentProvenance = provenanceV1();
    const inspectFixture = await fixtureV1({ provenance: currentProvenance });
    const inspectFence = await ownedFenceV1(inspectFixture);
    await inspectFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(1),
        provenance: provenanceV1({ engine: "engine.other" }),
      }),
      inspectFence,
    );
    await inspectFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(2), provenance: currentProvenance }),
      inspectFence,
    );
    await corruptAutoCurrentV1(inspectFixture);

    await expect(inspectFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.previous", health: "valid" }),
      ]),
    );

    const runnableFixture = await fixtureV1({ provenance: currentProvenance });
    const runnableFence = await ownedFenceV1(runnableFixture);
    await runnableFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(3), provenance: currentProvenance }),
      runnableFence,
    );
    await runnableFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(4),
        provenance: provenanceV1({ engine: "engine.other" }),
      }),
      runnableFence,
    );

    await expect(runnableFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.current", health: "valid" }),
        expect.objectContaining({ slotId: "auto.previous", health: "recovery_candidate" }),
      ]),
    );

    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const adoptedCurrent = provenanceV1({ simulation: "simulation.new", patch: "new" });
    const lineageFixture = await fixtureV1({
      provenance: adoptedCurrent,
      adoptionDeclaration: adoptionDeclarationV1(stored, adoptedCurrent),
    });
    const lineageFence = await ownedFenceV1(lineageFixture);
    await lineageFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(16),
        provenance: stored,
        lineage: lineageV1(16, stored.resolved.simulationDigest),
      }),
      lineageFence,
    );
    await lineageFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(17), provenance: adoptedCurrent }),
      lineageFence,
    );
    await corruptAutoCurrentV1(lineageFixture);

    await expect(lineageFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "auto.previous",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
      ]),
    );

    const limitedCurrentFixture = await fixtureV1({
      provenance: adoptedCurrent,
      adoptionDeclaration: adoptionDeclarationV1(stored, adoptedCurrent),
    });
    const limitedCurrentFence = await ownedFenceV1(limitedCurrentFixture);
    await limitedCurrentFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(18), provenance: adoptedCurrent }),
      limitedCurrentFence,
    );
    await limitedCurrentFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(16),
        provenance: stored,
        lineage: lineageV1(16, stored.resolved.simulationDigest),
      }),
      limitedCurrentFence,
    );

    await expect(limitedCurrentFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "auto.current",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
        expect.objectContaining({
          slotId: "auto.previous",
          health: "recovery_candidate",
        }),
      ]),
    );
  });

  it("repairs a stale in-flight Auto write after an authoritative anchor", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const anchorSnapshot = snapshotV1(0);
    await expect(
      fixture.runtimeControl.enqueueAuthoritative<
        { readonly kind: "anchored" } | { readonly kind: "faulted" }
      >(
        async () => {
          return Object.freeze({
            kind: "replace" as const,
            snapshot: anchorSnapshot,
            result: Object.freeze({ kind: "anchored" as const }),
            anchor: "replace_replay_base" as const,
          });
        },
        () => Object.freeze({ kind: "faulted" as const }),
        (snapshot) => fixture.service.establishAnchor(snapshot, Object.freeze([])),
      ),
    ).resolves.toEqual({ kind: "anchored" });

    delayed.releaseWrites();
    await fixture.service.autoSaveIdle();
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 0 } },
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      busy: false,
      safelySavedCommandSequence: 0,
    });
  });

  it("stays busy until a rejected anchor repair is superseded successfully", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const replacement = recordV1({ snapshot: snapshotV1(9) });
    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toMatchObject({ kind: "imported", commandSequence: 9 });
    await fixture.service.port.lease.release();
    await fixture.service.port.lease.takeOver();
    delayed.releaseWrites();

    let status = await fixture.service.port.getStatus();
    for (let attempt = 0; attempt < 20 && status.lastFailureCode !== "conflict"; attempt += 1) {
      await Promise.resolve();
      status = await fixture.service.port.getStatus();
    }
    expect(status).toMatchObject({ busy: true, lastFailureCode: "conflict" });
    let idle = false;
    const idlePromise = fixture.service.autoSaveIdle().then(() => {
      idle = true;
    });
    await Promise.resolve();
    expect(idle).toBe(false);

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await idlePromise;
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      busy: false,
      safelySavedCommandSequence: 10,
      lastFailureCode: null,
    });
  });

  it("loads an exact Save with its integrity and lineage without rewriting the slot", async () => {
    const fixture = await fixtureV1();
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const replayBaseBefore = fixture.commandLog.replayBase();
    expect(fixture.commandLog.entries()).toHaveLength(1);
    const loadedIntegrity = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 7,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.loaded", sequence: 7 }],
    });
    const lineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const saved = recordV1({ snapshot: snapshotV1(7, loadedIntegrity), lineage });
    await fixture.repository.writeQuick(saved, await ownedFenceV1(fixture));
    const before = await saveRecordsV1(fixture.records);

    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "loaded",
      compatibility: "exact",
      commandSequence: 7,
    });
    const loaded = fixture.session.getCurrentSnapshot();
    expect(loaded).toEqual(saved.snapshot);
    expect(loaded.integrity).toEqual(loadedIntegrity);
    expect(fixture.commandLog.entries()).toEqual([]);
    expect(fixture.commandLog.replayBase()).toBe(loaded);
    expect(fixture.commandLog.replayBase()).not.toBe(replayBaseBefore);
    expect(fixture.commandLog.replayBaseStateDigest()).toBe(
      digestCanonical("sillymaker:state:v1", loaded),
    );
    expect(fixture.service.getSimulationLineage()).toEqual(lineage);
    expect(Object.isFrozen(fixture.service.getSimulationLineage())).toBe(true);
    expect(await saveRecordsV1(fixture.records)).toEqual(before);
    const exported = await fixture.service.port.exportCurrentSave();
    const decoded = decodeSaveRecordV1(exported.bytes, codecV1);
    expect(decoded).toMatchObject({ kind: "decoded", record: { simulationLineage: lineage } });
  });

  it("imports an adopted Save using current provenance, appends lineage, and writes no slot", async () => {
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({ simulation: "simulation.new", patch: "new" });
    const modified = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 5,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.modified", sequence: 5 }],
    });
    const candidate = recordV1({ snapshot: snapshotV1(5, modified), provenance: stored });
    const fixture = await fixtureV1({
      provenance: current,
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
    });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const replayBaseBefore = fixture.commandLog.replayBase();
    expect(fixture.commandLog.entries()).toHaveLength(1);
    const before = await saveRecordsV1(fixture.records);

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(candidate, codecV1)),
    ).resolves.toEqual({ kind: "imported", compatibility: "adopted", commandSequence: 5 });
    const adopted = fixture.session.getCurrentSnapshot();
    expect(adopted.integrity).toEqual(modified);
    expect(fixture.commandLog.entries()).toEqual([]);
    expect(fixture.commandLog.replayBase()).toBe(adopted);
    expect(fixture.commandLog.replayBase()).not.toBe(replayBaseBefore);
    expect(fixture.commandLog.replayBaseStateDigest()).toBe(
      digestCanonical("sillymaker:state:v1", adopted),
    );
    expect(await saveRecordsV1(fixture.records)).toEqual(before);

    expect(fixture.service.getSimulationLineage()).toEqual([
      {
        fromSimulationDigest: stored.resolved.simulationDigest,
        toSimulationDigest: current.resolved.simulationDigest,
        viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
        adoptedAtCommandSequence: 5,
      },
    ]);

    const decoded = decodeSaveRecordV1(
      (await fixture.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(decoded).toMatchObject({
      kind: "decoded",
      record: {
        provenance: current,
        slot: { slotId: "manual", capturedCommandSequence: 5 },
        simulationLineage: [
          {
            fromSimulationDigest: stored.resolved.simulationDigest,
            toSimulationDigest: current.resolved.simulationDigest,
            viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
            adoptedAtCommandSequence: 5,
          },
        ],
      },
    });
  });

  it("keeps Session and storage unchanged for inspect-only, invalid, and lineage-limit imports", async () => {
    const inspectFixture = await fixtureV1();
    await expect(inspectFixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await inspectFixture.service.autoSaveIdle();
    const inspectRecord = recordV1({
      snapshot: snapshotV1(4),
      provenance: provenanceV1({ engine: "engine.other" }),
    });
    const inspectSnapshot = inspectFixture.session.getCurrentSnapshot();
    const inspectReplayBase = inspectFixture.commandLog.replayBase();
    const inspectEntries = inspectFixture.commandLog.entries();
    const inspectLineage = inspectFixture.service.getSimulationLineage();
    expect(inspectEntries).toHaveLength(1);
    const inspectStorage = await saveRecordsV1(inspectFixture.records);
    await expect(
      inspectFixture.service.port.importSave(encodeSaveRecordV1(inspectRecord, codecV1)),
    ).resolves.toEqual({ kind: "rejected", code: "incompatible" });
    expect(inspectFixture.session.getCurrentSnapshot()).toBe(inspectSnapshot);
    expect(inspectFixture.commandLog.replayBase()).toBe(inspectReplayBase);
    expect(inspectFixture.commandLog.entries()).toBe(inspectEntries);
    expect(inspectFixture.service.getSimulationLineage()).toBe(inspectLineage);
    expect(await saveRecordsV1(inspectFixture.records)).toEqual(inspectStorage);

    const invalidSnapshot = inspectFixture.session.getCurrentSnapshot();
    await expect(
      inspectFixture.service.port.importSave(textEncoderV1.encode("not-json")),
    ).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(inspectFixture.session.getCurrentSnapshot()).toBe(invalidSnapshot);
    expect(inspectFixture.commandLog.replayBase()).toBe(inspectReplayBase);
    expect(inspectFixture.commandLog.entries()).toBe(inspectEntries);
    expect(await saveRecordsV1(inspectFixture.records)).toEqual(inspectStorage);

    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({ simulation: "simulation.new", patch: "new" });
    const limitFixture = await fixtureV1({
      provenance: current,
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
    });
    await expect(limitFixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await limitFixture.service.autoSaveIdle();
    const limited = recordV1({
      snapshot: snapshotV1(16),
      provenance: stored,
      lineage: lineageV1(16, stored.resolved.simulationDigest),
    });
    const limitSnapshot = limitFixture.session.getCurrentSnapshot();
    const limitReplayBase = limitFixture.commandLog.replayBase();
    const limitEntries = limitFixture.commandLog.entries();
    expect(limitEntries).toHaveLength(1);
    const limitStorage = await saveRecordsV1(limitFixture.records);
    await expect(
      limitFixture.service.port.importSave(encodeSaveRecordV1(limited, codecV1)),
    ).resolves.toEqual({ kind: "rejected", code: "lineage_limit" });
    expect(limitFixture.session.getCurrentSnapshot()).toBe(limitSnapshot);
    expect(limitFixture.commandLog.replayBase()).toBe(limitReplayBase);
    expect(limitFixture.commandLog.entries()).toBe(limitEntries);
    expect(await saveRecordsV1(limitFixture.records)).toEqual(limitStorage);
  });

  it("preserves the CommandLog anchor when persistence cannot read a requested slot", async () => {
    const switchable = createSwitchableUnavailableStoreV1();
    const fixture = await fixtureV1({ records: switchable.records });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    expect(entriesBefore).toHaveLength(1);

    switchable.becomeUnavailable();
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });

    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
  });

  it("preserves the CommandLog anchor when the replacement callback fails", async () => {
    const fixture = await fixtureV1({ failReplacementCommit: true });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    expect(entriesBefore).toHaveLength(1);
    const replacement = recordV1({ snapshot: snapshotV1(9) });

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toEqual({ kind: "faulted", code: "persistence.unexpected" });

    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
  });

  it("keeps a lineage-limited physical Save available for inspection and export", async () => {
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({ simulation: "simulation.new", patch: "new" });
    const fixture = await fixtureV1({
      provenance: current,
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
    });
    const limited = recordV1({
      snapshot: snapshotV1(16),
      provenance: stored,
      lineage: lineageV1(16, stored.resolved.simulationDigest),
    });
    await fixture.repository.writeManual(limited, await ownedFenceV1(fixture));

    await expect(fixture.service.port.load("manual")).resolves.toEqual({
      kind: "rejected",
      code: "lineage_limit",
    });
    await expect(fixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "manual",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
      ]),
    );
    await expect(fixture.service.port.exportSave("manual")).resolves.toMatchObject({
      kind: "exported",
      slotId: "manual",
      file: { mediaType: "application/json" },
    });
  });

  it("exports the accepted current Snapshot without storage or capability state", async () => {
    const capabilitySentinel = Object.freeze({
      debugTools: true,
      marker: "CAPABILITY_SENTINEL_MUST_NOT_ENTER_SAVE",
    });
    const fixture = await fixtureV1({ records: unavailableStoreV1(), initial: snapshotV1(6) });

    await expect(fixture.service.port.save("manual")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    const exported = await fixture.service.port.exportCurrentSave();
    expect(exported.digest).toBe(digestBytes(exported.bytes));
    expect(new TextDecoder().decode(exported.bytes)).not.toContain(capabilitySentinel.marker);
    expect(decodeSaveRecordV1(exported.bytes, codecV1)).toMatchObject({
      kind: "decoded",
      record: { snapshot: { commandSequence: 6 }, slot: { slotId: "manual" } },
    });
  });

  it("records an exact degraded code after a healthy store becomes unavailable", async () => {
    const switchable = createSwitchableUnavailableStoreV1();
    const fixture = await fixtureV1({ records: switchable.records, initial: snapshotV1(6) });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    switchable.becomeUnavailable();
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "quick",
          health: "unavailable",
          warningCodes: ["indexeddb.quota_exceeded"],
        }),
      ]),
    );
    await expect(fixture.service.port.exportSave("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: false,
      safelySavedCommandSequence: 6,
      lastFailureCode: "indexeddb.quota_exceeded",
    });
    await expect(fixture.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("does not retain an available status when fresh lease observation throws", async () => {
    const fixture = await fixtureV1({
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async getStatus() {
            throw new Error("unexpected lease read failure");
          },
        });
      },
    });

    await expect(fixture.service.port.lease.getStatus()).resolves.toMatchObject({
      kind: "unavailable",
      code: "persistence.unexpected",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: false,
      lastFailureCode: "persistence.unexpected",
    });
  });

  it("returns stable export and clear results without changing Session", async () => {
    const fixture = await fixtureV1({ initial: snapshotV1(2) });
    const snapshot = fixture.session.getCurrentSnapshot();
    await expect(fixture.service.port.exportSave("quick")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(fixture.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
      slotId: "quick",
      file: { mediaType: "application/json" },
    });
    await expect(fixture.service.port.clear("quick")).resolves.toEqual({
      kind: "cleared",
      slotId: "quick",
    });
    await expect(fixture.service.port.clear("quick")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
    expect(fixture.session.getCurrentSnapshot()).toBe(snapshot);
  });

  it.each(["load", "import"] as const)(
    "orders same-tick dispatch and %s on the one GameSession FIFO",
    async (operation) => {
      const dispatchFirst = await fixtureV1();
      const candidate = recordV1({ snapshot: snapshotV1(9) });
      if (operation === "load") {
        await dispatchFirst.repository.writeQuick(candidate, await ownedFenceV1(dispatchFirst));
      }
      const firstDispatch = dispatchFirst.session.dispatch({ kind: "increment" });
      const firstReplacement =
        operation === "load"
          ? dispatchFirst.service.port.load("quick")
          : dispatchFirst.service.port.importSave(encodeSaveRecordV1(candidate, codecV1));
      await firstDispatch;
      await expect(firstReplacement).resolves.toMatchObject({ compatibility: "exact" });
      expect(dispatchFirst.session.getCurrentSnapshot().commandSequence).toBe(9);

      const replacementFirst = await fixtureV1();
      if (operation === "load") {
        await replacementFirst.repository.writeQuick(
          candidate,
          await ownedFenceV1(replacementFirst),
        );
      }
      const secondReplacement =
        operation === "load"
          ? replacementFirst.service.port.load("quick")
          : replacementFirst.service.port.importSave(encodeSaveRecordV1(candidate, codecV1));
      const secondDispatch = replacementFirst.session.dispatch({ kind: "increment" });
      await expect(secondReplacement).resolves.toMatchObject({ compatibility: "exact" });
      await secondDispatch;
      expect(replacementFirst.session.getCurrentSnapshot().commandSequence).toBe(10);
      await Promise.all([
        dispatchFirst.service.autoSaveIdle(),
        replacementFirst.service.autoSaveIdle(),
      ]);
    },
  );
});
