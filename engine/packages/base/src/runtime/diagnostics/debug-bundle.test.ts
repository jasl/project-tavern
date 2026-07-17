// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { RuntimeCapabilitiesV1 } from "../../contracts/application.js";
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import {
  createDebugBundleEnvelopeSchemaV1,
  debugBundleJsonLimitsV1,
  runtimeOperationFaultSchemaV1,
} from "../../contracts/diagnostics.js";
import type {
  DebugBundleEnvelopeV1,
  RuntimeOperationFaultV1,
} from "../../contracts/diagnostics.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import { parseIsoUtcInstantV1 } from "../../contracts/persistence.js";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
} from "../../contracts/snapshot.js";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.js";
import type { Digest, NonNegativeSafeInteger, RuntimeSchemaV1 } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import {
  createGameDiagnosticsServiceV1,
  decodeDebugBundleV1,
  encodeDebugBundleV1,
} from "./debug-bundle.js";
import type { DebugBundleCodecContextV1 } from "./debug-bundle.js";

interface SyntheticStateV1 {
  readonly count: NonNegativeSafeInteger;
  readonly note: string;
}

interface SyntheticRngV1 {
  readonly cursor: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngV1>;
type SyntheticProvenanceV1 = { readonly id: string };
type SyntheticDiagnosticsV1 = { readonly codes: readonly string[] };
type SyntheticFailureV1 = { readonly message: string };
type SyntheticUiContextV1 = { readonly route: "play" };
type SyntheticBundleV1 = DebugBundleEnvelopeV1<
  SyntheticProvenanceV1,
  RuntimeCapabilitiesV1,
  readonly string[],
  SyntheticSnapshotV1,
  string,
  SyntheticDiagnosticsV1,
  RuntimeOperationFaultV1,
  SyntheticFailureV1,
  SyntheticUiContextV1
>;

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError("invalid object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(descriptors).some(
      (descriptor) => descriptor.get !== undefined || descriptor.set !== undefined,
    )
  ) {
    throw new TypeError("invalid object fields");
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ),
  );
}

function stringV1(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("invalid string");
  return value;
}

function stringArrayV1(value: unknown, maximum = 200): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) throw new TypeError("invalid string array");
  return Object.freeze(value.map(stringV1));
}

const stateSchemaV1: RuntimeSchemaV1<SyntheticStateV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["count", "note"]);
    if (typeof fields.note !== "string") throw new TypeError("invalid note");
    return Object.freeze({
      count: parseNonNegativeSafeInteger(fields.count),
      note: fields.note,
    });
  },
});

const rngSchemaV1: RuntimeSchemaV1<SyntheticRngV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["cursor"]);
    return Object.freeze({ cursor: parseNonNegativeSafeInteger(fields.cursor) });
  },
});

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(stateSchemaV1, rngSchemaV1);

const provenanceSchemaV1: RuntimeSchemaV1<SyntheticProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["id"]);
    return Object.freeze({ id: stringV1(fields.id) });
  },
});

const capabilitiesSchemaV1: RuntimeSchemaV1<RuntimeCapabilitiesV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["debugTools", "cheats", "automationBridge"]);
    if (
      typeof fields.debugTools !== "boolean" ||
      typeof fields.cheats !== "boolean" ||
      typeof fields.automationBridge !== "boolean"
    ) {
      throw new TypeError("invalid capabilities");
    }
    return Object.freeze({
      debugTools: fields.debugTools,
      cheats: fields.cheats,
      automationBridge: fields.automationBridge,
    });
  },
});

const stringArraySchemaV1: RuntimeSchemaV1<readonly string[]> = Object.freeze({
  parse: (value: unknown) => stringArrayV1(value, 16),
});

const stringSchemaV1: RuntimeSchemaV1<string> = Object.freeze({ parse: stringV1 });

const diagnosticsSchemaV1: RuntimeSchemaV1<SyntheticDiagnosticsV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["codes"]);
    return Object.freeze({ codes: stringArrayV1(fields.codes, 16) });
  },
});

const failureSchemaV1: RuntimeSchemaV1<SyntheticFailureV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["message"]);
    return Object.freeze({ message: stringV1(fields.message) });
  },
});

const uiContextSchemaV1: RuntimeSchemaV1<SyntheticUiContextV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["route"]);
    if (fields.route !== "play") throw new TypeError("invalid route");
    return Object.freeze({ route: "play" as const });
  },
});

const bundleSchemaV1 = createDebugBundleEnvelopeSchemaV1({
  provenanceSchema: provenanceSchemaV1,
  capabilitiesSchema: capabilitiesSchemaV1,
  simulationLineageSchema: stringArraySchemaV1,
  snapshotSchema: snapshotSchemaV1,
  commandLogEntrySchema: stringSchemaV1,
  diagnosticsSchema: diagnosticsSchemaV1,
  runtimeFailureSchema: runtimeOperationFaultSchemaV1,
  failureSchema: failureSchemaV1,
  uiContextSchema: uiContextSchemaV1,
});

const codecV1: DebugBundleCodecContextV1<SyntheticSnapshotV1, SyntheticBundleV1> = Object.freeze({
  bundleSchema: bundleSchemaV1,
  validateEnvelope(bundle: SyntheticBundleV1) {
    if (bundle.simulationLineage.some((entry: string) => entry === "lineage.invalid")) {
      throw new TypeError("invalid lineage");
    }
  },
});

function snapshotV1(count = 4, note = "ready"): SyntheticSnapshotV1 {
  return snapshotSchemaV1.parse({
    state: { count, note },
    rng: { cursor: 2 },
    commandSequence: 3,
    integrity: createPristineRunIntegrityV1(),
  });
}

function runtimeFailureV1(): RuntimeOperationFaultV1 {
  return runtimeOperationFaultSchemaV1.parse({
    occurredAt: "2026-07-14T00:00:00.000Z",
    operation: "/Users/alice/project/src/save.ts",
    message: "failed at C:\\Users\\alice\\save.ts",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });
}

function bundleV1(overrides: Partial<SyntheticBundleV1> = {}): SyntheticBundleV1 {
  const replayBase = overrides.replayBase ?? snapshotV1();
  const currentSnapshot = overrides.currentSnapshot ?? replayBase;
  return bundleSchemaV1.parse({
    formatRevision: 1,
    provenance: { id: "story.synthetic" },
    capabilities: { debugTools: true, cheats: false, automationBridge: false },
    simulationLineage: [],
    generatedAt: "2026-07-14T00:00:00.000Z",
    replayBase,
    replayBaseStateDigest:
      overrides.replayBaseStateDigest ?? digestCanonical("sillymaker:state:v1", replayBase),
    commandLog: [],
    currentSnapshot,
    currentStateDigest:
      overrides.currentStateDigest ?? digestCanonical("sillymaker:state:v1", currentSnapshot),
    diagnostics: { codes: [] },
    runtimeFailures: [],
    ...overrides,
  });
}

describe("Debug Bundle codec", () => {
  it("round-trips one strict bundle with capability state and RunIntegrity", () => {
    const bundle = bundleV1();
    const bytes = encodeDebugBundleV1(bundle, codecV1);

    expect(bytes).toEqual(canonicalJsonBytes(bundle));
    expect(decodeDebugBundleV1(bytes, codecV1)).toEqual({ kind: "decoded", bundle });
    const decoded = decodeDebugBundleV1(bytes, codecV1);
    if (decoded.kind !== "decoded") throw new TypeError("expected decoded Debug Bundle");
    expect(decoded.bundle.capabilities).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
    expect(decoded.bundle.currentSnapshot.integrity.mode).toBe("normal");
    expect(Object.isFrozen(decoded.bundle)).toBe(true);
    expect(Object.isFrozen(decoded.bundle.runtimeFailures)).toBe(true);
  });

  it("checks both Snapshot digests independently even with an empty CommandLog", () => {
    const valid = bundleV1();
    const wrong = digestBytes(new TextEncoder().encode("wrong"));

    expect(
      decodeDebugBundleV1(canonicalJsonBytes({ ...valid, replayBaseStateDigest: wrong }), codecV1),
    ).toEqual({ kind: "rejected", code: "digest.replay_base_state_mismatch" });
    expect(
      decodeDebugBundleV1(canonicalJsonBytes({ ...valid, currentStateDigest: wrong }), codecV1),
    ).toEqual({ kind: "rejected", code: "digest.current_state_mismatch" });
    expect(() => encodeDebugBundleV1({ ...valid, currentStateDigest: wrong }, codecV1)).toThrow(
      "current Snapshot digest mismatch",
    );
  });

  it("rejects unknown fields, overlong runtime-failure lists, and hostile raw input", () => {
    const valid = bundleV1();
    expect(
      decodeDebugBundleV1(canonicalJsonBytes({ ...valid, browserHistory: [] }), codecV1),
    ).toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
    expect(
      decodeDebugBundleV1(
        canonicalJsonBytes({ ...valid, runtimeFailures: Array(51).fill(runtimeFailureV1()) }),
        codecV1,
      ),
    ).toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
    expect(
      decodeDebugBundleV1(new Uint8Array(Number(debugBundleJsonLimitsV1.maxBytes) + 1), codecV1),
    ).toEqual({ kind: "rejected", code: "limit.bytes" });
  });

  it("does not encode a bundle that its 20 MiB decoder rejects", () => {
    const valid = bundleV1({ commandLog: Array(200).fill("x".repeat(110_000)) });
    expect(canonicalJsonBytes(valid).byteLength).toBeGreaterThan(
      Number(debugBundleJsonLimitsV1.maxBytes),
    );
    expect(() => encodeDebugBundleV1(valid, codecV1)).toThrow(
      "Debug Bundle violates Strict JSON constraints: limit.bytes",
    );
  });
});

describe("Game diagnostics service", () => {
  it("captures one queue-front bundle, scrubs paths, and exports exact bytes", async () => {
    const replayBase = snapshotV1(2);
    const currentSnapshot = snapshotV1(5);
    let insideQueueReader = false;
    let readAtQueueFrontCalls = 0;
    const readAtQueueFront = async <TResult>(
      reader: (snapshot: SyntheticSnapshotV1) => TResult,
    ): Promise<TResult> => {
      readAtQueueFrontCalls += 1;
      insideQueueReader = true;
      try {
        return reader(currentSnapshot);
      } finally {
        insideQueueReader = false;
      }
    };
    const assertInsideQueue = (): void => {
      expect(insideQueueReader).toBe(true);
    };
    const readUiContext = vi.fn(() => {
      assertInsideQueue();
      return { route: "play" };
    });
    const service = createGameDiagnosticsServiceV1({
      codec: codecV1,
      provenance: Object.freeze({ id: "story.synthetic" }),
      getCapabilities() {
        assertInsideQueue();
        return Object.freeze({ debugTools: true, cheats: false, automationBridge: false });
      },
      getSimulationLineage() {
        assertInsideQueue();
        return Object.freeze(["lineage.one"]);
      },
      readAtQueueFront,
      getReplayEvidence() {
        assertInsideQueue();
        return Object.freeze({
          replayBase,
          replayBaseStateDigest: digestCanonical("sillymaker:state:v1", replayBase),
          commandLog: Object.freeze(["command.one"]),
        });
      },
      getDiagnostics() {
        assertInsideQueue();
        return Object.freeze({ codes: Object.freeze(["runtime.synthetic"]) });
      },
      getRuntimeFailures() {
        assertInsideQueue();
        return Object.freeze([runtimeFailureV1()]);
      },
      getFailure() {
        assertInsideQueue();
        return undefined;
      },
      scrubFailure: (failure) => failure,
      uiContextSchema: uiContextSchemaV1,
      readUiContext,
      metadataClock: Object.freeze({
        now: () => parseIsoUtcInstantV1("2026-07-14T00:00:00.000Z"),
      }),
      exportFilename: "synthetic.debug-bundle.json",
    });

    expect(readUiContext).not.toHaveBeenCalled();
    const exported = await service.exportDebugBundle();
    expect(readAtQueueFrontCalls).toBe(1);
    expect(readUiContext).toHaveBeenCalledOnce();
    expect(Object.isFrozen(service)).toBe(true);
    expect(exported).toMatchObject({
      filename: "synthetic.debug-bundle.json",
      mediaType: "application/json",
      digest: digestBytes(exported.bytes),
    });
    const text = new TextDecoder().decode(exported.bytes);
    expect(text).not.toContain("/Users/alice");
    expect(text).not.toContain("C:\\Users\\alice");

    const decoded = decodeDebugBundleV1(exported.bytes, codecV1);
    expect(decoded).toMatchObject({
      kind: "decoded",
      bundle: {
        capabilities: { debugTools: true, cheats: false, automationBridge: false },
        simulationLineage: ["lineage.one"],
        commandLog: ["command.one"],
        currentSnapshot: { state: { count: 5 }, integrity: { mode: "normal" } },
        runtimeFailures: [
          {
            operation: "<redacted-path>",
            message: "failed at <redacted-path>",
          },
        ],
        uiContext: { route: "play" },
      },
    });
  });

  it("parses a fresh UI context immediately and never retains it across exports", async () => {
    const snapshot = snapshotV1();
    const stateDigest = digestCanonical("sillymaker:state:v1", snapshot);
    const events: string[] = [];
    let currentUiContext: { route: string } | undefined = { route: "play" };
    const providerSchema: RuntimeSchemaV1<SyntheticUiContextV1> = Object.freeze({
      parse(value: unknown) {
        events.push("parse-ui");
        return uiContextSchemaV1.parse(value);
      },
    });
    const readUiContext = vi.fn((): unknown => {
      events.push("read-ui");
      return currentUiContext;
    });
    const service = createGameDiagnosticsServiceV1({
      codec: codecV1,
      provenance: Object.freeze({ id: "story.synthetic" }),
      getCapabilities: () =>
        Object.freeze({ debugTools: false, cheats: false, automationBridge: false }),
      getSimulationLineage: () => Object.freeze([]),
      readAtQueueFront: async (reader) => {
        events.push("queue-front");
        return reader(snapshot);
      },
      getReplayEvidence: () =>
        Object.freeze({ replayBase: snapshot, replayBaseStateDigest: stateDigest, commandLog: [] }),
      getDiagnostics: () => Object.freeze({ codes: Object.freeze([]) }),
      getRuntimeFailures() {
        events.push("runtime-failures");
        if (currentUiContext !== undefined) currentUiContext.route = "mutated-after-parse";
        return Object.freeze([]);
      },
      getFailure: () => undefined,
      scrubFailure: (failure) => failure,
      uiContextSchema: providerSchema,
      readUiContext,
      metadataClock: Object.freeze({
        now: () => parseIsoUtcInstantV1("2026-07-14T00:00:00.000Z"),
      }),
      exportFilename: "synthetic.debug-bundle.json",
    });

    expect(readUiContext).not.toHaveBeenCalled();
    const first = decodeDebugBundleV1((await service.exportDebugBundle()).bytes, codecV1);
    expect(events.slice(0, 4)).toEqual(["queue-front", "read-ui", "parse-ui", "runtime-failures"]);
    expect(first).toMatchObject({ kind: "decoded", bundle: { uiContext: { route: "play" } } });

    currentUiContext = undefined;
    events.length = 0;
    const second = decodeDebugBundleV1((await service.exportDebugBundle()).bytes, codecV1);
    expect(events).toEqual(["queue-front", "read-ui", "runtime-failures"]);
    expect(second).toMatchObject({ kind: "decoded" });
    if (second.kind !== "decoded") throw new TypeError("expected decoded Debug Bundle");
    expect(second.bundle).not.toHaveProperty("uiContext");
    expect(readUiContext).toHaveBeenCalledTimes(2);
  });

  it("reads capability state at each export without changing either Snapshot digest", async () => {
    const snapshot = snapshotV1();
    let capabilities: RuntimeCapabilitiesV1 = Object.freeze({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    const stateDigest: Digest = digestCanonical("sillymaker:state:v1", snapshot);
    const service = createGameDiagnosticsServiceV1({
      codec: codecV1,
      provenance: Object.freeze({ id: "story.synthetic" }),
      getCapabilities: () => capabilities,
      getSimulationLineage: () => Object.freeze([]),
      readAtQueueFront: async (reader) => reader(snapshot),
      getReplayEvidence: () =>
        Object.freeze({ replayBase: snapshot, replayBaseStateDigest: stateDigest, commandLog: [] }),
      getDiagnostics: () => Object.freeze({ codes: Object.freeze([]) }),
      getRuntimeFailures: () => Object.freeze([]),
      getFailure: () => undefined,
      scrubFailure: (failure) => failure,
      metadataClock: Object.freeze({
        now: () => parseIsoUtcInstantV1("2026-07-14T00:00:00.000Z"),
      }),
      exportFilename: "synthetic.debug-bundle.json",
    });

    capabilities = Object.freeze({ debugTools: true, cheats: true, automationBridge: false });
    const result = decodeDebugBundleV1((await service.exportDebugBundle()).bytes, codecV1);
    expect(result).toMatchObject({
      kind: "decoded",
      bundle: {
        capabilities,
        replayBaseStateDigest: stateDigest,
        currentStateDigest: stateDigest,
      },
    });
    if (result.kind !== "decoded") throw new TypeError("expected decoded Debug Bundle");
    expect(result.bundle).not.toHaveProperty("uiContext");
  });

  it("normalizes unexpected export faults without leaking local paths", async () => {
    const snapshot = snapshotV1();
    const stateDigest = digestCanonical("sillymaker:state:v1", snapshot);
    const service = createGameDiagnosticsServiceV1({
      codec: codecV1,
      provenance: Object.freeze({ id: "story.synthetic" }),
      getCapabilities: () =>
        Object.freeze({ debugTools: false, cheats: false, automationBridge: false }),
      getSimulationLineage: () => Object.freeze([]),
      readAtQueueFront: async (reader) => reader(snapshot),
      getReplayEvidence: () =>
        Object.freeze({ replayBase: snapshot, replayBaseStateDigest: stateDigest, commandLog: [] }),
      getDiagnostics() {
        throw new Error("failed in /Users/alice/private/debug.ts");
      },
      getRuntimeFailures: () => Object.freeze([]),
      getFailure: () => undefined,
      scrubFailure: (failure) => failure,
      metadataClock: Object.freeze({
        now: () => parseIsoUtcInstantV1("2026-07-14T00:00:00.000Z"),
      }),
      exportFilename: "synthetic.debug-bundle.json",
    });

    await expect(service.exportDebugBundle()).rejects.toEqual(
      new TypeError("Debug Bundle export failed"),
    );
    await service.exportDebugBundle().catch((error: unknown) => {
      expect(String(error)).not.toContain("/Users/alice");
    });
  });
});
