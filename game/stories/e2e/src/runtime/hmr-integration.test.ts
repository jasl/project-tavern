// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { digestBytes } from "@sillymaker/base";
import type { BuildProvenanceV1, GameHostV1, HostAtomicRecordStoreV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import { createWebHostV1 } from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";
import { describe, expect, it, vi } from "vitest";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import type { E2ePresentationRuntimeV1 } from "../application/create-e2e-presentation-runtime.js";
import type { E2eApplicationCompositionV1, E2eEntryHmrModuleV1 } from "../application/entry.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

type E2eRebootstrapLifecycleV1 = WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;

vi.mock("virtual:project-tavern/e2e-build-identity", () => ({
  e2eBuildIdentityV1: Object.freeze({}),
}));

function createHotFixtureV1<TModule>() {
  let accepted: ((module: TModule | undefined) => void) | undefined;
  const hot: ResolvedGameHmrHotAdapterV1<TModule> = Object.freeze({
    accept(handler: (module: TModule | undefined) => void) {
      accepted = handler;
    },
  });
  return Object.freeze({
    hot,
    emit(module: TModule | undefined) {
      if (accepted === undefined) throw new TypeError("missing HMR accept handler");
      accepted(module);
    },
  });
}

function changedPresentationProvenanceV1(current: BuildProvenanceV1): BuildProvenanceV1 {
  return Object.freeze({
    ...current,
    resolved: Object.freeze({
      ...current.resolved,
      presentationDigest: digestBytes(new TextEncoder().encode("e2e-hmr-replacement")),
    }),
  });
}

function completedHmrInstallationV1(): InstalledResolvedGameHmrV1 {
  return Object.freeze({ waitForTransition: () => Promise.resolve() });
}

async function createE2eHmrCompositionV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
  readonly disposition?: PersistenceRebootstrapDisposalV1;
}): Promise<E2eApplicationCompositionV1> {
  let lifecycle: E2eRebootstrapLifecycleV1 | undefined;
  const application = await createE2eGameRuntimeV1({
    resolved: input.resolved,
    host: input.host,
    ...(input.disposition === undefined ? {} : { rebootstrapDisposition: input.disposition }),
    onRebootstrapLifecycle(value) {
      lifecycle = value;
    },
  });
  if (lifecycle === undefined) throw new TypeError("missing E2E HMR lifecycle");
  const presentationRuntime = Object.freeze({
    application,
    dispose: vi.fn(),
  }) as unknown as E2ePresentationRuntimeV1;
  return Object.freeze({
    resolvedGame: input.resolved,
    application,
    presentationRuntime,
    lifecycle,
  });
}

function createAcceptedE2eHmrModuleV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly provenance: BuildProvenanceV1;
  readonly dispositions: PersistenceRebootstrapDisposalV1[];
  readonly compositions: E2eApplicationCompositionV1[];
  afterComposition?(composition: E2eApplicationCompositionV1): void;
  install(): InstalledResolvedGameHmrV1;
}): E2eEntryHmrModuleV1 {
  return Object.freeze({
    resolveE2eHmrProvenanceV1: () => input.provenance,
    async createE2eApplicationCompositionV1(
      factoryInput: Parameters<E2eEntryHmrModuleV1["createE2eApplicationCompositionV1"]>[0],
    ) {
      const { host, rebootstrapDisposition } = factoryInput;
      if (rebootstrapDisposition === undefined) {
        throw new TypeError("missing E2E retry disposition");
      }
      input.dispositions.push(rebootstrapDisposition);
      const composition = await createE2eHmrCompositionV1({
        resolved: input.resolved,
        host,
        disposition: rebootstrapDisposition,
      });
      input.compositions.push(composition);
      input.afterComposition?.(composition);
      return composition;
    },
    installE2eApplicationHmrV1: () => input.install(),
  });
}

function createFailNextLeaseCommitStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let failNextLeaseCommit = false;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: (...arguments_: Parameters<HostAtomicRecordStoreV1["read"]>) =>
      memory.read(...arguments_),
    list: (...arguments_: Parameters<HostAtomicRecordStoreV1["list"]>) =>
      memory.list(...arguments_),
    commit(...arguments_: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      if (failNextLeaseCommit && arguments_[0].some((mutation) => mutation.namespace === "lease")) {
        failNextLeaseCommit = false;
        return Promise.reject(new TypeError("injected lease commit failure"));
      }
      return memory.commit(...arguments_);
    },
  });
  return Object.freeze({
    records,
    failNextLeaseCommit() {
      failNextLeaseCommit = true;
    },
  });
}

describe("E2E unified-root HMR integration", () => {
  it("registers owner-only rebootstrap controls without exposing them on the application port", async () => {
    let lifecycle: E2eRebootstrapLifecycleV1 | undefined;
    const application = await createE2eGameRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000201"],
        now: () => "2026-07-14T04:05:06.000Z",
      }),
      onRebootstrapLifecycle(value) {
        lifecycle = value;
      },
    });

    expect(lifecycle).toBeDefined();
    expect(application).not.toHaveProperty("invalidationController");
    expect(application).not.toHaveProperty("disposeForRebootstrap");

    lifecycle?.invalidationController.invalidateForHmr();
    lifecycle?.invalidationController.invalidateForHmr();
    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
    await expect(application.lifecycle.restartSession()).resolves.toEqual({
      kind: "rejected",
      code: "hmr_invalidated",
    });
    const exported = await application.diagnostics.exportDebugBundle();
    expect(exported).toMatchObject({
      mediaType: "application/json",
    });
    const bundle = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
      readonly runtimeFailures: readonly { readonly code: string }[];
    };
    expect(bundle.runtimeFailures.filter(({ code }) => code === "runtime.hmr_invalidated")).toEqual(
      [expect.objectContaining({ code: "runtime.hmr_invalidated" })],
    );
  });

  it("releases the old exact fence before a fresh owner explicitly takes over", async () => {
    const records = createMemoryHostRecordStoreV1();
    const host = createWebHostV1({
      records,
      seeds: [0x0002_3049, 0x0002_3050],
      uuids: ["00000000-0000-4000-8000-000000000211", "00000000-0000-4000-8000-000000000212"],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    let oldLifecycle: E2eRebootstrapLifecycleV1 | undefined;
    const oldApplication = await createE2eGameRuntimeV1({
      resolved,
      host,
      onRebootstrapLifecycle(value) {
        oldLifecycle = value;
      },
    });
    expect(await oldApplication.persistence.lease.getStatus()).toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000211",
      fencingToken: 1,
    });
    await expect(
      oldApplication.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });

    oldLifecycle?.invalidationController.invalidateForHmr();
    const disposition = await oldLifecycle?.disposeForRebootstrap();
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: {
        ownerId: "00000000-0000-4000-8000-000000000211",
        fencingToken: 1,
      },
    });
    if (disposition === undefined) throw new TypeError("missing old HMR disposition");

    let replacementLifecycle: E2eRebootstrapLifecycleV1 | undefined;
    const replacement = await createE2eGameRuntimeV1({
      resolved,
      host,
      rebootstrapDisposition: disposition,
      onRebootstrapLifecycle(value) {
        replacementLifecycle = value;
      },
    });
    expect(replacementLifecycle).toBeDefined();
    expect(await replacement.persistence.lease.getStatus()).toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000212",
      fencingToken: 2,
    });
    await expect(replacement.persistence.save("manual")).resolves.toEqual({
      kind: "saved",
      slotId: "manual",
    });
    await expect(oldApplication.persistence.save("manual")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(oldApplication.persistence.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("does not consume the released fence when replacement construction fails before takeover", async () => {
    const records = createMemoryHostRecordStoreV1();
    const host = createWebHostV1({
      records,
      seeds: [0x0002_3049, 0x0002_3050, 0x0002_3051],
      uuids: [
        "00000000-0000-4000-8000-000000000231",
        "00000000-0000-4000-8000-000000000232",
        "00000000-0000-4000-8000-000000000233",
      ],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    let oldLifecycle: E2eRebootstrapLifecycleV1 | undefined;
    await createE2eGameRuntimeV1({
      resolved,
      host,
      onRebootstrapLifecycle(value) {
        oldLifecycle = value;
      },
    });
    oldLifecycle?.invalidationController.invalidateForHmr();
    const disposition = await oldLifecycle?.disposeForRebootstrap();
    if (disposition === undefined) throw new TypeError("missing old HMR disposition");
    const constructionFailure = new Error("injected replacement construction failure");

    await expect(
      createE2eGameRuntimeV1({
        resolved,
        host,
        rebootstrapDisposition: disposition,
        get loadTooling(): never {
          throw constructionFailure;
        },
      }),
    ).rejects.toBe(constructionFailure);

    const retry = await createE2eGameRuntimeV1({
      resolved,
      host,
      rebootstrapDisposition: disposition,
    });
    await expect(retry.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000233",
      fencingToken: 2,
    });
    await expect(retry.persistence.save("manual")).resolves.toMatchObject({ kind: "saved" });
  });

  it("releases a successor after mount failure and retries with the successor disposition", async () => {
    const { installE2eApplicationHmrV1 } = await import("../application/entry.js");
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049, 0x0002_3050, 0x0002_3051],
      uuids: [
        "00000000-0000-4000-8000-000000000241",
        "00000000-0000-4000-8000-000000000242",
        "00000000-0000-4000-8000-000000000243",
      ],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const initialComposition = await createE2eHmrCompositionV1({ resolved, host });
    const originalUnmount = vi.fn();
    const replaceChildren = vi.fn();
    const root = Object.freeze({ replaceChildren }) as unknown as Element;
    const hot = createHotFixtureV1<E2eEntryHmrModuleV1>();
    const dispositions: PersistenceRebootstrapDisposalV1[] = [];
    const compositions: E2eApplicationCompositionV1[] = [];
    const acceptedModule = createAcceptedE2eHmrModuleV1({
      resolved,
      provenance: changedPresentationProvenanceV1(resolved.provenance),
      dispositions,
      compositions,
      install: completedHmrInstallationV1,
    });
    const successfulMount = Object.freeze({ unmount: vi.fn() });
    let mountAttempt = 0;
    const installation = installE2eApplicationHmrV1({
      state: Object.freeze({
        root,
        host,
        composition: initialComposition,
        mounted: Object.freeze({ unmount: originalUnmount }),
      }),
      hot: hot.hot,
      mountComposition(rootValue, hostValue, composition) {
        mountAttempt += 1;
        if (mountAttempt === 1) throw new Error("injected mount failure");
        return Object.freeze({
          root: rootValue,
          host: hostValue,
          composition,
          mounted: successfulMount,
        });
      },
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(replaceChildren).toHaveBeenCalledOnce();
    expect(compositions).toHaveLength(1);
    await expect(compositions[0]?.application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 2,
    });
    await expect(
      compositions[0]?.application.semantic.dispatch({
        actionId: "action.e2e.increment",
        parameters: {},
      }),
    ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
    await expect(compositions[0]?.application.persistence.save("manual")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(dispositions.map((value) => value.fence?.fencingToken ?? null)).toEqual([1, 2]);
    expect(compositions).toHaveLength(2);
    await expect(compositions[1]?.application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000243",
      fencingToken: 3,
    });
    expect(successfulMount.unmount).not.toHaveBeenCalled();
  });

  it("retries the original unmount before constructing a successor when unmount throws", async () => {
    const { installE2eApplicationHmrV1 } = await import("../application/entry.js");
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049, 0x0002_3050],
      uuids: ["00000000-0000-4000-8000-000000000261", "00000000-0000-4000-8000-000000000262"],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const initialComposition = await createE2eHmrCompositionV1({ resolved, host });
    const originalUnmount = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("injected original unmount failure");
      })
      .mockImplementationOnce(() => undefined);
    const replaceChildren = vi.fn();
    const root = Object.freeze({ replaceChildren }) as unknown as Element;
    const hot = createHotFixtureV1<E2eEntryHmrModuleV1>();
    const dispositions: PersistenceRebootstrapDisposalV1[] = [];
    const compositions: E2eApplicationCompositionV1[] = [];
    const acceptedModule = createAcceptedE2eHmrModuleV1({
      resolved,
      provenance: changedPresentationProvenanceV1(resolved.provenance),
      dispositions,
      compositions,
      install: completedHmrInstallationV1,
    });
    const installation = installE2eApplicationHmrV1({
      state: Object.freeze({
        root,
        host,
        composition: initialComposition,
        mounted: Object.freeze({ unmount: originalUnmount }),
      }),
      hot: hot.hot,
      mountComposition(rootValue, hostValue, composition) {
        return Object.freeze({
          root: rootValue,
          host: hostValue,
          composition,
          mounted: Object.freeze({ unmount: vi.fn() }),
        });
      },
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();
    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(compositions).toEqual([]);
    expect(replaceChildren).toHaveBeenCalledOnce();

    hot.emit(acceptedModule);
    await installation.waitForTransition();
    expect(originalUnmount).toHaveBeenCalledTimes(2);
    expect(dispositions.map((value) => value.fence?.fencingToken ?? null)).toEqual([1]);
    await expect(compositions[0]?.application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000262",
      fencingToken: 2,
    });
  });

  it("unmounts and releases a successor after next-boundary failure before retrying", async () => {
    const { installE2eApplicationHmrV1 } = await import("../application/entry.js");
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049, 0x0002_3050, 0x0002_3051],
      uuids: [
        "00000000-0000-4000-8000-000000000251",
        "00000000-0000-4000-8000-000000000252",
        "00000000-0000-4000-8000-000000000253",
      ],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const initialComposition = await createE2eHmrCompositionV1({ resolved, host });
    const originalUnmount = vi.fn();
    const replaceChildren = vi.fn();
    const root = Object.freeze({ replaceChildren }) as unknown as Element;
    const hot = createHotFixtureV1<E2eEntryHmrModuleV1>();
    const dispositions: PersistenceRebootstrapDisposalV1[] = [];
    const compositions: E2eApplicationCompositionV1[] = [];
    let boundaryAttempt = 0;
    const acceptedModule = createAcceptedE2eHmrModuleV1({
      resolved,
      provenance: changedPresentationProvenanceV1(resolved.provenance),
      dispositions,
      compositions,
      install() {
        boundaryAttempt += 1;
        if (boundaryAttempt === 1) throw new Error("injected next-boundary failure");
        return completedHmrInstallationV1();
      },
    });
    const replacementMounts: { readonly unmount: ReturnType<typeof vi.fn> }[] = [];
    const installation = installE2eApplicationHmrV1({
      state: Object.freeze({
        root,
        host,
        composition: initialComposition,
        mounted: Object.freeze({ unmount: originalUnmount }),
      }),
      hot: hot.hot,
      mountComposition(rootValue, hostValue, composition) {
        const mounted = Object.freeze({ unmount: vi.fn() });
        replacementMounts.push(mounted);
        return Object.freeze({ root: rootValue, host: hostValue, composition, mounted });
      },
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(replacementMounts[0]?.unmount).toHaveBeenCalledOnce();
    expect(replaceChildren).toHaveBeenCalledOnce();
    await expect(compositions[0]?.application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 2,
    });
    await expect(
      compositions[0]?.application.semantic.dispatch({
        actionId: "action.e2e.increment",
        parameters: {},
      }),
    ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
    await expect(compositions[0]?.application.persistence.save("manual")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();

    expect(originalUnmount).toHaveBeenCalledOnce();
    expect(dispositions.map((value) => value.fence?.fencingToken ?? null)).toEqual([1, 2]);
    await expect(compositions[1]?.application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000253",
      fencingToken: 3,
    });
    expect(replacementMounts[1]?.unmount).not.toHaveBeenCalled();
  });

  it("propagates a successor release failure as a read-only retry disposition", async () => {
    const { installE2eApplicationHmrV1 } = await import("../application/entry.js");
    const controlled = createFailNextLeaseCommitStoreV1();
    const host = createWebHostV1({
      records: controlled.records,
      seeds: [0x0002_3049, 0x0002_3050, 0x0002_3051],
      uuids: [
        "00000000-0000-4000-8000-000000000271",
        "00000000-0000-4000-8000-000000000272",
        "00000000-0000-4000-8000-000000000273",
      ],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const initialComposition = await createE2eHmrCompositionV1({ resolved, host });
    const root = Object.freeze({ replaceChildren: vi.fn() }) as unknown as Element;
    const hot = createHotFixtureV1<E2eEntryHmrModuleV1>();
    const dispositions: PersistenceRebootstrapDisposalV1[] = [];
    const compositions: E2eApplicationCompositionV1[] = [];
    let boundaryAttempt = 0;
    let compositionAttempt = 0;
    const acceptedModule = createAcceptedE2eHmrModuleV1({
      resolved,
      provenance: changedPresentationProvenanceV1(resolved.provenance),
      dispositions,
      compositions,
      afterComposition() {
        compositionAttempt += 1;
        if (compositionAttempt === 1) controlled.failNextLeaseCommit();
      },
      install() {
        boundaryAttempt += 1;
        if (boundaryAttempt === 1) throw new Error("injected next-boundary failure");
        return completedHmrInstallationV1();
      },
    });
    const installation = installE2eApplicationHmrV1({
      state: Object.freeze({
        root,
        host,
        composition: initialComposition,
        mounted: Object.freeze({ unmount: vi.fn() }),
      }),
      hot: hot.hot,
      mountComposition(rootValue, hostValue, composition) {
        return Object.freeze({
          root: rootValue,
          host: hostValue,
          composition,
          mounted: Object.freeze({ unmount: vi.fn() }),
        });
      },
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();
    hot.emit(acceptedModule);
    await installation.waitForTransition();

    expect(dispositions).toEqual([
      expect.objectContaining({
        ownership: "released",
        fence: expect.objectContaining({ fencingToken: 1 }),
      }),
      { ownership: "read_only", code: "lease_release_failed", fence: null },
    ]);
    await expect(compositions[1]?.application.persistence.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(compositions[1]?.application.persistence.save("manual")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
  });

  it("keeps the replacement read-only with a stable code when explicit takeover fails", async () => {
    const controlled = createFailNextLeaseCommitStoreV1();
    const host = createWebHostV1({
      records: controlled.records,
      seeds: [0x0002_3049, 0x0002_3050],
      uuids: ["00000000-0000-4000-8000-000000000221", "00000000-0000-4000-8000-000000000222"],
      now: () => "2026-07-14T04:05:06.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    let oldLifecycle: E2eRebootstrapLifecycleV1 | undefined;
    const oldApplication = await createE2eGameRuntimeV1({
      resolved,
      host,
      onRebootstrapLifecycle(value) {
        oldLifecycle = value;
      },
    });
    oldLifecycle?.invalidationController.invalidateForHmr();
    const disposition = await oldLifecycle?.disposeForRebootstrap();
    if (disposition === undefined) throw new TypeError("missing old HMR disposition");

    controlled.failNextLeaseCommit();
    const replacement = await createE2eGameRuntimeV1({
      resolved,
      host,
      rebootstrapDisposition: disposition,
      onRebootstrapLifecycle() {},
    });
    await expect(replacement.persistence.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.persistence.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.persistence.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
    await expect(oldApplication.persistence.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
  });

  it("routes HMR through the same entry factory, source entry, HTML root, and Vite mode", async () => {
    const repositoryRoot = existsSync(resolve(process.cwd(), "vite.config.ts"))
      ? process.cwd()
      : resolve(process.cwd(), "../../..");
    const entrySource = await readFile(
      resolve(repositoryRoot, "game/stories/e2e/src/application/entry.tsx"),
      "utf8",
    );
    expect(entrySource).toContain("export async function createE2eApplicationCompositionV1");
    expect(entrySource).toContain("import.meta.hot.accept((module) => {");
    expect(entrySource).toContain("module.createE2eApplicationCompositionV1({");
    expect(entrySource).toContain(
      "mountComposition(input.state.root, input.state.host, composition)",
    );
    expect(entrySource).toContain("module.installE2eApplicationHmrV1({ state: input.state })");
    expect(entrySource).toContain("presentationRuntime: E2ePresentationRuntimeV1");
    expect(entrySource).toContain("composition.presentationRuntime.dispose()");
    expect(entrySource).not.toContain("此入口不可用");
    expect(entrySource).not.toContain('addEventListener("hashchange"');
    expect(entrySource).toContain('databaseName: "project-tavern.e2e.runtime"');
    expect(entrySource).toContain(
      "nativeEntryHotV1.data[acceptedE2eEntryModuleHandlerKeyV1] = handler",
    );
    expect(entrySource).toContain("import.meta.hot?.data[acceptedE2eEntryModuleHandlerKeyV1]");

    const applicationFiles = await readdir(
      resolve(repositoryRoot, "game/stories/e2e/src/application"),
    );
    expect(applicationFiles).not.toContain("developer-entry.tsx");
    expect(applicationFiles).not.toContain("player-entry.tsx");
    const storyRootFiles = await readdir(resolve(repositoryRoot, "game/stories/e2e"));
    expect(storyRootFiles.filter((path) => path.endsWith(".html"))).toEqual(["index.html"]);
    const viteSource = await readFile(resolve(repositoryRoot, "vite.config.ts"), "utf8");
    expect(viteSource.match(/"e2e-web"/gu)).toHaveLength(1);
    expect(viteSource).not.toMatch(/developer-web|player-web/gu);
  });
});
