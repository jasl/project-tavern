// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputContextProviderV1, useInputRouterV1 } from "./input-context.js";

afterEach(cleanup);

function createInputRouterFixtureV1() {
  return Object.freeze({
    register: vi.fn(() => () => undefined),
    route: vi.fn(() => Object.freeze({ kind: "ignored" as const })),
    clearTransientInput: vi.fn(),
  });
}

function RouterIdentityProbeV1(props: {
  readonly expected: ReturnType<typeof createInputRouterFixtureV1>;
  readonly label: string;
}): ReactElement {
  return <span>{useInputRouterV1() === props.expected ? props.label : "unexpected router"}</span>;
}

describe("InputContextProviderV1", () => {
  it("provides the exact injected router identity", () => {
    const router = createInputRouterFixtureV1();
    const wrapper = (props: PropsWithChildren): ReactElement => (
      <InputContextProviderV1 router={router}>{props.children}</InputContextProviderV1>
    );

    const rendered = renderHook(() => useInputRouterV1(), { wrapper });

    expect(rendered.result.current).toBe(router);
  });

  it("uses the nearest router from nested providers", () => {
    const outerRouter = createInputRouterFixtureV1();
    const innerRouter = createInputRouterFixtureV1();

    render(
      <InputContextProviderV1 router={outerRouter}>
        <InputContextProviderV1 router={innerRouter}>
          <RouterIdentityProbeV1 expected={innerRouter} label="inner" />
        </InputContextProviderV1>
      </InputContextProviderV1>,
    );

    expect(screen.getByText("inner")).toBeInTheDocument();
  });

  it("publishes a replacement router after the provider rerenders", () => {
    const firstRouter = createInputRouterFixtureV1();
    const secondRouter = createInputRouterFixtureV1();
    const rendered = render(
      <InputContextProviderV1 router={firstRouter}>
        <RouterIdentityProbeV1 expected={firstRouter} label="first" />
      </InputContextProviderV1>,
    );

    expect(screen.getByText("first")).toBeInTheDocument();

    rendered.rerender(
      <InputContextProviderV1 router={secondRouter}>
        <RouterIdentityProbeV1 expected={secondRouter} label="second" />
      </InputContextProviderV1>,
    );

    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("keeps sibling providers isolated instead of retaining a global mutable router", () => {
    const leftRouter = createInputRouterFixtureV1();
    const rightRouter = createInputRouterFixtureV1();

    render(
      <>
        <InputContextProviderV1 router={leftRouter}>
          <RouterIdentityProbeV1 expected={leftRouter} label="left" />
        </InputContextProviderV1>
        <InputContextProviderV1 router={rightRouter}>
          <RouterIdentityProbeV1 expected={rightRouter} label="right" />
        </InputContextProviderV1>
      </>,
    );

    expect(screen.getByText("left")).toBeInTheDocument();
    expect(screen.getByText("right")).toBeInTheDocument();
  });
});

describe("useInputRouterV1", () => {
  it("fails with a stable code when no provider exists", () => {
    expect(() => renderHook(() => useInputRouterV1())).toThrowError("ui.input_provider_missing");
  });
});
