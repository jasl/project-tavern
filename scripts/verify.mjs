// SPDX-License-Identifier: MIT
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyVitestProjectV1 } from "./classify-vitest-project.mjs";
import { workspacePackages } from "./workspace-policy.mjs";

export const coreVerificationCommandsV1 = Object.freeze([
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
  ["pnpm", ["verify:phase4"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test:unit"]],
  ["pnpm", ["test:contract"]],
  ["pnpm", ["test:property"]],
  ["pnpm", ["build"]],
  ["pnpm", ["build:poc"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:semantic"]],
  ["pnpm", ["verify:ui"]],
  ["pnpm", ["verify:assets"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact"]],
  ["pnpm", ["test:e2e:smoke"]],
]);

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
  for (const [index, [command, args]] of coreVerificationCommandsV1.entries()) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0 || result.signal !== null) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
    if (index === 0) afterMaterialization();
    if (index === 1) verifyDiscovery(root);
  }
}

export function runCoreVerificationV1(root, ports = {}) {
  const {
    snapshot = trackedSnapshot,
    spawn = spawnSync,
    verifyDiscovery = verifyVitestDiscovery,
  } = ports;
  let before = null;
  let failure = null;
  try {
    runCoreCommandSequenceV1(root, spawn, verifyDiscovery, () => {
      before = snapshot(root);
    });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (before !== null) {
      const mutations = changedTrackedPathsV1(before, snapshot(root));
      if (mutations.length > 0)
        failure = `verification changed tracked files: ${mutations.join(", ")}`;
    }
  }
  if (failure !== null) throw new TypeError(failure);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCoreVerificationV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
