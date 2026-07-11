// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
export function DevelopmentPanel({ children }: { readonly children?: ReactNode }) {
  return <aside aria-label="开发工具">{children ?? "开发工具"}</aside>;
}
