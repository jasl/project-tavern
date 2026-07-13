// SPDX-License-Identifier: MIT
import { expect, test } from "@playwright/test";

test("@smoke E2E Artifact dispatches one semantic increment from one click", async ({ page }) => {
  await page.goto("/#/play");
  await expect(page.getByText("计数 0")).toBeVisible();
  await page.getByRole("button", { name: "增加计数" }).click();
  await expect(page.getByText("计数 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Playground" })).toHaveCount(0);
});

test("native keyboard activation, reload, and route isolation", async ({ page, browserName }) => {
  await page.goto("/#/play");
  await page.getByRole("button", { name: "增加计数" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("计数 1")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("计数 2")).toBeVisible();
  await page.reload();
  await expect(page.getByText("计数 0")).toBeVisible();
  await page.goto("/#/playground");
  await expect(page.getByText("此入口不可用")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "开发工具" })).toHaveCount(0);
  expect(["chromium", "webkit"]).toContain(browserName);
});

test("resolved semantic controls expose reasons and complete both branches", async ({ page }) => {
  for (const [branchIndex, branch] of (["选择左侧", "选择右侧"] as const).entries()) {
    if (branchIndex === 0) await page.goto("/#/play");
    else await page.reload();
    await expect(page.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();

    const branchButton = page.getByRole("button", { name: branch });
    await expect(branchButton).toBeDisabled();
    await expect(page.getByText("当前流程不可用").first()).toBeVisible();

    await page.getByRole("button", { name: "开始流程" }).click();
    await expect(branchButton).toBeEnabled();
    await branchButton.click();
    await page.getByRole("button", { name: "继续" }).click();
    const completeButton = page.getByRole("button", { name: "完成流程" });
    if (branch === "选择左侧") {
      await expect(completeButton).toBeDisabled();
      await page.getByRole("button", { name: "增加计数" }).click();
    }
    await expect(completeButton).toBeEnabled();
    await completeButton.click();
    await expect(page.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
  }
});

test("@visual stable E2E shell", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "reviewed screenshot is Chromium-owned");
  await page.goto("/#/play");
  await expect(page).toHaveScreenshot("e2e-shell.png", { fullPage: true });
});
