// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

const approvedUses = [
  "repository_archival",
  "repository_publication",
  "modification",
  "redistribution",
  "runtime_distribution",
  "project_relicensing",
];
const reviewRestrictions = [
  "human_review_and_disclosure_where_applicable",
  "input_rights_required",
  "output_may_not_be_unique",
  "no_non_infringement_warranty",
];
const approvedProvenancePath =
  "art-source/imagegen/test-pack/test-output/provenance.json";
const approvedReviewPath =
  "art-source/imagegen/test-pack/openai-service-terms-review.v1.json";
const approvedSourcePath =
  "art-source/imagegen/test-pack/test-output/source.png";
const approvedPromptPath =
  "art-source/imagegen/test-pack/test-output/prompt.md";
const approvedTrackedArtSourceFiles = [
  approvedProvenancePath,
  approvedReviewPath,
  approvedSourcePath,
  approvedPromptPath,
];
const approvedOutput = {
  assetId: "test.output",
  generatedAt: "2026-07-10T00:00:00Z",
  sourceSha256:
    "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
};

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const semanticDigest = (value) => `sha256:${sha256(canonicalJson(value))}`;

async function writeApprovedAiFixture(
  root,
  { mutateReview = () => {}, mutateProvenance = () => {} } = {},
) {
  const review = {
    schemaVersion: 1,
    reviewId: "openai.imagegen.first-web-pack.2026-07-11",
    status: "approved",
    service: "OpenAI Image Gen",
    surface: "Codex built-in image_gen",
    reviewedAt: "2026-07-11T00:00:00Z",
    scopeAlternativesReviewed: ["individual", "business_or_developer"],
    agreements: [
      {
        name: "OpenAI Terms of Use (Rest of World)",
        scope: "individual",
        dateKind: "effective",
        date: "2026-01-01",
        retrievedAt: "2026-07-11",
        sourceUrl: "https://openai.com/policies/row-terms-of-use/",
      },
      {
        name: "OpenAI Services Agreement",
        scope: "business_or_developer",
        dateKind: "effective",
        date: "2026-01-01",
        retrievedAt: "2026-07-11",
        sourceUrl: "https://openai.com/policies/services-agreement/",
      },
      {
        name: "OpenAI Service Terms",
        scope: "all_accounts",
        dateKind: "updated",
        date: "2026-06-12",
        retrievedAt: "2026-07-11",
        sourceUrl: "https://openai.com/policies/service-terms/",
      },
      {
        name: "OpenAI Usage Policies",
        scope: "all_accounts",
        dateKind: "effective",
        date: "2025-10-29",
        retrievedAt: "2026-07-11",
        sourceUrl: "https://openai.com/policies/usage-policies/",
      },
      {
        name: "OpenAI Sharing & Publication Policy",
        scope: "publication",
        dateKind: "updated",
        date: "2022-11-14",
        retrievedAt: "2026-07-11",
        sourceUrl: "https://openai.com/policies/sharing-publication-policy/",
      },
    ],
    rightsHolderAttestation: {
      rightsBeneficiary: "Jun Jiang (jasl)",
      authorityBasis:
        "project_controlled_generation_account_and_repository_owner_authorization",
      attestedAt: "2026-07-11T00:00:00Z",
      projectLicense: "CC-BY-NC-SA-4.0",
      authorizedUses: approvedUses,
      qualification: "only_to_extent_licensable_rights_exist",
    },
    conclusion:
      "As between the applicable user or customer and OpenAI, the user or customer owns Output and OpenAI assigns any rights it has in Output.",
    allowedUses: approvedUses,
    aigcInputUse: "requires_independent_input_use_review",
    restrictions: reviewRestrictions,
    coveredOutputs: [{ ...approvedOutput }],
  };
  mutateReview(review);

  const provenance = {
    assetId: approvedOutput.assetId,
    sourceType: "ai_generated",
    generator: {
      service: review.service,
      surface: review.surface,
      model: "example-model",
      generatedAt: approvedOutput.generatedAt,
    },
    promptFile: "prompt.md",
    inputAssets: [],
    inputUseReview: null,
    termsReview: {
      status: "approved",
      reviewId: review.reviewId,
      reviewPath: approvedReviewPath,
      reviewDigest: semanticDigest(review),
    },
    contentAdmissionReview: {
      status: "approved",
      reviewedAt: "2026-07-11T00:00:00Z",
      reviewer: "Jun Jiang (jasl)",
      scope: "limited_visual_screen",
      output: { ...approvedOutput },
      checks: {
        visibleLogoOrWatermark: "none_observed",
        namedPublicFigure: "none_observed",
        obviousThirdPartyCharacterOrBrand: "none_observed",
      },
      limitation: "not_a_non_infringement_clearance",
    },
    modifications: [],
    source: {
      path: "source.png",
      format: "png",
      width: 1,
      height: 1,
    },
    sourceSha256: approvedOutput.sourceSha256,
    runtime: null,
    review: {
      status: "candidate",
      selectionReason: null,
    },
  };
  mutateProvenance(provenance);

  await mkdir(join(root, "art-source", "imagegen", "test-pack", "test-output"), {
    recursive: true,
  });
  await writeFile(join(root, approvedReviewPath), JSON.stringify(review), "utf8");
  await writeFile(join(root, approvedProvenancePath), JSON.stringify(provenance), "utf8");
  await writeFile(
    join(root, approvedSourcePath),
    new Uint8Array(),
  );
  await writeFile(join(root, approvedPromptPath), "test prompt\n", "utf8");
  return { provenancePath: approvedProvenancePath, reviewPath: approvedReviewPath };
}

test("accepts a complete repository fixture", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(
    await verifyLicensing(root, {
      policy,
      trackedReferences: "",
      trackedProvenanceFiles: [],
      trackedArtSourceFiles: [],
    }),
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
    trackedProvenanceFiles: [],
    trackedArtSourceFiles: [],
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
    trackedProvenanceFiles: [],
    trackedArtSourceFiles: [],
  });
  assert(errors.some((error) => error.includes("required notice is missing")));
  assert(errors.some((error) => error.includes("tracked references are forbidden")));
  assert(errors.some((error) => error.includes("expected license MIT, got ISC")));
});

test("rejects tracked AI provenance without approved service terms", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const relativePath =
    "art-source/imagegen/test-pack/test-output/provenance.json";
  await mkdir(join(root, "art-source", "imagegen", "test-pack", "test-output"), {
    recursive: true,
  });
  await writeFile(
    join(root, relativePath),
    JSON.stringify({
      assetId: "test.output",
      sourceType: "ai_generated",
      generator: {
        service: "Example Image Service",
        surface: "Example Surface",
        model: "example-model",
        generatedAt: "2026-07-10T00:00:00Z",
      },
      promptFile: "prompt.md",
      inputAssets: [],
      inputUseReview: null,
      termsReview: {
        status: "pending",
        reviewId: null,
        reviewPath: null,
        reviewDigest: null,
      },
      contentAdmissionReview: null,
      modifications: [],
      source: {
        path: "source.png",
        format: "png",
        width: 1,
        height: 1,
      },
      sourceSha256:
        "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      runtime: null,
      review: {
        status: "candidate",
        selectionReason: null,
      },
    }),
    "utf8",
  );
  await writeFile(
    join(root, "art-source", "imagegen", "test-pack", "test-output", "source.png"),
    new Uint8Array(),
  );
  await writeFile(
    join(root, "art-source", "imagegen", "test-pack", "test-output", "prompt.md"),
    "test prompt\n",
    "utf8",
  );

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [relativePath],
    trackedArtSourceFiles: [
      relativePath,
      "art-source/imagegen/test-pack/test-output/source.png",
      "art-source/imagegen/test-pack/test-output/prompt.md",
    ],
  });

  assert(errors.some((error) => error.includes("service-terms review must be approved")));
});

test("accepts tracked AI provenance with exact approved evidence", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);

  assert.deepEqual(
    await verifyLicensing(root, {
      policy,
      trackedReferences: "",
      trackedProvenanceFiles: [provenancePath],
      trackedArtSourceFiles: approvedTrackedArtSourceFiles,
    }),
    [],
  );
});

test("requires the referenced service-terms review record", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath, reviewPath } = await writeApprovedAiFixture(root);
  await rm(join(root, reviewPath));

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("service-terms review record is missing")));
});

test("binds service-terms approval to the exact output and review digest", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.coveredOutputs[0].generatedAt = "2026-07-10T00:00:01Z";
    },
  });
  let errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes("service-terms review does not cover the exact output"),
    ),
  );

  await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.termsReview.reviewDigest = `sha256:${"0".repeat(64)}`;
    },
  });
  errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("service-terms review digest mismatch")));
});

test("requires all repository uses and a rights-holder attestation", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.allowedUses = review.allowedUses.filter(
        (use) => use !== "runtime_distribution",
      );
    },
  });
  let errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes("missing required allowed use: runtime_distribution"),
    ),
  );

  await writeApprovedAiFixture(root, {
    mutateReview(review) {
      delete review.rightsHolderAttestation;
    },
  });
  errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("rights-holder attestation is required")));
});

test("requires an exact-output limited content-admission screen", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.contentAdmissionReview = null;
    },
  });
  let errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("content-admission review must be approved")));

  await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.contentAdmissionReview.output.sourceSha256 = `sha256:${"0".repeat(64)}`;
    },
  });
  errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [first.provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes("content-admission review does not cover the exact output"),
    ),
  );
});

test("does not infer AIGC input permission from service-terms approval", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.aigcInputUse = "approved";
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes("service-terms review cannot authorize AIGC input"),
    ),
  );
});

test("rejects service-terms review paths that escape the repository", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.termsReview.reviewPath = "../outside.json";
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("unsafe service-terms review path")));
});

test("rejects duplicate keys in tracked provenance JSON", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);
  const provenance = await readFile(join(root, provenancePath), "utf8");
  await writeFile(
    join(root, provenancePath),
    provenance.replace(
      '"assetId":"test.output"',
      '"assetId":"shadow.output","assetId":"test.output"',
    ),
    "utf8",
  );

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("duplicate JSON key")));
});

test("requires every referenced AI provenance dependency to be tracked", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles.filter(
      (path) => path !== approvedSourcePath,
    ),
  });
  assert(
    errors.some((error) =>
      error.includes(`tracked AI provenance dependency is not tracked: ${approvedSourcePath}`),
    ),
  );
});

test("keeps a service-terms review inside the provenance pack", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.termsReview.reviewPath =
        "art-source/imagegen/other-pack/openai-service-terms-review.v1.json";
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("service-terms review must stay inside its pack")));
});

test("rejects symlinked AI provenance dependencies", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);
  await rm(join(root, approvedSourcePath));
  await symlink(join(root, "NOTICE"), join(root, approvedSourcePath));

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("symbolic links are forbidden")));
});

test("rejects non-AI provenance under art-source/imagegen", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.sourceType = "project_owned";
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("must declare sourceType ai_generated")));
});

test("requires ordered source-digest bindings in independent input-use review", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.inputAssets = ["input.one"];
      provenance.inputUseReview = {
        status: "approved",
        reviewedAt: "2026-07-09T00:00:00Z",
        sourceUrl: "https://example.com/input-rights",
        allowedInputUses: ["generation_input"],
        restrictions: [],
      };
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("invalid AI provenance record")));
});

test("rejects orphan tracked art-source files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);
  const orphanPath = "art-source/imagegen/test-pack/orphan/source.png";
  await mkdir(join(root, "art-source", "imagegen", "test-pack", "orphan"), {
    recursive: true,
  });
  await writeFile(join(root, orphanPath), new Uint8Array());

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: [...approvedTrackedArtSourceFiles, orphanPath],
  });
  assert(errors.some((error) => error.includes(`tracked art-source file is orphan or unknown: ${orphanPath}`)));
});

test("rejects duplicate tracked Asset IDs", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);
  const duplicateDirectory = "art-source/imagegen/test-pack/duplicate-output";
  const duplicateProvenancePath = `${duplicateDirectory}/provenance.json`;
  const duplicateSourcePath = `${duplicateDirectory}/source.png`;
  const duplicatePromptPath = `${duplicateDirectory}/prompt.md`;
  await mkdir(join(root, duplicateDirectory), { recursive: true });
  await writeFile(
    join(root, duplicateProvenancePath),
    await readFile(join(root, provenancePath)),
  );
  await writeFile(join(root, duplicateSourcePath), new Uint8Array());
  await writeFile(join(root, duplicatePromptPath), "duplicate prompt\n", "utf8");

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath, duplicateProvenancePath],
    trackedArtSourceFiles: [
      ...approvedTrackedArtSourceFiles,
      duplicateProvenancePath,
      duplicateSourcePath,
      duplicatePromptPath,
    ],
  });
  assert(errors.some((error) => error.includes("duplicate tracked AI Asset ID: test.output")));
});

test("rejects duplicate provenance discovery entries", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath, provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes(`duplicate tracked provenance path: ${provenancePath}`)));
});

test("rejects structurally valid input reviews for unknown Asset IDs", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.inputAssets = ["missing.input"];
      provenance.inputUseReview = {
        status: "approved",
        reviewedAt: "2026-07-09T00:00:00Z",
        sourceUrl: "https://example.com/input-rights",
        reviewedInputs: [
          {
            assetId: "missing.input",
            sourceSha256: `sha256:${"0".repeat(64)}`,
          },
        ],
        allowedInputUses: ["generation_input"],
        restrictions: [],
      };
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes("input-use review references unknown tracked Asset ID: missing.input"),
    ),
  );
});

test("rejects structurally valid input reviews with stale source hashes", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.inputAssets = [approvedOutput.assetId];
      provenance.inputUseReview = {
        status: "approved",
        reviewedAt: "2026-07-09T00:00:00Z",
        sourceUrl: "https://example.com/input-rights",
        reviewedInputs: [
          {
            assetId: approvedOutput.assetId,
            sourceSha256: `sha256:${"0".repeat(64)}`,
          },
        ],
        allowedInputUses: ["generation_input"],
        restrictions: [],
      };
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(
    errors.some((error) =>
      error.includes(`input-use review source digest mismatch: ${approvedOutput.assetId}`),
    ),
  );
});
