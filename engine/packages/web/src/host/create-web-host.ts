// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  HostAtomicRecordStoreV1,
  IsoUtcInstant,
  NonZeroUint32,
} from "@sillymaker/base";
import { parseNonZeroUint32 } from "@sillymaker/base";
import { createIndexedDbRecordStoreV1 } from "./indexeddb-record-store.js";

interface CreateWebHostCommonOptionsV1 {
  readonly seeds?: readonly number[];
  readonly uuids?: readonly string[];
  readonly now?: () => string;
  readonly crypto?: Pick<Crypto, "getRandomValues" | "randomUUID">;
}

export type CreateWebHostOptionsV1 = CreateWebHostCommonOptionsV1 &
  (
    | { readonly databaseName: string; readonly records?: never }
    | { readonly databaseName?: never; readonly records: HostAtomicRecordStoreV1 }
  );

function readGlobalIndexedDbV1(): IDBFactory | undefined {
  try {
    const indexedDB = globalThis.indexedDB;
    return indexedDB !== undefined && typeof indexedDB.open === "function" ? indexedDB : undefined;
  } catch {
    return undefined;
  }
}

function resolveRecordsV1(options: CreateWebHostOptionsV1): HostAtomicRecordStoreV1 {
  const databaseName = Reflect.get(options, "databaseName") as unknown;
  const records = Reflect.get(options, "records") as unknown;
  const hasDatabaseName = databaseName !== undefined;
  const hasRecords = records !== undefined;
  if (hasDatabaseName === hasRecords) {
    throw new TypeError("Web Host requires exactly one persistence composition");
  }
  if (hasDatabaseName) {
    if (typeof databaseName !== "string") throw new TypeError("invalid Web Host databaseName");
    return createIndexedDbRecordStoreV1({
      indexedDB: readGlobalIndexedDbV1() as IDBFactory,
      databaseName,
    });
  }
  if (
    records === null ||
    typeof records !== "object" ||
    typeof Reflect.get(records, "read") !== "function" ||
    typeof Reflect.get(records, "list") !== "function" ||
    typeof Reflect.get(records, "commit") !== "function"
  ) {
    throw new TypeError("invalid Web Host record store");
  }
  return records as HostAtomicRecordStoreV1;
}

export function createWebHostV1(options: CreateWebHostOptionsV1): GameHostV1 {
  if (options === null || typeof options !== "object") {
    throw new TypeError("invalid Web Host options");
  }
  const cryptoPort = options.crypto ?? globalThis.crypto;
  const records = resolveRecordsV1(options);
  const seeds = [...(options.seeds ?? [])];
  const uuids = [...(options.uuids ?? [])];
  let seedIndex = 0;
  let uuidIndex = 0;
  const nextSeed = (): NonZeroUint32 => {
    const fixed = seeds[seedIndex];
    if (fixed !== undefined) {
      seedIndex += 1;
      return parseNonZeroUint32(fixed);
    }
    const values = new Uint32Array(1);
    do cryptoPort.getRandomValues(values);
    while (values[0] === 0);
    return parseNonZeroUint32(values[0]);
  };
  return Object.freeze({
    platform: "web" as const,
    bootstrapEntropy: Object.freeze({
      nextUuidV4() {
        const fixed = uuids[uuidIndex];
        if (fixed !== undefined) {
          uuidIndex += 1;
          return fixed;
        }
        return cryptoPort.randomUUID();
      },
      nextNonZeroUint32: nextSeed,
    }),
    records,
    files: Object.freeze({
      async selectOne() {
        return Object.freeze({ kind: "cancelled" as const });
      },
      async download(request: Parameters<GameHostV1["files"]["download"]>[0]) {
        const url = URL.createObjectURL(
          new Blob([request.bytes as BlobPart], { type: request.mediaType }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = request.filename;
        anchor.click();
        URL.revokeObjectURL(url);
      },
    }),
    metadataClock: Object.freeze({
      now: () => (options.now?.() ?? new Date().toISOString()) as IsoUtcInstant,
    }),
    navigation: Object.freeze({
      reloadApplication: () => globalThis.location?.reload(),
      requestExit: () => globalThis.close?.(),
    }),
    log: Object.freeze({
      write(
        level: "debug" | "info" | "warn" | "error",
        code: string,
        details: Parameters<GameHostV1["log"]["write"]>[2],
      ) {
        const method =
          level === "debug"
            ? console.debug
            : level === "info"
              ? console.info
              : level === "warn"
                ? console.warn
                : console.error;
        method(code, details);
      },
    }),
  });
}
