// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineConfig, devices } from "@playwright/test";

import { uiTargetsV1, uiTargetUrlV1 } from "./e2e/ui-targets.js";

const pocTargetV1 = uiTargetsV1.poc;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["interaction/**", "release-*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: uiTargetUrlV1(pocTargetV1),
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec vite --mode poc-web --host ${pocTargetV1.host} --port ${String(pocTargetV1.port)} --strictPort`,
    cwd: "../../..",
    reuseExistingServer: false,
    timeout: 120_000,
    url: uiTargetUrlV1(pocTargetV1),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
