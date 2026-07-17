// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import {
  CapabilityPanelV1,
  DebugCommandPanelV1,
  DebugLaunchersV1,
  DevDockPortalCoordinatorV1,
  DevDockV1,
  DiagnosticInspectorV1,
  FixtureBrowserV1,
  createDevDockContributionSetV1,
  type DevDockContributionSetV1,
  type DevDockPanelV1,
} from "@sillymaker/ui/debug";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type DebugRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/debug"),
    | "CapabilityPanelV1"
    | "DebugCommandPanelV1"
    | "DebugLaunchersV1"
    | "DevDockPortalCoordinatorV1"
    | "DevDockV1"
    | "DiagnosticInspectorV1"
    | "FixtureBrowserV1"
    | "createDevDockContributionSetV1"
  >
>;
type PanelKeysV1 = ExpectV1<
  EqualV1<keyof DevDockPanelV1, "authority" | "id" | "render" | "side" | "title">
>;
type ContributionKeysV1 = ExpectV1<EqualV1<keyof DevDockContributionSetV1, "panels">>;

interface StoryLocalCommandV1 {
  readonly kind: "story.synthetic";
  readonly amount: number;
}

const storyPanelV1: DevDockPanelV1 = {
  id: "story.synthetic",
  side: "left",
  title: "Story 工具",
  authority: "cheat",
  render: (): ReactNode => null,
};
const contributionsV1: DevDockContributionSetV1 = createDevDockContributionSetV1({
  panels: [storyPanelV1],
});
const commandV1: StoryLocalCommandV1 = { kind: "story.synthetic", amount: 1 };

CapabilityPanelV1;
DebugCommandPanelV1<StoryLocalCommandV1>;
DebugLaunchersV1;
DevDockPortalCoordinatorV1;
DevDockV1;
DiagnosticInspectorV1;
FixtureBrowserV1<string>;
contributionsV1;
commandV1;

// @ts-expect-error DevDock is available only from the dedicated debug subpath
export { DevDockV1 as ForbiddenRootDevDockV1 } from "@sillymaker/ui";
// @ts-expect-error Snapshot authority is not part of the neutral debug UI subpath
export type { GameSnapshotEnvelopeV1 as ForbiddenSnapshotV1 } from "@sillymaker/ui/debug";
// @ts-expect-error GameSession authority is not part of the neutral debug UI subpath
export type { GameSessionV1 as ForbiddenGameSessionV1 } from "@sillymaker/ui/debug";
// @ts-expect-error owner capabilities are not part of the neutral debug UI subpath
export type { ModuleOwnerCapabilityV1 as ForbiddenOwnerV1 } from "@sillymaker/ui/debug";
// @ts-expect-error concrete PoC commands never enter the neutral debug UI subpath
export type { PocDebugCommandV1 as ForbiddenPocCommandV1 } from "@sillymaker/ui/debug";
// @ts-expect-error concrete E2E state never enters the neutral debug UI subpath
export type { E2eGameStateV1 as ForbiddenE2eStateV1 } from "@sillymaker/ui/debug";

export type { ContributionKeysV1, DebugRuntimeKeysV1, PanelKeysV1 };
