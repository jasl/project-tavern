// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  pocWebBuildConfigV1,
  resolveArtifactBuildConfigByApplicationIdV1,
} from "./build-config.mjs";

describe("PoC web build configuration", () => {
  it("describes the maintained player application", () => {
    expect(resolveArtifactBuildConfigByApplicationIdV1("poc-web")).toBe(pocWebBuildConfigV1);
    expect(pocWebBuildConfigV1).toEqual({
      applicationEntry: "game/stories/poc/src/application/entry.tsx",
      applicationHtml: "game/stories/poc/index.html",
      applicationId: "poc-web",
      base: "./",
      collectIdentityExport: "collectPocBuildIdentityV1",
      createIdentityPluginExport: "createPocBuildIdentityVirtualPluginV1",
      identityModule: "scripts/build-poc-identity.mjs",
      outDir: "dist/poc",
      sourcemap: false,
      storyRoot: "game/stories/poc",
    });
    expect(Object.isFrozen(pocWebBuildConfigV1)).toBe(true);
  });

  it("rejects unknown applications", () => {
    expect(() => resolveArtifactBuildConfigByApplicationIdV1("unknown-web")).toThrow(
      "unsupported application ID",
    );
  });
});
