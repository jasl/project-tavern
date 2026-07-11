// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { workspacePackages } from "./workspace-policy.mjs";

const EXPECTED_NODE = "24.18.0";
const EXPECTED_PNPM = "11.11.0";
const EXPECTED_TYPESCRIPT = "7.0.2";

async function readText(path, errors, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    errors.push(`missing ${label}: ${path}`);
    return null;
  }
}

async function readJson(path, errors, label) {
  const text = await readText(path, errors, label);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    errors.push(`invalid ${label}: ${path}`);
    return null;
  }
}

export async function verifyToolchain(root, options = {}) {
  const errors = [];
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const pnpmVersion =
    options.pnpmVersion ??
    execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();

  if (nodeVersion !== EXPECTED_NODE) {
    errors.push(`Node version must be ${EXPECTED_NODE}, got ${nodeVersion}`);
  }
  if (pnpmVersion !== EXPECTED_PNPM) {
    errors.push(`pnpm version must be ${EXPECTED_PNPM}, got ${pnpmVersion}`);
  }

  const nodeVersionFile = await readText(
    join(root, ".node-version"),
    errors,
    ".node-version",
  );
  if (nodeVersionFile !== null && nodeVersionFile.trim() !== EXPECTED_NODE) {
    errors.push(`.node-version must be ${EXPECTED_NODE}`);
  }

  const rootManifest = await readJson(
    join(root, "package.json"),
    errors,
    "root package metadata",
  );
  if (rootManifest !== null) {
    if (rootManifest.packageManager !== `pnpm@${EXPECTED_PNPM}`) {
      errors.push(`packageManager must be pnpm@${EXPECTED_PNPM}`);
    }
    if (rootManifest.engines?.node !== EXPECTED_NODE) {
      errors.push(`engines.node must be ${EXPECTED_NODE}`);
    }
    if (rootManifest.engines?.pnpm !== EXPECTED_PNPM) {
      errors.push(`engines.pnpm must be ${EXPECTED_PNPM}`);
    }
    if (rootManifest.devDependencies?.typescript !== EXPECTED_TYPESCRIPT) {
      errors.push(`TypeScript must be pinned to ${EXPECTED_TYPESCRIPT}`);
    }
    if (rootManifest.exports !== undefined) {
      errors.push("private root package must not declare exports");
    }
  }

  const workspaceFile = await readText(
    join(root, "pnpm-workspace.yaml"),
    errors,
    "pnpm workspace policy",
  );
  if (workspaceFile !== null) {
    const expected =
      'packages:\n  - "packages/*"\n  - "stories/*"\n  - "apps/*"\nonlyBuiltDependencies: []\n';
    if (workspaceFile !== expected) {
      errors.push("pnpm-workspace.yaml must contain only the reviewed globs and empty lifecycle allowlist");
    }
  }

  for (const entry of workspacePackages) {
    const relativePath = `${entry.path}/package.json`;
    const manifest = await readJson(
      join(root, relativePath),
      errors,
      "workspace package metadata",
    );
    if (manifest === null) continue;
    if (manifest.name !== entry.name) {
      errors.push(`${relativePath}: expected name ${entry.name}`);
    }
    if (manifest.version !== "0.0.0" || manifest.private !== true) {
      errors.push(`${relativePath}: workspace packages must be private version 0.0.0`);
    }
    if (manifest.type !== "module") {
      errors.push(`${relativePath}: type must be module`);
    }
    if (manifest.license !== entry.license) {
      errors.push(`${relativePath}: expected license ${entry.license}`);
    }
    if (manifest.exports?.["."] !== "./src/index.ts") {
      errors.push(`${relativePath}: initial root export must target ./src/index.ts`);
    }
    for (const dependencyName of entry.edges) {
      if (manifest.dependencies?.[dependencyName] !== "workspace:*") {
        errors.push(`${relativePath}: ${dependencyName} must use workspace:*`);
      }
    }
  }

  return errors;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyToolchain(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("toolchain verification passed");
  }
}
