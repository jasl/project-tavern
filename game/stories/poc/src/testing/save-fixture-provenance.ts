// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseDigest,
  parsePositiveSafeInteger,
  type BuildProvenanceV1,
  type DeepReadonly,
  type Digest,
  type IsoUtcInstant,
  type PositiveSafeInteger,
} from "@sillymaker/base";

export const pocSaveCaptureIdsV1 = Object.freeze([
  "auto_opening",
  "auto_post_opening",
  "quick_world_action",
  "manual_completed",
] as const);

export type PocSaveCaptureIdV1 = (typeof pocSaveCaptureIdsV1)[number];

export interface PocSaveFixtureCaptureProvenanceV1 {
  readonly savedAt: IsoUtcInstant;
  readonly expectedRecordRevision: PositiveSafeInteger;
}

export interface PocSaveFixtureProvenanceV1 {
  readonly contractRevision: 1;
  readonly saveFormatRevision: 1;
  readonly blocking: {
    readonly storyId: string;
    readonly storyRevision: PositiveSafeInteger;
    readonly stateContractRevision: PositiveSafeInteger;
    readonly stateContractDigest: Digest;
    readonly engineDigest: Digest;
    readonly simulationDigest: Digest;
  };
  readonly diagnosticAtGeneration: {
    readonly storyDigest: Digest;
    readonly presentationDigest: Digest;
    readonly patchSet: BuildProvenanceV1["resolved"]["patchSet"];
    readonly engineVersion: string;
    readonly appBuildId: Digest;
  };
  readonly captures: Readonly<Record<PocSaveCaptureIdV1, PocSaveFixtureCaptureProvenanceV1>>;
}

type ExactFieldsV1<TField extends string> = Readonly<Record<TField, unknown>>;

function exactFieldsV1<const TFields extends readonly string[]>(
  value: unknown,
  expectedFields: TFields,
  label: string,
): ExactFieldsV1<TFields[number]> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedFields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const field of expectedFields) {
    const descriptor = descriptors[field];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${field}`);
    }
  }
  return value as ExactFieldsV1<TFields[number]>;
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parseIsoUtcInstantV1(value: unknown): IsoUtcInstant {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError("invalid PoC Save fixture timestamp");
  }
  return value as IsoUtcInstant;
}

function parsePatchSetV1(value: unknown): BuildProvenanceV1["resolved"]["patchSet"] {
  const fields = exactFieldsV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PoC Save fixture PatchSet",
  );
  if (
    !Array.isArray(fields.appliedHotfixes) ||
    Object.getPrototypeOf(fields.appliedHotfixes) !== Array.prototype ||
    fields.appliedHotfixes.length !== 0 ||
    Reflect.ownKeys(fields.appliedHotfixes).length !== 1
  ) {
    throw new TypeError("PoC Save fixtures require the reviewed empty PatchSet");
  }
  return Object.freeze({
    digest: parseDigest(fields.digest),
    simulationDigest: parseDigest(fields.simulationDigest),
    presentationDigest: parseDigest(fields.presentationDigest),
    appliedHotfixes: Object.freeze([]),
  });
}

function parseCaptureV1(value: unknown): PocSaveFixtureCaptureProvenanceV1 {
  const fields = exactFieldsV1(
    value,
    ["savedAt", "expectedRecordRevision"],
    "PoC Save fixture capture provenance",
  );
  return Object.freeze({
    savedAt: parseIsoUtcInstantV1(fields.savedAt),
    expectedRecordRevision: parsePositiveSafeInteger(fields.expectedRecordRevision),
  });
}

export function parsePocSaveFixtureProvenanceV1(value: unknown): PocSaveFixtureProvenanceV1 {
  const fields = exactFieldsV1(
    value,
    ["contractRevision", "saveFormatRevision", "blocking", "diagnosticAtGeneration", "captures"],
    "PoC Save fixture provenance",
  );
  if (fields.contractRevision !== 1 || fields.saveFormatRevision !== 1) {
    throw new TypeError("unsupported PoC Save fixture provenance revision");
  }
  const blocking = exactFieldsV1(
    fields.blocking,
    [
      "storyId",
      "storyRevision",
      "stateContractRevision",
      "stateContractDigest",
      "engineDigest",
      "simulationDigest",
    ],
    "PoC Save fixture blocking provenance",
  );
  const diagnostic = exactFieldsV1(
    fields.diagnosticAtGeneration,
    ["storyDigest", "presentationDigest", "patchSet", "engineVersion", "appBuildId"],
    "PoC Save fixture diagnostic provenance",
  );
  const captures = exactFieldsV1(fields.captures, pocSaveCaptureIdsV1, "PoC Save fixture captures");
  return Object.freeze({
    contractRevision: 1 as const,
    saveFormatRevision: 1 as const,
    blocking: Object.freeze({
      storyId: nonemptyStringV1(blocking.storyId, "PoC Save fixture Story ID"),
      storyRevision: parsePositiveSafeInteger(blocking.storyRevision),
      stateContractRevision: parsePositiveSafeInteger(blocking.stateContractRevision),
      stateContractDigest: parseDigest(blocking.stateContractDigest),
      engineDigest: parseDigest(blocking.engineDigest),
      simulationDigest: parseDigest(blocking.simulationDigest),
    }),
    diagnosticAtGeneration: Object.freeze({
      storyDigest: parseDigest(diagnostic.storyDigest),
      presentationDigest: parseDigest(diagnostic.presentationDigest),
      patchSet: parsePatchSetV1(diagnostic.patchSet),
      engineVersion: nonemptyStringV1(diagnostic.engineVersion, "PoC Save fixture engine version"),
      appBuildId: parseDigest(diagnostic.appBuildId),
    }),
    captures: Object.freeze({
      auto_opening: parseCaptureV1(captures.auto_opening),
      auto_post_opening: parseCaptureV1(captures.auto_post_opening),
      quick_world_action: parseCaptureV1(captures.quick_world_action),
      manual_completed: parseCaptureV1(captures.manual_completed),
    }),
  });
}

const reviewedCaptureProvenanceV1 = Object.freeze({
  auto_opening: Object.freeze({
    savedAt: "2026-07-15T10:00:00.000Z",
    expectedRecordRevision: 1,
  }),
  auto_post_opening: Object.freeze({
    savedAt: "2026-07-15T10:01:00.000Z",
    expectedRecordRevision: 2,
  }),
  quick_world_action: Object.freeze({
    savedAt: "2026-07-15T10:02:00.000Z",
    expectedRecordRevision: 1,
  }),
  manual_completed: Object.freeze({
    savedAt: "2026-07-15T10:03:00.000Z",
    expectedRecordRevision: 1,
  }),
});

export function projectPocSaveFixtureProvenanceV1(input: {
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly appBuildId: Digest;
}): PocSaveFixtureProvenanceV1 {
  return parsePocSaveFixtureProvenanceV1({
    contractRevision: 1,
    saveFormatRevision: 1,
    blocking: {
      storyId: input.provenance.story.id,
      storyRevision: input.provenance.story.revision,
      stateContractRevision: input.provenance.resolved.stateContractRevision,
      stateContractDigest: input.provenance.resolved.stateContractDigest,
      engineDigest: input.provenance.engine.digest,
      simulationDigest: input.provenance.resolved.simulationDigest,
    },
    diagnosticAtGeneration: {
      storyDigest: input.provenance.story.digest,
      presentationDigest: input.provenance.resolved.presentationDigest,
      patchSet: input.provenance.resolved.patchSet,
      engineVersion: input.provenance.engine.version,
      appBuildId: input.appBuildId,
    },
    captures: reviewedCaptureProvenanceV1,
  });
}

export const pocSaveFixtureProvenanceV1 = parsePocSaveFixtureProvenanceV1({
  contractRevision: 1,
  saveFormatRevision: 1,
  blocking: {
    storyId: "week.poc_001",
    storyRevision: 1,
    stateContractRevision: 1,
    stateContractDigest: "sha256:16d04638a833b9ac79332a4539263a41a0d9492c06c5c62f3112120ecfcd135b",
    engineDigest: "sha256:028f85b8bb9beb5b9efd46d3b7ce287ec5ca726381a21f5fbb628651267e37f0",
    simulationDigest: "sha256:fe0c1ec195ca66fcb4894bcb08dbd58452b6d2fca6546eb0670ec715d512a5a5",
  },
  diagnosticAtGeneration: {
    storyDigest: "sha256:56d9489d88414dcfad4f85bced9c40569f41d7ad108fca4f531354be3b88b300",
    presentationDigest: "sha256:90ae2bbb6125b69c6088d297cde298a307cc1f2522d3b20651a581fb723a6ff8",
    patchSet: {
      digest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      simulationDigest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      presentationDigest: "sha256:075e4a3753319341f977756b786b3423038b6610c7c2cf57df51d3ded5701988",
      appliedHotfixes: [],
    },
    engineVersion: "SillyMaker synthetic-test",
    appBuildId: "sha256:618b05b06b225571d3b5bc1e08d7ca1d3dc9336c35e31b960e52281b7acf1f29",
  },
  captures: reviewedCaptureProvenanceV1,
});
