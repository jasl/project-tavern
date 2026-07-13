// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import {
  digestCanonical,
  parsePositiveSafeInteger,
  parseTextCatalogSetV1,
  resolveGamePackageV1,
} from "@sillymaker/base";
import type { HotfixEntryV1, TextCatalogSetV1 } from "@sillymaker/base";
import { createGameBootstrapControllerV1, createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import {
  e2ePresentationPatchSurfaceV1,
  e2eTextCatalogSlotV1,
} from "../presentation/presentation-program.js";
import { e2eTextCatalogsV1 } from "../presentation/text-catalogs.js";
import { choiceDeltaHotfixV1, e2eSimulationPatchSurfaceV1 } from "../simulation/patch-surfaces.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

type E2eHotfixV1 = HotfixEntryV1<
  typeof e2eSimulationPatchSurfaceV1,
  typeof e2ePresentationPatchSurfaceV1
>;

const testBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker E2E Hotfix integration-test",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

function createHostV1() {
  return createWebHostV1({
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
    now: () => "2026-07-12T00:00:00.000Z",
  });
}

function resolveE2eGameV1(hotfixes: readonly E2eHotfixV1[]): E2eResolvedGameV1 {
  const result = resolveGamePackageV1(e2eStoryEntryV1, hotfixes, testBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(
      `${result.failure.code}: ${String(result.failure.details.message ?? "resolution failed")}`,
    );
  }
  return result.resolved;
}

async function playRightBranchV1(resolved: E2eResolvedGameV1) {
  const application = createE2eGameRuntimeV1({ resolved, host: createHostV1() });
  await expect(
    application.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} }),
  ).resolves.toEqual({ kind: "committed" });
  await expect(
    application.semantic.dispatch({
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    }),
  ).resolves.toEqual({ kind: "committed" });
  return application.semantic.observe();
}

async function playRightBranchToResolvedV1(resolved: E2eResolvedGameV1) {
  const application = createE2eGameRuntimeV1({ resolved, host: createHostV1() });
  await application.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} });
  await application.semantic.dispatch({
    actionId: "action.e2e.choose",
    parameters: { choice: "right" },
  });
  await expect(
    application.semantic.dispatch({ actionId: "action.e2e.continue", parameters: {} }),
  ).resolves.toEqual({ kind: "committed" });
  return application.semantic.observe();
}

function createE2eHotfixV1(input: {
  readonly id: string;
  readonly targets: E2eHotfixV1["manifest"]["targets"];
  readonly supersedes?: readonly string[];
  readonly install: E2eHotfixV1["install"];
}): E2eHotfixV1 {
  return Object.freeze({
    manifest: Object.freeze({
      identity: Object.freeze({ id: input.id, revision: parsePositiveSafeInteger(1) }),
      targetStoryId: e2eStoryEntryV1.identity.id,
      targetStoryRevision: e2eStoryEntryV1.identity.revision,
      targets: Object.freeze([...input.targets]),
      requires: Object.freeze([]),
      conflicts: Object.freeze([]),
      supersedes: Object.freeze([...(input.supersedes ?? [])]),
    }),
    sourceDigest: digestCanonical("sillymaker:hotfix:v1", {
      id: input.id,
      revision: 1,
    }),
    install: input.install,
  });
}

function textCatalogWithChangedCounterV1(): TextCatalogSetV1 {
  return parseTextCatalogSetV1({
    defaultLocale: e2eTextCatalogsV1.defaultLocale,
    catalogs: e2eTextCatalogsV1.catalogs.map((catalog) => ({
      locale: catalog.locale,
      fallbackLocale: catalog.fallbackLocale,
      entries: catalog.entries.map((entry) => ({
        textId: entry.textId,
        text: entry.textId === "text.e2e.counter" ? "热修复计数" : entry.text,
      })),
    })),
  });
}

const terminalThresholdHotfixV1 = createE2eHotfixV1({
  id: "hotfix.e2e.terminal-threshold.integration",
  targets: Object.freeze([
    Object.freeze({
      surface: "simulation" as const,
      symbolId: "e2e.value.terminal-threshold",
      expectedProviderDigest:
        e2eSimulationPatchSurfaceV1.slots.terminalThreshold.defaultProviderSourceDigest,
    }),
  ]),
  install(context) {
    context.simulation.replace("e2e.value.terminal-threshold", parsePositiveSafeInteger(3));
  },
});

const textCatalogHotfixV1 = createE2eHotfixV1({
  id: "hotfix.e2e.text-catalog.integration",
  targets: Object.freeze([
    Object.freeze({
      surface: "presentation" as const,
      symbolId: "text.catalogs",
      expectedProviderDigest: e2eTextCatalogSlotV1.defaultProviderSourceDigest,
    }),
  ]),
  install(context) {
    context.presentation.replace("text.catalogs", textCatalogWithChangedCounterV1());
  },
});

const unknownSymbolHotfixV1 = createE2eHotfixV1({
  id: "hotfix.e2e.unknown-symbol.integration",
  targets: Object.freeze([
    Object.freeze({
      surface: "simulation" as const,
      symbolId: "e2e.rule.unknown",
      expectedProviderDigest: digestCanonical("sillymaker:patch-provider:v1", {
        source: "unknown",
      }),
    }),
  ]),
  install(context) {
    Reflect.apply(context.simulation.replace, context.simulation, [
      "e2e.rule.unknown",
      (choice: "left" | "right") => parsePositiveSafeInteger(choice === "left" ? 1 : 4),
    ]);
  },
});

const providerMismatchHotfixV1 = createE2eHotfixV1({
  id: "hotfix.e2e.provider-mismatch.integration",
  targets: Object.freeze([
    Object.freeze({
      surface: "simulation" as const,
      symbolId: "e2e.value.terminal-threshold",
      expectedProviderDigest: digestCanonical("sillymaker:patch-provider:v1", {
        source: "wrong-provider",
      }),
    }),
  ]),
  install(context) {
    context.simulation.replace("e2e.value.terminal-threshold", parsePositiveSafeInteger(3));
  },
});

const choiceDeltaHotfixNextProviderDigestV1 = digestCanonical("sillymaker:patch-provider:v1", {
  hotfixDigest: choiceDeltaHotfixV1.sourceDigest,
  surface: "simulation",
  symbolId: "e2e.rule.choice-delta",
  replacementOrdinal: 1,
});

const collidingChoiceDeltaHotfixV1 = createE2eHotfixV1({
  id: "hotfix.e2e.choice-delta-collision.integration",
  targets: Object.freeze([
    Object.freeze({
      surface: "simulation" as const,
      symbolId: "e2e.rule.choice-delta",
      expectedProviderDigest: choiceDeltaHotfixNextProviderDigestV1,
    }),
  ]),
  install(context) {
    context.simulation.replace("e2e.rule.choice-delta", (choice) =>
      parsePositiveSafeInteger(choice === "left" ? 1 : 4),
    );
  },
});

function readDefaultTextV1(resolved: E2eResolvedGameV1, textId: string): string {
  const textCatalogs = resolved.presentation.textCatalogs;
  const defaultCatalog = textCatalogs.catalogs.find(
    (catalog) => catalog.locale === textCatalogs.defaultLocale,
  );
  return defaultCatalog?.entries.find((entry) => entry.textId === textId)?.text ?? "";
}

function createBootstrapFixtureV1() {
  const host = createHostV1();
  const bootstrap = createGameBootstrapControllerV1({
    host,
    buildIdentity: testBuildIdentityV1,
  });
  const createRuntime = vi.fn((resolved: E2eResolvedGameV1) =>
    createE2eGameRuntimeV1({ resolved, host }),
  );
  return Object.freeze({
    bootstrap: (hotfixes: readonly E2eHotfixV1[]) => bootstrap(e2eStoryEntryV1, hotfixes),
    createRuntime,
  });
}

const safeModeCasesV1 = [
  {
    label: "duplicate ID",
    code: "hotfix.duplicate_id",
    hotfixes: Object.freeze([choiceDeltaHotfixV1, choiceDeltaHotfixV1]),
    rejectedHotfixIds: Object.freeze([choiceDeltaHotfixV1.manifest.identity.id]),
  },
  {
    label: "collision",
    code: "hotfix.collision",
    hotfixes: Object.freeze([choiceDeltaHotfixV1, collidingChoiceDeltaHotfixV1]),
    rejectedHotfixIds: Object.freeze([
      choiceDeltaHotfixV1.manifest.identity.id,
      collidingChoiceDeltaHotfixV1.manifest.identity.id,
    ]),
  },
  {
    label: "unknown symbol",
    code: "hotfix.unknown_symbol",
    hotfixes: Object.freeze([unknownSymbolHotfixV1]),
    rejectedHotfixIds: Object.freeze([unknownSymbolHotfixV1.manifest.identity.id]),
  },
  {
    label: "provider mismatch",
    code: "hotfix.provider_mismatch",
    hotfixes: Object.freeze([providerMismatchHotfixV1]),
    rejectedHotfixIds: Object.freeze([providerMismatchHotfixV1.manifest.identity.id]),
  },
] as const;

describe("E2E Hotfix integration", () => {
  it("changes behavior and simulation identity for an official rule patch", async () => {
    const base = resolveE2eGameV1([]);
    const patched = resolveE2eGameV1([choiceDeltaHotfixV1]);

    expect(patched.provenance.resolved.simulationDigest).not.toBe(
      base.provenance.resolved.simulationDigest,
    );
    expect(patched.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(patched.provenance.resolved.presentationDigest).toBe(
      base.provenance.resolved.presentationDigest,
    );
    expect(await playRightBranchV1(patched)).toMatchObject({
      game: { counterLabel: "计数 3" },
    });
  });

  it("changes completion behavior and simulation identity for a value patch", async () => {
    const base = resolveE2eGameV1([]);
    const patched = resolveE2eGameV1([terminalThresholdHotfixV1]);

    expect(patched.simulationProgram.values.terminalThreshold).toBe(3);
    expect(patched.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(patched.provenance.resolved.simulationDigest).not.toBe(
      base.provenance.resolved.simulationDigest,
    );
    expect(patched.provenance.resolved.presentationDigest).toBe(
      base.provenance.resolved.presentationDigest,
    );

    const basePublication = await playRightBranchToResolvedV1(base);
    const patchedPublication = await playRightBranchToResolvedV1(patched);
    expect(
      basePublication.actions.find((action) => action.actionId === "action.e2e.complete"),
    ).toMatchObject({ enabled: true, reasons: [] });
    expect(
      patchedPublication.actions.find((action) => action.actionId === "action.e2e.complete"),
    ).toMatchObject({
      enabled: false,
      reasons: [{ code: "run.not_terminal" }],
    });
  });

  it("partitions a text-only patch into presentation identity", () => {
    const base = resolveE2eGameV1([]);
    const patched = resolveE2eGameV1([textCatalogHotfixV1]);

    expect(patched.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(patched.provenance.resolved.simulationDigest).toBe(
      base.provenance.resolved.simulationDigest,
    );
    expect(patched.provenance.resolved.presentationDigest).not.toBe(
      base.provenance.resolved.presentationDigest,
    );
    expect(readDefaultTextV1(patched, "text.e2e.counter")).toBe("热修复计数");
  });

  it("keeps a no-Hotfix bootstrap ready result on one base identity until Session creation", async () => {
    const fixture = createBootstrapFixtureV1();
    const result = await fixture.bootstrap([]);

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new TypeError("expected ready bootstrap");
    expect(result.base).toBe(result.resolved);
    expect(fixture.createRuntime).not.toHaveBeenCalled();

    const application = fixture.createRuntime(result.resolved);
    expect(fixture.createRuntime).toHaveBeenCalledTimes(1);
    expect(application.semantic.observe()).toMatchObject({
      game: { counterLabel: "计数 0" },
    });
  });

  it("creates a Session only after selecting a successful patched candidate", async () => {
    const fixture = createBootstrapFixtureV1();
    const result = await fixture.bootstrap([choiceDeltaHotfixV1]);

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new TypeError("expected ready bootstrap");
    expect(result.base).not.toBe(result.resolved);
    expect(fixture.createRuntime).not.toHaveBeenCalled();

    const application = fixture.createRuntime(result.resolved);
    expect(fixture.createRuntime).toHaveBeenCalledTimes(1);
    await application.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} });
    await application.semantic.dispatch({
      actionId: "action.e2e.choose",
      parameters: { choice: "right" },
    });
    expect(application.semantic.observe()).toMatchObject({
      game: { counterLabel: "计数 3" },
    });
  });

  it.each(safeModeCasesV1)(
    "returns the same runnable base in safe mode for $label",
    async ({ code, hotfixes, rejectedHotfixIds }) => {
      const fixture = createBootstrapFixtureV1();
      const result = await fixture.bootstrap(hotfixes);

      expect(result).toMatchObject({
        kind: "safe_mode",
        code,
        rejectedHotfixIds,
      });
      if (result.kind !== "safe_mode") throw new TypeError("expected safe-mode bootstrap");
      expect(result.base).toBe(result.resolved);
      expect(fixture.createRuntime).not.toHaveBeenCalled();

      const application = fixture.createRuntime(result.base);
      expect(fixture.createRuntime).toHaveBeenCalledTimes(1);
      await application.semantic.dispatch({ actionId: "action.e2e.start", parameters: {} });
      await application.semantic.dispatch({
        actionId: "action.e2e.choose",
        parameters: { choice: "right" },
      });
      expect(application.semantic.observe()).toMatchObject({
        game: { counterLabel: "计数 2" },
      });
    },
  );
});
