import { expect, test, type Page } from "@playwright/test";

const e2eWebUrlV1 = "http://127.0.0.1:41731";
const pocWebUrlV1 = "http://127.0.0.1:41732";

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

async function activateV1(page: Page, accessibleName: string, touch: boolean): Promise<void> {
  const control = page.getByRole("button", { name: accessibleName });
  if (touch) await control.tap();
  else await control.click();
}

async function openE2eInteractionV1(page: Page, touch: boolean): Promise<void> {
  await activateV1(page, "与测试计数器互动", touch);
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toBeVisible();
}

async function enterPocWeekV1(page: Page, touch: boolean): Promise<void> {
  let revision = await visibleSemanticRevisionV1(page);
  await activateV1(page, "开始这一周", touch);
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);

  const narrative = page.getByRole("dialog", { name: "旅店的一周" });
  await expect(narrative).toBeVisible();
  const advance = narrative.getByRole("button", { name: "继续" });
  await expect(advance).toBeEnabled();
  if (touch) await advance.tap();
  else await advance.click();
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);
  await expect(narrative).toHaveCount(0);

  const choosePolicy = page.getByRole("button", { name: "选择生活策略" });
  await expect(choosePolicy).toBeEnabled();
  if (touch) await choosePolicy.tap();
  else await choosePolicy.click();
  const policy = page.getByRole("dialog", { name: "生活策略" });
  await expect(policy).toBeVisible();
  const nightOwl = policy.getByRole("radio", { name: "夜猫子作息" });
  if (touch) await nightOwl.tap();
  else await nightOwl.click();
  await expect(nightOwl).toBeChecked();
  const confirm = policy.getByRole("button", { name: "确认" });
  if (touch) await confirm.tap();
  else await confirm.click();
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);
  const close = policy.getByRole("button", { name: "关闭" });
  if (touch) await close.tap();
  else await close.click();
  await expect(policy).toHaveCount(0);
  await expect(page.getByRole("button", { name: "采购原料" })).toBeEnabled();
}

test("pointer cancel and focus loss each leave no open transient Interaction", async ({
  page,
}, testInfo) => {
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  const touch = testInfo.project.name === "chromium-touch";

  await openE2eInteractionV1(page, touch);
  const spatialTarget = page.getByTestId("spatial-increment-target");
  await spatialTarget.hover();
  await page.mouse.down();
  await spatialTarget.dispatchEvent("pointercancel", {
    bubbles: true,
    isPrimary: true,
    pointerId: 1,
    pointerType: "mouse",
  });
  await page.mouse.up();
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toHaveCount(0);
  await expectVisibleSemanticRevisionV1(page, before);

  await openE2eInteractionV1(page, touch);
  await page.evaluate(() => globalThis.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("region", { name: "测试计数器互动" })).toHaveCount(0);
  await expectVisibleSemanticRevisionV1(page, before);
});

test("PoC Stage replacement closes heroine Interaction without a Gameplay revision", async ({
  page,
}, testInfo) => {
  await page.goto(`${pocWebUrlV1}/#/play`);
  const touch = testInfo.project.name === "chromium-touch";
  await enterPocWeekV1(page, touch);
  const before = await visibleSemanticRevisionV1(page);
  const heroineEntry = page.locator(
    'button[data-interaction-surface-id="surface.poc.tavern"]' +
      '[data-interaction-target-id="target.poc.heroine.figure"]',
  );
  await expect(heroineEntry).toHaveAccessibleName("与女主互动");
  if (touch) await heroineEntry.tap();
  else await heroineEntry.click();
  await expect(page.getByRole("region", { name: "女主角互动区" })).toBeVisible();

  const purchase = page.getByTestId("stage-system").getByRole("button", { name: "采购原料" });
  if (touch) await purchase.tap();
  else await purchase.click();
  await expect(page.locator('[data-stage-scene-id="stage_scene.poc.market"]')).toBeVisible();
  await expect(page.getByRole("dialog", { name: "采购食材" })).toBeVisible();
  await expect(page.getByRole("region", { name: "女主角互动区" })).toHaveCount(0);
  await expectVisibleSemanticRevisionV1(page, before);
});

test("an active Overlay consumes confirm without Stage dispatch", async ({ page }, testInfo) => {
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  await activateV1(page, "打开测试面板", testInfo.project.name === "chromium-touch");
  await expect(page.getByRole("dialog", { name: "测试面板" })).toBeVisible();
  await expect(page.getByTestId("stage-hud")).toHaveAttribute("inert", "");

  await page.keyboard.press("Enter");
  await expectVisibleSemanticRevisionV1(page, before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "测试面板" })).toHaveCount(0);
});

test("one native pointer activation remains one dispatch", async ({ page }, testInfo) => {
  await page.goto(`${e2eWebUrlV1}/#/play`);
  const before = await visibleSemanticRevisionV1(page);
  await activateV1(page, "增加计数", testInfo.project.name === "chromium-touch");
  await expectVisibleSemanticRevisionV1(page, before + 1);
});
