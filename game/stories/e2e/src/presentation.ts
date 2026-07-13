// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";

export const e2eTextCatalogsV1 = Object.freeze({
  defaultLocale: "zh-CN" as const,
  catalogs: Object.freeze([
    Object.freeze({
      locale: "zh-CN" as const,
      entries: Object.freeze([
        Object.freeze({ textId: "text.e2e.counter", text: "计数" }),
        Object.freeze({ textId: "text.e2e.increment", text: "增加计数" }),
      ]),
    }),
  ]),
});

export const e2eAssetSlotsV1 = Object.freeze([
  Object.freeze({
    assetId: "asset.e2e.counter",
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

export interface E2ePresentationProgramV1 {
  readonly sceneId: "scene.e2e.counter";
  readonly textCatalogs: typeof e2eTextCatalogsV1;
}

export function materializeE2ePresentationV1(): E2ePresentationProgramV1 {
  return Object.freeze({
    sceneId: "scene.e2e.counter",
    textCatalogs: e2eTextCatalogsV1,
  });
}
