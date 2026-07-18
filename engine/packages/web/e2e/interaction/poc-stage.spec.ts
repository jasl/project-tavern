import { expect, test, type Locator, type Page } from "@playwright/test";

const pocWebUrlV1 = "http://127.0.0.1:41732";

function tavernHeroineEntryV1(page: Page): Locator {
  return page.locator(
    'button[data-interaction-surface-id="surface.poc.tavern"]' +
      '[data-interaction-target-id="target.poc.heroine.figure"]',
  );
}

function purchaseLauncherV1(page: Page): Locator {
  return page.getByTestId("stage-system").getByRole("button", { name: "采购原料", exact: true });
}

function semanticPublicationV1(page: Page): Locator {
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

async function enterPocWeekV1(page: Page, touch: boolean): Promise<void> {
  let revision = await visibleSemanticRevisionV1(page);
  await activateV1(
    page.getByTestId("stage-system").getByRole("button", {
      name: "开始这一周",
      exact: true,
    }),
    touch,
  );
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);

  const narrative = page.getByRole("dialog", { name: "旅店的一周" });
  await expect(narrative).toBeVisible();
  const advance = narrative.getByRole("button", { name: "继续" });
  await expect(advance).toBeEnabled();
  await activateV1(advance, touch);
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);
  await expect(narrative).toHaveCount(0);

  const choosePolicy = page
    .getByTestId("stage-system")
    .getByRole("button", { name: "选择生活策略", exact: true });
  await expect(choosePolicy).toBeEnabled();
  await activateV1(choosePolicy, touch);
  const policy = page.getByRole("dialog", { name: "生活策略" });
  await expect(policy).toBeVisible();
  const nightOwl = policy.getByRole("radio", { name: "夜猫子作息" });
  await activateV1(nightOwl, touch);
  await expect(nightOwl).toBeChecked();
  await activateV1(policy.getByRole("button", { name: "确认" }), touch);
  revision += 1;
  await expectVisibleSemanticRevisionV1(page, revision);
  await activateV1(policy.getByRole("button", { name: "关闭" }), touch);
  await expect(policy).toHaveCount(0);
  await expect(purchaseLauncherV1(page)).toBeEnabled();
}

async function expectFullyInViewportV1(page: Page, locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test("enters the week through Narrative and routes Purchase from Tavern to Market and back", async ({
  page,
}, testInfo) => {
  await page.goto(`${pocWebUrlV1}/#/play`);
  await expect(page.locator('[data-application-id="poc-web"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "酒馆主厅" })).toBeVisible();
  await expect(page.locator('[data-stage-scene-id="stage_scene.poc.tavern"]')).toBeVisible();
  await expect(page.getByRole("region", { name: "旅店的一周" })).toBeVisible();
  await enterPocWeekV1(page, testInfo.project.name === "chromium-touch");

  const beforePurchase = await visibleSemanticRevisionV1(page);
  const purchase = purchaseLauncherV1(page);
  await expect(purchase).toBeEnabled();
  await activateV1(purchase, testInfo.project.name === "chromium-touch");
  const dialog = page.getByRole("dialog", { name: "采购食材" });
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-stage-scene-id="stage_scene.poc.market"]')).toBeVisible();
  const addLine = dialog.getByRole("button", { name: "添加一项" });
  await expect(addLine).toBeEnabled();
  await activateV1(addLine, testInfo.project.name === "chromium-touch");
  await expect(dialog.getByRole("combobox", { name: "食材" })).toBeVisible();
  await expect(dialog.getByRole("spinbutton", { name: "数量" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "移除" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "确认采购" })).toBeDisabled();
  await expectVisibleSemanticRevisionV1(page, beforePurchase);

  await activateV1(
    dialog.getByRole("button", { name: "关闭" }),
    testInfo.project.name === "chromium-touch",
  );
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-stage-scene-id="stage_scene.poc.tavern"]')).toBeVisible();
  await expect(purchase).toBeFocused();
  await expectVisibleSemanticRevisionV1(page, beforePurchase);
});

test("the empty-flag PoC exposes no content-filter setting", async ({ page }, testInfo) => {
  await page.goto(`${pocWebUrlV1}/#/play`);
  await activateV1(
    page.getByRole("button", { name: "设置" }),
    testInfo.project.name === "chromium-touch",
  );
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  await expect(settings.getByText("当前故事没有可调整的内容过滤选项。")).toBeVisible();
  await expect(settings.locator("[data-content-flag-id]")).toHaveCount(0);
  await expect(settings.locator("[data-content-preset-id]")).toHaveCount(0);
});

test("code-native fallback removes ghost hotspots but keeps named DOM behavior usable", async ({
  page,
}, testInfo) => {
  await page.goto(`${pocWebUrlV1}/#/play`);
  await expect(
    page.getByTestId("stage-scene-background").locator('[data-stage-fallback="code_native"]'),
  ).toBeVisible();
  const heroine = page.locator(
    '[data-testid="character-root"][data-character-id="character.poc.heroine"]',
  );
  await expect(heroine).toHaveAttribute("data-character-fallback", "code_native");
  await expect(heroine).toHaveAttribute("data-spatial-hit-test", "disabled");
  await expect(page.locator("[data-poc-spatial-targets]")).toHaveCount(0);

  const entry = tavernHeroineEntryV1(page);
  await expect(entry).toHaveAccessibleName("与女主互动");
  await expect(entry).toBeEnabled();
  await activateV1(entry, testInfo.project.name === "chromium-touch");
  const profile = page.getByRole("button", { name: "查看人物资料" });
  await expect(profile).toBeEnabled();
  await activateV1(profile, testInfo.project.name === "chromium-touch");
  await expect(page.getByRole("dialog", { name: "人物关系" })).toBeVisible();
});

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
]) {
  test(`keeps Tavern Interaction operable at ${viewport.width} x ${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(`${pocWebUrlV1}/#/play`);

    await expectFullyInViewportV1(page, page.getByRole("main", { name: "酒馆主厅" }));
    await expectFullyInViewportV1(page, page.getByRole("region", { name: "旅店的一周" }));
    const entry = tavernHeroineEntryV1(page);
    await expect(entry).toHaveAccessibleName("与女主互动");
    await expectFullyInViewportV1(page, entry);

    await entry.focus();
    await page.keyboard.press("Enter");
    const region = page.getByRole("region", { name: "女主角互动区" });
    await expectFullyInViewportV1(page, region);
    const close = region.getByRole("button", { name: "关闭" });
    await expectFullyInViewportV1(page, close);
    for (const control of await region.getByRole("button").all()) {
      await expectFullyInViewportV1(page, control);
    }

    await activateV1(close, testInfo.project.name === "chromium-touch");
    await expect(region).toHaveCount(0);
    await expect(entry).toBeFocused();
  });
}
