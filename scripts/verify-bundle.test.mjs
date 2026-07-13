// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { verifyPlayerBundleFixtureV1 } from "./verify-bundle.mjs";

test("rejects every Developer-only path from a Player manifest", () => {
  assert.deepEqual(
    verifyPlayerBundleFixtureV1({
      paths: [
        "engine/packages/web/src/developer/development-panel.tsx",
        "game/stories/e2e/src/development.ts",
        "engine/packages/base/src/testkit/index.ts",
      ],
    }),
    [
      "Player closure reached Developer path: engine/packages/web/src/developer/development-panel.tsx",
      "Player closure reached Story development path: game/stories/e2e/src/development.ts",
      "Player closure reached Base testkit: engine/packages/base/src/testkit/index.ts",
    ],
  );
});

test("rejects references, AIGC source, source maps, and absolute paths", () => {
  const errors = verifyPlayerBundleFixtureV1({
    paths: ["references/a.ts", "art-source/aigc/openai/a.png", "assets/app.js.map", "/tmp/app.js"],
  });
  assert.equal(errors.length, 4);
});
