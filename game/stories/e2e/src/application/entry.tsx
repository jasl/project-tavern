// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameBootstrapControllerV1,
  createWebHostV1,
  mountGameApplicationV1,
} from "@sillymaker/web";

import { e2eBuildIdentityV1 } from "virtual:project-tavern/e2e-build-identity";
import { createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import { E2eApplicationRootV1 } from "./e2e-application-root.js";
import { e2eStoryEntryV1 } from "../index.js";

const root = document.querySelector("#root");
if (root === null) throw new TypeError("missing application root");

globalThis.addEventListener("hashchange", () => globalThis.location.reload());

if (globalThis.location.hash !== "" && globalThis.location.hash !== "#/play") {
  mountGameApplicationV1(root, <main>此入口不可用</main>);
} else {
  const host = createWebHostV1();
  const bootstrap = createGameBootstrapControllerV1({
    host,
    buildIdentity: e2eBuildIdentityV1,
  });
  const bootstrapped = await bootstrap(e2eStoryEntryV1, []);
  if (bootstrapped.kind !== "ready") {
    throw new TypeError(`E2e bootstrap failed: ${bootstrapped.code}`);
  }
  const resolvedGame = bootstrapped.resolved;
  const application = createE2eGameRuntimeV1({ resolved: resolvedGame, host });
  mountGameApplicationV1(
    root,
    <E2eApplicationRootV1 resolvedGame={resolvedGame} application={application} host={host} />,
  );
}
