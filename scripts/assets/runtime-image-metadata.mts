// SPDX-License-Identifier: MIT
import type { PositiveSafeInteger } from "../../engine/packages/base/src/index.js";

export type RuntimeImageMetadataV1 = {
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
};

export type RuntimeImageMetadataResultV1 =
  | { readonly kind: "valid"; readonly metadata: RuntimeImageMetadataV1 }
  | {
      readonly kind: "invalid";
      readonly code: "unsupported_media" | "invalid_bytes" | "unsafe_svg" | "invalid_dimensions";
    };

type RuntimeImageMediaTypeV1 = RuntimeImageMetadataV1["mediaType"];
type InvalidRuntimeImageCodeV1 = Extract<
  RuntimeImageMetadataResultV1,
  { readonly kind: "invalid" }
>["code"];

type SvgAttributeV1 = {
  readonly name: string;
  readonly value: string;
};

type SvgOpenTokenV1 = {
  readonly name: string;
  readonly attributes: readonly SvgAttributeV1[];
  readonly selfClosing: boolean;
  readonly nextOffset: number;
};

type SvgDocumentResultV1 =
  | { readonly kind: "valid"; readonly rootAttributes: readonly SvgAttributeV1[] }
  | { readonly kind: "invalid" }
  | { readonly kind: "unsafe" };

const pngSignatureV1 = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const xmlNumberSourceV1 = String.raw`[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?`;
const viewBoxPatternV1 = new RegExp(
  String.raw`^\s*(${xmlNumberSourceV1})(?:\s+|\s*,\s*)(${xmlNumberSourceV1})(?:\s+|\s*,\s*)(${xmlNumberSourceV1})(?:\s+|\s*,\s*)(${xmlNumberSourceV1})\s*$`,
  "u",
);
const xmlDeclarationPatternV1 =
  /^<\?xml\s+version\s*=\s*(?:"1\.[01]"|'1\.[01]')(?:\s+encoding\s*=\s*(?:"UTF-8"|'UTF-8'))?(?:\s+standalone\s*=\s*(?:"(?:yes|no)"|'(?:yes|no)'))?\s*\?>/iu;
const pngMaximumDimensionV1 = 0x7fff_ffff;
const webpMaximumCanvasPixelsV1 = 0xffff_ffff;
const svgNamespaceV1 = "http://www.w3.org/2000/svg";
const xlinkNamespaceV1 = "http://www.w3.org/1999/xlink";
const safeSvgElementNamesV1 = new Set([
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "g",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "switch",
  "symbol",
  "text",
  "textPath",
  "title",
  "tspan",
  "use",
  "view",
]);
const safeSvgLocalReferenceElementNamesV1 = new Set([
  "linearGradient",
  "pattern",
  "radialGradient",
  "textPath",
  "use",
]);
const svgResourceAttributeNamesV1 = new Set([
  "action",
  "background",
  "cite",
  "data",
  "formaction",
  "href",
  "longdesc",
  "manifest",
  "ping",
  "poster",
  "src",
  "srcset",
]);

function invalidResult(code: InvalidRuntimeImageCodeV1): RuntimeImageMetadataResultV1 {
  return Object.freeze({ kind: "invalid", code });
}

function validResult(
  mediaType: RuntimeImageMediaTypeV1,
  width: number,
  height: number,
): RuntimeImageMetadataResultV1 {
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    return invalidResult("invalid_dimensions");
  }
  const metadata = Object.freeze({
    mediaType,
    width: width as PositiveSafeInteger,
    height: height as PositiveSafeInteger,
  });
  return Object.freeze({ kind: "valid", metadata });
}

function asciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  if (offset < 0 || offset + expected.length > bytes.byteLength) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected.charCodeAt(index)) return false;
  }
  return true;
}

function beginsWithBytes(bytes: Uint8Array, expected: Uint8Array): boolean {
  if (bytes.byteLength < expected.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (bytes[index] !== expected[index]) return false;
  }
  return true;
}

function isNonEmptyPrefix(bytes: Uint8Array, expected: Uint8Array): boolean {
  if (bytes.byteLength === 0 || bytes.byteLength >= expected.byteLength) return false;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== expected[index]) return false;
  }
  return true;
}

function isNonEmptyAsciiPrefix(bytes: Uint8Array, expected: string): boolean {
  if (bytes.byteLength === 0 || bytes.byteLength >= expected.length) return false;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== expected.charCodeAt(index)) return false;
  }
  return true;
}

function uint16Le(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function uint24Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function uint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    littleEndian,
  );
}

function readPngMetadataV1(bytes: Uint8Array): RuntimeImageMetadataResultV1 {
  if (bytes.byteLength < 33) return invalidResult("invalid_bytes");
  if (uint32(bytes, 8, false) !== 13 || !asciiAt(bytes, 12, "IHDR")) {
    return invalidResult("invalid_bytes");
  }
  const width = uint32(bytes, 16, false);
  const height = uint32(bytes, 20, false);
  if (width > pngMaximumDimensionV1 || height > pngMaximumDimensionV1) {
    return invalidResult("invalid_dimensions");
  }
  return validResult("image/png", width, height);
}

function readVp8MetadataV1(
  bytes: Uint8Array,
  dataOffset: number,
  chunkLength: number,
): RuntimeImageMetadataResultV1 {
  if (
    chunkLength < 10 ||
    ((bytes[dataOffset] ?? 0) & 0x01) !== 0 ||
    bytes[dataOffset + 3] !== 0x9d ||
    bytes[dataOffset + 4] !== 0x01 ||
    bytes[dataOffset + 5] !== 0x2a
  ) {
    return invalidResult("invalid_bytes");
  }
  return validResult(
    "image/webp",
    uint16Le(bytes, dataOffset + 6) & 0x3fff,
    uint16Le(bytes, dataOffset + 8) & 0x3fff,
  );
}

function readVp8lMetadataV1(
  bytes: Uint8Array,
  dataOffset: number,
  chunkLength: number,
): RuntimeImageMetadataResultV1 {
  if (
    chunkLength < 5 ||
    bytes[dataOffset] !== 0x2f ||
    ((bytes[dataOffset + 4] ?? 0) & 0xe0) !== 0
  ) {
    return invalidResult("invalid_bytes");
  }
  const byte1 = bytes[dataOffset + 1] ?? 0;
  const byte2 = bytes[dataOffset + 2] ?? 0;
  const byte3 = bytes[dataOffset + 3] ?? 0;
  const byte4 = bytes[dataOffset + 4] ?? 0;
  return validResult(
    "image/webp",
    1 + byte1 + ((byte2 & 0x3f) << 8),
    1 + ((byte2 & 0xc0) >>> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
  );
}

function readVp8xMetadataV1(
  bytes: Uint8Array,
  dataOffset: number,
  chunkLength: number,
): RuntimeImageMetadataResultV1 {
  if (chunkLength !== 10) return invalidResult("invalid_bytes");
  const width = uint24Le(bytes, dataOffset + 4) + 1;
  const height = uint24Le(bytes, dataOffset + 7) + 1;
  if (width * height > webpMaximumCanvasPixelsV1) {
    return invalidResult("invalid_dimensions");
  }
  return validResult("image/webp", width, height);
}

function readWebpMetadataV1(bytes: Uint8Array): RuntimeImageMetadataResultV1 {
  if (bytes.byteLength < 12 || !asciiAt(bytes, 0, "RIFF") || !asciiAt(bytes, 8, "WEBP")) {
    return invalidResult("invalid_bytes");
  }
  if (uint32(bytes, 4, true) + 8 !== bytes.byteLength) {
    return invalidResult("invalid_bytes");
  }

  let firstImage: RuntimeImageMetadataResultV1 | undefined;
  let offset = 12;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return invalidResult("invalid_bytes");
    const chunkLength = uint32(bytes, offset + 4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    const paddedEnd = dataEnd + (chunkLength % 2);
    if (dataEnd < dataOffset || paddedEnd > bytes.byteLength) {
      return invalidResult("invalid_bytes");
    }
    if (chunkLength % 2 === 1 && bytes[dataEnd] !== 0) {
      return invalidResult("invalid_bytes");
    }

    if (firstImage === undefined) {
      if (asciiAt(bytes, offset, "VP8 ")) {
        firstImage = readVp8MetadataV1(bytes, dataOffset, chunkLength);
      } else if (asciiAt(bytes, offset, "VP8L")) {
        firstImage = readVp8lMetadataV1(bytes, dataOffset, chunkLength);
      } else if (asciiAt(bytes, offset, "VP8X")) {
        firstImage = readVp8xMetadataV1(bytes, dataOffset, chunkLength);
      }
    }
    offset = paddedEnd;
  }

  if (offset !== bytes.byteLength || firstImage === undefined) {
    return invalidResult("invalid_bytes");
  }
  return firstImage;
}

function isXmlWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\n" || character === "\r";
}

function skipXmlWhitespace(source: string, offset: number): number {
  let next = offset;
  while (isXmlWhitespace(source[next])) next += 1;
  return next;
}

function isXmlNameStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_:]/u.test(character);
}

function isXmlNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_.:-]/u.test(character);
}

function readXmlName(
  source: string,
  offset: number,
): { readonly name: string; readonly nextOffset: number } | null {
  if (!isXmlNameStart(source[offset])) return null;
  let nextOffset = offset + 1;
  while (isXmlNameCharacter(source[nextOffset])) nextOffset += 1;
  return { name: source.slice(offset, nextOffset), nextOffset };
}

function isValidXmlCodePoint(value: number): boolean {
  return (
    value === 0x09 ||
    value === 0x0a ||
    value === 0x0d ||
    (value >= 0x20 && value <= 0xd7ff) ||
    (value >= 0xe000 && value <= 0xfffd) ||
    (value >= 0x1_0000 && value <= 0x10_ffff)
  );
}

function decodeXmlEntities(source: string): string | null {
  let decoded = "";
  let offset = 0;
  while (offset < source.length) {
    const ampersand = source.indexOf("&", offset);
    if (ampersand === -1) return decoded + source.slice(offset);
    decoded += source.slice(offset, ampersand);
    const semicolon = source.indexOf(";", ampersand + 1);
    if (semicolon === -1) return null;
    const entity = source.slice(ampersand + 1, semicolon);
    const predefined = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"',
    }[entity];
    if (predefined !== undefined) {
      decoded += predefined;
    } else {
      const hexadecimal = /^#x([0-9a-f]+)$/iu.exec(entity);
      const decimal = /^#([0-9]+)$/u.exec(entity);
      const codePoint = hexadecimal
        ? Number.parseInt(hexadecimal[1] ?? "", 16)
        : decimal
          ? Number.parseInt(decimal[1] ?? "", 10)
          : Number.NaN;
      if (!Number.isSafeInteger(codePoint) || !isValidXmlCodePoint(codePoint)) return null;
      decoded += String.fromCodePoint(codePoint);
    }
    offset = semicolon + 1;
  }
  return decoded;
}

function readSvgOpenToken(source: string, offset: number): SvgOpenTokenV1 | null {
  const nameResult = readXmlName(source, offset + 1);
  if (nameResult === null) return null;
  const attributes: SvgAttributeV1[] = [];
  const names = new Set<string>();
  let nextOffset = nameResult.nextOffset;

  while (nextOffset < source.length) {
    const beforeWhitespace = nextOffset;
    nextOffset = skipXmlWhitespace(source, nextOffset);
    if (source.startsWith("/>", nextOffset)) {
      return {
        name: nameResult.name,
        attributes,
        selfClosing: true,
        nextOffset: nextOffset + 2,
      };
    }
    if (source[nextOffset] === ">") {
      return {
        name: nameResult.name,
        attributes,
        selfClosing: false,
        nextOffset: nextOffset + 1,
      };
    }
    if (nextOffset === beforeWhitespace) return null;

    const attributeName = readXmlName(source, nextOffset);
    if (attributeName === null || names.has(attributeName.name)) return null;
    names.add(attributeName.name);
    nextOffset = skipXmlWhitespace(source, attributeName.nextOffset);
    if (source[nextOffset] !== "=") return null;
    nextOffset = skipXmlWhitespace(source, nextOffset + 1);
    const quote = source[nextOffset];
    if (quote !== '"' && quote !== "'") return null;
    const valueStart = nextOffset + 1;
    const valueEnd = source.indexOf(quote, valueStart);
    if (valueEnd === -1) return null;
    const value = source.slice(valueStart, valueEnd);
    if (value.includes("<") || decodeXmlEntities(value) === null) return null;
    attributes.push({ name: attributeName.name, value });
    nextOffset = valueEnd + 1;
  }
  return null;
}

function localXmlName(name: string): string {
  return name.slice(name.lastIndexOf(":") + 1).toLowerCase();
}

function hasUnsafeCss(value: string): boolean {
  if (value.includes("\\")) return true;
  const withoutComments = value.replace(/\/\*[\s\S]*?\*\//gu, "");
  if (withoutComments.includes("/*") || withoutComments.includes("*/")) return true;
  return /url\s*\(|(?:-webkit-)?image-set\s*\(|@import\b/iu.test(withoutComments);
}

function hasUnsafeSvgAttributes(
  attributes: readonly SvgAttributeV1[],
  elementName: string,
  rootElement: boolean,
  xlinkDeclared: boolean,
): boolean {
  for (const attribute of attributes) {
    const lowerName = attribute.name.toLowerCase();
    const localName = localXmlName(attribute.name);
    const decodedValue = decodeXmlEntities(attribute.value);
    if (decodedValue === null) return true;
    const trimmedValue = decodedValue.trim();
    const compactedValue = decodedValue.replace(/[\t\n\r ]+/gu, "");

    if (attribute.name === "xmlns") {
      if (!rootElement || decodedValue !== svgNamespaceV1) return true;
      continue;
    }
    if (attribute.name.startsWith("xmlns:")) {
      if (!rootElement || attribute.name !== "xmlns:xlink" || decodedValue !== xlinkNamespaceV1) {
        return true;
      }
      continue;
    }
    if (attribute.name.includes(":")) {
      const allowedXmlAttribute = attribute.name === "xml:lang" || attribute.name === "xml:space";
      const allowedXlinkAttribute = attribute.name === "xlink:href" && xlinkDeclared;
      if (!allowedXmlAttribute && !allowedXlinkAttribute) return true;
    }
    if (
      lowerName === "xml:base" ||
      localName === "srcdoc" ||
      localName === "style" ||
      localName === "target" ||
      localName === "download" ||
      /^on[a-z]/u.test(localName) ||
      hasUnsafeCss(decodedValue)
    ) {
      return true;
    }
    if (
      /(?:data|https?|ftp|file|blob|javascript):/iu.test(compactedValue) ||
      trimmedValue.startsWith("//")
    ) {
      return true;
    }
    if (svgResourceAttributeNamesV1.has(localName)) {
      const allowedLocalReference =
        localName === "href" &&
        safeSvgLocalReferenceElementNamesV1.has(elementName) &&
        /^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(decodedValue);
      if (!allowedLocalReference) return true;
    }
  }
  return false;
}

function hasInvalidXmlCodePoint(source: string): boolean {
  for (const character of source) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || !isValidXmlCodePoint(codePoint)) return true;
  }
  return false;
}

function readSvgDocumentV1(source: string): SvgDocumentResultV1 {
  if (/<!\s*(?:doctype|entity)\b/iu.test(source)) return { kind: "unsafe" };
  if (hasInvalidXmlCodePoint(source)) return { kind: "invalid" };

  let offset = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  offset = skipXmlWhitespace(source, offset);
  if (source.startsWith("<?", offset)) {
    if (!source.startsWith("<?xml", offset) || !isXmlWhitespace(source[offset + 5])) {
      return { kind: "unsafe" };
    }
    const declaration = xmlDeclarationPatternV1.exec(source.slice(offset));
    if (declaration === null) return { kind: "invalid" };
    offset += declaration[0].length;
  }

  const stack: string[] = [];
  let rootAttributes: readonly SvgAttributeV1[] | undefined;
  let rootComplete = false;
  let xlinkDeclared = false;

  while (offset < source.length) {
    if (source.startsWith("<!--", offset)) {
      const commentEnd = source.indexOf("-->", offset + 4);
      if (commentEnd === -1 || source.slice(offset + 4, commentEnd).includes("--")) {
        return { kind: "invalid" };
      }
      offset = commentEnd + 3;
      continue;
    }

    if (source[offset] !== "<") {
      const nextTag = source.indexOf("<", offset);
      const textEnd = nextTag === -1 ? source.length : nextTag;
      const rawText = source.slice(offset, textEnd);
      const decodedText = decodeXmlEntities(rawText);
      if (
        decodedText === null ||
        rawText.includes("]]>") ||
        (stack.length === 0 && decodedText.trim().length > 0)
      ) {
        return { kind: "invalid" };
      }
      if (hasUnsafeCss(decodedText)) return { kind: "unsafe" };
      offset = textEnd;
      continue;
    }

    if (source.startsWith("<?", offset)) return { kind: "unsafe" };
    if (source.startsWith("<!", offset)) {
      return { kind: "invalid" };
    }
    if (source.startsWith("</", offset)) {
      const closeName = readXmlName(source, offset + 2);
      if (closeName === null) return { kind: "invalid" };
      const closeEnd = skipXmlWhitespace(source, closeName.nextOffset);
      if (source[closeEnd] !== ">" || stack.at(-1) !== closeName.name) {
        return { kind: "invalid" };
      }
      stack.pop();
      offset = closeEnd + 1;
      if (stack.length === 0) rootComplete = true;
      continue;
    }

    const openToken = readSvgOpenToken(source, offset);
    if (openToken === null) return { kind: "invalid" };
    const rootElement = stack.length === 0;
    if (stack.length === 0) {
      if (rootComplete || openToken.name !== "svg") return { kind: "invalid" };
      rootAttributes = openToken.attributes;
      xlinkDeclared = openToken.attributes.some(
        (attribute) => attribute.name === "xmlns:xlink" && attribute.value === xlinkNamespaceV1,
      );
    } else if (openToken.name.includes(":") || !safeSvgElementNamesV1.has(openToken.name)) {
      return { kind: "unsafe" };
    }
    if (hasUnsafeSvgAttributes(openToken.attributes, openToken.name, rootElement, xlinkDeclared)) {
      return { kind: "unsafe" };
    }

    offset = openToken.nextOffset;
    if (openToken.selfClosing) {
      if (stack.length === 0) rootComplete = true;
    } else {
      stack.push(openToken.name);
    }
  }

  if (!rootComplete || stack.length > 0 || rootAttributes === undefined) {
    return { kind: "invalid" };
  }
  return { kind: "valid", rootAttributes };
}

function readSvgDimensionsV1(
  rootAttributes: readonly SvgAttributeV1[],
): { readonly width: number; readonly height: number } | null {
  const attributes = new Map(rootAttributes.map((attribute) => [attribute.name, attribute.value]));
  const widthSource = attributes.get("width");
  const heightSource = attributes.get("height");
  const viewBoxSource = attributes.get("viewBox");
  if (
    widthSource === undefined ||
    heightSource === undefined ||
    viewBoxSource === undefined ||
    !/^[1-9][0-9]*$/u.test(widthSource) ||
    !/^[1-9][0-9]*$/u.test(heightSource)
  ) {
    return null;
  }
  const width = Number(widthSource);
  const height = Number(heightSource);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return null;

  const viewBox = viewBoxPatternV1.exec(viewBoxSource);
  if (viewBox === null) return null;
  const values = viewBox.slice(1).map(Number);
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    values[2] !== width ||
    values[3] !== height
  ) {
    return null;
  }
  return { width, height };
}

function readSvgMetadataV1(bytes: Uint8Array): RuntimeImageMetadataResultV1 {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return invalidResult("invalid_bytes");
  }
  if (!/<svg(?=[\s/>])/u.test(source)) return invalidResult("unsupported_media");

  const document = readSvgDocumentV1(source);
  if (document.kind === "unsafe") return invalidResult("unsafe_svg");
  if (document.kind === "invalid") return invalidResult("invalid_bytes");
  const dimensions = readSvgDimensionsV1(document.rootAttributes);
  if (dimensions === null) return invalidResult("invalid_dimensions");
  return validResult("image/svg+xml", dimensions.width, dimensions.height);
}

/**
 * Reads deterministic image identity from supplied bytes without filesystem,
 * network, browser, or image-decoder access.
 */
export function readRuntimeImageMetadataV1(
  bytes: Uint8Array,
  declaredMediaType: RuntimeImageMediaTypeV1,
): RuntimeImageMetadataResultV1 {
  const isPng = beginsWithBytes(bytes, pngSignatureV1);
  const isPngPrefix = isNonEmptyPrefix(bytes, pngSignatureV1);
  const isRiff = asciiAt(bytes, 0, "RIFF");
  const isRiffPrefix = isNonEmptyAsciiPrefix(bytes, "RIFF");

  if (declaredMediaType === "image/png") {
    if (isPng) return readPngMetadataV1(bytes);
    return invalidResult(isPngPrefix ? "invalid_bytes" : "unsupported_media");
  }
  if (declaredMediaType === "image/webp") {
    if (isRiff) return readWebpMetadataV1(bytes);
    return invalidResult(isRiffPrefix ? "invalid_bytes" : "unsupported_media");
  }
  if (isPng || isPngPrefix || isRiff || isRiffPrefix) {
    return invalidResult("unsupported_media");
  }
  return readSvgMetadataV1(bytes);
}
