// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedPocStoryVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["verify:persistence-diagnostics"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "run", "test:story"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:commands"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:balance:smoke"]],
  ["pnpm", ["verify:golden"]],
  ["pnpm", ["verify:fixtures"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:semantic"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["build"]],
]);

test("owns the complete read-only Phase 4B command list", async () => {
  const { pocStoryVerificationCommandsV1 } = await import("./verify-poc-story.mts");
  assert.deepEqual(pocStoryVerificationCommandsV1, expectedPocStoryVerificationCommandsV1);
  assert.equal(pocStoryVerificationCommandsV1.length, 13);
  assert(Object.isFrozen(pocStoryVerificationCommandsV1));
  for (const command of pocStoryVerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert(
    !pocStoryVerificationCommandsV1
      .flat(2)
      .some((token) => /regenerate|update:|write|writer|release|publish|deploy/u.test(token)),
  );
  assert(!pocStoryVerificationCommandsV1.flat(2).includes("verify:balance"));
  assert(
    !pocStoryVerificationCommandsV1.some(
      ([command, args]) => command === "pnpm" && args.length === 1 && args[0] === "verify:semantic",
    ),
  );
  assert(
    !pocStoryVerificationCommandsV1.some(
      ([command, args]) => command === "pnpm" && args.length === 1 && args[0] === "verify",
    ),
  );
});

test("keeps Phase 4A and 4B test leaves disjoint", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:story"],
    "vitest run src/test/story-validation.test.ts src/test/daily-gates.test.ts src/test/relationship-content.test.ts src/test/investigation-content.test.ts src/test/ending-forecast.test.ts src/test/story-data.test.ts src/test/semantic-flow.integration.test.ts src/test/relationship-route.integration.test.ts src/test/investigation-route.integration.test.ts src/test/terminal-route.integration.test.ts src/test/tooling.test.ts src/test/tooling-runtime.integration.test.ts",
  );
  assert(!packageJson.scripts["test:story"].includes("gameplay-contract.test.ts"));
  assert(!packageJson.scripts["test:gameplay"].includes("story-validation.test.ts"));
});

test("stops at the first failed command and never enables a shell", async () => {
  const { runPocStoryVerificationV1 } = await import("./verify-poc-story.mts");
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 4 ? 1 : 0 };
  };

  assert.throws(
    () => runPocStoryVerificationV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm --filter @project-tavern\/story-poc verify:balance:smoke failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedPocStoryVerificationCommandsV1.slice(0, 4),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("keeps the cumulative Phase 4 root mapping exact", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["verify:poc-story"],
    "node --experimental-strip-types scripts/verify-poc-story.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase4"],
    "pnpm verify:poc-gameplay && pnpm verify:poc-story",
  );
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes("scripts/verify-poc-story.mts"))
      .map(([name]) => name),
    ["verify:poc-story"],
  );
});

function reachesPnpmScriptV1(scripts, start, target, visiting = new Set()) {
  if (start === target) return true;
  if (visiting.has(start)) throw new TypeError(`recursive package script: ${start}`);
  const command = scripts[start];
  if (typeof command !== "string") return false;

  visiting.add(start);
  const children = [
    ...command.matchAll(/(?:^|&&)\s*pnpm\s+(?:run\s+)?(verify:[a-z0-9:-]+)/giu),
  ].map((match) => match[1]);
  const reaches = children.some(
    (child) => child !== undefined && reachesPnpmScriptV1(scripts, child, target, visiting),
  );
  visiting.delete(start);
  return reaches;
}

test("keeps Phase 4 transitively owned separately from semantic", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const { coreVerificationCommandsV1 } = await import("./verify.mjs");
  const names = coreVerificationCommandsV1.map(([, args]) => args[0]);
  const phaseOwners = names.filter((name) =>
    reachesPnpmScriptV1(packageJson.scripts, name, "verify:phase4"),
  );
  assert.equal(phaseOwners.length, 1);
  assert.equal(names.filter((name) => name === "verify:semantic").length, 1);
  assert(names.indexOf(phaseOwners[0]) < names.indexOf("verify:semantic"));
  assert(!names.includes("verify"));
});
