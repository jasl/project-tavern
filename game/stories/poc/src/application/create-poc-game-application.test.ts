// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { describe, expect, expectTypeOf, it } from "vitest";

import type { PocSemanticGamePortV1 } from "./create-poc-semantic-port.js";
import {
  createPocGameApplicationV1,
  type PocGameApplicationPortV1,
} from "./create-poc-game-application.js";

describe("createPocGameApplicationV1", () => {
  it("synchronously specializes the concrete six ports and preserves the exact semantic port", () => {
    const semantic = Object.freeze({}) as unknown as PocSemanticGamePortV1;
    const lifecycle = Object.freeze({}) as PocGameApplicationPortV1["lifecycle"];
    const persistence = Object.freeze({}) as PocGameApplicationPortV1["persistence"];
    const diagnostics = Object.freeze({}) as PocGameApplicationPortV1["diagnostics"];
    const capabilities = Object.freeze({}) as PocGameApplicationPortV1["capabilities"];
    const debugTools = Object.freeze({}) as PocGameApplicationPortV1["debugTools"];

    const application = createPocGameApplicationV1({
      semantic,
      lifecycle,
      persistence,
      diagnostics,
      capabilities,
      debugTools,
    });

    expect(application).not.toBeInstanceOf(Promise);
    expect(Object.isFrozen(application)).toBe(true);
    expect(Object.keys(application).toSorted()).toEqual([
      "capabilities",
      "debugTools",
      "diagnostics",
      "lifecycle",
      "persistence",
      "semantic",
    ]);
    expect(application.semantic).toBe(semantic);
    expect(application.lifecycle).toBe(lifecycle);
    expect(application.persistence).toBe(persistence);
    expect(application.diagnostics).toBe(diagnostics);
    expect(application.capabilities).toBe(capabilities);
    expect(application.debugTools).toBe(debugTools);

    expectTypeOf<
      Parameters<typeof createPocGameApplicationV1>[0]["semantic"]
    >().toEqualTypeOf<PocSemanticGamePortV1>();
    expectTypeOf(application.semantic).toEqualTypeOf<PocSemanticGamePortV1>();
    expectTypeOf(application).toEqualTypeOf<PocGameApplicationPortV1>();
    expectTypeOf(application).not.toMatchTypeOf<PromiseLike<unknown>>();
  });

  it("keeps the test fixture on the concrete production application owner", async () => {
    const source = await readFile(
      new URL("../testing/poc-runtime-test-fixture.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("createPocGameApplicationV1");
    expect(source).not.toContain("createGameApplicationV1");
  });
});
