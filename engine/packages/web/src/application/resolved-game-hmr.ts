// SPDX-License-Identifier: MIT
import type {
  BuildProvenanceV1,
  DeepReadonly,
  Digest,
  PositiveSafeInteger,
  RuntimeInvalidationControllerV1,
} from "@sillymaker/base";

export interface ResolvedGameHmrIdentityV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly storyDigest: Digest;
  readonly engineDigest: Digest;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly simulationDigest: Digest;
  readonly presentationDigest: Digest;
}

export interface ResolvedGameHmrHotAdapterV1<TModule> {
  accept(handler: (module: TModule | undefined) => void): void;
}

export interface WebRuntimeRebootstrapLifecycleV1<TDisposition> {
  readonly invalidationController: RuntimeInvalidationControllerV1;
  disposeForRebootstrap(): Promise<TDisposition>;
}

export type ResolvedGameHmrReasonV1 =
  | {
      readonly kind: "identity_changed";
      readonly previous: ResolvedGameHmrIdentityV1;
      readonly next: ResolvedGameHmrIdentityV1;
    }
  | { readonly kind: "resolution_failed" };

export interface ResolvedGameHmrRebootstrapInputV1<TModule, TDisposition> {
  readonly module: TModule | undefined;
  readonly reason: ResolvedGameHmrReasonV1;
  readonly disposition: TDisposition;
}

export interface InstalledResolvedGameHmrV1 {
  waitForTransition(): Promise<void>;
}

/** Extracts the exact identity fields whose change requires a full runtime rebootstrap. */
export function createResolvedGameHmrIdentityV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
): ResolvedGameHmrIdentityV1 {
  return Object.freeze({
    storyId: provenance.story.id,
    storyRevision: provenance.story.revision,
    storyDigest: provenance.story.digest,
    engineDigest: provenance.engine.digest,
    stateContractRevision: provenance.resolved.stateContractRevision,
    stateContractDigest: provenance.resolved.stateContractDigest,
    simulationDigest: provenance.resolved.simulationDigest,
    presentationDigest: provenance.resolved.presentationDigest,
  });
}

function sameResolvedGameHmrIdentityV1(
  left: ResolvedGameHmrIdentityV1,
  right: ResolvedGameHmrIdentityV1,
): boolean {
  return (
    left.storyId === right.storyId &&
    left.storyRevision === right.storyRevision &&
    left.storyDigest === right.storyDigest &&
    left.engineDigest === right.engineDigest &&
    left.stateContractRevision === right.stateContractRevision &&
    left.stateContractDigest === right.stateContractDigest &&
    left.simulationDigest === right.simulationDigest &&
    left.presentationDigest === right.presentationDigest
  );
}

/**
 * Installs one self-accepting HMR boundary that invalidates synchronously, fences persistence,
 * and then calls the caller's single same-root composition factory with the accepted module.
 */
export function installResolvedGameHmrV1<TModule, TDisposition>(input: {
  readonly hot: ResolvedGameHmrHotAdapterV1<TModule> | undefined;
  readonly currentProvenance: DeepReadonly<BuildProvenanceV1>;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<TDisposition>;
  resolveAcceptedProvenance(module: TModule | undefined): DeepReadonly<BuildProvenanceV1>;
  onAcceptedEqual?(module: TModule | undefined): void;
  rebootstrap(input: ResolvedGameHmrRebootstrapInputV1<TModule, TDisposition>): Promise<void>;
  reportFailure?(error: unknown): void;
}): InstalledResolvedGameHmrV1 {
  const currentIdentity = createResolvedGameHmrIdentityV1(input.currentProvenance);
  let boundaryClosed = false;
  let invalidationStarted = false;
  let invalidationReason: ResolvedGameHmrReasonV1 | undefined;
  let disposition: Promise<TDisposition> | undefined;
  let transition: Promise<void> = Promise.resolve();

  const reportFailure = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // HMR failure reporting is diagnostic-only and cannot interrupt invalidation or fencing.
    }
  };

  const getDisposition = (): Promise<TDisposition> => {
    disposition ??= Promise.resolve().then(async () => {
      return await input.lifecycle.disposeForRebootstrap();
    });
    return disposition;
  };

  const runTransition = async (
    module: TModule | undefined,
    reason: ResolvedGameHmrReasonV1,
  ): Promise<void> => {
    let settledDisposition: TDisposition;
    try {
      settledDisposition = await getDisposition();
    } catch (error) {
      reportFailure(error);
      return;
    }
    try {
      await input.rebootstrap(Object.freeze({ module, reason, disposition: settledDisposition }));
      boundaryClosed = true;
    } catch (error) {
      reportFailure(error);
    }
  };

  const scheduleTransition = (
    module: TModule | undefined,
    reason: ResolvedGameHmrReasonV1,
  ): void => {
    void getDisposition();
    transition = transition.then(async () => {
      if (boundaryClosed) return;
      await runTransition(module, reason);
    });
  };

  input.hot?.accept((module) => {
    if (boundaryClosed) return;

    let reason: ResolvedGameHmrReasonV1;
    let resolutionFailed = false;
    let resolutionFailure: unknown;
    try {
      const nextIdentity = createResolvedGameHmrIdentityV1(input.resolveAcceptedProvenance(module));
      if (sameResolvedGameHmrIdentityV1(currentIdentity, nextIdentity)) {
        if (!invalidationStarted) {
          if (input.onAcceptedEqual !== undefined) {
            try {
              input.onAcceptedEqual(module);
              boundaryClosed = true;
            } catch (error) {
              reportFailure(error);
            }
          }
          return;
        }
        reason = invalidationReason ?? Object.freeze({ kind: "resolution_failed" });
      } else {
        reason = Object.freeze({
          kind: "identity_changed",
          previous: currentIdentity,
          next: nextIdentity,
        });
      }
    } catch (error) {
      resolutionFailed = true;
      resolutionFailure = error;
      reason = Object.freeze({ kind: "resolution_failed" });
    }

    if (!invalidationStarted) {
      try {
        input.lifecycle.invalidationController.invalidateForHmr();
      } catch (error) {
        reportFailure(error);
        return;
      }
      invalidationStarted = true;
      invalidationReason = reason;
    }
    if (resolutionFailed) reportFailure(resolutionFailure);
    scheduleTransition(module, reason);
  });

  return Object.freeze({
    waitForTransition: () => transition,
  });
}
