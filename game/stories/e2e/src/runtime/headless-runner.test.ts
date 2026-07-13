// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eSemanticInvocationV1 } from "./e2e-semantic-game-port.js";
import { runE2eHeadlessSequenceV1 } from "./headless-runner.js";

const terminalSequenceV1 = Object.freeze([
  Object.freeze({ actionId: "action.e2e.start", parameters: Object.freeze({}) }),
  Object.freeze({
    actionId: "action.e2e.choose",
    parameters: Object.freeze({ choice: "right" as const }),
  }),
  Object.freeze({ actionId: "action.e2e.continue", parameters: Object.freeze({}) }),
  Object.freeze({ actionId: "action.e2e.complete", parameters: Object.freeze({}) }),
] satisfies readonly E2eSemanticInvocationV1[]);

function createPortV1() {
  return createE2eGameRuntimeV1({
    resolved: resolveStoryForTestV1(e2eStoryEntryV1),
    host: createWebHostV1({
      seeds: [0x0002_3049],
      uuids: ["00000000-0000-4000-8000-000000000001"],
      now: () => "2026-07-12T00:00:00.000Z",
    }),
  }).semantic;
}

describe("E2E headless semantic runner", () => {
  it("runs a terminal flow through only Semantic invocations", async () => {
    const run = await runE2eHeadlessSequenceV1(createPortV1(), terminalSequenceV1);

    expect(run.results).toEqual([
      { kind: "committed" },
      { kind: "committed" },
      { kind: "committed" },
      { kind: "committed" },
    ]);
    expect(run.views).toHaveLength(terminalSequenceV1.length + 1);
    expect(run.views[0]).toMatchObject({
      counterLabel: "计数 0",
      flow: { status: "idle", nodeId: "intro" },
      terminal: false,
    });
    expect(run.views.at(-1)).toMatchObject({
      counterLabel: "计数 2",
      flow: { status: "resolved", nodeId: "done" },
      terminal: true,
    });
    expect(Object.isFrozen(run)).toBe(true);
    expect(Object.isFrozen(run.views)).toBe(true);
    expect(Object.isFrozen(run.results)).toBe(true);
  });

  it("is deterministic for the same seed and semantic action sequence", async () => {
    const first = await runE2eHeadlessSequenceV1(createPortV1(), terminalSequenceV1);
    const second = await runE2eHeadlessSequenceV1(createPortV1(), terminalSequenceV1);

    expect(second).toEqual(first);
  });

  it("records rejected results without sleeping or bypassing the port", async () => {
    const run = await runE2eHeadlessSequenceV1(createPortV1(), [
      { actionId: "action.e2e.continue", parameters: {} },
      { actionId: "action.e2e.increment", parameters: {} },
    ]);

    expect(run.results).toEqual([
      { kind: "rejected", reasons: [{ code: "flow.not_blocked" }] },
      { kind: "committed" },
    ]);
    expect(run.views.map((view) => view.counterLabel)).toEqual(["计数 0", "计数 0", "计数 1"]);
  });
});
