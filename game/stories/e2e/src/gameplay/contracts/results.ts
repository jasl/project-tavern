// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { RuntimeSchemaV1 } from "@sillymaker/base";

import { requireExactObjectV1, requirePlainObjectV1 } from "./state.js";

export type E2eRejectionReasonV1 =
  | { readonly code: "counter.value_out_of_range" }
  | { readonly code: "flow.not_idle" }
  | { readonly code: "flow.not_choosing" }
  | { readonly code: "flow.not_blocked" }
  | { readonly code: "flow.block_state_conflict" }
  | { readonly code: "run.not_active" }
  | { readonly code: "run.not_terminal" }
  | { readonly code: "game.run_complete" }
  | { readonly code: "test.rejected" };

export type E2eGameplayFaultV1 =
  | { readonly code: "e2e.test.fault" }
  | { readonly code: "e2e.owner.contract_invalid" }
  | { readonly code: "e2e.runtime.unexpected" };

export type E2eDebugValidationErrorV1 =
  | {
      readonly code: "debug.e2e.value_out_of_range";
      readonly commandKind: "debug.e2e.counter.add";
    }
  | {
      readonly code: "debug.e2e.state_conflict";
      readonly commandKind: "debug.e2e.flow.set_blocked";
    }
  | {
      readonly code: "debug.e2e.test_validation_failed";
      readonly commandKind: "debug.e2e.test.validation_failed";
    };

const rejectionCodesV1 = new Set<E2eRejectionReasonV1["code"]>([
  "counter.value_out_of_range",
  "flow.not_idle",
  "flow.not_choosing",
  "flow.not_blocked",
  "flow.block_state_conflict",
  "run.not_active",
  "run.not_terminal",
  "game.run_complete",
  "test.rejected",
]);

const faultCodesV1 = new Set<E2eGameplayFaultV1["code"]>([
  "e2e.test.fault",
  "e2e.owner.contract_invalid",
  "e2e.runtime.unexpected",
]);

export const e2eRejectionReasonSchemaV1: RuntimeSchemaV1<E2eRejectionReasonV1> = Object.freeze({
  parse(value: unknown): E2eRejectionReasonV1 {
    const record = requireExactObjectV1(value, ["code"], "E2E rejection reason");
    if (!rejectionCodesV1.has(record.code as E2eRejectionReasonV1["code"])) {
      throw new TypeError("invalid E2E rejection reason code");
    }
    return Object.freeze({ code: record.code }) as E2eRejectionReasonV1;
  },
});

export const e2eGameplayFaultSchemaV1: RuntimeSchemaV1<E2eGameplayFaultV1> = Object.freeze({
  parse(value: unknown): E2eGameplayFaultV1 {
    const record = requireExactObjectV1(value, ["code"], "E2E Gameplay fault");
    if (!faultCodesV1.has(record.code as E2eGameplayFaultV1["code"])) {
      throw new TypeError("invalid E2E Gameplay fault code");
    }
    return Object.freeze({ code: record.code }) as E2eGameplayFaultV1;
  },
});

export const e2eDebugValidationErrorSchemaV1: RuntimeSchemaV1<E2eDebugValidationErrorV1> =
  Object.freeze({
    parse(value: unknown): E2eDebugValidationErrorV1 {
      const input = requirePlainObjectV1(value, "E2E Debug validation error");
      const record = requireExactObjectV1(
        value,
        ["code", "commandKind"],
        "E2E Debug validation error",
      );
      if (
        (input.code === "debug.e2e.value_out_of_range" &&
          record.commandKind === "debug.e2e.counter.add") ||
        (input.code === "debug.e2e.state_conflict" &&
          record.commandKind === "debug.e2e.flow.set_blocked") ||
        (input.code === "debug.e2e.test_validation_failed" &&
          record.commandKind === "debug.e2e.test.validation_failed")
      ) {
        return Object.freeze({
          code: input.code,
          commandKind: record.commandKind,
        }) as E2eDebugValidationErrorV1;
      }
      throw new TypeError("invalid E2E Debug validation error");
    },
  });
