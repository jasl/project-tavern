// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "../contracts/digest.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";
import {
  definePatchSlot,
  definePresentationPatchSurface,
} from "./patch-surface.js";
import { resolveHotfixesV1 } from "./hotfix-resolver.js";

describe("Hotfix resolution", () => {
  it("keeps presentation replacement out of simulation PatchSet identity", () => {
    const sourceDigest = digestBytes(new TextEncoder().encode("default"));
    const surface = definePresentationPatchSurface({
      title: definePatchSlot({
        symbolId: "text.title",
        kind: "text",
        contractRevision: parsePositiveSafeInteger(1),
        defaultProviderSourceDigest: sourceDigest,
        defaultValue: "Before",
      }),
    });
    const base = resolveHotfixesV1({}, surface, [], {
      id: "story.synthetic-counter",
      revision: parsePositiveSafeInteger(1),
    });
    const patched = resolveHotfixesV1(
      {},
      surface,
      [
        {
          manifest: {
            identity: { id: "hotfix.title", revision: parsePositiveSafeInteger(1) },
            targetStoryId: "story.synthetic-counter",
            targetStoryRevision: parsePositiveSafeInteger(1),
            targets: [
              {
                surface: "presentation" as const,
                symbolId: "text.title",
                expectedProviderDigest: sourceDigest,
              },
            ],
            requires: [],
            conflicts: [],
            supersedes: [],
          },
          sourceDigest: digestBytes(new TextEncoder().encode("hotfix")),
          install(context: { presentation: { replace(symbolId: string, value: unknown): void } }) {
            context.presentation.replace("text.title", "After");
          },
        },
      ],
      { id: "story.synthetic-counter", revision: parsePositiveSafeInteger(1) },
    );
    expect(patched.patchSet.simulationDigest).toBe(
      base.patchSet.simulationDigest,
    );
    expect(patched.patchSet.presentationDigest).not.toBe(
      base.patchSet.presentationDigest,
    );
    expect(patched.presentationValues.title).toBe("After");
  });
});
