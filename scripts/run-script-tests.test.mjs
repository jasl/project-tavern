// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  discoverScriptTestsV1,
  scriptTestCommandsV1,
  verifyVitestListOwnershipV1,
} from "./run-script-tests.mjs";

test("discovers every nested script test exactly once", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-script-tests-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [
    "scripts/root.test.mjs",
    "scripts/ui/nested.test.ts",
    "scripts/release/deep/workflow.test.mjs",
    "scripts/release/not-a-test.ts",
  ]) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), "export {};\n");
  }
  const discovered = await discoverScriptTestsV1(root);
  assert.deepEqual(discovered, {
    node: ["scripts/release/deep/workflow.test.mjs", "scripts/root.test.mjs"],
    vitest: ["scripts/ui/nested.test.ts"],
  });
  assert.deepEqual(scriptTestCommandsV1(discovered), [
    ["node", ["--test", "scripts/release/deep/workflow.test.mjs", "scripts/root.test.mjs"]],
    ["pnpm", ["exec", "vitest", "run", "--project", "scripts"]],
  ]);
});

test("rejects missing and duplicate Vitest list ownership", () => {
  assert.throws(() => verifyVitestListOwnershipV1(["scripts/a.test.ts"], []), /missing/u);
  assert.throws(
    () =>
      verifyVitestListOwnershipV1(
        ["scripts/a.test.ts"],
        ["scripts/a.test.ts", "scripts/a.test.ts"],
      ),
    /duplicate/u,
  );
});
