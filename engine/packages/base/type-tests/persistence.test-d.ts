// SPDX-License-Identifier: MIT
import type {
  BuildProvenanceV1,
  GameSnapshotEnvelopeV1,
  NonNegativeSafeInteger,
  PatchSetAdoptionDeclarationV1,
  RuntimeSchemaV1,
  SaveCodecContextV1,
  SaveCompatibilityClassificationV1,
  SaveImportValidationContextV1,
  SaveImportValidationResultV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  classifySaveCompatibilityV1,
  decodeSaveRecordV1,
  encodeSaveRecordV1,
  validateSaveImportCandidateV1,
} from "@sillymaker/base/runtime";

interface SyntheticStateV1 {
  readonly referenceId: string;
  readonly count: NonNegativeSafeInteger;
}

interface SyntheticRngV1 {
  readonly cursor: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngV1>;

interface SyntheticSlotV1 {
  readonly storyId: string;
  readonly capturedCommandSequence: NonNegativeSafeInteger;
}

type SyntheticSaveRecordV1 = SaveRecordEnvelopeV1<
  SyntheticSnapshotV1,
  BuildProvenanceV1,
  SyntheticSlotV1,
  readonly SimulationAdoptionV1[]
>;

declare const recordSchema: RuntimeSchemaV1<SyntheticSaveRecordV1>;
declare const record: SyntheticSaveRecordV1;
declare const classification: SaveCompatibilityClassificationV1;

export const codec = {
  recordSchema,
  validateEnvelope(candidate) {
    candidate.snapshot.integrity.mode;
    candidate.provenance.resolved.simulationDigest;
  },
} satisfies SaveCodecContextV1<SyntheticSnapshotV1, SyntheticSaveRecordV1>;

export const validationContext = {
  codec,
  classifyCompatibility() {
    return classification;
  },
  validateReferences(state) {
    state.referenceId;

    // @ts-expect-error Story validators cannot inspect engine integrity
    state.integrity;
    // @ts-expect-error Story validators cannot inspect RNG
    state.rng;
    // @ts-expect-error Story validators cannot inspect command sequence
    state.commandSequence;
    // @ts-expect-error Story validators receive DeepReadonly State
    state.count = 2;
    return [];
  },
  validateInvariants(state) {
    state.count;
    return [];
  },
} satisfies SaveImportValidationContextV1<
  SyntheticStateV1,
  SyntheticSnapshotV1,
  SyntheticSaveRecordV1
>;

export const encoded: Uint8Array = encodeSaveRecordV1(record, codec);
export const decoded = decodeSaveRecordV1(encoded, codec);
export const validated = validateSaveImportCandidateV1(encoded, validationContext);

declare const validationResult: SaveImportValidationResultV1<SyntheticSaveRecordV1>;
if (validationResult.kind === "exact" || validationResult.kind === "adopted") {
  validationResult.candidate.snapshot.state.referenceId;
} else {
  // @ts-expect-error inspect-only and rejected results never expose a runnable candidate
  validationResult.candidate;
}
if (validationResult.kind === "adopted") {
  validationResult.adoption.viaSimulationPatchSetDigest;
} else {
  // @ts-expect-error only adopted results carry an adoption receipt
  validationResult.adoption;
}
if (validationResult.kind === "inspect_only") {
  validationResult.mismatches[0].field;
}

// @ts-expect-error codec has no Session or storage operation
codec.load;
// @ts-expect-error codec has no write operation
codec.write;

declare const stored: BuildProvenanceV1;
declare const current: BuildProvenanceV1;
declare const lineage: readonly SimulationAdoptionV1[];
declare const adoptionDeclaration: PatchSetAdoptionDeclarationV1 | null;
declare const candidateCommandSequence: NonNegativeSafeInteger;
export const compatibility = classifySaveCompatibilityV1({
  stored,
  current,
  simulationLineage: lineage,
  adoptionDeclaration,
  candidateCommandSequence,
});
