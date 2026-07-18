// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { resolveArtifactBuildConfigV1 } from "./build-config.mjs";

describe("resolveArtifactBuildConfigV1", () => {
  it.each([
    {
      request: { story: "poc", host: "web", outDir: "dist/poc" },
      expected: {
        applicationEntry: "game/stories/poc/src/application/entry.tsx",
        applicationHtml: "game/stories/poc/index.html",
        applicationId: "poc-web",
        base: "./",
        host: "web",
        outDir: "dist/poc",
        sourcemap: false,
        story: "poc",
        storyRoot: "game/stories/poc",
        viteMode: "poc-web",
      },
    },
    {
      request: { story: "e2e", host: "web", outDir: "dist/e2e" },
      expected: {
        applicationEntry: "game/stories/e2e/src/application/entry.tsx",
        applicationHtml: "game/stories/e2e/index.html",
        applicationId: "e2e-web",
        base: "./",
        host: "web",
        outDir: "dist/e2e",
        sourcemap: false,
        story: "e2e",
        storyRoot: "game/stories/e2e",
        viteMode: "e2e-web",
      },
    },
  ] as const)("maps $request.story × web to its one application", ({ request, expected }) => {
    const config = resolveArtifactBuildConfigV1(request);

    expect(config).toMatchObject(expected);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each([
    { story: "poc", host: "developer", outDir: "dist/poc" },
    { story: "demo", host: "web", outDir: "dist/poc" },
    { story: "poc", host: "web", outDir: "dist/developer" },
    { story: "poc", host: "web", outDir: "../poc" },
    { story: "poc", host: "web", outDir: "/tmp/poc" },
    {
      story: "poc",
      host: "web",
      outDir: "dist/poc",
      applicationHtml: "game/stories/e2e/index.html",
    },
    null,
    [],
  ])("rejects unsupported or caller-extended request %#", (request) => {
    expect(() => resolveArtifactBuildConfigV1(request as never)).toThrow(
      /release\.invalid_build_request/u,
    );
  });
});
