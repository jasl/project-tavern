// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyBoundaries } from "./verify-boundaries.mjs";

async function fixture(source) {
  const root = await mkdtemp(join(tmpdir(), "tavern-boundaries-"));
  await mkdir(join(root, "packages", "base", "src"), { recursive: true });
  await writeFile(join(root, "packages", "base", "src", "index.ts"), source);
  return root;
}

test("rejects Base importing a Story", async (t) => {
  const root = await fixture('import "@project-tavern/story-sandbox";\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  assert(
    (await verifyBoundaries(root)).includes(
      "packages/base may not import @project-tavern/story-sandbox",
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
