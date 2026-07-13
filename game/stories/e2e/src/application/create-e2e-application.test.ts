// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import { createWebHostV1 } from "@sillymaker/web";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createE2eApplicationV1 } from "./create-e2e-application.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

describe("E2e Player application", () => {
  it("composes five narrow ports with storage unavailable and rescue export", async () => {
    const application = createE2eApplicationV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createWebHostV1({
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    expect(Object.keys(application).sort()).toEqual([
      "commands",
      "diagnostics",
      "lifecycle",
      "persistence",
      "view",
    ]);
    expect(application.lifecycle.createNewSession).toHaveLength(0);
    expect(application.lifecycle.restartSession).toHaveLength(0);
    await expect(application.persistence.getStatus()).resolves.toMatchObject({ available: false });
    await expect(application.persistence.exportSave("manual")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(application.persistence.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
      filename: "project-tavern-e2e-current.json",
    });
  });
});
