// SPDX-License-Identifier: MIT
import {
  createDebugUiContextSchemaV1,
  findUnknownContentMaturityFlagsV1,
  parseContentMaturityFlagsV1,
} from "@sillymaker/base";
import type {
  AppearanceLayerId,
  CharacterExpressionId,
  CharacterId,
  CharacterPoseId,
  CharacterRigId,
  ContentMaturityPolicyV1,
  ContentPreferenceV1,
  DebugUiContextCurrentIdentityV1,
  DebugUiContextRecordedIdentityV1,
  DebugUiContextUseClassificationV1,
  DebugUiContextUseMismatchReasonV1,
  DebugUiContextV1,
  DebugUiSessionProjectionInputV1,
  DeepReadonly,
  InteractionSurfaceId,
  NonNegativeSafeInteger,
  StageSceneId,
  StageSceneVariantId,
} from "@sillymaker/base";

interface DebugStageProjectionInputV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
}

interface DebugAppearanceProjectionInputV1 {
  readonly layerId: AppearanceLayerId;
}

interface DebugCharacterProjectionInputV1 {
  readonly rendererId: string;
  readonly characterId: CharacterId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly appearance: readonly DebugAppearanceProjectionInputV1[];
}

interface DebugInteractionSurfaceProjectionInputV1 {
  readonly surfaceId: InteractionSurfaceId;
}

interface DebugPresentationProjectionInputV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly view: {
    readonly stage: DebugStageProjectionInputV1;
    readonly characters: readonly DebugCharacterProjectionInputV1[];
    readonly interactionSurfaces: readonly DebugInteractionSurfaceProjectionInputV1[];
  };
}

interface CreateDebugUiContextInputV1 {
  readonly presentation: DeepReadonly<DebugPresentationProjectionInputV1>;
  readonly contentPolicy: DeepReadonly<ContentMaturityPolicyV1>;
  readonly contentPreference: DeepReadonly<ContentPreferenceV1>;
  readonly uiSession: DeepReadonly<DebugUiSessionProjectionInputV1>;
}

export function createDebugUiContextV1(
  input: DeepReadonly<CreateDebugUiContextInputV1>,
): DebugUiContextV1 {
  const allowedContentFlags = parseContentMaturityFlagsV1(input.contentPreference.allowedFlags);
  if (findUnknownContentMaturityFlagsV1(input.contentPolicy, allowedContentFlags) !== 0) {
    throw new TypeError("diagnostics.ui_context_content_flags_unknown");
  }

  return createDebugUiContextSchemaV1().parse({
    revision: 1,
    presentation: {
      presentationRevision: input.presentation.revision,
      stageSceneId: input.presentation.view.stage.stageSceneId,
      variantId: input.presentation.view.stage.variantId,
      stageRendererId: input.presentation.view.stage.rendererId,
      renderers: input.presentation.view.characters.map((character) => ({
        rendererId: character.rendererId,
        characterId: character.characterId,
        rigId: character.rigId,
        poseId: character.poseId,
        expressionId: character.expressionId,
        appearanceLayerIds: character.appearance.map((layer) => layer.layerId),
      })),
      visibleInteractionSurfaceIds: input.presentation.view.interactionSurfaces.map(
        (surface) => surface.surfaceId,
      ),
      activeInteractionSurfaceId: input.uiSession.activeInteractionSurfaceId,
      contentPolicyRevision: input.contentPolicy.policyRevision,
      allowedContentFlags,
    },
    session: {
      routeId: input.uiSession.routeId,
      primaryOverlayId: input.uiSession.primaryOverlayId,
      detailOverlayIds: input.uiSession.detailOverlayIds.map((overlayId) => overlayId),
      narrativeOpen: input.uiSession.narrativeOpen,
      systemDialogOpen: input.uiSession.systemDialogOpen,
      devDock: {
        leftOpen: input.uiSession.devDock.leftOpen,
        rightOpen: input.uiSession.devDock.rightOpen,
      },
    },
  });
}

export function classifyDebugUiContextUseV1(
  recorded: DeepReadonly<DebugUiContextRecordedIdentityV1>,
  current: DeepReadonly<DebugUiContextCurrentIdentityV1>,
): DebugUiContextUseClassificationV1 {
  const reasons: DebugUiContextUseMismatchReasonV1[] = [];
  if (
    recorded.provenance.story.id !== current.provenance.story.id ||
    recorded.provenance.story.revision !== current.provenance.story.revision
  ) {
    reasons.push("story_identity_mismatch");
  }
  if (
    recorded.provenance.resolved.presentationDigest !==
    current.provenance.resolved.presentationDigest
  ) {
    reasons.push("presentation_identity_mismatch");
  }
  if (recorded.appBuildId === undefined || recorded.appBuildId !== current.appBuildId) {
    reasons.push("application_identity_mismatch");
  }

  return reasons.length === 0
    ? Object.freeze({ kind: "restorable" as const })
    : Object.freeze({
        kind: "diagnostic_only" as const,
        reasons: Object.freeze(reasons),
      });
}
