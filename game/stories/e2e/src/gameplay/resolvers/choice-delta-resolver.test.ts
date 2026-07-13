// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { PositiveSafeInteger } from "@sillymaker/base";

import { createE2eGameplayModulesV1 } from "../modules/index.js";
import { createChoiceDeltaResolverModuleV1 } from "./choice-delta-resolver.js";

type ChoiceDeltaProviderV1 = (choice: "left" | "right") => PositiveSafeInteger;

describe("E2E choice delta Resolver", () => {
  it("delegates each parsed choice to the factory-injected provider", () => {
    const provider = vi.fn((choice: "left" | "right") =>
      parsePositiveSafeInteger(choice === "left" ? 7 : 11),
    );
    const resolver = createChoiceDeltaResolverModuleV1(provider);

    expect(resolver.capabilities.resolveChoiceDelta("left")).toBe(7);
    expect(resolver.capabilities.resolveChoiceDelta("right")).toBe(11);
    expect(provider.mock.calls).toEqual([["left"], ["right"]]);
  });

  it("rejects an invalid choice before invoking the provider", () => {
    const provider = vi.fn(() => parsePositiveSafeInteger(1));
    const resolver = createChoiceDeltaResolverModuleV1(provider);

    expect(() =>
      Reflect.apply(resolver.capabilities.resolveChoiceDelta, undefined, ["middle"]),
    ).toThrow();
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    "rejects invalid provider result %s",
    (invalidResult) => {
      const provider = vi.fn(() => invalidResult);
      const resolver = createChoiceDeltaResolverModuleV1(
        provider as unknown as ChoiceDeltaProviderV1,
      );

      expect(() => resolver.capabilities.resolveChoiceDelta("left")).toThrow();
      expect(provider).toHaveBeenCalledExactlyOnceWith("left");
    },
  );

  it("has the exact frozen stateless surface and isolates factory providers", () => {
    const firstProvider = vi.fn(() => parsePositiveSafeInteger(3));
    const secondProvider = vi.fn(() => parsePositiveSafeInteger(5));
    const first = createChoiceDeltaResolverModuleV1(firstProvider);
    const second = createChoiceDeltaResolverModuleV1(secondProvider);

    expect(first).not.toBe(second);
    expect(first.capabilities).not.toBe(second.capabilities);
    expect(first.capabilities.resolveChoiceDelta("left")).toBe(3);
    expect(second.capabilities.resolveChoiceDelta("left")).toBe(5);
    expect(firstProvider).toHaveBeenCalledExactlyOnceWith("left");
    expect(secondProvider).toHaveBeenCalledExactlyOnceWith("left");

    expect(first).toMatchObject({
      bindingKind: "stateless",
      descriptor: {
        id: "e2e.choice-delta-resolver",
        contractRevision: 1,
        stateSlots: [],
        dependencies: [],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      ownerOperationSchema: null,
      ownerProposalSchema: null,
      owner: null,
    });
    expect(Object.keys(first).sort()).toEqual([
      "bindingKind",
      "capabilities",
      "commandSchema",
      "descriptor",
      "owner",
      "ownerOperationSchema",
      "ownerProposalSchema",
      "queryResultSchema",
      "querySchema",
    ]);
    expect(Object.keys(first.capabilities)).toEqual(["resolveChoiceDelta"]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.descriptor)).toBe(true);
    expect(Object.isFrozen(first.capabilities)).toBe(true);
    expect(first).not.toHaveProperty("stateSchema");
    expect(first).not.toHaveProperty("localInvariants");
    expect(first).not.toHaveProperty("createInitialState");
    expect(first).not.toHaveProperty("createReadPort");
    expect(first).not.toHaveProperty("queries");
  });

  it("assembles the final frozen module tuple in authored order", () => {
    const provider = vi.fn(() => parsePositiveSafeInteger(3));
    const modules = createE2eGameplayModulesV1(provider);

    expect(modules.map((module) => module.descriptor.id)).toEqual([
      "e2e.counter",
      "e2e.flow",
      "e2e.run",
      "e2e.choice-delta-resolver",
    ]);
    expect(Object.isFrozen(modules)).toBe(true);
    expect(modules[3].capabilities.resolveChoiceDelta("left")).toBe(3);
    expect(provider).toHaveBeenCalledExactlyOnceWith("left");
  });
});
