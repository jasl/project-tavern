// SPDX-License-Identifier: MIT
import { canonicalJsonBytes, parseStrictJson, parseStrictJsonLimitsV1 } from "@sillymaker/base";
import type {
  DeepReadonly,
  GameHostV1,
  HostAtomicRecordStoreV1,
  HostStoredRecordV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { createRuntimeCapabilityPortV1 } from "@sillymaker/base/runtime";

const capabilityKeyV1 = "runtime-capabilities.v1" as Parameters<HostAtomicRecordStoreV1["read"]>[1];
const capabilityLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 512,
  maxDepth: 2,
  maxArrayItems: 1,
  maxObjectMembers: 3,
  maxNodes: 4,
  maxStringBytes: 64,
});
const capabilityKeysV1 = ["automationBridge", "cheats", "debugTools"] as const;
const allDisabledV1: DeepReadonly<RuntimeCapabilitiesV1> = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});

function decodeCapabilityStateV1(
  record: HostStoredRecordV1,
): DeepReadonly<RuntimeCapabilitiesV1> | null {
  const decoded = parseStrictJson(record.bytes, capabilityLimitsV1);
  if (!decoded.ok) return null;
  const value = decoded.value;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).length !== capabilityKeysV1.length ||
    Object.keys(value).toSorted().join("\0") !== capabilityKeysV1.join("\0")
  ) {
    return null;
  }
  const input = value as Record<string, unknown>;
  if (
    typeof input.debugTools !== "boolean" ||
    typeof input.cheats !== "boolean" ||
    typeof input.automationBridge !== "boolean"
  ) {
    return null;
  }
  return Object.freeze({
    debugTools: input.debugTools,
    cheats: input.cheats,
    automationBridge: input.automationBridge,
  });
}

function warnInvalidPreferenceV1(host: GameHostV1, record: HostStoredRecordV1): void {
  try {
    host.log.write("warn", "runtime_capabilities.invalid_preference", {
      namespace: "settings",
      key: "runtime-capabilities.v1",
      revision: record.revision,
      reason: "invalid_record",
    });
  } catch {
    // Logging is diagnostic-only and cannot make capability bootstrap fail.
  }
}

function readCapabilityStateV1(
  host: GameHostV1,
  record: HostStoredRecordV1 | null,
): DeepReadonly<RuntimeCapabilitiesV1> {
  if (record === null) return allDisabledV1;
  const decoded = decodeCapabilityStateV1(record);
  if (decoded !== null) return decoded;
  warnInvalidPreferenceV1(host, record);
  return allDisabledV1;
}

export async function createWebCapabilityPreferencesV1(
  host: GameHostV1,
): Promise<RuntimeCapabilityPortV1> {
  let revision: HostStoredRecordV1["revision"] | null = null;
  let initialState = allDisabledV1;
  let initialized = false;
  try {
    const record = await host.records.read("settings", capabilityKeyV1);
    revision = record?.revision ?? null;
    initialState = readCapabilityStateV1(host, record);
    initialized = true;
  } catch {
    // A failed initial read cannot safely guess the CAS revision.
  }

  return createRuntimeCapabilityPortV1({
    initialState,
    async persist(_previous, next) {
      if (!initialized) return Object.freeze({ kind: "unavailable" as const });
      let committed: Awaited<ReturnType<GameHostV1["records"]["commit"]>>;
      try {
        committed = await host.records.commit([
          Object.freeze({
            kind: "put" as const,
            namespace: "settings" as const,
            key: capabilityKeyV1,
            expectedRevision: revision,
            bytes: canonicalJsonBytes(next),
          }),
        ]);
      } catch {
        return Object.freeze({ kind: "unavailable" as const });
      }
      if (committed.kind === "committed") {
        const stored = committed.records.find(
          (record) => record.namespace === "settings" && record.key === capabilityKeyV1,
        );
        if (stored === undefined) return Object.freeze({ kind: "unavailable" as const });
        revision = stored.revision;
        return Object.freeze({ kind: "committed" as const });
      }

      let authoritativeRecord: HostStoredRecordV1 | null;
      try {
        authoritativeRecord = await host.records.read("settings", capabilityKeyV1);
      } catch {
        return Object.freeze({ kind: "unavailable" as const });
      }
      revision = authoritativeRecord?.revision ?? null;
      return Object.freeze({
        kind: "conflict" as const,
        state: readCapabilityStateV1(host, authoritativeRecord),
      });
    },
  });
}
