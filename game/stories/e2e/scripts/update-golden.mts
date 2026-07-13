// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

import type { E2eCommandV1 } from "../src/contracts.ts";
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
const { canonicalJsonBytes, digestCanonical, parseNonZeroUint32 } =
  await import("@sillymaker/base");
const { createE2eSessionV1 } = await import("../src/session.ts");
const { resolveStoryForTestV1 } = await import("@sillymaker/base/testkit");
const { e2eStoryEntryV1 } = await import("../src/story-entry.ts");

const commands: readonly E2eCommandV1[] = Object.freeze([
  { kind: "e2e.counter.increment" },
  { kind: "e2e.counter.increment" },
  { kind: "e2e.counter.increment" },
  { kind: "e2e.counter.reject" },
]);
const seed = parseNonZeroUint32(0x0002_3049);
const gameSimulation = resolveStoryForTestV1(e2eStoryEntryV1).gameSimulation;
const session = createE2eSessionV1(gameSimulation, { rngSeed: seed });
const outcomes: string[] = [];
for (const command of commands) {
  const outcome = await session.dispatch(command);
  if (outcome.kind !== "executed") throw new TypeError("golden command was not executed");
  outcomes.push(outcome.execution.kind);
}
const finalSnapshot = session.getCurrentSnapshot();
const golden = {
  commands,
  finalStateDigest: digestCanonical("sillymaker:state:v1", finalSnapshot),
  finalSnapshot,
  outcomes,
  seed,
};
const path = fileURLToPath(new URL("../golden/counter-walk.json", import.meta.url));
await writeFile(path, Buffer.concat([Buffer.from(canonicalJsonBytes(golden)), Buffer.from("\n")]));
console.log(`updated ${path}`);
