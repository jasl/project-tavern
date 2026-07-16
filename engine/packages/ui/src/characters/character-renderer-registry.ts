// SPDX-License-Identifier: MIT
import type { CharacterRendererContributionV1, CharacterRendererRegistryV1 } from "./contracts.js";

type FoundCharacterRendererV1 = Readonly<{
  readonly kind: "found";
  readonly contribution: CharacterRendererContributionV1;
}>;

const notFoundV1 = Object.freeze({
  kind: "not_found" as const,
  code: "ui.character_renderer_not_found" as const,
});

export function createCharacterRendererRegistryV1(
  contributions: readonly CharacterRendererContributionV1[],
): CharacterRendererRegistryV1 {
  const records = new Map<string, FoundCharacterRendererV1>();

  for (const [index, contribution] of contributions.entries()) {
    if (contribution.rendererId.trim().length === 0) {
      throw new TypeError(`ui.empty_character_renderer_id:${index}`);
    }
    if (records.has(contribution.rendererId)) {
      throw new TypeError(`ui.duplicate_character_renderer_id:${contribution.rendererId}`);
    }

    records.set(
      contribution.rendererId,
      Object.freeze({
        kind: "found",
        contribution,
      }),
    );
  }

  return Object.freeze({
    resolve(rendererId: string) {
      return records.get(rendererId) ?? notFoundV1;
    },
  });
}
