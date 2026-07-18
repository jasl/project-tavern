// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Page, type Request } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

const applicationCasesV1 = Object.freeze([
  Object.freeze({
    name: "e2e",
    target: uiTargetsV1.e2e,
    applicationName: "SillyMaker 引擎测试",
    mainName: "E2E 游戏舞台",
    otherApplicationId: uiTargetsV1.poc.applicationId,
  }),
  Object.freeze({
    name: "poc",
    target: uiTargetsV1.poc,
    applicationName: "Project Tavern 七日原型",
    mainName: "酒馆主厅",
    otherApplicationId: uiTargetsV1.e2e.applicationId,
  }),
] as const);

const developmentPathV1 =
  /^\/(?:@fs|@id|@react-refresh|@vite|engine|game|node_modules|src)(?:\/|$)/u;
const storageSentinelV1 = Object.freeze({
  databaseName: "phase5c-ui-infrastructure-sentinel",
  localStorageKey: "phase5c.ui-infrastructure.sentinel",
});

function collectRequestsV1(page: Page): {
  readonly requests: Request[];
  readonly webSockets: string[];
} {
  const requests: Request[] = [];
  const webSockets: string[] = [];
  page.on("request", (request) => requests.push(request));
  page.on("websocket", (webSocket) => webSockets.push(webSocket.url()));
  return Object.freeze({ requests, webSockets });
}

async function writeStorageSentinelV1(page: Page): Promise<void> {
  await page.evaluate(async (sentinel) => {
    localStorage.setItem(sentinel.localStorageKey, "present");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(sentinel.databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore("sentinel");
      });
      request.addEventListener("error", () =>
        reject(request.error ?? new Error("sentinel IndexedDB open failed")),
      );
      request.addEventListener("blocked", () =>
        reject(new Error("sentinel IndexedDB open was blocked")),
      );
      request.addEventListener("success", () => {
        request.result.close();
        resolve();
      });
    });
  }, storageSentinelV1);
}

async function probeStorageSentinelV1(page: Page): Promise<{
  readonly databaseWasFresh: boolean;
  readonly localStorageValue: string | null;
}> {
  return await page.evaluate(async (sentinel) => {
    const localStorageValue = localStorage.getItem(sentinel.localStorageKey);
    const databaseWasFresh = await new Promise<boolean>((resolve, reject) => {
      let upgraded = false;
      const request = indexedDB.open(sentinel.databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        upgraded = true;
        request.result.createObjectStore("sentinel");
      });
      request.addEventListener("error", () =>
        reject(request.error ?? new Error("sentinel IndexedDB probe failed")),
      );
      request.addEventListener("blocked", () =>
        reject(new Error("sentinel IndexedDB probe was blocked")),
      );
      request.addEventListener("success", () => {
        request.result.close();
        resolve(upgraded);
      });
    });
    return Object.freeze({ databaseWasFresh, localStorageValue });
  }, storageSentinelV1);
}

test.describe("@phase5c @infrastructure", () => {
  test.beforeEach((_fixtures, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      "requires the prebuilt two-root UI harness",
    );
  });

  for (const applicationCase of applicationCasesV1) {
    test(`serves the isolated prebuilt ${applicationCase.name} application without Vite or HMR`, async ({
      page,
    }) => {
      const targetUrl = uiTargetUrlV1(applicationCase.target);
      const network = collectRequestsV1(page);
      const navigation = await page.goto(`${targetUrl}/#/play`);

      expect(navigation).not.toBeNull();
      expect(navigation?.status()).toBe(200);
      const html = await navigation?.text();
      expect(html).toMatch(/(?:href|src)="\.\/assets\//u);
      expect(html).not.toContain("/@vite/client");

      const application = page.getByRole("application", {
        name: applicationCase.applicationName,
      });
      await expect(application).toHaveCount(1);
      await expect(application).toHaveAttribute(
        "data-application-id",
        applicationCase.target.applicationId,
      );
      await expect(page.locator("[data-application-id]")).toHaveCount(1);
      await expect(
        page.locator(`[data-application-id="${applicationCase.otherApplicationId}"]`),
      ).toHaveCount(0);
      await expect(page.getByRole("main", { name: applicationCase.mainName })).toBeVisible();

      expect(network.webSockets).toEqual([]);
      for (const request of network.requests) {
        const resourceUrl = new URL(request.url());
        if (resourceUrl.protocol !== "http:" && resourceUrl.protocol !== "https:") continue;
        expect(resourceUrl.origin).toBe(targetUrl);
        expect(resourceUrl.pathname).not.toMatch(developmentPathV1);
        if (!request.isNavigationRequest()) expect(resourceUrl.pathname).toMatch(/^\/assets\//u);
      }
    });
  }

  test("keeps localStorage and IndexedDB isolated across fresh browser contexts", async ({
    browser,
  }) => {
    const targetUrl = uiTargetUrlV1(uiTargetsV1.e2e);
    const firstContext = await browser.newContext();
    try {
      const firstPage = await firstContext.newPage();
      await firstPage.goto(`${targetUrl}/#/play`);
      await writeStorageSentinelV1(firstPage);
    } finally {
      await firstContext.close();
    }

    const freshContext = await browser.newContext();
    try {
      const freshPage = await freshContext.newPage();
      await freshPage.goto(`${targetUrl}/#/play`);
      await expect(
        freshPage.getByRole("application", { name: "SillyMaker 引擎测试" }),
      ).toHaveAttribute("data-application-id", uiTargetsV1.e2e.applicationId);
      await expect(probeStorageSentinelV1(freshPage)).resolves.toEqual({
        databaseWasFresh: true,
        localStorageValue: null,
      });
    } finally {
      await freshContext.close();
    }
  });
});
