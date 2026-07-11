// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { workspacePackages } from "./workspace-policy.mjs";

const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/u;
const TEST_FILE = /\.(?:test|spec)(?:-d)?\.[cm]?[jt]sx?$/u;
const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/gu;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root) {
  const files = [];
  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && SOURCE_EXTENSION.test(entry.name) && !TEST_FILE.test(entry.name)) {
        files.push(path);
      }
    }
  }
  for (const entry of workspacePackages) await walk(join(root, entry.path, "src"));
  return files.sort();
}

async function resolveRelativeImport(file, specifier) {
  const raw = resolve(dirname(file), specifier);
  const withoutRuntimeExtension = raw.replace(/\.(?:m?js|cjs)$/u, "");
  const candidates = [
    raw,
    `${withoutRuntimeExtension}.ts`,
    `${withoutRuntimeExtension}.tsx`,
    `${withoutRuntimeExtension}.mts`,
    `${withoutRuntimeExtension}.cts`,
    join(raw, "index.ts"),
    join(raw, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

function canonicalCycle(cycle) {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => {
    const rotated = [...nodes.slice(index), ...nodes.slice(0, index)];
    return [...rotated, rotated[0]];
  });
  rotations.sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  return rotations[0];
}

export async function verifyCycles(root) {
  const files = await collectFiles(root);
  const fileSet = new Set(files);
  const graph = new Map(files.map((file) => [file, []]));

  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2];
      if (!specifier?.startsWith(".")) continue;
      const target = await resolveRelativeImport(file, specifier);
      if (target !== null && fileSet.has(target)) graph.get(file)?.push(target);
    }
    graph.get(file)?.sort();
  }

  const errors = new Set();
  const visiting = [];
  const active = new Set();
  const complete = new Set();

  function visit(file) {
    if (complete.has(file)) return;
    active.add(file);
    visiting.push(file);
    for (const target of graph.get(file) ?? []) {
      if (active.has(target)) {
        const start = visiting.indexOf(target);
        const absoluteCycle = [...visiting.slice(start), target];
        const relativeCycle = absoluteCycle.map((path) =>
          relative(root, path).split(sep).join("/"),
        );
        errors.add(`production import cycle: ${canonicalCycle(relativeCycle).join(" -> ")}`);
      } else {
        visit(target);
      }
    }
    visiting.pop();
    active.delete(file);
    complete.add(file);
  }

  for (const file of files) visit(file);
  return [...errors].sort();
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyCycles(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("cycle verification passed");
  }
}
