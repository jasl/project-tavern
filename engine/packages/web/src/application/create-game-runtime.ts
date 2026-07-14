// SPDX-License-Identifier: MIT
import type { GameHostV1, RuntimeCapabilityPortV1 } from "@sillymaker/base";

import { createWebCapabilityPreferencesV1 } from "../capabilities/web-capability-preferences.js";

export async function createGameRuntimeV1<TApplication>(input: {
  readonly host: GameHostV1;
  createApplication(input: { readonly capabilities: RuntimeCapabilityPortV1 }): TApplication;
}): Promise<TApplication> {
  const capabilities = await createWebCapabilityPreferencesV1(input.host);
  return input.createApplication(Object.freeze({ capabilities }));
}
