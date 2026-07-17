// SPDX-License-Identifier: MIT
import type {
  ContentMaturityFlagsV1,
  DeepReadonly,
  HitMapId,
  InteractionBehaviorId,
  InteractionEntryModeV1,
  InteractionResolutionModeV1,
  InteractionSurfaceId,
  InteractionTargetId,
  NonNegativeSafeInteger,
  TextId,
} from "@sillymaker/base";

export type PresentationIntentV1 =
  | { readonly kind: "overlay.open"; readonly overlayId: string }
  | { readonly kind: "presentation.play_cue"; readonly cueId: string }
  | { readonly kind: "interaction.enter_surface"; readonly surfaceId: InteractionSurfaceId }
  | { readonly kind: "interaction.leave_surface" };

export type RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation> =
  | {
      readonly kind: "semantic_invocation";
      readonly descriptor: DeepReadonly<TDescriptor>;
      readonly invocation: DeepReadonly<TInvocation>;
    }
  | {
      readonly kind: "semantic_control";
      readonly descriptor: DeepReadonly<TDescriptor>;
      readonly intent: Extract<PresentationIntentV1, { readonly kind: "overlay.open" }>;
    }
  | {
      readonly kind: "presentation_intent";
      readonly intent: PresentationIntentV1;
    };

export interface RuntimeInteractionBehaviorV1<TDescriptor, TInvocation> {
  readonly behaviorId: InteractionBehaviorId;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId | null;
  readonly requiredFlags: ContentMaturityFlagsV1;
  readonly isDefault: boolean;
  readonly route: RuntimeInteractionBehaviorRouteV1<TDescriptor, TInvocation>;
}

export interface RuntimeInteractionTargetV1<TDescriptor, TInvocation> {
  readonly targetId: InteractionTargetId;
  readonly accessibleNameTextId: TextId;
  readonly resolutionMode: InteractionResolutionModeV1;
  readonly openSurfaceId: InteractionSurfaceId | null;
  readonly behaviors: readonly RuntimeInteractionBehaviorV1<TDescriptor, TInvocation>[];
}

export interface RuntimeInteractionSurfaceV1<TDescriptor, TInvocation> {
  readonly surfaceId: InteractionSurfaceId;
  readonly accessibleNameTextId: TextId;
  readonly entryMode: InteractionEntryModeV1;
  readonly hitMapId: HitMapId | null;
  readonly targets: readonly RuntimeInteractionTargetV1<TDescriptor, TInvocation>[];
}

export interface PresentationFaultV1 {
  readonly code:
    | "presentation.interaction.catalog_join"
    | "presentation.interaction.direct_default_count"
    | "presentation.interaction.choose_behavior_count"
    | "presentation.interaction.open_surface_missing"
    | "presentation.interaction.open_surface_behavior_count";
  readonly surfaceId: InteractionSurfaceId;
  readonly revision: NonNegativeSafeInteger;
}
