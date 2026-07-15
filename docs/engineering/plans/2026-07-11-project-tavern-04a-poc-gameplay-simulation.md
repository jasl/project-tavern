# Project Tavern PoC Gameplay and GameSimulation Implementation Plan

> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。按顺序执行任务；复选框是不可改写的验收步骤，持久进度只由 task commit、phase checkpoint 与验证证据表示。

**Goal:** Implement the seven-day PoC Story's complete Story-local Gameplay contract, ten stateful GameplayModules, pure Rules/Resolvers, atomic normal and replayable-debug executors, `PocGameQueriesV1`, GameView projection, and one closed `PocGameSimulationV1` without introducing Story content or presentation.

**Architecture:** All tavern-specific State, Commands, replayable DebugCommands, GameplayFacts, Effects, modules, rules, queries, and transaction orchestration live under `game/stories/poc/src/gameplay`; Base remains game-neutral and no shared Gameplay package is recreated. Each stateful module owns only its declared State Slice, pure Rules/Resolvers return validated values without writing state, the normal and debug executors are the only cross-owner mutation boundaries, and GameQueries remain independent of command execution. `debug.fixture.load` stays outside the simulation as a tooling-owned anchoring operation. Phase 4B later supplies the concrete seven-day content, Narrative program, StoryDefinition, presentation, assets, tooling, golden vectors, and persistence fixtures.

**Tech Stack:** Phase 2–3 `@sillymaker/base`/`@sillymaker/base/runtime` public contracts, Node.js >=22.12.0, pnpm >=11.0.0, strict TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.10, and fast-check 4.9.0.

## Global Constraints

- Phase 2A/2B and Phase 3 gates are hard prerequisites. Consume the migrated `GameplayModule*`, `GameSimulation*`, `GameCommandExecutorV1`, `ResolvedGameV1`, `GameSessionV1`, `GameplayFact*`, and `StoryTooling*` public names; do not import or recreate any removed Phase 1 aliases.
- The package is `@project-tavern/story-poc` at `game/stories/poc`. There is no Sandbox, separate preview Story, or shared gameplay package.
- PoC Gameplay code may import only public Base contracts plus files inside `game/stories/poc/src/gameplay`; it must not import React, DOM, Web Host, Story presentation, application, tooling, `game/stories/e2e`, `references/`, or AIGC source archives.
- Implement exactly ten stateful module bindings: Run, Calendar, Actors, Status, Inventory, Facilities, Tavern, Workflow, Progression, and Narrative. Demand, Settlement, Check, Ending, and Scheduling are Rules/Resolvers, not GameplayModules.
- The ten-module graph is static in type, ID, count, order, descriptor, dependencies, and State Slots. `createPocGameplayModuleTupleV1(program)` may instantiate the fixed bindings once inside `createPocGameSimulationV1(program)`: Actors, Status, Inventory, Tavern, and Progression each close only their own strictly parsed, deeply frozen post-Hotfix initial State Slice; Run, Calendar, Facilities, Workflow, and Narrative remain data-independent bindings. The exact same tuple is passed to the candidate, normal/debug executors, and aggregate initializer. No path may rebuild an equivalent tuple, capture the complete Program in one Module, or apply sequence-zero initialization proposals after module initialization.
- `PocGameCommandExecutorV1.executeAttempt` is the only normal Gameplay cross-owner execution entry. `PocGameDebugCommandExecutorV1.validate/executeAttempt` is the only replayable-debug cross-owner path. Neither executor exposes `createQueries`; `PocGameQueriesV1` is created separately by GameSimulation.
- `PocDebugCommandV1` is the closed, PoC-prefixed specialization of the Contract Catalog's ten-kind `ReplayableDebugCommandV1`. It must not contain `debug.fixture.load`; fixture and DebugBundle anchoring remain Phase 4B tooling operations outside `GameSimulation` and outside replayable CommandLog entries.
- The strict debug command/error schemas, queue-front semantic validation, owner proposal mapping, and replayable attempt semantics are owned by `PocGameSimulationV1`. Their implementation/source identity enters `simulationDigest`; tooling may only construct a declared command and may not replace these semantics.
- State owners only propose/apply their own State Slice. They never receive a writable aggregate state, dispatch recursively, or listen to GameplayFacts to apply more state.
- State paths follow the Contract Catalog exactly: Run owns only `simulation.run`; Tavern owns `servicePlan`, `demandSeeds`, `currentDemand`, preparation and service history inside `simulation.tavern`; Workflow alone owns `simulation.activeWorkflow`, including both `OpeningSessionV1` and `WorldActionSessionV1`. The executor coordinates every cross-owner lifecycle.
- Rules and Resolvers accept deep-readonly validated inputs, use only an explicit transaction RNG where required, return strict validated outputs, and never read real time, environment randomness, storage, DOM, network, or platform globals.
- Preserve the Contract Catalog's exact seven-day PoC v1 State, 17-command, GameplayFact, Rejection, Effect, Narrative, rule input/output, ledger, and invariant semantics, but use the mandatory `Poc*`, `Gameplay*`, `GameSimulation*`, and `GameSession*` names from the Phase 2+ runtime specification.
- Every serializable Gameplay payload—State, Snapshot, Command, Fact, Effect, Rejection, rule input/output, and ledger data—is readonly, Strict JSON representable, safe-integer bounded, and validated by a strict Zod schema. `SimulationProgram`, Rule/Resolver capability objects, and module bindings are controlled, deeply frozen, non-serializable objects that may contain registered synchronous pure functions; they still forbid arbitrary callbacks, thenables, platform closures, script strings, and writable ambient state.
- Gameplay randomness uses the serializable project PRNG only. `Math.random()` and retries/search over RNG results are forbidden.
- Every task follows TDD: add a focused failing test, run it and observe the declared failure, implement the smallest complete slice, rerun focused tests, run `pnpm typecheck && pnpm verify`, and make a narrow commit.
- No task may add Story identity, TextCatalog strings, Scene renderers, asset providers, application roots, tooling, tracked golden bytes, or Save fixtures. Those belong to Phase 4B or later phases.
- R1 has already materialized every exact dependency and frozen `pnpm-lock.yaml`. Phase 4A adds no registry dependency, never runs `pnpm add`, and must leave `pnpm-lock.yaml` byte-identical; `game/stories/poc/package.json` changes in this plan are limited to scripts/metadata that do not alter dependency resolution.
- `docs/poc/balance-v0.md` is the single numeric authority for the Narrative guard values. Both the Phase 4A fixture program and the later concrete Story carry `maxNarrativeStepsPerCommand = 128` and `maxNarrativeCallDepth = 8`; the interpreter consumes those program values and contains no private fallback literal.
- Phase 4A tests remain a permanently closed gameplay-only leaf. `test:gameplay` enumerates only the Phase 4A files listed by Task 13; it must not expand to `src/test`, glob future Phase 4B tests, read tracked baselines, or invoke any writer.

## Unattended prerequisite, resume, and staging contract

Before Task 1, run this hard gate from a clean Phase 3 checkpoint:

```bash
test -z "$(git status --porcelain=v1)"
pnpm verify:materialization
pnpm verify:phase2
pnpm verify:persistence-diagnostics
pnpm verify
git diff --exit-code -- pnpm-lock.yaml
test -z "$(git status --porcelain=v1)"
```

Expected: every command exits 0. `verify:materialization` proves the tracked `scripts/preflight/materialization-lock.json` contract and ignored `.project-tavern/goal-materialization.json` attestation match; missing/stale materialization exits as `external_precondition.materialization_stale` before any edit. A missing script/public Phase 2–3 symbol, lockfile mutation, or dirty tree is a prerequisite failure; do not start Phase 4A by recreating an older ABI or installing a package. Diagnose and repair the owning earlier phase first.

Every task is a resumable checkpoint. At task entry run `git status --short --branch` and inspect the task's exact paths. If an interruption left plan-owned unstaged files, resume at the first unproven step instead of deleting or blindly regenerating them. Before every commit, stage only the task's explicit `git add -- <paths...>` list, run `git diff --cached --name-only`, and fail if any staged path is outside that list; `git add -A`, wildcard staging, unrelated cleanup, amend, and opportunistic dependency changes are forbidden. After each commit run `git status --short --branch` and `git diff --exit-code -- pnpm-lock.yaml`; the expected status is clean.

---

## File Map

```text
game/stories/poc/
  package.json
  tsconfig.json
  src/
    gameplay/
      contracts/
        values.ts                     # PoC safe-integer values and strict parsers
        ids.ts                        # PoC gameplay stable-ID brands and parsers
        types.ts                      # complete PocGameSimulationTypesV1 spine
        schemas.ts                    # aggregate strict schemas, completed in Task 12
        module-catalog.ts             # ten module descriptors, slots, owners, order
        define-poc-gameplay-module.ts # one curried type witness for every binding
      modules/
        index.ts                       # fixed program-bound ten-binding tuple composition
        run/{contract,module}.ts
        calendar/{contract,module}.ts
        actors/{contract,module}.ts
        status/{contract,module}.ts
        inventory/{contract,module}.ts
        facilities/{contract,module}.ts
        tavern/{contract,module}.ts
        workflow/{contract,module}.ts
        progression/{contract,module}.ts
        narrative/{contract,interpreter,module}.ts
      rules/
        demand-rules.ts
        ending-rule.ts
      resolvers/
        tavern-settlement-resolver.ts
        check-resolver.ts
        scheduling-resolver.ts
      transaction/
        candidate.ts
        effect-router.ts
      game-command-executor.ts
      game-debug-command-executor.ts
      game-queries.ts
      game-view-projector.ts
      game-simulation.ts
      index.ts
    testing/
      gameplay-fixture.ts             # test-only complete data/rule program
    test/
      gameplay-contract.test.ts
      run-calendar.test.ts
      actors-status.test.ts
      inventory.test.ts
      facilities-tavern.test.ts
      workflow-progression.test.ts
      narrative.test.ts
      rules-resolvers.test.ts
      transaction.test.ts
      command-executor-core.test.ts
      command-executor-workflows.test.ts
      game-debug-command-executor.test.ts
      game-queries.test.ts
      game-simulation.test.ts
      game-session-integration.test.ts
```

## Task 1: Freeze the PoC Gameplay Type Spine and Module Ownership Catalog

**Files:**

- Create: `game/stories/poc/src/gameplay/contracts/values.ts`
- Create: `game/stories/poc/src/gameplay/contracts/ids.ts`
- Create: `game/stories/poc/src/gameplay/contracts/types.ts`
- Create: `game/stories/poc/src/gameplay/contracts/module-catalog.ts`
- Create: `game/stories/poc/src/gameplay/contracts/define-poc-gameplay-module.ts`
- Create: `game/stories/poc/src/gameplay/contracts/schemas.ts`
- Create: `game/stories/poc/src/gameplay/index.ts`
- Create: `game/stories/poc/src/testing/gameplay-fixture.ts`
- Create: `game/stories/poc/src/test/gameplay-contract.test.ts`

**Interfaces:**

- Consumes: Base `Brand`, safe-integer parsers, `GameSimulationTypeMapV1`, `GameSnapshotEnvelopeV1`, `CommandExecutionAttemptEnvelopeV1`, `CommandExecutionDiagnosticsEnvelopeV1`, `RunIntegrityV1`, `RngStateV1`, `RngDrawTraceV1`, `GameplayModuleDescriptorV1`, `ModuleOwnerProposalEnvelopeV1`, `RuntimeSchemaV1`, `parseModuleId`, and `parseStateSlotId`.
- Produces: `PocGameSimulationTypesV1`, `PocGameBootstrapInputV1`, `PocGameStateV1`, `PocGameSnapshotV1`, `PocGameCommandV1`, `PocGameplayFactV1`, `PocRejectionReasonV1`, `PocEngineFaultV1`, `PocDebugCommandV1`, `PocDebugCommandValidationErrorV1`, `PocReplayableDebugExecutionAttemptV1`, `PocCommandExecutionAttemptV1`, `PocSimulationProgramV1`, `PocGameQueriesV1`, `PocGameViewV1`, every PoC value/ID parser and schema, the exact exported `pocSimulationDataSchemaV1` and `pocStoryBalanceSchemaV1`, the single curried `definePocGameplayModuleV1`, `pocGameplayModuleKeysV1`, `pocGameplayModuleDescriptorsV1`, `descriptorForPocModuleV1`, `pocGameplayModuleDependenciesV1`, and `pocStateOwnerKeysV1`.

- [ ] **Step 1: Write the failing ownership and type-closure test**

```ts
// game/stories/poc/src/test/gameplay-contract.test.ts
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  RngDrawTraceV1,
  RngStateV1,
} from "@sillymaker/base";
import {
  pocGameplayModuleDependenciesV1,
  pocGameplayModuleDescriptorsV1,
  pocGameplayModuleKeysV1,
  pocStateOwnerKeysV1,
} from "../gameplay/contracts/module-catalog.js";
import type {
  PocCommandExecutionAttemptV1,
  PocDebugCommandV1,
  PocDebugCommandValidationErrorV1,
  PocEngineFaultV1,
  PocGameBootstrapInputV1,
  PocGameCommandV1,
  PocGameQueriesV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
  PocGameStateV1,
  PocGameViewV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
} from "../gameplay/contracts/types.js";

describe("PoC gameplay contract", () => {
  it("owns exactly ten stateful slices inside the PoC Story", () => {
    expect(pocGameplayModuleKeysV1).toEqual([
      "run",
      "calendar",
      "actors",
      "status",
      "inventory",
      "facilities",
      "tavern",
      "workflow",
      "progression",
      "narrative",
    ]);
    expect(pocStateOwnerKeysV1).toEqual(pocGameplayModuleKeysV1);
    expect(pocGameplayModuleDescriptorsV1.map((entry) => entry.stateSlots)).toEqual([
      ["simulation.run"],
      ["simulation.calendar"],
      ["simulation.actors"],
      ["simulation.status"],
      ["simulation.inventory"],
      ["simulation.facilities"],
      ["simulation.tavern"],
      ["simulation.activeWorkflow"],
      ["story.facts", "story.quests", "story.outcomes", "story.resolvedChecks"],
      ["story.narrative"],
    ]);
    expect(
      Object.values(pocGameplayModuleDependenciesV1).every((value) => value.length === 0),
    ).toBe(true);
  });

  it("closes one simulation type map", () => {
    expectTypeOf<PocGameSimulationTypesV1>().toMatchTypeOf<GameSimulationTypeMapV1>();
    expectTypeOf<
      PocGameSimulationTypesV1["bootstrapInput"]
    >().toEqualTypeOf<PocGameBootstrapInputV1>();
    expectTypeOf<PocGameSimulationTypesV1["state"]>().toEqualTypeOf<PocGameStateV1>();
    expectTypeOf<PocGameSimulationTypesV1["rngState"]>().toEqualTypeOf<RngStateV1>();
    expectTypeOf<PocGameSimulationTypesV1["snapshot"]>().toEqualTypeOf<PocGameSnapshotV1>();
    expectTypeOf<PocGameSimulationTypesV1["rngDrawTrace"]>().toEqualTypeOf<RngDrawTraceV1>();
    expectTypeOf<PocGameSimulationTypesV1["command"]>().toEqualTypeOf<PocGameCommandV1>();
    expectTypeOf<PocGameSimulationTypesV1["fact"]>().toEqualTypeOf<PocGameplayFactV1>();
    expectTypeOf<PocGameSimulationTypesV1["rejection"]>().toEqualTypeOf<PocRejectionReasonV1>();
    expectTypeOf<PocGameSimulationTypesV1["fault"]>().toEqualTypeOf<PocEngineFaultV1>();
    expectTypeOf<PocGameSimulationTypesV1["debugCommand"]>().toEqualTypeOf<PocDebugCommandV1>();
    expectTypeOf<
      PocGameSimulationTypesV1["debugValidationError"]
    >().toEqualTypeOf<PocDebugCommandValidationErrorV1>();
    expectTypeOf<PocGameSimulationTypesV1["executionContext"]>().toEqualTypeOf<undefined>();
    expectTypeOf<PocGameSimulationTypesV1["queries"]>().toEqualTypeOf<PocGameQueriesV1>();
    expectTypeOf<PocGameSimulationTypesV1["viewModel"]>().toEqualTypeOf<PocGameViewV1>();
    expectTypeOf<PocCommandExecutionAttemptV1>().toEqualTypeOf<
      CommandExecutionAttemptEnvelopeV1<
        PocGameSnapshotV1,
        PocGameplayFactV1,
        PocRejectionReasonV1,
        PocEngineFaultV1,
        RngStateV1,
        RngDrawTraceV1
      >
    >();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-contract failure**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/gameplay-contract.test.ts`

Expected: FAIL only because the `gameplay/contracts` files do not exist. R1 already materialized the package's exact test dependencies; a missing dependency is an environment/prerequisite failure, not the expected TDD failure.

- [ ] **Step 3: Add the exact module catalog and type witness**

```ts
// game/stories/poc/src/gameplay/contracts/module-catalog.ts
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "@sillymaker/base";

export const pocGameplayModuleKeysV1 = Object.freeze([
  "run",
  "calendar",
  "actors",
  "status",
  "inventory",
  "facilities",
  "tavern",
  "workflow",
  "progression",
  "narrative",
] as const);

export const pocGameplayModuleDependenciesV1 = Object.freeze({
  run: Object.freeze([]),
  calendar: Object.freeze([]),
  actors: Object.freeze([]),
  status: Object.freeze([]),
  inventory: Object.freeze([]),
  facilities: Object.freeze([]),
  tavern: Object.freeze([]),
  workflow: Object.freeze([]),
  progression: Object.freeze([]),
  narrative: Object.freeze([]),
} as const);

const slots = {
  run: ["simulation.run"],
  calendar: ["simulation.calendar"],
  actors: ["simulation.actors"],
  status: ["simulation.status"],
  inventory: ["simulation.inventory"],
  facilities: ["simulation.facilities"],
  tavern: ["simulation.tavern"],
  workflow: ["simulation.activeWorkflow"],
  progression: ["story.facts", "story.quests", "story.outcomes", "story.resolvedChecks"],
  narrative: ["story.narrative"],
} as const;

export const pocGameplayModuleDescriptorsV1 = Object.freeze(
  pocGameplayModuleKeysV1.map((key) =>
    Object.freeze({
      id: parseModuleId(`module.${key}`),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze(slots[key].map(parseStateSlotId)),
      dependencies: Object.freeze([]),
    }),
  ),
);

export const pocStateOwnerKeysV1 = pocGameplayModuleKeysV1;

export function descriptorForPocModuleV1(key: (typeof pocGameplayModuleKeysV1)[number]) {
  const descriptor = pocGameplayModuleDescriptorsV1.find(
    (candidate) => candidate.id === `module.${key}`,
  );
  if (descriptor === undefined) throw new TypeError(`unknown PoC module: ${key}`);
  return descriptor;
}
```

`define-poc-gameplay-module.ts` exports exactly `definePocGameplayModuleV1 = defineGameplayModule<PocGameSimulationTypesV1>()`; every binding imports that one witness. `types.ts` must spell the complete closed unions from the Contract Catalog with `Poc`/`Gameplay` names and define `PocCommandExecutionAttemptV1` as the exact six-parameter Base `CommandExecutionAttemptEnvelopeV1` specialization shown by the type test. The replayable-debug union is also closed here rather than delegated to tooling:

```ts
export type PocDebugCommandV1 =
  | {
      readonly kind: "debug.calendar.set_ap";
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_stamina";
      readonly actorId: ActorId;
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_mood";
      readonly actorId: ActorId;
      readonly value: MoodPoint;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.relationship.set";
      readonly affection: SafeInteger;
      readonly teamwork: NonNegativeSafeInteger;
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.inventory.adjust_cash";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly duration: AuraDurationV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.clear";
      readonly instanceId: AuraInstanceId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.story.fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.narrative.jump";
      readonly cursor: NarrativeCursorV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.rng.set";
      readonly rng: RngStateV1;
      readonly reasonId: ReasonId;
    };

export const pocDebugCommandKindsV1 = Object.freeze([
  "debug.calendar.set_ap",
  "debug.actor.set_stamina",
  "debug.actor.set_mood",
  "debug.relationship.set",
  "debug.inventory.adjust_cash",
  "debug.aura.apply",
  "debug.aura.clear",
  "debug.story.fact.set",
  "debug.narrative.jump",
  "debug.rng.set",
] as const satisfies readonly PocDebugCommandV1["kind"][]);
```

`PocDebugCommandValidationErrorV1` is the PoC-prefixed closed specialization of the Catalog's replayable validation errors: unknown reason/actor/Aura/Aura-instance/fact/Narrative-node references; stamina, cash-result, and Aura-duration range errors; invalid Story values; disallowed Aura targets; Aura duration-policy mismatch; duplicate Aura state conflict; and inactive-Narrative jump conflict. Every variant carries the exact originating `commandKind`; there is no fixture-reference variant because `debug.fixture.load` is not a `PocDebugCommandV1`. `PocReplayableDebugExecutionAttemptV1` specializes Base diagnostics and has only `committed` or `faulted` results—never `rejected`. Task 1 implements the complete strict schemas for both closed debug unions plus the leaf/aggregate declarations needed by later modules; Task 12 completes the remaining State/normal-Command/Fact/Rejection aggregates and binds every schema into GameSimulation.

`PocGameSnapshotV1` is `GameSnapshotEnvelopeV1<PocGameStateV1, RngStateV1>` and therefore includes Base-owned `integrity`; Gameplay State must not duplicate or read it. `PocSimulationProgramV1` is exactly `{ data: PocSimulationDataV1; rules: PocRulesV1 }`. The strict data contract is not `PocStoryDataV1`, a spread, or an open record; it has exactly the Catalog projection fields below and no presentation text/assets:

```ts
export interface PocSimulationDataV1 {
  readonly dataRevision: 1;
  readonly manifest: PocSimulationManifestV1;
  readonly stateDefinitions: StoryStateDefinitionsV1;
  readonly initialState: StoryInitialStateV1;
  readonly balance: StoryBalanceV1;
  readonly content: PocSimulationContentV1;
  readonly narrative: PocNarrativeProgramV1;
}
```

`pocSimulationDataSchemaV1` and its nested strict schemas reject missing/extra projection fields, invalid references, and non-JSON values. `pocStoryBalanceSchemaV1` is the exact named Story-local strict schema for all twenty-one `StoryBalanceV1` fields and is exported with `pocSimulationDataSchemaV1` for Phase 4B source-data composition; no Base package owns this PoC schema. The contract test proves both named exports reject an extra field and a missing required field. The fixture's `StoryBalanceV1` includes the Catalog's complete `EndingPolicyV1` with exact `20/50/1/45` thresholds and four Reason bindings, plus `maxNarrativeStepsPerCommand=128` and `maxNarrativeCallDepth=8`; these values are parsed from data, never retained in a Rule/interpreter closure as duplicate literals.

The `PocSimulationDataV1` projection is explicit field-by-field: `manifest` contains only `initialSceneId` and `playableDays`; `content` contains the Catalog's simulation content fields and excludes source `texts`/`scenes`; source `content.scenes` becomes `narrative.scenes`. It contains no GameplayModule instance, owner capability, Rule/callback, renderer ID, TextCatalog value, asset, or tooling reference. Contract tests assert the exact nested key sets and prove a source-only field, executable value, module binding, and presentation field are each rejected rather than silently stripped.

- [ ] **Step 4: Add strict parsers and one complete test fixture factory**

```ts
// game/stories/poc/src/testing/gameplay-fixture.ts
export interface PocGameplayFixtureV1 {
  readonly program: PocSimulationProgramV1;
  readonly bootstrap: PocGameBootstrapInputV1;
  readonly snapshot: PocGameSnapshotV1;
}

export interface PocGameplayFixtureOptionsV1 {
  readonly integrity?: "normal" | "modified";
}

export function createPocGameplayFixtureV1(
  options: PocGameplayFixtureOptionsV1 = {},
): PocGameplayFixtureV1 {
  const bootstrap = Object.freeze({
    rngSeed: parseNonZeroUint32(0x00023049),
    runId: parseRunId("00000000-0000-4000-8000-000000000401"),
  });
  const program = createContractFixtureProgramV1();
  return Object.freeze({
    program,
    bootstrap,
    snapshot: createContractFixtureSnapshotV1(program, bootstrap, options.integrity ?? "normal"),
  });
}
```

The factory uses one minimal but referentially complete policy, recipe, ingredient, facility, action, event, check, ending, text-ID set, and Narrative scene. It is test-only, contains no player-facing prose, and every later task reuses it instead of constructing partial `as`-cast objects. The contract test strict-parses `program.data`, asserts its exact seven top-level keys and the nested manifest/content/narrative key sets in declaration order, asserts the exact fixture `endingPolicy`/Narrative limits above, and proves one extra field and one missing Reason binding are rejected.

The contract test also asserts that `pocDebugCommandKindsV1` equals the ten-item list above in order, that the strict schema rejects `{ kind: "debug.fixture.load" }`, and that `PocGameSimulationTypesV1["debugValidationError"]` is exactly `PocDebugCommandValidationErrorV1`. A missing or extra debug kind is therefore both a compile-time and runtime-contract failure.

- [ ] **Step 5: Run focused and repository checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/gameplay-contract.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; the PoC package typechecks without React/DOM imports, exactly ten owner descriptors exist, all aggregate types are closed, and full verification leaves tracked files unchanged.

- [ ] **Step 6: Commit the contract spine**

```bash
git add -- game/stories/poc/src/gameplay/contracts game/stories/poc/src/gameplay/index.ts game/stories/poc/src/testing/gameplay-fixture.ts game/stories/poc/src/test/gameplay-contract.test.ts
git commit -m "feat(story-poc): define gameplay contract spine"
```

## Task 2: Implement Run and Calendar Ownership

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/run/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/run/module.ts`
- Create: `game/stories/poc/src/gameplay/modules/calendar/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/calendar/module.ts`
- Create: `game/stories/poc/src/test/run-calendar.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: `PocGameBootstrapInputV1`, Run/Calendar State and Fact types, module descriptors, `defineGameplayModule<PocGameSimulationTypesV1>()`, and strict parsers from Task 1.
- Produces: `pocRunGameplayModuleV1`, `pocCalendarGameplayModuleV1`, their strict owner operation/proposal schemas, read ports, initial-state functions, and local invariants.

- [ ] **Step 1: Write failing ownership tests**

```ts
it("starts at setup without consuming an authored action", () => {
  const fixture = createPocGameplayFixtureV1();
  expect(pocRunGameplayModuleV1.createInitialState(fixture.bootstrap)).toMatchObject({
    status: "setup",
    runId: fixture.bootstrap.runId,
    initialSeed: fixture.bootstrap.rngSeed,
    completion: null,
  });
  expect(pocCalendarGameplayModuleV1.createInitialState(fixture.bootstrap)).toEqual({
    day: 1,
    phase: "morning",
    lifePolicyId: null,
    apRemaining: 0,
    eveningResolved: false,
  });
});

it("applies only the owned calendar slice", () => {
  const state = pocCalendarGameplayModuleV1.createInitialState(
    createPocGameplayFixtureV1().bootstrap,
  );
  const proposal = pocCalendarGameplayModuleV1.owner.propose(
    state,
    { kind: "calendar.policy.choose", policyId: parsePolicyId("policy.fixture") },
    Object.freeze({ policyAp: parseNonNegativeSafeInteger(2) }),
  );
  expect(proposal.kind).toBe("proposed");
  if (proposal.kind === "proposed") {
    expect(pocCalendarGameplayModuleV1.owner.apply(state, proposal.proposal)).toMatchObject({
      lifePolicyId: "policy.fixture",
      apRemaining: 2,
    });
  }
});
```

- [ ] **Step 2: Run and confirm missing module files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/run-calendar.test.ts`

Expected: FAIL with unresolved Run/Calendar module imports.

- [ ] **Step 3: Implement strict owner capabilities and local invariants**

```ts
export const pocRunGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful",
  descriptor: descriptorForPocModuleV1("run"),
  stateSchema: pocRunStateSchemaV1,
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  ownerOperationSchema: pocRunOwnerOperationSchemaV1,
  ownerProposalSchema: pocRunOwnerProposalSchemaV1,
  localInvariants: Object.freeze([pocRunInvariantV1]),
  owner: pocRunOwnerV1,
  queries: null,
  createInitialState: createInitialPocRunStateV1,
  createReadPort: createPocRunReadPortV1,
});
```

Calendar implements policy selection, AP adjustment, phase/day transition, evening-resolution marking, terminal locking, and an absolute `calendar.debug.set_ap` proposal as typed owner operations. The absolute operation is callable only by `PocGameDebugCommandExecutorV1`; it is not a player command. Run owns only `runId`, `initialSeed`, `status`, and `completion`, and implements activation and terminal completion. Demand seeds and current demand are Tavern-owned and are added in Task 5; `run.start` coordinates Run, Tavern, and Narrative only when Task 10 assembles the executor. Neither Run nor Calendar reads or writes another State Slice; the executor supplies the exact dependency DTO.

- [ ] **Step 4: Prove rejects preserve input and facts are ordered**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/run-calendar.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; invalid phase/AP/terminal operations reject without mutation, successful proposals emit only Run/Calendar facts, and repository verification stays green.

- [ ] **Step 5: Commit Run and Calendar**

```bash
git add -- game/stories/poc/src/gameplay/modules/run game/stories/poc/src/gameplay/modules/calendar game/stories/poc/src/test/run-calendar.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add run and calendar modules"
```

## Task 3: Implement Actors and Status Ownership

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/actors/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/actors/module.ts`
- Create: `game/stories/poc/src/gameplay/modules/status/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/status/module.ts`
- Create: `game/stories/poc/src/test/actors-status.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: Actors/Relationship/Aura types, exact range parsers, `PocGameplayFactV1`, authored Aura definitions, the strictly parsed owner-specific initial Actors/Status slices, and Task 1 module helpers.
- Produces: `PocActorsGameplayModuleV1`, `createPocActorsGameplayModuleV1(initialState)`, `PocStatusGameplayModuleV1`, `createPocStatusGameplayModuleV1(initialState)`, actor/status read ports, owner operations/proposals, lifecycle invariants, and facts.

- [ ] **Step 1: Write failing clamps, fixed-stage, and Aura lifecycle tests**

```ts
it("saturates relationship counters in their declared domains while preserving the fixed stage", () => {
  const current = createPocGameplayFixtureV1().snapshot.state.simulation.actors;
  const proposal = requireProposedV1(
    proposeActorsOperationV1(current, {
      kind: "actors.adjust_relationship",
      affectionDelta: -200,
      teamworkDelta: 3,
      reason: fixtureReasonV1(),
    }),
  );
  const next = applyActorsProposalV1(current, proposal);
  expect(next.relationship.affection).toBe(-200);
  expect(next.relationship.teamwork).toBe(3);
  expect(next.relationship.stage).toBe("cold");
});

it("preserves stamina components and mood reasons in owner facts", () => {
  const current = createPocGameplayFixtureV1().snapshot.state.simulation.actors;
  const stamina = requireProposedV1(
    proposeActorsOperationV1(current, {
      kind: "actors.adjust_stamina",
      actorId: parseActorId("actor.player"),
      application: "debit",
      components: [
        { requestedDelta: -2, reason: fixtureReasonV1("reason.fixture.action") },
        { requestedDelta: 1, reason: fixtureReasonV1("reason.fixture.aura") },
      ],
    }),
  );
  expect(stamina.facts).toContainEqual(
    expect.objectContaining({
      kind: "actor.stamina_changed",
      components: [
        { requestedDelta: -2, reason: fixtureReasonV1("reason.fixture.action") },
        { requestedDelta: 1, reason: fixtureReasonV1("reason.fixture.aura") },
      ],
    }),
  );
  const moodReason = fixtureReasonV1("reason.fixture.mood");
  const mood = requireProposedV1(
    proposeActorsOperationV1(current, {
      kind: "actors.adjust_mood",
      actorId: parseActorId("actor.heroine"),
      delta: -1,
      reason: moodReason,
    }),
  );
  expect(mood.facts).toContainEqual(
    expect.objectContaining({ kind: "actor.mood_changed", reason: moodReason }),
  );
});

it("decrements a day-end aura only on its declared lifecycle unit", () => {
  const fixture = createPocGameplayFixtureV1();
  const state = withFixtureAuraV1(fixture.snapshot.state.simulation.status, {
    auraId: parseAuraId("aura.fixture_timed"),
    duration: { kind: "countdown", unit: "day_end", remaining: 2 },
  });
  const afterPhaseEnd = advancePocAuraCountdownsV1(state, {
    unit: "phase_end",
    instanceIds: [],
  });
  expect(afterPhaseEnd.state).toBe(state);
  const afterFirstDayEnd = advancePocAuraCountdownsV1(state, {
    unit: "day_end",
    instanceIds: [fixtureAuraInstanceIdV1],
  });
  expect(afterFirstDayEnd.state.auras[0]?.duration).toEqual({
    kind: "countdown",
    unit: "day_end",
    remaining: 1,
  });
  expect(afterFirstDayEnd.expired).toEqual([]);
  expect(
    advancePocAuraCountdownsV1(afterFirstDayEnd.state, {
      unit: "day_end",
      instanceIds: [fixtureAuraInstanceIdV1],
    }).expired,
  ).toEqual([fixtureAuraInstanceIdV1]);
});
```

- [ ] **Step 2: Run and confirm missing actors/status implementations**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/actors-status.test.ts`

Expected: FAIL because both module bindings are absent.

- [ ] **Step 3: Implement actors and Aura proposal/apply boundaries**

```ts
export type PocActorsOwnerOperationV1 =
  | {
      readonly kind: "actors.adjust_stamina";
      readonly actorId: ActorId;
      readonly application: "debit" | "recovery";
      readonly components: readonly [StaminaChangeComponentV1, ...StaminaChangeComponentV1[]];
    }
  | {
      readonly kind: "actors.adjust_mood";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.adjust_relationship";
      readonly affectionDelta: SafeInteger;
      readonly teamworkDelta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.debug.set_stamina";
      readonly actorId: ActorId;
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "actors.debug.set_mood";
      readonly actorId: ActorId;
      readonly value: MoodPoint;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "actors.debug.set_relationship";
      readonly affection: SafeInteger;
      readonly teamwork: NonNegativeSafeInteger;
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    };

export type PocStatusOwnerOperationV1 =
  | {
      readonly kind: "status.apply";
      readonly aura: AuraInstanceV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "status.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "status.countdown";
      readonly unit: Extract<AuraDurationV1, { readonly kind: "countdown" }>["unit"];
      readonly instanceIds: readonly AuraInstanceId[];
    }
  | {
      readonly kind: "status.debug.apply";
      readonly aura: AuraInstanceV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "status.debug.clear_instance";
      readonly instanceId: AuraInstanceId;
      readonly reasonId: ReasonId;
    };
```

The actors owner applies stamina/mood/relationship changes and appends matching change history once. Stamina preserves the ordered non-empty `components` exactly. `application="debit"` sums them in authored order and rejects `actor.insufficient_stamina` when `before + sum < 0`; it never turns an unaffordable debit into a lower-clamped success. `application="recovery"` computes `effectiveRecovery = max(0, sum)` and then clamps once to `maximum`. Both forms emit the exact component list in `actor.stamina_changed`; mood carries the derived `ChangeReasonV1` into `actor.mood_changed`. Numeric relationship adjustments saturate affection at the declared SafeInteger limits and teamwork at `0..Number.MAX_SAFE_INTEGER`, while preserving the existing `stage`; tests cover both safe-integer ends and the teamwork zero floor, and there is no hidden `-100..100` scale, relationship-transition Rule, or derived-stage table. The closed Catalog ABI still requires a normal `actors.relationship.stage.set` owner operation so Task 9 can exhaustively route the explicit `relationship.stage.set` EffectIntent, and replayable Debug has its separate absolute set operation. Both validate the complete Catalog `RelationshipStage` union. The concrete seven-day Story authors no normal stage-set effect, starts at `cold`, and therefore remains exactly `cold` throughout ordinary play.

`createPocActorsGameplayModuleV1(initialState)` and `createPocStatusGameplayModuleV1(initialState)` strictly parse, deep-freeze, and close only their corresponding owner Slice; their `createInitialState(bootstrap)` returns that owner value without reading any other Program field. The status owner enforces uniqueness, target applicability, exact authored source identity, and only the Catalog's `countdown { unit, remaining } | until_cleared` duration forms; there is no calendar `expiresAt`, condition expiry, or generic fixed-duration policy. `status.apply.reason` is the complete derived `ChangeReasonV1` used verbatim by `aura.applied`; expiry/clear facts likewise carry their exact producing reason. The executor supplies the exact applicable instance IDs at `phase_end`, `day_end`, successful applicable `opening`, or `night_recovery`: opening countdowns decrement only after a successful settlement that actually used the Aura, and night-recovery countdowns decrement only after their recovery modifier was collected. A rejected or faulted outer transaction rolls all countdown changes back. Debug-prefixed owner operations remain inaccessible to the normal executor and still pass the same range, reference, duration-policy, and local-invariant checks. An angry Aura remains independent of mood, affection, teamwork, and relationship stage.

- [ ] **Step 4: Run focused, property, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/actors-status.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all boundary values, invalid Aura sources, duplicate apply, manual clear, all four countdown-unit vectors, `until_cleared`, and rollback pass without cross-slice writes.

- [ ] **Step 5: Commit Actors and Status**

```bash
git add -- game/stories/poc/src/gameplay/modules/actors game/stories/poc/src/gameplay/modules/status game/stories/poc/src/test/actors-status.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add actors and status modules"
```

## Task 4: Implement Inventory FIFO Batches and the Authoritative Ledger

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/inventory/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/inventory/module.ts`
- Create: `game/stories/poc/src/test/inventory.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: Inventory/batch/item/ledger types, Money/Quantity parsers, ingredient definitions, authored reasons, the strictly parsed owner-specific initial Inventory slice, and owner contracts.
- Produces: `PocInventoryGameplayModuleV1`, `createPocInventoryGameplayModuleV1(initialState)`, FIFO consume/spoil/grant/purchase/ledger operations, `PocInventoryReadPortV1`, strict proposals, and cash/valuation invariants.

- [ ] **Step 1: Write failing FIFO and ledger conservation tests**

```ts
it("consumes the earliest-expiry batch before a later batch", () => {
  const state = inventoryFixtureV1({
    cash: 20,
    ingredientBatches: [batchV1("batch.later", 3, 3), batchV1("batch.earlier", 1, 2)],
  });
  const result = proposeInventoryOperationV1(state, {
    kind: "inventory.consume",
    lines: [{ ingredientId: parseIngredientId("ingredient.fixture"), quantity: 2 }],
    reason: fixtureReasonV1(),
  });
  expect(result.kind).toBe("proposed");
  if (result.kind === "proposed") {
    const next = applyInventoryProposalV1(state, result.proposal);
    expect(
      next.ingredientBatches.find((batch) => batch.batchId === "batch.earlier"),
    ).toBeUndefined();
    expect(next.ingredientBatches.find((batch) => batch.batchId === "batch.later")?.quantity).toBe(
      2,
    );
    expect(next.cash).toBe(20);
  }
});

it("records a purchase and cash movement in one proposal", () => {
  const state = inventoryFixtureV1({ cash: 20, ingredientBatches: [] });
  const result = requireProposedV1(
    proposeInventoryOperationV1(state, {
      kind: "inventory.purchase",
      lines: [{ ingredientId: parseIngredientId("ingredient.fixture"), quantity: 1 }],
      reasonId: parseReasonId("reason.fixture_purchase"),
    }),
  );
  const next = applyInventoryProposalV1(state, result);
  expect(next.cash).toBe(19);
  expect(next.ledger.at(-1)).toMatchObject({ cashDelta: -1, category: "purchase" });
});
```

- [ ] **Step 2: Run and confirm the missing Inventory module**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/inventory.test.ts`

Expected: FAIL with missing Inventory contract/module imports.

- [ ] **Step 3: Implement the closed owner operation union**

```ts
export type PocInventoryOwnerOperationV1 =
  | {
      readonly kind: "inventory.purchase";
      readonly lines: readonly PurchaseLineV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.consume";
      readonly lines: readonly IngredientQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.grant";
      readonly lines: readonly IngredientQuantityV1[];
      readonly source: InventorySourceRefV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item.grant";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item.consume";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.spoil";
      readonly day: DayIndex;
      readonly reason: ChangeReasonV1;
    }
  | { readonly kind: "inventory.ledger.append"; readonly entries: readonly LedgerEntryDraftV1[] }
  | {
      readonly kind: "inventory.debug.adjust_cash";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    };
```

`createPocInventoryGameplayModuleV1(initialState)` strictly parses, deep-freezes, and closes only the complete Inventory owner Slice, including `startingCash === cash` and an empty initial ledger; its bootstrap initializer reads no other Program field. The proposal materializes `ingredientBatches`, batch-consumption slices, and ledger entries atomically. `inventory.debug.adjust_cash` creates the same authoritative ledger evidence as any other cash change and rejects a negative or unsafe resulting balance. `cash` must always equal `startingCash + sum(ledger.cashDelta)`; quantity/value conservation, unique batch/ledger IDs, expiry ordering, and exact reason/source references are local invariants. Cold-storage extension is not an Inventory self-trigger: Task 10's `facility.choose` transaction supplies the affected batch IDs after the Facilities owner accepts the build, and Inventory marks each existing batch `refrigerationExtended=true` while extending `lastUsableDay` exactly once; future refrigeratable purchase/grant batches use the same facility read-port input.

- [ ] **Step 4: Run FIFO, property, and repository tests**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/inventory.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; insufficient cash/stock rejects without mutation, FIFO is deterministic, spoilage has zero cash delta and nonzero valuation delta, and all ledger invariants pass.

- [ ] **Step 5: Commit Inventory**

```bash
git add -- game/stories/poc/src/gameplay/modules/inventory game/stories/poc/src/test/inventory.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add inventory ledger module"
```

## Task 5: Implement Facilities and Tavern Ownership

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/facilities/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/facilities/module.ts`
- Create: `game/stories/poc/src/gameplay/modules/tavern/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/tavern/module.ts`
- Create: `game/stories/poc/src/test/facilities-tavern.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: facility opportunity/build types, Tavern plan/demand/opening/history types, strict stable IDs, the strictly parsed owner-specific initial Tavern slice, and module owner helpers.
- Produces: static `pocFacilitiesGameplayModuleV1`, `PocTavernGameplayModuleV1`, `createPocTavernGameplayModuleV1(initialState)`, exact opportunity/plan/demand/opening/history operations, read ports, proposals, and invariants.

- [ ] **Step 1: Write failing facility and Tavern lifecycle tests**

```ts
it("commits one facility choice and never reopens the opportunity", () => {
  const state = facilitiesFixtureV1();
  const operation = {
    kind: "facilities.choose",
    opportunityId: parseActionId("action.fixture_facility"),
    choice: { kind: "build", facilityId: parseFacilityId("facility.fixture_bed") },
  } as const;
  const proposal = proposeFacilityChoiceV1(state, operation);
  expect(proposal.kind).toBe("proposed");
  if (proposal.kind === "proposed") {
    const next = applyFacilitiesProposalV1(state, proposal.proposal);
    expect(next.built).toEqual([expect.objectContaining({ facilityId: "facility.fixture_bed" })]);
    expect(next.decisions).toEqual([
      {
        opportunityId: "action.fixture_facility",
        decision: { kind: "built", facilityId: "facility.fixture_bed" },
      },
    ]);
    expect(proposeFacilityChoiceV1(next, operation)).toMatchObject({
      kind: "rejected",
    });
  }
});

it("updates only Tavern-owned plan and helper fields", () => {
  const state = tavernFixtureV1();
  const planned = requireProposedV1(
    proposeTavernOperationV1(state, {
      kind: "tavern.plan.set",
      plan: tavernPlanFixtureV1(),
      reason: fixtureReasonV1(),
    }),
  );
  const next = applyTavernProposalV1(state, planned);
  expect(next.servicePlan).toEqual(tavernPlanFixtureV1());
  expect(next.currentDemand).toBe(state.currentDemand);
});
```

- [ ] **Step 2: Run and observe missing modules**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/facilities-tavern.test.ts`

Expected: FAIL because Facilities and Tavern bindings do not exist.

- [ ] **Step 3: Implement exact owner operations**

Facilities owns only the `built` and `decisions` arrays and keeps its fixed empty initializer: opportunity publication remains authored Story content, and an accepted build/skip proposal records exactly one `FacilityDecisionRecordV1` plus an optional `FacilityStateV1`. `createPocTavernGameplayModuleV1(initialState)` strictly parses, deep-freezes, and closes only the complete Tavern owner Slice. Tavern owns only reputation, unlocked recipes, complete helper state, daily preparation, `servicePlan`, `demandSeeds`, `currentDemand`, and append-only `serviceHistory`. `OpeningSessionV1` and its immutable baseline never enter Tavern State; Task 6's Workflow owner holds them. Starting/finalizing an Opening consumes executor-prepared validated DTOs and coordinates Tavern/Workflow with the other owners; Tavern never reads Inventory, Actors, Calendar, or Rules directly.

```ts
export type PocTavernOwnerOperationV1 =
  | {
      readonly kind: "tavern.reputation.adjust";
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.plan.set";
      readonly plan: TavernPlanV1;
      readonly reason: ChangeReasonV1;
    }
  | { readonly kind: "tavern.demand_seeds.set"; readonly demandSeeds: readonly DemandDayStateV1[] }
  | {
      readonly kind: "tavern.current_demand.set";
      readonly currentDemand: MaterializedDemandDayV1 | null;
    }
  | { readonly kind: "tavern.preparation.increment"; readonly day: DayIndex }
  | { readonly kind: "tavern.preparation.reset"; readonly day: DayIndex }
  | { readonly kind: "tavern.service_history.append"; readonly history: ServiceHistoryEntryV1 };
```

- [ ] **Step 4: Run all focused and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/facilities-tavern.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; duplicate choices, invalid plans, duplicate Opening cost/finalization, and history replacement reject; all proposals remain owner-local.

- [ ] **Step 5: Commit Facilities and Tavern**

```bash
git add -- game/stories/poc/src/gameplay/modules/facilities game/stories/poc/src/gameplay/modules/tavern game/stories/poc/src/test/facilities-tavern.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add facilities and tavern modules"
```

## Task 6: Implement Workflow and Progression Ownership

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/workflow/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/workflow/module.ts`
- Create: `game/stories/poc/src/gameplay/modules/progression/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/progression/module.ts`
- Create: `game/stories/poc/src/test/workflow-progression.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: active Workflow, WorldAction progress, Fact/Quest/Outcome/ResolvedCheck, Modifier and Effect types, plus the strictly parsed owner-specific initial Progression slice.
- Produces: static `pocWorkflowGameplayModuleV1`, `PocProgressionGameplayModuleV1`, `createPocProgressionGameplayModuleV1(initialState)`, owner-local state machines, read ports, proposals, stable facts, and invariants.

- [ ] **Step 1: Write failing workflow and idempotency tests**

```ts
it("advances one WorldAction through the exact four progress values", () => {
  const state = workflowIdleFixtureV1();
  const started = requireProposedV1(
    proposeWorkflowOperationV1(state, {
      kind: "workflow.begin_world_action",
      actionId: parseActionId("action.fixture_world"),
      optionId: parseChoiceId("choice.fixture_world"),
    }),
  );
  const active = applyWorkflowProposalV1(state, started);
  expect(active?.progress).toBe("begin_scene");
  const waiting = finishFixtureWorldActionBeginSceneV1(active);
  expect(waiting.progress).toBe("awaiting_completion_phase");
  const completing = enterFixtureWorldActionCompletionSceneV1(waiting);
  expect(completing.progress).toBe("completion_scene");
  expect(finishFixtureWorldActionCompletionSceneV1(completing).progress).toBe("ready_to_complete");
});

it("replaces declared progression values but records each resolved check once", () => {
  const state = progressionFixtureV1();
  const first = requireProposedV1(proposeProgressionOperationV1(state, factSetFixtureV1(true)));
  const next = applyProgressionProposalV1(state, first);
  expect(
    applyProgressionProposalV1(
      next,
      requireProposedV1(proposeProgressionOperationV1(next, factSetFixtureV1(false))),
    ).facts,
  ).toContainEqual(expect.objectContaining({ value: { kind: "boolean", value: false } }));
  const checked = applyProgressionProposalV1(
    next,
    requireProposedV1(proposeProgressionOperationV1(next, checkRecordFixtureV1())),
  );
  expect(proposeProgressionOperationV1(checked, checkRecordFixtureV1())).toMatchObject({
    kind: "rejected",
  });
});

it("keeps an Opening baseline in Workflow until finalize", () => {
  const state = workflowIdleFixtureV1();
  const started = requireProposedV1(proposeWorkflowOperationV1(state, openingStartFixtureV1()));
  const active = applyWorkflowProposalV1(state, started);
  expect(active).toMatchObject({ kind: "opening", checkpoint: "started" });
  if (active?.kind !== "opening") throw new TypeError("expected opening workflow");
  expect(active.baseline).toBe(started.payload.activeWorkflow.baseline);
});
```

- [ ] **Step 2: Run and confirm missing Workflow/Progression files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/workflow-progression.test.ts`

Expected: FAIL with unresolved module imports.

- [ ] **Step 3: Implement closed state machines and stable references**

Workflow owns the nullable `activeWorkflow` slice, keeps its fixed null initializer, and therefore permits exactly one complete `OpeningSessionV1` or `WorldActionSessionV1` at a time. Opening uses only `started | middle | before_finalize | ready_to_finalize`; WorldAction uses only `begin_scene | awaiting_completion_phase | completion_scene | ready_to_complete`. Opening-session modifiers live only on the active Opening. `createPocProgressionGameplayModuleV1(initialState)` strictly parses, deep-freezes, and closes only the complete Progression owner Slice. Progression owns the definition-backed facts, quests, outcomes, and append-only resolved checks; it validates every authored reference/value, permits every declared Fact/Quest/Outcome replacement, and prevents duplicate CheckId resolution while enforcing the Catalog's resolved-check ordering/formula invariants. It does not invent terminal metadata for Fact, Quest, or Outcome definitions.

```ts
export type PocProgressionOwnerOperationV1 =
  | { readonly kind: "progression.fact.set"; readonly entry: FactEntryV1 }
  | { readonly kind: "progression.quest.set"; readonly entry: QuestEntryV1 }
  | { readonly kind: "progression.outcome.set"; readonly entry: OutcomeEntryV1 }
  | { readonly kind: "progression.check.record"; readonly check: ResolvedCheckV1 };
```

`progression.fact.set` is the sole owner operation used by both normal Story effects and `debug.story.fact.set`; the caller supplies the validated authored Fact entry and the owner applies the same stable-reference/value invariants. It does not inspect whether the caller is normal or debug code.

- [ ] **Step 4: Run focused and full verification**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/workflow-progression.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; illegal skips, duplicate completion/checks, missing references, and concurrent workflows reject without mutation.

- [ ] **Step 5: Commit Workflow and Progression**

```bash
git add -- game/stories/poc/src/gameplay/modules/workflow game/stories/poc/src/gameplay/modules/progression game/stories/poc/src/test/workflow-progression.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add workflow and progression modules"
```

## Task 7: Implement Narrative IR Interpretation and Ownership

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/narrative/contract.ts`
- Create: `game/stories/poc/src/gameplay/modules/narrative/interpreter.ts`
- Create: `game/stories/poc/src/gameplay/modules/narrative/module.ts`
- Create: `game/stories/poc/src/test/narrative.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: Contract Catalog Narrative node/scene/source/cursor/stage/condition/check/effect IR, strict stable IDs, and test fixture program.
- Produces: `pocNarrativeGameplayModuleV1`, `interpretPocNarrativeStepV1`, start/advance/choose/complete operations, a read port, stable stage/cursor projection, and interpreter limit errors.

- [ ] **Step 1: Write failing branch/rejoin, call-stack, and limit tests**

```ts
it("branches by stable choice and rejoins one shared node", () => {
  const fixture = narrativeBranchFixtureV1();
  const left = runNarrativeCommandsV1(fixture, [
    { kind: "narrative.advance" },
    {
      kind: "narrative.choose",
      sceneId: fixture.sceneId,
      nodeId: fixture.choiceNodeId,
      choiceId: fixture.leftChoiceId,
    },
  ]);
  const right = runNarrativeCommandsV1(fixture, [
    { kind: "narrative.advance" },
    {
      kind: "narrative.choose",
      sceneId: fixture.sceneId,
      nodeId: fixture.choiceNodeId,
      choiceId: fixture.rightChoiceId,
    },
  ]);
  expect(left.state.cursor?.nodeId).toBe(fixture.sharedNodeId);
  expect(right.state.cursor?.nodeId).toBe(fixture.sharedNodeId);
  expect(left.effects).not.toEqual(right.effects);
});
```

- [ ] **Step 2: Run and confirm the missing interpreter**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/narrative.test.ts`

Expected: FAIL because Narrative contract/interpreter/module files are absent.

- [ ] **Step 3: Implement the closed interpreter**

```ts
export type PocNarrativeInterpreterInputV1 =
  | {
      readonly kind: "start";
      readonly request: { readonly source: NarrativeSourceV1; readonly sceneId: SceneId };
    }
  | { readonly kind: "advance"; readonly cursor: NarrativeCursorV1 }
  | {
      readonly kind: "choose";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
    }
  | {
      readonly kind: "resume";
      readonly continuation: PocNarrativeContinuationV1;
      readonly resolution: PocNarrativeResolutionV1;
    };

export type PocNarrativeInterpreterRequestV1 =
  | {
      readonly kind: "condition";
      readonly cursor: NarrativeCursorV1;
      readonly conditions: readonly ConditionV1[];
    }
  | {
      readonly kind: "check";
      readonly cursor: NarrativeCursorV1;
      readonly request: CheckRequestV1;
    }
  | {
      readonly kind: "choice";
      readonly cursor: NarrativeCursorV1;
      readonly choice: NarrativeChoiceV1;
    }
  | {
      readonly kind: "effects";
      readonly cursor: NarrativeCursorV1;
      readonly effects: readonly PocEffectIntentV1[];
    }
  | {
      readonly kind: "checkpoint";
      readonly cursor: NarrativeCursorV1;
      readonly checkpointId: CheckpointId;
    };

export interface PocNarrativeContinuationV1 {
  readonly origin:
    | {
        readonly kind: "start";
        readonly request: { readonly source: NarrativeSourceV1; readonly sceneId: SceneId };
      }
    | { readonly kind: "advance"; readonly from: NarrativeCursorV1 }
    | {
        readonly kind: "choose";
        readonly cursor: NarrativeCursorV1;
        readonly choiceId: ChoiceId;
      };
  readonly transientState: NarrativeRuntimeStateV1;
  readonly automaticStepsUsed: NonNegativeSafeInteger;
  readonly pending: PocNarrativeInterpreterRequestV1;
}

export type PocNarrativeCheckDecisionV1 = Pick<CheckResultV1, "checkId" | "actorId" | "bandId">;

export type PocNarrativeResolutionV1 =
  | {
      readonly kind: "condition";
      readonly cursor: NarrativeCursorV1;
      readonly passed: boolean;
    }
  | {
      readonly kind: "check";
      readonly cursor: NarrativeCursorV1;
      readonly decision: PocNarrativeCheckDecisionV1;
    }
  | {
      readonly kind: "choice";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
      readonly visible: true;
      readonly enabled: true;
      readonly checkDecision: PocNarrativeCheckDecisionV1 | null;
    }
  | { readonly kind: "effects_applied"; readonly cursor: NarrativeCursorV1 }
  | { readonly kind: "checkpoint_applied"; readonly cursor: NarrativeCursorV1 };

export type PocNarrativeGameplayFactV1 = Extract<
  PocGameplayFactV1,
  { readonly kind: "narrative.advanced" | "narrative.choice_committed" }
>;

export type PocNarrativeInterpreterRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "command.unknown_reference"
      | "narrative.inactive"
      | "narrative.cursor_mismatch"
      | "narrative.choice_required";
  }
>;

export type PocNarrativeInterpreterFaultV1 =
  | {
      readonly category: "command_handler";
      readonly code: "narrative.step_limit_exceeded" | "narrative.call_depth_exceeded";
    }
  | {
      readonly category: "engine_invariant";
      readonly code: "narrative.invalid_cursor" | "story.reference_missing";
    };

export type PocNarrativeStepResultV1 =
  | {
      readonly kind: "yielded";
      readonly state: NarrativeRuntimeStateV1;
      readonly effects: readonly PocEffectIntentV1[];
      readonly checkpoints: readonly CheckpointId[];
      readonly gameplayFacts: readonly PocNarrativeGameplayFactV1[];
      readonly request: PocNarrativeInterpreterRequestV1;
      readonly continuation: PocNarrativeContinuationV1;
    }
  | {
      readonly kind: "settled";
      readonly state: NarrativeRuntimeStateV1;
      readonly effects: readonly [];
      readonly checkpoints: readonly [];
      readonly gameplayFacts: readonly PocNarrativeGameplayFactV1[];
      readonly request: null;
      readonly continuation: null;
    }
  | { readonly kind: "rejected"; readonly rejection: PocNarrativeInterpreterRejectionV1 }
  | { readonly kind: "faulted"; readonly fault: PocNarrativeInterpreterFaultV1 };

export function interpretPocNarrativeStepV1(
  data: DeepReadonly<PocSimulationDataV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  input: DeepReadonly<PocNarrativeInterpreterInputV1>,
): PocNarrativeStepResultV1;
```

Implement all Catalog node kinds against `data.narrative.scenes`, plus stale cursor checks, jump/call/return, branch choice, effect/checkpoint atomicity, and at most one yielded request. A command starts with `start | advance | choose`; the interpreter may synchronously cross only nodes that need no refreshed candidate observation. It yields before evaluating a condition or Check, committing a selected Choice, applying a command Effect batch, or handling an `eventCheckpoint`. The executor handles that request against the same transaction candidate and resumes only after the requested work succeeds. A yielded continuation is strict transient JSON, may point at an internal node, and never enters Narrative State, an owner proposal, Snapshot, Save, Query, or UI.

The Check resolver and Progression owner retain the complete validated `CheckResultV1`: they consume RNG, append the one `ResolvedCheckV1`/`check.resolved` Fact, and apply band Effects before resume. Narrative receives only the closed `{ checkId, actorId, bandId }` control-flow decision and must correlate it with the pending request/branch; it never consumes RNG, persists a Check, or emits a duplicate Check Fact. A Choice request is admitted by the shared Condition evaluator, then resolves its optional Check, applies Check-band Effects followed by authored Choice Effects, and only then resumes.

An `effects` request is resumed only after the effect router applies the exact batch. A `checkpoint` request preserves the transient cursor at the `eventCheckpoint`; Task 10 builds the `story.explicit` evaluation observation from that exact transient Narrative state, runs Scheduler selection and Effects, and only then resumes to `nextNodeId`. Every resolution repeats the pending cursor (and ChoiceId where applicable), and resume rejects an uncorrelated kind/value. Its `state` argument must be Canonical-JSON-equal to `continuation.transientState`. This request/continuation boundary is required: flattening Effect and Checkpoint arrays for a whole control-flow run cannot preserve Catalog order or allow later conditions to see the updated candidate.

The same `data` argument supplies `data.balance.maxNarrativeStepsPerCommand` and `data.balance.maxNarrativeCallDepth`; the Phase 4A fixture values are exactly `128` and `8`. `automaticStepsUsed` is carried across every yield/resume and increments only when an automatic/internal node is first entered, not when it is resumed. Exactly 128 automatic nodes and exactly 8 pushed call frames are accepted; attempting the next one produces the Catalog's stable fault and rolls back the whole outer command. There is no hard-coded `64`/`4`, environment override, hidden fallback, or counter reset at a yielded boundary. The interpreter reads no unrelated balance/content fields. It returns only transient Narrative state and requests; Task 10 applies cross-owner work and submits one final settled Narrative owner proposal.

The Narrative owner accepts only strict settled results for its `narrative.start`, `narrative.advance`, `narrative.choose`, and `narrative.complete` structural operations. It writes only Narrative State and emits at most the origin's single Narrative Fact: start emits none, advance emits `narrative.advanced`, and choose emits `narrative.choice_committed`; Check Facts remain Progression-owned. Internal/yielded continuation state is never owner-applicable.

The Narrative owner additionally exposes an absolute `narrative.debug.jump` proposal that validates the target scene/node and active-Narrative state without interpreting intervening effects. It is callable only from `PocGameDebugCommandExecutorV1`. Transaction candidate owns the corresponding debug-only RNG replacement primitive for `debug.rng.set`; RNG is not a Gameplay State Slice and no GameplayModule may claim it.

- [ ] **Step 4: Run interpreter and repository checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/narrative.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all node kinds, post-Effect and post-Checkpoint condition visibility, Check/Progression single ownership, the exact program-owned `128`/`8` limits (including boundary, one-past-boundary, and cross-yield vectors), invalid references, branch/rejoin, and strict JSON round-trip pass.

- [ ] **Step 5: Commit Narrative**

```bash
git add -- game/stories/poc/src/gameplay/modules/narrative game/stories/poc/src/test/narrative.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add narrative gameplay module"
```

### Approved Task 8 Authority-Repair Checkpoint

Before Task 8's expected-red, commit the approved field-level ABI repair independently. This repair closes inputs/outputs
that the pure providers require; it is not permission to start Task 8 production files early and does not alter any phase
checkbox.

**Files:**

- Modify: `game/stories/poc/src/gameplay/contracts/types.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/schemas.ts`
- Modify: `game/stories/poc/src/testing/gameplay-fixture.ts`
- Modify: `game/stories/poc/src/test/gameplay-contract.test.ts`
- Modify: `docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md`
- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md`
- Modify: `docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md`

The repair is exact: `TavernPreviewInputV1` becomes the strict `current_state` versus
`active_opening_baseline` discriminated union in the Catalog; `SettlementDraftV1` adds ordered
`appliedModifiers`; `EndingDefinitionV1` adds terminal `status`, the two named `summaryOutcomeIds`, and
`ProgressionEffectIntentV1[]` effects. The shared contract schemas migrate Ending definitions/references and the fixture
contains exactly one definition per terminal status. Task 8 owns its Tavern rule-invocation schemas and reuses the public
Workflow parser; the aggregate contract schema must not duplicate a second `OpeningSessionV1` implementation.

Run the focused contract test after changing its strict vectors and before completing the schemas/fixture; the expected red
is the old data shape or missing repaired field/refinement, not a dependency failure. Then run:

```bash
pnpm --filter @project-tavern/story-poc exec vitest run src/test/gameplay-contract.test.ts
pnpm typecheck
pnpm verify
```

Expected: PASS; both Tavern branches are closed, all three terminal definitions are unique/referentially complete,
definition effects are progression-only, the complete fixture remains deep-frozen, and no Task 8 implementation file
exists yet. Stage exactly the seven files above and commit:

```bash
git add -- game/stories/poc/src/gameplay/contracts/types.ts game/stories/poc/src/gameplay/contracts/schemas.ts game/stories/poc/src/testing/gameplay-fixture.ts game/stories/poc/src/test/gameplay-contract.test.ts docs/engineering/specs/2026-07-12-game-runtime-contract-catalog.md docs/engineering/plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md
git commit -m "fix(story-poc): repair gameplay rule contracts"
```

## Task 8: Implement Pure Demand, Settlement, Check, Ending, and Scheduling Rules/Resolvers

**Files:**

- Create: `game/stories/poc/src/gameplay/rules/demand-rules.ts`
- Create: `game/stories/poc/src/gameplay/rules/ending-rule.ts`
- Create: `game/stories/poc/src/gameplay/resolvers/tavern-settlement-resolver.ts`
- Create: `game/stories/poc/src/gameplay/resolvers/check-resolver.ts`
- Create: `game/stories/poc/src/gameplay/resolvers/scheduling-resolver.ts`
- Create: `game/stories/poc/src/test/rules-resolvers.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: Task 1 `PocRulesV1` input/output contracts, explicit `RuleRngV1`, the minimal fixture program, modifier order, event triggers, and authored balance/data.
- Produces: `createPocDemandRulesV1`, `createPocTavernSettlementResolverV1`, `createPocCheckResolverV1`, `createPocEndingRuleV1`, the separate `createPocSchedulingResolverV1`, the shared pure `evaluatePocConditionsV1` from that resolver module, `pocStoryRuleSlotsV1`, and one deeply frozen `createPocRulesV1(programData)` aggregate with the Catalog's exact seven rule slots.

- [ ] **Step 1: Write failing deterministic vectors and purity tests**

```ts
it("resolves the fixed demand and 2d6 vectors without mutating input", () => {
  const fixture = createPocGameplayFixtureV1();
  const rules = createPocRulesV1(fixture.program.data);
  expect(Object.keys(rules)).toEqual(["demand", "tavern", "checks", "endings"]);
  expect(Object.keys(rules.demand)).toEqual(["preview", "resolve"]);
  expect(Object.keys(rules.tavern)).toEqual(["preview", "settle"]);
  expect(Object.keys(rules.checks)).toEqual(["describe", "resolve"]);
  expect(Object.keys(rules.endings)).toEqual(["evaluate"]);
  expect(pocStoryRuleSlotsV1).toEqual([
    "demand.preview",
    "demand.resolve",
    "tavern.preview",
    "tavern.settle",
    "checks.describe",
    "checks.resolve",
    "endings.evaluate",
  ]);
  expect(rules).not.toHaveProperty("scheduling");
  const demandInput = demandSeedInputFixtureV1();
  const demandBefore = structuredClone(demandInput);
  const demand = rules.demand.resolve(demandInput, fixedRuleRngV1([2]));
  expect(demand.lines.map((line) => line.randomOffset)).toEqual([1]);
  expect(demandInput).toEqual(demandBefore);

  const check = rules.checks.resolve(checkInputFixtureV1(), fixedRuleRngV1([3, 2]));
  expect(check.dice).toEqual([4, 3]);
  expect(check.total).toBe(8);
});

it("schedules events in authored order without writing state", () => {
  const resolver = createPocSchedulingResolverV1(schedulingDataFixtureV1());
  expect(resolver.resolve(schedulingInputFixtureV1()).map((entry) => entry.eventId)).toEqual([
    "event.fixture_first",
    "event.fixture_second",
  ]);
});

it("keeps current-state trial calculation distinct from an active opening", () => {
  const rules = createPocRulesV1(createPocGameplayFixtureV1().program.data);
  const current = currentStateTavernPreviewInputFixtureV1({
    resources: { apRemaining: 0, cash: 100, playerStamina: 10, heroineStamina: 10 },
  });
  expect(rules.tavern.preview(current)).toMatchObject({
    basis: "current_state",
    allowed: false,
    rejectionCodes: ["calendar.insufficient_ap"],
    openingCosts: { commitment: "prospective", modeReasonId: "reason.fixture" },
  });

  const active = activeOpeningTavernPreviewInputFixtureV1();
  expect(rules.tavern.preview(active)).toMatchObject({
    basis: "active_opening_baseline",
    openingCosts: { commitment: "committed", ingredientShortages: [] },
  });
  expect(() => rules.tavern.preview({ ...active, plan: differentTavernPlanFixtureV1() })).toThrow();
});

it("uses stable largest remainders for reception and planned-portion caps", () => {
  const fixture = proportionalTavernSettlementFixtureV1();
  const resolver = createPocTavernSettlementResolverV1(fixture.data);
  const draft = resolver.settle(fixture.input, fixedRuleRngV1([]));
  expect(draft.orders).toEqual(fixture.expectedOrders);
  expect(draft.appliedModifiers).toEqual(fixture.expectedAppliedModifiers);
  expect(draft.orders.reduce((sum, line) => sum + line.actualSales, 0)).toBe(
    fixture.expectedActualSales,
  );
  expectPreviewContainsSettlementV1(resolver.preview(fixture.currentStatePreviewInput), draft);
});

it("evaluates endings from the typed policy without private thresholds", () => {
  const fixture = createPocGameplayFixtureV1();
  expect(fixture.program.data.balance.endingPolicy).toEqual({
    stableMinimumCashAfterLevy: 20,
    stableMinimumReputation: 50,
    stableMinimumBuiltFacilities: 1,
    reputationCrisisBelow: 45,
    stableReasonId: "reason.ending.stable",
    dangerReasonId: "reason.ending.danger",
    arrearsReasonId: "reason.ending.arrears",
    reputationCrisisReasonId: "reason.ending.reputation_crisis",
  });
  const evaluate = createPocRulesV1(fixture.program.data).endings.evaluate;
  expect(
    evaluate(
      endingInputFixtureV1({
        cash: 20,
        reputation: 50,
        facilityIds: [parseFacilityId("facility.fixture")],
        levyKind: "paid",
      }),
    ),
  ).toMatchObject({
    endingId: "ending.fixture",
    status: "completed_stable",
    reasonIds: ["reason.ending.stable"],
    effects: [],
    summary: {
      relationship: { outcomeId: "outcome.fixture.relationship" },
      investigation: { outcomeId: "outcome.fixture.investigation" },
    },
  });
  expect(
    [
      { cash: 19, reputation: 50, facilityIds: [parseFacilityId("facility.fixture")] },
      { cash: 20, reputation: 49, facilityIds: [parseFacilityId("facility.fixture")] },
      { cash: 20, reputation: 50, facilityIds: [] },
    ].map((input) => evaluate(endingInputFixtureV1({ ...input, levyKind: "paid" }))),
  ).toEqual([
    expect.objectContaining({
      endingId: "ending.fixture_danger",
      status: "completed_danger",
      reasonIds: ["reason.ending.danger"],
    }),
    expect.objectContaining({
      endingId: "ending.fixture_danger",
      status: "completed_danger",
      reasonIds: ["reason.ending.danger"],
    }),
    expect.objectContaining({
      endingId: "ending.fixture_danger",
      status: "completed_danger",
      reasonIds: ["reason.ending.danger"],
    }),
  ]);
  expect(
    evaluate(
      endingInputFixtureV1({
        cash: 19,
        reputation: 45,
        facilityIds: [],
        levyKind: "paid",
      }),
    ),
  ).toMatchObject({
    endingId: "ending.fixture_danger",
    status: "completed_danger",
    reasonIds: ["reason.ending.danger"],
  });
  expect(
    evaluate(endingInputFixtureV1({ cash: 19, reputation: 44, facilityIds: [], levyKind: "paid" })),
  ).toMatchObject({
    endingId: "ending.fixture_danger",
    status: "completed_danger",
    reasonIds: ["reason.ending.danger", "reason.ending.reputation_crisis"],
  });
  expect(evaluate(endingInputFixtureV1({ levyKind: "arrears" }))).toMatchObject({
    endingId: "ending.fixture_arrears",
    status: "failed_arrears",
    reasonIds: ["reason.ending.arrears"],
  });

  const alternateData = createValidatedAlternateEndingPolicyDataV1(fixture.program.data, {
    stableMinimumCashAfterLevy: 21,
    stableReasonId: "reason.fixture.alternate_stable",
    dangerReasonId: "reason.fixture.alternate_danger",
  });
  expect(
    createPocRulesV1(alternateData).endings.evaluate(
      endingInputFixtureV1({
        cash: 20,
        reputation: 50,
        facilityIds: [parseFacilityId("facility.fixture")],
        levyKind: "paid",
      }),
    ),
  ).toMatchObject({
    endingId: "ending.fixture_danger",
    status: "completed_danger",
    reasonIds: ["reason.fixture.alternate_danger"],
  });
});
```

- [ ] **Step 2: Run and confirm missing rule/resolver implementations**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/rules-resolvers.test.ts`

Expected: FAIL with missing rules/resolvers.

- [ ] **Step 3: Implement exact pure factories**

```ts
export interface PocRulesV1 {
  readonly demand: {
    preview(input: DeepReadonly<DemandProjectionInputV1>): DemandPreviewV1;
    resolve(input: DeepReadonly<DemandSeedInputV1>, rng: RuleRngV1): DemandSeedResultV1;
  };
  readonly tavern: {
    preview(input: DeepReadonly<TavernPreviewInputV1>): TavernPreviewV1;
    settle(input: DeepReadonly<TavernSettlementInputV1>, rng: RuleRngV1): SettlementDraftV1;
  };
  readonly checks: {
    describe(input: DeepReadonly<CheckInputV1>): CheckPreviewV1;
    resolve(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1;
  };
  readonly endings: {
    evaluate(input: DeepReadonly<EndingInputV1>): EndingResultV1;
  };
}

export function createPocRulesV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1> {
  const tavern = createPocTavernSettlementResolverV1(data);
  const checks = createPocCheckResolverV1(data);
  const endings = createPocEndingRuleV1(data);
  return deepFreeze({
    demand: createPocDemandRulesV1(data),
    tavern: { preview: tavern.preview, settle: tavern.settle },
    checks: { describe: checks.describe, resolve: checks.resolve },
    endings: { evaluate: endings.evaluate },
  });
}
```

The only patchable `StoryRuleSlotV1` values are the seven ordered members of `pocStoryRuleSlotsV1`: `demand.preview`, `demand.resolve`, `tavern.preview`, `tavern.settle`, `checks.describe`, `checks.resolve`, and `endings.evaluate`. Runtime key tests reject any extra aggregate/nested member. Demand materializes stable per-day/segment offsets and previews ranges. Tavern preview/settlement implement the Catalog's one integer allocation pipeline: current-state input includes the four current resource values used by the rule's resource/shortage `allowed`; active-baseline input accepts only the exact frozen plan/session; effective orders, reception scaling, and per-recipe planned caps use proportional largest remainder with stable ID ties; mode reason/costs and base reputation/teamwork/heroine-mood effect reasons come from the exact ServiceMode definition, while each Modifier explanation keeps its own reason; negative service-cost/capacity/preparation totals clamp once at zero. Task 8 does not recreate structural/reference/day/mode availability guards or the shared Condition evaluator: Task 10/12's one calculator wrapper supplies a guard-valid plan to this rule and combines ordered guard rejections with its resource result. Preview exactly enumerates the current PoC demand-range Cartesian product and proves that each recipe's actual settlement and basis-appropriate cash delta are contained; any future non-enumerating replacement must be conservatively covering, never sampled. `SettlementDraftV1.appliedModifiers` is the ordered authority copied into the OpeningLedger and used for applicable opening-Aura consumption. Checks describe and resolve threshold/2D6 outcomes. Ending evaluation first derives status/reasons exclusively from `data.balance.endingPolicy`, then selects the unique `EndingDefinitionV1.status`, copies its endingId/effects, and resolves both summary entries through its `summaryOutcomeIds`; it never depends on array position or hard-coded Ending/Outcome IDs. The validated alternate-policy vector proves the provider follows changed thresholds and Reason bindings, so no provider closure may retain a second `20/50/1/45` or ReasonId literal. Scheduling is a separate named resolver derived from validated event data and included in simulation source identity, but it is not a `PocRulesV1` member or PatchSurface rule slot. It evaluates each frozen context observation, orders candidates by priority descending then EventId, returns event requests/effects, and never dispatches or mutates; tests cover the Catalog's outer context order and prove that an earlier effect cannot enable a later event in the same context. `evaluatePocConditionsV1` is the one exhaustive, pure Condition implementation used by Scheduling, Task 10 Narrative execution, and Task 12 Query/Choice projection; none of those consumers may retain a second Condition switch.

- [ ] **Step 4: Run deterministic, mutation, and schema tests**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/rules-resolvers.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; same seed/input returns identical output and draw trace, both Tavern input branches and active-plan equality are strict-validated, proportional cap/tie vectors and negative-clamp vectors are exact, every actual sale/cash result falls inside preview, ending status-to-definition/summary/effects mapping is data-driven, invalid outputs/thenables are rejected by strict schemas, inputs remain byte-identical, and no rule accesses platform globals.

- [ ] **Step 5: Commit Rules and Resolvers**

```bash
git add -- game/stories/poc/src/gameplay/rules game/stories/poc/src/gameplay/resolvers game/stories/poc/src/test/rules-resolvers.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add gameplay rules and resolvers"
```

## Task 9: Implement the Candidate Transaction and Exhaustive Effect Router

**Files:**

- Create: `game/stories/poc/src/gameplay/modules/index.ts`
- Create: `game/stories/poc/src/gameplay/transaction/candidate.ts`
- Create: `game/stories/poc/src/gameplay/transaction/effect-router.ts`
- Create: `game/stories/poc/src/test/transaction.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: all ten module exports, the five owner-specific initial slices from the frozen `PocSimulationProgramV1`, `PocEffectIntentV1`, owner operations/proposals, transactional RNG, aggregate State schema, and stable reference validators.
- Produces: `PocGameplayModuleTupleV1`, `createPocGameplayModuleTupleV1(program)`, `PocTransactionCandidateV1`, `createPocTransactionCandidateV1(snapshot, program, modules)`, `routePocEffectBatchV1`, exact effect-owner table, ordered GameplayFact/ledger accumulation, `commitPocCandidateV1`, and rollback diagnostics.

- [ ] **Step 1: Write failing atomicity and exhaustive-owner tests**

```ts
it("maps every effect kind to exactly one owner", () => {
  expect(Object.keys(pocEffectOwnerByKindV1).sort()).toEqual([...pocEffectIntentKindsV1].sort());
});

it("rolls back an earlier valid effect when a later effect rejects", () => {
  const fixture = createPocGameplayFixtureV1();
  const modules = createPocGameplayModuleTupleV1(fixture.program);
  const candidate = createPocTransactionCandidateV1(fixture.snapshot, fixture.program, modules);
  const result = routePocEffectBatchV1(candidate, [
    {
      kind: "calendar.ap.adjust",
      delta: 1,
      reasonId: parseReasonId("reason.fixture_adjust"),
    },
    {
      kind: "inventory.consume",
      lines: impossibleConsumeFixtureV1(),
      reasonId: parseReasonId("reason.fixture_consume"),
    },
  ]);
  expect(result.kind).toBe("rejected");
  expect(candidate.snapshot()).toBe(fixture.snapshot);
  expect(candidate.gameplayFacts()).toEqual([]);
});
```

- [ ] **Step 2: Run and confirm missing transaction files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/transaction.test.ts`

Expected: FAIL because candidate/effect router do not exist.

- [ ] **Step 3: Implement the non-public writable candidate**

```ts
export interface PocEffectBatchResultV1 {
  readonly kind: "applied" | "rejected";
  readonly rejection?: PocRejectionReasonV1;
}

export function routePocEffectBatchV1(
  candidate: PocTransactionCandidateV1,
  effects: readonly DeepReadonly<PocEffectIntentV1>[],
): PocEffectBatchResultV1;
```

`createPocGameplayModuleTupleV1(program)` creates the fixed tuple in catalog order. Actors, Status, Inventory, Tavern, and Progression factories each receive only their validated owner Slice projected from `program.data`; Run, Calendar, Facilities, Workflow, and Narrative reuse their static bindings. Tests prove two Programs retain identical descriptors/order while their corresponding initial owner values differ without cross-instance leakage. The candidate accepts this exact selected tuple rather than importing singletons or rebuilding an equivalent tuple.

The candidate clones State/RNG once, retains RunIntegrity only as an opaque reference for the final envelope, exposes only owner-scoped internal methods, applies effects in authored order, validates source/reference before semantic proposal, derives the appropriate `ChangeReasonV1` from each exact `reasonId` plus the active command/event/action provenance, accumulates facts once, and commits only after complete aggregate schema/invariant validation. Effect payloads remain the Catalog's exact union: `calendar.ap.adjust` carries `reasonId`, `inventory.consume` carries only `lines + reasonId`, grants use their declared source type, and no effect substitutes an owner-internal `ChangeReasonV1` or unrelated Modifier source. It never passes integrity to a Rule, Resolver, owner, Query, or projector, and normal Gameplay can only reattach the exact input reference. No candidate or owner capability is exported from the Story default entry, GameSimulation, GameQueries, SemanticGamePort, or UI.

- [ ] **Step 4: Run transaction and property checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/transaction.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all effect kinds are exhaustive, later failure rolls back all prior effects/RNG/facts, and success preserves authored fact/ledger order.

- [ ] **Step 5: Commit the transaction layer**

```bash
git add -- game/stories/poc/src/gameplay/modules/index.ts game/stories/poc/src/gameplay/transaction game/stories/poc/src/test/transaction.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): add atomic effect transactions"
```

## Task 10: Implement Core Lifecycle, Action, Calendar, and Narrative Commands

**Files:**

- Create: `game/stories/poc/src/gameplay/game-command-executor.ts`
- Create: `game/stories/poc/src/test/command-executor-core.test.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/types.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/schemas.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: transaction candidate/router, ten module bindings, Rules/Resolvers, `PocGameCommandV1`, execution-attempt envelopes, and aggregate invariants.
- Produces: `PocGameCommandExecutorV1`, `createPocGameCommandExecutorV1(program, modules)`, and complete handling for `run.start`, `policy.choose`, `inventory.buy`, `actor.prepare_food`, `actor.rest`, `story.action.start`, `facility.choose`, `tavern.plan.set`, `narrative.advance`, `narrative.choose`, and `calendar.advance_phase`.

- [ ] **Step 1: Write failing same-attempt and core-command tests**

```ts
it("executes each admitted command exactly once and commits one sequence", () => {
  const fixture = createPocGameplayFixtureV1();
  const modules = createPocGameplayModuleTupleV1(fixture.program);
  const executor = createPocGameCommandExecutorV1(fixture.program, modules);
  const attempt = executor.executeAttempt(fixture.snapshot, { kind: "run.start" }, undefined);
  expect(attempt.result).toMatchObject({ kind: "committed" });
  if (attempt.result.kind === "committed") {
    expect(attempt.result.snapshot.commandSequence).toBe(fixture.snapshot.commandSequence + 1);
    expect(attempt.result.snapshot.state.simulation.run.status).toBe("setup");
    expect(attempt.result.snapshot.state.story.narrative.source?.kind).toBe("manifest_start");
  }
});

it("preserves the exact input Snapshot for rejection", () => {
  const fixture = createPocGameplayFixtureV1();
  const modules = createPocGameplayModuleTupleV1(fixture.program);
  const executor = createPocGameCommandExecutorV1(fixture.program, modules);
  const attempt = executor.executeAttempt(
    fixture.snapshot,
    { kind: "policy.choose", policyId: parsePolicyId("policy.fixture") },
    undefined,
  );
  expect(attempt.result.kind).toBe("rejected");
  expect(attempt.result.snapshot).toBe(fixture.snapshot);
  expect(attempt.diagnostics.candidateRngAfter).toEqual(fixture.snapshot.rng);
  expect(attempt.diagnostics.committedRngAfter).toBe(fixture.snapshot.rng);
});

it("treats modified RunIntegrity as opaque during normal gameplay", () => {
  const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
  const modules = createPocGameplayModuleTupleV1(fixture.program);
  const executor = createPocGameCommandExecutorV1(fixture.program, modules);
  const attempt = executor.executeAttempt(fixture.snapshot, { kind: "actor.rest" }, undefined);
  expect(attempt.result.kind).toBe("committed");
  if (attempt.result.kind === "committed") {
    expect(attempt.result.snapshot.integrity).toBe(fixture.snapshot.integrity);
  }
});
```

- [ ] **Step 2: Run and confirm the missing executor**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/command-executor-core.test.ts`

Expected: FAIL because `game-command-executor.ts` does not exist.

- [ ] **Step 3: Implement one exhaustive command switch and core handlers**

```ts
export interface PocGameCommandExecutorV1 extends GameCommandExecutorV1<
  PocGameSnapshotV1,
  PocGameCommandV1,
  undefined,
  PocCommandExecutionAttemptV1
> {}

export function createPocGameCommandExecutorV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
): PocGameCommandExecutorV1 {
  return Object.freeze({
    executeAttempt(snapshot, command, context) {
      if (context !== undefined) throw new TypeError("PoC execution context must be undefined");
      const parsed = pocGameCommandSchemaV1.parse(command);
      return executePocCommandAttemptV1(snapshot, parsed, program, modules);
    },
  });
}
```

Implement the eleven named command handlers through the candidate and pass the exact constructor-supplied `modules` tuple into every candidate; the executor never creates or imports a second tuple. `run.start` consumes the exact demand RNG draws once, asks Tavern to persist all demand seeds plus D1 `currentDemand`, keeps Run in `setup`, and opens the manifest Narrative; only the later policy selection activates Run. `facility.choose` coordinates the Facilities decision, Inventory facility ledger/cash change, and one-time cold-storage extension of existing batches without letting either owner write the other.

Every Narrative-starting or Narrative-player handler drives Task 7's resumable interpreter inside the same candidate until it returns `settled`. Conditions use Task 8's shared evaluator against the latest candidate plus the continuation's exact transient Narrative state. A Check request constructs the validated `CheckInputV1`, consumes Rule RNG once, asks Progression to record the complete result, routes Check-band Effects, and resumes with only the correlated control-flow decision. A Choice request first applies the shared show/enable gates and existing hidden/disabled rejections, then resolves its optional Check, routes Check-band Effects followed by authored Choice Effects, and resumes. A command-Effect request routes the batch before resume. An `eventCheckpoint` request evaluates and applies its `story.explicit` Scheduler context while the transient cursor is still the checkpoint, then resumes. Only the final settled state enters one Narrative owner proposal; any rejection/fault rolls back all prior Effects, RNG, Progression, Scheduler, Workflow, cursor, and Facts.

`calendar.advance_phase` follows the authoritative boundary order rather than one generic expiry pass. Every transition first validates blockers and applies old-phase direct effects, then the executor selects only the applicable `phase_end` countdown instances. Entering evening materializes planned closure or the exact emergency closure when required. Evening-to-next-morning additionally resolves an unstarted non-closed plan as emergency closure (or rejects an active Opening), spoils remaining ingredients, applies `phase_end`, then `day_end`, collects recovery while `night_recovery` Auras are still active and only then decrements them, clears the old plan, advances day/phase/AP, resets daily preparation, materializes the next service-day demand, resets `eveningResolved`, and finally evaluates `day.ended`/`week.ended`/`phase.entered` Scheduler contexts against their frozen post-transition observations. GameplayFacts preserve mutation/causal order and are never regrouped by kind or ID. Preview logic is not duplicated here; Task 12 builds it from the same guards, calculators, Rules, and resolvers.

- [ ] **Step 4: Run all command vectors and repository checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/command-executor-core.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; committed/rejected/faulted attempts preserve exact Snapshot/RNG/sequence semantics, all eleven command kinds are handled, and no executor method exposes queries.

- [ ] **Step 5: Commit the core executor**

```bash
git add -- game/stories/poc/src/gameplay/game-command-executor.ts game/stories/poc/src/gameplay/contracts/types.ts game/stories/poc/src/gameplay/contracts/schemas.ts game/stories/poc/src/test/command-executor-core.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): execute core gameplay commands"
```

## Task 11: Complete Opening, WorldAction, and Levy Transactions

**Files:**

- Modify: `game/stories/poc/src/gameplay/game-command-executor.ts`
- Create: `game/stories/poc/src/test/command-executor-workflows.test.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/schemas.ts`

**Interfaces:**

- Consumes: Task 10 executor, Opening/WorldAction/Ending inputs, Settlement/Check/Ending/Scheduling outputs, and all owner capabilities.
- Produces: complete handling for `tavern.opening.start`, `tavern.opening.continue`, `tavern.opening.finalize`, `world.action.begin`, `world.action.complete`, and `levy.pay`; all 17 PoC command kinds are then exhaustive.

- [ ] **Step 1: Write failing interruption, continuation, and terminal tests**

```ts
it("charges Opening costs once across a blocking interruption", () => {
  const harness = createExecutorWorkflowFixtureV1();
  const started = harness.commit({ kind: "tavern.opening.start" });
  const active = started.state.simulation.activeWorkflow;
  expect(active?.kind).toBe("opening");
  const baseline = active?.kind === "opening" ? active.baseline : null;
  const cashAfterStart = started.state.simulation.inventory.cash;
  expect(started.state.story.narrative.source).toEqual({
    kind: "event",
    eventId: "event.fixture_opening_interrupt",
  });

  const continued = harness.from(started).commit({ kind: "tavern.opening.continue" });
  expect(continued.state.simulation.inventory.cash).toBe(cashAfterStart);
  expect(continued.state.simulation.activeWorkflow).toMatchObject({
    kind: "opening",
    baseline,
  });
});

it("pays or records arrears and materializes one terminal completion", () => {
  const paid = createLevyFixtureV1({
    cash: 160,
    reputation: 50,
    builtFacilities: [facilityStateFixtureV1("facility.fixture")],
  }).commit({ kind: "levy.pay" });
  expect(paid.state.simulation.run.status).toBe("completed_stable");
  expect(paid.state.simulation.run.completion?.levy.kind).toBe("paid");
  expect(paid.state.simulation.inventory.cash).toBe(20);

  const arrears = createLevyFixtureV1({ cash: 139 }).commit({ kind: "levy.pay" });
  expect(arrears.state.simulation.run.status).toBe("failed_arrears");
  expect(arrears.state.simulation.run.completion?.levy.kind).toBe("arrears");
  expect(arrears.state.simulation.inventory.cash).toBe(139);
});
```

- [ ] **Step 2: Run and observe unhandled-command failures**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/command-executor-workflows.test.ts`

Expected: FAIL with the stable unhandled command fault for the six remaining kinds.

- [ ] **Step 3: Implement the six cross-owner transactions**

Opening start uses the one shared Tavern calculator wrapper: it first applies the common structural/reference/day/mode guards, then builds the `current_state` rule input with exact current resources and combines the ordered guard/resource rejections. On success it commits AP/stamina/cash/ingredient costs and one immutable baseline, asks Workflow—not Tavern—to install the OpeningSession, then arbitrates at most one blocking event. Continue advances only the exact Opening checkpoint and never charges again. Finalize accepts only `ready_to_finalize`, calls `program.rules.tavern.settle` once from the stored baseline, applies revenue/discard/relationship/progression effects, copies `SettlementDraftV1.appliedModifiers` unchanged into the OpeningLedger, decrements only `opening` countdown Auras represented by actually applicable modifier sources after successful settlement, appends one Tavern service-history row, clears Workflow, and sets Calendar `eveningResolved=true`; any rejection/fault preserves the already-committed Start state and baseline without a duplicate charge. WorldAction moves through exactly `begin_scene → awaiting_completion_phase → completion_scene → ready_to_complete`, records one persisted check/effect set, and starts no third result Narrative. Levy first proposes Inventory paid/arrears, then `program.rules.endings.evaluate`/Progression using the unique status-matched Ending definition, and finally Run completion at D7 afternoon without changing phase; any failure rolls back all owners.

```ts
const assertNeverCommandV1 = (value: never): never => {
  throw new TypeError(`unhandled PoC command: ${JSON.stringify(value)}`);
};
```

The final switch ends in `assertNeverCommandV1(parsed)` so adding a command kind fails typecheck until it has a handler and vectors.

- [ ] **Step 4: Run all executor, transaction, and full checks**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/command-executor-core.test.ts src/test/command-executor-workflows.test.ts src/test/transaction.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all 17 command kinds have commit/rejection vectors, applicable faults roll back, and Opening/WorldAction/terminal invariants pass strict JSON round-trip.

- [ ] **Step 5: Commit workflow commands**

```bash
git add -- game/stories/poc/src/gameplay/game-command-executor.ts game/stories/poc/src/gameplay/contracts/schemas.ts game/stories/poc/src/test/command-executor-workflows.test.ts
git commit -m "feat(story-poc): complete workflow transactions"
```

## Task 12: Assemble GameQueries, Replayable Debug Execution, GameView, and GameSimulation

**Files:**

- Modify: `game/stories/poc/src/gameplay/contracts/schemas.ts`
- Modify: `game/stories/poc/src/gameplay/contracts/types.ts`
- Create: `game/stories/poc/src/gameplay/game-debug-command-executor.ts`
- Create: `game/stories/poc/src/gameplay/game-queries.ts`
- Create: `game/stories/poc/src/gameplay/game-view-projector.ts`
- Create: `game/stories/poc/src/gameplay/game-simulation.ts`
- Create: `game/stories/poc/src/test/game-debug-command-executor.test.ts`
- Create: `game/stories/poc/src/test/game-queries.test.ts`
- Create: `game/stories/poc/src/test/game-simulation.test.ts`
- Create: `game/stories/poc/src/test/game-session-integration.test.ts`
- Modify: `game/stories/poc/src/gameplay/index.ts`

**Interfaces:**

- Consumes: `PocGameplayModuleTupleV1` and `createPocGameplayModuleTupleV1(program)`, complete State/Command/Fact/Rejection/replayable-Debug schemas, normal executor, transaction candidate, post-Hotfix `program.rules`, Rules/Resolvers, Base `BootstrapEntropyV1`, `GameDebugCommandExecutorV1`, `defineGameSimulation<PocGameSimulationTypesV1>()`, and test-only `createGameSessionV1` from `@sillymaker/base/runtime`.
- Produces: `createPocGameBootstrapInputV1(entropy)`, `createInitialPocGameStateV1(modules, bootstrap)`, `PocGameDebugCommandExecutorV1`, `createPocGameDebugCommandExecutorV1(program, modules)`, `createPocGameQueriesV1(state, program)`, `projectPocGameViewV1(queries)`, `createPocGameSimulationV1(program)`, exact `PocGameQueriesV1`, `PocGameViewV1`, `PocGameSimulationV1`, and real-session integrity-preservation tests.

- [ ] **Step 1: Write failing query/executor orthogonality tests**

```ts
it("creates queries separately from command execution", () => {
  const fixture = createPocGameplayFixtureV1();
  const simulation = createPocGameSimulationV1(fixture.program);
  expect("createQueries" in simulation.commandExecutor).toBe(false);
  expect("createQueries" in simulation.debugCommandExecutor).toBe(false);
  const queries = simulation.createQueries(fixture.snapshot.state);
  expect(Object.isFrozen(queries)).toBe(true);
  expect(Object.keys(queries)).toEqual([
    "getAvailableActions",
    "explainAvailability",
    "previewCommand",
    "previewTavernPlan",
    "getHudProjection",
    "getInventoryProjection",
    "getTavernProjection",
    "getFacilitiesProjection",
    "getLedgerProjection",
    "getNarrativeProjection",
    "getRunStartControl",
    "getLifePolicySelection",
    "getTavernOpeningControl",
    "getDemandForecast",
    "getObligationForecast",
    "getResolvedChecks",
    "getRunCompletion",
  ]);
  expect(queries.getRunStartControl()).toMatchObject({
    command: { kind: "run.start" },
    preview: { allowed: true, confirmation: null },
  });
  expect(queries.previewCommand({ kind: "actor.rest" })).toMatchObject({
    allowed: false,
  });
  expect(simulation.projectGameView(queries)).toMatchObject({
    status: "setup",
    hud: { day: 1, phase: "morning" },
    runStartControl: { command: { kind: "run.start" } },
  });
  expect(simulation.projectGameView(queries)).not.toHaveProperty("narrative");
  expect(queries.getNarrativeProjection()).toBeNull();
});

it("owns exactly the ten replayable debug kinds and excludes anchors", () => {
  expect(pocDebugCommandKindsV1).toEqual([
    "debug.calendar.set_ap",
    "debug.actor.set_stamina",
    "debug.actor.set_mood",
    "debug.relationship.set",
    "debug.inventory.adjust_cash",
    "debug.aura.apply",
    "debug.aura.clear",
    "debug.story.fact.set",
    "debug.narrative.jump",
    "debug.rng.set",
  ]);
  expect(
    pocDebugCommandSchemaV1.safeParse({
      kind: "debug.fixture.load",
      fixtureId: "fixture.poc_contract",
      seed: 1,
    }).success,
  ).toBe(false);
});

it("rejects a foreign binding and duplicate state owner", () => {
  expect(() => createSimulationWithDuplicateRunV1()).toThrow(/state slot owner/u);
  expect(() => createSimulationWithE2eBindingV1()).toThrow(/simulation type witness/u);
});

it("keeps engine-owned integrity out of Story queries and projections", () => {
  expectTypeOf(createPocGameQueriesV1).parameter(0).toEqualTypeOf<DeepReadonly<PocGameStateV1>>();
  expectTypeOf(createPocGameSimulationV1(createPocGameplayFixtureV1().program).projectGameView)
    .parameter(0)
    .toEqualTypeOf<PocGameQueriesV1>();
  const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
  const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
  expect(projectPocGameViewV1(queries)).not.toHaveProperty("integrity");
});

it("draws bootstrap entropy exactly once in the frozen order", () => {
  const entropy = createCountingBootstrapEntropyV1();
  expect(createPocGameBootstrapInputV1(entropy.port)).toEqual({
    rngSeed: entropy.expectedSeed,
    runId: entropy.expectedRunId,
  });
  expect(entropy.calls()).toEqual(["nextNonZeroUint32", "nextUuidV4"]);
});

it("runs normal gameplay through a real GameSession without changing integrity", async () => {
  const fixture = createPocActiveGameplayFixtureV1({ integrity: "modified" });
  const composition = createPocGameSessionFixtureV1(fixture);
  await composition.session.dispatch({ kind: "actor.rest" });
  expect(composition.executeAttemptCalls()).toBe(1);
  expect(composition.session.getCurrentSnapshot().integrity).toBe(fixture.snapshot.integrity);
});

it.each(pocReplayableDebugCommandVectorsV1)(
  "validates and executes $kind through its declared owner path",
  ({ command, expectedOwner }) => {
    const fixture = createPocGameplayFixtureV1();
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const executor = createPocGameDebugCommandExecutorV1(fixture.program, modules);
    expect(executor.validate(fixture.snapshot, command, undefined)).toEqual({ kind: "allowed" });
    const attempt = executor.executeAttempt(fixture.snapshot, command, undefined);
    expect(attempt.result.kind).toBe("committed");
    expect(attempt).not.toHaveProperty("result.reasons");
    expect(ownerEvidenceFromDebugAttemptV1(attempt)).toEqual([expectedOwner]);
    expect(attempt.result.snapshot.integrity).toBe(fixture.snapshot.integrity);
  },
);

it("returns stable queue-front validation errors without opening an attempt", () => {
  const fixture = createPocGameplayFixtureV1();
  const modules = createPocGameplayModuleTupleV1(fixture.program);
  const executor = createCountingPocDebugExecutorV1(fixture.program, modules);
  const result = executor.validate(fixture.snapshot, unknownReasonDebugCommandV1(), undefined);
  expect(result).toMatchObject({
    kind: "validation_failed",
    errors: [{ code: "debug.unknown_reference" }],
  });
  expect(executor.executeAttemptCalls()).toBe(0);
});
```

- [ ] **Step 2: Run and confirm missing query/simulation files**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test/game-debug-command-executor.test.ts src/test/game-queries.test.ts src/test/game-simulation.test.ts`

Expected: FAIL because the replayable DebugCommand executor, GameQueries, projector, and GameSimulation are absent.

- [ ] **Step 3: Implement immutable queries and preview parity**

```ts
export interface PocHudProjectionV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly cash: Money;
  readonly reputation: NonNegativeSafeInteger;
  readonly playerStamina: StaminaStateV1;
  readonly heroineStamina: StaminaStateV1;
  readonly heroineMood: MoodPoint;
  readonly relationship: RelationshipStateV1;
  readonly levyAmount: Money;
}

export interface PocInventoryBatchProjectionV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
  readonly acquiredDay: DayIndex;
  readonly lastUsableDay: AbsoluteDayIndex;
  readonly refrigerationExtended: boolean;
}

export interface PocInventoryProjectionV1 {
  readonly ingredientBatches: readonly PocInventoryBatchProjectionV1[];
  readonly itemStacks: readonly ItemStackV1[];
}

export interface PocTavernProjectionV1 {
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly helper: HelperStateV1;
  readonly preparation: DailyPreparationStateV1;
  readonly servicePlan: TavernPlanV1 | null;
  readonly currentPlanPreview: TavernPreviewV1 | null;
  readonly serviceHistory: readonly ServiceHistoryEntryV1[];
}

export interface PocFacilitiesProjectionV1 {
  readonly built: readonly FacilityStateV1[];
  readonly decisions: readonly FacilityDecisionRecordV1[];
}

export interface PocLedgerProjectionV1 {
  readonly startingCash: Money;
  readonly currentCash: Money;
  readonly entries: readonly LedgerEntryV1[];
}

export interface PocGameQueriesV1 {
  getAvailableActions(): readonly ActionViewV1[];
  explainAvailability(actionId: ActionId): AvailabilityExplanationV1;
  previewCommand<C extends PocGameCommandV1>(command: C): CommandPreviewV1<C>;
  previewTavernPlan(plan: TavernPlanV1): TavernPreviewV1;
  getHudProjection(): PocHudProjectionV1;
  getInventoryProjection(): PocInventoryProjectionV1;
  getTavernProjection(): PocTavernProjectionV1;
  getFacilitiesProjection(): PocFacilitiesProjectionV1;
  getLedgerProjection(): PocLedgerProjectionV1;
  getNarrativeProjection(): NarrativeProjectionV1 | null;
  getRunStartControl(): RunStartControlProjectionV1 | null;
  getLifePolicySelection(): LifePolicySelectionProjectionV1 | null;
  getTavernOpeningControl(): TavernOpeningControlProjectionV1 | null;
  getDemandForecast(): DemandForecastV1 | null;
  getObligationForecast(): ObligationForecastV1 | null;
  getResolvedChecks(): readonly ResolvedCheckV1[];
  getRunCompletion(): RunCompletionV1 | null;
}

export interface PocGameViewV1 {
  readonly status: "setup" | "active" | "terminal";
  readonly hud: PocHudProjectionV1;
  readonly actions: readonly ActionViewV1[];
  readonly runStartControl: RunStartControlProjectionV1 | null;
  readonly lifePolicySelection: LifePolicySelectionProjectionV1 | null;
  readonly tavernOpeningControl: TavernOpeningControlProjectionV1 | null;
  readonly demandForecast: DemandForecastV1 | null;
  readonly obligationForecast: ObligationForecastV1 | null;
  readonly inventory: PocInventoryProjectionV1;
  readonly tavern: PocTavernProjectionV1;
  readonly facilities: PocFacilitiesProjectionV1;
  readonly ledger: PocLedgerProjectionV1;
  readonly resolvedChecks: readonly ResolvedCheckV1[];
  readonly completion: RunCompletionV1 | null;
}

export function createPocGameQueriesV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): PocGameQueriesV1;
```

Every preview reuses the same guards, cost calculators, Rules/Resolvers, stable references, and confirmation metadata as execution without consuming RNG or mutating. `getAvailableActions`, `explainAvailability`, `previewCommand`, and execute share one ordered visibility/availability implementation. `previewTavernPlan` is the only prospective/committed Opening calculator projection and calls the same shared wrapper as Opening start: without a session it supplies the current resource branch after the common structural/reference/day/mode guards; with a session it supplies only the exact baseline plan/session branch and never rebuilds a current-state hybrid. The Tavern rule does not duplicate the shared Condition evaluator. Run start, life-policy choice, and Opening start/continue/finalize are exposed only through their exact control projections; in particular `getTavernOpeningControl()` returns null during an active Narrative or WorldAction and otherwise returns exactly the one context-valid Opening branch. Demand and obligation forecasts follow their typed visibility/basis unions and never expose hidden actual demand/check results. The five `Poc*ProjectionV1` accessors return the exact deeply frozen Strict-JSON field sets above: HUD contains the exact player-facing counters; Inventory batch projection omits `source`; Tavern omits `demandSeeds`, `currentDemand`, and uncommitted actual demand, and sets `currentPlanPreview=null` exactly when `servicePlan=null`; Facilities exposes only `built`/`decisions`; Ledger exposes only starting/current cash plus committed entries. Their strict schemas reject every missing/extra field, and query tests assert exact `Object.keys` order plus the private-field omissions.

`projectPocGameViewV1` calls these accessors and returns the exact field set above; it does not invent a second state reader. Narrative is deliberately absent from `PocGameViewV1`: Phase 4B publishes `queries.getNarrativeProjection()` as the separate atomic `SemanticPublicationV1.narrative` field from the same Queries instance. The Story-local query factory accepts Gameplay State rather than the full Snapshot, so it cannot inspect engine-owned RunIntegrity. The Story-local projector accepts only the already-created query object; it never receives Snapshot or creates a second query source.

- [ ] **Step 4: Implement queue-front debug validation and owner-routed attempts**

`createPocGameDebugCommandExecutorV1(program, modules)` implements `GameDebugCommandExecutorV1` and exhaustively switches over the exact ten-kind `PocDebugCommandV1`. `validate` parses no structural input—that already happened at admission—but checks the latest queued Snapshot for reason/actor/Aura/Aura-instance/fact/Narrative references, range policies, Aura target/duration/conflict rules, and active-Narrative requirements. It returns all deterministic errors in authored validation order. A validation failure creates no candidate, consumes no RNG/sequence, and cannot enter CommandLog.

```ts
export interface PocGameDebugCommandExecutorV1 extends GameDebugCommandExecutorV1<
  PocGameSnapshotV1,
  PocDebugCommandV1,
  undefined,
  PocDebugCommandValidationErrorV1,
  PocReplayableDebugExecutionAttemptV1
> {}

export function createPocGameDebugCommandExecutorV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
): PocGameDebugCommandExecutorV1;
```

Only an `allowed` command reaches `executeAttempt`, exactly once. The executor clones the same transaction candidate used by normal Gameplay using the exact constructor-supplied `modules` tuple, and maps the command to Calendar, Actors, Status, Inventory, Progression, or Narrative owner proposals; it never imports or reconstructs bindings. `debug.rng.set` uses the candidate's debug-only RNG replacement primitive. It validates every proposal and aggregate invariant before commit. The result is only `committed` or `faulted`; an owner-level domain rejection after `allowed` is normalized to a stable engine contract fault, never exposed as a debug rejection. The executor reattaches the exact opaque input `integrity` reference and never calls `markRunModifiedV1`; `GameSession` owns that outer atomic mark after a committed replayable debug attempt.

`pocReplayableDebugCommandVectorsV1` supplies one referentially complete allowed vector and at least one semantic validation-failure vector for each kind. Tests prove owner routing, no rejected result, no extra execution, rollback/RNG diagnostics on fault, and that `debug.fixture.load` is absent from the schema, executor, and vectors.

- [ ] **Step 5: Define one closed GameSimulation**

```ts
export function createPocGameSimulationV1(
  program: DeepReadonly<PocSimulationProgramV1>,
): PocGameSimulationV1 {
  const modules = createPocGameplayModuleTupleV1(program);
  const commandExecutor = createPocGameCommandExecutorV1(program, modules);
  const debugCommandExecutor = createPocGameDebugCommandExecutorV1(program, modules);
  return defineGameSimulation<PocGameSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: pocGameStateSchemaV1,
    commandSchema: pocGameCommandSchemaV1,
    factSchema: pocGameplayFactSchemaV1,
    rejectionSchema: pocRejectionReasonSchemaV1,
    debugCommandSchema: pocDebugCommandSchemaV1,
    debugValidationErrorSchema: pocDebugCommandValidationErrorSchemaV1,
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput: createPocGameBootstrapInputV1,
    createInitialState: (bootstrap) => createInitialPocGameStateV1(modules, bootstrap),
    createQueries: (state) => createPocGameQueriesV1(state, program),
    projectGameView: (queries) => projectPocGameViewV1(queries),
  });
}
```

`createPocGameplayModuleTupleV1(program)` returns one frozen ten-binding tuple in the exact ownership-catalog order: five owner-slice-bound instances plus five static bindings, with identical descriptors, dependencies, and slots for every valid Program. `createPocGameBootstrapInputV1` calls `nextNonZeroUint32()` and then `nextUuidV4()` exactly once each, validates both values, and freezes the result. `createInitialPocGameStateV1(modules, bootstrap)` calls each binding's `createInitialState(bootstrap)` in that same fixed order and assembles the aggregate State from those exact ten results; it does not read Program data, write a Slice directly, or apply owner initialization proposals. Tests compare every aggregate owner Slice with the corresponding Module result, prove two Programs do not leak owner values, and prove descriptor/order stability. Base then independently verifies Canonical JSON byte equality for every owner. GameSimulation validation also proves the program's Narrative limits are positive safe integers and the Narrative interpreter observes the exact `128`/`8` fixture values.

Production composition calls the tuple factory only here; focused tests may call it directly to prove descriptor/order stability and cross-Program isolation. No module, Rule, Resolver, query, or executor imports `story-definition.ts`. `createPocRulesV1(data)` is used only by the default Story materializer and test fixtures. `createPocGameSimulationV1(program)` consumes the supplied, already frozen `program.rules` and must never regenerate Rules from data, otherwise a resolved Hotfix could be silently bypassed. GameSimulation validation proves descriptor/slot uniqueness, dependency closure/DAG, owner triads, aggregate schemas, both executors, and the same type witness. The debug command schema, validation-error schema, executor provider, owner-routing tables, and rule inputs are part of the simulation source projection; changing any of them must change `simulationDigest`, while fixture/tooling adapters must not enter it. Phase 4B's resolved-Story contract test verifies that split. The integration test composes the public GameSession factory around this exact simulation; test helpers may read Snapshot, but production Gameplay exports no Session or integrity mutation capability.

- [ ] **Step 6: Run complete Phase 4A focused tests and full verification**

Run: `pnpm --filter @project-tavern/story-poc exec vitest run src/test && pnpm typecheck && pnpm verify`

Expected: PASS; all Gameplay tests pass, preview/execute rejection codes agree, the ten replayable debug kinds validate/route atomically without a rejected result, queries consume no RNG, and no old runtime ABI name or cross-layer import is present.

- [ ] **Step 7: Commit GameSimulation**

```bash
git add -- game/stories/poc/src/gameplay/contracts/schemas.ts game/stories/poc/src/gameplay/contracts/types.ts game/stories/poc/src/gameplay/game-debug-command-executor.ts game/stories/poc/src/gameplay/game-queries.ts game/stories/poc/src/gameplay/game-view-projector.ts game/stories/poc/src/gameplay/game-simulation.ts game/stories/poc/src/test/game-debug-command-executor.test.ts game/stories/poc/src/test/game-queries.test.ts game/stories/poc/src/test/game-simulation.test.ts game/stories/poc/src/test/game-session-integration.test.ts game/stories/poc/src/gameplay/index.ts
git commit -m "feat(story-poc): compose gameplay simulation"
```

## Task 13: Add the Read-Only Phase 4A Verification Gate

**Files:**

- Create: `scripts/verify-poc-gameplay.mts`
- Create: `scripts/verify-poc-gameplay.test.mjs`
- Modify: `package.json`
- Modify: `game/stories/poc/package.json`

**Interfaces:**

- Consumes: the live materialization guard, all Phase 4A tests, Phase 2/3 gates, public-export/boundary/cycle/type checks, and the PoC package build.
- Produces: `pnpm verify:poc-gameplay`, package script `test:gameplay`, and a deterministic read-only Phase 4A gate.

- [ ] **Step 1: Write the failing exact-command-list test**

```js
// scripts/verify-poc-gameplay.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owns a read-only Phase 4A command list", async () => {
  const { pocGameplayVerificationCommandsV1 } = await import("./verify-poc-gameplay.mts");
  assert.deepEqual(pocGameplayVerificationCommandsV1, [
    ["pnpm", ["verify:materialization"]],
    ["pnpm", ["verify:phase2"]],
    ["pnpm", ["verify:persistence-diagnostics"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "run", "test:gameplay"]],
    ["pnpm", ["verify:public-exports"]],
    ["pnpm", ["verify:boundaries"]],
    ["pnpm", ["verify:cycles"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["build"]],
  ]);
  assert(!JSON.stringify(pocGameplayVerificationCommandsV1).match(/update|regenerate/u));
});

test("keeps test:gameplay closed to Phase 4A files", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:gameplay"],
    "vitest run src/test/gameplay-contract.test.ts src/test/run-calendar.test.ts src/test/actors-status.test.ts src/test/inventory.test.ts src/test/facilities-tavern.test.ts src/test/workflow-progression.test.ts src/test/narrative.test.ts src/test/rules-resolvers.test.ts src/test/transaction.test.ts src/test/command-executor-core.test.ts src/test/command-executor-workflows.test.ts src/test/game-debug-command-executor.test.ts src/test/game-queries.test.ts src/test/game-simulation.test.ts src/test/game-session-integration.test.ts",
  );
});
```

- [ ] **Step 2: Run and confirm the missing verifier**

Run: `node --test scripts/verify-poc-gameplay.test.mjs`

Expected: FAIL because `verify-poc-gameplay.mts` and package scripts do not exist.

- [ ] **Step 3: Implement the exact read-only gate**

```ts
const commandV1 = (args: readonly string[]) =>
  Object.freeze(["pnpm", Object.freeze(args)] as const);

export const pocGameplayVerificationCommandsV1 = Object.freeze([
  commandV1(["verify:materialization"]),
  commandV1(["verify:phase2"]),
  commandV1(["verify:persistence-diagnostics"]),
  commandV1(["--filter", "@project-tavern/story-poc", "run", "test:gameplay"]),
  commandV1(["verify:public-exports"]),
  commandV1(["verify:boundaries"]),
  commandV1(["verify:cycles"]),
  commandV1(["typecheck"]),
  commandV1(["build"]),
] as const);
```

The runner executes sequentially, stops on first nonzero status, rechecks the live materialization/Phase 2/Phase 3 checkpoint before the Phase 4A leaf, and never invokes a baseline writer. Set `test:gameplay` to the exact fifteen-file command frozen by the test above—never `vitest run src/test` or a glob—and root `verify:poc-gameplay` to the strip-only Node invocation.

- [ ] **Step 4: Run the task-local leaf and full verify without invoking the clean-tree phase gate**

Run:

```bash
before="$(git status --porcelain=v1)"
node --test scripts/verify-poc-gameplay.test.mjs
pnpm --filter @project-tavern/story-poc test:gameplay
pnpm verify:public-exports
pnpm verify:boundaries
pnpm verify:cycles
pnpm typecheck
pnpm build
pnpm verify
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

Expected: all commands exit 0; the status comparison exits 0; no fixture, golden, lockfile, manifest, or source file is rewritten. `verify:poc-gameplay` is deliberately not run while its Task files are dirty because its first command is the strict clean-tree materialization guard.

- [ ] **Step 5: Commit only the Phase 4A gate**

```bash
git add -- scripts/verify-poc-gameplay.mts scripts/verify-poc-gameplay.test.mjs package.json game/stories/poc/package.json
git commit -m "test(story-poc): add gameplay verification gate"
```

## Phase 4A Acceptance

After the Task 13 commit, run the cumulative phase gate only from the clean checkpoint:

```bash
before="$(git status --porcelain=v1)"
test -z "$before"
pnpm verify:poc-gameplay
pnpm verify
pnpm verify:poc-gameplay
after="$(git status --porcelain=v1)"
test "$before" = "$after"
git diff --check
```

- [ ] All tavern-specific software in this phase is under `game/stories/poc/src/gameplay`; Base/UI/Web/E2E contain no PoC state, ID, rule, relationship, or tavern semantics.
- [ ] Exactly ten stateful PoC GameplayModule bindings exist, with unique IDs/State Slots, one owner per non-empty slot, strict schemas, owner-local proposal/apply, and no writable aggregate state exposure.
- [ ] Demand, Settlement, Check, Ending, and Scheduling are named Rules/Resolvers; the seven patchable Rule slots and runtime aggregate keys are exact, and Scheduling is not a Rule member/slot. The normal `relationship.stage.set` effect has an Actors owner operation, but there is no derived transition Rule and the concrete seven-day Program authors no such effect, so ordinary PoC play remains exactly `cold`; no wide Gameplay Service directory exists.
- [ ] `PocGameCommandExecutorV1` handles all 17 commands through one candidate transaction and never owns or constructs GameQueries.
- [ ] `PocDebugCommandV1` contains exactly the Contract Catalog's ten replayable kinds with PoC-local value/reference types; `debug.fixture.load` is absent. `PocGameDebugCommandExecutorV1` owns strict schemas, queue-front validation, owner routing, and committed/faulted-only attempts, and those sources enter simulation identity.
- [ ] Replayable debug validation failure creates no candidate, RNG/sequence change, or log; allowed execution calls one attempt, preserves opaque RunIntegrity inside the Story executor, and leaves the Session to apply any successful modified-run mark.
- [ ] Rejected/faulted attempts preserve the exact input Snapshot, RNG, integrity, and sequence; committed normal Gameplay applies once, preserves the exact opaque input integrity reference, and returns ordered GameplayFacts/ledger evidence from the same attempt. A real GameSession integration test proves the same behavior from dispatch through commit.
- [ ] Opening interruption, WorldAction progress/check, phase scheduling, and levy terminal materialization are atomic and strict-JSON round-trippable.
- [ ] `PocSimulationDataV1` has the exact strict Catalog projection (including manifest/content/narrative exclusions), complete validated `EndingPolicyV1`, and no module/callback/presentation/tooling value. `PocGameQueriesV1` has exactly the seventeen Catalog methods, is immutable, consumes no RNG, exposes no hidden results or Snapshot, and preview/execute use the same guards, calculators, and rejection codes. The five exact `Poc*ProjectionV1` DTOs and `PocGameViewV1` have strict key/schema/private-field tests; GameView deliberately excludes Narrative, which Phase 4B publishes separately from the same Queries instance.
- [ ] `PocGameSimulationV1` creates exactly one program-bound fixed ten-module tuple, passes that same tuple through aggregate initialization, candidate, and normal/debug executors, and closes aggregate schemas, state-only query factory, query-only projector, and bootstrap from one `PocGameSimulationTypesV1` witness. Exactly five bindings close only their deeply frozen owner initial Slice and five remain static; every aggregate owner Slice is Canonical-JSON-equal to its corresponding Module initial State, with no sequence-zero initialization proposal or cross-Program value leakage.
- [ ] No Story identity, SceneGraph, React, TextCatalog, asset, tooling, application, golden, or Save fixture is introduced before Phase 4B.
- [ ] Phase 2 and Phase 3 prerequisite gates passed before Task 1, every task used exact-path staging/resume rules, and `pnpm-lock.yaml` remained byte-identical with no mid-Goal registry operation.
- [ ] Narrative limits are program-owned and exactly `128` automatic nodes / `8` call frames in both fixture and concrete-program contracts; boundary tests prove the interpreter has no stale `64`/`4` literal.
- [ ] `test:gameplay` is the exact fifteen-file Phase 4A leaf and remains unchanged when Phase 4B tests are later added.
- [ ] `pnpm --filter @project-tavern/story-poc test:gameplay`, cumulative `pnpm verify:poc-gameplay`, and `pnpm verify` pass without changing tracked files.
