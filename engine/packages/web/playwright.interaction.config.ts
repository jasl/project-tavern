import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/interaction",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --experimental-strip-types scripts/ui/serve-story-roots.mts --target e2e",
      cwd: "../../..",
      url: "http://127.0.0.1:41731",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node --experimental-strip-types scripts/ui/serve-story-roots.mts --target poc",
      cwd: "../../..",
      url: "http://127.0.0.1:41732",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: { width: 1024, height: 768 } },
    },
    {
      name: "chromium-touch",
      use: {
        browserName: "chromium",
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
      },
    },
  ],
});
