// SPDX-License-Identifier: MIT
import type { Digest } from "../contracts/values.js";
import { digestCanonical } from "../contracts/digest.js";
import { parseDigest } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-game-module.js";

export type BuildIdentityFacetV1 =
  "engine" | "story_simulation" | "story_presentation" | "application";

export interface ImportClosureRecordV1 {
  readonly path: string;
  readonly sha256: Digest;
  readonly facet: BuildIdentityFacetV1;
}

export interface BuildIdentityInputV1 {
  readonly engine: readonly ImportClosureRecordV1[];
  readonly storySimulation: readonly ImportClosureRecordV1[];
  readonly storyPresentation: readonly ImportClosureRecordV1[];
  readonly application: readonly ImportClosureRecordV1[];
}

export interface ResolvedBuildIdentityV1 {
  readonly engine: { readonly digest: Digest; readonly records: readonly ImportClosureRecordV1[] };
  readonly storySimulation: {
    readonly digest: Digest;
    readonly records: readonly ImportClosureRecordV1[];
  };
  readonly storyPresentation: {
    readonly digest: Digest;
    readonly records: readonly ImportClosureRecordV1[];
  };
  readonly application: {
    readonly digest: Digest;
    readonly records: readonly ImportClosureRecordV1[];
  };
}

function validatePath(path: string): void {
  const parts = path.split("/");
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    parts.some((part) => part === "" || part === "." || part === "..") ||
    parts.includes("references")
  ) {
    throw new TypeError("build identity path invalid");
  }
}

function resolveRecords(
  records: readonly ImportClosureRecordV1[],
  facet: BuildIdentityFacetV1,
  domain:
    | "project-tavern:engine:v1"
    | "project-tavern:simulation:v1"
    | "project-tavern:presentation:v1"
    | "project-tavern:application:v1",
) {
  const sorted = records.map((record) => {
    validatePath(record.path);
    parseDigest(record.sha256);
    if (record.facet !== facet) throw new TypeError("build identity facet mismatch");
    return Object.freeze({ ...record });
  });
  sorted.sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(sorted.map((record) => record.path)).size !== sorted.length) {
    throw new TypeError("duplicate build identity path");
  }
  const frozen = Object.freeze(sorted);
  return Object.freeze({ digest: digestCanonical(domain, frozen), records: frozen });
}

export function resolveBuildIdentityV1(input: BuildIdentityInputV1): ResolvedBuildIdentityV1 {
  return deepFreezeAuthoringValueV1({
    engine: resolveRecords(input.engine, "engine", "project-tavern:engine:v1"),
    storySimulation: resolveRecords(
      input.storySimulation,
      "story_simulation",
      "project-tavern:simulation:v1",
    ),
    storyPresentation: resolveRecords(
      input.storyPresentation,
      "story_presentation",
      "project-tavern:presentation:v1",
    ),
    application: resolveRecords(input.application, "application", "project-tavern:application:v1"),
  });
}
