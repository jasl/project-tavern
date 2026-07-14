// SPDX-License-Identifier: MIT
import type { GameHostV1, HostStoredRecordV1 } from "@sillymaker/base";
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

describe("generic Web game runtime", () => {
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
      }: Parameters<Parameters<typeof createGameRuntimeV1>[0]["createApplication"]>[0]) => {
        identities.push(persistenceIdentity);
        if (identities.length === 1) await firstComposition;
        return Object.freeze({ persistenceIdentity });
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
  });
});
