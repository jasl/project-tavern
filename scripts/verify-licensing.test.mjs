// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyLicensing } from "./verify-licensing.mjs";

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-license-"));
  await mkdir(join(root, "LICENSES"), { recursive: true });
  await writeFile(join(root, ".gitignore"), "/references/\n", "utf8");
  await writeFile(join(root, "NOTICE"), "Required Notice: Example.\n", "utf8");
  await writeFile(join(root, "LICENSES", "Example.txt"), "legal\n", "utf8");
  return root;
}

const policy = {
  requiredFiles: ["NOTICE", "LICENSES/Example.txt"],
  canonicalHashes: { "LICENSES/Example.txt": sha256("legal\n") },
  requiredNotice: "Required Notice: Example.",
  packageLicenses: { "packages/base/package.json": "MIT" },
};

test("accepts a complete repository fixture", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(
    await verifyLicensing(root, { policy, trackedReferences: "" }),
    [],
  );
});

test("reports missing and modified legal files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "LICENSES", "Example.txt"), "changed\n", "utf8");
  const errors = await verifyLicensing(root, {
    policy: { ...policy, requiredFiles: [...policy.requiredFiles, "LICENSE.md"] },
    trackedReferences: "",
  });
  assert(errors.some((error) => error.includes("missing required file: LICENSE.md")));
  assert(errors.some((error) => error.includes("canonical hash mismatch")));
});

test("reports notice, reference, and package-license violations", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "packages", "base"), { recursive: true });
  await writeFile(
    join(root, "packages", "base", "package.json"),
    JSON.stringify({ name: "@project-tavern/base", license: "ISC" }),
    "utf8",
  );
  await writeFile(join(root, "NOTICE"), "wrong\n", "utf8");
  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "references/example.txt\n",
  });
  assert(errors.some((error) => error.includes("required notice is missing")));
  assert(errors.some((error) => error.includes("tracked references are forbidden")));
  assert(errors.some((error) => error.includes("expected license MIT, got ISC")));
});
