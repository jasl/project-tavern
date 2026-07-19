// SPDX-License-Identifier: MIT
import type {
  AssetId,
  ContentMaturityPolicyV1,
  ContentPreferenceV1,
  DebugPresentationRendererSummaryV1,
  DebugPresentationSummaryV1,
  DebugUiContextV1,
  DebugUiSessionSummaryV1,
  InteractionSurfaceId,
} from "@sillymaker/base";
import {
  classifyDebugUiContextUseV1 as classifyRootDebugUiContextUseV1,
  createDebugUiContextV1 as createRootDebugUiContextV1,
  diagnosticExportContentCategoryIdsV1 as rootDiagnosticExportContentCategoryIdsV1,
  type RuntimeCharacterPresentationV1,
  type RuntimeInteractionSurfaceV1,
  type RuntimePresentationPublicationV1,
  type RuntimeStageSceneV1,
} from "@sillymaker/ui";
import {
  classifyDebugUiContextUseV1,
  createDebugUiContextV1,
  diagnosticExportContentCategoryIdsV1,
  type DebugUiSessionProjectionInputV1,
  type DiagnosticExportContentCategoryIdV1,
  type DiagnosticExportPortV1,
  type DiagnosticExportPreviewV1,
} from "@sillymaker/ui/diagnostics";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface SemanticV1 {
  readonly revision: number;
  readonly game: { readonly privateCount: number };
}

interface PresentationViewV1 {
  readonly stage: RuntimeStageSceneV1;
  readonly characters: readonly RuntimeCharacterPresentationV1[];
  readonly interactionSurfaces: readonly RuntimeInteractionSurfaceV1<never, never>[];
}

type PublicationV1 = RuntimePresentationPublicationV1<SemanticV1, PresentationViewV1, AssetId>;
type DiagnosticsRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/diagnostics"),
    | "DiagnosticExportButtonV1"
    | "classifyDebugUiContextUseV1"
    | "createDebugUiContextV1"
    | "diagnosticExportContentCategoryIdsV1"
  >
>;
type DiagnosticCategoryIdsV1 = ExpectV1<
  EqualV1<
    typeof diagnosticExportContentCategoryIdsV1,
    readonly [
      "provenance",
      "capabilities_and_integrity",
      "replay_evidence",
      "diagnostics_and_runtime_failures",
      "failure_context",
      "ui_context",
    ]
  >
>;
type DiagnosticPreviewKeysV1 = ExpectV1<
  EqualV1<
    keyof DiagnosticExportPreviewV1,
    "filename" | "mediaType" | "digest" | "encodedByteLength" | "categories"
  >
>;
type DiagnosticPreviewForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<
      keyof DiagnosticExportPreviewV1,
      "bytes" | "snapshot" | "commandLog" | "session" | "debugTools"
    >,
    never
  >
>;
type DiagnosticPortKeysV1 = ExpectV1<
  EqualV1<
    keyof DiagnosticExportPortV1,
    "prepareDebugBundle" | "savePreparedDebugBundle" | "discardPreparedDebugBundle"
  >
>;
type SessionProjectionInputKeysV1 = ExpectV1<
  EqualV1<
    keyof DebugUiSessionProjectionInputV1,
    | "activeInteractionSurfaceId"
    | "detailOverlayIds"
    | "devDock"
    | "narrativeOpen"
    | "primaryOverlayId"
    | "routeId"
    | "systemDialogOpen"
  >
>;
type ContextKeysV1 = ExpectV1<
  EqualV1<keyof DebugUiContextV1, "presentation" | "revision" | "session">
>;
type PresentationKeysV1 = ExpectV1<
  EqualV1<
    keyof DebugPresentationSummaryV1,
    | "activeInteractionSurfaceId"
    | "allowedContentFlags"
    | "contentPolicyRevision"
    | "presentationRevision"
    | "renderers"
    | "stageRendererId"
    | "stageSceneId"
    | "variantId"
    | "visibleInteractionSurfaceIds"
  >
>;
type RendererKeysV1 = ExpectV1<
  EqualV1<
    keyof DebugPresentationRendererSummaryV1,
    "appearanceLayerIds" | "characterId" | "expressionId" | "poseId" | "rendererId" | "rigId"
  >
>;
type SessionKeysV1 = ExpectV1<
  EqualV1<
    keyof DebugUiSessionSummaryV1,
    | "detailOverlayIds"
    | "devDock"
    | "narrativeOpen"
    | "primaryOverlayId"
    | "routeId"
    | "systemDialogOpen"
  >
>;
type PresentationForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<
      keyof DebugPresentationSummaryV1,
      | "actions"
      | "assetIds"
      | "coordinates"
      | "domNode"
      | "hitMap"
      | "layout"
      | "rendererInstance"
      | "requiredAssetIds"
      | "runtimePath"
      | "semantic"
      | "snapshot"
    >,
    never
  >
>;
type RendererForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<
      keyof DebugPresentationRendererSummaryV1,
      "anchor" | "appearance" | "assetId" | "hitMapId" | "rendererInstance" | "scale"
    >,
    never
  >
>;

declare const presentationV1: PublicationV1;
declare const contentPolicyV1: ContentMaturityPolicyV1;
declare const contentPreferenceV1: ContentPreferenceV1;
declare const activeSurfaceIdV1: InteractionSurfaceId;

const uiSessionV1: DebugUiSessionProjectionInputV1 = {
  routeId: "route.synthetic",
  primaryOverlayId: "overlay.synthetic",
  detailOverlayIds: ["overlay.synthetic.detail"],
  narrativeOpen: true,
  systemDialogOpen: false,
  devDock: { leftOpen: false, rightOpen: false },
  activeInteractionSurfaceId: activeSurfaceIdV1,
};
const contextV1 = createDebugUiContextV1({
  presentation: presentationV1,
  contentPolicy: contentPolicyV1,
  contentPreference: contentPreferenceV1,
  uiSession: uiSessionV1,
});
contextV1 satisfies DebugUiContextV1;

const rootProjectorV1: typeof createDebugUiContextV1 = createRootDebugUiContextV1;
const rootClassifierV1: typeof classifyDebugUiContextUseV1 = classifyRootDebugUiContextUseV1;
const rootDiagnosticCategoryIdsV1: typeof diagnosticExportContentCategoryIdsV1 =
  rootDiagnosticExportContentCategoryIdsV1;

declare const diagnosticCategoryIdV1: DiagnosticExportContentCategoryIdV1;
declare const diagnosticPreviewV1: DiagnosticExportPreviewV1;
diagnosticExportContentCategoryIdsV1.includes(diagnosticCategoryIdV1);
diagnosticPreviewV1.categories.includes(diagnosticCategoryIdV1);

declare const recordedIdentityV1: Parameters<typeof classifyDebugUiContextUseV1>[0];
declare const currentIdentityV1: Parameters<typeof classifyDebugUiContextUseV1>[1];
classifyDebugUiContextUseV1(recordedIdentityV1, currentIdentityV1);

rootProjectorV1;
rootClassifierV1;
rootDiagnosticCategoryIdsV1;

// @ts-expect-error Story identity is not part of the player-safe diagnostics subpath
export type { StoryId as ForbiddenStoryIdV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error Story definitions are not part of the player-safe diagnostics subpath
export type { StoryEntryV1 as ForbiddenStoryEntryV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error Snapshot authority is not part of the player-safe diagnostics subpath
export type { GameSnapshotEnvelopeV1 as ForbiddenSnapshotV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error GameSession authority is not part of the player-safe diagnostics subpath
export type { GameSessionV1 as ForbiddenGameSessionV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error DebugTools authority is not part of the player-safe diagnostics subpath
export type { DebugToolsPortV1 as ForbiddenDebugToolsV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error owner capabilities are not part of the player-safe diagnostics subpath
export type { ModuleOwnerCapabilityV1 as ForbiddenOwnerV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error DOM nodes are not part of the player-safe diagnostics subpath
export type { HTMLElement as ForbiddenDomNodeV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error renderer instances are not part of the player-safe diagnostics subpath
export type { CharacterRendererContributionV1 as ForbiddenRendererV1 } from "@sillymaker/ui/diagnostics";

export type {
  ContextKeysV1,
  DiagnosticCategoryIdsV1,
  DiagnosticPortKeysV1,
  DiagnosticPreviewForbiddenKeysV1,
  DiagnosticPreviewKeysV1,
  DiagnosticsRuntimeKeysV1,
  PresentationForbiddenKeysV1,
  PresentationKeysV1,
  RendererForbiddenKeysV1,
  RendererKeysV1,
  SessionKeysV1,
  SessionProjectionInputKeysV1,
};
