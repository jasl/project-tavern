// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "../contracts/digest.js";
import { parseStageSceneGraphV1 } from "../contracts/presentation.js";
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "../contracts/values.js";
import {
  createSyntheticCounterGamePackageV1,
  createSyntheticStageSceneGraphV1,
} from "../testkit/synthetic-counter.js";
import { deterministicBuildIdentityInputV1 } from "../testkit/resolver-fixtures.js";
import { definePatchSlot, definePresentationPatchSurface } from "./patch-surface.js";
import { resolveGamePackageV1 } from "./story-resolver.js";

function createCountingGamePackage() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const calls = {
    define: 0,
    simulationMaterializer: 0,
    presentationMaterializer: 0,
    createGameSimulation: 0,
  };
  const materializeProgram = (
    values: Parameters<typeof sourceDefinition.simulation.materializeProgram>[0],
  ) => {
    calls.simulationMaterializer += 1;
    return sourceDefinition.simulation.materializeProgram(values);
  };
  const createGameSimulation = (
    program: Parameters<typeof sourceDefinition.simulation.createGameSimulation>[0],
  ) => {
    calls.createGameSimulation += 1;
    return sourceDefinition.simulation.createGameSimulation(program);
  };
  const materializePresentation = (
    values: Parameters<typeof sourceDefinition.presentation.materializePresentation>[0],
  ) => {
    calls.presentationMaterializer += 1;
    return sourceDefinition.presentation.materializePresentation(values);
  };
  const definition = Object.freeze({
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      materializeProgram,
      createGameSimulation,
    }),
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      materializePresentation,
    }),
  });
  return {
    entry: Object.freeze({
      ...source,
      define() {
        calls.define += 1;
        return definition;
      },
    }),
    calls: () => ({ ...calls }),
  };
}

const namedRuleCalls = { rule: 0, resolver: 0 };
function stableNamedRule() {
  namedRuleCalls.rule += 1;
}
function stableNamedResolver() {
  namedRuleCalls.resolver += 1;
}

function createPackageWithRuleDefinitions(
  firstRules: Readonly<Record<string, unknown>>,
  secondRules: Readonly<Record<string, unknown>> = firstRules,
) {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  let defineCalls = 0;
  return Object.freeze({
    ...source,
    define() {
      defineCalls += 1;
      return Object.freeze({
        ...sourceDefinition,
        simulation: Object.freeze({
          ...sourceDefinition.simulation,
          rules: defineCalls === 1 ? firstRules : secondRules,
        }),
      });
    },
  });
}

function createSyntheticStateContractManifestV1(
  aggregateSchemaRevision = 1,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    contractRevision: 1,
    aggregateStateSchema: Object.freeze({
      schemaId: "schema.synthetic.game-state",
      revision: parsePositiveSafeInteger(aggregateSchemaRevision),
    }),
    moduleStateSchemas: Object.freeze([
      Object.freeze({
        moduleId: parseModuleId("synthetic.counter"),
        moduleContractRevision: parsePositiveSafeInteger(1),
        stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
        stateSchema: Object.freeze({
          schemaId: "schema.synthetic.counter-state",
          revision: parsePositiveSafeInteger(1),
        }),
      }),
    ]),
    persistentIrSchemas: Object.freeze([]),
    stableReferenceSets: Object.freeze([]),
  });
}

function createPackageWithStateContractManifest(
  manifest: unknown,
  rules?: Readonly<Record<string, unknown>>,
) {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const definition = Object.freeze({
    ...sourceDefinition,
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      stateContractManifest: manifest,
      ...(rules === undefined ? {} : { rules }),
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

function createPackageWithStateContractRevision(revision: number) {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const definition = Object.freeze({
    ...sourceDefinition,
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      stateContractRevision: parsePositiveSafeInteger(revision),
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

function createPackageWithAliasedMutatingStateContractManifest() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const aggregateStateSchema = {
    schemaId: "schema.synthetic.game-state",
    revision: parsePositiveSafeInteger(1),
  };
  const manifest = {
    contractRevision: 1,
    aggregateStateSchema,
    moduleStateSchemas: [
      {
        moduleId: parseModuleId("synthetic.counter"),
        moduleContractRevision: parsePositiveSafeInteger(1),
        stateSlots: [parseStateSlotId("simulation.counter")],
        stateSchema: {
          schemaId: "schema.synthetic.counter-state",
          revision: parsePositiveSafeInteger(1),
        },
      },
    ],
    persistentIrSchemas: [],
    stableReferenceSets: [],
  };
  let defineCalls = 0;
  return Object.freeze({
    ...source,
    define() {
      defineCalls += 1;
      if (defineCalls === 2) {
        aggregateStateSchema.revision = parsePositiveSafeInteger(2);
      }
      return Object.freeze({
        ...sourceDefinition,
        simulation: Object.freeze({
          ...sourceDefinition.simulation,
          stateContractManifest: manifest,
        }),
      });
    },
  });
}

function createPackageWithAliasedMutatingRules() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const rules = { formulaRevision: parsePositiveSafeInteger(1) };
  let defineCalls = 0;
  return Object.freeze({
    ...source,
    define() {
      defineCalls += 1;
      if (defineCalls === 2) rules.formulaRevision = parsePositiveSafeInteger(2);
      return Object.freeze({
        ...sourceDefinition,
        simulation: Object.freeze({ ...sourceDefinition.simulation, rules }),
      });
    },
  });
}

function createStateContractManifestWithAccessorReferenceIds() {
  let getterCalls = 0;
  const ids: unknown[] = [];
  Object.defineProperty(ids, 0, {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "scene.synthetic.counter";
    },
  });
  Object.freeze(ids);
  return {
    manifest: Object.freeze({
      ...createSyntheticStateContractManifestV1(),
      stableReferenceSets: Object.freeze([
        Object.freeze({ setId: "references.synthetic.scene", ids }),
      ]),
    }),
    getterCalls: () => getterCalls,
  };
}

function createSparseStateContractArrayV1(): readonly unknown[] {
  const values: unknown[] = [];
  values.length = 1;
  return Object.freeze(values);
}

function executableProvider(providerId: string, sourceByte: number, provider: () => void) {
  return Object.freeze({
    providerId,
    sourceDigest: digestBytes(Uint8Array.of(sourceByte)),
    provider,
  });
}

function createPackageWithPresentationValues(
  sceneGraph: ReturnType<typeof createSyntheticStageSceneGraphV1>,
  presentation: Readonly<Record<string, unknown>>,
) {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const materializePresentation = () =>
    Object.freeze({ textCatalogs: sourceDefinition.presentation.textCatalogs, ...presentation });
  const definition = Object.freeze({
    ...sourceDefinition,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      uiSceneGraph: sceneGraph,
      materializePresentation,
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

const textJoinReferencesV1 = Object.freeze([
  "text.synthetic.stage.name",
  "text.synthetic.character.name",
  "text.synthetic.surface.name",
  "text.synthetic.target.name",
  "text.synthetic.behavior.name",
  "text.synthetic.behavior.description",
  "text.synthetic.content_flag.name",
  "text.synthetic.content_flag.description",
  "text.synthetic.content_preset.name",
  "text.synthetic.content_preset.description",
] as const);

function createTextJoinCatalogSetV1(excludedTextId?: (typeof textJoinReferencesV1)[number]) {
  return {
    defaultLocale: "zh-CN",
    catalogs: [
      {
        locale: "zh-CN",
        fallbackLocale: null,
        entries: textJoinReferencesV1
          .filter((textId) => textId !== excludedTextId)
          .map((textId) => ({ textId, text: `resolved:${textId}` })),
      },
    ],
  };
}

function createTextJoinSceneGraphV1() {
  const base = createSyntheticStageSceneGraphV1();
  return parseStageSceneGraphV1({
    ...base,
    variants: base.variants.map((variant) => ({
      ...variant,
      interactionSurfaces: [
        {
          surfaceId: "surface.synthetic.stage",
          anchor: { x: 0.5, y: 0.5 },
        },
      ],
    })),
    characterRigs: base.characterRigs.map((rig) => ({
      ...rig,
      defaultHitMapId: "hit_map.synthetic.figure",
      poseHitMapOverrides: [
        {
          poseId: "character_pose.synthetic.idle",
          hitMapId: "hit_map.synthetic.figure",
        },
      ],
    })),
    hitMaps: [
      {
        hitMapId: "hit_map.synthetic.figure",
        rigId: "character_rig.synthetic.figure",
        poseId: "character_pose.synthetic.idle",
        targets: [
          {
            areaId: "hit_area.synthetic.figure",
            targetId: "target.synthetic.figure",
            shape: { kind: "rect", x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
            priority: 1,
          },
        ],
      },
    ],
    interactionSurfaces: [
      {
        surfaceId: "surface.synthetic.stage",
        accessibleNameTextId: "text.synthetic.surface.name",
        allowedEntryModes: ["surface_activation"],
        targetBindings: [
          {
            targetId: "target.synthetic.figure",
            allowedResolutionModes: ["direct"],
            openSurfaceId: null,
          },
        ],
      },
    ],
    interactionTargets: [
      {
        targetId: "target.synthetic.figure",
        accessibleNameTextId: "text.synthetic.target.name",
        behaviorIds: ["behavior.synthetic.inspect"],
      },
    ],
    interactionBehaviors: [
      {
        behaviorId: "behavior.synthetic.inspect",
        nameTextId: "text.synthetic.behavior.name",
        descriptionTextId: "text.synthetic.behavior.description",
        providerId: "provider.synthetic.inspect",
        content: { requiredFlags: 0 },
      },
    ],
    contentMaturityPolicy: {
      policyRevision: 1,
      flags: [
        {
          id: "content_flag.synthetic.alpha",
          flag: 1,
          nameTextId: "text.synthetic.content_flag.name",
          descriptionTextId: "text.synthetic.content_flag.description",
        },
      ],
      presets: [
        {
          presetId: "content_preset.synthetic.alpha",
          allowedFlags: 1,
          nameTextId: "text.synthetic.content_preset.name",
          descriptionTextId: "text.synthetic.content_preset.description",
        },
      ],
      defaultAllowedFlags: 0,
    },
  });
}

function createPackageWithTextCatalogsV1(
  sourceTextCatalogs: unknown,
  materializedTextCatalogs: unknown,
) {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const definition = Object.freeze({
    ...sourceDefinition,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      uiSceneGraph: createTextJoinSceneGraphV1(),
      textCatalogs: sourceTextCatalogs,
      materializePresentation: () => ({
        kind: "synthetic-presentation" as const,
        textCatalogs: materializedTextCatalogs,
      }),
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

function createPackageWithInvalidGameSimulation() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const createGameSimulation = () => Object.freeze({});
  const definition = Object.freeze({
    ...sourceDefinition,
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      createGameSimulation,
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

function createPackageWithoutAssetSlots() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const definition = Object.freeze({
    ...sourceDefinition,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      assetSlots: Object.freeze([]),
    }),
  });
  return Object.freeze({ ...source, define: () => definition });
}

function createPackageWithAssetPatchSurface() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  const defaultProviderSourceDigest = digestBytes(
    new TextEncoder().encode("synthetic-background-fallback"),
  );
  const patchSurface = definePresentationPatchSurface({
    background: definePatchSlot({
      symbolId: "asset.synthetic.stage.background",
      kind: "asset",
      contractRevision: parsePositiveSafeInteger(1),
      defaultProviderSourceDigest,
      defaultValue: null as null | {
        readonly assetId: "asset.synthetic.stage.background";
        readonly runtimePath: string;
        readonly mediaType: "image/png";
        readonly byteLength: ReturnType<typeof parsePositiveSafeInteger>;
        readonly width: ReturnType<typeof parsePositiveSafeInteger>;
        readonly height: ReturnType<typeof parsePositiveSafeInteger>;
        readonly sha256: ReturnType<typeof digestBytes>;
      },
    }),
  });
  const definition = Object.freeze({
    ...sourceDefinition,
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      patchSurface,
      materializePresentation: () =>
        Object.freeze({
          kind: "synthetic-presentation" as const,
          textCatalogs: sourceDefinition.presentation.textCatalogs,
        }),
    }),
  });
  return {
    entry: Object.freeze({ ...source, define: () => definition }),
    defaultProviderSourceDigest,
  };
}

function createPackageWithAccessorRule() {
  const source = createSyntheticCounterGamePackageV1();
  const sourceDefinition = source.define();
  let getterCalls = 0;
  const rules: unknown[] = [];
  Object.defineProperty(rules, 0, {
    enumerable: true,
    get() {
      getterCalls += 1;
      return stableNamedRule;
    },
  });
  Object.freeze(rules);
  const definition = Object.freeze({
    ...sourceDefinition,
    simulation: Object.freeze({ ...sourceDefinition.simulation, rules }),
  });
  return {
    entry: Object.freeze({ ...source, define: () => definition }),
    getterCalls: () => getterCalls,
  };
}

function buildIdentityWithChangedFacet(facet: "simulation" | "presentation") {
  const changedDigest = digestBytes(Uint8Array.of(facet === "simulation" ? 0x51 : 0x52));
  return Object.freeze({
    ...deterministicBuildIdentityInputV1,
    storySimulation:
      facet === "simulation"
        ? Object.freeze(
            deterministicBuildIdentityInputV1.storySimulation.map((record) =>
              Object.freeze({ ...record, sha256: changedDigest }),
            ),
          )
        : deterministicBuildIdentityInputV1.storySimulation,
    storyPresentation:
      facet === "presentation"
        ? Object.freeze(
            deterministicBuildIdentityInputV1.storyPresentation.map((record) =>
              Object.freeze({ ...record, sha256: changedDigest }),
            ),
          )
        : deterministicBuildIdentityInputV1.storyPresentation,
  });
}

describe("Story resolver", () => {
  it("returns one deeply frozen complete ResolvedGame", () => {
    const result = resolveGamePackageV1(
      createSyntheticCounterGamePackageV1(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.resolved).toMatchObject({
      gameSimulation: expect.any(Object),
      simulationProgram: expect.any(Object),
      presentation: expect.any(Object),
      sceneGraph: { stageScenes: [{ stageSceneId: "stage_scene.synthetic.counter" }] },
      assets: expect.any(Object),
      frozen: true,
    });
    expect(result.resolved.assets.assets).toHaveLength(2);
    expect(result.resolved.assets.assets.every((asset) => asset.delivery === "code_fallback")).toBe(
      true,
    );
    expect(result.resolved.provenance.resolved.simulationDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(result.resolved)).toBe(true);
    expect(Object.isFrozen(result.resolved.sceneGraph)).toBe(true);
  });

  it("calls each materializer and the simulation factory once", () => {
    const fixture = createCountingGamePackage();
    const result = resolveGamePackageV1(fixture.entry, [], deterministicBuildIdentityInputV1);
    expect(result.kind).toBe("resolved");
    expect(fixture.calls()).toEqual({
      define: 2,
      simulationMaterializer: 1,
      presentationMaterializer: 1,
      createGameSimulation: 1,
    });
  });

  it("keeps executable providers out of canonical JSON while checking stable identity", () => {
    namedRuleCalls.rule = 0;
    namedRuleCalls.resolver = 0;
    const rules = Object.freeze({
      rule: executableProvider("provider.synthetic.rule", 1, stableNamedRule),
      resolver: executableProvider("provider.synthetic.resolver", 2, stableNamedResolver),
    });
    const result = resolveGamePackageV1(
      createPackageWithRuleDefinitions(rules),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result.kind).toBe("resolved");
    expect(namedRuleCalls).toEqual({ rule: 0, resolver: 0 });
  });

  it("binds declared State schema revisions while isolating formula-only data", () => {
    const baseline = resolveGamePackageV1(
      createPackageWithStateContractManifest(createSyntheticStateContractManifestV1()),
      [],
      deterministicBuildIdentityInputV1,
    );
    const schemaChanged = resolveGamePackageV1(
      createPackageWithStateContractManifest(createSyntheticStateContractManifestV1(2)),
      [],
      deterministicBuildIdentityInputV1,
    );
    const formulaChanged = resolveGamePackageV1(
      createPackageWithStateContractManifest(
        createSyntheticStateContractManifestV1(),
        Object.freeze({ formulaRevision: parsePositiveSafeInteger(2) }),
      ),
      [],
      deterministicBuildIdentityInputV1,
    );
    const outerRevisionChanged = resolveGamePackageV1(
      createPackageWithStateContractRevision(2),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(baseline.kind).toBe("resolved");
    expect(schemaChanged.kind).toBe("resolved");
    expect(formulaChanged.kind).toBe("resolved");
    expect(outerRevisionChanged.kind).toBe("resolved");
    if (
      baseline.kind !== "resolved" ||
      schemaChanged.kind !== "resolved" ||
      formulaChanged.kind !== "resolved" ||
      outerRevisionChanged.kind !== "resolved"
    ) {
      return;
    }
    expect(schemaChanged.resolved.provenance.resolved.stateContractDigest).not.toBe(
      baseline.resolved.provenance.resolved.stateContractDigest,
    );
    expect(formulaChanged.resolved.provenance.resolved.stateContractDigest).toBe(
      baseline.resolved.provenance.resolved.stateContractDigest,
    );
    expect(formulaChanged.resolved.provenance.resolved.simulationDigest).not.toBe(
      baseline.resolved.provenance.resolved.simulationDigest,
    );
    expect(outerRevisionChanged.resolved.provenance.resolved.stateContractDigest).not.toBe(
      baseline.resolved.provenance.resolved.stateContractDigest,
    );
  });

  it.each([
    [
      "duplicate schema IDs",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: Object.freeze([
          Object.freeze({
            moduleId: parseModuleId("synthetic.counter"),
            moduleContractRevision: parsePositiveSafeInteger(1),
            stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
            stateSchema: Object.freeze({
              schemaId: "schema.synthetic.game-state",
              revision: parsePositiveSafeInteger(1),
            }),
          }),
        ]),
      }),
      "schema",
    ],
    [
      "unsorted stable reference IDs",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        stableReferenceSets: Object.freeze([
          Object.freeze({
            setId: "references.synthetic.scene",
            ids: Object.freeze(["scene.synthetic.z", "scene.synthetic.a"]),
          }),
        ]),
      }),
      "strictly increasing",
    ],
  ] as const)("rejects invalid State-contract manifest data: %s", (_label, manifest, message) => {
    const result = resolveGamePackageV1(
      createPackageWithStateContractManifest(manifest),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: {
        code: "story.contract_invalid",
        details: { message: expect.stringContaining(message) },
      },
    });
  });

  it.each([
    [
      "missing module",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: Object.freeze([]),
      }),
    ],
    [
      "wrong module revision",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: Object.freeze([
          Object.freeze({
            moduleId: parseModuleId("synthetic.counter"),
            moduleContractRevision: parsePositiveSafeInteger(2),
            stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
            stateSchema: Object.freeze({
              schemaId: "schema.synthetic.counter-state",
              revision: parsePositiveSafeInteger(1),
            }),
          }),
        ]),
      }),
    ],
    [
      "wrong state slot",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: Object.freeze([
          Object.freeze({
            moduleId: parseModuleId("synthetic.counter"),
            moduleContractRevision: parsePositiveSafeInteger(1),
            stateSlots: Object.freeze([parseStateSlotId("simulation.other")]),
            stateSchema: Object.freeze({
              schemaId: "schema.synthetic.counter-state",
              revision: parsePositiveSafeInteger(1),
            }),
          }),
        ]),
      }),
    ],
    [
      "stateless module entry",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: Object.freeze([
          Object.freeze({
            moduleId: parseModuleId("synthetic.counter"),
            moduleContractRevision: parsePositiveSafeInteger(1),
            stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
            stateSchema: Object.freeze({
              schemaId: "schema.synthetic.counter-state",
              revision: parsePositiveSafeInteger(1),
            }),
          }),
          Object.freeze({
            moduleId: parseModuleId("synthetic.parity"),
            moduleContractRevision: parsePositiveSafeInteger(1),
            stateSlots: Object.freeze([]),
            stateSchema: Object.freeze({
              schemaId: "schema.synthetic.parity-state",
              revision: parsePositiveSafeInteger(1),
            }),
          }),
        ]),
      }),
    ],
  ] as const)(
    "rejects State-contract manifests that disagree with GameSimulation: %s",
    (_label, manifest) => {
      const result = resolveGamePackageV1(
        createPackageWithStateContractManifest(manifest),
        [],
        deterministicBuildIdentityInputV1,
      );
      expect(result).toMatchObject({
        kind: "failed",
        failure: { code: "story.simulation_invalid" },
      });
    },
  );

  it("detects aliased State-contract manifest mutation between define calls", () => {
    const result = resolveGamePackageV1(
      createPackageWithAliasedMutatingStateContractManifest(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.nondeterministic" },
    });
  });

  it("detects aliased Story data mutation between define calls", () => {
    const result = resolveGamePackageV1(
      createPackageWithAliasedMutatingRules(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.nondeterministic" },
    });
  });

  it("rejects State-contract array accessors without invoking them", () => {
    const fixture = createStateContractManifestWithAccessorReferenceIds();
    const result = resolveGamePackageV1(
      createPackageWithStateContractManifest(fixture.manifest),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.contract_invalid" },
    });
    expect(fixture.getterCalls()).toBe(0);
  });

  it.each([
    [
      "extra schema field",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        aggregateStateSchema: Object.freeze({
          schemaId: "schema.synthetic.game-state",
          revision: parsePositiveSafeInteger(1),
          description: "not part of the ABI",
        }),
      }),
    ],
    [
      "sparse module array",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        moduleStateSchemas: createSparseStateContractArrayV1(),
      }),
    ],
    [
      "duplicate stable reference member",
      Object.freeze({
        ...createSyntheticStateContractManifestV1(),
        stableReferenceSets: Object.freeze([
          Object.freeze({
            setId: "references.synthetic.scene",
            ids: Object.freeze(["scene.synthetic.counter", "scene.synthetic.counter"]),
          }),
        ]),
      }),
    ],
  ] as const)("rejects malformed State-contract data: %s", (_label, manifest) => {
    const result = resolveGamePackageV1(
      createPackageWithStateContractManifest(manifest),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.contract_invalid" },
    });
  });

  it("uses and freezes the active materialized TextCatalog instead of the source catalog for TextId joins", () => {
    const sourceCatalogMissingOneTextId = createTextJoinCatalogSetV1(
      "text.synthetic.behavior.name",
    );
    const activeCatalog = createTextJoinCatalogSetV1();
    const result = resolveGamePackageV1(
      createPackageWithTextCatalogsV1(sourceCatalogMissingOneTextId, activeCatalog),
      [],
      deterministicBuildIdentityInputV1,
    );

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.resolved.presentation).toMatchObject({ textCatalogs: activeCatalog });
    const resolvedCatalogs = (result.resolved.presentation as { readonly textCatalogs: unknown })
      .textCatalogs as {
      readonly catalogs: readonly { readonly entries: readonly unknown[] }[];
    };
    expect(resolvedCatalogs).not.toBe(activeCatalog);
    expect(Object.isFrozen(resolvedCatalogs)).toBe(true);
    expect(Object.isFrozen(resolvedCatalogs.catalogs)).toBe(true);
    expect(Object.isFrozen(resolvedCatalogs.catalogs[0]?.entries)).toBe(true);
  });

  it.each(textJoinReferencesV1)(
    "rejects resolved SceneGraph TextId %s when it is absent from the active catalog",
    (missingTextId) => {
      const result = resolveGamePackageV1(
        createPackageWithTextCatalogsV1(
          createTextJoinCatalogSetV1(),
          createTextJoinCatalogSetV1(missingTextId),
        ),
        [],
        deterministicBuildIdentityInputV1,
      );

      expect(result).toMatchObject({
        kind: "failed",
        failure: {
          code: "story.presentation_invalid",
          details: { message: expect.stringContaining("presentation.catalog.missing_reference") },
        },
      });
      if (result.kind === "failed") {
        const message = result.failure.details.message;
        expect(typeof message).toBe("string");
        if (typeof message === "string") expect(message.length).toBeLessThanOrEqual(4_096);
      }
    },
  );

  it("validates both source and active materialized TextCatalogSet data", () => {
    const malformedSource = {
      defaultLocale: "zh-CN",
      catalogs: [{ locale: "zh-CN", entries: [] }],
    };
    const malformedActive = {
      defaultLocale: "zh-CN",
      catalogs: [{ locale: "zh-CN", entries: [] }],
    };
    const sourceFailure = resolveGamePackageV1(
      createPackageWithTextCatalogsV1(malformedSource, createTextJoinCatalogSetV1()),
      [],
      deterministicBuildIdentityInputV1,
    );
    const activeFailure = resolveGamePackageV1(
      createPackageWithTextCatalogsV1(createTextJoinCatalogSetV1(), malformedActive),
      [],
      deterministicBuildIdentityInputV1,
    );

    expect(sourceFailure).toMatchObject({
      kind: "failed",
      failure: { code: "story.contract_invalid" },
    });
    expect(activeFailure).toMatchObject({
      kind: "failed",
      failure: { code: "story.presentation_invalid" },
    });
  });

  it("includes resolved Presentation and decimal SceneGraph values only in presentation identity", () => {
    const baselineGraph = createSyntheticStageSceneGraphV1();
    const changedGraph = parseStageSceneGraphV1({
      ...baselineGraph,
      variants: baselineGraph.variants.map((variant, variantIndex) => ({
        ...variant,
        actors: variant.actors.map((actor, actorIndex) => ({
          ...actor,
          anchor: {
            ...actor.anchor,
            x: variantIndex === 0 && actorIndex === 0 ? 0.25 : actor.anchor.x,
          },
        })),
      })),
    });

    const baseline = resolveGamePackageV1(
      createPackageWithPresentationValues(
        baselineGraph,
        Object.freeze({ kind: "synthetic-presentation" }),
      ),
      [],
      deterministicBuildIdentityInputV1,
    );
    const graphChanged = resolveGamePackageV1(
      createPackageWithPresentationValues(
        changedGraph,
        Object.freeze({ kind: "synthetic-presentation" }),
      ),
      [],
      deterministicBuildIdentityInputV1,
    );
    const programChanged = resolveGamePackageV1(
      createPackageWithPresentationValues(
        baselineGraph,
        Object.freeze({ kind: "synthetic-presentation", revision: 2 }),
      ),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(baseline.kind).toBe("resolved");
    expect(graphChanged.kind).toBe("resolved");
    expect(programChanged.kind).toBe("resolved");
    if (
      baseline.kind !== "resolved" ||
      graphChanged.kind !== "resolved" ||
      programChanged.kind !== "resolved"
    ) {
      return;
    }

    for (const changed of [graphChanged.resolved, programChanged.resolved]) {
      expect(changed.provenance.resolved.presentationDigest).not.toBe(
        baseline.resolved.provenance.resolved.presentationDigest,
      );
      expect(changed.provenance.resolved.stateContractDigest).toBe(
        baseline.resolved.provenance.resolved.stateContractDigest,
      );
      expect(changed.provenance.resolved.simulationDigest).toBe(
        baseline.resolved.provenance.resolved.simulationDigest,
      );
    }
  });

  it("keeps simulation and presentation source facets out of each other's resolved identity", () => {
    const entry = createSyntheticCounterGamePackageV1();
    const baseline = resolveGamePackageV1(entry, [], deterministicBuildIdentityInputV1);
    const simulationChanged = resolveGamePackageV1(
      entry,
      [],
      buildIdentityWithChangedFacet("simulation"),
    );
    const presentationChanged = resolveGamePackageV1(
      entry,
      [],
      buildIdentityWithChangedFacet("presentation"),
    );
    expect(baseline.kind).toBe("resolved");
    expect(simulationChanged.kind).toBe("resolved");
    expect(presentationChanged.kind).toBe("resolved");
    if (
      baseline.kind !== "resolved" ||
      simulationChanged.kind !== "resolved" ||
      presentationChanged.kind !== "resolved"
    ) {
      return;
    }
    expect(simulationChanged.resolved.provenance.resolved.simulationDigest).not.toBe(
      baseline.resolved.provenance.resolved.simulationDigest,
    );
    expect(simulationChanged.resolved.provenance.resolved.presentationDigest).toBe(
      baseline.resolved.provenance.resolved.presentationDigest,
    );
    expect(presentationChanged.resolved.provenance.resolved.presentationDigest).not.toBe(
      baseline.resolved.provenance.resolved.presentationDigest,
    );
    expect(presentationChanged.resolved.provenance.resolved.simulationDigest).toBe(
      baseline.resolved.provenance.resolved.simulationDigest,
    );
    expect(simulationChanged.resolved.provenance.resolved.stateContractDigest).toBe(
      baseline.resolved.provenance.resolved.stateContractDigest,
    );
    expect(presentationChanged.resolved.provenance.resolved.stateContractDigest).toBe(
      baseline.resolved.provenance.resolved.stateContractDigest,
    );
  });

  it("rejects an invalid GameSimulation factory result", () => {
    const result = resolveGamePackageV1(
      createPackageWithInvalidGameSimulation(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.simulation_invalid" },
    });
  });

  it("rejects SceneGraph Asset references missing from the resolved manifest", () => {
    const result = resolveGamePackageV1(
      createPackageWithoutAssetSlots(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result).toMatchObject({
      kind: "failed",
      failure: {
        code: "story.presentation_invalid",
        details: { message: expect.stringContaining("presentation.catalog.missing_reference") },
      },
    });
  });

  it("applies an asset Hotfix to the resolved Asset manifest", () => {
    const fixture = createPackageWithAssetPatchSurface();
    const provider = Object.freeze({
      assetId: "asset.synthetic.stage.background" as const,
      runtimePath: "images/synthetic-stage-hotfix.png",
      mediaType: "image/png" as const,
      byteLength: parsePositiveSafeInteger(1),
      width: parsePositiveSafeInteger(1),
      height: parsePositiveSafeInteger(1),
      sha256: digestBytes(Uint8Array.of(1)),
    });
    const result = resolveGamePackageV1(
      fixture.entry,
      [
        {
          manifest: {
            identity: { id: "hotfix.synthetic.asset", revision: parsePositiveSafeInteger(1) },
            targetStoryId: fixture.entry.identity.id,
            targetStoryRevision: fixture.entry.identity.revision,
            targets: [
              {
                surface: "presentation",
                symbolId: "asset.synthetic.stage.background",
                expectedProviderDigest: fixture.defaultProviderSourceDigest,
              },
            ],
            requires: [],
            conflicts: [],
            supersedes: [],
          },
          sourceDigest: digestBytes(new TextEncoder().encode("synthetic-asset-hotfix")),
          install(context) {
            context.presentation.replace("asset.synthetic.stage.background", provider);
          },
        },
      ],
      deterministicBuildIdentityInputV1,
    );
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.resolved.assets.assets[0]).toMatchObject({
      delivery: "runtime_image",
      runtimePath: provider.runtimePath,
      provider: { kind: "hotfix", identity: { id: "hotfix.synthetic.asset" } },
    });
  });

  it("rejects array accessors without invoking them", () => {
    const fixture = createPackageWithAccessorRule();
    const result = resolveGamePackageV1(fixture.entry, [], deterministicBuildIdentityInputV1);
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.contract_invalid" },
    });
    expect(fixture.getterCalls()).toBe(0);
  });

  it("normalizes thrown objects without invoking message accessors or toString", () => {
    const source = createSyntheticCounterGamePackageV1();
    let userCodeCalls = 0;
    const thrown = {
      get message() {
        userCodeCalls += 1;
        return "unsafe";
      },
      toString() {
        userCodeCalls += 1;
        return "unsafe";
      },
    };
    const entry = Object.freeze({
      ...source,
      define() {
        throw thrown;
      },
    });
    const result = resolveGamePackageV1(entry, [], deterministicBuildIdentityInputV1);
    expect(result).toMatchObject({
      kind: "failed",
      failure: {
        code: "story.define_threw",
        details: { message: "Unknown failure" },
      },
    });
    expect(userCodeCalls).toBe(0);
  });

  it.each([
    [
      "new function references",
      () =>
        createPackageWithRuleDefinitions(
          Object.freeze({ rule: function recreatedRule() {} }),
          Object.freeze({ rule: function recreatedRule() {} }),
        ),
    ],
    [
      "conflicting provider IDs",
      () =>
        createPackageWithRuleDefinitions(
          Object.freeze({
            first: executableProvider("provider.synthetic.duplicate", 1, stableNamedRule),
            second: executableProvider("provider.synthetic.duplicate", 1, stableNamedResolver),
          }),
        ),
    ],
    [
      "different source digests",
      () =>
        createPackageWithRuleDefinitions(
          Object.freeze({
            rule: executableProvider("provider.synthetic.rule", 1, stableNamedRule),
          }),
          Object.freeze({
            rule: executableProvider("provider.synthetic.rule", 2, stableNamedRule),
          }),
        ),
    ],
  ])("rejects deterministic definitions with %s", (_label, createEntry) => {
    const result = resolveGamePackageV1(createEntry(), [], deterministicBuildIdentityInputV1);
    expect(result).toMatchObject({
      kind: "failed",
      failure: { code: "story.nondeterministic" },
    });
  });
});
