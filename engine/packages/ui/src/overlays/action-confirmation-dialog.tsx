// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  inputHandledV1,
  inputIgnoredV1,
  systemInputActionIdsV1,
  type InputRouterV1,
} from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import {
  useStageInputIsolationV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.js";
import styles from "./overlay-host.module.css";

export interface ActionConfirmationDispatchPortV1<TInvocation, TResult> {
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}

export interface ActionConfirmationDialogPropsV1<TInvocation, TResult> {
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly pendingText: string;
  readonly completedText: string;
  readonly failedText: string;
  readonly invocation: DeepReadonly<TInvocation>;
  readonly semantic: ActionConfirmationDispatchPortV1<TInvocation, TResult>;
  readonly inputRouter: InputRouterV1;
  readonly opener: HTMLElement;
  readonly onClose: () => void;
}

type ConfirmationStatusV1 = "idle" | "pending" | "completed" | "failed";

function focusConnectedElementV1(element: HTMLElement): void {
  queueMicrotask(() => {
    if (element.isConnected) element.focus();
  });
}

export function ActionConfirmationDialogV1<TInvocation, TResult>(
  props: ActionConfirmationDialogPropsV1<TInvocation, TResult>,
): ReactElement {
  const portalContainer = useStageSystemPortalContainerV1();
  useStageInputIsolationV1("system", true);
  const [status, setStatus] = useState<ConfirmationStatusV1>("idle");
  const [focusScopeElement, setFocusScopeElement] = useState<HTMLDivElement | null>(null);
  useStageSystemFocusScopeRegistrationV1(focusScopeElement);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useLayoutEffect(() => {
    mountedRef.current = true;
    const opener = props.opener;
    return () => {
      mountedRef.current = false;
      focusConnectedElementV1(opener);
    };
  }, [props.opener]);

  useLayoutEffect(
    () =>
      props.inputRouter.register({
        context: "system",
        handle(event) {
          if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
            return inputIgnoredV1;
          }
          if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
            onCloseRef.current();
          }
          return inputHandledV1;
        },
      }),
    [props.inputRouter],
  );

  const close = (): void => onCloseRef.current();
  const confirm = async (): Promise<void> => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus("pending");
    try {
      await props.semantic.dispatch(props.invocation);
      if (mountedRef.current) setStatus("completed");
    } catch {
      if (mountedRef.current) setStatus("failed");
    }
  };

  const resultText =
    status === "pending"
      ? props.pendingText
      : status === "completed"
        ? props.completedText
        : status === "failed"
          ? props.failedText
          : "";
  const position = portalContainer === null ? "fixed" : "absolute";

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
      <DialogPrimitive.Portal container={portalContainer ?? undefined}>
        <DialogPrimitive.Overlay
          className={styles["blocking-dialog__backdrop"]}
          data-system-dialog-backdrop="action_confirmation"
          style={{ position }}
        />
        <DialogPrimitive.Content
          ref={setFocusScopeElement}
          className={styles["blocking-dialog__content"]}
          data-blocking-focus-scope="system"
          data-system-surface="action_confirmation"
          style={{ position }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title asChild>
            <h2>{props.title}</h2>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description asChild>
            <div>{props.description}</div>
          </DialogPrimitive.Description>
          <div className={styles["blocking-dialog__actions"]}>
            <Button autoFocus disabled={startedRef.current} onClick={() => void confirm()}>
              {props.confirmLabel}
            </Button>
            <Button onClick={close}>{props.cancelLabel}</Button>
          </div>
          <p
            className={styles["blocking-dialog__result"]}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {resultText}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
