// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
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
const { sandboxSnapshotSchemaV1 } = await import("../src/contracts.ts");
const { createSandboxInitialSnapshotV1 } = await import("../src/session.ts");
const { resolveStoryForTestV1 } = await import("@sillymaker/base/testkit");
const { sandboxStoryEntryV1, specializeSandboxResolvedStoryV1 } =
  await import("../src/story-entry.ts");

const seed = parseNonZeroUint32(0x0002_3049);
const expected = {
  rngSeed: seed,
  snapshot: createSandboxInitialSnapshotV1(
    specializeSandboxResolvedStoryV1(resolveStoryForTestV1(sandboxStoryEntryV1)).gameSimulation,
    { rngSeed: seed },
  ),
};
const path = fileURLToPath(new URL("../fixtures/session-zero.json", import.meta.url));
const bytes = await readFile(path);
if (!bytes.equals(Buffer.concat([Buffer.from(canonicalJsonBytes(expected)), Buffer.from("\n")]))) {
  throw new TypeError("Sandbox fixture bytes differ from the reviewed canonical fixture");
}
const decoded = JSON.parse(bytes.toString("utf8")) as { rngSeed?: unknown; snapshot?: unknown };
parseNonZeroUint32(decoded.rngSeed);
sandboxSnapshotSchemaV1.parse(decoded.snapshot);
console.log("sandbox fixture verification passed");
