// SPDX-License-Identifier: MIT
import {
  debugBundleJsonLimitsV1,
  digestBytes,
  parseDigest,
  parseNonNegativeSafeInteger,
  parseStrictJson,
  saveJsonLimitsV1,
  type ExportedDebugBundleV1,
  type ExportedSaveV1,
  type HostFilePortV1,
  type PersistenceOperationResultV1,
  type PersistenceStatusV1,
  type SaveExportOperationResultV1,
  type SaveSlotSummaryV1,
} from "@sillymaker/base";
import type {
  DiagnosticExportContentCategoryIdV1,
  DiagnosticExportPortV1,
  DiagnosticExportPreviewV1,
  SaveOverlayPortV1,
  SaveUiReadableSlotIdV1,
  SaveUiWritableSlotIdV1,
} from "@sillymaker/ui";

export interface PlayerUiPersistenceSourceV1 {
  getStatus(): PersistenceStatusV1 | Promise<PersistenceStatusV1>;
  listSlots(): Promise<readonly SaveSlotSummaryV1[]>;
  save(slotId: SaveUiWritableSlotIdV1): Promise<PersistenceOperationResultV1>;
  load(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  clear(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  importSave(bytes: Uint8Array): Promise<PersistenceOperationResultV1>;
  exportSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
}

export interface PlayerUiDiagnosticsSourceV1 {
  exportDebugBundle(): Promise<ExportedDebugBundleV1>;
}

export interface PlayerUiPortsV1 {
  readonly save: SaveOverlayPortV1;
  readonly diagnostics: DiagnosticExportPortV1;
}

const requiredDebugBundleKeysV1 = Object.freeze([
  "formatRevision",
  "provenance",
  "capabilities",
  "simulationLineage",
  "generatedAt",
  "replayBase",
  "replayBaseStateDigest",
  "commandLog",
  "currentSnapshot",
  "currentStateDigest",
  "diagnostics",
  "runtimeFailures",
] as const);
const optionalDebugBundleKeysV1 = Object.freeze(["appBuildId", "failure", "uiContext"] as const);
const allowedDebugBundleKeysV1 = new Set<string>([
  ...requiredDebugBundleKeysV1,
  ...optionalDebugBundleKeysV1,
]);

function parseExportedDebugBundleV1(value: unknown): ExportedDebugBundleV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid exported Debug Bundle");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== 4 ||
    keys.some(
      (key) =>
        typeof key !== "string" || !["bytes", "digest", "filename", "mediaType"].includes(key),
    ) ||
    Object.values(descriptors).some(
      (descriptor) => descriptor.get !== undefined || descriptor.set !== undefined,
    )
  ) {
    throw new TypeError("invalid exported Debug Bundle");
  }
  const bytesValue = descriptors.bytes?.value;
  if (
    !(bytesValue instanceof Uint8Array) ||
    Object.getPrototypeOf(bytesValue) !== Uint8Array.prototype
  ) {
    throw new TypeError("invalid exported Debug Bundle bytes");
  }
  const bytes = Uint8Array.from(bytesValue);
  const digest = parseDigest(descriptors.digest?.value);
  if (digest !== digestBytes(bytes)) throw new TypeError("exported Debug Bundle digest mismatch");
  const filename = descriptors.filename?.value;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new TypeError("invalid exported Debug Bundle filename");
  }
  if (descriptors.mediaType?.value !== "application/json") {
    throw new TypeError("invalid exported Debug Bundle media type");
  }
  return Object.freeze({ filename, mediaType: "application/json" as const, digest, bytes });
}

function classifyDebugBundleCategoriesV1(
  bytes: Uint8Array,
): readonly DiagnosticExportContentCategoryIdV1[] {
  const decoded = parseStrictJson(bytes, debugBundleJsonLimitsV1);
  if (!decoded.ok) throw new TypeError("invalid prepared Debug Bundle Strict JSON");
  const envelope = decoded.value;
  if (
    envelope === null ||
    typeof envelope !== "object" ||
    Array.isArray(envelope) ||
    Object.getPrototypeOf(envelope) !== Object.prototype
  ) {
    throw new TypeError("invalid prepared Debug Bundle envelope");
  }
  const keys = Object.keys(envelope);
  if (
    requiredDebugBundleKeysV1.some((key) => !Object.prototype.hasOwnProperty.call(envelope, key)) ||
    keys.some((key) => !allowedDebugBundleKeysV1.has(key)) ||
    Reflect.get(envelope, "formatRevision") !== 1
  ) {
    throw new TypeError("invalid prepared Debug Bundle envelope");
  }
  const categories: DiagnosticExportContentCategoryIdV1[] = [
    "provenance",
    "capabilities_and_integrity",
    "replay_evidence",
    "diagnostics_and_runtime_failures",
  ];
  if (Object.prototype.hasOwnProperty.call(envelope, "failure")) {
    categories.push("failure_context");
  }
  if (Object.prototype.hasOwnProperty.call(envelope, "uiContext")) {
    categories.push("ui_context");
  }
  return Object.freeze(categories);
}

function createDiagnosticPreviewV1(exported: ExportedDebugBundleV1): DiagnosticExportPreviewV1 {
  return Object.freeze({
    filename: exported.filename,
    mediaType: exported.mediaType,
    digest: exported.digest,
    encodedByteLength: parseNonNegativeSafeInteger(exported.bytes.byteLength),
    categories: classifyDebugBundleCategoriesV1(exported.bytes),
  });
}

function downloadV1(
  files: HostFilePortV1,
  file: ExportedSaveV1 | ExportedDebugBundleV1,
): Promise<void> {
  return files.download({
    filename: file.filename,
    mediaType: file.mediaType,
    bytes: file.bytes,
  });
}

/** Bridges player-safe application ports to explicit, local-only UI file operations. */
export function createPlayerUiPortsV1(input: {
  readonly files: HostFilePortV1;
  readonly persistence: PlayerUiPersistenceSourceV1;
  readonly diagnostics: PlayerUiDiagnosticsSourceV1;
}): PlayerUiPortsV1 {
  const save = Object.freeze({
    getStatus: () => input.persistence.getStatus(),
    listSlots: async () => await input.persistence.listSlots(),
    save: async (slotId: SaveUiWritableSlotIdV1) => await input.persistence.save(slotId),
    load: async (slotId: SaveUiReadableSlotIdV1) => await input.persistence.load(slotId),
    clear: async (slotId: SaveUiReadableSlotIdV1) => await input.persistence.clear(slotId),
    async importSave() {
      const selection = await input.files.selectOne({
        acceptedMediaTypes: Object.freeze(["application/json"]),
        maximumBytes: saveJsonLimitsV1.maxBytes,
      });
      if (selection.kind !== "selected") return selection;
      return await input.persistence.importSave(selection.bytes);
    },
    async exportSave(slotId: SaveUiReadableSlotIdV1) {
      const result = await input.persistence.exportSave(slotId);
      if (result.kind === "exported") await downloadV1(input.files, result.file);
      return result;
    },
    async exportCurrentSave() {
      const exported = await input.persistence.exportCurrentSave();
      await downloadV1(input.files, exported);
      return exported;
    },
  }) satisfies SaveOverlayPortV1;
  let diagnosticGeneration = 0;
  let preparedDiagnostic:
    | {
        readonly exported: ExportedDebugBundleV1;
        readonly preview: DiagnosticExportPreviewV1;
      }
    | undefined;
  const diagnostics = Object.freeze({
    async prepareDebugBundle() {
      if (preparedDiagnostic !== undefined) return preparedDiagnostic.preview;
      const generation = diagnosticGeneration + 1;
      diagnosticGeneration = generation;
      preparedDiagnostic = undefined;
      const exported = parseExportedDebugBundleV1(await input.diagnostics.exportDebugBundle());
      const preview = createDiagnosticPreviewV1(exported);
      if (generation !== diagnosticGeneration) {
        throw new TypeError("prepared Debug Bundle was discarded");
      }
      preparedDiagnostic = Object.freeze({ exported, preview });
      return preview;
    },
    async savePreparedDebugBundle() {
      const prepared = preparedDiagnostic;
      if (prepared === undefined) throw new TypeError("no prepared Debug Bundle");
      await downloadV1(input.files, prepared.exported);
      if (preparedDiagnostic === prepared) {
        preparedDiagnostic = undefined;
        diagnosticGeneration += 1;
      }
    },
    discardPreparedDebugBundle() {
      diagnosticGeneration += 1;
      preparedDiagnostic = undefined;
    },
  }) satisfies DiagnosticExportPortV1;
  return Object.freeze({ save, diagnostics });
}
