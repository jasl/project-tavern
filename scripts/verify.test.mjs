// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertVitestOwnershipV1,
  coreVerificationCommandsV1,
  discoverVitestTestsV1,
} from "./verify.mjs";

test("keeps the ordered core gate read-only", () => {
  assert.equal(coreVerificationCommandsV1[0]?.[1]?.[0], "format:check");
  assert.equal(coreVerificationCommandsV1.at(-6)?.[1]?.[0], "build");
  assert(!coreVerificationCommandsV1.flat(2).some((value) => /update|regenerate/u.test(value)));
  const commandLines = coreVerificationCommandsV1.map(([command, args]) =>
    JSON.stringify([command, args]),
  );
  assert.equal(new Set(commandLines).size, commandLines.length);
});

test("appends the five final browser owners in order", () => {
  assert.deepEqual(coreVerificationCommandsV1.slice(-5), [
    ["pnpm", ["build:player"]],
    ["pnpm", ["build:developer"]],
    ["pnpm", ["verify:bundle"]],
    ["pnpm", ["verify:artifact"]],
    ["pnpm", ["test:e2e:smoke"]],
  ]);
});

test("discovers source tests without traversing workspace node_modules", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-vitest-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "packages/example/src"), { recursive: true });
  await mkdir(join(root, "packages/example/node_modules"), { recursive: true });
  await mkdir(join(root, "scripts"), { recursive: true });
  await writeFile(join(root, "packages/example/src/example.test.ts"), "export {};\n");
  await symlink(root, join(root, "packages/example/node_modules/loop"));
  assert.deepEqual(discoverVitestTestsV1(root), ["packages/example/src/example.test.ts"]);
});

test("rejects zero-owner and duplicate-list workspace tests", () => {
  assert.throws(
    () => assertVitestOwnershipV1(["packages/x/src/a.test.ts"], { unit: [] }),
    /missing/u,
  );
  assert.throws(
    () =>
      assertVitestOwnershipV1(["packages/x/src/a.test.ts"], {
        unit: ["packages/x/src/a.test.ts", "packages/x/src/a.test.ts"],
      }),
    /duplicate/u,
  );
});
