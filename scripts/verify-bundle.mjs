// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectManagedPaths } from "./collect-import-closure.mjs";

const graphVerifierPathV1 = fileURLToPath(
  new URL("./ui/verify-application-graphs.mts", import.meta.url),
);
const graphVerifierProgramV1 = `const module=await import(${JSON.stringify(
  pathToFileURL(graphVerifierPathV1).href,
)});const result=await module.verifyApplicationGraphsV1({root:process.argv[1]});process.stdout.write(JSON.stringify({applications:result.applications,chunks:{e2e:result.manifestValues.e2e.chunks.map(({fileName})=>fileName),poc:result.manifestValues.poc.chunks.map(({fileName})=>fileName)},digests:{e2e:result.manifests.find(({applicationId})=>applicationId==="e2e-web")?.digest,poc:result.manifests.find(({applicationId})=>applicationId==="poc-web")?.digest},entryChunks:{e2e:result.manifestValues.e2e.chunks.find(({entry})=>entry==="game/stories/e2e/index.html")?.fileName,poc:result.manifestValues.poc.chunks.find(({entry})=>entry==="game/stories/poc/index.html")?.fileName}}));`;
const decoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const byteScannerV1 = new TextDecoder("latin1");

const projectLegalFilesV1 = Object.freeze([
  "LICENSE.md",
  "LICENSES/CC-BY-NC-SA-4.0.txt",
  "LICENSES/MIT.txt",
  "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "TRADEMARKS.md",
]);

const applicationsV1 = Object.freeze([
  Object.freeze({
    id: "e2e-web",
    output: "dist/e2e",
    root: "game/stories/e2e/src/application/entry.tsx",
    story: "e2e",
  }),
  Object.freeze({
    id: "poc-web",
    output: "dist/poc",
    root: "game/stories/poc/src/application/entry.tsx",
    story: "poc",
  }),
]);

const digestV1 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function compareTextV1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function verifyGameArtifactClosureV1(manifest) {
  const errors = [];
  for (const path of manifest.paths) {
    if (path.startsWith("engine/packages/base/src/testkit/")) {
      errors.push(`Artifact closure reached Base testkit: ${path}`);
    } else if (path === "references" || path.startsWith("references/")) {
      errors.push(`Artifact closure reached references: ${path}`);
    } else if (path === "art-source/aigc" || path.startsWith("art-source/aigc/")) {
      errors.push(`Artifact closure reached AIGC source: ${path}`);
    } else if (path.endsWith(".map")) {
      errors.push(`Artifact closure reached source map: ${path}`);
    } else if (isAbsolute(path) || /^[A-Za-z]:[\\/]/u.test(path)) {
      errors.push(`Artifact closure contains absolute path: ${path}`);
    }
  }
  return errors;
}

export async function verifyE2eArtifactClosureV1(root) {
  const paths = await collectManagedPaths(root, ["game/stories/e2e/src/application/entry.tsx"]);
  return verifyGameArtifactClosureV1({ paths });
}

async function verifyApplicationGraphsWithStripTypesV1(input) {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      graphVerifierProgramV1,
      input.root,
    ],
    {
      cwd: input.root,
      encoding: "utf8",
      shell: false,
    },
  );
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new TypeError(`bundle.application_graph_failed: ${detail || String(result.status)}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new TypeError("bundle.application_graph_failed: verifier returned invalid JSON");
  }
}

function assertValidCanonicalStringV1(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError("bundle build-input contains a lone surrogate");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("bundle build-input contains a lone surrogate");
    }
  }
}

function compareCodePointsV1(left, right) {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

export function canonicalBundleJsonTextV1(value, active = new Set()) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    assertValidCanonicalStringV1(value);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw new TypeError("bundle build-input contains a noncanonical number");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object" || value === null || active.has(value)) {
    throw new TypeError("bundle build-input is not canonical JSON data");
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const entries = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError("bundle build-input contains a sparse array");
        }
        entries.push(canonicalBundleJsonTextV1(value[index], active));
      }
      return `[${entries.join(",")}]`;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError("bundle build-input contains a non-plain object");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries = Object.keys(descriptors)
      .sort(compareCodePointsV1)
      .map((key) => {
        const descriptor = descriptors[key];
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          throw new TypeError("bundle build-input contains an accessor");
        }
        assertValidCanonicalStringV1(key);
        return `${JSON.stringify(key)}:${canonicalBundleJsonTextV1(descriptor.value, active)}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    active.delete(value);
  }
}

function decodeCanonicalJsonV1(bytes, label) {
  let value;
  try {
    value = JSON.parse(decoderV1.decode(bytes));
  } catch {
    throw new TypeError(`${label} is not UTF-8 JSON`);
  }
  if (canonicalBundleJsonTextV1(value) !== decoderV1.decode(bytes)) {
    throw new TypeError(`${label} is not canonical JSON`);
  }
  return value;
}

async function listEmittedFilesV1(outputRoot) {
  const files = [];
  const metadata = await lstat(outputRoot);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new TypeError(`${outputRoot} is not a regular Artifact directory`);
  }
  const visitV1 = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareTextV1(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      const entryMetadata = await lstat(absolutePath);
      const path = relative(outputRoot, absolutePath).split(sep).join("/");
      if (entryMetadata.isSymbolicLink()) {
        throw new TypeError(`Artifact symlink is forbidden: ${path}`);
      }
      if (entryMetadata.isDirectory()) await visitV1(absolutePath);
      else if (entryMetadata.isFile()) files.push(path);
      else throw new TypeError(`Artifact non-file is forbidden: ${path}`);
    }
  };
  await visitV1(outputRoot);
  return files.sort(compareTextV1);
}

async function captureOutputBoundaryV1(repositoryRoot, output) {
  const root = resolve(repositoryRoot);
  const rootMetadata = await lstat(root);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    throw new TypeError("bundle repository root is not a real directory");
  }
  const realRoot = await realpath(root);
  const entries = [
    Object.freeze({
      dev: rootMetadata.dev,
      ino: rootMetadata.ino,
      path: root,
      realPath: realRoot,
    }),
  ];
  let current = root;
  let expectedRealPath = realRoot;
  for (const part of output.split("/")) {
    current = resolve(current, part);
    expectedRealPath = resolve(expectedRealPath, part);
    const metadata = await lstat(current);
    const actualRealPath = await realpath(current);
    if (
      metadata.isSymbolicLink() ||
      !metadata.isDirectory() ||
      actualRealPath !== expectedRealPath
    ) {
      throw new TypeError(`${output} escapes the repository output boundary`);
    }
    entries.push(
      Object.freeze({
        dev: metadata.dev,
        ino: metadata.ino,
        path: current,
        realPath: actualRealPath,
      }),
    );
  }
  return Object.freeze({ entries: Object.freeze(entries), outputRoot: current });
}

async function assertOutputBoundaryUnchangedV1(boundary) {
  await assertDirectoryEntriesUnchangedV1(boundary.entries);
}

async function assertDirectoryEntriesUnchangedV1(entries) {
  for (const entry of entries) {
    const [metadata, actualRealPath] = await Promise.all([lstat(entry.path), realpath(entry.path)]);
    if (
      metadata.isSymbolicLink() ||
      !metadata.isDirectory() ||
      metadata.dev !== entry.dev ||
      metadata.ino !== entry.ino ||
      actualRealPath !== entry.realPath
    ) {
      throw new TypeError("bundle Artifact output boundary changed during inspection");
    }
  }
}

async function readPinnedOutputFileV1(boundary, path) {
  const parts = path.split("/");
  if (
    parts.length === 0 ||
    parts.some((part) => part.length === 0 || part === "." || part === "..") ||
    parts.join("/") !== path
  ) {
    throw new TypeError(`invalid Artifact payload path: ${path}`);
  }
  const directoryEntries = [...boundary.entries];
  let current = boundary.outputRoot;
  let expectedRealPath = boundary.entries.at(-1)?.realPath;
  if (expectedRealPath === undefined) {
    throw new TypeError("bundle Artifact output boundary is empty");
  }
  for (const part of parts.slice(0, -1)) {
    current = resolve(current, part);
    expectedRealPath = resolve(expectedRealPath, part);
    const metadata = await lstat(current);
    const actualRealPath = await realpath(current);
    if (
      metadata.isSymbolicLink() ||
      !metadata.isDirectory() ||
      actualRealPath !== expectedRealPath
    ) {
      throw new TypeError(`Artifact payload parent escapes output: ${path}`);
    }
    directoryEntries.push(
      Object.freeze({
        dev: metadata.dev,
        ino: metadata.ino,
        path: current,
        realPath: actualRealPath,
      }),
    );
  }
  await assertDirectoryEntriesUnchangedV1(directoryEntries);
  const target = resolve(current, parts.at(-1));
  const expectedTarget = resolve(expectedRealPath, parts.at(-1));
  let handle;
  try {
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(target),
      realpath(target),
    ]);
    if (
      !handleMetadata.isFile() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isFile() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino ||
      actualRealPath !== expectedTarget
    ) {
      throw new TypeError(`Artifact payload file escaped or changed: ${path}`);
    }
    const bytes = await handle.readFile();
    const [afterHandleMetadata, afterPathMetadata, afterRealPath] = await Promise.all([
      handle.stat(),
      lstat(target),
      realpath(target),
      assertDirectoryEntriesUnchangedV1(directoryEntries),
    ]);
    if (
      afterHandleMetadata.dev !== handleMetadata.dev ||
      afterHandleMetadata.ino !== handleMetadata.ino ||
      afterHandleMetadata.size !== handleMetadata.size ||
      afterPathMetadata.isSymbolicLink() ||
      !afterPathMetadata.isFile() ||
      afterPathMetadata.dev !== handleMetadata.dev ||
      afterPathMetadata.ino !== handleMetadata.ino ||
      afterRealPath !== expectedTarget
    ) {
      throw new TypeError(`Artifact payload file changed during inspection: ${path}`);
    }
    return bytes;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

function inspectRuntimeTextV1(path, text) {
  const errors = [];
  if (text.includes("sourceMappingURL=")) errors.push(`source map marker is forbidden: ${path}`);
  if (/(?:^|[^A-Za-z0-9_.-])references\//u.test(text) || text.includes("art-source/aigc/")) {
    errors.push(`forbidden source path marker: ${path}`);
  }
  if (text.includes("/Users/") || text.includes("\\\\Users\\\\") || text.includes("\\Users\\")) {
    errors.push(`local absolute path marker is forbidden: ${path}`);
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'`<>\\]+/gu)) {
    const candidate = match[0];
    if (
      /^https?:\/\/[^/@\s]+:[^/@\s]+@/iu.test(candidate) ||
      /(?:secret|credential|api[-_]?key|access[-_]?token|\/token(?:\/|$|[?]))/u.test(
        candidate.toLowerCase(),
      ) ||
      /\.(?:js|css|png|jpe?g|webp|avif|svg|woff2?|mp3|ogg|wav)(?:$|[?#])/iu.test(candidate)
    ) {
      errors.push(`unregistered remote runtime asset: ${path} -> ${candidate}`);
    }
  }
  if (/\.(?:html|svg|xml)$/iu.test(path)) {
    for (const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/giu)) {
      const reference = match[1] ?? "";
      if (/^(?:https?:)?\/\//iu.test(reference) || reference.startsWith("/")) {
        errors.push(`unregistered remote runtime asset: ${path} -> ${reference}`);
      }
    }
  }
  if (path.endsWith(".css")) {
    const inspectedCss = normalizeCssInspectionTextV1(text);
    if (containsCssImportV1(inspectedCss)) {
      errors.push(`CSS import is forbidden: ${path}`);
    }
    if (containsNonlocalCssStringV1(inspectedCss)) {
      errors.push(`nonlocal CSS string is forbidden: ${path}`);
    }
    for (const match of inspectedCss.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/giu)) {
      const reference = (match[1] ?? "").trim();
      if (
        !/^(?:data:|#)/iu.test(reference) &&
        normalizeLocalBundleReferenceV1(path, reference) === null
      ) {
        errors.push(`nonlocal CSS asset is forbidden: ${path} -> ${reference}`);
      }
    }
  }
  if (containsSecretAssignmentV1(text)) {
    errors.push(`secret assignment is forbidden: ${path}`);
  }
  return errors;
}

function normalizeCssInspectionTextV1(text) {
  const source = text.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
  let normalized = "";
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor] ?? "";
    if (character !== "\\") {
      normalized += character;
      cursor += 1;
      continue;
    }
    const escaped = source.slice(cursor + 1);
    const hex = /^[0-9A-Fa-f]{1,6}/u.exec(escaped)?.[0];
    if (hex !== undefined) {
      const parsed = Number.parseInt(hex, 16);
      const codePoint =
        parsed === 0 || parsed > 0x10ffff || (parsed >= 0xd800 && parsed <= 0xdfff)
          ? 0xfffd
          : parsed;
      normalized += String.fromCodePoint(codePoint);
      cursor += 1 + hex.length;
      if (source[cursor] === "\r" && source[cursor + 1] === "\n") cursor += 2;
      else if (/^[\t\n\f\r ]$/u.test(source[cursor] ?? "")) cursor += 1;
      continue;
    }
    const escapedCharacter = source[cursor + 1];
    if (escapedCharacter === undefined) break;
    if (escapedCharacter === "\r" && source[cursor + 2] === "\n") {
      cursor += 3;
      continue;
    }
    if (/^[\n\r\f]$/u.test(escapedCharacter)) {
      cursor += 2;
      continue;
    }
    normalized += escapedCharacter;
    cursor += 2;
  }
  return normalized;
}

function containsCssImportV1(text) {
  return /@import(?![A-Za-z0-9_-])/iu.test(text);
}

function containsNonlocalCssStringV1(text) {
  return /["']\s*(?!data:)(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|\/)/iu.test(text);
}

function containsSecretAssignmentV1(text) {
  const secretKey = String.raw`(?:(?:[A-Za-z0-9]+[_-])*(?:auth[_-]?token|api[_-]?key|access[_-]?(?:key|token)|private[_-]?key|password|secret|token)|clientSecret|apiKey|accessToken|privateKey)`;
  const quotedAssignment = new RegExp(
    String.raw`(?:^|[^A-Za-z0-9])["']?${secretKey}["']?\s*[:=]\s*(?:"[^"\r\n]{4,}"|'[^'\r\n]{4,}')`,
    "iu",
  );
  const environmentAssignment = new RegExp(
    String.raw`(?:^|[\r\n])\s*(?:export\s+)?${secretKey}\s*=\s*[^\s#;,}]{4,}`,
    "iu",
  );
  return quotedAssignment.test(text) || environmentAssignment.test(text);
}

function normalizeLocalBundleReferenceV1(sourcePath, reference) {
  if (reference.length === 0 || reference.startsWith("#") || reference.startsWith("data:")) {
    return null;
  }
  if (
    reference.startsWith("/") ||
    /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/)/u.test(reference) ||
    reference.includes("\\")
  ) {
    return null;
  }
  const withoutSuffix = reference.split(/[?#]/u, 1)[0] ?? "";
  const normalized = posix.normalize(posix.join(posix.dirname(sourcePath), withoutSuffix));
  if (
    normalized.length === 0 ||
    normalized.startsWith("../") ||
    normalized === ".." ||
    normalized.startsWith("/")
  ) {
    return null;
  }
  return normalized;
}

function parseHtmlTagAttributesV1(source) {
  const attributes = new Map();
  let index = 0;
  while (index < source.length) {
    while (/\s/u.test(source[index] ?? "")) index += 1;
    if (index >= source.length) break;
    if (source[index] === "/") {
      return source.slice(index + 1).trim().length === 0 ? attributes : null;
    }
    const nameStart = index;
    while (index < source.length && !/[\s=/>]/u.test(source[index] ?? "")) index += 1;
    const name = source.slice(nameStart, index).toLowerCase();
    if (!/^[a-z_:][a-z0-9:._-]*$/u.test(name) || attributes.has(name)) return null;
    while (/\s/u.test(source[index] ?? "")) index += 1;
    if (source[index] !== "=") {
      attributes.set(name, true);
      continue;
    }
    index += 1;
    while (/\s/u.test(source[index] ?? "")) index += 1;
    const quote = source[index];
    if (quote !== '"' && quote !== "'") return null;
    index += 1;
    const valueStart = index;
    while (index < source.length && source[index] !== quote) index += 1;
    if (index >= source.length) return null;
    attributes.set(name, source.slice(valueStart, index));
    index += 1;
  }
  return attributes;
}

function findHtmlStartTagEndV1(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote !== null) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

const allowedArtifactHtmlAttributesV1 = Object.freeze({
  body: Object.freeze([]),
  div: Object.freeze(["id"]),
  head: Object.freeze([]),
  html: Object.freeze(["lang"]),
  link: Object.freeze(["crossorigin", "href", "rel"]),
  meta: Object.freeze(["charset", "content", "name"]),
  script: Object.freeze(["crossorigin", "src", "type"]),
  title: Object.freeze([]),
});

function isUnsafeHtmlAttributeValueV1(value) {
  return (
    value.includes("&") ||
    value.includes("<") ||
    value.includes(">") ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    }) ||
    /^\s*javascript\s*:/iu.test(value)
  );
}

function inspectExternalModuleScriptsV1(application, html) {
  const errors = [];
  const sources = [];
  let cursor = 0;
  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart < 0) break;
    const remaining = html.slice(tagStart);
    if (remaining.startsWith("<!--")) {
      errors.push(`${application.id} index.html contains an HTML comment`);
      break;
    }
    const closingTag = /^<\/([a-z][a-z0-9:._-]*)\s*>/iu.exec(remaining);
    if (closingTag !== null) {
      const closingName = (closingTag[1] ?? "").toLowerCase();
      if (!Object.hasOwn(allowedArtifactHtmlAttributesV1, closingName)) {
        errors.push(`${application.id} index.html contains an unsupported closing tag`);
        break;
      }
      cursor = tagStart + closingTag[0].length;
      continue;
    }
    const canonicalDoctype = "<!doctype html>";
    if (remaining.slice(0, canonicalDoctype.length).toLowerCase() === canonicalDoctype) {
      cursor = tagStart + canonicalDoctype.length;
      continue;
    }
    if (remaining.startsWith("<!") || remaining.startsWith("<?")) {
      errors.push(`${application.id} index.html contains unsupported markup`);
      break;
    }
    const openingTag = /^<([a-z][a-z0-9:._-]*)\b/iu.exec(remaining);
    if (openingTag === null) {
      cursor = tagStart + 1;
      continue;
    }
    const tagName = (openingTag[1] ?? "").toLowerCase();
    const attributesStart = tagStart + openingTag[0].length;
    const tagEnd = findHtmlStartTagEndV1(html, attributesStart);
    if (tagEnd < 0) {
      errors.push(`${application.id} index.html contains an invalid ${tagName} tag`);
      break;
    }
    const attributes = parseHtmlTagAttributesV1(html.slice(attributesStart, tagEnd));
    if (attributes === null) {
      errors.push(`${application.id} index.html contains invalid ${tagName} attributes`);
      break;
    }
    if (
      [...attributes].some(
        ([name, value]) =>
          /^on[a-z][a-z0-9:._-]*$/u.test(name) ||
          name === "srcdoc" ||
          name === "style" ||
          (typeof value === "string" && isUnsafeHtmlAttributeValueV1(value)),
      )
    ) {
      errors.push(`${application.id} index.html contains inline executable HTML`);
    }
    const allowedAttributes = Reflect.get(allowedArtifactHtmlAttributesV1, tagName);
    if (
      !Array.isArray(allowedAttributes) ||
      [...attributes.keys()].some((name) => !allowedAttributes.includes(name))
    ) {
      errors.push(`${application.id} index.html contains an unsupported ${tagName} tag`);
      break;
    }
    if (tagName === "link") {
      const relationship = attributes.get("rel");
      const reference = attributes.get("href");
      if (
        (relationship !== "modulepreload" && relationship !== "stylesheet") ||
        typeof reference !== "string" ||
        normalizeLocalBundleReferenceV1("index.html", reference) === null
      ) {
        errors.push(`${application.id} index.html contains an unsupported link`);
        break;
      }
    }
    if (tagName === "title") {
      const titleClosing = /<\/title\s*>/giu;
      titleClosing.lastIndex = tagEnd + 1;
      const match = titleClosing.exec(html);
      if (match === null) {
        errors.push(`${application.id} index.html contains an invalid title container`);
        break;
      }
      cursor = titleClosing.lastIndex;
      continue;
    }
    if (tagName !== "script") {
      cursor = tagEnd + 1;
      continue;
    }
    const closing = /^\s*<\/script\s*>/iu.exec(html.slice(tagEnd + 1));
    if (closing === null) {
      errors.push(`${application.id} index.html contains an inline or malformed script`);
      break;
    }
    const keys = [...attributes.keys()];
    const source = attributes.get("src");
    if (
      keys.some((key) => !["crossorigin", "src", "type"].includes(key)) ||
      attributes.get("type") !== "module" ||
      typeof source !== "string"
    ) {
      errors.push(`${application.id} index.html contains a non-module external script`);
    } else {
      sources.push(source);
    }
    cursor = tagEnd + 1 + closing[0].length;
  }
  return Object.freeze({ errors: Object.freeze(errors), sources: Object.freeze(sources) });
}

function inspectHtmlScriptGraphV1(application, html, expectedChunks, applicationChunk) {
  const errors = [];
  const inspected = inspectExternalModuleScriptsV1(application, html);
  errors.push(...inspected.errors);
  const scriptSources = inspected.sources;
  if (scriptSources.length === 0) {
    errors.push(`${application.id} index.html has no application script`);
  }
  for (const reference of scriptSources) {
    const path = normalizeLocalBundleReferenceV1("index.html", reference);
    if (path === null || !expectedChunks.includes(path)) {
      errors.push(`${application.id} index.html references undeclared script ${reference}`);
    }
  }
  const normalizedSources = scriptSources.map((reference) =>
    normalizeLocalBundleReferenceV1("index.html", reference),
  );
  if (!normalizedSources.includes(applicationChunk)) {
    errors.push(`${application.id} index.html does not load the application chunk`);
  }
  return errors;
}

function isBundleTextPayloadV1(path) {
  return /\.(?:css|html|js|json|mjs|svg|txt|webmanifest|xml)$/iu.test(path);
}

async function inspectApplicationOutputV1(
  repositoryRoot,
  application,
  expectedChunks,
  applicationChunk,
  expectedGraphDigest,
  beforePayloadRead,
  afterPayloadInspection,
) {
  const errors = [];
  const initialPayloads = new Map();
  const runtimeTexts = new Map();
  let boundary;
  let paths;
  try {
    boundary = await captureOutputBoundaryV1(repositoryRoot, application.output);
    await assertOutputBoundaryUnchangedV1(boundary);
    paths = await listEmittedFilesV1(boundary.outputRoot);
    await assertOutputBoundaryUnchangedV1(boundary);
    await beforePayloadRead?.({ application, outputRoot: boundary.outputRoot, paths });
    await assertOutputBoundaryUnchangedV1(boundary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const exactFiles = new Set([
    "build-input.json",
    "index.html",
    "source-graph.v1.json",
    ...(application.story === "poc" ? ["artifact-manifest.json", ...projectLegalFilesV1] : []),
  ]);
  for (const required of ["build-input.json", "index.html", "source-graph.v1.json"]) {
    if (!paths.includes(required)) {
      errors.push(`required Artifact file is missing: ${application.id}/${required}`);
    }
  }
  for (const path of paths) {
    try {
      const bytes = await readPinnedOutputFileV1(boundary, path);
      initialPayloads.set(
        path,
        Object.freeze({
          byteLength: bytes.byteLength,
          bytes,
          digest: digestV1(bytes),
        }),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`runtime output is unavailable: ${application.id}/${path}: ${detail}`);
    }
  }
  for (const path of paths) {
    const framed = `/${path}/`;
    const basename = path.split("/").at(-1) ?? "";
    if (!exactFiles.has(path) && !path.startsWith("assets/")) {
      errors.push(`forbidden Artifact root: ${application.id}/${path}`);
    }
    if (path.endsWith(".map")) errors.push(`source map is forbidden: ${application.id}/${path}`);
    if (framed.includes("/references/") || framed.includes("/art-source/aigc/")) {
      errors.push(`forbidden Artifact path: ${application.id}/${path}`);
    }
    if (
      basename.startsWith(".") ||
      /^(?:credentials?|secrets?)(?:\.|$)/iu.test(basename) ||
      /^id_(?:dsa|ecdsa|ed25519|rsa)(?:\.|$)/iu.test(basename) ||
      /\.(?:cjs|key|mjs|p12|pem|pfx)$/iu.test(basename)
    ) {
      errors.push(`credential or executable Artifact path is forbidden: ${application.id}/${path}`);
    }
    if (!projectLegalFilesV1.includes(path) && path !== "artifact-manifest.json") {
      const bytes = initialPayloads.get(path)?.bytes;
      if (bytes === undefined) continue;
      errors.push(
        ...inspectRuntimeTextV1(`${application.id}/${path}`, byteScannerV1.decode(bytes)),
      );
      if (!isBundleTextPayloadV1(path)) continue;
      try {
        runtimeTexts.set(path, decoderV1.decode(bytes));
      } catch {
        errors.push(`runtime output is not UTF-8: ${application.id}/${path}`);
      }
    }
  }
  if (expectedChunks !== undefined && applicationChunk !== undefined) {
    const emittedExecutableFiles = paths.filter((path) => /\.(?:cjs|js|mjs)$/iu.test(path));
    if (
      emittedExecutableFiles.some((path) => !path.startsWith("assets/") || !path.endsWith(".js"))
    ) {
      errors.push(`${application.id} contains executable files outside graph chunk form`);
    }
    const emittedJavaScript = paths
      .filter((path) => path.startsWith("assets/") && path.endsWith(".js"))
      .sort(compareTextV1);
    if (JSON.stringify(emittedJavaScript) !== JSON.stringify(expectedChunks)) {
      errors.push(`${application.id} emitted JavaScript differs from graph chunks`);
    }
    const indexText = runtimeTexts.get("index.html");
    if (typeof indexText === "string") {
      errors.push(
        ...inspectHtmlScriptGraphV1(application, indexText, expectedChunks, applicationChunk),
      );
    }
  }
  try {
    const buildInputBytes = initialPayloads.get("build-input.json")?.bytes;
    const graphBytes = initialPayloads.get("source-graph.v1.json")?.bytes;
    if (buildInputBytes === undefined || graphBytes === undefined) {
      throw new TypeError(`${application.id} provenance payload is unavailable`);
    }
    const buildInput = decodeCanonicalJsonV1(buildInputBytes, `${application.id} build-input`);
    if (
      buildInput?.applicationId !== application.id ||
      buildInput?.story !== application.story ||
      buildInput?.host !== "web"
    ) {
      errors.push(`${application.id} build-input identifies another Story x Host`);
    }
    if (buildInput?.sourceGraphDigest !== digestV1(graphBytes)) {
      errors.push(`${application.id} build-input has a stale source graph digest`);
    }
    if (digestV1(graphBytes) !== expectedGraphDigest) {
      errors.push(`${application.id} source graph changed after graph verification`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (boundary !== undefined) {
    try {
      await afterPayloadInspection?.({ application, outputRoot: boundary.outputRoot, paths });
      await assertOutputBoundaryUnchangedV1(boundary);
      const finalPaths = await listEmittedFilesV1(boundary.outputRoot);
      await assertOutputBoundaryUnchangedV1(boundary);
      if (JSON.stringify(finalPaths) !== JSON.stringify(paths)) {
        errors.push(`${application.id} Artifact file set changed during inspection`);
      } else {
        for (const path of finalPaths) {
          const initial = initialPayloads.get(path);
          if (initial === undefined) continue;
          const finalBytes = await readPinnedOutputFileV1(boundary, path);
          if (
            finalBytes.byteLength !== initial.byteLength ||
            digestV1(finalBytes) !== initial.digest
          ) {
            errors.push(`${application.id} Artifact payload changed during inspection: ${path}`);
          }
        }
      }
      await assertOutputBoundaryUnchangedV1(boundary);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}

export async function verifyBuiltArtifactGraphsV1(
  root,
  verifyGraphs = verifyApplicationGraphsWithStripTypesV1,
  options = {},
) {
  const repositoryRoot = resolve(root);
  const errors = [];
  let chunks;
  try {
    const result = await verifyGraphs({ root: repositoryRoot });
    const expected = applicationsV1.map(({ id, root: applicationRoot }) => ({
      id,
      root: applicationRoot,
    }));
    if (JSON.stringify(result?.applications) !== JSON.stringify(expected)) {
      errors.push("application graph verifier returned the wrong Story roots");
    }
    const e2eChunks = result?.chunks?.e2e;
    const pocChunks = result?.chunks?.poc;
    const e2eEntryChunk = result?.entryChunks?.e2e;
    const pocEntryChunk = result?.entryChunks?.poc;
    const e2eDigest = result?.digests?.e2e;
    const pocDigest = result?.digests?.poc;
    if (
      !Array.isArray(e2eChunks) ||
      !Array.isArray(pocChunks) ||
      typeof e2eDigest !== "string" ||
      typeof pocDigest !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(e2eDigest) ||
      !/^sha256:[0-9a-f]{64}$/u.test(pocDigest) ||
      [e2eChunks, pocChunks].some(
        (values) =>
          values.some(
            (value) =>
              typeof value !== "string" || !value.startsWith("assets/") || !value.endsWith(".js"),
          ) || values.some((value, index) => index > 0 && values[index - 1] >= value),
      )
    ) {
      errors.push("application graph verifier returned invalid chunk sets");
    } else if (
      typeof e2eEntryChunk !== "string" ||
      typeof pocEntryChunk !== "string" ||
      !e2eChunks.includes(e2eEntryChunk) ||
      !pocChunks.includes(pocEntryChunk)
    ) {
      errors.push("application graph verifier returned invalid application chunks");
    } else {
      chunks = Object.freeze({
        e2e: e2eChunks,
        e2eEntry: e2eEntryChunk,
        e2eGraph: e2eDigest,
        poc: pocChunks,
        pocEntry: pocEntryChunk,
        pocGraph: pocDigest,
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const outputErrors = await Promise.all(
    applicationsV1.map((application) =>
      inspectApplicationOutputV1(
        repositoryRoot,
        application,
        application.story === "e2e" ? chunks?.e2e : chunks?.poc,
        application.story === "e2e" ? chunks?.e2eEntry : chunks?.pocEntry,
        application.story === "e2e" ? chunks?.e2eGraph : chunks?.pocGraph,
        options.beforePayloadRead,
        options.afterPayloadInspection,
      ),
    ),
  );
  errors.push(...outputErrors.flat());
  return errors;
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyBuiltArtifactGraphsV1(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("poc-web and e2e-web Artifact graphs verified");
  }
}
