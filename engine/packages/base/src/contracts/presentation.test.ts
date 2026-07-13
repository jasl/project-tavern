// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createReadonlyViewSourceV1 } from "./application.js";

describe("readonly view source", () => {
  it("publishes immutable current values without a setter", () => {
    const source = createReadonlyViewSourceV1<{ readonly count: number }>(
      Object.freeze({ count: 0 }),
    );
    let notifications = 0;
    const unsubscribe = source.subscribe(() => {
      notifications += 1;
    });
    source.publish(Object.freeze({ count: 1 }));
    expect(source.getCurrent()).toEqual({ count: 1 });
    expect(notifications).toBe(1);
    unsubscribe();
    expect("setCurrent" in source).toBe(false);
  });
});
