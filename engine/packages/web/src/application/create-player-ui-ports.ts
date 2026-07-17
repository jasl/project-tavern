// SPDX-License-Identifier: MIT
import {
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
  DiagnosticExportPortV1,
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
  readonly diagnostics: DiagnosticExportPortV1<ExportedDebugBundleV1>;
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

/** Bridges player-safe application ports to UI file operations without retaining exported bytes. */
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
  const diagnostics = Object.freeze({
    async exportDebugBundle() {
      const exported = await input.diagnostics.exportDebugBundle();
      await downloadV1(input.files, exported);
      return exported;
    },
  }) satisfies DiagnosticExportPortV1<ExportedDebugBundleV1>;
  return Object.freeze({ save, diagnostics });
}
