// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineConfig, devices } from "@playwright/test";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  uiHarnessMetadataKeyV1,
  uiTargetUrlV1,
  uiTargetsV1,
  type UiTargetNameV1,
  type UiTargetV1,
} from "./e2e/ui-targets.js";

const visualSnapshotRootV1 = process.env.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT;
const visualReportPathV1 = process.env.PROJECT_TAVERN_VISUAL_REPORT_PATH;
const visualRunsRootV1 = resolve(import.meta.dirname, "../../../.project-tavern/visual-runs");

function assertVisualRunOutputPathV1(name: string, path: string | undefined): void {
  if (path === undefined) return;
  if (!isAbsolute(path) || path.includes("{") || path.includes("}")) {
    throw new TypeError(`${name} must be an absolute literal path`);
  }
  const relativeOutputV1 = relative(visualRunsRootV1, path);
  if (
    relativeOutputV1 === "" ||
    relativeOutputV1 === ".." ||
    relativeOutputV1.startsWith(`..${sep}`) ||
    isAbsolute(relativeOutputV1)
  ) {
    throw new TypeError(`${name} must be inside .project-tavern/visual-runs`);
  }
  let canonicalRunsRootV1: string;
  let canonicalParentV1: string;
  try {
    canonicalRunsRootV1 = realpathSync(visualRunsRootV1);
    canonicalParentV1 = realpathSync(dirname(path));
  } catch {
    throw new TypeError(`${name} must have an existing visual-runs parent`);
  }
  const relativeCanonicalParentV1 = relative(canonicalRunsRootV1, canonicalParentV1);
  if (
    canonicalRunsRootV1 !== visualRunsRootV1 ||
    relativeCanonicalParentV1 === ".." ||
    relativeCanonicalParentV1.startsWith(`..${sep}`) ||
    isAbsolute(relativeCanonicalParentV1)
  ) {
    throw new TypeError(`${name} must not traverse a symlink outside visual-runs`);
  }
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new TypeError(`${name} must not be a symlink`);
  }
}

assertVisualRunOutputPathV1("PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT", visualSnapshotRootV1);
assertVisualRunOutputPathV1("PROJECT_TAVERN_VISUAL_REPORT_PATH", visualReportPathV1);

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
  metadata: { [uiHarnessMetadataKeyV1]: true },
  testDir: "./e2e",
  testIgnore: ["interaction/**", "walking-skeleton.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  updateSnapshots: "none",
  reporter:
    visualReportPathV1 === undefined
      ? "line"
      : [["line"], ["json", { outputFile: visualReportPathV1 }]],
  snapshotPathTemplate:
    visualSnapshotRootV1 === undefined
      ? "{testDir}/__screenshots__/{projectName}/{arg}{ext}"
      : join(visualSnapshotRootV1, "{projectName}", "{arg}{ext}"),
  use: {
    trace: "retain-on-failure",
  },
  webServer: [commandForUiTargetV1(uiTargetsV1.e2e), commandForUiTargetV1(uiTargetsV1.poc)],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-touch",
      grepInvert: /@visual/u,
      use: { ...devices["Desktop Chrome"], hasTouch: true, isMobile: false },
    },
    { name: "webkit", grepInvert: /@visual/u, use: { ...devices["Desktop Safari"] } },
  ],
});
