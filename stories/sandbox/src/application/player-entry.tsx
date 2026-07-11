// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createUiContributionRegistryV1, GameShell } from "@project-tavern/ui";
import {
  createGameBootstrapControllerV1,
  createWebHostV1,
  mountGameApplicationV1,
} from "@project-tavern/web";
import { createSandboxApplicationV1 } from "./create-sandbox-application.js";
import type {
  SandboxApplicationViewV1,
  SandboxPlayerApplicationV1,
} from "./create-sandbox-application.js";
import { sandboxStoryEntryV1 } from "../index.js";
import type { SandboxResolvedStoryV1 } from "../story-entry.js";

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
  const bootstrapped = await bootstrap(sandboxStoryEntryV1, []);
  if (bootstrapped.kind !== "ready")
    throw new TypeError(`Sandbox bootstrap failed: ${bootstrapped.code}`);
  const resolved = bootstrapped.resolved as SandboxResolvedStoryV1;
  const player = createSandboxApplicationV1({ resolved, host });
  const presentation = Object.freeze({ label: "计数" });
  const contributions = createUiContributionRegistryV1<
    SandboxApplicationViewV1,
    SandboxPlayerApplicationV1,
    typeof presentation
  >({
    scenes: [{ id: "scene.sandbox.counter", render: ({ view }) => <p>计数：{view.count}</p> }],
    overlays: [],
    hud: [{ id: "hud.sandbox.counter", render: () => null }],
    gameSymbols: [],
  });
  mountGameApplicationV1(
    root,
    <GameShell
      view={player.view}
      playerPort={player}
      presentation={presentation}
      contributions={contributions}
      sceneId="scene.sandbox.counter"
      hudId="hud.sandbox.counter"
      incrementCommand={{ kind: "sandbox.counter.increment" }}
      incrementLabel="增加计数"
    />,
  );
}
