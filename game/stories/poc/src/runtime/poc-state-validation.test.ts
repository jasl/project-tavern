// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { describe, expect, it } from "vitest";

import { pocReferenceRunIdsV1, pocReferenceSeedV1 } from "../content/identity.js";
import { parseRecipeId } from "../gameplay/index.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "./poc-state-validation.js";

function createInitialValidationFixtureV1() {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const state = resolved.gameSimulation.createInitialState(
    Object.freeze({
      rngSeed: pocReferenceSeedV1,
      runId: pocReferenceRunIdsV1["strategy.cash_first"],
    }),
  );
  return Object.freeze({ resolved, state });
}

describe("PoC production State validation", () => {
  it("accepts the resolved Story initial State", () => {
    const { resolved, state } = createInitialValidationFixtureV1();

    expect(validatePocStateReferencesV1(resolved, state)).toEqual([]);
    expect(
      validatePocStateInvariantsV1(
        resolved,
        Object.freeze({ state, commandSequence: parseNonNegativeSafeInteger(0) }),
      ),
    ).toEqual([]);
  });

  it("rejects a schema-valid unknown stable reference", () => {
    const { resolved, state } = createInitialValidationFixtureV1();
    const unknownRecipeId = parseRecipeId("recipe.validation_unknown");
    const invalidState = resolved.gameSimulation.stateSchema.parse({
      ...state,
      simulation: {
        ...state.simulation,
        tavern: {
          ...state.simulation.tavern,
          unlockedRecipeIds: [unknownRecipeId, ...state.simulation.tavern.unlockedRecipeIds],
        },
      },
    });

    expect(validatePocStateReferencesV1(resolved, invalidState)).toEqual([
      "reference.unknown:references.poc.recipe:state.simulation.tavern.unlockedRecipeIds.0",
    ]);
  });

  it("reports a schema-valid local invariant violation", () => {
    const { resolved, state } = createInitialValidationFixtureV1();
    const invalidState = resolved.gameSimulation.stateSchema.parse({
      ...state,
      simulation: {
        ...state.simulation,
        actors: {
          ...state.simulation.actors,
          player: {
            ...state.simulation.actors.player,
            stamina: {
              ...state.simulation.actors.player.stamina,
              current: parseNonNegativeSafeInteger(
                state.simulation.actors.player.stamina.maximum + 1,
              ),
            },
          },
        },
      },
    });

    expect(
      validatePocStateInvariantsV1(
        resolved,
        Object.freeze({
          state: invalidState,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
      ),
    ).toEqual(["module.actors:stamina.above_maximum"]);
  });
});
