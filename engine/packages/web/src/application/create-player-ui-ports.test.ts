// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
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

function exportedDebugBundleV1(input?: {
  readonly failure?: boolean;
  readonly uiContext?: boolean;
}): ExportedDebugBundleV1 {
  const bytes = canonicalJsonBytes({
    formatRevision: 1,
    provenance: { storyId: "story.synthetic" },
    capabilities: { debugTools: false },
    simulationLineage: [],
    generatedAt: "2026-07-18T00:00:00Z",
    replayBase: { commandSequence: 0 },
    replayBaseStateDigest: digestBytes(Uint8Array.of(1)),
    commandLog: [],
    currentSnapshot: { commandSequence: 0 },
    currentStateDigest: digestBytes(Uint8Array.of(1)),
    diagnostics: {},
    runtimeFailures: [],
    ...(input?.failure === true ? { failure: { code: "runtime.synthetic" } } : {}),
    ...(input?.uiContext === true ? { uiContext: { routeId: "route.synthetic" } } : {}),
  });
  return Object.freeze({
    filename: "diagnostics.json",
    mediaType: "application/json",
    digest: digestBytes(bytes),
    bytes,
  });
}

function deferredV1<TValue>() {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function fixtureV1(input?: {
  readonly selection?: Awaited<ReturnType<HostFilePortV1["selectOne"]>>;
  readonly exportSaveResult?: SaveExportOperationResultV1;
  readonly exportedDiagnostics?: ExportedDebugBundleV1;
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
    download: vi.fn(async (_request: Parameters<HostFilePortV1["download"]>[0]) => undefined),
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
  const exportedDiagnostics = input?.exportedDiagnostics ?? exportedDebugBundleV1();
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

  it("prepares a byte-free diagnostics review and downloads only after explicit save", async () => {
    const fixture = fixtureV1();

    const current = await fixture.ports.save.exportCurrentSave();
    const preview = await fixture.ports.diagnostics.prepareDebugBundle();

    expect(fixture.files.download).toHaveBeenNthCalledWith(1, {
      filename: current.filename,
      mediaType: current.mediaType,
      bytes: current.bytes,
    });
    expect(fixture.files.download).toHaveBeenCalledTimes(1);
    expect(preview).toEqual({
      filename: fixture.exportedDiagnostics.filename,
      mediaType: fixture.exportedDiagnostics.mediaType,
      digest: fixture.exportedDiagnostics.digest,
      encodedByteLength: fixture.exportedDiagnostics.bytes.byteLength,
      categories: [
        "provenance",
        "capabilities_and_integrity",
        "replay_evidence",
        "diagnostics_and_runtime_failures",
      ],
    });
    expect(preview).not.toHaveProperty("bytes");

    await fixture.ports.diagnostics.savePreparedDebugBundle();

    expect(fixture.files.download).toHaveBeenNthCalledWith(2, {
      filename: fixture.exportedDiagnostics.filename,
      mediaType: fixture.exportedDiagnostics.mediaType,
      bytes: fixture.exportedDiagnostics.bytes,
    });
    await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).rejects.toThrow(TypeError);
  });

  it("classifies optional failure and UI context only when present", async () => {
    const fixture = fixtureV1({
      exportedDiagnostics: exportedDebugBundleV1({ failure: true, uiContext: true }),
    });

    await expect(fixture.ports.diagnostics.prepareDebugBundle()).resolves.toMatchObject({
      categories: [
        "provenance",
        "capabilities_and_integrity",
        "replay_evidence",
        "diagnostics_and_runtime_failures",
        "failure_context",
        "ui_context",
      ],
    });

    expect(fixture.files.download).not.toHaveBeenCalled();
  });

  it("retains the same detached bytes after a download failure and clears them after retry", async () => {
    const fixture = fixtureV1();
    const expectedBytes = Uint8Array.from(fixture.exportedDiagnostics.bytes);
    fixture.files.download.mockRejectedValueOnce(new Error("download failed"));

    await fixture.ports.diagnostics.prepareDebugBundle();
    fixture.exportedDiagnostics.bytes.fill(0);
    await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).rejects.toThrow(
      "download failed",
    );
    await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).resolves.toBeUndefined();

    expect(fixture.diagnostics.exportDebugBundle).toHaveBeenCalledOnce();
    expect(fixture.files.download).toHaveBeenCalledTimes(2);
    for (const call of fixture.files.download.mock.calls) {
      expect(call[0]?.bytes).toEqual(expectedBytes);
      expect(call[0]?.bytes).not.toBe(fixture.exportedDiagnostics.bytes);
    }
    await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).rejects.toThrow(TypeError);
  });

  it("discards a pending prepare without allowing late bytes to revive", async () => {
    const fixture = fixtureV1();
    const pending = deferredV1<ExportedDebugBundleV1>();
    fixture.diagnostics.exportDebugBundle.mockImplementationOnce(() => pending.promise);

    const prepare = fixture.ports.diagnostics.prepareDebugBundle();
    fixture.ports.diagnostics.discardPreparedDebugBundle();
    fixture.ports.diagnostics.discardPreparedDebugBundle();
    pending.resolve(fixture.exportedDiagnostics);

    await expect(prepare).rejects.toThrow("prepared Debug Bundle was discarded");
    await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).rejects.toThrow(TypeError);
    expect(fixture.files.download).not.toHaveBeenCalled();
  });

  it.each([
    (() => {
      const bytes = Uint8Array.of(0x7b);
      return Object.freeze({
        filename: "diagnostics.json",
        mediaType: "application/json" as const,
        digest: digestBytes(bytes),
        bytes,
      });
    })(),
    (() => {
      const valid = exportedDebugBundleV1();
      return Object.freeze({ ...valid, digest: digestBytes(Uint8Array.of(9)) });
    })(),
    (() => {
      const bytes = canonicalJsonBytes({ formatRevision: 1, unknown: true });
      return Object.freeze({
        filename: "diagnostics.json",
        mediaType: "application/json" as const,
        digest: digestBytes(bytes),
        bytes,
      });
    })(),
    (() => {
      const valid = exportedDebugBundleV1();
      const invalid = { ...valid };
      Object.defineProperty(invalid, Symbol("hidden"), { value: "unexpected" });
      return invalid;
    })(),
  ])(
    "rejects invalid Debug Bundle bytes without retaining or downloading them",
    async (invalid) => {
      const fixture = fixtureV1({ exportedDiagnostics: invalid });

      await expect(fixture.ports.diagnostics.prepareDebugBundle()).rejects.toThrow(TypeError);
      await expect(fixture.ports.diagnostics.savePreparedDebugBundle()).rejects.toThrow(TypeError);
      expect(fixture.files.download).not.toHaveBeenCalled();
    },
  );
});
