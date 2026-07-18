import { expect, test, type Locator, type Page } from "@playwright/test";

const e2eWebUrlV1 = "http://127.0.0.1:41731";

function semanticPublicationV1(page: Page) {
  return page.locator("[data-semantic-publication]");
}

async function visibleSemanticRevisionV1(page: Page): Promise<number> {
  const publication = semanticPublicationV1(page);
  await expect(publication).toHaveCount(1);
  await expect(publication).toBeVisible();
  await expect(publication).toHaveAttribute("data-semantic-status", /\S+/u);
  const value = await publication.getAttribute("data-semantic-revision");
  expect(value).toMatch(/^(?:0|[1-9]\d*)$/u);
  return Number(value);
}

async function expectVisibleSemanticRevisionV1(page: Page, revision: number): Promise<void> {
  const publication = semanticPublicationV1(page);
  await expect(publication).toBeVisible();
  await expect(publication).toHaveAttribute("data-semantic-revision", String(revision));
  await expect(publication).toHaveAttribute("data-semantic-status", /\S+/u);
}

async function activateV1(locator: Locator, touch: boolean): Promise<void> {
  if (touch) await locator.tap();
  else await locator.click();
}

async function expectInertActivationV1(locator: Locator, touch: boolean): Promise<void> {
  await expect(locator).toHaveCount(1);
  const attempt = touch
    ? locator.tap({ trial: true, timeout: 1_000 })
    : locator.click({ trial: true, timeout: 1_000 });
  await expect(attempt).rejects.toThrow();
}

test("mouse, touch, Enter, and Space each commit one increment", async ({ page }, testInfo) => {
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const spatialTarget = page.getByTestId("spatial-increment-target");

  if (testInfo.project.name === "chromium-touch") {
    await spatialTarget.tap();
  } else {
    await spatialTarget.click();
  }
  await expectVisibleSemanticRevisionV1(page, before + 1);

  const semanticButton = page
    .getByTestId("stage-scene-interaction")
    .getByRole("button", { name: "增加计数", exact: true });
  await semanticButton.focus();
  await page.keyboard.press("Enter");
  await expectVisibleSemanticRevisionV1(page, before + 2);

  await page.keyboard.press("Space");
  await expectVisibleSemanticRevisionV1(page, before + 3);
});

test("Interaction makes the ordinary Stage inert and restores focus on Escape", async ({
  page,
}, testInfo) => {
  const touch = testInfo.project.name === "chromium-touch";
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const entry = page.getByRole("button", { name: "与测试计数器互动" });
  const ordinaryStageAction = page
    .getByTestId("top-card-center")
    .locator("button", { hasText: "开始流程" });

  await expect(ordinaryStageAction).toBeEnabled();
  await entry.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("region", { name: "测试计数器互动" })).toBeVisible();
  await expect(page.getByTestId("stage-hud")).toHaveAttribute("inert", "");
  await expectInertActivationV1(ordinaryStageAction, touch);
  await expectVisibleSemanticRevisionV1(page, before);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toHaveCount(0);
  await expect(entry).toBeFocused();
  await expect(ordinaryStageAction).toBeEnabled();
  await expectVisibleSemanticRevisionV1(page, before);
});

test("blocking Narrative keeps Save, Settings, and diagnostics reachable", async ({
  page,
}, testInfo) => {
  const touch = testInfo.project.name === "chromium-touch";
  await page.goto(`${e2eWebUrlV1}/#/play`);
  await activateV1(
    page.getByRole("group", { name: "测试操作" }).getByRole("button", {
      name: "开始流程",
      exact: true,
    }),
    touch,
  );
  await expect(page.getByRole("dialog", { name: "流程操作" })).toBeVisible();

  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "设置" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "导出调试包" })).toBeEnabled();
  const beforeSettings = await visibleSemanticRevisionV1(page);
  const ordinaryInteractionAction = page
    .getByTestId("stage-scene-interaction")
    .getByRole("button", { name: "增加计数", exact: true });
  await expect(page.getByTestId("stage-hud")).toHaveAttribute("inert", "");
  await expectInertActivationV1(ordinaryInteractionAction, touch);
  await expectVisibleSemanticRevisionV1(page, beforeSettings);

  await activateV1(page.getByRole("button", { name: "设置" }), touch);
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  await activateV1(settings.getByRole("button", { name: "关闭" }), touch);

  await expect(page.getByRole("dialog", { name: "流程操作" })).toBeVisible();
  await expectVisibleSemanticRevisionV1(page, beforeSettings);
});
