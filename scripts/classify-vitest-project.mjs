// SPDX-License-Identifier: MIT
export const workspaceVitestIncludeV1 = Object.freeze([
  "engine/packages/**/src/**/*.test.{ts,tsx}",
  "game/packages/**/src/**/*.test.{ts,tsx}",
  "game/stories/**/src/**/*.test.{ts,tsx}",
  "game/apps/**/src/**/*.test.{ts,tsx}",
]);
export const propertyVitestIncludeV1 = Object.freeze([
  "engine/packages/**/src/**/*property.test.{ts,tsx}",
  "game/packages/**/src/**/*property.test.{ts,tsx}",
  "game/stories/**/src/**/*property.test.{ts,tsx}",
  "game/apps/**/src/**/*property.test.{ts,tsx}",
]);
export const contractVitestIncludeV1 = Object.freeze([
  "engine/packages/**/src/**/*contract.test.{ts,tsx}",
  "game/packages/**/src/**/*contract.test.{ts,tsx}",
  "game/stories/**/src/**/*contract.test.{ts,tsx}",
  "game/apps/**/src/**/*contract.test.{ts,tsx}",
  "engine/packages/base/src/authoring/**/*.test.{ts,tsx}",
  "engine/packages/base/src/testkit/**/*.test.{ts,tsx}",
]);
export const scriptsVitestIncludeV1 = Object.freeze(["scripts/**/*.test.ts"]);

export function classifyVitestProjectV1(input) {
  if (typeof input !== "string" || input.includes("\\") || input.split("/").includes(".."))
    return null;
  const path = input.replace(/^\.\//u, "");
  if (/^scripts\/.+\.test\.ts$/u.test(path)) return "scripts";
  if (
    !/^(?:engine\/packages|game\/(?:packages|stories|apps))\/[^/]+\/src\/.+\.test\.tsx?$/u.test(
      path,
    )
  )
    return null;
  if (/(?:\.|\/|-)property\.test\.tsx?$/u.test(path)) return "property";
  if (/(?:\.|-)contract\.test\.tsx?$/u.test(path)) return "contract";
  if (/^engine\/packages\/base\/src\/(?:authoring|testkit)\//u.test(path)) return "contract";
  return "unit";
}
