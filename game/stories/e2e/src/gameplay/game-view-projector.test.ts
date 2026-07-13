// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";

import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";

import type { E2eGameQueriesV1 } from "./contracts/index.js";
import { projectE2eGameViewV1 } from "./game-view-projector.js";

function queries(overrides: Partial<E2eGameQueriesV1> = {}): E2eGameQueriesV1 {
  return Object.freeze({
    counterValue: parseNonNegativeSafeInteger(3),
    parity: "odd",
    flowStatus: "blocked",
    visibleNodeId: "rejoin",
    runStatus: "active",
    choiceDeltas: Object.freeze({
      left: parsePositiveSafeInteger(1),
      right: parsePositiveSafeInteger(2),
    }),
    canStart: false,
    canComplete: false,
    ...overrides,
  });
}

describe("E2E GameView projector", () => {
  it("projects an exact deeply frozen view from Queries only", () => {
    const input = queries();
    const view = projectE2eGameViewV1(input);

    expect(view).toEqual({
      counterLabel: "计数 3",
      flow: { status: "blocked", nodeId: "rejoin" },
      terminal: false,
    });
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.flow)).toBe(true);
    expect(view).not.toHaveProperty("queries");
    expect(view).not.toHaveProperty("state");
    expect(view).not.toHaveProperty("snapshot");
    expect(view).not.toHaveProperty("choiceDeltas");
    expect(JSON.stringify(view)).not.toContain("choiceDeltas");
    expectTypeOf<Parameters<typeof projectE2eGameViewV1>[0]>().toEqualTypeOf<E2eGameQueriesV1>();
  });

  it("uses committed Run status instead of recomputing terminal availability", () => {
    expect(projectE2eGameViewV1(queries({ canComplete: true })).terminal).toBe(false);
    expect(
      projectE2eGameViewV1(
        queries({
          runStatus: "complete",
          canComplete: false,
        }),
      ).terminal,
    ).toBe(true);
  });
});
