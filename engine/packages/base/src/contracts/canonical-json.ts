// SPDX-License-Identifier: MIT

export type CanonicalJsonErrorCodeV1 =
  | "value.undefined"
  | "value.sparse_array"
  | "value.cycle"
  | "value.custom_prototype"
  | "value.function"
  | "value.getter"
  | "number.non_finite"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero"
  | "string.lone_surrogate";

export class CanonicalJsonError extends Error {
  readonly name = "CanonicalJsonError";
  readonly code: CanonicalJsonErrorCodeV1;
  readonly path: string;

  constructor(code: CanonicalJsonErrorCodeV1, path: string) {
    super(`${code} at ${path || "/"}`);
    this.code = code;
    this.path = path;
  }
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function assertValidString(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        throw new CanonicalJsonError("string.lone_surrogate", path);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new CanonicalJsonError("string.lone_surrogate", path);
    }
  }
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function utf8(value: string): Uint8Array {
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let codePoint = first;
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      codePoint = 0x1_0000 + ((first - 0xd800) << 10) + (second - 0xdc00);
      index += 1;
    }
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  const active = new Set<object>();

  function encode(current: unknown, path: string): string {
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "string") {
      assertValidString(current, path);
      return JSON.stringify(current);
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new CanonicalJsonError("number.non_finite", path);
      }
      if (!Number.isInteger(current)) {
        throw new CanonicalJsonError("number.not_integer", path);
      }
      if (!Number.isSafeInteger(current)) {
        throw new CanonicalJsonError("number.unsafe_integer", path);
      }
      if (Object.is(current, -0)) {
        throw new CanonicalJsonError("number.negative_zero", path);
      }
      return String(current);
    }
    if (typeof current === "undefined" || typeof current === "symbol") {
      throw new CanonicalJsonError("value.undefined", path);
    }
    if (typeof current === "function") {
      throw new CanonicalJsonError("value.function", path);
    }

    const object = current as object;
    if (active.has(object)) throw new CanonicalJsonError("value.cycle", path);
    active.add(object);
    try {
      if (Array.isArray(object)) {
        const values = [];
        for (let index = 0; index < object.length; index += 1) {
          if (!Object.hasOwn(object, index)) {
            throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
          }
          values.push(encode(object[index], `${path}/${index}`));
        }
        return `[${values.join(",")}]`;
      }

      if (Object.getPrototypeOf(object) !== Object.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const keys = Object.keys(descriptors).sort(compareCodePoints);
      const members = [];
      for (const key of keys) {
        const descriptor = descriptors[key];
        if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
          throw new CanonicalJsonError("value.getter", `${path}/${pointerSegment(key)}`);
        }
        assertValidString(key, path);
        members.push(
          `${JSON.stringify(key)}:${encode(descriptor?.value, `${path}/${pointerSegment(key)}`)}`,
        );
      }
      return `{${members.join(",")}}`;
    } finally {
      active.delete(object);
    }
  }

  return utf8(encode(value, ""));
}
