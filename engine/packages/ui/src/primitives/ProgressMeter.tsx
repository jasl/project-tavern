// SPDX-License-Identifier: MIT
import type { ComponentPropsWithRef, ReactElement } from "react";

type NativeProgressPropsV1 = Omit<
  ComponentPropsWithRef<"progress">,
  | "aria-label"
  | "aria-valuemax"
  | "aria-valuemin"
  | "aria-valuenow"
  | "aria-valuetext"
  | "max"
  | "value"
>;

export type ProgressMeterPropsV1 = NativeProgressPropsV1 & {
  readonly accessibleName: string;
  readonly value: number;
  readonly max: number;
  readonly valueText?: string;
};

function mergeClassNameV1(base: string, className: string | undefined): string {
  return className === undefined || className.length === 0 ? base : `${base} ${className}`;
}

export function ProgressMeter({
  accessibleName,
  value,
  max,
  valueText,
  className,
  ...props
}: ProgressMeterPropsV1): ReactElement {
  if (typeof accessibleName !== "string" || accessibleName.trim().length === 0) {
    throw new TypeError("ui.progress_meter_accessible_name_missing");
  }
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value < 0 || value > max) {
    throw new RangeError("ui.progress_meter_range_invalid");
  }
  if (valueText !== undefined && (typeof valueText !== "string" || valueText.trim().length === 0)) {
    throw new TypeError("ui.progress_meter_value_text_invalid");
  }

  return (
    <progress
      {...props}
      className={mergeClassNameV1("silly-progress-meter", className)}
      aria-label={accessibleName}
      aria-valuemin={0}
      aria-valuenow={value}
      aria-valuemax={max}
      {...(valueText === undefined ? {} : { "aria-valuetext": valueText })}
      value={value}
      max={max}
    />
  );
}
