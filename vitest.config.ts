import { defineConfig } from "vitest/config";
import {
  contractVitestIncludeV1,
  propertyVitestIncludeV1,
  scriptsVitestIncludeV1,
  workspaceVitestIncludeV1,
} from "./scripts/classify-vitest-project.mjs";

const commonExclude = ["**/node_modules/**", "**/dist*/**", "**/*.test-d.ts"];
export default defineConfig({
  root: import.meta.dirname,
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [...workspaceVitestIncludeV1],
          exclude: [...commonExclude, ...propertyVitestIncludeV1, ...contractVitestIncludeV1],
        },
      },
      {
        test: {
          name: "contract",
          include: [...contractVitestIncludeV1],
          exclude: [...commonExclude, ...propertyVitestIncludeV1],
        },
      },
      { test: { name: "property", include: [...propertyVitestIncludeV1], exclude: commonExclude } },
      { test: { name: "scripts", include: [...scriptsVitestIncludeV1], exclude: commonExclude } },
    ],
  },
});
