// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IDBDatabase as FakeIDBDatabase,
  IDBFactory as FakeIDBFactory,
  IDBObjectStore as FakeIDBObjectStore,
  IDBVersionChangeEvent as FakeIDBVersionChangeEvent,
} from "fake-indexeddb";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  SILLYMAKER_DATABASE_VERSION_V1,
  SILLYMAKER_NAMESPACE_INDEX_NAME_V1,
  SILLYMAKER_RECORD_STORE_NAME_V1,
  createIndexedDbRecordStoreV1,
} from "./indexeddb-record-store.js";

const databaseNameV1 = "project-tavern.test.runtime";
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = HostStoredRecordV1["namespace"];
const keyV1 = (value: string) => value as HostRecordKeyV1;
const bytesV1 = (value: string) => new TextEncoder().encode(value);
const textV1 = (value: Uint8Array) => new TextDecoder().decode(value);

function putV1(
  namespace: HostRecordNamespaceV1,
  key: string,
  expectedRevision: number | null,
  value: string | Uint8Array,
): Extract<HostRecordMutationV1, { readonly kind: "put" }> {
  return Object.freeze({
    kind: "put",
    namespace,
    key: keyV1(key),
    expectedRevision:
      expectedRevision === null ? null : parseNonNegativeSafeInteger(expectedRevision),
    bytes: typeof value === "string" ? bytesV1(value) : value,
  });
}

function deleteV1(
  namespace: HostRecordNamespaceV1,
  key: string,
  expectedRevision: number,
): Extract<HostRecordMutationV1, { readonly kind: "delete" }> {
  return Object.freeze({
    kind: "delete",
    namespace,
    key: keyV1(key),
    expectedRevision: parseNonNegativeSafeInteger(expectedRevision),
  });
}

function createInstrumentedFactoryV1() {
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
  return Object.freeze({ raw, indexedDB, opens });
}

function createTestStoreV1(indexedDB: IDBFactory = new FakeIDBFactory()): HostAtomicRecordStoreV1 {
  return createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });
}

function openRawDatabaseV1(
  indexedDB: IDBFactory,
  name: string,
  version: number,
  upgrade?: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  const request = indexedDB.open(name, version);
  if (upgrade !== undefined) {
    request.addEventListener("upgradeneeded", () => upgrade(request.result), { once: true });
  }
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new DOMException("request failed", "UnknownError")),
      { once: true },
    );
  });
}

async function readTextV1(
  store: HostAtomicRecordStoreV1,
  namespace: HostRecordNamespaceV1,
  key: string,
): Promise<string | null> {
  const record = await store.read(namespace, keyV1(key));
  return record === null ? null : textV1(record.bytes);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IndexedDB atomic record store", () => {
  it("opens the frozen v1 schema lazily and shares one in-flight connection", async () => {
    const fixture = createInstrumentedFactoryV1();
    const store = createTestStoreV1(fixture.indexedDB);

    expect(fixture.opens).toEqual([]);
    await Promise.all([store.list("settings"), store.list("save")]);
    expect(fixture.opens).toEqual([{ name: databaseNameV1, version: 1 }]);

    const database = await openRawDatabaseV1(fixture.raw, databaseNameV1, 1);
    expect(database.version).toBe(SILLYMAKER_DATABASE_VERSION_V1);
    expect([...database.objectStoreNames]).toEqual([SILLYMAKER_RECORD_STORE_NAME_V1]);
    const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readonly");
    const objectStore = transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1);
    expect(objectStore.keyPath).toEqual(["namespace", "key"]);
    expect(objectStore.autoIncrement).toBe(false);
    expect([...objectStore.indexNames]).toEqual([SILLYMAKER_NAMESPACE_INDEX_NAME_V1]);
    const index = objectStore.index(SILLYMAKER_NAMESPACE_INDEX_NAME_V1);
    expect(index.keyPath).toBe("namespace");
    expect(index.unique).toBe(false);
    expect(index.multiEntry).toBe(false);
    database.close();
  });

  it("commits every mutation or none when a later CAS conflicts", async () => {
    const store = createTestStoreV1();
    await store.commit([
      putV1("save", "story.e2e:quick", null, "old"),
      putV1("lease", "story.e2e", null, "owner-a"),
    ]);

    const result = await store.commit([
      putV1("save", "story.e2e:quick", 1, "new"),
      putV1("lease", "story.e2e", 99, "owner-b"),
    ]);

    expect(result).toEqual({
      kind: "conflict",
      namespace: "lease",
      key: "story.e2e",
      actualRevision: 1,
    });
    expect(await readTextV1(store, "save", "story.e2e:quick")).toBe("old");
    expect(await readTextV1(store, "lease", "story.e2e")).toBe("owner-a");
  });

  it("serializes concurrent compare-and-swap batches", async () => {
    const store = createTestStoreV1();
    const outcomes = await Promise.all([
      store.commit([putV1("settings", "preference", null, "first")]),
      store.commit([putV1("settings", "preference", null, "second")]),
    ]);

    expect(outcomes.map(({ kind }) => kind).toSorted()).toEqual(["committed", "conflict"]);
    expect(["first", "second"]).toContain(await readTextV1(store, "settings", "preference"));
  });

  it("lists by stable key order and deletes with revision CAS", async () => {
    const store = createTestStoreV1();
    await store.commit([
      putV1("save", "z", null, "z"),
      putV1("save", "a", null, "a"),
      putV1("save", "m", null, "m"),
    ]);

    expect((await store.list("save")).map(({ key }) => key)).toEqual(["a", "m", "z"]);
    expect(await store.commit([deleteV1("save", "m", 1)])).toEqual({
      kind: "committed",
      records: [],
    });
    expect(await store.read("save", keyV1("m"))).toBeNull();
  });

  it("copies input, committed, read, and list byte arrays defensively", async () => {
    const store = createTestStoreV1();
    const input = Uint8Array.of(1, 2, 3);
    const committed = await store.commit([putV1("settings", "bytes", null, input)]);
    input[0] = 99;
    expect(committed.kind).toBe("committed");
    if (committed.kind !== "committed") throw new TypeError("expected committed result");
    const committedRecord = committed.records[0];
    if (committedRecord === undefined) throw new TypeError("missing committed record");
    committedRecord.bytes[1] = 88;

    const firstRead = await store.read("settings", keyV1("bytes"));
    if (firstRead === null) throw new TypeError("missing stored record");
    expect([...firstRead.bytes]).toEqual([1, 2, 3]);
    firstRead.bytes[2] = 77;
    const listed = await store.list("settings");
    const listedRecord = listed[0];
    if (listedRecord === undefined) throw new TypeError("missing listed record");
    expect([...listedRecord.bytes]).toEqual([1, 2, 3]);
    listedRecord.bytes[0] = 66;
    expect([...(await store.read("settings", keyV1("bytes")))!.bytes]).toEqual([1, 2, 3]);
  });

  it.each([
    ["memory", createMemoryHostRecordStoreV1()],
    ["indexeddb", createTestStoreV1()],
  ] as const)("matches the Host record-key ABI for empty branded keys in %s", async (_, store) => {
    const result = await store.commit([putV1("settings", "", null, "empty-key")]);

    expect(result).toMatchObject({
      kind: "committed",
      records: [{ namespace: "settings", key: "", revision: 1 }],
    });
    expect(await readTextV1(store, "settings", "")).toBe("empty-key");
  });

  it("rejects duplicate mutation identities before opening IndexedDB", async () => {
    const fixture = createInstrumentedFactoryV1();
    const store = createTestStoreV1(fixture.indexedDB);

    await expect(
      store.commit([
        putV1("save", "duplicate", null, "one"),
        putV1("save", "duplicate", null, "two"),
      ]),
    ).rejects.toThrow(TypeError);
    expect(fixture.opens).toEqual([]);
  });

  it("rejects a future database revision without deleting or recreating it", async () => {
    const factory = new FakeIDBFactory();
    const future = await openRawDatabaseV1(factory, databaseNameV1, 2, (database) => {
      database.createObjectStore("future-data");
    });
    future.close();

    await expect(createTestStoreV1(factory).list("settings")).rejects.toMatchObject({
      code: "indexeddb.database_newer",
      operation: "open",
    });
    const unchanged = await openRawDatabaseV1(factory, databaseNameV1, 2);
    expect(unchanged.version).toBe(2);
    expect([...unchanged.objectStoreNames]).toEqual(["future-data"]);
    unchanged.close();
  });

  it("rejects an existing v1 database whose schema is not exact", async () => {
    const factory = new FakeIDBFactory();
    const invalid = await openRawDatabaseV1(factory, databaseNameV1, 1, (database) => {
      database.createObjectStore("wrong-store");
    });
    invalid.close();

    await expect(createTestStoreV1(factory).read("save", keyV1("key"))).rejects.toMatchObject({
      code: "indexeddb.schema_invalid",
      operation: "open",
    });
  });

  it("maps an unavailable factory and a blocked open to stable failures", async () => {
    const unavailable = createIndexedDbRecordStoreV1({
      indexedDB: undefined as unknown as IDBFactory,
      databaseName: databaseNameV1,
    });
    await expect(unavailable.list("settings")).rejects.toMatchObject({
      code: "indexeddb.unavailable",
      operation: "list",
    });

    const fixture = createInstrumentedFactoryV1();
    const blockedFactory = new Proxy(fixture.indexedDB, {
      get(target, property, receiver) {
        if (property !== "open") return Reflect.get(target, property, receiver) as unknown;
        return (name: string, version?: number) => {
          const request = target.open(name, version);
          queueMicrotask(() => {
            request.dispatchEvent(
              new FakeIDBVersionChangeEvent("blocked", {
                oldVersion: 0,
                newVersion: version ?? null,
              }),
            );
          });
          return request;
        };
      },
    }) as IDBFactory;
    await expect(createTestStoreV1(blockedFactory).list("settings")).rejects.toMatchObject({
      code: "indexeddb.upgrade_blocked",
      operation: "open",
    });
  });

  it("maps quota and transaction abort failures at commit", async () => {
    const quotaStore = createTestStoreV1();
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("synthetic quota", "QuotaExceededError");
    });
    await expect(
      quotaStore.commit([putV1("settings", "quota", null, "value")]),
    ).rejects.toMatchObject({
      code: "indexeddb.quota_exceeded",
      operation: "commit",
    });
    vi.restoreAllMocks();

    const abortStore = createTestStoreV1();
    const originalTransaction = FakeIDBDatabase.prototype.transaction;
    vi.spyOn(FakeIDBDatabase.prototype, "transaction").mockImplementation(function (
      this: IDBDatabase,
      storeNames: string | Iterable<string>,
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      const transaction = originalTransaction.call(this, storeNames, mode, options);
      if (mode === "readwrite") queueMicrotask(() => transaction.abort());
      return transaction;
    });
    await expect(
      abortStore.commit([putV1("settings", "abort", null, "value")]),
    ).rejects.toMatchObject({
      code: "indexeddb.transaction_aborted",
      operation: "commit",
    });
  });

  it("returns frozen record envelopes while keeping byte copies writable", async () => {
    const store = createTestStoreV1();
    const result = await store.commit([putV1("save", "frozen", null, "value")]);
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind !== "committed") throw new TypeError("expected committed result");
    expect(Object.isFrozen(result.records)).toBe(true);
    expect(Object.isFrozen(result.records[0] as HostStoredRecordV1)).toBe(true);
    expect(Object.isFrozen(result.records[0]?.bytes)).toBe(false);
  });
});
