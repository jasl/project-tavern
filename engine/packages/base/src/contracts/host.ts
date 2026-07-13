// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1 } from "./gameplay-module.js";
import type { Brand, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";
import { parseNonNegativeSafeInteger } from "./values.js";

export type IsoUtcInstant = Brand<string, "IsoUtcInstant">;
export type HostRecordNamespaceV1 = "save" | "lease" | "settings";
export type HostRecordKeyV1 = Brand<string, "HostRecordKeyV1">;
export type HostRecordRevisionV1 = NonNegativeSafeInteger;

export interface HostStoredRecordV1 {
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly revision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
}

export type HostRecordMutationV1 =
  | {
      readonly kind: "put";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1 | null;
      readonly bytes: Uint8Array;
    }
  | {
      readonly kind: "delete";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly expectedRevision: HostRecordRevisionV1;
    };

export type HostAtomicCommitResultV1 =
  | { readonly kind: "committed"; readonly records: readonly HostStoredRecordV1[] }
  | {
      readonly kind: "conflict";
      readonly namespace: HostRecordNamespaceV1;
      readonly key: HostRecordKeyV1;
      readonly actualRevision: HostRecordRevisionV1 | null;
    };

export interface HostAtomicRecordStoreV1 {
  read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1): Promise<HostStoredRecordV1 | null>;
  list(namespace: HostRecordNamespaceV1): Promise<readonly HostStoredRecordV1[]>;
  commit(
    mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
  ): Promise<HostAtomicCommitResultV1>;
}

export type HostFileSelectionResultV1 =
  | { readonly kind: "selected"; readonly name: string; readonly bytes: Uint8Array }
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: "too_large" | "unsupported_type" };

export interface HostFilePortV1 {
  selectOne(request: {
    readonly acceptedMediaTypes: readonly string[];
    readonly maximumBytes: PositiveSafeInteger;
  }): Promise<HostFileSelectionResultV1>;
  download(request: {
    readonly filename: string;
    readonly mediaType: string;
    readonly bytes: Uint8Array;
  }): Promise<void>;
}

export interface GameHostV1 {
  readonly platform: "web" | "electron";
  readonly bootstrapEntropy: BootstrapEntropyV1;
  readonly records: HostAtomicRecordStoreV1;
  readonly files: HostFilePortV1;
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly navigation: { reloadApplication(): void; requestExit(): void };
  readonly log: {
    write(
      level: "debug" | "info" | "warn" | "error",
      code: string,
      details: StrictJsonObjectV1,
    ): void;
  };
}

function cloneRecord(record: HostStoredRecordV1): HostStoredRecordV1 {
  return Object.freeze({ ...record, bytes: Uint8Array.from(record.bytes) });
}

export function createMemoryHostRecordStoreV1(): HostAtomicRecordStoreV1 {
  const records = new Map<string, HostStoredRecordV1>();
  const composite = (namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) =>
    `${namespace}\0${key}`;
  return Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const record = records.get(composite(namespace, key));
      return record ? cloneRecord(record) : null;
    },
    async list(namespace: HostRecordNamespaceV1) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => record.namespace === namespace)
          .sort((left, right) => left.key.localeCompare(right.key))
          .map(cloneRecord),
      );
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      const identities = mutations.map((mutation) => composite(mutation.namespace, mutation.key));
      if (new Set(identities).size !== identities.length) {
        throw new TypeError("duplicate Host record mutation");
      }
      for (const mutation of mutations) {
        const current = records.get(composite(mutation.namespace, mutation.key));
        const actualRevision = current?.revision ?? null;
        if (mutation.expectedRevision !== actualRevision) {
          return Object.freeze({
            kind: "conflict" as const,
            namespace: mutation.namespace,
            key: mutation.key,
            actualRevision,
          });
        }
      }
      const changed: HostStoredRecordV1[] = [];
      for (const mutation of mutations) {
        const identity = composite(mutation.namespace, mutation.key);
        if (mutation.kind === "delete") {
          records.delete(identity);
          continue;
        }
        const next = Object.freeze({
          namespace: mutation.namespace,
          key: mutation.key,
          revision: parseNonNegativeSafeInteger((mutation.expectedRevision ?? 0) + 1),
          bytes: Uint8Array.from(mutation.bytes),
        });
        records.set(identity, next);
        changed.push(cloneRecord(next));
      }
      return Object.freeze({
        kind: "committed" as const,
        records: Object.freeze(changed),
      });
    },
  });
}
