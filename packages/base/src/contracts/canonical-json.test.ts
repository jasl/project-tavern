// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.js";

describe("Canonical JSON", () => {
  it("sorts keys and rejects accessors", () => {
    expect(
      new TextDecoder().decode(
        canonicalJsonBytes({ z: 0, a: [true, null] }),
      ),
    ).toBe('{"a":[true,null],"z":0}');

    let getterError: unknown;
    try {
      canonicalJsonBytes(Object.defineProperty({}, "x", { get: () => 1 }));
    } catch (error) {
      getterError = error;
    }
    expect(getterError).toMatchObject({
      name: "CanonicalJsonError",
      code: "value.getter",
    });
  });
});
