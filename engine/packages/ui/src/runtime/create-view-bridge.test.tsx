// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createViewSourceV1, useReadonlyViewV1 } from "./create-view-bridge.js";

describe("view bridge", () => {
  it("subscribes to immutable view references", () => {
    const source = createViewSourceV1<{ readonly count: number }>(Object.freeze({ count: 0 }));
    const rendered = renderHook(() => useReadonlyViewV1(source));
    act(() => source.publish(Object.freeze({ count: 1 })));
    expect(rendered.result.current).toEqual({ count: 1 });
  });
});
