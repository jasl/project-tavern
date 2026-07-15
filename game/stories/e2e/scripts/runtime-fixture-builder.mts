// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";
import { resolve } from "node:path";

import type {
  BuildProvenanceV1,
  DeepReadonly,
  Digest,
  IsoUtcInstant,
  PatchSetAdoptionDeclarationV1,
  RuntimeSchemaV1,
  SaveCodecContextV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SaveSlotIdV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import type {
  E2eGameCommandV1,
  E2eGameSimulationTypesV1,
  E2eGameStateV1,
  E2eGameSnapshotV1,
} from "../src/gameplay/contracts/index.js";
import type { E2eResolvedGameV1 } from "../src/story-entry.js";
import type { RuntimeFixtureProvenanceV1 } from "../src/runtime/runtime-fixture-provenance.js";
import type { GameSessionDebugInputV1 } from "@sillymaker/base/runtime";
import type { E2eDebugBundleV1 } from "../src/runtime/e2e-debug-bundle.js";

function installTypeStripResolveHookV1(): void {
  const resolveHook = (
    specifier: string,
    context: unknown,
    nextResolve: (specifier: string, context: unknown) => unknown,
  ): unknown => {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith(".js")) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  };
  const registerHooks = Reflect.get(nodeModule, "registerHooks") as
    ((hooks: { readonly resolve: typeof resolveHook }) => unknown) | undefined;
  if (typeof registerHooks === "function") {
    registerHooks({ resolve: resolveHook });
    return;
  }

  const hookSource = [
    "export async function resolve(specifier, context, nextResolve) {",
    "  try { return await nextResolve(specifier, context); }",
    "  catch (error) {",
    '    if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);',
    "    throw error;",
    "  }",
    "}",
  ].join("\n");
  nodeModule.register(`data:text/javascript,${encodeURIComponent(hookSource)}`, import.meta.url);
}

installTypeStripResolveHookV1();

const repositoryRootV1 = resolve(import.meta.dirname, "../../../..");
const runtimeFixtureGeneratorSourcePathsV1 = Object.freeze([
  "game/stories/e2e/scripts/runtime-fixture-builder.mts",
  "game/stories/e2e/src/runtime/runtime-fixture-provenance.ts",
  "game/stories/e2e/src/runtime/e2e-debug-bundle.ts",
]);

export const runtimeFixturePayloadNamesV1 = Object.freeze([
  "adoption-exact-patchset.v1.json",
  "adoption-lineage-limit.v1.json",
  "auto-current-flow-blocked.v1.json",
  "auto-previous-recovery.v1.json",
  "corrupt-state-digest.v1.json",
  "debug-flow-command-log.v1.json",
  "future-format-revision.v1.json",
  "manual-modified-cheat.v1.json",
  "manual-terminal.v1.json",
  "quick-narrative-branch.v1.json",
] as const);

export type RuntimeFixturePayloadNameV1 = (typeof runtimeFixturePayloadNamesV1)[number];
export type RuntimeFixtureClassificationV1 =
  | "exact"
  | "adopted"
  | "compatibility.lineage_limit"
  | "digest.state_mismatch"
  | "envelope.unsupported_revision"
  | "authoritative_replay";
export type RuntimeFixtureIntegrityModeV1 = "normal" | "modified";

interface RuntimeFixtureSaveSlotV1 {
  readonly storyId: string;
  readonly slotId: SaveSlotIdV1;
  readonly writeReason: "auto" | "quick" | "manual";
  readonly capturedCommandSequence: E2eGameSnapshotV1["commandSequence"];
}

type RuntimeFixtureSaveRecordV1 = SaveRecordEnvelopeV1<
  E2eGameSnapshotV1,
  BuildProvenanceV1,
  RuntimeFixtureSaveSlotV1,
  readonly SimulationAdoptionV1[]
>;

export interface RuntimeFixtureVerificationContextV1 {
  readonly root: string;
  readonly resolved: E2eResolvedGameV1;
  readonly appBuildId: Digest;
  readonly frozenProvenance: RuntimeFixtureProvenanceV1;
  readonly codec: SaveCodecContextV1<E2eGameSnapshotV1, RuntimeFixtureSaveRecordV1>;
  readonly snapshotSchema: RuntimeSchemaV1<E2eGameSnapshotV1>;
  readonly debugCodec: ReturnType<
    typeof import("../src/runtime/e2e-debug-bundle.js").createE2eDebugBundleCodecV1
  >;
  readonly adoptionDeclaration: PatchSetAdoptionDeclarationV1;
}

export interface RuntimeFixtureManifestEntryV1 {
  readonly path: RuntimeFixturePayloadNameV1;
  readonly byteLength: number;
  readonly sha256: Digest;
  readonly classification: RuntimeFixtureClassificationV1;
  readonly integrityMode: RuntimeFixtureIntegrityModeV1;
}

export interface RuntimeFixtureManifestV1 {
  readonly formatRevision: 1;
  readonly files: readonly RuntimeFixtureManifestEntryV1[];
  readonly blockingProvenance: RuntimeFixtureProvenanceV1["blocking"];
  readonly diagnosticAtGeneration: RuntimeFixtureProvenanceV1["diagnosticAtGeneration"];
  readonly generatorSourceDigest: Digest;
}

export interface RuntimeFixtureSetV1 {
  readonly files: ReadonlyMap<string, Uint8Array>;
  readonly manifest: RuntimeFixtureManifestV1;
  readonly manifestBytes: Uint8Array;
  readonly verificationContext: RuntimeFixtureVerificationContextV1;
}

export interface BuildRuntimeFixtureSetOptionsV1 {
  readonly root?: string;
  readonly generatedAt?: string;
}

type ExactFieldsV1 = Readonly<Record<string, unknown>>;

function exactFieldsV1(value: unknown, keys: readonly string[], label: string): ExactFieldsV1 {
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
  if (Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
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

function denseArrayV1<T>(
  value: unknown,
  label: string,
  parse: (entry: unknown, index: number) => T,
  maximumLength = 10_000,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = Array.from({ length: value.length }, (_, index) => String(index));
  const actual = Object.keys(descriptors)
    .filter((key) => key !== "length")
    .toSorted((left, right) => Number(left) - Number(right));
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    expected.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry`);
      }
      return parse(descriptor.value, index);
    }),
  );
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

function parseGeneratedAtV1(value: string): IsoUtcInstant {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    throw new TypeError("invalid runtime fixture UTC time");
  }
  return value as IsoUtcInstant;
}

async function loadModulesV1() {
  const buildIdentitySpecifier: string = "../../../../scripts/build-e2e-identity.mjs";
  const [
    base,
    runtime,
    contracts,
    session,
    provenance,
    storyDefinition,
    storyEntry,
    debugBundle,
    buildIdentityUnknown,
  ] = await Promise.all([
    import("@sillymaker/base"),
    import("@sillymaker/base/runtime"),
    import("../src/gameplay/contracts/index.js"),
    import("../src/session.js"),
    import("../src/runtime/runtime-fixture-provenance.js"),
    import("../src/story-definition.js"),
    import("../src/story-entry.js"),
    import("../src/runtime/e2e-debug-bundle.js"),
    import(buildIdentitySpecifier),
  ]);
  const buildIdentity = buildIdentityUnknown as {
    collectE2eBuildIdentityV1(
      root?: string,
    ): Promise<Parameters<typeof import("@sillymaker/base").resolveGamePackageV1>[2]>;
  };
  return Object.freeze({
    base,
    runtime,
    contracts,
    session,
    provenance,
    storyDefinition,
    storyEntry,
    debugBundle,
    buildIdentity,
  });
}

function parsePatchReplacementV1(
  value: unknown,
  base: Awaited<ReturnType<typeof loadModulesV1>>["base"],
) {
  const fields = exactFieldsV1(
    value,
    ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
    "Patch replacement",
  );
  const surface = fields.surface;
  const kind = fields.kind;
  if (
    (surface !== "simulation" && surface !== "presentation") ||
    (kind !== "rule" && kind !== "value" && kind !== "text" && kind !== "asset") ||
    (surface === "simulation" && kind !== "rule" && kind !== "value") ||
    (surface === "presentation" && kind === "rule")
  ) {
    throw new TypeError("invalid Patch replacement kind");
  }
  return Object.freeze({
    surface,
    symbolId: nonemptyStringV1(fields.symbolId, "Patch symbol ID"),
    kind,
    previousProviderDigest: base.parseDigest(fields.previousProviderDigest),
    nextProviderDigest: base.parseDigest(fields.nextProviderDigest),
  });
}

function createBuildProvenanceSchemaV1(
  base: Awaited<ReturnType<typeof loadModulesV1>>["base"],
): RuntimeSchemaV1<BuildProvenanceV1> {
  return Object.freeze({
    parse(value: unknown): BuildProvenanceV1 {
      const fields = exactFieldsV1(value, ["story", "engine", "resolved"], "Build provenance");
      const story = exactFieldsV1(fields.story, ["id", "revision", "digest"], "Story provenance");
      const engine = exactFieldsV1(fields.engine, ["version", "digest"], "Engine provenance");
      const resolved = exactFieldsV1(
        fields.resolved,
        [
          "stateContractRevision",
          "stateContractDigest",
          "simulationDigest",
          "presentationDigest",
          "patchSet",
        ],
        "Resolved provenance",
      );
      const patchSet = exactFieldsV1(
        resolved.patchSet,
        ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
        "PatchSet identity",
      );
      const appliedHotfixes = denseArrayV1(
        patchSet.appliedHotfixes,
        "applied Hotfixes",
        (entry, index) => {
          const hotfix = exactFieldsV1(
            entry,
            ["identity", "ordinal", "replacements"],
            "applied Hotfix",
          );
          const identity = exactFieldsV1(
            hotfix.identity,
            ["id", "revision", "digest"],
            "Hotfix identity",
          );
          const ordinal = base.parsePositiveSafeInteger(hotfix.ordinal);
          if (Number(ordinal) !== index + 1) throw new TypeError("invalid applied Hotfix ordinal");
          return Object.freeze({
            identity: Object.freeze({
              id: nonemptyStringV1(identity.id, "Hotfix ID"),
              revision: base.parsePositiveSafeInteger(identity.revision),
              digest: base.parseDigest(identity.digest),
            }),
            ordinal,
            replacements: denseArrayV1(hotfix.replacements, "Patch replacements", (replacement) =>
              parsePatchReplacementV1(replacement, base),
            ),
          });
        },
      );
      if (
        new Set(appliedHotfixes.map(({ identity }) => identity.id)).size !== appliedHotfixes.length
      ) {
        throw new TypeError("duplicate applied Hotfix identity");
      }
      return Object.freeze({
        story: Object.freeze({
          id: nonemptyStringV1(story.id, "Story ID"),
          revision: base.parsePositiveSafeInteger(story.revision),
          digest: base.parseDigest(story.digest),
        }),
        engine: Object.freeze({
          version: nonemptyStringV1(engine.version, "Engine version"),
          digest: base.parseDigest(engine.digest),
        }),
        resolved: Object.freeze({
          stateContractRevision: base.parsePositiveSafeInteger(resolved.stateContractRevision),
          stateContractDigest: base.parseDigest(resolved.stateContractDigest),
          simulationDigest: base.parseDigest(resolved.simulationDigest),
          presentationDigest: base.parseDigest(resolved.presentationDigest),
          patchSet: Object.freeze({
            digest: base.parseDigest(patchSet.digest),
            simulationDigest: base.parseDigest(patchSet.simulationDigest),
            presentationDigest: base.parseDigest(patchSet.presentationDigest),
            appliedHotfixes,
          }),
        }),
      });
    },
  });
}

function createRuntimeFixtureCodecV1(
  modules: Awaited<ReturnType<typeof loadModulesV1>>,
  resolved: E2eResolvedGameV1,
): {
  readonly codec: SaveCodecContextV1<E2eGameSnapshotV1, RuntimeFixtureSaveRecordV1>;
  readonly snapshotSchema: RuntimeSchemaV1<E2eGameSnapshotV1>;
} {
  const { base } = modules;
  const snapshotSchema = base.createGameSnapshotEnvelopeSchemaV1(
    resolved.gameSimulation.stateSchema,
    base.rngStateV1Schema,
  );
  const slotSchema: RuntimeSchemaV1<RuntimeFixtureSaveSlotV1> = Object.freeze({
    parse(value: unknown): RuntimeFixtureSaveSlotV1 {
      const fields = exactFieldsV1(
        value,
        ["storyId", "slotId", "writeReason", "capturedCommandSequence"],
        "Save slot metadata",
      );
      const slotId = fields.slotId;
      if (
        slotId !== "auto.current" &&
        slotId !== "auto.previous" &&
        slotId !== "quick" &&
        slotId !== "manual"
      ) {
        throw new TypeError("invalid Save slot ID");
      }
      const writeReason = fields.writeReason;
      if (writeReason !== "auto" && writeReason !== "quick" && writeReason !== "manual") {
        throw new TypeError("invalid Save write reason");
      }
      return Object.freeze({
        storyId: nonemptyStringV1(fields.storyId, "Save Story ID"),
        slotId,
        writeReason,
        capturedCommandSequence: base.parseNonNegativeSafeInteger(fields.capturedCommandSequence),
      });
    },
  });
  const lineageSchema: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
    parse(value: unknown): readonly SimulationAdoptionV1[] {
      return denseArrayV1(
        value,
        "simulation lineage",
        (entry) => {
          const fields = exactFieldsV1(
            entry,
            [
              "fromSimulationDigest",
              "toSimulationDigest",
              "viaSimulationPatchSetDigest",
              "adoptedAtCommandSequence",
            ],
            "Simulation adoption",
          );
          const fromSimulationDigest = base.parseDigest(fields.fromSimulationDigest);
          const toSimulationDigest = base.parseDigest(fields.toSimulationDigest);
          if (fromSimulationDigest === toSimulationDigest) {
            throw new TypeError("empty Simulation adoption");
          }
          return Object.freeze({
            fromSimulationDigest,
            toSimulationDigest,
            viaSimulationPatchSetDigest: base.parseDigest(fields.viaSimulationPatchSetDigest),
            adoptedAtCommandSequence: base.parseNonNegativeSafeInteger(
              fields.adoptedAtCommandSequence,
            ),
          });
        },
        16,
      );
    },
  });
  const recordSchema = base.createSaveRecordEnvelopeSchemaV1(
    snapshotSchema,
    createBuildProvenanceSchemaV1(base),
    slotSchema,
    lineageSchema,
  ) as RuntimeSchemaV1<RuntimeFixtureSaveRecordV1>;
  const codec: SaveCodecContextV1<E2eGameSnapshotV1, RuntimeFixtureSaveRecordV1> = Object.freeze({
    recordSchema,
    validateEnvelope(record: DeepReadonly<RuntimeFixtureSaveRecordV1>): void {
      const expectedReason =
        record.slot.slotId === "quick"
          ? "quick"
          : record.slot.slotId === "manual"
            ? "manual"
            : "auto";
      if (
        record.slot.storyId !== record.provenance.story.id ||
        record.slot.writeReason !== expectedReason ||
        record.slot.capturedCommandSequence !== record.snapshot.commandSequence
      ) {
        throw new TypeError("invalid Save envelope identity");
      }
      for (let index = 0; index < record.simulationLineage.length; index += 1) {
        const current = record.simulationLineage[index];
        const previous = record.simulationLineage[index - 1];
        const next = record.simulationLineage[index + 1];
        if (
          current === undefined ||
          current.toSimulationDigest !==
            (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest) ||
          (previous !== undefined &&
            previous.adoptedAtCommandSequence > current.adoptedAtCommandSequence) ||
          current.adoptedAtCommandSequence > record.snapshot.commandSequence
        ) {
          throw new TypeError("invalid simulation lineage chain");
        }
      }
    },
  });
  return Object.freeze({ codec, snapshotSchema });
}

function canonicalBytesEqualV1(
  left: unknown,
  right: unknown,
  base: Awaited<ReturnType<typeof loadModulesV1>>["base"],
): boolean {
  return Buffer.from(base.canonicalJsonBytes(left)).equals(
    Buffer.from(base.canonicalJsonBytes(right)),
  );
}

export async function createRuntimeFixtureVerificationContextV1(
  root = repositoryRootV1,
): Promise<RuntimeFixtureVerificationContextV1> {
  const modules = await loadModulesV1();
  const absoluteRoot = resolve(root);
  const buildIdentity = await modules.buildIdentity.collectE2eBuildIdentityV1(absoluteRoot);
  const resolution = modules.base.resolveGamePackageV1(
    modules.storyEntry.e2eStoryEntryV1,
    Object.freeze([]),
    buildIdentity,
  );
  if (resolution.kind === "failed") {
    throw new TypeError(
      `${resolution.failure.code}: ${String(
        resolution.failure.details.message ?? "E2E Story resolution failed",
      )}`,
    );
  }
  const resolved = resolution.resolved;
  const appBuildId = modules.base.digestCanonical(
    "sillymaker:application:v1",
    buildIdentity.application,
  );
  const projected = modules.provenance.projectRuntimeFixtureProvenanceV1(
    resolved.provenance,
    appBuildId,
  );
  const frozenProvenance = modules.provenance.parseRuntimeFixtureProvenanceV1(
    modules.provenance.runtimeFixtureProvenanceV1,
  );
  if (!canonicalBytesEqualV1(projected, frozenProvenance, modules.base)) {
    throw new TypeError("runtime_fixture_generation.provenance_drift");
  }
  const codec = createRuntimeFixtureCodecV1(modules, resolved);
  const debugCodec = modules.debugBundle.createE2eDebugBundleCodecV1(
    resolved.gameSimulation.stateSchema,
  );
  const fromSimulationDigest = modules.base.digestCanonical("sillymaker:simulation:v1", {
    fixture: "runtime-adoption-source",
    revision: 1,
  });
  return Object.freeze({
    root: absoluteRoot,
    resolved,
    appBuildId,
    frozenProvenance,
    codec: codec.codec,
    snapshotSchema: codec.snapshotSchema,
    debugCodec,
    adoptionDeclaration: Object.freeze({
      storyId: resolved.provenance.story.id,
      storyRevision: resolved.provenance.story.revision,
      stateContractRevision: resolved.provenance.resolved.stateContractRevision,
      stateContractDigest: resolved.provenance.resolved.stateContractDigest,
      fromSimulationDigest,
      toSimulationDigest: resolved.provenance.resolved.simulationDigest,
      simulationPatchSetDigest: resolved.provenance.resolved.patchSet.simulationDigest,
    }),
  });
}

function validateE2eReferencesV1(
  state: DeepReadonly<E2eGameStateV1>,
  stableReferenceSets: readonly {
    readonly setId: string;
    readonly ids: readonly string[];
  }[],
): readonly string[] {
  const flowNodes = stableReferenceSets.find(({ setId }) => setId === "references.e2e.flow-node");
  const reference = `flow_node.e2e.${state.simulation.flow.nodeId}`;
  return flowNodes?.ids.includes(reference) === true
    ? Object.freeze([])
    : Object.freeze(["reference.e2e.flow_node_unknown"]);
}

function validateE2eInvariantsV1(
  state: DeepReadonly<E2eGameStateV1>,
  context: RuntimeFixtureVerificationContextV1,
): readonly string[] {
  try {
    const gameSimulation = context.resolved.gameSimulation;
    const parsed = gameSimulation.stateSchema.parse(state);
    const [counterModule, flowModule, runModule] = gameSimulation.modules;
    const counter = counterModule.stateSchema.parse(parsed.simulation.counter);
    const flow = flowModule.stateSchema.parse(parsed.simulation.flow);
    const run = runModule.stateSchema.parse(parsed.simulation.run);
    const counterPort = counterModule.createReadPort(counter);
    const flowPort = flowModule.createReadPort(flow);
    const runPort = runModule.createReadPort(run);
    const violations = [
      ...counterModule.localInvariants.flatMap((invariant) =>
        invariant.check(counter, counterPort),
      ),
      ...flowModule.localInvariants.flatMap((invariant) => invariant.check(flow, flowPort)),
      ...runModule.localInvariants.flatMap((invariant) => invariant.check(run, runPort)),
    ];
    const terminalThreshold = context.resolved.simulationProgram.values.terminalThreshold;
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
    return Object.freeze(violations.map(({ code }) => code));
  } catch {
    return Object.freeze(["state.schema_invalid"]);
  }
}

async function validateSaveV1(bytes: Uint8Array, context: RuntimeFixtureVerificationContextV1) {
  const modules = await loadModulesV1();
  const stableReferenceSets = modules.storyDefinition.e2eStateContractManifestV1
    .stableReferenceSets as readonly {
    readonly setId: string;
    readonly ids: readonly string[];
  }[];
  const withClassifier: SaveImportValidationContextV1<
    E2eGameStateV1,
    E2eGameSnapshotV1,
    RuntimeFixtureSaveRecordV1
  > = Object.freeze({
    codec: context.codec,
    classifyCompatibility(record: DeepReadonly<RuntimeFixtureSaveRecordV1>) {
      return modules.runtime.classifySaveCompatibilityV1({
        stored: record.provenance,
        current: context.resolved.provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclaration: context.adoptionDeclaration,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences(state: DeepReadonly<E2eGameStateV1>): readonly string[] {
      return validateE2eReferencesV1(state, stableReferenceSets);
    },
    validateInvariants({
      state,
    }: {
      readonly state: DeepReadonly<E2eGameStateV1>;
    }): readonly string[] {
      return validateE2eInvariantsV1(state, context);
    },
  });
  return modules.runtime.validateSaveImportCandidateV1(bytes, withClassifier);
}

function snapshotIntegrityFromJsonV1(
  bytes: Uint8Array,
  context: RuntimeFixtureVerificationContextV1,
  base: Awaited<ReturnType<typeof loadModulesV1>>["base"],
): RuntimeFixtureIntegrityModeV1 {
  const decoded = base.parseStrictJson(bytes, base.saveJsonLimitsV1);
  if (!decoded.ok) throw new TypeError(`runtime fixture strict JSON failed: ${decoded.error.code}`);
  const fields = exactFieldsV1(
    decoded.value,
    Object.keys(decoded.value as object),
    "fixture envelope",
  );
  const snapshot = context.snapshotSchema.parse(fields.snapshot);
  return snapshot.integrity.mode;
}

export async function classifyRuntimeFixtureV1(
  filename: string,
  bytes: Uint8Array,
  context: RuntimeFixtureVerificationContextV1,
): Promise<{
  readonly classification: RuntimeFixtureClassificationV1;
  readonly integrityMode: RuntimeFixtureIntegrityModeV1;
}> {
  const modules = await loadModulesV1();
  if (filename === "debug-flow-command-log.v1.json") {
    const replay = await replayTrackedDebugBundleV1(bytes, context);
    if (!replay.authoritative || !replay.identityMatch || !replay.matches) {
      throw new TypeError("runtime fixture Debug Bundle is not authoritative");
    }
    return Object.freeze({
      classification: "authoritative_replay" as const,
      integrityMode: replay.finalIntegrity.mode,
    });
  }
  const integrityMode = snapshotIntegrityFromJsonV1(bytes, context, modules.base);
  const result = await validateSaveV1(bytes, context);
  const classification: RuntimeFixtureClassificationV1 =
    result.kind === "exact" || result.kind === "adopted"
      ? result.kind
      : result.kind === "rejected" &&
          (result.code === "compatibility.lineage_limit" ||
            result.code === "digest.state_mismatch" ||
            result.code === "envelope.unsupported_revision")
        ? result.code
        : (() => {
            throw new TypeError(
              `unexpected runtime fixture classification ${result.kind}${
                result.kind === "rejected" ? `:${result.code}` : ""
              }`,
            );
          })();
  return Object.freeze({ classification, integrityMode });
}

function createFixtureSessionV1(
  context: RuntimeFixtureVerificationContextV1,
  modules: Awaited<ReturnType<typeof loadModulesV1>>,
) {
  const gameSimulation = context.resolved.gameSimulation;
  const initialSnapshot = modules.session.createE2eInitialSnapshotV1(
    gameSimulation,
    Object.freeze({
      // This is the reviewed deterministic E2E vector seed, not Host entropy.
      rngSeed: modules.base.parseNonZeroUint32(0x0002_3049),
    }),
  );
  const created = modules.runtime.createGameSessionV1<E2eGameSimulationTypesV1>({
    initialSnapshot,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return modules.debugBundle.createE2eUnexpectedFaultAttemptV1(snapshot);
    },
    debug: Object.freeze({
      validate(snapshot, command) {
        return gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined);
      },
      executeAttempt(snapshot, command) {
        return gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined);
      },
      normalizeUnexpectedFault(_error, snapshot) {
        return modules.debugBundle.createE2eUnexpectedFaultAttemptV1(snapshot);
      },
    } satisfies GameSessionDebugInputV1<E2eGameSimulationTypesV1>),
  });
  return Object.freeze({ ...created, initialSnapshot });
}

async function dispatchCommittedV1(
  created: ReturnType<typeof createFixtureSessionV1>,
  command: DeepReadonly<E2eGameCommandV1>,
): Promise<DeepReadonly<E2eGameSnapshotV1>> {
  const result = await created.session.dispatch(command);
  if (result.kind !== "executed" || result.execution.kind !== "committed") {
    throw new TypeError(
      `runtime fixture GameCommand did not commit: ${
        result.kind === "executed" ? result.execution.kind : result.kind
      }`,
    );
  }
  return result.execution.snapshot;
}

function createSaveRecordV1(
  snapshot: DeepReadonly<E2eGameSnapshotV1>,
  slotId: SaveSlotIdV1,
  recordRevision: number,
  savedAt: IsoUtcInstant,
  context: RuntimeFixtureVerificationContextV1,
  modules: Awaited<ReturnType<typeof loadModulesV1>>,
  provenance: DeepReadonly<BuildProvenanceV1> = context.resolved.provenance,
  simulationLineage: readonly SimulationAdoptionV1[] = Object.freeze([]),
): RuntimeFixtureSaveRecordV1 {
  const writeReason = slotId === "quick" ? "quick" : slotId === "manual" ? "manual" : "auto";
  return Object.freeze({
    formatRevision: 1 as const,
    recordRevision: modules.base.parsePositiveSafeInteger(recordRevision),
    provenance,
    slot: Object.freeze({
      storyId: provenance.story.id,
      slotId,
      writeReason,
      capturedCommandSequence: snapshot.commandSequence,
    }),
    savedAt,
    stateDigest: modules.base.digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: Object.freeze([...simulationLineage]),
  }) as RuntimeFixtureSaveRecordV1;
}

function encodeSaveV1(
  snapshot: DeepReadonly<E2eGameSnapshotV1>,
  slotId: SaveSlotIdV1,
  recordRevision: number,
  savedAt: IsoUtcInstant,
  context: RuntimeFixtureVerificationContextV1,
  modules: Awaited<ReturnType<typeof loadModulesV1>>,
): Uint8Array {
  return modules.runtime.encodeSaveRecordV1(
    createSaveRecordV1(snapshot, slotId, recordRevision, savedAt, context, modules),
    context.codec,
  );
}

function decodeSaveRecordOrThrowV1(
  bytes: Uint8Array,
  context: RuntimeFixtureVerificationContextV1,
  runtime: Awaited<ReturnType<typeof loadModulesV1>>["runtime"],
): DeepReadonly<RuntimeFixtureSaveRecordV1> {
  const result = runtime.decodeSaveRecordV1(bytes, context.codec);
  if (result.kind !== "decoded") {
    throw new TypeError(`runtime fixture source Save failed to decode: ${result.code}`);
  }
  return result.record;
}

function withSimulationDigestV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
  simulationDigest: Digest,
): BuildProvenanceV1 {
  return Object.freeze({
    story: provenance.story,
    engine: provenance.engine,
    resolved: Object.freeze({ ...provenance.resolved, simulationDigest }),
  }) as BuildProvenanceV1;
}

function createLineageLimitV1(
  context: RuntimeFixtureVerificationContextV1,
  base: Awaited<ReturnType<typeof loadModulesV1>>["base"],
): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length: 16 }, (_, index) =>
    base.digestCanonical("sillymaker:simulation:v1", {
      fixture: "runtime-lineage-boundary",
      index,
    }),
  );
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest:
          boundaries[index + 1] ?? context.adoptionDeclaration.fromSimulationDigest,
        viaSimulationPatchSetDigest: base.digestCanonical("sillymaker:patch-set:v1", {
          fixture: "runtime-lineage-patch",
          index,
        }),
        adoptedAtCommandSequence: base.parseNonNegativeSafeInteger(0),
      }),
    ),
  );
}

async function buildPayloadsV1(
  context: RuntimeFixtureVerificationContextV1,
  generatedAt: IsoUtcInstant,
): Promise<ReadonlyMap<RuntimeFixturePayloadNameV1, Uint8Array>> {
  const modules = await loadModulesV1();
  const payloads = new Map<RuntimeFixturePayloadNameV1, Uint8Array>();

  const auto = createFixtureSessionV1(context, modules);
  const autoPrevious = await dispatchCommittedV1(auto, Object.freeze({ kind: "e2e.flow.start" }));
  const autoCurrent = await dispatchCommittedV1(
    auto,
    Object.freeze({ kind: "e2e.flow.choose", choice: "left" }),
  );
  payloads.set(
    "auto-current-flow-blocked.v1.json",
    encodeSaveV1(autoCurrent, "auto.current", 2, generatedAt, context, modules),
  );
  payloads.set(
    "auto-previous-recovery.v1.json",
    encodeSaveV1(autoPrevious, "auto.previous", 1, generatedAt, context, modules),
  );

  const narrative = createFixtureSessionV1(context, modules);
  await dispatchCommittedV1(narrative, Object.freeze({ kind: "e2e.flow.start" }));
  const narrativeSnapshot = await dispatchCommittedV1(
    narrative,
    Object.freeze({ kind: "e2e.flow.choose", choice: "right" }),
  );
  payloads.set(
    "quick-narrative-branch.v1.json",
    encodeSaveV1(narrativeSnapshot, "quick", 1, generatedAt, context, modules),
  );

  const terminal = createFixtureSessionV1(context, modules);
  await dispatchCommittedV1(terminal, Object.freeze({ kind: "e2e.flow.start" }));
  await dispatchCommittedV1(terminal, Object.freeze({ kind: "e2e.flow.choose", choice: "right" }));
  await dispatchCommittedV1(terminal, Object.freeze({ kind: "e2e.flow.continue" }));
  const terminalSnapshot = await dispatchCommittedV1(
    terminal,
    Object.freeze({ kind: "e2e.run.complete" }),
  );
  const terminalBytes = encodeSaveV1(terminalSnapshot, "manual", 1, generatedAt, context, modules);
  payloads.set("manual-terminal.v1.json", terminalBytes);

  const modified = createFixtureSessionV1(context, modules);
  await dispatchCommittedV1(modified, Object.freeze({ kind: "e2e.flow.start" }));
  await dispatchCommittedV1(modified, Object.freeze({ kind: "e2e.flow.choose", choice: "left" }));
  const debugCommit = await modified.debugControl.execute(
    Object.freeze({
      kind: "debug.e2e.counter.add" as const,
      amount: modules.base.parsePositiveSafeInteger(5),
    }),
    () => true,
  );
  if (debugCommit.kind !== "executed" || debugCommit.attempt.result.kind !== "committed") {
    throw new TypeError(
      `runtime fixture DebugCommand did not commit: ${
        debugCommit.kind === "executed" ? debugCommit.attempt.result.kind : debugCommit.kind
      }`,
    );
  }
  const modifiedSnapshot = modified.session.getCurrentSnapshot();
  payloads.set(
    "manual-modified-cheat.v1.json",
    encodeSaveV1(modifiedSnapshot, "manual", 1, generatedAt, context, modules),
  );
  const debugBundle = Object.freeze({
    formatRevision: 1 as const,
    provenance: context.resolved.provenance,
    appBuildId: context.appBuildId,
    capabilities: Object.freeze({
      debugTools: true,
      cheats: true,
      automationBridge: false,
    }),
    simulationLineage: Object.freeze([]),
    generatedAt,
    replayBase: modified.commandLog.replayBase(),
    replayBaseStateDigest: modified.commandLog.replayBaseStateDigest(),
    commandLog: modified.commandLog.entries(),
    currentSnapshot: modifiedSnapshot,
    currentStateDigest: modules.base.digestCanonical("sillymaker:state:v1", modifiedSnapshot),
    diagnostics: Object.freeze({
      invariantCodes: Object.freeze([]),
      recentErrorCodes: Object.freeze([]),
      hmrInvalidated: false,
    }),
    runtimeFailures: Object.freeze([]),
  }) as E2eDebugBundleV1;
  payloads.set(
    "debug-flow-command-log.v1.json",
    modules.runtime.encodeDebugBundleV1(debugBundle, context.debugCodec),
  );

  const terminalRecord = decodeSaveRecordOrThrowV1(terminalBytes, context, modules.runtime);
  const oldProvenance = withSimulationDigestV1(
    terminalRecord.provenance,
    context.adoptionDeclaration.fromSimulationDigest,
  );
  const adoptionRecord: RuntimeFixtureSaveRecordV1 = Object.freeze({
    ...terminalRecord,
    provenance: oldProvenance,
    simulationLineage: Object.freeze([]),
  }) as RuntimeFixtureSaveRecordV1;
  payloads.set(
    "adoption-exact-patchset.v1.json",
    modules.runtime.encodeSaveRecordV1(adoptionRecord, context.codec),
  );

  const lineageLimitRecord: RuntimeFixtureSaveRecordV1 = Object.freeze({
    ...adoptionRecord,
    simulationLineage: createLineageLimitV1(context, modules.base),
  }) as RuntimeFixtureSaveRecordV1;
  payloads.set(
    "adoption-lineage-limit.v1.json",
    modules.runtime.encodeSaveRecordV1(lineageLimitRecord, context.codec),
  );

  payloads.set(
    "corrupt-state-digest.v1.json",
    modules.base.canonicalJsonBytes({
      ...terminalRecord,
      stateDigest: modules.base.digestCanonical("sillymaker:state:v1", {
        fixture: "intentionally-corrupt-state-digest",
      }),
    }),
  );
  payloads.set(
    "future-format-revision.v1.json",
    modules.base.canonicalJsonBytes({ ...terminalRecord, formatRevision: 2 }),
  );

  const ordered = new Map<RuntimeFixturePayloadNameV1, Uint8Array>();
  for (const filename of runtimeFixturePayloadNamesV1) {
    const bytes = payloads.get(filename);
    if (bytes === undefined) throw new TypeError(`missing built runtime fixture ${filename}`);
    ordered.set(filename, new Uint8Array(bytes));
  }
  if (payloads.size !== runtimeFixturePayloadNamesV1.length) {
    throw new TypeError("unexpected built runtime fixture payload");
  }
  return ordered;
}

export async function computeRuntimeFixtureGeneratorSourceDigestV1(
  root = repositoryRootV1,
): Promise<Digest> {
  const { base } = await loadModulesV1();
  const absoluteRoot = resolve(root);
  const records = await Promise.all(
    runtimeFixtureGeneratorSourcePathsV1.map(async (path) => {
      const bytes = await readFile(resolve(absoluteRoot, path));
      return Object.freeze({ path, sha256: base.digestBytes(bytes) });
    }),
  );
  const sortedRecords = records.toSorted((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  return base.digestBytes(base.canonicalJsonBytes(sortedRecords));
}

export async function buildRuntimeFixtureSetV1(
  options: BuildRuntimeFixtureSetOptionsV1 = {},
): Promise<RuntimeFixtureSetV1> {
  const root = resolve(options.root ?? repositoryRootV1);
  const generatedAt = parseGeneratedAtV1(options.generatedAt ?? "2026-07-14T00:00:00.000Z");
  const [modules, verificationContext] = await Promise.all([
    loadModulesV1(),
    createRuntimeFixtureVerificationContextV1(root),
  ]);
  const payloads = await buildPayloadsV1(verificationContext, generatedAt);
  const files: RuntimeFixtureManifestEntryV1[] = [];
  for (const [path, bytes] of payloads) {
    const classified = await classifyRuntimeFixtureV1(path, bytes, verificationContext);
    files.push(
      Object.freeze({
        path,
        byteLength: bytes.byteLength,
        sha256: modules.base.digestBytes(bytes),
        classification: classified.classification,
        integrityMode: classified.integrityMode,
      }),
    );
  }
  const manifest: RuntimeFixtureManifestV1 = Object.freeze({
    formatRevision: 1,
    files: Object.freeze(files),
    blockingProvenance: verificationContext.frozenProvenance.blocking,
    diagnosticAtGeneration: verificationContext.frozenProvenance.diagnosticAtGeneration,
    generatorSourceDigest: await computeRuntimeFixtureGeneratorSourceDigestV1(root),
  });
  const manifestBytes = modules.base.canonicalJsonBytes(manifest);
  const allFiles = new Map<string, Uint8Array>(payloads);
  allFiles.set("manifest.v1.json", manifestBytes);
  return Object.freeze({
    files: allFiles,
    manifest,
    manifestBytes,
    verificationContext,
  });
}

export async function replayTrackedDebugBundleV1(
  bytes: Uint8Array,
  context: RuntimeFixtureVerificationContextV1,
): Promise<{
  readonly authoritative: boolean;
  readonly identityMatch: boolean;
  readonly matches: boolean;
  readonly finalIntegrity: DeepReadonly<E2eGameSnapshotV1["integrity"]>;
}> {
  const modules = await loadModulesV1();
  const decoded = modules.runtime.decodeDebugBundleV1(bytes, context.debugCodec);
  if (decoded.kind !== "decoded") {
    throw new TypeError(`runtime fixture Debug Bundle failed to decode: ${decoded.code}`);
  }
  const comparison = await modules.runtime.replayAuthoritativelyV1(
    modules.debugBundle.createE2eReplayInputV1(context.resolved, decoded.bundle),
  );
  return Object.freeze({
    authoritative: comparison.authoritative,
    identityMatch: comparison.identityMatch,
    matches: comparison.matches,
    finalIntegrity: decoded.bundle.currentSnapshot.integrity,
  });
}
