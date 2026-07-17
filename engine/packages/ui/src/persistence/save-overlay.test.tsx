// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  type ExportedSaveV1,
  type PersistenceOperationResultV1,
  type PersistenceStatusV1,
  type SaveExportOperationResultV1,
  type SaveSlotHealthV1,
  type SaveSlotIdV1,
  type SaveSlotSummaryV1,
} from "@sillymaker/base";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInputRouterV1 } from "../input/input-router.js";
import {
  SaveOverlayV1,
  type SaveOverlayLabelsV1,
  type SaveOverlayPortV1,
  type SaveUiImportResultV1,
} from "./save-overlay.js";

afterEach(cleanup);

const slotIdsV1 = Object.freeze([
  "auto.current",
  "auto.previous",
  "quick",
  "manual",
] as const satisfies readonly SaveSlotIdV1[]);

const exportedSaveV1 = Object.freeze({
  filename: "tavern-save.json",
  mediaType: "application/json",
  digest: parseDigest(`sha256:${"0".repeat(64)}`),
  bytes: new Uint8Array([1, 2, 3]),
}) satisfies ExportedSaveV1;

const labelsV1 = Object.freeze({
  accessibleName: "存档管理",
  title: "存档管理",
  storageLoading: "正在读取本地存档状态…",
  storageReady: "本地存储可用",
  storageBusy: "本地存储正忙",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽位",
  safelySaved: (sequence: number) => `已安全保存至指令 ${sequence}`,
  lastFailure: (code: string) => `最近一次存储错误：${code}`,
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manual: "手动存档",
  }),
  slotHealth: Object.freeze({
    empty: "空槽位",
    valid: "存档有效",
    invalid: "存档损坏",
    recovery_candidate: "可恢复的备用存档",
    unavailable: "槽位不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `读取${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `确认读取${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `确认清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "确认导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认操作",
    cancelLabel: "取消操作",
    pendingText: "正在提交操作…",
    completedText: "操作已返回结果",
    failedText: "操作未能提交",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `正在安全写入${slotName}…`,
    loading: (slotName: string) => `正在读取${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `${slotName}已保存`,
    cleared: (slotName: string) => `${slotName}已清除`,
    loadedExact: "已读取完全兼容的存档",
    loadedAdopted: "已读取并采用兼容补丁的存档",
    importedExact: "已导入完全兼容的存档",
    importedAdopted: "已导入并采用兼容补丁的存档",
    importCancelled: "已取消导入存档",
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `${slotName}已导出`,
    exportedCurrent: "当前进度已导出",
    rejected: Object.freeze({
      busy: "存储正忙，请稍后重试",
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      invalid_record: "存档记录无效",
      lineage_limit: "存档兼容链超过限制",
      incompatible: "存档与当前游戏不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      invalid_record: "存档记录无效",
    }),
    faulted: (code: string) => `存档操作失败：${code}`,
    unexpectedFailure: "存档操作发生未预期错误",
  }),
}) satisfies SaveOverlayLabelsV1;

function statusV1(overrides: Partial<PersistenceStatusV1> = {}): PersistenceStatusV1 {
  return Object.freeze({
    available: true,
    busy: false,
    safelySavedCommandSequence: null,
    lastFailureCode: null,
    ...overrides,
  });
}

function slotV1(slotId: SaveSlotIdV1, health: SaveSlotHealthV1): SaveSlotSummaryV1 {
  return Object.freeze({
    slotId,
    health,
    recordRevision: null,
    capturedCommandSequence: null,
    savedAt: null,
    warningCodes: Object.freeze([]),
  });
}

interface FixtureOptionsV1 {
  readonly status?: PersistenceStatusV1 | Promise<PersistenceStatusV1>;
  readonly slots?: readonly SaveSlotSummaryV1[];
  readonly saveResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly loadResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly clearResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly importResult?: SaveUiImportResultV1 | Promise<SaveUiImportResultV1>;
  readonly exportResult?: SaveExportOperationResultV1 | Promise<SaveExportOperationResultV1>;
}

function fixtureV1(options: FixtureOptionsV1 = {}) {
  const slots =
    options.slots ??
    slotIdsV1.map((slotId) => slotV1(slotId, slotId === "quick" ? "valid" : "empty"));
  const getStatus = vi.fn(() => options.status ?? statusV1());
  const listSlots = vi.fn(async () => slots);
  const save = vi.fn(async (slotId: "quick" | "manual") =>
    Promise.resolve(options.saveResult ?? Object.freeze({ kind: "saved" as const, slotId })),
  );
  const load = vi.fn(async (_slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.loadResult ??
        Object.freeze({
          kind: "loaded" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    ),
  );
  const clear = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.clearResult ?? Object.freeze({ kind: "cleared" as const, slotId })),
  );
  const importSave = vi.fn(async () =>
    Promise.resolve(
      options.importResult ??
        Object.freeze({
          kind: "imported" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    ),
  );
  const exportSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.exportResult ??
        Object.freeze({ kind: "exported" as const, slotId, file: exportedSaveV1 }),
    ),
  );
  const exportCurrentSave = vi.fn(async () => exportedSaveV1);
  const port = Object.freeze({
    getStatus,
    listSlots,
    save,
    load,
    clear,
    importSave,
    exportSave,
    exportCurrentSave,
  }) satisfies SaveOverlayPortV1;
  return Object.freeze({
    port,
    getStatus,
    listSlots,
    save,
    load,
    clear,
    importSave,
    exportSave,
    exportCurrentSave,
  });
}

function renderFixtureV1(fixture = fixtureV1()) {
  return render(
    <SaveOverlayV1 port={fixture.port} labels={labelsV1} inputRouter={createInputRouterV1()} />,
  );
}

describe("SaveOverlayV1", () => {
  it("shows all four slots in physical order but writes only Quick and Manual", async () => {
    renderFixtureV1();

    expect((await screen.findAllByRole("listitem")).map((entry) => entry.dataset.slotId)).toEqual(
      slotIdsV1,
    );
    expect(screen.queryByRole("button", { name: "写入当前自动存档" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "手动保存" })).toBeEnabled();
  });

  it("accepts the live Phase 3 asynchronous status port without creating another authority", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1({ busy: true })) });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储正忙")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    expect(fixture.getStatus).toHaveBeenCalledOnce();
  });

  it("remains live across the StrictMode setup-cleanup-setup probe", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1()) });
    render(
      <StrictMode>
        <SaveOverlayV1 port={fixture.port} labels={labelsV1} inputRouter={createInputRouterV1()} />
      </StrictMode>,
    );

    expect(await screen.findByText("本地存储可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
  });

  it("maps empty, valid, invalid, and recovery-candidate slot health without reordering", async () => {
    renderFixtureV1(
      fixtureV1({
        slots: Object.freeze([
          slotV1("manual", "recovery_candidate"),
          slotV1("quick", "invalid"),
          slotV1("auto.previous", "valid"),
          slotV1("auto.current", "empty"),
        ]),
      }),
    );

    const entries = await screen.findAllByRole("listitem");
    expect(entries.map((entry) => entry.dataset.slotId)).toEqual(slotIdsV1);
    expect(entries.map((entry) => entry.querySelector("[data-slot-health]")?.textContent)).toEqual([
      "空槽位",
      "存档有效",
      "存档损坏",
      "可恢复的备用存档",
    ]);
  });

  it("does not report success before the persistence operation commits", async () => {
    let resolveSave!: (result: PersistenceOperationResultV1) => void;
    const pending = new Promise<PersistenceOperationResultV1>((resolve) => {
      resolveSave = resolve;
    });
    const fixture = fixtureV1({ saveResult: pending });
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "快速保存" }));
    expect(screen.getByText("正在安全写入快速存档…")).toBeVisible();
    expect(screen.queryByText("快速存档已保存")).not.toBeInTheDocument();

    resolveSave(Object.freeze({ kind: "saved", slotId: "quick" }));
    expect(await screen.findByText("快速存档已保存")).toBeVisible();
  });

  it("keeps current-session export available when storage is unavailable", async () => {
    const fixture = fixtureV1({
      status: statusV1({ available: false }),
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "unavailable")),
    });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储不可用")).toBeVisible();
    const exportCurrent = screen.getByRole("button", { name: "导出当前进度" });
    expect(exportCurrent).toBeEnabled();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    await userEvent.setup().click(exportCurrent);
    expect(fixture.exportCurrentSave).toHaveBeenCalledOnce();
    expect(await screen.findByText("当前进度已导出")).toBeVisible();
  });

  it("requires explicit confirmation before load, clear, and import", async () => {
    const fixture = fixtureV1({
      slots: Object.freeze([
        slotV1("auto.current", "valid"),
        slotV1("auto.previous", "empty"),
        slotV1("quick", "invalid"),
        slotV1("manual", "valid"),
      ]),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    const load = await screen.findByRole("button", { name: "读取当前自动存档" });
    await user.click(load);
    expect(fixture.load).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "确认读取当前自动存档" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "确认操作" }));
    await waitFor(() => expect(fixture.load).toHaveBeenCalledWith("auto.current"));

    const clear = await screen.findByRole("button", { name: "清除快速存档" });
    await user.click(clear);
    expect(fixture.clear).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "确认清除快速存档" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "确认操作" }));
    await waitFor(() => expect(fixture.clear).toHaveBeenCalledWith("quick"));

    const importSave = await screen.findByRole("button", { name: "导入存档" });
    await user.click(importSave);
    expect(fixture.importSave).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "确认导入存档" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "确认操作" }));
    await waitFor(() => expect(fixture.importSave).toHaveBeenCalledOnce());
  });

  it("projects a cancelled Host file selection without inventing a persistence result", async () => {
    const fixture = fixtureV1({ importResult: Object.freeze({ kind: "cancelled" }) });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));
    await user.click(screen.getByRole("button", { name: "确认操作" }));

    expect(await screen.findByText("已取消导入存档")).toBeVisible();
    expect(screen.queryByText("存档操作发生未预期错误")).not.toBeInTheDocument();
  });

  it.each([
    ["too_large", "所选存档文件过大"],
    ["unsupported_type", "所选文件类型不受支持"],
  ] as const)("projects Host file rejection %s independently", async (code, expectedText) => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));
    await user.click(screen.getByRole("button", { name: "确认操作" }));

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent(expectedText));
    await waitFor(() => expect(result).toHaveFocus());
  });

  it("reports conflict and fault results truthfully and focuses the result summary", async () => {
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
      loadResult: Object.freeze({ kind: "rejected", code: "conflict" }),
      saveResult: Object.freeze({ kind: "faulted", code: "persistence.write_failed" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "读取当前自动存档" }));
    await user.click(screen.getByRole("button", { name: "确认操作" }));
    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("存档已被其他页面更新"));
    await waitFor(() => expect(result).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "快速保存" }));
    expect(await screen.findByText("存档操作失败：persistence.write_failed")).toBeVisible();
    await waitFor(() => expect(result).toHaveFocus());
  });

  it("focuses a successful confirmed result while the opener is disabled by refresh", async () => {
    let resolvePostOperationStatus!: (status: PersistenceStatusV1) => void;
    const postOperationStatus = new Promise<PersistenceStatusV1>((resolve) => {
      resolvePostOperationStatus = resolve;
    });
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
    });
    fixture.getStatus.mockReturnValueOnce(statusV1()).mockReturnValueOnce(postOperationStatus);
    renderFixtureV1(fixture);
    const user = userEvent.setup();
    const opener = await screen.findByRole("button", { name: "读取当前自动存档" });

    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "确认操作" }));

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("已读取完全兼容的存档"));
    expect(opener).toBeDisabled();
    await waitFor(() => expect(result).toHaveFocus());

    resolvePostOperationStatus(statusV1());
    await waitFor(() => expect(opener).toBeEnabled());
  });

  it("returns focus to the exact opener when a confirmation is cancelled", async () => {
    renderFixtureV1(fixtureV1({ slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")) }));
    const user = userEvent.setup();
    const opener = await screen.findByRole("button", { name: "读取当前自动存档" });

    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "取消操作" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("leaves the rendered semantic publication untouched when import is rejected", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "incompatible" }),
    });
    render(
      <>
        <output data-testid="semantic-publication">revision:7</output>
        <SaveOverlayV1 port={fixture.port} labels={labelsV1} inputRouter={createInputRouterV1()} />
      </>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));
    await user.click(screen.getByRole("button", { name: "确认操作" }));

    expect(await screen.findByText("存档与当前游戏不兼容")).toBeVisible();
    expect(screen.getByTestId("semantic-publication")).toHaveTextContent("revision:7");
  });

  it("bounds thrown export failures instead of leaking an unhandled rejection", async () => {
    const fixture = fixtureV1();
    fixture.exportCurrentSave.mockRejectedValueOnce(new Error("browser export failed"));
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "导出当前进度" }));

    expect(await screen.findByText("存档操作发生未预期错误")).toBeVisible();
  });
});
