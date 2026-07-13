// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { DevelopmentPanel } from "@sillymaker/web/developer";
import { mountGameApplicationV1 } from "@sillymaker/web";
import { e2eToolingEntryV1 } from "../development.js";

if (globalThis.location.hash === "#/playground") {
  const root = document.querySelector("#root");
  if (root === null) throw new TypeError("missing application root");
  const fixtureCount = e2eToolingEntryV1.defineToolingSupport().fixtures.length;
  mountGameApplicationV1(root, <DevelopmentPanel>E2E fixtures：{fixtureCount}</DevelopmentPanel>);
} else {
  await import("./player-entry.js");
}
