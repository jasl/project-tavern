// SPDX-License-Identifier: MIT
import type { ButtonPropsV1 } from "../primitives/Button.js";
import { Button } from "../primitives/Button.js";
import type { ReactElement } from "react";
import { useSystemDialogControllerV1 } from "./system-dialog-host.js";

export type SettingsLauncherPropsV1 = Omit<
  ButtonPropsV1,
  "aria-label" | "aria-labelledby" | "children" | "onClick" | "type"
> & {
  readonly label: string;
};

export function SettingsLauncherV1({ label, ...props }: SettingsLauncherPropsV1): ReactElement {
  const controller = useSystemDialogControllerV1();
  return (
    <Button {...props} onClick={(event) => controller.openSettings(event.currentTarget)}>
      {label}
    </Button>
  );
}
