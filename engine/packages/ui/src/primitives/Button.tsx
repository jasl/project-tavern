// SPDX-License-Identifier: MIT
import type { ComponentPropsWithRef, ReactElement } from "react";

export type ButtonPropsV1 = ComponentPropsWithRef<"button">;

function mergeClassNameV1(base: string, className: string | undefined): string {
  return className === undefined || className.length === 0 ? base : `${base} ${className}`;
}

export function Button({ className, type = "button", ...props }: ButtonPropsV1): ReactElement {
  return <button {...props} type={type} className={mergeClassNameV1("silly-button", className)} />;
}
