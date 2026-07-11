// SPDX-License-Identifier: MIT
import {
  commitAttemptV1,
  faultAttemptV1,
  rejectAttemptV1,
} from "../contracts/execution.js";
import type {
  GamePackageV1,
  PatchSurfaceValueMapWitnessV1,
  StoryDefinitionV1,
} from "../contracts/game-package.js";
import type {
  BootstrapEntropyV1,
  GameModuleBindingV1,
  GameProfileV1,
} from "../contracts/module.js";
import { createTransactionalRngV1, rngStateV1Schema } from "../contracts/rng.js";
import type { RngStateV1 } from "../contracts/rng.js";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.js";
import type { RuntimeSchemaV1 } from "../contracts/values.js";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.js";
import { defineGameModule } from "../authoring/define-game-module.js";
import { defineGamePackage } from "../authoring/define-game-package.js";
import { defineGameProfile } from "../authoring/define-game-profile.js";

export interface SyntheticCounterStateV1 {
  readonly count: number;
}

export type SyntheticCounterCommandV1 =
  | { readonly kind: "synthetic.increment" }
  | { readonly kind: "synthetic.reject" }
  | { readonly kind: "synthetic.fault" };

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<
  SyntheticCounterStateV1,
  RngStateV1
>;

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
        count: parseNonNegativeSafeInteger(
          (value as { readonly count: number }).count,
        ),
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

const passthroughSchema: RuntimeSchemaV1<unknown> = Object.freeze({
  parse: (value: unknown) => value,
});

function createModules(): readonly GameModuleBindingV1[] {
  const counter = defineGameModule({
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
    ownerOperationSchema: passthroughSchema,
    ownerProposalSchema: passthroughSchema,
    localInvariants: [],
    owner: {
      propose: (_state: unknown, operation: unknown) => ({
        kind: "proposed" as const,
        proposal: { payload: operation, facts: [] },
      }),
      apply: (_state: unknown, proposal: unknown) => proposal,
    },
    queries: null,
    createInitialState: () => Object.freeze({ count: 0 }),
    createReadPort: (state: unknown) => state,
  });
  const parity = defineGameModule({
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
    services: Object.freeze({ parity: (value: number) => value % 2 }),
  });
  return Object.freeze([counter, parity]);
}

function createProfile(): GameProfileV1 {
  const modules = createModules();
  return defineGameProfile({
    contractRevision: 1,
    modules,
    stateSchema: syntheticCounterStateSchemaV1,
    commandSchema,
    factSchema: passthroughSchema,
    rejectionSchema: passthroughSchema,
    debugCommandSchema: passthroughSchema,
    coordinator: {
      executeAttempt(snapshotValue: unknown, commandValue: unknown) {
        const snapshot = snapshotValue as SyntheticSnapshotV1;
        const command = commandSchema.parse(commandValue);
        const rng = createTransactionalRngV1(snapshot.rng);
        if (command.kind === "synthetic.reject") {
          return rejectAttemptV1(snapshot, rng, [
            Object.freeze({ code: "synthetic.reject" }),
          ]);
        }
        if (command.kind === "synthetic.fault") {
          return faultAttemptV1(
            snapshot,
            rng,
            Object.freeze({ code: "synthetic.fault" }),
          );
        }
        const next = Object.freeze({
          state: Object.freeze({ count: snapshot.state.count + 1 }),
          rng: rng.candidateState(),
          commandSequence: parseNonNegativeSafeInteger(
            snapshot.commandSequence + 1,
          ),
        });
        return commitAttemptV1(snapshot, next, rng, [
          Object.freeze({ kind: "synthetic.incremented", count: next.state.count }),
        ]);
      },
      createQueries(snapshotValue: unknown) {
        const snapshot = snapshotValue as SyntheticSnapshotV1;
        return Object.freeze({ count: snapshot.state.count });
      },
    },
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return Object.freeze({ count: 0 });
    },
    projectView(snapshotValue: unknown) {
      const snapshot = snapshotValue as SyntheticSnapshotV1;
      return Object.freeze({ count: snapshot.state.count });
    },
  });
}

interface EmptyPatchSurfaceV1
  extends PatchSurfaceValueMapWitnessV1<Record<never, never>> {}

interface SyntheticSimulationProgramV1 {
  readonly kind: "synthetic-counter";
}

type SyntheticDefinitionV1 = StoryDefinitionV1<
  {
    readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
    readonly data: Readonly<Record<never, never>>;
    readonly rules: Readonly<Record<never, never>>;
    readonly narrativeProgram: null;
    readonly patchSurface: EmptyPatchSurfaceV1;
    materializeProgram(
      values: Readonly<Record<never, never>>,
    ): SyntheticSimulationProgramV1;
    createProfile(program: SyntheticSimulationProgramV1): GameProfileV1;
  },
  {
    readonly uiSceneGraph: null;
    readonly textCatalogs: readonly [];
    readonly assetSlots: readonly [];
    readonly assetPacks: readonly [];
    readonly patchSurface: EmptyPatchSurfaceV1;
    materializePresentation(values: Readonly<Record<never, never>>): {
      readonly kind: "synthetic-presentation";
    };
  }
>;

export function createSyntheticCounterGamePackageV1(): GamePackageV1<
  SyntheticDefinitionV1["simulation"],
  SyntheticDefinitionV1["presentation"]
> {
  const emptySurface: EmptyPatchSurfaceV1 = Object.freeze({});
  const definition: SyntheticDefinitionV1 = Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      data: Object.freeze({}),
      rules: Object.freeze({}),
      narrativeProgram: null,
      patchSurface: emptySurface,
      materializeProgram: () => Object.freeze({ kind: "synthetic-counter" }),
      createProfile: () => createProfile(),
    }),
    presentation: Object.freeze({
      uiSceneGraph: null,
      textCatalogs: Object.freeze([]) as readonly [],
      assetSlots: Object.freeze([]) as readonly [],
      assetPacks: Object.freeze([]) as readonly [],
      patchSurface: emptySurface,
      materializePresentation: () =>
        Object.freeze({ kind: "synthetic-presentation" }),
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
