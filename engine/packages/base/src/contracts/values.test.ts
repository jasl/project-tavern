// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parseStateSlotId,
  parseStoryId,
} from "./values.js";

describe("closed values", () => {
  it("rejects hostile integers and identifiers", () => {
    expect(() => parseNonNegativeSafeInteger(-0)).toThrow("negative zero");
    expect(parseModuleId("synthetic.parity")).toBe("synthetic.parity");
    expect(parseStoryId("story.synthetic")).toBe("story.synthetic");
    expect(parseStateSlotId("simulation.counter")).toBe("simulation.counter");
    expect(() => parseModuleId(" Synthetic.parity")).toThrow();
    expect(() => parseStoryId("Story.synthetic")).toThrow("invalid StoryId");
    expect(() => parseStateSlotId("simulation.counter/../../escape")).toThrow();
  });
});
