// SPDX-License-Identifier: MIT
import { expectTypeOf, it } from "vitest";
import type { GameApplicationPortV1 } from "./application.js";

it("defines one generic six-port Game Application surface", () => {
  type Application = GameApplicationPortV1<
    "semantic",
    "lifecycle",
    "persistence",
    "diagnostics",
    "capabilities",
    "debugTools"
  >;
  expectTypeOf<Application>().toEqualTypeOf<{
    readonly semantic: "semantic";
    readonly lifecycle: "lifecycle";
    readonly persistence: "persistence";
    readonly diagnostics: "diagnostics";
    readonly capabilities: "capabilities";
    readonly debugTools: "debugTools";
  }>();
});
