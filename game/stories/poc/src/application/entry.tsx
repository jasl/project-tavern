// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestCanonical, resolveGamePackageV1 } from "@sillymaker/base";
import type { BuildProvenanceV1, GameHostV1 } from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import { createWebHostV1, mountGameApplicationV1 } from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  MountedGameApplicationV1,
  ResolvedGameHmrHotAdapterV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";
import type { ReactElement } from "react";

import { pocBuildIdentityV1 } from "virtual:project-tavern/poc-build-identity";
import { pocStoryEntryV1 } from "../story-definition.js";
import {
  createPocPresentationRuntimeV1,
  type PocPresentationRuntimeV1,
} from "./create-poc-presentation-runtime.js";
import { installPocHmrV1, type PocHmrMountedApplicationV1 } from "./install-poc-hmr.js";
import { PocApplicationRootV1 } from "./poc-application-root.js";

export interface PocApplicationCompositionV1 {
  readonly runtime: PocPresentationRuntimeV1;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;
  readonly capabilitySearch: string;
  readonly rootElement: ReactElement;
}

type PocMountedApplicationV1 = PocHmrMountedApplicationV1<PocApplicationCompositionV1>;

interface PocPageLifetimeOwnerV1 {
  current: PocMountedApplicationV1;
  disposed: boolean;
}

export interface PocEntryHmrModuleV1 {
  resolvePocHmrProvenanceV1(): BuildProvenanceV1;
  createPocApplicationCompositionV1: typeof createPocApplicationCompositionV1;
  installPocApplicationHmrV1(input: {
    readonly state: PocMountedApplicationV1;
    readonly lifetime: PocPageLifetimeOwnerV1;
  }): InstalledResolvedGameHmrV1;
}

type PocEntryHmrHandlerV1 = (module: PocEntryHmrModuleV1 | undefined) => void;
const acceptedPocEntryModuleHandlerKeyV1 = "projectTavernPocAcceptedModuleHandlerV1";
const nativeEntryHotV1 = import.meta.hot;
const entryHotV1:
  | (ResolvedGameHmrHotAdapterV1<PocEntryHmrModuleV1> & {
      readonly data: Record<string, unknown>;
    })
  | undefined =
  nativeEntryHotV1 === undefined
    ? undefined
    : Object.freeze({
        data: nativeEntryHotV1.data as Record<string, unknown>,
        accept(handler: PocEntryHmrHandlerV1) {
          nativeEntryHotV1.data[acceptedPocEntryModuleHandlerKeyV1] = handler;
        },
      });

if (import.meta.hot !== undefined) {
  import.meta.hot.accept((module) => {
    const handler = import.meta.hot?.data[acceptedPocEntryModuleHandlerKeyV1];
    if (typeof handler === "function") {
      (handler as PocEntryHmrHandlerV1)(module as unknown as PocEntryHmrModuleV1 | undefined);
    }
  });
}

const hmrInitializationKeyV1 = "projectTavernPocApplicationInitializedV1";

function browserCapabilitySearchV1(): string {
  return typeof location === "undefined" ? "" : location.search;
}

export async function createPocApplicationCompositionV1(input: {
  readonly host: GameHostV1;
  readonly pointerTarget: HTMLElement;
  readonly capabilitySearch?: string;
  readonly rebootstrapDisposition?: PersistenceRebootstrapDisposalV1;
  onConstructionFailureDisposition?(disposition: PersistenceRebootstrapDisposalV1): void;
}): Promise<PocApplicationCompositionV1> {
  let lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
  const capabilitySearch = input.capabilitySearch ?? browserCapabilitySearchV1();
  const runtime = await createPocPresentationRuntimeV1({
    host: input.host,
    buildIdentity: pocBuildIdentityV1,
    appBuildId: digestCanonical("sillymaker:application:v1", pocBuildIdentityV1.application),
    pointerTarget: input.pointerTarget,
    capabilitySearch,
    ...(input.rebootstrapDisposition === undefined
      ? {}
      : { rebootstrapDisposition: input.rebootstrapDisposition }),
    ...(input.onConstructionFailureDisposition === undefined
      ? {}
      : { onConstructionFailureDisposition: input.onConstructionFailureDisposition }),
    onRebootstrapLifecycle(value) {
      lifecycle = value;
    },
  });
  if (lifecycle === undefined) {
    runtime.dispose();
    throw new TypeError("PoC runtime did not register its HMR lifecycle");
  }
  return Object.freeze({
    runtime,
    lifecycle,
    capabilitySearch,
    rootElement: <PocApplicationRootV1 runtime={runtime} />,
  });
}

export function resolvePocHmrProvenanceV1(): BuildProvenanceV1 {
  const result = resolveGamePackageV1(pocStoryEntryV1, [], pocBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(`PoC HMR resolution failed: ${result.failure.code}`);
  }
  return result.resolved.provenance;
}

function mountPocCompositionV1(
  root: Element,
  host: GameHostV1,
  composition: PocApplicationCompositionV1,
): PocMountedApplicationV1 {
  let mounted: MountedGameApplicationV1;
  try {
    mounted = mountGameApplicationV1(root, composition.rootElement);
  } catch (error) {
    composition.runtime.dispose();
    throw error;
  }
  let unmounted = false;
  const ownedMounted = Object.freeze({
    unmount(): void {
      if (unmounted) return;
      unmounted = true;
      try {
        mounted.unmount();
      } finally {
        composition.runtime.dispose();
      }
    },
  }) satisfies MountedGameApplicationV1;
  return Object.freeze({ root, host, composition, mounted: ownedMounted });
}

export function installPocApplicationHmrV1(input: {
  readonly state: PocMountedApplicationV1;
  readonly lifetime: PocPageLifetimeOwnerV1;
  readonly hot?: ResolvedGameHmrHotAdapterV1<PocEntryHmrModuleV1>;
}): InstalledResolvedGameHmrV1 {
  return installPocHmrV1({
    state: input.state,
    hot: input.hot ?? entryHotV1,
    resolveAcceptedProvenance: (module) => module.resolvePocHmrProvenanceV1(),
    createSuccessor: async ({
      module,
      host,
      root,
      disposition,
      onConstructionFailureDisposition,
    }) => {
      if (!(root instanceof HTMLElement)) throw new TypeError("invalid PoC application root");
      return await module.createPocApplicationCompositionV1({
        host,
        pointerTarget: root,
        capabilitySearch: input.state.composition.capabilitySearch,
        rebootstrapDisposition: disposition,
        onConstructionFailureDisposition,
      });
    },
    mountSuccessor: ({ root, host, composition }) => mountPocCompositionV1(root, host, composition),
    installNextBoundary: ({ module, state }) =>
      module.installPocApplicationHmrV1({ state, lifetime: input.lifetime }),
    onSuccessorMounted(state) {
      if (input.lifetime.disposed) {
        try {
          state.composition.lifecycle.invalidationController.invalidateForHmr();
        } catch {
          // DOM teardown and persistence release remain mandatory after invalidation failure.
        }
        try {
          state.mounted.unmount();
        } catch {
          // Persistence release below remains mandatory after a DOM teardown failure.
        }
        void state.composition.lifecycle.disposeForRebootstrap().catch(() => {
          // Page teardown is already terminal; release remains best effort.
        });
        return;
      }
      input.lifetime.current = state;
    },
  });
}

function claimPocApplicationInitializationV1(): boolean {
  if (entryHotV1 === undefined) return true;
  if (entryHotV1.data[hmrInitializationKeyV1] === true) return false;
  entryHotV1.data[hmrInitializationKeyV1] = true;
  return true;
}

export async function startPocApplicationV1(): Promise<() => void> {
  const root = document.querySelector("#root");
  if (!(root instanceof HTMLElement)) throw new TypeError("missing PoC application root");

  const host = createWebHostV1({ databaseName: "project-tavern.runtime" });
  const composition = await createPocApplicationCompositionV1({
    host,
    pointerTarget: root,
    capabilitySearch: browserCapabilitySearchV1(),
  });
  const state = mountPocCompositionV1(root, host, composition);
  const lifetime: PocPageLifetimeOwnerV1 = { current: state, disposed: false };
  installPocApplicationHmrV1({ state, lifetime });

  const dispose = (): void => {
    if (lifetime.disposed) return;
    lifetime.disposed = true;
    globalThis.removeEventListener("pagehide", dispose);
    lifetime.current.mounted.unmount();
  };
  try {
    globalThis.addEventListener("pagehide", dispose, { once: true });
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}

if (typeof document !== "undefined" && claimPocApplicationInitializationV1()) {
  await startPocApplicationV1();
}
