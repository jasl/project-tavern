// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineConfig, devices } from "@playwright/test";

const prebuiltPocUrlV1 = "http://127.0.0.1:41731/nested/tavern/";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "release-*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: prebuiltPocUrlV1,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node --experimental-strip-types scripts/release/smoke-poc.mts serve",
    cwd: "../../..",
    url: prebuiltPocUrlV1,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
