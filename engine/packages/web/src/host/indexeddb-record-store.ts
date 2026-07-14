// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = HostStoredRecordV1["namespace"];
type HostRecordRevisionV1 = HostStoredRecordV1["revision"];

export const SILLYMAKER_DATABASE_VERSION_V1 = 1;
export const SILLYMAKER_RECORD_STORE_NAME_V1 = "records";
export const SILLYMAKER_NAMESPACE_INDEX_NAME_V1 = "by-namespace";

export interface IndexedDbRecordRowV1 {
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly revision: HostRecordRevisionV1;
  readonly bytes: ArrayBuffer;
}

export type IndexedDbRecordStoreFailureCodeV1 =
  | "indexeddb.unavailable"
  | "indexeddb.database_newer"
  | "indexeddb.upgrade_blocked"
  | "indexeddb.quota_exceeded"
  | "indexeddb.transaction_aborted"
  | "indexeddb.request_failed"
  | "indexeddb.schema_invalid";

export interface IndexedDbRecordStoreFailureV1 extends Error {
  readonly code: IndexedDbRecordStoreFailureCodeV1;
  readonly operation: "open" | "read" | "list" | "commit";
}

export interface CreateIndexedDbRecordStoreOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
}

type IndexedDbOperationV1 = IndexedDbRecordStoreFailureV1["operation"];

interface NormalizedPutMutationV1 {
  readonly kind: "put";
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly expectedRevision: HostRecordRevisionV1 | null;
  readonly nextRevision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
}

interface NormalizedDeleteMutationV1 {
  readonly kind: "delete";
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly expectedRevision: HostRecordRevisionV1;
}

type NormalizedMutationV1 = NormalizedPutMutationV1 | NormalizedDeleteMutationV1;

function createFailureV1(
  code: IndexedDbRecordStoreFailureCodeV1,
  operation: IndexedDbOperationV1,
): IndexedDbRecordStoreFailureV1 {
  const failure = new Error(code) as IndexedDbRecordStoreFailureV1;
  failure.name = "IndexedDbRecordStoreFailureV1";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return Object.freeze(failure);
}

function isStableFailureV1(value: unknown): value is IndexedDbRecordStoreFailureV1 {
  return value instanceof Error && value.name === "IndexedDbRecordStoreFailureV1";
}

function mapExpectedFailureV1(value: unknown, operation: IndexedDbOperationV1): unknown {
  if (isStableFailureV1(value)) return value;
  if (!(value instanceof DOMException)) return value;
  if (value.name === "VersionError") return createFailureV1("indexeddb.database_newer", "open");
  if (value.name === "SecurityError" || value.name === "NotAllowedError") {
    return createFailureV1("indexeddb.unavailable", operation);
  }
  if (value.name === "QuotaExceededError") {
    return createFailureV1("indexeddb.quota_exceeded", operation);
  }
  if (value.name === "AbortError") {
    return createFailureV1("indexeddb.transaction_aborted", operation);
  }
  return createFailureV1("indexeddb.request_failed", operation);
}

function throwMappedFailureV1(value: unknown, operation: IndexedDbOperationV1): never {
  throw mapExpectedFailureV1(value, operation);
}

function requestResultV1<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const removeListeners = () => {
      request.removeEventListener("success", onSuccess);
      request.removeEventListener("error", onError);
    };
    const onSuccess = () => {
      removeListeners();
      resolve(request.result);
    };
    const onError = () => {
      removeListeners();
      reject(request.error ?? new DOMException("request failed", "UnknownError"));
    };
    request.addEventListener("success", onSuccess);
    request.addEventListener("error", onError);
  });
}

function transactionCompletionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const removeListeners = () => {
      transaction.removeEventListener("complete", onComplete);
      transaction.removeEventListener("error", onFailure);
      transaction.removeEventListener("abort", onFailure);
    };
    const onComplete = () => {
      removeListeners();
      resolve();
    };
    const onFailure = () => {
      removeListeners();
      reject(transaction.error ?? new DOMException("transaction aborted", "AbortError"));
    };
    transaction.addEventListener("complete", onComplete);
    transaction.addEventListener("error", onFailure);
    transaction.addEventListener("abort", onFailure);
  });
}

function domStringListValuesV1(value: DOMStringList): readonly string[] {
  const values: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value.item(index);
    if (entry === null) throw new TypeError("invalid DOMStringList");
    values.push(entry);
  }
  return values;
}

function hasExactSchemaV1(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== SILLYMAKER_DATABASE_VERSION_V1 ||
      domStringListValuesV1(database.objectStoreNames).join("\0") !==
        SILLYMAKER_RECORD_STORE_NAME_V1
    ) {
      return false;
    }
    const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readonly");
    const objectStore = transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1);
    if (
      !Array.isArray(objectStore.keyPath) ||
      objectStore.keyPath.length !== 2 ||
      objectStore.keyPath[0] !== "namespace" ||
      objectStore.keyPath[1] !== "key" ||
      objectStore.autoIncrement ||
      domStringListValuesV1(objectStore.indexNames).join("\0") !==
        SILLYMAKER_NAMESPACE_INDEX_NAME_V1
    ) {
      return false;
    }
    const index = objectStore.index(SILLYMAKER_NAMESPACE_INDEX_NAME_V1);
    return index.keyPath === "namespace" && !index.unique && !index.multiEntry;
  } catch {
    return false;
  }
}

function openDatabaseV1(
  indexedDB: IDBFactory,
  databaseName: string,
  onConnectionClosed: () => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(databaseName, SILLYMAKER_DATABASE_VERSION_V1);
    } catch (error) {
      reject(mapExpectedFailureV1(error, "open"));
      return;
    }
    let settled = false;
    let upgradeFailure: unknown;
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(mapExpectedFailureV1(error, "open"));
    };
    request.addEventListener("upgradeneeded", (event) => {
      try {
        if (event.oldVersion !== 0 || event.newVersion !== SILLYMAKER_DATABASE_VERSION_V1) {
          throw createFailureV1("indexeddb.schema_invalid", "open");
        }
        const objectStore = request.result.createObjectStore(SILLYMAKER_RECORD_STORE_NAME_V1, {
          keyPath: ["namespace", "key"],
          autoIncrement: false,
        });
        objectStore.createIndex(SILLYMAKER_NAMESPACE_INDEX_NAME_V1, "namespace", {
          unique: false,
          multiEntry: false,
        });
      } catch (error) {
        upgradeFailure = error;
        try {
          request.transaction?.abort();
        } catch {
          // The original upgrade failure remains authoritative.
        }
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnce(createFailureV1("indexeddb.upgrade_blocked", "open"));
    });
    request.addEventListener("error", () => {
      rejectOnce(
        upgradeFailure ?? request.error ?? new DOMException("open request failed", "UnknownError"),
      );
    });
    request.addEventListener("success", () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      if (!hasExactSchemaV1(database)) {
        database.close();
        rejectOnce(createFailureV1("indexeddb.schema_invalid", "open"));
        return;
      }
      settled = true;
      database.addEventListener("versionchange", () => {
        database.close();
        onConnectionClosed();
      });
      database.addEventListener("close", onConnectionClosed);
      resolve(database);
    });
  });
}

function isRecordNamespaceV1(value: unknown): value is HostRecordNamespaceV1 {
  return value === "save" || value === "lease" || value === "settings";
}

function parseStoredRowV1(value: unknown, operation: IndexedDbOperationV1): HostStoredRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    Object.keys(value).toSorted().join("\0") !== "bytes\0key\0namespace\0revision"
  ) {
    throw createFailureV1("indexeddb.schema_invalid", operation);
  }
  const row = value as Record<string, unknown>;
  if (
    !isRecordNamespaceV1(row.namespace) ||
    typeof row.key !== "string" ||
    !(row.bytes instanceof ArrayBuffer)
  ) {
    throw createFailureV1("indexeddb.schema_invalid", operation);
  }
  let revision: HostRecordRevisionV1;
  try {
    revision = parseNonNegativeSafeInteger(row.revision);
  } catch {
    throw createFailureV1("indexeddb.schema_invalid", operation);
  }
  return Object.freeze({
    namespace: row.namespace,
    key: row.key as HostRecordKeyV1,
    revision,
    bytes: Uint8Array.from(new Uint8Array(row.bytes)),
  });
}

function copyStoredRecordV1(record: HostStoredRecordV1): HostStoredRecordV1 {
  return Object.freeze({ ...record, bytes: Uint8Array.from(record.bytes) });
}

function normalizeMutationsV1(
  mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
): readonly [NormalizedMutationV1, ...NormalizedMutationV1[]] {
  if (!Array.isArray(mutations) || mutations.length === 0) {
    throw new TypeError("Host record commit requires mutations");
  }
  const normalized = mutations.map((mutation): NormalizedMutationV1 => {
    if (!isRecordNamespaceV1(mutation.namespace) || typeof mutation.key !== "string") {
      throw new TypeError("invalid Host record mutation identity");
    }
    if (mutation.kind === "put") {
      if (!(mutation.bytes instanceof Uint8Array)) {
        throw new TypeError("invalid Host record mutation bytes");
      }
      const expectedRevision =
        mutation.expectedRevision === null
          ? null
          : parseNonNegativeSafeInteger(mutation.expectedRevision);
      return Object.freeze({
        kind: "put",
        namespace: mutation.namespace,
        key: mutation.key,
        expectedRevision,
        nextRevision: parseNonNegativeSafeInteger((expectedRevision ?? 0) + 1),
        bytes: Uint8Array.from(mutation.bytes),
      });
    }
    if (mutation.kind !== "delete") throw new TypeError("invalid Host record mutation kind");
    return Object.freeze({
      kind: "delete",
      namespace: mutation.namespace,
      key: mutation.key,
      expectedRevision: parseNonNegativeSafeInteger(mutation.expectedRevision),
    });
  });
  const identities = normalized.map(({ namespace, key }) => `${namespace}\0${key}`);
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("duplicate Host record mutation");
  }
  return Object.freeze(normalized) as readonly [NormalizedMutationV1, ...NormalizedMutationV1[]];
}

function rowFromMutationV1(mutation: NormalizedPutMutationV1): IndexedDbRecordRowV1 {
  return Object.freeze({
    namespace: mutation.namespace,
    key: mutation.key,
    revision: mutation.nextRevision,
    bytes: Uint8Array.from(mutation.bytes).buffer,
  });
}

export function createIndexedDbRecordStoreV1(
  options: CreateIndexedDbRecordStoreOptionsV1,
): HostAtomicRecordStoreV1 {
  let databasePromise: Promise<IDBDatabase> | undefined;
  const getDatabaseV1 = (operation: Exclude<IndexedDbOperationV1, "open">) => {
    const indexedDB = options.indexedDB as IDBFactory | undefined;
    if (indexedDB === undefined || typeof indexedDB.open !== "function") {
      return Promise.reject(createFailureV1("indexeddb.unavailable", operation));
    }
    if (databasePromise === undefined) {
      let cached: Promise<IDBDatabase>;
      const pending = openDatabaseV1(indexedDB, options.databaseName, () => {
        if (databasePromise === cached) databasePromise = undefined;
      });
      cached = pending.catch((error: unknown) => {
        if (databasePromise === cached) databasePromise = undefined;
        throw error;
      });
      databasePromise = cached;
    }
    return databasePromise;
  };

  return Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      try {
        const database = await getDatabaseV1("read");
        const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const row = await requestResultV1(
          transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1).get([namespace, key]),
        );
        await completion;
        return row === undefined ? null : parseStoredRowV1(row, "read");
      } catch (error) {
        return throwMappedFailureV1(error, "read");
      }
    },

    async list(namespace: HostRecordNamespaceV1) {
      try {
        const database = await getDatabaseV1("list");
        const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const rows = await requestResultV1(
          transaction
            .objectStore(SILLYMAKER_RECORD_STORE_NAME_V1)
            .index(SILLYMAKER_NAMESPACE_INDEX_NAME_V1)
            .getAll(namespace),
        );
        await completion;
        const records = rows.map((row) => parseStoredRowV1(row, "list"));
        if (records.some((record) => record.namespace !== namespace)) {
          throw createFailureV1("indexeddb.schema_invalid", "list");
        }
        records.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
        return Object.freeze(records.map(copyStoredRecordV1));
      } catch (error) {
        return throwMappedFailureV1(error, "list");
      }
    },

    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      const normalized = normalizeMutationsV1(mutations);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("commit");
        transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const objectStore = transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1);
        const currentRows = await Promise.all(
          normalized.map(({ namespace, key }) =>
            requestResultV1(objectStore.get([namespace, key])),
          ),
        );
        const currentRecords = currentRows.map((row) =>
          row === undefined ? null : parseStoredRowV1(row, "commit"),
        );
        for (let index = 0; index < normalized.length; index += 1) {
          const mutation = normalized[index];
          if (mutation === undefined) throw new TypeError("missing normalized mutation");
          const actualRevision = currentRecords[index]?.revision ?? null;
          if (actualRevision !== mutation.expectedRevision) {
            transaction.abort();
            await completion.catch(() => undefined);
            return Object.freeze({
              kind: "conflict",
              namespace: mutation.namespace,
              key: mutation.key,
              actualRevision,
            });
          }
        }
        const writeRequests = normalized.map((mutation) =>
          mutation.kind === "put"
            ? requestResultV1(objectStore.put(rowFromMutationV1(mutation)))
            : requestResultV1(objectStore.delete([mutation.namespace, mutation.key])),
        );
        await Promise.all(writeRequests);
        await completion;
        const changed = normalized
          .filter((mutation): mutation is NormalizedPutMutationV1 => mutation.kind === "put")
          .map((mutation) =>
            copyStoredRecordV1({
              namespace: mutation.namespace,
              key: mutation.key,
              revision: mutation.nextRevision,
              bytes: mutation.bytes,
            }),
          );
        return Object.freeze({
          kind: "committed",
          records: Object.freeze(changed),
        }) satisfies HostAtomicCommitResultV1;
      } catch (error) {
        if (transaction !== undefined) {
          try {
            transaction.abort();
          } catch {
            // The first request/transaction failure remains authoritative.
          }
        }
        if (completion !== undefined) await completion.catch(() => undefined);
        return throwMappedFailureV1(error, "commit");
      }
    },
  });
}
