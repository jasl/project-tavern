// SPDX-License-Identifier: MIT
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import {
  inputHandledV1,
  inputIgnoredV1,
  systemInputActionIdsV1,
  type InputRouterV1,
} from "../input/contracts.js";
import styles from "../overlays/overlay-host.module.css";
import {
  useStageInputIsolationV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.js";
import { SettingsDialogContentV1 } from "./settings-dialog.js";
import type { SettingsDialogPropsV1 } from "./settings-dialog.js";

export type SystemDialogSettingsV1 = Omit<SettingsDialogPropsV1, "onClose">;

export interface SystemDialogHostPropsV1 {
  readonly inputRouter: InputRouterV1;
  readonly settings: SystemDialogSettingsV1;
  readonly children: ReactNode;
}

interface SystemDialogControllerV1 {
  openSettings(opener: HTMLButtonElement): void;
}

const SystemDialogContextV1 = createContext<SystemDialogControllerV1 | null>(null);

export function useSystemDialogControllerV1(): SystemDialogControllerV1 {
  const controller = useContext(SystemDialogContextV1);
  if (controller === null) throw new Error("ui.system_dialog_host_missing");
  return controller;
}

function focusConnectedElementV1(element: HTMLElement | null): void {
  if (element === null) return;
  queueMicrotask(() => {
    if (element.isConnected) element.focus();
  });
}

export function SystemDialogHostV1(props: SystemDialogHostPropsV1): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusScopeElement, setFocusScopeElement] = useState<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const portalContainer = useStageSystemPortalContainerV1();
  useStageInputIsolationV1("system", settingsOpen);
  useStageSystemFocusScopeRegistrationV1(focusScopeElement);

  const closeSettings = useCallback((): void => {
    setSettingsOpen(false);
    const opener = openerRef.current;
    openerRef.current = null;
    focusConnectedElementV1(opener);
  }, []);

  const openSettings = useCallback((opener: HTMLButtonElement): void => {
    openerRef.current = opener;
    setSettingsOpen(true);
  }, []);

  useLayoutEffect(
    () => () => {
      focusConnectedElementV1(openerRef.current);
      openerRef.current = null;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!settingsOpen) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle(event) {
        if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
          return inputIgnoredV1;
        }
        if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
          closeSettings();
        }
        return inputHandledV1;
      },
    });
  }, [closeSettings, props.inputRouter, settingsOpen]);

  const controller = useMemo(
    () => Object.freeze({ openSettings }) satisfies SystemDialogControllerV1,
    [openSettings],
  );
  const position = portalContainer === null ? "fixed" : "absolute";

  return (
    <SystemDialogContextV1.Provider value={controller}>
      <div data-system-dialog-host-content="true" inert={settingsOpen}>
        {props.children}
      </div>
      {settingsOpen ? (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && closeSettings()}>
          <DialogPrimitive.Portal container={portalContainer ?? undefined}>
            <DialogPrimitive.Overlay
              className={styles["blocking-dialog__backdrop"]}
              data-system-dialog-backdrop="settings"
              style={{ position }}
            />
            <DialogPrimitive.Content
              ref={setFocusScopeElement}
              className={styles["blocking-dialog__content"]}
              data-blocking-focus-scope="system"
              data-system-surface="settings"
              aria-describedby={undefined}
              style={{ position }}
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              <SettingsDialogContentV1 {...props.settings} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      ) : null}
    </SystemDialogContextV1.Provider>
  );
}
