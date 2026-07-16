// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
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
}

export function GameShell(props: GameShellPropsV1): ReactElement {
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
      <InputContextProviderV1 router={props.inputRouter}>
        <GameStageV1 accessibleName={props.accessibleName} layers={props.layers} />
      </InputContextProviderV1>
    </div>
  );
}
