// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "../../contracts/hotfix.js";
import type { BuildProvenanceV1 } from "../../contracts/provenance.js";
import type {
  SaveCodecContextV1,
  SaveCompatibilityClassificationV1,
  SaveImportInvariantViewV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.js";
import type { Digest, NonNegativeSafeInteger, RuntimeSchemaV1 } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.js";
import { classifySaveCompatibilityV1, validateSaveImportCandidateV1 } from "./compatibility.js";

const digestV1 = (label: string): Digest =>
  digestBytes(new TextEncoder().encode(`compatibility:${label}`));

function makePatchSetV1(label = "same", simulationLabel = label): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch-set:${label}`),
    simulationDigest: digestV1(`simulation-patch-set:${simulationLabel}`),
    presentationDigest: digestV1(`presentation-patch-set:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

interface ProvenanceOptionsV1 {
  readonly storyId?: string;
  readonly storyRevision?: number;
  readonly storyDigest?: Digest;
  readonly engineVersion?: string;
  readonly engineDigest?: Digest;
  readonly stateContractRevision?: number;
  readonly stateContractDigest?: Digest;
  readonly simulationDigest?: Digest;
  readonly presentationDigest?: Digest;
  readonly patchSet?: PatchSetIdentityV1;
}

function makeProvenanceV1(options: ProvenanceOptionsV1 = {}): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: options.storyId ?? "story.synthetic",
      revision: parsePositiveSafeInteger(options.storyRevision ?? 1),
      digest: options.storyDigest ?? digestV1("story"),
    }),
    engine: Object.freeze({
      version: options.engineVersion ?? "1.0.0",
      digest: options.engineDigest ?? digestV1("engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(options.stateContractRevision ?? 1),
      stateContractDigest: options.stateContractDigest ?? digestV1("state-contract"),
      simulationDigest: options.simulationDigest ?? digestV1("simulation"),
      presentationDigest: options.presentationDigest ?? digestV1("presentation"),
      patchSet: options.patchSet ?? makePatchSetV1(),
    }),
  });
}

function makeLineageV1(
  length: number,
  finalSimulationDigest: Digest,
): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length }, (_, index) => digestV1(`lineage:${index}`));
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: boundaries[index + 1] ?? finalSimulationDigest,
        viaSimulationPatchSetDigest: digestV1(`lineage-patch:${index}`),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(index),
      }),
    ),
  );
}

function declarationV1(
  stored: BuildProvenanceV1,
  current: BuildProvenanceV1,
): PatchSetAdoptionDeclarationV1 {
  return Object.freeze({
    storyId: current.story.id,
    storyRevision: current.story.revision,
    stateContractRevision: current.resolved.stateContractRevision,
    stateContractDigest: current.resolved.stateContractDigest,
    fromSimulationDigest: stored.resolved.simulationDigest,
    toSimulationDigest: current.resolved.simulationDigest,
    simulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
  });
}

function classifyV1(input: {
  readonly stored?: BuildProvenanceV1;
  readonly current?: BuildProvenanceV1;
  readonly lineage?: readonly SimulationAdoptionV1[];
  readonly declaration?: PatchSetAdoptionDeclarationV1 | null;
}) {
  const stored = input.stored ?? makeProvenanceV1();
  const current = input.current ?? makeProvenanceV1();
  return classifySaveCompatibilityV1({
    stored,
    current,
    simulationLineage: input.lineage ?? Object.freeze([]),
    adoptionDeclaration: input.declaration ?? null,
    candidateCommandSequence: parseNonNegativeSafeInteger(7),
  });
}

describe("Save compatibility classification", () => {
  it("returns exact for every equal blocker, including 16 lineage entries", () => {
    const provenance = makeProvenanceV1();
    expect(
      classifyV1({
        stored: provenance,
        current: makeProvenanceV1({ engineVersion: "display-only-change" }),
        lineage: makeLineageV1(16, provenance.resolved.simulationDigest),
      }),
    ).toEqual({ kind: "exact", mismatches: [], warnings: [] });
  });

  it("reports every blocking mismatch once in the fixed order", () => {
    const stored = makeProvenanceV1();
    const current = makeProvenanceV1({
      storyId: "story.other",
      storyRevision: 2,
      stateContractRevision: 2,
      stateContractDigest: digestV1("state-contract.other"),
      engineDigest: digestV1("engine.other"),
      simulationDigest: digestV1("simulation.other"),
    });

    const result = classifyV1({ stored, current });
    expect(result.kind).toBe("inspect_only");
    if (result.kind !== "inspect_only") throw new TypeError("expected inspect-only");
    expect(result.mismatches.map(({ field }) => field)).toEqual([
      "story_id",
      "story_revision",
      "state_contract_revision",
      "state_contract_digest",
      "engine_digest",
      "simulation_digest",
    ]);
    expect(result.mismatches.map(({ code }) => code)).toEqual([
      "identity.story_id_mismatch",
      "identity.story_revision_mismatch",
      "identity.state_contract_revision_mismatch",
      "identity.state_contract_digest_mismatch",
      "identity.engine_digest_mismatch",
      "identity.simulation_digest_mismatch",
    ]);
  });

  it("keeps the three nonblocking warnings in their fixed order", () => {
    const stored = makeProvenanceV1();
    const current = makeProvenanceV1({
      storyDigest: digestV1("story.other"),
      presentationDigest: digestV1("presentation.other"),
      patchSet: makePatchSetV1("other"),
    });

    const result = classifyV1({ stored, current });
    expect(result).toMatchObject({ kind: "exact", mismatches: [] });
    if (result.kind !== "exact") throw new TypeError("expected exact compatibility");
    expect(result.warnings.map(({ field }) => field)).toEqual([
      "story_digest",
      "presentation_digest",
      "hotfix_set",
    ]);
  });

  it("creates an identity-eligible adoption candidate with the exact receipt", () => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    const result = classifyV1({
      stored,
      current,
      lineage: makeLineageV1(15, stored.resolved.simulationDigest),
      declaration: declarationV1(stored, current),
    });

    expect(result).toEqual({
      kind: "adoption_candidate",
      mismatches: [],
      warnings: [],
      adoption: {
        fromSimulationDigest: stored.resolved.simulationDigest,
        toSimulationDigest: current.resolved.simulationDigest,
        viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
        adoptedAtCommandSequence: 7,
      },
    });
  });

  it.each([
    "storyId",
    "storyRevision",
    "stateContractRevision",
    "stateContractDigest",
    "fromSimulationDigest",
    "toSimulationDigest",
    "simulationPatchSetDigest",
  ] as const)("does not adopt when declaration.%s differs", (field) => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    const declaration = declarationV1(stored, current);
    const wrongValue =
      field === "storyRevision" || field === "stateContractRevision"
        ? parsePositiveSafeInteger(99)
        : field === "storyId"
          ? "story.wrong"
          : digestV1(`wrong:${field}`);

    expect(
      classifyV1({ stored, current, declaration: { ...declaration, [field]: wrongValue } }),
    ).toMatchObject({
      kind: "inspect_only",
      mismatches: [{ field: "simulation_digest", code: "identity.simulation_digest_mismatch" }],
    });
  });

  it("requires simulation to be the sole mismatch and enforces the lineage limit only for adoption", () => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({
      engineDigest: digestV1("engine.new"),
      simulationDigest: digestV1("simulation.new"),
    });
    expect(
      classifyV1({ stored, current, declaration: declarationV1(stored, current) }),
    ).toMatchObject({
      kind: "inspect_only",
      mismatches: [{ field: "engine_digest" }, { field: "simulation_digest" }],
    });

    const adoptableCurrent = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    expect(
      classifyV1({
        stored,
        current: adoptableCurrent,
        lineage: makeLineageV1(16, stored.resolved.simulationDigest),
        declaration: declarationV1(stored, adoptableCurrent),
      }),
    ).toEqual({ kind: "rejected", code: "compatibility.lineage_limit" });
  });

  it("allows a presentation-only PatchSet difference while preserving its warning", () => {
    const simulationPatch = "same-simulation-patch";
    const stored = makeProvenanceV1({
      simulationDigest: digestV1("simulation.old"),
      patchSet: makePatchSetV1("presentation.old", simulationPatch),
    });
    const current = makeProvenanceV1({
      simulationDigest: digestV1("simulation.new"),
      patchSet: makePatchSetV1("presentation.new", simulationPatch),
    });
    const result = classifyV1({ stored, current, declaration: declarationV1(stored, current) });

    expect(result).toMatchObject({ kind: "adoption_candidate" });
    if (result.kind !== "adoption_candidate") throw new TypeError("expected adoption candidate");
    expect(result.warnings.map(({ field }) => field)).toEqual(["hotfix_set"]);
  });
});

interface ValidationStateV1 {
  readonly referenceId: string;
}

interface ValidationSnapshotV1 {
  readonly state: ValidationStateV1;
  readonly commandSequence: NonNegativeSafeInteger;
}

interface ValidationSlotV1 {
  readonly storyId: string;
}

type ValidationRecordV1 = SaveRecordEnvelopeV1<
  ValidationSnapshotV1,
  BuildProvenanceV1,
  ValidationSlotV1,
  readonly SimulationAdoptionV1[]
>;

const validationRecordSchemaV1: RuntimeSchemaV1<ValidationRecordV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid validation record");
    }
    const record = value as ValidationRecordV1;
    return Object.freeze({
      ...record,
      provenance: makeProvenanceV1({
        storyId: record.provenance.story.id,
        storyRevision: record.provenance.story.revision,
        storyDigest: record.provenance.story.digest,
        engineVersion: record.provenance.engine.version,
        engineDigest: record.provenance.engine.digest,
        stateContractRevision: record.provenance.resolved.stateContractRevision,
        stateContractDigest: record.provenance.resolved.stateContractDigest,
        simulationDigest: record.provenance.resolved.simulationDigest,
        presentationDigest: record.provenance.resolved.presentationDigest,
        patchSet: record.provenance.resolved.patchSet,
      }),
      slot: Object.freeze({ storyId: record.slot.storyId }),
      snapshot: Object.freeze({
        state: Object.freeze({ referenceId: record.snapshot.state.referenceId }),
        commandSequence: parseNonNegativeSafeInteger(record.snapshot.commandSequence),
      }),
      simulationLineage: Object.freeze([...record.simulationLineage]),
    });
  },
});

const validationCodecV1: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> =
  Object.freeze({
    recordSchema: validationRecordSchemaV1,
    validateEnvelope() {},
  });

function makeValidationRecordV1(provenance = makeProvenanceV1()): ValidationRecordV1 {
  const snapshot = Object.freeze({
    state: Object.freeze({ referenceId: "reference.synthetic" }),
    commandSequence: parseNonNegativeSafeInteger(7),
  });
  return Object.freeze({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(1),
    provenance,
    slot: Object.freeze({ storyId: provenance.story.id }),
    savedAt: "2026-07-14T00:00:00.000Z" as ValidationRecordV1["savedAt"],
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: Object.freeze([]),
  });
}

function validationBytesV1(record = makeValidationRecordV1()): Uint8Array {
  return canonicalJsonBytes(record);
}

function validationContextV1(input: {
  readonly classification: SaveCompatibilityClassificationV1;
  readonly referenceErrors?: readonly string[];
  readonly invariantErrors?: readonly string[];
  readonly referenceThrows?: boolean;
}) {
  const classifyCompatibility = vi.fn(
    (_record: Readonly<ValidationRecordV1>) => input.classification,
  );
  const validateReferences = vi.fn((_state: Readonly<ValidationStateV1>) => {
    if (input.referenceThrows) throw new Error("validator bug");
    return input.referenceErrors ?? Object.freeze([]);
  });
  const validateInvariants = vi.fn(
    (_view: Readonly<SaveImportInvariantViewV1<ValidationStateV1>>) =>
      input.invariantErrors ?? Object.freeze([]),
  );
  const context: SaveImportValidationContextV1<
    ValidationStateV1,
    ValidationSnapshotV1,
    ValidationRecordV1
  > = Object.freeze({
    codec: validationCodecV1,
    classifyCompatibility,
    validateReferences,
    validateInvariants,
  });
  return Object.freeze({ context, classifyCompatibility, validateReferences, validateInvariants });
}

function uncheckedClassificationV1(value: unknown): SaveCompatibilityClassificationV1 {
  return value as SaveCompatibilityClassificationV1;
}

const exactV1: Extract<SaveCompatibilityClassificationV1, { readonly kind: "exact" }> =
  Object.freeze({
    kind: "exact" as const,
    mismatches: Object.freeze([] as const),
    warnings: Object.freeze([]),
  });

describe("Save import candidate validation", () => {
  it("passes State to references and an exact frozen sequence view to invariants", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "exact", mismatches: [], warnings: [] });
    expect(result).toHaveProperty("candidate");
    expect(fixture.validateReferences).toHaveBeenCalledOnce();
    expect(fixture.validateInvariants).toHaveBeenCalledOnce();
    expect(fixture.validateReferences.mock.calls[0]?.[0]).toEqual({
      referenceId: "reference.synthetic",
    });
    expect(fixture.validateReferences.mock.calls[0]?.[0]).not.toHaveProperty("commandSequence");
    const invariantView = fixture.validateInvariants.mock.calls[0]?.[0];
    expect(invariantView).toEqual({
      state: { referenceId: "reference.synthetic" },
      commandSequence: 7,
    });
    expect(Object.keys(invariantView ?? {})).toEqual(["state", "commandSequence"]);
    expect(Object.isFrozen(invariantView)).toBe(true);
    expect(invariantView).not.toHaveProperty("rng");
    expect(invariantView).not.toHaveProperty("integrity");
  });

  it("stops before invariants when stable references fail", () => {
    const fixture = validationContextV1({
      classification: exactV1,
      referenceErrors: ["reference.missing"],
    });

    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toEqual({
      kind: "rejected",
      code: "reference.unknown_id",
    });
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("maps a returned invariant error without converting thrown bugs", () => {
    const fixture = validationContextV1({
      classification: exactV1,
      invariantErrors: ["invariant.synthetic"],
    });
    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toEqual({
      kind: "rejected",
      code: "invariant.failed",
    });

    const throwing = validationContextV1({ classification: exactV1, referenceThrows: true });
    expect(() => validateSaveImportCandidateV1(validationBytesV1(), throwing.context)).toThrow(
      "validator bug",
    );
  });

  it.each(["references", "invariants"] as const)(
    "throws for a sparse %s callback result",
    (stage) => {
      const sparse: string[] = [];
      sparse.length = 1;
      const fixture = validationContextV1({
        classification: exactV1,
        ...(stage === "references" ? { referenceErrors: sparse } : { invariantErrors: sparse }),
      });

      expect(() => validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toThrow(
        TypeError,
      );
      if (stage === "references") expect(fixture.validateInvariants).not.toHaveBeenCalled();
    },
  );

  it("promotes an adoption candidate only after both Story validators pass", () => {
    const adoption = Object.freeze({
      fromSimulationDigest: digestV1("simulation.old"),
      toSimulationDigest: digestV1("simulation.new"),
      viaSimulationPatchSetDigest: digestV1("patch.new"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
    });
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "adoption_candidate",
        mismatches: Object.freeze([] as const),
        warnings: Object.freeze([]),
        adoption,
      }),
    });

    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toMatchObject({
      kind: "adopted",
      adoption,
      candidate: expect.any(Object),
    });
  });

  it("never validates or exposes a candidate for inspect-only input", () => {
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "inspect_only",
        mismatches: Object.freeze([
          Object.freeze({
            field: "story_id",
            code: "identity.story_id_mismatch",
            stored: "story.old",
            current: "story.current",
          }),
        ] as const),
        warnings: Object.freeze([]),
      }),
    });
    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "inspect_only" });
    expect(result).not.toHaveProperty("candidate");
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it.each([
    [
      "nonempty exact mismatches",
      {
        kind: "exact",
        mismatches: [
          {
            field: "story_id",
            code: "identity.story_id_mismatch",
            stored: "story.old",
            current: "story.current",
          },
        ],
        warnings: [],
      },
    ],
    ["malformed warning entries", { kind: "exact", mismatches: [], warnings: [{}] }],
    [
      "malformed inspect-only mismatches",
      { kind: "inspect_only", mismatches: [null], warnings: [] },
    ],
    [
      "missing adoption receipt",
      { kind: "adoption_candidate", mismatches: [], warnings: [], adoption: undefined },
    ],
    ["an extra branch field", { kind: "exact", mismatches: [], warnings: [], unexpected: true }],
    ["an invalid rejection code", { kind: "rejected", code: "identity.story_id_mismatch" }],
    [
      "unordered mismatches",
      {
        kind: "inspect_only",
        mismatches: [
          {
            field: "simulation_digest",
            code: "identity.simulation_digest_mismatch",
            stored: digestV1("simulation.old"),
            current: digestV1("simulation.current"),
          },
          {
            field: "story_id",
            code: "identity.story_id_mismatch",
            stored: "story.old",
            current: "story.current",
          },
        ],
        warnings: [],
      },
    ],
    [
      "unordered warnings",
      {
        kind: "exact",
        mismatches: [],
        warnings: [
          {
            field: "presentation_digest",
            code: "identity.presentation_digest_mismatch",
            stored: digestV1("presentation.old"),
            current: digestV1("presentation.current"),
          },
          {
            field: "story_digest",
            code: "identity.story_digest_mismatch",
            stored: digestV1("story.old"),
            current: digestV1("story.current"),
          },
        ],
      },
    ],
    [
      "a malformed nested PatchSet warning",
      {
        kind: "exact",
        mismatches: [],
        warnings: [
          {
            field: "hotfix_set",
            code: "identity.hotfix_set_mismatch",
            stored: { ...makePatchSetV1("old"), appliedHotfixes: [{}] },
            current: makePatchSetV1("current"),
          },
        ],
      },
    ],
    [
      "an invalid PatchSurface kind pairing",
      {
        kind: "exact",
        mismatches: [],
        warnings: [
          {
            field: "hotfix_set",
            code: "identity.hotfix_set_mismatch",
            stored: {
              ...makePatchSetV1("old"),
              appliedHotfixes: [
                {
                  identity: {
                    id: "hotfix.invalid-pairing",
                    revision: parsePositiveSafeInteger(1),
                    digest: digestV1("hotfix.invalid-pairing"),
                  },
                  ordinal: parsePositiveSafeInteger(1),
                  replacements: [
                    {
                      surface: "simulation",
                      symbolId: "asset.invalid-pairing",
                      kind: "asset",
                      previousProviderDigest: digestV1("provider.before"),
                      nextProviderDigest: digestV1("provider.after"),
                    },
                  ],
                },
              ],
            },
            current: makePatchSetV1("current"),
          },
        ],
      },
    ],
  ] as const)("throws for a compatibility callback with %s", (_label, classification) => {
    const fixture = validationContextV1({
      classification: uncheckedClassificationV1(classification),
    });

    expect(() => validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toThrow(
      TypeError,
    );
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("copies and deeply freezes a valid callback result before exposing it", () => {
    const warning = {
      field: "story_digest" as const,
      code: "identity.story_digest_mismatch" as const,
      stored: digestV1("story.old"),
      current: digestV1("story.current"),
    };
    const adoption = {
      fromSimulationDigest: digestV1("simulation.old"),
      toSimulationDigest: digestV1("simulation.new"),
      viaSimulationPatchSetDigest: digestV1("patch.new"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
    };
    const storedPatchSet = makePatchSetV1("old");
    const currentPatchSet = makePatchSetV1("current");
    const hotfixWarning = {
      field: "hotfix_set" as const,
      code: "identity.hotfix_set_mismatch" as const,
      stored: storedPatchSet,
      current: currentPatchSet,
    };
    const warnings = [warning, hotfixWarning];
    const fixture = validationContextV1({
      classification: uncheckedClassificationV1({
        kind: "adoption_candidate",
        mismatches: [],
        warnings,
        adoption,
      }),
    });

    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "adopted", warnings, adoption });
    if (result.kind !== "adopted") throw new TypeError("expected adopted result");
    expect(result.warnings).not.toBe(warnings);
    expect(result.warnings[0]).not.toBe(warning);
    expect(result.adoption).not.toBe(adoption);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.warnings[0])).toBe(true);
    expect(Object.isFrozen(result.adoption)).toBe(true);
    const normalizedHotfixWarning = result.warnings[1];
    if (normalizedHotfixWarning?.field !== "hotfix_set") {
      throw new TypeError("expected normalized Hotfix warning");
    }
    expect(normalizedHotfixWarning).not.toBe(hotfixWarning);
    expect(normalizedHotfixWarning.stored).not.toBe(storedPatchSet);
    expect(normalizedHotfixWarning.stored.appliedHotfixes).not.toBe(storedPatchSet.appliedHotfixes);
    expect(Object.isFrozen(normalizedHotfixWarning.stored)).toBe(true);
    expect(Object.isFrozen(normalizedHotfixWarning.stored.appliedHotfixes)).toBe(true);
  });

  it("preserves compatibility callback exceptions without running Story validators", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const callbackError = new Error("compatibility callback bug");
    const context: typeof fixture.context = Object.freeze({
      ...fixture.context,
      classifyCompatibility() {
        throw callbackError;
      },
    });

    expect(() => validateSaveImportCandidateV1(validationBytesV1(), context)).toThrow(
      callbackError,
    );
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("stops before compatibility when state digest validation fails", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const record = makeValidationRecordV1();
    const bytes = canonicalJsonBytes({ ...record, stateDigest: digestV1("wrong") });

    expect(validateSaveImportCandidateV1(bytes, fixture.context)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
    expect(fixture.validateReferences).not.toHaveBeenCalled();
  });
});
