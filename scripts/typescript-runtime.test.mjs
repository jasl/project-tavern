// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("executes repository TypeScript tools in strip-only mode", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "stories/sandbox/scripts/verify-fixtures.mts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
