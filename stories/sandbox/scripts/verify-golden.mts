// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

import type { SandboxCommandV1 } from "../src/contracts.ts";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); } catch (error) {
      if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      throw error;
    }
  },
});
const { canonicalJsonBytes, digestCanonical, parseNonZeroUint32 } = await import("@project-tavern/base");
const { createSandboxSessionV1 } = await import("../src/session.ts");
const { resolveStoryForTestV1 } = await import("@project-tavern/base/testkit");
const { sandboxStoryEntryV1, specializeSandboxResolvedStoryV1 } = await import("../src/story-entry.ts");

const commands: readonly SandboxCommandV1[] = Object.freeze([
  { kind: "sandbox.counter.increment" },
  { kind: "sandbox.counter.increment" },
  { kind: "sandbox.counter.increment" },
  { kind: "sandbox.counter.reject" },
]);
const seed = parseNonZeroUint32(0x0002_3049);
const session = createSandboxSessionV1(specializeSandboxResolvedStoryV1(resolveStoryForTestV1(sandboxStoryEntryV1)).profile, { rngSeed: seed });
const outcomes: string[] = [];
for (const command of commands) {
  const outcome = await session.dispatch(command);
  if (outcome.kind !== "executed") throw new TypeError("golden command was not executed");
  outcomes.push(outcome.execution.kind);
}
const finalSnapshot = session.getCurrentSnapshot();
const expected = {
  commands,
  finalStateDigest: digestCanonical("project-tavern:state:v1", finalSnapshot),
  finalSnapshot,
  outcomes,
  seed,
};
const path = fileURLToPath(new URL("../golden/counter-walk.json", import.meta.url));
const bytes = await readFile(path);
if (!bytes.equals(Buffer.concat([Buffer.from(canonicalJsonBytes(expected)), Buffer.from("\n")]))) {
  throw new TypeError("Sandbox golden bytes differ from deterministic execution");
}
console.log("sandbox golden verification passed");
