# Repository Licensing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved MIT / PolyForm Noncommercial / CC BY-NC-SA multi-license boundary, legal notices, third-party policy, contribution gate, and a repeatable repository verifier.

**Architecture:** A root `LICENSE.md` maps each repository path to one project license while unmodified standard texts live under `LICENSES/`. Project notices, trademarks, contributions, and third-party materials remain separate documents so the root scope cannot accidentally relicense external material. A dependency-free Node verifier checks canonical legal-text hashes, required notices, ignored references, tracked reference files, and future workspace package metadata.

**Tech Stack:** Markdown and plain-text legal documents, Node.js built-ins, `node:test`, Git, SHA-256.

## Global Constraints

- Copyright holder is exactly `Jun Jiang (jasl)`.
- `packages/base`, `packages/ui`, and a game-neutral `apps/web` are MIT.
- `packages/modules`, `stories/**` software, Story Hotfixes, and game-specific tests are `PolyForm-Noncommercial-1.0.0`.
- Original narrative, localization, art, audio, and project design documents are `CC-BY-NC-SA-4.0` except where a third-party notice says otherwise.
- Third-party material always retains its original terms; repository licenses grant no rights in third-party files.
- A missing per-file copyright line is acceptable only when an authoritative upstream license clearly covers the exact file/version.
- Material without a verifiable license, written permission, or public-domain declaration is `unverified/all-rights-reserved` and cannot enter Git, builds, releases, fixtures, screenshots, or AIGC inputs.
- `references/` stays ignored, untracked, unavailable to builds/tests/generation, and outside every project license.
- Standard MIT, PolyForm, and CC legal wording must not be customized.
- The project name, logos, character marks, and other brand identifiers receive no trademark license.
- Restricted-area contributions are not accepted before a commercial-relicensing CLA or copyright assignment exists.
- Use `apply_patch` for repository edits; network downloads are read-only comparison inputs.

---

## File Map

- Create `LICENSE.md`: root copyright notice, license scope table, composite-artifact rule, and third-party exclusions.
- Create `NOTICE`: exact PolyForm `Required Notice:` line and repository scope pointer.
- Create `LICENSES/MIT.txt`: SPDX MIT template with only the copyright placeholder replaced.
- Create `LICENSES/PolyForm-Noncommercial-1.0.0.txt`: byte-for-byte official PolyForm text.
- Create `LICENSES/CC-BY-NC-SA-4.0.txt`: byte-for-byte Creative Commons legal code text.
- Create `.gitattributes`: preserve the official CC text's second terminal LF without weakening whitespace checks for other files.
- Create `THIRD_PARTY_NOTICES.md`: current empty production inventory plus required record schema and exclusion rules.
- Create `TRADEMARKS.md`: explicit trademark reservation and nominative-use clarification.
- Create `CONTRIBUTING.md`: MIT inbound=outbound rule and restricted-area CLA gate.
- Create `scripts/verify-licensing.mjs`: dependency-free licensing verifier and CLI.
- Create `scripts/verify-licensing.test.mjs`: unit tests for hashes, notices, package metadata, and reference guards.
- Modify `README.md`: public licensing summary and links.
- Modify `AGENTS.md`: add licensing spec authority and implementation constraints.
- Modify `docs/README.md`: add the implementation plan next to the licensing spec.
- Modify `docs/superpowers/specs/2026-07-11-repository-licensing-design.md`: mark the approved policy as implemented and link the plan.

---

### Task 1: Build the dependency-free licensing verifier

**Files:**

- Create: `scripts/verify-licensing.test.mjs`
- Create: `scripts/verify-licensing.mjs`

**Interfaces:**

- Produces: `verifyLicensing(root, options?) -> Promise<readonly string[]>`
- Produces: CLI `node scripts/verify-licensing.mjs`, exit `0` on success and `1` with one error per line on failure.
- Consumes later: the exact files and hashes added in Task 2.

- [ ] **Step 1: Add verifier unit tests before the implementation exists**

Create `scripts/verify-licensing.test.mjs` with Node built-ins only. Tests must create an isolated temporary repository fixture and cover:

```js
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyLicensing } from "./verify-licensing.mjs";

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-license-"));
  await mkdir(join(root, "LICENSES"), { recursive: true });
  await writeFile(join(root, ".gitignore"), "/references/\n", "utf8");
  await writeFile(join(root, "NOTICE"), "Required Notice: Example.\n", "utf8");
  await writeFile(join(root, "LICENSES", "Example.txt"), "legal\n", "utf8");
  return root;
}

const policy = {
  requiredFiles: ["NOTICE", "LICENSES/Example.txt"],
  canonicalHashes: { "LICENSES/Example.txt": sha256("legal\n") },
  requiredNotice: "Required Notice: Example.",
  packageLicenses: { "packages/base/package.json": "MIT" },
};

test("accepts a complete repository fixture", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(
    await verifyLicensing(root, { policy, trackedReferences: "" }),
    [],
  );
});

test("reports missing and modified legal files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "LICENSES", "Example.txt"), "changed\n", "utf8");
  const errors = await verifyLicensing(root, {
    policy: { ...policy, requiredFiles: [...policy.requiredFiles, "LICENSE.md"] },
    trackedReferences: "",
  });
  assert(errors.some((error) => error.includes("missing required file: LICENSE.md")));
  assert(errors.some((error) => error.includes("canonical hash mismatch")));
});

test("reports notice, reference, and package-license violations", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "packages", "base"), { recursive: true });
  await writeFile(
    join(root, "packages", "base", "package.json"),
    JSON.stringify({ name: "@project-tavern/base", license: "ISC" }),
    "utf8",
  );
  await writeFile(join(root, "NOTICE"), "wrong\n", "utf8");
  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "references/example.txt\n",
  });
  assert(errors.some((error) => error.includes("required notice is missing")));
  assert(errors.some((error) => error.includes("tracked references are forbidden")));
  assert(errors.some((error) => error.includes("expected license MIT, got ISC")));
});
```

- [ ] **Step 2: Run the tests and prove the module is missing**

Run:

```bash
node --test scripts/verify-licensing.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/verify-licensing.mjs`.

- [ ] **Step 3: Implement the verifier**

Create `scripts/verify-licensing.mjs` with:

```js
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_POLICY = Object.freeze({
  requiredFiles: Object.freeze([
    "LICENSE.md",
    "NOTICE",
    "LICENSES/MIT.txt",
    "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
    "LICENSES/CC-BY-NC-SA-4.0.txt",
    "THIRD_PARTY_NOTICES.md",
    "TRADEMARKS.md",
    "CONTRIBUTING.md",
  ]),
  canonicalHashes: Object.freeze({
    "LICENSES/MIT.txt":
      "51a8b6aab0b3000d6ed05cd3327ff9b427b2c1163d22f51a3cc825e65e63a72f",
    "LICENSES/PolyForm-Noncommercial-1.0.0.txt":
      "ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8",
    "LICENSES/CC-BY-NC-SA-4.0.txt":
      "e66c269d4819aaab34b49ef5220c4ddab6756f21bb5180761a4eb8561f2b7bbd",
  }),
  requiredNotice: "Required Notice: Copyright 2026 Jun Jiang (jasl).",
  packageLicenses: Object.freeze({
    "packages/base/package.json": "MIT",
    "packages/ui/package.json": "MIT",
    "apps/web/package.json": "MIT",
    "packages/modules/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/demo/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/e2e/package.json": "PolyForm-Noncommercial-1.0.0",
    "stories/sandbox/package.json": "PolyForm-Noncommercial-1.0.0",
    "packages/assets/package.json": "SEE LICENSE IN LICENSE.md",
  }),
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function verifyLicensing(root, options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const errors = [];

  for (const relativePath of policy.requiredFiles) {
    if (!(await exists(join(root, relativePath)))) {
      errors.push(`missing required file: ${relativePath}`);
    }
  }

  for (const [relativePath, expected] of Object.entries(policy.canonicalHashes)) {
    const path = join(root, relativePath);
    if (!(await exists(path))) continue;
    const actual = sha256(await readFile(path));
    if (actual !== expected) {
      errors.push(`canonical hash mismatch for ${relativePath}: ${actual}`);
    }
  }

  const noticePath = join(root, "NOTICE");
  if (await exists(noticePath)) {
    const notice = await readFile(noticePath, "utf8");
    if (!notice.split(/\r?\n/u).includes(policy.requiredNotice)) {
      errors.push("required notice is missing from NOTICE");
    }
  }

  const gitignorePath = join(root, ".gitignore");
  if (!(await exists(gitignorePath))) {
    errors.push("missing required file: .gitignore");
  } else {
    const gitignore = await readFile(gitignorePath, "utf8");
    if (!gitignore.split(/\r?\n/u).includes("/references/")) {
      errors.push(".gitignore must contain /references/");
    }
  }

  const trackedReferences =
    options.trackedReferences ??
    execFileSync("git", ["ls-files", "references"], {
      cwd: root,
      encoding: "utf8",
    });
  if (trackedReferences.trim() !== "") {
    errors.push(`tracked references are forbidden: ${trackedReferences.trim()}`);
  }

  for (const [relativePath, expected] of Object.entries(policy.packageLicenses)) {
    const path = join(root, relativePath);
    if (!(await exists(path))) continue;
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path, "utf8"));
    } catch {
      errors.push(`invalid package metadata: ${relativePath}`);
      continue;
    }
    if (parsed.license !== expected) {
      errors.push(
        `${relativePath}: expected license ${expected}, got ${String(parsed.license)}`,
      );
    }
  }

  return errors;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyLicensing(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("licensing verification passed");
  }
}
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
node --test scripts/verify-licensing.test.mjs
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Run the repository verifier and prove legal files are still missing**

Run:

```bash
node scripts/verify-licensing.mjs
```

Expected: exit `1` with one `missing required file:` line for each Task 2 document.

- [ ] **Step 6: Commit the verifier**

```bash
git add scripts/verify-licensing.mjs scripts/verify-licensing.test.mjs
git commit -m "test: add repository licensing verifier"
```

### Task 2: Publish the canonical license bundle and governance documents

**Files:**

- Create: `LICENSE.md`
- Create: `NOTICE`
- Create: `LICENSES/MIT.txt`
- Create: `LICENSES/PolyForm-Noncommercial-1.0.0.txt`
- Create: `LICENSES/CC-BY-NC-SA-4.0.txt`
- Create: `.gitattributes`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `TRADEMARKS.md`
- Create: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: canonical hash table from `scripts/verify-licensing.mjs`.
- Produces: the repository-visible legal scope and all files required by the verifier.

- [ ] **Step 1: Confirm authoritative source bytes before editing**

Run the following read-only comparisons:

```bash
curl -L --fail --silent --show-error \
  https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt \
  | sed 's/Copyright (c) <year> <copyright holders>/Copyright (c) 2026 Jun Jiang (jasl)/' \
  | shasum -a 256

curl -L --fail --silent --show-error \
  https://polyformproject.org/licenses/noncommercial/1.0.0.txt \
  | shasum -a 256

curl -L --fail --silent --show-error \
  https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt \
  | shasum -a 256
```

Expected, in order:

```text
51a8b6aab0b3000d6ed05cd3327ff9b427b2c1163d22f51a3cc825e65e63a72f
ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8
e66c269d4819aaab34b49ef5220c4ddab6756f21bb5180761a4eb8561f2b7bbd
```

- [ ] **Step 2: Add the three legal texts with `apply_patch`**

Use exactly the three streams verified in Step 1. `MIT.txt` changes only the template copyright line; PolyForm and CC remain byte-for-byte identical to their official `.txt` responses. Do not reflow, translate, trim, or add repository commentary to these files.

Add this single path-specific attribute because the official CC response ends with two LF bytes and Git otherwise reports the second one as `blank-at-eof`:

```gitattributes
/LICENSES/CC-BY-NC-SA-4.0.txt whitespace=-blank-at-eof
```

No other path may disable whitespace checks.

- [ ] **Step 3: Add the root scope and notices**

`LICENSE.md` must contain the exact holder line, the MIT/PolyForm/CC path table from the approved spec, composite Player-bundle semantics, third-party exclusions, no-license default-denial rule, and links to all three local legal texts.

`NOTICE` must contain this line byte-for-byte:

```text
Required Notice: Copyright 2026 Jun Jiang (jasl).
```

It must also direct readers to `LICENSE.md` and `THIRD_PARTY_NOTICES.md` without adding conditions to a standard license.

- [ ] **Step 4: Add third-party, trademark, and contribution policies**

`THIRD_PARTY_NOTICES.md` must state that no third-party production/runtime material is currently shipped, exclude ignored `references/`, define the exact provenance fields from the approved spec, and state that unknown-license material is rejected rather than listed as approved.

`TRADEMARKS.md` must reserve project names, logos, character marks, and brand identifiers while allowing legally permitted nominative reference without implied endorsement.

`CONTRIBUTING.md` must allow MIT Engine contributions under inbound=outbound MIT, reject PolyForm/CC contributions until a CLA or assignment exists, and forbid third-party or AI content without complete rights evidence.

- [ ] **Step 5: Run the verifier**

```bash
node scripts/verify-licensing.mjs
```

Expected: `licensing verification passed`.

- [ ] **Step 6: Verify legal texts against authoritative sources again**

```bash
shasum -a 256 LICENSES/MIT.txt \
  LICENSES/PolyForm-Noncommercial-1.0.0.txt \
  LICENSES/CC-BY-NC-SA-4.0.txt
```

Expected hashes exactly match Step 1.

- [ ] **Step 7: Commit the legal bundle**

```bash
git add .gitattributes LICENSE.md NOTICE LICENSES THIRD_PARTY_NOTICES.md TRADEMARKS.md CONTRIBUTING.md
git commit -m "legal: publish repository licensing policy"
```

### Task 3: Wire licensing into repository guidance

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/specs/2026-07-11-repository-licensing-design.md`

**Interfaces:**

- Consumes: the legal bundle from Task 2.
- Produces: discoverable public guidance and future-agent constraints.

- [ ] **Step 1: Prove the public README does not yet expose the policy**

Run:

```bash
rg -n "source-available|PolyForm-Noncommercial-1.0.0|THIRD_PARTY_NOTICES" README.md AGENTS.md
```

Expected: no complete public licensing section and no full implementation constraint set.

- [ ] **Step 2: Update the README**

Add a `## 许可证` section containing:

```text
引擎组件以 MIT License 开源；游戏专用软件和原创内容公开源码，仅许可非商业使用。
```

Link `LICENSE.md`, all three local legal texts, `THIRD_PARTY_NOTICES.md`, `TRADEMARKS.md`, and `CONTRIBUTING.md`. State that third-party materials retain original terms and unlicensed material is excluded.

- [ ] **Step 3: Update AGENTS.md**

Add the licensing spec to Sources of Truth and freeze these implementation constraints:

- MIT packages may not import game-specific PolyForm/CC implementation;
- every new shipped third-party item needs provenance and original-license review;
- no-license material and `references/` cannot enter source, build, tests, screenshots, or generation;
- package `license` metadata must match the path map;
- run `node scripts/verify-licensing.mjs` after legal, package, dependency, asset, or build-manifest changes;
- restricted-area contributions require the approved CLA gate.

- [ ] **Step 4: Update the docs map and spec status**

Link this plan from `docs/README.md`. Change the licensing spec status to `已实施；标准许可证与治理文件见仓库根目录`, and add an implementation pointer to `LICENSE.md` plus this plan.

- [ ] **Step 5: Run document and licensing checks**

```bash
git diff --check
node --test scripts/verify-licensing.test.mjs
node scripts/verify-licensing.mjs
```

Expected: zero whitespace errors, 3 tests pass, and `licensing verification passed`.

- [ ] **Step 6: Commit repository guidance**

```bash
git add README.md AGENTS.md docs/README.md \
  docs/superpowers/specs/2026-07-11-repository-licensing-design.md
git commit -m "docs: expose repository licensing boundaries"
```

### Task 4: Final clean verification

**Files:**

- Verify only; no expected edits.

**Interfaces:**

- Consumes: all prior task outputs.
- Produces: clean evidence that licensing policy, legal bytes, repository guidance, and Git scope agree.

- [ ] **Step 1: Run the full licensing verification bundle**

```bash
node --test scripts/verify-licensing.test.mjs
node scripts/verify-licensing.mjs
git diff --check HEAD~3..HEAD
git status --short --branch
```

Expected: 3 tests pass, `licensing verification passed`, no diff-check errors, and a clean `## main` status.

- [ ] **Step 2: Review the three implementation commits**

```bash
git log -4 --oneline --decorate
git show --stat --oneline HEAD~3..HEAD
```

Expected commits after this plan commit:

```text
test: add repository licensing verifier
legal: publish repository licensing policy
docs: expose repository licensing boundaries
```

- [ ] **Step 3: Stop if any generated or third-party file appears unexpectedly**

The only implementation paths are those in the File Map. Any dependency cache, downloaded source file outside `LICENSES/`, tracked `references/` entry, or unrelated user change is a scope failure and must not be committed.
