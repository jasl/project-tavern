// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { RuntimeOperationFaultV1 } from "../../contracts/diagnostics.js";
import type { IsoUtcInstant } from "../../contracts/host.js";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
  normalizeRuntimeFailureV1,
} from "./runtime-failures.js";

const occurredAt = "2026-07-14T01:02:03.000Z" as IsoUtcInstant;

function runtimeFault(ordinal: number): RuntimeOperationFaultV1 {
  return {
    occurredAt,
    operation: `runtime.fixture.${ordinal}`,
    message: `failure ${ordinal}`,
    category: "runtime",
    code: "runtime.async_operation_failed",
  };
}

describe("RuntimeFailure buffer", () => {
  it("retains at most 50 recent failures in append order", () => {
    const failures = createRuntimeFailureBufferV1();
    for (let ordinal = 1; ordinal <= 52; ordinal += 1) {
      failures.append(runtimeFault(ordinal));
    }

    expect(failures.entries()).toHaveLength(50);
    expect(failures.entries()[0]?.operation).toBe("runtime.fixture.3");
    expect(failures.entries().at(-1)?.operation).toBe("runtime.fixture.52");
  });

  it("publishes frozen defensive snapshots and scrubs before retaining", () => {
    const failures = createRuntimeFailureBufferV1({ limit: 2 });
    const first = failures.entries();
    failures.append({
      ...runtimeFault(1),
      message: "failed at /Users/alice/project/private.ts",
    });
    const second = failures.entries();

    expect(first).toEqual([]);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(second[0]?.message).toBe("failed at <redacted-path>");
    expect(Object.isFrozen(second[0])).toBe(true);

    failures.append(runtimeFault(2));
    expect(second).toHaveLength(1);
    expect(failures.entries()).toHaveLength(2);
  });

  it("normalizes Error causes and non-Error values into bounded faults", () => {
    const normalized = normalizeRuntimeFailureV1({
      occurredAt,
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
      error: new TypeError("read /Users/alice/private.ts", {
        cause: new Error("from C:\\Users\\alice\\source.ts"),
      }),
    });
    const unknown = normalizeRuntimeFailureV1({
      occurredAt,
      operation: "runtime.async.fixture",
      category: "runtime",
      code: "runtime.async_operation_failed",
      error: 17,
    });

    expect(normalized).toMatchObject({
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
      message: "read <redacted-path>",
      cause: { name: "Error", message: "from <redacted-path>" },
    });
    expect(normalized.stack).not.toContain("/Users/alice");
    expect(unknown.message).toBe("17");
  });

  it("isolates clock, normalization, and append failures in observer reporters", () => {
    const append = vi.fn(() => {
      throw new Error("append failed");
    });
    const reporterWithThrowingAppend = createRuntimeFailureReporterV1({
      failures: { append },
      now: () => occurredAt,
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });
    expect(() => reporterWithThrowingAppend(new Error("listener failed"))).not.toThrow();
    expect(append).toHaveBeenCalledTimes(1);

    const reporterWithThrowingClock = createRuntimeFailureReporterV1({
      failures: { append },
      now: () => {
        throw new Error("clock failed");
      },
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });
    expect(() => reporterWithThrowingClock(new Error("listener failed"))).not.toThrow();
    expect(append).toHaveBeenCalledTimes(1);

    const reporterWithInvalidIdentity = createRuntimeFailureReporterV1({
      failures: { append },
      now: () => occurredAt,
      operation: "",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });
    expect(() => reporterWithInvalidIdentity(new Error("listener failed"))).not.toThrow();
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("records one scrubbed failure per reporter call", () => {
    const failures = createRuntimeFailureBufferV1();
    const reporter = createRuntimeFailureReporterV1({
      failures,
      now: () => occurredAt,
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });

    reporter(new Error("listener at /Users/alice/project/subscriber.ts"));
    expect(failures.entries()).toHaveLength(1);
    expect(failures.entries()[0]).toMatchObject({
      operation: "runtime.observer_notification_failed",
      message: "listener at <redacted-path>",
    });
  });

  it("rejects buffer limits outside the reviewed maximum", () => {
    expect(() => createRuntimeFailureBufferV1({ limit: 0 })).toThrow();
    expect(() => createRuntimeFailureBufferV1({ limit: 51 })).toThrow();
  });
});
