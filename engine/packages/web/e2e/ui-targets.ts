// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export const uiTargetsV1 = Object.freeze({
  poc: Object.freeze({
    applicationId: "poc-web",
    root: "dist/poc",
    host: "127.0.0.1",
    port: 41732,
  }),
} as const);

export type UiTargetNameV1 = keyof typeof uiTargetsV1;
export type UiTargetV1 = (typeof uiTargetsV1)[UiTargetNameV1];

export function uiTargetUrlV1(target: UiTargetV1): string {
  return `http://${target.host}:${target.port}`;
}
