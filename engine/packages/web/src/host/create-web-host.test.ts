// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostFilePortV1, HostRecordMutationV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { IDBFactory as FakeIDBFactory } from "fake-indexeddb";
import { createWebHostV1 } from "./create-web-host.js";

describe("Web Host", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("provides fixed entropy with an explicitly injected record store", async () => {
    const records = createMemoryHostRecordStoreV1();
    const host = createWebHostV1({
      records,
      seeds: [7],
      uuids: ["00000000-0000-4000-8000-000000000001"],
    });
    expect(host.bootstrapEntropy.nextNonZeroUint32()).toBe(7);
    expect(host.bootstrapEntropy.nextUuidV4()).toBe("00000000-0000-4000-8000-000000000001");
    expect(host.records).toBe(records);
    for (const key of ["b", "a"]) {
      await host.records.commit([
        {
          kind: "put",
          namespace: "settings",
          key: key as HostRecordMutationV1["key"],
          expectedRevision: null,
          bytes: Uint8Array.of(1),
        },
      ]);
    }
    expect((await host.records.list("settings")).map(({ key }) => key)).toEqual(["a", "b"]);
  });

  it("accepts one narrow file-port override without changing persistence composition", () => {
    const files = Object.freeze({
      selectOne: vi.fn(async () => Object.freeze({ kind: "cancelled" as const })),
      download: vi.fn(async () => undefined),
    }) satisfies HostFilePortV1;
    const records = createMemoryHostRecordStoreV1();

    const host = createWebHostV1({ records, files });

    expect(host.files).toBe(files);
    expect(host.records).toBe(records);
  });

  it("opens the application-owned database lazily with the exact name", async () => {
    const raw = new FakeIDBFactory();
    const opens: { readonly name: string; readonly version: number | undefined }[] = [];
    const indexedDB = new Proxy(raw, {
      get(target, property) {
        if (property === "open") {
          return (name: string, version?: number) => {
            opens.push(Object.freeze({ name, version }));
            return version === undefined ? target.open(name) : target.open(name, version);
          };
        }
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as IDBFactory;
    vi.stubGlobal("indexedDB", indexedDB);

    const host = createWebHostV1({ databaseName: "application.test.runtime" });
    expect(opens).toEqual([]);
    await host.records.list("settings");
    expect(opens).toEqual([{ name: "application.test.runtime", version: 1 }]);
  });

  it("installs a degraded store instead of pretending memory is persistent", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const host = createWebHostV1({ databaseName: "application.test.unavailable" });
    const mutation: HostRecordMutationV1 = {
      kind: "put",
      namespace: "settings",
      key: "preference" as HostRecordMutationV1["key"],
      expectedRevision: null,
      bytes: Uint8Array.of(1),
    };

    await expect(host.records.read("settings", mutation.key)).rejects.toMatchObject({
      code: "indexeddb.unavailable",
      operation: "read",
    });
    await expect(host.records.list("settings")).rejects.toMatchObject({
      code: "indexeddb.unavailable",
      operation: "list",
    });
    await expect(host.records.commit([mutation])).rejects.toMatchObject({
      code: "indexeddb.unavailable",
      operation: "commit",
    });
  });

  it("rejects malformed runtime persistence composition", () => {
    expect(() => createWebHostV1({} as never)).toThrow(TypeError);
    expect(() =>
      createWebHostV1({
        databaseName: "application.test.runtime",
        records: createMemoryHostRecordStoreV1(),
      } as never),
    ).toThrow(TypeError);
  });
});
