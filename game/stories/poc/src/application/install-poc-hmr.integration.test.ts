// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestBytes, parsePositiveSafeInteger } from "@sillymaker/base";
import type {
  BuildProvenanceV1,
  Digest,
  GameHostV1,
  RuntimeInvalidationControllerV1,
} from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";
import { describe, expect, it, vi } from "vitest";

import {
  installPocHmrV1,
  type PocHmrCompositionV1,
  type PocHmrMountedApplicationV1,
} from "./install-poc-hmr.js";

function digestV1(label: string): Digest {
  return digestBytes(new TextEncoder().encode(label));
}

function provenanceV1(label = "current"): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: "story.project-tavern.poc",
      revision: parsePositiveSafeInteger(1),
      digest: digestV1(`story:${label}`),
    }),
    engine: Object.freeze({ version: "SillyMaker test", digest: digestV1("engine") }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: digestV1("state-contract"),
      simulationDigest: digestV1("simulation"),
      presentationDigest: digestV1(`presentation:${label}`),
      patchSet: Object.freeze({
        digest: digestV1("patch-set"),
        simulationDigest: digestV1("simulation-patch-set"),
        presentationDigest: digestV1("presentation-patch-set"),
        appliedHotfixes: Object.freeze([]),
      }),
    }),
  });
}

function createHotFixtureV1<TModule>() {
  let accepted: ((module: TModule | undefined) => void) | undefined;
  const hot: ResolvedGameHmrHotAdapterV1<TModule> = Object.freeze({
    accept(handler: (module: TModule | undefined) => void) {
      accepted = handler;
    },
  });
  return Object.freeze({
    hot,
    emit(module: TModule | undefined): void {
      if (accepted === undefined) throw new TypeError("missing PoC HMR accept handler");
      accepted(module);
    },
  });
}

function completedInstallationV1(): InstalledResolvedGameHmrV1 {
  return Object.freeze({ waitForTransition: () => Promise.resolve() });
}

function releasedDispositionV1(token: number): PersistenceRebootstrapDisposalV1 {
  return Object.freeze({
    ownership: "released",
    code: null,
    fence: Object.freeze({ ownerId: `owner-${token}`, fencingToken: token }),
  }) as PersistenceRebootstrapDisposalV1;
}

interface FixtureRuntimeV1 {
  readonly resolvedGame: Readonly<{ readonly provenance: BuildProvenanceV1 }>;
  readonly session: object;
  dispose(): void;
}

interface FixtureCompositionV1 extends PocHmrCompositionV1 {
  readonly runtime: FixtureRuntimeV1;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;
  readonly label: string;
}

interface AcceptedModuleV1 {
  readonly provenance: BuildProvenanceV1;
  readonly label: string;
}

function createCompositionV1(input: {
  readonly provenance: BuildProvenanceV1;
  readonly label: string;
  readonly disposition: PersistenceRebootstrapDisposalV1;
  readonly events?: string[];
}): FixtureCompositionV1 {
  const events = input.events ?? [];
  const runtime: FixtureRuntimeV1 = Object.freeze({
    resolvedGame: Object.freeze({ provenance: input.provenance }),
    session: Object.freeze({ label: `session:${input.label}` }),
    dispose: vi.fn(() => {
      events.push(`${input.label}:runtime-dispose`);
    }),
  });
  return Object.freeze({
    label: input.label,
    runtime,
    lifecycle: Object.freeze({
      invalidationController: Object.freeze({
        invalidateForHmr: vi.fn(() => {
          events.push(`${input.label}:invalidate`);
        }),
      }) as RuntimeInvalidationControllerV1,
      disposeForRebootstrap: vi.fn(async () => {
        events.push(`${input.label}:dispose`);
        return input.disposition;
      }),
    }),
  });
}

function createMountedStateV1(
  composition: FixtureCompositionV1,
  input: {
    readonly root?: Element;
    readonly host?: GameHostV1;
    readonly unmount?: () => void;
  } = {},
): PocHmrMountedApplicationV1<FixtureCompositionV1> {
  return Object.freeze({
    root: input.root ?? (Object.freeze({ replaceChildren: vi.fn() }) as unknown as Element),
    host: input.host ?? (Object.freeze({}) as GameHostV1),
    composition,
    mounted: Object.freeze({ unmount: input.unmount ?? vi.fn() }),
  });
}

describe("PoC same-root HMR", () => {
  it("retains the Session, root, and overlay owner for equal identity and installs the next boundary", async () => {
    const currentProvenance = provenanceV1();
    const currentComposition = createCompositionV1({
      provenance: currentProvenance,
      label: "current",
      disposition: releasedDispositionV1(1),
    });
    const currentState = createMountedStateV1(currentComposition);
    const hot = createHotFixtureV1<AcceptedModuleV1>();
    const createSuccessor = vi.fn();
    const mountSuccessor = vi.fn();
    const installNextBoundary = vi.fn(() => completedInstallationV1());
    const onSuccessorMounted = vi.fn();
    const installation = installPocHmrV1({
      state: currentState,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      createSuccessor,
      mountSuccessor,
      installNextBoundary,
      onSuccessorMounted,
    });
    const accepted = Object.freeze({ provenance: currentProvenance, label: "css-only" });

    hot.emit(accepted);
    await installation.waitForTransition();

    expect(
      currentComposition.lifecycle.invalidationController.invalidateForHmr,
    ).not.toHaveBeenCalled();
    expect(currentComposition.lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(currentState.mounted.unmount).not.toHaveBeenCalled();
    expect(createSuccessor).not.toHaveBeenCalled();
    expect(mountSuccessor).not.toHaveBeenCalled();
    expect(installNextBoundary).toHaveBeenCalledOnce();
    expect(installNextBoundary).toHaveBeenCalledWith({ module: accepted, state: currentState });
    expect(onSuccessorMounted).not.toHaveBeenCalled();
    expect(currentComposition.runtime.session).toEqual({ label: "session:current" });
  });

  it("invalidates synchronously and reboots inside the exact same root with the exact disposition", async () => {
    const events: string[] = [];
    const currentProvenance = provenanceV1();
    const changedProvenance = provenanceV1("changed");
    const originalDisposition = releasedDispositionV1(1);
    const currentComposition = createCompositionV1({
      provenance: currentProvenance,
      label: "current",
      disposition: originalDisposition,
      events,
    });
    const root = Object.freeze({ replaceChildren: vi.fn() }) as unknown as Element;
    const host = Object.freeze({}) as GameHostV1;
    const originalUnmount = vi.fn(() => {
      events.push("current:unmount");
    });
    const currentState = createMountedStateV1(currentComposition, {
      root,
      host,
      unmount: originalUnmount,
    });
    const pageLifetime = { current: currentState };
    const hot = createHotFixtureV1<AcceptedModuleV1>();
    const successorComposition = createCompositionV1({
      provenance: changedProvenance,
      label: "successor",
      disposition: releasedDispositionV1(2),
      events,
    });
    const successorMounted = Object.freeze({ unmount: vi.fn() });
    const createSuccessor = vi.fn(async (input) => {
      events.push("create-successor");
      expect(input).toEqual({
        module: { provenance: changedProvenance, label: "changed" },
        root,
        host,
        disposition: originalDisposition,
        onConstructionFailureDisposition: expect.any(Function),
      });
      return successorComposition;
    });
    const mountSuccessor = vi.fn((input) => {
      events.push("mount-successor");
      expect(input).toEqual({ root, host, composition: successorComposition });
      return Object.freeze({
        root,
        host,
        composition: successorComposition,
        mounted: successorMounted,
      });
    });
    const installNextBoundary = vi.fn(() => {
      events.push("install-next-boundary");
      return completedInstallationV1();
    });
    const onSuccessorMounted = vi.fn((state: typeof currentState) => {
      pageLifetime.current = state;
      events.push("own-successor");
    });
    const installation = installPocHmrV1({
      state: currentState,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      createSuccessor,
      mountSuccessor,
      installNextBoundary,
      onSuccessorMounted,
    });
    const accepted = Object.freeze({ provenance: changedProvenance, label: "changed" });

    hot.emit(accepted);
    expect(
      currentComposition.lifecycle.invalidationController.invalidateForHmr,
    ).toHaveBeenCalledOnce();
    await installation.waitForTransition();

    expect(currentComposition.lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(createSuccessor).toHaveBeenCalledOnce();
    expect(mountSuccessor).toHaveBeenCalledOnce();
    expect(installNextBoundary).toHaveBeenCalledWith({
      module: accepted,
      state: {
        root,
        host,
        composition: successorComposition,
        mounted: successorMounted,
      },
    });
    expect(onSuccessorMounted).toHaveBeenCalledWith({
      root,
      host,
      composition: successorComposition,
      mounted: successorMounted,
    });
    expect(root.replaceChildren).not.toHaveBeenCalled();
    expect(events).toEqual([
      "current:invalidate",
      "current:dispose",
      "current:unmount",
      "create-successor",
      "mount-successor",
      "install-next-boundary",
      "own-successor",
    ]);

    pageLifetime.current.mounted.unmount();
    expect(successorMounted.unmount).toHaveBeenCalledOnce();
    expect(originalUnmount).toHaveBeenCalledOnce();
  });

  it("cleans a failed successor and retries with that successor's returned disposition", async () => {
    const currentProvenance = provenanceV1();
    const changedProvenance = provenanceV1("changed");
    const originalDisposition = releasedDispositionV1(1);
    const successorDisposition = releasedDispositionV1(2);
    const currentComposition = createCompositionV1({
      provenance: currentProvenance,
      label: "current",
      disposition: originalDisposition,
    });
    const originalUnmount = vi.fn();
    const replaceChildren = vi.fn();
    const root = Object.freeze({ replaceChildren }) as unknown as Element;
    const currentState = createMountedStateV1(currentComposition, {
      root,
      unmount: originalUnmount,
    });
    const hot = createHotFixtureV1<AcceptedModuleV1>();
    const firstSuccessor = createCompositionV1({
      provenance: changedProvenance,
      label: "first-successor",
      disposition: successorDisposition,
    });
    const retrySuccessor = createCompositionV1({
      provenance: changedProvenance,
      label: "retry-successor",
      disposition: releasedDispositionV1(3),
    });
    const firstUnmount = vi.fn();
    const retryUnmount = vi.fn();
    const receivedDispositions: PersistenceRebootstrapDisposalV1[] = [];
    const createSuccessor = vi.fn(async ({ disposition }) => {
      receivedDispositions.push(disposition);
      return receivedDispositions.length === 1 ? firstSuccessor : retrySuccessor;
    });
    const mountSuccessor = vi.fn(({ composition }) =>
      Object.freeze({
        root,
        host: currentState.host,
        composition,
        mounted: Object.freeze({
          unmount: composition === firstSuccessor ? firstUnmount : retryUnmount,
        }),
      }),
    );
    let boundaryAttempt = 0;
    const installNextBoundary = vi.fn(() => {
      boundaryAttempt += 1;
      if (boundaryAttempt === 1) throw new Error("injected next-boundary failure");
      return completedInstallationV1();
    });
    const reportFailure = vi.fn();
    const onSuccessorMounted = vi.fn();
    const installation = installPocHmrV1({
      state: currentState,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      createSuccessor,
      mountSuccessor,
      installNextBoundary,
      onSuccessorMounted,
      reportFailure,
    });
    const accepted = Object.freeze({ provenance: changedProvenance, label: "changed" });

    hot.emit(accepted);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(firstSuccessor.lifecycle.invalidationController.invalidateForHmr).toHaveBeenCalledOnce();
    expect(firstUnmount).toHaveBeenCalledOnce();
    expect(firstSuccessor.lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(replaceChildren).toHaveBeenCalledOnce();
    expect(onSuccessorMounted).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: "injected next-boundary failure" }),
    );

    hot.emit(accepted);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(currentComposition.lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(receivedDispositions).toEqual([originalDisposition, successorDisposition]);
    expect(retryUnmount).not.toHaveBeenCalled();
    expect(onSuccessorMounted).toHaveBeenCalledOnce();
  });

  it("retries construction and mount failures without losing the latest safe disposition", async () => {
    const currentProvenance = provenanceV1();
    const changedProvenance = provenanceV1("changed");
    const originalDisposition = releasedDispositionV1(1);
    const lateConstructionFailureDisposition = releasedDispositionV1(4);
    const mountedFailureDisposition = releasedDispositionV1(2);
    const currentComposition = createCompositionV1({
      provenance: currentProvenance,
      label: "current",
      disposition: originalDisposition,
    });
    const originalUnmount = vi.fn();
    const replaceChildren = vi.fn();
    const root = Object.freeze({ replaceChildren }) as unknown as Element;
    const currentState = createMountedStateV1(currentComposition, {
      root,
      unmount: originalUnmount,
    });
    const hot = createHotFixtureV1<AcceptedModuleV1>();
    const mountFailureComposition = createCompositionV1({
      provenance: changedProvenance,
      label: "mount-failure",
      disposition: mountedFailureDisposition,
    });
    const successfulComposition = createCompositionV1({
      provenance: changedProvenance,
      label: "successful",
      disposition: releasedDispositionV1(3),
    });
    const receivedDispositions: PersistenceRebootstrapDisposalV1[] = [];
    const constructionFailure = new Error("injected construction failure");
    const createSuccessor = vi.fn(async ({ disposition, onConstructionFailureDisposition }) => {
      receivedDispositions.push(disposition);
      switch (receivedDispositions.length) {
        case 1:
          onConstructionFailureDisposition(lateConstructionFailureDisposition);
          throw constructionFailure;
        case 2:
          return mountFailureComposition;
        default:
          return successfulComposition;
      }
    });
    const mountSuccessor = vi.fn(({ composition }) => {
      if (composition === mountFailureComposition) throw new Error("injected mount failure");
      return Object.freeze({
        root,
        host: currentState.host,
        composition,
        mounted: Object.freeze({ unmount: vi.fn() }),
      });
    });
    const reportFailure = vi.fn();
    const installation = installPocHmrV1({
      state: currentState,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      createSuccessor,
      mountSuccessor,
      installNextBoundary: () => completedInstallationV1(),
      reportFailure,
    });
    const accepted = Object.freeze({ provenance: changedProvenance, label: "changed" });

    hot.emit(accepted);
    await installation.waitForTransition();
    hot.emit(accepted);
    await installation.waitForTransition();
    hot.emit(accepted);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(replaceChildren).toHaveBeenCalledTimes(2);
    expect(
      mountFailureComposition.lifecycle.invalidationController.invalidateForHmr,
    ).toHaveBeenCalledOnce();
    expect(mountFailureComposition.lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(receivedDispositions).toEqual([
      originalDisposition,
      lateConstructionFailureDisposition,
      mountedFailureDisposition,
    ]);
    expect(reportFailure).toHaveBeenNthCalledWith(1, constructionFailure);
    expect(reportFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: "injected mount failure" }),
    );
  });

  it("retries original unmount and tolerates best-effort root cleanup failure", async () => {
    const currentProvenance = provenanceV1();
    const changedProvenance = provenanceV1("changed");
    const currentComposition = createCompositionV1({
      provenance: currentProvenance,
      label: "current",
      disposition: releasedDispositionV1(1),
    });
    const originalUnmount = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("injected original unmount failure");
      })
      .mockImplementationOnce(() => undefined);
    const root = Object.freeze({
      replaceChildren: vi.fn(() => {
        throw new Error("injected root cleanup failure");
      }),
    }) as unknown as Element;
    const currentState = createMountedStateV1(currentComposition, {
      root,
      unmount: originalUnmount,
    });
    const hot = createHotFixtureV1<AcceptedModuleV1>();
    const successor = createCompositionV1({
      provenance: changedProvenance,
      label: "successor",
      disposition: releasedDispositionV1(2),
    });
    const createSuccessor = vi.fn(async () => successor);
    const installation = installPocHmrV1({
      state: currentState,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      createSuccessor,
      mountSuccessor: ({ composition }) =>
        Object.freeze({
          root,
          host: currentState.host,
          composition,
          mounted: Object.freeze({ unmount: vi.fn() }),
        }),
      installNextBoundary: () => completedInstallationV1(),
    });
    const accepted = Object.freeze({ provenance: changedProvenance, label: "changed" });

    hot.emit(accepted);
    await installation.waitForTransition();
    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(createSuccessor).not.toHaveBeenCalled();

    hot.emit(accepted);
    await installation.waitForTransition();
    expect(originalUnmount).toHaveBeenCalledTimes(2);
    expect(createSuccessor).toHaveBeenCalledOnce();
  });

  it("is inert without a browser HMR adapter", async () => {
    const currentComposition = createCompositionV1({
      provenance: provenanceV1(),
      label: "current",
      disposition: releasedDispositionV1(1),
    });
    const currentState = createMountedStateV1(currentComposition);
    const resolveAcceptedProvenance = vi.fn(() => provenanceV1("changed"));
    const createSuccessor = vi.fn();
    const mountSuccessor = vi.fn();
    const installNextBoundary = vi.fn(() => completedInstallationV1());
    const installation = installPocHmrV1({
      state: currentState,
      hot: undefined,
      resolveAcceptedProvenance,
      createSuccessor,
      mountSuccessor,
      installNextBoundary,
    });

    await expect(installation.waitForTransition()).resolves.toBeUndefined();
    expect(resolveAcceptedProvenance).not.toHaveBeenCalled();
    expect(createSuccessor).not.toHaveBeenCalled();
    expect(mountSuccessor).not.toHaveBeenCalled();
    expect(installNextBoundary).not.toHaveBeenCalled();
  });
});
