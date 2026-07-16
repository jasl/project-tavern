// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";
import type { DeepReadonly } from "@sillymaker/base";

export type UiRendererNamespaceV1 =
  | "background"
  | "character"
  | "scene_interaction"
  | "hud"
  | "workspace_overlay"
  | "narrative"
  | "system";

export interface GameRendererContextV1<TViewSlice, TSemanticPort, TPresentation> {
  readonly viewSlice: DeepReadonly<TViewSlice>;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}

export interface UiRendererContributionV1<TContext> {
  readonly rendererId: string;
  readonly component: ComponentType<TContext>;
}

export interface UiContributionSetV1<
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>>,
> {
  readonly contributionId: string;
  readonly renderers: {
    readonly [TNamespace in UiRendererNamespaceV1]?: readonly UiRendererContributionV1<
      TContexts[TNamespace]
    >[];
  };
}

export interface UiContributionRegistryV1<
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> = Readonly<
    Record<UiRendererNamespaceV1, unknown>
  >,
> {
  resolve<TNamespace extends UiRendererNamespaceV1>(
    namespace: TNamespace,
    rendererId: string,
  ):
    | {
        readonly kind: "found";
        readonly component: ComponentType<TContexts[TNamespace]>;
      }
    | { readonly kind: "not_found"; readonly code: "ui.renderer_not_found" };
}
