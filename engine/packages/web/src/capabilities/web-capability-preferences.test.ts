// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "@sillymaker/base";
import type { GameHostV1, HostAtomicRecordStoreV1, RuntimeCapabilitiesV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { describe, expect, it, vi } from "vitest";

import { createWebHostV1 } from "../host/create-web-host.js";
import { createWebCapabilityPreferencesV1 } from "./web-capability-preferences.js";

const capabilityKeyV1 = "runtime-capabilities.v1" as Parameters<HostAtomicRecordStoreV1["read"]>[1];
const allDisabledV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
}) satisfies RuntimeCapabilitiesV1;

function createHostFixtureV1(records?: HostAtomicRecordStoreV1) {
  const source = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
  const write = vi.fn<GameHostV1["log"]["write"]>();
  const host: GameHostV1 = Object.freeze({
    ...source,
    records: records ?? source.records,
    log: Object.freeze({ write }),
  });
  return Object.freeze({ host, write });
}

async function seedPreferenceV1(host: GameHostV1, bytes: Uint8Array): Promise<void> {
  const result = await host.records.commit([
    Object.freeze({
      kind: "put" as const,
      namespace: "settings" as const,
      key: capabilityKeyV1,
      expectedRevision: null,
      bytes,
    }),
  ]);
  expect(result.kind).toBe("committed");
}

describe("Web capability preferences", () => {
  it("hydrates an absent record to frozen all-false state without writing", async () => {
    const fixture = createHostFixtureV1();
    const port = await createWebCapabilityPreferencesV1(fixture.host);

    expect(port.state.getCurrent()).toEqual(allDisabledV1);
    expect(Object.isFrozen(port.state.getCurrent())).toBe(true);
    expect(await fixture.host.records.read("settings", capabilityKeyV1)).toBeNull();
    expect(fixture.write).not.toHaveBeenCalled();
    expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
  });

  it("restores exact saved booleans and writes canonical bytes at the fixed key", async () => {
    const fixture = createHostFixtureV1();
    const saved = Object.freeze({ debugTools: true, cheats: false, automationBridge: true });
    await seedPreferenceV1(fixture.host, canonicalJsonBytes(saved));

    const port = await createWebCapabilityPreferencesV1(fixture.host);
    expect(port.state.getCurrent()).toEqual(saved);
    await expect(port.setEnabled("cheats", true)).resolves.toMatchObject({ kind: "updated" });

    const record = await fixture.host.records.read("settings", capabilityKeyV1);
    expect(record?.revision).toBe(2);
    expect(new TextDecoder().decode(record?.bytes)).toBe(
      '{"automationBridge":true,"cheats":true,"debugTools":true}',
    );
    const restored = await createWebCapabilityPreferencesV1(fixture.host);
    expect(restored.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: true,
      automationBridge: true,
    });
  });

  it.each([
    ["missing", canonicalJsonBytes({ debugTools: false, cheats: false })],
    [
      "extra",
      canonicalJsonBytes({
        debugTools: false,
        cheats: false,
        automationBridge: false,
        extra: true,
      }),
    ],
    ["non_boolean", canonicalJsonBytes({ debugTools: 1, cheats: false, automationBridge: false })],
    [
      "duplicate",
      new TextEncoder().encode(
        '{"debugTools":false,"debugTools":true,"cheats":false,"automationBridge":false}',
      ),
    ],
    ["bom", Uint8Array.of(0xef, 0xbb, 0xbf, 0x7b, 0x7d)],
    ["invalid_utf8", Uint8Array.of(0xc3, 0x28)],
  ])("falls back and warns once for an invalid %s record", async (_label, bytes) => {
    const fixture = createHostFixtureV1();
    await seedPreferenceV1(fixture.host, bytes);

    const port = await createWebCapabilityPreferencesV1(fixture.host);

    expect(port.state.getCurrent()).toEqual(allDisabledV1);
    expect(fixture.write).toHaveBeenCalledOnce();
    expect(fixture.write).toHaveBeenCalledWith(
      "warn",
      "runtime_capabilities.invalid_preference",
      expect.objectContaining({ namespace: "settings", key: "runtime-capabilities.v1" }),
    );
    expect((await fixture.host.records.read("settings", capabilityKeyV1))?.revision).toBe(1);
  });

  it("serializes concurrent writes against the newest committed revision", async () => {
    const fixture = createHostFixtureV1();
    const port = await createWebCapabilityPreferencesV1(fixture.host);

    await expect(
      Promise.all([
        port.setEnabled("debug_tools", true),
        port.setEnabled("cheats", true),
        port.setEnabled("debug_tools", true),
      ]),
    ).resolves.toMatchObject([{ kind: "updated" }, { kind: "updated" }, { kind: "unchanged" }]);
    expect((await fixture.host.records.read("settings", capabilityKeyV1))?.revision).toBe(2);
    expect(port.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: true,
      automationBridge: false,
    });
  });

  it("re-reads authoritative state after an external CAS conflict", async () => {
    const fixture = createHostFixtureV1();
    const first = await createWebCapabilityPreferencesV1(fixture.host);
    const second = await createWebCapabilityPreferencesV1(fixture.host);
    await first.setEnabled("debug_tools", true);

    await expect(second.setEnabled("cheats", true)).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
      state: { debugTools: true, cheats: false, automationBridge: false },
    });
    expect(second.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
    await expect(second.setEnabled("cheats", true)).resolves.toMatchObject({ kind: "updated" });
  });

  it("maps record-store failures to unavailable without rejecting or changing state", async () => {
    const source = createWebHostV1({ records: createMemoryHostRecordStoreV1() }).records;
    const records: HostAtomicRecordStoreV1 = Object.freeze({
      read: source.read,
      list: source.list,
      async commit() {
        throw new Error("storage offline");
      },
    });
    const fixture = createHostFixtureV1(records);
    const port = await createWebCapabilityPreferencesV1(fixture.host);

    await expect(port.setEnabled("debug_tools", true)).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
      state: allDisabledV1,
    });
    expect(port.state.getCurrent()).toEqual(allDisabledV1);
  });
});
