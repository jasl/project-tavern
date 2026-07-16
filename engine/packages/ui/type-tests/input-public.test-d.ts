// SPDX-License-Identifier: MIT
import type { DeepReadonly, NonNegativeSafeInteger } from "@sillymaker/base";
import {
  createInputRouterV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
  type InputActionIdV1,
  type InputContextIdV1,
  type InputContextProviderPropsV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouteResultV1,
  type InputRouterV1,
  type ViewportPointV1,
} from "@sillymaker/ui";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type PublicInputContextsV1 = ExpectV1<
  EqualV1<
    InputContextIdV1,
    "debug" | "gameplay" | "interaction" | "narrative" | "overlay" | "system"
  >
>;
type PublicRouterKeysV1 = ExpectV1<
  EqualV1<keyof InputRouterV1, "clearTransientInput" | "register" | "route">
>;
type PublicSystemActionKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof systemInputActionIdsV1,
    "cancel" | "confirm" | "narrativeAdvance" | "openMenu"
  >
>;
type PublicViewportPointKeysV1 = ExpectV1<EqualV1<keyof ViewportPointV1, "x" | "y">>;
type PublicViewportEventForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<keyof Extract<InputEventV1, { kind: "viewport_point" }>, "localPoint" | "pointerEvent">,
    never
  >
>;

const customActionIdV1 = parseInputActionIdV1("story.synthetic.inspect");
customActionIdV1 satisfies InputActionIdV1;
systemInputActionIdsV1.cancel satisfies InputActionIdV1;

const routerV1 = createInputRouterV1();
routerV1 satisfies InputRouterV1;
const unregisterV1 = routerV1.register({
  context: "interaction",
  handle(event: DeepReadonly<InputEventV1>): InputHandlerResultV1 {
    if (event.kind === "viewport_point") {
      event.pointerId satisfies NonNegativeSafeInteger;
      event.point satisfies DeepReadonly<ViewportPointV1>;
      // @ts-expect-error routed viewport points are immutable
      event.point.x = 1;
    }
    return { kind: "ignored" };
  },
});
unregisterV1();
routerV1.clearTransientInput();
routerV1.route({ kind: "action", actionId: customActionIdV1 }) satisfies InputRouteResultV1;

declare const providerPropsV1: InputContextProviderPropsV1;
providerPropsV1.router satisfies InputRouterV1;

// @ts-expect-error open action IDs remain validated branded strings
const rawActionIdV1: InputActionIdV1 = "story.synthetic.unvalidated";
// @ts-expect-error InputRouter does not expose Gameplay or Snapshot state
routerV1.snapshot;

rawActionIdV1;

export type {
  PublicInputContextsV1,
  PublicRouterKeysV1,
  PublicSystemActionKeysV1,
  PublicViewportEventForbiddenKeysV1,
  PublicViewportPointKeysV1,
};
