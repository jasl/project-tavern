// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  LeaseHandoffRequestId,
  RuntimeCapabilityPortV1,
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

export interface WebPersistenceIdentityV1 {
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
}

export interface WebGameRuntimeCompositionV1<TDisposition> {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly persistenceIdentity: WebPersistenceIdentityV1;
  readonly runtimeFailures: RuntimeFailureBufferV1;
  reportObserverFailure(error: unknown): void;
  reportHmrInvalidated(): void;
  registerRebootstrapLifecycle(lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>): void;
}

/** Hydrates Host state and composes one application while keeping HMR owner authority out-of-band. */
export async function createGameRuntimeV1<TApplication, TDisposition = unknown>(input: {
  readonly host: GameHostV1;
  createApplication(
    input: WebGameRuntimeCompositionV1<TDisposition>,
  ): TApplication | PromiseLike<TApplication>;
  onRebootstrapLifecycle?(
    lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>,
  ): void | PromiseLike<void>;
}): Promise<TApplication> {
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
