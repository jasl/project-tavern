// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export const workspacePackageParents = Object.freeze([
  "engine/packages",
  "game/packages",
  "game/stories",
  "game/apps",
]);

export const workspacePackages = Object.freeze([
  Object.freeze({
    path: "engine/packages/base",
    name: "@sillymaker/base",
    kind: "engine",
    license: "MIT",
    edges: [],
  }),
  Object.freeze({
    path: "engine/packages/ui",
    name: "@sillymaker/ui",
    kind: "engine",
    license: "MIT",
    edges: ["@sillymaker/base"],
  }),
  Object.freeze({
    path: "engine/packages/web",
    name: "@sillymaker/web",
    kind: "engine",
    license: "MIT",
    edges: ["@sillymaker/base", "@sillymaker/ui"],
  }),
  Object.freeze({
    path: "game/packages/assets",
    name: "@project-tavern/assets",
    kind: "game",
    license: "SEE LICENSE IN LICENSE.md",
    edges: ["@sillymaker/base"],
  }),
  Object.freeze({
    path: "game/stories/e2e",
    name: "@project-tavern/story-e2e",
    kind: "game",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: ["@sillymaker/base", "@sillymaker/ui", "@project-tavern/assets", "@sillymaker/web"],
  }),
  Object.freeze({
    path: "game/stories/poc",
    name: "@project-tavern/story-poc",
    kind: "game",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: ["@sillymaker/base", "@sillymaker/ui", "@project-tavern/assets", "@sillymaker/web"],
  }),
]);

export const workspacePackageByName = new Map(
  workspacePackages.map((entry) => [entry.name, entry]),
);

export const workspacePackageByPath = new Map(
  workspacePackages.map((entry) => [entry.path, entry]),
);
