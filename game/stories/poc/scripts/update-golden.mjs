// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      throw error;
    }
  },
});

const { canonicalPocGoldenArtifactBytesV1, buildPocGoldenArtifactV1 } =
  await import("../src/testing/golden-artifact.ts");
const { pocReferenceStrategyIdsV1 } =
  await import("../src/testing/reference-strategy-definitions.ts");
const { pocReferenceToolingFixtureByStrategyIdV1 } = await import("../src/tooling-fixtures.ts");

const directoryUrl = new URL("../src/test/fixtures/golden/", import.meta.url);
const filenames = pocReferenceStrategyIdsV1.map((strategyId) => `${strategyId}.json`);
const expectedFilenames = new Set(filenames);
const generated = [];

for (const strategyId of pocReferenceStrategyIdsV1) {
  const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
  const artifact = await buildPocGoldenArtifactV1(strategyId, source.commands);
  generated.push([`${strategyId}.json`, canonicalPocGoldenArtifactBytesV1(artifact)]);
}

await mkdir(directoryUrl, { recursive: true });
for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
  if (!expectedFilenames.has(entry.name) || !entry.isFile()) {
    throw new TypeError(`unexpected PoC golden fixture entry ${entry.name}`);
  }
}
for (const [filename, bytes] of generated) {
  const target = new URL(filename, directoryUrl);
  await writeFile(target, bytes);
  console.log(`updated ${target.pathname}`);
}
