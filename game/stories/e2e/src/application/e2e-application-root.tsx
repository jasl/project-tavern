// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useMemo } from "react";

import type { GameHostV1 } from "@sillymaker/base";
import {
  GameShell,
  createAssetRegistryV1,
  createPresentationReadPortV1,
  createSemanticPublicationBridgeV1,
} from "@sillymaker/ui";
import type { GameShellRendererIdsV1 } from "@sillymaker/ui";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";

import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import {
  createE2eRendererRegistryV1,
  readE2ePresentationTextV1,
  selectE2eStageVariantV1,
} from "../presentation/e2e-renderers.js";
import { e2eCharacterRendererIdV1 } from "../presentation/scene-graph.js";
import type { E2eSemanticPublicationV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationRootPropsV1 {
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly host: GameHostV1;
}

export function E2eApplicationRootV1(props: E2eApplicationRootPropsV1) {
  const semanticPublication = useMemo(
    () => createSemanticPublicationBridgeV1(props.application.semantic),
    [props.application.semantic],
  );
  useEffect(() => () => semanticPublication.dispose(), [semanticPublication]);

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
  const rendererIds = Object.freeze({
    background: (publication) =>
      selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication).rendererId,
    character: e2eCharacterRendererIdV1,
    scene_interaction: null,
    hud: (publication) =>
      selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication).rendererId,
    workspace_overlay: null,
    narrative: (publication) =>
      selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication).rendererId,
    system: null,
  }) satisfies GameShellRendererIdsV1<E2eSemanticPublicationV1>;

  return (
    <GameShell
      publication={semanticPublication}
      semantic={props.application.semantic}
      presentation={presentationResources.presentation}
      contributions={rendererRegistry}
      rendererIds={rendererIds}
      accessibleName={(publication) => {
        const variant = selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication);
        return readE2ePresentationTextV1(
          presentationResources.presentation,
          variant.accessibleNameTextId,
        );
      }}
    />
  );
}
