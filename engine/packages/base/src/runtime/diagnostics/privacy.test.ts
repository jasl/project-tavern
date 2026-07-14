// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { RuntimeOperationFaultV1 } from "../../contracts/diagnostics.js";
import type { IsoUtcInstant } from "../../contracts/host.js";
import {
  runtimeDiagnosticTextLimitsV1,
  scrubDiagnosticTextV1,
  scrubRuntimeOperationFaultV1,
} from "./privacy.js";

const occurredAt = "2026-07-14T01:02:03.000Z" as IsoUtcInstant;

function runtimeFault(overrides: Partial<RuntimeOperationFaultV1> = {}): RuntimeOperationFaultV1 {
  return {
    occurredAt,
    operation: "runtime.observer_notification_failed",
    message: "observer failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
    ...overrides,
  } as RuntimeOperationFaultV1;
}

describe("diagnostic privacy", () => {
  it("removes POSIX, Windows, UNC, and file URL paths before export", () => {
    const scrubbed = scrubRuntimeOperationFaultV1(
      runtimeFault({
        operation: "/Users/alice/project/src/save.ts",
        message: "failed at C:\\Users\\alice\\save.ts and \\\\server\\share\\private\\save.json",
        stack: "at save (file:///home/alice/project/src/save.ts:42:7)",
        cause: {
          name: "Error",
          message: "read /var/folders/private/runtime.json",
        },
      }),
    );

    expect(JSON.stringify(scrubbed)).not.toMatch(
      /Users[\\/]alice|home[\\/]alice|var[\\/]folders|server[\\/]share/u,
    );
    expect(scrubbed.operation).toBe("<redacted-path>");
    expect(scrubbed.message).toContain("<redacted-path>");
    expect(scrubbed.stack).toContain("<redacted-path>");
    expect(scrubbed.cause?.message).toContain("<redacted-path>");
  });

  it("removes wrapped paths and paths whose local segments contain spaces", () => {
    const source = [
      "read `/Users/alice/private.ts`",
      "read </Users/alice/angle path/private.ts>",
      'read "/Users/Alice Smith/private.ts"',
      "read /Users/Alice Smith/unwrapped/private.ts",
      "路径：/Users/alice/chinese-boundary.ts",
      "read “/Users/alice/curly-quote.ts”",
      "source-/Users/alice/dash-boundary.ts",
    ].join("; ");
    const scrubbed = scrubDiagnosticTextV1(source, 4_096);

    expect(scrubbed).not.toMatch(/Users|Alice Smith|private\.ts/u);
    expect(scrubbed.match(/<redacted-path>/gu)).toHaveLength(7);
  });

  it("applies reviewed UTF-8 byte limits without splitting Unicode", () => {
    expect(scrubDiagnosticTextV1("状态 😀 正常", 64)).toBe("状态 😀 正常");

    const message = `${"a".repeat(runtimeDiagnosticTextLimitsV1.message - 4)}😀tail`;
    const scrubbed = scrubDiagnosticTextV1(message, runtimeDiagnosticTextLimitsV1.message);

    expect(new TextEncoder().encode(scrubbed).byteLength).toBeLessThanOrEqual(
      runtimeDiagnosticTextLimitsV1.message,
    );
    expect(scrubbed).toMatch(/…$/u);
    expect(scrubbed).not.toContain("\ud83d");
    expect(scrubbed).not.toContain("\ude00");

    const fault = scrubRuntimeOperationFaultV1(
      runtimeFault({
        operation: "o".repeat(runtimeDiagnosticTextLimitsV1.operation + 1),
        message: "m".repeat(runtimeDiagnosticTextLimitsV1.message + 1),
        stack: "s".repeat(runtimeDiagnosticTextLimitsV1.stack + 1),
        cause: {
          name: "n".repeat(runtimeDiagnosticTextLimitsV1.cause + 1),
          message: "c".repeat(runtimeDiagnosticTextLimitsV1.cause + 1),
        },
      }),
    );
    expect(new TextEncoder().encode(fault.operation)).toHaveLength(
      runtimeDiagnosticTextLimitsV1.operation,
    );
    expect(new TextEncoder().encode(fault.message)).toHaveLength(
      runtimeDiagnosticTextLimitsV1.message,
    );
    expect(new TextEncoder().encode(fault.stack ?? "")).toHaveLength(
      runtimeDiagnosticTextLimitsV1.stack,
    );
    expect(new TextEncoder().encode(fault.cause?.name ?? "")).toHaveLength(
      runtimeDiagnosticTextLimitsV1.cause,
    );
    expect(new TextEncoder().encode(fault.cause?.message ?? "")).toHaveLength(
      runtimeDiagnosticTextLimitsV1.cause,
    );
  });

  it("returns a detached deeply frozen fault without changing semantic fields", () => {
    const original = runtimeFault({
      cause: { name: "TypeError", message: "bad input" },
    });
    const scrubbed = scrubRuntimeOperationFaultV1(original);

    expect(scrubbed).toEqual(original);
    expect(scrubbed).not.toBe(original);
    expect(scrubbed.cause).not.toBe(original.cause);
    expect(Object.isFrozen(scrubbed)).toBe(true);
    expect(Object.isFrozen(scrubbed.cause)).toBe(true);
  });

  it("rejects invalid limits instead of returning unsized text", () => {
    expect(() => scrubDiagnosticTextV1("text", 0)).toThrow();
    expect(() => scrubDiagnosticTextV1("text", Number.NaN)).toThrow();
  });
});
