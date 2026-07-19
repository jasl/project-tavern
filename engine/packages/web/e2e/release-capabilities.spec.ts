// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Browser, type Page } from "@playwright/test";

type PocCapabilityV1 = "automation_bridge" | "cheats" | "debug_tools";

const releaseBaseUrlV1 = "http://127.0.0.1:41731/nested/tavern/";
const automationFacadeKeysV1 = Object.freeze([
  "availableActions",
  "contractRevision",
  "dispatch",
  "observe",
  "preview",
  "waitForIdle",
]);

function releaseUrlV1(capabilities: readonly PocCapabilityV1[]): string {
  const query = capabilities.map((capability) => `capability=${capability}`).join("&");
  return `${releaseBaseUrlV1}${query.length === 0 ? "" : `?${query}`}#/play`;
}

async function expectApplicationV1(page: Page): Promise<void> {
  await expect(page.getByRole("application", { name: "Project Tavern 七日原型" })).toHaveAttribute(
    "data-application-id",
    "poc-web",
  );
}

async function manifestDigestV1(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const response = await fetch(new URL("artifact-manifest.json", document.baseURI), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Artifact manifest request failed: ${response.status}`);
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", await response.arrayBuffer()),
    );
    return `sha256:${[...digest].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  });
}

async function hasPersistedCapabilityPreferenceV1(page: Page): Promise<boolean> {
  return await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-tavern.runtime", 1);
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("IndexedDB open failed")),
        { once: true },
      );
    });
    try {
      const transaction = database.transaction("records", "readonly");
      const request = transaction
        .objectStore("records")
        .get(["settings", "runtime-capabilities.v1"]);
      return await new Promise<boolean>((resolve, reject) => {
        request.addEventListener("success", () => resolve(request.result !== undefined), {
          once: true,
        });
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("IndexedDB preference read failed")),
          { once: true },
        );
      });
    } finally {
      database.close();
    }
  });
}

async function automationFacadeProbeV1(page: Page): Promise<{
  readonly contractRevision: unknown;
  readonly frozen: boolean;
  readonly keys: readonly string[];
} | null> {
  return await page.evaluate(() => {
    const facade = globalThis["__SILLYMAKER_AUTOMATION_V1__"];
    if (facade === undefined) return null;
    return {
      contractRevision: facade.contractRevision,
      frozen: Object.isFrozen(facade),
      keys: Object.keys(facade).toSorted(),
    };
  });
}

async function expectNoDevDockV1(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "打开左侧开发工具" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开右侧开发工具" })).toHaveCount(0);
}

async function openCapabilityPanelV1(page: Page): Promise<void> {
  await page.getByRole("button", { name: "打开左侧开发工具" }).click();
  const capabilityPanel = page.getByRole("button", { name: "运行时能力" });
  await expect(capabilityPanel).toBeVisible();
  await capabilityPanel.click();
}

async function proveCapabilityContextV1(
  browser: Browser,
  name: "automation" | "debug" | "debug+cheats" | "normal",
  capabilities: readonly PocCapabilityV1[],
): Promise<string> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(releaseUrlV1(capabilities));
    await expectApplicationV1(page);
    const digest = await manifestDigestV1(page);
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/u);

    if (name === "normal") {
      await expectNoDevDockV1(page);
      expect(await automationFacadeProbeV1(page)).toBeNull();
    } else if (name === "automation") {
      await expectNoDevDockV1(page);
      await page.waitForFunction(() => globalThis["__SILLYMAKER_AUTOMATION_V1__"] !== undefined);
      expect(await automationFacadeProbeV1(page)).toEqual({
        contractRevision: 1,
        frozen: true,
        keys: automationFacadeKeysV1,
      });
    } else {
      expect(await automationFacadeProbeV1(page)).toBeNull();
      await openCapabilityPanelV1(page);
      await expect(page.getByRole("switch", { name: "调试工具" })).toBeChecked();
      await expect(page.getByRole("switch", { name: "调试工具" })).toBeDisabled();
      await expect(page.getByRole("switch", { name: "自动化桥接" })).not.toBeChecked();
      const cheats = page.getByRole("switch", { name: "作弊功能" });
      if (name === "debug+cheats") {
        await expect(cheats).toBeChecked();
        await expect(cheats).toBeDisabled();
      } else {
        await expect(cheats).not.toBeChecked();
      }
    }

    expect(await hasPersistedCapabilityPreferenceV1(page)).toBe(false);
    return digest;
  } finally {
    await context.close();
  }
}

test.describe("@phase6 prebuilt PoC capability identity", () => {
  test.setTimeout(90_000);

  test("uses one manifest for normal, Automation, Debug, and Debug+Cheats with fresh default-off stores", async ({
    browser,
  }) => {
    const digests = [
      await proveCapabilityContextV1(browser, "normal", []),
      await proveCapabilityContextV1(browser, "automation", ["automation_bridge"]),
      await proveCapabilityContextV1(browser, "debug", ["debug_tools"]),
      await proveCapabilityContextV1(browser, "debug+cheats", ["debug_tools", "cheats"]),
    ];

    expect(new Set(digests).size).toBe(1);
  });
});
