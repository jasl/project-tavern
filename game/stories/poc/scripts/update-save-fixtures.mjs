// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith(".js")) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  },
});

const { buildPocSaveFixtureMatrixV1, pocSaveFixtureNamesV1 } =
  await import("../src/testing/save-fixture-builder.ts");

const expectedFilenames = Object.freeze([
  "save.auto-opening.json",
  "save.quick-world-action.json",
  "save.manual-completed.json",
  "save.auto-current-corrupt.json",
  "save.auto-previous-valid.json",
  "save.future-format.json",
  "save.revision-mismatch.json",
  "save.digest-mismatch.json",
]);

if (
  pocSaveFixtureNamesV1.length !== expectedFilenames.length ||
  pocSaveFixtureNamesV1.some((filename, index) => filename !== expectedFilenames[index])
) {
  throw new TypeError("unexpected PoC Save fixture filename contract");
}

const built = await buildPocSaveFixtureMatrixV1();
const builtFilenames = [...built.files.keys()];
if (
  builtFilenames.length !== expectedFilenames.length ||
  builtFilenames.some((filename, index) => filename !== expectedFilenames[index])
) {
  throw new TypeError("unexpected PoC Save fixture build output");
}

const generated = expectedFilenames.map((filename) => {
  const bytes = built.files.get(filename);
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`missing canonical PoC Save fixture bytes for ${filename}`);
  }
  return [filename, bytes];
});

const directoryUrl = new URL("../src/test/fixtures/saves/", import.meta.url);
const allowedFilenames = new Set(expectedFilenames);

await mkdir(directoryUrl, { recursive: true });
for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
  if (!allowedFilenames.has(entry.name) || !entry.isFile()) {
    throw new TypeError(`unexpected PoC Save fixture entry ${entry.name}`);
  }
}

for (const [filename, bytes] of generated) {
  const target = new URL(filename, directoryUrl);
  await writeFile(target, bytes);
  console.log(`updated ${target.pathname}`);
}
