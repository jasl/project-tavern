// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export const workspacePackages = Object.freeze([
  Object.freeze({ path: "packages/base", name: "@project-tavern/base", license: "MIT", edges: [] }),
  Object.freeze({
    path: "packages/ui",
    name: "@project-tavern/ui",
    license: "MIT",
    edges: ["@project-tavern/base"],
  }),
  Object.freeze({
    path: "packages/assets",
    name: "@project-tavern/assets",
    license: "SEE LICENSE IN LICENSE.md",
    edges: ["@project-tavern/base"],
  }),
  Object.freeze({
    path: "packages/modules",
    name: "@project-tavern/modules",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: ["@project-tavern/base", "@project-tavern/ui"],
  }),
  Object.freeze({
    path: "apps/web",
    name: "@project-tavern/web",
    license: "MIT",
    edges: ["@project-tavern/base", "@project-tavern/ui"],
  }),
  Object.freeze({
    path: "stories/sandbox",
    name: "@project-tavern/story-sandbox",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: [
      "@project-tavern/base",
      "@project-tavern/ui",
      "@project-tavern/assets",
      "@project-tavern/web",
    ],
  }),
  Object.freeze({
    path: "stories/e2e",
    name: "@project-tavern/story-e2e",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: [
      "@project-tavern/base",
      "@project-tavern/ui",
      "@project-tavern/modules",
      "@project-tavern/assets",
    ],
  }),
  Object.freeze({
    path: "stories/demo",
    name: "@project-tavern/story-demo",
    license: "PolyForm-Noncommercial-1.0.0",
    edges: [
      "@project-tavern/base",
      "@project-tavern/ui",
      "@project-tavern/modules",
      "@project-tavern/assets",
    ],
  }),
]);

export const workspacePackageByName = new Map(
  workspacePackages.map((entry) => [entry.name, entry]),
);

export const workspacePackageByPath = new Map(
  workspacePackages.map((entry) => [entry.path, entry]),
);
