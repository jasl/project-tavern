// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildImportClosureRecordsV1,
  collectImportClosure,
  collectManagedPaths,
} from "./collect-import-closure.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
test("collects only the single E2E application closure", async () => {
  const entry = "game/stories/e2e/src/application/entry.tsx";
  const closure = await collectImportClosure(root, [entry]);
  assert.deepEqual(closure.errors, []);
  const paths = await collectManagedPaths(root, [entry]);
  assert(paths.includes("game/stories/e2e/src/application/entry.tsx"));
  assert(paths.includes("engine/packages/web/src/index.ts"));
  assert(!paths.some((path) => path.includes("developer-entry")));
  assert(!paths.some((path) => path.includes("player-entry")));
  assert(!paths.some((path) => path.includes("/testkit/")));
  assert(
    closure.externalImports.some(
      ({ owner, specifier }) =>
        owner === entry && specifier === "virtual:project-tavern/e2e-build-identity",
    ),
  );
  assert(!paths.some((path) => path.includes("virtual:project-tavern/e2e-build-identity")));
});

test("keeps the default Story and SceneGraph closure free of Web renderers", async () => {
  for (const entry of [
    "game/stories/e2e/src/index.ts",
    "game/stories/e2e/src/presentation/scene-graph.ts",
  ]) {
    const closure = await collectImportClosure(root, [entry]);
    assert.deepEqual(closure.errors, []);
    assert(!closure.paths.some((path) => path.endsWith("e2e-renderers.tsx")));
    assert(!closure.paths.some((path) => path.endsWith(".tsx")));
    assert(
      !closure.externalImports.some(
        ({ specifier }) => specifier === "react" || specifier.startsWith("react/"),
      ),
    );
  }
});

test("builds sorted live records from an explicit managed path set", async () => {
  const paths = ["vite.config.ts", "scripts/collect-import-closure.mjs"];
  const records = await buildImportClosureRecordsV1(root, paths, "application");
  assert(Object.isFrozen(records));
  assert.deepEqual(
    records.map(({ path }) => path),
    [...paths].sort(),
  );
  for (const record of records) {
    assert(Object.isFrozen(record));
    assert.equal(record.facet, "application");
    assert.equal(
      record.sha256,
      `sha256:${createHash("sha256")
        .update(await readFile(`${root}/${record.path}`))
        .digest("hex")}`,
    );
  }
  await assert.rejects(
    buildImportClosureRecordsV1(root, [paths[0], paths[0]], "application"),
    /duplicate import closure path/u,
  );
});
