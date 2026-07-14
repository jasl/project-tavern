// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly } from "@sillymaker/base";

import type { E2eDebugCommandV1 } from "../gameplay/contracts/index.js";

export const e2eDebugCommandKindsV1 = Object.freeze([
  "debug.e2e.counter.add",
  "debug.e2e.flow.set_blocked",
  "debug.e2e.test.validation_failed",
  "debug.e2e.test.fault",
] as const satisfies readonly E2eDebugCommandV1["kind"][]);

function unsupportedFormKindV1(_form: never): never {
  throw new TypeError("unsupported E2E DebugCommand form kind");
}

/**
 * Copies one controlled form DTO into the already-declared Gameplay DebugCommand union.
 * Gameplay schema, range/current-State validation, and execution remain on GameSimulation.
 */
function toE2eDebugCommandV1(form: DeepReadonly<E2eDebugCommandV1>): E2eDebugCommandV1 {
  switch (form.kind) {
    case "debug.e2e.counter.add":
      return Object.freeze({ kind: form.kind, amount: form.amount });
    case "debug.e2e.flow.set_blocked":
      return Object.freeze({ kind: form.kind, blocked: form.blocked });
    case "debug.e2e.test.validation_failed":
    case "debug.e2e.test.fault":
      return Object.freeze({ kind: form.kind });
  }
  return unsupportedFormKindV1(form);
}

export const e2eDebugCommandFormAdapterV1 = Object.freeze({
  kinds: e2eDebugCommandKindsV1,
  toCommand: toE2eDebugCommandV1,
});
