// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestCanonical, resolveGamePackageV1 } from "@sillymaker/base";
import type { BuildProvenanceV1, GameHostV1 } from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import {
  createGameBootstrapControllerV1,
  createWebHostV1,
  installResolvedGameHmrV1,
  mountGameApplicationV1,
} from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  MountedGameApplicationV1,
  ResolvedGameHmrHotAdapterV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

import { e2eBuildIdentityV1 } from "virtual:project-tavern/e2e-build-identity";
import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import {
  createE2ePresentationRuntimeV1,
  type E2ePresentationBrowserEnvironmentV1,
  type E2ePresentationRuntimeV1,
} from "./create-e2e-presentation-runtime.js";
import { E2eApplicationRootV1 } from "./e2e-application-root.js";
import { e2eStoryEntryV1 } from "../index.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationCompositionV1 {
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly presentationRuntime: E2ePresentationRuntimeV1;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;
}

interface E2eMountedApplicationV1 {
  readonly root: Element;
  readonly host: GameHostV1;
  readonly composition: E2eApplicationCompositionV1;
  readonly mounted: MountedGameApplicationV1;
}

export interface E2eEntryHmrModuleV1 {
  resolveE2eHmrProvenanceV1(): BuildProvenanceV1;
  createE2eApplicationCompositionV1: typeof createE2eApplicationCompositionV1;
  installE2eApplicationHmrV1(input: {
    readonly state: E2eMountedApplicationV1;
  }): InstalledResolvedGameHmrV1;
}

interface E2eEntryHotAdapterV1 extends ResolvedGameHmrHotAdapterV1<E2eEntryHmrModuleV1> {
  readonly data: Record<string, unknown>;
}

declare global {
  interface ImportMeta {
    readonly hot?: E2eEntryHotAdapterV1;
  }
}

type E2eEntryHmrHandlerV1 = (module: E2eEntryHmrModuleV1 | undefined) => void;
const acceptedE2eEntryModuleHandlerKeyV1 = "projectTavernE2eAcceptedModuleHandlerV1";
const nativeEntryHotV1 = import.meta.hot;
const entryHotV1: E2eEntryHotAdapterV1 | undefined =
  nativeEntryHotV1 === undefined
    ? undefined
    : Object.freeze({
        data: nativeEntryHotV1.data,
        accept(handler: (module: E2eEntryHmrModuleV1 | undefined) => void) {
          nativeEntryHotV1.data[acceptedE2eEntryModuleHandlerKeyV1] = handler;
        },
      });

if (import.meta.hot !== undefined) {
  import.meta.hot.accept((module) => {
    const handler = import.meta.hot?.data[acceptedE2eEntryModuleHandlerKeyV1];
    if (typeof handler === "function") {
      (handler as E2eEntryHmrHandlerV1)(module);
    }
  });
}

const hmrInitializationKeyV1 = "projectTavernE2eApplicationInitializedV1";

function createE2ePresentationBrowserEnvironmentV1(
  root: Element,
): E2ePresentationBrowserEnvironmentV1 {
  if (!(root instanceof HTMLElement)) throw new TypeError("invalid E2e application root");
  return Object.freeze({
    pointerTarget: root,
    pointerWindow: window,
    pointerDocument: document,
    location: globalThis.location,
    hashEventTarget: globalThis,
    imageLoader: Object.freeze({
      resolveRuntimeUrl: (runtimePath: string) => new URL(runtimePath, document.baseURI).href,
      createImage: () => new Image(),
    }),
  });
}

function resolveDefaultE2ePresentationEnvironmentV1(): E2ePresentationBrowserEnvironmentV1 {
  const root = document.querySelector("#root");
  if (root === null) throw new TypeError("missing application root");
  return createE2ePresentationBrowserEnvironmentV1(root);
}

export async function createE2eApplicationCompositionV1(input: {
  readonly host: GameHostV1;
  readonly environment?: E2ePresentationBrowserEnvironmentV1;
  readonly rebootstrapDisposition?: PersistenceRebootstrapDisposalV1;
}): Promise<E2eApplicationCompositionV1> {
  const bootstrap = createGameBootstrapControllerV1({
    host: input.host,
    buildIdentity: e2eBuildIdentityV1,
  });
  const bootstrapped = await bootstrap(e2eStoryEntryV1, []);
  if (bootstrapped.kind !== "ready") {
    throw new TypeError(`E2e bootstrap failed: ${bootstrapped.code}`);
  }
  const appBuildId = digestCanonical("sillymaker:application:v1", e2eBuildIdentityV1.application);
  let lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
  const presentationRuntime = await createE2ePresentationRuntimeV1({
    resolved: bootstrapped.resolved,
    host: input.host,
    appBuildId,
    environment: input.environment ?? resolveDefaultE2ePresentationEnvironmentV1(),
    ...(input.rebootstrapDisposition === undefined
      ? {}
      : { rebootstrapDisposition: input.rebootstrapDisposition }),
    onRebootstrapLifecycle(value) {
      lifecycle = value;
    },
  });
  if (lifecycle === undefined) {
    presentationRuntime.dispose();
    throw new TypeError("E2e runtime did not register its HMR lifecycle");
  }
  return Object.freeze({
    resolvedGame: bootstrapped.resolved,
    application: presentationRuntime.application,
    presentationRuntime,
    lifecycle,
  });
}

export function resolveE2eHmrProvenanceV1(): BuildProvenanceV1 {
  const result = resolveGamePackageV1(e2eStoryEntryV1, [], e2eBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(`E2e HMR resolution failed: ${result.failure.code}`);
  }
  return result.resolved.provenance;
}

function mountE2eCompositionV1(
  root: Element,
  host: GameHostV1,
  composition: E2eApplicationCompositionV1,
): E2eMountedApplicationV1 {
  let mounted: MountedGameApplicationV1;
  try {
    mounted = mountGameApplicationV1(
      root,
      <E2eApplicationRootV1 runtime={composition.presentationRuntime} />,
    );
  } catch (error) {
    composition.presentationRuntime.dispose();
    throw error;
  }
  const ownedMounted = Object.freeze({
    unmount(): void {
      try {
        mounted.unmount();
      } finally {
        composition.presentationRuntime.dispose();
      }
    },
  }) satisfies MountedGameApplicationV1;
  return Object.freeze({ root, host, composition, mounted: ownedMounted });
}

export function installE2eApplicationHmrV1(input: {
  readonly state: E2eMountedApplicationV1;
  readonly hot?: ResolvedGameHmrHotAdapterV1<E2eEntryHmrModuleV1>;
  readonly mountComposition?: typeof mountE2eCompositionV1;
}): InstalledResolvedGameHmrV1 {
  const hot = input.hot ?? entryHotV1;
  const mountComposition = input.mountComposition ?? mountE2eCompositionV1;
  let originalUnmounted = false;
  let retryDisposition: PersistenceRebootstrapDisposalV1 | undefined;
  const unmountOriginalOnce = (): void => {
    if (originalUnmounted) return;
    input.state.mounted.unmount();
    originalUnmounted = true;
  };
  const clearRootBestEffort = (): void => {
    try {
      input.state.root.replaceChildren();
    } catch {
      // The owner lifecycle still has to be released when DOM cleanup itself fails.
    }
  };
  return installResolvedGameHmrV1<E2eEntryHmrModuleV1, PersistenceRebootstrapDisposalV1>({
    hot,
    currentProvenance: input.state.composition.resolvedGame.provenance,
    lifecycle: input.state.composition.lifecycle,
    resolveAcceptedProvenance(module) {
      if (module === undefined) throw new TypeError("accepted E2e HMR module is unavailable");
      return module.resolveE2eHmrProvenanceV1();
    },
    onAcceptedEqual(module) {
      if (module === undefined) throw new TypeError("accepted E2e HMR module is unavailable");
      module.installE2eApplicationHmrV1({ state: input.state });
    },
    async rebootstrap({ module, disposition }) {
      if (module === undefined) throw new TypeError("accepted E2e HMR module is unavailable");
      let composition: E2eApplicationCompositionV1 | undefined;
      let nextState: E2eMountedApplicationV1 | undefined;
      try {
        unmountOriginalOnce();
        composition = await module.createE2eApplicationCompositionV1({
          host: input.state.host,
          rebootstrapDisposition: retryDisposition ?? disposition,
        });
        nextState = mountComposition(input.state.root, input.state.host, composition);
        module.installE2eApplicationHmrV1({ state: nextState });
      } catch (error) {
        if (composition !== undefined) {
          try {
            composition.lifecycle.invalidationController.invalidateForHmr();
          } catch {
            // DOM and persistence cleanup below must continue after invalidation failure.
          }
        }
        if (nextState !== undefined) {
          try {
            nextState.mounted.unmount();
          } catch {
            // Root clearing and owner release below remain mandatory best-effort cleanup.
          }
        }
        clearRootBestEffort();
        if (composition !== undefined) {
          try {
            retryDisposition = await composition.lifecycle.disposeForRebootstrap();
          } catch {
            // Preserve the transition failure; disposal is already terminal best effort.
          }
        }
        throw error;
      }
    },
  });
}

function claimE2eApplicationInitializationV1(): boolean {
  if (entryHotV1 === undefined) return true;
  if (entryHotV1.data[hmrInitializationKeyV1] === true) return false;
  entryHotV1.data[hmrInitializationKeyV1] = true;
  return true;
}

async function startE2eApplicationV1(): Promise<void> {
  const root = document.querySelector("#root");
  if (root === null) throw new TypeError("missing application root");

  const host = createWebHostV1({ databaseName: "project-tavern.e2e.runtime" });
  const composition = await createE2eApplicationCompositionV1({
    host,
    environment: createE2ePresentationBrowserEnvironmentV1(root),
  });
  const state = mountE2eCompositionV1(root, host, composition);
  installE2eApplicationHmrV1({ state });
}

if (typeof document !== "undefined" && claimE2eApplicationInitializationV1()) {
  await startE2eApplicationV1();
}
