// SPDX-License-Identifier: MIT
import { parseInteractionSurfaceId, type InteractionSurfaceId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import type { PresentationIntentV1 } from "./contracts.js";
import { createPresentationIntentRouterV1 } from "./presentation-intent-router.js";

const profileOverlayIdV1 = "overlay.e2e.profile";
const profileSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.profile");
const greetingCueIdV1 = "cue.e2e.greeting";

type PresentationWriteV1 =
  | { readonly kind: "overlay.open"; readonly overlayId: string }
  | {
      readonly kind: "interaction.enter_surface";
      readonly surfaceId: InteractionSurfaceId;
      readonly returnFocusId: string | null;
    }
  | { readonly kind: "interaction.leave_surface" }
  | { readonly kind: "presentation.play_cue"; readonly cueId: string };

function createPresentationIntentRouterFixtureV1() {
  const writes: PresentationWriteV1[] = [];
  const router = createPresentationIntentRouterV1({
    knownOverlayIds: Object.freeze([profileOverlayIdV1]),
    knownSurfaceIds: Object.freeze([profileSurfaceIdV1]),
    knownCueIds: Object.freeze([greetingCueIdV1]),
    overlay: Object.freeze({
      open(overlayId: string): void {
        writes.push(Object.freeze({ kind: "overlay.open", overlayId }));
      },
    }),
    session: Object.freeze({
      open(surfaceId: InteractionSurfaceId, returnFocusId: string | null): void {
        writes.push(
          Object.freeze({
            kind: "interaction.enter_surface",
            surfaceId,
            returnFocusId,
          }),
        );
      },
      leave(): void {
        writes.push(Object.freeze({ kind: "interaction.leave_surface" }));
      },
    }),
    cue: Object.freeze({
      play(cueId: string): void {
        writes.push(Object.freeze({ kind: "presentation.play_cue", cueId }));
      },
    }),
  });
  return Object.freeze({
    router,
    writes: () => Object.freeze([...writes]),
  });
}

describe("createPresentationIntentRouterV1", () => {
  it.each([
    [
      Object.freeze({ kind: "overlay.open", overlayId: profileOverlayIdV1 }),
      Object.freeze({ returnFocusId: "control.e2e.ignored-overlay" }),
      Object.freeze({ kind: "overlay.open", overlayId: profileOverlayIdV1 }),
    ],
    [
      Object.freeze({ kind: "interaction.enter_surface", surfaceId: profileSurfaceIdV1 }),
      Object.freeze({ returnFocusId: "control.e2e.profile" }),
      Object.freeze({
        kind: "interaction.enter_surface",
        surfaceId: profileSurfaceIdV1,
        returnFocusId: "control.e2e.profile",
      }),
    ],
    [
      Object.freeze({ kind: "interaction.leave_surface" }),
      Object.freeze({ returnFocusId: "control.e2e.ignored-leave" }),
      Object.freeze({ kind: "interaction.leave_surface" }),
    ],
    [
      Object.freeze({ kind: "presentation.play_cue", cueId: greetingCueIdV1 }),
      Object.freeze({ returnFocusId: "control.e2e.ignored-cue" }),
      Object.freeze({ kind: "presentation.play_cue", cueId: greetingCueIdV1 }),
    ],
  ] as const)(
    "routes one known closed intent without touching another lens: %o",
    (intent, context, write) => {
      const fixture = createPresentationIntentRouterFixtureV1();

      const result = fixture.router.execute(intent satisfies PresentationIntentV1, context);

      expect(result).toEqual({ kind: "executed" });
      expect(Object.isFrozen(result)).toBe(true);
      expect(fixture.writes()).toEqual([write]);
      expect(Object.isFrozen(fixture.router)).toBe(true);
    },
  );

  it.each([
    Object.freeze({ kind: "overlay.open", overlayId: "overlay.e2e.unknown" }),
    Object.freeze({
      kind: "interaction.enter_surface",
      surfaceId: parseInteractionSurfaceId("surface.e2e.unknown"),
    }),
    Object.freeze({ kind: "presentation.play_cue", cueId: "cue.e2e.unknown" }),
  ] as const)("rejects an unknown registered-ID intent with zero writes: %o", (intent) => {
    const fixture = createPresentationIntentRouterFixtureV1();

    const result = fixture.router.execute(intent satisfies PresentationIntentV1, {
      returnFocusId: "control.e2e.unknown",
    });

    expect(result).toEqual({ kind: "rejected", code: "presentation.intent_unknown" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(fixture.writes()).toEqual([]);
  });
});
