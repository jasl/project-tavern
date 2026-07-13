// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { lstat, readdir, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

async function walk(root, directory, output) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new TypeError(`script test symlink is forbidden: ${path}`);
    if (entry.isDirectory()) await walk(root, path, output);
    else if (entry.isFile()) output.push(relative(root, path).split(sep).join("/"));
  }
}

export async function discoverScriptTestsV1(root) {
  const scripts = join(root, "scripts");
  if (!(await realpath(scripts)).startsWith(`${await realpath(root)}${sep}`)) {
    throw new TypeError("scripts directory escapes repository");
  }
  const files = [];
  await walk(root, scripts, files);
  return Object.freeze({
    node: files.filter((path) => path.endsWith(".test.mjs")).sort(),
    vitest: files.filter((path) => path.endsWith(".test.ts")).sort(),
  });
}

export function scriptTestCommandsV1(discovered) {
  const commands = [];
  if (discovered.node.length > 0) {
    commands.push(["node", ["--experimental-strip-types", "--test", ...discovered.node]]);
  }
  if (discovered.vitest.length > 0)
    commands.push(["pnpm", ["exec", "vitest", "run", "--project", "scripts"]]);
  return commands;
}

export function verifyVitestListOwnershipV1(discovered, listed) {
  const counts = new Map();
  for (const path of listed) counts.set(path, (counts.get(path) ?? 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([path]) => path);
  if (duplicates.length > 0)
    throw new TypeError(`duplicate Vitest list paths: ${duplicates.join(", ")}`);
  const missing = discovered.filter((path) => !counts.has(path));
  const extra = listed.filter((path) => !discovered.includes(path));
  if (missing.length > 0) throw new TypeError(`missing Vitest list paths: ${missing.join(", ")}`);
  if (extra.length > 0) throw new TypeError(`unowned Vitest list paths: ${extra.join(", ")}`);
}

export async function runScriptTestsV1(root, kind = "all") {
  const discovered = await discoverScriptTestsV1(root);
  if (kind !== "mjs" && discovered.vitest.length > 0) {
    const listed = spawnSync(
      "pnpm",
      ["exec", "vitest", "list", "--project", "scripts", "--filesOnly"],
      { cwd: root, encoding: "utf8" },
    );
    if (listed.status !== 0) throw new TypeError("Vitest script list failed");
    const paths = String(listed.stdout)
      .split(/\r?\n/u)
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => path.replace(/^\[[^\]]+\]\s+/u, ""))
      .map((path) => (path.startsWith(root) ? relative(root, path).split(sep).join("/") : path));
    verifyVitestListOwnershipV1(discovered.vitest, paths);
  }
  const selected =
    kind === "mjs"
      ? scriptTestCommandsV1({ node: discovered.node, vitest: [] })
      : scriptTestCommandsV1(discovered);
  for (const [command, args] of selected) {
    const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
    if (result.status !== 0) throw new TypeError(`${command} script tests failed`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  await runScriptTestsV1(
    root,
    process.argv.includes("--kind") && process.argv.includes("mjs") ? "mjs" : "all",
  );
}
