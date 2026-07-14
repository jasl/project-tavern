// SPDX-License-Identifier: MIT
import type { RunIntegrityReasonV1, RunIntegrityV1 } from "../../contracts/snapshot.js";
import { parseRunIntegrityReasonV1, runIntegrityV1Schema } from "../../contracts/snapshot.js";
import type { DeepReadonly } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";

export type IntegrityDirectiveV1 =
  | { readonly kind: "preserve_current" }
  | { readonly kind: "accept_replacement" }
  | { readonly kind: "mark_modified"; readonly reason: RunIntegrityReasonV1 };

export function markRunModifiedV1(
  integrityValue: RunIntegrityV1,
  reasonValue: RunIntegrityReasonV1,
): RunIntegrityV1 {
  const integrity = runIntegrityV1Schema.parse(integrityValue);
  const reason = parseRunIntegrityReasonV1(reasonValue);
  const mutationCount = parseNonNegativeSafeInteger(integrity.mutationCount + 1);
  const reasons = integrity.reasons.some(({ kind }) => kind === reason.kind)
    ? integrity.reasons
    : Object.freeze([...integrity.reasons, reason].slice(0, 16));
  return runIntegrityV1Schema.parse({
    mode: "modified",
    mutationCount,
    firstMutationSequence:
      integrity.firstMutationSequence === null ? reason.sequence : integrity.firstMutationSequence,
    reasons,
  });
}

export function finalizeSnapshotIntegrityV1<
  TSnapshot extends { readonly integrity: RunIntegrityV1 },
>(
  current: DeepReadonly<TSnapshot>,
  candidate: TSnapshot,
  directive: IntegrityDirectiveV1,
): TSnapshot {
  if (directive.kind === "accept_replacement") {
    runIntegrityV1Schema.parse(candidate.integrity);
    return candidate;
  }
  if (candidate.integrity !== current.integrity) {
    throw new TypeError("Story-owned Snapshot changed RunIntegrity");
  }
  if (directive.kind === "preserve_current") return candidate;
  return Object.freeze({
    ...candidate,
    integrity: markRunModifiedV1(current.integrity, directive.reason),
  }) as TSnapshot;
}
