// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { PositiveSafeInteger, RuntimeSchemaV1 } from "@sillymaker/base";

import { parseE2eChoiceV1, requireExactObjectV1, requirePlainObjectV1 } from "./state.js";

export type E2eGameCommandV1 =
  | { readonly kind: "e2e.counter.increment" }
  | { readonly kind: "e2e.counter.roll"; readonly maximum: PositiveSafeInteger }
  | { readonly kind: "e2e.flow.start" }
  | { readonly kind: "e2e.flow.choose"; readonly choice: "left" | "right" }
  | { readonly kind: "e2e.flow.continue" }
  | { readonly kind: "e2e.run.complete" }
  | { readonly kind: "e2e.test.reject" }
  | { readonly kind: "e2e.test.fault" };

export type E2eDebugCommandV1 =
  | { readonly kind: "debug.e2e.counter.add"; readonly amount: PositiveSafeInteger }
  | { readonly kind: "debug.e2e.flow.set_blocked"; readonly blocked: boolean }
  | { readonly kind: "debug.e2e.test.validation_failed" }
  | { readonly kind: "debug.e2e.test.fault" };

const commandKindsWithoutPayloadV1 = new Set<E2eGameCommandV1["kind"]>([
  "e2e.counter.increment",
  "e2e.flow.start",
  "e2e.flow.continue",
  "e2e.run.complete",
  "e2e.test.reject",
  "e2e.test.fault",
]);

export const e2eGameCommandSchemaV1: RuntimeSchemaV1<E2eGameCommandV1> = Object.freeze({
  parse(value: unknown): E2eGameCommandV1 {
    const input = requirePlainObjectV1(value, "E2E GameCommand");
    const kind = input.kind;
    if (typeof kind !== "string") throw new TypeError("invalid E2E GameCommand kind");

    if (commandKindsWithoutPayloadV1.has(kind as E2eGameCommandV1["kind"])) {
      requireExactObjectV1(value, ["kind"], "E2E GameCommand");
      return Object.freeze({ kind }) as E2eGameCommandV1;
    }
    if (kind === "e2e.counter.roll") {
      const record = requireExactObjectV1(value, ["kind", "maximum"], "E2E roll command");
      const maximum = parsePositiveSafeInteger(record.maximum);
      if (maximum > 0x1_0000_0000) throw new TypeError("invalid E2E roll maximum");
      return Object.freeze({ kind, maximum });
    }
    if (kind === "e2e.flow.choose") {
      const record = requireExactObjectV1(value, ["kind", "choice"], "E2E choose command");
      return Object.freeze({ kind, choice: parseE2eChoiceV1(record.choice) });
    }
    throw new TypeError("invalid E2E GameCommand kind");
  },
});

export const e2eDebugCommandSchemaV1: RuntimeSchemaV1<E2eDebugCommandV1> = Object.freeze({
  parse(value: unknown): E2eDebugCommandV1 {
    const input = requirePlainObjectV1(value, "E2E DebugCommand");
    const kind = input.kind;
    if (kind === "debug.e2e.counter.add") {
      const record = requireExactObjectV1(value, ["kind", "amount"], "E2E counter DebugCommand");
      return Object.freeze({ kind, amount: parsePositiveSafeInteger(record.amount) });
    }
    if (kind === "debug.e2e.flow.set_blocked") {
      const record = requireExactObjectV1(value, ["kind", "blocked"], "E2E Flow DebugCommand");
      if (typeof record.blocked !== "boolean") {
        throw new TypeError("invalid E2E Flow DebugCommand blocked value");
      }
      return Object.freeze({ kind, blocked: record.blocked });
    }
    if (kind === "debug.e2e.test.validation_failed" || kind === "debug.e2e.test.fault") {
      requireExactObjectV1(value, ["kind"], "E2E test DebugCommand");
      return Object.freeze({ kind });
    }
    throw new TypeError("invalid E2E DebugCommand kind");
  },
});
