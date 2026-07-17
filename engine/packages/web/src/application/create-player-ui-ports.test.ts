// SPDX-License-Identifier: MIT
import {
  digestBytes,
  parseNonNegativeSafeInteger,
  saveJsonLimitsV1,
  type ExportedDebugBundleV1,
  type ExportedSaveV1,
  type HostFilePortV1,
  type PersistenceOperationResultV1,
  type SaveExportOperationResultV1,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import { createPlayerUiPortsV1 } from "./create-player-ui-ports.js";

const readyStatusV1 = Object.freeze({
  available: true,
  busy: false,
  safelySavedCommandSequence: null,
  lastFailureCode: null,
});

function exportedSaveV1(filename = "save.json"): ExportedSaveV1 {
  const bytes = Uint8Array.of(1, 2, 3);
  return Object.freeze({
    filename,
    mediaType: "application/json",
    digest: digestBytes(bytes),
    bytes,
  });
}

function exportedDebugBundleV1(): ExportedDebugBundleV1 {
  const bytes = Uint8Array.of(4, 5, 6);
  return Object.freeze({
    filename: "diagnostics.json",
    mediaType: "application/json",
    digest: digestBytes(bytes),
    bytes,
  });
}

function fixtureV1(input?: {
  readonly selection?: Awaited<ReturnType<HostFilePortV1["selectOne"]>>;
  readonly exportSaveResult?: SaveExportOperationResultV1;
  readonly importResult?: PersistenceOperationResultV1;
}) {
  const selection = input?.selection ?? Object.freeze({ kind: "cancelled" as const });
  const exportSaveResult =
    input?.exportSaveResult ??
    Object.freeze({ kind: "exported" as const, slotId: "quick" as const, file: exportedSaveV1() });
  const importResult =
    input?.importResult ??
    Object.freeze({ kind: "rejected" as const, code: "incompatible" as const });
  const files = Object.freeze({
    selectOne: vi.fn(async () => selection),
    download: vi.fn(async () => undefined),
  }) satisfies HostFilePortV1;
  const persistence = Object.freeze({
    getStatus: vi.fn(async () => readyStatusV1),
    listSlots: vi.fn(async () => Object.freeze([])),
    save: vi.fn(async (slotId: "quick" | "manual") =>
      Object.freeze({ kind: "saved" as const, slotId }),
    ),
    load: vi.fn(async () =>
      Object.freeze({ kind: "rejected" as const, code: "empty_slot" as const }),
    ),
    clear: vi.fn(async (slotId: "auto.current" | "auto.previous" | "quick" | "manual") =>
      Object.freeze({ kind: "cleared" as const, slotId }),
    ),
    importSave: vi.fn(async (_bytes: Uint8Array) => importResult),
    exportSave: vi.fn(async () => exportSaveResult),
    exportCurrentSave: vi.fn(async () => exportedSaveV1("current.json")),
  });
  const exportedDiagnostics = exportedDebugBundleV1();
  const diagnostics = Object.freeze({
    exportDebugBundle: vi.fn(async () => exportedDiagnostics),
  });
  const ports = createPlayerUiPortsV1({ files, persistence, diagnostics });
  return { diagnostics, exportedDiagnostics, files, persistence, ports };
}

describe("createPlayerUiPortsV1", () => {
  it("returns frozen narrow ports and delegates non-file persistence operations unchanged", async () => {
    const fixture = fixtureV1();
    expect(Object.isFrozen(fixture.ports)).toBe(true);
    expect(Object.isFrozen(fixture.ports.save)).toBe(true);
    expect(Object.isFrozen(fixture.ports.diagnostics)).toBe(true);

    await expect(fixture.ports.save.getStatus()).resolves.toBe(readyStatusV1);
    await expect(fixture.ports.save.listSlots()).resolves.toEqual([]);
    await expect(fixture.ports.save.save("manual")).resolves.toEqual({
      kind: "saved",
      slotId: "manual",
    });
    await expect(fixture.ports.save.load("auto.current")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(fixture.ports.save.clear("quick")).resolves.toEqual({
      kind: "cleared",
      slotId: "quick",
    });
  });

  it("passes selected bounded JSON bytes to persistence import exactly once", async () => {
    const bytes = Uint8Array.of(9, 8, 7);
    const imported = Object.freeze({
      kind: "imported" as const,
      compatibility: "exact" as const,
      commandSequence: parseNonNegativeSafeInteger(3),
    });
    const fixture = fixtureV1({
      selection: Object.freeze({ kind: "selected", name: "save.json", bytes }),
      importResult: imported,
    });

    await expect(fixture.ports.save.importSave()).resolves.toBe(imported);

    expect(fixture.files.selectOne).toHaveBeenCalledWith({
      acceptedMediaTypes: ["application/json"],
      maximumBytes: saveJsonLimitsV1.maxBytes,
    });
    expect(fixture.persistence.importSave).toHaveBeenCalledOnce();
    expect(fixture.persistence.importSave).toHaveBeenCalledWith(bytes);
  });

  it.each([
    Object.freeze({ kind: "cancelled" as const }),
    Object.freeze({ kind: "rejected" as const, code: "too_large" as const }),
    Object.freeze({ kind: "rejected" as const, code: "unsupported_type" as const }),
  ])("does not dispatch import for $kind file selection", async (selection) => {
    const fixture = fixtureV1({ selection });

    await expect(fixture.ports.save.importSave()).resolves.toBe(selection);

    expect(fixture.persistence.importSave).not.toHaveBeenCalled();
    expect(fixture.files.download).not.toHaveBeenCalled();
  });

  it("downloads an exported slot only after persistence returns its exact file", async () => {
    const file = exportedSaveV1("quick.json");
    const exported = Object.freeze({ kind: "exported" as const, slotId: "quick" as const, file });
    const fixture = fixtureV1({ exportSaveResult: exported });

    await expect(fixture.ports.save.exportSave("quick")).resolves.toBe(exported);

    expect(fixture.files.download).toHaveBeenCalledWith({
      filename: file.filename,
      mediaType: file.mediaType,
      bytes: file.bytes,
    });
  });

  it.each([
    Object.freeze({ kind: "rejected" as const, code: "empty_slot" as const }),
    Object.freeze({ kind: "faulted" as const, code: "persistence.unavailable" }),
  ])("does not download a $kind slot export", async (unsuccessful) => {
    const fixture = fixtureV1({ exportSaveResult: unsuccessful });

    await expect(fixture.ports.save.exportSave("quick")).resolves.toBe(unsuccessful);

    expect(fixture.files.download).not.toHaveBeenCalled();
  });

  it("downloads current Save and player-safe diagnostics exports without changing their results", async () => {
    const fixture = fixtureV1();

    const current = await fixture.ports.save.exportCurrentSave();
    const diagnostics = await fixture.ports.diagnostics.exportDebugBundle();

    expect(fixture.files.download).toHaveBeenNthCalledWith(1, {
      filename: current.filename,
      mediaType: current.mediaType,
      bytes: current.bytes,
    });
    expect(fixture.files.download).toHaveBeenNthCalledWith(2, {
      filename: fixture.exportedDiagnostics.filename,
      mediaType: fixture.exportedDiagnostics.mediaType,
      bytes: fixture.exportedDiagnostics.bytes,
    });
    expect(diagnostics).toBe(fixture.exportedDiagnostics);
  });
});
