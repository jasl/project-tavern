// SPDX-License-Identifier: MIT
import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";

export type IconButtonPropsV1 = Omit<ComponentPropsWithRef<"button">, "aria-label" | "children"> & {
  readonly accessibleName: string;
  readonly children: ReactNode;
};

function mergeClassNameV1(base: string, className: string | undefined): string {
  return className === undefined || className.length === 0 ? base : `${base} ${className}`;
}

export function IconButton({
  accessibleName,
  children,
  className,
  type = "button",
  ...props
}: IconButtonPropsV1): ReactElement {
  if (typeof accessibleName !== "string" || accessibleName.trim().length === 0) {
    throw new TypeError("ui.icon_button_accessible_name_missing");
  }

  return (
    <button
      {...props}
      type={type}
      className={mergeClassNameV1("silly-icon-button", className)}
      aria-label={accessibleName}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
