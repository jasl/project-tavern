// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import { digestCanonical } from "../../contracts/digest.js";
import type { CommandExecutionResultEnvelopeV1 } from "../../contracts/execution.js";
import type { BuildProvenanceV1 } from "../../contracts/provenance.js";
import type { RunIntegrityV1 } from "../../contracts/snapshot.js";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import type { CommandLogCommandSourceV1, FinalizedCommandAttemptV1 } from "./command-log.js";

interface ReplaySnapshotV1 {
  readonly rng: unknown;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: RunIntegrityV1;
}

export interface ReplayIdentityV1 {
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly appBuildId?: Digest;
}

export type ReplayCommandSourceV1 = CommandLogCommandSourceV1;

export interface ReplayLoggedCommandV1<TSource extends ReplayCommandSourceV1, TCommand> {
  readonly source: TSource;
  readonly command: TCommand;
}

export type ReplayLoggedCommandShapeV1 = ReplayLoggedCommandV1<ReplayCommandSourceV1, unknown>;

export type ReplayRecordedOutcomeV1<TFact, TRejection, TFault> =
  | { readonly kind: "committed"; readonly facts: readonly TFact[] }
  | { readonly kind: "rejected"; readonly reasons: readonly TRejection[] }
  | { readonly kind: "faulted"; readonly fault: TFault };

export type ReplayCommandLogEntryV1<
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> = TLoggedCommand & {
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: TRngState;
  readonly attemptedDraws: readonly TRngDrawTrace[];
  readonly candidateRngAfter?: TRngState;
  readonly committedRngAfter: TRngState;
  readonly outcome: ReplayRecordedOutcomeV1<TFact, TRejection, TFault>;
};

type ReplayAttemptV1<
  TSnapshot extends ReplaySnapshotV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> = FinalizedCommandAttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>;

export interface ReplayDriverV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> {
  getCurrentSnapshot(): DeepReadonly<TSnapshot>;
  submit(
    command: DeepReadonly<TLoggedCommand>,
  ):
    | ReplayAttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>
    | PromiseLike<ReplayAttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>>;
}

export interface ReplayInputV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> {
  readonly recordedIdentity: ReplayIdentityV1;
  readonly runtimeIdentity: ReplayIdentityV1;
  readonly replayBase: DeepReadonly<TSnapshot>;
  readonly replayBaseStateDigest: Digest;
  readonly commandLog: readonly DeepReadonly<
    ReplayCommandLogEntryV1<TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace>
  >[];
  readonly currentSnapshot: DeepReadonly<TSnapshot>;
  readonly currentStateDigest: Digest;
  projectStableRejection(rejection: DeepReadonly<TRejection>): unknown;
  projectStableFault(fault: DeepReadonly<TFault>): unknown;
  createDriver(
    replayBase: DeepReadonly<TSnapshot>,
  ): ReplayDriverV1<TSnapshot, TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace>;
}

export type ReplayBlockingIdentityFieldV1 =
  "engine_digest" | "state_contract_revision" | "state_contract_digest" | "simulation_digest";

export type ReplayEntryMismatchFieldV1 =
  | "pre_state_digest"
  | "outcome"
  | "facts"
  | "reasons"
  | "fault"
  | "post_state_digest"
  | "command_sequence"
  | "committed_rng_before"
  | "attempted_draws"
  | "candidate_rng_after"
  | "committed_rng_after"
  | "session_state";

export type ReplayMismatchV1 =
  | {
      readonly scope: "identity";
      readonly field: ReplayBlockingIdentityFieldV1;
    }
  | {
      readonly scope: "replay_base";
      readonly field: "state_digest" | "integrity";
    }
  | {
      readonly scope: "entry";
      readonly logOrdinal: PositiveSafeInteger;
      readonly field: ReplayEntryMismatchFieldV1;
    }
  | {
      readonly scope: "final";
      readonly field: "declared_current_state_digest" | "integrity" | "current_state_digest";
    };

export interface ReplayComparisonV1 {
  readonly authoritative: boolean;
  readonly identityMatch: boolean;
  readonly visualMatch: boolean;
  readonly matches: boolean;
  readonly executedEntries: NonNegativeSafeInteger;
  readonly mismatches: readonly ReplayMismatchV1[];
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function dataEqualV1(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  try {
    return bytesEqualV1(canonicalJsonBytes(left), canonicalJsonBytes(right));
  } catch {
    return false;
  }
}

function stateDigestV1(snapshot: unknown): Digest {
  return digestCanonical("sillymaker:state:v1", snapshot);
}

function identityMismatchesV1(
  recorded: ReplayIdentityV1,
  runtime: ReplayIdentityV1,
): ReplayMismatchV1[] {
  const mismatches: ReplayMismatchV1[] = [];
  if (recorded.provenance.engine.digest !== runtime.provenance.engine.digest) {
    mismatches.push(Object.freeze({ scope: "identity", field: "engine_digest" }));
  }
  if (
    recorded.provenance.resolved.stateContractRevision !==
    runtime.provenance.resolved.stateContractRevision
  ) {
    mismatches.push(Object.freeze({ scope: "identity", field: "state_contract_revision" }));
  }
  if (
    recorded.provenance.resolved.stateContractDigest !==
    runtime.provenance.resolved.stateContractDigest
  ) {
    mismatches.push(Object.freeze({ scope: "identity", field: "state_contract_digest" }));
  }
  if (
    recorded.provenance.resolved.simulationDigest !== runtime.provenance.resolved.simulationDigest
  ) {
    mismatches.push(Object.freeze({ scope: "identity", field: "simulation_digest" }));
  }
  return mismatches;
}

function exactVisualIdentityV1(recorded: ReplayIdentityV1, runtime: ReplayIdentityV1): boolean {
  return (
    recorded.provenance.resolved.presentationDigest ===
      runtime.provenance.resolved.presentationDigest && recorded.appBuildId === runtime.appBuildId
  );
}

function sameMismatchV1(left: ReplayMismatchV1, right: ReplayMismatchV1): boolean {
  if (left.scope !== right.scope || left.field !== right.field) return false;
  return (
    left.scope !== "entry" || (right.scope === "entry" && left.logOrdinal === right.logOrdinal)
  );
}

function addMismatchV1(mismatches: ReplayMismatchV1[], mismatch: ReplayMismatchV1): void {
  if (!mismatches.some((existing) => sameMismatchV1(existing, mismatch))) {
    mismatches.push(Object.freeze(mismatch));
  }
}

function comparisonV1(
  authoritative: boolean,
  identityMatch: boolean,
  visualMatch: boolean,
  executedEntries: number,
  mismatches: readonly ReplayMismatchV1[],
): ReplayComparisonV1 {
  return Object.freeze({
    authoritative,
    identityMatch,
    visualMatch,
    matches: mismatches.length === 0,
    executedEntries: parseNonNegativeSafeInteger(executedEntries),
    mismatches: Object.freeze([...mismatches]),
  });
}

function compareOutcomeV1<TFact, TRejection, TFault>(
  recorded: DeepReadonly<ReplayRecordedOutcomeV1<TFact, TRejection, TFault>>,
  actual: DeepReadonly<CommandExecutionResultEnvelopeV1<unknown, TFact, TRejection, TFault>>,
  logOrdinal: PositiveSafeInteger,
  mismatches: ReplayMismatchV1[],
  projectStableRejection: (rejection: DeepReadonly<TRejection>) => unknown,
  projectStableFault: (fault: DeepReadonly<TFault>) => unknown,
): void {
  if (recorded.kind !== actual.kind) {
    addMismatchV1(mismatches, { scope: "entry", logOrdinal, field: "outcome" });
    return;
  }
  if (recorded.kind === "committed" && actual.kind === "committed") {
    if (!dataEqualV1(recorded.facts, actual.facts)) {
      addMismatchV1(mismatches, { scope: "entry", logOrdinal, field: "facts" });
    }
  } else if (recorded.kind === "rejected" && actual.kind === "rejected") {
    const recordedReasons = recorded.reasons.map(projectStableRejection);
    const actualReasons = actual.reasons.map(projectStableRejection);
    if (!dataEqualV1(recordedReasons, actualReasons)) {
      addMismatchV1(mismatches, { scope: "entry", logOrdinal, field: "reasons" });
    }
  } else if (recorded.kind === "faulted" && actual.kind === "faulted") {
    if (!dataEqualV1(projectStableFault(recorded.fault), projectStableFault(actual.fault))) {
      addMismatchV1(mismatches, { scope: "entry", logOrdinal, field: "fault" });
    }
  }
}

type AnyReplayInputV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> = ReplayInputV1<TSnapshot, TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace>;

async function compareReplayV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  input: AnyReplayInputV1<
    TSnapshot,
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
  mode: "authoritative" | "best_effort",
): Promise<ReplayComparisonV1> {
  const mismatches = identityMismatchesV1(input.recordedIdentity, input.runtimeIdentity);
  const identityMatch = mismatches.length === 0;
  const visualMatch =
    identityMatch && exactVisualIdentityV1(input.recordedIdentity, input.runtimeIdentity);
  if (mode === "authoritative" && !identityMatch) {
    return comparisonV1(false, false, false, 0, mismatches);
  }

  if (stateDigestV1(input.replayBase) !== input.replayBaseStateDigest) {
    addMismatchV1(mismatches, { scope: "replay_base", field: "state_digest" });
  }
  if (stateDigestV1(input.currentSnapshot) !== input.currentStateDigest) {
    addMismatchV1(mismatches, { scope: "final", field: "declared_current_state_digest" });
  }

  const driver = input.createDriver(input.replayBase);
  const driverBase = driver.getCurrentSnapshot();
  if (!dataEqualV1(driverBase.integrity, input.replayBase.integrity)) {
    addMismatchV1(mismatches, { scope: "replay_base", field: "integrity" });
  }
  if (stateDigestV1(driverBase) !== input.replayBaseStateDigest) {
    addMismatchV1(mismatches, { scope: "replay_base", field: "state_digest" });
  }

  let executedEntries = 0;
  for (const entry of input.commandLog) {
    const before = driver.getCurrentSnapshot();
    if (stateDigestV1(before) !== entry.preStateDigest) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "pre_state_digest",
      });
    }
    const command = Object.freeze({
      source: entry.source,
      command: entry.command,
    }) as DeepReadonly<TLoggedCommand>;
    const attempt = await driver.submit(command);
    executedEntries += 1;
    const after = attempt.result.snapshot as DeepReadonly<TSnapshot>;

    compareOutcomeV1(
      entry.outcome,
      attempt.result,
      entry.logOrdinal,
      mismatches,
      input.projectStableRejection,
      input.projectStableFault,
    );
    if (
      attempt.preStateDigest !== entry.preStateDigest ||
      stateDigestV1(attempt.preSnapshot) !== entry.preStateDigest
    ) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "pre_state_digest",
      });
    }
    if (
      attempt.postStateDigest !== entry.postStateDigest ||
      stateDigestV1(after) !== entry.postStateDigest
    ) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "post_state_digest",
      });
    }
    if (
      before.commandSequence !== entry.commandSequence.before ||
      after.commandSequence !== entry.commandSequence.after
    ) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "command_sequence",
      });
    }
    if (!dataEqualV1(attempt.diagnostics.committedRngBefore, entry.committedRngBefore)) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "committed_rng_before",
      });
    }
    if (!dataEqualV1(attempt.diagnostics.attemptedDraws, entry.attemptedDraws)) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "attempted_draws",
      });
    }
    if (!dataEqualV1(attempt.diagnostics.candidateRngAfter, entry.candidateRngAfter)) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "candidate_rng_after",
      });
    }
    if (!dataEqualV1(attempt.diagnostics.committedRngAfter, entry.committedRngAfter)) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "committed_rng_after",
      });
    }
    if (stateDigestV1(driver.getCurrentSnapshot()) !== stateDigestV1(after)) {
      addMismatchV1(mismatches, {
        scope: "entry",
        logOrdinal: entry.logOrdinal,
        field: "session_state",
      });
    }
  }

  const finalSnapshot = driver.getCurrentSnapshot();
  if (!dataEqualV1(finalSnapshot.integrity, input.currentSnapshot.integrity)) {
    addMismatchV1(mismatches, { scope: "final", field: "integrity" });
  }
  if (stateDigestV1(finalSnapshot) !== input.currentStateDigest) {
    addMismatchV1(mismatches, { scope: "final", field: "current_state_digest" });
  }
  return comparisonV1(
    mode === "authoritative" && identityMatch,
    identityMatch,
    visualMatch,
    executedEntries,
    mismatches,
  );
}

export function replayAuthoritativelyV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  input: ReplayInputV1<
    TSnapshot,
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
): Promise<ReplayComparisonV1> {
  return compareReplayV1(input, "authoritative");
}

export function inspectReplayBestEffortV1<
  TSnapshot extends ReplaySnapshotV1,
  TLoggedCommand extends ReplayLoggedCommandShapeV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  input: ReplayInputV1<
    TSnapshot,
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
): Promise<ReplayComparisonV1> {
  return compareReplayV1(input, "best_effort");
}
