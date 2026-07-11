// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes, digestCanonical } from "./digest.js";

describe("SHA-256 identities", () => {
  it("uses closed domains and exact bytes", () => {
    expect(digestCanonical("project-tavern:state:v1", { a: 1 })).not.toBe(
      digestCanonical("project-tavern:engine:v1", { a: 1 }),
    );
    expect(
      digestCanonical("project-tavern:asset-pack:v1", {
        identity: { id: "assets.synthetic", revision: 1 },
        providers: [],
      }),
    ).toBe(
      "sha256:fa4639da8be532f6097a895b8769fee4f51fbe3bf7168a90b32fb2faeb807e4e",
    );
    expect(digestBytes(new TextEncoder().encode("abc"))).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    // @ts-expect-error semantic digest domains are a closed Catalog union
    digestCanonical("project-tavern:ad-hoc:v1", { a: 1 });
  });
});
