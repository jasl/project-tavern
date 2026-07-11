// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import type { GameProfileTypeMapV1 } from "../../contracts/module.js";
import type { RuntimeSchemaV1 } from "../../contracts/values.js";
import { createEngineSessionInternalV1, createEngineSessionV1 } from "./engine-session.js";

interface Snapshot {
  readonly state: { readonly count: number };
}
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
interface Types extends GameProfileTypeMapV1 {
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

const attempt = (snapshot: Snapshot, command: Command): Attempt => {
  if (command.kind === "fault") {
    return Object.freeze({
      result: Object.freeze({
        kind: "faulted" as const,
        snapshot: Object.freeze({ state: Object.freeze({ count: 999 }) }),
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
      snapshot: Object.freeze({
        state: Object.freeze({ count: snapshot.state.count + 1 }),
      }),
      facts: Object.freeze([{ count: snapshot.state.count + 1 }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: Object.freeze({ cursor: 0 }),
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: Object.freeze({ cursor: 0 }),
    }),
  });
};

function fixture(): ReturnType<typeof createEngineSessionV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
};
function fixture(internal: true): ReturnType<typeof createEngineSessionInternalV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
};
function fixture(internal = false) {
  let calls = 0;
  const attempts: Attempt[] = [];
  const input = {
    initialSnapshot: Object.freeze({ state: Object.freeze({ count: 0 }) }),
    commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot: Snapshot, command: Command): Attempt {
      calls += 1;
      if (command.kind === "throw") throw new Error("coordinator exploded");
      return attempt(snapshot, command);
    },
    normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot): Attempt {
      return attempt(snapshot, { kind: "fault" });
    },
    onAttempt(value: Attempt) {
      attempts.push(value);
    },
  };
  const created = internal
    ? createEngineSessionInternalV1<Types>(input)
    : createEngineSessionV1<Types>(input);
  return { ...created, calls: () => calls, attempts };
}

describe("EngineSession FIFO", () => {
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

  it("normalizes a thrown coordinator once and permits an anchor recovery", async () => {
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
          snapshot: Object.freeze({ state: Object.freeze({ count: 40 }) }),
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
});
