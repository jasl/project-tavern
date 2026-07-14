// SPDX-License-Identifier: MIT

export interface RuntimeInvalidationControllerV1 {
  invalidateForHmr(): void;
}

/** Creates the one-way, synchronous invalidation seam consumed by Host HMR adapters. */
export function createRuntimeInvalidationControllerV1(input: {
  transitionToInvalidated(): void;
  reportInvalidation?(): void;
}): RuntimeInvalidationControllerV1 {
  let invalidated = false;

  return Object.freeze({
    invalidateForHmr(): void {
      if (invalidated) return;
      invalidated = true;
      input.transitionToInvalidated();
      try {
        input.reportInvalidation?.();
      } catch {
        // HMR failure reporting is diagnostic-only and cannot undo invalidation.
      }
    },
  });
}
