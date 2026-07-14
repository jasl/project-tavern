// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { RuntimeCapabilitiesV1 } from "../../contracts/application.js";
import type { RuntimeSchemaV1 } from "../../contracts/values.js";
import { createDebugToolsPortV1 } from "./debug-tools.js";

type DebugCommandV1 = { readonly kind: "debug.synthetic.add"; readonly amount: number };
type DebugResultV1 =
  | { readonly kind: "validation_failed" }
  | { readonly kind: "committed"; readonly commandSequence: number };
type AnchorResultV1 = { readonly kind: "anchored"; readonly commandSequence: number };
type DebugInspectionV1 = { readonly kind: "inspected" };
type AuthoritativeReplayResultV1 = {
  readonly kind: "replayed";
  readonly authoritative: true;
};
type BestEffortReplayInspectionV1 = {
  readonly kind: "replayed";
  readonly authoritative: false;
};
type DiagnosticQueryV1 = { readonly kind: "summary" };
type DiagnosticQueryResultV1 = { readonly kind: "summary" };

const disabledCapabilitiesV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});

function createCapabilitySourceV1(initial = disabledCapabilitiesV1) {
  let current: RuntimeCapabilitiesV1 = initial;
  return Object.freeze({
    source: Object.freeze({
      getCurrent: () => current,
      subscribe: () => () => undefined,
    }),
    set(next: RuntimeCapabilitiesV1) {
      current = Object.freeze({ ...next });
    },
  });
}

const debugCommandSchemaV1: RuntimeSchemaV1<DebugCommandV1> = Object.freeze({
  parse(value: unknown) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Reflect.get(value, "kind") !== "debug.synthetic.add" ||
      typeof Reflect.get(value, "amount") !== "number"
    ) {
      throw new TypeError("invalid synthetic DebugCommand");
    }
    return Object.freeze({
      kind: "debug.synthetic.add" as const,
      amount: Reflect.get(value, "amount") as number,
    });
  },
});

function createFixtureV1() {
  const capabilities = createCapabilitySourceV1();
  const schemaFailure = Object.freeze({ kind: "validation_failed" as const });
  const calls: string[] = [];
  const listFixtures = vi.fn(async () => {
    calls.push("list");
    return Object.freeze(["fixture.synthetic"]);
  });
  const executeDebugCommand = vi.fn(
    async (command: DebugCommandV1, isStillEnabled: () => boolean) => {
      calls.push(`execute:${command.amount}`);
      return isStillEnabled()
        ? Object.freeze({ kind: "committed" as const, commandSequence: 1 })
        : Object.freeze({ kind: "capability_disabled" as const });
    },
  );
  const anchorFixture = vi.fn(async (_fixtureId: string, isStillEnabled: () => boolean) => {
    calls.push("anchor_fixture");
    return isStillEnabled()
      ? Object.freeze({ kind: "anchored" as const, commandSequence: 0 })
      : Object.freeze({ kind: "capability_disabled" as const });
  });
  const inspectDebugBundle = vi.fn(async (_bytes: Uint8Array) => {
    calls.push("inspect_bundle");
    return Object.freeze({ kind: "inspected" as const });
  });
  const anchorDebugBundle = vi.fn(async (_bytes: Uint8Array, isStillEnabled: () => boolean) => {
    calls.push("anchor_bundle");
    return isStillEnabled()
      ? Object.freeze({ kind: "anchored" as const, commandSequence: 0 })
      : Object.freeze({ kind: "capability_disabled" as const });
  });
  const replayAuthoritatively = vi.fn(async (_bytes: Uint8Array) => {
    calls.push("replay");
    return Object.freeze({ kind: "replayed" as const, authoritative: true });
  });
  const inspectReplayBestEffort = vi.fn(async (_bytes: Uint8Array) => {
    calls.push("inspect_replay");
    return Object.freeze({ kind: "replayed" as const, authoritative: false });
  });
  const queryDiagnostics = vi.fn(async (_query: { readonly kind: "summary" }) => {
    calls.push("query");
    return Object.freeze({ kind: "summary" as const });
  });
  const port = createDebugToolsPortV1<
    DebugCommandV1,
    DebugResultV1,
    string,
    AnchorResultV1,
    DebugInspectionV1,
    AuthoritativeReplayResultV1,
    BestEffortReplayInspectionV1,
    DiagnosticQueryV1,
    DiagnosticQueryResultV1
  >({
    capabilities: capabilities.source,
    debugCommandSchema: debugCommandSchemaV1,
    debugCommandSchemaFailure: () => schemaFailure,
    listFixtures,
    executeDebugCommand,
    anchorFixture,
    inspectDebugBundle,
    anchorDebugBundle,
    replayAuthoritatively,
    inspectReplayBestEffort,
    queryDiagnostics,
  });
  return Object.freeze({
    capabilities,
    port,
    calls,
    operations: Object.freeze({
      listFixtures,
      executeDebugCommand,
      anchorFixture,
      inspectDebugBundle,
      anchorDebugBundle,
      replayAuthoritatively,
      inspectReplayBestEffort,
      queryDiagnostics,
    }),
  });
}

describe("capability-gated DebugTools", () => {
  it("returns one stable denial before schema, tooling, bytes, query, or FIFO work", async () => {
    const fixture = createFixtureV1();
    const bytes = new Uint8Array([1, 2, 3]);
    const results = await Promise.all([
      fixture.port.listFixtures(),
      fixture.port.executeDebugCommand({ kind: "debug.synthetic.add", amount: 1 }),
      fixture.port.anchorFixture("fixture.synthetic"),
      fixture.port.inspectDebugBundle(bytes),
      fixture.port.anchorDebugBundle(bytes),
      fixture.port.replayAuthoritatively(bytes),
      fixture.port.inspectReplayBestEffort(bytes),
      fixture.port.queryDiagnostics({ kind: "summary" }),
    ]);

    expect(fixture.calls).toEqual([]);
    expect(results.every((result) => result === results[0])).toBe(true);
    expect(results[0]).toEqual({ kind: "capability_disabled" });
    expect(Object.isFrozen(results[0])).toBe(true);
  });

  it("separates read-only debug_tools authority from cheats mutation authority", async () => {
    const fixture = createFixtureV1();
    fixture.capabilities.set({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
    const bytes = new Uint8Array([1]);

    await expect(fixture.port.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: ["fixture.synthetic"],
    });
    await expect(fixture.port.inspectDebugBundle(bytes)).resolves.toEqual({ kind: "inspected" });
    await expect(fixture.port.replayAuthoritatively(bytes)).resolves.toEqual({
      kind: "replayed",
      authoritative: true,
    });
    await expect(fixture.port.inspectReplayBestEffort(bytes)).resolves.toEqual({
      kind: "replayed",
      authoritative: false,
    });
    await expect(fixture.port.queryDiagnostics({ kind: "summary" })).resolves.toEqual({
      kind: "summary",
    });
    await expect(
      fixture.port.executeDebugCommand({ kind: "debug.synthetic.add", amount: 1 }),
    ).resolves.toEqual({ kind: "capability_disabled" });
    await expect(fixture.port.anchorFixture("fixture.synthetic")).resolves.toEqual({
      kind: "capability_disabled",
    });
    await expect(fixture.port.anchorDebugBundle(bytes)).resolves.toEqual({
      kind: "capability_disabled",
    });
    expect(fixture.operations.executeDebugCommand).not.toHaveBeenCalled();
    expect(fixture.operations.anchorFixture).not.toHaveBeenCalled();
    expect(fixture.operations.anchorDebugBundle).not.toHaveBeenCalled();
  });

  it("strictly parses before enqueue and supplies a live queue-front recheck", async () => {
    const fixture = createFixtureV1();
    fixture.capabilities.set({ debugTools: true, cheats: true, automationBridge: false });

    await expect(
      fixture.port.executeDebugCommand({
        kind: "debug.synthetic.add",
        amount: 2,
        ignored: true,
      } as DebugCommandV1),
    ).resolves.toEqual({ kind: "committed", commandSequence: 1 });
    expect(fixture.operations.executeDebugCommand).toHaveBeenCalledWith(
      Object.freeze({ kind: "debug.synthetic.add", amount: 2 }),
      expect.any(Function),
    );

    await expect(fixture.port.executeDebugCommand({ kind: "invalid" } as never)).resolves.toEqual({
      kind: "validation_failed",
    });
    expect(fixture.operations.executeDebugCommand).toHaveBeenCalledOnce();

    const recheck = fixture.operations.executeDebugCommand.mock.calls[0]?.[1];
    expect(recheck?.()).toBe(true);
    fixture.capabilities.set({ debugTools: true, cheats: false, automationBridge: false });
    expect(recheck?.()).toBe(false);
  });

  it("fails closed when a capability is revoked during async read or queue wait", async () => {
    const fixture = createFixtureV1();
    fixture.capabilities.set({ debugTools: true, cheats: true, automationBridge: false });
    fixture.operations.listFixtures.mockImplementationOnce(async () => {
      fixture.capabilities.set({ debugTools: false, cheats: true, automationBridge: false });
      return Object.freeze(["fixture.synthetic"]);
    });
    await expect(fixture.port.listFixtures()).resolves.toEqual({
      kind: "capability_disabled",
    });

    fixture.capabilities.set({ debugTools: true, cheats: true, automationBridge: false });
    fixture.operations.executeDebugCommand.mockImplementationOnce(
      async (_command, isStillEnabled) => {
        fixture.capabilities.set({ debugTools: true, cheats: false, automationBridge: false });
        return isStillEnabled()
          ? Object.freeze({ kind: "committed" as const, commandSequence: 1 })
          : Object.freeze({ kind: "capability_disabled" as const });
      },
    );
    await expect(
      fixture.port.executeDebugCommand({ kind: "debug.synthetic.add", amount: 3 }),
    ).resolves.toEqual({ kind: "capability_disabled" });
  });

  it("copies fixture IDs and untrusted bytes before exposing operation results", async () => {
    const fixture = createFixtureV1();
    fixture.capabilities.set({ debugTools: true, cheats: false, automationBridge: false });
    const fixtureIds = ["fixture.synthetic"];
    fixture.operations.listFixtures.mockResolvedValueOnce(fixtureIds);
    const listed = await fixture.port.listFixtures();
    fixtureIds.push("fixture.injected");
    expect(listed).toEqual({ kind: "listed", fixtureIds: ["fixture.synthetic"] });
    if (listed.kind === "listed") {
      expect(Object.isFrozen(listed)).toBe(true);
      expect(Object.isFrozen(listed.fixtureIds)).toBe(true);
    }

    const bytes = new Uint8Array([7]);
    await fixture.port.inspectDebugBundle(bytes);
    const received = fixture.operations.inspectDebugBundle.mock.calls.at(-1)?.[0];
    expect(received).not.toBe(bytes);
    bytes[0] = 9;
    expect(received?.[0]).toBe(7);
  });
});
