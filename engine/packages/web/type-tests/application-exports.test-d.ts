// SPDX-License-Identifier: MIT
import type {
  ContentPreferencePortV1,
  HostAtomicRecordStoreV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
  StoryId,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createRuntimeCapabilitySessionOverlayV1,
  createWebContentPreferencePortV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
  parseCapabilityRequestV1,
} from "@sillymaker/web";
import type {
  CapabilityRequestParseResultV1,
  RuntimeCapabilitySessionOverlayV1,
} from "@sillymaker/web";

const injectedRecordsV1 = createMemoryHostRecordStoreV1();
createWebHostV1({ databaseName: "sillymaker.type-test.runtime" });
createWebHostV1({ records: injectedRecordsV1 });

// @ts-expect-error persistence composition requires databaseName or records
createWebHostV1({});
// @ts-expect-error persistence composition forbids databaseName and records together
createWebHostV1({ databaseName: "sillymaker.type-test.runtime", records: injectedRecordsV1 });

declare const preferenceInputV1: Parameters<typeof createWebContentPreferencePortV1>[0];
const preferenceRecordsV1: HostAtomicRecordStoreV1 = preferenceInputV1.records;
const preferenceStoryIdV1: StoryId = preferenceInputV1.storyId;
void preferenceRecordsV1;
void preferenceStoryIdV1;

// @ts-expect-error Content preference storage is not a runtime capability port.
const preferenceCapabilityV1: RuntimeCapabilityPortV1 = preferenceInputV1.records;
void preferenceCapabilityV1;

declare const contentPreferencePortV1: Awaited<ReturnType<typeof createWebContentPreferencePortV1>>;
const contentPreferenceContractV1: ContentPreferencePortV1 = contentPreferencePortV1;
void contentPreferenceContractV1;
contentPreferencePortV1.observe();
contentPreferencePortV1.subscribe(() => undefined);
void contentPreferencePortV1.set({
  allowedFlags: preferenceInputV1.policy.defaultAllowedFlags,
});

// @ts-expect-error Content preference has no capability mutation surface.
contentPreferencePortV1.setEnabled("debug_tools", true);
// @ts-expect-error Content preference exposes no Snapshot.
contentPreferencePortV1.snapshot;

declare const persistedCapabilityPortV1: RuntimeCapabilityPortV1;
const capabilitySessionV1: RuntimeCapabilitySessionOverlayV1 =
  createRuntimeCapabilitySessionOverlayV1(persistedCapabilityPortV1, ["debug_tools"]);
const effectiveCapabilityPortV1: RuntimeCapabilityPortV1 = capabilitySessionV1;
const sessionRequestedCapabilityV1: RuntimeCapabilityIdV1 | undefined =
  capabilitySessionV1.sessionRequested[0];
const capabilityRequestV1: CapabilityRequestParseResultV1 =
  parseCapabilityRequestV1("?capability=debug_tools");
void effectiveCapabilityPortV1;
void sessionRequestedCapabilityV1;
void capabilityRequestV1;
capabilitySessionV1.persisted.state.getCurrent();
capabilitySessionV1.dispose();

// @ts-expect-error session overlays accept only the closed capability ID set.
createRuntimeCapabilitySessionOverlayV1(persistedCapabilityPortV1, ["unknown"]);

export {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createRuntimeCapabilitySessionOverlayV1,
  createWebContentPreferencePortV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
  parseCapabilityRequestV1,
};
// @ts-expect-error the application root does not export removed Developer UI
export { DevelopmentPanel as ForbiddenDevelopmentPanel } from "@sillymaker/web";
// @ts-expect-error the single Artifact surface has no Developer subpath
export { DevelopmentPanel as ForbiddenDeveloperSubpath } from "@sillymaker/web/developer";
