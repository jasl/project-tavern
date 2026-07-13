// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const allowedImportDeclarations = Object.freeze([
  'import { parsePositiveSafeInteger } from "@sillymaker/base";',
  'import type { PositiveSafeInteger } from "@sillymaker/base";',
]);

const expectedExportByPath = Object.freeze({
  "game/stories/e2e/src/simulation/choice-delta-provider.ts": "defaultChoiceDeltaProviderV1",
  "game/stories/e2e/src/simulation/choice-delta-hotfix.ts": "installChoiceDeltaHotfixV1",
});

export function assertClosedExecutableSourceRootV1(path: string, bytes: Uint8Array): void {
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const expectedExport = expectedExportByPath[path as keyof typeof expectedExportByPath];
  const importTokens = [...source.matchAll(/\bimport\b/gu)];
  const exportTokens = [...source.matchAll(/\bexport\b/gu)];

  if (
    expectedExport === undefined ||
    importTokens.length !== allowedImportDeclarations.length ||
    allowedImportDeclarations.some((declaration) => !source.includes(declaration))
  ) {
    throw new TypeError(`${path} is not a closed executable source root: import list mismatch`);
  }
  if (exportTokens.length !== 1 || !source.includes(`export function ${expectedExport}(`)) {
    throw new TypeError(`${path} is not a closed executable source root: export list mismatch`);
  }
  if (/\brequire\b/u.test(source)) {
    throw new TypeError(`${path} is not a closed executable source root: CommonJS require`);
  }
}

export function assertCleanGeneratedOutputPathV1(path: string, status: string): void {
  if (status.trim() !== "") {
    throw new TypeError(`${path} has foreign Git bytes; refusing to overwrite`);
  }
}
