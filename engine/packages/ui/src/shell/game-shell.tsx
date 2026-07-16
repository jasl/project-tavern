// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import { RootErrorBoundaryV1 } from "../errors/root-error-boundary.js";
import type { RootErrorBoundaryPropsV1 } from "../errors/root-error-boundary.js";
import type { InputRouterV1 } from "../input/contracts.js";
import { InputContextProviderV1 } from "../input/input-context.js";
import { GameStageV1 } from "./game-stage.js";
import type { GameStageLayersV1 } from "./game-stage.js";
import styles from "./game-shell.module.css";

export interface GameShellPropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
  readonly inputRouter: InputRouterV1;
  readonly backdrop?: ReactNode;
  readonly errorBoundary?: Omit<
    RootErrorBoundaryPropsV1,
    "children" | "inputRouter" | "renderFailure"
  >;
}

function recoveryLayersV1(system: ReactNode): GameStageLayersV1 {
  return Object.freeze({
    background: null,
    character: null,
    sceneInteraction: null,
    hud: null,
    workspaceOverlay: null,
    narrative: null,
    system,
  });
}

export function GameShell(props: GameShellPropsV1): ReactElement {
  const stage = <GameStageV1 accessibleName={props.accessibleName} layers={props.layers} />;
  const protectedStage =
    props.errorBoundary === undefined ? (
      stage
    ) : (
      <RootErrorBoundaryV1
        {...props.errorBoundary}
        inputRouter={props.inputRouter}
        renderFailure={(dialog) => (
          <GameStageV1 accessibleName={props.accessibleName} layers={recoveryLayersV1(dialog)} />
        )}
      >
        {stage}
      </RootErrorBoundaryV1>
    );

  return (
    <div className={styles["game-shell"]}>
      <div
        className={styles["game-shell__backdrop"]}
        data-testid="game-shell-backdrop"
        aria-hidden="true"
        inert
      >
        {props.backdrop ?? null}
      </div>
      <InputContextProviderV1 router={props.inputRouter}>{protectedStage}</InputContextProviderV1>
    </div>
  );
}
