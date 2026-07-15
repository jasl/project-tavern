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

const { canonicalPocReferenceCommandFixtureBytesV1, compilePocReferenceStrategyV1 } =
  await import("../src/testing/compile-reference-strategy.ts");
const { pocReferenceStrategyDefinitionsV1, pocReferenceStrategyIdsV1 } =
  await import("../src/testing/reference-strategy-definitions.ts");

const directoryUrl = new URL("../src/test/fixtures/commands/", import.meta.url);
const filenames = pocReferenceStrategyIdsV1.map((strategyId) => `${strategyId}.json`);
const expectedFilenames = new Set(filenames);
const compiled = [];

for (const strategyId of pocReferenceStrategyIdsV1) {
  const result = await compilePocReferenceStrategyV1(pocReferenceStrategyDefinitionsV1[strategyId]);
  if (
    result.finalView.status !== "terminal" ||
    result.finalSnapshot.integrity.mode !== "normal" ||
    result.results.some(({ kind }) => kind !== "committed")
  ) {
    throw new TypeError(`${strategyId} did not compile to a normal committed terminal run`);
  }
  compiled.push([`${strategyId}.json`, canonicalPocReferenceCommandFixtureBytesV1(result.fixture)]);
}

await mkdir(directoryUrl, { recursive: true });
for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
  if (!expectedFilenames.has(entry.name) || !entry.isFile()) {
    throw new TypeError(`unexpected PoC command fixture entry ${entry.name}`);
  }
}
for (const [filename, bytes] of compiled) {
  const target = new URL(filename, directoryUrl);
  await writeFile(target, bytes);
  console.log(`updated ${target.pathname}`);
}
