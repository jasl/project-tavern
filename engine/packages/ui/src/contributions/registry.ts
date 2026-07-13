// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import type { DeepReadonly } from "@sillymaker/base";

export interface UiContributionRenderContextV1<TViewSlice, TSemantic, TPresentation> {
  readonly viewSlice: DeepReadonly<TViewSlice>;
  readonly semantic: TSemantic;
  readonly presentation: TPresentation;
}

export interface UiContributionV1<TViewSlice, TSemantic, TPresentation> {
  readonly id: string;
  render(context: UiContributionRenderContextV1<TViewSlice, TSemantic, TPresentation>): ReactNode;
}

export interface UiContributionRegistryV1<TViewSlice, TSemantic, TPresentation> {
  readonly scenes: ReadonlyMap<string, UiContributionV1<TViewSlice, TSemantic, TPresentation>>;
  readonly overlays: ReadonlyMap<string, UiContributionV1<TViewSlice, TSemantic, TPresentation>>;
  readonly hud: ReadonlyMap<string, UiContributionV1<TViewSlice, TSemantic, TPresentation>>;
  readonly gameSymbols: ReadonlyMap<string, UiContributionV1<TViewSlice, TSemantic, TPresentation>>;
}

export function createUiContributionRegistryV1<TViewSlice, TSemantic, TPresentation>(input: {
  readonly scenes: readonly UiContributionV1<TViewSlice, TSemantic, TPresentation>[];
  readonly overlays: readonly UiContributionV1<TViewSlice, TSemantic, TPresentation>[];
  readonly hud: readonly UiContributionV1<TViewSlice, TSemantic, TPresentation>[];
  readonly gameSymbols: readonly UiContributionV1<TViewSlice, TSemantic, TPresentation>[];
}): UiContributionRegistryV1<TViewSlice, TSemantic, TPresentation> {
  const all = [...input.scenes, ...input.overlays, ...input.hud, ...input.gameSymbols];
  if (new Set(all.map(({ id }) => id)).size !== all.length) {
    throw new TypeError("duplicate UI contribution ID");
  }
  const map = (values: readonly UiContributionV1<TViewSlice, TSemantic, TPresentation>[]) =>
    new Map(values.map((value) => [value.id, Object.freeze(value)]));
  return Object.freeze({
    scenes: map(input.scenes),
    overlays: map(input.overlays),
    hud: map(input.hud),
    gameSymbols: map(input.gameSymbols),
  });
}
