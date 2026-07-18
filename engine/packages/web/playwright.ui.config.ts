// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineConfig, devices } from "@playwright/test";

import {
  uiTargetUrlV1,
  uiTargetsV1,
  type UiTargetNameV1,
  type UiTargetV1,
} from "./e2e/ui-targets.js";

function commandForUiTargetV1(target: UiTargetV1) {
  let name: UiTargetNameV1;
  if (target === uiTargetsV1.e2e) name = "e2e";
  else if (target === uiTargetsV1.poc) name = "poc";
  else throw new TypeError("ui.target_not_registered");
  return Object.freeze({
    command: `node --experimental-strip-types scripts/ui/serve-story-roots.mts --target ${name}`,
    cwd: "../../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: uiTargetUrlV1(target),
  });
}

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["interaction/**", "walking-skeleton.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  use: {
    trace: "retain-on-failure",
  },
  webServer: [commandForUiTargetV1(uiTargetsV1.e2e), commandForUiTargetV1(uiTargetsV1.poc)],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-touch",
      use: { ...devices["Desktop Chrome"], hasTouch: true, isMobile: false },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
