// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyLicensing } from "./verify-licensing.mjs";

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-license-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
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

async function writeValidPackageMetadata(root) {
  await mkdir(join(root, "packages", "base"), { recursive: true });
  await writeFile(
    join(root, "packages", "base", "package.json"),
    JSON.stringify({ name: "@project-tavern/base", license: "MIT" }),
    "utf8",
  );
}

test("accepts a complete repository fixture", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeValidPackageMetadata(root);

  assert.deepEqual(
    await verifyLicensing(root, { policy, trackedReferences: "" }),
    [],
  );
});

test("requires every declared workspace package manifest", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
  });

  assert(
    errors.includes(
      "missing required package metadata: packages/base/package.json",
    ),
  );
});

test("reports missing and modified legal files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeValidPackageMetadata(root);
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

test("keeps human-maintained AIGC archives outside licensing verification", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeValidPackageMetadata(root);
  const archive = join(
    root,
    "art-source",
    "aigc",
    "openai",
    "illustrations",
  );
  await mkdir(archive, { recursive: true });
  await writeFile(
    join(archive, "heroine-neutral.png"),
    new Uint8Array(),
  );
  execFileSync(
    "git",
    [
      "add",
      "--",
      "art-source/aigc/openai/illustrations/heroine-neutral.png",
    ],
    { cwd: root },
  );

  assert.deepEqual(
    await verifyLicensing(root, { policy, trackedReferences: "" }),
    [],
  );
});

test("documents the active Goal and Phase 1 stop boundary", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const docsReadme = await readFile(
    new URL("../docs/README.md", import.meta.url),
    "utf8",
  );

  assert.match(readme, /六阶段.*Goal.*已获授权.*进行中/u);
  assert.match(readme, /完成全部 Phase 1.*阶段验收后暂停.*不进入 Phase 2/u);
  assert.doesNotMatch(readme, /尚未创建或启动长期 Goal/u);
  assert.match(docsReadme, /六阶段.*Goal.*已获授权.*进行中/u);
  assert.match(
    docsReadme,
    /完成全部 Phase 1.*阶段验收后暂停.*不进入 Phase 2/u,
  );
  assert.doesNotMatch(docsReadme, /\*\*尚未启动\*\*：长期 Goal/u);
});
