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
  type RuntimeFailureBufferV1,
} from "@sillymaker/base/runtime";

import { createWebCapabilityPreferencesV1 } from "../capabilities/web-capability-preferences.js";

export interface WebPersistenceIdentityV1 {
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
}

export async function createGameRuntimeV1<TApplication>(input: {
  readonly host: GameHostV1;
  createApplication(input: {
    readonly capabilities: RuntimeCapabilityPortV1;
    readonly persistenceIdentity: WebPersistenceIdentityV1;
    readonly runtimeFailures: RuntimeFailureBufferV1;
    reportObserverFailure(error: unknown): void;
  }): TApplication | PromiseLike<TApplication>;
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
  return await input.createApplication(
    Object.freeze({
      capabilities,
      persistenceIdentity,
      runtimeFailures,
      reportObserverFailure,
    }),
  );
}
