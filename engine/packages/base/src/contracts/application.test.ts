// SPDX-License-Identifier: MIT
import { expectTypeOf, it } from "vitest";
import type {
  DebugFixtureListResultV1,
  DebugToolsOperationResultV1,
  DebugToolsPortV1,
  GameApplicationPortV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityOperationResultV1,
  RuntimeCapabilityPortV1,
} from "./application.js";

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

it("defines the closed runtime capability contract", () => {
  expectTypeOf<RuntimeCapabilitiesV1>().toEqualTypeOf<{
    readonly debugTools: boolean;
    readonly cheats: boolean;
    readonly automationBridge: boolean;
  }>();
  expectTypeOf<RuntimeCapabilityPortV1["setEnabled"]>().returns.toEqualTypeOf<
    Promise<RuntimeCapabilityOperationResultV1>
  >();
});

it("keeps capability denial outside allowed DebugTools results", () => {
  expectTypeOf<DebugToolsOperationResultV1<{ readonly kind: "allowed" }>>().toEqualTypeOf<
    { readonly kind: "allowed" } | { readonly kind: "capability_disabled" }
  >();
  expectTypeOf<DebugFixtureListResultV1<"fixture.one">>().toEqualTypeOf<
    | { readonly kind: "listed"; readonly fixtureIds: readonly "fixture.one"[] }
    | { readonly kind: "capability_disabled" }
  >();

  type Port = DebugToolsPortV1<
    { readonly kind: "debug" },
    { readonly kind: "executed" },
    "fixture.one",
    { readonly kind: "anchored" },
    { readonly kind: "inspected" },
    { readonly kind: "replayed" },
    { readonly kind: "reviewed" },
    { readonly kind: "query" },
    { readonly kind: "diagnosed" }
  >;
  expectTypeOf<Port["listFixtures"]>().returns.toEqualTypeOf<
    Promise<DebugFixtureListResultV1<"fixture.one">>
  >();
});
