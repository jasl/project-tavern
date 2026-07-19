// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const verifierPathV1 = fileURLToPath(new URL("./release/verify-poc-artifact.mts", import.meta.url));

function failV1(detail) {
  throw new TypeError(`release.invalid_artifact_arguments: ${detail}`);
}

export function parseVerifyArtifactArgumentsV1(args) {
  const allowDevelopment =
    (args.length === 2 && args[1] === "--allow-development") ||
    (args.length === 3 && args[1] === "--" && args[2] === "--allow-development");
  if (
    (args.length !== 1 && !allowDevelopment) ||
    typeof args[0] !== "string" ||
    args[0] === "" ||
    args[0].startsWith("-")
  ) {
    return failV1("expected one Artifact directory and optional --allow-development");
  }
  return Object.freeze({
    allowDevelopment,
    artifactRoot: args[0],
  });
}

async function verifyWithStripTypesV1(artifactRoot, options) {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      verifierPathV1,
      artifactRoot,
      ...(options.allowDevelopment ? ["--allow-development"] : []),
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    },
  );
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new TypeError(
      `release.artifact_verification_failed: ${detail || `exit ${String(result.status)}`}`,
    );
  }
  return undefined;
}

export async function runVerifyArtifactCommandV1(args, verifyArtifact = verifyWithStripTypesV1) {
  const parsed = parseVerifyArtifactArgumentsV1(args);
  return await verifyArtifact(parsed.artifactRoot, {
    allowDevelopment: parsed.allowDevelopment,
  });
}

export async function verifyArtifactDirectoryV1(root, options = {}) {
  try {
    await verifyWithStripTypesV1(root, {
      allowDevelopment: options.allowDevelopment === true,
    });
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    await runVerifyArtifactCommandV1(process.argv.slice(2));
    console.log("PoC Game Artifact verified");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
