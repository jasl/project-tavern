// SPDX-License-Identifier: MIT
import type {
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityOperationResultV1,
  RuntimeCapabilityPortV1,
} from "../../contracts/application.js";
import type { DeepReadonly } from "../../contracts/values.js";

type CapabilityPersistenceResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "conflict";
      readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
    }
  | { readonly kind: "unavailable" };

const capabilityKeysV1 = ["automationBridge", "cheats", "debugTools"] as const;
const capabilityFieldsV1 = Object.freeze({
  debug_tools: "debugTools",
  cheats: "cheats",
  automation_bridge: "automationBridge",
} satisfies Record<RuntimeCapabilityIdV1, keyof RuntimeCapabilitiesV1>);

function parseRuntimeCapabilitiesV1(value: unknown): DeepReadonly<RuntimeCapabilitiesV1> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).length !== capabilityKeysV1.length
  ) {
    throw new TypeError("invalid RuntimeCapabilitiesV1");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== capabilityKeysV1.join("\0") ||
    capabilityKeysV1.some((key) => {
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !descriptor.enumerable ||
        typeof descriptor.value !== "boolean"
      );
    })
  ) {
    throw new TypeError("invalid RuntimeCapabilitiesV1");
  }
  const input = value as RuntimeCapabilitiesV1;
  return Object.freeze({
    debugTools: input.debugTools,
    cheats: input.cheats,
    automationBridge: input.automationBridge,
  });
}

function parseCapabilityIdV1(value: unknown): RuntimeCapabilityIdV1 {
  if (value !== "debug_tools" && value !== "cheats" && value !== "automation_bridge") {
    throw new TypeError("invalid RuntimeCapabilityIdV1");
  }
  return value;
}

export function createRuntimeCapabilityPortV1(input: {
  readonly initialState: DeepReadonly<RuntimeCapabilitiesV1>;
  persist(
    previous: DeepReadonly<RuntimeCapabilitiesV1>,
    next: DeepReadonly<RuntimeCapabilitiesV1>,
  ): Promise<CapabilityPersistenceResultV1>;
}): RuntimeCapabilityPortV1 {
  let current = parseRuntimeCapabilitiesV1(input.initialState);
  const listeners = new Set<() => void>();
  const state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1> = Object.freeze({
    getCurrent: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  const publish = (next: DeepReadonly<RuntimeCapabilitiesV1>): void => {
    current = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Capability publication is committed before notification and listeners are isolated.
      }
    }
  };

  let tail = Promise.resolve();
  const setEnabled = (
    capabilityValue: RuntimeCapabilityIdV1,
    enabledValue: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1> => {
    const operation = tail.then(async () => {
      const capability = parseCapabilityIdV1(capabilityValue);
      if (typeof enabledValue !== "boolean") {
        throw new TypeError("invalid RuntimeCapability enabled value");
      }
      const field = capabilityFieldsV1[capability];
      const previous = current;
      if (previous[field] === enabledValue) {
        return Object.freeze({ kind: "unchanged" as const, state: previous });
      }
      const next = parseRuntimeCapabilitiesV1({ ...previous, [field]: enabledValue });
      let persistence: CapabilityPersistenceResultV1;
      try {
        persistence = await input.persist(previous, next);
      } catch {
        return Object.freeze({
          kind: "rejected" as const,
          code: "unavailable" as const,
          state: previous,
        });
      }
      if (persistence.kind === "committed") {
        publish(next);
        return Object.freeze({ kind: "updated" as const, state: next });
      }
      if (persistence.kind === "conflict") {
        let authoritative: DeepReadonly<RuntimeCapabilitiesV1>;
        try {
          authoritative = parseRuntimeCapabilitiesV1(persistence.state);
        } catch {
          return Object.freeze({
            kind: "rejected" as const,
            code: "unavailable" as const,
            state: previous,
          });
        }
        if (
          authoritative.debugTools !== previous.debugTools ||
          authoritative.cheats !== previous.cheats ||
          authoritative.automationBridge !== previous.automationBridge
        ) {
          publish(authoritative);
        }
        return Object.freeze({
          kind: "rejected" as const,
          code: "conflict" as const,
          state: authoritative,
        });
      }
      return Object.freeze({
        kind: "rejected" as const,
        code: "unavailable" as const,
        state: previous,
      });
    });
    tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };

  return Object.freeze({ state, setEnabled });
}
