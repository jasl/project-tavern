// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createRuntimeInvalidationControllerV1 } from "./runtime-invalidation.js";

describe("RuntimeInvalidationControllerV1", () => {
  it("transitions synchronously and reports only the first HMR invalidation", () => {
    let invalidated = false;
    const reportInvalidation = vi.fn();
    const controller = createRuntimeInvalidationControllerV1({
      transitionToInvalidated() {
        invalidated = true;
      },
      reportInvalidation,
    });

    expect(Object.isFrozen(controller)).toBe(true);
    expect(controller.invalidateForHmr()).toBeUndefined();
    expect(invalidated).toBe(true);
    expect(reportInvalidation).toHaveBeenCalledOnce();

    controller.invalidateForHmr();
    expect(reportInvalidation).toHaveBeenCalledOnce();
  });

  it("isolates diagnostic reporting from the completed invalidation transition", () => {
    const transitionToInvalidated = vi.fn();
    const controller = createRuntimeInvalidationControllerV1({
      transitionToInvalidated,
      reportInvalidation() {
        throw new Error("diagnostic sink unavailable");
      },
    });

    expect(() => controller.invalidateForHmr()).not.toThrow();
    expect(transitionToInvalidated).toHaveBeenCalledOnce();
    controller.invalidateForHmr();
    expect(transitionToInvalidated).toHaveBeenCalledOnce();
  });
});
