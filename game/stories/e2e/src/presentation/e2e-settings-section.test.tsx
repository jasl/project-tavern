// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import {
  emptyContentMaturityFlagsV1,
  parseNonNegativeSafeInteger,
  type ContentMaturityFlagsV1,
  type ContentPreferencePortV1,
  type ContentPreferenceSetResultV1,
  type ContentPreferenceV1,
  type DeepReadonly,
} from "@sillymaker/base";
import { createPresentationReadPortV1 } from "@sillymaker/ui";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  e2eAllContentPresetIdV1,
  e2eAlphaFlagV1,
  e2eBaseContentPresetIdV1,
  e2eBetaFlagV1,
  e2eBothFlagsV1,
  e2eContentMaturityPolicyV1,
  e2eStreamSafeContentPresetIdV1,
} from "./content-maturity-policy.js";
import { E2eSettingsSectionV1 } from "./e2e-settings-section.js";
import {
  e2eContentPreferenceRejectedTextIdV1,
  e2eContentPreferenceStorageFailedTextIdV1,
  e2eDefaultLocaleV1,
  e2eTextCatalogsV1,
} from "./text-catalogs.js";

afterEach(cleanup);

function requireArrayEntryV1<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) {
    throw new TypeError(`E2E content-preference test descriptor is missing: ${label}`);
  }
  return value;
}

const alphaDescriptorV1 = requireArrayEntryV1(e2eContentMaturityPolicyV1.flags, 0, "alpha flag");
const betaDescriptorV1 = requireArrayEntryV1(e2eContentMaturityPolicyV1.flags, 1, "beta flag");
const basePresetV1 = requireArrayEntryV1(e2eContentMaturityPolicyV1.presets, 0, "base preset");
const streamSafePresetV1 = requireArrayEntryV1(
  e2eContentMaturityPolicyV1.presets,
  1,
  "stream-safe preset",
);
const allPresetV1 = requireArrayEntryV1(e2eContentMaturityPolicyV1.presets, 2, "all preset");

type PlannedSetOutcomeV1 = "updated" | "rejected" | "failed";

interface PlannedSetV1 {
  readonly outcome: PlannedSetOutcomeV1;
  readonly deferred: boolean;
}

function createContentPreferenceFixtureV1(
  initialAllowedFlags: ContentMaturityFlagsV1 = emptyContentMaturityFlagsV1,
) {
  let current = Object.freeze({ allowedFlags: initialAllowedFlags });
  const listeners = new Set<() => void>();
  const plans: PlannedSetV1[] = [];
  let resolvePending: (() => void) | null = null;

  const publish = (allowedFlags: ContentMaturityFlagsV1): void => {
    current = Object.freeze({ allowedFlags });
    for (const listener of [...listeners]) listener();
  };

  const complete = (
    outcome: PlannedSetOutcomeV1,
    preference: DeepReadonly<ContentPreferenceV1>,
  ): ContentPreferenceSetResultV1 => {
    switch (outcome) {
      case "updated":
        publish(preference.allowedFlags);
        return Object.freeze({ kind: "updated", preference: current });
      case "rejected":
        return Object.freeze({
          kind: "rejected",
          code: "content_maturity.invalid_preference",
        });
      case "failed":
        return Object.freeze({
          kind: "failed",
          code: "content_preference.storage_failed",
        });
      default: {
        const unreachable: never = outcome;
        throw new TypeError(`unknown content-preference outcome: ${String(unreachable)}`);
      }
    }
  };

  const set = vi.fn(
    (preference: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1> => {
      const plan = plans.shift() ?? Object.freeze({ outcome: "updated", deferred: false });
      if (!plan.deferred) return Promise.resolve(complete(plan.outcome, preference));
      if (resolvePending !== null) throw new TypeError("test fixture already has a pending write");
      return new Promise((resolve) => {
        resolvePending = () => {
          resolvePending = null;
          resolve(complete(plan.outcome, preference));
        };
      });
    },
  );

  const port: ContentPreferencePortV1 = Object.freeze({
    observe: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set,
  });

  return Object.freeze({
    port,
    set,
    current: () => current,
    publish,
    plan(outcome: PlannedSetOutcomeV1): void {
      plans.push(Object.freeze({ outcome, deferred: false }));
    },
    defer(outcome: PlannedSetOutcomeV1 = "updated"): void {
      plans.push(Object.freeze({ outcome, deferred: true }));
    },
    resolvePending(): void {
      if (resolvePending === null) throw new TypeError("test fixture has no pending write");
      resolvePending();
    },
  });
}

function createPresentationFixtureV1() {
  const assetPublication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });
  const delegate = createPresentationReadPortV1({
    catalogs: e2eTextCatalogsV1,
    locale: e2eDefaultLocaleV1,
    assets: Object.freeze({
      observe: () => assetPublication,
      subscribe: (_listener: () => void) => () => undefined,
      preload: async () => Object.freeze([]),
      resolve: () => {
        throw new TypeError("settings test fixture has no assets");
      },
      dispose: () => undefined,
    }),
  });
  const text = vi.fn(delegate.text);
  return Object.freeze({
    delegate,
    port: Object.freeze({ ...delegate, text }),
    text,
  });
}

function renderSettingsFixtureV1(
  initialAllowedFlags: ContentMaturityFlagsV1 = emptyContentMaturityFlagsV1,
) {
  const contentPreference = createContentPreferenceFixtureV1(initialAllowedFlags);
  const presentation = createPresentationFixtureV1();
  render(
    <E2eSettingsSectionV1
      contentPreference={contentPreference.port}
      presentation={presentation.port}
    />,
  );

  const alpha = screen.getByRole("checkbox", {
    name: presentation.delegate.text(alphaDescriptorV1.nameTextId).text,
  });
  const beta = screen.getByRole("checkbox", {
    name: presentation.delegate.text(betaDescriptorV1.nameTextId).text,
  });
  const base = screen.getByRole("button", {
    name: presentation.delegate.text(basePresetV1.nameTextId).text,
  });
  const streamSafe = screen.getByRole("button", {
    name: presentation.delegate.text(streamSafePresetV1.nameTextId).text,
  });
  const all = screen.getByRole("button", {
    name: presentation.delegate.text(allPresetV1.nameTextId).text,
  });

  return Object.freeze({
    contentPreference,
    presentation,
    controls: Object.freeze({ alpha, beta, base, streamSafe, all }),
  });
}

type SettingsControlsV1 = ReturnType<typeof renderSettingsFixtureV1>["controls"];

function expectMaskV1(
  controls: SettingsControlsV1,
  current: DeepReadonly<ContentPreferenceV1>,
  expected: ContentMaturityFlagsV1,
): void {
  expect(current.allowedFlags).toBe(expected);
  expect(controls.alpha).toHaveProperty("checked", (expected & e2eAlphaFlagV1) !== 0);
  expect(controls.beta).toHaveProperty("checked", (expected & e2eBetaFlagV1) !== 0);
  expect(controls.base).toHaveAttribute(
    "aria-pressed",
    String(expected === basePresetV1.allowedFlags),
  );
  expect(controls.streamSafe).toHaveAttribute(
    "aria-pressed",
    String(expected === streamSafePresetV1.allowedFlags),
  );
  expect(controls.all).toHaveAttribute(
    "aria-pressed",
    String(expected === allPresetV1.allowedFlags),
  );
}

describe("E2eSettingsSectionV1", () => {
  it("applies two independent flags and all three presets with exact mask and DOM state", async () => {
    const user = userEvent.setup();
    const fixture = renderSettingsFixtureV1();
    const { controls } = fixture;

    expect(controls.alpha).toHaveAttribute("data-content-flag-id", alphaDescriptorV1.id);
    expect(controls.beta).toHaveAttribute("data-content-flag-id", betaDescriptorV1.id);
    expect(controls.base).toHaveAttribute("data-content-preset-id", e2eBaseContentPresetIdV1);
    expect(controls.streamSafe).toHaveAttribute(
      "data-content-preset-id",
      e2eStreamSafeContentPresetIdV1,
    );
    expect(controls.all).toHaveAttribute("data-content-preset-id", e2eAllContentPresetIdV1);
    expect(controls.alpha).toHaveAccessibleDescription(
      fixture.presentation.delegate.text(alphaDescriptorV1.descriptionTextId).text,
    );
    expect(controls.beta).toHaveAccessibleDescription(
      fixture.presentation.delegate.text(betaDescriptorV1.descriptionTextId).text,
    );
    expectMaskV1(controls, fixture.contentPreference.current(), emptyContentMaturityFlagsV1);

    await user.click(controls.alpha);
    await waitFor(() =>
      expectMaskV1(controls, fixture.contentPreference.current(), e2eAlphaFlagV1),
    );

    await user.click(controls.beta);
    await waitFor(() =>
      expectMaskV1(controls, fixture.contentPreference.current(), e2eBothFlagsV1),
    );

    await user.click(controls.alpha);
    await waitFor(() => expectMaskV1(controls, fixture.contentPreference.current(), e2eBetaFlagV1));

    await user.click(controls.beta);
    await waitFor(() =>
      expectMaskV1(controls, fixture.contentPreference.current(), emptyContentMaturityFlagsV1),
    );

    await user.click(controls.all);
    await waitFor(() =>
      expectMaskV1(controls, fixture.contentPreference.current(), e2eBothFlagsV1),
    );

    await user.click(controls.base);
    await waitFor(() =>
      expectMaskV1(controls, fixture.contentPreference.current(), emptyContentMaturityFlagsV1),
    );

    await user.click(controls.streamSafe);
    await waitFor(() => expectMaskV1(controls, fixture.contentPreference.current(), e2eBetaFlagV1));

    expect(fixture.contentPreference.set.mock.calls.map(([value]) => value.allowedFlags)).toEqual([
      e2eAlphaFlagV1,
      e2eBothFlagsV1,
      e2eBetaFlagV1,
      emptyContentMaturityFlagsV1,
      e2eBothFlagsV1,
      emptyContentMaturityFlagsV1,
      e2eBetaFlagV1,
    ]);
  });

  it("disables every control while one write is pending without optimistic drift", async () => {
    const user = userEvent.setup();
    const fixture = renderSettingsFixtureV1();
    fixture.contentPreference.defer();

    await user.click(fixture.controls.alpha);

    expect(fixture.contentPreference.set).toHaveBeenCalledExactlyOnceWith({
      allowedFlags: e2eAlphaFlagV1,
    });
    expectMaskV1(
      fixture.controls,
      fixture.contentPreference.current(),
      emptyContentMaturityFlagsV1,
    );
    for (const control of Object.values(fixture.controls)) expect(control).toBeDisabled();

    act(() => fixture.contentPreference.resolvePending());

    await waitFor(() =>
      expectMaskV1(fixture.controls, fixture.contentPreference.current(), e2eAlphaFlagV1),
    );
    for (const control of Object.values(fixture.controls)) expect(control).toBeEnabled();
  });

  it("keeps observed state on rejected and failed writes and clears status on subscription", async () => {
    const user = userEvent.setup();
    const fixture = renderSettingsFixtureV1();
    fixture.contentPreference.plan("rejected");

    await user.click(fixture.controls.alpha);

    const rejectedStatus = await screen.findByRole("status");
    expectMaskV1(
      fixture.controls,
      fixture.contentPreference.current(),
      emptyContentMaturityFlagsV1,
    );
    expect(rejectedStatus).toHaveAttribute("data-content-preference-result", "rejected");
    expect(rejectedStatus).toHaveTextContent(
      fixture.presentation.delegate.text(e2eContentPreferenceRejectedTextIdV1).text,
    );
    expect(fixture.presentation.text).toHaveBeenCalledWith(e2eContentPreferenceRejectedTextIdV1);

    act(() => fixture.contentPreference.publish(e2eBetaFlagV1));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expectMaskV1(fixture.controls, fixture.contentPreference.current(), e2eBetaFlagV1);

    fixture.contentPreference.plan("failed");
    await user.click(fixture.controls.alpha);

    const failedStatus = await screen.findByRole("status");
    expectMaskV1(fixture.controls, fixture.contentPreference.current(), e2eBetaFlagV1);
    expect(failedStatus).toHaveAttribute("data-content-preference-result", "failed");
    expect(failedStatus).toHaveTextContent(
      fixture.presentation.delegate.text(e2eContentPreferenceStorageFailedTextIdV1).text,
    );
    expect(fixture.presentation.text).toHaveBeenCalledWith(
      e2eContentPreferenceStorageFailedTextIdV1,
    );

    act(() => fixture.contentPreference.publish(e2eBothFlagsV1));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expectMaskV1(fixture.controls, fixture.contentPreference.current(), e2eBothFlagsV1);
  });
});
