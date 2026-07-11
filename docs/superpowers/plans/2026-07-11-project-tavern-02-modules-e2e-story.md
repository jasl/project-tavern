# Project Tavern Modules and E2E Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Demo-v1 gameplay module set, its single atomic `CommandCoordinator`, and an independent deterministic `stories/e2e` GamePackage that proves module composition, VN branch/rejoin, interruptible opening, two-stage WorldAction, cross-module effects, and terminal ending behavior without importing Demo Story content.

**Architecture:** `@project-tavern/modules` owns the concrete Demo-v1 contract spine, individual bindings/schemas, stateless World/Scheduling services, immutable queries/projections, and the coordinator builder; it does not own a `GameProfileV1` or a twelve-Module tuple. Every stateful Module proposes and applies only its own state slice; World and Scheduling are explicitly stateless; only the coordinator reads multiple public ports, routes effect intents, owns the candidate Snapshot/RNG transaction, and returns one `executeAttempt` result. `stories/e2e` is the first real Profile consumer: it statically selects all twelve public bindings, supplies Story rules/data, constructs the sole coordinator/Profile, and proves the complete integration with tiny original content.

**Tech Stack:** Node.js 24 LTS, pnpm workspace, strict TypeScript 7, Zod strict schemas, Vitest, fast-check, React scene contributions from `@project-tavern/ui`, and the Phase 1 `@project-tavern/base` authoring/runtime/testkit contracts.

## Global Constraints

- Phase 1 `docs/superpowers/plans/2026-07-11-project-tavern-01-foundation-walking-skeleton.md` is a hard prerequisite. Consume its public package exports; do not duplicate Base envelopes, PRNG, Canonical JSON, Story resolver, `EngineSession`, or generic UI primitives inside Modules.
- Implement exactly these public Module IDs: `run`, `calendar`, `actors`, `status`, `inventory`, `facilities`, `tavern`, `workflow`, `world`, `progression`, `narrative`, and `scheduling`.
- `run`, `calendar`, `actors`, `status`, `inventory`, `facilities`, `tavern`, `workflow`, `progression`, and `narrative` are stateful. `world` and `scheduling` are stateless with `stateSlots: []` and null owner fields.
- Demo v1 has no Module-to-Module read edges. Only the single `DemoCommandCoordinatorV1` may combine public read ports and owner-scoped proposal/apply capabilities.
- `@project-tavern/modules` exports individual bindings, strict Schemas, branded contract types, query/projector factories, and `createDemoCommandCoordinatorV1(input)` only. It must not export a preassembled Module tuple, `GameProfileV1`, `GamePackageV1`, Story identity, Story rules, or Story content.
- Task 1 freezes the complete profile-bound type spine before the first real binding is authored. Every Module uses the same curried `defineDemoGameModuleV1` witness; no task may use unbound `defineGameModule({...})`, a temporary `unknown`/`never` profile, or defer `pnpm typecheck` to a later commit.
- The coordinator's only execution method is `executeAttempt(snapshot, command, context)`. It returns result plus the same RNG diagnostics later consumed by `EngineSession`; no command or rule may be executed a second time for logging.
- A rejected or faulted attempt preserves the exact committed Snapshot object reference, committed RNG, and `commandSequence`. No DomainFact is emitted for rejected/faulted attempts.
- All state, command, fact, rejection, rule input/output, Narrative IR, and fixture command data use strict schemas, safe integers, stable IDs, readonly values, and no unknown keys.
- Every code sample that crosses a public contract uses Catalog brands. `RunId`, `NonZeroUint32`, and generic safe-integer brands use Base parsers; `DayIndex`, `Money`, `Quantity`, bounded game values, and per-kind stable IDs use the matching public Modules parsers introduced in Task 1. Raw `string`/`number` types are allowed only for transient local presentation text or loop indices that never cross a Schema/port boundary.
- Simulation code must not import React, DOM, Host adapters, IndexedDB, concrete Story packages, presentation files, or `references/`. It must not call `Math.random`, wall-clock APIs, storage, network, or platform globals.
- UI contributions consume only immutable ViewModel selectors, `PlayerApplicationPortV1`, and `PresentationReadPortV1`. They never receive Snapshot, module owner capabilities, rule functions, raw TextCatalogs, Asset Packs, or runtime paths.
- `stories/e2e` must import only public `@project-tavern/modules` exports. It must not import `stories/demo`, Demo private helpers, Demo text, Demo balance values, or `references/`.
- `stories/e2e` uses fixed identity `{ id: "story.e2e_001", revision: 1 }`, fixed test seed `0x00023049`, explicit fixed `runId` values, minimal non-canonical text, and code-native fallback assets. It is not a shortened copy of the seven-day Demo plot.
- The E2E Story default export contains Player runtime only. Fixtures, developer notes, and anchor helpers live only in `@project-tavern/story-e2e/development`.
- All `packages/modules/**` software and tests use `PolyForm-Noncommercial-1.0.0`. Story software/tests use PolyForm; original E2E narrative/localization content uses CC BY-NC-SA 4.0. Mixed Story package metadata is `SEE LICENSE IN LICENSE.md`.
- The Story remains `PolyForm-Noncommercial-1.0.0` until its first CC-scoped narrative/localization file is committed. The activation task changes metadata to `SEE LICENSE IN LICENSE.md`, creates the package scope file, and updates licensing policy/tests in the same green commit. A `./development` export is added only in the task that creates `src/development.ts`.
- No tracked file, test, fixture, build script, or code generator may read or scan `references/`.
- Use TDD for every task: add the focused failing test, run it and confirm the stated failure, implement only that task's interface, rerun the focused test, then run the task's broader package gate.
- Immediately before every task's `git add`, run `pnpm typecheck && pnpm verify`; both must exit 0 and leave tracked files unchanged. This commit gate is mandatory even where the focused step lists only a package test, so no intermediate commit relies on a later owner/Profile task to become green.
- Do not add ECS, a generic event bus, CQRS/event sourcing, runtime Module installation, arbitrary callbacks, a rules DSL, a visual narrative editor, a general flag bag, or a second authoritative state store.
- Every task ends with a narrow commit. Do not stage unrelated spec, legal, art-source, Phase 1, Phase 3, or Phase 4 work.

---

## File Map

### Workspace and package gates

- Modify: `package.json` — add `verify:phase2` without changing the meaning of `pnpm verify`.
- Modify: `packages/modules/package.json` — PolyForm package metadata, public exports, and focused Vitest scripts.
- Modify: `packages/modules/tsconfig.json` — strict project reference to Base; React remains outside core files.
- Modify: `packages/modules/src/index.ts` — public bindings, Schemas, branded contracts, coordinator/query builders only; no Profile or tuple export.
- Create: `packages/modules/src/profile/types.ts` — complete profile-bound `DemoProfileTypesV1`, `DemoGameBootstrapInputV1`, aggregate state/command/fact/rejection/fault/context/query/ViewModel types.
- Create: `packages/modules/src/profile/define-demo-module.ts` — the single curried `defineGameModule<DemoProfileTypesV1>()` witness used by every binding.
- Create: `packages/modules/src/profile/constants.ts` — exact module keys, empty dependency graph, state owners, Effect owner map, and stable ordering tables.
- Create: `packages/modules/src/profile/schemas.ts` — aggregate Snapshot/command/fact/rejection/debug schemas assembled from module-owned schemas.
- Create: `packages/modules/src/profile/profile-contract.test.ts` — type witness, ownership, stateless binding, dependency, and schema-closure tests.
- Create: `packages/modules/src/testing/builders.ts` — test-only fixed bootstrap/Snapshot/data builders; not exported by the Player entry.

### Stateful Modules

- Create in Task 1, then modify in owner task: `packages/modules/src/run/contract.ts`
- Create: `packages/modules/src/run/run-module.ts`
- Create: `packages/modules/src/run/run-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/calendar/contract.ts`
- Create: `packages/modules/src/calendar/calendar-module.ts`
- Create: `packages/modules/src/calendar/calendar-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/actors/contract.ts`
- Create: `packages/modules/src/actors/actors-module.ts`
- Create: `packages/modules/src/actors/actors-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/status/contract.ts`
- Create: `packages/modules/src/status/status-module.ts`
- Create: `packages/modules/src/status/status-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/inventory/contract.ts`
- Create: `packages/modules/src/inventory/inventory-module.ts`
- Create: `packages/modules/src/inventory/inventory-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/facilities/contract.ts`
- Create: `packages/modules/src/facilities/facilities-module.ts`
- Create: `packages/modules/src/facilities/facilities-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/tavern/contract.ts`
- Create: `packages/modules/src/tavern/tavern-module.ts`
- Create: `packages/modules/src/tavern/tavern-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/workflow/contract.ts`
- Create: `packages/modules/src/workflow/workflow-module.ts`
- Create: `packages/modules/src/workflow/workflow-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/progression/contract.ts`
- Create: `packages/modules/src/progression/progression-module.ts`
- Create: `packages/modules/src/progression/progression-module.test.ts`
- Create in Task 1, then modify in owner task: `packages/modules/src/narrative/contract.ts`
- Create: `packages/modules/src/narrative/interpreter.ts`
- Create: `packages/modules/src/narrative/narrative-module.ts`
- Create: `packages/modules/src/narrative/narrative-module.test.ts`

### Stateless services and coordinator

- Create in Task 1, then modify in service task: `packages/modules/src/world/contract.ts`
- Create: `packages/modules/src/world/world-service.ts`
- Create: `packages/modules/src/world/world-service.test.ts`
- Create in Task 1, then modify in service task: `packages/modules/src/scheduling/contract.ts`
- Create: `packages/modules/src/scheduling/scheduler-service.ts`
- Create: `packages/modules/src/scheduling/scheduler-service.test.ts`
- Create: `packages/modules/src/coordinator/effect-router.ts`
- Create: `packages/modules/src/coordinator/effect-router.test.ts`
- Create: `packages/modules/src/coordinator/candidate.ts`
- Create: `packages/modules/src/coordinator/command-coordinator.ts`
- Create: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Create: `packages/modules/src/coordinator/queries.ts`
- Create: `packages/modules/src/coordinator/queries.test.ts`

### Independent E2E Story

- Create: `stories/e2e/package.json` — private mixed-license package with default and `./development` exports.
- Create: `stories/e2e/tsconfig.json` — project references to Base, Modules, UI, and Assets public exports.
- Modify: `stories/e2e/src/index.ts` — replace the Phase 1 non-startable stub with the side-effect-free default `GamePackageV1` export.
- Create: `stories/e2e/src/story.ts` — Story composition and two resolved facets.
- Create: `stories/e2e/src/profile.ts` — explicit twelve-module selection and fixed coordinator construction.
- Create: `stories/e2e/src/simulation/identity.ts` — fixed Story identity and state-contract revision.
- Create: `stories/e2e/src/simulation/ids.ts` — one per-brand registry for every E2E content ID.
- Create: `stories/e2e/src/simulation/data.ts` — independent minimal state definitions, balance, actions, events, checks, and endings.
- Create: `stories/e2e/src/simulation/rules.ts` — deterministic demand, opening, check, and ending rules.
- Create: `stories/e2e/src/simulation/narrative.ts` — minimal VN branch/rejoin, opening interruption, and WorldAction scenes.
- Create: `stories/e2e/src/patch-surfaces.ts` — typed simulation and presentation slots used by later Hotfix/runtime tests.
- Create: `stories/e2e/src/presentation/text-catalogs.ts` — complete `zh-CN` catalog with stable TextIds.
- Create: `stories/e2e/src/presentation/assets.ts` — fallback-only slots and resolved providers.
- Create: `stories/e2e/src/presentation/scene-graph.tsx` — Story-owned main menu, play stage, overlays, and VN contribution registration.
- Create: `stories/e2e/src/testing/session-harness.ts` — test-only driver over the real Profile/coordinator.
- Create: `stories/e2e/src/development.ts` — sole `StoryDevelopmentEntryV1` export.
- Create: `stories/e2e/src/development/fixtures.ts` — fixed seed plus command-list fixtures.
- Create: `stories/e2e/src/test/story-contract.test.ts`
- Create: `stories/e2e/src/test/branch-rejoin.integration.test.ts`
- Create: `stories/e2e/src/test/opening-interruption.integration.test.ts`
- Create: `stories/e2e/src/test/world-ending.integration.test.ts`
- Create: `stories/e2e/src/test/fixture-contract.test.ts`
- Create: `stories/e2e/src/test/development-boundary.test.ts`

## Task 1: Freeze the Module Ownership Catalog and Bootstrap Contract

**Files:**
- Modify: `packages/modules/package.json`
- Create: `packages/modules/src/profile/types.ts`
- Create: `packages/modules/src/profile/domain-values.ts`
- Create: `packages/modules/src/profile/domain-values.test.ts`
- Create: `packages/modules/src/profile/define-demo-module.ts`
- Create: `packages/modules/src/profile/constants.ts`
- Create: `packages/modules/src/profile/profile-contract.test.ts`
- Create: `packages/modules/src/testing/builders.ts`
- Create: `packages/modules/src/run/contract.ts`
- Create: `packages/modules/src/calendar/contract.ts`
- Create: `packages/modules/src/actors/contract.ts`
- Create: `packages/modules/src/status/contract.ts`
- Create: `packages/modules/src/inventory/contract.ts`
- Create: `packages/modules/src/facilities/contract.ts`
- Create: `packages/modules/src/tavern/contract.ts`
- Create: `packages/modules/src/workflow/contract.ts`
- Create: `packages/modules/src/progression/contract.ts`
- Create: `packages/modules/src/narrative/contract.ts`
- Create: `packages/modules/src/world/contract.ts`
- Create: `packages/modules/src/scheduling/contract.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: `Brand`, Base safe-integer brands/parsers, `GameProfileTypeMapV1`, `GameSnapshotEnvelopeV1`, `ModuleOwnerProposalEnvelopeV1`, `RngStateV1`, `RngDrawTraceV1`, and strict-schema primitives from `@project-tavern/base`.
- Produces: the complete `DemoProfileTypesV1` witness, all owner/service type-only contracts, `defineDemoGameModuleV1`, `DemoGameBootstrapInputV1`, `gameModuleKeysV1`, `gameModuleDependenciesV1`, `statefulOwnerKeysV1`, and `effectIntentOwnerByKindV1`. Every later binding can compile and typecheck independently against this exact spine; no Profile is composed here.

- [ ] **Step 1: Write the failing ownership and type-witness test**

```ts
// packages/modules/src/profile/profile-contract.test.ts
import { describe, expect, expectTypeOf, it } from "vitest";
import type { NonNegativeSafeInteger, NonZeroUint32, RunId } from "@project-tavern/base";
import type { DayIndex, Money } from "./domain-values.js";
import {
  effectIntentOwnerByKindV1,
  gameModuleDependenciesV1,
  gameModuleKeysV1,
  statefulOwnerKeysV1,
} from "./constants.js";
import type { DemoGameBootstrapInputV1, DemoProfileTypesV1 } from "./types.js";

describe("Demo-v1 profile catalog", () => {
  it("freezes twelve modules with no direct read edges", () => {
    expect(gameModuleKeysV1).toEqual([
      "run", "calendar", "actors", "status", "inventory", "facilities",
      "tavern", "workflow", "world", "progression", "narrative", "scheduling",
    ]);
    expect(Object.values(gameModuleDependenciesV1).every((value) => value.length === 0)).toBe(true);
    expect(statefulOwnerKeysV1).toEqual([
      "run", "calendar", "actors", "status", "inventory", "facilities",
      "tavern", "workflow", "progression", "narrative",
    ]);
  });

  it("requires explicit deterministic bootstrap identity", () => {
    expectTypeOf<DemoGameBootstrapInputV1["rngSeed"]>().toEqualTypeOf<NonZeroUint32>();
    expectTypeOf<DemoGameBootstrapInputV1["runId"]>().toEqualTypeOf<RunId>();
  });

  it("binds public state to Catalog brands", () => {
    expectTypeOf<DemoProfileTypesV1["state"]["simulation"]["calendar"]["day"]>()
      .toEqualTypeOf<DayIndex>();
    expectTypeOf<DemoProfileTypesV1["state"]["simulation"]["calendar"]["apRemaining"]>()
      .toEqualTypeOf<NonNegativeSafeInteger>();
    expectTypeOf<DemoProfileTypesV1["state"]["simulation"]["inventory"]["cash"]>()
      .toEqualTypeOf<Money>();
  });

  it("routes every effect kind to one owner", () => {
    expect(Object.keys(effectIntentOwnerByKindV1)).toHaveLength(19);
    expect(effectIntentOwnerByKindV1["ledger.append"]).toBe("inventory");
    expect(effectIntentOwnerByKindV1["modifier.add"]).toBe("workflow");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails before the catalog exists**

Run: `pnpm --filter @project-tavern/modules test -- src/profile/profile-contract.test.ts`

Expected: FAIL with `Cannot find module './constants.js'` or `Cannot find module './types.js'`.

- [ ] **Step 3: Add the exact ownership catalog and complete branded type spine**

```ts
// packages/modules/src/profile/constants.ts
export const gameModuleKeysV1 = [
  "run", "calendar", "actors", "status", "inventory", "facilities",
  "tavern", "workflow", "world", "progression", "narrative", "scheduling",
] as const;

export type GameModuleKeyV1 = (typeof gameModuleKeysV1)[number];

export const gameModuleDependenciesV1 = Object.freeze({
  run: [], calendar: [], actors: [], status: [], inventory: [], facilities: [],
  tavern: [], workflow: [], world: [], progression: [], narrative: [], scheduling: [],
} as const satisfies Record<GameModuleKeyV1, readonly GameModuleKeyV1[]>);

export const statefulOwnerKeysV1 = [
  "run", "calendar", "actors", "status", "inventory", "facilities",
  "tavern", "workflow", "progression", "narrative",
] as const;

export const effectIntentOwnerByKindV1 = Object.freeze({
  "calendar.ap.adjust": "calendar",
  "reputation.adjust": "tavern",
  "actor.stamina.adjust": "actors",
  "actor.mood.adjust": "actors",
  "relationship.affection.adjust": "actors",
  "relationship.teamwork.adjust": "actors",
  "relationship.stage.set": "actors",
  "tavern.helper.set": "tavern",
  "inventory.grant": "inventory",
  "inventory.consume": "inventory",
  "inventory.item.grant": "inventory",
  "inventory.item.consume": "inventory",
  "aura.apply": "status",
  "aura.clear": "status",
  "fact.set": "progression",
  "quest.set": "progression",
  "outcome.set": "progression",
  "modifier.add": "workflow",
  "ledger.append": "inventory",
} as const);
```

```ts
// packages/modules/src/profile/types.ts
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSnapshotEnvelopeV1,
  GameBootstrapInputV1,
  GameProfileTypeMapV1,
  RngDrawTraceV1,
  RngStateV1,
  RunId,
} from "@project-tavern/base";

export interface DemoGameBootstrapInputV1 extends GameBootstrapInputV1 {
  readonly runId: RunId;
}

export interface DemoProfileTypesV1 extends GameProfileTypeMapV1<
  DemoGameBootstrapInputV1,
  GameStateV1,
  RngStateV1
> {
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: GameCommandV1;
  readonly fact: DomainFactV1;
  readonly rejection: RejectionReasonV1;
  readonly fault: EngineFaultV1;
  readonly debugCommand: DebugCommandV1;
  readonly executionContext: DemoExecutionContextV1;
  readonly queries: EngineQueriesV1;
  readonly viewModel: DemoRuntimeGameViewV1;
}

export type GameSnapshotV1 = GameSnapshotEnvelopeV1<GameStateV1, RngStateV1>;
export type DemoCommandExecutionAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  GameSnapshotV1,
  DomainFactV1,
  RejectionReasonV1,
  EngineFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;
```

In the same step, `domain-values.ts` defines the Catalog's game-specific brands and exact parsers. Signed integers validate `Number.isSafeInteger`, reject negative zero, then brand; `DayIndex`/`AbsoluteDayIndex`/`Quantity` delegate to Base positive-safe parsing; `Money` delegates to Base non-negative parsing; each semantic ID parser first enforces the shared stable-ID regex/UTF-8 length and then its required namespace. It also exports closed-enum parsers such as `parseActorId` and `parseAttributeId`, plus bounded parsers such as `parseDieFace`; Story code never widens those values through raw literals. `RunId`, `NonZeroUint32`, and generic safe-integer brands continue to come from Base. Its hostile tests cover wrong namespace, unsafe integer, negative zero, empty/overlong ID, invalid closed-enum values, and cross-brand type witnesses.

Create all twelve `contract.ts` files as the complete type-only spine from the Contract Catalog: each state field uses its exact safe-integer or per-kind ID brand; every command/operation/fact/rejection/effect union is closed; `RunReadPortV1` retains `RunId`/`NonZeroUint32`; `CalendarStateV1` uses `DayIndex`, `PolicyId | null`, and `NonNegativeSafeInteger`; Inventory uses `Money`, `Quantity`, `BatchId`, and `LedgerEntryId`; Narrative uses `SceneId`, `NodeId`, `ChoiceId`, `TextId`, `AssetId`, and `CharacterId`. The files export no permissive Schema and no implementation. `profile/types.ts` imports those exact types to close `GameStateV1`, all seventeen `GameCommandV1` branches, all current DomainFact/rejection/fault branches, queries, execution context, and ViewModel. Circular imports are forbidden: owner contracts import Base plus `domain-values.ts`; `profile/types.ts` imports owner contracts; owner contracts never import `profile/types.ts`.

- [ ] **Step 4: Create the one profile-bound Module authoring witness**

```ts
// packages/modules/src/profile/define-demo-module.ts
import { defineDemoGameModuleV1 } from "../profile/define-demo-module.js";
import type { DemoProfileTypesV1 } from "./types.js";

export const defineDemoGameModuleV1 = defineGameModule<DemoProfileTypesV1>();
```

Every Task 2–13 binding calls `defineDemoGameModuleV1({...})`. Add a type witness that a synthetic binding created for another Profile is rejected by the Demo tuple and that `defineGameModule({...})` without the curried Profile is absent from `packages/modules/**`.

- [ ] **Step 5: Add fixed test builders with explicit branded values**

```ts
// packages/modules/src/testing/builders.ts
import type { DemoGameBootstrapInputV1 } from "../profile/types.js";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  parseRunId,
} from "@project-tavern/base";
import {
  parseDayIndex,
  parseMoney,
  parsePolicyId,
  parseReasonId,
} from "../profile/domain-values.js";

export const referenceBootstrapV1 = Object.freeze({
  rngSeed: parseNonZeroUint32(0x00023049),
  runId: parseRunId("00000000-0000-4000-8000-000000000001"),
}) satisfies DemoGameBootstrapInputV1;

export const alternateBootstrapV1 = Object.freeze({
  rngSeed: parseNonZeroUint32(0x00000001),
  runId: parseRunId("00000000-0000-4000-8000-000000000002"),
}) satisfies DemoGameBootstrapInputV1;

export const contractValuesV1 = Object.freeze({
  day1: parseDayIndex(1),
  zero: parseNonNegativeSafeInteger(0),
  one: parseNonNegativeSafeInteger(1),
  twoPositive: parsePositiveSafeInteger(2),
  tenMoney: parseMoney(10),
});

export const e2eIdsV1 = Object.freeze({
  policyBalanced: parsePolicyId("policy.e2e_balanced"),
  reasonRest: parseReasonId("reason.e2e_rest"),
});
```

The same builder file provides `buildCalendarStateV1` and `buildCalendarTransitionV1`; both accept plain numeric literals only in their test-builder input, immediately parse them to `DayIndex`/safe-integer brands, and return the exact public DTO. No raw literal is asserted to a domain type with `as`.

- [ ] **Step 6: Prove the Phase 1 future-proof Vitest classifier discovers the new tests**

Add `"test": "vitest run"` to the existing PolyForm Modules manifest in the same task as the first test files. Do not edit `vitest.config.ts` or `scripts/verify.test.mjs`: Phase 1 already classifies all future `packages/**/src/**/*.test.ts(x)`. Run list/ownership verification and assert `domain-values.test.ts` is owned once by `unit` and `profile-contract.test.ts` once by `contract`.

- [ ] **Step 7: Run the focused contract and repository gates**

Run: `pnpm --filter @project-tavern/modules test -- src/profile/profile-contract.test.ts && pnpm typecheck && pnpm test:contract && pnpm verify`

Expected: PASS; the complete spine and domain-brand witnesses compile, both new tests are discovered exactly once by the unchanged generic classifier, all prior Phase 1 checks remain green, and no tracked file changes.

- [ ] **Step 8: Commit only the contract-spine slice**

```bash
git add packages/modules/package.json packages/modules/src/profile packages/modules/src/testing/builders.ts packages/modules/src/run/contract.ts packages/modules/src/calendar/contract.ts packages/modules/src/actors/contract.ts packages/modules/src/status/contract.ts packages/modules/src/inventory/contract.ts packages/modules/src/facilities/contract.ts packages/modules/src/tavern/contract.ts packages/modules/src/workflow/contract.ts packages/modules/src/progression/contract.ts packages/modules/src/narrative/contract.ts packages/modules/src/world/contract.ts packages/modules/src/scheduling/contract.ts packages/modules/src/index.ts
git commit -m "feat(modules): freeze profile-bound contract spine"
```

## Task 2: Implement the Run Module

**Files:**
- Modify: `packages/modules/src/run/contract.ts`
- Create: `packages/modules/src/run/run-module.ts`
- Create: `packages/modules/src/run/run-module.test.ts`
- Modify: `packages/modules/src/profile/types.ts`
- Modify: `packages/modules/src/testing/builders.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: `DemoGameBootstrapInputV1`, Base `ModuleOwnerProposalEnvelopeV1`, strict schemas, and stable Run/Ending IDs from the Catalog.
- Produces: `RunStateV1`, `RunCompletionV1`, `RunReadPortV1`, `RunOwnerOperationV1`, `RunOwnerProposalV1`, and `runModuleV1`. Later the coordinator uses it for `run.start` and terminal `levy.pay` only.

- [ ] **Step 1: Write failing tests for bootstrap, start, and completion ownership**

```ts
// packages/modules/src/run/run-module.test.ts
import { describe, expect, it } from "vitest";
import { buildE2eRunCompletionV1, referenceBootstrapV1 } from "../testing/builders.js";
import { runModuleV1 } from "./run-module.js";

describe("runModuleV1", () => {
  it("creates setup state from explicit bootstrap identity", () => {
    expect(runModuleV1.createInitialState(referenceBootstrapV1)).toEqual({
      runId: referenceBootstrapV1.runId,
      initialSeed: referenceBootstrapV1.rngSeed,
      status: "setup",
      completion: null,
    });
  });

  it("proposes active and terminal states without writing another slice", () => {
    const initial = runModuleV1.createInitialState(referenceBootstrapV1);
    const started = runModuleV1.owner!.propose(initial, { kind: "activate" }, {});
    expect(started.kind).toBe("proposed");
    if (started.kind !== "proposed") throw new Error("expected proposal");
    expect(runModuleV1.owner!.apply(initial, started.proposal).status).toBe("active");

    const completion = buildE2eRunCompletionV1();
    const terminal = runModuleV1.owner!.propose(
      runModuleV1.owner!.apply(initial, started.proposal),
      { kind: "complete", completion },
      {},
    );
    expect(terminal.kind).toBe("proposed");
  });
});
```

- [ ] **Step 2: Run the test and verify the Module is missing**

Run: `pnpm --filter @project-tavern/modules test -- src/run/run-module.test.ts`

Expected: FAIL with `Cannot find module './run-module.js'`.

- [ ] **Step 3: Define the exact Run owner operation and proposal**

```ts
// packages/modules/src/run/contract.ts
import type {
  ModuleOwnerProposalEnvelopeV1,
  NonZeroUint32,
  RunId,
} from "@project-tavern/base";
export type RunStatus =
  | "setup"
  | "active"
  | "completed_stable"
  | "completed_danger"
  | "failed_arrears";

export interface RunStateV1 {
  readonly runId: RunId;
  readonly initialSeed: NonZeroUint32;
  readonly status: RunStatus;
  readonly completion: RunCompletionV1 | null;
}

export type RunOwnerOperationV1 =
  | { readonly kind: "activate" }
  | { readonly kind: "complete"; readonly completion: RunCompletionV1 };

export type RunFactV1 = { readonly kind: "run.completed"; readonly completion: RunCompletionV1 };
export type RunOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<RunStateV1, RunFactV1>;

export interface RunReadPortV1 {
  readonly runId: RunId;
  readonly initialSeed: NonZeroUint32;
  readonly status: RunStatus;
  readonly completion: RunCompletionV1 | null;
}
```

- [ ] **Step 4: Implement the stateful binding and status guards**

```ts
// packages/modules/src/run/run-module.ts
import { defineGameModule } from "@project-tavern/base";
import {
  runFactV1Schema,
  runOwnerOperationV1Schema,
  runOwnerProposalV1Schema,
  runStateV1Schema,
} from "./contract.js";
import type { RunOwnerProposalV1, RunStateV1 } from "./contract.js";

export const runModuleV1 = defineDemoGameModuleV1({
  bindingKind: "stateful",
  descriptor: { id: "module.run", contractRevision: 1, stateSlots: ["simulation.run"], dependencies: [] },
  stateSchema: runStateV1Schema,
  ownerOperationSchema: runOwnerOperationV1Schema,
  ownerProposalSchema: runOwnerProposalV1Schema,
  localInvariants: [],
  createInitialState: (bootstrap): RunStateV1 => ({
    runId: bootstrap.runId,
    initialSeed: bootstrap.rngSeed,
    status: "setup",
    completion: null,
  }),
  createReadPort: (state) => state,
  owner: {
    propose(state, operation): { readonly kind: "proposed"; readonly proposal: RunOwnerProposalV1 } {
      if (operation.kind === "activate") {
        return { kind: "proposed", proposal: { payload: { ...state, status: "active" }, facts: [] } };
      }
      return {
        kind: "proposed",
        proposal: {
          payload: { ...state, status: operation.completion.status, completion: operation.completion },
          facts: [{ kind: "run.completed", completion: operation.completion }],
        },
      };
    },
    apply: (_state, proposal) => proposal.payload,
  },
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  queries: null,
});
```

`contract.ts` adds strict `runCompletionV1Schema`, `runFactV1Schema`, `runStateV1Schema`, `runOwnerOperationV1Schema`, and `runOwnerProposalV1Schema` for the Task 1 types; `runFactV1Schema` accepts only owner-produced `run.completed`, and every object uses `z.strictObject`. `activate` emits no fact because only the coordinator can construct the already-declared `run.started` aggregate variant after demand seeds exist. Add `expect(() => runStateV1Schema.parse({ ...initial, extra: true })).toThrow()` to the focused test so no temporary permissive schema can pass.

`buildE2eRunCompletionV1()` lives in `testing/builders.ts` and constructs `EndingId`, `ReasonId`, `OutcomeId`, `StoryToken`, and `Money` through the matching public Modules parsers; only generic safe-integer values use Base parsers. It is test-only and never enters the Player export.

- [ ] **Step 5: Run the focused Module test**

Run: `pnpm --filter @project-tavern/modules test -- src/run/run-module.test.ts`

Expected: PASS; 2 tests passed, including explicit bootstrap `runId` preservation.

- [ ] **Step 6: Commit the Run owner**

```bash
git add packages/modules/src/run/contract.ts packages/modules/src/run/run-module.ts packages/modules/src/run/run-module.test.ts packages/modules/src/profile/types.ts packages/modules/src/testing/builders.ts packages/modules/src/index.ts
git commit -m "feat(modules): add run state owner"
```

## Task 3: Implement the Calendar Module

**Files:**
- Modify: `packages/modules/src/calendar/contract.ts`
- Create: `packages/modules/src/calendar/calendar-module.ts`
- Create: `packages/modules/src/calendar/calendar-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: `DemoGameBootstrapInputV1`, Story-provided AP values, and coordinator-computed transitions. Calendar never reads Tavern, Narrative, or Workflow directly.
- Produces: `CalendarStateV1`, `CalendarReadPortV1`, `CalendarOwnerOperationV1`, `CalendarFactV1`, `CalendarOwnerRejectionV1`, and `calendarModuleV1` for policy choice, AP spending/adjustment, and the sole day/phase mutation.

- [ ] **Step 1: Write the failing AP and phase-transition tests**

```ts
// packages/modules/src/calendar/calendar-module.test.ts
import { describe, expect, it } from "vitest";
import {
  buildCalendarStateV1,
  buildCalendarTransitionV1,
  contractValuesV1,
  e2eIdsV1,
  referenceBootstrapV1,
} from "../testing/builders.js";
import { calendarModuleV1 } from "./calendar-module.js";

describe("calendarModuleV1", () => {
  it("starts at D1 morning with no hidden policy or AP", () => {
    expect(calendarModuleV1.createInitialState(referenceBootstrapV1)).toEqual({
      day: contractValuesV1.day1,
      phase: "morning",
      lifePolicyId: null,
      apRemaining: contractValuesV1.zero,
      eveningResolved: false,
    });
  });

  it("rejects overspending without changing the source state", () => {
    const state = buildCalendarStateV1({ phase: "morning", apRemaining: contractValuesV1.one });
    const result = calendarModuleV1.owner!.propose(state, {
      kind: "spend_ap",
      amount: contractValuesV1.twoPositive,
      reason: { kind: "command", commandKind: "actor.rest", reasonId: e2eIdsV1.reasonRest },
    }, {});
    expect(result).toEqual({
      kind: "rejected",
      rejection: { code: "calendar.insufficient_ap", details: { required: contractValuesV1.twoPositive, available: contractValuesV1.one } },
    });
    expect(state.apRemaining).toBe(contractValuesV1.one);
  });

  it("advances only to the coordinator-provided adjacent phase", () => {
    const state = buildCalendarStateV1({ phase: "evening", apRemaining: contractValuesV1.zero, eveningResolved: true });
    const result = calendarModuleV1.owner!.propose(state, {
      kind: "advance",
      to: buildCalendarTransitionV1({ day: 2, phase: "morning", apRemaining: 2, eveningResolved: false }),
      expiredAuraIds: [],
    }, {});
    expect(result.kind).toBe("proposed");
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/calendar/calendar-module.test.ts`

Expected: FAIL with `Cannot find module './calendar-module.js'`.

- [ ] **Step 3: Define the closed Calendar operation contract**

```ts
// packages/modules/src/calendar/contract.ts
import type {
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "@project-tavern/base";
import type {
  AuraId,
  CalendarPhase,
  DayIndex,
  PolicyId,
  SafeInteger,
} from "../profile/domain-values.js";

export interface CalendarStateV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly lifePolicyId: PolicyId | null;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly eveningResolved: boolean;
}

export type CalendarOwnerOperationV1 =
  | { readonly kind: "choose_policy"; readonly policyId: PolicyId; readonly apRemaining: NonNegativeSafeInteger }
  | { readonly kind: "spend_ap"; readonly amount: PositiveSafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "adjust_ap"; readonly delta: SafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "set_evening_resolved"; readonly value: boolean }
  | {
      readonly kind: "advance";
      readonly to: {
        readonly day: DayIndex;
        readonly phase: CalendarPhase;
        readonly apRemaining: NonNegativeSafeInteger;
        readonly eveningResolved: boolean;
      };
      readonly expiredAuraIds: readonly AuraId[];
    };

export type CalendarOwnerRejectionV1 = {
  readonly code: "calendar.insufficient_ap";
  readonly details: { readonly required: PositiveSafeInteger; readonly available: NonNegativeSafeInteger };
};
```

- [ ] **Step 4: Implement proposal/apply without cross-module reads**

```ts
// packages/modules/src/calendar/calendar-module.ts
function proposeCalendar(
  state: Readonly<CalendarStateV1>,
  operation: Readonly<CalendarOwnerOperationV1>,
): ModuleProposalResultV1<CalendarOwnerProposalV1, CalendarOwnerRejectionV1> {
  if (operation.kind === "spend_ap") {
    if (state.apRemaining < operation.amount) {
      return {
        kind: "rejected",
        rejection: {
          code: "calendar.insufficient_ap",
          details: { required: operation.amount, available: state.apRemaining },
        },
      };
    }
    const after = parseNonNegativeSafeInteger(state.apRemaining - operation.amount);
    return {
      kind: "proposed",
      proposal: {
        payload: { ...state, apRemaining: after },
        facts: [{ kind: "calendar.ap_changed", value: { before: state.apRemaining, after }, reason: operation.reason }],
      },
    };
  }
  if (operation.kind === "choose_policy") {
    return {
      kind: "proposed",
      proposal: {
        payload: { ...state, lifePolicyId: operation.policyId, apRemaining: operation.apRemaining },
        facts: [{ kind: "policy.chosen", policyId: operation.policyId, apRemaining: operation.apRemaining }],
      },
    };
  }
  if (operation.kind === "advance") {
    const payload = { ...state, ...operation.to };
    return {
      kind: "proposed",
      proposal: {
        payload,
        facts: [{
          kind: "calendar.phase_advanced",
          from: { day: state.day, phase: state.phase },
          to: { day: payload.day, phase: payload.phase },
          apRemaining: payload.apRemaining,
          expiredAuraIds: operation.expiredAuraIds,
        }],
      },
    };
  }
  const payload = operation.kind === "adjust_ap"
    ? { ...state, apRemaining: parseNonNegativeSafeInteger(state.apRemaining + operation.delta) }
    : { ...state, eveningResolved: operation.value };
  return { kind: "proposed", proposal: { payload, facts: [] } };
}
```

Wire this function into a `bindingKind: "stateful"` binding with ID `module.calendar`, slot `simulation.calendar`, strict schemas for every operation/fact/rejection, and an invariant that day is positive, AP is non-negative, and `lifePolicyId` is null only during setup (the aggregate run-status half of that invariant is added in Task 17).

- [ ] **Step 5: Run the Calendar tests**

Run: `pnpm --filter @project-tavern/modules test -- src/calendar/calendar-module.test.ts`

Expected: PASS; 3 tests passed and the rejection test preserves the original object.

- [ ] **Step 6: Commit the Calendar owner**

```bash
git add packages/modules/src/calendar/contract.ts packages/modules/src/calendar/calendar-module.ts packages/modules/src/calendar/calendar-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add calendar state owner"
```

## Task 4: Implement the Actors Module

**Files:**
- Modify: `packages/modules/src/actors/contract.ts`
- Create: `packages/modules/src/actors/actors-module.ts`
- Create: `packages/modules/src/actors/actors-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: Story initial player/heroine/relationship data and coordinator-authored ordered stamina components.
- Produces: actor/relationship state, read port, strict owner operations for stamina/mood/affection/teamwork/stage, and ordered before/after DomainFacts.

- [ ] **Step 1: Write failing tests for cost rejection and recovery clamping**

```ts
// packages/modules/src/actors/actors-module.test.ts
import { describe, expect, it } from "vitest";
import { actorsModuleV1 } from "./actors-module.js";

const state = {
  player: { actorId: "actor.player", stamina: { current: 2, maximum: 10 }, mood: 0, attributes: { body: "C", social: "C", intellect: "B" } },
  heroine: { actorId: "actor.heroine", stamina: { current: 10, maximum: 10 }, mood: 0 },
  relationship: { affection: 0, teamwork: 0, stage: "cold" },
} as const;

describe("actorsModuleV1", () => {
  it("rejects a stamina cost instead of clamping below zero", () => {
    const result = actorsModuleV1.owner!.propose(state, {
      kind: "adjust_stamina",
      actorId: "actor.player",
      mode: "cost",
      components: [{ requestedDelta: -3, reason: { kind: "command", commandKind: "actor.prepare_food", reasonId: "reason.e2e_prepare" } }],
    }, {});
    expect(result).toEqual({
      kind: "rejected",
      rejection: { code: "actor.insufficient_stamina", details: { actorId: "actor.player", required: 3, available: 2 } },
    });
  });

  it("sums recovery components once and clamps only at maximum", () => {
    const result = actorsModuleV1.owner!.propose(state, {
      kind: "adjust_stamina",
      actorId: "actor.player",
      mode: "recovery",
      components: [
        { requestedDelta: 3, reason: { kind: "command", commandKind: "actor.rest", reasonId: "reason.e2e_rest" } },
        { requestedDelta: -2, reason: { kind: "aura", auraId: "aura.e2e_strain", reasonId: "reason.e2e_strain" } },
      ],
    }, {});
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload.player.stamina.current).toBe(3);
    expect(result.proposal.facts[0]).toMatchObject({ kind: "actor.stamina_changed", value: { before: 2, after: 3 } });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/actors/actors-module.test.ts`

Expected: FAIL with `Cannot find module './actors-module.js'`.

- [ ] **Step 3: Define the closed Actors owner operations**

```ts
// packages/modules/src/actors/contract.ts
export type ActorsOwnerOperationV1 =
  | {
      readonly kind: "adjust_stamina";
      readonly actorId: "actor.player" | "actor.heroine";
      readonly mode: "cost" | "recovery" | "effect";
      readonly components: readonly [StaminaChangeComponentV1, ...StaminaChangeComponentV1[]];
    }
  | { readonly kind: "set_mood"; readonly actorId: ActorId; readonly value: MoodPoint; readonly reason: ChangeReasonV1 }
  | { readonly kind: "adjust_mood"; readonly actorId: ActorId; readonly delta: SafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "adjust_affection"; readonly delta: SafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "adjust_teamwork"; readonly delta: SafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "set_relationship_stage"; readonly stage: RelationshipStage; readonly reason: ChangeReasonV1 };
```

- [ ] **Step 4: Implement the single stamina resolution function**

```ts
// packages/modules/src/actors/actors-module.ts
export function resolveStaminaChangeV1(
  before: NonNegativeSafeInteger,
  maximum: PositiveSafeInteger,
  mode: "cost" | "recovery" | "effect",
  components: readonly StaminaChangeComponentV1[],
): { readonly kind: "applied"; readonly after: NonNegativeSafeInteger } | { readonly kind: "insufficient"; readonly required: PositiveSafeInteger } {
  const requested = components.reduce((sum, component) => sum + component.requestedDelta, 0);
  if (mode === "recovery") {
    return { kind: "applied", after: parseNonNegativeSafeInteger(Math.min(maximum, before + Math.max(0, requested))) };
  }
  if (before + requested < 0) {
    return { kind: "insufficient", required: parsePositiveSafeInteger(Math.abs(requested)) };
  }
  return { kind: "applied", after: parseNonNegativeSafeInteger(Math.min(maximum, before + requested)) };
}
```

Use this function inside a stateful `module.actors` binding for slot `simulation.actors`. The strict schemas fix mood to `-2..2`, stamina to `0..maximum`, attribute ranks to `C | B | A | S | S+`, and stage to the Catalog's seven-value union. Every successful adjustment emits the exact ordered before/after fact and original components.

- [ ] **Step 5: Run focused and property tests**

Add a fast-check property to the same test file asserting that every successful stamina result is within `0..maximum` and every insufficient cost leaves the input state unchanged.

Run: `pnpm --filter @project-tavern/modules test -- src/actors/actors-module.test.ts`

Expected: PASS; example tests and the stamina range property pass.

- [ ] **Step 6: Commit the Actors owner**

```bash
git add packages/modules/src/actors/contract.ts packages/modules/src/actors/actors-module.ts packages/modules/src/actors/actors-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add actors state owner"
```

## Task 5: Implement the Status Module and Aura Lifecycles

**Files:**
- Modify: `packages/modules/src/status/contract.ts`
- Create: `packages/modules/src/status/status-module.ts`
- Create: `packages/modules/src/status/status-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: Story aura definitions, explicit source/target/duration values, coordinator-provided successful boundary kinds, and `commandSequence` for deterministic instance IDs.
- Produces: `StatusStateV1`, Aura read port, apply/clear/tick owner operations, exact `aura.applied|cleared|expired` facts, and modifier collection ordered by applied sequence/instance/definition index.

- [ ] **Step 1: Write failing tests for uniqueness and boundary consumption**

```ts
// packages/modules/src/status/status-module.test.ts
import { describe, expect, it } from "vitest";
import { statusModuleV1 } from "./status-module.js";

describe("statusModuleV1", () => {
  it("rejects a duplicate aura target instead of stacking or refreshing", () => {
    const aura = {
      instanceId: "aura:1:0",
      auraId: "aura.e2e_sign",
      target: { kind: "tavern" },
      source: { kind: "story_action", actionId: "action.e2e_branch" },
      duration: { kind: "countdown", unit: "opening", remaining: 1 },
      appliedAtSequence: 1,
    } as const;
    const result = statusModuleV1.owner!.propose({ auras: [aura] }, { kind: "apply", aura }, {});
    expect(result).toEqual({
      kind: "rejected",
      rejection: { code: "aura.already_present", details: { auraId: aura.auraId, target: aura.target } },
    });
  });

  it("expires an opening aura only when the collector marked it applicable", () => {
    const aura = {
      instanceId: "aura:1:0",
      auraId: "aura.e2e_sign",
      target: { kind: "tavern" },
      source: { kind: "story_action", actionId: "action.e2e_branch" },
      duration: { kind: "countdown", unit: "opening", remaining: 1 },
      appliedAtSequence: 1,
    } as const;
    const result = statusModuleV1.owner!.propose(
      { auras: [aura] },
      { kind: "tick", unit: "opening", applicableInstanceIds: [aura.instanceId], reason: { kind: "aura", auraId: aura.auraId, reasonId: "reason.e2e_sign" } },
      {},
    );
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload.auras).toEqual([]);
    expect(result.proposal.facts).toEqual([{ kind: "aura.expired", instanceId: aura.instanceId, auraId: aura.auraId, reason: { kind: "aura", auraId: aura.auraId, reasonId: "reason.e2e_sign" } }]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/status/status-module.test.ts`

Expected: FAIL with `Cannot find module './status-module.js'`.

- [ ] **Step 3: Implement apply, clear, and exact countdown ticking**

```ts
// packages/modules/src/status/status-module.ts
function tickAurasV1(
  state: Readonly<StatusStateV1>,
  unit: "phase_end" | "day_end" | "opening" | "night_recovery",
  applicableInstanceIds: ReadonlySet<string>,
  reason: ChangeReasonV1,
): StatusOwnerProposalV1 {
  const auras: AuraInstanceV1[] = [];
  const facts: StatusFactV1[] = [];
  for (const aura of state.auras) {
    if (aura.duration.kind !== "countdown" || aura.duration.unit !== unit || !applicableInstanceIds.has(aura.instanceId)) {
      auras.push(aura);
      continue;
    }
    if (aura.duration.remaining === 1) {
      facts.push({ kind: "aura.expired", instanceId: aura.instanceId, auraId: aura.auraId, reason });
      continue;
    }
    auras.push({ ...aura, duration: { ...aura.duration, remaining: aura.duration.remaining - 1 } });
  }
  return { payload: { auras }, facts };
}
```

The stateful binding owns only `simulation.status`. `apply` validates exact allowed target and duration policy supplied in the operation; `clear` requires one matching instance; `tick` requires unique `applicableInstanceIds`. Sort collected modifiers by `appliedAtSequence`, then `instanceId`, then definition index without reordering the authoritative Aura array.

- [ ] **Step 4: Add negative lifecycle vectors**

Add tests proving delegated/closed openings pass an empty applicable set and do not consume `opening`; `night_recovery` contributes before ticking; a rejected outer transaction never calls `apply`; and `until_cleared` never ticks.

Run: `pnpm --filter @project-tavern/modules test -- src/status/status-module.test.ts`

Expected: PASS; duplicate, applicable, inapplicable, recovery-order, rollback, and until-cleared vectors pass.

- [ ] **Step 5: Commit the Status owner**

```bash
git add packages/modules/src/status/contract.ts packages/modules/src/status/status-module.ts packages/modules/src/status/status-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add status aura owner"
```

## Task 6: Implement Inventory, FIFO Batches, and the Authoritative Ledger

**Files:**
- Modify: `packages/modules/src/inventory/contract.ts`
- Create: `packages/modules/src/inventory/inventory-module.ts`
- Create: `packages/modules/src/inventory/inventory-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: Story ingredient/item definitions, command sequence, day, and owner operations assembled by the coordinator.
- Produces: cash, ingredient batches, item stacks, ledger, deterministic batch/entry IDs, FIFO consume/spoil/grant/purchase operations, and the only legal application of `ledger.append`.

- [ ] **Step 1: Write failing FIFO and ledger-conservation tests**

```ts
// packages/modules/src/inventory/inventory-module.test.ts
import { describe, expect, it } from "vitest";
import { inventoryModuleV1 } from "./inventory-module.js";

describe("inventoryModuleV1", () => {
  it("consumes earliest expiry, acquisition day, then batch ID", () => {
    const state = {
      startingCash: 10,
      cash: 10,
      ingredientBatches: [
        { batchId: "batch:initial:1", ingredientId: "ingredient.e2e_grain", quantity: 2, acquiredDay: 1, lastUsableDay: 3, refrigerationExtended: false, source: { kind: "initial", reasonId: "reason.e2e_initial" } },
        { batchId: "batch:initial:0", ingredientId: "ingredient.e2e_grain", quantity: 2, acquiredDay: 1, lastUsableDay: 2, refrigerationExtended: false, source: { kind: "initial", reasonId: "reason.e2e_initial" } },
      ],
      itemStacks: [],
      ledger: [],
    } as const;
    const result = inventoryModuleV1.owner!.propose(state, {
      kind: "consume_ingredients",
      lines: [{ ingredientId: "ingredient.e2e_grain", quantity: 3 }],
      reason: { kind: "command", commandKind: "tavern.opening.start", reasonId: "reason.e2e_opening" },
    }, {});
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.facts[0]).toMatchObject({
      kind: "inventory.consumed",
      lines: [
        { batchId: "batch:initial:0", ingredientId: "ingredient.e2e_grain", quantity: 2 },
        { batchId: "batch:initial:1", ingredientId: "ingredient.e2e_grain", quantity: 1 },
      ],
    });
  });

  it("keeps cash equal to starting cash plus ledger deltas", () => {
    const result = inventoryModuleV1.owner!.propose(
      { startingCash: 10, cash: 10, ingredientBatches: [], itemStacks: [], ledger: [] },
      { kind: "append_ledger", commandSequence: 1, entries: [{ category: "story_cost", reasonId: "reason.e2e_cost", cashDelta: -3, valuationDelta: 0, subject: { kind: "action", actionId: "action.e2e_branch" } }] },
      {},
    );
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload.cash).toBe(7);
    expect(result.proposal.payload.ledger.reduce((sum, entry) => sum + entry.cashDelta, 10)).toBe(7);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/inventory/inventory-module.test.ts`

Expected: FAIL with `Cannot find module './inventory-module.js'`.

- [ ] **Step 3: Implement deterministic FIFO selection**

```ts
// packages/modules/src/inventory/inventory-module.ts
export function consumeFifoV1(
  batches: readonly InventoryBatchV1[],
  ingredientId: string,
  requested: number,
): { readonly batches: readonly InventoryBatchV1[]; readonly consumed: readonly BatchConsumptionV1[] } | null {
  const available = batches
    .filter((batch) => batch.ingredientId === ingredientId)
    .reduce((sum, batch) => sum + batch.quantity, 0);
  if (available < requested) return null;

  let remaining = requested;
  const consumed: BatchConsumptionV1[] = [];
  const selected = [...batches]
    .filter((batch) => batch.ingredientId === ingredientId)
    .sort((left, right) =>
      left.lastUsableDay - right.lastUsableDay ||
      left.acquiredDay - right.acquiredDay ||
      left.batchId.localeCompare(right.batchId),
    );
  const usedById = new Map<string, number>();
  for (const batch of selected) {
    if (remaining === 0) break;
    const quantity = Math.min(batch.quantity, remaining);
    usedById.set(batch.batchId, quantity);
    consumed.push({ batchId: batch.batchId, ingredientId, quantity });
    remaining -= quantity;
  }
  const next = batches.flatMap((batch) => {
    const used = usedById.get(batch.batchId) ?? 0;
    return used === batch.quantity ? [] : [{ ...batch, quantity: batch.quantity - used }];
  });
  return { batches: next, consumed };
}
```

- [ ] **Step 4: Implement owner operations and invariants**

Define strict operations `purchase`, `consume_ingredients`, `grant_ingredients`, `grant_items`, `consume_items`, `spoil`, `extend_shelf_life`, and `append_ledger`. Generate `batch:<commandSequence>:<lineIndex>` and `ledger:<commandSequence>:<index>` IDs. Validate all requested lines as unique positive quantities before proposing any state. Every cash change appends matching ledger entries in the same payload; `cash === startingCash + sum(ledger.cashDelta)` is a local invariant.

Add tests for insufficient cash/ingredient rejection, duplicate lines, purchase batch IDs, story reward valuation, spoilage valuation, one-time refrigeration extension, and unknown-key schema rejection.

- [ ] **Step 5: Run the complete Inventory test file**

Run: `pnpm --filter @project-tavern/modules test -- src/inventory/inventory-module.test.ts`

Expected: PASS; FIFO, IDs, cash/ledger conservation, rejection atomicity, spoilage, grant, and refrigeration tests pass.

- [ ] **Step 6: Commit Inventory only**

```bash
git add packages/modules/src/inventory/contract.ts packages/modules/src/inventory/inventory-module.ts packages/modules/src/inventory/inventory-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add inventory and ledger owner"
```

## Task 7: Implement the Facilities Module

**Files:**
- Modify: `packages/modules/src/facilities/contract.ts`
- Create: `packages/modules/src/facilities/facilities-module.ts`
- Create: `packages/modules/src/facilities/facilities-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: a validated opportunity/choice and command sequence from the coordinator.
- Produces: `FacilitiesStateV1`, one decision per opportunity, built facility records, read-port modifier lookup, and `facility.choice_committed` facts. It never deducts AP, stamina, or cash itself.

- [ ] **Step 1: Write failing build, skip, and duplicate-decision tests**

```ts
// packages/modules/src/facilities/facilities-module.test.ts
import { describe, expect, it } from "vitest";
import { facilitiesModuleV1 } from "./facilities-module.js";

describe("facilitiesModuleV1", () => {
  it("records a build exactly once", () => {
    const result = facilitiesModuleV1.owner!.propose(
      { built: [], decisions: [] },
      {
        kind: "choose",
        opportunityId: "action.e2e_facility",
        decision: { kind: "built", facilityId: "facility.e2e_storage" },
        builtAtSequence: 4,
        reason: { kind: "facility", facilityId: "facility.e2e_storage", reasonId: "reason.e2e_facility" },
      },
      {},
    );
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload).toEqual({
      built: [{ facilityId: "facility.e2e_storage", builtAtSequence: 4 }],
      decisions: [{ opportunityId: "action.e2e_facility", decision: { kind: "built", facilityId: "facility.e2e_storage" } }],
    });
  });

  it("rejects a second choice for the same opportunity", () => {
    const state = {
      built: [],
      decisions: [{ opportunityId: "action.e2e_facility", decision: { kind: "skipped" } }],
    } as const;
    const result = facilitiesModuleV1.owner!.propose(state, {
      kind: "choose",
      opportunityId: "action.e2e_facility",
      decision: { kind: "skipped" },
      builtAtSequence: 5,
      reason: { kind: "command", commandKind: "facility.choose", reasonId: "reason.e2e_facility_skip" },
    }, {});
    expect(result).toEqual({
      kind: "rejected",
      rejection: { code: "facility.choice_committed", details: { opportunityId: "action.e2e_facility", choice: { kind: "skipped" } } },
    });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/facilities/facilities-module.test.ts`

Expected: FAIL with `Cannot find module './facilities-module.js'`.

- [ ] **Step 3: Implement the one-operation owner contract**

```ts
// packages/modules/src/facilities/contract.ts
export type FacilityDecisionV1 =
  | { readonly kind: "built"; readonly facilityId: FacilityId }
  | { readonly kind: "skipped" };

export interface FacilitiesOwnerOperationV1 {
  readonly kind: "choose";
  readonly opportunityId: ActionId;
  readonly decision: FacilityDecisionV1;
  readonly builtAtSequence: PositiveSafeInteger;
  readonly reason: ChangeReasonV1;
}
```

```ts
// packages/modules/src/facilities/facilities-module.ts
function proposeFacilityChoiceV1(
  state: Readonly<FacilitiesStateV1>,
  operation: Readonly<FacilitiesOwnerOperationV1>,
): ModuleProposalResultV1<FacilitiesOwnerProposalV1, FacilitiesRejectionV1> {
  const existing = state.decisions.find((entry) => entry.opportunityId === operation.opportunityId);
  if (existing) {
    return {
      kind: "rejected",
      rejection: { code: "facility.choice_committed", details: { opportunityId: operation.opportunityId, choice: existing.decision } },
    };
  }
  const built = operation.decision.kind === "built"
    ? [...state.built, { facilityId: operation.decision.facilityId, builtAtSequence: operation.builtAtSequence }]
    : state.built;
  const payload = {
    built,
    decisions: [...state.decisions, { opportunityId: operation.opportunityId, decision: operation.decision }],
  };
  return {
    kind: "proposed",
    proposal: {
      payload,
      facts: [{ kind: "facility.choice_committed", opportunityId: operation.opportunityId, choice: operation.decision, reason: operation.reason }],
    },
  };
}
```

Expose a read port with immutable `builtFacilityIds` and `decisions`. The strict operation Schema requires a positive `builtAtSequence`; the coordinator validates whether the facility was actually offered before invoking this owner.

- [ ] **Step 4: Run the focused tests**

Run: `pnpm --filter @project-tavern/modules test -- src/facilities/facilities-module.test.ts`

Expected: PASS; build, skip, and duplicate decision vectors pass.

- [ ] **Step 5: Commit Facilities**

```bash
git add packages/modules/src/facilities/contract.ts packages/modules/src/facilities/facilities-module.ts packages/modules/src/facilities/facilities-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add facilities state owner"
```

## Task 8: Implement Tavern Planning, Demand, Preparation, and History

**Files:**
- Modify: `packages/modules/src/tavern/contract.ts`
- Create: `packages/modules/src/tavern/tavern-module.ts`
- Create: `packages/modules/src/tavern/tavern-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: Story service modes, recipes, base demand, demand rule output, and fully resolved opening/closure records supplied by the coordinator.
- Produces: Tavern state/read port; helper, reputation, preparation, plan, demand, and service-history owner operations; strict plan/demand/history invariants; and corresponding facts. Tavern does not consume inventory or actor state directly.

- [ ] **Step 1: Write failing tests for plan shape, frozen demand, and history**

```ts
// packages/modules/src/tavern/tavern-module.test.ts
import { describe, expect, it } from "vitest";
import { tavernModuleV1 } from "./tavern-module.js";

const initial = {
  reputation: 50,
  unlockedRecipeIds: ["recipe.e2e_stew"],
  helper: { unlocked: false, tier: "apprentice" },
  preparation: { day: 1, actionCount: 0 },
  servicePlan: null,
  demandSeeds: [],
  currentDemand: null,
  serviceHistory: [],
} as const;

describe("tavernModuleV1", () => {
  it("rejects a closed plan with a menu", () => {
    const result = tavernModuleV1.owner!.propose(initial, {
      kind: "set_plan",
      plan: { mode: "closed", menu: [{ recipeId: "recipe.e2e_stew", portions: 1 }] },
      reason: { kind: "command", commandKind: "tavern.plan.set", reasonId: "reason.e2e_closed" },
    }, {});
    expect(result).toEqual({ kind: "rejected", rejection: { code: "tavern.invalid_plan", details: { reason: "closed_has_menu" } } });
  });

  it("stores materialized demand as an immutable daily value", () => {
    const demand = {
      day: 1,
      segments: [{ segmentId: "segment.e2e_guests", preview: { min: 2, max: 2 }, actualCustomers: 2, modifiers: [] }],
    } as const;
    const result = tavernModuleV1.owner!.propose(initial, { kind: "materialize_demand", demand }, {});
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload.currentDemand).toEqual(demand);
    expect(result.proposal.facts).toEqual([{ kind: "demand.materialized", demand }]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/tavern/tavern-module.test.ts`

Expected: FAIL with `Cannot find module './tavern-module.js'`.

- [ ] **Step 3: Define the Tavern owner operation union**

```ts
// packages/modules/src/tavern/contract.ts
export type TavernOwnerOperationV1 =
  | { readonly kind: "set_plan"; readonly plan: TavernPlanV1; readonly reason: ChangeReasonV1 }
  | { readonly kind: "prepare"; readonly day: DayIndex; readonly reason: ChangeReasonV1 }
  | { readonly kind: "reset_preparation"; readonly day: DayIndex }
  | { readonly kind: "set_helper"; readonly helper: HelperStateV1; readonly reason: ChangeReasonV1 }
  | { readonly kind: "adjust_reputation"; readonly delta: SafeInteger; readonly reason: ChangeReasonV1 }
  | { readonly kind: "set_demand_seeds"; readonly demandSeeds: readonly DemandDayStateV1[] }
  | { readonly kind: "materialize_demand"; readonly demand: MaterializedDemandDayV1 }
  | { readonly kind: "clear_demand" }
  | { readonly kind: "append_service_history"; readonly entry: ServiceHistoryEntryV1 }
  | { readonly kind: "clear_daily_plan" };
```

- [ ] **Step 4: Implement plan validation once for query and execution reuse**

```ts
// packages/modules/src/tavern/tavern-module.ts
export function validatePlanShapeV1(
  plan: Readonly<TavernPlanV1>,
  unlockedRecipeIds: ReadonlySet<RecipeId>,
  menuLimit: PositiveSafeInteger,
): TavernRejectionV1 | null {
  if (plan.mode === "closed" && plan.menu.length !== 0) {
    return { code: "tavern.invalid_plan", details: { reason: "closed_has_menu" } };
  }
  if (plan.mode !== "closed" && plan.menu.length === 0) {
    return { code: "tavern.invalid_plan", details: { reason: "open_has_no_menu" } };
  }
  if (plan.menu.length > menuLimit) {
    return { code: "tavern.invalid_plan", details: { reason: "menu_size" } };
  }
  const ids = plan.menu.map((line) => line.recipeId);
  if (new Set(ids).size !== ids.length) {
    return { code: "tavern.invalid_plan", details: { reason: "duplicate_recipe" } };
  }
  if (ids.some((id) => !unlockedRecipeIds.has(id))) {
    return { code: "tavern.invalid_plan", details: { reason: "locked_recipe" } };
  }
  return null;
}
```

The `set_plan` operation calls this function with the Story-provided contextual menu limit passed through the owner dependency DTO by the coordinator. `prepare` increments exactly once for the current day and rejects at `dailyPreparationLimit`. `append_service_history` enforces one strictly increasing entry per resolved service day. `materialize_demand` emits exactly one same-value fact; `clear_demand` emits none.

- [ ] **Step 5: Add demand and history invariant tests**

Add tests for unique demand day/segment rows, current-demand day equality, preparation reset, helper unlock, reputation floor, duplicate history day rejection, and `opening`/`closure` discriminants.

Run: `pnpm --filter @project-tavern/modules test -- src/tavern/tavern-module.test.ts`

Expected: PASS; plan, preparation, demand, helper, reputation, and history tests pass.

- [ ] **Step 6: Commit Tavern state behavior**

```bash
git add packages/modules/src/tavern/contract.ts packages/modules/src/tavern/tavern-module.ts packages/modules/src/tavern/tavern-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add tavern planning and demand owner"
```

## Task 9: Implement the Workflow Module and Opening State Machine

**Files:**
- Modify: `packages/modules/src/workflow/contract.ts`
- Create: `packages/modules/src/workflow/workflow-module.ts`
- Create: `packages/modules/src/workflow/workflow-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: coordinator-validated `OpeningSessionV1` and `WorldActionSessionV1` values.
- Produces: the sole `activeWorkflow` owner; opening checkpoint/blocking-event transitions; WorldAction progress transitions; session modifier append; and conflict/missing/not-ready rejections.

- [ ] **Step 1: Write failing opening interruption tests**

```ts
// packages/modules/src/workflow/workflow-module.test.ts
import { describe, expect, it } from "vitest";
import { workflowModuleV1 } from "./workflow-module.js";
import { buildOpeningSessionV1 } from "../testing/builders.js";

describe("workflowModuleV1", () => {
  it("preserves a completed blocking scene gap before explicit continue", () => {
    const opening = buildOpeningSessionV1({
      checkpoint: "middle",
      blockingEvent: { eventId: "event.e2e_opening_interrupt", sceneId: "scene.e2e_opening_interrupt" },
    });
    const cleared = workflowModuleV1.owner!.propose(
      opening,
      { kind: "clear_opening_blocking_event", eventId: "event.e2e_opening_interrupt" },
      {},
    );
    expect(cleared.kind).toBe("proposed");
    if (cleared.kind !== "proposed") throw new Error("expected proposal");
    expect(cleared.proposal.payload).toMatchObject({ kind: "opening", checkpoint: "middle", blockingEvent: null });
  });

  it("rejects a second workflow", () => {
    const opening = buildOpeningSessionV1({ checkpoint: "started", blockingEvent: null });
    const result = workflowModuleV1.owner!.propose(
      opening,
      { kind: "start", workflow: { kind: "world_action", actionId: "action.e2e_world", optionId: "choice.e2e_world_basic", beginStepId: "step.e2e_departure", completionStepId: "step.e2e_return", preparationBonus: 0, startedAtSequence: 3, startedDay: 1, startedPhase: "morning", progress: "begin_scene", paidCostEntryIds: [], choices: [] } },
      {},
    );
    expect(result).toEqual({ kind: "rejected", rejection: { code: "workflow.conflict", details: { activeKind: "opening", attemptedKind: "world_action" } } });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/workflow/workflow-module.test.ts`

Expected: FAIL with `Cannot find module './workflow-module.js'`.

- [ ] **Step 3: Define the workflow transition union**

```ts
// packages/modules/src/workflow/contract.ts
export type WorkflowOwnerOperationV1 =
  | { readonly kind: "start"; readonly workflow: ActiveWorkflowV1 }
  | { readonly kind: "set_opening_blocking_event"; readonly blockingEvent: OpeningBlockingEventV1 }
  | { readonly kind: "clear_opening_blocking_event"; readonly eventId: EventId }
  | { readonly kind: "advance_opening_checkpoint"; readonly from: OpeningCheckpointV1; readonly to: OpeningCheckpointV1 }
  | { readonly kind: "append_opening_modifier"; readonly modifier: ModifierV1 }
  | { readonly kind: "advance_world_action"; readonly from: WorldActionProgressV1; readonly to: WorldActionProgressV1 }
  | { readonly kind: "append_world_choice"; readonly choice: WorldActionChoiceV1 }
  | { readonly kind: "clear"; readonly expectedKind: "opening" | "world_action" };
```

- [ ] **Step 4: Implement a total, explicit state machine**

```ts
// packages/modules/src/workflow/workflow-module.ts
const openingTransitions = Object.freeze({
  started: "middle",
  middle: "before_finalize",
  before_finalize: "ready_to_finalize",
} as const);

const worldTransitions = Object.freeze({
  begin_scene: "awaiting_completion_phase",
  awaiting_completion_phase: "completion_scene",
  completion_scene: "ready_to_complete",
} as const);

function isOpeningTransitionV1(from: OpeningCheckpointV1, to: OpeningCheckpointV1): boolean {
  return from !== "ready_to_finalize" && openingTransitions[from] === to;
}

function isWorldTransitionV1(from: WorldActionProgressV1, to: WorldActionProgressV1): boolean {
  return from !== "ready_to_complete" && worldTransitions[from] === to;
}
```

The owner rejects non-adjacent transitions, clearing the wrong workflow kind, clearing a mismatched blocking event, continuing while `blockingEvent` is non-null, and adding an opening modifier outside an OpeningSession. Its state Schema is the strict `ActiveWorkflowV1 | null` union; no Story data, Snapshot, or function is stored in an OpeningBaseline.

- [ ] **Step 5: Run complete Workflow tests**

Run: `pnpm --filter @project-tavern/modules test -- src/workflow/workflow-module.test.ts`

Expected: PASS; opening, interruption gap, modifier, WorldAction, conflict, and clear vectors pass.

- [ ] **Step 6: Commit Workflow**

```bash
git add packages/modules/src/workflow/contract.ts packages/modules/src/workflow/workflow-module.ts packages/modules/src/workflow/workflow-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add workflow state machines"
```

## Task 10: Implement Progression Facts, Outcomes, Checks, and Ending Inputs

**Files:**
- Modify: `packages/modules/src/progression/contract.ts`
- Create: `packages/modules/src/progression/progression-module.ts`
- Create: `packages/modules/src/progression/progression-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: closed Story Fact/Quest/Outcome definitions, resolved checks, and ending effects validated by the coordinator.
- Produces: persistent Fact/Quest/Outcome/check state and read ports; only this owner applies `fact.set`, `quest.set`, and `outcome.set`.

- [ ] **Step 1: Write failing definition and check-persistence tests**

```ts
// packages/modules/src/progression/progression-module.test.ts
import { describe, expect, it } from "vitest";
import { progressionModuleV1 } from "./progression-module.js";

describe("progressionModuleV1", () => {
  it("rejects a value outside the Story definition", () => {
    const state = {
      facts: [{ factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_none" } }],
      quests: [],
      outcomes: [],
      resolvedChecks: [],
    } as const;
    const result = progressionModuleV1.owner!.propose(state, {
      kind: "set_fact",
      factId: "fact.e2e_branch",
      value: { kind: "token", value: "branch.e2e_unknown" },
      definition: { kind: "token", defaultValue: "branch.e2e_none", allowedValues: ["branch.e2e_none", "branch.e2e_left", "branch.e2e_right"] },
      reason: { kind: "story_action", actionId: "action.e2e_branch", reasonId: "reason.e2e_branch" },
    }, {});
    expect(result).toEqual({ kind: "rejected", rejection: { code: "engine.invariant_rejected", details: { invariantCode: "story.value_invalid" } } });
  });

  it("appends a resolved check once and never stores its effects", () => {
    const check = {
      checkId: "check.e2e_world",
      actorId: "actor.player",
      dice: [4, 3],
      attributeBonus: 1,
      preparationBonus: 1,
      modifiers: [],
      totalBonus: 2,
      total: 9,
      bandId: "band.e2e_complete",
      resolvedAtSequence: 8,
    } as const;
    const result = progressionModuleV1.owner!.propose(
      { facts: [], quests: [], outcomes: [], resolvedChecks: [] },
      { kind: "append_check", check },
      {},
    );
    expect(result.kind).toBe("proposed");
    if (result.kind !== "proposed") throw new Error("expected proposal");
    expect(result.proposal.payload.resolvedChecks).toEqual([check]);
    expect(result.proposal.facts).toEqual([{ kind: "check.resolved", result: { ...check, effects: [] } }]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/progression/progression-module.test.ts`

Expected: FAIL with `Cannot find module './progression-module.js'`.

- [ ] **Step 3: Define and implement the closed progression operations**

```ts
// packages/modules/src/progression/contract.ts
export type ProgressionOwnerOperationV1 =
  | { readonly kind: "set_fact"; readonly factId: FactId; readonly value: StoryValueV1; readonly definition: StoryValueDefinitionV1; readonly reason: ChangeReasonV1 }
  | { readonly kind: "set_quest"; readonly quest: QuestEntryV1; readonly definition: QuestDefinitionV1; readonly reason: ChangeReasonV1 }
  | { readonly kind: "set_outcome"; readonly outcomeId: OutcomeId; readonly value: StoryValueV1; readonly definition: StoryValueDefinitionV1; readonly reason: ChangeReasonV1 }
  | { readonly kind: "append_check"; readonly check: ResolvedCheckV1 };
```

```ts
// packages/modules/src/progression/progression-module.ts
export function storyValueMatchesDefinitionV1(
  value: Readonly<StoryValueV1>,
  definition: Readonly<StoryValueDefinitionV1>,
): boolean {
  if (value.kind !== definition.kind) return false;
  if (definition.kind === "boolean") return value.kind === "boolean";
  if (definition.kind === "integer") {
    return value.kind === "integer" && value.value >= definition.range.min && value.value <= definition.range.max;
  }
  return value.kind === "token" && definition.allowedValues.includes(value.value);
}
```

The owner replaces one existing Fact/Quest/Outcome entry in stable definition order and appends checks in `resolvedAtSequence` order. It rejects unknown/duplicate check IDs, malformed totals, mismatched bands, and values outside definitions before producing a proposal. It emits the exact `fact.set`, `quest.updated`, `outcome.set`, or `check.resolved` fact.

- [ ] **Step 4: Run all Progression tests**

Run: `pnpm --filter @project-tavern/modules test -- src/progression/progression-module.test.ts`

Expected: PASS; definition bounds, stable replacement, check math, duplicate rejection, and ordered facts pass.

- [ ] **Step 5: Commit Progression**

```bash
git add packages/modules/src/progression/contract.ts packages/modules/src/progression/progression-module.ts packages/modules/src/progression/progression-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add progression state owner"
```

## Task 11: Implement the Narrative Module and Pure Node Interpreter

**Files:**
- Modify: `packages/modules/src/narrative/contract.ts`
- Create: `packages/modules/src/narrative/interpreter.ts`
- Create: `packages/modules/src/narrative/narrative-module.ts`
- Create: `packages/modules/src/narrative/narrative-module.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: validated Narrative Program, current Narrative state, exact cursor-bearing commands, and coordinator-resolved directives for conditions/checks/effects/checkpoints.
- Produces: the sole Narrative state owner plus a pure `readNarrativeDirectiveV1` service. The service returns typed directives; it never reads another Module, applies effects, consumes RNG, or mutates Snapshot.

- [ ] **Step 1: Write failing tests for presentable stops, branch/rejoin, and cursor safety**

```ts
// packages/modules/src/narrative/narrative-module.test.ts
import { describe, expect, it } from "vitest";
import { readNarrativeDirectiveV1 } from "./interpreter.js";
import { narrativeModuleV1 } from "./narrative-module.js";

const scene = {
  sceneId: "scene.e2e_branch",
  entryNodeId: "node.e2e_branch.choice",
  nodes: [
    { kind: "choice", nodeId: "node.e2e_branch.choice", choices: [
      { choiceId: "choice.e2e_left", textId: "text.e2e_left", showWhen: [], enableWhen: [], confirmation: { benefitTextIds: [], mutuallyExcludedActionIds: [], majorRiskTextIds: [] }, effects: [{ kind: "fact.set", factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_left" }, reasonId: "reason.e2e_branch" }], nextNodeId: "node.e2e_branch.shared" },
      { choiceId: "choice.e2e_right", textId: "text.e2e_right", showWhen: [], enableWhen: [], confirmation: { benefitTextIds: [], mutuallyExcludedActionIds: [], majorRiskTextIds: [] }, effects: [{ kind: "fact.set", factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_right" }, reasonId: "reason.e2e_branch" }], nextNodeId: "node.e2e_branch.shared" },
    ] },
    { kind: "line", nodeId: "node.e2e_branch.shared", speakerId: "character.e2e_heroine", textId: "text.e2e_shared", nextNodeId: "node.e2e_branch.end" },
    { kind: "end", nodeId: "node.e2e_branch.end" },
  ],
} as const;

describe("Narrative v1", () => {
  it("stops at a presentable choice and both choices rejoin one node", () => {
    expect(readNarrativeDirectiveV1(scene, { sceneId: scene.sceneId, nodeId: scene.entryNodeId }, [])).toEqual({
      kind: "present",
      cursor: { sceneId: scene.sceneId, nodeId: scene.entryNodeId },
    });
    expect(scene.nodes[0].choices.map((choice) => choice.nextNodeId)).toEqual([
      "node.e2e_branch.shared", "node.e2e_branch.shared",
    ]);
  });

  it("rejects a stale choice cursor without moving Narrative", () => {
    const state = {
      status: "active",
      source: { kind: "story_action", actionId: "action.e2e_branch" },
      cursor: { sceneId: scene.sceneId, nodeId: scene.entryNodeId },
      callStack: [],
      stage: { backgroundAssetId: null, characters: [], transition: "cut" },
    } as const;
    const result = narrativeModuleV1.owner!.propose(state, {
      kind: "commit_choice",
      expectedCursor: { sceneId: scene.sceneId, nodeId: "node.e2e_branch.shared" },
      choiceId: "choice.e2e_left",
      nextCursor: { sceneId: scene.sceneId, nodeId: "node.e2e_branch.shared" },
    }, {});
    expect(result).toEqual({
      kind: "rejected",
      rejection: { code: "narrative.cursor_mismatch", details: { expected: { sceneId: scene.sceneId, nodeId: "node.e2e_branch.shared" }, actual: state.cursor } },
    });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/narrative/narrative-module.test.ts`

Expected: FAIL with missing interpreter/module imports.

- [ ] **Step 3: Define the directive boundary for every node kind**

```ts
// packages/modules/src/narrative/contract.ts
export type NarrativeDirectiveV1 =
  | { readonly kind: "present"; readonly cursor: NarrativeCursorV1 }
  | { readonly kind: "move"; readonly nextCursor: NarrativeCursorV1; readonly stageCue?: StageCueV1 }
  | { readonly kind: "choose"; readonly cursor: NarrativeCursorV1; readonly choices: readonly NarrativeChoiceV1[] }
  | { readonly kind: "evaluate_condition"; readonly conditions: readonly ConditionV1[]; readonly passCursor: NarrativeCursorV1; readonly failCursor: NarrativeCursorV1 }
  | { readonly kind: "resolve_check"; readonly request: CheckRequestV1; readonly branches: readonly CheckBranchV1[] }
  | { readonly kind: "apply_effects"; readonly effects: readonly EffectIntentV1[]; readonly nextCursor: NarrativeCursorV1 }
  | { readonly kind: "schedule_checkpoint"; readonly checkpointId: CheckpointId; readonly nextCursor: NarrativeCursorV1 }
  | { readonly kind: "call"; readonly target: NarrativeCursorV1; readonly returnCursor: NarrativeCursorV1 }
  | { readonly kind: "return" }
  | { readonly kind: "complete" };

export type NarrativeOwnerOperationV1 =
  | { readonly kind: "begin"; readonly source: NarrativeSourceV1; readonly cursor: NarrativeCursorV1 }
  | { readonly kind: "move"; readonly expectedCursor: NarrativeCursorV1; readonly nextCursor: NarrativeCursorV1; readonly stage: NarrativeStageStateV1 }
  | { readonly kind: "commit_choice"; readonly expectedCursor: NarrativeCursorV1; readonly choiceId: ChoiceId; readonly nextCursor: NarrativeCursorV1 }
  | { readonly kind: "push_call"; readonly expectedCursor: NarrativeCursorV1; readonly target: NarrativeCursorV1; readonly returnCursor: NarrativeCursorV1 }
  | { readonly kind: "pop_call"; readonly expectedCursor: NarrativeCursorV1 }
  | { readonly kind: "complete"; readonly expectedCursor: NarrativeCursorV1 }
  | { readonly kind: "reset" };
```

- [ ] **Step 4: Implement total node-to-directive interpretation**

```ts
// packages/modules/src/narrative/interpreter.ts
export function readNarrativeDirectiveV1(
  scene: Readonly<NarrativeSceneV1>,
  cursor: Readonly<NarrativeCursorV1>,
  callStack: readonly NarrativeCallFrameV1[],
): NarrativeDirectiveV1 {
  const node = scene.nodes.find((candidate) => candidate.nodeId === cursor.nodeId);
  if (!node) throw new NarrativeInterpreterFault("narrative.invalid_cursor");
  const next = (nodeId: string): NarrativeCursorV1 => ({ sceneId: scene.sceneId, nodeId });
  switch (node.kind) {
    case "line":
    case "narration":
      return { kind: "present", cursor };
    case "choice":
      return { kind: "choose", cursor, choices: node.choices };
    case "condition":
      return { kind: "evaluate_condition", conditions: node.when, passCursor: next(node.passNodeId), failCursor: next(node.failNodeId) };
    case "check":
      return { kind: "resolve_check", request: node.request, branches: node.branches };
    case "command":
      return { kind: "apply_effects", effects: node.effects, nextCursor: next(node.nextNodeId) };
    case "eventCheckpoint":
      return { kind: "schedule_checkpoint", checkpointId: node.checkpointId, nextCursor: next(node.nextNodeId) };
    case "jump":
      return { kind: "move", nextCursor: next(node.targetNodeId) };
    case "call":
      return { kind: "call", target: { sceneId: node.sceneId, nodeId: node.entryNodeId }, returnCursor: next(node.returnNodeId) };
    case "return":
      return callStack.length === 0 ? { kind: "complete" } : { kind: "return" };
    case "stageCue":
      return { kind: "move", nextCursor: next(node.nextNodeId), stageCue: node.cue };
    case "end":
      return { kind: "complete" };
  }
}
```

- [ ] **Step 5: Implement state ownership and automatic-step safety vectors**

The stateful `module.narrative` owns `story.narrative`. Owner operations enforce cursor equality, maximum call depth, stage slot uniqueness, legal source/status combinations, and `idle|active|completed` invariants. The coordinator loops over directives and counts automatic nodes; reaching `maxNarrativeStepsPerCommand` produces `narrative.step_limit_exceeded` before applying the next directive.

Add tests for all eleven node kinds, stage cue state, call/return, completed state, disabled choice metadata, depth limit, step limit, and deep immutability of the source program.

Run: `pnpm --filter @project-tavern/modules test -- src/narrative/narrative-module.test.ts`

Expected: PASS; every node kind and both stable fault limits pass.

- [ ] **Step 6: Commit Narrative**

```bash
git add packages/modules/src/narrative/contract.ts packages/modules/src/narrative/interpreter.ts packages/modules/src/narrative/narrative-module.ts packages/modules/src/narrative/narrative-module.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add narrative state and interpreter"
```

## Task 12: Implement the Stateless World Service

**Files:**
- Modify: `packages/modules/src/world/contract.ts`
- Create: `packages/modules/src/world/world-service.ts`
- Create: `packages/modules/src/world/world-service.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: a validated `WorldActionDefinitionV1`, option, current day/phase, and public-port DTO assembled by the coordinator.
- Produces: immutable Begin/Complete plans containing exact costs, steps, effects, and Check request. It has no state slot, owner operation, proposal, apply method, or candidate Snapshot access.

- [ ] **Step 1: Write the failing stateless-binding and plan tests**

```ts
// packages/modules/src/world/world-service.test.ts
import { describe, expect, it } from "vitest";
import { worldModuleV1, createWorldBeginPlanV1 } from "./world-service.js";

describe("worldModuleV1", () => {
  it("is structurally stateless", () => {
    expect(worldModuleV1.bindingKind).toBe("stateless");
    expect(worldModuleV1.descriptor.stateSlots).toEqual([]);
    expect(worldModuleV1.ownerOperationSchema).toBeNull();
    expect(worldModuleV1.ownerProposalSchema).toBeNull();
    expect(worldModuleV1.owner).toBeNull();
  });

  it("creates a two-step begin plan without mutating input", () => {
    const definition = buildWorldActionDefinitionV1();
    const plan = createWorldBeginPlanV1(definition, "choice.e2e_world_prepared");
    expect(plan).toMatchObject({
      actionId: "action.e2e_world",
      optionId: "choice.e2e_world_prepared",
      cashCost: 2,
      staminaCost: 1,
      firstStep: { phase: "morning", apCost: 1 },
      secondStep: { phase: "afternoon", apCost: 1 },
      preparationBonus: 1,
    });
    expect(definition.options).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/world/world-service.test.ts`

Expected: FAIL with missing World service.

- [ ] **Step 3: Define and implement immutable World plans**

```ts
// packages/modules/src/world/contract.ts
export interface WorldBeginPlanV1 {
  readonly actionId: ActionId;
  readonly optionId: ChoiceId;
  readonly cashCost: Money;
  readonly staminaCost: NonNegativeSafeInteger;
  readonly firstStep: WorldActionStepDefinitionV1;
  readonly secondStep: WorldActionStepDefinitionV1;
  readonly preparationBonus: SafeInteger;
  readonly effects: readonly EffectIntentV1[];
}

export interface WorldCompletePlanV1 {
  readonly actionId: ActionId;
  readonly apCost: NonNegativeSafeInteger;
  readonly checkId: CheckId | null;
  readonly preparationBonus: SafeInteger;
}
```

```ts
// packages/modules/src/world/world-service.ts
export function createWorldBeginPlanV1(
  definition: Readonly<WorldActionDefinitionV1>,
  optionId: ChoiceId,
): WorldBeginPlanV1 {
  const option = definition.options.find((candidate) => candidate.optionId === optionId);
  if (!option) throw new WorldDefinitionError("world.option_missing");
  const [firstStep, secondStep] = definition.steps;
  return {
    actionId: definition.actionId,
    optionId,
    cashCost: definition.baseCashCost + option.additionalCashCost,
    staminaCost: definition.playerStaminaCost,
    firstStep,
    secondStep,
    preparationBonus: option.preparationBonus,
    effects: [...definition.beginEffects, ...option.beginEffects],
  };
}
```

Create the `module.world` stateless binding with strict query input/output schemas. Validate exactly two adjacent steps, unique options, option/step references, and no functions or Snapshot fragments in the returned plan.

- [ ] **Step 4: Run the World service tests**

Run: `pnpm --filter @project-tavern/modules test -- src/world/world-service.test.ts`

Expected: PASS; stateless structure, basic/prepared plans, missing option, and non-adjacent step validation pass.

- [ ] **Step 5: Commit World**

```bash
git add packages/modules/src/world/contract.ts packages/modules/src/world/world-service.ts packages/modules/src/world/world-service.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add stateless world service"
```

## Task 13: Implement the Stateless Scheduling Service

**Files:**
- Modify: `packages/modules/src/scheduling/contract.ts`
- Create: `packages/modules/src/scheduling/scheduler-service.ts`
- Create: `packages/modules/src/scheduling/scheduler-service.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: one frozen evaluation Snapshot projection, one `SchedulerContextV1`, Story event definitions, condition results, and explicit transactional RNG capability.
- Produces: ordered selected events, ordered effects, zero-or-one blocking Scene request, and RNG traces through the caller's capability. It has no state or owner.

- [ ] **Step 1: Write failing ordering and blocking-conflict tests**

```ts
// packages/modules/src/scheduling/scheduler-service.test.ts
import { describe, expect, it } from "vitest";
import { scheduleContextV1, schedulingModuleV1 } from "./scheduler-service.js";

describe("schedulingModuleV1", () => {
  it("is stateless and orders selected events by priority then ID", () => {
    expect(schedulingModuleV1.bindingKind).toBe("stateless");
    expect(schedulingModuleV1.descriptor.stateSlots).toEqual([]);
    expect(schedulingModuleV1.ownerOperationSchema).toBeNull();
    expect(schedulingModuleV1.ownerProposalSchema).toBeNull();
    expect(schedulingModuleV1.owner).toBeNull();
    const result = scheduleContextV1({
      context: { kind: "phase.entered", day: 2, phase: "morning" },
      events: [
        buildEventV1({ eventId: "event.e2e_b", priority: 100, sceneId: null }),
        buildEventV1({ eventId: "event.e2e_a", priority: 100, sceneId: null }),
        buildEventV1({ eventId: "event.e2e_high", priority: 200, sceneId: null }),
      ],
      conditionResults: new Map(),
      rng: fixedRuleRngV1([]),
    });
    expect(result.selected.map((event) => event.eventId)).toEqual([
      "event.e2e_high", "event.e2e_a", "event.e2e_b",
    ]);
  });

  it("faults instead of queuing two blocking scenes", () => {
    const result = scheduleContextV1({
      context: { kind: "phase.entered", day: 2, phase: "morning" },
      events: [
        buildEventV1({ eventId: "event.e2e_a", priority: 200, sceneId: "scene.e2e_a" }),
        buildEventV1({ eventId: "event.e2e_b", priority: 100, sceneId: "scene.e2e_b" }),
      ],
      conditionResults: new Map(),
      rng: fixedRuleRngV1([]),
    });
    expect(result).toEqual({ kind: "faulted", code: "scheduler.multiple_blocking_events" });
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/scheduling/scheduler-service.test.ts`

Expected: FAIL with missing Scheduling service.

- [ ] **Step 3: Implement selection against one frozen context observation**

```ts
// packages/modules/src/scheduling/scheduler-service.ts
export function orderSchedulerCandidatesV1(
  events: readonly StoryEventDefinitionV1[],
): readonly StoryEventDefinitionV1[] {
  return [...events].sort((left, right) =>
    right.priority - left.priority || left.eventId.localeCompare(right.eventId),
  );
}

export function scheduleContextV1(input: Readonly<ScheduleContextInputV1>): ScheduleContextResultV1 {
  const candidates = orderSchedulerCandidatesV1(input.events).filter((event) =>
    triggerMatchesV1(event.trigger, input.context) &&
    event.when.every((condition) => input.conditionResults.get(conditionKeyV1(condition)) === true),
  );
  const selected = selectWeightedGroupsV1(candidates, input.rng);
  const blocking = selected.filter((event) => event.sceneId !== null);
  if (blocking.length > 1) return { kind: "faulted", code: "scheduler.multiple_blocking_events" };
  return {
    kind: "scheduled",
    selected,
    effects: selected.flatMap((event) => event.effects),
    blocking: blocking.length === 1
      ? { eventId: blocking[0].eventId, sceneId: blocking[0].sceneId! }
      : null,
  };
}
```

`selectWeightedGroupsV1` preserves mandatory events, groups weighted candidates by `weightedGroupId` in first-appearance order, calls `rng.nextInt({ exclusiveMax: totalWeight, purpose: "scheduler:<context>:<group>" })` once per non-empty group, and preserves the already ordered event sequence in the result. It never applies effects; the coordinator does so after every candidate in the context has been selected.

- [ ] **Step 4: Add context-order and weighted-vector tests**

Test `story.explicit → command.succeeded → opening.started → opening.middle → opening.before_finalize → day.ended → week.ended → phase.entered`, same-context frozen conditions, cross-context visibility, zero-weight rejection, one deterministic weighted draw, and no Scene for prohibited `week.ended`/`levy.pay` contexts.

Run: `pnpm --filter @project-tavern/modules test -- src/scheduling/scheduler-service.test.ts`

Expected: PASS; stateless, ordering, weighting, frozen-observation, and blocking-conflict vectors pass.

- [ ] **Step 5: Commit Scheduling**

```bash
git add packages/modules/src/scheduling/contract.ts packages/modules/src/scheduling/scheduler-service.ts packages/modules/src/scheduling/scheduler-service.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): add stateless scheduler service"
```

## Task 14: Implement the Exhaustive Cross-Owner Effect Router

**Files:**
- Create: `packages/modules/src/coordinator/effect-router.ts`
- Create: `packages/modules/src/coordinator/effect-router.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: all stateful owner capabilities, exact Story definitions, one candidate-state facade controlled by the coordinator, and `effectIntentOwnerByKindV1`.
- Produces: `routeEffectBatchV1(effects, context)` that validates the whole batch first, then applies owner proposals in authored order to the candidate only. It cannot commit, recurse into dispatch, or touch RNG.

- [ ] **Step 1: Write failing rollback and authored-order tests**

```ts
// packages/modules/src/coordinator/effect-router.test.ts
import { describe, expect, it } from "vitest";
import { routeEffectBatchV1 } from "./effect-router.js";

describe("routeEffectBatchV1", () => {
  it("applies effects in authored order so later proposals see earlier candidate state", () => {
    const candidate = buildCandidateFacadeV1();
    const result = routeEffectBatchV1([
      { kind: "inventory.grant", lines: [{ ingredientId: "ingredient.e2e_grain", quantity: 1 }], source: { kind: "story_action", actionId: "action.e2e_branch" }, reasonId: "reason.e2e_reward" },
      { kind: "inventory.consume", lines: [{ ingredientId: "ingredient.e2e_grain", quantity: 1 }], reasonId: "reason.e2e_consume" },
      { kind: "fact.set", factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_left" }, reasonId: "reason.e2e_branch" },
    ], candidate.effectContext());
    expect(result.kind).toBe("applied");
    expect(candidate.readInventory().ingredientBatches).toEqual([]);
    expect(candidate.readProgression().facts[0].value).toEqual({ kind: "token", value: "branch.e2e_left" });
  });

  it("restores every owner slice when a later effect rejects", () => {
    const candidate = buildCandidateFacadeV1();
    const before = candidate.snapshotState();
    const result = routeEffectBatchV1([
      { kind: "reputation.adjust", delta: 1, reasonId: "reason.e2e_reward" },
      { kind: "inventory.consume", lines: [{ ingredientId: "ingredient.e2e_missing", quantity: 1 }], reasonId: "reason.e2e_consume" },
    ], candidate.effectContext());
    expect(result.kind).toBe("rejected");
    expect(candidate.snapshotState()).toEqual(before);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/effect-router.test.ts`

Expected: FAIL with missing router.

- [ ] **Step 3: Implement exhaustive dispatch with a `never` guard**

```ts
// packages/modules/src/coordinator/effect-router.ts
export function routeOneEffectV1(
  effect: Readonly<EffectIntentV1>,
  context: EffectRouterContextV1,
): EffectRouteResultV1 {
  switch (effect.kind) {
    case "calendar.ap.adjust": return context.calendar.adjustAp(effect);
    case "reputation.adjust": return context.tavern.adjustReputation(effect);
    case "actor.stamina.adjust": return context.actors.adjustStamina(effect);
    case "actor.mood.adjust": return context.actors.adjustMood(effect);
    case "relationship.affection.adjust": return context.actors.adjustAffection(effect);
    case "relationship.teamwork.adjust": return context.actors.adjustTeamwork(effect);
    case "relationship.stage.set": return context.actors.setRelationshipStage(effect);
    case "tavern.helper.set": return context.tavern.setHelper(effect);
    case "inventory.grant": return context.inventory.grantIngredients(effect);
    case "inventory.consume": return context.inventory.consumeIngredients(effect);
    case "inventory.item.grant": return context.inventory.grantItems(effect);
    case "inventory.item.consume": return context.inventory.consumeItems(effect);
    case "aura.apply": return context.status.applyAura(effect);
    case "aura.clear": return context.status.clearAura(effect);
    case "fact.set": return context.progression.setFact(effect);
    case "quest.set": return context.progression.setQuest(effect);
    case "outcome.set": return context.progression.setOutcome(effect);
    case "modifier.add": return context.workflow.addOpeningModifier(effect);
    case "ledger.append": return context.inventory.appendLedger(effect);
    default: return assertNeverEffectV1(effect);
  }
}

function assertNeverEffectV1(effect: never): never {
  throw new Error(`unhandled effect kind: ${JSON.stringify(effect)}`);
}
```

`routeEffectBatchV1` first parses every effect, validates stable references and provenance for the full array, snapshots the candidate facade, routes each effect in authored order, and restores that snapshot on the first rejection/fault. It returns ordered owner facts only after the complete batch succeeds.

- [ ] **Step 4: Run router tests and exhaustive typecheck**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/effect-router.test.ts && pnpm typecheck`

Expected: PASS; batch rollback and authored-order tests pass; removing any switch branch makes TypeScript fail at `assertNeverEffectV1`.

- [ ] **Step 5: Commit the router**

```bash
git add packages/modules/src/coordinator/effect-router.ts packages/modules/src/coordinator/effect-router.test.ts packages/modules/src/index.ts
git commit -m "feat(modules): route cross-owner effects atomically"
```

## Task 15: Implement the Candidate Transaction and Core Command Coordinator

**Files:**
- Create: `packages/modules/src/coordinator/candidate.ts`
- Create: `packages/modules/src/coordinator/command-coordinator.ts`
- Create: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Modify: `packages/modules/src/profile/types.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: every stateful owner, World/Scheduling services, Base transactional RNG, `CommandExecutionAttemptEnvelopeV1`, and one immutable `DemoSimulationProgramV1` supplied to the builder.
- Produces: `createDemoCommandCoordinatorV1(program)` and the one `DemoCommandCoordinatorV1.executeAttempt` implementation. The builder closes rules/data/Narrative for queries; each execution receives only branded identity context and owns candidate state/RNG, guard ordering, proposals, facts, invariants, sequence, and diagnostics.

- [ ] **Step 1: Write failing atomicity and same-attempt diagnostics tests**

```ts
// packages/modules/src/coordinator/command-coordinator.test.ts
import { describe, expect, it } from "vitest";
import { createDemoCommandCoordinatorV1 } from "./command-coordinator.js";
import { buildE2eExecutionContextV1, buildSequenceZeroSnapshotV1 } from "../testing/builders.js";

describe("DemoCommandCoordinatorV1", () => {
  it("commits run.start once with demand, Narrative, RNG trace, and sequence 1", () => {
    const coordinator = createDemoCommandCoordinatorV1(buildModuleContractProgramV1());
    const snapshot = buildSequenceZeroSnapshotV1();
    const attempt = coordinator.executeAttempt(snapshot, { kind: "run.start" }, buildE2eExecutionContextV1());
    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") throw new Error("expected commit");
    expect(attempt.result.snapshot.commandSequence).toBe(1);
    expect(attempt.result.snapshot.state.simulation.tavern.demandSeeds).not.toEqual([]);
    expect(attempt.result.snapshot.state.story.narrative.source).toEqual({ kind: "manifest_start" });
    expect(attempt.result.facts.filter((fact) => fact.kind === "run.started")).toEqual([{
      kind: "run.started",
      runId: snapshot.state.simulation.run.runId,
      initialSeed: snapshot.state.simulation.run.initialSeed,
      demandSeeds: attempt.result.snapshot.state.simulation.tavern.demandSeeds,
    }]);
    expect(attempt.diagnostics.attemptedDraws).toHaveLength(1);
    expect(attempt.diagnostics.committedRngAfter).toEqual(attempt.result.snapshot.rng);
  });

  it("returns the exact input Snapshot on rejection", () => {
    const coordinator = createDemoCommandCoordinatorV1(buildModuleContractProgramV1());
    const snapshot = buildSequenceZeroSnapshotV1();
    const attempt = coordinator.executeAttempt(snapshot, { kind: "actor.rest" }, buildE2eExecutionContextV1());
    expect(attempt.result.kind).toBe("rejected");
    expect(attempt.result.snapshot).toBe(snapshot);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts`

Expected: FAIL with missing coordinator/candidate helpers.

- [ ] **Step 3: Implement the isolated candidate holder**

```ts
// packages/modules/src/coordinator/candidate.ts
export class DemoCandidateV1 {
  readonly #committed: GameSnapshotV1;
  #state: GameStateV1;
  readonly rng: TransactionRngV1;
  readonly facts: DomainFactV1[] = [];

  constructor(snapshot: Readonly<GameSnapshotV1>) {
    this.#committed = snapshot as GameSnapshotV1;
    this.#state = structuredClone(snapshot.state);
    this.rng = createTransactionRngV1(snapshot.rng);
  }

  readState(): DeepReadonly<GameStateV1> {
    return this.#state;
  }

  replaceState(next: GameStateV1): void {
    this.#state = next;
  }

  appendFacts(facts: readonly DomainFactV1[]): void {
    this.facts.push(...facts);
  }

  commit(): GameSnapshotV1 {
    return Object.freeze({
      state: deepFreeze(this.#state),
      rng: this.rng.currentState(),
      commandSequence: this.#committed.commandSequence + 1,
    });
  }

  diagnostics(committedRngAfter: RngStateV1): CommandExecutionDiagnosticsV1 {
    return {
      committedRngBefore: this.#committed.rng,
      attemptedDraws: this.rng.draws(),
      candidateRngAfter: this.rng.currentState(),
      committedRngAfter,
    };
  }
}
```

`structuredClone` here operates only on already validated Strict JSON state. Use the Phase 1 deep-freeze utility on commit. No candidate method is exported through package public exports.

- [ ] **Step 4: Implement guard order and the first command handlers**

```ts
// packages/modules/src/coordinator/command-coordinator.ts
function guardCommandV1(snapshot: Readonly<GameSnapshotV1>, command: Readonly<GameCommandV1>): RejectionReasonV1 | null {
  const { run, activeWorkflow } = snapshot.state.simulation;
  const narrative = snapshot.state.story.narrative;
  if (command.kind === "run.start" && snapshot.state.simulation.tavern.demandSeeds.length !== 0) {
    return { code: "run.already_started", details: { commandSequence: snapshot.commandSequence } };
  }
  if (command.kind !== "run.start" && snapshot.state.simulation.tavern.demandSeeds.length === 0) {
    return { code: "run.not_started", details: { commandKind: command.kind } };
  }
  if (narrative.status === "active" && !command.kind.startsWith("narrative.")) {
    return { code: "command.blocked_by_narrative", details: { commandKind: command.kind, cursor: narrative.cursor! } };
  }
  if (run.status === "setup" && snapshot.state.simulation.calendar.lifePolicyId === null && command.kind !== "policy.choose" && !command.kind.startsWith("narrative.")) {
    return { code: "run.policy_required", details: { commandKind: command.kind } };
  }
  if (activeWorkflow !== null && !workflowAllowsV1(activeWorkflow, command.kind)) {
    return { code: "command.blocked_by_workflow", details: { commandKind: command.kind, blocker: workflowBlockerV1(activeWorkflow) } };
  }
  return null;
}
```

Implement handlers for `run.start`, `policy.choose`, `inventory.buy`, `actor.prepare_food`, `actor.rest`, `facility.choose`, and `tavern.plan.set`. Each handler builds owner operations, applies proposals to the candidate, appends proposal facts in mutation order, then calls the shared Scheduler/automatic-Narrative loop where applicable. `run.start` resolves all demand seeds once, materializes D1 demand, appends exactly one `{ kind: "run.started", runId, initialSeed, demandSeeds }` fact after the demand proposal facts, begins the manifest scene, and activates no hidden policy.

- [ ] **Step 5: Return committed/rejected/faulted attempts from one execution**

```ts
function rejectAttemptV1(snapshot: GameSnapshotV1, rejection: RejectionReasonV1): CommandExecutionAttemptV1 {
  return {
    result: { kind: "rejected", snapshot, reasons: [rejection] },
    diagnostics: {
      committedRngBefore: snapshot.rng,
      attemptedDraws: [],
      committedRngAfter: snapshot.rng,
    },
  };
}

function commitAttemptV1(candidate: DemoCandidateV1): CommandExecutionAttemptV1 {
  const snapshot = candidate.commit();
  return {
    result: { kind: "committed", snapshot, facts: candidate.facts },
    diagnostics: candidate.diagnostics(snapshot.rng),
  };
}
```

Normalize thrown rule errors, invalid thenables, invalid outputs, effect errors, handler errors, and invariant errors to the exact stable `EngineFaultV1` union. Fault attempts keep the input Snapshot but include attempted draws/candidate RNG evidence from the same candidate.

- [ ] **Step 6: Run the focused coordinator tests**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts`

Expected: PASS for sequence-zero Start, guard order, same-object rejection, purchase/prepare/rest/facility/plan success, and cross-owner rollback.

- [ ] **Step 7: Commit the transaction/coordinator core**

```bash
git add packages/modules/src/coordinator/candidate.ts packages/modules/src/coordinator/command-coordinator.ts packages/modules/src/coordinator/command-coordinator.test.ts packages/modules/src/profile/types.ts packages/modules/src/index.ts
git commit -m "feat(modules): coordinate core commands atomically"
```

## Task 16A: Complete Narrative Commands and Automatic-Node Arbitration

**Files:**
- Modify: `packages/modules/src/coordinator/command-coordinator.ts`
- Modify: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Modify: `packages/modules/src/testing/builders.ts`

**Interfaces:**
- Consumes: Task 15 candidate/guard machinery, Narrative owner/interpreter, Scheduler service, effect router, Story checks, and the transaction RNG.
- Produces: complete `narrative.advance`/`narrative.choose` handling plus `runAutomaticNarrativeV1(candidate, context)`, which stops only at a presentation/choice/completion boundary and arbitrates at most one blocking request.

- [ ] **Step 1: Add failing stale-cursor, automatic-effect, check, and blocking-conflict tests**

Build all cursors and stable IDs with `testing/builders.ts`. Assert a stale `SceneId`/`NodeId` returns the typed rejection with the exact input Snapshot; an effect node changes Progression exactly once; a check node records one result and the same-attempt RNG trace; two simultaneous blocking requests fault with `narrative.blocking_conflict` and roll back state/RNG/facts/sequence.

- [ ] **Step 2: Run and observe the missing Narrative handlers**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "Narrative orchestration"`

Expected: FAIL with `command.handler_not_implemented` for the Narrative commands.

- [ ] **Step 3: Implement the total automatic loop**

Loop `readNarrativeDirectiveV1` until `present`, `choose`, or `complete`. Route `apply_effects`; evaluate conditions against current candidate read ports; call Story check rules with transactional RNG and persist the result before routing its band effects; enqueue `story.explicit` before moving past a checkpoint; and apply `call`, `return`, and `move` only through Narrative owner proposals. Count every automatic directive and call depth against the branded configured limits. Gather base-command and Scheduler blocking requests, accept zero or one, and return the stable fault when more than one exists.

- [ ] **Step 4: Run focused and current repository gates**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "Narrative orchestration" && pnpm typecheck && pnpm verify`

Expected: PASS; all prior coordinator tests remain green and verification changes no tracked file.

- [ ] **Step 5: Commit Narrative orchestration only**

```bash
git add packages/modules/src/coordinator/command-coordinator.ts packages/modules/src/coordinator/command-coordinator.test.ts packages/modules/src/testing/builders.ts
git commit -m "feat(modules): coordinate narrative commands"
```

## Task 16B: Complete the Interruptible Opening Transaction

**Files:**
- Modify: `packages/modules/src/coordinator/command-coordinator.ts`
- Modify: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Modify: `packages/modules/src/testing/builders.ts`

**Interfaces:**
- Consumes: Task 16A automatic Narrative loop, Tavern rules, Calendar/Actors/Inventory/Tavern/Workflow/Status owners, Scheduler, and the effect router.
- Produces: complete `tavern.opening.start`, `.continue`, and `.finalize` handlers with one frozen baseline and one settlement.

- [ ] **Step 1: Add the failing start/interruption/continue/finalize vector**

Use `buildOpeningReadySnapshotV1()` and branded `e2eIdsV1.eventOpeningInterrupt`. Assert Start freezes costs and enters `middle`; strict JSON round-trip preserves the blocking Scene and baseline; draining Narrative plus Continue does not reapply costs; Finalize appends one service history/ledger settlement and clears Workflow. Add shortage and settlement-fault rollback vectors.

- [ ] **Step 2: Run and observe the missing Opening handler**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "Opening transaction"`

Expected: FAIL with `command.handler_not_implemented` for `tavern.opening.start`.

- [ ] **Step 3: Implement the three exact checkpoints and owner order**

Start performs preview/shortage guards before proposals, then Calendar, Actors, Inventory, and Workflow owner proposals in that order; it freezes `OpeningBaseline` and processes `opening.started`/`opening.middle` until one block or `ready_to_finalize`. Continue requires completed Narrative plus a cleared blocking event and advances exactly one checkpoint. Finalize calls `tavern.settle` once, routes settlement/ledger effects, ticks opening Auras, appends history, clears Workflow, and marks evening resolved. No helper may call the settle rule twice for logging or preview.

- [ ] **Step 4: Run focused/type/full-current gates**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "Opening transaction" && pnpm typecheck && pnpm verify`

Expected: PASS; start/continue/finalize success and rollback vectors pass and all earlier work stays green.

- [ ] **Step 5: Commit Opening only**

```bash
git add packages/modules/src/coordinator/command-coordinator.ts packages/modules/src/coordinator/command-coordinator.test.ts packages/modules/src/testing/builders.ts
git commit -m "feat(modules): coordinate interruptible opening"
```

## Task 16C: Complete WorldAction, Scheduling, and Calendar Boundaries

**Files:**
- Modify: `packages/modules/src/coordinator/command-coordinator.ts`
- Modify: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Modify: `packages/modules/src/testing/builders.ts`

**Interfaces:**
- Consumes: World/Scheduling services, Narrative loop, all boundary owners, Story check rules, and candidate RNG.
- Produces: `world.action.begin`, `world.action.complete`, and `calendar.advance_phase`, including planned/emergency closure, two-stage WorldAction, spoilage/Aura/recovery/reset/demand order, and Scheduler contexts.

- [ ] **Step 1: Add failing WorldAction and ordinary-boundary tests**

Assert Begin deducts first-step costs once and starts the departure Scene; phase advance reaches the authored second step; Complete deducts second-step AP, persists one check, applies Inventory/Fact/Outcome effects once, and clears Workflow. Add planned closure, emergency closure, spoilage, Aura expiry, night recovery, next-day demand, Scheduler conflict rollback, and levy-due advance rejection tests. All IDs and resources come from branded builders.

- [ ] **Step 2: Run and observe missing World/Calendar handlers**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "World and calendar orchestration"`

Expected: FAIL with `command.handler_not_implemented` for `world.action.begin` or `calendar.advance_phase`.

- [ ] **Step 3: Implement exact phase-boundary order**

Use this immutable order: Inventory spoilage, phase-end Auras, day-end Auras, Actors recovery, night-recovery Auras, Tavern reset/demand materialization, then Calendar advance. WorldAction replaces only the authored boundary portions stated by its progress state; it never bypasses the shared boundary helper or resolves a check more than once.

- [ ] **Step 4: Run focused/type/full-current gates**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "World and calendar orchestration" && pnpm typecheck && pnpm verify`

Expected: PASS; WorldAction and ordinary Calendar vectors are deterministic and all earlier gates stay green.

- [ ] **Step 5: Commit World/Calendar orchestration only**

```bash
git add packages/modules/src/coordinator/command-coordinator.ts packages/modules/src/coordinator/command-coordinator.test.ts packages/modules/src/testing/builders.ts
git commit -m "feat(modules): coordinate world and calendar workflows"
```

## Task 16D: Complete Levy and Terminal Ending Materialization

**Files:**
- Modify: `packages/modules/src/coordinator/command-coordinator.ts`
- Modify: `packages/modules/src/coordinator/command-coordinator.test.ts`
- Modify: `packages/modules/src/testing/builders.ts`

**Interfaces:**
- Consumes: Inventory levy resolution, Story ending rules, Progression effects, Run completion owner, and Task 16C levy-due gate.
- Produces: the last unimplemented command, `levy.pay`, with paid/arrears terminal states and no post-terminal action path.

- [ ] **Step 1: Add paid, arrears, fault rollback, and terminal-lock tests**

Use branded `Money`, `EndingId`, `OutcomeId`, `ReasonId`, and sequence builders. Assert paid and arrears paths end at D7 afternoon, persist one `RunCompletionV1`, and return the same completion through queries; any ending-rule/schema failure restores cash, progression, Run, RNG, facts, and sequence; every later gameplay command is rejected as terminal.

- [ ] **Step 2: Run and observe the final missing handler**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts -t "Levy and ending"`

Expected: FAIL with `command.handler_not_implemented` for `levy.pay`.

- [ ] **Step 3: Implement one atomic levy-to-ending flow**

Ask Inventory for paid/arrears resolution, call `endings.evaluate` once, route only its declared Progression effects, then ask Run to materialize the exact same status/ending/summary. Validate owner and aggregate invariants before committing. Delete the temporary `command.handler_not_implemented` fallback only after an exhaustive `never` switch proves all seventeen command variants are handled.

- [ ] **Step 4: Run exhaustive command/type/current gates**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/command-coordinator.test.ts && pnpm typecheck && pnpm verify`

Expected: PASS; all seventeen commands have success, typed rejection, and applicable fault vectors; the fallback string is absent from production code; prior Phase 1 work remains green.

- [ ] **Step 5: Commit levy/ending only**

```bash
git add packages/modules/src/coordinator/command-coordinator.ts packages/modules/src/coordinator/command-coordinator.test.ts packages/modules/src/testing/builders.ts
git commit -m "feat(modules): materialize levy endings"
```

## Task 17: Assemble Strict Aggregate Schemas and the Public Module Surface

**Files:**
- Create: `packages/modules/src/profile/schemas.ts`
- Create: `packages/modules/type-tests/public-exports.test-d.ts`
- Modify: `packages/modules/src/profile/types.ts`
- Modify: `packages/modules/src/profile/profile-contract.test.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: the Task 1 type spine plus every owner/service Schema and binding.
- Produces: strict aggregate state/command/fact/rejection/fault/debug Schemas, concrete `DebugCommandOperationResultForV1<C>`, and public exports for each individual binding. It deliberately does not create a Module tuple, Profile, coordinator instance, or Story-specific program.

- [ ] **Step 1: Add failing aggregate ownership and strict-schema tests**

```ts
// append to packages/modules/src/profile/profile-contract.test.ts
import { gameCommandV1Schema, gameStateV1Schema } from "./schemas.js";
import {
  actorsModuleV1,
  calendarModuleV1,
  facilitiesModuleV1,
  inventoryModuleV1,
  narrativeModuleV1,
  progressionModuleV1,
  runModuleV1,
  schedulingModuleV1,
  statusModuleV1,
  tavernModuleV1,
  workflowModuleV1,
  worldModuleV1,
} from "../index.js";

it("exports ten stateful and two stateless profile-bound bindings", () => {
  const bindings = [
    runModuleV1, calendarModuleV1, actorsModuleV1, statusModuleV1,
    inventoryModuleV1, facilitiesModuleV1, tavernModuleV1, workflowModuleV1,
    worldModuleV1, progressionModuleV1, narrativeModuleV1, schedulingModuleV1,
  ] as const;
  expect(bindings.map((module) => module.descriptor.id)).toEqual([
    "module.run", "module.calendar", "module.actors", "module.status",
    "module.inventory", "module.facilities", "module.tavern", "module.workflow",
    "module.world", "module.progression", "module.narrative", "module.scheduling",
  ]);
  expect(bindings.filter((module) => module.bindingKind === "stateful")).toHaveLength(10);
  expect(bindings.filter((module) => module.bindingKind === "stateless")).toHaveLength(2);
});

it("rejects unknown keys at aggregate boundaries", () => {
  expect(() => gameCommandV1Schema.parse({ kind: "actor.rest", extra: true })).toThrow();
  const state = buildInitialGameStateV1();
  expect(() => gameStateV1Schema.parse({ ...state, extra: true })).toThrow();
});

```

- [ ] **Step 2: Run and verify aggregate files are missing**

Run: `pnpm --filter @project-tavern/modules test -- src/profile/profile-contract.test.ts`

Expected: FAIL with missing `schemas.js` and missing aggregate public exports.

- [ ] **Step 3: Assemble schemas from owner-owned pieces**

```ts
// packages/modules/src/profile/schemas.ts
export const demoSimulationStateV1Schema = z.strictObject({
  run: runStateV1Schema,
  calendar: calendarStateV1Schema,
  actors: actorsStateV1Schema,
  inventory: inventoryStateV1Schema,
  status: statusStateV1Schema,
  facilities: facilitiesStateV1Schema,
  tavern: tavernStateV1Schema,
  activeWorkflow: activeWorkflowV1Schema.nullable(),
});

export const storyRuntimeStateV1Schema = z.strictObject({
  facts: z.array(factEntryV1Schema),
  quests: z.array(questEntryV1Schema),
  outcomes: z.array(outcomeEntryV1Schema),
  resolvedChecks: z.array(resolvedCheckV1Schema),
  narrative: narrativeRuntimeStateV1Schema,
});

export const gameStateV1Schema = z.strictObject({
  simulation: demoSimulationStateV1Schema,
  story: storyRuntimeStateV1Schema,
});
```

Build `gameCommandV1Schema` as the exact seventeen-variant discriminated union. Aggregate fact/rejection/debug unions from module-owned schemas plus the strict coordinator-produced `run.started`, scheduler, opening, service, WorldAction, Narrative, and levy fact variants. Do not widen any branch with `z.unknown`, `z.record`, passthrough, optional `undefined`, or arbitrary strings.

- [ ] **Step 4: Publish only the closed Modules API**

`packages/modules/src/index.ts` exports every individual `*ModuleV1`, the aggregate Schemas, branded contract types, concrete `DebugCommandOperationResultForV1<C>`, `createDemoCommandCoordinatorV1`, `createDemoQueriesV1`, and `projectDemoGameViewV1`. It has no exported array/tuple, `defineGameProfile` call, `GameProfileV1` value, Story identity, Story rules/data, or GamePackage. `packages/modules/type-tests/public-exports.test-d.ts` consumes all twelve bindings plus the DebugCommand result specialization with the single Task 1 phantom type, rejects an unbound/foreign binding, and contains a consumed `@ts-expect-error` import for a nonexistent `demoGameProfileV1` export; this file is typechecked but never loaded by Vitest.

- [ ] **Step 5: Run profile contract, boundary, cycle, and type gates**

Run: `pnpm --filter @project-tavern/modules test -- src/profile/profile-contract.test.ts && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck`

Expected: PASS; twelve exact profile-bound exports, ten stateful owners, two null-owner stateless services, empty dependency edges, strict aggregate Schemas, no cycles, and no Modules-owned Profile/tuple.

- [ ] **Step 6: Commit aggregate Profile**

```bash
git add packages/modules/src/profile/schemas.ts packages/modules/src/profile/types.ts packages/modules/src/profile/profile-contract.test.ts packages/modules/type-tests/public-exports.test-d.ts packages/modules/src/index.ts
git commit -m "feat(modules): publish strict gameplay contracts"
```

## Task 18: Implement Queries, Preview/Execute Parity, and the Game View Projection

**Files:**
- Create: `packages/modules/src/coordinator/queries.ts`
- Create: `packages/modules/src/coordinator/queries.test.ts`
- Modify: `packages/modules/src/profile/types.ts`
- Modify: `packages/modules/src/index.ts`

**Interfaces:**
- Consumes: immutable Snapshot, `DemoSimulationProgramV1`, and the same guard/calculator functions used by command execution.
- Produces: `createDemoQueriesV1(snapshot, program)`, `projectDemoGameViewV1(state, queries)`, `EngineQueriesV1`, and `DemoRuntimeGameViewV1`; no query consumes RNG, invokes a mutating owner, or exposes actual hidden demand. Task 19 closes one program into the Story-owned coordinator/Profile.

- [ ] **Step 1: Write failing parity and hidden-information tests**

```ts
// packages/modules/src/coordinator/queries.test.ts
import { describe, expect, it } from "vitest";
import { createDemoQueriesV1 } from "./queries.js";

describe("EngineQueriesV1", () => {
  it("returns the exact command value in every preview", () => {
    const command = { kind: "inventory.buy", lines: [{ ingredientId: "ingredient.e2e_grain", quantity: 2 }] } as const;
    const preview = createDemoQueriesV1(buildActiveSnapshotV1(), buildE2eExecutionContextV1()).previewCommand(command);
    expect(preview.command).toEqual(command);
  });

  it("hides actual demand and random offsets", () => {
    const forecast = createDemoQueriesV1(buildActiveSnapshotV1(), buildE2eExecutionContextV1()).getDemandForecast();
    expect(forecast).toEqual({
      day: 1,
      lines: [{ segmentId: "segment.e2e_guests", range: { min: 2, max: 2 }, modifiers: [] }],
    });
    expect(JSON.stringify(forecast)).not.toContain("actualCustomers");
    expect(JSON.stringify(forecast)).not.toContain("randomOffset");
  });

  it("matches execution rejection codes", () => {
    const snapshot = buildInsufficientOpeningSnapshotV1();
    const context = buildE2eExecutionContextV1();
    const preview = createDemoQueriesV1(snapshot, context).previewCommand({ kind: "tavern.opening.start" });
    const attempt = createDemoCommandCoordinatorV1(buildModuleContractProgramV1()).executeAttempt(
      snapshot,
      { kind: "tavern.opening.start" },
      context,
    );
    expect(preview.allowed).toBe(false);
    expect(attempt.result.kind).toBe("rejected");
    if (preview.allowed || attempt.result.kind !== "rejected") throw new Error("expected matching rejection");
    expect(preview.reasons.map((reason) => reason.code)).toEqual(attempt.result.reasons.map((reason) => reason.code));
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/queries.test.ts`

Expected: FAIL with missing query implementation.

- [ ] **Step 3: Implement queries by calling shared pure calculators**

```ts
// packages/modules/src/coordinator/queries.ts
export function createDemoQueriesV1(
  snapshot: DeepReadonly<GameSnapshotV1>,
  program: DeepReadonly<DemoSimulationProgramV1>,
): EngineQueriesV1 {
  return Object.freeze({
    getAvailableActions: () => projectAvailableActionsV1(snapshot, context),
    explainAvailability: (actionId) => explainAvailabilityV1(snapshot, actionId, context),
    previewCommand: (command) => previewCommandV1(snapshot, command, context),
    previewTavernPlan: (plan) => previewTavernPlanV1(snapshot, plan, context),
    getNarrativeProjection: () => projectNarrativeV1(snapshot, context),
    getRunStartControl: () => projectRunStartControlV1(snapshot, context),
    getLifePolicySelection: () => projectLifePolicySelectionV1(snapshot, context),
    getTavernOpeningControl: () => projectOpeningControlV1(snapshot, context),
    getDemandForecast: () => projectDemandForecastV1(snapshot),
    getObligationForecast: () => projectObligationForecastV1(snapshot, context),
    getResolvedChecks: () => snapshot.state.story.resolvedChecks,
    getRunCompletion: () => snapshot.state.simulation.run.completion,
  });
}
```

Every `previewCommand` branch uses the same global guard, Action availability, owner calculator, Story rule preview, and confirmation merge functions as execution. It must not normalize or replace the submitted command. `previewTavernPlan` distinguishes prospective current state from committed OpeningBaseline. Obligation forecast uses only authored policy and committed-plan lower bounds. `createDemoCommandCoordinatorV1(program)` closes the same immutable program for `createQueries`; `executeAttempt` validates that its branded `DemoExecutionContextV1.simulationDigest` matches that program before running a command.

- [ ] **Step 4: Project the immutable game view**

`DemoRuntimeGameViewV1` contains HUD values, Action views, run/policy/opening controls, Inventory/Tavern/Facility/Ledger projections, demand/obligation forecasts, resolved checks, and Run completion. It contains stable Text/Asset IDs but no strings, runtime paths, Story rules, raw Snapshot branches, or hidden demand.

Add tests for run-start/policy/opening control exact command equality, Action direct-command/null rules, confirmation source order, unavailable explanations, active-opening committed basis, all three obligation forecast kinds, and terminal completion.

- [ ] **Step 5: Run query and full Modules suites**

Run: `pnpm --filter @project-tavern/modules test -- src/coordinator/queries.test.ts && pnpm --filter @project-tavern/modules test`

Expected: PASS; all Module, coordinator, query, schema, deterministic-rule-vector, and property tests pass.

- [ ] **Step 6: Commit queries and projections**

```bash
git add packages/modules/src/coordinator/queries.ts packages/modules/src/coordinator/queries.test.ts packages/modules/src/profile/types.ts packages/modules/src/index.ts
git commit -m "feat(modules): expose deterministic game queries"
```

## Task 19: Define the Independent Minimal E2E Story Package

**Files:**
- Modify: `stories/e2e/package.json`
- Modify: `stories/e2e/tsconfig.json`
- Create: `stories/e2e/LICENSE.md`
- Create: `stories/e2e/src/simulation/identity.ts`
- Create: `stories/e2e/src/simulation/ids.ts`
- Create: `stories/e2e/src/simulation/data.ts`
- Create: `stories/e2e/src/simulation/rules.ts`
- Create: `stories/e2e/src/patch-surfaces.ts`
- Create: `stories/e2e/src/presentation/text-catalogs.ts`
- Create: `stories/e2e/src/presentation/assets.ts`
- Create: `stories/e2e/src/profile.ts`
- Create: `stories/e2e/src/story.ts`
- Modify: `stories/e2e/src/index.ts`
- Create: `stories/e2e/src/test/story-contract.test.ts`
- Modify: `scripts/verify-stories.mjs`
- Modify: `scripts/verify-stories.test.mjs`
- Modify: `scripts/workspace-policy.mjs`
- Modify: `scripts/verify-licensing.mjs`
- Modify: `scripts/verify-licensing.test.mjs`

**Interfaces:**
- Consumes: public Base authoring helpers, twelve individual public Module bindings/Schemas/coordinator/query builders, Base/UI presentation contracts, and code-native asset fallback types.
- Produces: the first real twelve-binding `GameProfileV1`, side-effect-free `@project-tavern/story-e2e` default GamePackage, fixed branded identity/revision, deterministic rules/data, typed Patch Surfaces, complete `zh-CN` catalog, and fallback-only assets. It does not expose development fixtures yet.

- [ ] **Step 1: Write the failing independent-Story contract test**

```ts
// stories/e2e/src/test/story-contract.test.ts
import { describe, expect, it } from "vitest";
import { validateStoryV1 } from "@project-tavern/base/testkit";
import { e2eStoryEntryV1 } from "../index.js";

describe("story.e2e_001", () => {
  it("defines an independent all-real-module Story", () => {
    expect(e2eStoryEntryV1.identity).toEqual({ id: "story.e2e_001", revision: 1 });
    const definition = e2eStoryEntryV1.define();
    expect(definition.simulation.profile.modules.map((module) => module.descriptor.id)).toEqual([
      "module.run", "module.calendar", "module.actors", "module.status",
      "module.inventory", "module.facilities", "module.tavern", "module.workflow",
      "module.world", "module.progression", "module.narrative", "module.scheduling",
    ]);
    expect(validateStoryV1(e2eStoryEntryV1)).toEqual({ ok: true });
  });

  it("ships no runtime image provider", () => {
    const definition = e2eStoryEntryV1.define();
    expect(definition.presentation.assetPacks).toEqual([]);
    expect(definition.presentation.assetSlots.every((slot) => slot.fallbackToken.startsWith("fallback.e2e_"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify the Story entry is absent**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/story-contract.test.ts`

Expected: FAIL with missing `../index.js`.

- [ ] **Step 3: Freeze package metadata and public exports**

```json
// stories/e2e/package.json
{
  "name": "@project-tavern/story-e2e",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "license": "SEE LICENSE IN LICENSE.md",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@project-tavern/base": "workspace:*",
    "@project-tavern/modules": "workspace:*",
    "@project-tavern/ui": "workspace:*",
    "@project-tavern/assets": "workspace:*"
  }
}
```

`stories/e2e/LICENSE.md` assigns TypeScript implementation/tests/scripts to PolyForm Noncommercial and assigns `src/presentation/text-catalogs.ts` plus later `src/simulation/narrative.ts` to CC BY-NC-SA 4.0, linking the exact root legal texts. In the same step, update `workspace-policy.mjs` and licensing verifier tests from the Phase 1 single PolyForm package declaration to `SEE LICENSE IN LICENSE.md`; assert the scope file exists and names both licenses. This package metadata/scope/policy change must pass `pnpm verify:licensing` before the commit.

- [ ] **Step 4: Add exact minimal content and balance**

```ts
// stories/e2e/src/simulation/identity.ts
import { parseNonZeroUint32, parsePositiveSafeInteger, parseRunId } from "@project-tavern/base";
import { parseStoryId } from "@project-tavern/modules";

export const e2eStoryIdentityV1 = Object.freeze({
  id: parseStoryId("story.e2e_001"),
  revision: parsePositiveSafeInteger(1),
});
export const e2eStateContractRevisionV1 = parsePositiveSafeInteger(1);
export const e2eReferenceSeedV1 = parseNonZeroUint32(0x00023049);
export const e2eReferenceRunIdV1 = parseRunId("00000000-0000-4000-8000-00000000e2e0");
```

`simulation/ids.ts` calls the matching public Modules parser for every Policy/Action/Event/Checkpoint/Scene/Node/Choice/Fact/Outcome/Ingredient/Recipe/Facility/Aura/CustomerSegment/Check/CheckBand/Ending/Text/Asset/Reason/WorldStep/StoryToken/Character ID and exports one frozen `e2eIdsV1` registry. Only generic `RunId`, `NonZeroUint32`, and safe-integer values use Base parsers. Every command, state definition, Narrative node, rule result, ViewModel, and test fixture uses that registry; no `as ActionId`, `as string`, or raw-ID widening is allowed.

```ts
// stories/e2e/src/simulation/data.ts
export const e2eStoryDataV1: DemoStoryDataV1 = Object.freeze({
  dataRevision: 1,
  manifest: { titleTextId: e2eIdsV1.textTitle, initialSceneId: e2eIdsV1.sceneManifest, playableDays: parsePositiveSafeInteger(7) },
  stateDefinitions: {
    facts: [
      { factId: e2eIdsV1.factBranch, value: { kind: "token", defaultValue: e2eIdsV1.tokenBranchNone, allowedValues: [e2eIdsV1.tokenBranchNone, e2eIdsV1.tokenBranchLeft, e2eIdsV1.tokenBranchRight] } },
      { factId: e2eIdsV1.factWorld, value: { kind: "boolean", defaultValue: false } },
    ],
    quests: [],
    outcomes: [
      { outcomeId: e2eIdsV1.outcomeRelationship, value: { kind: "token", defaultValue: e2eIdsV1.tokenRelationshipPending, allowedValues: [e2eIdsV1.tokenRelationshipPending, e2eIdsV1.tokenRelationshipShared] } },
      { outcomeId: e2eIdsV1.outcomeInvestigation, value: { kind: "token", defaultValue: e2eIdsV1.tokenInvestigationPending, allowedValues: [e2eIdsV1.tokenInvestigationPending, e2eIdsV1.tokenInvestigationComplete] } },
    ],
  },
  initialState: e2eInitialStateV1,
  balance: e2eBalanceV1,
  content: e2eContentV1,
});
```

`e2eBalanceV1` contains one balanced policy (`2/2/2`, recovery 1), one service day (D1), one segment, one ingredient, one recipe, all four service modes, one facility, two Auras, levy amount 1 due D7 afternoon, menu/purchase/preparation limits of 1, narrative step limit 64, and call depth 4. Starting cash/stamina are 10; base D1 demand is exactly 2. IDs use only the `*.e2e_*` namespace.

- [ ] **Step 5: Add deterministic rules and typed Patch Surfaces**

```ts
// stories/e2e/src/simulation/rules.ts
export const e2eStoryRulesV1: StoryRulesV1 = Object.freeze({
  demand: {
    resolve: (input, rng) => ({
      lines: input.segments.map((line) => ({
        day: line.day,
        segmentId: line.segmentId,
        randomOffset: (rng.nextInt({ exclusiveMax: 1, purpose: `demand:${line.day}:${line.segmentId}` }) * 0) as 0,
      })),
    }),
    preview: (input) => ({
      day: input.day,
      lines: input.seeds.map((seed) => ({
        segmentId: seed.segmentId,
        range: { min: seed.baseCustomers, max: seed.baseCustomers },
        actualCustomers: seed.baseCustomers,
        modifiers: [],
      })),
    }),
  },
  tavern: { preview: previewE2eOpeningV1, settle: settleE2eOpeningV1 },
  checks: { describe: describeE2eCheckV1, resolve: resolveE2eCheckV1 },
  endings: { evaluate: evaluateE2eEndingV1 },
});
```

```ts
// stories/e2e/src/patch-surfaces.ts
export const e2eSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  "rule.tavern.settle": definePatchSlot({ kind: "rule", inputSchema: tavernSettlementInputV1Schema, outputSchema: settlementDraftV1Schema, value: e2eStoryRulesV1.tavern.settle }),
  "rule.checks.resolve": definePatchSlot({ kind: "rule", inputSchema: checkInputV1Schema, outputSchema: checkResultV1Schema, value: e2eStoryRulesV1.checks.resolve }),
  "value.balance": definePatchSlot({ kind: "value", valueSchema: storyBalanceV1Schema, value: e2eStoryDataV1.balance }),
});

export const e2ePresentationPatchSurfaceV1 = definePresentationPatchSurface({
  "text.catalogs": definePatchSlot({ kind: "text", valueSchema: textCatalogSetV1Schema, value: e2eTextCatalogsV1 }),
});
```

`stories/e2e/src/profile.ts` is the first place to construct the twelve-binding tuple. It defines one immutable `DemoSimulationProgramV1`, passes it to `createDemoCommandCoordinatorV1(program)`, and calls the curried Base authoring helper:

```ts
export function createE2eGameProfileV1(program: DeepReadonly<DemoSimulationProgramV1>) {
  const coordinator = createDemoCommandCoordinatorV1(program);
  return defineGameProfile<DemoProfileTypesV1>()({
    contractRevision: 1,
    modules: [
      runModuleV1, calendarModuleV1, actorsModuleV1, statusModuleV1,
      inventoryModuleV1, facilitiesModuleV1, tavernModuleV1, workflowModuleV1,
      worldModuleV1, progressionModuleV1, narrativeModuleV1, schedulingModuleV1,
    ] as const,
    stateSchema: gameStateV1Schema,
    commandSchema: gameCommandV1Schema,
    factSchema: domainFactV1Schema,
    rejectionSchema: rejectionReasonV1Schema,
    debugCommandSchema: debugCommandV1Schema,
    coordinator,
    createBootstrapInput: (entropy) => Object.freeze({
      rngSeed: entropy.nextNonZeroUint32(),
      runId: parseRunId(entropy.nextUuidV4()),
    }),
    createInitialState: (bootstrap) => createE2eInitialStateV1(bootstrap, program.data),
    projectView: (state) => projectDemoGameViewV1(state, program),
  });
}
```

`createE2eInitialStateV1` calls the ten stateful bindings' `createInitialState` functions and supplies only Story-owned definitions where required; it does not mutate an initialized slice. `DemoExecutionContextV1` contains only the resolved branded simulation digest used to reject mismatched execution; rule/data/Narrative functions remain in the coordinator closure. The contract test includes a type witness for the exact twelve-binding tuple and proves Host entropy is consumed once per bootstrap.

- [ ] **Step 6: Add complete text/fallback presentation and compose the entry**

`e2eTextCatalogsV1` has one canonical `zh-CN` catalog containing every declared TextId exactly once. `e2eAssetSlotsV1` contains `background.e2e_tavern` and `character.e2e_heroine_neutral`, both `code_fallback`, with no Asset Pack providers.

```ts
// stories/e2e/src/index.ts
import { defineGamePackage } from "@project-tavern/base";
import { e2eStoryIdentityV1 } from "./simulation/identity.js";
import { defineE2eStoryV1 } from "./story.js";

export const e2eStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: e2eStoryIdentityV1,
  define: defineE2eStoryV1,
});

export default e2eStoryEntryV1;
```

- [ ] **Step 7: Activate E2E in stable Story verification and prove generic test discovery**

Do not edit the future-proof Vitest config: prove `story-contract.test.ts` is discovered exactly once in `contract`. Extend `verify:stories` and its behavior tests so it validates Sandbox and the now-real E2E Story while still asserting Demo is deliberately non-startable. The verifier uses `scripts/collect-import-closure.mjs` for repository closure checks; it never imports a closure helper from Base/testkit.

- [ ] **Step 8: Run Story, licensing, discovery, and boundary checks**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/story-contract.test.ts && pnpm verify:stories && pnpm verify:licensing && pnpm test:contract && pnpm verify:boundaries && pnpm typecheck && pnpm verify`

Expected: PASS; Story validation reports no missing/duplicate IDs, references, catalogs, module edges, asset providers, or illegal imports; Sandbox and E2E both validate; Demo remains intentionally empty; mixed licensing and test discovery are green; verification changes no tracked file.

- [ ] **Step 9: Commit the independent Story definition and its atomic policy activation**

```bash
git add stories/e2e/package.json stories/e2e/tsconfig.json stories/e2e/LICENSE.md stories/e2e/src/index.ts stories/e2e/src/story.ts stories/e2e/src/profile.ts stories/e2e/src/simulation/identity.ts stories/e2e/src/simulation/ids.ts stories/e2e/src/simulation/data.ts stories/e2e/src/simulation/rules.ts stories/e2e/src/patch-surfaces.ts stories/e2e/src/presentation/text-catalogs.ts stories/e2e/src/presentation/assets.ts stories/e2e/src/test/story-contract.test.ts scripts/verify-stories.mjs scripts/verify-stories.test.mjs scripts/workspace-policy.mjs scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
git commit -m "feat(story-e2e): define independent module fixture story"
```

## Task 20: Add VN Branch/Rejoin and Story-Owned Scene Contributions

**Files:**
- Create: `stories/e2e/src/testing/session-harness.ts`
- Create: `stories/e2e/src/simulation/narrative.ts`
- Create: `stories/e2e/src/presentation/scene-graph.tsx`
- Create: `stories/e2e/src/test/branch-rejoin.integration.test.ts`
- Modify: `stories/e2e/src/simulation/data.ts`
- Modify: `stories/e2e/src/story.ts`
- Modify: `stories/e2e/src/presentation/text-catalogs.ts`

**Interfaces:**
- Consumes: Narrative interpreter/coordinator, Story state definitions, generic UI scene/contribution contracts, PresentationReadPort, and the resolved E2E simulation facet.
- Produces: a test-only command driver that mutates only through the real Profile coordinator, manifest VN, branch/rejoin VN, stable stage cues, Story-owned main menu/play scenes, and a headless integration test proving local divergence and convergence.

- [ ] **Step 1: Write the failing branch/rejoin integration test**

```ts
// stories/e2e/src/testing/session-harness.ts
export function createE2eSessionHarnessV1(): E2eSessionHarnessV1 {
  const definition = e2eStoryEntryV1.define();
  return E2eSessionHarnessV1.create({
    profile: definition.simulation.profile,
    context: createE2eExecutionContextV1(definition.simulation),
    bootstrap: { rngSeed: e2eReferenceSeedV1, runId: e2eReferenceRunIdV1 },
  });
}
```

`E2eSessionHarnessV1` stores one private committed Snapshot. `commit` invokes `profile.coordinator.executeAttempt` exactly once and adopts only a committed result; selectors call `profile.coordinator.createQueries`; convenience methods expand to public `GameCommandV1` values. It exposes no owner capability and never applies a proposal or rule directly.

```ts
// stories/e2e/src/test/branch-rejoin.integration.test.ts
import { describe, expect, it } from "vitest";
import { createE2eSessionHarnessV1 } from "../testing/session-harness.js";

describe("E2E branch/rejoin VN", () => {
  it.each([
    ["choice.e2e_left", "branch.e2e_left"],
    ["choice.e2e_right", "branch.e2e_right"],
  ] as const)("commits %s and rejoins the shared line", (choiceId, branchToken) => {
    const harness = createE2eSessionHarnessV1();
    harness.startAndChoosePolicy();
    harness.commit({ kind: "story.action.start", actionId: "action.e2e_branch" });
    const projection = harness.queries().getNarrativeProjection();
    harness.commit({ kind: "narrative.choose", sceneId: projection.cursor!.sceneId, nodeId: projection.cursor!.nodeId, choiceId });
    expect(harness.snapshot().state.story.facts).toContainEqual({ factId: "fact.e2e_branch", value: { kind: "token", value: branchToken } });
    expect(harness.queries().getNarrativeProjection().textId).toBe("text.e2e_shared_line");
    harness.commit({ kind: "narrative.advance" });
    expect(harness.snapshot().state.story.narrative.status).toBe("completed");
  });
});
```

- [ ] **Step 2: Run and verify missing scene/action failure**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/branch-rejoin.integration.test.ts`

Expected: FAIL with `command.unknown_reference` for `action.e2e_branch`.

- [ ] **Step 3: Define exact VN nodes and convergence**

```ts
// stories/e2e/src/simulation/narrative.ts
export const e2eBranchSceneV1: NarrativeSceneV1 = Object.freeze({
  sceneId: "scene.e2e_branch",
  entryNodeId: "node.e2e_branch_stage",
  nodes: [
    { kind: "stageCue", nodeId: "node.e2e_branch_stage", cue: { kind: "character.show", slot: "center", characterId: "character.e2e_heroine", poseAssetId: "character.e2e_heroine_neutral" }, nextNodeId: "node.e2e_branch_choice" },
    { kind: "choice", nodeId: "node.e2e_branch_choice", choices: [
      { choiceId: "choice.e2e_left", textId: "text.e2e_choice_left", showWhen: [], enableWhen: [], confirmation: emptyConfirmationV1, effects: [{ kind: "fact.set", factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_left" }, reasonId: "reason.e2e_branch" }], nextNodeId: "node.e2e_shared_line" },
      { choiceId: "choice.e2e_right", textId: "text.e2e_choice_right", showWhen: [], enableWhen: [], confirmation: emptyConfirmationV1, effects: [{ kind: "fact.set", factId: "fact.e2e_branch", value: { kind: "token", value: "branch.e2e_right" }, reasonId: "reason.e2e_branch" }], nextNodeId: "node.e2e_shared_line" },
    ] },
    { kind: "line", nodeId: "node.e2e_shared_line", speakerId: "character.e2e_heroine", textId: "text.e2e_shared_line", nextNodeId: "node.e2e_branch_end" },
    { kind: "end", nodeId: "node.e2e_branch_end" },
  ],
});
```

- [ ] **Step 4: Register Story-owned scenes without Snapshot access**

```tsx
// stories/e2e/src/presentation/scene-graph.tsx
export const e2eUiSceneGraphV1 = defineUiSceneGraph({
  initialSceneId: "ui_scene.e2e_main_menu",
  scenes: [
    defineUiScene({ id: "ui_scene.e2e_main_menu", select: (view) => view.runStart, renderer: E2eMainMenuScene }),
    defineUiScene({ id: "ui_scene.e2e_play", select: (view) => view, renderer: E2ePlayScene }),
    defineUiScene({ id: "ui_scene.e2e_summary", select: (view) => view.completion, renderer: E2eSummaryScene }),
  ],
});

function E2eMainMenuScene({ viewSlice, playerPort, presentation }: PlayerRendererContextV1<RunStartControlProjectionV1>) {
  const title = presentation.text("text.e2e_title");
  return <button type="button" onClick={() => playerPort.commands.dispatch(viewSlice.command)}>{title.text}</button>;
}
```

No renderer imports `GameSnapshotV1`, `EngineSessionV1`, owner capabilities, or the development entry.

- [ ] **Step 5: Run branch/rejoin, Story validation, and boundary tests**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/branch-rejoin.integration.test.ts src/test/story-contract.test.ts && pnpm verify:boundaries`

Expected: PASS for both branch tokens; both reach `text.e2e_shared_line`, then complete; Story scenes remain Player-safe.

- [ ] **Step 6: Commit VN and Story scene contributions**

```bash
git add stories/e2e/src/testing/session-harness.ts stories/e2e/src/simulation/narrative.ts stories/e2e/src/presentation/scene-graph.tsx stories/e2e/src/test/branch-rejoin.integration.test.ts stories/e2e/src/simulation/data.ts stories/e2e/src/story.ts stories/e2e/src/presentation/text-catalogs.ts
git commit -m "feat(story-e2e): prove vn branch and rejoin"
```

## Task 21: Prove an Opening Scheduler Interruption

**Files:**
- Create: `stories/e2e/src/test/opening-interruption.integration.test.ts`
- Modify: `stories/e2e/src/simulation/data.ts`
- Modify: `stories/e2e/src/simulation/narrative.ts`
- Modify: `stories/e2e/src/presentation/text-catalogs.ts`

**Interfaces:**
- Consumes: one D1 service, Opening checkpoints, Scheduler, Narrative, and the headless session harness.
- Produces: an `opening.middle` event with one blocking VN Scene and a deterministic command sequence that Phase 3 can persist/reload. Phase 2 proves the serializable interruption state and continuation semantics, not IndexedDB behavior.

- [ ] **Step 1: Write the failing interruption/resume test**

```ts
// stories/e2e/src/test/opening-interruption.integration.test.ts
import { describe, expect, it } from "vitest";
import { strictJsonRoundTripV1 } from "@project-tavern/base/testkit";
import { createE2eSessionHarnessV1 } from "../testing/session-harness.js";

describe("E2E opening interruption", () => {
  it("round-trips the interrupted Snapshot and continues without reapplying start costs", () => {
    const harness = createE2eSessionHarnessV1();
    harness.loadCommands(buildCommandsToOpeningStartV1());
    const interrupted = harness.commit({ kind: "tavern.opening.start" });
    expect(interrupted.state.simulation.activeWorkflow).toMatchObject({
      kind: "opening",
      checkpoint: "middle",
      blockingEvent: { eventId: "event.e2e_opening_interrupt", sceneId: "scene.e2e_opening_interrupt" },
    });
    const cashAfterStart = interrupted.state.simulation.inventory.cash;
    const restored = strictJsonRoundTripV1(interrupted);
    harness.anchorSnapshot(restored);
    harness.drainNarrative();
    harness.commit({ kind: "tavern.opening.continue" });
    expect(harness.snapshot().state.simulation.inventory.cash).toBe(cashAfterStart);
    harness.commit({ kind: "tavern.opening.finalize" });
    expect(harness.snapshot().state.simulation.activeWorkflow).toBeNull();
    expect(harness.snapshot().state.simulation.tavern.serviceHistory).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run and verify the event is absent**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/opening-interruption.integration.test.ts`

Expected: FAIL because Start reaches `ready_to_finalize` without `event.e2e_opening_interrupt`.

- [ ] **Step 3: Add the one blocking event and scene**

```ts
// append to stories/e2e/src/simulation/data.ts content.events
{
  eventId: "event.e2e_opening_interrupt",
  checkpointId: "checkpoint.e2e_opening_interrupt",
  trigger: { kind: "opening.middle" },
  priority: 100,
  weightedGroupId: null,
  weight: 0,
  when: [{ kind: "calendar.matches", day: 1, phases: ["evening"] }],
  sceneId: "scene.e2e_opening_interrupt",
  effects: [{
    kind: "modifier.add",
    lifetime: "opening_session",
    modifier: { kind: "capacity.add", source: { kind: "event", eventId: "event.e2e_opening_interrupt" }, modes: ["manual"], amount: 1, reasonId: "reason.e2e_opening_interrupt" },
    reasonId: "reason.e2e_opening_interrupt",
  }],
}
```

The Scene contains one narration node and one end node. Its end clears only `blockingEvent`; the checkpoint remains `middle` until explicit Continue.

- [ ] **Step 4: Run interruption and replay-determinism tests**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/opening-interruption.integration.test.ts`

Expected: PASS; strict JSON round-trip retains baseline/checkpoint/Narrative; Continue does not alter cash; Finalize records the event modifier once.

- [ ] **Step 5: Commit the interruption fixture behavior**

```bash
git add stories/e2e/src/test/opening-interruption.integration.test.ts stories/e2e/src/simulation/data.ts stories/e2e/src/simulation/narrative.ts stories/e2e/src/presentation/text-catalogs.ts
git commit -m "test(story-e2e): cover interrupted opening workflow"
```

## Task 22: Prove WorldAction Cross-Effects and D7 Ending

**Files:**
- Create: `stories/e2e/src/test/world-ending.integration.test.ts`
- Modify: `stories/e2e/src/simulation/data.ts`
- Modify: `stories/e2e/src/simulation/narrative.ts`
- Modify: `stories/e2e/src/simulation/rules.ts`
- Modify: `stories/e2e/src/presentation/text-catalogs.ts`

**Interfaces:**
- Consumes: World service, Narrative, Calendar, Actors, Inventory, Workflow, Progression, Status, Tavern, Run, and fixed E2E rules.
- Produces: one two-stage WorldAction whose result changes Inventory/Fact/Outcome, plus paid/arrears ending vectors and a D7 terminal completion projection.

- [ ] **Step 1: Write failing WorldAction and ending tests**

```ts
// stories/e2e/src/test/world-ending.integration.test.ts
import { describe, expect, it } from "vitest";
import { createE2eSessionHarnessV1 } from "../testing/session-harness.js";

describe("E2E WorldAction and ending", () => {
  it("moves through two scenes, resolves one check, and applies cross-owner rewards", () => {
    const harness = createE2eSessionHarnessV1();
    harness.loadCommands(buildCommandsToWorldMorningV1());
    harness.commit({ kind: "world.action.begin", actionId: "action.e2e_world", optionId: "choice.e2e_world_prepared" });
    harness.drainNarrative();
    harness.commit({ kind: "calendar.advance_phase" });
    harness.drainNarrative();
    harness.commit({ kind: "world.action.complete" });
    const snapshot = harness.snapshot();
    expect(snapshot.state.simulation.activeWorkflow).toBeNull();
    expect(snapshot.state.story.resolvedChecks).toHaveLength(1);
    expect(snapshot.state.story.facts).toContainEqual({ factId: "fact.e2e_world", value: { kind: "boolean", value: true } });
    expect(snapshot.state.story.outcomes).toContainEqual({ outcomeId: "outcome.e2e_investigation", value: { kind: "token", value: "investigation.e2e_complete" } });
    expect(snapshot.state.simulation.inventory.ingredientBatches.some((batch) => batch.ingredientId === "ingredient.e2e_grain")).toBe(true);
  });

  it.each([
    [2, "completed_stable"],
    [0, "failed_arrears"],
  ] as const)("ends from D7 cash %i as %s", (cash, status) => {
    const harness = createE2eSessionHarnessV1();
    harness.anchorFixtureState(buildLevyDueSnapshotV1({ cash }));
    harness.commit({ kind: "levy.pay" });
    expect(harness.snapshot().state.simulation.run.status).toBe(status);
    expect(harness.queries().getRunCompletion()?.status).toBe(status);
    expect(harness.snapshot().state.simulation.calendar).toMatchObject({ day: 7, phase: "afternoon" });
  });
});
```

- [ ] **Step 2: Run and verify missing WorldAction/ending content**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/world-ending.integration.test.ts`

Expected: FAIL with unknown `action.e2e_world` or missing ending definition.

- [ ] **Step 3: Add exact two-step WorldAction and check bands**

```ts
// append to stories/e2e/src/simulation/data.ts
const e2eWorldActionV1: WorldActionDefinitionV1 = {
  actionId: "action.e2e_world",
  nameTextId: "text.e2e_world",
  availability: [],
  reasonId: "reason.e2e_world",
  baseCashCost: 1,
  playerStaminaCost: 1,
  beginEffects: [],
  options: [
    { optionId: "choice.e2e_world_basic", labelTextId: "text.e2e_world_basic", availability: [], additionalCashCost: 0, preparationBonus: 0, beginEffects: [], confirmation: emptyConfirmationV1 },
    { optionId: "choice.e2e_world_prepared", labelTextId: "text.e2e_world_prepared", availability: [], additionalCashCost: 1, preparationBonus: 1, beginEffects: [], confirmation: emptyConfirmationV1 },
  ],
  steps: [
    { stepId: "step.e2e_world_departure", phase: "morning", apCost: 1, sceneId: "scene.e2e_world_departure" },
    { stepId: "step.e2e_world_return", phase: "afternoon", apCost: 1, sceneId: "scene.e2e_world_return" },
  ],
  checkId: "check.e2e_world",
};
```

The complete check band grants one grain batch, sets `fact.e2e_world=true`, and sets `outcome.e2e_investigation=investigation.e2e_complete`. Both World scenes contain one narration and one end node. The prepared option's fixed seed reaches the complete band; the test asserts the persisted `checkId`, `total`, `bandId`, two dice in the inclusive range `1..6`, and no second resolution. The E2E Story deliberately does not reuse the Demo Story's reference-seed `[4, 3]` oracle.

- [ ] **Step 4: Add exact ending rule outputs**

```ts
// stories/e2e/src/simulation/rules.ts
function evaluateE2eEndingV1(input: Readonly<EndingInputV1>): EndingResultV1 {
  const status = input.levy.kind === "arrears" ? "failed_arrears" : "completed_stable";
  const endingId = status === "failed_arrears" ? "ending.e2e_arrears" : "ending.e2e_stable";
  const reasonId = status === "failed_arrears" ? "reason.e2e_ending_arrears" : "reason.e2e_ending_stable";
  const relationship = input.outcomes.find((entry) => entry.outcomeId === "outcome.e2e_relationship")!;
  const investigation = input.outcomes.find((entry) => entry.outcomeId === "outcome.e2e_investigation")!;
  return { endingId, status, reasonIds: [reasonId], effects: [], summary: { relationship, investigation } };
}
```

- [ ] **Step 5: Run World/ending and full Story tests**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/world-ending.integration.test.ts && pnpm --filter @project-tavern/story-e2e test`

Expected: PASS; WorldAction stages, check vector, rewards, paid ending, arrears ending, branch/rejoin, opening interruption, and Story validation all pass.

- [ ] **Step 6: Commit World/ending integration**

```bash
git add stories/e2e/src/test/world-ending.integration.test.ts stories/e2e/src/simulation/data.ts stories/e2e/src/simulation/narrative.ts stories/e2e/src/simulation/rules.ts stories/e2e/src/presentation/text-catalogs.ts
git commit -m "test(story-e2e): cover world action and ending"
```

## Task 22A: Prove Official Pre-Session Hotfix Integration and Safe Mode

**Files:**
- Create: `stories/e2e/src/development/hotfixes/official-balance-hotfix.ts`
- Create: `stories/e2e/src/development/hotfixes/conflicting-rule-hotfix.ts`
- Create: `stories/e2e/src/testing/resolve-startup.ts`
- Create: `stories/e2e/src/test/hotfix-startup.integration.test.ts`
- Modify: `stories/e2e/src/patch-surfaces.ts`
- Modify: `stories/e2e/src/test/story-contract.test.ts`
- Modify: `stories/e2e/package.json`
- Modify: `scripts/verify-stories.mjs`
- Modify: `scripts/verify-stories.test.mjs`

**Interfaces:**
- Consumes: Base PatchSurface/Hotfix/Story/build-identity resolvers, the generic Web `createGameBootstrapControllerV1`, the E2E Story entry, one official value+rule Hotfix, generic Save envelope Schema, same-attempt diagnostics, and the real Story-owned Profile/harness.
- Produces: an E2E adapter over the same generic Loader bootstrap controller with `ready | safe_mode`, one pre-session official patch path, deterministic provenance-bound Save-contract/replay vectors, and conflict fallback. It exposes no Snapshot/state setter and never installs a Hotfix into a live Session.

- [ ] **Step 1: Write failing startup, digest, Save-contract, replay, and conflict tests**

```ts
it("applies an official value and rule patch before the Session exists", async () => {
  const startup = await resolveE2eStartupV1({ hotfixes: [officialBalanceHotfixV1] });
  expect(startup.kind).toBe("ready");
  if (startup.kind !== "ready") throw new Error("expected patched startup");
  expect(startup.resolved.provenance.resolved.patchSet.appliedHotfixes.map((entry) => entry.identity.id))
    .toEqual([e2eHotfixIdsV1.officialBalance]);
  expect(startup.resolved.provenance.resolved.simulationDigest)
    .not.toBe(startup.base.provenance.resolved.simulationDigest);
  const harness = createE2eSessionHarnessV1({ resolved: startup.resolved, bootstrap: e2eReferenceBootstrapV1 });
  expect(await runHotfixProbeCommandsV1(harness)).toEqual(expectedOfficialPatchProbeV1);
});

it("binds Save-contract provenance and replay to the resolved simulation", async () => {
  const first = await resolveE2eStartupV1({ hotfixes: [officialBalanceHotfixV1] });
  if (first.kind !== "ready") throw new Error("expected ready");
  const run = await runHotfixReplayVectorV1(first.resolved);
  const parsed = e2eSaveRecordSchemaV1.parse(strictJsonRoundTripV1(run.saveRecord));
  expect(parsed.provenance.resolved.simulationDigest)
    .toBe(first.resolved.provenance.resolved.simulationDigest);
  const replay = await replayHotfixCommandsV1(first.resolved, run.commands, run.bootstrap);
  expect(replay.finalStateDigest).toBe(run.finalStateDigest);
  expect(replay.rngDraws).toEqual(run.rngDraws);
});

it("enters base safe mode when patches conflict", async () => {
  const startup = await resolveE2eStartupV1({
    hotfixes: [officialBalanceHotfixV1, conflictingRuleHotfixV1],
  });
  expect(startup).toMatchObject({
    kind: "safe_mode",
    code: "hotfix.conflict",
    rejectedHotfixIds: [e2eHotfixIdsV1.officialBalance, e2eHotfixIdsV1.conflictingRule],
  });
  if (startup.kind !== "safe_mode") throw new Error("expected safe mode");
  expect(startup.resolved.provenance.resolved.simulationDigest)
    .toBe(startup.base.provenance.resolved.simulationDigest);
});
```

The Save-contract test uses the generic Phase 1 `SaveRecordEnvelopeV1`/Schema only; Phase 3 later proves IndexedDB/import/adoption behavior. It serializes the exact resolved engine/story/state/simulation/presentation/application identities, Snapshot, state digest, and empty lineage. It neither calls a persistence service that does not yet exist nor invents a Base testkit helper.

- [ ] **Step 2: Run and verify startup integration is absent**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/hotfix-startup.integration.test.ts`

Expected: FAIL with missing `resolve-startup.js`/official Hotfix fixture.

- [ ] **Step 3: Define the official patches and pre-session safe-mode resolver**

The official Hotfix targets exactly `value.balance` and `rule.tavern.settle`, includes expected provider digests, and replaces them with values/functions that pass the same strict slot Schemas. `resolveE2eStartupV1` is a thin E2E adapter over `createGameBootstrapControllerV1`: it supplies the public Story resolver, explicit Hotfix entries, and an in-memory Host record store, but does not reimplement safe-mode policy. The generic controller always resolves the unpatched base first, attempts all requested Hotfixes in authored order, and constructs the Profile/Session only after success. Unknown target, provider mismatch, requires/conflicts/supersedes failure, invalid output Schema, or install throw returns a bounded `safe_mode` result with the untouched base-resolved Story and ordered rejected Hotfix IDs. It never retries a subset silently. Add `@project-tavern/web: workspace:*` to the E2E package only for this Story→Web test/application edge; the default E2E Story closure remains free of Web imports.

- [ ] **Step 4: Prove provenance and replay without an authoritative-state escape hatch**

Run one fixed branded bootstrap and literal public-command list under the patched resolved Story, construct the generic Save record from the committed Snapshot, then create a fresh patched Profile/Session and replay the same public commands. Assert final state/RNG/fact digests and all draw traces match. Attempting to replay the patched record under base resolution is refused on simulation digest before any command runs. Static assertions reject `setState`, `replaceSnapshot`, owner capabilities, and direct PatchSurface mutation from the harness/Player surface.

- [ ] **Step 5: Extend stable Story verification and run all gates**

Extend `verify:stories` through `scripts/collect-import-closure.mjs` to prove the default E2E Player closure excludes `src/development/hotfixes/**` and `resolve-startup.ts`, while the explicit integration test closure can reach them. Retain all Sandbox/E2E validation and Demo-empty assertions.

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/hotfix-startup.integration.test.ts && pnpm verify:stories && pnpm typecheck && pnpm verify`

Expected: PASS; value/rule replacements change the simulation digest and probe result, Save-contract/replay is exact, the real generic Loader controller returns validated base safe mode on conflict and records last-success identity only after success, the default Story closure remains Player-safe, and verification is non-mutating.

- [ ] **Step 6: Commit Hotfix integration only**

```bash
git add stories/e2e/src/development/hotfixes stories/e2e/src/testing/resolve-startup.ts stories/e2e/src/test/hotfix-startup.integration.test.ts stories/e2e/src/patch-surfaces.ts stories/e2e/src/test/story-contract.test.ts stories/e2e/package.json scripts/verify-stories.mjs scripts/verify-stories.test.mjs
git commit -m "test(story-e2e): prove pre-session hotfix integration"
```

## Task 23: Add Command-Derived Development Fixtures and the Phase 2 Gate

**Files:**
- Create: `stories/e2e/src/development.ts`
- Create: `stories/e2e/src/development/fixtures.ts`
- Create: `stories/e2e/src/test/fixture-contract.test.ts`
- Modify: `stories/e2e/package.json`
- Modify: `package.json`
- Modify: `scripts/verify-fixtures.mjs`
- Modify: `scripts/verify-fixtures.test.mjs`
- Modify: `scripts/verify-stories.mjs`
- Modify: `scripts/verify-stories.test.mjs`

**Interfaces:**
- Consumes: fixed E2E Story identity/seed, public commands, Story resolver/testkit, and Phase 1 boundary/type/test scripts.
- Produces: eight fixed fixtures as seed+command lists, a development-only entry, read-only `verify:fixtures`, and `verify:phase2`. Phase 3 consumes these fixtures in its persistence/diagnostics tests.

- [ ] **Step 1: Write the failing fixture and Player-boundary tests**

```ts
// stories/e2e/src/test/fixture-contract.test.ts
import { describe, expect, it } from "vitest";
import { validateDevelopmentFixturesV1 } from "@project-tavern/base/testkit";
import { e2eDevelopmentEntryV1 } from "../development.js";

describe("E2E development fixtures", () => {
  it("freezes eight command-derived fixtures", () => {
    const support = e2eDevelopmentEntryV1.defineDevelopmentSupport();
    expect(support.fixtures.map((fixture) => fixture.fixtureId)).toEqual([
      "fixture.e2e_bootstrap",
      "fixture.e2e_branch_left",
      "fixture.e2e_opening_interrupted",
      "fixture.e2e_opening_shortage",
      "fixture.e2e_world_departure",
      "fixture.e2e_world_ready",
      "fixture.e2e_levy_due",
      "fixture.e2e_replay_tail",
    ]);
    expect(validateDevelopmentFixturesV1(e2eDevelopmentEntryV1, {
      fixtureIdSchema: fixtureIdSchemaV1,
      commandSchema: gameCommandV1Schema,
    })).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run and verify missing development entry**

Run: `pnpm --filter @project-tavern/story-e2e test -- src/test/fixture-contract.test.ts`

Expected: FAIL with missing `../development.js`.

- [ ] **Step 3: Define exact fixture identities and command lists**

```ts
// stories/e2e/src/development/fixtures.ts
export const e2eFixturesV1: StoryDevelopmentSupportV1["fixtures"] = Object.freeze([
  { fixtureId: e2eIdsV1.fixtureBootstrap, seed: e2eReferenceSeedV1, commands: [] },
  { fixtureId: e2eIdsV1.fixtureBranchLeft, seed: e2eReferenceSeedV1, commands: commandsToBranchLeftV1 },
  { fixtureId: e2eIdsV1.fixtureOpeningInterrupted, seed: e2eReferenceSeedV1, commands: commandsToInterruptedOpeningV1 },
  { fixtureId: e2eIdsV1.fixtureOpeningShortage, seed: e2eReferenceSeedV1, commands: commandsToOpeningShortageV1 },
  { fixtureId: e2eIdsV1.fixtureWorldDeparture, seed: e2eReferenceSeedV1, commands: commandsToWorldDepartureV1 },
  { fixtureId: e2eIdsV1.fixtureWorldReady, seed: e2eReferenceSeedV1, commands: commandsToWorldReadyV1 },
  { fixtureId: e2eIdsV1.fixtureLevyDue, seed: e2eReferenceSeedV1, commands: commandsToLevyDueV1 },
  { fixtureId: e2eIdsV1.fixtureReplayTail, seed: e2eReferenceSeedV1, commands: commandsToReplayTailV1 },
]);
```

Each `commandsTo*V1` constant is a literal readonly `GameCommandV1[]`; Narrative commands copy exact stable scene/node IDs from this Story. In fixture order, the test Host returns fixed run IDs `00000000-0000-4000-8000-00000000f001`, `00000000-0000-4000-8000-00000000f002`, `00000000-0000-4000-8000-00000000f003`, `00000000-0000-4000-8000-00000000f004`, `00000000-0000-4000-8000-00000000f005`, `00000000-0000-4000-8000-00000000f006`, `00000000-0000-4000-8000-00000000f007`, and `00000000-0000-4000-8000-00000000f008`. The validator submits every command, rejects any non-committed result, validates the final Snapshot, and reruns the list with the same corresponding ID to compare final state/RNG/facts/digests. It never stores a handwritten Snapshot.

- [ ] **Step 4: Export only the dedicated development entry**

```ts
// stories/e2e/src/development.ts
import { defineStoryDevelopmentEntry } from "@project-tavern/base";
import { e2eStoryIdentityV1 } from "./simulation/identity.js";
import { e2eFixturesV1 } from "./development/fixtures.js";

export const e2eDevelopmentEntryV1 = defineStoryDevelopmentEntry({
  contractRevision: 1,
  storyIdentity: e2eStoryIdentityV1,
  defineDevelopmentSupport: () => ({ fixtures: e2eFixturesV1 }),
});
```

- [ ] **Step 5: Add `./development` and extend the stable fixture/Story wrappers atomically**

In `stories/e2e/package.json`, add `"./development": "./src/development.ts"` in the same edit that creates that file, plus a read-only `verify:fixtures`. Extend `scripts/verify-fixtures.mjs` and its behavior tests so the stable root wrapper validates existing Sandbox fixtures and all eight E2E command-derived fixtures; extend `verify:stories` so its production closure check uses `scripts/collect-import-closure.mjs` and proves `stories/e2e/src/index.ts` reaches neither `development.ts` nor any `development/**` file. Retain every prior Sandbox/E2E/Hotfix check.

```json
// package.json scripts additions
{
  "verify:phase2": "pnpm verify:stories && pnpm verify:fixtures && pnpm verify:boundaries && pnpm verify:cycles && pnpm typecheck && pnpm --filter @project-tavern/modules test && pnpm --filter @project-tavern/story-e2e test"
}
```

`packages/modules/package.json` remains the Task 1 PolyForm package exporting only `.` with its existing test script. `stories/e2e/package.json` gains the separate `./development` export and read-only `verify:fixtures`; no update command exists for E2E fixtures.

- [ ] **Step 6: Run focused fixture and package gates**

Run: `pnpm verify:fixtures && pnpm verify:stories && pnpm --filter @project-tavern/modules test && pnpm --filter @project-tavern/story-e2e test`

Expected: PASS; 8/8 fixtures replay twice with identical Snapshot/RNG/facts; all Module and E2E Story tests pass.

- [ ] **Step 7: Run the Phase 2 gate and full repository verification**

Run: `pnpm verify:phase2`

Expected: PASS; boundaries, cycles, TypeScript 7 typecheck, all Module tests, all E2E Story tests, and fixture verification pass without changing tracked files.

Run: `pnpm verify`

Expected: PASS; Phase 1 verification remains green and no tracked baseline is rewritten.

- [ ] **Step 8: Run licensing verification for new package metadata**

Run: `node scripts/verify-licensing.mjs`

Expected: `licensing verification passed`

- [ ] **Step 9: Commit only Phase 2 package/gate files**

```bash
git add package.json stories/e2e/package.json stories/e2e/src/development.ts stories/e2e/src/development/fixtures.ts stories/e2e/src/test/fixture-contract.test.ts scripts/verify-fixtures.mjs scripts/verify-fixtures.test.mjs scripts/verify-stories.mjs scripts/verify-stories.test.mjs
git commit -m "test(story-e2e): freeze integration fixtures"
```

## Phase 2 Acceptance

- [ ] Exactly 12 real Module bindings exist: 10 stateful owners and 2 stateless services; all 12 are selected by `stories/e2e`.
- [ ] `@project-tavern/modules` exports no Profile/tuple/GamePackage; `stories/e2e` is the first real consumer and owns its twelve-binding tuple, coordinator instance, bootstrap, initial-state assembly, and Profile.
- [ ] The complete profile-bound type spine exists before the first binding commit; every Phase 2 task passes `pnpm typecheck` and current `pnpm verify` at its commit boundary.
- [ ] The Demo-v1 dependency graph has exactly 0 Module-to-Module read edges, every non-empty state slot has exactly 1 owner, and there is exactly 1 `DemoCommandCoordinatorV1`.
- [ ] All 17 `GameCommandV1` variants have committed, typed rejection, and applicable fault vectors; no handler returns `command.handler_not_implemented`.
- [ ] The Effect router exhaustively handles all 19 current `EffectIntentV1` kinds and rolls back a batch when any later effect fails.
- [ ] Narrative contract tests cover all 11 node kinds, both stable interpreter limits, stale cursor rejection, stage cues, call/return, and atomic effect/checkpoint behavior.
- [ ] `story.e2e_001` validates with one complete `zh-CN` catalog, fallback-only assets, no Demo imports, no runtime images, and no `references/` dependency.
- [ ] Both branch choices write different Fact tokens, rejoin `node.e2e_shared_line`, and complete the same shared scene.
- [ ] Opening interruption retains one baseline, one blocking event, one explicit Continue gap, one settlement, and no duplicate start cost after strict JSON round-trip.
- [ ] WorldAction traverses exactly 4 progress states, persists exactly 1 check, applies Inventory/Fact/Outcome effects once, and clears Workflow.
- [ ] Paid and arrears E2E endings both finish at D7 afternoon with a persisted `RunCompletionV1` and query projection.
- [ ] The official value+rule Hotfix applies only before Session creation, changes resolved simulation digest/provenance, round-trips through the generic Save contract, replays the same command/RNG vector exactly, and a conflict enters untouched-base safe mode without any state setter.
- [ ] Exactly 8 command-derived development fixtures validate and replay twice identically; the default Story closure contains 0 development modules.
- [ ] Stable `verify:stories` still validates Sandbox plus E2E and still rejects an active Demo; stable `verify:fixtures` still validates Sandbox plus all E2E fixtures.
- [ ] `pnpm --filter @project-tavern/modules test` passes.
- [ ] `pnpm --filter @project-tavern/story-e2e test` passes.
- [ ] `pnpm --filter @project-tavern/story-e2e verify:fixtures` passes without rewriting files.
- [ ] `pnpm verify:phase2` passes.
- [ ] `pnpm verify` passes and `git status --short` shows no generated or unplanned files.
