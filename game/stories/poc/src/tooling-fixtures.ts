// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { DeepReadonly, NonZeroUint32 } from "@sillymaker/base";

import { pocReferenceSeedV1 } from "./content/identity.js";
import {
  deepFreezePocValueV1,
  parseFixtureId,
  pocGameCommandSchemaV1,
  type FixtureId,
  type PocGameCommandV1,
} from "./gameplay/index.js";

const pocToolingFixtureStrategyIdsV1 = Object.freeze([
  "strategy.cash_first",
  "strategy.relationship_first",
  "strategy.investigation_first",
  "strategy.full_delegation",
  "strategy.two_closures_recovery",
  "strategy.explicit_failure",
] as const);

type PocToolingFixtureStrategyIdV1 = (typeof pocToolingFixtureStrategyIdsV1)[number];

export interface PocStoryToolingFixtureV1 {
  readonly fixtureId: FixtureId;
  readonly seed: NonZeroUint32;
  readonly commands: readonly DeepReadonly<PocGameCommandV1>[];
}

const fixtureIdByStrategyIdV1 = Object.freeze({
  "strategy.cash_first": parseFixtureId("fixture.poc_cash_first"),
  "strategy.relationship_first": parseFixtureId("fixture.poc_d5_relationship"),
  "strategy.investigation_first": parseFixtureId("fixture.poc_d5_investigation"),
  "strategy.full_delegation": parseFixtureId("fixture.poc_full_delegation"),
  "strategy.two_closures_recovery": parseFixtureId("fixture.poc_two_closures_recovery"),
  "strategy.explicit_failure": parseFixtureId("fixture.poc_explicit_failure"),
} satisfies Readonly<Record<PocToolingFixtureStrategyIdV1, FixtureId>>);

const commandLiteralsByStrategyIdV1 = {
  "strategy.cash_first": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.balanced",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 7,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 7,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.hunter_stew",
            portions: 7,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 7,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 7,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.hunter_stew",
            portions: 7,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.ale",
          quantity: 9,
        },
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 8,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 10,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 10,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 9,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.ale_bread",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.comfortable_bed",
      },
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.traveler_roast",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.ale",
          quantity: 6,
        },
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 6,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 6,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 2,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.traveler_roast",
            portions: 6,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 9,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
  "strategy.relationship_first": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.night_owl",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 3,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 8,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 8,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 12,
        },
      ],
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.comfortable_bed",
      },
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.ale",
          quantity: 6,
        },
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 7,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 1,
        },
      ],
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "story.action.start",
      actionId: "action.repair_sign_with_heroine",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.repair_sign_with_heroine",
      nodeId: "node.repair_sign.choice",
      choiceId: "choice.repair_sign.cooperate",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.ale_bread",
            portions: 6,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 1,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
  "strategy.investigation_first": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.balanced",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 3,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 14,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 14,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 19,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.cold_storage",
      },
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "world.action.begin",
      actionId: "action.old_trade_road",
      optionId: "choice.old_trade_road.prepared",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "world.action.complete",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 6,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
  "strategy.full_delegation": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.balanced",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 3,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 1,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 5,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 13,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 13,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 16,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.cold_storage",
      },
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "world.action.begin",
      actionId: "action.old_trade_road",
      optionId: "choice.old_trade_road.prepared",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "world.action.complete",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "delegated",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 1,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
  "strategy.two_closures_recovery": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.balanced",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 3,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.comfortable_bed",
      },
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "story.action.start",
      actionId: "action.repair_sign_with_heroine",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.repair_sign_with_heroine",
      nodeId: "node.repair_sign.choice",
      choiceId: "choice.repair_sign.decline",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 5,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 9,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "actor.rest",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 5,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
  "strategy.explicit_failure": [
    {
      kind: "run.start",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "policy.choose",
      policyId: "policy.balanced",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 2,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 6,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 2,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 4,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.supplier_invoice",
      nodeId: "node.supplier_invoice.choice",
      choiceId: "choice.supplier_invoice.intellect_b",
    },
    {
      kind: "inventory.buy",
      lines: [
        {
          ingredientId: "ingredient.coarse_grain",
          quantity: 4,
        },
        {
          ingredientId: "ingredient.fresh_meat",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.herb",
          quantity: 3,
        },
        {
          ingredientId: "ingredient.root_vegetable",
          quantity: 7,
        },
      ],
    },
    {
      kind: "actor.prepare_food",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "assisted",
        menu: [
          {
            recipeId: "recipe.grain_root_porridge",
            portions: 4,
          },
          {
            recipeId: "recipe.hunter_stew",
            portions: 3,
          },
        ],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.opening.start",
    },
    {
      kind: "tavern.opening.finalize",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "facility.choose",
      opportunityId: "action.facility_window",
      choice: {
        kind: "build",
        facilityId: "facility.cold_storage",
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "story.action.start",
      actionId: "action.repair_sign_with_heroine",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "narrative.choose",
      sceneId: "scene.repair_sign_with_heroine",
      nodeId: "node.repair_sign.choice",
      choiceId: "choice.repair_sign.decline",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "tavern.plan.set",
      plan: {
        mode: "closed",
        menu: [],
      },
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "narrative.advance",
    },
    {
      kind: "calendar.advance_phase",
    },
    {
      kind: "levy.pay",
    },
  ],
} as const;

function createPocStoryToolingFixtureV1(
  strategyId: PocToolingFixtureStrategyIdV1,
): DeepReadonly<PocStoryToolingFixtureV1> {
  return deepFreezePocValueV1({
    fixtureId: fixtureIdByStrategyIdV1[strategyId],
    seed: pocReferenceSeedV1,
    commands: commandLiteralsByStrategyIdV1[strategyId].map((command) =>
      pocGameCommandSchemaV1.parse(command),
    ),
  });
}

export const pocReferenceToolingFixtureByStrategyIdV1 = Object.freeze(
  Object.fromEntries(
    pocToolingFixtureStrategyIdsV1.map((strategyId) => [
      strategyId,
      createPocStoryToolingFixtureV1(strategyId),
    ]),
  ),
) as Readonly<Record<PocToolingFixtureStrategyIdV1, DeepReadonly<PocStoryToolingFixtureV1>>>;

export const pocStoryToolingFixturesV1 = Object.freeze(
  pocToolingFixtureStrategyIdsV1.map(
    (strategyId) => pocReferenceToolingFixtureByStrategyIdV1[strategyId],
  ),
);
