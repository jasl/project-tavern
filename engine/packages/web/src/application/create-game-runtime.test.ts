// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  HostStoredRecordV1,
  RuntimeSchemaV1,
  RuntimeInvalidationControllerV1,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { describe, expect, it, vi } from "vitest";

import { createWebHostV1 } from "../host/create-web-host.js";
import { createGameRuntimeV1 } from "./create-game-runtime.js";

function deferredRecordV1() {
  let resolve!: (value: HostStoredRecordV1 | null) => void;
  const promise = new Promise<HostStoredRecordV1 | null>((settle) => {
    resolve = settle;
  });
  return Object.freeze({ promise, resolve });
}

function deferredValueV1<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return Object.freeze({ promise, resolve });
}

describe("generic Web game runtime", () => {
  it("forwards a paired UI-context schema and reader without invoking either", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000110"],
    });
    const uiContextSchema: RuntimeSchemaV1<{ readonly route: "play" }> = Object.freeze({
      parse: vi.fn(() => Object.freeze({ route: "play" as const })),
    });
    const readUiContext = vi.fn(() => ({ route: "play" }));
    const createApplication = vi.fn((composition) => {
      expect(composition.uiContextSchema).toBe(uiContextSchema);
      expect(composition.readUiContext).toBe(readUiContext);
      expect(uiContextSchema.parse).not.toHaveBeenCalled();
      expect(readUiContext).not.toHaveBeenCalled();
      return composition;
    });

    const application = await createGameRuntimeV1({
      host,
      uiContextSchema,
      readUiContext,
      createApplication,
    });

    expect(application.uiContextSchema).toBe(uiContextSchema);
    expect(application.readUiContext).toBe(readUiContext);
    expect(uiContextSchema.parse).not.toHaveBeenCalled();
    expect(readUiContext).not.toHaveBeenCalled();
  });

  it("injects one shared bounded observer-failure sink into application composition", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000100"],
      now: () => "2026-07-14T02:03:04.000Z",
    });

    const application = await createGameRuntimeV1({
      host,
      createApplication(input) {
        input.reportObserverFailure(new Error("listener at /Users/alice/private.ts"));
        return input;
      },
    });

    expect(Object.isFrozen(application)).toBe(true);
    expect(application.runtimeFailures.entries()).toEqual([
      expect.objectContaining({
        occurredAt: "2026-07-14T02:03:04.000Z",
        operation: "runtime.observer_notification_failed",
        message: "listener at <redacted-path>",
        category: "runtime",
        code: "runtime.async_operation_failed",
      }),
    ]);
  });

  it("does not expose or compose an application before preference hydration finishes", async () => {
    const source = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const pendingRead = deferredRecordV1();
    const read = vi.fn(async () => pendingRead.promise);
    const host: GameHostV1 = Object.freeze({
      ...source,
      records: Object.freeze({ ...source.records, read }),
    });
    const createApplication = vi.fn(({ capabilities }) =>
      Object.freeze({ kind: "application" as const, capabilities }),
    );

    const runtime = createGameRuntimeV1({ host, createApplication });
    let settled = false;
    void runtime.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(read).toHaveBeenCalledOnce();
    expect(createApplication).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    pendingRead.resolve(null);
    const application = await runtime;
    expect(application.kind).toBe("application");
    expect(application.capabilities.state.getCurrent()).toEqual({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    expect(createApplication).toHaveBeenCalledOnce();
  });

  it("reports one HMR invalidation through the shared bounded failure sink", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000104"],
      now: () => "2026-07-14T02:03:04.000Z",
    });

    const composition = await createGameRuntimeV1({
      host,
      createApplication(input) {
        input.reportHmrInvalidated();
        input.reportHmrInvalidated();
        return input;
      },
    });

    expect(composition.runtimeFailures.entries()).toEqual([
      expect.objectContaining({
        occurredAt: "2026-07-14T02:03:04.000Z",
        operation: "runtime.hmr_invalidation",
        category: "runtime",
        code: "runtime.hmr_invalidated",
      }),
    ]);
  });

  it("publishes a registered rebootstrap lifecycle out of band", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000105"],
    });
    const invalidationController = Object.freeze({
      invalidateForHmr: vi.fn(),
    }) as RuntimeInvalidationControllerV1;
    const disposition = Object.freeze({ kind: "disposed" as const });
    const disposeForRebootstrap = vi.fn(async () => disposition);
    const onRebootstrapLifecycle = vi.fn();

    const application = await createGameRuntimeV1({
      host,
      onRebootstrapLifecycle,
      createApplication(input) {
        input.registerRebootstrapLifecycle({
          invalidationController,
          disposeForRebootstrap,
        });
        expect(() =>
          input.registerRebootstrapLifecycle({
            invalidationController,
            disposeForRebootstrap,
          }),
        ).toThrow("already registered");
        return Object.freeze({ kind: "application" as const });
      },
    });

    expect(application).toEqual({ kind: "application" });
    expect(application).not.toHaveProperty("invalidationController");
    expect(application).not.toHaveProperty("disposeForRebootstrap");
    expect(onRebootstrapLifecycle).toHaveBeenCalledOnce();
    const lifecycle = onRebootstrapLifecycle.mock.calls[0]?.[0];
    expect(lifecycle).toEqual({
      invalidationController,
      disposeForRebootstrap: expect.any(Function),
    });
    expect(Object.isFrozen(lifecycle)).toBe(true);
    await expect(lifecycle.disposeForRebootstrap()).resolves.toBe(disposition);
    expect(disposeForRebootstrap).toHaveBeenCalledOnce();
  });

  it("rejects an HMR-enabled composition that omits its lifecycle registration", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000106"],
    });

    await expect(
      createGameRuntimeV1({
        host,
        onRebootstrapLifecycle: vi.fn(),
        createApplication: () => Object.freeze({ kind: "application" as const }),
      }),
    ).rejects.toThrow("did not register an HMR lifecycle");
  });

  it("awaits lifecycle disposal and preserves an application-construction failure", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000107"],
    });
    const invalidationController = Object.freeze({
      invalidateForHmr: vi.fn(),
    }) as RuntimeInvalidationControllerV1;
    const disposition = Object.freeze({ kind: "disposed" as const });
    const pendingDisposal = deferredValueV1<typeof disposition>();
    const disposeForRebootstrap = vi.fn(async () => pendingDisposal.promise);
    const applicationFailure = new Error("application construction failed");

    const runtime = createGameRuntimeV1({
      host,
      createApplication(input) {
        input.registerRebootstrapLifecycle({
          invalidationController,
          disposeForRebootstrap,
        });
        throw applicationFailure;
      },
    });
    let settled = false;
    void runtime.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.waitFor(() => expect(disposeForRebootstrap).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    pendingDisposal.resolve(disposition);

    await expect(runtime).rejects.toBe(applicationFailure);
    expect(disposeForRebootstrap).toHaveBeenCalledOnce();
  });

  it("disposes after an asynchronous lifecycle handoff rejection and rethrows that rejection", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000108"],
    });
    const invalidationController = Object.freeze({
      invalidateForHmr: vi.fn(),
    }) as RuntimeInvalidationControllerV1;
    const disposition = Object.freeze({ kind: "disposed" as const });
    const disposeForRebootstrap = vi.fn(async () => disposition);
    const handoffFailure = new Error("lifecycle handoff rejected");

    const runtime = createGameRuntimeV1({
      host,
      async onRebootstrapLifecycle() {
        await Promise.resolve();
        throw handoffFailure;
      },
      createApplication(input) {
        input.registerRebootstrapLifecycle({
          invalidationController,
          disposeForRebootstrap,
        });
        return Object.freeze({ kind: "application" as const });
      },
    });

    await expect(runtime).rejects.toBe(handoffFailure);
    expect(disposeForRebootstrap).toHaveBeenCalledOnce();
  });

  it("preserves a synchronous lifecycle handoff failure when best-effort disposal also fails", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: ["00000000-0000-4000-8000-000000000109"],
    });
    const invalidationController = Object.freeze({
      invalidateForHmr: vi.fn(),
    }) as RuntimeInvalidationControllerV1;
    const disposalFailure = new Error("best-effort disposal failed");
    const disposeForRebootstrap = vi.fn(async () => {
      throw disposalFailure;
    });
    const handoffFailure = new Error("lifecycle handoff threw");

    const runtime = createGameRuntimeV1({
      host,
      onRebootstrapLifecycle() {
        throw handoffFailure;
      },
      createApplication(input) {
        input.registerRebootstrapLifecycle({
          invalidationController,
          disposeForRebootstrap,
        });
        return Object.freeze({ kind: "application" as const });
      },
    });

    await expect(runtime).rejects.toBe(handoffFailure);
    expect(disposeForRebootstrap).toHaveBeenCalledOnce();
  });

  it("injects one fresh frozen persistence identity per runtime and awaits application composition", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      uuids: [
        "00000000-0000-4000-8000-000000000101",
        "00000000-0000-4000-8000-000000000102",
        "00000000-0000-4000-8000-000000000103",
      ],
    });
    let releaseFirst!: () => void;
    const firstComposition = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const identities: unknown[] = [];
    const createApplication = vi.fn(
      async ({
        persistenceIdentity,
        runtimeFailures,
      }: Parameters<Parameters<typeof createGameRuntimeV1>[0]["createApplication"]>[0]) => {
        identities.push(persistenceIdentity);
        if (identities.length === 1) await firstComposition;
        return Object.freeze({ persistenceIdentity, runtimeFailures });
      },
    );

    const firstRuntime = createGameRuntimeV1({ host, createApplication });
    let firstSettled = false;
    void firstRuntime.then(() => {
      firstSettled = true;
    });
    await vi.waitFor(() => expect(createApplication).toHaveBeenCalledOnce());
    expect(firstSettled).toBe(false);
    expect(identities[0]).toMatchObject({
      ownerId: "00000000-0000-4000-8000-000000000101",
      nextHandoffRequestId: expect.any(Function),
    });
    expect(Object.isFrozen(identities[0])).toBe(true);

    releaseFirst();
    const first = await firstRuntime;
    expect(first.persistenceIdentity.nextHandoffRequestId()).toBe(
      "00000000-0000-4000-8000-000000000102",
    );

    const second = await createGameRuntimeV1({ host, createApplication });
    expect(second.persistenceIdentity.ownerId).toBe("00000000-0000-4000-8000-000000000103");
    expect(second.persistenceIdentity).not.toBe(first.persistenceIdentity);
    expect(second.runtimeFailures).not.toBe(first.runtimeFailures);
  });
});
