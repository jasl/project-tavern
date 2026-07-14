// SPDX-License-Identifier: MIT
import { digestCanonical } from "../../contracts/digest.js";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "../../contracts/values.js";
import { parsePositiveSafeInteger } from "../../contracts/values.js";

interface CommandLogSnapshotV1 {
  readonly rng: unknown;
  readonly commandSequence: NonNegativeSafeInteger;
}

export type CommandLogCommandSourceV1 = "game" | "debug";

interface LoggedCommandShapeV1 {
  readonly source: CommandLogCommandSourceV1;
  readonly command: unknown;
}

interface CommandLogEntryBaseForV1<TRngState, TRngDrawTrace> {
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
}

type CommandLogOutcomeV1<TFact, TRejection, TFault> =
  | { readonly kind: "committed"; readonly facts: readonly TFact[] }
  | { readonly kind: "rejected"; readonly reasons: readonly TRejection[] }
  | { readonly kind: "faulted"; readonly fault: TFault };

type CommandLogEntryForV1<TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace> =
  DeepReadonly<
    CommandLogEntryBaseForV1<TRngState, TRngDrawTrace> &
      TLoggedCommand & {
        readonly outcome: CommandLogOutcomeV1<TFact, TRejection, TFault>;
      }
  >;

interface InternalCommandLogEntryV1<TSnapshot, TEntry> {
  readonly entry: TEntry;
  readonly postAttemptSnapshot: DeepReadonly<TSnapshot>;
}

export type FinalizedCommandAttemptV1<
  TSnapshot extends CommandLogSnapshotV1 = CommandLogSnapshotV1,
  TFact = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
> = DeepReadonly<
  CommandExecutionAttemptEnvelopeV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>
> & {
  readonly preSnapshot: DeepReadonly<TSnapshot>;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
};

interface PreparedCommandLogAnchorV1<TSnapshot> {
  readonly snapshot: DeepReadonly<TSnapshot>;
  readonly stateDigest: Digest;
  readonly nextOrdinal: PositiveSafeInteger;
  readonly emptyEntries: readonly never[];
}

export interface CommandLogV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1,
  TFact = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
> {
  append(
    loggedCommand: DeepReadonly<TLoggedCommand>,
    finalizedAttempt: FinalizedCommandAttemptV1<
      TSnapshot,
      TFact,
      TRejection,
      TFault,
      TRngState,
      TRngDrawTrace
    >,
  ): CommandLogEntryForV1<TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace>;
  entries(): readonly CommandLogEntryForV1<
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >[];
  replayBase(): DeepReadonly<TSnapshot>;
  replayBaseStateDigest(): Digest;
  prepareAnchor(snapshot: DeepReadonly<TSnapshot>): PreparedCommandLogAnchorV1<TSnapshot>;
  establishPreparedAnchor(prepared: PreparedCommandLogAnchorV1<TSnapshot>): void;
  establishAnchor(snapshot: DeepReadonly<TSnapshot>): void;
}

const commandLogMaximumEntriesV1 = 200;

function createOutcomeV1<
  TSnapshot extends CommandLogSnapshotV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  attempt: FinalizedCommandAttemptV1<
    TSnapshot,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
): DeepReadonly<CommandLogOutcomeV1<TFact, TRejection, TFault>> {
  switch (attempt.result.kind) {
    case "committed":
      return Object.freeze({
        kind: "committed",
        facts: Object.freeze([...attempt.result.facts]),
      });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        reasons: Object.freeze([...attempt.result.reasons]),
      });
    case "faulted":
      return Object.freeze({ kind: "faulted", fault: attempt.result.fault });
  }
  throw new TypeError("Finalized command attempt has an invalid outcome");
}

function validateFinalizedAttemptV1<
  TSnapshot extends CommandLogSnapshotV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  expectedPreSnapshot: DeepReadonly<TSnapshot>,
  attempt: FinalizedCommandAttemptV1<
    TSnapshot,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
): void {
  if (attempt.preSnapshot !== expectedPreSnapshot) {
    throw new TypeError("Finalized command attempt breaks snapshot continuity");
  }
  if (attempt.preStateDigest !== digestCanonical("sillymaker:state:v1", attempt.preSnapshot)) {
    throw new TypeError("Finalized command attempt pre-state digest mismatch");
  }
  if (attempt.postStateDigest !== digestCanonical("sillymaker:state:v1", attempt.result.snapshot)) {
    throw new TypeError("Finalized command attempt post-state digest mismatch");
  }
  if (attempt.result.kind !== "committed" && attempt.result.snapshot !== attempt.preSnapshot) {
    throw new TypeError("Non-committed finalized attempt changed the Snapshot");
  }
}

export function createCommandLogV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1 = LoggedCommandShapeV1,
  TFact = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
>(input: {
  readonly replayBase: DeepReadonly<TSnapshot>;
  readonly limit: number;
}): CommandLogV1<TSnapshot, TLoggedCommand, TFact, TRejection, TFault, TRngState, TRngDrawTrace> {
  type PublicEntry = CommandLogEntryForV1<
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >;
  type InternalEntry = InternalCommandLogEntryV1<TSnapshot, PublicEntry>;

  const limit = parsePositiveSafeInteger(input.limit);
  if (limit > commandLogMaximumEntriesV1) {
    throw new TypeError(`CommandLog limit exceeds ${commandLogMaximumEntriesV1}`);
  }

  let replayBase = input.replayBase;
  let replayBaseDigest = digestCanonical("sillymaker:state:v1", replayBase);
  let nextOrdinal = parsePositiveSafeInteger(1);
  const internalEntries: InternalEntry[] = [];
  let publicEntries: readonly PublicEntry[] = Object.freeze([]);

  const publishEntries = (): void => {
    publicEntries = Object.freeze(internalEntries.map(({ entry }) => entry));
  };

  const log: CommandLogV1<
    TSnapshot,
    TLoggedCommand,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  > = {
    append(loggedCommand, finalizedAttempt) {
      if (loggedCommand.source !== "game" && loggedCommand.source !== "debug") {
        throw new TypeError("CommandLog source must be game or debug");
      }
      if (loggedCommand.source === "debug" && finalizedAttempt.result.kind === "rejected") {
        throw new TypeError("Debug CommandLog entries cannot be rejected");
      }
      const preAttemptSnapshot = internalEntries.at(-1)?.postAttemptSnapshot ?? replayBase;
      validateFinalizedAttemptV1(preAttemptSnapshot, finalizedAttempt);

      const postAttemptSnapshot = finalizedAttempt.result.snapshot;
      const diagnostics = finalizedAttempt.diagnostics;
      const entry = Object.freeze({
        ...loggedCommand,
        logOrdinal: nextOrdinal,
        preStateDigest: finalizedAttempt.preStateDigest,
        postStateDigest: finalizedAttempt.postStateDigest,
        commandSequence: Object.freeze({
          before: finalizedAttempt.preSnapshot.commandSequence,
          after: postAttemptSnapshot.commandSequence,
        }),
        committedRngBefore: diagnostics.committedRngBefore,
        attemptedDraws: Object.freeze([...diagnostics.attemptedDraws]),
        ...(diagnostics.candidateRngAfter === undefined
          ? {}
          : { candidateRngAfter: diagnostics.candidateRngAfter }),
        committedRngAfter: diagnostics.committedRngAfter,
        outcome: createOutcomeV1(finalizedAttempt),
      }) as PublicEntry;
      const followingOrdinal = parsePositiveSafeInteger(nextOrdinal + 1);
      const internalEntry = Object.freeze({
        entry,
        postAttemptSnapshot,
      }) as InternalEntry;

      if (internalEntries.length === limit) {
        const evicted = internalEntries[0];
        if (evicted === undefined) throw new TypeError("CommandLog eviction invariant failed");
        replayBase = evicted.postAttemptSnapshot;
        replayBaseDigest = evicted.entry.postStateDigest;
        internalEntries.shift();
      }
      internalEntries.push(internalEntry);
      nextOrdinal = followingOrdinal;
      publishEntries();
      return entry;
    },
    entries: () => publicEntries,
    replayBase: () => replayBase,
    replayBaseStateDigest: () => replayBaseDigest,
    prepareAnchor(snapshot) {
      return Object.freeze({
        snapshot,
        stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
        nextOrdinal: parsePositiveSafeInteger(1),
        emptyEntries: Object.freeze([]),
      });
    },
    establishPreparedAnchor(prepared) {
      replayBase = prepared.snapshot;
      replayBaseDigest = prepared.stateDigest;
      internalEntries.length = 0;
      nextOrdinal = prepared.nextOrdinal;
      publicEntries = prepared.emptyEntries;
    },
    establishAnchor(snapshot) {
      log.establishPreparedAnchor(log.prepareAnchor(snapshot));
    },
  };

  return Object.freeze(log);
}
