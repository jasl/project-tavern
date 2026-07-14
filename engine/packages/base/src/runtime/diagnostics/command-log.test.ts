// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestCanonical } from "../../contracts/digest.js";
import { rngStateV1Schema } from "../../contracts/rng.js";
import type { RngStateV1 } from "../../contracts/rng.js";
import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.js";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.js";
import type { Digest, PositiveSafeInteger } from "../../contracts/values.js";
import { createCommandLogV1, type FinalizedCommandAttemptV1 } from "./command-log.js";

interface FixtureStateV1 {
  readonly value: number;
}

type FixtureSnapshotV1 = GameSnapshotEnvelopeV1<FixtureStateV1, RngStateV1>;

interface FixtureCommandV1 {
  readonly kind: "fixture.command";
  readonly ordinal: PositiveSafeInteger;
}

interface FixtureLoggedCommandV1 {
  readonly source: "game";
  readonly command: FixtureCommandV1;
}

interface FixtureFactV1 {
  readonly kind: "fixture.committed";
  readonly value: number;
}

interface FixtureRejectionV1 {
  readonly code: "fixture.rejected";
}

interface FixtureFaultV1 {
  readonly code: "fixture.faulted";
}

type FixtureAttemptV1 = FinalizedCommandAttemptV1<
  FixtureSnapshotV1,
  FixtureFactV1,
  FixtureRejectionV1,
  FixtureFaultV1
>;

interface FixtureAttemptEntryV1 {
  readonly parsedCommand: FixtureLoggedCommandV1;
  readonly finalizedAttempt: FixtureAttemptV1;
}

const fixedRngV1 = rngStateV1Schema.parse({
  algorithm: "xorshift32-v1",
  cursor: 17,
  rawDrawCount: 0,
});

function snapshotAtSequence(sequence: number, value = sequence): FixtureSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({ value }),
    rng: fixedRngV1,
    commandSequence: parseNonNegativeSafeInteger(sequence),
    integrity: createPristineRunIntegrityV1(),
  });
}

function stateDigest(snapshot: FixtureSnapshotV1): Digest {
  return digestCanonical("sillymaker:state:v1", snapshot);
}

function parsedCommand(ordinal: number): FixtureLoggedCommandV1 {
  return Object.freeze({
    source: "game",
    command: Object.freeze({
      kind: "fixture.command",
      ordinal: parsePositiveSafeInteger(ordinal),
    }),
  });
}

function diagnostics(snapshot: FixtureSnapshotV1) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: Object.freeze([]),
    committedRngAfter: snapshot.rng,
  });
}

function finalizationEvidence(before: FixtureSnapshotV1, after: FixtureSnapshotV1) {
  return Object.freeze({
    preSnapshot: before,
    preStateDigest: stateDigest(before),
    postStateDigest: stateDigest(after),
  });
}

function finalizedAttempt(before: FixtureSnapshotV1, ordinal: number): FixtureAttemptV1 {
  if (ordinal % 3 === 1) {
    const snapshot = snapshotAtSequence(before.commandSequence + 1, before.state.value + 1);
    return Object.freeze({
      ...finalizationEvidence(before, snapshot),
      result: Object.freeze({
        kind: "committed",
        snapshot,
        facts: Object.freeze([
          Object.freeze({ kind: "fixture.committed", value: snapshot.state.value }),
        ]),
      }),
      diagnostics: diagnostics(snapshot),
    });
  }
  if (ordinal % 3 === 2) {
    return Object.freeze({
      ...finalizationEvidence(before, before),
      result: Object.freeze({
        kind: "rejected",
        snapshot: before,
        reasons: Object.freeze([Object.freeze({ code: "fixture.rejected" })]),
      }),
      diagnostics: diagnostics(before),
    });
  }
  return Object.freeze({
    ...finalizationEvidence(before, before),
    result: Object.freeze({
      kind: "faulted",
      snapshot: before,
      fault: Object.freeze({ code: "fixture.faulted" }),
    }),
    diagnostics: diagnostics(before),
  });
}

function mixedAttempts(count: number): readonly FixtureAttemptEntryV1[] {
  const entries: FixtureAttemptEntryV1[] = [];
  let snapshot = snapshotAtSequence(0);
  for (let ordinal = 1; ordinal <= count; ordinal += 1) {
    const attempt = finalizedAttempt(snapshot, ordinal);
    entries.push(
      Object.freeze({
        parsedCommand: parsedCommand(ordinal),
        finalizedAttempt: attempt,
      }),
    );
    snapshot = attempt.result.snapshot;
  }
  return Object.freeze(entries);
}

function createFixtureLog(replayBase = snapshotAtSequence(0)) {
  return createCommandLogV1<
    FixtureSnapshotV1,
    FixtureLoggedCommandV1,
    FixtureFactV1,
    FixtureRejectionV1,
    FixtureFaultV1
  >({ replayBase, limit: 200 });
}

describe("CommandLog", () => {
  it("moves the replay base before evicting the 201st mixed entry", () => {
    const attempts = mixedAttempts(201);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);

    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }

    const entries = log.entries();
    const evictedPostSnapshot = attempts[0]?.finalizedAttempt.result.snapshot;
    expect(evictedPostSnapshot).toBeDefined();
    expect(entries).toHaveLength(200);
    expect(entries[0]?.logOrdinal).toBe(2);
    expect(entries.at(-1)?.logOrdinal).toBe(201);
    expect(new Set(entries.map((entry) => entry.outcome.kind))).toEqual(
      new Set(["committed", "rejected", "faulted"]),
    );
    expect(entries.at(-1)?.outcome).toEqual({
      kind: "faulted",
      fault: { code: "fixture.faulted" },
    });
    expect(log.replayBase()).toBe(evictedPostSnapshot);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(evictedPostSnapshot!));
    expect(entries[0]?.preStateDigest).toBe(log.replayBaseStateDigest());
  });

  it("keeps public entries separate from immutable post snapshots", () => {
    const attempts = mixedAttempts(201);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);
    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }

    const entries = log.entries();
    const first = entries[0];
    expect(first).toBeDefined();
    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.outcome)).toBe(true);
    expect(Object.isFrozen(first?.commandSequence)).toBe(true);
    expect(Object.isFrozen(first?.attemptedDraws)).toBe(true);
    expect(first).not.toBe(attempts[1]?.finalizedAttempt);
    expect(first?.outcome).not.toBe(attempts[1]?.finalizedAttempt.result);
    expect(first?.attemptedDraws).not.toBe(
      attempts[1]?.finalizedAttempt.diagnostics.attemptedDraws,
    );
    expect(Object.keys(first ?? {})).not.toContain("snapshot");
    expect(Object.keys(first ?? {})).not.toContain("postAttemptSnapshot");
    expect(Object.isFrozen(log.replayBase())).toBe(true);
  });

  it("establishes a new anchor, clears entries, and resets log ordinal to one", () => {
    const attempts = mixedAttempts(3);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);
    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }
    const previousEntries = log.entries();
    expect(previousEntries.map((entry) => entry.logOrdinal)).toEqual([1, 2, 3]);

    const anchor = snapshotAtSequence(50, 87);
    log.establishAnchor(anchor);

    expect(log.replayBase()).toBe(anchor);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(anchor));
    expect(log.entries()).toEqual([]);
    expect(Object.isFrozen(log.entries())).toBe(true);
    expect(previousEntries).toHaveLength(3);

    const attempt = finalizedAttempt(anchor, 2);
    const entry = log.append(parsedCommand(1), attempt);
    expect(entry.logOrdinal).toBe(1);
    expect(entry.preStateDigest).toBe(stateDigest(anchor));
    expect(log.entries()).toEqual([entry]);
  });

  it("validates finalized snapshot and digest evidence before appending", () => {
    const first = mixedAttempts(1)[0];
    expect(first).toBeDefined();
    const log = createFixtureLog(first!.finalizedAttempt.preSnapshot);
    const unrelated = snapshotAtSequence(99);
    const wrongDigestAttempt: FixtureAttemptV1 = Object.freeze({
      ...first!.finalizedAttempt,
      postStateDigest: stateDigest(unrelated),
    });

    expect(() => log.append(first!.parsedCommand, wrongDigestAttempt)).toThrow();
    expect(log.entries()).toEqual([]);

    log.append(first!.parsedCommand, first!.finalizedAttempt);
    const sameBytesDifferentReference = snapshotAtSequence(1, 1);
    expect(sameBytesDifferentReference).not.toBe(first!.finalizedAttempt.result.snapshot);
    expect(stateDigest(sameBytesDifferentReference)).toBe(first!.finalizedAttempt.postStateDigest);
    const discontinuousAttempt = finalizedAttempt(sameBytesDifferentReference, 2);

    expect(() => log.append(parsedCommand(2), discontinuousAttempt)).toThrow();
    expect(log.entries()).toHaveLength(1);
  });

  it("rejects a non-Game/Debug source before mutating the log", () => {
    const first = mixedAttempts(1)[0]!;
    const log = createFixtureLog(first.finalizedAttempt.preSnapshot);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();

    expect(() =>
      log.append(
        { source: "semantic", command: first.parsedCommand.command } as never,
        first.finalizedAttempt,
      ),
    ).toThrow("CommandLog source must be game or debug");
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);
  });

  it("rejects a Debug-source rejected outcome before mutating the log", () => {
    const rejected = mixedAttempts(2)[1]!;
    const log = createFixtureLog(rejected.finalizedAttempt.preSnapshot);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();

    expect(() =>
      log.append(
        { source: "debug", command: rejected.parsedCommand.command } as never,
        rejected.finalizedAttempt,
      ),
    ).toThrow("Debug CommandLog entries cannot be rejected");
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);
  });

  it("prepares every throwing anchor value before committing the reset", () => {
    const first = mixedAttempts(1)[0]!;
    const log = createFixtureLog(first.finalizedAttempt.preSnapshot);
    log.append(first.parsedCommand, first.finalizedAttempt);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();
    const invalid = Object.freeze({
      ...snapshotAtSequence(70),
      state: Object.freeze({ value: -0 }),
    }) as FixtureSnapshotV1;

    expect(() => log.prepareAnchor(invalid)).toThrow();
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);

    const anchor = snapshotAtSequence(70);
    const prepared = log.prepareAnchor(anchor);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.emptyEntries)).toBe(true);
    log.establishPreparedAnchor(prepared);
    expect(log.replayBase()).toBe(anchor);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(anchor));
    expect(log.entries()).toBe(prepared.emptyEntries);
  });

  it("does not mutate the log when the following ordinal cannot be represented", () => {
    const replayBase = snapshotAtSequence(0);
    const log = createFixtureLog(replayBase);
    const prepared = log.prepareAnchor(replayBase);
    const exhausted = Object.freeze({
      ...prepared,
      nextOrdinal: parsePositiveSafeInteger(Number.MAX_SAFE_INTEGER),
    });
    log.establishPreparedAnchor(exhausted);
    const entriesBefore = log.entries();
    const replayBaseBefore = log.replayBase();

    expect(() => log.append(parsedCommand(1), finalizedAttempt(replayBase, 1))).toThrow();
    expect(log.entries()).toBe(entriesBefore);
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(replayBase));
  });
});
