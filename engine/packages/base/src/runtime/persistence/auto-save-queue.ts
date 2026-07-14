// SPDX-License-Identifier: MIT
import type { DeepReadonly, NonNegativeSafeInteger } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";

export interface AutoSaveQueueV1<TCandidate> {
  enqueue(candidate: DeepReadonly<TCandidate>): void;
  establishAnchor(candidate: DeepReadonly<TCandidate>): void;
  anchorEpoch(): NonNegativeSafeInteger;
  isIdle(): boolean;
  idle(): Promise<void>;
}

export interface CreateAutoSaveQueueOptionsV1<TCandidate, TResult> {
  write(candidate: DeepReadonly<TCandidate>): Promise<TResult>;
  isSuccessfulResult?(result: DeepReadonly<TResult>): boolean;
  onCurrentResult?(candidate: DeepReadonly<TCandidate>, result: TResult): void;
  onFailure?(error: unknown): void;
}

interface AutoSaveCandidateV1<TCandidate> {
  readonly candidate: DeepReadonly<TCandidate>;
  readonly epoch: NonNegativeSafeInteger;
}

type WriteSettlementV1<TResult> =
  | { readonly kind: "fulfilled"; readonly result: TResult }
  | { readonly kind: "rejected"; readonly error: unknown };

export function createAutoSaveQueueV1<TCandidate, TResult>(
  options: CreateAutoSaveQueueOptionsV1<TCandidate, TResult>,
): AutoSaveQueueV1<TCandidate> {
  if (typeof options.write !== "function") {
    throw new TypeError("Auto Save queue requires a writer");
  }
  if (options.onCurrentResult !== undefined && typeof options.onCurrentResult !== "function") {
    throw new TypeError("invalid Auto Save result callback");
  }
  if (
    options.isSuccessfulResult !== undefined &&
    typeof options.isSuccessfulResult !== "function"
  ) {
    throw new TypeError("invalid Auto Save success predicate");
  }
  if (options.onFailure !== undefined && typeof options.onFailure !== "function") {
    throw new TypeError("invalid Auto Save failure callback");
  }

  let epoch = parseNonNegativeSafeInteger(0);
  let running: AutoSaveCandidateV1<TCandidate> | null = null;
  let pending: AutoSaveCandidateV1<TCandidate> | null = null;
  let requiredRepair: AutoSaveCandidateV1<TCandidate> | null = null;
  let repairOutstanding = false;
  const idleResolvers = new Set<() => void>();

  const reportFailureV1 = (error: unknown): void => {
    try {
      options.onFailure?.(error);
    } catch {
      // Failure reporting is diagnostic and cannot break the queue tail.
    }
  };

  const publishCurrentResultV1 = (
    entry: AutoSaveCandidateV1<TCandidate>,
    result: TResult,
  ): void => {
    try {
      options.onCurrentResult?.(entry.candidate, result);
    } catch (error) {
      reportFailureV1(error);
    }
  };

  const resolveIdleV1 = (): void => {
    if (running !== null || pending !== null || requiredRepair !== null || repairOutstanding) {
      return;
    }
    const resolvers = [...idleResolvers];
    idleResolvers.clear();
    for (const resolve of resolvers) resolve();
  };

  const resultCompletedWriteV1 = (result: TResult): boolean => {
    try {
      return options.isSuccessfulResult?.(result as DeepReadonly<TResult>) ?? true;
    } catch (error) {
      reportFailureV1(error);
      return false;
    }
  };

  const startV1 = (entry: AutoSaveCandidateV1<TCandidate>): void => {
    running = entry;
    let write: Promise<TResult>;
    try {
      write = Promise.resolve(options.write(entry.candidate));
    } catch (error) {
      write = Promise.reject(error);
    }

    void write.then(
      (result) => settleV1(entry, Object.freeze({ kind: "fulfilled", result })),
      (error: unknown) => settleV1(entry, Object.freeze({ kind: "rejected", error })),
    );
  };

  const settleV1 = (
    entry: AutoSaveCandidateV1<TCandidate>,
    settlement: WriteSettlementV1<TResult>,
  ): void => {
    if (running !== entry) {
      reportFailureV1(new TypeError("Auto Save queue settled an inactive write"));
      return;
    }

    if (settlement.kind === "rejected") {
      reportFailureV1(settlement.error);
    } else if (entry.epoch === epoch) {
      publishCurrentResultV1(entry, settlement.result);
    }

    const completedCurrentWrite =
      entry.epoch === epoch &&
      settlement.kind === "fulfilled" &&
      resultCompletedWriteV1(settlement.result);
    if (completedCurrentWrite) repairOutstanding = false;

    running = null;
    const next = requiredRepair ?? pending;
    if (requiredRepair !== null) requiredRepair = null;
    else pending = null;
    if (next !== null) {
      startV1(next);
      return;
    }
    if (entry.epoch === epoch && repairOutstanding) {
      requiredRepair = entry;
      return;
    }
    resolveIdleV1();
  };

  return Object.freeze({
    enqueue(candidate: DeepReadonly<TCandidate>) {
      const entry = Object.freeze({ candidate, epoch });
      if (running === null) {
        if (repairOutstanding) requiredRepair = null;
        startV1(entry);
        return;
      }
      pending = entry;
    },

    establishAnchor(candidate: DeepReadonly<TCandidate>) {
      const nextEpoch = parseNonNegativeSafeInteger(epoch + 1);
      epoch = nextEpoch;
      pending = null;
      const repair = Object.freeze({ candidate, epoch: nextEpoch });
      if (running === null) {
        if (repairOutstanding) {
          requiredRepair = null;
          startV1(repair);
        } else {
          requiredRepair = null;
        }
        return;
      }
      repairOutstanding = true;
      requiredRepair = repair;
    },

    anchorEpoch: () => epoch,

    isIdle: () =>
      running === null && pending === null && requiredRepair === null && !repairOutstanding,

    idle() {
      if (running === null && pending === null && requiredRepair === null && !repairOutstanding) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        idleResolvers.add(resolve);
      });
    },
  });
}
