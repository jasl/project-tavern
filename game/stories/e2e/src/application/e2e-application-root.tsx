// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useMemo } from "react";
import type { ComponentType } from "react";

import type { GameHostV1 } from "@sillymaker/base";
import {
  GameShell,
  createAssetRegistryV1,
  createInputRouterV1,
  createPresentationReadPortV1,
  createSemanticPublicationBridgeV1,
  useSemanticPublicationV1,
} from "@sillymaker/ui";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";

import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import {
  createE2eRendererRegistryV1,
  readE2ePresentationTextV1,
  selectE2eStageVariantV1,
} from "../presentation/e2e-renderers.js";
import type { E2eRendererContextV1, E2eRendererRegistryV1 } from "../presentation/e2e-renderers.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationRootPropsV1 {
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly host: GameHostV1;
}

function requireE2eRendererV1(
  registry: E2eRendererRegistryV1,
  namespace: "background" | "hud" | "narrative",
  rendererId: string,
): ComponentType<E2eRendererContextV1> {
  const resolved = registry.resolve(namespace, rendererId);
  if (resolved.kind === "not_found") {
    throw new TypeError(`ui.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolved.component;
}

export function E2eApplicationRootV1(props: E2eApplicationRootPropsV1) {
  const semanticPublication = useMemo(
    () => createSemanticPublicationBridgeV1(props.application.semantic),
    [props.application.semantic],
  );
  useEffect(() => () => semanticPublication.dispose(), [semanticPublication]);
  const publication = useSemanticPublicationV1(semanticPublication);
  const inputRouter = useMemo(() => createInputRouterV1(), []);

  const presentationResources = useMemo(() => {
    const loader = createBrowserImageLoaderV1({
      resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
      createImage: () => new Image(),
    });
    const assets = createAssetRegistryV1(props.resolvedGame.assets, loader, () => undefined);
    const presentation = createPresentationReadPortV1({
      catalogs: props.resolvedGame.presentation.textCatalogs,
      locale: props.resolvedGame.presentation.textCatalogs.defaultLocale,
      assets,
    });
    return Object.freeze({ presentation, dispose: () => assets.dispose() });
  }, [props.resolvedGame.assets, props.resolvedGame.presentation.textCatalogs]);
  useEffect(() => () => presentationResources.dispose(), [presentationResources]);

  const rendererRegistry = useMemo(
    () => createE2eRendererRegistryV1(props.resolvedGame.sceneGraph),
    [props.resolvedGame.sceneGraph],
  );
  const variant = selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication);
  const context = Object.freeze({
    viewSlice: publication,
    semantic: props.application.semantic,
    presentation: presentationResources.presentation,
  }) satisfies E2eRendererContextV1;
  const Background = requireE2eRendererV1(rendererRegistry, "background", variant.rendererId);
  const Hud = requireE2eRendererV1(rendererRegistry, "hud", variant.rendererId);
  const Narrative = requireE2eRendererV1(rendererRegistry, "narrative", variant.rendererId);
  const layers = Object.freeze({
    background: <Background {...context} />,
    character: null,
    sceneInteraction: null,
    hud: <Hud {...context} />,
    workspaceOverlay: null,
    narrative: <Narrative {...context} />,
    system: null,
  });

  return (
    <GameShell
      accessibleName={readE2ePresentationTextV1(
        presentationResources.presentation,
        variant.accessibleNameTextId,
      )}
      layers={layers}
      inputRouter={inputRouter}
    />
  );
}
