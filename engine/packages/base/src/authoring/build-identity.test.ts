// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "../contracts/digest.js";
import type { BuildIdentityInputV1 } from "./build-identity.js";
import { resolveBuildIdentityV1 } from "./build-identity.js";

const digest = digestBytes(new TextEncoder().encode("source"));

function createBuildIdentityInputV1(engineVersion = "SillyMaker build-identity test") {
  return {
    engineVersion,
    engine: [],
    storySimulation: [],
    storyPresentation: [],
    application: [],
  } satisfies BuildIdentityInputV1;
}

describe("build identity", () => {
  it("sorts workspace-relative import closure records", () => {
    const resolved = resolveBuildIdentityV1({
      engineVersion: "SillyMaker build-identity test",
      engine: [
        { path: "engine/packages/base/src/z.ts", sha256: digest, facet: "engine" },
        { path: "engine/packages/base/src/a.ts", sha256: digest, facet: "engine" },
      ],
      storySimulation: [],
      storyPresentation: [],
      application: [],
    });
    expect(resolved.engine.records.map((record) => record.path)).toEqual([
      "engine/packages/base/src/a.ts",
      "engine/packages/base/src/z.ts",
    ]);
  });

  it("sorts paths by UTF-16 code units without consulting the host locale", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new TypeError("locale-sensitive comparator invoked");
    });

    try {
      const resolved = resolveBuildIdentityV1({
        ...createBuildIdentityInputV1(),
        engine: [
          { path: "engine/z.ts", sha256: digest, facet: "engine" },
          { path: "engine/a.ts", sha256: digest, facet: "engine" },
          { path: "engine/a", sha256: digest, facet: "engine" },
          { path: "engine/B.ts", sha256: digest, facet: "engine" },
          { path: "engine/\u{1f600}.ts", sha256: digest, facet: "engine" },
          { path: "engine/\ue000.ts", sha256: digest, facet: "engine" },
        ],
      });

      expect(resolved.engine.records.map((record) => record.path)).toEqual([
        "engine/B.ts",
        "engine/a",
        "engine/a.ts",
        "engine/z.ts",
        "engine/\u{1f600}.ts",
        "engine/\ue000.ts",
      ]);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("preserves an exact non-empty engine display label outside all four facet digests", () => {
    const first = resolveBuildIdentityV1(createBuildIdentityInputV1("SillyMaker test+first"));
    const second = resolveBuildIdentityV1(createBuildIdentityInputV1("SillyMaker test+second"));

    expect(first.engineVersion).toBe("SillyMaker test+first");
    expect(second.engineVersion).toBe("SillyMaker test+second");
    expect({
      engine: first.engine.digest,
      storySimulation: first.storySimulation.digest,
      storyPresentation: first.storyPresentation.digest,
      application: first.application.digest,
    }).toEqual({
      engine: second.engine.digest,
      storySimulation: second.storySimulation.digest,
      storyPresentation: second.storyPresentation.digest,
      application: second.application.digest,
    });
    expect(() => resolveBuildIdentityV1(createBuildIdentityInputV1(""))).toThrow(
      "build identity engineVersion invalid",
    );
  });

  it("accepts only one to 64 printable ASCII engine-version code units", () => {
    expect(resolveBuildIdentityV1(createBuildIdentityInputV1(" ")).engineVersion).toBe(" ");
    expect(resolveBuildIdentityV1(createBuildIdentityInputV1("x".repeat(64))).engineVersion).toBe(
      "x".repeat(64),
    );

    for (const invalid of ["", "x".repeat(65), "tab\t", "line\n", "SillyMaker 版本"]) {
      expect(() => resolveBuildIdentityV1(createBuildIdentityInputV1(invalid))).toThrow(
        "build identity engineVersion invalid",
      );
    }
  });

  it("rejects references and absolute paths", () => {
    expect(() =>
      resolveBuildIdentityV1({
        engineVersion: "SillyMaker build-identity test",
        engine: [{ path: "/tmp/source.ts", sha256: digest, facet: "engine" }],
        storySimulation: [],
        storyPresentation: [],
        application: [],
      }),
    ).toThrow("build identity path invalid");
  });
});
