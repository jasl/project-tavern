// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageTargets = Object.freeze({
  "@sillymaker/base": "engine/packages/base/src/index.ts",
  "@sillymaker/base/runtime": "engine/packages/base/src/runtime/index.ts",
  "@sillymaker/base/testkit": "engine/packages/base/src/testkit/index.ts",
  "@sillymaker/ui": "engine/packages/ui/src/index.ts",
  "@sillymaker/ui/assets": "engine/packages/ui/src/assets/index.ts",
  "@sillymaker/ui/debug": "engine/packages/ui/src/debug/index.ts",
  "@sillymaker/ui/diagnostics": "engine/packages/ui/src/diagnostics/index.ts",
  "@sillymaker/web": "engine/packages/web/src/index.ts",
  "@project-tavern/assets": "game/packages/assets/src/index.ts",
  "@project-tavern/story-e2e": "game/stories/e2e/src/index.ts",
  "@project-tavern/story-e2e/tooling": "game/stories/e2e/src/tooling.ts",
  "@project-tavern/story-e2e/tooling-ui": "game/stories/e2e/src/tooling-ui/index.ts",
  "@project-tavern/story-poc": "game/stories/poc/src/index.ts",
  "@project-tavern/story-poc/tooling": "game/stories/poc/src/tooling/index.ts",
  "@project-tavern/story-poc/tooling-ui": "game/stories/poc/src/tooling-ui/index.ts",
});

const posix = (root, path) => relative(root, path).split(sep).join("/");
const internalWorkspaceSpecifierPattern = /^@(?:project-tavern|sillymaker)\//u;
const buildIdentityFacetsV1 = new Set([
  "engine",
  "story_simulation",
  "story_presentation",
  "application",
]);

function compareUtf16CodeUnits(left, right) {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function validateManagedPath(path) {
  const parts = path.split("/");
  if (
    path.length === 0 ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    parts.some((part) => part === "" || part === "." || part === "..") ||
    parts.includes("references")
  ) {
    throw new TypeError(`invalid import closure path: ${path}`);
  }
}

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
  const externalImports = new Map();
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
      if (dependency !== null) {
        queue.push(dependency);
      } else if (specifier.startsWith(".")) {
        errors.push(`${relativePath}: missing import: ${specifier}`);
      } else if (internalWorkspaceSpecifierPattern.test(specifier)) {
        errors.push(`${relativePath}: unknown workspace import ${specifier}`);
      } else {
        const key = `${relativePath}\0${specifier}`;
        externalImports.set(
          key,
          Object.freeze({
            owner: relativePath,
            specifier,
          }),
        );
      }
    }
  }
  return Object.freeze({
    paths: Object.freeze([...paths].sort(compareUtf16CodeUnits)),
    errors: Object.freeze(errors.sort(compareUtf16CodeUnits)),
    externalImports: Object.freeze(
      [...externalImports.values()].sort((left, right) =>
        compareUtf16CodeUnits(
          `${left.owner}\0${left.specifier}`,
          `${right.owner}\0${right.specifier}`,
        ),
      ),
    ),
  });
}

export async function collectManagedPaths(root, entries) {
  const result = await collectImportClosure(root, entries);
  if (result.errors.length > 0) throw new TypeError(result.errors.join("\n"));
  return result.paths;
}

/**
 * Hashes an already resolved set of workspace-relative files without discovering any additional
 * imports. This keeps facet filtering in the caller while retaining one live-byte record format.
 */
export async function buildImportClosureRecordsV1(root, paths, facet) {
  if (!buildIdentityFacetsV1.has(facet)) {
    throw new TypeError(`invalid import closure facet: ${facet}`);
  }
  for (const path of paths) validateManagedPath(path);
  if (new Set(paths).size !== paths.length) {
    throw new TypeError("duplicate import closure path");
  }

  const repository = await realpath(root);
  const sortedPaths = [...paths].sort(compareUtf16CodeUnits);
  const records = await Promise.all(
    sortedPaths.map(async (path) => {
      const actual = await realpath(join(repository, path));
      if (!actual.startsWith(`${repository}${sep}`)) {
        throw new TypeError(`workspace-external import closure path: ${path}`);
      }
      const actualPath = posix(repository, actual);
      if (actualPath !== path) {
        throw new TypeError(`non-canonical import closure path: ${path}`);
      }
      return Object.freeze({
        path,
        facet,
        sha256: `sha256:${createHash("sha256")
          .update(await readFile(actual))
          .digest("hex")}`,
      });
    }),
  );
  return Object.freeze(records);
}

export async function buildImportClosureV1(root, entries, facet) {
  const paths = await collectManagedPaths(root, entries);
  return buildImportClosureRecordsV1(root, paths, facet);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  void collectImportClosure(root, process.argv.slice(2)).then(
    (result) => {
      if (result.errors.length > 0) {
        console.error(result.errors.join("\n"));
        process.exitCode = 1;
      } else console.log(JSON.stringify(result.paths, null, 2));
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
