// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "../contracts/digest.js";
import { resolveBuildIdentityV1 } from "./build-identity.js";

const digest = digestBytes(new TextEncoder().encode("source"));

describe("build identity", () => {
  it("sorts workspace-relative import closure records", () => {
    const resolved = resolveBuildIdentityV1({
      engine: [
        { path: "packages/base/src/z.ts", sha256: digest, facet: "engine" },
        { path: "packages/base/src/a.ts", sha256: digest, facet: "engine" },
      ],
      storySimulation: [],
      storyPresentation: [],
      application: [],
    });
    expect(resolved.engine.records.map((record) => record.path)).toEqual([
      "packages/base/src/a.ts",
      "packages/base/src/z.ts",
    ]);
  });

  it("rejects references and absolute paths", () => {
    expect(() =>
      resolveBuildIdentityV1({
        engine: [{ path: "/tmp/source.ts", sha256: digest, facet: "engine" }],
        storySimulation: [],
        storyPresentation: [],
        application: [],
      }),
    ).toThrow("build identity path invalid");
  });
});
