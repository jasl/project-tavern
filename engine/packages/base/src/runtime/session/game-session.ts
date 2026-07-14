// SPDX-License-Identifier: MIT
import type {
  CommandExecutionAttemptEnvelopeV1,
  CommandExecutionResultEnvelopeV1,
} from "../../contracts/execution.js";
import { digestCanonical } from "../../contracts/digest.js";
import type { GameSimulationTypeMapV1 } from "../../contracts/gameplay-module.js";
import type {
  RuntimeSessionStatusV1,
  SessionDispatchOperationResultV1,
} from "../../contracts/presentation.js";
import type { DeepReadonly, RuntimeSchemaV1 } from "../../contracts/values.js";
import { runIntegrityV1Schema } from "../../contracts/snapshot.js";
import {
  createCommandLogV1,
  type CommandLogV1,
  type FinalizedCommandAttemptV1,
} from "../diagnostics/command-log.js";
import { finalizeSnapshotIntegrityV1 } from "./run-integrity.js";

export interface GameSessionV1<TTypes extends GameSimulationTypeMapV1> {
  getStatus(): RuntimeSessionStatusV1;
  getCurrentSnapshot(): DeepReadonly<TTypes["snapshot"]>;
  subscribe(listener: () => void): () => void;
  dispatch(
    command: DeepReadonly<TTypes["command"]>,
  ): Promise<
    SessionDispatchOperationResultV1<
      CommandExecutionResultEnvelopeV1<
        TTypes["snapshot"],
        TTypes["fact"],
        TTypes["rejection"],
        TTypes["fault"]
      >
    >
  >;
}

export type AuthoritativeOutcomeV1<TSnapshot, TResult> =
  | { readonly kind: "preserve"; readonly result: TResult }
  | {
      readonly kind: "replace";
      readonly snapshot: TSnapshot;
      readonly result: TResult;
      readonly anchor: "preserve_log" | "replace_replay_base";
    };

export interface GameSessionRuntimeControlV1<TSnapshot> {
  enqueueAuthoritative<TResult>(
    operation: (
      current: DeepReadonly<TSnapshot>,
    ) => Promise<AuthoritativeOutcomeV1<TSnapshot, TResult>>,
    normalizeUnexpectedFault: (error: unknown) => TResult,
    prepareReplacementCommit?: (
      snapshot: DeepReadonly<TSnapshot>,
      anchor: "preserve_log" | "replace_replay_base",
    ) => void,
  ): Promise<TResult>;
  readAtQueueFront<TResult>(
    reader: (snapshot: DeepReadonly<TSnapshot>) => TResult,
  ): Promise<TResult>;
  inspectForRuntime(): {
    readonly snapshot: DeepReadonly<TSnapshot>;
    readonly status: RuntimeSessionStatusV1;
  };
  subscribeCommittedSnapshots(listener: (snapshot: DeepReadonly<TSnapshot>) => void): () => void;
}

type AttemptFor<TTypes extends GameSimulationTypeMapV1> = CommandExecutionAttemptEnvelopeV1<
  TTypes["snapshot"],
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

type FinalizedAttemptFor<TTypes extends GameSimulationTypeMapV1> = FinalizedCommandAttemptV1<
  TTypes["snapshot"],
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

type LoggedGameCommandFor<TTypes extends GameSimulationTypeMapV1> = {
  readonly source: "game";
  readonly command: TTypes["command"];
};

type CommandLogFor<TTypes extends GameSimulationTypeMapV1> = CommandLogV1<
  TTypes["snapshot"],
  LoggedGameCommandFor<TTypes>,
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

type CommandLogViewFor<TTypes extends GameSimulationTypeMapV1> = Pick<
  CommandLogFor<TTypes>,
  "entries" | "replayBase" | "replayBaseStateDigest"
>;

export interface GameSessionInputV1<TTypes extends GameSimulationTypeMapV1> {
  readonly initialSnapshot: TTypes["snapshot"];
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly executionContext: TTypes["executionContext"];
  readonly available?: boolean;
  executeAttempt(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["command"]>,
    context: TTypes["executionContext"],
  ): AttemptFor<TTypes> | PromiseLike<AttemptFor<TTypes>>;
  normalizeUnexpectedDispatchFault(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): AttemptFor<TTypes>;
  onAttempt?(attempt: FinalizedAttemptFor<TTypes>): void;
  onObserverFailure?(error: unknown): void;
}

interface GameSessionPrivateControlV1 {
  invalidateForHmr(): Promise<void>;
}

export interface GameSessionCompositionV1<TTypes extends GameSimulationTypeMapV1> {
  readonly session: GameSessionV1<TTypes>;
  readonly runtimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]>;
  readonly commandLog: CommandLogViewFor<TTypes>;
}

interface InternalCompositionV1<
  TTypes extends GameSimulationTypeMapV1,
> extends GameSessionCompositionV1<TTypes> {
  readonly privateControl: GameSessionPrivateControlV1;
}

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor !== undefined) {
      return (
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        typeof descriptor.value === "function"
      );
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function finalizeCommandAttemptV1<TTypes extends GameSimulationTypeMapV1>(
  before: DeepReadonly<TTypes["snapshot"]>,
  candidate: AttemptFor<TTypes>,
): FinalizedAttemptFor<TTypes> {
  const finalizedSnapshot = finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
    before,
    candidate.result.snapshot,
    { kind: "preserve_current" },
  );
  if (candidate.result.kind !== "committed" && finalizedSnapshot !== before) {
    throw new TypeError("Non-committed command attempt changed the Snapshot");
  }

  const result: AttemptFor<TTypes>["result"] =
    candidate.result.kind === "committed"
      ? Object.freeze({
          kind: "committed" as const,
          snapshot: finalizedSnapshot,
          facts: candidate.result.facts,
        })
      : candidate.result.kind === "rejected"
        ? Object.freeze({
            kind: "rejected" as const,
            snapshot: finalizedSnapshot,
            reasons: candidate.result.reasons,
          })
        : Object.freeze({
            kind: "faulted" as const,
            snapshot: finalizedSnapshot,
            fault: candidate.result.fault,
          });

  return Object.freeze({
    result,
    diagnostics: candidate.diagnostics,
    preSnapshot: before,
    preStateDigest: digestCanonical("sillymaker:state:v1", before),
    postStateDigest: digestCanonical("sillymaker:state:v1", finalizedSnapshot),
  }) as FinalizedAttemptFor<TTypes>;
}

function createInternal<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
): InternalCompositionV1<TTypes> {
  type DispatchResult = Awaited<ReturnType<GameSessionV1<TTypes>["dispatch"]>>;

  runIntegrityV1Schema.parse(input.initialSnapshot.integrity);
  let snapshot = input.initialSnapshot;
  let stableStatus: Exclude<RuntimeSessionStatusV1, "busy"> = "ready";
  let pending = 0;
  let tail: Promise<void> = Promise.resolve();
  const commandLog = createCommandLogV1<
    TTypes["snapshot"],
    LoggedGameCommandFor<TTypes>,
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["fault"],
    TTypes["rngState"],
    TTypes["rngDrawTrace"]
  >({
    replayBase: input.initialSnapshot as DeepReadonly<TTypes["snapshot"]>,
    limit: 200,
  });
  const commandLogView: CommandLogViewFor<TTypes> = Object.freeze({
    entries: () => commandLog.entries(),
    replayBase: () => commandLog.replayBase(),
    replayBaseStateDigest: () => commandLog.replayBaseStateDigest(),
  });
  const listeners = new Set<() => void>();
  const committedSnapshotListeners = new Set<
    (snapshot: DeepReadonly<TTypes["snapshot"]>) => void
  >();

  const status = (): RuntimeSessionStatusV1 => (pending > 0 ? "busy" : stableStatus);
  const reportObserverFailure = (error: unknown): void => {
    try {
      input.onObserverFailure?.(error);
    } catch {
      // Observer reporting is diagnostics-only and must not affect authoritative work.
    }
  };
  const publish = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        reportObserverFailure(error);
      }
    }
  };
  const publishCommittedSnapshot = (): void => {
    const committed = snapshot as DeepReadonly<TTypes["snapshot"]>;
    for (const listener of [...committedSnapshotListeners]) {
      try {
        listener(committed);
      } catch (error) {
        reportObserverFailure(error);
      }
    }
  };

  function enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    pending += 1;
    publish();
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result.finally(() => {
      pending -= 1;
      publish();
    });
  }

  const runtimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]> = Object.freeze({
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<TTypes["snapshot"]>,
      ) => Promise<AuthoritativeOutcomeV1<TTypes["snapshot"], TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<TTypes["snapshot"]>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
    ): Promise<TResult> {
      return enqueue(async () => {
        try {
          const outcome = await operation(snapshot as DeepReadonly<TTypes["snapshot"]>);
          if (outcome.kind === "replace") {
            const finalized = finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
              snapshot as DeepReadonly<TTypes["snapshot"]>,
              outcome.snapshot,
              { kind: "accept_replacement" },
            );
            if (outcome.anchor === "preserve_log" && finalized !== snapshot) {
              throw new TypeError("preserve_log replacement changed the Snapshot");
            }
            const preparedCommandLogAnchor =
              outcome.anchor === "replace_replay_base"
                ? commandLog.prepareAnchor(finalized as DeepReadonly<TTypes["snapshot"]>)
                : null;
            prepareReplacementCommit?.(
              finalized as DeepReadonly<TTypes["snapshot"]>,
              outcome.anchor,
            );
            if (preparedCommandLogAnchor !== null) {
              commandLog.establishPreparedAnchor(preparedCommandLogAnchor);
            }
            snapshot = finalized;
            if (outcome.anchor === "replace_replay_base") stableStatus = "ready";
            publish();
          }
          return outcome.result;
        } catch (error) {
          stableStatus = "fault_paused";
          publish();
          return normalizeUnexpectedFault(error);
        }
      });
    },
    readAtQueueFront<TResult>(
      reader: (current: DeepReadonly<TTypes["snapshot"]>) => TResult,
    ): Promise<TResult> {
      return enqueue(async () => {
        const result = reader(snapshot as DeepReadonly<TTypes["snapshot"]>);
        if (isThenable(result)) {
          throw new TypeError("GameSession queue-front reader returned thenable");
        }
        return result;
      });
    },
    inspectForRuntime() {
      return Object.freeze({
        snapshot: snapshot as DeepReadonly<TTypes["snapshot"]>,
        status: status(),
      });
    },
    subscribeCommittedSnapshots(listener: (snapshot: DeepReadonly<TTypes["snapshot"]>) => void) {
      committedSnapshotListeners.add(listener);
      return () => committedSnapshotListeners.delete(listener);
    },
  });

  const session: GameSessionV1<TTypes> = Object.freeze({
    getStatus: status,
    getCurrentSnapshot: () => snapshot as DeepReadonly<TTypes["snapshot"]>,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(command: DeepReadonly<TTypes["command"]>): Promise<DispatchResult> {
      if (input.available === false) {
        return Promise.resolve(
          Object.freeze({ kind: "not_executed", code: "session_unavailable" }),
        );
      }
      if (stableStatus === "fault_paused" || stableStatus === "hmr_invalidated") {
        return Promise.resolve(Object.freeze({ kind: "not_executed", code: stableStatus }));
      }
      let parsed: TTypes["command"];
      try {
        parsed = input.commandSchema.parse(command);
      } catch {
        return Promise.resolve(Object.freeze({ kind: "not_executed", code: "validation_failed" }));
      }
      return enqueue(async () => {
        if (stableStatus === "fault_paused" || stableStatus === "hmr_invalidated") {
          return Object.freeze({
            kind: "not_executed" as const,
            code: stableStatus,
          });
        }
        const before = snapshot as DeepReadonly<TTypes["snapshot"]>;
        let candidate: AttemptFor<TTypes>;
        try {
          candidate = await input.executeAttempt(
            before,
            parsed as DeepReadonly<TTypes["command"]>,
            input.executionContext,
          );
        } catch (error) {
          candidate = input.normalizeUnexpectedDispatchFault(error, before);
        }
        let finalizedAttempt: FinalizedAttemptFor<TTypes>;
        try {
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(before, candidate);
        } catch (error) {
          candidate = input.normalizeUnexpectedDispatchFault(error, before);
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(before, candidate);
        }
        commandLog.append(
          Object.freeze({
            source: "game" as const,
            command: parsed as DeepReadonly<TTypes["command"]>,
          }),
          finalizedAttempt,
        );
        try {
          input.onAttempt?.(finalizedAttempt);
        } catch (error) {
          reportObserverFailure(error);
        }
        if (finalizedAttempt.result.kind === "committed") {
          snapshot = finalizedAttempt.result.snapshot;
          publish();
          publishCommittedSnapshot();
        } else if (finalizedAttempt.result.kind === "faulted") {
          stableStatus = "fault_paused";
          publish();
        }
        return Object.freeze({
          kind: "executed" as const,
          execution: finalizedAttempt.result,
        });
      });
    },
  });

  const privateControl: GameSessionPrivateControlV1 = Object.freeze({
    invalidateForHmr() {
      return enqueue(async () => {
        stableStatus = "hmr_invalidated";
        publish();
      });
    },
  });

  return Object.freeze({
    session,
    runtimeControl,
    commandLog: commandLogView,
    privateControl,
  });
}

export function createGameSessionV1<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
): GameSessionCompositionV1<TTypes> {
  const { session, runtimeControl, commandLog } = createInternal(input);
  return Object.freeze({ session, runtimeControl, commandLog });
}

/** @internal Base-owned test and Developer composition seam; not exported by the runtime barrel. */
export function createGameSessionInternalV1<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
): InternalCompositionV1<TTypes> {
  return createInternal(input);
}
