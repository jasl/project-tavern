// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import type {
  GameHostV1,
  GameBootstrapResolutionResultV1,
  GamePackageV1,
  HotfixEntryV1,
} from "@project-tavern/base";
import { canonicalJsonBytes, resolveGamePackageV1 } from "@project-tavern/base";
import type { ResolvedStoryV1 } from "@project-tavern/base";
import type { HostRecordMutationV1 } from "@project-tavern/base";

export type { GameBootstrapResolutionResultV1 } from "@project-tavern/base";

type BuildIdentity = Parameters<typeof resolveGamePackageV1>[2];
const identityKey = "bootstrap.last-success" as HostRecordMutationV1["key"];

export function createGameBootstrapControllerV1(input: {
  readonly host: GameHostV1;
  readonly buildIdentity: BuildIdentity;
}) {
  return async function bootstrap(
    entry: GamePackageV1<unknown, unknown>,
    hotfixes: readonly HotfixEntryV1[],
  ): Promise<GameBootstrapResolutionResultV1<ResolvedStoryV1, ResolvedStoryV1["provenance"]>> {
    const previous = await input.host.records.read("settings", identityKey);
    const last =
      previous === null
        ? null
        : (JSON.parse(new TextDecoder().decode(previous.bytes)) as ResolvedStoryV1["provenance"]);
    const baseResult = resolveGamePackageV1(entry, [], input.buildIdentity);
    if (baseResult.kind === "failed") {
      return Object.freeze({
        kind: "fatal",
        code: baseResult.failure.code,
        rejectedHotfixIds: Object.freeze([]),
        details: baseResult.failure.details,
        lastSuccessfulResolvedIdentity: last,
      });
    }
    const base = baseResult.resolved;
    if (hotfixes.length === 0) {
      await input.host.records.commit([
        {
          kind: "put",
          namespace: "settings",
          key: identityKey,
          expectedRevision: previous?.revision ?? null,
          bytes: canonicalJsonBytes(base.provenance),
        },
      ]);
      return Object.freeze({
        kind: "ready",
        base,
        resolved: base,
        lastSuccessfulResolvedIdentity: last,
      });
    }
    const candidate = resolveGamePackageV1(entry, hotfixes, input.buildIdentity);
    if (candidate.kind === "failed") {
      return Object.freeze({
        kind: "safe_mode",
        base,
        resolved: base,
        code: candidate.failure.code,
        rejectedHotfixIds: candidate.failure.rejectedHotfixIds,
        details: candidate.failure.details,
        lastSuccessfulResolvedIdentity: last,
      });
    }
    await input.host.records.commit([
      {
        kind: "put",
        namespace: "settings",
        key: identityKey,
        expectedRevision: previous?.revision ?? null,
        bytes: canonicalJsonBytes(candidate.resolved.provenance),
      },
    ]);
    return Object.freeze({
      kind: "ready",
      base,
      resolved: candidate.resolved,
      lastSuccessfulResolvedIdentity: last,
    });
  };
}

type LoaderResult<T> = GameBootstrapResolutionResultV1<T, unknown>;
export function Loader<T>({
  bootstrap,
  retryBase,
  onReady,
}: {
  readonly bootstrap: () => Promise<LoaderResult<T>>;
  readonly retryBase?: () => Promise<LoaderResult<T>>;
  readonly onReady: (resolved: T) => void;
}) {
  const [result, setResult] = useState<LoaderResult<T> | null>(null);
  useEffect(() => {
    let active = true;
    void bootstrap().then((next) => {
      if (!active) return;
      setResult(next);
      if (next.kind === "ready") onReady(next.resolved);
    });
    return () => {
      active = false;
    };
  }, [bootstrap, onReady]);
  if (result === null) return <p role="status">正在启动…</p>;
  if (result.kind === "fatal") return <section role="alert">启动失败：{result.code}</section>;
  if (result.kind === "safe_mode") {
    const startSafe = async () => {
      if (retryBase === undefined) {
        onReady(result.base);
        return;
      }
      const retried = await retryBase();
      setResult(retried);
      if (retried.kind === "ready") onReady(retried.resolved);
    };
    return (
      <section role="alert">
        <p>安全模式：{result.code}</p>
        <p>{result.rejectedHotfixIds.join(", ")}</p>
        <button type="button" onClick={() => void startSafe()}>
          禁用补丁并安全启动
        </button>
      </section>
    );
  }
  return <p role="status">已启动</p>;
}
