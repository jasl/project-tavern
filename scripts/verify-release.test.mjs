// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedReleaseVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["verify"]],
  ["pnpm", ["release:prepare"]],
  ["pnpm", ["verify:artifact"]],
  ["pnpm", ["test:e2e:prebuilt", "--project=chromium"]],
  ["pnpm", ["release:repro"]],
]);

test("owns the exact clean local release wrapper", async () => {
  const { releaseVerificationCommandsV1 } = await import("./verify-release.mjs");
  assert.deepEqual(releaseVerificationCommandsV1, expectedReleaseVerificationCommandsV1);
  assert.equal(Object.isFrozen(releaseVerificationCommandsV1), true);
  for (const entry of releaseVerificationCommandsV1) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry[1]), true);
  }
  assert.equal(releaseVerificationCommandsV1.filter(([, args]) => args[0] === "verify").length, 1);
  assert.equal(
    releaseVerificationCommandsV1.filter(([, args]) => args[0] === "verify:artifact").length,
    1,
  );
  assert.equal(releaseVerificationCommandsV1.flat(2).includes("--allow-development"), false);
  assert.equal(releaseVerificationCommandsV1.flat(2).includes("webkit"), false);
});

test("runs sequentially without a shell and stops on the first failure", async () => {
  const { runReleaseVerificationV1 } = await import("./verify-release.mjs");
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push([command, args, options]);
    return { signal: null, status: calls.length === 4 ? 1 : 0 };
  };

  assert.throws(
    () => runReleaseVerificationV1("/repo/project-tavern", spawn),
    /pnpm test:e2e:prebuilt --project=chromium failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedReleaseVerificationCommandsV1.slice(0, 4),
  );
  for (const [, , options] of calls) {
    assert.deepEqual(options, {
      cwd: "/repo/project-tavern",
      shell: false,
      stdio: "inherit",
    });
  }
});

test("maps the public release script only to the local wrapper", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(packageJson.scripts["verify:release"], "node scripts/verify-release.mjs");
});
