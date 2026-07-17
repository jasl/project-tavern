// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSymbolRegistryV1,
  parseGameSymbolIdV1,
  type GameSymbolIdV1,
  type GameSymbolProviderV1,
  type GameSymbolRenderPropsV1,
  type GameSymbolSizeV1,
} from "@sillymaker/ui";
import type { CSSProperties, ReactElement } from "react";

import { pocGameSymbolIdsV1 } from "./poc-game-symbol-ids.js";
import styles from "./poc-game-symbols.module.css";

const parsedPocGameSymbolIdsV1 = Object.freeze(
  pocGameSymbolIdsV1.map((symbolId) => parseGameSymbolIdV1(symbolId)),
);

export const pocGameSymbolIdsByRoleV1 = Object.freeze({
  stamina: parsedPocGameSymbolIdsV1[0]!,
  mood: parsedPocGameSymbolIdsV1[1]!,
  cash: parsedPocGameSymbolIdsV1[2]!,
  reputation: parsedPocGameSymbolIdsV1[3]!,
  levy: parsedPocGameSymbolIdsV1[4]!,
  ingredient: parsedPocGameSymbolIdsV1[5]!,
  affection: parsedPocGameSymbolIdsV1[6]!,
  teamwork: parsedPocGameSymbolIdsV1[7]!,
  purchase: parsedPocGameSymbolIdsV1[8]!,
  service: parsedPocGameSymbolIdsV1[9]!,
  ledger: parsedPocGameSymbolIdsV1[10]!,
  facility: parsedPocGameSymbolIdsV1[11]!,
  coldStorage: parsedPocGameSymbolIdsV1[12]!,
  comfortableBed: parsedPocGameSymbolIdsV1[13]!,
});

export type PocGameSymbolRoleV1 = keyof typeof pocGameSymbolIdsByRoleV1;

const symbolSizeStylesV1 = Object.freeze({
  16: Object.freeze({ width: 16, height: 16 }),
  20: Object.freeze({ width: 20, height: 20 }),
  24: Object.freeze({ width: 24, height: 24 }),
  32: Object.freeze({ width: 32, height: 32 }),
}) satisfies Readonly<Record<GameSymbolSizeV1, CSSProperties>>;

function symbolGraphicV1(role: PocGameSymbolRoleV1): ReactElement {
  switch (role) {
    case "stamina":
      return (
        <path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z" />
      );
    case "mood":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 10h.01M15.5 10h.01M8 15c1.2 1.1 2.5 1.6 4 1.6s2.8-.5 4-1.6" />
        </>
      );
    case "cash":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.2 3 1 3 2.3-1.3 2.5-3.2 2.5c-1.2 0-2.3-.4-3.1-1.1M12 5.5v13" />
        </>
      );
    case "reputation":
      return (
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      );
    case "levy":
      return (
        <>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      );
    case "ingredient":
      return (
        <path d="M12 21V9m0 6c-4 0-7-2.2-7-6 4 0 7 2.2 7 6Zm0-3c4 0 7-2.2 7-6-4 0-7 2.2-7 6Z" />
      );
    case "affection":
      return (
        <path d="M12 20s-7-4.2-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.8 12 20 12 20Z" />
      );
    case "teamwork":
      return (
        <>
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3.5 19c.6-3.2 2.1-5 4.5-5s3.9 1.8 4.5 5M11.5 19c.6-3.2 2.1-5 4.5-5s3.9 1.8 4.5 5" />
        </>
      );
    case "purchase":
      return (
        <>
          <path d="M4 8h16l-2 11H6L4 8Z" />
          <path d="M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        </>
      );
    case "service":
      return (
        <>
          <path d="M3 17h18M5 17a7 7 0 0 1 14 0" />
          <path d="M12 7V4" />
        </>
      );
    case "ledger":
      return (
        <>
          <path d="M5 3h13a1 1 0 0 1 1 1v17H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M8 8h7M8 12h7M8 16h4" />
        </>
      );
    case "facility":
      return (
        <>
          <path d="m3 11 9-7 9 7M6 10v10h12V10" />
          <path d="M9 20v-6h6v6" />
        </>
      );
    case "coldStorage":
      return (
        <path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11M9.5 4 12 6.5 14.5 4M9.5 20l2.5-2.5 2.5 2.5" />
      );
    case "comfortableBed":
      return (
        <>
          <path d="M3 18V8M3 14h18v4M7 14v-4h5a3 3 0 0 1 3 3v1M3 18v2M21 18v2" />
          <path d="M15 10h3a3 3 0 0 1 3 3v1" />
        </>
      );
  }
  const unsupportedRole: never = role;
  throw new TypeError(`unsupported PoC game-symbol role: ${String(unsupportedRole)}`);
}

function createPocCodeSymbolProviderV1(
  symbolId: GameSymbolIdV1,
  role: PocGameSymbolRoleV1,
): GameSymbolProviderV1 {
  function PocCodeGameSymbolV1(props: GameSymbolRenderPropsV1): ReactElement {
    const decorative = props.decorative === true;
    return (
      <svg
        className={styles["poc-game-symbol"]}
        viewBox="0 0 24 24"
        width={props.size}
        height={props.size}
        style={symbolSizeStylesV1[props.size]}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : props.accessibleName}
        aria-hidden={decorative ? true : undefined}
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-poc-game-symbol-role={role}
      >
        {symbolGraphicV1(role)}
      </svg>
    );
  }

  return Object.freeze({ symbolId, component: PocCodeGameSymbolV1 });
}

export const pocGameSymbolProvidersV1 = Object.freeze(
  (
    Object.entries(pocGameSymbolIdsByRoleV1) as readonly (readonly [
      PocGameSymbolRoleV1,
      GameSymbolIdV1,
    ])[]
  ).map(([role, symbolId]) => createPocCodeSymbolProviderV1(symbolId, role)),
) satisfies readonly GameSymbolProviderV1[];

export const pocGameSymbolRegistryV1 = createGameSymbolRegistryV1(pocGameSymbolProvidersV1);
