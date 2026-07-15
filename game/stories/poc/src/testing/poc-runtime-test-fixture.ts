// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createDebugBundleEnvelopeSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
  runtimeOperationFaultSchemaV1,
} from "@sillymaker/base";
import type {
  DebugToolsPortV1,
  DebugBundleEnvelopeV1,
  DeepReadonly,
  ExportedDebugBundleV1,
  ExportedSaveV1,
  IsoUtcInstant,
  LeaseHandoffRequestId,
  PersistenceOperationResultV1,
  PlayerDiagnosticsPortV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
  RuntimeOperationFaultV1,
  RuntimeSchemaV1,
  SessionLeaseOwnerId,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  createDebugToolsPortV1,
  createGameDiagnosticsServiceV1,
  createGameApplicationV1,
  createGameSessionV1,
  createPersistenceServiceV1,
  createRuntimeCapabilityPortV1,
  decodeDebugBundleV1,
  inspectReplayBestEffortV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  DebugBundleCodecContextV1,
  DebugBundleDecodeResultV1,
  FinalizedCommandAttemptV1,
  GameSessionCompositionV1,
  GameSessionDebugInputV1,
  ReplayDriverV1,
  ReplayComparisonV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
} from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import {
  createPocSemanticGamePortV1,
  type PocSemanticGamePortV1,
} from "../application/create-poc-semantic-port.js";
import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import {
  createPocGameDebugCommandExecutorV1,
  createPocGameplayModuleTupleV1,
  deepFreezePocValueV1,
  parseRunId,
  pocDebugCommandKindsV1,
  pocDebugCommandSchemaV1,
  pocGameCommandSchemaV1,
  pocGameStateSchemaV1,
  pocGameplayFactSchemaV1,
  pocRejectionReasonSchemaV1,
  type PocDebugCommandV1,
  type PocEngineFaultV1,
  type PocGameDebugCommandExecutorV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
  type PocGameStateV1,
  type PocGameplayModuleTupleV1,
  type PocReplayableDebugExecutionAttemptV1,
} from "../gameplay/index.js";
import { pocStoryEntryV1, type PocResolvedGameV1 } from "../story-definition.js";
import type { PocStoryToolingFixtureV1 } from "../tooling-fixtures.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "./save-fixture-builder.js";

const pocToolingSpecifierV1 = "@project-tavern/story-poc/tooling" as const;
const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(pocGameStateSchemaV1, rngStateV1Schema);

type PocToolingModuleV1 = {
  readonly pocStoryToolingEntryV1: typeof import("../tooling/index.js").pocStoryToolingEntryV1;
};

export type PocToolingLoaderV1 = (
  specifier: typeof pocToolingSpecifierV1,
) => Promise<PocToolingModuleV1>;

type PocSessionV1 = GameSessionCompositionV1<PocGameSimulationTypesV1>;
type PocCommandLogEntryV1 = ReturnType<PocSessionV1["commandLog"]["entries"]>[number];
type PocReplayLoggedCommandV1 =
  | ReplayLoggedCommandV1<"game", PocGameSimulationTypesV1["command"]>
  | ReplayLoggedCommandV1<"debug", PocGameSimulationTypesV1["debugCommand"]>;
type PocFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  PocGameSnapshotV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;
type PocReplayDriverV1 = ReplayDriverV1<
  PocGameSnapshotV1,
  PocReplayLoggedCommandV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;
type PocReplayInputV1 = ReplayInputV1<
  PocGameSnapshotV1,
  PocReplayLoggedCommandV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;

interface PocRuntimeTestDiagnosticSummaryV1 {
  readonly kind: "poc_runtime_test";
  readonly commandLogEntryCount: number;
}

type PocDebugBundleV1 = DebugBundleEnvelopeV1<
  PocResolvedGameV1["provenance"],
  RuntimeCapabilitiesV1,
  readonly SimulationAdoptionV1[],
  PocGameSnapshotV1,
  PocCommandLogEntryV1,
  PocRuntimeTestDiagnosticSummaryV1,
  RuntimeOperationFaultV1,
  never,
  never
>;

const emptySimulationLineageV1 = Object.freeze([]) as readonly SimulationAdoptionV1[];
const emptyRuntimeFailuresV1 = Object.freeze([]) as readonly RuntimeOperationFaultV1[];
const metadataClockV1 = Object.freeze({
  now: () => "2026-07-16T00:00:00.000Z" as IsoUtcInstant,
});

type PocCommandLogOutcomeV1 = PocCommandLogEntryV1["outcome"];
type PocRngDrawTraceV1 = PocGameSimulationTypesV1["rngDrawTrace"];

const strictJsonMaximumArrayItemsV1 = 10_000;

function exactFieldsV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).toSorted();
  const sortedExpectedKeys = [...expectedKeys].toSorted();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const fields: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
    fields[key] = descriptor.value;
  }
  return Object.freeze(fields);
}

function parseDenseArrayV1<T>(
  value: unknown,
  maximumItems: number,
  parseEntry: (entry: unknown, index: number) => T,
  label: string,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > maximumItems
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    keys.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry ${index}`);
      }
      return parseEntry(descriptor.value, index);
    }),
  );
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parsePocBuildProvenanceV1(value: unknown): PocResolvedGameV1["provenance"] {
  const fields = exactFieldsV1(value, ["story", "engine", "resolved"], "PoC provenance");
  const story = exactFieldsV1(fields.story, ["id", "revision", "digest"], "PoC Story provenance");
  const engine = exactFieldsV1(fields.engine, ["version", "digest"], "PoC engine provenance");
  const resolved = exactFieldsV1(
    fields.resolved,
    [
      "stateContractRevision",
      "stateContractDigest",
      "simulationDigest",
      "presentationDigest",
      "patchSet",
    ],
    "PoC resolved provenance",
  );
  const patchSet = exactFieldsV1(
    resolved.patchSet,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PoC PatchSet provenance",
  );
  const appliedHotfixes = parseDenseArrayV1(
    patchSet.appliedHotfixes,
    strictJsonMaximumArrayItemsV1,
    (entry) => {
      const hotfix = exactFieldsV1(
        entry,
        ["identity", "ordinal", "replacements"],
        "PoC applied Hotfix",
      );
      const identity = exactFieldsV1(
        hotfix.identity,
        ["id", "revision", "digest"],
        "PoC applied Hotfix identity",
      );
      const replacements = parseDenseArrayV1(
        hotfix.replacements,
        strictJsonMaximumArrayItemsV1,
        (replacementValue) => {
          const replacement = exactFieldsV1(
            replacementValue,
            ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
            "PoC Patch replacement",
          );
          const surface = replacement.surface;
          const kind = replacement.kind;
          if (
            (surface !== "simulation" && surface !== "presentation") ||
            (surface === "simulation" && kind !== "rule" && kind !== "value") ||
            (surface === "presentation" && kind !== "value" && kind !== "text" && kind !== "asset")
          ) {
            throw new TypeError("invalid PoC Patch replacement surface or kind");
          }
          return Object.freeze({
            surface,
            symbolId: nonemptyStringV1(replacement.symbolId, "PoC Patch symbol ID"),
            kind,
            previousProviderDigest: parseDigest(replacement.previousProviderDigest),
            nextProviderDigest: parseDigest(replacement.nextProviderDigest),
          });
        },
        "PoC Patch replacements",
      );
      return Object.freeze({
        identity: Object.freeze({
          id: nonemptyStringV1(identity.id, "PoC Hotfix ID"),
          revision: parsePositiveSafeInteger(identity.revision),
          digest: parseDigest(identity.digest),
        }),
        ordinal: parsePositiveSafeInteger(hotfix.ordinal),
        replacements,
      });
    },
    "PoC applied Hotfixes",
  );
  if (
    new Set(appliedHotfixes.map(({ identity }) => identity.id)).size !== appliedHotfixes.length ||
    appliedHotfixes.some(({ ordinal }, index) => ordinal !== index + 1)
  ) {
    throw new TypeError("invalid PoC applied Hotfix order");
  }
  return Object.freeze({
    story: Object.freeze({
      id: nonemptyStringV1(story.id, "PoC Story ID"),
      revision: parsePositiveSafeInteger(story.revision),
      digest: parseDigest(story.digest),
    }),
    engine: Object.freeze({
      version: nonemptyStringV1(engine.version, "PoC engine version"),
      digest: parseDigest(engine.digest),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(resolved.stateContractRevision),
      stateContractDigest: parseDigest(resolved.stateContractDigest),
      simulationDigest: parseDigest(resolved.simulationDigest),
      presentationDigest: parseDigest(resolved.presentationDigest),
      patchSet: Object.freeze({
        digest: parseDigest(patchSet.digest),
        simulationDigest: parseDigest(patchSet.simulationDigest),
        presentationDigest: parseDigest(patchSet.presentationDigest),
        appliedHotfixes,
      }),
    }),
  }) as PocResolvedGameV1["provenance"];
}

const runtimeCapabilitiesSchemaV1: RuntimeSchemaV1<RuntimeCapabilitiesV1> = Object.freeze({
  parse(value: unknown): RuntimeCapabilitiesV1 {
    const record = exactFieldsV1(
      value,
      ["debugTools", "cheats", "automationBridge"],
      "PoC runtime capabilities",
    );
    if (
      typeof record.debugTools !== "boolean" ||
      typeof record.cheats !== "boolean" ||
      typeof record.automationBridge !== "boolean"
    ) {
      throw new TypeError("invalid runtime capabilities");
    }
    return Object.freeze({
      debugTools: record.debugTools,
      cheats: record.cheats,
      automationBridge: record.automationBridge,
    });
  },
});

const emptySimulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> =
  Object.freeze({
    parse(value: unknown): readonly SimulationAdoptionV1[] {
      parseDenseArrayV1(
        value,
        0,
        (): never => {
          throw new TypeError("unexpected PoC test Simulation adoption");
        },
        "PoC test Simulation lineage",
      );
      return emptySimulationLineageV1;
    },
  });

const absentEvidenceSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("unexpected test Debug Bundle evidence");
  },
});

const storyRuleFaultCodesV1 = new Set([
  "rule.threw",
  "rule.returned_thenable",
  "rule.output_invalid",
  "effect.invalid",
]);
const commandHandlerFaultCodesV1 = new Set([
  "command.handler_threw",
  "command.handler_not_implemented",
  "narrative.step_limit_exceeded",
  "narrative.call_depth_exceeded",
]);
const engineInvariantCodesV1 = new Set([
  "snapshot.schema",
  "rng.invalid",
  "resource.negative",
  "stamina.above_maximum",
  "calendar.invalid",
  "workflow.conflict",
  "scheduler.multiple_blocking_events",
  "narrative.blocking_conflict",
  "opening.invalid_checkpoint",
  "narrative.invalid_cursor",
  "story.reference_missing",
  "story.value_invalid",
  "collection.duplicate_id",
  "collection.unstable_order",
  "ledger.unbalanced",
  "terminal_state.invalid",
]);
const storyRuleSlotsV1 = new Set([
  "demand.preview",
  "demand.resolve",
  "tavern.preview",
  "tavern.settle",
  "checks.describe",
  "checks.resolve",
  "endings.evaluate",
]);
const pocDiagnosticTextMaximumBytesV1 = 65_536;
const pocDiagnosticTextEncoderV1 = new TextEncoder();

function parsePocDiagnosticTextV1(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    pocDiagnosticTextEncoderV1.encode(value).byteLength > pocDiagnosticTextMaximumBytesV1
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parsePocEngineFaultV1(value: unknown): PocEngineFaultV1 {
  const hasStack = value !== null && typeof value === "object" && Object.hasOwn(value, "stack");
  const fields = exactFieldsV1(
    value,
    ["category", "code", "ruleSlot", "message", ...(hasStack ? ["stack"] : [])],
    "PoC engine fault",
  );
  const message = parsePocDiagnosticTextV1(fields.message, "PoC engine fault message");
  const stack = hasStack
    ? parsePocDiagnosticTextV1(fields.stack, "PoC engine fault stack")
    : undefined;
  const shared = {
    message,
    ...(stack === undefined ? {} : { stack }),
  };
  if (
    fields.category === "story_rule" &&
    typeof fields.code === "string" &&
    storyRuleFaultCodesV1.has(fields.code) &&
    typeof fields.ruleSlot === "string" &&
    storyRuleSlotsV1.has(fields.ruleSlot)
  ) {
    return Object.freeze({
      category: "story_rule",
      code: fields.code,
      ruleSlot: fields.ruleSlot,
      ...shared,
    }) as PocEngineFaultV1;
  }
  if (
    fields.category === "engine_invariant" &&
    typeof fields.code === "string" &&
    engineInvariantCodesV1.has(fields.code) &&
    fields.ruleSlot === null
  ) {
    return Object.freeze({
      category: "engine_invariant",
      code: fields.code,
      ruleSlot: null,
      ...shared,
    }) as PocEngineFaultV1;
  }
  if (
    fields.category === "command_handler" &&
    typeof fields.code === "string" &&
    commandHandlerFaultCodesV1.has(fields.code) &&
    fields.ruleSlot === null
  ) {
    return Object.freeze({
      category: "command_handler",
      code: fields.code,
      ruleSlot: null,
      ...shared,
    }) as PocEngineFaultV1;
  }
  throw new TypeError("invalid PoC engine fault category, code, or Rule slot");
}

function parsePocRngDrawTraceV1(value: unknown): PocRngDrawTraceV1 {
  const fields = exactFieldsV1(
    value,
    ["ordinal", "purpose", "exclusiveMax", "result", "before", "after"],
    "PoC RNG draw trace",
  );
  const purpose = nonemptyStringV1(fields.purpose, "PoC RNG purpose");
  if (purpose.length > 128 || !/^(?:demand|check|scheduler):[a-z0-9._:-]+$/u.test(purpose)) {
    throw new TypeError("invalid PoC RNG purpose");
  }
  const exclusiveMax = parsePositiveSafeInteger(fields.exclusiveMax);
  const result = parseNonNegativeSafeInteger(fields.result);
  if (exclusiveMax > 0x1_0000_0000 || result >= exclusiveMax) {
    throw new TypeError("invalid PoC RNG draw range");
  }
  return Object.freeze({
    ordinal: parsePositiveSafeInteger(fields.ordinal),
    purpose,
    exclusiveMax,
    result,
    before: rngStateV1Schema.parse(fields.before),
    after: rngStateV1Schema.parse(fields.after),
  });
}

function parsePocCommandLogOutcomeV1(
  value: unknown,
  source: "game" | "debug",
): PocCommandLogOutcomeV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid PoC CommandLog outcome");
  }
  const kind = Object.getOwnPropertyDescriptor(value, "kind")?.value;
  if (kind === "committed") {
    const fields = exactFieldsV1(value, ["kind", "facts"], "committed PoC outcome");
    return Object.freeze({
      kind: "committed",
      facts: parseDenseArrayV1(
        fields.facts,
        strictJsonMaximumArrayItemsV1,
        (fact) => pocGameplayFactSchemaV1.parse(fact),
        "committed PoC facts",
      ),
    });
  }
  if (kind === "rejected") {
    if (source !== "game") throw new TypeError("PoC DebugCommand log entry cannot be rejected");
    const fields = exactFieldsV1(value, ["kind", "reasons"], "rejected PoC outcome");
    return Object.freeze({
      kind: "rejected",
      reasons: parseDenseArrayV1(
        fields.reasons,
        strictJsonMaximumArrayItemsV1,
        (reason) => pocRejectionReasonSchemaV1.parse(reason),
        "PoC rejection reasons",
      ),
    });
  }
  if (kind === "faulted") {
    const fields = exactFieldsV1(value, ["kind", "fault"], "faulted PoC outcome");
    return Object.freeze({ kind: "faulted", fault: parsePocEngineFaultV1(fields.fault) });
  }
  throw new TypeError("invalid PoC CommandLog outcome kind");
}

const pocCommandLogEntrySchemaV1: RuntimeSchemaV1<PocCommandLogEntryV1> = Object.freeze({
  parse(value: unknown): PocCommandLogEntryV1 {
    const hasCandidateRngAfter =
      value !== null && typeof value === "object" && Object.hasOwn(value, "candidateRngAfter");
    const fields = exactFieldsV1(
      value,
      [
        "source",
        "command",
        "logOrdinal",
        "preStateDigest",
        "postStateDigest",
        "commandSequence",
        "committedRngBefore",
        "attemptedDraws",
        ...(hasCandidateRngAfter ? ["candidateRngAfter"] : []),
        "committedRngAfter",
        "outcome",
      ],
      "PoC CommandLog entry",
    );
    if (fields.source !== "game" && fields.source !== "debug") {
      throw new TypeError("invalid PoC CommandLog source");
    }
    const source = fields.source;
    const sequence = exactFieldsV1(
      fields.commandSequence,
      ["before", "after"],
      "PoC CommandLog sequence",
    );
    const candidateRngAfter = hasCandidateRngAfter
      ? rngStateV1Schema.parse(fields.candidateRngAfter)
      : undefined;
    return Object.freeze({
      source,
      command:
        source === "game"
          ? pocGameCommandSchemaV1.parse(fields.command)
          : pocDebugCommandSchemaV1.parse(fields.command),
      logOrdinal: parsePositiveSafeInteger(fields.logOrdinal),
      preStateDigest: parseDigest(fields.preStateDigest),
      postStateDigest: parseDigest(fields.postStateDigest),
      commandSequence: Object.freeze({
        before: parseNonNegativeSafeInteger(sequence.before),
        after: parseNonNegativeSafeInteger(sequence.after),
      }),
      committedRngBefore: rngStateV1Schema.parse(fields.committedRngBefore),
      attemptedDraws: parseDenseArrayV1(
        fields.attemptedDraws,
        strictJsonMaximumArrayItemsV1,
        (draw) => parsePocRngDrawTraceV1(draw),
        "PoC attempted RNG draws",
      ),
      ...(candidateRngAfter === undefined ? {} : { candidateRngAfter }),
      committedRngAfter: rngStateV1Schema.parse(fields.committedRngAfter),
      outcome: parsePocCommandLogOutcomeV1(fields.outcome, source),
    }) as PocCommandLogEntryV1;
  },
});

const pocDiagnosticSummarySchemaV1: RuntimeSchemaV1<PocRuntimeTestDiagnosticSummaryV1> =
  Object.freeze({
    parse(value: unknown): PocRuntimeTestDiagnosticSummaryV1 {
      const fields = exactFieldsV1(
        value,
        ["kind", "commandLogEntryCount"],
        "PoC diagnostic summary",
      );
      if (fields.kind !== "poc_runtime_test") {
        throw new TypeError("invalid PoC diagnostic summary kind");
      }
      return Object.freeze({
        kind: "poc_runtime_test",
        commandLogEntryCount: parseNonNegativeSafeInteger(fields.commandLogEntryCount),
      });
    },
  });

function sameRngStateV1(
  left: DeepReadonly<PocGameSnapshotV1["rng"]>,
  right: DeepReadonly<PocGameSnapshotV1["rng"]>,
): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.cursor === right.cursor &&
    left.rawDrawCount === right.rawDrawCount
  );
}

function createPocDebugBundleCodecV1(): DebugBundleCodecContextV1<
  PocGameSnapshotV1,
  PocDebugBundleV1
> {
  const bundleSchema = createDebugBundleEnvelopeSchemaV1({
    provenanceSchema: Object.freeze({ parse: parsePocBuildProvenanceV1 }),
    capabilitiesSchema: runtimeCapabilitiesSchemaV1,
    simulationLineageSchema: emptySimulationLineageSchemaV1,
    snapshotSchema: snapshotSchemaV1,
    commandLogEntrySchema: pocCommandLogEntrySchemaV1,
    diagnosticsSchema: pocDiagnosticSummarySchemaV1,
    runtimeFailureSchema: runtimeOperationFaultSchemaV1,
    failureSchema: absentEvidenceSchemaV1,
    uiContextSchema: absentEvidenceSchemaV1,
  });
  return Object.freeze({
    bundleSchema,
    validateEnvelope(bundle: PocDebugBundleV1) {
      if (
        bundle.provenance.story.id !== pocStoryIdentityV1.id ||
        bundle.provenance.story.revision !== pocStoryIdentityV1.revision ||
        bundle.diagnostics.kind !== "poc_runtime_test" ||
        bundle.diagnostics.commandLogEntryCount !== bundle.commandLog.length
      ) {
        throw new TypeError("invalid PoC test Debug Bundle identity or diagnostics");
      }

      let expectedPreDigest = bundle.replayBaseStateDigest;
      let expectedSequence = bundle.replayBase.commandSequence;
      let expectedRng = bundle.replayBase.rng;
      let previousOrdinal: number | undefined;
      for (const entry of bundle.commandLog) {
        if (
          entry.preStateDigest !== expectedPreDigest ||
          entry.commandSequence.before !== expectedSequence ||
          !sameRngStateV1(entry.committedRngBefore, expectedRng) ||
          (previousOrdinal !== undefined && entry.logOrdinal !== previousOrdinal + 1)
        ) {
          throw new TypeError("invalid PoC Debug Bundle CommandLog continuity");
        }

        let attemptedRng = entry.committedRngBefore;
        for (let index = 0; index < entry.attemptedDraws.length; index += 1) {
          const draw = entry.attemptedDraws[index];
          if (
            draw === undefined ||
            draw.ordinal !== index + 1 ||
            !sameRngStateV1(draw.before, attemptedRng)
          ) {
            throw new TypeError("invalid PoC Debug Bundle RNG trace continuity");
          }
          attemptedRng = draw.after;
        }
        if (
          entry.candidateRngAfter !== undefined &&
          !sameRngStateV1(entry.candidateRngAfter, attemptedRng)
        ) {
          throw new TypeError("invalid PoC Debug Bundle candidate RNG state");
        }

        if (entry.outcome.kind === "committed") {
          if (
            entry.commandSequence.after !== entry.commandSequence.before + 1 ||
            (entry.candidateRngAfter !== undefined &&
              !sameRngStateV1(entry.committedRngAfter, entry.candidateRngAfter))
          ) {
            throw new TypeError("invalid committed PoC Debug Bundle CommandLog entry");
          }
        } else if (
          entry.commandSequence.after !== entry.commandSequence.before ||
          entry.postStateDigest !== entry.preStateDigest ||
          !sameRngStateV1(entry.committedRngAfter, entry.committedRngBefore)
        ) {
          throw new TypeError("invalid non-committed PoC Debug Bundle CommandLog entry");
        }

        expectedPreDigest = entry.postStateDigest;
        expectedSequence = entry.commandSequence.after;
        expectedRng = entry.committedRngAfter;
        previousOrdinal = entry.logOrdinal;
      }
      if (
        expectedPreDigest !== bundle.currentStateDigest ||
        expectedSequence !== bundle.currentSnapshot.commandSequence ||
        !sameRngStateV1(expectedRng, bundle.currentSnapshot.rng)
      ) {
        throw new TypeError("PoC Debug Bundle current Snapshot breaks replay continuity");
      }
    },
  });
}

export type PocDebugCommandResultV1 =
  | { readonly kind: "capability_disabled" }
  | {
      readonly kind: "validation_failed";
      readonly error:
        | PocGameSimulationTypesV1["debugValidationError"]
        | { readonly code: "debug.command_schema_invalid" };
    }
  | { readonly kind: "committed"; readonly commandSequence: number }
  | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 };

export type PocDebugAnchorResultV1 =
  | { readonly kind: "capability_disabled" }
  | {
      readonly kind: "validation_failed";
      readonly error: {
        readonly code: "debug.unknown_reference";
        readonly commandKind: "debug.fixture.load";
        readonly reference: { readonly kind: "fixture"; readonly fixtureId: string };
      };
    }
  | {
      readonly kind: "validation_failed";
      readonly error:
        | { readonly code: "debug.bundle_invalid"; readonly rejection: string }
        | { readonly code: "debug.bundle_replay_mismatch" };
    }
  | { readonly kind: "anchor_established"; readonly commandSequence: number }
  | { readonly kind: "faulted"; readonly fault: PocEngineFaultV1 };

type PocDebugReplayResultV1 =
  | { readonly kind: "rejected"; readonly code: string }
  | { readonly kind: "replayed"; readonly comparison: ReplayComparisonV1 };
type PocDiagnosticQueryV1 = { readonly kind: "summary" };
type PocDiagnosticQueryResultV1 =
  | { readonly kind: "validation_failed" }
  | { readonly kind: "summary"; readonly commandLogEntryCount: number };
type PocDebugToolsPortV1 = DebugToolsPortV1<
  PocDebugCommandV1,
  PocDebugCommandResultV1,
  string,
  PocDebugAnchorResultV1,
  DebugBundleDecodeResultV1<PocDebugBundleV1>,
  PocDebugReplayResultV1,
  PocDebugReplayResultV1,
  PocDiagnosticQueryV1,
  PocDiagnosticQueryResultV1
>;

interface PocRuntimeTestPersistencePortV1 {
  exportCurrentSave(): Promise<ExportedSaveV1>;
  importSave(bytes: Uint8Array): Promise<PersistenceOperationResultV1>;
}

export interface PocRuntimeTestFixtureV1 {
  readonly application: {
    readonly semantic: PocSemanticGamePortV1;
    readonly lifecycle: object;
    readonly persistence: PocRuntimeTestPersistencePortV1;
    readonly diagnostics: PlayerDiagnosticsPortV1<ExportedDebugBundleV1>;
    readonly capabilities: RuntimeCapabilityPortV1;
    readonly debugTools: PocDebugToolsPortV1;
  };
  toolingLoads(): number;
  loadedSpecifier(): typeof pocToolingSpecifierV1 | undefined;
  snapshotForTest(): DeepReadonly<PocGameSnapshotV1>;
  commandLogForTest(): readonly DeepReadonly<PocCommandLogEntryV1>[];
  latestCommandLogEntry(): DeepReadonly<PocCommandLogEntryV1> | undefined;
  debugExecutorValidateCalls(): number;
  debugExecutorExecuteAttemptCalls(): number;
  nextSemanticPublication(): ReturnType<PocSemanticGamePortV1["waitForIdle"]>;
  roundTripExactSave(): Promise<{ readonly snapshot: DeepReadonly<PocGameSnapshotV1> }>;
  exportDebugBundleForTest(): Promise<DeepReadonly<PocDebugBundleV1>>;
  replayForTest(): Promise<{
    readonly comparison: ReplayComparisonV1;
    readonly finalSnapshot: DeepReadonly<PocGameSnapshotV1>;
  }>;
}

export interface PocReplayableDebugIntegrationVectorV1 {
  readonly kind: PocDebugCommandV1["kind"];
  readonly command: DeepReadonly<PocDebugCommandV1>;
}

function debugCommandV1(value: unknown): PocDebugCommandV1 {
  return pocDebugCommandSchemaV1.parse(value);
}

export const pocReplayableDebugIntegrationVectorsV1 = Object.freeze([
  {
    kind: "debug.calendar.set_ap",
    command: debugCommandV1({
      kind: "debug.calendar.set_ap",
      value: 1,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.actor.set_stamina",
    command: debugCommandV1({
      kind: "debug.actor.set_stamina",
      actorId: "actor.player",
      value: 9,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.actor.set_mood",
    command: debugCommandV1({
      kind: "debug.actor.set_mood",
      actorId: "actor.heroine",
      value: 1,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.relationship.set",
    command: debugCommandV1({
      kind: "debug.relationship.set",
      affection: 1,
      teamwork: 1,
      stage: "cold",
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.inventory.adjust_cash",
    command: debugCommandV1({
      kind: "debug.inventory.adjust_cash",
      delta: 1,
      reasonId: "reason.debug.cash_adjustment",
    }),
  },
  {
    kind: "debug.aura.apply",
    command: debugCommandV1({
      kind: "debug.aura.apply",
      auraId: "tavern.sign_repaired",
      target: { kind: "tavern" },
      duration: { kind: "countdown", unit: "opening", remaining: 1 },
      reasonId: "reason.debug.aura_adjustment",
    }),
  },
  {
    kind: "debug.aura.clear",
    command: debugCommandV1({
      kind: "debug.aura.clear",
      instanceId: "aura:initial:0",
      reasonId: "reason.debug.aura_adjustment",
    }),
  },
  {
    kind: "debug.story.fact.set",
    command: debugCommandV1({
      kind: "debug.story.fact.set",
      factId: "fact.war_clue",
      value: { kind: "boolean", value: true },
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.narrative.jump",
    command: debugCommandV1({
      kind: "debug.narrative.jump",
      cursor: {
        sceneId: "scene.supplier_invoice",
        nodeId: "node.supplier_invoice.choice",
      },
      reasonId: "reason.debug.narrative_jump",
    }),
  },
  {
    kind: "debug.rng.set",
    command: debugCommandV1({
      kind: "debug.rng.set",
      rng: { algorithm: "xorshift32-v1", cursor: 17, rawDrawCount: 4 },
      reasonId: "reason.debug.rng_override",
    }),
  },
] as const satisfies readonly PocReplayableDebugIntegrationVectorV1[]);

if (
  pocReplayableDebugIntegrationVectorsV1.length !== pocDebugCommandKindsV1.length ||
  pocReplayableDebugIntegrationVectorsV1.some(
    ({ kind }, index) => kind !== pocDebugCommandKindsV1[index],
  )
) {
  throw new TypeError("PoC debug integration matrix does not cover the frozen command-kind order");
}

export function unknownReasonDebugCommandV1(): PocDebugCommandV1 {
  return debugCommandV1({
    kind: "debug.calendar.set_ap",
    value: 1,
    reasonId: "reason.unknown",
  });
}

export function validSetMoodDebugCommandV1(): PocDebugCommandV1 {
  return debugCommandV1({
    kind: "debug.actor.set_mood",
    actorId: "actor.heroine",
    value: 1,
    reasonId: "reason.debug.state_override",
  });
}

function createInitialSnapshotV1(
  resolved: PocResolvedGameV1,
  mode: "default" | "debug_matrix",
): PocGameSnapshotV1 {
  const bootstrap = Object.freeze({
    rngSeed: pocReferenceSeedV1,
    runId: pocReferenceRunIdsV1["strategy.cash_first"],
  });
  const initial = snapshotSchemaV1.parse({
    state: resolved.gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  if (mode === "default") return initial;

  return snapshotSchemaV1.parse({
    ...initial,
    state: pocGameStateSchemaV1.parse({
      ...initial.state,
      simulation: {
        ...initial.state.simulation,
        status: {
          auras: [
            {
              instanceId: "aura:initial:0",
              auraId: "heroine.angry",
              target: { kind: "actor", actorId: "actor.heroine" },
              source: { kind: "initial", reasonId: "reason.aura.heroine_angry" },
              duration: { kind: "countdown", unit: "day_end", remaining: 2 },
              appliedAtSequence: 0,
            },
          ],
        },
      },
      story: {
        ...initial.state.story,
        narrative: {
          status: "active",
          source: { kind: "manifest_start" },
          cursor: {
            sceneId: "scene.manifest_start",
            nodeId: "node.manifest_start.card",
          },
          callStack: [],
          stage: initial.state.story.narrative.stage,
        },
      },
    }),
  });
}

function unexpectedFaultV1(error: unknown): PocEngineFaultV1 {
  return deepFreezePocValueV1({
    category: "command_handler",
    code: "command.handler_threw",
    ruleSlot: null,
    message: error instanceof Error ? error.message : "unexpected PoC runtime failure",
  });
}

function unexpectedFaultAttemptV1(
  error: unknown,
  snapshot: DeepReadonly<PocGameSnapshotV1>,
): PocReplayableDebugExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot: snapshot as PocGameSnapshotV1,
      fault: unexpectedFaultV1(error),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: Object.freeze([]),
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    }),
  });
}

function debugExecutorV1(
  resolved: PocResolvedGameV1,
  injectedOwnerFault: "actors.after_proposal" | undefined,
): PocGameDebugCommandExecutorV1 {
  if (injectedOwnerFault === undefined) return resolved.gameSimulation.debugCommandExecutor;

  const modules = createPocGameplayModuleTupleV1(resolved.simulationProgram);
  const actors = modules[2];
  const faultedActors = Object.freeze({
    ...actors,
    owner: Object.freeze({
      ...actors.owner,
      propose(...args: Parameters<typeof actors.owner.propose>) {
        void actors.owner.propose(...args);
        throw new TypeError("injected actors failure after proposal");
      },
    }),
  });
  const faultedModules = Object.freeze([
    modules[0],
    modules[1],
    faultedActors,
    modules[3],
    modules[4],
    modules[5],
    modules[6],
    modules[7],
    modules[8],
    modules[9],
  ]) as PocGameplayModuleTupleV1;
  return createPocGameDebugCommandExecutorV1(resolved.simulationProgram, faultedModules);
}

function createSessionV1(input: {
  readonly resolved: PocResolvedGameV1;
  readonly initialSnapshot: PocGameSnapshotV1;
  readonly debugExecutor: PocGameDebugCommandExecutorV1;
  onDebugValidate(): void;
  onDebugExecuteAttempt(): void;
}): PocSessionV1 {
  const debug = Object.freeze({
    validate(snapshot, command) {
      input.onDebugValidate();
      return input.debugExecutor.validate(snapshot, command, undefined);
    },
    executeAttempt(snapshot, command) {
      input.onDebugExecuteAttempt();
      return input.debugExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedFault(error, snapshot) {
      return unexpectedFaultAttemptV1(error, snapshot);
    },
  } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>);

  return createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: input.initialSnapshot,
    commandSchema: input.resolved.gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      input.resolved.gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault: unexpectedFaultAttemptV1,
    debug,
  });
}

function createPocReplayDriverV1(
  resolved: PocResolvedGameV1,
  replayBase: DeepReadonly<PocGameSnapshotV1>,
): PocReplayDriverV1 {
  let capturedAttempt: PocFinalizedAttemptV1 | null = null;
  const isolated = createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: snapshotSchemaV1.parse(replayBase),
    commandSchema: resolved.gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      resolved.gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault: unexpectedFaultAttemptV1,
    debug: Object.freeze({
      validate: (snapshot, command) =>
        resolved.gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined),
      executeAttempt: (snapshot, command) =>
        resolved.gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined),
      normalizeUnexpectedFault: unexpectedFaultAttemptV1,
    } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>),
    onAttempt(attempt) {
      capturedAttempt = attempt;
    },
  });

  return Object.freeze({
    getCurrentSnapshot: isolated.session.getCurrentSnapshot,
    async submit(loggedCommand: DeepReadonly<PocReplayLoggedCommandV1>) {
      capturedAttempt = null;
      if (loggedCommand.source === "debug") {
        const result = await isolated.debugControl.execute(loggedCommand.command, () => true);
        if (result.kind !== "executed") {
          throw new TypeError("PoC replay did not execute a DebugCommand entry");
        }
        return result.attempt;
      }
      const result = await isolated.session.dispatch(loggedCommand.command);
      const finalizedAttempt = capturedAttempt;
      if (result.kind !== "executed" || finalizedAttempt === null) {
        throw new TypeError("PoC replay did not capture a finalized GameCommand attempt");
      }
      return finalizedAttempt;
    },
  });
}

function createPocReplayInputV1(
  resolved: PocResolvedGameV1,
  bundle: DeepReadonly<PocDebugBundleV1>,
  captureDriver?: (driver: PocReplayDriverV1) => void,
): PocReplayInputV1 {
  return Object.freeze({
    recordedIdentity: Object.freeze({
      provenance: bundle.provenance,
      ...(bundle.appBuildId === undefined ? {} : { appBuildId: bundle.appBuildId }),
    }),
    runtimeIdentity: Object.freeze({ provenance: resolved.provenance }),
    replayBase: bundle.replayBase,
    replayBaseStateDigest: bundle.replayBaseStateDigest,
    commandLog: bundle.commandLog,
    currentSnapshot: bundle.currentSnapshot,
    currentStateDigest: bundle.currentStateDigest,
    projectStableRejection(rejection: DeepReadonly<PocGameSimulationTypesV1["rejection"]>) {
      return Object.freeze({ code: rejection.code });
    },
    projectStableFault(fault: DeepReadonly<PocGameSimulationTypesV1["fault"]>) {
      return Object.freeze({ code: fault.code });
    },
    createDriver(base: DeepReadonly<PocGameSnapshotV1>) {
      const driver = createPocReplayDriverV1(resolved, base);
      captureDriver?.(driver);
      return driver;
    },
  });
}

const runIdByFixtureIdV1 = Object.freeze({
  "fixture.poc_cash_first": pocReferenceRunIdsV1["strategy.cash_first"],
  "fixture.poc_d5_relationship": pocReferenceRunIdsV1["strategy.relationship_first"],
  "fixture.poc_d5_investigation": pocReferenceRunIdsV1["strategy.investigation_first"],
  "fixture.poc_full_delegation": pocReferenceRunIdsV1["strategy.full_delegation"],
  "fixture.poc_two_closures_recovery": pocReferenceRunIdsV1["strategy.two_closures_recovery"],
  "fixture.poc_explicit_failure": pocReferenceRunIdsV1["strategy.explicit_failure"],
});

async function replayFixtureV1(
  resolved: PocResolvedGameV1,
  fixture: DeepReadonly<PocStoryToolingFixtureV1>,
): Promise<PocGameSnapshotV1> {
  const runId =
    runIdByFixtureIdV1[fixture.fixtureId as keyof typeof runIdByFixtureIdV1] ??
    parseRunId("00000000-0000-4000-8000-000000000199");
  const bootstrap = Object.freeze({ rngSeed: fixture.seed, runId });
  const isolated = createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: snapshotSchemaV1.parse({
      state: resolved.gameSimulation.createInitialState(bootstrap),
      rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
      commandSequence: parseNonNegativeSafeInteger(0),
      integrity: createPristineRunIntegrityV1(),
    }),
    commandSchema: resolved.gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      resolved.gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault: unexpectedFaultAttemptV1,
  });
  for (const command of fixture.commands) {
    const result = await isolated.session.dispatch(command);
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new TypeError(`PoC fixture command did not commit: ${command.kind}`);
    }
  }
  return snapshotSchemaV1.parse(isolated.session.getCurrentSnapshot());
}

export function createPocRuntimeTestFixtureV1(input: {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly initialSnapshot?: "default" | "debug_matrix";
  readonly injectedOwnerFault?: "actors.after_proposal";
  readonly loadTooling?: PocToolingLoaderV1;
}): PocRuntimeTestFixtureV1 {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  let debugValidateCalls = 0;
  let debugExecuteAttemptCalls = 0;
  const created = createSessionV1({
    resolved,
    initialSnapshot: createInitialSnapshotV1(resolved, input.initialSnapshot ?? "default"),
    debugExecutor: debugExecutorV1(resolved, input.injectedOwnerFault),
    onDebugValidate: () => {
      debugValidateCalls += 1;
    },
    onDebugExecuteAttempt: () => {
      debugExecuteAttemptCalls += 1;
    },
  });
  const capabilities = createRuntimeCapabilityPortV1({
    initialState: Object.freeze({
      debugTools: input.debugTools,
      cheats: input.cheats,
      automationBridge: false,
    }),
    persist: async () => Object.freeze({ kind: "committed" as const }),
  });
  const semantic = createPocSemanticGamePortV1({
    gameSimulation: resolved.gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure: () => undefined,
  });
  const persistenceServicePromise = createPersistenceServiceV1<PocGameStateV1, PocGameSnapshotV1>({
    runtimeControl: created.runtimeControl,
    records: createMemoryHostRecordStoreV1(),
    snapshotSchema: snapshotSchemaV1,
    provenance: resolved.provenance,
    adoptionDeclaration: null,
    ownerId: "session.poc-runtime-test" as SessionLeaseOwnerId,
    nextHandoffRequestId: () => "handoff.poc-runtime-test" as LeaseHandoffRequestId,
    validateReferences(state) {
      return validatePocStateReferencesV1(resolved, state);
    },
    validateInvariants(view) {
      return validatePocStateInvariantsV1(resolved, view);
    },
    initialSimulationLineage: emptySimulationLineageV1,
    metadataClock: metadataClockV1,
    exportFilename: "project-tavern-poc-runtime-test-save.json",
  });
  const persistence = Object.freeze({
    async exportCurrentSave() {
      return await (await persistenceServicePromise).port.exportCurrentSave();
    },
    async importSave(bytes: Uint8Array) {
      return await (await persistenceServicePromise).port.importSave(bytes);
    },
  });
  const debugBundleCodec = createPocDebugBundleCodecV1();
  const diagnostics = createGameDiagnosticsServiceV1({
    codec: debugBundleCodec,
    provenance: resolved.provenance,
    getCapabilities: () => capabilities.state.getCurrent(),
    getSimulationLineage: () => emptySimulationLineageV1,
    readAtQueueFront: (reader) => created.runtimeControl.readAtQueueFront(reader),
    getReplayEvidence: () =>
      Object.freeze({
        replayBase: created.commandLog.replayBase(),
        replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
        commandLog: created.commandLog.entries(),
      }),
    getDiagnostics: () =>
      Object.freeze({
        kind: "poc_runtime_test" as const,
        commandLogEntryCount: created.commandLog.entries().length,
      }),
    getRuntimeFailures: () => emptyRuntimeFailuresV1,
    getFailure: (): never | undefined => undefined,
    scrubFailure: (failure: never): never => failure,
    getUiContext: (): never | undefined => undefined,
    metadataClock: metadataClockV1,
    exportFilename: "project-tavern-poc-runtime-test.debug-bundle.json",
  });

  const loadTooling =
    input.loadTooling ??
    (async () => (await import("@project-tavern/story-poc/tooling")) as PocToolingModuleV1);
  let toolingLoadCount = 0;
  let lastLoadedSpecifier: typeof pocToolingSpecifierV1 | undefined;
  let cachedSupport:
    ReturnType<PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]> | undefined;
  let toolingAttempt:
    | Promise<ReturnType<PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]>>
    | undefined;
  const toolingSupport = async () => {
    if (cachedSupport !== undefined) return cachedSupport;
    if (toolingAttempt !== undefined) return await toolingAttempt;
    const attempt = (async () => {
      toolingLoadCount += 1;
      lastLoadedSpecifier = pocToolingSpecifierV1;
      const module = await loadTooling(pocToolingSpecifierV1);
      if (
        module.pocStoryToolingEntryV1.storyIdentity.id !== pocStoryIdentityV1.id ||
        module.pocStoryToolingEntryV1.storyIdentity.revision !== pocStoryIdentityV1.revision
      ) {
        throw new TypeError("PoC tooling Story identity mismatch");
      }
      const support = module.pocStoryToolingEntryV1.defineToolingSupport();
      cachedSupport = support;
      return support;
    })();
    toolingAttempt = attempt;
    try {
      return await attempt;
    } finally {
      if (toolingAttempt === attempt) toolingAttempt = undefined;
    }
  };

  const publicFault = unexpectedFaultV1(new TypeError("PoC runtime operation unavailable"));
  const debugTools = createDebugToolsPortV1<
    PocDebugCommandV1,
    PocDebugCommandResultV1,
    string,
    PocDebugAnchorResultV1,
    DebugBundleDecodeResultV1<PocDebugBundleV1>,
    PocDebugReplayResultV1,
    PocDebugReplayResultV1,
    PocDiagnosticQueryV1,
    PocDiagnosticQueryResultV1
  >({
    capabilities: capabilities.state,
    debugCommandSchema: pocDebugCommandSchemaV1,
    debugCommandSchemaFailure: () =>
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "debug.command_schema_invalid" as const }),
      }),
    async listFixtures() {
      const support = await toolingSupport();
      return Object.freeze(support.fixtures.map(({ fixtureId }) => fixtureId));
    },
    async executeDebugCommand(command, isStillEnabled): Promise<PocDebugCommandResultV1> {
      const result = await created.debugControl.execute(command, isStillEnabled);
      if (result.kind === "capability_disabled") return result;
      if (result.kind === "not_executed") {
        return Object.freeze({ kind: "faulted" as const, fault: publicFault });
      }
      if (result.kind === "validation_failed") {
        const error = result.errors[0];
        return error === undefined
          ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
          : Object.freeze({ kind: "validation_failed" as const, error });
      }
      if (result.attempt.result.kind === "committed") {
        return Object.freeze({
          kind: "committed" as const,
          commandSequence: parsePositiveSafeInteger(result.attempt.result.snapshot.commandSequence),
        });
      }
      return result.attempt.result.kind === "faulted"
        ? Object.freeze({
            kind: "faulted" as const,
            fault: result.attempt.result.fault,
          })
        : Object.freeze({ kind: "faulted" as const, fault: publicFault });
    },
    async anchorFixture(fixtureId: string, isStillEnabled): Promise<PocDebugAnchorResultV1> {
      const persistenceService = await persistenceServicePromise;
      const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "fixture" as const, fixtureId }),
        async () => {
          const support = await toolingSupport();
          const fixture = support.fixtures.find((candidate) => candidate.fixtureId === fixtureId);
          if (fixture === undefined) {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({
                  code: "debug.unknown_reference" as const,
                  commandKind: "debug.fixture.load" as const,
                  reference: Object.freeze({
                    kind: "fixture" as const,
                    fixtureId,
                  }),
                }),
              }),
            });
          }
          const snapshot = await replayFixtureV1(resolved, fixture);
          return Object.freeze({
            kind: "replace" as const,
            snapshot,
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: snapshot.commandSequence,
            }),
          });
        },
        isStillEnabled,
        () => Object.freeze({ kind: "faulted" as const, fault: publicFault }),
        (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
      );
      return anchored.kind === "not_executed"
        ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
        : anchored;
    },
    inspectDebugBundle(bytes) {
      return decodeDebugBundleV1(bytes, debugBundleCodec);
    },
    async anchorDebugBundle(bytes, isStillEnabled): Promise<PocDebugAnchorResultV1> {
      const persistenceService = await persistenceServicePromise;
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        return Object.freeze({
          kind: "validation_failed" as const,
          error: Object.freeze({
            code: "debug.bundle_invalid" as const,
            rejection: decoded.code,
          }),
        });
      }
      const comparison = await replayAuthoritativelyV1(
        createPocReplayInputV1(resolved, decoded.bundle),
      );
      if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
        return Object.freeze({
          kind: "validation_failed" as const,
          error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
        });
      }
      const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "debug_bundle" as const }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: snapshotSchemaV1.parse(decoded.bundle.currentSnapshot),
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: decoded.bundle.currentSnapshot.commandSequence,
            }),
          }),
        isStillEnabled,
        () => Object.freeze({ kind: "faulted" as const, fault: publicFault }),
        (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
      );
      return anchored.kind === "not_executed"
        ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
        : anchored;
    },
    async replayAuthoritatively(bytes) {
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") return decoded;
      return Object.freeze({
        kind: "replayed" as const,
        comparison: await replayAuthoritativelyV1(createPocReplayInputV1(resolved, decoded.bundle)),
      });
    },
    async inspectReplayBestEffort(bytes) {
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") return decoded;
      return Object.freeze({
        kind: "replayed" as const,
        comparison: await inspectReplayBestEffortV1(
          createPocReplayInputV1(resolved, decoded.bundle),
        ),
      });
    },
    async queryDiagnostics(query) {
      if (
        query === null ||
        typeof query !== "object" ||
        Array.isArray(query) ||
        Reflect.ownKeys(query).length !== 1 ||
        !Object.hasOwn(query, "kind") ||
        (query as { readonly kind?: unknown }).kind !== "summary"
      ) {
        return Object.freeze({ kind: "validation_failed" as const });
      }
      return await created.runtimeControl.readAtQueueFront(() =>
        Object.freeze({
          kind: "summary" as const,
          commandLogEntryCount: parseNonNegativeSafeInteger(created.commandLog.entries().length),
        }),
      );
    },
  });

  const application = createGameApplicationV1({
    semantic,
    lifecycle: Object.freeze({}),
    persistence,
    diagnostics,
    capabilities,
    debugTools,
  });

  const commandLog = () => created.commandLog.entries();
  return Object.freeze({
    application,
    toolingLoads: () => toolingLoadCount,
    loadedSpecifier: () => lastLoadedSpecifier,
    snapshotForTest: () => created.session.getCurrentSnapshot(),
    commandLogForTest: commandLog,
    latestCommandLogEntry: (): DeepReadonly<PocCommandLogEntryV1> | undefined =>
      commandLog().at(-1),
    debugExecutorValidateCalls: () => debugValidateCalls,
    debugExecutorExecuteAttemptCalls: () => debugExecuteAttemptCalls,
    nextSemanticPublication: () => semantic.waitForIdle(semantic.observe().revision),
    async roundTripExactSave() {
      const persistenceService = await persistenceServicePromise;
      const exported = await persistenceService.port.exportCurrentSave();
      const imported = await persistenceService.port.importSave(exported.bytes);
      if (imported.kind !== "imported" || imported.compatibility !== "exact") {
        throw new TypeError("PoC exact Save round trip failed");
      }
      return Object.freeze({ snapshot: created.session.getCurrentSnapshot() });
    },
    async exportDebugBundleForTest() {
      const exported = await diagnostics.exportDebugBundle();
      const decoded = decodeDebugBundleV1(exported.bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        throw new TypeError(`PoC Debug Bundle decode failed: ${decoded.code}`);
      }
      return decoded.bundle;
    },
    async replayForTest() {
      const exported = await diagnostics.exportDebugBundle();
      const decoded = decodeDebugBundleV1(exported.bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        throw new TypeError(`PoC Debug Bundle decode failed: ${decoded.code}`);
      }
      let replayDriver: PocReplayDriverV1 | undefined;
      const comparison = await replayAuthoritativelyV1(
        createPocReplayInputV1(resolved, decoded.bundle, (driver) => {
          replayDriver = driver;
        }),
      );
      if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
        throw new TypeError("PoC authoritative replay mismatch");
      }
      if (replayDriver === undefined) throw new TypeError("PoC replay driver was not created");
      return Object.freeze({
        comparison,
        finalSnapshot: replayDriver.getCurrentSnapshot(),
      });
    },
  });
}
