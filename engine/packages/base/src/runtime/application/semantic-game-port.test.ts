// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type {
  SemanticGamePortInputV1,
  SemanticGamePortSourceV1,
} from "../../contracts/application.js";
import type { DeepReadonly } from "../../contracts/values.js";
import { createSemanticGamePortV1 } from "./semantic-game-port.js";

interface State {
  readonly value: number;
}

interface Queries {
  readonly value: number;
  readonly witness: object;
}

interface GameView {
  readonly value: number;
  readonly queryWitness: object;
}

interface NarrativeView {
  readonly active: boolean;
  readonly queryWitness: object;
  readonly details: {
    readonly source: "queries";
  };
}

interface ActionDescriptor {
  readonly actionId: "increment";
  readonly queryWitness: object;
}

interface Invocation {
  readonly minimum: number;
}

type Preview =
  { readonly kind: "allowed" } | { readonly kind: "rejected"; readonly current: number };

type Result = { readonly kind: "committed" };
type Status = "busy" | "ready";

interface SourceFixture {
  readonly source: SemanticGamePortSourceV1<State, Status>;
  readonly failures: unknown[];
  replaceState(value: number, status?: Status): void;
  publishStatus(status: Status): void;
  blockQueueReads(): void;
  releaseQueueReads(): void;
}

function createSourceFixture(options?: { readonly reporterThrows?: boolean }): SourceFixture {
  let state: DeepReadonly<State> = Object.freeze({ value: 0 });
  let token = Object.freeze({});
  let status: Status = "ready";
  let queueBarrier: Promise<void> = Promise.resolve();
  let releaseQueueBarrier: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const failures: unknown[] = [];

  const publish = (): void => {
    for (const listener of [...listeners]) listener();
  };

  return {
    failures,
    source: Object.freeze({
      getCurrentState: () => state,
      getAuthoritativeRevisionToken: () => token,
      getStatus: () => status,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      reportSubscriberFailure(error: unknown) {
        failures.push(error);
        if (options?.reporterThrows === true) throw new Error("failure reporter threw");
      },
      async readStateAtQueueFront<TResult>(
        reader: (current: DeepReadonly<State>) => TResult,
      ): Promise<TResult> {
        await queueBarrier;
        return reader(state);
      },
    }),
    replaceState(value: number, nextStatus: Status = status) {
      state = Object.freeze({ value });
      token = Object.freeze({});
      status = nextStatus;
      publish();
    },
    publishStatus(nextStatus: Status) {
      status = nextStatus;
      publish();
    },
    blockQueueReads() {
      queueBarrier = new Promise<void>((resolve) => {
        releaseQueueBarrier = resolve;
      });
    },
    releaseQueueReads() {
      releaseQueueBarrier?.();
      releaseQueueBarrier = undefined;
    },
  };
}

function createFixture(options?: {
  readonly source?: SourceFixture;
  readonly projectNarrativeView?: SemanticGamePortInputV1<
    State,
    Status,
    Queries,
    GameView,
    NarrativeView,
    ActionDescriptor,
    Invocation,
    Preview,
    Result
  >["projectNarrativeView"];
  readonly preview?: SemanticGamePortInputV1<
    State,
    Status,
    Queries,
    GameView,
    NarrativeView,
    ActionDescriptor,
    Invocation,
    Preview,
    Result
  >["preview"];
}) {
  const sourceFixture = options?.source ?? createSourceFixture();
  let createQueriesCalls = 0;
  const dispatch = vi.fn(async (): Promise<Result> => Object.freeze({ kind: "committed" }));
  const port = createSemanticGamePortV1({
    source: sourceFixture.source,
    createQueries(state) {
      createQueriesCalls += 1;
      return Object.freeze({ value: state.value, witness: Object.freeze({}) });
    },
    projectGameView: (queries) =>
      Object.freeze({ value: queries.value, queryWitness: queries.witness }),
    projectNarrativeView:
      options?.projectNarrativeView ??
      ((queries) => ({
        active: queries.value > 0,
        queryWitness: queries.witness,
        details: { source: "queries" as const },
      })),
    actions: (queries) =>
      Object.freeze([
        Object.freeze({ actionId: "increment" as const, queryWitness: queries.witness }),
      ]),
    preview:
      options?.preview ??
      ((queries, invocation) =>
        queries.value >= invocation.minimum
          ? Object.freeze({ kind: "allowed" as const })
          : Object.freeze({ kind: "rejected" as const, current: queries.value })),
    dispatch,
  });
  return {
    port,
    sourceFixture,
    dispatch,
    createQueriesCalls: () => createQueriesCalls,
  };
}

describe("createSemanticGamePortV1", () => {
  it("publishes game, narrative, and actions atomically from one Queries instance", () => {
    const fixture = createFixture();
    const first = fixture.port.observe();

    expect(first).toEqual({
      revision: 0,
      status: "ready",
      game: { value: 0, queryWitness: expect.any(Object) },
      narrative: {
        active: false,
        queryWitness: expect.any(Object),
        details: { source: "queries" },
      },
      actions: [{ actionId: "increment", queryWitness: expect.any(Object) }],
    });
    expect(first.game.queryWitness).toBe(first.narrative.queryWitness);
    expect(first.game.queryWitness).toBe(first.actions[0]?.queryWitness);
    expect(fixture.port.availableActions()).toBe(first.actions);
    expect(fixture.createQueriesCalls()).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.narrative)).toBe(true);
    expect(Object.isFrozen(first.narrative.details)).toBe(true);

    fixture.sourceFixture.publishStatus("busy");
    const statusOnly = fixture.port.observe();
    expect(statusOnly.revision).toBe(first.revision);
    expect(statusOnly.game).toBe(first.game);
    expect(statusOnly.narrative).toBe(first.narrative);
    expect(statusOnly.actions).toBe(first.actions);
    expect(fixture.createQueriesCalls()).toBe(1);

    fixture.sourceFixture.replaceState(1, "busy");
    const replaced = fixture.port.observe();
    expect(replaced.revision).toBe(1);
    expect(replaced.game).not.toBe(first.game);
    expect(replaced.narrative).not.toBe(first.narrative);
    expect(replaced.actions).not.toBe(first.actions);
    expect(replaced.game.queryWitness).toBe(replaced.narrative.queryWitness);
    expect(replaced.game.queryWitness).toBe(replaced.actions[0]?.queryWitness);
    expect(fixture.createQueriesCalls()).toBe(2);
  });

  it("rebuilds preview Queries from the state at its queue-front position", async () => {
    const fixture = createFixture();
    fixture.sourceFixture.blockQueueReads();
    const preview = fixture.port.preview({ minimum: 1 });

    fixture.sourceFixture.replaceState(1);
    fixture.sourceFixture.releaseQueueReads();

    await expect(preview).resolves.toEqual({ kind: "allowed" });
    expect(fixture.createQueriesCalls()).toBe(3);
  });

  it("delegates dispatch without exposing its source", async () => {
    const fixture = createFixture();
    const invocation = Object.freeze({ minimum: 1 });

    await expect(fixture.port.dispatch(invocation)).resolves.toEqual({ kind: "committed" });
    expect(fixture.dispatch).toHaveBeenCalledWith(invocation);
    expect(fixture.port).not.toHaveProperty("source");
  });

  it("isolates throwing subscribers and the failure reporter", () => {
    const sourceFixture = createSourceFixture({ reporterThrows: true });
    const fixture = createFixture({ source: sourceFixture });
    const subscriberError = new Error("semantic subscriber failed");
    const second = vi.fn();
    fixture.port.subscribe(() => {
      throw subscriberError;
    });
    fixture.port.subscribe(second);

    expect(() => sourceFixture.replaceState(1)).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
    expect(sourceFixture.failures).toEqual([subscriberError]);
    expect(fixture.port.observe()).toMatchObject({ revision: 1, status: "ready" });
  });

  it("waits for a later non-busy revision and tears down the resolved waiter", async () => {
    const fixture = createFixture();
    const first = fixture.port.observe();
    const awaited = fixture.port.waitForIdle(first.revision);

    fixture.sourceFixture.publishStatus("busy");
    fixture.sourceFixture.replaceState(1, "busy");
    fixture.sourceFixture.publishStatus("ready");

    await expect(awaited).resolves.toBe(fixture.port.observe());
    await expect(fixture.port.waitForIdle()).resolves.toBe(fixture.port.observe());
  });

  it("bounds pending idle waiters and releases their capacity after resolution", async () => {
    const fixture = createFixture();
    const revision = fixture.port.observe().revision;
    const pending = Array.from({ length: 256 }, () => fixture.port.waitForIdle(revision));

    await expect(fixture.port.waitForIdle(revision)).rejects.toThrow(
      "Semantic idle waiter limit exceeded",
    );
    fixture.sourceFixture.replaceState(1);
    await Promise.all(pending);

    const nextRevision = fixture.port.observe().revision;
    const afterTeardown = fixture.port.waitForIdle(nextRevision);
    fixture.sourceFixture.replaceState(2);
    await expect(afterTeardown).resolves.toBe(fixture.port.observe());
  });

  it("rejects a Narrative projector then accessor without replacing the publication", () => {
    let projectionCalls = 0;
    let getterCalls = 0;
    const accessor = {};
    Reflect.defineProperty(accessor, ["th", "en"].join(""), {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    const fixture = createFixture({
      projectNarrativeView(queries) {
        projectionCalls += 1;
        if (projectionCalls > 1) return accessor as NarrativeView;
        return {
          active: false,
          queryWitness: queries.witness,
          details: { source: "queries" },
        };
      },
    });
    const before = fixture.port.observe();

    expect(() => fixture.sourceFixture.replaceState(1)).toThrow(
      "Semantic projectNarrativeView returned thenable",
    );
    expect(getterCalls).toBe(0);
    expect(fixture.port.observe()).toBe(before);
  });

  it("rejects a thenable returned from the synchronous preview callback", async () => {
    const thenable = {};
    Reflect.defineProperty(thenable, ["th", "en"].join(""), {
      value(resolve: (value: Preview) => void) {
        resolve(Object.freeze({ kind: "allowed" }));
      },
    });
    const fixture = createFixture({
      preview: (() => thenable as Preview) satisfies SemanticGamePortInputV1<
        State,
        Status,
        Queries,
        GameView,
        NarrativeView,
        ActionDescriptor,
        Invocation,
        Preview,
        Result
      >["preview"],
    });

    await expect(fixture.port.preview({ minimum: 0 })).rejects.toThrow(
      "Semantic preview returned thenable",
    );
  });

  it("rejects a preview then accessor without invoking its getter", async () => {
    let getterCalls = 0;
    const accessor = {};
    Reflect.defineProperty(accessor, ["th", "en"].join(""), {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    const fixture = createFixture({
      preview: (() => accessor as Preview) satisfies SemanticGamePortInputV1<
        State,
        Status,
        Queries,
        GameView,
        NarrativeView,
        ActionDescriptor,
        Invocation,
        Preview,
        Result
      >["preview"],
    });

    await expect(fixture.port.preview({ minimum: 0 })).rejects.toThrow(
      "Semantic preview returned thenable",
    );
    expect(getterCalls).toBe(0);
  });
});
