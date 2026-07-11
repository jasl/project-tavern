// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { compareReleaseManifestsV1 } from "./verify-release.mjs";

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
