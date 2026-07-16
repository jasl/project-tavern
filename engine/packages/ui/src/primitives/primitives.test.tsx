// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button.js";
import { IconButton } from "./IconButton.js";
import { ProgressMeter } from "./ProgressMeter.js";

afterEach(cleanup);

describe("Button", () => {
  it("keeps native button semantics, defaults to type button, and forwards its ref", async () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();

    render(
      <Button ref={ref} className="story-action" onClick={onClick}>
        确认
      </Button>,
    );

    const button = screen.getByRole("button", { name: "确认" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("silly-button", "story-action");
    expect(ref.current).toBe(button);

    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("preserves an explicitly supplied native submit type", () => {
    render(<Button type="submit">提交</Button>);
    expect(screen.getByRole("button", { name: "提交" })).toHaveAttribute("type", "submit");
  });
});

describe("IconButton", () => {
  it("renders a native icon-only button with the exact supplied accessible name", () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <IconButton ref={ref} accessibleName="  设置  ">
        <svg data-testid="settings-symbol" />
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "设置" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-label", "  设置  ");
    expect(button).toHaveClass("silly-icon-button");
    expect(ref.current).toBe(button);
    expect(screen.getByTestId("settings-symbol").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it.each(["", "   "])("rejects the blank accessible name %j with a stable code", (name) => {
    expect(() =>
      render(
        <IconButton accessibleName={name}>
          <svg />
        </IconButton>,
      ),
    ).toThrowError("ui.icon_button_accessible_name_missing");
  });

  it.each([undefined, null, 42])(
    "rejects the non-string accessible name %j with the stable code",
    (name) => {
      expect(() =>
        render(
          <IconButton accessibleName={name as never}>
            <svg />
          </IconButton>,
        ),
      ).toThrowError("ui.icon_button_accessible_name_missing");
    },
  );
});

describe("ProgressMeter", () => {
  it("exposes its native progress value and authored accessible value text", () => {
    const ref = createRef<HTMLProgressElement>();

    render(
      <ProgressMeter
        ref={ref}
        accessibleName="酒馆声望"
        value={35}
        max={100}
        valueText="35 / 100"
      />,
    );

    const meter = screen.getByRole("progressbar", { name: "酒馆声望" });
    expect(meter.tagName).toBe("PROGRESS");
    expect(meter).toHaveAttribute("value", "35");
    expect(meter).toHaveAttribute("max", "100");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuenow", "35");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuetext", "35 / 100");
    expect(meter).toHaveClass("silly-progress-meter");
    expect(ref.current).toBe(meter);
  });

  it.each([
    { value: Number.NaN, max: 100 },
    { value: Number.POSITIVE_INFINITY, max: 100 },
    { value: -1, max: 100 },
    { value: 101, max: 100 },
    { value: 1, max: 0 },
    { value: 1, max: Number.POSITIVE_INFINITY },
  ])("rejects the invalid range $value/$max", ({ value, max }) => {
    expect(() =>
      render(<ProgressMeter accessibleName="酒馆声望" value={value} max={max} />),
    ).toThrowError("ui.progress_meter_range_invalid");
  });

  it("rejects a blank accessible name", () => {
    expect(() => render(<ProgressMeter accessibleName="  " value={1} max={10} />)).toThrowError(
      "ui.progress_meter_accessible_name_missing",
    );
  });

  it.each([undefined, null, 42])(
    "rejects the non-string accessible name %j with the stable code",
    (name) => {
      expect(() =>
        render(<ProgressMeter accessibleName={name as never} value={1} max={10} />),
      ).toThrowError("ui.progress_meter_accessible_name_missing");
    },
  );

  it("rejects blank authored value text", () => {
    expect(() =>
      render(<ProgressMeter accessibleName="酒馆声望" value={1} max={10} valueText="  " />),
    ).toThrowError("ui.progress_meter_value_text_invalid");
  });

  it.each([null, 42])("rejects the non-string value text %j", (valueText) => {
    expect(() =>
      render(
        <ProgressMeter
          accessibleName="酒馆声望"
          value={1}
          max={10}
          valueText={valueText as never}
        />,
      ),
    ).toThrowError("ui.progress_meter_value_text_invalid");
  });
});

describe("theme tokens", () => {
  it("freezes the Stage basis, minimum target, readable typography, and safe areas", async () => {
    const tokensCssV1 = await readFile(resolve(import.meta.dirname, "../theme/tokens.css"), "utf8");

    expect(tokensCssV1).toMatch(/--silly-stage-basis-width:\s*1600px;/u);
    expect(tokensCssV1).toMatch(/--silly-stage-basis-height:\s*1000px;/u);
    expect(tokensCssV1).toMatch(/--silly-stage-max-width:\s*1600px;/u);
    expect(tokensCssV1).toMatch(/--silly-stage-aspect-ratio:\s*8\s*\/\s*5;/u);
    expect(tokensCssV1).toMatch(/--silly-target-min-size:\s*44px;/u);
    expect(tokensCssV1).toMatch(/--silly-text-size-base:\s*clamp\(/u);
    expect(tokensCssV1).toMatch(/--silly-line-height-readable:\s*1\.6;/u);

    for (const logicalEdge of ["block-start", "block-end", "inline-start", "inline-end"]) {
      expect(tokensCssV1).toContain(`--silly-safe-area-${logicalEdge}:`);
    }
  });

  it("defines exactly the seven fixed Stage z-index tokens in ascending order", async () => {
    const tokensCssV1 = await readFile(resolve(import.meta.dirname, "../theme/tokens.css"), "utf8");
    const zTokens = [...tokensCssV1.matchAll(/--silly-stage-z-([a-z-]+):\s*(\d+);/gu)].map(
      (match) => [match[1], Number(match[2])],
    );

    expect(zTokens).toEqual([
      ["background", 0],
      ["character", 10],
      ["scene-interaction", 20],
      ["hud", 30],
      ["workspace-overlay", 40],
      ["narrative", 50],
      ["system", 60],
    ]);
  });

  it("applies the target token, a two-color focus ring, and reduced-motion fallback", async () => {
    const globalCssV1 = await readFile(resolve(import.meta.dirname, "../theme/global.css"), "utf8");
    expect(globalCssV1).toMatch(/min-block-size:\s*var\(--silly-target-min-size\);/u);
    expect(globalCssV1).toMatch(/min-inline-size:\s*var\(--silly-target-min-size\);/u);
    expect(globalCssV1).toContain("var(--silly-focus-ring-inner)");
    expect(globalCssV1).toContain("var(--silly-focus-ring-outer)");
    expect(globalCssV1).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
    expect(globalCssV1).toMatch(/transition:\s*none\s*!important;/u);
  });

  it("loads only the materialized Simplified Chinese font faces", async () => {
    const globalCssV1 = await readFile(resolve(import.meta.dirname, "../theme/global.css"), "utf8");
    expect(globalCssV1).toContain("@fontsource/noto-sans-sc/chinese-simplified-400.css");
    expect(globalCssV1).toContain("@fontsource/noto-sans-sc/chinese-simplified-700.css");
    expect(globalCssV1).not.toMatch(/noto-sans-sc\/(?:index|[1-9]00)\.css/u);
  });
});
