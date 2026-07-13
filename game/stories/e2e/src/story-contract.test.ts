// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  defineGamePackage,
  digestCanonical,
  parsePositiveSafeInteger,
  parseTextCatalogSetV1,
  parseTextId,
  resolveGamePackageV1,
} from "@sillymaker/base";
import type {
  GamePackageResolutionResultV1,
  HotfixEntryV1,
  TextCatalogSetV1,
  TextId,
} from "@sillymaker/base";
import { createFixedBootstrapEntropyV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import {
  e2ePresentationPatchSurfaceV1,
  e2eTextCatalogSlotV1,
} from "./presentation/presentation-program.js";
import {
  e2eContentPreferenceRejectedTextIdV1,
  e2eContentPreferenceStorageFailedTextIdV1,
  e2eTextCatalogsV1,
} from "./presentation/text-catalogs.js";
import { e2eSceneGraphV1 } from "./presentation/scene-graph.js";
import { createE2eSessionV1 } from "./session.js";
import { choiceDeltaHotfixV1, e2eSimulationPatchSurfaceV1 } from "./simulation/patch-surfaces.js";
import { e2eStateContractManifestV1 } from "./story-definition.js";
import { e2eStoryEntryV1 } from "./story-entry.js";
import type { E2eResolvedGameV1 } from "./story-entry.js";

type E2eHotfixV1 = HotfixEntryV1<
  typeof e2eSimulationPatchSurfaceV1,
  typeof e2ePresentationPatchSurfaceV1
>;

const emptyBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker E2E contract-test",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

function catalogWithoutTextIdV1(textId: TextId): TextCatalogSetV1 {
  return parseTextCatalogSetV1({
    defaultLocale: e2eTextCatalogsV1.defaultLocale,
    catalogs: e2eTextCatalogsV1.catalogs.map((catalog) => ({
      locale: catalog.locale,
      fallbackLocale: catalog.fallbackLocale,
      entries: catalog.entries
        .filter((entry) => entry.textId !== textId)
        .map((entry) => ({ textId: entry.textId, text: entry.text })),
    })),
  });
}

function resolveE2eStoryWithPresentationFixtureV1(textCatalogs: TextCatalogSetV1) {
  const sourceDefinition = e2eStoryEntryV1.define();
  const materializedPresentation = Object.freeze({ textCatalogs });
  const materializePresentation = () => materializedPresentation;
  const definition = Object.freeze({
    ...sourceDefinition,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      materializePresentation,
    }),
  });
  const entry = defineGamePackage({
    contractRevision: 1 as const,
    identity: e2eStoryEntryV1.identity,
    define: () => definition,
  });
  return resolveGamePackageV1(entry, [], emptyBuildIdentityV1);
}

function requireResolvedV1<TResolved>(result: GamePackageResolutionResultV1<TResolved>): TResolved {
  if (result.kind === "failed") {
    throw new TypeError(
      `${result.failure.code}: ${String(result.failure.details.message ?? "resolution failed")}`,
    );
  }
  return result.resolved;
}

function resolveE2ePackageV1(hotfixes: readonly E2eHotfixV1[]) {
  return resolveGamePackageV1(e2eStoryEntryV1, hotfixes, emptyBuildIdentityV1);
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
      targetStoryId: "story.e2e",
      targetStoryRevision: parsePositiveSafeInteger(1),
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
  id: "hotfix.e2e.terminal-threshold",
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
  id: "hotfix.e2e.text-catalog",
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
  id: "hotfix.e2e.unknown-symbol",
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
  id: "hotfix.e2e.provider-mismatch",
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
  id: "hotfix.e2e.choice-delta-collision",
  targets: Object.freeze([
    Object.freeze({
      surface: "simulation" as const,
      symbolId: "e2e.rule.choice-delta",
      expectedProviderDigest: choiceDeltaHotfixNextProviderDigestV1,
    }),
  ]),
  supersedes: Object.freeze([]),
  install(context) {
    context.simulation.replace("e2e.rule.choice-delta", (choice) =>
      parsePositiveSafeInteger(choice === "left" ? 1 : 4),
    );
  },
});

function readResolvedE2eTextV1(resolved: E2eResolvedGameV1, textId: TextId): string {
  const presentation = resolved.presentation;
  const catalog = presentation.textCatalogs.catalogs.find(
    (candidate) => candidate.locale === presentation.textCatalogs.defaultLocale,
  );
  return catalog?.entries.find((entry) => entry.textId === textId)?.text ?? "";
}

describe("E2e Story contract", () => {
  it("resolves one complete E2E game from the public Story entry", () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);

    expect(resolved.provenance.story.id).toBe("story.e2e");
    expect(resolved.gameSimulation.modules.map((module) => module.descriptor.id)).toEqual([
      "e2e.counter",
      "e2e.flow",
      "e2e.run",
      "e2e.choice-delta-resolver",
    ]);
    expect(resolved.sceneGraph).toStrictEqual(e2eSceneGraphV1);
    expect(resolved.sceneGraph.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
      "stage_scene.e2e.main",
      "stage_scene.e2e.summary",
    ]);
    expect(resolved.sceneGraph.interactionSurfaces.map((surface) => surface.surfaceId)).toEqual([
      "surface.e2e.counter",
    ]);
    expect(resolved.sceneGraph.contentMaturityPolicy.flags).toHaveLength(2);
    expect(resolved.sceneGraph.contentMaturityPolicy.defaultAllowedFlags).toBe(0);
    expect(
      resolved.assets.assets.find((asset) => asset.assetId === "asset.e2e.background.base"),
    ).toMatchObject({ delivery: "code_fallback" });
    expect(
      resolved.assets.assets.find((asset) => asset.assetId === "asset.e2e.character.base"),
    ).toMatchObject({ delivery: "code_fallback" });
    expect(resolved.presentation).toHaveProperty("textCatalogs");
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it.each([
    ["flag", "text.e2e.content_flag.alpha.name"],
    ["preset", "text.e2e.content_preset.base.name"],
  ] as const)(
    "rejects a resolved %s TextId absent from the active TextCatalog",
    (_kind, missingTextId) => {
      expect(
        resolveE2eStoryWithPresentationFixtureV1(
          catalogWithoutTextIdV1(parseTextId(missingTextId)),
        ),
      ).toMatchObject({
        kind: "failed",
        failure: {
          code: "story.presentation_invalid",
          details: { message: expect.stringContaining("presentation.catalog.missing_reference") },
        },
      });
    },
  );

  it("resolves the two settings failure TextIds from the same neutral catalog", () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);

    expect(readResolvedE2eTextV1(resolved, e2eContentPreferenceRejectedTextIdV1).trim()).not.toBe(
      "",
    );
    expect(
      readResolvedE2eTextV1(resolved, e2eContentPreferenceStorageFailedTextIdV1).trim(),
    ).not.toBe("");
  });

  it("keeps tooling out of Story define and simulation identity", () => {
    expect(e2eStoryEntryV1).not.toHaveProperty("tooling");
    const first = resolveStoryForTestV1(e2eStoryEntryV1);
    const second = resolveStoryForTestV1(e2eStoryEntryV1);

    expect(first.provenance.resolved.simulationDigest).toBe(
      second.provenance.resolved.simulationDigest,
    );
  });

  it("binds the complete persisted Flow node reference set into state-contract identity", () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const withoutFlowNodeReferences = Object.freeze({
      ...e2eStateContractManifestV1,
      stableReferenceSets: Object.freeze([]),
    });

    expect(e2eStateContractManifestV1.stableReferenceSets).toEqual([
      {
        setId: "references.e2e.flow-node",
        ids: [
          "flow_node.e2e.choice",
          "flow_node.e2e.done",
          "flow_node.e2e.intro",
          "flow_node.e2e.left",
          "flow_node.e2e.rejoin",
          "flow_node.e2e.right",
        ],
      },
    ]);
    expect(resolved.provenance.resolved.stateContractDigest).toBe(
      digestCanonical("sillymaker:state-contract:v1", {
        story: e2eStoryEntryV1.identity,
        revision: parsePositiveSafeInteger(1),
        manifest: e2eStateContractManifestV1,
      }),
    );
    expect(
      digestCanonical("sillymaker:state-contract:v1", {
        story: e2eStoryEntryV1.identity,
        revision: parsePositiveSafeInteger(1),
        manifest: withoutFlowNodeReferences,
      }),
    ).not.toBe(resolved.provenance.resolved.stateContractDigest);
  });

  it("partitions rule and value Hotfixes into simulation identity only", async () => {
    const base = requireResolvedV1(resolveE2ePackageV1([]));
    const rulePatched = requireResolvedV1(resolveE2ePackageV1([choiceDeltaHotfixV1]));
    const valuePatched = requireResolvedV1(resolveE2ePackageV1([terminalThresholdHotfixV1]));

    for (const patched of [rulePatched, valuePatched]) {
      expect(patched.provenance.resolved.stateContractDigest).toBe(
        base.provenance.resolved.stateContractDigest,
      );
      expect(patched.provenance.resolved.simulationDigest).not.toBe(
        base.provenance.resolved.simulationDigest,
      );
      expect(patched.provenance.resolved.presentationDigest).toBe(
        base.provenance.resolved.presentationDigest,
      );
    }

    const entropy = createFixedBootstrapEntropyV1({ uuids: [], seeds: [0x0002_3049] });
    const session = createE2eSessionV1(
      rulePatched.gameSimulation,
      rulePatched.gameSimulation.createBootstrapInput(entropy),
    );
    await session.dispatch({ kind: "e2e.flow.start" });
    await session.dispatch({ kind: "e2e.flow.choose", choice: "right" });
    expect(session.getCurrentSnapshot().state.simulation.counter.value).toBe(3);
  });

  it("partitions a complete TextCatalog Hotfix into presentation identity only", () => {
    const base = requireResolvedV1(resolveE2ePackageV1([]));
    const patched = requireResolvedV1(resolveE2ePackageV1([textCatalogHotfixV1]));

    expect(patched.provenance.resolved.stateContractDigest).toBe(
      base.provenance.resolved.stateContractDigest,
    );
    expect(patched.provenance.resolved.simulationDigest).toBe(
      base.provenance.resolved.simulationDigest,
    );
    expect(patched.provenance.resolved.presentationDigest).not.toBe(
      base.provenance.resolved.presentationDigest,
    );
    expect(readResolvedE2eTextV1(patched, parseTextId("text.e2e.counter"))).toBe("热修复计数");
  });

  it.each([
    ["hotfix.unknown_symbol", [unknownSymbolHotfixV1]],
    ["hotfix.provider_mismatch", [providerMismatchHotfixV1]],
    ["hotfix.collision", [choiceDeltaHotfixV1, collidingChoiceDeltaHotfixV1]],
  ] as const)("returns stable %s resolution failures", (code, hotfixes) => {
    const result = resolveE2ePackageV1(hotfixes);

    expect(result).toMatchObject({
      kind: "failed",
      failure: {
        code,
        rejectedHotfixIds: hotfixes.map((hotfix) => hotfix.manifest.identity.id),
      },
    });
  });
});
