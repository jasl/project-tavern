// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.js";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.js";
import type { RuntimeSchemaV1 } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import { createGameSessionInternalV1, createGameSessionV1 } from "./game-session.js";

interface State {
  readonly count: number;
}
interface RngState {
  readonly cursor: number;
}
type Snapshot = GameSnapshotEnvelopeV1<State, RngState>;
type Command =
  { readonly kind: "increment" } | { readonly kind: "fault" } | { readonly kind: "throw" };
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
    if (kind !== "increment" && kind !== "fault" && kind !== "throw") {
      throw new TypeError("invalid command");
    }
    return Object.freeze({ kind });
  },
};

function createSnapshot(count: number): Snapshot {
  return Object.freeze({
    state: Object.freeze({ count }),
    rng: Object.freeze({ cursor: 0 }),
    commandSequence: parseNonNegativeSafeInteger(count),
  });
}

const attempt = (current: Snapshot, command: Command): Attempt => {
  if (command.kind === "fault") {
    return Object.freeze({
      result: Object.freeze({
        kind: "faulted" as const,
        snapshot: createSnapshot(999),
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
      snapshot: createSnapshot(current.state.count + 1),
      facts: Object.freeze([{ count: current.state.count + 1 }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: Object.freeze({ cursor: 0 }),
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: Object.freeze({ cursor: 0 }),
    }),
  });
};

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
  });

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
    const { session, runtimeControl, calls, attempts } = fixture();
    await expect(session.dispatch({ kind: "throw" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    expect(calls()).toBe(1);
    expect(attempts).toHaveLength(1);
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
      ),
    ).resolves.toBe("anchored");
    expect(session.getCurrentSnapshot().state.count).toBe(40);
    expect(session.getStatus()).toBe("ready");
  });

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
});
