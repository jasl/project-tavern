import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./engine/packages/web/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm exec vite preview --mode e2e-web --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
