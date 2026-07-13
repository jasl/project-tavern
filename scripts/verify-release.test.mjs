// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareReleaseManifestsV1 } from "./verify-release.mjs";

test("builds releases from the fixed E2E output without an outDir override", async () => {
  const source = await readFile(new URL("./verify-release.mjs", import.meta.url), "utf8");
  assert.match(source, /spawnSync\("pnpm", \["build:e2e"\]/u);
  assert.match(source, /cp\(join\(root, "dist\/e2e"\), artifactRoot/u);
  assert.doesNotMatch(source, /TAVERN_OUT_DIR/u);
});

test("rejects reordered paths and changed release bytes", () => {
  const first = {
    schemaRevision: 1,
    base: "./",
    files: [
      { path: "a", byteLength: 1, digest: "sha256:" + "1".repeat(64) },
      { path: "b", byteLength: 1, digest: "sha256:" + "2".repeat(64) },
    ],
  };
  assert.deepEqual(
    compareReleaseManifestsV1(first, { ...first, files: first.files.toReversed() }),
    ["release manifest order differs"],
  );
  assert.deepEqual(
    compareReleaseManifestsV1(first, {
      ...first,
      files: [first.files[0], { ...first.files[1], digest: "sha256:" + "3".repeat(64) }],
    }),
    ["release bytes differ: b"],
  );
});
