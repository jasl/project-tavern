// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createDebugBundleEnvelopeSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  createTransactionalRngV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
  runtimeOperationFaultSchemaV1,
} from "@sillymaker/base";
import type {
  BuildProvenanceV1,
  CommandExecutionAttemptEnvelopeV1,
  CommandLogEntryEnvelopeV1,
  DebugBundleEnvelopeV1,
  DeepReadonly,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeCapabilitiesV1,
  RuntimeOperationFaultV1,
  RuntimeSchemaV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import type {
  DebugBundleCodecContextV1,
  FinalizedCommandAttemptV1,
  GameSessionDebugInputV1,
  ReplayDriverV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
} from "@sillymaker/base/runtime";

import {
  e2eDebugCommandSchemaV1,
  e2eGameCommandSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eGameplayFaultSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "../gameplay/contracts/index.js";
import type {
  E2eDebugCommandV1,
  E2eGameCommandV1,
  E2eGameSimulationTypesV1,
  E2eGameStateV1,
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eGameplayFaultV1,
  E2eRejectionReasonV1,
} from "../gameplay/contracts/index.js";
import { requireExactObjectV1, requirePlainObjectV1 } from "../gameplay/contracts/state.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export type E2eGameCommandLogOutcomeV1 =
  | { readonly kind: "committed"; readonly facts: readonly E2eGameplayFactV1[] }
  | { readonly kind: "rejected"; readonly reasons: readonly E2eRejectionReasonV1[] }
  | { readonly kind: "faulted"; readonly fault: E2eGameplayFaultV1 };

export type E2eDebugCommandLogOutcomeV1 =
  | { readonly kind: "committed"; readonly facts: readonly E2eGameplayFactV1[] }
  | { readonly kind: "faulted"; readonly fault: E2eGameplayFaultV1 };

export type E2eCommandLogEntryV1 =
  | CommandLogEntryEnvelopeV1<
      { readonly source: "game"; readonly command: E2eGameCommandV1 },
      E2eGameCommandLogOutcomeV1
    >
  | CommandLogEntryEnvelopeV1<
      { readonly source: "debug"; readonly command: E2eDebugCommandV1 },
      E2eDebugCommandLogOutcomeV1
    >;

export type E2eDiagnosticCodeV1 = E2eGameplayFaultV1["code"] | RuntimeOperationFaultV1["code"];

export interface E2eDiagnosticSummaryV1 {
  readonly invariantCodes: readonly never[];
  readonly recentErrorCodes: readonly E2eDiagnosticCodeV1[];
  readonly hmrInvalidated: boolean;
}

export type E2eDebugFailureCommandV1 =
  | { readonly source: "game"; readonly command: E2eGameCommandV1 }
  | { readonly source: "debug"; readonly command: E2eDebugCommandV1 }
  | {
      readonly source: "debug_anchor";
      readonly command: { readonly kind: "debug.fixture.load"; readonly fixtureId: string };
    };

export interface E2eDebugFailureV1 {
  readonly command: E2eDebugFailureCommandV1;
  readonly fault: E2eGameplayFaultV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly candidateSnapshot?: E2eGameSnapshotV1;
}

const strictJsonMaximumArrayItemsV1 = 10_000;

function parseDenseArrayV1<T>(
  value: unknown,
  maximumItems: number,
  parseEntry: (entry: unknown) => T,
  label: string,
): readonly T[] {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (
    Object.getOwnPropertySymbols(value).length !== 0 ||
    keys.length !== value.length ||
    keys.some((key, index) => key !== String(index)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !descriptor.enumerable
      );
    })
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return Object.freeze(keys.map((key) => parseEntry(descriptors[key]?.value)));
}

function parseNonemptyTextV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parseBuildProvenanceV1(value: unknown): BuildProvenanceV1 {
  const fields = requireExactObjectV1(value, ["story", "engine", "resolved"], "provenance");
  const story = requireExactObjectV1(
    fields.story,
    ["id", "revision", "digest"],
    "Story provenance",
  );
  const engine = requireExactObjectV1(fields.engine, ["version", "digest"], "engine provenance");
  const resolved = requireExactObjectV1(
    fields.resolved,
    [
      "stateContractRevision",
      "stateContractDigest",
      "simulationDigest",
      "presentationDigest",
      "patchSet",
    ],
    "resolved provenance",
  );
  const patchSet = requireExactObjectV1(
    resolved.patchSet,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PatchSet identity",
  );
  const appliedHotfixes = parseDenseArrayV1(
    patchSet.appliedHotfixes,
    strictJsonMaximumArrayItemsV1,
    (entry) => {
      const hotfix = requireExactObjectV1(
        entry,
        ["identity", "ordinal", "replacements"],
        "applied Hotfix",
      );
      const identity = requireExactObjectV1(
        hotfix.identity,
        ["id", "revision", "digest"],
        "applied Hotfix identity",
      );
      const replacements = parseDenseArrayV1(
        hotfix.replacements,
        strictJsonMaximumArrayItemsV1,
        (replacementValue) => {
          const replacement = requireExactObjectV1(
            replacementValue,
            ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
            "Patch replacement",
          );
          const surface = replacement.surface;
          const kind = replacement.kind;
          if (
            (surface !== "simulation" && surface !== "presentation") ||
            (surface === "simulation" && kind !== "rule" && kind !== "value") ||
            (surface === "presentation" && kind !== "value" && kind !== "text" && kind !== "asset")
          ) {
            throw new TypeError("invalid Patch replacement surface or kind");
          }
          return Object.freeze({
            surface,
            symbolId: parseNonemptyTextV1(replacement.symbolId, "Patch symbol ID"),
            kind,
            previousProviderDigest: parseDigest(replacement.previousProviderDigest),
            nextProviderDigest: parseDigest(replacement.nextProviderDigest),
          });
        },
        "Patch replacements",
      );
      return Object.freeze({
        identity: Object.freeze({
          id: parseNonemptyTextV1(identity.id, "Hotfix ID"),
          revision: parsePositiveSafeInteger(identity.revision),
          digest: parseDigest(identity.digest),
        }),
        ordinal: parsePositiveSafeInteger(hotfix.ordinal),
        replacements,
      });
    },
    "applied Hotfixes",
  );
  if (
    new Set(appliedHotfixes.map(({ identity }) => identity.id)).size !== appliedHotfixes.length ||
    appliedHotfixes.some(({ ordinal }, index) => ordinal !== index + 1)
  ) {
    throw new TypeError("invalid applied Hotfix order");
  }
  return Object.freeze({
    story: Object.freeze({
      id: parseNonemptyTextV1(story.id, "Story ID"),
      revision: parsePositiveSafeInteger(story.revision),
      digest: parseDigest(story.digest),
    }),
    engine: Object.freeze({
      version: parseNonemptyTextV1(engine.version, "engine version"),
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
  }) as BuildProvenanceV1;
}

const e2eCapabilitiesSchemaV1: RuntimeSchemaV1<RuntimeCapabilitiesV1> = Object.freeze({
  parse(value: unknown) {
    const fields = requireExactObjectV1(
      value,
      ["debugTools", "cheats", "automationBridge"],
      "runtime capabilities",
    );
    if (
      typeof fields.debugTools !== "boolean" ||
      typeof fields.cheats !== "boolean" ||
      typeof fields.automationBridge !== "boolean"
    ) {
      throw new TypeError("invalid runtime capabilities");
    }
    return Object.freeze({
      debugTools: fields.debugTools,
      cheats: fields.cheats,
      automationBridge: fields.automationBridge,
    });
  },
});

const e2eSimulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> =
  Object.freeze({
    parse(value: unknown) {
      return parseDenseArrayV1(
        value,
        16,
        (entry) => {
          const fields = requireExactObjectV1(
            entry,
            [
              "fromSimulationDigest",
              "toSimulationDigest",
              "viaSimulationPatchSetDigest",
              "adoptedAtCommandSequence",
            ],
            "Simulation adoption",
          );
          const fromSimulationDigest = parseDigest(fields.fromSimulationDigest);
          const toSimulationDigest = parseDigest(fields.toSimulationDigest);
          if (fromSimulationDigest === toSimulationDigest) {
            throw new TypeError("empty Simulation adoption");
          }
          return Object.freeze({
            fromSimulationDigest,
            toSimulationDigest,
            viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
            adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
          });
        },
        "simulation lineage",
      );
    },
  });

function parseRngDrawTraceV1(value: unknown): RngDrawTraceV1 {
  const fields = requireExactObjectV1(
    value,
    ["ordinal", "purpose", "exclusiveMax", "result", "before", "after"],
    "RNG draw trace",
  );
  const purpose = parseNonemptyTextV1(fields.purpose, "RNG purpose");
  if (purpose.length > 128 || !/^(?:demand|check|scheduler):[a-z0-9._:-]+$/u.test(purpose)) {
    throw new TypeError("invalid RNG purpose");
  }
  const exclusiveMax = parsePositiveSafeInteger(fields.exclusiveMax);
  const result = parseNonNegativeSafeInteger(fields.result);
  if (exclusiveMax > 0x1_0000_0000 || result >= exclusiveMax) {
    throw new TypeError("invalid RNG draw range");
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

function parseE2eCommandLogOutcomeV1(
  value: unknown,
  source: E2eCommandLogEntryV1["source"],
): E2eGameCommandLogOutcomeV1 | E2eDebugCommandLogOutcomeV1 {
  const input = requirePlainObjectV1(value, "E2E CommandLog outcome");
  if (input.kind === "committed") {
    const fields = requireExactObjectV1(value, ["kind", "facts"], "committed outcome");
    return Object.freeze({
      kind: "committed",
      facts: parseDenseArrayV1(
        fields.facts,
        strictJsonMaximumArrayItemsV1,
        (fact) => e2eGameplayFactSchemaV1.parse(fact),
        "committed facts",
      ),
    });
  }
  if (input.kind === "rejected") {
    if (source !== "game") throw new TypeError("DebugCommand log entry cannot be rejected");
    const fields = requireExactObjectV1(value, ["kind", "reasons"], "rejected outcome");
    return Object.freeze({
      kind: "rejected",
      reasons: parseDenseArrayV1(
        fields.reasons,
        strictJsonMaximumArrayItemsV1,
        (reason) => e2eRejectionReasonSchemaV1.parse(reason),
        "rejection reasons",
      ),
    });
  }
  if (input.kind === "faulted") {
    const fields = requireExactObjectV1(value, ["kind", "fault"], "faulted outcome");
    return Object.freeze({
      kind: "faulted",
      fault: e2eGameplayFaultSchemaV1.parse(fields.fault),
    });
  }
  throw new TypeError("invalid E2E CommandLog outcome");
}

const e2eCommandLogEntrySchemaV1: RuntimeSchemaV1<E2eCommandLogEntryV1> = Object.freeze({
  parse(value: unknown) {
    const input = requirePlainObjectV1(value, "E2E CommandLog entry");
    const hasCandidateRngAfter = Object.hasOwn(input, "candidateRngAfter");
    const fields = requireExactObjectV1(
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
      "E2E CommandLog entry",
    );
    if (fields.source !== "game" && fields.source !== "debug") {
      throw new TypeError("invalid E2E CommandLog source");
    }
    const source = fields.source;
    const sequence = requireExactObjectV1(
      fields.commandSequence,
      ["before", "after"],
      "CommandLog sequence",
    );
    const candidateRngAfter = hasCandidateRngAfter
      ? rngStateV1Schema.parse(fields.candidateRngAfter)
      : undefined;
    const shared = Object.freeze({
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
        parseRngDrawTraceV1,
        "attempted RNG draws",
      ),
      ...(candidateRngAfter === undefined ? {} : { candidateRngAfter }),
      committedRngAfter: rngStateV1Schema.parse(fields.committedRngAfter),
      outcome: parseE2eCommandLogOutcomeV1(fields.outcome, source),
    });
    return source === "game"
      ? Object.freeze({
          source,
          command: e2eGameCommandSchemaV1.parse(fields.command),
          ...shared,
          outcome: shared.outcome as E2eGameCommandLogOutcomeV1,
        })
      : Object.freeze({
          source,
          command: e2eDebugCommandSchemaV1.parse(fields.command),
          ...shared,
          outcome: shared.outcome as E2eDebugCommandLogOutcomeV1,
        });
  },
});

const e2eDiagnosticCodesV1 = new Set<E2eDiagnosticCodeV1>([
  "e2e.test.fault",
  "e2e.owner.contract_invalid",
  "e2e.runtime.unexpected",
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

const e2eDiagnosticSummarySchemaV1: RuntimeSchemaV1<E2eDiagnosticSummaryV1> = Object.freeze({
  parse(value: unknown) {
    const fields = requireExactObjectV1(
      value,
      ["invariantCodes", "recentErrorCodes", "hmrInvalidated"],
      "E2E diagnostics summary",
    );
    const invariantCodes = parseDenseArrayV1(
      fields.invariantCodes,
      64,
      () => {
        throw new TypeError("E2E diagnostics do not expose invariant details");
      },
      "E2E invariant codes",
    );
    const recentErrorCodes = parseDenseArrayV1(
      fields.recentErrorCodes,
      50,
      (entry) => {
        if (typeof entry !== "string" || !e2eDiagnosticCodesV1.has(entry as E2eDiagnosticCodeV1)) {
          throw new TypeError("invalid E2E diagnostic code");
        }
        return entry as E2eDiagnosticCodeV1;
      },
      "E2E recent error codes",
    );
    if (typeof fields.hmrInvalidated !== "boolean") {
      throw new TypeError("invalid E2E HMR diagnostic state");
    }
    return Object.freeze({
      invariantCodes,
      recentErrorCodes,
      hmrInvalidated: fields.hmrInvalidated,
    });
  },
});

const absentDebugEvidenceSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(_value: unknown): never {
    throw new TypeError("unsupported E2E Debug evidence");
  },
});

function createE2eDebugFailureSchemaV1(
  snapshotSchema: RuntimeSchemaV1<E2eGameSnapshotV1>,
): RuntimeSchemaV1<E2eDebugFailureV1> {
  return Object.freeze({
    parse(value: unknown): E2eDebugFailureV1 {
      const input = requirePlainObjectV1(value, "E2E Debug failure");
      const hasCandidateRngAfter = Object.hasOwn(input, "candidateRngAfter");
      const hasCandidateSnapshot = Object.hasOwn(input, "candidateSnapshot");
      const fields = requireExactObjectV1(
        value,
        [
          "command",
          "fault",
          "attemptedDraws",
          ...(hasCandidateRngAfter ? ["candidateRngAfter"] : []),
          ...(hasCandidateSnapshot ? ["candidateSnapshot"] : []),
        ],
        "E2E Debug failure",
      );
      const commandValue = requirePlainObjectV1(fields.command, "E2E Debug failure command");
      const commandFields = requireExactObjectV1(
        fields.command,
        ["source", "command"],
        "E2E Debug failure command",
      );
      let command: E2eDebugFailureCommandV1;
      if (commandValue.source === "game") {
        command = Object.freeze({
          source: "game" as const,
          command: e2eGameCommandSchemaV1.parse(commandFields.command),
        });
      } else if (commandValue.source === "debug") {
        command = Object.freeze({
          source: "debug" as const,
          command: e2eDebugCommandSchemaV1.parse(commandFields.command),
        });
      } else if (commandValue.source === "debug_anchor") {
        const anchorFields = requireExactObjectV1(
          commandFields.command,
          ["kind", "fixtureId"],
          "E2E Debug anchor command",
        );
        if (anchorFields.kind !== "debug.fixture.load") {
          throw new TypeError("invalid E2E Debug anchor command");
        }
        command = Object.freeze({
          source: "debug_anchor" as const,
          command: Object.freeze({
            kind: "debug.fixture.load" as const,
            fixtureId: parseNonemptyTextV1(anchorFields.fixtureId, "fixture ID"),
          }),
        });
      } else {
        throw new TypeError("invalid E2E Debug failure command source");
      }
      const candidateRngAfter = hasCandidateRngAfter
        ? rngStateV1Schema.parse(fields.candidateRngAfter)
        : undefined;
      const candidateSnapshot = hasCandidateSnapshot
        ? snapshotSchema.parse(fields.candidateSnapshot)
        : undefined;
      return Object.freeze({
        command,
        fault: e2eGameplayFaultSchemaV1.parse(fields.fault),
        attemptedDraws: parseDenseArrayV1(
          fields.attemptedDraws,
          strictJsonMaximumArrayItemsV1,
          parseRngDrawTraceV1,
          "E2E Debug failure attempted RNG draws",
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

export type E2eDebugBundleV1 = DebugBundleEnvelopeV1<
  BuildProvenanceV1,
  RuntimeCapabilitiesV1,
  readonly SimulationAdoptionV1[],
  E2eGameSnapshotV1,
  E2eCommandLogEntryV1,
  E2eDiagnosticSummaryV1,
  RuntimeOperationFaultV1,
  E2eDebugFailureV1,
  never
>;

export function createE2eDebugBundleCodecV1(
  stateSchema: RuntimeSchemaV1<E2eGameStateV1>,
): DebugBundleCodecContextV1<E2eGameSnapshotV1, E2eDebugBundleV1> {
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(stateSchema, rngStateV1Schema);
  const bundleSchema = createDebugBundleEnvelopeSchemaV1({
    provenanceSchema: Object.freeze({ parse: parseBuildProvenanceV1 }),
    capabilitiesSchema: e2eCapabilitiesSchemaV1,
    simulationLineageSchema: e2eSimulationLineageSchemaV1,
    snapshotSchema,
    commandLogEntrySchema: e2eCommandLogEntrySchemaV1,
    diagnosticsSchema: e2eDiagnosticSummarySchemaV1,
    runtimeFailureSchema: runtimeOperationFaultSchemaV1,
    failureSchema: createE2eDebugFailureSchemaV1(snapshotSchema),
    uiContextSchema: absentDebugEvidenceSchemaV1,
  });

  return Object.freeze({
    bundleSchema,
    validateEnvelope(bundle: DeepReadonly<E2eDebugBundleV1>) {
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
          throw new TypeError("invalid Debug Bundle simulation lineage");
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
          throw new TypeError("invalid Debug Bundle CommandLog continuity");
        }

        let attemptedRng = entry.committedRngBefore;
        for (let index = 0; index < entry.attemptedDraws.length; index += 1) {
          const draw = entry.attemptedDraws[index];
          if (
            draw === undefined ||
            draw.ordinal !== index + 1 ||
            !sameRngStateV1(draw.before, attemptedRng)
          ) {
            throw new TypeError("invalid Debug Bundle RNG trace continuity");
          }
          attemptedRng = draw.after;
        }
        if (
          entry.candidateRngAfter !== undefined &&
          !sameRngStateV1(entry.candidateRngAfter, attemptedRng)
        ) {
          throw new TypeError("invalid Debug Bundle candidate RNG state");
        }

        if (entry.outcome.kind === "committed") {
          if (
            entry.commandSequence.after !== entry.commandSequence.before + 1 ||
            (entry.candidateRngAfter !== undefined &&
              !sameRngStateV1(entry.committedRngAfter, entry.candidateRngAfter))
          ) {
            throw new TypeError("invalid committed Debug Bundle CommandLog entry");
          }
        } else if (
          entry.commandSequence.after !== entry.commandSequence.before ||
          entry.postStateDigest !== entry.preStateDigest ||
          !sameRngStateV1(entry.committedRngAfter, entry.committedRngBefore)
        ) {
          throw new TypeError("invalid non-committed Debug Bundle CommandLog entry");
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
        throw new TypeError("Debug Bundle current Snapshot breaks replay continuity");
      }
    },
  });
}

export function createE2eUnexpectedFaultAttemptV1(
  snapshot: DeepReadonly<E2eGameSnapshotV1>,
): CommandExecutionAttemptEnvelopeV1<
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
> {
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot,
      fault: Object.freeze({ code: "e2e.runtime.unexpected" as const }),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: rng.attemptedDraws(),
      candidateRngAfter: rng.candidateState(),
      committedRngAfter: snapshot.rng,
    }),
  });
}

export type E2eFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type E2eReplayLoggedCommandV1 =
  | ReplayLoggedCommandV1<"game", E2eGameCommandV1>
  | ReplayLoggedCommandV1<"debug", E2eDebugCommandV1>;

export type E2eReplayDriverV1 = ReplayDriverV1<
  E2eGameSnapshotV1,
  E2eReplayLoggedCommandV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type E2eReplayInputV1 = ReplayInputV1<
  E2eGameSnapshotV1,
  E2eReplayLoggedCommandV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export function createE2eReplayDriverV1(
  gameSimulation: E2eResolvedGameV1["gameSimulation"],
  replayBase: DeepReadonly<E2eGameSnapshotV1>,
): E2eReplayDriverV1 {
  let capturedAttempt: E2eFinalizedAttemptV1 | null = null;
  const isolated = createGameSessionV1<E2eGameSimulationTypesV1>({
    initialSnapshot: replayBase as E2eGameSnapshotV1,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createE2eUnexpectedFaultAttemptV1(snapshot);
    },
    debug: Object.freeze({
      validate(snapshot, command) {
        return gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined);
      },
      executeAttempt(snapshot, command) {
        return gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined);
      },
      normalizeUnexpectedFault(_error, snapshot) {
        return createE2eUnexpectedFaultAttemptV1(snapshot);
      },
    } satisfies GameSessionDebugInputV1<E2eGameSimulationTypesV1>),
    onAttempt(attempt) {
      capturedAttempt = attempt;
    },
  });

  return Object.freeze({
    getCurrentSnapshot: isolated.session.getCurrentSnapshot,
    async submit(loggedCommand: DeepReadonly<E2eReplayLoggedCommandV1>) {
      capturedAttempt = null;
      if (loggedCommand.source === "debug") {
        const result = await isolated.debugControl.execute(loggedCommand.command, () => true);
        if (result.kind !== "executed") {
          throw new TypeError("E2E replay did not execute a DebugCommand entry");
        }
        return result.attempt;
      }

      const result = await isolated.session.dispatch(loggedCommand.command);
      const finalizedAttempt = capturedAttempt;
      if (result.kind !== "executed" || finalizedAttempt === null) {
        throw new TypeError("E2E replay did not capture a finalized GameCommand attempt");
      }
      return finalizedAttempt;
    },
  });
}

export function createE2eReplayInputV1(
  resolved: E2eResolvedGameV1,
  bundle: DeepReadonly<E2eDebugBundleV1>,
): E2eReplayInputV1 {
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
    projectStableRejection(rejection: DeepReadonly<E2eRejectionReasonV1>) {
      return Object.freeze({ code: rejection.code });
    },
    projectStableFault(fault: DeepReadonly<E2eGameplayFaultV1>) {
      return Object.freeze({ code: fault.code });
    },
    createDriver(base: DeepReadonly<E2eGameSnapshotV1>) {
      return createE2eReplayDriverV1(resolved.gameSimulation, base);
    },
  });
}
