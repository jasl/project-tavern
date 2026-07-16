// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  readRuntimeImageMetadataV1,
  type RuntimeImageMetadataResultV1,
} from "./runtime-image-metadata.mjs";

const textEncoder = new TextEncoder();

function writeUint16Le(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(offset, value, true);
}

function writeUint24Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

function writeUint32(
  bytes: Uint8Array,
  offset: number,
  value: number,
  littleEndian: boolean,
): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
    offset,
    value,
    littleEndian,
  );
}

function pngFixture(width: number, height: number, chunkLength = 13): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  writeUint32(bytes, 8, chunkLength, false);
  bytes.set(textEncoder.encode("IHDR"), 12);
  writeUint32(bytes, 16, width, false);
  writeUint32(bytes, 20, height, false);
  bytes.set([8, 6, 0, 0, 0], 24);
  return bytes;
}

function webpChunk(
  type: string,
  payload: Uint8Array,
  options: { readonly declaredLength?: number; readonly includePadding?: boolean } = {},
): Uint8Array {
  const declaredLength = options.declaredLength ?? payload.byteLength;
  const includePadding = options.includePadding ?? payload.byteLength % 2 === 1;
  const bytes = new Uint8Array(8 + payload.byteLength + (includePadding ? 1 : 0));
  bytes.set(textEncoder.encode(type), 0);
  writeUint32(bytes, 4, declaredLength, true);
  bytes.set(payload, 8);
  return bytes;
}

function webpFixture(...chunks: readonly Uint8Array[]): Uint8Array {
  const byteLength = 12 + chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(byteLength);
  bytes.set(textEncoder.encode("RIFF"), 0);
  writeUint32(bytes, 4, byteLength - 8, true);
  bytes.set(textEncoder.encode("WEBP"), 8);
  let offset = 12;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function vp8Payload(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(10);
  bytes.set([0, 0, 0, 0x9d, 0x01, 0x2a]);
  writeUint16Le(bytes, 6, width);
  writeUint16Le(bytes, 8, height);
  return bytes;
}

function vp8lPayload(width: number, height: number): Uint8Array {
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  return Uint8Array.from([
    0x2f,
    encodedWidth & 0xff,
    ((encodedWidth >>> 8) & 0x3f) | ((encodedHeight & 0x03) << 6),
    (encodedHeight >>> 2) & 0xff,
    (encodedHeight >>> 10) & 0x0f,
  ]);
}

function vp8xPayload(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(10);
  writeUint24Le(bytes, 4, width - 1);
  writeUint24Le(bytes, 7, height - 1);
  return bytes;
}

function svgFixture(source: string): Uint8Array {
  return textEncoder.encode(source);
}

function expectInvalid(
  result: RuntimeImageMetadataResultV1,
  code: Extract<RuntimeImageMetadataResultV1, { readonly kind: "invalid" }>["code"],
): void {
  expect(result).toEqual({ kind: "invalid", code });
}

describe("readRuntimeImageMetadataV1", () => {
  it("reads a PNG only when the signature and complete first IHDR chunk are valid", () => {
    expect(readRuntimeImageMetadataV1(pngFixture(640, 480), "image/png")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/png", width: 640, height: 480 },
    });

    expectInvalid(
      readRuntimeImageMetadataV1(pngFixture(640, 480).subarray(0, 32), "image/png"),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(pngFixture(640, 480, 0xffff_ffff), "image/png"),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(pngFixture(0, 480), "image/png"),
      "invalid_dimensions",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(pngFixture(0x8000_0000, 480), "image/png"),
      "invalid_dimensions",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(pngFixture(640, 0x8000_0000), "image/png"),
      "invalid_dimensions",
    );
  });

  it("requires IHDR to be the first PNG chunk", () => {
    const bytes = pngFixture(20, 10);
    bytes.set(textEncoder.encode("IDAT"), 12);
    expectInvalid(readRuntimeImageMetadataV1(bytes, "image/png"), "invalid_bytes");
  });

  it("reads VP8 dimensions and bounds-checks truncated and overflowing chunks", () => {
    const valid = webpFixture(webpChunk("VP8 ", vp8Payload(320, 180)));
    expect(readRuntimeImageMetadataV1(valid, "image/webp")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/webp", width: 320, height: 180 },
    });

    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8 ", vp8Payload(320, 180).subarray(0, 9))),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8 ", new Uint8Array(), { declaredLength: 0xffff_ffff })),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(webpFixture(webpChunk("VP8 ", vp8Payload(0, 180))), "image/webp"),
      "invalid_dimensions",
    );
    const interframe = vp8Payload(320, 180);
    interframe[0] = 1;
    expectInvalid(
      readRuntimeImageMetadataV1(webpFixture(webpChunk("VP8 ", interframe)), "image/webp"),
      "invalid_bytes",
    );
  });

  it("reads VP8L dimensions, consumes odd-byte padding, and rejects malformed bounds", () => {
    const valid = webpFixture(
      webpChunk("EXIF", Uint8Array.from([1, 2, 3])),
      webpChunk("VP8L", vp8lPayload(513, 1025)),
    );
    expect(readRuntimeImageMetadataV1(valid, "image/webp")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/webp", width: 513, height: 1025 },
    });

    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8L", vp8lPayload(30, 40).subarray(0, 4))),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8L", new Uint8Array(), { declaredLength: 0xffff_ffff })),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8L", vp8lPayload(30, 40), { includePadding: false })),
        "image/webp",
      ),
      "invalid_bytes",
    );
    const nonzeroPadding = webpFixture(webpChunk("VP8L", vp8lPayload(30, 40)));
    nonzeroPadding[nonzeroPadding.byteLength - 1] = 1;
    expectInvalid(readRuntimeImageMetadataV1(nonzeroPadding, "image/webp"), "invalid_bytes");
  });

  it("reads VP8X dimensions and rejects truncated and overflowing chunks", () => {
    const valid = webpFixture(webpChunk("VP8X", vp8xPayload(1000, 700)));
    expect(readRuntimeImageMetadataV1(valid, "image/webp")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/webp", width: 1000, height: 700 },
    });

    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8X", vp8xPayload(1000, 700).subarray(0, 9))),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8X", new Uint8Array(), { declaredLength: 0xffff_ffff })),
        "image/webp",
      ),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("VP8X", vp8xPayload(65_536, 65_536))),
        "image/webp",
      ),
      "invalid_dimensions",
    );
  });

  it("validates every WebP chunk even after the first image-bearing chunk", () => {
    const malformedTrailingChunk = webpFixture(
      webpChunk("VP8 ", vp8Payload(48, 32)),
      webpChunk("JUNK", new Uint8Array(), { declaredLength: 0xffff_ffff }),
    );
    expectInvalid(
      readRuntimeImageMetadataV1(malformedTrailingChunk, "image/webp"),
      "invalid_bytes",
    );
  });

  it("rejects a WebP RIFF-size overflow and a container without an image chunk", () => {
    const overflow = webpFixture(webpChunk("VP8 ", vp8Payload(10, 10)));
    writeUint32(overflow, 4, 0xffff_ffff, true);
    expectInvalid(readRuntimeImageMetadataV1(overflow, "image/webp"), "invalid_bytes");
    expectInvalid(
      readRuntimeImageMetadataV1(
        webpFixture(webpChunk("JUNK", Uint8Array.from([1]))),
        "image/webp",
      ),
      "invalid_bytes",
    );
  });

  it("reads a structurally complete safe SVG with matching integer dimensions", () => {
    const bytes = svgFixture(`<?xml version="1.0"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="-10 5 320 180">
        <!-- safe comment -->
        <defs><linearGradient id="paint"><stop offset="1" stop-color="#fff" /></linearGradient></defs>
        <rect width="320" height="180" fill="#123456" />
        <use href="#paint" />
        <text>安全🍺</text>
      </svg>`);
    expect(readRuntimeImageMetadataV1(bytes, "image/svg+xml")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/svg+xml", width: 320, height: 180 },
    });
  });

  it("allows only standard SVG/XLink namespaces with local fragment references", () => {
    const bytes = svgFixture(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="zh" xml:space="preserve" width="1" height="1" viewBox="0 0 1 1"><use xlink:href="#paint" /></svg>',
    );
    expect(readRuntimeImageMetadataV1(bytes, "image/svg+xml")).toEqual({
      kind: "valid",
      metadata: { mediaType: "image/svg+xml", width: 1, height: 1 },
    });
  });

  it.each(["use", "textPath", "linearGradient", "radialGradient", "pattern"])(
    "allows an exact local fragment on safe <%s> references",
    (elementName) => {
      const bytes = svgFixture(
        `<svg width="1" height="1" viewBox="0 0 1 1"><${elementName} href="#paint" /></svg>`,
      );
      expect(readRuntimeImageMetadataV1(bytes, "image/svg+xml")).toEqual({
        kind: "valid",
        metadata: { mediaType: "image/svg+xml", width: 1, height: 1 },
      });
    },
  );

  it.each([
    ["ASCII space prefix", " #paint"],
    ["NBSP prefix", "\u00a0#paint"],
    ["EM SPACE prefix", "\u2003#paint"],
    ["BOM prefix", "\ufeff#paint"],
    ["ASCII space suffix", "#paint "],
  ])("rejects a non-exact local fragment: %s", (_label, href) => {
    const source = `<svg width="1" height="1" viewBox="0 0 1 1"><use href="${href}" /></svg>`;
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    ["ping", '<a href="#paint" ping="#audit" />'],
    ["target", '<a href="#paint" target="_blank" />'],
    ["download", '<a href="#paint" download="file.svg" />'],
    ["image", '<image href="#paint" />'],
    ["feImage", '<feImage href="#paint" />'],
    ["href on rect", '<rect href="#paint" />'],
    ["src fragment", '<rect src="#paint" />'],
  ])("rejects resource-capable SVG surface: %s", (_label, element) => {
    const source = `<svg width="1" height="1" viewBox="0 0 1 1">${element}</svg>`;
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    ["doctype", '<!DOCTYPE svg><svg width="1" height="1" viewBox="0 0 1 1" />'],
    [
      "entity",
      '<!DOCTYPE svg [<!ENTITY x "active">]><svg width="1" height="1" viewBox="0 0 1 1">&x;</svg>',
    ],
    ["script", '<svg width="1" height="1" viewBox="0 0 1 1"><script /></svg>'],
    [
      "namespaced script",
      '<svg xmlns:x="urn:test" width="1" height="1" viewBox="0 0 1 1"><x:script /></svg>',
    ],
    ["foreignObject", '<svg width="1" height="1" viewBox="0 0 1 1"><foreignObject /></svg>'],
    [
      "namespaced foreignObject",
      '<svg xmlns:x="urn:test" width="1" height="1" viewBox="0 0 1 1"><x:foreignObject /></svg>',
    ],
    ["event handler", '<svg width="1" height="1" viewBox="0 0 1 1" onload="go()" />'],
    [
      "namespaced event handler",
      '<svg xmlns:x="urn:test" width="1" height="1" viewBox="0 0 1 1" x:onload="go()" />',
    ],
    [
      "external URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><image href="https://example.test/a.png" /></svg>',
    ],
    [
      "data URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><image href="data:image/png;base64,AA==" /></svg>',
    ],
    [
      "CSS url()",
      '<svg width="1" height="1" viewBox="0 0 1 1"><style>.x { fill: url(#paint); }</style></svg>',
    ],
    [
      "obfuscated CSS url()",
      '<svg width="1" height="1" viewBox="0 0 1 1"><style>.x { fill: u/**/rl(#paint); }</style></svg>',
    ],
    [
      "encoded data URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><image href="d&#x61;ta:image/png;base64,AA==" /></svg>',
    ],
    [
      "encoded JavaScript URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><a href="java&#x73;cript:go()" /></svg>',
    ],
    [
      "style attribute URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><rect style="fill:url(#paint)" /></svg>',
    ],
    [
      "stylesheet processing instruction",
      '<?xml-stylesheet href="https://example.test/a.css"?><svg width="1" height="1" viewBox="0 0 1 1" />',
    ],
  ])("rejects SVG %s as active content", (_label, source) => {
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    [
      "namespaced HTML iframe srcdoc",
      '<svg xmlns:html="http://www.w3.org/1999/xhtml" width="1" height="1" viewBox="0 0 1 1"><html:iframe srcdoc="active" /></svg>',
    ],
    [
      "video poster",
      '<svg width="1" height="1" viewBox="0 0 1 1"><video poster="relative.png" /></svg>',
    ],
    [
      "SMIL set URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><set attributeName="href" to="relative.svg#active" /></svg>',
    ],
    [
      "SMIL animate URL",
      '<svg width="1" height="1" viewBox="0 0 1 1"><animate attributeName="href" values="#safe;relative.svg#active" /></svg>',
    ],
    [
      "xml:base",
      '<svg width="1" height="1" viewBox="0 0 1 1"><g xml:base="relative/"><use href="#safe" /></g></svg>',
    ],
    [
      "nonstandard namespace",
      '<svg xmlns:evil="urn:evil" width="1" height="1" viewBox="0 0 1 1" />',
    ],
    [
      "undeclared prefixed attribute",
      '<svg width="1" height="1" viewBox="0 0 1 1"><g evil:mode="active" /></svg>',
    ],
    [
      "relative CSS image-set",
      '<svg width="1" height="1" viewBox="0 0 1 1"><rect style="background-image:image-set(\'relative.png\' 1x)" /></svg>',
    ],
  ])("rejects SVG active namespace/resource surface: %s", (_label, source) => {
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    [
      "undeclared prefix",
      '<svg width="1" height="1" viewBox="0 0 1 1"><evil:path d="M0 0" /></svg>',
    ],
    [
      "declared arbitrary prefix",
      '<svg xmlns:evil="urn:evil" width="1" height="1" viewBox="0 0 1 1"><evil:path d="M0 0" /></svg>',
    ],
  ])("rejects SVG prefixed elements: %s", (_label, source) => {
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    "iframe",
    "audio",
    "video",
    "object",
    "embed",
    "canvas",
    "style",
    "handler",
    "animate",
    "animateColor",
    "set",
    "animateMotion",
    "animateTransform",
    "discard",
  ])("rejects active SVG element <%s>", (elementName) => {
    const source = `<svg width="1" height="1" viewBox="0 0 1 1"><${elementName} /></svg>`;
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "unsafe_svg");
  });

  it.each([
    ["truncated root", '<svg width="1" height="1" viewBox="0 0 1 1">'],
    [
      "trailing root",
      '<svg width="1" height="1" viewBox="0 0 1 1" /><svg width="1" height="1" viewBox="0 0 1 1" />',
    ],
    ["mismatched element", '<svg width="1" height="1" viewBox="0 0 1 1"><g></path></svg>'],
    [
      "malformed XML declaration",
      '<?xml potatoes="yes"?><svg width="1" height="1" viewBox="0 0 1 1" />',
    ],
    ["CDATA section", '<svg width="1" height="1" viewBox="0 0 1 1"><![CDATA[safe text]]></svg>'],
  ])("rejects a malformed SVG: %s", (_label, source) => {
    expectInvalid(readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"), "invalid_bytes");
  });

  it.each([
    ["zero", '<svg width="0" height="1" viewBox="0 0 0 1" />'],
    ["overflow", '<svg width="9007199254740992" height="1" viewBox="0 0 9007199254740992 1" />'],
    ["unit suffix", '<svg width="1px" height="1" viewBox="0 0 1 1" />'],
    ["viewBox mismatch", '<svg width="10" height="5" viewBox="0 0 9 5" />'],
    ["nonnumeric viewBox", '<svg width="10" height="5" viewBox="0 0 ten 5" />'],
  ])("rejects invalid SVG dimensions: %s", (_label, source) => {
    expectInvalid(
      readRuntimeImageMetadataV1(svgFixture(source), "image/svg+xml"),
      "invalid_dimensions",
    );
  });

  it("requires valid UTF-8 for declared SVG bytes", () => {
    expectInvalid(
      readRuntimeImageMetadataV1(Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0xff]), "image/svg+xml"),
      "invalid_bytes",
    );
  });

  it.each([
    [pngFixture(1, 1), "image/webp"],
    [webpFixture(webpChunk("VP8X", vp8xPayload(1, 1))), "image/svg+xml"],
    [svgFixture('<svg width="1" height="1" viewBox="0 0 1 1" />'), "image/png"],
  ] as const)(
    "rejects detected bytes that do not match the declared media type",
    (bytes, mediaType) => {
      expectInvalid(readRuntimeImageMetadataV1(bytes, mediaType), "unsupported_media");
    },
  );

  it("rejects unsupported bytes and recognizes truncated format signatures", () => {
    expectInvalid(
      readRuntimeImageMetadataV1(textEncoder.encode("not an image"), "image/png"),
      "unsupported_media",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(Uint8Array.from([137, 80, 78]), "image/png"),
      "invalid_bytes",
    );
    expectInvalid(
      readRuntimeImageMetadataV1(textEncoder.encode("RIFF"), "image/webp"),
      "invalid_bytes",
    );
  });
});
