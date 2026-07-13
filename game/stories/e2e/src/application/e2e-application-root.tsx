// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo } from "react";

import type { GameHostV1, ReadonlyViewSourceV1 } from "@sillymaker/base";
import { GameShell } from "@sillymaker/ui";

import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import {
  createE2eRendererRegistryV1,
  readE2ePresentationTextV1,
  selectE2eStageVariantV1,
} from "../presentation/e2e-renderers.js";
import type { E2eSemanticPublicationV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationRootPropsV1 {
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly host: GameHostV1;
}

export function E2eApplicationRootV1(props: E2eApplicationRootPropsV1) {
  const semanticView = useMemo<ReadonlyViewSourceV1<E2eSemanticPublicationV1>>(
    () =>
      Object.freeze({
        getCurrent: props.application.semantic.observe,
        subscribe: props.application.semantic.subscribe,
      }),
    [props.application.semantic],
  );
  const rendererRegistry = useMemo(
    () => createE2eRendererRegistryV1(props.resolvedGame.sceneGraph),
    [props.resolvedGame.sceneGraph],
  );

  return (
    <GameShell
      view={semanticView}
      semantic={props.application.semantic}
      presentation={props.resolvedGame.presentation}
      contributions={rendererRegistry}
      sceneId={(publication) =>
        selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication).rendererId
      }
      hudId={null}
      accessibleName={(publication) => {
        const variant = selectE2eStageVariantV1(props.resolvedGame.sceneGraph, publication);
        return readE2ePresentationTextV1(
          props.resolvedGame.presentation,
          variant.accessibleNameTextId,
        );
      }}
    />
  );
}
