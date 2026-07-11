// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  HostAtomicCommitResultV1,
  HostAtomicRecordStoreV1,
  HostRecordKeyV1,
  HostRecordMutationV1,
  HostRecordNamespaceV1,
  HostStoredRecordV1,
  IsoUtcInstant,
  NonZeroUint32,
} from "@project-tavern/base";
import { parseNonZeroUint32, parseNonNegativeSafeInteger } from "@project-tavern/base";

export interface CreateWebHostOptionsV1 {
  readonly seeds?: readonly number[];
  readonly uuids?: readonly string[];
  readonly now?: () => string;
  readonly crypto?: Pick<Crypto, "getRandomValues" | "randomUUID">;
}

function createMemoryRecords(): HostAtomicRecordStoreV1 {
  const records = new Map<string, HostStoredRecordV1>();
  const id = (namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) => `${namespace}\0${key}`;
  const copy = (record: HostStoredRecordV1): HostStoredRecordV1 =>
    Object.freeze({ ...record, bytes: Uint8Array.from(record.bytes) });
  return Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const record = records.get(id(namespace, key));
      return record === undefined ? null : copy(record);
    },
    async list(namespace: HostRecordNamespaceV1) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => record.namespace === namespace)
          .toSorted((left, right) => left.key.localeCompare(right.key))
          .map(copy),
      );
    },
    async commit(
      mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
    ): Promise<HostAtomicCommitResultV1> {
      const identities = mutations.map(({ namespace, key }) => id(namespace, key));
      if (new Set(identities).size !== identities.length) throw new TypeError("duplicate mutation");
      for (const mutation of mutations) {
        const current = records.get(id(mutation.namespace, mutation.key));
        if ((current?.revision ?? null) !== mutation.expectedRevision) {
          return Object.freeze({
            kind: "conflict",
            namespace: mutation.namespace,
            key: mutation.key,
            actualRevision: current?.revision ?? null,
          });
        }
      }
      const changed: HostStoredRecordV1[] = [];
      for (const mutation of mutations as readonly HostRecordMutationV1[]) {
        const identity = id(mutation.namespace, mutation.key);
        if (mutation.kind === "delete") {
          records.delete(identity);
        } else {
          const record = Object.freeze({
            namespace: mutation.namespace,
            key: mutation.key,
            revision: parseNonNegativeSafeInteger((mutation.expectedRevision ?? 0) + 1),
            bytes: Uint8Array.from(mutation.bytes),
          });
          records.set(identity, record);
          changed.push(copy(record));
        }
      }
      return Object.freeze({ kind: "committed", records: Object.freeze(changed) });
    },
  });
}

export function createWebHostV1(options: CreateWebHostOptionsV1 = {}): GameHostV1 {
  const cryptoPort = options.crypto ?? globalThis.crypto;
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
    do cryptoPort.getRandomValues(values); while (values[0] === 0);
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
    records: createMemoryRecords(),
    files: Object.freeze({
      async selectOne() { return Object.freeze({ kind: "cancelled" as const }); },
      async download(request: Parameters<GameHostV1["files"]["download"]>[0]) {
        const url = URL.createObjectURL(new Blob([request.bytes as BlobPart], { type: request.mediaType }));
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
        const method = level === "debug" ? console.debug : level === "info" ? console.info : level === "warn" ? console.warn : console.error;
        method(code, details);
      },
    }),
  });
}
