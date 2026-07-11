// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { mountGameApplicationV1 } from "./mount-game-application.js";
import type { MountedGameApplicationV1 } from "./mount-game-application.js";

describe("mountGameApplicationV1", () => {
  it("owns one React root lifecycle", () => {
    const container = document.createElement("div");
    let mounted: MountedGameApplicationV1 | undefined;
    act(() => {
      mounted = mountGameApplicationV1(container, <p>ready</p>);
    });
    expect(container).toHaveTextContent("ready");
    act(() => mounted?.unmount());
    expect(container).toBeEmptyDOMElement();
  });
});
