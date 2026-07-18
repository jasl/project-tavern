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

interface FocusReturnTransitionV1 {
  readonly opener: HTMLElement;
  readonly ownerDocument: Document;
  readonly logicalAnchorOrdinal: number | null;
}

const logicalFocusCandidateSelectorV1 = [
  "a[href]",
  "area[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "[contenteditable='true']",
  "[tabindex]",
].join(", ");

function hasHiddenAncestorV1(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  for (
    let current: HTMLElement | null = element;
    current !== null;
    current = current.parentElement
  ) {
    if (current.hidden || current.getAttribute("aria-hidden") === "true") return true;
    const style = view?.getComputedStyle(current);
    if (
      style?.display === "none" ||
      style?.visibility === "hidden" ||
      style?.visibility === "collapse"
    ) {
      return true;
    }
  }
  return false;
}

function isAvailableFocusTargetV1(element: HTMLElement): boolean {
  return (
    element.isConnected &&
    !element.matches(":disabled") &&
    element.closest("[inert], [aria-disabled='true']") === null &&
    !hasHiddenAncestorV1(element)
  );
}

function readLogicalFocusCandidatesV1(
  ownerDocument: Document,
  closingScope: HTMLElement | null,
): readonly HTMLElement[] {
  return Object.freeze(
    [...ownerDocument.querySelectorAll<HTMLElement>(logicalFocusCandidateSelectorV1)].filter(
      (candidate) => candidate.tabIndex >= 0 && closingScope?.contains(candidate) !== true,
    ),
  );
}

function captureLogicalFocusAnchorV1(
  opener: HTMLElement | null,
  closingScope: HTMLElement | null,
): number | null {
  if (opener === null) return null;
  const ordinal = readLogicalFocusCandidatesV1(opener.ownerDocument, closingScope).indexOf(opener);
  return ordinal < 0 ? null : ordinal;
}

function createFocusReturnTransitionV1(
  opener: HTMLElement,
  closingScope: HTMLElement | null,
): FocusReturnTransitionV1 {
  const logicalAnchorOrdinal = captureLogicalFocusAnchorV1(opener, closingScope);
  return Object.freeze({
    opener,
    ownerDocument: opener.ownerDocument,
    logicalAnchorOrdinal,
  });
}

function captureCurrentFocusReturnTransitionV1(
  closingScope: HTMLElement | null,
): FocusReturnTransitionV1 | null {
  if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
  const opener = document.activeElement;
  return opener instanceof HTMLElement && opener !== document.body
    ? createFocusReturnTransitionV1(opener, closingScope)
    : null;
}

function resolveLiveFocusReturnTargetV1(
  transition: FocusReturnTransitionV1,
  closingScope: HTMLElement | null,
): HTMLElement | undefined {
  const candidates = readLogicalFocusCandidatesV1(transition.ownerDocument, closingScope);
  const liveOpenerIndex = candidates.indexOf(transition.opener);
  if (
    (liveOpenerIndex >= 0 || transition.logicalAnchorOrdinal === null) &&
    isAvailableFocusTargetV1(transition.opener)
  ) {
    return transition.opener;
  }
  const fallbackStart =
    liveOpenerIndex >= 0 ? liveOpenerIndex + 1 : transition.logicalAnchorOrdinal;
  if (fallbackStart === null) return undefined;
  return candidates.slice(fallbackStart).find(isAvailableFocusTargetV1);
}

function restoreFocusAfterClosingCommitV1(
  transition: FocusReturnTransitionV1,
  closingScope: HTMLElement | null,
): void {
  const activeElement = transition.ownerDocument.activeElement;
  if (
    activeElement !== null &&
    activeElement !== transition.ownerDocument.body &&
    (closingScope === null || !closingScope.contains(activeElement))
  ) {
    return;
  }
  resolveLiveFocusReturnTargetV1(transition, closingScope)?.focus({ preventScroll: true });
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
  const focusReturnTransitionRef = useRef<FocusReturnTransitionV1 | null>(null);
  const activeFocusCommitRef = useRef(false);
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);
  const setDialog = useCallback((element: HTMLDivElement | null): void => {
    dialogRef.current = element;
    setDialogElement(element);
  }, []);
  useDevDockPortalTargetRegistrationV1("narrative", props.active ? dialogElement : null);
  useStageInputIsolationV1("narrative", props.active);

  useLayoutEffect(() => {
    if (props.active || typeof document === "undefined" || typeof HTMLElement === "undefined") {
      return undefined;
    }
    focusReturnTransitionRef.current = captureCurrentFocusReturnTransitionV1(null);
    const captureFocusedCandidate = (event: FocusEvent): void => {
      if (
        !(event.target instanceof HTMLElement) ||
        event.target === event.target.ownerDocument.body
      ) {
        return;
      }
      focusReturnTransitionRef.current = createFocusReturnTransitionV1(event.target, null);
    };
    document.addEventListener("focusin", captureFocusedCandidate);
    return () => document.removeEventListener("focusin", captureFocusedCandidate);
  }, [props.active]);

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
    if (!props.active) {
      activeFocusCommitRef.current = false;
      return undefined;
    }
    activeFocusCommitRef.current = true;
    const dialog = dialogRef.current;
    const focusReturnTransition =
      focusReturnTransitionRef.current ?? captureCurrentFocusReturnTransitionV1(dialog);
    if (focusReturnTransition !== null) {
      focusReturnTransitionRef.current = focusReturnTransition;
    }
    const firstEnabledControl = dialog?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    (firstEnabledControl ?? dialog)?.focus({ preventScroll: true });

    return () => {
      activeFocusCommitRef.current = false;
      if (focusReturnTransition === null) return;
      queueMicrotask(() => {
        if (activeFocusCommitRef.current) return;
        if (focusReturnTransitionRef.current === focusReturnTransition) {
          focusReturnTransitionRef.current = null;
        }
        restoreFocusAfterClosingCommitV1(focusReturnTransition, dialog);
      });
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
