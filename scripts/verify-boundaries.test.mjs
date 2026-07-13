// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyBoundaries } from "./verify-boundaries.mjs";

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

test("rejects Base importing a Story", async (t) => {
  const root = await fixture('import "@project-tavern/story-sandbox";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).includes(
      "engine/packages/base: engine package may not import game package @project-tavern/story-sandbox",
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

test("rejects references imports", async (t) => {
  const root = await fixture('import "../../../references/example.js";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).some((error) => error.includes("references/ is forbidden")),
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
