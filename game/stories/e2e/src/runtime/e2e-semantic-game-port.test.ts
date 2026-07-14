// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import {
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import { e2eGameStateSchemaV1 } from "../gameplay/contracts/index.js";
import type { E2eGameQueriesV1, E2eGameSimulationTypesV1 } from "../gameplay/contracts/index.js";
import { createE2eGameSimulationV1 } from "../gameplay/game-simulation.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import {
  createE2eSemanticActionCatalogV1,
  createE2eSemanticGamePortV1,
  parseE2eSemanticInvocationV1,
  previewE2eSemanticInvocationV1,
  projectE2eSemanticActionResultV1,
} from "./e2e-semantic-game-port.js";

function createRuntimeV1() {
  return createE2eGameRuntimeV1({
    resolved: resolveStoryForTestV1(e2eStoryEntryV1),
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049],
      uuids: ["00000000-0000-4000-8000-000000000001"],
      now: () => "2026-07-12T00:00:00.000Z",
    }),
  });
}

function createInspectableSemanticFixtureWithSimulationV1(
  gameSimulation: ReturnType<typeof createE2eGameSimulationV1>,
) {
  const host = createWebHostV1({
    records: createMemoryHostRecordStoreV1(),
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
    now: () => "2026-07-12T00:00:00.000Z",
  });
  const bootstrap = gameSimulation.createBootstrapInput(host.bootstrapEntropy);
  const reportRuntimeFailure = vi.fn();
  const created = createGameSessionV1<E2eGameSimulationTypesV1>({
    initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return gameSimulation.commandExecutor.executeAttempt(
        snapshot,
        { kind: "e2e.test.fault" },
        undefined,
      );
    },
    onObserverFailure: reportRuntimeFailure,
  });
  const port = createE2eSemanticGamePortV1({
    gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure: reportRuntimeFailure,
  });
  return Object.freeze({ ...created, port });
}

function createInspectableSemanticFixtureV1() {
  const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
  return createInspectableSemanticFixtureWithSimulationV1(resolved.gameSimulation);
}

function queriesV1(overrides: Partial<E2eGameQueriesV1> = {}): E2eGameQueriesV1 {
  return Object.freeze({
    counterValue: parseNonNegativeSafeInteger(0),
    parity: "even",
    flowStatus: "idle",
    visibleNodeId: "intro",
    runStatus: "active",
    choiceDeltas: Object.freeze({
      left: parsePositiveSafeInteger(1),
      right: parsePositiveSafeInteger(2),
    }),
    canStart: true,
    canComplete: false,
    ...overrides,
  }) satisfies E2eGameQueriesV1;
}

function collectObjectKeysRecursivelyV1(value: unknown): readonly string[] {
  const keys = new Set<string>();
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    for (const [key, nested] of Object.entries(current)) {
      keys.add(key);
      pending.push(nested);
    }
  }
  return [...keys].sort();
}

describe("E2E SemanticGamePort", () => {
  it("builds the authored player-visible catalog from one Queries value", () => {
    const actions = createE2eSemanticActionCatalogV1(queriesV1());

    expect(actions.map((action) => action.actionId)).toEqual([
      "action.e2e.start",
      "action.e2e.increment",
      "action.e2e.choose",
      "action.e2e.continue",
      "action.e2e.complete",
    ]);
    expect(
      actions.map(({ actionId, enabled, reasons }) => ({ actionId, enabled, reasons })),
    ).toEqual([
      { actionId: "action.e2e.start", enabled: true, reasons: [] },
      { actionId: "action.e2e.increment", enabled: true, reasons: [] },
      {
        actionId: "action.e2e.choose",
        enabled: false,
        reasons: [{ code: "flow.not_choosing" }],
      },
      {
        actionId: "action.e2e.continue",
        enabled: false,
        reasons: [{ code: "flow.not_blocked" }],
      },
      {
        actionId: "action.e2e.complete",
        enabled: false,
        reasons: [{ code: "run.not_terminal" }],
      },
    ]);
    expect(actions[2]?.options).toEqual([
      { actionId: "action.e2e.choose", parameters: { choice: "left" } },
      { actionId: "action.e2e.choose", parameters: { choice: "right" } },
    ]);
    expect(actions.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(actions)).toBe(true);
    expect(JSON.stringify(actions)).not.toMatch(/test\.reject|test\.fault|counter\.roll|debug/iu);
  });

  it("uses the same ordered guards for catalog and preview", () => {
    const choosing = queriesV1({
      flowStatus: "choosing",
      visibleNodeId: "choice",
      canStart: false,
    });
    const invocation = parseE2eSemanticInvocationV1({
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    });

    expect(
      createE2eSemanticActionCatalogV1(choosing).find(
        ({ actionId }) => actionId === invocation.actionId,
      ),
    ).toMatchObject({ enabled: true, reasons: [] });
    expect(previewE2eSemanticInvocationV1(choosing, invocation)).toEqual({ kind: "allowed" });

    const stale = queriesV1({
      flowStatus: "blocked",
      visibleNodeId: "rejoin",
      canStart: false,
    });
    expect(previewE2eSemanticInvocationV1(stale, invocation)).toEqual({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
  });

  it("applies run, flow, and option-specific Counter guards in that order", () => {
    const invocation = {
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    } as const;
    const saturatedChoosing = {
      counterValue: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
      parity: "odd" as const,
      flowStatus: "choosing" as const,
      visibleNodeId: "choice" as const,
      choiceDeltas: Object.freeze({
        left: parsePositiveSafeInteger(1),
        right: parsePositiveSafeInteger(2),
      }),
      canStart: false,
      canComplete: false,
    };

    expect(
      previewE2eSemanticInvocationV1(
        queriesV1({ ...saturatedChoosing, runStatus: "complete" }),
        invocation,
      ),
    ).toEqual({ kind: "rejected", reasons: [{ code: "game.run_complete" }] });
    expect(
      previewE2eSemanticInvocationV1(
        queriesV1({
          ...saturatedChoosing,
          runStatus: "active",
          flowStatus: "blocked",
          visibleNodeId: "rejoin",
        }),
        invocation,
      ),
    ).toEqual({ kind: "rejected", reasons: [{ code: "flow.not_choosing" }] });
    expect(
      previewE2eSemanticInvocationV1(
        queriesV1({ ...saturatedChoosing, runStatus: "active" }),
        invocation,
      ),
    ).toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
  });

  it("allows only the fitting default option and disables choose when neither fits", () => {
    const gameSimulation = resolveStoryForTestV1(e2eStoryEntryV1).gameSimulation;
    const choosingQueriesAtV1 = (counterValue: number) =>
      gameSimulation.createQueries(
        e2eGameStateSchemaV1.parse({
          simulation: {
            counter: { value: counterValue },
            flow: { status: "choosing", branch: null, nodeId: "choice" },
            run: { status: "active" },
          },
        }),
      );
    const oneBelowMaximum = choosingQueriesAtV1(Number.MAX_SAFE_INTEGER - 1);
    const left = {
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    } as const;
    const right = {
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    } as const;

    expect(
      createE2eSemanticActionCatalogV1(oneBelowMaximum).find(
        ({ actionId }) => actionId === "action.e2e.choose",
      ),
    ).toMatchObject({ enabled: true, reasons: [] });
    expect(previewE2eSemanticInvocationV1(oneBelowMaximum, left)).toEqual({ kind: "allowed" });
    expect(previewE2eSemanticInvocationV1(oneBelowMaximum, right)).toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });

    const maximum = choosingQueriesAtV1(Number.MAX_SAFE_INTEGER);
    expect(
      createE2eSemanticActionCatalogV1(maximum).find(
        ({ actionId }) => actionId === "action.e2e.choose",
      ),
    ).toMatchObject({
      enabled: false,
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    expect(previewE2eSemanticInvocationV1(maximum, left)).toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    expect(previewE2eSemanticInvocationV1(maximum, right)).toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
  });

  it("rejects increment preview at the exact Counter upper bound", () => {
    const saturated = queriesV1({
      counterValue: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
      parity: "odd",
    });
    const invocation = parseE2eSemanticInvocationV1({
      actionId: "action.e2e.increment",
      parameters: {},
    });

    expect(
      createE2eSemanticActionCatalogV1(saturated).find(
        ({ actionId }) => actionId === invocation.actionId,
      ),
    ).toMatchObject({
      enabled: false,
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    expect(previewE2eSemanticInvocationV1(saturated, invocation)).toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
  });

  it("keeps saturated increment preview and queue-front dispatch in parity", async () => {
    const fixture = createInspectableSemanticFixtureV1();
    await fixture.runtimeControl.enqueueAuthoritative(
      async (snapshot) =>
        Object.freeze({
          kind: "replace" as const,
          snapshot: Object.freeze({
            ...snapshot,
            state: e2eGameStateSchemaV1.parse({
              simulation: {
                counter: { value: Number.MAX_SAFE_INTEGER },
                flow: { status: "idle", branch: null, nodeId: "intro" },
                run: { status: "active" },
              },
            }),
          }),
          result: undefined,
          anchor: "replace_replay_base" as const,
        }),
      () => undefined,
    );
    const invocation = {
      actionId: "action.e2e.increment",
      parameters: {},
    } as const;

    await expect(fixture.port.preview(invocation)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    await expect(fixture.port.dispatch(invocation)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
  });

  it("uses the adopted choice resolver for option preview and queue-front dispatch", async () => {
    const gameSimulation = createE2eGameSimulationV1(
      Object.freeze({
        rules: Object.freeze({
          resolveChoiceDelta(choice: "left" | "right") {
            return parsePositiveSafeInteger(choice === "left" ? 2 : 1);
          },
        }),
        values: Object.freeze({ terminalThreshold: parsePositiveSafeInteger(2) }),
      }),
    );
    const fixture = createInspectableSemanticFixtureWithSimulationV1(gameSimulation);
    await fixture.runtimeControl.enqueueAuthoritative(
      async (snapshot) =>
        Object.freeze({
          kind: "replace" as const,
          snapshot: Object.freeze({
            ...snapshot,
            state: e2eGameStateSchemaV1.parse({
              simulation: {
                counter: { value: Number.MAX_SAFE_INTEGER - 1 },
                flow: { status: "choosing", branch: null, nodeId: "choice" },
                run: { status: "active" },
              },
            }),
          }),
          result: undefined,
          anchor: "replace_replay_base" as const,
        }),
      () => undefined,
    );
    const left = {
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    } as const;
    const right = {
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    } as const;

    expect(
      fixture.port.availableActions().find(({ actionId }) => actionId === "action.e2e.choose"),
    ).toMatchObject({ enabled: true, reasons: [] });
    await expect(fixture.port.preview(left)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    await expect(fixture.port.dispatch(left)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "counter.value_out_of_range" }],
    });
    await expect(fixture.port.preview(right)).resolves.toEqual({ kind: "allowed" });
    await expect(fixture.port.dispatch(right)).resolves.toEqual({ kind: "committed" });
    expect(fixture.session.getCurrentSnapshot().state.simulation).toEqual({
      counter: { value: Number.MAX_SAFE_INTEGER },
      flow: { status: "blocked", branch: "right", nodeId: "rejoin" },
      run: { status: "active" },
    });
  });

  it.each([
    { actionId: "action.e2e.increment", parameters: { extra: true } },
    { actionId: "action.e2e.choose", parameters: {} },
    { actionId: "action.e2e.choose", parameters: { choice: "left", extra: true } },
    { actionId: "action.e2e.choose", parameters: { choice: "middle" } },
    { actionId: "action.e2e.unknown", parameters: {} },
  ])("strictly rejects an invalid semantic invocation %#", (invocation) => {
    expect(() => parseE2eSemanticInvocationV1(invocation)).toThrow(/E2E Semantic invocation/iu);
  });

  it("exposes only one immutable player-visible publication and its action reference", async () => {
    const port = (await createRuntimeV1()).semantic;
    const publication = port.observe();

    expect(publication).toEqual({
      revision: 0,
      status: "ready",
      game: {
        counterLabel: "计数 0",
        flow: { status: "idle", nodeId: "intro" },
        terminal: false,
      },
      narrative: null,
      actions: expect.any(Array),
    });
    expect(port.availableActions()).toBe(publication.actions);
    expect(Object.isFrozen(publication)).toBe(true);
    expect(Object.isFrozen(publication.game)).toBe(true);
    expect(Object.isFrozen(publication.actions)).toBe(true);
    expect(publication).not.toHaveProperty("snapshot");
    expect(port).not.toHaveProperty("debugTools");
    expect(collectObjectKeysRecursivelyV1(publication)).not.toEqual(
      expect.arrayContaining([
        "snapshot",
        "state",
        "rng",
        "commandSequence",
        "facts",
        "fault",
        "attempt",
        "commandLog",
      ]),
    );
  });

  it("publishes status and authoritative revisions without a second view cache", async () => {
    const port = (await createRuntimeV1()).semantic;
    const initial = port.observe();
    const observed: ReturnType<typeof port.observe>[] = [];
    const unsubscribe = port.subscribe(() => observed.push(port.observe()));

    const idle = port.waitForIdle(initial.revision);
    await expect(
      port.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    const committed = await idle;
    unsubscribe();

    expect(committed).toMatchObject({
      revision: 1,
      status: "ready",
      game: { counterLabel: "计数 1" },
      narrative: null,
    });
    expect(port.observe()).toBe(committed);
    expect(port.availableActions()).toBe(committed.actions);
    const initialBusy = observed.find(
      (publication) => publication.revision === 0 && publication.status === "busy",
    );
    expect(initialBusy?.game).toBe(initial.game);
    expect(initialBusy?.narrative).toBe(initial.narrative);
    expect(initialBusy?.narrative).toBeNull();
    expect(initialBusy?.actions).toBe(initial.actions);
    expect(observed.at(-1)).toBe(committed);
  });

  it("rebuilds preview from its FIFO position and revalidates stale dispatch", async () => {
    const port = (await createRuntimeV1()).semantic;
    const start = port.dispatch({ actionId: "action.e2e.start", parameters: {} });
    const queuedPreview = port.preview({
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    });

    await expect(start).resolves.toEqual({ kind: "committed" });
    await expect(queuedPreview).resolves.toEqual({ kind: "allowed" });
    await expect(
      port.dispatch({
        actionId: "action.e2e.choose",
        parameters: { choice: "right" },
      }),
    ).resolves.toEqual({ kind: "committed" });

    const stale = {
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    } as const;
    await expect(port.preview(stale)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
    await expect(port.dispatch(stale)).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
  });

  it("isolates a throwing subscriber and still notifies later listeners", async () => {
    const port = (await createRuntimeV1()).semantic;
    const second = vi.fn();
    let throwOnce = true;
    port.subscribe(() => {
      if (throwOnce) {
        throwOnce = false;
        throw new Error("semantic listener failed");
      }
    });
    port.subscribe(second);

    await expect(
      port.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    expect(second).toHaveBeenCalled();
    expect(port.observe()).toMatchObject({ revision: 1, status: "ready" });
  });

  it("returns validation_failed for hostile runtime input without command passthrough", async () => {
    const port = (await createRuntimeV1()).semantic;
    await expect(
      port.dispatch({
        actionId: "action.e2e.increment",
        parameters: { extra: true },
      } as never),
    ).resolves.toEqual({ kind: "not_executed", code: "validation_failed" });
    expect(port.observe()).toMatchObject({ revision: 0, status: "ready" });
  });

  it("reaches the same final Snapshot digest as direct GameSession dispatch", async () => {
    const semantic = createInspectableSemanticFixtureV1();
    const direct = createInspectableSemanticFixtureV1();
    const semanticInvocations = [
      { actionId: "action.e2e.increment", parameters: {} },
      { actionId: "action.e2e.start", parameters: {} },
      { actionId: "action.e2e.choose", parameters: { choice: "left" } },
      { actionId: "action.e2e.continue", parameters: {} },
      { actionId: "action.e2e.complete", parameters: {} },
    ] as const;
    const directCommands = [
      { kind: "e2e.counter.increment" },
      { kind: "e2e.flow.start" },
      { kind: "e2e.flow.choose", choice: "left" },
      { kind: "e2e.flow.continue" },
      { kind: "e2e.run.complete" },
    ] as const;

    for (const invocation of semanticInvocations) {
      await expect(semantic.port.dispatch(invocation)).resolves.toEqual({ kind: "committed" });
    }
    for (const command of directCommands) {
      await expect(direct.session.dispatch(command)).resolves.toMatchObject({
        kind: "executed",
        execution: { kind: "committed" },
      });
    }
    expect(digestCanonical("sillymaker:state:v1", semantic.session.getCurrentSnapshot())).toBe(
      digestCanonical("sillymaker:state:v1", direct.session.getCurrentSnapshot()),
    );
  });

  it.each([
    [
      "committed",
      { kind: "executed", execution: { kind: "committed", snapshot: {}, facts: [] } },
      { kind: "committed" },
    ],
    [
      "rejected",
      {
        kind: "executed",
        execution: {
          kind: "rejected",
          snapshot: {},
          reasons: [{ code: "flow.not_choosing" }],
        },
      },
      { kind: "rejected", reasons: [{ code: "flow.not_choosing" }] },
    ],
    [
      "faulted",
      {
        kind: "executed",
        execution: {
          kind: "faulted",
          snapshot: {},
          fault: { code: "e2e.test.fault", internal: "do not expose" },
        },
      },
      { kind: "faulted", code: "gameplay_fault" },
    ],
    [
      "not_executed",
      { kind: "not_executed", code: "fault_paused" },
      { kind: "not_executed", code: "fault_paused" },
    ],
  ] as const)("projects a player-safe E2E %s result", (_source, raw, expected) => {
    const result = projectE2eSemanticActionResultV1(
      raw as never as Parameters<typeof projectE2eSemanticActionResultV1>[0],
    );
    expect(result).toEqual(expected);
    expect(collectObjectKeysRecursivelyV1(result)).not.toEqual(
      expect.arrayContaining([
        "snapshot",
        "state",
        "rng",
        "facts",
        "fault",
        "attempt",
        "commandLog",
        "internal",
      ]),
    );
  });
});
