// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes, digestCanonical } from "./digest.js";

describe("SHA-256 identities", () => {
  it("uses closed domains and exact bytes", () => {
    expect(digestCanonical("sillymaker:state:v1", { a: 1 })).not.toBe(
      digestCanonical("sillymaker:engine:v1", { a: 1 }),
    );
    expect(
      digestCanonical("sillymaker:asset-pack:v1", {
        identity: { id: "assets.synthetic", revision: 1 },
        providers: [],
      }),
    ).toBe("sha256:8945bbce609fef627d218f4b7c21a65f61830371dea52d44734d56771dceb227");
    expect(digestBytes(new TextEncoder().encode("abc"))).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    // @ts-expect-error semantic digest domains are a closed Catalog union
    digestCanonical("sillymaker:ad-hoc:v1", { a: 1 });
  });
});
