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
} from "./verify.mjs";

const expectedCoreVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["verify:materialization"]],
  ["pnpm", ["test:scripts"]],
  ["pnpm", ["format:check"]],
  ["pnpm", ["verify:docs"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["verify:fixtures"]],
  ["pnpm", ["verify:golden"]],
  ["pnpm", ["verify:determinism"]],
  ["pnpm", ["build:poc"]],
  ["pnpm", ["verify:phase4"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test:unit"]],
  ["pnpm", ["test:contract"]],
  ["pnpm", ["test:property"]],
  ["pnpm", ["build"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:semantic"]],
  ["pnpm", ["verify:ui"]],
  ["pnpm", ["verify:assets"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact", "--", "--allow-development"]],
  ["pnpm", ["test:e2e:smoke"]],
]);

test("keeps the exact one-build root gate read-only", () => {
  assert.deepEqual(coreVerificationCommandsV1, expectedCoreVerificationCommandsV1);
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
  assert.equal(childNames.filter((name) => name === "verify:phase4").length, 1);
  assert.equal(childNames.includes("verify:phase5a"), false);
  assert.equal(childNames.includes("verify:phase5b"), false);
  assert.equal(childNames.includes("verify:phase5c"), false);
  assert(!childNames.includes("verify"));
  assert(
    childNames.indexOf("build:poc") < childNames.indexOf("verify:phase4") &&
      childNames.indexOf("verify:phase4") < childNames.indexOf("build:e2e") &&
      childNames.indexOf("build:e2e") < childNames.indexOf("verify:semantic") &&
      childNames.indexOf("verify:semantic") < childNames.indexOf("verify:ui") &&
      childNames.indexOf("verify:ui") < childNames.indexOf("verify:assets") &&
      childNames.indexOf("verify:assets") < childNames.indexOf("verify:boundaries") &&
      childNames.indexOf("verify:boundaries") < childNames.indexOf("verify:bundle"),
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
  assert.equal(childNames.filter((name) => name === "verify:phase4").length, 1);
  assert.equal(childNames.filter((name) => name === "verify:semantic").length, 1);
  assert.equal(childNames.filter((name) => name === "verify:ui").length, 1);
  assert.equal(childNames.includes("verify:phase5a"), false);
  assert.equal(childNames.includes("verify:phase5b"), false);
  assert.equal(childNames.includes("verify:phase5c"), false);
  assert.equal(childNames.includes("verify:story-presentation"), false);
});

test("runs materialization and script tests before workspace test discovery", () => {
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
  assert.deepEqual(
    events
      .slice(0, 5)
      .map((entry) => (entry[0] === "command" ? [entry[0], entry[1], entry[2]] : entry)),
    [
      ["command", "pnpm", ["verify:materialization"]],
      ["snapshot"],
      ["command", "pnpm", ["test:scripts"]],
      ["discovery"],
      ["command", "pnpm", ["format:check"]],
    ],
  );
  for (const event of events.filter(([kind]) => kind === "command")) {
    assert.deepEqual(event[3], {
      cwd: "/repo/project-tavern",
      shell: false,
      stdio: "inherit",
    });
  }
});

test("the root entrypoint snapshots tracked bytes only after materialization", () => {
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
    verifyDiscovery: () => events.push(["discovery"]),
  });
  assert.deepEqual(events.slice(0, 5), [
    ["command", "pnpm", ["verify:materialization"]],
    ["snapshot"],
    ["command", "pnpm", ["test:scripts"]],
    ["discovery"],
    ["command", "pnpm", ["format:check"]],
  ]);
});

test("appends the remaining release-independent checks", () => {
  assert.deepEqual(coreVerificationCommandsV1.slice(-3), [
    ["pnpm", ["verify:bundle"]],
    ["pnpm", ["verify:artifact", "--", "--allow-development"]],
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
