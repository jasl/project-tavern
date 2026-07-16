// SPDX-License-Identifier: MIT
import { parseModuleId, type Brand, type DeepReadonly } from "@sillymaker/base";
import type { ComponentType } from "react";

export type GameSymbolIdV1 = Brand<string, "GameSymbolIdV1">;
export type GameSymbolSizeV1 = 16 | 20 | 24 | 32;

export type GameSymbolAccessibilityV1 =
  | { readonly accessibleName: string; readonly decorative?: false }
  | { readonly accessibleName?: never; readonly decorative: true };

export type GameSymbolRenderPropsV1 = {
  readonly size: GameSymbolSizeV1;
} & GameSymbolAccessibilityV1;

export interface GameSymbolProviderV1 {
  readonly symbolId: GameSymbolIdV1;
  readonly component: ComponentType<GameSymbolRenderPropsV1>;
}

export type GameSymbolResolutionV1 =
  | {
      readonly kind: "found";
      readonly component: ComponentType<GameSymbolRenderPropsV1>;
    }
  | { readonly kind: "not_found"; readonly code: "ui.game_symbol_not_found" };

export interface GameSymbolRegistryV1 {
  resolve(symbolId: GameSymbolIdV1): GameSymbolResolutionV1;
}

const notFoundV1 = Object.freeze({
  kind: "not_found" as const,
  code: "ui.game_symbol_not_found" as const,
});

function invalidSymbolIdV1(): TypeError {
  return new TypeError("ui.invalid_game_symbol_id");
}

export function parseGameSymbolIdV1(value: string): GameSymbolIdV1 {
  try {
    return parseModuleId(value) as unknown as GameSymbolIdV1;
  } catch {
    throw invalidSymbolIdV1();
  }
}

function parseProviderV1(
  provider: DeepReadonly<GameSymbolProviderV1>,
  index: number,
): readonly [GameSymbolIdV1, ComponentType<GameSymbolRenderPropsV1>] {
  if (typeof provider !== "object" || provider === null) {
    throw new TypeError(`ui.invalid_game_symbol_provider:${index}`);
  }

  const candidate = provider as {
    readonly symbolId?: unknown;
    readonly component?: unknown;
  };
  if (typeof candidate.symbolId !== "string" || typeof candidate.component !== "function") {
    throw new TypeError(`ui.invalid_game_symbol_provider:${index}`);
  }

  return Object.freeze([
    parseGameSymbolIdV1(candidate.symbolId),
    candidate.component as ComponentType<GameSymbolRenderPropsV1>,
  ]);
}

export function createGameSymbolRegistryV1(
  providers: readonly DeepReadonly<GameSymbolProviderV1>[],
): GameSymbolRegistryV1 {
  if (!Array.isArray(providers)) {
    throw new TypeError("ui.invalid_game_symbol_providers");
  }

  const records = new Map<GameSymbolIdV1, GameSymbolResolutionV1>();
  for (const [index, provider] of providers.entries()) {
    const [symbolId, component] = parseProviderV1(provider, index);
    if (records.has(symbolId)) {
      throw new TypeError(`ui.duplicate_game_symbol_id:${symbolId}`);
    }
    records.set(symbolId, Object.freeze({ kind: "found" as const, component }));
  }

  return Object.freeze({
    resolve(symbolId: GameSymbolIdV1): GameSymbolResolutionV1 {
      const parsed = parseGameSymbolIdV1(symbolId);
      return records.get(parsed) ?? notFoundV1;
    },
  });
}
