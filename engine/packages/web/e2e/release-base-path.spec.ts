// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Page } from "@playwright/test";

const releaseBaseUrlV1 = "http://127.0.0.1:41731/nested/tavern/";
const releaseBasePathV1 = "/nested/tavern/";

interface ManifestWitnessV1 {
  readonly base: string;
  readonly digest: string;
  readonly fileCount: number;
  readonly paths: readonly string[];
  readonly schemaRevision: number;
  readonly url: string;
}

async function readManifestWitnessV1(page: Page): Promise<ManifestWitnessV1> {
  return await page.evaluate(async () => {
    const url = new URL("artifact-manifest.json", document.baseURI);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Artifact manifest request failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as {
      readonly base: unknown;
      readonly files: readonly { readonly path: unknown }[];
      readonly schemaRevision: unknown;
    };
    return {
      base: String(decoded.base),
      digest: `sha256:${[...digest].map((value) => value.toString(16).padStart(2, "0")).join("")}`,
      fileCount: decoded.files.length,
      paths: decoded.files.map(({ path }) => String(path)),
      schemaRevision: Number(decoded.schemaRevision),
      url: url.href,
    };
  });
}

test.describe("prebuilt PoC nested base", () => {
  test("boots the exact prebuilt Artifact and keeps every emitted browser URL under the nested prefix", async ({
    page,
  }) => {
    const failedResponses: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`${releaseBaseUrlV1}#/play`);
    const application = page.getByRole("application", { name: "Project Tavern 七日原型" });
    await expect(application).toHaveAttribute("data-application-id", "poc-web");
    await expect(page).toHaveURL(
      new RegExp(`${releaseBasePathV1.replaceAll("/", "\\/")}#\\/play$`, "u"),
    );

    const emittedUrls = await page.locator("script[src], link[href]").evaluateAll((elements) =>
      elements.map((element) => {
        const attribute = element instanceof HTMLScriptElement ? "src" : "href";
        const value = element.getAttribute(attribute);
        if (value === null) throw new Error(`missing ${attribute}`);
        return new URL(value, document.baseURI).pathname;
      }),
    );
    expect(emittedUrls.length).toBeGreaterThan(0);
    expect(emittedUrls.every((path) => path.startsWith(releaseBasePathV1))).toBe(true);
    expect(emittedUrls.some((path) => path.startsWith("/assets/"))).toBe(false);

    const manifest = await readManifestWitnessV1(page);
    expect(manifest).toMatchObject({
      base: "./",
      schemaRevision: 1,
      url: `${releaseBaseUrlV1}artifact-manifest.json`,
    });
    expect(manifest.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(manifest.fileCount).toBeGreaterThan(0);
    expect(manifest.paths).toEqual(manifest.paths.toSorted());
    expect(manifest.paths.every((path) => !path.startsWith("/") && !path.includes(".."))).toBe(
      true,
    );
    expect(failedResponses).toEqual([]);
  });
});
