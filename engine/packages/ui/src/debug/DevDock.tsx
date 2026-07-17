// SPDX-License-Identifier: MIT
import { createPortal } from "react-dom";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.js";
import type { InputRouterV1 } from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import { DebugLaunchersV1 } from "./DebugLaunchers.js";
import type { DevDockOpenStateV1, DevDockSideV1 } from "./DebugLaunchers.js";
import { useDevDockPortalTargetV1 } from "./DevDockPortalCoordinator.js";
import styles from "./DevDock.module.css";

export type { DevDockOpenStateV1, DevDockSideV1 } from "./DebugLaunchers.js";
export type DevDockPanelAuthorityV1 = "read_only" | "cheat";

export interface DevDockPanelV1 {
  readonly id: string;
  readonly side: DevDockSideV1;
  readonly title: string;
  readonly authority: DevDockPanelAuthorityV1;
  readonly render: () => ReactNode;
}

export interface DevDockContributionSetV1 {
  readonly panels: readonly DevDockPanelV1[];
}

export interface DevDockPropsV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly inputRouter: InputRouterV1;
  readonly openState: DevDockOpenStateV1;
  onOpenStateChange(next: DevDockOpenStateV1): void;
}

const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;

function openDevDockStateV1(side: DevDockSideV1): DevDockOpenStateV1 {
  return Object.freeze({ leftOpen: side === "left", rightOpen: side === "right" });
}

function validatePanelV1(panel: DevDockPanelV1): DevDockPanelV1 {
  if (panel === null || typeof panel !== "object" || Array.isArray(panel)) {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (typeof panel.id !== "string" || panel.id.length === 0 || typeof panel.render !== "function") {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (panel.side !== "left" && panel.side !== "right") {
    throw new TypeError("ui.devdock_invalid_side");
  }
  if (panel.authority !== "read_only" && panel.authority !== "cheat") {
    throw new TypeError("ui.devdock_invalid_authority");
  }
  if (
    typeof panel.title !== "string" ||
    panel.title.length === 0 ||
    new TextEncoder().encode(panel.title).byteLength > 128
  ) {
    throw new TypeError("ui.devdock_title_limit");
  }
  return Object.freeze({
    id: panel.id,
    side: panel.side,
    title: panel.title,
    authority: panel.authority,
    render: panel.render,
  });
}

/** Validates and freezes the bounded Story-supplied panel registry. */
export function createDevDockContributionSetV1(
  input: DevDockContributionSetV1,
): DevDockContributionSetV1 {
  if (input === null || typeof input !== "object" || !Array.isArray(input.panels)) {
    throw new TypeError("ui.devdock_invalid_contributions");
  }
  const ids = new Set<string>();
  const counts: Record<DevDockSideV1, number> = { left: 0, right: 0 };
  const panels = input.panels.map((candidate) => {
    const panel = validatePanelV1(candidate);
    if (ids.has(panel.id)) throw new TypeError("ui.devdock_duplicate_panel_id");
    ids.add(panel.id);
    counts[panel.side] += 1;
    if (counts[panel.side] > 16) throw new TypeError("ui.devdock_panels_limit");
    return panel;
  });
  return Object.freeze({ panels: Object.freeze(panels) });
}

function focusableElementsV1(scope: HTMLElement): readonly HTMLElement[] {
  return [
    ...scope.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
    ),
  ].filter(
    (element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true",
  );
}

function trapTabV1(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== "Tab") return;
  const controls = focusableElementsV1(event.currentTarget);
  if (controls.length === 0) {
    event.preventDefault();
    event.currentTarget.focus();
    return;
  }
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function DevDockRailV1(props: {
  readonly side: DevDockSideV1;
  readonly panels: readonly DevDockPanelV1[];
  readonly cheatsEnabled: boolean;
  readonly selectedPanelId: string | null;
  readonly railRef: (element: HTMLElement | null) => void;
  onSelect(panelId: string): void;
  onClose(): void;
}): ReactElement {
  const selected =
    props.panels.find((panel) => panel.id === props.selectedPanelId) ?? props.panels[0] ?? null;
  const selectedAuthorized =
    selected !== null && (selected.authority === "read_only" || props.cheatsEnabled);
  const hasDisabledCheatPanel =
    !props.cheatsEnabled && props.panels.some((panel) => panel.authority === "cheat");
  const disabledReasonId = `sillymaker-dev-dock-${props.side}-cheat-reason`;
  const label = props.side === "left" ? "左侧开发工具" : "右侧开发工具";

  return (
    <aside
      ref={props.railRef}
      id={`sillymaker-dev-dock-${props.side}`}
      className={styles["dev-dock__rail"]}
      data-side={props.side}
      role="complementary"
      aria-label={label}
      tabIndex={-1}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        trapTabV1(event);
      }}
    >
      <header className={styles["dev-dock__header"]}>
        <h2>{label}</h2>
        <Button onClick={props.onClose}>关闭{label}</Button>
      </header>
      {props.panels.length === 0 ? (
        <p className={styles["dev-dock__empty"]}>暂无可用开发工具</p>
      ) : (
        <>
          <nav className={styles["dev-dock__tabs"]} aria-label={`${label}面板`}>
            {props.panels.map((panel) => {
              const disabled = panel.authority === "cheat" && !props.cheatsEnabled;
              return (
                <Button
                  key={panel.id}
                  aria-pressed={selected?.id === panel.id}
                  aria-describedby={disabled ? disabledReasonId : undefined}
                  disabled={disabled}
                  onClick={() => props.onSelect(panel.id)}
                >
                  {panel.title}
                </Button>
              );
            })}
          </nav>
          {hasDisabledCheatPanel ? (
            <p id={disabledReasonId} className={styles["dev-dock__authority-reason"]}>
              需要启用作弊功能
            </p>
          ) : null}
          <section className={styles["dev-dock__panel"]} aria-live="polite">
            {selectedAuthorized ? selected.render() : <p>需要启用作弊功能</p>}
          </section>
        </>
      )}
    </aside>
  );
}

/** Runtime-gated GameShell chrome; it never receives Snapshot or Story state. */
export function DevDockV1(props: DevDockPropsV1): ReactElement | null {
  const { onOpenStateChange } = props;
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const contributions = useMemo(
    () => createDevDockContributionSetV1(props.contributions),
    [props.contributions],
  );
  const leftPanels = contributions.panels.filter((panel) => panel.side === "left");
  const rightPanels = contributions.panels.filter((panel) => panel.side === "right");
  const [selectedLeft, setSelectedLeft] = useState<string | null>(leftPanels[0]?.id ?? null);
  const [selectedRight, setSelectedRight] = useState<string | null>(rightPanels[0]?.id ?? null);
  const leftLauncherRef = useRef<HTMLButtonElement>(null);
  const rightLauncherRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const { target, surface } = useDevDockPortalTargetV1();
  const openSide: DevDockSideV1 | null = props.openState.leftOpen
    ? "left"
    : props.openState.rightOpen
      ? "right"
      : null;

  const publishOpenState = useCallback(
    (next: DevDockOpenStateV1): void => onOpenStateChange(next),
    [onOpenStateChange],
  );
  const restoreLauncherFocus = useCallback((side: DevDockSideV1): void => {
    const launcher = side === "left" ? leftLauncherRef.current : rightLauncherRef.current;
    queueMicrotask(() => launcher?.isConnected === true && launcher.focus());
  }, []);
  const closeRail = useCallback((): void => {
    if (openSide === null) return;
    const side = openSide;
    publishOpenState(closedDevDockStateV1);
    restoreLauncherFocus(side);
  }, [openSide, publishOpenState, restoreLauncherFocus]);

  useLayoutEffect(() => {
    if (props.openState.leftOpen && props.openState.rightOpen) {
      publishOpenState(openDevDockStateV1("left"));
    }
  }, [props.openState.leftOpen, props.openState.rightOpen, publishOpenState]);

  useLayoutEffect(() => {
    if (!capabilities.debugTools && openSide !== null) {
      const side = openSide;
      publishOpenState(closedDevDockStateV1);
      restoreLauncherFocus(side);
    }
  }, [capabilities.debugTools, openSide, publishOpenState, restoreLauncherFocus]);

  useLayoutEffect(() => {
    if (openSide === null) return undefined;
    return props.inputRouter.register({
      context: "debug",
      handle(event) {
        return event.kind === "focus_loss" || event.kind === "pointer_cancel"
          ? inputIgnoredV1
          : inputHandledV1;
      },
    });
  }, [openSide, props.inputRouter]);

  useLayoutEffect(() => {
    if (openSide === null) return;
    const scope = railRef.current;
    (scope === null ? null : (focusableElementsV1(scope)[0] ?? scope))?.focus();
  }, [openSide, target]);

  useLayoutEffect(() => {
    if (selectedLeft !== null && leftPanels.some((panel) => panel.id === selectedLeft)) return;
    setSelectedLeft(leftPanels[0]?.id ?? null);
  }, [leftPanels, selectedLeft]);

  useLayoutEffect(() => {
    if (selectedRight !== null && rightPanels.some((panel) => panel.id === selectedRight)) return;
    setSelectedRight(rightPanels[0]?.id ?? null);
  }, [rightPanels, selectedRight]);

  if ((!capabilities.debugTools && openSide === null) || target === null) return null;
  const activePanels = openSide === "left" ? leftPanels : rightPanels;
  const selectedPanelId = openSide === "left" ? selectedLeft : selectedRight;

  return createPortal(
    <div
      className={styles["dev-dock"]}
      data-devdock-surface={surface}
      data-devdock-escape-owner={openSide === null ? undefined : "true"}
      data-devdock-open={openSide === null ? undefined : "true"}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || openSide === null) return;
        event.preventDefault();
        event.stopPropagation();
        closeRail();
      }}
    >
      <DebugLaunchersV1
        openState={props.openState}
        leftRef={leftLauncherRef}
        rightRef={rightLauncherRef}
        onOpen={(side) => publishOpenState(openDevDockStateV1(side))}
      />
      {openSide === null ? null : (
        <DevDockRailV1
          side={openSide}
          panels={activePanels}
          cheatsEnabled={capabilities.debugTools && capabilities.cheats}
          selectedPanelId={selectedPanelId}
          railRef={(element) => {
            railRef.current = element;
          }}
          onSelect={openSide === "left" ? setSelectedLeft : setSelectedRight}
          onClose={closeRail}
        />
      )}
    </div>,
    target,
  );
}
