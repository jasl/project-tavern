// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parsePositiveSafeInteger } from "../contracts/values.js";
import { validateToolingFixturesV1 } from "../testkit/contract-suite.js";
import { defineStoryToolingEntry } from "./define-story-tooling-entry.js";

const fixtureIdSchema = {
  parse(value: unknown) {
    if (typeof value !== "string" || !value.startsWith("fixture.")) {
      throw new TypeError("invalid fixture ID");
    }
    return value;
  },
};
const commandSchema = { parse: (value: unknown) => value };

describe("Story tooling entry", () => {
  it("accepts deterministic fixtures and rejects duplicates", () => {
    const valid = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineToolingSupport: () => ({
        fixtures: [{ fixtureId: "fixture.zero", seed: 1, commands: [] }],
        notes: [],
      }),
    });
    expect(() =>
      validateToolingFixturesV1(valid, { fixtureIdSchema, commandSchema }),
    ).not.toThrow();

    const duplicate = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineToolingSupport: () => ({
        fixtures: [
          { fixtureId: "fixture.zero", seed: 1, commands: [] },
          { fixtureId: "fixture.zero", seed: 2, commands: [] },
        ],
        notes: [],
      }),
    });
    expect(() =>
      validateToolingFixturesV1(duplicate, {
        fixtureIdSchema,
        commandSchema,
      }),
    ).toThrow("duplicate fixture ID");
  });

  it("rejects async and nondeterministic tooling support", () => {
    const asyncEntry = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineToolingSupport: () => Promise.resolve({ fixtures: [], notes: [] }),
    });
    expect(() => validateToolingFixturesV1(asyncEntry, { fixtureIdSchema, commandSchema })).toThrow(
      "defineToolingSupport returned thenable",
    );

    let call = 0;
    const nondeterministic = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineToolingSupport: () => ({
        fixtures: [{ fixtureId: `fixture.${(call += 1)}`, seed: 1, commands: [] }],
        notes: [],
      }),
    });
    expect(() =>
      validateToolingFixturesV1(nondeterministic, { fixtureIdSchema, commandSchema }),
    ).toThrow("nondeterministic tooling support");
  });
});
