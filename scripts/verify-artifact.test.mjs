// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyArtifactDirectoryV1 } from "./verify-artifact.mjs";

test("rejects an absolute base, unsorted or corrupt manifest, and missing legal files", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-artifact-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "index.html"), '<script src="/assets/app.js"></script>');
  await writeFile(join(root, "assets/app.js"), "app");
  await writeFile(
    join(root, "artifact-manifest.v1.json"),
    JSON.stringify({
      schemaRevision: 1,
      base: "/",
      files: [
        { path: "index.html", byteLength: 1, digest: "sha256:" + "0".repeat(64) },
        { path: "assets/app.js", byteLength: 3, digest: "sha256:" + "0".repeat(64) },
      ],
    }),
  );
  const errors = await verifyArtifactDirectoryV1(root, { probeNested: false });
  assert(errors.some((error) => error.includes("base must be ./")));
  assert(errors.some((error) => error.includes("manifest paths are not sorted")));
  assert(errors.some((error) => error.includes("digest mismatch")));
  assert(errors.some((error) => error.includes("missing project legal file")));
});
