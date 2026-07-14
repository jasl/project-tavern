// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createAutoSaveQueueV1 } from "./auto-save-queue.js";

interface DeferredV1<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferredV1<T>(): DeferredV1<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: unknown) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return Object.freeze({
    promise,
    resolve(value: T) {
      resolvePromise?.(value);
    },
    reject(error: unknown) {
      rejectPromise?.(error);
    },
  });
}

async function flushV1(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Auto Save queue", () => {
  it("coalesces only candidates that have not started", async () => {
    const first = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? first.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    expect(written).toEqual([1]);

    first.resolve("saved:1");
    await queue.idle();

    expect(written).toEqual([1, 3]);
  });

  it("repairs a blocked old-epoch write with the latest anchor", async () => {
    const oldWrite = deferredV1<string>();
    const written: number[] = [];
    const visible: Array<readonly [number, string]> = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 3 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
      onCurrentResult(candidate, result) {
        visible.push([candidate, result]);
      },
    });

    queue.enqueue(3);
    queue.establishAnchor(0);
    expect(queue.anchorEpoch()).toBe(1);
    queue.establishAnchor(7);
    expect(queue.anchorEpoch()).toBe(2);
    oldWrite.resolve("saved:3");
    await queue.idle();

    expect(written).toEqual([3, 7]);
    expect(visible).toEqual([[7, "saved:7"]]);
  });

  it("drops old-epoch pending candidates before the anchor repair", async () => {
    const oldWrite = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.establishAnchor(0);
    oldWrite.resolve("saved:1");
    await queue.idle();

    expect(written).toEqual([1, 0]);
  });

  it("does not resolve idle until a required repair finishes", async () => {
    const oldWrite = deferredV1<string>();
    const repairWrite = deferredV1<string>();
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        return candidate === 4 ? oldWrite.promise : repairWrite.promise;
      },
    });

    queue.enqueue(4);
    queue.establishAnchor(0);
    let idle = false;
    const idlePromise = queue.idle().then(() => {
      idle = true;
    });

    oldWrite.resolve("saved:4");
    await flushV1();
    expect(idle).toBe(false);

    repairWrite.resolve("saved:0");
    await idlePromise;
    expect(idle).toBe(true);
  });

  it("keeps a rejected repair non-idle until a later current-epoch candidate succeeds", async () => {
    type ResultV1 =
      | { readonly kind: "saved"; readonly sequence: number }
      | { readonly kind: "rejected"; readonly code: "conflict" };

    const oldWrite = deferredV1<ResultV1>();
    const repairAttempted = deferredV1<void>();
    const written: number[] = [];
    let currentSequence: number | null = null;
    const queue = createAutoSaveQueueV1<number, ResultV1>({
      async write(candidate) {
        written.push(candidate);
        if (candidate === 3) {
          const result = await oldWrite.promise;
          currentSequence = candidate;
          return result;
        }
        if (candidate === 0) {
          repairAttempted.resolve();
          return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
        }
        currentSequence = candidate;
        return Object.freeze({ kind: "saved" as const, sequence: candidate });
      },
      isSuccessfulResult(result) {
        return result.kind === "saved";
      },
    });

    queue.enqueue(3);
    queue.establishAnchor(0);
    let idle = false;
    const idlePromise = queue.idle().then(() => {
      idle = true;
    });

    oldWrite.resolve(Object.freeze({ kind: "saved", sequence: 3 }));
    await repairAttempted.promise;
    await flushV1();
    expect(currentSequence).toBe(3);
    expect(queue.isIdle()).toBe(false);
    expect(idle).toBe(false);

    queue.enqueue(7);
    await idlePromise;
    expect(written).toEqual([3, 0, 7]);
    expect(currentSequence).toBe(7);
    expect(queue.isIdle()).toBe(true);
    expect(idle).toBe(true);
  });

  it("isolates a rejected write and keeps the tail usable", async () => {
    const failure = new Error("storage rejected");
    const failures: unknown[] = [];
    const visible: Array<readonly [number, string]> = [];
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? Promise.reject(failure) : Promise.resolve(`saved:${candidate}`);
      },
      onFailure(error) {
        failures.push(error);
      },
      onCurrentResult(candidate, result) {
        visible.push([candidate, result]);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    await queue.idle();

    expect(written).toEqual([1, 2]);
    expect(failures).toEqual([failure]);
    expect(visible).toEqual([[2, "saved:2"]]);
  });

  it("isolates callback failures and accepts later work", async () => {
    const callbackFailure = new Error("result callback failed");
    const onFailure = vi.fn(() => {
      throw new Error("failure callback failed");
    });
    const queue = createAutoSaveQueueV1<number, string>({
      write: async (candidate) => `saved:${candidate}`,
      onCurrentResult() {
        throw callbackFailure;
      },
      onFailure,
    });

    queue.enqueue(1);
    await queue.idle();
    queue.enqueue(2);
    await queue.idle();

    expect(onFailure).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenNthCalledWith(1, callbackFailure);
  });

  it("isolates a throwing success predicate without poisoning the tail", async () => {
    const predicateFailure = new Error("success predicate failed");
    const failures: unknown[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write: async (candidate) => `saved:${candidate}`,
      isSuccessfulResult() {
        throw predicateFailure;
      },
      onFailure(error) {
        failures.push(error);
      },
    });

    queue.enqueue(1);
    await queue.idle();
    queue.enqueue(2);
    await queue.idle();

    expect(failures).toEqual([predicateFailure, predicateFailure]);
  });
});
