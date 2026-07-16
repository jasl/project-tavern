// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyBoundaries } from "./verify-boundaries.mjs";
import { workspacePackageByPath, workspacePackages } from "./workspace-policy.mjs";

test("contains only the approved Phase 2 packages", () => {
  assert.deepEqual(
    workspacePackages.map(({ path, kind }) => ({ path, kind })),
    [
      { path: "engine/packages/base", kind: "engine" },
      { path: "engine/packages/ui", kind: "engine" },
      { path: "engine/packages/web", kind: "engine" },
      { path: "game/packages/assets", kind: "game" },
      { path: "game/stories/e2e", kind: "game" },
      { path: "game/stories/poc", kind: "game" },
    ],
  );
});

test("keeps E2E independent from PoC and removed shared modules", () => {
  const e2e = workspacePackageByPath.get("game/stories/e2e");
  const removedModulesPackage = ["@project-tavern", "modules"].join("/");
  assert(e2e);
  assert(!e2e.edges.includes("@project-tavern/story-poc"));
  assert(!e2e.edges.includes(removedModulesPackage));
  assert(!workspacePackageByPath.has("game/packages/modules"));
  assert(
    workspacePackages
      .filter((entry) => entry.kind === "engine")
      .every(
        (entry) =>
          entry.name.startsWith("@sillymaker/") &&
          entry.edges.every((edge) => edge.startsWith("@sillymaker/")),
      ),
  );
});

async function fixture(source) {
  const root = await mkdtemp(join(tmpdir(), "tavern-boundaries-"));
  await mkdir(join(root, "engine", "packages", "base", "src"), { recursive: true });
  await writeFile(
    join(root, "engine", "packages", "base", "package.json"),
    JSON.stringify({ name: "@sillymaker/base", license: "MIT" }),
  );
  await writeFile(join(root, "engine", "packages", "base", "src", "index.ts"), source);
  return root;
}

async function addE2eStory(root, source, exports) {
  await mkdir(join(root, "game", "stories", "e2e", "src"), { recursive: true });
  await writeFile(
    join(root, "game", "stories", "e2e", "package.json"),
    JSON.stringify({
      name: "@project-tavern/story-e2e",
      license: "PolyForm-Noncommercial-1.0.0",
      exports,
      dependencies: {
        "@project-tavern/assets": "workspace:*",
        "@sillymaker/base": "workspace:*",
        "@sillymaker/ui": "workspace:*",
        "@sillymaker/web": "workspace:*",
      },
    }),
  );
  await writeFile(join(root, "game", "stories", "e2e", "src", "index.ts"), source);
  await writeFile(
    join(root, "game", "stories", "e2e", "src", "tooling.ts"),
    "export const tooling = true;\n",
  );
}

test("rejects Base importing a Story", async (t) => {
  const root = await fixture('import "@project-tavern/story-e2e";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).includes(
      "engine/packages/base: engine package may not import game package @project-tavern/story-e2e",
    ),
  );
});

test("rejects a Story HTML reference that escapes its package", async (t) => {
  const root = await fixture("export {};\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "game", "stories", "e2e"), { recursive: true });
  await writeFile(
    join(root, "game", "stories", "e2e", "package.json"),
    JSON.stringify({
      name: "@project-tavern/story-e2e",
      license: "PolyForm-Noncommercial-1.0.0",
      dependencies: {
        "@project-tavern/assets": "workspace:*",
        "@sillymaker/base": "workspace:*",
        "@sillymaker/ui": "workspace:*",
        "@sillymaker/web": "workspace:*",
      },
    }),
  );
  await writeFile(
    join(root, "game", "stories", "e2e", "index.html"),
    '<link rel="stylesheet" href="../../../engine/packages/web/src/styles.css" />\n',
  );
  assert(
    (await verifyBoundaries(root)).includes(
      "game/stories/e2e/index.html: relative reference escapes game/stories/e2e",
    ),
  );
});

test("recognizes SillyMaker workspace imports", async (t) => {
  const root = await fixture('import "@sillymaker/ui";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).includes("engine/packages/base may not import @sillymaker/ui"),
  );
});

test("allows a package to import its own reviewed export without a self dependency", async (t) => {
  const root = await fixture("export {};\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  await addE2eStory(
    root,
    'const tooling = import("@project-tavern/story-e2e/tooling");\nvoid tooling;\n',
    { ".": "./src/index.ts", "./tooling": "./src/tooling.ts" },
  );

  assert.equal(
    (await verifyBoundaries(root)).some((error) =>
      error.includes("game/stories/e2e may not import @project-tavern/story-e2e"),
    ),
    false,
  );
});

test("rejects an unreviewed self-package subpath", async (t) => {
  const root = await fixture("export {};\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  await addE2eStory(root, 'import "@project-tavern/story-e2e/private";\n', {
    ".": "./src/index.ts",
    "./tooling": "./src/tooling.ts",
  });

  assert(
    (await verifyBoundaries(root)).includes(
      "game/stories/e2e/src/index.ts: package-internal deep import @project-tavern/story-e2e/private",
    ),
  );
});

test("rejects references imports", async (t) => {
  const root = await fixture('import "../../../references/example.js";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).some((error) => error.includes("references/ is forbidden")),
  );
});

test("allows preferences imports without mistaking them for references", async (t) => {
  const root = await fixture('export { value } from "./preferences/index.js";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(
    (await verifyBoundaries(root)).some((error) => error.includes("references/ is forbidden")),
    false,
  );
});

test("rejects an unregistered workspace package", async (t) => {
  const root = await fixture("export {};\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "game", "packages", "unregistered"), { recursive: true });
  await writeFile(
    join(root, "game", "packages", "unregistered", "package.json"),
    JSON.stringify({ name: "@project-tavern/unregistered" }),
  );
  assert(
    (await verifyBoundaries(root)).includes(
      "unregistered workspace package: game/packages/unregistered",
    ),
  );
});

test("allows a registered game package to depend on an engine package", async (t) => {
  const root = await fixture("export {};\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "game", "packages", "assets", "src"), { recursive: true });
  await writeFile(
    join(root, "game", "packages", "assets", "package.json"),
    JSON.stringify({
      name: "@project-tavern/assets",
      license: "SEE LICENSE IN LICENSE.md",
      dependencies: { "@sillymaker/base": "workspace:*" },
    }),
  );
  await writeFile(
    join(root, "game", "packages", "assets", "src", "index.ts"),
    'import "@sillymaker/base";\n',
  );
  assert.equal(
    (await verifyBoundaries(root)).some((error) => error.startsWith("game/packages/assets")),
    false,
  );
});
