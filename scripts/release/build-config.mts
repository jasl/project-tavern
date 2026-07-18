// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export type ArtifactStoryV1 = "e2e" | "poc";
export type ArtifactHostV1 = "web";
export type ArtifactOutDirV1 = "dist/e2e" | "dist/poc";
export type ArtifactApplicationIdV1 = "e2e-web" | "poc-web";

export interface ArtifactBuildRequestV1 {
  readonly story: ArtifactStoryV1;
  readonly host: ArtifactHostV1;
  readonly outDir: ArtifactOutDirV1;
}

export interface ArtifactBuildConfigV1 extends ArtifactBuildRequestV1 {
  readonly applicationEntry: string;
  readonly applicationHtml: string;
  readonly applicationId: ArtifactApplicationIdV1;
  readonly base: "./";
  readonly collectIdentityExport: string;
  readonly createIdentityPluginExport: string;
  readonly identityModule: string;
  readonly sourcemap: false;
  readonly storyRoot: string;
  readonly viteMode: ArtifactApplicationIdV1;
}

const invalidRequestCodeV1 = "release.invalid_build_request";

function invalidBuildRequestV1(detail: string): never {
  throw new TypeError(`${invalidRequestCodeV1}: ${detail}`);
}

function assertClosedRequestShapeV1(value: unknown): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    invalidBuildRequestV1("request must be a plain object");
  }

  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 3 ||
    !keys.every((key) => typeof key === "string") ||
    !["host", "outDir", "story"].every((key) => keys.includes(key))
  ) {
    invalidBuildRequestV1("request must contain only story, host, and outDir");
  }

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      invalidBuildRequestV1("request fields must be enumerable data properties");
    }
  }
}

const e2eWebBuildConfigV1: ArtifactBuildConfigV1 = Object.freeze({
  applicationEntry: "game/stories/e2e/src/application/entry.tsx",
  applicationHtml: "game/stories/e2e/index.html",
  applicationId: "e2e-web",
  base: "./",
  collectIdentityExport: "collectE2eBuildIdentityV1",
  createIdentityPluginExport: "createE2eBuildIdentityVirtualPluginV1",
  host: "web",
  identityModule: "scripts/build-e2e-identity.mjs",
  outDir: "dist/e2e",
  sourcemap: false,
  story: "e2e",
  storyRoot: "game/stories/e2e",
  viteMode: "e2e-web",
});

const pocWebBuildConfigV1: ArtifactBuildConfigV1 = Object.freeze({
  applicationEntry: "game/stories/poc/src/application/entry.tsx",
  applicationHtml: "game/stories/poc/index.html",
  applicationId: "poc-web",
  base: "./",
  collectIdentityExport: "collectPocBuildIdentityV1",
  createIdentityPluginExport: "createPocBuildIdentityVirtualPluginV1",
  host: "web",
  identityModule: "scripts/build-poc-identity.mjs",
  outDir: "dist/poc",
  sourcemap: false,
  story: "poc",
  storyRoot: "game/stories/poc",
  viteMode: "poc-web",
});

const configsByApplicationIdV1: Readonly<Record<ArtifactApplicationIdV1, ArtifactBuildConfigV1>> =
  Object.freeze({
    "e2e-web": e2eWebBuildConfigV1,
    "poc-web": pocWebBuildConfigV1,
  });

export function resolveArtifactBuildConfigByApplicationIdV1(
  applicationId: unknown,
): ArtifactBuildConfigV1 {
  if (applicationId !== "e2e-web" && applicationId !== "poc-web") {
    return invalidBuildRequestV1("unsupported application ID");
  }
  return configsByApplicationIdV1[applicationId];
}

export function resolveArtifactBuildConfigV1(request: unknown): ArtifactBuildConfigV1 {
  assertClosedRequestShapeV1(request);
  const story = Object.getOwnPropertyDescriptor(request, "story")?.value;
  const host = Object.getOwnPropertyDescriptor(request, "host")?.value;
  const outDir = Object.getOwnPropertyDescriptor(request, "outDir")?.value;

  if (story === "poc" && host === "web" && outDir === "dist/poc") {
    return pocWebBuildConfigV1;
  }
  if (story === "e2e" && host === "web" && outDir === "dist/e2e") {
    return e2eWebBuildConfigV1;
  }
  return invalidBuildRequestV1("unsupported Story x Host x outDir tuple");
}
