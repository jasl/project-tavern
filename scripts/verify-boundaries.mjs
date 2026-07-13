// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  workspacePackageByName,
  workspacePackageParents,
  workspacePackages,
} from "./workspace-policy.mjs";

const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/u;
const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/gu;

async function sourceFiles(root) {
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
      else if (entry.isFile() && SOURCE_EXTENSION.test(entry.name)) files.push(path);
    }
  }
  for (const entry of workspacePackages) await walk(join(root, entry.path, "src"));
  return files.sort();
}

function packageForFile(root, file) {
  const normalized = relative(root, file).split(sep).join("/");
  return workspacePackages.find(
    (entry) => normalized === entry.path || normalized.startsWith(`${entry.path}/`),
  );
}

function workspaceSpecifier(specifier) {
  if (!specifier.startsWith("@sillymaker/") && !specifier.startsWith("@project-tavern/")) {
    return null;
  }
  const segments = specifier.split("/");
  return {
    packageName: segments.slice(0, 2).join("/"),
    subpath: segments.length === 2 ? "." : `./${segments.slice(2).join("/")}`,
  };
}

async function packageManifest(root, entry) {
  try {
    return JSON.parse(await readFile(join(root, entry.path, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

async function discoverWorkspacePackagePaths(root) {
  const paths = [];
  for (const parent of workspacePackageParents) {
    let entries;
    try {
      entries = await readdir(join(root, parent), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const path = `${parent}/${entry.name}`;
      try {
        await readFile(join(root, path, "package.json"), "utf8");
        paths.push(path);
      } catch {}
    }
  }
  return paths.sort();
}

function declaredWorkspaceDependencies(manifest) {
  if (manifest === null) return [];
  const sections = [
    manifest.dependencies ?? {},
    manifest.devDependencies ?? {},
    manifest.optionalDependencies ?? {},
  ];
  return sections
    .flatMap((section) =>
      Object.entries(section)
        .filter(([, version]) => version === "workspace:*")
        .map(([name]) => name),
    )
    .toSorted();
}

export async function verifyBoundaries(root) {
  const errors = [];
  const manifests = new Map();
  for (const entry of workspacePackages) {
    manifests.set(entry.name, await packageManifest(root, entry));
  }

  const policyPaths = workspacePackages.map(({ path }) => path);
  const policyNames = workspacePackages.map(({ name }) => name);
  if (new Set(policyPaths).size !== policyPaths.length)
    errors.push("duplicate workspace policy path");
  if (new Set(policyNames).size !== policyNames.length)
    errors.push("duplicate workspace policy name");

  const discoveredPaths = await discoverWorkspacePackagePaths(root);
  for (const path of discoveredPaths) {
    if (!policyPaths.includes(path)) errors.push(`unregistered workspace package: ${path}`);
  }
  for (const entry of workspacePackages) {
    const expectedPath =
      entry.kind === "engine"
        ? entry.path.startsWith("engine/packages/")
        : entry.path.startsWith("game/packages/") ||
          entry.path.startsWith("game/stories/") ||
          entry.path.startsWith("game/apps/");
    if (!expectedPath) errors.push(`${entry.name}: ${entry.kind} package path mismatch`);
    if (entry.kind === "engine" && !entry.name.startsWith("@sillymaker/")) {
      errors.push(`${entry.path}: engine package scope mismatch`);
    }
    if (entry.kind === "game" && !entry.name.startsWith("@project-tavern/")) {
      errors.push(`${entry.path}: game package scope mismatch`);
    }

    const manifest = manifests.get(entry.name) ?? null;
    if (manifest === null) {
      errors.push(`${entry.path}: missing package.json`);
      continue;
    }
    if (manifest.name !== entry.name) errors.push(`${entry.path}: package name mismatch`);
    if (manifest.license !== entry.license) errors.push(`${entry.path}: package license mismatch`);
    const declared = declaredWorkspaceDependencies(manifest);
    const allowed = [...entry.edges].sort();
    if (JSON.stringify(declared) !== JSON.stringify(allowed)) {
      errors.push(`${entry.path}: workspace dependency policy mismatch`);
    }
    for (const dependencyName of entry.edges) {
      const target = workspacePackageByName.get(dependencyName);
      if (target === undefined) errors.push(`${entry.path}: unknown policy edge ${dependencyName}`);
      else if (entry.kind === "engine" && target.kind === "game") {
        errors.push(`${entry.path}: engine package may not depend on game package ${target.name}`);
      }
    }
  }

  for (const file of await sourceFiles(root)) {
    const owner = packageForFile(root, file);
    if (!owner) continue;
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;

      if (specifier.includes("references/")) {
        errors.push(`${relative(root, file)}: references/ is forbidden`);
        continue;
      }

      if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier);
        const ownerRoot = resolve(root, owner.path);
        if (target !== ownerRoot && !target.startsWith(`${ownerRoot}${sep}`)) {
          errors.push(`${relative(root, file)}: relative import escapes ${owner.path}`);
        }
        const normalizedFile = file.split(sep).join("/");
        const normalizedTarget = target.split(sep).join("/");
        if (
          normalizedFile.includes("/simulation/") &&
          normalizedTarget.includes("/presentation/")
        ) {
          errors.push(`${relative(root, file)}: simulation may not import presentation`);
        }
        continue;
      }

      if (
        owner.name === "@sillymaker/base" &&
        (specifier === "react" ||
          specifier.startsWith("react/") ||
          specifier.startsWith("react-dom") ||
          specifier.startsWith("node:fs") ||
          specifier.startsWith("node:http") ||
          specifier === "idb")
      ) {
        errors.push(`engine/packages/base may not import ${specifier}`);
      }

      const parsed = workspaceSpecifier(specifier);
      if (!parsed) continue;
      const target = workspacePackageByName.get(parsed.packageName);
      if (!target) {
        errors.push(`${relative(root, file)}: unknown workspace import ${specifier}`);
        continue;
      }
      if (owner.kind === "engine" && target.kind === "game") {
        errors.push(`${owner.path}: engine package may not import game package ${target.name}`);
      }
      if (!owner.edges.includes(parsed.packageName)) {
        errors.push(`${owner.path} may not import ${parsed.packageName}`);
      }
      const manifest = manifests.get(target.name);
      if (parsed.subpath !== "." && manifest?.exports?.[parsed.subpath] === undefined) {
        errors.push(`${relative(root, file)}: package-internal deep import ${specifier}`);
      }
      const ownerManifest = manifests.get(owner.name);
      if (
        owner.name !== target.name &&
        ownerManifest !== null &&
        ownerManifest?.dependencies?.[target.name] !== "workspace:*" &&
        ownerManifest?.devDependencies?.[target.name] !== "workspace:*"
      ) {
        errors.push(`${owner.path}: undeclared workspace dependency ${target.name}`);
      }
    }
  }

  return [...new Set(errors)].sort();
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyBoundaries(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("boundary verification passed");
  }
}
