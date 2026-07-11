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
  "manual_review_before_sharing",
  "attribution_to_rights_beneficiary_required",
  "conspicuous_ai_origin_disclosure_required",
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

function approvedInputUseReview(assetId, sourceSha256, reviewedAt) {
  return {
    status: "approved",
    reviewedAt,
    sourceUrl: "https://example.com/input-rights",
    reviewedInputs: [{ assetId, sourceSha256 }],
    allowedInputUses: ["generation_input"],
    restrictions: [],
  };
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

test("requires separate closed publication-obligation tokens", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.restrictions = reviewRestrictions;
    },
  });

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

test("reports each missing closed publication obligation", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.restrictions = reviewRestrictions.filter(
        (restriction) =>
          restriction !== "attribution_to_rights_beneficiary_required",
      );
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
      error.includes(
        "missing required service-terms restriction: attribution_to_rights_beneficiary_required",
      ),
    ),
  );
});

test("rejects agreement evidence retrieved before a covered output was generated", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const generatedAt = "2026-07-12T00:00:00Z";
  const reviewedAt = "2026-07-13T00:00:00Z";
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.reviewedAt = reviewedAt;
      review.rightsHolderAttestation.attestedAt = reviewedAt;
      review.coveredOutputs[0].generatedAt = generatedAt;
    },
    mutateProvenance(provenance) {
      provenance.generator.generatedAt = generatedAt;
      provenance.contentAdmissionReview.reviewedAt = reviewedAt;
      provenance.contentAdmissionReview.output.generatedAt = generatedAt;
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
      error.includes("agreement evidence chronology is invalid for covered output"),
    ),
  );
});

test("returns a structured error for non-array covered outputs", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.coveredOutputs = {};
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("invalid service-terms review record")));
});

test("rejects agreement versions dated after a covered output was generated", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const generatedAt = "2025-12-31T12:00:00Z";
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.coveredOutputs[0].generatedAt = generatedAt;
    },
    mutateProvenance(provenance) {
      provenance.generator.generatedAt = generatedAt;
      provenance.contentAdmissionReview.output.generatedAt = generatedAt;
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
      error.includes("agreement evidence chronology is invalid for covered output"),
    ),
  );
});

test("rejects agreement evidence retrieved after the review UTC date", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.reviewedAt = "2026-07-10T23:59:59Z";
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
      error.includes("agreement evidence chronology is invalid for covered output"),
    ),
  );
});

test("accepts an evidence retrieval date chosen for the covered output", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const generatedAt = "2026-07-12T00:00:00Z";
  const reviewedAt = "2026-07-13T00:00:00Z";
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.reviewedAt = reviewedAt;
      review.rightsHolderAttestation.attestedAt = reviewedAt;
      review.coveredOutputs[0].generatedAt = generatedAt;
      for (const agreement of review.agreements) agreement.retrievedAt = "2026-07-12";
    },
    mutateProvenance(provenance) {
      provenance.generator.generatedAt = generatedAt;
      provenance.contentAdmissionReview.reviewedAt = reviewedAt;
      provenance.contentAdmissionReview.output.generatedAt = generatedAt;
    },
  });

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

test("accepts an acyclic previously admitted AIGC input", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath, reviewPath } = await writeApprovedAiFixture(root);
  const producer = JSON.parse(await readFile(join(root, provenancePath), "utf8"));
  const consumer = structuredClone(producer);
  const consumerReview = JSON.parse(await readFile(join(root, reviewPath), "utf8"));
  const consumerAssetId = "test.output.consumer";
  const consumerDirectory = "art-source/imagegen/test-pack/consumer-output";
  const consumerProvenancePath = `${consumerDirectory}/provenance.json`;
  const consumerSourcePath = `${consumerDirectory}/source.png`;
  const consumerPromptPath = `${consumerDirectory}/prompt.md`;
  const consumerReviewPath =
    "art-source/imagegen/test-pack/openai-service-terms-review.consumer.v1.json";
  const consumerGeneratedAt = "2026-07-12T13:00:00Z";
  const consumerReviewedAt = "2026-07-12T15:00:00Z";

  consumer.assetId = consumerAssetId;
  consumer.generator.generatedAt = consumerGeneratedAt;
  consumer.inputAssets = [producer.assetId];
  consumer.inputUseReview = approvedInputUseReview(
    producer.assetId,
    producer.sourceSha256,
    "2026-07-11T14:00:00Z",
  );
  consumer.contentAdmissionReview.reviewedAt = consumerReviewedAt;
  consumer.contentAdmissionReview.output = {
    assetId: consumerAssetId,
    generatedAt: consumerGeneratedAt,
    sourceSha256: consumer.sourceSha256,
  };
  consumerReview.reviewId = "openai.imagegen.test-pack.consumer.2026-07-12";
  consumerReview.reviewedAt = consumerReviewedAt;
  consumerReview.rightsHolderAttestation.attestedAt = consumerReviewedAt;
  for (const agreement of consumerReview.agreements) {
    agreement.retrievedAt = "2026-07-12";
  }
  consumerReview.coveredOutputs = [{ ...consumer.contentAdmissionReview.output }];
  consumer.termsReview = {
    status: "approved",
    reviewId: consumerReview.reviewId,
    reviewPath: consumerReviewPath,
    reviewDigest: semanticDigest(consumerReview),
  };

  await mkdir(join(root, consumerDirectory), { recursive: true });
  await writeFile(join(root, consumerReviewPath), JSON.stringify(consumerReview), "utf8");
  await writeFile(join(root, consumerProvenancePath), JSON.stringify(consumer), "utf8");
  await writeFile(join(root, consumerSourcePath), new Uint8Array());
  await writeFile(join(root, consumerPromptPath), "consumer prompt\n", "utf8");

  assert.deepEqual(
    await verifyLicensing(root, {
      policy,
      trackedReferences: "",
      trackedProvenanceFiles: [provenancePath, consumerProvenancePath],
      trackedArtSourceFiles: [
        ...approvedTrackedArtSourceFiles,
        consumerReviewPath,
        consumerProvenancePath,
        consumerSourcePath,
        consumerPromptPath,
      ],
    }),
    [],
  );
});

test("rejects a self-referential AIGC input explicitly", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.inputAssets = [approvedOutput.assetId];
      provenance.inputUseReview = approvedInputUseReview(
        approvedOutput.assetId,
        approvedOutput.sourceSha256,
        "2026-07-09T00:00:00Z",
      );
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("AIGC input cannot reference itself")));
  assert(
    errors.some((error) =>
      error.includes("input generation must be earlier than consumer generation"),
    ),
  );
  assert(
    errors.some((error) =>
      error.includes("input source admission completed after input-use review"),
    ),
  );
});

test("rejects a two-output AIGC input cycle explicitly", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath, reviewPath } = await writeApprovedAiFixture(root);
  const first = JSON.parse(await readFile(join(root, provenancePath), "utf8"));
  const review = JSON.parse(await readFile(join(root, reviewPath), "utf8"));
  const secondAssetId = "test.output.second";
  const secondDirectory = "art-source/imagegen/test-pack/second-output";
  const secondProvenancePath = `${secondDirectory}/provenance.json`;
  const secondSourcePath = `${secondDirectory}/source.png`;
  const secondPromptPath = `${secondDirectory}/prompt.md`;
  const second = structuredClone(first);
  second.assetId = secondAssetId;
  second.generator.generatedAt = "2026-07-10T01:00:00Z";
  second.contentAdmissionReview.output = {
    assetId: secondAssetId,
    generatedAt: second.generator.generatedAt,
    sourceSha256: second.sourceSha256,
  };
  first.inputAssets = [secondAssetId];
  first.inputUseReview = approvedInputUseReview(
    secondAssetId,
    second.sourceSha256,
    "2026-07-09T00:00:00Z",
  );
  second.inputAssets = [first.assetId];
  second.inputUseReview = approvedInputUseReview(
    first.assetId,
    first.sourceSha256,
    "2026-07-09T00:00:00Z",
  );
  review.coveredOutputs.push({ ...second.contentAdmissionReview.output });
  const reviewDigest = semanticDigest(review);
  first.termsReview.reviewDigest = reviewDigest;
  second.termsReview.reviewDigest = reviewDigest;

  await mkdir(join(root, secondDirectory), { recursive: true });
  await writeFile(join(root, reviewPath), JSON.stringify(review), "utf8");
  await writeFile(join(root, provenancePath), JSON.stringify(first), "utf8");
  await writeFile(join(root, secondProvenancePath), JSON.stringify(second), "utf8");
  await writeFile(join(root, secondSourcePath), new Uint8Array());
  await writeFile(join(root, secondPromptPath), "second prompt\n", "utf8");

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath, secondProvenancePath],
    trackedArtSourceFiles: [
      ...approvedTrackedArtSourceFiles,
      secondProvenancePath,
      secondSourcePath,
      secondPromptPath,
    ],
  });
  assert(errors.some((error) => error.includes("AIGC input dependency cycle")));
});

test("rejects nested visual-pack provenance paths", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root);
  const nestedDirectory = "art-source/imagegen/test-pack/group/test-output";
  const nestedProvenancePath = `${nestedDirectory}/provenance.json`;
  const nestedSourcePath = `${nestedDirectory}/source.png`;
  const nestedPromptPath = `${nestedDirectory}/prompt.md`;
  await mkdir(join(root, nestedDirectory), { recursive: true });
  await writeFile(
    join(root, nestedProvenancePath),
    await readFile(join(root, provenancePath)),
  );
  await writeFile(join(root, nestedSourcePath), new Uint8Array());
  await writeFile(join(root, nestedPromptPath), "nested prompt\n", "utf8");

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [nestedProvenancePath],
    trackedArtSourceFiles: [
      nestedProvenancePath,
      approvedReviewPath,
      nestedSourcePath,
      nestedPromptPath,
    ],
  });
  assert(
    errors.some((error) => error.includes("must use exact visual-pack provenance layout")),
  );
});

test("rejects impossible RFC3339 calendar dates", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const generatedAt = "2026-02-30T00:00:00Z";
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.coveredOutputs[0].generatedAt = generatedAt;
    },
    mutateProvenance(provenance) {
      provenance.generator.generatedAt = generatedAt;
      provenance.contentAdmissionReview.output.generatedAt = generatedAt;
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

test("rejects impossible agreement evidence calendar dates structurally", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateReview(review) {
      review.agreements[0].retrievedAt = "2026-02-30";
    },
  });

  const errors = await verifyLicensing(root, {
    policy,
    trackedReferences: "",
    trackedProvenanceFiles: [provenancePath],
    trackedArtSourceFiles: approvedTrackedArtSourceFiles,
  });
  assert(errors.some((error) => error.includes("invalid service-terms review record")));
});

test("accepts valid leap-day fractional-offset timestamps", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const { provenancePath } = await writeApprovedAiFixture(root, {
    mutateProvenance(provenance) {
      provenance.modifications = [
        {
          kind: "color_correction",
          performedAt: "2028-02-29T23:59:59.123+05:30",
          tool: "Example Tool",
          notes: "Valid timestamp boundary fixture.",
        },
      ];
    },
  });

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

test("documents the active Goal and separate Phase A admission status", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const docsReadme = await readFile(
    new URL("../docs/README.md", import.meta.url),
    "utf8",
  );
  assert.match(readme, /六阶段.*Goal.*已获授权.*进行中/u);
  assert.match(readme, /Phase A.*四张.*条款.*仓库准入.*已批准/u);
  assert.match(readme, /主观.*选择.*仍待/u);
  assert.match(readme, /完成全部 Phase 1.*阶段验收后暂停.*不进入 Phase 2/u);
  assert.doesNotMatch(readme, /尚未创建或启动长期 Goal/u);
  assert.doesNotMatch(readme, /选择和条款审批仍是.*未批准/u);
  assert.doesNotMatch(readme, /当前正完成 Phase 1 Task 1 之前的 R0A/u);
  assert.match(docsReadme, /六阶段.*Goal.*已获授权.*进行中/u);
  assert.match(docsReadme, /Phase A.*条款.*仓库准入.*已批准/u);
  assert.match(
    docsReadme,
    /完成全部 Phase 1.*阶段验收后暂停.*不进入 Phase 2/u,
  );
  assert.doesNotMatch(docsReadme, /Image Gen 候选仍走独立人工准入/u);
  assert.doesNotMatch(docsReadme, /\*\*尚未启动\*\*：长期 Goal/u);
});
