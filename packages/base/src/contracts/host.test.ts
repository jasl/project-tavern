// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HostRecordKeyV1 } from "./host.js";
import { createMemoryHostRecordStoreV1 } from "./host.js";

const key = (value: string) => value as HostRecordKeyV1;

describe("Host atomic record store", () => {
  it("lists keys in order and commits all-or-nothing", async () => {
    const store = createMemoryHostRecordStoreV1();
    await store.commit([
      {
        kind: "put",
        namespace: "settings",
        key: key("z"),
        expectedRevision: null,
        bytes: Uint8Array.of(2),
      },
      {
        kind: "put",
        namespace: "settings",
        key: key("a"),
        expectedRevision: null,
        bytes: Uint8Array.of(1),
      },
    ]);
    expect((await store.list("settings")).map((record) => record.key)).toEqual(["a", "z"]);

    const conflict = await store.commit([
      {
        kind: "put",
        namespace: "settings",
        key: key("a"),
        expectedRevision: 99 as never,
        bytes: Uint8Array.of(3),
      },
      {
        kind: "put",
        namespace: "settings",
        key: key("new"),
        expectedRevision: null,
        bytes: Uint8Array.of(4),
      },
    ]);
    expect(conflict.kind).toBe("conflict");
    expect(await store.read("settings", key("new"))).toBeNull();
    expect("transaction" in store).toBe(false);
  });

  it("rejects duplicate namespace/key mutations", async () => {
    const store = createMemoryHostRecordStoreV1();
    await expect(
      store.commit([
        {
          kind: "put",
          namespace: "save",
          key: key("one"),
          expectedRevision: null,
          bytes: Uint8Array.of(1),
        },
        { kind: "delete", namespace: "save", key: key("one"), expectedRevision: 1 as never },
      ]),
    ).rejects.toThrow("duplicate Host record mutation");
  });
});
