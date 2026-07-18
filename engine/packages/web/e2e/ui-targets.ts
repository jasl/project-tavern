// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export const uiTargetsV1 = Object.freeze({
  e2e: Object.freeze({
    applicationId: "e2e-web",
    root: "dist/e2e",
    host: "127.0.0.1",
    port: 41731,
  }),
  poc: Object.freeze({
    applicationId: "poc-web",
    root: "dist/poc",
    host: "127.0.0.1",
    port: 41732,
  }),
} as const);

export type UiTargetNameV1 = keyof typeof uiTargetsV1;
export type UiTargetV1 = (typeof uiTargetsV1)[UiTargetNameV1];

export const uiHarnessMetadataKeyV1 = "projectTavernUiHarnessV1" as const;

export function uiTargetUrlV1(target: UiTargetV1): string {
  return `http://${target.host}:${target.port}`;
}
