// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSnapshotEnvelopeSchemaV1,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  IsoUtcInstant,
  LeaseHandoffRequestId,
  RngDrawTraceV1,
  RngStateV1,
  SessionLeaseOwnerId,
} from "@sillymaker/base";
import {
  createGameSessionV1,
  createPersistenceServiceV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  FinalizedCommandAttemptV1,
  ReplayCommandLogEntryV1,
  ReplayDriverV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
} from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
  resolveStoryForTestV1,
} from "@sillymaker/base/testkit";
import { describe, expect, it } from "vitest";

import {
  e2eChoiceDeltaResolverModuleIdV1,
  e2eCounterModuleIdV1,
  e2eFlowModuleIdV1,
  e2eRunModuleIdV1,
} from "../gameplay/contracts/index.js";
import type {
  E2eDebugCommandV1,
  E2eGameCommandV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eGameplayFaultV1,
  E2eRejectionReasonV1,
} from "../gameplay/contracts/index.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

type E2eFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type E2eGameLoggedCommandV1 = ReplayLoggedCommandV1<"game", E2eGameCommandV1>;
type E2eReplayLoggedCommandV1 =
  E2eGameLoggedCommandV1 | ReplayLoggedCommandV1<"debug", E2eDebugCommandV1>;

type E2eGameReplayEntryV1 = ReplayCommandLogEntryV1<
  E2eGameLoggedCommandV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type E2eReplayInputV1 = ReplayInputV1<
  E2eGameSnapshotV1,
  E2eReplayLoggedCommandV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type E2eReplayDriverV1 = ReplayDriverV1<
  E2eGameSnapshotV1,
  E2eReplayLoggedCommandV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

function createE2eSessionCompositionV1(
  gameSimulation: E2eResolvedGameV1["gameSimulation"],
  initialSnapshot: E2eGameSnapshotV1,
  onAttempt?: (attempt: E2eFinalizedAttemptV1) => void,
) {
  return createGameSessionV1<E2eGameSimulationTypesV1>({
    initialSnapshot,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return gameSimulation.commandExecutor.executeAttempt(
        snapshot,
        Object.freeze({ kind: "e2e.test.fault" }),
        undefined,
      );
    },
    ...(onAttempt === undefined ? {} : { onAttempt }),
  });
}

function createE2eReplayDriverV1(
  gameSimulation: E2eResolvedGameV1["gameSimulation"],
  replayBase: DeepReadonly<E2eGameSnapshotV1>,
): E2eReplayDriverV1 {
  let capturedAttempt: E2eFinalizedAttemptV1 | null = null;
  const isolated = createE2eSessionCompositionV1(
    gameSimulation,
    replayBase as E2eGameSnapshotV1,
    (attempt) => {
      capturedAttempt = attempt;
    },
  );

  return Object.freeze({
    getCurrentSnapshot: isolated.session.getCurrentSnapshot,
    async submit(loggedCommand: DeepReadonly<E2eReplayLoggedCommandV1>) {
      if (loggedCommand.source === "debug") {
        throw new TypeError("E2E replay does not admit DebugCommand entries in Task 7");
      }

      capturedAttempt = null;
      const result = await isolated.session.dispatch(loggedCommand.command);
      const finalizedAttempt = capturedAttempt;
      if (result.kind !== "executed" || finalizedAttempt === null) {
        throw new TypeError("E2E replay did not capture a finalized GameCommand attempt");
      }
      return finalizedAttempt;
    },
  });
}

function createReplayInputV1(
  resolved: E2eResolvedGameV1,
  replayBase: DeepReadonly<E2eGameSnapshotV1>,
  replayBaseStateDigest: E2eReplayInputV1["replayBaseStateDigest"],
  commandLog: E2eReplayInputV1["commandLog"],
  currentSnapshot: DeepReadonly<E2eGameSnapshotV1>,
): E2eReplayInputV1 {
  return Object.freeze({
    recordedIdentity: Object.freeze({ provenance: resolved.provenance }),
    runtimeIdentity: Object.freeze({ provenance: resolved.provenance }),
    replayBase,
    replayBaseStateDigest,
    commandLog,
    currentSnapshot,
    currentStateDigest: digestCanonical("sillymaker:state:v1", currentSnapshot),
    projectStableRejection(rejection: DeepReadonly<E2eRejectionReasonV1>) {
      return Object.freeze({ code: rejection.code });
    },
    projectStableFault(fault: DeepReadonly<E2eGameplayFaultV1>) {
      return Object.freeze({ code: fault.code });
    },
    createDriver(base: DeepReadonly<E2eGameSnapshotV1>) {
      return createE2eReplayDriverV1(resolved.gameSimulation, base);
    },
  });
}

function mutateRetainedCounterFactV1(entries: readonly DeepReadonly<E2eGameReplayEntryV1>[]): {
  readonly entries: readonly DeepReadonly<E2eGameReplayEntryV1>[];
  readonly logOrdinal: E2eGameReplayEntryV1["logOrdinal"];
} {
  const index = entries.findIndex(
    (entry) =>
      entry.outcome.kind === "committed" &&
      entry.outcome.facts.some((fact) => fact.kind === "counter.changed"),
  );
  const entry = entries[index];
  if (entry === undefined || entry.outcome.kind !== "committed") {
    throw new TypeError("missing retained committed counter entry");
  }

  let changed = false;
  const facts = Object.freeze(
    entry.outcome.facts.map((fact) => {
      if (changed || fact.kind !== "counter.changed") return fact;
      changed = true;
      return Object.freeze({
        ...fact,
        after: parseNonNegativeSafeInteger(fact.after + 1),
      });
    }),
  );
  if (!changed) throw new TypeError("missing retained counter Fact");

  const mutatedEntry: DeepReadonly<E2eGameReplayEntryV1> = Object.freeze({
    ...entry,
    outcome: Object.freeze({ kind: "committed" as const, facts }),
  });
  return Object.freeze({
    entries: Object.freeze([...entries.slice(0, index), mutatedEntry, ...entries.slice(index + 1)]),
    logOrdinal: entry.logOrdinal,
  });
}

describe("E2E authoritative replay", () => {
  it("replays the retained 200-entry canonical GameSimulation log without touching live state or persistence", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const gameSimulation = resolved.gameSimulation;
    const bootstrap = gameSimulation.createBootstrapInput(
      createFixedBootstrapEntropyV1({ uuids: [], seeds: [0x0002_3049] }),
    );
    const initialSnapshot = createE2eInitialSnapshotV1(gameSimulation, bootstrap);
    const source = createE2eSessionCompositionV1(gameSimulation, initialSnapshot);

    expect(gameSimulation.modules.map((module) => module.descriptor.id)).toEqual([
      e2eCounterModuleIdV1,
      e2eFlowModuleIdV1,
      e2eRunModuleIdV1,
      e2eChoiceDeltaResolverModuleIdV1,
    ]);
    expect(initialSnapshot.state).toEqual({
      simulation: {
        counter: { value: 0 },
        flow: { status: "idle", branch: null, nodeId: "intro" },
        run: { status: "active" },
      },
    });

    const records = createMemoryHostRecordStoreV1();
    const persistence = await createPersistenceServiceV1({
      runtimeControl: source.runtimeControl,
      records,
      snapshotSchema: createGameSnapshotEnvelopeSchemaV1(
        gameSimulation.stateSchema,
        rngStateV1Schema,
      ),
      provenance: resolved.provenance,
      adoptionDeclaration: null,
      ownerId: "owner.e2e-replay" as SessionLeaseOwnerId,
      nextHandoffRequestId: () => "request.e2e-replay" as LeaseHandoffRequestId,
      validateReferences: () => Object.freeze([]),
      validateInvariants: () => Object.freeze([]),
      initialSimulationLineage: Object.freeze([]),
      metadataClock: Object.freeze({
        now: () => "2026-07-14T00:00:00.000Z" as IsoUtcInstant,
      }),
      exportFilename: "e2e-replay-save.json",
    });

    const first = await source.session.dispatch(
      Object.freeze({ kind: "e2e.counter.roll", maximum: parsePositiveSafeInteger(6) }),
    );
    expect(first.kind).toBe("executed");
    if (first.kind !== "executed" || first.execution.kind !== "committed") {
      throw new TypeError("first E2E replay source command did not commit");
    }
    const afterFirstCommit = source.session.getCurrentSnapshot();

    for (let ordinal = 2; ordinal <= 199; ordinal += 1) {
      const rejected = await source.session.dispatch(Object.freeze({ kind: "e2e.test.reject" }));
      expect(rejected).toEqual({
        kind: "executed",
        execution: {
          kind: "rejected",
          snapshot: afterFirstCommit,
          reasons: [{ code: "test.rejected" }],
        },
      });
    }

    const secondCommit = await source.session.dispatch(
      Object.freeze({ kind: "e2e.counter.roll", maximum: parsePositiveSafeInteger(6) }),
    );
    expect(secondCommit.kind).toBe("executed");
    if (secondCommit.kind !== "executed" || secondCommit.execution.kind !== "committed") {
      throw new TypeError("retained E2E replay source command did not commit");
    }

    await persistence.autoSaveIdle();
    await expect(persistence.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    const finalFault = await source.session.dispatch(Object.freeze({ kind: "e2e.test.fault" }));
    expect(finalFault).toEqual({
      kind: "executed",
      execution: {
        kind: "faulted",
        snapshot: source.session.getCurrentSnapshot(),
        fault: { code: "e2e.test.fault" },
      },
    });
    expect(source.session.getStatus()).toBe("fault_paused");

    const sourceEntries: readonly DeepReadonly<E2eGameReplayEntryV1>[] =
      source.commandLog.entries();
    expect(sourceEntries).toHaveLength(200);
    expect(sourceEntries[0]?.logOrdinal).toBe(2);
    expect(sourceEntries.at(-1)?.logOrdinal).toBe(201);
    expect(sourceEntries.map(({ outcome }) => outcome.kind)).toEqual([
      ...Array.from({ length: 198 }, () => "rejected" as const),
      "committed",
      "faulted",
    ]);
    expect(sourceEntries.at(-2)?.attemptedDraws.length).toBeGreaterThan(0);
    expect(source.commandLog.replayBase()).toBe(afterFirstCommit);
    expect(source.commandLog.replayBaseStateDigest()).toBe(
      digestCanonical("sillymaker:state:v1", afterFirstCommit),
    );

    const liveSnapshotBeforeReplay = source.session.getCurrentSnapshot();
    const liveStatusBeforeReplay = source.session.getStatus();
    const liveLogBeforeReplay = source.commandLog.entries();
    const saveRecordsBeforeReplay = await records.list("save");
    const leaseRecordsBeforeReplay = await records.list("lease");
    const settingsRecordsBeforeReplay = await records.list("settings");
    const persistenceStatusBeforeReplay = await persistence.port.getStatus();
    const slotSummariesBeforeReplay = await persistence.port.listSlots();

    const replayInput = createReplayInputV1(
      resolved,
      source.commandLog.replayBase(),
      source.commandLog.replayBaseStateDigest(),
      sourceEntries,
      liveSnapshotBeforeReplay,
    );
    await expect(
      replayInput.createDriver(replayInput.replayBase).submit(
        Object.freeze({
          source: "debug" as const,
          command: Object.freeze({ kind: "debug.e2e.test.fault" as const }),
        }),
      ),
    ).rejects.toThrow("E2E replay does not admit DebugCommand entries in Task 7");

    await expect(replayAuthoritativelyV1(replayInput)).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 200,
      mismatches: [],
    });

    const mutated = mutateRetainedCounterFactV1(sourceEntries);
    const mutatedComparison = await replayAuthoritativelyV1(
      createReplayInputV1(
        resolved,
        source.commandLog.replayBase(),
        source.commandLog.replayBaseStateDigest(),
        mutated.entries,
        liveSnapshotBeforeReplay,
      ),
    );
    expect(mutatedComparison).toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: false,
      executedEntries: 200,
      mismatches: [
        {
          scope: "entry",
          logOrdinal: mutated.logOrdinal,
          field: "facts",
        },
      ],
    });
    expect(mutatedComparison.mismatches).not.toContainEqual({
      scope: "final",
      field: "current_state_digest",
    });

    expect(source.session.getCurrentSnapshot()).toBe(liveSnapshotBeforeReplay);
    expect(source.session.getStatus()).toBe(liveStatusBeforeReplay);
    expect(source.commandLog.entries()).toBe(liveLogBeforeReplay);
    await expect(records.list("save")).resolves.toEqual(saveRecordsBeforeReplay);
    await expect(records.list("lease")).resolves.toEqual(leaseRecordsBeforeReplay);
    await expect(records.list("settings")).resolves.toEqual(settingsRecordsBeforeReplay);
    await expect(persistence.port.getStatus()).resolves.toEqual(persistenceStatusBeforeReplay);
    await expect(persistence.port.listSlots()).resolves.toEqual(slotSummariesBeforeReplay);
  });
});
