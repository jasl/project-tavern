// SPDX-License-Identifier: MIT
import type {
  GameApplicationPortV1,
  PlayerPersistencePortV1,
  PresentationReadPortV1,
  ReadonlyViewSourceV1,
  UiRendererBindingV1,
} from "@sillymaker/base";

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

interface SyntheticSemanticPortV1 {
  readonly view: ReadonlyViewSourceV1<{}>;
  dispatch(command: { readonly kind: "synthetic" }): Promise<{ readonly kind: "accepted" }>;
}

type Application = GameApplicationPortV1<
  SyntheticSemanticPortV1,
  { createNewSession(): Promise<unknown>; restartSession(): Promise<unknown> },
  typeof persistence,
  { exportDebugBundle(): Promise<unknown> },
  { readonly kind: "unavailable" },
  { readonly kind: "unavailable"; readonly code: "phase3_not_installed" }
>;
declare const application: Application;
declare const presentation: PresentationReadPortV1<string, string, string, string, string>;

application.semantic;
application.lifecycle;
application.persistence;
application.diagnostics;
application.capabilities;
application.debugTools;

export const renderer: UiRendererBindingV1<
  "hud",
  {},
  {},
  (context: {
    readonly viewSlice: {};
    readonly semantic: SyntheticSemanticPortV1;
    readonly presentation: typeof presentation;
  }) => unknown
> = {
  id: "hud",
  select: () => ({}),
  renderer: () => null,
};

// @ts-expect-error the unified application has no nested Player application
application.player;
// @ts-expect-error the unified application has no nested Developer application
application.developer;
// @ts-expect-error authoritative state is never public
application.snapshot;
// @ts-expect-error Presentation port does not expose raw catalogs
presentation.catalogs;
// @ts-expect-error Presentation results do not expose runtimePath
presentation.asset("a", "u").runtimePath;

// @ts-expect-error removed public ABI
export type OldPlayerPort = import("@sillymaker/base").PlayerApplicationPortV1<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;
// @ts-expect-error removed public ABI
export type OldPlayerCommandPort = import("@sillymaker/base").PlayerCommandPortV1<unknown, unknown>;
// @ts-expect-error removed public ABI
export type OldDeveloperPort = import("@sillymaker/base").DeveloperApplicationPortV1<
  unknown,
  unknown
>;
// @ts-expect-error removed public ABI
export type OldDeveloperControl = import("@sillymaker/base").DeveloperControlPortV1<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;
