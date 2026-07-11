// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_POLICY = Object.freeze({
  requiredFiles: Object.freeze([
    "LICENSE.md",
    "NOTICE",
    "LICENSES/MIT.txt",
    "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
    "LICENSES/CC-BY-NC-SA-4.0.txt",
    "THIRD_PARTY_NOTICES.md",
    "TRADEMARKS.md",
    "CONTRIBUTING.md",
  ]),
  canonicalHashes: Object.freeze({
    "LICENSES/MIT.txt": "51a8b6aab0b3000d6ed05cd3327ff9b427b2c1163d22f51a3cc825e65e63a72f",
    "LICENSES/PolyForm-Noncommercial-1.0.0.txt":
      "ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8",
    "LICENSES/CC-BY-NC-SA-4.0.txt":
      "e66c269d4819aaab34b49ef5220c4ddab6756f21bb5180761a4eb8561f2b7bbd",
  }),
  requiredNotice: "Required Notice: Copyright 2026 Jun Jiang (jasl).",
  packageLicenses: Object.freeze({
    "package.json": "SEE LICENSE IN LICENSE.md",
    "packages/base/package.json": "MIT",
    "packages/ui/package.json": "MIT",
    "apps/web/package.json": "MIT",
    "packages/modules/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/demo/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/e2e/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/sandbox/package.json": "PolyForm-Noncommercial-1.0.0",
    "packages/assets/package.json": "SEE LICENSE IN LICENSE.md",
  }),
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeTrackedPaths(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value === "") return [];
  return value.split(value.includes("\0") ? "\0" : /\r?\n/u).filter(Boolean);
}

export async function verifyLicensing(root, options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const errors = [];

  for (const relativePath of policy.requiredFiles) {
    if (!(await exists(join(root, relativePath)))) {
      errors.push(`missing required file: ${relativePath}`);
    }
  }

  for (const [relativePath, expected] of Object.entries(policy.canonicalHashes)) {
    const path = join(root, relativePath);
    if (!(await exists(path))) continue;
    const actual = sha256(await readFile(path));
    if (actual !== expected) {
      errors.push(`canonical hash mismatch for ${relativePath}: ${actual}`);
    }
  }

  const noticePath = join(root, "NOTICE");
  if (await exists(noticePath)) {
    const notice = await readFile(noticePath, "utf8");
    if (!notice.split(/\r?\n/u).includes(policy.requiredNotice)) {
      errors.push("required notice is missing from NOTICE");
    }
  }

  const gitignorePath = join(root, ".gitignore");
  if (!(await exists(gitignorePath))) {
    errors.push("missing required file: .gitignore");
  } else {
    const gitignore = await readFile(gitignorePath, "utf8");
    if (!gitignore.split(/\r?\n/u).includes("/references/")) {
      errors.push(".gitignore must contain /references/");
    }
  }

  const trackedReferences =
    options.trackedReferences ??
    execFileSync("git", ["ls-files", "-z", "--", "references"], {
      cwd: root,
      encoding: "utf8",
    });
  const trackedReferenceFiles = normalizeTrackedPaths(trackedReferences);
  if (trackedReferenceFiles.length > 0) {
    errors.push(`tracked references are forbidden: ${trackedReferenceFiles.join(", ")}`);
  }

  for (const [relativePath, expected] of Object.entries(policy.packageLicenses)) {
    const path = join(root, relativePath);
    if (!(await exists(path))) {
      errors.push(`missing required package metadata: ${relativePath}`);
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path, "utf8"));
    } catch {
      errors.push(`invalid package metadata: ${relativePath}`);
      continue;
    }
    if (parsed.license !== expected) {
      errors.push(`${relativePath}: expected license ${expected}, got ${String(parsed.license)}`);
    }
  }

  return errors;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyLicensing(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("licensing verification passed");
  }
}
