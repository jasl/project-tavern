export type VitestProjectNameV1 = "unit" | "contract" | "property" | "scripts";
export const workspaceVitestIncludeV1: readonly string[];
export const propertyVitestIncludeV1: readonly string[];
export const contractVitestIncludeV1: readonly string[];
export const scriptsVitestIncludeV1: readonly string[];
export function classifyVitestProjectV1(path: string): VitestProjectNameV1 | null;
