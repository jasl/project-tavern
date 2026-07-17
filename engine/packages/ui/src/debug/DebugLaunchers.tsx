// SPDX-License-Identifier: MIT
import type { MouseEvent, PointerEvent, ReactElement, Ref } from "react";
import { Button } from "../primitives/Button.js";
import styles from "./DevDock.module.css";

export type DevDockSideV1 = "left" | "right";

export interface DevDockOpenStateV1 {
  readonly leftOpen: boolean;
  readonly rightOpen: boolean;
}

export interface DebugLaunchersPropsV1 {
  readonly openState: DevDockOpenStateV1;
  readonly leftRef?: Ref<HTMLButtonElement>;
  readonly rightRef?: Ref<HTMLButtonElement>;
  onOpen(side: DevDockSideV1): void;
}

function stopPointerThroughV1(event: PointerEvent<HTMLButtonElement>): void {
  event.stopPropagation();
}

function requestOpenV1(
  event: MouseEvent<HTMLButtonElement>,
  side: DevDockSideV1,
  onOpen: DebugLaunchersPropsV1["onOpen"],
): void {
  event.stopPropagation();
  onOpen(side);
}

/** The one code-native pair of launchers moved into the active focus scope. */
export function DebugLaunchersV1(props: DebugLaunchersPropsV1): ReactElement {
  return (
    <div className={styles["dev-dock__launchers"]} data-devdock-launchers="true">
      <Button
        ref={props.leftRef}
        className={styles["dev-dock__launcher"]}
        data-devdock-launcher="left"
        data-side="left"
        aria-expanded={props.openState.leftOpen}
        aria-controls="sillymaker-dev-dock-left"
        onPointerDown={stopPointerThroughV1}
        onClick={(event) => requestOpenV1(event, "left", props.onOpen)}
      >
        打开左侧开发工具
      </Button>
      <Button
        ref={props.rightRef}
        className={styles["dev-dock__launcher"]}
        data-devdock-launcher="right"
        data-side="right"
        aria-expanded={props.openState.rightOpen}
        aria-controls="sillymaker-dev-dock-right"
        onPointerDown={stopPointerThroughV1}
        onClick={(event) => requestOpenV1(event, "right", props.onOpen)}
      >
        打开右侧开发工具
      </Button>
    </div>
  );
}
