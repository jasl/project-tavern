// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  ExportedDebugBundleV1,
  ExportedSaveV1,
  GameApplicationPortV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  PlayerDiagnosticsPortV1,
  PlayerPersistencePortV1,
  RuntimeCapabilityPortV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
  SessionLifecyclePortV1,
} from "@sillymaker/base";
import { createGameApplicationV1 } from "@sillymaker/base/runtime";

import type { PocDebugToolsPortV1 } from "../runtime/poc-debug-bundle.js";
import type { PocSemanticGamePortV1 } from "./create-poc-semantic-port.js";

export type PocSessionLifecyclePortV1 = SessionLifecyclePortV1<SessionAnchorResultV1>;

export type PocPersistencePortV1 = PlayerPersistencePortV1<
  SaveSlotSummaryV1,
  PersistenceStatusV1,
  PersistenceOperationResultV1,
  ExportedSaveV1,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
  SessionLeaseOperationResultV1
>;

export type PocPlayerDiagnosticsPortV1 = PlayerDiagnosticsPortV1<ExportedDebugBundleV1>;

type PocGameApplicationInputV1 = GameApplicationPortV1<
  PocSemanticGamePortV1,
  PocSessionLifecyclePortV1,
  PocPersistencePortV1,
  PocPlayerDiagnosticsPortV1,
  RuntimeCapabilityPortV1,
  PocDebugToolsPortV1
>;

export function createPocGameApplicationV1(input: PocGameApplicationInputV1) {
  return createGameApplicationV1(input);
}

export type PocGameApplicationPortV1 = ReturnType<typeof createPocGameApplicationV1>;
