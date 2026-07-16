// SPDX-License-Identifier: MIT
import type { CSSProperties } from "react";

export interface CodeNativeAssetFallbackPropsV1<TFallbackToken, TAssetUsage> {
  readonly fallbackToken: TFallbackToken;
  readonly usage: TAssetUsage;
  readonly accessibleName: string;
  readonly decorative?: boolean;
}

const codeNativeFallbackStyleV1 = Object.freeze({
  alignItems: "center",
  background: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 6px)",
  border: "1px solid currentColor",
  boxSizing: "border-box",
  display: "inline-flex",
  justifyContent: "center",
  minBlockSize: "1em",
  minInlineSize: "1em",
  opacity: 1,
  pointerEvents: "none",
  userSelect: "none",
}) satisfies CSSProperties;

export function CodeNativeAssetFallbackV1<
  TFallbackToken extends string,
  TAssetUsage extends string,
>(props: CodeNativeAssetFallbackPropsV1<TFallbackToken, TAssetUsage>) {
  const decorative = props.decorative === true;
  if (!decorative && props.accessibleName.trim().length === 0) {
    throw new TypeError("asset.fallback_accessible_name_required");
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : props.accessibleName}
      aria-hidden={decorative ? true : undefined}
      data-asset-fallback-token={props.fallbackToken}
      data-asset-usage={props.usage}
      style={codeNativeFallbackStyleV1}
    >
      <span aria-hidden="true">◇</span>
    </span>
  );
}
