// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  AssetId,
  DeepReadonly,
  RuntimeSessionStatusV1,
  SemanticPublicationV1,
} from "@sillymaker/base";
import type {
  InteractionSessionStateV1,
  RuntimeCharacterPresentationV1,
  RuntimeInteractionSurfaceV1,
  RuntimePresentationProjectionInputV1,
  RuntimePresentationProjectionV1,
  RuntimePresentationPublicationV1,
  RuntimeStageSceneV1,
} from "@sillymaker/ui";

import type { NarrativeProjectionV1, PocGameViewV1 } from "../../gameplay/contracts/types.js";
import type { pocResolvedPresentationCatalogV1 } from "../assets.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";

export type PocPresentationRouteV1 = "main_menu" | "play";

export type PocOverlayIdV1 =
  | "overlay.poc.policy"
  | "overlay.poc.inventory"
  | "overlay.poc.purchase"
  | "overlay.poc.tavern_plan"
  | "overlay.poc.facility"
  | "overlay.poc.world_action"
  | "overlay.poc.ledger"
  | "overlay.poc.relationship"
  | "overlay.poc.run_summary"
  | "overlay.poc.save";

export interface PocPresentationUiStateV1 {
  readonly route: PocPresentationRouteV1;
  readonly primaryOverlayId: PocOverlayIdV1 | null;
  readonly interaction: InteractionSessionStateV1;
  readonly activeCueId: string | null;
}

export type PocSemanticPublicationV1 = SemanticPublicationV1<
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  RuntimeSessionStatusV1
>;

export type PocResolvedPresentationCatalogV1 = DeepReadonly<
  typeof pocResolvedPresentationCatalogV1
>;

export interface PocRuntimePresentationViewV1 {
  readonly game: DeepReadonly<PocGameViewV1>;
  readonly narrative: DeepReadonly<NarrativeProjectionV1 | null>;
  readonly stage: RuntimeStageSceneV1;
  readonly characters: readonly RuntimeCharacterPresentationV1[];
  readonly interactionSurfaces: readonly RuntimeInteractionSurfaceV1<
    PocSemanticActionDescriptorV1,
    PocSemanticInvocationV1
  >[];
  readonly activeOverlayId: PocOverlayIdV1 | null;
  readonly activeCueId: string | null;
}

export type PocRuntimePresentationProjectionInputV1 = RuntimePresentationProjectionInputV1<
  PocSemanticPublicationV1,
  PocResolvedPresentationCatalogV1,
  PocPresentationUiStateV1
>;

export interface PocRuntimePresentationProjectorV1 {
  project(
    input: PocRuntimePresentationProjectionInputV1,
  ): RuntimePresentationProjectionV1<PocRuntimePresentationViewV1, AssetId>;
}

export type PocRuntimePresentationPublicationV1 = RuntimePresentationPublicationV1<
  PocSemanticPublicationV1,
  PocRuntimePresentationViewV1,
  AssetId
>;
