// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createPristineRunIntegrityV1,
  parseRunId,
  rngStateV1Schema,
  runIntegrityV1Schema,
  type RunIntegrityV1,
} from "@sillymaker/base";

import { pocSimulationDataSchemaV1 } from "../gameplay/contracts/schemas.js";
import type {
  PocGameBootstrapInputV1,
  PocGameSnapshotV1,
  PocRulesV1,
  PocSimulationDataV1,
  PocSimulationProgramV1,
  StoryValueDefinitionV1,
  StoryValueV1,
} from "../gameplay/contracts/types.js";
import {
  deepFreezePocValueV1,
  parseAttributeBonus,
  parseDayIndex,
  parseDieFace,
  parseMoney,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";

export interface PocGameplayFixtureV1 {
  readonly program: PocSimulationProgramV1;
  readonly bootstrap: PocGameBootstrapInputV1;
  readonly snapshot: PocGameSnapshotV1;
}

export interface PocGameplayFixtureOptionsV1 {
  readonly integrity?: "normal" | "modified";
}

function createContractFixtureDataV1(): PocSimulationDataV1 {
  return pocSimulationDataSchemaV1.parse({
    dataRevision: 1,
    manifest: {
      initialSceneId: "scene.fixture",
      playableDays: 7,
    },
    stateDefinitions: {
      facts: [
        {
          factId: "fact.fixture",
          value: { kind: "boolean", defaultValue: false },
        },
      ],
      quests: [
        {
          questId: "quest.fixture",
          initial: {
            questId: "quest.fixture",
            status: "locked",
            progress: 0,
            target: 1,
          },
        },
      ],
      outcomes: [
        {
          outcomeId: "outcome.fixture.investigation",
          value: {
            kind: "token",
            defaultValue: "token.fixture.neutral",
            allowedValues: ["token.fixture.neutral"],
          },
        },
        {
          outcomeId: "outcome.fixture.relationship",
          value: {
            kind: "token",
            defaultValue: "token.fixture.neutral",
            allowedValues: ["token.fixture.neutral"],
          },
        },
      ],
    },
    initialState: {
      player: {
        actorId: "actor.player",
        stamina: { current: 10, maximum: 10 },
        mood: 0,
        attributes: { body: "C", social: "C", intellect: "C" },
      },
      heroine: {
        actorId: "actor.heroine",
        stamina: { current: 10, maximum: 10 },
        mood: 0,
      },
      relationship: { affection: 0, teamwork: 0, stage: "cold" },
      cash: 100,
      reputation: 50,
      helper: { unlocked: false, tier: "apprentice" },
      unlockedRecipeIds: ["recipe.fixture"],
      ingredientBatches: [],
      itemStacks: [],
      auras: [],
    },
    balance: {
      lifePolicies: [
        {
          policyId: "policy.fixture",
          nameTextId: "text.fixture",
          apByPhase: { morning: 2, afternoon: 2, evening: 2 },
          playerNightRecovery: 1,
          nightRecoveryReasonId: "reason.fixture",
        },
      ],
      actionCosts: [
        {
          action: "inventory.buy",
          apCost: 1,
          playerStaminaCost: 0,
          heroineStaminaCost: 0,
          reasonId: "reason.fixture",
        },
        {
          action: "actor.prepare_food",
          apCost: 1,
          playerStaminaCost: 1,
          heroineStaminaCost: 0,
          reasonId: "reason.fixture",
        },
        {
          action: "actor.rest",
          apCost: 1,
          playerStaminaCost: 0,
          heroineStaminaCost: 0,
          reasonId: "reason.fixture",
        },
        {
          action: "facility.choose.build",
          apCost: 0,
          playerStaminaCost: 0,
          heroineStaminaCost: 0,
          reasonId: "reason.fixture",
        },
      ],
      serviceModes: [
        {
          mode: "manual",
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          reasonId: "reason.fixture",
          apCost: 1,
          playerStaminaCost: 1,
          heroineStaminaCost: 1,
          wage: 0,
          baseReceptionCapacity: 2,
          basePreparationPoints: 2,
          teamworkGain: 1,
          preparationPointsPerAction: 1,
        },
        {
          mode: "assisted",
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          reasonId: "reason.fixture",
          apCost: 1,
          playerStaminaCost: 1,
          heroineStaminaCost: 1,
          wage: 1,
          baseReceptionCapacity: 2,
          basePreparationPoints: 2,
          teamworkGain: 1,
          preparationPointsPerAction: 1,
        },
        {
          mode: "delegated",
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          reasonId: "reason.fixture",
          apCost: 0,
          playerStaminaCost: 0,
          heroineStaminaCost: 0,
          wage: 2,
          baseReceptionCapacity: 2,
          basePreparationPoints: 2,
          teamworkGain: 0,
          preparationPointsPerAction: 1,
        },
        {
          mode: "closed",
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          reasonId: "reason.fixture",
          apCost: 0,
          playerStaminaCost: 0,
          heroineStaminaCost: 0,
          wage: 0,
          baseReceptionCapacity: 0,
          basePreparationPoints: 0,
          teamworkGain: 0,
          preparationPointsPerAction: 0,
        },
      ],
      serviceDays: [1],
      baseDemand: [{ day: 1, segmentId: "segment.fixture", customers: 1 }],
      ledgerReasons: {
        purchase: "reason.fixture",
        serviceWage: "reason.fixture",
        openingFee: "reason.fixture",
        revenue: "reason.fixture",
        discardedFood: "reason.fixture",
        spoiledIngredient: "reason.fixture",
        facilityBuild: "reason.fixture",
        worldActionCost: "reason.fixture",
        levy: "reason.fixture",
      },
      emergencyClosure: { reputationPenalty: 1, reasonId: "reason.fixture" },
      plannedClosureReasonId: "reason.fixture",
      heroineNightRecovery: 1,
      heroineNightRecoveryReasonId: "reason.fixture",
      restRecovery: 2,
      purchaseLineLimit: 4,
      menuRecipeLimit: 2,
      dailyPreparationLimit: 2,
      openingFee: 0,
      levyAmount: 10,
      levyDue: { day: 7, phase: "evening" },
      obligationForecast: {
        visibleFrom: { day: 1, phase: "morning" },
        conservativeFrom: { day: 1, phase: "afternoon" },
        reasonId: "reason.fixture",
        recommendations: [],
      },
      endingPolicy: {
        stableMinimumCashAfterLevy: 20,
        stableMinimumReputation: 50,
        stableMinimumBuiltFacilities: 1,
        reputationCrisisBelow: 45,
        stableReasonId: "reason.ending.stable",
        dangerReasonId: "reason.ending.danger",
        arrearsReasonId: "reason.ending.arrears",
        reputationCrisisReasonId: "reason.ending.reputation_crisis",
      },
      maxNarrativeStepsPerCommand: 128,
      maxNarrativeCallDepth: 8,
    },
    content: {
      characters: [
        {
          characterId: "character.player",
          nameTextId: "text.fixture",
          actorId: "actor.player",
        },
        {
          characterId: "character.heroine",
          nameTextId: "text.fixture",
          actorId: "actor.heroine",
        },
      ],
      reasons: [
        { reasonId: "reason.fixture", textId: "text.fixture" },
        { reasonId: "reason.fixture.action", textId: "text.fixture" },
        { reasonId: "reason.fixture.aura", textId: "text.fixture" },
        { reasonId: "reason.fixture.mood", textId: "text.fixture" },
        { reasonId: "reason.fixture_adjust", textId: "text.fixture" },
        { reasonId: "reason.fixture_consume", textId: "text.fixture" },
        { reasonId: "reason.fixture_purchase", textId: "text.fixture" },
        { reasonId: "reason.ending.stable", textId: "text.fixture" },
        { reasonId: "reason.ending.danger", textId: "text.fixture" },
        { reasonId: "reason.ending.arrears", textId: "text.fixture" },
        { reasonId: "reason.ending.reputation_crisis", textId: "text.fixture" },
      ],
      actions: [
        {
          actionId: "action.fixture_story",
          labelTextId: "text.fixture",
          commandKind: "story.action.start",
          availablePhases: ["morning"],
          occupation: { kind: "none" },
          visibility: [],
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
        {
          actionId: "action.fixture_facility",
          labelTextId: "text.fixture",
          commandKind: "facility.choose",
          availablePhases: ["morning"],
          occupation: { kind: "none" },
          visibility: [],
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
        {
          actionId: "action.fixture_world",
          labelTextId: "text.fixture",
          commandKind: "world.action.begin",
          availablePhases: ["morning"],
          occupation: { kind: "fixed", phases: ["morning", "afternoon"] },
          visibility: [],
          availability: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
      ],
      storyActions: [
        {
          actionId: "action.fixture_story",
          sceneId: "scene.fixture",
          startEffects: [],
        },
      ],
      customerSegments: [{ segmentId: "segment.fixture", nameTextId: "text.fixture" }],
      modifierSources: [{ sourceId: "modifier.fixture", nameTextId: "text.fixture" }],
      ingredients: [
        {
          ingredientId: "ingredient.fixture",
          nameTextId: "text.fixture",
          unitPrice: 1,
          shelfLifeDays: 2,
          refrigeratable: true,
        },
      ],
      items: [{ itemId: "item.fixture", nameTextId: "text.fixture" }],
      recipes: [
        {
          recipeId: "recipe.fixture",
          nameTextId: "text.fixture",
          ingredients: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
          salePrice: 3,
          prepPoints: 1,
          preferences: [{ segmentId: "segment.fixture", value: 1 }],
        },
      ],
      facilities: [
        {
          facilityId: "facility.fixture",
          nameTextId: "text.fixture",
          cashCost: 5,
          modifiers: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
        {
          facilityId: "facility.fixture_bed",
          nameTextId: "text.fixture",
          cashCost: 5,
          modifiers: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
      ],
      facilityOpportunities: [
        {
          opportunityId: "action.fixture_facility",
          availability: [],
          facilityIds: ["facility.fixture", "facility.fixture_bed"],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          skipConfirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
          skipReasonId: "reason.fixture",
        },
      ],
      auras: [
        {
          auraId: "aura.fixture_timed",
          nameTextId: "text.fixture",
          reasonId: "reason.fixture.aura",
          durationPolicy: {
            kind: "countdown",
            unit: "day_end",
            defaultRemaining: 2,
            maximumRemaining: 2,
          },
          visibility: "buff",
          allowedTargets: [{ kind: "actor", actorId: "actor.player" }],
          modifiers: [],
        },
      ],
      worldActions: [
        {
          actionId: "action.fixture_world",
          nameTextId: "text.fixture",
          availability: [],
          reasonId: "reason.fixture",
          baseCashCost: 0,
          playerStaminaCost: 0,
          beginEffects: [],
          options: [
            {
              optionId: "choice.fixture_world",
              labelTextId: "text.fixture",
              availability: [],
              additionalCashCost: 0,
              preparationBonus: 0,
              beginEffects: [],
              confirmation: {
                benefitTextIds: [],
                mutuallyExcludedActionIds: [],
                majorRiskTextIds: [],
              },
            },
          ],
          steps: [
            {
              stepId: "world_step.fixture.begin",
              phase: "morning",
              apCost: 1,
              sceneId: "scene.fixture",
            },
            {
              stepId: "world_step.fixture.complete",
              phase: "afternoon",
              apCost: 1,
              sceneId: "scene.fixture",
            },
          ],
          checkId: "check.fixture",
        },
      ],
      events: [
        {
          eventId: "event.fixture",
          checkpointId: "checkpoint.fixture",
          trigger: { kind: "phase.entered", days: [1], phases: ["morning"] },
          priority: 0,
          weightedGroupId: null,
          weight: 0,
          when: [],
          sceneId: "scene.fixture",
          effects: [],
        },
      ],
      checks: [
        {
          checkId: "check.fixture",
          attribute: "intellect",
          dice: "2d6",
          bands: [
            {
              bandId: "band.fixture",
              minInclusive: 2,
              maxInclusive: null,
              effects: [],
            },
          ],
        },
      ],
      endings: [
        {
          endingId: "ending.fixture",
          status: "completed_stable",
          nameTextId: "text.fixture",
          summaryOutcomeIds: {
            relationship: "outcome.fixture.relationship",
            investigation: "outcome.fixture.investigation",
          },
          effects: [],
        },
        {
          endingId: "ending.fixture_danger",
          status: "completed_danger",
          nameTextId: "text.fixture",
          summaryOutcomeIds: {
            relationship: "outcome.fixture.relationship",
            investigation: "outcome.fixture.investigation",
          },
          effects: [],
        },
        {
          endingId: "ending.fixture_arrears",
          status: "failed_arrears",
          nameTextId: "text.fixture",
          summaryOutcomeIds: {
            relationship: "outcome.fixture.relationship",
            investigation: "outcome.fixture.investigation",
          },
          effects: [],
        },
      ],
    },
    narrative: {
      scenes: [
        {
          sceneId: "scene.fixture",
          entryNodeId: "node.fixture.end",
          nodes: [{ kind: "end", nodeId: "node.fixture.end" }],
        },
      ],
    },
  });
}

function demandOffsetV1(value: number): -1 | 0 | 1 {
  if (value === 0) return -1;
  if (value === 1) return 0;
  return 1;
}

function storyValueFromDefinitionV1(definition: StoryValueDefinitionV1): StoryValueV1 {
  switch (definition.kind) {
    case "boolean":
      return { kind: "boolean", value: definition.defaultValue };
    case "integer":
      return { kind: "integer", value: definition.defaultValue };
    case "token":
      return { kind: "token", value: definition.defaultValue };
  }
  throw new TypeError("unsupported fixture StoryValueDefinitionV1");
}

function requiredValueV1<TValue>(value: TValue | undefined, label: string): TValue {
  if (value === undefined) throw new TypeError(`missing fixture ${label}`);
  return value;
}

function createContractFixtureRulesV1(data: PocSimulationDataV1): PocRulesV1 {
  return deepFreezePocValueV1<PocRulesV1>({
    demand: {
      preview(input) {
        return {
          day: input.day,
          lines: input.seeds.map((seed) => {
            const actualCustomers = parseNonNegativeSafeInteger(
              Math.max(0, seed.baseCustomers + seed.randomOffset),
            );
            const exact = parseSafeInteger(actualCustomers);
            return {
              segmentId: seed.segmentId,
              range: { min: exact, max: exact },
              actualCustomers,
              modifiers: [],
            };
          }),
        };
      },
      resolve(input, rng) {
        return {
          lines: input.segments.map((segment) => ({
            day: segment.day,
            segmentId: segment.segmentId,
            randomOffset: demandOffsetV1(
              rng.nextInt({
                exclusiveMax: 3,
                purpose: `demand:${input.runId}:${segment.day}:${segment.segmentId}`,
              }),
            ),
          })),
        };
      },
    },
    tavern: {
      preview(input) {
        const plan = input.plan;
        const mode = data.balance.serviceModes.find((candidate) => candidate.mode === plan.mode);
        if (mode === undefined) throw new TypeError("missing fixture service mode");
        const totalCash = parseMoney(mode.wage + data.balance.openingFee);
        const active = input.basis === "active_opening_baseline";
        return {
          basis: input.basis,
          allowed: true,
          rejectionCodes: [],
          openingCosts: {
            commitment: active ? "committed" : "prospective",
            modeReasonId: mode.reasonId,
            ap: active
              ? parseNonNegativeSafeInteger(
                  input.session.baseline.ap.before - input.session.baseline.ap.after,
                )
              : mode.apCost,
            playerStamina: active
              ? parseNonNegativeSafeInteger(
                  input.session.baseline.playerStamina.before -
                    input.session.baseline.playerStamina.after,
                )
              : mode.playerStaminaCost,
            heroineStamina: active
              ? parseNonNegativeSafeInteger(
                  input.session.baseline.heroineStamina.before -
                    input.session.baseline.heroineStamina.after,
                )
              : mode.heroineStaminaCost,
            cash: {
              wage: mode.wage,
              openingFee: data.balance.openingFee,
              modifierDelta: parseSafeInteger(0),
              total: active
                ? parseMoney(
                    input.session.baseline.cashAtStart.before -
                      input.session.baseline.cashAtStart.after,
                  )
                : totalCash,
              appliedModifiers: [],
            },
            ingredientShortages: [],
          },
          receptionCapacity: mode.baseReceptionCapacity,
          preparationCapacity: mode.basePreparationPoints,
          expectedSales: plan.menu.map(({ portions, recipeId }) => {
            const exact = parseSafeInteger(portions);
            return { recipeId, range: { min: exact, max: exact } };
          }),
          cashDelta: { min: parseSafeInteger(0), max: parseSafeInteger(0) },
        };
      },
      settle() {
        return {
          orders: [],
          receptionCapacity: parseNonNegativeSafeInteger(0),
          preparationCapacity: parseNonNegativeSafeInteger(0),
          discardedPortions: [],
          appliedModifiers: [],
          effects: [],
          entries: [],
        };
      },
    },
    checks: {
      describe(input) {
        const totalBonus = parseSafeInteger(input.attributeBonus + input.preparationBonus);
        return {
          formula: "2d6+bonuses",
          totalBonus,
          possibleTotal: {
            min: parseSafeInteger(2 + totalBonus),
            max: parseSafeInteger(12 + totalBonus),
          },
          bands: input.bands.map((band) => ({
            bandId: band.bandId,
            total: {
              min: band.minInclusive,
              max: band.maxInclusive ?? parseSafeInteger(12 + totalBonus),
            },
          })),
        };
      },
      resolve(input, rng) {
        const firstDie = parseDieFace(
          rng.nextInt({ exclusiveMax: 6, purpose: `check:${input.checkId}:die:1` }) + 1,
        );
        const secondDie = parseDieFace(
          rng.nextInt({ exclusiveMax: 6, purpose: `check:${input.checkId}:die:2` }) + 1,
        );
        const totalBonus = parseSafeInteger(input.attributeBonus + input.preparationBonus);
        const total = parseSafeInteger(firstDie + secondDie + totalBonus);
        const band = input.bands.find(
          (candidate) =>
            total >= candidate.minInclusive &&
            (candidate.maxInclusive === null || total <= candidate.maxInclusive),
        );
        if (band === undefined) throw new TypeError("fixture check has no matching band");
        return {
          checkId: input.checkId,
          actorId: input.actorId,
          dice: [firstDie, secondDie],
          attributeBonus: parseAttributeBonus(input.attributeBonus),
          preparationBonus: input.preparationBonus,
          modifiers: [],
          totalBonus,
          total,
          bandId: band.bandId,
          effects: band.effects,
        };
      },
    },
    endings: {
      evaluate(input) {
        const policy = data.balance.endingPolicy;
        const arrears = input.levy.kind === "arrears";
        const stable =
          !arrears &&
          input.cash >= policy.stableMinimumCashAfterLevy &&
          input.reputation >= policy.stableMinimumReputation &&
          input.facilityIds.length >= policy.stableMinimumBuiltFacilities;
        const status = arrears
          ? "failed_arrears"
          : stable
            ? "completed_stable"
            : "completed_danger";
        const ending = requiredValueV1(
          data.content.endings.find((candidate) => candidate.status === status),
          `${status} ending`,
        );
        const reasonIds = arrears
          ? [policy.arrearsReasonId]
          : stable
            ? [policy.stableReasonId]
            : input.reputation < policy.reputationCrisisBelow
              ? [policy.dangerReasonId, policy.reputationCrisisReasonId]
              : [policy.dangerReasonId];
        const relationship = requiredValueV1(
          input.outcomes.find(
            ({ outcomeId }) => outcomeId === ending.summaryOutcomeIds.relationship,
          ),
          "relationship outcome",
        );
        const investigation = requiredValueV1(
          input.outcomes.find(
            ({ outcomeId }) => outcomeId === ending.summaryOutcomeIds.investigation,
          ),
          "investigation outcome",
        );
        return {
          endingId: ending.endingId,
          status,
          reasonIds,
          effects: ending.effects,
          summary: {
            relationship,
            investigation,
          },
        };
      },
    },
  });
}

function createContractFixtureProgramV1(): PocSimulationProgramV1 {
  const data = createContractFixtureDataV1();
  return deepFreezePocValueV1<PocSimulationProgramV1>({
    data,
    rules: createContractFixtureRulesV1(data),
  });
}

function createFixtureIntegrityV1(mode: "normal" | "modified"): RunIntegrityV1 {
  if (mode === "normal") return createPristineRunIntegrityV1();
  return runIntegrityV1Schema.parse({
    mode: "modified",
    mutationCount: 1,
    firstMutationSequence: 0,
    reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.poc.contract", sequence: 0 }],
  });
}

function createContractFixtureSnapshotV1(
  program: PocSimulationProgramV1,
  bootstrap: PocGameBootstrapInputV1,
  integrity: "normal" | "modified",
): PocGameSnapshotV1 {
  const initial = program.data.initialState;
  const dayOne = parseDayIndex(1);
  return deepFreezePocValueV1<PocGameSnapshotV1>({
    state: {
      simulation: {
        run: {
          runId: bootstrap.runId,
          initialSeed: bootstrap.rngSeed,
          status: "setup",
          completion: null,
        },
        calendar: {
          day: dayOne,
          phase: "morning",
          lifePolicyId: null,
          apRemaining: parseNonNegativeSafeInteger(0),
          eveningResolved: false,
        },
        actors: {
          player: initial.player,
          heroine: initial.heroine,
          relationship: initial.relationship,
        },
        inventory: {
          startingCash: initial.cash,
          cash: initial.cash,
          ingredientBatches: initial.ingredientBatches,
          itemStacks: initial.itemStacks,
          ledger: [],
        },
        status: { auras: initial.auras },
        facilities: { built: [], decisions: [] },
        tavern: {
          reputation: initial.reputation,
          unlockedRecipeIds: initial.unlockedRecipeIds,
          helper: initial.helper,
          preparation: { day: dayOne, actionCount: parseNonNegativeSafeInteger(0) },
          servicePlan: null,
          demandSeeds: [],
          currentDemand: null,
          serviceHistory: [],
        },
        activeWorkflow: null,
      },
      story: {
        facts: program.data.stateDefinitions.facts.map((definition) => ({
          factId: definition.factId,
          value: storyValueFromDefinitionV1(definition.value),
        })),
        quests: program.data.stateDefinitions.quests.map(({ initial: quest }) => quest),
        outcomes: program.data.stateDefinitions.outcomes.map((definition) => ({
          outcomeId: definition.outcomeId,
          value: storyValueFromDefinitionV1(definition.value),
        })),
        resolvedChecks: [],
        narrative: {
          status: "idle",
          source: null,
          cursor: null,
          callStack: [],
          stage: { backgroundAssetId: null, characters: [], transition: "cut" },
        },
      },
    },
    rng: rngStateV1Schema.parse({
      algorithm: "xorshift32-v1",
      cursor: bootstrap.rngSeed,
      rawDrawCount: 0,
    }),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createFixtureIntegrityV1(integrity),
  });
}

export function createPocGameplayFixtureV1(
  options: PocGameplayFixtureOptionsV1 = {},
): PocGameplayFixtureV1 {
  const bootstrap: PocGameBootstrapInputV1 = Object.freeze({
    rngSeed: parseNonZeroUint32(0x0002_3049),
    runId: parseRunId("00000000-0000-4000-8000-000000000401"),
  });
  const program = createContractFixtureProgramV1();
  return deepFreezePocValueV1<PocGameplayFixtureV1>({
    program,
    bootstrap,
    snapshot: createContractFixtureSnapshotV1(program, bootstrap, options.integrity ?? "normal"),
  });
}
