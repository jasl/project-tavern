// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger } from "@sillymaker/base";

import type { BrowserAutomationBridgeV1 } from "./browser-automation-bridge.js";

interface BrowserAutomationGlobalPublicationV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly status: unknown;
  readonly game: unknown;
  readonly narrative: unknown;
  readonly actions: readonly unknown[];
}

declare global {
  // eslint-disable-next-line no-underscore-dangle -- The public ABI fixes this global name.
  var __SILLYMAKER_AUTOMATION_V1__:
    | BrowserAutomationBridgeV1<BrowserAutomationGlobalPublicationV1, unknown, unknown, unknown>
    | undefined;
}

export {};
