// SPDX-License-Identifier: MIT
import type { CSSProperties, ReactElement } from "react";

import type { GameRendererContextV1 } from "../contributions/types.js";
import type {
  CharacterPresentationReadPortV1,
  RuntimeCharacterPresentationV1,
} from "./contracts.js";
import styles from "./character-renderers.module.css";
import { StaticCharacterRendererV1 } from "./static-character-renderer.js";
import { useCharacterAssetsV1 } from "./use-character-assets.js";

function rootStyleV1(character: Readonly<RuntimeCharacterPresentationV1>): CSSProperties {
  return {
    left: `${Number(character.anchor.x) * 100}%`,
    top: `${Number(character.anchor.y) * 100}%`,
    transform: `translate(-50%, -100%) scale(${Number(character.scale)})`,
  };
}

export function PaperDollCharacterRendererV1<
  TSemanticPort,
  TPresentation extends CharacterPresentationReadPortV1,
>(
  props: GameRendererContextV1<RuntimeCharacterPresentationV1, TSemanticPort, TPresentation>,
): ReactElement {
  const character = props.viewSlice;
  const layers = useCharacterAssetsV1(props.presentation, character.appearance);
  const requiresCharacterFallback = layers.some(
    ({ layer, asset }) =>
      layer.fallbackPolicy === "character_fallback" && asset.delivery === "code_fallback",
  );

  if (requiresCharacterFallback) return <StaticCharacterRendererV1 {...props} />;

  const accessibleName = props.presentation.text(character.accessibleNameTextId).text;

  return (
    <div
      className={styles["character-root"]}
      style={rootStyleV1(character)}
      role="img"
      aria-label={accessibleName}
      data-testid="character-root"
      data-character-id={character.characterId}
      data-renderer-id={character.rendererId}
      data-rig-id={character.rigId}
      data-pose-id={character.poseId}
      data-expression-id={character.expressionId}
      data-activity-id={character.activityId ?? undefined}
      data-hit-map-id={character.hitMapId ?? undefined}
      data-spatial-hit-test={character.hitMapId === null ? "disabled" : "enabled"}
    >
      <span className={styles["character-canvas"]} aria-hidden="true">
        {layers.map(({ layer, asset }) =>
          asset.delivery === "runtime_image" ? (
            <span
              key={layer.layerId}
              className={styles["appearance-layer"]}
              data-testid="appearance-layer"
              data-layer-id={layer.layerId}
              aria-hidden="true"
            >
              <img
                className={styles["character-image"]}
                data-testid="appearance-layer-runtime-image"
                src={asset.url}
                width={asset.width}
                height={asset.height}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </span>
          ) : null,
        )}
      </span>
    </div>
  );
}
