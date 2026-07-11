// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseStrictJson, parseStrictJsonLimitsV1 } from "./strict-json.js";

const limits = parseStrictJsonLimitsV1({
  maxBytes: 1024,
  maxDepth: 16,
  maxArrayItems: 64,
  maxObjectMembers: 64,
  maxNodes: 256,
  maxStringBytes: 512,
});

describe("Strict JSON", () => {
  it("rejects duplicate keys and a UTF-8 BOM", () => {
    expect(
      parseStrictJson(new TextEncoder().encode('{"a":1,"a":2}'), limits),
    ).toMatchObject({ ok: false, error: { code: "object.duplicate_key" } });
    expect(
      parseStrictJson(Uint8Array.of(0xef, 0xbb, 0xbf, 0x7b, 0x7d), limits),
    ).toMatchObject({ ok: false, error: { code: "encoding.bom_forbidden" } });
  });
});
