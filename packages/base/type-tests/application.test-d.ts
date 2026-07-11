// SPDX-License-Identifier: MIT
import type {
  PlayerApplicationPortV1,
  PlayerPersistencePortV1,
  PresentationReadPortV1,
  UiRendererBindingV1,
} from "@project-tavern/base";

declare const persistence: PlayerPersistencePortV1<
  { id: string },
  { available: boolean },
  { ok: boolean },
  { current: true },
  { stored: true },
  { owned: boolean },
  { updated: boolean }
>;

export const storedExport: Promise<{ stored: true }> = persistence.exportSave("quick");
export const currentExport: Promise<{ current: true }> = persistence.exportCurrentSave();

type Player = PlayerApplicationPortV1<{}, {}, {}, typeof persistence, {}>;
declare const player: Player;
declare const presentation: PresentationReadPortV1<string, string, string, string, string>;

export const renderer: UiRendererBindingV1<
  "hud",
  {},
  {},
  (context: {
    readonly viewSlice: {};
    readonly playerPort: Player;
    readonly presentation: typeof presentation;
  }) => unknown
> = {
  id: "hud",
  select: () => ({}),
  renderer: () => null,
};

// @ts-expect-error Player port does not expose a Snapshot
player.snapshot;
// @ts-expect-error Presentation port does not expose raw catalogs
presentation.catalogs;
// @ts-expect-error Presentation results do not expose runtimePath
presentation.asset("a", "u").runtimePath;
