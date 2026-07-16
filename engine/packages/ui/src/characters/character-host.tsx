// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { GameRendererContextV1, UiRendererNamespaceV1 } from "../contributions/types.js";
import type {
  CharacterHostPropsV1,
  CharacterPresentationReadPortV1,
  RuntimeCharacterPresentationV1,
} from "./contracts.js";
import { StaticCharacterRendererV1 } from "./static-character-renderer.js";

export function CharacterHostV1<
  TSemanticPort,
  TPresentation extends CharacterPresentationReadPortV1,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> & {
    readonly character: GameRendererContextV1<
      RuntimeCharacterPresentationV1,
      TSemanticPort,
      TPresentation
    >;
  },
>(props: CharacterHostPropsV1<TSemanticPort, TPresentation, TContexts>): ReactElement {
  const resolved = props.contributions.resolve("character", props.character.rendererId);
  const rendererContext = Object.freeze({
    viewSlice: props.character,
    semantic: props.semantic,
    presentation: props.presentation,
  }) satisfies GameRendererContextV1<RuntimeCharacterPresentationV1, TSemanticPort, TPresentation>;

  return resolved.kind === "found" ? (
    <resolved.component {...rendererContext} />
  ) : (
    <StaticCharacterRendererV1 {...rendererContext} />
  );
}
