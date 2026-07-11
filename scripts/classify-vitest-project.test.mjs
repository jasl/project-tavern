// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { classifyVitestProjectV1 } from "./classify-vitest-project.mjs";

test("classifies future workspace and script tests disjointly", () => {
  assert.equal(
    classifyVitestProjectV1("packages/base/src/contracts/rng.property.test.ts"),
    "property",
  );
  assert.equal(classifyVitestProjectV1("stories/future/src/story-contract.test.ts"), "contract");
  assert.equal(classifyVitestProjectV1("packages/base/src/testkit/new-helper.test.ts"), "contract");
  assert.equal(classifyVitestProjectV1("apps/future/src/loader/new-loader.test.tsx"), "unit");
  assert.equal(classifyVitestProjectV1("scripts/future/nested/check.test.ts"), "scripts");
  assert.equal(classifyVitestProjectV1("scripts/future/nested/check.test.mjs"), null);
  assert.equal(classifyVitestProjectV1("apps/web/e2e/player.spec.ts"), null);
  assert.equal(classifyVitestProjectV1("packages/base/type-tests/public.test-d.ts"), null);
  assert.equal(classifyVitestProjectV1("../packages/base/src/x.test.ts"), null);
});
