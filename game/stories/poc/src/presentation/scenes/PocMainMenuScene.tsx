// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { AssetId, LocaleId, ResolvedAssetManifestV1, TextId } from "@sillymaker/base";
import {
  CodeFallbackStageSceneV1,
  usePresentationAssetV1,
  type GameRendererContextV1,
  type PresentationReadPortV1,
  type RuntimeStageSceneV1,
} from "@sillymaker/ui";
import type { ReactElement } from "react";

import type { PocSemanticGamePortV1 } from "../../application/create-poc-semantic-port.js";
import styles from "./PocScenes.module.css";

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type PocPresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  PocAssetUsageV1,
  LocaleId,
  string
>;

export type PocStageSceneRendererPropsV1 = GameRendererContextV1<
  RuntimeStageSceneV1,
  PocSemanticGamePortV1,
  PocPresentationReadPortV1
>;

export function PocMainMenuSceneV1(props: PocStageSceneRendererPropsV1): ReactElement {
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
