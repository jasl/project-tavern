// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseNonNegativeSafeInteger,
  parseStrictJson,
  parseStrictJsonLimitsV1,
  type DeepReadonly,
  type NonNegativeSafeInteger,
} from "@sillymaker/base";

import { pocReferenceSeedV1 } from "../content/identity.js";
import type { PocGameSnapshotV1, PocGameViewV1 } from "../gameplay/contracts/types.js";
import type { PocSemanticActionResultV1 } from "../presentation/semantic-actions.js";
import {
  accumulatePocSurrenderedActionPointsV1,
  canonicalPocReferenceCommandFixtureBytesV1,
  pocReferenceCommandFixtureSchemaV1,
  type PocReferenceCommandFixtureV1,
} from "./compile-reference-strategy.js";
import type { PocReferenceStrategyIdV1 } from "./reference-strategy-definitions.js";
import { createPocStoryHarnessV1, type PocHarnessAttemptV1 } from "./poc-story-harness.js";

const pocReferenceCommandFixtureJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 10_000,
  maxObjectMembers: 10_000,
  maxNodes: 100_000,
  maxStringBytes: 262_144,
});

interface NodeFileReaderV1 {
  readFile(path: URL): Promise<Uint8Array>;
}

const nodeFileReaderSpecifierV1: string = "node:fs/promises";

async function readFileV1(path: URL): Promise<Uint8Array> {
  const nodeFileReader = (await import(nodeFileReaderSpecifierV1)) as NodeFileReaderV1;
  return nodeFileReader.readFile(path);
}

const commandFixtureFilenameByStrategyIdV1 = Object.freeze({
  "strategy.cash_first": "strategy.cash_first.json",
  "strategy.relationship_first": "strategy.relationship_first.json",
  "strategy.investigation_first": "strategy.investigation_first.json",
  "strategy.full_delegation": "strategy.full_delegation.json",
  "strategy.two_closures_recovery": "strategy.two_closures_recovery.json",
  "strategy.explicit_failure": "strategy.explicit_failure.json",
} as const satisfies Readonly<Record<PocReferenceStrategyIdV1, string>>);

export interface PocReferenceStrategyRunV1 {
  readonly results: readonly DeepReadonly<PocSemanticActionResultV1>[];
  readonly finalView: DeepReadonly<PocGameViewV1>;
  readonly finalSnapshot: DeepReadonly<PocGameSnapshotV1>;
  readonly freeAp: NonNegativeSafeInteger;
  readonly attempts: readonly DeepReadonly<PocHarnessAttemptV1>[];
}

function commandFixtureUrlV1(strategyId: PocReferenceStrategyIdV1): URL {
  if (!Object.hasOwn(commandFixtureFilenameByStrategyIdV1, strategyId)) {
    throw new TypeError(`unknown PoC reference strategy ${strategyId}`);
  }
  return new URL(
    `../test/fixtures/commands/${commandFixtureFilenameByStrategyIdV1[strategyId]}`,
    import.meta.url,
  );
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function parseFixtureV1(value: unknown, context: string): PocReferenceCommandFixtureV1 {
  try {
    return pocReferenceCommandFixtureSchemaV1.parse(value);
  } catch (error) {
    throw new TypeError(`${context} failed the PoC reference command fixture schema`, {
      cause: error,
    });
  }
}

/** Reads one closed tracked command fixture and admits only its exact canonical byte form. */
export async function readPocCommandFixtureV1(
  strategyId: PocReferenceStrategyIdV1,
): Promise<PocReferenceCommandFixtureV1> {
  const fixtureUrl = commandFixtureUrlV1(strategyId);
  let bytes: Uint8Array;
  try {
    bytes = await readFileV1(fixtureUrl);
  } catch (error) {
    throw new TypeError(`unable to read PoC command fixture for ${strategyId}`, { cause: error });
  }

  const decoded = parseStrictJson(bytes, pocReferenceCommandFixtureJsonLimitsV1);
  if (!decoded.ok) {
    throw new TypeError(
      `PoC command fixture for ${strategyId} violates Strict JSON: ${decoded.error.code}`,
    );
  }
  const fixture = parseFixtureV1(decoded.value, `PoC command fixture for ${strategyId}`);
  if (fixture.strategyId !== strategyId) {
    throw new TypeError(
      `PoC command fixture path ${strategyId} contains strategy ${fixture.strategyId}`,
    );
  }
  if (fixture.seed !== pocReferenceSeedV1) {
    throw new TypeError(`PoC command fixture for ${strategyId} does not use the reference seed`);
  }
  if (!bytesEqualV1(bytes, canonicalPocReferenceCommandFixtureBytesV1(fixture))) {
    throw new TypeError(`PoC command fixture for ${strategyId} is not canonical JSON`);
  }
  return fixture;
}

function failEntryV1(
  fixture: DeepReadonly<PocReferenceCommandFixtureV1>,
  order: number,
  detail: string,
): never {
  throw new TypeError(`${fixture.strategyId} command fixture entry ${order} ${detail}`);
}

/**
 * Replays literal Semantic invocations through one real Session. Snapshot access is restricted to
 * pre-dispatch sequence validation and final test evidence; it never influences invocation choice.
 */
export async function runPocReferenceStrategyV1(
  fixtureValue: DeepReadonly<PocReferenceCommandFixtureV1>,
): Promise<PocReferenceStrategyRunV1> {
  const fixture = parseFixtureV1(fixtureValue, "PoC reference strategy runner input");
  const harness = createPocStoryHarnessV1({
    bootstrap: Object.freeze({ rngSeed: fixture.seed, runId: fixture.runId }),
  });
  const results: DeepReadonly<PocSemanticActionResultV1>[] = [];
  let freeAp = 0;

  for (const [index, entry] of fixture.entries.entries()) {
    if (entry.order !== index) {
      failEntryV1(fixture, index, `has non-contiguous order ${entry.order}`);
    }

    const before = harness.semantic.observe();
    if (before.status !== "ready") {
      failEntryV1(fixture, entry.order, `started while Session status was ${before.status}`);
    }
    if (before.game.hud.day !== entry.day || before.game.hud.phase !== entry.phase) {
      failEntryV1(
        fixture,
        entry.order,
        `expected ${entry.day}/${entry.phase} before dispatch but observed ${before.game.hud.day}/${before.game.hud.phase}`,
      );
    }
    const commandSequence = harness.snapshotForTest().commandSequence;
    if (commandSequence !== entry.commandSequence) {
      failEntryV1(
        fixture,
        entry.order,
        `expected commandSequence ${entry.commandSequence} before dispatch but observed ${commandSequence}`,
      );
    }

    const visibleAction = harness.semantic
      .availableActions()
      .find(({ actionId }) => actionId === entry.invocation.actionId);
    if (visibleAction === undefined || !visibleAction.enabled) {
      failEntryV1(
        fixture,
        entry.order,
        `invokes unavailable Semantic action ${entry.invocation.actionId}`,
      );
    }
    const preview = await harness.semantic.preview(entry.invocation);
    if (!preview.allowed) {
      failEntryV1(
        fixture,
        entry.order,
        `failed public preview: ${preview.reasons.map(({ code }) => code).join(",")}`,
      );
    }

    const result = await harness.semantic.dispatch(entry.invocation);
    results.push(result);
    if (result.kind !== "committed") {
      failEntryV1(fixture, entry.order, `returned non-committed result ${result.kind}`);
    }
    freeAp = accumulatePocSurrenderedActionPointsV1({
      total: freeAp,
      before: before.game.hud.apRemaining,
      actionId: entry.invocation.actionId,
      resultKind: result.kind,
    });
    await harness.semantic.waitForIdle(before.revision);
  }

  return Object.freeze({
    results: Object.freeze(results),
    finalView: harness.semantic.observe().game,
    finalSnapshot: harness.snapshotForTest(),
    freeAp: parseNonNegativeSafeInteger(freeAp),
    attempts: Object.freeze([...harness.executedAttempts()]),
  });
}
