// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "@sillymaker/base";

import { parseE2eChoiceV1, requireExactObjectV1, requirePlainObjectV1 } from "./state.js";

export type E2eGameplayFactV1 =
  | {
      readonly kind: "counter.changed";
      readonly before: NonNegativeSafeInteger;
      readonly after: NonNegativeSafeInteger;
    }
  | { readonly kind: "flow.started" }
  | { readonly kind: "flow.branch_selected"; readonly branch: "left" | "right" }
  | { readonly kind: "flow.blocked"; readonly blocked: boolean }
  | { readonly kind: "flow.resolved" }
  | { readonly kind: "run.completed" };

export const e2eGameplayFactSchemaV1: RuntimeSchemaV1<E2eGameplayFactV1> = Object.freeze({
  parse(value: unknown): E2eGameplayFactV1 {
    const input = requirePlainObjectV1(value, "E2E GameplayFact");
    const kind = input.kind;
    if (kind === "counter.changed") {
      const record = requireExactObjectV1(
        value,
        ["kind", "before", "after"],
        "E2E counter GameplayFact",
      );
      return Object.freeze({
        kind,
        before: parseNonNegativeSafeInteger(record.before),
        after: parseNonNegativeSafeInteger(record.after),
      });
    }
    if (kind === "flow.branch_selected") {
      const record = requireExactObjectV1(
        value,
        ["kind", "branch"],
        "E2E Flow branch GameplayFact",
      );
      return Object.freeze({ kind, branch: parseE2eChoiceV1(record.branch) });
    }
    if (kind === "flow.blocked") {
      const record = requireExactObjectV1(
        value,
        ["kind", "blocked"],
        "E2E Flow blocked GameplayFact",
      );
      if (typeof record.blocked !== "boolean") {
        throw new TypeError("invalid E2E Flow blocked GameplayFact");
      }
      return Object.freeze({ kind, blocked: record.blocked });
    }
    if (kind === "flow.started" || kind === "flow.resolved" || kind === "run.completed") {
      requireExactObjectV1(value, ["kind"], "E2E GameplayFact");
      return Object.freeze({ kind });
    }
    throw new TypeError("invalid E2E GameplayFact kind");
  },
});
