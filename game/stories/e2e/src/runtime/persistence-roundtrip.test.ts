// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSnapshotEnvelopeSchemaV1,
  digestCanonical,
  parseDigest,
  parseStrictJson,
  rngStateV1Schema,
  saveJsonLimitsV1,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  ExportedSaveV1,
  HostAtomicRecordStoreV1,
  RngDrawTraceV1,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";
import { describe, expect, it } from "vitest";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import { e2eGameStateSchemaV1 } from "../gameplay/contracts/index.js";
import type {
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eGameViewV1,
} from "../gameplay/contracts/index.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";
import type { E2eSemanticInvocationV1 } from "./e2e-semantic-game-port.js";
import { runE2eHeadlessSequenceV1 } from "./headless-runner.js";

type E2eAttemptV1 = ReturnType<
  E2eResolvedGameV1["gameSimulation"]["commandExecutor"]["executeAttempt"]
>;

interface RoundTripStateV1 {
  readonly name: string;
  readonly prefix: readonly E2eSemanticInvocationV1[];
  readonly suffix: readonly E2eSemanticInvocationV1[];
  readonly expected: {
    readonly commandSequence: number;
    readonly counter: number;
    readonly flowStatus: "choosing" | "blocked" | "resolved";
    readonly flowBranch: "left" | "right" | null;
    readonly nodeId: "choice" | "rejoin" | "done";
    readonly runStatus: "active" | "complete";
  };
}

const startV1 = Object.freeze({
  actionId: "action.e2e.start" as const,
  parameters: Object.freeze({}),
});
const chooseLeftV1 = Object.freeze({
  actionId: "action.e2e.choose" as const,
  parameters: Object.freeze({ choice: "left" as const }),
});
const chooseRightV1 = Object.freeze({
  actionId: "action.e2e.choose" as const,
  parameters: Object.freeze({ choice: "right" as const }),
});
const continueV1 = Object.freeze({
  actionId: "action.e2e.continue" as const,
  parameters: Object.freeze({}),
});
const incrementV1 = Object.freeze({
  actionId: "action.e2e.increment" as const,
  parameters: Object.freeze({}),
});
const completeV1 = Object.freeze({
  actionId: "action.e2e.complete" as const,
  parameters: Object.freeze({}),
});

const roundTripStatesV1 = Object.freeze([
  Object.freeze({
    name: "flow choosing",
    prefix: Object.freeze([startV1]),
    suffix: Object.freeze([chooseRightV1, continueV1, completeV1]),
    expected: Object.freeze({
      commandSequence: 1,
      counter: 0,
      flowStatus: "choosing" as const,
      flowBranch: null,
      nodeId: "choice" as const,
      runStatus: "active" as const,
    }),
  }),
  Object.freeze({
    name: "left branch blocked at rejoin",
    prefix: Object.freeze([startV1, chooseLeftV1]),
    suffix: Object.freeze([continueV1, incrementV1, completeV1]),
    expected: Object.freeze({
      commandSequence: 2,
      counter: 1,
      flowStatus: "blocked" as const,
      flowBranch: "left" as const,
      nodeId: "rejoin" as const,
      runStatus: "active" as const,
    }),
  }),
  Object.freeze({
    name: "right branch blocked at rejoin",
    prefix: Object.freeze([startV1, chooseRightV1]),
    suffix: Object.freeze([continueV1, completeV1]),
    expected: Object.freeze({
      commandSequence: 2,
      counter: 2,
      flowStatus: "blocked" as const,
      flowBranch: "right" as const,
      nodeId: "rejoin" as const,
      runStatus: "active" as const,
    }),
  }),
  Object.freeze({
    name: "resolved flow before terminal",
    prefix: Object.freeze([startV1, chooseRightV1, continueV1]),
    suffix: Object.freeze([completeV1]),
    expected: Object.freeze({
      commandSequence: 3,
      counter: 2,
      flowStatus: "resolved" as const,
      flowBranch: "right" as const,
      nodeId: "done" as const,
      runStatus: "active" as const,
    }),
  }),
  Object.freeze({
    name: "terminal run",
    prefix: Object.freeze([startV1, chooseRightV1, continueV1, completeV1]),
    suffix: Object.freeze([]),
    expected: Object.freeze({
      commandSequence: 4,
      counter: 2,
      flowStatus: "resolved" as const,
      flowBranch: "right" as const,
      nodeId: "done" as const,
      runStatus: "complete" as const,
    }),
  }),
] satisfies readonly RoundTripStateV1[]);

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(e2eGameStateSchemaV1, rngStateV1Schema);

function readRecordFieldV1(value: unknown, field: string): unknown {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.hasOwn(value, field)
  ) {
    throw new TypeError(`invalid exported Save ${field}`);
  }
  return Reflect.get(value, field);
}

function inspectExportedSaveV1(file: ExportedSaveV1) {
  const decoded = parseStrictJson(file.bytes, saveJsonLimitsV1);
  if (!decoded.ok) throw new TypeError(`invalid exported Save: ${decoded.error.code}`);
  const snapshot = snapshotSchemaV1.parse(readRecordFieldV1(decoded.value, "snapshot"));
  const stateDigest = parseDigest(readRecordFieldV1(decoded.value, "stateDigest"));
  if (stateDigest !== digestCanonical("sillymaker:state:v1", snapshot)) {
    throw new TypeError("exported Save state digest mismatch");
  }
  return Object.freeze({ snapshot, stateDigest });
}

function readSlotIdV1(bytes: Uint8Array): unknown {
  const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!decoded.ok) return null;
  const slot = readRecordFieldV1(decoded.value, "slot");
  return readRecordFieldV1(slot, "slotId");
}

async function copyQuickSaveV1(
  source: HostAtomicRecordStoreV1,
  target: HostAtomicRecordStoreV1,
): Promise<void> {
  const records = await source.list("save");
  const quick = records.find(({ bytes }) => readSlotIdV1(bytes) === "quick");
  if (quick === undefined) throw new TypeError("missing persisted Quick Save");
  const copied = await target.commit([
    Object.freeze({
      kind: "put" as const,
      namespace: "save" as const,
      key: quick.key,
      expectedRevision: null,
      bytes: quick.bytes,
    }),
  ]);
  if (copied.kind !== "committed") throw new TypeError("failed to copy persisted Quick Save");
}

function instrumentResolvedGameV1(attempts: E2eAttemptV1[]): E2eResolvedGameV1 {
  const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
  const originalExecutor = resolved.gameSimulation.commandExecutor;
  const commandExecutor = Object.freeze({
    executeAttempt(
      snapshot: Parameters<typeof originalExecutor.executeAttempt>[0],
      command: Parameters<typeof originalExecutor.executeAttempt>[1],
      context: Parameters<typeof originalExecutor.executeAttempt>[2],
    ) {
      const attempt = originalExecutor.executeAttempt(snapshot, command, context);
      attempts.push(attempt);
      return attempt;
    },
  });
  const gameSimulation = Object.freeze({
    ...resolved.gameSimulation,
    commandExecutor,
  });
  return Object.freeze({ ...resolved, gameSimulation });
}

function committedContinuationEvidenceV1(
  attempts: readonly E2eAttemptV1[],
  fromIndex: number,
): {
  readonly facts: readonly DeepReadonly<E2eGameplayFactV1>[];
  readonly rngTrace: readonly DeepReadonly<RngDrawTraceV1>[];
} {
  const facts: DeepReadonly<E2eGameplayFactV1>[] = [];
  const rngTrace: DeepReadonly<RngDrawTraceV1>[] = [];
  for (const attempt of attempts.slice(fromIndex)) {
    if (attempt.result.kind !== "committed") {
      throw new TypeError(`continuation did not commit: ${attempt.result.kind}`);
    }
    facts.push(...attempt.result.facts);
    rngTrace.push(...attempt.diagnostics.attemptedDraws);
  }
  return Object.freeze({ facts: Object.freeze(facts), rngTrace: Object.freeze(rngTrace) });
}

async function createInstrumentedRuntimeV1(records: HostAtomicRecordStoreV1, ownerUuid: string) {
  const attempts: E2eAttemptV1[] = [];
  const resolved = instrumentResolvedGameV1(attempts);
  const application = await createE2eGameRuntimeV1({
    resolved,
    host: createWebHostV1({
      records,
      seeds: [0x0002_3049],
      uuids: [ownerUuid],
      now: () => "2026-07-12T00:00:00.000Z",
    }),
  });
  return Object.freeze({ application, attempts });
}

function expectCommittedRunV1(results: readonly { readonly kind: string }[]): void {
  expect(results.every(({ kind }) => kind === "committed")).toBe(true);
}

function expectExactPrefixStateV1(
  snapshot: DeepReadonly<E2eGameSnapshotV1>,
  expected: RoundTripStateV1["expected"],
): void {
  expect(snapshot.commandSequence).toBe(expected.commandSequence);
  expect(snapshot.state.simulation).toEqual({
    counter: { value: expected.counter },
    flow: {
      status: expected.flowStatus,
      branch: expected.flowBranch,
      nodeId: expected.nodeId,
    },
    run: { status: expected.runStatus },
  });
  expect(snapshot.integrity).toEqual({
    mode: "normal",
    mutationCount: 0,
    firstMutationSequence: null,
    reasons: [],
  });
}

describe("E2E persistence continuation round-trips", () => {
  it.each(roundTripStatesV1)(
    "round-trips $name with identical state digest, Facts, RNG, and SemanticGameView",
    async ({ prefix, suffix, expected }) => {
      const directRecords = createMemoryHostRecordStoreV1();
      const direct = await createInstrumentedRuntimeV1(
        directRecords,
        "00000000-0000-4000-8000-000000000021",
      );
      const prefixRun = await runE2eHeadlessSequenceV1(direct.application.semantic, prefix);
      expectCommittedRunV1(prefixRun.results);
      const captured = inspectExportedSaveV1(
        await direct.application.persistence.exportCurrentSave(),
      );
      expectExactPrefixStateV1(captured.snapshot, expected);
      expect(prefixRun.views.at(-1)).toEqual(direct.application.semantic.observe().game);

      await expect(direct.application.persistence.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      const loadedRecords = createMemoryHostRecordStoreV1();
      await copyQuickSaveV1(directRecords, loadedRecords);

      const directAttemptIndex = direct.attempts.length;
      const directContinuation = await runE2eHeadlessSequenceV1(
        direct.application.semantic,
        suffix,
      );
      expectCommittedRunV1(directContinuation.results);
      const directEvidence = committedContinuationEvidenceV1(direct.attempts, directAttemptIndex);
      const directFinal = inspectExportedSaveV1(
        await direct.application.persistence.exportCurrentSave(),
      );
      const directView: DeepReadonly<E2eGameViewV1> = direct.application.semantic.observe().game;

      const loaded = await createInstrumentedRuntimeV1(
        loadedRecords,
        "00000000-0000-4000-8000-000000000022",
      );
      await expect(loaded.application.persistence.load("quick")).resolves.toEqual({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: expected.commandSequence,
      });
      const loadedPrefix = inspectExportedSaveV1(
        await loaded.application.persistence.exportCurrentSave(),
      );
      expect(loadedPrefix.stateDigest).toBe(captured.stateDigest);
      expect(loadedPrefix.snapshot.rng).toEqual(captured.snapshot.rng);
      expect(loaded.application.semantic.observe().game).toEqual(prefixRun.views.at(-1));

      const loadedAttemptIndex = loaded.attempts.length;
      const loadedContinuation = await runE2eHeadlessSequenceV1(
        loaded.application.semantic,
        suffix,
      );
      expectCommittedRunV1(loadedContinuation.results);
      const loadedEvidence = committedContinuationEvidenceV1(loaded.attempts, loadedAttemptIndex);
      const loadedFinal = inspectExportedSaveV1(
        await loaded.application.persistence.exportCurrentSave(),
      );

      expect(loadedFinal.stateDigest).toBe(directFinal.stateDigest);
      expect(loadedFinal.snapshot.rng).toEqual(directFinal.snapshot.rng);
      expect(loadedEvidence.facts).toEqual(directEvidence.facts);
      expect(loadedEvidence.rngTrace).toEqual(directEvidence.rngTrace);
      expect(loaded.application.semantic.observe().game).toEqual(directView);
      expect(loadedFinal.snapshot.integrity).toEqual({
        mode: "normal",
        mutationCount: 0,
        firstMutationSequence: null,
        reasons: [],
      });
    },
  );
});
