// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StrictMode, Suspense, startTransition, useInsertionEffect, useLayoutEffect } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DevDockPortalCoordinatorV1,
  useDevDockPortalTargetV1,
} from "../debug/DevDockPortalCoordinator.js";
import {
  inputHandledV1,
  systemInputActionIdsV1,
  type InputEventV1,
  type InputRouteResultV1,
} from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameStageV1 } from "../shell/game-stage.js";
import { VnLayerV1, type VnChoiceV1 } from "./vn-layer.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface TestInvocationV1 {
  readonly actionId: string;
  readonly parameters: Readonly<Record<string, string>>;
}

const cautiousChoiceInvocationV1: TestInvocationV1 = Object.freeze({
  actionId: "action.test.cautious",
  parameters: Object.freeze({ tone: "cautious" }),
});
const advanceInvocationV1: TestInvocationV1 = Object.freeze({
  actionId: "action.test.advance",
  parameters: Object.freeze({}),
});

function createSemanticFixtureV1() {
  const dispatch = vi.fn(async (_invocation: TestInvocationV1) =>
    Object.freeze({ kind: "committed" as const }),
  );
  return Object.freeze({ dispatch });
}

function createVnPropsV1() {
  return {
    active: true,
    accessibleName: "测试叙事",
    speakerLabel: "旅店女主人",
    text: "夜色降临，酒馆里的客人渐渐安静下来。",
    choices: Object.freeze([
      Object.freeze({
        choiceId: "choice.cautious",
        label: "谨慎询问",
        enabled: true,
        disabledReasons: Object.freeze([] as const),
        invocation: cautiousChoiceInvocationV1,
      }),
      Object.freeze({
        choiceId: "choice.forceful",
        label: "强行追问",
        enabled: false,
        disabledReasons: Object.freeze(["尚未满足条件", "她现在不愿回答"]),
      }),
    ]),
    advance: Object.freeze({
      choiceId: "advance",
      label: "继续",
      enabled: true,
      disabledReasons: Object.freeze([] as const),
      invocation: advanceInvocationV1,
    }),
    semantic: createSemanticFixtureV1(),
    inputRouter: createInputRouterV1(),
  };
}

interface VnLayoutRouteProbePropsV1 {
  readonly vnProps: ReturnType<typeof createVnPropsV1>;
  readonly routeResults: InputRouteResultV1[];
}

function VnLayoutRouteProbeV1(props: VnLayoutRouteProbePropsV1) {
  useLayoutEffect(() => {
    props.routeResults.push(
      props.vnProps.inputRouter.route({
        kind: "action",
        actionId: systemInputActionIdsV1.narrativeAdvance,
      }),
    );
  }, [props.routeResults, props.vnProps.advance, props.vnProps.inputRouter]);

  return <VnLayerV1 {...props.vnProps} />;
}

function DevDockPortalSelectionProbeV1() {
  const { surface, target } = useDevDockPortalTargetV1();
  return (
    <output
      data-testid="devdock-portal-selection"
      data-surface={surface}
      data-target-scope={target?.dataset.blockingFocusScope ?? "none"}
    />
  );
}

function AtomicBrowserFocusClearProbeV1(props: { readonly active: boolean }) {
  useInsertionEffect(() => {
    if (!props.active) return;
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    document.body.removeAttribute("tabindex");
  }, [props.active]);
  return null;
}

function AtomicNarrativeFocusProbeV1(props: {
  readonly active: boolean;
  readonly openerDisabled: boolean;
  readonly vnProps: ReturnType<typeof createVnPropsV1>;
}) {
  return (
    <>
      <button type="button" disabled={props.openerDisabled}>
        打开叙事
      </button>
      <button type="button">可用后继</button>
      <AtomicBrowserFocusClearProbeV1 active={props.active && props.openerDisabled} />
      <VnLayerV1 {...props.vnProps} active={props.active} />
    </>
  );
}

const neverSettlingSuspenseV1 = new Promise<never>(() => undefined);

function AbandonedNarrativeRenderProbeV1(props: { readonly suspend: boolean }) {
  if (props.suspend) throw neverSettlingSuspenseV1;
  return null;
}

describe("VnLayerV1 semantic controls", () => {
  it("registers the actual narrative dialog as the DevDock focus target only while active", async () => {
    const props = createVnPropsV1();
    const rendered = render(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        <VnLayerV1 {...props} />
      </DevDockPortalCoordinatorV1>,
    );

    const dialog = screen.getByRole("dialog", { name: "测试叙事" });
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "narrative");
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-target-scope",
        "narrative",
      ),
    );

    rendered.rerender(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        <VnLayerV1 {...props} active={false} />
      </DevDockPortalCoordinatorV1>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-surface",
        "base",
      ),
    );
  });

  it("renders a named blocking dialog and dispatches only the exact native choice invocation", async () => {
    const props = createVnPropsV1();
    render(<VnLayerV1 {...props} />);

    expect(screen.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
    expect(screen.getByText("旅店女主人")).toBeVisible();
    expect(screen.getByText(props.text)).toBeVisible();

    await userEvent.setup().click(screen.getByRole("button", { name: "谨慎询问" }));

    expect(props.semantic.dispatch).toHaveBeenCalledOnce();
    expect(props.semantic.dispatch.mock.calls[0]?.[0]).toBe(cautiousChoiceInvocationV1);
    expect(screen.getByText(props.text)).toBeVisible();
  });

  it("keeps disabled direct choices display-only with authored reasons in accessible order", () => {
    const props = createVnPropsV1();
    render(<VnLayerV1 {...props} />);

    const disabledChoice = screen.getByRole("button", { name: "强行追问" });
    expect(disabledChoice).toBeVisible();
    expect(disabledChoice).toBeDisabled();
    expect(disabledChoice).toHaveAccessibleDescription("尚未满足条件 她现在不愿回答");
    expect(screen.getByText("尚未满足条件")).toBeVisible();
    expect(screen.getByText("她现在不愿回答")).toBeVisible();
    disabledChoice.click();
    expect(props.semantic.dispatch).not.toHaveBeenCalled();
  });

  it("requires invocations only for enabled choices at compile time", () => {
    const displayOnlyChoice = Object.freeze({
      choiceId: "choice.display-only",
      label: "暂不可选",
      enabled: false,
      disabledReasons: Object.freeze(["尚未满足条件"]),
    }) satisfies VnChoiceV1<TestInvocationV1>;
    const enabledChoice = Object.freeze({
      choiceId: "choice.enabled",
      label: "可选",
      enabled: true,
      disabledReasons: Object.freeze([] as const),
      invocation: cautiousChoiceInvocationV1,
    }) satisfies VnChoiceV1<TestInvocationV1>;

    // @ts-expect-error An enabled choice must carry its exact invocation.
    const enabledWithoutInvocation: VnChoiceV1<TestInvocationV1> = Object.freeze({
      choiceId: "choice.invalid-enabled",
      label: "缺少命令",
      enabled: true,
      disabledReasons: Object.freeze([] as const),
    });
    // @ts-expect-error A disabled choice is display-only and cannot retain an invocation.
    const disabledWithInvocation: VnChoiceV1<TestInvocationV1> = Object.freeze({
      choiceId: "choice.invalid-disabled",
      label: "错误禁用选项",
      enabled: false,
      disabledReasons: Object.freeze(["不可用"]),
      invocation: cautiousChoiceInvocationV1,
    });

    expect(Object.hasOwn(displayOnlyChoice, "invocation")).toBe(false);
    expect(enabledChoice.invocation).toBe(cautiousChoiceInvocationV1);
    expect(enabledWithoutInvocation.enabled).toBe(true);
    expect(disabledWithInvocation.enabled).toBe(false);
  });

  it("renders nothing and registers no input handler while inactive", () => {
    const props = createVnPropsV1();
    render(<VnLayerV1 {...props} active={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      props.inputRouter.route({
        kind: "action",
        actionId: systemInputActionIdsV1.cancel,
      }),
    ).toEqual({ kind: "ignored" });
  });
});

describe("VnLayerV1 narrative InputContext", () => {
  it("claims blocking input in the layout commit and rerenders with the latest advance invocation", () => {
    const props = createVnPropsV1();
    const routeResults: InputRouteResultV1[] = [];
    const rendered = render(<VnLayoutRouteProbeV1 vnProps={props} routeResults={routeResults} />);

    expect(routeResults).toEqual([{ kind: "handled", context: "narrative" }]);
    expect(props.semantic.dispatch).toHaveBeenCalledOnce();
    expect(props.semantic.dispatch.mock.calls[0]?.[0]).toBe(advanceInvocationV1);

    const latestAdvanceInvocation = Object.freeze({
      actionId: "action.test.advance.latest",
      parameters: Object.freeze({ revision: "2" }),
    });
    const latestProps = {
      ...props,
      advance: Object.freeze({
        ...props.advance,
        invocation: latestAdvanceInvocation,
      }),
    };
    rendered.rerender(<VnLayoutRouteProbeV1 vnProps={latestProps} routeResults={routeResults} />);

    expect(routeResults).toEqual([
      { kind: "handled", context: "narrative" },
      { kind: "handled", context: "narrative" },
    ]);
    expect(props.semantic.dispatch).toHaveBeenCalledTimes(2);
    expect(props.semantic.dispatch.mock.calls[1]?.[0]).toBe(latestAdvanceInvocation);
  });

  it.each([
    ["confirm", systemInputActionIdsV1.confirm],
    ["narrative advance", systemInputActionIdsV1.narrativeAdvance],
  ] as const)("dispatches the exact enabled advance invocation for %s", (_name, actionId) => {
    const props = createVnPropsV1();
    render(<VnLayerV1 {...props} />);

    expect(props.inputRouter.route({ kind: "action", actionId })).toEqual({
      kind: "handled",
      context: "narrative",
    });
    expect(props.semantic.dispatch).toHaveBeenCalledOnce();
    expect(props.semantic.dispatch.mock.calls[0]?.[0]).toBe(advanceInvocationV1);
  });

  it("consumes cancel, unrelated actions, and viewport activation without dispatch or fallthrough", () => {
    const props = createVnPropsV1();
    const gameplay = vi.fn(() => inputHandledV1);
    props.inputRouter.register({ context: "gameplay", handle: gameplay });
    render(<VnLayerV1 {...props} />);

    const blockedEvents = [
      Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.cancel }),
      Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.openMenu }),
      Object.freeze({
        kind: "viewport_point" as const,
        phase: "activate" as const,
        point: Object.freeze({ x: 320, y: 240 }),
        pointerId: parseNonNegativeSafeInteger(7),
        pointerType: "touch" as const,
      }),
    ] satisfies readonly InputEventV1[];

    for (const event of blockedEvents) {
      expect(props.inputRouter.route(event)).toEqual({ kind: "handled", context: "narrative" });
    }
    expect(props.semantic.dispatch).not.toHaveBeenCalled();
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("propagates focus loss and pointer cancellation for lower transient cleanup without dispatch", () => {
    const props = createVnPropsV1();
    const gameplay = vi.fn(() => inputHandledV1);
    props.inputRouter.register({ context: "gameplay", handle: gameplay });
    render(<VnLayerV1 {...props} />);

    expect(props.inputRouter.route({ kind: "focus_loss" })).toEqual({
      kind: "handled",
      context: "gameplay",
    });
    expect(
      props.inputRouter.route({
        kind: "pointer_cancel",
        pointerId: parseNonNegativeSafeInteger(7),
      }),
    ).toEqual({ kind: "handled", context: "gameplay" });
    expect(gameplay).toHaveBeenCalledTimes(2);
    expect(props.semantic.dispatch).not.toHaveBeenCalled();
  });

  it("consumes confirm and advance without dispatch when no enabled advance is supplied", () => {
    const props = createVnPropsV1();
    const disabledAdvance = Object.freeze({
      choiceId: "advance",
      label: "继续",
      enabled: false,
      disabledReasons: Object.freeze(["必须先作出选择"]),
    });
    render(<VnLayerV1 {...props} advance={disabledAdvance} />);

    for (const actionId of [
      systemInputActionIdsV1.confirm,
      systemInputActionIdsV1.narrativeAdvance,
    ]) {
      expect(props.inputRouter.route({ kind: "action", actionId })).toEqual({
        kind: "handled",
        context: "narrative",
      });
    }
    expect(props.semantic.dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
    expect(screen.getByText("必须先作出选择")).toBeVisible();
  });

  it("unregisters narrative input after becoming inactive and after unmount", () => {
    const props = createVnPropsV1();
    const rendered = render(<VnLayerV1 {...props} />);

    expect(
      props.inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
    ).toEqual({ kind: "handled", context: "narrative" });

    rendered.rerender(<VnLayerV1 {...props} active={false} />);
    expect(
      props.inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
    ).toEqual({ kind: "ignored" });

    rendered.rerender(<VnLayerV1 {...props} active />);
    rendered.unmount();
    expect(
      props.inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
    ).toEqual({ kind: "ignored" });
  });
});

describe("VnLayerV1 focus return", () => {
  it("restores an exact programmatic opener outside the sequential Tab order", async () => {
    const props = createVnPropsV1();
    render(
      <button type="button" tabIndex={-1}>
        打开叙事
      </button>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();
    const rendered = render(<VnLayerV1 {...props} active={false} />);

    rendered.rerender(<VnLayerV1 {...props} active />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    const openerFocus = vi.spyOn(opener, "focus");
    rendered.rerender(<VnLayerV1 {...props} active={false} />);
    await waitFor(() => {
      expect(opener).toHaveFocus();
      expect(openerFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("restores the exact previously focused HTMLElement after becoming inactive", async () => {
    const props = createVnPropsV1();
    render(<button type="button">打开叙事</button>);
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();
    const rendered = render(<VnLayerV1 {...props} active={false} />);

    rendered.rerender(<VnLayerV1 {...props} active />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    const openerFocus = vi.spyOn(opener, "focus");
    rendered.rerender(<VnLayerV1 {...props} active={false} />);
    await waitFor(() => {
      expect(opener).toHaveFocus();
      expect(openerFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("restores the first still-enabled logical successor when the opener becomes disabled", async () => {
    const props = createVnPropsV1();
    const controls = render(
      <>
        <button key="opener" type="button">
          打开叙事
        </button>
        <button key="hidden" type="button" hidden>
          隐藏后继
        </button>
        <div key="inert" inert>
          <button type="button">惰性后继</button>
        </div>
        <button key="disconnected" type="button">
          已断开后继
        </button>
        <button key="disabled" type="button" disabled>
          禁用后继
        </button>
        <button key="available" type="button">
          可用后继
        </button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    const successor = screen.getByRole("button", { name: "可用后继" });
    opener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    opener.setAttribute("disabled", "");
    controls.rerender(
      <>
        <button key="opener" type="button" disabled>
          打开叙事
        </button>
        <button key="hidden" type="button" hidden>
          隐藏后继
        </button>
        <div key="inert" inert>
          <button type="button">惰性后继</button>
        </div>
        <button key="disabled" type="button" disabled>
          禁用后继
        </button>
        <button key="available" type="button">
          可用后继
        </button>
      </>,
    );
    const successorFocus = vi.spyOn(successor, "focus");
    rendered.unmount();

    await waitFor(() => {
      expect(successor).toHaveFocus();
      expect(successorFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("captures the opener before an atomic active commit disables it and clears browser focus", async () => {
    const props = createVnPropsV1();
    const rendered = render(
      <StrictMode>
        <AtomicNarrativeFocusProbeV1 active={false} openerDisabled={false} vnProps={props} />
      </StrictMode>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();

    rendered.rerender(
      <StrictMode>
        <AtomicNarrativeFocusProbeV1 active openerDisabled vnProps={props} />
      </StrictMode>,
    );
    expect(opener).toBeDisabled();
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    const successor = screen.getByRole("button", { name: "可用后继" });
    const successorFocus = vi.spyOn(successor, "focus");
    rendered.rerender(
      <StrictMode>
        <AtomicNarrativeFocusProbeV1 active={false} openerDisabled vnProps={props} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(successor).toHaveFocus();
      expect(successorFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("resolves the logical successor from live DOM after the external controls are replaced", async () => {
    const props = createVnPropsV1();
    const controls = render(
      <div key="opening-controls">
        <button type="button">打开叙事</button>
        <button type="button">可用后继</button>
      </div>,
    );
    const originalOpener = screen.getByRole("button", { name: "打开叙事" });
    originalOpener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    controls.rerender(
      <div key="replacement-controls">
        <button type="button" disabled>
          打开叙事
        </button>
        <button type="button">可用后继</button>
      </div>,
    );
    expect(originalOpener.isConnected).toBe(false);
    const liveSuccessor = screen.getByRole("button", { name: "可用后继" });
    const successorFocus = vi.spyOn(liveSuccessor, "focus");

    rendered.unmount();

    await waitFor(() => {
      expect(liveSuccessor).toHaveFocus();
      expect(successorFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("does not skip the successor that shifts into the opener ordinal after removal", async () => {
    const props = createVnPropsV1();
    const controls = render(
      <>
        <button key="opener" type="button">
          打开叙事
        </button>
        <button key="successor" type="button">
          可用后继
        </button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    controls.rerender(
      <button key="successor" type="button">
        可用后继
      </button>,
    );
    expect(opener.isConnected).toBe(false);
    const liveSuccessor = screen.getByRole("button", { name: "可用后继" });
    const successorFocus = vi.spyOn(liveSuccessor, "focus");

    rendered.unmount();

    await waitFor(() => {
      expect(liveSuccessor).toHaveFocus();
      expect(successorFocus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it("rechecks transient inert successors after the closing commit", async () => {
    const props = createVnPropsV1();
    render(
      <>
        <button type="button">打开叙事</button>
        <div data-testid="transient-inert-successor" inert>
          <button type="button">HUD 后继</button>
        </div>
        <button type="button">较晚后继</button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    const hudSuccessor = screen.getByRole("button", { name: "HUD 后继", hidden: true });
    const laterSuccessor = screen.getByRole("button", { name: "较晚后继" });
    opener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    opener.setAttribute("disabled", "");
    const transientInertScope = screen.getByTestId("transient-inert-successor");
    queueMicrotask(() => transientInertScope.removeAttribute("inert"));
    rendered.unmount();

    await waitFor(() => expect(hudSuccessor).toHaveFocus());
    expect(laterSuccessor).not.toHaveFocus();
  });

  it("uses the captured ordinal when a connected opener leaves the live candidate set", async () => {
    const props = createVnPropsV1();
    render(
      <>
        <button type="button">打开叙事</button>
        <button type="button">可用后继</button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    const successor = screen.getByRole("button", { name: "可用后继" });
    opener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    opener.tabIndex = -1;
    rendered.unmount();

    await waitFor(() => expect(successor).toHaveFocus());
  });

  it("restores the exact previously focused HTMLElement when unmounted while active", async () => {
    const props = createVnPropsV1();
    render(<button type="button">打开叙事</button>);
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();

    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();
    rendered.unmount();

    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("ignores StrictMode replay cleanup while Narrative remains active", async () => {
    const props = createVnPropsV1();
    render(<button type="button">打开叙事</button>);
    const opener = screen.getByRole("button", { name: "打开叙事" });
    opener.focus();

    const rendered = render(
      <StrictMode>
        <VnLayerV1 {...props} />
      </StrictMode>,
    );
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();
    rendered.unmount();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("ignores focus captured by an abandoned Suspense render", async () => {
    const props = createVnPropsV1();
    render(
      <>
        <button type="button">候选 A</button>
        <button type="button">候选 B</button>
      </>,
    );
    const candidateA = screen.getByRole("button", { name: "候选 A" });
    const candidateB = screen.getByRole("button", { name: "候选 B" });
    const tree = (active: boolean, suspend: boolean) => (
      <Suspense fallback={<p>挂起</p>}>
        <VnLayerV1 {...props} active={active} />
        <AbandonedNarrativeRenderProbeV1 suspend={suspend} />
      </Suspense>
    );
    const rendered = render(tree(false, false));
    candidateA.focus();

    act(() => {
      startTransition(() => rendered.rerender(tree(true, true)));
    });
    expect(screen.queryByText("挂起")).not.toBeInTheDocument();
    candidateB.focus();

    rendered.rerender(tree(true, false));
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();
    rendered.rerender(tree(false, false));

    await waitFor(() => expect(candidateB).toHaveFocus());
    expect(candidateA).not.toHaveFocus();
  });

  it("does not steal focus from a higher blocking surface while becoming inactive", async () => {
    const props = createVnPropsV1();
    render(
      <>
        <button type="button">打开叙事</button>
        <button type="button">系统确认</button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "打开叙事" });
    const systemControl = screen.getByRole("button", { name: "系统确认" });
    opener.focus();
    const openerFocus = vi.spyOn(opener, "focus");
    const rendered = render(<VnLayerV1 {...props} />);
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();

    systemControl.focus();
    rendered.unmount();

    await waitFor(() => {
      expect(systemControl).toHaveFocus();
      expect(opener).not.toHaveFocus();
      expect(openerFocus).not.toHaveBeenCalled();
    });
  });
});

describe("VnLayerV1 motion and Stage isolation", () => {
  it("makes lower Stage layers inert while keeping workspace and system reachable", async () => {
    const props = createVnPropsV1();
    const user = userEvent.setup();
    render(
      <GameStageV1
        accessibleName="游戏舞台"
        layers={Object.freeze({
          background: <p>背景</p>,
          character: <p>角色</p>,
          sceneInteraction: <button type="button">场景交互</button>,
          hud: <button type="button">HUD 操作</button>,
          workspaceOverlay: <button type="button">工作区操作</button>,
          narrative: <VnLayerV1 {...props} />,
          system: <button type="button">设置</button>,
        })}
      />,
    );

    for (const testId of [
      "stage-background",
      "stage-character",
      "stage-scene-interaction",
      "stage-hud",
    ]) {
      expect(screen.getByTestId(testId)).toHaveAttribute("inert");
    }
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "谨慎询问" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "继续" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "设置" })).toHaveFocus();
  });

  it("renders the final text synchronously without implementing a reveal timer", async () => {
    const props = createVnPropsV1();

    render(<VnLayerV1 {...props} />);

    expect(screen.getByText(props.text)).toHaveTextContent(props.text);
    const source = await readFile(resolve(import.meta.dirname, "vn-layer.tsx"), "utf8");
    expect(source).not.toMatch(/set(?:Timeout|Interval)\s*\(/u);
  });

  it("owns a full-layer pointer shield and removes reveal animation for reduced motion", async () => {
    const css = await readFile(resolve(import.meta.dirname, "vn-layer.module.css"), "utf8");

    expect(css).toMatch(/\.vn-layer\s*\{[^}]*position:\s*absolute;/su);
    expect(css).toMatch(/\.vn-layer\s*\{[^}]*inset:\s*0;/su);
    expect(css).toMatch(/\.vn-layer\s*\{[^}]*pointer-events:\s*auto;/su);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/animation:\s*none;/u);
  });
});
