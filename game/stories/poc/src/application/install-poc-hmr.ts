// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { BuildProvenanceV1, DeepReadonly, GameHostV1 } from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import {
  installResolvedGameHmrV1,
  type InstalledResolvedGameHmrV1,
  type MountedGameApplicationV1,
  type ResolvedGameHmrHotAdapterV1,
  type WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

export interface PocHmrCompositionV1 {
  readonly runtime: Readonly<{
    readonly resolvedGame: Readonly<{
      readonly provenance: DeepReadonly<BuildProvenanceV1>;
    }>;
  }>;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;
}

export interface PocHmrMountedApplicationV1<
  TComposition extends PocHmrCompositionV1 = PocHmrCompositionV1,
> {
  readonly root: Element;
  readonly host: GameHostV1;
  readonly composition: TComposition;
  readonly mounted: MountedGameApplicationV1;
}

export interface PocHmrCreateSuccessorInputV1<TModule> {
  readonly module: TModule;
  readonly root: Element;
  readonly host: GameHostV1;
  readonly disposition: PersistenceRebootstrapDisposalV1;
  onConstructionFailureDisposition(disposition: PersistenceRebootstrapDisposalV1): void;
}

export interface PocHmrMountSuccessorInputV1<TComposition extends PocHmrCompositionV1> {
  readonly root: Element;
  readonly host: GameHostV1;
  readonly composition: TComposition;
}

export interface PocHmrNextBoundaryInputV1<TModule, TComposition extends PocHmrCompositionV1> {
  readonly module: TModule;
  readonly state: PocHmrMountedApplicationV1<TComposition>;
}

function requireAcceptedModuleV1<TModule>(module: TModule | undefined): TModule {
  if (module === undefined) throw new TypeError("accepted PoC HMR module is unavailable");
  return module;
}

/**
 * Owns one PoC self-accept boundary while delegating composition details to the entry module.
 * Replacement always reuses the original Host and DOM root; no debug evidence is exported.
 */
export function installPocHmrV1<TModule, TComposition extends PocHmrCompositionV1>(input: {
  readonly state: PocHmrMountedApplicationV1<TComposition>;
  readonly hot: ResolvedGameHmrHotAdapterV1<TModule> | undefined;
  resolveAcceptedProvenance(module: TModule): DeepReadonly<BuildProvenanceV1>;
  createSuccessor(input: PocHmrCreateSuccessorInputV1<TModule>): Promise<TComposition>;
  mountSuccessor(
    input: PocHmrMountSuccessorInputV1<TComposition>,
  ): PocHmrMountedApplicationV1<TComposition>;
  installNextBoundary(
    input: PocHmrNextBoundaryInputV1<TModule, TComposition>,
  ): InstalledResolvedGameHmrV1;
  onSuccessorMounted?(state: PocHmrMountedApplicationV1<TComposition>): void;
  reportFailure?(error: unknown): void;
}): InstalledResolvedGameHmrV1 {
  let originalUnmounted = false;
  let retryDisposition: PersistenceRebootstrapDisposalV1 | undefined;

  const unmountOriginalOnceV1 = (): void => {
    if (originalUnmounted) return;
    input.state.mounted.unmount();
    originalUnmounted = true;
  };

  const clearRootBestEffortV1 = (): void => {
    try {
      input.state.root.replaceChildren();
    } catch {
      // Owner fencing and release still have to complete if DOM cleanup fails.
    }
  };

  return installResolvedGameHmrV1<TModule, PersistenceRebootstrapDisposalV1>({
    hot: input.hot,
    currentProvenance: input.state.composition.runtime.resolvedGame.provenance,
    lifecycle: input.state.composition.lifecycle,
    resolveAcceptedProvenance(module) {
      return input.resolveAcceptedProvenance(requireAcceptedModuleV1(module));
    },
    onAcceptedEqual(module) {
      input.installNextBoundary(
        Object.freeze({
          module: requireAcceptedModuleV1(module),
          state: input.state,
        }),
      );
    },
    async rebootstrap({ module, disposition }) {
      const acceptedModule = requireAcceptedModuleV1(module);
      let composition: TComposition | undefined;
      let successor: PocHmrMountedApplicationV1<TComposition> | undefined;
      try {
        unmountOriginalOnceV1();
        composition = await input.createSuccessor(
          Object.freeze({
            module: acceptedModule,
            root: input.state.root,
            host: input.state.host,
            disposition: retryDisposition ?? disposition,
            onConstructionFailureDisposition(nextDisposition) {
              retryDisposition = nextDisposition;
            },
          }),
        );
        successor = input.mountSuccessor(
          Object.freeze({ root: input.state.root, host: input.state.host, composition }),
        );
        if (
          successor.root !== input.state.root ||
          successor.host !== input.state.host ||
          successor.composition !== composition
        ) {
          throw new TypeError("PoC HMR successor changed the stable application owner");
        }
        input.installNextBoundary(Object.freeze({ module: acceptedModule, state: successor }));
        input.onSuccessorMounted?.(successor);
      } catch (error) {
        if (composition !== undefined) {
          try {
            composition.lifecycle.invalidationController.invalidateForHmr();
          } catch {
            // Successor teardown below remains mandatory after invalidation failure.
          }
        }
        if (successor !== undefined) {
          try {
            successor.mounted.unmount();
          } catch {
            // Root cleanup and owner release below remain mandatory best effort.
          }
        }
        clearRootBestEffortV1();
        if (composition !== undefined) {
          try {
            retryDisposition = await composition.lifecycle.disposeForRebootstrap();
          } catch {
            // Preserve the transition failure when terminal successor release also fails.
          }
        }
        throw error;
      }
    },
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
}
