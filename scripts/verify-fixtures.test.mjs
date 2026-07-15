// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fixtureVerificationCommandsV1, verifyFixturesV1 } from "./verify-fixtures.mjs";

const expectedFixtureVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:fixtures"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:fixtures"]],
]);

test("delegates only to the ordered read-only fixture verifiers", () => {
  assert.deepEqual(fixtureVerificationCommandsV1, expectedFixtureVerificationCommandsV1);
  assert(Object.isFrozen(fixtureVerificationCommandsV1));
  for (const command of fixtureVerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert(
    fixtureVerificationCommandsV1.every(
      ([command, args]) =>
        command === "pnpm" &&
        !args.includes("regenerate:fixtures") &&
        !args.includes("update:fixtures"),
    ),
  );
});

test("stops at the first failure and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: 1 };
  };

  assert.throws(
    () => verifyFixturesV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm --filter @project-tavern\/story-e2e verify:fixtures failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedFixtureVerificationCommandsV1.slice(0, 1),
  );
  assert.equal(calls[0]?.[2]?.cwd, "/repo/project-tavern");
  assert.equal(calls[0]?.[2]?.shell, false);
  assert.equal(calls[0]?.[2]?.stdio, "inherit");
});

test("maps the root aggregator and both Story read-only fixture scripts", async () => {
  const root = join(import.meta.dirname, "..");
  const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const e2ePackage = JSON.parse(
    await readFile(join(root, "game/stories/e2e/package.json"), "utf8"),
  );
  const pocPackage = JSON.parse(
    await readFile(join(root, "game/stories/poc/package.json"), "utf8"),
  );

  assert.equal(rootPackage.scripts["verify:fixtures"], "node scripts/verify-fixtures.mjs");
  assert.equal(
    e2ePackage.scripts["verify:fixtures"],
    "node --experimental-strip-types scripts/verify-fixtures.mts",
  );
  assert.equal(
    pocPackage.scripts["verify:fixtures"],
    "vitest run src/test/tooling.test.ts src/test/tooling-runtime.integration.test.ts src/test/save-fixtures.test.ts",
  );
  assert.equal(
    pocPackage.scripts["update:fixtures"],
    "node --experimental-strip-types scripts/update-save-fixtures.mjs",
  );
});
