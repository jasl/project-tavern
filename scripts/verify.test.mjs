// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertVitestOwnershipV1,
  changedTrackedPathsV1,
  coreVerificationCommandsV1,
  discoverVitestTestsV1,
  runCoreCommandSequenceV1,
  runCoreVerificationV1,
  snapshotTrackedPathsV1,
  verificationStepsV1,
} from "./verify.mjs";

const expectedVerificationStepsV1 = Object.freeze([
  ["materialization", "pnpm", ["verify:materialization"]],
  ["format", "pnpm", ["format:check"]],
  ["lint", "pnpm", ["lint"]],
  ["lint-styles", "pnpm", ["lint:styles"]],
  ["boundaries", "pnpm", ["verify:boundaries"]],
  ["cycles", "pnpm", ["verify:cycles"]],
  ["typecheck", "pnpm", ["typecheck"]],
  ["public-exports", "pnpm", ["verify:public-exports"]],
  ["unit", "pnpm", ["test:unit"]],
  ["contract", "pnpm", ["test:contract"]],
  ["property", "pnpm", ["test:property"]],
  ["scripts", "pnpm", ["test:scripts"]],
  ["stories", "pnpm", ["verify:stories"]],
  ["runtime-fixtures", "pnpm", ["verify:runtime-fixtures"]],
  ["poc-commands", "pnpm", ["--filter", "@project-tavern/story-poc", "verify:commands"]],
  ["fixtures", "pnpm", ["verify:fixtures"]],
  ["golden", "pnpm", ["verify:golden"]],
  ["determinism", "pnpm", ["verify:determinism"]],
  ["balance", "pnpm", ["verify:balance:freeze"]],
  ["assets", "pnpm", ["verify:assets"]],
  ["build-poc", "pnpm", ["build:poc"]],
  ["build-e2e", "pnpm", ["build:e2e"]],
  ["semantic", "pnpm", ["verify:semantic"]],
  ["ui", "pnpm", ["verify:ui"]],
  ["bundle", "pnpm", ["verify:bundle"]],
  ["e2e-smoke", "pnpm", ["test:e2e:smoke"]],
  ["artifact", "pnpm", ["verify:artifact", "--", "--allow-development"]],
  ["docs", "pnpm", ["verify:docs"]],
]);

const expectedCoreVerificationCommandsV1 = Object.freeze(
  expectedVerificationStepsV1.map(([, command, args]) => [command, args]),
);

test("keeps the exact 28-leaf one-build root gate read-only", () => {
  assert.deepEqual(
    verificationStepsV1.map(({ id, command, args }) => [id, command, args]),
    expectedVerificationStepsV1,
  );
  assert.deepEqual(coreVerificationCommandsV1, expectedCoreVerificationCommandsV1);
  assert.equal(Object.isFrozen(verificationStepsV1), true);
  assert.equal(Object.isFrozen(coreVerificationCommandsV1), true);
  for (const [index, step] of verificationStepsV1.entries()) {
    assert.equal(Object.isFrozen(step), true);
    assert.equal(Object.isFrozen(step.args), true);
    assert.equal(Object.isFrozen(coreVerificationCommandsV1[index]), true);
    assert.equal(coreVerificationCommandsV1[index][1], step.args);
  }
  assert(!coreVerificationCommandsV1.flat(2).some((value) => /update|regenerate/u.test(value)));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:balance"));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:toolchain"));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:licensing"));
  const childNames = coreVerificationCommandsV1.map(([, args]) => args[0]);
  for (const name of [
    "verify:materialization",
    "test:scripts",
    "build:poc",
    "build:e2e",
    "verify:semantic",
    "verify:ui",
    "verify:assets",
    "verify:boundaries",
    "verify:bundle",
  ]) {
    assert.equal(childNames.filter((candidate) => candidate === name).length, 1, name);
  }
  assert.equal(childNames[0], "verify:materialization");
  assert.equal(childNames.includes("verify:phase4"), false);
  assert.equal(childNames.includes("verify:phase5a"), false);
  assert.equal(childNames.includes("verify:phase5b"), false);
  assert.equal(childNames.includes("verify:phase5c"), false);
  assert.equal(childNames.includes("build"), false);
  assert(!childNames.includes("verify"));
  assert(
    childNames.indexOf("build:poc") < childNames.indexOf("build:e2e") &&
      childNames.indexOf("build:e2e") < childNames.indexOf("verify:semantic") &&
      childNames.indexOf("verify:semantic") < childNames.indexOf("verify:ui") &&
      childNames.indexOf("verify:ui") < childNames.indexOf("verify:bundle") &&
      childNames.indexOf("verify:bundle") < childNames.indexOf("test:e2e:smoke") &&
      childNames.indexOf("test:e2e:smoke") < childNames.indexOf("verify:artifact"),
  );
  assert.doesNotMatch(
    JSON.stringify(coreVerificationCommandsV1),
    /prepare:|update:|regenerate|--update-snapshots|release:|push|deploy|remote/iu,
  );
  const commandLines = coreVerificationCommandsV1.map(([command, args]) =>
    JSON.stringify([command, args]),
  );
  assert.equal(new Set(commandLines).size, commandLines.length);
});

test("maps cumulative development aliases without nesting them in root", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["verify:ui-runtime"],
    "node --experimental-strip-types scripts/ui/verify-ui-runtime.mts",
  );
  assert.equal(
    packageJson.scripts["verify:ui"],
    "node --experimental-strip-types scripts/ui/verify-ui.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase5a"],
    "pnpm verify:phase4 && pnpm verify:ui-runtime",
  );
  assert.equal(
    packageJson.scripts["verify:story-presentation"],
    "node --experimental-strip-types scripts/ui/verify-stage-presentation.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase5b"],
    "pnpm verify:phase5a && pnpm build:e2e && pnpm build:poc && pnpm verify:story-presentation",
  );
  assert.equal(
    packageJson.scripts["verify:ui-tooling"],
    "node --experimental-strip-types scripts/ui/verify-phase5c.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase5c"],
    "pnpm verify:phase5b && pnpm verify:ui-tooling",
  );

  const childNames = coreVerificationCommandsV1.map(([, args]) => args[0]);
  assert.equal(childNames.includes("verify:phase4"), false);
  assert.equal(childNames.filter((name) => name === "verify:semantic").length, 1);
  assert.equal(childNames.filter((name) => name === "verify:ui").length, 1);
  assert.equal(childNames.includes("verify:phase5a"), false);
  assert.equal(childNames.includes("verify:phase5b"), false);
  assert.equal(childNames.includes("verify:phase5c"), false);
  assert.equal(childNames.includes("verify:story-presentation"), false);
});

test("runs discovery immediately after the scripts leaf", () => {
  const events = [];
  runCoreCommandSequenceV1(
    "/repo/project-tavern",
    (command, args, options) => {
      events.push(["command", command, args, options]);
      return { status: 0, signal: null };
    },
    () => events.push(["discovery"]),
    () => events.push(["snapshot"]),
  );
  assert.deepEqual(events[0].slice(0, 3), ["command", "pnpm", ["verify:materialization"]]);
  assert.deepEqual(events[1], ["snapshot"]);
  const scriptsCommandIndex = events.findIndex(
    (entry) => entry[0] === "command" && entry[2][0] === "test:scripts",
  );
  assert.notEqual(scriptsCommandIndex, -1);
  assert.deepEqual(events[scriptsCommandIndex + 1], ["discovery"]);
  for (const event of events.filter(([kind]) => kind === "command")) {
    assert.deepEqual(event[3], {
      cwd: "/repo/project-tavern",
      shell: false,
      stdio: "inherit",
    });
  }
});

test("the root entrypoint snapshots tracked bytes and clean status only after materialization", () => {
  const events = [];
  runCoreVerificationV1("/repo/project-tavern", {
    snapshot: () => {
      events.push(["snapshot"]);
      return new Map();
    },
    spawn: (command, args) => {
      events.push(["command", command, args]);
      return { status: 0, signal: null };
    },
    status: () => {
      events.push(["status"]);
      return "";
    },
    verifyDiscovery: () => events.push(["discovery"]),
  });
  assert.deepEqual(events.slice(0, 4), [
    ["command", "pnpm", ["verify:materialization"]],
    ["snapshot"],
    ["status"],
    ["command", "pnpm", ["format:check"]],
  ]);
  const scriptsCommandIndex = events.findIndex(
    (entry) => entry[0] === "command" && entry[2][0] === "test:scripts",
  );
  assert.notEqual(scriptsCommandIndex, -1);
  assert.deepEqual(events[scriptsCommandIndex + 1], ["discovery"]);
  assert.deepEqual(events.at(-2), ["snapshot"]);
  assert.deepEqual(events.at(-1), ["status"]);
});

test("rejects untracked and status-only worktree drift after materialization", () => {
  for (const changedStatus of ["?? leaked.txt\n", " M executable.sh\n"]) {
    let statusCalls = 0;
    assert.throws(
      () =>
        runCoreVerificationV1("/repo/project-tavern", {
          snapshot: () => new Map(),
          spawn: () => ({ status: 0, signal: null }),
          status: () => (statusCalls++ === 0 ? "" : changedStatus),
          verifyDiscovery: () => {},
        }),
      (error) => {
        assert(error instanceof TypeError);
        assert.match(error.message, /verification changed worktree status/u);
        assert.match(error.message, new RegExp(changedStatus.trim().split(/\s+/u).at(-1), "u"));
        return true;
      },
    );
  }
});

test("rejects a dirty baseline even when later commands leave it unchanged", () => {
  assert.throws(
    () =>
      runCoreVerificationV1("/repo/project-tavern", {
        snapshot: () => new Map(),
        spawn: () => ({ status: 0, signal: null }),
        status: () => "?? preexisting.txt\n",
        verifyDiscovery: () => {},
      }),
    /verification started with dirty worktree.*preexisting\.txt/u,
  );
});

test("appends the remaining release-independent checks", () => {
  assert.deepEqual(coreVerificationCommandsV1.slice(-3), [
    ["pnpm", ["test:e2e:smoke"]],
    ["pnpm", ["verify:artifact", "--", "--allow-development"]],
    ["pnpm", ["verify:docs"]],
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
