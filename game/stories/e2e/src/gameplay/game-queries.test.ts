// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";

import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";

import { e2eGameStateSchemaV1 } from "./contracts/index.js";
import type { E2eGameStateV1 } from "./contracts/index.js";
import { canCompleteE2eRunV1, createE2eGameQueriesV1 } from "./game-queries.js";

function state(input?: {
  readonly counter?: number;
  readonly flow?: {
    readonly status: "idle" | "choosing" | "blocked" | "resolved";
    readonly branch: "left" | "right" | null;
    readonly nodeId: "intro" | "choice" | "left" | "right" | "rejoin" | "done";
  };
  readonly run?: "active" | "complete";
}) {
  return e2eGameStateSchemaV1.parse({
    simulation: {
      counter: { value: input?.counter ?? 0 },
      flow: input?.flow ?? { status: "idle", branch: null, nodeId: "intro" },
      run: { status: input?.run ?? "active" },
    },
  });
}

const terminalThresholdV1 = parsePositiveSafeInteger(2);

describe("E2E GameQueries", () => {
  it("creates one exact frozen projection from Gameplay State only", () => {
    const gameState = state();
    const queries = createE2eGameQueriesV1(gameState, terminalThresholdV1);

    expect(queries).toEqual({
      counterValue: 0,
      parity: "even",
      flowStatus: "idle",
      visibleNodeId: "intro",
      runStatus: "active",
      canStart: true,
      canComplete: false,
    });
    expect(Object.isFrozen(queries)).toBe(true);
    expect(queries).not.toHaveProperty("state");
    expect(queries).not.toHaveProperty("snapshot");
    expect(queries).not.toHaveProperty("rng");
    expect(queries).not.toHaveProperty("commandSequence");
    expectTypeOf<Parameters<typeof createE2eGameQueriesV1>[0]>().toEqualTypeOf<
      DeepReadonly<E2eGameStateV1>
    >();
  });

  it("derives parity without mutating the input State", () => {
    const gameState = state({ counter: 3 });
    const before = structuredClone(gameState);

    expect(createE2eGameQueriesV1(gameState, terminalThresholdV1).parity).toBe("odd");
    expect(gameState).toEqual(before);
  });

  it("exposes canStart only for the exact active idle/intro tuple", () => {
    expect(createE2eGameQueriesV1(state(), terminalThresholdV1).canStart).toBe(true);
    expect(
      createE2eGameQueriesV1(
        state({ flow: { status: "idle", branch: null, nodeId: "choice" } }),
        terminalThresholdV1,
      ).canStart,
    ).toBe(false);
    expect(createE2eGameQueriesV1(state({ run: "complete" }), terminalThresholdV1).canStart).toBe(
      false,
    );
  });

  it("shares the exact terminal formula with canComplete", () => {
    const terminal = state({
      counter: 2,
      flow: { status: "resolved", branch: "right", nodeId: "done" },
    });
    expect(canCompleteE2eRunV1(terminal, terminalThresholdV1)).toBe(true);
    expect(createE2eGameQueriesV1(terminal, terminalThresholdV1).canComplete).toBe(true);

    for (const nonTerminal of [
      state({
        counter: 1,
        flow: { status: "resolved", branch: "right", nodeId: "done" },
      }),
      state({
        counter: 2,
        flow: { status: "blocked", branch: "right", nodeId: "done" },
      }),
      state({
        counter: 2,
        flow: { status: "resolved", branch: "right", nodeId: "rejoin" },
      }),
      state({
        counter: 2,
        flow: { status: "resolved", branch: "right", nodeId: "done" },
        run: "complete",
      }),
    ]) {
      expect(canCompleteE2eRunV1(nonTerminal, terminalThresholdV1)).toBe(false);
      expect(createE2eGameQueriesV1(nonTerminal, terminalThresholdV1).canComplete).toBe(false);
    }
  });
});
