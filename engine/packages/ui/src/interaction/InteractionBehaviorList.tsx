// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  InteractionActivationV1,
  InteractionBehaviorId,
  InteractionSurfaceId,
  InteractionTargetId,
  TextId,
} from "@sillymaker/base";
import { useId, useLayoutEffect, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.js";
import type { InputRouterV1 } from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import { useStageInputIsolationV1 } from "../shell/game-stage.js";
import type {
  InteractionDescriptorPresentationV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";
import type { InteractionSessionStoreV1 } from "./interaction-session-store.js";
import styles from "./InteractionSurface.module.css";

export interface InteractionBehaviorControllerV1 {
  activate(activation: DeepReadonly<InteractionActivationV1>): Promise<unknown>;
  activateBehavior(
    activation: DeepReadonly<InteractionActivationV1>,
    behaviorId: InteractionBehaviorId,
  ): Promise<unknown>;
}

export interface InteractionBehaviorListPropsV1<
  TDescriptor,
  TReason,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
> {
  readonly surface: RuntimeInteractionSurfaceV1<NoInfer<TDescriptor>, unknown>;
  readonly session: InteractionSessionStoreV1;
  readonly controller: InteractionBehaviorControllerV1;
  readonly presentation: PresentationReadPortV1<
    TextId,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >;
  readonly descriptorPresentation: InteractionDescriptorPresentationV1<TDescriptor, TReason>;
  readonly leaveTextId: TextId;
  readonly inputRouter: InputRouterV1;
}

interface BehaviorControlPropsV1<
  TDescriptor,
  TReason,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
> {
  readonly surfaceId: InteractionSurfaceId;
  readonly targetId: InteractionTargetId;
  readonly behavior: RuntimeInteractionBehaviorV1<TDescriptor, unknown>;
  readonly controller: InteractionBehaviorControllerV1;
  readonly presentation: PresentationReadPortV1<
    TextId,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >;
  readonly descriptorPresentation: InteractionDescriptorPresentationV1<TDescriptor, TReason>;
  readonly reasonIds?: readonly string[];
}

function targetActivationV1(
  surfaceId: InteractionSurfaceId,
  targetId: InteractionTargetId,
): DeepReadonly<InteractionActivationV1> {
  return Object.freeze({ surfaceId, targetId, activationKind: "semantic_control" as const });
}

export function interactionTargetControlIdV1(
  surfaceId: InteractionSurfaceId,
  targetId: InteractionTargetId,
): string {
  return `interaction-target--${surfaceId}--${targetId}`;
}

function restoreFocusByIdV1(id: string | null): void {
  if (id === null || typeof document === "undefined") return;
  queueMicrotask(() => {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement) || !element.isConnected) return;
    const activeElement = document.activeElement;
    if (activeElement !== null && activeElement !== document.body && activeElement !== element) {
      return;
    }
    element.focus({ preventScroll: true });
  });
}

function BehaviorControlV1<TDescriptor, TReason, TAssetId, TAssetUsage, TLocaleId, TFallbackToken>(
  props: BehaviorControlPropsV1<
    TDescriptor,
    TReason,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >,
): ReactElement {
  const descriptionPrefix = useId();
  const description =
    props.behavior.descriptionTextId === null
      ? null
      : props.presentation.text(props.behavior.descriptionTextId).text;
  const semanticRoute =
    props.behavior.route.kind === "presentation_intent" ? null : props.behavior.route;
  const enabled =
    semanticRoute === null ? true : props.descriptorPresentation.enabled(semanticRoute.descriptor);
  const reasons =
    semanticRoute === null
      ? Object.freeze([] as const)
      : props.descriptorPresentation.reasons(semanticRoute.descriptor);
  const descriptionId = description === null ? null : `${descriptionPrefix}-description`;
  const reasonIds =
    props.reasonIds ?? reasons.map((_reason, index) => `${descriptionPrefix}-reason-${index}`);
  const describedBy = [descriptionId, ...reasonIds].filter((id): id is string => id !== null);
  const activation = targetActivationV1(props.surfaceId, props.targetId);

  return (
    <li className={styles["interaction-behavior-list__behavior"]}>
      <Button
        className={styles["interaction-behavior-list__control"]}
        disabled={!enabled}
        aria-describedby={describedBy.length === 0 ? undefined : describedBy.join(" ")}
        data-interaction-surface-id={props.surfaceId}
        data-interaction-target-id={props.targetId}
        data-interaction-behavior-id={props.behavior.behaviorId}
        data-semantic-action-id={
          semanticRoute === null
            ? undefined
            : props.descriptorPresentation.actionId(semanticRoute.descriptor)
        }
        onClick={() =>
          void props.controller.activateBehavior(activation, props.behavior.behaviorId)
        }
      >
        {props.presentation.text(props.behavior.nameTextId).text}
      </Button>
      {description === null ? null : (
        <p id={descriptionId ?? undefined} className={styles["interaction-behavior-list__detail"]}>
          {description}
        </p>
      )}
      {reasons.length === 0 ? null : (
        <ul className={styles["interaction-behavior-list__reasons"]}>
          {reasons.map((reason, index) => (
            <li key={reasonIds[index]} id={reasonIds[index]}>
              {props.presentation.text(props.descriptorPresentation.reasonTextId(reason)).text}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function TargetControlsV1<
  TDescriptor,
  TReason,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
>(props: {
  readonly surfaceId: InteractionSurfaceId;
  readonly target: RuntimeInteractionTargetV1<TDescriptor, unknown>;
  readonly showBehaviors: boolean;
  readonly controller: InteractionBehaviorControllerV1;
  readonly presentation: PresentationReadPortV1<
    TextId,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >;
  readonly descriptorPresentation: InteractionDescriptorPresentationV1<TDescriptor, TReason>;
}): ReactElement {
  const activation = targetActivationV1(props.surfaceId, props.target.targetId);
  const directDefaultBehavior =
    props.target.resolutionMode === "direct"
      ? (props.target.behaviors.find((behavior) => behavior.isDefault) ?? null)
      : null;
  const directSemanticRoute =
    directDefaultBehavior === null || directDefaultBehavior.route.kind === "presentation_intent"
      ? null
      : directDefaultBehavior.route;
  const directEnabled =
    props.target.resolutionMode !== "direct"
      ? true
      : directDefaultBehavior !== null &&
        (directSemanticRoute === null ||
          props.descriptorPresentation.enabled(directSemanticRoute.descriptor));
  const directReasons =
    directSemanticRoute === null
      ? Object.freeze([] as const)
      : props.descriptorPresentation.reasons(directSemanticRoute.descriptor);
  const directReasonPrefix = useId();
  const directReasonIds = directReasons.map(
    (_reason, index) => `${directReasonPrefix}-reason-${index}`,
  );
  return (
    <li className={styles["interaction-behavior-list__target"]}>
      <Button
        id={interactionTargetControlIdV1(props.surfaceId, props.target.targetId)}
        className={styles["interaction-behavior-list__target-control"]}
        disabled={!directEnabled}
        aria-describedby={directReasonIds.length === 0 ? undefined : directReasonIds.join(" ")}
        data-interaction-surface-id={props.surfaceId}
        data-interaction-target-id={props.target.targetId}
        data-semantic-action-id={
          directSemanticRoute === null
            ? undefined
            : props.descriptorPresentation.actionId(directSemanticRoute.descriptor)
        }
        onClick={() => void props.controller.activate(activation)}
      >
        {props.presentation.text(props.target.accessibleNameTextId).text}
      </Button>
      {!props.showBehaviors || props.target.behaviors.length === 0 ? null : (
        <ul className={styles["interaction-behavior-list__behaviors"]}>
          {props.target.behaviors.map((behavior) => (
            <BehaviorControlV1
              key={behavior.behaviorId}
              surfaceId={props.surfaceId}
              targetId={props.target.targetId}
              behavior={behavior}
              controller={props.controller}
              presentation={props.presentation}
              descriptorPresentation={props.descriptorPresentation}
              {...(behavior === directDefaultBehavior ? { reasonIds: directReasonIds } : {})}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function InteractionBehaviorListV1<
  TDescriptor,
  TReason,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
>(
  props: InteractionBehaviorListPropsV1<
    TDescriptor,
    TReason,
    TAssetId,
    TAssetUsage,
    TLocaleId,
    TFallbackToken
  >,
): ReactElement | null {
  const sessionState = useSyncExternalStore(
    props.session.subscribe,
    props.session.getSnapshot,
    props.session.getSnapshot,
  );
  const isActive = sessionState.activeSurfaceId === props.surface.surfaceId;

  useStageInputIsolationV1("interaction", isActive);

  useLayoutEffect(() => {
    if (!isActive) return undefined;
    return props.inputRouter.register({
      context: "interaction",
      handle(event) {
        if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
          restoreFocusByIdV1(props.session.leave());
          return inputHandledV1;
        }
        if (event.kind === "pointer_cancel") {
          props.session.cleanup("pointer_cancel");
          return inputIgnoredV1;
        }
        if (event.kind === "focus_loss") {
          props.session.cleanup("focus_loss");
          return inputIgnoredV1;
        }
        if (event.kind === "action" || event.kind === "viewport_point") {
          return inputHandledV1;
        }
        return inputIgnoredV1;
      },
    });
  }, [isActive, props.inputRouter, props.session]);

  if (sessionState.activeSurfaceId !== null && !isActive) return null;

  const targetControls = (
    <ul className={styles["interaction-behavior-list__targets"]}>
      {props.surface.targets.map((target) => (
        <TargetControlsV1
          key={target.targetId}
          surfaceId={props.surface.surfaceId}
          target={target}
          showBehaviors={
            target.resolutionMode === "direct" ||
            (isActive &&
              target.resolutionMode === "choose" &&
              sessionState.choosingTargetId === target.targetId)
          }
          controller={props.controller}
          presentation={props.presentation}
          descriptorPresentation={props.descriptorPresentation}
        />
      ))}
    </ul>
  );

  if (!isActive) {
    return (
      <nav
        className={styles["interaction-behavior-list__entry"]}
        aria-label={props.presentation.text(props.surface.accessibleNameTextId).text}
      >
        {targetControls}
      </nav>
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    props.inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel });
  };

  return (
    <section
      className={styles["interaction-behavior-list"]}
      role="region"
      aria-label={props.presentation.text(props.surface.accessibleNameTextId).text}
      onKeyDown={onKeyDown}
    >
      <div className={styles["interaction-behavior-list__header"]}>
        <Button
          autoFocus
          className={styles["interaction-behavior-list__leave"]}
          onClick={() => restoreFocusByIdV1(props.session.leave())}
        >
          {props.presentation.text(props.leaveTextId).text}
        </Button>
      </div>
      {targetControls}
    </section>
  );
}
