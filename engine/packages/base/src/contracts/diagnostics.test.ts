// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "./digest.js";
import type { DebugBundleEnvelopeV1 } from "./diagnostics.js";
import {
  debugBundleJsonLimitsV1,
  exportedDebugBundleSchemaV1,
  runtimeOperationFaultSchemaV1,
} from "./diagnostics.js";
import { parseIsoUtcInstantV1 } from "./persistence.js";

describe("diagnostic contracts", () => {
  it("keeps Debug exports closed and binds the exact bytes", () => {
    const bytes = Uint8Array.of(2);
    const valid = {
      filename: "run.debug-bundle.json",
      mediaType: "application/json",
      digest: digestBytes(bytes),
      bytes,
    };
    expect(exportedDebugBundleSchemaV1.parse(valid)).toEqual(valid);
    expect(() => exportedDebugBundleSchemaV1.parse({ ...valid, summary: {} })).toThrow();
  });

  it("parses only exact runtime fault branches", () => {
    const valid = {
      occurredAt: "2026-07-12T01:02:03.000Z",
      operation: "save.quick",
      message: "failed",
      category: "persistence",
      code: "persistence.transaction_failed",
    };
    expect(runtimeOperationFaultSchemaV1.parse(valid)).toEqual(valid);
    expect(() => runtimeOperationFaultSchemaV1.parse({ ...valid, extra: true })).toThrow();
  });

  it("freezes capability state into every Debug Bundle envelope", () => {
    const bundle = {
      formatRevision: 1,
      provenance: "provenance",
      capabilities: {
        debugTools: true,
        cheats: false,
        automationBridge: false,
      },
      simulationLineage: [],
      generatedAt: parseIsoUtcInstantV1("2026-07-12T01:02:03.000Z"),
      replayBase: "base",
      replayBaseStateDigest: digestBytes(Uint8Array.of(1)),
      commandLog: [],
      currentSnapshot: "current",
      currentStateDigest: digestBytes(Uint8Array.of(2)),
      diagnostics: "diagnostics",
      runtimeFailures: [],
    } satisfies DebugBundleEnvelopeV1<
      string,
      {
        readonly debugTools: boolean;
        readonly cheats: boolean;
        readonly automationBridge: boolean;
      },
      readonly never[],
      string,
      never,
      string,
      never,
      never,
      never
    >;

    expect(bundle.capabilities).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
  });

  it("rejects runtime fault text beyond the reviewed byte limits", () => {
    const common = {
      occurredAt: "2026-07-12T01:02:03.000Z",
      category: "runtime",
      code: "runtime.async_operation_failed",
    } as const;

    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "😀".repeat(1_025),
        message: "failed",
      }),
    ).toThrow();
    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "runtime.test",
        message: "x".repeat(65_537),
      }),
    ).toThrow();
    expect(() =>
      runtimeOperationFaultSchemaV1.parse({
        ...common,
        operation: "runtime.test",
        message: "failed",
        cause: { name: "x".repeat(4_097), message: "cause" },
      }),
    ).toThrow();
  });

  it("freezes the reviewed Debug Bundle limits", () => {
    expect(debugBundleJsonLimitsV1).toEqual({
      maxBytes: 20_971_520,
      maxDepth: 64,
      maxArrayItems: 10_000,
      maxObjectMembers: 10_000,
      maxNodes: 100_000,
      maxStringBytes: 262_144,
    });
  });
});
