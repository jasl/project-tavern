// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Page } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

const storageSentinelV1 = Object.freeze({
  databaseName: "poc-ui-infrastructure-sentinel",
  localStorageKey: "poc.ui-infrastructure.sentinel",
});

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

test.describe("PoC web infrastructure", () => {
  test("keeps localStorage and IndexedDB isolated across fresh browser contexts", async ({
    browser,
  }) => {
    const targetUrl = uiTargetUrlV1(uiTargetsV1.poc);
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
        freshPage.getByRole("application", { name: "Project Tavern 七日原型" }),
      ).toHaveAttribute("data-application-id", uiTargetsV1.poc.applicationId);
      await expect(probeStorageSentinelV1(freshPage)).resolves.toEqual({
        databaseWasFresh: true,
        localStorageValue: null,
      });
    } finally {
      await freshContext.close();
    }
  });
});
