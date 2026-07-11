// SPDX-License-Identifier: MIT
import { digestBytes } from "../contracts/digest.js";
import type { BuildIdentityInputV1 } from "../authoring/build-identity.js";

const sourceDigest = digestBytes(Uint8Array.of(0x73, 0x72, 0x63));

export const deterministicBuildIdentityInputV1: BuildIdentityInputV1 =
  Object.freeze({
    engine: Object.freeze([
      Object.freeze({
        path: "packages/base/src/index.ts",
        sha256: sourceDigest,
        facet: "engine" as const,
      }),
    ]),
    storySimulation: Object.freeze([
      Object.freeze({
        path: "packages/base/src/testkit/synthetic-counter.ts",
        sha256: sourceDigest,
        facet: "story_simulation" as const,
      }),
    ]),
    storyPresentation: Object.freeze([
      Object.freeze({
        path: "packages/base/src/testkit/synthetic-counter.ts",
        sha256: sourceDigest,
        facet: "story_presentation" as const,
      }),
    ]),
    application: Object.freeze([]),
  });
