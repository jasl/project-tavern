// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageTargets = Object.freeze({
  "@sillymaker/base": "engine/packages/base/src/index.ts",
  "@sillymaker/base/runtime": "engine/packages/base/src/runtime/index.ts",
  "@sillymaker/base/testkit": "engine/packages/base/src/testkit/index.ts",
  "@sillymaker/ui": "engine/packages/ui/src/index.ts",
  "@sillymaker/web": "engine/packages/web/src/index.ts",
  "@project-tavern/story-e2e": "game/stories/e2e/src/index.ts",
  "@project-tavern/story-e2e/development": "game/stories/e2e/src/development.ts",
});

const posix = (root, path) => relative(root, path).split(sep).join("/");
async function existing(candidates) {
  for (const path of candidates) {
    try {
      if ((await lstat(path)).isFile()) return path;
    } catch {}
  }
  return null;
}

async function resolveSpecifier(root, owner, specifier) {
  const packageTarget = packageTargets[specifier];
  if (packageTarget !== undefined) return join(root, packageTarget);
  if (!specifier.startsWith(".")) return null;
  const raw = resolve(dirname(owner), specifier);
  const extension = extname(raw);
  const candidates =
    extension === ".js"
      ? [raw, `${raw.slice(0, -3)}.ts`, `${raw.slice(0, -3)}.tsx`]
      : extension === ""
        ? [raw, `${raw}.ts`, `${raw}.tsx`, join(raw, "index.ts"), join(raw, "index.tsx")]
        : [raw];
  return existing(candidates);
}

export async function collectImportClosure(root, entries) {
  const repository = await realpath(root);
  const queue = entries.map((entry) => resolve(root, entry));
  const paths = new Set();
  const errors = [];
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) continue;
    let actual;
    try {
      actual = await realpath(path);
    } catch {
      errors.push(`missing import: ${posix(root, path)}`);
      continue;
    }
    if (!actual.startsWith(`${repository}${sep}`) && actual !== repository) {
      errors.push(`workspace-external import: ${path}`);
      continue;
    }
    const relativePath = posix(root, actual);
    if (relativePath === "references" || relativePath.startsWith("references/")) {
      errors.push(`references import is forbidden: ${relativePath}`);
      continue;
    }
    if (paths.has(relativePath)) continue;
    paths.add(relativePath);
    if (!/\.(?:ts|tsx|mts|mjs|js|jsx)$/u.test(relativePath)) continue;
    const source = await readFile(actual, "utf8");
    if (/\bimport\s*\(\s*(?!["'])/u.test(source)) {
      errors.push(`${relativePath}: dynamic import path is not static`);
    }
    const specifiers = [];
    const staticPattern =
      /(?:\bimport|\bexport)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
    const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
    for (const match of source.matchAll(staticPattern)) if (match[1]) specifiers.push(match[1]);
    for (const match of source.matchAll(dynamicPattern)) if (match[1]) specifiers.push(match[1]);
    for (const specifier of specifiers) {
      const dependency = await resolveSpecifier(root, actual, specifier);
      if (dependency !== null) queue.push(dependency);
    }
  }
  return Object.freeze({
    paths: Object.freeze([...paths].sort()),
    errors: Object.freeze(errors.sort()),
  });
}

export async function collectManagedPaths(root, entries) {
  const result = await collectImportClosure(root, entries);
  if (result.errors.length > 0) throw new TypeError(result.errors.join("\n"));
  return result.paths;
}

export async function buildImportClosureV1(root, entries, facet) {
  const paths = await collectManagedPaths(root, entries);
  return Promise.all(
    paths.map(async (path) =>
      Object.freeze({
        path,
        facet,
        sha256: `sha256:${createHash("sha256")
          .update(await readFile(join(root, path)))
          .digest("hex")}`,
      }),
    ),
  );
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const result = await collectImportClosure(root, process.argv.slice(2));
  if (result.errors.length > 0) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else console.log(JSON.stringify(result.paths, null, 2));
}
