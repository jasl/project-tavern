// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { createUiContributionRegistryV1 } from "./registry.js";
import type {
  UiContributionSetV1,
  UiRendererContributionV1,
  UiRendererNamespaceV1,
} from "./types.js";

const rendererNamespacesV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "workspace_overlay",
  "narrative",
  "system",
] as const satisfies readonly UiRendererNamespaceV1[]);

type TestRendererContextsV1 = Readonly<{
  [TNamespace in UiRendererNamespaceV1]: Readonly<{
    readonly namespace: TNamespace;
  }>;
}>;

const componentsByNamespaceV1 = Object.freeze({
  background: () => null,
  character: () => null,
  scene_interaction: () => null,
  hud: () => null,
  workspace_overlay: () => null,
  narrative: () => null,
  system: () => null,
} satisfies {
  readonly [TNamespace in UiRendererNamespaceV1]: ComponentType<TestRendererContextsV1[TNamespace]>;
});

function rendererV1<TNamespace extends UiRendererNamespaceV1>(
  namespace: TNamespace,
  rendererId: string,
  component: ComponentType<TestRendererContextsV1[TNamespace]> = componentsByNamespaceV1[namespace],
): UiRendererContributionV1<TestRendererContextsV1[TNamespace]> {
  return Object.freeze({ rendererId, component });
}

function contributionV1<TNamespace extends UiRendererNamespaceV1>(
  contributionId: string,
  namespace: TNamespace,
  renderers: readonly UiRendererContributionV1<TestRendererContextsV1[TNamespace]>[],
): UiContributionSetV1<TestRendererContextsV1> {
  return Object.freeze({
    contributionId,
    renderers: Object.freeze({
      [namespace]: Object.freeze([...renderers]),
    }),
  }) as UiContributionSetV1<TestRendererContextsV1>;
}

function registryWithCompleteSetV1() {
  const completeSet = Object.freeze({
    contributionId: "contribution.complete",
    renderers: Object.freeze({
      background: Object.freeze([rendererV1("background", "renderer.complete.background")]),
      character: Object.freeze([rendererV1("character", "renderer.complete.character")]),
      scene_interaction: Object.freeze([
        rendererV1("scene_interaction", "renderer.complete.scene_interaction"),
      ]),
      hud: Object.freeze([rendererV1("hud", "renderer.complete.hud")]),
      workspace_overlay: Object.freeze([
        rendererV1("workspace_overlay", "renderer.complete.workspace_overlay"),
      ]),
      narrative: Object.freeze([rendererV1("narrative", "renderer.complete.narrative")]),
      system: Object.freeze([rendererV1("system", "renderer.complete.system")]),
    }),
  }) satisfies UiContributionSetV1<TestRendererContextsV1>;

  return Object.freeze({
    completeSet,
    registry: createUiContributionRegistryV1<TestRendererContextsV1>([completeSet]),
  });
}

describe("UiContributionRegistryV1", () => {
  it("resolves one independently typed renderer from each of the seven namespaces", () => {
    const { completeSet, registry } = registryWithCompleteSetV1();

    for (const namespace of rendererNamespacesV1) {
      const contribution = completeSet.renderers[namespace]?.[0];
      expect(contribution).toBeDefined();
      expect(registry.resolve(namespace, `renderer.complete.${namespace}`)).toEqual({
        kind: "found",
        component: contribution?.component,
      });
    }
  });

  it.each(rendererNamespacesV1)(
    "rejects a duplicate renderer ID within the %s namespace",
    (namespace) => {
      const sharedId = "renderer.shared";
      const first = contributionV1("contribution.first", namespace, [
        rendererV1(namespace, sharedId),
      ]);
      const duplicate = contributionV1("contribution.duplicate", namespace, [
        rendererV1(namespace, sharedId),
      ]);

      expect(() =>
        createUiContributionRegistryV1<TestRendererContextsV1>([first, duplicate]),
      ).toThrowError(`ui.duplicate_renderer_id:${namespace}:${sharedId}`);
    },
  );

  it("allows the same renderer ID in different namespaces", () => {
    const sharedId = "renderer.shared";
    const components = rendererNamespacesV1.map((namespace, index) => {
      const component = () => index;
      return Object.freeze({ namespace, component });
    });
    const sets = components.map(({ namespace, component }, index) =>
      contributionV1(`contribution.${index}`, namespace, [
        rendererV1(namespace, sharedId, component),
      ]),
    );

    const registry = createUiContributionRegistryV1<TestRendererContextsV1>(sets);

    for (const { namespace, component } of components) {
      expect(registry.resolve(namespace, sharedId)).toEqual({ kind: "found", component });
    }
  });

  it("rejects an empty contribution ID with its authored index", () => {
    const first = contributionV1("contribution.first", "hud", [
      rendererV1("hud", "renderer.first"),
    ]);
    const empty = contributionV1("", "system", [rendererV1("system", "renderer.empty-owner")]);

    expect(() =>
      createUiContributionRegistryV1<TestRendererContextsV1>([first, empty]),
    ).toThrowError("ui.empty_contribution_id:1");
  });

  it("rejects a duplicate contribution ID before combining its renderers", () => {
    const contributionId = "contribution.shared";
    const first = contributionV1(contributionId, "background", [
      rendererV1("background", "renderer.background"),
    ]);
    const duplicate = contributionV1(contributionId, "system", [
      rendererV1("system", "renderer.system"),
    ]);

    expect(() =>
      createUiContributionRegistryV1<TestRendererContextsV1>([first, duplicate]),
    ).toThrowError(`ui.duplicate_contribution_id:${contributionId}`);
  });

  it.each(rendererNamespacesV1)(
    "rejects an empty renderer ID in the %s namespace with its contribution ID",
    (namespace) => {
      const contributionId = `contribution.empty.${namespace}`;
      const contribution = contributionV1(contributionId, namespace, [rendererV1(namespace, "")]);

      expect(() =>
        createUiContributionRegistryV1<TestRendererContextsV1>([contribution]),
      ).toThrowError(`ui.empty_renderer_id:${namespace}:${contributionId}`);
    },
  );

  it("returns a frozen typed not-found result for an unknown renderer", () => {
    const { registry } = registryWithCompleteSetV1();
    const result = registry.resolve("narrative", "renderer.missing");

    expect(result).toEqual({ kind: "not_found", code: "ui.renderer_not_found" });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind === "not_found") {
      expect(result.code).toBe("ui.renderer_not_found");
    }
  });

  it("freezes the registry and found results without changing component identity", () => {
    const { completeSet, registry } = registryWithCompleteSetV1();
    const component = completeSet.renderers.hud?.[0]?.component;
    const first = registry.resolve("hud", "renderer.complete.hud");
    const second = registry.resolve("hud", "renderer.complete.hud");

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(first).toEqual({ kind: "found", component });
    expect(second).toEqual({ kind: "found", component });
  });

  it("reports the first duplicate in contribution and renderer authored order", () => {
    const seed = contributionV1("contribution.seed", "hud", [
      rendererV1("hud", "renderer.first"),
      rendererV1("hud", "renderer.second"),
    ]);
    const firstConflictingContribution = contributionV1("contribution.conflict.first", "hud", [
      rendererV1("hud", "renderer.second"),
      rendererV1("hud", "renderer.first"),
    ]);
    const laterConflict = contributionV1("contribution.conflict.later", "hud", [
      rendererV1("hud", "renderer.first"),
    ]);

    expect(() =>
      createUiContributionRegistryV1<TestRendererContextsV1>([
        seed,
        firstConflictingContribution,
        laterConflict,
      ]),
    ).toThrowError("ui.duplicate_renderer_id:hud:renderer.second");
  });
});
