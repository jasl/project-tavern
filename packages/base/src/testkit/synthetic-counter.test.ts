// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createFixedBootstrapEntropyV1 } from "./fixed-bootstrap-entropy.js";
import {
  createSyntheticCounterGamePackageV1,
  syntheticCounterStateSchemaV1,
} from "./synthetic-counter.js";
import { strictJsonRoundTripV1 } from "./contract-suite.js";

describe("neutral synthetic counter", () => {
  it("creates a static package and strict-round-trips state", () => {
    const entry = createSyntheticCounterGamePackageV1();
    const definition = entry.define();
    const program = definition.simulation.materializeProgram({});
    const profile = definition.simulation.createProfile(program);
    const entropy = createFixedBootstrapEntropyV1({
      uuids: ["00000000-0000-4000-8000-000000000001"],
      seeds: [143433],
    });
    const bootstrap = profile.createBootstrapInput(entropy);
    expect(bootstrap.rngSeed).toBe(143433);
    expect(
      strictJsonRoundTripV1({ count: 0 }, syntheticCounterStateSchemaV1),
    ).toEqual({ count: 0 });
    expect(entry.define()).toEqual(definition);
  });
});
