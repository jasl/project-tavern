// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

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
const { canonicalJsonBytes, parseNonZeroUint32 } = await import("@sillymaker/base");
const { createE2eInitialSnapshotV1 } = await import("../src/session.ts");
const { resolveStoryForTestV1 } = await import("@sillymaker/base/testkit");
const { e2eStoryEntryV1 } = await import("../src/story-entry.ts");

const seed = parseNonZeroUint32(0x0002_3049);
const gameSimulation = resolveStoryForTestV1(e2eStoryEntryV1).gameSimulation;
const fixture = {
  rngSeed: seed,
  snapshot: createE2eInitialSnapshotV1(gameSimulation, { rngSeed: seed }),
};
const path = fileURLToPath(new URL("../fixtures/session-zero.json", import.meta.url));
await writeFile(path, Buffer.concat([Buffer.from(canonicalJsonBytes(fixture)), Buffer.from("\n")]));
console.log(`regenerated ${path}`);
