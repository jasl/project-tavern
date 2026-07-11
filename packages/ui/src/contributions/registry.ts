// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import type { DeepReadonly } from "@project-tavern/base";

export interface UiContributionRenderContextV1<TView, TPlayerPort, TPresentation> {
  readonly view: DeepReadonly<TView>;
  readonly playerPort: TPlayerPort;
  readonly presentation: TPresentation;
}

export interface UiContributionV1<TView, TPlayerPort, TPresentation> {
  readonly id: string;
  render(context: UiContributionRenderContextV1<TView, TPlayerPort, TPresentation>): ReactNode;
}

export interface UiContributionRegistryV1<TView, TPlayerPort, TPresentation> {
  readonly scenes: ReadonlyMap<string, UiContributionV1<TView, TPlayerPort, TPresentation>>;
  readonly overlays: ReadonlyMap<string, UiContributionV1<TView, TPlayerPort, TPresentation>>;
  readonly hud: ReadonlyMap<string, UiContributionV1<TView, TPlayerPort, TPresentation>>;
  readonly gameSymbols: ReadonlyMap<string, UiContributionV1<TView, TPlayerPort, TPresentation>>;
}

export function createUiContributionRegistryV1<TView, TPlayerPort, TPresentation>(input: {
  readonly scenes: readonly UiContributionV1<TView, TPlayerPort, TPresentation>[];
  readonly overlays: readonly UiContributionV1<TView, TPlayerPort, TPresentation>[];
  readonly hud: readonly UiContributionV1<TView, TPlayerPort, TPresentation>[];
  readonly gameSymbols: readonly UiContributionV1<TView, TPlayerPort, TPresentation>[];
}): UiContributionRegistryV1<TView, TPlayerPort, TPresentation> {
  const all = [...input.scenes, ...input.overlays, ...input.hud, ...input.gameSymbols];
  if (new Set(all.map(({ id }) => id)).size !== all.length) {
    throw new TypeError("duplicate UI contribution ID");
  }
  const map = (values: readonly UiContributionV1<TView, TPlayerPort, TPresentation>[]) =>
    new Map(values.map((value) => [value.id, Object.freeze(value)]));
  return Object.freeze({
    scenes: map(input.scenes),
    overlays: map(input.overlays),
    hud: map(input.hud),
    gameSymbols: map(input.gameSymbols),
  });
}
