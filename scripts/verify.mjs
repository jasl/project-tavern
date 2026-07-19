// SPDX-License-Identifier: MIT
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyVitestProjectV1 } from "./classify-vitest-project.mjs";
import { workspacePackages } from "./workspace-policy.mjs";

function frozenVerificationStepV1(id, command, args) {
  return Object.freeze({
    args: Object.freeze([...args]),
    command,
    id,
  });
}

export const verificationStepsV1 = Object.freeze([
  frozenVerificationStepV1("materialization", "pnpm", ["verify:materialization"]),
  frozenVerificationStepV1("format", "pnpm", ["format:check"]),
  frozenVerificationStepV1("lint", "pnpm", ["lint"]),
  frozenVerificationStepV1("lint-styles", "pnpm", ["lint:styles"]),
  frozenVerificationStepV1("boundaries", "pnpm", ["verify:boundaries"]),
  frozenVerificationStepV1("cycles", "pnpm", ["verify:cycles"]),
  frozenVerificationStepV1("typecheck", "pnpm", ["typecheck"]),
  frozenVerificationStepV1("public-exports", "pnpm", ["verify:public-exports"]),
  frozenVerificationStepV1("unit", "pnpm", ["test:unit"]),
  frozenVerificationStepV1("contract", "pnpm", ["test:contract"]),
  frozenVerificationStepV1("property", "pnpm", ["test:property"]),
  frozenVerificationStepV1("scripts", "pnpm", ["test:scripts"]),
  frozenVerificationStepV1("stories", "pnpm", ["verify:stories"]),
  frozenVerificationStepV1("runtime-fixtures", "pnpm", ["verify:runtime-fixtures"]),
  frozenVerificationStepV1("poc-commands", "pnpm", [
    "--filter",
    "@project-tavern/story-poc",
    "verify:commands",
  ]),
  frozenVerificationStepV1("fixtures", "pnpm", ["verify:fixtures"]),
  frozenVerificationStepV1("golden", "pnpm", ["verify:golden"]),
  frozenVerificationStepV1("determinism", "pnpm", ["verify:determinism"]),
  frozenVerificationStepV1("balance", "pnpm", ["verify:balance:freeze"]),
  frozenVerificationStepV1("assets", "pnpm", ["verify:assets"]),
  frozenVerificationStepV1("build-poc", "pnpm", ["build:poc"]),
  frozenVerificationStepV1("build-e2e", "pnpm", ["build:e2e"]),
  frozenVerificationStepV1("semantic", "pnpm", ["verify:semantic"]),
  frozenVerificationStepV1("ui", "pnpm", ["verify:ui"]),
  frozenVerificationStepV1("bundle", "pnpm", ["verify:bundle"]),
  frozenVerificationStepV1("e2e-smoke", "pnpm", ["test:e2e:smoke"]),
  frozenVerificationStepV1("artifact", "pnpm", ["verify:artifact", "--", "--allow-development"]),
  frozenVerificationStepV1("docs", "pnpm", ["verify:docs"]),
]);

export const coreVerificationCommandsV1 = Object.freeze(
  verificationStepsV1.map(({ args, command }) => Object.freeze([command, args])),
);

export function snapshotTrackedPathsV1(root, paths) {
  return new Map(
    paths.map((path) => [
      path,
      existsSync(join(root, path))
        ? createHash("sha256")
            .update(readFileSync(join(root, path)))
            .digest("hex")
        : null,
    ]),
  );
}

function trackedSnapshot(root) {
  const paths = execFileSync("git", ["ls-files", "-z"], { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  return snapshotTrackedPathsV1(root, paths);
}

function worktreeStatus(root) {
  return execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
}

export function changedTrackedPathsV1(before, after) {
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

export function discoverVitestTestsV1(root) {
  const output = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (lstatSync(path).isSymbolicLink())
        throw new TypeError(`test symlink is forbidden: ${path}`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        const candidate = relative(root, path).split(sep).join("/");
        if (classifyVitestProjectV1(candidate) !== null) output.push(candidate);
      }
    }
  };
  for (const entry of workspacePackages) {
    const source = join(root, entry.path, "src");
    if (existsSync(source)) walk(source);
  }
  const scripts = join(root, "scripts");
  if (existsSync(scripts)) walk(scripts);
  return output.toSorted();
}

export function assertVitestOwnershipV1(discovered, listings) {
  const projects = ["unit", "contract", "property", "scripts"];
  for (const project of projects) {
    const listed = listings[project] ?? [];
    const duplicates = listed.filter((path, index) => listed.indexOf(path) !== index);
    if (duplicates.length > 0)
      throw new TypeError(
        `duplicate ${project} list paths: ${[...new Set(duplicates)].join(", ")}`,
      );
  }
  for (const path of discovered) {
    const owner = classifyVitestProjectV1(path);
    const owners = projects.filter((project) => (listings[project] ?? []).includes(path));
    if (owners.length === 0) throw new TypeError(`missing Vitest list owner: ${path}`);
    if (owners.length > 1 || owners[0] !== owner)
      throw new TypeError(`multiple or wrong Vitest owners for ${path}: ${owners.join(", ")}`);
  }
  for (const [project, paths] of Object.entries(listings)) {
    for (const path of paths)
      if (!discovered.includes(path))
        throw new TypeError(`unowned ${project} Vitest path: ${path}`);
  }
}

function verifyVitestDiscovery(root) {
  const listings = {};
  for (const project of ["unit", "contract", "property", "scripts"]) {
    const result = spawnSync(
      "pnpm",
      ["exec", "vitest", "list", "--project", project, "--filesOnly"],
      { cwd: root, encoding: "utf8" },
    );
    if (result.status !== 0) throw new TypeError(`Vitest ${project} list failed`);
    listings[project] = result.stdout
      .split(/\r?\n/u)
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => path.replace(/^\[[^\]]+\]\s+/u, ""))
      .map((path) => (path.startsWith(root) ? relative(root, path).split(sep).join("/") : path));
  }
  assertVitestOwnershipV1(discoverVitestTestsV1(root), listings);
}

export function runCoreCommandSequenceV1(
  root,
  spawn = spawnSync,
  verifyDiscovery = verifyVitestDiscovery,
  afterMaterialization = () => {},
) {
  for (const { args, command, id } of verificationStepsV1) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0 || result.signal !== null) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
    if (id === "materialization") afterMaterialization();
    if (id === "scripts") verifyDiscovery(root);
  }
}

export function runCoreVerificationV1(root, ports = {}) {
  const {
    snapshot = trackedSnapshot,
    spawn = spawnSync,
    status = worktreeStatus,
    verifyDiscovery = verifyVitestDiscovery,
  } = ports;
  let before = null;
  let beforeStatus = null;
  let failure = null;
  try {
    runCoreCommandSequenceV1(root, spawn, verifyDiscovery, () => {
      before = snapshot(root);
      beforeStatus = status(root);
      if (beforeStatus !== "") {
        throw new TypeError(
          `verification started with dirty worktree: ${JSON.stringify(beforeStatus)}`,
        );
      }
    });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (before !== null) {
      const mutations = changedTrackedPathsV1(before, snapshot(root));
      const afterStatus = status(root);
      if (beforeStatus !== null && afterStatus !== beforeStatus) {
        failure = `verification changed worktree status: ${JSON.stringify(afterStatus)}`;
      }
      if (mutations.length > 0) {
        failure = `verification changed tracked files: ${mutations.join(", ")}`;
      }
    }
  }
  if (failure !== null) throw new TypeError(failure);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCoreVerificationV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
