// SPDX-License-Identifier: MIT
import type {
  GameHostV1,
  LeaseHandoffRequestId,
  RuntimeCapabilityPortV1,
  SessionLeaseOwnerId,
} from "@sillymaker/base";

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
  }): TApplication | PromiseLike<TApplication>;
}): Promise<TApplication> {
  const capabilities = await createWebCapabilityPreferencesV1(input.host);
  const persistenceIdentity: WebPersistenceIdentityV1 = Object.freeze({
    ownerId: input.host.bootstrapEntropy.nextUuidV4() as SessionLeaseOwnerId,
    nextHandoffRequestId: () => input.host.bootstrapEntropy.nextUuidV4() as LeaseHandoffRequestId,
  });
  return await input.createApplication(Object.freeze({ capabilities, persistenceIdentity }));
}
