// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import type { E2eDebugCommandV1 } from "../gameplay/contracts/index.js";
import { e2eDebugCommandFormAdapterV1 } from "./debug-command-form-adapter.js";

const commandsV1 = Object.freeze([
  Object.freeze({
    kind: "debug.e2e.counter.add" as const,
    amount: parsePositiveSafeInteger(5),
  }),
  Object.freeze({ kind: "debug.e2e.flow.set_blocked" as const, blocked: true }),
  Object.freeze({ kind: "debug.e2e.test.validation_failed" as const }),
  Object.freeze({ kind: "debug.e2e.test.fault" as const }),
] satisfies readonly E2eDebugCommandV1[]);

describe("E2E DebugCommand form adapter", () => {
  it("exposes exactly the four already-declared DebugCommand kinds", () => {
    expect(e2eDebugCommandFormAdapterV1.kinds).toEqual(commandsV1.map(({ kind }) => kind));
    expect(Object.isFrozen(e2eDebugCommandFormAdapterV1.kinds)).toBe(true);
    expect(Object.isFrozen(e2eDebugCommandFormAdapterV1)).toBe(true);
  });

  it.each(commandsV1)("copies the controlled $kind DTO without validation or execution", (dto) => {
    const command = e2eDebugCommandFormAdapterV1.toCommand(dto);

    expect(command).toEqual(dto);
    expect(command).not.toBe(dto);
    expect(Object.isFrozen(command)).toBe(true);
  });

  it("does not forward an arbitrary State path or widen an unknown command kind", () => {
    const withPath = Object.freeze({
      kind: "debug.e2e.counter.add" as const,
      amount: parsePositiveSafeInteger(2),
      path: "simulation.counter.value",
    });

    expect(e2eDebugCommandFormAdapterV1.toCommand(withPath)).toEqual({
      kind: "debug.e2e.counter.add",
      amount: 2,
    });
    expect(() =>
      e2eDebugCommandFormAdapterV1.toCommand({
        kind: "debug.e2e.state.set",
        path: "simulation.counter.value",
        value: 999,
      } as never),
    ).toThrow("unsupported E2E DebugCommand form kind");
  });
});
