// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import styles from "./game-stage.module.css";

export type StageLayerIdV1 =
  | "background"
  | "character"
  | "scene_interaction"
  | "hud"
  | "workspace_overlay"
  | "narrative"
  | "system";

export const stageLayerIdsV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "workspace_overlay",
  "narrative",
  "system",
] as const satisfies readonly StageLayerIdV1[]);

export interface GameStageLayersV1 {
  readonly background: ReactNode;
  readonly character: ReactNode;
  readonly sceneInteraction: ReactNode;
  readonly hud: ReactNode;
  readonly workspaceOverlay: ReactNode;
  readonly narrative: ReactNode;
  readonly system: ReactNode;
}

export interface GameStagePropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
}

export function GameStageV1(props: GameStagePropsV1): ReactElement {
  return (
    <main className={styles["game-stage"]} aria-label={props.accessibleName}>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="background"
        data-testid="stage-background"
      >
        {props.layers.background}
      </div>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="character"
        data-testid="stage-character"
      >
        {props.layers.character}
      </div>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="scene_interaction"
        data-stage-pointer-surface="true"
        data-testid="stage-scene-interaction"
      >
        {props.layers.sceneInteraction}
      </div>
      <div className={styles["game-stage__layer"]} data-stage-layer="hud" data-testid="stage-hud">
        {props.layers.hud}
      </div>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="workspace_overlay"
        data-testid="stage-workspace-overlay"
      >
        {props.layers.workspaceOverlay}
      </div>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="narrative"
        data-testid="stage-narrative"
      >
        {props.layers.narrative}
      </div>
      <div
        className={styles["game-stage__layer"]}
        data-stage-layer="system"
        data-testid="stage-system"
      >
        {props.layers.system}
      </div>
    </main>
  );
}
