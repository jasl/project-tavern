// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator, type Page } from "@playwright/test";

const releasePlayUrlV1 = "http://127.0.0.1:41731/nested/tavern/#/play";

async function expectPocApplicationV1(page: Page): Promise<void> {
  await expect(page.getByRole("application", { name: "Project Tavern 七日原型" })).toHaveAttribute(
    "data-application-id",
    "poc-web",
  );
}

async function enterPocWeekV1(page: Page): Promise<void> {
  const start = page
    .getByTestId("stage-system")
    .getByRole("button", { name: "开始这一周", exact: true });
  await expect(start).toBeVisible();
  await start.click();

  const initialNarrative = page.getByRole("dialog", { name: "旅店的一周" });
  await expect(initialNarrative).toBeVisible();
  await initialNarrative.getByRole("button", { name: "继续", exact: true }).click();
  await expect(initialNarrative).toHaveCount(0);

  await page
    .getByTestId("stage-system")
    .getByRole("button", { name: "选择生活策略", exact: true })
    .click();
  const policy = page.getByRole("dialog", { name: "生活策略" });
  await expect(policy).toBeVisible();
  await policy.getByRole("radio", { name: "夜猫子作息" }).check();
  await policy.getByRole("button", { name: "确认", exact: true }).click();
  await policy.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(policy).toHaveCount(0);
}

async function cashTextV1(page: Page): Promise<string> {
  const cash = page.getByTestId("top-card-end").getByText(/^现金 -?\d+$/u);
  await expect(cash).toBeVisible();
  return (await cash.textContent()) ?? "";
}

async function purchaseFirstIngredientV1(page: Page): Promise<void> {
  const beforeCash = await cashTextV1(page);
  await page
    .getByTestId("stage-system")
    .getByRole("button", { name: "采购原料", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "采购食材" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "添加一项" }).click();
  await dialog.getByRole("combobox", { name: "食材" }).selectOption({ label: "粗粮" });
  await dialog.getByRole("spinbutton", { name: "数量" }).fill("1");
  await dialog.getByRole("button", { name: "确认采购" }).click();
  await expect(page.getByTestId("top-card-end").getByText(/^现金 -?\d+$/u)).not.toHaveText(
    beforeCash,
  );
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function openSaveOverlayV1(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "保存" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("本地存档可用")).toBeVisible();
  return dialog;
}

async function saveManualV1(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "手动保存", exact: true }).click();
  await expect(dialog.getByTestId("save-operation-result")).toHaveText("已保存到手动存档");
}

async function loadManualV1(page: Page, dialog: Locator): Promise<void> {
  const load = dialog.getByRole("button", { name: "载入手动存档", exact: true });
  await expect(load).toBeEnabled();
  await load.click();
  const confirmation = page.getByRole("dialog", { name: "载入手动存档" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "确认", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.getByTestId("save-operation-result")).toHaveText("已载入存档");
}

test.describe("prebuilt PoC refresh continuity", () => {
  test("runs new game, initial VN, first action, Save, refresh, and continue from the shipped bytes", async ({
    page,
  }) => {
    await page.goto(releasePlayUrlV1);
    await expectPocApplicationV1(page);
    await enterPocWeekV1(page);
    await purchaseFirstIngredientV1(page);
    const savedCash = await cashTextV1(page);

    let saveDialog = await openSaveOverlayV1(page);
    await saveManualV1(saveDialog);

    await page.reload();
    await expectPocApplicationV1(page);
    await expect(page).toHaveURL(releasePlayUrlV1);
    saveDialog = await openSaveOverlayV1(page);
    await loadManualV1(page, saveDialog);
    await saveDialog.getByRole("button", { name: "关闭", exact: true }).click();

    await expect(page.getByRole("button", { name: "开始这一周", exact: true })).toHaveCount(0);
    expect(await cashTextV1(page)).toBe(savedCash);
    await expect(
      page
        .locator('[data-semantic-action-catalog="true"]')
        .locator('[data-semantic-action-id="action.purchase"]')
        .first(),
    ).toBeDisabled();
  });
});
