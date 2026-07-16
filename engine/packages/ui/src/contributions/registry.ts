// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";
import type {
  UiContributionRegistryV1,
  UiContributionSetV1,
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

type StoredRendererV1 = Readonly<{
  readonly kind: "found";
  readonly component: ComponentType<unknown>;
}>;

function createRendererMapsV1(): Readonly<
  Record<UiRendererNamespaceV1, Map<string, StoredRendererV1>>
> {
  return Object.freeze({
    background: new Map(),
    character: new Map(),
    scene_interaction: new Map(),
    hud: new Map(),
    workspace_overlay: new Map(),
    narrative: new Map(),
    system: new Map(),
  });
}

function isEmptyIdV1(value: string): boolean {
  return value.trim().length === 0;
}

export function createUiContributionRegistryV1<
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>>,
>(
  contributionSets: readonly UiContributionSetV1<TContexts>[],
): UiContributionRegistryV1<TContexts> {
  const contributionIds = new Set<string>();
  const rendererMaps = createRendererMapsV1();

  for (
    let contributionIndex = 0;
    contributionIndex < contributionSets.length;
    contributionIndex += 1
  ) {
    const contributionSet = contributionSets[contributionIndex];
    if (contributionSet === undefined) continue;

    if (isEmptyIdV1(contributionSet.contributionId)) {
      throw new TypeError(`ui.empty_contribution_id:${contributionIndex}`);
    }
    if (contributionIds.has(contributionSet.contributionId)) {
      throw new TypeError(`ui.duplicate_contribution_id:${contributionSet.contributionId}`);
    }
    contributionIds.add(contributionSet.contributionId);

    for (const namespace of rendererNamespacesV1) {
      const rendererMap = rendererMaps[namespace];
      const contributions = contributionSet.renderers[namespace] ?? [];

      for (const contribution of contributions) {
        if (isEmptyIdV1(contribution.rendererId)) {
          throw new TypeError(
            `ui.empty_renderer_id:${namespace}:${contributionSet.contributionId}`,
          );
        }
        if (rendererMap.has(contribution.rendererId)) {
          throw new TypeError(`ui.duplicate_renderer_id:${namespace}:${contribution.rendererId}`);
        }

        rendererMap.set(
          contribution.rendererId,
          Object.freeze({
            kind: "found",
            component: contribution.component as ComponentType<unknown>,
          }),
        );
      }
    }
  }

  for (const namespace of rendererNamespacesV1) Object.freeze(rendererMaps[namespace]);

  const notFound = Object.freeze({
    kind: "not_found" as const,
    code: "ui.renderer_not_found" as const,
  });

  return Object.freeze({
    resolve<TNamespace extends UiRendererNamespaceV1>(namespace: TNamespace, rendererId: string) {
      const found = rendererMaps[namespace].get(rendererId);
      if (found === undefined) return notFound;
      return found as Readonly<{
        readonly kind: "found";
        readonly component: ComponentType<TContexts[TNamespace]>;
      }>;
    },
  });
}
