// SPDX-License-Identifier: MIT
export const workspaceVitestIncludeV1 = Object.freeze([
  "packages/**/src/**/*.test.{ts,tsx}",
  "stories/**/src/**/*.test.{ts,tsx}",
  "apps/**/src/**/*.test.{ts,tsx}",
]);
export const propertyVitestIncludeV1 = Object.freeze([
  "packages/**/src/**/*property.test.{ts,tsx}",
  "stories/**/src/**/*property.test.{ts,tsx}",
  "apps/**/src/**/*property.test.{ts,tsx}",
]);
export const contractVitestIncludeV1 = Object.freeze([
  "packages/**/src/**/*contract.test.{ts,tsx}",
  "stories/**/src/**/*contract.test.{ts,tsx}",
  "apps/**/src/**/*contract.test.{ts,tsx}",
  "packages/base/src/authoring/**/*.test.{ts,tsx}",
  "packages/base/src/testkit/**/*.test.{ts,tsx}",
]);
export const scriptsVitestIncludeV1 = Object.freeze(["scripts/**/*.test.ts"]);

export function classifyVitestProjectV1(input) {
  if (typeof input !== "string" || input.includes("\\") || input.split("/").includes(".."))
    return null;
  const path = input.replace(/^\.\//u, "");
  if (/^scripts\/.+\.test\.ts$/u.test(path)) return "scripts";
  if (!/^(?:packages|stories|apps)\/[^/]+\/src\/.+\.test\.tsx?$/u.test(path)) return null;
  if (/(?:\.|\/|-)property\.test\.tsx?$/u.test(path)) return "property";
  if (/(?:\.|-)contract\.test\.tsx?$/u.test(path)) return "contract";
  if (/^packages\/base\/src\/(?:authoring|testkit)\//u.test(path)) return "contract";
  return "unit";
}
