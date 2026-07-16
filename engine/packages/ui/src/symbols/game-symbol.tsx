// SPDX-License-Identifier: MIT
import { Component, type CSSProperties, type ReactElement, type ReactNode } from "react";
import {
  type GameSymbolAccessibilityV1,
  type GameSymbolIdV1,
  type GameSymbolRegistryV1,
  type GameSymbolRenderPropsV1,
  type GameSymbolSizeV1,
} from "./game-symbol-registry.js";

export type GameSymbolPropsV1 = {
  readonly registry: GameSymbolRegistryV1;
  readonly symbolId: GameSymbolIdV1;
  readonly size: GameSymbolSizeV1;
} & GameSymbolAccessibilityV1;

const supportedSizesV1 = new Set<number>([16, 20, 24, 32]);
const fallbackBaseStyleV1 = Object.freeze({
  alignItems: "center",
  background: "currentColor",
  border: "1px solid currentColor",
  borderRadius: "50%",
  boxSizing: "border-box",
  color: "currentColor",
  display: "inline-flex",
  flex: "0 0 auto",
  justifyContent: "center",
  opacity: 1,
  pointerEvents: "none",
  userSelect: "none",
}) satisfies CSSProperties;

interface GameSymbolProviderBoundaryPropsV1 {
  readonly children: ReactNode;
  readonly fallback: ReactElement;
}

interface GameSymbolProviderBoundaryStateV1 {
  readonly failed: boolean;
}

class GameSymbolProviderBoundaryV1 extends Component<
  GameSymbolProviderBoundaryPropsV1,
  GameSymbolProviderBoundaryStateV1
> {
  public state: GameSymbolProviderBoundaryStateV1 = Object.freeze({ failed: false });

  public static getDerivedStateFromError(): GameSymbolProviderBoundaryStateV1 {
    return Object.freeze({ failed: true });
  }

  public render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function assertSupportedSizeV1(size: number): asserts size is GameSymbolSizeV1 {
  if (!supportedSizesV1.has(size)) throw new TypeError("ui.game_symbol_size_invalid");
}

function renderPropsV1(props: GameSymbolPropsV1): GameSymbolRenderPropsV1 {
  if (props.decorative !== undefined && typeof props.decorative !== "boolean") {
    throw new TypeError("ui.game_symbol_accessibility_invalid");
  }

  if (props.decorative === true) {
    if ("accessibleName" in props && props.accessibleName !== undefined) {
      throw new TypeError("ui.game_symbol_accessibility_invalid");
    }
    return Object.freeze({ size: props.size, decorative: true });
  }

  if (typeof props.accessibleName !== "string" || props.accessibleName.trim().length === 0) {
    throw new TypeError("ui.game_symbol_accessibility_invalid");
  }

  return props.decorative === false
    ? Object.freeze({
        size: props.size,
        accessibleName: props.accessibleName,
        decorative: false,
      })
    : Object.freeze({ size: props.size, accessibleName: props.accessibleName });
}

function GameSymbolFallbackV1(props: {
  readonly symbolId: GameSymbolIdV1;
  readonly renderProps: GameSymbolRenderPropsV1;
}): ReactElement {
  const decorative = props.renderProps.decorative === true;
  const sizeStyle = Object.freeze({
    ...fallbackBaseStyleV1,
    height: props.renderProps.size,
    width: props.renderProps.size,
  }) satisfies CSSProperties;

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : props.renderProps.accessibleName}
      aria-hidden={decorative ? true : undefined}
      data-game-symbol-fallback={props.symbolId}
      style={sizeStyle}
    >
      <span aria-hidden="true">◇</span>
    </span>
  );
}

export function GameSymbolV1(props: GameSymbolPropsV1): ReactElement {
  assertSupportedSizeV1(props.size);
  const renderProps = renderPropsV1(props);
  const resolution = props.registry.resolve(props.symbolId);
  const fallback = <GameSymbolFallbackV1 symbolId={props.symbolId} renderProps={renderProps} />;

  if (resolution.kind === "not_found") return fallback;

  const Provider = resolution.component;
  return (
    <GameSymbolProviderBoundaryV1 key={props.symbolId} fallback={fallback}>
      <Provider {...renderProps} />
    </GameSymbolProviderBoundaryV1>
  );
}
