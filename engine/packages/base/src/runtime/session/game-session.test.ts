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
import { createGameSessionV1, type GameSessionDebugInputV1 } from "./game-session.js";

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
type DebugCommand =
  | { readonly kind: "debug.synthetic.add"; readonly amount: number }
  | { readonly kind: "debug.synthetic.validation_failed" }
  | { readonly kind: "debug.synthetic.fault" };
interface DebugValidationError {
  readonly code: "debug.synthetic.validation_failed";
  readonly commandKind: DebugCommand["kind"];
}
type DebugAnchorTestResult = { readonly kind: "anchored" } | { readonly kind: "faulted" };
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
  readonly debugCommand: DebugCommand;
  readonly debugValidationError: DebugValidationError;
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

function defineDebugInputV1(input: GameSessionDebugInputV1<Types>): GameSessionDebugInputV1<Types> {
  return Object.freeze(input);
}

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

function fixture(
  options: {
    readonly onObserverFailure?: (error: unknown) => void;
    readonly onHmrInvalidated?: () => void;
  } = {},
): ReturnType<typeof createGameSessionV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
} {
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
    ...(options.onObserverFailure === undefined
      ? {}
      : { onObserverFailure: options.onObserverFailure }),
    ...(options.onHmrInvalidated === undefined
      ? {}
      : { onHmrInvalidated: options.onHmrInvalidated }),
  };
  const created = createGameSessionV1<Types>(input);
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

  it("finalizes one successful DebugCommand for the result, log, live state, and integrity", async () => {
    const initial = createSnapshot(0);
    let validateCalls = 0;
    let executeCalls = 0;
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
      debug: defineDebugInputV1({
        validate(_snapshot, _command) {
          validateCalls += 1;
          return Object.freeze({ kind: "allowed" as const });
        },
        executeAttempt(snapshot, command) {
          executeCalls += 1;
          return attempt(snapshot as Snapshot, {
            kind: command.kind === "debug.synthetic.fault" ? "fault" : "increment",
          });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    const result = await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 5 }),
      () => true,
    );

    expect(result.kind).toBe("executed");
    if (result.kind !== "executed") throw new TypeError("expected executed DebugCommand");
    expect(validateCalls).toBe(1);
    expect(executeCalls).toBe(1);
    expect(created.session.getCurrentSnapshot()).toBe(result.attempt.result.snapshot);
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.synthetic.add",
          sequence: 1,
        },
      ],
    });
    const entry = created.commandLog.entries().at(-1);
    expect(entry).toMatchObject({
      source: "debug",
      command: { kind: "debug.synthetic.add", amount: 5 },
      outcome: { kind: "committed" },
    });
    expect(entry?.postStateDigest).toBe(result.attempt.postStateDigest);
    expect(result.attempt.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
  });

  it("validates DebugCommand at queue front without opening an attempt or log", async () => {
    const initial = createSnapshot(0);
    let executeCalls = 0;
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
      debug: defineDebugInputV1({
        validate(_snapshot, command) {
          return Object.freeze({
            kind: "validation_failed" as const,
            errors: Object.freeze([
              Object.freeze({
                code: "debug.synthetic.validation_failed" as const,
                commandKind: command.kind,
              }),
            ]),
          });
        },
        executeAttempt(snapshot) {
          executeCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    await expect(
      created.debugControl.execute(
        Object.freeze({ kind: "debug.synthetic.validation_failed" }),
        () => true,
      ),
    ).resolves.toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.synthetic.validation_failed",
          commandKind: "debug.synthetic.validation_failed",
        },
      ],
    });
    expect(executeCalls).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.session.getCurrentSnapshot()).toBe(initial);
    expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
  });

  it("rechecks capability before Debug validation after waiting in the one FIFO", async () => {
    let releaseDispatch: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let enabled = true;
    let debugValidateCalls = 0;
    let debugExecuteCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt(snapshot, command) {
        await blocked;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate() {
          debugValidateCalls += 1;
          return Object.freeze({ kind: "allowed" as const });
        },
        executeAttempt(snapshot) {
          debugExecuteCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    const gameplay = created.session.dispatch({ kind: "increment" });
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => enabled,
    );
    enabled = false;
    releaseDispatch?.();

    await expect(gameplay).resolves.toMatchObject({ kind: "executed" });
    await expect(debug).resolves.toEqual({ kind: "capability_disabled" });
    expect(debugValidateCalls).toBe(0);
    expect(debugExecuteCalls).toBe(0);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.source).toBe("game");
    expect(created.session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it("rechecks capability before a Debug anchor operation after waiting in the one FIFO", async () => {
    let releaseDispatch: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let enabled = true;
    let anchorCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt(snapshot, command) {
        await blocked;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });

    const gameplay = created.session.dispatch({ kind: "increment" });
    const anchor = created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      async () => {
        anchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(10),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => enabled,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    enabled = false;
    releaseDispatch?.();

    await expect(gameplay).resolves.toMatchObject({ kind: "executed" });
    await expect(anchor).resolves.toEqual({ kind: "capability_disabled" });
    expect(anchorCalls).toBe(0);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.source).toBe("game");
    expect(created.session.getCurrentSnapshot().state.count).toBe(1);
    expect(created.session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it("does not let Debug anchors revive unavailable or HMR-invalidated Sessions", async () => {
    let unavailableAnchorCalls = 0;
    const unavailable = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      available: false,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });
    const unavailableOperation = async () => {
      unavailableAnchorCalls += 1;
      return Object.freeze({
        kind: "replace" as const,
        snapshot: createSnapshot(10),
        result: Object.freeze({ kind: "anchored" as const }),
      });
    };
    const unavailableFirst =
      await unavailable.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        unavailableOperation,
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      );
    const unavailableSecond =
      await unavailable.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        unavailableOperation,
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      );
    expect(unavailableFirst).toEqual({
      kind: "not_executed",
      code: "session_unavailable",
    });
    expect(unavailableSecond).toBe(unavailableFirst);
    expect(unavailableAnchorCalls).toBe(0);
    expect(unavailable.session.getCurrentSnapshot().state.count).toBe(0);

    const invalidated = fixture();
    let invalidatedAnchorCalls = 0;
    invalidated.invalidationController.invalidateForHmr();
    const anchor = invalidated.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "debug_bundle" as const }),
      async () => {
        invalidatedAnchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    await expect(anchor).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(invalidatedAnchorCalls).toBe(0);
    expect(invalidated.session.getStatus()).toBe("hmr_invalidated");
    expect(invalidated.session.getCurrentSnapshot().state.count).toBe(0);
    expect(invalidated.commandLog.entries()).toEqual([]);
  });

  it("logs an admitted faulted DebugCommand without marking integrity and pauses the Session", async () => {
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
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        executeAttempt(snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    const result = await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.fault" }),
      () => true,
    );
    expect(result).toMatchObject({
      kind: "executed",
      attempt: { result: { kind: "faulted" } },
    });
    expect(created.commandLog.entries()).toEqual([
      expect.objectContaining({
        source: "debug",
        outcome: { kind: "faulted", fault: { code: "synthetic.fault" } },
      }),
    ]);
    expect(created.session.getCurrentSnapshot()).toBe(initial);
    expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
    expect(created.session.getStatus()).toBe("fault_paused");
  });

  it("allows a successful Debug anchor to recover a fault-paused Session", async () => {
    const created = fixture();
    await created.session.dispatch({ kind: "fault" });
    expect(created.session.getStatus()).toBe("fault_paused");
    expect(created.commandLog.entries()).toHaveLength(1);

    await expect(
      created.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: createSnapshot(10),
            result: Object.freeze({ kind: "anchored" as const }),
          }),
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      ),
    ).resolves.toEqual({ kind: "anchored" });
    expect(created.session.getStatus()).toBe("ready");
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.commandLog.replayBase()).toBe(created.session.getCurrentSnapshot());
    expect(created.session.getCurrentSnapshot().integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 }],
    });
  });

  it("marks accepted fixture and Debug Bundle anchors through the dedicated Debug control", async () => {
    const created = fixture();
    await created.session.dispatch({ kind: "increment" });
    const fixtureSnapshot = createSnapshot(10);
    await expect(
      created.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: fixtureSnapshot,
            result: Object.freeze({ kind: "anchored" as const }),
          }),
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      ),
    ).resolves.toEqual({ kind: "anchored" });
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 10,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 }],
    });
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.commandLog.replayBase()).toBe(created.session.getCurrentSnapshot());

    const existingModified = created.session.getCurrentSnapshot().integrity;
    const bundleSnapshot = createSnapshot(20, existingModified);
    await created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "debug_bundle" as const }),
      async () =>
        Object.freeze({
          kind: "replace" as const,
          snapshot: bundleSnapshot,
          result: Object.freeze({ kind: "anchored" as const }),
        }),
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 2,
      firstMutationSequence: 10,
      reasons: [
        { kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 },
        { kind: "debug_bundle_anchor", sequence: 20 },
      ],
    });
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

  it("invalidates synchronously once and rejects new commands without changing the Snapshot", async () => {
    let invalidationReports = 0;
    const { session, runtimeControl, invalidationController, commandLog, calls } = fixture({
      onHmrInvalidated() {
        invalidationReports += 1;
      },
    });
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const commandLogBefore = commandLog.entries();
    let synchronouslyPublishedStatus: ReturnType<typeof session.getStatus> | undefined;
    let invalidationPublications = 0;
    session.subscribe(() => {
      synchronouslyPublishedStatus = session.getStatus();
      invalidationPublications += 1;
    });

    invalidationController.invalidateForHmr();
    expect(synchronouslyPublishedStatus).toBe("hmr_invalidated");
    expect(session.getStatus()).toBe("hmr_invalidated");
    invalidationController.invalidateForHmr();
    const command = session.dispatch({ kind: "increment" });

    await expect(command).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(invalidationReports).toBe(1);
    expect(invalidationPublications).toBe(1);
    expect(calls()).toBe(1);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.entries()).toBe(commandLogBefore);
    await expect(runtimeControl.readAtQueueFront((snapshot) => snapshot)).resolves.toBe(
      snapshotBefore,
    );
    expect(session.getStatus()).toBe("hmr_invalidated");
  });

  it("skips gameplay and Debug mutations queued behind synchronous invalidation", async () => {
    let releaseBlocker: (() => void) | undefined;
    let blockerStarted: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });
    const started = new Promise<void>((resolve) => {
      blockerStarted = resolve;
    });
    let gameplayCalls = 0;
    let debugCalls = 0;
    let anchorCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        gameplayCalls += 1;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        executeAttempt(snapshot) {
          debugCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });
    const blockingOperation = created.runtimeControl.enqueueAuthoritative(
      async () => {
        blockerStarted?.();
        await blocker;
        return Object.freeze({
          kind: "preserve" as const,
          result: "released" as const,
        });
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await started;
    const gameplay = created.session.dispatch({ kind: "increment" });
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => true,
    );
    const anchor = created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      async () => {
        anchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );

    created.invalidationController.invalidateForHmr();
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    releaseBlocker?.();

    await expect(blockingOperation).resolves.toBe("hmr_invalidated");
    await expect(gameplay).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(debug).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(anchor).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(gameplayCalls).toBe(0);
    expect(debugCalls).toBe(0);
    expect(anchorCalls).toBe(0);
    expect(created.session.getCurrentSnapshot().state.count).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
  });

  it("drops an in-flight async DebugCommand after synchronous HMR invalidation", async () => {
    let releaseDebug: (() => void) | undefined;
    let markDebugStarted: (() => void) | undefined;
    const blockedDebug = new Promise<void>((resolve) => {
      releaseDebug = resolve;
    });
    const debugStarted = new Promise<void>((resolve) => {
      markDebugStarted = resolve;
    });
    let attemptsObserved = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt() {
        attemptsObserved += 1;
      },
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        async executeAttempt(snapshot) {
          markDebugStarted?.();
          await blockedDebug;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });
    const snapshotBefore = created.session.getCurrentSnapshot();
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => true,
    );
    await debugStarted;

    created.invalidationController.invalidateForHmr();
    releaseDebug?.();

    await expect(debug).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(created.commandLog.entries()).toEqual([]);
    expect(attemptsObserved).toBe(0);
  });

  it("does not let an in-flight authoritative replacement revive an invalidated Session", async () => {
    let releaseReplacement: (() => void) | undefined;
    let replacementStarted: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const started = new Promise<void>((resolve) => {
      replacementStarted = resolve;
    });
    const created = fixture();
    const before = created.session.getCurrentSnapshot();
    const replacement = created.runtimeControl.enqueueAuthoritative(
      async () => {
        replacementStarted?.();
        await blocked;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        });
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await started;

    created.invalidationController.invalidateForHmr();
    releaseReplacement?.();

    await expect(replacement).resolves.toBe("hmr_invalidated");
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot()).toBe(before);
    expect(created.commandLog.replayBase()).toBe(before);
    expect(created.commandLog.entries()).toEqual([]);
  });

  it("keeps HMR invalidation terminal when in-flight authoritative work throws", async () => {
    let releaseDispatch: (() => void) | undefined;
    let dispatchStarted: (() => void) | undefined;
    const blockedDispatch = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    const startedDispatch = new Promise<void>((resolve) => {
      dispatchStarted = resolve;
    });
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt() {
        dispatchStarted?.();
        await blockedDispatch;
        throw new Error("old executor failed");
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });
    const dispatch = created.session.dispatch({ kind: "increment" });
    await startedDispatch;

    created.invalidationController.invalidateForHmr();
    releaseDispatch?.();

    await expect(dispatch).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot().state.count).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);

    let releaseReplacement: (() => void) | undefined;
    let replacementStarted: (() => void) | undefined;
    const blockedReplacement = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const startedReplacement = new Promise<void>((resolve) => {
      replacementStarted = resolve;
    });
    const replacementCreated = fixture();
    const replacement = replacementCreated.runtimeControl.enqueueAuthoritative(
      async () => {
        replacementStarted?.();
        await blockedReplacement;
        throw new Error("old replacement failed");
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await startedReplacement;

    replacementCreated.invalidationController.invalidateForHmr();
    releaseReplacement?.();

    await expect(replacement).resolves.toBe("hmr_invalidated");
    expect(replacementCreated.session.getStatus()).toBe("hmr_invalidated");
    expect(replacementCreated.session.getCurrentSnapshot().state.count).toBe(0);
    expect(replacementCreated.commandLog.entries()).toEqual([]);
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
    const { session, runtimeControl } = fixture({ onObserverFailure: reportObserverFailure });
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
    const { session } = fixture({
      onObserverFailure(error) {
        observerFailures.push(error);
        throw new Error("observer failure hook also failed");
      },
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
