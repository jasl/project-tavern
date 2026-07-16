// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  findUnknownContentMaturityFlagsV1,
  parseContentMaturityFlagsV1,
  parseContentPreferenceV1,
  parsePositiveSafeInteger,
  parseStrictJson,
  parseStrictJsonLimitsV1,
} from "@sillymaker/base";
import type {
  ContentMaturityFlagsV1,
  ContentMaturityPolicyV1,
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  HostAtomicRecordStoreV1,
  HostStoredRecordV1,
  PositiveSafeInteger,
  StoryId,
} from "@sillymaker/base";

type HostRecordKeyV1 = Parameters<HostAtomicRecordStoreV1["read"]>[1];
type HostRecordRevisionV1 = HostStoredRecordV1["revision"];

const contentPreferenceRecordRevisionV1 = 1 as const;
const contentPreferenceJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 512,
  maxDepth: 2,
  maxArrayItems: 1,
  maxObjectMembers: 5,
  maxNodes: 6,
  maxStringBytes: 96,
});

function contentPreferenceRecordKeyV1(storyId: StoryId): HostRecordKeyV1 {
  return `content-maturity.v1:${storyId}` as HostRecordKeyV1;
}

interface ContentPreferenceRecordV1 {
  readonly contractRevision: 1;
  readonly storyId: StoryId;
  readonly policyRevision: PositiveSafeInteger;
  readonly allowedFlags: ContentMaturityFlagsV1;
}

type ContentPreferenceWarningV1 =
  | {
      readonly code: "content_preference.record_invalid";
      readonly storyId: StoryId;
      readonly reason: "non_canonical" | "shape" | "contract_revision" | "mask";
    }
  | {
      readonly code: "content_preference.story_mismatch";
      readonly storyId: StoryId;
      readonly storedStoryId: string;
    }
  | {
      readonly code: "content_preference.policy_mismatch";
      readonly storyId: StoryId;
      readonly storedPolicyRevision: PositiveSafeInteger;
      readonly activePolicyRevision: PositiveSafeInteger;
      readonly storedAllowedFlags: ContentMaturityFlagsV1;
    }
  | {
      readonly code: "content_preference.unknown_flags";
      readonly storyId: StoryId;
      readonly storedAllowedFlags: ContentMaturityFlagsV1;
      readonly unknownFlags: ContentMaturityFlagsV1;
    }
  | { readonly code: "content_preference.subscriber_failed"; readonly storyId: StoryId };

interface CreateWebContentPreferencePortInputV1 {
  readonly records: HostAtomicRecordStoreV1;
  readonly storyId: StoryId;
  readonly policy: DeepReadonly<ContentMaturityPolicyV1>;
  readonly reportWarning: (warning: DeepReadonly<ContentPreferenceWarningV1>) => void;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function isExactPreferenceRecordShapeV1(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).toSorted().join("\0") ===
      ["allowedFlags", "contractRevision", "policyRevision", "storyId"].toSorted().join("\0")
  );
}

function createDefaultPreferenceV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
): DeepReadonly<ContentPreferenceV1> {
  return Object.freeze({ allowedFlags: policy.defaultAllowedFlags });
}

function decodePreferenceOrDefaultV1(
  stored: HostStoredRecordV1 | null,
  storyId: StoryId,
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  reportWarning: (warning: DeepReadonly<ContentPreferenceWarningV1>) => void,
): DeepReadonly<ContentPreferenceV1> {
  const fallback = () => createDefaultPreferenceV1(policy);
  if (stored === null) return fallback();

  const decoded = parseStrictJson(stored.bytes, contentPreferenceJsonLimitsV1);
  if (!decoded.ok) {
    reportWarning({
      code: "content_preference.record_invalid",
      storyId,
      reason: "non_canonical",
    });
    return fallback();
  }
  if (!bytesEqualV1(stored.bytes, canonicalJsonBytes(decoded.value))) {
    reportWarning({
      code: "content_preference.record_invalid",
      storyId,
      reason: "non_canonical",
    });
    return fallback();
  }
  if (!isExactPreferenceRecordShapeV1(decoded.value)) {
    reportWarning({ code: "content_preference.record_invalid", storyId, reason: "shape" });
    return fallback();
  }
  if (decoded.value.contractRevision !== contentPreferenceRecordRevisionV1) {
    reportWarning({
      code: "content_preference.record_invalid",
      storyId,
      reason: "contract_revision",
    });
    return fallback();
  }
  if (typeof decoded.value.storyId !== "string") {
    reportWarning({ code: "content_preference.record_invalid", storyId, reason: "shape" });
    return fallback();
  }
  if (decoded.value.storyId !== storyId) {
    reportWarning({
      code: "content_preference.story_mismatch",
      storyId,
      storedStoryId: decoded.value.storyId,
    });
    return fallback();
  }

  let policyRevision: PositiveSafeInteger;
  try {
    policyRevision = parsePositiveSafeInteger(decoded.value.policyRevision);
  } catch {
    reportWarning({ code: "content_preference.record_invalid", storyId, reason: "shape" });
    return fallback();
  }

  let allowedFlags: ContentMaturityFlagsV1;
  try {
    allowedFlags = parseContentMaturityFlagsV1(decoded.value.allowedFlags);
  } catch {
    reportWarning({ code: "content_preference.record_invalid", storyId, reason: "mask" });
    return fallback();
  }
  if (policyRevision !== policy.policyRevision) {
    reportWarning({
      code: "content_preference.policy_mismatch",
      storyId,
      storedPolicyRevision: policyRevision,
      activePolicyRevision: policy.policyRevision,
      storedAllowedFlags: allowedFlags,
    });
    return fallback();
  }
  const unknownFlags = findUnknownContentMaturityFlagsV1(policy, allowedFlags);
  if (unknownFlags !== 0) {
    reportWarning({
      code: "content_preference.unknown_flags",
      storyId,
      storedAllowedFlags: allowedFlags,
      unknownFlags,
    });
    return fallback();
  }
  return Object.freeze({ allowedFlags });
}

function parseContentPreferenceForPolicyResultV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  value: unknown,
):
  | { readonly kind: "parsed"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | { readonly kind: "invalid_preference" }
  | { readonly kind: "unknown_flags"; readonly unknownFlags: ContentMaturityFlagsV1 } {
  let preference: ContentPreferenceV1;
  try {
    preference = parseContentPreferenceV1(value);
  } catch {
    return Object.freeze({ kind: "invalid_preference" as const });
  }
  const unknownFlags = findUnknownContentMaturityFlagsV1(policy, preference.allowedFlags);
  return unknownFlags === 0
    ? Object.freeze({ kind: "parsed" as const, preference: Object.freeze({ ...preference }) })
    : Object.freeze({ kind: "unknown_flags" as const, unknownFlags });
}

function storageFailureV1(): ContentPreferenceSetResultV1 {
  return Object.freeze({
    kind: "failed" as const,
    code: "content_preference.storage_failed" as const,
  });
}

export async function createWebContentPreferencePortV1(
  input: CreateWebContentPreferencePortInputV1,
): Promise<ContentPreferencePortV1> {
  const key = contentPreferenceRecordKeyV1(input.storyId);
  const reportWarning = (
    warning: Parameters<CreateWebContentPreferencePortInputV1["reportWarning"]>[0],
  ) => {
    try {
      input.reportWarning(warning);
    } catch {
      // Diagnostics are best effort and cannot change a preference outcome.
    }
  };
  const stored = await input.records.read("settings", key);
  let current = decodePreferenceOrDefaultV1(stored, input.storyId, input.policy, reportWarning);
  let currentRevision = stored?.revision ?? null;
  let tail = Promise.resolve();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        reportWarning({ code: "content_preference.subscriber_failed", storyId: input.storyId });
      }
    }
  };

  const persist = async (next: unknown): Promise<ContentPreferenceSetResultV1> => {
    const parsed = parseContentPreferenceForPolicyResultV1(input.policy, next);
    if (parsed.kind === "invalid_preference") {
      return Object.freeze({
        kind: "rejected" as const,
        code: "content_maturity.invalid_preference" as const,
      });
    }
    if (parsed.kind === "unknown_flags") {
      return Object.freeze({
        kind: "rejected" as const,
        code: "content_maturity.unknown_flags" as const,
      });
    }

    const bytes = canonicalJsonBytes({
      contractRevision: contentPreferenceRecordRevisionV1,
      storyId: input.storyId,
      policyRevision: input.policy.policyRevision,
      allowedFlags: parsed.preference.allowedFlags,
    } satisfies ContentPreferenceRecordV1);
    const commitAt = (expectedRevision: HostRecordRevisionV1 | null) =>
      input.records.commit([
        Object.freeze({
          kind: "put" as const,
          namespace: "settings" as const,
          key,
          expectedRevision,
          bytes,
        }),
      ]);

    try {
      let result = await commitAt(currentRevision);
      if (result.kind === "conflict") {
        const latest = await input.records.read("settings", key);
        result = await commitAt(latest?.revision ?? null);
      }
      if (result.kind !== "committed") return storageFailureV1();
      const committed =
        result.records.length === 1
          ? result.records.find(
              (record) =>
                record.namespace === "settings" &&
                record.key === key &&
                bytesEqualV1(record.bytes, bytes),
            )
          : undefined;
      if (committed === undefined) return storageFailureV1();

      currentRevision = committed.revision;
      current = Object.freeze({ allowedFlags: parsed.preference.allowedFlags });
      notify();
      return Object.freeze({ kind: "updated" as const, preference: current });
    } catch {
      return storageFailureV1();
    }
  };

  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: DeepReadonly<ContentPreferenceV1>) {
      const operation = tail.then(() => persist(next));
      tail = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  });
}
