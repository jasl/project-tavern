// SPDX-License-Identifier: MIT
import type { RuntimeOperationFaultV1 } from "../../contracts/diagnostics.js";

export const runtimeDiagnosticTextLimitsV1 = Object.freeze({
  operation: 4_096,
  cause: 4_096,
  message: 65_536,
  stack: 65_536,
});

const redactedPathV1 = "<redacted-path>";
const truncationMarkerV1 = "…";

const quotedAbsolutePathV1 =
  /(["'`])(?:file:\/\/\/(?:[A-Za-z]:\/)?|[A-Za-z]:[\\/]|\\\\|\/(?!\/))(?:(?!\1)[^\r\n])*\1/giu;
const angleWrappedAbsolutePathV1 =
  /<(?:file:\/\/\/(?:[A-Za-z]:\/)?|[A-Za-z]:[\\/]|\\\\|\/(?!\/))[^>\r\n]*>/giu;
const fileUrlPathV1 = /\bfile:\/\/\/(?:[A-Za-z]:\/)?[^\r\n)\]}>'"`;,]*/giu;
const windowsAbsolutePathV1 = /(?:\b[A-Za-z]:[\\/]|\\\\)[^\r\n<>|?*"'`;,)\]}]*/gu;
const posixAbsolutePathV1 = /(^|[^\p{L}\p{N}_./])(\/(?!\/)[^\r\n)\]}>'"`;,]*)/gu;

function redactAbsolutePathsV1(value: string): string {
  return value
    .replace(quotedAbsolutePathV1, (match) => `${match[0]}${redactedPathV1}${match[0]}`)
    .replace(angleWrappedAbsolutePathV1, redactedPathV1)
    .replace(fileUrlPathV1, redactedPathV1)
    .replace(windowsAbsolutePathV1, redactedPathV1)
    .replace(posixAbsolutePathV1, (_match, prefix: string) => `${prefix}${redactedPathV1}`);
}

function safeUnicodeSymbolV1(symbol: string): string {
  if (symbol.length > 1) return symbol;
  const code = symbol.charCodeAt(0);
  return code >= 0xd800 && code <= 0xdfff ? "�" : symbol;
}

function utf8SymbolByteLengthV1(symbol: string): number {
  const codePoint = symbol.codePointAt(0);
  if (codePoint === undefined) return 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function truncateUtf8V1(value: string, maximumBytes: number): string {
  const symbols: string[] = [];
  const symbolBytes: number[] = [];
  let byteLength = 0;
  let truncated = false;

  for (const sourceSymbol of value) {
    const symbol = safeUnicodeSymbolV1(sourceSymbol);
    const bytes = utf8SymbolByteLengthV1(symbol);
    if (byteLength + bytes > maximumBytes) {
      truncated = true;
      break;
    }
    symbols.push(symbol);
    symbolBytes.push(bytes);
    byteLength += bytes;
  }

  if (!truncated) return symbols.join("");

  const markerBytes = utf8SymbolByteLengthV1(truncationMarkerV1);
  while (symbols.length > 0 && byteLength + markerBytes > maximumBytes) {
    symbols.pop();
    byteLength -= symbolBytes.pop() ?? 0;
  }
  if (markerBytes <= maximumBytes) symbols.push(truncationMarkerV1);
  return symbols.join("");
}

/** Redacts absolute paths before truncating diagnostic text to a UTF-8 byte limit. */
export function scrubDiagnosticTextV1(value: string, maximumBytes: number): string {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new TypeError("invalid diagnostic text limit");
  }
  return truncateUtf8V1(redactAbsolutePathsV1(value), maximumBytes);
}

/** Returns a detached runtime fault whose diagnostic text is path-redacted and byte-bounded. */
export function scrubRuntimeOperationFaultV1(
  fault: RuntimeOperationFaultV1,
): RuntimeOperationFaultV1 {
  const cause =
    fault.cause === undefined
      ? undefined
      : Object.freeze({
          name: scrubDiagnosticTextV1(fault.cause.name, runtimeDiagnosticTextLimitsV1.cause),
          message: scrubDiagnosticTextV1(fault.cause.message, runtimeDiagnosticTextLimitsV1.cause),
        });

  return Object.freeze({
    occurredAt: fault.occurredAt,
    operation: scrubDiagnosticTextV1(fault.operation, runtimeDiagnosticTextLimitsV1.operation),
    message: scrubDiagnosticTextV1(fault.message, runtimeDiagnosticTextLimitsV1.message),
    ...(fault.stack === undefined
      ? {}
      : { stack: scrubDiagnosticTextV1(fault.stack, runtimeDiagnosticTextLimitsV1.stack) }),
    ...(cause === undefined ? {} : { cause }),
    category: fault.category,
    code: fault.code,
  }) as RuntimeOperationFaultV1;
}
