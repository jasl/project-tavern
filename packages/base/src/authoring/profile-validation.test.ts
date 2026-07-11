// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { defineGameModule } from "./define-game-module.js";
import { defineGameProfile } from "./define-game-profile.js";
import type { GameModuleBindingV1 } from "../contracts/module.js";
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "../contracts/values.js";

const passthroughSchema = Object.freeze({ parse: (value: unknown) => value });

function stateful(id: string, slot: string, dependencies: string[] = []) {
  return defineGameModule({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId(slot)],
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: passthroughSchema,
    ownerOperationSchema: passthroughSchema,
    ownerProposalSchema: passthroughSchema,
    localInvariants: [],
    owner: {
      propose: () => ({ kind: "proposed" as const, proposal: { payload: null, facts: [] } }),
      apply: (state: unknown) => state,
    },
    queries: null,
    createInitialState: () => ({ count: 0 }),
    createReadPort: (state: unknown) => state,
  });
}

function stateless(id: string, dependencies: string[] = []) {
  return defineGameModule({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    services: Object.freeze({ parity: (value: number) => value % 2 }),
  });
}

function profile(modules: readonly GameModuleBindingV1[]) {
  return {
    contractRevision: 1 as const,
    modules,
    stateSchema: passthroughSchema,
    commandSchema: passthroughSchema,
    factSchema: passthroughSchema,
    rejectionSchema: passthroughSchema,
    debugCommandSchema: passthroughSchema,
    coordinator: {
      executeAttempt: () => {
        throw new Error("not exercised");
      },
      createQueries: () => ({}),
    },
    createBootstrapInput: () => ({ rngSeed: 1 }),
    createInitialState: () => ({}),
    projectView: () => ({}),
  };
}

describe("Profile invariants", () => {
  it("accepts one stateful and one stateless module", () => {
    const counter = stateful("synthetic.counter", "simulation.counter");
    const parity = stateless("synthetic.parity", ["synthetic.counter"]);
    const resolved = defineGameProfile(profile([counter, parity]));
    expect(resolved.modules).toHaveLength(2);
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it("rejects duplicate IDs, slots, missing dependencies, and cycles", () => {
    expect(() =>
      defineGameProfile(
        profile([
          stateful("synthetic.counter", "simulation.counter"),
          stateful("synthetic.counter", "simulation.other"),
        ]),
      ),
    ).toThrow("duplicate Module ID");
    expect(() =>
      defineGameProfile(
        profile([
          stateful("synthetic.counter", "simulation.counter"),
          stateful("synthetic.other", "simulation.counter"),
        ]),
      ),
    ).toThrow("duplicate State slot");
    expect(() =>
      defineGameProfile(profile([stateless("synthetic.parity", ["synthetic.missing"])])),
    ).toThrow("missing dependency");
    expect(() =>
      defineGameProfile(
        profile([
          stateless("synthetic.left", ["synthetic.right"]),
          stateless("synthetic.right", ["synthetic.left"]),
        ]),
      ),
    ).toThrow("dependency cycle");
  });
});
