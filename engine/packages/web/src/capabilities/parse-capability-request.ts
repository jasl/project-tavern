// SPDX-License-Identifier: MIT
import type { RuntimeCapabilityIdV1 } from "@sillymaker/base";

export type CapabilityRequestRejectionCodeV1 =
  "capability.malformed_request" | "capability.unknown_request" | "capability.duplicate_request";

export type CapabilityRequestParseResultV1 =
  | {
      readonly kind: "accepted";
      readonly requested: readonly RuntimeCapabilityIdV1[];
    }
  | {
      readonly kind: "rejected";
      readonly code: CapabilityRequestRejectionCodeV1;
    };

const acceptedCapabilitiesV1 = new Set<RuntimeCapabilityIdV1>([
  "debug_tools",
  "cheats",
  "automation_bridge",
]);

function rejectV1(code: CapabilityRequestRejectionCodeV1): CapabilityRequestParseResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function decodeQueryComponentV1(value: string): string | null {
  try {
    return decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    return null;
  }
}

/** Parses a page-local request without admitting any partial capability overlay. */
export function parseCapabilityRequestV1(query: string): CapabilityRequestParseResultV1 {
  const encodedQuery = query.startsWith("?") ? query.slice(1) : query;
  if (encodedQuery.length === 0) {
    return Object.freeze({ kind: "accepted", requested: Object.freeze([]) });
  }

  const requested: RuntimeCapabilityIdV1[] = [];
  const seen = new Set<RuntimeCapabilityIdV1>();
  for (const member of encodedQuery.split("&")) {
    if (member.length === 0) return rejectV1("capability.malformed_request");
    const separator = member.indexOf("=");
    if (separator < 0) return rejectV1("capability.malformed_request");
    const key = decodeQueryComponentV1(member.slice(0, separator));
    const value = decodeQueryComponentV1(member.slice(separator + 1));
    if (key === null || value === null || key !== "capability" || value.length === 0) {
      return rejectV1("capability.malformed_request");
    }
    if (!acceptedCapabilitiesV1.has(value as RuntimeCapabilityIdV1)) {
      return rejectV1("capability.unknown_request");
    }
    const capability = value as RuntimeCapabilityIdV1;
    if (seen.has(capability)) return rejectV1("capability.duplicate_request");
    seen.add(capability);
    requested.push(capability);
  }

  return Object.freeze({ kind: "accepted", requested: Object.freeze(requested) });
}
