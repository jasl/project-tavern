// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createUiContributionRegistryV1, GameShell } from "@sillymaker/ui";
import {
  createGameBootstrapControllerV1,
  createWebHostV1,
  mountGameApplicationV1,
} from "@sillymaker/web";
import { createE2eApplicationV1 } from "./create-e2e-application.js";
import type { E2eApplicationViewV1, E2ePlayerApplicationV1 } from "./create-e2e-application.js";
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
    buildIdentity: Object.freeze({
      engine: Object.freeze([]),
      storySimulation: Object.freeze([]),
      storyPresentation: Object.freeze([]),
      application: Object.freeze([]),
    }),
  });
  const bootstrapped = await bootstrap(e2eStoryEntryV1, []);
  if (bootstrapped.kind !== "ready")
    throw new TypeError(`E2e bootstrap failed: ${bootstrapped.code}`);
  const resolved = bootstrapped.resolved;
  const player = createE2eApplicationV1({ resolved, host });
  const presentation = Object.freeze({ label: "计数" });
  const contributions = createUiContributionRegistryV1<
    E2eApplicationViewV1,
    E2ePlayerApplicationV1,
    typeof presentation
  >({
    scenes: [{ id: "scene.e2e.counter", render: ({ view }) => <p>计数：{view.count}</p> }],
    overlays: [],
    hud: [{ id: "hud.e2e.counter", render: () => null }],
    gameSymbols: [],
  });
  mountGameApplicationV1(
    root,
    <GameShell
      view={player.view}
      playerPort={player}
      presentation={presentation}
      contributions={contributions}
      sceneId="scene.e2e.counter"
      hudId="hud.e2e.counter"
      incrementCommand={{ kind: "e2e.counter.increment" }}
      incrementLabel="增加计数"
    />,
  );
}
