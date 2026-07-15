// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertVitestOwnershipV1,
  changedTrackedPathsV1,
  coreVerificationCommandsV1,
  discoverVitestTestsV1,
  snapshotTrackedPathsV1,
} from "./verify.mjs";

test("keeps the ordered core gate read-only", () => {
  assert.equal(coreVerificationCommandsV1[0]?.[1]?.[0], "format:check");
  assert.equal(coreVerificationCommandsV1[1]?.[1]?.[0], "verify:docs");
  assert.deepEqual(coreVerificationCommandsV1[9], ["pnpm", ["verify:determinism"]]);
  assert.deepEqual(coreVerificationCommandsV1[10], ["pnpm", ["verify:phase4"]]);
  assert.deepEqual(coreVerificationCommandsV1[11], ["pnpm", ["verify:semantic"]]);
  assert.equal(coreVerificationCommandsV1.at(-5)?.[1]?.[0], "build");
  assert(!coreVerificationCommandsV1.flat(2).some((value) => /update|regenerate/u.test(value)));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:balance"));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:toolchain"));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:licensing"));
  const childNames = coreVerificationCommandsV1.map(([, args]) => args[0]);
  assert.equal(childNames.filter((name) => name === "verify:phase4").length, 1);
  assert.equal(childNames.filter((name) => name === "verify:semantic").length, 1);
  assert(!childNames.includes("verify"));
  const commandLines = coreVerificationCommandsV1.map(([command, args]) =>
    JSON.stringify([command, args]),
  );
  assert.equal(new Set(commandLines).size, commandLines.length);
});

test("appends the four final browser owners in order", () => {
  assert.deepEqual(coreVerificationCommandsV1.slice(-4), [
    ["pnpm", ["build:e2e"]],
    ["pnpm", ["verify:bundle"]],
    ["pnpm", ["verify:artifact"]],
    ["pnpm", ["test:e2e:smoke"]],
  ]);
  assert(!coreVerificationCommandsV1.flat(2).includes("build:player"));
  assert(!coreVerificationCommandsV1.flat(2).includes("build:developer"));
});

test("discovers source tests without traversing workspace node_modules", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-vitest-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "engine/packages/base/src"), { recursive: true });
  await mkdir(join(root, "engine/packages/base/node_modules"), { recursive: true });
  await mkdir(join(root, "scripts"), { recursive: true });
  await writeFile(join(root, "engine/packages/base/src/example.test.ts"), "export {};\n");
  await symlink(root, join(root, "engine/packages/base/node_modules/loop"));
  assert.deepEqual(discoverVitestTestsV1(root), ["engine/packages/base/src/example.test.ts"]);
});

test("rejects zero-owner and duplicate-list workspace tests", () => {
  assert.throws(
    () => assertVitestOwnershipV1(["game/packages/x/src/a.test.ts"], { unit: [] }),
    /missing/u,
  );
  assert.throws(
    () =>
      assertVitestOwnershipV1(["game/packages/x/src/a.test.ts"], {
        unit: ["game/packages/x/src/a.test.ts", "game/packages/x/src/a.test.ts"],
      }),
    /duplicate/u,
  );
});

test("keeps a planned tracked deletion stable while detecting recreation", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-tracked-snapshot-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "present.txt"), "present\n");
  const paths = ["deleted.txt", "present.txt"];
  const before = snapshotTrackedPathsV1(root, paths);

  assert.equal(before.get("deleted.txt"), null);
  assert.deepEqual(changedTrackedPathsV1(before, snapshotTrackedPathsV1(root, paths)), []);

  await writeFile(join(root, "deleted.txt"), "recreated\n");
  assert.deepEqual(changedTrackedPathsV1(before, snapshotTrackedPathsV1(root, paths)), [
    "deleted.txt",
  ]);
});
