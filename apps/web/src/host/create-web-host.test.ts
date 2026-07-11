// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import type { HostRecordKeyV1 } from "@project-tavern/base";
import { createWebHostV1 } from "./create-web-host.js";

describe("Web Host", () => {
  it("provides fixed entropy and atomic sorted memory records", async () => {
    const host = createWebHostV1({ seeds: [7], uuids: ["00000000-0000-4000-8000-000000000001"] });
    expect(host.bootstrapEntropy.nextNonZeroUint32()).toBe(7);
    expect(host.bootstrapEntropy.nextUuidV4()).toBe("00000000-0000-4000-8000-000000000001");
    for (const key of ["b", "a"]) {
      await host.records.commit([{ kind: "put", namespace: "settings", key: key as HostRecordKeyV1, expectedRevision: null, bytes: Uint8Array.of(1) }]);
    }
    expect((await host.records.list("settings")).map(({ key }) => key)).toEqual(["a", "b"]);
  });
});
