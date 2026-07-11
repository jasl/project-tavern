// SPDX-License-Identifier: MIT
import { expect, test } from "@playwright/test";

test("@smoke Player dispatches the Sandbox command", async ({ page }) => {
  await page.goto("/#/play");
  await expect(page.getByText("计数：0")).toBeVisible();
  await page.getByRole("button", { name: "增加计数" }).click();
  await expect(page.getByText("计数：1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Playground" })).toHaveCount(0);
});

test("full keyboard, reload, and route isolation", async ({ page, browserName }) => {
  await page.goto("/#/play");
  await page.getByRole("button", { name: "增加计数" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("计数：1")).toBeVisible();
  await page.reload();
  await expect(page.getByText("计数：0")).toBeVisible();
  await page.goto("/#/playground");
  await expect(page.getByText("此入口不可用")).toBeVisible();
  await page.goto("http://127.0.0.1:4174/#/playground");
  await expect(page.getByRole("complementary", { name: "开发工具" })).toContainText(
    "Sandbox fixtures：1",
  );
  expect(["chromium", "webkit"]).toContain(browserName);
});

test("@visual stable Sandbox shell", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "reviewed screenshot is Chromium-owned");
  await page.goto("/#/play");
  await expect(page).toHaveScreenshot("sandbox-shell.png", { fullPage: true });
});
