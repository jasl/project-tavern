// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "./digest.js";
import {
  debugBundleJsonLimitsV1,
  exportedDebugBundleSchemaV1,
  runtimeOperationFaultSchemaV1,
} from "./diagnostics.js";

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
    expect(() =>
      exportedDebugBundleSchemaV1.parse({ ...valid, summary: {} }),
    ).toThrow();
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
