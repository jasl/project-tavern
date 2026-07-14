// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import { markRunModifiedV1 } from "./run-integrity.js";

describe("RunIntegrity finalization", () => {
  it("marks successful mutations atomically and deduplicates reason kinds", () => {
    const pristine = createPristineRunIntegrityV1();
    const first = markRunModifiedV1(pristine, {
      kind: "debug_command",
      commandKind: "debug.e2e.increment",
      sequence: parseNonNegativeSafeInteger(3),
    });
    const second = markRunModifiedV1(first, {
      kind: "debug_command",
      commandKind: "debug.e2e.increment",
      sequence: parseNonNegativeSafeInteger(4),
    });

    expect(second).toEqual({
      mode: "modified",
      mutationCount: 2,
      firstMutationSequence: 3,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.e2e.increment",
          sequence: 3,
        },
      ],
    });
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(second.reasons)).toBe(true);
  });

  it("retains the first reason of each stable kind in first-seen order", () => {
    const debug = markRunModifiedV1(createPristineRunIntegrityV1(), {
      kind: "debug_command",
      commandKind: "debug.e2e.counter.add",
      sequence: parseNonNegativeSafeInteger(2),
    });
    const fixture = markRunModifiedV1(debug, {
      kind: "fixture_anchor",
      fixtureId: "fixture.e2e.modified",
      sequence: parseNonNegativeSafeInteger(3),
    });
    const bundle = markRunModifiedV1(fixture, {
      kind: "debug_bundle_anchor",
      sequence: parseNonNegativeSafeInteger(4),
    });
    const duplicateFixture = markRunModifiedV1(bundle, {
      kind: "fixture_anchor",
      fixtureId: "fixture.e2e.other",
      sequence: parseNonNegativeSafeInteger(5),
    });

    expect(duplicateFixture.mutationCount).toBe(4);
    expect(duplicateFixture.firstMutationSequence).toBe(2);
    expect(duplicateFixture.reasons.map(({ kind }) => kind)).toEqual([
      "debug_command",
      "fixture_anchor",
      "debug_bundle_anchor",
    ]);
    expect(duplicateFixture.reasons[1]).toEqual({
      kind: "fixture_anchor",
      fixtureId: "fixture.e2e.modified",
      sequence: 3,
    });
  });

  it("rejects an invalid input and never truncates mutationCount", () => {
    expect(() =>
      markRunModifiedV1(
        {
          mode: "modified",
          mutationCount: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
          firstMutationSequence: parseNonNegativeSafeInteger(1),
          reasons: Object.freeze([
            Object.freeze({
              kind: "debug_bundle_anchor" as const,
              sequence: parseNonNegativeSafeInteger(1),
            }),
          ]),
        },
        {
          kind: "fixture_anchor",
          fixtureId: "fixture.synthetic",
          sequence: parseNonNegativeSafeInteger(2),
        },
      ),
    ).toThrow();
    expect(() =>
      markRunModifiedV1(createPristineRunIntegrityV1(), {
        kind: "debug_bundle_anchor",
        sequence: -1 as never,
      }),
    ).toThrow();
  });
});
