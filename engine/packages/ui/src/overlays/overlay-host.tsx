// SPDX-License-Identifier: MIT
import * as Dialog from "@radix-ui/react-dialog";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement, ReactNode } from "react";
import type { DeepReadonly } from "@sillymaker/base";
import {
  isDevDockEscapeOwnerTargetV1,
  useDevDockPortalTargetRegistrationV1,
} from "../debug/DevDockPortalCoordinator.js";
import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.js";
import type { InputEventV1, InputRouterV1 } from "../input/contracts.js";
import { Button } from "../primitives/Button.js";
import { useStageInputIsolationV1 } from "../shell/game-stage.js";
import type { OverlaySessionStoreV1 } from "./overlay-session-store.js";
import styles from "./overlay-host.module.css";

export interface OverlayRendererResolutionV1 {
  readonly accessibleName: string;
  readonly content: ReactNode;
}

export interface OverlayRendererResolverV1<TOverlayId> {
  resolve(id: DeepReadonly<TOverlayId>): OverlayRendererResolutionV1 | null;
}

export interface OverlayHostPropsV1<TOverlayId> {
  readonly store: OverlaySessionStoreV1<TOverlayId>;
  readonly rendererResolver: OverlayRendererResolverV1<TOverlayId>;
  readonly inputRouter: InputRouterV1;
  readonly closeLabel: string;
}

interface ResolvedOverlayEntryV1 {
  readonly kind: "primary" | "detail";
  readonly depth: number;
  readonly resolution: OverlayRendererResolutionV1;
}

function readReturnFocusTargetV1(): HTMLElement | null {
  if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body
    ? activeElement
    : null;
}

function restoreOwnedFocusV1(
  target: HTMLElement | null | undefined,
  host: HTMLDivElement | null,
): void {
  if (target?.isConnected !== true || typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (
    activeElement !== null &&
    activeElement !== document.body &&
    (host === null || !host.contains(activeElement))
  ) {
    return;
  }
  target.focus({ preventScroll: true });
}

function resolveEntryV1<TOverlayId>(
  rendererResolver: OverlayRendererResolverV1<TOverlayId>,
  id: DeepReadonly<TOverlayId>,
  kind: "primary" | "detail",
  depth: number,
): ResolvedOverlayEntryV1 {
  const resolution = rendererResolver.resolve(id);
  if (resolution === null || resolution === undefined) {
    throw new TypeError("ui.overlay_renderer_missing");
  }
  return Object.freeze({
    kind,
    depth,
    resolution: Object.freeze({
      accessibleName: resolution.accessibleName,
      content: resolution.content,
    }),
  });
}

function handleOverlayInputV1<TOverlayId>(
  event: DeepReadonly<InputEventV1>,
  store: OverlaySessionStoreV1<TOverlayId>,
) {
  switch (event.kind) {
    case "action":
      if (event.actionId === systemInputActionIdsV1.cancel) store.closeTop();
      return inputHandledV1;
    case "viewport_point":
      return inputHandledV1;
    case "pointer_cancel":
    case "focus_loss":
      return inputIgnoredV1;
  }
  return inputIgnoredV1;
}

function OverlayDialogEntryV1(props: {
  readonly entry: ResolvedOverlayEntryV1;
  readonly topDepth: number;
  readonly portalContainer: HTMLDivElement;
  readonly closeTop: () => void;
  readonly closeLabel: string;
}): ReactElement {
  const isTop = props.entry.depth === props.topDepth;
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  useDevDockPortalTargetRegistrationV1("overlay", isTop ? contentElement : null);
  const requestTopCloseV1 = (): void => {
    if (isTop) props.closeTop();
  };

  return (
    <Dialog.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) requestTopCloseV1();
      }}
    >
      <Dialog.Portal container={props.portalContainer}>
        <div
          className={styles["overlay-host__layer"]}
          data-overlay-layer={props.entry.kind}
          data-overlay-depth={props.entry.depth}
          inert={!isTop}
        >
          <div className={styles["overlay-host__backdrop"]} aria-hidden="true" />
          <Dialog.Content
            ref={setContentElement}
            className={styles["overlay-host__content"]}
            aria-describedby={undefined}
            data-blocking-focus-scope={isTop ? "overlay" : undefined}
            data-overlay-kind={props.entry.kind}
            data-overlay-depth={props.entry.depth}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              if (!isDevDockEscapeOwnerTargetV1(event.target)) requestTopCloseV1();
            }}
            onInteractOutside={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <Dialog.Title className={styles["overlay-host__title"]}>
              {props.entry.resolution.accessibleName}
            </Dialog.Title>
            {props.entry.resolution.content}
            {isTop ? <Button onClick={requestTopCloseV1}>{props.closeLabel}</Button> : null}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function OverlayHostV1<TOverlayId>(props: OverlayHostPropsV1<TOverlayId>): ReactElement {
  const initialSnapshotRef = useRef(props.store.getSnapshot());
  const returnFocusTargetsRef = useRef<readonly (HTMLElement | null)[]>(
    initialSnapshotRef.current.primaryId === null
      ? Object.freeze([])
      : Object.freeze([readReturnFocusTargetV1()]),
  );
  const subscribe = useCallback(
    (listener: () => void) => {
      let previous = props.store.getSnapshot();
      return props.store.subscribe(() => {
        const next = props.store.getSnapshot();
        if (previous.primaryId === null && next.primaryId !== null) {
          returnFocusTargetsRef.current = Object.freeze([readReturnFocusTargetV1()]);
        } else if (previous.primaryId !== null && next.primaryId !== null) {
          if (!Object.is(previous.primaryId, next.primaryId)) {
            returnFocusTargetsRef.current = Object.freeze([
              returnFocusTargetsRef.current[0] ?? null,
            ]);
          } else if (next.detailIds.length > previous.detailIds.length) {
            const target = readReturnFocusTargetV1();
            const targets = returnFocusTargetsRef.current.slice(0, previous.detailIds.length + 1);
            for (
              let depth = previous.detailIds.length + 1;
              depth <= next.detailIds.length;
              depth += 1
            ) {
              targets[depth] = target;
            }
            returnFocusTargetsRef.current = Object.freeze(targets);
          }
        }
        previous = next;
        listener();
      });
    },
    [props.store],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    props.store.getSnapshot,
    props.store.getSnapshot,
  );
  const active = snapshot.primaryId !== null;
  const previousSnapshotRef = useRef(snapshot);
  const latestSnapshotRef = useRef(snapshot);
  latestSnapshotRef.current = snapshot;
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setHostElement = useCallback((element: HTMLDivElement | null): void => {
    if (element !== null) hostElementRef.current = element;
    setPortalContainer(element);
  }, []);

  useStageInputIsolationV1("overlay", active);

  useLayoutEffect(() => {
    if (!active) return undefined;
    return props.inputRouter.register({
      context: "overlay",
      handle: (event) => handleOverlayInputV1(event, props.store),
    });
  }, [active, props.inputRouter, props.store]);

  useLayoutEffect(() => {
    const previous = previousSnapshotRef.current;
    if (previous.primaryId !== null && snapshot.primaryId === null) {
      const target = returnFocusTargetsRef.current[0];
      returnFocusTargetsRef.current = Object.freeze([]);
      restoreOwnedFocusV1(target, hostElementRef.current);
    } else if (
      previous.primaryId !== null &&
      snapshot.primaryId !== null &&
      Object.is(previous.primaryId, snapshot.primaryId) &&
      snapshot.detailIds.length < previous.detailIds.length
    ) {
      const target = returnFocusTargetsRef.current[snapshot.detailIds.length + 1];
      returnFocusTargetsRef.current = Object.freeze(
        returnFocusTargetsRef.current.slice(0, snapshot.detailIds.length + 1),
      );
      restoreOwnedFocusV1(target, hostElementRef.current);
    }
    previousSnapshotRef.current = snapshot;
  }, [snapshot]);

  useLayoutEffect(
    () => () => {
      if (latestSnapshotRef.current.primaryId === null) return;
      restoreOwnedFocusV1(returnFocusTargetsRef.current[0], hostElementRef.current);
      returnFocusTargetsRef.current = Object.freeze([]);
    },
    [],
  );

  const entries = useMemo(() => {
    if (snapshot.primaryId === null) return Object.freeze([]) as readonly ResolvedOverlayEntryV1[];
    return Object.freeze([
      resolveEntryV1(props.rendererResolver, snapshot.primaryId, "primary", 0),
      ...snapshot.detailIds.map((id, index) =>
        resolveEntryV1(props.rendererResolver, id, "detail", index + 1),
      ),
    ]);
  }, [props.rendererResolver, snapshot]);

  return (
    <div
      ref={setHostElement}
      className={styles["overlay-host"]}
      data-testid="overlay-host"
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {portalContainer === null
        ? null
        : entries.map((entry) => (
            <OverlayDialogEntryV1
              key={`${entry.kind}:${entry.depth}`}
              entry={entry}
              topDepth={entries.length - 1}
              portalContainer={portalContainer}
              closeTop={() => props.store.closeTop()}
              closeLabel={props.closeLabel}
            />
          ))}
    </div>
  );
}
