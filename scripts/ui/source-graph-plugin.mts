// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createRequire } from "node:module";
import { isAbsolute, posix, relative, resolve, sep } from "node:path";

import { parseAst } from "vite";
import type { Plugin } from "vite";

type ApplicationIdV1 = "e2e-web" | "poc-web";
type EdgeKindV1 = "dynamic" | "static";

interface ApplicationGraphCollectorInputV1 {
  readonly applicationId: ApplicationIdV1;
  readonly entry: string;
  readonly htmlEntry: string;
  readonly repositoryRoot: string;
}

interface ParsedModuleV1 {
  readonly dynamicImports: readonly string[];
  readonly id: string;
  readonly staticImports: readonly string[];
}

interface CanonicalJsonModuleV1 {
  canonicalJsonBytes(value: unknown): Uint8Array;
}

class ApplicationGraphCollectorErrorV1 extends TypeError {
  readonly code = "ui.application_graph_forbidden" as const;

  constructor(message: string) {
    super(`ui.application_graph_forbidden: ${message}`);
    this.name = "ApplicationGraphCollectorErrorV1";
  }
}

const requireFromPluginV1 = createRequire(import.meta.url);
const canonicalJsonModuleV1: unknown = requireFromPluginV1(
  "../../engine/packages/base/src/contracts/canonical-json.ts",
);
if (
  typeof canonicalJsonModuleV1 !== "object" ||
  canonicalJsonModuleV1 === null ||
  typeof Reflect.get(canonicalJsonModuleV1, "canonicalJsonBytes") !== "function"
) {
  throw new ApplicationGraphCollectorErrorV1("canonical JSON encoder is invalid");
}
const { canonicalJsonBytes } = canonicalJsonModuleV1 as CanonicalJsonModuleV1;

const applicationContractsV1 = Object.freeze({
  "e2e-web": Object.freeze({
    entry: "game/stories/e2e/src/application/entry.tsx",
    dynamicImports: Object.freeze([
      Object.freeze({
        importer: "game/stories/e2e/src/application/create-e2e-game-runtime.ts",
        specifier: "@project-tavern/story-e2e/tooling",
        target: "game/stories/e2e/src/tooling.ts",
      }),
      Object.freeze({
        importer: "game/stories/e2e/src/application/create-e2e-presentation-runtime.ts",
        specifier: "@project-tavern/story-e2e/tooling-ui",
        target: "game/stories/e2e/src/tooling-ui/index.ts",
      }),
    ]),
    htmlEntry: "game/stories/e2e/index.html",
    owningPackage: "@project-tavern/story-e2e",
    protectedRoots: Object.freeze([
      "game/stories/e2e/src/index.ts",
      "game/stories/e2e/src/tooling.ts",
    ]),
    storyRoot: "game/stories/e2e/",
    virtualIdentity: "virtual:project-tavern/e2e-build-identity",
  }),
  "poc-web": Object.freeze({
    entry: "game/stories/poc/src/application/entry.tsx",
    dynamicImports: Object.freeze([
      Object.freeze({
        importer: "game/stories/poc/src/application/create-poc-game-runtime.ts",
        specifier: "@project-tavern/story-poc/tooling",
        target: "game/stories/poc/src/tooling/index.ts",
      }),
      Object.freeze({
        importer: "game/stories/poc/src/application/create-poc-presentation-runtime.ts",
        specifier: "@project-tavern/story-poc/tooling-ui",
        target: "game/stories/poc/src/tooling-ui/index.ts",
      }),
    ]),
    htmlEntry: "game/stories/poc/index.html",
    owningPackage: "@project-tavern/story-poc",
    protectedRoots: Object.freeze([
      "game/stories/poc/src/index.ts",
      "game/stories/poc/src/story-definition.ts",
      "game/stories/poc/src/tooling/index.ts",
    ]),
    storyRoot: "game/stories/poc/",
    virtualIdentity: "virtual:project-tavern/poc-build-identity",
  }),
});

const workspaceOwnersV1 = Object.freeze([
  Object.freeze({ prefix: "engine/packages/base/", owningPackage: "@sillymaker/base" }),
  Object.freeze({ prefix: "engine/packages/ui/", owningPackage: "@sillymaker/ui" }),
  Object.freeze({ prefix: "engine/packages/web/", owningPackage: "@sillymaker/web" }),
  Object.freeze({ prefix: "game/packages/assets/", owningPackage: "@project-tavern/assets" }),
  Object.freeze({ prefix: "game/stories/e2e/", owningPackage: "@project-tavern/story-e2e" }),
  Object.freeze({ prefix: "game/stories/poc/", owningPackage: "@project-tavern/story-poc" }),
]);

const compareTextV1 = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function forbiddenV1(message: string): never {
  throw new ApplicationGraphCollectorErrorV1(message);
}

function requireNormalizedRelativePathV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) forbiddenV1(`${label} is invalid`);
  if (value.includes("\\") || isAbsolute(value)) forbiddenV1(`${label} is not relative`);
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    forbiddenV1(`${label} is not normalized`);
  }
  return value;
}

function validateOutputPathV1(value: string, label: string): string {
  const normalized = requireNormalizedRelativePathV1(value, label);
  if (normalized.includes("?") || normalized.includes("#")) {
    forbiddenV1(`${label} contains a query or fragment`);
  }
  if (normalized.endsWith(".map")) forbiddenV1(`${label} is a source map`);
  const segmentFramed = `/${normalized}/`;
  if (segmentFramed.includes("/references/") || segmentFramed.includes("/art-source/aigc/")) {
    forbiddenV1(`${label} enters a forbidden source tree`);
  }
  return normalized;
}

const sourceMapDirectivePatternV1 = /(?:\/\/|\/\*)\s*[@#]\s*sourceMappingURL\s*=/u;

function containsSourceMapDirectiveV1(value: unknown): boolean {
  if (typeof value === "string") return sourceMapDirectivePatternV1.test(value);
  if (value instanceof Uint8Array) {
    return sourceMapDirectivePatternV1.test(new TextDecoder().decode(value));
  }
  return false;
}

function packageNameFromNodeModulesV1(id: string): string {
  const marker = "node_modules/";
  const markerIndex = id.lastIndexOf(marker);
  if (markerIndex < 0) forbiddenV1(`invalid package module ID ${id}`);
  const path = id.slice(markerIndex + marker.length);
  const segments = path.split("/");
  const first = segments[0];
  if (first === undefined || first.length === 0) forbiddenV1(`invalid package module ID ${id}`);
  if (!first.startsWith("@")) return first;
  const second = segments[1];
  if (second === undefined || second.length === 0) forbiddenV1(`invalid package module ID ${id}`);
  return `${first}/${second}`;
}

function virtualModuleV1(
  id: string,
  application: (typeof applicationContractsV1)[ApplicationIdV1],
): { readonly id: string; readonly owningPackage: string } {
  const value = id.startsWith("\0") ? id.slice(1) : id;
  if (value === application.virtualIdentity) {
    return Object.freeze({ id: value, owningPackage: application.owningPackage });
  }
  const viteValue = value.startsWith("virtual:vite/") ? value.slice("virtual:".length) : value;
  if (viteValue === "vite/modulepreload-polyfill.js" || viteValue === "vite/preload-helper.js") {
    return Object.freeze({ id: `virtual:${viteValue}`, owningPackage: "vite" });
  }
  if (
    value === "rolldown/runtime" ||
    value === "rolldown/runtime.js" ||
    value === "virtual:rolldown/runtime"
  ) {
    return Object.freeze({ id: "virtual:rolldown/runtime", owningPackage: "rolldown" });
  }
  return forbiddenV1(`unknown virtual module ${JSON.stringify(value)}`);
}

function normalizeModuleV1(
  inputId: string,
  repositoryRoot: string,
  application: (typeof applicationContractsV1)[ApplicationIdV1],
): { readonly id: string; readonly owningPackage: string } {
  if (inputId.includes("\\")) forbiddenV1("module ID contains a backslash");
  if (inputId.includes("?") || inputId.includes("#")) {
    forbiddenV1("module ID contains a query or fragment");
  }
  if (inputId.startsWith("\0") || inputId.startsWith("virtual:")) {
    return virtualModuleV1(inputId, application);
  }

  if (!isAbsolute(inputId)) forbiddenV1(`module ID is not absolute: ${inputId}`);
  const absoluteId = resolve(inputId);
  const relativeId = relative(repositoryRoot, absoluteId);
  if (
    relativeId.length === 0 ||
    relativeId === ".." ||
    relativeId.startsWith(`..${sep}`) ||
    isAbsolute(relativeId)
  ) {
    forbiddenV1(`module escaped the repository: ${inputId}`);
  }
  const normalized = relativeId.split(sep).join("/");
  requireNormalizedRelativePathV1(normalized, "module ID");
  if (normalized.startsWith("references/") || normalized.startsWith("art-source/aigc/")) {
    forbiddenV1(`module enters a forbidden source tree: ${normalized}`);
  }

  if (normalized.includes("node_modules/")) {
    const owningPackage = packageNameFromNodeModulesV1(normalized);
    if (owningPackage.startsWith("@project-tavern/") || owningPackage.startsWith("@sillymaker/")) {
      forbiddenV1(`internal package entered through node_modules: ${normalized}`);
    }
    return Object.freeze({
      id: normalized,
      owningPackage,
    });
  }
  const owner = workspaceOwnersV1.find(({ prefix }) => normalized.startsWith(prefix));
  if (owner === undefined) forbiddenV1(`module has no owning package: ${normalized}`);
  return Object.freeze({ id: normalized, owningPackage: owner.owningPackage });
}

function sourceLanguageV1(id: string): "js" | "jsx" | "ts" | "tsx" | undefined {
  if (id.endsWith(".tsx")) return "tsx";
  if (id.endsWith(".ts") || id.endsWith(".mts")) return "ts";
  if (id.endsWith(".jsx")) return "jsx";
  if (id.endsWith(".js") || id.endsWith(".mjs") || id.endsWith(".cjs") || id.startsWith("\0")) {
    return "js";
  }
  return undefined;
}

function collectLiteralDynamicSpecifiersV1(
  code: string,
  id: string,
  allowStaticTemplate = false,
): readonly string[] {
  const language = sourceLanguageV1(id);
  if (language === undefined) return Object.freeze([]);
  const ast = parseAst(code, { lang: language, sourceType: "module" }, id);
  const specifiers = new Set<string>();
  const visited = new WeakSet<object>();

  function visit(value: unknown): void {
    if (value === null || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.type === "ImportExpression") {
      const source = record.source;
      const literalValue =
        typeof source === "object" &&
        source !== null &&
        Reflect.get(source, "type") === "Literal" &&
        typeof Reflect.get(source, "value") === "string"
          ? Reflect.get(source, "value")
          : undefined;
      const templateExpressions =
        typeof source === "object" && source !== null
          ? Reflect.get(source, "expressions")
          : undefined;
      const templateQuasis =
        typeof source === "object" && source !== null ? Reflect.get(source, "quasis") : undefined;
      const staticTemplateValue =
        allowStaticTemplate &&
        typeof source === "object" &&
        source !== null &&
        Reflect.get(source, "type") === "TemplateLiteral" &&
        Array.isArray(templateExpressions) &&
        templateExpressions.length === 0 &&
        Array.isArray(templateQuasis) &&
        templateQuasis.length === 1
          ? Reflect.get(Reflect.get(templateQuasis[0], "value") as object, "cooked")
          : undefined;
      const specifier =
        typeof literalValue === "string"
          ? literalValue
          : typeof staticTemplateValue === "string"
            ? staticTemplateValue
            : undefined;
      if (specifier === undefined) {
        const start = typeof record.start === "number" ? Math.max(0, record.start - 80) : 0;
        const end =
          typeof record.end === "number" ? Math.min(code.length, record.end + 80) : code.length;
        forbiddenV1(
          `nonliteral dynamic import in ${id}: ${JSON.stringify(code.slice(start, end))}`,
        );
      }
      if (specifier.length === 0 || specifier.includes("\\")) {
        forbiddenV1(`invalid dynamic import in ${id}`);
      }
      specifiers.add(specifier);
    }
    for (const child of Object.values(record)) visit(child);
  }

  visit(ast);
  return Object.freeze([...specifiers].sort(compareTextV1));
}

interface FinalChunkImportsV1 {
  readonly dynamicImports: readonly string[];
  readonly staticImports: readonly string[];
}

function literalImportSourceV1(source: unknown, allowStaticTemplate: boolean): string | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  if (Reflect.get(source, "type") === "Literal") {
    const value = Reflect.get(source, "value");
    return typeof value === "string" ? value : undefined;
  }
  const expressions = Reflect.get(source, "expressions");
  const quasis = Reflect.get(source, "quasis");
  if (
    allowStaticTemplate &&
    Reflect.get(source, "type") === "TemplateLiteral" &&
    Array.isArray(expressions) &&
    expressions.length === 0 &&
    Array.isArray(quasis) &&
    quasis.length === 1
  ) {
    const value = Reflect.get(Reflect.get(quasis[0], "value") as object, "cooked");
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function normalizeFinalChunkImportV1(
  specifier: string,
  chunkFileName: string,
  label: string,
): string {
  if (
    specifier.length === 0 ||
    specifier.includes("\\") ||
    specifier.includes("?") ||
    specifier.includes("#") ||
    specifier.startsWith("//") ||
    /^[A-Za-z][A-Za-z\d+.-]*:/u.test(specifier) ||
    posix.isAbsolute(specifier) ||
    (!specifier.startsWith("./") && !specifier.startsWith("../"))
  ) {
    forbiddenV1(`${label} in ${chunkFileName} is not a relative chunk path`);
  }
  const normalized = posix.normalize(posix.join(posix.dirname(chunkFileName), specifier));
  if (normalized === ".." || normalized.startsWith("../") || posix.isAbsolute(normalized)) {
    forbiddenV1(`${label} in ${chunkFileName} escapes the bundle`);
  }
  return validateOutputPathV1(normalized, `${label} in ${chunkFileName}`);
}

function collectFinalChunkImportsV1(code: string, chunkFileName: string): FinalChunkImportsV1 {
  const ast = parseAst(code, { lang: "js", sourceType: "module" }, chunkFileName);
  const staticImports = new Set<string>();
  const dynamicImports = new Set<string>();
  const visited = new WeakSet<object>();

  function addImportV1(
    destination: Set<string>,
    source: unknown,
    label: string,
    allowStaticTemplate: boolean,
  ): void {
    const specifier = literalImportSourceV1(source, allowStaticTemplate);
    if (specifier === undefined) forbiddenV1(`nonliteral ${label} in ${chunkFileName}`);
    destination.add(normalizeFinalChunkImportV1(specifier, chunkFileName, label));
  }

  function visit(value: unknown): void {
    if (value === null || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.type === "ImportDeclaration") {
      addImportV1(staticImports, node.source, "static import", false);
    } else if (
      (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
      node.source != null
    ) {
      addImportV1(staticImports, node.source, "static export", false);
    } else if (node.type === "ImportExpression") {
      addImportV1(dynamicImports, node.source, "dynamic import", true);
    }
    for (const child of Object.values(node)) visit(child);
  }

  visit(ast);
  return Object.freeze({
    staticImports: Object.freeze([...staticImports].sort(compareTextV1)),
    dynamicImports: Object.freeze([...dynamicImports].sort(compareTextV1)),
  });
}

function assertExactChunkImportMetadataV1(
  codeImports: readonly string[],
  metadataImports: readonly string[],
  chunkFileName: string,
  kind: EdgeKindV1,
): void {
  const normalizedMetadata = [...new Set(metadataImports)].sort(compareTextV1);
  if (
    normalizedMetadata.length !== metadataImports.length ||
    normalizedMetadata.length !== codeImports.length ||
    normalizedMetadata.some((value, index) => value !== codeImports[index])
  ) {
    forbiddenV1(`${kind} import metadata does not match final code in ${chunkFileName}`);
  }
}

// Any unbound capitalized value is rejected unless it belongs to this closed
// ECMAScript/TypeScript/Node-safe set. This makes newly added DOM constructors
// fail closed instead of relying on an inevitably incomplete DOM denylist.
const nodeSafeCapitalizedGlobalNamesV1 = new Set([
  "AbortController",
  "AbortSignal",
  "AggregateError",
  "Array",
  "ArrayBuffer",
  "ArrayLike",
  "AsyncDisposable",
  "AsyncDisposableStack",
  "AsyncGenerator",
  "AsyncGeneratorFunction",
  "AsyncIterable",
  "AsyncIterableIterator",
  "AsyncIterator",
  "Atomics",
  "Awaited",
  "BigInt",
  "BigInt64Array",
  "BigUint64Array",
  "Boolean",
  "Buffer",
  "BufferSource",
  "Capitalize",
  "ConstructorParameters",
  "DataView",
  "Date",
  "Disposable",
  "DisposableStack",
  "EncodeIntoResult",
  "Error",
  "ErrorConstructor",
  "ErrorOptions",
  "EvalError",
  "Exclude",
  "Extract",
  "FinalizationRegistry",
  "File",
  "Float16Array",
  "Float32Array",
  "Float64Array",
  "Function",
  "Generator",
  "GeneratorFunction",
  "GeneratorFunctionConstructor",
  "ImportCallOptions",
  "ImportMeta",
  "InstanceType",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Intl",
  "Iterator",
  "IteratorObject",
  "JSON",
  "Lowercase",
  "Map",
  "Math",
  "NewableFunction",
  "NoInfer",
  "NonNullable",
  "Number",
  "Object",
  "Omit",
  "OmitThisParameter",
  "Parameters",
  "Partial",
  "Pick",
  "Promise",
  "PromiseConstructor",
  "PromiseLike",
  "PropertyDescriptor",
  "PropertyDescriptorMap",
  "PropertyKey",
  "Proxy",
  "RangeError",
  "Readonly",
  "ReadonlyArray",
  "ReadonlyMap",
  "ReadonlySet",
  "Record",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "RegExpExecArray",
  "RegExpMatchArray",
  "Required",
  "ReturnType",
  "Set",
  "SharedArrayBuffer",
  "String",
  "Symbol",
  "SyntaxError",
  "TemplateStringsArray",
  "TextDecoder",
  "TextEncoder",
  "ThisParameterType",
  "ThisType",
  "TypeError",
  "URIError",
  "URL",
  "URLSearchParams",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uncapitalize",
  "Uppercase",
  "WeakMap",
  "WeakRef",
  "WeakSet",
  "WebAssembly",
]);

const browserGlobalNamesV1 = new Set([
  "Audio",
  "CSSStyleSheet",
  "CanvasRenderingContext2D",
  "DOMParser",
  "Document",
  "DocumentFragment",
  "Element",
  "EventTarget",
  "FocusEvent",
  "HTMLAnchorElement",
  "HTMLButtonElement",
  "HTMLCanvasElement",
  "HTMLDialogElement",
  "HTMLDivElement",
  "HTMLFormElement",
  "HTMLIFrameElement",
  "HTMLImageElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "HTMLVideoElement",
  "HTMLElement",
  "Image",
  "IntersectionObserver",
  "KeyboardEvent",
  "MediaQueryList",
  "MouseEvent",
  "MutationObserver",
  "Node",
  "NodeList",
  "PointerEvent",
  "Path2D",
  "Range",
  "ResizeObserver",
  "SVGElement",
  "ShadowRoot",
  "TouchEvent",
  "WheelEvent",
  "Window",
  "XMLSerializer",
  "alert",
  "blur",
  "cancelAnimationFrame",
  "cancelIdleCallback",
  "close",
  "confirm",
  "createImageBitmap",
  "customElements",
  "devicePixelRatio",
  "dispatchEvent",
  "document",
  "fetch",
  "frames",
  "getComputedStyle",
  "history",
  "innerHeight",
  "innerWidth",
  "indexedDB",
  "length",
  "localStorage",
  "location",
  "matchMedia",
  "name",
  "navigator",
  "open",
  "opener",
  "origin",
  "outerHeight",
  "outerWidth",
  "parent",
  "postMessage",
  "print",
  "prompt",
  "requestAnimationFrame",
  "requestIdleCallback",
  "screen",
  "scroll",
  "scrollBy",
  "scrollTo",
  "scrollX",
  "scrollY",
  "self",
  "sessionStorage",
  "top",
  "visualViewport",
  "window",
]);

const browserConstructorPatternV1 =
  /^(?:(?:HTML|SVG)[A-Z][A-Za-z0-9]*(?:Element|Collection)|(?:DOM|CSS|Canvas|WebGL)[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*(?:Event|Observer))$/u;

function isBrowserGlobalNameV1(name: string, failClosedCapitalized: boolean): boolean {
  return (
    browserGlobalNamesV1.has(name) ||
    browserConstructorPatternV1.test(name) ||
    (failClosedCapitalized && /^[A-Z]/u.test(name) && !nodeSafeCapitalizedGlobalNamesV1.has(name))
  );
}

interface LexicalScopeV1 {
  readonly bindings: Set<string>;
  readonly parent: LexicalScopeV1 | null;
}

function collectBindingPatternV1(value: unknown, bindings: Set<string>): void {
  if (value === null || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  if (node.type === "Identifier" && typeof node.name === "string") {
    bindings.add(node.name);
    return;
  }
  if (node.type === "RestElement") {
    collectBindingPatternV1(node.argument, bindings);
    return;
  }
  if (node.type === "AssignmentPattern") {
    collectBindingPatternV1(node.left, bindings);
    return;
  }
  if (node.type === "ArrayPattern" && Array.isArray(node.elements)) {
    for (const element of node.elements) collectBindingPatternV1(element, bindings);
    return;
  }
  if (node.type === "ObjectPattern" && Array.isArray(node.properties)) {
    for (const property of node.properties) {
      if (typeof property !== "object" || property === null) continue;
      const propertyNode = property as Record<string, unknown>;
      collectBindingPatternV1(
        propertyNode.type === "RestElement" ? propertyNode.argument : propertyNode.value,
        bindings,
      );
    }
    return;
  }
  if (node.type === "TSParameterProperty") collectBindingPatternV1(node.parameter, bindings);
}

function collectDeclarationBindingsV1(value: unknown, bindings: Set<string>): void {
  if (value === null || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    collectDeclarationBindingsV1(node.declaration, bindings);
    return;
  }
  if (node.type === "VariableDeclaration" && Array.isArray(node.declarations)) {
    if (node.kind === "var") return;
    for (const declaration of node.declarations) {
      if (typeof declaration === "object" && declaration !== null) {
        collectBindingPatternV1(Reflect.get(declaration, "id"), bindings);
      }
    }
    return;
  }
  if (node.type === "ImportDeclaration" && Array.isArray(node.specifiers)) {
    for (const specifier of node.specifiers) {
      if (typeof specifier === "object" && specifier !== null) {
        collectBindingPatternV1(Reflect.get(specifier, "local"), bindings);
      }
    }
    return;
  }
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "ClassDeclaration" ||
    node.type === "TSTypeAliasDeclaration" ||
    node.type === "TSInterfaceDeclaration" ||
    node.type === "TSEnumDeclaration" ||
    node.type === "TSModuleDeclaration"
  ) {
    collectBindingPatternV1(node.id, bindings);
  }
}

function collectHoistedVariableBindingsV1(
  value: unknown,
  bindings: Set<string>,
  root = true,
): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectHoistedVariableBindingsV1(item, bindings, false);
    return;
  }
  const node = value as Record<string, unknown>;
  if (
    !root &&
    (node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression" ||
      node.type === "StaticBlock")
  ) {
    return;
  }
  if (node.type === "VariableDeclaration" && node.kind === "var") {
    if (Array.isArray(node.declarations)) {
      for (const declaration of node.declarations) {
        if (typeof declaration === "object" && declaration !== null) {
          collectBindingPatternV1(Reflect.get(declaration, "id"), bindings);
        }
      }
    }
    return;
  }
  for (const child of Object.values(node)) {
    collectHoistedVariableBindingsV1(child, bindings, false);
  }
}

function isBoundInScopeV1(name: string, scope: LexicalScopeV1): boolean {
  let current: LexicalScopeV1 | null = scope;
  while (current !== null) {
    if (current.bindings.has(name)) return true;
    current = current.parent;
  }
  return false;
}

function isNonReferenceIdentifierV1(parent: Record<string, unknown> | null, key: string): boolean {
  if (parent === null) return false;
  const type = parent.type;
  if (
    key === "property" &&
    parent.computed !== true &&
    (type === "MemberExpression" || type === "OptionalMemberExpression")
  ) {
    return true;
  }
  if (
    key === "key" &&
    parent.computed !== true &&
    (type === "Property" ||
      type === "MethodDefinition" ||
      type === "PropertyDefinition" ||
      type === "AccessorProperty" ||
      type === "TSPropertySignature" ||
      type === "TSMethodSignature")
  ) {
    return true;
  }
  if (type === "TSQualifiedName" && key === "right") return true;
  if (
    (type === "ImportSpecifier" && key === "imported") ||
    (type === "ExportSpecifier" && (key === "exported" || key === "local")) ||
    (type === "ExportAllDeclaration" && key === "exported")
  ) {
    return true;
  }
  if (type === "MetaProperty") return true;
  if (
    (key === "id" &&
      (type === "VariableDeclarator" ||
        type === "FunctionDeclaration" ||
        type === "FunctionExpression" ||
        type === "ClassDeclaration" ||
        type === "ClassExpression" ||
        type === "TSTypeAliasDeclaration" ||
        type === "TSInterfaceDeclaration" ||
        type === "TSEnumDeclaration" ||
        type === "TSModuleDeclaration")) ||
    (key === "local" &&
      (type === "ImportSpecifier" ||
        type === "ImportDefaultSpecifier" ||
        type === "ImportNamespaceSpecifier")) ||
    (key === "params" &&
      (type === "FunctionDeclaration" ||
        type === "FunctionExpression" ||
        type === "ArrowFunctionExpression")) ||
    (key === "param" && type === "CatchClause") ||
    (key === "argument" && (type === "RestElement" || type === "TSParameterProperty")) ||
    (key === "left" && type === "AssignmentPattern") ||
    type === "ArrayPattern" ||
    type === "ObjectPattern"
  ) {
    return true;
  }
  if (
    (type === "LabeledStatement" || type === "BreakStatement" || type === "ContinueStatement") &&
    key === "label"
  ) {
    return true;
  }
  return false;
}

function collectBrowserGlobalsV1(
  code: string,
  id: string,
  failClosedCapitalized: boolean,
): readonly string[] {
  const language = sourceLanguageV1(id);
  if (language === undefined) return Object.freeze([]);
  const ast = parseAst(code, { lang: language, sourceType: "module" }, id);
  const globals = new Set<string>();

  function scan(
    value: unknown,
    inheritedScope: LexicalScopeV1 | null,
    parent: Record<string, unknown> | null = null,
    key = "",
  ): void {
    if (value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) scan(item, inheritedScope, parent, key);
      return;
    }
    const node = value as Record<string, unknown>;
    const type = node.type;
    const createsScope =
      type === "Program" ||
      type === "BlockStatement" ||
      type === "StaticBlock" ||
      type === "FunctionDeclaration" ||
      type === "FunctionExpression" ||
      type === "ArrowFunctionExpression" ||
      type === "CatchClause" ||
      type === "ForStatement" ||
      type === "ForInStatement" ||
      type === "ForOfStatement";
    const scope: LexicalScopeV1 = createsScope
      ? { bindings: new Set<string>(), parent: inheritedScope }
      : (inheritedScope ?? { bindings: new Set<string>(), parent: null });

    if (createsScope) {
      if (type === "Program" || type === "StaticBlock") {
        collectHoistedVariableBindingsV1(node, scope.bindings);
      }
      if (
        (type === "Program" || type === "BlockStatement" || type === "StaticBlock") &&
        Array.isArray(node.body)
      ) {
        for (const declaration of node.body) {
          collectDeclarationBindingsV1(declaration, scope.bindings);
        }
      }
      if (
        type === "FunctionDeclaration" ||
        type === "FunctionExpression" ||
        type === "ArrowFunctionExpression"
      ) {
        collectBindingPatternV1(node.id, scope.bindings);
        collectHoistedVariableBindingsV1(node.body, scope.bindings);
        if (Array.isArray(node.params)) {
          for (const parameter of node.params) {
            collectBindingPatternV1(parameter, scope.bindings);
          }
        }
      }
      if (type === "CatchClause") collectBindingPatternV1(node.param, scope.bindings);
      if (type === "ForStatement") collectDeclarationBindingsV1(node.init, scope.bindings);
      if (type === "ForInStatement" || type === "ForOfStatement") {
        collectDeclarationBindingsV1(node.left, scope.bindings);
      }
    }

    if (
      type === "Identifier" &&
      typeof node.name === "string" &&
      isBrowserGlobalNameV1(node.name, failClosedCapitalized) &&
      !isBoundInScopeV1(node.name, scope) &&
      !isNonReferenceIdentifierV1(parent, key)
    ) {
      globals.add(node.name);
    }
    if (
      (type === "MemberExpression" || type === "OptionalMemberExpression") &&
      typeof node.object === "object" &&
      node.object !== null &&
      Reflect.get(node.object, "type") === "Identifier" &&
      Reflect.get(node.object, "name") === "globalThis" &&
      !isBoundInScopeV1("globalThis", scope)
    ) {
      const property = node.property;
      const name =
        typeof property === "object" && property !== null
          ? Reflect.get(property, "type") === "Identifier"
            ? Reflect.get(property, "name")
            : Reflect.get(property, "value")
          : undefined;
      if (typeof name === "string" && isBrowserGlobalNameV1(name, failClosedCapitalized)) {
        globals.add(name);
      }
    }
    for (const [childKey, child] of Object.entries(node)) {
      scan(child, scope, node, childKey);
    }
  }

  scan(ast, null);
  return Object.freeze([...globals].sort(compareTextV1));
}

function edgeKeyV1(from: string, kind: EdgeKindV1, to: string): string {
  return `${from}\0${kind}\0${to}`;
}

function isApprovedNodeSafeBrowserProbeV1(moduleId: string, globals: ReadonlySet<string>): boolean {
  // Pinned Zod guards this optional Cloudflare probe with `typeof navigator`; it is Node-safe.
  return (
    moduleId === "node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js" &&
    globals.size === 1 &&
    globals.has("navigator")
  );
}

const approvedZodModuleV1 = "node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js";
const approvedZodFinalProbeV1 =
  "typeof navigator<`u`&&navigator?.userAgent?.includes(`Cloudflare`)";

function isApprovedFinalNodeSafeBrowserProbeV1(
  code: string,
  moduleIds: readonly string[],
  globals: ReadonlySet<string>,
): boolean {
  if (globals.size !== 1 || !globals.has("navigator") || !moduleIds.includes(approvedZodModuleV1)) {
    return false;
  }
  const probeIndex = code.indexOf(approvedZodFinalProbeV1);
  if (probeIndex < 0 || code.indexOf(approvedZodFinalProbeV1, probeIndex + 1) >= 0) return false;
  return (code.match(/\bnavigator\b/gu) ?? []).length === 2;
}

/** Collects one closed Story application graph and emits its canonical build evidence. */
export function collectApplicationGraphV1(input: ApplicationGraphCollectorInputV1): Plugin {
  if (typeof input !== "object" || input === null) forbiddenV1("collector input is invalid");
  const application = applicationContractsV1[input.applicationId];
  if (application === undefined) forbiddenV1("application ID is invalid");
  if (
    typeof input.repositoryRoot !== "string" ||
    !isAbsolute(input.repositoryRoot) ||
    input.repositoryRoot.includes("\\")
  ) {
    forbiddenV1("repository root is invalid");
  }
  const repositoryRoot = resolve(input.repositoryRoot);
  const htmlEntry = requireNormalizedRelativePathV1(input.htmlEntry, "HTML entry");
  const entry = requireNormalizedRelativePathV1(input.entry, "application entry");
  if (htmlEntry !== application.htmlEntry || entry !== application.entry) {
    forbiddenV1("application root contract does not match the selected application");
  }

  const parsedModules = new Map<string, ParsedModuleV1>();
  const dynamicSpecifiersByModule = new Map<string, Set<string>>();
  const browserGlobalsByModule = new Map<string, Set<string>>();

  function recordSourceAnalysisV1(
    moduleId: string,
    code: string,
    sourceId: string,
    failClosedCapitalized: boolean,
  ): void {
    const specifiers = collectLiteralDynamicSpecifiersV1(code, sourceId);
    if (specifiers.length > 0) {
      const collected = dynamicSpecifiersByModule.get(moduleId) ?? new Set<string>();
      for (const specifier of specifiers) collected.add(specifier);
      dynamicSpecifiersByModule.set(moduleId, collected);
    }
    const browserGlobals = collectBrowserGlobalsV1(code, sourceId, failClosedCapitalized);
    if (browserGlobals.length > 0) {
      const collected = browserGlobalsByModule.get(moduleId) ?? new Set<string>();
      for (const global of browserGlobals) collected.add(global);
      browserGlobalsByModule.set(moduleId, collected);
      if (application.protectedRoots.includes(moduleId)) {
        forbiddenV1(
          `Node-safe root ${moduleId} uses browser globals: ${browserGlobals.join(", ")}`,
        );
      }
    }
  }

  return {
    name: `project-tavern-${input.applicationId}-source-graph`,
    apply: "build",
    resolveId: {
      order: "pre",
      handler(source) {
        if (source.includes("\\")) forbiddenV1(`import specifier contains a backslash: ${source}`);
        return null;
      },
    },
    load: {
      order: "pre",
      handler(id) {
        normalizeModuleV1(id, repositoryRoot, application);
        return null;
      },
    },
    transform: {
      order: "pre",
      async handler(code, id) {
        const module = normalizeModuleV1(id, repositoryRoot, application);
        recordSourceAnalysisV1(module.id, code, id, false);
        return null;
      },
    },
    moduleParsed(info) {
      const module = normalizeModuleV1(info.id, repositoryRoot, application);
      const finalCode = Reflect.get(info, "code");
      if (typeof finalCode === "string") {
        recordSourceAnalysisV1(module.id, finalCode, info.id, true);
      }
      const staticImports = info.importedIds.map(
        (id) => normalizeModuleV1(id, repositoryRoot, application).id,
      );
      const dynamicImports = info.dynamicallyImportedIds.map(
        (id) => normalizeModuleV1(id, repositoryRoot, application).id,
      );
      parsedModules.set(
        module.id,
        Object.freeze({
          id: module.id,
          staticImports: Object.freeze([...new Set(staticImports)].sort(compareTextV1)),
          dynamicImports: Object.freeze([...new Set(dynamicImports)].sort(compareTextV1)),
        }),
      );
    },
    renderChunk: {
      order: "post",
      handler(code, chunk) {
        validateOutputPathV1(chunk.fileName, "rendered chunk filename");
        for (const importPath of chunk.imports) {
          validateOutputPathV1(importPath, "rendered chunk import");
        }
        for (const importPath of chunk.dynamicImports) {
          validateOutputPathV1(importPath, "rendered chunk dynamic import");
        }
        collectLiteralDynamicSpecifiersV1(code, chunk.fileName, true);
        return null;
      },
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const bundleOutputs = Object.values(bundle);
        const chunkOutputs = bundleOutputs.filter((output) => output.type === "chunk");
        const chunksByFileName = new Map(chunkOutputs.map((chunk) => [chunk.fileName, chunk]));
        if (chunksByFileName.size !== chunkOutputs.length) {
          forbiddenV1("bundle contains duplicate chunk filenames");
        }
        for (const output of bundleOutputs) {
          validateOutputPathV1(output.fileName, "bundle output");
        }
        if (bundleOutputs.some(({ fileName }) => fileName === "source-graph.v1.json")) {
          forbiddenV1("bundle already contains source-graph.v1.json");
        }
        const htmlOutputs = bundleOutputs.filter(({ fileName }) => fileName.endsWith(".html"));
        if (htmlOutputs.length !== 1 || htmlOutputs[0]?.fileName !== "index.html") {
          forbiddenV1("bundle must contain exactly one index.html application root");
        }
        for (const output of bundleOutputs) {
          if (output.type === "asset" && containsSourceMapDirectiveV1(output.source)) {
            forbiddenV1(`asset contains source-map directive: ${output.fileName}`);
          }
          if (
            output.type === "chunk" &&
            (Reflect.get(output, "map") != null || Reflect.get(output, "sourcemapFileName") != null)
          ) {
            forbiddenV1(`chunk contains source-map metadata: ${output.fileName}`);
          }
          if (output.type === "chunk") {
            const staticMetadata = output.imports.map((importPath) =>
              validateOutputPathV1(importPath, "static import metadata"),
            );
            const dynamicMetadata = output.dynamicImports.map((importPath) =>
              validateOutputPathV1(importPath, "dynamic import metadata"),
            );
            if (containsSourceMapDirectiveV1(output.code)) {
              forbiddenV1(`chunk contains source-map directive: ${output.fileName}`);
            }
            const codeImports = collectFinalChunkImportsV1(output.code, output.fileName);
            assertExactChunkImportMetadataV1(
              codeImports.staticImports,
              staticMetadata,
              output.fileName,
              "static",
            );
            assertExactChunkImportMetadataV1(
              codeImports.dynamicImports,
              dynamicMetadata,
              output.fileName,
              "dynamic",
            );
          }
        }

        const toolingContract = application.dynamicImports.find(({ specifier }) =>
          specifier.endsWith("/tooling"),
        );
        if (toolingContract === undefined) forbiddenV1("fixed tooling contract is missing");
        const toolingFacadeChunks = chunkOutputs.filter((chunk) => {
          if (chunk.facadeModuleId === null) return false;
          return (
            normalizeModuleV1(chunk.facadeModuleId, repositoryRoot, application).id ===
            toolingContract.target
          );
        });
        if (toolingFacadeChunks.length > 1) {
          forbiddenV1("fixed tooling export has multiple facade chunks");
        }
        const toolingFacadeChunk = toolingFacadeChunks[0];
        if (toolingFacadeChunk !== undefined) {
          const pendingToolingChunks = [toolingFacadeChunk.fileName];
          const visitedToolingChunks = new Set<string>();
          while (pendingToolingChunks.length > 0) {
            const fileName = pendingToolingChunks.shift();
            if (fileName === undefined || visitedToolingChunks.has(fileName)) continue;
            const chunk = chunksByFileName.get(fileName);
            if (chunk === undefined) {
              forbiddenV1(`fixed tooling chunk closure is missing ${fileName}`);
            }
            visitedToolingChunks.add(fileName);
            const browserGlobals = new Set(
              collectBrowserGlobalsV1(chunk.code, chunk.fileName, true),
            );
            const rawModules = Reflect.get(chunk, "modules");
            const moduleIds =
              typeof rawModules === "object" && rawModules !== null
                ? Object.keys(rawModules).map(
                    (id) => normalizeModuleV1(id, repositoryRoot, application).id,
                  )
                : [];
            if (
              browserGlobals.size > 0 &&
              !isApprovedFinalNodeSafeBrowserProbeV1(chunk.code, moduleIds, browserGlobals)
            ) {
              forbiddenV1(
                `final tooling chunk ${fileName} uses browser globals: ${[...browserGlobals]
                  .sort(compareTextV1)
                  .join(", ")}`,
              );
            }
            pendingToolingChunks.push(...chunk.imports, ...chunk.dynamicImports);
          }
        }

        const htmlModule = parsedModules.get(htmlEntry);
        if (htmlModule === undefined) forbiddenV1(`missing HTML root ${htmlEntry}`);
        const reachable = new Set<string>();
        const pending: string[] = [htmlEntry];
        const edgesByKey = new Map<
          string,
          { readonly from: string; readonly kind: EdgeKindV1; readonly to: string }
        >();
        while (pending.length > 0) {
          const from = pending.shift();
          if (from === undefined || reachable.has(from)) continue;
          const module = parsedModules.get(from);
          if (module === undefined) forbiddenV1(`graph is missing resolved module ${from}`);
          reachable.add(from);
          for (const [kind, imports] of [
            ["static", module.staticImports],
            ["dynamic", module.dynamicImports],
          ] as const) {
            for (const to of imports) {
              if (!parsedModules.has(to)) forbiddenV1(`graph is missing imported module ${to}`);
              edgesByKey.set(edgeKeyV1(from, kind, to), Object.freeze({ from, kind, to }));
              pending.push(to);
            }
          }
        }

        if (!reachable.has(entry)) forbiddenV1(`application entry is unreachable: ${entry}`);
        const htmlRoots = [...reachable].filter((id) => id.endsWith(".html"));
        if (htmlRoots.length !== 1 || htmlRoots[0] !== htmlEntry) {
          forbiddenV1("application graph contains a third HTML root");
        }

        const otherStoryRoot =
          input.applicationId === "e2e-web"
            ? applicationContractsV1["poc-web"].storyRoot
            : applicationContractsV1["e2e-web"].storyRoot;
        for (const id of reachable) {
          if (id.startsWith(otherStoryRoot))
            forbiddenV1(`application imports another Story: ${id}`);
        }
        for (const edge of edgesByKey.values()) {
          if (edge.from.startsWith("engine/packages/web/") && edge.to.startsWith("game/stories/")) {
            forbiddenV1(`@sillymaker/web imports a Story: ${edge.to}`);
          }
        }

        for (const contract of application.dynamicImports) {
          const module = parsedModules.get(contract.importer);
          if (module === undefined || !reachable.has(contract.importer)) {
            forbiddenV1(`missing fixed tooling importer ${contract.importer}`);
          }
          const specifiers = [...(dynamicSpecifiersByModule.get(contract.importer) ?? [])].sort(
            compareTextV1,
          );
          if (specifiers.length !== 1 || specifiers[0] !== contract.specifier) {
            forbiddenV1(`fixed tooling specifier changed in ${contract.importer}`);
          }
          if (module.dynamicImports.length !== 1 || module.dynamicImports[0] !== contract.target) {
            forbiddenV1(`fixed tooling target changed in ${contract.importer}`);
          }
        }

        for (const protectedRoot of application.protectedRoots) {
          if (!reachable.has(protectedRoot)) continue;
          const protectedReachable = new Set<string>();
          const protectedPending = [protectedRoot];
          while (protectedPending.length > 0) {
            const moduleId = protectedPending.shift();
            if (moduleId === undefined || protectedReachable.has(moduleId)) continue;
            protectedReachable.add(moduleId);
            const browserGlobals = browserGlobalsByModule.get(moduleId);
            if (
              browserGlobals !== undefined &&
              browserGlobals.size > 0 &&
              !isApprovedNodeSafeBrowserProbeV1(moduleId, browserGlobals)
            ) {
              forbiddenV1(
                `Node-safe closure ${protectedRoot} reaches browser globals in ${moduleId}: ${[
                  ...browserGlobals,
                ]
                  .sort(compareTextV1)
                  .join(", ")}`,
              );
            }
            const module = parsedModules.get(moduleId);
            if (module === undefined) forbiddenV1(`graph is missing protected module ${moduleId}`);
            protectedPending.push(...module.staticImports, ...module.dynamicImports);
          }
        }

        const nodes = [...reachable]
          .map((id) =>
            normalizeModuleV1(
              id.startsWith("virtual:") ? id : resolve(repositoryRoot, id),
              repositoryRoot,
              application,
            ),
          )
          .map(({ id, owningPackage }) => ({ id, owningPackage }))
          .sort((left, right) => compareTextV1(left.id, right.id));
        const edges = [...edgesByKey.values()].sort(
          (left, right) =>
            compareTextV1(left.from, right.from) ||
            compareTextV1(left.kind, right.kind) ||
            compareTextV1(left.to, right.to),
        );
        const dynamicSpecifiers = [
          ...new Set(
            [...reachable].flatMap((id) => [...(dynamicSpecifiersByModule.get(id) ?? [])]),
          ),
        ].sort(compareTextV1);

        const chunks = Object.values(bundle)
          .filter((output) => output.type === "chunk")
          .map((chunk) => ({
            fileName: validateOutputPathV1(chunk.fileName, "chunk filename"),
            imports: [
              ...new Set(chunk.imports.map((id) => validateOutputPathV1(id, "chunk import"))),
            ].sort(compareTextV1),
            dynamicImports: [
              ...new Set(
                chunk.dynamicImports.map((id) => validateOutputPathV1(id, "chunk dynamic import")),
              ),
            ].sort(compareTextV1),
            entry:
              chunk.facadeModuleId === null
                ? null
                : normalizeModuleV1(chunk.facadeModuleId, repositoryRoot, application).id,
          }))
          .sort((left, right) => compareTextV1(left.fileName, right.fileName));
        const manifest = {
          contractRevision: 1,
          applicationId: input.applicationId,
          entry,
          nodes,
          edges,
          dynamicSpecifiers,
          chunks,
        };
        this.emitFile({
          type: "asset",
          fileName: "source-graph.v1.json",
          source: canonicalJsonBytes(manifest),
        });
      },
    },
  };
}
