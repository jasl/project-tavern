// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); } catch (error) {
      if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      throw error;
    }
  },
});
const { parseNonZeroUint32 } = await import("@project-tavern/base");
const { createSandboxSessionV1 } = await import("../src/session.ts");
const { resolveStoryForTestV1 } = await import("@project-tavern/base/testkit");
const { sandboxStoryEntryV1, specializeSandboxResolvedStoryV1 } = await import("../src/story-entry.ts");

async function run(seed: number): Promise<number> {
  const session = createSandboxSessionV1(specializeSandboxResolvedStoryV1(resolveStoryForTestV1(sandboxStoryEntryV1)).profile, {
    rngSeed: parseNonZeroUint32(seed),
  });
  for (let count = 0; count < 3; count += 1) {
    const outcome = await session.dispatch({ kind: "sandbox.counter.increment" });
    if (outcome.kind !== "executed" || outcome.execution.kind !== "committed") {
      throw new TypeError(`seed ${seed} did not commit`);
    }
  }
  return session.getCurrentSnapshot().state.counter.value;
}

for (let seed = 1; seed <= 1_000; seed += 1) {
  const first = await run(seed);
  const second = await run(seed);
  if (first !== 3 || second !== first) {
    throw new TypeError(`seed ${seed} is not deterministic`);
  }
}
console.log("sandbox 1..1000 deterministic mechanics verification passed");
