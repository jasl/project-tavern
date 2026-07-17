// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseCapabilityRequestV1 } from "./parse-capability-request.js";

describe("Web capability request parser", () => {
  it("accepts only unique members of the closed set in declared order", () => {
    const result = parseCapabilityRequestV1(
      "?capability=debug_tools&capability=cheats&capability=automation_bridge",
    );

    expect(result).toEqual({
      kind: "accepted",
      requested: ["debug_tools", "cheats", "automation_bridge"],
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind === "accepted") expect(Object.isFrozen(result.requested)).toBe(true);
  });

  it("preserves a non-canonical declared order instead of sorting", () => {
    expect(
      parseCapabilityRequestV1(
        "?capability=automation_bridge&capability=debug_tools&capability=cheats",
      ),
    ).toEqual({
      kind: "accepted",
      requested: ["automation_bridge", "debug_tools", "cheats"],
    });
  });

  it.each(["", "?"])("treats URL-query absence %j as an empty overlay", (query) => {
    expect(parseCapabilityRequestV1(query)).toEqual({ kind: "accepted", requested: [] });
  });

  it.each([
    ["unknown key", "?other=debug_tools"],
    ["unknown key mixed with a valid member", "?capability=debug_tools&other=cheats"],
    ["empty key", "?=debug_tools"],
    ["empty value", "?capability="],
    ["missing value", "?capability"],
    ["empty member", "?capability=debug_tools&"],
    ["malformed key encoding", "?capabilit%ZZ=debug_tools"],
    ["malformed value encoding", "?capability=%E0%A4%A"],
    ["malformed member mixed with a valid member", "?capability=debug_tools&capability=%"],
  ])("rejects %s as one malformed all-or-nothing request", (_label, query) => {
    expect(parseCapabilityRequestV1(query)).toEqual({
      kind: "rejected",
      code: "capability.malformed_request",
    });
  });

  it.each([
    "?capability=unknown",
    "?capability=debug_tools&capability=unknown",
    "?capability=debug%5Ftools%2Eextra",
  ])("rejects unknown value %j and requests nothing", (query) => {
    expect(parseCapabilityRequestV1(query)).toEqual({
      kind: "rejected",
      code: "capability.unknown_request",
    });
  });

  it.each([
    "?capability=debug_tools&capability=debug_tools",
    "?capability=cheats&capability=debug_tools&capability=cheats",
    "?capability=debug_tools&capability=debug%5Ftools",
  ])("rejects duplicate decoded value %j and requests nothing", (query) => {
    expect(parseCapabilityRequestV1(query)).toEqual({
      kind: "rejected",
      code: "capability.duplicate_request",
    });
  });
});
