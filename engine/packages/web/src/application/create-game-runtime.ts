// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  LeaseHandoffRequestId,
  RuntimeCapabilityPortV1,
  RuntimeSchemaV1,
  SessionLeaseOwnerId,
} from "@sillymaker/base";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
  createRuntimeHmrInvalidationReporterV1,
  type RuntimeFailureBufferV1,
} from "@sillymaker/base/runtime";

import { createWebCapabilityPreferencesV1 } from "../capabilities/web-capability-preferences.js";
import type { WebRuntimeRebootstrapLifecycleV1 } from "./resolved-game-hmr.js";

type WebUiContextProviderV1<TUiContext> =
  | {
      readonly uiContextSchema: RuntimeSchemaV1<TUiContext>;
      readonly readUiContext: () => unknown;
    }
  | {
      readonly uiContextSchema?: undefined;
      readonly readUiContext?: undefined;
    };

export interface WebPersistenceIdentityV1 {
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
}

export interface WebGameRuntimeCompositionV1<TDisposition, TUiContext = never> {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly persistenceIdentity: WebPersistenceIdentityV1;
  readonly runtimeFailures: RuntimeFailureBufferV1;
  readonly uiContextSchema?: RuntimeSchemaV1<TUiContext>;
  readonly readUiContext?: () => unknown;
  reportObserverFailure(error: unknown): void;
  reportHmrInvalidated(): void;
  registerRebootstrapLifecycle(lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>): void;
}

/** Hydrates Host state and composes one application while keeping HMR owner authority out-of-band. */
export async function createGameRuntimeV1<TApplication, TDisposition = unknown, TUiContext = never>(
  input: {
    readonly host: GameHostV1;
    createApplication(
      input: WebGameRuntimeCompositionV1<TDisposition, TUiContext>,
    ): TApplication | PromiseLike<TApplication>;
    onRebootstrapLifecycle?(
      lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>,
    ): void | PromiseLike<void>;
  } & WebUiContextProviderV1<TUiContext>,
): Promise<TApplication> {
  const uiContextSchema = input.uiContextSchema;
  const readUiContext = input.readUiContext;
  if ((uiContextSchema === undefined) !== (readUiContext === undefined)) {
    throw new TypeError("Web UI-context schema and reader must be supplied together");
  }
  const uiContextProvider = Object.freeze(
    uiContextSchema === undefined || readUiContext === undefined
      ? {}
      : { uiContextSchema, readUiContext },
  );
  const capabilities = await createWebCapabilityPreferencesV1(input.host);
  const persistenceIdentity: WebPersistenceIdentityV1 = Object.freeze({
    ownerId: input.host.bootstrapEntropy.nextUuidV4() as SessionLeaseOwnerId,
    nextHandoffRequestId: () => input.host.bootstrapEntropy.nextUuidV4() as LeaseHandoffRequestId,
  });
  const runtimeFailures = createRuntimeFailureBufferV1();
  const reportObserverFailure = createRuntimeFailureReporterV1({
    failures: runtimeFailures,
    now: () => input.host.metadataClock.now(),
    operation: "runtime.observer_notification_failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });
  const reportHmrInvalidated = createRuntimeHmrInvalidationReporterV1({
    failures: runtimeFailures,
    now: () => input.host.metadataClock.now(),
  });
  let registeredLifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition> | undefined;
  const registerRebootstrapLifecycle = (
    lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>,
  ): void => {
    if (registeredLifecycle !== undefined) {
      throw new TypeError("Web runtime HMR lifecycle is already registered");
    }
    registeredLifecycle = Object.freeze({
      invalidationController: lifecycle.invalidationController,
      disposeForRebootstrap: async () => await lifecycle.disposeForRebootstrap(),
    });
  };
  try {
    const application = await input.createApplication(
      Object.freeze({
        capabilities,
        persistenceIdentity,
        runtimeFailures,
        ...uiContextProvider,
        reportObserverFailure,
        reportHmrInvalidated,
        registerRebootstrapLifecycle,
      }),
    );
    if (input.onRebootstrapLifecycle !== undefined) {
      if (registeredLifecycle === undefined) {
        throw new TypeError("Web application did not register an HMR lifecycle");
      }
      await input.onRebootstrapLifecycle(registeredLifecycle);
    }
    return application;
  } catch (error) {
    if (registeredLifecycle !== undefined) {
      try {
        await registeredLifecycle.disposeForRebootstrap();
      } catch {
        // The construction or handoff failure remains authoritative over best-effort cleanup.
      }
    }
    throw error;
  }
}
