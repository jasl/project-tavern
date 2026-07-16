// SPDX-License-Identifier: MIT
import type { AssetId } from "@sillymaker/base";
import type { CSSProperties, ReactElement } from "react";

import { CodeNativeAssetFallbackV1 } from "../assets/code-native-asset-fallback.js";
import { usePresentationAssetV1 } from "../assets/use-presentation-asset.js";
import type { GameRendererContextV1 } from "../contributions/types.js";
import type {
  CharacterPresentationReadPortV1,
  RuntimeCharacterPresentationV1,
} from "./contracts.js";
import styles from "./character-renderers.module.css";

const codeNativeSilhouetteTokenV1 = "character.code_native_silhouette";

type CharacterFallbackDeliveryV1 = "static_asset" | "code_native";

interface CharacterRootPropsV1 {
  readonly character: Readonly<RuntimeCharacterPresentationV1>;
  readonly accessibleName: string;
  readonly fallbackDelivery: CharacterFallbackDeliveryV1;
  readonly children: ReactElement;
}

function rootStyleV1(character: Readonly<RuntimeCharacterPresentationV1>): CSSProperties {
  return {
    left: `${Number(character.anchor.x) * 100}%`,
    top: `${Number(character.anchor.y) * 100}%`,
    transform: `translate(-50%, -100%) scale(${Number(character.scale)})`,
  };
}

function spatialHitTestV1(
  character: Readonly<RuntimeCharacterPresentationV1>,
  fallbackDelivery: CharacterFallbackDeliveryV1,
): "enabled" | "disabled" {
  return fallbackDelivery === "static_asset" &&
    character.hitMapId !== null &&
    character.fallbackHitMapCompatibility === "compatible"
    ? "enabled"
    : "disabled";
}

function CharacterRootV1(props: CharacterRootPropsV1): ReactElement {
  const character = props.character;

  return (
    <div
      className={styles["character-root"]}
      style={rootStyleV1(character)}
      role="img"
      aria-label={props.accessibleName}
      data-testid="character-root"
      data-character-id={character.characterId}
      data-renderer-id={character.rendererId}
      data-rig-id={character.rigId}
      data-pose-id={character.poseId}
      data-expression-id={character.expressionId}
      data-activity-id={character.activityId ?? undefined}
      data-hit-map-id={character.hitMapId ?? undefined}
      data-spatial-hit-test={spatialHitTestV1(character, props.fallbackDelivery)}
      data-character-fallback={props.fallbackDelivery}
    >
      <span className={styles["character-canvas"]} aria-hidden="true">
        {props.children}
      </span>
    </div>
  );
}

interface StaticAssetCharacterV1Props<TPresentation extends CharacterPresentationReadPortV1> {
  readonly character: Readonly<RuntimeCharacterPresentationV1>;
  readonly presentation: TPresentation;
  readonly assetId: AssetId;
  readonly accessibleName: string;
}

function StaticAssetCharacterV1<TPresentation extends CharacterPresentationReadPortV1>(
  props: StaticAssetCharacterV1Props<TPresentation>,
): ReactElement {
  const asset = usePresentationAssetV1(props.presentation, props.assetId, "character_pose");

  if (asset.delivery === "runtime_image") {
    return (
      <CharacterRootV1
        character={props.character}
        accessibleName={props.accessibleName}
        fallbackDelivery="static_asset"
      >
        <img
          className={styles["character-image"]}
          src={asset.url}
          width={asset.width}
          height={asset.height}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </CharacterRootV1>
    );
  }

  return (
    <CharacterRootV1
      character={props.character}
      accessibleName={props.accessibleName}
      fallbackDelivery="code_native"
    >
      <span className={styles["code-native-silhouette"]}>
        <CodeNativeAssetFallbackV1
          fallbackToken={asset.fallbackToken}
          usage="character_pose"
          accessibleName={props.accessibleName}
          decorative
        />
      </span>
    </CharacterRootV1>
  );
}

export function StaticCharacterRendererV1<
  TSemanticPort,
  TPresentation extends CharacterPresentationReadPortV1,
>(
  props: GameRendererContextV1<RuntimeCharacterPresentationV1, TSemanticPort, TPresentation>,
): ReactElement {
  const character = props.viewSlice;
  const accessibleName = props.presentation.text(character.accessibleNameTextId).text;

  if (character.staticFallbackAssetId !== null) {
    return (
      <StaticAssetCharacterV1
        character={character}
        presentation={props.presentation}
        assetId={character.staticFallbackAssetId}
        accessibleName={accessibleName}
      />
    );
  }

  return (
    <CharacterRootV1
      character={character}
      accessibleName={accessibleName}
      fallbackDelivery="code_native"
    >
      <span className={styles["code-native-silhouette"]}>
        <CodeNativeAssetFallbackV1
          fallbackToken={codeNativeSilhouetteTokenV1}
          usage="character_pose"
          accessibleName={accessibleName}
          decorative
        />
      </span>
    </CharacterRootV1>
  );
}
