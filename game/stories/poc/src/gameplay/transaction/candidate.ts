// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createGameSnapshotEnvelopeSchemaV1,
  createTransactionalRngV1,
  rngStateV1Schema,
  type DeepReadonly,
  type ModuleOwnerCapabilityV1,
  type RngDrawTraceV1,
  type RngStateV1,
  type RuleRngV1,
} from "@sillymaker/base";

import { pocGameplayModuleDescriptorsV1 } from "../contracts/module-catalog.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  PocGameSnapshotV1,
  PocGameStateV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocSimulationDataV1,
  PocSimulationProgramV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type NonNegativeSafeInteger,
  type PositiveSafeInteger,
} from "../contracts/values.js";
import type {
  PocActorsDependencyPortsV1,
  PocActorsOwnerOperationV1,
} from "../modules/actors/contract.js";
import type {
  PocCalendarDependencyPortsV1,
  PocCalendarOwnerOperationV1,
  PocCalendarReadPortV1,
} from "../modules/calendar/contract.js";
import type {
  PocFacilitiesDependencyPortsV1,
  PocFacilitiesOwnerOperationV1,
  PocFacilitiesReadPortV1,
} from "../modules/facilities/contract.js";
import type {
  PocInventoryDependencyPortsV1,
  PocInventoryOwnerOperationV1,
} from "../modules/inventory/contract.js";
import type { PocGameplayModuleTupleV1 } from "../modules/index.js";
import type {
  PocNarrativeDependencyPortsV1,
  PocNarrativeOwnerOperationV1,
} from "../modules/narrative/contract.js";
import type {
  PocProgressionDependencyPortsV1,
  PocProgressionOwnerOperationV1,
  PocProgressionStateV1,
} from "../modules/progression/contract.js";
import type { PocRunDependencyPortsV1, PocRunOwnerOperationV1 } from "../modules/run/contract.js";
import type {
  PocStatusDependencyPortsV1,
  PocStatusOwnerOperationV1,
} from "../modules/status/contract.js";
import type {
  PocTavernDependencyPortsV1,
  PocTavernOwnerOperationV1,
} from "../modules/tavern/contract.js";
import type {
  PocWorkflowDependencyPortsV1,
  PocWorkflowOwnerOperationV1,
  PocWorkflowReadPortV1,
} from "../modules/workflow/contract.js";
import { pocGameStateSchemaV1, pocGameplayFactSchemaV1 } from "../runtime-schemas.js";
import { parseAuraInstanceId, type AuraInstanceId } from "../contracts/ids.js";

export type PocCandidateOwnerResultV1 =
  | { readonly kind: "applied" }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

export interface PocTransactionCandidateV1 {
  snapshot(): PocGameSnapshotV1;
  gameplayFacts(): readonly PocGameplayFactV1[];
  data(): PocSimulationDataV1;
  calendarReadPort(): PocCalendarReadPortV1;
  facilitiesReadPort(): PocFacilitiesReadPortV1;
  workflowReadPort(): PocWorkflowReadPortV1;
  nextCommandSequence(): PositiveSafeInteger;
  nextBatchIndex(): NonNegativeSafeInteger;
  nextLedgerEntryIndex(): NonNegativeSafeInteger;
  allocateAuraInstanceId(): AuraInstanceId;
  rng(): RuleRngV1;
  replaceRngForDebug(rng: DeepReadonly<RngStateV1>): void;
  candidateRngState(): RngStateV1;
  attemptedDraws(): readonly RngDrawTraceV1[];
  checkpoint(): object;
  rollback(checkpoint: object): void;
  appendGameplayFact(fact: DeepReadonly<PocGameplayFactV1>): void;
  appendGameplayFacts(facts: readonly DeepReadonly<PocGameplayFactV1>[]): void;
  applyRun(
    operation: DeepReadonly<PocRunOwnerOperationV1>,
    dependencies: PocRunDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyCalendar(
    operation: DeepReadonly<PocCalendarOwnerOperationV1>,
    dependencies: PocCalendarDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyActors(
    operation: DeepReadonly<PocActorsOwnerOperationV1>,
    dependencies: PocActorsDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyStatus(
    operation: DeepReadonly<PocStatusOwnerOperationV1>,
    dependencies: PocStatusDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyInventory(
    operation: DeepReadonly<PocInventoryOwnerOperationV1>,
    dependencies: PocInventoryDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyFacilities(
    operation: DeepReadonly<PocFacilitiesOwnerOperationV1>,
    dependencies: PocFacilitiesDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyTavern(
    operation: DeepReadonly<PocTavernOwnerOperationV1>,
    dependencies: PocTavernDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyWorkflow(
    operation: DeepReadonly<PocWorkflowOwnerOperationV1>,
    dependencies: PocWorkflowDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyProgression(
    operation: DeepReadonly<PocProgressionOwnerOperationV1>,
    dependencies: PocProgressionDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
  applyNarrative(
    operation: DeepReadonly<PocNarrativeOwnerOperationV1>,
    dependencies: PocNarrativeDependencyPortsV1,
  ): PocCandidateOwnerResultV1;
}

interface PocCandidateCheckpointRecordV1 {
  readonly owner: object;
  readonly snapshot: PocGameSnapshotV1;
  readonly factCount: number;
  readonly batchIndex: NonNegativeSafeInteger;
  readonly ledgerEntryIndex: NonNegativeSafeInteger;
  readonly auraIndex: NonNegativeSafeInteger;
  readonly rng: RuleRngV1;
}

interface OwnerProposalWithFactsV1 {
  readonly facts: readonly unknown[];
}

const pocSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  pocGameStateSchemaV1,
  rngStateV1Schema,
);

function nextSafeIndexV1(
  current: NonNegativeSafeInteger,
  increment: number,
  label: string,
): NonNegativeSafeInteger {
  if (
    !Number.isSafeInteger(increment) ||
    increment < 0 ||
    current > Number.MAX_SAFE_INTEGER - increment
  ) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return parseNonNegativeSafeInteger(current + increment);
}

function appliedOwnerResultV1(): PocCandidateOwnerResultV1 {
  return Object.freeze({ kind: "applied" });
}

function rejectedOwnerResultV1(rejection: PocRejectionReasonV1): PocCandidateOwnerResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function applyOwnerProposalV1<
  TState,
  TOperation,
  TProposal extends OwnerProposalWithFactsV1,
  TDeps,
>(
  owner: ModuleOwnerCapabilityV1<TState, TOperation, TProposal, PocRejectionReasonV1, TDeps>,
  state: DeepReadonly<TState>,
  operation: DeepReadonly<TOperation>,
  dependencies: TDeps,
  replaceState: (state: TState) => void,
  appendFacts: (facts: readonly PocGameplayFactV1[]) => void,
): PocCandidateOwnerResultV1 {
  const result = owner.propose(state, operation, dependencies);
  if (result.kind === "rejected") return rejectedOwnerResultV1(result.rejection);
  const after = owner.apply(state, result.proposal as DeepReadonly<TProposal>);
  const facts = result.proposal.facts.map((fact) => pocGameplayFactSchemaV1.parse(fact));
  replaceState(after);
  appendFacts(facts);
  return appliedOwnerResultV1();
}

function assertModuleInvariantsV1<TState, TReadPort>(
  module: {
    readonly localInvariants: readonly {
      check(state: DeepReadonly<TState>, readPort: TReadPort): readonly unknown[];
    }[];
    createReadPort(state: DeepReadonly<TState>): TReadPort;
  },
  state: DeepReadonly<TState>,
  label: string,
): void {
  const readPort = module.createReadPort(state);
  for (const invariant of module.localInvariants) {
    if (invariant.check(state, readPort).length > 0) {
      throw new TypeError(`${label} local invariant failed`);
    }
  }
}

export function createPocTransactionCandidateV1(
  inputSnapshot: DeepReadonly<PocGameSnapshotV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
): PocTransactionCandidateV1 {
  pocSnapshotSchemaV1.parse(inputSnapshot);
  const data = pocSimulationDataSchemaV1.parse(program.data);
  modules.forEach((module, index) => {
    if (module.descriptor !== pocGameplayModuleDescriptorsV1[index]) {
      throw new TypeError(`candidate module tuple mismatch at index ${index}`);
    }
  });

  const originalSnapshot = inputSnapshot as PocGameSnapshotV1;
  const inputIntegrity = originalSnapshot.integrity;
  const nextCommandSequence = parsePositiveSafeInteger(originalSnapshot.commandSequence + 1);
  let rng = createTransactionalRngV1(originalSnapshot.rng);
  const checkpointOwner = Object.freeze({});
  const checkpoints = new WeakSet<object>();
  let currentSnapshot = originalSnapshot;
  let facts: readonly PocGameplayFactV1[] = Object.freeze([]);
  let batchIndex = parseNonNegativeSafeInteger(0);
  let ledgerEntryIndex = parseNonNegativeSafeInteger(0);
  let auraIndex = parseNonNegativeSafeInteger(0);
  let committed = false;

  const assertWritableV1 = (): void => {
    if (committed) throw new TypeError("transaction candidate is already committed");
  };

  const replaceStateV1 = (stateValue: PocGameStateV1): void => {
    assertWritableV1();
    const state = pocGameStateSchemaV1.parse(stateValue);
    currentSnapshot = deepFreezePocValueV1({
      state,
      rng: currentSnapshot.rng,
      commandSequence: currentSnapshot.commandSequence,
      integrity: inputIntegrity,
    });
  };

  const replaceSimulationSliceV1 = <TKey extends keyof PocGameStateV1["simulation"]>(
    key: TKey,
    value: PocGameStateV1["simulation"][TKey],
  ): void => {
    replaceStateV1({
      ...currentSnapshot.state,
      simulation: { ...currentSnapshot.state.simulation, [key]: value },
    });
  };

  const replaceProgressionV1 = (progression: PocProgressionStateV1): void => {
    replaceStateV1({
      ...currentSnapshot.state,
      story: {
        ...currentSnapshot.state.story,
        facts: progression.facts,
        quests: progression.quests,
        outcomes: progression.outcomes,
        resolvedChecks: progression.resolvedChecks,
      },
    });
  };

  const appendFactsV1 = (values: readonly PocGameplayFactV1[]): void => {
    assertWritableV1();
    const parsed = values.map((fact) => pocGameplayFactSchemaV1.parse(fact));
    facts = deepFreezePocValueV1([...facts, ...parsed]);
  };

  const candidate: PocTransactionCandidateV1 & { commit(): PocGameSnapshotV1 } = {
    snapshot(): PocGameSnapshotV1 {
      return currentSnapshot;
    },
    gameplayFacts(): readonly PocGameplayFactV1[] {
      return facts;
    },
    data(): PocSimulationDataV1 {
      return data;
    },
    calendarReadPort(): PocCalendarReadPortV1 {
      return modules[1].createReadPort(currentSnapshot.state.simulation.calendar);
    },
    facilitiesReadPort(): PocFacilitiesReadPortV1 {
      return modules[5].createReadPort(currentSnapshot.state.simulation.facilities);
    },
    workflowReadPort(): PocWorkflowReadPortV1 {
      return modules[7].createReadPort(currentSnapshot.state.simulation.activeWorkflow);
    },
    nextCommandSequence(): PositiveSafeInteger {
      return nextCommandSequence;
    },
    nextBatchIndex(): NonNegativeSafeInteger {
      return batchIndex;
    },
    nextLedgerEntryIndex(): NonNegativeSafeInteger {
      return ledgerEntryIndex;
    },
    allocateAuraInstanceId(): AuraInstanceId {
      assertWritableV1();
      const instanceId = parseAuraInstanceId(`aura:${nextCommandSequence}:${auraIndex}`);
      auraIndex = nextSafeIndexV1(auraIndex, 1, "Aura cursor");
      return instanceId;
    },
    rng(): RuleRngV1 {
      assertWritableV1();
      return rng;
    },
    replaceRngForDebug(rngValue): void {
      assertWritableV1();
      rng = createTransactionalRngV1(rngStateV1Schema.parse(rngValue));
    },
    candidateRngState(): RngStateV1 {
      return rngStateV1Schema.parse(rng.candidateState());
    },
    attemptedDraws(): readonly RngDrawTraceV1[] {
      return rng.attemptedDraws();
    },
    checkpoint(): object {
      assertWritableV1();
      const checkpoint: PocCandidateCheckpointRecordV1 = Object.freeze({
        owner: checkpointOwner,
        snapshot: currentSnapshot,
        factCount: facts.length,
        batchIndex,
        ledgerEntryIndex,
        auraIndex,
        rng,
      });
      checkpoints.add(checkpoint);
      return checkpoint;
    },
    rollback(checkpointValue: object): void {
      assertWritableV1();
      if (!checkpoints.has(checkpointValue)) throw new TypeError("invalid candidate checkpoint");
      const checkpoint = checkpointValue as PocCandidateCheckpointRecordV1;
      if (checkpoint.owner !== checkpointOwner) throw new TypeError("foreign candidate checkpoint");
      currentSnapshot = checkpoint.snapshot;
      facts = Object.freeze(facts.slice(0, checkpoint.factCount));
      batchIndex = checkpoint.batchIndex;
      ledgerEntryIndex = checkpoint.ledgerEntryIndex;
      auraIndex = checkpoint.auraIndex;
      rng = checkpoint.rng;
    },
    appendGameplayFact(fact): void {
      appendFactsV1([pocGameplayFactSchemaV1.parse(fact)]);
    },
    appendGameplayFacts(factValues): void {
      appendFactsV1(factValues.map((fact) => pocGameplayFactSchemaV1.parse(fact)));
    },
    applyRun(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[0].owner,
        currentSnapshot.state.simulation.run,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("run", state),
        appendFactsV1,
      );
    },
    applyCalendar(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[1].owner,
        currentSnapshot.state.simulation.calendar,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("calendar", state),
        appendFactsV1,
      );
    },
    applyActors(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[2].owner,
        currentSnapshot.state.simulation.actors,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("actors", state),
        appendFactsV1,
      );
    },
    applyStatus(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[3].owner,
        currentSnapshot.state.simulation.status,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("status", state),
        appendFactsV1,
      );
    },
    applyInventory(operation, dependencies): PocCandidateOwnerResultV1 {
      const before = currentSnapshot.state.simulation.inventory;
      const result = applyOwnerProposalV1(
        modules[4].owner,
        before,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("inventory", state),
        appendFactsV1,
      );
      if (result.kind === "applied") {
        const after = currentSnapshot.state.simulation.inventory;
        if (after.ledger.length < before.ledger.length) {
          throw new TypeError("Inventory owner removed ledger records");
        }
        if (operation.kind === "inventory.purchase" || operation.kind === "inventory.grant") {
          batchIndex = nextSafeIndexV1(batchIndex, operation.lines.length, "Batch cursor");
        }
        ledgerEntryIndex = nextSafeIndexV1(
          ledgerEntryIndex,
          after.ledger.length - before.ledger.length,
          "Ledger cursor",
        );
      }
      return result;
    },
    applyFacilities(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[5].owner,
        currentSnapshot.state.simulation.facilities,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("facilities", state),
        appendFactsV1,
      );
    },
    applyTavern(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[6].owner,
        currentSnapshot.state.simulation.tavern,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("tavern", state),
        appendFactsV1,
      );
    },
    applyWorkflow(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[7].owner,
        currentSnapshot.state.simulation.activeWorkflow,
        operation,
        dependencies,
        (state) => replaceSimulationSliceV1("activeWorkflow", state),
        appendFactsV1,
      );
    },
    applyProgression(operation, dependencies): PocCandidateOwnerResultV1 {
      const state: PocProgressionStateV1 = {
        facts: currentSnapshot.state.story.facts,
        quests: currentSnapshot.state.story.quests,
        outcomes: currentSnapshot.state.story.outcomes,
        resolvedChecks: currentSnapshot.state.story.resolvedChecks,
      };
      return applyOwnerProposalV1(
        modules[8].owner,
        state,
        operation,
        dependencies,
        replaceProgressionV1,
        appendFactsV1,
      );
    },
    applyNarrative(operation, dependencies): PocCandidateOwnerResultV1 {
      return applyOwnerProposalV1(
        modules[9].owner,
        currentSnapshot.state.story.narrative,
        operation,
        dependencies,
        (state) =>
          replaceStateV1({
            ...currentSnapshot.state,
            story: { ...currentSnapshot.state.story, narrative: state },
          }),
        appendFactsV1,
      );
    },
    commit(): PocGameSnapshotV1 {
      assertWritableV1();
      const state = pocGameStateSchemaV1.parse(currentSnapshot.state);
      assertModuleInvariantsV1(modules[0], state.simulation.run, "Run");
      assertModuleInvariantsV1(modules[1], state.simulation.calendar, "Calendar");
      assertModuleInvariantsV1(modules[2], state.simulation.actors, "Actors");
      assertModuleInvariantsV1(modules[3], state.simulation.status, "Status");
      assertModuleInvariantsV1(modules[4], state.simulation.inventory, "Inventory");
      assertModuleInvariantsV1(modules[5], state.simulation.facilities, "Facilities");
      assertModuleInvariantsV1(modules[6], state.simulation.tavern, "Tavern");
      assertModuleInvariantsV1(modules[7], state.simulation.activeWorkflow, "Workflow");
      assertModuleInvariantsV1(
        modules[8],
        {
          facts: state.story.facts,
          quests: state.story.quests,
          outcomes: state.story.outcomes,
          resolvedChecks: state.story.resolvedChecks,
        },
        "Progression",
      );
      assertModuleInvariantsV1(modules[9], state.story.narrative, "Narrative");
      facts.forEach((fact) => pocGameplayFactSchemaV1.parse(fact));
      const parsed = pocSnapshotSchemaV1.parse({
        state,
        rng: rngStateV1Schema.parse(rng.candidateState()),
        commandSequence: nextCommandSequence,
        integrity: inputIntegrity,
      });
      currentSnapshot = deepFreezePocValueV1({ ...parsed, integrity: inputIntegrity });
      committed = true;
      return currentSnapshot;
    },
  };

  return Object.freeze(candidate);
}

export function commitPocCandidateV1(candidate: PocTransactionCandidateV1): PocGameSnapshotV1 {
  const commit = Reflect.get(candidate, "commit");
  if (typeof commit !== "function") throw new TypeError("invalid transaction candidate");
  return Reflect.apply(commit, candidate, []) as PocGameSnapshotV1;
}
