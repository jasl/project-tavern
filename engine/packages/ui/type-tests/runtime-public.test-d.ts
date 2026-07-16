// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";

import {
  createGameSymbolRegistryV1,
  createSemanticPublicationBridgeV1,
  createUiContributionRegistryV1,
  parseGameSymbolIdV1,
  type GameRendererContextV1,
  type GameSymbolProviderV1,
  type SemanticActionControlPropsV1,
  type SemanticPublicationBridgeV1,
  type UiContributionRegistryV1,
  type UiContributionSetV1,
  type UiRendererNamespaceV1,
} from "@sillymaker/ui";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface PublicationV1 {
  readonly revision: number;
  readonly game: { readonly count: number };
  readonly narrative: null;
  readonly actions: readonly [];
}

interface SemanticPortV1 {
  dispatch(invocation: { readonly actionId: "action.test" }): Promise<void>;
}

interface PresentationPortV1 {
  text(textId: "text.test"): { readonly text: string };
}

type RendererContextV1 = GameRendererContextV1<PublicationV1, SemanticPortV1, PresentationPortV1>;
type RendererContextsV1 = Readonly<Record<UiRendererNamespaceV1, RendererContextV1>>;

type PublicRendererContextKeysV1 = ExpectV1<
  EqualV1<keyof RendererContextV1, "presentation" | "semantic" | "viewSlice">
>;
type PublicRendererNamespaceV1 = ExpectV1<
  EqualV1<
    UiRendererNamespaceV1,
    | "background"
    | "character"
    | "hud"
    | "narrative"
    | "scene_interaction"
    | "system"
    | "workspace_overlay"
  >
>;
type PublicBridgeKeysV1 = ExpectV1<
  EqualV1<keyof SemanticPublicationBridgeV1<PublicationV1>, "dispose" | "getSnapshot" | "subscribe">
>;
type PublicRegistryKeysV1 = ExpectV1<
  EqualV1<keyof UiContributionRegistryV1<RendererContextsV1>, "resolve">
>;

declare const RendererV1: ComponentType<RendererContextV1>;
declare const semanticV1: SemanticPortV1;
declare const presentationV1: PresentationPortV1;
declare const publicationV1: PublicationV1;

const contributionV1 = Object.freeze({
  contributionId: "contribution.test.runtime-public",
  renderers: Object.freeze({
    hud: Object.freeze([Object.freeze({ rendererId: "renderer.test.hud", component: RendererV1 })]),
  }),
}) satisfies UiContributionSetV1<RendererContextsV1>;
const registryV1 = createUiContributionRegistryV1<RendererContextsV1>([contributionV1]);
registryV1.resolve("hud", "renderer.test.hud");

const bridgeV1 = createSemanticPublicationBridgeV1({
  observe: () => publicationV1,
  subscribe: () => () => undefined,
});
bridgeV1.getSnapshot();

declare const actionPropsV1: SemanticActionControlPropsV1<
  { readonly code: "reason.test" },
  { readonly actionId: "action.test" },
  void
>;
actionPropsV1.semantic satisfies SemanticPortV1;

const symbolIdV1 = parseGameSymbolIdV1("symbol.test.counter");
declare const symbolProviderV1: GameSymbolProviderV1;
createGameSymbolRegistryV1([symbolProviderV1]).resolve(symbolIdV1);

declare const rendererContextV1: RendererContextV1;
rendererContextV1.viewSlice.game.count;
rendererContextV1.semantic satisfies SemanticPortV1;
rendererContextV1.presentation satisfies PresentationPortV1;

// @ts-expect-error Snapshot authority is not renderer context.
rendererContextV1.snapshot;
// @ts-expect-error Session authority is not renderer context.
rendererContextV1.session;
// @ts-expect-error Gameplay Queries are not renderer context.
rendererContextV1.queries;
// @ts-expect-error Runtime capabilities are not renderer context.
rendererContextV1.capabilities;
// @ts-expect-error DebugTools are not renderer context.
rendererContextV1.debugTools;
// @ts-expect-error Story tooling is not renderer context.
rendererContextV1.tooling;

semanticV1;
presentationV1;

export type {
  PublicBridgeKeysV1,
  PublicRegistryKeysV1,
  PublicRendererContextKeysV1,
  PublicRendererNamespaceV1,
};
