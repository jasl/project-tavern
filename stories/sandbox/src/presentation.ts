// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@project-tavern/base";
import type { AssetSlotDefinitionV1 } from "@project-tavern/base";

export const sandboxTextCatalogsV1 = Object.freeze({
  defaultLocale: "zh-CN" as const,
  catalogs: Object.freeze([
    Object.freeze({
      locale: "zh-CN" as const,
      entries: Object.freeze([
        Object.freeze({ textId: "text.sandbox.counter", text: "计数" }),
        Object.freeze({ textId: "text.sandbox.increment", text: "增加计数" }),
      ]),
    }),
  ]),
});

export const sandboxAssetSlotsV1: readonly AssetSlotDefinitionV1[] = Object.freeze([
  Object.freeze({
    assetId: "asset.sandbox.counter",
    kind: "ui" as const,
    usage: "ui_decoration" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "symbol.counter",
    width: parsePositiveSafeInteger(64),
    height: parsePositiveSafeInteger(64),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
]);

export interface SandboxPresentationProgramV1 {
  readonly sceneId: "scene.sandbox.counter";
  readonly textCatalogs: typeof sandboxTextCatalogsV1;
}

export function materializeSandboxPresentationV1(): SandboxPresentationProgramV1 {
  return Object.freeze({
    sceneId: "scene.sandbox.counter",
    textCatalogs: sandboxTextCatalogsV1,
  });
}
