// SPDX-License-Identifier: MIT
import { defineGamePackage } from "../authoring/define-game-package.js";
import { defineGameSimulation } from "../authoring/define-game-simulation.js";
import { defineGameplayModule } from "../authoring/define-gameplay-module.js";
import {
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
} from "../authoring/patch-surface.js";
import type { AssetSlotDefinitionV1 } from "../contracts/assets.js";
import { commitAttemptV1, faultAttemptV1, rejectAttemptV1 } from "../contracts/execution.js";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.js";
import type {
  GamePackageV1,
  StateContractManifestV1,
  StoryDefinitionV1,
} from "../contracts/game-package.js";
import type {
  BootstrapEntropyV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  ModuleOwnerProposalEnvelopeV1,
} from "../contracts/gameplay-module.js";
import { createTransactionalRngV1, rngStateV1Schema } from "../contracts/rng.js";
import type { RngDrawTraceV1, RngStateV1 } from "../contracts/rng.js";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.js";
import { parseStageSceneGraphV1 } from "../contracts/presentation.js";
import type { StageSceneGraphV1 } from "../contracts/presentation.js";
import type { RuntimeSchemaV1 } from "../contracts/values.js";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.js";

export interface SyntheticCounterStateV1 {
  readonly count: number;
}

interface SyntheticGameStateV1 {
  readonly simulation: {
    readonly counter: SyntheticCounterStateV1;
  };
}

export type SyntheticCounterCommandV1 =
  | { readonly kind: "synthetic.increment" }
  | { readonly kind: "synthetic.reject" }
  | { readonly kind: "synthetic.fault" };

interface SyntheticCounterFactV1 {
  readonly kind: "synthetic.incremented";
  readonly count: number;
}

interface SyntheticCounterRejectionV1 {
  readonly code: "synthetic.reject";
}

interface SyntheticCounterFaultV1 {
  readonly code: "synthetic.fault";
}

interface SyntheticDebugValidationErrorV1 {
  readonly code: "synthetic.debug_command_unsupported";
}

interface SyntheticSimulationTypesV1 extends GameSimulationTypeMapV1<
  { readonly rngSeed: ReturnType<BootstrapEntropyV1["nextNonZeroUint32"]> },
  SyntheticGameStateV1,
  RngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<SyntheticGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: SyntheticCounterCommandV1;
  readonly fact: SyntheticCounterFactV1;
  readonly rejection: SyntheticCounterRejectionV1;
  readonly fault: SyntheticCounterFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: SyntheticDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: { readonly count: number; readonly parity: "even" | "odd" };
  readonly viewModel: { readonly count: number; readonly parity: "even" | "odd" };
}

type SyntheticSnapshotV1 = SyntheticSimulationTypesV1["snapshot"];
type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticCounterFactV1,
  SyntheticCounterRejectionV1,
  SyntheticCounterFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

interface CounterOperationV1 {
  readonly count: number;
}

interface CounterProposalV1 extends ModuleOwnerProposalEnvelopeV1<
  CounterOperationV1,
  SyntheticCounterFactV1
> {}

export const syntheticCounterStateSchemaV1: RuntimeSchemaV1<SyntheticCounterStateV1> =
  Object.freeze({
    parse(value: unknown): SyntheticCounterStateV1 {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        Object.keys(value).join("\0") !== "count" ||
        typeof (value as { readonly count?: unknown }).count !== "number"
      ) {
        throw new TypeError("invalid synthetic counter State");
      }
      return Object.freeze({
        count: parseNonNegativeSafeInteger((value as { readonly count: number }).count),
      });
    },
  });

const syntheticGameStateSchemaV1: RuntimeSchemaV1<SyntheticGameStateV1> = Object.freeze({
  parse(value: unknown): SyntheticGameStateV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).join("\0") !== "simulation"
    ) {
      throw new TypeError("invalid synthetic aggregate State");
    }
    const simulation = (value as { readonly simulation?: unknown }).simulation;
    if (
      simulation === null ||
      typeof simulation !== "object" ||
      Array.isArray(simulation) ||
      Object.getPrototypeOf(simulation) !== Object.prototype ||
      Object.keys(simulation).join("\0") !== "counter"
    ) {
      throw new TypeError("invalid synthetic simulation State");
    }
    return Object.freeze({
      simulation: Object.freeze({
        counter: syntheticCounterStateSchemaV1.parse(
          (simulation as { readonly counter?: unknown }).counter,
        ),
      }),
    });
  },
});

const commandSchema: RuntimeSchemaV1<SyntheticCounterCommandV1> = Object.freeze({
  parse(value: unknown): SyntheticCounterCommandV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "kind"
    ) {
      throw new TypeError("invalid synthetic command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (
      kind !== "synthetic.increment" &&
      kind !== "synthetic.reject" &&
      kind !== "synthetic.fault"
    ) {
      throw new TypeError("invalid synthetic command kind");
    }
    return Object.freeze({ kind });
  },
});

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchema: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("synthetic debug commands are unsupported");
  },
});

const operationSchema: RuntimeSchemaV1<CounterOperationV1> = Object.freeze({
  parse(value: unknown): CounterOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "count"
    ) {
      throw new TypeError("invalid synthetic counter operation");
    }
    return Object.freeze({
      count: parseNonNegativeSafeInteger((value as { readonly count?: unknown }).count),
    });
  },
});

const proposalSchema: RuntimeSchemaV1<CounterProposalV1> = Object.freeze({
  parse(value: unknown): CounterProposalV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid synthetic counter proposal");
    }
    const payload = operationSchema.parse(Reflect.get(value, "payload"));
    const facts = Reflect.get(value, "facts");
    if (!Array.isArray(facts)) throw new TypeError("invalid synthetic counter proposal facts");
    return Object.freeze({
      payload,
      facts: Object.freeze([...facts]) as readonly SyntheticCounterFactV1[],
    });
  },
});

function createModules() {
  const counter = defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("synthetic.counter"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.counter")],
      dependencies: [],
    },
    commandSchema,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: syntheticCounterStateSchemaV1,
    ownerOperationSchema: operationSchema,
    ownerProposalSchema: proposalSchema,
    localInvariants: [],
    owner: {
      propose(state, operation) {
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "synthetic.incremented" as const,
                count: state.count + 1,
              }),
            ]),
          }),
        });
      },
      apply(_state, proposal) {
        return Object.freeze({ count: proposal.payload.count });
      },
    },
    queries: null,
    createInitialState: () => Object.freeze({ count: 0 }),
    createReadPort: (state) => state,
  });
  const parity = defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId("synthetic.parity"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: [parseModuleId("synthetic.counter")],
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
  return Object.freeze([counter, parity] as const);
}

type SyntheticModulesV1 = ReturnType<typeof createModules>;
type SyntheticCommandExecutorV1 = {
  executeAttempt(
    snapshot: SyntheticSnapshotV1,
    command: SyntheticCounterCommandV1,
    context: undefined,
  ): SyntheticAttemptV1;
};
type SyntheticDebugCommandExecutorV1 = {
  validate(
    snapshot: SyntheticSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly SyntheticDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: SyntheticSnapshotV1, command: never, context: undefined): never;
};

type SyntheticGameSimulationV1 = GameSimulationV1<
  SyntheticSimulationTypesV1,
  SyntheticModulesV1,
  SyntheticCommandExecutorV1,
  SyntheticDebugCommandExecutorV1
>;

function createGameSimulation(): SyntheticGameSimulationV1 {
  const modules = createModules();
  const counter = modules[0];
  const parity = modules[1];
  const commandExecutor: SyntheticCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      if (command.kind === "synthetic.reject") {
        return rejectAttemptV1(snapshot, rng, [Object.freeze({ code: "synthetic.reject" })]);
      }
      if (command.kind === "synthetic.fault") {
        return faultAttemptV1(snapshot, rng, Object.freeze({ code: "synthetic.fault" }));
      }
      const operation = operationSchema.parse({
        count: snapshot.state.simulation.counter.count + 1,
      });
      const proposed = counter.owner.propose(
        snapshot.state.simulation.counter,
        operation,
        Object.freeze({}),
      );
      if (proposed.kind !== "proposed") throw new TypeError("counter proposal rejected");
      const proposal = proposalSchema.parse(proposed.proposal);
      const nextCounter = syntheticCounterStateSchemaV1.parse(
        counter.owner.apply(snapshot.state.simulation.counter, proposal),
      );
      const next = Object.freeze({
        state: Object.freeze({ simulation: Object.freeze({ counter: nextCounter }) }),
        rng: rng.candidateState(),
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
      });
      return commitAttemptV1(snapshot, next, rng, proposal.facts);
    },
  });
  const debugCommandExecutor: SyntheticDebugCommandExecutorV1 = Object.freeze({
    validate() {
      return Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([
          Object.freeze({ code: "synthetic.debug_command_unsupported" as const }),
        ]),
      });
    },
    executeAttempt() {
      throw new TypeError("synthetic debug commands are unsupported");
    },
  });
  return defineGameSimulation<SyntheticSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: syntheticGameStateSchemaV1,
    commandSchema,
    factSchema: passthroughSchema<SyntheticCounterFactV1>(),
    rejectionSchema: passthroughSchema<SyntheticCounterRejectionV1>(),
    debugCommandSchema,
    debugValidationErrorSchema: passthroughSchema<SyntheticDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return Object.freeze({
        simulation: Object.freeze({ counter: Object.freeze({ count: 0 }) }),
      });
    },
    createQueries(state) {
      return Object.freeze({
        count: state.simulation.counter.count,
        parity: parity.capabilities.resolveParity(state.simulation.counter.count),
      });
    },
    projectGameView(queries) {
      return Object.freeze({ count: queries.count, parity: queries.parity });
    },
  });
}

const emptySimulationPatchSurfaceV1 = defineSimulationPatchSurface({});
const emptyPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

interface SyntheticSimulationProgramV1 {
  readonly kind: "synthetic-counter";
}

export function createSyntheticStageSceneGraphV1(): StageSceneGraphV1 {
  return parseStageSceneGraphV1({
    stageScenes: [
      {
        stageSceneId: "stage_scene.synthetic.counter",
        variantIds: ["stage_scene_variant.synthetic.counter.default"],
        defaultVariantId: "stage_scene_variant.synthetic.counter.default",
      },
    ],
    variants: [
      {
        stageSceneId: "stage_scene.synthetic.counter",
        variantId: "stage_scene_variant.synthetic.counter.default",
        rendererId: "renderer.synthetic.stage",
        accessibleNameTextId: "text.synthetic.stage.name",
        backgroundAssetId: "asset.synthetic.stage.background",
        layout: { kind: "synthetic_stage" },
        actors: [
          {
            characterId: "character.synthetic.figure",
            anchor: { x: 0.5, y: 0.75 },
            scale: 1,
          },
        ],
        interactionSurfaces: [],
        content: { requiredFlags: 0 },
      },
    ],
    characters: [
      {
        characterId: "character.synthetic.figure",
        accessibleNameTextId: "text.synthetic.character.name",
        defaultRigId: "character_rig.synthetic.figure",
      },
    ],
    characterRigs: [
      {
        rigId: "character_rig.synthetic.figure",
        rendererId: "renderer.synthetic.character",
        poseIds: ["character_pose.synthetic.idle"],
        expressionIds: ["character_expression.synthetic.neutral"],
        activityIds: [],
        appearanceLayerOrder: [],
        defaultHitMapId: null,
        poseHitMapOverrides: [],
        staticFallbackAssetId: "asset.synthetic.character.fallback",
        fallbackHitMapCompatibility: "incompatible",
      },
    ],
    hitMaps: [],
    interactionSurfaces: [],
    interactionTargets: [],
    interactionBehaviors: [],
    contentMaturityPolicy: {
      policyRevision: 1,
      flags: [],
      presets: [],
      defaultAllowedFlags: 0,
    },
  });
}

const syntheticAssetSlotsV1 = Object.freeze([
  Object.freeze({
    assetId: "asset.synthetic.stage.background",
    kind: "background" as const,
    usage: "scene_background" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.synthetic.stage.background",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
  Object.freeze({
    assetId: "asset.synthetic.character.fallback",
    kind: "character" as const,
    usage: "character_pose" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.synthetic.character",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "scene" as const,
    safeArea: null,
    pivot: null,
  }),
]) satisfies readonly AssetSlotDefinitionV1[];

const syntheticStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.synthetic.game-state",
    revision: parsePositiveSafeInteger(1),
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
}) satisfies StateContractManifestV1;

type SyntheticDefinitionV1 = StoryDefinitionV1<
  {
    readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
    readonly stateContractManifest: typeof syntheticStateContractManifestV1;
    readonly data: Readonly<Record<never, never>>;
    readonly rules: Readonly<Record<never, never>>;
    readonly narrativeProgram: null;
    readonly patchSurface: typeof emptySimulationPatchSurfaceV1;
    materializeProgram(values: Readonly<Record<never, never>>): SyntheticSimulationProgramV1;
    createGameSimulation(program: SyntheticSimulationProgramV1): SyntheticGameSimulationV1;
  },
  {
    readonly uiSceneGraph: StageSceneGraphV1;
    readonly textCatalogs: readonly [];
    readonly assetSlots: typeof syntheticAssetSlotsV1;
    readonly assetPacks: readonly [];
    readonly patchSurface: typeof emptyPresentationPatchSurfaceV1;
    materializePresentation(values: Readonly<Record<never, never>>): {
      readonly kind: "synthetic-presentation";
    };
  }
>;

export function createSyntheticCounterGamePackageV1(): GamePackageV1<
  SyntheticDefinitionV1["simulation"],
  SyntheticDefinitionV1["presentation"]
> {
  const definition: SyntheticDefinitionV1 = Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractManifest: syntheticStateContractManifestV1,
      data: Object.freeze({}),
      rules: Object.freeze({}),
      narrativeProgram: null,
      patchSurface: emptySimulationPatchSurfaceV1,
      materializeProgram: () => Object.freeze({ kind: "synthetic-counter" }),
      createGameSimulation: () => createGameSimulation(),
    }),
    presentation: Object.freeze({
      uiSceneGraph: createSyntheticStageSceneGraphV1(),
      textCatalogs: Object.freeze([]) as readonly [],
      assetSlots: syntheticAssetSlotsV1,
      assetPacks: Object.freeze([]) as readonly [],
      patchSurface: emptyPresentationPatchSurfaceV1,
      materializePresentation: () => Object.freeze({ kind: "synthetic-presentation" }),
    }),
  });
  return defineGamePackage({
    contractRevision: 1,
    identity: {
      id: "story.synthetic-counter",
      revision: parsePositiveSafeInteger(1),
    },
    define: () => definition,
  });
}

export { rngStateV1Schema };
