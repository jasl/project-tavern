// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyCycles } from "./verify-cycles.mjs";

test("reports a deterministic two-file production cycle", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-cycles-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = join(root, "engine", "packages", "base", "src");
  await mkdir(sourceRoot, { recursive: true });
  await writeFile(join(sourceRoot, "a.ts"), 'import "./b.js";\n');
  await writeFile(join(sourceRoot, "b.ts"), 'import "./a.js";\n');

  assert(
    (await verifyCycles(root)).includes(
      "production import cycle: engine/packages/base/src/a.ts -> engine/packages/base/src/b.ts -> engine/packages/base/src/a.ts",
    ),
  );
});
