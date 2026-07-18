// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { expect, test, type Locator } from "@playwright/test";

import { uiHarnessMetadataKeyV1, uiTargetsV1, uiTargetUrlV1 } from "./ui-targets.js";

const e2eDebugUrlV1 = `${uiTargetUrlV1(uiTargetsV1.e2e)}/?capability=debug_tools#/play`;

function parseCssTimesV1(value: string): readonly number[] {
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed) / 1000;
    if (trimmed.endsWith("s")) return Number.parseFloat(trimmed);
    return Number.NaN;
  });
}

async function expectNonessentialMotionDisabledV1(
  witnesses: readonly { readonly label: string; readonly locator: Locator }[],
): Promise<void> {
  for (const witness of witnesses) {
    await expect(witness.locator, `${witness.label} must be rendered`).toBeVisible();
    const computed = await witness.locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: style.animationDuration,
        animationName: style.animationName,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(
      parseCssTimesV1(computed.transitionDuration),
      `${witness.label} transition duration`,
    ).toEqual(expect.arrayContaining([0]));
    expect(
      parseCssTimesV1(computed.transitionDuration).every((duration) => duration === 0),
      `${witness.label} transition duration`,
    ).toBe(true);
    expect(
      parseCssTimesV1(computed.animationDuration).every((duration) => duration === 0),
      `${witness.label} animation duration`,
    ).toBe(true);
    expect(
      computed.animationName
        .split(",")
        .map((name) => name.trim())
        .every((name) => name === "none"),
      `${witness.label} animation name`,
    ).toBe(true);
  }
}

test.describe("@phase5c @motion reduced motion", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.config.metadata[uiHarnessMetadataKeyV1] !== true,
      `requires the prebuilt two-root UI harness for ${browserName}`,
    );
  });

  test("@motion reduced motion removes nonessential Stage, Overlay, and DevDock transitions", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(e2eDebugUrlV1);

    const stageVariant = page.getByTestId("stage-scene-variant");
    await expect(page.getByTestId("stage-scene-background")).toHaveAttribute(
      "data-transition",
      "none",
    );

    await page.getByRole("button", { name: "打开测试面板" }).click();
    const overlay = page.getByRole("dialog", { name: "测试面板" });
    await expect(overlay).toBeVisible();
    const launcher = overlay.getByRole("button", { name: "打开左侧开发工具" });
    await launcher.focus();
    await page.keyboard.press("Enter");
    const devDock = overlay.getByRole("complementary", { name: "左侧开发工具" });
    await expect(devDock).toBeVisible();
    await expect(page.locator('[data-devdock-surface="overlay"]')).toHaveAttribute(
      "data-devdock-open",
      "true",
    );

    await expectNonessentialMotionDisabledV1([
      { label: "stage-variant-transition", locator: stageVariant },
      { label: "workspace-overlay-transition", locator: overlay },
      { label: "devdock-transition", locator: devDock },
    ]);
  });
});
