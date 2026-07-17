// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { CodeFallbackStageSceneV1, usePresentationAssetV1 } from "@sillymaker/ui";
import type { ReactElement } from "react";

import styles from "./PocScenes.module.css";
import type { PocStageSceneRendererPropsV1 } from "./PocMainMenuScene.js";

export function PocMarketSceneV1(props: PocStageSceneRendererPropsV1): ReactElement {
  const asset = usePresentationAssetV1(
    props.presentation,
    props.viewSlice.background.assetId,
    "scene_background",
  );
  const accessibleName = props.presentation.text(
    props.viewSlice.background.accessibleNameTextId,
  ).text;

  return (
    <div className={styles["poc-scene"]} data-poc-stage-renderer-id={props.viewSlice.rendererId}>
      {asset.delivery === "runtime_image" ? (
        <img
          className={styles["poc-scene__image"]}
          src={asset.url}
          width={asset.width}
          height={asset.height}
          alt={accessibleName}
          draggable={false}
        />
      ) : (
        <CodeFallbackStageSceneV1
          accessibleName={accessibleName}
          fallbackToken={asset.fallbackToken}
        />
      )}
    </div>
  );
}
