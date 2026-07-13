// SPDX-License-Identifier: MIT
import type { RngDrawTraceV1, RngStateV1, RuleRngV1 } from "./rng.js";

export type CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault> =
  | {
      readonly kind: "committed";
      readonly snapshot: TSnapshot;
      readonly facts: readonly TFact[];
    }
  | {
      readonly kind: "rejected";
      readonly snapshot: TSnapshot;
      readonly reasons: readonly TRejection[];
    }
  | {
      readonly kind: "faulted";
      readonly snapshot: TSnapshot;
      readonly fault: TFault;
    };

export interface CommandExecutionDiagnosticsEnvelopeV1<TRngState, TRngDrawTrace> {
  readonly committedRngBefore: TRngState;
  readonly attemptedDraws: readonly TRngDrawTrace[];
  readonly candidateRngAfter?: TRngState;
  readonly committedRngAfter: TRngState;
}

export interface CommandExecutionAttemptEnvelopeV1<
  TSnapshot,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> {
  readonly result: CommandExecutionResultEnvelopeV1<TSnapshot, TFact, TRejection, TFault>;
  readonly diagnostics: CommandExecutionDiagnosticsEnvelopeV1<TRngState, TRngDrawTrace>;
}

type SnapshotWithRng = { readonly rng: RngStateV1 };

function diagnostics(
  committedBefore: RngStateV1,
  committedAfter: RngStateV1,
  rng: RuleRngV1,
): CommandExecutionDiagnosticsEnvelopeV1<RngStateV1, RngDrawTraceV1> {
  return Object.freeze({
    committedRngBefore: committedBefore,
    attemptedDraws: rng.attemptedDraws(),
    candidateRngAfter: rng.candidateState(),
    committedRngAfter: committedAfter,
  });
}

export function commitAttemptV1<TSnapshot extends SnapshotWithRng, TFact>(
  committedBefore: TSnapshot,
  committedAfter: TSnapshot,
  rng: RuleRngV1,
  facts: readonly TFact[],
): CommandExecutionAttemptEnvelopeV1<TSnapshot, TFact, never, never, RngStateV1, RngDrawTraceV1> {
  return Object.freeze({
    result: Object.freeze({
      kind: "committed",
      snapshot: committedAfter,
      facts: Object.freeze([...facts]),
    }),
    diagnostics: diagnostics(committedBefore.rng, committedAfter.rng, rng),
  });
}

export function rejectAttemptV1<TSnapshot extends SnapshotWithRng, TRejection>(
  snapshot: TSnapshot,
  rng: RuleRngV1,
  reasons: readonly TRejection[],
): CommandExecutionAttemptEnvelopeV1<
  TSnapshot,
  never,
  TRejection,
  never,
  RngStateV1,
  RngDrawTraceV1
> {
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected",
      snapshot,
      reasons: Object.freeze([...reasons]),
    }),
    diagnostics: diagnostics(snapshot.rng, snapshot.rng, rng),
  });
}

export function faultAttemptV1<TSnapshot extends SnapshotWithRng, TFault>(
  snapshot: TSnapshot,
  rng: RuleRngV1,
  fault: TFault,
): CommandExecutionAttemptEnvelopeV1<TSnapshot, never, never, TFault, RngStateV1, RngDrawTraceV1> {
  return Object.freeze({
    result: Object.freeze({ kind: "faulted" as const, snapshot, fault }),
    diagnostics: diagnostics(snapshot.rng, snapshot.rng, rng),
  });
}
