// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { validateDevelopmentFixturesV1, validateStoryV1 } from "@project-tavern/base/testkit";

import { sandboxDevelopmentEntryV1 } from "./development.js";
import { sandboxCommandSchemaV1 } from "./contracts.js";
import { resolveSandboxStoryForTestV1, sandboxStoryEntryV1 } from "./story-entry.js";

describe("Sandbox Story contract", () => {
  it("resolves a static Profile with one state owner and one stateless service", () => {
    expect(() => validateStoryV1(sandboxStoryEntryV1)).not.toThrow();
    const resolved = resolveSandboxStoryForTestV1();
    expect(resolved.profile.modules).toHaveLength(2);
    const [counter, parity] = resolved.profile.modules;
    expect(counter?.bindingKind).toBe("stateful");
    expect(parity).toMatchObject({
      bindingKind: "stateless",
      owner: null,
      ownerOperationSchema: null,
      ownerProposalSchema: null,
    });
    expect(parity).not.toHaveProperty("stateSchema");
    expect(parity).not.toHaveProperty("createInitialState");
    expect(Object.isFrozen(resolved.profile)).toBe(true);
  });

  it("keeps fixtures in the separate development entry", () => {
    expect(sandboxStoryEntryV1).not.toHaveProperty("development");
    expect(() =>
      validateDevelopmentFixturesV1(sandboxDevelopmentEntryV1, {
        fixtureIdSchema: {
          parse(value) {
            if (value !== "fixture.sandbox.session-zero") {
              throw new TypeError("invalid Sandbox fixture ID");
            }
            return value;
          },
        },
        commandSchema: sandboxCommandSchemaV1,
      }),
    ).not.toThrow();
  });
});
