// SPDX-License-Identifier: MIT
import type { DebugFixtureListResultV1, DebugToolsOperationResultV1 } from "@sillymaker/base";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/Button.js";

export type FixtureBrowserAnchorResultV1 =
  { readonly kind: "anchored" } | { readonly kind: "rejected"; readonly message: string };

export interface FixtureBrowserPropsV1<TFixtureId extends string> {
  readonly listFixtures: () => Promise<DebugFixtureListResultV1<TFixtureId>>;
  readonly inspectFixture: (fixtureId: TFixtureId) => void | Promise<void>;
  readonly anchorFixture: (
    fixtureId: TFixtureId,
  ) => Promise<DebugToolsOperationResultV1<FixtureBrowserAnchorResultV1>>;
  readonly canAnchor: boolean;
  readonly disabledReason: string;
}

type FixtureListStateV1<TFixtureId extends string> =
  | { readonly kind: "loading" }
  | { readonly kind: "listed"; readonly fixtureIds: readonly TFixtureId[] }
  | { readonly kind: "capability_disabled" }
  | { readonly kind: "failed" };

type FixtureOperationStateV1<TFixtureId extends string> =
  | { readonly kind: "idle" }
  | { readonly kind: "pending"; readonly fixtureId: TFixtureId }
  | { readonly kind: "inspected" | "anchored" }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "capability_disabled" | "failed" };

export function FixtureBrowserV1<TFixtureId extends string>(
  props: FixtureBrowserPropsV1<TFixtureId>,
): ReactElement {
  const { listFixtures } = props;
  const [listState, setListState] = useState<FixtureListStateV1<TFixtureId>>({ kind: "loading" });
  const [operationState, setOperationState] = useState<FixtureOperationStateV1<TFixtureId>>({
    kind: "idle",
  });
  const requestGenerationRef = useRef(0);
  const operationGenerationRef = useRef(0);
  const operationPendingRef = useRef(false);
  const disabledReasonId = useId();

  const refresh = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    operationGenerationRef.current += 1;
    operationPendingRef.current = false;
    setListState({ kind: "loading" });
    setOperationState({ kind: "idle" });
    try {
      const result = await listFixtures();
      if (generation !== requestGenerationRef.current) return;
      if (result.kind === "capability_disabled") {
        setListState({ kind: "capability_disabled" });
        return;
      }
      setListState({ kind: "listed", fixtureIds: Object.freeze([...result.fixtureIds]) });
    } catch {
      if (generation === requestGenerationRef.current) setListState({ kind: "failed" });
    }
  }, [listFixtures]);

  useEffect(() => {
    void refresh();
    return () => {
      requestGenerationRef.current += 1;
      operationGenerationRef.current += 1;
      operationPendingRef.current = false;
    };
  }, [refresh]);

  async function inspectFixture(fixtureId: TFixtureId): Promise<void> {
    if (operationPendingRef.current) return;
    operationPendingRef.current = true;
    const generation = ++operationGenerationRef.current;
    setOperationState({ kind: "pending", fixtureId });
    try {
      await props.inspectFixture(fixtureId);
      if (generation !== operationGenerationRef.current) return;
      operationPendingRef.current = false;
      setOperationState({ kind: "inspected" });
    } catch {
      if (generation === operationGenerationRef.current) {
        operationPendingRef.current = false;
        setOperationState({ kind: "failed" });
      }
    }
  }

  async function anchorFixture(fixtureId: TFixtureId): Promise<void> {
    if (!props.canAnchor || operationPendingRef.current) return;
    operationPendingRef.current = true;
    const generation = ++operationGenerationRef.current;
    setOperationState({ kind: "pending", fixtureId });
    try {
      const result = await props.anchorFixture(fixtureId);
      if (generation !== operationGenerationRef.current) return;
      operationPendingRef.current = false;
      if (result.kind === "capability_disabled") {
        setOperationState({ kind: "capability_disabled" });
        return;
      }
      setOperationState(
        result.kind === "anchored"
          ? { kind: "anchored" }
          : { kind: "rejected", message: result.message },
      );
    } catch {
      if (generation === operationGenerationRef.current) {
        operationPendingRef.current = false;
        setOperationState({ kind: "failed" });
      }
    }
  }

  const pendingFixtureId = operationState.kind === "pending" ? operationState.fixtureId : undefined;
  const operationPending = operationState.kind === "pending";

  return (
    <section aria-label="夹具浏览器" onClick={(event) => event.stopPropagation()}>
      <header>
        <h3>夹具</h3>
        <Button
          onClick={() => void refresh()}
          disabled={listState.kind === "loading" || operationPending}
        >
          刷新夹具
        </Button>
      </header>

      {listState.kind === "loading" ? <p role="status">正在读取夹具</p> : null}
      {listState.kind === "capability_disabled" ? <p role="status">调试工具已关闭</p> : null}
      {listState.kind === "failed" ? <p role="alert">无法读取夹具</p> : null}
      {listState.kind === "listed" && listState.fixtureIds.length === 0 ? (
        <p role="status">没有可用夹具</p>
      ) : null}
      {listState.kind === "listed" && listState.fixtureIds.length > 0 ? (
        <ul aria-label="可用夹具">
          {listState.fixtureIds.map((fixtureId) => {
            return (
              <li key={fixtureId}>
                <span>{fixtureId}</span>
                <Button disabled={operationPending} onClick={() => void inspectFixture(fixtureId)}>
                  检查夹具 {fixtureId}
                </Button>
                <Button
                  aria-describedby={!props.canAnchor ? disabledReasonId : undefined}
                  disabled={!props.canAnchor || operationPending}
                  onClick={() => void anchorFixture(fixtureId)}
                >
                  载入夹具 {fixtureId}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!props.canAnchor ? <p id={disabledReasonId}>{props.disabledReason}</p> : null}
      <div aria-live="polite">
        {operationState.kind === "pending" ? (
          <p role="status">正在处理夹具 {pendingFixtureId}</p>
        ) : null}
        {operationState.kind === "inspected" ? <p>夹具检查已打开</p> : null}
        {operationState.kind === "anchored" ? <p>夹具已载入</p> : null}
        {operationState.kind === "rejected" ? <p role="alert">{operationState.message}</p> : null}
        {operationState.kind === "capability_disabled" ? <p>调试工具已关闭</p> : null}
        {operationState.kind === "failed" ? <p>夹具操作失败</p> : null}
      </div>
    </section>
  );
}
