// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.js";
import { commitAttemptV1, faultAttemptV1, rejectAttemptV1 } from "../../contracts/execution.js";
import type { PatchSetIdentityV1 } from "../../contracts/hotfix.js";
import type { BuildProvenanceV1 } from "../../contracts/provenance.js";
import type { RngDrawTraceV1, RngStateV1 } from "../../contracts/rng.js";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.js";
import type { GameSnapshotEnvelopeV1, RunIntegrityV1 } from "../../contracts/snapshot.js";
import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.js";
import type { Digest, NonNegativeSafeInteger } from "../../contracts/values.js";
import { digestCanonical } from "../../contracts/digest.js";
import { digestBytes } from "../../contracts/digest.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.js";
import type { FinalizedCommandAttemptV1 } from "./command-log.js";
import { markRunModifiedV1 } from "../session/run-integrity.js";
import { inspectReplayBestEffortV1, replayAuthoritativelyV1 } from "./replay.js";
import type {
  ReplayCommandLogEntryV1,
  ReplayDriverV1,
  ReplayIdentityV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
  ReplayRecordedOutcomeV1,
} from "./replay.js";

interface SyntheticStateV1 {
  readonly value: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, RngStateV1>;

type SyntheticCommandV1 =
  | { readonly kind: "add"; readonly amount: NonNegativeSafeInteger }
  | { readonly kind: "reject"; readonly code: string }
  | { readonly kind: "fault"; readonly code: string };

type SyntheticDebugCommandV1 = {
  readonly kind: "debug_add";
  readonly amount: NonNegativeSafeInteger;
};

interface SyntheticFactV1 {
  readonly kind: "value.changed";
  readonly before: NonNegativeSafeInteger;
  readonly after: NonNegativeSafeInteger;
}

interface SyntheticRejectionV1 {
  readonly code: string;
  readonly slot: "synthetic" | "other";
  readonly message: string;
}

interface SyntheticFaultV1 {
  readonly code: string;
  readonly operation: "synthetic.execute";
  readonly message: string;
  readonly stack: string;
}

type SyntheticLoggedCommandV1 =
  | ReplayLoggedCommandV1<"game", SyntheticCommandV1>
  | ReplayLoggedCommandV1<"debug", SyntheticDebugCommandV1>;

type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticFactV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  SyntheticSnapshotV1,
  SyntheticFactV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticEntryV1 = ReplayCommandLogEntryV1<
  SyntheticLoggedCommandV1,
  SyntheticFactV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticReplayInputV1 = ReplayInputV1<
  SyntheticSnapshotV1,
  SyntheticLoggedCommandV1,
  SyntheticFactV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

const textEncoderV1 = new TextEncoder();
const digestV1 = (label: string): Digest => digestBytes(textEncoderV1.encode(label));
const stateDigestV1 = (snapshot: SyntheticSnapshotV1): Digest =>
  digestCanonical("sillymaker:state:v1", snapshot);

function patchSetV1(label = "current"): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch:${label}`),
    simulationDigest: digestV1(`patch:simulation:${label}`),
    presentationDigest: digestV1(`patch:presentation:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

function provenanceV1(
  overrides: {
    readonly storyId?: string;
    readonly storyRevision?: number;
    readonly storyDigest?: Digest;
    readonly engineVersion?: string;
    readonly engineDigest?: Digest;
    readonly stateContractRevision?: number;
    readonly stateContractDigest?: Digest;
    readonly simulationDigest?: Digest;
    readonly presentationDigest?: Digest;
    readonly patchSet?: PatchSetIdentityV1;
  } = {},
): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: overrides.storyId ?? "story.replay-test",
      revision: parsePositiveSafeInteger(overrides.storyRevision ?? 1),
      digest: overrides.storyDigest ?? digestV1("story"),
    }),
    engine: Object.freeze({
      version: overrides.engineVersion ?? "1.0.0",
      digest: overrides.engineDigest ?? digestV1("engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(overrides.stateContractRevision ?? 1),
      stateContractDigest: overrides.stateContractDigest ?? digestV1("state-contract"),
      simulationDigest: overrides.simulationDigest ?? digestV1("simulation"),
      presentationDigest: overrides.presentationDigest ?? digestV1("presentation"),
      patchSet: overrides.patchSet ?? patchSetV1(),
    }),
  });
}

function identityV1(provenance: BuildProvenanceV1, appBuildId?: Digest): ReplayIdentityV1 {
  return Object.freeze(appBuildId === undefined ? { provenance } : { provenance, appBuildId });
}

function rngStateV1(cursor: number, rawDrawCount: number): RngStateV1 {
  return rngStateV1Schema.parse({ algorithm: "xorshift32-v1", cursor, rawDrawCount });
}

function snapshotV1(
  value: number,
  commandSequence: number,
  rng = rngStateV1(0x1234_5678, 0),
  integrity: RunIntegrityV1 = createPristineRunIntegrityV1(),
): SyntheticSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({ value: parseNonNegativeSafeInteger(value) }),
    rng,
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
    integrity,
  });
}

function modifiedIntegrityV1(): RunIntegrityV1 {
  return Object.freeze({
    mode: "modified",
    mutationCount: parseNonNegativeSafeInteger(1),
    firstMutationSequence: parseNonNegativeSafeInteger(0),
    reasons: Object.freeze([
      Object.freeze({
        kind: "fixture_anchor" as const,
        fixtureId: "fixture.replay-test",
        sequence: parseNonNegativeSafeInteger(0),
      }),
    ]),
  });
}

function executeAttemptV1(
  snapshot: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): SyntheticAttemptV1 {
  const rng = createTransactionalRngV1(snapshot.rng);
  if (logged.source === "debug") {
    const commandSequence = parseNonNegativeSafeInteger(snapshot.commandSequence + 1);
    const afterValue = parseNonNegativeSafeInteger(snapshot.state.value + logged.command.amount);
    const committed = snapshotV1(
      afterValue,
      commandSequence,
      snapshot.rng,
      markRunModifiedV1(snapshot.integrity, {
        kind: "debug_command",
        commandKind: logged.command.kind,
        sequence: commandSequence,
      }),
    );
    return commitAttemptV1(snapshot, committed, rng, [
      Object.freeze({ kind: "value.changed", before: snapshot.state.value, after: afterValue }),
    ]);
  }
  rng.nextInt({ purpose: `check:replay.${logged.command.kind}`, exclusiveMax: 10 });
  if (logged.command.kind === "reject") {
    return rejectAttemptV1(snapshot, rng, [
      Object.freeze({
        code: logged.command.code,
        slot: "synthetic" as const,
        message: "non-authoritative rejection detail",
      }),
    ]);
  }
  if (logged.command.kind === "fault") {
    return faultAttemptV1(
      snapshot,
      rng,
      Object.freeze({
        code: logged.command.code,
        operation: "synthetic.execute" as const,
        message: "non-authoritative fault detail",
        stack: "synthetic stack",
      }),
    );
  }
  const afterValue = parseNonNegativeSafeInteger(snapshot.state.value + logged.command.amount);
  const committed = snapshotV1(
    afterValue,
    snapshot.commandSequence + 1,
    rng.candidateState(),
    snapshot.integrity,
  );
  return commitAttemptV1(snapshot, committed, rng, [
    Object.freeze({ kind: "value.changed", before: snapshot.state.value, after: afterValue }),
  ]);
}

function finalizedAttemptV1(
  before: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): SyntheticFinalizedAttemptV1 {
  const attempt = executeAttemptV1(before, logged);
  return Object.freeze({
    ...attempt,
    preSnapshot: before,
    preStateDigest: stateDigestV1(before),
    postStateDigest: stateDigestV1(attempt.result.snapshot),
  });
}

function outcomeV1(
  attempt: SyntheticAttemptV1,
): ReplayRecordedOutcomeV1<SyntheticFactV1, SyntheticRejectionV1, SyntheticFaultV1> {
  if (attempt.result.kind === "committed") {
    return Object.freeze({ kind: "committed", facts: attempt.result.facts });
  }
  if (attempt.result.kind === "rejected") {
    return Object.freeze({ kind: "rejected", reasons: attempt.result.reasons });
  }
  return Object.freeze({ kind: "faulted", fault: attempt.result.fault });
}

function entryV1(
  ordinal: number,
  before: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): { readonly entry: SyntheticEntryV1; readonly after: SyntheticSnapshotV1 } {
  const attempt = finalizedAttemptV1(before, logged);
  const after = attempt.result.snapshot;
  const candidateRngAfter = attempt.diagnostics.candidateRngAfter;
  const entryBase = Object.freeze({
    logOrdinal: parsePositiveSafeInteger(ordinal),
    preStateDigest: stateDigestV1(before),
    postStateDigest: stateDigestV1(after),
    commandSequence: Object.freeze({
      before: before.commandSequence,
      after: after.commandSequence,
    }),
    committedRngBefore: attempt.diagnostics.committedRngBefore,
    attemptedDraws: attempt.diagnostics.attemptedDraws,
    ...(candidateRngAfter === undefined ? {} : { candidateRngAfter }),
    committedRngAfter: attempt.diagnostics.committedRngAfter,
    outcome: outcomeV1(attempt),
  });
  const entry: SyntheticEntryV1 =
    logged.source === "game"
      ? Object.freeze({
          ...entryBase,
          source: "game" as const,
          command: logged.command,
        })
      : Object.freeze({
          ...entryBase,
          source: "debug" as const,
          command: logged.command,
        });
  return Object.freeze({
    entry,
    after,
  });
}

function corpusV1() {
  const replayBase = snapshotV1(0, 0);
  const commands: readonly SyntheticLoggedCommandV1[] = Object.freeze([
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({
        kind: "add" as const,
        amount: parseNonNegativeSafeInteger(2),
      }),
    }),
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({ kind: "reject" as const, code: "synthetic.closed" }),
    }),
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({ kind: "fault" as const, code: "synthetic.boom" }),
    }),
  ]);
  const entries: SyntheticEntryV1[] = [];
  let current = replayBase;
  commands.forEach((command, index) => {
    const finalized = entryV1(index + 1, current, command);
    entries.push(finalized.entry);
    current = finalized.after;
  });
  return Object.freeze({ replayBase, entries: Object.freeze(entries), current });
}

function createDriverV1(
  base: SyntheticSnapshotV1,
  submitted: SyntheticLoggedCommandV1[],
): ReplayDriverV1<
  SyntheticSnapshotV1,
  SyntheticLoggedCommandV1,
  SyntheticFactV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
> {
  let current = base;
  return Object.freeze({
    getCurrentSnapshot: () => current,
    async submit(command: SyntheticLoggedCommandV1) {
      submitted.push(command);
      const attempt = finalizedAttemptV1(current, command);
      current = attempt.result.snapshot;
      return attempt;
    },
  });
}

function fixtureV1(overrides: Partial<SyntheticReplayInputV1> = {}): {
  readonly input: SyntheticReplayInputV1;
  readonly submitted: SyntheticLoggedCommandV1[];
} {
  const corpus = corpusV1();
  const submitted: SyntheticLoggedCommandV1[] = [];
  const provenance = provenanceV1();
  const input: SyntheticReplayInputV1 = {
    recordedIdentity: identityV1(provenance, digestV1("app-build")),
    runtimeIdentity: identityV1(provenance, digestV1("app-build")),
    replayBase: corpus.replayBase,
    replayBaseStateDigest: stateDigestV1(corpus.replayBase),
    commandLog: corpus.entries,
    currentSnapshot: corpus.current,
    currentStateDigest: stateDigestV1(corpus.current),
    projectStableRejection: ({ code, slot }) => Object.freeze({ code, slot }),
    projectStableFault: ({ code }) => Object.freeze({ code }),
    createDriver: (base) => createDriverV1(base, submitted),
    ...overrides,
  };
  return Object.freeze({ input, submitted });
}

function replaceEntryV1(
  entries: readonly SyntheticEntryV1[],
  index: number,
  replacement: SyntheticEntryV1,
): readonly SyntheticEntryV1[] {
  return Object.freeze(
    entries.map((entry, entryIndex) => (entryIndex === index ? replacement : entry)),
  );
}

describe("authoritative replay", () => {
  it.each([
    ["engine_digest", { engineDigest: digestV1("engine.other") }],
    ["state_contract_revision", { stateContractRevision: 2 }],
    ["state_contract_digest", { stateContractDigest: digestV1("state.other") }],
    ["simulation_digest", { simulationDigest: digestV1("simulation.other") }],
  ] as const)("blocks on %s before creating or reading a replay session", async (field, change) => {
    const fixture = fixtureV1();
    const createDriver = vi.fn(fixture.input.createDriver);
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      runtimeIdentity: identityV1(provenanceV1(change), fixture.input.runtimeIdentity.appBuildId),
      createDriver,
    });

    expect(result).toMatchObject({
      authoritative: false,
      identityMatch: false,
      visualMatch: false,
      matches: false,
      executedEntries: 0,
      mismatches: [{ scope: "identity", field }],
    });
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("ignores non-blocking provenance drift and reports presentation/app drift only visually", async () => {
    const fixture = fixtureV1();
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      runtimeIdentity: identityV1(
        provenanceV1({
          storyId: "story.other",
          storyRevision: 9,
          storyDigest: digestV1("story.other"),
          engineVersion: "display-only",
          presentationDigest: digestV1("presentation.other"),
          patchSet: patchSetV1("other"),
        }),
        digestV1("app-build.other"),
      ),
    });

    expect(result).toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
  });

  it("compares mixed outcomes, ordered facts, digests, sequence, and every RNG field", async () => {
    const fixture = fixtureV1();
    await expect(replayAuthoritativelyV1(fixture.input)).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(fixture.submitted).toHaveLength(3);
    expect(
      fixture.submitted.every(
        (command) => Object.keys(command).toSorted().join() === "command,source",
      ),
    ).toBe(true);
  });

  it("routes Game and Debug log entries through one isolated driver and compares modified integrity", async () => {
    const replayBase = snapshotV1(0, 0);
    const game = Object.freeze({
      source: "game" as const,
      command: Object.freeze({
        kind: "add" as const,
        amount: parseNonNegativeSafeInteger(2),
      }),
    });
    const debug = Object.freeze({
      source: "debug" as const,
      command: Object.freeze({
        kind: "debug_add" as const,
        amount: parseNonNegativeSafeInteger(3),
      }),
    });
    const first = entryV1(1, replayBase, game);
    const second = entryV1(2, first.after, debug);
    const submitted: SyntheticLoggedCommandV1[] = [];
    const provenance = provenanceV1();

    await expect(
      replayAuthoritativelyV1({
        recordedIdentity: identityV1(provenance),
        runtimeIdentity: identityV1(provenance),
        replayBase,
        replayBaseStateDigest: stateDigestV1(replayBase),
        commandLog: Object.freeze([first.entry, second.entry]),
        currentSnapshot: second.after,
        currentStateDigest: stateDigestV1(second.after),
        projectStableRejection: ({ code, slot }: SyntheticRejectionV1) =>
          Object.freeze({ code, slot }),
        projectStableFault: ({ code }: SyntheticFaultV1) => Object.freeze({ code }),
        createDriver: (base: SyntheticSnapshotV1) => createDriverV1(base, submitted),
      }),
    ).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 2,
      mismatches: [],
    });
    expect(submitted.map(({ source }) => source)).toEqual(["game", "debug"]);
    expect(second.after.integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      reasons: [{ kind: "debug_command", commandKind: "debug_add", sequence: 2 }],
    });
  });

  it("ignores rejection message and fault message/stack drift outside stable projections", async () => {
    const fixture = fixtureV1();
    const rejection = fixture.input.commandLog[1];
    const fault = fixture.input.commandLog[2];
    if (rejection?.outcome.kind !== "rejected" || fault?.outcome.kind !== "faulted") {
      throw new TypeError("missing stable projection fixtures");
    }
    const changedRejection: SyntheticEntryV1 = Object.freeze({
      ...rejection,
      outcome: Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          rejection.outcome.reasons.map((reason) =>
            Object.freeze({ ...reason, message: "different local wording" }),
          ),
        ),
      }),
    });
    const changedFault: SyntheticEntryV1 = Object.freeze({
      ...fault,
      outcome: Object.freeze({
        kind: "faulted",
        fault: Object.freeze({
          ...fault.outcome.fault,
          message: "different local fault wording",
          stack: "different local stack",
        }),
      }),
    });
    const withRejection = replaceEntryV1(fixture.input.commandLog, 1, changedRejection);

    await expect(
      replayAuthoritativelyV1({
        ...fixture.input,
        commandLog: replaceEntryV1(withRejection, 2, changedFault),
      }),
    ).resolves.toMatchObject({ matches: true, mismatches: [] });
  });

  it("detects stable rejection slot drift", async () => {
    const fixture = fixtureV1();
    const rejection = fixture.input.commandLog[1];
    if (rejection?.outcome.kind !== "rejected") {
      throw new TypeError("missing rejection slot fixture");
    }
    const replacement: SyntheticEntryV1 = Object.freeze({
      ...rejection,
      outcome: Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          rejection.outcome.reasons.map((reason) =>
            Object.freeze({ ...reason, slot: "other" as const }),
          ),
        ),
      }),
    });
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      commandLog: replaceEntryV1(fixture.input.commandLog, 1, replacement),
    });

    expect(result.matches).toBe(false);
    expect(result.mismatches).toContainEqual({
      scope: "entry",
      logOrdinal: rejection.logOrdinal,
      field: "reasons",
    });
  });

  it.each([
    ["outcome", 0],
    ["facts", 0],
    ["reasons", 1],
    ["fault", 2],
    ["pre_state_digest", 0],
    ["post_state_digest", 0],
    ["command_sequence", 0],
    ["attempted_draws", 0],
    ["committed_rng_before", 0],
    ["candidate_rng_after", 0],
    ["committed_rng_after", 0],
  ] as const)(
    "detects a recorded %s mismatch without applying log evidence",
    async (field, index) => {
      const fixture = fixtureV1();
      const original = fixture.input.commandLog[index];
      if (original === undefined) throw new TypeError("missing replay mutation entry");
      let replacement: SyntheticEntryV1;
      if (field === "outcome") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "rejected" as const,
            reasons: Object.freeze([
              Object.freeze({
                code: "synthetic.closed",
                slot: "synthetic" as const,
                message: "diagnostic detail",
              }),
            ]),
          }),
        });
      } else if (field === "facts") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "committed" as const,
            facts: Object.freeze([
              Object.freeze({
                kind: "value.changed" as const,
                before: parseNonNegativeSafeInteger(999),
                after: parseNonNegativeSafeInteger(1_000),
              }),
            ]),
          }),
        });
      } else if (field === "reasons") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "rejected" as const,
            reasons: Object.freeze([
              Object.freeze({
                code: "synthetic.other",
                slot: "synthetic" as const,
                message: "changed diagnostic message",
              }),
            ]),
          }),
        });
      } else if (field === "fault") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "faulted" as const,
            fault: Object.freeze({
              code: "synthetic.other",
              operation: "synthetic.execute" as const,
              message: "changed diagnostic message",
              stack: "changed diagnostic stack",
            }),
          }),
        });
      } else if (field === "pre_state_digest") {
        replacement = Object.freeze({ ...original, preStateDigest: digestV1(`wrong.${field}`) });
      } else if (field === "post_state_digest") {
        replacement = Object.freeze({ ...original, postStateDigest: digestV1(`wrong.${field}`) });
      } else if (field === "command_sequence") {
        replacement = Object.freeze({
          ...original,
          commandSequence: Object.freeze({
            before: parseNonNegativeSafeInteger(99),
            after: original.commandSequence.after,
          }),
        });
      } else if (field === "attempted_draws") {
        replacement = Object.freeze({ ...original, attemptedDraws: Object.freeze([]) });
      } else if (field === "candidate_rng_after") {
        replacement = Object.freeze({ ...original, candidateRngAfter: rngStateV1(7, 7) });
      } else if (field === "committed_rng_before") {
        replacement = Object.freeze({ ...original, committedRngBefore: rngStateV1(7, 7) });
      } else {
        replacement = Object.freeze({ ...original, committedRngAfter: rngStateV1(7, 7) });
      }

      const result = await replayAuthoritativelyV1({
        ...fixture.input,
        commandLog: replaceEntryV1(fixture.input.commandLog, index, replacement),
      });
      expect(result.matches).toBe(false);
      expect(result.mismatches).toContainEqual({
        scope: "entry",
        logOrdinal: original.logOrdinal,
        field,
      });
      expect(result.mismatches).not.toContainEqual({
        scope: "final",
        field: "current_state_digest",
      });
      expect(fixture.submitted).toHaveLength(3);
    },
  );

  it("checks both declared digests and base/final integrity even for an empty log", async () => {
    const base = snapshotV1(4, 0);
    const submitted: SyntheticLoggedCommandV1[] = [];
    const provenance = provenanceV1();
    const result = await replayAuthoritativelyV1({
      recordedIdentity: identityV1(provenance),
      runtimeIdentity: identityV1(provenance),
      replayBase: base,
      replayBaseStateDigest: digestV1("wrong.base"),
      commandLog: Object.freeze([]),
      currentSnapshot: snapshotV1(4, 0, base.rng, modifiedIntegrityV1()),
      currentStateDigest: digestV1("wrong.current"),
      projectStableRejection: ({ code, slot }) => Object.freeze({ code, slot }),
      projectStableFault: ({ code }) => Object.freeze({ code }),
      createDriver: (snapshot) => createDriverV1(snapshot, submitted),
    });

    expect(result.executedEntries).toBe(0);
    expect(result.matches).toBe(false);
    expect(result.mismatches).toEqual(
      expect.arrayContaining([
        { scope: "replay_base", field: "state_digest" },
        { scope: "final", field: "declared_current_state_digest" },
        { scope: "final", field: "integrity" },
        { scope: "final", field: "current_state_digest" },
      ]),
    );
    expect(submitted).toEqual([]);
  });

  it("detects an isolated driver that does not preserve replay-base integrity", async () => {
    const fixture = fixtureV1();
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      createDriver: (base) =>
        createDriverV1(
          snapshotV1(base.state.value, base.commandSequence, base.rng, modifiedIntegrityV1()),
          fixture.submitted,
        ),
    });

    expect(result.matches).toBe(false);
    expect(result.mismatches).toContainEqual({ scope: "replay_base", field: "integrity" });
  });
});

describe("best-effort replay inspection", () => {
  it("executes only in an isolated driver across blocking drift but never claims authority", async () => {
    const fixture = fixtureV1();
    const result = await inspectReplayBestEffortV1({
      ...fixture.input,
      runtimeIdentity: identityV1(provenanceV1({ simulationDigest: digestV1("simulation.other") })),
    });

    expect(result).toMatchObject({
      authoritative: false,
      identityMatch: false,
      visualMatch: false,
      matches: false,
      executedEntries: 3,
    });
    expect(result.mismatches).toContainEqual({ scope: "identity", field: "simulation_digest" });
    expect(fixture.submitted).toHaveLength(3);
  });
});
