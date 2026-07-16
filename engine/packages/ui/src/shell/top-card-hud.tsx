// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import styles from "./game-shell.module.css";

export interface StageHudSlotsV1 {
  readonly start: ReactNode;
  readonly center: ReactNode;
  readonly end: ReactNode;
}

export interface TopCardHudPropsV1 {
  readonly accessibleName: string;
  readonly slots: StageHudSlotsV1;
}

export function TopCardHudV1(props: TopCardHudPropsV1): ReactElement {
  return (
    <section
      className={styles["game-shell__top-card"]}
      aria-label={props.accessibleName}
      data-top-card-hud="true"
    >
      <div
        className={styles["game-shell__top-card-slot"]}
        data-slot="start"
        data-testid="top-card-start"
      >
        {props.slots.start}
      </div>
      <div
        className={styles["game-shell__top-card-slot"]}
        data-slot="center"
        data-testid="top-card-center"
      >
        {props.slots.center}
      </div>
      <div
        className={styles["game-shell__top-card-slot"]}
        data-slot="end"
        data-testid="top-card-end"
      >
        {props.slots.end}
      </div>
    </section>
  );
}
