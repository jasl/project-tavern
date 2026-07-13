// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { digestBytes, parsePositiveSafeInteger } from "@sillymaker/base";
import type { GamePackageV1, HotfixEntryV1 } from "@sillymaker/base";
import { createSyntheticCounterGamePackageV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "../host/create-web-host.js";
import { createGameBootstrapControllerV1, Loader } from "./loader.js";

describe("Loader", () => {
  it("requires explicit safe-mode startup", async () => {
    const base = Object.freeze({ id: "base" });
    const onReady = vi.fn();
    render(
      <Loader
        bootstrap={async () => ({
          kind: "safe_mode",
          base,
          resolved: base,
          code: "hotfix.conflict",
          rejectedHotfixIds: ["hotfix.conflicting"],
          details: { message: "conflict" },
          lastSuccessfulResolvedIdentity: null,
        })}
        onReady={onReady}
      />,
    );
    expect(await screen.findByText("安全模式：hotfix.conflict")).toBeVisible();
    expect(onReady).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("button", { name: "禁用补丁并安全启动" }));
    expect(onReady).toHaveBeenCalledWith(base);
  });

  it("freezes fatal, safe-mode, and ready bootstrap branches", async () => {
    const host = createWebHostV1();
    const bootstrap = createGameBootstrapControllerV1({
      host,
      buildIdentity: {
        engine: [
          {
            path: "engine/packages/base/src/index.ts",
            sha256: digestBytes(Uint8Array.of(1)),
            facet: "engine",
          },
        ],
        storySimulation: [
          {
            path: "game/stories/synthetic/simulation.ts",
            sha256: digestBytes(Uint8Array.of(2)),
            facet: "story_simulation",
          },
        ],
        storyPresentation: [
          {
            path: "game/stories/synthetic/presentation.ts",
            sha256: digestBytes(Uint8Array.of(3)),
            facet: "story_presentation",
          },
        ],
        application: [],
      },
    });
    const invalid = {
      contractRevision: 1 as const,
      identity: { id: "story.invalid", revision: parsePositiveSafeInteger(1) },
      define: () => null as never,
    } satisfies GamePackageV1<never, never>;
    await expect(bootstrap(invalid, [])).resolves.toMatchObject({
      kind: "fatal",
      code: "story.contract_invalid",
      rejectedHotfixIds: [],
    });

    const entry = createSyntheticCounterGamePackageV1();
    const first: HotfixEntryV1 = Object.freeze({
      manifest: Object.freeze({
        identity: Object.freeze({
          id: "hotfix.synthetic.first",
          revision: parsePositiveSafeInteger(1),
        }),
        targetStoryId: entry.identity.id,
        targetStoryRevision: entry.identity.revision,
        targets: Object.freeze([]),
        requires: Object.freeze([]),
        conflicts: Object.freeze([]),
        supersedes: Object.freeze([]),
      }),
      sourceDigest: digestBytes(Uint8Array.of(1)),
      install() {},
    });
    const conflicting: HotfixEntryV1 = Object.freeze({
      manifest: Object.freeze({
        identity: Object.freeze({
          id: "hotfix.synthetic.conflicting",
          revision: parsePositiveSafeInteger(1),
        }),
        targetStoryId: entry.identity.id,
        targetStoryRevision: entry.identity.revision,
        targets: Object.freeze([]),
        requires: Object.freeze([]),
        conflicts: Object.freeze([first.manifest.identity.id]),
        supersedes: Object.freeze([]),
      }),
      sourceDigest: digestBytes(Uint8Array.of(2)),
      install() {},
    });
    await expect(bootstrap(entry, [first, conflicting])).resolves.toMatchObject({
      kind: "safe_mode",
      code: "hotfix.conflict",
      rejectedHotfixIds: [first.manifest.identity.id, conflicting.manifest.identity.id],
    });
    const ready = await bootstrap(entry, []);
    expect(ready.kind).toBe("ready");
    if (ready.kind !== "ready") throw new TypeError("expected ready");
    expect(ready.base).toBe(ready.resolved);
    expect(await host.records.list("settings")).toHaveLength(1);
  });
});
