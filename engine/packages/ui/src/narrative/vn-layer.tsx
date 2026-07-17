// SPDX-License-Identifier: MIT
import type { DeepReadonly, SemanticGamePortV1 } from "@sillymaker/base";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useDevDockPortalTargetRegistrationV1 } from "../debug/DevDockPortalCoordinator.js";
import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.js";
import type { InputRouterV1 } from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import { useStageInputIsolationV1 } from "../shell/game-stage.js";
import styles from "./vn-layer.module.css";

export type VnChoiceV1<TInvocation> =
  | {
      readonly choiceId: string;
      readonly label: string;
      readonly enabled: true;
      readonly disabledReasons: readonly [];
      readonly invocation: DeepReadonly<TInvocation>;
    }
  | {
      readonly choiceId: string;
      readonly label: string;
      readonly enabled: false;
      readonly disabledReasons: readonly string[];
      readonly invocation?: never;
    };

export interface VnLayerPropsV1<TInvocation, TResult> {
  readonly active: boolean;
  readonly accessibleName: string;
  readonly speakerLabel: string | null;
  readonly text: string;
  readonly choices: readonly VnChoiceV1<TInvocation>[];
  readonly advance: VnChoiceV1<TInvocation> | null;
  readonly semantic: Pick<
    SemanticGamePortV1<unknown, unknown, unknown, TInvocation, unknown, TResult>,
    "dispatch"
  >;
  readonly inputRouter: InputRouterV1;
}

interface VnChoiceControlPropsV1<TInvocation, TResult> {
  readonly choice: VnChoiceV1<TInvocation>;
  readonly semantic: VnLayerPropsV1<TInvocation, TResult>["semantic"];
}

function VnChoiceControlV1<TInvocation, TResult>(
  props: VnChoiceControlPropsV1<TInvocation, TResult>,
): ReactElement {
  const choice = props.choice;
  const descriptionPrefix = useId();
  const descriptionIds = choice.disabledReasons.map(
    (_reason, index) => `${descriptionPrefix}-reason-${index}`,
  );
  const dispatch = choice.enabled
    ? () => {
        void props.semantic.dispatch(choice.invocation);
      }
    : undefined;

  return (
    <div className={styles["vn-layer__choice"]} data-vn-choice-id={choice.choiceId}>
      <Button
        className={styles["vn-layer__choice-control"]}
        disabled={!choice.enabled}
        aria-describedby={descriptionIds.length === 0 ? undefined : descriptionIds.join(" ")}
        onClick={dispatch}
      >
        {choice.label}
      </Button>
      {choice.disabledReasons.length === 0 ? null : (
        <ul className={styles["vn-layer__disabled-reasons"]}>
          {choice.disabledReasons.map((reason, index) => (
            <li key={descriptionIds[index]} id={descriptionIds[index]}>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VnLayerV1<TInvocation, TResult>(
  props: VnLayerPropsV1<TInvocation, TResult>,
): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);
  const setDialog = useCallback((element: HTMLDivElement | null): void => {
    dialogRef.current = element;
    setDialogElement(element);
  }, []);
  useDevDockPortalTargetRegistrationV1("narrative", props.active ? dialogElement : null);
  useStageInputIsolationV1("narrative", props.active);

  useLayoutEffect(() => {
    if (!props.active) return undefined;

    return props.inputRouter.register({
      context: "narrative",
      handle(event) {
        if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
          return inputIgnoredV1;
        }

        if (event.kind === "action") {
          const requestsAdvance =
            event.actionId === systemInputActionIdsV1.confirm ||
            event.actionId === systemInputActionIdsV1.narrativeAdvance;
          if (requestsAdvance && props.advance?.enabled === true) {
            void props.semantic.dispatch(props.advance.invocation);
          }
          return inputHandledV1;
        }

        return inputHandledV1;
      },
    });
  }, [props.active, props.advance, props.inputRouter, props.semantic]);

  useLayoutEffect(() => {
    if (!props.active) return undefined;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstEnabledControl = dialog?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    (firstEnabledControl ?? dialog)?.focus();

    return () => {
      if (previouslyFocusedElement?.isConnected !== true) return;
      const activeElement = document.activeElement;
      if (
        activeElement !== null &&
        activeElement !== document.body &&
        (dialog === null || !dialog.contains(activeElement))
      ) {
        return;
      }
      previouslyFocusedElement.focus();
    };
  }, [props.active]);

  if (!props.active) return null;

  return (
    <div
      ref={setDialog}
      className={styles["vn-layer"]}
      role="dialog"
      aria-label={props.accessibleName}
      data-blocking-focus-scope="narrative"
      tabIndex={-1}
    >
      <section className={styles["vn-layer__panel"]}>
        {props.speakerLabel === null ? null : (
          <p className={styles["vn-layer__speaker"]}>{props.speakerLabel}</p>
        )}
        <p className={styles["vn-layer__text"]} aria-live="polite" aria-atomic="true">
          {props.text}
        </p>
        {props.choices.length === 0 ? null : (
          <ul className={styles["vn-layer__choices"]}>
            {props.choices.map((choice) => (
              <li key={choice.choiceId}>
                <VnChoiceControlV1 choice={choice} semantic={props.semantic} />
              </li>
            ))}
          </ul>
        )}
        {props.advance === null ? null : (
          <div className={styles["vn-layer__advance"]}>
            <VnChoiceControlV1 choice={props.advance} semantic={props.semantic} />
          </div>
        )}
      </section>
    </div>
  );
}
