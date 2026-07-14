// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import type {
  AppliedHotfixV1,
  PatchReplacementTraceV1,
  PatchSetAdoptionDeclarationV1,
  PatchSetIdentityV1,
} from "../../contracts/hotfix.js";
import { exactEnvelopeDescriptorsV1 } from "../../contracts/persistence.js";
import type {
  ImportCompatibilityWarningV1,
  ImportRejectionCodeV1,
  SaveCompatibilityClassificationInputV1,
  SaveCompatibilityClassificationV1,
  SaveCompatibilityMismatchV1,
  SaveImportValidationContextV1,
  SaveImportValidationResultV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.js";
import type { DeepReadonly } from "../../contracts/values.js";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.js";
import { decodeSaveRecordV1 } from "./save-codec.js";

const emptyTupleV1 = (): readonly [] => Object.freeze([]) as readonly [];

function canonicalBytesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

function collectMismatchesV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): readonly SaveCompatibilityMismatchV1[] {
  const mismatches: SaveCompatibilityMismatchV1[] = [];
  if (input.stored.story.id !== input.current.story.id) {
    mismatches.push(
      Object.freeze({
        field: "story_id",
        code: "identity.story_id_mismatch",
        stored: input.stored.story.id,
        current: input.current.story.id,
      }),
    );
  }
  if (input.stored.story.revision !== input.current.story.revision) {
    mismatches.push(
      Object.freeze({
        field: "story_revision",
        code: "identity.story_revision_mismatch",
        stored: input.stored.story.revision,
        current: input.current.story.revision,
      }),
    );
  }
  if (
    input.stored.resolved.stateContractRevision !== input.current.resolved.stateContractRevision
  ) {
    mismatches.push(
      Object.freeze({
        field: "state_contract_revision",
        code: "identity.state_contract_revision_mismatch",
        stored: input.stored.resolved.stateContractRevision,
        current: input.current.resolved.stateContractRevision,
      }),
    );
  }
  if (input.stored.resolved.stateContractDigest !== input.current.resolved.stateContractDigest) {
    mismatches.push(
      Object.freeze({
        field: "state_contract_digest",
        code: "identity.state_contract_digest_mismatch",
        stored: input.stored.resolved.stateContractDigest,
        current: input.current.resolved.stateContractDigest,
      }),
    );
  }
  if (input.stored.engine.digest !== input.current.engine.digest) {
    mismatches.push(
      Object.freeze({
        field: "engine_digest",
        code: "identity.engine_digest_mismatch",
        stored: input.stored.engine.digest,
        current: input.current.engine.digest,
      }),
    );
  }
  if (input.stored.resolved.simulationDigest !== input.current.resolved.simulationDigest) {
    mismatches.push(
      Object.freeze({
        field: "simulation_digest",
        code: "identity.simulation_digest_mismatch",
        stored: input.stored.resolved.simulationDigest,
        current: input.current.resolved.simulationDigest,
      }),
    );
  }
  return Object.freeze(mismatches);
}

function collectWarningsV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): readonly ImportCompatibilityWarningV1[] {
  const warnings: ImportCompatibilityWarningV1[] = [];
  if (input.stored.story.digest !== input.current.story.digest) {
    warnings.push(
      Object.freeze({
        field: "story_digest",
        code: "identity.story_digest_mismatch",
        stored: input.stored.story.digest,
        current: input.current.story.digest,
      }),
    );
  }
  if (input.stored.resolved.presentationDigest !== input.current.resolved.presentationDigest) {
    warnings.push(
      Object.freeze({
        field: "presentation_digest",
        code: "identity.presentation_digest_mismatch",
        stored: input.stored.resolved.presentationDigest,
        current: input.current.resolved.presentationDigest,
      }),
    );
  }
  if (!canonicalBytesEqualV1(input.stored.resolved.patchSet, input.current.resolved.patchSet)) {
    warnings.push(
      Object.freeze({
        field: "hotfix_set",
        code: "identity.hotfix_set_mismatch",
        stored: input.stored.resolved.patchSet,
        current: input.current.resolved.patchSet,
      }),
    );
  }
  return Object.freeze(warnings);
}

function matchesAdoptionDeclarationV1(
  declaration: DeepReadonly<PatchSetAdoptionDeclarationV1> | null,
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): boolean {
  return (
    declaration !== null &&
    declaration.storyId === input.current.story.id &&
    declaration.storyRevision === input.current.story.revision &&
    declaration.stateContractRevision === input.current.resolved.stateContractRevision &&
    declaration.stateContractDigest === input.current.resolved.stateContractDigest &&
    declaration.fromSimulationDigest === input.stored.resolved.simulationDigest &&
    declaration.toSimulationDigest === input.current.resolved.simulationDigest &&
    declaration.simulationPatchSetDigest === input.current.resolved.patchSet.simulationDigest
  );
}

export function classifySaveCompatibilityV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): SaveCompatibilityClassificationV1 {
  if (!Array.isArray(input.simulationLineage)) {
    throw new TypeError("invalid simulation lineage");
  }
  const candidateCommandSequence = parseNonNegativeSafeInteger(input.candidateCommandSequence);
  const mismatches = collectMismatchesV1(input);
  const warnings = collectWarningsV1(input);
  if (mismatches.length === 0) {
    return Object.freeze({ kind: "exact", mismatches: emptyTupleV1(), warnings });
  }
  const simulationOnly = mismatches.length === 1 && mismatches[0]?.field === "simulation_digest";
  if (simulationOnly && matchesAdoptionDeclarationV1(input.adoptionDeclaration, input)) {
    if (input.simulationLineage.length >= 16) {
      return Object.freeze({ kind: "rejected", code: "compatibility.lineage_limit" });
    }
    const adoption: SimulationAdoptionV1 = Object.freeze({
      fromSimulationDigest: input.stored.resolved.simulationDigest,
      toSimulationDigest: input.current.resolved.simulationDigest,
      viaSimulationPatchSetDigest: input.current.resolved.patchSet.simulationDigest,
      adoptedAtCommandSequence: candidateCommandSequence,
    });
    return Object.freeze({
      kind: "adoption_candidate",
      mismatches: emptyTupleV1(),
      warnings,
      adoption,
    });
  }
  return Object.freeze({
    kind: "inspect_only",
    mismatches: mismatches as readonly [
      SaveCompatibilityMismatchV1,
      ...SaveCompatibilityMismatchV1[],
    ],
    warnings,
  });
}

function requiredStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

function requireDifferentV1<T>(stored: T, current: T, label: string): readonly [T, T] {
  if (stored === current) throw new TypeError(`equal ${label}`);
  return [stored, current];
}

function fieldValueV1(fields: Record<string, PropertyDescriptor>, field: string): unknown {
  const descriptor = fields[field];
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`invalid compatibility ${field}`);
  }
  return descriptor.value;
}

function parseDenseArrayV1<T>(
  value: unknown,
  label: string,
  maximumLength: number,
  parseEntry: (entry: unknown, index: number) => T,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entryKeys = Object.keys(descriptors).filter((key) => key !== "length");
  if (entryKeys.length !== value.length || entryKeys.some((key, index) => key !== String(index))) {
    throw new TypeError(`invalid ${label}`);
  }
  const parsed: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      throw new TypeError(`invalid ${label}`);
    }
    parsed.push(parseEntry(descriptor.value, index));
  }
  return Object.freeze(parsed);
}

function parseReplacementTraceV1(value: unknown): PatchReplacementTraceV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
    "PatchReplacementTraceV1",
  );
  const surface = fieldValueV1(fields, "surface");
  const kind = fieldValueV1(fields, "kind");
  if (surface !== "simulation" && surface !== "presentation") {
    throw new TypeError("invalid patch replacement surface");
  }
  if (kind !== "rule" && kind !== "value" && kind !== "text" && kind !== "asset") {
    throw new TypeError("invalid patch replacement kind");
  }
  if (
    (surface === "simulation" && kind !== "rule" && kind !== "value") ||
    (surface === "presentation" && kind === "rule")
  ) {
    throw new TypeError("invalid patch replacement surface/kind pairing");
  }
  return Object.freeze({
    surface,
    symbolId: requiredStringV1(fieldValueV1(fields, "symbolId"), "patch symbolId"),
    kind,
    previousProviderDigest: parseDigest(fieldValueV1(fields, "previousProviderDigest")),
    nextProviderDigest: parseDigest(fieldValueV1(fields, "nextProviderDigest")),
  });
}

function parseAppliedHotfixV1(value: unknown, index: number): AppliedHotfixV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    ["identity", "ordinal", "replacements"],
    "AppliedHotfixV1",
  );
  const identityFields = exactEnvelopeDescriptorsV1(
    fieldValueV1(fields, "identity"),
    ["id", "revision", "digest"],
    "AppliedHotfixV1.identity",
  );
  const ordinal = parsePositiveSafeInteger(fieldValueV1(fields, "ordinal"));
  if (ordinal !== index + 1) throw new TypeError("invalid applied Hotfix ordinal");
  return Object.freeze({
    identity: Object.freeze({
      id: requiredStringV1(fieldValueV1(identityFields, "id"), "Hotfix id"),
      revision: parsePositiveSafeInteger(fieldValueV1(identityFields, "revision")),
      digest: parseDigest(fieldValueV1(identityFields, "digest")),
    }),
    ordinal,
    replacements: parseDenseArrayV1(
      fieldValueV1(fields, "replacements"),
      "Hotfix replacements",
      10_000,
      parseReplacementTraceV1,
    ),
  });
}

function parsePatchSetIdentityV1(value: unknown): PatchSetIdentityV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PatchSetIdentityV1",
  );
  const appliedHotfixes = parseDenseArrayV1(
    fieldValueV1(fields, "appliedHotfixes"),
    "applied Hotfixes",
    10_000,
    parseAppliedHotfixV1,
  );
  const identities = new Set(appliedHotfixes.map(({ identity }) => identity.id));
  if (identities.size !== appliedHotfixes.length) {
    throw new TypeError("duplicate applied Hotfix identity");
  }
  return Object.freeze({
    digest: parseDigest(fieldValueV1(fields, "digest")),
    simulationDigest: parseDigest(fieldValueV1(fields, "simulationDigest")),
    presentationDigest: parseDigest(fieldValueV1(fields, "presentationDigest")),
    appliedHotfixes,
  });
}

const mismatchOrderV1 = [
  "story_id",
  "story_revision",
  "state_contract_revision",
  "state_contract_digest",
  "engine_digest",
  "simulation_digest",
] as const;

function parseMismatchV1(value: unknown): SaveCompatibilityMismatchV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    ["field", "code", "stored", "current"],
    "SaveCompatibilityMismatchV1",
  );
  const field = fieldValueV1(fields, "field");
  const code = fieldValueV1(fields, "code");
  const stored = fieldValueV1(fields, "stored");
  const current = fieldValueV1(fields, "current");
  if (field === "story_id" && code === "identity.story_id_mismatch") {
    const [storedId, currentId] = requireDifferentV1(
      requiredStringV1(stored, "stored Story id"),
      requiredStringV1(current, "current Story id"),
      "Story ids",
    );
    return Object.freeze({
      field,
      code,
      stored: storedId,
      current: currentId,
    });
  }
  if (field === "story_revision" && code === "identity.story_revision_mismatch") {
    const [storedRevision, currentRevision] = requireDifferentV1(
      parsePositiveSafeInteger(stored),
      parsePositiveSafeInteger(current),
      "Story revisions",
    );
    return Object.freeze({
      field,
      code,
      stored: storedRevision,
      current: currentRevision,
    });
  }
  if (field === "state_contract_revision" && code === "identity.state_contract_revision_mismatch") {
    const [storedRevision, currentRevision] = requireDifferentV1(
      parsePositiveSafeInteger(stored),
      parsePositiveSafeInteger(current),
      "state contract revisions",
    );
    return Object.freeze({
      field,
      code,
      stored: storedRevision,
      current: currentRevision,
    });
  }
  if (field === "state_contract_digest" && code === "identity.state_contract_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "state contract digests",
    );
    return Object.freeze({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "engine_digest" && code === "identity.engine_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "engine digests",
    );
    return Object.freeze({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "simulation_digest" && code === "identity.simulation_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "simulation digests",
    );
    return Object.freeze({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  throw new TypeError("invalid compatibility mismatch");
}

function parseMismatchesV1(
  value: unknown,
  requireNonempty: boolean,
): readonly SaveCompatibilityMismatchV1[] {
  const mismatches = parseDenseArrayV1(
    value,
    "compatibility mismatches",
    mismatchOrderV1.length,
    parseMismatchV1,
  );
  if (mismatches.length === 0 && requireNonempty) {
    throw new TypeError("empty inspect-only mismatches");
  }
  if (mismatches.length > 0 && !requireNonempty) {
    throw new TypeError("nonempty runnable mismatches");
  }
  let previousRank = -1;
  for (const mismatch of mismatches) {
    const rank = mismatchOrderV1.indexOf(mismatch.field);
    if (rank <= previousRank) throw new TypeError("unordered compatibility mismatches");
    previousRank = rank;
  }
  return mismatches;
}

const warningOrderV1 = ["story_digest", "presentation_digest", "hotfix_set"] as const;

function parseWarningV1(value: unknown): ImportCompatibilityWarningV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    ["field", "code", "stored", "current"],
    "ImportCompatibilityWarningV1",
  );
  const field = fieldValueV1(fields, "field");
  const code = fieldValueV1(fields, "code");
  const stored = fieldValueV1(fields, "stored");
  const current = fieldValueV1(fields, "current");
  if (field === "story_digest" && code === "identity.story_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "Story digests",
    );
    return Object.freeze({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "presentation_digest" && code === "identity.presentation_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "presentation digests",
    );
    return Object.freeze({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "hotfix_set" && code === "identity.hotfix_set_mismatch") {
    const storedPatchSet = parsePatchSetIdentityV1(stored);
    const currentPatchSet = parsePatchSetIdentityV1(current);
    if (canonicalBytesEqualV1(storedPatchSet, currentPatchSet)) {
      throw new TypeError("equal Hotfix PatchSets");
    }
    return Object.freeze({
      field,
      code,
      stored: storedPatchSet,
      current: currentPatchSet,
    });
  }
  throw new TypeError("invalid compatibility warning");
}

function parseWarningsV1(value: unknown): readonly ImportCompatibilityWarningV1[] {
  const warnings = parseDenseArrayV1(
    value,
    "compatibility warnings",
    warningOrderV1.length,
    parseWarningV1,
  );
  let previousRank = -1;
  for (const warning of warnings) {
    const rank = warningOrderV1.indexOf(warning.field);
    if (rank <= previousRank) throw new TypeError("unordered compatibility warnings");
    previousRank = rank;
  }
  return warnings;
}

function parseAdoptionV1(value: unknown): SimulationAdoptionV1 {
  const fields = exactEnvelopeDescriptorsV1(
    value,
    [
      "fromSimulationDigest",
      "toSimulationDigest",
      "viaSimulationPatchSetDigest",
      "adoptedAtCommandSequence",
    ],
    "SimulationAdoptionV1",
  );
  const [fromSimulationDigest, toSimulationDigest] = requireDifferentV1(
    parseDigest(fieldValueV1(fields, "fromSimulationDigest")),
    parseDigest(fieldValueV1(fields, "toSimulationDigest")),
    "adoption simulation digests",
  );
  return Object.freeze({
    fromSimulationDigest,
    toSimulationDigest,
    viaSimulationPatchSetDigest: parseDigest(fieldValueV1(fields, "viaSimulationPatchSetDigest")),
    adoptedAtCommandSequence: parseNonNegativeSafeInteger(
      fieldValueV1(fields, "adoptedAtCommandSequence"),
    ),
  });
}

function validateStoryErrorsV1(value: unknown, label: string): readonly string[] {
  return parseDenseArrayV1(value, `${label} result`, 10_000, (entry) =>
    requiredStringV1(entry, `${label} error`),
  );
}

const rejectionCodesV1 = new Set<ImportRejectionCodeV1>([
  "encoding.invalid_utf8",
  "encoding.bom_forbidden",
  "syntax.invalid",
  "syntax.comment_forbidden",
  "syntax.trailing_comma_forbidden",
  "object.duplicate_key",
  "object.dangerous_key",
  "limit.bytes",
  "limit.depth",
  "limit.array_items",
  "limit.object_members",
  "limit.nodes",
  "limit.string_bytes",
  "number.not_integer",
  "number.unsafe_integer",
  "number.negative_zero",
  "string.lone_surrogate",
  "envelope.schema_invalid",
  "envelope.unsupported_revision",
  "digest.invalid_format",
  "digest.state_mismatch",
  "compatibility.lineage_limit",
  "reference.unknown_id",
  "invariant.failed",
]);

function normalizeCompatibilityClassificationV1(value: unknown): SaveCompatibilityClassificationV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid compatibility classification");
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    kindDescriptor === undefined ||
    !("value" in kindDescriptor) ||
    kindDescriptor.get !== undefined ||
    kindDescriptor.set !== undefined
  ) {
    throw new TypeError("invalid compatibility classification kind");
  }
  const kind = kindDescriptor.value;
  if (kind === "rejected") {
    const fields = exactEnvelopeDescriptorsV1(
      value,
      ["kind", "code"],
      "rejected compatibility classification",
    );
    const code = fieldValueV1(fields, "code");
    if (typeof code !== "string" || !rejectionCodesV1.has(code as ImportRejectionCodeV1)) {
      throw new TypeError("invalid compatibility rejection");
    }
    return Object.freeze({ kind, code: code as ImportRejectionCodeV1 });
  }
  if (kind === "exact") {
    const fields = exactEnvelopeDescriptorsV1(
      value,
      ["kind", "mismatches", "warnings"],
      "exact compatibility classification",
    );
    parseMismatchesV1(fieldValueV1(fields, "mismatches"), false);
    return Object.freeze({
      kind,
      mismatches: emptyTupleV1(),
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
    });
  }
  if (kind === "adoption_candidate") {
    const fields = exactEnvelopeDescriptorsV1(
      value,
      ["kind", "mismatches", "warnings", "adoption"],
      "adoption compatibility classification",
    );
    parseMismatchesV1(fieldValueV1(fields, "mismatches"), false);
    return Object.freeze({
      kind,
      mismatches: emptyTupleV1(),
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
      adoption: parseAdoptionV1(fieldValueV1(fields, "adoption")),
    });
  }
  if (kind === "inspect_only") {
    const fields = exactEnvelopeDescriptorsV1(
      value,
      ["kind", "mismatches", "warnings"],
      "inspect-only compatibility classification",
    );
    const mismatches = parseMismatchesV1(fieldValueV1(fields, "mismatches"), true) as readonly [
      SaveCompatibilityMismatchV1,
      ...SaveCompatibilityMismatchV1[],
    ];
    return Object.freeze({
      kind,
      mismatches,
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
    });
  }
  throw new TypeError("invalid compatibility classification kind");
}

export function validateSaveImportCandidateV1<
  TState,
  TSnapshot extends { readonly state: TState },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
): SaveImportValidationResultV1<TSaveRecord> {
  const decoded = decodeSaveRecordV1(bytes, context.codec);
  if (decoded.kind === "rejected") return decoded;
  const classification = normalizeCompatibilityClassificationV1(
    context.classifyCompatibility(decoded.record),
  );
  if (classification.kind === "rejected") {
    return Object.freeze({ kind: "rejected", code: classification.code });
  }
  if (classification.kind === "inspect_only") {
    return Object.freeze({
      kind: "inspect_only",
      mismatches: classification.mismatches,
      warnings: classification.warnings,
    });
  }
  const referenceErrors = validateStoryErrorsV1(
    context.validateReferences(decoded.record.snapshot.state),
    "reference validation",
  );
  if (referenceErrors.length > 0) {
    return Object.freeze({ kind: "rejected", code: "reference.unknown_id" });
  }
  const invariantErrors = validateStoryErrorsV1(
    context.validateInvariants(decoded.record.snapshot.state),
    "invariant validation",
  );
  if (invariantErrors.length > 0) {
    return Object.freeze({ kind: "rejected", code: "invariant.failed" });
  }
  if (classification.kind === "adoption_candidate") {
    return Object.freeze({
      kind: "adopted",
      mismatches: emptyTupleV1(),
      warnings: classification.warnings,
      adoption: classification.adoption,
      candidate: decoded.record,
    });
  }
  return Object.freeze({
    kind: "exact",
    mismatches: emptyTupleV1(),
    warnings: classification.warnings,
    candidate: decoded.record,
  });
}
