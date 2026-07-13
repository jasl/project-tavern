// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { digestBytes, digestCanonical } from "@sillymaker/base";
import type { DigestDomainV1 } from "@sillymaker/base";

import {
  assertCleanGeneratedOutputPathV1,
  assertClosedExecutableSourceRootV1,
} from "../../scripts/executable-source-root.mjs";

import {
  e2eChoiceDeltaHotfixSourceDigestV1,
  e2eChoiceDeltaProviderSourceDigestV1,
} from "./source-digests.generated.js";

async function digestExecutableSourceV1(
  domain: Extract<DigestDomainV1, "sillymaker:patch-provider:v1" | "sillymaker:hotfix:v1">,
  path: string,
  url: URL,
) {
  const bytes = new Uint8Array(await readFile(url));
  return Object.freeze({
    digest: digestCanonical(domain, {
      records: [{ path, sha256: digestBytes(bytes) }],
    }),
    bytes,
  });
}

describe("E2E executable source digests", () => {
  it.each([
    {
      kind: "choice-delta provider",
      domain: "sillymaker:patch-provider:v1",
      path: "game/stories/e2e/src/simulation/choice-delta-provider.ts",
      url: new URL("./choice-delta-provider.ts", import.meta.url),
      generated: e2eChoiceDeltaProviderSourceDigestV1,
    },
    {
      kind: "choice-delta Hotfix",
      domain: "sillymaker:hotfix:v1",
      path: "game/stories/e2e/src/simulation/choice-delta-hotfix.ts",
      url: new URL("./choice-delta-hotfix.ts", import.meta.url),
      generated: e2eChoiceDeltaHotfixSourceDigestV1,
    },
  ] as const)("binds the generated $kind digest to exact live source bytes", async (fixture) => {
    const live = await digestExecutableSourceV1(fixture.domain, fixture.path, fixture.url);
    const changedBytes = new Uint8Array(live.bytes.length + 1);
    changedBytes.set(live.bytes);
    changedBytes[live.bytes.length] = 0x0a;

    expect(fixture.generated).toBe(live.digest);
    expect(() => assertClosedExecutableSourceRootV1(fixture.path, live.bytes)).not.toThrow();
    expect(
      digestCanonical(fixture.domain, {
        records: [{ path: fixture.path, sha256: digestBytes(changedBytes) }],
      }),
    ).not.toBe(fixture.generated);
  });

  it.each([
    ["side-effect import", 'import "unexpected-package";'],
    ["comment-separated side-effect import", 'import/* hidden */"unexpected-package";'],
    ["named re-export", 'export { value } from "unexpected-package";'],
    ["comment-separated re-export", 'export/* hidden */{ value }from"unexpected-package";'],
    ["star re-export", 'export * from "unexpected-package";'],
    ["dynamic import", 'const dependency = import /* hidden */ ("unexpected-package");'],
    ["CommonJS require", 'const dependency = require("unexpected-package");'],
    ["comment-separated CommonJS require", 'const dependency = require/* hidden */("x");'],
  ] as const)("rejects a hidden %s outside the closed source root", (_kind, extraSource) => {
    const source = `import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { PositiveSafeInteger } from "@sillymaker/base";
${extraSource}
const value: PositiveSafeInteger = parsePositiveSafeInteger(1);
export function defaultChoiceDeltaProviderV1(): PositiveSafeInteger {
  return value;
}
`;
    expect(() =>
      assertClosedExecutableSourceRootV1(
        "game/stories/e2e/src/simulation/choice-delta-provider.ts",
        new TextEncoder().encode(source),
      ),
    ).toThrow("closed executable source root");
  });

  it.each([" M generated.ts", "M  generated.ts", " D generated.ts", "?? generated.ts"])(
    "refuses to replace a generated output with Git status %s",
    (status) => {
      expect(() => assertCleanGeneratedOutputPathV1("generated.ts", status)).toThrow(
        "refusing to overwrite",
      );
    },
  );

  it("permits a generated output path with no Git status", () => {
    expect(() => assertCleanGeneratedOutputPathV1("generated.ts", "")).not.toThrow();
  });
});
