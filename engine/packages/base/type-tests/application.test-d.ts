// SPDX-License-Identifier: MIT
import type {
  DebugFixtureListResultV1,
  DebugToolsOperationResultV1,
  DebugToolsPortV1,
  GameApplicationPortV1,
  PlayerPersistencePortV1,
  PresentationReadPortV1,
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import {
  createCapabilityDisabledDebugToolsPortV1,
  createGameApplicationV1,
  createRuntimeCapabilityPortV1,
} from "@sillymaker/base/runtime";

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
  { readonly kind: "unavailable"; readonly code: "debug_tools_not_installed" }
>;
declare const application: Application;
declare const presentation: PresentationReadPortV1<string, string, string, string, string>;

application.semantic;
application.lifecycle;
application.persistence;
application.diagnostics;
application.capabilities;
application.debugTools;

declare const capabilityPort: RuntimeCapabilityPortV1;
export const capabilityState: ReadonlyViewSourceV1<RuntimeCapabilitiesV1> = capabilityPort.state;
// @ts-expect-error capability state is read-only
capabilityPort.state.publish;

export type DisabledDebugOperation = DebugToolsOperationResultV1<{
  readonly kind: "allowed";
}>;
export type FixtureList = DebugFixtureListResultV1<"fixture.one">;
declare const fixtureList: FixtureList;
if (fixtureList.kind === "listed") fixtureList.fixtureIds;

export const typedDebugTools: DebugToolsPortV1<
  string,
  never,
  string,
  never,
  never,
  never,
  never,
  never,
  never
> = createCapabilityDisabledDebugToolsPortV1<
  string,
  never,
  string,
  never,
  never,
  never,
  never,
  never,
  never
>();

const syntheticCapabilityPort = createRuntimeCapabilityPortV1({
  initialState: { debugTools: false, cheats: false, automationBridge: false },
  persist: async () => ({ kind: "committed" as const }),
});
export const composedApplication = createGameApplicationV1({
  semantic: application.semantic,
  lifecycle: application.lifecycle,
  persistence: application.persistence,
  diagnostics: application.diagnostics,
  capabilities: syntheticCapabilityPort,
  debugTools: typedDebugTools,
});

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
// @ts-expect-error renderer contribution contracts belong to @sillymaker/ui
export type OldUiRendererBinding = import("@sillymaker/base").UiRendererBindingV1<
  string,
  unknown,
  unknown,
  unknown
>;
// @ts-expect-error renderer contribution contracts belong to @sillymaker/ui
export type OldUiContributionSet = import("@sillymaker/base").UiContributionSetV1<
  unknown,
  unknown,
  unknown,
  unknown
>;
