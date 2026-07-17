// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityOperationResultV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";

export interface RuntimeCapabilitySessionOverlayV1 extends RuntimeCapabilityPortV1 {
  readonly persisted: RuntimeCapabilityPortV1;
  readonly sessionRequested: readonly RuntimeCapabilityIdV1[];
  dispose(): void;
}

const capabilityFieldsV1 = Object.freeze({
  debug_tools: "debugTools",
  cheats: "cheats",
  automation_bridge: "automationBridge",
} satisfies Record<RuntimeCapabilityIdV1, keyof RuntimeCapabilitiesV1>);

function freezeRequestedV1(
  requested: readonly RuntimeCapabilityIdV1[],
): readonly RuntimeCapabilityIdV1[] {
  const copy = [...requested];
  const seen = new Set<RuntimeCapabilityIdV1>();
  for (const capability of copy) {
    if (!Object.hasOwn(capabilityFieldsV1, capability)) {
      throw new TypeError("invalid RuntimeCapabilityIdV1 session request");
    }
    if (seen.has(capability)) {
      throw new TypeError("duplicate RuntimeCapabilityIdV1 session request");
    }
    seen.add(capability);
  }
  return Object.freeze(copy);
}

function createEffectiveStateV1(
  persisted: DeepReadonly<RuntimeCapabilitiesV1>,
  requested: ReadonlySet<RuntimeCapabilityIdV1>,
): DeepReadonly<RuntimeCapabilitiesV1> {
  return Object.freeze({
    debugTools: persisted.debugTools || requested.has("debug_tools"),
    cheats: persisted.cheats || requested.has("cheats"),
    automationBridge: persisted.automationBridge || requested.has("automation_bridge"),
  });
}

function statesEqualV1(
  left: DeepReadonly<RuntimeCapabilitiesV1>,
  right: DeepReadonly<RuntimeCapabilitiesV1>,
): boolean {
  return (
    left.debugTools === right.debugTools &&
    left.cheats === right.cheats &&
    left.automationBridge === right.automationBridge
  );
}

function mapOperationResultV1(
  result: RuntimeCapabilityOperationResultV1,
  requested: ReadonlySet<RuntimeCapabilityIdV1>,
): RuntimeCapabilityOperationResultV1 {
  const state = createEffectiveStateV1(result.state, requested);
  if (result.kind === "rejected") {
    return Object.freeze({ kind: result.kind, code: result.code, state });
  }
  return Object.freeze({ kind: result.kind, state });
}

/** Composes persisted preferences with immutable page-session requests. */
export function createRuntimeCapabilitySessionOverlayV1(
  persisted: RuntimeCapabilityPortV1,
  requestedInput: readonly RuntimeCapabilityIdV1[],
): RuntimeCapabilitySessionOverlayV1 {
  const sessionRequested = freezeRequestedV1(requestedInput);
  const requested = new Set(sessionRequested);
  let current = createEffectiveStateV1(persisted.state.getCurrent(), requested);
  let disposed = false;
  const listeners = new Set<() => void>();

  const publishPersistedStateV1 = (): void => {
    if (disposed) return;
    const next = createEffectiveStateV1(persisted.state.getCurrent(), requested);
    if (statesEqualV1(current, next)) return;
    current = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Effective capability state commits before isolated listener notification.
      }
    }
  };
  const unsubscribePersisted = persisted.state.subscribe(publishPersistedStateV1);
  const state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1> = Object.freeze({
    getCurrent: () => current,
    subscribe(listener: () => void) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  });

  const setEnabled = async (
    capability: RuntimeCapabilityIdV1,
    enabled: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1> => {
    const result = await persisted.setEnabled(capability, enabled);
    return mapOperationResultV1(result, requested);
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    try {
      unsubscribePersisted();
    } catch {
      // A Host-owned source cannot prevent local listener release during teardown.
    } finally {
      listeners.clear();
    }
  };

  return Object.freeze({ persisted, sessionRequested, state, setEnabled, dispose });
}
