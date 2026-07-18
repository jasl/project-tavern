// SPDX-License-Identifier: MIT
import { expect, test } from "@playwright/test";

test("@smoke E2E Artifact dispatches one semantic increment from one click", async ({ page }) => {
  await page.goto("/#/play");
  await expect(page.getByText("计数 0")).toBeVisible();
  await page
    .getByTestId("stage-scene-interaction")
    .getByRole("button", { name: "增加计数", exact: true })
    .click();
  await expect(page.getByText("计数 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Playground" })).toHaveCount(0);
});

test("native keyboard activation, reload, and route isolation", async ({ page, browserName }) => {
  await page.goto("/#/play");
  await page
    .getByTestId("stage-scene-interaction")
    .getByRole("button", { name: "增加计数", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("计数 1")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("计数 2")).toBeVisible();
  await page.reload();
  await expect(page.getByText("计数 0")).toBeVisible();
  await page.goto("/#/playground");
  await expect(page).toHaveURL(/\/#\/$/u);
  await expect(page.getByRole("navigation", { name: "引擎测试主菜单" })).toBeVisible();
  await expect(page.getByRole("link", { name: "进入测试" })).toHaveAttribute("href", "#/play");
  await expect(page.getByRole("complementary", { name: "开发工具" })).toHaveCount(0);
  expect(["chromium", "webkit"]).toContain(browserName);
});

test("resolved semantic controls expose reasons and complete both branches", async ({ page }) => {
  for (const [branchIndex, branch] of (["选择左侧", "选择右侧"] as const).entries()) {
    if (branchIndex === 0) await page.goto("/#/play");
    else await page.reload();
    await expect(page.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();

    const catalogBranch = page
      .getByRole("group", { name: "语义操作" })
      .getByRole("button", { name: `语义目录：${branch}`, exact: true });
    await expect(catalogBranch).toBeDisabled();
    await expect(page.getByText("当前流程不可用").first()).toBeVisible();

    await page
      .getByRole("group", { name: "测试操作" })
      .getByRole("button", { name: "开始流程", exact: true })
      .click();
    const narrative = page.getByRole("dialog", { name: "流程操作" });
    const branchButton = narrative.getByRole("button", { name: branch, exact: true });
    await expect(branchButton).toBeEnabled();
    await branchButton.click();
    await narrative.getByRole("button", { name: "继续", exact: true }).click();
    const completeButton = page
      .getByRole("group", { name: "测试操作" })
      .getByRole("button", { name: "完成流程", exact: true });
    if (branch === "选择左侧") {
      await expect(completeButton).toBeDisabled();
      await page
        .getByTestId("stage-scene-interaction")
        .getByRole("button", { name: "增加计数", exact: true })
        .click();
    }
    await expect(completeButton).toBeEnabled();
    await completeButton.click();
    await expect(page.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("button", { name: "设置" })).toBeVisible();
    const catalogControls = page
      .getByRole("group", { name: "语义操作" })
      .locator("button[data-semantic-action-id]");
    await expect(catalogControls).toHaveCount(6);
    for (const control of await catalogControls.all()) await expect(control).toBeDisabled();
  }
});
