// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  canonicalJsonBytes,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStrictJson,
  parseStrictJsonLimitsV1,
  rngStateV1Schema,
  runIntegrityV1Schema,
  type DeepReadonly,
  type Digest,
  type NonNegativeSafeInteger,
  type RngDrawTraceV1,
  type RunIntegrityV1,
  type RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  deepFreezePocValueV1,
  parseCalendarPhase,
  parseDayIndex,
  parsePocInventoryLedgerEntryV1,
  parsePocRunCompletionV1,
  parsePocRunBootstrapInputV1,
  parsePocTavernServiceHistoryEntryV1,
  pocGameplayFactKindsV1,
  type CalendarPhase,
  type DayIndex,
  type LedgerEntryV1,
  type PocGameBootstrapInputV1,
  type PocGameCommandV1,
  type PocGameplayFactV1,
  type RunCompletionV1,
  type ServiceHistoryEntryV1,
} from "../gameplay/index.js";
import {
  commandForPocSemanticInvocationV1,
  pocSemanticInvocationSchemaV1,
  type PocSemanticInvocationV1,
} from "../presentation/semantic-actions.js";
import { pocStoryIdentityV1 } from "../content/identity.js";
import { pocReferenceToolingFixtureByStrategyIdV1 } from "../tooling-fixtures.js";
import { executePocToolingCommandsV1 } from "./compile-reference-strategy.js";
import {
  pocReferenceStrategyDefinitionsV1,
  pocReferenceStrategyIdsV1,
  type PocReferenceStrategyIdV1,
} from "./reference-strategy-definitions.js";

export interface PocGoldenAttemptV1 {
  readonly order: NonNegativeSafeInteger;
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly commandSequenceBefore: NonNegativeSafeInteger;
  readonly invocation: DeepReadonly<PocSemanticInvocationV1>;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly gameplayFactKinds: readonly PocGameplayFactV1["kind"][];
  readonly rngDraws: readonly RngDrawTraceV1[];
}

export interface PocGoldenNightV1 {
  readonly day: DayIndex;
  readonly service: DeepReadonly<ServiceHistoryEntryV1>;
  readonly ledgerEntries: readonly DeepReadonly<LedgerEntryV1>[];
}

export interface PocGoldenArtifactV1 {
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly storyIdentity: typeof pocStoryIdentityV1;
  readonly bootstrap: DeepReadonly<PocGameBootstrapInputV1>;
  readonly attempts: readonly DeepReadonly<PocGoldenAttemptV1>[];
  readonly nights: readonly DeepReadonly<PocGoldenNightV1>[];
  readonly terminal: DeepReadonly<RunCompletionV1>;
  readonly integrity: DeepReadonly<RunIntegrityV1>;
}

interface ExactDataRecordV1 {
  readonly [key: string]: unknown;
}

const goldenJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 20_000,
  maxObjectMembers: 20_000,
  maxNodes: 200_000,
  maxStringBytes: 262_144,
});
const referenceStrategyIdSetV1 = new Set<string>(pocReferenceStrategyIdsV1);
const gameplayFactKindSetV1 = new Set<string>(pocGameplayFactKindsV1);
const nodeFileReaderSpecifierV1: string = "node:fs/promises";

function exactDataRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): ExactDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const descriptor of Object.values(descriptors)) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} descriptor`);
    }
  }
  return value as ExactDataRecordV1;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parseReferenceStrategyIdV1(value: unknown): PocReferenceStrategyIdV1 {
  if (typeof value !== "string" || !referenceStrategyIdSetV1.has(value)) {
    throw new TypeError("invalid PoC golden strategy ID");
  }
  return value as PocReferenceStrategyIdV1;
}

function parseGameplayFactKindV1(value: unknown): PocGameplayFactV1["kind"] {
  if (typeof value !== "string" || !gameplayFactKindSetV1.has(value)) {
    throw new TypeError("invalid PoC golden GameplayFact kind");
  }
  return value as PocGameplayFactV1["kind"];
}

function parseRngDrawTraceV1(value: unknown): RngDrawTraceV1 {
  const trace = exactDataRecordV1(
    value,
    ["ordinal", "purpose", "exclusiveMax", "result", "before", "after"],
    "PoC golden RNG draw",
  );
  if (typeof trace.purpose !== "string" || trace.purpose.length === 0) {
    throw new TypeError("invalid PoC golden RNG draw purpose");
  }
  const exclusiveMax = parsePositiveSafeInteger(trace.exclusiveMax);
  const result = parseNonNegativeSafeInteger(trace.result);
  if (result >= exclusiveMax) throw new TypeError("PoC golden RNG draw result is out of range");
  return deepFreezePocValueV1({
    ordinal: parsePositiveSafeInteger(trace.ordinal),
    purpose: trace.purpose,
    exclusiveMax,
    result,
    before: rngStateV1Schema.parse(trace.before),
    after: rngStateV1Schema.parse(trace.after),
  });
}

function parseGoldenAttemptV1(value: unknown, index: number): PocGoldenAttemptV1 {
  const attempt = exactDataRecordV1(
    value,
    [
      "order",
      "day",
      "phase",
      "commandSequenceBefore",
      "invocation",
      "preStateDigest",
      "postStateDigest",
      "gameplayFactKinds",
      "rngDraws",
    ],
    "PoC golden attempt",
  );
  const order = parseNonNegativeSafeInteger(attempt.order);
  const commandSequenceBefore = parseNonNegativeSafeInteger(attempt.commandSequenceBefore);
  if (order !== index || commandSequenceBefore !== index) {
    throw new TypeError("PoC golden attempt order is not contiguous");
  }
  return deepFreezePocValueV1({
    order,
    day: parseDayIndex(attempt.day),
    phase: parseCalendarPhase(attempt.phase),
    commandSequenceBefore,
    invocation: pocSemanticInvocationSchemaV1.parse(attempt.invocation),
    preStateDigest: parseDigest(attempt.preStateDigest),
    postStateDigest: parseDigest(attempt.postStateDigest),
    gameplayFactKinds: exactDataArrayV1(
      attempt.gameplayFactKinds,
      "PoC golden GameplayFact kinds",
    ).map(parseGameplayFactKindV1),
    rngDraws: exactDataArrayV1(attempt.rngDraws, "PoC golden RNG draws").map(parseRngDrawTraceV1),
  });
}

function serviceDayV1(service: DeepReadonly<ServiceHistoryEntryV1>): DayIndex {
  return service.kind === "opening" ? service.opening.day : service.closure.day;
}

function checkedLedgerCashTotalV1(entries: readonly DeepReadonly<LedgerEntryV1>[]): number {
  const total = entries.reduce((sum, entry) => sum + BigInt(entry.cashDelta), 0n);
  if (total < BigInt(Number.MIN_SAFE_INTEGER) || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("PoC golden nightly ledger cash exceeds SafeInteger bounds");
  }
  return Number(total);
}

function assertGoldenNightLedgerV1(night: DeepReadonly<PocGoldenNightV1>): void {
  if (serviceDayV1(night.service) !== night.day) {
    throw new TypeError("PoC golden nightly service day mismatch");
  }
  if (night.service.kind === "closure") {
    if (night.ledgerEntries.length !== 0) {
      throw new TypeError("PoC golden closure night must not claim opening ledger entries");
    }
    return;
  }
  const opening = night.service.opening;
  if (
    opening.entryIds.length !== night.ledgerEntries.length ||
    opening.entryIds.some((entryId, index) => night.ledgerEntries[index]?.entryId !== entryId)
  ) {
    throw new TypeError("PoC golden opening ledger references do not match authoritative entries");
  }
  if (checkedLedgerCashTotalV1(night.ledgerEntries) !== opening.cash.after - opening.cash.before) {
    throw new TypeError("PoC golden opening ledger cash is not conserved");
  }
}

function parseGoldenNightV1(value: unknown, index: number): PocGoldenNightV1 {
  const night = exactDataRecordV1(value, ["day", "service", "ledgerEntries"], "PoC golden night");
  const parsed = deepFreezePocValueV1({
    day: parseDayIndex(night.day),
    service: parsePocTavernServiceHistoryEntryV1(night.service),
    ledgerEntries: exactDataArrayV1(night.ledgerEntries, "PoC golden nightly ledger entries").map(
      parsePocInventoryLedgerEntryV1,
    ),
  });
  if (parsed.day !== index + 1) throw new TypeError("PoC golden night days are not contiguous");
  assertGoldenNightLedgerV1(parsed);
  return parsed;
}

function parseStoryIdentityV1(value: unknown): typeof pocStoryIdentityV1 {
  const identity = exactDataRecordV1(value, ["id", "revision"], "PoC golden Story identity");
  if (identity.id !== pocStoryIdentityV1.id || identity.revision !== pocStoryIdentityV1.revision) {
    throw new TypeError("PoC golden Story identity mismatch");
  }
  return pocStoryIdentityV1;
}

function parsePocGoldenArtifactV1(value: unknown): PocGoldenArtifactV1 {
  const artifact = exactDataRecordV1(
    value,
    ["strategyId", "storyIdentity", "bootstrap", "attempts", "nights", "terminal", "integrity"],
    "PoC golden artifact",
  );
  const strategyId = parseReferenceStrategyIdV1(artifact.strategyId);
  const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
  const definition = pocReferenceStrategyDefinitionsV1[strategyId];
  const bootstrap = parsePocRunBootstrapInputV1(artifact.bootstrap);
  if (bootstrap.rngSeed !== source.seed || bootstrap.runId !== definition.runId) {
    throw new TypeError("PoC golden bootstrap mismatch");
  }
  const attempts = exactDataArrayV1(artifact.attempts, "PoC golden attempts").map(
    parseGoldenAttemptV1,
  );
  if (attempts.length !== source.commands.length) {
    throw new TypeError("PoC golden attempt count differs from its tooling commands");
  }
  for (const [index, attempt] of attempts.entries()) {
    if (
      !canonicalBytesEqualV1(
        commandForPocSemanticInvocationV1(attempt.invocation),
        source.commands[index],
      )
    ) {
      throw new TypeError(`PoC golden attempt ${index} differs from its tooling command`);
    }
  }
  const nights = exactDataArrayV1(artifact.nights, "PoC golden nights").map(parseGoldenNightV1);
  if (nights.length !== 6) throw new TypeError("PoC golden artifact must contain six nights");
  const terminal = parsePocRunCompletionV1(artifact.terminal);
  if (terminal.completedAtSequence !== attempts.length) {
    throw new TypeError("PoC golden terminal sequence differs from its attempts");
  }
  const integrity = runIntegrityV1Schema.parse(artifact.integrity);
  if (
    integrity.mode !== "normal" ||
    integrity.mutationCount !== 0 ||
    integrity.firstMutationSequence !== null ||
    integrity.reasons.length !== 0
  ) {
    throw new TypeError("PoC golden artifact must have pristine RunIntegrity");
  }
  return deepFreezePocValueV1({
    strategyId,
    storyIdentity: parseStoryIdentityV1(artifact.storyIdentity),
    bootstrap,
    attempts,
    nights,
    terminal,
    integrity,
  });
}

function canonicalBytesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

export const pocGoldenArtifactSchemaV1: RuntimeSchemaV1<PocGoldenArtifactV1> = Object.freeze({
  parse: parsePocGoldenArtifactV1,
});

export async function buildPocGoldenArtifactV1(
  strategyId: PocReferenceStrategyIdV1,
  commands: readonly DeepReadonly<PocGameCommandV1>[],
): Promise<PocGoldenArtifactV1> {
  const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
  if (source === undefined || commands !== source.commands) {
    throw new TypeError("PoC golden builder requires the authoritative tooling command reference");
  }
  const compiled = await executePocToolingCommandsV1(strategyId, commands);
  if (
    compiled.finalView.status !== "terminal" ||
    compiled.finalSnapshot.integrity.mode !== "normal" ||
    compiled.results.some(({ kind }) => kind !== "committed")
  ) {
    throw new TypeError(`${strategyId} did not produce a normal committed terminal golden run`);
  }

  const attempts = compiled.fixture.entries.map((entry, index) => {
    const attempt = compiled.attempts[index];
    if (
      attempt === undefined ||
      attempt.outcome.kind !== "committed" ||
      attempt.commandSequence.before !== entry.commandSequence ||
      attempt.commandSequence.after !== entry.commandSequence + 1
    ) {
      throw new TypeError(`${strategyId} golden attempt ${index} lost same-attempt evidence`);
    }
    return deepFreezePocValueV1({
      order: entry.order,
      day: entry.day,
      phase: entry.phase,
      commandSequenceBefore: entry.commandSequence,
      invocation: entry.invocation,
      preStateDigest: attempt.preStateDigest,
      postStateDigest: attempt.postStateDigest,
      gameplayFactKinds: attempt.outcome.facts.map(({ kind }) => kind),
      rngDraws: attempt.attemptedDraws,
    });
  });

  const state = compiled.finalSnapshot.state;
  if (state.simulation.tavern.serviceHistory.length !== 6) {
    throw new TypeError(`${strategyId} did not persist six service-history rows`);
  }
  const ledgerById = new Map(
    state.simulation.inventory.ledger.map((entry) => [entry.entryId, entry] as const),
  );
  const nights = state.simulation.tavern.serviceHistory.map((service) => {
    const entryIds = service.kind === "opening" ? service.opening.entryIds : [];
    const ledgerEntries = entryIds.map((entryId) => {
      const entry = ledgerById.get(entryId);
      if (entry === undefined) {
        throw new TypeError(`${strategyId} service history references missing ledger ${entryId}`);
      }
      return entry;
    });
    const night = deepFreezePocValueV1({
      day: serviceDayV1(service),
      service,
      ledgerEntries,
    });
    assertGoldenNightLedgerV1(night);
    return night;
  });

  const terminal = state.simulation.run.completion;
  if (terminal === null) throw new TypeError(`${strategyId} did not persist Run completion`);
  return pocGoldenArtifactSchemaV1.parse({
    strategyId,
    storyIdentity: pocStoryIdentityV1,
    bootstrap: Object.freeze({
      rngSeed: source.seed,
      runId: pocReferenceStrategyDefinitionsV1[strategyId].runId,
    }),
    attempts,
    nights,
    terminal,
    integrity: compiled.finalSnapshot.integrity,
  });
}

export function canonicalPocGoldenArtifactBytesV1(
  artifactValue: DeepReadonly<PocGoldenArtifactV1>,
): Uint8Array {
  const artifact = pocGoldenArtifactSchemaV1.parse(artifactValue);
  const sorted = JSON.parse(new TextDecoder().decode(canonicalJsonBytes(artifact))) as unknown;
  return new TextEncoder().encode(`${JSON.stringify(sorted, null, 2)}\n`);
}

function goldenFixtureUrlV1(strategyId: PocReferenceStrategyIdV1): URL {
  return new URL(`../test/fixtures/golden/${strategyId}.json`, import.meta.url);
}

export async function readPocGoldenFixtureV1(
  strategyId: PocReferenceStrategyIdV1,
): Promise<PocGoldenArtifactV1> {
  const fileReader = (await import(nodeFileReaderSpecifierV1)) as {
    readFile(path: URL): Promise<Uint8Array>;
  };
  let bytes: Uint8Array;
  try {
    bytes = await fileReader.readFile(goldenFixtureUrlV1(strategyId));
  } catch (error) {
    throw new TypeError(`unable to read PoC golden artifact for ${strategyId}`, { cause: error });
  }
  const decoded = parseStrictJson(bytes, goldenJsonLimitsV1);
  if (!decoded.ok) {
    throw new TypeError(`PoC golden artifact violates Strict JSON: ${decoded.error.code}`);
  }
  const artifact = pocGoldenArtifactSchemaV1.parse(decoded.value);
  if (artifact.strategyId !== strategyId) {
    throw new TypeError(`PoC golden artifact path ${strategyId} contains ${artifact.strategyId}`);
  }
  if (!bytesEqualV1(bytes, canonicalPocGoldenArtifactBytesV1(artifact))) {
    throw new TypeError(`PoC golden artifact for ${strategyId} is not canonical JSON`);
  }
  return artifact;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
