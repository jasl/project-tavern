// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";
import {
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputContextIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouteResultV1,
  type InputRouterV1,
} from "./contracts.js";

const inputContextPrecedenceV1 = Object.freeze([
  "debug",
  "system",
  "overlay",
  "narrative",
  "interaction",
  "gameplay",
] as const satisfies readonly InputContextIdV1[]);

const inputContextIdsV1 = new Set<InputContextIdV1>(inputContextPrecedenceV1);

const handledResultsV1 = Object.freeze({
  debug: Object.freeze({ kind: "handled" as const, context: "debug" as const }),
  system: Object.freeze({ kind: "handled" as const, context: "system" as const }),
  overlay: Object.freeze({ kind: "handled" as const, context: "overlay" as const }),
  narrative: Object.freeze({ kind: "handled" as const, context: "narrative" as const }),
  interaction: Object.freeze({ kind: "handled" as const, context: "interaction" as const }),
  gameplay: Object.freeze({ kind: "handled" as const, context: "gameplay" as const }),
}) satisfies Readonly<Record<InputContextIdV1, InputRouteResultV1>>;

const focusLossEventV1 = Object.freeze({ kind: "focus_loss" as const });
const actionEventKeysV1 = Object.freeze(["kind", "actionId"] as const);
const viewportPointEventKeysV1 = Object.freeze([
  "kind",
  "phase",
  "point",
  "pointerId",
  "pointerType",
] as const);
const viewportPointKeysV1 = Object.freeze(["x", "y"] as const);
const pointerCancelEventKeysV1 = Object.freeze(["kind", "pointerId"] as const);
const focusLossEventKeysV1 = Object.freeze(["kind"] as const);

type InputHandlerV1 = (event: DeepReadonly<InputEventV1>) => InputHandlerResultV1;

interface InputHandlerRegistrationV1 {
  readonly handle: InputHandlerV1;
}

interface DispatchRegistrationV1 {
  readonly context: InputContextIdV1;
  readonly handle: InputHandlerV1;
}

function isInputContextIdV1(value: unknown): value is InputContextIdV1 {
  return typeof value === "string" && inputContextIdsV1.has(value as InputContextIdV1);
}

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeysV1(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Reflect.ownKeys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((expectedKey) => Object.hasOwn(value, expectedKey))
  );
}

function isNonNegativeSafeIntegerV1(value: unknown): boolean {
  try {
    parseNonNegativeSafeInteger(value);
    return true;
  } catch {
    return false;
  }
}

function isInputActionIdV1(value: unknown): boolean {
  try {
    parseInputActionIdV1(value as string);
    return true;
  } catch {
    return false;
  }
}

function assertInputEventV1(event: unknown): asserts event is DeepReadonly<InputEventV1> {
  if (!isRecordV1(event)) {
    throw new TypeError("ui.invalid_input_event");
  }

  switch (event.kind) {
    case "action":
      if (!hasExactOwnKeysV1(event, actionEventKeysV1) || !isInputActionIdV1(event.actionId)) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    case "viewport_point": {
      const point = event.point;
      if (
        !hasExactOwnKeysV1(event, viewportPointEventKeysV1) ||
        (event.phase !== "begin" && event.phase !== "activate") ||
        !isRecordV1(point) ||
        !hasExactOwnKeysV1(point, viewportPointKeysV1) ||
        typeof point.x !== "number" ||
        !Number.isFinite(point.x) ||
        typeof point.y !== "number" ||
        !Number.isFinite(point.y) ||
        !isNonNegativeSafeIntegerV1(event.pointerId) ||
        (event.pointerType !== "mouse" &&
          event.pointerType !== "touch" &&
          event.pointerType !== "pen")
      ) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    }
    case "pointer_cancel":
      if (
        !hasExactOwnKeysV1(event, pointerCancelEventKeysV1) ||
        !isNonNegativeSafeIntegerV1(event.pointerId)
      ) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    case "focus_loss":
      if (!hasExactOwnKeysV1(event, focusLossEventKeysV1)) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    default:
      throw new TypeError("ui.invalid_input_event");
  }
}

function assertHandlerResultV1(result: unknown): asserts result is InputHandlerResultV1 {
  if (!isRecordV1(result) || (result.kind !== "handled" && result.kind !== "ignored")) {
    throw new TypeError("ui.invalid_input_handler_result");
  }
}

function createRegistrationSnapshotV1(
  registrations: ReadonlyMap<InputContextIdV1, readonly InputHandlerRegistrationV1[]>,
): readonly DispatchRegistrationV1[] {
  const snapshot: DispatchRegistrationV1[] = [];
  for (const context of inputContextPrecedenceV1) {
    const contextRegistrations = registrations.get(context);
    if (contextRegistrations === undefined) continue;
    for (let index = contextRegistrations.length - 1; index >= 0; index -= 1) {
      const registration = contextRegistrations[index];
      if (registration !== undefined) {
        snapshot.push(Object.freeze({ context, handle: registration.handle }));
      }
    }
  }
  return Object.freeze(snapshot);
}

export function createInputRouterV1(): InputRouterV1 {
  const registrations = new Map<InputContextIdV1, InputHandlerRegistrationV1[]>();
  for (const context of inputContextPrecedenceV1) {
    registrations.set(context, []);
  }

  const route = (event: DeepReadonly<InputEventV1>): InputRouteResultV1 => {
    assertInputEventV1(event);
    const snapshot = createRegistrationSnapshotV1(registrations);
    for (const registration of snapshot) {
      const result = registration.handle(event);
      assertHandlerResultV1(result);
      if (result.kind === "handled") return handledResultsV1[registration.context];
    }
    return inputIgnoredV1;
  };

  return Object.freeze({
    register(registration: {
      readonly context: InputContextIdV1;
      readonly handle: InputHandlerV1;
    }): () => void {
      if (
        !isRecordV1(registration) ||
        !isInputContextIdV1(registration.context) ||
        typeof registration.handle !== "function"
      ) {
        throw new TypeError("ui.invalid_input_registration");
      }

      const contextRegistrations = registrations.get(registration.context);
      if (contextRegistrations === undefined) {
        throw new TypeError("ui.invalid_input_registration");
      }
      const record = Object.freeze({ handle: registration.handle });
      contextRegistrations.push(record);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const index = contextRegistrations.indexOf(record);
        if (index >= 0) contextRegistrations.splice(index, 1);
      };
    },
    route,
    clearTransientInput(): void {
      route(focusLossEventV1);
    },
  });
}
