// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, readFile, realpath } from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";
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
  artSourceRootFiles: Object.freeze([
    "art-source/imagegen/first-web-pack/README.md",
  ]),
});

const REQUIRED_AI_ALLOWED_USES = Object.freeze([
  "repository_archival",
  "repository_publication",
  "modification",
  "redistribution",
  "runtime_distribution",
  "project_relicensing",
]);
const REQUIRED_AI_RESTRICTIONS = Object.freeze([
  "manual_review_before_sharing",
  "attribution_to_rights_beneficiary_required",
  "conspicuous_ai_origin_disclosure_required",
  "input_rights_required",
  "output_may_not_be_unique",
  "no_non_infringement_warranty",
]);
const OPENAI_IMAGE_GEN_SERVICE_TERMS_PROFILE_V1 = Object.freeze({
  service: "OpenAI Image Gen",
  requiredEvidence: Object.freeze([
    Object.freeze({
      name: "OpenAI Terms of Use (Rest of World)",
      scope: "individual",
      dateKind: "effective",
      date: "2026-01-01",
      sourceUrl: "https://openai.com/policies/row-terms-of-use/",
    }),
    Object.freeze({
      name: "OpenAI Services Agreement",
      scope: "business_or_developer",
      dateKind: "effective",
      date: "2026-01-01",
      sourceUrl: "https://openai.com/policies/services-agreement/",
    }),
    Object.freeze({
      name: "OpenAI Service Terms",
      scope: "all_accounts",
      dateKind: "updated",
      date: "2026-06-12",
      sourceUrl: "https://openai.com/policies/service-terms/",
    }),
    Object.freeze({
      name: "OpenAI Usage Policies",
      scope: "all_accounts",
      dateKind: "effective",
      date: "2025-10-29",
      sourceUrl: "https://openai.com/policies/usage-policies/",
    }),
    Object.freeze({
      name: "OpenAI Sharing & Publication Policy",
      scope: "publication",
      dateKind: "updated",
      date: "2022-11-14",
      sourceUrl: "https://openai.com/policies/sharing-publication-policy/",
    }),
  ]),
});

const PROVENANCE_KEYS = Object.freeze([
  "assetId",
  "sourceType",
  "generator",
  "promptFile",
  "inputAssets",
  "inputUseReview",
  "termsReview",
  "contentAdmissionReview",
  "modifications",
  "source",
  "sourceSha256",
  "runtime",
  "review",
]);
const SERVICE_TERMS_REVIEW_KEYS = Object.freeze([
  "schemaVersion",
  "reviewId",
  "status",
  "service",
  "surface",
  "reviewedAt",
  "scopeAlternativesReviewed",
  "agreements",
  "rightsHolderAttestation",
  "conclusion",
  "allowedUses",
  "aigcInputUse",
  "restrictions",
  "coveredOutputs",
]);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isStringArray(value, { allowed, nonEmpty = false } = {}) {
  return (
    Array.isArray(value) &&
    (!nonEmpty || value.length > 0) &&
    value.every(
      (entry) =>
        isNonEmptyString(entry) && (!allowed || allowed.includes(entry)),
    ) &&
    new Set(value).size === value.length
  );
}

function hasValidCalendarDate(yearText, monthText, dayText) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function isRfc3339Timestamp(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(
    value,
  );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match;
  return (
    hasValidCalendarDate(year, month, day) &&
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59 &&
    (offsetHour === undefined || Number(offsetHour) <= 23) &&
    (offsetMinute === undefined || Number(offsetMinute) <= 59) &&
    Number.isFinite(Date.parse(value))
  );
}

function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match !== null && hasValidCalendarDate(match[1], match[2], match[3]);
}

function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSha256Digest(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeRepositoryPath(root, relativePath) {
  if (
    !isNonEmptyString(relativePath) ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.includes("\0") ||
    relativePath.includes("?") ||
    relativePath.includes("#")
  ) {
    return false;
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }
  const repositoryRoot = resolve(root);
  const candidate = resolve(root, relativePath);
  return candidate.startsWith(`${repositoryRoot}/`);
}

function normalizeTrackedPaths(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value === "") return [];
  return value
    .split(value.includes("\0") ? "\0" : /\r?\n/u)
    .filter(Boolean);
}

async function repositoryFileIssue(root, relativePath) {
  try {
    const path = join(root, relativePath);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) return "symbolic_link";
    if (!stat.isFile()) return "not_regular_file";
    const [repositoryRoot, filePath] = await Promise.all([
      realpath(root),
      realpath(path),
    ]);
    if (!filePath.startsWith(`${repositoryRoot}/`)) return "path_escape";
    return null;
  } catch {
    return "missing";
  }
}

function parseJsonWithoutDuplicateKeys(text) {
  let index = 0;

  const fail = (code) => {
    const error = new SyntaxError(code);
    error.code = code;
    throw error;
  };
  const skipWhitespace = () => {
    while (/[\t\n\r ]/u.test(text[index] ?? "")) index += 1;
  };
  const parseString = () => {
    if (text[index] !== '"') fail("syntax.invalid");
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        return JSON.parse(text.slice(start, index));
      }
      if (character === "\\") {
        index += 1;
        const escape = text[index];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(index + 1, index + 5))) {
            fail("syntax.invalid");
          }
          index += 5;
          continue;
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape)) {
          fail("syntax.invalid");
        }
        index += 1;
        continue;
      }
      if (character.charCodeAt(0) < 0x20) fail("syntax.invalid");
      index += 1;
    }
    fail("syntax.invalid");
  };
  const parseNumber = () => {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(
      text.slice(index),
    );
    if (!match) fail("syntax.invalid");
    index += match[0].length;
  };
  const parseLiteral = (literal) => {
    if (!text.startsWith(literal, index)) fail("syntax.invalid");
    index += literal.length;
  };
  const parseArray = () => {
    index += 1;
    skipWhitespace();
    if (text[index] === "]") {
      index += 1;
      return;
    }
    while (true) {
      parseValue();
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail("syntax.invalid");
      index += 1;
      skipWhitespace();
    }
  };
  const parseObject = () => {
    const keys = new Set();
    index += 1;
    skipWhitespace();
    if (text[index] === "}") {
      index += 1;
      return;
    }
    while (true) {
      const key = parseString();
      if (keys.has(key)) fail("object.duplicate_key");
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ":") fail("syntax.invalid");
      index += 1;
      parseValue();
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail("syntax.invalid");
      index += 1;
      skipWhitespace();
    }
  };
  const parseValue = () => {
    skipWhitespace();
    const character = text[index];
    if (character === "{") return parseObject();
    if (character === "[") return parseArray();
    if (character === '"') return parseString();
    if (character === "t") return parseLiteral("true");
    if (character === "f") return parseLiteral("false");
    if (character === "n") return parseLiteral("null");
    return parseNumber();
  };

  parseValue();
  skipWhitespace();
  if (index !== text.length) fail("syntax.invalid");
  return JSON.parse(text);
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function serviceTermsReviewDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function isOutputBinding(value) {
  return (
    hasExactKeys(value, ["assetId", "generatedAt", "sourceSha256"]) &&
    isNonEmptyString(value.assetId) &&
    isRfc3339Timestamp(value.generatedAt) &&
    isSha256Digest(value.sourceSha256)
  );
}

function exactOutputBinding(provenance) {
  return {
    assetId: provenance.assetId,
    generatedAt: provenance.generator.generatedAt,
    sourceSha256: provenance.sourceSha256,
  };
}

function outputBindingsEqual(left, right) {
  return (
    isOutputBinding(left) &&
    isOutputBinding(right) &&
    left.assetId === right.assetId &&
    left.generatedAt === right.generatedAt &&
    left.sourceSha256 === right.sourceSha256
  );
}

function isTermsReviewReference(value) {
  if (!hasExactKeys(value, ["status", "reviewId", "reviewPath", "reviewDigest"])) {
    return false;
  }
  if (value.status === "pending") {
    return (
      value.reviewId === null &&
      value.reviewPath === null &&
      value.reviewDigest === null
    );
  }
  return (
    (value.status === "approved" || value.status === "rejected") &&
    isNonEmptyString(value.reviewId) &&
    isNonEmptyString(value.reviewPath) &&
    isSha256Digest(value.reviewDigest)
  );
}

function isInputUseReview(value, generatedAt, inputAssets) {
  if (!Array.isArray(inputAssets) || inputAssets.length === 0) return value === null;
  return (
    hasExactKeys(value, [
      "status",
      "reviewedAt",
      "sourceUrl",
      "reviewedInputs",
      "allowedInputUses",
      "restrictions",
    ]) &&
    value.status === "approved" &&
    isRfc3339Timestamp(value.reviewedAt) &&
    Date.parse(value.reviewedAt) <= Date.parse(generatedAt) &&
    isHttpsUrl(value.sourceUrl) &&
    Array.isArray(value.reviewedInputs) &&
    value.reviewedInputs.length === inputAssets.length &&
    value.reviewedInputs.every(
      (input, index) =>
        hasExactKeys(input, ["assetId", "sourceSha256"]) &&
        input.assetId === inputAssets[index] &&
        isSha256Digest(input.sourceSha256),
    ) &&
    isStringArray(value.allowedInputUses, {
      allowed: ["generation_input", "image_edit_input"],
      nonEmpty: true,
    }) &&
    isStringArray(value.restrictions)
  );
}

function isContentAdmissionReview(value) {
  return (
    hasExactKeys(value, [
      "status",
      "reviewedAt",
      "reviewer",
      "scope",
      "output",
      "checks",
      "limitation",
    ]) &&
    value.status === "approved" &&
    isRfc3339Timestamp(value.reviewedAt) &&
    isNonEmptyString(value.reviewer) &&
    value.scope === "limited_visual_screen" &&
    isOutputBinding(value.output) &&
    hasExactKeys(value.checks, [
      "visibleLogoOrWatermark",
      "namedPublicFigure",
      "obviousThirdPartyCharacterOrBrand",
    ]) &&
    value.checks.visibleLogoOrWatermark === "none_observed" &&
    value.checks.namedPublicFigure === "none_observed" &&
    value.checks.obviousThirdPartyCharacterOrBrand === "none_observed" &&
    value.limitation === "not_a_non_infringement_clearance"
  );
}

function isModificationRecord(value) {
  return (
    hasExactKeys(value, ["kind", "performedAt", "tool", "notes"]) &&
    [
      "image_edit",
      "crop",
      "resize",
      "background_removal",
      "color_correction",
    ].includes(value.kind) &&
    isRfc3339Timestamp(value.performedAt) &&
    isNonEmptyString(value.tool) &&
    isNonEmptyString(value.notes)
  );
}

function isRuntimeExport(value) {
  return (
    hasExactKeys(value, [
      "path",
      "format",
      "width",
      "height",
      "byteLength",
      "loadingGroup",
      "budgetGroup",
      "sha256",
    ]) &&
    isNonEmptyString(value.path) &&
    ["png", "webp"].includes(value.format) &&
    isPositiveSafeInteger(value.width) &&
    isPositiveSafeInteger(value.height) &&
    isPositiveSafeInteger(value.byteLength) &&
    isNonEmptyString(value.loadingGroup) &&
    isNonEmptyString(value.budgetGroup) &&
    isSha256Digest(value.sha256)
  );
}

function isReviewDecision(value) {
  if (!hasExactKeys(value, ["status", "selectionReason"])) return false;
  return value.status === "candidate"
    ? value.selectionReason === null
    : ["selected", "rejected"].includes(value.status) &&
        isNonEmptyString(value.selectionReason);
}

function isAiProvenance(value) {
  if (!hasExactKeys(value, PROVENANCE_KEYS)) return false;
  if (
    !isNonEmptyString(value.assetId) ||
    value.sourceType !== "ai_generated" ||
    !hasExactKeys(value.generator, ["service", "surface", "model", "generatedAt"]) ||
    !isNonEmptyString(value.generator.service) ||
    !isNonEmptyString(value.generator.surface) ||
    !isNonEmptyString(value.generator.model) ||
    !isRfc3339Timestamp(value.generator.generatedAt) ||
    value.promptFile !== "prompt.md" ||
    !isStringArray(value.inputAssets) ||
    !isInputUseReview(
      value.inputUseReview,
      value.generator.generatedAt,
      value.inputAssets,
    ) ||
    !isTermsReviewReference(value.termsReview) ||
    !(value.contentAdmissionReview === null || isContentAdmissionReview(value.contentAdmissionReview)) ||
    !Array.isArray(value.modifications) ||
    !value.modifications.every(isModificationRecord) ||
    !hasExactKeys(value.source, ["path", "format", "width", "height"]) ||
    value.source.path !== "source.png" ||
    value.source.format !== "png" ||
    !isPositiveSafeInteger(value.source.width) ||
    !isPositiveSafeInteger(value.source.height) ||
    !isSha256Digest(value.sourceSha256) ||
    !(value.runtime === null || isRuntimeExport(value.runtime)) ||
    !isReviewDecision(value.review)
  ) {
    return false;
  }
  return true;
}

function isAgreementEvidence(value) {
  return (
    hasExactKeys(value, [
      "name",
      "scope",
      "dateKind",
      "date",
      "retrievedAt",
      "sourceUrl",
    ]) &&
    isNonEmptyString(value.name) &&
    ["individual", "business_or_developer", "all_accounts", "publication"].includes(
      value.scope,
    ) &&
    ["effective", "updated"].includes(value.dateKind) &&
    isIsoDate(value.date) &&
    isIsoDate(value.retrievedAt) &&
    isHttpsUrl(value.sourceUrl)
  );
}

function isRightsHolderAttestation(value) {
  return (
    hasExactKeys(value, [
      "rightsBeneficiary",
      "authorityBasis",
      "attestedAt",
      "projectLicense",
      "authorizedUses",
      "qualification",
    ]) &&
    value.rightsBeneficiary === "Jun Jiang (jasl)" &&
    value.authorityBasis ===
      "project_controlled_generation_account_and_repository_owner_authorization" &&
    isRfc3339Timestamp(value.attestedAt) &&
    value.projectLicense === "CC-BY-NC-SA-4.0" &&
    isStringArray(value.authorizedUses, { allowed: REQUIRED_AI_ALLOWED_USES }) &&
    value.qualification === "only_to_extent_licensable_rights_exist"
  );
}

function isServiceTermsReview(value) {
  return (
    hasExactKeys(value, SERVICE_TERMS_REVIEW_KEYS) &&
    value.schemaVersion === 1 &&
    isNonEmptyString(value.reviewId) &&
    ["approved", "rejected"].includes(value.status) &&
    isNonEmptyString(value.service) &&
    isNonEmptyString(value.surface) &&
    isRfc3339Timestamp(value.reviewedAt) &&
    isStringArray(value.scopeAlternativesReviewed, {
      allowed: ["individual", "business_or_developer"],
    }) &&
    Array.isArray(value.agreements) &&
    value.agreements.every(isAgreementEvidence) &&
    isRightsHolderAttestation(value.rightsHolderAttestation) &&
    isNonEmptyString(value.conclusion) &&
    isStringArray(value.allowedUses, { allowed: REQUIRED_AI_ALLOWED_USES }) &&
    isNonEmptyString(value.aigcInputUse) &&
    isStringArray(value.restrictions, { allowed: REQUIRED_AI_RESTRICTIONS }) &&
    Array.isArray(value.coveredOutputs) &&
    value.coveredOutputs.length > 0 &&
    value.coveredOutputs.every(isOutputBinding) &&
    new Set(value.coveredOutputs.map((output) => output.assetId)).size ===
      value.coveredOutputs.length
  );
}

function includesEvery(values, required) {
  return Array.isArray(values) && required.every((entry) => values.includes(entry));
}

function hasRequiredOpenAiEvidence(agreements) {
  return (
    Array.isArray(agreements) &&
    agreements.length ===
      OPENAI_IMAGE_GEN_SERVICE_TERMS_PROFILE_V1.requiredEvidence.length &&
    OPENAI_IMAGE_GEN_SERVICE_TERMS_PROFILE_V1.requiredEvidence.every((required) =>
      agreements.some(
        (actual) =>
          isAgreementEvidence(actual) &&
          Object.entries(required).every(([key, value]) => actual[key] === value),
      ),
    )
  );
}

function hasValidAgreementEvidenceChronology(review, output) {
  if (
    !isRfc3339Timestamp(review?.reviewedAt) ||
    !isOutputBinding(output) ||
    !Array.isArray(review?.agreements) ||
    !review.agreements.every(isAgreementEvidence)
  ) {
    return false;
  }
  const generatedDate = new Date(output.generatedAt).toISOString().slice(0, 10);
  const reviewDate = new Date(review.reviewedAt).toISOString().slice(0, 10);
  return review.agreements.every(
    (agreement) =>
      agreement.date <= generatedDate &&
      agreement.retrievedAt >= generatedDate &&
      agreement.retrievedAt <= reviewDate,
  );
}

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
    execFileSync("git", ["ls-files", "-z", "--", "references"], {
      cwd: root,
      encoding: "utf8",
    });
  const trackedReferenceFiles = normalizeTrackedPaths(trackedReferences);
  if (trackedReferenceFiles.length > 0) {
    errors.push(`tracked references are forbidden: ${trackedReferenceFiles.join(", ")}`);
  }

  const trackedProvenanceFiles =
    options.trackedProvenanceFiles !== undefined
      ? normalizeTrackedPaths(options.trackedProvenanceFiles)
      : normalizeTrackedPaths(
          execFileSync(
            "git",
            ["ls-files", "-z", "--", ":(glob)art-source/**/provenance.json"],
            { cwd: root, encoding: "utf8" },
          ),
        );
  const trackedArtSourceFiles =
    options.trackedArtSourceFiles !== undefined
      ? normalizeTrackedPaths(options.trackedArtSourceFiles)
      : normalizeTrackedPaths(
          execFileSync(
            "git",
            ["ls-files", "-z", "--", ":(glob)art-source/**"],
            { cwd: root, encoding: "utf8" },
          ),
        );
  const trackedArtSourceFileSet = new Set(trackedArtSourceFiles);
  const artSourceOwnership = new Map();
  const provenanceRecords = [];
  const seenProvenancePaths = new Set();
  const reviewReferences = new Map();

  const classifyArtSourcePath = (path, kind, owner, { shared = false } = {}) => {
    const existing = artSourceOwnership.get(path);
    if (!existing) {
      artSourceOwnership.set(path, { kind, owners: new Set([owner]) });
      return;
    }
    if (existing.kind !== kind) {
      errors.push(
        `tracked art-source file has conflicting roles: ${path} (${existing.kind}, ${kind})`,
      );
      return;
    }
    if (existing.owners.has(owner)) return;
    if (!shared) {
      errors.push(`tracked art-source dependency has duplicate owners: ${path}`);
    }
    existing.owners.add(owner);
  };

  for (const rootFile of policy.artSourceRootFiles ?? []) {
    if (!isSafeRepositoryPath(root, rootFile)) {
      errors.push(`unsafe art-source policy root path: ${rootFile}`);
      continue;
    }
    if (!trackedArtSourceFileSet.has(rootFile)) {
      errors.push(`art-source policy root is not tracked: ${rootFile}`);
      continue;
    }
    const issue = await repositoryFileIssue(root, rootFile);
    if (issue !== null) {
      errors.push(`invalid art-source policy root file: ${rootFile}`);
      continue;
    }
    classifyArtSourcePath(rootFile, "policy_root", rootFile);
  }

  for (const relativePath of trackedProvenanceFiles) {
    if (seenProvenancePaths.has(relativePath)) {
      errors.push(`duplicate tracked provenance path: ${relativePath}`);
      continue;
    }
    seenProvenancePaths.add(relativePath);
    classifyArtSourcePath(relativePath, "provenance", relativePath);
    if (!isSafeRepositoryPath(root, relativePath)) {
      errors.push(`unsafe tracked AI provenance path: ${relativePath}`);
      continue;
    }
    const pathSegments = relativePath.split("/");
    if (
      pathSegments.length !== 5 ||
      pathSegments[0] !== "art-source" ||
      pathSegments[1] !== "imagegen" ||
      pathSegments[4] !== "provenance.json"
    ) {
      errors.push(
        `${relativePath}: must use exact visual-pack provenance layout art-source/imagegen/<pack>/<asset>/provenance.json`,
      );
      continue;
    }

    if (!trackedArtSourceFileSet.has(relativePath)) {
      errors.push(`tracked AI provenance is not tracked: ${relativePath}`);
      continue;
    }
    const provenanceFileIssue = await repositoryFileIssue(root, relativePath);
    if (provenanceFileIssue === "symbolic_link") {
      errors.push(`${relativePath}: symbolic links are forbidden for AI provenance`);
      continue;
    }
    if (provenanceFileIssue !== null) {
      errors.push(`${relativePath}: invalid tracked AI provenance file`);
      continue;
    }

    let provenance;
    try {
      provenance = parseJsonWithoutDuplicateKeys(
        await readFile(join(root, relativePath), "utf8"),
      );
    } catch (error) {
      if (error?.code === "object.duplicate_key") {
        errors.push(`duplicate JSON key in AI provenance: ${relativePath}`);
        continue;
      }
      errors.push(`invalid AI provenance: ${relativePath}`);
      continue;
    }

    if (provenance?.sourceType !== "ai_generated") {
      if (relativePath.startsWith("art-source/imagegen/")) {
        errors.push(`${relativePath}: must declare sourceType ai_generated`);
      } else {
        errors.push(`${relativePath}: unsupported tracked provenance sourceType`);
      }
      continue;
    }
    const provenanceTermsAllowedUses = Array.isArray(
      provenance?.termsReview?.allowedUses,
    )
      ? provenance.termsReview.allowedUses
      : [];
    if (
      provenance?.termsReview?.aigcInputAllowed === true ||
      provenanceTermsAllowedUses.some((use) =>
        ["generation_input", "image_edit_input"].includes(use),
      )
    ) {
      errors.push(
        `${relativePath}: service-terms review cannot authorize AIGC input`,
      );
    }
    if (!isAiProvenance(provenance)) {
      errors.push(`${relativePath}: invalid AI provenance record`);
      continue;
    }

    const recordErrorStart = errors.length;
    const provenanceRecord = {
      relativePath,
      provenance,
      actualSourceDigest: null,
      serviceTermsReview: null,
      admitted: false,
    };
    provenanceRecords.push(provenanceRecord);

    const provenanceDirectory = posix.dirname(relativePath);
    const sourceRelativePath = posix.join(
      provenanceDirectory,
      provenance.source?.path ?? "source.png",
    );
    const promptRelativePath = posix.join(
      provenanceDirectory,
      provenance.promptFile ?? "prompt.md",
    );
    classifyArtSourcePath(sourceRelativePath, "source", relativePath);
    classifyArtSourcePath(promptRelativePath, "prompt", relativePath);
    const checkTrackedDependency = async (dependencyPath) => {
      if (!trackedArtSourceFileSet.has(dependencyPath)) {
        errors.push(
          `tracked AI provenance dependency is not tracked: ${dependencyPath}`,
        );
        return false;
      }
      const issue = await repositoryFileIssue(root, dependencyPath);
      if (issue === "symbolic_link") {
        errors.push(
          `${relativePath}: symbolic links are forbidden for AI provenance dependency: ${dependencyPath}`,
        );
        return false;
      }
      if (issue !== null) {
        errors.push(
          `${relativePath}: invalid AI provenance dependency: ${dependencyPath}`,
        );
        return false;
      }
      return true;
    };
    const [sourceFileUsable] = await Promise.all([
      checkTrackedDependency(sourceRelativePath),
      checkTrackedDependency(promptRelativePath),
    ]);

    if (provenance?.termsReview?.status !== "approved") {
      errors.push(`${relativePath}: service-terms review must be approved`);
      continue;
    }

    if (!isContentAdmissionReview(provenance.contentAdmissionReview)) {
      errors.push(`${relativePath}: content-admission review must be approved`);
    } else {
      const output = exactOutputBinding(provenance);
      if (!outputBindingsEqual(provenance.contentAdmissionReview.output, output)) {
        errors.push(
          `${relativePath}: content-admission review does not cover the exact output`,
        );
      }
      if (
        Date.parse(provenance.contentAdmissionReview.reviewedAt) <
        Date.parse(provenance.generator.generatedAt)
      ) {
        errors.push(
          `${relativePath}: content-admission review predates generation`,
        );
      }
    }

    if (
      Array.isArray(provenance.inputAssets) &&
      provenance.inputAssets.length > 0 &&
      !isInputUseReview(
        provenance.inputUseReview,
        provenance.generator?.generatedAt,
        provenance.inputAssets,
      )
    ) {
      errors.push(
        `${relativePath}: AIGC input requires an independent approved input-use review`,
      );
    }

    if (
      sourceFileUsable &&
      provenance.source?.path === "source.png" &&
      isSha256Digest(provenance.sourceSha256)
    ) {
      const actualSourceDigest = `sha256:${sha256(
        await readFile(join(root, sourceRelativePath)),
      )}`;
      provenanceRecord.actualSourceDigest = actualSourceDigest;
      if (actualSourceDigest !== provenance.sourceSha256) {
        errors.push(`${relativePath}: source digest mismatch`);
      }
    }

    const reviewPath = provenance.termsReview?.reviewPath;
    if (!isSafeRepositoryPath(root, reviewPath)) {
      errors.push(`${relativePath}: unsafe service-terms review path`);
      continue;
    }
    const packRoot = pathSegments.slice(0, 3).join("/");
    if (
      posix.dirname(reviewPath) !== packRoot
    ) {
      errors.push(`${relativePath}: service-terms review must stay inside its pack`);
      continue;
    }
    classifyArtSourcePath(reviewPath, "review", relativePath, { shared: true });
    const reviewReference = {
      packRoot,
      reviewId: provenance.termsReview.reviewId,
      reviewDigest: provenance.termsReview.reviewDigest,
    };
    const existingReviewReference = reviewReferences.get(reviewPath);
    if (
      existingReviewReference &&
      (existingReviewReference.packRoot !== reviewReference.packRoot ||
        existingReviewReference.reviewId !== reviewReference.reviewId ||
        existingReviewReference.reviewDigest !== reviewReference.reviewDigest)
    ) {
      errors.push(`${reviewPath}: shared service-terms review references disagree`);
    } else if (!existingReviewReference) {
      reviewReferences.set(reviewPath, reviewReference);
    }
    if (!trackedArtSourceFileSet.has(reviewPath)) {
      errors.push(`tracked AI provenance dependency is not tracked: ${reviewPath}`);
      continue;
    }
    const reviewFileIssue = await repositoryFileIssue(root, reviewPath);
    if (reviewFileIssue === "missing") {
      errors.push(`${relativePath}: service-terms review record is missing`);
      continue;
    }
    if (reviewFileIssue === "symbolic_link") {
      errors.push(
        `${relativePath}: symbolic links are forbidden for AI provenance dependency: ${reviewPath}`,
      );
      continue;
    }
    if (reviewFileIssue !== null) {
      errors.push(`${relativePath}: invalid service-terms review file`);
      continue;
    }
    const absoluteReviewPath = join(root, reviewPath);

    let serviceTermsReview;
    try {
      serviceTermsReview = parseJsonWithoutDuplicateKeys(
        await readFile(absoluteReviewPath, "utf8"),
      );
    } catch (error) {
      if (error?.code === "object.duplicate_key") {
        errors.push(`duplicate JSON key in service-terms review: ${reviewPath}`);
        continue;
      }
      errors.push(`${reviewPath}: invalid service-terms review JSON`);
      continue;
    }
    provenanceRecord.serviceTermsReview = serviceTermsReview;
    const serviceAllowedUses = Array.isArray(serviceTermsReview?.allowedUses)
      ? serviceTermsReview.allowedUses
      : [];
    const attestedAuthorizedUses = Array.isArray(
      serviceTermsReview?.rightsHolderAttestation?.authorizedUses,
    )
      ? serviceTermsReview.rightsHolderAttestation.authorizedUses
      : [];
    const serviceRestrictions = Array.isArray(serviceTermsReview?.restrictions)
      ? serviceTermsReview.restrictions
      : [];
    const coveredOutputs = Array.isArray(serviceTermsReview?.coveredOutputs)
      ? serviceTermsReview.coveredOutputs
      : [];

    if (
      serviceTermsReview?.aigcInputUse !==
        "requires_independent_input_use_review" ||
      serviceAllowedUses.some((use) =>
        ["generation_input", "image_edit_input"].includes(use),
      )
    ) {
      errors.push(
        `${reviewPath}: service-terms review cannot authorize AIGC input`,
      );
    }
    if (!serviceTermsReview?.rightsHolderAttestation) {
      errors.push(`${reviewPath}: rights-holder attestation is required`);
    }
    if (!isServiceTermsReview(serviceTermsReview)) {
      errors.push(`${reviewPath}: invalid service-terms review record`);
    }
    if (serviceTermsReview?.status !== "approved") {
      errors.push(`${reviewPath}: service-terms review must be approved`);
    }
    if (serviceTermsReview?.reviewId !== provenance.termsReview.reviewId) {
      errors.push(`${relativePath}: service-terms review ID mismatch`);
    }
    if (
      serviceTermsReviewDigest(serviceTermsReview) !==
      provenance.termsReview.reviewDigest
    ) {
      errors.push(`${relativePath}: service-terms review digest mismatch`);
    }
    if (
      serviceTermsReview?.service !== provenance.generator?.service ||
      serviceTermsReview?.surface !== provenance.generator?.surface
    ) {
      errors.push(`${relativePath}: service-terms service/surface mismatch`);
    }
    if (
      !isRfc3339Timestamp(serviceTermsReview?.reviewedAt) ||
      Date.parse(serviceTermsReview.reviewedAt) <
        Date.parse(provenance.generator?.generatedAt)
    ) {
      errors.push(`${relativePath}: service-terms review predates generation`);
    }
    if (
      serviceTermsReview?.service !==
        OPENAI_IMAGE_GEN_SERVICE_TERMS_PROFILE_V1.service ||
      !includesEvery(serviceTermsReview?.scopeAlternativesReviewed, [
        "individual",
        "business_or_developer",
      ]) ||
      !hasRequiredOpenAiEvidence(serviceTermsReview?.agreements)
    ) {
      errors.push(`${reviewPath}: required OpenAI agreement evidence is incomplete`);
    }
    for (const coveredOutput of coveredOutputs) {
      if (!hasValidAgreementEvidenceChronology(serviceTermsReview, coveredOutput)) {
        errors.push(
          `${reviewPath}: agreement evidence chronology is invalid for covered output: ${String(coveredOutput?.assetId)}`,
        );
      }
    }
    for (const use of REQUIRED_AI_ALLOWED_USES) {
      if (!serviceAllowedUses.includes(use)) {
        errors.push(`${reviewPath}: missing required allowed use: ${use}`);
      }
      if (!attestedAuthorizedUses.includes(use)) {
        errors.push(`${reviewPath}: rights-holder attestation omits allowed use: ${use}`);
      }
    }
    if (!isRightsHolderAttestation(serviceTermsReview?.rightsHolderAttestation)) {
      errors.push(`${reviewPath}: invalid rights-holder attestation`);
    } else if (
      Date.parse(serviceTermsReview.rightsHolderAttestation.attestedAt) <
      Date.parse(provenance.generator?.generatedAt)
    ) {
      errors.push(`${reviewPath}: rights-holder attestation predates generation`);
    }
    for (const restriction of REQUIRED_AI_RESTRICTIONS) {
      if (!serviceRestrictions.includes(restriction)) {
        errors.push(
          `${reviewPath}: missing required service-terms restriction: ${restriction}`,
        );
      }
    }
    const output = exactOutputBinding(provenance);
    if (
      !coveredOutputs.some((covered) =>
        outputBindingsEqual(covered, output),
      )
    ) {
      errors.push(
        `${relativePath}: service-terms review does not cover the exact output`,
      );
    }
    provenanceRecord.admitted = errors.length === recordErrorStart;
  }

  for (const trackedPath of trackedArtSourceFiles) {
    if (!artSourceOwnership.has(trackedPath)) {
      errors.push(`tracked art-source file is orphan or unknown: ${trackedPath}`);
    }
  }

  const recordsByAssetId = new Map();
  for (const record of provenanceRecords) {
    const assetId = record.provenance.assetId;
    const existing = recordsByAssetId.get(assetId);
    if (existing) {
      errors.push(
        `duplicate tracked AI Asset ID: ${assetId} (${existing.relativePath}, ${record.relativePath})`,
      );
      existing.admitted = false;
      record.admitted = false;
      continue;
    }
    recordsByAssetId.set(assetId, record);
  }

  const inputGraph = new Map();
  for (const record of provenanceRecords) {
    const assetId = record.provenance.assetId;
    const inputAssets = Array.isArray(record.provenance.inputAssets)
      ? record.provenance.inputAssets
      : [];
    inputGraph.set(assetId, inputAssets);
    if (inputAssets.includes(assetId)) {
      errors.push(`${record.relativePath}: AIGC input cannot reference itself: ${assetId}`);
      record.admitted = false;
    }
  }

  const visitState = new Map();
  const visitStack = [];
  const reportedCycles = new Set();
  const visitInputGraph = (assetId) => {
    visitState.set(assetId, "visiting");
    visitStack.push(assetId);
    for (const inputAssetId of inputGraph.get(assetId) ?? []) {
      if (inputAssetId === assetId || !inputGraph.has(inputAssetId)) continue;
      if (visitState.get(inputAssetId) === "visiting") {
        const cycleStart = visitStack.indexOf(inputAssetId);
        const cycle = [...visitStack.slice(cycleStart), inputAssetId];
        const cycleKey = [...new Set(cycle.slice(0, -1))].sort().join("\0");
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          errors.push(`AIGC input dependency cycle: ${cycle.join(" -> ")}`);
        }
        for (const cycleAssetId of cycle.slice(0, -1)) {
          const cycleRecord = recordsByAssetId.get(cycleAssetId);
          if (cycleRecord) cycleRecord.admitted = false;
        }
        continue;
      }
      if (visitState.get(inputAssetId) !== "visited") {
        visitInputGraph(inputAssetId);
      }
    }
    visitStack.pop();
    visitState.set(assetId, "visited");
  };
  for (const assetId of inputGraph.keys()) {
    if (!visitState.has(assetId)) visitInputGraph(assetId);
  }

  for (const record of provenanceRecords) {
    const { provenance, relativePath } = record;
    if (!Array.isArray(provenance.inputAssets) || provenance.inputAssets.length === 0) {
      continue;
    }
    if (
      !isInputUseReview(
        provenance.inputUseReview,
        provenance.generator.generatedAt,
        provenance.inputAssets,
      )
    ) {
      continue;
    }
    for (const reviewedInput of provenance.inputUseReview.reviewedInputs) {
      const inputRecord = recordsByAssetId.get(reviewedInput.assetId);
      if (!inputRecord) {
        errors.push(
          `${relativePath}: input-use review references unknown tracked Asset ID: ${reviewedInput.assetId}`,
        );
        continue;
      }
      if (
        Date.parse(inputRecord.provenance.generator.generatedAt) >=
        Date.parse(provenance.generator.generatedAt)
      ) {
        errors.push(
          `${relativePath}: input generation must be earlier than consumer generation: ${reviewedInput.assetId}`,
        );
      }
      if (
        reviewedInput.sourceSha256 !== inputRecord.provenance.sourceSha256 ||
        reviewedInput.sourceSha256 !== inputRecord.actualSourceDigest
      ) {
        errors.push(
          `${relativePath}: input-use review source digest mismatch: ${reviewedInput.assetId}`,
        );
      }
      if (!inputRecord.admitted) {
        errors.push(
          `${relativePath}: input-use review source is not repository-admitted: ${reviewedInput.assetId}`,
        );
      }
      const inputUseReviewedAt = Date.parse(provenance.inputUseReview.reviewedAt);
      const inputAdmissionTimestamps = [
        inputRecord.serviceTermsReview?.reviewedAt,
        inputRecord.serviceTermsReview?.rightsHolderAttestation?.attestedAt,
        inputRecord.provenance.contentAdmissionReview?.reviewedAt,
      ];
      if (
        inputAdmissionTimestamps.some(
          (timestamp) =>
            !isRfc3339Timestamp(timestamp) ||
            Date.parse(timestamp) > inputUseReviewedAt,
        )
      ) {
        errors.push(
          `${relativePath}: input source admission completed after input-use review: ${reviewedInput.assetId}`,
        );
      }
    }
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
