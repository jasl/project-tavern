// SPDX-License-Identifier: MIT
import { parseModuleId } from "@sillymaker/base";
import type { Brand, DeepReadonly, NonNegativeSafeInteger } from "@sillymaker/base";

export type InputContextIdV1 =
  "gameplay" | "interaction" | "narrative" | "overlay" | "system" | "debug";

export type InputActionIdV1 = Brand<string, "InputActionIdV1">;

export function parseInputActionIdV1(value: string): InputActionIdV1 {
  try {
    return parseModuleId(value) as unknown as InputActionIdV1;
  } catch {
    throw new TypeError("ui.invalid_input_action_id");
  }
}

export const systemInputActionIdsV1 = Object.freeze({
  confirm: parseInputActionIdV1("ui.confirm"),
  cancel: parseInputActionIdV1("ui.cancel"),
  openMenu: parseInputActionIdV1("ui.open_menu"),
  narrativeAdvance: parseInputActionIdV1("narrative.advance"),
});

export interface ViewportPointV1 {
  readonly x: number;
  readonly y: number;
}

export type InputEventV1 =
  | { readonly kind: "action"; readonly actionId: InputActionIdV1 }
  | {
      readonly kind: "viewport_point";
      readonly phase: "begin" | "activate";
      readonly point: ViewportPointV1;
      readonly pointerId: NonNegativeSafeInteger;
      readonly pointerType: "mouse" | "touch" | "pen";
    }
  | { readonly kind: "pointer_cancel"; readonly pointerId: NonNegativeSafeInteger }
  | { readonly kind: "focus_loss" };

export type InputHandlerResultV1 = { readonly kind: "handled" } | { readonly kind: "ignored" };

export const inputHandledV1 = Object.freeze({ kind: "handled" as const });
export const inputIgnoredV1 = Object.freeze({ kind: "ignored" as const });

export type InputRouteResultV1 =
  { readonly kind: "handled"; readonly context: InputContextIdV1 } | { readonly kind: "ignored" };

export interface InputRouterV1 {
  register(registration: {
    readonly context: InputContextIdV1;
    readonly handle: (event: DeepReadonly<InputEventV1>) => InputHandlerResultV1;
  }): () => void;
  route(event: DeepReadonly<InputEventV1>): InputRouteResultV1;
  clearTransientInput(): void;
}
