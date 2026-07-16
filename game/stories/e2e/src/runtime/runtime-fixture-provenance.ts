// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  canonicalJsonBytes,
  parseDigest,
  parsePositiveSafeInteger,
  type BuildProvenanceV1,
  type DeepReadonly,
  type Digest,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import { requireExactObjectV1 } from "../gameplay/contracts/state.js";

type PatchSetIdentityV1 = BuildProvenanceV1["resolved"]["patchSet"];

export interface RuntimeFixtureBlockingProvenanceV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly engineDigest: Digest;
  readonly simulationDigest: Digest;
}

export interface RuntimeFixtureDiagnosticProvenanceV1 {
  readonly storyDigest: Digest;
  readonly presentationDigest: Digest;
  readonly patchSet: PatchSetIdentityV1;
  readonly engineVersion: string;
  readonly appBuildId: Digest;
}

export interface RuntimeFixtureProvenanceV1 {
  readonly formatRevision: 1;
  readonly blocking: RuntimeFixtureBlockingProvenanceV1;
  readonly diagnosticAtGeneration: RuntimeFixtureDiagnosticProvenanceV1;
}

export type RuntimeFixtureProvenanceModeV1 = "read_only_verification" | "fixture_generation";

function canonicalDataEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return leftBytes.every((byte, index) => byte === rightBytes[index]);
}

/**
 * Keeps Save/replay compatibility provenance blocking while preserving generation diagnostics as
 * immutable evidence. A writer must additionally prove that its diagnostic-at-generation tuple is
 * current before it can produce new reviewed bytes.
 */
export function isRuntimeFixtureProvenanceCurrentV1(
  live: DeepReadonly<RuntimeFixtureProvenanceV1>,
  frozen: DeepReadonly<RuntimeFixtureProvenanceV1>,
  mode: RuntimeFixtureProvenanceModeV1,
): boolean {
  if (!canonicalDataEqualV1(live.blocking, frozen.blocking)) return false;
  switch (mode) {
    case "read_only_verification":
      return true;
    case "fixture_generation":
      return canonicalDataEqualV1(live.diagnosticAtGeneration, frozen.diagnosticAtGeneration);
    default:
      throw new TypeError("invalid runtime fixture provenance mode");
  }
}

function parseNonemptyAsciiTextV1(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[\x20-\x7e]{1,128}$/u.test(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parsePatchSetIdentityV1(value: unknown): PatchSetIdentityV1 {
  const fields = requireExactObjectV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "runtime fixture PatchSet identity",
  );
  if (!Array.isArray(fields.appliedHotfixes) || fields.appliedHotfixes.length !== 0) {
    throw new TypeError("runtime fixture provenance requires the reviewed empty PatchSet");
  }
  return Object.freeze({
    digest: parseDigest(fields.digest),
    simulationDigest: parseDigest(fields.simulationDigest),
    presentationDigest: parseDigest(fields.presentationDigest),
    appliedHotfixes: Object.freeze([]),
  });
}

export function parseRuntimeFixtureProvenanceV1(value: unknown): RuntimeFixtureProvenanceV1 {
  const fields = requireExactObjectV1(
    value,
    ["formatRevision", "blocking", "diagnosticAtGeneration"],
    "runtime fixture provenance",
  );
  if (fields.formatRevision !== 1) {
    throw new TypeError("unsupported runtime fixture provenance revision");
  }
  const blocking = requireExactObjectV1(
    fields.blocking,
    [
      "storyId",
      "storyRevision",
      "stateContractRevision",
      "stateContractDigest",
      "engineDigest",
      "simulationDigest",
    ],
    "runtime fixture blocking provenance",
  );
  const diagnostic = requireExactObjectV1(
    fields.diagnosticAtGeneration,
    ["storyDigest", "presentationDigest", "patchSet", "engineVersion", "appBuildId"],
    "runtime fixture diagnostic provenance",
  );
  return Object.freeze({
    formatRevision: 1,
    blocking: Object.freeze({
      storyId: parseNonemptyAsciiTextV1(blocking.storyId, "runtime fixture Story ID"),
      storyRevision: parsePositiveSafeInteger(blocking.storyRevision),
      stateContractRevision: parsePositiveSafeInteger(blocking.stateContractRevision),
      stateContractDigest: parseDigest(blocking.stateContractDigest),
      engineDigest: parseDigest(blocking.engineDigest),
      simulationDigest: parseDigest(blocking.simulationDigest),
    }),
    diagnosticAtGeneration: Object.freeze({
      storyDigest: parseDigest(diagnostic.storyDigest),
      presentationDigest: parseDigest(diagnostic.presentationDigest),
      patchSet: parsePatchSetIdentityV1(diagnostic.patchSet),
      engineVersion: parseNonemptyAsciiTextV1(
        diagnostic.engineVersion,
        "runtime fixture Engine version",
      ),
      appBuildId: parseDigest(diagnostic.appBuildId),
    }),
  });
}

export function projectRuntimeFixtureProvenanceV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
  appBuildId: Digest,
): RuntimeFixtureProvenanceV1 {
  return parseRuntimeFixtureProvenanceV1({
    formatRevision: 1,
    blocking: {
      storyId: provenance.story.id,
      storyRevision: provenance.story.revision,
      stateContractRevision: provenance.resolved.stateContractRevision,
      stateContractDigest: provenance.resolved.stateContractDigest,
      engineDigest: provenance.engine.digest,
      simulationDigest: provenance.resolved.simulationDigest,
    },
    diagnosticAtGeneration: {
      storyDigest: provenance.story.digest,
      presentationDigest: provenance.resolved.presentationDigest,
      patchSet: provenance.resolved.patchSet,
      engineVersion: provenance.engine.version,
      appBuildId,
    },
  });
}

export const runtimeFixtureProvenanceV1 = parseRuntimeFixtureProvenanceV1({
  formatRevision: 1,
  blocking: {
    storyId: "story.e2e",
    storyRevision: 1,
    stateContractRevision: 1,
    stateContractDigest: "sha256:e3c1273a0bd3514a7a75a848873051f39170026624ae47ccae6790640b69897e",
    engineDigest: "sha256:495a4e46f2352a19e68838b62e1bd63d0b500d1408c0dc6d911407ff74838077",
    simulationDigest: "sha256:6ef07f9708aca997c1ab2fe782ed038f4d5757274d0b3f87dcfbd6877a981ca5",
  },
  diagnosticAtGeneration: {
    storyDigest: "sha256:be333b6c3a0a99f6c814763a138c5808bffa07765d3161c2f37981318988bbe5",
    presentationDigest: "sha256:87a71df2cbd6acbd248fddd5cf6415b64f812d29cba36fc1904b9ae588344aa2",
    patchSet: {
      digest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      simulationDigest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      presentationDigest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      appliedHotfixes: [],
    },
    engineVersion: "0.0.0",
    appBuildId: "sha256:1f8e2061ff30a923160b1e31c9910d1a607a2ee50c44d3c8f955c455bb1ab997",
  },
});
