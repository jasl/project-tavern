// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  RuntimeCapabilityPortV1,
  SemanticGamePortV1,
  SemanticPublicationV1,
} from "@sillymaker/base";

const automationGlobalKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";
const capabilityDisabledV1 = Object.freeze({ kind: "capability_disabled" as const });

let liveOwnerTokenV1: object | undefined;

export type BrowserAutomationOperationResultV1<T> =
  | { readonly kind: "ok"; readonly value: DeepReadonly<T> }
  | { readonly kind: "capability_disabled" };

export interface BrowserAutomationBridgeV1<
  TPublication extends { readonly actions: readonly unknown[] },
  TInvocation,
  TPreview,
  TResult,
> {
  readonly contractRevision: 1;
  observe(): BrowserAutomationOperationResultV1<TPublication>;
  availableActions(): BrowserAutomationOperationResultV1<TPublication["actions"]>;
  preview(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TPreview>>;
  dispatch(
    invocation: DeepReadonly<TInvocation>,
  ): Promise<BrowserAutomationOperationResultV1<TResult>>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<BrowserAutomationOperationResultV1<TPublication>>;
}

export interface InstalledBrowserAutomationBridgeV1 {
  dispose(): void;
}

interface AutomationGenerationV1<TBridge> {
  readonly token: object;
  readonly facade: TBridge;
  revoked: boolean;
}

function successfulOperationV1<T>(value: DeepReadonly<T>): BrowserAutomationOperationResultV1<T> {
  return Object.freeze({ kind: "ok" as const, value });
}

/**
 * Installs one capability-gated facade for the supplied Story-specialized SemanticGamePort.
 * Captured facades remain revocable even after their global property has been removed.
 */
export function installBrowserAutomationBridgeV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus,
>(input: {
  readonly semantic: SemanticGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TStatus
  >;
  readonly capabilities: RuntimeCapabilityPortV1;
}): InstalledBrowserAutomationBridgeV1 {
  type Publication = SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>;
  type Bridge = BrowserAutomationBridgeV1<Publication, TInvocation, TPreview, TResult>;

  if (liveOwnerTokenV1 !== undefined || Object.hasOwn(globalThis, automationGlobalKeyV1)) {
    throw new Error("automation.bridge_already_installed");
  }

  const ownerToken = Object.freeze({});
  liveOwnerTokenV1 = ownerToken;
  const generations = new Set<AutomationGenerationV1<Bridge>>();
  let currentGeneration: AutomationGenerationV1<Bridge> | undefined;
  let currentGenerationToken: object | undefined;
  let disposed = false;
  let unsubscribeCapabilities: (() => void) | undefined;

  const deleteOwnedGlobalV1 = (generation: AutomationGenerationV1<Bridge>): void => {
    if (liveOwnerTokenV1 !== ownerToken) return;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, automationGlobalKeyV1);
    if (descriptor?.value !== generation.facade) return;
    Reflect.deleteProperty(globalThis, automationGlobalKeyV1);
  };

  const isGenerationAdmittedV1 = (generation: AutomationGenerationV1<Bridge>): boolean =>
    !disposed &&
    !generation.revoked &&
    generation.token === currentGenerationToken &&
    liveOwnerTokenV1 === ownerToken &&
    input.capabilities.state.getCurrent().automationBridge;

  const revokeCurrentGenerationV1 = (): void => {
    const generation = currentGeneration;
    if (generation === undefined) return;
    generation.revoked = true;
    currentGeneration = undefined;
    currentGenerationToken = undefined;
    deleteOwnedGlobalV1(generation);
  };

  const createGenerationV1 = (): AutomationGenerationV1<Bridge> => {
    const token = Object.freeze({});
    let generation!: AutomationGenerationV1<Bridge>;

    const admittedAsyncV1 = <T>(
      operation: () => Promise<T>,
    ): Promise<BrowserAutomationOperationResultV1<T>> => {
      if (!isGenerationAdmittedV1(generation)) {
        return Promise.resolve(capabilityDisabledV1);
      }
      let admitted: Promise<T>;
      try {
        admitted = operation();
      } catch (error) {
        return Promise.reject(error);
      }
      return Promise.resolve(admitted).then((value) =>
        successfulOperationV1(value as DeepReadonly<T>),
      );
    };

    const facade: Bridge = Object.freeze({
      contractRevision: 1 as const,
      observe(): BrowserAutomationOperationResultV1<Publication> {
        if (!isGenerationAdmittedV1(generation)) return capabilityDisabledV1;
        return successfulOperationV1<Publication>(input.semantic.observe());
      },
      availableActions(): BrowserAutomationOperationResultV1<Publication["actions"]> {
        if (!isGenerationAdmittedV1(generation)) return capabilityDisabledV1;
        return successfulOperationV1<Publication["actions"]>(
          input.semantic.availableActions() as DeepReadonly<Publication["actions"]>,
        );
      },
      preview(
        invocation: DeepReadonly<TInvocation>,
      ): Promise<BrowserAutomationOperationResultV1<TPreview>> {
        return admittedAsyncV1(() => input.semantic.preview(invocation));
      },
      dispatch(
        invocation: DeepReadonly<TInvocation>,
      ): Promise<BrowserAutomationOperationResultV1<TResult>> {
        return admittedAsyncV1(() => input.semantic.dispatch(invocation));
      },
      waitForIdle(
        afterRevision?: NonNegativeSafeInteger,
      ): Promise<BrowserAutomationOperationResultV1<Publication>> {
        return admittedAsyncV1(
          () => input.semantic.waitForIdle(afterRevision) as Promise<Publication>,
        );
      },
    });

    generation = { token, facade, revoked: false };
    return generation;
  };

  const installCurrentGenerationV1 = (): void => {
    if (disposed || currentGeneration !== undefined) return;
    if (Object.hasOwn(globalThis, automationGlobalKeyV1)) {
      throw new Error("automation.bridge_already_installed");
    }
    const generation = createGenerationV1();
    generations.add(generation);
    currentGeneration = generation;
    currentGenerationToken = generation.token;
    try {
      Object.defineProperty(globalThis, automationGlobalKeyV1, {
        configurable: true,
        enumerable: false,
        value: generation.facade,
        writable: false,
      });
    } catch (error) {
      generation.revoked = true;
      currentGeneration = undefined;
      currentGenerationToken = undefined;
      throw error;
    }
  };

  const reconcileCapabilityV1 = (): void => {
    if (disposed) return;
    if (input.capabilities.state.getCurrent().automationBridge) {
      installCurrentGenerationV1();
      return;
    }
    revokeCurrentGenerationV1();
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    const current = currentGeneration;
    for (const generation of generations) generation.revoked = true;
    currentGeneration = undefined;
    currentGenerationToken = undefined;
    if (current !== undefined) deleteOwnedGlobalV1(current);
    try {
      unsubscribeCapabilities?.();
    } finally {
      unsubscribeCapabilities = undefined;
      if (liveOwnerTokenV1 === ownerToken) liveOwnerTokenV1 = undefined;
    }
  };

  try {
    unsubscribeCapabilities = input.capabilities.state.subscribe(reconcileCapabilityV1);
    reconcileCapabilityV1();
  } catch (error) {
    dispose();
    throw error;
  }

  return Object.freeze({ dispose });
}
