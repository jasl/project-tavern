// SPDX-License-Identifier: MIT
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { inputHandledV1, inputIgnoredV1, type InputRouterV1 } from "../input/contracts.js";
import styles from "../overlays/overlay-host.module.css";
import { Button } from "../primitives/Button.js";
import {
  useStageInputIsolationV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.js";

export interface RuntimeFailureDialogActionsV1 {
  readonly retry: (() => void) | null;
  readonly reloadApplication: () => void;
  readonly requestExit: (() => void) | null;
}

export interface RuntimeFailureDialogPropsV1 {
  readonly title: string;
  readonly description: ReactNode;
  readonly retryLabel: string;
  readonly reloadApplicationLabel: string;
  readonly requestExitLabel: string;
  readonly inputRouter: InputRouterV1;
  readonly actions: RuntimeFailureDialogActionsV1;
  readonly diagnosticExport: ReactNode;
  readonly returnFocusTo?: HTMLElement | null;
}

function readFocusedElementV1(): HTMLElement | null {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body
    ? activeElement
    : null;
}

function returnOwnedFocusV1(target: HTMLElement | null, scope: HTMLElement | null): void {
  queueMicrotask(() => {
    if (target === null || !target.isConnected) return;
    const activeElement = document.activeElement;
    if (
      activeElement === null ||
      activeElement === document.body ||
      (scope !== null && scope.contains(activeElement))
    ) {
      target.focus();
    }
  });
}

/** A terminal, player-safe System surface over an application-supplied recovery port. */
export function RuntimeFailureDialogV1(props: RuntimeFailureDialogPropsV1): ReactElement {
  const portalContainer = useStageSystemPortalContainerV1();
  const [focusScopeElement, setFocusScopeElement] = useState<HTMLDivElement | null>(null);
  const focusScopeRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<{ readonly target: HTMLElement | null } | null>(null);
  if (initialFocusRef.current === null) {
    initialFocusRef.current = Object.freeze({ target: readFocusedElementV1() });
  }
  const returnFocusRef = useRef<HTMLElement | null>(null);
  returnFocusRef.current =
    props.returnFocusTo === undefined ? initialFocusRef.current.target : props.returnFocusTo;

  useStageInputIsolationV1("system", true);
  useStageSystemFocusScopeRegistrationV1(focusScopeElement);

  useLayoutEffect(
    () =>
      props.inputRouter.register({
        context: "system",
        handle(event) {
          if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
            return inputIgnoredV1;
          }
          return inputHandledV1;
        },
      }),
    [props.inputRouter],
  );

  useLayoutEffect(
    () => () => returnOwnedFocusV1(returnFocusRef.current, focusScopeRef.current),
    [],
  );

  const position = portalContainer === null ? "fixed" : "absolute";
  const setFocusScope = useCallback((element: HTMLDivElement | null): void => {
    focusScopeRef.current = element;
    setFocusScopeElement(element);
  }, []);

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal container={portalContainer ?? undefined}>
        <DialogPrimitive.Overlay
          className={styles["blocking-dialog__backdrop"]}
          data-system-dialog-backdrop="runtime_failure"
          style={{ position }}
        />
        <DialogPrimitive.Content
          ref={setFocusScope}
          className={styles["blocking-dialog__content"]}
          data-blocking-focus-scope="fault_pause"
          data-system-surface="runtime_failure"
          style={{ position }}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title asChild>
            <h2>{props.title}</h2>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description asChild>
            <div>{props.description}</div>
          </DialogPrimitive.Description>
          <div data-runtime-failure-diagnostic-export="true">{props.diagnosticExport}</div>
          <div className={styles["blocking-dialog__actions"]}>
            {props.actions.retry === null ? null : (
              <Button autoFocus onClick={props.actions.retry}>
                {props.retryLabel}
              </Button>
            )}
            <Button
              autoFocus={props.actions.retry === null}
              onClick={props.actions.reloadApplication}
            >
              {props.reloadApplicationLabel}
            </Button>
            {props.actions.requestExit === null ? null : (
              <Button onClick={props.actions.requestExit}>{props.requestExitLabel}</Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
