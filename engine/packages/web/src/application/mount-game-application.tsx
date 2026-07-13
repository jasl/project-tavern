// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { webStylesLoadedV1 } from "../styles-entry.js";

void webStylesLoadedV1;

export interface MountedGameApplicationV1 {
  unmount(): void;
}

export function mountGameApplicationV1(
  container: Element,
  application: ReactNode,
): MountedGameApplicationV1 {
  const root = createRoot(container);
  root.render(application);
  return Object.freeze({ unmount: () => root.unmount() });
}
