// SPDX-License-Identifier: MIT
import type {
  ExportedDebugBundleV1,
  ExportedSaveV1,
  PersistenceOperationResultV1,
  PlayerPersistencePortV1,
  PositiveSafeInteger,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
} from "@project-tavern/base";

declare const persistence: PlayerPersistencePortV1<
  never,
  never,
  PersistenceOperationResultV1,
  ExportedSaveV1,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
  never
>;

export const stored: Promise<SaveExportOperationResultV1> =
  persistence.exportSave("quick");
export const current: Promise<ExportedSaveV1> = persistence.exportCurrentSave();

declare const persistenceResult: PersistenceOperationResultV1;
// @ts-expect-error exports are deliberately absent from general persistence results
persistenceResult.kind === "exported";

export const unowned: SessionLeaseStatusV1 = {
  kind: "unowned",
  ownerId: null,
  fencingToken: 1 as PositiveSafeInteger,
};
export const unavailable: SessionLeaseStatusV1 = {
  kind: "unavailable",
  ownerId: null,
  fencingToken: null,
  code: "storage-disabled",
};

declare const bundle: ExportedDebugBundleV1;
// @ts-expect-error Debug export has no arbitrary summary
bundle.summary;
