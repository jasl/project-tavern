// SPDX-License-Identifier: MIT
import type { DeepReadonly, SemanticGamePortV1 } from "@sillymaker/base";
import { useId, useLayoutEffect, useRef } from "react";
import type { ReactElement } from "react";
import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.js";
import type { InputRouterV1 } from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import { useStageInputIsolationV1 } from "../shell/game-stage.js";
import styles from "./vn-layer.module.css";

export interface VnChoiceV1<TInvocation> {
  readonly choiceId: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly disabledReasons: readonly string[];
  readonly invocation: DeepReadonly<TInvocation>;
}

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
  const descriptionPrefix = useId();
  const descriptionIds = props.choice.disabledReasons.map(
    (_reason, index) => `${descriptionPrefix}-reason-${index}`,
  );

  return (
    <div className={styles["vn-layer__choice"]} data-vn-choice-id={props.choice.choiceId}>
      <Button
        className={styles["vn-layer__choice-control"]}
        disabled={!props.choice.enabled}
        aria-describedby={descriptionIds.length === 0 ? undefined : descriptionIds.join(" ")}
        onClick={() => void props.semantic.dispatch(props.choice.invocation)}
      >
        {props.choice.label}
      </Button>
      {props.choice.disabledReasons.length === 0 ? null : (
        <ul className={styles["vn-layer__disabled-reasons"]}>
          {props.choice.disabledReasons.map((reason, index) => (
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
      ref={dialogRef}
      className={styles["vn-layer"]}
      role="dialog"
      aria-label={props.accessibleName}
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
