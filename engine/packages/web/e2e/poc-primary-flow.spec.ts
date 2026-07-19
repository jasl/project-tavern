// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Buffer } from "node:buffer";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

type PocCapabilityV1 = "automation_bridge" | "cheats" | "debug_tools";

interface AutomationActionWitnessV1 {
  readonly actionId: string;
  readonly enabled: boolean;
}

interface AutomationPublicationWitnessV1 {
  readonly revision: number;
  readonly actions: readonly AutomationActionWitnessV1[];
}

interface RunIntegrityWitnessV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: number;
  readonly firstMutationSequence: number | null;
  readonly reasons: readonly {
    readonly kind: string;
    readonly commandKind?: string;
    readonly sequence: number;
  }[];
}

interface PocDebugBundleWitnessV1 {
  readonly commandLog: readonly {
    readonly source: string;
    readonly command: {
      readonly kind: string;
      readonly reasonId?: string;
    };
  }[];
  readonly currentSnapshot: {
    readonly integrity: RunIntegrityWitnessV1;
  };
}

const pocApplicationNameV1 = "Project Tavern 七日原型";

function pocUrlV1(capabilities: readonly PocCapabilityV1[] = ["automation_bridge"]): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${uiTargetUrlV1(uiTargetsV1.poc)}/${query.length === 0 ? "" : `?${query}`}#/play`;
}

async function expectPocApplicationV1(page: Page): Promise<Locator> {
  const application = page.getByRole("application", { name: pocApplicationNameV1 });
  await expect(application).toHaveCount(1);
  await expect(application).toHaveAttribute("data-application-id", uiTargetsV1.poc.applicationId);
  return application;
}

async function observeAutomationV1(page: Page): Promise<AutomationPublicationWitnessV1> {
  await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);
  return await page.evaluate(() => {
    const result = globalThis["__SILLYMAKER_AUTOMATION_V1__"]?.observe();
    if (result?.kind !== "ok") throw new Error("PoC Automation bridge is unavailable");
    return result.value as AutomationPublicationWitnessV1;
  });
}

async function performSemanticUiActionV1(
  page: Page,
  action: () => Promise<unknown>,
): Promise<AutomationPublicationWitnessV1> {
  const before = await observeAutomationV1(page);
  const [idle] = await Promise.all([
    page.evaluate(async (afterRevision) => {
      const bridge = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
      if (bridge === undefined) throw new Error("PoC Automation bridge is unavailable");
      const result = await bridge.waitForIdle(
        afterRevision as Parameters<typeof bridge.waitForIdle>[0],
      );
      if (result.kind !== "ok") throw new Error("PoC Automation bridge was revoked");
      return result.value as AutomationPublicationWitnessV1;
    }, before.revision),
    action(),
  ]);
  expect(idle.revision).toBeGreaterThan(before.revision);
  return idle;
}

async function enterPocWeekV1(page: Page): Promise<void> {
  await performSemanticUiActionV1(page, async () => {
    await page
      .getByTestId("stage-system")
      .getByRole("button", { name: "开始这一周", exact: true })
      .click();
  });

  const narrative = page.getByRole("dialog", { name: "旅店的一周" });
  await expect(narrative).toBeVisible();
  await performSemanticUiActionV1(page, async () => {
    await narrative.getByRole("button", { name: "继续" }).click();
  });
  await expect(narrative).toHaveCount(0);

  await page
    .getByTestId("stage-system")
    .getByRole("button", { name: "选择生活策略", exact: true })
    .click();
  const policy = page.getByRole("dialog", { name: "生活策略" });
  await expect(policy).toBeVisible();
  const nightOwl = policy.getByRole("radio", { name: "夜猫子作息" });
  await nightOwl.check();
  await expect(nightOwl).toBeChecked();
  await performSemanticUiActionV1(page, async () => {
    await policy.getByRole("button", { name: "确认" }).click();
  });
  await policy.getByRole("button", { name: "关闭" }).click();
  await expect(policy).toHaveCount(0);
}

async function cashTextV1(page: Page): Promise<string> {
  const cash = page.getByTestId("top-card-end").getByText(/^现金 -?\d+$/u);
  await expect(cash).toBeVisible();
  return (await cash.textContent()) ?? "";
}

async function cashAmountV1(page: Page): Promise<number> {
  const match = /^现金 (-?\d+)$/u.exec(await cashTextV1(page));
  expect(match).not.toBeNull();
  return Number(match?.[1]);
}

async function purchaseCoarseGrainV1(page: Page): Promise<void> {
  const publication = await observeAutomationV1(page);
  const purchase = publication.actions.filter(({ actionId }) => actionId === "action.purchase");
  expect(purchase).toEqual([expect.objectContaining({ enabled: true })]);

  await page
    .getByTestId("stage-system")
    .getByRole("button", { name: "采购原料", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "采购食材" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "添加一项" }).click();
  await dialog.getByRole("combobox", { name: "食材" }).selectOption({ label: "粗粮" });
  const quantity = dialog.getByRole("spinbutton", { name: "数量" });
  await quantity.fill("1");
  const confirm = dialog.getByRole("button", { name: "确认采购" });
  await expect(confirm).toBeEnabled();
  await performSemanticUiActionV1(page, async () => {
    await confirm.click();
  });
  await dialog.getByRole("button", { name: "关闭" }).click();
  await expect(dialog).toHaveCount(0);
}

async function openSaveOverlayV1(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "保存" }).click();
  const dialog = page.getByRole("dialog", { name: "保存" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("本地存档可用")).toBeVisible();
  return dialog;
}

async function saveSlotV1(
  dialog: Locator,
  buttonName: "快速保存" | "手动保存",
  completedText: "已保存到快速存档" | "已保存到手动存档",
): Promise<void> {
  const save = dialog.getByRole("button", { name: buttonName });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog.getByTestId("save-operation-result")).toHaveText(completedText);
  await expect(dialog.getByText("本地存档可用")).toBeVisible();
}

async function loadSlotV1(page: Page, dialog: Locator, slotName: string): Promise<void> {
  const load = dialog.getByRole("button", { name: `载入${slotName}` });
  await expect(load).toBeEnabled();
  await load.click();
  const confirmation = page.getByRole("dialog", { name: `载入${slotName}` });
  await expect(confirmation).toBeVisible();
  await performSemanticUiActionV1(page, async () => {
    await confirmation.getByRole("button", { name: "确认" }).click();
  });
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.getByTestId("save-operation-result")).toHaveText("已载入存档");
}

async function exportDebugBundleV1(page: Page): Promise<PocDebugBundleWitnessV1> {
  const exportButton = page.getByRole("button", { name: "导出调试包" });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  const review = page.getByRole("region", { name: "检查调试包内容" });
  await expect(review).toBeVisible();
  await expect(review.getByText("完整游戏状态与命令历史")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    review.getByRole("button", { name: "保存调试包" }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  await expect(page.getByText("调试包已保存")).toBeVisible();
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as PocDebugBundleWitnessV1;
}

async function expectAutomationHasNoDebugAuthorityV1(page: Page): Promise<void> {
  const keys = await page.evaluate(() => {
    const bridge = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    if (bridge === undefined) throw new Error("PoC Automation bridge is unavailable");
    return Object.keys(bridge).toSorted();
  });
  expect(keys).toEqual([
    "availableActions",
    "contractRevision",
    "dispatch",
    "observe",
    "preview",
    "waitForIdle",
  ]);
  expect(keys).not.toEqual(expect.arrayContaining(["debugTools", "executeDebugCommand"]));
}

test.describe("PoC primary flow", () => {
  test("@smoke @primary-flow PoC completes its first ordinary action", async ({ page }) => {
    await page.goto(pocUrlV1());
    await expectPocApplicationV1(page);
    await enterPocWeekV1(page);
    const beforeCash = await cashTextV1(page);

    await purchaseCoarseGrainV1(page);

    expect(await cashTextV1(page)).not.toBe(beforeCash);
  });

  test("new game, initial VN, policy, action, both saves, and reload recovery use public UI", async ({
    page,
  }) => {
    await page.goto(pocUrlV1());
    await expectPocApplicationV1(page);
    await enterPocWeekV1(page);
    await purchaseCoarseGrainV1(page);
    const savedCash = await cashTextV1(page);

    let saveDialog = await openSaveOverlayV1(page);
    await saveSlotV1(saveDialog, "快速保存", "已保存到快速存档");
    await saveSlotV1(saveDialog, "手动保存", "已保存到手动存档");

    await page.reload();
    await expectPocApplicationV1(page);
    saveDialog = await openSaveOverlayV1(page);
    await loadSlotV1(page, saveDialog, "手动存档");
    await saveDialog.getByRole("button", { name: "关闭" }).click();

    await expect(page.getByRole("button", { name: "开始这一周", exact: true })).toHaveCount(0);
    expect(await cashTextV1(page)).toBe(savedCash);
    await expect(
      page
        .locator('[data-semantic-action-catalog="true"]')
        .locator('[data-semantic-action-id="action.purchase"]')
        .first(),
    ).toBeDisabled();
    expect(
      (await observeAutomationV1(page)).actions.filter(
        ({ actionId }) => actionId === "action.purchase",
      ),
    ).toEqual([expect.objectContaining({ enabled: false })]);
  });

  test("the authored cash Cheat survives Quick Save and public reload recovery", async ({
    page,
  }) => {
    await page.goto(pocUrlV1(["debug_tools", "cheats", "automation_bridge"]));
    await expectPocApplicationV1(page);
    await expectAutomationHasNoDebugAuthorityV1(page);
    const cashBeforeCheat = await cashAmountV1(page);

    await page.getByRole("button", { name: "打开右侧开发工具" }).click();
    const commandsTab = page.getByRole("button", { name: "调试命令" });
    await expect(commandsTab).toBeVisible();
    await commandsTab.click();
    const command = page.getByRole("region", { name: "PoC 调试命令：调整现金" });
    await expect(command.getByText("现金变化")).toBeVisible();
    await expect(command.getByText("5", { exact: true })).toBeVisible();
    await command.getByRole("checkbox", { name: "我确认执行调整现金" }).check();
    const submit = command.getByRole("button", { name: "执行调试命令" });
    await expect(submit).toBeEnabled();
    await performSemanticUiActionV1(page, async () => {
      await submit.click();
    });
    expect(await cashAmountV1(page)).toBe(cashBeforeCheat + 5);
    await page.getByRole("button", { name: "关闭右侧开发工具" }).click();

    const firstBundle = await exportDebugBundleV1(page);
    expect(firstBundle.currentSnapshot.integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.inventory.adjust_cash",
          sequence: 1,
        },
      ],
    });
    expect(firstBundle.commandLog).toEqual([
      expect.objectContaining({
        source: "debug",
        command: expect.objectContaining({
          kind: "debug.inventory.adjust_cash",
          reasonId: "reason.debug.cash_adjustment",
        }),
      }),
    ]);

    let saveDialog = await openSaveOverlayV1(page);
    await saveSlotV1(saveDialog, "快速保存", "已保存到快速存档");

    await page.reload();
    await expectPocApplicationV1(page);
    saveDialog = await openSaveOverlayV1(page);
    await loadSlotV1(page, saveDialog, "快速存档");
    await saveDialog.getByRole("button", { name: "关闭" }).click();
    await expectAutomationHasNoDebugAuthorityV1(page);

    const reloadedBundle = await exportDebugBundleV1(page);
    expect(reloadedBundle.currentSnapshot.integrity).toEqual(firstBundle.currentSnapshot.integrity);
  });
});
