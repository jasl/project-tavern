// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestCanonical } from "@sillymaker/base";
import type { GameHostV1 } from "@sillymaker/base";
import { createWebHostV1, mountGameApplicationV1 } from "@sillymaker/web";

import { pocBuildIdentityV1 } from "virtual:project-tavern/poc-build-identity";
import {
  createPocPresentationRuntimeV1,
  type PocPresentationRuntimeV1,
} from "./create-poc-presentation-runtime.js";
import { PocApplicationRootV1 } from "./poc-application-root.js";

export interface PocApplicationCompositionV1 {
  readonly runtime: PocPresentationRuntimeV1;
}

export async function createPocApplicationCompositionV1(input: {
  readonly host: GameHostV1;
  readonly pointerTarget: HTMLElement;
}): Promise<PocApplicationCompositionV1> {
  const runtime = await createPocPresentationRuntimeV1({
    host: input.host,
    buildIdentity: pocBuildIdentityV1,
    appBuildId: digestCanonical("sillymaker:application:v1", pocBuildIdentityV1.application),
    pointerTarget: input.pointerTarget,
  });
  return Object.freeze({ runtime });
}

export async function startPocApplicationV1(): Promise<() => void> {
  const root = document.querySelector("#root");
  if (!(root instanceof HTMLElement)) throw new TypeError("missing PoC application root");

  const host = createWebHostV1({ databaseName: "project-tavern.runtime" });
  const composition = await createPocApplicationCompositionV1({ host, pointerTarget: root });
  let mounted: ReturnType<typeof mountGameApplicationV1>;
  try {
    mounted = mountGameApplicationV1(root, <PocApplicationRootV1 runtime={composition.runtime} />);
  } catch (error) {
    composition.runtime.dispose();
    throw error;
  }
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    globalThis.removeEventListener("pagehide", dispose);
    try {
      mounted.unmount();
    } finally {
      composition.runtime.dispose();
    }
  };
  try {
    globalThis.addEventListener("pagehide", dispose, { once: true });
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}

if (typeof document !== "undefined") {
  await startPocApplicationV1();
}
