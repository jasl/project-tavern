// SPDX-License-Identifier: MIT
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  isDevDockEscapeOwnerTargetV1,
  useDevDockPortalTargetRegistrationV1,
} from "../debug/DevDockPortalCoordinator.js";
import {
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.js";
import { Button } from "../primitives/Button.js";
import styles from "../overlays/overlay-host.module.css";

export interface SettingsDialogPropsV1 {
  readonly title: string;
  readonly closeLabel: string;
  readonly sections: readonly ReactNode[];
  readonly emptyText: string;
  readonly onClose: () => void;
}

export function SettingsDialogContentV1(
  props: Omit<SettingsDialogPropsV1, "onClose">,
): ReactElement {
  return (
    <div data-settings-dialog-content="true">
      <DialogPrimitive.Title asChild>
        <h2>{props.title}</h2>
      </DialogPrimitive.Title>
      {props.sections.length === 0 ? (
        <p data-settings-empty="true">{props.emptyText}</p>
      ) : (
        <div data-settings-sections="true">
          {props.sections.map((section, index) => (
            <div key={index} data-settings-section={index} data-testid="settings-section">
              {section}
            </div>
          ))}
        </div>
      )}
      <DialogPrimitive.Close asChild>
        <Button autoFocus>{props.closeLabel}</Button>
      </DialogPrimitive.Close>
    </div>
  );
}

export function SettingsDialogV1(props: SettingsDialogPropsV1): ReactElement {
  const portalContainer = useStageSystemPortalContainerV1();
  const [focusScopeElement, setFocusScopeElement] = useState<HTMLDivElement | null>(null);
  useStageSystemFocusScopeRegistrationV1(focusScopeElement);
  useDevDockPortalTargetRegistrationV1("system", focusScopeElement);
  const position = portalContainer === null ? "fixed" : "absolute";

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && props.onClose()}>
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
          onEscapeKeyDown={(event) => {
            if (isDevDockEscapeOwnerTargetV1(event.target)) event.preventDefault();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <SettingsDialogContentV1 {...props} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
