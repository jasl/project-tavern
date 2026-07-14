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
  CommandLogEntryEnvelopeV1,
  DebugBundleEnvelopeV1,
  DebugToolsPortV1,
  DeepReadonly,
  ExportedDebugBundleV1,
  ExportedSaveV1,
  GameApplicationPortV1,
  GameHostV1,
  LeaseHandoffRequestId,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  RuntimeCapabilityPortV1,
  RuntimeCapabilitiesV1,
  RuntimeOperationFaultV1,
  RuntimeSchemaV1,
  RngDrawTraceV1,
  RngStateV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  createCapabilityDisabledDebugToolsPortV1,
  createGameDiagnosticsServiceV1,
  createGameApplicationV1,
  createGameSessionV1,
  createPersistenceServiceV1,
} from "@sillymaker/base/runtime";
import type { DebugBundleCodecContextV1 } from "@sillymaker/base/runtime";
import { createGameRuntimeV1 } from "@sillymaker/web";

import type {
  E2eDebugCommandV1,
  E2eGameCommandV1,
  E2eGameStateV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eGameplayFaultV1,
  E2eRejectionReasonV1,
} from "../gameplay/contracts/index.js";
import {
  e2eGameCommandSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eGameplayFaultSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "../gameplay/contracts/index.js";
import { requireExactObjectV1, requirePlainObjectV1 } from "../gameplay/contracts/state.js";
import { e2eStateContractManifestV1 } from "../story-definition.js";
import { createE2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export type E2eDisabledDebugToolsPortV1 = DebugToolsPortV1<
  E2eDebugCommandV1,
  never,
  string,
  never,
  never,
  never,
  never,
  never,
  never
>;

type E2ePersistencePortV1 = {
  readonly lease: {
    getStatus(): Promise<SessionLeaseStatusV1>;
    requestHandoff(): Promise<SessionLeaseOperationResultV1>;
    approveHandoff(requestId: LeaseHandoffRequestId): Promise<SessionLeaseOperationResultV1>;
    takeOver(): Promise<SessionLeaseOperationResultV1>;
    release(): Promise<SessionLeaseOperationResultV1>;
  };
  listSlots(): Promise<readonly SaveSlotSummaryV1[]>;
  getStatus(): Promise<PersistenceStatusV1>;
  save(slot: "quick" | "manual"): Promise<PersistenceOperationResultV1>;
  load(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<PersistenceOperationResultV1>;
  clear(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<PersistenceOperationResultV1>;
  exportSave(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
  importSave(bytes: Uint8Array): Promise<PersistenceOperationResultV1>;
};

export type E2eGameApplicationPortV1 = GameApplicationPortV1<
  E2eSemanticGamePortV1,
  {
    createNewSession(): Promise<SessionAnchorResultV1>;
    restartSession(): Promise<SessionAnchorResultV1>;
  },
  E2ePersistencePortV1,
  { exportDebugBundle(): Promise<ExportedDebugBundleV1> },
  RuntimeCapabilityPortV1,
  E2eDisabledDebugToolsPortV1
>;

type E2eCommandLogOutcomeV1 =
  | { readonly kind: "committed"; readonly facts: readonly E2eGameplayFactV1[] }
  | { readonly kind: "rejected"; readonly reasons: readonly E2eRejectionReasonV1[] }
  | { readonly kind: "faulted"; readonly fault: E2eGameplayFaultV1 };

type E2eCommandLogEntryV1 = CommandLogEntryEnvelopeV1<
  { readonly source: "game"; readonly command: E2eGameCommandV1 },
  E2eCommandLogOutcomeV1
>;

type E2eDiagnosticCodeV1 = E2eGameplayFaultV1["code"] | RuntimeOperationFaultV1["code"];

interface E2eDiagnosticSummaryV1 {
  readonly invariantCodes: readonly never[];
  readonly recentErrorCodes: readonly E2eDiagnosticCodeV1[];
  readonly hmrInvalidated: boolean;
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

function parseE2eCommandLogOutcomeV1(value: unknown): E2eCommandLogOutcomeV1 {
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
    if (fields.source !== "game") throw new TypeError("invalid E2E CommandLog source");
    const sequence = requireExactObjectV1(
      fields.commandSequence,
      ["before", "after"],
      "CommandLog sequence",
    );
    const candidateRngAfter = hasCandidateRngAfter
      ? rngStateV1Schema.parse(fields.candidateRngAfter)
      : undefined;
    return Object.freeze({
      source: "game",
      command: e2eGameCommandSchemaV1.parse(fields.command),
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
      outcome: parseE2eCommandLogOutcomeV1(fields.outcome),
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

function sameRngStateV1(left: DeepReadonly<RngStateV1>, right: DeepReadonly<RngStateV1>): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.cursor === right.cursor &&
    left.rawDrawCount === right.rawDrawCount
  );
}

type E2eDebugBundleV1 = DebugBundleEnvelopeV1<
  BuildProvenanceV1,
  RuntimeCapabilitiesV1,
  readonly SimulationAdoptionV1[],
  E2eGameSnapshotV1,
  E2eCommandLogEntryV1,
  E2eDiagnosticSummaryV1,
  RuntimeOperationFaultV1,
  never,
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
    failureSchema: absentDebugEvidenceSchemaV1,
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

function createE2eUnexpectedFaultAttemptV1(snapshot: DeepReadonly<E2eGameSnapshotV1>) {
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

const noValidationCodesV1 = Object.freeze([]) as readonly string[];
const e2eFlowNodeReferencesV1 = Object.freeze(
  e2eStateContractManifestV1.stableReferenceSets.find(
    ({ setId }) => setId === "references.e2e.flow-node",
  )?.ids ?? [],
);

function validateE2eReferencesV1(state: DeepReadonly<E2eGameStateV1>): readonly string[] {
  const reference = `flow_node.e2e.${state.simulation.flow.nodeId}`;
  return e2eFlowNodeReferencesV1.includes(reference)
    ? noValidationCodesV1
    : Object.freeze(["reference.e2e.flow_node_unknown"]);
}

function validateE2eInvariantsV1(
  gameSimulation: E2eResolvedGameV1["gameSimulation"],
  terminalThreshold: E2eResolvedGameV1["simulationProgram"]["values"]["terminalThreshold"],
  state: DeepReadonly<E2eGameStateV1>,
): readonly string[] {
  const [counterModule, flowModule, runModule] = gameSimulation.modules;
  const counter = counterModule.stateSchema.parse(state.simulation.counter);
  const flow = flowModule.stateSchema.parse(state.simulation.flow);
  const run = runModule.stateSchema.parse(state.simulation.run);
  const counterPort = counterModule.createReadPort(counter);
  const flowPort = flowModule.createReadPort(flow);
  const runPort = runModule.createReadPort(run);
  const violations = [
    ...counterModule.localInvariants.flatMap((invariant) => invariant.check(counter, counterPort)),
    ...flowModule.localInvariants.flatMap((invariant) => invariant.check(flow, flowPort)),
    ...runModule.localInvariants.flatMap((invariant) => invariant.check(run, runPort)),
  ];
  if (
    runPort.status === "complete" &&
    (flowPort.status !== "resolved" ||
      flowPort.nodeId !== "done" ||
      counterPort.value < terminalThreshold)
  ) {
    violations.push(
      Object.freeze({ code: "run.terminal_state_invalid", details: Object.freeze({}) }),
    );
  }
  return violations.length === 0
    ? noValidationCodesV1
    : Object.freeze(violations.map(({ code }) => code));
}

export async function createE2eGameRuntimeV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
}): Promise<E2eGameApplicationPortV1> {
  return createGameRuntimeV1({
    host: input.host,
    async createApplication({
      capabilities,
      persistenceIdentity,
      runtimeFailures,
      reportObserverFailure,
    }) {
      const gameSimulation = input.resolved.gameSimulation;
      const bootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
      const created = createGameSessionV1<E2eGameSimulationTypesV1>({
        initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
        commandSchema: gameSimulation.commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return createE2eUnexpectedFaultAttemptV1(snapshot);
        },
        onObserverFailure: reportObserverFailure,
      });
      const semantic = createE2eSemanticGamePortV1({
        gameSimulation,
        session: created.session,
        runtimeControl: created.runtimeControl,
        reportSubscriberFailure: reportObserverFailure,
      });
      const persistenceService = await createPersistenceServiceV1({
        runtimeControl: created.runtimeControl,
        records: input.host.records,
        snapshotSchema: createGameSnapshotEnvelopeSchemaV1(
          gameSimulation.stateSchema,
          rngStateV1Schema,
        ),
        provenance: input.resolved.provenance,
        adoptionDeclaration: null,
        ownerId: persistenceIdentity.ownerId,
        nextHandoffRequestId: persistenceIdentity.nextHandoffRequestId,
        validateReferences: validateE2eReferencesV1,
        validateInvariants: (state) =>
          validateE2eInvariantsV1(
            gameSimulation,
            input.resolved.simulationProgram.values.terminalThreshold,
            state,
          ),
        initialSimulationLineage: Object.freeze([]),
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-e2e-current.json",
      });

      const lifecycleOperation = () =>
        created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
          async () => {
            const nextBootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
            const snapshot = createE2eInitialSnapshotV1(gameSimulation, nextBootstrap);
            return Object.freeze({
              kind: "replace" as const,
              snapshot,
              result: Object.freeze({
                kind: "anchored" as const,
                commandSequence: parseNonNegativeSafeInteger(0),
              }),
              anchor: "replace_replay_base" as const,
            });
          },
          () => Object.freeze({ kind: "faulted" as const, code: "runtime.anchor_failed" }),
          (snapshot) => persistenceService.establishAnchor(snapshot, Object.freeze([])),
        );

      const debugTools = createCapabilityDisabledDebugToolsPortV1<
        E2eDebugCommandV1,
        never,
        string,
        never,
        never,
        never,
        never,
        never,
        never
      >();
      const debugBundleCodec = createE2eDebugBundleCodecV1(gameSimulation.stateSchema);
      const diagnostics = createGameDiagnosticsServiceV1({
        codec: debugBundleCodec,
        provenance: input.resolved.provenance,
        getCapabilities: () => capabilities.state.getCurrent(),
        getSimulationLineage: () => persistenceService.getSimulationLineage(),
        readAtQueueFront: (reader) => created.runtimeControl.readAtQueueFront(reader),
        getReplayEvidence: () =>
          Object.freeze({
            replayBase: created.commandLog.replayBase(),
            replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
            commandLog: created.commandLog.entries(),
          }),
        getDiagnostics: () => {
          const commandFaults = created.commandLog
            .entries()
            .flatMap(({ outcome }) => (outcome.kind === "faulted" ? [outcome.fault.code] : []));
          const recentErrorCodes = Object.freeze(
            [...commandFaults, ...runtimeFailures.entries().map(({ code }) => code)].slice(-50),
          );
          return Object.freeze({
            invariantCodes: Object.freeze([]),
            recentErrorCodes,
            hmrInvalidated: created.session.getStatus() === "hmr_invalidated",
          });
        },
        getRuntimeFailures: () => runtimeFailures.entries(),
        getFailure: () => undefined,
        scrubFailure: (failure) => failure,
        getUiContext: () => undefined,
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-e2e.debug-bundle.json",
      });
      return createGameApplicationV1({
        semantic,
        lifecycle: Object.freeze({
          createNewSession: lifecycleOperation,
          restartSession: lifecycleOperation,
        }),
        persistence: persistenceService.port,
        diagnostics,
        capabilities,
        debugTools,
      });
    },
  });
}
