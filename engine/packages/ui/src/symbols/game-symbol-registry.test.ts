// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import {
  createGameSymbolRegistryV1,
  parseGameSymbolIdV1,
  type GameSymbolIdV1,
  type GameSymbolProviderV1,
  type GameSymbolRenderPropsV1,
} from "./game-symbol-registry.js";

function EmptySymbolV1(_props: GameSymbolRenderPropsV1) {
  return null;
}

function FirstStorySymbolV1(_props: GameSymbolRenderPropsV1) {
  return null;
}

function SecondStorySymbolV1(_props: GameSymbolRenderPropsV1) {
  return null;
}

function providerV1(
  symbolId: GameSymbolIdV1,
  component: GameSymbolProviderV1["component"] = EmptySymbolV1,
): GameSymbolProviderV1 {
  return Object.freeze({ symbolId, component });
}

describe("GameSymbolIdV1", () => {
  it("parses one stable Story-owned symbol ID without changing its bytes", () => {
    expect(parseGameSymbolIdV1("symbol.e2e.stamina")).toBe("symbol.e2e.stamina");
  });

  it.each(["", "   ", "Symbol.e2e.stamina", "symbol/e2e/stamina", "symbol"])(
    "rejects an invalid symbol ID: %j",
    (value) => {
      expect(() => parseGameSymbolIdV1(value)).toThrow();
    },
  );
});

describe("GameSymbolRegistryV1", () => {
  it("rejects an empty provider ID even when untyped input crosses the runtime boundary", () => {
    const emptyIdProvider = providerV1("" as GameSymbolIdV1);

    expect(() => createGameSymbolRegistryV1([emptyIdProvider])).toThrow();
  });

  it("rejects the first duplicate in authored provider order", () => {
    const firstId = parseGameSymbolIdV1("symbol.e2e.first");
    const secondId = parseGameSymbolIdV1("symbol.e2e.second");

    expect(() =>
      createGameSymbolRegistryV1([
        providerV1(firstId),
        providerV1(secondId),
        providerV1(firstId, FirstStorySymbolV1),
        providerV1(secondId, SecondStorySymbolV1),
      ]),
    ).toThrow(firstId);
  });

  it("resolves authored providers exactly and freezes public registry records", () => {
    const firstId = parseGameSymbolIdV1("symbol.e2e.first");
    const secondId = parseGameSymbolIdV1("symbol.e2e.second");
    const registry = createGameSymbolRegistryV1([
      providerV1(firstId, FirstStorySymbolV1),
      providerV1(secondId, SecondStorySymbolV1),
    ]);

    const first = registry.resolve(firstId);
    const second = registry.resolve(secondId);

    expect(first).toEqual({ kind: "found", component: FirstStorySymbolV1 });
    expect(second).toEqual({ kind: "found", component: SecondStorySymbolV1 });
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("returns the typed not-found result for an unknown symbol ID", () => {
    const registry = createGameSymbolRegistryV1([]);

    const result = registry.resolve(parseGameSymbolIdV1("symbol.e2e.unknown"));

    expect(result).toEqual({
      kind: "not_found",
      code: "ui.game_symbol_not_found",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("keeps Story registries independent even when they bind the same symbol ID", () => {
    const sharedId = parseGameSymbolIdV1("symbol.shared.stamina");
    const firstStoryRegistry = createGameSymbolRegistryV1([
      providerV1(sharedId, FirstStorySymbolV1),
    ]);
    const secondStoryRegistry = createGameSymbolRegistryV1([
      providerV1(sharedId, SecondStorySymbolV1),
    ]);

    expect(firstStoryRegistry.resolve(sharedId)).toEqual({
      kind: "found",
      component: FirstStorySymbolV1,
    });
    expect(secondStoryRegistry.resolve(sharedId)).toEqual({
      kind: "found",
      component: SecondStorySymbolV1,
    });
    expect(firstStoryRegistry).not.toBe(secondStoryRegistry);
  });
});
