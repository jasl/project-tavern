// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestCanonical } from "../../contracts/digest.js";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.js";
import type { IsoUtcInstant } from "../../contracts/host.js";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.js";
import { createPristineRunIntegrityV1, runIntegrityV1Schema } from "../../contracts/snapshot.js";
import type { RuntimeSchemaV1 } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "../diagnostics/runtime-failures.js";
import { createGameSessionInternalV1, createGameSessionV1 } from "./game-session.js";

interface State {
  readonly count: number;
}
interface RngState {
  readonly cursor: number;
}
type Snapshot = GameSnapshotEnvelopeV1<State, RngState>;
type Command =
  | { readonly kind: "increment" }
  | { readonly kind: "reject" }
  | { readonly kind: "fault" }
  | { readonly kind: "throw" };
type Attempt = CommandExecutionAttemptEnvelopeV1<
  Snapshot,
  { readonly count: number },
  { readonly code: string },
  { readonly code: string },
  { readonly cursor: number },
  never
>;
interface Types extends GameSimulationTypeMapV1<GameBootstrapInputV1, State, RngState> {
  readonly snapshot: Snapshot;
  readonly command: Command;
  readonly fact: { readonly count: number };
  readonly rejection: { readonly code: string };
  readonly fault: { readonly code: string };
  readonly rngState: { readonly cursor: number };
  readonly rngDrawTrace: never;
  readonly executionContext: undefined;
}

const commandSchema: RuntimeSchemaV1<Command> = {
  parse(value) {
    const kind = (value as { kind?: unknown } | null)?.kind;
    if (kind !== "increment" && kind !== "reject" && kind !== "fault" && kind !== "throw") {
      throw new TypeError("invalid command");
    }
    return Object.freeze({ kind });
  },
};

function createSnapshot(count: number, integrity = createPristineRunIntegrityV1()): Snapshot {
  return Object.freeze({
    state: Object.freeze({ count }),
    rng: Object.freeze({ cursor: 0 }),
    commandSequence: parseNonNegativeSafeInteger(count),
    integrity,
  });
}

const attempt = (current: Snapshot, command: Command): Attempt => {
  if (command.kind === "reject") {
    return Object.freeze({
      result: Object.freeze({
        kind: "rejected" as const,
        snapshot: current,
        reasons: Object.freeze([Object.freeze({ code: "synthetic.reject" })]),
      }),
      diagnostics: Object.freeze({
        committedRngBefore: current.rng,
        attemptedDraws: Object.freeze([]) as readonly never[],
        committedRngAfter: current.rng,
      }),
    });
  }
  if (command.kind === "fault") {
    return Object.freeze({
      result: Object.freeze({
        kind: "faulted" as const,
        snapshot: current,
        fault: Object.freeze({ code: "synthetic.fault" }),
      }),
      diagnostics: Object.freeze({
        committedRngBefore: Object.freeze({ cursor: 0 }),
        attemptedDraws: Object.freeze([]) as readonly never[],
        committedRngAfter: Object.freeze({ cursor: 0 }),
      }),
    });
  }
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: createSnapshot(current.state.count + 1, current.integrity),
      facts: Object.freeze([{ count: current.state.count + 1 }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: Object.freeze({ cursor: 0 }),
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: Object.freeze({ cursor: 0 }),
    }),
  });
};

function integrityDriftAttempt(
  current: Snapshot,
  drifted: Snapshot,
  kind: "committed" | "rejected" | "faulted",
): Attempt {
  const result: Attempt["result"] =
    kind === "committed"
      ? Object.freeze({
          kind: "committed" as const,
          snapshot: drifted,
          facts: Object.freeze([{ count: drifted.state.count }]),
        })
      : kind === "rejected"
        ? Object.freeze({
            kind: "rejected" as const,
            snapshot: drifted,
            reasons: Object.freeze([{ code: "synthetic.reject" }]),
          })
        : Object.freeze({
            kind: "faulted" as const,
            snapshot: drifted,
            fault: Object.freeze({ code: "synthetic.fault" }),
          });
  return Object.freeze({
    result,
    diagnostics: Object.freeze({
      committedRngBefore: current.rng,
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: current.rng,
    }),
  });
}

function fixture(): ReturnType<typeof createGameSessionV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
};
function fixture(
  internal: true,
  onObserverFailure?: (error: unknown) => void,
): ReturnType<typeof createGameSessionInternalV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
};
function fixture(
  internal: false,
  onObserverFailure?: (error: unknown) => void,
): ReturnType<typeof createGameSessionV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
};
function fixture(internal = false, onObserverFailure?: (error: unknown) => void) {
  let calls = 0;
  const attempts: Attempt[] = [];
  const input = {
    initialSnapshot: createSnapshot(0),
    commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot: Snapshot, command: Command): Attempt {
      calls += 1;
      if (command.kind === "throw") throw new Error("executor exploded");
      return attempt(snapshot, command);
    },
    normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot): Attempt {
      return attempt(snapshot, { kind: "fault" });
    },
    onAttempt(value: Attempt) {
      attempts.push(value);
    },
    ...(onObserverFailure === undefined ? {} : { onObserverFailure }),
  };
  const created = internal
    ? createGameSessionInternalV1<Types>(input)
    : createGameSessionV1<Types>(input);
  return { ...created, calls: () => calls, attempts };
}

describe("GameSession FIFO", () => {
  it("uses one finalized attempt for dispatch, live state, parsed command log, and observers", async () => {
    const initial = createSnapshot(0);
    let observed: Attempt | undefined;
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt(finalizedAttempt) {
        observed = finalizedAttempt;
      },
    });
    const admitted = Object.freeze({ kind: "increment", semanticOnly: "discarded" });

    const dispatch = await created.session.dispatch(admitted as Command);

    expect(dispatch.kind).toBe("executed");
    if (dispatch.kind !== "executed") throw new TypeError("expected executed dispatch");
    expect(observed).toBeDefined();
    expect(dispatch.execution).toBe(observed?.result);
    expect(created.session.getCurrentSnapshot()).toBe(observed?.result.snapshot);
    expect(created.commandLog.entries()).toHaveLength(1);
    const entry = created.commandLog.entries()[0];
    expect(entry).toMatchObject({
      source: "game",
      command: { kind: "increment" },
      outcome: { kind: "committed", facts: [{ count: 1 }] },
      commandSequence: { before: 0, after: 1 },
    });
    expect(entry?.command).not.toBe(admitted);
    expect(entry?.preStateDigest).toBe(digestCanonical("sillymaker:state:v1", initial));
    expect(entry?.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
  });

  it("logs rejected and faulted attempts but not invalid admission or a queued skip", async () => {
    const { session, commandLog, calls } = fixture();

    await expect(session.dispatch({ kind: "invalid" } as never)).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    await expect(session.dispatch({ kind: "reject" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "rejected" },
    });
    const fault = session.dispatch({ kind: "fault" });
    const skipped = session.dispatch({ kind: "increment" });
    await expect(fault).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    await expect(skipped).resolves.toEqual({
      kind: "not_executed",
      code: "fault_paused",
    });

    expect(calls()).toBe(2);
    expect(
      commandLog.entries().map(({ logOrdinal, outcome }) => [logOrdinal, outcome.kind]),
    ).toEqual([
      [1, "rejected"],
      [2, "faulted"],
    ]);
    for (const entry of commandLog.entries()) {
      expect(entry.preStateDigest).toBe(entry.postStateDigest);
      expect(entry.commandSequence.before).toBe(entry.commandSequence.after);
      expect(entry.committedRngBefore).toEqual(entry.committedRngAfter);
    }
  });

  it("publishes busy synchronously and commits in admission order", async () => {
    const { session, calls } = fixture();
    const first = session.dispatch({ kind: "increment" });
    const second = session.dispatch({ kind: "increment" });
    expect(session.getStatus()).toBe("busy");
    await expect(first).resolves.toMatchObject({ kind: "executed" });
    await expect(second).resolves.toMatchObject({ kind: "executed" });
    expect(session.getCurrentSnapshot().state.count).toBe(2);
    expect(session.getStatus()).toBe("ready");
    expect(calls()).toBe(2);
    expect(session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it.each(["committed", "rejected", "faulted"] as const)(
    "turns Story-owned integrity drift from %s into one finalized fault",
    async (candidateKind) => {
      const initial = createSnapshot(0);
      const drifted = runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 1,
        firstMutationSequence: 1,
        reasons: [{ kind: "debug_bundle_anchor", sequence: 1 }],
      });
      let executorCalls = 0;
      const finalizedAttempts: Attempt[] = [];
      const created = createGameSessionV1<Types>({
        initialSnapshot: initial,
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot) {
          executorCalls += 1;
          return integrityDriftAttempt(
            snapshot as Snapshot,
            createSnapshot(snapshot.state.count + 1, drifted),
            candidateKind,
          );
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        onAttempt(value) {
          finalizedAttempts.push(value);
        },
      });

      await expect(created.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
        kind: "executed",
        execution: { kind: "faulted", fault: { code: "synthetic.fault" } },
      });
      expect(executorCalls).toBe(1);
      expect(finalizedAttempts).toHaveLength(1);
      expect(finalizedAttempts[0]?.result).toMatchObject({
        kind: "faulted",
        fault: { code: "synthetic.fault" },
      });
      expect(finalizedAttempts[0]?.result.snapshot).toBe(initial);
      expect(created.session.getCurrentSnapshot()).toBe(initial);
      expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
      expect(created.commandLog.entries()).toHaveLength(1);
      expect(created.commandLog.entries()[0]?.outcome.kind).toBe("faulted");
      expect(created.commandLog.entries()[0]?.postStateDigest).toBe(
        digestCanonical("sillymaker:state:v1", initial),
      );
    },
  );

  it("preserves the exact Snapshot and skips a queued command after fault", async () => {
    const { session, calls } = fixture();
    const before = session.getCurrentSnapshot();
    const first = session.dispatch({ kind: "fault" });
    const second = session.dispatch({ kind: "increment" });
    await expect(first).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    await expect(second).resolves.toEqual({
      kind: "not_executed",
      code: "fault_paused",
    });
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(session.getStatus()).toBe("fault_paused");
    expect(calls()).toBe(1);
  });

  it("skips a queued command after authoritative HMR invalidation", async () => {
    const { session, privateControl, calls } = fixture(true);
    const invalidation = privateControl.invalidateForHmr();
    const command = session.dispatch({ kind: "increment" });
    await invalidation;
    await expect(command).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(calls()).toBe(0);
  });

  it("normalizes a thrown executor once and permits an anchor recovery", async () => {
    const { session, runtimeControl, commandLog, calls, attempts } = fixture();
    await expect(session.dispatch({ kind: "throw" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    expect(calls()).toBe(1);
    expect(attempts).toHaveLength(1);
    expect(commandLog.entries()).toHaveLength(1);
    expect(commandLog.entries()[0]?.outcome.kind).toBe("faulted");
    const acceptedIntegrity = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 40,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 40 }],
    });
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40, acceptedIntegrity),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
      ),
    ).resolves.toBe("anchored");
    expect(session.getCurrentSnapshot().state.count).toBe(40);
    expect(session.getCurrentSnapshot().integrity).toBe(acceptedIntegrity);
    expect(commandLog.entries()).toEqual([]);
    expect(commandLog.replayBase()).toBe(session.getCurrentSnapshot());
    expect(session.getStatus()).toBe("ready");
  });

  it("prepares replacement side effects only after the candidate is finalized", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const before = session.getCurrentSnapshot();
    const entriesBefore = commandLog.entries();
    const invalid = Object.freeze({
      ...createSnapshot(9),
      integrity: Object.freeze({ mode: "invalid" }),
    }) as unknown as Snapshot;
    let prepared = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: invalid,
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        () => {
          prepared += 1;
        },
      ),
    ).resolves.toBe("faulted");

    expect(prepared).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it("rejects a preserve-log replacement that changes the Snapshot before any mutation", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let callbackCalls = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40),
          result: "replaced" as const,
          anchor: "preserve_log" as const,
        }),
        () => "faulted" as const,
        () => {
          callbackCalls += 1;
        },
      ),
    ).resolves.toBe("faulted");

    expect(callbackCalls).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it("permits a preserve-log replacement only when it retains the current Snapshot", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let callbackCalls = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async (current) => ({
          kind: "replace" as const,
          snapshot: current as Snapshot,
          result: "preserved" as const,
          anchor: "preserve_log" as const,
        }),
        () => "faulted" as const,
        () => {
          callbackCalls += 1;
        },
      ),
    ).resolves.toBe("preserved");

    expect(callbackCalls).toBe(1);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("ready");
  });

  it("resets the command log only after a replay-base replacement callback succeeds", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    expect(Object.isFrozen(commandLog)).toBe(true);
    expect(Object.keys(commandLog).sort()).toEqual([
      "entries",
      "replayBase",
      "replayBaseStateDigest",
    ]);
    expect(commandLog).not.toHaveProperty("append");
    expect(commandLog).not.toHaveProperty("prepareAnchor");
    expect(commandLog).not.toHaveProperty("establishPreparedAnchor");
    expect(commandLog).not.toHaveProperty("establishAnchor");
    expect(commandLog.entries()).toEqual([]);
    await session.dispatch({ kind: "increment" });
    expect(commandLog.entries()).toHaveLength(1);
    const oldReplayBase = commandLog.replayBase();
    const replacement = createSnapshot(40);
    let callbackObservedExistingLog = false;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: replacement,
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        (finalized, anchor) => {
          expect(finalized).toBe(replacement);
          expect(anchor).toBe("replace_replay_base");
          expect(commandLog.entries()).toHaveLength(1);
          expect(commandLog.replayBase()).toBe(oldReplayBase);
          callbackObservedExistingLog = true;
        },
      ),
    ).resolves.toBe("anchored");

    expect(callbackObservedExistingLog).toBe(true);
    expect(session.getCurrentSnapshot()).toBe(replacement);
    expect(commandLog.entries()).toEqual([]);
    expect(commandLog.replayBase()).toBe(replacement);
  });

  it("preserves the command log and live Snapshot when a replacement callback fails", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    const callbackError = new Error("replacement callback failed");

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        () => {
          throw callbackError;
        },
      ),
    ).resolves.toBe("faulted");

    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it.each([
    [
      "cyclic",
      () => {
        const state = { count: 40 } as { count: number; self?: unknown };
        state.self = state;
        return Object.freeze({
          ...createSnapshot(40),
          state: Object.freeze(state),
        }) as Snapshot;
      },
    ],
    [
      "noncanonical",
      () =>
        Object.freeze({
          ...createSnapshot(40),
          state: Object.freeze({ count: 40, invalid: undefined }),
        }) as Snapshot,
    ],
  ] as const)(
    "rejects a %s replay-base replacement before its callback and preserves live/log state",
    async (_label, replacementFactory) => {
      const { session, runtimeControl, commandLog } = fixture();
      await session.dispatch({ kind: "increment" });
      const snapshotBefore = session.getCurrentSnapshot();
      const replayBaseBefore = commandLog.replayBase();
      const entriesBefore = commandLog.entries();
      let callbackCalls = 0;

      await expect(
        runtimeControl.enqueueAuthoritative(
          async () => ({
            kind: "replace" as const,
            snapshot: replacementFactory(),
            result: "anchored" as const,
            anchor: "replace_replay_base" as const,
          }),
          () => "faulted" as const,
          () => {
            callbackCalls += 1;
          },
        ),
      ).resolves.toBe("faulted");

      expect(callbackCalls).toBe(0);
      expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(commandLog.replayBase()).toBe(replayBaseBefore);
      expect(commandLog.entries()).toBe(entriesBefore);
      expect(session.getStatus()).toBe("fault_paused");
    },
  );

  it("rejects invalid admission without an attempt", async () => {
    const { session, calls } = fixture();
    await expect(session.dispatch({ kind: "invalid" } as never)).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    expect(calls()).toBe(0);
  });

  it("publishes busy in the enqueueing tick and executes once", async () => {
    const { session, calls } = fixture();
    const result = session.dispatch({ kind: "increment" });

    expect(session.getStatus()).toBe("busy");
    await expect(result).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(calls()).toBe(1);
  });

  it("serializes dispatch and authoritative replacement on one tail", async () => {
    const order: string[] = [];
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot: Snapshot, command: Command) {
        order.push("dispatch");
        return attempt(snapshot, command);
      },
      normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot) {
        return attempt(snapshot, { kind: "fault" });
      },
    });
    const dispatch = created.session.dispatch({ kind: "increment" });
    const anchor = created.runtimeControl.enqueueAuthoritative(
      async () => {
        order.push("anchor");
        return {
          kind: "replace" as const,
          snapshot: createSnapshot(10),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        };
      },
      () => "faulted" as const,
    );

    await expect(dispatch).resolves.toMatchObject({ kind: "executed" });
    await expect(anchor).resolves.toBe("anchored");
    expect(order).toEqual(["dispatch", "anchor"]);
    expect(created.session.getCurrentSnapshot().state.count).toBe(10);
  });

  it("reads the latest Snapshot at its FIFO position without executing or replacing", async () => {
    let releaseDispatch: (() => void) | undefined;
    const dispatchBarrier = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let calls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt(snapshot: Snapshot, command: Command) {
        calls += 1;
        await dispatchBarrier;
        return attempt(snapshot, command);
      },
      normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot) {
        return attempt(snapshot, { kind: "fault" });
      },
    });
    const before = created.session.getCurrentSnapshot();
    const dispatch = created.session.dispatch({ kind: "increment" });
    const read = created.runtimeControl.readAtQueueFront((snapshot) => snapshot);

    expect(created.session).not.toHaveProperty("readAtQueueFront");
    expect(created.session.getStatus()).toBe("busy");
    releaseDispatch?.();
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    const readSnapshot = await read;
    expect(readSnapshot.state.count).toBe(1);
    expect(readSnapshot).toBe(created.session.getCurrentSnapshot());
    expect(readSnapshot).not.toBe(before);
    expect(calls).toBe(1);
    expect(created.session.getStatus()).toBe("ready");
  });

  it("keeps the FIFO tail usable after a queue-front reader throws", async () => {
    const { session, runtimeControl, calls } = fixture();
    const before = session.getCurrentSnapshot();
    const readerError = new Error("reader failed");

    await expect(
      runtimeControl.readAtQueueFront(() => {
        throw readerError;
      }),
    ).rejects.toBe(readerError);
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(calls()).toBe(0);

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(1);
    expect(calls()).toBe(1);
    expect(session.getStatus()).toBe("ready");
  });

  it("rejects a queue-front then accessor without invoking its getter", async () => {
    const { session, runtimeControl } = fixture();
    let getterCalls = 0;
    const accessor = {};
    Reflect.defineProperty(accessor, ["th", "en"].join(""), {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });

    await expect(runtimeControl.readAtQueueFront(() => accessor)).rejects.toThrow(
      "GameSession queue-front reader returned thenable",
    );
    expect(getterCalls).toBe(0);
    expect(session.getStatus()).toBe("ready");
  });

  it("notifies runtime commit listeners after publication and before dispatch resolves", async () => {
    const listenerFailure = new Error("runtime commit listener failed");
    const runtimeFailures = createRuntimeFailureBufferV1();
    const reportObserverFailure = createRuntimeFailureReporterV1({
      failures: runtimeFailures,
      now: () => "2026-07-14T02:03:04.000Z" as IsoUtcInstant,
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });
    const observations: Array<{
      readonly listener: "throwing" | "following";
      readonly count: number;
      readonly dispatchResolved: boolean;
    }> = [];
    const { session, runtimeControl } = fixture(false, reportObserverFailure);
    let dispatchResolved = false;
    runtimeControl.subscribeCommittedSnapshots((snapshot) => {
      observations.push({
        listener: "throwing",
        count: snapshot.state.count,
        dispatchResolved,
      });
      throw listenerFailure;
    });
    runtimeControl.subscribeCommittedSnapshots((snapshot) => {
      observations.push({
        listener: "following",
        count: snapshot.state.count,
        dispatchResolved,
      });
      expect(session.getCurrentSnapshot()).toBe(snapshot);
    });

    const dispatch = session.dispatch({ kind: "increment" }).then((result) => {
      dispatchResolved = true;
      return result;
    });
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(observations).toEqual([
      { listener: "throwing", count: 1, dispatchResolved: false },
      { listener: "following", count: 1, dispatchResolved: false },
    ]);
    expect(runtimeFailures.entries()).toEqual([
      expect.objectContaining({
        operation: "runtime.observer_notification_failed",
        message: "runtime commit listener failed",
      }),
    ]);

    await expect(session.dispatch({ kind: "fault" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    expect(observations).toHaveLength(2);
    expect(runtimeFailures.entries()).toHaveLength(1);
    expect(session).not.toHaveProperty("subscribeCommittedSnapshots");
  });

  it("isolates throwing subscribers and an observer-failure hook", async () => {
    const subscriberError = new Error("subscriber failed once");
    const observerFailures: unknown[] = [];
    const observations: Array<{ readonly count: number; readonly status: string }> = [];
    const { session } = fixture(false, (error) => {
      observerFailures.push(error);
      throw new Error("observer failure hook also failed");
    });
    let throwOnce = true;
    session.subscribe(() => {
      if (!throwOnce) return;
      throwOnce = false;
      throw subscriberError;
    });
    session.subscribe(() => {
      observations.push({
        count: session.getCurrentSnapshot().state.count,
        status: session.getStatus(),
      });
    });

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(1);
    expect(session.getStatus()).toBe("ready");
    expect(observations[0]).toEqual({ count: 0, status: "busy" });
    expect(observerFailures).toEqual([subscriberError]);

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(2);
    expect(session.getStatus()).toBe("ready");
    expect(observerFailures).toEqual([subscriberError]);
  });

  it("isolates a finalized-attempt observer from logging and commit", async () => {
    const observerError = new Error("attempt observer failed");
    const observerFailures: unknown[] = [];
    const initial = createSnapshot(0);
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt() {
        throw observerError;
      },
      onObserverFailure(error) {
        observerFailures.push(error);
      },
    });

    await expect(created.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });

    expect(created.session.getCurrentSnapshot().state.count).toBe(1);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.outcome.kind).toBe("committed");
    expect(created.session.getStatus()).toBe("ready");
    expect(observerFailures).toEqual([observerError]);
  });
});
