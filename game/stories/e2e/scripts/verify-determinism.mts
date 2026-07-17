// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  BuildProvenanceV1,
  CommandExecutionAttemptEnvelopeV1,
  DeepReadonly,
  NonZeroUint32,
} from "@sillymaker/base";
import type { E2eGameSimulationTypesV1 } from "../src/gameplay/contracts/index.ts";
import type { E2eSemanticInvocationV1 } from "../src/runtime/e2e-semantic-game-port.ts";
import type { E2eResolvedGameV1 } from "../src/story-entry.ts";

import { collectE2eBuildIdentityV1 } from "../../../../scripts/build-e2e-identity.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      throw error;
    }
  },
});

const {
  canonicalJsonBytes,
  createTransactionalRngV1,
  digestCanonical,
  parseNonZeroUint32,
  resolveGamePackageV1,
} = await import("@sillymaker/base");
const { createGameSessionV1 } = await import("@sillymaker/base/runtime");
const {
  isRuntimeFixtureProvenanceCurrentV1,
  projectRuntimeFixtureProvenanceV1,
  runtimeFixtureProvenanceV1,
} = await import("../src/runtime/runtime-fixture-provenance.ts");
const { createE2eSemanticGamePortV1 } = await import("../src/runtime/e2e-semantic-game-port.ts");
const { runE2eHeadlessSequenceV1 } = await import("../src/runtime/headless-runner.ts");
const { createE2eInitialSnapshotV1 } = await import("../src/session.ts");
const { e2eStoryEntryV1 } = await import("../src/story-entry.ts");

type E2eAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  E2eGameSimulationTypesV1["snapshot"],
  E2eGameSimulationTypesV1["fact"],
  E2eGameSimulationTypesV1["rejection"],
  E2eGameSimulationTypesV1["fault"],
  E2eGameSimulationTypesV1["rngState"],
  E2eGameSimulationTypesV1["rngDrawTrace"]
>;

export const e2eVectorSeedV1 = parseNonZeroUint32(0x0002_3049);
export const e2eSemanticFlowInvocationsV1 = Object.freeze([
  Object.freeze({ actionId: "action.e2e.start", parameters: Object.freeze({}) }),
  Object.freeze({
    actionId: "action.e2e.choose",
    parameters: Object.freeze({ choice: "right" as const }),
  }),
  Object.freeze({ actionId: "action.e2e.continue", parameters: Object.freeze({}) }),
  Object.freeze({ actionId: "action.e2e.complete", parameters: Object.freeze({}) }),
] satisfies readonly E2eSemanticInvocationV1[]);

function canonicalLineBytesV1(value: unknown): Uint8Array {
  return Buffer.concat([Buffer.from(canonicalJsonBytes(value)), Buffer.from("\n")]);
}

function createUnexpectedFaultAttemptV1(
  snapshot: DeepReadonly<E2eGameSimulationTypesV1["snapshot"]>,
): E2eAttemptV1 {
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

export async function resolveE2eVectorGameV1(
  root = resolve(import.meta.dirname, "../../../.."),
): Promise<E2eResolvedGameV1> {
  const buildIdentity = await collectE2eBuildIdentityV1(root);
  const result = resolveGamePackageV1(e2eStoryEntryV1, [], buildIdentity);
  if (result.kind === "failed") {
    throw new TypeError(
      `${result.failure.code}: ${String(result.failure.details.message ?? "resolution failed")}`,
    );
  }
  return result.resolved;
}

export function resolveE2eReviewedVectorProvenanceV1(
  resolvedGame: E2eResolvedGameV1,
): DeepReadonly<BuildProvenanceV1> {
  const frozen = runtimeFixtureProvenanceV1;
  const projected = projectRuntimeFixtureProvenanceV1(
    resolvedGame.provenance,
    frozen.diagnosticAtGeneration.appBuildId,
  );
  if (!isRuntimeFixtureProvenanceCurrentV1(projected, frozen, "read_only_verification")) {
    throw new TypeError("E2E reviewed vector blocking provenance drifted");
  }
  return Object.freeze({
    story: Object.freeze({
      id: frozen.blocking.storyId,
      revision: frozen.blocking.storyRevision,
      digest: frozen.diagnosticAtGeneration.storyDigest,
    }),
    engine: Object.freeze({
      version: frozen.diagnosticAtGeneration.engineVersion,
      digest: frozen.blocking.engineDigest,
    }),
    resolved: Object.freeze({
      stateContractRevision: frozen.blocking.stateContractRevision,
      stateContractDigest: frozen.blocking.stateContractDigest,
      simulationDigest: frozen.blocking.simulationDigest,
      presentationDigest: frozen.diagnosticAtGeneration.presentationDigest,
      patchSet: frozen.diagnosticAtGeneration.patchSet,
    }),
  });
}

export function createE2eSessionZeroFixtureV1(
  resolvedGame: E2eResolvedGameV1,
  seed: NonZeroUint32 = e2eVectorSeedV1,
  provenance: DeepReadonly<BuildProvenanceV1> = resolvedGame.provenance,
) {
  return Object.freeze({
    provenance,
    rngSeed: seed,
    snapshot: createE2eInitialSnapshotV1(resolvedGame.gameSimulation, { rngSeed: seed }),
  });
}

export function buildE2eSessionZeroFixtureBytesV1(
  resolvedGame: E2eResolvedGameV1,
  seed: NonZeroUint32 = e2eVectorSeedV1,
  provenance: DeepReadonly<BuildProvenanceV1> = resolvedGame.provenance,
): Uint8Array {
  return canonicalLineBytesV1(createE2eSessionZeroFixtureV1(resolvedGame, seed, provenance));
}

export async function createE2eSemanticVectorV1(
  resolvedGame: E2eResolvedGameV1,
  seed: NonZeroUint32,
) {
  const gameSimulation = resolvedGame.gameSimulation;
  const attempts: E2eAttemptV1[] = [];
  const created = createGameSessionV1<E2eGameSimulationTypesV1>({
    initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, { rngSeed: seed }),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createUnexpectedFaultAttemptV1(snapshot);
    },
    onAttempt(attempt) {
      attempts.push(attempt);
    },
  });
  const semantic = createE2eSemanticGamePortV1({
    gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure(error) {
      throw error;
    },
  });
  const run = await runE2eHeadlessSequenceV1(semantic, e2eSemanticFlowInvocationsV1);
  if (run.results.length !== e2eSemanticFlowInvocationsV1.length) {
    throw new TypeError("E2E Semantic vector result count differs from its invocations");
  }
  for (const result of run.results) {
    if (result.kind !== "committed") {
      throw new TypeError(`E2E Semantic vector did not commit: ${result.kind}`);
    }
  }
  if (attempts.length !== e2eSemanticFlowInvocationsV1.length) {
    throw new TypeError("E2E Semantic vector attempt count differs from its invocations");
  }

  const orderedFacts = attempts.flatMap((attempt) => {
    if (attempt.result.kind !== "committed") {
      throw new TypeError(`E2E Semantic attempt did not commit: ${attempt.result.kind}`);
    }
    return attempt.result.facts;
  });
  const rngTrace = attempts.flatMap((attempt) => attempt.diagnostics.attemptedDraws);
  const finalSnapshot = created.session.getCurrentSnapshot();
  const terminalGameView = run.views.at(-1);
  if (
    finalSnapshot.commandSequence !== 4 ||
    finalSnapshot.state.simulation.counter.value !== 2 ||
    finalSnapshot.state.simulation.flow.status !== "resolved" ||
    finalSnapshot.state.simulation.flow.branch !== "right" ||
    finalSnapshot.state.simulation.flow.nodeId !== "done" ||
    finalSnapshot.state.simulation.run.status !== "complete" ||
    terminalGameView?.terminal !== true
  ) {
    throw new TypeError("E2E Semantic vector did not reach its exact terminal State");
  }

  return Object.freeze({
    seed,
    invocations: e2eSemanticFlowInvocationsV1,
    outcomes: Object.freeze(run.results.map(({ kind }) => kind)),
    finalSnapshot,
    finalStateDigest: digestCanonical("sillymaker:state:v1", finalSnapshot),
    orderedFacts: Object.freeze(orderedFacts),
    rngTrace: Object.freeze(rngTrace),
    terminalGameView,
  });
}

export async function createE2eSemanticGoldenV1(
  resolvedGame: E2eResolvedGameV1,
  seed: NonZeroUint32 = e2eVectorSeedV1,
  provenance: DeepReadonly<BuildProvenanceV1> = resolvedGame.provenance,
) {
  return Object.freeze({
    provenance,
    ...(await createE2eSemanticVectorV1(resolvedGame, seed)),
  });
}

export async function buildE2eSemanticGoldenBytesV1(
  resolvedGame: E2eResolvedGameV1,
  seed: NonZeroUint32 = e2eVectorSeedV1,
  provenance: DeepReadonly<BuildProvenanceV1> = resolvedGame.provenance,
): Promise<Uint8Array> {
  return canonicalLineBytesV1(await createE2eSemanticGoldenV1(resolvedGame, seed, provenance));
}

async function verifyDeterminismV1(): Promise<void> {
  const resolvedGame = await resolveE2eVectorGameV1();
  for (let seedValue = 1; seedValue <= 1_000; seedValue += 1) {
    const seed = parseNonZeroUint32(seedValue);
    const first = await createE2eSemanticVectorV1(resolvedGame, seed);
    const second = await createE2eSemanticVectorV1(resolvedGame, seed);
    if (!Buffer.from(canonicalJsonBytes(first)).equals(Buffer.from(canonicalJsonBytes(second)))) {
      throw new TypeError(`seed ${seedValue} E2E Semantic vector is not deterministic`);
    }
  }
  console.log("e2e 1..1000 deterministic Semantic verification passed");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await verifyDeterminismV1();
