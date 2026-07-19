// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export type ArtifactApplicationIdV1 = "poc-web";

export interface ArtifactBuildConfigV1 {
  readonly applicationEntry: string;
  readonly applicationHtml: string;
  readonly applicationId: ArtifactApplicationIdV1;
  readonly base: "./";
  readonly collectIdentityExport: string;
  readonly createIdentityPluginExport: string;
  readonly identityModule: string;
  readonly outDir: "dist/poc";
  readonly sourcemap: false;
  readonly storyRoot: string;
}

export const pocWebBuildConfigV1: ArtifactBuildConfigV1 = Object.freeze({
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

export function resolveArtifactBuildConfigByApplicationIdV1(
  applicationId: unknown,
): ArtifactBuildConfigV1 {
  if (applicationId !== "poc-web") {
    throw new TypeError(`unsupported application ID: ${String(applicationId)}`);
  }
  return pocWebBuildConfigV1;
}
