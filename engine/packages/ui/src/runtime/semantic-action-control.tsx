// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";
import { useId } from "react";
import type { ReactElement } from "react";
import styles from "../shell/game-shell.module.css";

export interface SemanticActionControlDescriptorV1<TReason> {
  readonly enabled: boolean;
  readonly reasons: readonly DeepReadonly<TReason>[];
}

export interface SemanticActionDispatchPortV1<TInvocation, TResult> {
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}

export interface SemanticActionControlPropsV1<TReason, TInvocation, TResult> {
  readonly descriptor: DeepReadonly<SemanticActionControlDescriptorV1<TReason>>;
  readonly invocation: DeepReadonly<TInvocation>;
  readonly semantic: SemanticActionDispatchPortV1<TInvocation, TResult>;
  readonly label: string;
  readonly disabledReasonLabels: readonly string[];
}

function requireDisabledReasonLabelsV1<TReason>(
  descriptor: DeepReadonly<SemanticActionControlDescriptorV1<TReason>>,
  disabledReasonLabels: readonly string[],
): void {
  if (
    !Array.isArray(disabledReasonLabels) ||
    !Object.isFrozen(disabledReasonLabels) ||
    disabledReasonLabels.length !== descriptor.reasons.length ||
    disabledReasonLabels.some(
      (disabledReasonLabel) =>
        typeof disabledReasonLabel !== "string" || disabledReasonLabel.trim().length === 0,
    )
  ) {
    throw new TypeError("ui.semantic_action_reason_mismatch");
  }
}

export function SemanticActionControlV1<TReason, TInvocation, TResult>(
  props: SemanticActionControlPropsV1<TReason, TInvocation, TResult>,
): ReactElement {
  const descriptionPrefix = useId();
  requireDisabledReasonLabelsV1(props.descriptor, props.disabledReasonLabels);
  const descriptionIds = props.disabledReasonLabels.map(
    (_disabledReasonLabel, index) => `${descriptionPrefix}-reason-${index}`,
  );

  return (
    <>
      <button
        type="button"
        className={styles["game-shell__action"]}
        disabled={!props.descriptor.enabled}
        aria-describedby={descriptionIds.length === 0 ? undefined : descriptionIds.join(" ")}
        onClick={() => void props.semantic.dispatch(props.invocation)}
      >
        {props.label}
      </button>
      {props.disabledReasonLabels.map((disabledReasonLabel, index) => (
        <span key={descriptionIds[index]} id={descriptionIds[index]}>
          {disabledReasonLabel}
        </span>
      ))}
    </>
  );
}
