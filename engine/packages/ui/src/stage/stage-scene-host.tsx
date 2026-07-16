// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { CodeNativeAssetFallbackV1 } from "../assets/code-native-asset-fallback.js";
import { usePresentationAssetV1 } from "../assets/use-presentation-asset.js";
import type { GameRendererContextV1, UiRendererNamespaceV1 } from "../contributions/types.js";
import type {
  RuntimeStageSceneV1,
  StagePresentationReadPortV1,
  StageSceneHostPropsV1,
} from "./contracts.js";
import styles from "./stage-scene-host.module.css";

const reducedMotionQueryV1 = "(prefers-reduced-motion: reduce)";

function observeReducedMotionV1(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(reducedMotionQueryV1).matches;
}

function subscribeReducedMotionV1(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(reducedMotionQueryV1);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function useReducedMotionV1(): boolean {
  return useSyncExternalStore(subscribeReducedMotionV1, observeReducedMotionV1, () => false);
}

interface CodeFallbackStageScenePropsV1 {
  readonly accessibleName: string;
  readonly fallbackToken: string;
}

export function CodeFallbackStageSceneV1(props: CodeFallbackStageScenePropsV1): ReactElement {
  if (props.accessibleName.trim().length === 0) {
    throw new TypeError("asset.fallback_accessible_name_required");
  }

  return (
    <span
      className={styles["stage-scene-fallback"]}
      role="img"
      aria-label={props.accessibleName}
      data-stage-fallback="code_native"
      data-stage-fallback-token={props.fallbackToken}
    >
      <CodeNativeAssetFallbackV1
        fallbackToken={props.fallbackToken}
        usage="scene_background"
        accessibleName={props.accessibleName}
        decorative
      />
    </span>
  );
}

interface MissingRendererStageScenePropsV1<TPresentation extends StagePresentationReadPortV1> {
  readonly stage: Readonly<RuntimeStageSceneV1>;
  readonly presentation: TPresentation;
}

function MissingRendererStageSceneV1<TPresentation extends StagePresentationReadPortV1>(
  props: MissingRendererStageScenePropsV1<TPresentation>,
): ReactElement {
  const asset = usePresentationAssetV1(
    props.presentation,
    props.stage.background.assetId,
    "scene_background",
  );
  const accessibleName = props.presentation.text(props.stage.background.accessibleNameTextId).text;

  return (
    <CodeFallbackStageSceneV1 accessibleName={accessibleName} fallbackToken={asset.fallbackToken} />
  );
}

export function StageSceneHostV1<
  TSemanticPort,
  TPresentation extends StagePresentationReadPortV1,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> & {
    readonly background: GameRendererContextV1<RuntimeStageSceneV1, TSemanticPort, TPresentation>;
  },
>(props: StageSceneHostPropsV1<TSemanticPort, TPresentation, TContexts>): ReactElement {
  const reducedMotion = useReducedMotionV1();
  const resolved = props.contributions.resolve("background", props.stage.rendererId);
  const rendererContext = Object.freeze({
    viewSlice: props.stage,
    semantic: props.semantic,
    presentation: props.presentation,
  }) satisfies GameRendererContextV1<RuntimeStageSceneV1, TSemanticPort, TPresentation>;

  return (
    <div
      className={styles["stage-scene-background"]}
      data-testid="stage-scene-background"
      data-stage-scene-id={props.stage.stageSceneId}
      data-stage-variant-id={props.stage.variantId}
      data-transition={reducedMotion ? "none" : "opacity"}
    >
      <div
        key={`${props.stage.stageSceneId}:${props.stage.variantId}:${props.stage.rendererId}`}
        className={styles["stage-scene-variant"]}
        data-testid="stage-scene-variant"
      >
        {resolved.kind === "found" ? (
          <resolved.component {...rendererContext} />
        ) : (
          <MissingRendererStageSceneV1 stage={props.stage} presentation={props.presentation} />
        )}
      </div>
    </div>
  );
}
