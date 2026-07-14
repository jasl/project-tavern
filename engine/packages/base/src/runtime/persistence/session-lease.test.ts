// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { LeaseHandoffRequestId, SessionLeaseOwnerId } from "../../contracts/application.js";
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import type { HostAtomicRecordStoreV1, HostStoredRecordV1 } from "../../contracts/host.js";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.js";
import { parsePositiveSafeInteger } from "../../contracts/values.js";
import { createSessionLeaseV1 } from "./session-lease.js";
import type { SessionLeaseFenceV1 } from "./session-lease.js";

const storyIdV1 = "story.session-lease-test";
const ownerV1 = (value: string) => value as SessionLeaseOwnerId;
const requestV1 = (value: string) => value as LeaseHandoffRequestId;
const fenceV1 = (ownerId: string, fencingToken: number) =>
  Object.freeze({
    ownerId: ownerV1(ownerId),
    fencingToken: parsePositiveSafeInteger(fencingToken),
  }) satisfies SessionLeaseFenceV1;

function createLeaseV1(
  records: HostAtomicRecordStoreV1,
  ownerId: string,
  nextRequestId = `request.${ownerId}`,
) {
  const nextHandoffRequestId = vi.fn(() => requestV1(nextRequestId));
  return Object.freeze({
    lease: createSessionLeaseV1({
      records,
      storyId: storyIdV1,
      ownerId: ownerV1(ownerId),
      nextHandoffRequestId,
    }),
    nextHandoffRequestId,
  });
}

async function onlyLeaseRecordV1(records: HostAtomicRecordStoreV1): Promise<HostStoredRecordV1> {
  const stored = await records.list("lease");
  expect(stored).toHaveLength(1);
  const record = stored[0];
  if (record === undefined) throw new TypeError("expected one lease record");
  return record;
}

async function overwriteLeaseBytesV1(
  records: HostAtomicRecordStoreV1,
  current: HostStoredRecordV1,
  bytes: Uint8Array,
): Promise<HostStoredRecordV1> {
  const result = await records.commit([
    {
      kind: "put",
      namespace: "lease",
      key: current.key,
      expectedRevision: current.revision,
      bytes,
    },
  ]);
  expect(result.kind).toBe("committed");
  return onlyLeaseRecordV1(records);
}

function throwingStoreV1(error: Error): HostAtomicRecordStoreV1 {
  return Object.freeze({
    async read() {
      throw error;
    },
    async list() {
      throw error;
    },
    async commit() {
      throw error;
    },
  });
}

describe("Session lease", () => {
  it("elects exactly one initial owner and exposes a fence only to that owner", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    const second = createLeaseV1(records, "owner.b").lease;

    const results = await Promise.all([first.acquireInitial(), second.acquireInitial()]);

    expect(results.filter(({ kind }) => kind === "owned")).toHaveLength(1);
    expect(results.filter(({ kind }) => kind === "readonly")).toHaveLength(1);
    const owner = results.find(({ kind }) => kind === "owned");
    expect(owner).toMatchObject({ fencingToken: 1 });
    await Promise.all([first.getStatus(), second.getStatus()]);
    expect([first.captureFence(), second.captureFence()].filter(Boolean)).toEqual([
      fenceV1(owner?.ownerId ?? "missing", 1),
    ]);
  });

  it("does not let acquireInitial steal an existing unowned lease", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    await expect(first.acquireInitial()).resolves.toMatchObject({ kind: "owned", fencingToken: 1 });
    await expect(first.release()).resolves.toEqual({
      kind: "updated",
      status: { kind: "unowned", ownerId: null, fencingToken: 1 },
    });

    const second = createLeaseV1(records, "owner.b").lease;
    await expect(second.acquireInitial()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });
    expect(second.captureFence()).toBeNull();
  });

  it("retains the token on release and increments it exactly once on takeover", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    const second = createLeaseV1(records, "owner.b").lease;
    await first.acquireInitial();
    await first.release();

    await expect(second.takeOver()).resolves.toEqual({
      kind: "updated",
      status: { kind: "owned", ownerId: ownerV1("owner.b"), fencingToken: 2 },
    });
    expect(second.captureFence()).toEqual(fenceV1("owner.b", 2));
  });

  it("approves only the exact handoff request and transfers ownership with a new token", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    const secondFixture = createLeaseV1(records, "owner.b", "request.handoff-b");
    const second = secondFixture.lease;
    await first.acquireInitial();
    await second.getStatus();

    await expect(second.requestHandoff()).resolves.toEqual({
      kind: "updated",
      status: {
        kind: "handoff_requested",
        ownerId: ownerV1("owner.a"),
        fencingToken: 1,
        requestId: requestV1("request.handoff-b"),
        requestedByOwnerId: ownerV1("owner.b"),
      },
    });
    expect(secondFixture.nextHandoffRequestId).toHaveBeenCalledOnce();
    await first.getStatus();
    await expect(first.approveHandoff(requestV1("request.wrong"))).resolves.toEqual({
      kind: "rejected",
      code: "unknown_request",
    });
    await expect(first.approveHandoff(requestV1("request.handoff-b"))).resolves.toEqual({
      kind: "updated",
      status: { kind: "readonly", ownerId: ownerV1("owner.b"), fencingToken: 2 },
    });
    await Promise.all([first.getStatus(), second.getStatus()]);
    expect(first.captureFence()).toBeNull();
    expect(second.captureFence()).toEqual(fenceV1("owner.b", 2));
  });

  it("reads the latest handoff before approving without a separate status refresh", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    const second = createLeaseV1(records, "owner.b", "request.handoff-b").lease;
    await first.acquireInitial();
    await second.getStatus();
    await second.requestHandoff();

    await expect(first.approveHandoff(requestV1("request.handoff-b"))).resolves.toEqual({
      kind: "updated",
      status: { kind: "readonly", ownerId: ownerV1("owner.b"), fencingToken: 2 },
    });
  });

  it("reads the latest owner before taking over from a stale owned observation", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = createLeaseV1(records, "owner.a").lease;
    const second = createLeaseV1(records, "owner.b").lease;
    await first.acquireInitial();
    await second.getStatus();
    await second.takeOver();

    await expect(first.takeOver()).resolves.toEqual({
      kind: "updated",
      status: { kind: "owned", ownerId: ownerV1("owner.a"), fencingToken: 3 },
    });
    expect(first.captureFence()).toEqual(fenceV1("owner.a", 3));
  });

  it("rejects stale-owner release after ownership changes", async () => {
    const records = createMemoryHostRecordStoreV1();
    const stale = createLeaseV1(records, "owner.a").lease;
    const replacement = createLeaseV1(records, "owner.b").lease;
    await stale.acquireInitial();
    await replacement.getStatus();
    await replacement.takeOver();

    await expect(stale.release()).resolves.toEqual({ kind: "rejected", code: "conflict" });
    await expect(stale.getStatus()).resolves.toMatchObject({
      kind: "readonly",
      ownerId: ownerV1("owner.b"),
      fencingToken: 2,
    });
    expect(stale.captureFence()).toBeNull();
  });

  it("allows exactly one competing takeover", async () => {
    const records = createMemoryHostRecordStoreV1();
    const initial = createLeaseV1(records, "owner.a").lease;
    const first = createLeaseV1(records, "owner.b").lease;
    const second = createLeaseV1(records, "owner.c").lease;
    await initial.acquireInitial();
    await Promise.all([first.getStatus(), second.getStatus()]);

    const results = await Promise.all([first.takeOver(), second.takeOver()]);
    expect(results.filter(({ kind }) => kind === "updated")).toHaveLength(1);
    expect(results.filter(({ kind }) => kind === "rejected")).toEqual([
      { kind: "rejected", code: "conflict" },
    ]);
    await expect(initial.getStatus()).resolves.toMatchObject({ kind: "readonly", fencingToken: 2 });
  });

  it("never repairs or steals a corrupt lease record", async () => {
    const records = createMemoryHostRecordStoreV1();
    const initial = createLeaseV1(records, "owner.a").lease;
    await initial.acquireInitial();
    const corrupt = await overwriteLeaseBytesV1(
      records,
      await onlyLeaseRecordV1(records),
      new TextEncoder().encode('{"formatRevision":1'),
    );
    const contender = createLeaseV1(records, "owner.b").lease;

    await expect(contender.acquireInitial()).resolves.toMatchObject({
      kind: "unavailable",
      ownerId: null,
      fencingToken: null,
    });
    await expect(contender.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    const after = await onlyLeaseRecordV1(records);
    expect(after).toEqual(corrupt);
  });

  it("never wraps a maximum safe fencing token", async () => {
    const records = createMemoryHostRecordStoreV1();
    const initial = createLeaseV1(records, "owner.a").lease;
    await initial.acquireInitial();
    const current = await onlyLeaseRecordV1(records);
    const decoded = JSON.parse(new TextDecoder().decode(current.bytes)) as Record<string, unknown>;
    const maximum = await overwriteLeaseBytesV1(
      records,
      current,
      canonicalJsonBytes({ ...decoded, fencingToken: Number.MAX_SAFE_INTEGER }),
    );
    const contender = createLeaseV1(records, "owner.b").lease;

    await expect(contender.getStatus()).resolves.toMatchObject({
      kind: "readonly",
      ownerId: ownerV1("owner.a"),
      fencingToken: Number.MAX_SAFE_INTEGER,
    });
    await expect(contender.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    expect(await onlyLeaseRecordV1(records)).toEqual(maximum);
  });

  it("maps a stable Host failure to unavailable without exposing a fence", async () => {
    const failure = Object.assign(new Error("indexeddb.unavailable"), {
      name: "IndexedDbRecordStoreFailureV1",
      code: "indexeddb.unavailable",
      operation: "read",
    });
    const lease = createLeaseV1(throwingStoreV1(failure), "owner.a").lease;

    await expect(lease.getStatus()).resolves.toEqual({
      kind: "unavailable",
      ownerId: null,
      fencingToken: null,
      code: "indexeddb.unavailable",
    });
    await expect(lease.acquireInitial()).resolves.toMatchObject({ kind: "unavailable" });
    await expect(lease.takeOver()).resolves.toEqual({ kind: "rejected", code: "unavailable" });
    expect(lease.captureFence()).toBeNull();
  });

  it("preserves unexpected Host failures as rejected promises", async () => {
    const failure = new Error("unexpected Host bug");

    await expect(createLeaseV1(throwingStoreV1(failure), "owner.a").lease.getStatus()).rejects.toBe(
      failure,
    );
    await expect(
      createLeaseV1(throwingStoreV1(failure), "owner.b").lease.acquireInitial(),
    ).rejects.toBe(failure);
    await expect(createLeaseV1(throwingStoreV1(failure), "owner.c").lease.takeOver()).rejects.toBe(
      failure,
    );

    const codedFailure = Object.assign(new Error("unexpected coded Host bug"), {
      code: "indexeddb.unavailable",
      operation: "read",
    });
    await expect(
      createLeaseV1(throwingStoreV1(codedFailure), "owner.d").lease.getStatus(),
    ).rejects.toBe(codedFailure);
  });
});
