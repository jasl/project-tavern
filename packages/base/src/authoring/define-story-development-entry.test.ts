// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { defineStoryDevelopmentEntry } from "./define-story-development-entry.js";
import { validateDevelopmentFixturesV1 } from "../testkit/contract-suite.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";

const fixtureIdSchema = {
  parse(value: unknown) {
    if (typeof value !== "string" || !value.startsWith("fixture.")) {
      throw new TypeError("invalid fixture ID");
    }
    return value;
  },
};
const commandSchema = { parse: (value: unknown) => value };

describe("Story development entry", () => {
  it("accepts deterministic fixtures and rejects duplicates", () => {
    const valid = defineStoryDevelopmentEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineDevelopmentSupport: () => ({
        fixtures: [{ fixtureId: "fixture.zero", seed: 1, commands: [] }],
      }),
    });
    expect(() =>
      validateDevelopmentFixturesV1(valid, { fixtureIdSchema, commandSchema }),
    ).not.toThrow();

    const duplicate = defineStoryDevelopmentEntry({
      contractRevision: 1,
      storyIdentity: {
        id: "story.synthetic",
        revision: parsePositiveSafeInteger(1),
      },
      defineDevelopmentSupport: () => ({
        fixtures: [
          { fixtureId: "fixture.zero", seed: 1, commands: [] },
          { fixtureId: "fixture.zero", seed: 2, commands: [] },
        ],
      }),
    });
    expect(() =>
      validateDevelopmentFixturesV1(duplicate, {
        fixtureIdSchema,
        commandSchema,
      }),
    ).toThrow("duplicate fixture ID");
  });
});
