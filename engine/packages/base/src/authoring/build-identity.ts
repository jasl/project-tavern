// SPDX-License-Identifier: MIT
import type { Digest } from "../contracts/values.js";
import { digestCanonical } from "../contracts/digest.js";
import { parseDigest } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

export type BuildIdentityFacetV1 =
  "engine" | "story_simulation" | "story_presentation" | "application";

export interface ImportClosureRecordV1 {
  readonly path: string;
  readonly sha256: Digest;
  readonly facet: BuildIdentityFacetV1;
}

export interface BuildIdentityInputV1 {
  readonly engineVersion: string;
  readonly engine: readonly ImportClosureRecordV1[];
  readonly storySimulation: readonly ImportClosureRecordV1[];
  readonly storyPresentation: readonly ImportClosureRecordV1[];
  readonly application: readonly ImportClosureRecordV1[];
}

export interface ResolvedBuildIdentityV1 {
  readonly engineVersion: string;
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

function parseEngineVersion(engineVersion: unknown): string {
  if (typeof engineVersion !== "string" || !/^[\x20-\x7e]{1,64}$/u.test(engineVersion)) {
    throw new TypeError("build identity engineVersion invalid");
  }
  return engineVersion;
}

function compareUtf16CodeUnits(left: string, right: string): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function resolveRecords(
  records: readonly ImportClosureRecordV1[],
  facet: BuildIdentityFacetV1,
  domain:
    | "sillymaker:engine:v1"
    | "sillymaker:simulation:v1"
    | "sillymaker:presentation:v1"
    | "sillymaker:application:v1",
) {
  const sorted = records.map((record) => {
    validatePath(record.path);
    parseDigest(record.sha256);
    if (record.facet !== facet) throw new TypeError("build identity facet mismatch");
    return Object.freeze({ ...record });
  });
  sorted.sort((left, right) => compareUtf16CodeUnits(left.path, right.path));
  if (new Set(sorted.map((record) => record.path)).size !== sorted.length) {
    throw new TypeError("duplicate build identity path");
  }
  const frozen = Object.freeze(sorted);
  return Object.freeze({ digest: digestCanonical(domain, frozen), records: frozen });
}

export function resolveBuildIdentityV1(input: BuildIdentityInputV1): ResolvedBuildIdentityV1 {
  return deepFreezeAuthoringValueV1({
    engineVersion: parseEngineVersion(input.engineVersion),
    engine: resolveRecords(input.engine, "engine", "sillymaker:engine:v1"),
    storySimulation: resolveRecords(
      input.storySimulation,
      "story_simulation",
      "sillymaker:simulation:v1",
    ),
    storyPresentation: resolveRecords(
      input.storyPresentation,
      "story_presentation",
      "sillymaker:presentation:v1",
    ),
    application: resolveRecords(input.application, "application", "sillymaker:application:v1"),
  });
}
