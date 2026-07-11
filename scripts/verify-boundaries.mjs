// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { workspacePackageByName, workspacePackages } from "./workspace-policy.mjs";

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
  if (!specifier.startsWith("@project-tavern/")) return null;
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

export async function verifyBoundaries(root) {
  const errors = [];
  const manifests = new Map();
  for (const entry of workspacePackages) {
    manifests.set(entry.name, await packageManifest(root, entry));
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
        owner.name === "@project-tavern/base" &&
        (specifier === "react" ||
          specifier.startsWith("react/") ||
          specifier.startsWith("react-dom") ||
          specifier.startsWith("node:fs") ||
          specifier.startsWith("node:http") ||
          specifier === "idb")
      ) {
        errors.push(`packages/base may not import ${specifier}`);
      }

      const parsed = workspaceSpecifier(specifier);
      if (!parsed) continue;
      const target = workspacePackageByName.get(parsed.packageName);
      if (!target) {
        errors.push(`${relative(root, file)}: unknown workspace import ${specifier}`);
        continue;
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
