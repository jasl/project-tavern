// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createDebugUiContextSchemaV1,
  createDebugBundleEnvelopeSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  rngStateV1Schema,
  runtimeOperationFaultSchemaV1,
} from "@sillymaker/base";
import type {
  DebugBundleEnvelopeV1,
  DebugUiContextV1,
  DebugToolsPortV1,
  DeepReadonly,
  Digest,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeCapabilitiesV1,
  RuntimeOperationFaultV1,
  RuntimeSchemaV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  createGameSessionV1,
  runtimeDiagnosticTextLimitsV1,
  scrubDiagnosticTextV1,
} from "@sillymaker/base/runtime";
import type {
  DebugBundleCodecContextV1,
  DebugBundleDecodeResultV1,
  FinalizedCommandAttemptV1,
  GameSessionCompositionV1,
  GameSessionDebugInputV1,
  ReplayComparisonV1,
  ReplayDriverV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
} from "@sillymaker/base/runtime";

import { pocReferenceRunIdsV1, pocStoryIdentityV1 } from "../content/identity.js";
import {
  deepFreezePocValueV1,
  parseFixtureId,
  parseRunId,
  pocDebugCommandSchemaV1,
  pocGameCommandSchemaV1,
  pocGameStateSchemaV1,
  pocGameplayFactSchemaV1,
  pocRejectionReasonSchemaV1,
} from "../gameplay/index.js";
import type {
  CommandHandlerFaultCodeV1,
  EngineInvariantCodeV1,
  FixtureId,
  PocDebugCommandV1,
  PocEngineFaultV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
  PocReplayableDebugExecutionAttemptV1,
  StoryRuleFaultCodeV1,
  StoryRuleSlotV1,
} from "../gameplay/index.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import type { PocStoryToolingFixtureV1 } from "../tooling-fixtures.js";

type PocSessionV1 = GameSessionCompositionV1<PocGameSimulationTypesV1>;
type PersistenceFaultCodeV1 = Extract<
  RuntimeOperationFaultV1,
  { readonly category: "persistence" }
>["code"];
type AssetLoadFaultCodeV1 = Extract<
  RuntimeOperationFaultV1,
  { readonly category: "asset_load" }
>["code"];
type UiFaultCodeV1 = Extract<RuntimeOperationFaultV1, { readonly category: "ui" }>["code"];
type RuntimeFaultCodeV1 = Extract<
  RuntimeOperationFaultV1,
  { readonly category: "runtime" }
>["code"];

export type PocCommandLogEntryV1 = ReturnType<PocSessionV1["commandLog"]["entries"]>[number];

export type PocReplayLoggedCommandV1 =
  | ReplayLoggedCommandV1<"game", PocGameSimulationTypesV1["command"]>
  | ReplayLoggedCommandV1<"debug", PocGameSimulationTypesV1["debugCommand"]>;

export type PocFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  PocGameSnapshotV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;

export type PocReplayDriverV1 = ReplayDriverV1<
  PocGameSnapshotV1,
  PocReplayLoggedCommandV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;

export type PocReplayInputV1 = ReplayInputV1<
  PocGameSnapshotV1,
  PocReplayLoggedCommandV1,
  PocGameSimulationTypesV1["fact"],
  PocGameSimulationTypesV1["rejection"],
  PocGameSimulationTypesV1["fault"],
  PocGameSimulationTypesV1["rngState"],
  PocGameSimulationTypesV1["rngDrawTrace"]
>;

export type PocDiagnosticCodeV1 =
  | StoryRuleFaultCodeV1
  | EngineInvariantCodeV1
  | CommandHandlerFaultCodeV1
  | PersistenceFaultCodeV1
  | AssetLoadFaultCodeV1
  | UiFaultCodeV1
  | RuntimeFaultCodeV1;

export interface PocDiagnosticSummaryV1 {
  readonly invariantCodes: readonly EngineInvariantCodeV1[];
  readonly recentErrorCodes: readonly PocDiagnosticCodeV1[];
  readonly hmrInvalidated: boolean;
}

export interface PocAnchoringDebugCommandV1 {
  readonly kind: "debug.fixture.load";
  readonly fixtureId: FixtureId;
  readonly seed: ReturnType<typeof parseNonZeroUint32>;
}

export type PocDebugFailureCommandV1 =
  | PocReplayLoggedCommandV1
  | { readonly source: "debug_anchor"; readonly command: PocAnchoringDebugCommandV1 };

export interface PocDebugFailureV1 {
  readonly command: PocDebugFailureCommandV1;
  readonly fault: PocEngineFaultV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly candidateSnapshot?: PocGameSnapshotV1;
}

export type PocDebugBundleV1 = DebugBundleEnvelopeV1<
  PocResolvedGameV1["provenance"],
  RuntimeCapabilitiesV1,
  readonly SimulationAdoptionV1[],
  PocGameSnapshotV1,
  PocCommandLogEntryV1,
  PocDiagnosticSummaryV1,
  RuntimeOperationFaultV1,
  PocDebugFailureV1,
  DebugUiContextV1
>;

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

export type PocDebugReplayResultV1 =
  | { readonly kind: "rejected"; readonly code: string }
  | { readonly kind: "replayed"; readonly comparison: ReplayComparisonV1 };

export type PocDiagnosticQueryV1 = { readonly kind: "summary" };

export type PocDiagnosticQueryResultV1 =
  | { readonly kind: "validation_failed" }
  | {
      readonly kind: "summary";
      readonly diagnostics: PocDiagnosticSummaryV1;
      readonly commandLogEntryCount: number;
    };

export type PocDebugToolsPortV1 = DebugToolsPortV1<
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

type PocCommandLogOutcomeV1 = PocCommandLogEntryV1["outcome"];
type PocRngDrawTraceV1 = PocGameSimulationTypesV1["rngDrawTrace"];

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(pocGameStateSchemaV1, rngStateV1Schema);
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
    const fields = exactFieldsV1(
      value,
      ["debugTools", "cheats", "automationBridge"],
      "PoC runtime capabilities",
    );
    if (
      typeof fields.debugTools !== "boolean" ||
      typeof fields.cheats !== "boolean" ||
      typeof fields.automationBridge !== "boolean"
    ) {
      throw new TypeError("invalid PoC runtime capabilities");
    }
    return Object.freeze({
      debugTools: fields.debugTools,
      cheats: fields.cheats,
      automationBridge: fields.automationBridge,
    });
  },
});

const simulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown): readonly SimulationAdoptionV1[] {
    return parseDenseArrayV1(
      value,
      16,
      (entry) => {
        const fields = exactFieldsV1(
          entry,
          [
            "fromSimulationDigest",
            "toSimulationDigest",
            "viaSimulationPatchSetDigest",
            "adoptedAtCommandSequence",
          ],
          "PoC Simulation adoption",
        );
        const fromSimulationDigest = parseDigest(fields.fromSimulationDigest);
        const toSimulationDigest = parseDigest(fields.toSimulationDigest);
        if (fromSimulationDigest === toSimulationDigest) {
          throw new TypeError("empty PoC Simulation adoption");
        }
        return Object.freeze({
          fromSimulationDigest,
          toSimulationDigest,
          viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
          adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
        });
      },
      "PoC Simulation lineage",
    );
  },
});

const storyRuleFaultCodesV1 = new Set<StoryRuleFaultCodeV1>([
  "rule.threw",
  "rule.returned_thenable",
  "rule.output_invalid",
  "effect.invalid",
]);
const commandHandlerFaultCodesV1 = new Set<CommandHandlerFaultCodeV1>([
  "command.handler_threw",
  "command.handler_not_implemented",
  "narrative.step_limit_exceeded",
  "narrative.call_depth_exceeded",
]);
const engineInvariantCodesV1 = new Set<EngineInvariantCodeV1>([
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
const storyRuleSlotsV1 = new Set<StoryRuleSlotV1>([
  "demand.preview",
  "demand.resolve",
  "tavern.preview",
  "tavern.settle",
  "checks.describe",
  "checks.resolve",
  "endings.evaluate",
]);
const diagnosticCodesV1 = new Set<PocDiagnosticCodeV1>([
  ...storyRuleFaultCodesV1,
  ...commandHandlerFaultCodesV1,
  ...engineInvariantCodesV1,
  "persistence.unavailable",
  "persistence.quota_exceeded",
  "persistence.transaction_failed",
  "persistence.blocked_upgrade",
  "persistence.connection_closed",
  "persistence.stale_writer",
  "asset.fetch_failed",
  "asset.decode_failed",
  "asset.integrity_mismatch",
  "ui.render_failed",
  "ui.event_handler_failed",
  "runtime.async_operation_failed",
  "runtime.dispatch_failed",
  "runtime.hmr_invalidated",
]);

const diagnosticTextEncoderV1 = new TextEncoder();

function parsePocDiagnosticTextV1(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    diagnosticTextEncoderV1.encode(value).byteLength > runtimeDiagnosticTextLimitsV1.message
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
  const shared = Object.freeze({ message, ...(stack === undefined ? {} : { stack }) });
  if (
    fields.category === "story_rule" &&
    typeof fields.code === "string" &&
    storyRuleFaultCodesV1.has(fields.code as StoryRuleFaultCodeV1) &&
    typeof fields.ruleSlot === "string" &&
    storyRuleSlotsV1.has(fields.ruleSlot as StoryRuleSlotV1)
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
    engineInvariantCodesV1.has(fields.code as EngineInvariantCodeV1) &&
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
    commandHandlerFaultCodesV1.has(fields.code as CommandHandlerFaultCodeV1) &&
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

const commandLogEntrySchemaV1: RuntimeSchemaV1<PocCommandLogEntryV1> = Object.freeze({
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

const diagnosticSummarySchemaV1: RuntimeSchemaV1<PocDiagnosticSummaryV1> = Object.freeze({
  parse(value: unknown): PocDiagnosticSummaryV1 {
    const fields = exactFieldsV1(
      value,
      ["invariantCodes", "recentErrorCodes", "hmrInvalidated"],
      "PoC diagnostic summary",
    );
    const invariantCodes = parseDenseArrayV1(
      fields.invariantCodes,
      64,
      (entry) => {
        if (
          typeof entry !== "string" ||
          !engineInvariantCodesV1.has(entry as EngineInvariantCodeV1)
        ) {
          throw new TypeError("invalid PoC invariant diagnostic code");
        }
        return entry as EngineInvariantCodeV1;
      },
      "PoC invariant diagnostic codes",
    );
    const recentErrorCodes = parseDenseArrayV1(
      fields.recentErrorCodes,
      50,
      (entry) => {
        if (typeof entry !== "string" || !diagnosticCodesV1.has(entry as PocDiagnosticCodeV1)) {
          throw new TypeError("invalid PoC recent diagnostic code");
        }
        return entry as PocDiagnosticCodeV1;
      },
      "PoC recent diagnostic codes",
    );
    if (typeof fields.hmrInvalidated !== "boolean") {
      throw new TypeError("invalid PoC HMR diagnostic state");
    }
    return Object.freeze({
      invariantCodes,
      recentErrorCodes,
      hmrInvalidated: fields.hmrInvalidated,
    });
  },
});

function createPocDebugFailureSchemaV1(): RuntimeSchemaV1<PocDebugFailureV1> {
  return Object.freeze({
    parse(value: unknown): PocDebugFailureV1 {
      const input = exactFieldsV1(
        value,
        [
          "command",
          "fault",
          "attemptedDraws",
          ...(value !== null &&
          typeof value === "object" &&
          Object.hasOwn(value, "candidateRngAfter")
            ? ["candidateRngAfter"]
            : []),
          ...(value !== null &&
          typeof value === "object" &&
          Object.hasOwn(value, "candidateSnapshot")
            ? ["candidateSnapshot"]
            : []),
        ],
        "PoC Debug failure",
      );
      const hasCandidateRngAfter = Object.hasOwn(input, "candidateRngAfter");
      const hasCandidateSnapshot = Object.hasOwn(input, "candidateSnapshot");
      const commandFields = exactFieldsV1(
        input.command,
        ["source", "command"],
        "PoC Debug failure command",
      );
      let command: PocDebugFailureCommandV1;
      if (commandFields.source === "game") {
        command = Object.freeze({
          source: "game" as const,
          command: pocGameCommandSchemaV1.parse(commandFields.command),
        });
      } else if (commandFields.source === "debug") {
        command = Object.freeze({
          source: "debug" as const,
          command: pocDebugCommandSchemaV1.parse(commandFields.command),
        });
      } else if (commandFields.source === "debug_anchor") {
        const anchor = exactFieldsV1(
          commandFields.command,
          ["kind", "fixtureId", "seed"],
          "PoC Debug anchor command",
        );
        if (anchor.kind !== "debug.fixture.load") {
          throw new TypeError("invalid PoC Debug anchor command");
        }
        command = Object.freeze({
          source: "debug_anchor" as const,
          command: Object.freeze({
            kind: "debug.fixture.load" as const,
            fixtureId: parseFixtureId(anchor.fixtureId),
            seed: parseNonZeroUint32(anchor.seed),
          }),
        });
      } else {
        throw new TypeError("invalid PoC Debug failure command source");
      }
      const candidateRngAfter = hasCandidateRngAfter
        ? rngStateV1Schema.parse(input.candidateRngAfter)
        : undefined;
      const candidateSnapshot = hasCandidateSnapshot
        ? snapshotSchemaV1.parse(input.candidateSnapshot)
        : undefined;
      return Object.freeze({
        command,
        fault: parsePocEngineFaultV1(input.fault),
        attemptedDraws: parseDenseArrayV1(
          input.attemptedDraws,
          strictJsonMaximumArrayItemsV1,
          (draw) => parsePocRngDrawTraceV1(draw),
          "PoC Debug failure attempted RNG draws",
        ),
        ...(candidateRngAfter === undefined ? {} : { candidateRngAfter }),
        ...(candidateSnapshot === undefined ? {} : { candidateSnapshot }),
      });
    },
  });
}

function sameRngStateV1(left: DeepReadonly<RngStateV1>, right: DeepReadonly<RngStateV1>): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.cursor === right.cursor &&
    left.rawDrawCount === right.rawDrawCount
  );
}

/** Creates the strict production DebugBundle schema and replay-continuity validator. */
export function createPocDebugBundleCodecV1(): DebugBundleCodecContextV1<
  PocGameSnapshotV1,
  PocDebugBundleV1
> {
  const bundleSchema = createDebugBundleEnvelopeSchemaV1({
    provenanceSchema: Object.freeze({ parse: parsePocBuildProvenanceV1 }),
    capabilitiesSchema: runtimeCapabilitiesSchemaV1,
    simulationLineageSchema: simulationLineageSchemaV1,
    snapshotSchema: snapshotSchemaV1,
    commandLogEntrySchema: commandLogEntrySchemaV1,
    diagnosticsSchema: diagnosticSummarySchemaV1,
    runtimeFailureSchema: runtimeOperationFaultSchemaV1,
    failureSchema: createPocDebugFailureSchemaV1(),
    uiContextSchema: createDebugUiContextSchemaV1(),
  });

  return Object.freeze({
    bundleSchema,
    validateEnvelope(bundle: DeepReadonly<PocDebugBundleV1>): void {
      if (
        bundle.provenance.story.id !== pocStoryIdentityV1.id ||
        bundle.provenance.story.revision !== pocStoryIdentityV1.revision
      ) {
        throw new TypeError("invalid PoC Debug Bundle Story identity");
      }

      for (let index = 0; index < bundle.simulationLineage.length; index += 1) {
        const current = bundle.simulationLineage[index];
        const previous = bundle.simulationLineage[index - 1];
        const next = bundle.simulationLineage[index + 1];
        if (
          current === undefined ||
          current.toSimulationDigest !==
            (next?.fromSimulationDigest ?? bundle.provenance.resolved.simulationDigest) ||
          current.adoptedAtCommandSequence > bundle.currentSnapshot.commandSequence ||
          (previous !== undefined &&
            previous.adoptedAtCommandSequence > current.adoptedAtCommandSequence)
        ) {
          throw new TypeError("invalid PoC Debug Bundle Simulation lineage");
        }
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

/** Redacts absolute paths and bounds all engine-fault text before bundle export. */
export function scrubPocDebugFailureV1(
  failure: DeepReadonly<PocDebugFailureV1>,
): PocDebugFailureV1 {
  const scrubbedFault = Object.freeze({
    ...failure.fault,
    message: scrubDiagnosticTextV1(failure.fault.message, runtimeDiagnosticTextLimitsV1.message),
    ...(failure.fault.stack === undefined
      ? {}
      : {
          stack: scrubDiagnosticTextV1(failure.fault.stack, runtimeDiagnosticTextLimitsV1.stack),
        }),
  }) as PocEngineFaultV1;
  return createPocDebugFailureSchemaV1().parse({
    command: failure.command,
    fault: scrubbedFault,
    attemptedDraws: failure.attemptedDraws,
    ...(failure.candidateRngAfter === undefined
      ? {}
      : { candidateRngAfter: failure.candidateRngAfter }),
    ...(failure.candidateSnapshot === undefined
      ? {}
      : { candidateSnapshot: failure.candidateSnapshot }),
  });
}

function readPocUnexpectedFaultDataPropertyV1(value: unknown, key: PropertyKey): unknown {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return undefined;
  }
  try {
    let current: object | null = value;
    const seen = new Set<object>();
    while (current !== null && !seen.has(current)) {
      seen.add(current);
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined) {
        return descriptor.get === undefined && descriptor.set === undefined
          ? descriptor.value
          : undefined;
      }
      current = Object.getPrototypeOf(current);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function primitivePocUnexpectedFaultTextV1(value: unknown): string | undefined {
  switch (typeof value) {
    case "string":
      return value.length === 0 ? undefined : value;
    case "number":
    case "bigint":
    case "boolean":
      return String(value);
    case "symbol":
      return value.description === undefined ? "Symbol" : `Symbol(${value.description})`;
    default:
      return undefined;
  }
}

/** Normalizes an unexpected runtime exception to the closed PoC engine-fault contract. */
export function createPocUnexpectedFaultV1(error: unknown): PocEngineFaultV1 {
  const rawMessage =
    primitivePocUnexpectedFaultTextV1(error) ??
    primitivePocUnexpectedFaultTextV1(readPocUnexpectedFaultDataPropertyV1(error, "message")) ??
    "unexpected PoC runtime failure";
  const rawStack = primitivePocUnexpectedFaultTextV1(
    readPocUnexpectedFaultDataPropertyV1(error, "stack"),
  );
  const message = scrubDiagnosticTextV1(rawMessage, runtimeDiagnosticTextLimitsV1.message);
  const stack =
    rawStack === undefined
      ? undefined
      : scrubDiagnosticTextV1(rawStack, runtimeDiagnosticTextLimitsV1.stack);
  return deepFreezePocValueV1({
    category: "command_handler",
    code: "command.handler_threw",
    ruleSlot: null,
    message,
    ...(stack === undefined ? {} : { stack }),
  });
}

/** Preserves the committed Snapshot/RNG while recording one normalized faulted attempt. */
export function createPocUnexpectedFaultAttemptV1(
  error: unknown,
  snapshot: DeepReadonly<PocGameSnapshotV1>,
): PocReplayableDebugExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot: snapshot as PocGameSnapshotV1,
      fault: createPocUnexpectedFaultV1(error),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: Object.freeze([]),
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    }),
  });
}

/** Creates an isolated replay driver over the resolved Story simulation. */
export function createPocReplayDriverV1(
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
    normalizeUnexpectedDispatchFault: createPocUnexpectedFaultAttemptV1,
    debug: Object.freeze({
      validate: (snapshot, command) =>
        resolved.gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined),
      executeAttempt: (snapshot, command) =>
        resolved.gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined),
      normalizeUnexpectedFault: createPocUnexpectedFaultAttemptV1,
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

/** Builds authoritative replay input while keeping app-build identity diagnostic-only. */
export function createPocReplayInputV1(
  resolved: PocResolvedGameV1,
  bundle: DeepReadonly<PocDebugBundleV1>,
  appBuildId: Digest,
  captureDriver?: (driver: PocReplayDriverV1) => void,
): PocReplayInputV1 {
  const parsedAppBuildId = parseDigest(appBuildId);
  return Object.freeze({
    recordedIdentity: Object.freeze({
      provenance: bundle.provenance,
      ...(bundle.appBuildId === undefined ? {} : { appBuildId: bundle.appBuildId }),
    }),
    runtimeIdentity: Object.freeze({
      provenance: resolved.provenance,
      appBuildId: parsedAppBuildId,
    }),
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

/** Replays one active-Story tooling fixture into a fully validated isolated Snapshot anchor. */
export async function replayPocToolingFixtureV1(
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
    normalizeUnexpectedDispatchFault: createPocUnexpectedFaultAttemptV1,
  });
  for (const command of fixture.commands) {
    const result = await isolated.session.dispatch(command);
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new TypeError(`PoC fixture command did not commit: ${command.kind}`);
    }
  }
  return snapshotSchemaV1.parse(isolated.session.getCurrentSnapshot());
}
